/**
 * User Management Panel Component
 * Advanced user muting and banning interface with appeals system
 */
class UserManagementPanel {
    constructor(options = {}) {
        this.container = options.container;
        this.websocket = options.websocket || null;
        this.currentRoom = options.currentRoom || null;
        this.userRole = options.userRole || 'guest';
        this.onAction = options.onAction || (() => {});
        
        this.userList = [];
        this.selectedUser = null;
        this.moderationHistory = {};
        this.pendingAppeals = [];
        this.isVisible = false;
        
        this.init();
    }
    
    init() {
        if (!this.hasModeratorPermissions()) {
            console.warn('User does not have user management permissions');
            return;
        }
        
        this.createUserManagementPanel();
        this.attachEventListeners();
        this.loadUserList();
        this.loadPendingAppeals();
    }
    
    hasModeratorPermissions() {
        return ['admin', 'moderator', 'host'].includes(this.userRole);
    }
    
    createUserManagementPanel() {
        if (!this.container) return;
        
        const panelHTML = `
            <div class="user-management-panel" id="user-management-panel" style="display: none;">
                <div class="panel-header">
                    <h4><i class="fas fa-users-cog me-2"></i>User Management</h4>
                    <button class="close-panel" id="close-user-management">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="panel-content">
                    <!-- User Search and Filter -->
                    <div class="user-search-section">
                        <div class="search-controls">
                            <div class="input-group">
                                <input type="text" id="user-search" class="form-control" placeholder="Search users...">
                                <button class="btn btn-primary" id="search-users">
                                    <i class="fas fa-search"></i>
                                </button>
                            </div>
                            <select id="user-filter" class="form-control">
                                <option value="all">All Users</option>
                                <option value="online">Online Users</option>
                                <option value="muted">Muted Users</option>
                                <option value="banned">Banned Users</option>
                                <option value="flagged">Flagged Users</option>
                            </select>
                        </div>
                    </div>
                    
                    <!-- User List -->
                    <div class="user-list-section">
                        <h5>Users in Room</h5>
                        <div class="user-list" id="user-list">
                            <div class="loading-message">Loading users...</div>
                        </div>
                    </div>
                    
                    <!-- Selected User Details -->
                    <div class="user-details-section" id="user-details-section" style="display: none;">
                        <h5>User Details</h5>
                        <div class="user-details" id="user-details">
                            <!-- User details will be populated here -->
                        </div>
                        
                        <!-- Moderation Actions -->
                        <div class="moderation-actions">
                            <h6>Quick Actions</h6>
                            <div class="action-buttons">
                                <button class="action-btn btn-warning" data-action="mute">
                                    <i class="fas fa-volume-mute"></i> Mute
                                </button>
                                <button class="action-btn btn-danger" data-action="ban">
                                    <i class="fas fa-ban"></i> Ban
                                </button>
                                <button class="action-btn btn-info" data-action="warn">
                                    <i class="fas fa-exclamation-triangle"></i> Warn
                                </button>
                                <button class="action-btn btn-success" data-action="unmute">
                                    <i class="fas fa-volume-up"></i> Unmute
                                </button>
                                <button class="action-btn btn-success" data-action="unban">
                                    <i class="fas fa-check"></i> Unban
                                </button>
                            </div>
                            
                            <!-- Advanced Actions Form -->
                            <div class="advanced-actions" id="advanced-actions" style="display: none;">
                                <h6>Action Details</h6>
                                <div class="form-group">
                                    <label>Severity:</label>
                                    <select id="action-severity" class="form-control">
                                        <option value="warning">Warning</option>
                                        <option value="minor">Minor</option>
                                        <option value="moderate" selected>Moderate</option>
                                        <option value="major">Major</option>
                                        <option value="severe">Severe</option>
                                        <option value="extreme">Extreme</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Duration:</label>
                                    <select id="action-duration" class="form-control">
                                        <option value="60">1 minute</option>
                                        <option value="300">5 minutes</option>
                                        <option value="1800">30 minutes</option>
                                        <option value="3600">1 hour</option>
                                        <option value="86400">24 hours</option>
                                        <option value="604800">7 days</option>
                                        <option value="0">Permanent</option>
                                        <option value="custom">Custom</option>
                                    </select>
                                </div>
                                <div class="form-group" id="custom-duration-group" style="display: none;">
                                    <label>Custom Duration (seconds):</label>
                                    <input type="number" id="custom-duration" class="form-control" min="1">
                                </div>
                                <div class="form-group">
                                    <label>Reason:</label>
                                    <textarea id="action-reason" class="form-control" rows="3" placeholder="Reason for this action..."></textarea>
                                </div>
                                <div class="form-actions">
                                    <button class="btn btn-primary" id="execute-action">Execute Action</button>
                                    <button class="btn btn-secondary" id="cancel-action">Cancel</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Appeals Management -->
                    <div class="appeals-section">
                        <h5>Pending Appeals <span class="badge bg-warning" id="appeals-count">0</span></h5>
                        <div class="appeals-list" id="appeals-list">
                            <div class="no-appeals-message">No pending appeals</div>
                        </div>
                    </div>
                    
                    <!-- Bulk Actions -->
                    <div class="bulk-actions-section">
                        <h5>Bulk Actions</h5>
                        <div class="bulk-controls">
                            <button class="btn btn-warning" id="clear-all-mutes">
                                <i class="fas fa-volume-up"></i> Clear All Mutes
                            </button>
                            <button class="btn btn-info" id="cleanup-expired">
                                <i class="fas fa-broom"></i> Cleanup Expired
                            </button>
                            <button class="btn btn-secondary" id="export-logs">
                                <i class="fas fa-download"></i> Export Logs
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.container.innerHTML = panelHTML;
    }
    
    attachEventListeners() {
        // Close panel
        const closeBtn = this.container.querySelector('#close-user-management');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hide();
            });
        }
        
        // Search functionality
        const searchBtn = this.container.querySelector('#search-users');
        const searchInput = this.container.querySelector('#user-search');
        const filterSelect = this.container.querySelector('#user-filter');
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.searchUsers();
            });
        }
        
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchUsers();
                }
            });
        }
        
        if (filterSelect) {
            filterSelect.addEventListener('change', () => {
                this.filterUsers();
            });
        }
        
        // Action buttons
        this.container.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.showAdvancedActions(action);
            });
        });
        
        // Advanced actions
        const executeBtn = this.container.querySelector('#execute-action');
        const cancelBtn = this.container.querySelector('#cancel-action');
        const durationSelect = this.container.querySelector('#action-duration');
        
        if (executeBtn) {
            executeBtn.addEventListener('click', () => {
                this.executeAdvancedAction();
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hideAdvancedActions();
            });
        }
        
        if (durationSelect) {
            durationSelect.addEventListener('change', (e) => {
                const customGroup = this.container.querySelector('#custom-duration-group');
                if (e.target.value === 'custom') {
                    customGroup.style.display = 'block';
                } else {
                    customGroup.style.display = 'none';
                }
            });
        }
        
        // Bulk actions
        const clearMutesBtn = this.container.querySelector('#clear-all-mutes');
        const cleanupBtn = this.container.querySelector('#cleanup-expired');
        const exportBtn = this.container.querySelector('#export-logs');
        
        if (clearMutesBtn) {
            clearMutesBtn.addEventListener('click', () => {
                this.clearAllMutes();
            });
        }
        
        if (cleanupBtn) {
            cleanupBtn.addEventListener('click', () => {
                this.cleanupExpired();
            });
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportLogs();
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
    
    loadUserList() {
        // Mock user list for demo - in real implementation, this would come from WebSocket
        this.userList = [
            {
                user_id: 'user1',
                username: 'JohnDoe',
                role: 'participant',
                online: true,
                is_muted: false,
                is_banned: false,
                reputation_score: 85,
                join_time: Date.now() - 300000
            },
            {
                user_id: 'user2',
                username: 'SpamBot',
                role: 'guest',
                online: true,
                is_muted: true,
                is_banned: false,
                reputation_score: 25,
                join_time: Date.now() - 600000
            },
            {
                user_id: 'user3',
                username: 'TrollUser',
                role: 'guest',
                online: false,
                is_muted: false,
                is_banned: true,
                reputation_score: 10,
                join_time: Date.now() - 1200000
            }
        ];
        
        this.renderUserList();
    }
    
    renderUserList() {
        const userListContainer = this.container.querySelector('#user-list');
        if (!userListContainer) return;
        
        if (this.userList.length === 0) {
            userListContainer.innerHTML = '<div class="no-users-message">No users found</div>';
            return;
        }
        
        let userListHTML = '';
        
        this.userList.forEach(user => {
            const statusBadges = [];
            if (user.online) statusBadges.push('<span class="badge bg-success">Online</span>');
            if (user.is_muted) statusBadges.push('<span class="badge bg-warning">Muted</span>');
            if (user.is_banned) statusBadges.push('<span class="badge bg-danger">Banned</span>');
            if (user.reputation_score < 50) statusBadges.push('<span class="badge bg-secondary">Low Rep</span>');
            
            const reputationColor = user.reputation_score >= 80 ? 'success' : 
                                   user.reputation_score >= 50 ? 'warning' : 'danger';
            
            userListHTML += `
                <div class="user-item" data-user-id="${user.user_id}">
                    <div class="user-info">
                        <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
                        <div class="user-details">
                            <div class="user-name">${user.username}</div>
                            <div class="user-meta">
                                <span class="user-role">${user.role}</span>
                                <span class="user-reputation text-${reputationColor}">Rep: ${user.reputation_score}</span>
                            </div>
                            <div class="user-status">
                                ${statusBadges.join(' ')}
                            </div>
                        </div>
                    </div>
                    <div class="user-actions">
                        <button class="btn btn-sm btn-outline-primary" onclick="userManagementPanel.selectUser('${user.user_id}')">
                            <i class="fas fa-cog"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        userListContainer.innerHTML = userListHTML;
    }
    
    selectUser(userId) {
        const user = this.userList.find(u => u.user_id === userId);
        if (!user) return;
        
        this.selectedUser = user;
        this.showUserDetails(user);
        this.loadUserModerationHistory(userId);
    }
    
    showUserDetails(user) {
        const detailsSection = this.container.querySelector('#user-details-section');
        const detailsContainer = this.container.querySelector('#user-details');
        
        if (!detailsSection || !detailsContainer) return;
        
        const joinTime = new Date(user.join_time).toLocaleString();
        const reputationColor = user.reputation_score >= 80 ? 'success' : 
                               user.reputation_score >= 50 ? 'warning' : 'danger';
        
        const detailsHTML = `
            <div class="user-profile">
                <div class="profile-header">
                    <div class="profile-avatar">${user.username.charAt(0).toUpperCase()}</div>
                    <div class="profile-info">
                        <h6>${user.username}</h6>
                        <div class="profile-meta">
                            <span class="badge bg-info">${user.role}</span>
                            <span class="badge bg-${reputationColor}">Rep: ${user.reputation_score}</span>
                            ${user.online ? '<span class="badge bg-success">Online</span>' : '<span class="badge bg-secondary">Offline</span>'}
                        </div>
                    </div>
                </div>
                
                <div class="profile-stats">
                    <div class="stat-item">
                        <div class="stat-label">Joined</div>
                        <div class="stat-value">${joinTime}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Status</div>
                        <div class="stat-value">
                            ${user.is_muted ? '<span class="text-warning">Muted</span>' : ''}
                            ${user.is_banned ? '<span class="text-danger">Banned</span>' : ''}
                            ${!user.is_muted && !user.is_banned ? '<span class="text-success">Good Standing</span>' : ''}
                        </div>
                    </div>
                </div>
                
                <div class="moderation-history" id="user-moderation-history">
                    <h6>Loading moderation history...</h6>
                </div>
            </div>
        `;
        
        detailsContainer.innerHTML = detailsHTML;
        detailsSection.style.display = 'block';
    }
    
    loadUserModerationHistory(userId) {
        // Mock moderation history - in real implementation, this would come from WebSocket
        const mockHistory = {
            total_violations: 3,
            warning_count: 2,
            reputation_score: this.selectedUser.reputation_score,
            violations: [
                {
                    type: 'mute',
                    timestamp: Date.now() - 86400000,
                    reason: 'Spam messages',
                    duration: 300,
                    moderator: 'admin'
                },
                {
                    type: 'warn',
                    timestamp: Date.now() - 172800000,
                    reason: 'Inappropriate language',
                    moderator: 'moderator1'
                }
            ]
        };
        
        this.displayModerationHistory(mockHistory);
    }
    
    displayModerationHistory(history) {
        const historyContainer = this.container.querySelector('#user-moderation-history');
        if (!historyContainer) return;
        
        if (history.total_violations === 0) {
            historyContainer.innerHTML = `
                <h6>Moderation History</h6>
                <div class="clean-record">
                    <i class="fas fa-check-circle text-success"></i>
                    <p>Clean record - no violations</p>
                </div>
            `;
            return;
        }
        
        let historyHTML = `
            <h6>Moderation History</h6>
            <div class="history-summary">
                <div class="summary-stats">
                    <span class="badge bg-warning">Warnings: ${history.warning_count}</span>
                    <span class="badge bg-danger">Total Violations: ${history.total_violations}</span>
                </div>
            </div>
            <div class="violations-list">
        `;
        
        history.violations.slice(-5).forEach(violation => {
            const date = new Date(violation.timestamp).toLocaleString();
            const typeIcon = violation.type === 'mute' ? 'volume-mute' : 
                           violation.type === 'ban' ? 'ban' : 'exclamation-triangle';
            
            historyHTML += `
                <div class="violation-item">
                    <div class="violation-header">
                        <i class="fas fa-${typeIcon}"></i>
                        <strong>${violation.type.toUpperCase()}</strong>
                        <span class="violation-date">${date}</span>
                    </div>
                    <div class="violation-details">
                        <div class="violation-reason">${violation.reason}</div>
                        <div class="violation-meta">
                            By: ${violation.moderator}
                            ${violation.duration ? ` | Duration: ${this.formatDuration(violation.duration)}` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        
        historyHTML += '</div>';
        historyContainer.innerHTML = historyHTML;
    }
    
    formatDuration(seconds) {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
        return `${Math.floor(seconds / 86400)}d`;
    }
    
    showAdvancedActions(action) {
        this.currentAction = action;
        const advancedActions = this.container.querySelector('#advanced-actions');
        if (advancedActions) {
            advancedActions.style.display = 'block';
            
            // Set default values based on action
            const severitySelect = this.container.querySelector('#action-severity');
            const durationSelect = this.container.querySelector('#action-duration');
            
            if (action === 'warn') {
                severitySelect.value = 'warning';
                durationSelect.style.display = 'none';
            } else {
                durationSelect.style.display = 'block';
            }
        }
    }
    
    hideAdvancedActions() {
        const advancedActions = this.container.querySelector('#advanced-actions');
        if (advancedActions) {
            advancedActions.style.display = 'none';
        }
        this.currentAction = null;
    }
    
    executeAdvancedAction() {
        if (!this.selectedUser || !this.currentAction) return;
        
        const severity = this.container.querySelector('#action-severity').value;
        const durationSelect = this.container.querySelector('#action-duration');
        const customDuration = this.container.querySelector('#custom-duration').value;
        const reason = this.container.querySelector('#action-reason').value;
        
        let duration = parseInt(durationSelect.value);
        if (duration === 'custom') {
            duration = parseInt(customDuration);
        }
        
        if (!reason.trim()) {
            this.showError('Please provide a reason for this action');
            return;
        }
        
        const actionData = {
            type: 'user_moderation_action',
            action: this.currentAction,
            target_user_id: this.selectedUser.user_id,
            severity: severity,
            duration: duration,
            reason: reason,
            room_id: this.currentRoom
        };
        
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify(actionData));
        }
        
        this.hideAdvancedActions();
        this.showSuccess(`${this.currentAction} action executed for ${this.selectedUser.username}`);
    }
    
    searchUsers() {
        const searchTerm = this.container.querySelector('#user-search').value.toLowerCase();
        
        if (!searchTerm) {
            this.loadUserList();
            return;
        }
        
        this.userList = this.userList.filter(user => 
            user.username.toLowerCase().includes(searchTerm) ||
            user.user_id.toLowerCase().includes(searchTerm)
        );
        
        this.renderUserList();
    }
    
    filterUsers() {
        const filter = this.container.querySelector('#user-filter').value;
        
        // Reset to full list first
        this.loadUserList();
        
        switch (filter) {
            case 'online':
                this.userList = this.userList.filter(user => user.online);
                break;
            case 'muted':
                this.userList = this.userList.filter(user => user.is_muted);
                break;
            case 'banned':
                this.userList = this.userList.filter(user => user.is_banned);
                break;
            case 'flagged':
                this.userList = this.userList.filter(user => user.reputation_score < 50);
                break;
        }
        
        this.renderUserList();
    }
    
    loadPendingAppeals() {
        // Mock pending appeals
        this.pendingAppeals = [
            {
                appeal_id: 'appeal1',
                user_id: 'user2',
                username: 'SpamBot',
                violation_type: 'mute',
                reason: 'I was not spamming, just excited about the topic',
                submitted_at: Date.now() - 3600000
            }
        ];
        
        this.renderPendingAppeals();
    }
    
    renderPendingAppeals() {
        const appealsContainer = this.container.querySelector('#appeals-list');
        const appealsCount = this.container.querySelector('#appeals-count');
        
        if (!appealsContainer || !appealsCount) return;
        
        appealsCount.textContent = this.pendingAppeals.length;
        
        if (this.pendingAppeals.length === 0) {
            appealsContainer.innerHTML = '<div class="no-appeals-message">No pending appeals</div>';
            return;
        }
        
        let appealsHTML = '';
        
        this.pendingAppeals.forEach(appeal => {
            const submitTime = new Date(appeal.submitted_at).toLocaleString();
            
            appealsHTML += `
                <div class="appeal-item">
                    <div class="appeal-header">
                        <strong>${appeal.username}</strong>
                        <span class="appeal-type badge bg-info">${appeal.violation_type}</span>
                        <span class="appeal-time">${submitTime}</span>
                    </div>
                    <div class="appeal-reason">${appeal.reason}</div>
                    <div class="appeal-actions">
                        <button class="btn btn-sm btn-success" onclick="userManagementPanel.reviewAppeal('${appeal.appeal_id}', 'approved')">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="userManagementPanel.reviewAppeal('${appeal.appeal_id}', 'denied')">
                            <i class="fas fa-times"></i> Deny
                        </button>
                    </div>
                </div>
            `;
        });
        
        appealsContainer.innerHTML = appealsHTML;
    }
    
    reviewAppeal(appealId, decision) {
        const reason = prompt(`Please provide a reason for ${decision} this appeal:`);
        if (!reason) return;
        
        const reviewData = {
            type: 'review_appeal',
            appeal_id: appealId,
            decision: decision,
            reason: reason
        };
        
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify(reviewData));
        }
        
        // Remove from pending appeals
        this.pendingAppeals = this.pendingAppeals.filter(appeal => appeal.appeal_id !== appealId);
        this.renderPendingAppeals();
        
        this.showSuccess(`Appeal ${decision}`);
    }
    
    clearAllMutes() {
        if (!confirm('Are you sure you want to clear all active mutes?')) return;
        
        const clearData = {
            type: 'bulk_action',
            action: 'clear_all_mutes',
            room_id: this.currentRoom
        };
        
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify(clearData));
        }
        
        this.showSuccess('All mutes cleared');
    }
    
    cleanupExpired() {
        const cleanupData = {
            type: 'bulk_action',
            action: 'cleanup_expired'
        };
        
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify(cleanupData));
        }
        
        this.showSuccess('Expired violations cleaned up');
    }
    
    exportLogs() {
        this.showInfo('Log export functionality would be implemented here');
    }
    
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'user_list_update':
                this.userList = data.users;
                this.renderUserList();
                break;
            case 'user_moderation_success':
                this.showSuccess(`Action completed: ${data.action}`);
                this.loadUserList(); // Refresh user list
                break;
            case 'appeal_submitted':
                this.pendingAppeals.push(data.appeal);
                this.renderPendingAppeals();
                break;
            case 'error':
                this.showError(data.message);
                break;
        }
    }
    
    show() {
        if (!this.hasModeratorPermissions()) {
            this.showError('You do not have user management permissions');
            return;
        }
        
        const panel = this.container.querySelector('#user-management-panel');
        if (panel) {
            panel.style.display = 'block';
            this.isVisible = true;
            this.loadUserList();
            this.loadPendingAppeals();
        }
    }
    
    hide() {
        const panel = this.container.querySelector('#user-management-panel');
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
        notification.className = `user-management-notification notification-${type}`;
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

// CSS Styles for User Management Panel
const userManagementStyles = `
<style>
.user-management-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 1200px;
    height: 80vh;
    background: var(--card-dark, #2a2a2a);
    border: 1px solid #444;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.user-management-panel .panel-header {
    background: var(--primary-color, #FF0000);
    color: white;
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 12px 12px 0 0;
}

.user-management-panel .panel-header h4 {
    margin: 0;
    font-size: 1.2rem;
}

.user-management-panel .close-panel {
    background: none;
    border: none;
    color: white;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 4px;
    transition: background 0.2s ease;
}

.user-management-panel .close-panel:hover {
    background: rgba(255, 255, 255, 0.2);
}

.user-management-panel .panel-content {
    flex: 1;
    padding: 1.5rem;
    overflow-y: auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    grid-template-rows: auto 1fr auto;
}

.user-search-section {
    grid-column: 1 / -1;
}

.user-search-section .search-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
}

.user-search-section .input-group {
    flex: 1;
    display: flex;
}

.user-search-section .form-control {
    background: var(--input-dark, #3a3a3a);
    border: 1px solid #555;
    color: var(--text-light, #ffffff);
    border-radius: 8px 0 0 8px;
}

.user-search-section .btn {
    border-radius: 0 8px 8px 0;
}

.user-search-section select {
    background: var(--input-dark, #3a3a3a);
    border: 1px solid #555;
    color: var(--text-light, #ffffff);
    border-radius: 8px;
    padding: 0.5rem;
    min-width: 150px;
}

.user-list-section {
    grid-column: 1;
}

.user-list-section h5 {
    color: var(--text-light, #ffffff);
    margin-bottom: 1rem;
    border-bottom: 2px solid var(--primary-color, #FF0000);
    padding-bottom: 0.5rem;
}

.user-list {
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid #444;
    border-radius: 8px;
    background: var(--input-dark, #3a3a3a);
}

.user-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #555;
    transition: background 0.2s ease;
}

.user-item:hover {
    background: rgba(255, 255, 255, 0.05);
}

.user-item:last-child {
    border-bottom: none;
}

.user-info {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--primary-color, #FF0000);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 1.2rem;
}

.user-details .user-name {
    font-weight: 600;
    color: var(--text-light, #ffffff);
    margin-bottom: 0.25rem;
}

.user-details .user-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.9rem;
    margin-bottom: 0.25rem;
}

.user-details .user-role {
    color: var(--text-muted, #cccccc);
}

.user-details .user-reputation {
    font-weight: 500;
}

.user-details .user-status {
    display: flex;
    gap: 0.5rem;
}

.user-details-section {
    grid-column: 2;
}

.user-details-section h5 {
    color: var(--text-light, #ffffff);
    margin-bottom: 1rem;
    border-bottom: 2px solid var(--primary-color, #FF0000);
    padding-bottom: 0.5rem;
}

.user-profile {
    background: var(--input-dark, #3a3a3a);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
}

.profile-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
}

.profile-avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: var(--primary-color, #FF0000);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 1.5rem;
}

.profile-info h6 {
    color: var(--text-light, #ffffff);
    margin: 0 0 0.5rem 0;
    font-size: 1.2rem;
}

.profile-meta {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.profile-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
}

.stat-item {
    text-align: center;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
}

.stat-label {
    font-size: 0.8rem;
    color: var(--text-muted, #cccccc);
    margin-bottom: 0.25rem;
}

.stat-value {
    font-weight: 600;
    color: var(--text-light, #ffffff);
}

.moderation-actions {
    background: var(--input-dark, #3a3a3a);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
}

.moderation-actions h6 {
    color: var(--text-light, #ffffff);
    margin-bottom: 1rem;
}

.action-buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
}

.action-btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;
}

.action-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.advanced-actions {
    border-top: 1px solid #555;
    padding-top: 1rem;
}

.advanced-actions .form-group {
    margin-bottom: 1rem;
}

.advanced-actions label {
    display: block;
    color: var(--text-light, #ffffff);
    margin-bottom: 0.5rem;
    font-weight: 500;
}

.advanced-actions .form-control {
    background: var(--bg-dark, #1a1a1a);
    border: 1px solid #555;
    color: var(--text-light, #ffffff);
    border-radius: 6px;
    padding: 0.5rem;
    width: 100%;
}

.advanced-actions .form-control:focus {
    border-color: var(--primary-color, #FF0000);
    outline: none;
    box-shadow: 0 0 0 2px rgba(255, 0, 0, 0.2);
}

.form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
}

.moderation-history h6 {
    color: var(--text-light, #ffffff);
    margin-bottom: 1rem;
}

.clean-record {
    text-align: center;
    padding: 2rem;
    color: var(--text-muted, #cccccc);
}

.clean-record i {
    font-size: 2rem;
    margin-bottom: 1rem;
}

.history-summary {
    margin-bottom: 1rem;
}

.summary-stats {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.violations-list {
    max-height: 200px;
    overflow-y: auto;
}

.violation-item {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    padding: 1rem;
    margin-bottom: 0.5rem;
}

.violation-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    color: var(--text-light, #ffffff);
}

.violation-date {
    margin-left: auto;
    font-size: 0.8rem;
    color: var(--text-muted, #cccccc);
}

.violation-reason {
    color: var(--text-light, #ffffff);
    margin-bottom: 0.25rem;
}

.violation-meta {
    font-size: 0.8rem;
    color: var(--text-muted, #cccccc);
}

.appeals-section {
    grid-column: 1 / -1;
}

.appeals-section h5 {
    color: var(--text-light, #ffffff);
    margin-bottom: 1rem;
    border-bottom: 2px solid var(--primary-color, #FF0000);
    padding-bottom: 0.5rem;
}

.appeals-list {
    background: var(--input-dark, #3a3a3a);
    border-radius: 8px;
    padding: 1rem;
    max-height: 300px;
    overflow-y: auto;
}

.appeal-item {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    padding: 1rem;
    margin-bottom: 1rem;
}

.appeal-item:last-child {
    margin-bottom: 0;
}

.appeal-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.5rem;
    color: var(--text-light, #ffffff);
}

.appeal-time {
    margin-left: auto;
    font-size: 0.8rem;
    color: var(--text-muted, #cccccc);
}

.appeal-reason {
    color: var(--text-light, #ffffff);
    margin-bottom: 1rem;
    font-style: italic;
}

.appeal-actions {
    display: flex;
    gap: 0.5rem;
}

.bulk-actions-section {
    grid-column: 1 / -1;
}

.bulk-actions-section h5 {
    color: var(--text-light, #ffffff);
    margin-bottom: 1rem;
    border-bottom: 2px solid var(--primary-color, #FF0000);
    padding-bottom: 0.5rem;
}

.bulk-controls {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
}

.no-users-message,
.no-appeals-message {
    text-align: center;
    padding: 2rem;
    color: var(--text-muted, #cccccc);
    font-style: italic;
}

.loading-message {
    text-align: center;
    padding: 2rem;
    color: var(--text-muted, #cccccc);
}

.user-management-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 2000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
}

.user-management-notification.show {
    transform: translateX(0);
}

.notification-success {
    background: #28a745;
}

.notification-error {
    background: #dc3545;
}

.notification-info {
    background: #17a2b8;
}

/* Mobile Responsive */
@media (max-width: 768px) {
    .user-management-panel {
        width: 95%;
        height: 90vh;
    }

    .user-management-panel .panel-content {
        grid-template-columns: 1fr;
        gap: 1rem;
        padding: 1rem;
    }

    .user-search-section .search-controls {
        flex-direction: column;
        gap: 0.5rem;
    }

    .action-buttons {
        justify-content: center;
    }

    .bulk-controls {
        justify-content: center;
    }

    .form-actions {
        justify-content: center;
    }
}
</style>
`;

// Inject styles into document head
if (typeof document !== 'undefined') {
    const styleElement = document.createElement('div');
    styleElement.innerHTML = userManagementStyles;
    document.head.appendChild(styleElement.firstElementChild);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserManagementPanel;
} else if (typeof window !== 'undefined') {
    window.UserManagementPanel = UserManagementPanel;
}
