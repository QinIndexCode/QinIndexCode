/* ========================================
   QinIndexCode - Shell Application Logic
   ========================================
   Handles the iframe-based SPA shell:
   - Page navigation (PageSlider)
   - Theme switching (synced to child iframes)
   - Mobile sidebar toggle
   - Site uptime display
   ======================================== */

(function () {
    'use strict';

    /* ----------------------------------------
       Service Worker Registration
       ---------------------------------------- */
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .catch(err => console.warn('SW registration failed:', err));
        });
    }

    /* ----------------------------------------
       URL Parameter Handling (Deep Linking)
       ---------------------------------------- */
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect');
    const fromPage = urlParams.get('from');
    // 保留 hash 片段（如 /blogs#001 重定向后变为 index.html?from=blogs#001）
    const initialHash = window.location.hash;
    let initialPage = 'home';
    let shouldSwitchPage = false;

    if (redirect) {
        try {
            const redirectUrl = new URL(redirect);
            const pageName = redirectUrl.pathname.split('/').pop().replace('.html', '') || 'home';
            initialPage = pageName;
            shouldSwitchPage = true;
        } catch (e) {
            console.warn('Parse redirect URL failed:', e);
        }
    } else if (fromPage) {
        initialPage = fromPage;
        shouldSwitchPage = true;
    }

    /* ----------------------------------------
       Theme Definitions
       ---------------------------------------- */
    const lightTheme = (window.QINBLOG_THEMES && window.QINBLOG_THEMES.light) || null;
    const darkTheme = (window.QINBLOG_THEMES && window.QINBLOG_THEMES.dark) || null;

    let isDarkMode = (function () {
        try {
            const stored = localStorage.getItem('qinblog-theme');
            if (stored === 'light') return false;
            if (stored === 'dark') return true;
        } catch (e) { /* localStorage may be blocked */ }
        // No explicit choice — check what theme-tokens.js actually applied
        // (it respects prefers-color-scheme as a fallback)
        const bg = document.documentElement.style.getPropertyValue('--bg-primary').trim();
        if (bg) return bg === '#0C0A09' || bg === '#0c0a09';
        return true;
    })();

    function broadcastTheme(themeVars, target) {
        const msg = { type: 'qinblog-theme', vars: themeVars };
        const origin = window.location.origin;
        if (target) {
            try { target.postMessage(msg, origin); } catch (e) { /* ignore */ }
            return;
        }
        document.querySelectorAll('iframe').forEach(frame => {
            try { frame.contentWindow.postMessage(msg, origin); } catch (e) { /* ignore */ }
        });
    }

    /* Backward-compat alias — used by other code paths that still call it by name. */
    function applyThemeToFrame(frame, themeVars) {
        broadcastTheme(themeVars, frame && frame.contentWindow);
    }
    window.applyThemeToFrame = applyThemeToFrame;

    /* When an iframe announces it has loaded, push the current theme. */
    window.addEventListener('message', (e) => {
        // 校验消息来源，只接受同源消息
        if (e.origin !== window.location.origin) return;
        const data = e.data;
        if (!data || typeof data !== 'object') return;
        if (data.type === 'qinblog-theme-ready' || data.type === 'qinblog-theme-request') {
            broadcastTheme(isDarkMode ? darkTheme : lightTheme, e.source);
        } else if (data.type === 'qinblog-hash-update') {
            // 子页面（如 blogs）通知 hash 变更，同步到主页面 URL
            // 校验 hash 格式：必须是空字符串或以 # 开头的字符串
            const hash = data.hash;
            if (hash !== '' && hash !== null && hash !== undefined) {
                if (typeof hash !== 'string' || !hash.startsWith('#')) return;
            }
            // 仅在当前页面是消息来源页面时才同步 hash，防止跨页泄漏
            const currentPageId = slider.pages[slider.currentIndex]?.id;
            const senderPage = data.pageId;
            if (senderPage && senderPage !== currentPageId) return;

            const currentPath = window.location.pathname;
            const currentSearch = window.location.search;
            const newUrl = hash
                ? currentPath + currentSearch + hash
                : currentPath + currentSearch;
            history.replaceState(history.state, '', newUrl);
        }
    });

    function applyTheme(themeVars) {
        const root = document.documentElement;
        for (const [key, value] of Object.entries(themeVars)) {
            root.style.setProperty(key, value);
        }

        broadcastTheme(themeVars);

        const isDark = themeVars['--bg-primary'] === '#0C0A09';
        themeBtn.setAttribute('aria-pressed', isDark ? 'true' : 'false');

        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: isDark ? 'dark' : 'light' }
        }));
    }

    function toggleTheme() {
        isDarkMode = !isDarkMode;
        try { localStorage.setItem('qinblog-theme', isDarkMode ? 'dark' : 'light'); } catch (e) { /* ignore */ }
        /* Use the View Transitions API to cross-fade between themes.
           Falls back to an instant switch on older browsers. */
        const switchTheme = () => applyTheme(isDarkMode ? darkTheme : lightTheme);
        if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.startViewTransition(switchTheme);
        } else {
            switchTheme();
        }
    }

    /* Expose for child iframes */
    window.getCurrentTheme = () => isDarkMode ? darkTheme : lightTheme;

    /* ----------------------------------------
       Site Uptime Counter
       ---------------------------------------- */
    const SITE_LAUNCH_DATE = new Date('2025-12-24T00:00:00+08:00');

    function updateSiteUptime() {
        const uptimeValue = document.getElementById('uptime-value');
        if (!uptimeValue) return;

        const diff = Date.now() - SITE_LAUNCH_DATE.getTime();
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);

        uptimeValue.textContent =
            `${days}天 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    /* ----------------------------------------
       Page Slider (Iframe-based SPA)
       ---------------------------------------- */
    class PageSlider {
        constructor() {
            this.slider = document.getElementById('page-slider');
            this.navLinks = document.querySelectorAll('.nav-link');
            this.pages = Array.from(this.navLinks).map(link => ({
                id: link.dataset.target,
                src: link.dataset.src
            }));

            this.currentIndex = shouldSwitchPage
                ? this.pages.findIndex(p => p.id === initialPage)
                : 0;
            if (this.currentIndex === -1) this.currentIndex = 0;

            this.isAnimating = false;
            this.startX = 0;
            this.isDragging = false;

            this.init();
        }

        init() {
            if (shouldSwitchPage) {
                this.slider.style.transition = 'none';
                this.slider.style.transform = `translate3d(${-this.currentIndex * 100}%, 0, 0)`;
                this.navLinks.forEach((link, i) => {
                    link.classList.toggle('active', i === this.currentIndex);
                });
            }

            this.pages.forEach((page, index) => {
                const iframe = document.createElement('iframe');
                iframe.className = 'page-frame';
                iframe.dataset.id = page.id;
                iframe.title = `${page.id} 页面`;
                /* Sandbox note: allow-scripts + allow-same-origin together
                   triggers a console warning, but is safe here because all
                   iframe src URLs are same-origin (GitHub Pages). The
                   combination is required for theme sync (postMessage) and
                   DOM access (contentDocument) to work inside the iframe. */
                iframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox';

                const loadTimeout = setTimeout(() => {
                    if (!iframe.contentDocument || !iframe.contentDocument.body.innerHTML) {
                        this.handleIframeError(iframe, page);
                    }
                }, 5000);

                iframe.addEventListener('load', () => {
                    clearTimeout(loadTimeout);
                    /* Push the current theme to the freshly loaded iframe.
                       The iframe's theme-listener.js will apply it on receipt.
                       This is a redundant safety net alongside the
                       qinblog-theme-ready handshake from the iframe. */
                    broadcastTheme(isDarkMode ? darkTheme : lightTheme, iframe.contentWindow);
                    if (index === 0) {
                        document.getElementById('skeleton-screen').classList.add('hidden');
                    }
                    // iframe 加载完成后，检查主页面 URL 是否有 hash 需要同步
                    // 解决 popstate 时 iframe 尚未加载导致 hash 丢失的问题
                    const mainHash = window.location.hash;
                    if (mainHash && iframe.contentWindow) {
                        try {
                            const iframeHash = iframe.contentWindow.location.hash;
                            if (mainHash !== iframeHash) {
                                iframe.contentWindow.postMessage({
                                    type: 'qinblog-hash-sync',
                                    hash: mainHash
                                }, '*');
                            }
                        } catch (e) { /* cross-origin, ignore */ }
                    }
                }, { once: true });

                iframe.addEventListener('error', () => this.handleIframeError(iframe, page));

                if (shouldSwitchPage) {
                    if (page.id === initialPage) {
                        // 如果有 hash 片段（如 #001），追加到 iframe src 以传递给子页面
                        iframe.src = page.src + (initialHash || '');
                    }
                } else {
                    if (index === 0) iframe.src = page.src + (initialHash || '');
                }

                this.slider.appendChild(iframe);
            });

            this.scheduleLazyLoad();
            this.bindNav();
            this.bindTouch();
        }

        scheduleLazyLoad() {
            const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
            idle(() => this.loadOtherPages(), { timeout: 2000 });
        }

        loadOtherPages() {
            const frames = this.slider.querySelectorAll('iframe');
            frames.forEach((frame, index) => {
                if (index !== this.currentIndex && !frame.src) {
                    frame.src = this.pages[index].src;
                }
            });
        }

        bindNav() {
            this.navLinks.forEach((link, index) => {
                link.addEventListener('click', () => this.goToPage(index));
                link.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.goToPage(index);
                    }
                });
            });
        }

        bindTouch() {
            const viewport = document.getElementById('viewport');
            viewport.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
            viewport.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
            viewport.addEventListener('touchend', this.onTouchEnd.bind(this));
        }

        goToPage(index, pushState = true) {
            if (index === this.currentIndex || index < 0 || index >= this.pages.length) return;

            this.navLinks.forEach(l => l.classList.remove('active'));
            this.navLinks[index].classList.add('active');
            this.currentIndex = index;
            this.updateSliderPosition(true);

            /* Update browser URL so refresh stays on current page */
            if (pushState) {
                const page = this.pages[index];
                const url = page.id === 'home' ? '/' : '/' + page.id;
                history.pushState({ pageId: page.id }, '', url);
            }

            if (window.innerWidth <= 768) {
                toggleMenu(false);
            }
        }

        updateSliderPosition(animate) {
            const offset = -(this.currentIndex * 100);
            this.slider.style.transition = animate
                ? 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)'
                : 'none';
            this.slider.style.transform = `translate3d(${offset}%, 0, 0)`;
        }

        onTouchStart(e) {
            this.startX = e.touches[0].clientX;
            this.isDragging = true;
            this.slider.style.transition = 'none';
        }

        onTouchMove(e) {
            if (!this.isDragging) return;

            const diff = e.touches[0].clientX - this.startX;
            const width = this.slider.clientWidth;
            const isEdge = (this.currentIndex === 0 && diff > 0) ||
                           (this.currentIndex === this.pages.length - 1 && diff < 0);
            const resistance = isEdge ? diff * 0.3 : diff;
            const offset = -(this.currentIndex * 100) + (resistance / width * 100);

            this.slider.style.transform = `translate3d(${offset}%, 0, 0)`;

            if (Math.abs(diff) > 5 && e.cancelable) e.preventDefault();
        }

        onTouchEnd(e) {
            if (!this.isDragging) return;
            this.isDragging = false;

            const diff = e.changedTouches[0].clientX - this.startX;
            const threshold = this.slider.clientWidth * 0.2;

            if (diff > threshold && this.currentIndex > 0) {
                this.goToPage(this.currentIndex - 1);
            } else if (diff < -threshold && this.currentIndex < this.pages.length - 1) {
                this.goToPage(this.currentIndex + 1);
            } else {
                this.updateSliderPosition(true);
            }
        }

        handleIframeError(iframe, page) {
            console.error(`Failed to load page: ${page.src}`);
            iframe.srcdoc = `
                <!DOCTYPE html>
                <html lang="zh-CN">
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body {
                            margin: 0;
                            min-height: 100vh;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            background: #0C0A09;
                            color: #D6D3D1;
                            font-family: system-ui, -apple-system, sans-serif;
                            text-align: center;
                            padding: 2rem;
                        }
                        .error-icon {
                            width: 64px;
                            height: 64px;
                            margin-bottom: 1.5rem;
                            opacity: 0.5;
                        }
                        h2 { color: #FAFAF9; margin: 0 0 0.5rem 0; font-size: 1.5rem; }
                        p { margin: 0 0 1.5rem 0; max-width: 400px; line-height: 1.6; }
                        .retry-btn {
                            padding: 0.75rem 1.5rem;
                            background: #78716C;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 1rem;
                        }
                    </style>
                </head>
                <body>
                    <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <h2>页面加载失败</h2>
                    <p>无法加载 <strong>${page.id}</strong> 页面。请检查网络连接或点击重试。</p>
                    <button class="retry-btn" onclick="parent.location.reload()">重新加载</button>
                </body>
                </html>
            `;
        }
    }

    /* ----------------------------------------
       Mobile Sidebar Toggle
       ---------------------------------------- */
    const sidebar = document.getElementById('sidebar');
    const hamburger = document.getElementById('hamburger-btn');
    const overlay = document.getElementById('sidebar-overlay');
    const themeBtn = document.getElementById('theme-btn');

    function toggleMenu(force) {
        const isActive = typeof force === 'boolean' ? force : !sidebar.classList.contains('active');

        sidebar.classList.toggle('active', isActive);
        hamburger.classList.toggle('active', isActive);
        hamburger.setAttribute('aria-expanded', String(isActive));
        overlay.classList.toggle('active', isActive);
        overlay.setAttribute('aria-hidden', String(!isActive));
        document.body.style.overflow = isActive ? 'hidden' : '';
    }

    /* ----------------------------------------
       Initialization
       ---------------------------------------- */
    document.addEventListener('DOMContentLoaded', () => {
        /* Apply persisted theme before the first paint to avoid FOUC
           of dark theme when the user previously chose light. */
        applyTheme(isDarkMode ? darkTheme : lightTheme);

        if (hamburger) hamburger.addEventListener('click', () => toggleMenu());
        if (overlay) overlay.addEventListener('click', () => toggleMenu(false));
        if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

        const slider = new PageSlider();

        /* Handle browser back/forward buttons */
        window.addEventListener('popstate', (e) => {
            const pageId = (e.state && e.state.pageId) || 'home';
            const idx = slider.pages.findIndex(p => p.id === pageId);
            if (idx !== -1 && idx !== slider.currentIndex) {
                slider.goToPage(idx, false);
            }
            // 同步 hash 到当前 iframe（处理主页面 URL hash 变化但页面不变的情况）
            const currentFrame = slider.slider.querySelectorAll('iframe')[slider.currentIndex];
            if (currentFrame && currentFrame.contentWindow) {
                const mainHash = window.location.hash;
                let iframeHash = '';
                try { iframeHash = currentFrame.contentWindow.location.hash; } catch (e) { /* cross-origin */ }
                if (mainHash !== iframeHash) {
                    try {
                        currentFrame.contentWindow.postMessage({ type: 'qinblog-hash-sync', hash: mainHash }, window.location.origin);
                    } catch (e) { /* ignore cross-origin postMessage errors */ }
                }
            }
        });

        /* Replace initial history entry so popstate works from page 1 */
        const initialId = slider.pages[slider.currentIndex].id;
        const initialUrl = initialId === 'home' ? '/' : '/' + initialId;
        // 保留 hash 片段（如从 /blogs#001 进入时，replaceState 不应丢失 #001）
        const urlWithHash = initialUrl + (initialHash || '');
        history.replaceState({ pageId: initialId }, '', urlWithHash);

        updateSiteUptime();
        setInterval(updateSiteUptime, 1000);
    });
})();
