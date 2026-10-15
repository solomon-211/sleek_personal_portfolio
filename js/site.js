// Shared site chrome: header state, mobile menu, active link, footer year.
(function () {
    const header  = document.getElementById('siteHeader');
    const menuBtn = document.getElementById('siteMenuBtn');
    const navEl   = document.getElementById('siteNav');

    // ── Scrolled state ────────────────────────────────────────────────────────
    function onScroll() {
        if (header) header.classList.toggle('is-scrolled', window.scrollY > 12);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // ── Mobile menu ───────────────────────────────────────────────────────────
    function setMenu(open) {
        if (!header || !menuBtn) return;
        header.classList.toggle('is-open', open);
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }

    if (menuBtn) {
        menuBtn.addEventListener('click', () => setMenu(!header.classList.contains('is-open')));
    }
    if (navEl) {
        navEl.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
    }
    document.addEventListener('click', e => {
        if (header && header.classList.contains('is-open') && !header.contains(e.target)) setMenu(false);
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && header && header.classList.contains('is-open')) {
            setMenu(false);
            menuBtn.focus();
        }
    });
    window.addEventListener('resize', () => { if (window.innerWidth > 900) setMenu(false); });

    // ── Active link ───────────────────────────────────────────────────────────
    const links = navEl ? Array.from(navEl.querySelectorAll('a[data-nav]')) : [];

    function setActive(key) {
        links.forEach(a => {
            if (a.dataset.nav === key) a.setAttribute('aria-current', 'page');
            else a.removeAttribute('aria-current');
        });
    }

    // Match any path segment so this also works when served from a subfolder (e.g. Live Server)
    const sectionMap = { portfolio: 'portfolio', experience: 'experience', blog: 'blog', articles: 'blog', 'case-study': 'portfolio' };
    const segment = window.location.pathname.split('/').find(part => sectionMap[part]);

    if (segment) {
        setActive(sectionMap[segment]);
    } else {
        // Homepage: follow the section in view
        setActive('home');
        const about = document.getElementById('about');
        if (about && 'IntersectionObserver' in window) {
            new IntersectionObserver(entries => {
                entries.forEach(entry => setActive(entry.isIntersecting ? 'about' : 'home'));
            }, { rootMargin: '-45% 0px -50% 0px' }).observe(about);
        }
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
    document.querySelectorAll('[data-totop]').forEach(el => el.addEventListener('click', e => {
        e.preventDefault();
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    }));
})();
