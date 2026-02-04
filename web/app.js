import {
  generatePermutations,
  runIRV,
  runRankedPairs,
  runPlurality,
  runBorda,
  runBenham,
  runMinimax,
  computeFirstChoiceCounts,
  computePairwiseMatrix,
} from './voting.js';

const ALL_CANDIDATES = [
  { id: 'A', defaultName: '王小明' },
  { id: 'B', defaultName: '李小華' },
  { id: 'C', defaultName: '陳小傑' },
  { id: 'D', defaultName: '林小美' },
];

/** @typedef {{ id:number, ranking: string[], count:number }} BallotOption */

/** @type {BallotOption[]} */
let options = [];

let focusedOptionId = 1;
let selectedOptionId = null;
let finderSelections = [];
const NO_UPPER_LIMIT = Number.MAX_SAFE_INTEGER;

const els = {
  system: document.getElementById('system'),
  candidateCount: document.getElementById('candidateCount'),
  nameA: document.getElementById('nameA'),
  nameB: document.getElementById('nameB'),
  nameC: document.getElementById('nameC'),
  nameD: document.getElementById('nameD'),
  preset: document.getElementById('preset'),
  randTotal: document.getElementById('randTotal'),
  randMax: document.getElementById('randMax'),
  randZero: document.getElementById('randZero'),
  randBias: document.getElementById('randBias'),
  purpose: document.getElementById('purpose'),
  purposeDialog: document.getElementById('purposeDialog'),
  purposeClose: document.getElementById('purposeClose'),
  reset: document.getElementById('reset'),
  randomize: document.getElementById('randomize'),
  totalVotes: document.getElementById('totalVotes'),
  matrixTables: document.getElementById('matrixTables'),
  summary: document.getElementById('summary'),
  explain: document.getElementById('explain'),
  irvViz: document.getElementById('irvViz'),
  sankeyContainer: document.getElementById('sankeyContainer'),
  rpViz: document.getElementById('rpViz'),
  rpSection: document.getElementById('rpSection'),
  pairwiseContainer: document.getElementById('pairwiseContainer'),
  rpGraphContainer: document.getElementById('rpGraphContainer'),
  rpOrder: document.getElementById('rpOrder'),
  condorcetOrder: document.getElementById('condorcetOrder'),
  condorcetSection: document.getElementById('condorcetSection'),
  condorcetViz: document.getElementById('condorcetViz'),
  condorcetPairwise: document.getElementById('condorcetPairwise'),
  condorcetGraph: document.getElementById('condorcetGraph'),
  condorcetOrderStandalone: document.getElementById('condorcetOrderStandalone'),
  finderDetails: document.getElementById('finderDetails'),
  finderSelects: document.getElementById('finderSelects'),
  finderGo: document.getElementById('finderGo'),
  finderResult: document.getElementById('finderResult'),
};

function clamp(n, lo, hi) {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function getRandomSettings() {
  const total = clamp(Number(els.randTotal?.value ?? 120), 0, NO_UPPER_LIMIT);
  const max = clamp(Number(els.randMax?.value ?? 30), 0, NO_UPPER_LIMIT);
  const zero = clamp(Number(els.randZero?.value ?? 0.55), 0, 1);
  const bias = clamp(Number(els.randBias?.value ?? 1.2), 0.2, 5);
  return { total, max, zero, bias };
}

function loadRandomSettings() {
  try {
    const raw = localStorage.getItem('top4.randomSettings');
    if (!raw) return;
    const s = JSON.parse(raw);
    if (els.randTotal) els.randTotal.value = String(clamp(Number(s.total ?? 120), 0, NO_UPPER_LIMIT));
    if (els.randMax) els.randMax.value = String(clamp(Number(s.max ?? 30), 0, NO_UPPER_LIMIT));
    if (els.randZero) els.randZero.value = String(clamp(Number(s.zero ?? 0.55), 0, 1));
    if (els.randBias) els.randBias.value = String(clamp(Number(s.bias ?? 1.2), 0.2, 5));
  } catch {
    // ignore
  }
}

function saveRandomSettings() {
  const s = getRandomSettings();
  try {
    localStorage.setItem('top4.randomSettings', JSON.stringify(s));
  } catch {
    // ignore
  }
}

function randomizeCounts() {
  const { total, max, zero, bias } = getRandomSettings();
  const n = options.length;
  for (const o of options) o.count = 0;
  if (n === 0 || total <= 0) return;

  const weights = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    if (Math.random() < zero) {
      weights[i] = 0;
      continue;
    }
    const u = Math.random();
    // bias>1 => more concentrated (heavier tail)
    weights[i] = Math.pow(u, 1 / bias);
  }

  let sumW = weights.reduce((a, b) => a + b, 0);
  if (sumW <= 0) {
    weights[Math.floor(Math.random() * n)] = 1;
    sumW = 1;
  }

  let counts = weights.map((w) => Math.floor((w / sumW) * total));
  let cur = counts.reduce((a, b) => a + b, 0);
  let remain = total - cur;
  while (remain > 0) {
    const i = Math.floor(Math.random() * n);
    counts[i] += 1;
    remain -= 1;
  }

  if (max > 0) {
    let overflow = 0;
    for (let i = 0; i < n; i++) {
      if (counts[i] > max) {
        overflow += counts[i] - max;
        counts[i] = max;
      }
    }
    let guard = 0;
    while (overflow > 0 && guard < 200000) {
      guard++;
      const i = Math.floor(Math.random() * n);
      if (counts[i] >= max) continue;
      counts[i] += 1;
      overflow -= 1;
    }
  }

  for (let i = 0; i < n; i++) {
    options[i].count = clampNonNegativeInt(counts[i]);
  }
}

function getActiveCandidateIds() {
  const n = Number(els.candidateCount.value);
  return ALL_CANDIDATES.slice(0, n).map((c) => c.id);
}

function getCandidateNameById() {
  return {
    A: (els.nameA?.value ?? ALL_CANDIDATES[0].defaultName).trim() || ALL_CANDIDATES[0].defaultName,
    B: (els.nameB?.value ?? ALL_CANDIDATES[1].defaultName).trim() || ALL_CANDIDATES[1].defaultName,
    C: (els.nameC?.value ?? ALL_CANDIDATES[2].defaultName).trim() || ALL_CANDIDATES[2].defaultName,
    D: (els.nameD?.value ?? ALL_CANDIDATES[3].defaultName).trim() || ALL_CANDIDATES[3].defaultName,
  };
}

function optionLabel(n) {
  // ①..⑳, ㉑..㉔
  const circled = [
    '①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩',
    '⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳',
    '㉑','㉒','㉓','㉔',
  ];
  return circled[n - 1] ?? String(n);
}

function formatRanking(ranking, candidateNameById) {
  return ranking.map((id) => candidateNameById[id]).join(' → ');
}

function initOptions() {
  const activeIds = getActiveCandidateIds();
  const perms = generatePermutations(activeIds);
  options = perms.map((ranking, idx) => ({ id: idx + 1, ranking, count: 0 }));
  focusedOptionId = 1;
  selectedOptionId = null;
}

function getBallots() {
  return options.map((o) => ({ ranking: o.ranking, count: o.count }));
}

function clampNonNegativeInt(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function setOptionCount(id, count) {
  const o = options.find((x) => x.id === id);
  if (!o) return;
  o.count = clampNonNegativeInt(count);
}

function rankForCandidateInOption(optionRanking, candidateId) {
  const idx = optionRanking.indexOf(candidateId);
  return idx >= 0 ? idx + 1 : 0;
}

function applyFocusedColumnHighlight() {
  const root = els.matrixTables;
  if (!root) return;
  root.querySelectorAll('.colSelected').forEach((el) => el.classList.remove('colSelected'));
  if (!Number.isFinite(focusedOptionId)) return;
  root.querySelectorAll(`[data-opt-id="${focusedOptionId}"]`).forEach((el) => el.classList.add('colSelected'));
}

function renderMatrixTable() {
  if (!els.matrixTables) return;

  const activeIds = getActiveCandidateIds();
  const candidateNameById = getCandidateNameById();
  const nOpts = options.length;
  const maxCount = options.reduce((max, o) => Math.max(max, Number(o.count) || 0), 0);
  const digitCount = String(Math.max(0, maxCount)).length;
  const paddedDigits = Math.max(4, digitCount);
  els.matrixTables.style.setProperty('--vote-cell-width', `calc(${paddedDigits}ch + 28px)`);
  const showMiddleNames = false;
  const useTwoRows = activeIds.length === 4 && nOpts === 24;
  const inlineSides = useTwoRows || activeIds.length < 4;
  const parts = useTwoRows ? [options.slice(0, 12), options.slice(12, 24)] : [options];

  els.matrixTables.innerHTML = '';

  for (const part of parts) {
    const table = document.createElement('table');
    table.className = 'matrixTable';
    if (inlineSides) table.classList.add('inlineSides');

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');

    const thLeft = document.createElement('th');
    thLeft.className = 'matrixLeft matrixHeadLeft';
    thLeft.textContent = '勾選（只能勾 1 格）';
    headRow.appendChild(thLeft);

    for (let i = 0; i < part.length; i++) {
      const globalIndex = part[i].id; // 1..24
      const th = document.createElement('th');
      th.className = 'matrixHeadOpt';
      th.textContent = optionLabel(globalIndex);
      th.title = formatRanking(part[i].ranking, candidateNameById);
      th.dataset.optId = String(part[i].id);
      headRow.appendChild(th);
    }

    const thRight = document.createElement('th');
    thRight.className = 'matrixRight matrixHeadRight';
    thRight.textContent = '勾選（只能勾 1 格）';
    headRow.appendChild(thRight);

    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    // Row 1: pick (toggle +1)
    {
      const tr = document.createElement('tr');
      const tdL = document.createElement('td');
      tdL.className = 'matrixLeft';
      tdL.textContent = '';
      tr.appendChild(tdL);
      for (const opt of part) {
        const td = document.createElement('td');
        td.className = 'pickCell';
        td.dataset.optId = String(opt.id);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pickBtn';
        const isSelected = opt.id === selectedOptionId;
        btn.textContent = isSelected ? '✔' : '';
        btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
        btn.setAttribute('aria-label', isSelected ? '取消勾選' : '勾選');
        btn.addEventListener('click', () => toggleSelection(opt.id));
        td.appendChild(btn);
        tr.appendChild(td);
      }
      const tdR = document.createElement('td');
      tdR.className = 'matrixRight';
      tdR.textContent = '';
      tr.appendChild(tdR);
      tbody.appendChild(tr);
    }

    // Row 2: vote counts
    {
      const tr = document.createElement('tr');
      const tdL = document.createElement('td');
      tdL.className = 'matrixLeft';
      tdL.textContent = '票數';
      tr.appendChild(tdL);
      for (const opt of part) {
        const td = document.createElement('td');
        td.dataset.optId = String(opt.id);
        const input = document.createElement('input');
        input.className = 'voteCellInput';
        input.type = 'number';
        input.min = '0';
        input.step = '1';
        input.value = String(opt.count);
        input.addEventListener('input', () => {
          setOptionCount(opt.id, Number(input.value));
          input.value = String(options.find((x) => x.id === opt.id)?.count ?? 0);
          recomputeAndRender();
        });
        td.appendChild(input);
        tr.appendChild(td);
      }
      const tdR = document.createElement('td');
      tdR.className = 'matrixRight';
      tdR.textContent = '票數';
      tr.appendChild(tdR);
      tbody.appendChild(tr);
    }

    // Candidate rows
    for (const cid of activeIds) {
      const tr = document.createElement('tr');
      const name = candidateNameById[cid];
      const tdL = document.createElement('td');
      tdL.className = 'matrixLeft';
      tdL.textContent = name;
      tr.appendChild(tdL);

      for (const opt of part) {
        const rank = rankForCandidateInOption(opt.ranking, cid);
        const td = document.createElement('td');
        td.className = `rankCell rank${rank}`;
        td.dataset.optId = String(opt.id);
        td.textContent = String(rank);
        tr.appendChild(td);
      }

      const tdR = document.createElement('td');
      tdR.className = 'matrixRight';
      tdR.textContent = name;
      tr.appendChild(tdR);
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    els.matrixTables.appendChild(table);
  }

  applyFocusedColumnHighlight();
  return;
}

function toggleSelection(id) {
  if (!Number.isFinite(id)) return;
  const cur = options.find((x) => x.id === id);
  if (!cur) return;

  if (selectedOptionId === id) {
    setOptionCount(id, (cur.count ?? 0) - 1);
    selectedOptionId = null;
  } else {
    if (selectedOptionId) {
      const prev = options.find((x) => x.id === selectedOptionId);
      if (prev) setOptionCount(selectedOptionId, (prev.count ?? 0) - 1);
    }
    selectedOptionId = id;
    setOptionCount(id, (cur.count ?? 0) + 1);
    focusedOptionId = id;
  }

  rerenderMatrixAndKeepFocus();
  recomputeAndRender();
}

function renderFinder() {
  if (!els.finderSelects) return;
  const activeIds = getActiveCandidateIds();
  const candidateNameById = getCandidateNameById();
  if (finderSelections.length !== activeIds.length) {
    finderSelections = new Array(activeIds.length).fill('');
  }

  els.finderSelects.innerHTML = '';
  for (let i = 0; i < activeIds.length; i++) {
    const wrap = document.createElement('div');
    const label = document.createElement('div');
    label.className = 'small';
    label.textContent = `第 ${i + 1} 偏好`;
    const select = document.createElement('select');

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '選擇候選人';
    select.appendChild(placeholder);
    for (const id of activeIds) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = candidateNameById[id];
      select.appendChild(opt);
    }
    select.value = finderSelections[i] || '';
    select.addEventListener('change', () => {
      const picked = select.value;
      finderSelections[i] = picked;
      if (picked) {
        for (let j = 0; j < finderSelections.length; j++) {
          if (j !== i && finderSelections[j] === picked) finderSelections[j] = '';
        }
      }
      renderFinder();
    });

    wrap.appendChild(label);
    wrap.appendChild(select);
    els.finderSelects.appendChild(wrap);
  }
}

function handleFinderQuery() {
  if (!els.finderResult) return;
  const activeIds = getActiveCandidateIds();
  if (finderSelections.length !== activeIds.length || finderSelections.some((v) => !v)) {
    els.finderResult.textContent = '請先選滿所有偏好。';
    return;
  }
  const uniq = new Set(finderSelections);
  if (uniq.size !== activeIds.length) {
    els.finderResult.textContent = '候選人不能重複。';
    return;
  }

  const key = finderSelections.join('|');
  const opt = options.find((o) => o.ranking.join('|') === key);
  if (!opt) {
    els.finderResult.textContent = '查無對應選項。';
    return;
  }

  focusedOptionId = opt.id;
  applyFocusedColumnHighlight();
  const label = optionLabel(opt.id);
  els.finderResult.textContent = `對應選項：${label}（第 ${opt.id} 選項）`;

  const cell = els.matrixTables?.querySelector(`[data-opt-id="${opt.id}"]`);
  if (cell && typeof cell.scrollIntoView === 'function') {
    cell.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

function renderSummary(ballots) {
  const activeIds = getActiveCandidateIds();
  const candidateNameById = getCandidateNameById();
  const total = ballots.reduce((a, b) => a + b.count, 0);
  els.totalVotes.textContent = String(total);
  const first = computeFirstChoiceCounts(ballots, activeIds);

  const rows = activeIds.map((cid) => {
    const v = first[cid] ?? 0;
    const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0.0';
    return `
      <div class="summaryRow">
        <div>${escapeHtml(candidateNameById[cid])}</div>
        <div class="badge">第一偏好 ${v}（${pct}%）</div>
      </div>
    `;
  }).join('');

  els.summary.innerHTML = `
    <div class="summaryRow"><div>候選人數</div><div class="badge">${activeIds.length}</div></div>
    <div class="summaryRow"><div>選項數</div><div class="badge">${options.length}</div></div>
    <div class="summaryRow"><div>總票數</div><div class="badge">${total}</div></div>
    <div style="margin-top:10px; color: rgba(17,24,39,0.75)">第一偏好分布</div>
    ${rows}
    <div class="small" style="margin-top:10px">註：IRV 每輪會依剩餘候選人重新判定「第一偏好」。</div>
  `;
}

function renderExplain(result) {
  const html = result.explain
    .map((s) => {
      const body = escapeHtml(s.body);
      return `
        <div class="step">
          <h3>${escapeHtml(s.title)}</h3>
          <pre>${body}</pre>
        </div>
      `;
    })
    .join('');

  els.explain.innerHTML = html;
}

function replaceCandidateIds(text, candidateNameById, activeIds) {
  if (!text) return text;
  const ids = (activeIds ?? []).slice().sort((a, b) => b.length - a.length);
  if (!ids.length) return text;
  const re = new RegExp(`\\b(${ids.join('|')})\\b`, 'g');
  return text.replace(re, (m) => candidateNameById[m] ?? m);
}

function mapExplainWithNames(explain, candidateNameById, activeIds) {
  return (explain ?? []).map((s) => ({
    ...s,
    title: replaceCandidateIds(s.title, candidateNameById, activeIds),
    body: replaceCandidateIds(s.body, candidateNameById, activeIds),
  }));
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildIRVSankeyData(irv) {
  // Nodes: (round, candidate) only for candidates active in that round.
  // Links: from round r to r+1, consisting of
  // - carry-over for surviving candidates
  // - transfers caused by the elimination in round r

  const rounds = irv.rounds;
  const nodeKey = (round, cid) => `${round}:${cid}`;
  const candidateNameById = getCandidateNameById();

  /** @type {Map<string, {key:string, round:number, cid:string, name:string, count:number}>} */
  const nodesMap = new Map();
  /** @type {{source:string, target:string, value:number}[]} */
  const links = [];

  for (let i = 0; i < rounds.length; i++) {
    const rd = rounds[i];
    const roundNum = rd.round;
    for (const cid of rd.active) {
      const key = nodeKey(roundNum, cid);
      if (!nodesMap.has(key)) {
        nodesMap.set(key, {
          key,
          round: roundNum,
          cid,
          name: `${candidateNameById[cid]}（第${roundNum}輪）`,
          count: rd.firstCounts[cid] ?? 0,
        });
      }
    }

    if (i === rounds.length - 1) continue;

    const next = rounds[i + 1];
    const nextRoundNum = next.round;

    // Ensure next round nodes exist
    for (const cid of next.active) {
      const key = nodeKey(nextRoundNum, cid);
      if (!nodesMap.has(key)) {
        nodesMap.set(key, {
          key,
          round: nextRoundNum,
          cid,
          name: `${candidateNameById[cid]}（第${nextRoundNum}輪）`,
          count: next.firstCounts[cid] ?? 0,
        });
      }
    }

    const transfers = irv.transfers.filter((x) => x.round === roundNum);
    /** @type {Record<string, number>} */
    const incoming = {};
    for (const t of transfers) {
      if (t.value <= 0) continue;
      incoming[t.to] = (incoming[t.to] ?? 0) + t.value;
      links.push({
        source: nodeKey(roundNum, t.from),
        target: nodeKey(nextRoundNum, t.to),
        value: t.value,
      });
    }

    // Carry-over for candidates that survive into next round.
    for (const cid of next.active) {
      const nextCount = next.firstCounts[cid] ?? 0;
      const carry = Math.max(0, nextCount - (incoming[cid] ?? 0));
      if (carry <= 0) continue;
      links.push({
        source: nodeKey(roundNum, cid),
        target: nodeKey(nextRoundNum, cid),
        value: carry,
      });
    }
  }

  const nodes = [...nodesMap.values()];
  const idx = new Map(nodes.map((n, i) => [n.key, i]));
  const sankeyLinks = links
    .map((l) => ({ source: idx.get(l.source), target: idx.get(l.target), value: l.value }))
    .filter((l) => Number.isInteger(l.source) && Number.isInteger(l.target) && l.value > 0);

  // Filter nodes that are part of the connected graph (have link in/out)
  /** @type {Set<number>} */
  const used = new Set();
  for (const l of sankeyLinks) {
    used.add(l.source);
    used.add(l.target);
  }
  const oldToNew = new Map();
  const filteredNodes = [];
  for (let i = 0; i < nodes.length; i++) {
    if (!used.has(i)) continue;
    oldToNew.set(i, filteredNodes.length);
    filteredNodes.push(nodes[i]);
  }
  const filteredLinks = sankeyLinks
    .map((l) => ({ source: oldToNew.get(l.source), target: oldToNew.get(l.target), value: l.value }))
    .filter((l) => Number.isInteger(l.source) && Number.isInteger(l.target));

  return {
    nodes: filteredNodes.map((n) => ({ name: n.name, round: n.round, cid: n.cid, count: n.count })),
    links: filteredLinks,
  };
}

function renderIRVSankey(irv) {
  // Hide if no votes or only one round
  const totalVotes = getBallots().reduce((a, b) => a + b.count, 0);
  if (totalVotes <= 0 || irv.rounds.length <= 1) {
    els.sankeyContainer.innerHTML = '<div class="small">（票數為 0 或僅 1 輪，無票流可視覺化）</div>';
    return;
  }

  const { nodes, links } = buildIRVSankeyData(irv);
  if (links.length === 0) {
    els.sankeyContainer.innerHTML = '<div class="small">（無可繪製的票流）</div>';
    return;
  }

  const width = Math.max(520, els.sankeyContainer.clientWidth - 10);
  const height = 340;

  els.sankeyContainer.innerHTML = '';
  const svg = d3
    .select(els.sankeyContainer)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMinYMin meet');

  const sankey = d3
    .sankey()
    .nodeWidth(18)
    .nodePadding(12)
    .extent([
      [10, 10],
      [width - 10, height - 10],
    ]);

  const graph = sankey({
    nodes: nodes.map((d) => ({ ...d })),
    links: links.map((d) => ({ ...d })),
  });

  const color = (cid) => {
    const palette = {
      A: '#7c5cff',
      B: '#20c997',
      C: '#ffa94d',
      D: '#4dabf7',
    };
    return palette[cid] ?? '#adb5bd';
  };

  svg
    .append('g')
    .attr('fill', 'none')
    .selectAll('path')
    .data(graph.links)
    .join('path')
    .attr('d', d3.sankeyLinkHorizontal())
    .attr('stroke', (d) => color(graph.nodes[d.source.index].cid))
    .attr('stroke-opacity', 0.35)
    .attr('stroke-width', (d) => Math.max(1, d.width))
    .append('title')
    .text((d) => {
      const s = graph.nodes[d.source.index];
      const t = graph.nodes[d.target.index];
      return `${s.name} → ${t.name}: ${d.value}`;
    });

  const node = svg
    .append('g')
    .selectAll('g')
    .data(graph.nodes)
    .join('g');

  node
    .append('rect')
    .attr('x', (d) => d.x0)
    .attr('y', (d) => d.y0)
    .attr('height', (d) => d.y1 - d.y0)
    .attr('width', (d) => d.x1 - d.x0)
    .attr('rx', 4)
    .attr('fill', (d) => color(d.cid))
    .attr('fill-opacity', 0.8)
    .attr('stroke', 'rgba(17,24,39,0.18)')
    .append('title')
    .text((d) => {
      const count = d.count ?? d.value ?? 0;
      const pct = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : '0.0';
      return `${d.name}\n累積得票：${count}\n占總票數：${pct}%`;
    });

  node
    .append('text')
    .attr('x', (d) => (d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6))
    .attr('y', (d) => (d.y0 + d.y1) / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', (d) => (d.x0 < width / 2 ? 'start' : 'end'))
    .attr('fill', 'rgba(17,24,39,0.88)')
    .style('font-size', '12px')
    .text((d) => d.name)
    .append('title')
    .text((d) => {
      const count = d.count ?? d.value ?? 0;
      const pct = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : '0.0';
      return `${d.name}\n累積得票：${count}\n占總票數：${pct}%`;
    });
}

function renderPairwiseTable(pairwise, activeIds, candidateNameById, container, totalVotes = 0) {
  if (!container) return;
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  trh.appendChild(document.createElement('th'));
  for (const c of activeIds) {
    const th = document.createElement('th');
    th.textContent = candidateNameById[c];
    trh.appendChild(th);
  }
  thead.appendChild(trh);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const a of activeIds) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = candidateNameById[a];
    tr.appendChild(th);
    for (const b of activeIds) {
      const td = document.createElement('td');
      if (a === b) {
        td.textContent = '-';
      } else {
        const v = pairwise?.[a]?.[b] ?? 0;
        const pct = totalVotes > 0 ? ((v / totalVotes) * 100).toFixed(1) : '0.0';
        td.textContent = `${v} (${pct}%)`;
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  container.innerHTML = '';
  container.appendChild(table);
}

function computeCondorcetStats(pairwise, activeIds) {
  return activeIds.map((cid) => {
    let wins = 0;
    let losses = 0;
    let ties = 0;
    let margin = 0;
    for (const other of activeIds) {
      if (cid === other) continue;
      const ab = pairwise?.[cid]?.[other] ?? 0;
      const ba = pairwise?.[other]?.[cid] ?? 0;
      if (ab > ba) wins += 1;
      else if (ab < ba) losses += 1;
      else ties += 1;
      margin += ab - ba;
    }
    return { cid, wins, losses, ties, margin };
  }).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.margin !== a.margin) return b.margin - a.margin;
    return a.cid.localeCompare(b.cid, 'zh-Hant');
  });
}

function renderCondorcetRanking(pairwise, activeIds, candidateNameById, container) {
  if (!container) return;
  const stats = computeCondorcetStats(pairwise, activeIds);
  const needsWinnerCheck = activeIds.length > 1;
  const winnerId = needsWinnerCheck && stats[0]?.wins === activeIds.length - 1 ? stats[0].cid : null;
  const rows = stats.map((s, i) => {
    const name = candidateNameById[s.cid];
    const leader = winnerId && s.cid === winnerId ? '（孔多賽優勝者）' : '';
    const sign = s.margin > 0 ? `+${s.margin}` : String(s.margin);
    return `<li>${escapeHtml(name)}${leader} — 勝 ${s.wins} / 負 ${s.losses} / 和 ${s.ties}（總差額 ${sign}）</li>`;
  }).join('');

  container.innerHTML = `
    <ol style="margin:0; padding-left: 18px">
      ${rows}
    </ol>
    <div class="small" style="margin-top:8px">排序依勝場數優先；若勝場數相同，依兩兩對決總差額排序。</div>
  `;
}

function renderPairwiseGraph(pairwise, container, lockedEdges = [], mode = 'locked') {
  if (!container) return;
  const activeIds = getActiveCandidateIds();
  const candidateNameById = getCandidateNameById();
  const uid = container.id || `pairwise-${Math.random().toString(36).slice(2, 8)}`;
  const markerBaseId = `arrowPairwise-${uid}`;
  const markerLockedId = `arrowPairwiseLocked-${uid}`;

  const w = Math.max(280, Math.floor(container.getBoundingClientRect().width) - 4);
  const h = 220;
  container.innerHTML = '';
  const svg = d3
    .select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${w} ${h}`)
    .attr('preserveAspectRatio', 'xMinYMin meet');

  svg
    .append('defs')
    .append('marker')
    .attr('id', markerBaseId)
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 14)
    .attr('refY', 0)
    .attr('markerWidth', 8)
    .attr('markerHeight', 8)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', 'rgba(17,24,39,0.7)');

  if (mode === 'locked') {
    svg
      .select('defs')
      .append('marker')
      .attr('id', markerLockedId)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 14)
      .attr('refY', 0)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', 'rgba(37,99,235,0.85)');
  }

  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.33;
  const nodes = activeIds.map((cid, i) => {
    const ang = (Math.PI * 2 * i) / activeIds.length - Math.PI / 2;
    return {
      cid,
      name: candidateNameById[cid],
      x: cx + r * Math.cos(ang),
      y: cy + r * Math.sin(ang),
    };
  });
  const byId = Object.fromEntries(nodes.map((n) => [n.cid, n]));

  /** @type {{from:string, to:string, margin:number, winVotes:number, loseVotes:number, locked?:boolean}[]} */
  const edges = [];
  const lockedSet = new Set((lockedEdges ?? []).map((e) => `${e.from}>${e.to}`));
  for (let i = 0; i < activeIds.length; i++) {
    for (let j = i + 1; j < activeIds.length; j++) {
      const a = activeIds[i];
      const b = activeIds[j];
      const ab = pairwise?.[a]?.[b] ?? 0;
      const ba = pairwise?.[b]?.[a] ?? 0;
      if (ab === ba) continue;
      if (ab > ba) {
        edges.push({ from: a, to: b, margin: ab - ba, winVotes: ab, loseVotes: ba, locked: lockedSet.has(`${a}>${b}`) });
      } else {
        edges.push({ from: b, to: a, margin: ba - ab, winVotes: ba, loseVotes: ab, locked: lockedSet.has(`${b}>${a}`) });
      }
    }
  }

  const edgeSel = svg
    .append('g')
    .selectAll('path')
    .data(edges)
    .join('path')
    .attr('d', (e) => {
      const s = byId[e.from];
      const t = byId[e.to];
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      const ux = dx / len;
      const uy = dy / len;
      const pad = 18;
      const x1 = s.x + ux * pad;
      const y1 = s.y + uy * pad;
      const x2 = t.x - ux * pad;
      const y2 = t.y - uy * pad;
      return `M${x1},${y1} L${x2},${y2}`;
    })
    .attr('stroke', (e) => (mode === 'locked' && e.locked ? 'rgba(37,99,235,0.85)' : 'rgba(17,24,39,0.65)'))
    .attr('stroke-width', (e) => (mode === 'locked' && e.locked ? 3 : 2.2))
    .attr('stroke-dasharray', (e) => (mode === 'locked' && !e.locked ? '4 4' : '0'))
    .attr('fill', 'none')
    .attr(
      'marker-end',
      (e) => (mode === 'locked' && e.locked ? `url(#${markerLockedId})` : `url(#${markerBaseId})`)
    );

  edgeSel
    .append('title')
    .text((e) => {
      const mark = mode === 'locked' && e.locked ? 'LOCK' : 'PAIR';
      return `${mark} ${candidateNameById[e.from]} → ${candidateNameById[e.to]} (${e.winVotes} vs ${e.loseVotes}, margin ${e.margin})`;
    });

  svg
    .selectAll('marker')
    .append('title')
    .text('勝負箭頭');

  const node = svg.append('g').selectAll('g').data(nodes).join('g');
  node
    .append('circle')
    .attr('cx', (d) => d.x)
    .attr('cy', (d) => d.y)
    .attr('r', 18)
    .attr('fill', 'rgba(17,24,39,0.06)')
    .attr('stroke', 'rgba(17,24,39,0.28)');
  node
    .append('text')
    .attr('x', (d) => d.x)
    .attr('y', (d) => d.y + 4)
    .attr('text-anchor', 'middle')
    .attr('fill', 'rgba(17,24,39,0.90)')
    .style('font-size', '12px')
    .text((d) => d.name);
}

function renderRankedPairsViz(rp) {
  const activeIds = getActiveCandidateIds();
  const candidateNameById = getCandidateNameById();
  const totalVotes = getBallots().reduce((a, b) => a + b.count, 0);

  // Pairwise matrix table
  renderPairwiseTable(rp.pairwise, activeIds, candidateNameById, els.pairwiseContainer, totalVotes);
  renderPairwiseGraph(rp.pairwise, els.rpGraphContainer, rp.lockedEdges, 'locked');

  // Ranking list
  const orderNames = (rp.order ?? []).map((cid) => candidateNameById[cid]);
  els.rpOrder.innerHTML = `
    <ol style="margin:0; padding-left: 18px">
      ${orderNames.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}
    </ol>
  `;

  renderCondorcetRanking(rp.pairwise, activeIds, candidateNameById, els.condorcetOrder);
}

function renderCondorcetViz(pairwise) {
  const activeIds = getActiveCandidateIds();
  const candidateNameById = getCandidateNameById();
  const totalVotes = getBallots().reduce((a, b) => a + b.count, 0);
  renderPairwiseTable(pairwise, activeIds, candidateNameById, els.condorcetPairwise, totalVotes);
  renderPairwiseGraph(pairwise, els.condorcetGraph, [], 'plain');
  renderCondorcetRanking(pairwise, activeIds, candidateNameById, els.condorcetOrderStandalone);
}

function buildIRVExplain(irv) {
  const candidateNameById = getCandidateNameById();
  return irv.rounds.map((rd) => {
    const activeNames = rd.active.map((cid) => candidateNameById[cid]);
    const total = Object.values(rd.firstCounts).reduce((a, v) => a + v, 0);
    const lines = rd.active
      .map((cid) => {
        const v = rd.firstCounts[cid] ?? 0;
        const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0.0';
        return `${candidateNameById[cid]}: ${v}（${pct}%）`;
      })
      .join('\n');
    if (rd.winner) {
      return {
        title: `第 ${rd.round} 輪：剩最後一人 ${candidateNameById[rd.winner]} 當選`,
        body: `本輪仍在競逐：${activeNames.join('、')}\n本輪有效票合計 ${total}\n\n第一偏好票數：\n${lines}`,
      };
    }
    const minVotes = Math.min(...rd.active.map((cid) => rd.firstCounts[cid] ?? 0));
    const minNames = rd.active.filter((cid) => (rd.firstCounts[cid] ?? 0) === minVotes).map((cid) => candidateNameById[cid]);
    const eliminatedName = candidateNameById[rd.eliminated];
    const reason = minNames.length > 1
      ? `淘汰原因：第一偏好最少（同票：${minNames.join('、')}；依固定順序淘汰 ${eliminatedName}）`
      : `淘汰原因：第一偏好最少（${eliminatedName} ${minVotes} 票）`;
    return {
      title: `第 ${rd.round} 輪：淘汰 ${candidateNameById[rd.eliminated]}`,
      body: `本輪仍在競逐：${activeNames.join('、')}\n本輪有效票合計 ${total}\n${reason}\n\n第一偏好票數：\n${lines}`,
    };
  });
}

function buildRankedPairsExplain(rp) {
  const candidateNameById = getCandidateNameById();
  const lines = (rp.decisions ?? []).map((d) => {
    const p = d.pair;
    const mark = d.locked ? 'LOCK' : 'SKIP';
    const reason = d.locked ? '' : ` (${d.reason})`;
    return `${mark}  ${candidateNameById[p.winner]} > ${candidateNameById[p.loser]}  (${p.winVotes} vs ${p.loseVotes}, margin ${p.margin})${reason}`;
  }).join('\n');
  return [
    { title: '依序鎖定勝負對（Ranked Pairs）', body: lines || '（無可鎖定的勝負對）' },
    { title: '最終排序', body: (rp.order ?? []).map((cid, i) => `${i + 1}. ${candidateNameById[cid]}`).join('\n') },
  ];
}

function recomputeAndRender() {
  const ballots = getBallots();
  renderSummary(ballots);

  const system = els.system.value;
  const activeIds = getActiveCandidateIds();
  const candidateNameById = getCandidateNameById();
  if (els.irvViz) els.irvViz.style.display = '';
  if (els.rpViz) els.rpViz.style.display = 'none';
  if (els.rpSection) els.rpSection.style.display = 'none';

  const irvAll = runIRV({ candidates: activeIds, ballots });
  renderIRVSankey(irvAll);

  const showCondorcet = system !== 'rankedPairs';
  if (els.condorcetSection) els.condorcetSection.style.display = showCondorcet ? '' : 'none';
  if (showCondorcet) {
    const pairwise = computePairwiseMatrix({ candidates: activeIds, ballots });
    renderCondorcetViz(pairwise);
  }
  if (system === 'irv') {
    renderExplain({ explain: buildIRVExplain(irvAll) });
    return;
  }

  if (system === 'rankedPairs') {
    if (els.rpSection) els.rpSection.style.display = '';
    if (els.rpViz) els.rpViz.style.display = '';
    const rp = runRankedPairs({ candidates: activeIds, ballots });
    renderRankedPairsViz(rp);
    renderExplain({ explain: buildRankedPairsExplain(rp) });
    return;
  }

  // Other methods: only show explanation (no Sankey / no locked-graph)
  if (system === 'plurality') {
    const res = runPlurality({ candidates: activeIds, ballots });
    renderExplain({ explain: mapExplainWithNames(res.explain, candidateNameById, activeIds) });
    return;
  }
  if (system === 'borda') {
    const res = runBorda({ candidates: activeIds, ballots });
    renderExplain({ explain: mapExplainWithNames(res.explain, candidateNameById, activeIds) });
    return;
  }
  if (system === 'minimax') {
    const res = runMinimax({ candidates: activeIds, ballots });
    renderExplain({ explain: mapExplainWithNames(res.explain, candidateNameById, activeIds) });
    return;
  }
  if (system === 'benham') {
    const res = runBenham({ candidates: activeIds, ballots });
    // Provide a fuller step-by-step from rounds
    const steps = (res.rounds ?? []).map((rd) => {
      const names = (rd.active ?? []).map((cid) => candidateNameById[cid]);
      if (rd.condorcetWinner) {
        return {
          title: `第 ${rd.round} 輪：找到孔多賽優勝者，${candidateNameById[rd.condorcetWinner]} 當選`,
          body: `本輪仍在競逐：${names.join('、')}\n\n孔多賽優勝者：${candidateNameById[rd.condorcetWinner]}`,
        };
      }
      const firstCounts = rd.firstCounts ?? {};
      const total = Object.values(firstCounts).reduce((a, v) => a + v, 0);
      const minVotes = Math.min(...(rd.active ?? []).map((cid) => firstCounts[cid] ?? 0));
      const minNames = (rd.active ?? [])
        .filter((cid) => (firstCounts[cid] ?? 0) === minVotes)
        .map((cid) => candidateNameById[cid]);
      const eliminatedName = candidateNameById[rd.eliminated];
      const reason = minNames.length > 1
        ? `淘汰原因：第一偏好最少（同票：${minNames.join('、')}；依固定順序淘汰 ${eliminatedName}）`
        : `淘汰原因：第一偏好最少（${eliminatedName} ${minVotes} 票）`;
      const lines = (rd.active ?? [])
        .map((cid) => {
          const v = firstCounts[cid] ?? 0;
          const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0.0';
          return `${candidateNameById[cid]}: ${v}（${pct}%）`;
        })
        .join('\n');
      return {
        title: `第 ${rd.round} 輪：淘汰 ${candidateNameById[rd.eliminated]}`,
        body: `本輪仍在競逐：${names.join('、')}\n本輪有效票合計 ${total}\n本輪未出現孔多賽優勝者，因此改用 IRV 淘汰最低者\n${reason}\n\n第一偏好票數：\n${lines}`,
      };
    });

    renderExplain({ explain: steps.length ? steps : (res.explain ?? []) });
    return;
  }

  renderExplain({ explain: [{ title: '未知選制', body: `系統值：${String(system)}` }] });
}

function applyPreset(value) {
  if (value === 'blank') {
    for (const o of options) o.count = 0;
    selectedOptionId = null;
  } else if (value === 'demo') {
    randomizeCounts();
    if (selectedOptionId) {
      const cur = options.find((x) => x.id === selectedOptionId);
      if (cur) setOptionCount(selectedOptionId, (cur.count ?? 0) + 1);
    }
  }
}

function rerenderMatrixAndKeepFocus() {
  const old = focusedOptionId;
  renderMatrixTable();
  focusedOptionId = Math.min(old, options.length) || 1;
  // re-check radio after rerender
  const r = document.querySelector(`input[name="focusOption"][value="${focusedOptionId}"]`);
  if (r) r.checked = true;
  applyFocusedColumnHighlight();
}

function wireEvents() {
  els.system.addEventListener('change', () => recomputeAndRender());

  els.candidateCount.addEventListener('change', () => {
    initOptions();
    renderMatrixTable();
    renderFinder();
    recomputeAndRender();
  });

  for (const nameEl of [els.nameA, els.nameB, els.nameC, els.nameD]) {
    nameEl.addEventListener('input', () => {
      rerenderMatrixAndKeepFocus();
      renderFinder();
      recomputeAndRender();
    });
  }

  els.purpose.addEventListener('click', () => {
    if (typeof els.purposeDialog.showModal === 'function') els.purposeDialog.showModal();
    else els.purposeDialog.setAttribute('open', '');
  });
  els.purposeClose.addEventListener('click', () => {
    if (typeof els.purposeDialog.close === 'function') els.purposeDialog.close();
    else els.purposeDialog.removeAttribute('open');
  });

  els.preset.addEventListener('change', () => {
    applyPreset(els.preset.value);
    rerenderMatrixAndKeepFocus();
    recomputeAndRender();
  });

  els.reset.addEventListener('click', () => {
    for (const o of options) o.count = 0;
    selectedOptionId = null;
    rerenderMatrixAndKeepFocus();
    recomputeAndRender();
  });

  els.randomize.addEventListener('click', () => {
    applyPreset('demo');
    rerenderMatrixAndKeepFocus();
    recomputeAndRender();
  });

  for (const el of [els.randTotal, els.randMax, els.randZero, els.randBias]) {
    if (!el) continue;
    el.addEventListener('change', () => saveRandomSettings());
  }

  if (els.finderGo) {
    els.finderGo.addEventListener('click', () => handleFinderQuery());
  }

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Node)) return;
    const closables = [els.finderDetails, document.getElementById('randomSettings')].filter(Boolean);
    for (const el of closables) {
      if (!el || !el.hasAttribute('open')) continue;
      if (el.contains(target)) continue;
      el.removeAttribute('open');
    }
  });

  window.addEventListener('resize', () => {
    const ballots = getBallots();
    const system = els.system.value;
    if (system === 'irv' || system === 'benham') {
      const irv = runIRV({ candidates: getActiveCandidateIds(), ballots });
      renderIRVSankey(irv);
      return;
    }
    if (system === 'rankedPairs') {
      const rp = runRankedPairs({ candidates: getActiveCandidateIds(), ballots });
      renderRankedPairsViz(rp);
    }
  });
}

function main() {
  loadRandomSettings();
  initOptions();
  renderMatrixTable();
  renderFinder();
  wireEvents();
  recomputeAndRender();
}

main();
