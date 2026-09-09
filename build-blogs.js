/**
 * build-blogs.js — 博客元数据生成器
 *
 * 从 blogs/*.md 解析文章，自动生成/更新以下内容（避免手动同步遗漏）：
 *   1. js/blogs-data.js          —— 文章元数据回退（file:// 协议下 fetch 被 CORS 阻止时使用）
 *   2. src/legacy/blogs.html     —— 静态 ItemList JSON-LD（爬虫可见）+ <noscript> 文章列表
 *   3. feed.xml                  —— RSS 订阅源（最新在前）
 *   4. llms.txt                  —— AI Agent 友好的文章清单（BLOG-LIST 标记区间）
 *   5. sitemap.xml               —— 博客文章 URL 条目（SITEMAP-BLOGS 标记区间）
 *
 * 解析逻辑与 src/legacy/blogs.html 中的运行时解析器保持一致。
 * 用法: node build-blogs.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = 'https://qinindexcode.site';

/* Load vendored UMD libraries via VM (no npm install needed) */
function loadVendoredUmd(filePath) {
    const ctx = {};
    ctx.globalThis = ctx;
    ctx.self = ctx;
    vm.createContext(ctx);
    const code = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
    vm.runInContext(code, ctx);
    return ctx;
}

const { markdownit } = loadVendoredUmd('js/markdown-it.min.js');
const { hljs } = loadVendoredUmd('js/highlight.min.js');

/* Setup markdown-it with highlight.js to match frontend */
const md = markdownit({
    html: true,
    linkify: true,
    highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return '<pre class="hljs"><code>' +
                       hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
                       '</code></pre>';
            } catch (__) {}
        }
        return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
    }
});

/* slugify for heading ids (matches frontend logic from blogs.html) */
function slugify(text) {
    return String(text || '')
        .trim()
        .toLowerCase()
        .replace(/[\s\u3000]+/g, '-')
        .replace(/[^\w\u4e00-\u9fa5-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'section';
}

/* Add ids to headings for TOC anchors */
const originalHeadingOpen = md.renderer.rules.heading_open || function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
};
md.renderer.rules.heading_open = function (tokens, idx, options, env, self) {
    const token = tokens[idx];
    const nextToken = tokens[idx + 1];
    if (nextToken && nextToken.type === 'inline' && nextToken.content) {
        token.attrSet('id', slugify(nextToken.content));
    }
    return originalHeadingOpen(tokens, idx, options, env, self);
};

const blogDir = path.join(__dirname, 'blogs');
const files = fs.readdirSync(blogDir)
    .filter((f) => /^\d{3}\.md$/i.test(f))
    .sort();

function parseFrontmatter(raw) {
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!match) return { meta: {}, body: raw };
    const meta = {};
    match[1].split(/\r?\n/).forEach((line) => {
        const m = line.match(/^([a-zA-Z_-]+)\s*:\s*(.*)$/);
        if (m) {
            let v = m[2].trim();
            if ((v.startsWith('"') && v.endsWith('"')) ||
                (v.startsWith("'") && v.endsWith("'"))) {
                v = v.slice(1, -1);
            }
            const key = m[1].toLowerCase();
            meta[key] = key === 'tags'
                ? v.split(/,\s*/).map((t) => t.trim()).filter(Boolean)
                : v;
        }
    });
    return { meta, body: raw.slice(match[0].length) };
}

function plainText(body) {
    return body
        .replace(/^##.*$/gm, '')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/\r?\n/g, ' ')
        .trim();
}

function makeExcerpt(body, max = 150) {
    const text = plainText(body);
    return text.length > max ? text.substring(0, max) + '...' : (text || 'No summary');
}

function wordCount(body) {
    const text = body
        .replace(/```[\s\S]*?```/g, '')
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/\r?\n/g, ' ');
    const chinese = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const english = (text.match(/[a-zA-Z]+/g) || []).length;
    return chinese + english;
}

function parseBlog(fileName) {
    const raw = fs.readFileSync(path.join(blogDir, fileName), 'utf8').replace(/^\uFEFF/, '');
    const { meta, body } = parseFrontmatter(raw);

    let title = meta.title || 'Untitled';
    let date = meta.date || 'Unknown';
    const author = meta.author || '匿名';

    if (!meta.title || !meta.date) {
        const firstLine = body.match(/^##\s+(\d{4}-\d{2}-\d{2})\s+(.*)$/m);
        if (firstLine) {
            if (!meta.date) date = firstLine[1].trim();
            if (!meta.title) title = firstLine[2].trim();
        }
    }

    const tags = (meta.tags && meta.tags.length > 0)
        ? meta.tags.map((t) => t.toLowerCase())
        : [];

    return {
        id: fileName.replace(/\.md$/i, ''),
        fileName,
        seq: parseInt(fileName.replace(/\.md$/i, ''), 10),
        title,
        date,
        author,
        excerpt: makeExcerpt(body, 150),
        wordCount: wordCount(body),
        tags,
        body
    };
}

/* Metadata-only view (strips full body) for blogs-data.js & list output */
function toMeta(blog) {
    return {
        id: blog.id,
        fileName: blog.fileName,
        seq: blog.seq,
        title: blog.title,
        date: blog.date,
        author: blog.author,
        excerpt: blog.excerpt,
        wordCount: blog.wordCount,
        tags: blog.tags
    };
}

const blogs = files.map(parseBlog);
if (blogs.length === 0) {
    console.error('build-blogs.js: no blogs found in blogs/');
    process.exit(1);
}
blogs.sort((a, b) => a.seq - b.seq);

function escapeJsonForHtml(text) {
    return text.replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

function escapeXml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function cap(text, max) {
    return text.length > max ? text.substring(0, max).replace(/\.\.\.$/, '') + '...' : text;
}

/* ---------- 1. js/blogs-data.js ---------- */
const dataJsPath = path.join(__dirname, 'js', 'blogs-data.js');
const dataJs = `/* ============================================
   Inlined blog metadata
   Auto-generated from blogs/*.md
   Provides a fallback so the page works on file://
   (where fetch() is blocked by CORS).
   Contains ONLY metadata — no full article content.
   Generated by build-blogs.js — do not edit manually.
   ============================================ */

window.QINBLOG_BLOGS = [
${blogs.map((b) => '  ' + JSON.stringify(toMeta(b), null, 2).split('\n').join('\n  ')).join(',\n')}
];
`;
fs.writeFileSync(dataJsPath, dataJs, 'utf8');
console.log(`js/blogs-data.js: ${blogs.length} entries`);

/* ---------- 2. src/legacy/blogs.html ---------- */
const blogsHtmlPath = path.join(__dirname, 'src', 'legacy', 'blogs.html');
let blogsHtml = fs.readFileSync(blogsHtmlPath, 'utf8');

const itemListJson = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'QinIndexCode 技术博客文章列表',
    description: '分享 JavaScript、前端开发、后端开发等技术文章和实战经验',
    url: `${SITE}/blogs.html`,
    numberOfItems: blogs.length,
    itemListElement: blogs.map((b, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        item: {
            '@type': 'BlogPosting',
            headline: b.title,
            datePublished: b.date,
            url: `${SITE}/blogs/${b.id}.html`,
            description: cap(b.excerpt, 80).replace(/\.\.\.$/, ''),
            keywords: b.tags.join(', '),
            author: { '@type': 'Person', name: b.author }
        }
    }))
};

const jsonldRe = /(<script type="application\/ld\+json" id="blog-itemlist-jsonld">)([\s\S]*?)(<\/script>)/;
if (!jsonldRe.test(blogsHtml)) {
    console.error('build-blogs.js: id="blog-itemlist-jsonld" marker not found in src/legacy/blogs.html');
    process.exit(1);
}
/* JSON.stringify 不转义 < >，转义后内嵌 <script> 中不会出现 </script> 提前闭合 */
const rawJson = JSON.stringify(itemListJson, null, 4);
const safeJson = rawJson.replace(/</g, '\\u003c').replace(/&/g, '\\u0026');
const indented = safeJson.split('\n').map((l) => '    ' + l).join('\n');
blogsHtml = blogsHtml.replace(jsonldRe,
    (_m, open, _old, close) => `${open}\n${indented}\n    ${close}`);

const noscriptRe = /<!-- BLOG-LIST:START -->([\s\S]*?)<!-- BLOG-LIST:END -->/;
if (!noscriptRe.test(blogsHtml)) {
    console.error('build-blogs.js: BLOG-LIST markers not found in src/legacy/blogs.html');
    process.exit(1);
}
const noscriptItems = blogs.map((b) =>
    `<li><a href="./blogs/${b.id}.html">${escapeXml(b.title)}</a> (${b.date}) - ${escapeXml(cap(b.excerpt, 100))} - 标签: ${escapeXml(b.tags.join(', '))}</li>`
).join('\n                ');
blogsHtml = blogsHtml.replace(noscriptRe,
    () => `<!-- BLOG-LIST:START -->\n                ${noscriptItems}\n                <!-- BLOG-LIST:END -->`);
fs.writeFileSync(blogsHtmlPath, blogsHtml, 'utf8');
console.log('src/legacy/blogs.html: JSON-LD + noscript list updated');

/* ---------- 3. feed.xml ---------- */
const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
const nowISO = nowLocal.toISOString().slice(0, 10) + 'T00:00:00+08:00';
const feedItems = [...blogs].reverse().map((b) => `        <item>
            <title>${escapeXml(b.title)}</title>
            <link>${SITE}/blogs/${b.id}.html</link>
            <guid isPermaLink="true">${SITE}/blogs/${b.id}.html</guid>
            <pubDate>${b.date}T00:00:00+08:00</pubDate>
            <description>${escapeXml(cap(b.excerpt, 150))}</description>
            <dc:creator>${escapeXml(b.author)}</dc:creator>
        </item>`).join('\n\n');

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:dc="http://purl.org/dc/elements/1.1/">
    <channel>
        <title>QinIndexCode 技术博客</title>
        <link>${SITE}</link>
        <description>分享 JavaScript、前端开发、后端开发等技术文章和实战经验</description>
        <language>zh-CN</language>
        <lastBuildDate>${nowISO}</lastBuildDate>
        <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>

${feedItems}
    </channel>
</rss>
`;
fs.writeFileSync(path.join(__dirname, 'feed.xml'), feed, 'utf8');
console.log('feed.xml updated');

/* ---------- 4. llms.txt ---------- */
const llmsPath = path.join(__dirname, 'llms.txt');
let llms = fs.readFileSync(llmsPath, 'utf8');
const llmsRe = /<!-- BLOG-LIST:START -->([\s\S]*?)<!-- BLOG-LIST:END -->/;
if (!llmsRe.test(llms)) {
    console.error('build-blogs.js: BLOG-LIST markers not found in llms.txt');
    process.exit(1);
}
const llmsItems = blogs.map((b, i) =>
    `${i + 1}. ${b.title} (${b.date}): ${cap(b.excerpt, 100)} - 标签: ${b.tags.join(', ')} - https://qinindexcode.site/blogs/${b.id}.html`
).join('\n');
llms = llms.replace(llmsRe,
    () => `<!-- BLOG-LIST:START -->\n${llmsItems}\n<!-- BLOG-LIST:END -->`);
fs.writeFileSync(llmsPath, llms, 'utf8');
console.log('llms.txt updated');

/* ---------- 5. sitemap.xml ---------- */
const sitemapPath = path.join(__dirname, 'sitemap.xml');
let sitemap = fs.readFileSync(sitemapPath, 'utf8');
const sitemapRe = /<!-- SITEMAP-BLOGS:START -->([\s\S]*?)<!-- SITEMAP-BLOGS:END -->/;
if (!sitemapRe.test(sitemap)) {
    console.error('build-blogs.js: SITEMAP-BLOGS markers not found in sitemap.xml');
    process.exit(1);
}
const sitemapItems = blogs.map((b) => `    <url>
        <loc>${SITE}/blogs/${b.id}.html</loc>
        <lastmod>${b.date}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>`).join('\n');
sitemap = sitemap.replace(sitemapRe,
    () => `<!-- SITEMAP-BLOGS:START -->\n${sitemapItems}\n    <!-- SITEMAP-BLOGS:END -->`);
fs.writeFileSync(sitemapPath, sitemap, 'utf8');
console.log('sitemap.xml updated');

/* ---------- 6. Standalone article HTML pages ---------- */
function articleEscape(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* Inline styles scoped to standalone article content, following AGENTS.md
   conventions (blockquotes as full rounded cards, no left color bars). */
const ARTICLE_STYLE = `
    /* 正文排版（盒模型与列布局见 css/article.css） */
    .blog-content { line-height: 1.85; word-break: break-word; }
    .blog-content h2 { font-size: 1.35rem; margin: 1.75rem 0 0.75rem; padding-top: 0.5rem; }
    .blog-content h3 { font-size: 1.15rem; margin: 1.4rem 0 0.6rem; }
    .blog-content p { margin: 0.75rem 0; }
    .blog-content a { color: var(--accent); text-decoration: underline; }
    .blog-content ul, .blog-content ol { margin: 0.75rem 0; padding-left: 1.4rem; }
    .blog-content li { margin: 0.35rem 0; }
    .blog-content code { font-family: var(--font-mono, ui-monospace, monospace); font-size: 0.88em;
        background: var(--bg-tertiary, rgba(127,127,127,0.15)); padding: 0.15em 0.4em; border-radius: 0.3rem; }
    .blog-content pre { margin: 1rem 0; border-radius: var(--radius, 0.75rem); overflow-x: auto;
        background: var(--bg-tertiary, #1c1917); padding: 1rem; }
    .blog-content pre code { background: none; padding: 0; }
    .blog-content blockquote { margin: 1rem 0; padding: 0.9rem 1.1rem;
        background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: var(--radius, 0.75rem); }
    .blog-content blockquote p { margin: 0.25rem 0; }
    .blog-content img { max-width: 100%; border-radius: var(--radius, 0.5rem); }
    .blog-content table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    .blog-content th, .blog-content td { border: 1px solid var(--border); padding: 0.5rem 0.75rem; }
    .blog-content hr { border: none; border-top: 1px solid var(--border); margin: 1.5rem 0; }
`;

function renderArticleHtml(b) {
    const bodyHtml = md.render(b.body);
    const canonical = `${SITE}/blogs/${b.id}.html`;
    const description = cap(b.excerpt.replace(/\.\.\.$/, ''), 155).trim();
    const tagList = b.tags.map((t) => articleEscape(t)).join(', ');
    const tagHtml = b.tags.map((t) => `<span class="tag">${articleEscape(t)}</span>`).join('');

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: b.title,
        datePublished: b.date,
        dateModified: b.date,
        description: description,
        inLanguage: 'zh-CN',
        keywords: b.tags.join(', '),
        author: { '@type': 'Person', name: b.author },
        publisher: { '@type': 'Person', name: 'QinIndexCode', url: `${SITE}` },
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
        url: canonical
    };
    const jsonLdHtml = JSON.stringify(jsonLd, null, 2).replace(/</g, '\\u003c');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${articleEscape(b.title)} - QinIndexCode</title>
    <meta name="description" content="${articleEscape(description)}">
    <meta name="keywords" content="${articleEscape(tagList)}">
    <meta name="author" content="${articleEscape(b.author)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${canonical}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${canonical}">
    <meta property="og:site_name" content="QinIndexCode">
    <meta property="og:title" content="${articleEscape(b.title)}">
    <meta property="og:description" content="${articleEscape(description)}">
    <meta property="article:published_time" content="${b.date}">
    <meta property="article:section" content="技术博客">
    ${b.tags.length ? b.tags.map((t) => `    <meta property="article:tag" content="${articleEscape(t)}">`).join('\n') : ''}
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${articleEscape(b.title)}">
    <meta name="twitter:description" content="${articleEscape(description)}">
    <meta property="og:image" content="${SITE}/assets/images/avatar.webp">
    <link rel="icon" type="image/svg+xml" href="../favicon.svg">
    <link rel="icon" type="image/webp" sizes="192x192" href="../assets/images/avatar.webp">
    <link rel="apple-touch-icon" href="../assets/images/avatar.webp">
    <link href="../css/css2.min.css" rel="stylesheet">
    <link href="../css/main.min.css" rel="stylesheet">
    <link href="../css/article.min.css" rel="stylesheet">
    <link href="../css/atom-one-dark.min.css" rel="stylesheet">
    <style>${ARTICLE_STYLE}</style>
    <script type="application/ld+json">
${jsonLdHtml}
    </script>
    <script src="../js/theme-tokens.js"></script>
    <script src="../js/i18n.js" defer></script>
    <script src="../js/nav-loader.js" defer></script>
    <script src="../js/theme-listener.js" defer></script>
    <script src="../js/svg-sprite.js" defer></script>
</head>
<body>
    <!-- 阅读进度条 -->
    <div class="reading-progress-bar" id="reading-progress">
        <div class="progress-fill" id="progress-fill"></div>
    </div>

    <!-- 浮动操作按钮组：返回 / 目录 / 回到顶部 -->
    <div class="floating-actions" id="floating-actions">
        <button class="back-link" id="article-back" type="button" aria-label="返回随记列表">
            <svg class="icon" aria-hidden="true"><use href="#i-arrow-left"></use></svg>
            <span>返回</span>
        </button>
        <button class="toc-float-btn" id="toc-float-btn" type="button" aria-label="文章目录">
            <svg class="icon" aria-hidden="true"><use href="#i-list"></use></svg>
        </button>
        <button class="back-to-top" id="back-to-top" type="button" aria-label="回到顶部">
            <svg class="icon" aria-hidden="true"><use href="#i-chevron-up"></use></svg>
        </button>
    </div>

    <!-- 移动端目录遮罩 -->
    <div class="toc-overlay" id="toc-overlay" aria-hidden="true"></div>

    <main class="container" role="main">
        <div class="blog-layout">
            <!-- 主内容列 -->
            <div class="blog-main">
                <article class="card blog-detail-card">
                    <header class="blog-header">
                        <h1 class="blog-title">${articleEscape(b.title)}</h1>
                        <div class="blog-meta">
                            <span class="meta-item">
                                <svg class="icon icon-sm" aria-hidden="true"><use href="#i-calendar"></use></svg>
                                <time datetime="${b.date}">${articleEscape(b.date)}</time>
                            </span>
                            <span class="meta-item" itemprop="author" itemscope itemtype="https://schema.org/Person">
                                <svg class="icon icon-sm" aria-hidden="true"><use href="#i-feather"></use></svg>
                                <span itemprop="name">${articleEscape(b.author)}</span>
                            </span>
                            ${b.wordCount ? `<span class="meta-item"><svg class="icon icon-sm" aria-hidden="true"><use href="#i-file-text"></use></svg><span>约 ${b.wordCount} 字</span></span>` : ''}
                            ${b.wordCount ? `<span class="meta-item"><svg class="icon icon-sm" aria-hidden="true"><use href="#i-clock"></use></svg><span>约 ${Math.max(1, Math.ceil(b.wordCount / 300))} 分钟阅读</span></span>` : ''}
                        </div>
                    </header>
                    <div class="blog-content" id="blog-content">
${bodyHtml}
                    </div>
                    ${tagHtml ? `<div class="blog-tags">${tagHtml}</div>` : ''}
                </article>

                <!-- 评论（含 giscus，讨论 ID = 文章 ID） -->
                <section class="card comments-card" id="comments-section" aria-labelledby="comments-title">
                    <div class="comments-header">
                        <h2 id="comments-title">
                            <svg class="icon" aria-hidden="true"><use href="#i-message"></use></svg>
                            <span>评论讨论</span>
                        </h2>
                    </div>
                    <div class="giscus" id="giscus-container"></div>
                </section>
            </div>

            <!-- 右侧固定目录 -->
            <aside class="blog-sidebar" id="blog-sidebar" aria-label="文章目录">
                <button class="toc-toggle" id="toc-toggle" type="button" aria-expanded="true" aria-controls="toc-list">
                    <svg class="icon toc-toggle-icon" aria-hidden="true"><use href="#i-list"></use></svg>
                    <span class="toc-toggle-text">目录</span>
                </button>
                <nav class="toc-list" id="toc-list" aria-label="文章目录导航"></nav>
            </aside>
        </div>
    </main>
    <noscript>
        <div style="padding:1.5rem;max-width:820px;margin:0 auto;font-family:system-ui,sans-serif;line-height:1.7;">
            <h1>${articleEscape(b.title)}</h1>
            <p>${articleEscape(b.date)} · ${articleEscape(b.author)}</p>
            <p><a href="../blogs.html">返回随记列表</a></p>
        </div>
    </noscript>
    <script src="../js/article.js" defer></script>
    <script>
        /* 独立文章页初始化：加载 Giscus 评论（讨论 ID 与主站一致 = 文章 ID） */
        (function () {
            'use strict';
            function loadComments() {
                var container = document.getElementById('giscus-container');
                if (!container) return;
                var root = getComputedStyle(document.documentElement);
                var bg = root.getPropertyValue('--bg-primary').trim();
                var theme = (bg === '#0C0A09' || bg.indexOf('0C0A09') !== -1)
                    ? 'https://qinindexcode.site/css/giscus-dark.css'
                    : 'https://qinindexcode.site/css/giscus-light.css';
                var s = document.createElement('script');
                s.src = 'https://giscus.app/client.js';
                s.async = true;
                s.crossOrigin = 'anonymous';
                s.setAttribute('data-repo', 'QinIndexCode/QinIndexCode');
                s.setAttribute('data-repo-id', 'R_kgDOQmJfZg');
                s.setAttribute('data-category', 'General');
                s.setAttribute('data-category-id', 'DIC_kwDOQmJfZs4C3dZh');
                s.setAttribute('data-mapping', 'specific');
                s.setAttribute('data-term', '${b.id}');
                s.setAttribute('data-strict', '0');
                s.setAttribute('data-reactions-enabled', '1');
                s.setAttribute('data-emit-metadata', '0');
                s.setAttribute('data-input-position', 'top');
                s.setAttribute('data-theme', theme);
                s.setAttribute('data-lang', 'zh-CN');
                s.setAttribute('data-loading', 'lazy');
                container.appendChild(s);
            }
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', loadComments);
            } else {
                loadComments();
            }
        })();
    </script>
</body>
</html>`;
}

const articleOutDir = blogDir;
for (const b of blogs) {
    const articlePath = path.join(articleOutDir, `${b.id}.html`);
    fs.writeFileSync(articlePath, renderArticleHtml(b), 'utf8');
}
console.log(`standalone articles: ${blogs.length} html pages generated`);

console.log(`\nDone! ${blogs.length} articles generated.`);
