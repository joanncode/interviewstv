/**
 * Modern Streaming Interface
 * Professional-grade streaming interface with modern UI/UX design
 */
class ModernStreamingInterface {
    constructor(options = {}) {
        this.websocket = options.websocket || null;
        this.currentUserId = options.currentUserId || null;
        this.currentUserRole = options.currentUserRole || 'guest';
        this.roomId = options.roomId || 'default';
        this.container = options.container || null;
        this.onStreamStateChange = options.onStreamStateChange || (() => {});
        this.onViewerCountChange = options.onViewerCountChange || (() => {});
        this.onQualityChange = options.onQualityChange || (() => {});
        
        // Streaming state
        this.isStreaming = false;
        this.isRecording = false;
        this.isPaused = false;
        this.streamId = null;
        this.streamKey = null;
        this.viewerCount = 0;
        this.streamDuration = 0;
        this.recordingDuration = 0;
        
        // Media state
        this.localStream = null;
        this.remoteStreams = new Map();
        this.cameraEnabled = true;
        this.microphoneEnabled = true;
        this.screenShareEnabled = false;
        this.virtualBackgroundEnabled = false;
        
        // UI state
        this.isFullscreen = false;
        this.layoutMode = 'spotlight'; // 'spotlight', 'grid', 'sidebar'
        this.sidebarVisible = true;
        this.controlsVisible = true;
        this.chatVisible = true;

        // Animation system
        this.animationSystem = null;

        // Responsive design system
        this.responsiveSystem = null;

        // Theme system
        this.themeSystem = null;

        // Accessibility system
        this.accessibilitySystem = null;

        // Keyboard shortcuts system
        this.keyboardShortcuts = null;

        // Customizable layouts system
        this.customizableLayouts = null;

        // Video layout system
        this.videoLayoutSystem = null;

        // Video quality system
        this.videoQualitySystem = null;

        // Screen sharing system
        this.screenSharingSystem = null;
        this.recordingControlsSystem = null;
        this.videoEffectsSystem = null;
        this.cameraSwitchingSystem = null;
        this.videoRecordingIndicators = null;

        // Virtual backgrounds system
        this.virtualBackgrounds = null;

        // Stream configuration
        this.streamConfig = {
            title: '',
            description: '',
            category: 'interview',
            quality: '720p',
            bitrate: 2500,
            frameRate: 30,
            recordingEnabled: true,
            chatEnabled: true,
            moderationEnabled: true,
            maxViewers: 1000,
            isPrivate: false,
            requireApproval: false
        };
        
        // Quality options
        this.qualityOptions = [
            { value: '360p', label: '360p (1 Mbps)', bitrate: 1000, resolution: '640x360' },
            { value: '480p', label: '480p (1.5 Mbps)', bitrate: 1500, resolution: '854x480' },
            { value: '720p', label: '720p HD (2.5 Mbps)', bitrate: 2500, resolution: '1280x720' },
            { value: '1080p', label: '1080p FHD (5 Mbps)', bitrate: 5000, resolution: '1920x1080' }
        ];
        
        // Layout options
        this.layoutOptions = [
            { value: 'spotlight', label: 'Spotlight', icon: 'fas fa-user-circle' },
            { value: 'grid', label: 'Grid View', icon: 'fas fa-th' },
            { value: 'sidebar', label: 'Sidebar', icon: 'fas fa-columns' },
            { value: 'presentation', label: 'Presentation', icon: 'fas fa-desktop' }
        ];
        
        // Theme options
        this.themes = {
            dark: {
                name: 'Dark Professional',
                primary: '#FF0000',
                background: '#0a0a0a',
                surface: '#1a1a1a',
                card: '#2a2a2a',
                input: '#3a3a3a',
                text: '#ffffff',
                textMuted: '#cccccc',
                border: '#444444',
                success: '#28a745',
                warning: '#ffc107',
                danger: '#dc3545',
                info: '#17a2b8'
            },
            light: {
                name: 'Light Professional',
                primary: '#FF0000',
                background: '#f8f9fa',
                surface: '#ffffff',
                card: '#ffffff',
                input: '#ffffff',
                text: '#212529',
                textMuted: '#6c757d',
                border: '#dee2e6',
                success: '#28a745',
                warning: '#ffc107',
                danger: '#dc3545',
                info: '#17a2b8'
            }
        };
        
        // Current theme
        this.currentTheme = 'dark';
        
        // Settings
        this.settings = {
            theme: 'dark',
            autoStartRecording: false,
            showViewerCount: true,
            showStreamStats: true,
            enableNotifications: true,
            enableSoundEffects: true,
            autoHideControls: true,
            controlsTimeout: 3000,
            defaultLayout: 'spotlight',
            defaultQuality: '720p',
            enableKeyboardShortcuts: true,
            enableGestures: true,
            ...options.settings
        };
        
        // Timers
        this.streamTimer = null;
        this.recordingTimer = null;
        this.controlsTimer = null;
        this.statsUpdateTimer = null;
        
        // Statistics
        this.streamStats = {
            bitrate: 0,
            frameRate: 0,
            resolution: '',
            packetLoss: 0,
            latency: 0,
            uploadSpeed: 0,
            connectionQuality: 'good'
        };
        
        this.init();
    }
    
    /**
     * Initialize the streaming interface
     */
    init() {
        if (this.container) {
            this.createInterface();
            this.attachEventListeners();
            this.applyTheme();
            this.loadSettings();
            this.initializeAnimationSystem();
            this.initializeResponsiveSystem();
            this.initializeThemeSystem();
            this.initializeAccessibilitySystem();
            this.initializeKeyboardShortcuts();
            this.initializeCustomizableLayouts();
            this.initializeVideoLayoutSystem();
            this.initializeVideoQualitySystem();
            this.initializeScreenSharingSystem();
            this.initializeRecordingControlsSystem();
            this.initializeVideoEffectsSystem();
            this.initializeCameraSwitchingSystem();
            this.initializeVideoRecordingIndicators();
            this.initializeVirtualBackgrounds();
        }

        if (this.websocket) {
            this.attachWebSocketListeners();
        }

        this.startStatsUpdates();
    }

    /**
     * Initialize animation system
     */
    initializeAnimationSystem() {
        if (typeof AnimatedTransitions !== 'undefined') {
            this.animationSystem = new AnimatedTransitions({
                container: this.container,
                streamingInterface: this,
                enableAnimations: this.settings.enableAnimations !== false,
                performanceMode: this.settings.animationPerformanceMode || 'auto'
            });
        }
    }

    /**
     * Initialize responsive design system
     */
    initializeResponsiveSystem() {
        if (typeof ResponsiveDesignSystem !== 'undefined') {
            this.responsiveSystem = new ResponsiveDesignSystem({
                container: this.container,
                streamingInterface: this,
                animationSystem: this.animationSystem,
                settings: {
                    adaptiveLayout: this.settings.adaptiveLayout !== false,
                    touchOptimization: this.settings.touchOptimization !== false,
                    gestureSupport: this.settings.gestureSupport !== false,
                    hapticFeedback: this.settings.hapticFeedback === true,
                    virtualKeyboardHandling: this.settings.virtualKeyboardHandling !== false,
                    performanceOptimization: this.settings.performanceOptimization !== false
                }
            });

            // Listen for responsive events
            this.container.addEventListener('responsive-resize', (e) => {
                this.handleResponsiveResize(e.detail);
            });

            this.container.addEventListener('responsive-orientation-change', (e) => {
                this.handleOrientationChange(e.detail);
            });

            this.container.addEventListener('responsive-keyboard-change', (e) => {
                this.handleKeyboardChange(e.detail);
            });

            this.container.addEventListener('responsive-gesture', (e) => {
                this.handleGesture(e.detail);
            });
        }
    }

    /**
     * Initialize theme system
     */
    initializeThemeSystem() {
        if (typeof ThemeSystem !== 'undefined') {
            this.themeSystem = new ThemeSystem({
                container: this.container,
                streamingInterface: this,
                responsiveSystem: this.responsiveSystem,
                animationSystem: this.animationSystem,
                settings: {
                    enableTransitions: this.settings.enableThemeTransitions !== false,
                    respectSystemPreference: this.settings.respectSystemTheme !== false,
                    persistUserPreference: this.settings.persistThemePreference !== false,
                    enableAutoSwitch: this.settings.enableAutoThemeSwitch === true,
                    autoSwitchTimes: this.settings.autoThemeSwitchTimes || {
                        light: '06:00',
                        dark: '18:00'
                    }
                }
            });

            // Listen for theme change events
            this.container.addEventListener('theme-change', (e) => {
                this.handleThemeChange(e.detail);
            });

            // Set initial theme
            if (this.settings.theme && this.settings.theme !== this.themeSystem.currentTheme) {
                this.themeSystem.setTheme(this.settings.theme);
            }
        }
    }

    /**
     * Initialize accessibility system
     */
    initializeAccessibilitySystem() {
        if (typeof AccessibilitySystem !== 'undefined') {
            this.accessibilitySystem = new AccessibilitySystem({
                container: this.container,
                streamingInterface: this,
                themeSystem: this.themeSystem,
                responsiveSystem: this.responsiveSystem,
                animationSystem: this.animationSystem,
                settings: {
                    wcagLevel: this.settings.wcagLevel || 'AA',
                    highContrast: this.settings.accessibilityHighContrast === true,
                    reducedMotion: this.settings.accessibilityReducedMotion === true,
                    largeText: this.settings.accessibilityLargeText === true,
                    fontSize: this.settings.accessibilityFontSize || 'normal',
                    largerClickTargets: this.settings.accessibilityLargerTargets === true,
                    stickyKeys: this.settings.accessibilityStickyKeys === true,
                    extendedTimeouts: this.settings.accessibilityExtendedTimeouts === true,
                    simplifiedInterface: this.settings.accessibilitySimplified === true,
                    readingGuide: this.settings.accessibilityReadingGuide === true,
                    visualIndicators: this.settings.accessibilityVisualIndicators !== false,
                    captionsEnabled: this.settings.accessibilityCaptions !== false,
                    audioDescriptions: this.settings.accessibilityAudioDescriptions === true,
                    announcements: this.settings.accessibilityAnnouncements !== false,
                    verboseDescriptions: this.settings.accessibilityVerbose === true,
                    focusIndicators: this.settings.accessibilityFocusIndicators !== false,
                    keyboardNavigation: this.settings.accessibilityKeyboard !== false
                }
            });

            // Listen for accessibility events
            this.container.addEventListener('accessibility-feature-changed', (e) => {
                this.handleAccessibilityChange(e.detail);
            });

            // Integrate with other systems
            if (this.themeSystem) {
                this.accessibilitySystem.integrateWithThemeSystem(this.themeSystem);
            }

            if (this.responsiveSystem) {
                this.accessibilitySystem.integrateWithResponsiveSystem(this.responsiveSystem);
            }

            if (this.animationSystem) {
                this.accessibilitySystem.integrateWithAnimationSystem(this.animationSystem);
            }

            // Announce interface ready
            setTimeout(() => {
                this.accessibilitySystem.announce('Streaming interface loaded and ready', 'polite');
            }, 1000);
        }
    }

    /**
     * Initialize keyboard shortcuts system
     */
    initializeKeyboardShortcuts() {
        if (typeof KeyboardShortcutsSystem !== 'undefined') {
            this.keyboardShortcuts = new KeyboardShortcutsSystem({
                container: this.container,
                streamingInterface: this,
                accessibilitySystem: this.accessibilitySystem,
                themeSystem: this.themeSystem,
                responsiveSystem: this.responsiveSystem,
                settings: {
                    enabled: this.settings.enableKeyboardShortcuts !== false,
                    enableGlobalShortcuts: this.settings.enableGlobalShortcuts !== false,
                    enableContextualShortcuts: this.settings.enableContextualShortcuts !== false,
                    enableSequenceShortcuts: this.settings.enableSequenceShortcuts !== false,
                    enableCustomShortcuts: this.settings.enableCustomShortcuts !== false,
                    enableVisualFeedback: this.settings.enableShortcutFeedback !== false,
                    enableSoundFeedback: this.settings.enableShortcutSounds === true,
                    enableHapticFeedback: this.settings.enableShortcutHaptics === true,
                    sequenceTimeout: this.settings.shortcutSequenceTimeout || 2000,
                    conflictResolution: this.settings.shortcutConflictResolution || 'context'
                }
            });

            // Register streaming-specific shortcuts
            this.registerStreamingShortcuts();

            // Listen for shortcut events
            this.container.addEventListener('shortcut-context-change', (e) => {
                this.handleShortcutContextChange(e.detail);
            });

            // Announce shortcuts ready
            setTimeout(() => {
                if (this.accessibilitySystem) {
                    this.accessibilitySystem.announce('Keyboard shortcuts system ready. Press Ctrl+/ for help.', 'polite');
                }
            }, 1500);
        }
    }

    /**
     * Initialize customizable layouts system
     */
    initializeCustomizableLayouts() {
        if (typeof CustomizableLayoutsSystem !== 'undefined') {
            this.customizableLayouts = new CustomizableLayoutsSystem({
                container: this.container,
                streamingInterface: this,
                accessibilitySystem: this.accessibilitySystem,
                themeSystem: this.themeSystem,
                responsiveSystem: this.responsiveSystem,
                keyboardShortcuts: this.keyboardShortcuts,
                settings: {
                    enableCustomLayouts: this.settings.enableCustomLayouts !== false,
                    enableLayoutAnimations: this.settings.enableLayoutAnimations !== false,
                    enableLayoutPersistence: this.settings.enableLayoutPersistence !== false,
                    enableResponsiveLayouts: this.settings.enableResponsiveLayouts !== false,
                    enableLayoutSharing: this.settings.enableLayoutSharing !== false,
                    defaultTransitionDuration: this.settings.layoutTransitionDuration || 300,
                    maxCustomLayouts: this.settings.maxCustomLayouts || 20,
                    enableLayoutPreview: this.settings.enableLayoutPreview !== false,
                    enableLayoutTemplates: this.settings.enableLayoutTemplates !== false,
                    enableLayoutValidation: this.settings.enableLayoutValidation !== false
                }
            });

            // Listen for layout change events
            this.container.addEventListener('layout-changed', (e) => {
                this.handleLayoutChange(e.detail);
            });

            // Set initial layout from settings
            if (this.settings.defaultLayout) {
                setTimeout(() => {
                    this.customizableLayouts.setLayout(this.settings.defaultLayout);
                }, 100);
            }

            // Announce layouts ready
            setTimeout(() => {
                if (this.accessibilitySystem) {
                    this.accessibilitySystem.announce('Customizable layouts system ready. Press Ctrl+L for layout manager.', 'polite');
                }
            }, 2000);
        }
    }

    /**
     * Initialize video layout system
     */
    initializeVideoLayoutSystem() {
        if (typeof VideoLayoutSystem !== 'undefined') {
            this.videoLayoutSystem = new VideoLayoutSystem(this.container, {
                accessibilitySystem: this.accessibilitySystem,
                themeSystem: this.themeSystem,
                responsiveSystem: this.responsiveSystem,
                settings: {
                    enableLayoutAnimations: true,
                    autoLayoutSwitching: true,
                    enableResponsiveLayouts: true,
                    enableDragAndDrop: true,
                    thumbnailSize: 'medium',
                    gridColumns: 'auto',
                    maxHistorySize: 10
                }
            });

            console.log('✅ Video Layout System initialized');

            // Setup layout event handlers
            this.container.addEventListener('video-layout-changed', (e) => {
                console.log('Layout changed:', e.detail);

                // Update UI state
                this.updateLayoutControls(e.detail.newLayoutId);

                // Announce layout change
                if (this.accessibilitySystem) {
                    this.accessibilitySystem.announce(
                        `Video layout changed to ${e.detail.layout.name}`,
                        'polite'
                    );
                }
            });

            this.container.addEventListener('participant-added', (e) => {
                console.log('Participant added:', e.detail);
                this.updateParticipantCount();
            });

            this.container.addEventListener('participant-removed', (e) => {
                console.log('Participant removed:', e.detail);
                this.updateParticipantCount();
            });

            this.container.addEventListener('spotlight-changed', (e) => {
                console.log('Spotlight changed:', e.detail);
                this.updateSpotlightIndicator(e.detail.newSpotlight);
            });

            this.container.addEventListener('pin-changed', (e) => {
                console.log('Pin changed:', e.detail);
                this.updatePinIndicator(e.detail.newPinned);
            });

            // Announce video layout system ready
            setTimeout(() => {
                if (this.accessibilitySystem) {
                    this.accessibilitySystem.announce(
                        'Video layout system ready. Press Ctrl+1-4 for quick layouts or Ctrl+L for layout selector.',
                        'polite'
                    );
                }
            }, 2500);
        }
    }

    /**
     * Initialize video quality system
     */
    initializeVideoQualitySystem() {
        if (typeof VideoQualitySystem !== 'undefined') {
            this.videoQualitySystem = new VideoQualitySystem(this.container, {
                accessibilitySystem: this.accessibilitySystem,
                themeSystem: this.themeSystem,
                responsiveSystem: this.responsiveSystem,
                videoLayoutSystem: this.videoLayoutSystem,
                enableAdaptiveStreaming: true,
                enableManualControls: true,
                enableQualityIndicators: true,
                enableBandwidthMonitoring: true,
                enablePerformanceOptimization: true,
                defaultQuality: 'auto',
                qualityCheckInterval: 5000,
                bandwidthCheckInterval: 10000,
                maxQualityChangesPerMinute: 6
            });

            console.log('✅ Video Quality System initialized');

            // Setup quality event handlers
            this.container.addEventListener('video-quality-changed', (e) => {
                console.log('Video quality changed:', e.detail);

                // Update UI state
                this.updateQualityIndicators(e.detail);

                // Announce quality change
                if (this.accessibilitySystem) {
                    const qualityLabel = e.detail.newQuality === 'auto' ? 'Auto' :
                        this.videoQualitySystem.getQualityProfiles().get(e.detail.newQuality)?.label ||
                        e.detail.newQuality;

                    this.accessibilitySystem.announce(
                        `Video quality changed to ${qualityLabel}`,
                        'polite'
                    );
                }

                // Log quality change for analytics
                this.logQualityChange(e.detail);
            });

            // Network condition monitoring
            this.container.addEventListener('network-condition-changed', (e) => {
                console.log('Network condition changed:', e.detail);
                this.updateNetworkIndicators(e.detail);
            });

            // Performance monitoring
            this.container.addEventListener('video-performance-warning', (e) => {
                console.warn('Video performance warning:', e.detail);
                this.handlePerformanceWarning(e.detail);
            });

            // Announce video quality system ready
            setTimeout(() => {
                if (this.accessibilitySystem) {
                    this.accessibilitySystem.announce(
                        'Video quality system ready. Press Ctrl+Q for quality settings or Ctrl+Shift+1-5 for manual quality selection.',
                        'polite'
                    );
                }
            }, 3000);
        }
    }

    /**
     * Initialize screen sharing system
     */
    initializeScreenSharingSystem() {
        if (typeof ScreenSharingSystem !== 'undefined') {
            this.screenSharingSystem = new ScreenSharingSystem(this.container, {
                enableAnnotations: true,
                enableCollaboration: true,
                enableRecording: true,
                enableQualityControls: true,
                maxAnnotations: 100,
                annotationTimeout: 300000,
                defaultTool: 'pointer',
                allowedSources: ['screen', 'window', 'tab'],
                qualityPresets: {
                    'low': { width: 1280, height: 720, frameRate: 15 },
                    'medium': { width: 1920, height: 1080, frameRate: 24 },
                    'high': { width: 1920, height: 1080, frameRate: 30 },
                    'ultra': { width: 2560, height: 1440, frameRate: 30 }
                },
                accessibilitySystem: this.accessibilitySystem,
                themeSystem: this.themeSystem,
                responsiveSystem: this.responsiveSystem,
                videoQualitySystem: this.videoQualitySystem
            });

            console.log('✅ Screen Sharing System initialized');

            // Setup screen sharing event handlers
            this.container.addEventListener('screen-sharing-started', (e) => {
                console.log('Screen sharing started:', e.detail);

                // Update UI state
                this.updateScreenSharingUI(true);

                // Announce screen sharing started
                if (this.accessibilitySystem) {
                    this.accessibilitySystem.announce(
                        `Screen sharing started with ${e.detail.source} source`,
                        'polite'
                    );
                }

                // Log screen sharing event
                this.logScreenSharingEvent('started', e.detail);
            });

            this.container.addEventListener('screen-sharing-stopped', (e) => {
                console.log('Screen sharing stopped:', e.detail);

                // Update UI state
                this.updateScreenSharingUI(false);

                // Announce screen sharing stopped
                if (this.accessibilitySystem) {
                    this.accessibilitySystem.announce('Screen sharing stopped', 'polite');
                }

                // Log screen sharing event
                this.logScreenSharingEvent('stopped', e.detail);
            });

            this.container.addEventListener('screen-sharing-error', (e) => {
                console.error('Screen sharing error:', e.detail);

                // Show error notification
                this.showNotification(`Screen sharing error: ${e.detail.error}`, 'error');

                // Announce error
                if (this.accessibilitySystem) {
                    this.accessibilitySystem.announce(
                        `Screen sharing error: ${e.detail.error}`,
                        'assertive'
                    );
                }

                // Log error event
                this.logScreenSharingEvent('error', e.detail);
            });

            // Annotation events
            this.container.addEventListener('annotation-created', (e) => {
                console.log('Annotation created:', e.detail);
                this.logAnnotationEvent('created', e.detail);
            });

            this.container.addEventListener('annotation-deleted', (e) => {
                console.log('Annotation deleted:', e.detail);
                this.logAnnotationEvent('deleted', e.detail);
            });

            this.container.addEventListener('annotations-cleared', (e) => {
                console.log('Annotations cleared:', e.detail);
                this.logAnnotationEvent('cleared', e.detail);
            });

            // Announce screen sharing system ready
            setTimeout(() => {
                if (this.accessibilitySystem) {
                    this.accessibilitySystem.announce(
                        'Screen sharing system ready. Press Ctrl+Shift+S to start sharing or Ctrl+Shift+A for annotations.',
                        'polite'
                    );
                }
            }, 3500);
        }
    }

    /**
     * Initialize recording controls system
     */
    initializeRecordingControlsSystem() {
        if (typeof RecordingControlsSystem !== 'undefined') {
            this.recordingControlsSystem = new RecordingControlsSystem(this.container, {
                enableLiveEditing: true,
                enableMultiTrack: true,
                enableRealTimeEffects: true,
                enableAutoSave: true,
                maxRecordingDuration: 7200000, // 2 hours
                autoSaveInterval: 30000, // 30 seconds
                recordingFormats: ['webm', 'mp4'],
                qualityPresets: {
                    'low': { width: 1280, height: 720, videoBitrate: 1500000, audioBitrate: 96000, fps: 24 },
                    'medium': { width: 1920, height: 1080, videoBitrate: 2500000, audioBitrate: 128000, fps: 30 },
                    'high': { width: 1920, height: 1080, videoBitrate: 4000000, audioBitrate: 192000, fps: 30 },
                    'ultra': { width: 2560, height: 1440, videoBitrate: 8000000, audioBitrate: 256000, fps: 30 }
                },
                accessibilitySystem: this.accessibilitySystem,
                themeSystem: this.themeSystem,
                responsiveSystem: this.responsiveSystem,
                streamingInterface: this
            });

            // Setup event handlers
            this.container.addEventListener('recording-started', (e) => {
                console.log('Recording started:', e.detail);
                this.updateRecordingUI(true);
                this.logRecordingEvent('recording-started', e.detail);
            });

            this.container.addEventListener('recording-stopped', (e) => {
                console.log('Recording stopped:', e.detail);
                this.updateRecordingUI(false);
                this.logRecordingEvent('recording-stopped', e.detail);
            });

            this.container.addEventListener('recording-paused', (e) => {
                console.log('Recording paused:', e.detail);
                this.logRecordingEvent('recording-paused', e.detail);
            });

            this.container.addEventListener('recording-resumed', (e) => {
                console.log('Recording resumed:', e.detail);
                this.logRecordingEvent('recording-resumed', e.detail);
            });

            this.container.addEventListener('recording-error', (e) => {
                console.error('Recording error:', e.detail);
                this.logRecordingEvent('recording-error', e.detail);

                // Announce error to accessibility system
                if (this.accessibilitySystem) {
                    this.accessibilitySystem.announce(`Recording error: ${e.detail.error}`, 'assertive');
                }
            });

            // Live editing events
            this.container.addEventListener('marker-added', (e) => {
                console.log('Marker added:', e.detail);
                this.logEditingEvent('marker-added', e.detail);
            });

            this.container.addEventListener('split-added', (e) => {
                console.log('Split added:', e.detail);
                this.logEditingEvent('split-added', e.detail);
            });

            this.container.addEventListener('transition-added', (e) => {
                console.log('Transition added:', e.detail);
                this.logEditingEvent('transition-added', e.detail);
            });

            this.container.addEventListener('effect-applied', (e) => {
                console.log('Effect applied:', e.detail);
                this.logEditingEvent('effect-applied', e.detail);
            });

            console.log('✅ Recording controls system initialized');
        } else {
            console.warn('RecordingControlsSystem not available');
        }
    }

    /**
     * Initialize video effects system
     */
    initializeVideoEffectsSystem() {
        if (typeof VideoEffectsSystem !== 'undefined') {
            // Create video effects container
            const effectsContainer = document.createElement('div');
            effectsContainer.className = 'video-effects-container';
            effectsContainer.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 100;
            `;

            this.container.appendChild(effectsContainer);

            // Initialize video effects system
            this.videoEffectsSystem = new VideoEffectsSystem(effectsContainer, {
                enableWebGL: true,
                enableRealTimeProcessing: true,
                enableEffectChaining: true,
                enableCustomShaders: true,
                maxEffectsChain: 10,
                targetFPS: 30,
                processingQuality: 'high',
                enablePerformanceMonitoring: true,
                enableEffectPresets: true,
                enableColorCorrection: true,
                enableDistortionEffects: true,
                enableArtisticEffects: true,
                accessibilitySystem: this.accessibilitySystem,
                themeSystem: this.themeSystem,
                responsiveSystem: this.responsiveSystem
            });

            // Setup video effects events
            effectsContainer.addEventListener('processing-started', (e) => {
                console.log('Video effects processing started:', e.detail);
                this.emitStreamingEvent('video-effects-started', e.detail);
            });

            effectsContainer.addEventListener('effect-toggled', (e) => {
                console.log('Video effect toggled:', e.detail);
                this.emitStreamingEvent('video-effect-toggled', e.detail);
            });

            effectsContainer.addEventListener('preset-applied', (e) => {
                console.log('Video effects preset applied:', e.detail);
                this.emitStreamingEvent('video-effects-preset-applied', e.detail);
            });

            effectsContainer.addEventListener('effects-reset', (e) => {
                console.log('Video effects reset:', e.detail);
                this.emitStreamingEvent('video-effects-reset', e.detail);
            });

            effectsContainer.addEventListener('parameter-changed', (e) => {
                console.log('Video effect parameter changed:', e.detail);
                this.emitStreamingEvent('video-effect-parameter-changed', e.detail);
            });

            effectsContainer.addEventListener('processing-stopped', (e) => {
                console.log('Video effects processing stopped:', e.detail);
                this.emitStreamingEvent('video-effects-stopped', e.detail);
            });

            effectsContainer.addEventListener('initialization-error', (e) => {
                console.error('Video effects initialization error:', e.detail);
                this.emitStreamingEvent('video-effects-error', e.detail);
            });

            console.log('✅ Video effects system initialized');
        } else {
            console.warn('VideoEffectsSystem not available');
        }
    }

    /**
     * Initialize camera switching system
     */
    initializeCameraSwitchingSystem() {
        if (typeof CameraSwitchingSystem !== 'undefined') {
            const switchingContainer = document.createElement('div');
            switchingContainer.className = 'camera-switching-container';
            this.container.appendChild(switchingContainer);

            this.cameraSwitchingSystem = new CameraSwitchingSystem(switchingContainer, {
                enableAutoDetection: true,
                enableHotSwapping: true,
                enableDeviceLabeling: true,
                enableQualityPresets: true,
                enableDevicePreview: true,
                enableDeviceStatus: true,
                maxCameras: 8,
                defaultQuality: 'high',
                autoSwitchOnDisconnect: true,
                enableDeviceMemory: true,
                enablePermissionHandling: true,
                enableErrorRecovery: true,
                accessibilitySystem: this.accessibilitySystem,
                themeSystem: this.themeSystem,
                responsiveSystem: this.responsiveSystem
            });

            // Setup camera switching events
            switchingContainer.addEventListener('camera-switched', (e) => {
                console.log('Camera switched in streaming interface:', e.detail);

                // Update local stream with new camera
                if (e.detail.camera && e.detail.camera.stream) {
                    this.localStream = e.detail.camera.stream;
                    this.updateVideoDisplay();
                }

                // Log camera switch event
                this.logCameraSwitchingEvent('camera-switched', {
                    deviceId: e.detail.deviceId,
                    cameraLabel: e.detail.camera.label,
                    quality: e.detail.quality,
                    switchTime: e.detail.switchTime
                });

                // Emit streaming interface event
                this.emitStreamingEvent('camera-switched', e.detail);
            });

            switchingContainer.addEventListener('devices-enumerated', (e) => {
                console.log('Camera devices enumerated:', e.detail);

                this.logCameraSwitchingEvent('devices-enumerated', {
                    deviceCount: e.detail.deviceCount
                });
            });

            switchingContainer.addEventListener('camera-error', (e) => {
                console.error('Camera switching error:', e.detail);

                this.logCameraSwitchingEvent('camera-error', {
                    deviceId: e.detail.deviceId,
                    error: e.detail.error,
                    errorType: e.detail.errorType
                });

                // Show error notification
                this.showNotification('Camera Error', e.detail.error, 'error');
            });

            console.log('✅ Camera switching system initialized');
        } else {
            console.warn('CameraSwitchingSystem not available');
        }
    }

    /**
     * Initialize video recording indicators
     */
    initializeVideoRecordingIndicators() {
        if (typeof VideoRecordingIndicators !== 'undefined') {
            const indicatorsContainer = document.createElement('div');
            indicatorsContainer.className = 'video-recording-indicators-container';
            this.container.appendChild(indicatorsContainer);

            this.videoRecordingIndicators = new VideoRecordingIndicators(indicatorsContainer, {
                enableFloatingIndicator: true,
                enableCornerIndicator: true,
                enableStatusBar: true,
                enableTimerDisplay: false,
                enableQualityIndicator: true,
                enableStorageIndicator: true,
                enableBandwidthIndicator: true,
                enableErrorIndicator: true,
                enablePulseAnimation: true,
                enableSoundIndicator: false,
                indicatorPosition: 'top-right',
                timerFormat: 'hh:mm:ss',
                updateInterval: 1000,
                autoHideDelay: 5000,
                enableAccessibility: true,
                enableMobileOptimization: true,
                accessibilitySystem: this.accessibilitySystem,
                themeSystem: this.themeSystem,
                responsiveSystem: this.responsiveSystem
            });

            // Setup recording indicators events
            indicatorsContainer.addEventListener('recording-started', (e) => {
                console.log('Recording indicators started:', e.detail);

                this.logRecordingIndicatorEvent('recording-started', {
                    startTime: e.detail.startTime,
                    quality: e.detail.quality,
                    format: e.detail.format
                });

                // Emit streaming interface event
                this.emitStreamingEvent('recording-indicators-started', e.detail);
            });

            indicatorsContainer.addEventListener('recording-stopped', (e) => {
                console.log('Recording indicators stopped:', e.detail);

                this.logRecordingIndicatorEvent('recording-stopped', {
                    duration: e.detail.duration,
                    size: e.detail.size,
                    quality: e.detail.quality,
                    format: e.detail.format
                });

                // Emit streaming interface event
                this.emitStreamingEvent('recording-indicators-stopped', e.detail);
            });

            indicatorsContainer.addEventListener('recording-error', (e) => {
                console.error('Recording indicators error:', e.detail);

                this.logRecordingIndicatorEvent('recording-error', {
                    error: e.detail.error,
                    timestamp: e.detail.timestamp
                });

                // Show error notification
                this.showNotification('Recording Error', e.detail.error, 'error');
            });

            indicatorsContainer.addEventListener('indicator-clicked', (e) => {
                console.log('Recording indicator clicked:', e.detail);

                this.logRecordingIndicatorEvent('indicator-clicked', {
                    indicator: e.detail.indicator,
                    timestamp: e.detail.timestamp
                });
            });

            console.log('✅ Video recording indicators initialized');
        } else {
            console.warn('VideoRecordingIndicators not available');
        }
    }

    /**
     * Initialize virtual backgrounds system
     */
    initializeVirtualBackgrounds() {
        if (typeof VirtualBackgroundsSystem !== 'undefined') {
            this.virtualBackgrounds = new VirtualBackgroundsSystem({
                container: this.container,
                streamingInterface: this,
                accessibilitySystem: this.accessibilitySystem,
                themeSystem: this.themeSystem,
                responsiveSystem: this.responsiveSystem,
                keyboardShortcuts: this.keyboardShortcuts,
                settings: {
                    enabled: this.settings.enableVirtualBackgrounds !== false,
                    enableAIBackgroundRemoval: this.settings.enableAIBackgroundRemoval !== false,
                    enableCustomBackgrounds: this.settings.enableCustomBackgrounds !== false,
                    enableBlurEffects: this.settings.enableBlurEffects !== false,
                    enableGreenScreen: this.settings.enableGreenScreen !== false,
                    defaultBlurStrength: this.settings.defaultBlurStrength || 5,
                    backgroundQuality: this.settings.backgroundQuality || 'high',
                    enablePerformanceOptimization: this.settings.enablePerformanceOptimization !== false,
                    enableEdgeSmoothing: this.settings.enableEdgeSmoothing !== false,
                    enableLightingAdjustment: this.settings.enableLightingAdjustment !== false,
                    maxBackgroundSize: this.settings.maxBackgroundSize || 5 * 1024 * 1024,
                    supportedFormats: this.settings.supportedBackgroundFormats || ['jpg', 'jpeg', 'png', 'webp', 'gif'],
                    enableBackgroundPreview: this.settings.enableBackgroundPreview !== false,
                    enableAutoDetection: this.settings.enableAutoDetection !== false
                }
            });

            // Listen for virtual background events
            this.container.addEventListener('virtual-background-changed', (e) => {
                this.handleVirtualBackgroundChange(e.detail);
            });

            this.container.addEventListener('virtual-background-processing-started', (e) => {
                this.handleVirtualBackgroundProcessingStarted(e.detail);
            });

            this.container.addEventListener('virtual-background-processing-stopped', (e) => {
                this.handleVirtualBackgroundProcessingStopped(e.detail);
            });

            // Add virtual backgrounds button to controls
            this.addVirtualBackgroundsButton();
        }
    }

    /**
     * Handle layout change
     */
    handleLayoutChange(detail) {
        const { previousLayout, newLayout, layoutId } = detail;

        // Update internal layout state
        this.layoutMode = layoutId;

        // Update settings
        this.settings.defaultLayout = layoutId;
        this.saveSettings();

        // Update UI
        this.updateLayoutUI();

        // Emit layout change event for other components
        this.emit('layout-changed', { previousLayout, newLayout, layoutId });

        // Notify accessibility system
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce(`Layout changed to ${newLayout.name || layoutId}`, 'polite');
        }
    }

    /**
     * Register streaming-specific keyboard shortcuts
     */
    registerStreamingShortcuts() {
        if (!this.keyboardShortcuts) return;

        // Enhanced media controls with streaming context
        this.keyboardShortcuts.addShortcut('Space', () => this.toggleStream(), 'Play/Pause stream', 'media', 'streaming', 1);
        this.keyboardShortcuts.addShortcut('k', () => this.toggleStream(), 'Play/Pause stream (alternative)', 'media', 'streaming', 2);
        this.keyboardShortcuts.addShortcut('m', () => this.toggleMicrophone(), 'Toggle microphone', 'media', 'streaming', 1);
        this.keyboardShortcuts.addShortcut('v', () => this.toggleCamera(), 'Toggle camera', 'media', 'streaming', 1);
        this.keyboardShortcuts.addShortcut('s', () => this.toggleScreenShare(), 'Toggle screen share', 'media', 'streaming', 1);
        this.keyboardShortcuts.addShortcut('r', () => this.toggleRecording(), 'Toggle recording', 'media', 'streaming', 1);
        this.keyboardShortcuts.addShortcut('c', () => this.toggleChat(), 'Toggle chat', 'interface', 'streaming', 1);
        this.keyboardShortcuts.addShortcut('f', () => this.toggleFullscreen(), 'Toggle fullscreen', 'interface', 'streaming', 1);

        // Layout shortcuts
        this.keyboardShortcuts.addShortcut('1', () => this.changeLayout('spotlight'), 'Spotlight layout', 'layout', 'streaming', 1);
        this.keyboardShortcuts.addShortcut('2', () => this.changeLayout('grid'), 'Grid layout', 'layout', 'streaming', 1);
        this.keyboardShortcuts.addShortcut('3', () => this.changeLayout('sidebar'), 'Sidebar layout', 'layout', 'streaming', 1);
        this.keyboardShortcuts.addShortcut('4', () => this.changeLayout('presentation'), 'Presentation layout', 'layout', 'streaming', 1);

        // Volume controls
        this.keyboardShortcuts.addShortcut('ArrowUp', () => this.adjustVolume(10), 'Increase volume', 'media', 'streaming', 2);
        this.keyboardShortcuts.addShortcut('ArrowDown', () => this.adjustVolume(-10), 'Decrease volume', 'media', 'streaming', 2);
        this.keyboardShortcuts.addShortcut('Ctrl+ArrowUp', () => this.adjustVolume(25), 'Increase volume (large)', 'media', 'streaming', 2);
        this.keyboardShortcuts.addShortcut('Ctrl+ArrowDown', () => this.adjustVolume(-25), 'Decrease volume (large)', 'media', 'streaming', 2);

        // Quality controls
        this.keyboardShortcuts.addShortcut('q', () => this.cycleQuality(), 'Cycle video quality', 'media', 'streaming', 2);
        this.keyboardShortcuts.addShortcut('Shift+q', () => this.cycleQuality(true), 'Cycle video quality (reverse)', 'media', 'streaming', 2);

        // Participant management
        this.keyboardShortcuts.addShortcut('Ctrl+m', () => this.muteAllParticipants(), 'Mute all participants', 'participants', 'streaming', 1);
        this.keyboardShortcuts.addShortcut('Ctrl+Shift+m', () => this.unmuteAllParticipants(), 'Unmute all participants', 'participants', 'streaming', 1);

        // Recording controls
        this.keyboardShortcuts.addShortcut('Ctrl+r', () => this.startRecording(), 'Start recording', 'recording', 'streaming', 1);
        this.keyboardShortcuts.addShortcut('Ctrl+Shift+r', () => this.stopRecording(), 'Stop recording', 'recording', 'streaming', 1);
        this.keyboardShortcuts.addShortcut('Ctrl+p', () => this.pauseRecording(), 'Pause/Resume recording', 'recording', 'streaming', 1);

        // Interface controls
        this.keyboardShortcuts.addShortcut('Ctrl+h', () => this.toggleControlsVisibility(), 'Toggle controls visibility', 'interface', 'streaming', 2);
        this.keyboardShortcuts.addShortcut('Ctrl+i', () => this.toggleParticipantsPanel(), 'Toggle participants panel', 'interface', 'streaming', 2);
        this.keyboardShortcuts.addShortcut('Ctrl+u', () => this.toggleSettingsPanel(), 'Toggle settings panel', 'interface', 'streaming', 2);

        // Sequence shortcuts for advanced users
        this.keyboardShortcuts.addShortcut('g s', () => this.goToSettings(), 'Go to settings', 'navigation', 'streaming', 2);
        this.keyboardShortcuts.addShortcut('g h', () => this.goToHome(), 'Go to home', 'navigation', 'streaming', 2);
        this.keyboardShortcuts.addShortcut('g d', () => this.goToDashboard(), 'Go to dashboard', 'navigation', 'streaming', 2);

        // Layout sequence shortcuts
        this.keyboardShortcuts.addShortcut('l s', () => this.changeLayout('spotlight'), 'Set spotlight layout', 'layout', 'streaming', 2);
        this.keyboardShortcuts.addShortcut('l g', () => this.changeLayout('grid'), 'Set grid layout', 'layout', 'streaming', 2);
        this.keyboardShortcuts.addShortcut('l p', () => this.changeLayout('presentation'), 'Set presentation layout', 'layout', 'streaming', 2);
        this.keyboardShortcuts.addShortcut('l c', () => this.cycleLayouts(), 'Cycle layouts', 'layout', 'streaming', 2);
    }

    /**
     * Create the main interface
     */
    createInterface() {
        this.container.innerHTML = `
            <div class="modern-streaming-interface" id="streaming-interface">
                <!-- Header Bar -->
                <div class="streaming-header" id="streaming-header">
                    <div class="header-left">
                        <div class="stream-title" id="stream-title">
                            <input type="text" placeholder="Stream Title" id="title-input" value="${this.streamConfig.title}">
                        </div>
                        <div class="stream-status" id="stream-status">
                            <div class="status-indicator offline" id="status-indicator"></div>
                            <span id="status-text">Offline</span>
                        </div>
                    </div>
                    
                    <div class="header-center">
                        <div class="recording-info" id="recording-info" style="display: none;">
                            <div class="recording-dot"></div>
                            <span id="recording-duration">00:00:00</span>
                        </div>
                        <div class="stream-duration" id="stream-duration" style="display: none;">
                            <i class="fas fa-clock"></i>
                            <span id="stream-time">00:00:00</span>
                        </div>
                    </div>
                    
                    <div class="header-right">
                        <div class="viewer-count" id="viewer-count">
                            <i class="fas fa-eye"></i>
                            <span id="viewer-number">0</span>
                        </div>
                        <div class="stream-quality" id="stream-quality">
                            <span id="quality-text">${this.streamConfig.quality}</span>
                            <div class="quality-indicator good" id="quality-indicator"></div>
                        </div>
                        <button class="header-btn" id="settings-btn" title="Settings">
                            <i class="fas fa-cog"></i>
                        </button>
                        <button class="header-btn" id="fullscreen-btn" title="Fullscreen">
                            <i class="fas fa-expand"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Main Content Area -->
                <div class="streaming-content" id="streaming-content">
                    <!-- Video Area -->
                    <div class="video-area" id="video-area">
                        <!-- Main Video Container -->
                        <div class="main-video-container" id="main-video-container">
                            <video id="main-video" class="main-video" autoplay muted playsinline></video>
                            
                            <!-- Video Overlay -->
                            <div class="video-overlay" id="video-overlay">
                                <!-- Stream Stats -->
                                <div class="stream-stats" id="stream-stats" style="display: none;">
                                    <div class="stat-item">
                                        <span class="stat-label">Bitrate:</span>
                                        <span class="stat-value" id="stat-bitrate">0 kbps</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">FPS:</span>
                                        <span class="stat-value" id="stat-fps">0</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Resolution:</span>
                                        <span class="stat-value" id="stat-resolution">0x0</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Latency:</span>
                                        <span class="stat-value" id="stat-latency">0ms</span>
                                    </div>
                                </div>
                                
                                <!-- Connection Quality -->
                                <div class="connection-quality" id="connection-quality">
                                    <div class="quality-bars">
                                        <div class="bar active"></div>
                                        <div class="bar active"></div>
                                        <div class="bar active"></div>
                                        <div class="bar"></div>
                                        <div class="bar"></div>
                                    </div>
                                    <span class="quality-text">Good</span>
                                </div>
                                
                                <!-- Layout Controls -->
                                <div class="layout-controls" id="layout-controls">
                                    <button class="layout-btn active" data-layout="spotlight" title="Spotlight View">
                                        <i class="fas fa-user-circle"></i>
                                    </button>
                                    <button class="layout-btn" data-layout="grid" title="Grid View">
                                        <i class="fas fa-th"></i>
                                    </button>
                                    <button class="layout-btn" data-layout="sidebar" title="Sidebar View">
                                        <i class="fas fa-columns"></i>
                                    </button>
                                    <button class="layout-btn" data-layout="presentation" title="Presentation Mode">
                                        <i class="fas fa-desktop"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Secondary Videos (Grid/Sidebar) -->
                        <div class="secondary-videos" id="secondary-videos">
                            <!-- Participant videos will be added here dynamically -->
                        </div>
                    </div>
                    
                    <!-- Sidebar -->
                    <div class="streaming-sidebar ${this.sidebarVisible ? 'visible' : ''}" id="streaming-sidebar">
                        <!-- Sidebar Tabs -->
                        <div class="sidebar-tabs">
                            <button class="sidebar-tab active" data-tab="chat">
                                <i class="fas fa-comments"></i>
                                <span>Chat</span>
                                <div class="tab-badge" id="chat-badge" style="display: none;">0</div>
                            </button>
                            <button class="sidebar-tab" data-tab="participants">
                                <i class="fas fa-users"></i>
                                <span>Participants</span>
                                <div class="tab-badge" id="participants-badge">0</div>
                            </button>
                            <button class="sidebar-tab" data-tab="settings">
                                <i class="fas fa-cog"></i>
                                <span>Settings</span>
                            </button>
                        </div>
                        
                        <!-- Sidebar Content -->
                        <div class="sidebar-content">
                            <!-- Chat Tab -->
                            <div class="sidebar-panel active" id="chat-panel">
                                <div id="chat-container"></div>
                            </div>
                            
                            <!-- Participants Tab -->
                            <div class="sidebar-panel" id="participants-panel">
                                <div class="participants-header">
                                    <h4>Participants (<span id="participant-count">0</span>)</h4>
                                    <button class="btn-icon" id="invite-btn" title="Invite Participants">
                                        <i class="fas fa-user-plus"></i>
                                    </button>
                                </div>
                                <div class="participants-list" id="participants-list">
                                    <!-- Participants will be added here -->
                                </div>
                            </div>
                            
                            <!-- Settings Tab -->
                            <div class="sidebar-panel" id="settings-panel">
                                <div class="settings-content" id="settings-content">
                                    <!-- Settings will be added here -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Control Bar -->
                <div class="control-bar ${this.controlsVisible ? 'visible' : ''}" id="control-bar">
                    <!-- Media Controls -->
                    <div class="media-controls">
                        <button class="control-btn ${this.microphoneEnabled ? 'active' : ''}" id="microphone-btn" title="Toggle Microphone">
                            <i class="fas ${this.microphoneEnabled ? 'fa-microphone' : 'fa-microphone-slash'}"></i>
                        </button>
                        <button class="control-btn ${this.cameraEnabled ? 'active' : ''}" id="camera-btn" title="Toggle Camera">
                            <i class="fas ${this.cameraEnabled ? 'fa-video' : 'fa-video-slash'}"></i>
                        </button>
                        <button class="control-btn" id="screen-share-btn" title="Share Screen">
                            <i class="fas fa-desktop"></i>
                        </button>
                        <button class="control-btn" id="virtual-bg-btn" title="Virtual Background">
                            <i class="fas fa-image"></i>
                        </button>
                    </div>
                    
                    <!-- Stream Controls -->
                    <div class="stream-controls">
                        <button class="control-btn primary" id="start-stream-btn" title="Start Stream">
                            <i class="fas fa-play"></i>
                            <span>Start Stream</span>
                        </button>
                        <button class="control-btn danger" id="stop-stream-btn" title="Stop Stream" style="display: none;">
                            <i class="fas fa-stop"></i>
                            <span>Stop Stream</span>
                        </button>
                        <button class="control-btn" id="record-btn" title="Start Recording">
                            <i class="fas fa-record-vinyl"></i>
                        </button>
                        <button class="control-btn" id="pause-btn" title="Pause Stream" style="display: none;">
                            <i class="fas fa-pause"></i>
                        </button>
                    </div>
                    
                    <!-- Additional Controls -->
                    <div class="additional-controls">
                        <div class="quality-selector">
                            <select id="quality-select" class="control-select">
                                ${this.qualityOptions.map(option => 
                                    `<option value="${option.value}" ${option.value === this.streamConfig.quality ? 'selected' : ''}>${option.label}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <button class="control-btn" id="chat-toggle-btn" title="Toggle Chat">
                            <i class="fas fa-comments"></i>
                        </button>
                        <button class="control-btn" id="participants-btn" title="Participants">
                            <i class="fas fa-users"></i>
                        </button>
                        <button class="control-btn" id="more-options-btn" title="More Options">
                            <i class="fas fa-ellipsis-h"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Loading Overlay -->
                <div class="loading-overlay" id="loading-overlay" style="display: none;">
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                        <div class="loading-text">Initializing stream...</div>
                    </div>
                </div>
                
                <!-- Notification Container -->
                <div class="notification-container" id="notification-container"></div>
            </div>
        `;
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Header controls
        document.getElementById('settings-btn')?.addEventListener('click', () => this.toggleSettings());
        document.getElementById('fullscreen-btn')?.addEventListener('click', () => this.toggleFullscreen());
        document.getElementById('title-input')?.addEventListener('change', (e) => this.updateStreamTitle(e.target.value));
        
        // Layout controls
        document.querySelectorAll('.layout-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const layout = e.currentTarget.dataset.layout;
                this.changeLayout(layout);
            });
        });
        
        // Media controls
        document.getElementById('microphone-btn')?.addEventListener('click', () => this.toggleMicrophone());
        document.getElementById('camera-btn')?.addEventListener('click', () => this.toggleCamera());
        document.getElementById('screen-share-btn')?.addEventListener('click', () => this.toggleScreenShare());
        document.getElementById('virtual-bg-btn')?.addEventListener('click', () => this.toggleVirtualBackground());
        
        // Stream controls
        document.getElementById('start-stream-btn')?.addEventListener('click', () => this.startStream());
        document.getElementById('stop-stream-btn')?.addEventListener('click', () => this.stopStream());
        document.getElementById('record-btn')?.addEventListener('click', () => this.toggleRecording());
        document.getElementById('pause-btn')?.addEventListener('click', () => this.pauseStream());
        
        // Additional controls
        document.getElementById('quality-select')?.addEventListener('change', (e) => this.changeQuality(e.target.value));
        document.getElementById('chat-toggle-btn')?.addEventListener('click', () => this.toggleChat());
        document.getElementById('participants-btn')?.addEventListener('click', () => this.showParticipants());
        document.getElementById('more-options-btn')?.addEventListener('click', () => this.showMoreOptions());
        
        // Sidebar tabs
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchSidebarTab(tabName);
            });
        });
        
        // Auto-hide controls
        if (this.settings.autoHideControls) {
            this.setupAutoHideControls();
        }
        
        // Keyboard shortcuts
        if (this.settings.enableKeyboardShortcuts) {
            this.setupKeyboardShortcuts();
        }
        
        // Mouse/touch events for controls
        this.container.addEventListener('mousemove', () => this.showControls());
        this.container.addEventListener('touchstart', () => this.showControls());
    }
    
    /**
     * Apply current theme
     */
    applyTheme() {
        const theme = this.themes[this.currentTheme];
        const root = document.documentElement;
        
        Object.entries(theme).forEach(([key, value]) => {
            if (key !== 'name') {
                root.style.setProperty(`--streaming-${key}`, value);
            }
        });
        
        this.container.classList.remove('theme-dark', 'theme-light');
        this.container.classList.add(`theme-${this.currentTheme}`);
    }
    
    /**
     * Load settings from localStorage
     */
    loadSettings() {
        const saved = localStorage.getItem('modernStreamingSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
        
        // Apply loaded settings
        this.currentTheme = this.settings.theme;
        this.streamConfig.quality = this.settings.defaultQuality;
        this.layoutMode = this.settings.defaultLayout;
        
        this.applyTheme();
        this.changeLayout(this.layoutMode);
    }
    
    /**
     * Save settings to localStorage
     */
    saveSettings() {
        localStorage.setItem('modernStreamingSettings', JSON.stringify(this.settings));
    }
    
    /**
     * Start statistics updates
     */
    startStatsUpdates() {
        this.statsUpdateTimer = setInterval(() => {
            this.updateStreamStats();
        }, 1000);
    }
    
    /**
     * Update stream statistics
     */
    updateStreamStats() {
        if (!this.isStreaming) return;
        
        // Update duration
        this.streamDuration++;
        this.updateStreamDuration();
        
        if (this.isRecording) {
            this.recordingDuration++;
            this.updateRecordingDuration();
        }
        
        // Update stats display
        if (this.settings.showStreamStats) {
            this.updateStatsDisplay();
        }
    }
    
    /**
     * Update stream duration display
     */
    updateStreamDuration() {
        const duration = this.formatDuration(this.streamDuration);
        const element = document.getElementById('stream-time');
        if (element) {
            element.textContent = duration;
        }
    }
    
    /**
     * Update recording duration display
     */
    updateRecordingDuration() {
        const duration = this.formatDuration(this.recordingDuration);
        const element = document.getElementById('recording-duration');
        if (element) {
            element.textContent = duration;
        }
    }
    
    /**
     * Format duration in HH:MM:SS
     */
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    /**
     * Update stats display
     */
    updateStatsDisplay() {
        document.getElementById('stat-bitrate').textContent = `${this.streamStats.bitrate} kbps`;
        document.getElementById('stat-fps').textContent = this.streamStats.frameRate;
        document.getElementById('stat-resolution').textContent = this.streamStats.resolution;
        document.getElementById('stat-latency').textContent = `${this.streamStats.latency}ms`;
        
        // Update connection quality
        this.updateConnectionQuality();
    }
    
    /**
     * Update connection quality indicator
     */
    updateConnectionQuality() {
        const qualityElement = document.getElementById('connection-quality');
        const bars = qualityElement.querySelectorAll('.bar');
        const qualityText = qualityElement.querySelector('.quality-text');
        
        let activeBarCount = 0;
        let qualityLabel = '';
        
        if (this.streamStats.connectionQuality === 'excellent') {
            activeBarCount = 5;
            qualityLabel = 'Excellent';
        } else if (this.streamStats.connectionQuality === 'good') {
            activeBarCount = 4;
            qualityLabel = 'Good';
        } else if (this.streamStats.connectionQuality === 'fair') {
            activeBarCount = 3;
            qualityLabel = 'Fair';
        } else if (this.streamStats.connectionQuality === 'poor') {
            activeBarCount = 2;
            qualityLabel = 'Poor';
        } else {
            activeBarCount = 1;
            qualityLabel = 'Very Poor';
        }
        
        bars.forEach((bar, index) => {
            if (index < activeBarCount) {
                bar.classList.add('active');
            } else {
                bar.classList.remove('active');
            }
        });
        
        qualityText.textContent = qualityLabel;
    }
    
    /**
     * Show controls
     */
    showControls() {
        const controlBar = document.getElementById('control-bar');
        const header = document.getElementById('streaming-header');
        
        controlBar.classList.add('visible');
        header.classList.add('visible');
        
        if (this.settings.autoHideControls) {
            clearTimeout(this.controlsTimer);
            this.controlsTimer = setTimeout(() => {
                if (!this.isStreaming || this.container.matches(':hover')) return;
                controlBar.classList.remove('visible');
                header.classList.remove('visible');
            }, this.settings.controlsTimeout);
        }
    }
    
    /**
     * Setup auto-hide controls
     */
    setupAutoHideControls() {
        this.container.addEventListener('mouseenter', () => this.showControls());
        this.container.addEventListener('mouseleave', () => {
            if (this.settings.autoHideControls && this.isStreaming) {
                setTimeout(() => {
                    const controlBar = document.getElementById('control-bar');
                    const header = document.getElementById('streaming-header');
                    controlBar.classList.remove('visible');
                    header.classList.remove('visible');
                }, 1000);
            }
        });
    }
    
    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when streaming interface is focused
            if (!this.container.contains(document.activeElement) && document.activeElement !== document.body) {
                return;
            }
            
            // Prevent shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    if (this.isStreaming) {
                        this.pauseStream();
                    } else {
                        this.startStream();
                    }
                    break;
                case 'KeyM':
                    e.preventDefault();
                    this.toggleMicrophone();
                    break;
                case 'KeyV':
                    e.preventDefault();
                    this.toggleCamera();
                    break;
                case 'KeyS':
                    e.preventDefault();
                    this.toggleScreenShare();
                    break;
                case 'KeyR':
                    e.preventDefault();
                    this.toggleRecording();
                    break;
                case 'KeyC':
                    e.preventDefault();
                    this.toggleChat();
                    break;
                case 'KeyF':
                    e.preventDefault();
                    this.toggleFullscreen();
                    break;
                case 'Digit1':
                    e.preventDefault();
                    this.changeLayout('spotlight');
                    break;
                case 'Digit2':
                    e.preventDefault();
                    this.changeLayout('grid');
                    break;
                case 'Digit3':
                    e.preventDefault();
                    this.changeLayout('sidebar');
                    break;
                case 'Digit4':
                    e.preventDefault();
                    this.changeLayout('presentation');
                    break;
            }
        });
    }
    
    /**
     * Start streaming
     */
    async startStream() {
        try {
            this.showLoading('Starting stream...');
            
            // Validate stream configuration
            if (!this.streamConfig.title.trim()) {
                throw new Error('Stream title is required');
            }
            
            // Initialize media
            await this.initializeMedia();
            
            // Create stream on server
            const streamData = await this.createStreamOnServer();
            this.streamId = streamData.stream_id;
            this.streamKey = streamData.stream_key;
            
            // Start WebRTC streaming
            await this.startWebRTCStreaming();
            
            // Update UI state
            this.isStreaming = true;
            this.streamDuration = 0;
            this.updateStreamingUI();

            // Animate stream state change
            if (this.animationSystem) {
                const statusIndicator = document.querySelector('.status-indicator');
                const recordingDot = document.querySelector('.recording-dot');
                this.animationSystem.animateStreamStateChange('live', {
                    statusIndicator,
                    recordingDot
                });
            }

            // Auto-start recording if enabled
            if (this.settings.autoStartRecording) {
                setTimeout(() => this.startRecording(), 1000);
            }

            this.hideLoading();
            this.showNotification('Stream started successfully!', 'success');
            this.onStreamStateChange('started', this.streamId);
            
        } catch (error) {
            console.error('Failed to start stream:', error);
            this.hideLoading();
            this.showNotification(`Failed to start stream: ${error.message}`, 'error');
        }
    }
    
    /**
     * Stop streaming
     */
    async stopStream() {
        try {
            this.showLoading('Stopping stream...');
            
            // Stop recording if active
            if (this.isRecording) {
                await this.stopRecording();
            }
            
            // Stop WebRTC streaming
            await this.stopWebRTCStreaming();
            
            // End stream on server
            await this.endStreamOnServer();
            
            // Clean up media
            this.cleanupMedia();
            
            // Update UI state
            this.isStreaming = false;
            this.isPaused = false;
            this.streamId = null;
            this.streamKey = null;
            this.updateStreamingUI();
            
            this.hideLoading();
            this.showNotification('Stream stopped successfully!', 'success');
            this.onStreamStateChange('stopped');
            
        } catch (error) {
            console.error('Failed to stop stream:', error);
            this.hideLoading();
            this.showNotification(`Failed to stop stream: ${error.message}`, 'error');
        }
    }
    
    /**
     * Toggle recording
     */
    async toggleRecording() {
        if (this.isRecording) {
            await this.stopRecording();
        } else {
            await this.startRecording();
        }
    }
    
    /**
     * Start recording
     */
    async startRecording() {
        try {
            if (!this.isStreaming) {
                throw new Error('Cannot record without active stream');
            }
            
            // Start recording on server
            await this.startRecordingOnServer();
            
            this.isRecording = true;
            this.recordingDuration = 0;
            this.updateRecordingUI();
            
            this.showNotification('Recording started', 'success');
            
        } catch (error) {
            console.error('Failed to start recording:', error);
            this.showNotification(`Failed to start recording: ${error.message}`, 'error');
        }
    }
    
    /**
     * Stop recording
     */
    async stopRecording() {
        try {
            // Stop recording on server
            await this.stopRecordingOnServer();
            
            this.isRecording = false;
            this.updateRecordingUI();
            
            this.showNotification('Recording stopped', 'success');
            
        } catch (error) {
            console.error('Failed to stop recording:', error);
            this.showNotification(`Failed to stop recording: ${error.message}`, 'error');
        }
    }
    
    /**
     * Toggle microphone
     */
    toggleMicrophone() {
        this.microphoneEnabled = !this.microphoneEnabled;
        
        if (this.localStream) {
            const audioTracks = this.localStream.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = this.microphoneEnabled;
            });
        }
        
        this.updateMicrophoneUI();
        this.showNotification(`Microphone ${this.microphoneEnabled ? 'enabled' : 'disabled'}`, 'info');
    }
    
    /**
     * Toggle camera
     */
    toggleCamera() {
        this.cameraEnabled = !this.cameraEnabled;
        
        if (this.localStream) {
            const videoTracks = this.localStream.getVideoTracks();
            videoTracks.forEach(track => {
                track.enabled = this.cameraEnabled;
            });
        }
        
        this.updateCameraUI();
        this.showNotification(`Camera ${this.cameraEnabled ? 'enabled' : 'disabled'}`, 'info');
    }
    
    /**
     * Toggle screen share
     */
    async toggleScreenShare() {
        try {
            if (this.screenShareEnabled) {
                await this.stopScreenShare();
            } else {
                await this.startScreenShare();
            }
        } catch (error) {
            console.error('Screen share error:', error);
            this.showNotification(`Screen share error: ${error.message}`, 'error');
        }
    }
    
    /**
     * Start screen share
     */
    async startScreenShare() {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });
            
            // Replace video track in peer connection
            if (this.peerConnection && this.localStream) {
                const videoTrack = screenStream.getVideoTracks()[0];
                const sender = this.peerConnection.getSenders().find(s => 
                    s.track && s.track.kind === 'video'
                );
                
                if (sender) {
                    await sender.replaceTrack(videoTrack);
                }
            }
            
            this.screenShareEnabled = true;
            this.updateScreenShareUI();
            this.showNotification('Screen sharing started', 'success');
            
            // Handle screen share end
            screenStream.getVideoTracks()[0].addEventListener('ended', () => {
                this.stopScreenShare();
            });
            
        } catch (error) {
            throw new Error('Failed to start screen sharing');
        }
    }
    
    /**
     * Stop screen share
     */
    async stopScreenShare() {
        try {
            // Switch back to camera
            if (this.peerConnection && this.localStream) {
                const videoTrack = this.localStream.getVideoTracks()[0];
                const sender = this.peerConnection.getSenders().find(s => 
                    s.track && s.track.kind === 'video'
                );
                
                if (sender && videoTrack) {
                    await sender.replaceTrack(videoTrack);
                }
            }
            
            this.screenShareEnabled = false;
            this.updateScreenShareUI();
            this.showNotification('Screen sharing stopped', 'info');
            
        } catch (error) {
            throw new Error('Failed to stop screen sharing');
        }
    }
    
    /**
     * Toggle virtual background
     */
    toggleVirtualBackground() {
        if (!this.virtualBackgrounds) {
            this.showNotification('Virtual backgrounds not available', 'warning');
            return;
        }

        // Show virtual backgrounds panel
        this.virtualBackgrounds.showBackgroundUI();

        // Announce to accessibility system
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce('Virtual backgrounds panel opened', 'polite');
        }
    }

    /**
     * Start virtual background processing
     */
    startVirtualBackgroundProcessing() {
        if (!this.virtualBackgrounds || !this.localVideo) {
            return false;
        }

        try {
            this.virtualBackgrounds.startProcessing(this.localVideo);
            this.virtualBackgroundEnabled = true;
            this.updateVirtualBackgroundUI();

            this.showNotification('Virtual background processing started', 'success');
            return true;
        } catch (error) {
            console.error('Failed to start virtual background processing:', error);
            this.showNotification('Failed to start virtual background processing', 'error');
            return false;
        }
    }

    /**
     * Stop virtual background processing
     */
    stopVirtualBackgroundProcessing() {
        if (!this.virtualBackgrounds) {
            return false;
        }

        try {
            this.virtualBackgrounds.stopProcessing();
            this.virtualBackgroundEnabled = false;
            this.updateVirtualBackgroundUI();

            this.showNotification('Virtual background processing stopped', 'info');
            return true;
        } catch (error) {
            console.error('Failed to stop virtual background processing:', error);
            this.showNotification('Failed to stop virtual background processing', 'error');
            return false;
        }
    }

    /**
     * Set virtual background
     */
    setVirtualBackground(backgroundId) {
        if (!this.virtualBackgrounds) {
            return false;
        }

        try {
            const success = this.virtualBackgrounds.setBackground(backgroundId);
            if (success) {
                const background = this.virtualBackgrounds.getAllBackgrounds().get(backgroundId);
                this.showNotification(`Background changed to ${background ? background.name : backgroundId}`, 'success');
            }
            return success;
        } catch (error) {
            console.error('Failed to set virtual background:', error);
            this.showNotification('Failed to set virtual background', 'error');
            return false;
        }
    }

    /**
     * Set virtual background effect
     */
    setVirtualBackgroundEffect(effectId) {
        if (!this.virtualBackgrounds) {
            return false;
        }

        try {
            const success = this.virtualBackgrounds.setBackgroundEffect(effectId);
            if (success) {
                const effect = this.virtualBackgrounds.getAllEffects().get(effectId);
                this.showNotification(`Effect changed to ${effect ? effect.name : effectId}`, 'success');
            }
            return success;
        } catch (error) {
            console.error('Failed to set virtual background effect:', error);
            this.showNotification('Failed to set virtual background effect', 'error');
            return false;
        }
    }

    /**
     * Disable virtual background
     */
    disableVirtualBackground() {
        if (!this.virtualBackgrounds) {
            return false;
        }

        try {
            this.virtualBackgrounds.disableBackground();
            this.virtualBackgroundEnabled = false;
            this.updateVirtualBackgroundUI();

            this.showNotification('Virtual background disabled', 'info');
            return true;
        } catch (error) {
            console.error('Failed to disable virtual background:', error);
            this.showNotification('Failed to disable virtual background', 'error');
            return false;
        }
    }

    /**
     * Handle virtual background change
     */
    handleVirtualBackgroundChange(detail) {
        const { backgroundId, backgroundType, backgroundName } = detail;

        // Update UI state
        this.updateVirtualBackgroundUI();

        // Emit event for other components
        this.emit('virtual-background-changed', { backgroundId, backgroundType, backgroundName });

        // Update settings
        this.settings.lastVirtualBackground = backgroundId;
        this.saveSettings();
    }

    /**
     * Handle virtual background processing started
     */
    handleVirtualBackgroundProcessingStarted(detail) {
        this.virtualBackgroundEnabled = true;
        this.updateVirtualBackgroundUI();

        // Emit event for other components
        this.emit('virtual-background-processing-started', detail);
    }

    /**
     * Handle virtual background processing stopped
     */
    handleVirtualBackgroundProcessingStopped(detail) {
        this.virtualBackgroundEnabled = false;
        this.updateVirtualBackgroundUI();

        // Emit event for other components
        this.emit('virtual-background-processing-stopped', detail);
    }

    /**
     * Add virtual backgrounds button to controls
     */
    addVirtualBackgroundsButton() {
        const controlsContainer = this.container.querySelector('.media-controls');
        if (!controlsContainer) return;

        // Check if button already exists
        if (controlsContainer.querySelector('#virtual-bg-btn')) return;

        const virtualBgBtn = document.createElement('button');
        virtualBgBtn.id = 'virtual-bg-btn';
        virtualBgBtn.className = 'control-btn';
        virtualBgBtn.innerHTML = `
            <i class="fas fa-magic" aria-hidden="true"></i>
            <span>Virtual BG</span>
        `;
        virtualBgBtn.title = 'Virtual Backgrounds';
        virtualBgBtn.setAttribute('aria-label', 'Toggle virtual backgrounds');

        // Add event listener
        virtualBgBtn.addEventListener('click', () => this.toggleVirtualBackground());

        // Insert before screen share button or at the end
        const screenShareBtn = controlsContainer.querySelector('#screen-share-btn');
        if (screenShareBtn) {
            controlsContainer.insertBefore(virtualBgBtn, screenShareBtn);
        } else {
            controlsContainer.appendChild(virtualBgBtn);
        }
    }

    /**
     * Update virtual background UI
     */
    updateVirtualBackgroundUI() {
        const virtualBgBtn = this.container.querySelector('#virtual-bg-btn');
        if (!virtualBgBtn) return;

        if (this.virtualBackgroundEnabled) {
            virtualBgBtn.classList.add('active');
            virtualBgBtn.setAttribute('aria-pressed', 'true');
        } else {
            virtualBgBtn.classList.remove('active');
            virtualBgBtn.setAttribute('aria-pressed', 'false');
        }
    }

    /**
     * Get virtual backgrounds system
     */
    getVirtualBackgroundsSystem() {
        return this.virtualBackgrounds;
    }

    /**
     * Check if virtual backgrounds are available
     */
    isVirtualBackgroundsAvailable() {
        return this.virtualBackgrounds && this.virtualBackgrounds.isEnabled();
    }

    /**
     * Get virtual background performance stats
     */
    getVirtualBackgroundPerformanceStats() {
        if (!this.virtualBackgrounds) return null;
        return this.virtualBackgrounds.getPerformanceStats();
    }
    
    /**
     * Change stream quality
     */
    async changeQuality(quality) {
        try {
            const qualityOption = this.qualityOptions.find(q => q.value === quality);
            if (!qualityOption) return;
            
            this.streamConfig.quality = quality;
            this.streamConfig.bitrate = qualityOption.bitrate;
            
            // Update stream if active
            if (this.isStreaming) {
                await this.updateStreamQuality(qualityOption);
            }
            
            this.updateQualityUI();
            this.onQualityChange(quality, qualityOption);
            this.showNotification(`Quality changed to ${qualityOption.label}`, 'info');
            
        } catch (error) {
            console.error('Failed to change quality:', error);
            this.showNotification(`Failed to change quality: ${error.message}`, 'error');
        }
    }
    
    /**
     * Change layout
     */
    changeLayout(layout) {
        if (!this.layoutOptions.find(l => l.value === layout)) return;

        const previousLayout = this.layoutMode;
        this.layoutMode = layout;

        // Animate layout transition if animation system is available
        if (this.animationSystem) {
            const videoArea = document.getElementById('video-area');
            this.animationSystem.animateLayoutChange(previousLayout, layout, videoArea);
        }

        this.updateLayoutUI();
        this.applyLayout();

        this.showNotification(`Layout changed to ${layout}`, 'info');
    }
    
    /**
     * Apply current layout
     */
    applyLayout() {
        const videoArea = document.getElementById('video-area');
        const secondaryVideos = document.getElementById('secondary-videos');
        
        // Remove existing layout classes
        videoArea.classList.remove('layout-spotlight', 'layout-grid', 'layout-sidebar', 'layout-presentation');
        
        // Apply new layout
        videoArea.classList.add(`layout-${this.layoutMode}`);
        
        // Show/hide secondary videos based on layout
        if (this.layoutMode === 'grid' || this.layoutMode === 'sidebar') {
            secondaryVideos.style.display = 'block';
        } else {
            secondaryVideos.style.display = 'none';
        }
    }
    
    /**
     * Toggle chat visibility
     */
    toggleChat() {
        this.chatVisible = !this.chatVisible;
        this.updateChatUI();
        
        if (this.chatVisible) {
            this.switchSidebarTab('chat');
        }
    }
    
    /**
     * Toggle fullscreen
     */
    async toggleFullscreen() {
        try {
            if (!document.fullscreenElement) {
                await this.container.requestFullscreen();
                this.isFullscreen = true;
            } else {
                await document.exitFullscreen();
                this.isFullscreen = false;
            }
            
            this.updateFullscreenUI();
            
        } catch (error) {
            console.error('Fullscreen error:', error);
        }
    }
    
    /**
     * Switch sidebar tab
     */
    switchSidebarTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update panels
        document.querySelectorAll('.sidebar-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${tabName}-panel`).classList.add('active');
        
        // Show sidebar if hidden
        if (!this.sidebarVisible) {
            this.sidebarVisible = true;
            document.getElementById('streaming-sidebar').classList.add('visible');
        }
    }
    
    /**
     * Show participants
     */
    showParticipants() {
        this.switchSidebarTab('participants');
    }
    
    /**
     * Show more options
     */
    showMoreOptions() {
        // Implementation for more options menu
        this.showNotification('More options coming soon!', 'info');
    }
    
    /**
     * Toggle settings
     */
    toggleSettings() {
        this.switchSidebarTab('settings');
    }
    
    /**
     * Update stream title
     */
    updateStreamTitle(title) {
        this.streamConfig.title = title;
        
        // Update on server if streaming
        if (this.isStreaming && this.streamId) {
            this.updateStreamOnServer({ title });
        }
    }
    
    /**
     * Show loading overlay
     */
    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        const text = overlay.querySelector('.loading-text');
        
        text.textContent = message;
        overlay.style.display = 'flex';
    }
    
    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        overlay.style.display = 'none';
    }
    
    /**
     * Show notification
     */
    showNotification(message, type = 'info', duration = 3000) {
        const container = document.getElementById('notification-container');
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add close functionality
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        container.appendChild(notification);

        // Animate notification entrance
        if (this.animationSystem) {
            this.animationSystem.animateNotification(notification, type);
        }

        // Auto-remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                if (this.animationSystem) {
                    this.animationSystem.animate(notification, 'slideOutRight').then(() => {
                        notification.remove();
                    });
                } else {
                    notification.remove();
                }
            }
        }, duration);
    }
    
    /**
     * Get notification icon
     */
    getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'fa-check-circle';
            case 'error': return 'fa-exclamation-circle';
            case 'warning': return 'fa-exclamation-triangle';
            default: return 'fa-info-circle';
        }
    }
    
    /**
     * Update UI states
     */
    updateStreamingUI() {
        const startBtn = document.getElementById('start-stream-btn');
        const stopBtn = document.getElementById('stop-stream-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const statusIndicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        const streamDuration = document.getElementById('stream-duration');
        
        if (this.isStreaming) {
            startBtn.style.display = 'none';
            stopBtn.style.display = 'inline-flex';
            pauseBtn.style.display = 'inline-flex';
            statusIndicator.className = 'status-indicator live';
            statusText.textContent = 'Live';
            streamDuration.style.display = 'block';
        } else {
            startBtn.style.display = 'inline-flex';
            stopBtn.style.display = 'none';
            pauseBtn.style.display = 'none';
            statusIndicator.className = 'status-indicator offline';
            statusText.textContent = 'Offline';
            streamDuration.style.display = 'none';
        }
    }
    
    updateRecordingUI() {
        const recordBtn = document.getElementById('record-btn');
        const recordingInfo = document.getElementById('recording-info');
        
        if (this.isRecording) {
            recordBtn.classList.add('active');
            recordBtn.innerHTML = '<i class="fas fa-stop"></i>';
            recordBtn.title = 'Stop Recording';
            recordingInfo.style.display = 'block';
        } else {
            recordBtn.classList.remove('active');
            recordBtn.innerHTML = '<i class="fas fa-record-vinyl"></i>';
            recordBtn.title = 'Start Recording';
            recordingInfo.style.display = 'none';
        }
    }
    
    updateMicrophoneUI() {
        const btn = document.getElementById('microphone-btn');
        const icon = btn.querySelector('i');
        
        if (this.microphoneEnabled) {
            btn.classList.add('active');
            icon.className = 'fas fa-microphone';
            btn.title = 'Mute Microphone';
        } else {
            btn.classList.remove('active');
            icon.className = 'fas fa-microphone-slash';
            btn.title = 'Unmute Microphone';
        }
    }
    
    updateCameraUI() {
        const btn = document.getElementById('camera-btn');
        const icon = btn.querySelector('i');
        
        if (this.cameraEnabled) {
            btn.classList.add('active');
            icon.className = 'fas fa-video';
            btn.title = 'Turn Off Camera';
        } else {
            btn.classList.remove('active');
            icon.className = 'fas fa-video-slash';
            btn.title = 'Turn On Camera';
        }
    }
    
    updateScreenShareUI() {
        const btn = document.getElementById('screen-share-btn');
        
        if (this.screenShareEnabled) {
            btn.classList.add('active');
            btn.title = 'Stop Screen Share';
        } else {
            btn.classList.remove('active');
            btn.title = 'Share Screen';
        }
    }
    
    updateVirtualBackgroundUI() {
        const btn = document.getElementById('virtual-bg-btn');
        
        if (this.virtualBackgroundEnabled) {
            btn.classList.add('active');
            btn.title = 'Disable Virtual Background';
        } else {
            btn.classList.remove('active');
            btn.title = 'Enable Virtual Background';
        }
    }
    
    updateQualityUI() {
        const qualityText = document.getElementById('quality-text');
        const qualitySelect = document.getElementById('quality-select');
        
        qualityText.textContent = this.streamConfig.quality;
        qualitySelect.value = this.streamConfig.quality;
    }
    
    updateLayoutUI() {
        // Update layout buttons
        document.querySelectorAll('.layout-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-layout="${this.layoutMode}"]`).classList.add('active');
    }
    
    updateChatUI() {
        const sidebar = document.getElementById('streaming-sidebar');
        const chatBtn = document.getElementById('chat-toggle-btn');
        
        if (this.chatVisible) {
            sidebar.classList.add('visible');
            chatBtn.classList.add('active');
        } else {
            if (document.querySelector('.sidebar-tab.active').dataset.tab === 'chat') {
                sidebar.classList.remove('visible');
            }
            chatBtn.classList.remove('active');
        }
    }
    
    updateFullscreenUI() {
        const btn = document.getElementById('fullscreen-btn');
        const icon = btn.querySelector('i');
        
        if (this.isFullscreen) {
            icon.className = 'fas fa-compress';
            btn.title = 'Exit Fullscreen';
        } else {
            icon.className = 'fas fa-expand';
            btn.title = 'Enter Fullscreen';
        }
    }
    
    /**
     * Server communication methods (to be implemented)
     */
    async createStreamOnServer() {
        // Implementation for creating stream on server
        return {
            stream_id: 'stream_' + Date.now(),
            stream_key: 'key_' + Math.random().toString(36).substr(2, 9)
        };
    }
    
    async endStreamOnServer() {
        // Implementation for ending stream on server
    }
    
    async startRecordingOnServer() {
        // Implementation for starting recording on server
    }
    
    async stopRecordingOnServer() {
        // Implementation for stopping recording on server
    }
    
    async updateStreamOnServer(data) {
        // Implementation for updating stream on server
    }
    
    async updateStreamQuality(qualityOption) {
        // Implementation for updating stream quality
    }
    
    /**
     * WebRTC methods (to be implemented)
     */
    async initializeMedia() {
        // Implementation for initializing media
    }
    
    async startWebRTCStreaming() {
        // Implementation for starting WebRTC streaming
    }
    
    async stopWebRTCStreaming() {
        // Implementation for stopping WebRTC streaming
    }
    
    cleanupMedia() {
        // Implementation for cleaning up media
    }
    
    /**
     * WebSocket listeners
     */
    attachWebSocketListeners() {
        if (!this.websocket) return;
        
        this.websocket.addEventListener('message', (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        });
    }
    
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'viewer_joined':
                this.viewerCount++;
                this.updateViewerCount();
                break;
            case 'viewer_left':
                this.viewerCount = Math.max(0, this.viewerCount - 1);
                this.updateViewerCount();
                break;
            case 'stream_stats':
                this.streamStats = { ...this.streamStats, ...data.stats };
                break;
        }
    }
    
    updateViewerCount() {
        const element = document.getElementById('viewer-number');
        if (element) {
            element.textContent = this.viewerCount;
        }
        
        this.onViewerCountChange(this.viewerCount);
    }
    
    /**
     * Keyboard shortcuts event handlers
     */
    handleShortcutContextChange(detail) {
        const { oldContext, newContext } = detail;

        // Update streaming interface context awareness
        this.currentShortcutContext = newContext;

        // Notify about context change
        this.onShortcutContextChange(oldContext, newContext);

        // Update UI based on context
        this.updateContextUI(newContext);
    }

    updateContextUI(context) {
        // Remove all context classes
        this.container.classList.remove('context-global', 'context-streaming', 'context-modal', 'context-video', 'context-chat');

        // Add current context class
        this.container.classList.add(`context-${context}`);

        // Update context-specific UI elements
        switch (context) {
            case 'video':
                this.highlightVideoArea();
                break;
            case 'chat':
                this.highlightChatArea();
                break;
            case 'modal':
                this.dimBackgroundElements();
                break;
            default:
                this.resetContextHighlights();
                break;
        }
    }

    highlightVideoArea() {
        const videoArea = this.container.querySelector('.video-area, .video-panel');
        if (videoArea) {
            videoArea.classList.add('context-highlight');
            setTimeout(() => {
                videoArea.classList.remove('context-highlight');
            }, 2000);
        }
    }

    highlightChatArea() {
        const chatArea = this.container.querySelector('.chat-container, .chat-panel');
        if (chatArea) {
            chatArea.classList.add('context-highlight');
            setTimeout(() => {
                chatArea.classList.remove('context-highlight');
            }, 2000);
        }
    }

    dimBackgroundElements() {
        this.container.classList.add('modal-context-active');
    }

    resetContextHighlights() {
        this.container.classList.remove('modal-context-active');
        const highlighted = this.container.querySelectorAll('.context-highlight');
        highlighted.forEach(element => {
            element.classList.remove('context-highlight');
        });
    }

    // Enhanced streaming methods for keyboard shortcuts
    adjustVolume(delta) {
        if (this.audioContext && this.audioGain) {
            const currentVolume = this.audioGain.gain.value;
            const newVolume = Math.max(0, Math.min(1, currentVolume + (delta / 100)));
            this.audioGain.gain.value = newVolume;

            // Show feedback
            if (this.keyboardShortcuts) {
                this.keyboardShortcuts.showShortcutFeedback(`Volume: ${Math.round(newVolume * 100)}%`);
            }

            // Announce to screen reader
            if (this.accessibilitySystem) {
                this.accessibilitySystem.announce(`Volume ${delta > 0 ? 'increased' : 'decreased'} to ${Math.round(newVolume * 100)}%`, 'polite');
            }

            return newVolume;
        }
        return null;
    }

    cycleQuality(reverse = false) {
        const qualities = ['auto', 'high', 'medium', 'low'];
        const currentQuality = this.settings.videoQuality || 'auto';
        const currentIndex = qualities.indexOf(currentQuality);

        let nextIndex;
        if (reverse) {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : qualities.length - 1;
        } else {
            nextIndex = currentIndex < qualities.length - 1 ? currentIndex + 1 : 0;
        }

        const newQuality = qualities[nextIndex];
        this.setVideoQuality(newQuality);

        // Show feedback
        if (this.keyboardShortcuts) {
            this.keyboardShortcuts.showShortcutFeedback(`Quality: ${newQuality}`);
        }

        // Announce to screen reader
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce(`Video quality changed to ${newQuality}`, 'polite');
        }

        return newQuality;
    }

    muteAllParticipants() {
        // Implementation would depend on participant management system
        if (this.keyboardShortcuts) {
            this.keyboardShortcuts.showShortcutFeedback('All participants muted');
        }

        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce('All participants have been muted', 'polite');
        }

        this.onParticipantsAction('mute-all');
    }

    unmuteAllParticipants() {
        // Implementation would depend on participant management system
        if (this.keyboardShortcuts) {
            this.keyboardShortcuts.showShortcutFeedback('All participants unmuted');
        }

        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce('All participants have been unmuted', 'polite');
        }

        this.onParticipantsAction('unmute-all');
    }

    toggleControlsVisibility() {
        this.controlsVisible = !this.controlsVisible;

        if (this.controlsVisible) {
            this.showControls();
        } else {
            this.hideControls();
        }

        // Show feedback
        if (this.keyboardShortcuts) {
            this.keyboardShortcuts.showShortcutFeedback(`Controls ${this.controlsVisible ? 'shown' : 'hidden'}`);
        }

        return this.controlsVisible;
    }

    toggleParticipantsPanel() {
        const panel = this.container.querySelector('.participants-panel, .participants-list');
        if (panel) {
            const isVisible = panel.style.display !== 'none';
            panel.style.display = isVisible ? 'none' : '';

            // Show feedback
            if (this.keyboardShortcuts) {
                this.keyboardShortcuts.showShortcutFeedback(`Participants panel ${isVisible ? 'hidden' : 'shown'}`);
            }

            return !isVisible;
        }
        return false;
    }

    toggleSettingsPanel() {
        const panel = this.container.querySelector('.settings-panel, .settings-container');
        if (panel) {
            const isVisible = panel.style.display !== 'none';
            panel.style.display = isVisible ? 'none' : '';

            // Show feedback
            if (this.keyboardShortcuts) {
                this.keyboardShortcuts.showShortcutFeedback(`Settings panel ${isVisible ? 'hidden' : 'shown'}`);
            }

            return !isVisible;
        }
        return false;
    }

    cycleLayouts() {
        const layouts = ['spotlight', 'grid', 'sidebar', 'presentation'];
        const currentLayout = this.currentLayout || 'spotlight';
        const currentIndex = layouts.indexOf(currentLayout);
        const nextIndex = (currentIndex + 1) % layouts.length;

        this.changeLayout(layouts[nextIndex]);
        return layouts[nextIndex];
    }

    // Navigation methods
    goToSettings() {
        // Implementation would depend on routing system
        if (this.keyboardShortcuts) {
            this.keyboardShortcuts.showShortcutFeedback('Navigating to settings');
        }

        this.onNavigate('settings');
    }

    goToHome() {
        // Implementation would depend on routing system
        if (this.keyboardShortcuts) {
            this.keyboardShortcuts.showShortcutFeedback('Navigating to home');
        }

        this.onNavigate('home');
    }

    goToDashboard() {
        // Implementation would depend on routing system
        if (this.keyboardShortcuts) {
            this.keyboardShortcuts.showShortcutFeedback('Navigating to dashboard');
        }

        this.onNavigate('dashboard');
    }

    /**
     * Accessibility event handlers
     */
    handleAccessibilityChange(detail) {
        const { feature, enabled, settings } = detail;

        // Update streaming interface settings
        this.settings[`accessibility${feature.charAt(0).toUpperCase() + feature.slice(1)}`] = enabled;
        this.saveSettings();

        // Apply accessibility-specific UI changes
        this.updateAccessibilityUI(feature, enabled);

        // Notify about accessibility change
        this.onAccessibilityChange(feature, enabled, settings);
    }

    updateAccessibilityUI(feature, enabled) {
        switch (feature) {
            case 'highContrast':
                if (enabled) {
                    this.container.classList.add('accessibility-high-contrast');
                } else {
                    this.container.classList.remove('accessibility-high-contrast');
                }
                break;

            case 'largerClickTargets':
                if (enabled) {
                    this.container.classList.add('accessibility-large-targets');
                } else {
                    this.container.classList.remove('accessibility-large-targets');
                }
                break;

            case 'simplifiedInterface':
                if (enabled) {
                    this.container.classList.add('accessibility-simplified');
                    this.hideNonEssentialElements();
                } else {
                    this.container.classList.remove('accessibility-simplified');
                    this.showAllElements();
                }
                break;

            case 'visualIndicators':
                if (enabled) {
                    this.container.classList.add('accessibility-visual-indicators');
                } else {
                    this.container.classList.remove('accessibility-visual-indicators');
                }
                break;
        }
    }

    hideNonEssentialElements() {
        // Hide decorative elements in simplified mode
        const decorativeElements = this.container.querySelectorAll('.decorative, .non-essential, .animation-only');
        decorativeElements.forEach(element => {
            element.style.display = 'none';
            element.setAttribute('aria-hidden', 'true');
        });
    }

    showAllElements() {
        // Show all elements when leaving simplified mode
        const hiddenElements = this.container.querySelectorAll('[style*="display: none"]');
        hiddenElements.forEach(element => {
            if (element.classList.contains('decorative') || element.classList.contains('non-essential')) {
                element.style.display = '';
                element.removeAttribute('aria-hidden');
            }
        });
    }

    /**
     * Theme event handlers
     */
    handleThemeChange(detail) {
        const { newTheme, previousTheme, themeData } = detail;

        // Update settings to reflect theme change
        this.settings.theme = newTheme;
        this.saveSettings();

        // Update UI elements for new theme
        this.updateThemeUI(newTheme, themeData);

        // Animate theme transition if animation system is available
        if (this.animationSystem && this.settings.enableThemeTransitions) {
            this.animateThemeTransition(previousTheme, newTheme);
        }

        // Notify about theme change
        this.onThemeChange(newTheme, previousTheme, themeData);
    }

    updateThemeUI(themeName, themeData) {
        // Update theme-specific UI elements
        const themeIndicators = this.container.querySelectorAll('.theme-indicator');
        themeIndicators.forEach(indicator => {
            indicator.textContent = themeName.charAt(0).toUpperCase() + themeName.slice(1);
        });

        // Update theme toggle buttons
        const themeToggle = this.container.querySelector('.theme-toggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = themeName === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        }

        // Update theme-dependent elements
        this.updateThemeDependentElements(themeName, themeData);
    }

    updateThemeDependentElements(themeName, themeData) {
        // Update video overlay colors
        const videoOverlays = this.container.querySelectorAll('.video-overlay');
        videoOverlays.forEach(overlay => {
            overlay.style.background = themeData?.colors?.overlay || 'rgba(0, 0, 0, 0.8)';
        });

        // Update notification styles
        const notifications = this.container.querySelectorAll('.notification');
        notifications.forEach(notification => {
            notification.style.background = themeData?.colors?.surface || '#1a1a1a';
            notification.style.borderColor = themeData?.colors?.border || '#444444';
        });

        // Update control button styles for better theme integration
        const controlButtons = this.container.querySelectorAll('.control-btn');
        controlButtons.forEach(button => {
            if (button.classList.contains('active')) {
                button.style.background = themeData?.colors?.primary || '#FF0000';
            }
        });
    }

    animateThemeTransition(previousTheme, newTheme) {
        // Create a smooth theme transition animation
        const transitionOverlay = document.createElement('div');
        transitionOverlay.className = 'theme-transition-overlay';
        transitionOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: var(--streaming-background);
            opacity: 0;
            z-index: 1000;
            pointer-events: none;
            transition: opacity 0.3s ease;
        `;

        this.container.appendChild(transitionOverlay);

        // Animate transition
        requestAnimationFrame(() => {
            transitionOverlay.style.opacity = '0.5';

            setTimeout(() => {
                transitionOverlay.style.opacity = '0';
                setTimeout(() => {
                    if (transitionOverlay.parentNode) {
                        transitionOverlay.parentNode.removeChild(transitionOverlay);
                    }
                }, 300);
            }, 150);
        });
    }

    /**
     * Theme control methods
     */
    setTheme(themeName) {
        if (this.themeSystem) {
            this.themeSystem.setTheme(themeName);
        } else {
            // Fallback to legacy theme system
            this.currentTheme = themeName;
            this.settings.theme = themeName;
            this.applyTheme();
            this.saveSettings();
        }
    }

    toggleTheme() {
        if (this.themeSystem) {
            return this.themeSystem.toggleTheme();
        } else {
            // Fallback to legacy theme toggle
            const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
            this.setTheme(newTheme);
            return newTheme;
        }
    }

    getCurrentTheme() {
        if (this.themeSystem) {
            return this.themeSystem.getCurrentTheme();
        } else {
            return {
                name: this.currentTheme,
                data: this.themes[this.currentTheme]
            };
        }
    }

    getAvailableThemes() {
        if (this.themeSystem) {
            return this.themeSystem.getAvailableThemes();
        } else {
            return Object.keys(this.themes).map(key => ({
                key,
                name: this.themes[key].name,
                type: key
            }));
        }
    }

    addCustomTheme(key, themeData) {
        if (this.themeSystem) {
            this.themeSystem.addCustomTheme(key, themeData);
        } else {
            this.themes[key] = themeData;
        }
    }

    exportTheme(themeName) {
        if (this.themeSystem) {
            return this.themeSystem.exportTheme(themeName);
        } else {
            return this.themes[themeName];
        }
    }

    /**
     * Responsive event handlers
     */
    handleResponsiveResize(detail) {
        const { device } = detail;

        // Adjust layout based on device type
        if (device.type === 'mobile' && this.layoutMode === 'grid') {
            this.changeLayout('spotlight');
        } else if (device.type === 'tablet' && this.layoutMode === 'sidebar') {
            this.changeLayout('grid');
        }

        // Update UI elements for device
        this.updateResponsiveUI(device);

        // Notify about device change
        this.onDeviceChange(device);
    }

    handleOrientationChange(detail) {
        const { orientation, device } = detail;

        // Handle mobile landscape optimizations
        if (device.type === 'mobile' && orientation === 'landscape') {
            this.optimizeForMobileLandscape();
        } else {
            this.resetMobileLandscapeOptimizations();
        }

        // Update layout if needed
        this.updateLayoutForOrientation(orientation);

        // Notify about orientation change
        this.onOrientationChange(orientation, device);
    }

    handleKeyboardChange(detail) {
        const { visible, height, device } = detail;

        if (visible) {
            // Adjust interface for virtual keyboard
            this.adjustForVirtualKeyboard(height);
        } else {
            // Reset interface when keyboard is hidden
            this.resetVirtualKeyboardAdjustments();
        }

        // Notify about keyboard state change
        this.onKeyboardChange(visible, height);
    }

    handleGesture(detail) {
        const { type, device } = detail;

        switch (type) {
            case 'swipe-left':
                if (this.chatVisible) {
                    this.toggleChat();
                }
                break;
            case 'swipe-right':
                if (!this.chatVisible) {
                    this.toggleChat();
                }
                break;
            case 'swipe-up':
                this.minimizeInterface();
                break;
            case 'swipe-down':
                this.expandInterface();
                break;
        }

        // Notify about gesture
        this.onGesture(type, device);
    }

    /**
     * Responsive UI update methods
     */
    updateResponsiveUI(device) {
        // Update control sizes based on device
        const controls = this.container.querySelectorAll('.control-btn');

        if (device.type === 'mobile') {
            controls.forEach(control => {
                control.classList.add('mobile-size');
            });
        } else {
            controls.forEach(control => {
                control.classList.remove('mobile-size');
            });
        }

        // Update sidebar behavior
        if (device.type === 'mobile') {
            this.container.classList.add('mobile-sidebar');
        } else {
            this.container.classList.remove('mobile-sidebar');
        }
    }

    optimizeForMobileLandscape() {
        this.container.classList.add('mobile-landscape-optimized');

        // Hide less important UI elements
        const secondaryElements = this.container.querySelectorAll('.secondary-ui');
        secondaryElements.forEach(element => {
            element.style.display = 'none';
        });
    }

    resetMobileLandscapeOptimizations() {
        this.container.classList.remove('mobile-landscape-optimized');

        // Show hidden UI elements
        const secondaryElements = this.container.querySelectorAll('.secondary-ui');
        secondaryElements.forEach(element => {
            element.style.display = '';
        });
    }

    updateLayoutForOrientation(orientation) {
        if (orientation === 'landscape') {
            this.container.classList.add('landscape-layout');
            this.container.classList.remove('portrait-layout');
        } else {
            this.container.classList.add('portrait-layout');
            this.container.classList.remove('landscape-layout');
        }
    }

    adjustForVirtualKeyboard(keyboardHeight) {
        // Adjust chat input position
        const chatInput = this.container.querySelector('.chat-input-container');
        if (chatInput) {
            chatInput.style.bottom = `${keyboardHeight}px`;
        }

        // Scroll to keep important content visible
        const activeInput = document.activeElement;
        if (activeInput && activeInput.tagName === 'INPUT') {
            setTimeout(() => {
                activeInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    }

    resetVirtualKeyboardAdjustments() {
        const chatInput = this.container.querySelector('.chat-input-container');
        if (chatInput) {
            chatInput.style.bottom = '';
        }
    }

    minimizeInterface() {
        this.container.classList.add('minimized-interface');

        // Hide non-essential elements
        const nonEssential = this.container.querySelectorAll('.sidebar, .control-bar .additional-controls');
        nonEssential.forEach(element => {
            element.style.display = 'none';
        });
    }

    expandInterface() {
        this.container.classList.remove('minimized-interface');

        // Show hidden elements
        const hidden = this.container.querySelectorAll('.sidebar, .control-bar .additional-controls');
        hidden.forEach(element => {
            element.style.display = '';
        });
    }

    /**
     * Public API methods
     */
    setWebSocket(websocket) {
        this.websocket = websocket;
        if (websocket) {
            this.attachWebSocketListeners();
        }
    }

    setUserInfo(userId, userRole) {
        this.currentUserId = userId;
        this.currentUserRole = userRole;
    }

    setResponsiveSystem(responsiveSystem) {
        this.responsiveSystem = responsiveSystem;
    }

    getResponsiveSystem() {
        return this.responsiveSystem;
    }

    getDeviceInfo() {
        return this.responsiveSystem ? this.responsiveSystem.getDevice() : null;
    }

    isResponsiveMode() {
        return !!this.responsiveSystem;
    }

    setThemeSystem(themeSystem) {
        this.themeSystem = themeSystem;
    }

    getThemeSystem() {
        return this.themeSystem;
    }

    isThemeSystemEnabled() {
        return !!this.themeSystem;
    }

    setAccessibilitySystem(accessibilitySystem) {
        this.accessibilitySystem = accessibilitySystem;
    }

    getAccessibilitySystem() {
        return this.accessibilitySystem;
    }

    isAccessibilitySystemEnabled() {
        return !!this.accessibilitySystem;
    }

    // Accessibility feature controls
    toggleAccessibilityFeature(feature, value = null) {
        if (this.accessibilitySystem) {
            return this.accessibilitySystem.toggleFeature(feature, value);
        }
        return false;
    }

    setKeyboardShortcuts(keyboardShortcuts) {
        this.keyboardShortcuts = keyboardShortcuts;
    }

    getKeyboardShortcuts() {
        return this.keyboardShortcuts;
    }

    isKeyboardShortcutsEnabled() {
        return !!this.keyboardShortcuts && this.keyboardShortcuts.isShortcutsEnabled();
    }

    // Keyboard shortcuts management
    addCustomShortcut(keyCombo, callback, description, category = 'custom') {
        if (this.keyboardShortcuts) {
            return this.keyboardShortcuts.addShortcut(keyCombo, callback, description, category, 'streaming');
        }
        return false;
    }

    removeCustomShortcut(keyCombo) {
        if (this.keyboardShortcuts) {
            return this.keyboardShortcuts.removeShortcut(keyCombo, 'streaming');
        }
        return false;
    }

    enableShortcut(keyCombo) {
        if (this.keyboardShortcuts) {
            return this.keyboardShortcuts.enableShortcut(keyCombo, 'streaming');
        }
        return false;
    }

    disableShortcut(keyCombo) {
        if (this.keyboardShortcuts) {
            return this.keyboardShortcuts.disableShortcut(keyCombo, 'streaming');
        }
        return false;
    }

    getStreamingShortcuts() {
        if (this.keyboardShortcuts) {
            return this.keyboardShortcuts.getAllShortcuts('streaming');
        }
        return new Map();
    }

    getShortcutsByCategory(category) {
        if (this.keyboardShortcuts) {
            return this.keyboardShortcuts.getShortcutsByCategory(category, 'streaming');
        }
        return new Map();
    }

    showKeyboardShortcutsHelp() {
        if (this.keyboardShortcuts) {
            this.keyboardShortcuts.showShortcutsHelp();
        }
    }

    hideKeyboardShortcutsHelp() {
        if (this.keyboardShortcuts) {
            this.keyboardShortcuts.hideShortcutsHelp();
        }
    }

    toggleKeyboardShortcuts() {
        if (this.keyboardShortcuts) {
            if (this.keyboardShortcuts.isShortcutsEnabled()) {
                this.keyboardShortcuts.disable();
            } else {
                this.keyboardShortcuts.enable();
            }

            // Update settings
            this.settings.enableKeyboardShortcuts = this.keyboardShortcuts.isShortcutsEnabled();
            this.saveSettings();

            return this.keyboardShortcuts.isShortcutsEnabled();
        }
        return false;
    }

    updateKeyboardShortcutsSettings(settings) {
        if (this.keyboardShortcuts) {
            this.keyboardShortcuts.updateSettings(settings);

            // Update streaming interface settings
            Object.entries(settings).forEach(([key, value]) => {
                this.settings[`shortcut${key.charAt(0).toUpperCase() + key.slice(1)}`] = value;
            });

            this.saveSettings();
        }
    }

    getKeyboardShortcutsSettings() {
        if (this.keyboardShortcuts) {
            return this.keyboardShortcuts.getSettings();
        }
        return {};
    }

    getKeyboardShortcutsStats() {
        if (this.keyboardShortcuts) {
            return this.keyboardShortcuts.getUsageStats();
        }
        return {};
    }

    exportKeyboardShortcuts() {
        if (this.keyboardShortcuts) {
            return this.keyboardShortcuts.exportShortcuts();
        }
        return null;
    }

    importKeyboardShortcuts(data) {
        if (this.keyboardShortcuts) {
            return this.keyboardShortcuts.importShortcuts(data);
        }
        return false;
    }

    resetKeyboardShortcuts() {
        if (this.keyboardShortcuts) {
            this.keyboardShortcuts.resetToDefaults();
            this.registerStreamingShortcuts(); // Re-register streaming shortcuts
        }
    }

    // Shortcut context management
    setShortcutContext(context) {
        if (this.keyboardShortcuts) {
            this.keyboardShortcuts.setContext(context);
        }
    }

    getShortcutContext() {
        if (this.keyboardShortcuts) {
            return this.keyboardShortcuts.getContext();
        }
        return 'global';
    }

    // Event callbacks for keyboard shortcuts
    onShortcutContextChange(oldContext, newContext) {
        // Override in subclasses or set as callback
        this.emit('shortcut-context-change', { oldContext, newContext });
    }

    onParticipantsAction(action) {
        // Override in subclasses or set as callback
        this.emit('participants-action', { action });
    }

    onNavigate(destination) {
        // Override in subclasses or set as callback
        this.emit('navigate', { destination });
    }

    // Customizable Layouts API

    /**
     * Get customizable layouts system
     */
    getCustomizableLayouts() {
        return this.customizableLayouts;
    }

    /**
     * Set customizable layouts system
     */
    setCustomizableLayouts(customizableLayouts) {
        this.customizableLayouts = customizableLayouts;
    }

    // Video Layout System API

    /**
     * Get video layout system
     */
    getVideoLayoutSystem() {
        return this.videoLayoutSystem;
    }

    /**
     * Set video layout system
     */
    setVideoLayoutSystem(videoLayoutSystem) {
        this.videoLayoutSystem = videoLayoutSystem;
    }

    /**
     * Update layout controls
     */
    updateLayoutControls(layoutId) {
        // Update any layout control UI elements
        const layoutButtons = this.container.querySelectorAll('[data-layout]');
        layoutButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.layout === layoutId) {
                btn.classList.add('active');
            }
        });
    }

    /**
     * Update participant count
     */
    updateParticipantCount() {
        if (this.videoLayoutSystem) {
            const count = this.videoLayoutSystem.getParticipants().size;
            const countElement = this.container.querySelector('.participant-count');
            if (countElement) {
                countElement.textContent = count;
            }
        }
    }

    /**
     * Update spotlight indicator
     */
    updateSpotlightIndicator(spotlightParticipant) {
        const indicator = this.container.querySelector('.spotlight-indicator');
        if (indicator) {
            if (spotlightParticipant) {
                indicator.textContent = `Spotlight: ${spotlightParticipant.name}`;
                indicator.style.display = 'block';
            } else {
                indicator.style.display = 'none';
            }
        }
    }

    /**
     * Update pin indicator
     */
    updatePinIndicator(pinnedParticipant) {
        const indicator = this.container.querySelector('.pin-indicator');
        if (indicator) {
            if (pinnedParticipant) {
                indicator.textContent = `Pinned: ${pinnedParticipant.name}`;
                indicator.style.display = 'block';
            } else {
                indicator.style.display = 'none';
            }
        }
    }

    /**
     * Add participant to video layout
     */
    addParticipantToLayout(participantData) {
        if (this.videoLayoutSystem) {
            return this.videoLayoutSystem.addParticipant(participantData);
        }
        return null;
    }

    /**
     * Remove participant from video layout
     */
    removeParticipantFromLayout(participantId) {
        if (this.videoLayoutSystem) {
            return this.videoLayoutSystem.removeParticipant(participantId);
        }
        return false;
    }

    /**
     * Set video layout
     */
    setVideoLayout(layoutId, options = {}) {
        if (this.videoLayoutSystem) {
            return this.videoLayoutSystem.setLayout(layoutId, options);
        }
        return false;
    }

    /**
     * Get current video layout
     */
    getCurrentVideoLayout() {
        if (this.videoLayoutSystem) {
            return this.videoLayoutSystem.getCurrentLayout();
        }
        return null;
    }

    /**
     * Check if customizable layouts are enabled
     */
    isCustomizableLayoutsEnabled() {
        return !!this.customizableLayouts && this.customizableLayouts.isEnabled();
    }

    /**
     * Enable customizable layouts
     */
    enableCustomizableLayouts() {
        if (this.customizableLayouts) {
            this.customizableLayouts.enable();
            this.settings.enableCustomLayouts = true;
            this.saveSettings();
        }
    }

    /**
     * Disable customizable layouts
     */
    disableCustomizableLayouts() {
        if (this.customizableLayouts) {
            this.customizableLayouts.disable();
            this.settings.enableCustomLayouts = false;
            this.saveSettings();
        }
    }

    /**
     * Set layout
     */
    setStreamingLayout(layoutId, options = {}) {
        if (this.customizableLayouts) {
            return this.customizableLayouts.setLayout(layoutId, options);
        }

        // Fallback to original layout system
        this.changeLayout(layoutId);
        return true;
    }

    /**
     * Get current layout
     */
    getCurrentStreamingLayout() {
        if (this.customizableLayouts) {
            return this.customizableLayouts.getCurrentLayout();
        }

        // Fallback to original layout system
        return {
            id: this.layoutMode,
            name: this.layoutMode,
            type: 'built-in'
        };
    }

    /**
     * Get current layout ID
     */
    getCurrentLayoutId() {
        if (this.customizableLayouts) {
            return this.customizableLayouts.getCurrentLayoutId();
        }

        return this.layoutMode;
    }

    /**
     * Get all available layouts
     */
    getAllStreamingLayouts() {
        if (this.customizableLayouts) {
            return this.customizableLayouts.getAllLayouts();
        }

        // Fallback to original layout options
        const layouts = new Map();
        this.layoutOptions.forEach(option => {
            layouts.set(option.value, {
                id: option.value,
                name: option.label,
                icon: option.icon,
                type: 'built-in'
            });
        });
        return layouts;
    }

    /**
     * Create new custom layout
     */
    createCustomLayout(template = null) {
        if (this.customizableLayouts) {
            return this.customizableLayouts.createNewLayout(template);
        }
        return null;
    }

    /**
     * Edit layout
     */
    editStreamingLayout(layoutId) {
        if (this.customizableLayouts) {
            return this.customizableLayouts.editLayout(layoutId);
        }
        return false;
    }

    /**
     * Duplicate layout
     */
    duplicateStreamingLayout(layoutId) {
        if (this.customizableLayouts) {
            return this.customizableLayouts.duplicateLayout(layoutId);
        }
        return null;
    }

    /**
     * Delete custom layout
     */
    deleteCustomLayout(layoutId) {
        if (this.customizableLayouts) {
            return this.customizableLayouts.deleteLayout(layoutId);
        }
        return false;
    }

    /**
     * Validate layout
     */
    validateStreamingLayout(layout) {
        if (this.customizableLayouts) {
            return this.customizableLayouts.validateLayout(layout);
        }
        return { valid: true, issues: [] };
    }

    /**
     * Show layout manager
     */
    showLayoutManager() {
        if (this.customizableLayouts) {
            this.customizableLayouts.showLayoutManager();
        }
    }

    /**
     * Show layout editor
     */
    showLayoutEditor(layoutId = null) {
        if (this.customizableLayouts) {
            const targetLayoutId = layoutId || this.getCurrentLayoutId();
            this.customizableLayouts.editLayout(targetLayoutId);
        }
    }

    /**
     * Export layout
     */
    exportStreamingLayout(layoutId) {
        if (this.customizableLayouts) {
            return this.customizableLayouts.exportLayout(layoutId);
        }
        return null;
    }

    /**
     * Import layout
     */
    importStreamingLayout(data) {
        if (this.customizableLayouts) {
            return this.customizableLayouts.importLayout(data);
        }
        return null;
    }

    /**
     * Get layout statistics
     */
    getLayoutStats() {
        if (this.customizableLayouts) {
            return this.customizableLayouts.getLayoutStats();
        }

        return {
            totalLayouts: this.layoutOptions.length,
            builtInLayouts: this.layoutOptions.length,
            customLayouts: 0,
            currentLayout: this.layoutMode,
            layoutHistory: 0,
            isEditing: false,
            isTransitioning: false
        };
    }

    /**
     * Update customizable layouts settings
     */
    updateLayoutsSettings(settings) {
        if (this.customizableLayouts) {
            this.customizableLayouts.updateSettings(settings);

            // Update streaming interface settings
            Object.entries(settings).forEach(([key, value]) => {
                this.settings[`layout${key.charAt(0).toUpperCase() + key.slice(1)}`] = value;
            });

            this.saveSettings();
        }
    }

    /**
     * Get customizable layouts settings
     */
    getLayoutsSettings() {
        if (this.customizableLayouts) {
            return this.customizableLayouts.getSettings();
        }
        return {};
    }

    updateAccessibilitySettings(settings) {
        if (this.accessibilitySystem) {
            this.accessibilitySystem.updateSettings(settings);

            // Update streaming interface settings
            Object.entries(settings).forEach(([key, value]) => {
                this.settings[`accessibility${key.charAt(0).toUpperCase() + key.slice(1)}`] = value;
            });

            this.saveSettings();
        }
    }

    getAccessibilitySettings() {
        if (this.accessibilitySystem) {
            return this.accessibilitySystem.getSettings();
        }
        return {};
    }

    announceToScreenReader(message, priority = 'polite', delay = 0) {
        if (this.accessibilitySystem) {
            return this.accessibilitySystem.announce(message, priority, delay);
        }
    }

    runAccessibilityComplianceCheck() {
        if (this.accessibilitySystem) {
            return this.accessibilitySystem.runComplianceCheck();
        }
        return null;
    }

    focusElement(element, options = {}) {
        if (this.accessibilitySystem) {
            return this.accessibilitySystem.focusElement(element, options);
        } else {
            // Fallback focus
            if (element && element.focus) {
                element.focus();
                if (options.scroll !== false) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    }

    trapFocus(container) {
        if (this.accessibilitySystem) {
            return this.accessibilitySystem.trapFocus(container);
        }
    }

    restoreFocus() {
        if (this.accessibilitySystem) {
            return this.accessibilitySystem.restoreFocus();
        }
    }

    checkElementContrast(element) {
        if (this.accessibilitySystem) {
            return this.accessibilitySystem.checkElementContrast(element);
        }
        return null;
    }

    validateAllContrast() {
        if (this.accessibilitySystem) {
            return this.accessibilitySystem.validateAllContrast();
        }
        return [];
    }

    simulateColorBlindness(type) {
        if (this.accessibilitySystem) {
            return this.accessibilitySystem.simulateColorBlindness(type);
        }
    }

    removeColorBlindnessSimulation() {
        if (this.accessibilitySystem) {
            return this.accessibilitySystem.removeColorBlindnessSimulation();
        }
    }

    getKeyboardShortcuts(context = null) {
        if (this.accessibilitySystem) {
            return this.accessibilitySystem.getKeyboardShortcuts(context);
        }
        return new Map();
    }

    registerKeyboardShortcut(key, callback, description, context = 'streaming') {
        if (this.accessibilitySystem) {
            return this.accessibilitySystem.registerShortcut(key, callback, description, context);
        }
    }

    getHeadingStructure() {
        if (this.accessibilitySystem) {
            return this.accessibilitySystem.getHeadingStructure();
        }
        return [];
    }

    getLandmarks() {
        if (this.accessibilitySystem) {
            return this.accessibilitySystem.getLandmarks();
        }
        return [];
    }

    isKeyboardUser() {
        if (this.accessibilitySystem) {
            return this.accessibilitySystem.isKeyboardUser();
        }
        return false;
    }
    
    setRoomId(roomId) {
        this.roomId = roomId;
    }
    
    getStreamState() {
        return {
            isStreaming: this.isStreaming,
            isRecording: this.isRecording,
            isPaused: this.isPaused,
            streamId: this.streamId,
            viewerCount: this.viewerCount,
            streamDuration: this.streamDuration,
            recordingDuration: this.recordingDuration,
            layoutMode: this.layoutMode,
            streamConfig: this.streamConfig,
            streamStats: this.streamStats
        };
    }
    
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
        
        // Apply relevant settings
        if (newSettings.theme) {
            this.currentTheme = newSettings.theme;
            this.applyTheme();
        }
        
        if (newSettings.defaultLayout) {
            this.changeLayout(newSettings.defaultLayout);
        }
        
        if (newSettings.defaultQuality) {
            this.changeQuality(newSettings.defaultQuality);
        }
    }
    
    /**
     * Destroy the interface
     */
    destroy() {
        // Clear timers
        if (this.streamTimer) clearInterval(this.streamTimer);
        if (this.recordingTimer) clearInterval(this.recordingTimer);
        if (this.controlsTimer) clearTimeout(this.controlsTimer);
        if (this.statsUpdateTimer) clearInterval(this.statsUpdateTimer);
        
        // Stop streaming if active
        if (this.isStreaming) {
            this.stopStream();
        }
        
        // Clean up media
        this.cleanupMedia();
        
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyboardShortcuts);
        
        // Clear container
        if (this.container) {
            this.container.innerHTML = '';
        }
    }

    // API Methods for Video Quality System

    /**
     * Get current video quality
     */
    getCurrentVideoQuality() {
        return this.videoQualitySystem ? this.videoQualitySystem.getCurrentQuality() : null;
    }

    /**
     * Set video quality
     */
    setVideoQuality(quality, options = {}) {
        if (this.videoQualitySystem) {
            return this.videoQualitySystem.setQuality(quality, options);
        }
        return false;
    }

    /**
     * Get available video qualities
     */
    getAvailableVideoQualities() {
        return this.videoQualitySystem ? this.videoQualitySystem.getAvailableQualities() : [];
    }

    /**
     * Get video quality profiles
     */
    getVideoQualityProfiles() {
        return this.videoQualitySystem ? this.videoQualitySystem.getQualityProfiles() : null;
    }

    /**
     * Enable/disable adaptive streaming
     */
    setAdaptiveStreaming(enabled) {
        if (this.videoQualitySystem) {
            this.videoQualitySystem.setAdaptiveStreaming(enabled);
        }
    }

    /**
     * Enable/disable data saver mode
     */
    setDataSaverMode(enabled) {
        if (this.videoQualitySystem) {
            this.videoQualitySystem.setDataSaverMode(enabled);
        }
    }

    /**
     * Set quality priority
     */
    setQualityPriority(priority) {
        if (this.videoQualitySystem) {
            this.videoQualitySystem.setQualityPriority(priority);
        }
    }

    /**
     * Get network statistics
     */
    getNetworkStats() {
        return this.videoQualitySystem ? this.videoQualitySystem.getNetworkStats() : null;
    }

    /**
     * Get video performance statistics
     */
    getVideoPerformanceStats() {
        return this.videoQualitySystem ? this.videoQualitySystem.getPerformanceStats() : null;
    }

    /**
     * Get quality change history
     */
    getQualityHistory() {
        return this.videoQualitySystem ? this.videoQualitySystem.getQualityHistory() : [];
    }

    /**
     * Force quality check
     */
    forceVideoQualityCheck() {
        if (this.videoQualitySystem) {
            this.videoQualitySystem.forceQualityCheck();
        }
    }

    /**
     * Reset video quality statistics
     */
    resetVideoQualityStats() {
        if (this.videoQualitySystem) {
            this.videoQualitySystem.resetStatistics();
        }
    }

    /**
     * Add video element to quality monitoring
     */
    addVideoElementToQualitySystem(videoElement, participantId) {
        if (this.videoQualitySystem) {
            this.videoQualitySystem.addVideoElement(videoElement, participantId);
        }
    }

    /**
     * Remove video element from quality monitoring
     */
    removeVideoElementFromQualitySystem(videoElement) {
        if (this.videoQualitySystem) {
            this.videoQualitySystem.removeVideoElement(videoElement);
        }
    }

    // Screen Sharing API Methods

    /**
     * Start screen sharing
     */
    startScreenSharing(sourceType = null) {
        if (this.screenSharingSystem) {
            return this.screenSharingSystem.startScreenSharing(sourceType);
        }
        return Promise.reject(new Error('Screen sharing system not available'));
    }

    /**
     * Stop screen sharing
     */
    stopScreenSharing() {
        if (this.screenSharingSystem) {
            return this.screenSharingSystem.stopScreenSharing();
        }
        return Promise.reject(new Error('Screen sharing system not available'));
    }

    /**
     * Toggle screen sharing
     */
    toggleScreenSharing() {
        if (this.screenSharingSystem) {
            const status = this.screenSharingSystem.getSharingStatus();
            if (status.isSharing) {
                return this.stopScreenSharing();
            } else {
                return this.startScreenSharing();
            }
        }
        return Promise.reject(new Error('Screen sharing system not available'));
    }

    /**
     * Get screen sharing status
     */
    getScreenSharingStatus() {
        return this.screenSharingSystem ? this.screenSharingSystem.getSharingStatus() : null;
    }

    /**
     * Toggle annotations
     */
    toggleAnnotations() {
        if (this.screenSharingSystem) {
            this.screenSharingSystem.toggleAnnotations();
        }
    }

    /**
     * Select annotation tool
     */
    selectAnnotationTool(tool) {
        if (this.screenSharingSystem) {
            this.screenSharingSystem.selectTool(tool);
        }
    }

    /**
     * Get annotations
     */
    getAnnotations() {
        return this.screenSharingSystem ? this.screenSharingSystem.getAnnotations() : [];
    }

    /**
     * Load annotations
     */
    loadAnnotations(annotationsData) {
        if (this.screenSharingSystem) {
            return this.screenSharingSystem.loadAnnotations(annotationsData);
        }
        return false;
    }

    /**
     * Clear all annotations
     */
    clearAllAnnotations() {
        if (this.screenSharingSystem) {
            this.screenSharingSystem.clearAllAnnotations();
        }
    }

    /**
     * Save annotations
     */
    saveAnnotations() {
        if (this.screenSharingSystem) {
            this.screenSharingSystem.saveAnnotations();
        }
    }

    /**
     * Undo last annotation
     */
    undoAnnotation() {
        if (this.screenSharingSystem) {
            this.screenSharingSystem.undoAnnotation();
        }
    }

    /**
     * Get screen sharing performance stats
     */
    getScreenSharingStats() {
        return this.screenSharingSystem ? this.screenSharingSystem.getPerformanceStats() : null;
    }

    /**
     * Get current screen sharing stream
     */
    getCurrentScreenStream() {
        return this.screenSharingSystem ? this.screenSharingSystem.getCurrentStream() : null;
    }

    /**
     * Update screen sharing UI
     */
    updateScreenSharingUI(isSharing) {
        // Update any UI elements that show screen sharing status
        const screenShareBtn = this.container.querySelector('#screen-share-btn');
        if (screenShareBtn) {
            if (isSharing) {
                screenShareBtn.classList.add('active');
                screenShareBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Sharing';
            } else {
                screenShareBtn.classList.remove('active');
                screenShareBtn.innerHTML = '<i class="fas fa-desktop"></i> Share Screen';
            }
        }

        // Update screen sharing indicator
        const indicator = this.container.querySelector('.screen-sharing-indicator');
        if (indicator) {
            indicator.style.display = isSharing ? 'flex' : 'none';
        }

        // Update accessibility announcements
        if (this.accessibilitySystem) {
            const status = isSharing ? 'Screen sharing active' : 'Screen sharing inactive';
            this.accessibilitySystem.updateLiveRegion(status);
        }
    }

    /**
     * Log screen sharing event
     */
    logScreenSharingEvent(action, data) {
        const event = {
            type: 'screen_sharing',
            action: action,
            timestamp: Date.now(),
            userId: this.currentUserId,
            roomId: this.roomId,
            data: data
        };

        console.log('Screen sharing event:', event);

        // Send to analytics if available
        if (this.analytics) {
            this.analytics.track('screen_sharing_event', event);
        }

        // Send to server if websocket available
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'screen_sharing_event',
                ...event
            }));
        }
    }

    /**
     * Log annotation event
     */
    logAnnotationEvent(action, data) {
        const event = {
            type: 'annotation',
            action: action,
            timestamp: Date.now(),
            userId: this.currentUserId,
            roomId: this.roomId,
            data: data
        };

        console.log('Annotation event:', event);

        // Send to analytics if available
        if (this.analytics) {
            this.analytics.track('annotation_event', event);
        }

        // Send to server if websocket available
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'annotation_event',
                ...event
            }));
        }
    }

    /**
     * Update quality indicators
     */
    updateQualityIndicators(qualityData) {
        // Update any UI elements that show quality status
        const qualityIndicators = this.container.querySelectorAll('.quality-indicator');
        qualityIndicators.forEach(indicator => {
            const qualityText = indicator.querySelector('.quality-text');
            if (qualityText) {
                qualityText.textContent = qualityData.newQuality === 'auto' ? 'Auto' : qualityData.newQuality;
            }
        });
    }

    /**
     * Update network indicators
     */
    updateNetworkIndicators(networkData) {
        // Update network status indicators
        const networkIndicators = this.container.querySelectorAll('.network-indicator');
        networkIndicators.forEach(indicator => {
            indicator.className = `network-indicator ${networkData.condition}`;
            const indicatorText = indicator.querySelector('.indicator-text');
            if (indicatorText) {
                indicatorText.textContent = networkData.condition.charAt(0).toUpperCase() + networkData.condition.slice(1);
            }
        });
    }

    /**
     * Handle performance warnings
     */
    handlePerformanceWarning(warningData) {
        console.warn('Video performance warning:', warningData);

        // Show performance warning to user
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce(
                `Video performance warning: ${warningData.message}`,
                'assertive'
            );
        }

        // Log warning for analytics
        this.logPerformanceWarning(warningData);
    }

    /**
     * Log quality change for analytics
     */
    logQualityChange(qualityData) {
        // Log quality change event for analytics
        if (window.analytics) {
            window.analytics.track('Video Quality Changed', {
                previousQuality: qualityData.previousQuality,
                newQuality: qualityData.newQuality,
                reason: qualityData.reason,
                networkBandwidth: qualityData.networkStats?.bandwidth,
                networkLatency: qualityData.networkStats?.latency,
                timestamp: qualityData.timestamp
            });
        }
    }

    /**
     * Log performance warning for analytics
     */
    logPerformanceWarning(warningData) {
        // Log performance warning for analytics
        if (window.analytics) {
            window.analytics.track('Video Performance Warning', {
                warningType: warningData.type,
                message: warningData.message,
                severity: warningData.severity,
                timestamp: Date.now()
            });
        }
    }

    // Recording Controls API Methods

    /**
     * Start recording
     */
    async startRecording() {
        if (this.recordingControlsSystem) {
            return await this.recordingControlsSystem.startRecording();
        }
        console.warn('Recording controls system not available');
    }

    /**
     * Stop recording
     */
    async stopRecording() {
        if (this.recordingControlsSystem) {
            return await this.recordingControlsSystem.stopRecording();
        }
        console.warn('Recording controls system not available');
    }

    /**
     * Pause recording
     */
    pauseRecording() {
        if (this.recordingControlsSystem) {
            return this.recordingControlsSystem.pauseRecording();
        }
        console.warn('Recording controls system not available');
    }

    /**
     * Resume recording
     */
    resumeRecording() {
        if (this.recordingControlsSystem) {
            return this.recordingControlsSystem.resumeRecording();
        }
        console.warn('Recording controls system not available');
    }

    /**
     * Toggle recording
     */
    async toggleRecording() {
        if (this.recordingControlsSystem) {
            const status = this.recordingControlsSystem.getRecordingStatus();
            if (status.isRecording) {
                return await this.stopRecording();
            } else {
                return await this.startRecording();
            }
        }
        console.warn('Recording controls system not available');
    }

    /**
     * Get recording status
     */
    getRecordingStatus() {
        if (this.recordingControlsSystem) {
            return this.recordingControlsSystem.getRecordingStatus();
        }
        return null;
    }

    /**
     * Toggle live editing mode
     */
    toggleLiveEditing() {
        if (this.recordingControlsSystem) {
            return this.recordingControlsSystem.toggleLiveEditing();
        }
        console.warn('Recording controls system not available');
    }

    /**
     * Add marker to timeline
     */
    addMarker() {
        if (this.recordingControlsSystem) {
            return this.recordingControlsSystem.addMarker();
        }
        console.warn('Recording controls system not available');
    }

    /**
     * Split clip at current position
     */
    splitClip() {
        if (this.recordingControlsSystem) {
            return this.recordingControlsSystem.splitClip();
        }
        console.warn('Recording controls system not available');
    }

    /**
     * Add transition effect
     */
    addTransition() {
        if (this.recordingControlsSystem) {
            return this.recordingControlsSystem.addTransition();
        }
        console.warn('Recording controls system not available');
    }

    /**
     * Apply real-time effect
     */
    applyRealTimeEffect(effectType, value) {
        if (this.recordingControlsSystem) {
            return this.recordingControlsSystem.applyRealTimeEffect(effectType, value);
        }
        console.warn('Recording controls system not available');
    }

    /**
     * Get recording performance statistics
     */
    getRecordingStats() {
        if (this.recordingControlsSystem) {
            return this.recordingControlsSystem.getPerformanceStats();
        }
        return null;
    }

    /**
     * Get editing timeline
     */
    getEditingTimeline() {
        if (this.recordingControlsSystem) {
            return this.recordingControlsSystem.getEditingTimeline();
        }
        return [];
    }

    /**
     * Get live effects
     */
    getLiveEffects() {
        if (this.recordingControlsSystem) {
            return this.recordingControlsSystem.getLiveEffects();
        }
        return new Map();
    }

    /**
     * Set recording quality
     */
    setRecordingQuality(quality) {
        if (this.recordingControlsSystem) {
            return this.recordingControlsSystem.setRecordingQuality(quality);
        }
        console.warn('Recording controls system not available');
    }

    /**
     * Set recording format
     */
    setRecordingFormat(format) {
        if (this.recordingControlsSystem) {
            return this.recordingControlsSystem.setRecordingFormat(format);
        }
        console.warn('Recording controls system not available');
    }

    /**
     * Update recording UI
     */
    updateRecordingUI(isRecording) {
        // Update any existing recording UI elements
        const recordingIndicators = this.container.querySelectorAll('.recording-indicator');
        recordingIndicators.forEach(indicator => {
            if (isRecording) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        });

        // Update recording buttons
        const recordingButtons = this.container.querySelectorAll('.recording-btn');
        recordingButtons.forEach(button => {
            if (isRecording) {
                button.classList.add('recording');
            } else {
                button.classList.remove('recording');
            }
        });
    }

    /**
     * Log recording event
     */
    logRecordingEvent(action, data) {
        const event = {
            timestamp: new Date().toISOString(),
            action: action,
            data: data,
            type: 'recording'
        };

        console.log('Recording Event:', event);

        // Store in session storage for debugging
        const events = JSON.parse(sessionStorage.getItem('recording_events') || '[]');
        events.push(event);
        sessionStorage.setItem('recording_events', JSON.stringify(events.slice(-100))); // Keep last 100 events
    }

    /**
     * Log editing event
     */
    logEditingEvent(action, data) {
        const event = {
            timestamp: new Date().toISOString(),
            action: action,
            data: data,
            type: 'editing'
        };

        console.log('Editing Event:', event);

        // Store in session storage for debugging
        const events = JSON.parse(sessionStorage.getItem('editing_events') || '[]');
        events.push(event);
        sessionStorage.setItem('editing_events', JSON.stringify(events.slice(-100))); // Keep last 100 events
    }

    // Video Effects API Methods

    /**
     * Apply video effect
     */
    applyVideoEffect(effectName, parameters = {}) {
        if (!this.videoEffectsSystem) {
            console.warn('Video effects system not initialized');
            return false;
        }

        try {
            // Enable the effect
            this.videoEffectsSystem.toggleEffect(effectName, true);

            // Set parameters if provided
            Object.entries(parameters).forEach(([paramName, value]) => {
                this.videoEffectsSystem.updateEffectParameter(paramName, value);
            });

            console.log(`Applied video effect: ${effectName}`, parameters);

            this.logVideoEffectsEvent('effect-applied', {
                effectName,
                parameters
            });

            return true;

        } catch (error) {
            console.error('Failed to apply video effect:', error);
            return false;
        }
    }

    /**
     * Remove video effect
     */
    removeVideoEffect(effectName) {
        if (!this.videoEffectsSystem) {
            console.warn('Video effects system not initialized');
            return false;
        }

        try {
            this.videoEffectsSystem.toggleEffect(effectName, false);

            console.log(`Removed video effect: ${effectName}`);

            this.logVideoEffectsEvent('effect-removed', {
                effectName
            });

            return true;

        } catch (error) {
            console.error('Failed to remove video effect:', error);
            return false;
        }
    }

    /**
     * Clear all video effects
     */
    clearAllVideoEffects() {
        if (!this.videoEffectsSystem) {
            console.warn('Video effects system not initialized');
            return false;
        }

        try {
            this.videoEffectsSystem.resetAllEffects();

            console.log('Cleared all video effects');

            this.logVideoEffectsEvent('effects-cleared', {});

            return true;

        } catch (error) {
            console.error('Failed to clear video effects:', error);
            return false;
        }
    }

    /**
     * Apply video effects preset
     */
    applyVideoEffectsPreset(presetName) {
        if (!this.videoEffectsSystem) {
            console.warn('Video effects system not initialized');
            return false;
        }

        try {
            this.videoEffectsSystem.applyPreset(presetName);

            console.log(`Applied video effects preset: ${presetName}`);

            this.logVideoEffectsEvent('preset-applied', {
                presetName
            });

            return true;

        } catch (error) {
            console.error('Failed to apply video effects preset:', error);
            return false;
        }
    }

    /**
     * Get active video effects
     */
    getActiveVideoEffects() {
        if (!this.videoEffectsSystem) {
            console.warn('Video effects system not initialized');
            return new Map();
        }

        return this.videoEffectsSystem.getActiveEffects();
    }

    /**
     * Get available video effects
     */
    getAvailableVideoEffects() {
        if (!this.videoEffectsSystem) {
            console.warn('Video effects system not initialized');
            return new Map();
        }

        return this.videoEffectsSystem.getAvailableEffects();
    }

    /**
     * Get video effects statistics
     */
    getVideoEffectsStats() {
        if (!this.videoEffectsSystem) {
            console.warn('Video effects system not initialized');
            return {};
        }

        return this.videoEffectsSystem.getPerformanceStats();
    }

    /**
     * Start video effects processing
     */
    startVideoEffectsProcessing(videoElement) {
        if (!this.videoEffectsSystem) {
            console.warn('Video effects system not initialized');
            return false;
        }

        try {
            this.videoEffectsSystem.startProcessing(videoElement);

            console.log('Started video effects processing');

            this.logVideoEffectsEvent('processing-started', {
                videoWidth: videoElement.videoWidth,
                videoHeight: videoElement.videoHeight
            });

            return true;

        } catch (error) {
            console.error('Failed to start video effects processing:', error);
            return false;
        }
    }

    /**
     * Stop video effects processing
     */
    stopVideoEffectsProcessing() {
        if (!this.videoEffectsSystem) {
            console.warn('Video effects system not initialized');
            return false;
        }

        try {
            this.videoEffectsSystem.stopProcessing();

            console.log('Stopped video effects processing');

            this.logVideoEffectsEvent('processing-stopped', {});

            return true;

        } catch (error) {
            console.error('Failed to stop video effects processing:', error);
            return false;
        }
    }

    /**
     * Get video effects output stream
     */
    getVideoEffectsOutputStream() {
        if (!this.videoEffectsSystem) {
            console.warn('Video effects system not initialized');
            return null;
        }

        return this.videoEffectsSystem.getOutputStream();
    }

    /**
     * Toggle video effects panel
     */
    toggleVideoEffectsPanel() {
        if (!this.videoEffectsSystem) {
            console.warn('Video effects system not initialized');
            return false;
        }

        try {
            this.videoEffectsSystem.toggleEffectsPanel();

            console.log('Toggled video effects panel');

            this.logVideoEffectsEvent('panel-toggled', {});

            return true;

        } catch (error) {
            console.error('Failed to toggle video effects panel:', error);
            return false;
        }
    }

    /**
     * Log video effects event
     */
    logVideoEffectsEvent(action, data) {
        const event = {
            timestamp: new Date().toISOString(),
            action: action,
            data: data,
            type: 'video-effects'
        };

        console.log('Video Effects Event:', event);

        // Store in session storage for debugging
        const events = JSON.parse(sessionStorage.getItem('video_effects_events') || '[]');
        events.push(event);
        sessionStorage.setItem('video_effects_events', JSON.stringify(events.slice(-100))); // Keep last 100 events
    }

    // ==========================================
    // Camera Switching API Methods
    // ==========================================

    /**
     * Enumerate available cameras
     */
    async enumerateCameras() {
        if (!this.cameraSwitchingSystem) {
            console.warn('Camera switching system not initialized');
            return [];
        }

        try {
            await this.cameraSwitchingSystem.enumerateCameras();
            return this.cameraSwitchingSystem.getAvailableCameras();
        } catch (error) {
            console.error('Failed to enumerate cameras:', error);
            throw error;
        }
    }

    /**
     * Switch to specific camera
     */
    async switchToCamera(deviceId, quality = null) {
        if (!this.cameraSwitchingSystem) {
            console.warn('Camera switching system not initialized');
            return null;
        }

        try {
            const stream = await this.cameraSwitchingSystem.switchToCamera(deviceId, quality);

            this.logCameraSwitchingEvent('switch-camera', {
                deviceId,
                quality: quality || this.cameraSwitchingSystem.currentQuality
            });

            return stream;
        } catch (error) {
            console.error('Failed to switch camera:', error);
            throw error;
        }
    }

    /**
     * Switch to next available camera
     */
    async switchToNextCamera() {
        if (!this.cameraSwitchingSystem) {
            console.warn('Camera switching system not initialized');
            return;
        }

        try {
            await this.cameraSwitchingSystem.switchToNextCamera();

            this.logCameraSwitchingEvent('switch-next-camera', {
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to switch to next camera:', error);
            throw error;
        }
    }

    /**
     * Switch to previous available camera
     */
    async switchToPreviousCamera() {
        if (!this.cameraSwitchingSystem) {
            console.warn('Camera switching system not initialized');
            return;
        }

        try {
            await this.cameraSwitchingSystem.switchToPreviousCamera();

            this.logCameraSwitchingEvent('switch-previous-camera', {
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to switch to previous camera:', error);
            throw error;
        }
    }

    /**
     * Change camera quality
     */
    async changeCameraQuality(quality) {
        if (!this.cameraSwitchingSystem) {
            console.warn('Camera switching system not initialized');
            return;
        }

        try {
            await this.cameraSwitchingSystem.changeCameraQuality(quality);

            this.logCameraSwitchingEvent('change-quality', {
                quality,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to change camera quality:', error);
            throw error;
        }
    }

    /**
     * Get current camera
     */
    getCurrentCamera() {
        if (!this.cameraSwitchingSystem) {
            console.warn('Camera switching system not initialized');
            return null;
        }

        return this.cameraSwitchingSystem.getCurrentCamera();
    }

    /**
     * Get current camera stream
     */
    getCurrentCameraStream() {
        if (!this.cameraSwitchingSystem) {
            console.warn('Camera switching system not initialized');
            return null;
        }

        return this.cameraSwitchingSystem.getCurrentStream();
    }

    /**
     * Get available cameras
     */
    getAvailableCameras() {
        if (!this.cameraSwitchingSystem) {
            console.warn('Camera switching system not initialized');
            return [];
        }

        return this.cameraSwitchingSystem.getAvailableCameras();
    }

    /**
     * Get all cameras (including unavailable)
     */
    getAllCameras() {
        if (!this.cameraSwitchingSystem) {
            console.warn('Camera switching system not initialized');
            return [];
        }

        return this.cameraSwitchingSystem.getAllCameras();
    }

    /**
     * Set camera label
     */
    setCameraLabel(deviceId, label) {
        if (!this.cameraSwitchingSystem) {
            console.warn('Camera switching system not initialized');
            return;
        }

        this.cameraSwitchingSystem.setCameraLabel(deviceId, label);

        this.logCameraSwitchingEvent('set-camera-label', {
            deviceId,
            label
        });
    }

    /**
     * Get camera switching statistics
     */
    getCameraSwitchingStats() {
        if (!this.cameraSwitchingSystem) {
            console.warn('Camera switching system not initialized');
            return null;
        }

        return this.cameraSwitchingSystem.getPerformanceStats();
    }

    /**
     * Get camera system status
     */
    getCameraSystemStatus() {
        if (!this.cameraSwitchingSystem) {
            console.warn('Camera switching system not initialized');
            return null;
        }

        return this.cameraSwitchingSystem.getSystemStatus();
    }

    /**
     * Toggle camera switching panel
     */
    toggleCameraSwitchingPanel() {
        if (!this.cameraSwitchingSystem) {
            console.warn('Camera switching system not initialized');
            return;
        }

        this.cameraSwitchingSystem.toggleCameraPanel();

        this.logCameraSwitchingEvent('toggle-panel', {
            timestamp: Date.now()
        });
    }

    /**
     * Show camera switching panel
     */
    showCameraSwitchingPanel() {
        if (!this.cameraSwitchingSystem) {
            console.warn('Camera switching system not initialized');
            return;
        }

        this.cameraSwitchingSystem.showCameraPanel();

        this.logCameraSwitchingEvent('show-panel', {
            timestamp: Date.now()
        });
    }

    /**
     * Hide camera switching panel
     */
    hideCameraSwitchingPanel() {
        if (!this.cameraSwitchingSystem) {
            console.warn('Camera switching system not initialized');
            return;
        }

        this.cameraSwitchingSystem.hideCameraPanel();

        this.logCameraSwitchingEvent('hide-panel', {
            timestamp: Date.now()
        });
    }

    /**
     * Log camera switching event
     */
    logCameraSwitchingEvent(action, data = {}) {
        const event = {
            timestamp: Date.now(),
            action,
            component: 'camera-switching',
            sessionId: this.sessionId,
            userId: this.userId,
            ...data
        };

        // Add to event log
        this.eventLog.push(event);

        // Emit event for external listeners
        this.emitStreamingEvent('camera-switching-event', event);

        // Send to analytics if available
        if (this.analyticsSystem) {
            this.analyticsSystem.trackEvent('camera_switching', action, data);
        }

        console.log('Camera switching event:', event);
    }

    // ==========================================
    // Video Recording Indicators API Methods
    // ==========================================

    /**
     * Start recording indicators
     */
    startRecordingIndicators(recordingData = {}) {
        if (!this.videoRecordingIndicators) {
            console.warn('Video recording indicators not initialized');
            return;
        }

        try {
            this.videoRecordingIndicators.startRecording(recordingData);

            this.logRecordingIndicatorEvent('start-indicators', {
                quality: recordingData.quality,
                format: recordingData.format
            });
        } catch (error) {
            console.error('Failed to start recording indicators:', error);
            throw error;
        }
    }

    /**
     * Pause recording indicators
     */
    pauseRecordingIndicators() {
        if (!this.videoRecordingIndicators) {
            console.warn('Video recording indicators not initialized');
            return;
        }

        try {
            this.videoRecordingIndicators.pauseRecording();

            this.logRecordingIndicatorEvent('pause-indicators', {
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to pause recording indicators:', error);
            throw error;
        }
    }

    /**
     * Resume recording indicators
     */
    resumeRecordingIndicators() {
        if (!this.videoRecordingIndicators) {
            console.warn('Video recording indicators not initialized');
            return;
        }

        try {
            this.videoRecordingIndicators.resumeRecording();

            this.logRecordingIndicatorEvent('resume-indicators', {
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to resume recording indicators:', error);
            throw error;
        }
    }

    /**
     * Stop recording indicators
     */
    stopRecordingIndicators() {
        if (!this.videoRecordingIndicators) {
            console.warn('Video recording indicators not initialized');
            return;
        }

        try {
            this.videoRecordingIndicators.stopRecording();

            this.logRecordingIndicatorEvent('stop-indicators', {
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to stop recording indicators:', error);
            throw error;
        }
    }

    /**
     * Update recording statistics
     */
    updateRecordingStats(stats = {}) {
        if (!this.videoRecordingIndicators) {
            console.warn('Video recording indicators not initialized');
            return;
        }

        try {
            this.videoRecordingIndicators.updateRecordingStats(stats);

            this.logRecordingIndicatorEvent('update-stats', {
                size: stats.size,
                availableStorage: stats.availableStorage,
                bandwidthUsage: stats.bandwidthUsage
            });
        } catch (error) {
            console.error('Failed to update recording stats:', error);
            throw error;
        }
    }

    /**
     * Set recording error state
     */
    setRecordingError(error) {
        if (!this.videoRecordingIndicators) {
            console.warn('Video recording indicators not initialized');
            return;
        }

        try {
            this.videoRecordingIndicators.setErrorState(error);

            this.logRecordingIndicatorEvent('set-error', {
                error: error.message,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to set recording error:', error);
            throw error;
        }
    }

    /**
     * Clear recording error state
     */
    clearRecordingError() {
        if (!this.videoRecordingIndicators) {
            console.warn('Video recording indicators not initialized');
            return;
        }

        try {
            this.videoRecordingIndicators.clearErrorState();

            this.logRecordingIndicatorEvent('clear-error', {
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to clear recording error:', error);
            throw error;
        }
    }

    /**
     * Toggle recording indicators visibility
     */
    toggleRecordingIndicatorsVisibility() {
        if (!this.videoRecordingIndicators) {
            console.warn('Video recording indicators not initialized');
            return;
        }

        try {
            this.videoRecordingIndicators.toggleIndicatorsVisibility();

            this.logRecordingIndicatorEvent('toggle-visibility', {
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to toggle indicators visibility:', error);
            throw error;
        }
    }

    /**
     * Show recording indicators
     */
    showRecordingIndicators() {
        if (!this.videoRecordingIndicators) {
            console.warn('Video recording indicators not initialized');
            return;
        }

        try {
            this.videoRecordingIndicators.showIndicators();

            this.logRecordingIndicatorEvent('show-indicators', {
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to show recording indicators:', error);
            throw error;
        }
    }

    /**
     * Hide recording indicators
     */
    hideRecordingIndicators() {
        if (!this.videoRecordingIndicators) {
            console.warn('Video recording indicators not initialized');
            return;
        }

        try {
            this.videoRecordingIndicators.hideIndicators();

            this.logRecordingIndicatorEvent('hide-indicators', {
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to hide recording indicators:', error);
            throw error;
        }
    }

    /**
     * Get recording status
     */
    getRecordingStatus() {
        if (!this.videoRecordingIndicators) {
            console.warn('Video recording indicators not initialized');
            return null;
        }

        return this.videoRecordingIndicators.getRecordingStatus();
    }

    /**
     * Change indicator position
     */
    changeIndicatorPosition(position) {
        if (!this.videoRecordingIndicators) {
            console.warn('Video recording indicators not initialized');
            return;
        }

        try {
            this.videoRecordingIndicators.options.indicatorPosition = position;

            // Update floating indicator position
            if (this.videoRecordingIndicators.floatingIndicator) {
                this.videoRecordingIndicators.floatingIndicator.className =
                    `recording-floating-indicator ${position}`;
            }

            this.logRecordingIndicatorEvent('change-position', {
                position,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to change indicator position:', error);
            throw error;
        }
    }

    /**
     * Log recording indicator event
     */
    logRecordingIndicatorEvent(action, data = {}) {
        const event = {
            timestamp: Date.now(),
            action,
            component: 'recording-indicators',
            sessionId: this.sessionId,
            userId: this.userId,
            ...data
        };

        // Add to event log
        this.eventLog.push(event);

        // Emit event for external listeners
        this.emitStreamingEvent('recording-indicator-event', event);

        // Send to analytics if available
        if (this.analyticsSystem) {
            this.analyticsSystem.trackEvent('recording_indicators', action, data);
        }

        console.log('Recording indicator event:', event);
    }
}

// Add comprehensive modern streaming CSS
const modernStreamingCSS = `
/* Modern Streaming Interface Styles */
.modern-streaming-interface {
    --streaming-primary: #FF0000;
    --streaming-background: #0a0a0a;
    --streaming-surface: #1a1a1a;
    --streaming-card: #2a2a2a;
    --streaming-input: #3a3a3a;
    --streaming-text: #ffffff;
    --streaming-textMuted: #cccccc;
    --streaming-border: #444444;
    --streaming-success: #28a745;
    --streaming-warning: #ffc107;
    --streaming-danger: #dc3545;
    --streaming-info: #17a2b8;

    position: relative;
    width: 100%;
    height: 100vh;
    background: var(--streaming-background);
    color: var(--streaming-text);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

/* Header Bar */
.streaming-header {
    position: relative;
    z-index: 100;
    background: linear-gradient(135deg, var(--streaming-surface) 0%, rgba(26, 26, 26, 0.95) 100%);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--streaming-border);
    padding: 12px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 60px;
    transition: all 0.3s ease;
}

.streaming-header.visible {
    transform: translateY(0);
}

.streaming-header:not(.visible) {
    transform: translateY(-100%);
}

.header-left {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;
}

.stream-title input {
    background: transparent;
    border: none;
    color: var(--streaming-text);
    font-size: 1.2rem;
    font-weight: 600;
    padding: 8px 12px;
    border-radius: 8px;
    transition: all 0.2s ease;
    min-width: 200px;
}

.stream-title input:focus {
    outline: none;
    background: var(--streaming-input);
    box-shadow: 0 0 0 2px var(--streaming-primary);
}

.stream-title input::placeholder {
    color: var(--streaming-textMuted);
}

.stream-status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 20px;
    background: var(--streaming-card);
    font-size: 0.9rem;
    font-weight: 500;
}

.status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    position: relative;
}

.status-indicator.offline {
    background: #6c757d;
}

.status-indicator.live {
    background: var(--streaming-danger);
    animation: pulse-live 2s infinite;
}

.status-indicator.paused {
    background: var(--streaming-warning);
}

@keyframes pulse-live {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.1); }
}

.header-center {
    display: flex;
    align-items: center;
    gap: 24px;
}

.recording-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: var(--streaming-danger);
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 600;
}

.recording-dot {
    width: 8px;
    height: 8px;
    background: white;
    border-radius: 50%;
    animation: pulse 1s infinite;
}

.stream-duration {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: var(--streaming-card);
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 500;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;
    justify-content: flex-end;
}

.viewer-count {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: var(--streaming-card);
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 500;
}

.stream-quality {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: var(--streaming-card);
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 500;
}

.quality-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
}

.quality-indicator.excellent { background: #28a745; }
.quality-indicator.good { background: #28a745; }
.quality-indicator.fair { background: #ffc107; }
.quality-indicator.poor { background: #fd7e14; }
.quality-indicator.very-poor { background: #dc3545; }

.header-btn {
    background: var(--streaming-card);
    border: none;
    color: var(--streaming-text);
    width: 40px;
    height: 40px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 1rem;
}

.header-btn:hover {
    background: var(--streaming-primary);
    transform: scale(1.05);
}

/* Main Content Area */
.streaming-content {
    flex: 1;
    display: flex;
    position: relative;
    overflow: hidden;
}

/* Video Area */
.video-area {
    flex: 1;
    position: relative;
    background: var(--streaming-background);
    display: flex;
    flex-direction: column;
}

.main-video-container {
    flex: 1;
    position: relative;
    background: #000;
    border-radius: 12px;
    margin: 16px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.main-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    background: #000;
}

/* Video Overlay */
.video-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 10;
}

.video-overlay > * {
    pointer-events: auto;
}

.stream-stats {
    position: absolute;
    top: 16px;
    left: 16px;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    padding: 12px;
    font-size: 0.8rem;
    min-width: 200px;
}

.stat-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
}

.stat-item:last-child {
    margin-bottom: 0;
}

.stat-label {
    color: var(--streaming-textMuted);
}

.stat-value {
    color: var(--streaming-text);
    font-weight: 600;
}

.connection-quality {
    position: absolute;
    top: 16px;
    right: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 0.8rem;
}

.quality-bars {
    display: flex;
    gap: 2px;
    align-items: end;
}

.quality-bars .bar {
    width: 3px;
    background: var(--streaming-textMuted);
    border-radius: 2px;
    transition: all 0.2s ease;
}

.quality-bars .bar:nth-child(1) { height: 8px; }
.quality-bars .bar:nth-child(2) { height: 12px; }
.quality-bars .bar:nth-child(3) { height: 16px; }
.quality-bars .bar:nth-child(4) { height: 20px; }
.quality-bars .bar:nth-child(5) { height: 24px; }

.quality-bars .bar.active {
    background: var(--streaming-success);
}

.layout-controls {
    position: absolute;
    bottom: 16px;
    left: 16px;
    display: flex;
    gap: 8px;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    padding: 8px;
}

.layout-btn {
    background: transparent;
    border: none;
    color: var(--streaming-textMuted);
    width: 36px;
    height: 36px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9rem;
}

.layout-btn:hover,
.layout-btn.active {
    background: var(--streaming-primary);
    color: white;
}

/* Secondary Videos */
.secondary-videos {
    display: none;
    flex-wrap: wrap;
    gap: 8px;
    padding: 16px;
    max-height: 200px;
    overflow-y: auto;
}

.secondary-video {
    width: 160px;
    height: 90px;
    background: #000;
    border-radius: 8px;
    overflow: hidden;
    position: relative;
    cursor: pointer;
    transition: all 0.2s ease;
}

.secondary-video:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 16px rgba(255, 0, 0, 0.3);
}

.secondary-video video {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.secondary-video .participant-name {
    position: absolute;
    bottom: 4px;
    left: 4px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.7rem;
}

/* Layout Variations */
.video-area.layout-grid .main-video-container {
    flex: none;
    height: 60%;
}

.video-area.layout-grid .secondary-videos {
    display: flex;
    height: 40%;
    max-height: none;
}

.video-area.layout-sidebar .main-video-container {
    margin-right: 200px;
}

.video-area.layout-sidebar .secondary-videos {
    display: flex;
    position: absolute;
    right: 16px;
    top: 16px;
    bottom: 16px;
    width: 180px;
    flex-direction: column;
    max-height: none;
}

.video-area.layout-presentation .main-video-container {
    margin: 8px;
    border-radius: 8px;
}

/* Sidebar */
.streaming-sidebar {
    width: 350px;
    background: var(--streaming-surface);
    border-left: 1px solid var(--streaming-border);
    display: flex;
    flex-direction: column;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    position: relative;
    z-index: 50;
}

.streaming-sidebar.visible {
    transform: translateX(0);
}

.sidebar-tabs {
    display: flex;
    background: var(--streaming-card);
    border-bottom: 1px solid var(--streaming-border);
}

.sidebar-tab {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--streaming-textMuted);
    padding: 12px 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    position: relative;
}

.sidebar-tab:hover,
.sidebar-tab.active {
    color: var(--streaming-primary);
    background: var(--streaming-surface);
}

.sidebar-tab i {
    font-size: 1.1rem;
}

.tab-badge {
    position: absolute;
    top: 4px;
    right: 8px;
    background: var(--streaming-primary);
    color: white;
    border-radius: 10px;
    padding: 2px 6px;
    font-size: 0.7rem;
    min-width: 16px;
    text-align: center;
}

.sidebar-content {
    flex: 1;
    overflow: hidden;
    position: relative;
}

.sidebar-panel {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 16px;
    overflow-y: auto;
    opacity: 0;
    transform: translateX(20px);
    transition: all 0.3s ease;
    pointer-events: none;
}

.sidebar-panel.active {
    opacity: 1;
    transform: translateX(0);
    pointer-events: auto;
}

/* Participants Panel */
.participants-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--streaming-border);
}

.participants-header h4 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--streaming-text);
}

.btn-icon {
    background: var(--streaming-card);
    border: none;
    color: var(--streaming-text);
    width: 32px;
    height: 32px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-icon:hover {
    background: var(--streaming-primary);
}

.participants-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.participant-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: var(--streaming-card);
    border-radius: 8px;
    transition: all 0.2s ease;
}

.participant-item:hover {
    background: var(--streaming-input);
}

.participant-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--streaming-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 1.1rem;
}

.participant-info {
    flex: 1;
}

.participant-name {
    font-weight: 600;
    color: var(--streaming-text);
    margin-bottom: 2px;
}

.participant-status {
    font-size: 0.8rem;
    color: var(--streaming-textMuted);
}

.participant-controls {
    display: flex;
    gap: 4px;
}

.participant-controls .btn-icon {
    width: 28px;
    height: 28px;
    font-size: 0.8rem;
}

/* Control Bar */
.control-bar {
    position: relative;
    z-index: 100;
    background: linear-gradient(135deg, var(--streaming-surface) 0%, rgba(26, 26, 26, 0.95) 100%);
    backdrop-filter: blur(10px);
    border-top: 1px solid var(--streaming-border);
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 80px;
    transition: all 0.3s ease;
}

.control-bar.visible {
    transform: translateY(0);
}

.control-bar:not(.visible) {
    transform: translateY(100%);
}

.media-controls,
.stream-controls,
.additional-controls {
    display: flex;
    align-items: center;
    gap: 12px;
}

.control-btn {
    background: var(--streaming-card);
    border: none;
    color: var(--streaming-text);
    padding: 12px 16px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    min-height: 44px;
}

.control-btn:hover {
    background: var(--streaming-input);
    transform: translateY(-2px);
}

.control-btn.active {
    background: var(--streaming-primary);
    color: white;
}

.control-btn.primary {
    background: var(--streaming-primary);
    color: white;
}

.control-btn.primary:hover {
    background: #cc0000;
}

.control-btn.danger {
    background: var(--streaming-danger);
    color: white;
}

.control-btn.danger:hover {
    background: #c82333;
}

.control-btn i {
    font-size: 1rem;
}

.control-select {
    background: var(--streaming-card);
    border: 1px solid var(--streaming-border);
    color: var(--streaming-text);
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9rem;
}

.control-select:focus {
    outline: none;
    border-color: var(--streaming-primary);
    box-shadow: 0 0 0 2px rgba(255, 0, 0, 0.2);
}

.control-select option {
    background: var(--streaming-card);
    color: var(--streaming-text);
}

/* Loading Overlay */
.loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.loading-spinner {
    text-align: center;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--streaming-border);
    border-top: 3px solid var(--streaming-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 16px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.loading-text {
    color: var(--streaming-text);
    font-size: 1rem;
    font-weight: 500;
}

/* Notifications */
.notification-container {
    position: fixed;
    top: 80px;
    right: 24px;
    z-index: 1001;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 400px;
}

.notification {
    background: var(--streaming-card);
    border: 1px solid var(--streaming-border);
    border-radius: 8px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    animation: slideInRight 0.3s ease;
}

.notification-success {
    border-left: 4px solid var(--streaming-success);
}

.notification-error {
    border-left: 4px solid var(--streaming-danger);
}

.notification-warning {
    border-left: 4px solid var(--streaming-warning);
}

.notification-info {
    border-left: 4px solid var(--streaming-info);
}

.notification-content {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
}

.notification-content i {
    font-size: 1.1rem;
}

.notification-success .notification-content i {
    color: var(--streaming-success);
}

.notification-error .notification-content i {
    color: var(--streaming-danger);
}

.notification-warning .notification-content i {
    color: var(--streaming-warning);
}

.notification-info .notification-content i {
    color: var(--streaming-info);
}

.notification-close {
    background: none;
    border: none;
    color: var(--streaming-textMuted);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s ease;
}

.notification-close:hover {
    background: var(--streaming-input);
    color: var(--streaming-text);
}

@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

/* Theme Variations */
.modern-streaming-interface.theme-light {
    --streaming-background: #f8f9fa;
    --streaming-surface: #ffffff;
    --streaming-card: #ffffff;
    --streaming-input: #ffffff;
    --streaming-text: #212529;
    --streaming-textMuted: #6c757d;
    --streaming-border: #dee2e6;
}

/* Responsive Design */
@media (max-width: 1200px) {
    .streaming-sidebar {
        width: 300px;
    }

    .main-video-container {
        margin: 12px;
    }
}

@media (max-width: 768px) {
    .streaming-header {
        padding: 8px 16px;
        min-height: 50px;
    }

    .header-left,
    .header-right {
        flex: none;
    }

    .stream-title input {
        min-width: 150px;
        font-size: 1rem;
    }

    .streaming-sidebar {
        width: 100%;
        position: absolute;
        top: 0;
        bottom: 0;
        z-index: 200;
        transform: translateX(-100%);
        transition: transform 0.3s ease;
    }

    .streaming-sidebar.visible {
        transform: translateX(0);
    }

    .control-bar {
        padding: 12px 16px;
        min-height: 60px;
        flex-wrap: wrap;
        gap: 8px;
    }

    .media-controls,
    .stream-controls,
    .additional-controls {
        gap: 8px;
    }

    .control-btn {
        padding: 8px 12px;
        font-size: 0.8rem;
        min-height: 36px;
    }

    .control-btn span {
        display: none;
    }

    .main-video-container {
        margin: 8px;
        border-radius: 8px;
    }

    .video-area.layout-sidebar .main-video-container {
        margin-right: 8px;
    }

    .video-area.layout-sidebar .secondary-videos {
        display: none;
    }
}

@media (max-width: 480px) {
    .streaming-header {
        padding: 6px 12px;
        min-height: 44px;
    }

    .stream-title input {
        min-width: 120px;
        font-size: 0.9rem;
    }

    .control-bar {
        padding: 8px 12px;
        min-height: 50px;
    }

    .control-btn {
        padding: 6px 8px;
        font-size: 0.75rem;
        min-height: 32px;
        min-width: 32px;
    }

    .main-video-container {
        margin: 6px;
        border-radius: 6px;
    }
}

/* Mobile-specific responsive enhancements */
.mobile-sidebar .streaming-sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.mobile-sidebar .streaming-sidebar.visible {
    transform: translateX(0);
}

.mobile-size {
    min-height: var(--touch-target-size, 44px) !important;
    min-width: var(--touch-target-size, 44px) !important;
    padding: 8px !important;
}

/* Mobile landscape optimizations */
.mobile-landscape-optimized .streaming-header {
    padding: 4px 12px;
    min-height: 40px;
}

.mobile-landscape-optimized .control-bar {
    padding: 6px 12px;
    min-height: 44px;
}

.mobile-landscape-optimized .secondary-ui {
    display: none !important;
}

/* Orientation-specific layouts */
.landscape-layout .video-area {
    flex-direction: row;
}

.portrait-layout .video-area {
    flex-direction: column;
}

.portrait-layout .streaming-sidebar {
    height: 40vh;
    width: 100%;
    position: relative;
}

/* Virtual keyboard adjustments */
.keyboard-visible .chat-input-container {
    position: fixed;
    bottom: var(--keyboard-height, 0px);
    left: 0;
    right: 0;
    z-index: 1000;
    transition: bottom 0.3s ease;
}

/* Minimized interface */
.minimized-interface .streaming-header {
    padding: 4px 8px;
    min-height: 32px;
}

.minimized-interface .control-bar {
    padding: 4px 8px;
    min-height: 36px;
}

.minimized-interface .streaming-sidebar {
    display: none;
}

/* Touch feedback */
.control-btn.touch-active {
    transform: scale(0.95);
    background: var(--streaming-primary);
    transition: all 0.1s ease;
}

/* High contrast mode */
@media (prefers-contrast: high) {
    .modern-streaming-interface {
        --streaming-background: #ffffff;
        --streaming-surface: #f8f9fa;
        --streaming-text: #000000;
        --streaming-border: #000000;
    }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
    .modern-streaming-interface * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}

/* Safe area support for notched devices */
@supports (padding: env(safe-area-inset-top)) {
    .modern-streaming-interface {
        padding-top: env(safe-area-inset-top);
        padding-bottom: env(safe-area-inset-bottom);
        padding-left: env(safe-area-inset-left);
        padding-right: env(safe-area-inset-right);
    }
}

/* Container queries for responsive components */
@container (max-width: 600px) {
    .video-area {
        grid-template-columns: 1fr;
    }

    .secondary-videos {
        display: none;
    }
}

@container (max-width: 400px) {
    .control-bar {
        flex-direction: column;
        align-items: stretch;
    }

    .media-controls,
    .stream-controls,
    .additional-controls {
        justify-content: center;
    }
}

@media (max-width: 480px) {
    .streaming-header {
        padding: 6px 12px;
        min-height: 44px;
    }

    .header-center {
        display: none;
    }

    .stream-title input {
        min-width: 120px;
        font-size: 0.9rem;
    }

    .control-bar {
        padding: 8px 12px;
        min-height: 50px;
    }

    .control-btn {
        padding: 6px 8px;
        min-height: 32px;
    }

    .main-video-container {
        margin: 4px;
        border-radius: 6px;
    }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}

@media (prefers-contrast: high) {
    .modern-streaming-interface {
        --streaming-border: #ffffff;
        --streaming-textMuted: #ffffff;
    }
}

/* Print Styles */
@media print {
    .streaming-header,
    .control-bar,
    .streaming-sidebar,
    .loading-overlay,
    .notification-container {
        display: none !important;
    }

    .streaming-content {
        height: 100vh;
    }

    .main-video-container {
        margin: 0;
        border-radius: 0;
    }
}

/* Fullscreen Styles */
.modern-streaming-interface:fullscreen {
    background: #000;
}

.modern-streaming-interface:fullscreen .main-video-container {
    margin: 0;
    border-radius: 0;
}

.modern-streaming-interface:fullscreen .streaming-sidebar {
    width: 300px;
}

/* Animation Keyframes */
@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}

@keyframes slideDown {
    from { transform: translateY(-20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}

/* Custom Scrollbars */
.sidebar-panel::-webkit-scrollbar,
.secondary-videos::-webkit-scrollbar {
    width: 6px;
}

.sidebar-panel::-webkit-scrollbar-track,
.secondary-videos::-webkit-scrollbar-track {
    background: var(--streaming-card);
}

.sidebar-panel::-webkit-scrollbar-thumb,
.secondary-videos::-webkit-scrollbar-thumb {
    background: var(--streaming-border);
    border-radius: 3px;
}

.sidebar-panel::-webkit-scrollbar-thumb:hover,
.secondary-videos::-webkit-scrollbar-thumb:hover {
    background: var(--streaming-textMuted);
}
`;

// Inject CSS into document
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = modernStreamingCSS;
    document.head.appendChild(styleSheet);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModernStreamingInterface;
} else if (typeof window !== 'undefined') {
    window.ModernStreamingInterface = ModernStreamingInterface;
}
