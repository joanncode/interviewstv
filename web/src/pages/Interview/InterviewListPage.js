import Auth from '../../services/auth.js';
import API from '../../services/api.js';
import Router from '../../utils/router.js';

class InterviewListPage {
    constructor() {
        this.interviews = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.isLoading = false;
        this.filters = {
            search: '',
            category: '',
            type: '',
            sort: 'recent'
        };
    }

    async render(container, props = {}) {
        // Apply any props filters
        if (props.filter) {
            this.filters.sort = props.filter;
        }

        container.innerHTML = this.getHTML();
        this.setupEventListeners(container);
        await this.loadInterviews();
    }

    getHTML() {
        return `
            <div class="interview-list-page">
                ${this.getHeaderSection()}
                ${this.getFiltersSection()}
                ${this.getInterviewsSection()}
            </div>
        `;
    }

    getHeaderSection() {
        const currentUser = Auth.getCurrentUser();
        
        return `
            <div class="container py-4">
                <div class="row align-items-center mb-4">
                    <div class="col-md-8">
                        <h1 class="mb-2">Interviews</h1>
                        <p class="text-muted mb-0">Discover amazing conversations and stories</p>
                    </div>
                    <div class="col-md-4 text-md-end">
                        ${currentUser && Auth.canCreateInterview() ? `
                            <a href="/interviews/create" class="btn btn-primary">
                                <i class="fas fa-plus me-2"></i>Create Interview
                            </a>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    getFiltersSection() {
        return `
            <div class="bg-light py-3 mb-4">
                <div class="container">
                    <div class="row g-3">
                        <div class="col-md-3">
                            <input type="text" 
                                   class="form-control" 
                                   id="search-input" 
                                   placeholder="Search interviews..."
                                   value="${this.filters.search}">
                        </div>
                        <div class="col-md-2">
                            <select class="form-select" id="category-filter">
                                <option value="">All Categories</option>
                                <option value="music" ${this.filters.category === 'music' ? 'selected' : ''}>Music</option>
                                <option value="business" ${this.filters.category === 'business' ? 'selected' : ''}>Business</option>
                                <option value="politics" ${this.filters.category === 'politics' ? 'selected' : ''}>Politics</option>
                                <option value="sports" ${this.filters.category === 'sports' ? 'selected' : ''}>Sports</option>
                                <option value="technology" ${this.filters.category === 'technology' ? 'selected' : ''}>Technology</option>
                                <option value="entertainment" ${this.filters.category === 'entertainment' ? 'selected' : ''}>Entertainment</option>
                                <option value="lifestyle" ${this.filters.category === 'lifestyle' ? 'selected' : ''}>Lifestyle</option>
                            </select>
                        </div>
                        <div class="col-md-2">
                            <select class="form-select" id="type-filter">
                                <option value="">All Types</option>
                                <option value="video" ${this.filters.type === 'video' ? 'selected' : ''}>Video</option>
                                <option value="audio" ${this.filters.type === 'audio' ? 'selected' : ''}>Audio</option>
                                <option value="text" ${this.filters.type === 'text' ? 'selected' : ''}>Text</option>
                            </select>
                        </div>
                        <div class="col-md-2">
                            <select class="form-select" id="sort-filter">
                                <option value="recent" ${this.filters.sort === 'recent' ? 'selected' : ''}>Most Recent</option>
                                <option value="popular" ${this.filters.sort === 'popular' ? 'selected' : ''}>Most Popular</option>
                                <option value="trending" ${this.filters.sort === 'trending' ? 'selected' : ''}>Trending</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <div class="d-flex gap-2">
                                <button class="btn btn-outline-primary" id="apply-filters">
                                    <i class="fas fa-search me-2"></i>Search
                                </button>
                                <button class="btn btn-outline-secondary" id="clear-filters">
                                    <i class="fas fa-times me-2"></i>Clear
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getInterviewsSection() {
        return `
            <div class="container">
                <div id="interviews-container">
                    <div class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading interviews...</span>
                        </div>
                        <p class="mt-3">Loading interviews...</p>
                    </div>
                </div>
                
                <div id="pagination-container" class="mt-4"></div>
            </div>
        `;
    }

    setupEventListeners(container) {
        // Search input
        const searchInput = container.querySelector('#search-input');
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.applyFilters();
            }
        });

        // Filter buttons
        const applyBtn = container.querySelector('#apply-filters');
        const clearBtn = container.querySelector('#clear-filters');
        
        applyBtn.addEventListener('click', () => this.applyFilters());
        clearBtn.addEventListener('click', () => this.clearFilters());

        // Filter change events
        const filterElements = container.querySelectorAll('#category-filter, #type-filter, #sort-filter');
        filterElements.forEach(element => {
            element.addEventListener('change', () => this.applyFilters());
        });
    }

    async loadInterviews(page = 1) {
        if (this.isLoading) return;

        try {
            this.isLoading = true;
            this.currentPage = page;

            const params = {
                page: page,
                limit: 20,
                ...this.filters
            };

            // Remove empty filters
            Object.keys(params).forEach(key => {
                if (params[key] === '' || params[key] === null) {
                    delete params[key];
                }
            });

            const response = await API.get('/api/interviews', params);

            if (response.success) {
                this.interviews = response.data.items;
                this.totalPages = response.data.pagination.total_pages;
                this.renderInterviews();
                this.renderPagination();
            } else {
                this.renderError('Failed to load interviews');
            }

        } catch (error) {
            console.error('Failed to load interviews:', error);
            this.renderError('Failed to load interviews');
        } finally {
            this.isLoading = false;
        }
    }

    renderInterviews() {
        const container = document.getElementById('interviews-container');

        if (this.interviews.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-video fa-3x text-muted mb-3"></i>
                    <h4>No interviews found</h4>
                    <p class="text-muted">Try adjusting your search criteria or create the first interview!</p>
                    ${Auth.canCreateInterview() ? `
                        <a href="/interviews/create" class="btn btn-primary mt-3">
                            <i class="fas fa-plus me-2"></i>Create Interview
                        </a>
                    ` : ''}
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="row g-4">
                ${this.interviews.map(interview => this.getInterviewCard(interview)).join('')}
            </div>
        `;
    }

    getInterviewCard(interview) {
        const typeIcon = {
            'video': 'fa-video',
            'audio': 'fa-microphone',
            'text': 'fa-file-text'
        };

        const duration = interview.duration ? this.formatDuration(interview.duration) : '';
        
        return `
            <div class="col-md-6 col-lg-4">
                <div class="card interview-card h-100">
                    <div class="position-relative">
                        <img src="${interview.thumbnail_url || '/assets/default-interview.jpg'}" 
                             class="card-img-top" 
                             alt="${interview.title}"
                             style="height: 200px; object-fit: cover;"
                             onerror="this.src='/assets/default-interview.jpg'">
                        <div class="position-absolute top-0 start-0 m-2">
                            <span class="badge bg-primary">
                                <i class="fas ${typeIcon[interview.type]} me-1"></i>
                                ${interview.type.charAt(0).toUpperCase() + interview.type.slice(1)}
                            </span>
                        </div>
                        ${duration ? `
                            <div class="position-absolute bottom-0 end-0 m-2">
                                <span class="badge bg-dark">${duration}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">
                            <a href="/interviews/${interview.id}" class="text-decoration-none">
                                ${interview.title}
                            </a>
                        </h5>
                        
                        <p class="card-text text-muted small flex-grow-1">
                            ${interview.description ? interview.description.substring(0, 100) + '...' : ''}
                        </p>
                        
                        <div class="d-flex align-items-center mb-2">
                            <img src="${interview.interviewer.avatar_url || '/assets/default-avatar.png'}" 
                                 class="rounded-circle me-2" 
                                 width="24" height="24"
                                 alt="${interview.interviewer.username}">
                            <small class="text-muted">
                                by <a href="/profile/${interview.interviewer.username}" class="text-decoration-none">
                                    ${interview.interviewer.username}
                                </a>
                            </small>
                        </div>
                        
                        <div class="d-flex align-items-center justify-content-between">
                            <div class="d-flex gap-3">
                                <small class="text-muted">
                                    <i class="fas fa-eye me-1"></i>${interview.view_count || 0}
                                </small>
                                <small class="text-muted">
                                    <i class="fas fa-heart me-1"></i>${interview.like_count || 0}
                                </small>
                            </div>
                            <small class="text-muted">
                                ${new Date(interview.published_at || interview.created_at).toLocaleDateString()}
                            </small>
                        </div>
                        
                        ${interview.category ? `
                            <div class="mt-2">
                                <span class="badge bg-light text-dark">${interview.category}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderPagination() {
        const container = document.getElementById('pagination-container');

        if (this.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        const pagination = [];
        const maxVisible = 5;
        const start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        const end = Math.min(this.totalPages, start + maxVisible - 1);

        // Previous button
        pagination.push(`
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage - 1}">Previous</a>
            </li>
        `);

        // Page numbers
        for (let i = start; i <= end; i++) {
            pagination.push(`
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `);
        }

        // Next button
        pagination.push(`
            <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage + 1}">Next</a>
            </li>
        `);

        container.innerHTML = `
            <nav aria-label="Interview pagination">
                <ul class="pagination justify-content-center">
                    ${pagination.join('')}
                </ul>
            </nav>
        `;

        // Add click handlers
        container.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.target.getAttribute('data-page'));
                if (page && page !== this.currentPage) {
                    this.loadInterviews(page);
                }
            });
        });
    }

    renderError(message) {
        const container = document.getElementById('interviews-container');
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                <h4>Error</h4>
                <p class="text-muted">${message}</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    <i class="fas fa-refresh me-2"></i>Try Again
                </button>
            </div>
        `;
    }

    applyFilters() {
        // Get current filter values
        this.filters.search = document.getElementById('search-input').value.trim();
        this.filters.category = document.getElementById('category-filter').value;
        this.filters.type = document.getElementById('type-filter').value;
        this.filters.sort = document.getElementById('sort-filter').value;

        // Reset to first page and load
        this.loadInterviews(1);
    }

    clearFilters() {
        // Reset filters
        this.filters = {
            search: '',
            category: '',
            type: '',
            sort: 'recent'
        };

        // Update UI
        document.getElementById('search-input').value = '';
        document.getElementById('category-filter').value = '';
        document.getElementById('type-filter').value = '';
        document.getElementById('sort-filter').value = 'recent';

        // Reload interviews
        this.loadInterviews(1);
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }
}

export default InterviewListPage;
