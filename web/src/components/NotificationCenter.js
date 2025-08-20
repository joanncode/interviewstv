/**
 * Notification Center Component
 * Handles in-app notifications, real-time updates, and notification management
 */

import API from '../services/api.js';
import Auth from '../services/auth.js';
import { realtimeService } from '../services/realtime.js';

export default class NotificationCenter {
    constructor() {
        this.currentUser = Auth.getCurrentUser();
        this.notifications = [];
        this.unreadCount = 0;
        this.isOpen = false;
        this.isLoading = false;
        this.currentPage = 1;
        this.hasMore = true;
        this.realtimeUnsubscribers = [];
        this.container = null;
        this.bellIcon = null;
        this.dropdown = null;
        this.pollInterval = null;
    }

    async init() {
        if (!this.currentUser) return;

        this.createNotificationBell();
        this.setupRealtimeListeners();
        this.startPolling();
        
        await this.loadUnreadCount();
    }

    createNotificationBell() {
        // Find or create notification bell in header
        const header = document.querySelector('.navbar, .header, .top-nav');
        if (!header) return;

        let bellContainer = header.querySelector('.notification-bell-container');
        
        if (!bellContainer) {
            bellContainer = document.createElement('div');
            bellContainer.className = 'notification-bell-container position-relative me-3';
            
            // Insert before user menu or at end
            const userMenu = header.querySelector('.user-menu, .dropdown');
            if (userMenu) {
                userMenu.parentNode.insertBefore(bellContainer, userMenu);
            } else {
                header.appendChild(bellContainer);
            }
        }

        bellContainer.innerHTML = this.getBellHTML();
        
        this.bellIcon = bellContainer.querySelector('.notification-bell');
        this.container = bellContainer;
        
        this.setupEventListeners();
    }

    getBellHTML() {
        return `
            <div class="notification-bell btn btn-outline-secondary position-relative" 
                 role="button" 
                 tabindex="0"
                 aria-label="Notifications"
                 title="Notifications">
                <i class="fas fa-bell"></i>
                <span class="notification-badge badge bg-danger position-absolute top-0 start-100 translate-middle rounded-pill" 
                      style="display: none;">
                    <span class="count">0</span>
                    <span class="visually-hidden">unread notifications</span>
                </span>
            </div>
            
            <div class="notification-dropdown dropdown-menu dropdown-menu-end" 
                 style="display: none; width: 380px; max-height: 500px;">
                <div class="dropdown-header d-flex justify-content-between align-items-center">
                    <h6 class="mb-0">Notifications</h6>
                    <div class="notification-actions">
                        <button class="btn btn-sm btn-link text-muted mark-all-read-btn" 
                                title="Mark all as read">
                            <i class="fas fa-check-double"></i>
                        </button>
                        <button class="btn btn-sm btn-link text-muted settings-btn" 
                                title="Notification settings">
                            <i class="fas fa-cog"></i>
                        </button>
                    </div>
                </div>
                
                <div class="notification-content">
                    <div class="notification-list" style="max-height: 400px; overflow-y: auto;">
                        <div class="loading-state text-center py-4">
                            <div class="spinner-border spinner-border-sm text-primary" role="status">
                                <span class="visually-hidden">Loading notifications...</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="dropdown-footer text-center border-top pt-2">
                        <a href="/notifications" class="btn btn-sm btn-link">
                            View All Notifications
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        if (!this.bellIcon) return;

        // Toggle dropdown
        this.bellIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });

        // Keyboard support
        this.bellIcon.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggleDropdown();
            }
        });

        // Mark all as read
        const markAllBtn = this.container.querySelector('.mark-all-read-btn');
        if (markAllBtn) {
            markAllBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.markAllAsRead();
            });
        }

        // Settings button
        const settingsBtn = this.container.querySelector('.settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.location.href = '/settings/notifications';
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // Infinite scroll in dropdown
        const notificationList = this.container.querySelector('.notification-list');
        if (notificationList) {
            notificationList.addEventListener('scroll', () => {
                if (notificationList.scrollTop + notificationList.clientHeight >= notificationList.scrollHeight - 10) {
                    this.loadMoreNotifications();
                }
            });
        }
    }

    setupRealtimeListeners() {
        // Listen for new notifications
        const unsubscribeNewNotification = realtimeService.on('new_notification', (data) => {
            if (data.user_id === this.currentUser.id) {
                this.addNewNotification(data.notification);
                this.updateUnreadCount(this.unreadCount + 1);
                this.showToastNotification(data.notification);
            }
        });

        // Listen for notification updates
        const unsubscribeNotificationUpdate = realtimeService.on('notification_updated', (data) => {
            if (data.user_id === this.currentUser.id) {
                this.updateNotification(data.notification);
            }
        });

        // Listen for unread count updates
        const unsubscribeUnreadCount = realtimeService.on('unread_count_updated', (data) => {
            if (data.user_id === this.currentUser.id) {
                this.updateUnreadCount(data.count);
            }
        });

        this.realtimeUnsubscribers.push(
            unsubscribeNewNotification,
            unsubscribeNotificationUpdate,
            unsubscribeUnreadCount
        );
    }

    async toggleDropdown() {
        if (this.isOpen) {
            this.closeDropdown();
        } else {
            await this.openDropdown();
        }
    }

    async openDropdown() {
        if (this.isOpen) return;

        this.isOpen = true;
        this.dropdown = this.container.querySelector('.notification-dropdown');
        
        if (this.dropdown) {
            this.dropdown.style.display = 'block';
            this.bellIcon.classList.add('active');
            
            // Load notifications if not already loaded
            if (this.notifications.length === 0) {
                await this.loadNotifications();
            }
        }
    }

    closeDropdown() {
        if (!this.isOpen) return;

        this.isOpen = false;
        
        if (this.dropdown) {
            this.dropdown.style.display = 'none';
            this.bellIcon.classList.remove('active');
        }
    }

    async loadNotifications(page = 1) {
        if (this.isLoading) return;

        try {
            this.isLoading = true;
            
            if (page === 1) {
                this.showLoadingState();
            }

            const response = await API.get('/api/notifications', {
                page,
                limit: 10
            });

            if (response.success) {
                if (page === 1) {
                    this.notifications = response.data.notifications;
                } else {
                    this.notifications.push(...response.data.notifications);
                }
                
                this.currentPage = page;
                this.hasMore = page < response.data.pages;
                
                this.renderNotifications();
                this.updateUnreadCount(response.data.unread_count);
            } else {
                this.showErrorState('Failed to load notifications');
            }

        } catch (error) {
            console.error('Failed to load notifications:', error);
            this.showErrorState('Failed to load notifications');
        } finally {
            this.isLoading = false;
        }
    }

    async loadMoreNotifications() {
        if (!this.hasMore || this.isLoading) return;
        
        await this.loadNotifications(this.currentPage + 1);
    }

    async loadUnreadCount() {
        try {
            const response = await API.get('/api/notifications/unread-count');
            
            if (response.success) {
                this.updateUnreadCount(response.data.unread_count);
            }
        } catch (error) {
            console.error('Failed to load unread count:', error);
        }
    }

    renderNotifications() {
        const listContainer = this.container.querySelector('.notification-list');
        if (!listContainer) return;

        if (this.notifications.length === 0) {
            listContainer.innerHTML = this.getEmptyStateHTML();
            return;
        }

        listContainer.innerHTML = this.notifications.map(notification => 
            this.getNotificationItemHTML(notification)
        ).join('');

        // Add click handlers
        listContainer.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const notificationId = item.dataset.notificationId;
                this.handleNotificationClick(notificationId);
            });
        });
    }

    getNotificationItemHTML(notification) {
        const isUnread = !notification.is_read;
        const iconClass = this.getNotificationIcon(notification.type);
        const priorityClass = this.getPriorityClass(notification.priority);
        
        return `
            <div class="notification-item dropdown-item ${isUnread ? 'unread' : ''} ${priorityClass}" 
                 data-notification-id="${notification.id}"
                 role="button">
                <div class="d-flex align-items-start">
                    <div class="notification-icon me-3 mt-1">
                        <i class="${iconClass}"></i>
                    </div>
                    
                    <div class="notification-content flex-grow-1">
                        <div class="notification-title fw-semibold">
                            ${notification.title}
                        </div>
                        <div class="notification-message text-muted small">
                            ${notification.message}
                        </div>
                        <div class="notification-time text-muted small">
                            ${notification.time_ago}
                        </div>
                    </div>
                    
                    ${isUnread ? `
                        <div class="notification-indicator">
                            <span class="badge bg-primary rounded-pill"></span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    getEmptyStateHTML() {
        return `
            <div class="empty-state text-center py-4">
                <i class="fas fa-bell-slash fa-3x text-muted mb-3"></i>
                <h6>No notifications</h6>
                <p class="text-muted small">You're all caught up!</p>
            </div>
        `;
    }

    showLoadingState() {
        const listContainer = this.container.querySelector('.notification-list');
        if (listContainer) {
            listContainer.innerHTML = `
                <div class="loading-state text-center py-4">
                    <div class="spinner-border spinner-border-sm text-primary" role="status">
                        <span class="visually-hidden">Loading notifications...</span>
                    </div>
                </div>
            `;
        }
    }

    showErrorState(message) {
        const listContainer = this.container.querySelector('.notification-list');
        if (listContainer) {
            listContainer.innerHTML = `
                <div class="error-state text-center py-4">
                    <i class="fas fa-exclamation-triangle text-warning mb-2"></i>
                    <p class="text-muted small mb-2">${message}</p>
                    <button class="btn btn-sm btn-outline-primary retry-btn">
                        Try Again
                    </button>
                </div>
            `;
            
            listContainer.querySelector('.retry-btn').addEventListener('click', () => {
                this.loadNotifications(1);
            });
        }
    }

    async handleNotificationClick(notificationId) {
        const notification = this.notifications.find(n => n.id == notificationId);
        if (!notification) return;

        // Mark as read if unread
        if (!notification.is_read) {
            await this.markAsRead(notificationId);
        }

        // Navigate to action URL if available
        if (notification.action_url) {
            window.location.href = notification.action_url;
        }

        this.closeDropdown();
    }

    async markAsRead(notificationId) {
        try {
            const response = await API.put(`/api/notifications/${notificationId}/read`);
            
            if (response.success) {
                // Update local notification
                const notification = this.notifications.find(n => n.id == notificationId);
                if (notification) {
                    notification.is_read = true;
                }
                
                this.updateUnreadCount(response.data.unread_count);
                this.renderNotifications();
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    }

    async markAllAsRead() {
        try {
            const response = await API.put('/api/notifications/mark-all-read');
            
            if (response.success) {
                // Update all local notifications
                this.notifications.forEach(notification => {
                    notification.is_read = true;
                });
                
                this.updateUnreadCount(0);
                this.renderNotifications();
            }
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        }
    }

    addNewNotification(notification) {
        this.notifications.unshift(notification);
        
        // Keep only latest 50 notifications in memory
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(0, 50);
        }
        
        if (this.isOpen) {
            this.renderNotifications();
        }
    }

    updateNotification(updatedNotification) {
        const index = this.notifications.findIndex(n => n.id === updatedNotification.id);
        if (index !== -1) {
            this.notifications[index] = updatedNotification;
            
            if (this.isOpen) {
                this.renderNotifications();
            }
        }
    }

    updateUnreadCount(count) {
        this.unreadCount = count;
        
        const badge = this.container?.querySelector('.notification-badge');
        const countElement = this.container?.querySelector('.notification-badge .count');
        
        if (badge && countElement) {
            if (count > 0) {
                badge.style.display = 'inline-block';
                countElement.textContent = count > 99 ? '99+' : count;
            } else {
                badge.style.display = 'none';
            }
        }
    }

    showToastNotification(notification) {
        // Create toast notification for new notifications
        const toast = document.createElement('div');
        toast.className = 'notification-toast position-fixed top-0 end-0 m-3';
        toast.style.zIndex = '10000';
        toast.innerHTML = `
            <div class="toast show" role="alert">
                <div class="toast-header">
                    <i class="${this.getNotificationIcon(notification.type)} me-2"></i>
                    <strong class="me-auto">${notification.title}</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">
                    ${notification.message}
                </div>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
        
        // Handle close button
        const closeBtn = toast.querySelector('.btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            });
        }
    }

    getNotificationIcon(type) {
        const icons = {
            'new_follower': 'fas fa-user-plus text-primary',
            'new_like': 'fas fa-heart text-danger',
            'new_comment': 'fas fa-comment text-info',
            'interview_featured': 'fas fa-star text-warning',
            'event_reminder': 'fas fa-calendar text-success',
            'business_verified': 'fas fa-check-circle text-success',
            'system_announcement': 'fas fa-bullhorn text-warning',
            'default': 'fas fa-bell text-secondary'
        };
        
        return icons[type] || icons.default;
    }

    getPriorityClass(priority) {
        const classes = {
            'urgent': 'notification-urgent',
            'high': 'notification-high',
            'normal': '',
            'low': 'notification-low'
        };
        
        return classes[priority] || '';
    }

    startPolling() {
        // Poll for new notifications every 30 seconds
        this.pollInterval = setInterval(() => {
            if (!document.hidden) {
                this.loadUnreadCount();
            }
        }, 30000);
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    destroy() {
        this.stopPolling();
        
        // Clean up real-time listeners
        this.realtimeUnsubscribers.forEach(unsubscribe => unsubscribe());
        this.realtimeUnsubscribers = [];
        
        // Remove DOM elements
        if (this.container) {
            this.container.remove();
        }
    }
}

// Create singleton instance
const notificationCenter = new NotificationCenter();
export { notificationCenter };
