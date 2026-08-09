#!/usr/bin/env node
/**
 * check-i18n.js — i18n 一致性校验（CI 步骤）
 *
 * 校验三项：
 *  1. i18n/zh-CN.json 与 js/i18n.js 内嵌兜底词典 FALLBACK_DICT 键集合一致、值一致
 *  2. src/legacy/*.html 中 data-i18n(/-* ) 引用的 key 在 zh-CN.json / en-US.json 中全部存在
 *  3. 两个词典之间键集合一致（zh 与 en 对齐）
 *
 * 任一失败以非零退出码结束，供 CI 拦截。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)));
const errors = [];
const load = (p) => {
    const file = path.join(root, p);
    if (!fs.existsSync(file)) { errors.push(`[file] 缺失 ${p}`); return {}; }
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (e) { errors.push(`[parse] ${p}: ${e.message}`); return {}; }
};

const zh = load('i18n/zh-CN.json');
const en = load('i18n/en-US.json');

/* 1. FALLBACK_DICT 与 zh-CN.json 同步 */
const i18nSrc = fs.readFileSync(path.join(root, 'js/i18n.js'), 'utf8');
const m = i18nSrc.match(/FALLBACK_DICT\s*=\s*\{([\s\S]*?)\n\s*\};/);
const embedded = {};
if (m) {
    const re = /"([a-zA-Z0-9_.]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
    let mm;
    while ((mm = re.exec(m[1]))) {
        embedded[mm[1]] = mm[2]
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\')
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\r/g, '\r');
    }
}
const zhKeys = Object.keys(zh);
const emKeys = Object.keys(embedded);
for (const k of zhKeys) if (!(k in embedded)) errors.push(`[1] zh-CN.json 键「${k}」未同步进 js/i18n.js 内嵌词典`);
for (const k of emKeys) if (!(k in zh)) errors.push(`[1] js/i18n.js 内嵌词典键「${k}」不在 zh-CN.json（是否漏删？）`);
for (const k of zhKeys) if (k in embedded && zh[k] !== embedded[k]) errors.push(`[1] 键「${k}」值不同：JSON="${zh[k]}" vs JS="${embedded[k]}"`);
console.log(`[1] zh-CN.json ${zhKeys.length} 键 vs 内嵌 ${emKeys.length} 键`);

/* 2. HTML 引用键齐全性 */
const legacyDir = path.join(root, 'src/legacy');
const used = new Set();
if (fs.existsSync(legacyDir)) {
    for (const f of fs.readdirSync(legacyDir).filter((x) => x.endsWith('.html'))) {
        const html = fs.readFileSync(path.join(legacyDir, f), 'utf8');
        for (const mm of html.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g)) used.add(mm[1]);
    }
}
for (const k of used) {
    if (!(k in zh)) errors.push(`[2] zh-CN.json 缺 HTML 引用键 ${k}`);
    if (!(k in en)) errors.push(`[2] en-US.json 缺 HTML 引用键 ${k}`);
}

/* 3. zh / en 键集合对齐 */
for (const k of zhKeys) if (!(k in en)) errors.push(`[3] en-US.json 缺少 zh 键 ${k}`);
for (const k of Object.keys(en)) if (!(k in zh)) errors.push(`[3] zh-CN.json 缺少 en 键 ${k}（多余键？）`);

console.log(`i18n check: html 引用 ${used.size} 键`);
if (errors.length) {
    console.error('\ni18n 一致性检查失败，共 ' + errors.length + ' 项：');
    for (const e of errors) console.error('  ' + e);
    process.exit(1);
}
console.log('i18n 一致性检查通过（zh/en/内嵌词典键值完全同步）。');