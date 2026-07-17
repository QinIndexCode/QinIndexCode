/**
 * Theme Tokens — synchronous theme application
 *
 * Loaded in <head> (no defer) on every page so the full theme variable
 * set is applied to :root BEFORE the first paint, eliminating FOUC
 * (flash of unstyled / wrong-themed content) when a user has chosen
 * the light theme.
 *
 * The script:
 *   1. Reads the stored theme from localStorage
 *   2. Falls back to prefers-color-scheme if nothing is stored
 *   3. Falls back to the dark theme (the :root default) otherwise
 *   4. Writes every theme variable to document.documentElement.style
 *      synchronously, so the browser paints with the correct colors
 *
 * app.js reads window.QINBLOG_THEMES for the toggle button.
 */
(function () {
    'use strict';

    var themes = {
        light: {
            '--bg-primary': '#F8F7F4',
            '--bg-secondary': '#FFFFFF',
            '--bg-tertiary': '#F0EFEC',
            '--bg-elevated': '#FFFFFF',
            '--text-primary': '#1C1917',
            '--text-secondary': '#57534E',
            '--text-muted': '#A8A29E',
            '--text-inverse': '#FAFAF9',
            '--accent': '#78716C',
            '--accent-hover': '#57534E',
            '--accent-soft': 'rgba(120, 113, 108, 0.10)',
            '--accent-soft-hover': 'rgba(120, 113, 108, 0.18)',
            '--accent-contrast': '#FFFFFF',
            '--status-success': '#16A34A',
            '--status-error': '#DC2626',
            '--border': '#E7E5E4',
            '--border-strong': '#D6D3D1',
            '--border-soft': 'rgba(28, 25, 23, 0.06)',
            '--border-accent': 'rgba(120, 113, 108, 0.30)',
            '--surface': '#FFFFFF',
            '--surface-hover': '#FAFAF7',
            '--surface-active': '#F0EFEC',
            '--glass-bg': 'rgba(255, 255, 255, 0.75)',
            '--glass-bg-hover': 'rgba(255, 255, 255, 0.92)',
            '--glass-border': 'rgba(28, 25, 23, 0.08)',
            '--glass-border-active': 'rgba(120, 113, 108, 0.30)',
            '--shadow-xs': '0 1px 1px rgba(28, 25, 23, 0.04), 0 0 0 1px rgba(28, 25, 23, 0.02)',
            '--shadow-sm': '0 1px 2px rgba(28, 25, 23, 0.05), 0 0 0 1px rgba(28, 25, 23, 0.02)',
            '--shadow-md': '0 2px 4px rgba(28, 25, 23, 0.06), 0 8px 24px -8px rgba(28, 25, 23, 0.10), 0 0 0 1px rgba(120, 113, 108, 0.06)',
            '--shadow-lg': '0 4px 8px rgba(28, 25, 23, 0.08), 0 24px 48px -16px rgba(28, 25, 23, 0.12), 0 0 0 1px rgba(120, 113, 108, 0.08)',
            '--shadow-xl': '0 8px 16px rgba(28, 25, 23, 0.10), 0 32px 64px -24px rgba(28, 25, 23, 0.18), 0 0 0 1px rgba(120, 113, 108, 0.10)',
            '--shadow-glow': '0 0 0 1px rgba(120, 113, 108, 0.18), 0 8px 32px -8px rgba(120, 113, 108, 0.28)',
            '--shadow-ring-focus': '0 0 0 3px rgba(120, 113, 108, 0.25)',
            '--halo-accent-sm': '0 0 0 1px rgba(120, 113, 108, 0.18), 0 6px 18px -8px rgba(120, 113, 108, 0.30)',
            '--halo-accent-md': '0 0 0 1px rgba(120, 113, 108, 0.28), 0 12px 32px -10px rgba(120, 113, 108, 0.40)',
            '--accent-blue': '#78716C',
            '--accent-blue-glow': 'rgba(120, 113, 108, 0.20)',
            '--accent-purple': '#57534E',
            '--accent-cyan': '#78716C',
            '--accent-pink': '#A8A29E',
            '--accent-green': '#78716C',
            '--accent-orange': '#78716C',
            '--accent-red': '#B91C1C',
            '--gradient-primary': 'linear-gradient(135deg, #78716C 0%, #57534E 100%)',
            '--gradient-secondary': 'linear-gradient(135deg, #57534E 0%, #44403C 100%)',
            '--gradient-mesh': 'radial-gradient(at 0% 0%, rgba(120, 113, 108, 0.08) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(87, 83, 78, 0.06) 0px, transparent 50%), radial-gradient(at 50% 100%, rgba(120, 113, 108, 0.04) 0px, transparent 50%)',
            '--gradient-text': 'linear-gradient(135deg, #1C1917 0%, #57534E 60%, #78716C 100%)',
            '--hero-text-gradient': 'linear-gradient(to right, #1C1917 0%, #57534E 100%)',
            '--stat-color': '#1C1917',
            '--input-bg': 'rgba(255, 255, 255, 0.85)',
            '--tool-title-gradient': 'linear-gradient(to right, #1C1917 0%, #57534E 100%)',
            '--tool-card-icon-filter': 'drop-shadow(0 1px 3px rgba(120, 113, 108, 0.18))',
            '--tool-nav-icon-filter': 'drop-shadow(0 1px 2px rgba(28, 25, 23, 0.06))',
            '--hairline': 'rgba(28, 25, 23, 0.08)',
            '--hairline-strong': 'rgba(28, 25, 23, 0.14)'
        },
        dark: {
            '--bg-primary': '#0C0A09',
            '--bg-secondary': '#161413',
            '--bg-tertiary': '#221F1D',
            '--bg-elevated': '#1C1917',
            '--text-primary': '#FAFAF9',
            '--text-secondary': '#D6D3D1',
            '--text-muted': '#78716C',
            '--text-inverse': '#0C0A09',
            '--accent': '#D6D3D1',
            '--accent-hover': '#A8A29E',
            '--accent-soft': 'rgba(214, 211, 209, 0.12)',
            '--accent-soft-hover': 'rgba(214, 211, 209, 0.20)',
            '--accent-contrast': '#0C0A09',
            '--status-success': '#4ADE80',
            '--status-error': '#F87171',
            '--border': '#262220',
            '--border-strong': '#3A3633',
            '--border-soft': 'rgba(250, 250, 249, 0.06)',
            '--border-accent': 'rgba(214, 211, 209, 0.25)',
            '--surface': '#1A1715',
            '--surface-hover': '#221F1D',
            '--surface-active': '#2A2724',
            '--glass-bg': 'rgba(28, 25, 23, 0.55)',
            '--glass-bg-hover': 'rgba(41, 37, 36, 0.75)',
            '--glass-border': 'rgba(250, 250, 249, 0.08)',
            '--glass-border-active': 'rgba(214, 211, 209, 0.25)',
            '--shadow-xs': '0 1px 1px rgba(0, 0, 0, 0.30), 0 0 0 1px rgba(0, 0, 0, 0.20)',
            '--shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.30), 0 0 0 1px rgba(0, 0, 0, 0.20)',
            '--shadow-md': '0 2px 4px rgba(0, 0, 0, 0.30), 0 8px 24px -8px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(214, 211, 209, 0.04)',
            '--shadow-lg': '0 4px 8px rgba(0, 0, 0, 0.40), 0 24px 48px -16px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(214, 211, 209, 0.05)',
            '--shadow-xl': '0 8px 16px rgba(0, 0, 0, 0.45), 0 32px 64px -24px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(214, 211, 209, 0.06)',
            '--shadow-glow': '0 0 0 1px rgba(214, 211, 209, 0.15), 0 8px 32px -8px rgba(214, 211, 209, 0.25)',
            '--shadow-ring-focus': '0 0 0 3px rgba(214, 211, 209, 0.25)',
            '--halo-accent-sm': '0 0 0 1px rgba(214, 211, 209, 0.18), 0 6px 18px -8px rgba(214, 211, 209, 0.30)',
            '--halo-accent-md': '0 0 0 1px rgba(214, 211, 209, 0.28), 0 12px 32px -10px rgba(214, 211, 209, 0.40)',
            '--accent-blue': '#D6D3D1',
            '--accent-blue-glow': 'rgba(214, 211, 209, 0.25)',
            '--accent-purple': '#A8A29E',
            '--accent-cyan': '#D6D3D1',
            '--accent-pink': '#D6D3D1',
            '--accent-green': '#D6D3D1',
            '--accent-orange': '#D6D3D1',
            '--accent-red': '#F87171',
            '--gradient-primary': 'linear-gradient(135deg, #D6D3D1 0%, #A8A29E 100%)',
            '--gradient-secondary': 'linear-gradient(135deg, #A8A29E 0%, #78716C 100%)',
            '--gradient-mesh': 'radial-gradient(at 0% 0%, rgba(214, 211, 209, 0.08) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(168, 162, 158, 0.06) 0px, transparent 50%), radial-gradient(at 50% 100%, rgba(214, 211, 209, 0.04) 0px, transparent 50%)',
            '--gradient-text': 'linear-gradient(135deg, #FAFAF9 0%, #D6D3D1 60%, #A8A29E 100%)',
            '--hero-text-gradient': 'linear-gradient(to right, #FAFAF9 0%, #D6D3D1 100%)',
            '--stat-color': '#FAFAF9',
            '--input-bg': 'rgba(12, 10, 9, 0.40)',
            '--tool-title-gradient': 'linear-gradient(to right, #FAFAF9 0%, #D6D3D1 100%)',
            '--tool-card-icon-filter': 'drop-shadow(0 0 5px rgba(214, 211, 209, 0.20))',
            '--tool-nav-icon-filter': 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.30))',
            '--hairline': 'rgba(250, 250, 249, 0.08)',
            '--hairline-strong': 'rgba(250, 250, 249, 0.14)'
        }
    };

    // Expose for app.js toggle
    window.QINBLOG_THEMES = themes;

    function applyTheme(isLight) {
        var root = document.documentElement;
        var vars = isLight ? themes.light : themes.dark;
        for (var key in vars) {
            root.style.setProperty(key, vars[key]);
        }
        root.style.colorScheme = isLight ? 'light' : 'dark';
    }

    function detectInitialTheme() {
        try {
            var stored = localStorage.getItem('qinblog-theme');
            if (stored === 'light' || stored === 'dark') return stored === 'light';
        } catch (e) { /* localStorage may be blocked */ }
        // No explicit choice — respect prefers-color-scheme
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return true;
        }
        return false;
    }

    // Apply synchronously NOW (before first paint)
    applyTheme(detectInitialTheme());
})();
