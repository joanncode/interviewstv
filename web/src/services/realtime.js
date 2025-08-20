/**
 * Real-Time Interactions Service
 * Handles live updates, instant feedback, and real-time notifications
 */

import API from './api.js';
import Auth from './auth.js';

export default class RealtimeService {
    constructor() {
        this.eventListeners = new Map();
        this.pendingActions = new Map();
        this.retryTimers = new Map();
        this.optimisticUpdates = new Map();
        this.connectionState = 'disconnected';
        this.heartbeatInterval = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    /**
     * Initialize real-time service
     */
    init() {
        this.setupEventListeners();
        this.startHeartbeat();
        this.connectionState = 'connected';
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseHeartbeat();
            } else {
                this.resumeHeartbeat();
                this.syncPendingActions();
            }
        });
        
        // Handle online/offline events
        window.addEventListener('online', () => {
            this.handleReconnect();
        });
        
        window.addEventListener('offline', () => {
            this.handleDisconnect();
        });
    }

    /**
     * Real-time Like/Unlike functionality
     */
    async toggleLike(entityType, entityId, currentState) {
        const actionId = `like_${entityType}_${entityId}`;
        const newState = !currentState.liked;
        const newCount = currentState.count + (newState ? 1 : -1);
        
        // Optimistic update
        this.applyOptimisticUpdate(actionId, {
            entityType,
            entityId,
            liked: newState,
            count: Math.max(0, newCount)
        });
        
        try {
            const response = await this.performLikeAction(entityType, entityId, newState);
            
            if (response.success) {
                // Update with server response
                this.confirmOptimisticUpdate(actionId, response.data);
                this.broadcastUpdate('like_updated', {
                    entityType,
                    entityId,
                    ...response.data
                });
                
                return response.data;
            } else {
                throw new Error(response.message);
            }
            
        } catch (error) {
            // Revert optimistic update
            this.revertOptimisticUpdate(actionId, currentState);
            
            // Queue for retry if offline
            if (!navigator.onLine) {
                this.queueAction(actionId, {
                    type: 'like',
                    entityType,
                    entityId,
                    newState,
                    originalState: currentState
                });
            }
            
            throw error;
        }
    }

    /**
     * Real-time Comment functionality
     */
    async addComment(entityType, entityId, commentData) {
        const actionId = `comment_${Date.now()}`;
        const tempComment = {
            id: `temp_${actionId}`,
            ...commentData,
            created_at: new Date().toISOString(),
            status: 'pending',
            user: Auth.getCurrentUser()
        };
        
        // Optimistic update
        this.applyOptimisticUpdate(actionId, tempComment);
        this.broadcastUpdate('comment_added', {
            entityType,
            entityId,
            comment: tempComment
        });
        
        try {
            const response = await API.post(`/api/comments`, {
                entity_type: entityType,
                entity_id: entityId,
                ...commentData
            });
            
            if (response.success) {
                // Replace temp comment with real one
                this.confirmOptimisticUpdate(actionId, response.data);
                this.broadcastUpdate('comment_confirmed', {
                    entityType,
                    entityId,
                    tempId: tempComment.id,
                    comment: response.data
                });
                
                return response.data;
            } else {
                throw new Error(response.message);
            }
            
        } catch (error) {
            // Mark comment as failed
            tempComment.status = 'failed';
            this.broadcastUpdate('comment_failed', {
                entityType,
                entityId,
                comment: tempComment,
                error: error.message
            });
            
            // Queue for retry
            this.queueAction(actionId, {
                type: 'comment',
                entityType,
                entityId,
                commentData,
                tempComment
            });
            
            throw error;
        }
    }

    /**
     * Real-time Follow/Unfollow functionality
     */
    async toggleFollow(userId, currentState) {
        const actionId = `follow_${userId}`;
        const newState = !currentState.following;
        
        // Optimistic update
        this.applyOptimisticUpdate(actionId, {
            userId,
            following: newState,
            followerCount: currentState.followerCount + (newState ? 1 : -1)
        });
        
        try {
            const endpoint = newState ? `/api/users/${userId}/follow` : `/api/users/${userId}/unfollow`;
            const response = await API.post(endpoint);
            
            if (response.success) {
                this.confirmOptimisticUpdate(actionId, response.data);
                this.broadcastUpdate('follow_updated', {
                    userId,
                    ...response.data
                });
                
                return response.data;
            } else {
                throw new Error(response.message);
            }
            
        } catch (error) {
            // Revert optimistic update
            this.revertOptimisticUpdate(actionId, currentState);
            
            // Queue for retry
            this.queueAction(actionId, {
                type: 'follow',
                userId,
                newState,
                originalState: currentState
            });
            
            throw error;
        }
    }

    /**
     * Real-time RSVP functionality
     */
    async toggleRSVP(eventId, currentState) {
        const actionId = `rsvp_${eventId}`;
        const newState = !currentState.attending;
        
        // Optimistic update
        this.applyOptimisticUpdate(actionId, {
            eventId,
            attending: newState,
            attendeeCount: currentState.attendeeCount + (newState ? 1 : -1)
        });
        
        try {
            const endpoint = newState ? `/api/events/${eventId}/rsvp` : `/api/events/${eventId}/rsvp`;
            const method = newState ? 'POST' : 'DELETE';
            const response = await API.request(method, endpoint);
            
            if (response.success) {
                this.confirmOptimisticUpdate(actionId, response.data);
                this.broadcastUpdate('rsvp_updated', {
                    eventId,
                    ...response.data
                });
                
                return response.data;
            } else {
                throw new Error(response.message);
            }
            
        } catch (error) {
            // Revert optimistic update
            this.revertOptimisticUpdate(actionId, currentState);
            
            // Queue for retry
            this.queueAction(actionId, {
                type: 'rsvp',
                eventId,
                newState,
                originalState: currentState
            });
            
            throw error;
        }
    }

    /**
     * Real-time Notifications
     */
    async fetchNotifications() {
        try {
            const response = await API.get('/api/notifications');
            
            if (response.success) {
                this.broadcastUpdate('notifications_updated', response.data);
                return response.data;
            }
            
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    }

    markNotificationRead(notificationId) {
        // Optimistic update
        this.broadcastUpdate('notification_read', { notificationId });
        
        // Send to server
        API.put(`/api/notifications/${notificationId}/read`).catch(error => {
            console.error('Failed to mark notification as read:', error);
        });
    }

    /**
     * Live Updates Polling
     */
    startLiveUpdates(entityType, entityId, interval = 30000) {
        const updateId = `${entityType}_${entityId}`;
        
        if (this.eventListeners.has(updateId)) {
            this.stopLiveUpdates(entityType, entityId);
        }
        
        const pollUpdates = async () => {
            try {
                const response = await API.get(`/api/${entityType}/${entityId}/updates`);
                
                if (response.success && response.data.hasUpdates) {
                    this.broadcastUpdate('live_update', {
                        entityType,
                        entityId,
                        updates: response.data.updates
                    });
                }
                
            } catch (error) {
                console.error('Live update polling error:', error);
            }
        };
        
        const intervalId = setInterval(pollUpdates, interval);
        this.eventListeners.set(updateId, intervalId);
        
        return updateId;
    }

    stopLiveUpdates(entityType, entityId) {
        const updateId = `${entityType}_${entityId}`;
        const intervalId = this.eventListeners.get(updateId);
        
        if (intervalId) {
            clearInterval(intervalId);
            this.eventListeners.delete(updateId);
        }
    }

    /**
     * Event Broadcasting
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        
        this.eventListeners.get(event).add(callback);
        
        return () => {
            const listeners = this.eventListeners.get(event);
            if (listeners) {
                listeners.delete(callback);
                if (listeners.size === 0) {
                    this.eventListeners.delete(event);
                }
            }
        };
    }

    off(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.delete(callback);
        }
    }

    broadcastUpdate(event, data) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Event listener error:', error);
                }
            });
        }
    }

    /**
     * Optimistic Updates Management
     */
    applyOptimisticUpdate(actionId, data) {
        this.optimisticUpdates.set(actionId, {
            data,
            timestamp: Date.now()
        });
    }

    confirmOptimisticUpdate(actionId, serverData) {
        this.optimisticUpdates.delete(actionId);
        this.pendingActions.delete(actionId);
    }

    revertOptimisticUpdate(actionId, originalData) {
        this.optimisticUpdates.delete(actionId);
        this.broadcastUpdate('optimistic_revert', {
            actionId,
            originalData
        });
    }

    /**
     * Action Queue Management
     */
    queueAction(actionId, action) {
        this.pendingActions.set(actionId, {
            ...action,
            timestamp: Date.now(),
            retryCount: 0
        });
        
        // Schedule retry
        this.scheduleRetry(actionId);
    }

    scheduleRetry(actionId, delay = 5000) {
        if (this.retryTimers.has(actionId)) {
            clearTimeout(this.retryTimers.get(actionId));
        }
        
        const timer = setTimeout(() => {
            this.retryAction(actionId);
        }, delay);
        
        this.retryTimers.set(actionId, timer);
    }

    async retryAction(actionId) {
        const action = this.pendingActions.get(actionId);
        if (!action) return;
        
        action.retryCount++;
        
        try {
            let result;
            
            switch (action.type) {
                case 'like':
                    result = await this.performLikeAction(
                        action.entityType,
                        action.entityId,
                        action.newState
                    );
                    break;
                    
                case 'comment':
                    result = await API.post('/api/comments', {
                        entity_type: action.entityType,
                        entity_id: action.entityId,
                        ...action.commentData
                    });
                    break;
                    
                case 'follow':
                    const followEndpoint = action.newState ? 
                        `/api/users/${action.userId}/follow` : 
                        `/api/users/${action.userId}/unfollow`;
                    result = await API.post(followEndpoint);
                    break;
                    
                case 'rsvp':
                    const rsvpEndpoint = `/api/events/${action.eventId}/rsvp`;
                    const rsvpMethod = action.newState ? 'POST' : 'DELETE';
                    result = await API.request(rsvpMethod, rsvpEndpoint);
                    break;
            }
            
            if (result.success) {
                this.confirmOptimisticUpdate(actionId, result.data);
                this.broadcastUpdate(`${action.type}_retry_success`, {
                    actionId,
                    data: result.data
                });
            } else {
                throw new Error(result.message);
            }
            
        } catch (error) {
            if (action.retryCount < 3) {
                // Exponential backoff
                const delay = Math.min(5000 * Math.pow(2, action.retryCount), 30000);
                this.scheduleRetry(actionId, delay);
            } else {
                // Give up after 3 retries
                this.pendingActions.delete(actionId);
                this.broadcastUpdate(`${action.type}_retry_failed`, {
                    actionId,
                    error: error.message
                });
            }
        }
    }

    async syncPendingActions() {
        if (!navigator.onLine) return;
        
        const actions = Array.from(this.pendingActions.keys());
        
        for (const actionId of actions) {
            await this.retryAction(actionId);
        }
    }

    /**
     * Helper Methods
     */
    async performLikeAction(entityType, entityId, liked) {
        const endpoint = `/api/${entityType}/${entityId}/like`;
        return liked ? 
            await API.post(endpoint) : 
            await API.delete(endpoint);
    }

    setupEventListeners() {
        // Set up any global event listeners
    }

    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (navigator.onLine && !document.hidden) {
                this.fetchNotifications();
            }
        }, 60000); // Check every minute
    }

    pauseHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    resumeHeartbeat() {
        if (!this.heartbeatInterval) {
            this.startHeartbeat();
        }
    }

    handleReconnect() {
        this.connectionState = 'connected';
        this.reconnectAttempts = 0;
        this.syncPendingActions();
        this.broadcastUpdate('connection_restored', {});
    }

    handleDisconnect() {
        this.connectionState = 'disconnected';
        this.broadcastUpdate('connection_lost', {});
    }

    /**
     * Cleanup
     */
    destroy() {
        // Clear all intervals
        this.eventListeners.forEach((value, key) => {
            if (typeof value === 'number') {
                clearInterval(value);
            }
        });
        
        // Clear retry timers
        this.retryTimers.forEach(timer => clearTimeout(timer));
        
        // Clear heartbeat
        this.pauseHeartbeat();
        
        // Clear maps
        this.eventListeners.clear();
        this.pendingActions.clear();
        this.retryTimers.clear();
        this.optimisticUpdates.clear();
    }
}

// Create singleton instance
const realtimeService = new RealtimeService();
export { realtimeService };
