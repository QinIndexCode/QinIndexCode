/**
 * Nav Loader — 为独立页面（非 iframe 模式）动态注入导航栏
 *
 * 作用：当用户直接访问 /blogs、/tools 等独立页面时，
 * 自动注入与 index.html 一致的主导航栏，保持体验统一。
 *
 * 使用方法：在需要导航栏的页面中引入
 * <script src="./js/nav-loader.js" defer></script>
 */
(function () {
    'use strict';

    // 如果在 iframe 中（由 index.html 加载），不注入导航栏
    if (window.self !== window.top) return;

    // 当前页面标识
    const path = window.location.pathname.replace(/^\/|\/$/g, '');
    const currentPage = path.replace(/\.html$/, '').replace(/\/$/, '') || 'home';

    // 导航配置
    const navItems = [
        { id: 'home',    label: '首页',  icon: '#i-home',     href: './' },
        { id: 'tech',    label: '技术',  icon: '#i-code',     href: './tech.html' },
        { id: 'projects',label: '项目',  icon: '#i-folder',    href: './projects.html' },
        { id: 'blogs',   label: '随记',  icon: '#i-book-open', href: './blogs.html' },
        { id: 'tools',   label: '工具',  icon: '#i-wrench',    href: './tools.html' },
        { id: 'donate',  label: '捐赠',  icon: '#i-heart',     href: './donate.html' },
        { id: 'about',   label: '关于',  icon: '#i-user',      href: './about.html' }
    ];

    // 生成导航菜单 HTML
    const navMenuHTML = navItems.map(item => {
        const isActive = item.id === currentPage;
        return `
            <li class="nav-item" role="none">
                <a href="${item.href}" class="nav-link${isActive ? ' active' : ''}" role="menuitem">
                    <svg class="icon" aria-hidden="true"><use href="${item.icon}"></use></svg>
                    <span>${item.label}</span>
                </a>
            </li>
        `;
    }).join('');

    // 导航栏容器 HTML
    const navHTML = `
        <button class="hamburger-btn" id="hamburger-btn" aria-label="打开菜单" aria-expanded="false" aria-controls="sidebar">
            <span></span>
            <span></span>
            <span></span>
        </button>

        <div class="theme-selector" id="theme-selector">
            <button class="theme-btn" id="theme-btn" aria-label="切换主题" aria-pressed="true">
                <svg class="icon icon-md theme-icon theme-icon-moon" aria-hidden="true"><use href="#i-moon"></use></svg>
                <svg class="icon icon-md theme-icon theme-icon-sun" aria-hidden="true"><use href="#i-sun"></use></svg>
            </button>
        </div>

        <div class="sidebar-overlay" id="sidebar-overlay" aria-hidden="true"></div>

        <aside class="sidebar glass" id="sidebar" role="navigation" aria-label="主导航">
            <div class="profile-section">
                <div class="profile-avatar">
                    <img src="assets/images/avatar.jpg" alt="QinIndexCode 头像" width="100" height="100" loading="lazy" decoding="async">
                </div>
                <div class="profile-name">QinIndexCode</div>
            </div>
            <ul class="nav-menu" role="menubar">
                ${navMenuHTML}
            </ul>
        </aside>
    `;

    // 插入到 body 开头
    const container = document.createElement('div');
    container.id = 'standalone-nav';
    container.innerHTML = navHTML;
    document.body.insertBefore(container, document.body.firstChild);

    // 为 body 添加类名，让页面内容留出导航栏空间
    document.body.classList.add('has-standalone-nav');

    // ====== 交互绑定 ======

    const hamburgerBtn = document.getElementById('hamburger-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    // 汉堡菜单
    function toggleSidebar() {
        const isOpen = sidebar.classList.contains('active');
        sidebar.classList.toggle('active', !isOpen);
        hamburgerBtn.classList.toggle('active', !isOpen);
        hamburgerBtn.setAttribute('aria-expanded', String(!isOpen));
        sidebarOverlay.classList.toggle('active', !isOpen);
    }

    function closeSidebar() {
        sidebar.classList.remove('active');
        hamburgerBtn.classList.remove('active');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        sidebarOverlay.classList.remove('active');
    }

    if (hamburgerBtn) hamburgerBtn.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

    // ESC 关闭侧边栏
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeSidebar();
    });

    // 主题切换
    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn && window.QINBLOG_THEMES) {
        function toggleTheme() {
            const isDark = getComputedStyle(document.documentElement)
                .getPropertyValue('--bg-primary').trim() === '#0C0A09';
            const vars = isDark ? window.QINBLOG_THEMES.light : window.QINBLOG_THEMES.dark;
            const root = document.documentElement;
            for (const key in vars) {
                root.style.setProperty(key, vars[key]);
            }
            root.style.colorScheme = isDark ? 'light' : 'dark';
            try {
                localStorage.setItem('qinblog-theme', isDark ? 'light' : 'dark');
            } catch (e) { /* ignore */ }
        }
        themeBtn.addEventListener('click', toggleTheme);
    }

    // 窗口 resize 到桌面端时关闭侧边栏
    window.addEventListener('resize', () => {
        if (window.innerWidth > 900) closeSidebar();
    });
})();
