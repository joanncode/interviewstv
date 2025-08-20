import API from './api.js';
import Auth from './auth.js';

class SearchService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.searchHistory = this.loadSearchHistory();
        this.maxHistoryItems = 20;
    }

    async performSearch(query, filters = {}, page = 1, limit = 20) {
        const cacheKey = this.getCacheKey('search', { query, filters, page, limit });
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const params = {
                q: query,
                page,
                limit,
                ...filters
            };

            // Remove empty params
            Object.keys(params).forEach(key => {
                if (params[key] === '' || params[key] === null || params[key] === undefined) {
                    delete params[key];
                }
            });

            const response = await API.search(params);
            
            if (response.success) {
                // Save to search history if it's a meaningful search
                if (query && query.trim().length > 2) {
                    this.addToSearchHistory(query, filters);
                }

                // Cache the results
                this.setCache(cacheKey, response.data);
                
                // Track search analytics
                this.trackSearchAnalytics(query, filters, response.data.total_results);
                
                return response.data;
            }

            return { results: [], total_results: 0, pagination: {} };
        } catch (error) {
            console.error('Search failed:', error);
            return { results: [], total_results: 0, pagination: {} };
        }
    }

    async getSuggestions(query) {
        if (!query || query.length < 2) return [];

        const cacheKey = this.getCacheKey('suggestions', { query });
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await API.getSearchSuggestions(query);
            
            if (response.success) {
                const suggestions = this.enhanceSuggestions(response.data.suggestions, query);
                this.setCache(cacheKey, suggestions);
                return suggestions;
            }

            return [];
        } catch (error) {
            console.error('Failed to get suggestions:', error);
            return [];
        }
    }

    async getPopularSearches(limit = 10) {
        const cacheKey = this.getCacheKey('popular_searches', { limit });
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await API.getPopularContent(null, limit);
            
            if (response.success) {
                const popular = response.data.items.map(item => ({
                    query: item.title || item.name,
                    type: item.type,
                    count: item.search_count || item.view_count,
                    category: item.category
                }));
                
                this.setCache(cacheKey, popular);
                return popular;
            }

            return [];
        } catch (error) {
            console.error('Failed to get popular searches:', error);
            return [];
        }
    }

    async getTrendingContent(type = null, limit = 10) {
        const cacheKey = this.getCacheKey('trending', { type, limit });
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await API.getTrendingContent(type, limit);
            
            if (response.success) {
                const trending = this.enhanceSearchResults(response.data.items);
                this.setCache(cacheKey, trending);
                return trending;
            }

            return [];
        } catch (error) {
            console.error('Failed to get trending content:', error);
            return [];
        }
    }

    async getPersonalizedRecommendations(limit = 10) {
        const currentUser = Auth.getCurrentUser();
        if (!currentUser) return [];

        const cacheKey = this.getCacheKey('recommendations', { userId: currentUser.id, limit });
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await API.getRecommendations(limit);
            
            if (response.success) {
                const recommendations = this.enhanceSearchResults(response.data.items);
                this.setCache(cacheKey, recommendations);
                return recommendations;
            }

            return [];
        } catch (error) {
            console.error('Failed to get recommendations:', error);
            return [];
        }
    }

    async getSearchCategories(type = null) {
        const cacheKey = this.getCacheKey('categories', { type });
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await API.getSearchCategories(type);
            
            if (response.success) {
                this.setCache(cacheKey, response.data.categories);
                return response.data.categories;
            }

            return [];
        } catch (error) {
            console.error('Failed to get categories:', error);
            return [];
        }
    }

    async getSearchTags(query = '', type = null, limit = 10) {
        const cacheKey = this.getCacheKey('tags', { query, type, limit });
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await API.getSearchTags(query, type, limit);
            
            if (response.success) {
                this.setCache(cacheKey, response.data.tags);
                return response.data.tags;
            }

            return [];
        } catch (error) {
            console.error('Failed to get tags:', error);
            return [];
        }
    }

    enhanceSuggestions(suggestions, query) {
        return suggestions.map(suggestion => ({
            ...suggestion,
            highlighted: this.highlightMatch(suggestion.text, query),
            score: this.calculateSuggestionScore(suggestion, query)
        })).sort((a, b) => b.score - a.score);
    }

    enhanceSearchResults(results) {
        return results.map(result => ({
            ...result,
            relevance_score: this.calculateRelevanceScore(result),
            display_type: this.getDisplayType(result),
            formatted_date: this.formatDate(result.created_at),
            excerpt: this.generateExcerpt(result.content || result.description, 150)
        }));
    }

    calculateSuggestionScore(suggestion, query) {
        let score = 0;
        
        // Exact match gets highest score
        if (suggestion.text.toLowerCase() === query.toLowerCase()) {
            score += 100;
        }
        
        // Starts with query gets high score
        if (suggestion.text.toLowerCase().startsWith(query.toLowerCase())) {
            score += 50;
        }
        
        // Contains query gets medium score
        if (suggestion.text.toLowerCase().includes(query.toLowerCase())) {
            score += 25;
        }
        
        // Popularity score
        score += Math.min(suggestion.count || 0, 25);
        
        // Recent suggestions get bonus
        if (suggestion.recent) {
            score += 10;
        }
        
        return score;
    }

    calculateRelevanceScore(result) {
        let score = 0;
        
        // Base score from search ranking
        score += result.search_score || 0;
        
        // Popularity metrics
        score += Math.log(1 + (result.view_count || 0)) * 2;
        score += Math.log(1 + (result.like_count || 0)) * 3;
        score += Math.log(1 + (result.comment_count || 0)) * 2;
        
        // Recency bonus
        const daysSinceCreated = (Date.now() - new Date(result.created_at)) / (1000 * 60 * 60 * 24);
        score += Math.max(0, 30 - daysSinceCreated);
        
        // User verification bonus
        if (result.user && result.user.verified) {
            score += 5;
        }
        
        return Math.round(score * 10) / 10;
    }

    getDisplayType(result) {
        const typeMap = {
            'interview': 'Interview',
            'gallery': 'Gallery',
            'user': 'User',
            'event': 'Event',
            'business': 'Business'
        };
        return typeMap[result.type] || 'Content';
    }

    highlightMatch(text, query) {
        if (!query) return text;
        
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    generateExcerpt(text, maxLength = 150) {
        if (!text) return '';
        
        if (text.length <= maxLength) return text;
        
        // Try to break at word boundary
        const truncated = text.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');
        
        if (lastSpace > maxLength * 0.8) {
            return truncated.substring(0, lastSpace) + '...';
        }
        
        return truncated + '...';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        
        if (diffInDays === 0) return 'Today';
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 7) return `${diffInDays} days ago`;
        if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
        if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
        
        return date.toLocaleDateString();
    }

    // Search History Management
    addToSearchHistory(query, filters = {}) {
        const historyItem = {
            query: query.trim(),
            filters,
            timestamp: Date.now(),
            id: Date.now().toString()
        };

        // Remove duplicate
        this.searchHistory = this.searchHistory.filter(item => 
            item.query.toLowerCase() !== query.toLowerCase()
        );

        // Add to beginning
        this.searchHistory.unshift(historyItem);

        // Limit size
        if (this.searchHistory.length > this.maxHistoryItems) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistoryItems);
        }

        this.saveSearchHistory();
    }

    getSearchHistory() {
        return this.searchHistory.slice(0, 10); // Return last 10 searches
    }

    clearSearchHistory() {
        this.searchHistory = [];
        this.saveSearchHistory();
    }

    removeFromSearchHistory(id) {
        this.searchHistory = this.searchHistory.filter(item => item.id !== id);
        this.saveSearchHistory();
    }

    loadSearchHistory() {
        try {
            const stored = localStorage.getItem('search_history');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to load search history:', error);
            return [];
        }
    }

    saveSearchHistory() {
        try {
            localStorage.setItem('search_history', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.error('Failed to save search history:', error);
        }
    }

    // Analytics
    trackSearchAnalytics(query, filters, resultCount) {
        try {
            // Track search for analytics
            const analyticsData = {
                query,
                filters,
                result_count: resultCount,
                timestamp: Date.now(),
                user_id: Auth.getCurrentUser()?.id
            };

            // Send to analytics endpoint (fire and forget)
            API.post('/api/analytics/search', analyticsData).catch(() => {
                // Ignore analytics errors
            });
        } catch (error) {
            // Ignore analytics errors
        }
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
        if (this.cache.size > 100) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
    }

    clearCache() {
        this.cache.clear();
    }
}

// Export singleton instance
export default new SearchService();
