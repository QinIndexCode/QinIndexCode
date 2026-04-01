/**
 * 页面重定向脚本
 * 
 * 作用：当用户直接访问独立页面（如 blogs.html, tech.html 等）时，
 * 自动重定向到 index.html 并加载对应的 iframe 页面
 * 
 * 使用方法：在需要重定向的页面顶部引入此脚本
 * <script src="./js/redirect-if-standalone.js"></script>
 */

(function() {
    // 🚫 重要：检测是否为搜索引擎爬虫
    // 如果是爬虫，不执行重定向，让爬虫正常索引页面
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const botPatterns = [
        /googlebot/i,
        /bingbot/i,
        /baiduspider/i,
        /yandexbot/i,
        /duckduckbot/i,
        /slurp/i,  // Yahoo
        /facebookexternalhit/i,
        /twitterbot/i,
        /linkedinbot/i,
        /crawler/i,
        /spider/i,
        /bot/i
    ];
    
    const isBot = botPatterns.some(pattern => pattern.test(userAgent));
    if (isBot) {
        console.log('检测到搜索引擎爬虫，跳过重定向');
        return;
    }
    
    // 检查是否在 iframe 中加载
    const isInIframe = window.self !== window.top;
    
    // 如果在 iframe 中，不需要重定向
    if (isInIframe) {
        return;
    }
    
    // 检查是否是从 index.html 跳转而来
    const referrer = document.referrer;
    const isFromIndex = referrer.includes('index.html');
    
    // 如果是从 index.html 跳转而来，不需要重定向
    if (isFromIndex) {
        return;
    }
    
    // 获取当前页面名称
    const currentPage = window.location.pathname.split('/').pop() || '';
    const pageName = currentPage.replace('.html', '');
    
    // 定义需要重定向的页面列表
    const pagesToRedirect = ['home', 'tech', 'projects', 'blogs', 'tools', 'donate', 'about'];
    
    // 如果当前页面在列表中，执行重定向
    if (pagesToRedirect.includes(pageName)) {
        console.log(`检测到独立访问 ${pageName}.html，重定向到 index.html`);
        
        // 构建重定向 URL
        const redirectUrl = `${window.location.origin}/index.html?from=${pageName}`;
        
        // 执行重定向
        window.location.href = redirectUrl;
    }
})();
