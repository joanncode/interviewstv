import API from './api.js';

class AuthService {
    constructor() {
        this.token = localStorage.getItem('auth_token');
        this.user = null;
        this.init();
    }

    init() {
        if (this.token) {
            this.loadUser();
        }
    }

    async loadUser() {
        try {
            const response = await API.getCurrentUser();
            if (response.success) {
                this.user = response.data;
                return this.user;
            } else {
                this.clearToken();
            }
        } catch (error) {
            console.error('Failed to load user:', error);
            this.clearToken();
        }
        return null;
    }

    async register(userData) {
        try {
            const response = await API.register(userData);
            
            if (response.success) {
                // Note: User needs to verify email before being fully authenticated
                this.dispatchAuthEvent(false, null);
                return response;
            }
            
            return response;
            
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    async login(email, password) {
        try {
            const response = await API.login({ email, password });
            
            if (response.success) {
                this.token = response.data.token;
                this.user = response.data.user;
                
                localStorage.setItem('auth_token', this.token);
                
                // Dispatch auth state change event
                this.dispatchAuthEvent(true, this.user);
                
                return response;
            }
            
            return response;
            
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async logout() {
        try {
            // Call logout endpoint (for token blacklisting if implemented)
            await API.logout();
        } catch (error) {
            console.error('Logout API error:', error);
            // Continue with local logout even if API fails
        } finally {
            this.clearToken();
        }
    }

    async verifyEmail(token) {
        try {
            const response = await API.verifyEmail(token);
            return response;
        } catch (error) {
            console.error('Email verification error:', error);
            throw error;
        }
    }

    async resendVerification(email) {
        try {
            const response = await API.resendVerification(email);
            return response;
        } catch (error) {
            console.error('Resend verification error:', error);
            throw error;
        }
    }

    async forgotPassword(email) {
        try {
            const response = await API.forgotPassword(email);
            return response;
        } catch (error) {
            console.error('Forgot password error:', error);
            throw error;
        }
    }

    async resetPassword(token, password) {
        try {
            const response = await API.resetPassword(token, password);
            return response;
        } catch (error) {
            console.error('Reset password error:', error);
            throw error;
        }
    }

    async refreshToken() {
        try {
            const response = await API.refreshToken();
            
            if (response.success) {
                this.token = response.data.token;
                localStorage.setItem('auth_token', this.token);
                return response;
            }
            
            return response;
            
        } catch (error) {
            console.error('Token refresh error:', error);
            this.clearToken();
            throw error;
        }
    }

    clearToken() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('auth_token');
        
        // Dispatch auth state change event
        this.dispatchAuthEvent(false, null);
    }

    isAuthenticated() {
        return !!this.token && !!this.user;
    }

    getToken() {
        return this.token;
    }

    getCurrentUser() {
        return this.user;
    }

    hasRole(role) {
        if (!this.user) return false;
        
        const roleHierarchy = {
            'user': 1,
            'interviewee': 2,
            'interviewer': 3,
            'promoter': 4,
            'admin': 5
        };
        
        const userLevel = roleHierarchy[this.user.role] || 0;
        const requiredLevel = roleHierarchy[role] || 0;
        
        return userLevel >= requiredLevel;
    }

    canCreateInterview() {
        return this.hasRole('interviewer');
    }

    canCreateEvent() {
        return this.hasRole('promoter');
    }

    canCreateBusiness() {
        return this.hasRole('user'); // Any authenticated user can create business
    }

    canModerate() {
        return this.hasRole('admin');
    }

    // Update user profile
    async updateProfile(userData) {
        try {
            const response = await API.updateUser(this.user.username, userData);
            
            if (response.success) {
                this.user = { ...this.user, ...response.data };
                
                // Dispatch auth state change event
                this.dispatchAuthEvent(true, this.user);
            }
            
            return response;
            
        } catch (error) {
            console.error('Profile update error:', error);
            throw error;
        }
    }

    // Upload avatar
    async uploadAvatar(file) {
        try {
            const formData = new FormData();
            formData.append('avatar', file);
            
            const response = await API.upload('/api/upload/avatar', formData);
            
            if (response.success) {
                this.user.avatar_url = response.data.url;
                
                // Dispatch auth state change event
                this.dispatchAuthEvent(true, this.user);
            }
            
            return response;
            
        } catch (error) {
            console.error('Avatar upload error:', error);
            throw error;
        }
    }

    // Remove avatar
    async removeAvatar() {
        try {
            const response = await API.delete('/api/upload/avatar');

            if (response.success) {
                this.user.avatar_url = null;

                // Dispatch auth state change event
                window.dispatchEvent(new CustomEvent('authStateChange', {
                    detail: { user: this.user }
                }));
            }

            return response;

        } catch (error) {
            console.error('Avatar removal error:', error);
            throw error;
        }
    }

    // Upload hero banner
    async uploadHeroBanner(file) {
        try {
            const formData = new FormData();
            formData.append('hero_banner', file);

            const response = await API.upload('/api/upload/hero-banner', formData);

            if (response.success) {
                this.user.hero_banner_url = response.data.url;

                // Dispatch auth state change event
                window.dispatchEvent(new CustomEvent('authStateChange', {
                    detail: { user: this.user }
                }));
            }

            return response;

        } catch (error) {
            console.error('Hero banner upload error:', error);
            throw error;
        }
    }

    // Upload business logo
    async uploadBusinessLogo(file) {
        try {
            const formData = new FormData();
            formData.append('business_logo', file);

            const response = await API.upload('/api/upload/business-logo', formData);

            return response;

        } catch (error) {
            console.error('Business logo upload error:', error);
            throw error;
        }
    }

    // Change password
    async changePassword(passwordData) {
        try {
            const response = await API.post('/api/auth/change-password', passwordData);
            return response;

        } catch (error) {
            console.error('Change password error:', error);
            throw error;
        }
    }

    // Delete account
    async deleteAccount(deleteData) {
        try {
            const response = await API.post('/api/users/delete-account', deleteData);

            if (response.success) {
                // Clear all user data and logout
                this.logout();
            }

            return response;

        } catch (error) {
            console.error('Delete account error:', error);
            throw error;
        }
    }

    // Follow user
    async followUser(username) {
        try {
            const response = await API.post(`/api/users/${username}/follow`);
            return response;

        } catch (error) {
            console.error('Follow user error:', error);
            throw error;
        }
    }

    // Unfollow user
    async unfollowUser(username) {
        try {
            const response = await API.delete(`/api/users/${username}/follow`);
            return response;

        } catch (error) {
            console.error('Unfollow user error:', error);
            throw error;
        }
    }

    // Check if current user is following another user
    async isFollowing(username) {
        if (!this.isAuthenticated()) return false;
        
        try {
            const response = await API.getUserFollowers(username);
            if (response.success) {
                return response.data.followers.some(follower => 
                    follower.username === this.user.username
                );
            }
        } catch (error) {
            console.error('Error checking follow status:', error);
        }
        
        return false;
    }

    // Follow a user
    async followUser(username) {
        try {
            const response = await API.followUser(username);
            return response;
        } catch (error) {
            console.error('Follow user error:', error);
            throw error;
        }
    }

    // Unfollow a user
    async unfollowUser(username) {
        try {
            const response = await API.unfollowUser(username);
            return response;
        } catch (error) {
            console.error('Unfollow user error:', error);
            throw error;
        }
    }

    // Helper method to dispatch authentication events
    dispatchAuthEvent(authenticated, user) {
        document.dispatchEvent(new CustomEvent('authStateChanged', {
            detail: { authenticated, user }
        }));
    }

    // Auto-refresh token before expiration
    startTokenRefresh() {
        if (!this.token) return;
        
        // Refresh token 5 minutes before expiration
        const refreshInterval = (55 * 60 * 1000); // 55 minutes in milliseconds
        
        setInterval(async () => {
            if (this.isAuthenticated()) {
                try {
                    await this.refreshToken();
                } catch (error) {
                    console.error('Auto token refresh failed:', error);
                    this.clearToken();
                }
            }
        }, refreshInterval);
    }
}

export default new AuthService();
