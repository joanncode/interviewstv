/**
 * Chat Notification Interface
 * Advanced notification system with sounds, desktop notifications, and visual alerts
 */
class ChatNotificationInterface {
    constructor(options = {}) {
        this.websocket = options.websocket || null;
        this.currentUserId = options.currentUserId || null;
        this.currentUserRole = options.currentUserRole || 'guest';
        this.roomId = options.roomId || 'default';
        this.container = options.container || null;
        this.onNotificationClick = options.onNotificationClick || (() => {});
        this.onSoundPlay = options.onSoundPlay || (() => {});
        
        // Notification state
        this.notifications = new Map(); // notificationId -> notification data
        this.notificationQueue = [];
        this.activeNotifications = new Set();
        this.soundQueue = [];
        this.isPlayingSound = false;
        
        // Permission state
        this.hasNotificationPermission = false;
        this.hasAudioPermission = false;
        this.isDocumentVisible = true;
        this.isWindowFocused = true;
        
        // Audio context and sounds
        this.audioContext = null;
        this.audioBuffers = new Map();
        this.soundNodes = new Map();
        
        // UI elements
        this.notificationContainer = null;
        this.soundToggle = null;
        this.notificationToggle = null;
        
        // Settings
        this.settings = {
            // Sound settings
            soundEnabled: true,
            soundVolume: 0.7,
            messageSoundEnabled: true,
            mentionSoundEnabled: true,
            joinLeaveSoundEnabled: true,
            privateSoundEnabled: true,
            systemSoundEnabled: true,
            
            // Desktop notification settings
            desktopNotificationsEnabled: true,
            showNotificationPreview: true,
            notificationTimeout: 5000,
            maxNotifications: 5,
            
            // Visual notification settings
            visualNotificationsEnabled: true,
            showToastNotifications: true,
            showBadgeNotifications: true,
            showTitleNotifications: true,
            
            // Behavior settings
            notifyOnlyWhenHidden: true,
            notifyForOwnMessages: false,
            notifyForMentions: true,
            notifyForPrivateMessages: true,
            notifyForSystemMessages: true,
            notifyForUserJoinLeave: false,
            
            // Sound files
            sounds: {
                message: 'notification-message.mp3',
                mention: 'notification-mention.mp3',
                private: 'notification-private.mp3',
                join: 'notification-join.mp3',
                leave: 'notification-leave.mp3',
                system: 'notification-system.mp3',
                error: 'notification-error.mp3',
                success: 'notification-success.mp3'
            },
            
            ...options.settings
        };
        
        // Notification types
        this.notificationTypes = {
            MESSAGE: 'message',
            MENTION: 'mention',
            PRIVATE: 'private',
            JOIN: 'join',
            LEAVE: 'leave',
            SYSTEM: 'system',
            ERROR: 'error',
            SUCCESS: 'success',
            WARNING: 'warning',
            INFO: 'info'
        };
        
        this.init();
    }
    
    /**
     * Initialize the notification interface
     */
    init() {
        this.checkPermissions();
        this.initializeAudioContext();
        this.loadSounds();
        this.createNotificationInterface();
        this.attachEventListeners();
        this.loadNotificationSettings();
        
        if (this.websocket) {
            this.attachWebSocketListeners();
        }
    }
    
    /**
     * Check browser permissions
     */
    async checkPermissions() {
        // Check notification permission
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                this.hasNotificationPermission = true;
            } else if (Notification.permission === 'default') {
                try {
                    const permission = await Notification.requestPermission();
                    this.hasNotificationPermission = permission === 'granted';
                } catch (error) {
                    console.warn('Failed to request notification permission:', error);
                }
            }
        }
        
        // Check audio permission (will be requested when first sound is played)
        this.hasAudioPermission = true; // Assume true, will be checked on first play
    }
    
    /**
     * Initialize audio context
     */
    initializeAudioContext() {
        try {
            // Create audio context
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.audioContext = new AudioContext();
                
                // Resume audio context on user interaction
                const resumeAudio = () => {
                    if (this.audioContext.state === 'suspended') {
                        this.audioContext.resume();
                    }
                };
                
                document.addEventListener('click', resumeAudio, { once: true });
                document.addEventListener('keydown', resumeAudio, { once: true });
            }
        } catch (error) {
            console.warn('Failed to initialize audio context:', error);
        }
    }
    
    /**
     * Load sound files
     */
    async loadSounds() {
        if (!this.audioContext) return;
        
        const soundPromises = Object.entries(this.settings.sounds).map(async ([key, filename]) => {
            try {
                // For demo purposes, we'll create synthetic sounds
                const buffer = this.createSyntheticSound(key);
                this.audioBuffers.set(key, buffer);
            } catch (error) {
                console.warn(`Failed to load sound ${key}:`, error);
            }
        });
        
        await Promise.all(soundPromises);
    }
    
    /**
     * Create synthetic sound for demo
     */
    createSyntheticSound(type) {
        if (!this.audioContext) return null;
        
        const sampleRate = this.audioContext.sampleRate;
        const duration = 0.3; // 300ms
        const length = sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate different tones for different notification types
        const frequencies = {
            message: [800, 600],
            mention: [1000, 800, 600],
            private: [600, 800, 1000],
            join: [400, 600],
            leave: [600, 400],
            system: [500],
            error: [300, 200],
            success: [600, 800, 1000, 1200]
        };
        
        const freqs = frequencies[type] || [500];
        const noteLength = length / freqs.length;
        
        for (let i = 0; i < length; i++) {
            const noteIndex = Math.floor(i / noteLength);
            const freq = freqs[noteIndex] || freqs[0];
            const time = i / sampleRate;
            const envelope = Math.exp(-time * 3); // Exponential decay
            data[i] = Math.sin(2 * Math.PI * freq * time) * envelope * 0.3;
        }
        
        return buffer;
    }
    
    /**
     * Create notification interface
     */
    createNotificationInterface() {
        // Create notification container
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.className = 'notification-container';
        this.notificationContainer.id = 'notification-container';
        
        // Add to body
        document.body.appendChild(this.notificationContainer);
        
        // Create notification controls in chat interface
        if (this.container) {
            this.createNotificationControls();
        }
    }
    
    /**
     * Create notification controls
     */
    createNotificationControls() {
        // Find or create controls container
        let controlsContainer = this.container.querySelector('.chat-controls');
        if (!controlsContainer) {
            controlsContainer = document.createElement('div');
            controlsContainer.className = 'chat-controls';
            
            // Add to chat header
            const chatHeader = this.container.querySelector('.chat-header');
            if (chatHeader) {
                chatHeader.appendChild(controlsContainer);
            }
        }
        
        // Add notification controls
        const notificationControls = document.createElement('div');
        notificationControls.className = 'notification-controls';
        notificationControls.innerHTML = `
            <button class="notification-control-btn" id="sound-toggle" title="Toggle Sounds">
                <i class="fas fa-volume-up"></i>
            </button>
            <button class="notification-control-btn" id="notification-toggle" title="Toggle Notifications">
                <i class="fas fa-bell"></i>
            </button>
            <button class="notification-control-btn" id="notification-settings-btn" title="Notification Settings">
                <i class="fas fa-cog"></i>
            </button>
        `;
        
        controlsContainer.appendChild(notificationControls);
        
        // Store references
        this.soundToggle = notificationControls.querySelector('#sound-toggle');
        this.notificationToggle = notificationControls.querySelector('#notification-toggle');
        
        // Create settings panel
        this.createNotificationSettingsPanel();
        
        // Update control states
        this.updateControlStates();
    }
    
    /**
     * Create notification settings panel
     */
    createNotificationSettingsPanel() {
        const settingsPanel = document.createElement('div');
        settingsPanel.className = 'notification-settings-panel';
        settingsPanel.id = 'notification-settings-panel';
        settingsPanel.style.display = 'none';
        settingsPanel.innerHTML = `
            <div class="settings-header">
                <h4><i class="fas fa-bell me-2"></i>Notification Settings</h4>
                <button class="close-settings-btn" id="close-notification-settings-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="settings-content">
                <div class="settings-section">
                    <h6>Sound Settings</h6>
                    <div class="setting-group">
                        <label class="setting-checkbox">
                            <input type="checkbox" id="sound-enabled" ${this.settings.soundEnabled ? 'checked' : ''}>
                            <span>Enable sounds</span>
                        </label>
                    </div>
                    <div class="setting-group">
                        <label>Sound Volume</label>
                        <input type="range" id="sound-volume" min="0" max="1" step="0.1" value="${this.settings.soundVolume}" class="setting-range">
                        <span class="range-value">${Math.round(this.settings.soundVolume * 100)}%</span>
                    </div>
                    <div class="setting-group">
                        <label class="setting-checkbox">
                            <input type="checkbox" id="message-sound" ${this.settings.messageSoundEnabled ? 'checked' : ''}>
                            <span>Message sounds</span>
                        </label>
                    </div>
                    <div class="setting-group">
                        <label class="setting-checkbox">
                            <input type="checkbox" id="mention-sound" ${this.settings.mentionSoundEnabled ? 'checked' : ''}>
                            <span>Mention sounds</span>
                        </label>
                    </div>
                    <div class="setting-group">
                        <label class="setting-checkbox">
                            <input type="checkbox" id="private-sound" ${this.settings.privateSoundEnabled ? 'checked' : ''}>
                            <span>Private message sounds</span>
                        </label>
                    </div>
                    <div class="setting-group">
                        <label class="setting-checkbox">
                            <input type="checkbox" id="join-leave-sound" ${this.settings.joinLeaveSoundEnabled ? 'checked' : ''}>
                            <span>Join/leave sounds</span>
                        </label>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h6>Desktop Notifications</h6>
                    <div class="setting-group">
                        <label class="setting-checkbox">
                            <input type="checkbox" id="desktop-notifications" ${this.settings.desktopNotificationsEnabled ? 'checked' : ''}>
                            <span>Enable desktop notifications</span>
                        </label>
                    </div>
                    <div class="setting-group">
                        <label class="setting-checkbox">
                            <input type="checkbox" id="notification-preview" ${this.settings.showNotificationPreview ? 'checked' : ''}>
                            <span>Show message preview</span>
                        </label>
                    </div>
                    <div class="setting-group">
                        <label>Notification timeout</label>
                        <select id="notification-timeout" class="setting-control">
                            <option value="3000" ${this.settings.notificationTimeout === 3000 ? 'selected' : ''}>3 seconds</option>
                            <option value="5000" ${this.settings.notificationTimeout === 5000 ? 'selected' : ''}>5 seconds</option>
                            <option value="10000" ${this.settings.notificationTimeout === 10000 ? 'selected' : ''}>10 seconds</option>
                            <option value="0" ${this.settings.notificationTimeout === 0 ? 'selected' : ''}>Never</option>
                        </select>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h6>Visual Notifications</h6>
                    <div class="setting-group">
                        <label class="setting-checkbox">
                            <input type="checkbox" id="visual-notifications" ${this.settings.visualNotificationsEnabled ? 'checked' : ''}>
                            <span>Enable visual notifications</span>
                        </label>
                    </div>
                    <div class="setting-group">
                        <label class="setting-checkbox">
                            <input type="checkbox" id="toast-notifications" ${this.settings.showToastNotifications ? 'checked' : ''}>
                            <span>Show toast notifications</span>
                        </label>
                    </div>
                    <div class="setting-group">
                        <label class="setting-checkbox">
                            <input type="checkbox" id="badge-notifications" ${this.settings.showBadgeNotifications ? 'checked' : ''}>
                            <span>Show badge notifications</span>
                        </label>
                    </div>
                    <div class="setting-group">
                        <label class="setting-checkbox">
                            <input type="checkbox" id="title-notifications" ${this.settings.showTitleNotifications ? 'checked' : ''}>
                            <span>Show title notifications</span>
                        </label>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h6>Notification Behavior</h6>
                    <div class="setting-group">
                        <label class="setting-checkbox">
                            <input type="checkbox" id="notify-when-hidden" ${this.settings.notifyOnlyWhenHidden ? 'checked' : ''}>
                            <span>Only notify when window is hidden</span>
                        </label>
                    </div>
                    <div class="setting-group">
                        <label class="setting-checkbox">
                            <input type="checkbox" id="notify-own-messages" ${this.settings.notifyForOwnMessages ? 'checked' : ''}>
                            <span>Notify for own messages</span>
                        </label>
                    </div>
                    <div class="setting-group">
                        <label class="setting-checkbox">
                            <input type="checkbox" id="notify-mentions" ${this.settings.notifyForMentions ? 'checked' : ''}>
                            <span>Notify for mentions</span>
                        </label>
                    </div>
                    <div class="setting-group">
                        <label class="setting-checkbox">
                            <input type="checkbox" id="notify-private" ${this.settings.notifyForPrivateMessages ? 'checked' : ''}>
                            <span>Notify for private messages</span>
                        </label>
                    </div>
                    <div class="setting-group">
                        <label class="setting-checkbox">
                            <input type="checkbox" id="notify-join-leave" ${this.settings.notifyForUserJoinLeave ? 'checked' : ''}>
                            <span>Notify for user join/leave</span>
                        </label>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h6>Test Notifications</h6>
                    <div class="setting-group">
                        <button class="btn btn-sm btn-primary" onclick="chatNotifications.testNotification('message')">
                            <i class="fas fa-comment me-1"></i>Test Message
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="chatNotifications.testNotification('mention')">
                            <i class="fas fa-at me-1"></i>Test Mention
                        </button>
                        <button class="btn btn-sm btn-info" onclick="chatNotifications.testNotification('private')">
                            <i class="fas fa-envelope me-1"></i>Test Private
                        </button>
                        <button class="btn btn-sm btn-success" onclick="chatNotifications.testNotification('system')">
                            <i class="fas fa-cog me-1"></i>Test System
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.container.appendChild(settingsPanel);
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Document visibility
        document.addEventListener('visibilitychange', () => {
            this.isDocumentVisible = !document.hidden;
        });
        
        // Window focus
        window.addEventListener('focus', () => {
            this.isWindowFocused = true;
            this.clearTitleNotification();
        });
        
        window.addEventListener('blur', () => {
            this.isWindowFocused = false;
        });
        
        // Control buttons
        if (this.soundToggle) {
            this.soundToggle.addEventListener('click', () => this.toggleSound());
        }
        
        if (this.notificationToggle) {
            this.notificationToggle.addEventListener('click', () => this.toggleNotifications());
        }
        
        // Settings button
        const settingsBtn = this.container?.querySelector('#notification-settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.toggleNotificationSettings());
        }
        
        // Close settings button
        const closeSettingsBtn = this.container?.querySelector('#close-notification-settings-btn');
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => this.toggleNotificationSettings());
        }
        
        // Settings listeners
        this.attachNotificationSettingsListeners();
    }
    
    /**
     * Attach notification settings listeners
     */
    attachNotificationSettingsListeners() {
        if (!this.container) return;
        
        // Sound settings
        const soundEnabled = this.container.querySelector('#sound-enabled');
        const soundVolume = this.container.querySelector('#sound-volume');
        const messageSound = this.container.querySelector('#message-sound');
        const mentionSound = this.container.querySelector('#mention-sound');
        const privateSound = this.container.querySelector('#private-sound');
        const joinLeaveSound = this.container.querySelector('#join-leave-sound');
        
        // Desktop notification settings
        const desktopNotifications = this.container.querySelector('#desktop-notifications');
        const notificationPreview = this.container.querySelector('#notification-preview');
        const notificationTimeout = this.container.querySelector('#notification-timeout');
        
        // Visual notification settings
        const visualNotifications = this.container.querySelector('#visual-notifications');
        const toastNotifications = this.container.querySelector('#toast-notifications');
        const badgeNotifications = this.container.querySelector('#badge-notifications');
        const titleNotifications = this.container.querySelector('#title-notifications');
        
        // Behavior settings
        const notifyWhenHidden = this.container.querySelector('#notify-when-hidden');
        const notifyOwnMessages = this.container.querySelector('#notify-own-messages');
        const notifyMentions = this.container.querySelector('#notify-mentions');
        const notifyPrivate = this.container.querySelector('#notify-private');
        const notifyJoinLeave = this.container.querySelector('#notify-join-leave');
        
        // Add event listeners
        soundEnabled?.addEventListener('change', (e) => this.updateNotificationSetting('soundEnabled', e.target.checked));
        soundVolume?.addEventListener('input', (e) => {
            this.updateNotificationSetting('soundVolume', parseFloat(e.target.value));
            e.target.nextElementSibling.textContent = Math.round(e.target.value * 100) + '%';
        });
        messageSound?.addEventListener('change', (e) => this.updateNotificationSetting('messageSoundEnabled', e.target.checked));
        mentionSound?.addEventListener('change', (e) => this.updateNotificationSetting('mentionSoundEnabled', e.target.checked));
        privateSound?.addEventListener('change', (e) => this.updateNotificationSetting('privateSoundEnabled', e.target.checked));
        joinLeaveSound?.addEventListener('change', (e) => this.updateNotificationSetting('joinLeaveSoundEnabled', e.target.checked));
        
        desktopNotifications?.addEventListener('change', (e) => this.updateNotificationSetting('desktopNotificationsEnabled', e.target.checked));
        notificationPreview?.addEventListener('change', (e) => this.updateNotificationSetting('showNotificationPreview', e.target.checked));
        notificationTimeout?.addEventListener('change', (e) => this.updateNotificationSetting('notificationTimeout', parseInt(e.target.value)));
        
        visualNotifications?.addEventListener('change', (e) => this.updateNotificationSetting('visualNotificationsEnabled', e.target.checked));
        toastNotifications?.addEventListener('change', (e) => this.updateNotificationSetting('showToastNotifications', e.target.checked));
        badgeNotifications?.addEventListener('change', (e) => this.updateNotificationSetting('showBadgeNotifications', e.target.checked));
        titleNotifications?.addEventListener('change', (e) => this.updateNotificationSetting('showTitleNotifications', e.target.checked));
        
        notifyWhenHidden?.addEventListener('change', (e) => this.updateNotificationSetting('notifyOnlyWhenHidden', e.target.checked));
        notifyOwnMessages?.addEventListener('change', (e) => this.updateNotificationSetting('notifyForOwnMessages', e.target.checked));
        notifyMentions?.addEventListener('change', (e) => this.updateNotificationSetting('notifyForMentions', e.target.checked));
        notifyPrivate?.addEventListener('change', (e) => this.updateNotificationSetting('notifyForPrivateMessages', e.target.checked));
        notifyJoinLeave?.addEventListener('change', (e) => this.updateNotificationSetting('notifyForUserJoinLeave', e.target.checked));
    }
    
    /**
     * Update notification setting
     */
    updateNotificationSetting(key, value) {
        this.settings[key] = value;
        this.saveNotificationSettings();
        this.updateControlStates();
    }
    
    /**
     * Save notification settings
     */
    saveNotificationSettings() {
        localStorage.setItem('chatNotificationSettings', JSON.stringify(this.settings));
    }
    
    /**
     * Load notification settings
     */
    loadNotificationSettings() {
        const saved = localStorage.getItem('chatNotificationSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }
    
    /**
     * Update control states
     */
    updateControlStates() {
        if (this.soundToggle) {
            const icon = this.soundToggle.querySelector('i');
            if (this.settings.soundEnabled) {
                icon.className = 'fas fa-volume-up';
                this.soundToggle.classList.remove('disabled');
            } else {
                icon.className = 'fas fa-volume-mute';
                this.soundToggle.classList.add('disabled');
            }
        }
        
        if (this.notificationToggle) {
            const icon = this.notificationToggle.querySelector('i');
            if (this.settings.desktopNotificationsEnabled || this.settings.visualNotificationsEnabled) {
                icon.className = 'fas fa-bell';
                this.notificationToggle.classList.remove('disabled');
            } else {
                icon.className = 'fas fa-bell-slash';
                this.notificationToggle.classList.add('disabled');
            }
        }
    }
    
    /**
     * Toggle sound
     */
    toggleSound() {
        this.settings.soundEnabled = !this.settings.soundEnabled;
        this.saveNotificationSettings();
        this.updateControlStates();
        
        // Play test sound
        if (this.settings.soundEnabled) {
            this.playSound('system');
        }
    }
    
    /**
     * Toggle notifications
     */
    toggleNotifications() {
        const newState = !(this.settings.desktopNotificationsEnabled || this.settings.visualNotificationsEnabled);
        this.settings.desktopNotificationsEnabled = newState;
        this.settings.visualNotificationsEnabled = newState;
        this.saveNotificationSettings();
        this.updateControlStates();
        
        // Show test notification
        if (newState) {
            this.showNotification('Notifications Enabled', 'You will now receive chat notifications', 'success');
        }
    }
    
    /**
     * Toggle notification settings
     */
    toggleNotificationSettings() {
        const settingsPanel = this.container?.querySelector('#notification-settings-panel');
        if (settingsPanel) {
            const isVisible = settingsPanel.style.display !== 'none';
            settingsPanel.style.display = isVisible ? 'none' : 'block';
        }
    }
    
    /**
     * Show notification
     */
    showNotification(title, message, type = 'info', options = {}) {
        const notificationData = {
            id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            title: title,
            message: message,
            type: type,
            timestamp: Date.now(),
            timeout: options.timeout || this.settings.notificationTimeout,
            icon: options.icon || this.getNotificationIcon(type),
            actions: options.actions || [],
            data: options.data || {},
            ...options
        };
        
        // Check if we should show notification
        if (!this.shouldShowNotification(notificationData)) {
            return;
        }
        
        // Store notification
        this.notifications.set(notificationData.id, notificationData);
        
        // Show different types of notifications
        if (this.settings.desktopNotificationsEnabled && this.hasNotificationPermission) {
            this.showDesktopNotification(notificationData);
        }
        
        if (this.settings.visualNotificationsEnabled) {
            if (this.settings.showToastNotifications) {
                this.showToastNotification(notificationData);
            }
            
            if (this.settings.showBadgeNotifications) {
                this.showBadgeNotification(notificationData);
            }
            
            if (this.settings.showTitleNotifications && !this.isWindowFocused) {
                this.showTitleNotification(notificationData);
            }
        }
        
        // Play sound
        if (this.shouldPlaySound(type)) {
            this.playSound(type);
        }
        
        // Callback
        this.onNotificationClick(notificationData);
        
        return notificationData.id;
    }
    
    /**
     * Should show notification
     */
    shouldShowNotification(notification) {
        // Check if notifications are enabled
        if (!this.settings.desktopNotificationsEnabled && !this.settings.visualNotificationsEnabled) {
            return false;
        }
        
        // Check if only notify when hidden
        if (this.settings.notifyOnlyWhenHidden && this.isDocumentVisible && this.isWindowFocused) {
            return false;
        }
        
        // Check notification type settings
        switch (notification.type) {
            case this.notificationTypes.MESSAGE:
                return true; // Always show message notifications
            case this.notificationTypes.MENTION:
                return this.settings.notifyForMentions;
            case this.notificationTypes.PRIVATE:
                return this.settings.notifyForPrivateMessages;
            case this.notificationTypes.JOIN:
            case this.notificationTypes.LEAVE:
                return this.settings.notifyForUserJoinLeave;
            case this.notificationTypes.SYSTEM:
                return this.settings.notifyForSystemMessages;
            default:
                return true;
        }
    }
    
    /**
     * Should play sound
     */
    shouldPlaySound(type) {
        if (!this.settings.soundEnabled) return false;
        
        switch (type) {
            case this.notificationTypes.MESSAGE:
                return this.settings.messageSoundEnabled;
            case this.notificationTypes.MENTION:
                return this.settings.mentionSoundEnabled;
            case this.notificationTypes.PRIVATE:
                return this.settings.privateSoundEnabled;
            case this.notificationTypes.JOIN:
            case this.notificationTypes.LEAVE:
                return this.settings.joinLeaveSoundEnabled;
            case this.notificationTypes.SYSTEM:
            case this.notificationTypes.ERROR:
            case this.notificationTypes.SUCCESS:
                return this.settings.systemSoundEnabled;
            default:
                return true;
        }
    }
    
    /**
     * Get notification icon
     */
    getNotificationIcon(type) {
        const icons = {
            [this.notificationTypes.MESSAGE]: 'fas fa-comment',
            [this.notificationTypes.MENTION]: 'fas fa-at',
            [this.notificationTypes.PRIVATE]: 'fas fa-envelope',
            [this.notificationTypes.JOIN]: 'fas fa-user-plus',
            [this.notificationTypes.LEAVE]: 'fas fa-user-minus',
            [this.notificationTypes.SYSTEM]: 'fas fa-cog',
            [this.notificationTypes.ERROR]: 'fas fa-exclamation-triangle',
            [this.notificationTypes.SUCCESS]: 'fas fa-check-circle',
            [this.notificationTypes.WARNING]: 'fas fa-exclamation-circle',
            [this.notificationTypes.INFO]: 'fas fa-info-circle'
        };
        
        return icons[type] || 'fas fa-bell';
    }
    
    /**
     * Show desktop notification
     */
    showDesktopNotification(notification) {
        if (!this.hasNotificationPermission) return;
        
        try {
            const options = {
                body: this.settings.showNotificationPreview ? notification.message : 'New message',
                icon: '/favicon.ico', // Use site favicon
                tag: notification.id,
                requireInteraction: notification.timeout === 0,
                silent: true // We handle sounds separately
            };
            
            const desktopNotification = new Notification(notification.title, options);
            
            // Handle click
            desktopNotification.onclick = () => {
                window.focus();
                this.handleNotificationClick(notification);
                desktopNotification.close();
            };
            
            // Auto close
            if (notification.timeout > 0) {
                setTimeout(() => {
                    desktopNotification.close();
                }, notification.timeout);
            }
            
            this.activeNotifications.add(notification.id);
            
        } catch (error) {
            console.warn('Failed to show desktop notification:', error);
        }
    }
    
    /**
     * Show toast notification
     */
    showToastNotification(notification) {
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${notification.type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="${notification.icon}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${notification.title}</div>
                <div class="toast-message">${notification.message}</div>
            </div>
            <button class="toast-close" onclick="chatNotifications.closeToastNotification('${notification.id}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        toast.dataset.notificationId = notification.id;
        toast.addEventListener('click', () => this.handleNotificationClick(notification));
        
        this.notificationContainer.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Auto close
        if (notification.timeout > 0) {
            setTimeout(() => {
                this.closeToastNotification(notification.id);
            }, notification.timeout);
        }
        
        // Limit number of notifications
        this.limitToastNotifications();
    }
    
    /**
     * Show badge notification
     */
    showBadgeNotification(notification) {
        // Update document title with badge
        const currentTitle = document.title;
        if (!currentTitle.startsWith('(')) {
            const badgeCount = this.activeNotifications.size + 1;
            document.title = `(${badgeCount}) ${currentTitle}`;
        }
    }
    
    /**
     * Show title notification
     */
    showTitleNotification(notification) {
        const originalTitle = document.title.replace(/^\(\d+\)\s*/, '');
        let isVisible = true;
        
        const flashTitle = () => {
            if (this.isWindowFocused) {
                document.title = originalTitle;
                return;
            }
            
            document.title = isVisible ? `💬 ${notification.title}` : originalTitle;
            isVisible = !isVisible;
            
            setTimeout(flashTitle, 1000);
        };
        
        flashTitle();
    }
    
    /**
     * Clear title notification
     */
    clearTitleNotification() {
        const originalTitle = document.title.replace(/^\(\d+\)\s*/, '').replace(/^💬\s*/, '');
        document.title = originalTitle;
    }
    
    /**
     * Play sound
     */
    async playSound(type) {
        if (!this.settings.soundEnabled || !this.audioContext || this.isPlayingSound) return;
        
        const buffer = this.audioBuffers.get(type);
        if (!buffer) return;
        
        try {
            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            this.isPlayingSound = true;
            
            // Create audio nodes
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            source.buffer = buffer;
            gainNode.gain.value = this.settings.soundVolume;
            
            // Connect nodes
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Play sound
            source.start();
            
            // Clean up when finished
            source.onended = () => {
                this.isPlayingSound = false;
                source.disconnect();
                gainNode.disconnect();
            };
            
            // Callback
            this.onSoundPlay(type);
            
        } catch (error) {
            console.warn('Failed to play sound:', error);
            this.isPlayingSound = false;
        }
    }
    
    /**
     * Handle notification click
     */
    handleNotificationClick(notification) {
        // Focus window
        if (window.focus) {
            window.focus();
        }
        
        // Clear title notification
        this.clearTitleNotification();
        
        // Remove from active notifications
        this.activeNotifications.delete(notification.id);
        
        // Callback
        this.onNotificationClick(notification);
    }
    
    /**
     * Close toast notification
     */
    closeToastNotification(notificationId) {
        const toast = this.notificationContainer.querySelector(`[data-notification-id="${notificationId}"]`);
        if (toast) {
            toast.classList.add('hide');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }
        
        this.activeNotifications.delete(notificationId);
    }
    
    /**
     * Limit toast notifications
     */
    limitToastNotifications() {
        const toasts = this.notificationContainer.querySelectorAll('.toast-notification');
        if (toasts.length > this.settings.maxNotifications) {
            const oldestToast = toasts[0];
            if (oldestToast) {
                const notificationId = oldestToast.dataset.notificationId;
                this.closeToastNotification(notificationId);
            }
        }
    }
    
    /**
     * Test notification
     */
    testNotification(type) {
        const testData = {
            [this.notificationTypes.MESSAGE]: {
                title: 'Test Message',
                message: 'This is a test message notification'
            },
            [this.notificationTypes.MENTION]: {
                title: 'Test Mention',
                message: 'You were mentioned in a message'
            },
            [this.notificationTypes.PRIVATE]: {
                title: 'Test Private Message',
                message: 'You received a private message'
            },
            [this.notificationTypes.SYSTEM]: {
                title: 'Test System',
                message: 'This is a test system notification'
            }
        };
        
        const data = testData[type] || testData[this.notificationTypes.MESSAGE];
        this.showNotification(data.title, data.message, type);
    }
    
    /**
     * Handle chat message
     */
    handleChatMessage(message) {
        // Check if message mentions current user
        const isMention = message.message && message.message.includes(`@${this.currentUserId}`);
        const isOwnMessage = message.user_id === this.currentUserId;
        
        // Skip own messages if setting is disabled
        if (isOwnMessage && !this.settings.notifyForOwnMessages) {
            return;
        }
        
        // Determine notification type
        let type = this.notificationTypes.MESSAGE;
        if (isMention) {
            type = this.notificationTypes.MENTION;
        }
        
        // Show notification
        this.showNotification(
            isMention ? 'You were mentioned' : `New message from ${message.user_name}`,
            this.settings.showNotificationPreview ? message.message : 'New message received',
            type,
            {
                data: { messageId: message.id, userId: message.user_id }
            }
        );
    }
    
    /**
     * Handle private message
     */
    handlePrivateMessage(message) {
        if (message.user_id === this.currentUserId && !this.settings.notifyForOwnMessages) {
            return;
        }
        
        this.showNotification(
            `Private message from ${message.user_name}`,
            this.settings.showNotificationPreview ? message.message : 'New private message',
            this.notificationTypes.PRIVATE,
            {
                data: { messageId: message.id, userId: message.user_id }
            }
        );
    }
    
    /**
     * Handle user join
     */
    handleUserJoin(user) {
        if (!this.settings.notifyForUserJoinLeave) return;
        
        this.showNotification(
            'User Joined',
            `${user.name || user.user_name} joined the chat`,
            this.notificationTypes.JOIN,
            {
                data: { userId: user.id || user.user_id }
            }
        );
    }
    
    /**
     * Handle user leave
     */
    handleUserLeave(user) {
        if (!this.settings.notifyForUserJoinLeave) return;
        
        this.showNotification(
            'User Left',
            `${user.name || user.user_name} left the chat`,
            this.notificationTypes.LEAVE,
            {
                data: { userId: user.id || user.user_id }
            }
        );
    }
    
    /**
     * Handle system message
     */
    handleSystemMessage(message) {
        this.showNotification(
            'System Message',
            message.message || message.text,
            this.notificationTypes.SYSTEM,
            {
                data: { messageId: message.id }
            }
        );
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
        switch (data.type) {
            case 'chat_message':
                this.handleChatMessage(data);
                break;
                
            case 'private_message':
                this.handlePrivateMessage(data);
                break;
                
            case 'user_joined':
                this.handleUserJoin(data.user || data);
                break;
                
            case 'user_left':
                this.handleUserLeave(data.user || data);
                break;
                
            case 'system_message':
                this.handleSystemMessage(data);
                break;
        }
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
     * Clear all notifications
     */
    clearAllNotifications() {
        // Clear toast notifications
        const toasts = this.notificationContainer.querySelectorAll('.toast-notification');
        toasts.forEach(toast => {
            const notificationId = toast.dataset.notificationId;
            this.closeToastNotification(notificationId);
        });
        
        // Clear title notification
        this.clearTitleNotification();
        
        // Clear active notifications
        this.activeNotifications.clear();
    }
    
    /**
     * Destroy the interface
     */
    destroy() {
        // Clear all notifications
        this.clearAllNotifications();
        
        // Stop audio context
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        // Remove notification container
        if (this.notificationContainer) {
            this.notificationContainer.remove();
        }
        
        // Clear data
        this.notifications.clear();
        this.activeNotifications.clear();
        this.audioBuffers.clear();
        this.soundNodes.clear();
    }
}

// CSS Styles for Chat Notification Interface
const notificationStyles = `
<style>
/* Chat Notification Interface Styles */
.notification-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    pointer-events: none;
    max-width: 400px;
    width: 100%;
}

.toast-notification {
    background: var(--chat-card, #2a2a2a);
    border: 1px solid var(--chat-border, #444);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 0.75rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
    pointer-events: auto;
    cursor: pointer;
    position: relative;
    overflow: hidden;
}

.toast-notification.show {
    opacity: 1;
    transform: translateX(0);
}

.toast-notification.hide {
    opacity: 0;
    transform: translateX(100%);
}

.toast-notification:hover {
    transform: translateX(-5px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

.toast-notification::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: var(--toast-accent, var(--chat-primary, #FF0000));
}

.toast-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: white;
    font-size: 1.1rem;
}

.toast-content {
    flex: 1;
    min-width: 0;
}

.toast-title {
    color: var(--chat-text, #ffffff);
    font-weight: 600;
    font-size: 0.95rem;
    margin-bottom: 0.25rem;
    line-height: 1.3;
}

.toast-message {
    color: var(--chat-text-muted, #cccccc);
    font-size: 0.85rem;
    line-height: 1.4;
    word-wrap: break-word;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
}

.toast-close {
    background: transparent;
    border: none;
    color: var(--chat-text-muted, #cccccc);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    transition: all 0.2s ease;
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
}

.toast-close:hover {
    background: var(--chat-border, #444);
    color: var(--chat-text, #ffffff);
}

/* Toast notification types */
.toast-message {
    --toast-accent: var(--chat-primary, #FF0000);
}

.toast-message .toast-icon {
    background: var(--chat-primary, #FF0000);
}

.toast-mention {
    --toast-accent: #ffc107;
}

.toast-mention .toast-icon {
    background: #ffc107;
    color: #000;
}

.toast-private {
    --toast-accent: #17a2b8;
}

.toast-private .toast-icon {
    background: #17a2b8;
}

.toast-join {
    --toast-accent: #28a745;
}

.toast-join .toast-icon {
    background: #28a745;
}

.toast-leave {
    --toast-accent: #6c757d;
}

.toast-leave .toast-icon {
    background: #6c757d;
}

.toast-system {
    --toast-accent: #6f42c1;
}

.toast-system .toast-icon {
    background: #6f42c1;
}

.toast-error {
    --toast-accent: #dc3545;
}

.toast-error .toast-icon {
    background: #dc3545;
}

.toast-success {
    --toast-accent: #28a745;
}

.toast-success .toast-icon {
    background: #28a745;
}

.toast-warning {
    --toast-accent: #ffc107;
}

.toast-warning .toast-icon {
    background: #ffc107;
    color: #000;
}

.toast-info {
    --toast-accent: #17a2b8;
}

.toast-info .toast-icon {
    background: #17a2b8;
}

/* Notification Controls */
.notification-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.notification-control-btn {
    background: transparent;
    border: 1px solid var(--chat-border, #444);
    color: var(--chat-text-muted, #cccccc);
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

.notification-control-btn:hover {
    background: var(--chat-input, #3a3a3a);
    color: var(--chat-text, #ffffff);
    border-color: var(--chat-primary, #FF0000);
}

.notification-control-btn.disabled {
    opacity: 0.5;
}

.notification-control-btn.disabled:hover {
    background: transparent;
    color: var(--chat-text-muted, #cccccc);
    border-color: var(--chat-border, #444);
}

/* Notification Settings Panel */
.notification-settings-panel {
    position: absolute;
    top: 50px;
    right: 0;
    width: 350px;
    max-height: 500px;
    background: var(--chat-card, #2a2a2a);
    border: 1px solid var(--chat-border, #444);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 1100;
    overflow: hidden;
}

.notification-settings-panel .settings-header {
    background: var(--chat-input, #3a3a3a);
    border-bottom: 1px solid var(--chat-border, #444);
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.notification-settings-panel .settings-header h4 {
    margin: 0;
    color: var(--chat-text, #ffffff);
    font-size: 1rem;
}

.notification-settings-panel .close-settings-btn {
    background: transparent;
    border: none;
    color: var(--chat-text-muted, #cccccc);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    transition: all 0.2s ease;
}

.notification-settings-panel .close-settings-btn:hover {
    background: var(--chat-border, #444);
    color: var(--chat-text, #ffffff);
}

.notification-settings-panel .settings-content {
    padding: 1rem;
    max-height: 400px;
    overflow-y: auto;
}

.notification-settings-panel .settings-content::-webkit-scrollbar {
    width: 6px;
}

.notification-settings-panel .settings-content::-webkit-scrollbar-track {
    background: var(--chat-bg, #1a1a1a);
}

.notification-settings-panel .settings-content::-webkit-scrollbar-thumb {
    background: var(--chat-border, #444);
    border-radius: 3px;
}

.settings-section {
    margin-bottom: 1.5rem;
}

.settings-section:last-child {
    margin-bottom: 0;
}

.settings-section h6 {
    color: var(--chat-primary, #FF0000);
    margin-bottom: 0.75rem;
    font-size: 0.9rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.setting-group {
    margin-bottom: 0.75rem;
}

.setting-group:last-child {
    margin-bottom: 0;
}

.setting-group label {
    color: var(--chat-text, #ffffff);
    font-weight: 500;
    font-size: 0.85rem;
    margin-bottom: 0.25rem;
    display: block;
}

.setting-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    margin-bottom: 0;
    padding: 0.25rem 0;
}

.setting-checkbox input[type="checkbox"] {
    accent-color: var(--chat-primary, #FF0000);
    width: 16px;
    height: 16px;
}

.setting-checkbox span {
    font-size: 0.85rem;
}

.setting-control {
    width: 100%;
    background: var(--chat-input, #3a3a3a);
    border: 1px solid var(--chat-border, #444);
    color: var(--chat-text, #ffffff);
    padding: 0.4rem 0.6rem;
    border-radius: 4px;
    font-size: 0.85rem;
}

.setting-control:focus {
    outline: none;
    border-color: var(--chat-primary, #FF0000);
}

.setting-range {
    width: 100%;
    background: var(--chat-input, #3a3a3a);
    border: none;
    height: 6px;
    border-radius: 3px;
    outline: none;
    margin-right: 0.5rem;
}

.setting-range::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--chat-primary, #FF0000);
    cursor: pointer;
}

.setting-range::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--chat-primary, #FF0000);
    cursor: pointer;
    border: none;
}

.range-value {
    color: var(--chat-text-muted, #cccccc);
    font-size: 0.8rem;
    font-weight: 500;
    min-width: 35px;
    text-align: right;
}

.setting-group .btn {
    margin: 0.25rem 0.25rem 0.25rem 0;
    padding: 0.3rem 0.6rem;
    font-size: 0.75rem;
    border-radius: 4px;
}

.btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
}

/* Responsive Design */
@media (max-width: 768px) {
    .notification-container {
        top: 10px;
        right: 10px;
        left: 10px;
        max-width: none;
    }

    .toast-notification {
        padding: 0.75rem;
        margin-bottom: 0.5rem;
    }

    .toast-title {
        font-size: 0.9rem;
    }

    .toast-message {
        font-size: 0.8rem;
    }

    .notification-controls {
        gap: 0.25rem;
    }

    .notification-control-btn {
        width: 32px;
        height: 32px;
        font-size: 0.8rem;
    }

    .notification-settings-panel {
        width: calc(100% - 20px);
        right: 10px;
        left: 10px;
        max-height: 400px;
    }

    .notification-settings-panel .settings-content {
        padding: 0.75rem;
        max-height: 300px;
    }
}

@media (max-width: 480px) {
    .notification-container {
        top: 5px;
        right: 5px;
        left: 5px;
    }

    .toast-notification {
        padding: 0.5rem;
        gap: 0.5rem;
    }

    .toast-icon {
        width: 32px;
        height: 32px;
        font-size: 0.9rem;
    }

    .toast-title {
        font-size: 0.85rem;
    }

    .toast-message {
        font-size: 0.75rem;
        -webkit-line-clamp: 2;
    }

    .notification-settings-panel {
        width: calc(100% - 10px);
        right: 5px;
        left: 5px;
        max-height: 350px;
    }

    .settings-section h6 {
        font-size: 0.8rem;
    }

    .setting-group label,
    .setting-checkbox span {
        font-size: 0.8rem;
    }

    .setting-control {
        font-size: 0.8rem;
        padding: 0.35rem 0.5rem;
    }
}

/* Dark/Light Theme Support */
.light-theme .toast-notification {
    background: #ffffff;
    border-color: #dee2e6;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.light-theme .toast-title {
    color: #212529;
}

.light-theme .toast-message {
    color: #6c757d;
}

.light-theme .toast-close {
    color: #6c757d;
}

.light-theme .toast-close:hover {
    background: #f8f9fa;
    color: #212529;
}

.light-theme .notification-control-btn {
    border-color: #ced4da;
    color: #6c757d;
}

.light-theme .notification-control-btn:hover {
    background: #f8f9fa;
    color: #212529;
    border-color: var(--chat-primary, #FF0000);
}

.light-theme .notification-settings-panel {
    background: #ffffff;
    border-color: #dee2e6;
}

.light-theme .notification-settings-panel .settings-header {
    background: #f8f9fa;
    border-bottom-color: #dee2e6;
}

.light-theme .setting-control {
    background: #ffffff;
    border-color: #ced4da;
    color: #495057;
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
    .toast-notification {
        border-width: 2px;
    }

    .toast-notification::before {
        width: 6px;
    }

    .notification-control-btn {
        border-width: 2px;
    }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
    .toast-notification {
        transition: opacity 0.2s ease;
    }

    .toast-notification:hover {
        transform: none;
    }

    .notification-control-btn {
        transition: none;
    }
}

/* Print Styles */
@media print {
    .notification-container,
    .notification-controls,
    .notification-settings-panel {
        display: none !important;
    }
}

/* Focus Styles for Accessibility */
.toast-notification:focus {
    outline: 2px solid var(--chat-primary, #FF0000);
    outline-offset: 2px;
}

.notification-control-btn:focus {
    outline: 2px solid var(--chat-primary, #FF0000);
    outline-offset: 2px;
}

.setting-checkbox input:focus {
    outline: 2px solid var(--chat-primary, #FF0000);
    outline-offset: 2px;
}

.setting-control:focus {
    box-shadow: 0 0 0 2px var(--chat-primary, #FF0000);
}

/* Animation for notification count badge */
@keyframes bounce {
    0%, 20%, 53%, 80%, 100% {
        transform: translate3d(0,0,0);
    }
    40%, 43% {
        transform: translate3d(0, -8px, 0);
    }
    70% {
        transform: translate3d(0, -4px, 0);
    }
    90% {
        transform: translate3d(0, -2px, 0);
    }
}

.notification-badge {
    animation: bounce 1s ease-in-out;
}
</style>
`;

// Inject styles into document head
if (typeof document !== 'undefined') {
    const styleElement = document.createElement('div');
    styleElement.innerHTML = notificationStyles;
    document.head.appendChild(styleElement.firstElementChild);
}

// Global reference for onclick handlers
let chatNotifications = null;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatNotificationInterface;
} else if (typeof window !== 'undefined') {
    window.ChatNotificationInterface = ChatNotificationInterface;
}
