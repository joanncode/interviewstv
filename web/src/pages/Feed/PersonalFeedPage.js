import API from '../../services/api.js';
import Auth from '../../services/auth.js';
import UserRecommendationService from '../../services/UserRecommendationService.js';
import FollowButton from '../../components/FollowButton.js';
import LikeButton from '../../components/LikeButton.js';

export default class PersonalFeedPage {
    constructor() {
        this.currentUser = Auth.getCurrentUser();
        this.feedItems = [];
        this.recommendations = [];
        this.currentPage = 1;
        this.hasMore = true;
        this.isLoading = false;
        this.followButtons = new Map();
        this.likeButtons = new Map();
        this.intersectionObserver = null;
    }

    async render(container) {
        if (!this.currentUser) {
            window.location.href = '/login';
            return;
        }

        container.innerHTML = this.getHTML();
        this.setupEventListeners(container);
        this.setupInfiniteScroll();
        
        await Promise.all([
            this.loadFeed(),
            this.loadRecommendations()
        ]);
    }

    getHTML() {
        return `
            <div class="personal-feed-page">
                <div class="container py-4">
                    <div class="row">
                        <!-- Main Feed -->
                        <div class="col-lg-8">
                            <div class="feed-header mb-4">
                                <h2>Your Personal Feed</h2>
                                <p class="text-muted">Latest updates from people you follow</p>
                            </div>
                            
                            <div id="feed-container">
                                <div class="text-center py-5" id="initial-loading">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Loading feed...</span>
                                    </div>
                                    <p class="mt-3">Loading your personalized feed...</p>
                                </div>
                            </div>

                            <!-- Infinite Scroll Trigger -->
                            <div id="scroll-trigger" style="height: 1px; margin-bottom: 50px;"></div>

                            <!-- Load More Button (fallback) -->
                            <div class="text-center mb-4" id="load-more-container" style="display: none;">
                                <button class="btn btn-outline-primary" id="load-more-btn">
                                    <i class="fas fa-plus me-2"></i>Load More
                                </button>
                            </div>
                        </div>

                        <!-- Sidebar -->
                        <div class="col-lg-4">
                            <!-- User Recommendations -->
                            <div class="card mb-4">
                                <div class="card-header">
                                    <h6 class="mb-0">
                                        <i class="fas fa-user-plus me-2"></i>Suggested for You
                                    </h6>
                                </div>
                                <div class="card-body" id="recommendations-container">
                                    <div class="text-center py-3">
                                        <div class="spinner-border spinner-border-sm text-primary" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Feed Stats -->
                            <div class="card mb-4">
                                <div class="card-header">
                                    <h6 class="mb-0">
                                        <i class="fas fa-chart-line me-2"></i>Your Activity
                                    </h6>
                                </div>
                                <div class="card-body">
                                    <div class="row text-center">
                                        <div class="col-6">
                                            <div class="stat-item">
                                                <div class="h5 mb-1 text-primary">${this.currentUser.following_count || 0}</div>
                                                <small class="text-muted">Following</small>
                                            </div>
                                        </div>
                                        <div class="col-6">
                                            <div class="stat-item">
                                                <div class="h5 mb-1 text-success">${this.currentUser.follower_count || 0}</div>
                                                <small class="text-muted">Followers</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Quick Actions -->
                            <div class="card">
                                <div class="card-header">
                                    <h6 class="mb-0">
                                        <i class="fas fa-bolt me-2"></i>Quick Actions
                                    </h6>
                                </div>
                                <div class="card-body">
                                    <div class="d-grid gap-2">
                                        <a href="/interviews/create" class="btn btn-primary btn-sm">
                                            <i class="fas fa-video me-2"></i>Create Interview
                                        </a>
                                        <a href="/gallery/create" class="btn btn-outline-primary btn-sm">
                                            <i class="fas fa-images me-2"></i>Create Gallery
                                        </a>
                                        <a href="/users/discover" class="btn btn-outline-secondary btn-sm">
                                            <i class="fas fa-search me-2"></i>Discover People
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadFeed() {
        if (this.isLoading || !this.hasMore) return;

        try {
            this.isLoading = true;
            this.showLoadingIndicator();

            const response = await API.getPersonalFeed({
                page: this.currentPage,
                limit: 10
            });

            if (response.success) {
                const newItems = response.data.items;
                
                if (newItems.length === 0) {
                    this.hasMore = false;
                    if (this.currentPage === 1) {
                        this.showEmptyFeed();
                    }
                } else {
                    this.feedItems = [...this.feedItems, ...newItems];
                    this.renderFeedItems(this.currentPage === 1);
                    this.currentPage++;
                }
            }

        } catch (error) {
            console.error('Failed to load feed:', error);
            if (this.currentPage === 1) {
                this.showErrorState();
            }
        } finally {
            this.isLoading = false;
            this.hideLoadingIndicator();
        }
    }

    async loadRecommendations() {
        try {
            const recommendations = await UserRecommendationService.getPersonalizedRecommendations(5);
            this.recommendations = recommendations;
            this.renderRecommendations();
        } catch (error) {
            console.error('Failed to load recommendations:', error);
        }
    }

    renderFeedItems(replace = false) {
        const container = document.getElementById('feed-container');
        const initialLoading = document.getElementById('initial-loading');
        
        if (initialLoading) {
            initialLoading.style.display = 'none';
        }

        if (replace) {
            container.innerHTML = '';
        }

        this.feedItems.forEach((item, index) => {
            if (replace || index >= this.feedItems.length - 10) {
                const itemElement = this.createFeedItemElement(item);
                container.appendChild(itemElement);
            }
        });

        // Initialize interactive components
        this.initializeFeedInteractions();
    }

    createFeedItemElement(item) {
        const element = document.createElement('div');
        element.className = 'feed-item card mb-4';
        element.innerHTML = this.getFeedItemHTML(item);
        return element;
    }

    getFeedItemHTML(item) {
        const timeAgo = this.formatTimeAgo(item.created_at);
        
        return `
            <div class="card-body">
                <div class="d-flex align-items-start">
                    <img src="${item.user.avatar_url || '/assets/default-avatar.png'}" 
                         class="rounded-circle me-3" 
                         width="48" height="48" 
                         alt="${item.user.username}">
                    
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <h6 class="mb-1">
                                    <a href="/profile/${item.user.username}" class="text-decoration-none">
                                        ${item.user.display_name || item.user.username}
                                    </a>
                                    ${item.user.verified ? '<i class="fas fa-check-circle text-primary ms-1"></i>' : ''}
                                </h6>
                                <small class="text-muted">@${item.user.username} • ${timeAgo}</small>
                            </div>
                            <div class="follow-button-container" data-username="${item.user.username}"></div>
                        </div>
                        
                        <div class="feed-content">
                            ${this.getFeedContentHTML(item)}
                        </div>
                        
                        <div class="feed-actions mt-3 d-flex align-items-center gap-3">
                            <div class="like-button-container" data-entity-type="${item.entity_type}" data-entity-id="${item.entity_id}"></div>
                            <button class="btn btn-sm btn-link text-muted p-0">
                                <i class="fas fa-comment me-1"></i>Comment
                            </button>
                            <button class="btn btn-sm btn-link text-muted p-0">
                                <i class="fas fa-share me-1"></i>Share
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getFeedContentHTML(item) {
        switch (item.activity_type) {
            case 'interview_created':
                return this.getInterviewContentHTML(item);
            case 'gallery_created':
                return this.getGalleryContentHTML(item);
            case 'interview_liked':
                return this.getLikeContentHTML(item);
            case 'user_followed':
                return this.getFollowContentHTML(item);
            default:
                return this.getGenericContentHTML(item);
        }
    }

    getInterviewContentHTML(item) {
        const interview = item.entity_data;
        return `
            <div class="activity-content">
                <p class="mb-2">
                    <i class="fas fa-video text-primary me-2"></i>
                    Created a new interview
                </p>
                <div class="content-preview card">
                    <div class="row g-0">
                        ${interview.thumbnail_url ? `
                            <div class="col-md-4">
                                <img src="${interview.thumbnail_url}" 
                                     class="img-fluid rounded-start h-100" 
                                     style="object-fit: cover;">
                            </div>
                        ` : ''}
                        <div class="col-md-${interview.thumbnail_url ? '8' : '12'}">
                            <div class="card-body">
                                <h6 class="card-title">
                                    <a href="/interviews/${interview.id}" class="text-decoration-none">
                                        ${interview.title}
                                    </a>
                                </h6>
                                <p class="card-text small text-muted">
                                    ${interview.description ? interview.description.substring(0, 100) + '...' : ''}
                                </p>
                                <small class="text-muted">
                                    ${interview.duration ? this.formatDuration(interview.duration) : ''} • 
                                    ${interview.view_count || 0} views
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getGalleryContentHTML(item) {
        const gallery = item.entity_data;
        return `
            <div class="activity-content">
                <p class="mb-2">
                    <i class="fas fa-images text-success me-2"></i>
                    Created a new gallery
                </p>
                <div class="content-preview card">
                    <div class="card-body">
                        <h6 class="card-title">
                            <a href="/gallery/${gallery.id}" class="text-decoration-none">
                                ${gallery.title}
                            </a>
                        </h6>
                        <p class="card-text small text-muted">
                            ${gallery.description ? gallery.description.substring(0, 100) + '...' : ''}
                        </p>
                        <small class="text-muted">
                            ${gallery.media_count || 0} media files
                        </small>
                    </div>
                </div>
            </div>
        `;
    }

    getLikeContentHTML(item) {
        return `
            <div class="activity-content">
                <p class="mb-2">
                    <i class="fas fa-heart text-danger me-2"></i>
                    Liked ${item.entity_data.title}
                </p>
            </div>
        `;
    }

    getFollowContentHTML(item) {
        return `
            <div class="activity-content">
                <p class="mb-2">
                    <i class="fas fa-user-plus text-info me-2"></i>
                    Started following @${item.entity_data.username}
                </p>
            </div>
        `;
    }

    getGenericContentHTML(item) {
        return `
            <div class="activity-content">
                <p class="mb-2">${item.activity_type.replace('_', ' ')}</p>
            </div>
        `;
    }

    renderRecommendations() {
        const container = document.getElementById('recommendations-container');
        
        if (this.recommendations.length === 0) {
            container.innerHTML = `
                <div class="text-center py-3">
                    <i class="fas fa-users fa-2x text-muted mb-2"></i>
                    <p class="text-muted small mb-0">No recommendations available</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.recommendations.map(user => `
            <div class="recommendation-item d-flex align-items-center mb-3">
                <img src="${user.avatar_url || '/assets/default-avatar.png'}" 
                     class="rounded-circle me-3" 
                     width="40" height="40" 
                     alt="${user.username}">
                
                <div class="flex-grow-1">
                    <h6 class="mb-1 small">
                        <a href="/profile/${user.username}" class="text-decoration-none">
                            ${user.display_name || user.username}
                        </a>
                    </h6>
                    <small class="text-muted">
                        ${user.recommendation_reasons.slice(0, 1).join(', ')}
                    </small>
                </div>
                
                <div class="follow-button-container" data-username="${user.username}"></div>
            </div>
        `).join('');

        // Initialize follow buttons for recommendations
        this.initializeRecommendationFollowButtons();
    }

    initializeFeedInteractions() {
        // Initialize follow buttons
        const followContainers = document.querySelectorAll('.follow-button-container');
        followContainers.forEach(container => {
            const username = container.dataset.username;
            if (username && username !== this.currentUser.username) {
                const user = this.findUserByUsername(username);
                if (user) {
                    const followButton = new FollowButton({
                        username: username,
                        following: user.is_following || false,
                        followerCount: user.follower_count || 0,
                        size: 'small',
                        style: 'outline',
                        onFollowChange: (data) => {
                            this.updateUserFollowStatus(username, data);
                        }
                    });
                    followButton.render(container);
                    this.followButtons.set(username, followButton);
                }
            }
        });

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

    initializeRecommendationFollowButtons() {
        const containers = document.querySelectorAll('#recommendations-container .follow-button-container');
        containers.forEach(container => {
            const username = container.dataset.username;
            const user = this.recommendations.find(u => u.username === username);
            
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

    findUserByUsername(username) {
        for (const item of this.feedItems) {
            if (item.user.username === username) {
                return item.user;
            }
        }
        return null;
    }

    findEntityById(entityType, entityId) {
        for (const item of this.feedItems) {
            if (item.entity_type === entityType && item.entity_id == entityId) {
                return item.entity_data;
            }
        }
        return null;
    }

    updateUserFollowStatus(username, data) {
        // Update all instances of this user in the feed
        this.feedItems.forEach(item => {
            if (item.user.username === username) {
                item.user.is_following = data.following;
                item.user.follower_count = data.followerCount;
            }
        });

        // Update recommendations
        this.recommendations.forEach(user => {
            if (user.username === username) {
                user.is_following = data.following;
                user.follower_count = data.followerCount;
            }
        });
    }

    updateEntityLikeStatus(entityType, entityId, data) {
        this.feedItems.forEach(item => {
            if (item.entity_type === entityType && item.entity_id == entityId) {
                item.entity_data.is_liked = data.liked;
                item.entity_data.like_count = data.count;
            }
        });
    }

    setupEventListeners(container) {
        // Load more button (fallback)
        const loadMoreBtn = container.querySelector('#load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.loadFeed());
        }
    }

    setupInfiniteScroll() {
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !this.isLoading && this.hasMore) {
                        this.loadFeed();
                    }
                });
            }, {
                rootMargin: '100px 0px',
                threshold: 0.1
            });

            const scrollTrigger = document.getElementById('scroll-trigger');
            if (scrollTrigger) {
                this.intersectionObserver.observe(scrollTrigger);
            }
        }
    }

    showLoadingIndicator() {
        // Implementation for loading indicator
    }

    hideLoadingIndicator() {
        // Implementation for hiding loading indicator
    }

    showEmptyFeed() {
        const container = document.getElementById('feed-container');
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-rss fa-3x text-muted mb-3"></i>
                <h5>Your feed is empty</h5>
                <p class="text-muted">Follow some people to see their latest updates here!</p>
                <a href="/users/discover" class="btn btn-primary">
                    <i class="fas fa-search me-2"></i>Discover People
                </a>
            </div>
        `;
    }

    showErrorState() {
        const container = document.getElementById('feed-container');
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-exclamation-triangle fa-3x text-muted mb-3"></i>
                <h5>Failed to load feed</h5>
                <p class="text-muted">Please try again later</p>
                <button class="btn btn-outline-primary" onclick="location.reload()">
                    <i class="fas fa-refresh me-2"></i>Retry
                </button>
            </div>
        `;
    }

    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return date.toLocaleDateString();
    }

    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    destroy() {
        // Clean up follow buttons
        this.followButtons.forEach(button => button.destroy());
        this.followButtons.clear();

        // Clean up like buttons
        this.likeButtons.forEach(button => button.destroy());
        this.likeButtons.clear();

        // Clean up intersection observer
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
    }
}
