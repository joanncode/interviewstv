/**
 * Chat Customization Interface
 * Comprehensive personalization and customization options for chat
 */
class ChatCustomizationInterface {
    constructor(options = {}) {
        this.websocket = options.websocket || null;
        this.currentUserId = options.currentUserId || null;
        this.currentUserRole = options.currentUserRole || 'guest';
        this.roomId = options.roomId || 'default';
        this.container = options.container || null;
        this.onSettingsChange = options.onSettingsChange || (() => {});
        this.onThemeChange = options.onThemeChange || (() => {});
        this.onLayoutChange = options.onLayoutChange || (() => {});
        
        // UI elements
        this.customizationContainer = null;
        this.customizationPanel = null;
        
        // Customization categories
        this.categories = {
            APPEARANCE: 'appearance',
            BEHAVIOR: 'behavior',
            NOTIFICATIONS: 'notifications',
            ACCESSIBILITY: 'accessibility',
            ADVANCED: 'advanced'
        };
        
        // Default settings
        this.settings = {
            // Appearance settings
            theme: 'dark', // 'dark', 'light', 'auto'
            colorScheme: 'red', // 'red', 'blue', 'green', 'purple', 'orange'
            fontSize: 'medium', // 'small', 'medium', 'large', 'extra-large'
            fontFamily: 'system', // 'system', 'serif', 'monospace', 'custom'
            customFont: '',
            messageSpacing: 'normal', // 'compact', 'normal', 'relaxed'
            borderRadius: 'normal', // 'sharp', 'normal', 'rounded'
            animations: true,
            transparency: 0, // 0-100
            
            // Layout settings
            chatWidth: 'auto', // 'narrow', 'normal', 'wide', 'auto'
            sidebarPosition: 'right', // 'left', 'right', 'hidden'
            headerStyle: 'normal', // 'minimal', 'normal', 'detailed'
            messageLayout: 'standard', // 'standard', 'compact', 'bubbles'
            timestampFormat: 'relative', // 'relative', 'absolute', 'hidden'
            avatarStyle: 'circle', // 'circle', 'square', 'rounded', 'hidden'
            
            // Behavior settings
            autoScroll: true,
            soundEnabled: true,
            enterToSend: true,
            showTypingIndicators: true,
            showOnlineStatus: true,
            autoComplete: true,
            spellCheck: true,
            wordWrap: true,
            
            // Message display settings
            showTimestamps: true,
            showAvatars: true,
            showUserRoles: true,
            showMessageNumbers: false,
            groupMessages: true,
            highlightMentions: true,
            showEmojis: true,
            showReactions: true,
            
            // Notification settings
            desktopNotifications: true,
            soundNotifications: true,
            mentionNotifications: true,
            privateMessageNotifications: true,
            systemNotifications: false,
            notificationSound: 'default', // 'default', 'subtle', 'chime', 'pop'
            
            // Accessibility settings
            highContrast: false,
            reducedMotion: false,
            largeClickTargets: false,
            screenReaderOptimized: false,
            keyboardNavigation: true,
            focusIndicators: true,
            
            // Advanced settings
            messageHistory: 100, // Number of messages to keep
            connectionTimeout: 30000,
            reconnectAttempts: 5,
            debugMode: false,
            experimentalFeatures: false,
            
            ...options.settings
        };
        
        // Predefined themes
        this.themes = {
            dark: {
                name: 'Dark',
                primary: '#FF0000',
                background: '#1a1a1a',
                card: '#2a2a2a',
                input: '#3a3a3a',
                text: '#ffffff',
                textMuted: '#cccccc',
                border: '#444444'
            },
            light: {
                name: 'Light',
                primary: '#FF0000',
                background: '#ffffff',
                card: '#f8f9fa',
                input: '#ffffff',
                text: '#212529',
                textMuted: '#6c757d',
                border: '#dee2e6'
            }
        };
        
        // Color schemes
        this.colorSchemes = {
            red: { name: 'Red', primary: '#FF0000', accent: '#cc0000' },
            blue: { name: 'Blue', primary: '#007bff', accent: '#0056b3' },
            green: { name: 'Green', primary: '#28a745', accent: '#1e7e34' },
            purple: { name: 'Purple', primary: '#6f42c1', accent: '#5a32a3' },
            orange: { name: 'Orange', primary: '#fd7e14', accent: '#e8650e' },
            teal: { name: 'Teal', primary: '#20c997', accent: '#1aa179' },
            pink: { name: 'Pink', primary: '#e83e8c', accent: '#d91a72' },
            indigo: { name: 'Indigo', primary: '#6610f2', accent: '#520dc2' }
        };
        
        this.init();
    }
    
    /**
     * Initialize the customization interface
     */
    init() {
        if (this.container) {
            this.createCustomizationInterface();
            this.attachEventListeners();
        }
        
        this.loadCustomizationSettings();
        this.applySettings();
        
        if (this.websocket) {
            this.attachWebSocketListeners();
        }
    }
    
    /**
     * Create customization interface
     */
    createCustomizationInterface() {
        // Find or create customization container
        this.customizationContainer = this.container.querySelector('#chat-customization-container');
        
        if (!this.customizationContainer) {
            this.customizationContainer = document.createElement('div');
            this.customizationContainer.id = 'chat-customization-container';
            this.customizationContainer.className = 'chat-customization-container';
            this.customizationContainer.style.display = 'none';
            
            // Add to chat interface
            const chatBody = this.container.querySelector('.chat-body');
            if (chatBody) {
                chatBody.appendChild(this.customizationContainer);
            } else {
                this.container.appendChild(this.customizationContainer);
            }
        }
        
        this.createCustomizationContent();
    }
    
    /**
     * Create customization content
     */
    createCustomizationContent() {
        this.customizationContainer.innerHTML = `
            <div class="customization-panel">
                <div class="customization-header">
                    <h4><i class="fas fa-palette"></i> Chat Customization</h4>
                    <button class="customization-close" id="customization-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="customization-content">
                    <div class="customization-tabs">
                        <button class="customization-tab active" data-category="appearance">
                            <i class="fas fa-palette"></i>
                            <span>Appearance</span>
                        </button>
                        <button class="customization-tab" data-category="behavior">
                            <i class="fas fa-cogs"></i>
                            <span>Behavior</span>
                        </button>
                        <button class="customization-tab" data-category="notifications">
                            <i class="fas fa-bell"></i>
                            <span>Notifications</span>
                        </button>
                        <button class="customization-tab" data-category="accessibility">
                            <i class="fas fa-universal-access"></i>
                            <span>Accessibility</span>
                        </button>
                        <button class="customization-tab" data-category="advanced">
                            <i class="fas fa-code"></i>
                            <span>Advanced</span>
                        </button>
                    </div>
                    
                    <div class="customization-panels">
                        <!-- Appearance Panel -->
                        <div class="customization-panel-content active" data-category="appearance">
                            <div class="customization-section">
                                <h5>Theme & Colors</h5>
                                <div class="customization-group">
                                    <label>Theme</label>
                                    <select class="customization-select" id="theme-select">
                                        <option value="dark">Dark Theme</option>
                                        <option value="light">Light Theme</option>
                                        <option value="auto">Auto (System)</option>
                                    </select>
                                </div>
                                <div class="customization-group">
                                    <label>Color Scheme</label>
                                    <div class="color-scheme-grid" id="color-scheme-grid">
                                        ${Object.entries(this.colorSchemes).map(([key, scheme]) => `
                                            <div class="color-scheme-option ${key === this.settings.colorScheme ? 'active' : ''}" 
                                                 data-scheme="${key}" title="${scheme.name}">
                                                <div class="color-preview" style="background: ${scheme.primary}"></div>
                                                <span>${scheme.name}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                <div class="customization-group">
                                    <label>Transparency</label>
                                    <div class="range-control">
                                        <input type="range" class="customization-range" id="transparency-range" 
                                               min="0" max="100" value="${this.settings.transparency}">
                                        <span class="range-value">${this.settings.transparency}%</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="customization-section">
                                <h5>Typography</h5>
                                <div class="customization-group">
                                    <label>Font Size</label>
                                    <select class="customization-select" id="font-size-select">
                                        <option value="small">Small</option>
                                        <option value="medium">Medium</option>
                                        <option value="large">Large</option>
                                        <option value="extra-large">Extra Large</option>
                                    </select>
                                </div>
                                <div class="customization-group">
                                    <label>Font Family</label>
                                    <select class="customization-select" id="font-family-select">
                                        <option value="system">System Default</option>
                                        <option value="serif">Serif</option>
                                        <option value="monospace">Monospace</option>
                                        <option value="custom">Custom Font</option>
                                    </select>
                                </div>
                                <div class="customization-group" id="custom-font-group" style="display: none;">
                                    <label>Custom Font URL</label>
                                    <input type="text" class="customization-input" id="custom-font-input" 
                                           placeholder="https://fonts.googleapis.com/css2?family=...">
                                </div>
                            </div>
                            
                            <div class="customization-section">
                                <h5>Layout & Spacing</h5>
                                <div class="customization-group">
                                    <label>Message Spacing</label>
                                    <select class="customization-select" id="message-spacing-select">
                                        <option value="compact">Compact</option>
                                        <option value="normal">Normal</option>
                                        <option value="relaxed">Relaxed</option>
                                    </select>
                                </div>
                                <div class="customization-group">
                                    <label>Border Radius</label>
                                    <select class="customization-select" id="border-radius-select">
                                        <option value="sharp">Sharp (0px)</option>
                                        <option value="normal">Normal (6px)</option>
                                        <option value="rounded">Rounded (12px)</option>
                                    </select>
                                </div>
                                <div class="customization-group">
                                    <label>Chat Width</label>
                                    <select class="customization-select" id="chat-width-select">
                                        <option value="narrow">Narrow</option>
                                        <option value="normal">Normal</option>
                                        <option value="wide">Wide</option>
                                        <option value="auto">Auto</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="customization-section">
                                <h5>Visual Effects</h5>
                                <div class="customization-group">
                                    <label class="customization-checkbox">
                                        <input type="checkbox" id="animations-checkbox" ${this.settings.animations ? 'checked' : ''}>
                                        <span>Enable animations</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Behavior Panel -->
                        <div class="customization-panel-content" data-category="behavior">
                            <div class="customization-section">
                                <h5>Chat Behavior</h5>
                                <div class="customization-group">
                                    <label class="customization-checkbox">
                                        <input type="checkbox" id="auto-scroll-checkbox" ${this.settings.autoScroll ? 'checked' : ''}>
                                        <span>Auto-scroll to new messages</span>
                                    </label>
                                </div>
                                <div class="customization-group">
                                    <label class="customization-checkbox">
                                        <input type="checkbox" id="enter-to-send-checkbox" ${this.settings.enterToSend ? 'checked' : ''}>
                                        <span>Press Enter to send messages</span>
                                    </label>
                                </div>
                                <div class="customization-group">
                                    <label class="customization-checkbox">
                                        <input type="checkbox" id="show-typing-checkbox" ${this.settings.showTypingIndicators ? 'checked' : ''}>
                                        <span>Show typing indicators</span>
                                    </label>
                                </div>
                                <div class="customization-group">
                                    <label class="customization-checkbox">
                                        <input type="checkbox" id="show-online-status-checkbox" ${this.settings.showOnlineStatus ? 'checked' : ''}>
                                        <span>Show online status</span>
                                    </label>
                                </div>
                                <div class="customization-group">
                                    <label class="customization-checkbox">
                                        <input type="checkbox" id="auto-complete-checkbox" ${this.settings.autoComplete ? 'checked' : ''}>
                                        <span>Enable auto-complete</span>
                                    </label>
                                </div>
                                <div class="customization-group">
                                    <label class="customization-checkbox">
                                        <input type="checkbox" id="spell-check-checkbox" ${this.settings.spellCheck ? 'checked' : ''}>
                                        <span>Enable spell check</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div class="customization-section">
                                <h5>Message Display</h5>
                                <div class="customization-group">
                                    <label>Message Layout</label>
                                    <select class="customization-select" id="message-layout-select">
                                        <option value="standard">Standard</option>
                                        <option value="compact">Compact</option>
                                        <option value="bubbles">Bubbles</option>
                                    </select>
                                </div>
                                <div class="customization-group">
                                    <label>Timestamp Format</label>
                                    <select class="customization-select" id="timestamp-format-select">
                                        <option value="relative">Relative (2m ago)</option>
                                        <option value="absolute">Absolute (14:30)</option>
                                        <option value="hidden">Hidden</option>
                                    </select>
                                </div>
                                <div class="customization-group">
                                    <label>Avatar Style</label>
                                    <select class="customization-select" id="avatar-style-select">
                                        <option value="circle">Circle</option>
                                        <option value="square">Square</option>
                                        <option value="rounded">Rounded</option>
                                        <option value="hidden">Hidden</option>
                                    </select>
                                </div>
                                <div class="customization-group">
                                    <label class="customization-checkbox">
                                        <input type="checkbox" id="show-user-roles-checkbox" ${this.settings.showUserRoles ? 'checked' : ''}>
                                        <span>Show user roles</span>
                                    </label>
                                </div>
                                <div class="customization-group">
                                    <label class="customization-checkbox">
                                        <input type="checkbox" id="group-messages-checkbox" ${this.settings.groupMessages ? 'checked' : ''}>
                                        <span>Group consecutive messages</span>
                                    </label>
                                </div>
                                <div class="customization-group">
                                    <label class="customization-checkbox">
                                        <input type="checkbox" id="highlight-mentions-checkbox" ${this.settings.highlightMentions ? 'checked' : ''}>
                                        <span>Highlight mentions</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Notifications Panel -->
                        <div class="customization-panel-content" data-category="notifications">
                            <div class="customization-section">
                                <h5>Notification Types</h5>
                                <div class="customization-group">
                                    <label class="customization-checkbox">
                                        <input type="checkbox" id="desktop-notifications-checkbox" ${this.settings.desktopNotifications ? 'checked' : ''}>
                                        <span>Desktop notifications</span>
                                    </label>
                                </div>
                                <div class="customization-group">
                                    <label class="customization-checkbox">
                                        <input type="checkbox" id="sound-notifications-checkbox" ${this.settings.soundNotifications ? 'checked' : ''}>
                                        <span>Sound notifications</span>
                                    </label>
                                </div>
                                <div class="customization-group">
                                    <label class="customization-checkbox">
                                        <input type="checkbox" id="mention-notifications-checkbox" ${this.settings.mentionNotifications ? 'checked' : ''}>
                                        <span>Mention notifications</span>
                                    </label>
                                </div>
                                <div class="customization-group">
                                    <label class="customization-checkbox">
                                        <input type="checkbox" id="private-notifications-checkbox" ${this.settings.privateMessageNotifications ? 'checked' : ''}>
                                        <span>Private message notifications</span>
                                    </label>
                                </div>
                                <div class="customization-group">
                                    <label class="customization-checkbox">
                                        <input type="checkbox" id="system-notifications-checkbox" ${this.settings.systemNotifications ? 'checked' : ''}>
                                        <span>System notifications</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div class="customization-section">
                                <h5>Notification Settings</h5>
                                <div class="customization-group">
                                    <label>Notification Sound</label>
                                    <select class="customization-select" id="notification-sound-select">
                                        <option value="default">Default</option>
                                        <option value="subtle">Subtle</option>
                                        <option value="chime">Chime</option>
                                        <option value="pop">Pop</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Accessibility Panel -->
                        <div class="customization-panel-content" data-category="accessibility">
                            <div class="customization-section">
                                <h5>Visual Accessibility</h5>
                                <div class="customization-group">
                                    <label class="customization-checkbox">
                                        <input type="checkbox" id="high-contrast-checkbox" ${this.settings.highContrast ? 'checked' : ''}>
                                        <span>High contrast mode</span>
                                    </label>
                                </div>
                                <div class="customization-group">
                                    <label class="customization-checkbox">
                                        <input type="checkbox" id="reduced-motion-checkbox" ${this.settings.reducedMotion ? 'checked' : ''}>
                                        <span>Reduce motion and animations</span>
                                    </label>
                                </div>
                                <div class="customization-group">
                                    <label class="customization-checkbox">
                                        <input type="checkbox" id="large-click-targets-checkbox" ${this.settings.largeClickTargets ? 'checked' : ''}>
                                        <span>Large click targets</span>
                                    </label>
                                </div>
                                <div class="customization-group">
                                    <label class="customization-checkbox">
                                        <input type="checkbox" id="focus-indicators-checkbox" ${this.settings.focusIndicators ? 'checked' : ''}>
                                        <span>Enhanced focus indicators</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div class="customization-section">
                                <h5>Interaction Accessibility</h5>
                                <div class="customization-group">
                                    <label class="customization-checkbox">
                                        <input type="checkbox" id="keyboard-navigation-checkbox" ${this.settings.keyboardNavigation ? 'checked' : ''}>
                                        <span>Enhanced keyboard navigation</span>
                                    </label>
                                </div>
                                <div class="customization-group">
                                    <label class="customization-checkbox">
                                        <input type="checkbox" id="screen-reader-checkbox" ${this.settings.screenReaderOptimized ? 'checked' : ''}>
                                        <span>Screen reader optimizations</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Advanced Panel -->
                        <div class="customization-panel-content" data-category="advanced">
                            <div class="customization-section">
                                <h5>Performance Settings</h5>
                                <div class="customization-group">
                                    <label>Message History Limit</label>
                                    <div class="range-control">
                                        <input type="range" class="customization-range" id="message-history-range" 
                                               min="50" max="500" step="50" value="${this.settings.messageHistory}">
                                        <span class="range-value">${this.settings.messageHistory}</span>
                                    </div>
                                </div>
                                <div class="customization-group">
                                    <label>Connection Timeout (seconds)</label>
                                    <div class="range-control">
                                        <input type="range" class="customization-range" id="connection-timeout-range" 
                                               min="10" max="120" step="10" value="${this.settings.connectionTimeout / 1000}">
                                        <span class="range-value">${this.settings.connectionTimeout / 1000}s</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="customization-section">
                                <h5>Developer Options</h5>
                                <div class="customization-group">
                                    <label class="customization-checkbox">
                                        <input type="checkbox" id="debug-mode-checkbox" ${this.settings.debugMode ? 'checked' : ''}>
                                        <span>Debug mode</span>
                                    </label>
                                </div>
                                <div class="customization-group">
                                    <label class="customization-checkbox">
                                        <input type="checkbox" id="experimental-features-checkbox" ${this.settings.experimentalFeatures ? 'checked' : ''}>
                                        <span>Experimental features</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div class="customization-section">
                                <h5>Reset Options</h5>
                                <div class="customization-group">
                                    <button class="customization-btn secondary" id="reset-settings-btn">
                                        <i class="fas fa-undo"></i>
                                        Reset to Defaults
                                    </button>
                                </div>
                                <div class="customization-group">
                                    <button class="customization-btn secondary" id="export-settings-btn">
                                        <i class="fas fa-download"></i>
                                        Export Settings
                                    </button>
                                </div>
                                <div class="customization-group">
                                    <input type="file" id="import-settings-input" accept=".json" style="display: none;">
                                    <button class="customization-btn secondary" id="import-settings-btn">
                                        <i class="fas fa-upload"></i>
                                        Import Settings
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="customization-footer">
                    <button class="customization-btn primary" id="apply-settings-btn">
                        <i class="fas fa-check"></i>
                        Apply Changes
                    </button>
                    <button class="customization-btn secondary" id="cancel-settings-btn">
                        <i class="fas fa-times"></i>
                        Cancel
                    </button>
                </div>
            </div>
        `;
        
        // Store reference to panel
        this.customizationPanel = this.customizationContainer.querySelector('.customization-panel');
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Close button
        this.customizationContainer.querySelector('#customization-close').addEventListener('click', () => this.closeCustomization());
        
        // Tab navigation
        const tabs = this.customizationContainer.querySelectorAll('.customization-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.closest('.customization-tab').dataset.category));
        });
        
        // Settings controls
        this.attachSettingsListeners();
        
        // Footer buttons
        this.customizationContainer.querySelector('#apply-settings-btn').addEventListener('click', () => this.applySettings());
        this.customizationContainer.querySelector('#cancel-settings-btn').addEventListener('click', () => this.cancelSettings());
        
        // Reset and import/export
        this.customizationContainer.querySelector('#reset-settings-btn').addEventListener('click', () => this.resetSettings());
        this.customizationContainer.querySelector('#export-settings-btn').addEventListener('click', () => this.exportSettings());
        this.customizationContainer.querySelector('#import-settings-btn').addEventListener('click', () => this.importSettings());
        this.customizationContainer.querySelector('#import-settings-input').addEventListener('change', (e) => this.handleImportFile(e));
    }
    
    /**
     * Attach settings event listeners
     */
    attachSettingsListeners() {
        // Theme and color scheme
        this.customizationContainer.querySelector('#theme-select').addEventListener('change', (e) => this.updateSetting('theme', e.target.value));
        
        const colorSchemeOptions = this.customizationContainer.querySelectorAll('.color-scheme-option');
        colorSchemeOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const scheme = e.currentTarget.dataset.scheme;
                this.updateSetting('colorScheme', scheme);
                this.updateColorSchemeSelection(scheme);
            });
        });
        
        // Range controls
        this.attachRangeListener('transparency-range', 'transparency');
        this.attachRangeListener('message-history-range', 'messageHistory');
        this.attachRangeListener('connection-timeout-range', 'connectionTimeout', (value) => value * 1000);
        
        // Select controls
        this.attachSelectListener('font-size-select', 'fontSize');
        this.attachSelectListener('font-family-select', 'fontFamily');
        this.attachSelectListener('message-spacing-select', 'messageSpacing');
        this.attachSelectListener('border-radius-select', 'borderRadius');
        this.attachSelectListener('chat-width-select', 'chatWidth');
        this.attachSelectListener('message-layout-select', 'messageLayout');
        this.attachSelectListener('timestamp-format-select', 'timestampFormat');
        this.attachSelectListener('avatar-style-select', 'avatarStyle');
        this.attachSelectListener('notification-sound-select', 'notificationSound');
        
        // Checkbox controls
        this.attachCheckboxListener('animations-checkbox', 'animations');
        this.attachCheckboxListener('auto-scroll-checkbox', 'autoScroll');
        this.attachCheckboxListener('enter-to-send-checkbox', 'enterToSend');
        this.attachCheckboxListener('show-typing-checkbox', 'showTypingIndicators');
        this.attachCheckboxListener('show-online-status-checkbox', 'showOnlineStatus');
        this.attachCheckboxListener('auto-complete-checkbox', 'autoComplete');
        this.attachCheckboxListener('spell-check-checkbox', 'spellCheck');
        this.attachCheckboxListener('show-user-roles-checkbox', 'showUserRoles');
        this.attachCheckboxListener('group-messages-checkbox', 'groupMessages');
        this.attachCheckboxListener('highlight-mentions-checkbox', 'highlightMentions');
        this.attachCheckboxListener('desktop-notifications-checkbox', 'desktopNotifications');
        this.attachCheckboxListener('sound-notifications-checkbox', 'soundNotifications');
        this.attachCheckboxListener('mention-notifications-checkbox', 'mentionNotifications');
        this.attachCheckboxListener('private-notifications-checkbox', 'privateMessageNotifications');
        this.attachCheckboxListener('system-notifications-checkbox', 'systemNotifications');
        this.attachCheckboxListener('high-contrast-checkbox', 'highContrast');
        this.attachCheckboxListener('reduced-motion-checkbox', 'reducedMotion');
        this.attachCheckboxListener('large-click-targets-checkbox', 'largeClickTargets');
        this.attachCheckboxListener('focus-indicators-checkbox', 'focusIndicators');
        this.attachCheckboxListener('keyboard-navigation-checkbox', 'keyboardNavigation');
        this.attachCheckboxListener('screen-reader-checkbox', 'screenReaderOptimized');
        this.attachCheckboxListener('debug-mode-checkbox', 'debugMode');
        this.attachCheckboxListener('experimental-features-checkbox', 'experimentalFeatures');
        
        // Custom font handling
        this.customizationContainer.querySelector('#font-family-select').addEventListener('change', (e) => {
            const customFontGroup = this.customizationContainer.querySelector('#custom-font-group');
            customFontGroup.style.display = e.target.value === 'custom' ? 'block' : 'none';
        });
        
        this.customizationContainer.querySelector('#custom-font-input').addEventListener('input', (e) => {
            this.updateSetting('customFont', e.target.value);
        });
    }
    
    /**
     * Attach range listener
     */
    attachRangeListener(elementId, settingKey, transform = null) {
        const element = this.customizationContainer.querySelector(`#${elementId}`);
        const valueElement = element.parentElement.querySelector('.range-value');
        
        element.addEventListener('input', (e) => {
            const value = transform ? transform(parseFloat(e.target.value)) : parseFloat(e.target.value);
            this.updateSetting(settingKey, value);
            
            // Update display value
            if (settingKey === 'transparency') {
                valueElement.textContent = `${e.target.value}%`;
            } else if (settingKey === 'connectionTimeout') {
                valueElement.textContent = `${e.target.value}s`;
            } else {
                valueElement.textContent = e.target.value;
            }
        });
    }
    
    /**
     * Attach select listener
     */
    attachSelectListener(elementId, settingKey) {
        const element = this.customizationContainer.querySelector(`#${elementId}`);
        element.addEventListener('change', (e) => this.updateSetting(settingKey, e.target.value));
    }
    
    /**
     * Attach checkbox listener
     */
    attachCheckboxListener(elementId, settingKey) {
        const element = this.customizationContainer.querySelector(`#${elementId}`);
        element.addEventListener('change', (e) => this.updateSetting(settingKey, e.target.checked));
    }
    
    /**
     * Update setting
     */
    updateSetting(key, value) {
        this.settings[key] = value;
        this.onSettingsChange(key, value, this.settings);
        
        // Apply certain settings immediately for preview
        if (['theme', 'colorScheme', 'fontSize', 'transparency'].includes(key)) {
            this.applyPreviewSettings();
        }
    }
    
    /**
     * Apply preview settings
     */
    applyPreviewSettings() {
        // Apply theme changes immediately for preview
        this.applyTheme();
        this.applyColorScheme();
        this.applyFontSize();
        this.applyTransparency();
    }
    
    /**
     * Switch tab
     */
    switchTab(category) {
        // Update tab buttons
        const tabs = this.customizationContainer.querySelectorAll('.customization-tab');
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === category);
        });
        
        // Update panel content
        const panels = this.customizationContainer.querySelectorAll('.customization-panel-content');
        panels.forEach(panel => {
            panel.classList.toggle('active', panel.dataset.category === category);
        });
    }
    
    /**
     * Update color scheme selection
     */
    updateColorSchemeSelection(scheme) {
        const options = this.customizationContainer.querySelectorAll('.color-scheme-option');
        options.forEach(option => {
            option.classList.toggle('active', option.dataset.scheme === scheme);
        });
    }
    
    /**
     * Open customization panel
     */
    openCustomization() {
        this.customizationContainer.style.display = 'block';
        this.customizationPanel.classList.add('show');
        
        // Load current settings into UI
        this.loadSettingsIntoUI();
    }
    
    /**
     * Close customization panel
     */
    closeCustomization() {
        this.customizationPanel.classList.remove('show');
        setTimeout(() => {
            this.customizationContainer.style.display = 'none';
        }, 300);
    }
    
    /**
     * Load settings into UI
     */
    loadSettingsIntoUI() {
        // Update all form controls with current settings
        Object.entries(this.settings).forEach(([key, value]) => {
            const element = this.customizationContainer.querySelector(`#${this.getElementIdForSetting(key)}`);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else if (element.type === 'range') {
                    element.value = key === 'connectionTimeout' ? value / 1000 : value;
                    const valueElement = element.parentElement.querySelector('.range-value');
                    if (valueElement) {
                        if (key === 'transparency') {
                            valueElement.textContent = `${value}%`;
                        } else if (key === 'connectionTimeout') {
                            valueElement.textContent = `${value / 1000}s`;
                        } else {
                            valueElement.textContent = value;
                        }
                    }
                } else {
                    element.value = value;
                }
            }
        });
        
        // Update color scheme selection
        this.updateColorSchemeSelection(this.settings.colorScheme);
        
        // Show/hide custom font input
        const customFontGroup = this.customizationContainer.querySelector('#custom-font-group');
        customFontGroup.style.display = this.settings.fontFamily === 'custom' ? 'block' : 'none';
    }
    
    /**
     * Get element ID for setting
     */
    getElementIdForSetting(settingKey) {
        const mapping = {
            theme: 'theme-select',
            fontSize: 'font-size-select',
            fontFamily: 'font-family-select',
            customFont: 'custom-font-input',
            messageSpacing: 'message-spacing-select',
            borderRadius: 'border-radius-select',
            chatWidth: 'chat-width-select',
            messageLayout: 'message-layout-select',
            timestampFormat: 'timestamp-format-select',
            avatarStyle: 'avatar-style-select',
            notificationSound: 'notification-sound-select',
            transparency: 'transparency-range',
            messageHistory: 'message-history-range',
            connectionTimeout: 'connection-timeout-range',
            animations: 'animations-checkbox',
            autoScroll: 'auto-scroll-checkbox',
            enterToSend: 'enter-to-send-checkbox',
            showTypingIndicators: 'show-typing-checkbox',
            showOnlineStatus: 'show-online-status-checkbox',
            autoComplete: 'auto-complete-checkbox',
            spellCheck: 'spell-check-checkbox',
            showUserRoles: 'show-user-roles-checkbox',
            groupMessages: 'group-messages-checkbox',
            highlightMentions: 'highlight-mentions-checkbox',
            desktopNotifications: 'desktop-notifications-checkbox',
            soundNotifications: 'sound-notifications-checkbox',
            mentionNotifications: 'mention-notifications-checkbox',
            privateMessageNotifications: 'private-notifications-checkbox',
            systemNotifications: 'system-notifications-checkbox',
            highContrast: 'high-contrast-checkbox',
            reducedMotion: 'reduced-motion-checkbox',
            largeClickTargets: 'large-click-targets-checkbox',
            focusIndicators: 'focus-indicators-checkbox',
            keyboardNavigation: 'keyboard-navigation-checkbox',
            screenReaderOptimized: 'screen-reader-checkbox',
            debugMode: 'debug-mode-checkbox',
            experimentalFeatures: 'experimental-features-checkbox'
        };
        
        return mapping[settingKey] || settingKey;
    }
    
    /**
     * Apply all settings
     */
    applySettings() {
        this.applyTheme();
        this.applyColorScheme();
        this.applyFontSize();
        this.applyFontFamily();
        this.applyMessageSpacing();
        this.applyBorderRadius();
        this.applyChatWidth();
        this.applyTransparency();
        this.applyAnimations();
        this.applyAccessibilitySettings();
        
        this.saveCustomizationSettings();
        this.onLayoutChange(this.settings);
        this.closeCustomization();
    }
    
    /**
     * Cancel settings changes
     */
    cancelSettings() {
        // Reload settings from storage
        this.loadCustomizationSettings();
        this.applySettings();
        this.closeCustomization();
    }
    
    /**
     * Apply theme
     */
    applyTheme() {
        const theme = this.settings.theme === 'auto' ? this.getSystemTheme() : this.settings.theme;
        const themeData = this.themes[theme];
        
        if (themeData && this.container) {
            this.container.classList.remove('dark-theme', 'light-theme');
            this.container.classList.add(`${theme}-theme`);
            
            // Update CSS custom properties
            const root = document.documentElement;
            Object.entries(themeData).forEach(([key, value]) => {
                if (key !== 'name') {
                    root.style.setProperty(`--chat-${key}`, value);
                }
            });
        }
        
        this.onThemeChange(theme, themeData);
    }
    
    /**
     * Apply color scheme
     */
    applyColorScheme() {
        const scheme = this.colorSchemes[this.settings.colorScheme];
        if (scheme && this.container) {
            const root = document.documentElement;
            root.style.setProperty('--chat-primary', scheme.primary);
            root.style.setProperty('--chat-accent', scheme.accent);
        }
    }
    
    /**
     * Apply font size
     */
    applyFontSize() {
        if (this.container) {
            this.container.classList.remove('font-small', 'font-medium', 'font-large', 'font-extra-large');
            this.container.classList.add(`font-${this.settings.fontSize}`);
        }
    }
    
    /**
     * Apply font family
     */
    applyFontFamily() {
        if (this.container) {
            this.container.classList.remove('font-system', 'font-serif', 'font-monospace', 'font-custom');
            this.container.classList.add(`font-${this.settings.fontFamily}`);
            
            if (this.settings.fontFamily === 'custom' && this.settings.customFont) {
                this.loadCustomFont(this.settings.customFont);
            }
        }
    }
    
    /**
     * Apply message spacing
     */
    applyMessageSpacing() {
        if (this.container) {
            this.container.classList.remove('spacing-compact', 'spacing-normal', 'spacing-relaxed');
            this.container.classList.add(`spacing-${this.settings.messageSpacing}`);
        }
    }
    
    /**
     * Apply border radius
     */
    applyBorderRadius() {
        if (this.container) {
            this.container.classList.remove('radius-sharp', 'radius-normal', 'radius-rounded');
            this.container.classList.add(`radius-${this.settings.borderRadius}`);
        }
    }
    
    /**
     * Apply chat width
     */
    applyChatWidth() {
        if (this.container) {
            this.container.classList.remove('width-narrow', 'width-normal', 'width-wide', 'width-auto');
            this.container.classList.add(`width-${this.settings.chatWidth}`);
        }
    }
    
    /**
     * Apply transparency
     */
    applyTransparency() {
        if (this.container && this.settings.transparency > 0) {
            const opacity = 1 - (this.settings.transparency / 100);
            this.container.style.setProperty('--chat-transparency', opacity);
        } else if (this.container) {
            this.container.style.removeProperty('--chat-transparency');
        }
    }
    
    /**
     * Apply animations
     */
    applyAnimations() {
        if (this.container) {
            this.container.classList.toggle('no-animations', !this.settings.animations);
        }
    }
    
    /**
     * Apply accessibility settings
     */
    applyAccessibilitySettings() {
        if (this.container) {
            this.container.classList.toggle('high-contrast', this.settings.highContrast);
            this.container.classList.toggle('reduced-motion', this.settings.reducedMotion);
            this.container.classList.toggle('large-click-targets', this.settings.largeClickTargets);
            this.container.classList.toggle('enhanced-focus', this.settings.focusIndicators);
            this.container.classList.toggle('keyboard-navigation', this.settings.keyboardNavigation);
            this.container.classList.toggle('screen-reader-optimized', this.settings.screenReaderOptimized);
        }
    }
    
    /**
     * Get system theme
     */
    getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }
    
    /**
     * Load custom font
     */
    loadCustomFont(fontUrl) {
        if (!fontUrl) return;
        
        // Remove existing custom font link
        const existingLink = document.querySelector('#custom-chat-font');
        if (existingLink) {
            existingLink.remove();
        }
        
        // Add new font link
        const link = document.createElement('link');
        link.id = 'custom-chat-font';
        link.rel = 'stylesheet';
        link.href = fontUrl;
        document.head.appendChild(link);
    }
    
    /**
     * Reset settings to defaults
     */
    resetSettings() {
        if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
            // Reset to default settings
            this.settings = {
                theme: 'dark',
                colorScheme: 'red',
                fontSize: 'medium',
                fontFamily: 'system',
                customFont: '',
                messageSpacing: 'normal',
                borderRadius: 'normal',
                animations: true,
                transparency: 0,
                chatWidth: 'auto',
                sidebarPosition: 'right',
                headerStyle: 'normal',
                messageLayout: 'standard',
                timestampFormat: 'relative',
                avatarStyle: 'circle',
                autoScroll: true,
                soundEnabled: true,
                enterToSend: true,
                showTypingIndicators: true,
                showOnlineStatus: true,
                autoComplete: true,
                spellCheck: true,
                wordWrap: true,
                showTimestamps: true,
                showAvatars: true,
                showUserRoles: true,
                showMessageNumbers: false,
                groupMessages: true,
                highlightMentions: true,
                showEmojis: true,
                showReactions: true,
                desktopNotifications: true,
                soundNotifications: true,
                mentionNotifications: true,
                privateMessageNotifications: true,
                systemNotifications: false,
                notificationSound: 'default',
                highContrast: false,
                reducedMotion: false,
                largeClickTargets: false,
                screenReaderOptimized: false,
                keyboardNavigation: true,
                focusIndicators: true,
                messageHistory: 100,
                connectionTimeout: 30000,
                reconnectAttempts: 5,
                debugMode: false,
                experimentalFeatures: false
            };
            
            this.loadSettingsIntoUI();
            this.applySettings();
        }
    }
    
    /**
     * Export settings
     */
    exportSettings() {
        const settingsData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            settings: this.settings
        };
        
        const blob = new Blob([JSON.stringify(settingsData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-settings-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }
    
    /**
     * Import settings
     */
    importSettings() {
        this.customizationContainer.querySelector('#import-settings-input').click();
    }
    
    /**
     * Handle import file
     */
    handleImportFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.settings) {
                    // Merge imported settings with defaults
                    this.settings = { ...this.settings, ...data.settings };
                    this.loadSettingsIntoUI();
                    this.applySettings();
                    
                    alert('Settings imported successfully!');
                } else {
                    alert('Invalid settings file format.');
                }
            } catch (error) {
                alert('Error reading settings file: ' + error.message);
            }
        };
        
        reader.readAsText(file);
        
        // Clear the input
        event.target.value = '';
    }
    
    /**
     * Save customization settings
     */
    saveCustomizationSettings() {
        localStorage.setItem('chatCustomizationSettings', JSON.stringify(this.settings));
    }
    
    /**
     * Load customization settings
     */
    loadCustomizationSettings() {
        const saved = localStorage.getItem('chatCustomizationSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }
    
    /**
     * Get current settings
     */
    getSettings() {
        return { ...this.settings };
    }
    
    /**
     * Update settings
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.applySettings();
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
        // Customization interface doesn't need to handle WebSocket messages directly
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
        // Remove UI elements
        if (this.customizationContainer) {
            this.customizationContainer.remove();
        }
        
        // Remove custom font link
        const customFontLink = document.querySelector('#custom-chat-font');
        if (customFontLink) {
            customFontLink.remove();
        }
    }
}

// CSS Styles for Chat Customization Interface
const customizationStyles = `
<style>
/* Chat Customization Interface Styles */
.chat-customization-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
}

.customization-panel {
    background: var(--chat-card, #2a2a2a);
    border: 1px solid var(--chat-border, #444);
    border-radius: 12px;
    width: 90%;
    max-width: 900px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    transform: scale(0.9);
    opacity: 0;
    transition: all 0.3s ease;
}

.customization-panel.show {
    transform: scale(1);
    opacity: 1;
}

.customization-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    border-bottom: 1px solid var(--chat-border, #444);
    background: var(--chat-input, #3a3a3a);
    border-radius: 12px 12px 0 0;
}

.customization-header h4 {
    color: var(--chat-text, #ffffff);
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
}

.customization-header i {
    color: var(--chat-primary, #FF0000);
    margin-right: 0.5rem;
}

.customization-close {
    background: transparent;
    border: none;
    color: var(--chat-text-muted, #cccccc);
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 6px;
    transition: all 0.2s ease;
}

.customization-close:hover {
    background: var(--chat-border, #444);
    color: var(--chat-text, #ffffff);
}

.customization-content {
    flex: 1;
    display: flex;
    overflow: hidden;
}

.customization-tabs {
    width: 200px;
    background: var(--chat-input, #3a3a3a);
    border-right: 1px solid var(--chat-border, #444);
    padding: 1rem 0;
    overflow-y: auto;
}

.customization-tab {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem 1.5rem;
    background: transparent;
    border: none;
    color: var(--chat-text-muted, #cccccc);
    text-align: left;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9rem;
}

.customization-tab:hover {
    background: var(--chat-card, #2a2a2a);
    color: var(--chat-text, #ffffff);
}

.customization-tab.active {
    background: var(--chat-primary, #FF0000);
    color: white;
}

.customization-tab i {
    font-size: 1rem;
    width: 16px;
}

.customization-panels {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
}

.customization-panel-content {
    display: none;
}

.customization-panel-content.active {
    display: block;
}

.customization-section {
    margin-bottom: 2rem;
}

.customization-section h5 {
    color: var(--chat-primary, #FF0000);
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.customization-group {
    margin-bottom: 1.5rem;
}

.customization-group label {
    display: block;
    color: var(--chat-text, #ffffff);
    font-size: 0.9rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
}

.customization-select,
.customization-input {
    width: 100%;
    background: var(--chat-card, #2a2a2a);
    border: 1px solid var(--chat-border, #444);
    color: var(--chat-text, #ffffff);
    padding: 0.6rem 0.75rem;
    border-radius: 6px;
    font-size: 0.9rem;
    transition: all 0.2s ease;
}

.customization-select:focus,
.customization-input:focus {
    outline: none;
    border-color: var(--chat-primary, #FF0000);
    box-shadow: 0 0 0 2px rgba(255, 0, 0, 0.2);
}

.customization-checkbox {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    margin-bottom: 0;
    padding: 0.5rem 0;
}

.customization-checkbox input[type="checkbox"] {
    accent-color: var(--chat-primary, #FF0000);
    width: 16px;
    height: 16px;
    margin: 0;
}

.customization-checkbox span {
    color: var(--chat-text, #ffffff);
    font-size: 0.9rem;
}

.range-control {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.customization-range {
    flex: 1;
    background: var(--chat-input, #3a3a3a);
    border: none;
    height: 6px;
    border-radius: 3px;
    outline: none;
    cursor: pointer;
}

.customization-range::-webkit-slider-thumb {
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--chat-primary, #FF0000);
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.customization-range::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--chat-primary, #FF0000);
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.range-value {
    color: var(--chat-text-muted, #cccccc);
    font-size: 0.85rem;
    font-weight: 600;
    min-width: 40px;
    text-align: right;
}

.color-scheme-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    gap: 0.75rem;
    margin-top: 0.5rem;
}

.color-scheme-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    border: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: var(--chat-input, #3a3a3a);
}

.color-scheme-option:hover {
    border-color: var(--chat-border, #444);
    background: var(--chat-card, #2a2a2a);
}

.color-scheme-option.active {
    border-color: var(--chat-primary, #FF0000);
    background: rgba(255, 0, 0, 0.1);
}

.color-preview {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.color-scheme-option span {
    color: var(--chat-text, #ffffff);
    font-size: 0.8rem;
    font-weight: 500;
}

.customization-footer {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    padding: 1.5rem 2rem;
    border-top: 1px solid var(--chat-border, #444);
    background: var(--chat-input, #3a3a3a);
    border-radius: 0 0 12px 12px;
}

.customization-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1.25rem;
    border: none;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
}

.customization-btn.primary {
    background: var(--chat-primary, #FF0000);
    color: white;
}

.customization-btn.primary:hover {
    background: #cc0000;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(255, 0, 0, 0.3);
}

.customization-btn.secondary {
    background: var(--chat-card, #2a2a2a);
    color: var(--chat-text, #ffffff);
    border: 1px solid var(--chat-border, #444);
}

.customization-btn.secondary:hover {
    background: var(--chat-input, #3a3a3a);
    border-color: var(--chat-primary, #FF0000);
}

/* Font Size Classes */
.font-small {
    font-size: 0.85rem;
}

.font-medium {
    font-size: 1rem;
}

.font-large {
    font-size: 1.15rem;
}

.font-extra-large {
    font-size: 1.3rem;
}

/* Font Family Classes */
.font-system {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.font-serif {
    font-family: Georgia, 'Times New Roman', serif;
}

.font-monospace {
    font-family: 'Courier New', Consolas, monospace;
}

.font-custom {
    font-family: var(--custom-font-family, inherit);
}

/* Message Spacing Classes */
.spacing-compact .message-item {
    margin-bottom: 0.25rem;
    padding: 0.4rem 0.75rem;
}

.spacing-normal .message-item {
    margin-bottom: 0.5rem;
    padding: 0.6rem 1rem;
}

.spacing-relaxed .message-item {
    margin-bottom: 0.75rem;
    padding: 0.8rem 1.25rem;
}

/* Border Radius Classes */
.radius-sharp * {
    border-radius: 0 !important;
}

.radius-normal * {
    border-radius: 6px !important;
}

.radius-rounded * {
    border-radius: 12px !important;
}

/* Chat Width Classes */
.width-narrow {
    max-width: 600px;
    margin: 0 auto;
}

.width-normal {
    max-width: 800px;
    margin: 0 auto;
}

.width-wide {
    max-width: 1200px;
    margin: 0 auto;
}

.width-auto {
    max-width: none;
}

/* Animation Classes */
.no-animations * {
    animation: none !important;
    transition: none !important;
}

/* Accessibility Classes */
.high-contrast {
    filter: contrast(150%);
}

.reduced-motion * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
}

.large-click-targets button,
.large-click-targets .clickable {
    min-height: 44px;
    min-width: 44px;
}

.enhanced-focus *:focus {
    outline: 3px solid var(--chat-primary, #FF0000) !important;
    outline-offset: 2px !important;
}

.screen-reader-optimized .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

/* Responsive Design */
@media (max-width: 768px) {
    .customization-panel {
        width: 95%;
        max-height: 95vh;
    }

    .customization-header {
        padding: 1rem 1.5rem;
    }

    .customization-header h4 {
        font-size: 1.1rem;
    }

    .customization-content {
        flex-direction: column;
    }

    .customization-tabs {
        width: 100%;
        display: flex;
        overflow-x: auto;
        padding: 0.5rem 0;
        border-right: none;
        border-bottom: 1px solid var(--chat-border, #444);
    }

    .customization-tab {
        flex-shrink: 0;
        padding: 0.5rem 1rem;
        font-size: 0.8rem;
    }

    .customization-tab span {
        display: none;
    }

    .customization-panels {
        padding: 1.5rem;
    }

    .customization-footer {
        padding: 1rem 1.5rem;
        flex-direction: column;
        gap: 0.75rem;
    }

    .customization-btn {
        justify-content: center;
    }

    .color-scheme-grid {
        grid-template-columns: repeat(4, 1fr);
    }
}

@media (max-width: 480px) {
    .customization-panel {
        width: 100%;
        height: 100%;
        max-height: 100vh;
        border-radius: 0;
    }

    .customization-header {
        padding: 0.75rem 1rem;
        border-radius: 0;
    }

    .customization-header h4 {
        font-size: 1rem;
    }

    .customization-panels {
        padding: 1rem;
    }

    .customization-footer {
        padding: 0.75rem 1rem;
        border-radius: 0;
    }

    .customization-group {
        margin-bottom: 1rem;
    }

    .customization-section {
        margin-bottom: 1.5rem;
    }

    .color-scheme-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 0.5rem;
    }

    .color-scheme-option {
        padding: 0.5rem;
    }

    .color-preview {
        width: 20px;
        height: 20px;
    }
}

/* Dark/Light Theme Support */
.light-theme .customization-panel {
    background: #ffffff;
    border-color: #dee2e6;
}

.light-theme .customization-header,
.light-theme .customization-footer {
    background: #f8f9fa;
    border-color: #dee2e6;
}

.light-theme .customization-tabs {
    background: #f8f9fa;
    border-color: #dee2e6;
}

.light-theme .customization-tab {
    color: #6c757d;
}

.light-theme .customization-tab:hover {
    background: #ffffff;
    color: #212529;
}

.light-theme .customization-select,
.light-theme .customization-input {
    background: #ffffff;
    border-color: #ced4da;
    color: #495057;
}

.light-theme .color-scheme-option {
    background: #ffffff;
    border-color: #dee2e6;
}

.light-theme .color-scheme-option:hover {
    background: #f8f9fa;
    border-color: #ced4da;
}

.light-theme .customization-btn.secondary {
    background: #ffffff;
    color: #495057;
    border-color: #ced4da;
}

.light-theme .customization-btn.secondary:hover {
    background: #f8f9fa;
    border-color: var(--chat-primary, #FF0000);
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
    .customization-panel {
        border-width: 2px;
    }

    .customization-select,
    .customization-input {
        border-width: 2px;
    }

    .customization-btn {
        border-width: 2px;
    }

    .color-scheme-option {
        border-width: 3px;
    }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
    .customization-panel {
        transition: none;
    }

    .customization-tab,
    .customization-btn,
    .customization-close,
    .color-scheme-option {
        transition: none;
    }
}

/* Print Styles */
@media print {
    .chat-customization-container {
        display: none !important;
    }
}

/* Focus Styles for Accessibility */
.customization-tab:focus,
.customization-select:focus,
.customization-input:focus,
.customization-checkbox input:focus,
.customization-range:focus,
.customization-btn:focus,
.customization-close:focus,
.color-scheme-option:focus {
    outline: 2px solid var(--chat-primary, #FF0000);
    outline-offset: 2px;
}

/* Scrollbar Styles */
.customization-tabs::-webkit-scrollbar,
.customization-panels::-webkit-scrollbar {
    width: 6px;
}

.customization-tabs::-webkit-scrollbar-track,
.customization-panels::-webkit-scrollbar-track {
    background: var(--chat-bg, #1a1a1a);
}

.customization-tabs::-webkit-scrollbar-thumb,
.customization-panels::-webkit-scrollbar-thumb {
    background: var(--chat-border, #444);
    border-radius: 3px;
}

/* Animation for panel appearance */
@keyframes customization-panel-appear {
    from {
        opacity: 0;
        transform: scale(0.9) translateY(20px);
    }
    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

.customization-panel.show {
    animation: customization-panel-appear 0.3s ease-out;
}
</style>
`;

// Inject styles into document head
if (typeof document !== 'undefined') {
    const styleElement = document.createElement('div');
    styleElement.innerHTML = customizationStyles;
    document.head.appendChild(styleElement.firstElementChild);
}

// Global reference for onclick handlers
let chatCustomization = null;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatCustomizationInterface;
} else if (typeof window !== 'undefined') {
    window.ChatCustomizationInterface = ChatCustomizationInterface;
}
