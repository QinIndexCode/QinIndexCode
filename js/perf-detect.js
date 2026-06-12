/**
 * 性能检测模块
 *
 * 通过 FPS 采样、设备硬件信息综合评估设备性能等级，
 * 决定是否启用高开销的鼠标跟随光晕效果。
 *
 * 等级划分：
 *   high   — 启用完整光晕 + 动画
 *   medium — 禁用光晕，保留 CSS hover 动画
 *   low    — 禁用光晕，最小化所有过渡动画
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'qinblog-perf-level';
    var SAMPLE_DURATION = 1500;   // FPS 采样时长 ms
    var SAMPLE_THRESHOLD = {
        high: 50,    // >= 50 fps → high
        medium: 30   // >= 30 fps → medium, < 30 → low
    };

    /**
     * 检测硬件并发数（CPU 核心数）
     */
    function getHardwareConcurrency() {
        return navigator.hardwareConcurrency || 2;
    }

    /**
     * 检测设备内存（仅 Chrome 支持）
     */
    function getDeviceMemory() {
        return navigator.deviceMemory || 4;
    }

    /**
     * 检测是否为移动设备
     */
    function isMobile() {
        return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i
            .test(navigator.userAgent)
            || window.matchMedia('(hover: none)').matches
            || window.matchMedia('(pointer: coarse)').matches;
    }

    /**
     * 通过 requestAnimationFrame 采样 FPS
     */
    function measureFPS(callback) {
        var frames = 0;
        var startTime = null;
        var rafId = null;

        function tick(timestamp) {
            if (startTime === null) startTime = timestamp;
            frames++;
            if (timestamp - startTime < SAMPLE_DURATION) {
                rafId = requestAnimationFrame(tick);
            } else {
                var fps = Math.round((frames * 1000) / (timestamp - startTime));
                callback(fps);
            }
        }

        rafId = requestAnimationFrame(tick);

        // 超时保护：如果 raf 停止，5 秒后强制结束
        setTimeout(function () {
            if (rafId) {
                cancelAnimationFrame(rafId);
                var elapsed = Date.now() - (startTime || Date.now());
                var fps = elapsed > 0 ? Math.round((frames * 1000) / elapsed) : 0;
                callback(fps);
            }
        }, SAMPLE_DURATION + 500);
    }

    /**
     * 综合评估性能等级
     */
    function evaluate(fps) {
        var cores = getHardwareConcurrency();
        var memory = getDeviceMemory();

        // 移动设备降级
        if (isMobile()) {
            if (cores <= 4 && memory <= 4) return 'low';
            if (fps < SAMPLE_THRESHOLD.medium) return 'low';
            return 'medium';
        }

        // 桌面设备评估
        if (fps >= SAMPLE_THRESHOLD.high && cores >= 4) return 'high';
        if (fps >= SAMPLE_THRESHOLD.medium && cores >= 2) return 'medium';
        return 'low';
    }

    /**
     * 在文档根元素上设置性能等级 class
     */
    function applyLevel(level) {
        var root = document.documentElement;
        root.classList.remove('perf-high', 'perf-medium', 'perf-low');
        root.classList.add('perf-' + level);
        root.dataset.perfLevel = level;
    }

    /**
     * 主入口：检测并应用性能等级
     */
    function detect() {
        // 1. 检查 localStorage 缓存（避免重复检测）
        try {
            var cached = localStorage.getItem(STORAGE_KEY);
            if (cached === 'high' || cached === 'medium' || cached === 'low') {
                applyLevel(cached);
                return cached;
            }
        } catch (e) { /* localStorage may be blocked */ }

        // 2. 移动设备直接判定，跳过 FPS 采样
        if (isMobile()) {
            var mem = getDeviceMemory();
            var level = mem <= 3 ? 'low' : 'medium';
            applyLevel(level);
            try { localStorage.setItem(STORAGE_KEY, level); } catch (e) { /* ignore */ }
            return level;
        }

        // 3. 桌面设备进行 FPS 采样
        applyLevel('medium'); // 采样期间先用中等级别

        measureFPS(function (fps) {
            var finalLevel = evaluate(fps);
            applyLevel(finalLevel);
            try { localStorage.setItem(STORAGE_KEY, finalLevel); } catch (e) { /* ignore */ }

            // 开发环境输出检测结果
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('[PerfDetect] FPS:', fps,
                    '| Cores:', getHardwareConcurrency(),
                    '| Memory:', getDeviceMemory() + 'GB',
                    '| Level:', finalLevel);
            }
        });

        return 'medium'; // 返回默认值，采样完成后会更新
    }

    // 暴露全局接口
    window.QinBlogPerf = {
        detect: detect,
        getLevel: function () {
            return document.documentElement.dataset.perfLevel || 'medium';
        },
        // 允许用户手动切换等级（调试用）
        setLevel: function (level) {
            if (level === 'high' || level === 'medium' || level === 'low') {
                applyLevel(level);
                try { localStorage.setItem(STORAGE_KEY, level); } catch (e) { /* ignore */ }
            }
        }
    };

    // 立即执行检测
    detect();
})();
