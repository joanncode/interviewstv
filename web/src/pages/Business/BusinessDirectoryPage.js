import API from '../../services/api.js';
import Auth from '../../services/auth.js';
import SearchBox from '../../components/SearchBox.js';

export default class BusinessDirectoryPage {
    constructor() {
        this.currentUser = Auth.getCurrentUser();
        this.businesses = [];
        this.industries = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.isLoading = false;
        this.currentFilters = {
            search: '',
            industry: '',
            location: '',
            verified: false,
            sort: 'created_at'
        };
        this.searchBox = null;
    }

    async render(container) {
        container.innerHTML = this.getHTML();
        this.setupEventListeners(container);
        this.initializeSearchBox(container);
        
        await Promise.all([
            this.loadIndustries(),
            this.loadBusinesses()
        ]);
    }

    getHTML() {
        return `
            <div class="business-directory-page">
                <div class="container py-4">
                    <!-- Header Section -->
                    <div class="row mb-4">
                        <div class="col-lg-8">
                            <h1 class="display-5 fw-bold mb-3">Business Directory</h1>
                            <p class="lead text-muted">
                                Discover local businesses and connect with their stories through interviews
                            </p>
                        </div>
                        <div class="col-lg-4 text-lg-end">
                            ${this.currentUser ? `
                                <a href="/business/create" class="btn btn-primary">
                                    <i class="fas fa-plus me-2"></i>Add Your Business
                                </a>
                            ` : `
                                <a href="/login" class="btn btn-outline-primary">
                                    <i class="fas fa-sign-in-alt me-2"></i>Login to Add Business
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
                                    <div id="business-search-box"></div>
                                </div>
                                <div class="col-lg-4">
                                    <select class="form-select" id="sort-select">
                                        <option value="created_at">Newest First</option>
                                        <option value="name">Name A-Z</option>
                                        <option value="rating">Highest Rated</option>
                                        <option value="popular">Most Popular</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Filters -->
                            <div class="row g-3">
                                <div class="col-md-4">
                                    <select class="form-select" id="industry-filter">
                                        <option value="">All Industries</option>
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <input type="text" 
                                           class="form-control" 
                                           id="location-filter"
                                           placeholder="Filter by location...">
                                </div>
                                <div class="col-md-4">
                                    <div class="form-check mt-2">
                                        <input class="form-check-input" 
                                               type="checkbox" 
                                               id="verified-filter">
                                        <label class="form-check-label" for="verified-filter">
                                            <i class="fas fa-check-circle text-primary me-1"></i>
                                            Verified businesses only
                                        </label>
                                    </div>
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
                                    <span class="text-muted">Loading businesses...</span>
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

                            <!-- Business Grid -->
                            <div id="business-grid" class="business-grid">
                                <div class="text-center py-5">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Loading businesses...</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Pagination -->
                            <nav aria-label="Business pagination" id="pagination-container" style="display: none;">
                                <ul class="pagination justify-content-center" id="pagination">
                                </ul>
                            </nav>
                        </div>

                        <!-- Sidebar -->
                        <div class="col-lg-3">
                            <!-- Popular Businesses -->
                            <div class="card mb-4">
                                <div class="card-header">
                                    <h6 class="mb-0">
                                        <i class="fas fa-star text-warning me-2"></i>Popular Businesses
                                    </h6>
                                </div>
                                <div class="card-body" id="popular-businesses">
                                    <div class="text-center py-3">
                                        <div class="spinner-border spinner-border-sm text-primary" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Industry Stats -->
                            <div class="card mb-4">
                                <div class="card-header">
                                    <h6 class="mb-0">
                                        <i class="fas fa-chart-pie text-info me-2"></i>Industries
                                    </h6>
                                </div>
                                <div class="card-body" id="industry-stats">
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
                                            <a href="/business/create" class="btn btn-primary btn-sm">
                                                <i class="fas fa-plus me-2"></i>Add Business
                                            </a>
                                            <a href="/business/my" class="btn btn-outline-primary btn-sm">
                                                <i class="fas fa-building me-2"></i>My Businesses
                                            </a>
                                        ` : `
                                            <a href="/login" class="btn btn-primary btn-sm">
                                                <i class="fas fa-sign-in-alt me-2"></i>Login
                                            </a>
                                            <a href="/register" class="btn btn-outline-primary btn-sm">
                                                <i class="fas fa-user-plus me-2"></i>Sign Up
                                            </a>
                                        `}
                                        <a href="/interviews" class="btn btn-outline-secondary btn-sm">
                                            <i class="fas fa-video me-2"></i>Browse Interviews
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

    async loadBusinesses(page = 1) {
        if (this.isLoading) return;

        try {
            this.isLoading = true;
            this.showLoadingState();

            const params = {
                page,
                limit: 12,
                ...this.currentFilters
            };

            // Remove empty filters
            Object.keys(params).forEach(key => {
                if (params[key] === '' || params[key] === false) {
                    delete params[key];
                }
            });

            const response = await API.get('/api/businesses', params);

            if (response.success) {
                this.businesses = response.data.businesses;
                this.currentPage = response.data.page;
                this.totalPages = response.data.pages;
                
                this.renderBusinesses();
                this.renderPagination();
                this.updateResultsInfo(response.data.total);
            } else {
                this.showErrorState('Failed to load businesses');
            }

        } catch (error) {
            console.error('Failed to load businesses:', error);
            this.showErrorState('Failed to load businesses');
        } finally {
            this.isLoading = false;
        }
    }

    async loadIndustries() {
        try {
            const response = await API.get('/api/businesses/industries');
            
            if (response.success) {
                this.industries = response.data;
                this.renderIndustryFilter();
                this.renderIndustryStats();
            }
        } catch (error) {
            console.error('Failed to load industries:', error);
        }
    }

    async loadPopularBusinesses() {
        try {
            const response = await API.get('/api/businesses/popular', { limit: 5 });
            
            if (response.success) {
                this.renderPopularBusinesses(response.data);
            }
        } catch (error) {
            console.error('Failed to load popular businesses:', error);
        }
    }

    renderBusinesses() {
        const container = document.getElementById('business-grid');
        const viewMode = document.querySelector('.view-toggle .active').dataset.view;
        
        if (this.businesses.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-building fa-3x text-muted mb-3"></i>
                    <h5>No businesses found</h5>
                    <p class="text-muted">Try adjusting your search criteria</p>
                    ${this.currentUser ? `
                        <a href="/business/create" class="btn btn-primary">
                            <i class="fas fa-plus me-2"></i>Add the First Business
                        </a>
                    ` : ''}
                </div>
            `;
            return;
        }

        if (viewMode === 'grid') {
            container.className = 'business-grid row g-4';
            container.innerHTML = this.businesses.map(business => `
                <div class="col-md-6 col-lg-4">
                    ${this.getBusinessCardHTML(business)}
                </div>
            `).join('');
        } else {
            container.className = 'business-list';
            container.innerHTML = this.businesses.map(business => 
                this.getBusinessListItemHTML(business)
            ).join('');
        }
    }

    getBusinessCardHTML(business) {
        return `
            <div class="business-card card h-100">
                <div class="position-relative">
                    ${business.logo_url ? `
                        <img src="${business.logo_url}" 
                             class="card-img-top" 
                             style="height: 200px; object-fit: cover;"
                             alt="${business.name}">
                    ` : `
                        <div class="card-img-top d-flex align-items-center justify-content-center bg-light" 
                             style="height: 200px;">
                            <i class="fas fa-building fa-3x text-muted"></i>
                        </div>
                    `}
                    
                    <div class="position-absolute top-0 end-0 m-2">
                        <span class="badge bg-${this.getIndustryColor(business.industry)}">
                            ${this.getIndustryLabel(business.industry)}
                        </span>
                    </div>
                    
                    ${business.verified ? `
                        <div class="position-absolute top-0 start-0 m-2">
                            <span class="badge bg-primary">
                                <i class="fas fa-check-circle me-1"></i>Verified
                            </span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="card-body">
                    <h6 class="card-title">
                        <a href="/business/${business.id}" class="text-decoration-none">
                            ${business.name}
                        </a>
                    </h6>
                    
                    <p class="card-text small text-muted">
                        ${business.description ? business.description.substring(0, 100) + '...' : 'No description available'}
                    </p>
                    
                    ${business.location ? `
                        <p class="card-text small">
                            <i class="fas fa-map-marker-alt text-muted me-1"></i>
                            ${business.location}
                        </p>
                    ` : ''}
                    
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="business-stats">
                            ${business.average_rating ? `
                                <span class="badge bg-warning text-dark me-1">
                                    <i class="fas fa-star me-1"></i>${business.average_rating}
                                </span>
                            ` : ''}
                            <small class="text-muted">
                                ${business.interview_count} interview${business.interview_count !== 1 ? 's' : ''}
                            </small>
                        </div>
                        <a href="/business/${business.id}" class="btn btn-sm btn-outline-primary">
                            View Details
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    getBusinessListItemHTML(business) {
        return `
            <div class="business-list-item card mb-3">
                <div class="row g-0">
                    <div class="col-md-3">
                        ${business.logo_url ? `
                            <img src="${business.logo_url}" 
                                 class="img-fluid rounded-start h-100" 
                                 style="object-fit: cover; min-height: 150px;"
                                 alt="${business.name}">
                        ` : `
                            <div class="d-flex align-items-center justify-content-center bg-light rounded-start h-100" 
                                 style="min-height: 150px;">
                                <i class="fas fa-building fa-2x text-muted"></i>
                            </div>
                        `}
                    </div>
                    <div class="col-md-9">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h5 class="card-title">
                                    <a href="/business/${business.id}" class="text-decoration-none">
                                        ${business.name}
                                    </a>
                                    ${business.verified ? `
                                        <i class="fas fa-check-circle text-primary ms-1"></i>
                                    ` : ''}
                                </h5>
                                <span class="badge bg-${this.getIndustryColor(business.industry)}">
                                    ${this.getIndustryLabel(business.industry)}
                                </span>
                            </div>
                            
                            <p class="card-text">
                                ${business.description || 'No description available'}
                            </p>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    ${business.location ? `
                                        <p class="card-text small">
                                            <i class="fas fa-map-marker-alt text-muted me-1"></i>
                                            ${business.location}
                                        </p>
                                    ` : ''}
                                    
                                    ${business.website_url ? `
                                        <p class="card-text small">
                                            <i class="fas fa-globe text-muted me-1"></i>
                                            <a href="${business.website_url}" target="_blank" class="text-decoration-none">
                                                Website
                                            </a>
                                        </p>
                                    ` : ''}
                                </div>
                                <div class="col-md-6">
                                    <div class="business-stats">
                                        ${business.average_rating ? `
                                            <span class="badge bg-warning text-dark me-2">
                                                <i class="fas fa-star me-1"></i>${business.average_rating}
                                            </span>
                                        ` : ''}
                                        <small class="text-muted d-block">
                                            ${business.interview_count} interview${business.interview_count !== 1 ? 's' : ''}
                                        </small>
                                        <small class="text-muted">
                                            ${business.comment_count} comment${business.comment_count !== 1 ? 's' : ''}
                                        </small>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="mt-3">
                                <a href="/business/${business.id}" class="btn btn-primary btn-sm">
                                    View Details
                                </a>
                                ${business.website_url ? `
                                    <a href="${business.website_url}" target="_blank" class="btn btn-outline-secondary btn-sm ms-2">
                                        <i class="fas fa-external-link-alt me-1"></i>Website
                                    </a>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderIndustryFilter() {
        const select = document.getElementById('industry-filter');
        
        select.innerHTML = '<option value="">All Industries</option>' +
            this.industries.map(industry => `
                <option value="${industry.industry}">
                    ${this.getIndustryLabel(industry.industry)} (${industry.count})
                </option>
            `).join('');
    }

    renderIndustryStats() {
        const container = document.getElementById('industry-stats');
        
        if (this.industries.length === 0) {
            container.innerHTML = `
                <div class="text-center py-3">
                    <i class="fas fa-chart-pie fa-2x text-muted mb-2"></i>
                    <p class="text-muted small mb-0">No industry data</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.industries.slice(0, 5).map(industry => `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="small">
                    <i class="fas fa-circle text-${this.getIndustryColor(industry.industry)} me-1"></i>
                    ${this.getIndustryLabel(industry.industry)}
                </span>
                <span class="badge bg-light text-dark">${industry.count}</span>
            </div>
        `).join('');
    }

    renderPopularBusinesses(businesses) {
        const container = document.getElementById('popular-businesses');
        
        if (businesses.length === 0) {
            container.innerHTML = `
                <div class="text-center py-3">
                    <i class="fas fa-star fa-2x text-muted mb-2"></i>
                    <p class="text-muted small mb-0">No popular businesses</p>
                </div>
            `;
            return;
        }

        container.innerHTML = businesses.map(business => `
            <div class="popular-business-item d-flex align-items-center mb-3">
                <div class="flex-shrink-0 me-3">
                    ${business.logo_url ? `
                        <img src="${business.logo_url}" 
                             class="rounded" 
                             width="40" height="40" 
                             style="object-fit: cover;"
                             alt="${business.name}">
                    ` : `
                        <div class="bg-light rounded d-flex align-items-center justify-content-center" 
                             style="width: 40px; height: 40px;">
                            <i class="fas fa-building text-muted"></i>
                        </div>
                    `}
                </div>
                
                <div class="flex-grow-1">
                    <h6 class="mb-1 small">
                        <a href="/business/${business.id}" class="text-decoration-none">
                            ${business.name}
                        </a>
                        ${business.verified ? '<i class="fas fa-check-circle text-primary ms-1"></i>' : ''}
                    </h6>
                    <small class="text-muted">
                        ${business.interview_count} interviews
                        ${business.average_rating ? ` • ${business.average_rating}★` : ''}
                    </small>
                </div>
            </div>
        `).join('');
    }

    renderPagination() {
        const container = document.getElementById('pagination-container');
        const pagination = document.getElementById('pagination');
        
        if (this.totalPages <= 1) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        
        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage - 1}">Previous</a>
            </li>
        `;
        
        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }
        
        // Next button
        paginationHTML += `
            <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage + 1}">Next</a>
            </li>
        `;
        
        pagination.innerHTML = paginationHTML;
    }

    updateResultsInfo(total) {
        const container = document.getElementById('results-info');
        const start = (this.currentPage - 1) * 12 + 1;
        const end = Math.min(this.currentPage * 12, total);
        
        container.innerHTML = `
            <span class="text-muted">
                Showing ${start}-${end} of ${total} businesses
            </span>
        `;
    }

    initializeSearchBox(container) {
        const searchContainer = container.querySelector('#business-search-box');
        if (searchContainer) {
            this.searchBox = new SearchBox(searchContainer, {
                placeholder: 'Search businesses by name, description, or location...',
                showSuggestions: true,
                showFilters: false,
                onSearch: (query) => {
                    this.currentFilters.search = query;
                    this.currentPage = 1;
                    this.loadBusinesses();
                }
            });
            this.searchBox.render();
        }
    }

    setupEventListeners(container) {
        // Sort change
        const sortSelect = container.querySelector('#sort-select');
        sortSelect.addEventListener('change', (e) => {
            this.currentFilters.sort = e.target.value;
            this.currentPage = 1;
            this.loadBusinesses();
        });

        // Industry filter
        const industryFilter = container.querySelector('#industry-filter');
        industryFilter.addEventListener('change', (e) => {
            this.currentFilters.industry = e.target.value;
            this.currentPage = 1;
            this.loadBusinesses();
        });

        // Location filter
        const locationFilter = container.querySelector('#location-filter');
        let locationTimeout;
        locationFilter.addEventListener('input', (e) => {
            clearTimeout(locationTimeout);
            locationTimeout = setTimeout(() => {
                this.currentFilters.location = e.target.value;
                this.currentPage = 1;
                this.loadBusinesses();
            }, 500);
        });

        // Verified filter
        const verifiedFilter = container.querySelector('#verified-filter');
        verifiedFilter.addEventListener('change', (e) => {
            this.currentFilters.verified = e.target.checked;
            this.currentPage = 1;
            this.loadBusinesses();
        });

        // View toggle
        const viewToggle = container.querySelectorAll('.view-toggle button');
        viewToggle.forEach(button => {
            button.addEventListener('click', (e) => {
                viewToggle.forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                this.renderBusinesses();
            });
        });

        // Pagination
        container.addEventListener('click', (e) => {
            if (e.target.matches('.page-link')) {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                if (page && page !== this.currentPage) {
                    this.currentPage = page;
                    this.loadBusinesses(page);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }
        });

        // Load popular businesses
        this.loadPopularBusinesses();
    }

    getIndustryLabel(industry) {
        const labels = {
            'retail': 'Retail',
            'hospitality': 'Hospitality',
            'tech': 'Technology',
            'healthcare': 'Healthcare',
            'education': 'Education',
            'entertainment': 'Entertainment',
            'other': 'Other'
        };
        return labels[industry] || industry;
    }

    getIndustryColor(industry) {
        const colors = {
            'retail': 'primary',
            'hospitality': 'success',
            'tech': 'info',
            'healthcare': 'danger',
            'education': 'warning',
            'entertainment': 'secondary',
            'other': 'dark'
        };
        return colors[industry] || 'secondary';
    }

    showLoadingState() {
        const container = document.getElementById('business-grid');
        container.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading businesses...</span>
                </div>
            </div>
        `;
    }

    showErrorState(message) {
        const container = document.getElementById('business-grid');
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-exclamation-triangle fa-3x text-muted mb-3"></i>
                <h5>Error Loading Businesses</h5>
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
    }
}
