/**
 * Animated Transitions and Micro-Interactions System
 * Professional animation framework for streaming interface
 */
class AnimatedTransitions {
    constructor(options = {}) {
        this.container = options.container || document.body;
        this.streamingInterface = options.streamingInterface || null;
        this.controlPanels = options.controlPanels || null;
        this.enableAnimations = options.enableAnimations !== false;
        this.performanceMode = options.performanceMode || 'auto'; // 'auto', 'high', 'low'
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        // Animation settings
        this.settings = {
            // Timing functions
            easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
            easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
            easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
            bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            
            // Duration presets
            fast: 150,
            normal: 250,
            slow: 350,
            slower: 500,
            
            // Stagger delays
            staggerDelay: 50,
            cascadeDelay: 100,
            
            // Performance thresholds
            maxConcurrentAnimations: 10,
            frameRateThreshold: 30,
            
            ...options.settings
        };
        
        // Animation queue and tracking
        this.animationQueue = [];
        this.activeAnimations = new Set();
        this.performanceMetrics = {
            frameRate: 60,
            animationCount: 0,
            lastFrameTime: performance.now()
        };
        
        // Intersection observer for performance
        this.intersectionObserver = null;
        this.visibilityObserver = null;
        
        // Animation presets
        this.presets = {
            // Entrance animations
            fadeIn: { opacity: [0, 1] },
            slideInUp: { transform: ['translateY(20px)', 'translateY(0)'], opacity: [0, 1] },
            slideInDown: { transform: ['translateY(-20px)', 'translateY(0)'], opacity: [0, 1] },
            slideInLeft: { transform: ['translateX(-20px)', 'translateX(0)'], opacity: [0, 1] },
            slideInRight: { transform: ['translateX(20px)', 'translateX(0)'], opacity: [0, 1] },
            scaleIn: { transform: ['scale(0.8)', 'scale(1)'], opacity: [0, 1] },
            bounceIn: { transform: ['scale(0.3)', 'scale(1.05)', 'scale(0.9)', 'scale(1)'] },
            
            // Exit animations
            fadeOut: { opacity: [1, 0] },
            slideOutUp: { transform: ['translateY(0)', 'translateY(-20px)'], opacity: [1, 0] },
            slideOutDown: { transform: ['translateY(0)', 'translateY(20px)'], opacity: [1, 0] },
            slideOutLeft: { transform: ['translateX(0)', 'translateX(-20px)'], opacity: [1, 0] },
            slideOutRight: { transform: ['translateX(0)', 'translateX(20px)'], opacity: [1, 0] },
            scaleOut: { transform: ['scale(1)', 'scale(0.8)'], opacity: [1, 0] },
            
            // Attention animations
            pulse: { transform: ['scale(1)', 'scale(1.05)', 'scale(1)'] },
            shake: { transform: ['translateX(0)', 'translateX(-5px)', 'translateX(5px)', 'translateX(0)'] },
            bounce: { transform: ['translateY(0)', 'translateY(-10px)', 'translateY(0)'] },
            flash: { opacity: [1, 0.5, 1] },
            glow: { boxShadow: ['0 0 0 rgba(255, 0, 0, 0)', '0 0 20px rgba(255, 0, 0, 0.5)', '0 0 0 rgba(255, 0, 0, 0)'] },
            
            // Micro-interactions
            buttonPress: { transform: ['scale(1)', 'scale(0.95)', 'scale(1)'] },
            buttonHover: { transform: ['scale(1)', 'scale(1.05)'] },
            cardHover: { transform: ['translateY(0)', 'translateY(-4px)'], boxShadow: ['0 2px 8px rgba(0,0,0,0.1)', '0 8px 24px rgba(0,0,0,0.2)'] },
            iconSpin: { transform: ['rotate(0deg)', 'rotate(360deg)'] },
            
            // Layout transitions
            expandHeight: { height: ['0px', 'auto'] },
            collapseHeight: { height: ['auto', '0px'] },
            expandWidth: { width: ['0px', 'auto'] },
            collapseWidth: { width: ['auto', '0px'] }
        };
        
        this.init();
    }
    
    /**
     * Initialize animation system
     */
    init() {
        this.setupPerformanceMonitoring();
        this.setupIntersectionObserver();
        this.setupVisibilityObserver();
        this.attachEventListeners();
        this.injectAnimationCSS();
        
        // Auto-detect performance mode
        if (this.performanceMode === 'auto') {
            this.detectPerformanceMode();
        }
    }
    
    /**
     * Setup performance monitoring
     */
    setupPerformanceMonitoring() {
        let frameCount = 0;
        let lastTime = performance.now();
        
        const measureFrameRate = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                this.performanceMetrics.frameRate = frameCount;
                this.performanceMetrics.lastFrameTime = currentTime;
                frameCount = 0;
                lastTime = currentTime;
                
                // Adjust performance mode based on frame rate
                if (this.performanceMode === 'auto') {
                    if (this.performanceMetrics.frameRate < this.settings.frameRateThreshold) {
                        this.enableLowPerformanceMode();
                    } else {
                        this.enableHighPerformanceMode();
                    }
                }
            }
            
            requestAnimationFrame(measureFrameRate);
        };
        
        requestAnimationFrame(measureFrameRate);
    }
    
    /**
     * Setup intersection observer for performance optimization
     */
    setupIntersectionObserver() {
        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const element = entry.target;
                
                if (entry.isIntersecting) {
                    element.classList.add('in-viewport');
                    this.triggerViewportAnimation(element);
                } else {
                    element.classList.remove('in-viewport');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });
    }
    
    /**
     * Setup visibility observer for tab focus
     */
    setupVisibilityObserver() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseAllAnimations();
            } else {
                this.resumeAllAnimations();
            }
        });
    }
    
    /**
     * Attach event listeners for micro-interactions
     */
    attachEventListeners() {
        // Button interactions
        this.container.addEventListener('mousedown', (e) => {
            if (e.target.matches('button, .btn, .control-btn, .header-btn, .btn-icon')) {
                this.animateButtonPress(e.target);
            }
        });
        
        // Hover interactions
        this.container.addEventListener('mouseenter', (e) => {
            if (e.target.matches('.dashboard-card, .nav-panel, .participant-item')) {
                this.animateHover(e.target, 'enter');
            }
        }, true);
        
        this.container.addEventListener('mouseleave', (e) => {
            if (e.target.matches('.dashboard-card, .nav-panel, .participant-item')) {
                this.animateHover(e.target, 'leave');
            }
        }, true);
        
        // Focus interactions
        this.container.addEventListener('focus', (e) => {
            if (e.target.matches('input, select, textarea, button')) {
                this.animateFocus(e.target, true);
            }
        }, true);
        
        this.container.addEventListener('blur', (e) => {
            if (e.target.matches('input, select, textarea, button')) {
                this.animateFocus(e.target, false);
            }
        }, true);
        
        // Loading state animations
        this.container.addEventListener('loading-start', (e) => {
            this.animateLoadingStart(e.target);
        });
        
        this.container.addEventListener('loading-end', (e) => {
            this.animateLoadingEnd(e.target);
        });
    }
    
    /**
     * Animate element with preset or custom animation
     */
    animate(element, animation, options = {}) {
        if (!this.enableAnimations || this.reducedMotion) {
            return Promise.resolve();
        }
        
        // Check performance limits
        if (this.activeAnimations.size >= this.settings.maxConcurrentAnimations) {
            return Promise.resolve();
        }
        
        const config = {
            duration: options.duration || this.settings.normal,
            easing: options.easing || this.settings.easeInOut,
            delay: options.delay || 0,
            fill: options.fill || 'both',
            iterations: options.iterations || 1,
            direction: options.direction || 'normal',
            ...options
        };
        
        // Get animation keyframes
        let keyframes;
        if (typeof animation === 'string' && this.presets[animation]) {
            keyframes = this.presets[animation];
        } else if (typeof animation === 'object') {
            keyframes = animation;
        } else {
            console.warn('Invalid animation:', animation);
            return Promise.resolve();
        }
        
        // Create Web Animations API animation
        const webAnimation = element.animate(keyframes, config);
        
        // Track animation
        this.activeAnimations.add(webAnimation);
        this.performanceMetrics.animationCount++;
        
        // Handle animation completion
        return new Promise((resolve) => {
            webAnimation.addEventListener('finish', () => {
                this.activeAnimations.delete(webAnimation);
                resolve();
            });
            
            webAnimation.addEventListener('cancel', () => {
                this.activeAnimations.delete(webAnimation);
                resolve();
            });
        });
    }
    
    /**
     * Animate multiple elements with stagger effect
     */
    animateStagger(elements, animation, options = {}) {
        const staggerDelay = options.staggerDelay || this.settings.staggerDelay;
        const promises = [];
        
        elements.forEach((element, index) => {
            const elementOptions = {
                ...options,
                delay: (options.delay || 0) + (index * staggerDelay)
            };
            
            promises.push(this.animate(element, animation, elementOptions));
        });
        
        return Promise.all(promises);
    }
    
    /**
     * Animate sequence of animations
     */
    animateSequence(animations) {
        return animations.reduce((promise, { element, animation, options }) => {
            return promise.then(() => this.animate(element, animation, options));
        }, Promise.resolve());
    }
    
    /**
     * Animate button press micro-interaction
     */
    animateButtonPress(button) {
        if (!button || button.classList.contains('animating')) return;
        
        button.classList.add('animating');
        
        this.animate(button, 'buttonPress', {
            duration: this.settings.fast,
            easing: this.settings.bounce
        }).then(() => {
            button.classList.remove('animating');
        });
    }
    
    /**
     * Animate hover interactions
     */
    animateHover(element, type) {
        if (!element) return;
        
        if (type === 'enter') {
            if (element.classList.contains('.dashboard-card')) {
                this.animate(element, 'cardHover', {
                    duration: this.settings.normal,
                    easing: this.settings.easeOut
                });
            } else {
                this.animate(element, 'buttonHover', {
                    duration: this.settings.fast,
                    easing: this.settings.easeOut
                });
            }
        } else {
            // Reset to original state
            this.animate(element, {
                transform: ['scale(1.05)', 'scale(1)'],
                boxShadow: element.classList.contains('.dashboard-card') ? 
                    ['0 8px 24px rgba(0,0,0,0.2)', '0 2px 8px rgba(0,0,0,0.1)'] : undefined
            }, {
                duration: this.settings.fast,
                easing: this.settings.easeIn
            });
        }
    }
    
    /**
     * Animate focus states
     */
    animateFocus(element, focused) {
        if (!element) return;
        
        if (focused) {
            this.animate(element, {
                transform: ['scale(1)', 'scale(1.02)'],
                boxShadow: ['0 0 0 0 rgba(255, 0, 0, 0)', '0 0 0 2px rgba(255, 0, 0, 0.2)']
            }, {
                duration: this.settings.fast,
                easing: this.settings.easeOut
            });
        } else {
            this.animate(element, {
                transform: ['scale(1.02)', 'scale(1)'],
                boxShadow: ['0 0 0 2px rgba(255, 0, 0, 0.2)', '0 0 0 0 rgba(255, 0, 0, 0)']
            }, {
                duration: this.settings.fast,
                easing: this.settings.easeIn
            });
        }
    }
    
    /**
     * Animate loading states
     */
    animateLoadingStart(element) {
        if (!element) return;
        
        // Add loading spinner
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner-micro';
        spinner.innerHTML = '<div class="spinner-dot"></div><div class="spinner-dot"></div><div class="spinner-dot"></div>';
        
        element.appendChild(spinner);
        
        // Animate spinner entrance
        this.animate(spinner, 'fadeIn', {
            duration: this.settings.fast
        });
        
        // Animate dots
        const dots = spinner.querySelectorAll('.spinner-dot');
        this.animateStagger(dots, {
            transform: ['scale(0)', 'scale(1)', 'scale(0)'],
            opacity: [0, 1, 0]
        }, {
            duration: this.settings.slower,
            iterations: Infinity,
            staggerDelay: 100
        });
    }
    
    /**
     * Animate loading end
     */
    animateLoadingEnd(element) {
        if (!element) return;
        
        const spinner = element.querySelector('.loading-spinner-micro');
        if (spinner) {
            this.animate(spinner, 'fadeOut', {
                duration: this.settings.fast
            }).then(() => {
                spinner.remove();
            });
        }
    }
    
    /**
     * Trigger viewport animations
     */
    triggerViewportAnimation(element) {
        if (element.hasAttribute('data-animate-in')) {
            const animation = element.getAttribute('data-animate-in');
            const delay = parseInt(element.getAttribute('data-animate-delay')) || 0;
            
            this.animate(element, animation, {
                delay: delay,
                duration: this.settings.normal
            });
        }
    }
    
    /**
     * Animate panel transitions
     */
    animatePanelTransition(fromPanel, toPanel, direction = 'forward') {
        if (!fromPanel || !toPanel) return Promise.resolve();
        
        const exitAnimation = direction === 'forward' ? 'slideOutLeft' : 'slideOutRight';
        const enterAnimation = direction === 'forward' ? 'slideInRight' : 'slideInLeft';
        
        // Exit current panel
        const exitPromise = this.animate(fromPanel, exitAnimation, {
            duration: this.settings.normal,
            easing: this.settings.easeIn
        });
        
        // Enter new panel with slight delay
        const enterPromise = this.animate(toPanel, enterAnimation, {
            duration: this.settings.normal,
            delay: this.settings.normal * 0.3,
            easing: this.settings.easeOut
        });
        
        return Promise.all([exitPromise, enterPromise]);
    }
    
    /**
     * Animate notification appearance
     */
    animateNotification(notification, type = 'info') {
        if (!notification) return Promise.resolve();
        
        // Set initial state
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        
        // Animate entrance
        return this.animate(notification, {
            transform: ['translateX(100%)', 'translateX(0)'],
            opacity: [0, 1]
        }, {
            duration: this.settings.normal,
            easing: this.settings.easeOut
        });
    }
    
    /**
     * Animate stream state changes
     */
    animateStreamStateChange(state, elements = {}) {
        const { statusIndicator, recordingDot, controlButtons } = elements;
        
        switch (state) {
            case 'starting':
                if (statusIndicator) {
                    this.animate(statusIndicator, 'pulse', {
                        duration: this.settings.slower,
                        iterations: Infinity
                    });
                }
                break;
                
            case 'live':
                if (statusIndicator) {
                    this.animate(statusIndicator, {
                        backgroundColor: ['#6c757d', '#dc3545'],
                        transform: ['scale(1)', 'scale(1.2)', 'scale(1)']
                    }, {
                        duration: this.settings.slow,
                        easing: this.settings.bounce
                    });
                }
                break;
                
            case 'recording':
                if (recordingDot) {
                    this.animate(recordingDot, 'pulse', {
                        duration: 1000,
                        iterations: Infinity
                    });
                }
                break;
                
            case 'stopped':
                if (statusIndicator) {
                    this.animate(statusIndicator, {
                        backgroundColor: ['#dc3545', '#6c757d'],
                        transform: ['scale(1)', 'scale(0.8)', 'scale(1)']
                    }, {
                        duration: this.settings.normal
                    });
                }
                break;
        }
    }
    
    /**
     * Animate quality indicator changes
     */
    animateQualityChange(indicator, quality) {
        if (!indicator) return;
        
        const colors = {
            'excellent': '#28a745',
            'good': '#28a745',
            'fair': '#ffc107',
            'poor': '#fd7e14',
            'very-poor': '#dc3545'
        };
        
        this.animate(indicator, {
            backgroundColor: [indicator.style.backgroundColor || '#6c757d', colors[quality]],
            transform: ['scale(1)', 'scale(1.3)', 'scale(1)']
        }, {
            duration: this.settings.normal,
            easing: this.settings.bounce
        });
    }
    
    /**
     * Performance optimization methods
     */
    enableLowPerformanceMode() {
        this.settings.fast = 100;
        this.settings.normal = 150;
        this.settings.slow = 200;
        this.settings.maxConcurrentAnimations = 5;
    }
    
    enableHighPerformanceMode() {
        this.settings.fast = 150;
        this.settings.normal = 250;
        this.settings.slow = 350;
        this.settings.maxConcurrentAnimations = 15;
    }
    
    detectPerformanceMode() {
        // Simple performance detection based on device capabilities
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
            this.enableLowPerformanceMode();
            return;
        }
        
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            if (renderer.includes('Intel') || renderer.includes('Software')) {
                this.enableLowPerformanceMode();
            } else {
                this.enableHighPerformanceMode();
            }
        }
    }
    
    /**
     * Pause all animations
     */
    pauseAllAnimations() {
        this.activeAnimations.forEach(animation => {
            animation.pause();
        });
    }
    
    /**
     * Resume all animations
     */
    resumeAllAnimations() {
        this.activeAnimations.forEach(animation => {
            animation.play();
        });
    }
    
    /**
     * Cancel all animations
     */
    cancelAllAnimations() {
        this.activeAnimations.forEach(animation => {
            animation.cancel();
        });
        this.activeAnimations.clear();
    }
    
    /**
     * Observe element for viewport animations
     */
    observeElement(element) {
        if (this.intersectionObserver) {
            this.intersectionObserver.observe(element);
        }
    }
    
    /**
     * Unobserve element
     */
    unobserveElement(element) {
        if (this.intersectionObserver) {
            this.intersectionObserver.unobserve(element);
        }
    }
    
    /**
     * Inject animation CSS
     */
    injectAnimationCSS() {
        const css = `
            /* Micro-interaction loading spinner */
            .loading-spinner-micro {
                display: inline-flex;
                gap: 2px;
                margin-left: 8px;
            }
            
            .spinner-dot {
                width: 4px;
                height: 4px;
                background: currentColor;
                border-radius: 50%;
                opacity: 0.6;
            }
            
            /* Animation utilities */
            .animate-on-scroll {
                opacity: 0;
                transform: translateY(20px);
            }
            
            .animate-on-scroll.in-viewport {
                opacity: 1;
                transform: translateY(0);
                transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            /* Reduced motion support */
            @media (prefers-reduced-motion: reduce) {
                .animate-on-scroll {
                    opacity: 1;
                    transform: none;
                }
                
                .animate-on-scroll.in-viewport {
                    transition: none;
                }
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = css;
        document.head.appendChild(styleSheet);
    }
    
    /**
     * Public API methods
     */
    setStreamingInterface(streamingInterface) {
        this.streamingInterface = streamingInterface;
    }
    
    setControlPanels(controlPanels) {
        this.controlPanels = controlPanels;
    }
    
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }
    
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }
    
    /**
     * Advanced streaming-specific animations
     */
    animateLayoutChange(fromLayout, toLayout, container) {
        if (!container) return Promise.resolve();

        const layoutAnimations = {
            'spotlight': { gridTemplateColumns: ['1fr', '1fr'], gridTemplateRows: ['1fr', '1fr'] },
            'grid': { gridTemplateColumns: ['1fr', 'repeat(2, 1fr)'], gridTemplateRows: ['1fr', 'repeat(2, 1fr)'] },
            'sidebar': { gridTemplateColumns: ['1fr', '2fr 1fr'], gridTemplateRows: ['1fr', '1fr'] },
            'presentation': { gridTemplateColumns: ['1fr', '1fr'], gridTemplateRows: ['1fr', '2fr 1fr'] }
        };

        const fromAnimation = layoutAnimations[fromLayout];
        const toAnimation = layoutAnimations[toLayout];

        if (fromAnimation && toAnimation) {
            return this.animate(container, {
                gridTemplateColumns: [fromAnimation.gridTemplateColumns[0], toAnimation.gridTemplateColumns[1]],
                gridTemplateRows: [fromAnimation.gridTemplateRows[0], toAnimation.gridTemplateRows[1]]
            }, {
                duration: this.settings.slow,
                easing: this.settings.easeInOut
            });
        }

        return Promise.resolve();
    }

    /**
     * Animate participant join/leave
     */
    animateParticipantChange(participant, action) {
        if (!participant) return Promise.resolve();

        switch (action) {
            case 'join':
                // Animate participant entrance
                participant.style.transform = 'scale(0) translateY(20px)';
                participant.style.opacity = '0';

                return this.animate(participant, {
                    transform: ['scale(0) translateY(20px)', 'scale(1.1) translateY(-5px)', 'scale(1) translateY(0)'],
                    opacity: [0, 0.8, 1]
                }, {
                    duration: this.settings.slow,
                    easing: this.settings.bounce
                });

            case 'leave':
                return this.animate(participant, {
                    transform: ['scale(1) translateY(0)', 'scale(0.8) translateY(10px)', 'scale(0) translateY(20px)'],
                    opacity: [1, 0.5, 0]
                }, {
                    duration: this.settings.normal,
                    easing: this.settings.easeIn
                });

            case 'speaking':
                return this.animate(participant, {
                    boxShadow: [
                        '0 0 0 0 rgba(255, 0, 0, 0)',
                        '0 0 0 4px rgba(255, 0, 0, 0.3)',
                        '0 0 0 8px rgba(255, 0, 0, 0.1)',
                        '0 0 0 0 rgba(255, 0, 0, 0)'
                    ]
                }, {
                    duration: this.settings.slower,
                    iterations: Infinity
                });

            case 'muted':
                return this.animate(participant, {
                    filter: ['grayscale(0)', 'grayscale(0.7)'],
                    opacity: [1, 0.6]
                }, {
                    duration: this.settings.normal
                });

            case 'unmuted':
                return this.animate(participant, {
                    filter: ['grayscale(0.7)', 'grayscale(0)'],
                    opacity: [0.6, 1]
                }, {
                    duration: this.settings.normal
                });
        }

        return Promise.resolve();
    }

    /**
     * Animate chat message appearance
     */
    animateChatMessage(message, type = 'normal') {
        if (!message) return Promise.resolve();

        // Set initial state
        message.style.transform = 'translateX(20px)';
        message.style.opacity = '0';

        const animations = {
            normal: {
                transform: ['translateX(20px)', 'translateX(0)'],
                opacity: [0, 1]
            },
            system: {
                transform: ['scale(0.8)', 'scale(1.05)', 'scale(1)'],
                opacity: [0, 0.8, 1],
                backgroundColor: ['rgba(255, 0, 0, 0)', 'rgba(255, 0, 0, 0.1)', 'rgba(255, 0, 0, 0)']
            },
            highlight: {
                transform: ['translateX(20px)', 'translateX(-5px)', 'translateX(0)'],
                opacity: [0, 1],
                backgroundColor: ['rgba(255, 255, 0, 0)', 'rgba(255, 255, 0, 0.2)', 'rgba(255, 255, 0, 0)']
            }
        };

        return this.animate(message, animations[type] || animations.normal, {
            duration: this.settings.normal,
            easing: this.settings.easeOut
        });
    }

    /**
     * Animate control panel state changes
     */
    animateControlPanelState(panel, state) {
        if (!panel) return Promise.resolve();

        switch (state) {
            case 'loading':
                return this.animate(panel, {
                    opacity: [1, 0.6, 1]
                }, {
                    duration: this.settings.slower,
                    iterations: Infinity
                });

            case 'error':
                return this.animate(panel, {
                    borderColor: ['var(--panel-border)', '#dc3545', 'var(--panel-border)'],
                    backgroundColor: ['var(--panel-card)', 'rgba(220, 53, 69, 0.1)', 'var(--panel-card)']
                }, {
                    duration: this.settings.slow
                });

            case 'success':
                return this.animate(panel, {
                    borderColor: ['var(--panel-border)', '#28a745', 'var(--panel-border)'],
                    backgroundColor: ['var(--panel-card)', 'rgba(40, 167, 69, 0.1)', 'var(--panel-card)']
                }, {
                    duration: this.settings.slow
                });

            case 'active':
                return this.animate(panel, {
                    borderColor: ['var(--panel-border)', 'var(--panel-primary)'],
                    boxShadow: ['0 2px 8px rgba(0,0,0,0.1)', '0 4px 16px rgba(255, 0, 0, 0.2)']
                }, {
                    duration: this.settings.normal
                });
        }

        return Promise.resolve();
    }

    /**
     * Animate volume level indicators
     */
    animateVolumeLevel(indicator, level) {
        if (!indicator) return Promise.resolve();

        const height = Math.max(2, Math.min(100, level * 100));

        return this.animate(indicator, {
            height: [`${indicator.style.height || '2px'}`, `${height}%`],
            backgroundColor: level > 0.8 ? ['#28a745', '#dc3545'] :
                           level > 0.5 ? ['#28a745', '#ffc107'] :
                           ['#28a745', '#28a745']
        }, {
            duration: this.settings.fast,
            easing: this.settings.easeOut
        });
    }

    /**
     * Animate connection quality changes
     */
    animateConnectionQuality(indicator, quality, previousQuality) {
        if (!indicator) return Promise.resolve();

        const qualityColors = {
            excellent: '#28a745',
            good: '#28a745',
            fair: '#ffc107',
            poor: '#fd7e14',
            'very-poor': '#dc3545'
        };

        const fromColor = qualityColors[previousQuality] || '#6c757d';
        const toColor = qualityColors[quality] || '#6c757d';

        // Animate color change with pulse effect
        return this.animate(indicator, {
            backgroundColor: [fromColor, toColor],
            transform: ['scale(1)', 'scale(1.2)', 'scale(1)']
        }, {
            duration: this.settings.normal,
            easing: this.settings.bounce
        });
    }

    /**
     * Animate settings save feedback
     */
    animateSettingsSave(element, success = true) {
        if (!element) return Promise.resolve();

        const color = success ? '#28a745' : '#dc3545';
        const icon = success ? 'fas fa-check' : 'fas fa-times';

        // Create feedback indicator
        const feedback = document.createElement('div');
        feedback.className = 'settings-save-feedback';
        feedback.innerHTML = `<i class="${icon}"></i>`;
        feedback.style.cssText = `
            position: absolute;
            top: 50%;
            right: 10px;
            transform: translateY(-50%);
            color: ${color};
            font-size: 14px;
            opacity: 0;
            pointer-events: none;
        `;

        element.style.position = 'relative';
        element.appendChild(feedback);

        // Animate feedback
        return this.animate(feedback, {
            opacity: [0, 1, 1, 0],
            transform: ['translateY(-50%) scale(0.5)', 'translateY(-50%) scale(1)', 'translateY(-50%) scale(1)', 'translateY(-50%) scale(0.5)']
        }, {
            duration: this.settings.slower * 2
        }).then(() => {
            feedback.remove();
        });
    }

    /**
     * Animate modal/dialog transitions
     */
    animateModal(modal, action) {
        if (!modal) return Promise.resolve();

        switch (action) {
            case 'open':
                modal.style.display = 'flex';
                modal.style.opacity = '0';

                const backdrop = modal.querySelector('.modal-backdrop, .backdrop');
                const content = modal.querySelector('.modal-content, .modal-dialog, .dialog-content');

                const promises = [];

                // Animate backdrop
                if (backdrop) {
                    backdrop.style.opacity = '0';
                    promises.push(this.animate(backdrop, 'fadeIn', {
                        duration: this.settings.normal
                    }));
                }

                // Animate content
                if (content) {
                    content.style.transform = 'scale(0.8) translateY(-20px)';
                    content.style.opacity = '0';
                    promises.push(this.animate(content, {
                        transform: ['scale(0.8) translateY(-20px)', 'scale(1) translateY(0)'],
                        opacity: [0, 1]
                    }, {
                        duration: this.settings.normal,
                        delay: this.settings.fast,
                        easing: this.settings.bounce
                    }));
                }

                // Animate modal container
                promises.push(this.animate(modal, 'fadeIn', {
                    duration: this.settings.normal
                }));

                return Promise.all(promises);

            case 'close':
                const closeBackdrop = modal.querySelector('.modal-backdrop, .backdrop');
                const closeContent = modal.querySelector('.modal-content, .modal-dialog, .dialog-content');

                const closePromises = [];

                // Animate content out first
                if (closeContent) {
                    closePromises.push(this.animate(closeContent, {
                        transform: ['scale(1) translateY(0)', 'scale(0.8) translateY(-20px)'],
                        opacity: [1, 0]
                    }, {
                        duration: this.settings.fast,
                        easing: this.settings.easeIn
                    }));
                }

                // Animate backdrop
                if (closeBackdrop) {
                    closePromises.push(this.animate(closeBackdrop, 'fadeOut', {
                        duration: this.settings.normal,
                        delay: this.settings.fast * 0.5
                    }));
                }

                // Animate modal container
                closePromises.push(this.animate(modal, 'fadeOut', {
                    duration: this.settings.normal,
                    delay: this.settings.fast * 0.5
                }));

                return Promise.all(closePromises).then(() => {
                    modal.style.display = 'none';
                });
        }

        return Promise.resolve();
    }

    /**
     * Animate progress indicators
     */
    animateProgress(progressBar, fromValue, toValue, duration) {
        if (!progressBar) return Promise.resolve();

        const actualDuration = duration || this.settings.slow;

        return this.animate(progressBar, {
            width: [`${fromValue}%`, `${toValue}%`]
        }, {
            duration: actualDuration,
            easing: this.settings.easeInOut
        });
    }

    /**
     * Animate toast notifications
     */
    animateToast(toast, action) {
        if (!toast) return Promise.resolve();

        switch (action) {
            case 'show':
                toast.style.transform = 'translateY(100%)';
                toast.style.opacity = '0';

                return this.animate(toast, {
                    transform: ['translateY(100%)', 'translateY(0)'],
                    opacity: [0, 1]
                }, {
                    duration: this.settings.normal,
                    easing: this.settings.easeOut
                });

            case 'hide':
                return this.animate(toast, {
                    transform: ['translateY(0)', 'translateY(100%)'],
                    opacity: [1, 0]
                }, {
                    duration: this.settings.normal,
                    easing: this.settings.easeIn
                });
        }

        return Promise.resolve();
    }

    /**
     * Destroy animation system
     */
    destroy() {
        this.cancelAllAnimations();

        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }

        if (this.visibilityObserver) {
            document.removeEventListener('visibilitychange', this.visibilityObserver);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimatedTransitions;
} else if (typeof window !== 'undefined') {
    window.AnimatedTransitions = AnimatedTransitions;
}
