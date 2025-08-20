import API from './api.js';
import Auth from './auth.js';

class TrendingService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 10 * 60 * 1000; // 10 minutes for trending content
        this.trendingWeights = {
            views: 1.0,
            likes: 2.0,
            comments: 1.5,
            shares: 3.0,
            recency: 2.0,
            engagement_rate: 2.5
        };
    }

    async getTrendingContent(type = null, timeframe = '24h', limit = 20) {
        const cacheKey = this.getCacheKey('trending', { type, timeframe, limit });
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const params = {
                type,
                timeframe,
                limit,
                algorithm: 'trending_score'
            };

            const response = await API.getTrendingContent(type, limit);
            
            if (response.success) {
                const trending = this.enhanceTrendingContent(response.data.items, timeframe);
                this.setCache(cacheKey, trending);
                return trending;
            }

            return [];
        } catch (error) {
            console.error('Failed to get trending content:', error);
            return [];
        }
    }

    async getViralContent(type = null, limit = 10) {
        const cacheKey = this.getCacheKey('viral', { type, limit });
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await API.get('/api/content/viral', { type, limit });
            
            if (response.success) {
                const viral = this.enhanceViralContent(response.data.items);
                this.setCache(cacheKey, viral);
                return viral;
            }

            return [];
        } catch (error) {
            console.error('Failed to get viral content:', error);
            return [];
        }
    }

    async getEmergingContent(type = null, limit = 10) {
        const cacheKey = this.getCacheKey('emerging', { type, limit });
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await API.get('/api/content/emerging', { type, limit });
            
            if (response.success) {
                const emerging = this.enhanceEmergingContent(response.data.items);
                this.setCache(cacheKey, emerging);
                return emerging;
            }

            return [];
        } catch (error) {
            console.error('Failed to get emerging content:', error);
            return [];
        }
    }

    async getTrendingTopics(limit = 20) {
        const cacheKey = this.getCacheKey('trending_topics', { limit });
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await API.get('/api/trending/topics', { limit });
            
            if (response.success) {
                const topics = this.enhanceTrendingTopics(response.data.topics);
                this.setCache(cacheKey, topics);
                return topics;
            }

            return [];
        } catch (error) {
            console.error('Failed to get trending topics:', error);
            return [];
        }
    }

    async getTrendingHashtags(limit = 15) {
        const cacheKey = this.getCacheKey('trending_hashtags', { limit });
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await API.get('/api/trending/hashtags', { limit });
            
            if (response.success) {
                const hashtags = this.enhanceTrendingHashtags(response.data.hashtags);
                this.setCache(cacheKey, hashtags);
                return hashtags;
            }

            return [];
        } catch (error) {
            console.error('Failed to get trending hashtags:', error);
            return [];
        }
    }

    async getPersonalizedTrending(limit = 20) {
        const currentUser = Auth.getCurrentUser();
        if (!currentUser) {
            return this.getTrendingContent(null, '24h', limit);
        }

        const cacheKey = this.getCacheKey('personalized_trending', { userId: currentUser.id, limit });
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await API.get('/api/trending/personalized', { limit });
            
            if (response.success) {
                const personalized = this.enhancePersonalizedTrending(response.data.items);
                this.setCache(cacheKey, personalized);
                return personalized;
            }

            // Fallback to general trending
            return this.getTrendingContent(null, '24h', limit);
        } catch (error) {
            console.error('Failed to get personalized trending:', error);
            return this.getTrendingContent(null, '24h', limit);
        }
    }

    enhanceTrendingContent(items, timeframe) {
        return items.map(item => ({
            ...item,
            trending_score: this.calculateTrendingScore(item, timeframe),
            trending_reason: this.getTrendingReason(item),
            velocity: this.calculateVelocity(item, timeframe),
            engagement_rate: this.calculateEngagementRate(item),
            trend_direction: this.getTrendDirection(item),
            formatted_stats: this.formatTrendingStats(item)
        })).sort((a, b) => b.trending_score - a.trending_score);
    }

    enhanceViralContent(items) {
        return items.map(item => ({
            ...item,
            viral_score: this.calculateViralScore(item),
            viral_velocity: this.calculateViralVelocity(item),
            viral_reach: this.calculateViralReach(item),
            viral_reason: this.getViralReason(item)
        })).sort((a, b) => b.viral_score - a.viral_score);
    }

    enhanceEmergingContent(items) {
        return items.map(item => ({
            ...item,
            emerging_score: this.calculateEmergingScore(item),
            growth_rate: this.calculateGrowthRate(item),
            potential_score: this.calculatePotentialScore(item),
            emerging_reason: this.getEmergingReason(item)
        })).sort((a, b) => b.emerging_score - a.emerging_score);
    }

    enhanceTrendingTopics(topics) {
        return topics.map(topic => ({
            ...topic,
            momentum: this.calculateTopicMomentum(topic),
            related_content_count: topic.content_count || 0,
            growth_percentage: this.calculateTopicGrowth(topic),
            topic_strength: this.calculateTopicStrength(topic)
        })).sort((a, b) => b.momentum - a.momentum);
    }

    enhanceTrendingHashtags(hashtags) {
        return hashtags.map(hashtag => ({
            ...hashtag,
            usage_velocity: this.calculateHashtagVelocity(hashtag),
            reach_score: this.calculateHashtagReach(hashtag),
            engagement_score: this.calculateHashtagEngagement(hashtag),
            trend_strength: this.calculateHashtagTrendStrength(hashtag)
        })).sort((a, b) => b.trend_strength - a.trend_strength);
    }

    enhancePersonalizedTrending(items) {
        const currentUser = Auth.getCurrentUser();
        
        return items.map(item => ({
            ...item,
            personalization_score: this.calculatePersonalizationScore(item, currentUser),
            relevance_reason: this.getPersonalizationReason(item, currentUser),
            user_affinity: this.calculateUserAffinity(item, currentUser)
        })).sort((a, b) => b.personalization_score - a.personalization_score);
    }

    calculateTrendingScore(item, timeframe) {
        const weights = this.trendingWeights;
        let score = 0;

        // Base engagement metrics
        score += (item.view_count || 0) * weights.views;
        score += (item.like_count || 0) * weights.likes;
        score += (item.comment_count || 0) * weights.comments;
        score += (item.share_count || 0) * weights.shares;

        // Recency boost
        const hoursOld = this.getHoursOld(item.created_at);
        const recencyMultiplier = this.getRecencyMultiplier(hoursOld, timeframe);
        score *= recencyMultiplier;

        // Engagement rate boost
        const engagementRate = this.calculateEngagementRate(item);
        score += engagementRate * weights.engagement_rate * 100;

        // Velocity boost (rate of change)
        const velocity = this.calculateVelocity(item, timeframe);
        score += velocity * 50;

        return Math.round(score);
    }

    calculateViralScore(item) {
        const shareToViewRatio = (item.share_count || 0) / Math.max(item.view_count || 1, 1);
        const engagementRate = this.calculateEngagementRate(item);
        const velocity = this.calculateViralVelocity(item);
        
        return (shareToViewRatio * 1000) + (engagementRate * 500) + (velocity * 200);
    }

    calculateEmergingScore(item) {
        const growthRate = this.calculateGrowthRate(item);
        const recency = this.getRecencyScore(item.created_at);
        const potential = this.calculatePotentialScore(item);
        
        return (growthRate * 0.4) + (recency * 0.3) + (potential * 0.3);
    }

    calculateEngagementRate(item) {
        const totalEngagements = (item.like_count || 0) + (item.comment_count || 0) + (item.share_count || 0);
        const views = Math.max(item.view_count || 1, 1);
        return totalEngagements / views;
    }

    calculateVelocity(item, timeframe) {
        // This would ideally use historical data
        // For now, estimate based on current metrics and age
        const hoursOld = Math.max(this.getHoursOld(item.created_at), 1);
        const totalEngagements = (item.like_count || 0) + (item.comment_count || 0) + (item.share_count || 0);
        return totalEngagements / hoursOld;
    }

    calculateViralVelocity(item) {
        const hoursOld = Math.max(this.getHoursOld(item.created_at), 1);
        const shares = item.share_count || 0;
        return shares / hoursOld;
    }

    calculateGrowthRate(item) {
        // Estimate growth rate based on current metrics and recency
        const hoursOld = Math.max(this.getHoursOld(item.created_at), 1);
        const views = item.view_count || 0;
        
        if (hoursOld < 24) {
            return views / hoursOld; // Views per hour for recent content
        }
        
        return views / (hoursOld / 24); // Views per day for older content
    }

    calculatePotentialScore(item) {
        let score = 0;
        
        // Creator influence
        if (item.user) {
            score += Math.log(1 + (item.user.follower_count || 0)) * 10;
            if (item.user.verified) score += 20;
        }
        
        // Content quality indicators
        if (item.description && item.description.length > 100) score += 10;
        if (item.thumbnail_url) score += 5;
        if (item.tags && item.tags.length > 0) score += item.tags.length * 2;
        
        return score;
    }

    calculateTopicMomentum(topic) {
        const recentMentions = topic.mentions_24h || 0;
        const totalMentions = topic.total_mentions || 1;
        const growthRate = recentMentions / totalMentions;
        
        return recentMentions * (1 + growthRate);
    }

    calculateTopicGrowth(topic) {
        const current = topic.mentions_24h || 0;
        const previous = topic.mentions_previous_24h || 1;
        
        return ((current - previous) / previous) * 100;
    }

    calculateTopicStrength(topic) {
        return (topic.total_mentions || 0) * (topic.unique_users || 1) / 1000;
    }

    calculateHashtagVelocity(hashtag) {
        const hoursOld = Math.max(this.getHoursOld(hashtag.first_used), 1);
        const uses = hashtag.usage_count || 0;
        return uses / hoursOld;
    }

    calculateHashtagReach(hashtag) {
        return Math.log(1 + (hashtag.unique_users || 0)) * 10;
    }

    calculateHashtagEngagement(hashtag) {
        const totalEngagements = (hashtag.total_likes || 0) + (hashtag.total_comments || 0);
        const uses = Math.max(hashtag.usage_count || 1, 1);
        return totalEngagements / uses;
    }

    calculateHashtagTrendStrength(hashtag) {
        const velocity = this.calculateHashtagVelocity(hashtag);
        const reach = this.calculateHashtagReach(hashtag);
        const engagement = this.calculateHashtagEngagement(hashtag);
        
        return velocity + reach + engagement;
    }

    calculatePersonalizationScore(item, user) {
        let score = this.calculateTrendingScore(item, '24h');
        
        // User interest alignment
        if (user.interests && item.category) {
            if (user.interests.includes(item.category)) {
                score *= 1.5;
            }
        }
        
        // Following relationship
        if (item.user && user.following && user.following.includes(item.user.id)) {
            score *= 1.3;
        }
        
        // Similar content engagement history
        if (user.engagement_history) {
            const categoryEngagement = user.engagement_history[item.category] || 0;
            score *= (1 + categoryEngagement / 100);
        }
        
        return score;
    }

    calculateUserAffinity(item, user) {
        let affinity = 0;
        
        if (user.interests && item.category && user.interests.includes(item.category)) {
            affinity += 50;
        }
        
        if (item.user && user.following && user.following.includes(item.user.id)) {
            affinity += 30;
        }
        
        if (item.tags && user.preferred_tags) {
            const commonTags = item.tags.filter(tag => user.preferred_tags.includes(tag));
            affinity += commonTags.length * 10;
        }
        
        return Math.min(affinity, 100);
    }

    getTrendingReason(item) {
        const reasons = [];
        
        if (item.view_count > 10000) reasons.push('High views');
        if (item.like_count > 500) reasons.push('Highly liked');
        if (item.comment_count > 100) reasons.push('Active discussion');
        if (item.share_count > 50) reasons.push('Widely shared');
        
        const hoursOld = this.getHoursOld(item.created_at);
        if (hoursOld < 6) reasons.push('Recently published');
        
        const engagementRate = this.calculateEngagementRate(item);
        if (engagementRate > 0.1) reasons.push('High engagement');
        
        return reasons.length > 0 ? reasons.join(', ') : 'Trending now';
    }

    getViralReason(item) {
        const shareToViewRatio = (item.share_count || 0) / Math.max(item.view_count || 1, 1);
        
        if (shareToViewRatio > 0.1) return 'Rapidly spreading';
        if (item.share_count > 100) return 'Widely shared';
        if (this.calculateViralVelocity(item) > 10) return 'Fast growing';
        
        return 'Going viral';
    }

    getEmergingReason(item) {
        const hoursOld = this.getHoursOld(item.created_at);
        
        if (hoursOld < 2) return 'Just published';
        if (this.calculateGrowthRate(item) > 100) return 'Rapid growth';
        if (this.calculatePotentialScore(item) > 50) return 'High potential';
        
        return 'Rising fast';
    }

    getPersonalizationReason(item, user) {
        const reasons = [];
        
        if (user.interests && item.category && user.interests.includes(item.category)) {
            reasons.push('Matches your interests');
        }
        
        if (item.user && user.following && user.following.includes(item.user.id)) {
            reasons.push('From someone you follow');
        }
        
        if (item.tags && user.preferred_tags) {
            const commonTags = item.tags.filter(tag => user.preferred_tags.includes(tag));
            if (commonTags.length > 0) {
                reasons.push(`Related to ${commonTags.slice(0, 2).join(', ')}`);
            }
        }
        
        return reasons.length > 0 ? reasons.join(' • ') : 'Trending in your network';
    }

    getTrendDirection(item) {
        // This would ideally compare with historical data
        const velocity = this.calculateVelocity(item, '24h');
        
        if (velocity > 50) return 'up';
        if (velocity > 10) return 'stable';
        return 'down';
    }

    formatTrendingStats(item) {
        return {
            views: this.formatNumber(item.view_count || 0),
            likes: this.formatNumber(item.like_count || 0),
            comments: this.formatNumber(item.comment_count || 0),
            shares: this.formatNumber(item.share_count || 0),
            engagement_rate: `${(this.calculateEngagementRate(item) * 100).toFixed(1)}%`
        };
    }

    getHoursOld(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        return (now - date) / (1000 * 60 * 60);
    }

    getRecencyMultiplier(hoursOld, timeframe) {
        const maxHours = timeframe === '1h' ? 1 : timeframe === '24h' ? 24 : 168; // 1 week
        
        if (hoursOld > maxHours) return 0.1;
        
        // Exponential decay
        return Math.exp(-hoursOld / (maxHours / 3));
    }

    getRecencyScore(dateString) {
        const hoursOld = this.getHoursOld(dateString);
        return Math.max(0, 100 - hoursOld);
    }

    formatNumber(num) {
        if (num < 1000) return num.toString();
        if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
        return (num / 1000000).toFixed(1) + 'M';
    }

    // Cache Management
    getCacheKey(type, params = {}) {
        const currentUser = Auth.getCurrentUser();
        const userId = currentUser ? currentUser.id : 'anonymous';
        const paramsStr = JSON.stringify(params);
        return `${type}_${userId}_${paramsStr}`;
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
        if (this.cache.size > 50) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
    }

    clearCache() {
        this.cache.clear();
    }
}

// Export singleton instance
export default new TrendingService();
