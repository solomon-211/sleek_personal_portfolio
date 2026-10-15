// Blog index: topic filter + search (with URL state), counts, cursor preview.
(function () {
    const seg = document.querySelector('.index .seg');
    if (!seg) return;

    const buttons = Array.from(seg.querySelectorAll('.seg__btn'));
    const feature = document.querySelector('.feature');
    const years   = Array.from(document.querySelectorAll('.year'));
    const entries = Array.from(document.querySelectorAll('.entry'));
    const empty   = document.querySelector('.index__empty');
    const countEl = document.getElementById('indexCount');
    const search  = document.getElementById('journalSearch');

    // Everything that can be searched or filtered, with its original text kept for highlighting
    const items = [feature, ...entries].filter(Boolean).map(el => {
        const fields = Array.from(el.querySelectorAll('.entry__title, .entry__excerpt, .feature__title a, .feature__excerpt'));
        fields.forEach(f => { f.dataset.text = f.textContent; });
        return { el, fields, topics: (el.dataset.topics || '').split(' '), haystack: fields.map(f => f.textContent).join(' ').toLowerCase() };
    });
    const total = items.length;

    // ── Topic counts ──────────────────────────────────────────────────────────
    buttons.forEach(btn => {
        const t = btn.dataset.filter;
        const n = t === 'all' ? total : items.filter(i => i.topics.includes(t)).length;
        const badge = document.createElement('span');
        badge.className = 'seg__count';
        badge.textContent = n;
        badge.setAttribute('aria-label', n + ' articles');
        btn.append(' ', badge);
    });

    // ── State ─────────────────────────────────────────────────────────────────
    const state = { topic: 'all', q: '' };

    // Match from the start of a word, so "alu" finds "ALU" but not "alumni"
    const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordMatch = (text, q) => new RegExp('\\b' + escapeRe(q), 'i').test(text);

    function escapeHtml(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function highlight(field, q) {
        const text = field.dataset.text;
        if (!q) { field.textContent = text; return; }
        const re = new RegExp('\\b(' + escapeRe(q) + ')', 'ig');
        field.innerHTML = escapeHtml(text).replace(re, '<mark>$1</mark>');
    }

    function moveIndicator(btn) {
        seg.style.setProperty('--seg-w', btn.offsetWidth + 'px');
        seg.style.setProperty('--seg-x', (btn.offsetLeft - 4) + 'px');
    }

    function render(pushUrl) {
        const q = state.q.trim().toLowerCase();
        let shown = 0;
        items.forEach(item => {
            const ok = (state.topic === 'all' || item.topics.includes(state.topic)) && (!q || wordMatch(item.haystack, q));
            item.el.hidden = !ok;
            if (ok) shown++;
            item.fields.forEach(f => highlight(f, q));
        });
        years.forEach(y => { y.hidden = !y.querySelector('.entry:not([hidden])'); });
        if (empty) empty.hidden = shown > 0;
        if (countEl) countEl.textContent = shown === total ? total + ' articles' : shown + ' of ' + total + ' articles';

        const btn = buttons.find(b => b.dataset.filter === state.topic) || buttons[0];
        buttons.forEach(b => {
            const on = b === btn;
            b.setAttribute('aria-selected', String(on));
            b.tabIndex = on ? 0 : -1;
        });
        moveIndicator(btn);

        if (pushUrl) {
            const params = new URLSearchParams();
            if (state.topic !== 'all') params.set('topic', state.topic);
            if (state.q.trim()) params.set('q', state.q.trim());
            const url = location.pathname + (params.toString() ? '?' + params : '') + location.hash;
            history.replaceState(state, '', url);
        }
    }

    function readUrl() {
        const params = new URLSearchParams(location.search);
        const topic = params.get('topic');
        state.topic = buttons.some(b => b.dataset.filter === topic) ? topic : 'all';
        state.q = params.get('q') || '';
        if (search) search.value = state.q;
    }

    // ── Events ────────────────────────────────────────────────────────────────
    buttons.forEach((btn, i) => {
        btn.addEventListener('click', () => { state.topic = btn.dataset.filter; render(true); });
        btn.addEventListener('keydown', e => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            const next = buttons[(i + (e.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length];
            next.focus();
            state.topic = next.dataset.filter;
            render(true);
        });
    });

    if (search) {
        let timer;
        search.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(() => { state.q = search.value; render(true); }, 120);
        });
        search.addEventListener('keydown', e => {
            if (e.key === 'Escape') { search.value = ''; state.q = ''; render(true); search.blur(); }
        });
        // "/" focuses search from anywhere on the page (unless typing in a field)
        document.addEventListener('keydown', e => {
            if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
            const tag = (document.activeElement && document.activeElement.tagName) || '';
            if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
            e.preventDefault();
            search.focus();
        });
    }

    const reset = document.querySelector('.index__reset');
    if (reset) reset.addEventListener('click', () => {
        state.topic = 'all'; state.q = '';
        if (search) search.value = '';
        render(true);
    });

    readUrl();
    render(false);
    window.addEventListener('popstate', () => { readUrl(); render(false); });
    window.addEventListener('resize', () => moveIndicator(buttons.find(b => b.getAttribute('aria-selected') === 'true') || buttons[0]));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => render(false));

    // ── Cursor preview ────────────────────────────────────────────────────────
    const peek = document.querySelector('.peek');
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!peek || !fine || reduce) return;

    const peekImg = peek.querySelector('img');
    let frame = null;

    document.querySelectorAll('.entry[data-preview]').forEach(entry => {
        const src = entry.dataset.preview;
        new Image().src = src; // warm the cache so the preview appears instantly
        entry.addEventListener('mouseenter', () => { peekImg.src = src; peek.classList.add('is-on'); });
        entry.addEventListener('mouseleave', () => peek.classList.remove('is-on'));
        entry.addEventListener('mousemove', e => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = null;
                const x = Math.min(e.clientX + 28, window.innerWidth - peek.offsetWidth - 16);
                const y = Math.max(16, e.clientY - peek.offsetHeight - 24);
                peek.style.setProperty('--peek-x', x + 'px');
                peek.style.setProperty('--peek-y', y + 'px');
            });
        });
    });
})();
