(function() {
    'use strict';

    class SmoothScroll {
        constructor(options = {}) {
            this.options = {
                smoothness: options.smoothness || 0.08,
                maxVelocity: options.maxVelocity || 50,
                friction: options.friction || 0.95,
                threshold: options.threshold || 0.1,
                ...options
            };

            this.velocity = 0;
            this.targetScroll = 0;
            this.currentScroll = 0;
            this.isScrolling = false;
            this.lastTimestamp = 0;
            this.lastScrollTop = 0;
            this.rafId = null;
            this.touchStartY = 0;
            this.touchLastY = 0;
            this.touchVelocity = 0;
            this.lastTouchTime = 0;

            this.init();
        }

        init() {
            this.bindEvents();
            this.startAnimation();
        }

        bindEvents() {
            const scrollContainer = document.documentElement;

            scrollContainer.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
            scrollContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
            scrollContainer.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
            scrollContainer.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
            scrollContainer.addEventListener('keydown', this.handleKeyDown.bind(this));
        }

        handleWheel(e) {
            e.preventDefault();

            const delta = e.deltaY;
            const normalizedDelta = Math.sign(delta) * Math.min(Math.abs(delta), this.options.maxVelocity);

            this.velocity += normalizedDelta * this.options.smoothness;
            this.velocity = Math.max(-this.options.maxVelocity, Math.min(this.options.maxVelocity, this.velocity));

            this.isScrolling = true;
        }

        handleTouchStart(e) {
            this.touchStartY = e.touches[0].clientY;
            this.touchLastY = e.touches[0].clientY;
            this.touchVelocity = 0;
            this.lastTouchTime = performance.now();
            this.velocity = 0;
        }

        handleTouchMove(e) {
            e.preventDefault();

            const currentY = e.touches[0].clientY;
            const deltaY = this.touchLastY - currentY;
            const currentTime = performance.now();
            const deltaTime = currentTime - this.lastTouchTime;

            this.touchVelocity = deltaY;
            this.velocity += deltaY * this.options.smoothness;
            this.velocity = Math.max(-this.options.maxVelocity, Math.min(this.options.maxVelocity, this.velocity));

            this.touchLastY = currentY;
            this.lastTouchTime = currentTime;
            this.isScrolling = true;
        }

        handleTouchEnd(e) {
            const currentTime = performance.now();
            const deltaTime = currentTime - this.lastTouchTime;

            if (deltaTime < 100) {
                this.velocity = this.touchVelocity * 2;
                this.velocity = Math.max(-this.options.maxVelocity, Math.min(this.options.maxVelocity, this.velocity));
            }
        }

        handleKeyDown(e) {
            const scrollAmount = 100;
            let shouldScroll = false;

            switch(e.key) {
                case 'ArrowDown':
                case 'PageDown':
                    this.velocity += scrollAmount;
                    shouldScroll = true;
                    break;
                case 'ArrowUp':
                case 'PageUp':
                    this.velocity -= scrollAmount;
                    shouldScroll = true;
                    break;
                case 'Home':
                    this.targetScroll = 0;
                    shouldScroll = true;
                    break;
                case 'End':
                    this.targetScroll = document.documentElement.scrollHeight - window.innerHeight;
                    shouldScroll = true;
                    break;
            }

            if (shouldScroll) {
                e.preventDefault();
                this.isScrolling = true;
            }
        }

        startAnimation() {
            const animate = (timestamp) => {
                if (this.lastTimestamp === 0) {
                    this.lastTimestamp = timestamp;
                }

                const deltaTime = timestamp - this.lastTimestamp;
                this.lastTimestamp = timestamp;

                if (Math.abs(this.velocity) > this.options.threshold) {
                    this.currentScroll += this.velocity;
                    this.velocity *= this.options.friction;

                    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
                    this.currentScroll = Math.max(0, Math.min(maxScroll, this.currentScroll));

                    window.scrollTo(0, this.currentScroll);
                } else {
                    this.velocity = 0;
                    this.isScrolling = false;
                }

                this.rafId = requestAnimationFrame(animate);
            };

            this.rafId = requestAnimationFrame(animate);
        }

        destroy() {
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
            }

            const scrollContainer = document.documentElement;
            scrollContainer.removeEventListener('wheel', this.handleWheel);
            scrollContainer.removeEventListener('touchstart', this.handleTouchStart);
            scrollContainer.removeEventListener('touchmove', this.handleTouchMove);
            scrollContainer.removeEventListener('touchend', this.handleTouchEnd);
            scrollContainer.removeEventListener('keydown', this.handleKeyDown);
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SmoothScroll;
    } else {
        window.SmoothScroll = SmoothScroll;
    }

    document.addEventListener('DOMContentLoaded', function() {
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (!isMobile || isTouchDevice) {
            const smoothScroll = new SmoothScroll({
                smoothness: 0.08,
                maxVelocity: isTouchDevice ? 30 : 50,
                friction: 0.95,
                threshold: 0.1
            });
        }
    });
})();
