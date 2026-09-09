/**
 * build-projects.js — 项目清单生成器
 *
 * data/projects.json 是项目清单的唯一事实源。本脚本根据它自动更新两处，
 * 避免与 projects.html 手动维护多条清单发生漂移：
 *   1. llms.txt       —— PROJECT-LIST 区间（AI Agent 友好清单）
 *   2. projects.html  —— PROJECT-NOSCRIPT 区间（禁用 JS 时爬虫/用户可见）
 *
 * 用法: node build-projects.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadProjects() {
    const raw = fs.readFileSync(path.join(__dirname, 'data/projects.json'), 'utf8');
    return JSON.parse(raw);
}

function escapeHtml(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const projects = loadProjects();
if (!Array.isArray(projects) || projects.length === 0) {
    console.error('build-projects.js: data/projects.json 缺少项目条目');
    process.exit(1);
}

/* ---------- 1. llms.txt : PROJECT-LIST 区间 ---------- */
const llmsPath = path.join(__dirname, 'llms.txt');
let llms = fs.readFileSync(llmsPath, 'utf8');
const llmsRe = /<!-- PROJECT-LIST:START -->([\s\S]*?)<!-- PROJECT-LIST:END -->/;
if (!llmsRe.test(llms)) {
    console.error('build-projects.js: PROJECT-LIST 标记不在 llms.txt 中');
    process.exit(1);
}
const llmsItems = projects
    .map((p) => `  - ${p.name}: ${p.desc}`)
    .join('\n');
llms = llms.replace(llmsRe,
    () => `<!-- PROJECT-LIST:START -->\n${llmsItems}\n<!-- PROJECT-LIST:END -->`);
fs.writeFileSync(llmsPath, llms, 'utf8');
console.log(`llms.txt: 项目清单已更新（${projects.length} 项）`);

/* ---------- 2. projects.html : PROJECT-NOSCRIPT 区间 ---------- */
const projectsHtmlPath = path.join(__dirname, 'src/legacy/projects.html');
const projectsHtml = fs.readFileSync(projectsHtmlPath, 'utf8');
const noscriptRe = /<!-- PROJECT-NOSCRIPT:START -->([\s\S]*?)<!-- PROJECT-NOSCRIPT:END -->/;
if (!noscriptRe.test(projectsHtml)) {
    console.error('build-projects.js: PROJECT-NOSCRIPT 标记不在 projects.html 中');
    process.exit(1);
}
const noscriptItems = projects
    .map((p) => `<li><strong>${escapeHtml(p.name)}</strong>: ${escapeHtml(p.desc)} <a href="${p.github}">GitHub</a></li>`)
    .join('\n            ');
fs.writeFileSync(projectsHtmlPath, projectsHtml.replace(noscriptRe,
    () => `<!-- PROJECT-NOSCRIPT:START -->\n            ${noscriptItems}\n            <!-- PROJECT-NOSCRIPT:END -->`), 'utf8');
console.log('projects.html: noscript 项目清单已更新');

console.log(`\nDone! ${projects.length} projects reflected.`);