
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const loadingEl   = document.getElementById('loading');
const nav         = document.querySelector('nav');
const progressBar = document.getElementById('scrollProgress');
const parallaxBg  = document.getElementById('parallaxBg');
const formStatus  = document.getElementById('formStatus');
const fabBtn      = document.getElementById('fabBtn');

// ── Theme toggle ──────────────────────────────────────────────────────────────
(function () {
    const btn = document.getElementById('themeToggle');
    const html = document.documentElement;
    const STORAGE_KEY = 'portfolio-theme';

    // Apply saved or system preference on load
    const saved = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'light' || (!saved && !prefersDark)) {
        html.classList.add('light-mode');
    }

    if (btn) {
        btn.addEventListener('click', function () {
            const isLight = html.classList.toggle('light-mode');
            localStorage.setItem(STORAGE_KEY, isLight ? 'light' : 'dark');
        });
    }
})();

// ── Rotating hero roles ──────────────────────────────────────────────────────
const roleEl = document.getElementById('roleText');
if (roleEl && !prefersReducedMotion) {
    const roles = ['Software Engineer', 'Graphic Designer', 'Community Leader', 'Public Speaker', 'Python Developer'];
    let roleIndex = 0;
    let charIndex = 0;
    let deleting = false;

    function typeRole() {
        const current = roles[roleIndex];
        roleEl.textContent = deleting ? current.slice(0, charIndex--) : current.slice(0, charIndex++);

        if (!deleting && charIndex > current.length) {
            deleting = true;
            setTimeout(typeRole, 1800);
            return;
        }
        if (deleting && charIndex < 0) {
            deleting = false;
            roleIndex = (roleIndex + 1) % roles.length;
        }
        setTimeout(typeRole, deleting ? 45 : 90);
    }
    setTimeout(typeRole, 1000);
} else if (roleEl) {
    roleEl.textContent = 'Software Engineer';
}

// ── Loading screen ────────────────────────────────────────────────────────────
window.addEventListener('load', function () {
    if (!loadingEl) return;
    setTimeout(() => loadingEl.classList.add('hidden'), prefersReducedMotion ? 0 : 800);
});

// ── Mobile menu ───────────────────────────────────────────────────────────────
const menuToggleBtn  = document.getElementById('menuToggleBtn');
const menuIcon       = document.getElementById('menuIcon');
const navLinksEl     = document.getElementById('navLinks');
const navCloseBtn    = document.getElementById('navCloseBtn');
const navMoreToggle  = document.getElementById('navMoreToggle');   // mobile "More Pages" btn
const navBackBtn     = document.getElementById('navBackBtn');       // mobile "Back" btn
const navMoreDesktop = document.getElementById('navMoreDesktop');   // desktop More toggle
const navMoreEl      = document.getElementById('navMore');          // desktop More <li>
const navDrawerTitle = document.getElementById('navDrawerTitle');

function isMobile() { return window.innerWidth <= 768; }
function isMenuOpen() { return !!(navLinksEl && navLinksEl.classList.contains('active')); }

function openMenu() {
    if (!navLinksEl || !menuToggleBtn) return;
    navLinksEl.classList.add('active');
    menuToggleBtn.setAttribute('aria-expanded', 'true');
    showMainView();
}

function closeMenu() {
    if (!navLinksEl || !menuToggleBtn) return;
    navLinksEl.classList.remove('active');
    menuToggleBtn.setAttribute('aria-expanded', 'false');
    showMainView();
    closeDesktopMore();
}

function toggleMenu() { isMenuOpen() ? closeMenu() : openMenu(); }

// ── Mobile view switching ─────────────────────────────────────────────────────
function showMainView() {
    if (!navLinksEl) return;
    navLinksEl.classList.remove('nav-more-view');
    if (navDrawerTitle) navDrawerTitle.textContent = 'Menu';
}

function showMoreView() {
    if (!navLinksEl) return;
    navLinksEl.classList.add('nav-more-view');
    if (navDrawerTitle) navDrawerTitle.textContent = 'More';
}

// ── Desktop More dropdown ─────────────────────────────────────────────────────
function closeDesktopMore() {
    if (!navMoreEl || !navMoreDesktop) return;
    navMoreEl.classList.remove('open');
    navMoreDesktop.setAttribute('aria-expanded', 'false');
}

function toggleDesktopMore() {
    if (!navMoreEl || !navMoreDesktop) return;
    const willOpen = !navMoreEl.classList.contains('open');
    navMoreEl.classList.toggle('open', willOpen);
    navMoreDesktop.setAttribute('aria-expanded', String(willOpen));
}

// ── Event listeners ───────────────────────────────────────────────────────────
if (menuToggleBtn)  menuToggleBtn.addEventListener('click', toggleMenu);
if (navCloseBtn)    navCloseBtn.addEventListener('click', closeMenu);
if (navMoreToggle)  navMoreToggle.addEventListener('click', showMoreView);
if (navBackBtn)     navBackBtn.addEventListener('click', showMainView);
if (navMoreDesktop) navMoreDesktop.addEventListener('click', toggleDesktopMore);

// Close drawer when any nav link is clicked
document.querySelectorAll('#navLinks a').forEach(link => link.addEventListener('click', closeMenu));

// ── 4. Close drawer when tapping the dim overlay (::before pseudo) or outside ──
document.addEventListener('click', function (e) {
    if (!isMenuOpen()) return;
    // If click is outside the drawer and not on the toggle button — close
    if (!navLinksEl.contains(e.target) && !menuToggleBtn.contains(e.target)) closeMenu();
});

// Close desktop dropdown when clicking outside
document.addEventListener('click', function (e) {
    if (!navMoreEl || !navMoreDesktop) return;
    if (!isMobile() && !navMoreEl.contains(e.target)) closeDesktopMore();
});

// Escape key
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        if (isMenuOpen()) closeMenu();
        closeDesktopMore();
    }
});

// Reset on resize
window.addEventListener('resize', function () {
    if (!isMobile()) {
        showMainView();
        closeDesktopMore();
    }
});

// ── Active nav link via IntersectionObserver ──────────────────────────────────
const navSectionLinks = Array.from(document.querySelectorAll('#navLinks a[href^="#"]'));

function setActiveNavLink(sectionId) {
    navSectionLinks.forEach(link => {
        link.classList.toggle('active-nav', link.getAttribute('href') === `#${sectionId}`);
    });
}

if ('IntersectionObserver' in window && navSectionLinks.length > 0) {
    const navObserver = new IntersectionObserver((entries) => {
        const visible = entries
            .filter(e => e.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveNavLink(visible.target.id);
    }, { threshold: [0.25, 0.5, 0.75], rootMargin: '-35% 0px -45% 0px' });

    document.querySelectorAll('section[id]').forEach(s => navObserver.observe(s));
}

// ── Floating Action Button ────────────────────────────────────────────────────
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
}

if (fabBtn) {
    fabBtn.addEventListener('click', scrollToTop);
    fabBtn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollToTop(); }
    });
}

// ── Project filtering ─────────────────────────────────────────────────────────
const filterBtns   = document.querySelectorAll('.filter-btn');
const projectCards = document.querySelectorAll('.project-card');

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.getAttribute('data-filter');
        projectCards.forEach(card => {
            const match = filter === 'all' || card.getAttribute('data-category') === filter;
            card.style.display = match ? 'block' : 'none';
        });
    });
});

// ── Contact form ──────────────────────────────────────────────────────────────
function sanitizeInput(value) {
    if (typeof value !== 'string') return '';
    return value.replace(/<[^>]*>/g, '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
}

function setFormStatus(message, type) {
    if (!formStatus) return;
    formStatus.textContent = message;
    formStatus.className = `form-status ${type} show`;

    // ── 3. Success animation ──────────────────────────────
    if (type === 'success' && !prefersReducedMotion) {
        showSuccessAnimation(message);
    }
}

function showSuccessAnimation(message) {
    // Remove any existing overlay
    const existing = document.getElementById('formSuccessOverlay');
    if (existing) existing.remove();

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'form-success-overlay';
    overlay.id = 'formSuccessOverlay';
    overlay.innerHTML =
        '<div class="form-success-card">' +
            '<div class="form-success-icon"><i class="fas fa-check"></i></div>' +
            '<p class="form-success-title">Message Sent!</p>' +
            '<p class="form-success-sub">' + (message || "I'll get back to you soon.") + '</p>' +
        '</div>';
    document.body.appendChild(overlay);

    // Confetti burst
    const colours = ['#ea580c','#f97316','#fb923c','#22c55e','#3b82f6','#a855f7','#fbbf24'];
    for (let i = 0; i < 60; i++) {
        const p = document.createElement('div');
        p.className = 'confetti-particle';
        p.style.cssText =
            'left:' + (20 + Math.random() * 60) + '%;' +
            'top:-10px;' +
            'background:' + colours[Math.floor(Math.random() * colours.length)] + ';' +
            '--dur:' + (1.5 + Math.random() * 2) + 's;' +
            '--delay:' + (Math.random() * 0.6) + 's;' +
            'width:' + (6 + Math.random() * 8) + 'px;' +
            'height:' + (6 + Math.random() * 8) + 'px;' +
            'border-radius:' + (Math.random() > 0.5 ? '50%' : '2px') + ';';
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 4000);
    }

    // Auto-remove overlay after animation
    setTimeout(() => overlay.remove(), 3600);
}

function setFieldInvalid(inputEl, invalid) {
    if (!inputEl) return;
    inputEl.setAttribute('aria-invalid', invalid ? 'true' : 'false');
}

function clearFormStatus() {
    if (!formStatus) return;
    formStatus.textContent = '';
    formStatus.className = 'form-status';
}

function validateForm(name, email, subject, message) {
    // Keep validation strict enough to reduce spam/noise while staying user-friendly.
    if (!name || name.trim().length < 2)    return 'Name must be at least 2 characters.';
    if (!subject || subject.trim().length < 3) return 'Subject must be at least 3 characters.';
    if (!message || message.trim().length < 10) return 'Message must be at least 10 characters.';
    if (message.length > 2000)              return 'Message is too long (max 2000 characters).';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
    return null;
}

async function sendViaEmailJS(payload) {
    // POST to backend. Falls back to mailto if backend is unreachable.
    const apiUrl = window.CONTACT_API_URL || 'https://solomonleek.tech/api/contact';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            // Use backend's detail message if available
            throw new Error(data?.detail || `Server error (${response.status})`);
        }

        return data;
    } catch (err) {
        if (err.name === 'AbortError') throw new Error('Request timed out. Please try again.');
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}

function openMailtoFallback({ name, email, subject, message }) {
    // Include secondary email in cc so no inquiry is missed.
    const to = 's.leek@alustudent.com';
    const cc = 'thionggarang11@gmail.com';
    const mailtoSubject = encodeURIComponent(`Portfolio Contact: ${subject}`);
    const mailtoBody = encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\n\n${message}`
    );
    window.location.href = `mailto:${to}?cc=${encodeURIComponent(cc)}&subject=${mailtoSubject}&body=${mailtoBody}`;
}

const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const submitBtn    = this.querySelector('button[type="submit"]');
        const originalHTML = submitBtn ? submitBtn.innerHTML : 'Send Message';

        const nameInput    = document.getElementById('name');
        const emailInput   = document.getElementById('email');
        const subjectInput = document.getElementById('subject');
        const messageInput = document.getElementById('message');
        const websiteInput = document.getElementById('website');

        if (!nameInput || !emailInput || !subjectInput || !messageInput || !submitBtn) return;

        clearFormStatus();
        [nameInput, emailInput, subjectInput, messageInput].forEach(input => setFieldInvalid(input, false));

        // Honeypot field should stay empty; silently ignore bots.
        if (websiteInput && websiteInput.value.trim() !== '') {
            this.reset();
            setFormStatus('Message sent! I\'ll get back to you soon.', 'success');
            return;
        }

        const name    = sanitizeInput(nameInput.value);
        const email   = sanitizeInput(emailInput.value);
        const subject = sanitizeInput(subjectInput.value);
        const message = sanitizeInput(messageInput.value);

        nameInput.value    = name;
        emailInput.value   = email;
        subjectInput.value = subject;
        messageInput.value = message;

        const error = validateForm(name, email, subject, message);
        if (error) {
            if (!name || name.length < 2) setFieldInvalid(nameInput, true);
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) setFieldInvalid(emailInput, true);
            if (!subject || subject.length < 3) setFieldInvalid(subjectInput, true);
            if (!message || message.length < 10 || message.length > 2000) setFieldInvalid(messageInput, true);
            setFormStatus(error, 'error');
            return;
        }

        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        submitBtn.disabled  = true;

        try {
            const result = await sendViaEmailJS({
                name,
                email,
                subject,
                message,
                website: websiteInput ? websiteInput.value : '' // honeypot
            });
            this.reset();
            setFormStatus(result?.message || 'Message sent! I\'ll get back to you soon.', 'success');
        } catch (err) {
            const errMsg = err.message || '';
            // If backend saved the message but email failed, show a softer message
            if (errMsg.toLowerCase().includes('saved') || errMsg.toLowerCase().includes('follow up')) {
                setFormStatus(errMsg, 'success');
            } else if (errMsg.toLowerCase().includes('too many')) {
                setFormStatus('You\'ve sent too many messages recently. Please wait an hour and try again.', 'error');
            } else {
                // Last-resort: open mailto fallback
                openMailtoFallback({ name, email, subject, message });
                setFormStatus('Could not reach the server. Your email app has been opened as a fallback.', 'error');
            }
        } finally {
            submitBtn.innerHTML = originalHTML;
            submitBtn.disabled  = false;
        }
    });
}

// ── Scroll effects (rAF-throttled) ───────────────────────────────────────────
function handleScrollEffects() {
    const scrollY      = window.scrollY;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;

    // Nav: toggle class instead of inline style so CSS theme controls the colour
    if (nav) {
        nav.classList.toggle('nav--scrolled', scrollY > 100);
    }

    // Scroll progress: use CSS custom property so the bar width is CSS-driven
    if (progressBar) {
        const pct = scrollHeight > 0 ? (scrollY / scrollHeight) * 100 : 0;
        progressBar.style.setProperty('--scroll-pct', `${pct}%`);
    }

    if (parallaxBg && !prefersReducedMotion) {
        parallaxBg.style.transform = `translateY(${scrollY * 0.5}px)`;
    }

    // FAB: toggle class instead of inline opacity/pointerEvents
    if (fabBtn) {
        fabBtn.classList.toggle('visible', scrollY > 300);
    }
}

let isScrollTicking = false;
window.addEventListener('scroll', function () {
    if (!isScrollTicking) {
        window.requestAnimationFrame(() => {
            handleScrollEffects();
            isScrollTicking = false;
        });
        isScrollTicking = true;
    }
}, { passive: true });

// ── Animated counters ─────────────────────────────────────────────────────────
// Use data-target, data-decimals="2", data-suffix="+" on the element.
function animateCounter(element) {
    const raw      = element.getAttribute('data-target');
    const target   = parseFloat(raw);
    const decimals = parseInt(element.getAttribute('data-decimals') || '0', 10);
    const suffix   = element.getAttribute('data-suffix') || '';

    if (!raw || isNaN(target) || target <= 0) return;

    const increment = target / 100;
    let current = 0;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = (decimals > 0 ? current.toFixed(decimals) : Math.floor(current)) + suffix;
    }, 20);
}

// ── Reveal animations ─────────────────────────────────────────────────────────
document.querySelectorAll('.skill-item, .tech-tag').forEach(item => item.classList.add('stagger-item'));

const revealSelector = '.reveal, .reveal-left, .reveal-right, .reveal-scale, .counter';
const revealElements = Array.from(document.querySelectorAll(revealSelector));

if (!prefersReducedMotion) {
    document.querySelectorAll('section').forEach(section => {
        Array.from(section.querySelectorAll(revealSelector)).forEach((item, i) => {
            const delay = Math.min(i * 70, 420);
            item.dataset.revealDelay = String(delay);
            if (!item.classList.contains('counter')) item.style.transitionDelay = `${delay}ms`;
        });
    });
}

function activateCounterDisplay(el) {
    const target   = parseFloat(el.getAttribute('data-target') || '0');
    const decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    const suffix   = el.getAttribute('data-suffix') || '';
    el.textContent = (decimals > 0 ? target.toFixed(decimals) : Math.floor(target)) + suffix;
}

if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => el.classList.add('active'));
    document.querySelectorAll('.counter').forEach(activateCounterDisplay);
    document.querySelectorAll('.stagger-item').forEach(item => item.classList.add('animate'));
} else {
    const revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const delay = Number(entry.target.dataset.revealDelay || 0);
            entry.target.classList.add('active');

            if (entry.target.classList.contains('counter')) {
                setTimeout(() => animateCounter(entry.target), delay);
            }

            const staggerStart = Math.min(Math.floor(delay * 0.35), 180);
            entry.target.querySelectorAll('.stagger-item').forEach((item, i) => {
                setTimeout(() => item.classList.add('animate'), staggerStart + i * 65);
            });

            if (entry.target.classList.contains('stagger-item')) entry.target.classList.add('animate');

            revealObserver.unobserve(entry.target);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -12% 0px' });

    revealElements.forEach(el => revealObserver.observe(el));
    document.querySelectorAll('.skill-category').forEach(el => revealObserver.observe(el));
}

// ── Magnetic effect ───────────────────────────────────────────────────────────
if (!prefersReducedMotion) {
    document.querySelectorAll('.magnetic').forEach(el => {
        el.addEventListener('mousemove', function (e) {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width  / 2;
            const y = e.clientY - rect.top  - rect.height / 2;
            el.style.transform = `translate(${x * 0.1}px, ${y * 0.1}px)`;
        });
        el.addEventListener('mouseleave', () => { el.style.transform = 'translate(0,0)'; });
    });
}

// ── Card hover lift ───────────────────────────────────────────────────────────
document.querySelectorAll('.project-card, .skill-category, .highlight-item').forEach(card => {
    card.classList.add('interactive-card');
});

// ── Project image fallback handling ───────────────────────────────────────────
document.querySelectorAll('.project-image img').forEach((img) => {
    img.addEventListener('error', () => {
        const imageWrap = img.closest('.project-image');
        if (imageWrap) imageWrap.classList.add('image-fallback');
    });
});

// ── Smooth scroll for anchor links ────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const selector = this.getAttribute('href');
        if (!selector || selector === '#') return;
        let target;
        try { target = document.querySelector(selector); } catch { return; }
        if (!target) return;

        // Immediately update active link on click — don't wait for IntersectionObserver
        if (target.id) setActiveNavLink(target.id);

        window.scrollTo({ top: target.offsetTop - 80, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
});

// Run once on load to set initial state
handleScrollEffects();

// ── Page transition ───────────────────────────────────────────────────────────
const pageTransition = document.getElementById('pageTransition');

document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto') ||
        href.startsWith('tel') || href.startsWith('http') ||
        link.getAttribute('target') === '_blank') return;

    link.addEventListener('click', e => {
        if (!pageTransition || prefersReducedMotion) return;
        e.preventDefault();
        pageTransition.classList.add('active');
        setTimeout(() => { window.location.href = href; }, 350);
    });
});

// ── Skill bar animations ──────────────────────────────────────────────────────
if ('IntersectionObserver' in window && !prefersReducedMotion) {
    const skillBarObserver = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.querySelectorAll('.skill-bar-fill').forEach((bar, i) => {
                setTimeout(() => bar.classList.add('animated'), i * 120);
            });
            skillBarObserver.unobserve(entry.target);
        });
    }, { threshold: 0.3 });

    document.querySelectorAll('.skill-category').forEach(el => skillBarObserver.observe(el));
} else {
    // No animation — just set widths immediately
    document.querySelectorAll('.skill-bar-fill').forEach(bar => bar.classList.add('animated'));
}

// ── Copy email buttons ────────────────────────────────────────────────────────
document.querySelectorAll('.copy-email-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
        const email = this.dataset.email;
        const icon  = this.querySelector('i');
        if (!email || !icon) return;
        navigator.clipboard.writeText(email).then(function () {
            icon.className = 'fas fa-check';
            btn.classList.add('copied');
            btn.title = 'Copied!';
            setTimeout(function () {
                icon.className = 'fas fa-copy';
                btn.classList.remove('copied');
                btn.title = 'Copy email';
            }, 2000);
        }).catch(function () {
            // Fallback for browsers without clipboard API
            const ta = document.createElement('textarea');
            ta.value = email;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            icon.className = 'fas fa-check';
            btn.classList.add('copied');
            setTimeout(function () {
                icon.className = 'fas fa-copy';
                btn.classList.remove('copied');
            }, 2000);
        });
    });
});

// ── Hero stat counter animation ───────────────────────────────────────────────
(function () {
    if (prefersReducedMotion) return;

    const statNums = document.querySelectorAll('.hero-stat-num[data-count]');
    if (!statNums.length) return;

    let animated = false;

    function runCounters() {
        if (animated) return;
        animated = true;
        statNums.forEach(function (el) {
            const target  = parseInt(el.dataset.count, 10);
            const suffix  = el.dataset.suffix || '';
            const duration = 1400;
            const start   = performance.now();

            function step(now) {
                const elapsed  = now - start;
                const progress = Math.min(elapsed / duration, 1);
                // Ease out cubic
                const eased = 1 - Math.pow(1 - progress, 3);
                el.textContent = Math.floor(eased * target) + suffix;
                if (progress < 1) requestAnimationFrame(step);
                else el.textContent = target + suffix;
            }
            requestAnimationFrame(step);
        });
    }

    // Trigger when hero stats scroll into view
    if ('IntersectionObserver' in window) {
        const statsEl = document.querySelector('.hero-stats');
        if (statsEl) {
            const obs = new IntersectionObserver(function (entries) {
                if (entries[0].isIntersecting) { runCounters(); obs.disconnect(); }
            }, { threshold: 0.5 });
            obs.observe(statsEl);
        }
    } else {
        // Fallback: run after 800ms
        setTimeout(runCounters, 800);
    }
})();

// ── Dynamic badge year & footer year ─────────────────────────────────────────
(function () {
    const yr = new Date().getFullYear();
    const badgeYear = document.getElementById('badgeYear');
    const footerYear = document.getElementById('footerYear');
    if (badgeYear) badgeYear.textContent = yr;
    if (footerYear) footerYear.textContent = yr;
})();

// ── Contact form character counter ───────────────────────────────────────────
(function () {
    const msgArea  = document.getElementById('message');
    const charLeft = document.getElementById('msgCharLeft');
    if (!msgArea || !charLeft) return;

    function updateCount() {
        const remaining = 2000 - msgArea.value.length;
        charLeft.textContent = remaining;
        charLeft.style.color = remaining < 100 ? '#f97316' : '';
        charLeft.style.fontWeight = remaining < 100 ? '700' : '';
    }

    msgArea.addEventListener('input', updateCount);
    updateCount(); // initialise
})();

// ── Resume download tracking ──────────────────────────────────────────────────
(function () {
    const resumeLink = document.getElementById('resumeLink');
    if (!resumeLink) return;

    resumeLink.addEventListener('click', function () {
        const apiUrl = window.ANALYTICS_API_URL || 'https://solomonleek.tech/api/analytics';
        fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ page: location.pathname, section: 'resume-download', event: 'resume_click' }),
            keepalive: true
        }).catch(function () {});
    });
})();

// ── Visitor counter (fetches from analytics summary) ─────────────────────────
(function () {
    const countEl   = document.getElementById('visitorCount');
    const wrapEl    = document.getElementById('footerVisitors');
    if (!countEl || !wrapEl) return;

    const apiBase = window.ANALYTICS_API_URL
        ? window.ANALYTICS_API_URL.replace('/api/analytics', '')
        : 'https://solomonleek.tech';

    fetch(apiBase + '/api/analytics/summary', { method: 'GET' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
            if (!data || !data.total_views) return;
            const views = data.total_views;
            // Format: 1234 → "1.2k", under 1000 → exact
            countEl.textContent = views >= 1000
                ? (views / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
                : views;
            wrapEl.style.display = 'block';
        })
        .catch(function () {});
})();

// ── Newsletter subscription (blog page) ──────────────────────────────────────
(function () {
    const form     = document.getElementById('newsletterForm');
    const emailEl  = document.getElementById('newsletterEmail');
    const statusEl = document.getElementById('newsletterStatus');
    if (!form || !emailEl || !statusEl) return;

    const apiBase = window.ANALYTICS_API_URL
        ? window.ANALYTICS_API_URL.replace('/api/analytics', '')
        : 'https://solomonleek.tech';

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const email = emailEl.value.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            statusEl.textContent = 'Please enter a valid email address.';
            statusEl.style.color = '#f97316';
            statusEl.style.display = 'block';
            return;
        }

        const btn = form.querySelector('button[type="submit"]');
        const origText = btn ? btn.textContent : 'Subscribe';
        if (btn) { btn.textContent = 'Subscribing…'; btn.disabled = true; }

        try {
            const res = await fetch(apiBase + '/api/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json().catch(() => ({}));
            statusEl.textContent = data.message || 'Subscribed!';
            statusEl.style.color = res.ok ? '#22c55e' : '#f97316';
            statusEl.style.display = 'block';
            if (res.ok) { emailEl.value = ''; }
        } catch (err) {
            statusEl.textContent = 'Could not subscribe right now. Try again later.';
            statusEl.style.color = '#f97316';
            statusEl.style.display = 'block';
        } finally {
            if (btn) { btn.textContent = origText; btn.disabled = false; }
        }
    });
})();

// ── Notify-me buttons (coming-soon articles) ──────────────────────────────────
(function () {
    const apiBase = window.ANALYTICS_API_URL
        ? window.ANALYTICS_API_URL.replace('/api/analytics', '')
        : 'https://solomonleek.tech';

    document.querySelectorAll('.b-notify-btn').forEach(function (btn) {
        btn.addEventListener('click', async function () {
            // Get article title from the nearest h3
            const card  = btn.closest('.b-post');
            const title = card ? (card.querySelector('.b-post__title') || {}).textContent || 'article' : 'article';

            const email = prompt('Enter your email to be notified when "' + title.trim() + '" is published:');
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                if (email !== null) alert('Please enter a valid email address.');
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            try {
                const res = await fetch(apiBase + '/api/notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email.trim(), article: title.trim() })
                });
                const data = await res.json().catch(() => ({}));
                btn.innerHTML = '<i class="fas fa-check"></i>';
                btn.title = data.message || "You're on the list!";
                btn.style.color = '#22c55e';
            } catch (err) {
                btn.innerHTML = '<i class="fas fa-bell"></i>';
                btn.disabled = false;
                alert('Could not save your request. Please try again.');
            }
        });
    });
})();
