// Homepage behaviour: contact form and gentle reveal.
(function () {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function getApiUrl(configKey, relativePath, productionFallback) {
        const configured = window[configKey];
        if (typeof configured === 'string' && configured.trim()) return configured.trim();
        return window.location.protocol === 'file:' ? productionFallback : relativePath;
    }

    const CONTACT_API_URL   = getApiUrl('CONTACT_API_URL', '/api/contact', 'https://solomonleek.com/api/contact');

    // ── Reveal on scroll (content stays visible if JS or observers fail) ──────
    if (!prefersReducedMotion && 'IntersectionObserver' in window) {
        const targets = document.querySelectorAll('.section__head, .work, .about__body, .split__aside, .cap-row, .xp-row, .stats, .initiatives, .post, .contact__grid');
        document.documentElement.classList.add('js-reveal');
        targets.forEach(el => el.classList.add('reveal'));
        const io = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-in');
                io.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
        targets.forEach(el => io.observe(el));
        // Failsafe for anchors / print / missed callbacks
        setTimeout(() => targets.forEach(el => {
            if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-in');
        }), 1500);
        window.addEventListener('beforeprint', () => targets.forEach(el => el.classList.add('is-in')));
    }

    // ── Contact form ──────────────────────────────────────────────────────────
    const form     = document.getElementById('contactForm');
    const statusEl = document.getElementById('formStatus');
    const msgEl    = document.getElementById('message');
    const leftEl   = document.getElementById('msgCharLeft');

    if (msgEl && leftEl) {
        const max = Number(msgEl.getAttribute('maxlength')) || 2000;
        const update = () => { leftEl.textContent = max - msgEl.value.length; };
        msgEl.addEventListener('input', update);
        update();
    }

    function setStatus(message, type) {
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.className = 'form__status' + (type ? ' ' + type : '');
    }

    function clean(value) {
        return String(value || '').replace(/<[^>]*>/g, '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
    }

    function validate({ name, email, subject, message }) {
        if (name.length < 2)     return ['name', 'Please enter your name.'];
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return ['email', 'Please enter a valid email address.'];
        if (subject.length < 3)  return ['subject', 'Please add a short subject.'];
        if (message.length < 10) return ['message', 'Your message should be at least 10 characters.'];
        return null;
    }

    function mailtoFallback({ name, email, subject, message }) {
        const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
        window.location.href = `mailto:s.leek@alustudent.com?cc=${encodeURIComponent('thionggarang11@gmail.com')}` +
            `&subject=${encodeURIComponent('Portfolio Contact: ' + subject)}&body=${body}`;
    }

    let cooldown = false;

    if (form) {
        form.addEventListener('submit', async e => {
            e.preventDefault();
            if (cooldown) { setStatus('Please wait a minute before sending another message.', 'error'); return; }

            const fields = ['name', 'email', 'subject', 'message'].reduce((acc, id) => {
                const el = document.getElementById(id);
                el.setAttribute('aria-invalid', 'false');
                acc[id] = clean(el.value);
                el.value = acc[id];
                return acc;
            }, {});
            const honeypot = document.getElementById('website');

            if (honeypot && honeypot.value.trim()) { form.reset(); setStatus('Thanks — your message has been sent.', 'success'); return; }

            const problem = validate(fields);
            if (problem) {
                const el = document.getElementById(problem[0]);
                el.setAttribute('aria-invalid', 'true');
                el.focus();
                setStatus(problem[1], 'error');
                return;
            }

            const button = form.querySelector('button[type="submit"]');
            const label  = button.innerHTML;
            button.disabled = true;
            button.textContent = 'Sending…';
            setStatus('', '');

            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 12000);
            try {
                const res  = await fetch(CONTACT_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ ...fields, website: honeypot ? honeypot.value : '' }),
                    signal: controller.signal
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.detail || `Server error (${res.status})`);
                form.reset();
                if (leftEl) leftEl.textContent = msgEl.getAttribute('maxlength') || '2000';
                setStatus(data.message || 'Thanks — your message has been sent. I’ll reply soon.', 'success');
                cooldown = true;
                setTimeout(() => { cooldown = false; }, 60000);
            } catch (err) {
                const msg = (err && err.message || '').toLowerCase();
                if (msg.includes('too many')) {
                    setStatus('Too many messages recently — please try again in an hour.', 'error');
                } else {
                    mailtoFallback(fields);
                    setStatus('Couldn’t reach the server, so your email app has been opened instead.', 'error');
                }
            } finally {
                clearTimeout(timer);
                button.disabled = false;
                button.innerHTML = label;
            }
        });
    }
})();
