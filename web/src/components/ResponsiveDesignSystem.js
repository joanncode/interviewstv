/**
 * Responsive Design System
 * Comprehensive responsive design framework for all devices
 */
class ResponsiveDesignSystem {
    constructor(options = {}) {
        this.container = options.container || document.body;
        this.streamingInterface = options.streamingInterface || null;
        this.controlPanels = options.controlPanels || null;
        this.animationSystem = options.animationSystem || null;
        
        // Responsive breakpoints (mobile-first approach)
        this.breakpoints = {
            xs: 320,    // Extra small devices (small phones)
            sm: 480,    // Small devices (phones)
            md: 768,    // Medium devices (tablets)
            lg: 1024,   // Large devices (desktops)
            xl: 1200,   // Extra large devices (large desktops)
            xxl: 1400   // Extra extra large devices (ultra-wide)
        };
        
        // Device detection
        this.device = {
            type: 'desktop',        // 'mobile', 'tablet', 'desktop'
            orientation: 'landscape', // 'portrait', 'landscape'
            touchSupported: false,
            pixelRatio: 1,
            width: 0,
            height: 0,
            isIOS: false,
            isAndroid: false,
            isSafari: false,
            isChrome: false
        };
        
        // Responsive settings
        this.settings = {
            // Layout settings
            adaptiveLayout: true,
            fluidTypography: true,
            responsiveImages: true,
            adaptiveNavigation: true,
            
            // Touch settings
            touchOptimization: true,
            gestureSupport: true,
            hapticFeedback: false,
            
            // Performance settings
            lazyLoading: true,
            adaptiveQuality: true,
            bandwidthOptimization: true,
            
            // Accessibility settings
            scalableText: true,
            highContrastMode: false,
            reducedMotion: false,
            
            // Mobile-specific
            virtualKeyboardHandling: true,
            orientationLocking: false,
            statusBarHandling: true,
            
            ...options.settings
        };
        
        // Responsive utilities
        this.utils = {
            debounceTimer: null,
            resizeObserver: null,
            orientationChangeTimer: null,
            keyboardVisible: false,
            fullscreenActive: false
        };
        
        // CSS custom properties for responsive design
        this.cssProperties = {
            '--viewport-width': '100vw',
            '--viewport-height': '100vh',
            '--safe-area-top': '0px',
            '--safe-area-bottom': '0px',
            '--safe-area-left': '0px',
            '--safe-area-right': '0px',
            '--keyboard-height': '0px',
            '--device-pixel-ratio': '1',
            '--touch-target-size': '44px',
            '--container-padding': '16px',
            '--border-radius': '8px',
            '--font-scale': '1'
        };
        
        this.init();
    }
    
    /**
     * Initialize responsive design system
     */
    init() {
        this.detectDevice();
        this.setupEventListeners();
        this.setupResizeObserver();
        this.applyResponsiveClasses();
        this.updateCSSProperties();
        this.optimizeForDevice();
        this.injectResponsiveCSS();
        
        // Initial responsive adjustments
        this.handleResize();
        this.handleOrientationChange();
    }
    
    /**
     * Detect device capabilities and characteristics
     */
    detectDevice() {
        const userAgent = navigator.userAgent;
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Device type detection
        if (width <= this.breakpoints.sm) {
            this.device.type = 'mobile';
        } else if (width <= this.breakpoints.lg) {
            this.device.type = 'tablet';
        } else {
            this.device.type = 'desktop';
        }
        
        // Orientation detection
        this.device.orientation = width > height ? 'landscape' : 'portrait';
        
        // Touch support detection
        this.device.touchSupported = 'ontouchstart' in window || 
                                   navigator.maxTouchPoints > 0 || 
                                   navigator.msMaxTouchPoints > 0;
        
        // Device pixel ratio
        this.device.pixelRatio = window.devicePixelRatio || 1;
        
        // Viewport dimensions
        this.device.width = width;
        this.device.height = height;
        
        // Platform detection
        this.device.isIOS = /iPad|iPhone|iPod/.test(userAgent);
        this.device.isAndroid = /Android/.test(userAgent);
        this.device.isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
        this.device.isChrome = /Chrome/.test(userAgent);
        
        // Haptic feedback support
        this.device.hapticSupported = 'vibrate' in navigator;
        
        // Safe area support (for notched devices)
        this.device.safeAreaSupported = CSS.supports('padding: env(safe-area-inset-top)');
    }
    
    /**
     * Setup event listeners for responsive behavior
     */
    setupEventListeners() {
        // Window resize with debouncing
        window.addEventListener('resize', () => {
            clearTimeout(this.utils.debounceTimer);
            this.utils.debounceTimer = setTimeout(() => {
                this.handleResize();
            }, 150);
        });
        
        // Orientation change
        window.addEventListener('orientationchange', () => {
            clearTimeout(this.utils.orientationChangeTimer);
            this.utils.orientationChangeTimer = setTimeout(() => {
                this.handleOrientationChange();
            }, 300);
        });
        
        // Visual Viewport API for keyboard handling
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                this.handleVisualViewportChange();
            });
        }
        
        // Fullscreen changes
        document.addEventListener('fullscreenchange', () => {
            this.handleFullscreenChange();
        });
        
        // Touch events for haptic feedback
        if (this.settings.hapticFeedback && this.device.hapticSupported) {
            this.setupHapticFeedback();
        }
        
        // Keyboard events for accessibility
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardNavigation(e);
        });
        
        // Focus events for touch optimization
        document.addEventListener('focusin', (e) => {
            this.handleFocusIn(e);
        });
        
        document.addEventListener('focusout', (e) => {
            this.handleFocusOut(e);
        });
    }
    
    /**
     * Setup ResizeObserver for container-based responsive behavior
     */
    setupResizeObserver() {
        if ('ResizeObserver' in window) {
            this.utils.resizeObserver = new ResizeObserver((entries) => {
                entries.forEach(entry => {
                    this.handleContainerResize(entry);
                });
            });
            
            this.utils.resizeObserver.observe(this.container);
        }
    }
    
    /**
     * Apply responsive classes to container
     */
    applyResponsiveClasses() {
        const classes = [
            'responsive-design-system',
            `device-${this.device.type}`,
            `orientation-${this.device.orientation}`,
            this.device.touchSupported ? 'touch-device' : 'no-touch',
            this.device.isIOS ? 'ios-device' : '',
            this.device.isAndroid ? 'android-device' : '',
            this.device.pixelRatio > 1 ? 'high-dpi' : 'standard-dpi'
        ].filter(Boolean);
        
        this.container.classList.add(...classes);
        
        // Add breakpoint classes
        Object.entries(this.breakpoints).forEach(([name, width]) => {
            if (this.device.width >= width) {
                this.container.classList.add(`bp-${name}`);
            } else {
                this.container.classList.remove(`bp-${name}`);
            }
        });
    }
    
    /**
     * Update CSS custom properties
     */
    updateCSSProperties() {
        const root = document.documentElement;
        
        // Update viewport dimensions
        this.cssProperties['--viewport-width'] = `${this.device.width}px`;
        this.cssProperties['--viewport-height'] = `${this.device.height}px`;
        this.cssProperties['--device-pixel-ratio'] = this.device.pixelRatio.toString();
        
        // Update safe area insets for notched devices
        if (this.device.safeAreaSupported) {
            this.cssProperties['--safe-area-top'] = 'env(safe-area-inset-top)';
            this.cssProperties['--safe-area-bottom'] = 'env(safe-area-inset-bottom)';
            this.cssProperties['--safe-area-left'] = 'env(safe-area-inset-left)';
            this.cssProperties['--safe-area-right'] = 'env(safe-area-inset-right)';
        }
        
        // Update touch target size based on device
        if (this.device.type === 'mobile') {
            this.cssProperties['--touch-target-size'] = '48px';
            this.cssProperties['--container-padding'] = '12px';
            this.cssProperties['--border-radius'] = '6px';
        } else if (this.device.type === 'tablet') {
            this.cssProperties['--touch-target-size'] = '44px';
            this.cssProperties['--container-padding'] = '16px';
            this.cssProperties['--border-radius'] = '8px';
        } else {
            this.cssProperties['--touch-target-size'] = '32px';
            this.cssProperties['--container-padding'] = '20px';
            this.cssProperties['--border-radius'] = '12px';
        }
        
        // Update font scale for accessibility
        const fontScale = this.calculateFontScale();
        this.cssProperties['--font-scale'] = fontScale.toString();
        
        // Apply all properties
        Object.entries(this.cssProperties).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });
    }
    
    /**
     * Calculate font scale based on device and user preferences
     */
    calculateFontScale() {
        let scale = 1;
        
        // Base scale adjustments for device type
        if (this.device.type === 'mobile') {
            scale = 0.9;
        } else if (this.device.type === 'tablet') {
            scale = 0.95;
        }
        
        // Adjust for high DPI displays
        if (this.device.pixelRatio > 2) {
            scale *= 1.05;
        }
        
        // Respect user's font size preferences
        if (this.settings.scalableText) {
            const userFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
            const baseFontSize = 16; // Default browser font size
            scale *= (userFontSize / baseFontSize);
        }
        
        return Math.max(0.8, Math.min(1.5, scale));
    }
    
    /**
     * Optimize interface for current device
     */
    optimizeForDevice() {
        if (this.device.type === 'mobile') {
            this.optimizeForMobile();
        } else if (this.device.type === 'tablet') {
            this.optimizeForTablet();
        } else {
            this.optimizeForDesktop();
        }
        
        // Apply touch optimizations
        if (this.device.touchSupported && this.settings.touchOptimization) {
            this.optimizeForTouch();
        }
        
        // Apply performance optimizations
        if (this.settings.adaptiveQuality) {
            this.optimizePerformance();
        }
    }
    
    /**
     * Mobile-specific optimizations
     */
    optimizeForMobile() {
        this.container.classList.add('mobile-optimized');
        
        // Reduce animations on mobile for better performance
        if (this.animationSystem && this.device.type === 'mobile') {
            this.animationSystem.enableLowPerformanceMode();
        }
        
        // Enable lazy loading
        if (this.settings.lazyLoading) {
            this.enableLazyLoading();
        }
        
        // Optimize scrolling
        this.optimizeScrolling();
        
        // Handle virtual keyboard
        if (this.settings.virtualKeyboardHandling) {
            this.setupVirtualKeyboardHandling();
        }
    }
    
    /**
     * Tablet-specific optimizations
     */
    optimizeForTablet() {
        this.container.classList.add('tablet-optimized');
        
        // Balanced performance mode
        if (this.animationSystem) {
            this.animationSystem.updateSettings({
                maxConcurrentAnimations: 8,
                fast: 120,
                normal: 200
            });
        }
    }
    
    /**
     * Desktop-specific optimizations
     */
    optimizeForDesktop() {
        this.container.classList.add('desktop-optimized');
        
        // Enable high performance mode
        if (this.animationSystem) {
            this.animationSystem.enableHighPerformanceMode();
        }
        
        // Enable advanced features
        this.enableAdvancedFeatures();
    }
    
    /**
     * Touch-specific optimizations
     */
    optimizeForTouch() {
        this.container.classList.add('touch-optimized');
        
        // Increase touch target sizes
        this.increaseTouchTargets();
        
        // Add touch feedback
        this.addTouchFeedback();
        
        // Setup gesture support
        if (this.settings.gestureSupport) {
            this.setupGestureSupport();
        }
    }
    
    /**
     * Performance optimizations
     */
    optimizePerformance() {
        // Reduce quality on slower devices
        if (this.device.type === 'mobile' || this.device.pixelRatio < 2) {
            this.container.classList.add('reduced-quality');
        }
        
        // Enable hardware acceleration
        this.enableHardwareAcceleration();
        
        // Optimize images
        if (this.settings.responsiveImages) {
            this.optimizeImages();
        }
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        const oldDevice = { ...this.device };
        
        this.detectDevice();
        this.updateCSSProperties();
        
        // Check if device type changed
        if (oldDevice.type !== this.device.type) {
            this.applyResponsiveClasses();
            this.optimizeForDevice();
        }
        
        // Notify components of resize
        this.notifyResize();
    }
    
    /**
     * Handle orientation change
     */
    handleOrientationChange() {
        const oldOrientation = this.device.orientation;
        
        this.detectDevice();
        this.updateCSSProperties();
        this.applyResponsiveClasses();
        
        // Handle orientation-specific adjustments
        if (oldOrientation !== this.device.orientation) {
            this.handleOrientationSpecificChanges();
        }
        
        // Notify components of orientation change
        this.notifyOrientationChange();
    }
    
    /**
     * Handle visual viewport changes (keyboard, etc.)
     */
    handleVisualViewportChange() {
        if (!window.visualViewport) return;
        
        const viewport = window.visualViewport;
        const keyboardHeight = window.innerHeight - viewport.height;
        
        this.utils.keyboardVisible = keyboardHeight > 100;
        
        // Update keyboard height CSS property
        document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
        
        // Add/remove keyboard visible class
        if (this.utils.keyboardVisible) {
            this.container.classList.add('keyboard-visible');
        } else {
            this.container.classList.remove('keyboard-visible');
        }
        
        // Notify components of keyboard state change
        this.notifyKeyboardChange(this.utils.keyboardVisible, keyboardHeight);
    }
    
    /**
     * Handle fullscreen changes
     */
    handleFullscreenChange() {
        this.utils.fullscreenActive = !!document.fullscreenElement;
        
        if (this.utils.fullscreenActive) {
            this.container.classList.add('fullscreen-active');
        } else {
            this.container.classList.remove('fullscreen-active');
        }
        
        // Update viewport dimensions
        this.detectDevice();
        this.updateCSSProperties();
    }
    
    /**
     * Handle container resize
     */
    handleContainerResize(entry) {
        const { width, height } = entry.contentRect;
        
        // Update container-specific responsive behavior
        this.updateContainerResponsiveness(width, height);
    }
    
    /**
     * Update container-specific responsive behavior
     */
    updateContainerResponsiveness(width, height) {
        // Add container size classes
        const containerClasses = [];
        
        if (width < this.breakpoints.sm) {
            containerClasses.push('container-xs');
        } else if (width < this.breakpoints.md) {
            containerClasses.push('container-sm');
        } else if (width < this.breakpoints.lg) {
            containerClasses.push('container-md');
        } else if (width < this.breakpoints.xl) {
            containerClasses.push('container-lg');
        } else {
            containerClasses.push('container-xl');
        }
        
        // Remove old container classes
        this.container.classList.remove('container-xs', 'container-sm', 'container-md', 'container-lg', 'container-xl');
        
        // Add new container classes
        this.container.classList.add(...containerClasses);
    }
    
    /**
     * Setup haptic feedback
     */
    setupHapticFeedback() {
        this.container.addEventListener('click', (e) => {
            if (e.target.matches('button, .btn, .control-btn, .header-btn')) {
                this.triggerHapticFeedback('light');
            }
        });
        
        this.container.addEventListener('touchstart', (e) => {
            if (e.target.matches('.important-action, .danger-action')) {
                this.triggerHapticFeedback('medium');
            }
        });
    }
    
    /**
     * Trigger haptic feedback
     */
    triggerHapticFeedback(intensity = 'light') {
        if (!this.device.hapticSupported) return;
        
        const patterns = {
            light: 10,
            medium: 50,
            heavy: 100
        };
        
        navigator.vibrate(patterns[intensity] || patterns.light);
    }
    
    /**
     * Setup gesture support
     */
    setupGestureSupport() {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;
        
        this.container.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        });
        
        this.container.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            
            this.handleGesture(touchStartX, touchStartY, touchEndX, touchEndY);
        });
    }
    
    /**
     * Handle gesture recognition
     */
    handleGesture(startX, startY, endX, endY) {
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const minSwipeDistance = 50;
        
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe
            if (Math.abs(deltaX) > minSwipeDistance) {
                if (deltaX > 0) {
                    this.handleSwipeRight();
                } else {
                    this.handleSwipeLeft();
                }
            }
        } else {
            // Vertical swipe
            if (Math.abs(deltaY) > minSwipeDistance) {
                if (deltaY > 0) {
                    this.handleSwipeDown();
                } else {
                    this.handleSwipeUp();
                }
            }
        }
    }
    
    /**
     * Handle swipe gestures
     */
    handleSwipeLeft() {
        // Navigate to next panel or close sidebar
        this.notifyGesture('swipe-left');
    }
    
    handleSwipeRight() {
        // Navigate to previous panel or open sidebar
        this.notifyGesture('swipe-right');
    }
    
    handleSwipeUp() {
        // Scroll up or minimize interface
        this.notifyGesture('swipe-up');
    }
    
    handleSwipeDown() {
        // Scroll down or expand interface
        this.notifyGesture('swipe-down');
    }
    
    /**
     * Notification methods for component integration
     */
    notifyResize() {
        const event = new CustomEvent('responsive-resize', {
            detail: {
                device: this.device,
                breakpoints: this.breakpoints
            }
        });
        this.container.dispatchEvent(event);
    }
    
    notifyOrientationChange() {
        const event = new CustomEvent('responsive-orientation-change', {
            detail: {
                orientation: this.device.orientation,
                device: this.device
            }
        });
        this.container.dispatchEvent(event);
    }
    
    notifyKeyboardChange(visible, height) {
        const event = new CustomEvent('responsive-keyboard-change', {
            detail: {
                visible,
                height,
                device: this.device
            }
        });
        this.container.dispatchEvent(event);
    }
    
    notifyGesture(type) {
        const event = new CustomEvent('responsive-gesture', {
            detail: {
                type,
                device: this.device
            }
        });
        this.container.dispatchEvent(event);
    }
    
    /**
     * Utility methods
     */
    enableLazyLoading() {
        if ('IntersectionObserver' in window) {
            const lazyImages = this.container.querySelectorAll('img[data-src]');
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                });
            });
            
            lazyImages.forEach(img => imageObserver.observe(img));
        }
    }
    
    optimizeScrolling() {
        const scrollableElements = this.container.querySelectorAll('.scrollable, .overflow-auto, .overflow-y-auto');
        
        scrollableElements.forEach(element => {
            element.style.webkitOverflowScrolling = 'touch';
            element.style.overflowScrolling = 'touch';
        });
    }
    
    setupVirtualKeyboardHandling() {
        // Already handled in handleVisualViewportChange
        // This method can be extended for additional keyboard handling
    }
    
    enableAdvancedFeatures() {
        this.container.classList.add('advanced-features-enabled');
        
        // Enable advanced CSS features
        if (CSS.supports('backdrop-filter', 'blur(10px)')) {
            this.container.classList.add('backdrop-filter-supported');
        }
        
        if (CSS.supports('display', 'grid')) {
            this.container.classList.add('css-grid-supported');
        }
    }
    
    increaseTouchTargets() {
        const touchTargets = this.container.querySelectorAll('button, .btn, a, input, select, textarea');
        
        touchTargets.forEach(target => {
            target.classList.add('touch-target');
        });
    }
    
    addTouchFeedback() {
        this.container.addEventListener('touchstart', (e) => {
            if (e.target.matches('button, .btn, .control-btn, .header-btn')) {
                e.target.classList.add('touch-active');
            }
        });
        
        this.container.addEventListener('touchend', (e) => {
            if (e.target.matches('button, .btn, .control-btn, .header-btn')) {
                setTimeout(() => {
                    e.target.classList.remove('touch-active');
                }, 150);
            }
        });
    }
    
    enableHardwareAcceleration() {
        const acceleratedElements = this.container.querySelectorAll('.animate, .transition, .transform');
        
        acceleratedElements.forEach(element => {
            element.style.willChange = 'transform, opacity';
            element.style.transform = 'translateZ(0)';
        });
    }
    
    optimizeImages() {
        const images = this.container.querySelectorAll('img');
        
        images.forEach(img => {
            // Add responsive image attributes
            if (!img.hasAttribute('loading')) {
                img.setAttribute('loading', 'lazy');
            }
            
            // Add responsive sizing
            if (!img.hasAttribute('sizes')) {
                img.setAttribute('sizes', '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw');
            }
        });
    }
    
    handleKeyboardNavigation(e) {
        // Handle keyboard navigation for accessibility
        if (e.key === 'Tab') {
            this.container.classList.add('keyboard-navigation');
        }
    }
    
    handleFocusIn(e) {
        // Handle focus for touch optimization
        if (this.device.touchSupported && e.target.matches('input, textarea, select')) {
            e.target.classList.add('touch-focused');
        }
    }
    
    handleFocusOut(e) {
        // Handle focus out
        if (e.target.matches('input, textarea, select')) {
            e.target.classList.remove('touch-focused');
        }
    }
    
    handleOrientationSpecificChanges() {
        // Handle orientation-specific UI adjustments
        if (this.device.orientation === 'landscape' && this.device.type === 'mobile') {
            this.container.classList.add('mobile-landscape');
        } else {
            this.container.classList.remove('mobile-landscape');
        }
    }
    
    /**
     * Public API methods
     */
    getDevice() {
        return { ...this.device };
    }
    
    getBreakpoints() {
        return { ...this.breakpoints };
    }
    
    isBreakpoint(breakpoint) {
        return this.device.width >= this.breakpoints[breakpoint];
    }
    
    isMobile() {
        return this.device.type === 'mobile';
    }
    
    isTablet() {
        return this.device.type === 'tablet';
    }
    
    isDesktop() {
        return this.device.type === 'desktop';
    }
    
    isTouchDevice() {
        return this.device.touchSupported;
    }
    
    isLandscape() {
        return this.device.orientation === 'landscape';
    }
    
    isPortrait() {
        return this.device.orientation === 'portrait';
    }
    
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.optimizeForDevice();
    }
    
    setStreamingInterface(streamingInterface) {
        this.streamingInterface = streamingInterface;
    }
    
    setControlPanels(controlPanels) {
        this.controlPanels = controlPanels;
    }
    
    setAnimationSystem(animationSystem) {
        this.animationSystem = animationSystem;
    }
    
    /**
     * Inject responsive CSS
     */
    injectResponsiveCSS() {
        const css = `
            /* Responsive Design System Base Styles */
            .responsive-design-system {
                --responsive-transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            /* Touch targets */
            .touch-target {
                min-height: var(--touch-target-size);
                min-width: var(--touch-target-size);
                position: relative;
            }
            
            .touch-active {
                transform: scale(0.95);
                opacity: 0.8;
                transition: all 0.1s ease;
            }
            
            .touch-focused {
                outline: 2px solid var(--primary-color, #FF0000);
                outline-offset: 2px;
            }
            
            /* Keyboard navigation */
            .keyboard-navigation *:focus {
                outline: 2px solid var(--primary-color, #FF0000);
                outline-offset: 2px;
            }
            
            /* Device-specific styles */
            .mobile-optimized {
                font-size: calc(1rem * var(--font-scale));
            }
            
            .tablet-optimized {
                font-size: calc(1rem * var(--font-scale));
            }
            
            .desktop-optimized {
                font-size: calc(1rem * var(--font-scale));
            }
            
            /* Orientation-specific styles */
            .mobile-landscape {
                --container-padding: 8px;
            }
            
            /* Keyboard visible adjustments */
            .keyboard-visible {
                padding-bottom: var(--keyboard-height);
            }
            
            /* Fullscreen adjustments */
            .fullscreen-active {
                padding: var(--safe-area-top) var(--safe-area-right) var(--safe-area-bottom) var(--safe-area-left);
            }
            
            /* High DPI optimizations */
            .high-dpi img {
                image-rendering: -webkit-optimize-contrast;
                image-rendering: crisp-edges;
            }
            
            /* Reduced quality mode */
            .reduced-quality * {
                box-shadow: none !important;
                text-shadow: none !important;
                filter: none !important;
            }
            
            /* Hardware acceleration */
            .animate,
            .transition,
            .transform {
                will-change: transform, opacity;
                transform: translateZ(0);
            }
            
            /* Responsive utilities */
            .hide-mobile { display: block; }
            .hide-tablet { display: block; }
            .hide-desktop { display: block; }
            .show-mobile { display: none; }
            .show-tablet { display: none; }
            .show-desktop { display: none; }
            
            @media (max-width: 767px) {
                .hide-mobile { display: none !important; }
                .show-mobile { display: block !important; }
            }
            
            @media (min-width: 768px) and (max-width: 1023px) {
                .hide-tablet { display: none !important; }
                .show-tablet { display: block !important; }
            }
            
            @media (min-width: 1024px) {
                .hide-desktop { display: none !important; }
                .show-desktop { display: block !important; }
            }
            
            /* Accessibility */
            @media (prefers-reduced-motion: reduce) {
                .responsive-design-system * {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                }
            }
            
            @media (prefers-contrast: high) {
                .responsive-design-system {
                    --border-color: #000000;
                    --text-color: #000000;
                    --background-color: #ffffff;
                }
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = css;
        document.head.appendChild(styleSheet);
    }
    
    /**
     * Destroy responsive design system
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('orientationchange', this.handleOrientationChange);
        
        if (window.visualViewport) {
            window.visualViewport.removeEventListener('resize', this.handleVisualViewportChange);
        }
        
        // Disconnect observers
        if (this.utils.resizeObserver) {
            this.utils.resizeObserver.disconnect();
        }
        
        // Clear timers
        clearTimeout(this.utils.debounceTimer);
        clearTimeout(this.utils.orientationChangeTimer);
        
        // Remove classes
        if (this.container) {
            this.container.classList.remove(
                'responsive-design-system',
                'device-mobile', 'device-tablet', 'device-desktop',
                'orientation-portrait', 'orientation-landscape',
                'touch-device', 'no-touch',
                'ios-device', 'android-device',
                'high-dpi', 'standard-dpi',
                'mobile-optimized', 'tablet-optimized', 'desktop-optimized',
                'touch-optimized', 'keyboard-visible', 'fullscreen-active'
            );
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResponsiveDesignSystem;
} else if (typeof window !== 'undefined') {
    window.ResponsiveDesignSystem = ResponsiveDesignSystem;
}
