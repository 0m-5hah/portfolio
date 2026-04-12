/**
 * Preview the SMS API status chip without calling /health. Normally keep `null`.
 * Or open `?api_badge=down` once — it is saved for this tab (sessionStorage) so plain reloads keep the preview.
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
});

function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';
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
        '.skill-category, .project-card, .cert-card, .papers-carousel-outer, .education, .about-content, .contact-content, .experience-item'
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

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        navbar.style.boxShadow = currentScroll > 100
            ? '0 4px 20px rgba(0, 0, 0, 0.3)'
            : 'none';

        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - navbar.offsetHeight - 100;
            if (currentScroll >= sectionTop) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
}

function initTerminalTyping() {
    const typingElement = document.querySelector('.terminal-command-animated');
    if (!typingElement) return;
    if (prefersReducedMotion()) {
        typingElement.textContent = 'python3 merge_case_docs.py';
        return;
    }

    const commands = [
        'python3 merge_case_docs.py',
        'nmap -sV --script=vuln 10.0.0.0/24',
        'pytest tests/test_pipeline.py',
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

/** Same default and overrides as `getApiBase()` in project-demos.js (`?api=`, localStorage `spamApiBase`). */
function getSpamApiBase() {
    try {
        const q = new URLSearchParams(window.location.search).get('api');
        if (q) return q.replace(/\/$/, '');
        const ls = localStorage.getItem('spamApiBase');
        if (ls) return ls.replace(/\/$/, '');
    } catch (e) {
        /* ignore */
    }
    return 'https://omsshah-spam-classifier-api.hf.space';
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
        ? 'Preview only — set SMS_API_BADGE_PREVIEW to null at the top of script.js'
        : 'Preview only — open ?api_badge=off or clear sessionStorage key smsApiBadgePreview';

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
                    'Inference API responded healthy; the demo uses the real model on the server.'
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
            if (window.goatcounter && window.goatcounter.count) {
                window.goatcounter.count({
                    path: 'cta/open-live-demo',
                    title: 'Open live demo (from portfolio)',
                    event: true,
                });
            }
        });
    });
}

function initStaggerDelays() {
    if (prefersReducedMotion()) return;

    document.querySelectorAll('.project-card').forEach((card, index) => {
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
            if (window.goatcounter && window.goatcounter.count) {
                window.goatcounter.count({ path: 'resume-download', title: 'Resume (PDF)', event: true });
            }
        });
    });
}
