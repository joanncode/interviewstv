class APIService {
    constructor() {
        this.baseURL = 'http://localhost:8000';
        this.timeout = 10000; // 10 seconds
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add auth token if available
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            
            const response = await fetch(url, {
                ...config,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            // Handle different response types
            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;

        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            
            console.error('API request failed:', error);
            throw error;
        }
    }

    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        return this.request(url, {
            method: 'GET'
        });
    }

    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }

    async upload(endpoint, formData) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            method: 'POST',
            body: formData,
            headers: {}
        };

        // Add auth token if available
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Don't set Content-Type for FormData, let browser set it with boundary

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;

        } catch (error) {
            console.error('Upload failed:', error);
            throw error;
        }
    }

    // Authentication endpoints
    async register(userData) {
        return this.post('/api/auth/register', userData);
    }

    async login(credentials) {
        return this.post('/api/auth/login', credentials);
    }

    async logout() {
        return this.post('/api/auth/logout');
    }

    async getCurrentUser() {
        return this.get('/api/auth/me');
    }

    async verifyEmail(token) {
        return this.post('/api/auth/verify-email', { token });
    }

    async resendVerification(email) {
        return this.post('/api/auth/resend-verification', { email });
    }

    async forgotPassword(email) {
        return this.post('/api/auth/forgot-password', { email });
    }

    async resetPassword(token, password) {
        return this.post('/api/auth/reset-password', { token, password });
    }

    async refreshToken() {
        return this.post('/api/auth/refresh');
    }

    // User endpoints
    async getUsers(params = {}) {
        return this.get('/api/users', params);
    }

    async getUser(username) {
        return this.get(`/api/users/${username}`);
    }

    async updateUser(username, data) {
        return this.put(`/api/users/${username}`, data);
    }

    async followUser(username) {
        return this.post(`/api/users/${username}/follow`);
    }

    async unfollowUser(username) {
        return this.delete(`/api/users/${username}/follow`);
    }

    async getUserFollowers(username, params = {}) {
        return this.get(`/api/users/${username}/followers`, params);
    }

    async getUserFollowing(username, params = {}) {
        return this.get(`/api/users/${username}/following`, params);
    }

    async getUserInterviews(username, params = {}) {
        return this.get(`/api/users/${username}/interviews`, params);
    }

    async getUserStats(username) {
        return this.get(`/api/users/${username}/stats`);
    }

    async getUserPrivacySettings(username) {
        return this.get(`/api/users/${username}/privacy`);
    }

    async updateUserPrivacySettings(username, settings) {
        return this.put(`/api/users/${username}/privacy`, settings);
    }

    async searchUsers(params = {}) {
        return this.get('/api/users/search', params);
    }

    async discoverUsers(params = {}) {
        return this.get('/api/users/discover', params);
    }

    // Notification endpoints
    async getNotifications(params = {}) {
        return this.get('/api/notifications', params);
    }

    async getUnreadNotificationCount() {
        return this.get('/api/notifications/unread-count');
    }

    async markNotificationAsRead(notificationId) {
        return this.put(`/api/notifications/${notificationId}/read`);
    }

    async markAllNotificationsAsRead() {
        return this.put('/api/notifications/mark-all-read');
    }

    async deleteNotification(notificationId) {
        return this.delete(`/api/notifications/${notificationId}`);
    }

    async getNotificationPreferences() {
        return this.get('/api/notifications/preferences');
    }

    async updateNotificationPreferences(preferences) {
        return this.put('/api/notifications/preferences', preferences);
    }

    // Feed endpoints
    async getPersonalFeed(params = {}) {
        return this.get('/api/feed/personal', params);
    }

    async getPublicFeed(params = {}) {
        return this.get('/api/feed/public', params);
    }

    async getUserFeed(username, params = {}) {
        return this.get(`/api/feed/user/${username}`, params);
    }

    async getFeedPreferences() {
        return this.get('/api/feed/preferences');
    }

    async updateFeedPreferences(preferences) {
        return this.put('/api/feed/preferences', preferences);
    }

    // Profile sharing endpoints
    async trackProfileShare(username, platform) {
        return this.post(`/api/users/${username}/share`, { platform });
    }

    async getProfileShareStats(username) {
        return this.get(`/api/users/${username}/share-stats`);
    }

    // Interview endpoints
    async getInterviews(params = {}) {
        return this.get('/api/interviews', params);
    }

    async getInterview(id) {
        return this.get(`/api/interviews/${id}`);
    }

    async createInterview(data) {
        return this.post('/api/interviews', data);
    }

    async updateInterview(id, data) {
        return this.put(`/api/interviews/${id}`, data);
    }

    async deleteInterview(id) {
        return this.delete(`/api/interviews/${id}`);
    }

    async getInterview(id) {
        return this.get(`/api/interviews/${id}`);
    }

    async getInterviews(params = {}) {
        return this.get('/api/interviews', params);
    }

    // Like/Unlike endpoints
    async likeInterview(id) {
        return this.post(`/api/interviews/${id}/like`);
    }

    async unlikeInterview(id) {
        return this.delete(`/api/interviews/${id}/like`);
    }

    async likeMedia(id) {
        return this.post(`/api/media/${id}/like`);
    }

    async unlikeMedia(id) {
        return this.delete(`/api/media/${id}/like`);
    }

    async likeComment(id) {
        return this.post(`/api/comments/${id}/like`);
    }

    async unlikeComment(id) {
        return this.delete(`/api/comments/${id}/like`);
    }

    // Media upload endpoints
    async uploadMedia(formData) {
        return this.post('/api/upload/media', formData, {
            'Content-Type': 'multipart/form-data'
        });
    }

    async uploadThumbnail(formData) {
        return this.post('/api/upload/thumbnail', formData, {
            'Content-Type': 'multipart/form-data'
        });
    }

    async updateInterview(id, data) {
        return this.put(`/api/interviews/${id}`, data);
    }

    async deleteInterview(id) {
        return this.delete(`/api/interviews/${id}`);
    }

    async getInterviewMedia(id) {
        return this.get(`/api/interviews/${id}/media`);
    }

    async addInterviewMedia(id, formData) {
        return this.upload(`/api/interviews/${id}/media`, formData);
    }

    // Gallery endpoints
    async getGalleries(params = {}) {
        return this.get('/api/galleries', params);
    }

    async getGallery(id) {
        return this.get(`/api/galleries/${id}`);
    }

    async createGallery(data) {
        return this.post('/api/galleries', data);
    }

    async updateGallery(id, data) {
        return this.put(`/api/galleries/${id}`, data);
    }

    async deleteGallery(id) {
        return this.delete(`/api/galleries/${id}`);
    }

    async getGallery(id) {
        return this.get(`/api/galleries/${id}`);
    }

    async getGalleries(params = {}) {
        return this.get('/api/galleries', params);
    }

    async updateGallery(id, data) {
        return this.put(`/api/galleries/${id}`, data);
    }

    async deleteGallery(id) {
        return this.delete(`/api/galleries/${id}`);
    }

    async getGalleryMedia(id) {
        return this.get(`/api/galleries/${id}/media`);
    }

    async addGalleryMedia(id, formData) {
        return this.upload(`/api/galleries/${id}/media`, formData);
    }

    async updateGalleryMediaOrder(id, mediaOrder) {
        return this.put(`/api/galleries/${id}/media/order`, { media_order: mediaOrder });
    }

    // Comment endpoints
    async getComments(entityType, entityId, params = {}) {
        return this.get(`/api/comments/${entityType}/${entityId}`, params);
    }

    async createComment(data) {
        return this.post('/api/comments', data);
    }

    async updateComment(id, data) {
        return this.put(`/api/comments/${id}`, data);
    }

    async deleteComment(id) {
        return this.delete(`/api/comments/${id}`);
    }

    async likeComment(id) {
        return this.post(`/api/comments/${id}/like`);
    }

    async unlikeComment(id) {
        return this.delete(`/api/comments/${id}/like`);
    }

    async reportComment(id, data) {
        return this.post(`/api/comments/${id}/report`, data);
    }

    async getCommentReplies(id, params = {}) {
        return this.get(`/api/comments/${id}/replies`, params);
    }

    // Search endpoints
    async search(params = {}) {
        return this.get('/api/search', params);
    }

    async getSearchSuggestions(query) {
        return this.get('/api/search/suggestions', { q: query });
    }

    async getPopularContent(type = null, limit = 10, timeframe = '7 days') {
        return this.get('/api/search/popular', { type, limit, timeframe });
    }

    async getTrendingContent(type = null, limit = 10) {
        return this.get('/api/search/trending', { type, limit });
    }

    async getRecommendations(limit = 10) {
        return this.get('/api/search/recommendations', { limit });
    }

    async getSearchCategories(type = null) {
        return this.get('/api/search/categories', { type });
    }

    async getSearchTags(query = '', type = null, limit = 10) {
        return this.get('/api/search/tags', { q: query, type, limit });
    }

    async indexContent(type, id, data) {
        return this.post('/api/search/index', { type, id, ...data });
    }

    async removeFromSearchIndex(type, id) {
        return this.delete(`/api/search/index/${type}/${id}`);
    }

    // Feed endpoints
    async getPersonalFeed(params = {}) {
        return this.get('/api/feed/personal', params);
    }

    async getPublicFeed(params = {}) {
        return this.get('/api/feed/public', params);
    }

    // Business endpoints
    async getBusinesses(params = {}) {
        return this.get('/api/businesses', params);
    }

    async getBusiness(id) {
        return this.get(`/api/businesses/${id}`);
    }

    async createBusiness(data) {
        return this.post('/api/businesses', data);
    }

    async updateBusiness(id, data) {
        return this.put(`/api/businesses/${id}`, data);
    }

    async deleteBusiness(id) {
        return this.delete(`/api/businesses/${id}`);
    }

    async searchBusinesses(params = {}) {
        return this.get('/api/businesses/search', params);
    }

    async getBusinessInterviews(id, params = {}) {
        return this.get(`/api/businesses/${id}/interviews`, params);
    }

    async linkBusinessInterview(businessId, interviewId) {
        return this.post(`/api/businesses/${businessId}/interviews`, { interview_id: interviewId });
    }

    async unlinkBusinessInterview(businessId, interviewId) {
        return this.delete(`/api/businesses/${businessId}/interviews`, { interview_id: interviewId });
    }

    async getBusinessIndustries() {
        return this.get('/api/businesses/industries');
    }

    async getPopularBusinesses(params = {}) {
        return this.get('/api/businesses/popular', params);
    }

    // Event endpoints
    async getEvents(params = {}) {
        return this.get('/api/events', params);
    }

    async getEvent(id) {
        return this.get(`/api/events/${id}`);
    }

    async createEvent(data) {
        return this.post('/api/events', data);
    }

    async updateEvent(id, data) {
        return this.put(`/api/events/${id}`, data);
    }

    async deleteEvent(id) {
        return this.delete(`/api/events/${id}`);
    }

    async searchEvents(params = {}) {
        return this.get('/api/events/search', params);
    }

    async getEventInterviews(id, params = {}) {
        return this.get(`/api/events/${id}/interviews`, params);
    }

    async getUpcomingEvents(params = {}) {
        return this.get('/api/events/upcoming', params);
    }

    async getEventTypes() {
        return this.get('/api/events/types');
    }

    async rsvpToEvent(eventId) {
        return this.post(`/api/events/${eventId}/rsvp`);
    }

    async cancelRsvp(eventId) {
        return this.delete(`/api/events/${eventId}/rsvp`);
    }

    async getEventAttendance(eventId) {
        return this.get(`/api/events/${eventId}/attendance`);
    }

    // Health check
    async healthCheck() {
        return this.get('/api/health');
    }
}

export default new APIService();
