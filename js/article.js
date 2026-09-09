/**
 * article.js — 独立文章页（/blogs/{id}.html）交互逻辑
 *
 * 与主站详情一致：右侧固定目录(TOC)、目录折叠、reading 进度条、
 * 回到顶部、返回按钮。正文标题的 id 由 build-blogs.js 在构建期生成。
 */
(function () {
    'use strict';

    /* ---------- 通用工具 ---------- */
    function onReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    /* ---------- 目录生成 ---------- */
    function generateTOC() {
        var tocList = document.getElementById('toc-list');
        var sidebar = document.getElementById('blog-sidebar');
        var content = document.getElementById('blog-content');
        if (!tocList || !sidebar || !content) return;

        var allHeadings = content.querySelectorAll('h1, h2, h3, h4, h5, h6');
        if (allHeadings.length === 0) {
            sidebar.style.display = 'none';
            return;
        }

        // 跳过第一个与文章标题完全相同的 h1、以及日期开头的首个 h2（博客自带 "## 日期" 行）
        var blogTitleEl = document.querySelector('.blog-title');
        var blogTitle = blogTitleEl ? blogTitleEl.textContent.trim() : '';
        var dateRe = /^(\d{4}-\d{2}-\d{2})/;

        var headings = Array.from(allHeadings).filter(function (h, idx) {
            var text = h.textContent.trim();
            if (h.tagName === 'H1' && blogTitle && text === blogTitle) return false;
            if (idx < 2 && h.tagName === 'H2' && dateRe.test(text)) return false;
            return true;
        });

        if (headings.length === 0) {
            sidebar.style.display = 'none';
            return;
        }

        // 构建期已为每个 h2-h6 写入唯一 id；缺失时兜底补一个
        var used = {};
        var html = headings.map(function (h, i) {
            var id = h.id;
            if (!id) {
                id = 'toc-' + i;
                h.id = id;
            }
            // 同一批次内去重
            if (used[id]) id = id + '-' + i;
            used[id] = true;
            h.id = id;

            var level = h.tagName.toLowerCase();
            var indent = (parseInt(level.charAt(1), 10) - 1) * 0.65;
            var text = h.textContent.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return '<a href="#' + id + '" class="toc-item toc-' + level + '" data-target="' + id + '" style="--indent:' + indent + 'rem;">' + text + '</a>';
        }).join('');

        tocList.innerHTML = html;
        window.__tocHeadings = headings;
        window.__tocLinks = Array.prototype.slice.call(tocList.querySelectorAll('.toc-item'));

        setupTocScrollSpy();

        // 移动端点击目录项后自动收起面板
        window.__tocLinks.forEach(function (link) {
            link.addEventListener('click', function () {
                if (window.innerWidth <= 900) closeMobileToc();
            });
        });
    }

    /* ---------- 目录滚动高亮 (scrollspy) ---------- */
    let tocObserver = null;
    function setupTocScrollSpy() {
        if (tocObserver) tocObserver.disconnect();
        if (!('IntersectionObserver' in window)) return;
        var headings = window.__tocHeadings;
        var links = window.__tocLinks;
        if (!headings || !links || headings.length === 0) return;

        function setActive(link) {
            links.forEach(function (a) { a.classList.remove('active'); });
            link.classList.add('active');
        }

        var visible = new Map();
        tocObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) {
                    visible.set(e.target, e.intersectionRatio);
                } else {
                    visible.delete(e.target);
                }
            });

            if (visible.size === 0) {
                if (window.scrollY < 100) {
                    setActive(links[0]);
                } else if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 50) {
                    setActive(links[links.length - 1]);
                } else {
                    // 中间区段无标题：高亮刚离开视口顶部的那一个（据 scrollY 反查）
                    var els = headings.filter(function (h) { return h.offsetTop <= window.scrollY + 80; });
                    var last = els[els.length - 1];
                    if (last) {
                        var link = links.find(function (l) { return l.dataset.target === last.id; });
                        if (link) setActive(link);
                    }
                }
                return;
            }

            var activeLink = null;
            var minTop = Infinity;
            visible.forEach(function (_, el) {
                var top = el.getBoundingClientRect().top;
                if (top < minTop) { minTop = top; activeLink = el; }
            });
            if (activeLink) {
                var link = links.find(function (l) { return l.dataset.target === activeLink.id; });
                if (link) setActive(link);
            }
        }, {
            rootMargin: '-80px 0px -60% 0px',
            threshold: [0, 1]
        });

        headings.forEach(function (h) { tocObserver.observe(h); });
        setActive(links[0]);
    }

    /* ---------- 目录折叠 ---------- */
    var TOC_COLLAPSE_KEY = 'qinblog_toc_collapsed';
    function setupTocToggle() {
        var toggle = document.getElementById('toc-toggle');
        var sidebar = document.getElementById('blog-sidebar');
        if (!toggle || !sidebar) return;

        try {
            if (localStorage.getItem(TOC_COLLAPSE_KEY) === '1') {
                sidebar.classList.add('collapsed');
                toggle.setAttribute('aria-expanded', 'false');
            }
        } catch (_) { }

        toggle.addEventListener('click', function () {
            var isCollapsed = sidebar.classList.toggle('collapsed');
            toggle.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
            try { localStorage.setItem(TOC_COLLAPSE_KEY, isCollapsed ? '1' : '0'); } catch (_) { }
        });
    }

    /* ---------- 移动端目录面板 ---------- */
    function toggleMobileToc() {
        var sidebar = document.getElementById('blog-sidebar');
        var overlay = document.getElementById('toc-overlay');
        if (!sidebar) return;
        if (sidebar.classList.contains('mobile-toc-open')) {
            closeMobileToc();
        } else {
            sidebar.style.display = 'flex';
            sidebar.classList.add('mobile-toc-open');
            if (overlay) overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeMobileToc() {
        var sidebar = document.getElementById('blog-sidebar');
        var overlay = document.getElementById('toc-overlay');
        if (sidebar) sidebar.classList.remove('mobile-toc-open');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(function () {
            if (sidebar && !sidebar.classList.contains('mobile-toc-open')) {
                sidebar.style.display = '';
            }
        }, 350);
    }

    /* ---------- 回到顶部 ---------- */
    function scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function updateBackToTopVisibility() {
        var visible = window.scrollY > 300;
        document.querySelectorAll('#back-to-top').forEach(function (btn) {
            btn.classList.toggle('visible', visible);
        });
    }

    /* ---------- 返回 ---------- */
    function goBack() {
        // 有历史则后退，否则回随记列表
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = './blogs.html';
        }
    }

    /* ---------- 阅读进度条 ---------- */
    function setupReadingProgress() {
        var fill = document.getElementById('progress-fill');
        if (!fill) return;
        function onScroll() {
            var scrollTop = window.scrollY;
            var docHeight = document.documentElement.scrollHeight - window.innerHeight;
            var pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            fill.style.width = pct + '%';
            updateBackToTopVisibility();
        }
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    /* ---------- 入口 ---------- */
    onReady(function () {
        generateTOC();
        setupTocToggle();
        setupReadingProgress();
        updateBackToTopVisibility();

        var backBtn = document.getElementById('article-back');
        if (backBtn) backBtn.addEventListener('click', goBack);

        var tocFloat = document.getElementById('toc-float-btn');
        if (tocFloat) tocFloat.addEventListener('click', toggleMobileToc);

        var tocOverlay = document.getElementById('toc-overlay');
        if (tocOverlay) tocOverlay.addEventListener('click', closeMobileToc);

        var topBtn = document.getElementById('back-to-top');
        if (topBtn) topBtn.addEventListener('click', scrollToTop);

        // Home 键回到顶部
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Home' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
                e.preventDefault();
                scrollToTop();
            }
        });
    });
})();