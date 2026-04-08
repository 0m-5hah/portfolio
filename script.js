document.addEventListener('DOMContentLoaded', () => {
    initCursorGlow();
    initMobileMenu();
    initSmoothScroll();
    initScrollAnimations();
    initNavbarScroll();
    initTerminalTyping();
    initStaggerDelays();
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
        '.skill-category, .project-card, .cert-card, .education, .about-content, .contact-content, .experience-item'
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
                window.goatcounter.count({ path: 'resume-download', title: 'Resume Download', event: true });
            }
        });
    });
}
