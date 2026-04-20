/**
 * Preview the SMS API status chip without calling /health. Normally keep `null`.
 * Or open `?api_badge=down` once; it is saved for this tab (sessionStorage) so plain reloads keep the preview.
 * Clear with `?api_badge=off` or `sessionStorage.removeItem('smsApiBadgePreview')` in DevTools.
 */
const SMS_API_BADGE_PREVIEW = null;

const SMS_API_BADGE_SESSION_KEY = 'smsApiBadgePreview';

const SMS_API_BADGE_VALID = new Set(['down', 'checking', 'live', 'warmup']);

/** Set by nojs-mode.js for ?nojs=1; also used when matching search (before class is set). */
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

function normalizeApiBadgeMode(v) {
    if (v == null || v === '') return null;
    const m = String(v).toLowerCase();
    if (m === 'off') return null;
    return SMS_API_BADGE_VALID.has(m) ? m : null;
}

function syncApiBadgePreviewFromUrl() {
    try {
        const params = new URLSearchParams(window.location.search);
        if (!params.has('api_badge')) return;
        const raw = params.get('api_badge');
        if (raw === null || raw === '' || raw.toLowerCase() === 'off') {
            sessionStorage.removeItem(SMS_API_BADGE_SESSION_KEY);
            return;
        }
        const n = normalizeApiBadgeMode(raw);
        if (n) sessionStorage.setItem(SMS_API_BADGE_SESSION_KEY, n);
    } catch (e) {
        /* ignore */
    }
}

function getApiBadgeSimulationMode() {
    if (SMS_API_BADGE_PREVIEW != null && String(SMS_API_BADGE_PREVIEW) !== '') {
        const n = normalizeApiBadgeMode(SMS_API_BADGE_PREVIEW);
        if (n) return n;
    }
    try {
        const q = new URLSearchParams(window.location.search).get('api_badge');
        if (q != null && q !== '') {
            const n = normalizeApiBadgeMode(q);
            if (n) return n;
        }
    } catch (e) {
        /* ignore */
    }
    try {
        const s = sessionStorage.getItem(SMS_API_BADGE_SESSION_KEY);
        if (s) {
            const n = normalizeApiBadgeMode(s);
            if (n) return n;
            sessionStorage.removeItem(SMS_API_BADGE_SESSION_KEY);
        }
    } catch (e) {
        /* ignore */
    }
    return null;
}

/** GoatCounter custom path (event: true). Safe if count.js is still loading. */
function trackGoatEvent(path, title) {
    try {
        if (window.goatcounter && typeof window.goatcounter.count === 'function') {
            window.goatcounter.count({ path, title, event: true });
        }
    } catch (e) {
        /* ignore */
    }
}

function initPortfolioEngagementTracking() {
    initFunnelSectionViews();
    initScrollDepthMilestones();
    initTimeOnPageMilestones();
    initOutboundAndPdfTracking();
    initDemoExitLinksTracking();
}

function initFunnelSectionViews() {
    if (!document.body || !document.body.classList.contains('home-page')) return;

    const ids = ['about', 'experience', 'projects', 'papers', 'skills', 'contact'];
    const obs = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const id = entry.target.id;
                if (!id) return;
                obs.unobserve(entry.target);
                trackGoatEvent(`funnel/section/${id}`, `Section: ${id}`);
            });
        },
        { root: null, rootMargin: '0px 0px -12% 0px', threshold: 0 }
    );

    ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) obs.observe(el);
    });
}

function initScrollDepthMilestones() {
    const marks = [25, 50, 75, 100];
    const fired = new Set();

    function tick() {
        const el = document.documentElement;
        const maxScroll = el.scrollHeight - window.innerHeight;
        if (maxScroll <= 1) {
            if (!fired.has(100)) {
                fired.add(100);
                trackGoatEvent('funnel/scroll/100', 'Scroll depth 100% (short page)');
            }
            return;
        }
        const pct = Math.min(100, Math.round((window.scrollY / maxScroll) * 100));
        marks.forEach((m) => {
            if (pct >= m && !fired.has(m)) {
                fired.add(m);
                trackGoatEvent(`funnel/scroll/${m}`, `Scroll depth ${m}%`);
            }
        });
    }

    let raf = 0;
    window.addEventListener(
        'scroll',
        () => {
            if (raf) return;
            raf = requestAnimationFrame(() => {
                raf = 0;
                tick();
            });
        },
        { passive: true }
    );
    tick();
}

function initTimeOnPageMilestones() {
    const schedule = (seconds, path, title) =>
        window.setTimeout(() => {
            trackGoatEvent(path, title);
        }, seconds * 1000);

    schedule(30, 'funnel/time/30s', '30s on page');
    schedule(60, 'funnel/time/60s', '60s on page');
    schedule(120, 'funnel/time/120s', '2m on page');
}

function initOutboundAndPdfTracking() {
    document.addEventListener(
        'click',
        (e) => {
            const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
            if (!a) return;
            const href = a.getAttribute('href');
            if (!href || href.startsWith('#')) return;
            if (href.trim().toLowerCase().startsWith('javascript:')) return;

            if (href.startsWith('mailto:')) {
                trackGoatEvent('event/outbound/mailto', 'mailto link');
                return;
            }
            if (href.startsWith('tel:')) {
                trackGoatEvent('event/outbound/tel', 'tel link');
                return;
            }

            let u;
            try {
                u = new URL(a.href, window.location.href);
            } catch (err) {
                return;
            }

            if (u.origin === window.location.origin) {
                if (u.pathname.endsWith('.pdf')) {
                    if (u.pathname.includes('om-shah-resume.pdf')) return;
                    const slug = u.pathname.replace(/^\//, '').replace(/\//g, '--') || 'pdf';
                    trackGoatEvent(`event/pdf/${slug}`, `PDF ${u.pathname}`);
                }
                return;
            }

            const host = u.hostname.replace(/^www\./i, '') || 'external';
            trackGoatEvent(`event/outbound/${host}`, `Outbound ${host}`);
        },
        true
    );
}

function initDemoExitLinksTracking() {
    const path = window.location.pathname || '';
    if (!/project-demos\.html/i.test(path)) return;

    document.querySelectorAll('a[href*="index.html"]').forEach((a) => {
        a.addEventListener('click', () => {
            const raw = a.getAttribute('href') || '';
            let dest = 'home';
            const hashIdx = raw.indexOf('#');
            if (hashIdx !== -1 && hashIdx < raw.length - 1) {
                dest = raw.slice(hashIdx + 1).replace(/[^a-z0-9_-]/gi, '') || 'home';
            }
            trackGoatEvent(`funnel/demo/exit/${dest}`, `Demo exit toward ${dest}`);
        });
    });
}

function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Temporary dev toggle: fetch a file named `123` next to index.html.
 * Contents `0` = disable wheel stack; `1` (or anything other than `0`) = enable.
 * Missing file or fetch error = enable (matches previous behavior).
 */
async function projectsStackScrollEnabledByFlag() {
    try {
        const res = await fetch(new URL('123', window.location.href).toString(), { cache: 'no-store' });
        if (!res.ok) return true;
        const t = (await res.text()).trim();
        return t !== '0';
    } catch {
        return true;
    }
}

function releaseProjectsStackForStaticGrid() {
    const stackRoot = document.getElementById('projects-stack-root');
    const filter = document.getElementById('projects-filter');
    const grid = document.querySelector('.projects-grid--with-phone');
    stackRoot?.removeAttribute('hidden');
    filter?.classList.remove('projects-filter--stack-hidden');
    filter?.removeAttribute('aria-hidden');
    const pr = grid?.closest('.projects-phone-row');
    pr?.classList.remove('projects-grid--stack-pending');
    pr?.removeAttribute('aria-hidden');
}

async function maybeInitProjectsStackScroll() {
    const enabled = await projectsStackScrollEnabledByFlag();
    if (!enabled) {
        releaseProjectsStackForStaticGrid();
        return;
    }
    initProjectsStackScroll();
}

/**
 * Featured Projects: wheel-driven stack when the deck viewport straddles the screen midline (not #projects-stack-root — its min-height reserves grid space and is huge).
 * No tall scroll track — document height matches the normal section (reserved min-height).
 * Desktop (≥900px) only; prefers-reduced-motion skips. Logic is isolated to this module.
 */
function initProjectsStackScroll() {
    if (isNoJsCompatLayout()) return;

    const stackRoot = document.getElementById('projects-stack-root');
    const stackScrollHint = document.getElementById('projects-stack-scroll-hint');
    const section = document.getElementById('projects');
    const grid = document.querySelector('.projects-grid--with-phone');
    const filter = document.getElementById('projects-filter');

    const DESKTOP_MIN = '(min-width: 900px)';

    function releaseStackHidden() {
        releaseProjectsStackForStaticGrid();
    }

    if (prefersReducedMotion()) {
        releaseStackHidden();
        return;
    }

    if (!section || !grid || !filter || !stackRoot) {
        releaseStackHidden();
        return;
    }

    if (!window.matchMedia(DESKTOP_MIN).matches) {
        releaseStackHidden();
        return;
    }

    const cards = Array.from(
        grid.querySelectorAll('article.project-card:not(.project-card--soon)')
    );
    if (cards.length === 0) {
        releaseStackHidden();
        return;
    }

    function stripCloneIds(el) {
        el.removeAttribute('id');
        el.querySelectorAll('[id]').forEach((node) => {
            node.removeAttribute('id');
        });
    }

    /**
     * initScrollAnimations() runs before async stack init finishes and sets inline opacity/transform/transition
     * on grid cards; cloneNode(true) copies those. `.animate-in` uses transform !important and also breaks the peel.
     */
    function prepareStackCloneForDeck(el) {
        el.classList.remove('animate-in');
        el.style.removeProperty('opacity');
        el.style.removeProperty('transform');
        el.style.removeProperty('transition');
        el.style.removeProperty('transition-delay');
    }

    /** Left half = visual (data-stack-image, or placeholder); featured uses existing .project-image when a shot is set. */
    function ensureStackLeftVisual(clone) {
        const content = clone.querySelector('.project-content');
        if (!content) return;
        const shotSrc = clone.getAttribute('data-stack-image');
        const existingVisual = clone.querySelector('.project-image');

        if (existingVisual && shotSrc) {
            existingVisual.innerHTML = '';
            const img = document.createElement('img');
            img.className = 'project-stack-visual__shot';
            img.src = shotSrc;
            img.loading = 'lazy';
            img.decoding = 'async';
            const titleEl = clone.querySelector('.project-title');
            img.alt = titleEl ? titleEl.textContent.trim() : '';
            existingVisual.appendChild(img);
            existingVisual.setAttribute('aria-hidden', 'true');
            return;
        }

        if (existingVisual) return;

        const visual = document.createElement('div');
        visual.className = 'project-image project-stack-visual';
        visual.setAttribute('aria-hidden', 'true');
        if (shotSrc) {
            const img = document.createElement('img');
            img.className = 'project-stack-visual__shot';
            img.src = shotSrc;
            img.loading = 'lazy';
            img.decoding = 'async';
            const titleEl = clone.querySelector('.project-title');
            img.alt = titleEl ? titleEl.textContent.trim() : '';
            visual.appendChild(img);
        } else {
            const ph = document.createElement('div');
            ph.className = 'project-placeholder project-stack-visual__placeholder';
            const iconSrc = clone.querySelector('.project-header-matrix-icon');
            if (iconSrc) {
                ph.appendChild(iconSrc.cloneNode(true));
            }
            visual.appendChild(ph);
        }
        content.parentNode.insertBefore(visual, content);
    }

    /* Reserve the same vertical space as filter + grid so flow height does not change when swapping. */
    const phoneRow = grid.closest('.projects-phone-row');
    const filterMb = parseFloat(getComputedStyle(filter).marginBottom) || 0;
    const reservedContentHeight = filter.offsetHeight + (phoneRow ? phoneRow.offsetHeight : 0) + filterMb;

    try {
        const viewport = document.createElement('div');
        viewport.className = 'projects-stack-viewport';

        const deck = document.createElement('div');
        deck.className = 'projects-stack-deck';

        const n = cards.length;
        cards.forEach((cardEl, i) => {
            const clone = cardEl.cloneNode(true);
            stripCloneIds(clone);
            clone.classList.add('project-card--stack-clone');
            prepareStackCloneForDeck(clone);
            clone.dataset.stackIndex = String(i);
            clone.style.zIndex = String(100 + n - i);
            ensureStackLeftVisual(clone);
            deck.appendChild(clone);
        });

        viewport.appendChild(deck);
        /* Deck first, scroll hint stays last inside #projects-stack-root so the SVG sits flush under the cards. */
        stackRoot.prepend(viewport);
    } catch (e) {
        releaseStackHidden();
        return;
    }

    if (!stackRoot.querySelector('.projects-stack-viewport')) {
        releaseStackHidden();
        return;
    }

    const viewportEl = stackRoot.querySelector('.projects-stack-viewport');
    filter.classList.add('projects-filter--stack-hidden');
    filter.setAttribute('aria-hidden', 'true');
    if (phoneRow) {
        phoneRow.classList.add('projects-grid--stack-pending');
        phoneRow.setAttribute('aria-hidden', 'true');
    }
    section.classList.add('projects-section--stack-active');
    stackRoot.style.minHeight = `${Math.max(320, reservedContentHeight)}px`;
    stackRoot.removeAttribute('hidden');
    if (stackScrollHint) {
        stackScrollHint.removeAttribute('hidden');
        stackScrollHint.removeAttribute('aria-hidden');
    }

    /** One height for all stack cards (lift math); avoids featured vs non-featured offsetHeight drift. */
    let uniformStackCardHeight = 0;
    function refreshCardHeights() {
        const el = stackRoot.querySelector('.project-card--stack-clone');
        if (!el) {
            uniformStackCardHeight = 0;
            return;
        }
        const h = el.getBoundingClientRect().height;
        uniformStackCardHeight = h > 0 ? h : 0;
    }

    const n = cards.length;
    /* Wheel → progress (higher = less scroll per card). */
    const DELTA_TO_PROGRESS = 0.0032;
    /** ~Hz for exponential smoothing (frame-rate independent; lower = softer follow). */
    const SMOOTH_RATE = 11;

    let targetProgress = 0;
    let smoothProgress = 0;
    let lastRafTs = 0;
    let isStackActive = false;
    /** True after filter + grid replace the stack (user can revisit static layout). */
    let staticLayoutApplied = false;
    /** True after the last card is done; stack still visible until #projects leaves the viewport. */
    let stackInteractionComplete = false;
    let rafId = 0;
    let sectionExitObserver = null;

    let scrollLockActive = false;
    /** Set once when locking; never read from window.scrollY after lock (unreliable with fixed body). */
    let pinnedScrollY = 0;

    function readWindowScrollY() {
        return (
            window.pageYOffset ||
            document.documentElement.scrollTop ||
            document.body.scrollTop ||
            0
        );
    }

    const scrollPinOpts = { capture: true, passive: true };

    function onScrollPin() {
        if (!scrollLockActive) return;
        const cur = readWindowScrollY();
        if (Math.abs(cur - pinnedScrollY) > 2) {
            const prev = document.documentElement.style.scrollBehavior;
            document.documentElement.style.scrollBehavior = 'auto';
            window.scrollTo({ top: pinnedScrollY, left: 0, behavior: 'auto' });
            document.documentElement.style.scrollBehavior = prev;
        }
    }

    /**
     * True when the *deck viewport* (not #projects-stack-root) crosses the viewport midline.
     * Using “center ± tolerance” was easy to miss; straddling midline means: scroll until the deck
     * actually spans the middle of the screen — then wheel / arrow keys can drive the peel.
     */
    function isStackEngagementReady() {
        if (!stackRoot || stackRoot.classList.contains('projects-stack-root--hidden')) return false;
        const el = viewportEl;
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        if (r.height < 8) return false;
        if (r.bottom <= 0 || r.top >= vh) return false;
        const mid = vh * 0.5;
        return r.top < mid && r.bottom > mid;
    }

    /** WheelEvent.deltaY is not always pixels; line/page modes are common on Windows trackpads/mice. */
    function wheelDeltaYPixels(e) {
        const y = e.deltaY;
        if (e.deltaMode === 1) return y * 16;
        if (e.deltaMode === 2) return y * window.innerHeight;
        return y;
    }

    function lockBodyScroll() {
        if (scrollLockActive) return;
        pinnedScrollY = readWindowScrollY();
        scrollLockActive = true;
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        window.addEventListener('scroll', onScrollPin, scrollPinOpts);
    }

    /**
     * @returns {number|null} Saved Y to re-apply after layout, or null if nothing was locked.
     */
    function unlockBodyScroll() {
        if (!scrollLockActive) return null;
        const y = pinnedScrollY;
        scrollLockActive = false;
        pinnedScrollY = 0;
        window.removeEventListener('scroll', onScrollPin, scrollPinOpts);
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        const prev = document.documentElement.style.scrollBehavior;
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo({ top: y, left: 0, behavior: 'auto' });
        document.documentElement.style.scrollBehavior = prev;
        return y;
    }

    function restoreScrollAfterLayout(y) {
        if (typeof y !== 'number' || Number.isNaN(y)) return;
        const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const yClamped = Math.min(Math.max(0, y), maxY);
        const prev = document.documentElement.style.scrollBehavior;
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo({ top: yClamped, left: 0, behavior: 'auto' });
        document.documentElement.style.scrollBehavior = prev;
    }

    const wheelOpts = { capture: true, passive: false };
    const touchOpts = { capture: true, passive: false };
    const keyOpts = { capture: true, passive: false };

    function teardownWheelTouch() {
        window.removeEventListener('wheel', onWheel, wheelOpts);
        window.removeEventListener('touchmove', onTouchMove, touchOpts);
        window.removeEventListener('keydown', onStackKeyDown, keyOpts);
    }

    function teardownListeners() {
        teardownWheelTouch();
        stackRoot.removeEventListener('click', onStackDeckClickCapture, true);
        window.removeEventListener('resize', onResize);
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
    }

    function disconnectSectionExitObserver() {
        if (sectionExitObserver) {
            sectionExitObserver.disconnect();
            sectionExitObserver = null;
        }
    }

    /** Last card is done: release scroll, keep stack visible, watch for leaving #projects. */
    function onStackInteractionComplete() {
        if (stackInteractionComplete || staticLayoutApplied) return;
        stackInteractionComplete = true;
        targetProgress = n;
        smoothProgress = n;
        isStackActive = false;
        unlockBodyScroll();
        /* Keep wheel/touch until static grid swap so the user can reverse-scroll the stack. */
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
        applyStackTransforms(n);

        const papers = document.getElementById('papers');
        sectionExitObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.target !== section) return;
                    if (!entry.isIntersecting && stackInteractionComplete && !staticLayoutApplied) {
                        applyStaticProjectsLayout();
                    }
                });
            },
            { root: null, threshold: 0, rootMargin: '0px' }
        );
        sectionExitObserver.observe(section);
        /* If #projects is already off-screen (short viewport / layout), swap immediately. */
        requestAnimationFrame(() => {
            if (staticLayoutApplied) return;
            const r = section.getBoundingClientRect();
            const vh = window.innerHeight;
            const visible = r.bottom > 0 && r.top < vh;
            if (!visible && stackInteractionComplete && !staticLayoutApplied) {
                applyStaticProjectsLayout();
            }
        });
    }

    /**
     * Swap stack for filter + grid after the user has left the projects section.
     * Preserves viewport using #papers anchor so content below does not jump.
     */
    function applyStaticProjectsLayout() {
        if (staticLayoutApplied) return;
        disconnectSectionExitObserver();
        staticLayoutApplied = true;
        stackInteractionComplete = false;
        isStackActive = false;
        const savedScrollY = unlockBodyScroll();

        const papers = document.getElementById('papers');
        const anchorTopBefore = papers ? papers.getBoundingClientRect().top : null;

        teardownListeners();

        filter.classList.remove('projects-filter--stack-hidden');
        filter.removeAttribute('aria-hidden');
        if (phoneRow) {
            phoneRow.classList.remove('projects-grid--stack-pending');
            phoneRow.removeAttribute('aria-hidden');
        }
        stackRoot.style.minHeight = '';
        stackRoot.classList.add('projects-stack-root--hidden');
        stackRoot.setAttribute('aria-hidden', 'true');
        if (stackScrollHint) {
            stackScrollHint.setAttribute('hidden', '');
            stackScrollHint.setAttribute('aria-hidden', 'true');
        }
        section.classList.remove('projects-section--stack-active');
        section.classList.add('projects-section--stack-done');
        grid.querySelectorAll('article.project-card').forEach((card) => {
            card.classList.add('animate-in');
            card.style.opacity = '';
            card.style.transform = '';
        });
        window.dispatchEvent(new Event('resize'));
        requestAnimationFrame(() => {
            window.dispatchEvent(new Event('resize'));
            requestAnimationFrame(() => {
                if (papers && anchorTopBefore != null) {
                    const delta = papers.getBoundingClientRect().top - anchorTopBefore;
                    if (Math.abs(delta) > 0.5) {
                        const prev = document.documentElement.style.scrollBehavior;
                        document.documentElement.style.scrollBehavior = 'auto';
                        window.scrollBy({ top: delta, left: 0, behavior: 'auto' });
                        document.documentElement.style.scrollBehavior = prev;
                    }
                } else if (savedScrollY != null) {
                    restoreScrollAfterLayout(savedScrollY);
                    requestAnimationFrame(() => restoreScrollAfterLayout(savedScrollY));
                }
            });
        });
    }

    /** Narrow viewport / reduced path: show grid immediately (no deferred swap). */
    function revealProjectsContent() {
        if (staticLayoutApplied) return;
        disconnectSectionExitObserver();
        applyStaticProjectsLayout();
    }

    function easeInOutCubic(t) {
        const u = Math.max(0, Math.min(1, t));
        return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    }

    function applyStackTransforms(p) {
        if (staticLayoutApplied) return;
        const vh = window.innerHeight;
        const fp = Math.max(0, Math.min(n, p));

        /* Larger offset = clearer “strip” of each card behind (Framer-style stack). */
        const depthStep = 26;
        const scaleStep = 0.022;
        const minScale = 0.85;
        if (!uniformStackCardHeight) {
            refreshCardHeights();
        }
        const activeH = uniformStackCardHeight || vh * 0.36;
        const liftMax = Math.max(vh * 0.88, activeH * 1.1);

        stackRoot.querySelectorAll('.project-card--stack-clone').forEach((card, i) => {
            let transform;
            let interactive = false;

            /* Finished peeling (off top), except we never “toss” the last card. */
            if (i < n - 1 && fp >= i + 1) {
                transform = `translate3d(0, ${-liftMax}px, 0) scale(1)`;
            } else if (i === n - 1 && fp >= n) {
                /* Stack complete: last card rests in place. */
                transform = 'translate3d(0, 0, 0) scale(1)';
                interactive = true;
            } else if (fp >= i && fp < i + 1) {
                /* Active card: peel with eased lift (last card: no lift). */
                const t = fp - i;
                const isLastCard = i === n - 1;
                const lift = isLastCard ? 0 : easeInOutCubic(t) * liftMax;
                transform = `translate3d(0, ${-lift}px, 0) scale(1)`;
                interactive = true;
            } else if (fp < i) {
                /*
                 * Behind the front: continuous depth d = i − fp so Y and scale move smoothly
                 * as the top card peels (no step change when the index advances).
                 */
                const d = i - fp;
                const ty = depthStep * d;
                const sc = Math.max(minScale, 1 - scaleStep * d);
                transform = `translate3d(0, ${ty}px, 0) scale(${sc})`;
            } else {
                transform = 'translate3d(0, 0, 0) scale(1)';
                interactive = true;
            }

            card.style.transform = transform;
            card.classList.toggle('stack-clone--interactive', interactive);
            /*
             * Lower index = higher base z-index, so “gone” cards (0..i-1) still stacked above the
             * active card in hit-testing. Bump only the interactive card above all siblings so
             * links receive the click.
             */
            card.style.zIndex = interactive ? String(5000 + (n - i)) : String(100 + n - i);
        });

        if (!staticLayoutApplied && targetProgress >= n - 0.0001 && p >= n - 0.02) {
            onStackInteractionComplete();
        }
    }

    function rafLoop(ts) {
        if (staticLayoutApplied) {
            rafId = 0;
            lastRafTs = 0;
            return;
        }
        const now = typeof ts === 'number' ? ts : performance.now();
        const dt = lastRafTs ? Math.min(0.064, (now - lastRafTs) / 1000) : 1 / 60;
        lastRafTs = now;
        const lerpT = 1 - Math.exp(-SMOOTH_RATE * dt);
        smoothProgress += (targetProgress - smoothProgress) * lerpT;
        applyStackTransforms(smoothProgress);
        const diff = Math.abs(targetProgress - smoothProgress);
        /* Stop when idle; avoid spinning forever at fp === n. */
        const stillAnimating =
            diff > 1e-4 || (targetProgress > 0 && targetProgress < n - 1e-6);
        if (stillAnimating) {
            rafId = requestAnimationFrame(rafLoop);
        } else {
            rafId = 0;
            lastRafTs = 0;
        }
    }

    function ensureRaf() {
        if (!rafId && !staticLayoutApplied) {
            rafId = requestAnimationFrame(rafLoop);
        }
    }

    /**
     * Drives stack progress (same path as wheel). `evt` is omitted for programmatic calls.
     * The visible “animation” is applyStackTransforms() updating transform on .project-card--stack-clone.
     */
    function handleStackScrollDelta(dyPx, evt) {
        if (staticLayoutApplied) return;

        const block = () => {
            if (evt && typeof evt.preventDefault === 'function') {
                evt.preventDefault();
                if (typeof evt.stopImmediatePropagation === 'function') evt.stopImmediatePropagation();
            }
        };

        /*
         * Finished stack but static grid not shown yet: wheel up in the engagement zone
         * pulls progress back so earlier cards can be re-read.
         */
        if (!isStackActive && stackInteractionComplete && isStackEngagementReady() && dyPx < 0) {
            block();
            stackInteractionComplete = false;
            isStackActive = true;
            lockBodyScroll();
            targetProgress = Math.max(0, n + dyPx * DELTA_TO_PROGRESS);
            ensureRaf();
            return;
        }

        if (!isStackEngagementReady() && !isStackActive) return;

        /* At end of stack: wheel down should scroll the page, not re-lock the deck. */
        if (!isStackActive && stackInteractionComplete && dyPx > 0) {
            return;
        }

        if (isStackActive) {
            block();
            targetProgress = Math.max(0, Math.min(n, targetProgress + dyPx * DELTA_TO_PROGRESS));
            if (targetProgress < n - 1e-6) {
                stackInteractionComplete = false;
            }
            if (targetProgress <= 0 && dyPx < 0) {
                isStackActive = false;
                unlockBodyScroll();
            }
            ensureRaf();
            return;
        }

        /* Engagement zone + not yet locked: wheel down starts the stack (capture before inner overflow scroll). */
        if (dyPx > 0) {
            block();
            isStackActive = true;
            lockBodyScroll();
            targetProgress = Math.max(0, Math.min(n, targetProgress + dyPx * DELTA_TO_PROGRESS));
            ensureRaf();
        }
    }

    function onWheel(e) {
        handleStackScrollDelta(wheelDeltaYPixels(e), e);
    }

    function onStackKeyDown(e) {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const t = e.target;
        if (t && t.closest && t.closest('input, textarea, select, [contenteditable="true"]')) return;
        const dyPx = e.key === 'ArrowDown' ? 120 : -120;
        handleStackScrollDelta(dyPx, e);
    }

    function onTouchMove(e) {
        if (!isStackActive || staticLayoutApplied) return;
        e.preventDefault();
    }

    /** Capture phase: ensures navigation even if overlapping siblings steal hit tests. */
    function onStackDeckClickCapture(e) {
        if (staticLayoutApplied) return;
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        const a = e.target.closest && e.target.closest('a[href]');
        if (!a || !stackRoot.contains(a)) return;
        if (a.hasAttribute('download')) return;
        const card = a.closest('.project-card--stack-clone');
        if (!card || !card.classList.contains('stack-clone--interactive')) return;
        const href = a.getAttribute('href');
        if (!href || href === '#') return;
        if (/^(mailto:|tel:)/i.test(href)) return;
        if (href.startsWith('#') && href.length > 1) {
            const target = document.querySelector(href);
            if (!target) return;
            e.preventDefault();
            const navbar = document.querySelector('.navbar');
            const navbarHeight = navbar ? navbar.offsetHeight : 0;
            const targetPosition =
                target.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
            window.scrollTo({
                top: targetPosition,
                behavior: prefersReducedMotion() ? 'auto' : 'smooth',
            });
            return;
        }
        if (a.target === '_blank') {
            e.preventDefault();
            window.open(a.href, '_blank', 'noopener,noreferrer');
            return;
        }
        e.preventDefault();
        window.location.assign(a.href);
    }

    function onResize() {
        if (!window.matchMedia(DESKTOP_MIN).matches && !staticLayoutApplied) {
            if (isStackActive) {
                isStackActive = false;
                unlockBodyScroll();
            }
            disconnectSectionExitObserver();
            teardownListeners();
            stackRoot.style.minHeight = '';
            revealProjectsContent();
            return;
        }
        refreshCardHeights();
        if (staticLayoutApplied) return;
        if (stackInteractionComplete) {
            applyStackTransforms(n);
        } else {
            applyStackTransforms(smoothProgress);
        }
    }

    stackRoot.addEventListener('click', onStackDeckClickCapture, true);
    window.addEventListener('wheel', onWheel, wheelOpts);
    window.addEventListener('touchmove', onTouchMove, touchOpts);
    window.addEventListener('keydown', onStackKeyDown, keyOpts);
    window.addEventListener('resize', onResize);

    refreshCardHeights();
    requestAnimationFrame(() => {
        refreshCardHeights();
        smoothProgress = 0;
        targetProgress = 0;
        applyStackTransforms(0);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initCursorGlow();
    initMobileMenu();
    initSmoothScroll();
    void maybeInitProjectsStackScroll();
    initScrollAnimations();
    initNavbarScroll();
    initTerminalTyping();
    initStaggerDelays();
    initDemoCtaAnalytics();
    initSmsApiStatusBadge();
    initPapersCarouselWhenReady();
    initScrollIndicatorInterior();
    initProjectsFilter();
    initExperienceTabs();
    initPortfolioEngagementTracking();
});

/** Pill draw curve (same breakpoints as former scroll-loop-pill keyframes); duration = CYCLE_MS. */
function pillStrokeDashOffsetAtCycleT(t) {
    const p = t * 100;
    if (p <= 0) return 1;
    if (p <= 17.5) return 1 + (0.75 - 1) * (p / 17.5);
    if (p <= 32.5) return 0.75 + (0.25 - 0.75) * ((p - 17.5) / (32.5 - 17.5));
    if (p <= 50) return 0.25 + (0 - 0.25) * ((p - 32.5) / (50 - 32.5));
    if (p <= 92) return 0;
    return 0 + (1 - 0) * ((p - 92) / (100 - 92));
}

function pillVisibleFractionAtCycleT(t) {
    return 1 - pillStrokeDashOffsetAtCycleT(t);
}

/** Smallest t in [0, 0.5] where the pill stroke has reached distance `junctionFraction` along the path (0–1). */
function findSquiggleStartT(junctionFraction) {
    const target = Math.min(1, Math.max(0, junctionFraction));
    if (pillVisibleFractionAtCycleT(0) >= target) return 0;
    let lo = 0;
    let hi = 0.5;
    for (let i = 0; i < 48; i++) {
        const mid = (lo + hi) / 2;
        if (pillVisibleFractionAtCycleT(mid) >= target) hi = mid;
        else lo = mid;
    }
    return hi;
}

/**
 * Split pill: visible length v * (Lp+Ls) fills prefix first, then suffix (fork at end of prefix).
 * Same mapping works when v decreases (erase): suffix empties before prefix.
 */
function applySplitPillGrow(prefixEl, suffixEl, Lp, Ls, v) {
    const total = Lp + Ls;
    const vis = Math.max(0, Math.min(1, v)) * total;
    if (vis <= 0) {
        prefixEl.style.strokeDasharray = `${Lp}px`;
        prefixEl.style.strokeDashoffset = `${Lp}px`;
        suffixEl.style.strokeDasharray = `${Ls}px`;
        suffixEl.style.strokeDashoffset = `${Ls}px`;
        return;
    }
    if (vis <= Lp) {
        prefixEl.style.strokeDasharray = `${Lp}px`;
        prefixEl.style.strokeDashoffset = `${Lp - vis}px`;
        suffixEl.style.strokeDasharray = `${Ls}px`;
        suffixEl.style.strokeDashoffset = `${Ls}px`;
    } else {
        prefixEl.style.strokeDasharray = `${Lp}px`;
        prefixEl.style.strokeDashoffset = '0px';
        suffixEl.style.strokeDasharray = `${Ls}px`;
        suffixEl.style.strokeDashoffset = `${Ls - (vis - Lp)}px`;
    }
}

const SCROLL_INTERIOR_SQUIGGLE_D =
    'M 90 8 Q 82 22.5 90 34 C 95.33 41.67 90 53 90 58';

function measureSvgPathLength(d) {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d);
    return typeof p.getTotalLength === 'function' ? p.getTotalLength() : 0;
}

/** One interior path (squiggle + arrow) so stroke + drop-shadow are not doubled at the fork. Drives every `.scroll-indicator`. */
function initScrollIndicatorInterior() {
    if (isNoJsCompatLayout()) return;

    const sets = Array.from(document.querySelectorAll('.scroll-indicator'))
        .map((root) => ({
            pathInt: root.querySelector('.scroll-line--scroll-interior'),
            pillPrefix: root.querySelector('.scroll-line--pill-prefix'),
            pillSuffix: root.querySelector('.scroll-line--pill-suffix'),
        }))
        .filter(
            (s) =>
                s.pathInt &&
                s.pillPrefix &&
                s.pillSuffix &&
                typeof s.pathInt.getTotalLength === 'function' &&
                typeof s.pillPrefix.getTotalLength === 'function' &&
                typeof s.pillSuffix.getTotalLength === 'function'
        );

    if (sets.length === 0) return;

    const { pathInt, pillPrefix, pillSuffix } = sets[0];
    const Lt = pathInt.getTotalLength();
    const Lq = measureSvgPathLength(SCROLL_INTERIOR_SQUIGGLE_D);
    const Ls = Math.max(0, Lt - Lq);
    const Lp = pillPrefix.getTotalLength();
    const Lsuf = pillSuffix.getTotalLength();

    if (prefersReducedMotion()) {
        sets.forEach((s) => {
            s.pathInt.style.strokeDasharray = 'none';
            s.pathInt.style.strokeDashoffset = '0';
            s.pillPrefix.style.strokeDasharray = 'none';
            s.pillPrefix.style.strokeDashoffset = '0';
            s.pillSuffix.style.strokeDasharray = 'none';
            s.pillSuffix.style.strokeDashoffset = '0';
        });
        return;
    }

    const CYCLE_MS = 4000;
    const pillTotal = Lp + Lsuf;
    const junctionFraction = pillTotal > 0 ? Lp / pillTotal : 0.45;
    const tJ = findSquiggleStartT(junctionFraction);

    /* Relative phase weights (sum 0.75); scaled into [tJ, 1] so interior fits after pill reaches the top */
    const W_SQUIGGLE = 0.27;
    const W_MORPH = 0.1;
    const W_HIDE = 0.12;
    const W_BOUNCE = 0.19;
    const W_WIPE = 0.07;
    const sumW = W_SQUIGGLE + W_MORPH + W_HIDE + W_BOUNCE + W_WIPE;
    const span = 1 - tJ;
    const acc = tJ;
    const squiggleEnd = acc + (W_SQUIGGLE / sumW) * span;
    const morphEnd = acc + ((W_SQUIGGLE + W_MORPH) / sumW) * span;
    const hideEnd = acc + ((W_SQUIGGLE + W_MORPH + W_HIDE) / sumW) * span;
    const bounceEnd = acc + ((W_SQUIGGLE + W_MORPH + W_HIDE + W_BOUNCE) / sumW) * span;

    function applyHidden(el, len) {
        el.style.strokeDasharray = `${len}px`;
        el.style.strokeDashoffset = `${len}px`;
    }

    function applyGrow(el, len, visibleLen) {
        el.style.strokeDasharray = `${len}px`;
        el.style.strokeDashoffset = `${len - visibleLen}px`;
    }

    function applySegment(el, len, a, b) {
        /* ~stroke-width in user units; tiny dashes read as a glowing dot under filters */
        if (b - a < 2.5) {
            applyHidden(el, len);
            return;
        }
        const tail = Math.max(0.001, len - b);
        el.style.strokeDasharray = `0px ${a}px ${b - a}px ${tail}px`;
        el.style.strokeDashoffset = '0px';
    }

    function tick() {
        const now = document.timeline ? document.timeline.currentTime : performance.now();
        const t = (now % CYCLE_MS) / CYCLE_MS;

        const pillVisible = pillVisibleFractionAtCycleT(t);
        /* Only gate during the pill draw segment (keyframes 0–50%); after that the outline is full until erase. */
        const pillStillDrawing = t < 0.5;
        const pillReady = pillVisible >= junctionFraction - 0.008;
        const waitForPill = t < tJ || (pillStillDrawing && !pillReady);

        sets.forEach(({ pathInt: pi, pillPrefix: pp, pillSuffix: ps }) => {
            applySplitPillGrow(pp, ps, Lp, Lsuf, pillVisible);
            if (waitForPill) {
                applyHidden(pi, Lt);
            } else if (t < squiggleEnd) {
                const p = (t - tJ) / (squiggleEnd - tJ);
                applyGrow(pi, Lt, p * Lq);
            } else if (t < morphEnd) {
                const u = (t - squiggleEnd) / (morphEnd - squiggleEnd);
                applyGrow(pi, Lt, Lq + u * Ls);
            } else if (t < hideEnd) {
                const u = (t - morphEnd) / (hideEnd - morphEnd);
                const a = u * Lq;
                applySegment(pi, Lt, a, Lt);
            } else if (t < bounceEnd) {
                applySegment(pi, Lt, Lq, Lt);
            } else {
                const p = (t - bounceEnd) / (1 - bounceEnd);
                const end = Ls - p * Ls;
                applySegment(pi, Lt, Lq, Lq + end);
            }
        });
        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
}

function initProjectsFilter() {
    const root = document.getElementById('projects-filter');
    const grid = document.querySelector('.projects-grid--with-phone');
    const phoneRow = document.querySelector('#projects .projects-phone-row');
    if (!root || !grid) return;

    const cards = grid.querySelectorAll('.project-card[data-project-tags]');
    const buttons = root.querySelectorAll('.projects-filter-btn[data-project-filter]');
    if (!cards.length || !buttons.length) return;

    function parseTags(el) {
        return (el.getAttribute('data-project-tags') || '')
            .trim()
            .split(/\s+/)
            .filter(Boolean);
    }

    function isPhoneShowcaseSlot(card) {
        return card.classList.contains('project-phone-showcase-slot');
    }

    function countVisibleForFilter(filterKey) {
        let n = 0;
        cards.forEach((card) => {
            if (isPhoneShowcaseSlot(card)) return;
            const tags = parseTags(card);
            if (filterKey === 'all' || tags.includes(filterKey)) n += 1;
        });
        return n;
    }

    function syncCounts() {
        buttons.forEach((btn) => {
            const key = btn.getAttribute('data-project-filter');
            const sup = btn.querySelector('.projects-filter-count');
            if (!sup || !key) return;
            sup.textContent = String(countVisibleForFilter(key));
        });
    }

    function applyFilter(filterKey) {
        cards.forEach((card) => {
            /* Decorative 3D phone: only with All or ML (SMS demo); hide for Security / Automation. */
            if (isPhoneShowcaseSlot(card)) {
                const showPhone = filterKey === 'all' || filterKey === 'ml';
                card.classList.toggle('project-card--filter-hidden', !showPhone);
                card.setAttribute('aria-hidden', showPhone ? 'false' : 'true');
                if (showPhone) card.classList.add('animate-in');
                return;
            }
            const tags = parseTags(card);
            const show = filterKey === 'all' || tags.includes(filterKey);
            card.classList.toggle('project-card--filter-hidden', !show);
            card.setAttribute('aria-hidden', show ? 'false' : 'true');
            if (show) card.classList.add('animate-in');
        });
        buttons.forEach((btn) => {
            const key = btn.getAttribute('data-project-filter');
            const active = key === filterKey;
            btn.classList.toggle('is-active', active);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });

        phoneRow?.classList.toggle('projects-phone-row--filter-ml', filterKey === 'ml');
        /* Featured Sentinel: full-width hero only on “All”; single cell like peers when a filter is active. */
        grid.classList.toggle('projects-grid--compact-featured', filterKey !== 'all');
    }

    buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const key = btn.getAttribute('data-project-filter');
            if (!key) return;
            if (key !== 'all') {
                trackGoatEvent(`event/projects-filter/${key}`, `Projects filter: ${key}`);
            }
            applyFilter(key);
        });
    });

    syncCounts();
    applyFilter('all');
}

function initExperienceTabs() {
    const root = document.querySelector('.experience-layout');
    if (!root) return;
    const tabs = Array.from(root.querySelectorAll('.experience-tab'));
    const panels = Array.from(root.querySelectorAll('.experience-panel'));
    if (!tabs.length || tabs.length !== panels.length) return;

    function activate(index) {
        tabs.forEach((tab, i) => {
            const on = i === index;
            tab.classList.toggle('is-active', on);
            tab.setAttribute('aria-selected', on ? 'true' : 'false');
            tab.setAttribute('tabindex', on ? '0' : '-1');
            panels[i].hidden = !on;
            panels[i].classList.toggle('is-active', on);
        });
    }

    tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => activate(i));
        tab.addEventListener('keydown', (e) => {
            let next = null;
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                next = Math.min(i + 1, tabs.length - 1);
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                next = Math.max(i - 1, 0);
            }
            if (next !== null && next !== i) {
                e.preventDefault();
                activate(next);
                tabs[next].focus();
            }
        });
    });
}

/** Must match `zoom` on `html` in styles.css when present; mouse coords stay viewport-based while fixed layout is zoom-scaled. */
function getRootZoomFactor() {
    const z = parseFloat(getComputedStyle(document.documentElement).zoom);
    if (Number.isFinite(z) && z > 0) return z;
    return 1;
}

function initCursorGlow() {
    const cursorGlow = document.querySelector('.cursor-glow');
    if (!cursorGlow) return;

    if (prefersReducedMotion()) {
        cursorGlow.style.display = 'none';
        return;
    }

    if (window.matchMedia('(pointer: fine)').matches) {
        document.addEventListener('mousemove', (e) => {
            const z = getRootZoomFactor();
            cursorGlow.style.left = e.clientX / z + 'px';
            cursorGlow.style.top = e.clientY / z + 'px';
        });

        document.addEventListener('mouseenter', () => {
            cursorGlow.style.opacity = '1';
        });

        document.addEventListener('mouseleave', () => {
            cursorGlow.style.opacity = '0';
        });
    } else {
        cursorGlow.style.display = 'none';
    }
}

function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    if (!menuBtn || !navLinks) return;

    const setOpen = (open) => {
        navLinks.classList.toggle('active', open);
        menuBtn.classList.toggle('active', open);
        menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    menuBtn.addEventListener('click', () => {
        setOpen(!navLinks.classList.contains('active'));
    });

    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            setOpen(false);
        });
    });
}

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href.length < 2) return;
            const target = document.querySelector(href);
            if (!target) return;
            e.preventDefault();
            const navbar = document.querySelector('.navbar');
            const navbarHeight = navbar ? navbar.offsetHeight : 0;
            const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
            window.scrollTo({
                top: targetPosition,
                behavior: prefersReducedMotion() ? 'auto' : 'smooth'
            });
        });
    });
}

function initScrollAnimations() {
    const animateElements = document.querySelectorAll(
        '.skill-category, .project-card:not(.project-phone-showcase-slot):not(.project-card--stack-clone), .cert-cell, .papers-carousel-outer, .certifications, .about-content, .contact-content, .experience-tab'
    );

    if (prefersReducedMotion()) {
        animateElements.forEach(el => el.classList.add('animate-in'));
        return;
    }

    const observerOptions = {
        threshold: 0.08,
        /* Positive bottom margin expands the root so elements intersect sooner while scrolling. */
        rootMargin: '0px 0px 14% 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    animateElements.forEach(el => {
        const soonCard = el.classList.contains('project-card--soon');
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = soonCard
            ? 'opacity 0.32s ease, transform 0.32s ease'
            : 'opacity 0.48s ease, transform 0.48s ease';
        observer.observe(el);
    });
}

function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');
    const hero = document.querySelector('#home');

    const update = () => {
        if (!navbar) return;

        const currentScroll = window.pageYOffset;

        navbar.style.boxShadow = currentScroll > 100
            ? '0 4px 20px rgba(0, 0, 0, 0.3)'
            : 'none';

        if (!hero) {
            document.body.classList.add('nav-past-hero');
        } else {
            const pastHero = hero.getBoundingClientRect().bottom <= 72;
            document.body.classList.toggle('nav-past-hero', pastHero);
        }

        /* Viewport-based: offsetTop + pageYOffset drift with html { zoom } in some browsers. */
        const activatorY = navbar.offsetHeight + 88;
        let current = '';
        sections.forEach(section => {
            const id = section.getAttribute('id');
            if (!id) return;
            if (section.getBoundingClientRect().top <= activatorY) {
                current = id;
            }
        });

        const doc = document.documentElement;
        const scrollBottom = currentScroll + window.innerHeight;
        if (sections.length && scrollBottom >= doc.scrollHeight - 3) {
            const last = sections[sections.length - 1];
            const lastId = last && last.getAttribute('id');
            if (lastId) current = lastId;
        }

        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href') || '';
            if (href.startsWith('#') && href === `#${current}`) {
                link.classList.add('active');
            }
        });
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
}

function initTerminalTyping() {
    if (isNoJsCompatLayout()) return;

    const typingElement = document.querySelector('.terminal-command-animated');
    if (!typingElement) return;
    if (prefersReducedMotion()) {
        typingElement.textContent = 'pytest tests/test_pipeline.py';
        return;
    }

    const commands = [
        'pytest tests/test_pipeline.py',
        'python3 merge_case_docs.py',
        'nmap -sV --script=vuln 10.0.0.0/24',
        'git commit -m "feat: ocr quality checks"',
        'cat outputs/metrics_dl.csv'
    ];

    let commandIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let isPaused = false;

    function typeCommand() {
        const currentCommand = commands[commandIndex];

        if (isPaused) {
            setTimeout(typeCommand, 2000);
            isPaused = false;
            isDeleting = true;
            return;
        }

        if (!isDeleting) {
            typingElement.textContent = currentCommand.substring(0, charIndex + 1);
            charIndex++;

            if (charIndex === currentCommand.length) {
                isPaused = true;
            }
        } else {
            typingElement.textContent = currentCommand.substring(0, charIndex - 1);
            charIndex--;

            if (charIndex === 0) {
                isDeleting = false;
                commandIndex = (commandIndex + 1) % commands.length;
            }
        }

        const typingSpeed = isDeleting ? 50 : 100;
        setTimeout(typeCommand, typingSpeed);
    }

    setTimeout(typeCommand, 2000);
}

function initPapersCarouselWhenReady() {
    const viewport = document.getElementById('papers-carousel-viewport');
    if (!viewport) return;

    const start = () => initPapersCarousel(viewport);

    if (document.readyState === 'complete') {
        requestAnimationFrame(() => requestAnimationFrame(start));
    } else {
        window.addEventListener('load', () => {
            requestAnimationFrame(() => requestAnimationFrame(start));
        });
    }
}

function initPapersCarousel(viewport) {
    if (!viewport) return;
    if (viewport.dataset.carouselBound === '1') return;

    const track = document.getElementById('papers-track');
    if (!track || track.children.length === 0) return;

    viewport.dataset.carouselBound = '1';

    const originalsSnapshot = Array.from(track.children);
    const originalCount = originalsSnapshot.length;

    originalsSnapshot.forEach((node) => {
        const clone = node.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.appendChild(clone);
    });

    /** Distance from track start to duplicate of first card (one full set: LAWS … Ethics, then LAWS again). */
    function getLoopWidth() {
        const firstDup = track.children[originalCount];
        if (!firstDup) return 0;

        const tRect = track.getBoundingClientRect();
        const dRect = firstDup.getBoundingClientRect();
        let w = dRect.left - tRect.left;

        if (w < 2) {
            w = 0;
            for (let i = 0; i < originalCount; i++) {
                w += track.children[i].getBoundingClientRect().width;
            }
            const c0 = track.children[0];
            const c1 = track.children[1];
            if (c0 && c1) {
                const gap = c1.offsetLeft - c0.offsetLeft - c0.offsetWidth;
                if (gap >= 0 && Number.isFinite(gap)) {
                    w += gap * originalCount;
                }
            }
        }
        return Math.max(0, Math.round(w * 100) / 100);
    }

    function wrapScrollPosition() {
        const lw = getLoopWidth();
        if (lw < 2) return;
        let sl = viewport.scrollLeft;
        let changed = false;
        while (sl >= lw) {
            sl -= lw;
            changed = true;
        }
        while (sl < 0) {
            sl += lw;
            changed = true;
        }
        if (changed) {
            viewport.scrollLeft = sl;
        }
    }

    viewport.style.scrollBehavior = 'auto';
    viewport.style.overflowX = 'scroll';

    const reduced = prefersReducedMotion();
    const pxPerTick = reduced ? 0.35 : 1.1;
    const tickMs = reduced ? 48 : 24;

    let paused = false;
    let resumeTimer;

    function step() {
        if (document.hidden || paused) return;
        const lw = getLoopWidth();
        if (lw < 2) return;
        let next = viewport.scrollLeft + pxPerTick;
        if (next >= lw) {
            next -= lw;
        }
        viewport.scrollLeft = next;
    }

    window.setInterval(step, tickMs);

    viewport.addEventListener('scroll', wrapScrollPosition, { passive: true });

    viewport.addEventListener('mouseenter', () => {
        paused = true;
    });
    viewport.addEventListener('mouseleave', () => {
        paused = false;
    });

    viewport.addEventListener(
        'touchstart',
        () => {
            paused = true;
            clearTimeout(resumeTimer);
        },
        { passive: true }
    );
    viewport.addEventListener(
        'touchend',
        () => {
            resumeTimer = setTimeout(() => {
                paused = false;
            }, 2800);
        },
        { passive: true }
    );

    viewport.addEventListener(
        'wheel',
        (e) => {
            if (Math.abs(e.deltaX) < 1 && Math.abs(e.deltaY) < 1) return;
            paused = true;
            clearTimeout(resumeTimer);
            resumeTimer = setTimeout(() => {
                paused = false;
            }, 2200);
        },
        { passive: true }
    );

    viewport.addEventListener('keydown', (e) => {
        const stepPx = Math.min(280, viewport.clientWidth * 0.88);
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            viewport.scrollLeft -= stepPx;
            wrapScrollPosition();
            paused = true;
            clearTimeout(resumeTimer);
            resumeTimer = setTimeout(() => {
                paused = false;
            }, 3500);
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            viewport.scrollLeft += stepPx;
            wrapScrollPosition();
            paused = true;
            clearTimeout(resumeTimer);
            resumeTimer = setTimeout(() => {
                paused = false;
            }, 3500);
        }
    });

    window.addEventListener(
        'resize',
        () => {
            const maxScroll = viewport.scrollWidth - viewport.clientWidth;
            viewport.scrollLeft = Math.min(viewport.scrollLeft, Math.max(0, maxScroll));
            wrapScrollPosition();
        },
        { passive: true }
    );

    const ro = new ResizeObserver(() => {
        wrapScrollPosition();
    });
    ro.observe(track);
    ro.observe(viewport);

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
            wrapScrollPosition();
        });
    }

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            wrapScrollPosition();
        });
    });
}

/** Uses shared allowlist from spam-api-base.js (must load before this file on pages that include it). */
function getSpamApiBase() {
    return typeof getSpamClassifierApiBase === 'function'
        ? getSpamClassifierApiBase()
        : 'https://omsshah-spam-classifier-api.hf.space';
}

function setSmsApiStatusBadge(el, state, label, title) {
    el.textContent = label;
    el.className = `project-scope project-scope--live project-scope--live--${state}`;
    if (title) el.setAttribute('title', title);
}

function applyApiBadgeSimulationIfAny(el) {
    const sim = getApiBadgeSimulationMode();
    if (!sim) return false;

    const fromCode =
        SMS_API_BADGE_PREVIEW != null && String(SMS_API_BADGE_PREVIEW) !== '';
    const hint = fromCode
        ? 'Preview only: set SMS_API_BADGE_PREVIEW to null at the top of script.js'
        : 'Preview only: open ?api_badge=off or clear sessionStorage key smsApiBadgePreview';

    if (sim === 'down') {
        setSmsApiStatusBadge(el, 'offline', 'API status: down', `${hint}. Unreachable API (same styling as a real failure).`);
        return true;
    }
    if (sim === 'checking') {
        setSmsApiStatusBadge(el, 'pending', 'API status: checking', `${hint}.`);
        return true;
    }
    if (sim === 'live') {
        setSmsApiStatusBadge(el, 'ok', 'API status: live', `${hint}.`);
        return true;
    }
    if (sim === 'warmup') {
        setSmsApiStatusBadge(el, 'warn', 'API status: checking', `${hint}. Host up, model not ready.`);
        return true;
    }
    return false;
}

function refreshSmsApiStatusBadge() {
    const el = document.getElementById('sms-api-status-badge');
    if (!el) return;

    if (applyApiBadgeSimulationIfAny(el)) return;

    const base = getSpamApiBase();
    fetch(`${base}/health`, { method: 'GET' })
        .then((r) => {
            if (!r.ok) throw new Error(String(r.status));
            return r.json();
        })
        .then((j) => {
            if (j && j.ok && j.model_loaded) {
                setSmsApiStatusBadge(
                    el,
                    'ok',
                    'API status: live',
                    'Inference API responded healthy.'
                );
            } else {
                setSmsApiStatusBadge(
                    el,
                    'warn',
                    'API status: checking',
                    'Host is up but the model may still be loading on Hugging Face Spaces. The demo page will retry.'
                );
            }
        })
        .catch(() => {
            const fileHint =
                window.location.protocol === 'file:'
                    ? ' Open the site over https:// for a real check; file:// often blocks cross-origin requests.'
                    : '';
            setSmsApiStatusBadge(
                el,
                'offline',
                'API status: down',
                `Could not reach the inference API from your browser. The demo page still works with a keyword fallback.${fileHint}`
            );
        });
}

function initSmsApiStatusBadge() {
    const el = document.getElementById('sms-api-status-badge');
    if (!el) return;

    syncApiBadgePreviewFromUrl();
    refreshSmsApiStatusBadge();
    if (getApiBadgeSimulationMode() != null) return;

    window.setInterval(refreshSmsApiStatusBadge, 120000);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') refreshSmsApiStatusBadge();
    });
}

function initDemoCtaAnalytics() {
    const path = window.location.pathname || '';
    if (path.endsWith('project-demos.html')) return;

    document.querySelectorAll('a[href="project-demos.html"]').forEach((link) => {
        link.addEventListener('click', () => {
            trackGoatEvent('cta/open-live-demo', 'Open live demo (from portfolio)');
        });
    });
}

function initStaggerDelays() {
    if (prefersReducedMotion()) return;

    document.querySelectorAll('.project-card:not(.project-phone-showcase-slot):not(.project-card--stack-clone)').forEach((card, index) => {
        card.style.transitionDelay = `${index * 0.1}s`;
    });

    document.querySelectorAll('.cert-card').forEach((card, index) => {
        card.style.transitionDelay = `${index * 0.1}s`;
    });

    document.querySelectorAll('.skill-category').forEach((card, index) => {
        card.style.transitionDelay = `${index * 0.1}s`;
    });

    document.querySelectorAll('a[href*="om-shah-resume.pdf"]').forEach(link => {
        link.addEventListener('click', () => {
            trackGoatEvent('resume-download', 'Resume (PDF)');
        });
    });
}
