/**
 * Bind a <details> popover panel (.detailsBody) to stay fully visible on narrow screens.
 * It will auto-align left/right based on the trigger position.
 *
 * @param {HTMLDetailsElement} detailsEl
 * @param {{ breakpointPx?: number, marginPx?: number, maxWidthPx?: number }} [opts]
 */
export function bindDetailsPopover(detailsEl, opts = {}) {
  if (!detailsEl) return;

  const breakpointPx = Number.isFinite(opts.breakpointPx) ? opts.breakpointPx : 980;
  const marginPx = Number.isFinite(opts.marginPx) ? opts.marginPx : 10;
  const maxWidthPx = Number.isFinite(opts.maxWidthPx) ? opts.maxWidthPx : 720;

  const panel = detailsEl.querySelector('.detailsBody');
  if (!(panel instanceof HTMLElement)) return;

  const mql = window.matchMedia(`(max-width: ${breakpointPx}px)`);

  function clearInline() {
    panel.style.position = '';
    panel.style.left = '';
    panel.style.right = '';
    panel.style.top = '';
    panel.style.width = '';
    panel.style.maxWidth = '';
  }

  function place() {
    if (!detailsEl.open) return;
    if (!mql.matches) {
      clearInline();
      return;
    }

    const rect = detailsEl.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;

    const width = Math.min(maxWidthPx, Math.max(240, vw - marginPx * 2));

    panel.style.position = 'fixed';
    panel.style.width = `${width}px`;
    panel.style.maxWidth = `${width}px`;

    // Align based on where the trigger sits.
    const preferRight = rect.left > vw * 0.5;
    if (preferRight) {
      const right = Math.max(marginPx, vw - rect.right);
      panel.style.right = `${right}px`;
      panel.style.left = 'auto';
    } else {
      const left = Math.max(marginPx, rect.left);
      panel.style.left = `${left}px`;
      panel.style.right = 'auto';
    }

    // Default to below; flip above if needed.
    const initialTop = rect.bottom + 6;
    panel.style.top = `${Math.min(initialTop, vh - marginPx - 40)}px`;

    requestAnimationFrame(() => {
      if (!detailsEl.open) return;
      const ph = panel.offsetHeight;
      let top = rect.bottom + 6;
      if (top + ph > vh - marginPx) top = rect.top - 6 - ph;
      if (top < marginPx) top = marginPx;
      panel.style.top = `${top}px`;

      // Clamp horizontally if the chosen side still overflows.
      const pr = panel.getBoundingClientRect();
      if (pr.left < marginPx) {
        panel.style.left = `${marginPx}px`;
        panel.style.right = 'auto';
      }
      if (pr.right > vw - marginPx) {
        panel.style.right = `${marginPx}px`;
        panel.style.left = 'auto';
      }
    });
  }

  detailsEl.addEventListener('toggle', () => {
    if (detailsEl.open) place();
    else clearInline();
  });

  window.addEventListener('resize', () => place(), { passive: true });
  window.addEventListener('scroll', () => place(), { passive: true });
  mql.addEventListener?.('change', () => place());
}
