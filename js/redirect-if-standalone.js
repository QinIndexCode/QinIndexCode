/**
 * 页面重定向脚本
 *
 * 作用：
 * 1. 当用户直接访问独立页面（如 blogs.html, tools.html 等）时，
 *    自动重定向到 index.html 并加载对应的 iframe 页面
 * 2. 支持 hash 片段传递（如 /blogs.html#001 → /?from=blogs#001）
 * 3. 爬虫和直接在 index.html 内导航的请求不重定向
 *
 * 使用方法：在需要重定向的页面顶部引入此脚本
 * <script src="./js/redirect-if-standalone.js"></script>
 */

(function () {
    'use strict';

    // 检测搜索引擎爬虫 — 不重定向，让爬虫正常索引页面
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const botPatterns = [
        /googlebot/i, /bingbot/i, /baiduspider/i, /yandexbot/i,
        /duckduckbot/i, /slurp/i, /facebookexternalhit/i, /twitterbot/i,
        /linkedinbot/i, /crawler/i, /spider/i, /bot/i
    ];
    if (botPatterns.some(p => p.test(userAgent))) return;

    // 如果在 iframe 中（由 index.html 加载），不重定向
    if (window.self !== window.top) return;

    // 获取当前路径（去除前导/和尾部/）
    const rawPath = window.location.pathname;
    const path = rawPath.replace(/^\/|\/$/g, '');

    // 如果是首页或 index.html，不需要重定向
    if (!path || path === 'index.html' || path === 'index') return;

    // 提取页面名称（去掉 .html 后缀）
    const pageName = path.replace(/\.html$/, '');
    
    // 构建重定向 URL，保留 hash 片段
    const hash = window.location.hash;
    const redirectUrl = '/?from=' + encodeURIComponent(pageName) + hash;
    
    // 重定向到 index.html
    window.location.replace(redirectUrl);
})();
