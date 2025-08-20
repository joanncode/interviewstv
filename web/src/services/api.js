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

    async getInterviewMedia(id) {
        return this.get(`/api/interviews/${id}/media`);
    }

    async addInterviewMedia(id, formData) {
        return this.upload(`/api/interviews/${id}/media`, formData);
    }

    async likeInterview(id) {
        return this.post(`/api/interviews/${id}/like`);
    }

    async unlikeInterview(id) {
        return this.delete(`/api/interviews/${id}/like`);
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

    // Health check
    async healthCheck() {
        return this.get('/api/health');
    }
}

export default new APIService();
