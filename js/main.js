
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const nav         = document.querySelector('nav');
const progressBar = document.getElementById('scrollProgress');
const formStatus  = document.getElementById('formStatus');
const fabBtn      = document.getElementById('fabBtn');

function getApiUrl(configKey, relativePath, productionFallback) {
    const configured = window[configKey];
    if (typeof configured === 'string' && configured.trim()) {
        return configured.trim();
    }
    if (window.location.protocol === 'file:') {
        return productionFallback;
    }
    return relativePath;
}

const CONTACT_API_URL = getApiUrl('CONTACT_API_URL', '/api/contact', 'https://solomonleek.com/api/contact');
const ANALYTICS_API_URL = getApiUrl('ANALYTICS_API_URL', '/api/analytics', 'https://solomonleek.com/api/analytics');
const ANALYTICS_API_BASE = ANALYTICS_API_URL.replace(/\/api\/analytics\/?$/, '');

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

// Escape key — command palette takes priority when open
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        const cmdPalette = document.getElementById('cmdPalette');
        if (cmdPalette && !cmdPalette.hidden) return; // let palette's own handler close it
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

// Dynamic filter counts from DOM
(function () {
    const counts = { all: projectCards.length };
    projectCards.forEach(c => {
        const cat = c.getAttribute('data-category');
        if (cat) counts[cat] = (counts[cat] || 0) + 1;
    });
    filterBtns.forEach(btn => {
        const countEl = btn.querySelector('.filter-count');
        if (countEl) countEl.textContent = counts[btn.getAttribute('data-filter')] ?? 0;
    });
})();

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

    const card = document.createElement('div');
    card.className = 'form-success-card';

    const icon = document.createElement('div');
    icon.className = 'form-success-icon';
    const iconEl = document.createElement('i');
    iconEl.className = 'fas fa-check';
    icon.appendChild(iconEl);

    const title = document.createElement('p');
    title.className = 'form-success-title';
    title.textContent = 'Message Sent!';

    const sub = document.createElement('p');
    sub.className = 'form-success-sub';
    sub.textContent = message || "I'll get back to you soon.";

    card.appendChild(icon);
    card.appendChild(title);
    card.appendChild(sub);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Confetti burst
    const colours = ['#ea580c','#f97316','#fb923c','#FE7F2D','#FE7F2D','#FE7F2D','#FE7F2D'];
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

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function subscribeToNewsletter(email) {
    const res = await fetch(ANALYTICS_API_BASE + '/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, message: data.message };
}

async function postContactForm(payload) {
    // POST to backend. Falls back to mailto if backend is unreachable.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
        const response = await fetch(CONTACT_API_URL, {
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
let formCooldown = false;

if (contactForm) {
    contactForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (formCooldown) {
            setFormStatus('Please wait 60 seconds before sending another message.', 'error');
            return;
        }

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
            const result = await postContactForm({
                name,
                email,
                subject,
                message,
                website: websiteInput ? websiteInput.value : '' // honeypot
            });
            this.reset();
            setFormStatus(result?.message || 'Message sent! I\'ll get back to you soon.', 'success');
            formCooldown = true;
            setTimeout(() => { formCooldown = false; }, 60000);
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

    // Stagger items outside any reveal container (e.g. project card tags) reveal on their own
    document.querySelectorAll('.stagger-item').forEach(item => {
        if (!item.closest(revealSelector + ', .skill-category')) revealObserver.observe(item);
    });

    // Failsafe: never leave content hidden if an observer callback is missed
    window.addEventListener('load', () => {
        setTimeout(() => {
            document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
                if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('active');
            });
        }, 1200);
    });
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

// ── Skill bar animations ──────────────────────────────────────────────────────
function skillBarPct(bar) {
    const raw = bar.style.getPropertyValue('--pct') || bar.getAttribute('style') || '';
    const match = /(\d+(?:\.\d+)?)/.exec(raw);
    return match ? parseFloat(match[1]) : 0;
}

function animateSkillBarPct(bar, duration) {
    const label = bar.closest('.skill-bar-item')?.querySelector('.skill-bar-label');
    if (!label) return;
    let pctEl = label.querySelector('.skill-bar-pct');
    if (!pctEl) {
        pctEl = document.createElement('span');
        pctEl.className = 'skill-bar-pct';
        label.appendChild(pctEl);
    }
    const target = skillBarPct(bar);
    const start = performance.now();
    function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        pctEl.textContent = Math.round(t * target) + '%';
        if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

if ('IntersectionObserver' in window && !prefersReducedMotion) {
    const skillBarObserver = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.querySelectorAll('.skill-bar-fill').forEach((bar, i) => {
                setTimeout(() => {
                    bar.classList.add('animated');
                    animateSkillBarPct(bar, 1200);
                }, i * 120);
            });
            skillBarObserver.unobserve(entry.target);
        });
    }, { threshold: 0.3 });

    document.querySelectorAll('.skill-category').forEach(el => skillBarObserver.observe(el));
} else {
    // No animation — just set widths and percentages immediately
    document.querySelectorAll('.skill-bar-fill').forEach(bar => {
        bar.classList.add('animated');
        const label = bar.closest('.skill-bar-item')?.querySelector('.skill-bar-label');
        if (label && !label.querySelector('.skill-bar-pct')) {
            const pctEl = document.createElement('span');
            pctEl.className = 'skill-bar-pct';
            pctEl.textContent = skillBarPct(bar) + '%';
            label.appendChild(pctEl);
        }
    });
}

// ── Copy buttons (email + phone) ─────────────────────────────────────────────
document.querySelectorAll('.copy-email-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
        const value = this.dataset.copy || this.dataset.email;
        const icon  = this.querySelector('i');
        if (!value || !icon) return;
        navigator.clipboard.writeText(value).then(function () {
            icon.className = 'fas fa-check';
            btn.classList.add('copied');
            btn.title = 'Copied!';
            setTimeout(function () {
                icon.className = 'fas fa-copy';
                btn.classList.remove('copied');
                btn.title = btn.dataset.copy ? 'Copy phone number' : 'Copy email';
            }, 2000);
        }).catch(function () {
            const ta = document.createElement('textarea');
            ta.value = value;
            ta.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(ta);
            ta.select();
            ta.setSelectionRange(0, 99999);
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

// ── #7 Availability Banner dismiss ──────────────────────────────────────────
(function () {
    const banner = document.getElementById('availBanner');
    const closeBtn = document.getElementById('availBannerClose');
    if (!banner || !closeBtn) return;
    function setBannerHeight() {
        const h = banner.offsetHeight;
        document.documentElement.style.setProperty('--banner-h', h + 'px');
        if (nav) nav.style.top = h + 'px';
    }
    function hideBanner() {
        banner.style.display = 'none';
        document.documentElement.style.setProperty('--banner-h', '0px');
        if (nav) nav.style.top = '0px';
        sessionStorage.setItem('availBannerDismissed', '1');
    }
    if (sessionStorage.getItem('availBannerDismissed')) {
        hideBanner();
    } else {
        setBannerHeight();
        window.addEventListener('resize', setBannerHeight);
    }
    closeBtn.addEventListener('click', hideBanner);
})();

// ── #4 Live Kigali Clock ──────────────────────────────────────────────────────
(function () {
    const timeEl = document.getElementById('kigaliTime');
    const iconEl = document.getElementById('kigaliIcon');
    if (!timeEl) return;
    function tick() {
        const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Kigali' }));
        const h = now.getHours();
        const m = String(now.getMinutes()).padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = ((h % 12) || 12);
        timeEl.textContent = h12 + ':' + m + ' ' + ampm;
        if (iconEl) iconEl.textContent = (h >= 6 && h < 18) ? '☀️' : '🌙';
    }
    tick();
    setInterval(tick, 1000);
})();

// ── Signature terminal easter egg ─────────────────────────────────────────────
function openTerminal() {
    if (document.getElementById('termOverlay')) return;

    const lines = [
        { prompt: true,  text: 'whoami' },
        { prompt: false, text: 'Solomon Thiong Garang Leek — Software Engineer & Graphic Designer' },
        { prompt: true,  text: 'cat mission.txt' },
        { prompt: false, text: 'Build software that solves real problems, starting with the' },
        { prompt: false, text: 'communities I come from — education, healthcare access, and' },
        { prompt: false, text: 'economic inclusion across South Sudan and beyond.' },
        { prompt: true,  text: 'ls skills/' },
        { prompt: false, text: 'design/  engineering/  leadership/  community/' },
        { prompt: true,  text: 'cat contact.txt' },
        { prompt: false, text: 's.leek@alustudent.com' },
        { prompt: false, text: 'github.com/solomon-211' }
    ];

    function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    const PROMPT_HTML = '<span class="term-prompt">visitor@solomonleek.com ~ %</span> ';

    const overlay = document.createElement('div');
    overlay.id = 'termOverlay';
    overlay.className = 'term-overlay';
    overlay.innerHTML =
        '<div class="term-window" role="dialog" aria-modal="true" aria-label="Terminal easter egg">' +
            '<div class="term-titlebar">' +
                '<span class="term-dot term-dot--red"></span>' +
                '<span class="term-dot term-dot--yellow"></span>' +
                '<span class="term-dot term-dot--green"></span>' +
                '<span class="term-titlebar__label">visitor@solomonleek.com — zsh</span>' +
                '<button class="term-close" aria-label="Close terminal">&times;</button>' +
            '</div>' +
            '<div class="term-body" id="termBody"></div>' +
        '</div>';
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const body = overlay.querySelector('#termBody');

    function close() {
        overlay.remove();
        document.body.style.overflow = '';
        document.removeEventListener('keydown', escHandler);
    }
    function escHandler(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', escHandler);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    overlay.querySelector('.term-close').addEventListener('click', close);

    if (prefersReducedMotion) {
        body.innerHTML = lines.map(function (l) {
            return '<div class="term-line">' + (l.prompt ? PROMPT_HTML : '') + esc(l.text) + '</div>';
        }).join('') + '<div class="term-line">' + PROMPT_HTML + '<span class="term-cursor"></span></div>';
        return;
    }

    let lineIdx = 0;
    function typeLine() {
        if (lineIdx >= lines.length) {
            const finalLine = document.createElement('div');
            finalLine.className = 'term-line';
            finalLine.innerHTML = PROMPT_HTML + '<span class="term-cursor"></span>';
            body.appendChild(finalLine);
            return;
        }
        const l = lines[lineIdx++];
        const row = document.createElement('div');
        row.className = 'term-line';
        row.innerHTML = (l.prompt ? PROMPT_HTML : '') + '<span class="term-typed"></span>';
        body.appendChild(row);
        const typedEl = row.querySelector('.term-typed');
        const chars = l.text.split('');
        let ci = 0;
        const speed = l.prompt ? 45 : 8;
        (function typeChar() {
            if (ci < chars.length) {
                typedEl.textContent += chars[ci++];
                body.scrollTop = body.scrollHeight;
                setTimeout(typeChar, speed);
            } else {
                setTimeout(typeLine, l.prompt ? 250 : 120);
            }
        })();
    }
    typeLine();
}

// ── Konami code — alternate way to trigger the terminal easter egg ───────────
(function () {
    const seq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    let pos = 0;
    document.addEventListener('keydown', function (e) {
        const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        if (key === seq[pos]) {
            pos++;
            if (pos === seq.length) { pos = 0; openTerminal(); }
        } else {
            pos = (key === seq[0]) ? 1 : 0;
        }
    });
})();

// ── #1 Command Palette ────────────────────────────────────────────────────────
(function () {
    const palette  = document.getElementById('cmdPalette');
    const input    = document.getElementById('cmdInput');
    const list     = document.getElementById('cmdList');
    const backdrop = document.getElementById('cmdBackdrop');
    if (!palette || !input || !list) return;

    const commands = [
        { label: 'Home',         icon: 'fas fa-home',          action: () => scrollTo('#home') },
        { label: 'About Me',     icon: 'fas fa-user',          action: () => scrollTo('#about') },
        { label: 'Projects',     icon: 'fas fa-th-large',      action: () => scrollTo('#projects') },
        { label: 'Skills',       icon: 'fas fa-code',          action: () => scrollTo('#skills') },
        { label: 'Journey',      icon: 'fas fa-road',          action: () => scrollTo('#timeline') },
        { label: 'Academics',    icon: 'fas fa-graduation-cap',action: () => scrollTo('#academics') },
        { label: 'Awards & Leadership', icon: 'fas fa-trophy', action: () => scrollTo('#impact') },
        { label: 'Community',    icon: 'fas fa-heart',         action: () => scrollTo('#community') },
        { label: 'Contact',      icon: 'fas fa-paper-plane',   action: () => scrollTo('#contact') },
        { label: 'Blog',         icon: 'fas fa-newspaper',     action: () => { window.location.href = 'blog/'; } },
        { label: 'Toggle Theme', icon: 'fas fa-circle-half-stroke', action: () => document.getElementById('themeToggle')?.click() },
        { label: 'GitHub',       icon: 'fab fa-github',        action: () => window.open('https://github.com/solomon-211', '_blank', 'noopener,noreferrer') },
        { label: 'LinkedIn',     icon: 'fab fa-linkedin',      action: () => window.open('https://www.linkedin.com/in/solomon-thiong-garang-leek-727b08345', '_blank', 'noopener,noreferrer') },
        { label: 'Open Terminal', icon: 'fas fa-terminal',     action: () => openTerminal() },
    ];

    function scrollTo(selector) {
        close();
        const el = document.querySelector(selector);
        if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
    }

    let filtered = commands;
    let activeIdx = 0;

    function open() {
        palette.hidden = false;
        input.value = '';
        render(commands);
        setTimeout(() => input.focus(), 50);
    }

    function close() {
        palette.hidden = true;
        input.value = '';
    }

    function render(items) {
        filtered = items;
        activeIdx = 0;
        list.innerHTML = items.map((cmd, i) =>
            '<li role="option" class="cmd__item' + (i === 0 ? ' cmd__item--active' : '') + '" data-idx="' + i + '">' +
            '<i class="' + cmd.icon + ' cmd__item-icon"></i>' +
            '<span>' + cmd.label + '</span>' +
            '</li>'
        ).join('');
        list.querySelectorAll('.cmd__item').forEach(el => {
            el.addEventListener('mousedown', function (e) {
                e.preventDefault();
                filtered[+this.dataset.idx]?.action();
                close();
            });
        });
    }

    function setActive(idx) {
        const items = list.querySelectorAll('.cmd__item');
        items.forEach(el => el.classList.remove('cmd__item--active'));
        if (items[idx]) {
            items[idx].classList.add('cmd__item--active');
            items[idx].scrollIntoView({ block: 'nearest' });
        }
    }

    input.addEventListener('input', function () {
        const q = this.value.toLowerCase();
        render(q ? commands.filter(c => c.label.toLowerCase().includes(q)) : commands);
    });

    input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(activeIdx + 1, filtered.length - 1); setActive(activeIdx); }
        if (e.key === 'ArrowUp')   { e.preventDefault(); activeIdx = Math.max(activeIdx - 1, 0); setActive(activeIdx); }
        if (e.key === 'Enter')     { filtered[activeIdx]?.action(); close(); }
        if (e.key === 'Escape')    { close(); }
    });

    if (backdrop) backdrop.addEventListener('click', close);

    document.getElementById('cmdOpenBtn')?.addEventListener('click', open);

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !palette.hidden) { e.stopImmediatePropagation(); close(); }
    });
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

// ── Visitor counter (fetches from analytics summary) ─────────────────────────
(function () {
    const countEl   = document.getElementById('visitorCount');
    const wrapEl    = document.getElementById('footerVisitors');
    if (!countEl || !wrapEl) return;

    fetch(ANALYTICS_API_BASE + '/api/analytics/views', { method: 'GET' })
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

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const email = emailEl.value.trim();
        if (!isValidEmail(email)) {
            statusEl.textContent = 'Please enter a valid email address.';
            statusEl.style.color = '#f97316';
            statusEl.style.display = 'block';
            return;
        }

        const btn = form.querySelector('button[type="submit"]');
        const origText = btn ? btn.textContent : 'Subscribe';
        if (btn) { btn.textContent = 'Subscribing…'; btn.disabled = true; }

        try {
            const { ok, message } = await subscribeToNewsletter(email);
            statusEl.textContent = message || 'Subscribed!';
            statusEl.style.color = ok ? '#FE7F2D' : '#f97316';
            statusEl.style.display = 'block';
            if (ok) { emailEl.value = ''; }
        } catch (err) {
            statusEl.textContent = 'Could not subscribe right now. Try again later.';
            statusEl.style.color = '#f97316';
            statusEl.style.display = 'block';
        } finally {
            if (btn) { btn.textContent = origText; btn.disabled = false; }
        }
    });
})();

// ── Toast helper (replaces alert/prompt pop-ups) ────────────────────────────
function showNotifyToast(message, type) {
    const existing = document.getElementById('notifyToast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'notifyToast';
    toast.style.cssText =
        'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);' +
        'background:' + (type === 'error' ? '#dc2626' : '#FE7F2D') + ';' +
        'color:#fff;padding:0.75rem 1.5rem;border-radius:8px;font-size:0.9rem;' +
        'font-weight:600;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.3);' +
        'transition:opacity 0.3s ease;';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3500);
}

function showNotifyModal(articleTitle, onConfirm) {
    const existing = document.getElementById('notifyModal');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'notifyModal';
    backdrop.style.cssText =
        'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9998;' +
        'display:flex;align-items:center;justify-content:center;padding:1rem;';

    const box = document.createElement('div');
    box.style.cssText =
        'background:#1a2d3a;border:1px solid rgba(255,255,255,0.12);border-radius:16px;' +
        'padding:2rem;max-width:420px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,0.5);';

    const heading = document.createElement('p');
    heading.style.cssText = 'font-weight:700;color:#fff;margin:0 0 0.5rem;font-size:1rem;';
    heading.textContent = 'Notify me when published';

    const sub = document.createElement('p');
    sub.style.cssText = 'color:rgba(255,255,255,0.6);font-size:0.85rem;margin:0 0 1rem;';
    sub.textContent = '"' + articleTitle + '"';

    const input = document.createElement('input');
    input.type = 'email';
    input.placeholder = 'your.email@example.com';
    input.style.cssText =
        'width:100%;box-sizing:border-box;padding:0.65rem 0.9rem;border-radius:8px;' +
        'border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);' +
        'color:#fff;font-size:0.9rem;margin-bottom:1rem;outline:none;';

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:0.75rem;justify-content:flex-end;';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText =
        'padding:0.55rem 1.1rem;border-radius:8px;border:1px solid rgba(255,255,255,0.15);' +
        'background:transparent;color:rgba(255,255,255,0.7);cursor:pointer;font-size:0.85rem;';
    cancelBtn.addEventListener('click', () => backdrop.remove());

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Notify Me';
    confirmBtn.style.cssText =
        'padding:0.55rem 1.1rem;border-radius:8px;border:none;' +
        'background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;' +
        'cursor:pointer;font-size:0.85rem;font-weight:700;';
    confirmBtn.addEventListener('click', () => {
        const val = input.value.trim();
        if (!val || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
            input.style.borderColor = '#dc2626';
            return;
        }
        backdrop.remove();
        onConfirm(val);
    });

    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(confirmBtn);
    box.appendChild(heading);
    box.appendChild(sub);
    box.appendChild(input);
    box.appendChild(btnRow);
    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
    setTimeout(() => input.focus(), 50);
}

// ── Notify-me buttons (coming-soon articles) ──────────────────────────────────
(function () {
    const apiBase = ANALYTICS_API_BASE;

    document.querySelectorAll('.b-notify-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const card  = btn.closest('.b-post');
            const title = card ? (card.querySelector('.b-post__title') || {}).textContent || 'article' : 'article';

            showNotifyModal(title.trim(), async function (email) {
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
                    btn.style.color = '#FE7F2D';
                } catch (err) {
                    btn.innerHTML = '<i class="fas fa-bell"></i>';
                    btn.disabled = false;
                    showNotifyToast('Could not save your request. Please try again.', 'error');
                }
            });
        });
    });
})();

// ── Activity strip ────────────────────────────────────────────────────────────
(function () {
    const strip = document.getElementById('activityStrip');
    const closeBtn = document.getElementById('activityClose');
    const items = document.getElementById('activityItems');

    if (!strip || !closeBtn || !items) return;

    // Duplicate content for seamless infinite scroll
    items.innerHTML = items.innerHTML + items.innerHTML;

    closeBtn.addEventListener('click', function () {
        strip.classList.add('hidden');
        sessionStorage.setItem('activityStripClosed', '1');
    });

    // Restore closed state within session
    if (sessionStorage.getItem('activityStripClosed') === '1') {
        strip.classList.add('hidden');
    }
})();

// ── Discipline card accordion ─────────────────────────────────────────────────
(function () {
    document.querySelectorAll('.discipline-card--collapsible').forEach(function (card) {
        var btn  = card.querySelector('.discipline-card__header');
        var body = card.querySelector('.discipline-card__body');
        if (!btn || !body) return;

        btn.addEventListener('click', function () {
            var isOpen = card.classList.contains('is-open');

            // Close all other cards first
            document.querySelectorAll('.discipline-card--collapsible.is-open').forEach(function (other) {
                if (other !== card) {
                    other.classList.remove('is-open');
                    var otherBody = other.querySelector('.discipline-card__body');
                    var otherBtn  = other.querySelector('.discipline-card__header');
                    if (otherBody) otherBody.hidden = true;
                    if (otherBtn)  otherBtn.setAttribute('aria-expanded', 'false');
                }
            });

            // Toggle this card
            if (isOpen) {
                card.classList.remove('is-open');
                body.hidden = true;
                btn.setAttribute('aria-expanded', 'false');
            } else {
                card.classList.add('is-open');
                body.hidden = false;
                btn.setAttribute('aria-expanded', 'true');
            }
        });
    });

    // Handle ?cat= query param on the portfolio page to auto-filter
    if (window.location.pathname === '/portfolio/' || window.location.pathname.endsWith('/portfolio/')) {
        var params = new URLSearchParams(window.location.search);
        var cat = params.get('cat');
        if (cat && window.pfFilter) {
            window.pfFilter(cat);
        }
    }
})();

// ── Footer newsletter form ────────────────────────────────────────────────────
(function () {
    const form     = document.getElementById('footerNewsletterForm');
    const emailEl  = document.getElementById('footerNewsletterEmail');
    const statusEl = document.getElementById('footerNewsletterStatus');
    if (!form || !emailEl || !statusEl) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const email = emailEl.value.trim();
        if (!isValidEmail(email)) {
            statusEl.textContent = 'Please enter a valid email.';
            statusEl.className = 'footer-newsletter-status visible error';
            return;
        }
        const btn = form.querySelector('button');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
        try {
            const { ok, message } = await subscribeToNewsletter(email);
            statusEl.textContent = message || 'Subscribed!';
            statusEl.className = 'footer-newsletter-status visible' + (ok ? '' : ' error');
            if (ok) emailEl.value = '';
        } catch {
            statusEl.textContent = 'Could not subscribe. Try again later.';
            statusEl.className = 'footer-newsletter-status visible error';
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-arrow-right"></i>'; }
        }
    });
})();
