/**
 * Typing Indicator Interface
 * Advanced real-time typing indicators for chat
 */
class TypingIndicatorInterface {
    constructor(options = {}) {
        this.websocket = options.websocket || null;
        this.currentUserId = options.currentUserId || null;
        this.currentUserRole = options.currentUserRole || 'guest';
        this.roomId = options.roomId || 'default';
        this.container = options.container || null;
        this.onTypingUpdate = options.onTypingUpdate || (() => {});
        
        // Typing state
        this.typingUsers = new Map(); // userId -> typing data
        this.typingTimeouts = new Map(); // userId -> timeout ID
        this.isCurrentUserTyping = false;
        this.currentUserTypingTimeout = null;
        this.lastTypingNotification = 0;
        
        // UI elements
        this.typingIndicatorContainer = null;
        this.typingDots = null;
        this.typingText = null;
        
        // Settings
        this.settings = {
            typingTimeout: 3000, // Stop showing typing after 3 seconds
            typingThrottle: 1000, // Send typing notifications max once per second
            showTypingInUserList: true,
            showTypingDots: true,
            showTypingText: true,
            maxTypingUsers: 5, // Max users to show in typing indicator
            animateTypingDots: true,
            typingSound: false,
            ...options.settings
        };
        
        this.init();
    }
    
    /**
     * Initialize the typing indicator interface
     */
    init() {
        if (this.container) {
            this.createTypingIndicator();
        }
        
        if (this.websocket) {
            this.attachWebSocketListeners();
        }
        
        this.loadTypingSettings();
    }
    
    /**
     * Create typing indicator UI
     */
    createTypingIndicator() {
        // Find or create typing indicators container
        this.typingIndicatorContainer = this.container.querySelector('#typing-indicators');
        
        if (!this.typingIndicatorContainer) {
            this.typingIndicatorContainer = document.createElement('div');
            this.typingIndicatorContainer.id = 'typing-indicators';
            this.typingIndicatorContainer.className = 'typing-indicators';
            
            // Insert before chat input
            const chatInput = this.container.querySelector('.chat-input-container');
            if (chatInput) {
                chatInput.parentNode.insertBefore(this.typingIndicatorContainer, chatInput);
            } else {
                this.container.appendChild(this.typingIndicatorContainer);
            }
        }
        
        this.updateTypingIndicator();
    }
    
    /**
     * Update typing indicator display
     */
    updateTypingIndicator() {
        if (!this.typingIndicatorContainer) return;
        
        const typingUsersList = Array.from(this.typingUsers.values())
            .filter(user => user.userId !== this.currentUserId)
            .slice(0, this.settings.maxTypingUsers);
        
        if (typingUsersList.length === 0) {
            this.typingIndicatorContainer.style.display = 'none';
            return;
        }
        
        this.typingIndicatorContainer.style.display = 'block';
        
        // Create typing indicator content
        const typingText = this.generateTypingText(typingUsersList);
        const typingDots = this.settings.showTypingDots ? this.createTypingDots() : '';
        
        this.typingIndicatorContainer.innerHTML = `
            <div class="typing-indicator-content">
                <div class="typing-avatars">
                    ${typingUsersList.map(user => `
                        <div class="typing-avatar" title="${user.userName}">
                            <i class="fas fa-user"></i>
                            <div class="typing-pulse"></div>
                        </div>
                    `).join('')}
                </div>
                <div class="typing-message">
                    ${this.settings.showTypingText ? `<span class="typing-text">${typingText}</span>` : ''}
                    ${typingDots}
                </div>
            </div>
        `;
        
        // Trigger callback
        this.onTypingUpdate(typingUsersList);
    }
    
    /**
     * Generate typing text based on users
     */
    generateTypingText(typingUsers) {
        const count = typingUsers.length;
        
        if (count === 0) return '';
        
        if (count === 1) {
            return `${typingUsers[0].userName} is typing`;
        } else if (count === 2) {
            return `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing`;
        } else if (count === 3) {
            return `${typingUsers[0].userName}, ${typingUsers[1].userName}, and ${typingUsers[2].userName} are typing`;
        } else {
            return `${typingUsers[0].userName}, ${typingUsers[1].userName}, and ${count - 2} others are typing`;
        }
    }
    
    /**
     * Create animated typing dots
     */
    createTypingDots() {
        if (!this.settings.animateTypingDots) {
            return '<span class="typing-dots">...</span>';
        }
        
        return `
            <div class="typing-dots-animated">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        `;
    }
    
    /**
     * Start typing for current user
     */
    startTyping() {
        if (!this.websocket || this.isCurrentUserTyping) return;
        
        const now = Date.now();
        
        // Throttle typing notifications
        if (now - this.lastTypingNotification < this.settings.typingThrottle) {
            return;
        }
        
        this.isCurrentUserTyping = true;
        this.lastTypingNotification = now;
        
        // Send typing start notification
        this.sendTypingNotification('typing_start');
        
        // Set timeout to stop typing
        if (this.currentUserTypingTimeout) {
            clearTimeout(this.currentUserTypingTimeout);
        }
        
        this.currentUserTypingTimeout = setTimeout(() => {
            this.stopTyping();
        }, this.settings.typingTimeout);
        
        // Play typing sound if enabled
        if (this.settings.typingSound) {
            this.playTypingSound();
        }
    }
    
    /**
     * Stop typing for current user
     */
    stopTyping() {
        if (!this.websocket || !this.isCurrentUserTyping) return;
        
        this.isCurrentUserTyping = false;
        
        // Clear timeout
        if (this.currentUserTypingTimeout) {
            clearTimeout(this.currentUserTypingTimeout);
            this.currentUserTypingTimeout = null;
        }
        
        // Send typing stop notification
        this.sendTypingNotification('typing_stop');
    }
    
    /**
     * Send typing notification
     */
    sendTypingNotification(type) {
        if (!this.websocket) return;
        
        const typingData = {
            type: type,
            room_id: this.roomId,
            user_id: this.currentUserId,
            timestamp: Date.now()
        };
        
        this.websocket.send(JSON.stringify(typingData));
    }
    
    /**
     * Handle typing start from other user
     */
    handleTypingStart(data) {
        if (data.user_id === this.currentUserId) return;
        
        const typingData = {
            userId: data.user_id,
            userName: data.user_name || `User ${data.user_id}`,
            userRole: data.user_role || 'participant',
            startTime: Date.now(),
            lastUpdate: Date.now()
        };
        
        this.typingUsers.set(data.user_id, typingData);
        
        // Set timeout to remove typing indicator
        if (this.typingTimeouts.has(data.user_id)) {
            clearTimeout(this.typingTimeouts.get(data.user_id));
        }
        
        const timeoutId = setTimeout(() => {
            this.handleTypingStop({ user_id: data.user_id });
        }, this.settings.typingTimeout);
        
        this.typingTimeouts.set(data.user_id, timeoutId);
        
        // Update UI
        this.updateTypingIndicator();
        this.updateUserListTyping(data.user_id, true);
        
        // Play typing sound if enabled
        if (this.settings.typingSound) {
            this.playTypingSound();
        }
    }
    
    /**
     * Handle typing stop from other user
     */
    handleTypingStop(data) {
        if (data.user_id === this.currentUserId) return;
        
        // Remove from typing users
        this.typingUsers.delete(data.user_id);
        
        // Clear timeout
        if (this.typingTimeouts.has(data.user_id)) {
            clearTimeout(this.typingTimeouts.get(data.user_id));
            this.typingTimeouts.delete(data.user_id);
        }
        
        // Update UI
        this.updateTypingIndicator();
        this.updateUserListTyping(data.user_id, false);
    }
    
    /**
     * Update user list typing indicators
     */
    updateUserListTyping(userId, isTyping) {
        if (!this.settings.showTypingInUserList) return;
        
        const userElement = this.container.querySelector(`[data-user-id="${userId}"]`);
        if (!userElement) return;
        
        const typingIndicator = userElement.querySelector('.user-typing-indicator');
        
        if (isTyping) {
            if (!typingIndicator) {
                const indicator = document.createElement('div');
                indicator.className = 'user-typing-indicator';
                indicator.innerHTML = '<i class="fas fa-keyboard"></i>';
                indicator.title = 'Typing...';
                userElement.appendChild(indicator);
            }
        } else {
            if (typingIndicator) {
                typingIndicator.remove();
            }
        }
    }
    
    /**
     * Handle input events for typing detection
     */
    handleInputEvent(event) {
        const inputValue = event.target.value;
        
        if (inputValue.trim().length > 0) {
            this.startTyping();
        } else {
            this.stopTyping();
        }
    }
    
    /**
     * Handle key events for typing detection
     */
    handleKeyEvent(event) {
        // Don't trigger typing on certain keys
        const ignoredKeys = [
            'Enter', 'Tab', 'Escape', 'Shift', 'Control', 'Alt', 'Meta',
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'Home', 'End', 'PageUp', 'PageDown', 'Insert', 'Delete'
        ];
        
        if (ignoredKeys.includes(event.key)) {
            return;
        }
        
        // Handle special cases
        if (event.key === 'Enter' && !event.shiftKey) {
            // Message being sent, stop typing
            this.stopTyping();
            return;
        }
        
        if (event.key === 'Backspace' || event.key === 'Delete') {
            // Check if input is empty after deletion
            setTimeout(() => {
                const inputValue = event.target.value;
                if (inputValue.trim().length === 0) {
                    this.stopTyping();
                } else {
                    this.startTyping();
                }
            }, 10);
            return;
        }
        
        // Regular typing
        this.startTyping();
    }
    
    /**
     * Attach input listeners to chat input
     */
    attachInputListeners(inputElement) {
        if (!inputElement) return;
        
        // Remove existing listeners
        this.detachInputListeners(inputElement);
        
        // Add new listeners
        inputElement.addEventListener('input', this.handleInputEvent.bind(this));
        inputElement.addEventListener('keydown', this.handleKeyEvent.bind(this));
        inputElement.addEventListener('blur', this.stopTyping.bind(this));
        
        // Store reference for cleanup
        inputElement._typingListenersAttached = true;
    }
    
    /**
     * Detach input listeners from chat input
     */
    detachInputListeners(inputElement) {
        if (!inputElement || !inputElement._typingListenersAttached) return;
        
        inputElement.removeEventListener('input', this.handleInputEvent.bind(this));
        inputElement.removeEventListener('keydown', this.handleKeyEvent.bind(this));
        inputElement.removeEventListener('blur', this.stopTyping.bind(this));
        
        inputElement._typingListenersAttached = false;
    }
    
    /**
     * Play typing sound
     */
    playTypingSound() {
        if (!this.settings.typingSound) return;
        
        // Create audio element for typing sound
        const audio = new Audio();
        audio.volume = 0.3;
        
        // Use a subtle typing sound (you would replace this with actual sound file)
        // For demo purposes, we'll use a data URL for a simple beep
        audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
        
        audio.play().catch(() => {
            // Ignore audio play errors (user interaction required)
        });
    }
    
    /**
     * Get typing statistics
     */
    getTypingStatistics() {
        const now = Date.now();
        const activeTypingUsers = Array.from(this.typingUsers.values());
        
        return {
            totalTypingUsers: activeTypingUsers.length,
            typingUserNames: activeTypingUsers.map(user => user.userName),
            longestTypingDuration: activeTypingUsers.length > 0 ? 
                Math.max(...activeTypingUsers.map(user => now - user.startTime)) : 0,
            averageTypingDuration: activeTypingUsers.length > 0 ?
                activeTypingUsers.reduce((sum, user) => sum + (now - user.startTime), 0) / activeTypingUsers.length : 0,
            isCurrentUserTyping: this.isCurrentUserTyping
        };
    }
    
    /**
     * Update typing settings
     */
    updateTypingSetting(key, value) {
        this.settings[key] = value;
        this.saveTypingSettings();
        this.applyTypingSettings();
    }
    
    /**
     * Save typing settings
     */
    saveTypingSettings() {
        localStorage.setItem('typingIndicatorSettings', JSON.stringify(this.settings));
    }
    
    /**
     * Load typing settings
     */
    loadTypingSettings() {
        const saved = localStorage.getItem('typingIndicatorSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }
    
    /**
     * Apply typing settings
     */
    applyTypingSettings() {
        // Update UI based on settings
        this.updateTypingIndicator();
        
        // Update user list typing indicators
        if (!this.settings.showTypingInUserList) {
            const typingIndicators = this.container.querySelectorAll('.user-typing-indicator');
            typingIndicators.forEach(indicator => indicator.remove());
        }
    }
    
    /**
     * Clear all typing indicators
     */
    clearAllTyping() {
        // Clear current user typing
        this.stopTyping();
        
        // Clear all other users typing
        for (const userId of this.typingUsers.keys()) {
            this.handleTypingStop({ user_id: userId });
        }
        
        // Clear all timeouts
        for (const timeoutId of this.typingTimeouts.values()) {
            clearTimeout(timeoutId);
        }
        this.typingTimeouts.clear();
        
        // Update UI
        this.updateTypingIndicator();
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
            case 'typing_start':
                this.handleTypingStart(data);
                break;
                
            case 'typing_stop':
                this.handleTypingStop(data);
                break;
                
            case 'user_left':
                // Remove typing indicator when user leaves
                this.handleTypingStop({ user_id: data.user_id });
                break;
                
            case 'chat_message':
                // Stop typing indicator when user sends message
                this.handleTypingStop({ user_id: data.user_id });
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
        this.clearAllTyping();
    }
    
    /**
     * Destroy the interface
     */
    destroy() {
        // Clear all typing
        this.clearAllTyping();
        
        // Remove UI elements
        if (this.typingIndicatorContainer) {
            this.typingIndicatorContainer.remove();
        }
        
        // Clear data
        this.typingUsers.clear();
        this.typingTimeouts.clear();
    }
}

// CSS Styles for Typing Indicator Interface
const typingIndicatorStyles = `
<style>
/* Typing Indicators Styles */
.typing-indicators {
    padding: 0.75rem 1rem;
    background: var(--chat-bg, #1a1a1a);
    border-top: 1px solid var(--chat-border, #444);
    min-height: 0;
    transition: all 0.3s ease;
    display: none;
}

.typing-indicator-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    max-width: 100%;
}

.typing-avatars {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
}

.typing-avatar {
    position: relative;
    width: 24px;
    height: 24px;
    background: var(--chat-input, #3a3a3a);
    border: 1px solid var(--chat-border, #444);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--chat-text-muted, #cccccc);
    font-size: 0.7rem;
    overflow: hidden;
}

.typing-pulse {
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    border: 2px solid var(--chat-primary, #FF0000);
    border-radius: 50%;
    animation: typingPulse 2s infinite;
    opacity: 0.6;
}

@keyframes typingPulse {
    0% {
        transform: scale(1);
        opacity: 0.6;
    }
    50% {
        transform: scale(1.1);
        opacity: 0.3;
    }
    100% {
        transform: scale(1);
        opacity: 0.6;
    }
}

.typing-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
}

.typing-text {
    color: var(--chat-text-muted, #cccccc);
    font-size: 0.85rem;
    font-style: italic;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.typing-dots {
    color: var(--chat-text-muted, #cccccc);
    font-size: 1rem;
    font-weight: bold;
}

.typing-dots-animated {
    display: flex;
    align-items: center;
    gap: 0.2rem;
    margin-left: 0.25rem;
}

.typing-dot {
    width: 4px;
    height: 4px;
    background: var(--chat-primary, #FF0000);
    border-radius: 50%;
    animation: typingDots 1.4s infinite ease-in-out;
}

.typing-dot:nth-child(1) {
    animation-delay: -0.32s;
}

.typing-dot:nth-child(2) {
    animation-delay: -0.16s;
}

.typing-dot:nth-child(3) {
    animation-delay: 0s;
}

@keyframes typingDots {
    0%, 80%, 100% {
        transform: scale(0.8);
        opacity: 0.5;
    }
    40% {
        transform: scale(1.2);
        opacity: 1;
    }
}

/* User List Typing Indicators */
.user-typing-indicator {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 16px;
    height: 16px;
    background: var(--chat-primary, #FF0000);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 0.6rem;
    animation: typingIndicatorPulse 1.5s infinite;
    z-index: 10;
}

@keyframes typingIndicatorPulse {
    0%, 100% {
        transform: scale(1);
        opacity: 1;
    }
    50% {
        transform: scale(1.1);
        opacity: 0.8;
    }
}

/* Typing Indicator in Message Input */
.chat-input-typing {
    border-color: var(--chat-primary, #FF0000) !important;
    box-shadow: 0 0 0 2px rgba(255, 0, 0, 0.2) !important;
}

.chat-input-typing::placeholder {
    color: var(--chat-primary, #FF0000) !important;
    opacity: 0.7;
}

/* Typing Status in Chat Header */
.chat-header-typing {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--chat-primary, #FF0000);
    font-size: 0.8rem;
    font-style: italic;
    margin-left: auto;
}

.chat-header-typing i {
    animation: typingHeaderIcon 1s infinite;
}

@keyframes typingHeaderIcon {
    0%, 100% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.1);
    }
}

/* Typing Indicator Settings */
.typing-settings-panel {
    background: var(--chat-card, #2a2a2a);
    border: 1px solid var(--chat-border, #444);
    border-radius: 8px;
    padding: 1rem;
    margin-top: 1rem;
}

.typing-settings-panel h6 {
    color: var(--chat-text, #ffffff);
    margin-bottom: 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.typing-settings-panel h6 i {
    color: var(--chat-primary, #FF0000);
}

.typing-setting-group {
    margin-bottom: 0.75rem;
}

.typing-setting-group:last-child {
    margin-bottom: 0;
}

.typing-setting-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    color: var(--chat-text, #ffffff);
    font-size: 0.9rem;
}

.typing-setting-checkbox input[type="checkbox"] {
    accent-color: var(--chat-primary, #FF0000);
}

.typing-setting-range {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.typing-setting-range label {
    color: var(--chat-text, #ffffff);
    font-size: 0.9rem;
    font-weight: 500;
}

.typing-setting-range input[type="range"] {
    width: 100%;
    height: 4px;
    background: var(--chat-input, #3a3a3a);
    border-radius: 2px;
    outline: none;
    -webkit-appearance: none;
}

.typing-setting-range input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    background: var(--chat-primary, #FF0000);
    border-radius: 50%;
    cursor: pointer;
}

.typing-setting-range input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: var(--chat-primary, #FF0000);
    border-radius: 50%;
    cursor: pointer;
    border: none;
}

.typing-setting-value {
    color: var(--chat-text-muted, #cccccc);
    font-size: 0.8rem;
    text-align: right;
}

/* Typing Statistics */
.typing-stats {
    background: var(--chat-input, #3a3a3a);
    border-radius: 6px;
    padding: 0.75rem;
    margin-top: 0.75rem;
}

.typing-stats h6 {
    color: var(--chat-text, #ffffff);
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
}

.typing-stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.25rem 0;
    font-size: 0.8rem;
}

.typing-stat-label {
    color: var(--chat-text-muted, #cccccc);
}

.typing-stat-value {
    color: var(--chat-primary, #FF0000);
    font-weight: 600;
}

/* Responsive Design */
@media (max-width: 768px) {
    .typing-indicators {
        padding: 0.5rem 0.75rem;
    }

    .typing-indicator-content {
        gap: 0.5rem;
    }

    .typing-avatar {
        width: 20px;
        height: 20px;
        font-size: 0.6rem;
    }

    .typing-text {
        font-size: 0.8rem;
    }

    .typing-dots-animated {
        gap: 0.15rem;
    }

    .typing-dot {
        width: 3px;
        height: 3px;
    }

    .user-typing-indicator {
        width: 14px;
        height: 14px;
        font-size: 0.5rem;
    }

    .chat-header-typing {
        font-size: 0.7rem;
    }
}

@media (max-width: 480px) {
    .typing-indicators {
        padding: 0.4rem 0.5rem;
    }

    .typing-text {
        font-size: 0.75rem;
    }

    .typing-avatars {
        gap: 0.2rem;
    }

    .typing-avatar {
        width: 18px;
        height: 18px;
    }
}

/* Dark/Light Theme Support */
.light-theme .typing-indicators {
    background: #f8f9fa;
    border-top-color: #dee2e6;
}

.light-theme .typing-avatar {
    background: #e9ecef;
    border-color: #dee2e6;
    color: #6c757d;
}

.light-theme .typing-text {
    color: #6c757d;
}

.light-theme .typing-dots {
    color: #6c757d;
}

.light-theme .typing-dot {
    background: #007bff;
}

.light-theme .user-typing-indicator {
    background: #007bff;
}

.light-theme .chat-header-typing {
    color: #007bff;
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
    .typing-pulse {
        border-width: 3px;
    }

    .typing-dot {
        background: #ffffff;
        border: 1px solid var(--chat-primary, #FF0000);
    }

    .user-typing-indicator {
        border: 2px solid #ffffff;
    }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
    .typing-pulse,
    .typing-dot,
    .user-typing-indicator,
    .chat-header-typing i {
        animation: none;
    }

    .typing-dots-animated .typing-dot {
        opacity: 1;
        transform: scale(1);
    }
}

/* Print Styles */
@media print {
    .typing-indicators,
    .user-typing-indicator,
    .chat-header-typing {
        display: none !important;
    }
}
</style>
`;

// Inject styles into document head
if (typeof document !== 'undefined') {
    const styleElement = document.createElement('div');
    styleElement.innerHTML = typingIndicatorStyles;
    document.head.appendChild(styleElement.firstElementChild);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TypingIndicatorInterface;
} else if (typeof window !== 'undefined') {
    window.TypingIndicatorInterface = TypingIndicatorInterface;
}
