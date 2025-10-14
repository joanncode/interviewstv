/**
 * Comprehensive Theme System
 * Advanced dark/light theme management with smooth transitions and user preferences
 */
class ThemeSystem {
    constructor(options = {}) {
        this.container = options.container || document.body;
        this.streamingInterface = options.streamingInterface || null;
        this.controlPanels = options.controlPanels || null;
        this.responsiveSystem = options.responsiveSystem || null;
        this.animationSystem = options.animationSystem || null;
        
        // Theme definitions
        this.themes = {
            dark: {
                name: 'Dark Professional',
                type: 'dark',
                colors: {
                    // Primary colors
                    primary: '#FF0000',
                    primaryHover: '#CC0000',
                    primaryActive: '#990000',
                    primaryLight: '#FF3333',
                    primaryDark: '#CC0000',
                    
                    // Background colors
                    background: '#0a0a0a',
                    backgroundSecondary: '#1a1a1a',
                    backgroundTertiary: '#2a2a2a',
                    surface: '#1a1a1a',
                    surfaceElevated: '#2a2a2a',
                    card: '#2a2a2a',
                    cardHover: '#3a3a3a',
                    
                    // Input colors
                    input: '#3a3a3a',
                    inputFocus: '#4a4a4a',
                    inputBorder: '#555555',
                    inputBorderFocus: '#FF0000',
                    
                    // Text colors
                    text: '#ffffff',
                    textSecondary: '#cccccc',
                    textMuted: '#999999',
                    textDisabled: '#666666',
                    textOnPrimary: '#ffffff',
                    
                    // Border colors
                    border: '#444444',
                    borderLight: '#555555',
                    borderDark: '#333333',
                    
                    // Status colors
                    success: '#28a745',
                    successLight: '#34ce57',
                    warning: '#ffc107',
                    warningLight: '#ffcd39',
                    danger: '#dc3545',
                    dangerLight: '#e4606d',
                    info: '#17a2b8',
                    infoLight: '#20c9e0',
                    
                    // Overlay colors
                    overlay: 'rgba(0, 0, 0, 0.8)',
                    overlayLight: 'rgba(0, 0, 0, 0.6)',
                    backdrop: 'rgba(0, 0, 0, 0.9)',
                    
                    // Shadow colors
                    shadow: 'rgba(0, 0, 0, 0.3)',
                    shadowLight: 'rgba(0, 0, 0, 0.2)',
                    shadowDark: 'rgba(0, 0, 0, 0.5)',
                    
                    // Gradient colors
                    gradientStart: '#1a1a1a',
                    gradientEnd: '#0a0a0a',
                    gradientPrimary: 'linear-gradient(135deg, #FF0000, #CC0000)',
                    
                    // Interactive states
                    hover: 'rgba(255, 255, 255, 0.1)',
                    active: 'rgba(255, 255, 255, 0.2)',
                    focus: 'rgba(255, 0, 0, 0.3)',
                    disabled: 'rgba(255, 255, 255, 0.3)'
                },
                properties: {
                    borderRadius: '8px',
                    borderRadiusLarge: '12px',
                    borderRadiusSmall: '4px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                    boxShadowLarge: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    backdropFilter: 'blur(10px)',
                    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                }
            },
            light: {
                name: 'Light Professional',
                type: 'light',
                colors: {
                    // Primary colors
                    primary: '#FF0000',
                    primaryHover: '#E60000',
                    primaryActive: '#CC0000',
                    primaryLight: '#FF3333',
                    primaryDark: '#B30000',
                    
                    // Background colors
                    background: '#ffffff',
                    backgroundSecondary: '#f8f9fa',
                    backgroundTertiary: '#e9ecef',
                    surface: '#ffffff',
                    surfaceElevated: '#f8f9fa',
                    card: '#ffffff',
                    cardHover: '#f8f9fa',
                    
                    // Input colors
                    input: '#ffffff',
                    inputFocus: '#ffffff',
                    inputBorder: '#dee2e6',
                    inputBorderFocus: '#FF0000',
                    
                    // Text colors
                    text: '#212529',
                    textSecondary: '#6c757d',
                    textMuted: '#adb5bd',
                    textDisabled: '#ced4da',
                    textOnPrimary: '#ffffff',
                    
                    // Border colors
                    border: '#dee2e6',
                    borderLight: '#e9ecef',
                    borderDark: '#ced4da',
                    
                    // Status colors
                    success: '#28a745',
                    successLight: '#34ce57',
                    warning: '#ffc107',
                    warningLight: '#ffcd39',
                    danger: '#dc3545',
                    dangerLight: '#e4606d',
                    info: '#17a2b8',
                    infoLight: '#20c9e0',
                    
                    // Overlay colors
                    overlay: 'rgba(255, 255, 255, 0.9)',
                    overlayLight: 'rgba(255, 255, 255, 0.7)',
                    backdrop: 'rgba(255, 255, 255, 0.95)',
                    
                    // Shadow colors
                    shadow: 'rgba(0, 0, 0, 0.1)',
                    shadowLight: 'rgba(0, 0, 0, 0.05)',
                    shadowDark: 'rgba(0, 0, 0, 0.15)',
                    
                    // Gradient colors
                    gradientStart: '#ffffff',
                    gradientEnd: '#f8f9fa',
                    gradientPrimary: 'linear-gradient(135deg, #FF0000, #E60000)',
                    
                    // Interactive states
                    hover: 'rgba(0, 0, 0, 0.05)',
                    active: 'rgba(0, 0, 0, 0.1)',
                    focus: 'rgba(255, 0, 0, 0.1)',
                    disabled: 'rgba(0, 0, 0, 0.3)'
                },
                properties: {
                    borderRadius: '8px',
                    borderRadiusLarge: '12px',
                    borderRadiusSmall: '4px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                    boxShadowLarge: '0 8px 32px rgba(0, 0, 0, 0.15)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    backdropFilter: 'blur(10px)',
                    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                }
            },
            auto: {
                name: 'Auto (System)',
                type: 'auto',
                // Auto theme will use system preference
            }
        };
        
        // Current theme state
        this.currentTheme = 'dark';
        this.systemPreference = 'dark';
        this.userPreference = null;
        this.isTransitioning = false;
        
        // Theme settings
        this.settings = {
            enableTransitions: true,
            transitionDuration: 300,
            respectSystemPreference: true,
            persistUserPreference: true,
            enableAutoSwitch: false,
            autoSwitchTimes: {
                light: '06:00',
                dark: '18:00'
            },
            enableReducedMotion: false,
            enableHighContrast: false,
            customThemes: {},
            ...options.settings
        };
        
        // Event listeners
        this.mediaQuery = null;
        this.autoSwitchTimer = null;
        
        this.init();
    }
    
    /**
     * Initialize theme system
     */
    init() {
        this.detectSystemPreference();
        this.loadUserPreference();
        this.setupEventListeners();
        this.setupAutoSwitch();
        this.applyTheme(this.determineActiveTheme());
        this.injectThemeCSS();
    }
    
    /**
     * Detect system color scheme preference
     */
    detectSystemPreference() {
        if (window.matchMedia) {
            this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            this.systemPreference = this.mediaQuery.matches ? 'dark' : 'light';
        }
    }
    
    /**
     * Load user preference from localStorage
     */
    loadUserPreference() {
        if (this.settings.persistUserPreference) {
            const saved = localStorage.getItem('themePreference');
            if (saved) {
                try {
                    const preference = JSON.parse(saved);
                    this.userPreference = preference.theme;
                    this.currentTheme = preference.theme;
                } catch (e) {
                    console.warn('Failed to load theme preference:', e);
                }
            }
        }
    }
    
    /**
     * Save user preference to localStorage
     */
    saveUserPreference() {
        if (this.settings.persistUserPreference) {
            const preference = {
                theme: this.userPreference,
                timestamp: Date.now()
            };
            localStorage.setItem('themePreference', JSON.stringify(preference));
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for system preference changes
        if (this.mediaQuery) {
            this.mediaQuery.addEventListener('change', (e) => {
                this.systemPreference = e.matches ? 'dark' : 'light';
                if (this.currentTheme === 'auto' || (!this.userPreference && this.settings.respectSystemPreference)) {
                    this.applyTheme(this.determineActiveTheme());
                }
            });
        }
        
        // Listen for reduced motion preference changes
        const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        reducedMotionQuery.addEventListener('change', (e) => {
            this.settings.enableReducedMotion = e.matches;
            this.updateTransitionSettings();
        });
        
        // Listen for high contrast preference changes
        const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
        highContrastQuery.addEventListener('change', (e) => {
            this.settings.enableHighContrast = e.matches;
            this.applyAccessibilityEnhancements();
        });
        
        // Listen for focus-visible support
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });
        
        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });
    }
    
    /**
     * Setup automatic theme switching based on time
     */
    setupAutoSwitch() {
        if (this.settings.enableAutoSwitch) {
            const checkTime = () => {
                const now = new Date();
                const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                
                const lightTime = this.settings.autoSwitchTimes.light;
                const darkTime = this.settings.autoSwitchTimes.dark;
                
                let targetTheme = 'dark';
                if (currentTime >= lightTime && currentTime < darkTime) {
                    targetTheme = 'light';
                }
                
                if (this.currentTheme !== targetTheme && !this.userPreference) {
                    this.setTheme(targetTheme);
                }
            };
            
            // Check immediately and then every minute
            checkTime();
            this.autoSwitchTimer = setInterval(checkTime, 60000);
        }
    }
    
    /**
     * Determine which theme should be active
     */
    determineActiveTheme() {
        if (this.userPreference && this.userPreference !== 'auto') {
            return this.userPreference;
        }
        
        if (this.currentTheme === 'auto' || this.settings.respectSystemPreference) {
            return this.systemPreference;
        }
        
        return this.currentTheme;
    }
    
    /**
     * Set theme
     */
    setTheme(themeName, options = {}) {
        if (!this.themes[themeName] && themeName !== 'auto') {
            console.warn(`Theme "${themeName}" not found`);
            return;
        }
        
        const previousTheme = this.currentTheme;
        this.currentTheme = themeName;
        
        if (!options.skipUserPreference) {
            this.userPreference = themeName;
            this.saveUserPreference();
        }
        
        const activeTheme = this.determineActiveTheme();
        this.applyTheme(activeTheme, { previousTheme, ...options });
        
        // Notify components
        this.notifyThemeChange(activeTheme, previousTheme);
    }
    
    /**
     * Apply theme to the interface
     */
    applyTheme(themeName, options = {}) {
        if (this.isTransitioning && !options.force) {
            return;
        }
        
        const theme = this.themes[themeName];
        if (!theme) {
            console.warn(`Theme "${themeName}" not found`);
            return;
        }
        
        this.isTransitioning = true;
        
        // Apply theme with transition
        if (this.settings.enableTransitions && !this.settings.enableReducedMotion) {
            this.applyThemeWithTransition(theme, options);
        } else {
            this.applyThemeImmediate(theme, options);
        }
        
        // Update theme classes
        this.updateThemeClasses(themeName);
        
        // Apply accessibility enhancements
        this.applyAccessibilityEnhancements();
        
        // Update component themes
        this.updateComponentThemes(themeName);
        
        setTimeout(() => {
            this.isTransitioning = false;
        }, this.settings.transitionDuration);
    }

    /**
     * Apply theme with smooth transition
     */
    applyThemeWithTransition(theme, options = {}) {
        const root = document.documentElement;

        // Create transition overlay for smooth color transitions
        const overlay = document.createElement('div');
        overlay.className = 'theme-transition-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: ${theme.colors.background};
            opacity: 0;
            z-index: 9999;
            pointer-events: none;
            transition: opacity ${this.settings.transitionDuration}ms ease;
        `;

        document.body.appendChild(overlay);

        // Trigger transition
        requestAnimationFrame(() => {
            overlay.style.opacity = '0.8';

            setTimeout(() => {
                this.applyThemeImmediate(theme, options);

                setTimeout(() => {
                    overlay.style.opacity = '0';
                    setTimeout(() => {
                        if (overlay.parentNode) {
                            overlay.parentNode.removeChild(overlay);
                        }
                    }, this.settings.transitionDuration);
                }, 50);
            }, this.settings.transitionDuration / 2);
        });
    }

    /**
     * Apply theme immediately without transition
     */
    applyThemeImmediate(theme, options = {}) {
        const root = document.documentElement;

        // Apply color variables
        Object.entries(theme.colors).forEach(([key, value]) => {
            root.style.setProperty(`--theme-${key}`, value);
        });

        // Apply property variables
        Object.entries(theme.properties).forEach(([key, value]) => {
            root.style.setProperty(`--theme-${key}`, value);
        });

        // Apply legacy variables for backward compatibility
        this.applyLegacyVariables(theme);
    }

    /**
     * Apply legacy CSS variables for backward compatibility
     */
    applyLegacyVariables(theme) {
        const root = document.documentElement;

        // Streaming interface variables
        root.style.setProperty('--streaming-primary', theme.colors.primary);
        root.style.setProperty('--streaming-background', theme.colors.background);
        root.style.setProperty('--streaming-surface', theme.colors.surface);
        root.style.setProperty('--streaming-card', theme.colors.card);
        root.style.setProperty('--streaming-input', theme.colors.input);
        root.style.setProperty('--streaming-text', theme.colors.text);
        root.style.setProperty('--streaming-textMuted', theme.colors.textSecondary);
        root.style.setProperty('--streaming-border', theme.colors.border);
        root.style.setProperty('--streaming-success', theme.colors.success);
        root.style.setProperty('--streaming-warning', theme.colors.warning);
        root.style.setProperty('--streaming-danger', theme.colors.danger);
        root.style.setProperty('--streaming-info', theme.colors.info);

        // Control panels variables
        root.style.setProperty('--panel-primary', theme.colors.primary);
        root.style.setProperty('--panel-background', theme.colors.background);
        root.style.setProperty('--panel-surface', theme.colors.surface);
        root.style.setProperty('--panel-card', theme.colors.card);
        root.style.setProperty('--panel-input', theme.colors.input);
        root.style.setProperty('--panel-text', theme.colors.text);
        root.style.setProperty('--panel-text-muted', theme.colors.textSecondary);
        root.style.setProperty('--panel-border', theme.colors.border);
        root.style.setProperty('--panel-success', theme.colors.success);
        root.style.setProperty('--panel-warning', theme.colors.warning);
        root.style.setProperty('--panel-danger', theme.colors.danger);
        root.style.setProperty('--panel-info', theme.colors.info);

        // Chat interface variables
        root.style.setProperty('--chat-bg', theme.colors.background);
        root.style.setProperty('--chat-card', theme.colors.card);
        root.style.setProperty('--chat-input', theme.colors.input);
        root.style.setProperty('--chat-border', theme.colors.border);
        root.style.setProperty('--chat-text', theme.colors.text);
        root.style.setProperty('--chat-text-muted', theme.colors.textSecondary);
        root.style.setProperty('--chat-primary', theme.colors.primary);
        root.style.setProperty('--chat-success', theme.colors.success);
        root.style.setProperty('--chat-warning', theme.colors.warning);
        root.style.setProperty('--chat-danger', theme.colors.danger);
        root.style.setProperty('--chat-info', theme.colors.info);

        // Global variables
        root.style.setProperty('--bg-primary', theme.colors.background);
        root.style.setProperty('--bg-secondary', theme.colors.backgroundSecondary);
        root.style.setProperty('--bg-tertiary', theme.colors.backgroundTertiary);
        root.style.setProperty('--bg-card', theme.colors.card);
        root.style.setProperty('--bg-input', theme.colors.input);
        root.style.setProperty('--text-primary', theme.colors.text);
        root.style.setProperty('--text-secondary', theme.colors.textSecondary);
        root.style.setProperty('--text-muted', theme.colors.textMuted);
        root.style.setProperty('--border-primary', theme.colors.border);
        root.style.setProperty('--accent-red', theme.colors.primary);
    }

    /**
     * Update theme classes on container
     */
    updateThemeClasses(themeName) {
        // Remove existing theme classes
        this.container.classList.remove('theme-dark', 'theme-light', 'theme-auto');

        // Add new theme class
        this.container.classList.add(`theme-${themeName}`);

        // Add theme type class
        const theme = this.themes[themeName];
        if (theme && theme.type) {
            this.container.classList.remove('dark-theme', 'light-theme');
            this.container.classList.add(`${theme.type}-theme`);
        }
    }

    /**
     * Apply accessibility enhancements
     */
    applyAccessibilityEnhancements() {
        const root = document.documentElement;

        if (this.settings.enableHighContrast) {
            this.container.classList.add('high-contrast');
            root.style.setProperty('--theme-border', '#000000');
            root.style.setProperty('--theme-text', this.currentTheme === 'dark' ? '#ffffff' : '#000000');
        } else {
            this.container.classList.remove('high-contrast');
        }

        if (this.settings.enableReducedMotion) {
            this.container.classList.add('reduced-motion');
        } else {
            this.container.classList.remove('reduced-motion');
        }
    }

    /**
     * Update transition settings
     */
    updateTransitionSettings() {
        const root = document.documentElement;

        if (this.settings.enableReducedMotion) {
            root.style.setProperty('--theme-transition', 'none');
        } else {
            root.style.setProperty('--theme-transition', this.themes[this.currentTheme]?.properties?.transition || 'all 0.3s ease');
        }
    }

    /**
     * Update component themes
     */
    updateComponentThemes(themeName) {
        // Update streaming interface theme
        if (this.streamingInterface && this.streamingInterface.updateSettings) {
            this.streamingInterface.updateSettings({ theme: themeName });
        }

        // Update control panels theme
        if (this.controlPanels && this.controlPanels.updateTheme) {
            this.controlPanels.updateTheme(themeName);
        }

        // Update responsive system theme
        if (this.responsiveSystem && this.responsiveSystem.updateSettings) {
            this.responsiveSystem.updateSettings({ currentTheme: themeName });
        }
    }

    /**
     * Notify components of theme change
     */
    notifyThemeChange(newTheme, previousTheme) {
        const event = new CustomEvent('theme-change', {
            detail: {
                newTheme,
                previousTheme,
                themeData: this.themes[newTheme],
                isSystemPreference: newTheme === this.systemPreference,
                timestamp: Date.now()
            }
        });

        this.container.dispatchEvent(event);
        document.dispatchEvent(event);
    }

    /**
     * Toggle between dark and light themes
     */
    toggleTheme() {
        const currentActive = this.determineActiveTheme();
        const newTheme = currentActive === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
        return newTheme;
    }

    /**
     * Get current theme information
     */
    getCurrentTheme() {
        const activeTheme = this.determineActiveTheme();
        return {
            name: activeTheme,
            data: this.themes[activeTheme],
            isSystemPreference: activeTheme === this.systemPreference,
            userPreference: this.userPreference,
            systemPreference: this.systemPreference
        };
    }

    /**
     * Get available themes
     */
    getAvailableThemes() {
        return Object.keys(this.themes).map(key => ({
            key,
            name: this.themes[key].name,
            type: this.themes[key].type
        }));
    }

    /**
     * Add custom theme
     */
    addCustomTheme(key, themeData) {
        this.themes[key] = {
            name: themeData.name || key,
            type: themeData.type || 'custom',
            colors: { ...this.themes.dark.colors, ...themeData.colors },
            properties: { ...this.themes.dark.properties, ...themeData.properties }
        };

        if (this.settings.persistUserPreference) {
            this.settings.customThemes[key] = themeData;
            localStorage.setItem('customThemes', JSON.stringify(this.settings.customThemes));
        }
    }

    /**
     * Remove custom theme
     */
    removeCustomTheme(key) {
        if (this.themes[key] && this.themes[key].type === 'custom') {
            delete this.themes[key];
            delete this.settings.customThemes[key];

            if (this.settings.persistUserPreference) {
                localStorage.setItem('customThemes', JSON.stringify(this.settings.customThemes));
            }

            // Switch to default theme if current theme was removed
            if (this.currentTheme === key) {
                this.setTheme('dark');
            }
        }
    }

    /**
     * Update theme settings
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };

        if (newSettings.enableTransitions !== undefined) {
            this.updateTransitionSettings();
        }

        if (newSettings.enableAutoSwitch !== undefined) {
            if (newSettings.enableAutoSwitch) {
                this.setupAutoSwitch();
            } else if (this.autoSwitchTimer) {
                clearInterval(this.autoSwitchTimer);
                this.autoSwitchTimer = null;
            }
        }

        if (newSettings.respectSystemPreference !== undefined && newSettings.respectSystemPreference) {
            this.applyTheme(this.determineActiveTheme());
        }
    }

    /**
     * Export theme configuration
     */
    exportTheme(themeName) {
        const theme = this.themes[themeName];
        if (!theme) {
            throw new Error(`Theme "${themeName}" not found`);
        }

        return {
            name: theme.name,
            type: theme.type,
            colors: { ...theme.colors },
            properties: { ...theme.properties },
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Import theme configuration
     */
    importTheme(themeData, key) {
        if (!key) {
            key = themeData.name.toLowerCase().replace(/\s+/g, '-');
        }

        this.addCustomTheme(key, themeData);
        return key;
    }

    /**
     * Inject theme CSS
     */
    injectThemeCSS() {
        const css = `
            /* Theme System Base Styles */
            .theme-transition-overlay {
                transition: opacity var(--theme-transition, 0.3s ease);
            }

            /* Theme-aware components */
            * {
                transition: var(--theme-transition, all 0.3s ease);
            }

            /* Reduced motion support */
            .reduced-motion * {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }

            /* High contrast support */
            .high-contrast {
                filter: contrast(1.5);
            }

            .high-contrast * {
                border-color: var(--theme-text) !important;
            }

            /* Keyboard navigation */
            .keyboard-navigation *:focus {
                outline: 2px solid var(--theme-primary);
                outline-offset: 2px;
            }

            /* Theme-specific adjustments */
            .dark-theme {
                color-scheme: dark;
            }

            .light-theme {
                color-scheme: light;
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = css;
        document.head.appendChild(styleSheet);
    }

    /**
     * Destroy theme system
     */
    destroy() {
        // Remove event listeners
        if (this.mediaQuery) {
            this.mediaQuery.removeEventListener('change', this.handleSystemPreferenceChange);
        }

        // Clear timers
        if (this.autoSwitchTimer) {
            clearInterval(this.autoSwitchTimer);
        }

        // Remove theme classes
        this.container.classList.remove('theme-dark', 'theme-light', 'theme-auto', 'dark-theme', 'light-theme');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeSystem;
} else if (typeof window !== 'undefined') {
    window.ThemeSystem = ThemeSystem;
}
