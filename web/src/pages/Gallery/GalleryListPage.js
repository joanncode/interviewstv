import Auth from '../../services/auth.js';
import API from '../../services/api.js';
import Router from '../../utils/router.js';

class GalleryListPage {
    constructor() {
        this.galleries = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.isLoading = false;
        this.filters = {
            search: '',
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
        await this.loadGalleries();
    }

    getHTML() {
        return `
            <div class="gallery-list-page">
                ${this.getHeaderSection()}
                ${this.getFiltersSection()}
                ${this.getGalleriesSection()}
            </div>
        `;
    }

    getHeaderSection() {
        const currentUser = Auth.getCurrentUser();
        
        return `
            <div class="container py-4">
                <div class="row align-items-center mb-4">
                    <div class="col-md-8">
                        <h1 class="mb-2">Media Galleries</h1>
                        <p class="text-muted mb-0">Discover amazing photo and video collections</p>
                    </div>
                    <div class="col-md-4 text-md-end">
                        ${currentUser ? `
                            <a href="/galleries/create" class="btn btn-primary">
                                <i class="fas fa-plus me-2"></i>Create Gallery
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
                        <div class="col-md-4">
                            <input type="text" 
                                   class="form-control" 
                                   id="search-input" 
                                   placeholder="Search galleries..."
                                   value="${this.filters.search}">
                        </div>
                        <div class="col-md-2">
                            <select class="form-select" id="type-filter">
                                <option value="">All Types</option>
                                <option value="personal" ${this.filters.type === 'personal' ? 'selected' : ''}>Personal</option>
                                <option value="interview" ${this.filters.type === 'interview' ? 'selected' : ''}>Interview</option>
                                <option value="event" ${this.filters.type === 'event' ? 'selected' : ''}>Event</option>
                                <option value="business" ${this.filters.type === 'business' ? 'selected' : ''}>Business</option>
                            </select>
                        </div>
                        <div class="col-md-2">
                            <select class="form-select" id="sort-filter">
                                <option value="recent" ${this.filters.sort === 'recent' ? 'selected' : ''}>Most Recent</option>
                                <option value="popular" ${this.filters.sort === 'popular' ? 'selected' : ''}>Most Popular</option>
                                <option value="alphabetical" ${this.filters.sort === 'alphabetical' ? 'selected' : ''}>Alphabetical</option>
                            </select>
                        </div>
                        <div class="col-md-4">
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

    getGalleriesSection() {
        return `
            <div class="container">
                <div id="galleries-container">
                    <div class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading galleries...</span>
                        </div>
                        <p class="mt-3">Loading galleries...</p>
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
        const filterElements = container.querySelectorAll('#type-filter, #sort-filter');
        filterElements.forEach(element => {
            element.addEventListener('change', () => this.applyFilters());
        });
    }

    async loadGalleries(page = 1) {
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

            const response = await API.get('/api/galleries', params);

            if (response.success) {
                this.galleries = response.data.items;
                this.totalPages = response.data.pagination.total_pages;
                this.renderGalleries();
                this.renderPagination();
            } else {
                this.renderError('Failed to load galleries');
            }

        } catch (error) {
            console.error('Failed to load galleries:', error);
            this.renderError('Failed to load galleries');
        } finally {
            this.isLoading = false;
        }
    }

    renderGalleries() {
        const container = document.getElementById('galleries-container');

        if (this.galleries.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-images fa-3x text-muted mb-3"></i>
                    <h4>No galleries found</h4>
                    <p class="text-muted">Try adjusting your search criteria or create the first gallery!</p>
                    ${Auth.getCurrentUser() ? `
                        <a href="/galleries/create" class="btn btn-primary mt-3">
                            <i class="fas fa-plus me-2"></i>Create Gallery
                        </a>
                    ` : ''}
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="row g-4">
                ${this.galleries.map(gallery => this.getGalleryCard(gallery)).join('')}
            </div>
        `;
    }

    getGalleryCard(gallery) {
        const typeIcon = {
            'personal': 'fa-user',
            'interview': 'fa-microphone',
            'event': 'fa-calendar',
            'business': 'fa-building'
        };

        return `
            <div class="col-md-6 col-lg-4">
                <div class="card gallery-card h-100">
                    <div class="position-relative">
                        <img src="${gallery.cover_image_url || '/assets/default-gallery.jpg'}" 
                             class="card-img-top" 
                             alt="${gallery.title}"
                             style="height: 200px; object-fit: cover;"
                             onerror="this.src='/assets/default-gallery.jpg'">
                        <div class="position-absolute top-0 start-0 m-2">
                            <span class="badge bg-primary">
                                <i class="fas ${typeIcon[gallery.type]} me-1"></i>
                                ${gallery.type.charAt(0).toUpperCase() + gallery.type.slice(1)}
                            </span>
                        </div>
                        <div class="position-absolute bottom-0 end-0 m-2">
                            <span class="badge bg-dark">
                                <i class="fas fa-images me-1"></i>${gallery.media_count || 0}
                            </span>
                        </div>
                    </div>
                    
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">
                            <a href="/gallery/${gallery.id}" class="text-decoration-none">
                                ${gallery.title}
                            </a>
                        </h5>
                        
                        <p class="card-text text-muted small flex-grow-1">
                            ${gallery.description ? gallery.description.substring(0, 100) + '...' : 'No description'}
                        </p>
                        
                        <div class="d-flex align-items-center mb-2">
                            <img src="${gallery.owner.avatar_url || '/assets/default-avatar.png'}" 
                                 class="rounded-circle me-2" 
                                 width="24" height="24"
                                 alt="${gallery.owner.username}">
                            <small class="text-muted">
                                by <a href="/profile/${gallery.owner.username}" class="text-decoration-none">
                                    ${gallery.owner.username}
                                </a>
                            </small>
                        </div>
                        
                        <div class="d-flex align-items-center justify-content-between">
                            <div class="d-flex gap-3">
                                <small class="text-muted">
                                    <i class="fas fa-eye me-1"></i>${gallery.view_count || 0}
                                </small>
                                <small class="text-muted">
                                    <i class="fas fa-heart me-1"></i>${gallery.like_count || 0}
                                </small>
                            </div>
                            <small class="text-muted">
                                ${new Date(gallery.created_at).toLocaleDateString()}
                            </small>
                        </div>
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
            <nav aria-label="Gallery pagination">
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
                    this.loadGalleries(page);
                }
            });
        });
    }

    renderError(message) {
        const container = document.getElementById('galleries-container');
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
        this.filters.type = document.getElementById('type-filter').value;
        this.filters.sort = document.getElementById('sort-filter').value;

        // Reset to first page and load
        this.loadGalleries(1);
    }

    clearFilters() {
        // Reset filters
        this.filters = {
            search: '',
            type: '',
            sort: 'recent'
        };

        // Update UI
        document.getElementById('search-input').value = '';
        document.getElementById('type-filter').value = '';
        document.getElementById('sort-filter').value = 'recent';

        // Reload galleries
        this.loadGalleries(1);
    }
}

export default GalleryListPage;
