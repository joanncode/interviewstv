/**
 * Message Threading Interface
 * Advanced threading and reply system for chat messages
 */
class MessageThreadingInterface {
    constructor(options = {}) {
        this.websocket = options.websocket || null;
        this.currentUserId = options.currentUserId || null;
        this.currentUserRole = options.currentUserRole || 'guest';
        this.roomId = options.roomId || 'default';
        this.container = options.container || null;
        this.onThreadUpdate = options.onThreadUpdate || (() => {});
        this.onReplyAdded = options.onReplyAdded || (() => {});
        
        // Threading state
        this.threads = new Map(); // messageId -> thread data
        this.threadMessages = new Map(); // messageId -> array of replies
        this.activeThread = null;
        this.threadPanel = null;
        this.maxThreadDepth = 3; // Maximum nesting level
        this.threadPreviewLimit = 3; // Number of replies to show in preview
        
        // UI state
        this.isThreadPanelOpen = false;
        this.expandedThreads = new Set();
        this.threadNotifications = new Map();
        
        // Settings
        this.settings = {
            showThreadPreviews: true,
            autoExpandThreads: false,
            threadNotifications: true,
            maxPreviewReplies: 3,
            threadSortOrder: 'chronological', // 'chronological' or 'popularity'
            ...options.settings
        };
        
        this.init();
    }
    
    /**
     * Initialize the threading interface
     */
    init() {
        if (this.container) {
            this.createThreadingInterface();
            this.attachEventListeners();
        }
        
        if (this.websocket) {
            this.attachWebSocketListeners();
        }
    }
    
    /**
     * Create the threading interface
     */
    createThreadingInterface() {
        // Create thread panel
        this.threadPanel = document.createElement('div');
        this.threadPanel.className = 'thread-panel';
        this.threadPanel.style.display = 'none';
        this.threadPanel.innerHTML = `
            <div class="thread-panel-header">
                <div class="thread-title">
                    <i class="fas fa-comments"></i>
                    <span>Thread</span>
                </div>
                <div class="thread-controls">
                    <button class="thread-btn" id="thread-settings-btn" title="Thread Settings">
                        <i class="fas fa-cog"></i>
                    </button>
                    <button class="thread-btn" id="close-thread-btn" title="Close Thread">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="thread-content">
                <div class="thread-original-message" id="thread-original-message">
                    <!-- Original message will be displayed here -->
                </div>
                <div class="thread-replies" id="thread-replies">
                    <!-- Thread replies will be displayed here -->
                </div>
            </div>
            <div class="thread-input-container">
                <div class="thread-input-area">
                    <textarea 
                        class="thread-input" 
                        id="thread-input" 
                        placeholder="Reply to thread..."
                        rows="2"
                        maxlength="2000"
                    ></textarea>
                    <button class="thread-send-btn" id="thread-send-btn" disabled>
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
                <div class="thread-input-footer">
                    <div class="thread-char-count">
                        <span id="thread-char-count">0</span>/2000
                    </div>
                </div>
            </div>
        `;
        
        // Add to container
        this.container.appendChild(this.threadPanel);
        
        // Create thread settings panel
        this.createThreadSettingsPanel();
    }
    
    /**
     * Create thread settings panel
     */
    createThreadSettingsPanel() {
        const settingsPanel = document.createElement('div');
        settingsPanel.className = 'thread-settings-panel';
        settingsPanel.id = 'thread-settings-panel';
        settingsPanel.style.display = 'none';
        settingsPanel.innerHTML = `
            <div class="settings-header">
                <h4><i class="fas fa-cog me-2"></i>Thread Settings</h4>
                <button class="close-settings-btn" id="close-thread-settings-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="settings-content">
                <div class="setting-group">
                    <label class="setting-checkbox">
                        <input type="checkbox" id="show-thread-previews" ${this.settings.showThreadPreviews ? 'checked' : ''}>
                        <span>Show thread previews in main chat</span>
                    </label>
                </div>
                
                <div class="setting-group">
                    <label class="setting-checkbox">
                        <input type="checkbox" id="auto-expand-threads" ${this.settings.autoExpandThreads ? 'checked' : ''}>
                        <span>Auto-expand threads with new replies</span>
                    </label>
                </div>
                
                <div class="setting-group">
                    <label class="setting-checkbox">
                        <input type="checkbox" id="thread-notifications" ${this.settings.threadNotifications ? 'checked' : ''}>
                        <span>Enable thread notifications</span>
                    </label>
                </div>
                
                <div class="setting-group">
                    <label>Thread sort order</label>
                    <select id="thread-sort-order" class="setting-control">
                        <option value="chronological" ${this.settings.threadSortOrder === 'chronological' ? 'selected' : ''}>Chronological</option>
                        <option value="popularity" ${this.settings.threadSortOrder === 'popularity' ? 'selected' : ''}>Most Popular</option>
                    </select>
                </div>
                
                <div class="setting-group">
                    <label>Preview replies limit</label>
                    <select id="preview-replies-limit" class="setting-control">
                        <option value="1" ${this.settings.maxPreviewReplies === 1 ? 'selected' : ''}>1 reply</option>
                        <option value="3" ${this.settings.maxPreviewReplies === 3 ? 'selected' : ''}>3 replies</option>
                        <option value="5" ${this.settings.maxPreviewReplies === 5 ? 'selected' : ''}>5 replies</option>
                    </select>
                </div>
            </div>
        `;
        
        this.container.appendChild(settingsPanel);
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Thread panel controls
        this.container.querySelector('#close-thread-btn').addEventListener('click', () => this.closeThreadPanel());
        this.container.querySelector('#thread-settings-btn').addEventListener('click', () => this.toggleThreadSettings());
        this.container.querySelector('#close-thread-settings-btn').addEventListener('click', () => this.toggleThreadSettings());
        
        // Thread input
        const threadInput = this.container.querySelector('#thread-input');
        const threadSendBtn = this.container.querySelector('#thread-send-btn');
        
        threadInput.addEventListener('input', (e) => this.handleThreadInputChange(e));
        threadInput.addEventListener('keydown', (e) => this.handleThreadKeyDown(e));
        threadSendBtn.addEventListener('click', () => this.sendThreadReply());
        
        // Settings
        this.attachThreadSettingsListeners();
    }
    
    /**
     * Attach thread settings listeners
     */
    attachThreadSettingsListeners() {
        const showPreviews = this.container.querySelector('#show-thread-previews');
        const autoExpand = this.container.querySelector('#auto-expand-threads');
        const notifications = this.container.querySelector('#thread-notifications');
        const sortOrder = this.container.querySelector('#thread-sort-order');
        const previewLimit = this.container.querySelector('#preview-replies-limit');
        
        showPreviews.addEventListener('change', (e) => this.updateThreadSetting('showThreadPreviews', e.target.checked));
        autoExpand.addEventListener('change', (e) => this.updateThreadSetting('autoExpandThreads', e.target.checked));
        notifications.addEventListener('change', (e) => this.updateThreadSetting('threadNotifications', e.target.checked));
        sortOrder.addEventListener('change', (e) => this.updateThreadSetting('threadSortOrder', e.target.value));
        previewLimit.addEventListener('change', (e) => this.updateThreadSetting('maxPreviewReplies', parseInt(e.target.value)));
    }
    
    /**
     * Update thread setting
     */
    updateThreadSetting(key, value) {
        this.settings[key] = value;
        this.saveThreadSettings();
        this.applyThreadSettings();
    }
    
    /**
     * Save thread settings
     */
    saveThreadSettings() {
        localStorage.setItem('messageThreadingSettings', JSON.stringify(this.settings));
    }
    
    /**
     * Load thread settings
     */
    loadThreadSettings() {
        const saved = localStorage.getItem('messageThreadingSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }
    
    /**
     * Apply thread settings
     */
    applyThreadSettings() {
        // Update thread previews visibility
        const threadPreviews = this.container.querySelectorAll('.thread-preview');
        threadPreviews.forEach(preview => {
            preview.style.display = this.settings.showThreadPreviews ? 'block' : 'none';
        });
        
        // Re-render threads if sort order changed
        if (this.activeThread) {
            this.renderThreadReplies(this.activeThread);
        }
    }
    
    /**
     * Start a new thread from a message
     */
    startThread(messageId, originalMessage) {
        if (!this.threads.has(messageId)) {
            const thread = {
                id: messageId,
                originalMessage: originalMessage,
                replyCount: 0,
                participants: new Set([originalMessage.user_id]),
                createdAt: Date.now(),
                lastActivity: Date.now(),
                isActive: true
            };
            
            this.threads.set(messageId, thread);
            this.threadMessages.set(messageId, []);
            
            // Add thread indicator to original message
            this.addThreadIndicatorToMessage(messageId);
        }
        
        // Open thread panel
        this.openThreadPanel(messageId);
    }
    
    /**
     * Add reply to thread
     */
    addReplyToThread(threadId, reply) {
        if (!this.threadMessages.has(threadId)) {
            this.threadMessages.set(threadId, []);
        }
        
        const replies = this.threadMessages.get(threadId);
        replies.push(reply);
        
        // Update thread metadata
        const thread = this.threads.get(threadId);
        if (thread) {
            thread.replyCount = replies.length;
            thread.participants.add(reply.user_id);
            thread.lastActivity = Date.now();
            
            // Update thread indicator
            this.updateThreadIndicator(threadId);
            
            // Update thread preview
            this.updateThreadPreview(threadId);
            
            // Notify if thread is active
            if (this.activeThread === threadId) {
                this.renderThreadReplies(threadId);
            }
            
            // Auto-expand if setting enabled
            if (this.settings.autoExpandThreads) {
                this.expandThread(threadId);
            }
            
            // Show notification if enabled
            if (this.settings.threadNotifications && reply.user_id !== this.currentUserId) {
                this.showThreadNotification(threadId, reply);
            }
        }
        
        // Callback
        this.onReplyAdded(threadId, reply);
    }
    
    /**
     * Open thread panel
     */
    openThreadPanel(threadId) {
        this.activeThread = threadId;
        this.isThreadPanelOpen = true;
        
        const thread = this.threads.get(threadId);
        if (!thread) return;
        
        // Show panel
        this.threadPanel.style.display = 'flex';
        
        // Render original message
        this.renderOriginalMessage(thread.originalMessage);
        
        // Render replies
        this.renderThreadReplies(threadId);
        
        // Focus input
        const threadInput = this.container.querySelector('#thread-input');
        threadInput.focus();
        
        // Mark thread as read
        this.markThreadAsRead(threadId);
    }
    
    /**
     * Close thread panel
     */
    closeThreadPanel() {
        this.activeThread = null;
        this.isThreadPanelOpen = false;
        this.threadPanel.style.display = 'none';
        
        // Clear input
        const threadInput = this.container.querySelector('#thread-input');
        threadInput.value = '';
        this.updateThreadCharCount(0);
    }
    
    /**
     * Toggle thread settings
     */
    toggleThreadSettings() {
        const settingsPanel = this.container.querySelector('#thread-settings-panel');
        const isVisible = settingsPanel.style.display !== 'none';
        settingsPanel.style.display = isVisible ? 'none' : 'block';
    }
    
    /**
     * Render original message in thread panel
     */
    renderOriginalMessage(message) {
        const container = this.container.querySelector('#thread-original-message');
        
        container.innerHTML = `
            <div class="original-message">
                <div class="message-header">
                    <div class="message-author">${message.user_name}</div>
                    <span class="user-role ${message.user_role}">${message.user_role}</span>
                    <span class="message-time">${this.formatTime(message.timestamp)}</span>
                </div>
                <div class="message-content">${this.formatMessageText(message.message)}</div>
                <div class="thread-stats">
                    <span class="reply-count">
                        <i class="fas fa-reply"></i>
                        ${this.getThreadReplyCount(message.id)} replies
                    </span>
                    <span class="participant-count">
                        <i class="fas fa-users"></i>
                        ${this.getThreadParticipantCount(message.id)} participants
                    </span>
                </div>
            </div>
        `;
    }
    
    /**
     * Render thread replies
     */
    renderThreadReplies(threadId) {
        const container = this.container.querySelector('#thread-replies');
        const replies = this.threadMessages.get(threadId) || [];
        
        if (replies.length === 0) {
            container.innerHTML = `
                <div class="no-replies">
                    <i class="fas fa-comments"></i>
                    <p>No replies yet. Be the first to reply!</p>
                </div>
            `;
            return;
        }
        
        // Sort replies based on settings
        const sortedReplies = this.sortThreadReplies(replies);
        
        container.innerHTML = sortedReplies.map((reply, index) => `
            <div class="thread-reply" data-reply-id="${reply.id}">
                <div class="reply-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="reply-content">
                    <div class="reply-header">
                        <span class="reply-author">${reply.user_name}</span>
                        <span class="user-role ${reply.user_role}">${reply.user_role}</span>
                        <span class="reply-time">${this.formatTime(reply.timestamp)}</span>
                    </div>
                    <div class="reply-text">${this.formatMessageText(reply.message)}</div>
                    <div class="reply-actions">
                        <button class="reply-action-btn" onclick="messageThreading.replyToReply('${reply.id}')" title="Reply">
                            <i class="fas fa-reply"></i>
                        </button>
                        ${this.canModerate() ? `
                        <button class="reply-action-btn" onclick="messageThreading.moderateReply('${reply.id}')" title="Moderate">
                            <i class="fas fa-shield-alt"></i>
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');
        
        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }
    
    /**
     * Sort thread replies
     */
    sortThreadReplies(replies) {
        const sorted = [...replies];
        
        switch (this.settings.threadSortOrder) {
            case 'chronological':
                return sorted.sort((a, b) => a.timestamp - b.timestamp);
            case 'popularity':
                // Sort by reaction count or other popularity metrics
                return sorted.sort((a, b) => (b.reactions || 0) - (a.reactions || 0));
            default:
                return sorted;
        }
    }
    
    /**
     * Add thread indicator to message
     */
    addThreadIndicatorToMessage(messageId) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (!messageElement) return;
        
        // Check if indicator already exists
        if (messageElement.querySelector('.thread-indicator')) return;
        
        const indicator = document.createElement('div');
        indicator.className = 'thread-indicator';
        indicator.innerHTML = `
            <button class="thread-btn" onclick="messageThreading.openThreadPanel('${messageId}')" title="View Thread">
                <i class="fas fa-comments"></i>
                <span class="thread-count">0</span>
            </button>
        `;
        
        // Add to message actions
        const messageActions = messageElement.querySelector('.message-actions');
        if (messageActions) {
            messageActions.appendChild(indicator);
        }
        
        // Add thread preview if enabled
        if (this.settings.showThreadPreviews) {
            this.addThreadPreview(messageId, messageElement);
        }
    }
    
    /**
     * Update thread indicator
     */
    updateThreadIndicator(threadId) {
        const messageElement = document.querySelector(`[data-message-id="${threadId}"]`);
        if (!messageElement) return;
        
        const indicator = messageElement.querySelector('.thread-indicator');
        if (!indicator) return;
        
        const thread = this.threads.get(threadId);
        const countElement = indicator.querySelector('.thread-count');
        
        if (countElement && thread) {
            countElement.textContent = thread.replyCount;
            
            // Add unread indicator if there are new replies
            if (this.hasUnreadReplies(threadId)) {
                indicator.classList.add('has-unread');
            } else {
                indicator.classList.remove('has-unread');
            }
        }
    }
    
    /**
     * Add thread preview to message
     */
    addThreadPreview(threadId, messageElement) {
        const preview = document.createElement('div');
        preview.className = 'thread-preview';
        preview.id = `thread-preview-${threadId}`;
        preview.style.display = 'none';
        
        messageElement.appendChild(preview);
    }
    
    /**
     * Update thread preview
     */
    updateThreadPreview(threadId) {
        if (!this.settings.showThreadPreviews) return;
        
        const preview = document.querySelector(`#thread-preview-${threadId}`);
        if (!preview) return;
        
        const replies = this.threadMessages.get(threadId) || [];
        const recentReplies = replies.slice(-this.settings.maxPreviewReplies);
        
        if (recentReplies.length === 0) {
            preview.style.display = 'none';
            return;
        }
        
        preview.innerHTML = `
            <div class="preview-header">
                <span class="preview-title">
                    <i class="fas fa-reply"></i>
                    ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}
                </span>
                <button class="preview-expand-btn" onclick="messageThreading.toggleThreadExpansion('${threadId}')">
                    <i class="fas fa-chevron-down"></i>
                </button>
            </div>
            <div class="preview-replies" style="display: ${this.expandedThreads.has(threadId) ? 'block' : 'none'}">
                ${recentReplies.map(reply => `
                    <div class="preview-reply">
                        <span class="preview-author">${reply.user_name}:</span>
                        <span class="preview-text">${this.truncateText(reply.message, 100)}</span>
                    </div>
                `).join('')}
                ${replies.length > this.settings.maxPreviewReplies ? `
                    <div class="preview-more">
                        <button class="preview-more-btn" onclick="messageThreading.openThreadPanel('${threadId}')">
                            View all ${replies.length} replies
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
        
        preview.style.display = 'block';
    }
    
    /**
     * Toggle thread expansion in preview
     */
    toggleThreadExpansion(threadId) {
        const preview = document.querySelector(`#thread-preview-${threadId}`);
        if (!preview) return;
        
        const repliesContainer = preview.querySelector('.preview-replies');
        const expandBtn = preview.querySelector('.preview-expand-btn i');
        
        if (this.expandedThreads.has(threadId)) {
            this.expandedThreads.delete(threadId);
            repliesContainer.style.display = 'none';
            expandBtn.className = 'fas fa-chevron-down';
        } else {
            this.expandedThreads.add(threadId);
            repliesContainer.style.display = 'block';
            expandBtn.className = 'fas fa-chevron-up';
        }
    }
    
    /**
     * Expand thread
     */
    expandThread(threadId) {
        this.expandedThreads.add(threadId);
        this.updateThreadPreview(threadId);
    }
    
    /**
     * Handle thread input change
     */
    handleThreadInputChange(e) {
        const value = e.target.value;
        const length = value.length;
        
        // Update character count
        this.updateThreadCharCount(length);
        
        // Update send button state
        const sendBtn = this.container.querySelector('#thread-send-btn');
        sendBtn.disabled = length === 0 || length > 2000;
        
        // Auto-resize textarea
        this.autoResizeThreadTextarea(e.target);
    }
    
    /**
     * Handle thread key down
     */
    handleThreadKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendThreadReply();
        }
    }
    
    /**
     * Auto-resize thread textarea
     */
    autoResizeThreadTextarea(textarea) {
        textarea.style.height = 'auto';
        const maxHeight = 100; // Max height for thread input
        const newHeight = Math.min(textarea.scrollHeight, maxHeight);
        textarea.style.height = newHeight + 'px';
    }
    
    /**
     * Update thread character count
     */
    updateThreadCharCount(count) {
        const charCountElement = this.container.querySelector('#thread-char-count');
        if (charCountElement) {
            charCountElement.textContent = count;
        }
    }
    
    /**
     * Send thread reply
     */
    sendThreadReply() {
        if (!this.activeThread || !this.websocket) return;
        
        const threadInput = this.container.querySelector('#thread-input');
        const message = threadInput.value.trim();
        
        if (!message) return;
        
        const replyData = {
            type: 'thread_reply',
            thread_id: this.activeThread,
            message: message,
            room_id: this.roomId
        };
        
        this.websocket.send(JSON.stringify(replyData));
        
        // Clear input
        threadInput.value = '';
        threadInput.style.height = 'auto';
        this.updateThreadCharCount(0);
        
        const sendBtn = this.container.querySelector('#thread-send-btn');
        sendBtn.disabled = true;
    }
    
    /**
     * Reply to a specific reply (nested threading)
     */
    replyToReply(replyId) {
        // For now, just focus the thread input
        // In a more advanced implementation, this could create nested threads
        const threadInput = this.container.querySelector('#thread-input');
        threadInput.focus();
        
        // Could add @mention or reply indicator here
        console.log('Replying to reply:', replyId);
    }
    
    /**
     * Moderate reply
     */
    moderateReply(replyId) {
        // Integration with moderation system
        console.log('Moderating reply:', replyId);
    }
    
    /**
     * Get thread reply count
     */
    getThreadReplyCount(threadId) {
        const replies = this.threadMessages.get(threadId);
        return replies ? replies.length : 0;
    }
    
    /**
     * Get thread participant count
     */
    getThreadParticipantCount(threadId) {
        const thread = this.threads.get(threadId);
        return thread ? thread.participants.size : 0;
    }
    
    /**
     * Check if thread has unread replies
     */
    hasUnreadReplies(threadId) {
        // This would track read status per user
        // For now, return false
        return false;
    }
    
    /**
     * Mark thread as read
     */
    markThreadAsRead(threadId) {
        // Implementation for marking thread as read
        this.threadNotifications.delete(threadId);
        this.updateThreadIndicator(threadId);
    }
    
    /**
     * Show thread notification
     */
    showThreadNotification(threadId, reply) {
        if (!this.settings.threadNotifications) return;
        
        const thread = this.threads.get(threadId);
        if (!thread) return;
        
        // Desktop notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`New reply in thread`, {
                body: `${reply.user_name}: ${reply.message.substring(0, 100)}`,
                icon: '/favicon.ico',
                tag: `thread-${threadId}`
            });
        }
        
        // Add to notification queue
        this.threadNotifications.set(threadId, {
            threadId,
            reply,
            timestamp: Date.now()
        });
    }
    
    /**
     * Format message text
     */
    formatMessageText(text) {
        // Basic formatting - would integrate with existing formatting system
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
    }
    
    /**
     * Format time
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    /**
     * Truncate text
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    /**
     * Check if user can moderate
     */
    canModerate() {
        return ['admin', 'moderator', 'host'].includes(this.currentUserRole);
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
            case 'thread_reply':
                this.addReplyToThread(data.thread_id, data);
                break;
                
            case 'thread_created':
                this.handleThreadCreated(data);
                break;
                
            case 'thread_updated':
                this.handleThreadUpdated(data);
                break;
        }
    }
    
    /**
     * Handle thread created
     */
    handleThreadCreated(data) {
        // Handle when someone else creates a thread
        if (!this.threads.has(data.thread_id)) {
            this.threads.set(data.thread_id, data.thread);
            this.threadMessages.set(data.thread_id, []);
            this.addThreadIndicatorToMessage(data.thread_id);
        }
    }
    
    /**
     * Handle thread updated
     */
    handleThreadUpdated(data) {
        // Handle thread metadata updates
        if (this.threads.has(data.thread_id)) {
            this.threads.set(data.thread_id, { ...this.threads.get(data.thread_id), ...data.updates });
            this.updateThreadIndicator(data.thread_id);
        }
    }
    
    /**
     * Get thread statistics
     */
    getThreadStatistics() {
        const stats = {
            totalThreads: this.threads.size,
            totalReplies: 0,
            activeThreads: 0,
            averageRepliesPerThread: 0,
            mostActiveThread: null,
            recentActivity: []
        };
        
        let maxReplies = 0;
        let mostActiveThreadId = null;
        
        for (const [threadId, thread] of this.threads) {
            const replyCount = this.getThreadReplyCount(threadId);
            stats.totalReplies += replyCount;
            
            if (thread.lastActivity > Date.now() - (24 * 60 * 60 * 1000)) {
                stats.activeThreads++;
            }
            
            if (replyCount > maxReplies) {
                maxReplies = replyCount;
                mostActiveThreadId = threadId;
            }
        }
        
        stats.averageRepliesPerThread = stats.totalThreads > 0 ? 
            (stats.totalReplies / stats.totalThreads).toFixed(1) : 0;
        
        if (mostActiveThreadId) {
            stats.mostActiveThread = {
                threadId: mostActiveThreadId,
                replyCount: maxReplies
            };
        }
        
        return stats;
    }
    
    /**
     * Export thread data
     */
    exportThreadData(threadId) {
        const thread = this.threads.get(threadId);
        const replies = this.threadMessages.get(threadId) || [];
        
        if (!thread) return null;
        
        return {
            thread: thread,
            originalMessage: thread.originalMessage,
            replies: replies,
            statistics: {
                replyCount: replies.length,
                participantCount: thread.participants.size,
                createdAt: thread.createdAt,
                lastActivity: thread.lastActivity
            }
        };
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
     * Destroy the interface
     */
    destroy() {
        this.threads.clear();
        this.threadMessages.clear();
        this.expandedThreads.clear();
        this.threadNotifications.clear();
        
        if (this.threadPanel) {
            this.threadPanel.remove();
        }
        
        const settingsPanel = this.container.querySelector('#thread-settings-panel');
        if (settingsPanel) {
            settingsPanel.remove();
        }
    }
}

// CSS Styles for Message Threading Interface
const messageThreadingStyles = `
<style>
/* Message Threading Interface Styles */
.thread-panel {
    position: fixed;
    top: 0;
    right: 0;
    width: 400px;
    height: 100vh;
    background: var(--chat-card, #2a2a2a);
    border-left: 1px solid var(--chat-border, #444);
    display: flex;
    flex-direction: column;
    z-index: 1000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
}

.thread-panel[style*="flex"] {
    transform: translateX(0);
}

.thread-panel-header {
    background: var(--chat-input, #3a3a3a);
    border-bottom: 1px solid var(--chat-border, #444);
    padding: 1rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
}

.thread-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--chat-text, #ffffff);
    font-weight: 600;
}

.thread-title i {
    color: var(--chat-primary, #FF0000);
}

.thread-controls {
    display: flex;
    gap: 0.5rem;
}

.thread-btn {
    background: transparent;
    border: 1px solid var(--chat-border, #444);
    color: var(--chat-text-muted, #cccccc);
    width: 32px;
    height: 32px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9rem;
}

.thread-btn:hover {
    background: var(--chat-input, #3a3a3a);
    color: var(--chat-text, #ffffff);
    border-color: var(--chat-primary, #FF0000);
}

.thread-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.thread-original-message {
    background: var(--chat-bg, #1a1a1a);
    border-bottom: 1px solid var(--chat-border, #444);
    padding: 1rem;
    flex-shrink: 0;
}

.original-message {
    background: var(--chat-input, #3a3a3a);
    border-radius: 8px;
    padding: 1rem;
    border: 1px solid var(--chat-border, #444);
}

.original-message .message-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.original-message .message-author {
    font-weight: 600;
    color: var(--chat-text, #ffffff);
}

.original-message .user-role {
    font-size: 0.7rem;
    padding: 0.1rem 0.4rem;
    border-radius: 10px;
    text-transform: uppercase;
    font-weight: 500;
}

.original-message .user-role.admin {
    background: var(--chat-danger, #dc3545);
    color: white;
}

.original-message .user-role.moderator {
    background: var(--chat-warning, #ffc107);
    color: black;
}

.original-message .user-role.host {
    background: var(--chat-info, #17a2b8);
    color: white;
}

.original-message .user-role.participant {
    background: var(--chat-success, #28a745);
    color: white;
}

.original-message .user-role.guest {
    background: var(--chat-border, #444);
    color: var(--chat-text-muted, #cccccc);
}

.original-message .message-time {
    font-size: 0.75rem;
    color: var(--chat-text-muted, #cccccc);
}

.original-message .message-content {
    color: var(--chat-text, #ffffff);
    line-height: 1.4;
    margin-bottom: 0.75rem;
}

.thread-stats {
    display: flex;
    gap: 1rem;
    font-size: 0.8rem;
    color: var(--chat-text-muted, #cccccc);
}

.thread-stats span {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.thread-stats i {
    color: var(--chat-primary, #FF0000);
}

.thread-replies {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
}

.thread-replies::-webkit-scrollbar {
    width: 6px;
}

.thread-replies::-webkit-scrollbar-track {
    background: var(--chat-bg, #1a1a1a);
}

.thread-replies::-webkit-scrollbar-thumb {
    background: var(--chat-border, #444);
    border-radius: 3px;
}

.no-replies {
    text-align: center;
    padding: 3rem 2rem;
    color: var(--chat-text-muted, #cccccc);
}

.no-replies i {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    opacity: 0.5;
}

.no-replies p {
    margin: 0;
}

.thread-reply {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: var(--chat-input, #3a3a3a);
    border-radius: 8px;
    border: 1px solid var(--chat-border, #444);
    transition: all 0.2s ease;
}

.thread-reply:hover {
    background: var(--chat-bg, #1a1a1a);
    border-color: var(--chat-primary, #FF0000);
}

.reply-avatar {
    width: 28px;
    height: 28px;
    background: var(--chat-bg, #1a1a1a);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--chat-text-muted, #cccccc);
    flex-shrink: 0;
    font-size: 0.8rem;
}

.reply-content {
    flex: 1;
    min-width: 0;
}

.reply-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
}

.reply-author {
    font-weight: 600;
    color: var(--chat-text, #ffffff);
    font-size: 0.9rem;
}

.reply-time {
    font-size: 0.7rem;
    color: var(--chat-text-muted, #cccccc);
}

.reply-text {
    color: var(--chat-text, #ffffff);
    line-height: 1.4;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
}

.reply-text code {
    background: rgba(0, 0, 0, 0.3);
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
}

.reply-actions {
    display: flex;
    gap: 0.25rem;
    opacity: 0;
    transition: opacity 0.2s ease;
}

.thread-reply:hover .reply-actions {
    opacity: 1;
}

.reply-action-btn {
    background: transparent;
    border: 1px solid var(--chat-border, #444);
    color: var(--chat-text-muted, #cccccc);
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

.reply-action-btn:hover {
    background: var(--chat-primary, #FF0000);
    color: white;
    border-color: var(--chat-primary, #FF0000);
}

.thread-input-container {
    background: var(--chat-card, #2a2a2a);
    border-top: 1px solid var(--chat-border, #444);
    padding: 1rem;
    flex-shrink: 0;
}

.thread-input-area {
    display: flex;
    gap: 0.75rem;
    align-items: flex-end;
}

.thread-input {
    flex: 1;
    background: var(--chat-input, #3a3a3a);
    border: 1px solid var(--chat-border, #444);
    color: var(--chat-text, #ffffff);
    padding: 0.75rem;
    border-radius: 8px;
    font-size: 0.9rem;
    line-height: 1.4;
    resize: none;
    min-height: 40px;
    max-height: 100px;
    font-family: inherit;
}

.thread-input:focus {
    outline: none;
    border-color: var(--chat-primary, #FF0000);
}

.thread-input::placeholder {
    color: var(--chat-text-muted, #cccccc);
}

.thread-send-btn {
    background: var(--chat-primary, #FF0000);
    border: none;
    color: white;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
}

.thread-send-btn:hover:not(:disabled) {
    background: #cc0000;
    transform: translateY(-1px);
}

.thread-send-btn:disabled {
    background: var(--chat-border, #444);
    cursor: not-allowed;
    transform: none;
}

.thread-input-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.5rem;
    font-size: 0.8rem;
    color: var(--chat-text-muted, #cccccc);
}

.thread-char-count {
    color: var(--chat-text-muted, #cccccc);
}

/* Thread Settings Panel */
.thread-settings-panel {
    position: absolute;
    top: 60px;
    right: 10px;
    width: 300px;
    background: var(--chat-card, #2a2a2a);
    border: 1px solid var(--chat-border, #444);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 1100;
}

.settings-header {
    background: var(--chat-input, #3a3a3a);
    border-bottom: 1px solid var(--chat-border, #444);
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 8px 8px 0 0;
}

.settings-header h4 {
    margin: 0;
    color: var(--chat-text, #ffffff);
    font-size: 1rem;
}

.close-settings-btn {
    background: transparent;
    border: none;
    color: var(--chat-text-muted, #cccccc);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    transition: all 0.2s ease;
}

.close-settings-btn:hover {
    background: var(--chat-border, #444);
    color: var(--chat-text, #ffffff);
}

.settings-content {
    padding: 1rem;
}

.setting-group {
    margin-bottom: 1rem;
}

.setting-group:last-child {
    margin-bottom: 0;
}

.setting-group label {
    color: var(--chat-text, #ffffff);
    font-weight: 500;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
    display: block;
}

.setting-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    margin-bottom: 0;
}

.setting-checkbox input[type="checkbox"] {
    accent-color: var(--chat-primary, #FF0000);
}

.setting-control {
    width: 100%;
    background: var(--chat-input, #3a3a3a);
    border: 1px solid var(--chat-border, #444);
    color: var(--chat-text, #ffffff);
    padding: 0.5rem;
    border-radius: 6px;
    font-size: 0.9rem;
}

.setting-control:focus {
    outline: none;
    border-color: var(--chat-primary, #FF0000);
}

/* Thread Indicators in Messages */
.thread-indicator {
    display: inline-flex;
    align-items: center;
    margin-left: 0.5rem;
}

.thread-indicator .thread-btn {
    background: var(--chat-input, #3a3a3a);
    border: 1px solid var(--chat-border, #444);
    color: var(--chat-text-muted, #cccccc);
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.7rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    transition: all 0.2s ease;
}

.thread-indicator .thread-btn:hover {
    background: var(--chat-primary, #FF0000);
    color: white;
    border-color: var(--chat-primary, #FF0000);
}

.thread-indicator.has-unread .thread-btn {
    background: var(--chat-primary, #FF0000);
    color: white;
    border-color: var(--chat-primary, #FF0000);
}

.thread-indicator .thread-count {
    font-weight: 500;
}

/* Thread Previews */
.thread-preview {
    margin-top: 0.5rem;
    background: var(--chat-input, #3a3a3a);
    border: 1px solid var(--chat-border, #444);
    border-radius: 8px;
    overflow: hidden;
}

.preview-header {
    background: var(--chat-bg, #1a1a1a);
    padding: 0.5rem 0.75rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--chat-border, #444);
}

.preview-title {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--chat-text-muted, #cccccc);
    font-size: 0.8rem;
    font-weight: 500;
}

.preview-title i {
    color: var(--chat-primary, #FF0000);
}

.preview-expand-btn {
    background: transparent;
    border: none;
    color: var(--chat-text-muted, #cccccc);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    transition: all 0.2s ease;
}

.preview-expand-btn:hover {
    background: var(--chat-border, #444);
    color: var(--chat-text, #ffffff);
}

.preview-replies {
    padding: 0.75rem;
}

.preview-reply {
    margin-bottom: 0.5rem;
    font-size: 0.8rem;
    line-height: 1.3;
}

.preview-reply:last-child {
    margin-bottom: 0;
}

.preview-author {
    font-weight: 600;
    color: var(--chat-text, #ffffff);
    margin-right: 0.25rem;
}

.preview-text {
    color: var(--chat-text-muted, #cccccc);
}

.preview-more {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--chat-border, #444);
}

.preview-more-btn {
    background: transparent;
    border: 1px solid var(--chat-border, #444);
    color: var(--chat-primary, #FF0000);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.7rem;
    cursor: pointer;
    transition: all 0.2s ease;
}

.preview-more-btn:hover {
    background: var(--chat-primary, #FF0000);
    color: white;
    border-color: var(--chat-primary, #FF0000);
}

/* Mobile Responsive */
@media (max-width: 768px) {
    .thread-panel {
        width: 100%;
        right: 0;
    }

    .thread-settings-panel {
        width: calc(100% - 20px);
        right: 10px;
        left: 10px;
    }

    .thread-reply {
        padding: 0.5rem;
    }

    .reply-avatar {
        width: 24px;
        height: 24px;
    }

    .thread-input-area {
        flex-direction: column;
        gap: 0.5rem;
    }

    .thread-send-btn {
        width: 100%;
        height: 36px;
    }
}

@media (max-width: 480px) {
    .thread-panel-header {
        padding: 0.75rem 1rem;
    }

    .thread-original-message {
        padding: 0.75rem;
    }

    .thread-replies {
        padding: 0.75rem;
    }

    .thread-input-container {
        padding: 0.75rem;
    }

    .original-message {
        padding: 0.75rem;
    }

    .thread-reply {
        gap: 0.5rem;
        padding: 0.5rem;
    }
}

/* Animation for thread panel */
@keyframes slideInFromRight {
    from {
        transform: translateX(100%);
    }
    to {
        transform: translateX(0);
    }
}

@keyframes slideOutToRight {
    from {
        transform: translateX(0);
    }
    to {
        transform: translateX(100%);
    }
}

.thread-panel.opening {
    animation: slideInFromRight 0.3s ease;
}

.thread-panel.closing {
    animation: slideOutToRight 0.3s ease;
}
</style>
`;

// Inject styles into document head
if (typeof document !== 'undefined') {
    const styleElement = document.createElement('div');
    styleElement.innerHTML = messageThreadingStyles;
    document.head.appendChild(styleElement.firstElementChild);
}

// Global reference for onclick handlers
let messageThreading = null;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MessageThreadingInterface;
} else if (typeof window !== 'undefined') {
    window.MessageThreadingInterface = MessageThreadingInterface;
}
