/**
 * Modern Chat Interface
 * Comprehensive chat UI integrating all chat features with modern design
 */
class ModernChatInterface {
    constructor(options = {}) {
        this.websocket = options.websocket || null;
        this.currentUserId = options.currentUserId || null;
        this.currentUserRole = options.currentUserRole || 'guest';
        this.roomId = options.roomId || 'default';
        this.container = options.container || null;
        
        // Feature integrations
        this.emojiInterface = options.emojiInterface || null;
        this.moderationInterface = options.moderationInterface || null;
        this.commandInterface = options.commandInterface || null;
        this.privateMessageInterface = options.privateMessageInterface || null;
        this.exportInterface = options.exportInterface || null;
        this.threadingInterface = options.threadingInterface || null;
        this.typingInterface = options.typingInterface || null;
        this.userListInterface = options.userListInterface || null;
        this.notificationInterface = options.notificationInterface || null;
        this.searchInterface = options.searchInterface || null;
        this.customizationInterface = options.customizationInterface || null;
        this.mobileInterface = options.mobileInterface || null;
        
        // Chat state
        this.messages = [];
        this.users = new Map();
        this.isMinimized = false;
        this.unreadCount = 0;
        this.lastReadTimestamp = Date.now();
        this.typingUsers = new Set();
        this.selectedMessage = null;
        this.replyToMessage = null;
        
        // UI elements
        this.elements = {};
        
        // Settings
        this.settings = {
            theme: 'dark',
            fontSize: 'medium',
            soundEnabled: true,
            notificationsEnabled: true,
            showTimestamps: true,
            showAvatars: true,
            compactMode: false,
            autoScroll: true,
            ...options.settings
        };
        
        this.init();
        this.initializeThreading();
        this.initializeTypingIndicators();
        this.initializeUserList();
        this.initializeNotifications();
        this.initializeSearch();
        this.initializeCustomization();
        this.initializeMobileInterface();
    }
    
    /**
     * Initialize the chat interface
     */
    init() {
        if (this.container) {
            this.createChatInterface();
            this.attachEventListeners();
            this.loadChatHistory();
        }
        
        if (this.websocket) {
            this.attachWebSocketListeners();
        }
    }

    /**
     * Initialize threading interface
     */
    initializeThreading() {
        if (typeof MessageThreadingInterface !== 'undefined') {
            this.threadingInterface = new MessageThreadingInterface({
                container: this.container,
                websocket: this.websocket,
                currentUserId: this.currentUserId,
                currentUserRole: this.currentUserRole,
                roomId: this.roomId,
                onThreadUpdate: (threadId, thread) => this.handleThreadUpdate(threadId, thread),
                onReplyAdded: (threadId, reply) => this.handleReplyAdded(threadId, reply)
            });

            // Set global reference for onclick handlers
            window.messageThreading = this.threadingInterface;
        }
    }

    /**
     * Initialize typing indicators interface
     */
    initializeTypingIndicators() {
        if (typeof TypingIndicatorInterface !== 'undefined') {
            this.typingInterface = new TypingIndicatorInterface({
                container: this.container,
                websocket: this.websocket,
                currentUserId: this.currentUserId,
                currentUserRole: this.currentUserRole,
                roomId: this.roomId,
                onTypingUpdate: (typingUsers) => this.handleTypingUpdate(typingUsers)
            });

            // Attach typing listeners to chat input
            const chatInput = this.container.querySelector('#chat-input');
            if (chatInput) {
                this.typingInterface.attachInputListeners(chatInput);
            }

            // Set global reference
            window.typingIndicator = this.typingInterface;
        }
    }

    /**
     * Initialize user list interface
     */
    initializeUserList() {
        if (typeof UserListInterface !== 'undefined') {
            this.userListInterface = new UserListInterface({
                container: this.container,
                websocket: this.websocket,
                currentUserId: this.currentUserId,
                currentUserRole: this.currentUserRole,
                roomId: this.roomId,
                onUserAction: (action, userId) => this.handleUserAction(action, userId),
                onUserStatusChange: (userId, status, user) => this.handleUserStatusChange(userId, status, user)
            });

            // Set global reference for onclick handlers
            window.userList = this.userListInterface;
        }
    }

    /**
     * Initialize notification interface
     */
    initializeNotifications() {
        if (typeof ChatNotificationInterface !== 'undefined') {
            this.notificationInterface = new ChatNotificationInterface({
                container: this.container,
                websocket: this.websocket,
                currentUserId: this.currentUserId,
                currentUserRole: this.currentUserRole,
                roomId: this.roomId,
                onNotificationClick: (notification) => this.handleNotificationClick(notification),
                onSoundPlay: (soundType) => this.handleSoundPlay(soundType)
            });

            // Set global reference for onclick handlers
            window.chatNotifications = this.notificationInterface;
        }
    }

    /**
     * Initialize search interface
     */
    initializeSearch() {
        if (typeof ChatSearchInterface !== 'undefined') {
            this.searchInterface = new ChatSearchInterface({
                container: this.container,
                websocket: this.websocket,
                currentUserId: this.currentUserId,
                currentUserRole: this.currentUserRole,
                roomId: this.roomId,
                onSearchResult: (results, query) => this.handleSearchResult(results, query),
                onSearchNavigation: (result, index) => this.handleSearchNavigation(result, index)
            });

            // Set global reference for onclick handlers
            window.chatSearch = this.searchInterface;
        }
    }

    /**
     * Initialize customization interface
     */
    initializeCustomization() {
        if (typeof ChatCustomizationInterface !== 'undefined') {
            this.customizationInterface = new ChatCustomizationInterface({
                container: this.container,
                websocket: this.websocket,
                currentUserId: this.currentUserId,
                currentUserRole: this.currentUserRole,
                roomId: this.roomId,
                settings: this.settings,
                onSettingsChange: (key, value, allSettings) => this.handleSettingsChange(key, value, allSettings),
                onThemeChange: (theme, themeData) => this.handleThemeChange(theme, themeData),
                onLayoutChange: (settings) => this.handleLayoutChange(settings)
            });

            // Set global reference for onclick handlers
            window.chatCustomization = this.customizationInterface;
        }
    }

    /**
     * Initialize mobile responsive interface
     */
    initializeMobileInterface() {
        if (typeof MobileResponsiveInterface !== 'undefined') {
            this.mobileInterface = new MobileResponsiveInterface({
                container: this.container,
                websocket: this.websocket,
                currentUserId: this.currentUserId,
                currentUserRole: this.currentUserRole,
                roomId: this.roomId,
                settings: this.settings,
                onOrientationChange: (isLandscape) => this.handleOrientationChange(isLandscape),
                onViewportChange: (viewport) => this.handleViewportChange(viewport),
                onTouchInteraction: (type, event) => this.handleTouchInteraction(type, event)
            });

            // Set global reference for onclick handlers
            window.mobileResponsive = this.mobileInterface;
        }
    }
    
    /**
     * Create the main chat interface
     */
    createChatInterface() {
        this.container.innerHTML = `
            <div class="modern-chat-container ${this.settings.theme}-theme ${this.settings.compactMode ? 'compact' : ''}">
                <!-- Chat Header -->
                <div class="chat-header">
                    <div class="chat-title">
                        <i class="fas fa-comments"></i>
                        <span>Live Chat</span>
                        <span class="user-count" id="user-count">0 users</span>
                    </div>
                    <div class="chat-controls">
                        <button class="chat-btn" id="search-btn" title="Search Messages">
                            <i class="fas fa-search"></i>
                        </button>
                        <button class="chat-btn" id="users-btn" title="User List">
                            <i class="fas fa-users"></i>
                        </button>
                        <button class="chat-btn" id="settings-btn" title="Chat Settings">
                            <i class="fas fa-cog"></i>
                        </button>
                        <button class="chat-btn" id="minimize-btn" title="Minimize Chat">
                            <i class="fas fa-minus"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Chat Body -->
                <div class="chat-body">
                    <!-- Messages Area -->
                    <div class="messages-container">
                        <div class="messages-list" id="messages-list">
                            <div class="welcome-message">
                                <i class="fas fa-comments"></i>
                                <h4>Welcome to Live Chat</h4>
                                <p>Start chatting with other participants</p>
                            </div>
                        </div>
                        
                        <!-- Typing Indicators -->
                        <div class="typing-indicators" id="typing-indicators"></div>
                        
                        <!-- Scroll to Bottom Button -->
                        <button class="scroll-bottom-btn" id="scroll-bottom-btn" style="display: none;">
                            <i class="fas fa-arrow-down"></i>
                            <span class="unread-badge" id="unread-badge">0</span>
                        </button>
                    </div>
                    
                    <!-- Sidebar (Users/Search) -->
                    <div class="chat-sidebar" id="chat-sidebar" style="display: none;">
                        <!-- User List -->
                        <div class="sidebar-panel" id="users-panel">
                            <div class="panel-header">
                                <h4><i class="fas fa-users me-2"></i>Online Users</h4>
                                <button class="close-panel-btn" data-panel="users">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            <div class="panel-content">
                                <div class="users-list" id="users-list">
                                    <div class="user-item">
                                        <div class="user-avatar">
                                            <i class="fas fa-user"></i>
                                        </div>
                                        <div class="user-info">
                                            <div class="user-name">Loading...</div>
                                            <div class="user-status">Connecting...</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Search Panel -->
                        <div class="sidebar-panel" id="search-panel" style="display: none;">
                            <div class="panel-header">
                                <h4><i class="fas fa-search me-2"></i>Search Messages</h4>
                                <button class="close-panel-btn" data-panel="search">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            <div class="panel-content">
                                <div class="search-form">
                                    <input type="text" class="search-input" id="search-input" placeholder="Search messages...">
                                    <div class="search-filters">
                                        <label class="filter-option">
                                            <input type="checkbox" id="search-user-messages" checked>
                                            <span>My messages</span>
                                        </label>
                                        <label class="filter-option">
                                            <input type="checkbox" id="search-all-messages" checked>
                                            <span>All messages</span>
                                        </label>
                                    </div>
                                </div>
                                <div class="search-results" id="search-results">
                                    <div class="no-results">
                                        <i class="fas fa-search"></i>
                                        <p>Enter a search term to find messages</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Settings Panel -->
                        <div class="sidebar-panel" id="settings-panel" style="display: none;">
                            <div class="panel-header">
                                <h4><i class="fas fa-cog me-2"></i>Chat Settings</h4>
                                <button class="close-panel-btn" data-panel="settings">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            <div class="panel-content">
                                <div class="settings-form">
                                    <div class="setting-group">
                                        <label>Theme</label>
                                        <select id="theme-select" class="setting-control">
                                            <option value="dark">Dark</option>
                                            <option value="light">Light</option>
                                        </select>
                                    </div>
                                    
                                    <div class="setting-group">
                                        <label>Font Size</label>
                                        <select id="font-size-select" class="setting-control">
                                            <option value="small">Small</option>
                                            <option value="medium">Medium</option>
                                            <option value="large">Large</option>
                                        </select>
                                    </div>
                                    
                                    <div class="setting-group">
                                        <label class="setting-checkbox">
                                            <input type="checkbox" id="sound-enabled">
                                            <span>Sound notifications</span>
                                        </label>
                                    </div>
                                    
                                    <div class="setting-group">
                                        <label class="setting-checkbox">
                                            <input type="checkbox" id="notifications-enabled">
                                            <span>Desktop notifications</span>
                                        </label>
                                    </div>
                                    
                                    <div class="setting-group">
                                        <label class="setting-checkbox">
                                            <input type="checkbox" id="show-timestamps">
                                            <span>Show timestamps</span>
                                        </label>
                                    </div>
                                    
                                    <div class="setting-group">
                                        <label class="setting-checkbox">
                                            <input type="checkbox" id="show-avatars">
                                            <span>Show user avatars</span>
                                        </label>
                                    </div>
                                    
                                    <div class="setting-group">
                                        <label class="setting-checkbox">
                                            <input type="checkbox" id="compact-mode">
                                            <span>Compact mode</span>
                                        </label>
                                    </div>
                                    
                                    <div class="setting-group">
                                        <label class="setting-checkbox">
                                            <input type="checkbox" id="auto-scroll">
                                            <span>Auto-scroll to new messages</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Reply Bar -->
                <div class="reply-bar" id="reply-bar" style="display: none;">
                    <div class="reply-content">
                        <div class="reply-info">
                            <i class="fas fa-reply"></i>
                            <span>Replying to <strong id="reply-user"></strong></span>
                        </div>
                        <div class="reply-message" id="reply-message"></div>
                    </div>
                    <button class="cancel-reply-btn" id="cancel-reply-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <!-- Chat Input -->
                <div class="chat-input-container">
                    <div class="input-toolbar">
                        <button class="toolbar-btn" id="emoji-btn" title="Emojis">
                            <i class="fas fa-smile"></i>
                        </button>
                        <button class="toolbar-btn" id="format-btn" title="Formatting">
                            <i class="fas fa-bold"></i>
                        </button>
                        <button class="toolbar-btn" id="commands-btn" title="Commands">
                            <i class="fas fa-terminal"></i>
                        </button>
                        <button class="toolbar-btn" id="private-msg-btn" title="Private Message">
                            <i class="fas fa-envelope"></i>
                        </button>
                        ${this.canModerate() ? `
                        <button class="toolbar-btn" id="moderation-btn" title="Moderation">
                            <i class="fas fa-shield-alt"></i>
                        </button>
                        ` : ''}
                        ${this.canExport() ? `
                        <button class="toolbar-btn" id="export-btn" title="Export Chat">
                            <i class="fas fa-download"></i>
                        </button>
                        ` : ''}
                    </div>
                    
                    <div class="input-area">
                        <textarea 
                            class="chat-input" 
                            id="chat-input" 
                            placeholder="Type a message... (Press Enter to send, Shift+Enter for new line)"
                            rows="1"
                            maxlength="2000"
                        ></textarea>
                        <button class="send-btn" id="send-btn" disabled>
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                    
                    <div class="input-footer">
                        <div class="character-count">
                            <span id="char-count">0</span>/2000
                        </div>
                        <div class="input-status" id="input-status"></div>
                    </div>
                </div>
                
                <!-- Feature Panels -->
                <div class="feature-panels">
                    <!-- Emoji Panel -->
                    <div class="feature-panel" id="emoji-panel" style="display: none;">
                        <!-- Emoji picker will be inserted here -->
                    </div>
                    
                    <!-- Formatting Panel -->
                    <div class="feature-panel" id="format-panel" style="display: none;">
                        <div class="format-buttons">
                            <button class="format-btn" data-format="bold" title="Bold">
                                <i class="fas fa-bold"></i>
                            </button>
                            <button class="format-btn" data-format="italic" title="Italic">
                                <i class="fas fa-italic"></i>
                            </button>
                            <button class="format-btn" data-format="underline" title="Underline">
                                <i class="fas fa-underline"></i>
                            </button>
                            <button class="format-btn" data-format="strikethrough" title="Strikethrough">
                                <i class="fas fa-strikethrough"></i>
                            </button>
                            <button class="format-btn" data-format="code" title="Code">
                                <i class="fas fa-code"></i>
                            </button>
                            <button class="format-btn" data-format="quote" title="Quote">
                                <i class="fas fa-quote-left"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Commands Panel -->
                    <div class="feature-panel" id="commands-panel" style="display: none;">
                        <!-- Commands interface will be inserted here -->
                    </div>
                    
                    <!-- Private Message Panel -->
                    <div class="feature-panel" id="private-msg-panel" style="display: none;">
                        <!-- Private messaging interface will be inserted here -->
                    </div>
                    
                    <!-- Moderation Panel -->
                    <div class="feature-panel" id="moderation-panel" style="display: none;">
                        <!-- Moderation interface will be inserted here -->
                    </div>
                    
                    <!-- Export Panel -->
                    <div class="feature-panel" id="export-panel" style="display: none;">
                        <!-- Export interface will be inserted here -->
                    </div>
                </div>
            </div>
        `;
        
        // Store element references
        this.elements = {
            container: this.container.querySelector('.modern-chat-container'),
            messagesList: this.container.querySelector('#messages-list'),
            chatInput: this.container.querySelector('#chat-input'),
            sendBtn: this.container.querySelector('#send-btn'),
            userCount: this.container.querySelector('#user-count'),
            usersList: this.container.querySelector('#users-list'),
            typingIndicators: this.container.querySelector('#typing-indicators'),
            scrollBottomBtn: this.container.querySelector('#scroll-bottom-btn'),
            unreadBadge: this.container.querySelector('#unread-badge'),
            replyBar: this.container.querySelector('#reply-bar'),
            charCount: this.container.querySelector('#char-count'),
            sidebar: this.container.querySelector('#chat-sidebar')
        };
        
        // Apply current settings
        this.applySettings();
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Chat input
        this.elements.chatInput.addEventListener('input', (e) => this.handleInputChange(e));
        this.elements.chatInput.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        
        // Header controls
        this.container.querySelector('#search-btn').addEventListener('click', () => this.toggleSearch());
        this.container.querySelector('#users-btn').addEventListener('click', () => this.togglePanel('users'));
        this.container.querySelector('#settings-btn').addEventListener('click', () => this.toggleCustomization());
        this.container.querySelector('#minimize-btn').addEventListener('click', () => this.toggleMinimize());
        
        // Toolbar buttons
        this.container.querySelector('#emoji-btn').addEventListener('click', () => this.toggleFeaturePanel('emoji'));
        this.container.querySelector('#format-btn').addEventListener('click', () => this.toggleFeaturePanel('format'));
        this.container.querySelector('#commands-btn').addEventListener('click', () => this.toggleFeaturePanel('commands'));
        this.container.querySelector('#private-msg-btn').addEventListener('click', () => this.toggleFeaturePanel('private-msg'));
        
        if (this.canModerate()) {
            this.container.querySelector('#moderation-btn').addEventListener('click', () => this.toggleFeaturePanel('moderation'));
        }
        
        if (this.canExport()) {
            this.container.querySelector('#export-btn').addEventListener('click', () => this.toggleFeaturePanel('export'));
        }
        
        // Panel close buttons
        this.container.querySelectorAll('.close-panel-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const panel = e.target.closest('button').dataset.panel;
                this.togglePanel(panel);
            });
        });
        
        // Reply functionality
        this.container.querySelector('#cancel-reply-btn').addEventListener('click', () => this.cancelReply());
        
        // Scroll to bottom
        this.elements.scrollBottomBtn.addEventListener('click', () => this.scrollToBottom());
        
        // Messages list scroll
        this.elements.messagesList.addEventListener('scroll', () => this.handleScroll());
        
        // Format buttons
        this.container.querySelectorAll('.format-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const format = e.target.closest('button').dataset.format;
                this.applyFormatting(format);
            });
        });
        
        // Settings
        this.attachSettingsListeners();
        
        // Search
        this.container.querySelector('#search-input').addEventListener('input', (e) => this.handleSearch(e.target.value));
    }
    
    /**
     * Attach settings event listeners
     */
    attachSettingsListeners() {
        const themeSelect = this.container.querySelector('#theme-select');
        const fontSizeSelect = this.container.querySelector('#font-size-select');
        const soundEnabled = this.container.querySelector('#sound-enabled');
        const notificationsEnabled = this.container.querySelector('#notifications-enabled');
        const showTimestamps = this.container.querySelector('#show-timestamps');
        const showAvatars = this.container.querySelector('#show-avatars');
        const compactMode = this.container.querySelector('#compact-mode');
        const autoScroll = this.container.querySelector('#auto-scroll');
        
        themeSelect.value = this.settings.theme;
        fontSizeSelect.value = this.settings.fontSize;
        soundEnabled.checked = this.settings.soundEnabled;
        notificationsEnabled.checked = this.settings.notificationsEnabled;
        showTimestamps.checked = this.settings.showTimestamps;
        showAvatars.checked = this.settings.showAvatars;
        compactMode.checked = this.settings.compactMode;
        autoScroll.checked = this.settings.autoScroll;
        
        themeSelect.addEventListener('change', (e) => this.updateSetting('theme', e.target.value));
        fontSizeSelect.addEventListener('change', (e) => this.updateSetting('fontSize', e.target.value));
        soundEnabled.addEventListener('change', (e) => this.updateSetting('soundEnabled', e.target.checked));
        notificationsEnabled.addEventListener('change', (e) => this.updateSetting('notificationsEnabled', e.target.checked));
        showTimestamps.addEventListener('change', (e) => this.updateSetting('showTimestamps', e.target.checked));
        showAvatars.addEventListener('change', (e) => this.updateSetting('showAvatars', e.target.checked));
        compactMode.addEventListener('change', (e) => this.updateSetting('compactMode', e.target.checked));
        autoScroll.addEventListener('change', (e) => this.updateSetting('autoScroll', e.target.checked));
    }
    
    /**
     * Check if user can moderate
     */
    canModerate() {
        return ['admin', 'moderator', 'host'].includes(this.currentUserRole);
    }
    
    /**
     * Check if user can export
     */
    canExport() {
        return ['admin', 'moderator', 'host'].includes(this.currentUserRole);
    }
    
    /**
     * Apply current settings to the interface
     */
    applySettings() {
        const container = this.elements.container;
        
        // Theme
        container.className = container.className.replace(/\w+-theme/g, '');
        container.classList.add(`${this.settings.theme}-theme`);
        
        // Font size
        container.className = container.className.replace(/font-\w+/g, '');
        container.classList.add(`font-${this.settings.fontSize}`);
        
        // Compact mode
        container.classList.toggle('compact', this.settings.compactMode);
        
        // Show/hide elements based on settings
        container.classList.toggle('hide-timestamps', !this.settings.showTimestamps);
        container.classList.toggle('hide-avatars', !this.settings.showAvatars);
    }
    
    /**
     * Update a setting
     */
    updateSetting(key, value) {
        this.settings[key] = value;
        this.applySettings();
        this.saveSettings();
    }
    
    /**
     * Save settings to localStorage
     */
    saveSettings() {
        localStorage.setItem('modernChatSettings', JSON.stringify(this.settings));
    }
    
    /**
     * Load settings from localStorage
     */
    loadSettings() {
        const saved = localStorage.getItem('modernChatSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }
    
    /**
     * Handle input change
     */
    handleInputChange(e) {
        const value = e.target.value;
        const length = value.length;
        
        // Update character count
        this.elements.charCount.textContent = length;
        
        // Update send button state
        this.elements.sendBtn.disabled = length === 0 || length > 2000;
        
        // Auto-resize textarea
        this.autoResizeTextarea(e.target);
        
        // Send typing indicator
        this.sendTypingIndicator();
    }
    
    /**
     * Handle key down events
     */
    handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
        } else if (e.key === 'Escape') {
            this.cancelReply();
            this.closeAllPanels();
        }
    }
    
    /**
     * Auto-resize textarea
     */
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        const maxHeight = 120; // Max 5 lines
        const newHeight = Math.min(textarea.scrollHeight, maxHeight);
        textarea.style.height = newHeight + 'px';
    }
    
    /**
     * Send message
     */
    sendMessage() {
        const message = this.elements.chatInput.value.trim();
        if (!message || !this.websocket) return;
        
        const messageData = {
            type: 'chat_message',
            message: message,
            room_id: this.roomId,
            reply_to: this.replyToMessage ? this.replyToMessage.id : null
        };
        
        this.websocket.send(JSON.stringify(messageData));
        
        // Clear input
        this.elements.chatInput.value = '';
        this.elements.chatInput.style.height = 'auto';
        this.elements.charCount.textContent = '0';
        this.elements.sendBtn.disabled = true;
        
        // Cancel reply
        this.cancelReply();
        
        // Focus input
        this.elements.chatInput.focus();
    }
    
    /**
     * Add message to chat
     */
    addMessage(message) {
        // Remove welcome message if present
        const welcomeMessage = this.elements.messagesList.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        // Create message element
        const messageElement = this.createMessageElement(message);
        this.elements.messagesList.appendChild(messageElement);
        
        // Store message
        this.messages.push(message);

        // Add to search interface
        if (this.searchInterface) {
            this.searchInterface.addMessage(message.id, message, messageElement);
        }

        // Auto-scroll if enabled and user is at bottom
        if (this.settings.autoScroll && this.isAtBottom()) {
            this.scrollToBottom();
        } else {
            this.updateUnreadCount();
        }
        
        // Play sound if enabled
        if (this.settings.soundEnabled && message.user_id !== this.currentUserId) {
            this.playNotificationSound();
        }
        
        // Show desktop notification if enabled
        if (this.settings.notificationsEnabled && message.user_id !== this.currentUserId) {
            this.showDesktopNotification(message);
        }
    }
    
    /**
     * Create message element
     */
    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.user_id === this.currentUserId ? 'own-message' : ''}`;
        messageDiv.dataset.messageId = message.id;
        
        const timestamp = this.settings.showTimestamps ? 
            `<span class="message-time">${this.formatTime(message.timestamp)}</span>` : '';
        
        const avatar = this.settings.showAvatars ? 
            `<div class="message-avatar">
                <i class="fas fa-user"></i>
            </div>` : '';
        
        const replyInfo = message.reply_to ? 
            `<div class="reply-info">
                <i class="fas fa-reply"></i>
                <span>Replying to ${message.reply_to.user_name}</span>
            </div>` : '';
        
        messageDiv.innerHTML = `
            ${avatar}
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">${message.user_name}</span>
                    <span class="user-role ${message.user_role}">${message.user_role}</span>
                    ${timestamp}
                </div>
                ${replyInfo}
                <div class="message-text">${this.formatMessageText(message.message)}</div>
                <div class="message-actions">
                    <button class="message-action-btn" onclick="modernChat.replyToMessage('${message.id}')" title="Reply">
                        <i class="fas fa-reply"></i>
                    </button>
                    <button class="message-action-btn" onclick="modernChat.startThread('${message.id}')" title="Start Thread">
                        <i class="fas fa-comments"></i>
                    </button>
                    ${this.canModerate() ? `
                    <button class="message-action-btn" onclick="modernChat.moderateMessage('${message.id}')" title="Moderate">
                        <i class="fas fa-shield-alt"></i>
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        return messageDiv;
    }
    
    /**
     * Format message text with emojis and formatting
     */
    formatMessageText(text) {
        // Apply emoji conversion
        if (this.emojiInterface) {
            text = this.emojiInterface.parseEmojis(text);
        }
        
        // Apply basic formatting
        text = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/__(.*?)__/g, '<u>$1</u>')
            .replace(/~~(.*?)~~/g, '<del>$1</del>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
        
        return text;
    }
    
    /**
     * Format timestamp
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    /**
     * Toggle sidebar panel
     */
    togglePanel(panelName) {
        const sidebar = this.elements.sidebar;
        const panel = this.container.querySelector(`#${panelName}-panel`);
        
        if (panel.style.display === 'none') {
            // Hide all panels
            this.container.querySelectorAll('.sidebar-panel').forEach(p => {
                p.style.display = 'none';
            });
            
            // Show selected panel
            panel.style.display = 'block';
            sidebar.style.display = 'block';
        } else {
            sidebar.style.display = 'none';
        }
    }
    
    /**
     * Toggle feature panel
     */
    toggleFeaturePanel(panelName) {
        const panel = this.container.querySelector(`#${panelName}-panel`);
        
        // Hide all feature panels
        this.container.querySelectorAll('.feature-panel').forEach(p => {
            p.style.display = 'none';
        });
        
        // Toggle selected panel
        if (panel.style.display === 'none') {
            panel.style.display = 'block';
        } else {
            panel.style.display = 'none';
        }
    }
    
    /**
     * Close all panels
     */
    closeAllPanels() {
        this.elements.sidebar.style.display = 'none';
        this.container.querySelectorAll('.feature-panel').forEach(p => {
            p.style.display = 'none';
        });
    }
    
    /**
     * Toggle minimize
     */
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        this.elements.container.classList.toggle('minimized', this.isMinimized);
        
        const minimizeBtn = this.container.querySelector('#minimize-btn');
        minimizeBtn.innerHTML = this.isMinimized ? 
            '<i class="fas fa-plus"></i>' : 
            '<i class="fas fa-minus"></i>';
    }
    
    /**
     * Reply to message
     */
    replyToMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;

        this.replyToMessage = message;

        const replyBar = this.elements.replyBar;
        this.container.querySelector('#reply-user').textContent = message.user_name;
        this.container.querySelector('#reply-message').textContent = message.message.substring(0, 100) +
            (message.message.length > 100 ? '...' : '');

        replyBar.style.display = 'flex';
        this.elements.chatInput.focus();
    }

    /**
     * Start thread from message
     */
    startThread(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message || !this.threadingInterface) return;

        this.threadingInterface.startThread(messageId, message);
    }

    /**
     * Handle thread update
     */
    handleThreadUpdate(threadId, thread) {
        // Update UI when thread is updated
        console.log('Thread updated:', threadId, thread);
    }

    /**
     * Handle reply added to thread
     */
    handleReplyAdded(threadId, reply) {
        // Handle when a reply is added to a thread
        console.log('Reply added to thread:', threadId, reply);

        // Show notification if not the current user
        if (reply.user_id !== this.currentUserId) {
            this.showNotification(
                'New Thread Reply',
                `${reply.user_name} replied in a thread`,
                'info'
            );
        }
    }

    /**
     * Handle typing update
     */
    handleTypingUpdate(typingUsers) {
        // Update chat header with typing status
        this.updateChatHeaderTyping(typingUsers);

        // Update user list with typing indicators
        this.updateUserListTyping(typingUsers);
    }

    /**
     * Update chat header with typing status
     */
    updateChatHeaderTyping(typingUsers) {
        const chatHeader = this.container.querySelector('.chat-header');
        if (!chatHeader) return;

        // Remove existing typing indicator
        const existingTyping = chatHeader.querySelector('.chat-header-typing');
        if (existingTyping) {
            existingTyping.remove();
        }

        if (typingUsers.length === 0) return;

        // Add typing indicator to header
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'chat-header-typing';

        if (typingUsers.length === 1) {
            typingIndicator.innerHTML = `
                <i class="fas fa-keyboard"></i>
                <span>${typingUsers[0].userName} is typing...</span>
            `;
        } else {
            typingIndicator.innerHTML = `
                <i class="fas fa-keyboard"></i>
                <span>${typingUsers.length} people are typing...</span>
            `;
        }

        chatHeader.appendChild(typingIndicator);
    }

    /**
     * Update user list with typing indicators
     */
    updateUserListTyping(typingUsers) {
        // This is handled by the typing interface itself
        // but we can add additional logic here if needed
    }

    /**
     * Handle user action
     */
    handleUserAction(action, userId) {
        switch (action) {
            case 'select':
                this.selectUser(userId);
                break;

            case 'private_message':
                this.startPrivateMessage(userId);
                break;

            case 'moderate':
                this.moderateUser(userId);
                break;

            case 'invite':
                this.showInviteDialog();
                break;

            default:
                console.log('Unknown user action:', action, userId);
        }
    }

    /**
     * Handle user status change
     */
    handleUserStatusChange(userId, status, user) {
        // Show notification for user status changes
        if (status === 'joined' && userId !== this.currentUserId) {
            this.showNotification(
                'User Joined',
                `${user.name} joined the chat`,
                'info'
            );
        } else if (status === 'left' && userId !== this.currentUserId) {
            this.showNotification(
                'User Left',
                `${user.name} left the chat`,
                'info'
            );
        }

        // Update user count in header if needed
        this.updateChatHeaderUserCount();
    }

    /**
     * Select user
     */
    selectUser(userId) {
        // Show user profile or details
        console.log('User selected:', userId);
    }

    /**
     * Start private message with user
     */
    startPrivateMessage(userId) {
        if (this.privateMessageInterface) {
            this.privateMessageInterface.startConversation(userId);
        }
    }

    /**
     * Moderate user
     */
    moderateUser(userId) {
        if (this.moderationInterface) {
            this.moderationInterface.showModerationDialog(userId);
        }
    }

    /**
     * Show invite dialog
     */
    showInviteDialog() {
        // Show invite users dialog
        console.log('Show invite dialog');
    }

    /**
     * Update chat header user count
     */
    updateChatHeaderUserCount() {
        if (!this.userListInterface) return;

        const stats = this.userListInterface.getUserStatistics();
        const userCountElement = this.container.querySelector('.chat-user-count');

        if (userCountElement) {
            userCountElement.textContent = `${stats.onlineUsers}/${stats.totalUsers}`;
        }
    }

    /**
     * Handle notification click
     */
    handleNotificationClick(notification) {
        // Handle different notification types
        switch (notification.type) {
            case 'message':
            case 'mention':
                // Scroll to message if it exists
                if (notification.data.messageId) {
                    this.scrollToMessage(notification.data.messageId);
                }
                break;

            case 'private':
                // Open private message interface
                if (this.privateMessageInterface && notification.data.userId) {
                    this.privateMessageInterface.startConversation(notification.data.userId);
                }
                break;

            case 'join':
            case 'leave':
                // Highlight user in user list
                if (this.userListInterface && notification.data.userId) {
                    this.highlightUser(notification.data.userId);
                }
                break;
        }

        // Focus chat input
        const chatInput = this.container.querySelector('#chat-input');
        if (chatInput) {
            chatInput.focus();
        }
    }

    /**
     * Handle sound play
     */
    handleSoundPlay(soundType) {
        // Log sound play for debugging
        console.log('Sound played:', soundType);

        // Could add visual feedback here
        this.showSoundFeedback(soundType);
    }

    /**
     * Show sound feedback
     */
    showSoundFeedback(soundType) {
        // Add visual feedback when sound is played
        const soundToggle = this.container.querySelector('#sound-toggle');
        if (soundToggle) {
            soundToggle.style.animation = 'pulse 0.3s ease';
            setTimeout(() => {
                soundToggle.style.animation = '';
            }, 300);
        }
    }

    /**
     * Scroll to message
     */
    scrollToMessage(messageId) {
        const messageElement = this.container.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Highlight message briefly
            messageElement.classList.add('highlighted');
            setTimeout(() => {
                messageElement.classList.remove('highlighted');
            }, 2000);
        }
    }

    /**
     * Highlight user
     */
    highlightUser(userId) {
        const userElement = this.container.querySelector(`[data-user-id="${userId}"]`);
        if (userElement) {
            userElement.classList.add('highlighted');
            setTimeout(() => {
                userElement.classList.remove('highlighted');
            }, 2000);
        }
    }

    /**
     * Handle search result
     */
    handleSearchResult(results, query) {
        console.log(`Search completed: "${query}" found ${results.length} results`);

        // Update search button state if it exists
        const searchButton = this.container.querySelector('#search-toggle-btn');
        if (searchButton) {
            if (results.length > 0) {
                searchButton.classList.add('has-results');
                searchButton.title = `${results.length} search results`;
            } else {
                searchButton.classList.remove('has-results');
                searchButton.title = 'Search messages';
            }
        }

        // Show notification for search results
        if (this.notificationInterface && query) {
            const message = results.length === 0
                ? `No results found for "${query}"`
                : `Found ${results.length} result${results.length === 1 ? '' : 's'} for "${query}"`;

            this.notificationInterface.showNotification(
                'Search Results',
                message,
                results.length === 0 ? 'warning' : 'info',
                { timeout: 3000 }
            );
        }
    }

    /**
     * Handle search navigation
     */
    handleSearchNavigation(result, index) {
        console.log(`Navigated to search result ${index + 1}:`, result);

        // Additional highlighting or effects can be added here
        if (result.element) {
            // Add a temporary glow effect
            result.element.style.boxShadow = '0 0 10px rgba(255, 0, 0, 0.5)';
            setTimeout(() => {
                result.element.style.boxShadow = '';
            }, 1000);
        }
    }

    /**
     * Toggle search interface
     */
    toggleSearch() {
        if (this.searchInterface) {
            if (this.searchInterface.isSearchActive) {
                this.searchInterface.closeSearch();
            } else {
                this.searchInterface.openSearch();
            }
        }
    }

    /**
     * Handle settings change
     */
    handleSettingsChange(key, value, allSettings) {
        console.log(`Setting changed: ${key} = ${value}`);

        // Update local settings
        this.settings[key] = value;

        // Apply specific setting changes immediately
        switch (key) {
            case 'autoScroll':
                // Update auto-scroll behavior
                break;

            case 'enterToSend':
                // Update enter key behavior
                this.updateEnterKeyBehavior(value);
                break;

            case 'showTimestamps':
                // Update timestamp display
                this.updateTimestampDisplay(value);
                break;

            case 'showAvatars':
                // Update avatar display
                this.updateAvatarDisplay(value);
                break;

            case 'soundEnabled':
                // Update sound settings
                if (this.notificationInterface) {
                    this.notificationInterface.updateNotificationSetting('soundEnabled', value);
                }
                break;

            case 'desktopNotifications':
                // Update notification settings
                if (this.notificationInterface) {
                    this.notificationInterface.updateNotificationSetting('desktopNotificationsEnabled', value);
                }
                break;
        }
    }

    /**
     * Handle theme change
     */
    handleThemeChange(theme, themeData) {
        console.log(`Theme changed to: ${theme}`, themeData);

        // Update container classes
        this.container.classList.remove('dark-theme', 'light-theme');
        this.container.classList.add(`${theme}-theme`);

        // Update settings
        this.settings.theme = theme;
    }

    /**
     * Handle layout change
     */
    handleLayoutChange(settings) {
        console.log('Layout changed:', settings);

        // Update all settings
        this.settings = { ...this.settings, ...settings };

        // Apply layout changes
        this.applyLayoutSettings(settings);
    }

    /**
     * Apply layout settings
     */
    applyLayoutSettings(settings) {
        // Apply message layout
        if (settings.messageLayout) {
            this.container.classList.remove('layout-standard', 'layout-compact', 'layout-bubbles');
            this.container.classList.add(`layout-${settings.messageLayout}`);
        }

        // Apply avatar style
        if (settings.avatarStyle) {
            this.container.classList.remove('avatar-circle', 'avatar-square', 'avatar-rounded', 'avatar-hidden');
            this.container.classList.add(`avatar-${settings.avatarStyle}`);
        }

        // Apply message spacing
        if (settings.messageSpacing) {
            this.container.classList.remove('spacing-compact', 'spacing-normal', 'spacing-relaxed');
            this.container.classList.add(`spacing-${settings.messageSpacing}`);
        }
    }

    /**
     * Update enter key behavior
     */
    updateEnterKeyBehavior(enterToSend) {
        // This will be handled in the keydown event listener
        this.settings.enterToSend = enterToSend;
    }

    /**
     * Update timestamp display
     */
    updateTimestampDisplay(showTimestamps) {
        const timestamps = this.container.querySelectorAll('.message-timestamp');
        timestamps.forEach(timestamp => {
            timestamp.style.display = showTimestamps ? 'block' : 'none';
        });
    }

    /**
     * Update avatar display
     */
    updateAvatarDisplay(showAvatars) {
        const avatars = this.container.querySelectorAll('.message-avatar');
        avatars.forEach(avatar => {
            avatar.style.display = showAvatars ? 'block' : 'none';
        });
    }

    /**
     * Toggle customization panel
     */
    toggleCustomization() {
        if (this.customizationInterface) {
            this.customizationInterface.openCustomization();
        }
    }

    /**
     * Handle orientation change
     */
    handleOrientationChange(isLandscape) {
        console.log(`Orientation changed to: ${isLandscape ? 'landscape' : 'portrait'}`);

        // Update container classes
        this.container.classList.remove('landscape-mode', 'portrait-mode');
        this.container.classList.add(isLandscape ? 'landscape-mode' : 'portrait-mode');

        // Adjust layout for orientation
        this.adjustLayoutForOrientation(isLandscape);

        // Update settings
        this.settings.isLandscape = isLandscape;
    }

    /**
     * Handle viewport change
     */
    handleViewportChange(viewport) {
        console.log('Viewport changed:', viewport);

        // Update container classes based on device type
        this.container.classList.remove('mobile-device', 'tablet-device', 'desktop-device');

        if (viewport.isMobile) {
            this.container.classList.add('mobile-device');
        } else if (viewport.isTablet) {
            this.container.classList.add('tablet-device');
        } else {
            this.container.classList.add('desktop-device');
        }

        // Adjust layout for viewport
        this.adjustLayoutForViewport(viewport);

        // Update settings
        this.settings.viewport = viewport;
    }

    /**
     * Handle touch interaction
     */
    handleTouchInteraction(type, event) {
        console.log(`Touch interaction: ${type}`);

        // Add touch feedback
        if (this.settings.touchFeedback && type === 'touchstart') {
            const target = event.target.closest('.message-item, .user-item, button');
            if (target) {
                target.classList.add('touch-active');
                setTimeout(() => {
                    target.classList.remove('touch-active');
                }, 150);
            }
        }

        // Handle specific touch interactions
        switch (type) {
            case 'touchstart':
                this.handleTouchStart(event);
                break;
            case 'touchmove':
                this.handleTouchMove(event);
                break;
            case 'touchend':
                this.handleTouchEnd(event);
                break;
        }
    }

    /**
     * Handle touch start
     */
    handleTouchStart(event) {
        // Store touch start information for gesture detection
        this.touchStartTime = Date.now();
        this.touchStartTarget = event.target;
    }

    /**
     * Handle touch move
     */
    handleTouchMove(event) {
        // Handle touch move events
    }

    /**
     * Handle touch end
     */
    handleTouchEnd(event) {
        // Handle touch end events
        const touchDuration = Date.now() - (this.touchStartTime || 0);

        // Quick tap detection
        if (touchDuration < 200 && this.touchStartTarget === event.target) {
            this.handleQuickTap(event);
        }
    }

    /**
     * Handle quick tap
     */
    handleQuickTap(event) {
        const target = event.target.closest('.message-item');
        if (target && this.settings.tapToExpand) {
            this.toggleMessageExpansion(target);
        }
    }

    /**
     * Adjust layout for orientation
     */
    adjustLayoutForOrientation(isLandscape) {
        if (isLandscape) {
            // Landscape optimizations
            this.container.style.setProperty('--mobile-header-height', '50px');
            this.container.style.setProperty('--mobile-toolbar-height', '40px');
        } else {
            // Portrait optimizations
            this.container.style.setProperty('--mobile-header-height', '60px');
            this.container.style.setProperty('--mobile-toolbar-height', '50px');
        }

        // Adjust sidebar behavior
        const sidebar = this.container.querySelector('.chat-sidebar');
        if (sidebar) {
            if (isLandscape && window.innerWidth > 768) {
                sidebar.classList.add('landscape-sidebar');
            } else {
                sidebar.classList.remove('landscape-sidebar');
            }
        }
    }

    /**
     * Adjust layout for viewport
     */
    adjustLayoutForViewport(viewport) {
        // Adjust font sizes based on viewport
        if (viewport.isMobile) {
            this.container.style.fontSize = '14px';
        } else if (viewport.isTablet) {
            this.container.style.fontSize = '15px';
        } else {
            this.container.style.fontSize = '16px';
        }

        // Adjust spacing
        const spacing = viewport.isMobile ? '8px' : viewport.isTablet ? '12px' : '16px';
        this.container.style.setProperty('--mobile-padding', spacing);
    }

    /**
     * Toggle message expansion
     */
    toggleMessageExpansion(messageElement) {
        messageElement.classList.toggle('expanded');

        // Scroll to message if expanded
        if (messageElement.classList.contains('expanded')) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    
    /**
     * Cancel reply
     */
    cancelReply() {
        this.replyToMessage = null;
        this.elements.replyBar.style.display = 'none';
    }
    
    /**
     * Apply formatting to input
     */
    applyFormatting(format) {
        const input = this.elements.chatInput;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const selectedText = input.value.substring(start, end);
        
        let formattedText = '';
        
        switch (format) {
            case 'bold':
                formattedText = `**${selectedText}**`;
                break;
            case 'italic':
                formattedText = `*${selectedText}*`;
                break;
            case 'underline':
                formattedText = `__${selectedText}__`;
                break;
            case 'strikethrough':
                formattedText = `~~${selectedText}~~`;
                break;
            case 'code':
                formattedText = `\`${selectedText}\``;
                break;
            case 'quote':
                formattedText = `> ${selectedText}`;
                break;
        }
        
        input.value = input.value.substring(0, start) + formattedText + input.value.substring(end);
        input.focus();
        input.setSelectionRange(start + formattedText.length, start + formattedText.length);
        
        this.handleInputChange({ target: input });
    }
    
    /**
     * Handle scroll events
     */
    handleScroll() {
        const isAtBottom = this.isAtBottom();
        this.elements.scrollBottomBtn.style.display = isAtBottom ? 'none' : 'block';
        
        if (isAtBottom) {
            this.markAsRead();
        }
    }
    
    /**
     * Check if user is at bottom of messages
     */
    isAtBottom() {
        const messagesList = this.elements.messagesList;
        return messagesList.scrollTop + messagesList.clientHeight >= messagesList.scrollHeight - 10;
    }
    
    /**
     * Scroll to bottom
     */
    scrollToBottom() {
        this.elements.messagesList.scrollTop = this.elements.messagesList.scrollHeight;
        this.markAsRead();
    }
    
    /**
     * Update unread count
     */
    updateUnreadCount() {
        this.unreadCount++;
        this.elements.unreadBadge.textContent = this.unreadCount;
        this.elements.unreadBadge.style.display = this.unreadCount > 0 ? 'block' : 'none';
    }
    
    /**
     * Mark messages as read
     */
    markAsRead() {
        this.unreadCount = 0;
        this.lastReadTimestamp = Date.now();
        this.elements.unreadBadge.style.display = 'none';
    }
    
    /**
     * Send typing indicator
     */
    sendTypingIndicator() {
        if (!this.websocket) return;
        
        // Throttle typing indicators
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }
        
        this.websocket.send(JSON.stringify({
            type: 'typing_start',
            room_id: this.roomId
        }));
        
        this.typingTimeout = setTimeout(() => {
            this.websocket.send(JSON.stringify({
                type: 'typing_stop',
                room_id: this.roomId
            }));
        }, 3000);
    }
    
    /**
     * Handle search
     */
    handleSearch(query) {
        const resultsContainer = this.container.querySelector('#search-results');
        
        if (!query.trim()) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>Enter a search term to find messages</p>
                </div>
            `;
            return;
        }
        
        const results = this.searchMessages(query);
        
        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>No messages found for "${query}"</p>
                </div>
            `;
            return;
        }
        
        resultsContainer.innerHTML = results.map(message => `
            <div class="search-result" onclick="modernChat.scrollToMessage('${message.id}')">
                <div class="result-author">${message.user_name}</div>
                <div class="result-text">${this.highlightSearchTerm(message.message, query)}</div>
                <div class="result-time">${this.formatTime(message.timestamp)}</div>
            </div>
        `).join('');
    }
    
    /**
     * Search messages
     */
    searchMessages(query) {
        const searchUserMessages = this.container.querySelector('#search-user-messages').checked;
        const searchAllMessages = this.container.querySelector('#search-all-messages').checked;
        
        return this.messages.filter(message => {
            const matchesQuery = message.message.toLowerCase().includes(query.toLowerCase());
            const matchesFilter = (searchAllMessages) || 
                                 (searchUserMessages && message.user_id === this.currentUserId);
            
            return matchesQuery && matchesFilter;
        });
    }
    
    /**
     * Highlight search term in text
     */
    highlightSearchTerm(text, term) {
        const regex = new RegExp(`(${term})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }
    
    /**
     * Scroll to specific message
     */
    scrollToMessage(messageId) {
        const messageElement = this.container.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            messageElement.classList.add('highlighted');
            setTimeout(() => {
                messageElement.classList.remove('highlighted');
            }, 2000);
        }
        
        // Close search panel
        this.togglePanel('search');
    }
    
    /**
     * Play notification sound
     */
    playNotificationSound() {
        // Create audio element for notification sound
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore errors if audio can't play
    }
    
    /**
     * Show desktop notification
     */
    showDesktopNotification(message) {
        if (!('Notification' in window)) return;
        
        if (Notification.permission === 'granted') {
            new Notification(`${message.user_name} in Live Chat`, {
                body: message.message.substring(0, 100),
                icon: '/favicon.ico',
                tag: 'chat-message'
            });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    this.showDesktopNotification(message);
                }
            });
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
        switch (data.type) {
            case 'chat_message':
                this.addMessage(data);
                break;
                
            case 'user_joined':
                this.addUser(data.user);
                break;
                
            case 'user_left':
                this.removeUser(data.user_id);
                break;
                
            case 'typing_start':
                this.addTypingUser(data.user_name);
                break;
                
            case 'typing_stop':
                this.removeTypingUser(data.user_name);
                break;
                
            case 'user_list':
                this.updateUserList(data.users);
                break;

            case 'thread_reply':
                if (this.threadingInterface) {
                    this.threadingInterface.addReplyToThread(data.thread_id, data);
                }
                break;

            case 'thread_created':
                if (this.threadingInterface) {
                    this.threadingInterface.handleThreadCreated(data);
                }
                break;

            case 'thread_updated':
                if (this.threadingInterface) {
                    this.threadingInterface.handleThreadUpdated(data);
                }
                break;

            case 'typing_start':
                if (this.typingInterface) {
                    this.typingInterface.handleTypingStart(data);
                }
                break;

            case 'typing_stop':
                if (this.typingInterface) {
                    this.typingInterface.handleTypingStop(data);
                }
                break;

            case 'user_joined':
                if (this.userListInterface) {
                    this.userListInterface.addUser(data.user || data);
                }
                break;

            case 'user_left':
                if (this.userListInterface) {
                    this.userListInterface.removeUser(data.user_id || data.id);
                }
                break;

            case 'user_status_update':
                if (this.userListInterface) {
                    this.userListInterface.updateUserStatus(data.user_id, data.status, data);
                }
                break;

            case 'user_list':
                if (this.userListInterface) {
                    this.userListInterface.handleUserListUpdate(data.users || data);
                }
                break;

            case 'presence_update':
                if (this.userListInterface) {
                    this.userListInterface.handlePresenceUpdate(data);
                }
                break;

            // Notification interface will handle these automatically via its own WebSocket listener
            // but we can add additional logic here if needed
        }
    }
    
    /**
     * Add user to list
     */
    addUser(user) {
        this.users.set(user.id, user);
        this.updateUserCount();
        this.renderUserList();
    }
    
    /**
     * Remove user from list
     */
    removeUser(userId) {
        this.users.delete(userId);
        this.updateUserCount();
        this.renderUserList();
    }
    
    /**
     * Update user list
     */
    updateUserList(users) {
        this.users.clear();
        users.forEach(user => this.users.set(user.id, user));
        this.updateUserCount();
        this.renderUserList();
    }
    
    /**
     * Update user count display
     */
    updateUserCount() {
        const count = this.users.size;
        this.elements.userCount.textContent = `${count} user${count !== 1 ? 's' : ''}`;
    }
    
    /**
     * Render user list
     */
    renderUserList() {
        const usersList = this.elements.usersList;
        
        if (this.users.size === 0) {
            usersList.innerHTML = `
                <div class="user-item">
                    <div class="user-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="user-info">
                        <div class="user-name">No users online</div>
                        <div class="user-status">Waiting for participants...</div>
                    </div>
                </div>
            `;
            return;
        }
        
        const usersArray = Array.from(this.users.values()).sort((a, b) => {
            const roleOrder = { admin: 0, moderator: 1, host: 2, participant: 3, guest: 4 };
            return roleOrder[a.role] - roleOrder[b.role];
        });
        
        usersList.innerHTML = usersArray.map(user => `
            <div class="user-item ${user.id === this.currentUserId ? 'current-user' : ''}">
                <div class="user-avatar">
                    <i class="fas fa-user"></i>
                    <div class="user-status-indicator online"></div>
                </div>
                <div class="user-info">
                    <div class="user-name">${user.name}</div>
                    <div class="user-status">
                        <span class="user-role ${user.role}">${user.role}</span>
                        <span class="user-online-status">Online</span>
                    </div>
                </div>
                <div class="user-actions">
                    ${user.id !== this.currentUserId ? `
                    <button class="user-action-btn" onclick="modernChat.startPrivateMessage('${user.id}')" title="Private Message">
                        <i class="fas fa-envelope"></i>
                    </button>
                    ` : ''}
                    ${this.canModerate() && user.id !== this.currentUserId ? `
                    <button class="user-action-btn" onclick="modernChat.moderateUser('${user.id}')" title="Moderate">
                        <i class="fas fa-shield-alt"></i>
                    </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }
    
    /**
     * Add typing user
     */
    addTypingUser(userName) {
        this.typingUsers.add(userName);
        this.updateTypingIndicators();
    }
    
    /**
     * Remove typing user
     */
    removeTypingUser(userName) {
        this.typingUsers.delete(userName);
        this.updateTypingIndicators();
    }
    
    /**
     * Update typing indicators
     */
    updateTypingIndicators() {
        const typingArray = Array.from(this.typingUsers);
        
        if (typingArray.length === 0) {
            this.elements.typingIndicators.style.display = 'none';
            return;
        }
        
        let text = '';
        if (typingArray.length === 1) {
            text = `${typingArray[0]} is typing...`;
        } else if (typingArray.length === 2) {
            text = `${typingArray[0]} and ${typingArray[1]} are typing...`;
        } else {
            text = `${typingArray[0]} and ${typingArray.length - 1} others are typing...`;
        }
        
        this.elements.typingIndicators.innerHTML = `
            <div class="typing-indicator">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <span class="typing-text">${text}</span>
            </div>
        `;
        this.elements.typingIndicators.style.display = 'block';
    }
    
    /**
     * Start private message with user
     */
    startPrivateMessage(userId) {
        if (this.privateMessageInterface) {
            this.privateMessageInterface.startConversation(userId);
            this.toggleFeaturePanel('private-msg');
        }
    }
    
    /**
     * Moderate user
     */
    moderateUser(userId) {
        if (this.moderationInterface) {
            this.moderationInterface.openUserModerationPanel(userId);
            this.toggleFeaturePanel('moderation');
        }
    }
    
    /**
     * Moderate message
     */
    moderateMessage(messageId) {
        if (this.moderationInterface) {
            this.moderationInterface.openMessageModerationPanel(messageId);
            this.toggleFeaturePanel('moderation');
        }
    }
    
    /**
     * Load chat history
     */
    loadChatHistory() {
        if (!this.websocket) return;
        
        this.websocket.send(JSON.stringify({
            type: 'get_chat_history',
            room_id: this.roomId,
            limit: 50
        }));
    }
    
    /**
     * Set WebSocket connection
     */
    setWebSocket(websocket) {
        this.websocket = websocket;
        if (websocket) {
            this.attachWebSocketListeners();
            this.loadChatHistory();
        }

        // Update threading interface
        if (this.threadingInterface) {
            this.threadingInterface.setWebSocket(websocket);
        }

        // Update typing interface
        if (this.typingInterface) {
            this.typingInterface.setWebSocket(websocket);
        }

        // Update user list interface
        if (this.userListInterface) {
            this.userListInterface.setWebSocket(websocket);
        }

        // Update notification interface
        if (this.notificationInterface) {
            this.notificationInterface.setWebSocket(websocket);
        }

        // Update search interface
        if (this.searchInterface) {
            this.searchInterface.setWebSocket(websocket);
        }

        // Update customization interface
        if (this.customizationInterface) {
            this.customizationInterface.setWebSocket(websocket);
        }

        // Update mobile interface
        if (this.mobileInterface) {
            this.mobileInterface.setWebSocket(websocket);
        }
    }
    
    /**
     * Set user info
     */
    setUserInfo(userId, userRole) {
        this.currentUserId = userId;
        this.currentUserRole = userRole;

        // Update interface based on role
        this.updateRoleBasedFeatures();

        // Update threading interface
        if (this.threadingInterface) {
            this.threadingInterface.setUserInfo(userId, userRole);
        }

        // Update typing interface
        if (this.typingInterface) {
            this.typingInterface.setUserInfo(userId, userRole);
        }

        // Update user list interface
        if (this.userListInterface) {
            this.userListInterface.setUserInfo(userId, userRole);
        }

        // Update notification interface
        if (this.notificationInterface) {
            this.notificationInterface.setUserInfo(userId, userRole);
        }

        // Update search interface
        if (this.searchInterface) {
            this.searchInterface.setUserInfo(userId, userRole);
        }

        // Update customization interface
        if (this.customizationInterface) {
            this.customizationInterface.setUserInfo(userId, userRole);
        }

        // Update mobile interface
        if (this.mobileInterface) {
            this.mobileInterface.setUserInfo(userId, userRole);
        }
    }
    
    /**
     * Update role-based features
     */
    updateRoleBasedFeatures() {
        // Show/hide moderation button
        const moderationBtn = this.container.querySelector('#moderation-btn');
        if (moderationBtn) {
            moderationBtn.style.display = this.canModerate() ? 'block' : 'none';
        }
        
        // Show/hide export button
        const exportBtn = this.container.querySelector('#export-btn');
        if (exportBtn) {
            exportBtn.style.display = this.canExport() ? 'block' : 'none';
        }
    }
    
    /**
     * Destroy the interface
     */
    destroy() {
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }
        
        this.messages = [];
        this.users.clear();
        this.typingUsers.clear();
        
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// CSS Styles for Modern Chat Interface
const modernChatStyles = `
<style>
/* Modern Chat Interface Styles */
.modern-chat-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-dark, #1a1a1a);
    border: 1px solid var(--border-color, #444);
    border-radius: 12px;
    overflow: hidden;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    position: relative;
}

/* Theme Variables */
.modern-chat-container.dark-theme {
    --chat-bg: #1a1a1a;
    --chat-card: #2a2a2a;
    --chat-input: #3a3a3a;
    --chat-border: #444444;
    --chat-text: #ffffff;
    --chat-text-muted: #cccccc;
    --chat-primary: #FF0000;
    --chat-success: #28a745;
    --chat-warning: #ffc107;
    --chat-danger: #dc3545;
    --chat-info: #17a2b8;
}

.modern-chat-container.light-theme {
    --chat-bg: #ffffff;
    --chat-card: #f8f9fa;
    --chat-input: #ffffff;
    --chat-border: #dee2e6;
    --chat-text: #212529;
    --chat-text-muted: #6c757d;
    --chat-primary: #FF0000;
    --chat-success: #28a745;
    --chat-warning: #ffc107;
    --chat-danger: #dc3545;
    --chat-info: #17a2b8;
}

/* Font Sizes */
.modern-chat-container.font-small {
    font-size: 12px;
}

.modern-chat-container.font-medium {
    font-size: 14px;
}

.modern-chat-container.font-large {
    font-size: 16px;
}

/* Compact Mode */
.modern-chat-container.compact .message {
    padding: 0.25rem 0.75rem;
}

.modern-chat-container.compact .message-avatar {
    width: 24px;
    height: 24px;
}

.modern-chat-container.compact .chat-header {
    padding: 0.5rem 1rem;
}

/* Minimized State */
.modern-chat-container.minimized {
    height: 60px;
}

.modern-chat-container.minimized .chat-body,
.modern-chat-container.minimized .reply-bar,
.modern-chat-container.minimized .chat-input-container,
.modern-chat-container.minimized .feature-panels {
    display: none;
}

/* Chat Header */
.chat-header {
    background: var(--chat-card);
    border-bottom: 1px solid var(--chat-border);
    padding: 1rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
}

.chat-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: var(--chat-text);
    font-weight: 600;
}

.chat-title i {
    color: var(--chat-primary);
    font-size: 1.2rem;
}

.user-count {
    background: var(--chat-input);
    color: var(--chat-text-muted);
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 500;
}

.chat-controls {
    display: flex;
    gap: 0.5rem;
}

.chat-btn {
    background: transparent;
    border: 1px solid var(--chat-border);
    color: var(--chat-text-muted);
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
}

.chat-btn:hover {
    background: var(--chat-input);
    color: var(--chat-text);
    border-color: var(--chat-primary);
}

/* Chat Body */
.chat-body {
    display: flex;
    flex: 1;
    min-height: 0;
}

.messages-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
}

.messages-list {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    scroll-behavior: smooth;
}

.messages-list::-webkit-scrollbar {
    width: 6px;
}

.messages-list::-webkit-scrollbar-track {
    background: var(--chat-bg);
}

.messages-list::-webkit-scrollbar-thumb {
    background: var(--chat-border);
    border-radius: 3px;
}

.messages-list::-webkit-scrollbar-thumb:hover {
    background: var(--chat-text-muted);
}

/* Welcome Message */
.welcome-message {
    text-align: center;
    padding: 3rem 2rem;
    color: var(--chat-text-muted);
}

.welcome-message i {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
}

.welcome-message h4 {
    color: var(--chat-text);
    margin-bottom: 0.5rem;
}

/* Messages */
.message {
    display: flex;
    gap: 0.75rem;
    padding: 0.5rem 0;
    margin-bottom: 0.5rem;
    border-radius: 8px;
    transition: background 0.2s ease;
    position: relative;
}

.message:hover {
    background: rgba(255, 255, 255, 0.02);
}

.message.highlighted {
    background: rgba(255, 0, 0, 0.1);
    border: 1px solid var(--chat-primary);
}

.message.own-message {
    flex-direction: row-reverse;
}

.message.own-message .message-content {
    text-align: right;
}

.message.own-message .message-text {
    background: var(--chat-primary);
    color: white;
}

.message-avatar {
    width: 32px;
    height: 32px;
    background: var(--chat-input);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--chat-text-muted);
    flex-shrink: 0;
}

.modern-chat-container.hide-avatars .message-avatar {
    display: none;
}

.message-content {
    flex: 1;
    min-width: 0;
}

.message-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
}

.message-author {
    font-weight: 600;
    color: var(--chat-text);
}

.user-role {
    font-size: 0.7rem;
    padding: 0.1rem 0.4rem;
    border-radius: 10px;
    text-transform: uppercase;
    font-weight: 500;
}

.user-role.admin {
    background: var(--chat-danger);
    color: white;
}

.user-role.moderator {
    background: var(--chat-warning);
    color: black;
}

.user-role.host {
    background: var(--chat-info);
    color: white;
}

.user-role.participant {
    background: var(--chat-success);
    color: white;
}

.user-role.guest {
    background: var(--chat-border);
    color: var(--chat-text-muted);
}

.message-time {
    font-size: 0.75rem;
    color: var(--chat-text-muted);
}

.modern-chat-container.hide-timestamps .message-time {
    display: none;
}

.reply-info {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8rem;
    color: var(--chat-text-muted);
    margin-bottom: 0.25rem;
}

.reply-info i {
    color: var(--chat-primary);
}

.message-text {
    background: var(--chat-input);
    color: var(--chat-text);
    padding: 0.5rem 0.75rem;
    border-radius: 12px;
    line-height: 1.4;
    word-wrap: break-word;
    display: inline-block;
    max-width: 80%;
}

.message-text code {
    background: rgba(0, 0, 0, 0.2);
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
}

.message-text mark {
    background: var(--chat-warning);
    color: black;
    padding: 0.1rem 0.2rem;
    border-radius: 2px;
}

.message-actions {
    display: flex;
    gap: 0.25rem;
    margin-top: 0.25rem;
    opacity: 0;
    transition: opacity 0.2s ease;
}

.message:hover .message-actions {
    opacity: 1;
}

.message-action-btn {
    background: transparent;
    border: 1px solid var(--chat-border);
    color: var(--chat-text-muted);
    width: 24px;
    height: 24px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.7rem;
    transition: all 0.2s ease;
}

.message-action-btn:hover {
    background: var(--chat-input);
    color: var(--chat-text);
}

/* Typing Indicators */
.typing-indicators {
    padding: 0.5rem 1rem;
    border-top: 1px solid var(--chat-border);
}

.typing-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--chat-text-muted);
    font-size: 0.8rem;
}

.typing-dots {
    display: flex;
    gap: 0.2rem;
}

.typing-dots span {
    width: 4px;
    height: 4px;
    background: var(--chat-text-muted);
    border-radius: 50%;
    animation: typing 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(1) {
    animation-delay: -0.32s;
}

.typing-dots span:nth-child(2) {
    animation-delay: -0.16s;
}

@keyframes typing {
    0%, 80%, 100% {
        transform: scale(0.8);
        opacity: 0.5;
    }
    40% {
        transform: scale(1);
        opacity: 1;
    }
}

/* Scroll to Bottom Button */
.scroll-bottom-btn {
    position: absolute;
    bottom: 1rem;
    right: 1rem;
    background: var(--chat-primary);
    border: none;
    color: white;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease;
    z-index: 10;
}

.scroll-bottom-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.unread-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background: var(--chat-danger);
    color: white;
    font-size: 0.7rem;
    padding: 0.2rem 0.4rem;
    border-radius: 10px;
    min-width: 18px;
    text-align: center;
    font-weight: 500;
}

/* Sidebar */
.chat-sidebar {
    width: 300px;
    background: var(--chat-card);
    border-left: 1px solid var(--chat-border);
    flex-shrink: 0;
}

.sidebar-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.panel-header {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--chat-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--chat-input);
}

.panel-header h4 {
    margin: 0;
    color: var(--chat-text);
    font-size: 1rem;
}

.close-panel-btn {
    background: transparent;
    border: none;
    color: var(--chat-text-muted);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    transition: all 0.2s ease;
}

.close-panel-btn:hover {
    background: var(--chat-border);
    color: var(--chat-text);
}

.panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
}

/* Users List */
.users-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.user-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--chat-input);
    border-radius: 8px;
    border: 1px solid var(--chat-border);
    transition: all 0.2s ease;
}

.user-item:hover {
    background: var(--chat-bg);
    border-color: var(--chat-primary);
}

.user-item.current-user {
    border-color: var(--chat-primary);
    background: rgba(255, 0, 0, 0.1);
}

.user-item .user-avatar {
    position: relative;
}

.user-status-indicator {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid var(--chat-card);
}

.user-status-indicator.online {
    background: var(--chat-success);
}

.user-status-indicator.offline {
    background: var(--chat-text-muted);
}

.user-info {
    flex: 1;
    min-width: 0;
}

.user-name {
    font-weight: 600;
    color: var(--chat-text);
    margin-bottom: 0.25rem;
}

.user-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
}

.user-online-status {
    color: var(--chat-text-muted);
}

.user-actions {
    display: flex;
    gap: 0.25rem;
}

.user-action-btn {
    background: transparent;
    border: 1px solid var(--chat-border);
    color: var(--chat-text-muted);
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.8rem;
    transition: all 0.2s ease;
}

.user-action-btn:hover {
    background: var(--chat-primary);
    color: white;
    border-color: var(--chat-primary);
}

/* Search */
.search-form {
    margin-bottom: 1rem;
}

.search-input {
    width: 100%;
    background: var(--chat-input);
    border: 1px solid var(--chat-border);
    color: var(--chat-text);
    padding: 0.75rem;
    border-radius: 8px;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
}

.search-input:focus {
    outline: none;
    border-color: var(--chat-primary);
}

.search-filters {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.filter-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--chat-text);
    cursor: pointer;
    font-size: 0.9rem;
}

.filter-option input[type="checkbox"] {
    accent-color: var(--chat-primary);
}

.search-results {
    max-height: 300px;
    overflow-y: auto;
}

.search-result {
    padding: 0.75rem;
    background: var(--chat-input);
    border-radius: 8px;
    margin-bottom: 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
}

.search-result:hover {
    background: var(--chat-bg);
    border: 1px solid var(--chat-primary);
}

.result-author {
    font-weight: 600;
    color: var(--chat-text);
    margin-bottom: 0.25rem;
}

.result-text {
    color: var(--chat-text-muted);
    margin-bottom: 0.25rem;
    line-height: 1.4;
}

.result-time {
    font-size: 0.8rem;
    color: var(--chat-text-muted);
}

.no-results {
    text-align: center;
    padding: 2rem;
    color: var(--chat-text-muted);
}

.no-results i {
    font-size: 2rem;
    margin-bottom: 1rem;
    opacity: 0.5;
}

/* Settings */
.settings-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.setting-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.setting-group label {
    color: var(--chat-text);
    font-weight: 500;
    font-size: 0.9rem;
}

.setting-control {
    background: var(--chat-input);
    border: 1px solid var(--chat-border);
    color: var(--chat-text);
    padding: 0.5rem;
    border-radius: 6px;
    font-size: 0.9rem;
}

.setting-control:focus {
    outline: none;
    border-color: var(--chat-primary);
}

.setting-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
}

.setting-checkbox input[type="checkbox"] {
    accent-color: var(--chat-primary);
}

/* Reply Bar */
.reply-bar {
    background: var(--chat-card);
    border-top: 1px solid var(--chat-border);
    padding: 0.75rem 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
}

.reply-content {
    flex: 1;
    min-width: 0;
}

.reply-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--chat-text-muted);
    font-size: 0.8rem;
    margin-bottom: 0.25rem;
}

.reply-info i {
    color: var(--chat-primary);
}

.reply-message {
    color: var(--chat-text);
    font-size: 0.9rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.cancel-reply-btn {
    background: transparent;
    border: 1px solid var(--chat-border);
    color: var(--chat-text-muted);
    width: 32px;
    height: 32px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
}

.cancel-reply-btn:hover {
    background: var(--chat-danger);
    color: white;
    border-color: var(--chat-danger);
}

/* Chat Input */
.chat-input-container {
    background: var(--chat-card);
    border-top: 1px solid var(--chat-border);
    padding: 1rem;
    flex-shrink: 0;
}

.input-toolbar {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
}

.toolbar-btn {
    background: transparent;
    border: 1px solid var(--chat-border);
    color: var(--chat-text-muted);
    padding: 0.5rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    height: 36px;
}

.toolbar-btn:hover {
    background: var(--chat-input);
    color: var(--chat-text);
    border-color: var(--chat-primary);
}

.toolbar-btn.active {
    background: var(--chat-primary);
    color: white;
    border-color: var(--chat-primary);
}

.input-area {
    display: flex;
    gap: 0.75rem;
    align-items: flex-end;
}

.chat-input {
    flex: 1;
    background: var(--chat-input);
    border: 1px solid var(--chat-border);
    color: var(--chat-text);
    padding: 0.75rem;
    border-radius: 12px;
    font-size: 0.9rem;
    line-height: 1.4;
    resize: none;
    min-height: 44px;
    max-height: 120px;
    font-family: inherit;
}

.chat-input:focus {
    outline: none;
    border-color: var(--chat-primary);
}

.chat-input::placeholder {
    color: var(--chat-text-muted);
}

.send-btn {
    background: var(--chat-primary);
    border: none;
    color: white;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
    background: #cc0000;
    transform: translateY(-1px);
}

.send-btn:disabled {
    background: var(--chat-border);
    cursor: not-allowed;
    transform: none;
}

.input-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.5rem;
    font-size: 0.8rem;
    color: var(--chat-text-muted);
}

.character-count {
    color: var(--chat-text-muted);
}

.input-status {
    color: var(--chat-info);
}

/* Feature Panels */
.feature-panels {
    position: relative;
}

.feature-panel {
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    background: var(--chat-card);
    border: 1px solid var(--chat-border);
    border-bottom: none;
    border-radius: 12px 12px 0 0;
    max-height: 300px;
    overflow-y: auto;
    z-index: 100;
}

.format-buttons {
    display: flex;
    gap: 0.5rem;
    padding: 1rem;
    flex-wrap: wrap;
}

.format-btn {
    background: transparent;
    border: 1px solid var(--chat-border);
    color: var(--chat-text-muted);
    padding: 0.5rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.format-btn:hover {
    background: var(--chat-primary);
    color: white;
    border-color: var(--chat-primary);
}

/* Mobile Responsive */
@media (max-width: 768px) {
    .chat-sidebar {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        z-index: 200;
        width: 100%;
        max-width: 320px;
    }

    .input-toolbar {
        justify-content: center;
    }

    .toolbar-btn {
        min-width: 32px;
        height: 32px;
        padding: 0.4rem;
    }

    .chat-header {
        padding: 0.75rem 1rem;
    }

    .messages-list {
        padding: 0.75rem;
    }

    .message {
        padding: 0.4rem 0;
    }

    .message-avatar {
        width: 28px;
        height: 28px;
    }

    .feature-panel {
        max-height: 200px;
    }
}

@media (max-width: 480px) {
    .chat-sidebar {
        max-width: 100%;
    }

    .input-area {
        flex-direction: column;
        gap: 0.5rem;
    }

    .send-btn {
        width: 100%;
        height: 40px;
    }

    .input-toolbar {
        gap: 0.25rem;
    }

    .toolbar-btn {
        min-width: 28px;
        height: 28px;
        font-size: 0.8rem;
    }
}
</style>
`;

// Inject styles into document head
if (typeof document !== 'undefined') {
    const styleElement = document.createElement('div');
    styleElement.innerHTML = modernChatStyles;
    document.head.appendChild(styleElement.firstElementChild);
}

// Global reference for onclick handlers
let modernChat = null;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModernChatInterface;
} else if (typeof window !== 'undefined') {
    window.ModernChatInterface = ModernChatInterface;
}
