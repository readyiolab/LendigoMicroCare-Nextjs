const SUBMIT_ID = 'decision-submit';
const WAIT_FOR_ELEMENT_MS = 2000;
const RECHECK_AFTER_MS = 700;
const HIGHLIGHT_MS = 1500;
const HIGHLIGHT_CLASSES = ['ring-4', 'ring-sky-400', 'ring-offset-2'];

function isFullyInView(el) {
  const rect = el.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  return rect.top >= 0 && rect.bottom <= viewportHeight;
}

/**
 * Bring the Decision tab's final submit button into view after a tab switch.
 * The Decision form grows as products and fees load, so the position is re-checked once.
 */
export function scrollToDecisionSubmit() {
  if (typeof window === 'undefined') return;
  const startedAt = performance.now();

  const tick = () => {
    const el = document.getElementById(SUBMIT_ID);
    if (!el) {
      if (performance.now() - startedAt < WAIT_FOR_ELEMENT_MS) {
        window.requestAnimationFrame(tick);
      }
      return;
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add(...HIGHLIGHT_CLASSES);
    window.setTimeout(() => el.classList.remove(...HIGHLIGHT_CLASSES), HIGHLIGHT_MS);

    window.setTimeout(() => {
      const current = document.getElementById(SUBMIT_ID);
      if (current && !isFullyInView(current)) {
        current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, RECHECK_AFTER_MS);
  };

  window.requestAnimationFrame(tick);
}
