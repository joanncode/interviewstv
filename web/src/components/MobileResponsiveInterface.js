/**
 * Mobile Responsive Interface
 * Comprehensive mobile optimization and responsive design for chat
 */
class MobileResponsiveInterface {
    constructor(options = {}) {
        this.websocket = options.websocket || null;
        this.currentUserId = options.currentUserId || null;
        this.currentUserRole = options.currentUserRole || 'guest';
        this.roomId = options.roomId || 'default';
        this.container = options.container || null;
        this.onOrientationChange = options.onOrientationChange || (() => {});
        this.onViewportChange = options.onViewportChange || (() => {});
        this.onTouchInteraction = options.onTouchInteraction || (() => {});
        
        // Mobile state
        this.isMobile = false;
        this.isTablet = false;
        this.isLandscape = false;
        this.viewportWidth = 0;
        this.viewportHeight = 0;
        this.devicePixelRatio = 1;
        this.touchSupported = false;
        
        // Mobile UI elements
        this.mobileHeader = null;
        this.mobileToolbar = null;
        this.mobileKeyboard = null;
        this.swipeHandler = null;
        
        // Responsive breakpoints
        this.breakpoints = {
            mobile: 480,
            tablet: 768,
            desktop: 1024,
            large: 1200
        };
        
        // Mobile settings
        this.settings = {
            // Layout settings
            mobileLayout: 'adaptive', // 'adaptive', 'mobile-first', 'desktop-like'
            compactMode: true,
            hideSecondaryElements: true,
            collapsibleSidebar: true,
            
            // Touch settings
            touchOptimized: true,
            swipeGestures: true,
            tapToExpand: true,
            longPressActions: true,
            
            // Keyboard settings
            virtualKeyboardHandling: true,
            autoResizeOnKeyboard: true,
            keyboardPadding: 20,
            
            // Performance settings
            lazyLoadMessages: true,
            reducedAnimations: false,
            optimizedScrolling: true,
            touchFeedback: true,
            
            // Accessibility settings
            largerTouchTargets: true,
            enhancedContrast: false,
            simplifiedNavigation: true,
            voiceOverOptimized: true,
            
            ...options.settings
        };
        
        // Touch gesture handlers
        this.gestureHandlers = {
            swipeLeft: null,
            swipeRight: null,
            swipeUp: null,
            swipeDown: null,
            pinchZoom: null,
            doubleTap: null,
            longPress: null
        };
        
        // Mobile-specific features
        this.features = {
            pullToRefresh: false,
            infiniteScroll: true,
            hapticFeedback: false,
            orientationLock: false,
            fullscreenMode: false
        };
        
        this.init();
    }
    
    /**
     * Initialize mobile responsive interface
     */
    init() {
        this.detectDevice();
        this.setupViewportHandling();
        this.setupTouchHandling();
        this.setupKeyboardHandling();
        this.setupOrientationHandling();
        
        if (this.container) {
            this.createMobileInterface();
            this.attachEventListeners();
            this.applyMobileOptimizations();
        }
        
        this.loadMobileSettings();
        
        if (this.websocket) {
            this.attachWebSocketListeners();
        }
    }
    
    /**
     * Detect device type and capabilities
     */
    detectDevice() {
        // Detect mobile/tablet
        this.isMobile = window.innerWidth <= this.breakpoints.mobile;
        this.isTablet = window.innerWidth > this.breakpoints.mobile && window.innerWidth <= this.breakpoints.tablet;
        
        // Detect touch support
        this.touchSupported = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        // Detect device pixel ratio
        this.devicePixelRatio = window.devicePixelRatio || 1;
        
        // Detect orientation
        this.isLandscape = window.innerWidth > window.innerHeight;
        
        // Store viewport dimensions
        this.viewportWidth = window.innerWidth;
        this.viewportHeight = window.innerHeight;
        
        // Detect specific mobile features
        this.features.hapticFeedback = 'vibrate' in navigator;
        this.features.orientationLock = 'orientation' in screen;
        this.features.fullscreenMode = 'requestFullscreen' in document.documentElement;
        
        console.log('Device detected:', {
            isMobile: this.isMobile,
            isTablet: this.isTablet,
            touchSupported: this.touchSupported,
            devicePixelRatio: this.devicePixelRatio,
            isLandscape: this.isLandscape,
            viewport: { width: this.viewportWidth, height: this.viewportHeight }
        });
    }
    
    /**
     * Setup viewport handling
     */
    setupViewportHandling() {
        // Add viewport meta tag if not present
        let viewportMeta = document.querySelector('meta[name="viewport"]');
        if (!viewportMeta) {
            viewportMeta = document.createElement('meta');
            viewportMeta.name = 'viewport';
            document.head.appendChild(viewportMeta);
        }
        
        // Set optimal viewport settings
        viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover';
        
        // Handle viewport changes
        window.addEventListener('resize', () => this.handleViewportChange());
        window.addEventListener('orientationchange', () => this.handleOrientationChange());
        
        // Handle visual viewport API if available
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => this.handleVisualViewportChange());
            window.visualViewport.addEventListener('scroll', () => this.handleVisualViewportScroll());
        }
    }
    
    /**
     * Setup touch handling
     */
    setupTouchHandling() {
        if (!this.touchSupported) return;
        
        // Touch event variables
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;
        let touchMoved = false;
        let longPressTimer = null;
        
        // Touch start handler
        const handleTouchStart = (e) => {
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchStartTime = Date.now();
            touchMoved = false;
            
            // Setup long press detection
            if (this.settings.longPressActions) {
                longPressTimer = setTimeout(() => {
                    if (!touchMoved) {
                        this.handleLongPress(e);
                    }
                }, 500);
            }
            
            this.onTouchInteraction('touchstart', e);
        };
        
        // Touch move handler
        const handleTouchMove = (e) => {
            touchMoved = true;
            
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
            
            this.onTouchInteraction('touchmove', e);
        };
        
        // Touch end handler
        const handleTouchEnd = (e) => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
            
            const touch = e.changedTouches[0];
            const touchEndX = touch.clientX;
            const touchEndY = touch.clientY;
            const touchDuration = Date.now() - touchStartTime;
            
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            // Detect swipe gestures
            if (this.settings.swipeGestures && distance > 50 && touchDuration < 300) {
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    // Horizontal swipe
                    if (deltaX > 0) {
                        this.handleSwipe('right', e);
                    } else {
                        this.handleSwipe('left', e);
                    }
                } else {
                    // Vertical swipe
                    if (deltaY > 0) {
                        this.handleSwipe('down', e);
                    } else {
                        this.handleSwipe('up', e);
                    }
                }
            }
            
            // Detect tap
            if (distance < 10 && touchDuration < 300) {
                this.handleTap(e);
            }
            
            this.onTouchInteraction('touchend', e);
        };
        
        // Attach touch event listeners
        if (this.container) {
            this.container.addEventListener('touchstart', handleTouchStart, { passive: false });
            this.container.addEventListener('touchmove', handleTouchMove, { passive: false });
            this.container.addEventListener('touchend', handleTouchEnd, { passive: false });
        }
    }
    
    /**
     * Setup keyboard handling
     */
    setupKeyboardHandling() {
        if (!this.settings.virtualKeyboardHandling) return;
        
        // Handle virtual keyboard show/hide
        const handleKeyboardShow = () => {
            if (this.container) {
                this.container.classList.add('keyboard-visible');
                
                if (this.settings.autoResizeOnKeyboard) {
                    this.adjustForKeyboard(true);
                }
            }
        };
        
        const handleKeyboardHide = () => {
            if (this.container) {
                this.container.classList.remove('keyboard-visible');
                
                if (this.settings.autoResizeOnKeyboard) {
                    this.adjustForKeyboard(false);
                }
            }
        };
        
        // Detect keyboard visibility changes
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                const heightDifference = window.innerHeight - window.visualViewport.height;
                
                if (heightDifference > 150) {
                    handleKeyboardShow();
                } else {
                    handleKeyboardHide();
                }
            });
        } else {
            // Fallback for older browsers
            let initialViewportHeight = window.innerHeight;
            
            window.addEventListener('resize', () => {
                const currentHeight = window.innerHeight;
                const heightDifference = initialViewportHeight - currentHeight;
                
                if (heightDifference > 150) {
                    handleKeyboardShow();
                } else {
                    handleKeyboardHide();
                    initialViewportHeight = currentHeight;
                }
            });
        }
    }
    
    /**
     * Setup orientation handling
     */
    setupOrientationHandling() {
        const handleOrientationChange = () => {
            setTimeout(() => {
                this.detectDevice();
                this.applyOrientationOptimizations();
                this.onOrientationChange(this.isLandscape);
            }, 100);
        };
        
        // Listen for orientation changes
        window.addEventListener('orientationchange', handleOrientationChange);
        screen.orientation?.addEventListener('change', handleOrientationChange);
    }
    
    /**
     * Create mobile interface elements
     */
    createMobileInterface() {
        if (this.isMobile || this.isTablet) {
            this.createMobileHeader();
            this.createMobileToolbar();
            this.createSwipeIndicators();
            this.applyMobileClasses();
        }
    }
    
    /**
     * Create mobile header
     */
    createMobileHeader() {
        const existingHeader = this.container.querySelector('.mobile-header');
        if (existingHeader) return;
        
        this.mobileHeader = document.createElement('div');
        this.mobileHeader.className = 'mobile-header';
        this.mobileHeader.innerHTML = `
            <div class="mobile-header-content">
                <button class="mobile-menu-btn" id="mobile-menu-btn">
                    <i class="fas fa-bars"></i>
                </button>
                <div class="mobile-title">
                    <span>Live Chat</span>
                    <div class="mobile-status">
                        <span class="user-count">0 users</span>
                        <div class="connection-indicator"></div>
                    </div>
                </div>
                <button class="mobile-options-btn" id="mobile-options-btn">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            </div>
        `;
        
        // Insert at the beginning of container
        this.container.insertBefore(this.mobileHeader, this.container.firstChild);
    }
    
    /**
     * Create mobile toolbar
     */
    createMobileToolbar() {
        const existingToolbar = this.container.querySelector('.mobile-toolbar');
        if (existingToolbar) return;
        
        this.mobileToolbar = document.createElement('div');
        this.mobileToolbar.className = 'mobile-toolbar';
        this.mobileToolbar.innerHTML = `
            <div class="mobile-toolbar-content">
                <button class="mobile-tool-btn" id="mobile-emoji-btn" title="Emojis">
                    <i class="fas fa-smile"></i>
                </button>
                <button class="mobile-tool-btn" id="mobile-attach-btn" title="Attach">
                    <i class="fas fa-paperclip"></i>
                </button>
                <button class="mobile-tool-btn" id="mobile-camera-btn" title="Camera">
                    <i class="fas fa-camera"></i>
                </button>
                <button class="mobile-tool-btn" id="mobile-voice-btn" title="Voice">
                    <i class="fas fa-microphone"></i>
                </button>
                <button class="mobile-tool-btn" id="mobile-more-btn" title="More">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `;
        
        // Insert before chat input
        const chatInput = this.container.querySelector('.chat-input-container');
        if (chatInput) {
            chatInput.parentNode.insertBefore(this.mobileToolbar, chatInput);
        }
    }
    
    /**
     * Create swipe indicators
     */
    createSwipeIndicators() {
        if (!this.settings.swipeGestures) return;
        
        const swipeIndicator = document.createElement('div');
        swipeIndicator.className = 'swipe-indicator';
        swipeIndicator.innerHTML = `
            <div class="swipe-hint">
                <i class="fas fa-chevron-left"></i>
                <span>Swipe for options</span>
                <i class="fas fa-chevron-right"></i>
            </div>
        `;
        
        this.container.appendChild(swipeIndicator);
        
        // Auto-hide after a few seconds
        setTimeout(() => {
            swipeIndicator.classList.add('hidden');
        }, 3000);
    }
    
    /**
     * Apply mobile classes
     */
    applyMobileClasses() {
        if (this.container) {
            this.container.classList.add('mobile-responsive');
            
            if (this.isMobile) {
                this.container.classList.add('mobile-device');
            }
            
            if (this.isTablet) {
                this.container.classList.add('tablet-device');
            }
            
            if (this.touchSupported) {
                this.container.classList.add('touch-device');
            }
            
            if (this.isLandscape) {
                this.container.classList.add('landscape-mode');
            } else {
                this.container.classList.add('portrait-mode');
            }
        }
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Mobile header events
        if (this.mobileHeader) {
            this.mobileHeader.querySelector('#mobile-menu-btn')?.addEventListener('click', () => this.toggleMobileMenu());
            this.mobileHeader.querySelector('#mobile-options-btn')?.addEventListener('click', () => this.showMobileOptions());
        }
        
        // Mobile toolbar events
        if (this.mobileToolbar) {
            this.mobileToolbar.querySelector('#mobile-emoji-btn')?.addEventListener('click', () => this.toggleMobileEmoji());
            this.mobileToolbar.querySelector('#mobile-attach-btn')?.addEventListener('click', () => this.showMobileAttach());
            this.mobileToolbar.querySelector('#mobile-camera-btn')?.addEventListener('click', () => this.openMobileCamera());
            this.mobileToolbar.querySelector('#mobile-voice-btn')?.addEventListener('click', () => this.toggleMobileVoice());
            this.mobileToolbar.querySelector('#mobile-more-btn')?.addEventListener('click', () => this.showMobileMore());
        }
        
        // Prevent zoom on double tap for input elements
        if (this.settings.touchOptimized) {
            const inputs = this.container.querySelectorAll('input, textarea');
            inputs.forEach(input => {
                input.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    input.focus();
                });
            });
        }
    }
    
    /**
     * Apply mobile optimizations
     */
    applyMobileOptimizations() {
        if (this.isMobile || this.isTablet) {
            this.optimizeScrolling();
            this.optimizeTouchTargets();
            this.optimizeAnimations();
            this.optimizeLayout();
        }
    }
    
    /**
     * Optimize scrolling
     */
    optimizeScrolling() {
        if (this.settings.optimizedScrolling) {
            const scrollableElements = this.container.querySelectorAll('.messages-list, .user-list, .sidebar-content');
            
            scrollableElements.forEach(element => {
                element.style.webkitOverflowScrolling = 'touch';
                element.style.overflowScrolling = 'touch';
            });
        }
    }
    
    /**
     * Optimize touch targets
     */
    optimizeTouchTargets() {
        if (this.settings.largerTouchTargets) {
            this.container.classList.add('large-touch-targets');
        }
    }
    
    /**
     * Optimize animations
     */
    optimizeAnimations() {
        if (this.settings.reducedAnimations || this.isMobile) {
            this.container.classList.add('reduced-animations');
        }
    }
    
    /**
     * Optimize layout
     */
    optimizeLayout() {
        if (this.settings.compactMode) {
            this.container.classList.add('compact-mobile');
        }
        
        if (this.settings.hideSecondaryElements) {
            this.container.classList.add('hide-secondary');
        }
    }
    
    /**
     * Handle viewport change
     */
    handleViewportChange() {
        const oldIsMobile = this.isMobile;
        const oldIsTablet = this.isTablet;
        
        this.detectDevice();
        
        // Update classes if device type changed
        if (oldIsMobile !== this.isMobile || oldIsTablet !== this.isTablet) {
            this.applyMobileClasses();
            this.applyMobileOptimizations();
        }
        
        this.onViewportChange({
            width: this.viewportWidth,
            height: this.viewportHeight,
            isMobile: this.isMobile,
            isTablet: this.isTablet
        });
    }
    
    /**
     * Handle orientation change
     */
    handleOrientationChange() {
        setTimeout(() => {
            this.detectDevice();
            this.applyOrientationOptimizations();
            this.onOrientationChange(this.isLandscape);
        }, 100);
    }
    
    /**
     * Handle visual viewport change
     */
    handleVisualViewportChange() {
        if (window.visualViewport) {
            const scale = window.visualViewport.scale;
            const offsetTop = window.visualViewport.offsetTop;
            
            // Adjust layout for keyboard or zoom
            if (this.container) {
                this.container.style.setProperty('--visual-viewport-scale', scale);
                this.container.style.setProperty('--visual-viewport-offset', `${offsetTop}px`);
            }
        }
    }
    
    /**
     * Handle visual viewport scroll
     */
    handleVisualViewportScroll() {
        // Handle any scroll-related adjustments
    }
    
    /**
     * Apply orientation optimizations
     */
    applyOrientationOptimizations() {
        if (this.container) {
            this.container.classList.remove('landscape-mode', 'portrait-mode');
            
            if (this.isLandscape) {
                this.container.classList.add('landscape-mode');
            } else {
                this.container.classList.add('portrait-mode');
            }
        }
    }
    
    /**
     * Adjust for keyboard
     */
    adjustForKeyboard(visible) {
        if (!this.container) return;
        
        if (visible) {
            const keyboardHeight = window.innerHeight - (window.visualViewport?.height || window.innerHeight);
            this.container.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
            this.container.style.paddingBottom = `${keyboardHeight + this.settings.keyboardPadding}px`;
        } else {
            this.container.style.removeProperty('--keyboard-height');
            this.container.style.paddingBottom = '';
        }
    }
    
    /**
     * Handle swipe gesture
     */
    handleSwipe(direction, event) {
        console.log(`Swipe ${direction} detected`);
        
        switch (direction) {
            case 'left':
                this.handleSwipeLeft(event);
                break;
            case 'right':
                this.handleSwipeRight(event);
                break;
            case 'up':
                this.handleSwipeUp(event);
                break;
            case 'down':
                this.handleSwipeDown(event);
                break;
        }
        
        // Haptic feedback
        if (this.features.hapticFeedback && this.settings.touchFeedback) {
            navigator.vibrate?.(50);
        }
    }
    
    /**
     * Handle swipe left
     */
    handleSwipeLeft(event) {
        // Show user list or next panel
        this.showNextPanel();
    }
    
    /**
     * Handle swipe right
     */
    handleSwipeRight(event) {
        // Show menu or previous panel
        this.showPreviousPanel();
    }
    
    /**
     * Handle swipe up
     */
    handleSwipeUp(event) {
        // Scroll to top or show more options
        this.scrollToTop();
    }
    
    /**
     * Handle swipe down
     */
    handleSwipeDown(event) {
        // Pull to refresh or show keyboard
        if (this.features.pullToRefresh) {
            this.triggerPullToRefresh();
        }
    }
    
    /**
     * Handle tap
     */
    handleTap(event) {
        if (this.settings.tapToExpand) {
            const target = event.target.closest('.message-item');
            if (target) {
                this.toggleMessageExpansion(target);
            }
        }
    }
    
    /**
     * Handle long press
     */
    handleLongPress(event) {
        console.log('Long press detected');
        
        const target = event.target.closest('.message-item');
        if (target) {
            this.showMessageContextMenu(target, event);
        }
        
        // Haptic feedback
        if (this.features.hapticFeedback && this.settings.touchFeedback) {
            navigator.vibrate?.(100);
        }
    }
    
    /**
     * Toggle mobile menu
     */
    toggleMobileMenu() {
        const sidebar = this.container.querySelector('.chat-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('mobile-visible');
        }
    }
    
    /**
     * Show mobile options
     */
    showMobileOptions() {
        // Show mobile options menu
        const optionsMenu = this.createMobileOptionsMenu();
        document.body.appendChild(optionsMenu);
    }
    
    /**
     * Create mobile options menu
     */
    createMobileOptionsMenu() {
        const menu = document.createElement('div');
        menu.className = 'mobile-options-menu';
        menu.innerHTML = `
            <div class="mobile-options-backdrop"></div>
            <div class="mobile-options-content">
                <div class="mobile-options-header">
                    <h4>Chat Options</h4>
                    <button class="mobile-options-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="mobile-options-list">
                    <button class="mobile-option-item" data-action="search">
                        <i class="fas fa-search"></i>
                        <span>Search Messages</span>
                    </button>
                    <button class="mobile-option-item" data-action="users">
                        <i class="fas fa-users"></i>
                        <span>User List</span>
                    </button>
                    <button class="mobile-option-item" data-action="settings">
                        <i class="fas fa-cog"></i>
                        <span>Settings</span>
                    </button>
                    <button class="mobile-option-item" data-action="notifications">
                        <i class="fas fa-bell"></i>
                        <span>Notifications</span>
                    </button>
                    <button class="mobile-option-item" data-action="export">
                        <i class="fas fa-download"></i>
                        <span>Export Chat</span>
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners
        menu.querySelector('.mobile-options-close').addEventListener('click', () => {
            menu.remove();
        });
        
        menu.querySelector('.mobile-options-backdrop').addEventListener('click', () => {
            menu.remove();
        });
        
        menu.querySelectorAll('.mobile-option-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleMobileOptionAction(action);
                menu.remove();
            });
        });
        
        return menu;
    }
    
    /**
     * Handle mobile option action
     */
    handleMobileOptionAction(action) {
        switch (action) {
            case 'search':
                // Trigger search
                break;
            case 'users':
                // Show user list
                break;
            case 'settings':
                // Show settings
                break;
            case 'notifications':
                // Show notifications
                break;
            case 'export':
                // Export chat
                break;
        }
    }
    
    /**
     * Show next panel
     */
    showNextPanel() {
        // Implementation for showing next panel
    }
    
    /**
     * Show previous panel
     */
    showPreviousPanel() {
        // Implementation for showing previous panel
    }
    
    /**
     * Scroll to top
     */
    scrollToTop() {
        const messagesList = this.container.querySelector('.messages-list');
        if (messagesList) {
            messagesList.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
    
    /**
     * Trigger pull to refresh
     */
    triggerPullToRefresh() {
        // Implementation for pull to refresh
    }
    
    /**
     * Toggle message expansion
     */
    toggleMessageExpansion(messageElement) {
        messageElement.classList.toggle('expanded');
    }
    
    /**
     * Show message context menu
     */
    showMessageContextMenu(messageElement, event) {
        // Implementation for context menu
    }
    
    /**
     * Toggle mobile emoji
     */
    toggleMobileEmoji() {
        // Implementation for mobile emoji picker
    }
    
    /**
     * Show mobile attach
     */
    showMobileAttach() {
        // Implementation for mobile file attachment
    }
    
    /**
     * Open mobile camera
     */
    openMobileCamera() {
        // Implementation for mobile camera
    }
    
    /**
     * Toggle mobile voice
     */
    toggleMobileVoice() {
        // Implementation for mobile voice recording
    }
    
    /**
     * Show mobile more
     */
    showMobileMore() {
        // Implementation for mobile more options
    }
    
    /**
     * Get device info
     */
    getDeviceInfo() {
        return {
            isMobile: this.isMobile,
            isTablet: this.isTablet,
            isLandscape: this.isLandscape,
            touchSupported: this.touchSupported,
            devicePixelRatio: this.devicePixelRatio,
            viewport: {
                width: this.viewportWidth,
                height: this.viewportHeight
            },
            features: this.features
        };
    }
    
    /**
     * Update mobile settings
     */
    updateMobileSetting(key, value) {
        this.settings[key] = value;
        this.saveMobileSettings();
        this.applyMobileOptimizations();
    }
    
    /**
     * Save mobile settings
     */
    saveMobileSettings() {
        localStorage.setItem('mobileResponsiveSettings', JSON.stringify(this.settings));
    }
    
    /**
     * Load mobile settings
     */
    loadMobileSettings() {
        const saved = localStorage.getItem('mobileResponsiveSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }
    
    /**
     * Attach WebSocket listeners
     */
    attachWebSocketListeners() {
        if (!this.websocket) return;
        
        this.websocket.addEventListener('message', (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        });
    }
    
    /**
     * Handle WebSocket messages
     */
    handleWebSocketMessage(data) {
        // Mobile-specific message handling
    }
    
    /**
     * Set WebSocket connection
     */
    setWebSocket(websocket) {
        this.websocket = websocket;
        if (websocket) {
            this.attachWebSocketListeners();
        }
    }
    
    /**
     * Set user info
     */
    setUserInfo(userId, userRole) {
        this.currentUserId = userId;
        this.currentUserRole = userRole;
    }
    
    /**
     * Set room ID
     */
    setRoomId(roomId) {
        this.roomId = roomId;
    }
    
    /**
     * Destroy the interface
     */
    destroy() {
        // Remove mobile UI elements
        if (this.mobileHeader) {
            this.mobileHeader.remove();
        }
        
        if (this.mobileToolbar) {
            this.mobileToolbar.remove();
        }
        
        // Remove event listeners
        window.removeEventListener('resize', this.handleViewportChange);
        window.removeEventListener('orientationchange', this.handleOrientationChange);
        
        if (window.visualViewport) {
            window.visualViewport.removeEventListener('resize', this.handleVisualViewportChange);
            window.visualViewport.removeEventListener('scroll', this.handleVisualViewportScroll);
        }
        
        // Remove mobile classes
        if (this.container) {
            this.container.classList.remove(
                'mobile-responsive', 'mobile-device', 'tablet-device', 
                'touch-device', 'landscape-mode', 'portrait-mode',
                'compact-mobile', 'hide-secondary', 'large-touch-targets',
                'reduced-animations', 'keyboard-visible'
            );
        }
    }
}

// Global reference for onclick handlers
let mobileResponsive = null;

// Add comprehensive mobile responsive CSS
const mobileResponsiveCSS = `
/* Mobile Responsive Interface Styles */
.mobile-responsive {
    --mobile-header-height: 60px;
    --mobile-toolbar-height: 50px;
    --mobile-padding: 16px;
    --mobile-border-radius: 12px;
    --touch-target-size: 44px;
    --keyboard-height: 0px;
    --visual-viewport-scale: 1;
    --visual-viewport-offset: 0px;
}

/* Mobile Header */
.mobile-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: var(--mobile-header-height);
    background: var(--card-dark);
    border-bottom: 1px solid var(--border-color);
    z-index: 1000;
    display: none;
}

.mobile-header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    padding: 0 var(--mobile-padding);
}

.mobile-menu-btn,
.mobile-options-btn {
    background: none;
    border: none;
    color: var(--text-light);
    font-size: 1.2rem;
    padding: 8px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: var(--touch-target-size);
    min-height: var(--touch-target-size);
    display: flex;
    align-items: center;
    justify-content: center;
}

.mobile-menu-btn:hover,
.mobile-options-btn:hover {
    background: var(--input-dark);
    color: var(--primary-color);
}

.mobile-title {
    flex: 1;
    text-align: center;
    margin: 0 16px;
}

.mobile-title span {
    font-weight: 600;
    color: var(--text-light);
    font-size: 1.1rem;
}

.mobile-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 2px;
}

.mobile-status .user-count {
    font-size: 0.8rem;
    color: var(--text-muted);
}

.connection-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #28a745;
    animation: pulse 2s infinite;
}

/* Mobile Toolbar */
.mobile-toolbar {
    position: fixed;
    bottom: calc(var(--keyboard-height) + 80px);
    left: 0;
    right: 0;
    height: var(--mobile-toolbar-height);
    background: var(--card-dark);
    border-top: 1px solid var(--border-color);
    z-index: 999;
    display: none;
    transition: bottom 0.3s ease;
}

.mobile-toolbar-content {
    display: flex;
    align-items: center;
    justify-content: space-around;
    height: 100%;
    padding: 0 var(--mobile-padding);
}

.mobile-tool-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 1.1rem;
    padding: 8px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: var(--touch-target-size);
    min-height: var(--touch-target-size);
    display: flex;
    align-items: center;
    justify-content: center;
}

.mobile-tool-btn:hover,
.mobile-tool-btn.active {
    background: var(--primary-color);
    color: white;
    transform: scale(1.1);
}

/* Swipe Indicators */
.swipe-indicator {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 0.9rem;
    z-index: 1001;
    transition: opacity 0.3s ease;
    pointer-events: none;
}

.swipe-indicator.hidden {
    opacity: 0;
}

.swipe-hint {
    display: flex;
    align-items: center;
    gap: 8px;
}

.swipe-hint i {
    font-size: 0.8rem;
    opacity: 0.7;
}

/* Mobile Options Menu */
.mobile-options-menu {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2000;
    display: flex;
    align-items: flex-end;
}

.mobile-options-backdrop {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
}

.mobile-options-content {
    position: relative;
    background: var(--card-dark);
    border-radius: var(--mobile-border-radius) var(--mobile-border-radius) 0 0;
    width: 100%;
    max-height: 70vh;
    overflow-y: auto;
    animation: slideUp 0.3s ease;
}

.mobile-options-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--mobile-padding);
    border-bottom: 1px solid var(--border-color);
}

.mobile-options-header h4 {
    margin: 0;
    color: var(--text-light);
    font-size: 1.2rem;
}

.mobile-options-close {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 1.2rem;
    padding: 8px;
    border-radius: 8px;
    cursor: pointer;
    min-width: var(--touch-target-size);
    min-height: var(--touch-target-size);
    display: flex;
    align-items: center;
    justify-content: center;
}

.mobile-options-list {
    padding: var(--mobile-padding);
}

.mobile-option-item {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    padding: 16px;
    background: none;
    border: none;
    color: var(--text-light);
    text-align: left;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: 8px;
    min-height: var(--touch-target-size);
}

.mobile-option-item:hover {
    background: var(--input-dark);
}

.mobile-option-item i {
    font-size: 1.2rem;
    color: var(--primary-color);
    width: 24px;
    text-align: center;
}

.mobile-option-item span {
    font-size: 1rem;
    font-weight: 500;
}

/* Device-specific styles */
.mobile-device {
    font-size: 16px; /* Prevent zoom on iOS */
}

.mobile-device .mobile-header,
.mobile-device .mobile-toolbar {
    display: block;
}

.mobile-device .chat-container {
    padding-top: var(--mobile-header-height);
    padding-bottom: calc(var(--mobile-toolbar-height) + 80px + var(--keyboard-height));
}

.tablet-device {
    font-size: 15px;
}

.touch-device {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
}

.touch-device input,
.touch-device textarea {
    -webkit-user-select: text;
    user-select: text;
}

/* Large touch targets */
.large-touch-targets button,
.large-touch-targets .clickable {
    min-width: var(--touch-target-size);
    min-height: var(--touch-target-size);
    padding: 12px;
}

.large-touch-targets .message-item {
    padding: 16px;
    margin-bottom: 12px;
}

.large-touch-targets .user-item {
    padding: 16px;
    min-height: 60px;
}

/* Compact mobile layout */
.compact-mobile .message-item {
    padding: 8px 12px;
    margin-bottom: 4px;
}

.compact-mobile .message-content {
    font-size: 0.9rem;
    line-height: 1.4;
}

.compact-mobile .message-meta {
    font-size: 0.8rem;
}

.compact-mobile .user-avatar {
    width: 32px;
    height: 32px;
}

/* Hide secondary elements on mobile */
.hide-secondary .message-reactions,
.hide-secondary .message-thread-count,
.hide-secondary .typing-indicator-details {
    display: none;
}

.hide-secondary .user-last-seen,
.hide-secondary .user-status-text {
    display: none;
}

/* Reduced animations */
.reduced-animations * {
    animation-duration: 0.1s !important;
    transition-duration: 0.1s !important;
}

.reduced-animations .typing-dots {
    animation: none;
}

/* Keyboard handling */
.keyboard-visible {
    padding-bottom: calc(var(--keyboard-height) + var(--mobile-padding));
}

.keyboard-visible .mobile-toolbar {
    bottom: var(--keyboard-height);
}

.keyboard-visible .chat-input-container {
    position: fixed;
    bottom: var(--keyboard-height);
    left: 0;
    right: 0;
    z-index: 998;
}

/* Orientation-specific styles */
.landscape-mode .mobile-header {
    height: 50px;
}

.landscape-mode .mobile-toolbar {
    height: 40px;
}

.landscape-mode .chat-container {
    padding-top: 50px;
    padding-bottom: calc(40px + 60px + var(--keyboard-height));
}

.portrait-mode .mobile-sidebar {
    width: 100%;
    height: 100%;
}

.landscape-mode .mobile-sidebar {
    width: 320px;
    height: 100%;
}

/* Sidebar mobile behavior */
.chat-sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s ease;
}

.chat-sidebar.mobile-visible {
    transform: translateX(0);
    position: fixed;
    top: var(--mobile-header-height);
    left: 0;
    bottom: 0;
    width: 280px;
    z-index: 997;
    background: var(--card-dark);
    border-right: 1px solid var(--border-color);
}

/* Message expansion */
.message-item.expanded .message-content {
    max-height: none;
    overflow: visible;
}

.message-item.expanded .message-actions {
    display: flex;
}

/* Responsive breakpoints */
@media (max-width: 480px) {
    .mobile-responsive {
        --mobile-padding: 12px;
        --mobile-border-radius: 8px;
    }

    .mobile-header-content {
        padding: 0 12px;
    }

    .mobile-title span {
        font-size: 1rem;
    }

    .mobile-status .user-count {
        font-size: 0.75rem;
    }

    .mobile-options-content {
        max-height: 80vh;
    }

    .mobile-option-item {
        padding: 12px;
    }

    .mobile-option-item span {
        font-size: 0.9rem;
    }
}

@media (max-width: 360px) {
    .mobile-responsive {
        --mobile-padding: 8px;
    }

    .mobile-title {
        margin: 0 8px;
    }

    .mobile-toolbar-content {
        padding: 0 8px;
    }
}

/* High contrast mode */
.mobile-responsive.high-contrast {
    --text-light: #ffffff;
    --text-muted: #cccccc;
    --border-color: #666666;
    --card-dark: #000000;
    --input-dark: #333333;
}

.mobile-responsive.high-contrast .mobile-header,
.mobile-responsive.high-contrast .mobile-toolbar {
    border-color: #666666;
}

.mobile-responsive.high-contrast .mobile-option-item:hover {
    background: #333333;
}

/* Animations */
@keyframes slideUp {
    from {
        transform: translateY(100%);
    }
    to {
        transform: translateY(0);
    }
}

@keyframes pulse {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
}

/* iOS specific fixes */
@supports (-webkit-touch-callout: none) {
    .mobile-responsive {
        -webkit-overflow-scrolling: touch;
    }

    .mobile-responsive input,
    .mobile-responsive textarea {
        font-size: 16px; /* Prevent zoom */
    }

    .mobile-responsive .chat-input {
        font-size: 16px;
    }
}

/* Android specific fixes */
@media screen and (-webkit-min-device-pixel-ratio: 0) and (min-resolution: .001dpcm) {
    .mobile-responsive .mobile-header {
        position: -webkit-sticky;
        position: sticky;
    }
}

/* Safe area handling for notched devices */
@supports (padding: max(0px)) {
    .mobile-header {
        padding-top: max(8px, env(safe-area-inset-top));
        height: calc(var(--mobile-header-height) + max(0px, env(safe-area-inset-top)));
    }

    .mobile-toolbar {
        padding-bottom: max(8px, env(safe-area-inset-bottom));
        height: calc(var(--mobile-toolbar-height) + max(0px, env(safe-area-inset-bottom)));
    }

    .mobile-options-content {
        padding-bottom: max(16px, env(safe-area-inset-bottom));
    }
}

/* Print styles */
@media print {
    .mobile-header,
    .mobile-toolbar,
    .swipe-indicator,
    .mobile-options-menu {
        display: none !important;
    }

    .mobile-device .chat-container {
        padding: 0 !important;
    }
}
`;

// Inject CSS into document
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = mobileResponsiveCSS;
    document.head.appendChild(styleSheet);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileResponsiveInterface;
} else if (typeof window !== 'undefined') {
    window.MobileResponsiveInterface = MobileResponsiveInterface;
}
