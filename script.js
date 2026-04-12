/**
 * Preview the SMS API status chip without calling /health. Normally keep `null`.
 * Or open `?api_badge=down` once; it is saved for this tab (sessionStorage) so plain reloads keep the preview.
 * Clear with `?api_badge=off` or `sessionStorage.removeItem('smsApiBadgePreview')` in DevTools.
 */
const SMS_API_BADGE_PREVIEW = null;

const SMS_API_BADGE_SESSION_KEY = 'smsApiBadgePreview';

const SMS_API_BADGE_VALID = new Set(['down', 'checking', 'live', 'warmup']);

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

document.addEventListener('DOMContentLoaded', () => {
    initCursorGlow();
    initMobileMenu();
    initSmoothScroll();
    initScrollAnimations();
    initNavbarScroll();
    initTerminalTyping();
    initStaggerDelays();
    initDemoCtaAnalytics();
    initSmsApiStatusBadge();
    initPapersCarouselWhenReady();
    initScrollIndicatorInterior();
    initProjectsFilter();
    initPortfolioEngagementTracking();
});

function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

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

/** Squiggle + stem are separate paths so only the stem bounces (avoids pill-top dash/glow artefact). */
function initScrollIndicatorInterior() {
    const pathSq = document.querySelector('.scroll-line--squiggle');
    const pathStem = document.querySelector('.scroll-line--stem');
    const pillPrefix = document.querySelector('.scroll-line--pill-prefix');
    const pillSuffix = document.querySelector('.scroll-line--pill-suffix');
    const bounceGroup = document.querySelector('#scroll-arrow-bounce');
    if (
        !pathSq ||
        !pathStem ||
        !pillPrefix ||
        !pillSuffix ||
        typeof pathSq.getTotalLength !== 'function' ||
        typeof pathStem.getTotalLength !== 'function' ||
        typeof pillPrefix.getTotalLength !== 'function' ||
        typeof pillSuffix.getTotalLength !== 'function'
    ) {
        return;
    }

    const Lq = pathSq.getTotalLength();
    const Ls = pathStem.getTotalLength();
    const Lp = pillPrefix.getTotalLength();
    const Lsuf = pillSuffix.getTotalLength();

    if (prefersReducedMotion()) {
        pathSq.style.strokeDasharray = 'none';
        pathSq.style.strokeDashoffset = '0';
        pathStem.style.strokeDasharray = 'none';
        pathStem.style.strokeDashoffset = '0';
        pillPrefix.style.strokeDasharray = 'none';
        pillPrefix.style.strokeDashoffset = '0';
        pillSuffix.style.strokeDasharray = 'none';
        pillSuffix.style.strokeDashoffset = '0';
        if (bounceGroup) bounceGroup.removeAttribute('transform');
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
    let acc = tJ;
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
        if (b - a < 0.5) {
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
        applySplitPillGrow(pillPrefix, pillSuffix, Lp, Lsuf, pillVisible);
        /* Only gate during the pill draw segment (keyframes 0–50%); after that the outline is full until erase. */
        const pillStillDrawing = t < 0.5;
        const pillReady = pillVisible >= junctionFraction - 0.008;
        const waitForPill = t < tJ || (pillStillDrawing && !pillReady);

        if (bounceGroup) {
            if (t >= hideEnd && t < bounceEnd) {
                const phase = (t - hideEnd) / (bounceEnd - hideEnd);
                const theta = phase * Math.PI * 2 * 1.65;
                const raw = Math.sin(theta);
                const eased = raw * raw * raw * 0.35 + raw * 0.65;
                const dy = 3.2 * eased;
                bounceGroup.setAttribute('transform', `translate(0, ${dy.toFixed(2)})`);
            } else {
                bounceGroup.removeAttribute('transform');
            }
        }

        if (waitForPill) {
            applyHidden(pathSq, Lq);
            applyHidden(pathStem, Ls);
        } else if (t < squiggleEnd) {
            const p = (t - tJ) / (squiggleEnd - tJ);
            applyGrow(pathSq, Lq, p * Lq);
            applyHidden(pathStem, Ls);
        } else if (t < morphEnd) {
            applyGrow(pathSq, Lq, Lq);
            const u = (t - squiggleEnd) / (morphEnd - squiggleEnd);
            applyGrow(pathStem, Ls, u * Ls);
        } else if (t < hideEnd) {
            const u = (t - morphEnd) / (hideEnd - morphEnd);
            const a = u * Lq;
            applySegment(pathSq, Lq, a, Lq);
            applyGrow(pathStem, Ls, Ls);
        } else if (t < bounceEnd) {
            applyHidden(pathSq, Lq);
            applyGrow(pathStem, Ls, Ls);
        } else {
            applyHidden(pathSq, Lq);
            const p = (t - bounceEnd) / (1 - bounceEnd);
            const end = Ls - p * Ls;
            applySegment(pathStem, Ls, 0, end);
        }
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
        '.skill-category, .project-card:not(.project-phone-showcase-slot), .cert-cell, .papers-carousel-outer, .certifications, .about-content, .contact-content, .experience-item'
    );

    if (prefersReducedMotion()) {
        animateElements.forEach(el => el.classList.add('animate-in'));
        return;
    }

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
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
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
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

    document.querySelectorAll('.project-card:not(.project-phone-showcase-slot)').forEach((card, index) => {
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
