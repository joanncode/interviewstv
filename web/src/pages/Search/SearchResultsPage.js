import API from '../../services/api.js';
import Router from '../../utils/router.js';
import SearchBox from '../../components/SearchBox.js';

class SearchResultsPage {
    constructor() {
        this.results = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.totalResults = 0;
        this.isLoading = false;
        this.searchBox = null;
        this.currentQuery = '';
        this.currentFilters = {};
    }

    async render(container, props = {}) {
        // Parse URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        this.currentQuery = urlParams.get('q') || '';
        this.currentFilters = {
            type: urlParams.get('type') || '',
            category: urlParams.get('category') || '',
            sort: urlParams.get('sort') || 'relevance',
            tags: urlParams.get('tags') || '',
            date_from: urlParams.get('date_from') || '',
            date_to: urlParams.get('date_to') || ''
        };
        this.currentPage = parseInt(urlParams.get('page')) || 1;

        container.innerHTML = this.getHTML();
        this.setupEventListeners(container);
        this.initializeSearchBox(container);
        
        if (this.currentQuery || Object.values(this.currentFilters).some(v => v)) {
            await this.performSearch();
        } else {
            this.renderEmptyState();
        }
    }

    getHTML() {
        return `
            <div class="search-results-page">
                ${this.getHeaderSection()}
                ${this.getContentSection()}
            </div>
        `;
    }

    getHeaderSection() {
        return `
            <div class="search-header bg-light py-4">
                <div class="container">
                    <div class="row">
                        <div class="col-lg-8 mx-auto">
                            <h1 class="h3 mb-3">Search</h1>
                            <div id="search-box-container"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getContentSection() {
        return `
            <div class="container py-4">
                <div class="row">
                    <div class="col-lg-3">
                        ${this.getSidebarSection()}
                    </div>
                    <div class="col-lg-9">
                        <div id="search-results-container">
                            <div class="text-center py-5">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Searching...</span>
                                </div>
                                <p class="mt-3">Searching...</p>
                            </div>
                        </div>
                        
                        <div id="pagination-container" class="mt-4"></div>
                    </div>
                </div>
            </div>
        `;
    }

    getSidebarSection() {
        return `
            <div class="search-sidebar">
                <div class="card">
                    <div class="card-header">
                        <h6 class="mb-0">Filters</h6>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <label class="form-label">Content Type</label>
                            <select class="form-select" id="filter-type">
                                <option value="">All Types</option>
                                <option value="interview">Interviews</option>
                                <option value="gallery">Galleries</option>
                                <option value="user">Users</option>
                                <option value="business">Businesses</option>
                                <option value="event">Events</option>
                            </select>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Category</label>
                            <select class="form-select" id="filter-category">
                                <option value="">All Categories</option>
                                <option value="music">Music</option>
                                <option value="business">Business</option>
                                <option value="politics">Politics</option>
                                <option value="sports">Sports</option>
                                <option value="technology">Technology</option>
                                <option value="entertainment">Entertainment</option>
                                <option value="lifestyle">Lifestyle</option>
                                <option value="education">Education</option>
                                <option value="health">Health</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Sort By</label>
                            <select class="form-select" id="filter-sort">
                                <option value="relevance">Most Relevant</option>
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="popular">Most Popular</option>
                                <option value="most_liked">Most Liked</option>
                                <option value="most_commented">Most Commented</option>
                            </select>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Tags</label>
                            <input type="text" class="form-control" id="filter-tags" placeholder="Enter tags...">
                            <div class="form-text">Separate multiple tags with commas</div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Date Range</label>
                            <div class="row g-2">
                                <div class="col-6">
                                    <input type="date" class="form-control" id="filter-date-from">
                                </div>
                                <div class="col-6">
                                    <input type="date" class="form-control" id="filter-date-to">
                                </div>
                            </div>
                        </div>

                        <div class="d-grid gap-2">
                            <button class="btn btn-primary" id="apply-filters-btn">
                                <i class="fas fa-search me-2"></i>Apply Filters
                            </button>
                            <button class="btn btn-outline-secondary" id="clear-filters-btn">
                                <i class="fas fa-times me-2"></i>Clear All
                            </button>
                        </div>
                    </div>
                </div>

                <div class="card mt-3">
                    <div class="card-header">
                        <h6 class="mb-0">Popular Tags</h6>
                    </div>
                    <div class="card-body">
                        <div id="popular-tags-container">
                            <div class="text-center">
                                <div class="spinner-border spinner-border-sm" role="status"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners(container) {
        // Filter change events
        const filterElements = container.querySelectorAll('#filter-type, #filter-category, #filter-sort, #filter-tags, #filter-date-from, #filter-date-to');
        filterElements.forEach(element => {
            element.addEventListener('change', () => {
                this.updateFiltersFromUI();
            });
        });

        // Apply filters button
        const applyBtn = container.querySelector('#apply-filters-btn');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applyFilters();
            });
        }

        // Clear filters button
        const clearBtn = container.querySelector('#clear-filters-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }

        // Load popular tags
        this.loadPopularTags();
    }

    initializeSearchBox(container) {
        const searchBoxContainer = container.querySelector('#search-box-container');
        
        this.searchBox = new SearchBox(searchBoxContainer, {
            placeholder: 'Search interviews, galleries, users...',
            showSuggestions: true,
            showFilters: false,
            autoFocus: false
        });
        
        this.searchBox.render();
        this.searchBox.setValue(this.currentQuery);
        
        // Listen for search events
        searchBoxContainer.addEventListener('search', (e) => {
            this.currentQuery = e.detail.query;
            this.currentPage = 1;
            this.performSearch();
        });
        
        // Populate filter UI
        this.populateFilters();
    }

    populateFilters() {
        const container = document;
        
        Object.keys(this.currentFilters).forEach(key => {
            const element = container.querySelector(`#filter-${key.replace('_', '-')}`);
            if (element) {
                element.value = this.currentFilters[key] || '';
            }
        });
    }

    updateFiltersFromUI() {
        this.currentFilters = {
            type: document.querySelector('#filter-type')?.value || '',
            category: document.querySelector('#filter-category')?.value || '',
            sort: document.querySelector('#filter-sort')?.value || 'relevance',
            tags: document.querySelector('#filter-tags')?.value || '',
            date_from: document.querySelector('#filter-date-from')?.value || '',
            date_to: document.querySelector('#filter-date-to')?.value || ''
        };
    }

    async performSearch() {
        if (this.isLoading) return;

        try {
            this.isLoading = true;
            this.showLoadingState();

            const params = {
                q: this.currentQuery,
                page: this.currentPage,
                limit: 20,
                ...this.currentFilters
            };

            // Remove empty filters
            Object.keys(params).forEach(key => {
                if (params[key] === '' || params[key] === null) {
                    delete params[key];
                }
            });

            const response = await API.get('/api/search', params);

            if (response.success) {
                this.results = response.data.items;
                this.totalResults = response.data.pagination.total;
                this.totalPages = response.data.pagination.total_pages;
                
                this.renderResults();
                this.renderPagination();
                this.updateURL();
            } else {
                this.renderError('Search failed: ' + response.message);
            }

        } catch (error) {
            console.error('Search failed:', error);
            this.renderError('Search failed. Please try again.');
        } finally {
            this.isLoading = false;
        }
    }

    showLoadingState() {
        const container = document.querySelector('#search-results-container');
        container.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Searching...</span>
                </div>
                <p class="mt-3">Searching...</p>
            </div>
        `;
    }

    renderResults() {
        const container = document.querySelector('#search-results-container');

        if (this.results.length === 0) {
            this.renderEmptyState();
            return;
        }

        const resultsHTML = `
            <div class="search-results">
                <div class="search-meta mb-4">
                    <h5>Search Results</h5>
                    <p class="text-muted mb-0">
                        Found ${this.totalResults.toLocaleString()} results
                        ${this.currentQuery ? ` for "${this.currentQuery}"` : ''}
                    </p>
                </div>
                
                <div class="results-list">
                    ${this.results.map(result => this.renderResultItem(result)).join('')}
                </div>
            </div>
        `;

        container.innerHTML = resultsHTML;
    }

    renderResultItem(result) {
        const typeIcon = this.getTypeIcon(result.searchable_type);
        const typeLabel = result.searchable_type.charAt(0).toUpperCase() + result.searchable_type.slice(1);

        return `
            <div class="result-item border-bottom py-3">
                <div class="d-flex">
                    <div class="result-icon me-3">
                        <i class="fas ${typeIcon} fa-2x text-primary"></i>
                    </div>
                    <div class="result-content flex-grow-1">
                        <div class="result-header d-flex align-items-center mb-2">
                            <h6 class="mb-0 me-2">
                                <a href="${result.url}" class="text-decoration-none">
                                    ${result.title}
                                </a>
                            </h6>
                            <span class="badge bg-secondary">${typeLabel}</span>
                            ${result.category ? `<span class="badge bg-light text-dark ms-1">${result.category}</span>` : ''}
                        </div>
                        
                        ${result.content ? `
                            <p class="result-description text-muted mb-2">
                                ${this.truncateText(result.content, 150)}
                            </p>
                        ` : ''}
                        
                        <div class="result-meta d-flex align-items-center text-muted small">
                            ${result.username ? `
                                <span class="me-3">
                                    <i class="fas fa-user me-1"></i>
                                    ${result.username}
                                </span>
                            ` : ''}
                            <span class="me-3">
                                <i class="fas fa-calendar me-1"></i>
                                ${result.created_at_formatted}
                            </span>
                            ${result.view_count ? `
                                <span class="me-3">
                                    <i class="fas fa-eye me-1"></i>
                                    ${result.view_count}
                                </span>
                            ` : ''}
                            ${result.like_count ? `
                                <span class="me-3">
                                    <i class="fas fa-heart me-1"></i>
                                    ${result.like_count}
                                </span>
                            ` : ''}
                        </div>
                        
                        ${result.tags && result.tags.length > 0 ? `
                            <div class="result-tags mt-2">
                                ${result.tags.slice(0, 5).map(tag => `
                                    <span class="badge bg-light text-dark me-1">#${tag}</span>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderEmptyState() {
        const container = document.querySelector('#search-results-container');
        
        const message = this.currentQuery ? 
            `No results found for "${this.currentQuery}"` : 
            'Enter a search term to find content';

        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <h4>${message}</h4>
                <p class="text-muted">Try adjusting your search terms or filters</p>
            </div>
        `;
    }

    renderError(message) {
        const container = document.querySelector('#search-results-container');
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                <h4>Search Error</h4>
                <p class="text-muted">${message}</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    <i class="fas fa-refresh me-2"></i>Try Again
                </button>
            </div>
        `;
    }

    renderPagination() {
        const container = document.querySelector('#pagination-container');

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
            <nav aria-label="Search results pagination">
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
                    this.currentPage = page;
                    this.performSearch();
                }
            });
        });
    }

    async loadPopularTags() {
        try {
            const response = await API.get('/api/search/tags', { limit: 10 });
            
            if (response.success) {
                this.renderPopularTags(response.data);
            }
        } catch (error) {
            console.error('Failed to load popular tags:', error);
        }
    }

    renderPopularTags(tags) {
        const container = document.querySelector('#popular-tags-container');
        
        if (tags.length === 0) {
            container.innerHTML = '<p class="text-muted small mb-0">No tags available</p>';
            return;
        }

        container.innerHTML = tags.map(tagData => `
            <button class="btn btn-outline-primary btn-sm me-1 mb-1 tag-btn" data-tag="${tagData.tag}">
                #${tagData.tag} (${tagData.count})
            </button>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.tag-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tag = e.target.getAttribute('data-tag');
                this.addTagFilter(tag);
            });
        });
    }

    addTagFilter(tag) {
        const tagsInput = document.querySelector('#filter-tags');
        const currentTags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t);
        
        if (!currentTags.includes(tag)) {
            currentTags.push(tag);
            tagsInput.value = currentTags.join(', ');
            this.applyFilters();
        }
    }

    applyFilters() {
        this.updateFiltersFromUI();
        this.currentPage = 1;
        this.performSearch();
    }

    clearFilters() {
        this.currentFilters = {
            type: '',
            category: '',
            sort: 'relevance',
            tags: '',
            date_from: '',
            date_to: ''
        };
        
        this.populateFilters();
        this.currentPage = 1;
        this.performSearch();
    }

    updateURL() {
        const params = new URLSearchParams();
        
        if (this.currentQuery) {
            params.set('q', this.currentQuery);
        }
        
        if (this.currentPage > 1) {
            params.set('page', this.currentPage);
        }
        
        Object.keys(this.currentFilters).forEach(key => {
            if (this.currentFilters[key]) {
                params.set(key, this.currentFilters[key]);
            }
        });
        
        const newUrl = '/search' + (params.toString() ? '?' + params.toString() : '');
        window.history.replaceState({}, '', newUrl);
    }

    getTypeIcon(type) {
        const icons = {
            'interview': 'fa-microphone',
            'gallery': 'fa-images',
            'user': 'fa-user',
            'business': 'fa-building',
            'event': 'fa-calendar'
        };
        return icons[type] || 'fa-file';
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
}

export default SearchResultsPage;
