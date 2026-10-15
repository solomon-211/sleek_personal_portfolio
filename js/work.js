// Portfolio page: segmented filter and image lightbox.
(function () {
    const bento   = document.getElementById('bento');
    const seg     = document.querySelector('.seg');
    if (!bento || !seg) return;

    const tiles   = Array.from(bento.querySelectorAll('.tile'));
    const buttons = Array.from(seg.querySelectorAll('.seg__btn'));

    // ── Segmented filter ──────────────────────────────────────────────────────
    function moveIndicator(btn) {
        seg.style.setProperty('--seg-w', btn.offsetWidth + 'px');
        seg.style.setProperty('--seg-x', (btn.offsetLeft - 4) + 'px');
    }

    function applyFilter(btn) {
        const filter = btn.dataset.filter;
        buttons.forEach(b => {
            const on = b === btn;
            b.setAttribute('aria-selected', String(on));
            b.tabIndex = on ? 0 : -1;
        });
        moveIndicator(btn);
        bento.classList.toggle('is-filtered', filter !== 'all');
        tiles.forEach(tile => {
            const show = filter === 'all' || tile.dataset.cat === filter;
            tile.hidden = !show;
            if (show) {
                // Restart the entrance animation so the change reads clearly
                tile.style.animation = 'none';
                void tile.offsetWidth;
                tile.style.animation = '';
            }
        });
    }

    buttons.forEach((btn, i) => {
        btn.tabIndex = btn.getAttribute('aria-selected') === 'true' ? 0 : -1;
        btn.addEventListener('click', () => applyFilter(btn));
        btn.addEventListener('keydown', e => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            const next = buttons[(i + (e.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length];
            next.focus();
            applyFilter(next);
        });
    });

    const current = () => buttons.find(b => b.getAttribute('aria-selected') === 'true') || buttons[0];
    moveIndicator(current());
    window.addEventListener('resize', () => moveIndicator(current()));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => moveIndicator(current()));

    // ── Lightbox ──────────────────────────────────────────────────────────────
    const box = document.getElementById('lightbox');
    if (!box || typeof box.showModal !== 'function') {
        // No <dialog> support: open the image directly instead
        bento.querySelectorAll('[data-lightbox]').forEach(btn =>
            btn.addEventListener('click', () => window.open(btn.dataset.lightbox, '_blank', 'noopener')));
        return;
    }

    const img     = document.getElementById('lightboxImg');
    const stage   = box.querySelector('.lightbox__stage');
    const kicker  = document.getElementById('lightboxKicker');
    const title   = document.getElementById('lightboxTitle');
    const desc    = document.getElementById('lightboxDesc');
    let opener    = null;

    bento.querySelectorAll('[data-lightbox]').forEach(btn => {
        btn.addEventListener('click', () => {
            const thumb = btn.querySelector('img');
            img.src = btn.dataset.lightbox;
            img.alt = thumb ? thumb.alt : '';
            stage.classList.toggle('is-product', !!btn.querySelector('.tile__media--product'));
            kicker.textContent = btn.querySelector('.tile__kicker').textContent.trim();
            title.textContent  = btn.querySelector('.tile__title').textContent.trim();
            desc.textContent   = btn.querySelector('.tile__desc').textContent.trim();
            opener = btn;
            document.body.classList.add('has-lightbox');
            box.showModal();
        });
    });

    function close() { box.close(); }
    box.querySelector('.lightbox__close').addEventListener('click', close);
    // Click on the backdrop (outside the dialog box) closes it
    box.addEventListener('click', e => {
        const r = box.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
    });
    box.addEventListener('close', () => {
        document.body.classList.remove('has-lightbox');
        if (opener) opener.focus();
    });
})();
