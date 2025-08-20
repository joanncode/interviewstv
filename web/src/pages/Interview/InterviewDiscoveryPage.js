import API from '../../services/api.js';
import Auth from '../../services/auth.js';

export default class InterviewDiscoveryPage {
    constructor() {
        this.currentUser = Auth.getCurrentUser();
        this.interviews = [];
        this.categories = [];
        this.tags = [];
        this.isLoading = false;
        this.currentPage = 1;
        this.totalPages = 1;
        this.filters = {
            search: '',
            category: '',
            type: '',
            tags: [],
            sort: 'trending',
            dateRange: 'all'
        };
        this.viewMode = 'grid'; // grid or list
    }

    async render(container, props = {}) {
        // Apply any props filters
        if (props.filter) {
            this.filters.sort = props.filter;
        }

        container.innerHTML = this.getHTML();
        this.setupEventListeners(container);
        await this.loadInitialData();
    }

    getHTML() {
        return `
            <div class="interview-discovery-page">
                <div class="container-fluid py-4">
                    <!-- Hero Section -->
                    <div class="hero-section bg-dark text-white rounded mb-4 p-4">
                        <div class="row align-items-center">
                            <div class="col-md-8">
                                <h1 class="display-6 mb-3">Discover Amazing Interviews</h1>
                                <p class="lead mb-4">
                                    Explore thousands of conversations with industry leaders, innovators, and changemakers.
                                </p>
                                <div class="search-bar">
                                    <div class="input-group input-group-lg">
                                        <input type="text" class="form-control" id="main-search" 
                                               placeholder="Search interviews, people, topics..."
                                               value="${this.filters.search}">
                                        <button class="btn btn-primary" id="main-search-btn">
                                            <i class="fas fa-search"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4 text-center">
                                <div class="discovery-stats">
                                    <div class="stat-item mb-2">
                                        <h3 class="mb-0" id="total-interviews">0</h3>
                                        <small>Total Interviews</small>
                                    </div>
                                    <div class="stat-item">
                                        <h3 class="mb-0" id="total-hours">0</h3>
                                        <small>Hours of Content</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Quick Filters -->
                    <div class="quick-filters mb-4">
                        <div class="row">
                            <div class="col-md-8">
                                <div class="filter-chips d-flex flex-wrap gap-2">
                                    <button class="btn btn-sm btn-outline-primary filter-chip ${this.filters.sort === 'trending' ? 'active' : ''}" 
                                            data-filter="sort" data-value="trending">
                                        <i class="fas fa-fire me-1"></i>Trending
                                    </button>
                                    <button class="btn btn-sm btn-outline-primary filter-chip ${this.filters.sort === 'recent' ? 'active' : ''}" 
                                            data-filter="sort" data-value="recent">
                                        <i class="fas fa-clock me-1"></i>Latest
                                    </button>
                                    <button class="btn btn-sm btn-outline-primary filter-chip ${this.filters.sort === 'popular' ? 'active' : ''}" 
                                            data-filter="sort" data-value="popular">
                                        <i class="fas fa-star me-1"></i>Popular
                                    </button>
                                    <button class="btn btn-sm btn-outline-primary filter-chip ${this.filters.type === 'video' ? 'active' : ''}" 
                                            data-filter="type" data-value="video">
                                        <i class="fas fa-video me-1"></i>Video
                                    </button>
                                    <button class="btn btn-sm btn-outline-primary filter-chip ${this.filters.type === 'audio' ? 'active' : ''}" 
                                            data-filter="type" data-value="audio">
                                        <i class="fas fa-microphone me-1"></i>Audio
                                    </button>
                                    <button class="btn btn-sm btn-outline-primary filter-chip ${this.filters.type === 'live' ? 'active' : ''}" 
                                            data-filter="type" data-value="live">
                                        <i class="fas fa-broadcast-tower me-1"></i>Live
                                    </button>
                                </div>
                            </div>
                            <div class="col-md-4 text-end">
                                <div class="view-controls">
                                    <div class="btn-group btn-group-sm" role="group">
                                        <button class="btn btn-outline-secondary ${this.viewMode === 'grid' ? 'active' : ''}" 
                                                id="grid-view-btn">
                                            <i class="fas fa-th"></i>
                                        </button>
                                        <button class="btn btn-outline-secondary ${this.viewMode === 'list' ? 'active' : ''}" 
                                                id="list-view-btn">
                                            <i class="fas fa-list"></i>
                                        </button>
                                    </div>
                                    <button class="btn btn-sm btn-outline-secondary ms-2" id="advanced-filters-btn">
                                        <i class="fas fa-filter me-1"></i>Filters
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Advanced Filters Panel -->
                    <div class="advanced-filters-panel collapse mb-4" id="advanced-filters">
                        <div class="card">
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label for="category-filter" class="form-label small">Category</label>
                                        <select class="form-select form-select-sm" id="category-filter">
                                            <option value="">All Categories</option>
                                            ${this.categories.map(cat => 
                                                `<option value="${cat}" ${this.filters.category === cat ? 'selected' : ''}>${cat}</option>`
                                            ).join('')}
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label for="date-range-filter" class="form-label small">Date Range</label>
                                        <select class="form-select form-select-sm" id="date-range-filter">
                                            <option value="all">All Time</option>
                                            <option value="today">Today</option>
                                            <option value="week">This Week</option>
                                            <option value="month">This Month</option>
                                            <option value="year">This Year</option>
                                        </select>
                                    </div>
                                    <div class="col-md-4">
                                        <label for="tags-filter" class="form-label small">Tags</label>
                                        <input type="text" class="form-control form-control-sm" id="tags-filter" 
                                               placeholder="Enter tags separated by commas"
                                               value="${this.filters.tags.join(', ')}">
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label small">&nbsp;</label>
                                        <div class="d-grid">
                                            <button class="btn btn-primary btn-sm" id="apply-filters-btn">
                                                Apply Filters
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Results Section -->
                    <div class="results-section">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <div class="results-info">
                                <span id="results-count">0 interviews found</span>
                                ${this.filters.search ? `<span class="text-muted"> for "${this.filters.search}"</span>` : ''}
                            </div>
                            <div class="sort-options">
                                <select class="form-select form-select-sm" id="sort-select" style="width: auto;">
                                    <option value="trending" ${this.filters.sort === 'trending' ? 'selected' : ''}>Trending</option>
                                    <option value="recent" ${this.filters.sort === 'recent' ? 'selected' : ''}>Most Recent</option>
                                    <option value="popular" ${this.filters.sort === 'popular' ? 'selected' : ''}>Most Popular</option>
                                    <option value="views" ${this.filters.sort === 'views' ? 'selected' : ''}>Most Viewed</option>
                                    <option value="likes" ${this.filters.sort === 'likes' ? 'selected' : ''}>Most Liked</option>
                                    <option value="duration" ${this.filters.sort === 'duration' ? 'selected' : ''}>Duration</option>
                                </select>
                            </div>
                        </div>

                        <div id="interviews-container">
                            ${this.getInterviewsHTML()}
                        </div>

                        <!-- Pagination -->
                        <div class="d-flex justify-content-center mt-4">
                            ${this.getPaginationHTML()}
                        </div>
                    </div>
                </div>

                <!-- Recommendations Sidebar -->
                ${this.currentUser ? this.getRecommendationsSidebar() : ''}
            </div>
        `;
    }

    getInterviewsHTML() {
        if (this.isLoading) {
            return `
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading interviews...</span>
                    </div>
                </div>
            `;
        }

        if (this.interviews.length === 0) {
            return this.getEmptyStateHTML();
        }

        if (this.viewMode === 'grid') {
            return this.getGridViewHTML();
        } else {
            return this.getListViewHTML();
        }
    }

    getGridViewHTML() {
        return `
            <div class="row g-4">
                ${this.interviews.map(interview => `
                    <div class="col-lg-4 col-md-6">
                        ${this.getInterviewCardHTML(interview)}
                    </div>
                `).join('')}
            </div>
        `;
    }

    getListViewHTML() {
        return `
            <div class="interview-list">
                ${this.interviews.map(interview => this.getInterviewListItemHTML(interview)).join('')}
            </div>
        `;
    }

    getInterviewCardHTML(interview) {
        const duration = interview.duration ? this.formatDuration(interview.duration) : '';
        const createdDate = new Date(interview.created_at).toLocaleDateString();
        
        return `
            <div class="card interview-card h-100 shadow-sm">
                <div class="position-relative">
                    <img src="${interview.thumbnail_url || '/assets/default-thumbnail.jpg'}" 
                         class="card-img-top" 
                         alt="${interview.title}"
                         style="height: 200px; object-fit: cover;"
                         onerror="this.src='/assets/default-thumbnail.jpg'">
                    
                    <div class="position-absolute top-0 end-0 m-2">
                        <span class="badge bg-primary">${interview.type}</span>
                    </div>
                    
                    ${duration ? `
                        <div class="position-absolute bottom-0 end-0 m-2">
                            <span class="badge bg-dark">${duration}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="card-body">
                    <h6 class="card-title">
                        <a href="/interviews/${interview.id}" class="text-decoration-none">
                            ${interview.title}
                        </a>
                    </h6>
                    
                    <p class="card-text text-muted small">
                        ${interview.description ? 
                            (interview.description.length > 100 ? 
                                interview.description.substring(0, 100) + '...' : 
                                interview.description) : 
                            'No description available'}
                    </p>
                    
                    <div class="interview-meta d-flex justify-content-between align-items-center">
                        <div class="interviewer">
                            <img src="${interview.interviewer_avatar || '/assets/default-avatar.png'}" 
                                 alt="${interview.interviewer_name}" 
                                 class="rounded-circle me-2" 
                                 width="24" height="24"
                                 onerror="this.src='/assets/default-avatar.png'">
                            <small class="text-muted">${interview.interviewer_name}</small>
                        </div>
                        <small class="text-muted">${createdDate}</small>
                    </div>
                    
                    <div class="interview-stats mt-2">
                        <div class="d-flex justify-content-between text-muted small">
                            <span>
                                <i class="fas fa-eye me-1"></i>${interview.view_count || 0} views
                            </span>
                            <span>
                                <i class="fas fa-heart me-1"></i>${interview.like_count || 0} likes
                            </span>
                            <span>
                                <i class="fas fa-comment me-1"></i>${interview.comment_count || 0} comments
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getInterviewListItemHTML(interview) {
        const duration = interview.duration ? this.formatDuration(interview.duration) : '';
        const createdDate = new Date(interview.created_at).toLocaleDateString();

        return `
            <div class="card interview-list-item mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-3">
                            <div class="position-relative">
                                <img src="${interview.thumbnail_url || '/assets/default-thumbnail.jpg'}"
                                     alt="${interview.title}"
                                     class="img-fluid rounded"
                                     style="height: 120px; width: 100%; object-fit: cover;"
                                     onerror="this.src='/assets/default-thumbnail.jpg'">

                                <div class="position-absolute top-0 end-0 m-1">
                                    <span class="badge bg-primary">${interview.type}</span>
                                </div>

                                ${duration ? `
                                    <div class="position-absolute bottom-0 end-0 m-1">
                                        <span class="badge bg-dark">${duration}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>

                        <div class="col-md-9">
                            <h6 class="mb-2">
                                <a href="/interviews/${interview.id}" class="text-decoration-none">
                                    ${interview.title}
                                </a>
                            </h6>

                            <p class="text-muted mb-2">
                                ${interview.description ?
                                    (interview.description.length > 200 ?
                                        interview.description.substring(0, 200) + '...' :
                                        interview.description) :
                                    'No description available'}
                            </p>

                            <div class="d-flex justify-content-between align-items-center">
                                <div class="interviewer d-flex align-items-center">
                                    <img src="${interview.interviewer_avatar || '/assets/default-avatar.png'}"
                                         alt="${interview.interviewer_name}"
                                         class="rounded-circle me-2"
                                         width="32" height="32"
                                         onerror="this.src='/assets/default-avatar.png'">
                                    <div>
                                        <div class="fw-medium">${interview.interviewer_name}</div>
                                        <small class="text-muted">${createdDate}</small>
                                    </div>
                                </div>

                                <div class="interview-stats text-muted small">
                                    <span class="me-3">
                                        <i class="fas fa-eye me-1"></i>${interview.view_count || 0}
                                    </span>
                                    <span class="me-3">
                                        <i class="fas fa-heart me-1"></i>${interview.like_count || 0}
                                    </span>
                                    <span>
                                        <i class="fas fa-comment me-1"></i>${interview.comment_count || 0}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getEmptyStateHTML() {
        return `
            <div class="text-center py-5">
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">No interviews found</h5>
                <p class="text-muted">
                    ${this.hasActiveFilters() ?
                        'Try adjusting your search criteria or filters' :
                        'Be the first to create an interview!'}
                </p>
                ${!this.hasActiveFilters() ? `
                    <a href="/interviews/create" class="btn btn-primary">
                        <i class="fas fa-plus me-1"></i>Create Interview
                    </a>
                ` : `
                    <button class="btn btn-outline-primary" id="clear-filters-btn">
                        <i class="fas fa-times me-1"></i>Clear Filters
                    </button>
                `}
            </div>
        `;
    }

    getRecommendationsSidebar() {
        return `
            <div class="recommendations-sidebar position-fixed top-0 end-0 h-100 bg-light border-start p-3"
                 style="width: 300px; z-index: 1000; transform: translateX(100%); transition: transform 0.3s;"
                 id="recommendations-sidebar">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="mb-0">Recommended for You</h6>
                    <button class="btn btn-sm btn-outline-secondary" id="close-recommendations">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div id="recommendations-content">
                    <div class="text-center">
                        <div class="spinner-border spinner-border-sm" role="status"></div>
                        <p class="small text-muted mt-2">Loading recommendations...</p>
                    </div>
                </div>
            </div>
        `;
    }

    getPaginationHTML() {
        if (this.totalPages <= 1) {
            return '';
        }

        return `
            <nav aria-label="Interview pagination">
                <ul class="pagination">
                    <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                        <button class="page-link" data-page="${this.currentPage - 1}" ${this.currentPage === 1 ? 'disabled' : ''}>
                            Previous
                        </button>
                    </li>
                    ${this.getPaginationNumbers()}
                    <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                        <button class="page-link" data-page="${this.currentPage + 1}" ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                            Next
                        </button>
                    </li>
                </ul>
            </nav>
        `;
    }

    getPaginationNumbers() {
        let html = '';
        const start = Math.max(1, this.currentPage - 2);
        const end = Math.min(this.totalPages, this.currentPage + 2);

        for (let i = start; i <= end; i++) {
            html += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <button class="page-link" data-page="${i}">${i}</button>
                </li>
            `;
        }

        return html;
    }

    setupEventListeners(container) {
        // Main search
        const mainSearch = container.querySelector('#main-search');
        const mainSearchBtn = container.querySelector('#main-search-btn');

        mainSearchBtn.addEventListener('click', () => this.handleSearch());
        mainSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });

        // Filter chips
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-chip')) {
                this.handleFilterChip(e.target);
            }
        });

        // View mode toggles
        const gridViewBtn = container.querySelector('#grid-view-btn');
        const listViewBtn = container.querySelector('#list-view-btn');

        gridViewBtn.addEventListener('click', () => this.setViewMode('grid'));
        listViewBtn.addEventListener('click', () => this.setViewMode('list'));

        // Advanced filters
        const advancedFiltersBtn = container.querySelector('#advanced-filters-btn');
        const applyFiltersBtn = container.querySelector('#apply-filters-btn');

        advancedFiltersBtn.addEventListener('click', () => this.toggleAdvancedFilters());
        applyFiltersBtn.addEventListener('click', () => this.applyAdvancedFilters());

        // Sort change
        const sortSelect = container.querySelector('#sort-select');
        sortSelect.addEventListener('change', () => this.handleSortChange());

        // Pagination
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('page-link') && e.target.dataset.page) {
                const page = parseInt(e.target.dataset.page);
                if (page !== this.currentPage) {
                    this.currentPage = page;
                    this.loadInterviews();
                }
            }
        });

        // Clear filters
        container.addEventListener('click', (e) => {
            if (e.target.id === 'clear-filters-btn') {
                this.clearFilters();
            }
        });
    }

    async loadInitialData() {
        try {
            // Load categories and tags
            await Promise.all([
                this.loadCategories(),
                this.loadTags(),
                this.loadInterviews(),
                this.loadStats()
            ]);
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }

    async loadCategories() {
        try {
            const response = await API.get('/api/search/categories', { type: 'interview' });
            if (response.success) {
                this.categories = response.data;
            }
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    }

    async loadTags() {
        try {
            const response = await API.get('/api/search/tags');
            if (response.success) {
                this.tags = response.data;
            }
        } catch (error) {
            console.error('Failed to load tags:', error);
        }
    }

    async loadStats() {
        try {
            const response = await API.get('/api/interviews/stats');
            if (response.success) {
                document.getElementById('total-interviews').textContent = response.data.total_interviews || 0;
                document.getElementById('total-hours').textContent = Math.round((response.data.total_duration || 0) / 3600);
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }

    async loadInterviews() {
        try {
            this.isLoading = true;
            this.updateInterviewsContainer();

            const params = {
                page: this.currentPage,
                limit: 20,
                sort: this.filters.sort
            };

            // Add filters
            if (this.filters.search) params.q = this.filters.search;
            if (this.filters.category) params.category = this.filters.category;
            if (this.filters.type) params.type = this.filters.type;
            if (this.filters.tags.length > 0) params.tags = this.filters.tags.join(',');
            if (this.filters.dateRange !== 'all') params.date_range = this.filters.dateRange;

            const response = await API.get('/api/search/interviews', params);

            if (response.success) {
                this.interviews = response.data.items || [];
                this.totalPages = Math.ceil((response.data.total || 0) / 20);
                this.updateInterviewsContainer();
                this.updateResultsCount(response.data.total || 0);
            }
        } catch (error) {
            console.error('Failed to load interviews:', error);
        } finally {
            this.isLoading = false;
        }
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:00`;
        } else {
            return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
        }
    }

    hasActiveFilters() {
        return this.filters.search ||
               this.filters.category ||
               this.filters.type ||
               this.filters.tags.length > 0 ||
               this.filters.dateRange !== 'all';
    }

    handleSearch() {
        this.filters.search = document.getElementById('main-search').value.trim();
        this.currentPage = 1;
        this.loadInterviews();
    }

    handleFilterChip(chip) {
        const filter = chip.dataset.filter;
        const value = chip.dataset.value;

        // Toggle filter
        if (this.filters[filter] === value) {
            this.filters[filter] = '';
        } else {
            this.filters[filter] = value;
        }

        // Update UI
        this.updateFilterChips();
        this.currentPage = 1;
        this.loadInterviews();
    }

    setViewMode(mode) {
        this.viewMode = mode;
        this.updateViewModeButtons();
        this.updateInterviewsContainer();
    }

    toggleAdvancedFilters() {
        const panel = document.getElementById('advanced-filters');
        const collapse = new bootstrap.Collapse(panel);
        collapse.toggle();
    }

    applyAdvancedFilters() {
        this.filters.category = document.getElementById('category-filter').value;
        this.filters.dateRange = document.getElementById('date-range-filter').value;
        this.filters.tags = document.getElementById('tags-filter').value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);

        this.currentPage = 1;
        this.loadInterviews();
    }

    handleSortChange() {
        this.filters.sort = document.getElementById('sort-select').value;
        this.loadInterviews();
    }

    clearFilters() {
        this.filters = {
            search: '',
            category: '',
            type: '',
            tags: [],
            sort: 'trending',
            dateRange: 'all'
        };

        // Update UI
        document.getElementById('main-search').value = '';
        this.updateFilterChips();
        this.currentPage = 1;
        this.loadInterviews();
    }

    updateFilterChips() {
        document.querySelectorAll('.filter-chip').forEach(chip => {
            const filter = chip.dataset.filter;
            const value = chip.dataset.value;
            chip.classList.toggle('active', this.filters[filter] === value);
        });
    }

    updateViewModeButtons() {
        document.getElementById('grid-view-btn').classList.toggle('active', this.viewMode === 'grid');
        document.getElementById('list-view-btn').classList.toggle('active', this.viewMode === 'list');
    }

    updateInterviewsContainer() {
        const container = document.getElementById('interviews-container');
        if (container) {
            container.innerHTML = this.getInterviewsHTML();
        }
    }

    updateResultsCount(total) {
        const countEl = document.getElementById('results-count');
        if (countEl) {
            countEl.textContent = `${total} interview${total !== 1 ? 's' : ''} found`;
        }
    }
}
