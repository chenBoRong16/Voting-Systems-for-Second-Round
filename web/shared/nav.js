const LINKS = [
  { key: 'home', label: '← 回到入口', href: (webRoot) => new URL('./', webRoot) },
  { key: 'purpose', label: '網站目的', href: (webRoot) => new URL('purpose/', webRoot) },
  { key: 'methodology', label: '方法論（延伸）', href: (webRoot) => new URL('methodology/', webRoot) },
  { key: 'ballot', label: '我的選票設計', href: (webRoot) => new URL('ballot-design/', webRoot) },
  { key: 'methods', label: '選制說明', href: (webRoot) => new URL('methods/', webRoot) },
  { key: 'round2', label: '第二輪測試', href: (webRoot) => new URL('round2/', webRoot) },
  { key: 'updates', label: '更新內容', href: (webRoot) => new URL('updates/', webRoot) },
];

function normalizePathname(pathname) {
  const p = String(pathname || '/');
  return p.endsWith('/') ? p : `${p}/`;
}

/**
 * Render the shared site navigation.
 *
 * This avoids hard-coding ../ paths across pages and works on GitHub Pages.
 * @param {{ container: HTMLElement }} args
 */
export function renderSiteNav({ container }) {
  if (!container) return;

  // Accessibility: provide a skip link for keyboard users.
  // Pages should have <main id="main">…</main>.
  if (!document.querySelector('.skipLink')) {
    const main = document.getElementById('main');
    if (main) {
      const skip = document.createElement('a');
      skip.className = 'skipLink';
      skip.href = '#main';
      skip.textContent = '跳到主要內容';
      document.body.prepend(skip);
    }
  }

  const webRoot = new URL('../', import.meta.url); // .../web/
  const current = normalizePathname(window.location.pathname);

  container.innerHTML = '';
  for (const link of LINKS) {
    const a = document.createElement('a');
    const url = link.href(webRoot);
    a.href = url.toString();
    a.textContent = link.label;

    const targetPath = normalizePathname(url.pathname);
    if (targetPath === current) a.setAttribute('aria-current', 'page');

    container.appendChild(a);
  }
}
