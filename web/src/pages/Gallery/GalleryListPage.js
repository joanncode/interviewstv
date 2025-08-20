import Auth from '../../services/auth.js';
import API from '../../services/api.js';
import Router from '../../utils/router.js';

class GalleryListPage {
    constructor() {
        this.galleries = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.isLoading = false;
        this.hasMore = true;
        this.viewMode = 'grid'; // grid or masonry
        this.filters = {
            search: '',
            type: '',
            sort: 'recent'
        };
        this.intersectionObserver = null;
        this.lazyLoadObserver = null;
    }

    async render(container, props = {}) {
        // Apply any props filters
        if (props.filter) {
            this.filters.sort = props.filter;
        }

        container.innerHTML = this.getHTML();
        this.setupEventListeners(container);
        this.setupLazyLoading();
        this.setupInfiniteScroll();
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
                            <div class="d-flex gap-2 justify-content-between">
                                <div class="d-flex gap-2">
                                    <button class="btn btn-outline-primary" id="apply-filters">
                                        <i class="fas fa-search me-2"></i>Search
                                    </button>
                                    <button class="btn btn-outline-secondary" id="clear-filters">
                                        <i class="fas fa-times me-2"></i>Clear
                                    </button>
                                </div>

                                <div class="btn-group btn-group-sm" role="group">
                                    <button type="button" class="btn btn-outline-secondary ${this.viewMode === 'grid' ? 'active' : ''}"
                                            id="grid-view-btn" title="Grid View">
                                        <i class="fas fa-th"></i>
                                    </button>
                                    <button type="button" class="btn btn-outline-secondary ${this.viewMode === 'masonry' ? 'active' : ''}"
                                            id="masonry-view-btn" title="Masonry View">
                                        <i class="fas fa-th-large"></i>
                                    </button>
                                </div>
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
                <!-- Results Info -->
                <div class="d-flex justify-content-between align-items-center mb-4" id="results-info" style="display: none !important;">
                    <div>
                        <span id="results-count">0 galleries found</span>
                        ${this.filters.search ? `<span class="text-muted"> for "${this.filters.search}"</span>` : ''}
                    </div>
                    <div class="text-muted small">
                        <span id="loading-indicator" style="display: none;">
                            <i class="fas fa-spinner fa-spin me-1"></i>Loading more...
                        </span>
                    </div>
                </div>

                <!-- Galleries Grid -->
                <div id="galleries-container" class="galleries-container ${this.viewMode}-layout">
                    <div class="text-center py-5" id="initial-loading">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading galleries...</span>
                        </div>
                        <p class="mt-3">Loading galleries...</p>
                    </div>
                </div>

                <!-- Infinite Scroll Trigger -->
                <div id="scroll-trigger" style="height: 1px; margin-bottom: 50px;"></div>

                <!-- Load More Button (fallback) -->
                <div class="text-center mb-4" id="load-more-container" style="display: none;">
                    <button class="btn btn-outline-primary" id="load-more-btn">
                        <i class="fas fa-plus me-2"></i>Load More Galleries
                    </button>
                </div>
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

    renderGalleries(append = false) {
        const container = document.getElementById('galleries-container');
        const initialLoading = document.getElementById('initial-loading');
        const resultsInfo = document.getElementById('results-info');

        // Hide initial loading
        if (initialLoading) {
            initialLoading.style.display = 'none';
        }

        // Show results info
        if (resultsInfo) {
            resultsInfo.style.display = 'flex';
            const countEl = document.getElementById('results-count');
            if (countEl) {
                countEl.textContent = `${this.galleries.length} galleries found`;
            }
        }

        if (this.galleries.length === 0 && !append) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-images fa-3x text-muted mb-3"></i>
                    <h4>No galleries found</h4>
                    <p class="text-muted">Try adjusting your search criteria or create the first gallery!</p>
                    ${Auth.getCurrentUser() ? `
                        <a href="/gallery/create" class="btn btn-primary mt-3">
                            <i class="fas fa-plus me-2"></i>Create Gallery
                        </a>
                    ` : ''}
                </div>
            `;
            return;
        }

        const gridClass = this.viewMode === 'masonry' ? 'masonry-grid' : 'row g-4';
        const galleriesHTML = this.galleries.map(gallery => this.getGalleryCard(gallery)).join('');

        if (append) {
            // Append new galleries for infinite scroll
            const existingGrid = container.querySelector('.row, .masonry-grid');
            if (existingGrid) {
                existingGrid.insertAdjacentHTML('beforeend', galleriesHTML);
            }
        } else {
            // Replace all galleries
            container.innerHTML = `
                <div class="${gridClass}">
                    ${galleriesHTML}
                </div>
            `;
        }

        // Update container class for layout
        container.className = `galleries-container ${this.viewMode}-layout`;

        // Initialize masonry if needed
        if (this.viewMode === 'masonry') {
            this.initializeMasonry();
        }

        // Trigger lazy loading for new images
        this.triggerLazyLoad();
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
                        <img data-src="${gallery.cover_image_url || '/assets/default-gallery.jpg'}"
                             src="/assets/placeholder-gallery.jpg"
                             class="card-img-top lazy-load"
                             alt="${gallery.title}"
                             style="height: 200px; object-fit: cover; transition: opacity 0.3s;"
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

    setupLazyLoading() {
        // Set up Intersection Observer for lazy loading images
        if ('IntersectionObserver' in window) {
            this.lazyLoadObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.dataset.src;

                        if (src) {
                            img.src = src;
                            img.classList.remove('lazy-load');
                            img.style.opacity = '1';
                            this.lazyLoadObserver.unobserve(img);
                        }
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.1
            });
        }
    }

    setupInfiniteScroll() {
        // Set up Intersection Observer for infinite scroll
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !this.isLoading && this.hasMore) {
                        this.loadMoreGalleries();
                    }
                });
            }, {
                rootMargin: '100px 0px',
                threshold: 0.1
            });

            // Observe the scroll trigger
            const scrollTrigger = document.getElementById('scroll-trigger');
            if (scrollTrigger) {
                this.intersectionObserver.observe(scrollTrigger);
            }
        }
    }

    triggerLazyLoad() {
        if (this.lazyLoadObserver) {
            const lazyImages = document.querySelectorAll('.lazy-load');
            lazyImages.forEach(img => {
                this.lazyLoadObserver.observe(img);
            });
        }
    }

    async loadMoreGalleries() {
        if (this.isLoading || !this.hasMore) return;

        try {
            this.isLoading = true;
            this.showLoadingIndicator();

            this.currentPage++;

            const params = {
                page: this.currentPage,
                limit: 12,
                ...this.filters
            };

            // Remove empty params
            Object.keys(params).forEach(key => {
                if (params[key] === '' || params[key] === null) {
                    delete params[key];
                }
            });

            const response = await API.get('/api/galleries', params);

            if (response.success) {
                const newGalleries = response.data.items;

                if (newGalleries.length === 0) {
                    this.hasMore = false;
                } else {
                    this.galleries = [...this.galleries, ...newGalleries];
                    this.renderGalleries(true); // Append mode
                }
            }

        } catch (error) {
            console.error('Failed to load more galleries:', error);
            this.currentPage--; // Revert page increment
        } finally {
            this.isLoading = false;
            this.hideLoadingIndicator();
        }
    }

    showLoadingIndicator() {
        const indicator = document.getElementById('loading-indicator');
        if (indicator) {
            indicator.style.display = 'inline';
        }
    }

    hideLoadingIndicator() {
        const indicator = document.getElementById('loading-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    setViewMode(mode) {
        this.viewMode = mode;

        // Update button states
        document.getElementById('grid-view-btn').classList.toggle('active', mode === 'grid');
        document.getElementById('masonry-view-btn').classList.toggle('active', mode === 'masonry');

        // Re-render galleries with new layout
        this.renderGalleries();

        // Save preference
        localStorage.setItem('gallery-view-mode', mode);
    }

    destroy() {
        // Clean up observers
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }

        if (this.lazyLoadObserver) {
            this.lazyLoadObserver.disconnect();
        }
    }
}

export default GalleryListPage;
