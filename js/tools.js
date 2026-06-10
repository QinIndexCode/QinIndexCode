(function () {
    'use strict';

    /* Helper: read a CSS custom property and return as #rrggbb hex */
    function cssVarToHex(varName) {
        var val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
        if (!val) return null;
        /* Already hex */
        if (/^#[0-9a-fA-F]{3,8}$/.test(val)) return val;
        /* rgb() or rgba() → hex */
        var m = val.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (m) {
            var r = parseInt(m[1]), g = parseInt(m[2]), b = parseInt(m[3]);
            return '#' + [r, g, b].map(function (c) {
                var h = c.toString(16);
                return h.length === 1 ? '0' + h : h;
            }).join('');
        }
        return null;
    }

    /* Apply theme-aware defaults to color tools */
    function applyThemeColorDefaults() {
        var accentHex = cssVarToHex('--accent');
        if (!accentHex) return;

        var colorPicker = document.getElementById('color-picker');
        var grad1 = document.getElementById('gradient-color-1');
        var grad2 = document.getElementById('gradient-color-2');

        if (colorPicker && !colorPicker.dataset.userSet) colorPicker.value = accentHex;
        if (grad1 && !grad1.dataset.userSet) grad1.value = accentHex;
        if (grad2 && !grad2.dataset.userSet) {
            /* Slightly darker variant for gradient end */
            var darker = adjustBrightness(accentHex, -30);
            grad2.value = darker || accentHex;
        }

        /* Trigger updates for tools that depend on these values */
        if (grad1) { var ev = new Event('input'); grad1.dispatchEvent(ev); }
    }

    /* Adjust hex brightness by amount (-255 to 255) */
    function adjustBrightness(hex, amount) {
        if (!hex || hex.length < 7) return hex;
        var r = Math.max(0, Math.min(255, parseInt(hex.slice(1, 3), 16) + amount));
        var g = Math.max(0, Math.min(255, parseInt(hex.slice(3, 5), 16) + amount));
        var b = Math.max(0, Math.min(255, parseInt(hex.slice(5, 7), 16) + amount));
        return '#' + [r, g, b].map(function (c) {
            var h = c.toString(16);
            return h.length === 1 ? '0' + h : h;
        }).join('');
    }

    /* Mark user-set colors so theme sync doesn't overwrite them */
    document.addEventListener('change', function (e) {
        if (e.target && e.target.type === 'color') {
            e.target.dataset.userSet = 'true';
        }
    });

    /* Run after DOM ready, also listen for theme changes */
    applyThemeColorDefaults();
    window.addEventListener('themeChanged', applyThemeColorDefaults);
    /* Also re-apply when postMessage theme update arrives */
    window.addEventListener('message', function (e) {
        if (e.data && e.data.type === 'qinblog-theme') {
            applyThemeColorDefaults();
        }
    });

    // --- Navigation Logic ---
        const navToggle = document.getElementById('nav-toggle');
        const toolNav = document.getElementById('tool-nav');

        // Scroll hint: toggle can-scroll class when content overflows
        const toolNavScroll = toolNav.querySelector('.tool-nav-scroll');
        function updateScrollHint() {
            if (toolNavScroll && toolNavScroll.scrollHeight > toolNavScroll.clientHeight) {
                toolNav.classList.add('can-scroll');
            } else {
                toolNav.classList.remove('can-scroll');
            }
        }
        updateScrollHint();
        window.addEventListener('resize', updateScrollHint);

        // Prevent tool-nav-scroll wheel events from bubbling to page
        if (toolNavScroll) {
            toolNavScroll.addEventListener('wheel', (e) => {
                const isScrollingDown = e.deltaY > 0;
                const isAtBottom = toolNavScroll.scrollTop + toolNavScroll.clientHeight >= toolNavScroll.scrollHeight - 1;
                const isAtTop = toolNavScroll.scrollTop <= 0;

                if ((isScrollingDown && !isAtBottom) || (!isScrollingDown && !isAtTop)) {
                    e.stopPropagation();
                }
            }, { passive: true });
        }

        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            toolNav.classList.toggle('open');
            if (toolNav.classList.contains('open')) {
                // Recalculate after transition
                setTimeout(updateScrollHint, 350);
            }
        });

        // Close menu when clicking a link (mobile)
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 1024) {
                    navToggle.classList.remove('active');
                    toolNav.classList.remove('open');
                }
            });
        });

        // Scroll Spy - 胶囊进度指示器 (使用 IntersectionObserver)
        const sections = document.querySelectorAll('.tool-card');
        const navItems = document.querySelectorAll('.nav-item');
        const progressPill = document.querySelector('.nav-progress-pill');
        const toolNavEl = document.getElementById('tool-nav');

        function getVisibleColumnCount() {
            const cards = document.querySelectorAll('.tool-card');
            if (cards.length < 2) return 1;
            const firstY = cards[0].offsetTop;
            let count = 1;
            for (let i = 1; i < cards.length; i++) {
                if (Math.abs(cards[i].offsetTop - firstY) < 10) {
                    count++;
                } else {
                    break;
                }
            }
            return count;
        }

        let isUserScrollingNav = false;
        let navScrollTimeout = null;

        function updateProgressPill() {
            if (!progressPill || !toolNavEl) return;

            const colCount = getVisibleColumnCount();
            const currentIndex = activeSectionIndex;

            // Find which row the current section is in
            const currentRow = Math.floor(currentIndex / colCount);
            // Calculate the range of nav items for this row
            const navStart = currentRow * colCount;
            const navEnd = Math.min(navStart + colCount, navItems.length);
            const navCount = navEnd - navStart;

            if (navCount > 0 && navStart < navItems.length) {
                const firstItem = navItems[navStart];
                const lastItem = navItems[navEnd - 1];

                if (firstItem && lastItem) {
                    // Use offsetTop relative to scroll container for accurate positioning
                    const scrollContainer = toolNavEl.querySelector('.tool-nav-scroll');
                    const firstTop = firstItem.offsetTop;

                    toolNavEl.style.setProperty('--pill-count', navCount);
                    progressPill.style.transform = 'translateY(' + firstTop + 'px)';
                    toolNavEl.classList.add('has-pill');
                }
            } else {
                toolNavEl.classList.remove('has-pill');
            }

            // Sync nav scroll to keep active items visible (only when page scrolls, not user nav scroll)
            if (!isUserScrollingNav && toolNavScroll && navItems[currentIndex]) {
                const colCount = getVisibleColumnCount();
                const currentRow = Math.floor(currentIndex / colCount);
                const navStart = currentRow * colCount;
                const navEnd = Math.min(navStart + colCount, navItems.length);

                const firstItem = navItems[navStart];
                const lastItem = navItems[navEnd - 1];
                if (!firstItem || !lastItem) return;

                const firstTop = firstItem.offsetTop;
                const lastBottom = lastItem.offsetTop + lastItem.offsetHeight;
                const containerHeight = toolNavScroll.clientHeight;
                const scrollTop = toolNavScroll.scrollTop;

                let targetScroll = null;
                if (firstTop < scrollTop) {
                    targetScroll = firstTop - 4;
                } else if (lastBottom > scrollTop + containerHeight) {
                    targetScroll = lastBottom - containerHeight + 4;
                }

                if (targetScroll !== null) {
                    toolNavScroll.scrollTo({ top: targetScroll, behavior: 'smooth' });
                }
            }
        }

        // Track user scrolling on nav to prevent conflicts
        if (toolNavScroll) {
            toolNavScroll.addEventListener('scroll', () => {
                isUserScrollingNav = true;
                if (navScrollTimeout) clearTimeout(navScrollTimeout);
                navScrollTimeout = setTimeout(() => {
                    isUserScrollingNav = false;
                }, 150);
            }, { passive: true });
        }

        // Use IntersectionObserver for smooth and efficient updates
        const observerOptions = {
            root: null,
            rootMargin: '-40% 0px -40% 0px',
            threshold: 0
        };

        let activeSectionIndex = 0;
        let pendingUpdate = false;

        const sectionObserver = new IntersectionObserver((entries) => {
            let bestIndex = activeSectionIndex;
            let bestRatio = -1;

            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const idx = Array.from(sections).indexOf(entry.target);
                    if (idx !== -1 && entry.intersectionRatio > bestRatio) {
                        bestRatio = entry.intersectionRatio;
                        bestIndex = idx;
                    }
                }
            });

            if (bestIndex !== activeSectionIndex) {
                activeSectionIndex = bestIndex;
                if (!pendingUpdate) {
                    pendingUpdate = true;
                    requestAnimationFrame(() => {
                        updateProgressPill();
                        pendingUpdate = false;
                    });
                }
            }
        }, observerOptions);

        sections.forEach(section => sectionObserver.observe(section));

        // Initial update after a short delay to ensure layout is stable
        setTimeout(updateProgressPill, 150);

        // Fallback: update on resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                activeSectionIndex = 0;
                updateProgressPill();
            }, 100);
        });

        // Hover Interaction Sync
        sections.forEach(section => {
            section.addEventListener('mouseenter', () => {
                const id = section.getAttribute('id');
                navItems.forEach(item => {
                    item.classList.remove('hover-sync');
                    if (item.getAttribute('href').slice(1) === id) {
                        item.classList.add('hover-sync');
                    }
                });
            });

            section.addEventListener('mouseleave', () => {
                navItems.forEach(item => item.classList.remove('hover-sync'));
            });
        });

        // --- Tools 命名空间 - 封装全局函数 ---
        window.Tools = {};

        // Helper: Copy (跨浏览器兼容)
        Tools.copyToClipboard = function (elementId) {
            const el = document.getElementById(elementId);
            const text = el && (el.value !== undefined ? el.value : el.textContent);
            if (!text) {
                showToast('⚠️ 内容为空，无法复制', 'warning');
                return;
            }

            let copied = false;

            // 方案1：同步 execCommand（必须在用户手势同步路径中执行）
            try {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;z-index:-1;';
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                copied = document.execCommand('copy');
                document.body.removeChild(textarea);
            } catch (_) {
                copied = false;
            }

            // 方案2：异步 Clipboard API（execCommand 失败后再试）
            if (!copied && navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(() => {
                    showCopyFeedback(el);
                    showToast('✓ 复制成功', 'success');
                }).catch(() => {
                    showToast('✗ 复制失败，请手动复制', 'error');
                });
                return;
            }

            if (!copied) {
                showToast('✗ 复制失败，请手动复制', 'error');
                return;
            }

            showCopyFeedback(el);
            showToast('✓ 复制成功', 'success');
        };

        // 复制成功按钮反馈
        function showCopyFeedback(el) {
            const btn = el && el.nextElementSibling;
            if (!btn || !btn.classList.contains('copy-btn')) return;
            const originalHTML = btn.innerHTML;
            btn.classList.add('copying');
            btn.innerHTML = '<svg class="icon" style="width:1em;height:1em;" aria-hidden="true"><use href="#i-check"></use></svg>';
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.classList.remove('copying');
            }, 1200);
        }

        // Toast 提示函数
        function showToast(message, type = 'info') {
            const existing = document.querySelector('.toast-notification');
            if (existing) existing.remove();

            const toast = document.createElement('div');
            toast.className = `toast-notification toast-${type}`;
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed;
                bottom: 2rem;
                left: 50%;
                transform: translateX(-50%);
                background: ${type === 'success' ? 'var(--accent-green)' : type === 'error' ? 'var(--accent-red)' : 'var(--accent-blue)'};
                color: white;
                padding: 0.75rem 1.5rem;
                border-radius: var(--border-radius);
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                z-index: 10000;
                animation: toastSlide 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            `;

            document.body.appendChild(toast);

            setTimeout(() => {
                toast.style.animation = 'toastSlide 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse';
                setTimeout(() => toast.remove(), 300);
            }, 2000);
        }

        // 添加 Toast 动画 CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes toastSlide {
                from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
        `;
        document.head.appendChild(style);

        // --- 1. Image Converter ---
        const imgUpload = document.getElementById('img-upload');
        const imgControls = document.getElementById('img-controls');
        const imgPreview = document.getElementById('img-preview');
        const imgConvertBtn = document.getElementById('img-convert-btn');
        let currentImg = null;

        imgUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    currentImg = img;
                    imgControls.classList.remove('hidden');
                    imgPreview.innerHTML = '';
                    img.style.maxWidth = '100%';
                    imgPreview.appendChild(img);
                    imgPreview.classList.remove('hidden');
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });

        imgConvertBtn.addEventListener('click', () => {
            if (!currentImg) return;

            try {
                const canvas = document.createElement('canvas');
                canvas.width = currentImg.naturalWidth;
                canvas.height = currentImg.naturalHeight;

                const ctx = canvas.getContext('2d');
                const format = document.getElementById('img-format').value;

                // JPEG 格式不支持透明度，需要白色背景
                // PNG 和 WebP 支持透明度，保持透明
                if (format === 'image/jpeg') {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                // 完整绘制图片到 canvas
                ctx.drawImage(currentImg, 0, 0, canvas.width, canvas.height);

                const quality = parseFloat(document.getElementById('img-quality').value);
                const dataUrl = canvas.toDataURL(format, quality);

                let ext = format.split('/')[1];
                if (ext === 'x-icon') ext = 'ico';

                const link = document.createElement('a');
                link.download = `converted.${ext}`;
                link.href = dataUrl;
                link.click();
            } catch (error) {
                console.error('图片转换失败:', error);
                alert('图片转换失败，请确保图片已完全加载');
            }
        });

        // --- 2. QR Code ---
        document.getElementById('qr-gen-btn').addEventListener('click', () => {
            const text = document.getElementById('qr-text').value.trim();
            if (!text) return;
            const container = document.getElementById('qr-output');
            container.innerHTML = '';
            document.getElementById('qr-container').classList.remove('hidden');
            try {
                new QRCode(container, {
                    text: text,
                    width: 200,
                    height: 200,
                    colorDark: document.getElementById('qr-color-dark').value,
                    colorLight: document.getElementById('qr-color-light').value,
                    correctLevel: QRCode.CorrectLevel.H
                });
            } catch (e) { container.textContent = 'Err'; }
        });

        // --- 3. Timestamp ---
        setInterval(() => {
            document.getElementById('ts-now').value = Date.now();
        }, 1000);

        document.getElementById('ts-to-date-btn').addEventListener('click', () => {
            let val = document.getElementById('ts-input').value.trim();
            if (!val) return;
            // Guess if seconds or ms
            if (val.length === 10) val *= 1000;
            const date = new Date(parseInt(val));
            document.getElementById('ts-date-output').value = date.toLocaleString();
        });

        // --- 4. JSON ---
        const jsonIn = document.getElementById('json-input');
        const jsonOut = document.getElementById('json-output');
        document.getElementById('json-fmt-btn').addEventListener('click', () => {
            try { jsonOut.value = JSON.stringify(JSON.parse(jsonIn.value), null, 2); }
            catch (e) { jsonOut.value = "Invalid JSON"; }
        });
        document.getElementById('json-minify-btn').addEventListener('click', () => {
            try { jsonOut.value = JSON.stringify(JSON.parse(jsonIn.value)); }
            catch (e) { jsonOut.value = "Invalid JSON"; }
        });

        // --- 5. Base64 & 6. URL ---
        const b64In = document.getElementById('b64-input');
        const b64Out = document.getElementById('b64-output');

        // 安全的 UTF-8 到 Base64 编码（替代废弃的 unescape）
        function utf8ToBase64(str) {
            const utf8Bytes = new TextEncoder().encode(str);
            const base64String = btoa(String.fromCharCode(...utf8Bytes));
            return base64String;
        }

        // 安全的 Base64 到 UTF-8 解码（替代废弃的 escape）
        function base64ToUtf8(base64) {
            const binaryString = atob(base64);
            const utf8Bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                utf8Bytes[i] = binaryString.charCodeAt(i);
            }
            return new TextDecoder().decode(utf8Bytes);
        }

        document.getElementById('b64-encode-btn').addEventListener('click', () => {
            try { b64Out.value = utf8ToBase64(b64In.value); } catch (e) { b64Out.value = "编码错误: " + e.message; }
        });
        document.getElementById('b64-decode-btn').addEventListener('click', () => {
            try { b64Out.value = base64ToUtf8(b64In.value); } catch (e) { b64Out.value = "解码错误: " + e.message; }
        });

        const urlIn = document.getElementById('url-input');
        const urlOut = document.getElementById('url-output');
        document.getElementById('url-encode-btn').addEventListener('click', () => urlOut.value = encodeURIComponent(urlIn.value));
        document.getElementById('url-decode-btn').addEventListener('click', () => urlOut.value = decodeURIComponent(urlIn.value));

        // --- 7. Color Converter Enhanced ---
        const colorPicker = document.getElementById('color-picker');
        const alphaSlider = document.getElementById('alpha-slider');
        const alphaVal = document.getElementById('alpha-val');
        const colorInput = document.getElementById('color-input');
        const colorPreviewInner = document.getElementById('color-preview-inner');
        const colorFormat = document.getElementById('color-format'); // New format selector

        function hexToRgb(hex) {
            // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
            const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
            hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        }

        function updateColorFromControls() {
            const hex = colorPicker.value;
            const alpha = parseFloat(alphaSlider.value);
            alphaVal.textContent = alpha.toFixed(2);

            const rgb = hexToRgb(hex);
            const format = colorFormat.value;
            let result = "";

            if (format === 'rgb') {
                // Force RGB/RGBA
                result = alpha === 1 ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
            } else if (format === 'hex') {
                // Force HEX (with alpha if needed)
                let alphaHex = alpha === 1 ? "" : Math.round(alpha * 255).toString(16).padStart(2, '0');
                result = `${hex}${alphaHex}`;
            } else {
                // Auto (Default behavior)
                if (alpha === 1) {
                    result = hex;
                } else {
                    result = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
                }
            }

            colorInput.value = result;
            colorPreviewInner.style.backgroundColor = result;
        }

        function updateControlsFromInput() {
            let val = colorInput.value.trim().toLowerCase();
            let hex = "#000000";
            let alpha = 1;

            if (val.startsWith('#')) {
                // HEX
                if (val.length === 4 || val.length === 7) {
                    hex = val;
                } else if (val.length === 9) {
                    // #RRGGBBAA
                    hex = val.substring(0, 7);
                    alpha = parseInt(val.substring(7, 9), 16) / 255;
                }
            } else if (val.startsWith('rgb')) {
                // RGB / RGBA
                const parts = val.match(/(\d+(\.\d+)?)/g);
                if (parts) {
                    const r = parseInt(parts[0]);
                    const g = parseInt(parts[1]);
                    const b = parseInt(parts[2]);
                    const toHex = (c) => {
                        const h = Math.min(255, Math.max(0, c)).toString(16);
                        return h.length == 1 ? "0" + h : h;
                    };
                    hex = "#" + toHex(r) + toHex(g) + toHex(b);

                    if (parts.length >= 4) {
                        alpha = parseFloat(parts[3]);
                    }
                }
            }

            // Update controls
            colorPicker.value = hex;
            alphaSlider.value = alpha;
            alphaVal.textContent = alpha.toFixed(2);
            colorPreviewInner.style.backgroundColor = val; // Try to use input directly for preview
        }

        colorPicker.addEventListener('input', updateColorFromControls);
        alphaSlider.addEventListener('input', updateColorFromControls);
        colorFormat.addEventListener('change', updateColorFromControls); // Listen for format changes
        colorInput.addEventListener('input', updateControlsFromInput);

        // Init
        updateColorFromControls();


        // --- 8. Password Generator ---
        const pwdLen = document.getElementById('pwd-len');
        pwdLen.addEventListener('input', (e) => document.getElementById('pwd-len-val').textContent = e.target.value);

        document.getElementById('pwd-gen-btn').addEventListener('click', () => {
            const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
            const len = parseInt(pwdLen.value);
            let pwd = "";
            for (let i = 0; i < len; i++) {
                pwd += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            document.getElementById('pwd-output').value = pwd;
        });

        // --- 9. Lorem Ipsum ---
        const loremText = [
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
            "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
            "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
            "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
            "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
        ];
        Tools.genLorem = function (count) {
            let res = "";
            for (let i = 0; i < count; i++) {
                res += loremText[i % loremText.length] + " ";
            }
            document.getElementById('lorem-output').value = res;
        };

        // --- 10. Markdown Editor ---
        const mdPreview = document.getElementById('md-preview');
        const mdExpandBtn = document.getElementById('md-expand-btn');
        const mdModal = document.getElementById('md-modal');
        const mdCloseBtn = document.getElementById('md-close-btn');
        const mdModalInput = document.getElementById('md-modal-input');
        const mdModalPreview = document.getElementById('md-modal-preview');
        const mdTogglePreviewBtn = document.getElementById('md-toggle-preview-btn');

        // 使用已有的 markdown-it 库（如果已加载）
        let mdParser = null;
        if (window.markdownit) {
            mdParser = window.markdownit({
                html: true,
                linkify: true,
                typographer: true
            });
        }

        Tools.parseMarkdown = function (text) {
            if (mdParser) {
                return mdParser.render(text);
            }
            // 简单的手动解析（如果 markdown-it 不可用）
            return text
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
                .replace(/\*(.*)\*/gim, '<em>$1</em>')
                .replace(/^- (.*$)/gim, '<li>$1</li>')
                .replace(/\[(.*)\]\((.*)\)/gim, '<a href="$2" target="_blank">$1</a>')
                .replace(/`(.*?)`/gim, '<code>$1</code>')
                .replace(/\n/gim, '<br>');
        };

        /* Default markdown content */
        var _defaultMdText = "# Hello Markdown\n\n**粗体** 和 *斜体*\n\n- 列表项 1\n- 列表项 2\n\n[链接示例](https://example.com)";

        /* Render compact preview in card */
        function renderCompactPreview() {
            if (!mdModalInput.value) mdModalInput.value = _defaultMdText;
            mdPreview.innerHTML = Tools.parseMarkdown(mdModalInput.value);
        }
        renderCompactPreview();

        /* Compact preview click also opens modal */
        mdPreview.addEventListener('click', openMdModal);

        function openMdModal() {
            if (!mdModalInput.value) mdModalInput.value = _defaultMdText;
            mdModalPreview.innerHTML = Tools.parseMarkdown(mdModalInput.value);
            mdModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            mdModalInput.focus();
        }

        function closeMdModal() {
            mdModal.classList.add('hidden');
            document.body.style.overflow = '';
            /* Sync back to compact preview */
            renderCompactPreview();
        }

        mdExpandBtn.addEventListener('click', openMdModal);
        mdCloseBtn.addEventListener('click', closeMdModal);

        /* Live sync: editor -> preview */
        mdModalInput.addEventListener('input', function () {
            mdModalPreview.innerHTML = Tools.parseMarkdown(mdModalInput.value);
        });

        /* Toggle preview pane visibility */
        mdTogglePreviewBtn.addEventListener('click', function () {
            mdModalPreview.classList.toggle('hidden');
            mdTogglePreviewBtn.classList.toggle('active');
        });

        /* Click modal background to close */
        mdModal.addEventListener('click', function (e) {
            if (e.target === mdModal) closeMdModal();
        });

        /* ESC to close */
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !mdModal.classList.contains('hidden')) {
                closeMdModal();
            }
        });

        // --- 11. CSS Shadow Generator ---
        const shadowX = document.getElementById('shadow-x');
        const shadowY = document.getElementById('shadow-y');
        const shadowBlur = document.getElementById('shadow-blur');
        const shadowSpread = document.getElementById('shadow-spread');
        const shadowColor = document.getElementById('shadow-color');
        const shadowOpacity = document.getElementById('shadow-opacity');
        const shadowBox = document.getElementById('shadow-box');
        const shadowOutput = document.getElementById('shadow-output');

        function updateShadow() {
            const x = parseInt(shadowX.value);
            const y = parseInt(shadowY.value);
            const blur = parseInt(shadowBlur.value);
            const spread = parseInt(shadowSpread.value);
            const color = shadowColor.value;
            const opacity = parseFloat(shadowOpacity.value);

            // 更新显示值
            document.getElementById('shadow-x-val').textContent = x;
            document.getElementById('shadow-y-val').textContent = y;
            document.getElementById('shadow-blur-val').textContent = blur;
            document.getElementById('shadow-spread-val').textContent = spread;
            document.getElementById('shadow-opacity-val').textContent = opacity.toFixed(2);

            // 转换 hex 为 rgba
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);

            const shadowValue = `${x}px ${y}px ${blur}px ${spread}px rgba(${r}, ${g}, ${b}, ${opacity})`;
            shadowBox.style.boxShadow = shadowValue;
            shadowOutput.value = `box-shadow: ${shadowValue};`;
        }

        [shadowX, shadowY, shadowBlur, shadowSpread, shadowColor, shadowOpacity].forEach(el => {
            el.addEventListener('input', updateShadow);
        });

        updateShadow();

        // --- 12. Font Size Converter ---
        const baseFontSize = document.getElementById('base-font-size');
        const fontValue = document.getElementById('font-value');
        const fontUnit = document.getElementById('font-unit');
        const fontConvertBtn = document.getElementById('font-convert-btn');

        function convertFontSize() {
            const base = parseFloat(baseFontSize.value) || 16;
            const value = parseFloat(fontValue.value) || 0;
            const unit = fontUnit.value;

            let pxValue;

            // 转换为 px
            switch (unit) {
                case 'px': pxValue = value; break;
                case 'rem': pxValue = value * base; break;
                case 'em': pxValue = value * base; break;
                case 'pt': pxValue = value * 1.333; break;
                default: pxValue = value;
            }

            // 转换为所有单位
            const remValue = pxValue / base;
            const emValue = pxValue / base;
            const ptValue = pxValue / 1.333;

            // 显示结果
            document.getElementById('font-px').value = `${pxValue.toFixed(2)}px`;
            document.getElementById('font-rem').value = `${remValue.toFixed(4)}rem`;
            document.getElementById('font-em').value = `${emValue.toFixed(4)}em`;
            document.getElementById('font-pt').value = `${ptValue.toFixed(2)}pt`;
        }

        fontConvertBtn.addEventListener('click', convertFontSize);
        baseFontSize.addEventListener('input', convertFontSize);

        // 初始转换
        convertFontSize();

        // --- 13. CSS Gradient Generator ---
        const gradientAngle = document.getElementById('gradient-angle');
        const gradientColor1 = document.getElementById('gradient-color-1');
        const gradientColor2 = document.getElementById('gradient-color-2');
        const gradientPreview = document.getElementById('gradient-preview');
        const gradientOutput = document.getElementById('gradient-output');

        function updateGradient() {
            const angle = parseInt(gradientAngle.value);
            const color1 = gradientColor1.value;
            const color2 = gradientColor2.value;

            document.getElementById('gradient-angle-val').textContent = angle;

            const gradientValue = `linear-gradient(${angle}deg, ${color1}, ${color2})`;
            gradientPreview.style.background = gradientValue;
            gradientOutput.value = `background: ${gradientValue};`;
        }

        [gradientAngle, gradientColor1, gradientColor2].forEach(el => {
            el.addEventListener('input', updateGradient);
        });

        updateGradient();

        // --- 14. Typing Practice Tool ---
        const typingArticles = [
            {
                title: "The Art of Programming",
                content: `Programming is not merely about writing code that computers can understand. It is about expressing ideas with precision and clarity, about solving problems in elegant ways that future developers can comprehend and maintain. The best programmers are not those who write the most clever or complex code, but those who can take seemingly insurmountable challenges and break them down into simple, digestible pieces that can be implemented step by step.

When we think about programming as an art form, we begin to appreciate the craftsmanship involved in software development. Just as a skilled carpenter carefully selects each piece of wood and plans every joint, a skilled programmer carefully considers each function, each variable name, and each architectural decision. The code we write is a reflection of our thinking process, and like any form of communication, it can be clear or confusing, beautiful or ugly.

The journey to becoming a master programmer is long and requires constant learning. New languages, frameworks, and paradigms emerge regularly, and what was considered best practice yesterday may be obsolete tomorrow. Yet despite all these changes, the fundamental principles of good software design remain constant. Writing code that is easy to read, understand, and modify will always be valuable.

Testing is another crucial aspect of programming that separates amateur efforts from professional work. Tests serve as documentation for your code, showing exactly what behavior is expected and ensuring that changes don't break existing functionality. A well-tested codebase gives developers the confidence to refactor and improve their work without fear of introducing bugs.

Debugging is where many programmers truly learn their craft. When something goes wrong, you must systematically eliminate possibilities until you find the root cause. This process teaches you more about how systems work than any tutorial or documentation ever could. Every bug you fix makes you a better programmer.`
            },
            {
                title: "Space Exploration",
                content: `The vast emptiness of space has captivated human imagination since the dawn of civilization. For millennia, we gazed at the stars and wondered what lay beyond our small blue planet. The invention of the telescope in the early seventeenth century marked the beginning of our scientific exploration of the cosmos, allowing us to see distant planets and galaxies as more than just points of light in the night sky.

The mid-twentieth century brought the Space Age, a period of unprecedented technological achievement and competitive spirit between nations. The Soviet Union launched Sputnik, the first artificial satellite, in 1957, shocking the world and sparking the space race. Just twelve years later, Neil Armstrong became the first human to walk on the Moon, fulfilling President Kennedy's ambitious goal and marking a triumph for all of humanity.

Today, space exploration has evolved far beyond national competitions to become a collaborative effort involving multiple countries and even private companies. The International Space Station serves as a symbol of what humanity can achieve when we work together, hosting astronauts from various nations for extended missions that advance our understanding of how humans can live and work in space for prolonged periods.

Mars remains the next great frontier in our exploration of the solar system. With its relatively Earth-like conditions and potential for future colonization, the Red Planet captures our collective imagination. Several space agencies and private companies are actively developing the technology needed to send humans to Mars, though significant challenges remain regarding life support, radiation protection, and the psychological demands of such a long journey.

The search for extraterrestrial life continues to drive much of our exploration efforts. From the icy moons of Jupiter to the methane lakes of Titan, our solar system offers many promising targets for investigation. The discovery of thousands of exoplanets in recent years has only intensified this interest, suggesting that the conditions for life may be far more common in the universe than we once believed.`
            },
            {
                title: "The Digital Age",
                content: `The digital revolution has transformed virtually every aspect of modern life in ways our ancestors could scarcely have imagined. From how we communicate and work to how we learn and entertain ourselves, digital technology has fundamentally altered the fabric of human society. This transformation did not happen overnight but rather evolved gradually over several decades, accelerating dramatically as computing power increased and connectivity became ubiquitous.

The internet stands as perhaps the most significant technological achievement of our time, creating a global network that connects billions of people and devices. This vast digital infrastructure enables instant communication across continents, facilitates global commerce, and provides access to an unprecedented amount of information. Yet this same technology has also created new challenges, from concerns about privacy and security to the spread of misinformation and the concentration of power in the hands of a few tech giants.

Social media platforms have revolutionized how we interact with one another, creating new forms of community and self-expression while simultaneously raising concerns about their impact on mental health and social cohesion. The algorithms that power these platforms are designed to maximize engagement, often showing us content that reinforces our existing beliefs and preferences, potentially creating echo chambers that divide rather than unite us.

Artificial intelligence and machine learning have emerged as transformative technologies with applications spanning healthcare, transportation, finance, and countless other industries. These systems can now diagnose diseases, drive cars, and generate creative content with remarkable proficiency. As AI capabilities continue to advance, questions about automation, employment, and the very nature of intelligence become increasingly pressing.

The concept of digital identity has become central to modern life, with online accounts and digital credentials shaping how we access services, establish trust, and participate in the digital economy. This reliance on digital systems has created new vulnerabilities, as cyberattacks and data breaches can have devastating consequences for individuals and organizations alike. Navigating this complex digital landscape requires both technological solutions and thoughtful policies that balance innovation with protection.`
            },
            {
                title: "Environmental Challenges",
                content: `Our planet faces a constellation of environmental challenges that threaten the delicate balance of ecosystems upon which all life depends. Climate change, driven primarily by human activities releasing greenhouse gases into the atmosphere, stands as perhaps the most pressing issue of our time. Rising global temperatures lead to melting ice caps, rising sea levels, and increasingly severe weather events that displace communities and devastate livelihoods across the globe.

The loss of biodiversity represents another crisis unfolding before our eyes. Species are going extinct at rates unseen since the dinosaur extinction, with approximately one million plant and animal species facing extinction within decades. This loss of biodiversity disrupts ecosystem services that sustain human life, including pollination, water purification, and climate regulation. The interconnectedness of natural systems means that each species lost can trigger cascading effects throughout entire ecosystems.

Deforestation continues at alarming rates, with forests that took millennia to develop being cleared in mere decades for agriculture, logging, and urban expansion. These forests are not merely collections of trees but complex ecosystems home to countless species and vital carbon sinks that help regulate the global climate. Their destruction releases stored carbon into the atmosphere while eliminating habitats and resources upon which local communities depend.

Ocean acidification, a direct consequence of absorbing excess carbon dioxide from the atmosphere, poses a grave threat to marine ecosystems. Coral reefs, often called the rainforests of the sea due to their incredible biodiversity, are particularly vulnerable. As ocean chemistry changes, the organisms that build coral skeletons struggle to form their calcium carbonate structures, threatening entire reef ecosystems and the countless species that call them home.

Despite these challenges, there are reasons for optimism. Renewable energy technologies have advanced dramatically, with solar and wind power becoming increasingly cost-competitive with fossil fuels. International cooperation has led to agreements like the Paris Climate Accord, demonstrating that nations can work together to address global challenges. Grassroots movements around the world are demanding action, and innovative solutions are emerging from unexpected places. The path forward requires collective action, sustainable practices, and a fundamental shift in how we relate to the natural world.`
            },
            {
                title: "The Future of AI",
                content: `Artificial intelligence has transitioned from science fiction to everyday reality, permeating nearly every aspect of modern life. The algorithms that recommend what we watch, shop for, and read are all forms of AI, constantly learning from our behaviors to deliver increasingly personalized experiences. This technology has brought remarkable conveniences but also raised profound questions about privacy, autonomy, and the nature of intelligence itself.

Machine learning, particularly deep learning, has driven most recent advances in AI. By training neural networks on vast datasets, researchers have created systems that can recognize images, translate languages, and even generate creative content with superhuman proficiency. These achievements, while impressive, represent narrow intelligence rather than the general intelligence that humans possess. An AI can beat world champions at chess but cannot understand why the game matters to us.

The development of large language models represents a significant milestone in AI progress. These systems can engage in natural conversation, answer questions, and assist with creative and analytical tasks. They demonstrate emergent capabilities that surprise even their creators, suggesting that as AI systems grow larger and more complex, they may develop new forms of intelligence that we do not fully understand.

Concerns about AI safety and alignment have grown alongside these advances. Ensuring that AI systems act in accordance with human values and intentions becomes crucial as these tools become more powerful and autonomous. Researchers grapple with questions about how to specify human preferences in ways that AI systems can understand and respect, and how to build AI that remains beneficial even as capabilities increase.

The economic implications of AI are profound and far-reaching. While automation has historically created new jobs even as it eliminated others, the scope of AI capabilities raises questions about whether this pattern will continue. Entire categories of work, from data entry to even some forms of professional analysis, may be susceptible to automation. Preparing society for these changes requires thoughtful policies, education reforms, and safety nets that can support workers transitioning between industries.`
            },
            {
                title: "Mindfulness Practice",
                content: `In our fast-paced world filled with constant notifications, endless tasks, and relentless demands on our attention, the ancient practice of mindfulness offers a sanctuary of stillness and clarity. Mindfulness, at its core, is the simple act of paying attention to the present moment with intention and without judgment. While this concept has roots in Buddhist meditation traditions, modern science has validated its benefits and developed accessible methods for incorporating mindfulness into daily life.

Research has demonstrated that regular mindfulness practice can produce measurable changes in brain structure and function. Studies using magnetic resonance imaging have shown that mindfulness meditation can increase gray matter density in regions associated with attention, emotional regulation, and self-awareness. These findings suggest that mindfulness is not merely a subjective experience but produces genuine neurological changes that enhance cognitive function and emotional wellbeing.

The applications of mindfulness extend far beyond personal meditation practice. Healthcare professionals have integrated mindfulness-based interventions into treatment protocols for conditions ranging from chronic pain to depression to anxiety disorders. Corporations have adopted mindfulness programs to reduce stress and improve employee wellbeing. Schools are experimenting with mindfulness education to help students develop focus and emotional resilience.

Starting a mindfulness practice requires no special equipment or significant time investment. Even brief periods of deliberate attention, practiced consistently, can yield benefits. The key is approaching the practice with patience and self-compassion, recognizing that the wandering mind is not a failure but an opportunity to practice the skill of gently returning attention to the present moment.

The challenges of modern life make mindfulness more relevant than ever. Our devices fragment our attention, pulling us in countless directions and rarely allowing us to fully engage with any single experience. Cultivating mindful awareness offers a path to deeper engagement with life, richer relationships, and greater equanimity in the face of inevitable difficulties. In a world that constantly demands our attention, choosing where to direct that attention may be the most powerful choice we can make.`
            }
        ];

        const typingModal = document.getElementById('typing-modal');
        const typingSetup = document.getElementById('typing-setup');
        const typingPractice = document.getElementById('typing-practice');
        const typingResults = document.getElementById('typing-results');
        const typingStartBtn = document.getElementById('typing-start-btn');
        const typingCloseBtn = document.getElementById('typing-close-btn');
        const typingBeginBtn = document.getElementById('typing-begin-btn');
        const typingInput = document.getElementById('typing-input');
        const typingTextDisplay = document.getElementById('typing-text-display');
        const typingArticleCards = document.querySelectorAll('.typing-article-card');
        const typingTimeBtns = document.querySelectorAll('.typing-time-btn');
        const typingRestartBtn = document.getElementById('typing-restart-btn');
        const typingChangeArticleBtn = document.getElementById('typing-change-article-btn');
        const customTimeInput = document.getElementById('typing-custom-time-input');

        let selectedArticleIndex = 0;
        let selectedTime = 0;
        let currentCharIndex = 0;
        let correctChars = 0;
        let incorrectChars = 0;
        let startTime = null;
        let timerInterval = null;
        let isTyping = false;
        let timerStarted = false;

        function openTypingModal() {
            typingModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            showTypingSetup();
        }

        function closeTypingModal() {
            typingModal.classList.add('hidden');
            document.body.style.overflow = '';
            stopTyping();
        }

        function showTypingSetup() {
            typingSetup.classList.remove('hidden');
            typingPractice.classList.add('hidden');
            typingResults.classList.add('hidden');
            stopTyping();
        }

        function showTypingPractice() {
            typingSetup.classList.add('hidden');
            typingPractice.classList.remove('hidden');
            typingResults.classList.add('hidden');
        }

        function showTypingResults() {
            typingSetup.classList.add('hidden');
            typingPractice.classList.add('hidden');
            typingResults.classList.remove('hidden');
        }

        function selectArticle(index) {
            selectedArticleIndex = index;
            typingArticleCards.forEach((card, i) => {
                card.classList.toggle('selected', i === index);
            });
        }

        function selectTime(time, isCustom = false) {
            selectedTime = time;
            typingTimeBtns.forEach(btn => {
                btn.classList.toggle('selected', parseInt(btn.dataset.time) === time);
            });
            if (isCustom) {
                document.querySelector('.typing-custom-time').classList.remove('hidden');
            } else {
                document.querySelector('.typing-custom-time').classList.add('hidden');
            }
        }

        function initTypingDisplay() {
            const article = typingArticles[selectedArticleIndex];
            const chars = article.content.split('');

            // 使用 DocumentFragment 优化性能
            const fragment = document.createDocumentFragment();
            const tempContainer = document.createElement('div');

            chars.forEach((char, index) => {
                const span = document.createElement('span');
                span.className = 'typing-char' + (index === 0 ? ' current' : ' pending');
                if (char === ' ') span.classList.add('space');
                span.dataset.index = index;
                span.innerHTML = char === ' ' ? '&nbsp;' : (char === '\n' ? '<br>' : char);
                tempContainer.appendChild(span);
            });

            // 一次性添加所有元素
            typingTextDisplay.innerHTML = '';
            typingTextDisplay.appendChild(tempContainer);
        }

        function startTyping() {
            const timeSetting = selectedTime > 0 ? selectedTime : (customTimeInput.value ? parseInt(customTimeInput.value) : 0);
            if (timeSetting > 0) {
                selectedTime = timeSetting;
            }

            currentCharIndex = 0;
            correctChars = 0;
            incorrectChars = 0;
            startTime = null;
            isTyping = true;
            timerStarted = false;

            initTypingDisplay();
            showTypingPractice();

            if (selectedTime > 0) {
                updateTimerDisplay(selectedTime);
            } else {
                document.getElementById('typing-time-display').textContent = '--:--';
            }

            setTimeout(() => {
                typingInput.focus();
            }, 100);
        }

        function startTimer() {
            if (timerStarted) return;
            timerStarted = true;
            let remaining = selectedTime;
            updateTimerDisplay(remaining);
            timerInterval = setInterval(() => {
                remaining--;
                updateTimerDisplay(remaining);
                if (remaining <= 0) {
                    endTyping();
                }
            }, 1000);
        }

        function updateTimerDisplay(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            document.getElementById('typing-time-display').textContent =
                `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }

        function stopTyping() {
            isTyping = false;
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
        }

        function endTyping() {
            stopTyping();
            const results = calculateResults();
            displayResults(results);
            showTypingResults();
        }

        function calculateResults() {
            const elapsedSeconds = startTime ? (Date.now() - startTime) / 1000 : 0;
            const words = correctChars / 5;
            const wpm = elapsedSeconds > 0 ? Math.round(words / (elapsedSeconds / 60)) : 0;
            const accuracy = (correctChars + incorrectChars) > 0
                ? Math.round((correctChars / (correctChars + incorrectChars)) * 100)
                : 100;
            return {
                wpm,
                accuracy,
                time: Math.round(elapsedSeconds),
                chars: correctChars
            };
        }

        function displayResults(results) {
            document.getElementById('typing-result-wpm').textContent = results.wpm;
            document.getElementById('typing-result-accuracy').textContent = results.accuracy + '%';
            document.getElementById('typing-result-time').textContent = results.time + 's';
            document.getElementById('typing-result-chars').textContent = results.chars;
        }

        function updateTypingDisplay() {
            const chars = typingTextDisplay.querySelectorAll('.typing-char');
            chars.forEach((charSpan, index) => {
                charSpan.classList.remove('current', 'correct', 'incorrect', 'pending');
                if (index < currentCharIndex) {
                    charSpan.classList.add(charSpan.dataset.correct === 'true' ? 'correct' : 'incorrect');
                } else if (index === currentCharIndex) {
                    charSpan.classList.add('current');
                } else {
                    charSpan.classList.add('pending');
                }
            });

            const progress = Math.round((currentCharIndex / chars.length) * 100);
            document.getElementById('typing-progress-display').textContent = progress + '%';

            const results = calculateResults();
            document.getElementById('typing-wpm-display').textContent = results.wpm;
            document.getElementById('typing-accuracy-display').textContent = results.accuracy + '%';

            if (currentCharIndex < chars.length) {
                const currentChar = chars[currentCharIndex];
                currentChar.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            }
        }

        function handleTyping(e) {
            if (!isTyping) return;

            const article = typingArticles[selectedArticleIndex];
            const typedChar = e.data;

            if (typedChar !== null && currentCharIndex < article.content.length) {
                if (!startTime) {
                    startTime = Date.now();
                    if (selectedTime > 0) {
                        startTimer();
                    }
                }

                const chars = typingTextDisplay.querySelectorAll('.typing-char');
                const currentSpan = chars[currentCharIndex];
                const expectedChar = article.content[currentCharIndex];

                if (typedChar === expectedChar) {
                    currentSpan.dataset.correct = 'true';
                    correctChars++;
                } else {
                    currentSpan.dataset.correct = 'false';
                    incorrectChars++;
                }

                currentCharIndex++;
                updateTypingDisplay();

                if (currentCharIndex >= article.content.length) {
                    endTyping();
                }
            }
        }

        function handleKeydown(e) {
            if (!isTyping) return;

            if (e.key === 'Tab' || e.key === 'Escape') {
                e.preventDefault();
                endTyping();
                return;
            }

            if (e.key === 'Backspace' && currentCharIndex > 0) {
                e.preventDefault();
                currentCharIndex--;
                const chars = typingTextDisplay.querySelectorAll('.typing-char');
                const prevSpan = chars[currentCharIndex];

                if (prevSpan.dataset.correct === 'true') {
                    correctChars = Math.max(0, correctChars - 1);
                } else {
                    incorrectChars = Math.max(0, incorrectChars - 1);
                }

                prevSpan.dataset.correct = '';
                updateTypingDisplay();
            }
        }

        typingArticleCards.forEach((card, index) => {
            card.addEventListener('click', () => selectArticle(index));
        });

        typingTimeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const time = parseInt(btn.dataset.time);
                selectTime(time, time < 0);
            });
        });

        customTimeInput.addEventListener('focus', () => {
            typingTimeBtns.forEach(btn => btn.classList.remove('selected'));
            document.querySelector('.typing-custom-time').classList.remove('hidden');
        });

        typingStartBtn.addEventListener('click', openTypingModal);
        typingCloseBtn.addEventListener('click', closeTypingModal);
        typingBeginBtn.addEventListener('click', startTyping);
        typingRestartBtn.addEventListener('click', () => {
            showTypingSetup();
            setTimeout(startTyping, 100);
        });
        typingChangeArticleBtn.addEventListener('click', () => {
            showTypingSetup();
        });

        typingModal.addEventListener('click', (e) => {
            if (e.target === typingModal) {
                closeTypingModal();
            }
        });

        typingTextDisplay.addEventListener('click', () => {
            if (isTyping) {
                typingInput.focus();
            }
        });

        typingInput.addEventListener('input', handleTyping);
        typingInput.addEventListener('keydown', handleKeydown);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !typingModal.classList.contains('hidden')) {
                if (isTyping) {
                    endTyping();
                } else {
                    closeTypingModal();
                }
            }
        });

})();
