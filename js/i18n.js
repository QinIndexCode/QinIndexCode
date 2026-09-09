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
    var SHORT_LABEL = { 'zh-CN': '中', 'en-US': 'EN' };

    /* 语种显示名（切换按钮上的文本），未知语种回退为语言码 */
    function shortLabel(lang) {
        return SHORT_LABEL[lang] || lang.replace(/^([a-zA-Z]+).*/, '$1').toUpperCase();
    }

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
    "common.uptimeFormat": "{days}天 {time}",
    "common.iframeTitle": "{page} 页面",
    "common.loadErrorTitle": "页面加载失败",
    "common.loadErrorBody": "无法加载 {page} 页面。请检查网络连接或点击重试。",
    "common.retry": "重新加载",
    "common.avatarAlt": "QinIndexCode 头像",
    "page.about.title": "关于",
    "page.donate.title": "支持与捐赠",
    "page.donate.thanks": "感谢你的关注",
    "page.tools.title": "开发者工具箱",
    "page.tools.subtitle": "一站式在线开发工具，无需安装，打开即用",
    "page.projects.title": "项目",
    "page.blogs.title": "随记",
    "page.home.title": "首页",
    "page.tech.title": "全栈技术体系",
    "meta.home.title": "QinIndexCode - 个人技术博客 | 全栈开发、Web 开发、移动应用开发",
    "meta.home.desc": "QinIndexCode 个人技术博客，专注于分享全栈开发、Web 开发、移动应用开发、JavaScript、React、Vue、Node.js 等技术文章和实战经验",
    "meta.blogs.title": "技术博客文章 - QinIndexCode | 前端开发、后端开发、全栈开发",
    "meta.blogs.desc": "QinIndexCode 技术博客，分享 JavaScript、前端开发、后端开发、React、Vue、Node.js 等技术文章和实战经验",
    "meta.tools.title": "工具箱 - QinIndexCode",
    "meta.tools.desc": "开发者工具箱 - 图片转换、二维码、JSON、Base64、时间戳、颜色转换等全能工具集",
    "meta.about.title": "关于我 - QinIndexCode | 全栈开发者、开源贡献者",
    "meta.about.desc": "QinIndexCode 个人信息，全栈开发者，精通 Python、JavaScript、React、Vue 等技术，热衷于开源项目和 AI 应用开发",
    "meta.tech.title": "全栈技术栈 - QinIndexCode | React, Vue, Node.js, Python",
    "meta.tech.desc": "QinIndexCode 技术栈：精通 React、Vue、Node.js、Python 等全栈技术，专注于构建高性能 Web 应用和移动应用",
    "meta.projects.title": "开源项目 - QinIndexCode | GitHub 项目、React Native、Vue.js",
    "meta.projects.desc": "QinIndexCode 开源项目展示，包括 Expo 数据存储、AI Agent 工作台、网页截图工具、LLM 研究等 GitHub 项目",
    "meta.donate.title": "捐赠 - QinIndexCode",
    "meta.donate.desc": "支持 QinIndexCode - 请我喝杯咖啡，支持开源项目持续发展",
    "home.hero.eyebrow": "欢迎 · Welcome",
    "home.hero.wish": "愿未来更美好",
    "home.hero.desc": "专注于全栈开发领域，致力于构建高性能、高可用的现代化 Web 应用。",
    "home.about.title": "关于我",
    "home.about.desc1": "主要从事 Web 与移动应用开发，热衷于探索前沿技术。",
    "home.about.desc2": "从前端交互到后端架构，我享受用代码解决问题的过程。偶尔参与开源项目，保持学习与分享的习惯。",
    "home.about.more": "了解更多",
    "home.stack.title": "核心技术栈",
    "home.stack.web": "Web 开发",
    "home.stack.mobile": "移动端",
    "home.stack.backend": "后端",
    "home.stack.database": "数据库",
    "about.basic.title": "基本信息",
    "about.basic.desc": "专注于 Web 与移动应用开发，热衷于探索前沿技术与开源社区。",
    "about.tech.title": "技术背景",
    "about.tech.lead": "主要接触的技术领域包括：",
    "about.tech.1": "Python、JavaScript、TypeScript、PHP、MySQL、MongoDB",
    "about.tech.2": "NextJS、Express、React、React-Native、Prisma、Laravel、Koa.js、Vue3、NestJS",
    "about.tech.3": "Git & GitHub、RESTful API 设计、数据库设计",
    "about.oss.title": "开源参与",
    "about.oss.1": "expo-lite-data-store：Expo 应用的轻量级本地数据存储库",
    "about.oss.2": "Agent Workbench：本地优先的 AI Agent 工作台，支持权限控制与多模型供应商",
    "about.oss.3": "web-screenshot-skill：面向多模态 LLM 的高质量网页截图工具",
    "about.oss.4": "ReflexLM：有界原生突触接口运行时的实验实现与机制验证",
    "about.oss.5": "参与 GitHub Reference 中文文档编写（15.1k Stars 项目）",
    "about.contact.title": "联系方式",
    "about.contact.email": "邮箱",
    "about.contact.github": "GitHub",
    "about.contact.discord": "Discord",
    "about.contact.emailAria": "发送邮件至 qinindexcode@gmail.com",
    "about.contact.githubAria": "访问 GitHub 主页",
    "about.contact.discordAria": "在 Discord 上联系",
    "tech.catAria": "技术分类",
    "tech.front.title": "前端开发",
    "tech.front.desc": "构建沉浸式用户体验",
    "tech.front.listAria": "前端技术列表",
    "tech.back.title": "后端架构",
    "tech.back.desc": "高性能服务与数据处理",
    "tech.back.listAria": "后端技术列表",
    "tech.devops.title": "工程化 & DevOps",
    "tech.devops.desc": "自动化与部署流程",
    "tech.devops.listAria": "工程化技术列表",
    "tech.perf": "性能优化",
    "tech.dbDesign": "数据库架构设计",
    "proj.viewBtn": "查看项目",
    "proj.referenceName": "GitHub Reference 中文文档",
    "proj.referenceAlt": "GitHub Reference 中文文档",
    "proj.desc.expo": "由本人主导开发的项目，用于 Expo 应用的轻量级数据存储库，旨在提供一个轻量快捷的本地存储解决方案，支持比分散 JSON 文件更清晰的格式化能力。",
    "proj.desc.workbench": "本地优先的 AI Agent 工作台，支持基于风险的权限审批、加密 SQLite 持久状态、多模型供应商配置（OpenAI / Anthropic / Gemini）、Web UI 和 CLI。",
    "proj.desc.screenshot": "高质量网页截图工具，支持 12 种设备预设、批量处理、高 DPI 渲染、暗色模式和元数据生成，专为多模态 LLM 视觉分析设计。",
    "proj.desc.reflexlm": "有界原生突触接口 (NSI) 运行时的实验实现，聚焦于可证伪的机制验证，包含结构化受体、显著性与抑制模型、以及受控命令选择基准测试。",
    "proj.desc.reference": "参与编写面向开发者的技术速查清单集合，整理常见技术、工具与开发流程，帮助快速查阅关键信息，提高开发效率。该项目已获得 15.1k Stars。",
    "donate.thanksBody": "如果你喜欢我的文章或开源项目，任何形式的支持都是对我最大的鼓励。每一份支持都让持续创作更有动力。",
    "donate.supportBtn": "支持作者",
    "donate.viewAria": "查看捐赠方式",
    "donate.usage.srv.title": "服务器与域名",
    "donate.usage.srv.desc": "保持站点稳定运行",
    "donate.usage.content.title": "内容创作",
    "donate.usage.content.desc": "持续输出技术文章",
    "donate.usage.oss.title": "开源项目",
    "donate.usage.oss.desc": "维护和开发新工具",
    "donate.donorLabel": "支持者",
    "donate.pay.title": "选择捐赠方式",
    "donate.pay.kofi": "前往 Ko-fi 捐赠",
    "donate.pay.domestic": "国内支付",
    "donate.pay.wechat": "微信支付",
    "donate.pay.alipay": "支付宝",
    "donate.qr.title": "支付方式",
    "donate.qr.tip": "感谢您的支持！",
    "auth.title": "登录处理中...",
    "auth.success": "登录成功！",
    "auth.returning": "正在返回到原页面...",
    "auth.notAuto": "如果没有自动跳转，请",
    "auth.clickHere": "点击这里",
    "redirect.title": "重定向中...",
    "redirect.body": "正在重定向...",
    "blog.searchPlaceholder": "搜索文章标题或内容...",
    "blog.sortAria": "排序方式",
    "blog.sort.newest": "最新优先",
    "blog.sort.oldest": "最早优先",
    "blog.sort.title": "标题 A-Z",
    "blog.sort.words": "字数最多",
    "blog.all": "全部",
    "blog.loading": "加载中...",
    "blog.loadingArticles": "正在加载文章…",
    "blog.noArticles": "暂无文章",
    "blog.emptyTitle": "未找到相关文章",
    "blog.emptyBody": "试试其他关键词或清除筛选条件",
    "blog.clearFilters": "清除所有筛选",
    "blog.readMore": "阅读全文",
    "blog.readAria": "阅读文章：{title}",
    "blog.stats": "找到 {found} 篇相关文章（共 {total} 篇）",
    "blog.words": "约 {count} 字",
    "blog.readTime": "约 {minutes} 分钟阅读",
    "blog.like": "点赞",
    "blog.comment": "评论",
    "blog.likeAria": "点赞文章",
    "blog.commentsTitle": "评论讨论",
    "blog.toc": "目录",
    "blog.tocAria": "文章目录",
    "blog.tocToggleTitle": "收起/展开目录",
    "blog.back": "返回",
    "blog.topAria": "回到顶部",
    "blog.commentsLoading": "正在加载评论...",
    "blog.commentsConnecting": "正在连接 GitHub Discussions",
    "blog.commentsFailTitle": "评论加载失败",
    "blog.commentsFailTimeout": "连接 GitHub 超时，请检查网络连接后重试。",
    "blog.commentsFailError": "评论系统暂时不可用，可能是网络连接问题或 Giscus 服务暂时不可用。",
    "blog.commentsReload": "重新加载",
    "blog.commentsGoto": "前往 GitHub 讨论",
    "blog.commentsDevTip": "提示：本地开发环境可能无法访问 Giscus，请在生产环境测试",
    "blog.likeToast.needDiscussion": "该文章还没有 GitHub 讨论，去评论区发表第一条评论即可开启点赞统计",
    "blog.likeToast.synced": "计数已与 GitHub 同步；到评论区给讨论点 👍 或 ❤️ 也能贡献点赞",
    "blog.likeTitle.synced": "点赞数来自 GitHub Discussions 的真实 Reactions（+1 / ❤️）",
    "blog.copy": "复制",
    "blog.copied": "已复制",
    "blog.authorFallback": "匿名",
    "blog.jsonldName": "QinIndexCode 技术博客",
    "blog.jsonldDesc": "分享 JavaScript、前端开发、后端开发等技术文章",
    "tool.navAria": "工具快捷导航",
    "tool.navToggleAria": "打开工具导航菜单",
    "tool.copy": "复制",
    "tool.jump.image": "跳转到图片转换工具",
    "tool.jump.qr": "跳转到二维码生成工具",
    "tool.jump.timestamp": "跳转到时间戳转换工具",
    "tool.jump.json": "跳转到JSON工具",
    "tool.jump.base64": "跳转到Base64转换工具",
    "tool.jump.url": "跳转到URL编解码工具",
    "tool.jump.color": "跳转到颜色调试器",
    "tool.jump.password": "跳转到密码生成器",
    "tool.jump.lorem": "跳转到文本生成工具",
    "tool.jump.markdown": "跳转到Markdown预览工具",
    "tool.jump.shadow": "跳转到CSS阴影生成器",
    "tool.jump.font": "跳转到字体单位转换器",
    "tool.jump.gradient": "跳转到CSS渐变生成器",
    "tool.jump.typing": "跳转到打字练习工具",
    "tool.navName.image": "图片转换",
    "tool.navName.qr": "二维码",
    "tool.navName.timestamp": "时间戳",
    "tool.navName.json": "JSON 工具",
    "tool.navName.base64": "Base64",
    "tool.navName.url": "URL 编码",
    "tool.navName.color": "颜色转换",
    "tool.navName.password": "密码生成",
    "tool.navName.lorem": "文本生成",
    "tool.navName.markdown": "Markdown",
    "tool.navName.shadow": "阴影生成",
    "tool.navName.font": "字体转换",
    "tool.navName.gradient": "渐变生成",
    "tool.navName.typing": "打字练习",
    "tool.sub.local": "本地运行",
    "tool.sub.safe": "数据安全",
    "tool.sub.fast": "极速响应",
    "tool.sub.count": "14 款工具",
    "tool.image.title": "图片转换",
    "tool.image.desc": "PNG / JPG / WEBP / BMP / ICO 格式互转，支持质量调节。",
    "tool.image.quality": "质量 (0-1)",
    "tool.image.convert": "转换并下载",
    "tool.qr.title": "二维码生成",
    "tool.qr.desc": "生成可自定义颜色的高清二维码图片。",
    "tool.qr.placeholder": "输入链接或文本",
    "tool.qr.dark": "二维码前景色",
    "tool.qr.light": "二维码背景色",
    "tool.qr.gen": "生成",
    "tool.ts.title": "时间戳转换",
    "tool.ts.desc": "Unix 时间戳与日期时间互转。",
    "tool.ts.now": "当前时间戳 (ms)",
    "tool.ts.toDate": "时间戳转日期",
    "tool.ts.phInput": "输入时间戳",
    "tool.ts.convert": "转换",
    "tool.resultPh": "结果...",
    "tool.json.title": "JSON 工具",
    "tool.json.desc": "格式化、压缩与校验 JSON 数据。",
    "tool.json.phInput": "粘贴 JSON...",
    "tool.json.beautify": "美化",
    "tool.json.minify": "压缩",
    "tool.b64.title": "Base64 转换",
    "tool.b64.desc": "文本与 Base64 编码互转，支持中文。",
    "tool.b64.phInput": "输入内容...",
    "tool.b64.encode": "编码",
    "tool.b64.decode": "解码",
    "tool.url.title": "URL 编解码",
    "tool.url.desc": "URL 参数转义与还原。",
    "tool.url.phInput": "输入 URL...",
    "tool.url.encode": "编码",
    "tool.url.decode": "解码",
    "tool.color.title": "颜色调试器",
    "tool.color.desc": "HEX / RGB / RGBA 互转，支持透明度。",
    "tool.color.picker": "颜色选择器",
    "tool.color.alpha": "透明度 (Alpha): ",
    "tool.color.format": "输出格式",
    "tool.color.auto": "自动 (Auto)",
    "tool.color.io": "输入 / 输出",
    "tool.color.phInput": "支持 HEX, RGB, RGBA",
    "tool.pwd.title": "密码生成器",
    "tool.pwd.desc": "生成高强度随机密码。",
    "tool.pwd.len": "长度: ",
    "tool.pwd.gen": "生成密码",
    "tool.lorem.title": "文本生成",
    "tool.lorem.desc": "生成 Lorem Ipsum 占位文本。",
    "tool.lorem.1": "1 句",
    "tool.lorem.3": "3 句",
    "tool.lorem.5": "5 句",
    "tool.lorem.ph": "点击按钮生成...",
    "tool.md.title": "Markdown 预览",
    "tool.md.desc": "实时预览与编辑 Markdown，点击展开全屏编辑器。",
    "tool.md.expand": "展开编辑",
    "tool.md.editorTitle": "Markdown 编辑器",
    "tool.md.togglePreview": "切换预览面板",
    "tool.md.ph": "在此输入 Markdown...",
    "tool.md.sample": "# Hello Markdown\n\n**粗体** 和 *斜体*\n\n- 列表项 1\n- 列表项 2\n\n[链接示例](https://example.com)",
    "tool.shadow.title": "CSS 阴影生成器",
    "tool.shadow.desc": "生成 box-shadow CSS 代码。",
    "tool.shadow.x": "X 偏移：",
    "tool.shadow.y": "Y 偏移：",
    "tool.shadow.blur": "模糊：",
    "tool.shadow.spread": "扩展：",
    "tool.shadow.color": "颜色:",
    "tool.font.title": "字体单位转换器",
    "tool.font.desc": "px / rem / em / pt 单位互转。",
    "tool.font.base": "基础字体大小 (px):",
    "tool.font.value": "输入值:",
    "tool.font.convert": "转换",
    "tool.gradient.title": "CSS 渐变生成器",
    "tool.gradient.desc": "创建线性渐变 CSS 代码。",
    "tool.gradient.angle": "角度：",
    "tool.gradient.start": "起始颜色",
    "tool.gradient.end": "结束颜色",
    "tool.typing.title": "打字练习",
    "tool.typing.desc": "提升打字速度与准确性，支持多种练习模式。",
    "tool.typing.start": "开始练习",
    "tool.typing.closeAria": "关闭打字练习",
    "tool.typing.subtitle": "选择文章并开始练习",
    "tool.typing.article1": "探索编程的本质与美学的交汇点",
    "tool.typing.article2": "人类对宇宙未知领域的永恒追求",
    "tool.typing.article3": "数字化时代如何重塑我们的生活方式",
    "tool.typing.article4": "地球面临的紧迫环境问题与解决方案",
    "tool.typing.article5": "人工智能的发展前景与思考",
    "tool.typing.article6": "正念冥想与心理健康的奥秘",
    "tool.typing.timeLimit": "时间限制",
    "tool.typing.unlimited": "无限",
    "tool.typing.min1": "1 分钟",
    "tool.typing.min2": "2 分钟",
    "tool.typing.min5": "5 分钟",
    "tool.typing.customPh": "输入秒数",
    "tool.typing.begin": "开始打字",
    "tool.typing.time": "时间",
    "tool.typing.accuracy": "准确率",
    "tool.typing.progress": "进度",
    "tool.typing.hintPress": "按下",
    "tool.typing.hintOr": "或",
    "tool.typing.hintEnd": "键结束练习",
    "tool.typing.inputAria": "打字输入区域",
    "tool.typing.done": "练习完成!",
    "tool.typing.duration": "用时",
    "tool.typing.chars": "字符",
    "tool.typing.retry": "再试一次",
    "tool.typing.changeArticle": "更换文章",
    "tool.toast.empty": "⚠️ 内容为空，无法复制",
    "tool.toast.copyOk": "✓ 复制成功",
    "tool.toast.copyFail": "✗ 复制失败，请手动复制",
    "tool.img.failAlert": "图片转换失败，请确保图片已完全加载",
    "tool.b64.encodeErr": "编码错误: {msg}",
    "tool.b64.decodeErr": "解码错误: {msg}"
    };

    var current = DEFAULT_LANG;
    var dict = null;
    var ready = false;

    function normalize(lang) {
        return SUPPORTED.indexOf(lang) !== -1 ? lang : DEFAULT_LANG;
    }

    function t(key, vars) {
        var s;
        if (dict && Object.prototype.hasOwnProperty.call(dict, key)) s = dict[key];
        else if (Object.prototype.hasOwnProperty.call(FALLBACK_DICT, key)) s = FALLBACK_DICT[key];
        else s = key;
        if (vars) {
            Object.keys(vars).forEach(function (k) {
                s = s.split('{' + k + '}').join(String(vars[k]));
            });
        }
        return s;
    }

    function applyAttr(scope, attr, prop) {
        var nodes = scope.querySelectorAll('[' + attr + ']');
        Array.prototype.forEach.call(nodes, function (el) {
            var key = el.getAttribute(attr);
            if (key) el.setAttribute(prop, t(key));
        });
    }

    function applyMeta(scope) {
        var metas = scope.querySelectorAll('meta[data-i18n-meta]');
        Array.prototype.forEach.call(metas, function (el) {
            var key = el.getAttribute('data-i18n-meta');
            if (key) el.setAttribute('content', t(key));
        });
    }

    function apply(root) {
        var scope = root || document;
        if (root === undefined) {
            document.documentElement.lang = current;
            document.documentElement.dataset.lang = current;
        }
        var nodes = scope.querySelectorAll('[data-i18n]');
        Array.prototype.forEach.call(nodes, function (el) {
            var key = el.getAttribute('data-i18n');
            if (key) el.textContent = t(key);
        });
        applyAttr(scope, 'data-i18n-placeholder', 'placeholder');
        applyAttr(scope, 'data-i18n-title', 'title');
        applyAttr(scope, 'data-i18n-aria-label', 'aria-label');
        applyAttr(scope, 'data-i18n-alt', 'alt');
        applyMeta(scope);
    }

    function renderSwitcher() {
        var btn = document.getElementById('lang-btn');
        if (!btn) return;
        btn.textContent = shortLabel(current);
        btn.setAttribute('aria-label', t('common.switchLang'));
        btn.setAttribute('title', t('common.switchLang') + ' (' + current + ')');
    }

    /* 在支持列表里轮换到下一个语种（当前仅两个，即互相切换） */
    function nextLang() {
        var idx = SUPPORTED.indexOf(current);
        return SUPPORTED[(idx + 1) % SUPPORTED.length];
    }

    /* 计算站点根相对基准前缀：位于子目录（如 /blogs/xxx.html）时返回 '../'，根页面返回 '' */
    function getSiteBase() {
        return window.location.pathname.split('/').length > 2 ? '../' : '';
    }

    function loadDict(done) {
        if (current === DEFAULT_LANG) {
            dict = FALLBACK_DICT;
            if (done) done();
            return;
        }
        // 词典位于站点根目录下 i18n/，页面可能在子目录（如 /blogs/xxx.html），
        // 因此用站点根相对路径（./ 或 ../）解析，失败时回退内置中文。
        fetch(getSiteBase() + 'i18n/' + current + '.json', { cache: 'no-cache' })
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

    /* 切换按钮点击委托（覆盖 index.html 静态与 nav-loader 注入两种来源） */
    document.addEventListener('click', function (e) {
        var btn = e.target && e.target.closest ? e.target.closest('.lang-btn') : null;
        if (btn) {
            setLang(nextLang());
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
