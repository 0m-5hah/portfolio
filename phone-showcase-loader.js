/**
 * Avoids loading Three.js, GLB, and phone-showcase boot logic on phones, tablets, and typical laptops.
 * Keep breakpoint in sync with styles.css (.project-phone-showcase-slot) and phone-showcase.js (1399).
 */
const PHONE_SHOWCASE_MIN_WIDTH_PX = 1400;
const mq = () => window.matchMedia(`(min-width: ${PHONE_SHOWCASE_MIN_WIDTH_PX}px)`);

function loadPhoneShowcaseModule() {
  if (!mq().matches) return;
  import('./phone-showcase.js');
}

function bind() {
  loadPhoneShowcaseModule();
  mq().addEventListener('change', loadPhoneShowcaseModule);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bind);
} else {
  bind();
}
