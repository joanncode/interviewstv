/**
 * Private Message Interface
 * Handles direct messaging between participants with encryption and moderation
 */
class PrivateMessageInterface {
    constructor(options = {}) {
        this.websocket = options.websocket || null;
        this.currentUserId = options.currentUserId || null;
        this.currentUserName = options.currentUserName || 'Unknown';
        this.currentUserRole = options.currentUserRole || 'participant';
        this.roomId = options.roomId || 'default';
        this.onMessageReceived = options.onMessageReceived || (() => {});
        this.onConversationUpdated = options.onConversationUpdated || (() => {});
        
        this.conversations = new Map();
        this.activeConversation = null;
        this.unreadCounts = new Map();
        this.blockedUsers = new Set();
        this.isInitialized = false;
        
        this.init();
    }
    
    init() {
        if (this.websocket) {
            this.attachWebSocketListeners();
        }
        this.loadConversations();
        this.isInitialized = true;
    }
    
    /**
     * Attach WebSocket event listeners
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
            case 'private_message_received':
                this.handleMessageReceived(data.message, data.conversation_id);
                break;
                
            case 'private_message_sent':
                this.handleMessageSent(data.message, data.conversation_id);
                break;
                
            case 'private_conversations':
                this.handleConversationsLoaded(data.conversations, data.total_count);
                break;
                
            case 'conversation_history':
                this.handleConversationHistory(data.messages, data.conversation_id, data.total_count);
                break;
                
            case 'messages_marked_read':
                this.handleMessagesMarkedRead(data.conversation_id, data.updated_count);
                break;
                
            case 'private_message_deleted':
                this.handleMessageDeleted(data.message_id);
                break;
                
            case 'user_block_updated':
                this.handleUserBlockUpdated(data.target_user_id, data.action);
                break;
                
            case 'private_message_statistics':
                this.handleStatisticsReceived(data.statistics);
                break;
        }
    }
    
    /**
     * Send a private message
     */
    sendPrivateMessage(recipientId, message, options = {}) {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket not connected');
        }
        
        if (!recipientId || !message.trim()) {
            throw new Error('Recipient ID and message are required');
        }
        
        if (this.blockedUsers.has(recipientId)) {
            throw new Error('Cannot send message to blocked user');
        }
        
        const messageData = {
            type: 'send_private_message',
            recipient_id: recipientId,
            recipient_name: options.recipientName || 'Unknown',
            message: message.trim(),
            message_type: options.messageType || 'text',
            room_id: this.roomId,
            attachment: options.attachment || null
        };
        
        this.websocket.send(JSON.stringify(messageData));
        
        return true;
    }
    
    /**
     * Load user's conversations
     */
    loadConversations(options = {}) {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            return false;
        }
        
        const requestData = {
            type: 'get_private_conversations',
            limit: options.limit || 20,
            offset: options.offset || 0
        };
        
        this.websocket.send(JSON.stringify(requestData));
        return true;
    }
    
    /**
     * Load conversation history
     */
    loadConversationHistory(otherUserId, options = {}) {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            return false;
        }
        
        const requestData = {
            type: 'get_conversation_history',
            other_user_id: otherUserId,
            limit: options.limit || 50,
            offset: options.offset || 0,
            before: options.before || null,
            after: options.after || null
        };
        
        this.websocket.send(JSON.stringify(requestData));
        return true;
    }
    
    /**
     * Mark messages as read
     */
    markMessagesAsRead(conversationId, messageIds = []) {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            return false;
        }
        
        const requestData = {
            type: 'mark_messages_read',
            conversation_id: conversationId,
            message_ids: messageIds
        };
        
        this.websocket.send(JSON.stringify(requestData));
        return true;
    }
    
    /**
     * Delete a private message
     */
    deleteMessage(messageId, reason = '') {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            return false;
        }
        
        const requestData = {
            type: 'delete_private_message',
            message_id: messageId,
            reason: reason
        };
        
        this.websocket.send(JSON.stringify(requestData));
        return true;
    }
    
    /**
     * Block or unblock a user
     */
    blockUser(targetUserId, block = true) {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            return false;
        }
        
        const requestData = {
            type: 'block_user',
            target_user_id: targetUserId,
            block: block
        };
        
        this.websocket.send(JSON.stringify(requestData));
        return true;
    }
    
    /**
     * Get private message statistics (admin/moderator only)
     */
    getStatistics(days = 7) {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            return false;
        }
        
        const requestData = {
            type: 'get_private_message_stats',
            days: days
        };
        
        this.websocket.send(JSON.stringify(requestData));
        return true;
    }
    
    /**
     * Handle received message
     */
    handleMessageReceived(message, conversationId) {
        // Add to conversation
        if (!this.conversations.has(conversationId)) {
            this.conversations.set(conversationId, {
                id: conversationId,
                participant_id: message.sender_id,
                participant_name: message.metadata.sender_name,
                messages: [],
                last_activity: message.timestamp,
                created_at: message.timestamp
            });
        }
        
        const conversation = this.conversations.get(conversationId);
        conversation.messages.push(message);
        conversation.last_activity = message.timestamp;
        
        // Update unread count
        const currentUnread = this.unreadCounts.get(conversationId) || 0;
        this.unreadCounts.set(conversationId, currentUnread + 1);
        
        // Notify callback
        this.onMessageReceived(message, conversation);
        
        // Show notification if not in active conversation
        if (this.activeConversation !== conversationId) {
            this.showNotification(
                `New message from ${message.metadata.sender_name}`,
                message.message,
                'message'
            );
        }
    }
    
    /**
     * Handle sent message confirmation
     */
    handleMessageSent(message, conversationId) {
        // Add to conversation
        if (!this.conversations.has(conversationId)) {
            this.conversations.set(conversationId, {
                id: conversationId,
                participant_id: message.recipient_id,
                participant_name: message.metadata.recipient_name,
                messages: [],
                last_activity: message.timestamp,
                created_at: message.timestamp
            });
        }
        
        const conversation = this.conversations.get(conversationId);
        conversation.messages.push(message);
        conversation.last_activity = message.timestamp;
        
        // Notify callback
        this.onConversationUpdated(conversation);
    }
    
    /**
     * Handle conversations loaded
     */
    handleConversationsLoaded(conversations, totalCount) {
        this.conversations.clear();
        this.unreadCounts.clear();
        
        conversations.forEach(conv => {
            this.conversations.set(conv.conversation_id, conv);
            if (conv.unread_count > 0) {
                this.unreadCounts.set(conv.conversation_id, conv.unread_count);
            }
        });
        
        // Notify callback
        this.onConversationUpdated(null, { conversations, totalCount });
    }
    
    /**
     * Handle conversation history loaded
     */
    handleConversationHistory(messages, conversationId, totalCount) {
        if (this.conversations.has(conversationId)) {
            const conversation = this.conversations.get(conversationId);
            conversation.messages = messages;
            conversation.total_count = totalCount;
            
            // Set as active conversation
            this.activeConversation = conversationId;
            
            // Mark messages as read
            this.markMessagesAsRead(conversationId);
            
            // Notify callback
            this.onConversationUpdated(conversation);
        }
    }
    
    /**
     * Handle messages marked as read
     */
    handleMessagesMarkedRead(conversationId, updatedCount) {
        if (updatedCount > 0) {
            this.unreadCounts.set(conversationId, 0);
            
            // Update conversation messages
            if (this.conversations.has(conversationId)) {
                const conversation = this.conversations.get(conversationId);
                conversation.messages.forEach(msg => {
                    if (msg.recipient_id === this.currentUserId) {
                        msg.read = true;
                        msg.read_at = Math.floor(Date.now() / 1000);
                    }
                });
                
                this.onConversationUpdated(conversation);
            }
        }
    }
    
    /**
     * Handle message deleted
     */
    handleMessageDeleted(messageId) {
        // Find and mark message as deleted
        for (const [conversationId, conversation] of this.conversations) {
            const messageIndex = conversation.messages.findIndex(msg => msg.message_id === messageId);
            if (messageIndex !== -1) {
                conversation.messages[messageIndex].deleted = true;
                conversation.messages[messageIndex].message = '[Message deleted]';
                this.onConversationUpdated(conversation);
                break;
            }
        }
    }
    
    /**
     * Handle user block status updated
     */
    handleUserBlockUpdated(targetUserId, action) {
        if (action === 'blocked') {
            this.blockedUsers.add(targetUserId);
        } else {
            this.blockedUsers.delete(targetUserId);
        }
        
        this.showNotification(
            `User ${action}`,
            `User has been ${action}`,
            action === 'blocked' ? 'warning' : 'success'
        );
    }
    
    /**
     * Handle statistics received
     */
    handleStatisticsReceived(statistics) {
        // This would typically update an admin dashboard
        console.log('Private message statistics:', statistics);
    }
    
    /**
     * Get conversation by ID
     */
    getConversation(conversationId) {
        return this.conversations.get(conversationId) || null;
    }
    
    /**
     * Get conversation by participant ID
     */
    getConversationByParticipant(participantId) {
        for (const [conversationId, conversation] of this.conversations) {
            if (conversation.participant_id === participantId) {
                return conversation;
            }
        }
        return null;
    }
    
    /**
     * Get all conversations
     */
    getAllConversations() {
        return Array.from(this.conversations.values()).sort((a, b) => {
            return b.last_activity - a.last_activity;
        });
    }
    
    /**
     * Get unread count for conversation
     */
    getUnreadCount(conversationId) {
        return this.unreadCounts.get(conversationId) || 0;
    }
    
    /**
     * Get total unread count
     */
    getTotalUnreadCount() {
        let total = 0;
        for (const count of this.unreadCounts.values()) {
            total += count;
        }
        return total;
    }
    
    /**
     * Check if user is blocked
     */
    isUserBlocked(userId) {
        return this.blockedUsers.has(userId);
    }
    
    /**
     * Set active conversation
     */
    setActiveConversation(conversationId) {
        this.activeConversation = conversationId;
        
        // Mark messages as read
        if (conversationId && this.getUnreadCount(conversationId) > 0) {
            this.markMessagesAsRead(conversationId);
        }
    }
    
    /**
     * Clear active conversation
     */
    clearActiveConversation() {
        this.activeConversation = null;
    }
    
    /**
     * Show notification
     */
    showNotification(title, message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `pm-notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-header">
                <strong>${title}</strong>
                <button class="notification-close">&times;</button>
            </div>
            <div class="notification-body">${message}</div>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Add close handler
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
        
        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
    }
    
    /**
     * Update WebSocket connection
     */
    setWebSocket(websocket) {
        this.websocket = websocket;
        if (websocket) {
            this.attachWebSocketListeners();
            if (this.isInitialized) {
                this.loadConversations();
            }
        }
    }
    
    /**
     * Update user information
     */
    setUserInfo(userId, userName, userRole) {
        this.currentUserId = userId;
        this.currentUserName = userName;
        this.currentUserRole = userRole;
    }
    
    /**
     * Update room ID
     */
    setRoomId(roomId) {
        this.roomId = roomId;
    }
    
    /**
     * Destroy the interface
     */
    destroy() {
        this.conversations.clear();
        this.unreadCounts.clear();
        this.blockedUsers.clear();
        this.activeConversation = null;
        this.websocket = null;
        
        // Remove any notifications
        document.querySelectorAll('.pm-notification').forEach(notification => {
            notification.remove();
        });
    }
}

// CSS Styles for Private Message Interface
const privateMessageStyles = `
<style>
.pm-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--card-dark, #2a2a2a);
    border: 1px solid var(--border-color, #444);
    border-radius: 8px;
    padding: 1rem;
    max-width: 300px;
    z-index: 2000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.pm-notification.show {
    transform: translateX(0);
}

.pm-notification.notification-message {
    border-left: 4px solid var(--primary-color, #FF0000);
}

.pm-notification.notification-success {
    border-left: 4px solid #28a745;
}

.pm-notification.notification-warning {
    border-left: 4px solid #ffc107;
}

.pm-notification.notification-error {
    border-left: 4px solid #dc3545;
}

.notification-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
}

.notification-header strong {
    color: var(--text-light, #ffffff);
    font-size: 0.9rem;
}

.notification-close {
    background: none;
    border: none;
    color: var(--text-muted, #cccccc);
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
    transition: background 0.2s ease;
}

.notification-close:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-light, #ffffff);
}

.notification-body {
    color: var(--text-muted, #cccccc);
    font-size: 0.8rem;
    line-height: 1.4;
}

.private-message-container {
    background: var(--card-dark, #2a2a2a);
    border: 1px solid var(--border-color, #444);
    border-radius: 12px;
    overflow: hidden;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.pm-header {
    background: var(--input-dark, #3a3a3a);
    padding: 1rem;
    border-bottom: 1px solid var(--border-color, #444);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.pm-header h3 {
    color: var(--primary-color, #FF0000);
    margin: 0;
    font-size: 1.1rem;
}

.pm-controls {
    display: flex;
    gap: 0.5rem;
}

.pm-btn {
    background: var(--primary-color, #FF0000);
    border: none;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: background 0.2s ease;
}

.pm-btn:hover {
    background: #cc0000;
}

.pm-btn.secondary {
    background: var(--input-dark, #3a3a3a);
    border: 1px solid var(--border-color, #444);
}

.pm-btn.secondary:hover {
    background: #4a4a4a;
}

.pm-content {
    flex: 1;
    display: flex;
    overflow: hidden;
}

.pm-sidebar {
    width: 300px;
    background: var(--input-dark, #3a3a3a);
    border-right: 1px solid var(--border-color, #444);
    display: flex;
    flex-direction: column;
}

.pm-conversation-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
}

.pm-conversation-item {
    background: var(--bg-dark, #1a1a1a);
    border: 1px solid var(--border-color, #444);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
}

.pm-conversation-item:hover {
    background: var(--card-dark, #2a2a2a);
    transform: translateY(-1px);
}

.pm-conversation-item.active {
    background: var(--primary-color, #FF0000);
    color: white;
}

.pm-conversation-item.active .conversation-name,
.pm-conversation-item.active .conversation-preview,
.pm-conversation-item.active .conversation-time {
    color: white;
}

.conversation-name {
    color: var(--text-light, #ffffff);
    font-weight: 500;
    margin-bottom: 0.25rem;
}

.conversation-preview {
    color: var(--text-muted, #cccccc);
    font-size: 0.8rem;
    margin-bottom: 0.25rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.conversation-time {
    color: var(--text-muted, #cccccc);
    font-size: 0.7rem;
}

.conversation-unread {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: var(--primary-color, #FF0000);
    color: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    font-weight: bold;
}

.pm-conversation-item.active .conversation-unread {
    background: rgba(255, 255, 255, 0.3);
}

.pm-chat-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: var(--bg-dark, #1a1a1a);
}

.pm-chat-header {
    background: var(--card-dark, #2a2a2a);
    padding: 1rem;
    border-bottom: 1px solid var(--border-color, #444);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.pm-chat-title {
    color: var(--text-light, #ffffff);
    font-weight: 500;
    margin: 0;
}

.pm-chat-actions {
    display: flex;
    gap: 0.5rem;
}

.pm-messages {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.pm-message {
    display: flex;
    flex-direction: column;
    max-width: 70%;
}

.pm-message.sent {
    align-self: flex-end;
    align-items: flex-end;
}

.pm-message.received {
    align-self: flex-start;
    align-items: flex-start;
}

.pm-message-bubble {
    background: var(--card-dark, #2a2a2a);
    border: 1px solid var(--border-color, #444);
    border-radius: 12px;
    padding: 0.75rem 1rem;
    position: relative;
    word-wrap: break-word;
}

.pm-message.sent .pm-message-bubble {
    background: var(--primary-color, #FF0000);
    color: white;
    border-color: var(--primary-color, #FF0000);
}

.pm-message.received .pm-message-bubble {
    background: var(--input-dark, #3a3a3a);
    color: var(--text-light, #ffffff);
}

.pm-message-content {
    margin-bottom: 0.25rem;
    line-height: 1.4;
}

.pm-message-time {
    font-size: 0.7rem;
    opacity: 0.7;
    margin-top: 0.25rem;
}

.pm-message.sent .pm-message-time {
    color: rgba(255, 255, 255, 0.8);
}

.pm-message.received .pm-message-time {
    color: var(--text-muted, #cccccc);
}

.pm-message.deleted .pm-message-content {
    font-style: italic;
    opacity: 0.6;
}

.pm-input-area {
    background: var(--card-dark, #2a2a2a);
    border-top: 1px solid var(--border-color, #444);
    padding: 1rem;
}

.pm-input-container {
    display: flex;
    gap: 0.5rem;
    align-items: flex-end;
}

.pm-input {
    flex: 1;
    background: var(--input-dark, #3a3a3a);
    border: 1px solid var(--border-color, #444);
    color: var(--text-light, #ffffff);
    border-radius: 8px;
    padding: 0.75rem;
    resize: none;
    min-height: 40px;
    max-height: 120px;
    font-family: inherit;
    font-size: 0.9rem;
}

.pm-input:focus {
    outline: none;
    border-color: var(--primary-color, #FF0000);
}

.pm-input::placeholder {
    color: var(--text-muted, #cccccc);
}

.pm-send-btn {
    background: var(--primary-color, #FF0000);
    border: none;
    color: white;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.pm-send-btn:hover:not(:disabled) {
    background: #cc0000;
}

.pm-send-btn:disabled {
    background: #666;
    cursor: not-allowed;
}

.pm-empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--text-muted, #cccccc);
    text-align: center;
    padding: 2rem;
}

.pm-empty-state i {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
}

.pm-empty-state h3 {
    color: var(--text-light, #ffffff);
    margin-bottom: 0.5rem;
}

/* Mobile Responsive */
@media (max-width: 768px) {
    .pm-sidebar {
        width: 100%;
        position: absolute;
        top: 0;
        left: 0;
        z-index: 10;
        transform: translateX(-100%);
        transition: transform 0.3s ease;
    }

    .pm-sidebar.open {
        transform: translateX(0);
    }

    .pm-chat-area {
        width: 100%;
    }

    .pm-notification {
        right: 10px;
        left: 10px;
        max-width: none;
        transform: translateY(-100%);
    }

    .pm-notification.show {
        transform: translateY(0);
    }

    .pm-message {
        max-width: 85%;
    }
}
</style>
`;

// Inject styles into document head
if (typeof document !== 'undefined') {
    const styleElement = document.createElement('div');
    styleElement.innerHTML = privateMessageStyles;
    document.head.appendChild(styleElement.firstElementChild);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PrivateMessageInterface;
} else if (typeof window !== 'undefined') {
    window.PrivateMessageInterface = PrivateMessageInterface;
}
