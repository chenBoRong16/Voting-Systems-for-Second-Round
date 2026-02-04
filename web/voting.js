// Voting algorithms for up-to-4-candidate ranked ballots.
// Ballots are represented as permutations (array of candidate ids) and counts.

export function generatePermutations(items) {
  /** @type {string[][]} */
  const out = [];

  /** @param {string[]} prefix @param {string[]} rest */
  function rec(prefix, rest) {
    if (rest.length === 0) {
      out.push(prefix);
      return;
    }
    for (let i = 0; i < rest.length; i++) {
      const next = rest[i];
      rec([...prefix, next], [...rest.slice(0, i), ...rest.slice(i + 1)]);
    }
  }

  rec([], [...items]);
  return out;
}

export function computeFirstChoiceCounts(ballots, activeCandidates) {
  /** @type {Record<string, number>} */
  const counts = Object.fromEntries(activeCandidates.map((c) => [c, 0]));
  for (const b of ballots) {
    if (b.count <= 0) continue;
    const first = b.ranking.find((c) => activeCandidates.includes(c));
    if (!first) continue;
    counts[first] += b.count;
  }
  return counts;
}

function pickWinnerFromScoreMap(scores, candidateIds) {
  // Deterministic tie-break by candidate id
  const sorted = [...candidateIds].sort((a, b) => {
    const d = (scores[b] ?? 0) - (scores[a] ?? 0);
    if (d !== 0) return d;
    return a.localeCompare(b, 'zh-Hant');
  });
  return sorted[0] ?? null;
}

function totalFromCounts(counts) {
  return Object.values(counts).reduce((a, v) => a + v, 0);
}

export function runIRV({ candidates, ballots }) {
  /** @type {string[]} */
  let active = [...candidates];
  /** @type {{round:number, active:string[], firstCounts: Record<string, number>, eliminated?: string, winner?: string}[]} */
  const rounds = [];

  // For Sankey: per-round links from (round, sourceCandidate) -> (round+1, targetCandidate)
  // When no elimination, we still compute final round nodes.
  /** @type {{round:number, from:string, to:string, value:number}[]} */
  const transfers = [];

  let r = 1;
  while (true) {
    const firstCounts = computeFirstChoiceCounts(ballots, active);
    rounds.push({ round: r, active: [...active], firstCounts: { ...firstCounts } });

    if (active.length <= 1) {
      rounds[rounds.length - 1].winner = active[0] ?? undefined;
      break;
    }

    // Eliminate the minimum; tie-break by candidate id (stable deterministic)
    const sortedByCount = [...active].sort((a, b) => {
      const d = (firstCounts[a] ?? 0) - (firstCounts[b] ?? 0);
      if (d !== 0) return d;
      return a.localeCompare(b, 'zh-Hant');
    });
    const eliminated = sortedByCount[0];
    rounds[rounds.length - 1].eliminated = eliminated;

    // Compute transfers caused by elimination: ballots whose current top active choice is eliminated.
    for (const b of ballots) {
      if (b.count <= 0) continue;
      const currentTop = b.ranking.find((c) => active.includes(c));
      if (currentTop !== eliminated) continue;

      const nextTop = b.ranking.find((c) => c !== eliminated && active.includes(c));
      if (!nextTop) continue;
      transfers.push({ round: r, from: eliminated, to: nextTop, value: b.count });
    }

    active = active.filter((c) => c !== eliminated);
    r += 1;
  }

  return {
    type: 'irv',
    rounds,
    winner: rounds[rounds.length - 1]?.winner ?? null,
    eliminatedOrder: rounds.filter((r) => r.eliminated).map((r) => r.eliminated),
    transfers,
    explain: [],
  };
}

export function runPlurality({ candidates, ballots }) {
  const firstCounts = computeFirstChoiceCounts(ballots, candidates);
  const winner = pickWinnerFromScoreMap(firstCounts, candidates);
  const total = Object.values(firstCounts).reduce((a, v) => a + v, 0);
  const lines = candidates
    .slice()
    .sort((a, b) => {
      const d = (firstCounts[b] ?? 0) - (firstCounts[a] ?? 0);
      if (d !== 0) return d;
      return a.localeCompare(b, 'zh-Hant');
    })
    .map((cid) => {
      const v = firstCounts[cid] ?? 0;
      const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0.0';
      return `${cid}: ${v}（${pct}%）`;
    })
    .join('\n');

  return {
    type: 'plurality',
    winner,
    firstCounts,
    explain: [
      {
        title: 'Plurality（只看第一志願）',
        body: `有效票合計 ${total}\n\n第一志願票數：\n${lines}\n\n因只看第一志願，票數最高者當選。\n若同票，依候選人代號固定順序。\n\n勝者：${winner ?? '（無）'}`,
      },
    ],
  };
}

export function runBorda({ candidates, ballots }) {
  const n = candidates.length;
  /** @type {Record<string, number>} */
  const scores = Object.fromEntries(candidates.map((c) => [c, 0]));
  /** @type {Record<string, number[]>} */
  const positionCounts = Object.fromEntries(candidates.map((c) => [c, new Array(n).fill(0)]));

  for (const b of ballots) {
    if (b.count <= 0) continue;
    for (let i = 0; i < b.ranking.length; i++) {
      const cid = b.ranking[i];
      if (!candidates.includes(cid)) continue;
      const pts = (n - 1 - i);
      scores[cid] += pts * b.count;
      if (positionCounts[cid]) positionCounts[cid][i] += b.count;
    }
  }

  const winner = pickWinnerFromScoreMap(scores, candidates);
  const lines = candidates
    .slice()
    .sort((a, b) => {
      const d = (scores[b] ?? 0) - (scores[a] ?? 0);
      if (d !== 0) return d;
      return a.localeCompare(b, 'zh-Hant');
    })
    .map((cid) => {
      const parts = positionCounts[cid]
        .map((cnt, i) => {
          const pts = n - 1 - i;
          return `${i + 1}名×${cnt}票×${pts}分`;
        })
        .join('，');
      return `${cid}: ${parts}；總分 ${scores[cid]}`;
    })
    .join('\n');

  return {
    type: 'borda',
    winner,
    scores,
    explain: [
      {
        title: 'Borda（波達計分）',
        body: `計分規則：有 N 位候選人時，第 1 名得 N-1 分，第 N 名得 0 分。\n以下詳列每位候選人的名次分布與加總：\n\n${lines}\n\n若同分，依候選人代號固定順序。\n\n勝者：${winner ?? '（無）'}`,
      },
    ],
  };
}

export function computePairwiseMatrix({ candidates, ballots }) {
  /** @type {Record<string, Record<string, number>>} */
  const m = {};
  for (const a of candidates) {
    m[a] = {};
    for (const b of candidates) m[a][b] = 0;
  }

  for (const ballot of ballots) {
    const { ranking, count } = ballot;
    if (count <= 0) continue;
    /** @type {Record<string, number>} */
    const pos = {};
    ranking.forEach((c, i) => (pos[c] = i));

    for (const a of candidates) {
      for (const b of candidates) {
        if (a === b) continue;
        if (pos[a] < pos[b]) m[a][b] += count;
      }
    }
  }

  return m;
}

function condorcetWinnerFromPairwise(candidates, m) {
  for (const a of candidates) {
    let ok = true;
    for (const b of candidates) {
      if (a === b) continue;
      if ((m[a][b] ?? 0) <= (m[b][a] ?? 0)) {
        ok = false;
        break;
      }
    }
    if (ok) return a;
  }
  return null;
}

export function runMinimax({ candidates, ballots }) {
  const m = computePairwiseMatrix({ candidates, ballots });
  const total = ballots.reduce((a, b) => a + b.count, 0);
  /** @type {Record<string, number>} */
  const worstLoss = Object.fromEntries(candidates.map((c) => [c, 0]));
  /** @type {Record<string, Record<string, number>>} */
  const opposition = Object.fromEntries(candidates.map((c) => [c, {}]));

  for (const a of candidates) {
    let worst = 0;
    for (const b of candidates) {
      if (a === b) continue;
      const against = m[b][a] ?? 0; // voters ranking b above a
      opposition[a][b] = against;
      if (against > worst) worst = against;
    }
    worstLoss[a] = worst;
  }

  const winner = candidates
    .slice()
    .sort((a, b) => {
      const d = (worstLoss[a] ?? 0) - (worstLoss[b] ?? 0);
      if (d !== 0) return d;
      return a.localeCompare(b, 'zh-Hant');
    })[0] ?? null;

  const lines = candidates
    .slice()
    .sort((a, b) => {
      const d = (worstLoss[a] ?? 0) - (worstLoss[b] ?? 0);
      if (d !== 0) return d;
      return a.localeCompare(b, 'zh-Hant');
    })
    .map((cid) => {
      const parts = candidates
        .filter((o) => o !== cid)
        .map((o) => {
          const v = opposition[cid][o] ?? 0;
          const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0.0';
          return `${o} > ${cid}: ${v}（${pct}%）`;
        })
        .join('，');
      return `${cid}: ${parts}；最大反對票數 ${worstLoss[cid]}`;
    })
    .join('\n');

  return {
    type: 'minimax',
    winner,
    pairwise: m,
    worstLoss,
    opposition,
    explain: [
      {
        title: 'Minimax（最大反對票數最小化）',
        body: `本網站採用 pairwise opposition 版本：\n對每位候選人 X，計算「有多少票把 Y 排在 X 之前」（對每位對手 Y），取其中最大值作為 X 的最大反對票數。\n選擇最大反對票數最小者。\n若最大反對票數同分，依候選人代號固定順序。\n\n${lines}\n\n勝者：${winner ?? '（無）'}`,
      },
    ],
  };
}

export function runBenham({ candidates, ballots }) {
  /** @type {string[]} */
  let active = [...candidates];
  /** @type {{round:number, active:string[], condorcetWinner?:string|null, eliminated?:string, firstCounts?:Record<string, number>}} */
  const rounds = [];

  let r = 1;
  while (true) {
    const m = computePairwiseMatrix({ candidates: active, ballots });
    const cw = condorcetWinnerFromPairwise(active, m);
    if (cw) {
      rounds.push({ round: r, active: [...active], condorcetWinner: cw });
      return {
        type: 'benham',
        winner: cw,
        rounds,
        explain: [
          {
            title: `第 ${r} 輪：找到孔多賽優勝者，${cw} 當選`,
            body: `在仍在競逐者中，${cw} 對任一對手的兩兩對決都能勝出，因此直接當選。`,
          },
        ],
      };
    }

    const firstCounts = computeFirstChoiceCounts(ballots, active);
    if (active.length <= 1) {
      const winner = active[0] ?? null;
      rounds.push({ round: r, active: [...active], firstCounts });
      return {
        type: 'benham',
        winner,
        rounds,
        explain: [
          {
            title: `第 ${r} 輪：剩最後一人 ${winner ?? '（無）'} 當選`,
            body: '候選人已淘汰至只剩一人。',
          },
        ],
      };
    }

    const sortedByCount = [...active].sort((a, b) => {
      const d = (firstCounts[a] ?? 0) - (firstCounts[b] ?? 0);
      if (d !== 0) return d;
      return a.localeCompare(b, 'zh-Hant');
    });
    const eliminated = sortedByCount[0];
    rounds.push({ round: r, active: [...active], firstCounts: { ...firstCounts }, eliminated });
    active = active.filter((c) => c !== eliminated);
    r += 1;

    // safety guard
    if (r > 20) {
      return {
        type: 'benham',
        winner: active[0] ?? null,
        rounds,
        explain: [
          { title: 'Benham：中止', body: '輪數超過上限，請檢查輸入。' },
        ],
      };
    }
  }
}

function createsCycleIfAddEdge(locked, from, to) {
  // locked: Map<string, Set<string>> adjacency
  // detect if to can reach from
  /** @type {Set<string>} */
  const visited = new Set();
  /** @type {string[]} */
  const stack = [to];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur) continue;
    if (cur === from) return true;
    if (visited.has(cur)) continue;
    visited.add(cur);
    const nexts = locked.get(cur);
    if (!nexts) continue;
    for (const n of nexts) stack.push(n);
  }
  return false;
}

export function runRankedPairs({ candidates, ballots }) {
  const m = computePairwiseMatrix({ candidates, ballots });
  const total = ballots.reduce((a, b) => a + b.count, 0);

  /** @type {{winner:string, loser:string, winVotes:number, loseVotes:number, margin:number}[]} */
  const pairs = [];
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i];
      const b = candidates[j];
      const ab = m[a][b];
      const ba = m[b][a];
      if (ab === ba) continue;
      if (ab > ba) pairs.push({ winner: a, loser: b, winVotes: ab, loseVotes: ba, margin: ab - ba });
      else pairs.push({ winner: b, loser: a, winVotes: ba, loseVotes: ab, margin: ba - ab });
    }
  }

  // Sort by margin desc, then by winVotes desc, then deterministic string order
  pairs.sort((p1, p2) => {
    if (p2.margin !== p1.margin) return p2.margin - p1.margin;
    if (p2.winVotes !== p1.winVotes) return p2.winVotes - p1.winVotes;
    const a = `${p1.winner}>${p1.loser}`;
    const b = `${p2.winner}>${p2.loser}`;
    return a.localeCompare(b, 'zh-Hant');
  });

  /** @type {Map<string, Set<string>>} */
  const locked = new Map();
  for (const c of candidates) locked.set(c, new Set());

  /** @type {{pair: any, locked: boolean, reason?: string}[]} */
  const decisions = [];

  for (const p of pairs) {
    const wouldCycle = createsCycleIfAddEdge(locked, p.winner, p.loser);
    if (wouldCycle) {
      decisions.push({ pair: p, locked: false, reason: '避免形成環（cycle）' });
      continue;
    }
    locked.get(p.winner)?.add(p.loser);
    decisions.push({ pair: p, locked: true });
  }

  const lockedEdges = decisions
    .filter((d) => d.locked)
    .map((d) => ({
      from: d.pair.winner,
      to: d.pair.loser,
      margin: d.pair.margin,
      winVotes: d.pair.winVotes,
      loseVotes: d.pair.loseVotes,
    }));

  // Compute final ranking from locked graph by repeated selection of sources (no incoming edges)
  /** @type {Set<string>} */
  const remaining = new Set(candidates);
  /** @type {string[]} */
  const order = [];

  function incomingCount(node) {
    let cnt = 0;
    for (const [src, outs] of locked.entries()) {
      if (src === node) continue;
      if (outs.has(node)) cnt++;
    }
    return cnt;
  }

  while (remaining.size) {
    const sources = [...remaining].filter((c) => {
      // count incoming only from remaining nodes
      let inc = 0;
      for (const src of remaining) {
        if (src === c) continue;
        if (locked.get(src)?.has(c)) inc++;
      }
      return inc === 0;
    });

    // deterministic tie-break
    sources.sort((a, b) => a.localeCompare(b, 'zh-Hant'));
    const pick = sources[0] ?? [...remaining][0];
    order.push(pick);
    remaining.delete(pick);
  }

  // Explanation
  const matrixLines = candidates
    .map((a) => {
      const row = candidates
        .map((b) => {
          if (a === b) return '-';
          const v = m[a][b] ?? 0;
          const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0.0';
          return `${v}(${pct}%)`;
        })
        .join(' ');
      return `${a}  ${row}`;
    })
    .join('\n');

  const pairLines = decisions
    .map((d) => {
      const p = d.pair;
      const mark = d.locked ? 'LOCK' : 'SKIP';
      const reason = d.locked ? '' : ` (${d.reason})`;
      const winPct = total > 0 ? ((p.winVotes / total) * 100).toFixed(1) : '0.0';
      const losePct = total > 0 ? ((p.loseVotes / total) * 100).toFixed(1) : '0.0';
      return `${mark}  ${p.winner} > ${p.loser}  (${p.winVotes}(${winPct}%) vs ${p.loseVotes}(${losePct}%), margin ${p.margin})${reason}`;
    })
    .join('\n');

  const explain = [
    {
      title: 'Pairwise 矩陣（每格表示「列」勝過「欄」的票數）',
      body: matrixLines,
    },
    {
      title: '依序鎖定勝負對（Ranked Pairs）',
      body: `說明：LOCK = 加入不成環；SKIP = 會形成環。\n${pairLines}`,
    },
    {
      title: '最終排序（由鎖定圖推得）',
      body: order.map((c, i) => `${i + 1}. ${c}`).join('\n'),
    },
  ];

  return {
    type: 'rankedPairs',
    pairwise: m,
    pairs,
    decisions,
    lockedEdges,
    order,
    winner: order[0] ?? null,
    explain,
  };
}
