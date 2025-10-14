/**
 * Comprehensive Accessibility System
 * WCAG 2.1 AA compliant accessibility features for streaming interface
 */
class AccessibilitySystem {
    constructor(options = {}) {
        this.container = options.container || document.body;
        this.streamingInterface = options.streamingInterface || null;
        this.themeSystem = options.themeSystem || null;
        this.responsiveSystem = options.responsiveSystem || null;
        this.animationSystem = options.animationSystem || null;
        
        // Accessibility settings
        this.settings = {
            // WCAG Level
            wcagLevel: 'AA', // 'A', 'AA', 'AAA'
            
            // Visual accessibility
            highContrast: false,
            reducedMotion: false,
            largeText: false,
            fontSize: 'normal', // 'small', 'normal', 'large', 'extra-large'
            colorBlindnessSupport: false,
            
            // Motor accessibility
            stickyKeys: false,
            slowKeys: false,
            bounceKeys: false,
            mouseKeys: false,
            largerClickTargets: false,
            
            // Cognitive accessibility
            simplifiedInterface: false,
            reducedComplexity: false,
            extendedTimeouts: false,
            readingGuide: false,
            
            // Auditory accessibility
            visualIndicators: true,
            captionsEnabled: true,
            audioDescriptions: false,
            signLanguage: false,
            
            // Screen reader
            screenReaderOptimized: true,
            announcements: true,
            verboseDescriptions: false,
            
            // Keyboard navigation
            keyboardNavigation: true,
            skipLinks: true,
            focusIndicators: true,
            tabOrder: true,
            
            // Language and content
            language: 'en',
            readingLevel: 'standard',
            contentWarnings: true,
            
            ...options.settings
        };
        
        // Accessibility state
        this.isKeyboardUser = false;
        this.currentFocusElement = null;
        this.focusHistory = [];
        this.skipLinkTargets = [];
        this.landmarkElements = [];
        this.headingStructure = [];
        
        // Live regions for announcements
        this.liveRegions = {
            polite: null,
            assertive: null,
            status: null
        };
        
        // Accessibility tools
        this.focusManager = null;
        this.keyboardManager = null;
        this.screenReaderManager = null;
        this.contrastChecker = null;
        this.colorBlindnessSimulator = null;
        
        // WCAG compliance tracking
        this.complianceChecks = {
            perceivable: new Map(),
            operable: new Map(),
            understandable: new Map(),
            robust: new Map()
        };
        
        this.init();
    }
    
    /**
     * Initialize accessibility system
     */
    init() {
        this.detectUserPreferences();
        this.createLiveRegions();
        this.setupFocusManager();
        this.setupKeyboardManager();
        this.setupScreenReaderManager();
        this.setupContrastChecker();
        this.setupColorBlindnessSupport();
        this.setupSkipLinks();
        this.setupLandmarks();
        this.setupHeadingStructure();
        this.setupEventListeners();
        this.applyAccessibilityEnhancements();
        this.runInitialComplianceCheck();
        this.injectAccessibilityCSS();
    }
    
    /**
     * Detect user accessibility preferences
     */
    detectUserPreferences() {
        // Detect system preferences
        if (window.matchMedia) {
            // Reduced motion
            const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            this.settings.reducedMotion = reducedMotionQuery.matches;
            
            // High contrast
            const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
            this.settings.highContrast = highContrastQuery.matches;
            
            // Color scheme (for accessibility themes)
            const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            this.settings.prefersDarkMode = darkModeQuery.matches;
            
            // Transparency reduction
            const transparencyQuery = window.matchMedia('(prefers-reduced-transparency: reduce)');
            this.settings.reducedTransparency = transparencyQuery.matches;
        }
        
        // Load saved preferences
        this.loadAccessibilitySettings();
    }
    
    /**
     * Create ARIA live regions for announcements
     */
    createLiveRegions() {
        // Polite live region for non-urgent announcements
        this.liveRegions.polite = document.createElement('div');
        this.liveRegions.polite.setAttribute('aria-live', 'polite');
        this.liveRegions.polite.setAttribute('aria-atomic', 'true');
        this.liveRegions.polite.setAttribute('class', 'sr-only');
        this.liveRegions.polite.setAttribute('id', 'polite-announcements');
        
        // Assertive live region for urgent announcements
        this.liveRegions.assertive = document.createElement('div');
        this.liveRegions.assertive.setAttribute('aria-live', 'assertive');
        this.liveRegions.assertive.setAttribute('aria-atomic', 'true');
        this.liveRegions.assertive.setAttribute('class', 'sr-only');
        this.liveRegions.assertive.setAttribute('id', 'assertive-announcements');
        
        // Status live region for status updates
        this.liveRegions.status = document.createElement('div');
        this.liveRegions.status.setAttribute('role', 'status');
        this.liveRegions.status.setAttribute('aria-live', 'polite');
        this.liveRegions.status.setAttribute('class', 'sr-only');
        this.liveRegions.status.setAttribute('id', 'status-announcements');
        
        // Add to document
        document.body.appendChild(this.liveRegions.polite);
        document.body.appendChild(this.liveRegions.assertive);
        document.body.appendChild(this.liveRegions.status);
    }
    
    /**
     * Setup focus management
     */
    setupFocusManager() {
        this.focusManager = {
            // Focus trap for modals and dialogs
            trapFocus: (container) => {
                const focusableElements = this.getFocusableElements(container);
                if (focusableElements.length === 0) return;
                
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];
                
                container.addEventListener('keydown', (e) => {
                    if (e.key === 'Tab') {
                        if (e.shiftKey) {
                            if (document.activeElement === firstElement) {
                                e.preventDefault();
                                lastElement.focus();
                            }
                        } else {
                            if (document.activeElement === lastElement) {
                                e.preventDefault();
                                firstElement.focus();
                            }
                        }
                    }
                });
                
                // Focus first element
                firstElement.focus();
            },
            
            // Restore focus to previous element
            restoreFocus: () => {
                if (this.focusHistory.length > 0) {
                    const previousElement = this.focusHistory.pop();
                    if (previousElement && document.contains(previousElement)) {
                        previousElement.focus();
                    }
                }
            },
            
            // Save current focus
            saveFocus: () => {
                if (document.activeElement && document.activeElement !== document.body) {
                    this.focusHistory.push(document.activeElement);
                }
            },
            
            // Move focus to element
            moveFocusTo: (element, options = {}) => {
                if (!element) return;
                
                if (options.savePrevious) {
                    this.focusManager.saveFocus();
                }
                
                element.focus();
                
                if (options.scroll !== false) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                
                if (options.announce) {
                    this.announce(options.announce, 'polite');
                }
            }
        };
    }
    
    /**
     * Setup keyboard navigation manager
     */
    setupKeyboardManager() {
        this.keyboardManager = {
            shortcuts: new Map(),
            
            // Register keyboard shortcut
            registerShortcut: (key, callback, description, context = 'global') => {
                if (!this.keyboardManager.shortcuts.has(context)) {
                    this.keyboardManager.shortcuts.set(context, new Map());
                }
                
                this.keyboardManager.shortcuts.get(context).set(key, {
                    callback,
                    description,
                    enabled: true
                });
            },
            
            // Handle keyboard events
            handleKeydown: (e) => {
                // Detect keyboard user
                if (e.key === 'Tab') {
                    this.isKeyboardUser = true;
                    this.container.classList.add('keyboard-user');
                }
                
                // Skip shortcuts in form inputs
                if (e.target.matches('input, textarea, select, [contenteditable]')) {
                    return;
                }
                
                // Get current context
                const context = this.getCurrentKeyboardContext();
                const shortcuts = this.keyboardManager.shortcuts.get(context) || new Map();
                
                // Build key combination
                const keyCombo = this.buildKeyCombo(e);
                
                // Execute shortcut if found
                if (shortcuts.has(keyCombo)) {
                    const shortcut = shortcuts.get(keyCombo);
                    if (shortcut.enabled) {
                        e.preventDefault();
                        shortcut.callback(e);
                    }
                }
            },
            
            // Get current keyboard context
            getCurrentKeyboardContext: () => {
                // Determine context based on focused element or active modal
                if (document.querySelector('.modal.show')) return 'modal';
                if (document.querySelector('.sidebar.active')) return 'sidebar';
                if (document.querySelector('.video-area:focus-within')) return 'video';
                return 'global';
            },
            
            // Build key combination string
            buildKeyCombo: (e) => {
                const parts = [];
                if (e.ctrlKey) parts.push('Ctrl');
                if (e.altKey) parts.push('Alt');
                if (e.shiftKey) parts.push('Shift');
                if (e.metaKey) parts.push('Meta');
                parts.push(e.key);
                return parts.join('+');
            }
        };
        
        // Register default shortcuts
        this.registerDefaultShortcuts();
    }
    
    /**
     * Setup screen reader manager
     */
    setupScreenReaderManager() {
        this.screenReaderManager = {
            // Announce message to screen reader
            announce: (message, priority = 'polite', delay = 0) => {
                if (!this.settings.announcements) return;
                
                setTimeout(() => {
                    const region = this.liveRegions[priority] || this.liveRegions.polite;
                    region.textContent = message;
                    
                    // Clear after announcement
                    setTimeout(() => {
                        region.textContent = '';
                    }, 1000);
                }, delay);
            },
            
            // Describe element for screen reader
            describeElement: (element) => {
                const descriptions = [];
                
                // Element type
                descriptions.push(this.getElementTypeDescription(element));
                
                // Element text or label
                const text = this.getElementText(element);
                if (text) descriptions.push(text);
                
                // Element state
                const state = this.getElementState(element);
                if (state) descriptions.push(state);
                
                // Element position
                if (this.settings.verboseDescriptions) {
                    const position = this.getElementPosition(element);
                    if (position) descriptions.push(position);
                }
                
                return descriptions.join(', ');
            },
            
            // Update element description
            updateElementDescription: (element, description) => {
                if (!element) return;
                
                // Use aria-label if no existing accessible name
                if (!element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby')) {
                    element.setAttribute('aria-label', description);
                }
                
                // Add description if needed
                if (this.settings.verboseDescriptions) {
                    element.setAttribute('aria-description', description);
                }
            }
        };
    }
    
    /**
     * Setup contrast checker
     */
    setupContrastChecker() {
        this.contrastChecker = {
            // Check color contrast ratio
            checkContrast: (foreground, background) => {
                const fgLuminance = this.getLuminance(foreground);
                const bgLuminance = this.getLuminance(background);
                
                const lighter = Math.max(fgLuminance, bgLuminance);
                const darker = Math.min(fgLuminance, bgLuminance);
                
                return (lighter + 0.05) / (darker + 0.05);
            },
            
            // Get WCAG compliance level for contrast ratio
            getComplianceLevel: (ratio, fontSize = 'normal') => {
                const isLargeText = fontSize === 'large' || fontSize === 'extra-large';
                
                if (isLargeText) {
                    if (ratio >= 4.5) return 'AAA';
                    if (ratio >= 3) return 'AA';
                } else {
                    if (ratio >= 7) return 'AAA';
                    if (ratio >= 4.5) return 'AA';
                }
                
                return 'Fail';
            },
            
            // Validate all text elements
            validateTextContrast: () => {
                const textElements = this.container.querySelectorAll('*');
                const violations = [];
                
                textElements.forEach(element => {
                    const styles = window.getComputedStyle(element);
                    const color = styles.color;
                    const backgroundColor = styles.backgroundColor;
                    
                    if (color && backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
                        const ratio = this.contrastChecker.checkContrast(color, backgroundColor);
                        const fontSize = this.getFontSizeCategory(styles.fontSize);
                        const compliance = this.contrastChecker.getComplianceLevel(ratio, fontSize);
                        
                        if (compliance === 'Fail' || (this.settings.wcagLevel === 'AAA' && compliance !== 'AAA')) {
                            violations.push({
                                element,
                                ratio,
                                compliance,
                                foreground: color,
                                background: backgroundColor
                            });
                        }
                    }
                });
                
                return violations;
            }
        };
    }
    
    /**
     * Setup color blindness support
     */
    setupColorBlindnessSupport() {
        this.colorBlindnessSimulator = {
            types: {
                protanopia: 'Red-blind',
                deuteranopia: 'Green-blind',
                tritanopia: 'Blue-blind',
                achromatopsia: 'Complete color blindness'
            },
            
            // Apply color blindness filter
            applyFilter: (type) => {
                this.removeColorBlindnessFilters();
                
                if (type && this.colorBlindnessSimulator.types[type]) {
                    this.container.classList.add(`colorblind-${type}`);
                    this.settings.colorBlindnessSupport = type;
                    this.announce(`Color blindness simulation: ${this.colorBlindnessSimulator.types[type]}`, 'polite');
                }
            },
            
            // Remove color blindness filters
            removeFilter: () => {
                this.removeColorBlindnessFilters();
                this.settings.colorBlindnessSupport = false;
                this.announce('Color blindness simulation disabled', 'polite');
            },
            
            // Check color accessibility
            checkColorAccessibility: () => {
                const issues = [];
                
                // Check for color-only information
                const colorOnlyElements = this.container.querySelectorAll('[style*="color"]');
                colorOnlyElements.forEach(element => {
                    if (this.isColorOnlyInformation(element)) {
                        issues.push({
                            element,
                            issue: 'Information conveyed by color only',
                            suggestion: 'Add text, icons, or patterns to convey information'
                        });
                    }
                });
                
                return issues;
            }
        };
    }

    /**
     * Setup skip links for keyboard navigation
     */
    setupSkipLinks() {
        const skipLinksContainer = document.createElement('div');
        skipLinksContainer.className = 'skip-links';
        skipLinksContainer.setAttribute('role', 'navigation');
        skipLinksContainer.setAttribute('aria-label', 'Skip links');

        // Define skip link targets
        this.skipLinkTargets = [
            { id: 'main-content', label: 'Skip to main content' },
            { id: 'navigation', label: 'Skip to navigation' },
            { id: 'video-player', label: 'Skip to video player' },
            { id: 'chat', label: 'Skip to chat' },
            { id: 'controls', label: 'Skip to controls' }
        ];

        // Create skip links
        this.skipLinkTargets.forEach(target => {
            const skipLink = document.createElement('a');
            skipLink.href = `#${target.id}`;
            skipLink.textContent = target.label;
            skipLink.className = 'skip-link';
            skipLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.skipToTarget(target.id);
            });
            skipLinksContainer.appendChild(skipLink);
        });

        // Insert at beginning of container
        this.container.insertBefore(skipLinksContainer, this.container.firstChild);
    }

    /**
     * Setup landmark elements
     */
    setupLandmarks() {
        // Identify and enhance landmark elements
        const landmarks = [
            { selector: 'header, .header', role: 'banner' },
            { selector: 'nav, .navigation', role: 'navigation' },
            { selector: 'main, .main-content', role: 'main' },
            { selector: 'aside, .sidebar', role: 'complementary' },
            { selector: 'footer, .footer', role: 'contentinfo' },
            { selector: '.search', role: 'search' }
        ];

        landmarks.forEach(landmark => {
            const elements = this.container.querySelectorAll(landmark.selector);
            elements.forEach(element => {
                if (!element.getAttribute('role')) {
                    element.setAttribute('role', landmark.role);
                }

                // Add to landmark tracking
                this.landmarkElements.push({
                    element,
                    role: landmark.role,
                    label: this.getElementText(element) || landmark.role
                });
            });
        });
    }

    /**
     * Setup heading structure
     */
    setupHeadingStructure() {
        const headings = this.container.querySelectorAll('h1, h2, h3, h4, h5, h6');
        this.headingStructure = [];

        headings.forEach((heading, index) => {
            const level = parseInt(heading.tagName.charAt(1));
            const text = heading.textContent.trim();

            this.headingStructure.push({
                element: heading,
                level,
                text,
                index
            });

            // Add navigation attributes
            heading.setAttribute('tabindex', '-1');
            if (!heading.id) {
                heading.id = `heading-${index}`;
            }
        });

        // Validate heading hierarchy
        this.validateHeadingHierarchy();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', this.keyboardManager.handleKeydown.bind(this));

        // Mouse events (detect non-keyboard users)
        document.addEventListener('mousedown', () => {
            this.isKeyboardUser = false;
            this.container.classList.remove('keyboard-user');
        });

        // Focus events
        document.addEventListener('focusin', (e) => {
            this.currentFocusElement = e.target;
            this.handleFocusChange(e.target);
        });

        document.addEventListener('focusout', (e) => {
            this.handleFocusLoss(e.target);
        });

        // Media query listeners for system preferences
        if (window.matchMedia) {
            const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            reducedMotionQuery.addEventListener('change', (e) => {
                this.settings.reducedMotion = e.matches;
                this.applyAccessibilityEnhancements();
            });

            const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
            highContrastQuery.addEventListener('change', (e) => {
                this.settings.highContrast = e.matches;
                this.applyAccessibilityEnhancements();
            });
        }

        // Window events
        window.addEventListener('resize', () => {
            this.updateAccessibilityForViewport();
        });

        // Custom events from other systems
        this.container.addEventListener('theme-change', (e) => {
            this.handleThemeChange(e.detail);
        });

        this.container.addEventListener('responsive-resize', (e) => {
            this.handleResponsiveChange(e.detail);
        });
    }

    /**
     * Apply accessibility enhancements
     */
    applyAccessibilityEnhancements() {
        // Apply visual enhancements
        this.applyVisualEnhancements();

        // Apply motor enhancements
        this.applyMotorEnhancements();

        // Apply cognitive enhancements
        this.applyCognitiveEnhancements();

        // Apply auditory enhancements
        this.applyAuditoryEnhancements();

        // Update ARIA attributes
        this.updateAriaAttributes();

        // Save settings
        this.saveAccessibilitySettings();
    }

    /**
     * Apply visual accessibility enhancements
     */
    applyVisualEnhancements() {
        const root = document.documentElement;

        // High contrast mode
        if (this.settings.highContrast) {
            this.container.classList.add('high-contrast');
            root.style.setProperty('--accessibility-high-contrast', '1');
        } else {
            this.container.classList.remove('high-contrast');
            root.style.setProperty('--accessibility-high-contrast', '0');
        }

        // Reduced motion
        if (this.settings.reducedMotion) {
            this.container.classList.add('reduced-motion');
            root.style.setProperty('--accessibility-reduced-motion', '1');
        } else {
            this.container.classList.remove('reduced-motion');
            root.style.setProperty('--accessibility-reduced-motion', '0');
        }

        // Font size adjustments
        const fontSizeMultipliers = {
            'small': 0.875,
            'normal': 1,
            'large': 1.25,
            'extra-large': 1.5
        };

        const multiplier = fontSizeMultipliers[this.settings.fontSize] || 1;
        root.style.setProperty('--accessibility-font-scale', multiplier);

        // Large text mode
        if (this.settings.largeText) {
            this.container.classList.add('large-text');
        } else {
            this.container.classList.remove('large-text');
        }

        // Focus indicators
        if (this.settings.focusIndicators) {
            this.container.classList.add('enhanced-focus');
        } else {
            this.container.classList.remove('enhanced-focus');
        }
    }

    /**
     * Apply motor accessibility enhancements
     */
    applyMotorEnhancements() {
        // Larger click targets
        if (this.settings.largerClickTargets) {
            this.container.classList.add('large-targets');
        } else {
            this.container.classList.remove('large-targets');
        }

        // Sticky keys simulation (for web)
        if (this.settings.stickyKeys) {
            this.enableStickyKeys();
        } else {
            this.disableStickyKeys();
        }

        // Extended timeouts
        if (this.settings.extendedTimeouts) {
            this.extendTimeouts();
        }
    }

    /**
     * Apply cognitive accessibility enhancements
     */
    applyCognitiveEnhancements() {
        // Simplified interface
        if (this.settings.simplifiedInterface) {
            this.container.classList.add('simplified');
            this.hideNonEssentialElements();
        } else {
            this.container.classList.remove('simplified');
            this.showAllElements();
        }

        // Reduced complexity
        if (this.settings.reducedComplexity) {
            this.container.classList.add('reduced-complexity');
        } else {
            this.container.classList.remove('reduced-complexity');
        }

        // Reading guide
        if (this.settings.readingGuide) {
            this.enableReadingGuide();
        } else {
            this.disableReadingGuide();
        }
    }

    /**
     * Apply auditory accessibility enhancements
     */
    applyAuditoryEnhancements() {
        // Visual indicators for audio
        if (this.settings.visualIndicators) {
            this.container.classList.add('visual-audio-indicators');
        } else {
            this.container.classList.remove('visual-audio-indicators');
        }

        // Captions
        if (this.settings.captionsEnabled) {
            this.enableCaptions();
        } else {
            this.disableCaptions();
        }

        // Audio descriptions
        if (this.settings.audioDescriptions) {
            this.enableAudioDescriptions();
        } else {
            this.disableAudioDescriptions();
        }
    }

    /**
     * Update ARIA attributes for all elements
     */
    updateAriaAttributes() {
        // Update interactive elements
        const interactiveElements = this.container.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="link"]');
        interactiveElements.forEach(element => {
            this.enhanceInteractiveElement(element);
        });

        // Update form elements
        const formElements = this.container.querySelectorAll('input, select, textarea');
        formElements.forEach(element => {
            this.enhanceFormElement(element);
        });

        // Update media elements
        const mediaElements = this.container.querySelectorAll('video, audio, img');
        mediaElements.forEach(element => {
            this.enhanceMediaElement(element);
        });

        // Update dynamic content areas
        const dynamicAreas = this.container.querySelectorAll('[data-dynamic], .dynamic-content');
        dynamicAreas.forEach(element => {
            this.enhanceDynamicContent(element);
        });
    }

    /**
     * Enhance interactive element accessibility
     */
    enhanceInteractiveElement(element) {
        // Ensure focusable
        if (!element.hasAttribute('tabindex') && !this.isNaturallyFocusable(element)) {
            element.setAttribute('tabindex', '0');
        }

        // Add role if missing
        if (!element.getAttribute('role') && element.tagName !== 'BUTTON' && element.tagName !== 'A') {
            element.setAttribute('role', 'button');
        }

        // Add accessible name if missing
        if (!this.hasAccessibleName(element)) {
            const text = this.getElementText(element);
            if (text) {
                element.setAttribute('aria-label', text);
            } else {
                const icon = element.querySelector('i, svg');
                if (icon) {
                    element.setAttribute('aria-label', this.getIconLabel(icon));
                }
            }
        }

        // Add state information
        if (element.classList.contains('active')) {
            element.setAttribute('aria-pressed', 'true');
        }

        if (element.disabled) {
            element.setAttribute('aria-disabled', 'true');
        }

        // Add keyboard support
        if (!element.hasAttribute('data-keyboard-enhanced')) {
            element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    element.click();
                }
            });
            element.setAttribute('data-keyboard-enhanced', 'true');
        }
    }

    /**
     * Enhance form element accessibility
     */
    enhanceFormElement(element) {
        // Add label association
        if (!element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby')) {
            const label = this.findAssociatedLabel(element);
            if (label) {
                if (!label.id) {
                    label.id = `label-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                }
                element.setAttribute('aria-labelledby', label.id);
            } else if (element.placeholder) {
                element.setAttribute('aria-label', element.placeholder);
            }
        }

        // Add description if available
        const description = this.findAssociatedDescription(element);
        if (description) {
            if (!description.id) {
                description.id = `desc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            }
            element.setAttribute('aria-describedby', description.id);
        }

        // Add required indicator
        if (element.required) {
            element.setAttribute('aria-required', 'true');
        }

        // Add invalid state
        if (element.validity && !element.validity.valid) {
            element.setAttribute('aria-invalid', 'true');
        }
    }

    /**
     * Enhance media element accessibility
     */
    enhanceMediaElement(element) {
        if (element.tagName === 'IMG') {
            // Ensure alt text
            if (!element.alt) {
                element.alt = this.generateAltText(element);
            }

            // Mark decorative images
            if (this.isDecorativeImage(element)) {
                element.alt = '';
                element.setAttribute('role', 'presentation');
            }
        } else if (element.tagName === 'VIDEO' || element.tagName === 'AUDIO') {
            // Add media controls accessibility
            this.enhanceMediaControls(element);

            // Add captions track if missing
            if (element.tagName === 'VIDEO' && this.settings.captionsEnabled) {
                this.ensureCaptionsTrack(element);
            }

            // Add audio description track if needed
            if (this.settings.audioDescriptions) {
                this.ensureAudioDescriptionTrack(element);
            }
        }
    }

    /**
     * Run initial WCAG compliance check
     */
    runInitialComplianceCheck() {
        // Check perceivable guidelines
        this.checkPerceivableCompliance();

        // Check operable guidelines
        this.checkOperableCompliance();

        // Check understandable guidelines
        this.checkUnderstandableCompliance();

        // Check robust guidelines
        this.checkRobustCompliance();

        // Generate compliance report
        this.generateComplianceReport();
    }

    /**
     * Check perceivable compliance (WCAG Principle 1)
     */
    checkPerceivableCompliance() {
        const checks = this.complianceChecks.perceivable;

        // 1.1 Text Alternatives
        checks.set('1.1.1', this.checkTextAlternatives());

        // 1.2 Time-based Media
        checks.set('1.2.1', this.checkCaptionsForPrerecorded());
        checks.set('1.2.2', this.checkCaptionsForLive());
        checks.set('1.2.3', this.checkAudioDescriptions());

        // 1.3 Adaptable
        checks.set('1.3.1', this.checkInfoAndRelationships());
        checks.set('1.3.2', this.checkMeaningfulSequence());
        checks.set('1.3.3', this.checkSensoryCharacteristics());

        // 1.4 Distinguishable
        checks.set('1.4.1', this.checkColorUsage());
        checks.set('1.4.2', this.checkAudioControl());
        checks.set('1.4.3', this.checkContrastMinimum());
        checks.set('1.4.4', this.checkResizeText());
        checks.set('1.4.5', this.checkImagesOfText());
    }

    /**
     * Check operable compliance (WCAG Principle 2)
     */
    checkOperableCompliance() {
        const checks = this.complianceChecks.operable;

        // 2.1 Keyboard Accessible
        checks.set('2.1.1', this.checkKeyboardAccess());
        checks.set('2.1.2', this.checkNoKeyboardTrap());

        // 2.2 Enough Time
        checks.set('2.2.1', this.checkTimingAdjustable());
        checks.set('2.2.2', this.checkPauseStopHide());

        // 2.3 Seizures
        checks.set('2.3.1', this.checkThreeFlashes());

        // 2.4 Navigable
        checks.set('2.4.1', this.checkBypassBlocks());
        checks.set('2.4.2', this.checkPageTitled());
        checks.set('2.4.3', this.checkFocusOrder());
        checks.set('2.4.4', this.checkLinkPurpose());
        checks.set('2.4.5', this.checkMultipleWays());
        checks.set('2.4.6', this.checkHeadingsAndLabels());
        checks.set('2.4.7', this.checkFocusVisible());
    }

    /**
     * Public API methods
     */

    // Announce message to screen reader
    announce(message, priority = 'polite', delay = 0) {
        return this.screenReaderManager.announce(message, priority, delay);
    }

    // Update accessibility settings
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.applyAccessibilityEnhancements();
        this.saveAccessibilitySettings();

        // Announce settings change
        this.announce('Accessibility settings updated', 'polite');
    }

    // Get current accessibility settings
    getSettings() {
        return { ...this.settings };
    }

    // Toggle specific accessibility feature
    toggleFeature(feature, value = null) {
        if (value !== null) {
            this.settings[feature] = value;
        } else {
            this.settings[feature] = !this.settings[feature];
        }

        this.applyAccessibilityEnhancements();
        this.saveAccessibilitySettings();

        const status = this.settings[feature] ? 'enabled' : 'disabled';
        this.announce(`${feature} ${status}`, 'polite');

        return this.settings[feature];
    }

    // Focus management
    focusElement(element, options = {}) {
        return this.focusManager.moveFocusTo(element, options);
    }

    trapFocus(container) {
        return this.focusManager.trapFocus(container);
    }

    restoreFocus() {
        return this.focusManager.restoreFocus();
    }

    // Skip navigation
    skipToTarget(targetId) {
        const target = document.getElementById(targetId);
        if (target) {
            this.focusManager.moveFocusTo(target, {
                announce: `Skipped to ${targetId.replace('-', ' ')}`,
                scroll: true
            });
            return true;
        }
        return false;
    }

    // Compliance checking
    runComplianceCheck() {
        this.runInitialComplianceCheck();
        return this.getComplianceReport();
    }

    getComplianceReport() {
        const report = {
            level: this.settings.wcagLevel,
            timestamp: new Date().toISOString(),
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0
            },
            details: {
                perceivable: Object.fromEntries(this.complianceChecks.perceivable),
                operable: Object.fromEntries(this.complianceChecks.operable),
                understandable: Object.fromEntries(this.complianceChecks.understandable),
                robust: Object.fromEntries(this.complianceChecks.robust)
            }
        };

        // Calculate summary
        Object.values(report.details).forEach(principle => {
            Object.values(principle).forEach(result => {
                report.summary.total++;
                if (result.status === 'pass') report.summary.passed++;
                else if (result.status === 'fail') report.summary.failed++;
                else if (result.status === 'warning') report.summary.warnings++;
            });
        });

        return report;
    }

    // Keyboard shortcuts
    registerShortcut(key, callback, description, context = 'global') {
        return this.keyboardManager.registerShortcut(key, callback, description, context);
    }

    getKeyboardShortcuts(context = null) {
        if (context) {
            return this.keyboardManager.shortcuts.get(context) || new Map();
        }
        return this.keyboardManager.shortcuts;
    }

    // Color and contrast
    checkElementContrast(element) {
        const styles = window.getComputedStyle(element);
        const foreground = styles.color;
        const background = styles.backgroundColor;

        if (foreground && background && background !== 'rgba(0, 0, 0, 0)') {
            const ratio = this.contrastChecker.checkContrast(foreground, background);
            const fontSize = this.getFontSizeCategory(styles.fontSize);
            const compliance = this.contrastChecker.getComplianceLevel(ratio, fontSize);

            return {
                ratio,
                compliance,
                foreground,
                background,
                fontSize,
                passes: compliance !== 'Fail'
            };
        }

        return null;
    }

    validateAllContrast() {
        return this.contrastChecker.validateTextContrast();
    }

    // Color blindness simulation
    simulateColorBlindness(type) {
        return this.colorBlindnessSimulator.applyFilter(type);
    }

    removeColorBlindnessSimulation() {
        return this.colorBlindnessSimulator.removeFilter();
    }

    // Utility methods
    isKeyboardUser() {
        return this.isKeyboardUser;
    }

    getCurrentFocus() {
        return this.currentFocusElement;
    }

    getHeadingStructure() {
        return [...this.headingStructure];
    }

    getLandmarks() {
        return [...this.landmarkElements];
    }

    // Integration with other systems
    integrateWithThemeSystem(themeSystem) {
        this.themeSystem = themeSystem;

        // Listen for theme changes
        this.container.addEventListener('theme-change', (e) => {
            this.handleThemeChange(e.detail);
        });
    }

    integrateWithResponsiveSystem(responsiveSystem) {
        this.responsiveSystem = responsiveSystem;

        // Listen for responsive changes
        this.container.addEventListener('responsive-resize', (e) => {
            this.handleResponsiveChange(e.detail);
        });
    }

    integrateWithAnimationSystem(animationSystem) {
        this.animationSystem = animationSystem;

        // Apply reduced motion settings
        if (this.settings.reducedMotion && animationSystem.updateSettings) {
            animationSystem.updateSettings({ enableAnimations: false });
        }
    }

    /**
     * Utility methods for internal use
     */

    // Get element text content
    getElementText(element) {
        if (!element) return '';

        // Check for aria-label first
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel) return ariaLabel;

        // Check for aria-labelledby
        const labelledBy = element.getAttribute('aria-labelledby');
        if (labelledBy) {
            const labelElement = document.getElementById(labelledBy);
            if (labelElement) return labelElement.textContent.trim();
        }

        // Get visible text content
        return element.textContent.trim();
    }

    // Check if element has accessible name
    hasAccessibleName(element) {
        return !!(
            element.getAttribute('aria-label') ||
            element.getAttribute('aria-labelledby') ||
            element.getAttribute('title') ||
            (element.textContent && element.textContent.trim())
        );
    }

    // Check if element is naturally focusable
    isNaturallyFocusable(element) {
        const focusableTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
        return focusableTags.includes(element.tagName) && !element.disabled;
    }

    // Get focusable elements in container
    getFocusableElements(container) {
        const selector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        return Array.from(container.querySelectorAll(selector));
    }

    // Get icon label from icon element
    getIconLabel(icon) {
        const iconMap = {
            'fa-play': 'Play',
            'fa-pause': 'Pause',
            'fa-stop': 'Stop',
            'fa-volume-up': 'Volume up',
            'fa-volume-down': 'Volume down',
            'fa-volume-mute': 'Mute',
            'fa-fullscreen': 'Fullscreen',
            'fa-cog': 'Settings',
            'fa-times': 'Close',
            'fa-bars': 'Menu',
            'fa-search': 'Search',
            'fa-user': 'User',
            'fa-chat': 'Chat',
            'fa-video': 'Video',
            'fa-microphone': 'Microphone'
        };

        // Check for Font Awesome classes
        for (const [className, label] of Object.entries(iconMap)) {
            if (icon.classList.contains(className)) {
                return label;
            }
        }

        // Check for title or aria-label
        return icon.getAttribute('title') || icon.getAttribute('aria-label') || 'Icon';
    }

    // Save accessibility settings to localStorage
    saveAccessibilitySettings() {
        try {
            localStorage.setItem('accessibility-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Could not save accessibility settings:', error);
        }
    }

    // Load accessibility settings from localStorage
    loadAccessibilitySettings() {
        try {
            const saved = localStorage.getItem('accessibility-settings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.settings = { ...this.settings, ...settings };
            }
        } catch (error) {
            console.warn('Could not load accessibility settings:', error);
        }
    }

    // Register default keyboard shortcuts
    registerDefaultShortcuts() {
        // Global shortcuts
        this.keyboardManager.registerShortcut('Alt+1', () => this.skipToTarget('main-content'), 'Skip to main content');
        this.keyboardManager.registerShortcut('Alt+2', () => this.skipToTarget('navigation'), 'Skip to navigation');
        this.keyboardManager.registerShortcut('Alt+3', () => this.skipToTarget('video-player'), 'Skip to video player');
        this.keyboardManager.registerShortcut('Alt+4', () => this.skipToTarget('chat'), 'Skip to chat');
        this.keyboardManager.registerShortcut('Alt+5', () => this.skipToTarget('controls'), 'Skip to controls');

        // Accessibility shortcuts
        this.keyboardManager.registerShortcut('Alt+Shift+H', () => this.toggleFeature('highContrast'), 'Toggle high contrast');
        this.keyboardManager.registerShortcut('Alt+Shift+M', () => this.toggleFeature('reducedMotion'), 'Toggle reduced motion');
        this.keyboardManager.registerShortcut('Alt+Shift+F', () => this.toggleFeature('largeText'), 'Toggle large text');
        this.keyboardManager.registerShortcut('Alt+Shift+A', () => this.toggleFeature('announcements'), 'Toggle announcements');

        // Navigation shortcuts
        this.keyboardManager.registerShortcut('H', () => this.navigateHeadings('next'), 'Next heading');
        this.keyboardManager.registerShortcut('Shift+H', () => this.navigateHeadings('previous'), 'Previous heading');
        this.keyboardManager.registerShortcut('L', () => this.navigateLandmarks('next'), 'Next landmark');
        this.keyboardManager.registerShortcut('Shift+L', () => this.navigateLandmarks('previous'), 'Previous landmark');
    }

    // Navigate through headings
    navigateHeadings(direction) {
        const headings = this.headingStructure;
        if (headings.length === 0) return;

        const currentIndex = headings.findIndex(h => h.element === this.currentFocusElement);
        let nextIndex;

        if (direction === 'next') {
            nextIndex = currentIndex < headings.length - 1 ? currentIndex + 1 : 0;
        } else {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : headings.length - 1;
        }

        const nextHeading = headings[nextIndex];
        this.focusManager.moveFocusTo(nextHeading.element, {
            announce: `Heading level ${nextHeading.level}: ${nextHeading.text}`,
            scroll: true
        });
    }

    // Navigate through landmarks
    navigateLandmarks(direction) {
        const landmarks = this.landmarkElements;
        if (landmarks.length === 0) return;

        const currentIndex = landmarks.findIndex(l => l.element === this.currentFocusElement);
        let nextIndex;

        if (direction === 'next') {
            nextIndex = currentIndex < landmarks.length - 1 ? currentIndex + 1 : 0;
        } else {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : landmarks.length - 1;
        }

        const nextLandmark = landmarks[nextIndex];
        this.focusManager.moveFocusTo(nextLandmark.element, {
            announce: `${nextLandmark.role}: ${nextLandmark.label}`,
            scroll: true
        });
    }

    // Inject accessibility CSS
    injectAccessibilityCSS() {
        const style = document.createElement('style');
        style.id = 'accessibility-system-styles';
        style.textContent = `
            /* Screen reader only content */
            .sr-only {
                position: absolute !important;
                width: 1px !important;
                height: 1px !important;
                padding: 0 !important;
                margin: -1px !important;
                overflow: hidden !important;
                clip: rect(0, 0, 0, 0) !important;
                white-space: nowrap !important;
                border: 0 !important;
            }

            /* Skip links */
            .skip-links {
                position: absolute;
                top: 0;
                left: 0;
                z-index: 10000;
            }

            .skip-link {
                position: absolute;
                top: -40px;
                left: 6px;
                background: var(--theme-primary, #FF0000);
                color: var(--theme-textOnPrimary, #ffffff);
                padding: 8px 16px;
                text-decoration: none;
                border-radius: 4px;
                font-weight: 600;
                transition: top 0.3s ease;
            }

            .skip-link:focus {
                top: 6px;
            }

            /* Enhanced focus indicators */
            .enhanced-focus *:focus {
                outline: 3px solid var(--theme-primary, #FF0000) !important;
                outline-offset: 2px !important;
            }

            .keyboard-user *:focus {
                outline: 3px solid var(--theme-primary, #FF0000) !important;
                outline-offset: 2px !important;
            }

            /* High contrast mode */
            .high-contrast {
                filter: contrast(150%);
            }

            .high-contrast * {
                border-color: #000000 !important;
                text-shadow: none !important;
                box-shadow: none !important;
            }

            /* Reduced motion */
            .reduced-motion *,
            .reduced-motion *::before,
            .reduced-motion *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
                scroll-behavior: auto !important;
            }

            /* Large text mode */
            .large-text {
                font-size: calc(var(--accessibility-font-scale, 1) * 1em);
            }

            /* Large click targets */
            .large-targets button,
            .large-targets a,
            .large-targets input,
            .large-targets select {
                min-height: 44px;
                min-width: 44px;
                padding: 12px 16px;
            }

            /* Simplified interface */
            .simplified .non-essential {
                display: none !important;
            }

            .simplified .complex-animation {
                animation: none !important;
            }

            /* Visual audio indicators */
            .visual-audio-indicators .audio-playing::before {
                content: "🔊";
                position: absolute;
                top: 0;
                right: 0;
                background: var(--theme-primary, #FF0000);
                color: var(--theme-textOnPrimary, #ffffff);
                padding: 4px;
                border-radius: 50%;
                font-size: 12px;
            }

            /* Color blindness filters */
            .colorblind-protanopia {
                filter: url('#protanopia-filter');
            }

            .colorblind-deuteranopia {
                filter: url('#deuteranopia-filter');
            }

            .colorblind-tritanopia {
                filter: url('#tritanopia-filter');
            }

            .colorblind-achromatopsia {
                filter: grayscale(100%);
            }

            /* Reading guide */
            .reading-guide-active {
                position: relative;
            }

            .reading-guide-line {
                position: fixed;
                top: 50%;
                left: 0;
                right: 0;
                height: 2px;
                background: var(--theme-primary, #FF0000);
                z-index: 9999;
                pointer-events: none;
                opacity: 0.7;
            }

            /* Responsive accessibility adjustments */
            @media (max-width: 768px) {
                .large-targets button,
                .large-targets a,
                .large-targets input,
                .large-targets select {
                    min-height: 48px;
                    min-width: 48px;
                }
            }

            /* Print accessibility */
            @media print {
                .skip-links,
                .accessibility-toolbar {
                    display: none !important;
                }
            }
        `;

        document.head.appendChild(style);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AccessibilitySystem;
} else if (typeof window !== 'undefined') {
    window.AccessibilitySystem = AccessibilitySystem;
}
