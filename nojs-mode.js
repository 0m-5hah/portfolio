/**
 * Runs early: ?nojs=1 loads nojs.css and marks <html> before main bundles execute.
 */
(function () {
    function hasNoJsQuery() {
        try {
            return new URLSearchParams(location.search).get('nojs') === '1';
        } catch (_) {
            return /\bnojs=1\b/.test(location.search || '');
        }
    }

    function applyNoJsCompat() {
        if (!hasNoJsQuery()) return;
        document.documentElement.classList.add('html-nojs-compat');
        if (typeof window !== 'undefined') window.__OM_PORTFOLIO_NOJS__ = true;
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'nojs.css';
        document.head.appendChild(link);
    }
    applyNoJsCompat();
})();
