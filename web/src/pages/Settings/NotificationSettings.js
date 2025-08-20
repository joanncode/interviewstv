/**
 * Notification Settings Page
 * Allows users to manage their notification preferences
 */

import API from '../../services/api.js';
import Auth from '../../services/auth.js';
import { notificationService } from '../../services/notifications.js';

export default class NotificationSettings {
    constructor() {
        this.currentUser = Auth.getCurrentUser();
        this.preferences = {};
        this.isLoading = false;
        this.hasChanges = false;
        this.container = null;
    }

    async render(container) {
        this.container = container;
        
        if (!this.currentUser) {
            window.location.href = '/login';
            return;
        }

        container.innerHTML = this.getLoadingHTML();
        
        try {
            await this.loadPreferences();
            await this.loadPushNotificationStatus();
            this.renderSettings();
        } catch (error) {
            console.error('Failed to load notification settings:', error);
            this.renderError('Failed to load notification settings');
        }
    }

    async loadPreferences() {
        const response = await API.get('/api/notifications/preferences');
        
        if (response.success) {
            this.preferences = response.data;
        } else {
            throw new Error(response.message || 'Failed to load preferences');
        }
    }

    async loadPushNotificationStatus() {
        this.pushNotificationStatus = {
            supported: notificationService.isSupported,
            permission: notificationService.permission,
            subscribed: await notificationService.isSubscribed()
        };
    }

    renderSettings() {
        this.container.innerHTML = this.getSettingsHTML();
        this.setupEventListeners();
    }

    getLoadingHTML() {
        return `
            <div class="container mt-4">
                <div class="row justify-content-center">
                    <div class="col-md-8">
                        <div class="card">
                            <div class="card-body text-center py-5">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                                <p class="mt-3">Loading notification settings...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getSettingsHTML() {
        return `
            <div class="container mt-4">
                <div class="row justify-content-center">
                    <div class="col-md-8">
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <h2>Notification Settings</h2>
                            <button class="btn btn-outline-secondary" onclick="history.back()">
                                <i class="fas fa-arrow-left me-2"></i>Back
                            </button>
                        </div>

                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <i class="fas fa-bell me-2"></i>
                                    Notification Preferences
                                </h5>
                            </div>
                            <div class="card-body">
                                ${this.getPushNotificationSection()}
                                ${this.getNotificationTypesSection()}
                                ${this.getDigestSection()}
                                ${this.getAdvancedSection()}
                            </div>
                            <div class="card-footer">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div class="save-status text-muted small"></div>
                                    <div>
                                        <button class="btn btn-secondary me-2 reset-btn">
                                            Reset to Defaults
                                        </button>
                                        <button class="btn btn-primary save-btn" disabled>
                                            <i class="fas fa-save me-2"></i>
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        ${this.getTestSection()}
                    </div>
                </div>
            </div>
        `;
    }

    getPushNotificationSection() {
        const { supported, permission, subscribed } = this.pushNotificationStatus;
        
        if (!supported) {
            return `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Push notifications are not supported in your browser.
                </div>
            `;
        }

        let statusText = '';
        let actionButton = '';

        if (permission === 'denied') {
            statusText = '<span class="text-danger">Blocked</span> - You have blocked notifications for this site.';
            actionButton = `
                <button class="btn btn-outline-primary btn-sm" disabled>
                    Enable in Browser Settings
                </button>
            `;
        } else if (permission === 'granted' && subscribed) {
            statusText = '<span class="text-success">Enabled</span> - You will receive push notifications.';
            actionButton = `
                <button class="btn btn-outline-danger btn-sm disable-push-btn">
                    Disable Push Notifications
                </button>
            `;
        } else {
            statusText = '<span class="text-warning">Disabled</span> - Enable to receive instant notifications.';
            actionButton = `
                <button class="btn btn-primary btn-sm enable-push-btn">
                    Enable Push Notifications
                </button>
            `;
        }

        return `
            <div class="mb-4">
                <h6>Push Notifications</h6>
                <div class="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                    <div>
                        <div class="fw-semibold">Browser Notifications</div>
                        <div class="text-muted small">${statusText}</div>
                    </div>
                    <div>
                        ${actionButton}
                    </div>
                </div>
            </div>
        `;
    }

    getNotificationTypesSection() {
        const notificationTypes = [
            {
                key: 'new_follower',
                title: 'New Followers',
                description: 'When someone starts following you'
            },
            {
                key: 'new_like',
                title: 'Likes',
                description: 'When someone likes your content'
            },
            {
                key: 'new_comment',
                title: 'Comments',
                description: 'When someone comments on your content'
            },
            {
                key: 'interview_featured',
                title: 'Featured Content',
                description: 'When your interview is featured'
            },
            {
                key: 'event_reminder',
                title: 'Event Reminders',
                description: 'Reminders for events you\'re attending'
            },
            {
                key: 'business_verified',
                title: 'Business Updates',
                description: 'Updates about your business verification'
            },
            {
                key: 'system_announcement',
                title: 'System Announcements',
                description: 'Important updates from Interviews.tv'
            }
        ];

        return `
            <div class="mb-4">
                <h6>Notification Types</h6>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th class="text-center">In-App</th>
                                <th class="text-center">Email</th>
                                <th class="text-center">Push</th>
                                <th class="text-center">Frequency</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${notificationTypes.map(type => this.getNotificationTypeRow(type)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    getNotificationTypeRow(type) {
        const prefs = this.preferences[type.key] || {
            in_app_enabled: true,
            email_enabled: true,
            push_enabled: true,
            frequency: 'immediate'
        };

        return `
            <tr data-notification-type="${type.key}">
                <td>
                    <div class="fw-semibold">${type.title}</div>
                    <div class="text-muted small">${type.description}</div>
                </td>
                <td class="text-center">
                    <div class="form-check form-switch">
                        <input class="form-check-input in-app-toggle" type="checkbox" 
                               ${prefs.in_app_enabled ? 'checked' : ''}>
                    </div>
                </td>
                <td class="text-center">
                    <div class="form-check form-switch">
                        <input class="form-check-input email-toggle" type="checkbox" 
                               ${prefs.email_enabled ? 'checked' : ''}>
                    </div>
                </td>
                <td class="text-center">
                    <div class="form-check form-switch">
                        <input class="form-check-input push-toggle" type="checkbox" 
                               ${prefs.push_enabled ? 'checked' : ''}>
                    </div>
                </td>
                <td class="text-center">
                    <select class="form-select form-select-sm frequency-select" style="width: auto;">
                        <option value="immediate" ${prefs.frequency === 'immediate' ? 'selected' : ''}>Immediate</option>
                        <option value="hourly" ${prefs.frequency === 'hourly' ? 'selected' : ''}>Hourly</option>
                        <option value="daily" ${prefs.frequency === 'daily' ? 'selected' : ''}>Daily</option>
                        <option value="weekly" ${prefs.frequency === 'weekly' ? 'selected' : ''}>Weekly</option>
                        <option value="never" ${prefs.frequency === 'never' ? 'selected' : ''}>Never</option>
                    </select>
                </td>
            </tr>
        `;
    }

    getDigestSection() {
        const digestPrefs = this.preferences.weekly_digest || {
            email_enabled: true,
            frequency: 'weekly'
        };

        return `
            <div class="mb-4">
                <h6>Email Digests</h6>
                <div class="p-3 bg-light rounded">
                    <div class="form-check form-switch mb-3">
                        <input class="form-check-input digest-toggle" type="checkbox" id="digestEnabled"
                               ${digestPrefs.email_enabled ? 'checked' : ''}>
                        <label class="form-check-label" for="digestEnabled">
                            <strong>Weekly Digest</strong>
                        </label>
                    </div>
                    <div class="text-muted small mb-3">
                        Receive a summary of your weekly activity and highlights from the platform.
                    </div>
                    <div class="row">
                        <div class="col-md-6">
                            <label class="form-label small">Frequency</label>
                            <select class="form-select form-select-sm digest-frequency">
                                <option value="daily" ${digestPrefs.frequency === 'daily' ? 'selected' : ''}>Daily</option>
                                <option value="weekly" ${digestPrefs.frequency === 'weekly' ? 'selected' : ''}>Weekly</option>
                                <option value="monthly" ${digestPrefs.frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getAdvancedSection() {
        return `
            <div class="mb-4">
                <h6>Advanced Settings</h6>
                <div class="p-3 bg-light rounded">
                    <div class="form-check mb-3">
                        <input class="form-check-input" type="checkbox" id="quietHours">
                        <label class="form-check-label" for="quietHours">
                            <strong>Quiet Hours</strong>
                        </label>
                    </div>
                    <div class="text-muted small mb-3">
                        Disable notifications during specific hours (coming soon).
                    </div>
                    
                    <div class="form-check mb-3">
                        <input class="form-check-input" type="checkbox" id="smartGrouping">
                        <label class="form-check-label" for="smartGrouping">
                            <strong>Smart Grouping</strong>
                        </label>
                    </div>
                    <div class="text-muted small">
                        Group similar notifications to reduce noise (coming soon).
                    </div>
                </div>
            </div>
        `;
    }

    getTestSection() {
        return `
            <div class="card mt-4">
                <div class="card-header">
                    <h6 class="mb-0">
                        <i class="fas fa-vial me-2"></i>
                        Test Notifications
                    </h6>
                </div>
                <div class="card-body">
                    <p class="text-muted">Test your notification settings to make sure everything is working correctly.</p>
                    <div class="d-flex gap-2 flex-wrap">
                        <button class="btn btn-outline-primary btn-sm test-push-btn">
                            Test Push Notification
                        </button>
                        <button class="btn btn-outline-secondary btn-sm test-email-btn">
                            Test Email Notification
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Push notification controls
        const enablePushBtn = this.container.querySelector('.enable-push-btn');
        const disablePushBtn = this.container.querySelector('.disable-push-btn');
        
        if (enablePushBtn) {
            enablePushBtn.addEventListener('click', () => this.enablePushNotifications());
        }
        
        if (disablePushBtn) {
            disablePushBtn.addEventListener('click', () => this.disablePushNotifications());
        }

        // Notification type toggles
        this.container.querySelectorAll('.in-app-toggle, .email-toggle, .push-toggle, .frequency-select').forEach(input => {
            input.addEventListener('change', () => this.handlePreferenceChange());
        });

        // Digest settings
        this.container.querySelector('.digest-toggle').addEventListener('change', () => this.handlePreferenceChange());
        this.container.querySelector('.digest-frequency').addEventListener('change', () => this.handlePreferenceChange());

        // Save and reset buttons
        this.container.querySelector('.save-btn').addEventListener('click', () => this.savePreferences());
        this.container.querySelector('.reset-btn').addEventListener('click', () => this.resetToDefaults());

        // Test buttons
        this.container.querySelector('.test-push-btn').addEventListener('click', () => this.testPushNotification());
        this.container.querySelector('.test-email-btn').addEventListener('click', () => this.testEmailNotification());
    }

    async enablePushNotifications() {
        try {
            await notificationService.subscribe();
            await this.loadPushNotificationStatus();
            this.renderSettings();
            this.showMessage('Push notifications enabled successfully!', 'success');
        } catch (error) {
            console.error('Failed to enable push notifications:', error);
            this.showMessage('Failed to enable push notifications. Please check your browser settings.', 'error');
        }
    }

    async disablePushNotifications() {
        try {
            await notificationService.unsubscribe();
            await this.loadPushNotificationStatus();
            this.renderSettings();
            this.showMessage('Push notifications disabled.', 'info');
        } catch (error) {
            console.error('Failed to disable push notifications:', error);
            this.showMessage('Failed to disable push notifications.', 'error');
        }
    }

    handlePreferenceChange() {
        this.hasChanges = true;
        this.updateSaveButton();
        this.updatePreferencesFromForm();
    }

    updatePreferencesFromForm() {
        const rows = this.container.querySelectorAll('[data-notification-type]');
        
        rows.forEach(row => {
            const type = row.dataset.notificationType;
            const inAppEnabled = row.querySelector('.in-app-toggle').checked;
            const emailEnabled = row.querySelector('.email-toggle').checked;
            const pushEnabled = row.querySelector('.push-toggle').checked;
            const frequency = row.querySelector('.frequency-select').value;
            
            this.preferences[type] = {
                in_app_enabled: inAppEnabled,
                email_enabled: emailEnabled,
                push_enabled: pushEnabled,
                frequency: frequency
            };
        });

        // Update digest preferences
        const digestEnabled = this.container.querySelector('.digest-toggle').checked;
        const digestFrequency = this.container.querySelector('.digest-frequency').value;
        
        this.preferences.weekly_digest = {
            email_enabled: digestEnabled,
            frequency: digestFrequency
        };
    }

    updateSaveButton() {
        const saveBtn = this.container.querySelector('.save-btn');
        saveBtn.disabled = !this.hasChanges;
    }

    async savePreferences() {
        if (!this.hasChanges) return;

        try {
            this.setLoading(true);
            
            const response = await API.put('/api/notifications/preferences', {
                preferences: this.preferences
            });

            if (response.success) {
                this.hasChanges = false;
                this.updateSaveButton();
                this.showMessage('Notification preferences saved successfully!', 'success');
            } else {
                throw new Error(response.message || 'Failed to save preferences');
            }

        } catch (error) {
            console.error('Failed to save preferences:', error);
            this.showMessage('Failed to save preferences. Please try again.', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async resetToDefaults() {
        if (!confirm('Are you sure you want to reset all notification preferences to defaults?')) {
            return;
        }

        try {
            this.setLoading(true);
            
            // Reset to default preferences
            const defaultPreferences = this.getDefaultPreferences();
            
            const response = await API.put('/api/notifications/preferences', {
                preferences: defaultPreferences
            });

            if (response.success) {
                this.preferences = defaultPreferences;
                this.hasChanges = false;
                this.renderSettings();
                this.showMessage('Preferences reset to defaults.', 'info');
            } else {
                throw new Error(response.message || 'Failed to reset preferences');
            }

        } catch (error) {
            console.error('Failed to reset preferences:', error);
            this.showMessage('Failed to reset preferences. Please try again.', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    getDefaultPreferences() {
        return {
            new_follower: { in_app_enabled: true, email_enabled: true, push_enabled: true, frequency: 'immediate' },
            new_like: { in_app_enabled: true, email_enabled: false, push_enabled: true, frequency: 'immediate' },
            new_comment: { in_app_enabled: true, email_enabled: true, push_enabled: true, frequency: 'immediate' },
            interview_featured: { in_app_enabled: true, email_enabled: true, push_enabled: true, frequency: 'immediate' },
            event_reminder: { in_app_enabled: true, email_enabled: true, push_enabled: true, frequency: 'immediate' },
            business_verified: { in_app_enabled: true, email_enabled: true, push_enabled: true, frequency: 'immediate' },
            system_announcement: { in_app_enabled: true, email_enabled: true, push_enabled: true, frequency: 'immediate' },
            weekly_digest: { email_enabled: true, frequency: 'weekly' }
        };
    }

    async testPushNotification() {
        try {
            await notificationService.testNotification();
            this.showMessage('Test push notification sent!', 'success');
        } catch (error) {
            console.error('Failed to send test notification:', error);
            this.showMessage('Failed to send test notification. Make sure push notifications are enabled.', 'error');
        }
    }

    async testEmailNotification() {
        try {
            const response = await API.post('/api/notifications/test-email');
            
            if (response.success) {
                this.showMessage('Test email sent! Check your inbox.', 'success');
            } else {
                throw new Error(response.message || 'Failed to send test email');
            }
        } catch (error) {
            console.error('Failed to send test email:', error);
            this.showMessage('Failed to send test email. Please try again.', 'error');
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        const saveBtn = this.container.querySelector('.save-btn');
        const resetBtn = this.container.querySelector('.reset-btn');
        
        if (loading) {
            saveBtn.disabled = true;
            resetBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';
        } else {
            saveBtn.disabled = !this.hasChanges;
            resetBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Save Changes';
        }
    }

    showMessage(message, type) {
        const statusElement = this.container.querySelector('.save-status');
        statusElement.className = `save-status small text-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'}`;
        statusElement.textContent = message;
        
        // Clear message after 5 seconds
        setTimeout(() => {
            statusElement.textContent = '';
        }, 5000);
    }

    renderError(message) {
        this.container.innerHTML = `
            <div class="container mt-4">
                <div class="row justify-content-center">
                    <div class="col-md-8">
                        <div class="alert alert-danger">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            ${message}
                        </div>
                        <button class="btn btn-primary" onclick="location.reload()">
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}
