/**
 * Theme Listener — used by iframe pages (home.html, tech.html, etc.)
 * The synchronous theme application is done by theme-tokens.js.
 * This file only handles live theme updates from the parent shell.
 */
(function () {
    'use strict';

    function applyVars(vars) {
        const root = document.documentElement;
        for (const key in vars) {
            root.style.setProperty(key, vars[key]);
        }
    }

    /* Listen for theme updates broadcast from the parent shell.
       The initial theme was already applied synchronously by theme-tokens.js. */
    window.addEventListener('message', function (e) {
        const data = e.data;
        if (!data || typeof data !== 'object') return;

        if (data.type === 'qinblog-theme' && data.vars) {
            applyVars(data.vars);
        } else if (data.type === 'qinblog-theme-request') {
            const parent = window.parent;
            if (parent && parent !== window) {
                parent.postMessage({ type: 'qinblog-theme-response' }, '*');
            }
        }
    });

    /* Announce readiness so the parent can push the current theme to us */
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'qinblog-theme-ready' }, '*');
    }

    /* Persist theme changes triggered by the themeChanged event */
    window.addEventListener('themeChanged', function (e) {
        if (e && e.detail && e.detail.theme) {
            try { localStorage.setItem('qinblog-theme', e.detail.theme); } catch (err) { /* ignore */ }
        }
    });

    /* Expose a helper for other scripts to query current mode */
    window.getThemeMode = function () {
        const bg = getComputedStyle(document.documentElement)
            .getPropertyValue('--bg-primary').trim();
        return (bg === '#0C0A09' || bg === '#0c0a09') ? 'dark' : 'light';
    };
})();
