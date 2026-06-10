(function () {
    'use strict';

    var registry = {};
    var _glowRaf = null;
    var _glowCards = [];
    var _glowDefaultRadius = 60;
    var _glowAngleOffset = (function () {
        var peak = 55;
        try {
            var val = document.documentElement ?
                getComputedStyle(document.documentElement).getPropertyValue('--glow-peak').trim() : '';
            if (val) peak = parseFloat(val) || 55;
        } catch (e) {}
        return 90 - peak;
    })();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            initCustomSelects();
            initGlowBorder();
        });
    } else {
        initCustomSelects();
        initGlowBorder();
    }

    function CustomSelect(el) {
        this.el = el;
        this.trigger = el.querySelector('.cs-trigger');
        this.label = el.querySelector('.cs-label');
        this.dropdown = el.querySelector('.cs-dropdown');
        this.inner = el.querySelector('.cs-dropdown-inner');
        this.options = el.querySelectorAll('.cs-option');
        this.hiddenSelect = el.querySelector('select');
        this._open = false;
        this._currentIndex = 0;

        var targetId = el.getAttribute('data-target');
        if (targetId) {
            registry[targetId] = this;
        }

        this._init();
    }

    CustomSelect.prototype._init = function () {
        var self = this;

        this.dropdown.setAttribute('aria-hidden', 'true');

        var initialValue = this.hiddenSelect.value;
        Array.prototype.forEach.call(this.options, function (opt, i) {
            if (opt.getAttribute('data-value') === initialValue) {
                self._currentIndex = i;
                self._setSelected(opt);
            }
        });

        this.trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            self.toggle();
        });

        this.trigger.addEventListener('touchstart', function (e) {
            self.toggle();
            e.preventDefault();
        }, { passive: false });

        Array.prototype.forEach.call(this.options, function (opt) {
            if (!opt.hasAttribute('tabindex')) {
                opt.setAttribute('tabindex', '-1');
            }
            opt.addEventListener('click', function (e) {
                e.stopPropagation();
                self._select(opt);
                self.close();
            });
            opt.addEventListener('touchstart', function (e) {
                e.preventDefault();
                self._select(opt);
                self.close();
            }, { passive: false });
        });

        this.trigger.addEventListener('keydown', function (e) {
            self._handleTriggerKeydown(e);
        });

        this.dropdown.addEventListener('keydown', function (e) {
            self._handleDropdownKeydown(e);
        });

        document.addEventListener('click', function (e) {
            if (!self.el.contains(e.target) && self._open) {
                self.close();
            }
        });

        this.dropdown.addEventListener('transitionend', function (e) {
            if (e.propertyName === 'max-height') {
                self.dropdown.style.overflow = self._open ? 'auto' : 'hidden';
            }
        });
    };

    CustomSelect.prototype.toggle = function () {
        this._open ? this.close() : this.open();
    };

    CustomSelect.prototype.open = function () {
        if (this._open) return;
        this._open = true;
        this.trigger.setAttribute('aria-expanded', 'true');
        this.dropdown.setAttribute('aria-hidden', 'false');
        this.dropdown.style.overflow = 'hidden';
        var h = this.inner.scrollHeight;
        this.dropdown.style.maxHeight = h + 'px';
        this.dropdown.style.opacity = '1';
        this.el.classList.add('cs-open');
    };

    CustomSelect.prototype.close = function () {
        if (!this._open) return;
        this._open = false;
        this.trigger.setAttribute('aria-expanded', 'false');
        this.dropdown.setAttribute('aria-hidden', 'true');
        this.dropdown.style.maxHeight = '0';
        this.dropdown.style.opacity = '0';
        this.el.classList.remove('cs-open');
    };

    CustomSelect.prototype.setValue = function (val, sync) {
        var self = this;
        Array.prototype.forEach.call(this.options, function (opt) {
            if (opt.getAttribute('data-value') === val) {
                self._setSelected(opt);
                self.hiddenSelect.value = val;
                if (sync !== false) {
                    self.hiddenSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        });
    };

    CustomSelect.prototype._select = function (opt) {
        this._setSelected(opt);
        this.hiddenSelect.value = opt.getAttribute('data-value');
        this.hiddenSelect.dispatchEvent(new Event('change', { bubbles: true }));
    };

    CustomSelect.prototype._setSelected = function (opt) {
        Array.prototype.forEach.call(this.options, function (o) {
            o.classList.remove('cs-selected');
            o.removeAttribute('aria-selected');
        });
        opt.classList.add('cs-selected');
        opt.setAttribute('aria-selected', 'true');
        this.label.textContent = opt.textContent;
    };

    CustomSelect.prototype._navigate = function (dir) {
        this._currentIndex = (this._currentIndex + dir + this.options.length) % this.options.length;
        this.options[this._currentIndex].focus();
        this.options[this._currentIndex].scrollIntoView({ block: 'nearest' });
    };

    CustomSelect.prototype._handleTriggerKeydown = function (e) {
        switch (e.key) {
            case 'Enter':
            case ' ':
                e.preventDefault();
                this.toggle();
                if (this._open) {
                    this.options[this._currentIndex].focus();
                }
                break;
            case 'Escape':
                this.close();
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (this._open) {
                    this._navigate(1);
                } else {
                    this.open();
                    this.options[0].focus();
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (this._open) {
                    this._navigate(-1);
                } else {
                    this.open();
                    this.options[this.options.length - 1].focus();
                }
                break;
            case 'Home':
                e.preventDefault();
                if (this._open) {
                    this._currentIndex = 0;
                    this.options[0].focus();
                    this.options[0].scrollIntoView({ block: 'nearest' });
                }
                break;
            case 'End':
                e.preventDefault();
                if (this._open) {
                    this._currentIndex = this.options.length - 1;
                    this.options[this.options.length - 1].focus();
                    this.options[this.options.length - 1].scrollIntoView({ block: 'nearest' });
                }
                break;
        }
    };

    CustomSelect.prototype._handleDropdownKeydown = function (e) {
        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                this.close();
                this.trigger.focus();
                break;
            case 'ArrowDown':
                e.preventDefault();
                this._navigate(1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this._navigate(-1);
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                var focused = this.dropdown.querySelector('.cs-option:focus');
                if (focused) {
                    this._select(focused);
                    this.close();
                    this.trigger.focus();
                }
                break;
            case 'Home':
                e.preventDefault();
                this._currentIndex = 0;
                this.options[0].focus();
                this.options[0].scrollIntoView({ block: 'nearest' });
                break;
            case 'End':
                e.preventDefault();
                this._currentIndex = this.options.length - 1;
                this.options[this.options.length - 1].focus();
                this.options[this.options.length - 1].scrollIntoView({ block: 'nearest' });
                break;
        }
    };

    function initCustomSelects() {
        var els = document.querySelectorAll('.cs-select');
        Array.prototype.forEach.call(els, function (el) {
            new CustomSelect(el);
        });
    }

    function initGlowBorder() {
        var cards = document.querySelectorAll('.glow-border');
        Array.prototype.forEach.call(cards, function (card) {
            if (card._glowInitialized) return;
            card._glowInitialized = true;

            var cs = window.getComputedStyle(card);
            var r = parseFloat(cs.getPropertyValue('--glow-radius').trim());
            card.dataset.glowRadius = isFinite(r) ? r : _glowDefaultRadius;

            _glowCards.push(card);
        });

        if (!_glowRaf) {
            function onPointer(mx, my) {
                if (_glowRaf) return;
                _glowRaf = requestAnimationFrame(function () {
                    _glowRaf = null;
                    Array.prototype.forEach.call(_glowCards, function (card) {
                        var rect = card.getBoundingClientRect();
                        var dx = Math.max(rect.left - mx, mx - rect.right, 0);
                        var dy = Math.max(rect.top - my, my - rect.bottom, 0);
                        var dist = Math.sqrt(dx * dx + dy * dy);

                        var cx = rect.left + rect.width / 2;
                        var cy = rect.top + rect.height / 2;
                        var angle = Math.atan2(my - cy, mx - cx) * (180 / Math.PI) + _glowAngleOffset;
                        card.style.setProperty('--mouse-angle', angle);

                        var radius = parseFloat(card.dataset.glowRadius) || _glowDefaultRadius;
                        var intensity = Math.max(0, 1 - dist / radius);
                        card.style.setProperty('--glow-intensity', intensity);
                    });
                });
            }

            document.addEventListener('mousemove', function (e) {
                onPointer(e.clientX, e.clientY);
            });

            document.addEventListener('touchmove', function (e) {
                var touch = e.touches[0];
                if (touch) onPointer(touch.clientX, touch.clientY);
            }, { passive: true });
        }
    }

    window.__csGet = function (id) {
        return registry[id] || null;
    };

    window.__initGlowBorder = initGlowBorder;
})();
