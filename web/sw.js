/**
 * Service Worker for Push Notifications
 * Handles push notification events and background sync
 */

const CACHE_NAME = 'interviews-tv-v1';
const API_BASE_URL = '/api';

// Install event
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                '/',
                '/images/notification-icon.png',
                '/images/notification-badge.png',
                '/images/logo-icon.png'
            ]);
        })
    );
    
    // Skip waiting to activate immediately
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    
    // Claim all clients immediately
    return self.clients.claim();
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
    console.log('Push notification received:', event);
    
    let notificationData = {
        title: 'Interviews.tv',
        body: 'You have a new notification',
        icon: '/images/notification-icon.png',
        badge: '/images/notification-badge.png',
        tag: 'default',
        data: {}
    };
    
    // Parse push data if available
    if (event.data) {
        try {
            const pushData = event.data.json();
            notificationData = {
                ...notificationData,
                ...pushData
            };
        } catch (error) {
            console.error('Failed to parse push data:', error);
            notificationData.body = event.data.text() || notificationData.body;
        }
    }
    
    // Show notification
    event.waitUntil(
        self.registration.showNotification(notificationData.title, {
            body: notificationData.body,
            icon: notificationData.icon,
            badge: notificationData.badge,
            tag: notificationData.tag,
            data: notificationData.data,
            requireInteraction: notificationData.requireInteraction || false,
            silent: notificationData.silent || false,
            vibrate: notificationData.vibrate || [200, 100, 200],
            actions: notificationData.actions || [],
            image: notificationData.image,
            timestamp: Date.now()
        })
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);
    
    const notification = event.notification;
    const action = event.action;
    const data = notification.data || {};
    
    // Close the notification
    notification.close();
    
    // Handle different actions
    let targetUrl = '/';
    
    if (action) {
        // Handle action buttons
        switch (action) {
            case 'view':
                targetUrl = data.url || '/';
                break;
            case 'reply':
                targetUrl = data.replyUrl || '/';
                break;
            case 'dismiss':
                return; // Just close, don't open anything
        }
    } else {
        // Handle main notification click
        targetUrl = data.url || '/';
    }
    
    // Open or focus the app
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if app is already open
            for (const client of clientList) {
                if (client.url.includes(self.location.origin)) {
                    // Focus existing window and navigate
                    client.focus();
                    client.postMessage({
                        type: 'NOTIFICATION_CLICK',
                        notification: {
                            data: data,
                            action: action
                        }
                    });
                    
                    if (targetUrl !== '/') {
                        client.navigate(targetUrl);
                    }
                    
                    return;
                }
            }
            
            // Open new window if app is not open
            return clients.openWindow(targetUrl);
        })
    );
    
    // Track notification click
    trackNotificationEvent('click', notification, action);
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
    console.log('Notification closed:', event);
    
    const notification = event.notification;
    
    // Track notification close
    trackNotificationEvent('close', notification);
});

// Background sync event
self.addEventListener('sync', (event) => {
    console.log('Background sync triggered:', event.tag);
    
    if (event.tag === 'notification-sync') {
        event.waitUntil(syncNotifications());
    }
});

// Message event - handle messages from main thread
self.addEventListener('message', (event) => {
    console.log('Service Worker received message:', event.data);
    
    const { type, data } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'GET_VERSION':
            event.ports[0].postMessage({ version: CACHE_NAME });
            break;
            
        case 'CLEAR_NOTIFICATIONS':
            clearAllNotifications();
            break;
            
        case 'SHOW_NOTIFICATION':
            showLocalNotification(data);
            break;
    }
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
    // Only handle GET requests for now
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Skip non-HTTP requests
    if (!event.request.url.startsWith('http')) {
        return;
    }
    
    // Handle API requests differently
    if (event.request.url.includes(API_BASE_URL)) {
        // Network first for API requests
        event.respondWith(
            fetch(event.request).catch(() => {
                // Could implement offline fallback here
                return new Response(
                    JSON.stringify({ error: 'Offline' }),
                    { headers: { 'Content-Type': 'application/json' } }
                );
            })
        );
        return;
    }
    
    // Cache first for static assets
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

/**
 * Helper Functions
 */

// Show local notification
function showLocalNotification(data) {
    const options = {
        body: data.body || 'You have a new notification',
        icon: data.icon || '/images/notification-icon.png',
        badge: data.badge || '/images/notification-badge.png',
        tag: data.tag || 'local-notification',
        data: data.data || {},
        requireInteraction: data.requireInteraction || false,
        silent: data.silent || false,
        vibrate: data.vibrate || [200, 100, 200],
        actions: data.actions || []
    };
    
    return self.registration.showNotification(data.title || 'Interviews.tv', options);
}

// Clear all notifications
function clearAllNotifications() {
    return self.registration.getNotifications().then((notifications) => {
        notifications.forEach((notification) => {
            notification.close();
        });
    });
}

// Sync notifications with server
async function syncNotifications() {
    try {
        // This would sync any pending notification actions with the server
        console.log('Syncing notifications with server...');
        
        // Example: Mark notifications as delivered
        const response = await fetch(`${API_BASE_URL}/notifications/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                timestamp: Date.now()
            })
        });
        
        if (response.ok) {
            console.log('Notifications synced successfully');
        } else {
            console.error('Failed to sync notifications');
        }
        
    } catch (error) {
        console.error('Error syncing notifications:', error);
    }
}

// Track notification events
function trackNotificationEvent(eventType, notification, action = null) {
    try {
        const data = {
            event_type: eventType,
            notification_tag: notification.tag,
            action: action,
            timestamp: Date.now(),
            data: notification.data
        };
        
        // Send tracking data to server
        fetch(`${API_BASE_URL}/notifications/track`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        }).catch((error) => {
            console.error('Failed to track notification event:', error);
        });
        
    } catch (error) {
        console.error('Error tracking notification event:', error);
    }
}

// Handle push subscription changes
self.addEventListener('pushsubscriptionchange', (event) => {
    console.log('Push subscription changed:', event);
    
    event.waitUntil(
        // Re-subscribe with new subscription
        self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: event.oldSubscription.options.applicationServerKey
        }).then((newSubscription) => {
            // Send new subscription to server
            return fetch(`${API_BASE_URL}/push-subscriptions/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    oldSubscription: event.oldSubscription,
                    newSubscription: newSubscription
                })
            });
        }).catch((error) => {
            console.error('Failed to handle subscription change:', error);
        })
    );
});

// Periodic background sync (if supported)
if ('periodicSync' in self.registration) {
    self.addEventListener('periodicsync', (event) => {
        if (event.tag === 'notification-check') {
            event.waitUntil(checkForNewNotifications());
        }
    });
}

// Check for new notifications
async function checkForNewNotifications() {
    try {
        const response = await fetch(`${API_BASE_URL}/notifications/check`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.hasNewNotifications) {
                // Show notification about new activity
                showLocalNotification({
                    title: 'New Activity',
                    body: `You have ${data.count} new notifications`,
                    tag: 'activity-check',
                    data: {
                        url: '/notifications'
                    }
                });
            }
        }
        
    } catch (error) {
        console.error('Error checking for new notifications:', error);
    }
}

console.log('Service Worker loaded successfully');
