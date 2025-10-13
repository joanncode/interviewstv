/**
 * User List Interface
 * Advanced user management with online status and presence awareness
 */
class UserListInterface {
    constructor(options = {}) {
        this.websocket = options.websocket || null;
        this.currentUserId = options.currentUserId || null;
        this.currentUserRole = options.currentUserRole || 'guest';
        this.roomId = options.roomId || 'default';
        this.container = options.container || null;
        this.onUserAction = options.onUserAction || (() => {});
        this.onUserStatusChange = options.onUserStatusChange || (() => {});
        
        // User state
        this.users = new Map(); // userId -> user data
        this.onlineUsers = new Set(); // Set of online user IDs
        this.userPresence = new Map(); // userId -> presence data
        this.userActivity = new Map(); // userId -> last activity timestamp
        this.userRoles = new Map(); // userId -> role
        
        // UI elements
        this.userListContainer = null;
        this.userSearchInput = null;
        this.userFilterSelect = null;
        this.userCountDisplay = null;
        
        // Settings
        this.settings = {
            showOnlineStatus: true,
            showUserRoles: true,
            showUserAvatars: true,
            showLastSeen: true,
            showTypingIndicators: true,
            sortBy: 'status', // 'status', 'name', 'role', 'activity'
            sortOrder: 'asc', // 'asc', 'desc'
            groupByRole: false,
            showUserActions: true,
            autoUpdatePresence: true,
            presenceUpdateInterval: 30000, // 30 seconds
            offlineTimeout: 60000, // 1 minute
            ...options.settings
        };
        
        // Presence tracking
        this.presenceUpdateTimer = null;
        this.lastPresenceUpdate = 0;
        
        this.init();
    }
    
    /**
     * Initialize the user list interface
     */
    init() {
        if (this.container) {
            this.createUserListInterface();
            this.attachEventListeners();
        }
        
        if (this.websocket) {
            this.attachWebSocketListeners();
        }
        
        this.loadUserListSettings();
        this.startPresenceTracking();
    }
    
    /**
     * Create user list interface
     */
    createUserListInterface() {
        // Find or create user list container
        this.userListContainer = this.container.querySelector('#user-list-panel');
        
        if (!this.userListContainer) {
            this.userListContainer = document.createElement('div');
            this.userListContainer.id = 'user-list-panel';
            this.userListContainer.className = 'user-list-panel';
            
            // Add to sidebar or create sidebar
            let sidebar = this.container.querySelector('.chat-sidebar');
            if (!sidebar) {
                sidebar = document.createElement('div');
                sidebar.className = 'chat-sidebar';
                this.container.appendChild(sidebar);
            }
            sidebar.appendChild(this.userListContainer);
        }
        
        this.createUserListContent();
    }
    
    /**
     * Create user list content
     */
    createUserListContent() {
        this.userListContainer.innerHTML = `
            <div class="user-list-header">
                <div class="user-list-title">
                    <i class="fas fa-users"></i>
                    <span>Participants</span>
                    <span class="user-count" id="user-count">0</span>
                </div>
                <div class="user-list-controls">
                    <button class="user-list-btn" id="user-list-settings-btn" title="User List Settings">
                        <i class="fas fa-cog"></i>
                    </button>
                    <button class="user-list-btn" id="refresh-users-btn" title="Refresh Users">
                        <i class="fas fa-sync"></i>
                    </button>
                </div>
            </div>
            
            <div class="user-list-filters">
                <div class="user-search-container">
                    <input 
                        type="text" 
                        class="user-search-input" 
                        id="user-search-input" 
                        placeholder="Search users..."
                        autocomplete="off"
                    >
                    <i class="fas fa-search user-search-icon"></i>
                </div>
                
                <div class="user-filter-container">
                    <select class="user-filter-select" id="user-filter-select">
                        <option value="all">All Users</option>
                        <option value="online">Online</option>
                        <option value="offline">Offline</option>
                        <option value="admin">Admins</option>
                        <option value="moderator">Moderators</option>
                        <option value="host">Hosts</option>
                        <option value="participant">Participants</option>
                        <option value="guest">Guests</option>
                    </select>
                </div>
            </div>
            
            <div class="user-list-content" id="user-list-content">
                <div class="user-list-empty">
                    <i class="fas fa-users"></i>
                    <p>No users found</p>
                </div>
            </div>
            
            <div class="user-list-footer">
                <div class="presence-status">
                    <div class="presence-indicator online"></div>
                    <span class="online-count" id="online-count">0</span>
                    <span>online</span>
                </div>
                <div class="user-list-actions">
                    <button class="user-action-btn" id="invite-users-btn" title="Invite Users">
                        <i class="fas fa-user-plus"></i>
                    </button>
                    <button class="user-action-btn" id="export-users-btn" title="Export User List">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Store references
        this.userSearchInput = this.userListContainer.querySelector('#user-search-input');
        this.userFilterSelect = this.userListContainer.querySelector('#user-filter-select');
        this.userCountDisplay = this.userListContainer.querySelector('#user-count');
        
        // Create user list settings panel
        this.createUserListSettingsPanel();
    }
    
    /**
     * Create user list settings panel
     */
    createUserListSettingsPanel() {
        const settingsPanel = document.createElement('div');
        settingsPanel.className = 'user-list-settings-panel';
        settingsPanel.id = 'user-list-settings-panel';
        settingsPanel.style.display = 'none';
        settingsPanel.innerHTML = `
            <div class="settings-header">
                <h4><i class="fas fa-cog me-2"></i>User List Settings</h4>
                <button class="close-settings-btn" id="close-user-list-settings-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="settings-content">
                <div class="setting-group">
                    <label class="setting-checkbox">
                        <input type="checkbox" id="show-online-status" ${this.settings.showOnlineStatus ? 'checked' : ''}>
                        <span>Show online status indicators</span>
                    </label>
                </div>
                
                <div class="setting-group">
                    <label class="setting-checkbox">
                        <input type="checkbox" id="show-user-roles" ${this.settings.showUserRoles ? 'checked' : ''}>
                        <span>Show user role badges</span>
                    </label>
                </div>
                
                <div class="setting-group">
                    <label class="setting-checkbox">
                        <input type="checkbox" id="show-user-avatars" ${this.settings.showUserAvatars ? 'checked' : ''}>
                        <span>Show user avatars</span>
                    </label>
                </div>
                
                <div class="setting-group">
                    <label class="setting-checkbox">
                        <input type="checkbox" id="show-last-seen" ${this.settings.showLastSeen ? 'checked' : ''}>
                        <span>Show last seen timestamps</span>
                    </label>
                </div>
                
                <div class="setting-group">
                    <label class="setting-checkbox">
                        <input type="checkbox" id="show-typing-indicators" ${this.settings.showTypingIndicators ? 'checked' : ''}>
                        <span>Show typing indicators</span>
                    </label>
                </div>
                
                <div class="setting-group">
                    <label class="setting-checkbox">
                        <input type="checkbox" id="group-by-role" ${this.settings.groupByRole ? 'checked' : ''}>
                        <span>Group users by role</span>
                    </label>
                </div>
                
                <div class="setting-group">
                    <label>Sort users by</label>
                    <select id="sort-by" class="setting-control">
                        <option value="status" ${this.settings.sortBy === 'status' ? 'selected' : ''}>Online Status</option>
                        <option value="name" ${this.settings.sortBy === 'name' ? 'selected' : ''}>Name</option>
                        <option value="role" ${this.settings.sortBy === 'role' ? 'selected' : ''}>Role</option>
                        <option value="activity" ${this.settings.sortBy === 'activity' ? 'selected' : ''}>Last Activity</option>
                    </select>
                </div>
                
                <div class="setting-group">
                    <label>Sort order</label>
                    <select id="sort-order" class="setting-control">
                        <option value="asc" ${this.settings.sortOrder === 'asc' ? 'selected' : ''}>Ascending</option>
                        <option value="desc" ${this.settings.sortOrder === 'desc' ? 'selected' : ''}>Descending</option>
                    </select>
                </div>
                
                <div class="setting-group">
                    <label>Presence update interval</label>
                    <select id="presence-interval" class="setting-control">
                        <option value="15000" ${this.settings.presenceUpdateInterval === 15000 ? 'selected' : ''}>15 seconds</option>
                        <option value="30000" ${this.settings.presenceUpdateInterval === 30000 ? 'selected' : ''}>30 seconds</option>
                        <option value="60000" ${this.settings.presenceUpdateInterval === 60000 ? 'selected' : ''}>1 minute</option>
                        <option value="120000" ${this.settings.presenceUpdateInterval === 120000 ? 'selected' : ''}>2 minutes</option>
                    </select>
                </div>
            </div>
        `;
        
        this.userListContainer.appendChild(settingsPanel);
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Settings button
        this.userListContainer.querySelector('#user-list-settings-btn').addEventListener('click', () => this.toggleUserListSettings());
        this.userListContainer.querySelector('#close-user-list-settings-btn').addEventListener('click', () => this.toggleUserListSettings());
        
        // Refresh button
        this.userListContainer.querySelector('#refresh-users-btn').addEventListener('click', () => this.refreshUserList());
        
        // Search input
        this.userSearchInput.addEventListener('input', (e) => this.handleUserSearch(e));
        
        // Filter select
        this.userFilterSelect.addEventListener('change', (e) => this.handleUserFilter(e));
        
        // Action buttons
        this.userListContainer.querySelector('#invite-users-btn').addEventListener('click', () => this.handleInviteUsers());
        this.userListContainer.querySelector('#export-users-btn').addEventListener('click', () => this.handleExportUsers());
        
        // Settings
        this.attachUserListSettingsListeners();
    }
    
    /**
     * Attach user list settings listeners
     */
    attachUserListSettingsListeners() {
        const showOnlineStatus = this.userListContainer.querySelector('#show-online-status');
        const showUserRoles = this.userListContainer.querySelector('#show-user-roles');
        const showUserAvatars = this.userListContainer.querySelector('#show-user-avatars');
        const showLastSeen = this.userListContainer.querySelector('#show-last-seen');
        const showTypingIndicators = this.userListContainer.querySelector('#show-typing-indicators');
        const groupByRole = this.userListContainer.querySelector('#group-by-role');
        const sortBy = this.userListContainer.querySelector('#sort-by');
        const sortOrder = this.userListContainer.querySelector('#sort-order');
        const presenceInterval = this.userListContainer.querySelector('#presence-interval');
        
        showOnlineStatus.addEventListener('change', (e) => this.updateUserListSetting('showOnlineStatus', e.target.checked));
        showUserRoles.addEventListener('change', (e) => this.updateUserListSetting('showUserRoles', e.target.checked));
        showUserAvatars.addEventListener('change', (e) => this.updateUserListSetting('showUserAvatars', e.target.checked));
        showLastSeen.addEventListener('change', (e) => this.updateUserListSetting('showLastSeen', e.target.checked));
        showTypingIndicators.addEventListener('change', (e) => this.updateUserListSetting('showTypingIndicators', e.target.checked));
        groupByRole.addEventListener('change', (e) => this.updateUserListSetting('groupByRole', e.target.checked));
        sortBy.addEventListener('change', (e) => this.updateUserListSetting('sortBy', e.target.value));
        sortOrder.addEventListener('change', (e) => this.updateUserListSetting('sortOrder', e.target.value));
        presenceInterval.addEventListener('change', (e) => {
            this.updateUserListSetting('presenceUpdateInterval', parseInt(e.target.value));
            this.restartPresenceTracking();
        });
    }
    
    /**
     * Update user list setting
     */
    updateUserListSetting(key, value) {
        this.settings[key] = value;
        this.saveUserListSettings();
        this.applyUserListSettings();
    }
    
    /**
     * Save user list settings
     */
    saveUserListSettings() {
        localStorage.setItem('userListSettings', JSON.stringify(this.settings));
    }
    
    /**
     * Load user list settings
     */
    loadUserListSettings() {
        const saved = localStorage.getItem('userListSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }
    
    /**
     * Apply user list settings
     */
    applyUserListSettings() {
        this.renderUserList();
    }
    
    /**
     * Add user to list
     */
    addUser(user) {
        const userData = {
            id: user.id || user.user_id,
            name: user.name || user.user_name || `User ${user.id}`,
            role: user.role || user.user_role || 'participant',
            avatar: user.avatar || null,
            joinedAt: user.joined_at || Date.now(),
            lastSeen: user.last_seen || Date.now(),
            isOnline: user.is_online !== undefined ? user.is_online : true,
            status: user.status || 'online',
            ...user
        };
        
        this.users.set(userData.id, userData);
        this.userRoles.set(userData.id, userData.role);
        
        if (userData.isOnline) {
            this.onlineUsers.add(userData.id);
        }
        
        this.updateUserActivity(userData.id);
        this.renderUserList();
        this.updateUserCounts();
        
        // Callback
        this.onUserStatusChange(userData.id, 'joined', userData);
    }
    
    /**
     * Remove user from list
     */
    removeUser(userId) {
        const user = this.users.get(userId);
        if (!user) return;
        
        this.users.delete(userId);
        this.onlineUsers.delete(userId);
        this.userPresence.delete(userId);
        this.userActivity.delete(userId);
        this.userRoles.delete(userId);
        
        this.renderUserList();
        this.updateUserCounts();
        
        // Callback
        this.onUserStatusChange(userId, 'left', user);
    }
    
    /**
     * Update user status
     */
    updateUserStatus(userId, status, data = {}) {
        const user = this.users.get(userId);
        if (!user) return;
        
        const wasOnline = user.isOnline;
        
        // Update user data
        Object.assign(user, data);
        user.status = status;
        user.isOnline = status === 'online';
        user.lastSeen = Date.now();
        
        // Update online users set
        if (user.isOnline) {
            this.onlineUsers.add(userId);
        } else {
            this.onlineUsers.delete(userId);
        }
        
        // Update activity
        this.updateUserActivity(userId);
        
        // Re-render if status changed
        if (wasOnline !== user.isOnline) {
            this.renderUserList();
            this.updateUserCounts();
        } else {
            this.updateUserElement(userId);
        }
        
        // Callback
        this.onUserStatusChange(userId, status, user);
    }
    
    /**
     * Update user activity
     */
    updateUserActivity(userId) {
        this.userActivity.set(userId, Date.now());
        
        // Update presence data
        this.userPresence.set(userId, {
            lastActivity: Date.now(),
            isActive: true
        });
    }
    
    /**
     * Update user element
     */
    updateUserElement(userId) {
        const userElement = this.userListContainer.querySelector(`[data-user-id="${userId}"]`);
        if (!userElement) return;
        
        const user = this.users.get(userId);
        if (!user) return;
        
        // Update online status
        const statusIndicator = userElement.querySelector('.user-status-indicator');
        if (statusIndicator) {
            statusIndicator.className = `user-status-indicator ${user.status}`;
        }
        
        // Update last seen
        const lastSeenElement = userElement.querySelector('.user-last-seen');
        if (lastSeenElement && this.settings.showLastSeen) {
            lastSeenElement.textContent = this.formatLastSeen(user.lastSeen);
        }
    }
    
    /**
     * Render user list
     */
    renderUserList() {
        const userListContent = this.userListContainer.querySelector('#user-list-content');
        if (!userListContent) return;
        
        const filteredUsers = this.getFilteredUsers();
        const sortedUsers = this.getSortedUsers(filteredUsers);
        
        if (sortedUsers.length === 0) {
            userListContent.innerHTML = `
                <div class="user-list-empty">
                    <i class="fas fa-users"></i>
                    <p>No users found</p>
                </div>
            `;
            return;
        }
        
        if (this.settings.groupByRole) {
            this.renderGroupedUserList(userListContent, sortedUsers);
        } else {
            this.renderFlatUserList(userListContent, sortedUsers);
        }
    }
    
    /**
     * Render flat user list
     */
    renderFlatUserList(container, users) {
        container.innerHTML = users.map(user => this.createUserElement(user)).join('');
        this.attachUserElementListeners();
    }
    
    /**
     * Render grouped user list
     */
    renderGroupedUserList(container, users) {
        const groupedUsers = this.groupUsersByRole(users);
        const roleOrder = ['admin', 'moderator', 'host', 'participant', 'guest'];
        
        let html = '';
        
        roleOrder.forEach(role => {
            if (groupedUsers[role] && groupedUsers[role].length > 0) {
                html += `
                    <div class="user-role-group">
                        <div class="user-role-header">
                            <span class="role-name">${this.formatRoleName(role)}</span>
                            <span class="role-count">${groupedUsers[role].length}</span>
                        </div>
                        <div class="user-role-list">
                            ${groupedUsers[role].map(user => this.createUserElement(user)).join('')}
                        </div>
                    </div>
                `;
            }
        });
        
        container.innerHTML = html;
        this.attachUserElementListeners();
    }
    
    /**
     * Create user element
     */
    createUserElement(user) {
        const isCurrentUser = user.id === this.currentUserId;
        const canModerate = this.canModerateUser(user);
        
        return `
            <div class="user-item ${isCurrentUser ? 'current-user' : ''}" data-user-id="${user.id}">
                ${this.settings.showUserAvatars ? `
                <div class="user-avatar">
                    ${user.avatar ? `<img src="${user.avatar}" alt="${user.name}">` : '<i class="fas fa-user"></i>'}
                    ${this.settings.showOnlineStatus ? `<div class="user-status-indicator ${user.status}"></div>` : ''}
                </div>
                ` : ''}
                
                <div class="user-info">
                    <div class="user-name-row">
                        <span class="user-name" title="${user.name}">${user.name}</span>
                        ${this.settings.showUserRoles ? `<span class="user-role ${user.role}">${user.role}</span>` : ''}
                        ${isCurrentUser ? '<span class="user-you-badge">You</span>' : ''}
                    </div>
                    
                    ${this.settings.showLastSeen ? `
                    <div class="user-details">
                        <span class="user-last-seen">${this.formatLastSeen(user.lastSeen)}</span>
                        ${!this.settings.showUserAvatars && this.settings.showOnlineStatus ? `
                        <div class="user-status-indicator ${user.status}"></div>
                        ` : ''}
                    </div>
                    ` : ''}
                </div>
                
                ${this.settings.showUserActions && !isCurrentUser ? `
                <div class="user-actions">
                    <button class="user-action-btn" onclick="userList.sendPrivateMessage('${user.id}')" title="Private Message">
                        <i class="fas fa-envelope"></i>
                    </button>
                    ${canModerate ? `
                    <button class="user-action-btn" onclick="userList.moderateUser('${user.id}')" title="Moderate User">
                        <i class="fas fa-shield-alt"></i>
                    </button>
                    ` : ''}
                </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * Get filtered users
     */
    getFilteredUsers() {
        const searchTerm = this.userSearchInput ? this.userSearchInput.value.toLowerCase() : '';
        const filter = this.userFilterSelect ? this.userFilterSelect.value : 'all';
        
        return Array.from(this.users.values()).filter(user => {
            // Search filter
            if (searchTerm && !user.name.toLowerCase().includes(searchTerm)) {
                return false;
            }
            
            // Status/role filter
            switch (filter) {
                case 'online':
                    return user.isOnline;
                case 'offline':
                    return !user.isOnline;
                case 'admin':
                case 'moderator':
                case 'host':
                case 'participant':
                case 'guest':
                    return user.role === filter;
                default:
                    return true;
            }
        });
    }
    
    /**
     * Get sorted users
     */
    getSortedUsers(users) {
        const sortBy = this.settings.sortBy;
        const sortOrder = this.settings.sortOrder;
        
        return users.sort((a, b) => {
            let comparison = 0;
            
            switch (sortBy) {
                case 'status':
                    // Online users first
                    if (a.isOnline && !b.isOnline) comparison = -1;
                    else if (!a.isOnline && b.isOnline) comparison = 1;
                    else comparison = a.name.localeCompare(b.name);
                    break;
                    
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                    
                case 'role':
                    const roleOrder = ['admin', 'moderator', 'host', 'participant', 'guest'];
                    const aRoleIndex = roleOrder.indexOf(a.role);
                    const bRoleIndex = roleOrder.indexOf(b.role);
                    comparison = aRoleIndex - bRoleIndex;
                    if (comparison === 0) comparison = a.name.localeCompare(b.name);
                    break;
                    
                case 'activity':
                    const aActivity = this.userActivity.get(a.id) || 0;
                    const bActivity = this.userActivity.get(b.id) || 0;
                    comparison = bActivity - aActivity; // Most recent first
                    break;
            }
            
            return sortOrder === 'desc' ? -comparison : comparison;
        });
    }
    
    /**
     * Group users by role
     */
    groupUsersByRole(users) {
        const grouped = {};
        
        users.forEach(user => {
            if (!grouped[user.role]) {
                grouped[user.role] = [];
            }
            grouped[user.role].push(user);
        });
        
        return grouped;
    }
    
    /**
     * Format role name
     */
    formatRoleName(role) {
        return role.charAt(0).toUpperCase() + role.slice(1) + 's';
    }
    
    /**
     * Format last seen
     */
    formatLastSeen(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        if (diff < 60000) { // Less than 1 minute
            return 'Just now';
        } else if (diff < 3600000) { // Less than 1 hour
            const minutes = Math.floor(diff / 60000);
            return `${minutes}m ago`;
        } else if (diff < 86400000) { // Less than 1 day
            const hours = Math.floor(diff / 3600000);
            return `${hours}h ago`;
        } else {
            const days = Math.floor(diff / 86400000);
            return `${days}d ago`;
        }
    }
    
    /**
     * Update user counts
     */
    updateUserCounts() {
        const totalUsers = this.users.size;
        const onlineUsers = this.onlineUsers.size;
        
        if (this.userCountDisplay) {
            this.userCountDisplay.textContent = totalUsers;
        }
        
        const onlineCountElement = this.userListContainer.querySelector('#online-count');
        if (onlineCountElement) {
            onlineCountElement.textContent = onlineUsers;
        }
    }
    
    /**
     * Handle user search
     */
    handleUserSearch(event) {
        this.renderUserList();
    }
    
    /**
     * Handle user filter
     */
    handleUserFilter(event) {
        this.renderUserList();
    }
    
    /**
     * Toggle user list settings
     */
    toggleUserListSettings() {
        const settingsPanel = this.userListContainer.querySelector('#user-list-settings-panel');
        const isVisible = settingsPanel.style.display !== 'none';
        settingsPanel.style.display = isVisible ? 'none' : 'block';
    }
    
    /**
     * Refresh user list
     */
    refreshUserList() {
        if (this.websocket) {
            this.websocket.send(JSON.stringify({
                type: 'get_user_list',
                room_id: this.roomId
            }));
        }
        
        // Animate refresh button
        const refreshBtn = this.userListContainer.querySelector('#refresh-users-btn i');
        if (refreshBtn) {
            refreshBtn.style.animation = 'spin 1s linear';
            setTimeout(() => {
                refreshBtn.style.animation = '';
            }, 1000);
        }
    }
    
    /**
     * Handle invite users
     */
    handleInviteUsers() {
        // Integration with invite system
        this.onUserAction('invite', null);
    }
    
    /**
     * Handle export users
     */
    handleExportUsers() {
        const userData = Array.from(this.users.values()).map(user => ({
            id: user.id,
            name: user.name,
            role: user.role,
            status: user.status,
            isOnline: user.isOnline,
            joinedAt: new Date(user.joinedAt).toISOString(),
            lastSeen: new Date(user.lastSeen).toISOString()
        }));
        
        const dataStr = JSON.stringify(userData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `user-list-${this.roomId}-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }
    
    /**
     * Send private message to user
     */
    sendPrivateMessage(userId) {
        this.onUserAction('private_message', userId);
    }
    
    /**
     * Moderate user
     */
    moderateUser(userId) {
        this.onUserAction('moderate', userId);
    }
    
    /**
     * Check if current user can moderate another user
     */
    canModerateUser(user) {
        const currentUserRole = this.currentUserRole;
        const targetUserRole = user.role;
        
        // Role hierarchy: admin > moderator > host > participant > guest
        const roleHierarchy = {
            'admin': 5,
            'moderator': 4,
            'host': 3,
            'participant': 2,
            'guest': 1
        };
        
        const currentLevel = roleHierarchy[currentUserRole] || 0;
        const targetLevel = roleHierarchy[targetUserRole] || 0;
        
        return currentLevel > targetLevel;
    }
    
    /**
     * Attach user element listeners
     */
    attachUserElementListeners() {
        // Add click listeners for user items
        const userItems = this.userListContainer.querySelectorAll('.user-item');
        userItems.forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.user-actions')) return; // Don't trigger on action buttons
                
                const userId = item.dataset.userId;
                this.onUserAction('select', userId);
            });
        });
    }
    
    /**
     * Start presence tracking
     */
    startPresenceTracking() {
        if (!this.settings.autoUpdatePresence) return;
        
        this.presenceUpdateTimer = setInterval(() => {
            this.updatePresence();
        }, this.settings.presenceUpdateInterval);
    }
    
    /**
     * Stop presence tracking
     */
    stopPresenceTracking() {
        if (this.presenceUpdateTimer) {
            clearInterval(this.presenceUpdateTimer);
            this.presenceUpdateTimer = null;
        }
    }
    
    /**
     * Restart presence tracking
     */
    restartPresenceTracking() {
        this.stopPresenceTracking();
        this.startPresenceTracking();
    }
    
    /**
     * Update presence
     */
    updatePresence() {
        if (!this.websocket) return;
        
        const now = Date.now();
        
        // Send presence update
        this.websocket.send(JSON.stringify({
            type: 'presence_update',
            room_id: this.roomId,
            timestamp: now
        }));
        
        // Check for offline users
        this.checkOfflineUsers();
        
        this.lastPresenceUpdate = now;
    }
    
    /**
     * Check for offline users
     */
    checkOfflineUsers() {
        const now = Date.now();
        const offlineThreshold = now - this.settings.offlineTimeout;
        
        for (const [userId, user] of this.users) {
            const lastActivity = this.userActivity.get(userId) || 0;
            
            if (user.isOnline && lastActivity < offlineThreshold) {
                this.updateUserStatus(userId, 'offline');
            }
        }
    }
    
    /**
     * Get user statistics
     */
    getUserStatistics() {
        const totalUsers = this.users.size;
        const onlineUsers = this.onlineUsers.size;
        const offlineUsers = totalUsers - onlineUsers;
        
        const roleStats = {};
        for (const user of this.users.values()) {
            roleStats[user.role] = (roleStats[user.role] || 0) + 1;
        }
        
        return {
            totalUsers,
            onlineUsers,
            offlineUsers,
            roleStats,
            averageSessionTime: this.calculateAverageSessionTime(),
            mostActiveUsers: this.getMostActiveUsers(5)
        };
    }
    
    /**
     * Calculate average session time
     */
    calculateAverageSessionTime() {
        const now = Date.now();
        let totalTime = 0;
        let userCount = 0;
        
        for (const user of this.users.values()) {
            if (user.joinedAt) {
                totalTime += now - user.joinedAt;
                userCount++;
            }
        }
        
        return userCount > 0 ? totalTime / userCount : 0;
    }
    
    /**
     * Get most active users
     */
    getMostActiveUsers(limit = 5) {
        return Array.from(this.users.values())
            .sort((a, b) => {
                const aActivity = this.userActivity.get(a.id) || 0;
                const bActivity = this.userActivity.get(b.id) || 0;
                return bActivity - aActivity;
            })
            .slice(0, limit)
            .map(user => ({
                id: user.id,
                name: user.name,
                role: user.role,
                lastActivity: this.userActivity.get(user.id) || 0
            }));
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
            case 'user_joined':
                this.addUser(data.user || data);
                break;
                
            case 'user_left':
                this.removeUser(data.user_id || data.id);
                break;
                
            case 'user_status_update':
                this.updateUserStatus(data.user_id, data.status, data);
                break;
                
            case 'user_list':
                this.handleUserListUpdate(data.users || data);
                break;
                
            case 'presence_update':
                this.handlePresenceUpdate(data);
                break;
        }
    }
    
    /**
     * Handle user list update
     */
    handleUserListUpdate(users) {
        // Clear existing users
        this.users.clear();
        this.onlineUsers.clear();
        this.userActivity.clear();
        this.userRoles.clear();
        
        // Add all users
        users.forEach(user => this.addUser(user));
    }
    
    /**
     * Handle presence update
     */
    handlePresenceUpdate(data) {
        if (data.user_id && data.user_id !== this.currentUserId) {
            this.updateUserActivity(data.user_id);
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
        this.renderUserList();
    }
    
    /**
     * Set room ID
     */
    setRoomId(roomId) {
        this.roomId = roomId;
        
        // Clear users when changing rooms
        this.users.clear();
        this.onlineUsers.clear();
        this.userActivity.clear();
        this.userRoles.clear();
        
        this.renderUserList();
        this.updateUserCounts();
    }
    
    /**
     * Destroy the interface
     */
    destroy() {
        this.stopPresenceTracking();
        
        // Clear data
        this.users.clear();
        this.onlineUsers.clear();
        this.userPresence.clear();
        this.userActivity.clear();
        this.userRoles.clear();
        
        // Remove UI elements
        if (this.userListContainer) {
            this.userListContainer.remove();
        }
    }
}

// CSS Styles for User List Interface
const userListStyles = `
<style>
/* User List Interface Styles */
.user-list-panel {
    background: var(--chat-card, #2a2a2a);
    border: 1px solid var(--chat-border, #444);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 400px;
    max-height: 600px;
}

.user-list-header {
    background: var(--chat-input, #3a3a3a);
    border-bottom: 1px solid var(--chat-border, #444);
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 8px 8px 0 0;
    flex-shrink: 0;
}

.user-list-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--chat-text, #ffffff);
    font-weight: 600;
}

.user-list-title i {
    color: var(--chat-primary, #FF0000);
}

.user-count {
    background: var(--chat-primary, #FF0000);
    color: white;
    padding: 0.1rem 0.4rem;
    border-radius: 10px;
    font-size: 0.7rem;
    font-weight: 500;
    min-width: 18px;
    text-align: center;
}

.user-list-controls {
    display: flex;
    gap: 0.5rem;
}

.user-list-btn {
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

.user-list-btn:hover {
    background: var(--chat-input, #3a3a3a);
    color: var(--chat-text, #ffffff);
    border-color: var(--chat-primary, #FF0000);
}

.user-list-filters {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--chat-border, #444);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex-shrink: 0;
}

.user-search-container {
    position: relative;
}

.user-search-input {
    width: 100%;
    background: var(--chat-input, #3a3a3a);
    border: 1px solid var(--chat-border, #444);
    color: var(--chat-text, #ffffff);
    padding: 0.5rem 0.75rem 0.5rem 2.25rem;
    border-radius: 6px;
    font-size: 0.9rem;
}

.user-search-input:focus {
    outline: none;
    border-color: var(--chat-primary, #FF0000);
}

.user-search-input::placeholder {
    color: var(--chat-text-muted, #cccccc);
}

.user-search-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--chat-text-muted, #cccccc);
    font-size: 0.8rem;
}

.user-filter-container {
    display: flex;
    gap: 0.5rem;
}

.user-filter-select {
    flex: 1;
    background: var(--chat-input, #3a3a3a);
    border: 1px solid var(--chat-border, #444);
    color: var(--chat-text, #ffffff);
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    font-size: 0.9rem;
}

.user-filter-select:focus {
    outline: none;
    border-color: var(--chat-primary, #FF0000);
}

.user-list-content {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
}

.user-list-content::-webkit-scrollbar {
    width: 6px;
}

.user-list-content::-webkit-scrollbar-track {
    background: var(--chat-bg, #1a1a1a);
}

.user-list-content::-webkit-scrollbar-thumb {
    background: var(--chat-border, #444);
    border-radius: 3px;
}

.user-list-empty {
    text-align: center;
    padding: 3rem 2rem;
    color: var(--chat-text-muted, #cccccc);
}

.user-list-empty i {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    opacity: 0.5;
}

.user-list-empty p {
    margin: 0;
}

.user-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: 0.25rem;
    position: relative;
}

.user-item:hover {
    background: var(--chat-input, #3a3a3a);
}

.user-item.current-user {
    background: rgba(255, 0, 0, 0.1);
    border: 1px solid var(--chat-primary, #FF0000);
}

.user-avatar {
    position: relative;
    width: 36px;
    height: 36px;
    background: var(--chat-input, #3a3a3a);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--chat-text-muted, #cccccc);
    flex-shrink: 0;
    overflow: hidden;
}

.user-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
}

.user-status-indicator {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid var(--chat-card, #2a2a2a);
}

.user-status-indicator.online {
    background: #28a745;
}

.user-status-indicator.away {
    background: #ffc107;
}

.user-status-indicator.busy {
    background: #dc3545;
}

.user-status-indicator.offline {
    background: #6c757d;
}

.user-info {
    flex: 1;
    min-width: 0;
}

.user-name-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
}

.user-name {
    color: var(--chat-text, #ffffff);
    font-weight: 500;
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
}

.user-role {
    font-size: 0.6rem;
    padding: 0.1rem 0.3rem;
    border-radius: 8px;
    text-transform: uppercase;
    font-weight: 600;
    flex-shrink: 0;
}

.user-role.admin {
    background: var(--chat-danger, #dc3545);
    color: white;
}

.user-role.moderator {
    background: var(--chat-warning, #ffc107);
    color: black;
}

.user-role.host {
    background: var(--chat-info, #17a2b8);
    color: white;
}

.user-role.participant {
    background: var(--chat-success, #28a745);
    color: white;
}

.user-role.guest {
    background: var(--chat-border, #444);
    color: var(--chat-text-muted, #cccccc);
}

.user-you-badge {
    background: var(--chat-primary, #FF0000);
    color: white;
    font-size: 0.6rem;
    padding: 0.1rem 0.3rem;
    border-radius: 8px;
    font-weight: 600;
    text-transform: uppercase;
}

.user-details {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.user-last-seen {
    color: var(--chat-text-muted, #cccccc);
    font-size: 0.75rem;
}

.user-actions {
    display: flex;
    gap: 0.25rem;
    opacity: 0;
    transition: opacity 0.2s ease;
}

.user-item:hover .user-actions {
    opacity: 1;
}

.user-action-btn {
    background: transparent;
    border: 1px solid var(--chat-border, #444);
    color: var(--chat-text-muted, #cccccc);
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.7rem;
    transition: all 0.2s ease;
}

.user-action-btn:hover {
    background: var(--chat-primary, #FF0000);
    color: white;
    border-color: var(--chat-primary, #FF0000);
}

.user-list-footer {
    background: var(--chat-input, #3a3a3a);
    border-top: 1px solid var(--chat-border, #444);
    padding: 0.75rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 0 0 8px 8px;
    flex-shrink: 0;
}

.presence-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--chat-text-muted, #cccccc);
    font-size: 0.8rem;
}

.presence-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
}

.presence-indicator.online {
    background: #28a745;
}

.online-count {
    color: var(--chat-text, #ffffff);
    font-weight: 600;
}

.user-list-actions {
    display: flex;
    gap: 0.5rem;
}

.user-action-btn {
    background: transparent;
    border: 1px solid var(--chat-border, #444);
    color: var(--chat-text-muted, #cccccc);
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.7rem;
    transition: all 0.2s ease;
}

.user-action-btn:hover {
    background: var(--chat-primary, #FF0000);
    color: white;
    border-color: var(--chat-primary, #FF0000);
}

/* Role Groups */
.user-role-group {
    margin-bottom: 1rem;
}

.user-role-group:last-child {
    margin-bottom: 0;
}

.user-role-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    background: var(--chat-input, #3a3a3a);
    border-radius: 6px;
    margin-bottom: 0.5rem;
}

.role-name {
    color: var(--chat-text, #ffffff);
    font-weight: 600;
    font-size: 0.8rem;
    text-transform: uppercase;
}

.role-count {
    background: var(--chat-border, #444);
    color: var(--chat-text-muted, #cccccc);
    padding: 0.1rem 0.3rem;
    border-radius: 8px;
    font-size: 0.7rem;
    font-weight: 500;
}

.user-role-list {
    padding-left: 0.5rem;
}

/* User List Settings Panel */
.user-list-settings-panel {
    position: absolute;
    top: 60px;
    right: 10px;
    width: 280px;
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

/* Animations */
@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

/* Responsive Design */
@media (max-width: 768px) {
    .user-list-panel {
        min-height: 300px;
        max-height: 400px;
    }

    .user-list-header {
        padding: 0.75rem;
    }

    .user-list-filters {
        padding: 0.5rem 0.75rem;
    }

    .user-item {
        padding: 0.5rem;
        gap: 0.5rem;
    }

    .user-avatar {
        width: 32px;
        height: 32px;
    }

    .user-status-indicator {
        width: 10px;
        height: 10px;
    }

    .user-name {
        font-size: 0.85rem;
    }

    .user-role {
        font-size: 0.55rem;
    }

    .user-last-seen {
        font-size: 0.7rem;
    }

    .user-list-footer {
        padding: 0.5rem 0.75rem;
    }

    .user-list-settings-panel {
        width: calc(100% - 20px);
        right: 10px;
        left: 10px;
    }
}

@media (max-width: 480px) {
    .user-list-filters {
        gap: 0.5rem;
    }

    .user-filter-container {
        flex-direction: column;
    }

    .user-item {
        padding: 0.4rem;
    }

    .user-avatar {
        width: 28px;
        height: 28px;
    }

    .user-name-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.25rem;
    }

    .user-actions {
        position: absolute;
        top: 0.4rem;
        right: 0.4rem;
        opacity: 1;
    }
}

/* Dark/Light Theme Support */
.light-theme .user-list-panel {
    background: #ffffff;
    border-color: #dee2e6;
}

.light-theme .user-list-header {
    background: #f8f9fa;
    border-bottom-color: #dee2e6;
}

.light-theme .user-search-input,
.light-theme .user-filter-select,
.light-theme .setting-control {
    background: #ffffff;
    border-color: #ced4da;
    color: #495057;
}

.light-theme .user-item:hover {
    background: #f8f9fa;
}

.light-theme .user-name {
    color: #212529;
}

.light-theme .user-last-seen {
    color: #6c757d;
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
    .user-status-indicator {
        border-width: 3px;
    }

    .user-role {
        border: 1px solid currentColor;
    }

    .user-action-btn {
        border-width: 2px;
    }
}

/* Print Styles */
@media print {
    .user-list-controls,
    .user-list-filters,
    .user-list-footer,
    .user-actions,
    .user-list-settings-panel {
        display: none !important;
    }

    .user-list-panel {
        border: none;
        box-shadow: none;
    }

    .user-item {
        break-inside: avoid;
    }
}
</style>
`;

// Inject styles into document head
if (typeof document !== 'undefined') {
    const styleElement = document.createElement('div');
    styleElement.innerHTML = userListStyles;
    document.head.appendChild(styleElement.firstElementChild);
}

// Global reference for onclick handlers
let userList = null;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserListInterface;
} else if (typeof window !== 'undefined') {
    window.UserListInterface = UserListInterface;
}
