import API from '../../services/api.js';
import Auth from '../../services/auth.js';

export default class NotificationsPage {
    constructor() {
        this.notifications = [];
        this.isLoading = false;
        this.currentPage = 1;
        this.totalPages = 1;
        this.filter = 'all'; // all, unread
        this.preferences = {};
    }

    async render(container) {
        if (!Auth.isAuthenticated()) {
            window.location.href = '/login';
            return;
        }

        container.innerHTML = this.getHTML();
        this.setupEventListeners(container);
        
        await this.loadNotifications();
        await this.loadPreferences();
    }

    getHTML() {
        return `
            <div class="notifications-page">
                <div class="container py-4">
                    <div class="row">
                        <div class="col-md-8">
                            <div class="d-flex justify-content-between align-items-center mb-4">
                                <h2>Notifications</h2>
                                <div class="d-flex gap-2">
                                    <select class="form-select form-select-sm" id="notification-filter" style="width: auto;">
                                        <option value="all">All Notifications</option>
                                        <option value="unread">Unread Only</option>
                                    </select>
                                    <button class="btn btn-sm btn-outline-primary" id="mark-all-read-btn">
                                        Mark All Read
                                    </button>
                                </div>
                            </div>
                            
                            <div id="notifications-container">
                                ${this.getNotificationsHTML()}
                            </div>
                            
                            ${this.getPaginationHTML()}
                        </div>
                        
                        <div class="col-md-4">
                            ${this.getPreferencesHTML()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getNotificationsHTML() {
        if (this.isLoading) {
            return `
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading notifications...</span>
                    </div>
                </div>
            `;
        }

        if (this.notifications.length === 0) {
            return `
                <div class="text-center py-5">
                    <i class="fas fa-bell-slash fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">No notifications</h5>
                    <p class="text-muted">
                        ${this.filter === 'unread' ? 'You have no unread notifications.' : 'You haven\'t received any notifications yet.'}
                    </p>
                </div>
            `;
        }

        return `
            <div class="notification-list">
                ${this.notifications.map(notification => this.getNotificationHTML(notification)).join('')}
            </div>
        `;
    }

    getNotificationHTML(notification) {
        const isUnread = !notification.read_at;
        const timeAgo = this.getTimeAgo(new Date(notification.created_at));
        
        return `
            <div class="card mb-3 notification-card ${isUnread ? 'border-primary' : ''}" 
                 data-notification-id="${notification.id}">
                <div class="card-body">
                    <div class="d-flex">
                        <div class="flex-shrink-0 me-3">
                            ${this.getNotificationIcon(notification)}
                        </div>
                        <div class="flex-grow-1">
                            <div class="d-flex justify-content-between align-items-start">
                                <div class="notification-content">
                                    <h6 class="mb-1 ${isUnread ? 'fw-bold' : ''}">${notification.title}</h6>
                                    <p class="mb-2 text-muted">${notification.message}</p>
                                    <small class="text-muted">
                                        <i class="fas fa-clock me-1"></i>${timeAgo}
                                        ${isUnread ? '<span class="badge bg-primary ms-2">New</span>' : ''}
                                    </small>
                                </div>
                                <div class="notification-actions">
                                    ${isUnread ? `
                                        <button class="btn btn-sm btn-outline-primary me-2 mark-read-btn" 
                                                data-notification-id="${notification.id}">
                                            Mark Read
                                        </button>
                                    ` : ''}
                                    <button class="btn btn-sm btn-outline-danger delete-notification-btn" 
                                            data-notification-id="${notification.id}">
                                        Delete
                                    </button>
                                </div>
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
                             width="50" height="50"
                             onerror="this.src='/assets/default-avatar.png'">
                        <span class="position-absolute bottom-0 end-0 bg-primary rounded-circle p-1">
                            <i class="fas fa-user-plus text-white" style="font-size: 12px;"></i>
                        </span>
                    </div>
                `;
            case 'unfollow':
                return `
                    <div class="position-relative">
                        <img src="${avatarUrl}" 
                             alt="User" 
                             class="rounded-circle" 
                             width="50" height="50"
                             onerror="this.src='/assets/default-avatar.png'">
                        <span class="position-absolute bottom-0 end-0 bg-secondary rounded-circle p-1">
                            <i class="fas fa-user-minus text-white" style="font-size: 12px;"></i>
                        </span>
                    </div>
                `;
            default:
                return `
                    <div class="bg-primary rounded-circle d-flex align-items-center justify-content-center" 
                         style="width: 50px; height: 50px;">
                        <i class="fas fa-bell text-white"></i>
                    </div>
                `;
        }
    }

    getPaginationHTML() {
        if (this.totalPages <= 1) {
            return '';
        }

        return `
            <nav aria-label="Notifications pagination" class="mt-4">
                <ul class="pagination justify-content-center">
                    <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                        <button class="page-link" data-page="${this.currentPage - 1}" ${this.currentPage === 1 ? 'disabled' : ''}>
                            Previous
                        </button>
                    </li>
                    ${this.getPaginationNumbers()}
                    <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                        <button class="page-link" data-page="${this.currentPage + 1}" ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                            Next
                        </button>
                    </li>
                </ul>
            </nav>
        `;
    }

    getPaginationNumbers() {
        let html = '';
        const start = Math.max(1, this.currentPage - 2);
        const end = Math.min(this.totalPages, this.currentPage + 2);

        for (let i = start; i <= end; i++) {
            html += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <button class="page-link" data-page="${i}">${i}</button>
                </li>
            `;
        }

        return html;
    }

    getPreferencesHTML() {
        return `
            <div class="card">
                <div class="card-header">
                    <h6 class="mb-0">Notification Preferences</h6>
                </div>
                <div class="card-body">
                    <div id="preferences-container">
                        ${this.getPreferencesFormHTML()}
                    </div>
                </div>
            </div>
        `;
    }

    getPreferencesFormHTML() {
        const types = [
            { key: 'follow', label: 'New Followers', icon: 'user-plus' },
            { key: 'unfollow', label: 'Unfollows', icon: 'user-minus' },
            { key: 'like', label: 'Likes', icon: 'heart' },
            { key: 'comment', label: 'Comments', icon: 'comment' },
            { key: 'interview_published', label: 'New Interviews', icon: 'video' },
            { key: 'mention', label: 'Mentions', icon: 'at' },
            { key: 'system', label: 'System Updates', icon: 'cog' }
        ];

        return `
            <form id="preferences-form">
                ${types.map(type => {
                    const pref = this.preferences[type.key] || { enabled: true, email_enabled: false };
                    return `
                        <div class="mb-3">
                            <div class="d-flex align-items-center justify-content-between">
                                <div class="d-flex align-items-center">
                                    <i class="fas fa-${type.icon} me-2 text-muted"></i>
                                    <span>${type.label}</span>
                                </div>
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" 
                                           id="${type.key}_enabled" 
                                           name="${type.key}[enabled]"
                                           ${pref.enabled ? 'checked' : ''}>
                                </div>
                            </div>
                            ${pref.enabled ? `
                                <div class="ms-4 mt-2">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" 
                                               id="${type.key}_email" 
                                               name="${type.key}[email_enabled]"
                                               ${pref.email_enabled ? 'checked' : ''}>
                                        <label class="form-check-label small text-muted" for="${type.key}_email">
                                            Email notifications
                                        </label>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
                
                <button type="submit" class="btn btn-primary btn-sm w-100">
                    Save Preferences
                </button>
            </form>
        `;
    }

    setupEventListeners(container) {
        // Filter change
        const filterSelect = container.querySelector('#notification-filter');
        filterSelect.addEventListener('change', (e) => {
            this.filter = e.target.value;
            this.currentPage = 1;
            this.loadNotifications();
        });

        // Mark all as read
        const markAllReadBtn = container.querySelector('#mark-all-read-btn');
        markAllReadBtn.addEventListener('click', () => this.markAllAsRead());

        // Individual notification actions
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('mark-read-btn')) {
                const notificationId = e.target.dataset.notificationId;
                this.markAsRead(notificationId);
            }

            if (e.target.classList.contains('delete-notification-btn')) {
                const notificationId = e.target.dataset.notificationId;
                this.deleteNotification(notificationId);
            }
        });

        // Pagination
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('page-link') && e.target.dataset.page) {
                const page = parseInt(e.target.dataset.page);
                if (page !== this.currentPage) {
                    this.currentPage = page;
                    this.loadNotifications();
                }
            }
        });

        // Preferences form
        const preferencesForm = container.querySelector('#preferences-form');
        preferencesForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePreferences(e.target);
        });

        // Toggle email preferences based on main toggle
        container.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' && e.target.id.endsWith('_enabled')) {
                const type = e.target.id.replace('_enabled', '');
                const emailCheckbox = container.querySelector(`#${type}_email`);
                const emailContainer = emailCheckbox?.closest('.ms-4');

                if (emailContainer) {
                    emailContainer.style.display = e.target.checked ? 'block' : 'none';
                }
            }
        });
    }

    async loadNotifications() {
        try {
            this.isLoading = true;
            this.updateNotificationsContainer();

            const params = {
                page: this.currentPage,
                limit: 20
            };

            if (this.filter === 'unread') {
                params.unread_only = true;
            }

            const response = await API.getNotifications(params);

            if (response.success) {
                this.notifications = response.data.items || [];
                this.totalPages = Math.ceil((response.data.total || 0) / 20);
                this.updateNotificationsContainer();
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            this.isLoading = false;
        }
    }

    async loadPreferences() {
        try {
            const response = await API.getNotificationPreferences();

            if (response.success) {
                this.preferences = response.data || {};
                this.updatePreferencesForm();
            }
        } catch (error) {
            console.error('Failed to load preferences:', error);
        }
    }

    async markAsRead(notificationId) {
        try {
            const response = await API.markNotificationAsRead(notificationId);

            if (response.success) {
                const notification = this.notifications.find(n => n.id == notificationId);
                if (notification) {
                    notification.read_at = new Date().toISOString();
                    this.updateNotificationsContainer();
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
                this.notifications.forEach(notification => {
                    if (!notification.read_at) {
                        notification.read_at = new Date().toISOString();
                    }
                });
                this.updateNotificationsContainer();
            }
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        }
    }

    async deleteNotification(notificationId) {
        if (!confirm('Are you sure you want to delete this notification?')) {
            return;
        }

        try {
            const response = await API.deleteNotification(notificationId);

            if (response.success) {
                const index = this.notifications.findIndex(n => n.id == notificationId);
                if (index !== -1) {
                    this.notifications.splice(index, 1);
                    this.updateNotificationsContainer();
                }
            }
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    }

    async savePreferences(form) {
        try {
            const formData = new FormData(form);
            const preferences = {};

            // Parse form data into preferences object
            for (const [key, value] of formData.entries()) {
                const [type, setting] = key.split('[');
                const settingName = setting.replace(']', '');

                if (!preferences[type]) {
                    preferences[type] = {};
                }

                preferences[type][settingName] = value === 'on';
            }

            // Ensure all types have enabled property
            const types = ['follow', 'unfollow', 'like', 'comment', 'interview_published', 'mention', 'system'];
            types.forEach(type => {
                if (!preferences[type]) {
                    preferences[type] = { enabled: false, email_enabled: false };
                }
                if (!preferences[type].hasOwnProperty('enabled')) {
                    preferences[type].enabled = false;
                }
                if (!preferences[type].hasOwnProperty('email_enabled')) {
                    preferences[type].email_enabled = false;
                }
            });

            const response = await API.updateNotificationPreferences(preferences);

            if (response.success) {
                this.preferences = response.data || {};
                this.showAlert('success', 'Notification preferences saved successfully!');
            }
        } catch (error) {
            console.error('Failed to save preferences:', error);
            this.showAlert('error', 'Failed to save preferences');
        }
    }

    updateNotificationsContainer() {
        const container = document.getElementById('notifications-container');
        if (container) {
            container.innerHTML = this.getNotificationsHTML();
        }

        // Update pagination
        const paginationContainer = container?.parentNode.querySelector('nav[aria-label="Notifications pagination"]');
        if (paginationContainer) {
            paginationContainer.outerHTML = this.getPaginationHTML();
        }
    }

    updatePreferencesForm() {
        const container = document.getElementById('preferences-container');
        if (container) {
            container.innerHTML = this.getPreferencesFormHTML();
        }
    }

    showAlert(type, message) {
        const alertHtml = `
            <div class="alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        const container = document.querySelector('.notifications-page .container');
        container.insertAdjacentHTML('afterbegin', alertHtml);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            const alert = container.querySelector('.alert');
            if (alert) {
                alert.remove();
            }
        }, 5000);
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) {
            return 'Just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 2592000) {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
}
