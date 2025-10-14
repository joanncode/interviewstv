/**
 * Comprehensive Keyboard Shortcuts System
 * Advanced keyboard navigation and control for streaming interface
 */
class KeyboardShortcutsSystem {
    constructor(options = {}) {
        this.container = options.container || document.body;
        this.streamingInterface = options.streamingInterface || null;
        this.accessibilitySystem = options.accessibilitySystem || null;
        this.themeSystem = options.themeSystem || null;
        this.responsiveSystem = options.responsiveSystem || null;
        
        // Keyboard shortcuts settings
        this.settings = {
            enabled: true,
            enableGlobalShortcuts: true,
            enableContextualShortcuts: true,
            enableSequenceShortcuts: true,
            enableCustomShortcuts: true,
            showHelpOnStartup: false,
            sequenceTimeout: 2000,
            enableSoundFeedback: false,
            enableVisualFeedback: true,
            enableHapticFeedback: false,
            conflictResolution: 'context', // 'context', 'priority', 'user'
            ...options.settings
        };
        
        // Shortcut registry
        this.shortcuts = new Map();
        this.sequences = new Map();
        this.contexts = new Map();
        this.customShortcuts = new Map();
        
        // State management
        this.currentContext = 'global';
        this.activeSequence = [];
        this.sequenceTimer = null;
        this.isEnabled = true;
        this.isRecording = false;
        this.recordingCallback = null;
        
        // Help system
        this.helpModal = null;
        this.helpVisible = false;
        
        // Feedback systems
        this.feedbackOverlay = null;
        this.lastShortcut = null;
        
        // Conflict detection
        this.conflicts = new Map();
        this.priorities = new Map();
        
        this.init();
    }
    
    /**
     * Initialize keyboard shortcuts system
     */
    init() {
        this.setupEventListeners();
        this.registerDefaultShortcuts();
        this.registerStreamingShortcuts();
        this.registerAccessibilityShortcuts();
        this.registerNavigationShortcuts();
        this.registerCustomizationShortcuts();
        this.createHelpModal();
        this.createFeedbackOverlay();
        this.loadUserCustomizations();
        this.detectConflicts();
        this.injectKeyboardCSS();
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Main keyboard event handler
        document.addEventListener('keydown', this.handleKeydown.bind(this), true);
        document.addEventListener('keyup', this.handleKeyup.bind(this), true);
        
        // Context change detection
        document.addEventListener('focusin', this.handleFocusChange.bind(this));
        document.addEventListener('click', this.handleContextChange.bind(this));
        
        // Modal and overlay detection
        const observer = new MutationObserver(this.handleDOMChanges.bind(this));
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });
        
        // Window events
        window.addEventListener('beforeunload', this.saveUserCustomizations.bind(this));
        
        // Custom events
        this.container.addEventListener('shortcut-conflict', this.handleShortcutConflict.bind(this));
        this.container.addEventListener('context-change', this.handleCustomContextChange.bind(this));
    }
    
    /**
     * Handle keyboard events
     */
    handleKeydown(e) {
        if (!this.isEnabled || !this.settings.enabled) return;
        
        // Skip if in input fields (unless specifically allowed)
        if (this.shouldSkipShortcut(e)) return;
        
        // Build key combination
        const keyCombo = this.buildKeyCombo(e);
        const context = this.getCurrentContext();
        
        // Handle sequence shortcuts
        if (this.handleSequenceShortcut(e, keyCombo)) return;
        
        // Handle regular shortcuts
        if (this.handleRegularShortcut(e, keyCombo, context)) return;
        
        // Handle global shortcuts
        if (context !== 'global' && this.settings.enableGlobalShortcuts) {
            this.handleRegularShortcut(e, keyCombo, 'global');
        }
    }
    
    /**
     * Handle keyboard up events
     */
    handleKeyup(e) {
        // Handle modifier key releases for sticky keys
        if (this.accessibilitySystem?.settings.stickyKeys) {
            this.handleStickyKeyRelease(e);
        }
    }
    
    /**
     * Register default system shortcuts
     */
    registerDefaultShortcuts() {
        // Help and documentation
        this.register('Ctrl+/', () => this.showHelp(), 'Show keyboard shortcuts help', 'help', 'global', 1);
        this.register('F1', () => this.showHelp(), 'Show help', 'help', 'global', 1);
        this.register('Escape', () => this.handleEscape(), 'Close modal/Cancel action', 'navigation', 'global', 1);
        
        // System shortcuts
        this.register('Ctrl+Shift+K', () => this.toggleShortcuts(), 'Toggle keyboard shortcuts', 'system', 'global', 1);
        this.register('Ctrl+Shift+R', () => this.startRecording(), 'Record custom shortcut', 'system', 'global', 1);
        this.register('Ctrl+Shift+H', () => this.resetToDefaults(), 'Reset shortcuts to defaults', 'system', 'global', 1);
        
        // Window and tab management
        this.register('Ctrl+Shift+F', () => this.toggleFullscreen(), 'Toggle fullscreen', 'window', 'global', 2);
        this.register('F11', () => this.toggleFullscreen(), 'Toggle fullscreen', 'window', 'global', 2);
        
        // Quick actions
        this.register('Ctrl+Shift+D', () => this.toggleDarkMode(), 'Toggle dark mode', 'quick', 'global', 2);
        this.register('Ctrl+Shift+A', () => this.toggleAccessibilityPanel(), 'Toggle accessibility panel', 'quick', 'global', 2);
    }
    
    /**
     * Register streaming-specific shortcuts
     */
    registerStreamingShortcuts() {
        // Media controls
        this.register('Space', () => this.streamingInterface?.toggleStream(), 'Play/Pause stream', 'media', 'streaming', 1);
        this.register('k', () => this.streamingInterface?.toggleStream(), 'Play/Pause stream (alternative)', 'media', 'streaming', 2);
        this.register('m', () => this.streamingInterface?.toggleMicrophone(), 'Toggle microphone', 'media', 'streaming', 1);
        this.register('v', () => this.streamingInterface?.toggleCamera(), 'Toggle camera', 'media', 'streaming', 1);
        this.register('s', () => this.streamingInterface?.toggleScreenShare(), 'Toggle screen share', 'media', 'streaming', 1);
        this.register('r', () => this.streamingInterface?.toggleRecording(), 'Toggle recording', 'media', 'streaming', 1);
        this.register('c', () => this.streamingInterface?.toggleChat(), 'Toggle chat', 'interface', 'streaming', 1);
        this.register('f', () => this.streamingInterface?.toggleFullscreen(), 'Toggle fullscreen', 'interface', 'streaming', 1);
        
        // Layout controls
        this.register('1', () => this.streamingInterface?.changeLayout('spotlight'), 'Spotlight layout', 'layout', 'streaming', 1);
        this.register('2', () => this.streamingInterface?.changeLayout('grid'), 'Grid layout', 'layout', 'streaming', 1);
        this.register('3', () => this.streamingInterface?.changeLayout('sidebar'), 'Sidebar layout', 'layout', 'streaming', 1);
        this.register('4', () => this.streamingInterface?.changeLayout('presentation'), 'Presentation layout', 'layout', 'streaming', 1);
        
        // Volume controls
        this.register('ArrowUp', () => this.adjustVolume(10), 'Increase volume', 'media', 'streaming', 2);
        this.register('ArrowDown', () => this.adjustVolume(-10), 'Decrease volume', 'media', 'streaming', 2);
        this.register('Ctrl+ArrowUp', () => this.adjustVolume(25), 'Increase volume (large)', 'media', 'streaming', 2);
        this.register('Ctrl+ArrowDown', () => this.adjustVolume(-25), 'Decrease volume (large)', 'media', 'streaming', 2);
        
        // Quality controls
        this.register('q', () => this.cycleQuality(), 'Cycle video quality', 'media', 'streaming', 2);
        this.register('Shift+q', () => this.cycleQuality(true), 'Cycle video quality (reverse)', 'media', 'streaming', 2);
        
        // Participant controls
        this.register('Ctrl+m', () => this.muteAllParticipants(), 'Mute all participants', 'participants', 'streaming', 1);
        this.register('Ctrl+Shift+m', () => this.unmuteAllParticipants(), 'Unmute all participants', 'participants', 'streaming', 1);
        this.register('Ctrl+k', () => this.kickParticipant(), 'Kick selected participant', 'participants', 'streaming', 1);
        
        // Recording controls
        this.register('Ctrl+r', () => this.streamingInterface?.startRecording(), 'Start recording', 'recording', 'streaming', 1);
        this.register('Ctrl+Shift+r', () => this.streamingInterface?.stopRecording(), 'Stop recording', 'recording', 'streaming', 1);
        this.register('Ctrl+p', () => this.streamingInterface?.pauseRecording(), 'Pause/Resume recording', 'recording', 'streaming', 1);
    }
    
    /**
     * Register accessibility shortcuts
     */
    registerAccessibilityShortcuts() {
        // Skip navigation
        this.register('Alt+1', () => this.skipToTarget('main-content'), 'Skip to main content', 'navigation', 'global', 1);
        this.register('Alt+2', () => this.skipToTarget('navigation'), 'Skip to navigation', 'navigation', 'global', 1);
        this.register('Alt+3', () => this.skipToTarget('video-player'), 'Skip to video player', 'navigation', 'global', 1);
        this.register('Alt+4', () => this.skipToTarget('chat'), 'Skip to chat', 'navigation', 'global', 1);
        this.register('Alt+5', () => this.skipToTarget('controls'), 'Skip to controls', 'navigation', 'global', 1);
        
        // Accessibility features
        this.register('Alt+Shift+h', () => this.toggleAccessibilityFeature('highContrast'), 'Toggle high contrast', 'accessibility', 'global', 1);
        this.register('Alt+Shift+m', () => this.toggleAccessibilityFeature('reducedMotion'), 'Toggle reduced motion', 'accessibility', 'global', 1);
        this.register('Alt+Shift+f', () => this.toggleAccessibilityFeature('largeText'), 'Toggle large text', 'accessibility', 'global', 1);
        this.register('Alt+Shift+a', () => this.toggleAccessibilityFeature('announcements'), 'Toggle announcements', 'accessibility', 'global', 1);
        this.register('Alt+Shift+c', () => this.toggleAccessibilityFeature('captionsEnabled'), 'Toggle captions', 'accessibility', 'global', 1);
        
        // Screen reader navigation
        this.register('h', () => this.navigateHeadings('next'), 'Next heading', 'navigation', 'global', 2);
        this.register('Shift+h', () => this.navigateHeadings('previous'), 'Previous heading', 'navigation', 'global', 2);
        this.register('l', () => this.navigateLandmarks('next'), 'Next landmark', 'navigation', 'global', 2);
        this.register('Shift+l', () => this.navigateLandmarks('previous'), 'Previous landmark', 'navigation', 'global', 2);
        this.register('b', () => this.navigateButtons('next'), 'Next button', 'navigation', 'global', 2);
        this.register('Shift+b', () => this.navigateButtons('previous'), 'Previous button', 'navigation', 'global', 2);
        this.register('i', () => this.navigateInputs('next'), 'Next input field', 'navigation', 'global', 2);
        this.register('Shift+i', () => this.navigateInputs('previous'), 'Previous input field', 'navigation', 'global', 2);
    }
    
    /**
     * Register navigation shortcuts
     */
    registerNavigationShortcuts() {
        // Tab navigation
        this.register('Ctrl+Tab', () => this.nextTab(), 'Next tab', 'navigation', 'global', 1);
        this.register('Ctrl+Shift+Tab', () => this.previousTab(), 'Previous tab', 'navigation', 'global', 1);
        
        // Panel navigation
        this.register('Ctrl+1', () => this.focusPanel('video'), 'Focus video panel', 'navigation', 'global', 2);
        this.register('Ctrl+2', () => this.focusPanel('chat'), 'Focus chat panel', 'navigation', 'global', 2);
        this.register('Ctrl+3', () => this.focusPanel('participants'), 'Focus participants panel', 'navigation', 'global', 2);
        this.register('Ctrl+4', () => this.focusPanel('controls'), 'Focus controls panel', 'navigation', 'global', 2);
        this.register('Ctrl+5', () => this.focusPanel('settings'), 'Focus settings panel', 'navigation', 'global', 2);
        
        // Quick navigation
        this.register('g h', () => this.goToHome(), 'Go to home', 'navigation', 'global', 2);
        this.register('g s', () => this.goToSettings(), 'Go to settings', 'navigation', 'global', 2);
        this.register('g p', () => this.goToProfile(), 'Go to profile', 'navigation', 'global', 2);
        this.register('g d', () => this.goToDashboard(), 'Go to dashboard', 'navigation', 'global', 2);
        
        // Search and find
        this.register('Ctrl+f', () => this.openSearch(), 'Open search', 'search', 'global', 1);
        this.register('/', () => this.openQuickSearch(), 'Quick search', 'search', 'global', 2);
        this.register('Ctrl+k', () => this.openCommandPalette(), 'Open command palette', 'search', 'global', 1);
    }
    
    /**
     * Register customization shortcuts
     */
    registerCustomizationShortcuts() {
        // Theme shortcuts
        this.register('t d', () => this.setTheme('dark'), 'Set dark theme', 'theme', 'global', 2);
        this.register('t l', () => this.setTheme('light'), 'Set light theme', 'theme', 'global', 2);
        this.register('t a', () => this.setTheme('auto'), 'Set auto theme', 'theme', 'global', 2);
        this.register('t t', () => this.toggleTheme(), 'Toggle theme', 'theme', 'global', 2);
        
        // Layout shortcuts
        this.register('l s', () => this.setLayout('spotlight'), 'Set spotlight layout', 'layout', 'streaming', 2);
        this.register('l g', () => this.setLayout('grid'), 'Set grid layout', 'layout', 'streaming', 2);
        this.register('l p', () => this.setLayout('presentation'), 'Set presentation layout', 'layout', 'streaming', 2);
        this.register('l c', () => this.cycleLayouts(), 'Cycle layouts', 'layout', 'streaming', 2);
        
        // Zoom and view shortcuts
        this.register('Ctrl+=', () => this.zoomIn(), 'Zoom in', 'view', 'global', 2);
        this.register('Ctrl+-', () => this.zoomOut(), 'Zoom out', 'view', 'global', 2);
        this.register('Ctrl+0', () => this.resetZoom(), 'Reset zoom', 'view', 'global', 2);
        
        // Developer shortcuts
        this.register('Ctrl+Shift+i', () => this.toggleDevTools(), 'Toggle developer tools', 'developer', 'global', 3);
        this.register('Ctrl+Shift+c', () => this.inspectElement(), 'Inspect element', 'developer', 'global', 3);
        this.register('Ctrl+Shift+j', () => this.openConsole(), 'Open console', 'developer', 'global', 3);
    }

    /**
     * Register a keyboard shortcut
     */
    register(keyCombo, callback, description, category = 'general', context = 'global', priority = 2) {
        const shortcut = {
            keyCombo,
            callback,
            description,
            category,
            context,
            priority,
            enabled: true,
            custom: false,
            timestamp: Date.now()
        };

        // Handle sequence shortcuts (space-separated keys)
        if (keyCombo.includes(' ')) {
            this.registerSequence(keyCombo, shortcut);
        } else {
            this.registerRegular(keyCombo, shortcut, context);
        }

        return this;
    }

    /**
     * Register regular shortcut
     */
    registerRegular(keyCombo, shortcut, context) {
        if (!this.shortcuts.has(context)) {
            this.shortcuts.set(context, new Map());
        }

        const contextShortcuts = this.shortcuts.get(context);

        // Check for conflicts
        if (contextShortcuts.has(keyCombo)) {
            this.handleConflict(keyCombo, shortcut, contextShortcuts.get(keyCombo), context);
        }

        contextShortcuts.set(keyCombo, shortcut);
        this.priorities.set(`${context}:${keyCombo}`, shortcut.priority);
    }

    /**
     * Register sequence shortcut
     */
    registerSequence(keyCombo, shortcut) {
        const sequence = keyCombo.split(' ');
        if (!this.sequences.has(sequence[0])) {
            this.sequences.set(sequence[0], new Map());
        }

        this.sequences.get(sequence[0]).set(keyCombo, shortcut);
    }

    /**
     * Handle shortcut conflicts
     */
    handleConflict(keyCombo, newShortcut, existingShortcut, context) {
        const conflictKey = `${context}:${keyCombo}`;

        if (!this.conflicts.has(conflictKey)) {
            this.conflicts.set(conflictKey, []);
        }

        this.conflicts.get(conflictKey).push({
            existing: existingShortcut,
            new: newShortcut,
            resolution: this.settings.conflictResolution
        });

        // Resolve conflict based on strategy
        switch (this.settings.conflictResolution) {
            case 'priority':
                if (newShortcut.priority < existingShortcut.priority) {
                    return newShortcut; // Lower number = higher priority
                }
                break;
            case 'context':
                // Context-specific shortcuts override global ones
                if (context !== 'global' && existingShortcut.context === 'global') {
                    return newShortcut;
                }
                break;
            case 'user':
                // User customizations override defaults
                if (newShortcut.custom && !existingShortcut.custom) {
                    return newShortcut;
                }
                break;
        }

        return existingShortcut;
    }

    /**
     * Handle regular shortcut execution
     */
    handleRegularShortcut(e, keyCombo, context) {
        const contextShortcuts = this.shortcuts.get(context);
        if (!contextShortcuts || !contextShortcuts.has(keyCombo)) {
            return false;
        }

        const shortcut = contextShortcuts.get(keyCombo);
        if (!shortcut.enabled) return false;

        e.preventDefault();
        e.stopPropagation();

        try {
            shortcut.callback(e);
            this.showFeedback(shortcut);
            this.lastShortcut = shortcut;

            // Announce to screen reader
            if (this.accessibilitySystem) {
                this.accessibilitySystem.announce(`Executed: ${shortcut.description}`, 'polite');
            }

            return true;
        } catch (error) {
            console.error('Shortcut execution error:', error);
            this.showError(`Failed to execute: ${shortcut.description}`);
            return false;
        }
    }

    /**
     * Handle sequence shortcut execution
     */
    handleSequenceShortcut(e, keyCombo) {
        if (!this.settings.enableSequenceShortcuts) return false;

        // Add to active sequence
        this.activeSequence.push(keyCombo);

        // Clear sequence timer
        if (this.sequenceTimer) {
            clearTimeout(this.sequenceTimer);
        }

        // Check for complete sequence
        const sequenceString = this.activeSequence.join(' ');
        const firstKey = this.activeSequence[0];

        if (this.sequences.has(firstKey)) {
            const sequenceMap = this.sequences.get(firstKey);

            if (sequenceMap.has(sequenceString)) {
                const shortcut = sequenceMap.get(sequenceString);

                if (shortcut.enabled) {
                    e.preventDefault();
                    e.stopPropagation();

                    try {
                        shortcut.callback(e);
                        this.showFeedback(shortcut);
                        this.lastShortcut = shortcut;

                        // Announce to screen reader
                        if (this.accessibilitySystem) {
                            this.accessibilitySystem.announce(`Executed sequence: ${shortcut.description}`, 'polite');
                        }

                        this.activeSequence = [];
                        return true;
                    } catch (error) {
                        console.error('Sequence shortcut execution error:', error);
                        this.showError(`Failed to execute sequence: ${shortcut.description}`);
                    }
                }
            }
        }

        // Set timeout to clear sequence
        this.sequenceTimer = setTimeout(() => {
            this.activeSequence = [];
        }, this.settings.sequenceTimeout);

        return false;
    }

    /**
     * Get current keyboard context
     */
    getCurrentContext() {
        // Check for modal contexts
        if (document.querySelector('.modal.show, .modal-overlay')) return 'modal';
        if (document.querySelector('.dropdown.show')) return 'dropdown';

        // Check for specific interface contexts
        if (document.querySelector('.video-area:focus-within')) return 'video';
        if (document.querySelector('.chat-container:focus-within')) return 'chat';
        if (document.querySelector('.participants-panel:focus-within')) return 'participants';
        if (document.querySelector('.controls-panel:focus-within')) return 'controls';
        if (document.querySelector('.settings-panel:focus-within')) return 'settings';

        // Check for streaming context
        if (this.streamingInterface && this.container.contains(document.activeElement)) {
            return 'streaming';
        }

        return this.currentContext || 'global';
    }

    /**
     * Build key combination string
     */
    buildKeyCombo(e) {
        const parts = [];

        // Add modifiers in consistent order
        if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');

        // Add main key
        let key = e.key;

        // Normalize key names
        if (key === ' ') key = 'Space';
        if (key === 'Control') return ''; // Don't register modifier-only
        if (key === 'Alt') return '';
        if (key === 'Shift') return '';
        if (key === 'Meta') return '';

        parts.push(key);

        return parts.join('+');
    }

    /**
     * Check if shortcut should be skipped
     */
    shouldSkipShortcut(e) {
        const target = e.target;

        // Skip in form inputs unless specifically allowed
        if (target.matches('input, textarea, select, [contenteditable]')) {
            // Allow some shortcuts in inputs
            const allowedInInputs = ['Escape', 'F1', 'Ctrl+/', 'Ctrl+a', 'Ctrl+z', 'Ctrl+y'];
            const keyCombo = this.buildKeyCombo(e);
            return !allowedInInputs.includes(keyCombo);
        }

        // Skip if recording shortcuts
        if (this.isRecording) {
            this.recordShortcut(e);
            return true;
        }

        // Skip if shortcuts disabled
        if (!this.isEnabled || !this.settings.enabled) {
            return true;
        }

        return false;
    }

    /**
     * Show visual feedback for shortcut execution
     */
    showFeedback(shortcut) {
        if (!this.settings.enableVisualFeedback) return;

        if (this.feedbackOverlay) {
            this.feedbackOverlay.textContent = shortcut.description;
            this.feedbackOverlay.className = 'shortcut-feedback show';

            setTimeout(() => {
                if (this.feedbackOverlay) {
                    this.feedbackOverlay.className = 'shortcut-feedback';
                }
            }, 2000);
        }

        // Haptic feedback
        if (this.settings.enableHapticFeedback && navigator.vibrate) {
            navigator.vibrate(50);
        }

        // Sound feedback
        if (this.settings.enableSoundFeedback) {
            this.playFeedbackSound();
        }
    }

    /**
     * Show error feedback
     */
    showError(message) {
        if (this.feedbackOverlay) {
            this.feedbackOverlay.textContent = message;
            this.feedbackOverlay.className = 'shortcut-feedback error show';

            setTimeout(() => {
                if (this.feedbackOverlay) {
                    this.feedbackOverlay.className = 'shortcut-feedback';
                }
            }, 3000);
        }
    }

    /**
     * Shortcut action methods
     */

    // Help and documentation
    showHelp() {
        if (this.helpModal) {
            this.helpVisible = true;
            this.helpModal.style.display = 'flex';
            this.populateHelpContent();

            // Focus first element in modal
            const firstFocusable = this.helpModal.querySelector('button, input, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) {
                firstFocusable.focus();
            }

            // Trap focus in modal
            if (this.accessibilitySystem) {
                this.accessibilitySystem.trapFocus(this.helpModal);
            }
        }
    }

    hideHelp() {
        if (this.helpModal) {
            this.helpVisible = false;
            this.helpModal.style.display = 'none';

            // Restore focus
            if (this.accessibilitySystem) {
                this.accessibilitySystem.restoreFocus();
            }
        }
    }

    handleEscape() {
        if (this.helpVisible) {
            this.hideHelp();
            return;
        }

        // Close any open modals
        const modals = document.querySelectorAll('.modal.show, .modal-overlay');
        if (modals.length > 0) {
            modals.forEach(modal => {
                const closeBtn = modal.querySelector('.close, .btn-close, [data-dismiss="modal"]');
                if (closeBtn) {
                    closeBtn.click();
                } else {
                    modal.style.display = 'none';
                    modal.classList.remove('show');
                }
            });
            return;
        }

        // Cancel any active operations
        if (this.isRecording) {
            this.stopRecording();
            return;
        }

        // Clear active sequence
        this.activeSequence = [];
        if (this.sequenceTimer) {
            clearTimeout(this.sequenceTimer);
        }
    }

    // System controls
    toggleShortcuts() {
        this.isEnabled = !this.isEnabled;
        this.settings.enabled = this.isEnabled;

        const message = this.isEnabled ? 'Keyboard shortcuts enabled' : 'Keyboard shortcuts disabled';
        this.showFeedback({ description: message });

        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce(message, 'polite');
        }

        this.saveUserCustomizations();
    }

    startRecording() {
        if (this.isRecording) {
            this.stopRecording();
            return;
        }

        this.isRecording = true;
        this.showFeedback({ description: 'Recording shortcut... Press keys to record, Escape to cancel' });

        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce('Recording keyboard shortcut. Press the keys you want to assign, then Escape to finish.', 'assertive');
        }
    }

    stopRecording() {
        this.isRecording = false;
        this.showFeedback({ description: 'Shortcut recording stopped' });

        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce('Shortcut recording stopped', 'polite');
        }
    }

    recordShortcut(e) {
        const keyCombo = this.buildKeyCombo(e);
        if (!keyCombo || keyCombo === 'Escape') {
            this.stopRecording();
            return;
        }

        // Show recorded shortcut
        this.showFeedback({ description: `Recorded: ${keyCombo}` });

        // Here you would typically show a dialog to assign action
        this.promptForShortcutAction(keyCombo);
    }

    promptForShortcutAction(keyCombo) {
        // This would open a dialog to select what action to assign
        // For now, just show the recorded key combination
        console.log('Recorded shortcut:', keyCombo);
        this.stopRecording();
    }

    resetToDefaults() {
        if (confirm('Reset all keyboard shortcuts to defaults? This will remove all customizations.')) {
            this.customShortcuts.clear();
            this.shortcuts.clear();
            this.sequences.clear();

            // Re-register defaults
            this.registerDefaultShortcuts();
            this.registerStreamingShortcuts();
            this.registerAccessibilityShortcuts();
            this.registerNavigationShortcuts();
            this.registerCustomizationShortcuts();

            this.saveUserCustomizations();
            this.showFeedback({ description: 'Shortcuts reset to defaults' });

            if (this.accessibilitySystem) {
                this.accessibilitySystem.announce('All keyboard shortcuts reset to defaults', 'polite');
            }
        }
    }

    // Media controls
    adjustVolume(delta) {
        if (this.streamingInterface && this.streamingInterface.adjustVolume) {
            this.streamingInterface.adjustVolume(delta);
        } else {
            // Fallback to global volume control
            const videos = document.querySelectorAll('video, audio');
            videos.forEach(media => {
                const newVolume = Math.max(0, Math.min(1, media.volume + (delta / 100)));
                media.volume = newVolume;
            });
        }

        this.showFeedback({ description: `Volume ${delta > 0 ? 'increased' : 'decreased'}` });
    }

    cycleQuality(reverse = false) {
        if (this.streamingInterface && this.streamingInterface.cycleQuality) {
            this.streamingInterface.cycleQuality(reverse);
        } else {
            this.showFeedback({ description: 'Quality control not available' });
        }
    }

    // Participant controls
    muteAllParticipants() {
        if (this.streamingInterface && this.streamingInterface.muteAllParticipants) {
            this.streamingInterface.muteAllParticipants();
            this.showFeedback({ description: 'All participants muted' });
        }
    }

    unmuteAllParticipants() {
        if (this.streamingInterface && this.streamingInterface.unmuteAllParticipants) {
            this.streamingInterface.unmuteAllParticipants();
            this.showFeedback({ description: 'All participants unmuted' });
        }
    }

    kickParticipant() {
        // This would typically show a participant selection dialog
        this.showFeedback({ description: 'Participant kick dialog would open here' });
    }

    // Navigation actions
    skipToTarget(targetId) {
        if (this.accessibilitySystem) {
            return this.accessibilitySystem.skipToTarget(targetId);
        } else {
            const target = document.getElementById(targetId);
            if (target) {
                target.focus();
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return true;
            }
        }
        return false;
    }

    toggleAccessibilityFeature(feature) {
        if (this.accessibilitySystem) {
            return this.accessibilitySystem.toggleFeature(feature);
        }
        return false;
    }

    navigateHeadings(direction) {
        if (this.accessibilitySystem) {
            return this.accessibilitySystem.navigateHeadings(direction);
        }

        // Fallback navigation
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        if (headings.length === 0) return false;

        const currentIndex = Array.from(headings).findIndex(h => h === document.activeElement);
        let nextIndex;

        if (direction === 'next') {
            nextIndex = currentIndex < headings.length - 1 ? currentIndex + 1 : 0;
        } else {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : headings.length - 1;
        }

        headings[nextIndex].focus();
        headings[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
    }

    navigateLandmarks(direction) {
        if (this.accessibilitySystem) {
            return this.accessibilitySystem.navigateLandmarks(direction);
        }

        // Fallback navigation
        const landmarks = document.querySelectorAll('[role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"]');
        if (landmarks.length === 0) return false;

        const currentIndex = Array.from(landmarks).findIndex(l => l === document.activeElement);
        let nextIndex;

        if (direction === 'next') {
            nextIndex = currentIndex < landmarks.length - 1 ? currentIndex + 1 : 0;
        } else {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : landmarks.length - 1;
        }

        landmarks[nextIndex].focus();
        landmarks[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
    }

    navigateButtons(direction) {
        const buttons = document.querySelectorAll('button:not([disabled]), [role="button"]:not([aria-disabled="true"])');
        if (buttons.length === 0) return false;

        const currentIndex = Array.from(buttons).findIndex(b => b === document.activeElement);
        let nextIndex;

        if (direction === 'next') {
            nextIndex = currentIndex < buttons.length - 1 ? currentIndex + 1 : 0;
        } else {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
        }

        buttons[nextIndex].focus();
        buttons[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
    }

    navigateInputs(direction) {
        const inputs = document.querySelectorAll('input:not([disabled]), textarea:not([disabled]), select:not([disabled])');
        if (inputs.length === 0) return false;

        const currentIndex = Array.from(inputs).findIndex(i => i === document.activeElement);
        let nextIndex;

        if (direction === 'next') {
            nextIndex = currentIndex < inputs.length - 1 ? currentIndex + 1 : 0;
        } else {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : inputs.length - 1;
        }

        inputs[nextIndex].focus();
        inputs[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
    }

    // Panel and tab navigation
    nextTab() {
        const tabs = document.querySelectorAll('[role="tab"], .tab-button, .nav-tab');
        if (tabs.length === 0) return false;

        const activeTab = document.querySelector('[role="tab"][aria-selected="true"], .tab-button.active, .nav-tab.active');
        if (!activeTab) {
            tabs[0].click();
            return true;
        }

        const currentIndex = Array.from(tabs).indexOf(activeTab);
        const nextIndex = (currentIndex + 1) % tabs.length;
        tabs[nextIndex].click();
        return true;
    }

    previousTab() {
        const tabs = document.querySelectorAll('[role="tab"], .tab-button, .nav-tab');
        if (tabs.length === 0) return false;

        const activeTab = document.querySelector('[role="tab"][aria-selected="true"], .tab-button.active, .nav-tab.active');
        if (!activeTab) {
            tabs[tabs.length - 1].click();
            return true;
        }

        const currentIndex = Array.from(tabs).indexOf(activeTab);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        tabs[prevIndex].click();
        return true;
    }

    focusPanel(panelName) {
        const panelSelectors = {
            video: '.video-area, .video-panel, #video-player',
            chat: '.chat-container, .chat-panel, #chat',
            participants: '.participants-panel, .participants-list, #participants',
            controls: '.controls-panel, .control-bar, #controls',
            settings: '.settings-panel, .settings-container, #settings'
        };

        const selector = panelSelectors[panelName];
        if (!selector) return false;

        const panel = document.querySelector(selector);
        if (!panel) return false;

        // Find first focusable element in panel
        const focusable = panel.querySelector('button, input, select, textarea, a, [tabindex]:not([tabindex="-1"])');
        if (focusable) {
            focusable.focus();
            panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return true;
        }

        return false;
    }

    // Quick navigation
    goToHome() {
        const homeLink = document.querySelector('a[href="/"], a[href="#home"], .home-link');
        if (homeLink) {
            homeLink.click();
            return true;
        }
        return false;
    }

    goToSettings() {
        const settingsLink = document.querySelector('a[href*="settings"], .settings-link, #settings-btn');
        if (settingsLink) {
            settingsLink.click();
            return true;
        }
        return false;
    }

    goToProfile() {
        const profileLink = document.querySelector('a[href*="profile"], .profile-link, #profile-btn');
        if (profileLink) {
            profileLink.click();
            return true;
        }
        return false;
    }

    goToDashboard() {
        const dashboardLink = document.querySelector('a[href*="dashboard"], .dashboard-link, #dashboard-btn');
        if (dashboardLink) {
            dashboardLink.click();
            return true;
        }
        return false;
    }

    // Search and commands
    openSearch() {
        const searchInput = document.querySelector('input[type="search"], .search-input, #search');
        if (searchInput) {
            searchInput.focus();
            return true;
        }
        return false;
    }

    openQuickSearch() {
        // This would typically open a quick search overlay
        this.showFeedback({ description: 'Quick search would open here' });
        return false;
    }

    openCommandPalette() {
        // This would typically open a command palette
        this.showFeedback({ description: 'Command palette would open here' });
        return false;
    }

    // Theme controls
    setTheme(theme) {
        if (this.themeSystem) {
            this.themeSystem.setTheme(theme);
            this.showFeedback({ description: `Theme set to ${theme}` });
            return true;
        }
        return false;
    }

    toggleTheme() {
        if (this.themeSystem) {
            const currentTheme = this.themeSystem.getCurrentTheme();
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            this.themeSystem.setTheme(newTheme);
            this.showFeedback({ description: `Switched to ${newTheme} theme` });
            return true;
        }
        return false;
    }

    toggleDarkMode() {
        return this.toggleTheme();
    }

    toggleAccessibilityPanel() {
        const panel = document.querySelector('.accessibility-panel, #accessibility-controls');
        if (panel) {
            panel.style.display = panel.style.display === 'none' ? '' : 'none';
            this.showFeedback({ description: 'Accessibility panel toggled' });
            return true;
        }
        return false;
    }

    // Layout controls
    setLayout(layout) {
        if (this.streamingInterface && this.streamingInterface.changeLayout) {
            this.streamingInterface.changeLayout(layout);
            this.showFeedback({ description: `Layout set to ${layout}` });
            return true;
        }
        return false;
    }

    cycleLayouts() {
        const layouts = ['spotlight', 'grid', 'sidebar', 'presentation'];
        const currentLayout = this.streamingInterface?.currentLayout || 'spotlight';
        const currentIndex = layouts.indexOf(currentLayout);
        const nextIndex = (currentIndex + 1) % layouts.length;

        return this.setLayout(layouts[nextIndex]);
    }

    // View controls
    zoomIn() {
        const currentZoom = parseFloat(document.body.style.zoom || '1');
        const newZoom = Math.min(3, currentZoom + 0.1);
        document.body.style.zoom = newZoom;
        this.showFeedback({ description: `Zoom: ${Math.round(newZoom * 100)}%` });
        return true;
    }

    zoomOut() {
        const currentZoom = parseFloat(document.body.style.zoom || '1');
        const newZoom = Math.max(0.5, currentZoom - 0.1);
        document.body.style.zoom = newZoom;
        this.showFeedback({ description: `Zoom: ${Math.round(newZoom * 100)}%` });
        return true;
    }

    resetZoom() {
        document.body.style.zoom = '1';
        this.showFeedback({ description: 'Zoom reset to 100%' });
        return true;
    }

    // Window controls
    toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
            this.showFeedback({ description: 'Exited fullscreen' });
        } else {
            document.documentElement.requestFullscreen();
            this.showFeedback({ description: 'Entered fullscreen' });
        }
        return true;
    }

    // Developer tools
    toggleDevTools() {
        // This would typically open browser dev tools
        this.showFeedback({ description: 'Developer tools shortcut (browser dependent)' });
        return false;
    }

    inspectElement() {
        // This would typically start element inspection
        this.showFeedback({ description: 'Element inspection shortcut (browser dependent)' });
        return false;
    }

    openConsole() {
        // This would typically open browser console
        this.showFeedback({ description: 'Console shortcut (browser dependent)' });
        return false;
    }

    /**
     * Create help modal
     */
    createHelpModal() {
        this.helpModal = document.createElement('div');
        this.helpModal.className = 'keyboard-shortcuts-modal';
        this.helpModal.style.display = 'none';
        this.helpModal.innerHTML = `
            <div class="shortcuts-modal-overlay">
                <div class="shortcuts-modal-content">
                    <div class="shortcuts-modal-header">
                        <h2>Keyboard Shortcuts</h2>
                        <div class="shortcuts-modal-controls">
                            <button class="shortcuts-search-toggle" title="Toggle search">
                                <i class="fas fa-search"></i>
                            </button>
                            <button class="shortcuts-close" title="Close (Esc)">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>

                    <div class="shortcuts-search" style="display: none;">
                        <input type="text" placeholder="Search shortcuts..." class="shortcuts-search-input">
                    </div>

                    <div class="shortcuts-modal-body">
                        <div class="shortcuts-categories"></div>
                    </div>

                    <div class="shortcuts-modal-footer">
                        <div class="shortcuts-stats">
                            <span class="shortcuts-count">0 shortcuts</span>
                            <span class="shortcuts-context">Global context</span>
                        </div>
                        <div class="shortcuts-actions">
                            <button class="btn-secondary" onclick="this.closest('.keyboard-shortcuts-modal').style.display='none'">Close</button>
                            <button class="btn-primary" id="customize-shortcuts">Customize</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.helpModal);

        // Setup event listeners
        this.helpModal.querySelector('.shortcuts-close').addEventListener('click', () => this.hideHelp());
        this.helpModal.querySelector('.shortcuts-modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.hideHelp();
        });

        const searchToggle = this.helpModal.querySelector('.shortcuts-search-toggle');
        const searchContainer = this.helpModal.querySelector('.shortcuts-search');
        const searchInput = this.helpModal.querySelector('.shortcuts-search-input');

        searchToggle.addEventListener('click', () => {
            const isVisible = searchContainer.style.display !== 'none';
            searchContainer.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) {
                searchInput.focus();
            }
        });

        searchInput.addEventListener('input', (e) => {
            this.filterShortcuts(e.target.value);
        });

        this.helpModal.querySelector('#customize-shortcuts').addEventListener('click', () => {
            this.openCustomizationPanel();
        });
    }

    /**
     * Create feedback overlay
     */
    createFeedbackOverlay() {
        this.feedbackOverlay = document.createElement('div');
        this.feedbackOverlay.className = 'shortcut-feedback';
        this.feedbackOverlay.setAttribute('aria-live', 'polite');
        this.feedbackOverlay.setAttribute('aria-atomic', 'true');
        document.body.appendChild(this.feedbackOverlay);
    }

    /**
     * Populate help content
     */
    populateHelpContent() {
        const categoriesContainer = this.helpModal.querySelector('.shortcuts-categories');
        const context = this.getCurrentContext();

        // Group shortcuts by category
        const categories = new Map();

        // Add shortcuts from current context
        if (this.shortcuts.has(context)) {
            this.shortcuts.get(context).forEach((shortcut, keyCombo) => {
                if (!categories.has(shortcut.category)) {
                    categories.set(shortcut.category, []);
                }
                categories.get(shortcut.category).push({ ...shortcut, keyCombo });
            });
        }

        // Add global shortcuts if not in global context
        if (context !== 'global' && this.shortcuts.has('global')) {
            this.shortcuts.get('global').forEach((shortcut, keyCombo) => {
                if (!categories.has(shortcut.category)) {
                    categories.set(shortcut.category, []);
                }
                categories.get(shortcut.category).push({ ...shortcut, keyCombo, global: true });
            });
        }

        // Add sequence shortcuts
        this.sequences.forEach((sequenceMap) => {
            sequenceMap.forEach((shortcut, keyCombo) => {
                if (!categories.has(shortcut.category)) {
                    categories.set(shortcut.category, []);
                }
                categories.get(shortcut.category).push({ ...shortcut, keyCombo, sequence: true });
            });
        });

        // Clear existing content
        categoriesContainer.innerHTML = '';

        // Create category sections
        const sortedCategories = Array.from(categories.entries()).sort(([a], [b]) => {
            const order = ['help', 'navigation', 'media', 'accessibility', 'interface', 'layout', 'system'];
            return (order.indexOf(a) || 999) - (order.indexOf(b) || 999);
        });

        let totalShortcuts = 0;

        sortedCategories.forEach(([category, shortcuts]) => {
            const categoryElement = document.createElement('div');
            categoryElement.className = 'shortcuts-category';

            const categoryTitle = document.createElement('h3');
            categoryTitle.className = 'shortcuts-category-title';
            categoryTitle.textContent = this.formatCategoryName(category);
            categoryElement.appendChild(categoryTitle);

            const shortcutsList = document.createElement('div');
            shortcutsList.className = 'shortcuts-list';

            shortcuts.forEach(shortcut => {
                if (!shortcut.enabled) return;

                const shortcutElement = document.createElement('div');
                shortcutElement.className = 'shortcut-item';
                if (shortcut.global) shortcutElement.classList.add('global');
                if (shortcut.sequence) shortcutElement.classList.add('sequence');
                if (shortcut.custom) shortcutElement.classList.add('custom');

                shortcutElement.innerHTML = `
                    <div class="shortcut-keys">
                        ${this.formatKeyCombo(shortcut.keyCombo)}
                    </div>
                    <div class="shortcut-description">
                        ${shortcut.description}
                        ${shortcut.global ? '<span class="shortcut-badge">Global</span>' : ''}
                        ${shortcut.sequence ? '<span class="shortcut-badge">Sequence</span>' : ''}
                        ${shortcut.custom ? '<span class="shortcut-badge">Custom</span>' : ''}
                    </div>
                `;

                shortcutsList.appendChild(shortcutElement);
                totalShortcuts++;
            });

            if (shortcutsList.children.length > 0) {
                categoryElement.appendChild(shortcutsList);
                categoriesContainer.appendChild(categoryElement);
            }
        });

        // Update stats
        this.helpModal.querySelector('.shortcuts-count').textContent = `${totalShortcuts} shortcuts`;
        this.helpModal.querySelector('.shortcuts-context').textContent = `${this.formatContextName(context)} context`;
    }

    /**
     * Format category name
     */
    formatCategoryName(category) {
        const names = {
            help: 'Help & Documentation',
            navigation: 'Navigation',
            media: 'Media Controls',
            accessibility: 'Accessibility',
            interface: 'Interface',
            layout: 'Layout',
            system: 'System',
            recording: 'Recording',
            participants: 'Participants',
            theme: 'Theme',
            view: 'View',
            search: 'Search',
            developer: 'Developer',
            quick: 'Quick Actions',
            window: 'Window'
        };

        return names[category] || category.charAt(0).toUpperCase() + category.slice(1);
    }

    /**
     * Format context name
     */
    formatContextName(context) {
        const names = {
            global: 'Global',
            streaming: 'Streaming',
            modal: 'Modal',
            video: 'Video',
            chat: 'Chat',
            participants: 'Participants',
            controls: 'Controls',
            settings: 'Settings'
        };

        return names[context] || context.charAt(0).toUpperCase() + context.slice(1);
    }

    /**
     * Format key combination for display
     */
    formatKeyCombo(keyCombo) {
        return keyCombo.split('+').map(key => {
            const keyNames = {
                'Ctrl': 'Ctrl',
                'Alt': 'Alt',
                'Shift': 'Shift',
                'Meta': 'Cmd',
                'Space': 'Space',
                'ArrowUp': '↑',
                'ArrowDown': '↓',
                'ArrowLeft': '←',
                'ArrowRight': '→',
                'Enter': 'Enter',
                'Escape': 'Esc',
                'Backspace': 'Backspace',
                'Delete': 'Del',
                'Tab': 'Tab'
            };

            const displayKey = keyNames[key] || key;
            return `<kbd class="key">${displayKey}</kbd>`;
        }).join('<span class="key-separator">+</span>');
    }

    /**
     * Filter shortcuts in help modal
     */
    filterShortcuts(query) {
        const categories = this.helpModal.querySelectorAll('.shortcuts-category');
        let visibleCount = 0;

        categories.forEach(category => {
            const shortcuts = category.querySelectorAll('.shortcut-item');
            let categoryHasVisible = false;

            shortcuts.forEach(shortcut => {
                const description = shortcut.querySelector('.shortcut-description').textContent.toLowerCase();
                const keys = shortcut.querySelector('.shortcut-keys').textContent.toLowerCase();

                if (description.includes(query.toLowerCase()) || keys.includes(query.toLowerCase())) {
                    shortcut.style.display = '';
                    categoryHasVisible = true;
                    visibleCount++;
                } else {
                    shortcut.style.display = 'none';
                }
            });

            category.style.display = categoryHasVisible ? '' : 'none';
        });

        this.helpModal.querySelector('.shortcuts-count').textContent = `${visibleCount} shortcuts`;
    }

    /**
     * Open customization panel
     */
    openCustomizationPanel() {
        // This would open a more advanced customization interface
        this.showFeedback({ description: 'Customization panel would open here' });
    }

    /**
     * Event handlers
     */
    handleFocusChange(e) {
        // Update context based on focused element
        const newContext = this.getCurrentContext();
        if (newContext !== this.currentContext) {
            this.currentContext = newContext;
            this.container.dispatchEvent(new CustomEvent('shortcut-context-change', {
                detail: { oldContext: this.currentContext, newContext }
            }));
        }
    }

    handleContextChange(e) {
        // Update context based on clicked element
        this.handleFocusChange(e);
    }

    handleDOMChanges(mutations) {
        // Detect modal/overlay changes
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.matches('.modal, .modal-overlay, .dropdown')) {
                            this.handleFocusChange({ target: node });
                        }
                    }
                });
            }
        });
    }

    handleShortcutConflict(e) {
        const { keyCombo, context, shortcuts } = e.detail;
        console.warn('Shortcut conflict detected:', { keyCombo, context, shortcuts });

        // Could show a conflict resolution dialog here
        this.showFeedback({ description: `Shortcut conflict: ${keyCombo}` });
    }

    handleCustomContextChange(e) {
        const { context } = e.detail;
        this.currentContext = context;
    }

    handleStickyKeyRelease(e) {
        // Handle sticky keys for accessibility
        if (this.accessibilitySystem?.settings.stickyKeys) {
            // Implementation would depend on sticky keys system
        }
    }

    /**
     * Customization and persistence
     */
    loadUserCustomizations() {
        try {
            const saved = localStorage.getItem('keyboard-shortcuts-customizations');
            if (saved) {
                const customizations = JSON.parse(saved);

                // Apply saved settings
                if (customizations.settings) {
                    Object.assign(this.settings, customizations.settings);
                }

                // Apply custom shortcuts
                if (customizations.shortcuts) {
                    customizations.shortcuts.forEach(shortcut => {
                        shortcut.custom = true;
                        this.register(
                            shortcut.keyCombo,
                            shortcut.callback,
                            shortcut.description,
                            shortcut.category,
                            shortcut.context,
                            shortcut.priority
                        );
                    });
                }

                // Apply disabled shortcuts
                if (customizations.disabled) {
                    customizations.disabled.forEach(({ keyCombo, context }) => {
                        this.disableShortcut(keyCombo, context);
                    });
                }
            }
        } catch (error) {
            console.error('Failed to load keyboard shortcuts customizations:', error);
        }
    }

    saveUserCustomizations() {
        try {
            const customizations = {
                settings: this.settings,
                shortcuts: Array.from(this.customShortcuts.values()),
                disabled: this.getDisabledShortcuts(),
                timestamp: Date.now()
            };

            localStorage.setItem('keyboard-shortcuts-customizations', JSON.stringify(customizations));
        } catch (error) {
            console.error('Failed to save keyboard shortcuts customizations:', error);
        }
    }

    getDisabledShortcuts() {
        const disabled = [];

        this.shortcuts.forEach((contextShortcuts, context) => {
            contextShortcuts.forEach((shortcut, keyCombo) => {
                if (!shortcut.enabled) {
                    disabled.push({ keyCombo, context });
                }
            });
        });

        return disabled;
    }

    /**
     * Utility methods
     */
    detectConflicts() {
        const allShortcuts = new Map();

        this.shortcuts.forEach((contextShortcuts, context) => {
            contextShortcuts.forEach((shortcut, keyCombo) => {
                const key = `${context}:${keyCombo}`;
                if (allShortcuts.has(key)) {
                    this.handleConflict(keyCombo, shortcut, allShortcuts.get(key), context);
                } else {
                    allShortcuts.set(key, shortcut);
                }
            });
        });
    }

    playFeedbackSound() {
        // Create a simple beep sound
        if (window.AudioContext || window.webkitAudioContext) {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        }
    }

    injectKeyboardCSS() {
        const style = document.createElement('style');
        style.id = 'keyboard-shortcuts-styles';
        style.textContent = `
            /* Keyboard shortcuts modal */
            .keyboard-shortcuts-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .shortcuts-modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(4px);
            }

            .shortcuts-modal-content {
                position: relative;
                background: var(--theme-surface, #1a1a1a);
                border: 2px solid var(--theme-primary, #FF0000);
                border-radius: 12px;
                width: 90%;
                max-width: 800px;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            }

            .shortcuts-modal-header {
                padding: 20px;
                border-bottom: 1px solid var(--theme-border, #333);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .shortcuts-modal-header h2 {
                margin: 0;
                color: var(--theme-primary, #FF0000);
                font-size: 1.5rem;
            }

            .shortcuts-modal-controls {
                display: flex;
                gap: 8px;
            }

            .shortcuts-modal-controls button {
                background: transparent;
                border: 1px solid var(--theme-border, #333);
                color: var(--theme-text, #ffffff);
                padding: 8px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .shortcuts-modal-controls button:hover {
                background: var(--theme-primary, #FF0000);
                border-color: var(--theme-primary, #FF0000);
            }

            .shortcuts-search {
                padding: 0 20px 20px;
                border-bottom: 1px solid var(--theme-border, #333);
            }

            .shortcuts-search-input {
                width: 100%;
                padding: 12px;
                background: var(--theme-input, #2a2a2a);
                border: 1px solid var(--theme-border, #333);
                border-radius: 6px;
                color: var(--theme-text, #ffffff);
                font-size: 14px;
            }

            .shortcuts-search-input:focus {
                outline: none;
                border-color: var(--theme-primary, #FF0000);
                box-shadow: 0 0 0 2px rgba(255, 0, 0, 0.2);
            }

            .shortcuts-modal-body {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
            }

            .shortcuts-category {
                margin-bottom: 24px;
            }

            .shortcuts-category:last-child {
                margin-bottom: 0;
            }

            .shortcuts-category-title {
                margin: 0 0 12px 0;
                color: var(--theme-primary, #FF0000);
                font-size: 1.1rem;
                font-weight: 600;
            }

            .shortcuts-list {
                display: grid;
                gap: 8px;
            }

            .shortcut-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px;
                background: var(--theme-card, #2a2a2a);
                border: 1px solid var(--theme-border, #333);
                border-radius: 6px;
                transition: all 0.2s ease;
            }

            .shortcut-item:hover {
                border-color: var(--theme-primary, #FF0000);
                background: var(--theme-cardHover, #333);
            }

            .shortcut-item.global {
                border-left: 3px solid var(--theme-info, #0066cc);
            }

            .shortcut-item.sequence {
                border-left: 3px solid var(--theme-warning, #ff9900);
            }

            .shortcut-item.custom {
                border-left: 3px solid var(--theme-success, #00cc66);
            }

            .shortcut-keys {
                display: flex;
                gap: 4px;
                align-items: center;
            }

            .key {
                background: var(--theme-input, #3a3a3a);
                color: var(--theme-text, #ffffff);
                padding: 4px 8px;
                border-radius: 4px;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                font-size: 12px;
                border: 1px solid var(--theme-border, #555);
                min-width: 24px;
                text-align: center;
            }

            .key-separator {
                color: var(--theme-textSecondary, #999);
                font-size: 12px;
            }

            .shortcut-description {
                flex: 1;
                margin-left: 16px;
                color: var(--theme-text, #ffffff);
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .shortcut-badge {
                background: var(--theme-primary, #FF0000);
                color: var(--theme-textOnPrimary, #ffffff);
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
            }

            .shortcuts-modal-footer {
                padding: 20px;
                border-top: 1px solid var(--theme-border, #333);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .shortcuts-stats {
                display: flex;
                gap: 16px;
                color: var(--theme-textSecondary, #999);
                font-size: 14px;
            }

            .shortcuts-actions {
                display: flex;
                gap: 8px;
            }

            .shortcuts-actions button {
                padding: 8px 16px;
                border-radius: 6px;
                border: none;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s ease;
            }

            .btn-secondary {
                background: var(--theme-card, #2a2a2a);
                color: var(--theme-text, #ffffff);
                border: 1px solid var(--theme-border, #333);
            }

            .btn-secondary:hover {
                background: var(--theme-cardHover, #333);
            }

            .btn-primary {
                background: var(--theme-primary, #FF0000);
                color: var(--theme-textOnPrimary, #ffffff);
            }

            .btn-primary:hover {
                background: var(--theme-primaryHover, #cc0000);
            }

            /* Shortcut feedback */
            .shortcut-feedback {
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--theme-surface, #1a1a1a);
                color: var(--theme-text, #ffffff);
                padding: 12px 16px;
                border-radius: 6px;
                border: 1px solid var(--theme-primary, #FF0000);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                z-index: 9999;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
                max-width: 300px;
                font-size: 14px;
            }

            .shortcut-feedback.show {
                opacity: 1;
                transform: translateX(0);
            }

            .shortcut-feedback.error {
                border-color: var(--theme-danger, #ff3333);
                background: var(--theme-dangerSurface, #2a1a1a);
            }

            /* Responsive design */
            @media (max-width: 768px) {
                .shortcuts-modal-content {
                    width: 95%;
                    max-height: 90vh;
                }

                .shortcuts-modal-header {
                    padding: 16px;
                }

                .shortcuts-modal-body {
                    padding: 16px;
                }

                .shortcuts-modal-footer {
                    padding: 16px;
                    flex-direction: column;
                    gap: 12px;
                    align-items: stretch;
                }

                .shortcuts-stats {
                    justify-content: center;
                }

                .shortcuts-actions {
                    justify-content: center;
                }

                .shortcut-item {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 8px;
                }

                .shortcut-description {
                    margin-left: 0;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Public API methods
     */

    // Enable/disable shortcuts
    enable() {
        this.isEnabled = true;
        this.settings.enabled = true;
        this.saveUserCustomizations();
    }

    disable() {
        this.isEnabled = false;
        this.settings.enabled = false;
        this.saveUserCustomizations();
    }

    isShortcutsEnabled() {
        return this.isEnabled && this.settings.enabled;
    }

    // Shortcut management
    addShortcut(keyCombo, callback, description, category = 'custom', context = 'global', priority = 2) {
        const shortcut = {
            keyCombo,
            callback,
            description,
            category,
            context,
            priority,
            enabled: true,
            custom: true,
            timestamp: Date.now()
        };

        this.customShortcuts.set(`${context}:${keyCombo}`, shortcut);
        this.register(keyCombo, callback, description, category, context, priority);
        this.saveUserCustomizations();

        return true;
    }

    removeShortcut(keyCombo, context = 'global') {
        const contextShortcuts = this.shortcuts.get(context);
        if (contextShortcuts && contextShortcuts.has(keyCombo)) {
            contextShortcuts.delete(keyCombo);
            this.customShortcuts.delete(`${context}:${keyCombo}`);
            this.saveUserCustomizations();
            return true;
        }
        return false;
    }

    enableShortcut(keyCombo, context = 'global') {
        const contextShortcuts = this.shortcuts.get(context);
        if (contextShortcuts && contextShortcuts.has(keyCombo)) {
            contextShortcuts.get(keyCombo).enabled = true;
            this.saveUserCustomizations();
            return true;
        }
        return false;
    }

    disableShortcut(keyCombo, context = 'global') {
        const contextShortcuts = this.shortcuts.get(context);
        if (contextShortcuts && contextShortcuts.has(keyCombo)) {
            contextShortcuts.get(keyCombo).enabled = false;
            this.saveUserCustomizations();
            return true;
        }
        return false;
    }

    // Get shortcuts information
    getAllShortcuts(context = null) {
        if (context) {
            return this.shortcuts.get(context) || new Map();
        }

        const allShortcuts = new Map();
        this.shortcuts.forEach((contextShortcuts, ctx) => {
            contextShortcuts.forEach((shortcut, keyCombo) => {
                allShortcuts.set(`${ctx}:${keyCombo}`, { ...shortcut, context: ctx });
            });
        });

        return allShortcuts;
    }

    getShortcutsByCategory(category, context = null) {
        const shortcuts = new Map();

        if (context) {
            const contextShortcuts = this.shortcuts.get(context);
            if (contextShortcuts) {
                contextShortcuts.forEach((shortcut, keyCombo) => {
                    if (shortcut.category === category) {
                        shortcuts.set(keyCombo, shortcut);
                    }
                });
            }
        } else {
            this.shortcuts.forEach((contextShortcuts, ctx) => {
                contextShortcuts.forEach((shortcut, keyCombo) => {
                    if (shortcut.category === category) {
                        shortcuts.set(`${ctx}:${keyCombo}`, { ...shortcut, context: ctx });
                    }
                });
            });
        }

        return shortcuts;
    }

    getConflicts() {
        return this.conflicts;
    }

    // Context management
    setContext(context) {
        const oldContext = this.currentContext;
        this.currentContext = context;

        this.container.dispatchEvent(new CustomEvent('shortcut-context-change', {
            detail: { oldContext, newContext: context }
        }));
    }

    getContext() {
        return this.currentContext;
    }

    // Settings management
    updateSettings(newSettings) {
        Object.assign(this.settings, newSettings);
        this.saveUserCustomizations();
    }

    getSettings() {
        return { ...this.settings };
    }

    // Help and documentation
    showShortcutsHelp() {
        this.showHelp();
    }

    hideShortcutsHelp() {
        this.hideHelp();
    }

    isHelpVisible() {
        return this.helpVisible;
    }

    // Feedback control
    showShortcutFeedback(message, type = 'info') {
        this.showFeedback({ description: message });
    }

    // Integration methods
    setStreamingInterface(streamingInterface) {
        this.streamingInterface = streamingInterface;
    }

    setAccessibilitySystem(accessibilitySystem) {
        this.accessibilitySystem = accessibilitySystem;
    }

    setThemeSystem(themeSystem) {
        this.themeSystem = themeSystem;
    }

    setResponsiveSystem(responsiveSystem) {
        this.responsiveSystem = responsiveSystem;
    }

    // Statistics and monitoring
    getUsageStats() {
        return {
            totalShortcuts: this.getAllShortcuts().size,
            enabledShortcuts: Array.from(this.getAllShortcuts().values()).filter(s => s.enabled).length,
            customShortcuts: this.customShortcuts.size,
            conflicts: this.conflicts.size,
            currentContext: this.currentContext,
            lastShortcut: this.lastShortcut,
            isEnabled: this.isEnabled
        };
    }

    // Export/import
    exportShortcuts() {
        return {
            shortcuts: Array.from(this.getAllShortcuts().entries()),
            sequences: Array.from(this.sequences.entries()),
            settings: this.settings,
            customShortcuts: Array.from(this.customShortcuts.entries()),
            timestamp: Date.now(),
            version: '1.0.0'
        };
    }

    importShortcuts(data) {
        try {
            if (data.shortcuts) {
                data.shortcuts.forEach(([key, shortcut]) => {
                    const [context, keyCombo] = key.split(':');
                    this.register(
                        keyCombo,
                        shortcut.callback,
                        shortcut.description,
                        shortcut.category,
                        context,
                        shortcut.priority
                    );
                });
            }

            if (data.settings) {
                Object.assign(this.settings, data.settings);
            }

            if (data.customShortcuts) {
                data.customShortcuts.forEach(([key, shortcut]) => {
                    this.customShortcuts.set(key, shortcut);
                });
            }

            this.saveUserCustomizations();
            return true;
        } catch (error) {
            console.error('Failed to import shortcuts:', error);
            return false;
        }
    }

    // Cleanup
    destroy() {
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeydown);
        document.removeEventListener('keyup', this.handleKeyup);
        document.removeEventListener('focusin', this.handleFocusChange);
        document.removeEventListener('click', this.handleContextChange);
        window.removeEventListener('beforeunload', this.saveUserCustomizations);

        // Clear timers
        if (this.sequenceTimer) {
            clearTimeout(this.sequenceTimer);
        }

        // Remove DOM elements
        if (this.helpModal && this.helpModal.parentNode) {
            this.helpModal.parentNode.removeChild(this.helpModal);
        }

        if (this.feedbackOverlay && this.feedbackOverlay.parentNode) {
            this.feedbackOverlay.parentNode.removeChild(this.feedbackOverlay);
        }

        // Remove styles
        const styles = document.getElementById('keyboard-shortcuts-styles');
        if (styles && styles.parentNode) {
            styles.parentNode.removeChild(styles);
        }

        // Clear data
        this.shortcuts.clear();
        this.sequences.clear();
        this.customShortcuts.clear();
        this.conflicts.clear();
        this.priorities.clear();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeyboardShortcutsSystem;
} else if (typeof window !== 'undefined') {
    window.KeyboardShortcutsSystem = KeyboardShortcutsSystem;
}
