/**
 * sync-public.js — 将根目录源文件同步到 public/
 *
 * Astro 构建时只复制 public/ 到 dist/，而源码（js/css/blogs 及站点级静态文件）
 * 位于根目录。本脚本在构建前把根目录视为唯一事实源，同步到 public/：
 *   - 目录: js/ css/ blogs/ assets/
 *   - 文件: feed.xml sitemap.xml robots.txt llms.txt donations.md
 *           README.md CNAME sw.js .nojekyll
 *
 * 注意: 只做单向复制，不删除 public/ 中多出的文件。
 * 用法: node sync-public.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const pub = path.join(__dirname, 'public');

const DIRS = ['js', 'css', 'blogs', 'assets'];
const FILES = [
    'feed.xml', 'sitemap.xml', 'robots.txt', 'llms.txt',
    'donations.md', 'README.md', 'CNAME', 'sw.js', '.nojekyll'
];

function copyDir(srcDir, destDir) {
    if (!fs.existsSync(srcDir)) return;
    fs.mkdirSync(destDir, { recursive: true });
    let count = 0;
    for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
        const src = path.join(srcDir, entry.name);
        const dest = path.join(destDir, entry.name);
        if (entry.isDirectory()) {
            count += copyDir(src, dest);
        } else {
            fs.copyFileSync(src, dest);
            count++;
        }
    }
    return count;
}

let total = 0;
for (const dir of DIRS) {
    const n = copyDir(path.join(root, dir), path.join(pub, dir));
    if (n === undefined) {
        console.log(`skip dir (not found): ${dir}/`);
        continue;
    }
    total += n;
    console.log(`synced dir: ${dir}/ (${n} files)`);
}

for (const file of FILES) {
    const src = path.join(root, file);
    if (!fs.existsSync(src)) {
        console.log(`skip file (not found): ${file}`);
        continue;
    }
    fs.copyFileSync(src, path.join(pub, file));
    total++;
    console.log(`synced file: ${file}`);
}

console.log(`\nDone! ${total} files synced root -> public/`);
