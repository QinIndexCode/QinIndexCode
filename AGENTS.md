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
