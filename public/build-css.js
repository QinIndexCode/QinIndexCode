/**
 * 简易 CSS 压缩脚本
 * 用法: node build-css.js
 * 功能: 压缩 main.css, tools.css 为 .min.css 版本
 */
const fs = require('fs');
const path = require('path');

function minifyCSS(css) {
    return css
        // 移除注释（保留 /*@preserve*/）
        .replace(/\/\*[\s\S]*?\*\//g, match => {
            return match.includes('@preserve') ? match : '';
        })
        // 移除换行和多余空格
        .replace(/\s+/g, ' ')
        // 移除规则周围的空格
        .replace(/\s*{\s*/g, '{')
        .replace(/\s*}\s*/g, '}')
        .replace(/\s*;\s*/g, ';')
        .replace(/\s*:\s*/g, ':')
        .replace(/\s*,\s*/g, ',')
        // 移除最后的分号
        .replace(/;}/g, '}')
        // 移除空规则
        .replace(/[^{}]*{\s*}/g, '')
        // 压缩 color-mix 函数中的空格
        .replace(/color-mix\(\s*/g, 'color-mix(')
        .replace(/\s*\)/g, ')')
        // 压缩 calc 函数
        .replace(/calc\(\s*/g, 'calc(')
        // 压缩 rgb/rgba/hsl/hsla
        .replace(/(rgb|rgba|hsl|hsla)\(\s*/g, '$1(')
        // 移除多余空格
        .replace(/\s*([>+~])\s*/g, '$1')
        .trim();
}

const cssDir = path.join(__dirname, 'css');
const files = ['main.css', 'tools.css'];

files.forEach(file => {
    const inputPath = path.join(cssDir, file);
    const outputPath = path.join(cssDir, file.replace('.css', '.min.css'));

    if (!fs.existsSync(inputPath)) {
        console.log(`Skip ${file}: not found`);
        return;
    }

    const original = fs.readFileSync(inputPath, 'utf8');
    const minified = minifyCSS(original);

    fs.writeFileSync(outputPath, minified, 'utf8');

    const savings = ((1 - minified.length / original.length) * 100).toFixed(1);
    console.log(`${file}: ${original.length} → ${minified.length} bytes (${savings}% saved)`);
});

console.log('\nDone! Minified files created in css/ directory.');
