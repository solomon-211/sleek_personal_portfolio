/* ── Self-hosted analytics: pageviews + section views, no cookies ── */
(function () {
    if (location.hostname !== 'solomonleek.com') return;

    var API = window.ANALYTICS_API_URL || 'https://solomonleek.com/api/analytics';

    function send(data) {
        fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            keepalive: true
        }).catch(function () {});
    }

    send({ page: location.pathname, referrer: document.referrer, event: 'pageview' });

    if ('IntersectionObserver' in window) {
        document.addEventListener('DOMContentLoaded', function () {
            var obs = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting && entry.target.id) {
                        send({ page: location.pathname, section: entry.target.id, event: 'section_view' });
                    }
                });
            }, { threshold: 0.4 });
            document.querySelectorAll('section[id]').forEach(function (s) { obs.observe(s); });
        });
    }
})();
