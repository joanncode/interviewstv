import API from '../../services/api.js';
import Auth from '../../services/auth.js';
import SearchBox from '../../components/SearchBox.js';
import { ajaxService } from '../../services/ajax.js';

export default class InterviewsPageEnhanced {
    constructor() {
        this.currentUser = Auth.getCurrentUser();
        this.interviews = [];
        this.currentPage = 1;
        this.hasMore = true;
        this.isLoading = false;
        this.currentFilters = {
            search: '',
            type: '',
            category: '',
            sort: 'newest'
        };
        this.searchBox = null;
        this.infiniteScroll = null;
        this.lazyLoader = null;
        this.searchDebouncer = null;
    }

    async render(container) {
        container.innerHTML = this.getHTML();
        this.setupEventListeners(container);
        this.initializeSearchBox(container);
        this.initializeInfiniteScroll(container);
        this.initializeLazyLoading();
        
        await this.loadInitialInterviews();
    }

    getHTML() {
        return `
            <div class="interviews-page-enhanced">
                <div class="container py-4">
                    <!-- Header Section -->
                    <div class="row mb-4">
                        <div class="col-lg-8">
                            <h1 class="display-5 fw-bold mb-3">Interviews</h1>
                            <p class="lead text-muted">
                                Discover inspiring conversations and stories from our community
                            </p>
                        </div>
                        <div class="col-lg-4 text-lg-end">
                            ${this.currentUser ? `
                                <a href="/interviews/create" class="btn btn-primary">
                                    <i class="fas fa-plus me-2"></i>Create Interview
                                </a>
                            ` : `
                                <a href="/login" class="btn btn-outline-primary">
                                    <i class="fas fa-sign-in-alt me-2"></i>Login to Create
                                </a>
                            `}
                        </div>
                    </div>

                    <!-- Search and Filters -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <!-- Search Box -->
                            <div class="row mb-3">
                                <div class="col-lg-8">
                                    <div id="interviews-search-box"></div>
                                </div>
                                <div class="col-lg-4">
                                    <select class="form-select" id="sort-select">
                                        <option value="newest">Newest First</option>
                                        <option value="oldest">Oldest First</option>
                                        <option value="popular">Most Popular</option>
                                        <option value="trending">Trending</option>
                                        <option value="title">Title A-Z</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Filters -->
                            <div class="row g-3">
                                <div class="col-md-4">
                                    <select class="form-select" id="type-filter">
                                        <option value="">All Types</option>
                                        <option value="video">Video</option>
                                        <option value="audio">Audio</option>
                                        <option value="text">Text</option>
                                        <option value="live">Live</option>
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <select class="form-select" id="category-filter">
                                        <option value="">All Categories</option>
                                        <option value="business">Business</option>
                                        <option value="technology">Technology</option>
                                        <option value="lifestyle">Lifestyle</option>
                                        <option value="education">Education</option>
                                        <option value="entertainment">Entertainment</option>
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <button class="btn btn-outline-secondary w-100" id="clear-filters-btn">
                                        <i class="fas fa-times me-2"></i>Clear Filters
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Results Section -->
                    <div class="row">
                        <!-- Main Content -->
                        <div class="col-lg-9">
                            <!-- Results Header -->
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <div id="results-info">
                                    <span class="text-muted">Loading interviews...</span>
                                </div>
                                <div class="view-toggle btn-group btn-group-sm" role="group">
                                    <button type="button" class="btn btn-outline-secondary active" data-view="grid">
                                        <i class="fas fa-th"></i>
                                    </button>
                                    <button type="button" class="btn btn-outline-secondary" data-view="list">
                                        <i class="fas fa-list"></i>
                                    </button>
                                </div>
                            </div>

                            <!-- Interviews Grid -->
                            <div id="interviews-grid" class="interviews-grid row g-4">
                                <!-- Initial loading state -->
                                <div class="col-12 text-center py-5" id="initial-loading">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Loading interviews...</span>
                                    </div>
                                    <div class="mt-2 text-muted">Loading interviews...</div>
                                </div>
                            </div>

                            <!-- Infinite scroll will add loading indicator here -->
                        </div>

                        <!-- Sidebar -->
                        <div class="col-lg-3">
                            <!-- Featured Interviews -->
                            <div class="card mb-4">
                                <div class="card-header">
                                    <h6 class="mb-0">
                                        <i class="fas fa-star text-warning me-2"></i>Featured
                                    </h6>
                                </div>
                                <div class="card-body" id="featured-interviews">
                                    <div class="text-center py-3">
                                        <div class="spinner-border spinner-border-sm text-primary" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Trending Topics -->
                            <div class="card mb-4">
                                <div class="card-header">
                                    <h6 class="mb-0">
                                        <i class="fas fa-fire text-danger me-2"></i>Trending Topics
                                    </h6>
                                </div>
                                <div class="card-body" id="trending-topics">
                                    <div class="text-center py-3">
                                        <div class="spinner-border spinner-border-sm text-primary" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Quick Actions -->
                            <div class="card">
                                <div class="card-header">
                                    <h6 class="mb-0">
                                        <i class="fas fa-bolt text-primary me-2"></i>Quick Actions
                                    </h6>
                                </div>
                                <div class="card-body">
                                    <div class="d-grid gap-2">
                                        ${this.currentUser ? `
                                            <a href="/interviews/create" class="btn btn-primary btn-sm">
                                                <i class="fas fa-plus me-2"></i>Create Interview
                                            </a>
                                            <a href="/interviews/my" class="btn btn-outline-primary btn-sm">
                                                <i class="fas fa-video me-2"></i>My Interviews
                                            </a>
                                        ` : `
                                            <a href="/login" class="btn btn-primary btn-sm">
                                                <i class="fas fa-sign-in-alt me-2"></i>Login
                                            </a>
                                            <a href="/register" class="btn btn-outline-primary btn-sm">
                                                <i class="fas fa-user-plus me-2"></i>Sign Up
                                            </a>
                                        `}
                                        <a href="/events" class="btn btn-outline-secondary btn-sm">
                                            <i class="fas fa-calendar me-2"></i>Browse Events
                                        </a>
                                        <a href="/business" class="btn btn-outline-secondary btn-sm">
                                            <i class="fas fa-building me-2"></i>Browse Businesses
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

    async loadInitialInterviews() {
        try {
            this.isLoading = true;
            this.currentPage = 1;
            this.interviews = [];
            
            const response = await this.fetchInterviews(1);
            
            if (response.success) {
                this.interviews = response.data.interviews;
                this.hasMore = response.data.page < response.data.pages;
                
                this.renderInterviews(true); // Clear existing content
                this.updateResultsInfo(response.data.total);
                
                // Remove initial loading state
                const initialLoading = document.getElementById('initial-loading');
                if (initialLoading) {
                    initialLoading.remove();
                }
            } else {
                this.showErrorState('Failed to load interviews');
            }
            
        } catch (error) {
            console.error('Failed to load initial interviews:', error);
            this.showErrorState('Failed to load interviews');
        } finally {
            this.isLoading = false;
        }
    }

    async loadMoreInterviews() {
        if (this.isLoading || !this.hasMore) {
            return { hasMore: false };
        }

        try {
            this.isLoading = true;
            this.currentPage++;
            
            const response = await this.fetchInterviews(this.currentPage);
            
            if (response.success) {
                const newInterviews = response.data.interviews;
                this.interviews.push(...newInterviews);
                this.hasMore = response.data.page < response.data.pages;
                
                this.renderNewInterviews(newInterviews);
                this.updateResultsInfo(response.data.total);
                
                return { hasMore: this.hasMore };
            } else {
                throw new Error(response.message || 'Failed to load more interviews');
            }
            
        } catch (error) {
            console.error('Failed to load more interviews:', error);
            this.currentPage--; // Revert page increment
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    async fetchInterviews(page) {
        const params = {
            page,
            limit: 12,
            ...this.currentFilters
        };

        // Remove empty filters
        Object.keys(params).forEach(key => {
            if (params[key] === '') {
                delete params[key];
            }
        });

        return await API.get('/api/interviews', params);
    }

    renderInterviews(clearExisting = false) {
        const container = document.getElementById('interviews-grid');
        const viewMode = document.querySelector('.view-toggle .active').dataset.view;
        
        if (clearExisting) {
            container.innerHTML = '';
            container.className = viewMode === 'grid' ? 'interviews-grid row g-4' : 'interviews-list';
        }

        if (this.interviews.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-video fa-3x text-muted mb-3"></i>
                    <h5>No interviews found</h5>
                    <p class="text-muted">Try adjusting your search criteria</p>
                    ${this.currentUser ? `
                        <a href="/interviews/create" class="btn btn-primary">
                            <i class="fas fa-plus me-2"></i>Create the First Interview
                        </a>
                    ` : ''}
                </div>
            `;
            return;
        }

        this.interviews.forEach(interview => {
            const element = this.createInterviewElement(interview, viewMode);
            container.appendChild(element);
        });

        // Initialize lazy loading for new images
        this.initializeLazyLoading();
    }

    renderNewInterviews(newInterviews) {
        const container = document.getElementById('interviews-grid');
        const viewMode = document.querySelector('.view-toggle .active').dataset.view;
        
        newInterviews.forEach(interview => {
            const element = this.createInterviewElement(interview, viewMode);
            container.appendChild(element);
            
            // Animate in the new element
            ajaxService.animateIn(element);
        });

        // Initialize lazy loading for new images
        this.initializeLazyLoading();
    }

    createInterviewElement(interview, viewMode) {
        const element = document.createElement('div');
        
        if (viewMode === 'grid') {
            element.className = 'col-md-6 col-lg-4';
            element.innerHTML = this.getInterviewCardHTML(interview);
        } else {
            element.className = 'interview-list-item';
            element.innerHTML = this.getInterviewListItemHTML(interview);
        }
        
        return element;
    }

    getInterviewCardHTML(interview) {
        return `
            <div class="interview-card card h-100">
                <div class="position-relative">
                    ${interview.thumbnail_url ? `
                        <img data-lazy="${interview.thumbnail_url}" 
                             class="card-img-top" 
                             style="height: 200px; object-fit: cover;"
                             alt="${interview.title}">
                    ` : `
                        <div class="card-img-top d-flex align-items-center justify-content-center bg-light" 
                             style="height: 200px;">
                            <i class="fas fa-video fa-3x text-muted"></i>
                        </div>
                    `}
                    
                    <div class="position-absolute top-0 end-0 m-2">
                        <span class="badge bg-${this.getTypeColor(interview.type)}">
                            ${interview.type.toUpperCase()}
                        </span>
                    </div>
                    
                    ${interview.duration ? `
                        <div class="position-absolute bottom-0 end-0 m-2">
                            <span class="badge bg-dark bg-opacity-75">
                                ${this.formatDuration(interview.duration)}
                            </span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="card-body">
                    <h6 class="card-title">
                        <a href="/interviews/${interview.id}" class="text-decoration-none">
                            ${interview.title}
                        </a>
                    </h6>
                    
                    <p class="card-text small text-muted">
                        ${interview.description ? interview.description.substring(0, 100) + '...' : 'No description available'}
                    </p>
                    
                    <div class="interview-meta small">
                        <div class="mb-1">
                            <i class="fas fa-user text-muted me-1"></i>
                            <a href="/profile/${interview.username}" class="text-decoration-none">
                                @${interview.username}
                            </a>
                        </div>
                        
                        <div class="mb-1">
                            <i class="fas fa-calendar text-muted me-1"></i>
                            ${this.formatDate(interview.created_at)}
                        </div>
                    </div>
                    
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <div class="interview-stats">
                            <small class="text-muted">
                                <i class="fas fa-eye me-1"></i>${interview.view_count || 0}
                                <i class="fas fa-heart ms-2 me-1"></i>${interview.like_count || 0}
                            </small>
                        </div>
                        <a href="/interviews/${interview.id}" class="btn btn-sm btn-outline-primary">
                            Watch
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    getInterviewListItemHTML(interview) {
        return `
            <div class="card mb-3">
                <div class="row g-0">
                    <div class="col-md-3">
                        ${interview.thumbnail_url ? `
                            <img data-lazy="${interview.thumbnail_url}" 
                                 class="img-fluid rounded-start h-100" 
                                 style="object-fit: cover; min-height: 150px;"
                                 alt="${interview.title}">
                        ` : `
                            <div class="d-flex align-items-center justify-content-center bg-light rounded-start h-100" 
                                 style="min-height: 150px;">
                                <i class="fas fa-video fa-2x text-muted"></i>
                            </div>
                        `}
                    </div>
                    <div class="col-md-9">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h5 class="card-title">
                                    <a href="/interviews/${interview.id}" class="text-decoration-none">
                                        ${interview.title}
                                    </a>
                                </h5>
                                <span class="badge bg-${this.getTypeColor(interview.type)}">
                                    ${interview.type.toUpperCase()}
                                </span>
                            </div>
                            
                            <p class="card-text">
                                ${interview.description || 'No description available'}
                            </p>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="interview-meta small">
                                        <div class="mb-1">
                                            <i class="fas fa-user text-muted me-1"></i>
                                            <a href="/profile/${interview.username}" class="text-decoration-none">
                                                @${interview.username}
                                            </a>
                                        </div>
                                        
                                        <div class="mb-1">
                                            <i class="fas fa-calendar text-muted me-1"></i>
                                            ${this.formatDate(interview.created_at)}
                                        </div>
                                        
                                        ${interview.duration ? `
                                            <div class="mb-1">
                                                <i class="fas fa-clock text-muted me-1"></i>
                                                ${this.formatDuration(interview.duration)}
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="interview-stats">
                                        <div class="mb-1">
                                            <small class="text-muted">
                                                <i class="fas fa-eye me-1"></i>${interview.view_count || 0} views
                                            </small>
                                        </div>
                                        <div class="mb-1">
                                            <small class="text-muted">
                                                <i class="fas fa-heart me-1"></i>${interview.like_count || 0} likes
                                            </small>
                                        </div>
                                        <div class="mb-1">
                                            <small class="text-muted">
                                                <i class="fas fa-comments me-1"></i>${interview.comment_count || 0} comments
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="mt-3">
                                <a href="/interviews/${interview.id}" class="btn btn-primary btn-sm">
                                    Watch Interview
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    initializeSearchBox(container) {
        const searchContainer = container.querySelector('#interviews-search-box');
        if (searchContainer) {
            this.searchBox = new SearchBox(searchContainer, {
                placeholder: 'Search interviews by title, description, or creator...',
                showSuggestions: true,
                showFilters: false,
                onSearch: (query) => {
                    this.currentFilters.search = query;
                    this.resetAndReload();
                }
            });
            this.searchBox.render();
        }
    }

    initializeInfiniteScroll(container) {
        const gridContainer = container.querySelector('#interviews-grid');
        
        this.infiniteScroll = ajaxService.initInfiniteScroll(gridContainer, {
            loadMore: () => this.loadMoreInterviews(),
            hasMore: this.hasMore,
            threshold: 0.1,
            rootMargin: '100px'
        });
    }

    initializeLazyLoading() {
        if (this.lazyLoader) {
            this.lazyLoader.destroy();
        }
        
        this.lazyLoader = ajaxService.initLazyLoading('[data-lazy]', {
            threshold: 0.1,
            rootMargin: '50px',
            fadeIn: true
        });
    }

    setupEventListeners(container) {
        // Sort change
        const sortSelect = container.querySelector('#sort-select');
        sortSelect.addEventListener('change', (e) => {
            this.currentFilters.sort = e.target.value;
            this.resetAndReload();
        });

        // Filter changes
        const typeFilter = container.querySelector('#type-filter');
        const categoryFilter = container.querySelector('#category-filter');
        
        [typeFilter, categoryFilter].forEach((filter, index) => {
            filter.addEventListener('change', (e) => {
                const filterKey = index === 0 ? 'type' : 'category';
                this.currentFilters[filterKey] = e.target.value;
                this.resetAndReload();
            });
        });

        // Clear filters
        const clearFiltersBtn = container.querySelector('#clear-filters-btn');
        clearFiltersBtn.addEventListener('click', () => {
            this.clearFilters();
        });

        // View toggle
        const viewToggle = container.querySelectorAll('.view-toggle button');
        viewToggle.forEach(button => {
            button.addEventListener('click', (e) => {
                viewToggle.forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                this.renderInterviews(true);
            });
        });

        // Load sidebar content
        this.loadSidebarContent();
    }

    async resetAndReload() {
        this.currentPage = 1;
        this.hasMore = true;
        this.interviews = [];
        
        // Update infinite scroll config
        if (this.infiniteScroll) {
            this.infiniteScroll.updateConfig({ hasMore: true });
        }
        
        await this.loadInitialInterviews();
    }

    clearFilters() {
        this.currentFilters = {
            search: '',
            type: '',
            category: '',
            sort: 'newest'
        };
        
        // Reset form elements
        document.getElementById('sort-select').value = 'newest';
        document.getElementById('type-filter').value = '';
        document.getElementById('category-filter').value = '';
        
        // Clear search box
        if (this.searchBox) {
            this.searchBox.clear();
        }
        
        this.resetAndReload();
    }

    async loadSidebarContent() {
        try {
            // Load featured interviews
            const featuredResponse = await API.get('/api/interviews/featured', { limit: 3 });
            if (featuredResponse.success) {
                this.renderFeaturedInterviews(featuredResponse.data);
            }
            
            // Load trending topics
            const trendingResponse = await API.get('/api/search/trending');
            if (trendingResponse.success) {
                this.renderTrendingTopics(trendingResponse.data);
            }
            
        } catch (error) {
            console.error('Failed to load sidebar content:', error);
        }
    }

    renderFeaturedInterviews(interviews) {
        const container = document.getElementById('featured-interviews');
        
        if (interviews.length === 0) {
            container.innerHTML = `
                <div class="text-center py-3">
                    <i class="fas fa-star fa-2x text-muted mb-2"></i>
                    <p class="text-muted small mb-0">No featured content</p>
                </div>
            `;
            return;
        }

        container.innerHTML = interviews.map(interview => `
            <div class="featured-interview-item d-flex align-items-center mb-3">
                <div class="flex-shrink-0 me-3">
                    ${interview.thumbnail_url ? `
                        <img data-lazy="${interview.thumbnail_url}" 
                             class="rounded" 
                             width="50" height="50" 
                             style="object-fit: cover;"
                             alt="${interview.title}">
                    ` : `
                        <div class="bg-light rounded d-flex align-items-center justify-content-center" 
                             style="width: 50px; height: 50px;">
                            <i class="fas fa-video text-muted"></i>
                        </div>
                    `}
                </div>
                
                <div class="flex-grow-1">
                    <h6 class="mb-1 small">
                        <a href="/interviews/${interview.id}" class="text-decoration-none">
                            ${interview.title}
                        </a>
                    </h6>
                    <small class="text-muted">
                        by @${interview.username} • ${interview.view_count || 0} views
                    </small>
                </div>
            </div>
        `).join('');

        // Initialize lazy loading for featured images
        this.initializeLazyLoading();
    }

    renderTrendingTopics(topics) {
        const container = document.getElementById('trending-topics');
        
        if (topics.length === 0) {
            container.innerHTML = `
                <div class="text-center py-3">
                    <i class="fas fa-fire fa-2x text-muted mb-2"></i>
                    <p class="text-muted small mb-0">No trending topics</p>
                </div>
            `;
            return;
        }

        container.innerHTML = topics.slice(0, 5).map(topic => `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="small">
                    <i class="fas fa-hashtag text-muted me-1"></i>
                    <a href="/search?q=${encodeURIComponent(topic.term)}" class="text-decoration-none">
                        ${topic.term}
                    </a>
                </span>
                <span class="badge bg-light text-dark">${topic.count}</span>
            </div>
        `).join('');
    }

    updateResultsInfo(total) {
        const container = document.getElementById('results-info');
        const displayedCount = this.interviews.length;
        
        container.innerHTML = `
            <span class="text-muted">
                Showing ${displayedCount} of ${total} interviews
                ${this.hasMore ? ' (scroll for more)' : ''}
            </span>
        `;
    }

    getTypeColor(type) {
        const colors = {
            'video': 'primary',
            'audio': 'success',
            'text': 'info',
            'live': 'danger'
        };
        return colors[type] || 'secondary';
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    showErrorState(message) {
        const container = document.getElementById('interviews-grid');
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-exclamation-triangle fa-3x text-muted mb-3"></i>
                <h5>Error Loading Interviews</h5>
                <p class="text-muted">${message}</p>
                <button class="btn btn-outline-primary" onclick="location.reload()">
                    <i class="fas fa-refresh me-2"></i>Try Again
                </button>
            </div>
        `;
    }

    destroy() {
        if (this.searchBox) {
            this.searchBox.destroy();
        }
        
        if (this.infiniteScroll) {
            this.infiniteScroll.destroy();
        }
        
        if (this.lazyLoader) {
            this.lazyLoader.destroy();
        }
        
        if (this.searchDebouncer) {
            this.searchDebouncer.destroy();
        }
    }
}
