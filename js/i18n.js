/*! QinIndexCode i18n 引擎
 *
 * 设计:
 *  - 词典为单个 JSON 文件: i18n/zh-CN.json、i18n/en-US.json（扩展语言只需新增文件）
 *  - 标记方式: data-i18n="key"（文本）、data-i18n-placeholder / -title / -aria-label / -alt
 *  - 语言偏好存 localStorage('qinblog_lang')；同源 iframe/窗口通过 storage 事件自动同步
 *  - file:// 协议下 fetch 不可用：内嵌 zh-CN 词典兜底（与 blogs-data.js 同一策略）
 */
(function () {
    'use strict';

    var SUPPORTED = ['zh-CN', 'en-US'];
    var STORAGE_KEY = 'qinblog_lang';
    var DEFAULT_LANG = 'zh-CN';

    /* 内嵌 zh-CN 词典（file:// 兜底，与 i18n/zh-CN.json 保持一致） */
    var FALLBACK_DICT = {
        "nav.home": "首页",
        "nav.tech": "技术",
        "nav.projects": "项目",
        "nav.blogs": "随记",
        "nav.tools": "工具",
        "nav.donate": "捐赠",
        "nav.about": "关于",
        "common.skipLink": "跳转到主内容",
        "common.openMenu": "打开菜单",
        "common.switchTheme": "切换主题",
        "common.switchLang": "切换语言",
        "common.mainNav": "主导航",
        "common.uptimeLabel": "站点已运行",
        "common.computing": "计算中...",
        "page.about.title": "关于",
        "page.donate.title": "支持与捐赠",
        "page.donate.thanks": "感谢你的关注",
        "page.tools.title": "开发者工具箱",
        "page.tools.subtitle": "一站式在线开发工具，无需安装，打开即用",
        "page.projects.title": "项目",
        "page.blogs.title": "随记",
        "page.home.title": "首页",
        "page.tech.title": "全栈技术体系"
    };

    var current = DEFAULT_LANG;
    var dict = null;
    var ready = false;

    function normalize(lang) {
        return SUPPORTED.indexOf(lang) !== -1 ? lang : DEFAULT_LANG;
    }

    function t(key) {
        if (dict && Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
        if (Object.prototype.hasOwnProperty.call(FALLBACK_DICT, key)) return FALLBACK_DICT[key];
        return key;
    }

    function applyAttr(scope, attr, prop) {
        var nodes = scope.querySelectorAll('[' + attr + ']');
        Array.prototype.forEach.call(nodes, function (el) {
            var key = el.getAttribute(attr);
            if (key) el.setAttribute(prop, t(key));
        });
    }

    function apply(root) {
        var scope = root || document;
        var nodes = scope.querySelectorAll('[data-i18n]');
        Array.prototype.forEach.call(nodes, function (el) {
            var key = el.getAttribute('data-i18n');
            if (key) el.textContent = t(key);
        });
        applyAttr(scope, 'data-i18n-placeholder', 'placeholder');
        applyAttr(scope, 'data-i18n-title', 'title');
        applyAttr(scope, 'data-i18n-aria-label', 'aria-label');
        applyAttr(scope, 'data-i18n-alt', 'alt');
    }

    function renderSwitcher() {
        var opts = document.querySelectorAll('.lang-opt');
        Array.prototype.forEach.call(opts, function (btn) {
            btn.setAttribute('aria-pressed', btn.getAttribute('data-lang') === current ? 'true' : 'false');
        });
        var switcher = document.getElementById('lang-switch');
        if (switcher) switcher.setAttribute('aria-label', t('common.switchLang'));
    }

    function loadDict(done) {
        if (current === DEFAULT_LANG) {
            dict = FALLBACK_DICT;
            if (done) done();
            return;
        }
        fetch('./i18n/' + current + '.json', { cache: 'no-cache' })
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function (json) {
                dict = json || {};
                if (done) done();
            })
            .catch(function () {
                // 词典加载失败：回退内置中文，保证界面可用
                dict = FALLBACK_DICT;
                if (done) done();
            });
    }

    function setLang(lang) {
        lang = normalize(lang);
        if (lang === current && ready) return;
        current = lang;
        try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }
        loadDict(function () {
            apply();
            renderSwitcher();
            document.dispatchEvent(new CustomEvent('qinblog:langchange', {
                detail: { lang: current }
            }));
        });
    }

    /* 同源窗口/iframe 间同步语言（SPA iframe 模式的关键通道） */
    window.addEventListener('storage', function (e) {
        if (e.key === STORAGE_KEY && e.newValue && e.newValue !== current) {
            current = normalize(e.newValue);
            loadDict(function () {
                apply();
                renderSwitcher();
            });
        }
    });

    /* 切换器点击委托（覆盖 index.html 静态与 nav-loader 注入两种来源） */
    document.addEventListener('click', function (e) {
        var btn = e.target && e.target.closest ? e.target.closest('.lang-opt') : null;
        if (btn && btn.getAttribute('data-lang')) {
            setLang(btn.getAttribute('data-lang'));
        }
    });

    function init() {
        var stored = DEFAULT_LANG;
        try { stored = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG; } catch (e) { /* ignore */ }
        current = normalize(stored);
        document.documentElement.lang = current;
        document.documentElement.dataset.lang = current;
        loadDict(function () {
            ready = true;
            apply();
            renderSwitcher();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.QinBlogI18n = {
        t: t,
        apply: apply,
        setLang: setLang,
        getLang: function () { return current; },
        supported: SUPPORTED,
        isReady: function () { return ready; },
        /* 动态注入内容后重新应用翻译（供页面切换/渲染后调用） */
        reload: function (root) { apply(root || document); }
    };
})();
