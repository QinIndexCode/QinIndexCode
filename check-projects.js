#!/usr/bin/env node
/**
 * check-projects.js — 项目清单一致性校验（CI 步骤）
 *
 * 校验三项：
 *  1. data/projects.json 的 github 链接集合 == projects.html 卡片区实际出现的
 *     https://github.com/... 链接集合（双向：多余/缺失均报错），防止 JSON 与页面漂移
 *  2. llms.txt PROJECT-LIST 区间 == 由 JSON 生成的期望文本（防手工改乱）
 *  3. projects.html PROJECT-NOSCRIPT 区间 == 由 JSON 生成的期望文本
 *
 * 任一失败以非零退出码结束，供 CI 拦截。生成格式与 build-projects.js 保持一致。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const errors = [];

function loadOrFail(p) {
    if (!fs.existsSync(p)) { errors.push(`[file] 缺失 ${p}`); return null; }
    return fs.readFileSync(p, 'utf8');
}

const projectsRaw = loadOrFail(path.join(__dirname, 'data/projects.json'));
let projects = [];
if (projectsRaw) {
    try { projects = JSON.parse(projectsRaw); }
    catch (e) { errors.push(`[parse] data/projects.json: ${e.message}`); }
}
const jsonGithub = new Set(projects.map((p) => p.github));

/* 1. JSON github 链接 vs projects.html 卡片区链接 */
const html = loadOrFail(path.join(__dirname, 'src/legacy/projects.html'));
if (html) {
    const htmlGithub = new Set(
        [...html.matchAll(/href="(https:\/\/github\.com\/[^"]+)"/g)].map((m) => m[1])
    );
    for (const u of htmlGithub) if (!jsonGithub.has(u)) errors.push(`[1] projects.html 有多余 github 链接 ${u}（data/projects.json 缺失该条目？）`);
    for (const u of jsonGithub) if (!htmlGithub.has(u)) errors.push(`[1] data/projects.json 的项目 ${u} 未在 projects.html 中找到链接`);
    console.log(`[1] JSON ${jsonGithub.size} 项 vs HTML 卡片 ${htmlGithub.size} 个唯一链接`);
}

/* 2 / 3. 生成期望文本，与标记区间比对 */
function expectedLlmsItems() {
    return projects.map((p) => `  - ${p.name}: ${p.desc}`).join('\n');
}
function expectedNoscriptItems() {
    const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return projects.map((p) => `<li><strong>${esc(p.name)}</strong>: ${esc(p.desc)} <a href="${p.github}">GitHub</a></li>`).join('\n            ');
}

function checkRegion(name, text, start, end, expected, file) {
    const re = new RegExp(`${start}([\\s\\S]*?)${end}`);
    if (!re.test(text)) { errors.push(`[${file}] 缺少 ${start}${end} 标记`); return; }
    const actual = re.exec(text)[1].trim();
    if (actual !== expected.trim()) {
        errors.push(`[${file}] ${name} 与 data/projects.json 不一致（请运行 node build-projects.js 重新生成）`);
    } else {
        console.log(`[${file}] ${name} 与 JSON 一致`);
    }
}

if (html) checkRegion('noscript 项目清单', html, '<!-- PROJECT-NOSCRIPT:START -->', '<!-- PROJECT-NOSCRIPT:END -->', expectedNoscriptItems(), 'projects.html');

const llms = loadOrFail(path.join(__dirname, 'llms.txt'));
if (llms) checkRegion('项目清单', llms, '<!-- PROJECT-LIST:START -->', '<!-- PROJECT-LIST:END -->', expectedLlmsItems(), 'llms.txt');

if (errors.length) {
    console.error(`\n项目清单一致性检查失败，共 ${errors.length} 项：`);
    for (const e of errors) console.error('  ' + e);
    console.error('\n提示：若 projects.html 或 data/projects.json 有改动，请先运行 node build-projects.js 重新生成。');
    process.exit(1);
}
console.log('\n项目清单一致性检查通过（data/projects.json ↔ projects.html ↔ llms.txt 完全一致）。');