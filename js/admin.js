/* ── ADMIN.JS — Portfolio CMS ── */
(function () {

    /* ── CONFIG ── */
    const PASS = btoa('solomon2026');    // obfuscated — move to backend for real security
    const STORAGE = {
        articles:  'adm_articles',
        projects:  'adm_projects',
        gallery:   'adm_gallery',
        session:   'adm_session'
    };

    /* ── HELPERS ── */
    function load(key)       { try { return JSON.parse(localStorage.getItem(key)) || []; } catch(e){ return []; } }
    function save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
    function uid()           { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

    function toast(msg, type) {
        const t = document.getElementById('admToast');
        if (!t) return;
        t.textContent = msg;
        t.className = 'adm-toast show ' + (type || '');
        clearTimeout(t._timer);
        t._timer = setTimeout(() => t.className = 'adm-toast', 3000);
    }

    function setStatus(id, msg, type) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = msg;
        el.className = 'adm-form__status ' + (type || '');
    }

    /* ── TAG LABEL MAP ── */
    const TAG_LABELS = {
        engineering: 'Engineering', design: 'Design', leadership: 'Leadership',
        community: 'Community', africa: 'Africa & Tech', student: 'Student Life',
        'case-study': 'Case Study', 'personal-growth': 'Personal Growth'
    };
    const TAG_CLASSES = {
        engineering: 'b-tag--engineering', design: 'b-tag--orange', leadership: 'b-tag--leadership',
        community: 'b-tag--community', africa: 'b-tag--africa', student: 'b-tag--student',
        'case-study': 'b-tag--orange', 'personal-growth': 'b-tag--student'
    };
    const CAT_ICONS = { design: 'fa-pen-nib', dev: 'fa-code', brand: 'fa-layer-group' };
    const CAT_LABELS = { design: 'Design', dev: 'Dev', brand: 'Brand' };

    /* ── AUTH ── */
    const loginScreen = document.getElementById('admLogin');
    const appScreen   = document.getElementById('admApp');
    const loginForm   = document.getElementById('loginForm');
    const loginError  = document.getElementById('loginError');
    const logoutBtn   = document.getElementById('logoutBtn');
    const togglePass  = document.getElementById('togglePass');
    const eyeIcon     = document.getElementById('eyeIcon');
    const loginPassEl = document.getElementById('loginPass');

    function isLoggedIn() { return sessionStorage.getItem(STORAGE.session) === '1'; }

    function showApp() {
        loginScreen.hidden = true;
        appScreen.hidden   = false;
        renderDashboard();
    }

    function showLogin() {
        loginScreen.hidden = false;
        appScreen.hidden   = true;
        sessionStorage.removeItem(STORAGE.session);
    }

    if (isLoggedIn()) showApp();

    loginForm && loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const val = loginPassEl.value.trim();
        if (val === atob(PASS)) {
            sessionStorage.setItem(STORAGE.session, '1');
            loginError.textContent = '';
            showApp();
        } else {
            loginError.textContent = 'Incorrect password. Try again.';
            loginPassEl.value = '';
            loginPassEl.focus();
        }
    });

    logoutBtn && logoutBtn.addEventListener('click', showLogin);

    togglePass && togglePass.addEventListener('click', function () {
        const isPass = loginPassEl.type === 'password';
        loginPassEl.type = isPass ? 'text' : 'password';
        eyeIcon.className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
    });

    /* ── NAVIGATION ── */
    const navBtns     = document.querySelectorAll('.adm-nav-btn');
    const panels      = document.querySelectorAll('.adm-panel');
    const topbarTitle = document.getElementById('topbarTitle');
    const sidebar     = document.getElementById('admSidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');

    function switchPanel(name) {
        panels.forEach(p => p.classList.toggle('active', p.id === 'panel-' + name));
        navBtns.forEach(b => b.classList.toggle('active', b.dataset.panel === name));
        if (topbarTitle) topbarTitle.textContent = name.charAt(0).toUpperCase() + name.slice(1);
        if (name === 'dashboard') renderDashboard();
        if (name === 'manage')    renderManage('articles');
        // close sidebar on mobile
        if (window.innerWidth < 769 && sidebar) sidebar.classList.remove('open');
    }

    navBtns.forEach(btn => btn.addEventListener('click', () => switchPanel(btn.dataset.panel)));

    sidebarToggle && sidebarToggle.addEventListener('click', () => {
        sidebar && sidebar.classList.toggle('open');
    });

    /* ── DASHBOARD ── */
    function renderDashboard() {
        const articles = load(STORAGE.articles);
        const projects = load(STORAGE.projects);
        const gallery  = load(STORAGE.gallery);

        const statsEl = document.getElementById('dashStats');
        if (statsEl) {
            statsEl.innerHTML = [
                { num: articles.length, label: 'Articles' },
                { num: projects.length, label: 'Projects' },
                { num: gallery.length,  label: 'Gallery Items' },
                { num: articles.length + projects.length + gallery.length, label: 'Total Posts' }
            ].map(s => `
                <div class="adm-stat-card">
                    <span class="adm-stat-card__num">${s.num}</span>
                    <span class="adm-stat-card__label">${s.label}</span>
                </div>`).join('');
        }

        const recentEl = document.getElementById('recentPosts');
        if (recentEl) {
            const all = [
                ...articles.map(a => ({ ...a, _type: 'article', _icon: 'fa-newspaper' })),
                ...projects.map(p => ({ ...p, _type: 'project', _icon: 'fa-layer-group' })),
                ...gallery.map(g  => ({ ...g, _type: 'gallery', _icon: 'fa-images' }))
            ].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 8);

            recentEl.innerHTML = all.length ? all.map(item => `
                <div class="adm-recent-item">
                    <div class="adm-recent-item__icon"><i class="fas ${item._icon}"></i></div>
                    <span class="adm-recent-item__title">${escHtml(item.title)}</span>
                    <span class="adm-recent-item__type">${item._type}</span>
                </div>`).join('') :
                '<p style="color:var(--adm-muted);font-size:0.85rem;">No posts yet. Start by adding an article, project, or gallery item.</p>';
        }
    }

    /* ── ARTICLE FORM ── */
    const articleForm = document.getElementById('articleForm');
    articleForm && articleForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const fd = new FormData(this);
        const item = {
            id:        uid(),
            createdAt: Date.now(),
            title:     fd.get('title').trim(),
            tag:       fd.get('tag'),
            date:      fd.get('date').trim(),
            readTime:  fd.get('readTime').trim(),
            excerpt:   fd.get('excerpt').trim(),
            image:     fd.get('image').trim(),
            slug:      fd.get('slug').trim().replace(/\.html$/, ''),
            content:   fd.get('content').trim()
        };
        if (!item.title || !item.tag || !item.date || !item.readTime || !item.excerpt || !item.slug) {
            setStatus('articleStatus', '⚠ Please fill in all required fields.', 'error');
            return;
        }
        const articles = load(STORAGE.articles);
        articles.unshift(item);
        save(STORAGE.articles, articles);
        setStatus('articleStatus', '✓ Article published! It now appears in the Blog section.', 'success');
        toast('Article published!', 'success');
        this.reset();
    });

    /* ── PORTFOLIO FORM ── */
    const portfolioForm = document.getElementById('portfolioForm');
    portfolioForm && portfolioForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const fd = new FormData(this);
        const item = {
            id:          uid(),
            createdAt:   Date.now(),
            title:       fd.get('title').trim(),
            category:    fd.get('category'),
            description: fd.get('description').trim(),
            image:       fd.get('image').trim(),
            tags:        fd.get('tags').trim(),
            liveUrl:     fd.get('liveUrl').trim(),
            githubUrl:   fd.get('githubUrl').trim(),
            featured:    fd.get('featured') === 'on'
        };
        if (!item.title || !item.category || !item.description) {
            setStatus('portfolioStatus', '⚠ Please fill in all required fields.', 'error');
            return;
        }
        const projects = load(STORAGE.projects);
        projects.unshift(item);
        save(STORAGE.projects, projects);
        setStatus('portfolioStatus', '✓ Project added! It now appears in the Portfolio section.', 'success');
        toast('Project added!', 'success');
        this.reset();
    });

    /* ── GALLERY FORM ── */
    const galleryForm = document.getElementById('galleryForm');
    galleryForm && galleryForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const fd = new FormData(this);
        const item = {
            id:        uid(),
            createdAt: Date.now(),
            title:     fd.get('title').trim(),
            category:  fd.get('category'),
            image:     fd.get('image').trim(),
            alt:       fd.get('alt').trim() || fd.get('title').trim()
        };
        if (!item.title || !item.image) {
            setStatus('galleryStatus', '⚠ Please fill in all required fields.', 'error');
            return;
        }
        const gallery = load(STORAGE.gallery);
        gallery.unshift(item);
        save(STORAGE.gallery, gallery);
        setStatus('galleryStatus', '✓ Gallery item added! It now appears in the Gallery section.', 'success');
        toast('Gallery item added!', 'success');
        this.reset();
    });

    /* ── MANAGE PANEL ── */
    const manageTabs = document.querySelectorAll('.adm-tab');
    manageTabs.forEach(tab => tab.addEventListener('click', function () {
        manageTabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        renderManage(this.dataset.tab);
    }));

    function renderManage(tab) {
        const el = document.getElementById('manageContent');
        if (!el) return;

        if (tab === 'articles') {
            const items = load(STORAGE.articles);
            el.innerHTML = items.length ? items.map(a => `
                <div class="adm-manage-item">
                    ${a.image
                        ? `<img src="${escHtml(a.image)}" alt="${escHtml(a.title)}" class="adm-manage-item__thumb">`
                        : `<div class="adm-manage-item__thumb adm-manage-item__thumb--placeholder"><i class="fas fa-newspaper"></i></div>`}
                    <div class="adm-manage-item__body">
                        <p class="adm-manage-item__title">${escHtml(a.title)}</p>
                        <p class="adm-manage-item__meta">${escHtml(a.tag)} · ${escHtml(a.date)} · ${escHtml(a.readTime)}</p>
                    </div>
                    <div class="adm-manage-item__actions">
                        <button class="adm-btn adm-btn--danger" onclick="admDelete('articles','${a.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>`).join('') : emptyState('No articles published yet.');

        } else if (tab === 'projects') {
            const items = load(STORAGE.projects);
            el.innerHTML = items.length ? items.map(p => `
                <div class="adm-manage-item">
                    ${p.image
                        ? `<img src="${escHtml(p.image)}" alt="${escHtml(p.title)}" class="adm-manage-item__thumb">`
                        : `<div class="adm-manage-item__thumb adm-manage-item__thumb--placeholder"><i class="fas fa-layer-group"></i></div>`}
                    <div class="adm-manage-item__body">
                        <p class="adm-manage-item__title">${escHtml(p.title)}</p>
                        <p class="adm-manage-item__meta">${escHtml(p.category)}${p.featured ? ' · ⭐ Featured' : ''}</p>
                    </div>
                    <div class="adm-manage-item__actions">
                        <button class="adm-btn adm-btn--danger" onclick="admDelete('projects','${p.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>`).join('') : emptyState('No projects added yet.');

        } else if (tab === 'gallery') {
            const items = load(STORAGE.gallery);
            el.innerHTML = items.length ? items.map(g => `
                <div class="adm-manage-item">
                    <img src="${escHtml(g.image)}" alt="${escHtml(g.alt)}" class="adm-manage-item__thumb">
                    <div class="adm-manage-item__body">
                        <p class="adm-manage-item__title">${escHtml(g.title)}</p>
                        <p class="adm-manage-item__meta">${escHtml(g.category)}</p>
                    </div>
                    <div class="adm-manage-item__actions">
                        <button class="adm-btn adm-btn--danger" onclick="admDelete('gallery','${g.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>`).join('') : emptyState('No gallery items added yet.');
        }
    }

    function emptyState(msg) {
        return `<div class="adm-manage-empty"><i class="fas fa-inbox"></i><p>${msg}</p></div>`;
    }

    /* ── DELETE (exposed globally for inline onclick) ── */
    window.admDelete = function (storeKey, id) {
        if (!confirm('Delete this item? This cannot be undone.')) return;
        const key = STORAGE[storeKey];
        const items = load(key).filter(i => i.id !== id);
        save(key, items);
        toast('Deleted.', 'error');
        // re-render active tab
        const activeTab = document.querySelector('.adm-tab.active');
        if (activeTab) renderManage(activeTab.dataset.tab);
        renderDashboard();
    };

    /* ── ESCAPE HTML ── */
    function escHtml(str) {
        return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    /* ── EXPOSE STORAGE KEYS & HELPERS for other pages ── */
    window.ADM_STORAGE = STORAGE;
    window.admLoad     = load;

})();


/* ════════════════════════════════════════════════════════════
   DYNAMIC CONTENT INJECTORS — called on blog/portfolio/gallery
   ════════════════════════════════════════════════════════════ */

/**
 * Call this on blog.html to inject dynamic articles into the feed.
 */
window.admInjectBlogArticles = function () {
    const STORAGE_KEY = 'adm_articles';
    function load(k) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch(e){ return []; } }
    function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    const articles = load(STORAGE_KEY);
    if (!articles.length) return;

    const feed = document.querySelector('.b-feed');
    if (!feed) return;

    const TAG_CLASSES = {
        engineering:'b-tag--engineering', design:'b-tag--orange', leadership:'b-tag--leadership',
        community:'b-tag--community', africa:'b-tag--africa', student:'b-tag--student',
        'case-study':'b-tag--orange', 'personal-growth':'b-tag--student'
    };
    const TAG_LABELS = {
        engineering:'Engineering', design:'Design', leadership:'Leadership',
        community:'Community', africa:'Africa & Tech', student:'Student Life',
        'case-study':'Case Study', 'personal-growth':'Personal Growth'
    };

    // Update count
    const countEl = document.getElementById('bFeedCount');
    const staticCount = feed.querySelectorAll('.b-post').length;
    if (countEl) countEl.textContent = staticCount + articles.length;

    articles.forEach(function (a) {
        const href = a.slug ? 'html/articles/' + a.slug + '.html' : '#';
        const tagClass = TAG_CLASSES[a.tag] || 'b-tag--orange';
        const tagLabel = TAG_LABELS[a.tag] || a.tag;

        const article = document.createElement('article');
        article.className = 'b-post b-post--published';
        article.dataset.tags = a.tag || '';
        article.dataset.href = href;
        article.innerHTML = `
            <div class="b-post__body">
                <div class="b-post__top">
                    <span class="b-tag ${escHtml(tagClass)}">${escHtml(tagLabel)}</span>
                    <span class="b-post__live"><i class="fas fa-circle"></i> Published</span>
                </div>
                <h3 class="b-post__title">${escHtml(a.title)}</h3>
                <p class="b-post__excerpt">${escHtml(a.excerpt)}</p>
                <div class="b-post__footer">
                    <div class="b-post__author">
                        <div class="b-avatar b-avatar--sm" style="overflow:hidden;padding:0;">
                            <img src="images/photo.jpg" alt="Solomon Thiong" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">
                        </div>
                        <div>
                            <span class="b-post__author-name">Solomon Thiong</span>
                            <span class="b-post__meta">${escHtml(a.date)} &nbsp;·&nbsp; ${escHtml(a.readTime)}</span>
                        </div>
                    </div>
                    <div class="b-post__actions">
                        <a href="${escHtml(href)}" class="b-post__read-btn">Read <i class="fas fa-arrow-right"></i></a>
                    </div>
                </div>
            </div>
            ${a.image
                ? `<div class="b-post__thumb"><img src="${escHtml(a.image)}" alt="${escHtml(a.title)}" loading="lazy"></div>`
                : `<div class="b-post__thumb b-post__thumb--placeholder" style="background:linear-gradient(135deg,rgba(234,88,12,0.15),rgba(249,115,22,0.08));"><i class="fas fa-newspaper" style="color:#f97316;"></i></div>`
            }`;

        // Insert before the empty state div
        const emptyEl = document.getElementById('bFeedEmpty');
        if (emptyEl) feed.insertBefore(article, emptyEl);
        else feed.appendChild(article);

        // Make clickable
        article.style.cursor = 'pointer';
        article.addEventListener('click', function (e) {
            if (e.target.closest('a')) return;
            window.location.href = href;
        });
    });
};


/**
 * Call this on portfolio.html to inject dynamic projects.
 */
window.admInjectPortfolioProjects = function () {
    const STORAGE_KEY = 'adm_projects';
    function load(k) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch(e){ return []; } }
    function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    const projects = load(STORAGE_KEY);
    if (!projects.length) return;

    const GRID_IDS = { design: 'pf-design-grid', dev: 'pf-dev-grid', brand: 'pf-brand-grid' };
    const CHIP_CLASSES = { design: '', dev: 'pf-card__chip--dev', brand: 'pf-card__chip--brand' };
    const CHIP_ICONS   = { design: 'fa-pen-nib', dev: 'fa-code', brand: 'fa-layer-group' };
    const CHIP_LABELS  = { design: 'Design', dev: 'Dev', brand: 'Brand' };

    projects.forEach(function (p) {
        const gridId = GRID_IDS[p.category] || 'pf-design-grid';
        const grid = document.getElementById(gridId);
        if (!grid) return;

        const tags = p.tags ? p.tags.split(',').map(t => `<span class="pf-card__tag">${escHtml(t.trim())}</span>`).join('') : '';
        const links = [
            p.liveUrl   ? `<a href="${escHtml(p.liveUrl)}" target="_blank" class="pf-card__link"><i class="fas fa-external-link-alt"></i></a>` : '',
            p.githubUrl ? `<a href="${escHtml(p.githubUrl)}" target="_blank" class="pf-card__link"><i class="fab fa-github"></i></a>` : ''
        ].join('');

        const card = document.createElement('div');
        card.className = 'pf-card';
        card.innerHTML = `
            <div class="pf-card__image">
                ${p.image
                    ? `<img src="${escHtml(p.image)}" alt="${escHtml(p.title)}" loading="lazy">`
                    : `<div class="pf-code-preview" aria-hidden="true"><span class="pf-code-tag">${escHtml(p.title)}</span></div>`}
                <div class="pf-card__overlay"><div>${links}</div></div>
            </div>
            <div class="pf-card__body">
                ${p.featured ? '<span class="pf-card__status"><i class="fas fa-circle"></i> Featured</span>' : ''}
                <h3 class="pf-card__title">${escHtml(p.title)}</h3>
                <span class="pf-card__chip ${escHtml(CHIP_CLASSES[p.category] || '')}">
                    <i class="fas ${CHIP_ICONS[p.category] || 'fa-layer-group'}"></i> ${CHIP_LABELS[p.category] || p.category}
                </span>
                <p class="pf-card__desc">${escHtml(p.description)}</p>
                <div class="pf-card__tags">${tags}</div>
            </div>`;

        grid.appendChild(card);
    });

    // Update counts in filter buttons
    ['design','dev','brand'].forEach(function (cat) {
        const grid = document.getElementById(GRID_IDS[cat]);
        if (!grid) return;
        const btn = document.querySelector(`.pf-filter-btn[data-cat="${cat}"] .pf-filter-count`);
        if (btn) btn.textContent = grid.querySelectorAll('.pf-card').length;
    });
    const allBtn = document.querySelector('.pf-filter-btn[data-cat="all"] .pf-filter-count');
    if (allBtn) {
        const total = document.querySelectorAll('.pf-card').length;
        allBtn.textContent = total;
    }
};


/**
 * Call this on gallery.html to inject dynamic gallery items.
 */
window.admInjectGalleryItems = function () {
    const STORAGE_KEY = 'adm_gallery';
    function load(k) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch(e){ return []; } }
    function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    const items = load(STORAGE_KEY);
    if (!items.length) return;

    const grid = document.getElementById('galleryGrid');
    if (!grid) return;

    const TAG_CLASS = {
        design:'g-item__tag--design', events:'g-item__tag--events',
        community:'g-item__tag--community', personal:'g-item__tag--personal',
        logos:'g-item__tag--logos', all:'g-item__tag--design'
    };

    items.forEach(function (g) {
        const div = document.createElement('div');
        div.className = 'g-item';
        div.dataset.category = g.category || 'all';
        div.dataset.title    = g.title;
        div.dataset.desc     = g.alt || g.title;
        div.innerHTML = `
            <div class="g-item__img-wrap">
                <img src="${escHtml(g.image)}" alt="${escHtml(g.alt || g.title)}" loading="lazy">
                <div class="g-item__overlay">
                    <button class="g-item__zoom" aria-label="View full image"><i class="fas fa-expand"></i></button>
                </div>
            </div>
            <div class="g-item__info">
                <span class="g-item__tag ${escHtml(TAG_CLASS[g.category] || 'g-item__tag--design')}">${escHtml(g.category || 'Design')}</span>
                <p class="g-item__title">${escHtml(g.title)}</p>
            </div>`;

        grid.appendChild(div);
    });

    // Update stats count
    const statEl = document.querySelector('.g-hero__stats strong');
    if (statEl) {
        const total = grid.querySelectorAll('.g-item').length;
        statEl.textContent = total;
    }
};
