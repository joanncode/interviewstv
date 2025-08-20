import API from '../services/api.js';
import Auth from '../services/auth.js';

export default class NotificationDropdown {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.isLoading = false;
        this.isOpen = false;
        this.pollInterval = null;
    }

    render(container) {
        if (!Auth.isAuthenticated()) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = this.getHTML();
        this.setupEventListeners(container);
        this.startPolling();
        this.loadNotifications();
        this.loadUnreadCount();
    }

    getHTML() {
        return `
            <div class="dropdown notification-dropdown">
                <button class="btn btn-link nav-link position-relative" 
                        type="button" 
                        id="notificationDropdown" 
                        data-bs-toggle="dropdown" 
                        aria-expanded="false">
                    <i class="fas fa-bell"></i>
                    ${this.unreadCount > 0 ? `
                        <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                            ${this.unreadCount > 99 ? '99+' : this.unreadCount}
                            <span class="visually-hidden">unread notifications</span>
                        </span>
                    ` : ''}
                </button>
                
                <div class="dropdown-menu dropdown-menu-end notification-menu" 
                     aria-labelledby="notificationDropdown">
                    <div class="dropdown-header d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">Notifications</h6>
                        <div class="d-flex gap-2">
                            ${this.unreadCount > 0 ? `
                                <button class="btn btn-sm btn-link p-0 text-primary" id="mark-all-read-btn">
                                    Mark all read
                                </button>
                            ` : ''}
                            <button class="btn btn-sm btn-link p-0 text-muted" id="notification-settings-btn">
                                <i class="fas fa-cog"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="notification-list" style="max-height: 400px; overflow-y: auto;">
                        ${this.getNotificationListHTML()}
                    </div>
                    
                    <div class="dropdown-divider"></div>
                    <div class="dropdown-item-text text-center">
                        <a href="/notifications" class="btn btn-sm btn-outline-primary">
                            View All Notifications
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    getNotificationListHTML() {
        if (this.isLoading) {
            return `
                <div class="text-center py-3">
                    <div class="spinner-border spinner-border-sm text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `;
        }

        if (this.notifications.length === 0) {
            return `
                <div class="text-center py-4 text-muted">
                    <i class="fas fa-bell-slash fa-2x mb-2"></i>
                    <p class="mb-0">No notifications yet</p>
                </div>
            `;
        }

        return this.notifications.map(notification => this.getNotificationItemHTML(notification)).join('');
    }

    getNotificationItemHTML(notification) {
        const isUnread = !notification.read_at;
        const timeAgo = this.getTimeAgo(new Date(notification.created_at));
        
        return `
            <div class="dropdown-item notification-item ${isUnread ? 'unread' : ''}" 
                 data-notification-id="${notification.id}">
                <div class="d-flex">
                    <div class="flex-shrink-0 me-3">
                        ${this.getNotificationIcon(notification)}
                    </div>
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="notification-content">
                                <h6 class="mb-1 ${isUnread ? 'fw-bold' : ''}">${notification.title}</h6>
                                <p class="mb-1 text-muted small">${notification.message}</p>
                                <small class="text-muted">${timeAgo}</small>
                            </div>
                            <div class="notification-actions">
                                ${isUnread ? `
                                    <button class="btn btn-sm btn-link p-0 mark-read-btn" 
                                            data-notification-id="${notification.id}"
                                            title="Mark as read">
                                        <i class="fas fa-check text-primary"></i>
                                    </button>
                                ` : ''}
                                <button class="btn btn-sm btn-link p-0 delete-notification-btn" 
                                        data-notification-id="${notification.id}"
                                        title="Delete">
                                    <i class="fas fa-times text-muted"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getNotificationIcon(notification) {
        const data = notification.data || {};
        const avatarUrl = data.actor_avatar || '/assets/default-avatar.png';
        
        switch (notification.type) {
            case 'follow':
                return `
                    <div class="position-relative">
                        <img src="${avatarUrl}" 
                             alt="User" 
                             class="rounded-circle" 
                             width="40" height="40"
                             onerror="this.src='/assets/default-avatar.png'">
                        <span class="position-absolute bottom-0 end-0 bg-primary rounded-circle p-1">
                            <i class="fas fa-user-plus text-white" style="font-size: 10px;"></i>
                        </span>
                    </div>
                `;
            case 'unfollow':
                return `
                    <div class="position-relative">
                        <img src="${avatarUrl}" 
                             alt="User" 
                             class="rounded-circle" 
                             width="40" height="40"
                             onerror="this.src='/assets/default-avatar.png'">
                        <span class="position-absolute bottom-0 end-0 bg-secondary rounded-circle p-1">
                            <i class="fas fa-user-minus text-white" style="font-size: 10px;"></i>
                        </span>
                    </div>
                `;
            case 'like':
                return `
                    <div class="bg-danger rounded-circle d-flex align-items-center justify-content-center" 
                         style="width: 40px; height: 40px;">
                        <i class="fas fa-heart text-white"></i>
                    </div>
                `;
            case 'comment':
                return `
                    <div class="bg-info rounded-circle d-flex align-items-center justify-content-center" 
                         style="width: 40px; height: 40px;">
                        <i class="fas fa-comment text-white"></i>
                    </div>
                `;
            case 'interview_published':
                return `
                    <div class="bg-success rounded-circle d-flex align-items-center justify-content-center" 
                         style="width: 40px; height: 40px;">
                        <i class="fas fa-video text-white"></i>
                    </div>
                `;
            case 'mention':
                return `
                    <div class="bg-warning rounded-circle d-flex align-items-center justify-content-center" 
                         style="width: 40px; height: 40px;">
                        <i class="fas fa-at text-white"></i>
                    </div>
                `;
            case 'system':
                return `
                    <div class="bg-dark rounded-circle d-flex align-items-center justify-content-center" 
                         style="width: 40px; height: 40px;">
                        <i class="fas fa-cog text-white"></i>
                    </div>
                `;
            default:
                return `
                    <div class="bg-secondary rounded-circle d-flex align-items-center justify-content-center" 
                         style="width: 40px; height: 40px;">
                        <i class="fas fa-bell text-white"></i>
                    </div>
                `;
        }
    }

    setupEventListeners(container) {
        // Mark individual notification as read
        container.addEventListener('click', (e) => {
            if (e.target.closest('.mark-read-btn')) {
                const notificationId = e.target.closest('.mark-read-btn').dataset.notificationId;
                this.markAsRead(notificationId);
            }
        });

        // Delete notification
        container.addEventListener('click', (e) => {
            if (e.target.closest('.delete-notification-btn')) {
                const notificationId = e.target.closest('.delete-notification-btn').dataset.notificationId;
                this.deleteNotification(notificationId);
            }
        });

        // Mark all as read
        const markAllReadBtn = container.querySelector('#mark-all-read-btn');
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', () => this.markAllAsRead());
        }

        // Notification click (mark as read and navigate)
        container.addEventListener('click', (e) => {
            const notificationItem = e.target.closest('.notification-item');
            if (notificationItem && !e.target.closest('.notification-actions')) {
                const notificationId = notificationItem.dataset.notificationId;
                const notification = this.notifications.find(n => n.id == notificationId);
                
                if (notification && !notification.read_at) {
                    this.markAsRead(notificationId);
                }
                
                // Handle navigation based on notification type
                this.handleNotificationClick(notification);
            }
        });
    }

    async loadNotifications() {
        try {
            this.isLoading = true;
            this.updateNotificationList();

            const response = await API.getNotifications({ limit: 10 });

            if (response.success) {
                this.notifications = response.data.items || [];
                this.updateNotificationList();
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            this.isLoading = false;
        }
    }

    async loadUnreadCount() {
        try {
            const response = await API.getUnreadNotificationCount();

            if (response.success) {
                this.unreadCount = response.data.unread_count || 0;
                this.updateUnreadBadge();
            }
        } catch (error) {
            console.error('Failed to load unread count:', error);
        }
    }

    async markAsRead(notificationId) {
        try {
            const response = await API.markNotificationAsRead(notificationId);

            if (response.success) {
                // Update local state
                const notification = this.notifications.find(n => n.id == notificationId);
                if (notification) {
                    notification.read_at = new Date().toISOString();
                    this.unreadCount = Math.max(0, this.unreadCount - 1);
                    this.updateNotificationList();
                    this.updateUnreadBadge();
                }
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    }

    async markAllAsRead() {
        try {
            const response = await API.markAllNotificationsAsRead();

            if (response.success) {
                // Update local state
                this.notifications.forEach(notification => {
                    if (!notification.read_at) {
                        notification.read_at = new Date().toISOString();
                    }
                });
                this.unreadCount = 0;
                this.updateNotificationList();
                this.updateUnreadBadge();
            }
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        }
    }

    async deleteNotification(notificationId) {
        try {
            const response = await API.deleteNotification(notificationId);

            if (response.success) {
                // Update local state
                const notificationIndex = this.notifications.findIndex(n => n.id == notificationId);
                if (notificationIndex !== -1) {
                    const notification = this.notifications[notificationIndex];
                    if (!notification.read_at) {
                        this.unreadCount = Math.max(0, this.unreadCount - 1);
                    }
                    this.notifications.splice(notificationIndex, 1);
                    this.updateNotificationList();
                    this.updateUnreadBadge();
                }
            }
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    }

    handleNotificationClick(notification) {
        if (!notification || !notification.data) return;

        const data = notification.data;

        switch (notification.type) {
            case 'follow':
            case 'unfollow':
                if (data.actor_username) {
                    window.location.href = `/profile/${data.actor_username}`;
                }
                break;
            case 'like':
            case 'comment':
                if (data.entity_type === 'interview' && data.entity_id) {
                    window.location.href = `/interviews/${data.entity_id}`;
                }
                break;
            case 'interview_published':
                if (data.interview_id) {
                    window.location.href = `/interviews/${data.interview_id}`;
                }
                break;
            case 'mention':
                if (data.entity_type && data.entity_id) {
                    window.location.href = `/${data.entity_type}/${data.entity_id}`;
                }
                break;
        }
    }

    updateNotificationList() {
        const listContainer = document.querySelector('.notification-list');
        if (listContainer) {
            listContainer.innerHTML = this.getNotificationListHTML();
        }
    }

    updateUnreadBadge() {
        const badge = document.querySelector('.notification-dropdown .badge');
        const button = document.querySelector('#notificationDropdown');

        if (this.unreadCount > 0) {
            if (!badge) {
                button.insertAdjacentHTML('beforeend', `
                    <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                        ${this.unreadCount > 99 ? '99+' : this.unreadCount}
                        <span class="visually-hidden">unread notifications</span>
                    </span>
                `);
            } else {
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            }
        } else {
            if (badge) {
                badge.remove();
            }
        }

        // Update mark all read button
        const markAllReadBtn = document.querySelector('#mark-all-read-btn');
        if (markAllReadBtn) {
            markAllReadBtn.style.display = this.unreadCount > 0 ? 'block' : 'none';
        }
    }

    startPolling() {
        // Poll for new notifications every 30 seconds
        this.pollInterval = setInterval(() => {
            this.loadUnreadCount();
        }, 30000);
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) {
            return 'Just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes}m ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours}h ago`;
        } else if (diffInSeconds < 2592000) {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days}d ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    destroy() {
        this.stopPolling();
    }
}
