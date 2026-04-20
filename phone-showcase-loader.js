/**
 * Avoids loading Three.js, GLB, and phone-showcase boot on small viewports.
 * Keep breakpoint in sync with styles.css (.project-phone-showcase-slot).
 */
const PHONE_SHOWCASE_MIN_WIDTH_PX = 1400;
const mq = () => window.matchMedia(`(min-width: ${PHONE_SHOWCASE_MIN_WIDTH_PX}px)`);

function isNoJsCompatLayout() {
  if (typeof window !== 'undefined' && window.__OM_PORTFOLIO_NOJS__) return true;
  if (document.documentElement.classList.contains('html-nojs-compat')) return true;
  try {
    if (new URLSearchParams(location.search).get('nojs') === '1') return true;
  } catch (_) {
    /* ignore */
  }
  return /\bnojs=1\b/.test(typeof location !== 'undefined' ? location.search : '');
}

function loadPhoneShowcaseModule() {
  if (isNoJsCompatLayout()) return;
  if (!mq().matches) return;
  import('./phone-showcase.js').catch((e) => {
    console.error('[phone-showcase-loader] failed to load phone-showcase.js', e);
  });
}

function bind() {
  loadPhoneShowcaseModule();
  mq().addEventListener('change', loadPhoneShowcaseModule);
  let resizeT = 0;
  window.addEventListener(
    'resize',
    () => {
      window.clearTimeout(resizeT);
      resizeT = window.setTimeout(loadPhoneShowcaseModule, 150);
    },
    { passive: true }
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bind);
} else {
  bind();
}
