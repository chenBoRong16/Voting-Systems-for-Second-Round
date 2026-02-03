import { marked } from 'https://cdn.jsdelivr.net/npm/marked@12/+esm';

/**
 * Render a markdown file into an element.
 *
 * Assumes this file is served over HTTP (not file://).
 * @param {{ container: HTMLElement, src: string }} args
 */
export async function renderMarkdownPage({ container, src }) {
  const url = resolveUrl(src);
  const res = await fetch(url);
  if (!res.ok) {
    container.innerHTML = `<div class="small">讀取失敗：${escapeHtml(String(src))}（HTTP ${res.status}）</div>`;
    return;
  }
  const text = await res.text();
  container.innerHTML = marked.parse(text, { mangle: false, headerIds: true });
}

function resolveUrl(src) {
  const s = String(src);
  if (/^https?:\/\//i.test(s)) return new URL(s);

  // On GitHub Pages, leading-slash URLs resolve to the domain root (wrong for /<repo>/).
  // Derive the repo root from this module path: /<repo>/web/shared/mdpage.js -> /<repo>/
  const repoRoot = new URL('../../', import.meta.url);
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
