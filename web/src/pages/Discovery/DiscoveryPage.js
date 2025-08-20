import API from '../../services/api.js';
import Auth from '../../services/auth.js';
import SearchService from '../../services/SearchService.js';
import UserRecommendationService from '../../services/UserRecommendationService.js';
import SearchBox from '../../components/SearchBox.js';
import LikeButton from '../../components/LikeButton.js';
import FollowButton from '../../components/FollowButton.js';

export default class DiscoveryPage {
    constructor() {
        this.currentUser = Auth.getCurrentUser();
        this.trendingContent = [];
        this.recommendations = [];
        this.categories = [];
        this.popularSearches = [];
        this.userRecommendations = [];
        this.isLoading = false;
        this.searchBox = null;
        this.likeButtons = new Map();
        this.followButtons = new Map();
    }

    async render(container) {
        container.innerHTML = this.getHTML();
        this.setupEventListeners(container);
        this.initializeSearchBox(container);
        
        await this.loadDiscoveryContent();
    }

    getHTML() {
        return `
            <div class="discovery-page">
                <div class="container py-4">
                    <!-- Hero Section -->
                    <div class="hero-section text-center mb-5">
                        <h1 class="display-4 fw-bold mb-3">Discover Amazing Content</h1>
                        <p class="lead text-muted mb-4">
                            Find interviews, galleries, and creators that match your interests
                        </p>
                        
                        <!-- Enhanced Search Box -->
                        <div class="row justify-content-center">
                            <div class="col-lg-8">
                                <div id="discovery-search-box"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Quick Categories -->
                    <div class="categories-section mb-5">
                        <h3 class="mb-4">
                            <i class="fas fa-th-large me-2"></i>Browse by Category
                        </h3>
                        <div id="categories-container">
                            <div class="text-center py-3">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading categories...</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="row">
                        <!-- Main Content -->
                        <div class="col-lg-8">
                            <!-- Trending Content -->
                            <div class="trending-section mb-5">
                                <div class="d-flex justify-content-between align-items-center mb-4">
                                    <h3>
                                        <i class="fas fa-fire text-danger me-2"></i>Trending Now
                                    </h3>
                                    <div class="btn-group btn-group-sm" role="group">
                                        <button type="button" class="btn btn-outline-primary active" data-filter="all">
                                            All
                                        </button>
                                        <button type="button" class="btn btn-outline-primary" data-filter="interview">
                                            Interviews
                                        </button>
                                        <button type="button" class="btn btn-outline-primary" data-filter="gallery">
                                            Galleries
                                        </button>
                                    </div>
                                </div>
                                <div id="trending-container">
                                    <div class="text-center py-3">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">Loading trending content...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Personalized Recommendations -->
                            ${this.currentUser ? `
                                <div class="recommendations-section mb-5">
                                    <h3 class="mb-4">
                                        <i class="fas fa-magic text-primary me-2"></i>Recommended for You
                                    </h3>
                                    <div id="recommendations-container">
                                        <div class="text-center py-3">
                                            <div class="spinner-border text-primary" role="status">
                                                <span class="visually-hidden">Loading recommendations...</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>

                        <!-- Sidebar -->
                        <div class="col-lg-4">
                            <!-- Popular Searches -->
                            <div class="card mb-4">
                                <div class="card-header">
                                    <h6 class="mb-0">
                                        <i class="fas fa-search me-2"></i>Popular Searches
                                    </h6>
                                </div>
                                <div class="card-body" id="popular-searches-container">
                                    <div class="text-center py-3">
                                        <div class="spinner-border spinner-border-sm text-primary" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Suggested Users -->
                            ${this.currentUser ? `
                                <div class="card mb-4">
                                    <div class="card-header">
                                        <h6 class="mb-0">
                                            <i class="fas fa-user-plus me-2"></i>People to Follow
                                        </h6>
                                    </div>
                                    <div class="card-body" id="user-recommendations-container">
                                        <div class="text-center py-3">
                                            <div class="spinner-border spinner-border-sm text-primary" role="status">
                                                <span class="visually-hidden">Loading...</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}

                            <!-- Discovery Stats -->
                            <div class="card">
                                <div class="card-header">
                                    <h6 class="mb-0">
                                        <i class="fas fa-chart-bar me-2"></i>Platform Stats
                                    </h6>
                                </div>
                                <div class="card-body" id="stats-container">
                                    <div class="text-center py-3">
                                        <div class="spinner-border spinner-border-sm text-primary" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadDiscoveryContent() {
        try {
            this.isLoading = true;

            // Load all discovery content in parallel
            const promises = [
                this.loadCategories(),
                this.loadTrendingContent(),
                this.loadPopularSearches(),
                this.loadPlatformStats()
            ];

            if (this.currentUser) {
                promises.push(
                    this.loadPersonalizedRecommendations(),
                    this.loadUserRecommendations()
                );
            }

            await Promise.all(promises);

        } catch (error) {
            console.error('Failed to load discovery content:', error);
        } finally {
            this.isLoading = false;
        }
    }

    async loadCategories() {
        try {
            const categories = await SearchService.getSearchCategories();
            this.categories = categories;
            this.renderCategories();
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    }

    async loadTrendingContent(type = null) {
        try {
            const trending = await SearchService.getTrendingContent(type, 12);
            this.trendingContent = trending;
            this.renderTrendingContent();
        } catch (error) {
            console.error('Failed to load trending content:', error);
        }
    }

    async loadPersonalizedRecommendations() {
        try {
            const recommendations = await SearchService.getPersonalizedRecommendations(8);
            this.recommendations = recommendations;
            this.renderRecommendations();
        } catch (error) {
            console.error('Failed to load recommendations:', error);
        }
    }

    async loadPopularSearches() {
        try {
            const popular = await SearchService.getPopularSearches(10);
            this.popularSearches = popular;
            this.renderPopularSearches();
        } catch (error) {
            console.error('Failed to load popular searches:', error);
        }
    }

    async loadUserRecommendations() {
        try {
            const users = await UserRecommendationService.getPersonalizedRecommendations(5);
            this.userRecommendations = users;
            this.renderUserRecommendations();
        } catch (error) {
            console.error('Failed to load user recommendations:', error);
        }
    }

    async loadPlatformStats() {
        try {
            const response = await API.get('/api/stats/platform');
            if (response.success) {
                this.renderPlatformStats(response.data);
            }
        } catch (error) {
            console.error('Failed to load platform stats:', error);
        }
    }

    renderCategories() {
        const container = document.getElementById('categories-container');
        
        if (this.categories.length === 0) {
            container.innerHTML = `
                <div class="text-center py-3">
                    <i class="fas fa-folder-open fa-2x text-muted mb-2"></i>
                    <p class="text-muted small mb-0">No categories available</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="row g-3">
                ${this.categories.map(category => `
                    <div class="col-md-4 col-lg-3">
                        <a href="/search?category=${encodeURIComponent(category.slug)}" 
                           class="category-card card h-100 text-decoration-none">
                            <div class="card-body text-center">
                                <div class="category-icon mb-3">
                                    <i class="${category.icon || 'fas fa-folder'} fa-2x text-primary"></i>
                                </div>
                                <h6 class="card-title">${category.name}</h6>
                                <small class="text-muted">${category.count || 0} items</small>
                            </div>
                        </a>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderTrendingContent() {
        const container = document.getElementById('trending-container');
        
        if (this.trendingContent.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-fire fa-3x text-muted mb-3"></i>
                    <h5>No trending content</h5>
                    <p class="text-muted">Check back later for trending content</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="row g-4">
                ${this.trendingContent.map((item, index) => `
                    <div class="col-md-6 col-lg-4">
                        ${this.getContentCardHTML(item, index + 1)}
                    </div>
                `).join('')}
            </div>
        `;

        // Initialize interactive components
        this.initializeContentInteractions();
    }

    renderRecommendations() {
        const container = document.getElementById('recommendations-container');
        
        if (this.recommendations.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-magic fa-3x text-muted mb-3"></i>
                    <h5>No recommendations yet</h5>
                    <p class="text-muted">Interact with more content to get personalized recommendations</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="row g-4">
                ${this.recommendations.map(item => `
                    <div class="col-md-6">
                        ${this.getContentCardHTML(item)}
                    </div>
                `).join('')}
            </div>
        `;

        // Initialize interactive components
        this.initializeContentInteractions();
    }

    renderPopularSearches() {
        const container = document.getElementById('popular-searches-container');
        
        if (this.popularSearches.length === 0) {
            container.innerHTML = `
                <div class="text-center py-3">
                    <i class="fas fa-search fa-2x text-muted mb-2"></i>
                    <p class="text-muted small mb-0">No popular searches</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.popularSearches.map((search, index) => `
            <div class="popular-search-item d-flex justify-content-between align-items-center mb-2">
                <a href="/search?q=${encodeURIComponent(search.query)}" 
                   class="text-decoration-none flex-grow-1">
                    <span class="badge bg-light text-dark me-2">${index + 1}</span>
                    ${search.query}
                </a>
                <small class="text-muted">${search.count || 0}</small>
            </div>
        `).join('');
    }

    renderUserRecommendations() {
        const container = document.getElementById('user-recommendations-container');
        
        if (this.userRecommendations.length === 0) {
            container.innerHTML = `
                <div class="text-center py-3">
                    <i class="fas fa-users fa-2x text-muted mb-2"></i>
                    <p class="text-muted small mb-0">No user recommendations</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.userRecommendations.map(user => `
            <div class="user-recommendation-item d-flex align-items-center mb-3">
                <img src="${user.avatar_url || '/assets/default-avatar.png'}" 
                     class="rounded-circle me-3" 
                     width="40" height="40" 
                     alt="${user.username}">
                
                <div class="flex-grow-1">
                    <h6 class="mb-1 small">
                        <a href="/profile/${user.username}" class="text-decoration-none">
                            ${user.display_name || user.username}
                        </a>
                        ${user.verified ? '<i class="fas fa-check-circle text-primary ms-1"></i>' : ''}
                    </h6>
                    <small class="text-muted">
                        ${user.recommendation_reasons.slice(0, 1).join(', ')}
                    </small>
                </div>
                
                <div class="follow-button-container" data-username="${user.username}"></div>
            </div>
        `).join('');

        // Initialize follow buttons
        this.initializeUserFollowButtons();
    }

    renderPlatformStats(stats) {
        const container = document.getElementById('stats-container');
        
        container.innerHTML = `
            <div class="row text-center">
                <div class="col-6">
                    <div class="stat-item">
                        <div class="h5 mb-1 text-primary">${this.formatNumber(stats.total_interviews || 0)}</div>
                        <small class="text-muted">Interviews</small>
                    </div>
                </div>
                <div class="col-6">
                    <div class="stat-item">
                        <div class="h5 mb-1 text-success">${this.formatNumber(stats.total_users || 0)}</div>
                        <small class="text-muted">Users</small>
                    </div>
                </div>
            </div>
            <hr>
            <div class="row text-center">
                <div class="col-6">
                    <div class="stat-item">
                        <div class="h5 mb-1 text-warning">${this.formatNumber(stats.total_galleries || 0)}</div>
                        <small class="text-muted">Galleries</small>
                    </div>
                </div>
                <div class="col-6">
                    <div class="stat-item">
                        <div class="h5 mb-1 text-info">${this.formatNumber(stats.total_views || 0)}</div>
                        <small class="text-muted">Views</small>
                    </div>
                </div>
            </div>
        `;
    }

    getContentCardHTML(item, rank = null) {
        const typeIcon = this.getTypeIcon(item.type);
        const typeColor = this.getTypeColor(item.type);
        
        return `
            <div class="content-card card h-100">
                ${rank ? `
                    <div class="position-absolute top-0 start-0 m-2">
                        <span class="badge bg-danger">#${rank}</span>
                    </div>
                ` : ''}
                
                <div class="position-relative">
                    ${item.thumbnail_url || item.cover_image_url ? `
                        <img src="${item.thumbnail_url || item.cover_image_url}" 
                             class="card-img-top" 
                             style="height: 200px; object-fit: cover;"
                             alt="${item.title}">
                    ` : `
                        <div class="card-img-top d-flex align-items-center justify-content-center bg-light" 
                             style="height: 200px;">
                            <i class="${typeIcon} fa-3x text-muted"></i>
                        </div>
                    `}
                    
                    <div class="position-absolute top-0 end-0 m-2">
                        <span class="badge bg-${typeColor}">${item.display_type}</span>
                    </div>
                </div>
                
                <div class="card-body">
                    <h6 class="card-title">
                        <a href="${this.getContentUrl(item)}" class="text-decoration-none">
                            ${item.title}
                        </a>
                    </h6>
                    
                    <p class="card-text small text-muted">
                        ${item.excerpt}
                    </p>
                    
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="like-button-container" data-entity-type="${item.type}" data-entity-id="${item.id}"></div>
                        <small class="text-muted">${item.formatted_date}</small>
                    </div>
                </div>
            </div>
        `;
    }

    getTypeIcon(type) {
        const icons = {
            'interview': 'fas fa-video',
            'gallery': 'fas fa-images',
            'user': 'fas fa-user',
            'event': 'fas fa-calendar',
            'business': 'fas fa-building'
        };
        return icons[type] || 'fas fa-file';
    }

    getTypeColor(type) {
        const colors = {
            'interview': 'primary',
            'gallery': 'success',
            'user': 'info',
            'event': 'warning',
            'business': 'secondary'
        };
        return colors[type] || 'light';
    }

    getContentUrl(item) {
        const urls = {
            'interview': `/interviews/${item.id}`,
            'gallery': `/gallery/${item.id}`,
            'user': `/profile/${item.username}`,
            'event': `/events/${item.id}`,
            'business': `/business/${item.id}`
        };
        return urls[item.type] || '#';
    }

    initializeSearchBox(container) {
        const searchContainer = container.querySelector('#discovery-search-box');
        if (searchContainer) {
            this.searchBox = new SearchBox(searchContainer, {
                placeholder: 'Search interviews, galleries, users, and more...',
                showSuggestions: true,
                showFilters: true,
                autoFocus: false
            });
            this.searchBox.render();
        }
    }

    initializeContentInteractions() {
        // Initialize like buttons
        const likeContainers = document.querySelectorAll('.like-button-container');
        likeContainers.forEach(container => {
            const entityType = container.dataset.entityType;
            const entityId = container.dataset.entityId;
            
            if (entityType && entityId) {
                const entity = this.findEntityById(entityType, entityId);
                if (entity) {
                    const likeButton = new LikeButton({
                        entityType: entityType,
                        entityId: entityId,
                        liked: entity.is_liked || false,
                        count: entity.like_count || 0,
                        size: 'small',
                        showText: false,
                        onLikeChange: (data) => {
                            this.updateEntityLikeStatus(entityType, entityId, data);
                        }
                    });
                    likeButton.render(container);
                    this.likeButtons.set(`${entityType}_${entityId}`, likeButton);
                }
            }
        });
    }

    initializeUserFollowButtons() {
        const containers = document.querySelectorAll('#user-recommendations-container .follow-button-container');
        containers.forEach(container => {
            const username = container.dataset.username;
            const user = this.userRecommendations.find(u => u.username === username);
            
            if (user) {
                const followButton = new FollowButton({
                    username: username,
                    following: user.is_following || false,
                    followerCount: user.follower_count || 0,
                    size: 'small',
                    style: 'primary',
                    showCount: false,
                    onFollowChange: (data) => {
                        this.updateUserFollowStatus(username, data);
                        // Track interaction for better recommendations
                        UserRecommendationService.trackInteraction('follow', username);
                    }
                });
                followButton.render(container);
                this.followButtons.set(`rec_${username}`, followButton);
            }
        });
    }

    setupEventListeners(container) {
        // Trending filter buttons
        const filterButtons = container.querySelectorAll('[data-filter]');
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // Update active state
                filterButtons.forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                
                // Load filtered content
                const filter = e.target.dataset.filter;
                this.loadTrendingContent(filter === 'all' ? null : filter);
            });
        });
    }

    findEntityById(entityType, entityId) {
        const allContent = [...this.trendingContent, ...this.recommendations];
        return allContent.find(item => item.type === entityType && item.id == entityId);
    }

    updateEntityLikeStatus(entityType, entityId, data) {
        [this.trendingContent, this.recommendations].forEach(contentArray => {
            contentArray.forEach(item => {
                if (item.type === entityType && item.id == entityId) {
                    item.is_liked = data.liked;
                    item.like_count = data.count;
                }
            });
        });
    }

    updateUserFollowStatus(username, data) {
        this.userRecommendations.forEach(user => {
            if (user.username === username) {
                user.is_following = data.following;
                user.follower_count = data.followerCount;
            }
        });
    }

    formatNumber(num) {
        if (num < 1000) return num.toString();
        if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
        return (num / 1000000).toFixed(1) + 'M';
    }

    destroy() {
        // Clean up like buttons
        this.likeButtons.forEach(button => button.destroy());
        this.likeButtons.clear();

        // Clean up follow buttons
        this.followButtons.forEach(button => button.destroy());
        this.followButtons.clear();

        // Clean up search box
        if (this.searchBox) {
            this.searchBox.destroy();
        }
    }
}
