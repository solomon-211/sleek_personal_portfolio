/* ── Tactile 3D tilt + flip reveal for project cards ──────────────────────────
   Shared by html/index.html (.project-card) and html/portfolio.html (.pf-card).
   Progressive enhancement: builds the flip structure at runtime so the
   underlying HTML stays plain markup + an <img>/<code-preview> + overlay link. */
(function () {
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var isTouch = window.matchMedia('(hover: none)').matches;
    var MAX_TILT = 8; // degrees

    function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function buildFlip(imageEl, card, titleSel, chipSel) {
        if (!imageEl || imageEl.dataset.flipReady) return;
        imageEl.dataset.flipReady = '1';

        var mediaEl   = imageEl.querySelector('img, .project-code-preview, .pf-code-preview');
        var overlayEl = imageEl.querySelector('.project-overlay, .pf-card__overlay');
        if (!mediaEl) return;

        var linkEls  = overlayEl ? Array.prototype.slice.call(overlayEl.querySelectorAll('a')) : [];
        var titleEl  = card.querySelector(titleSel);
        var chipIcon = card.querySelector(chipSel + ' i');

        var linksHtml = linkEls.map(function (a) {
            return '<a href="' + esc(a.href) + '" target="_blank" rel="noopener noreferrer" class="card-flip__link" aria-label="' +
                esc(a.getAttribute('aria-label') || 'Open link') + '">' + a.innerHTML + '</a>';
        }).join('');

        var inner = document.createElement('div');
        inner.className = 'card-flip__inner';

        var front = document.createElement('div');
        front.className = 'card-flip__face card-flip__face--front';
        front.appendChild(mediaEl);

        var back = document.createElement('div');
        back.className = 'card-flip__face card-flip__face--back';
        back.innerHTML =
            '<i class="' + esc(chipIcon ? chipIcon.className : 'fas fa-eye') + ' card-flip__icon"></i>' +
            (titleEl ? '<p class="card-flip__title">' + esc(titleEl.textContent) + '</p>' : '') +
            (linksHtml ? '<div class="card-flip__links">' + linksHtml + '</div>' : '');

        imageEl.innerHTML = '';
        imageEl.classList.add('card-flip');
        inner.appendChild(front);
        inner.appendChild(back);
        imageEl.appendChild(inner);

        if (isTouch) {
            imageEl.addEventListener('click', function (e) {
                if (e.target.closest('a')) return;
                e.preventDefault();
                imageEl.classList.toggle('is-flipped');
            });
        }
    }

    function enableTilt(card) {
        if (prefersReducedMotion || isTouch) return;
        card.addEventListener('mousemove', function (e) {
            var rect = card.getBoundingClientRect();
            var px = (e.clientX - rect.left) / rect.width - 0.5;
            var py = (e.clientY - rect.top) / rect.height - 0.5;
            card.style.setProperty('--tilt-x', (-py * MAX_TILT).toFixed(2) + 'deg');
            card.style.setProperty('--tilt-y', (px * MAX_TILT).toFixed(2) + 'deg');
        });
        card.addEventListener('mouseleave', function () {
            card.style.setProperty('--tilt-x', '0deg');
            card.style.setProperty('--tilt-y', '0deg');
        });
    }

    function init() {
        document.querySelectorAll('.project-card').forEach(function (card) {
            buildFlip(card.querySelector('.project-image'), card, '.project-title', '.project-category-chip');
            enableTilt(card);
        });
        document.querySelectorAll('.pf-card').forEach(function (card) {
            buildFlip(card.querySelector('.pf-card__image'), card, '.pf-card__title', '.pf-card__chip');
            enableTilt(card);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
