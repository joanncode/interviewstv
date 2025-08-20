import { ajaxService } from '../services/ajax.js';

/**
 * Dynamic Content Loader Component
 * Provides reusable dynamic loading functionality for any content type
 */
export default class DynamicContentLoader {
    constructor(container, options = {}) {
        this.container = container;
        this.config = {
            // Data loading
            loadData: null,
            renderItem: null,
            
            // Pagination
            enablePagination: false,
            enableInfiniteScroll: true,
            itemsPerPage: 12,
            
            // Layout
            layout: 'grid', // 'grid', 'list', 'masonry'
            gridColumns: 3,
            
            // Loading states
            showLoadingSpinner: true,
            showEmptyState: true,
            emptyStateMessage: 'No items found',
            emptyStateIcon: 'fas fa-inbox',
            
            // Filtering and sorting
            enableFiltering: false,
            enableSorting: false,
            filters: {},
            sortOptions: [],
            
            // Search
            enableSearch: false,
            searchPlaceholder: 'Search...',
            searchDebounceDelay: 300,
            
            // Animation
            enableAnimations: true,
            staggerDelay: 50,
            
            // Lazy loading
            enableLazyLoading: true,
            lazyLoadSelector: '[data-lazy]',
            
            // Callbacks
            onItemClick: null,
            onLoadComplete: null,
            onError: null,
            
            ...options
        };
        
        this.state = {
            items: [],
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            isLoading: false,
            hasMore: true,
            currentFilters: {},
            currentSort: '',
            searchQuery: ''
        };
        
        this.infiniteScroll = null;
        this.lazyLoader = null;
        this.pagination = null;
        this.searchDebouncer = null;
    }

    async render() {
        this.container.innerHTML = this.getHTML();
        this.setupEventListeners();
        
        if (this.config.enableInfiniteScroll) {
            this.initializeInfiniteScroll();
        }
        
        if (this.config.enablePagination) {
            this.initializePagination();
        }
        
        if (this.config.enableLazyLoading) {
            this.initializeLazyLoading();
        }
        
        if (this.config.enableSearch) {
            this.initializeSearch();
        }
        
        await this.loadInitialData();
    }

    getHTML() {
        return `
            <div class="dynamic-content-loader">
                ${this.config.enableSearch ? this.getSearchHTML() : ''}
                ${this.config.enableFiltering || this.config.enableSorting ? this.getFiltersHTML() : ''}
                
                <div class="content-header d-flex justify-content-between align-items-center mb-3">
                    <div class="results-info">
                        <span class="text-muted">Loading...</span>
                    </div>
                    
                    ${this.config.layout === 'grid' ? `
                        <div class="layout-controls btn-group btn-group-sm">
                            <button type="button" class="btn btn-outline-secondary active" data-layout="grid">
                                <i class="fas fa-th"></i>
                            </button>
                            <button type="button" class="btn btn-outline-secondary" data-layout="list">
                                <i class="fas fa-list"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
                
                <div class="content-container ${this.getLayoutClass()}">
                    ${this.config.showLoadingSpinner ? `
                        <div class="initial-loading text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <div class="mt-2 text-muted">Loading content...</div>
                        </div>
                    ` : ''}
                </div>
                
                ${this.config.enablePagination ? '<div class="pagination-container"></div>' : ''}
            </div>
        `;
    }

    getSearchHTML() {
        return `
            <div class="search-container mb-3">
                <div class="input-group">
                    <span class="input-group-text">
                        <i class="fas fa-search"></i>
                    </span>
                    <input type="text" 
                           class="form-control search-input" 
                           placeholder="${this.config.searchPlaceholder}">
                    <button class="btn btn-outline-secondary clear-search-btn" type="button" style="display: none;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    }

    getFiltersHTML() {
        return `
            <div class="filters-container card mb-3">
                <div class="card-body">
                    <div class="row g-3">
                        ${this.config.enableSorting ? `
                            <div class="col-md-4">
                                <select class="form-select sort-select">
                                    <option value="">Sort by...</option>
                                    ${this.config.sortOptions.map(option => `
                                        <option value="${option.value}">${option.label}</option>
                                    `).join('')}
                                </select>
                            </div>
                        ` : ''}
                        
                        ${this.config.enableFiltering ? `
                            <div class="col-md-6">
                                <div class="filter-controls">
                                    <!-- Filter controls will be dynamically added -->
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="col-md-2">
                            <button class="btn btn-outline-secondary w-100 clear-filters-btn">
                                <i class="fas fa-times me-1"></i>Clear
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getLayoutClass() {
        switch (this.config.layout) {
            case 'grid':
                return `row g-3`;
            case 'list':
                return 'list-layout';
            case 'masonry':
                return 'masonry-layout';
            default:
                return 'row g-3';
        }
    }

    async loadInitialData() {
        try {
            this.state.isLoading = true;
            this.state.currentPage = 1;
            this.state.items = [];
            
            const response = await this.fetchData(1);
            
            if (response.success) {
                this.state.items = response.data.items || response.data;
                this.state.totalPages = response.data.pages || 1;
                this.state.totalItems = response.data.total || this.state.items.length;
                this.state.hasMore = this.state.currentPage < this.state.totalPages;
                
                this.renderItems(true);
                this.updateResultsInfo();
                this.hideInitialLoading();
                
                if (this.config.onLoadComplete) {
                    this.config.onLoadComplete(response.data);
                }
            } else {
                this.showErrorState(response.message || 'Failed to load content');
            }
            
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showErrorState('Failed to load content');
            
            if (this.config.onError) {
                this.config.onError(error);
            }
        } finally {
            this.state.isLoading = false;
        }
    }

    async loadMoreData() {
        if (this.state.isLoading || !this.state.hasMore) {
            return { hasMore: false };
        }

        try {
            this.state.isLoading = true;
            this.state.currentPage++;
            
            const response = await this.fetchData(this.state.currentPage);
            
            if (response.success) {
                const newItems = response.data.items || response.data;
                this.state.items.push(...newItems);
                this.state.hasMore = this.state.currentPage < this.state.totalPages;
                
                this.renderNewItems(newItems);
                this.updateResultsInfo();
                
                return { hasMore: this.state.hasMore };
            } else {
                throw new Error(response.message || 'Failed to load more content');
            }
            
        } catch (error) {
            console.error('Failed to load more data:', error);
            this.state.currentPage--; // Revert page increment
            throw error;
        } finally {
            this.state.isLoading = false;
        }
    }

    async fetchData(page) {
        if (!this.config.loadData) {
            throw new Error('loadData function not provided');
        }

        const params = {
            page,
            limit: this.config.itemsPerPage,
            ...this.state.currentFilters
        };

        if (this.state.currentSort) {
            params.sort = this.state.currentSort;
        }

        if (this.state.searchQuery) {
            params.search = this.state.searchQuery;
        }

        return await this.config.loadData(params);
    }

    renderItems(clearExisting = false) {
        const container = this.container.querySelector('.content-container');
        
        if (clearExisting) {
            container.innerHTML = '';
            container.className = `content-container ${this.getLayoutClass()}`;
        }

        if (this.state.items.length === 0) {
            this.showEmptyState();
            return;
        }

        if (this.config.enableAnimations && clearExisting) {
            // Progressive loading for initial render
            this.renderItemsProgressively();
        } else {
            // Immediate render for additional items
            this.state.items.forEach(item => {
                const element = this.createItemElement(item);
                container.appendChild(element);
            });
        }

        if (this.config.enableLazyLoading) {
            this.initializeLazyLoading();
        }
    }

    renderNewItems(newItems) {
        const container = this.container.querySelector('.content-container');
        
        newItems.forEach(item => {
            const element = this.createItemElement(item);
            container.appendChild(element);
            
            if (this.config.enableAnimations) {
                ajaxService.animateIn(element);
            }
        });

        if (this.config.enableLazyLoading) {
            this.initializeLazyLoading();
        }
    }

    renderItemsProgressively() {
        const container = this.container.querySelector('.content-container');
        
        ajaxService.initProgressiveLoading(container, {
            items: this.state.items,
            batchSize: 6,
            delay: 100,
            renderItem: (item) => this.createItemElement(item)
        });
    }

    createItemElement(item) {
        if (!this.config.renderItem) {
            throw new Error('renderItem function not provided');
        }

        const element = this.config.renderItem(item, this.config.layout);
        
        // Add click handler if provided
        if (this.config.onItemClick) {
            element.addEventListener('click', (e) => {
                this.config.onItemClick(item, e);
            });
            element.style.cursor = 'pointer';
        }
        
        return element;
    }

    showEmptyState() {
        const container = this.container.querySelector('.content-container');
        
        if (!this.config.showEmptyState) return;
        
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="${this.config.emptyStateIcon} fa-3x text-muted mb-3"></i>
                <h5>No Content Found</h5>
                <p class="text-muted">${this.config.emptyStateMessage}</p>
            </div>
        `;
    }

    showErrorState(message) {
        const container = this.container.querySelector('.content-container');
        
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-exclamation-triangle fa-3x text-muted mb-3"></i>
                <h5>Error Loading Content</h5>
                <p class="text-muted">${message}</p>
                <button class="btn btn-outline-primary retry-btn">
                    <i class="fas fa-refresh me-2"></i>Try Again
                </button>
            </div>
        `;
        
        // Add retry functionality
        container.querySelector('.retry-btn').addEventListener('click', () => {
            this.loadInitialData();
        });
    }

    hideInitialLoading() {
        const loading = this.container.querySelector('.initial-loading');
        if (loading) {
            loading.remove();
        }
    }

    updateResultsInfo() {
        const container = this.container.querySelector('.results-info');
        const displayedCount = this.state.items.length;
        const total = this.state.totalItems;
        
        container.innerHTML = `
            <span class="text-muted">
                Showing ${displayedCount} of ${total} items
                ${this.state.hasMore ? ' (scroll for more)' : ''}
            </span>
        `;
    }

    initializeInfiniteScroll() {
        const container = this.container.querySelector('.content-container');
        
        this.infiniteScroll = ajaxService.initInfiniteScroll(container, {
            loadMore: () => this.loadMoreData(),
            hasMore: this.state.hasMore,
            threshold: 0.1,
            rootMargin: '100px'
        });
    }

    initializePagination() {
        const container = this.container.querySelector('.pagination-container');
        
        this.pagination = ajaxService.initDynamicPagination(container, {
            loadPage: (page) => this.loadPage(page),
            currentPage: this.state.currentPage,
            totalPages: this.state.totalPages
        });
    }

    initializeLazyLoading() {
        if (this.lazyLoader) {
            this.lazyLoader.destroy();
        }
        
        this.lazyLoader = ajaxService.initLazyLoading(this.config.lazyLoadSelector, {
            threshold: 0.1,
            rootMargin: '50px',
            fadeIn: true
        });
    }

    initializeSearch() {
        const searchInput = this.container.querySelector('.search-input');
        const clearBtn = this.container.querySelector('.clear-search-btn');
        
        if (!searchInput) return;
        
        this.searchDebouncer = ajaxService.initDebouncedSearch(
            searchInput,
            (query) => {
                this.state.searchQuery = query;
                clearBtn.style.display = query ? 'block' : 'none';
                this.resetAndReload();
            },
            this.config.searchDebounceDelay
        );
        
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            this.state.searchQuery = '';
            clearBtn.style.display = 'none';
            this.resetAndReload();
        });
    }

    setupEventListeners() {
        // Layout toggle
        const layoutControls = this.container.querySelectorAll('[data-layout]');
        layoutControls.forEach(control => {
            control.addEventListener('click', (e) => {
                layoutControls.forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                
                this.config.layout = e.target.dataset.layout;
                this.renderItems(true);
            });
        });

        // Sort change
        const sortSelect = this.container.querySelector('.sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.state.currentSort = e.target.value;
                this.resetAndReload();
            });
        }

        // Clear filters
        const clearFiltersBtn = this.container.querySelector('.clear-filters-btn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }
    }

    async loadPage(page) {
        this.state.currentPage = page;
        const response = await this.fetchData(page);
        
        if (response.success) {
            this.state.items = response.data.items || response.data;
            this.renderItems(true);
            this.updateResultsInfo();
        }
        
        return response.data;
    }

    async resetAndReload() {
        this.state.currentPage = 1;
        this.state.hasMore = true;
        this.state.items = [];
        
        if (this.infiniteScroll) {
            this.infiniteScroll.updateConfig({ hasMore: true });
        }
        
        await this.loadInitialData();
    }

    clearFilters() {
        this.state.currentFilters = {};
        this.state.currentSort = '';
        this.state.searchQuery = '';
        
        // Reset form elements
        const sortSelect = this.container.querySelector('.sort-select');
        if (sortSelect) sortSelect.value = '';
        
        const searchInput = this.container.querySelector('.search-input');
        if (searchInput) {
            searchInput.value = '';
            this.container.querySelector('.clear-search-btn').style.display = 'none';
        }
        
        this.resetAndReload();
    }

    // Public API methods
    addFilter(key, value) {
        this.state.currentFilters[key] = value;
        this.resetAndReload();
    }

    removeFilter(key) {
        delete this.state.currentFilters[key];
        this.resetAndReload();
    }

    setSort(sort) {
        this.state.currentSort = sort;
        this.resetAndReload();
    }

    search(query) {
        this.state.searchQuery = query;
        this.resetAndReload();
    }

    refresh() {
        this.resetAndReload();
    }

    destroy() {
        if (this.infiniteScroll) {
            this.infiniteScroll.destroy();
        }
        
        if (this.lazyLoader) {
            this.lazyLoader.destroy();
        }
        
        if (this.pagination) {
            this.pagination.destroy();
        }
        
        if (this.searchDebouncer) {
            this.searchDebouncer.destroy();
        }
    }
}
