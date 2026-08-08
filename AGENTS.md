# AGENTS.md — QinIndexCode 项目约定

## 设计规范（必须遵守）

### 禁止：左侧彩色线条样式
禁止任何形式的“左侧彩色竖线”装饰，包括但不限于：
- `border-left: Npx solid <颜色>`（如 blockquote、search-stats、open-source-list 等）
- 用 `::before` + `position: absolute` + `left` 绘制的彩色竖条指示器（如 `.nav-link::before`）

替代方案：
- 引用块（blockquote）→ 整框卡片：`background: var(--bg-tertiary) + border: 1px solid var(--border) + border-radius: var(--radius)`，四角统一圆角
- 激活/当前状态指示 → 背景胶囊（`background: var(--accent-soft)` + 圆角），或 hover 背景高亮
- 列表强调 → 只用 hover 背景色，不做左侧装饰

### 禁止：calc() 中依赖 var() 的乘法
`calc(var(--x) * 36px + ...)` 在旧浏览器中解析失败会导致元素塌陷（如导航胶囊塌成一条线）。
- 布局尺寸一律用 JS 实测 DOM（`offsetTop` / `offsetHeight` 差值）写入内联 px，或直接用常量值
- 相关文件：`css/tools.css` `.nav-progress-pill`（高度由 `js/tools.js` `updateProgressPill()` 按首尾项实测设置）

## 构建流程
- `css/` 根目录是唯一事实源；改 CSS 后必须运行 `node build-css.js`（生成 `*.min.css`）再运行 `node sync-public.js`（同步到 `public/`）
- HTML 源文件在 `src/legacy/`，无 public 副本（SPA 构建时生成）
- 新增/修改博客文章：`blogs/*.md`，运行 `node build-blogs.js`

## 多语言（i18n）
- 词典：`i18n/{lang}.json`（扁平 key，如 `nav.home`）；新增语言 = 新增 JSON + 在 `js/i18n.js` 的 `SUPPORTED` 数组登记
- 标记：元素加 `data-i18n="key"`（文本）或 `data-i18n-aria-label` / `-title` / `-placeholder` / `-alt`；动态内容用 `QinBlogI18n.reload(root)` 重新应用
- `js/i18n.js` 内嵌 zh-CN 兜底词典，改 `i18n/zh-CN.json` 时必须同步更新它
- 语言偏好存 `localStorage('qinblog_lang')`，同源 iframe 靠 `storage` 事件自动同步
- 切换器固定在右上角（`.theme-selector` 内 `.lang-switch`），SPA 壳（`src/legacy/index.html`）与 `js/nav-loader.js` 注入版各有一份
