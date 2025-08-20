import API from './api.js';
import Auth from './auth.js';

class UserRecommendationService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    async getRecommendations(options = {}) {
        const currentUser = Auth.getCurrentUser();
        if (!currentUser) return [];

        const cacheKey = this.getCacheKey('recommendations', options);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const params = {
                limit: options.limit || 10,
                type: options.type || 'mixed', // 'similar', 'popular', 'new', 'mixed'
                exclude_following: options.excludeFollowing !== false,
                ...options
            };

            const response = await API.get('/api/users/discover', params);
            
            if (response.success) {
                const recommendations = this.enhanceRecommendations(response.data.users);
                this.setCache(cacheKey, recommendations);
                return recommendations;
            }

            return [];
        } catch (error) {
            console.error('Failed to get user recommendations:', error);
            return [];
        }
    }

    async getSimilarUsers(username, limit = 5) {
        const cacheKey = this.getCacheKey('similar', { username, limit });
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await API.get(`/api/users/${username}/similar`, { limit });
            
            if (response.success) {
                const similar = this.enhanceRecommendations(response.data.users);
                this.setCache(cacheKey, similar);
                return similar;
            }

            return [];
        } catch (error) {
            console.error('Failed to get similar users:', error);
            return [];
        }
    }

    async getPopularUsers(options = {}) {
        const cacheKey = this.getCacheKey('popular', options);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const params = {
                limit: options.limit || 10,
                timeframe: options.timeframe || 'week', // 'day', 'week', 'month', 'all'
                role: options.role, // Filter by user role
                ...options
            };

            const response = await API.get('/api/users/popular', params);
            
            if (response.success) {
                const popular = this.enhanceRecommendations(response.data.users);
                this.setCache(cacheKey, popular);
                return popular;
            }

            return [];
        } catch (error) {
            console.error('Failed to get popular users:', error);
            return [];
        }
    }

    async getNewUsers(limit = 5) {
        const cacheKey = this.getCacheKey('new', { limit });
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await API.get('/api/users/new', { limit });
            
            if (response.success) {
                const newUsers = this.enhanceRecommendations(response.data.users);
                this.setCache(cacheKey, newUsers);
                return newUsers;
            }

            return [];
        } catch (error) {
            console.error('Failed to get new users:', error);
            return [];
        }
    }

    async getMutualFollows(username, limit = 10) {
        const cacheKey = this.getCacheKey('mutual', { username, limit });
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await API.get(`/api/users/${username}/mutual-follows`, { limit });
            
            if (response.success) {
                const mutual = this.enhanceRecommendations(response.data.users);
                this.setCache(cacheKey, mutual);
                return mutual;
            }

            return [];
        } catch (error) {
            console.error('Failed to get mutual follows:', error);
            return [];
        }
    }

    async getRecommendationsByInterests(interests, limit = 10) {
        const cacheKey = this.getCacheKey('interests', { interests: interests.join(','), limit });
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await API.get('/api/users/by-interests', { 
                interests: interests.join(','),
                limit 
            });
            
            if (response.success) {
                const byInterests = this.enhanceRecommendations(response.data.users);
                this.setCache(cacheKey, byInterests);
                return byInterests;
            }

            return [];
        } catch (error) {
            console.error('Failed to get users by interests:', error);
            return [];
        }
    }

    enhanceRecommendations(users) {
        return users.map(user => ({
            ...user,
            recommendation_score: this.calculateRecommendationScore(user),
            recommendation_reasons: this.getRecommendationReasons(user)
        }));
    }

    calculateRecommendationScore(user) {
        let score = 0;

        // Base score from follower count (normalized)
        score += Math.min(user.follower_count / 1000, 10);

        // Score from interview count
        score += Math.min(user.interview_count / 10, 5);

        // Score from recent activity
        if (user.last_activity) {
            const daysSinceActivity = (Date.now() - new Date(user.last_activity)) / (1000 * 60 * 60 * 24);
            score += Math.max(5 - daysSinceActivity, 0);
        }

        // Score from mutual connections
        score += (user.mutual_follows_count || 0) * 2;

        // Score from verification status
        if (user.verified) score += 3;

        // Score from role
        const roleScores = {
            'interviewer': 3,
            'interviewee': 2,
            'promoter': 2,
            'user': 1
        };
        score += roleScores[user.role] || 1;

        return Math.round(score * 10) / 10;
    }

    getRecommendationReasons(user) {
        const reasons = [];

        if (user.mutual_follows_count > 0) {
            reasons.push(`${user.mutual_follows_count} mutual connection${user.mutual_follows_count > 1 ? 's' : ''}`);
        }

        if (user.follower_count > 1000) {
            reasons.push('Popular creator');
        }

        if (user.interview_count > 10) {
            reasons.push('Active interviewer');
        }

        if (user.verified) {
            reasons.push('Verified account');
        }

        if (user.recent_activity) {
            reasons.push('Recently active');
        }

        if (user.similar_interests) {
            reasons.push('Similar interests');
        }

        return reasons;
    }

    getCacheKey(type, options = {}) {
        const currentUser = Auth.getCurrentUser();
        const userId = currentUser ? currentUser.id : 'anonymous';
        const optionsStr = JSON.stringify(options);
        return `${type}_${userId}_${optionsStr}`;
    }

    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });

        // Clean up old cache entries
        if (this.cache.size > 100) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
    }

    clearCache() {
        this.cache.clear();
    }

    // Track user interactions for better recommendations
    async trackInteraction(type, targetUsername) {
        try {
            await API.post('/api/users/track-interaction', {
                type, // 'view', 'follow', 'like', 'comment'
                target_username: targetUsername
            });
        } catch (error) {
            console.error('Failed to track interaction:', error);
        }
    }

    // Get personalized recommendations based on user behavior
    async getPersonalizedRecommendations(limit = 10) {
        const currentUser = Auth.getCurrentUser();
        if (!currentUser) return [];

        try {
            // Get multiple recommendation types
            const [similar, popular, newUsers, byInterests] = await Promise.all([
                this.getRecommendations({ type: 'similar', limit: Math.ceil(limit * 0.4) }),
                this.getPopularUsers({ limit: Math.ceil(limit * 0.3) }),
                this.getNewUsers(Math.ceil(limit * 0.2)),
                currentUser.interests ? this.getRecommendationsByInterests(currentUser.interests, Math.ceil(limit * 0.1)) : []
            ]);

            // Combine and deduplicate
            const combined = [...similar, ...popular, ...newUsers, ...byInterests];
            const unique = this.deduplicateUsers(combined);

            // Sort by recommendation score
            unique.sort((a, b) => b.recommendation_score - a.recommendation_score);

            return unique.slice(0, limit);
        } catch (error) {
            console.error('Failed to get personalized recommendations:', error);
            return [];
        }
    }

    deduplicateUsers(users) {
        const seen = new Set();
        return users.filter(user => {
            if (seen.has(user.id)) {
                return false;
            }
            seen.add(user.id);
            return true;
        });
    }
}

// Export singleton instance
export default new UserRecommendationService();
