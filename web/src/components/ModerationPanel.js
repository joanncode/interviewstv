/**
 * Moderation Panel Component
 * Comprehensive chat moderation interface for admins and moderators
 */
class ModerationPanel {
    constructor(options = {}) {
        this.container = options.container;
        this.websocket = options.websocket || null;
        this.currentRoom = options.currentRoom || null;
        this.userRole = options.userRole || 'guest';
        this.onAction = options.onAction || (() => {});
        
        this.moderationStats = null;
        this.userHistory = {};
        this.isVisible = false;
        
        this.init();
    }
    
    init() {
        if (!this.hasModeratorPermissions()) {
            console.warn('User does not have moderation permissions');
            return;
        }
        
        this.createModerationPanel();
        this.attachEventListeners();
        this.loadModerationStats();
    }
    
    hasModeratorPermissions() {
        return ['admin', 'moderator', 'host'].includes(this.userRole);
    }
    
    createModerationPanel() {
        if (!this.container) return;
        
        const panelHTML = `
            <div class="moderation-panel" id="moderation-panel" style="display: none;">
                <div class="moderation-header">
                    <h4><i class="fas fa-shield-alt me-2"></i>Moderation Panel</h4>
                    <button class="close-panel" id="close-moderation-panel">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="moderation-content">
                    <!-- Quick Actions -->
                    <div class="moderation-section">
                        <h5>Quick Actions</h5>
                        <div class="quick-actions">
                            <button class="mod-btn mod-btn-warning" data-action="clear-chat">
                                <i class="fas fa-broom"></i> Clear Chat
                            </button>
                            <button class="mod-btn mod-btn-info" data-action="slow-mode">
                                <i class="fas fa-clock"></i> Slow Mode
                            </button>
                            <button class="mod-btn mod-btn-secondary" data-action="followers-only">
                                <i class="fas fa-users"></i> Followers Only
                            </button>
                        </div>
                    </div>
                    
                    <!-- User Actions -->
                    <div class="moderation-section">
                        <h5>User Actions</h5>
                        <div class="user-action-form">
                            <div class="form-group">
                                <label>Target User ID:</label>
                                <input type="text" id="target-user-id" class="form-control" placeholder="Enter user ID">
                            </div>
                            <div class="form-group">
                                <label>Reason:</label>
                                <input type="text" id="moderation-reason" class="form-control" placeholder="Reason for action">
                            </div>
                            <div class="form-group">
                                <label>Duration (seconds):</label>
                                <select id="moderation-duration" class="form-control">
                                    <option value="60">1 minute</option>
                                    <option value="300" selected>5 minutes</option>
                                    <option value="600">10 minutes</option>
                                    <option value="1800">30 minutes</option>
                                    <option value="3600">1 hour</option>
                                    <option value="86400">24 hours</option>
                                </select>
                            </div>
                            <div class="action-buttons">
                                <button class="mod-btn mod-btn-warning" data-action="mute">
                                    <i class="fas fa-volume-mute"></i> Mute
                                </button>
                                <button class="mod-btn mod-btn-danger" data-action="ban">
                                    <i class="fas fa-ban"></i> Ban
                                </button>
                                <button class="mod-btn mod-btn-info" data-action="warn">
                                    <i class="fas fa-exclamation-triangle"></i> Warn
                                </button>
                                <button class="mod-btn mod-btn-success" data-action="unmute">
                                    <i class="fas fa-volume-up"></i> Unmute
                                </button>
                                <button class="mod-btn mod-btn-success" data-action="unban">
                                    <i class="fas fa-check"></i> Unban
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Statistics -->
                    <div class="moderation-section">
                        <h5>Statistics (Last 7 Days)</h5>
                        <div class="stats-grid" id="moderation-stats">
                            <div class="stat-item">
                                <div class="stat-value" id="total-actions">0</div>
                                <div class="stat-label">Total Actions</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value" id="total-mutes">0</div>
                                <div class="stat-label">Mutes</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value" id="total-bans">0</div>
                                <div class="stat-label">Bans</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value" id="total-warnings">0</div>
                                <div class="stat-label">Warnings</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- User History -->
                    <div class="moderation-section">
                        <h5>User History</h5>
                        <div class="user-history-form">
                            <div class="input-group">
                                <input type="text" id="history-user-id" class="form-control" placeholder="Enter user ID">
                                <button class="btn btn-primary" id="load-user-history">
                                    <i class="fas fa-search"></i> Load History
                                </button>
                            </div>
                        </div>
                        <div class="user-history-display" id="user-history-display">
                            <p class="text-muted">Enter a user ID to view their moderation history</p>
                        </div>
                    </div>
                    
                    <!-- Recent Actions -->
                    <div class="moderation-section">
                        <h5>Recent Actions</h5>
                        <div class="recent-actions" id="recent-actions">
                            <p class="text-muted">No recent actions</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.container.innerHTML = panelHTML;
    }
    
    attachEventListeners() {
        // Close panel
        const closeBtn = this.container.querySelector('#close-moderation-panel');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hide();
            });
        }
        
        // Quick actions
        this.container.querySelectorAll('.quick-actions .mod-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleQuickAction(action);
            });
        });
        
        // User actions
        this.container.querySelectorAll('.action-buttons .mod-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleUserAction(action);
            });
        });
        
        // Load user history
        const loadHistoryBtn = this.container.querySelector('#load-user-history');
        if (loadHistoryBtn) {
            loadHistoryBtn.addEventListener('click', () => {
                this.loadUserHistory();
            });
        }
        
        // Enter key for user history
        const historyInput = this.container.querySelector('#history-user-id');
        if (historyInput) {
            historyInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.loadUserHistory();
                }
            });
        }
        
        // WebSocket message handlers
        if (this.websocket) {
            this.websocket.addEventListener('message', (event) => {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            });
        }
    }
    
    handleQuickAction(action) {
        switch (action) {
            case 'clear-chat':
                this.clearChat();
                break;
            case 'slow-mode':
                this.toggleSlowMode();
                break;
            case 'followers-only':
                this.toggleFollowersOnly();
                break;
        }
    }
    
    handleUserAction(action) {
        const targetUserId = this.container.querySelector('#target-user-id').value.trim();
        const reason = this.container.querySelector('#moderation-reason').value.trim();
        const duration = parseInt(this.container.querySelector('#moderation-duration').value);
        
        if (!targetUserId) {
            this.showError('Please enter a target user ID');
            return;
        }
        
        if (!reason && ['mute', 'ban', 'warn'].includes(action)) {
            this.showError('Please provide a reason for this action');
            return;
        }
        
        this.executeUserAction(action, targetUserId, reason, duration);
    }
    
    executeUserAction(action, targetUserId, reason, duration) {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            this.showError('WebSocket connection not available');
            return;
        }
        
        const message = {
            type: 'moderate_user',
            action: action,
            target_user_id: targetUserId,
            reason: reason,
            duration: duration,
            room_id: this.currentRoom
        };
        
        if (action === 'ban') {
            message.permanent = duration >= 86400; // 24 hours or more = permanent
        }
        
        this.websocket.send(JSON.stringify(message));
        
        // Clear form
        this.container.querySelector('#target-user-id').value = '';
        this.container.querySelector('#moderation-reason').value = '';
        
        this.showSuccess(`${action} action sent for user ${targetUserId}`);
    }
    
    clearChat() {
        // Implementation for clearing chat
        this.showInfo('Chat clear functionality would be implemented here');
    }
    
    toggleSlowMode() {
        // Implementation for slow mode
        this.showInfo('Slow mode toggle functionality would be implemented here');
    }
    
    toggleFollowersOnly() {
        // Implementation for followers only mode
        this.showInfo('Followers only mode functionality would be implemented here');
    }
    
    loadModerationStats() {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            return;
        }
        
        this.websocket.send(JSON.stringify({
            type: 'get_moderation_stats',
            room_id: this.currentRoom,
            days: 7
        }));
    }
    
    loadUserHistory() {
        const userId = this.container.querySelector('#history-user-id').value.trim();
        
        if (!userId) {
            this.showError('Please enter a user ID');
            return;
        }
        
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            this.showError('WebSocket connection not available');
            return;
        }
        
        this.websocket.send(JSON.stringify({
            type: 'get_user_history',
            user_id: userId
        }));
    }
    
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'moderation_stats':
                this.updateModerationStats(data.data);
                break;
            case 'user_history':
                this.displayUserHistory(data.user_id, data.data);
                break;
            case 'moderation_success':
                this.showSuccess(`${data.action} action completed successfully`);
                this.addRecentAction(data);
                this.loadModerationStats(); // Refresh stats
                break;
            case 'moderation_action':
                this.addRecentAction(data);
                break;
            case 'error':
                this.showError(data.message);
                break;
        }
    }
    
    updateModerationStats(stats) {
        this.moderationStats = stats;
        
        const elements = {
            'total-actions': stats.total_actions || 0,
            'total-mutes': stats.mutes || 0,
            'total-bans': stats.bans || 0,
            'total-warnings': stats.warnings || 0
        };
        
        for (const [id, value] of Object.entries(elements)) {
            const element = this.container.querySelector(`#${id}`);
            if (element) {
                element.textContent = value;
            }
        }
    }
    
    displayUserHistory(userId, history) {
        const display = this.container.querySelector('#user-history-display');
        if (!display) return;
        
        if (!history || history.total_violations === 0) {
            display.innerHTML = `
                <div class="user-history-clean">
                    <i class="fas fa-check-circle text-success"></i>
                    <p>User ${userId} has a clean record</p>
                </div>
            `;
            return;
        }
        
        const recentViolations = history.violations.slice(-5); // Last 5 violations
        
        let historyHTML = `
            <div class="user-history-summary">
                <h6>User: ${userId}</h6>
                <div class="history-stats">
                    <span class="badge bg-warning">Warnings: ${history.warning_count}</span>
                    <span class="badge bg-danger">Total Violations: ${history.total_violations}</span>
                    <span class="badge bg-info">Reputation: ${Math.round(history.reputation_score)}</span>
                </div>
            </div>
            <div class="recent-violations">
                <h6>Recent Violations:</h6>
        `;
        
        recentViolations.forEach(violation => {
            const date = new Date(violation.timestamp * 1000).toLocaleString();
            historyHTML += `
                <div class="violation-item">
                    <div class="violation-date">${date}</div>
                    <div class="violation-score">Score: ${violation.score}</div>
                    <div class="violation-type">${violation.type}</div>
                </div>
            `;
        });
        
        historyHTML += '</div>';
        display.innerHTML = historyHTML;
    }
    
    addRecentAction(actionData) {
        const recentActions = this.container.querySelector('#recent-actions');
        if (!recentActions) return;
        
        const timestamp = new Date(actionData.timestamp * 1000).toLocaleString();
        const actionHTML = `
            <div class="recent-action-item">
                <div class="action-info">
                    <strong>${actionData.action}</strong> - User: ${actionData.target_user_id || 'N/A'}
                </div>
                <div class="action-details">
                    ${actionData.reason || 'No reason provided'} - ${timestamp}
                </div>
            </div>
        `;
        
        recentActions.insertAdjacentHTML('afterbegin', actionHTML);
        
        // Keep only last 10 actions
        const actions = recentActions.querySelectorAll('.recent-action-item');
        if (actions.length > 10) {
            actions[actions.length - 1].remove();
        }
        
        // Remove "no recent actions" message
        const noActionsMsg = recentActions.querySelector('.text-muted');
        if (noActionsMsg) {
            noActionsMsg.remove();
        }
    }
    
    show() {
        if (!this.hasModeratorPermissions()) {
            this.showError('You do not have moderation permissions');
            return;
        }
        
        const panel = this.container.querySelector('#moderation-panel');
        if (panel) {
            panel.style.display = 'block';
            this.isVisible = true;
            this.loadModerationStats();
        }
    }
    
    hide() {
        const panel = this.container.querySelector('#moderation-panel');
        if (panel) {
            panel.style.display = 'none';
            this.isVisible = false;
        }
    }
    
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showInfo(message) {
        this.showNotification(message, 'info');
    }
    
    showNotification(message, type) {
        // Create a simple notification system
        const notification = document.createElement('div');
        notification.className = `moderation-notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    // Update WebSocket connection
    setWebSocket(websocket) {
        this.websocket = websocket;
    }
    
    // Update current room
    setCurrentRoom(roomId) {
        this.currentRoom = roomId;
    }
    
    // Update user role
    setUserRole(role) {
        this.userRole = role;
        
        if (!this.hasModeratorPermissions() && this.isVisible) {
            this.hide();
        }
    }
    
    // Destroy component
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Add CSS styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('moderation-panel-styles')) {
    const styles = `
        <style id="moderation-panel-styles">
            .moderation-panel {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 90%;
                max-width: 800px;
                max-height: 90vh;
                background: var(--card-dark, #2a2a2a);
                border: 1px solid #555;
                border-radius: 12px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
                z-index: 1000;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }

            .moderation-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.5rem;
                background: var(--primary-color, #FF0000);
                color: white;
            }

            .moderation-header h4 {
                margin: 0;
                font-size: 1.2rem;
            }

            .close-panel {
                background: none;
                border: none;
                color: white;
                font-size: 1.2rem;
                cursor: pointer;
                padding: 0.5rem;
                border-radius: 4px;
                transition: background 0.2s ease;
            }

            .close-panel:hover {
                background: rgba(255, 255, 255, 0.2);
            }

            .moderation-content {
                flex: 1;
                overflow-y: auto;
                padding: 1.5rem;
            }

            .moderation-section {
                margin-bottom: 2rem;
                padding-bottom: 1.5rem;
                border-bottom: 1px solid #444;
            }

            .moderation-section:last-child {
                border-bottom: none;
                margin-bottom: 0;
            }

            .moderation-section h5 {
                color: var(--primary-color, #FF0000);
                margin-bottom: 1rem;
                font-size: 1.1rem;
            }

            .quick-actions {
                display: flex;
                gap: 0.75rem;
                flex-wrap: wrap;
            }

            .mod-btn {
                background: var(--input-dark, #3a3a3a);
                border: 1px solid #555;
                color: var(--text-light, #ffffff);
                padding: 0.5rem 1rem;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 0.9rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .mod-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                border-color: #777;
            }

            .mod-btn-warning {
                background: #f39c12;
                border-color: #f39c12;
            }

            .mod-btn-warning:hover {
                background: #e67e22;
            }

            .mod-btn-danger {
                background: #e74c3c;
                border-color: #e74c3c;
            }

            .mod-btn-danger:hover {
                background: #c0392b;
            }

            .mod-btn-success {
                background: #27ae60;
                border-color: #27ae60;
            }

            .mod-btn-success:hover {
                background: #229954;
            }

            .mod-btn-info {
                background: #3498db;
                border-color: #3498db;
            }

            .mod-btn-info:hover {
                background: #2980b9;
            }

            .mod-btn-secondary {
                background: #95a5a6;
                border-color: #95a5a6;
            }

            .mod-btn-secondary:hover {
                background: #7f8c8d;
            }

            .user-action-form {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            .form-group {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }

            .form-group label {
                font-weight: 500;
                color: var(--text-light, #ffffff);
            }

            .form-control {
                background: var(--input-dark, #3a3a3a);
                border: 1px solid #555;
                color: var(--text-light, #ffffff);
                padding: 0.5rem;
                border-radius: 4px;
                font-size: 0.9rem;
            }

            .form-control:focus {
                outline: none;
                border-color: var(--primary-color, #FF0000);
            }

            .action-buttons {
                display: flex;
                gap: 0.5rem;
                flex-wrap: wrap;
            }

            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 1rem;
            }

            .stat-item {
                background: var(--input-dark, #3a3a3a);
                padding: 1rem;
                border-radius: 8px;
                text-align: center;
                border: 1px solid #555;
            }

            .stat-value {
                font-size: 1.5rem;
                font-weight: bold;
                color: var(--primary-color, #FF0000);
                margin-bottom: 0.25rem;
            }

            .stat-label {
                font-size: 0.8rem;
                color: var(--text-muted, #cccccc);
            }

            .user-history-form {
                margin-bottom: 1rem;
            }

            .input-group {
                display: flex;
                gap: 0.5rem;
            }

            .input-group .form-control {
                flex: 1;
            }

            .btn {
                background: var(--primary-color, #FF0000);
                border: 1px solid var(--primary-color, #FF0000);
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                cursor: pointer;
                transition: background 0.2s ease;
                font-size: 0.9rem;
            }

            .btn:hover {
                background: #cc0000;
            }

            .btn-primary {
                background: var(--primary-color, #FF0000);
                border-color: var(--primary-color, #FF0000);
            }

            .user-history-display {
                background: var(--input-dark, #3a3a3a);
                border: 1px solid #555;
                border-radius: 8px;
                padding: 1rem;
                min-height: 100px;
            }

            .user-history-clean {
                text-align: center;
                color: var(--text-muted, #cccccc);
            }

            .user-history-clean i {
                font-size: 2rem;
                margin-bottom: 0.5rem;
            }

            .user-history-summary {
                margin-bottom: 1rem;
                padding-bottom: 1rem;
                border-bottom: 1px solid #555;
            }

            .user-history-summary h6 {
                margin-bottom: 0.5rem;
                color: var(--text-light, #ffffff);
            }

            .history-stats {
                display: flex;
                gap: 0.5rem;
                flex-wrap: wrap;
            }

            .badge {
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
                font-size: 0.8rem;
                font-weight: 500;
            }

            .bg-warning {
                background: #f39c12;
                color: white;
            }

            .bg-danger {
                background: #e74c3c;
                color: white;
            }

            .bg-info {
                background: #3498db;
                color: white;
            }

            .recent-violations h6 {
                color: var(--text-light, #ffffff);
                margin-bottom: 0.75rem;
            }

            .violation-item {
                background: rgba(255, 255, 255, 0.05);
                padding: 0.75rem;
                border-radius: 6px;
                margin-bottom: 0.5rem;
                border-left: 3px solid var(--primary-color, #FF0000);
            }

            .violation-date {
                font-size: 0.8rem;
                color: var(--text-muted, #cccccc);
            }

            .violation-score {
                font-weight: 500;
                color: var(--primary-color, #FF0000);
            }

            .violation-type {
                font-size: 0.9rem;
                color: var(--text-light, #ffffff);
            }

            .recent-actions {
                max-height: 200px;
                overflow-y: auto;
            }

            .recent-action-item {
                background: rgba(255, 255, 255, 0.05);
                padding: 0.75rem;
                border-radius: 6px;
                margin-bottom: 0.5rem;
                border-left: 3px solid var(--primary-color, #FF0000);
            }

            .action-info {
                font-weight: 500;
                color: var(--text-light, #ffffff);
                margin-bottom: 0.25rem;
            }

            .action-details {
                font-size: 0.8rem;
                color: var(--text-muted, #cccccc);
            }

            .moderation-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 1rem 1.5rem;
                border-radius: 6px;
                color: white;
                font-weight: 500;
                z-index: 2000;
                transform: translateX(100%);
                transition: transform 0.3s ease;
            }

            .moderation-notification.show {
                transform: translateX(0);
            }

            .notification-success {
                background: #27ae60;
            }

            .notification-error {
                background: #e74c3c;
            }

            .notification-info {
                background: #3498db;
            }

            /* Mobile responsive */
            @media (max-width: 768px) {
                .moderation-panel {
                    width: 95%;
                    max-height: 95vh;
                }

                .moderation-header {
                    padding: 1rem;
                }

                .moderation-content {
                    padding: 1rem;
                }

                .quick-actions {
                    justify-content: center;
                }

                .action-buttons {
                    justify-content: center;
                }

                .stats-grid {
                    grid-template-columns: repeat(2, 1fr);
                }

                .input-group {
                    flex-direction: column;
                }
            }
        </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModerationPanel;
} else if (typeof window !== 'undefined') {
    window.ModerationPanel = ModerationPanel;
}
