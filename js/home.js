// Homepage behaviour: contact form and hero video.
(function () {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function getApiUrl(configKey, relativePath, productionFallback) {
        const configured = window[configKey];
        if (typeof configured === 'string' && configured.trim()) return configured.trim();
        return window.location.protocol === 'file:' ? productionFallback : relativePath;
    }

    const CONTACT_API_URL   = getApiUrl('CONTACT_API_URL', '/api/contact', 'https://solomonleek.com/api/contact');

    // ── Hero video: respect reduced-motion, keep the poster frame instead ─────
    const heroVideo = document.querySelector('.hero__video');
    // Slow motion; re-applied on load because some browsers reset the rate then
    if (heroVideo) {
        const setSlowMotion = () => { heroVideo.defaultPlaybackRate = 0.5; heroVideo.playbackRate = 0.5; };
        setSlowMotion();
        heroVideo.addEventListener('loadedmetadata', setSlowMotion);
    }
    if (heroVideo && prefersReducedMotion) {
        heroVideo.removeAttribute('autoplay');
        heroVideo.pause();
    }

    // ── Hero headline: types in word by word, holds, deletes backwards, repeats ─
    const heroTitle = document.getElementById('heroTitle');
    if (heroTitle && !prefersReducedMotion) {
        const steps = [];   // each step is the group of spans shown together
        heroTitle.setAttribute('aria-label', heroTitle.textContent.replace(/\s+/g, ' ').trim());

        function splitWords(node) {
            Array.from(node.childNodes).forEach(child => {
                if (child.nodeType !== Node.TEXT_NODE) { splitWords(child); return; }
                const parts = child.textContent.split(/(\s+)/).filter(Boolean);
                const frag = document.createDocumentFragment();
                parts.forEach(part => {
                    if (/^\s+$/.test(part)) { frag.append(' '); return; }
                    const span = document.createElement('span');
                    span.className = 'hero__word';
                    span.textContent = part;
                    span.setAttribute('aria-hidden', 'true');
                    frag.append(span);
                    // Punctuation appears with the word before it
                    if (/^[.,]$/.test(part) && steps.length) steps[steps.length - 1].push(span);
                    else steps.push([span]);
                });
                child.replaceWith(frag);
            });
        }
        splitWords(heroTitle);

        const caret = document.createElement('span');
        caret.className = 'hero__caret';
        caret.setAttribute('aria-hidden', 'true');

        const TYPE = 280, DELETE = 130, HOLD = 2600, REST = 500;
        let shown = 0, deleting = false;

        function render() {
            steps.forEach((group, i) => group.forEach(s => s.classList.toggle('is-on', i < shown)));
            const anchor = shown ? steps[shown - 1] : steps[0];
            const last = anchor[anchor.length - 1];
            if (shown) last.after(caret); else last.before(caret);
        }
        function tick() {
            if (!deleting && shown < steps.length) {
                shown++; render();
                setTimeout(tick, shown === steps.length ? HOLD : TYPE);
                if (shown === steps.length) deleting = true;
            } else if (deleting && shown > 0) {
                shown--; render();
                setTimeout(tick, shown === 0 ? REST : DELETE);
                if (shown === 0) deleting = false;
            }
        }
        heroTitle.classList.add('is-typing');
        render();
        setTimeout(tick, 300);
    }

    // ── Selected work: choosing a project swaps the stage and opens its details ─
    const shows  = Array.from(document.querySelectorAll('.show'));
    const stages = Array.from(document.querySelectorAll('.stage__item'));
    function selectShow(index) {
        shows.forEach((show, i) => {
            const on = i === index;
            show.classList.toggle('is-active', on);
            show.querySelector('.show__tab').setAttribute('aria-expanded', String(on));
            show.querySelector('.show__panel').hidden = !on;
            stages[i].classList.toggle('is-active', on);
        });
    }
    shows.forEach((show, i) => show.querySelector('.show__tab').addEventListener('click', () => selectShow(i)));
    if (shows.length) selectShow(0);

    // ── Contact form ──────────────────────────────────────────────────────────
    const form     = document.getElementById('contactForm');
    const statusEl = document.getElementById('formStatus');

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
