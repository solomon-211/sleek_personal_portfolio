
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const loadingEl   = document.getElementById('loading');
const nav         = document.querySelector('nav');
const progressBar = document.getElementById('scrollProgress');
const parallaxBg  = document.getElementById('parallaxBg');
const formStatus  = document.getElementById('formStatus');
const fabBtn      = document.getElementById('fabBtn');

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

// Close drawer when clicking outside
document.addEventListener('click', function (e) {
    if (!isMenuOpen()) return;
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
    fabBtn.style.opacity    = '0';
    fabBtn.style.pointerEvents = 'none';
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
    // API-first: send to backend endpoint; frontend fallback opens mail client on failure.
    const apiUrl = window.CONTACT_API_URL || '/api/contact';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        if (!response.ok) {
            // Preserve backend detail when available for easier debugging.
            const payload = await response.json().catch(() => null);
            throw new Error(payload?.detail || 'Contact request failed');
        }

        return response.json().catch(() => ({ ok: true }));
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
            await sendViaEmailJS({ name, email, subject, message });
            this.reset();
            setFormStatus('Message sent! I\'ll get back to you soon.', 'success');
        } catch (err) {
            // Last-resort delivery path when API or SMTP is temporarily unavailable.
            openMailtoFallback({ name, email, subject, message });
            setFormStatus('Live form service is unavailable right now. Your email app has been opened as fallback.', 'error');
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

    if (nav) {
        // Keep dark navy — only adjust opacity on scroll
        nav.style.background = scrollY > 100
            ? 'rgba(6,13,26,0.98)'
            : 'rgba(6,13,26,0.92)';
    }

    if (progressBar) {
        progressBar.style.width = `${scrollHeight > 0 ? (scrollY / scrollHeight) * 100 : 0}%`;
    }

    if (parallaxBg && !prefersReducedMotion) {
        parallaxBg.style.transform = `translateY(${scrollY * 0.5}px)`;
    }

    if (fabBtn) {
        if (scrollY > 300) {
            fabBtn.style.opacity       = '1';
            fabBtn.style.pointerEvents = 'auto';
        } else {
            fabBtn.style.opacity       = '0';
            fabBtn.style.pointerEvents = 'none';
        }
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
