/**
 * Notification Service
 * Handles push notifications, service worker registration, and notification permissions
 */

import API from './api.js';
import Auth from './auth.js';

export default class NotificationService {
    constructor() {
        this.swRegistration = null;
        this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
        this.permission = Notification.permission;
        this.subscriptionEndpoint = '/api/push-subscriptions';
    }

    /**
     * Initialize notification service
     */
    async init() {
        if (!this.isSupported) {
            console.warn('Push notifications are not supported in this browser');
            return false;
        }

        try {
            // Register service worker
            await this.registerServiceWorker();
            
            // Check existing subscription
            await this.checkExistingSubscription();
            
            return true;
        } catch (error) {
            console.error('Failed to initialize notification service:', error);
            return false;
        }
    }

    /**
     * Register service worker for push notifications
     */
    async registerServiceWorker() {
        try {
            this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });

            console.log('Service Worker registered successfully');

            // Listen for service worker updates
            this.swRegistration.addEventListener('updatefound', () => {
                console.log('Service Worker update found');
            });

            return this.swRegistration;
        } catch (error) {
            console.error('Service Worker registration failed:', error);
            throw error;
        }
    }

    /**
     * Request notification permission from user
     */
    async requestPermission() {
        if (!this.isSupported) {
            throw new Error('Push notifications are not supported');
        }

        if (this.permission === 'granted') {
            return true;
        }

        if (this.permission === 'denied') {
            throw new Error('Notification permission was denied');
        }

        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;

            if (permission === 'granted') {
                console.log('Notification permission granted');
                return true;
            } else {
                throw new Error('Notification permission was denied');
            }
        } catch (error) {
            console.error('Failed to request notification permission:', error);
            throw error;
        }
    }

    /**
     * Subscribe to push notifications
     */
    async subscribe() {
        try {
            // Request permission first
            await this.requestPermission();

            if (!this.swRegistration) {
                await this.registerServiceWorker();
            }

            // Get VAPID public key from server
            const vapidKey = await this.getVapidPublicKey();

            // Subscribe to push notifications
            const subscription = await this.swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(vapidKey)
            });

            // Send subscription to server
            await this.sendSubscriptionToServer(subscription);

            console.log('Successfully subscribed to push notifications');
            return subscription;

        } catch (error) {
            console.error('Failed to subscribe to push notifications:', error);
            throw error;
        }
    }

    /**
     * Unsubscribe from push notifications
     */
    async unsubscribe() {
        try {
            if (!this.swRegistration) {
                return true;
            }

            const subscription = await this.swRegistration.pushManager.getSubscription();
            
            if (subscription) {
                // Unsubscribe from browser
                await subscription.unsubscribe();
                
                // Remove subscription from server
                await this.removeSubscriptionFromServer(subscription);
                
                console.log('Successfully unsubscribed from push notifications');
            }

            return true;
        } catch (error) {
            console.error('Failed to unsubscribe from push notifications:', error);
            throw error;
        }
    }

    /**
     * Check if user is currently subscribed
     */
    async isSubscribed() {
        try {
            if (!this.swRegistration) {
                return false;
            }

            const subscription = await this.swRegistration.pushManager.getSubscription();
            return subscription !== null;
        } catch (error) {
            console.error('Failed to check subscription status:', error);
            return false;
        }
    }

    /**
     * Get current subscription
     */
    async getSubscription() {
        try {
            if (!this.swRegistration) {
                return null;
            }

            return await this.swRegistration.pushManager.getSubscription();
        } catch (error) {
            console.error('Failed to get subscription:', error);
            return null;
        }
    }

    /**
     * Show local notification
     */
    async showNotification(title, options = {}) {
        if (!this.isSupported || this.permission !== 'granted') {
            console.warn('Cannot show notification: permission not granted');
            return;
        }

        const defaultOptions = {
            icon: '/images/notification-icon.png',
            badge: '/images/notification-badge.png',
            vibrate: [200, 100, 200],
            requireInteraction: false,
            silent: false,
            ...options
        };

        try {
            if (this.swRegistration) {
                // Show notification via service worker
                await this.swRegistration.showNotification(title, defaultOptions);
            } else {
                // Fallback to browser notification
                new Notification(title, defaultOptions);
            }
        } catch (error) {
            console.error('Failed to show notification:', error);
        }
    }

    /**
     * Test notification functionality
     */
    async testNotification() {
        try {
            await this.showNotification('Test Notification', {
                body: 'This is a test notification from Interviews.tv',
                icon: '/images/logo-icon.png',
                tag: 'test-notification',
                data: {
                    url: window.location.origin
                }
            });
        } catch (error) {
            console.error('Failed to show test notification:', error);
            throw error;
        }
    }

    /**
     * Handle notification click events
     */
    setupNotificationClickHandler() {
        if (!this.swRegistration) return;

        // This would typically be handled in the service worker
        // But we can set up message listeners here
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
                const notificationData = event.data.notification;
                this.handleNotificationClick(notificationData);
            }
        });
    }

    /**
     * Handle notification click
     */
    handleNotificationClick(notificationData) {
        // Focus window if it exists
        if (window.focus) {
            window.focus();
        }

        // Navigate to URL if provided
        if (notificationData.data && notificationData.data.url) {
            window.location.href = notificationData.data.url;
        }
    }

    /**
     * Get notification preferences
     */
    async getPreferences() {
        try {
            const response = await API.get('/api/notifications/preferences');
            
            if (response.success) {
                return response.data;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('Failed to get notification preferences:', error);
            throw error;
        }
    }

    /**
     * Update notification preferences
     */
    async updatePreferences(preferences) {
        try {
            const response = await API.put('/api/notifications/preferences', {
                preferences
            });
            
            if (response.success) {
                return response.data;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('Failed to update notification preferences:', error);
            throw error;
        }
    }

    /**
     * Check existing subscription on page load
     */
    async checkExistingSubscription() {
        try {
            const subscription = await this.getSubscription();
            
            if (subscription) {
                // Verify subscription is still valid on server
                await this.verifySubscriptionOnServer(subscription);
            }
        } catch (error) {
            console.error('Failed to check existing subscription:', error);
        }
    }

    /**
     * Get VAPID public key from server
     */
    async getVapidPublicKey() {
        try {
            const response = await API.get('/api/push/vapid-key');
            
            if (response.success) {
                return response.data.public_key;
            } else {
                throw new Error('Failed to get VAPID public key');
            }
        } catch (error) {
            console.error('Failed to get VAPID public key:', error);
            throw error;
        }
    }

    /**
     * Send subscription to server
     */
    async sendSubscriptionToServer(subscription) {
        try {
            const user = Auth.getCurrentUser();
            if (!user) {
                throw new Error('User not authenticated');
            }

            const response = await API.post(this.subscriptionEndpoint, {
                subscription: subscription.toJSON(),
                user_id: user.id
            });

            if (!response.success) {
                throw new Error(response.message || 'Failed to save subscription');
            }

            return response.data;
        } catch (error) {
            console.error('Failed to send subscription to server:', error);
            throw error;
        }
    }

    /**
     * Remove subscription from server
     */
    async removeSubscriptionFromServer(subscription) {
        try {
            const response = await API.delete(this.subscriptionEndpoint, {
                subscription: subscription.toJSON()
            });

            if (!response.success) {
                console.warn('Failed to remove subscription from server:', response.message);
            }

            return response.data;
        } catch (error) {
            console.error('Failed to remove subscription from server:', error);
            throw error;
        }
    }

    /**
     * Verify subscription is still valid on server
     */
    async verifySubscriptionOnServer(subscription) {
        try {
            const response = await API.post('/api/push/verify-subscription', {
                subscription: subscription.toJSON()
            });

            if (!response.success) {
                console.warn('Subscription is no longer valid on server');
                // Re-subscribe if needed
                await this.subscribe();
            }

            return response.data;
        } catch (error) {
            console.error('Failed to verify subscription on server:', error);
        }
    }

    /**
     * Convert VAPID key to Uint8Array
     */
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }

        return outputArray;
    }

    /**
     * Get notification support info
     */
    getSupportInfo() {
        return {
            isSupported: this.isSupported,
            permission: this.permission,
            hasServiceWorker: 'serviceWorker' in navigator,
            hasPushManager: 'PushManager' in window,
            hasNotificationAPI: 'Notification' in window
        };
    }

    /**
     * Request permission with user-friendly UI
     */
    async requestPermissionWithUI() {
        return new Promise((resolve, reject) => {
            // Create permission request modal
            const modal = document.createElement('div');
            modal.className = 'notification-permission-modal';
            modal.innerHTML = `
                <div class="modal fade show" style="display: block;">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="fas fa-bell me-2"></i>
                                    Enable Notifications
                                </h5>
                            </div>
                            <div class="modal-body">
                                <p>Stay updated with the latest interviews, comments, and activity on Interviews.tv.</p>
                                <ul class="list-unstyled">
                                    <li><i class="fas fa-check text-success me-2"></i>New follower notifications</li>
                                    <li><i class="fas fa-check text-success me-2"></i>Comment and like alerts</li>
                                    <li><i class="fas fa-check text-success me-2"></i>Featured interview announcements</li>
                                    <li><i class="fas fa-check text-success me-2"></i>Event reminders</li>
                                </ul>
                                <p class="text-muted small">You can change these settings anytime in your preferences.</p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-action="deny">
                                    Not Now
                                </button>
                                <button type="button" class="btn btn-primary" data-action="allow">
                                    <i class="fas fa-bell me-1"></i>
                                    Enable Notifications
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-backdrop fade show"></div>
            `;

            document.body.appendChild(modal);

            // Handle button clicks
            modal.addEventListener('click', async (e) => {
                const action = e.target.dataset.action;
                
                if (action === 'allow') {
                    try {
                        await this.requestPermission();
                        resolve(true);
                    } catch (error) {
                        reject(error);
                    }
                } else if (action === 'deny') {
                    resolve(false);
                }

                // Remove modal
                document.body.removeChild(modal);
            });
        });
    }

    /**
     * Cleanup
     */
    destroy() {
        // Unregister service worker if needed
        if (this.swRegistration) {
            // Note: We typically don't unregister service workers
            // as they may be used by other parts of the app
        }
    }
}

// Create singleton instance
const notificationService = new NotificationService();
export { notificationService };
