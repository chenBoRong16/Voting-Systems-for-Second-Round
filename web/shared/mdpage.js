import { marked } from 'https://cdn.jsdelivr.net/npm/marked@12/+esm';

/**
 * Render a markdown file into an element.
 *
 * Assumes this file is served over HTTP (not file://).
 * @param {{ container: HTMLElement, src: string, tocContainer?: HTMLElement, onRendered?: (ctx: { srcUrl: URL, title?: string }) => void }} args
 */
export async function renderMarkdownPage({ container, src, tocContainer, onRendered }) {
  const url = resolveUrl(src);
  const res = await fetch(url);
  if (!res.ok) {
    container.innerHTML = `<div class="small">讀取失敗：${escapeHtml(String(src))}（HTTP ${res.status}）</div>`;
    return;
  }
  const text = await res.text();

  const renderer = new marked.Renderer();
  renderer.link = (href, title, label) => {
    const safeHref = rewriteHref(href, url);
    const isExternal = isExternalLink(safeHref);
    const attrs = [];
    attrs.push(`href="${escapeHtml(safeHref)}"`);
    if (title) attrs.push(`title="${escapeHtml(title)}"`);
    if (isExternal) attrs.push('target="_blank" rel="noopener"');
    return `<a ${attrs.join(' ')}>${label}</a>`;
  };
  renderer.image = (href, title, text) => {
    const safeSrc = rewriteHref(href, url);
    const attrs = [`src="${escapeHtml(safeSrc)}"`, `alt="${escapeHtml(text ?? '')}"`];
    if (title) attrs.push(`title="${escapeHtml(title)}"`);
    return `<img ${attrs.join(' ')} />`;
  };

  const html = marked.parse(text, { mangle: false, headerIds: true, renderer });
  container.innerHTML = html;

  wrapMarkdownTables(container);
  registerHorizontalScrollHints(container);
  const title = enhanceHeadings(container);
  const tocEl = tocContainer ?? document.getElementById('toc');
  if (tocEl) renderToc({ container, tocContainer: tocEl });

  try {
    onRendered?.({ srcUrl: url, title });
  } catch {
    // ignore
  }
}

let hintsResizeBound = false;
const hintRoots = new Set();

function registerHorizontalScrollHints(root) {
  hintRoots.add(root);

  // Run after layout settles.
  queueMicrotask(() => updateHorizontalScrollHints(root));
  setTimeout(() => updateHorizontalScrollHints(root), 60);

  // If the page uses <details> to collapse/expand wide tables, re-check after toggle.
  const details = root.querySelectorAll('details');
  for (const d of details) {
    if (d.dataset.scrollHintDetailsBound === '1') continue;
    d.dataset.scrollHintDetailsBound = '1';
    d.addEventListener('toggle', () => {
      updateHorizontalScrollHints(root);
    });
  }

  if (!hintsResizeBound) {
    hintsResizeBound = true;
    window.addEventListener('resize', () => {
      for (const r of hintRoots) updateHorizontalScrollHints(r);
    });
  }
}


function updateHorizontalScrollHints(root) {
  const els = root.querySelectorAll('.tableWrap');
  for (const el of els) {
    const canScrollX = el.scrollWidth > el.clientWidth + 2;
    el.classList.toggle('scrollX', canScrollX);
    if (!el.dataset.scrollHintBound) {
      el.dataset.scrollHintBound = '1';
      el.addEventListener('scroll', () => {
        if (Math.abs(el.scrollLeft) > 2) el.dataset.scrolledX = '1';
      }, { passive: true });
    }
  }
}

function resolveUrl(src) {
  const s = String(src);
  if (/^https?:\/\//i.test(s)) return new URL(s);

  // On GitHub Pages, leading-slash URLs resolve to the domain root (wrong for /<repo>/).
  // Derive the repo root from this module path: /<repo>/web/shared/mdpage.js -> /<repo>/
  const repoRoot = new URL('../../../', import.meta.url);
  if (s.startsWith('/')) return new URL(s.slice(1), repoRoot);

  return new URL(s, window.location.href);
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function isExternalLink(href) {
  try {
    const u = new URL(String(href), window.location.href);
    return u.origin !== window.location.origin;
  } catch {
    return false;
  }
}

function rewriteHref(href, mdUrl) {
  const raw = String(href ?? '');
  if (!raw) return '';
  if (raw.startsWith('#')) return raw;
  if (/^(mailto:|tel:|https?:\/\/)/i.test(raw)) return raw;

  // On GitHub Pages, leading-slash URLs resolve to the domain root (wrong for /<repo>/).
  // Treat them as repo-root relative instead.
  const repoRoot = new URL('../../../', import.meta.url);

  // Resolve relative to the markdown file location.
  let resolved;
  try {
    resolved = raw.startsWith('/') && !raw.startsWith('//')
      ? new URL(raw.slice(1), repoRoot)
      : new URL(raw, mdUrl);
  } catch {
    return raw;
  }

  // If this is a markdown link and we're inside a markdown viewer page, keep navigation inside the viewer.
  if (resolved.pathname.endsWith('.md')) {
    const resolvedHref = resolved.toString();
    if (resolvedHref.startsWith(repoRoot.toString())) {
      const rel = resolvedHref.slice(repoRoot.toString().length);
      const docParam = `/${rel}`;
      const page = new URL(window.location.href);
      // Only rewrite when the current page already uses ?doc= (or is one of our known viewer pages).
      const isViewer = page.searchParams.has('doc') || /\/web\/(methods|purpose|ballot-design|methodology)\/?$/.test(page.pathname);
      if (isViewer) {
        page.searchParams.set('doc', docParam);
        page.hash = '';
        return page.toString();
      }
    }
  }

  return resolved.toString();
}

function enhanceHeadings(root) {
  let firstH1 = null;
  root.querySelectorAll('h1,h2,h3').forEach((h) => {
    if (!firstH1 && h.tagName.toLowerCase() === 'h1') firstH1 = h.textContent?.trim() || null;
    if (!h.id) return;
    if (h.querySelector('.headingAnchor')) return;
    const a = document.createElement('a');
    a.className = 'headingAnchor';
    a.href = `#${h.id}`;
    a.setAttribute('aria-label', '連結到本段落');
    a.textContent = '#';
    h.appendChild(a);
  });
  return firstH1;
}

function renderToc({ container, tocContainer }) {
  const headings = Array.from(container.querySelectorAll('h2,h3'))
    .filter((h) => h.id && (h.textContent || '').trim());

  const layout = tocContainer.closest('.mdLayout');

  if (headings.length === 0) {
    tocContainer.innerHTML = '';
    tocContainer.style.display = 'none';
    if (layout) layout.classList.add('noToc');
    return;
  }

  tocContainer.style.display = '';
  if (layout) layout.classList.remove('noToc');
  const items = headings.map((h) => {
    const level = h.tagName.toLowerCase();
    const text = (h.childNodes[0]?.textContent || h.textContent || '').trim();
    return { id: h.id, text, level };
  });

  const title = document.createElement('div');
  title.className = 'tocTitle';
  title.textContent = '目錄';

  const list = document.createElement('div');
  list.className = 'tocList';
  for (const it of items) {
    const a = document.createElement('a');
    a.href = `#${it.id}`;
    a.textContent = it.text;
    a.className = it.level === 'h3' ? 'tocItem tocItem3' : 'tocItem';
    list.appendChild(a);
  }

  tocContainer.innerHTML = '';
  tocContainer.appendChild(title);
  tocContainer.appendChild(list);
}

function wrapMarkdownTables(root) {
  const tables = Array.from(root.querySelectorAll('table'));
  for (const table of tables) {
    if (table.closest('.tableWrap')) continue;
    const wrap = document.createElement('div');
    wrap.className = 'tableWrap mdTableWrap';
    table.parentNode?.insertBefore(wrap, table);
    wrap.appendChild(table);
  }
}
