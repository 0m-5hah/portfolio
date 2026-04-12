/**
 * Resolves the SMS classifier API base URL with an allowlist to prevent * ?api= / localStorage from pointing the demo at arbitrary origins.
 */
(function (global) {
    'use strict';

    var DEFAULT_BASE = 'https://omsshah-spam-classifier-api.hf.space';

    var _synced = false;
    /** @type {{ mode: 'default' } | { mode: 'custom', displayUrl: string, source: string } | { mode: 'rejected', attempted: string }} */
    var _gateState = { mode: 'default' };

    function stripTrailingSlash(u) {
        return String(u).replace(/\/$/, '');
    }

    function readQueryApi() {
        try {
            var q = new URLSearchParams(global.location.search).get('api');
            return q && String(q).trim() ? stripTrailingSlash(q) : null;
        } catch (e) {
            return null;
        }
    }

    function readStorageApi() {
        try {
            var ls = global.localStorage.getItem('spamApiBase');
            return ls && String(ls).trim() ? stripTrailingSlash(ls) : null;
        } catch (e) {
            return null;
        }
    }

    function hostnameAllowed(hostname) {
        var h = String(hostname).toLowerCase();
        if (h === '127.0.0.1' || h === 'localhost') return true;
        return h === 'omsshah-spam-classifier-api.hf.space' || h.endsWith('.hf.space');
    }

    function isAllowedBase(raw) {
        if (raw == null || raw === '') return false;
        try {
            var u = new URL(raw, global.location.href);
            if (u.protocol === 'https:') return hostnameAllowed(u.hostname);
            if (u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost')) {
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    function stripDisallowedFromUrl() {
        try {
            var p = new URLSearchParams(global.location.search);
            if (!p.has('api')) return;
            p.delete('api');
            var next =
                global.location.pathname +
                (p.toString() ? '?' + p.toString() : '') +
                global.location.hash;
            global.history.replaceState(null, '', next);
        } catch (e) {
            /* ignore */
        }
    }

    function cleanupRejected() {
        try {
            global.localStorage.removeItem('spamApiBase');
        } catch (e) {
            /* ignore */
        }
        stripDisallowedFromUrl();
        if (global.console && global.console.warn) {
            global.console.warn(
                '[spam-api-base] Custom API ignored: only https://*.hf.space and http on localhost / 127.0.0.1 are allowed. Using the default hosted API.'
            );
        }
    }

    function syncSpamApiEnvironment() {
        if (_synced) return;
        _synced = true;

        var rawQ = readQueryApi();
        var rawLs = readStorageApi();
        var attempted = rawQ || rawLs;

        if (!attempted) {
            _gateState = { mode: 'default' };
            return;
        }

        if (isAllowedBase(attempted)) {
            _gateState = {
                mode: 'custom',
                displayUrl: attempted,
                source: rawQ ? 'URL (?api=)' : 'localStorage (spamApiBase)',
            };
            return;
        }

        _gateState = { mode: 'rejected', attempted: attempted };
        cleanupRejected();
    }

    function getSpamClassifierApiBase() {
        syncSpamApiEnvironment();
        if (_gateState.mode === 'custom') return _gateState.displayUrl;
        return DEFAULT_BASE;
    }

    function getSpamClassifierApiGateState() {
        syncSpamApiEnvironment();
        return _gateState;
    }

    global.getSpamClassifierApiBase = getSpamClassifierApiBase;
    global.getSpamClassifierApiGateState = getSpamClassifierApiGateState;
})(typeof window !== 'undefined' ? window : globalThis);
