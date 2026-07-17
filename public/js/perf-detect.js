/**
 * 性能检测模块 v2
 *
 * 通过多轮 FPS 采样（取中位数）、GPU 型号识别、CPU 核心数、
 * 设备内存、屏幕 DPR 等多维度加权评分，综合评估设备性能等级。
 *
 * 等级划分：
 *   high   — 启用完整光晕 + 动画
 *   medium — 禁用光晕，保留 CSS hover 动画
 *   low    — 禁用光晕，最小化所有过渡动画
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'qinblog-perf-level-v2';
    var CACHE_TTL = 3600000; // 缓存有效期 1 小时

    /* =============================================
       1. 硬件信息采集
       ============================================= */

    function getCPUThreads() {
        return navigator.hardwareConcurrency || 2;
    }

    function getDeviceMemoryGB() {
        // Chrome/Edge 63+: navigator.deviceMemory (单位 GB, 0.25~8)
        // Firefox/Safari: 不支持，返回 undefined → 合理推断
        if (navigator.deviceMemory) return navigator.deviceMemory;
        // 无法检测时根据 CPU 核心数启发式推断
        var cores = getCPUThreads();
        if (cores >= 8) return 8;
        if (cores >= 4) return 4;
        return 2;
    }

    /**
     * 通过 WebGL 检测 GPU 型号
     * 返回 { renderer: string, vendor: string, tier: 1|2|3 }
     *   tier 1 = 集成显卡 / 低端
     *   tier 2 = 中端独显
     *   tier 3 = 高端独显
     */
    function detectGPU() {
        var canvas = document.createElement('canvas');
        var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return { renderer: 'unknown', vendor: 'unknown', tier: 1 };

        var debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (!debugInfo) return { renderer: 'unknown', vendor: 'unknown', tier: 2 };

        var renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
        var vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';

        // 释放资源
        var ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();

        var tier = classifyGPU(renderer.toLowerCase());
        return { renderer: renderer, vendor: vendor, tier: tier };
    }

    function classifyGPU(name) {
        // 高端独显（tier 3）
        if (/rtx\s*(4\d{3}|5\d{3}|3\d{3,4})|gtx\s*(1[6-9]\d{2}|2\d{3}|3\d{3})|radeon\s*rx\s*(7\d{3}|6\d{3}|5\d{3})|radeon\s*pro|iris\s*xe|apple\s*m[1-4]/i.test(name)) {
            return 3;
        }
        // 中端独显（tier 2）
        if (/gtx\s*(1[0-5]\d{2}|9\d{2})|gt\s*[1-9]\d{2}|radeon\s*(rx\s*)?(4\d{3}|5\d{3}|5\d{2})|mx\d{3}|intel.*hd|iris\s*(plus|xe)|adreno\s*(6[3-9]\d|[7-9]\d{2})|mali-g(7[1-9]|[89])/i.test(name)) {
            return 2;
        }
        // 集成显卡 / 低端（tier 1）
        return 1;
    }

    function isMobile() {
        return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i
            .test(navigator.userAgent)
            || window.matchMedia('(hover: none)').matches
            || window.matchMedia('(pointer: coarse)').matches;
    }

    function getDPR() {
        return window.devicePixelRatio || 1;
    }

    /* =============================================
       2. FPS 采样（多轮取中位数）
       ============================================= */

    /**
     * 单轮 FPS 采样
     * @param {number} duration 采样时长 ms
     * @param {function} callback 回调 fps
     */
    function sampleFPS(duration, callback) {
        var frames = 0;
        var startTime = null;
        var finished = false;

        // 丢弃前几帧（页面加载抖动）
        var warmupFrames = 0;
        var WARMUP = 10;

        function tick(timestamp) {
            if (finished) return;
            if (startTime === null) startTime = timestamp;

            if (warmupFrames < WARMUP) {
                warmupFrames++;
                requestAnimationFrame(tick);
                return;
            }

            frames++;
            if (timestamp - startTime < duration) {
                requestAnimationFrame(tick);
            } else {
                finished = true;
                var elapsed = timestamp - startTime;
                callback(elapsed > 0 ? Math.round((frames * 1000) / elapsed) : 0);
            }
        }

        requestAnimationFrame(tick);

        // 超时保护
        setTimeout(function () {
            if (!finished) {
                finished = true;
                callback(0);
            }
        }, duration + 2000);
    }

    /**
     * 多轮采样取中位数
     * @param {number} rounds 采样轮数
     * @param {number} duration 每轮时长 ms
     * @param {function} callback 回调 { fps, samples }
     */
    function multiSampleFPS(rounds, duration, callback) {
        var samples = [];
        var done = 0;

        // 串行采样，避免并发 raf 冲突
        function runNext() {
            if (done >= rounds) {
                // 排序取中位数
                var sorted = samples.slice().sort(function (a, b) { return a - b; });
                var mid = Math.floor(sorted.length / 2);
                var median = sorted.length % 2 !== 0
                    ? sorted[mid]
                    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
                callback({ fps: median, samples: samples });
                return;
            }
            sampleFPS(duration, function (fps) {
                samples.push(fps);
                done++;
                // 轮间间隔 100ms 让浏览器恢复
                setTimeout(runNext, 100);
            });
        }

        runNext();
    }

    /* =============================================
       3. 加权评分系统
       ============================================= */

    /**
     * 各维度分值（满分 100）
     *   FPS    权重 50%  — 最直接的体感指标
     *   GPU    权重 25%  — 决定渲染能力上限
     *   CPU    权重 15%  — 计算能力
     *   Memory 权重 10%  — 多任务余量
     */
    function scoreFPS(fps) {
        if (fps >= 58) return 100;   // 满帧
        if (fps >= 50) return 85;
        if (fps >= 45) return 70;
        if (fps >= 35) return 55;
        if (fps >= 25) return 35;
        if (fps >= 15) return 15;
        return 0;
    }

    function scoreGPU(tier) {
        if (tier === 3) return 100;
        if (tier === 2) return 60;
        return 25;
    }

    function scoreCPU(threads) {
        if (threads >= 16) return 100;
        if (threads >= 8) return 85;
        if (threads >= 6) return 70;
        if (threads >= 4) return 55;
        if (threads >= 2) return 35;
        return 15;
    }

    function scoreMemory(gb) {
        if (gb >= 16) return 100;
        if (gb >= 8) return 80;
        if (gb >= 4) return 55;
        return 30;
    }

    function computeLevel(score) {
        if (score >= 65) return 'high';
        if (score >= 40) return 'medium';
        return 'low';
    }

    /* =============================================
       4. 主流程
       ============================================= */

    function applyLevel(level) {
        var root = document.documentElement;
        root.classList.remove('perf-high', 'perf-medium', 'perf-low');
        root.classList.add('perf-' + level);
        root.dataset.perfLevel = level;
    }

    function detect() {
        // 1. 缓存命中（带 TTL 校验）
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var cached = JSON.parse(raw);
                if (cached.level && cached.ts && (Date.now() - cached.ts < CACHE_TTL)) {
                    applyLevel(cached.level);
                    return cached.level;
                }
            }
        } catch (e) { /* localStorage may be blocked */ }

        // 2. 移动设备：跳过 FPS 采样，直接硬件评估
        if (isMobile()) {
            var gpu = detectGPU();
            var memGB = getDeviceMemoryGB();
            var threads = getCPUThreads();
            var mobileScore = scoreGPU(gpu.tier) * 0.4
                + scoreCPU(threads) * 0.35
                + scoreMemory(memGB) * 0.25;
            var mobileLevel = mobileScore >= 55 ? 'medium' : 'low';
            applyLevel(mobileLevel);
            cacheResult(mobileLevel);
            return mobileLevel;
        }

        // 3. 桌面设备：多轮 FPS 采样 + 硬件评估
        applyLevel('medium'); // 采样期间默认 medium

        // 延迟 500ms 开始采样，等页面渲染稳定
        setTimeout(function () {
            multiSampleFPS(3, 2000, function (result) {
                var gpu = detectGPU();
                var threads = getCPUThreads();
                var memGB = getDeviceMemoryGB();

                var fpsScore = scoreFPS(result.fps);
                var gpuScore = scoreGPU(gpu.tier);
                var cpuScore = scoreCPU(threads);
                var memScore = scoreMemory(memGB);

                var totalScore = fpsScore * 0.50
                    + gpuScore * 0.25
                    + cpuScore * 0.15
                    + memScore * 0.10;

                var level = computeLevel(totalScore);
                applyLevel(level);
                cacheResult(level);

                // 开发环境详细日志
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    console.log('[PerfDetect v2]', {
                        fps: result.fps,
                        samples: result.samples,
                        gpu: gpu.renderer,
                        gpuTier: gpu.tier,
                        cpuThreads: threads,
                        memoryGB: memGB,
                        scores: { fps: fpsScore, gpu: gpuScore, cpu: cpuScore, mem: memScore },
                        totalScore: Math.round(totalScore),
                        level: level
                    });
                }
            });
        }, 500);

        return 'medium';
    }

    function cacheResult(level) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                level: level,
                ts: Date.now()
            }));
        } catch (e) { /* ignore */ }
    }

    /* =============================================
       5. 公开接口
       ============================================= */

    window.QinBlogPerf = {
        detect: detect,
        getLevel: function () {
            return document.documentElement.dataset.perfLevel || 'medium';
        },
        setLevel: function (level) {
            if (level === 'high' || level === 'medium' || level === 'low') {
                applyLevel(level);
                cacheResult(level);
            }
        },
        /** 返回详细硬件信息（调试用） */
        getHardwareInfo: function () {
            var gpu = detectGPU();
            return {
                cpuThreads: getCPUThreads(),
                memoryGB: getDeviceMemoryGB(),
                gpu: gpu,
                dpr: getDPR(),
                isMobile: isMobile()
            };
        }
    };

    detect();
})();
