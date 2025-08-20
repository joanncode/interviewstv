import API from '../services/api.js';
import SearchService from '../services/SearchService.js';

export default class SearchFilters {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            showAdvanced: true,
            showDateRange: true,
            showSorting: true,
            onFiltersChange: () => {},
            ...options
        };
        
        this.filters = {
            type: '',
            category: '',
            tags: '',
            date_from: '',
            date_to: '',
            sort: 'relevance',
            user_id: '',
            verified_only: false,
            has_media: false
        };
        
        this.categories = [];
        this.tags = [];
        this.isExpanded = false;
    }

    async render() {
        await this.loadFilterData();
        this.container.innerHTML = this.getHTML();
        this.setupEventListeners();
        this.updateFiltersFromURL();
    }

    async loadFilterData() {
        try {
            const [categories, tags] = await Promise.all([
                SearchService.getSearchCategories(),
                SearchService.getSearchTags('', null, 50)
            ]);
            
            this.categories = categories;
            this.tags = tags;
        } catch (error) {
            console.error('Failed to load filter data:', error);
        }
    }

    getHTML() {
        return `
            <div class="search-filters">
                <!-- Basic Filters -->
                <div class="basic-filters mb-3">
                    <div class="row g-2">
                        <div class="col-md-3">
                            <select class="form-select form-select-sm" id="filter-type">
                                <option value="">All Types</option>
                                <option value="interview">Interviews</option>
                                <option value="gallery">Galleries</option>
                                <option value="user">Users</option>
                                <option value="event">Events</option>
                                <option value="business">Businesses</option>
                            </select>
                        </div>
                        
                        <div class="col-md-3">
                            <select class="form-select form-select-sm" id="filter-category">
                                <option value="">All Categories</option>
                                ${this.categories.map(cat => `
                                    <option value="${cat.slug}">${cat.name}</option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div class="col-md-3">
                            <select class="form-select form-select-sm" id="filter-sort">
                                <option value="relevance">Most Relevant</option>
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="popular">Most Popular</option>
                                <option value="trending">Trending</option>
                                <option value="most_liked">Most Liked</option>
                                <option value="most_viewed">Most Viewed</option>
                            </select>
                        </div>
                        
                        <div class="col-md-3">
                            <button class="btn btn-outline-secondary btn-sm w-100" 
                                    id="toggle-advanced-filters"
                                    type="button">
                                <i class="fas fa-sliders-h me-1"></i>
                                <span class="filter-toggle-text">More Filters</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Advanced Filters -->
                <div class="advanced-filters collapse" id="advanced-filters">
                    <div class="card card-body">
                        <div class="row g-3">
                            <!-- Tags Filter -->
                            <div class="col-md-6">
                                <label class="form-label small">Tags</label>
                                <div class="tags-input-container">
                                    <input type="text" 
                                           class="form-control form-control-sm" 
                                           id="filter-tags"
                                           placeholder="Enter tags separated by commas">
                                    <div class="tags-suggestions mt-2" id="tags-suggestions" style="display: none;"></div>
                                </div>
                            </div>

                            <!-- Date Range -->
                            <div class="col-md-6">
                                <label class="form-label small">Date Range</label>
                                <div class="row g-2">
                                    <div class="col-6">
                                        <input type="date" 
                                               class="form-control form-control-sm" 
                                               id="filter-date-from"
                                               placeholder="From">
                                    </div>
                                    <div class="col-6">
                                        <input type="date" 
                                               class="form-control form-control-sm" 
                                               id="filter-date-to"
                                               placeholder="To">
                                    </div>
                                </div>
                            </div>

                            <!-- Additional Options -->
                            <div class="col-md-6">
                                <label class="form-label small">Additional Options</label>
                                <div class="form-check">
                                    <input class="form-check-input" 
                                           type="checkbox" 
                                           id="filter-verified-only">
                                    <label class="form-check-label small" for="filter-verified-only">
                                        Verified users only
                                    </label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" 
                                           type="checkbox" 
                                           id="filter-has-media">
                                    <label class="form-check-label small" for="filter-has-media">
                                        Has media content
                                    </label>
                                </div>
                            </div>

                            <!-- Quick Date Presets -->
                            <div class="col-md-6">
                                <label class="form-label small">Quick Date Filters</label>
                                <div class="btn-group-vertical w-100" role="group">
                                    <button type="button" class="btn btn-outline-secondary btn-sm date-preset" data-preset="today">
                                        Today
                                    </button>
                                    <button type="button" class="btn btn-outline-secondary btn-sm date-preset" data-preset="week">
                                        This Week
                                    </button>
                                    <button type="button" class="btn btn-outline-secondary btn-sm date-preset" data-preset="month">
                                        This Month
                                    </button>
                                    <button type="button" class="btn btn-outline-secondary btn-sm date-preset" data-preset="year">
                                        This Year
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Filter Actions -->
                        <div class="row mt-3">
                            <div class="col-12">
                                <div class="d-flex justify-content-between">
                                    <button type="button" class="btn btn-outline-danger btn-sm" id="clear-filters">
                                        <i class="fas fa-times me-1"></i>Clear All
                                    </button>
                                    <button type="button" class="btn btn-primary btn-sm" id="apply-filters">
                                        <i class="fas fa-search me-1"></i>Apply Filters
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Active Filters Display -->
                <div class="active-filters mt-2" id="active-filters" style="display: none;">
                    <div class="d-flex flex-wrap gap-1">
                        <small class="text-muted me-2">Active filters:</small>
                        <div id="active-filters-list"></div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Toggle advanced filters
        const toggleBtn = this.container.querySelector('#toggle-advanced-filters');
        const advancedFilters = this.container.querySelector('#advanced-filters');
        
        toggleBtn.addEventListener('click', () => {
            this.isExpanded = !this.isExpanded;
            
            if (this.isExpanded) {
                advancedFilters.classList.add('show');
                toggleBtn.querySelector('.filter-toggle-text').textContent = 'Fewer Filters';
                toggleBtn.querySelector('i').className = 'fas fa-chevron-up me-1';
            } else {
                advancedFilters.classList.remove('show');
                toggleBtn.querySelector('.filter-toggle-text').textContent = 'More Filters';
                toggleBtn.querySelector('i').className = 'fas fa-sliders-h me-1';
            }
        });

        // Basic filter changes
        ['type', 'category', 'sort'].forEach(filterId => {
            const element = this.container.querySelector(`#filter-${filterId}`);
            if (element) {
                element.addEventListener('change', () => {
                    this.filters[filterId] = element.value;
                    this.updateActiveFilters();
                    this.options.onFiltersChange(this.getActiveFilters());
                });
            }
        });

        // Advanced filter changes
        const tagsInput = this.container.querySelector('#filter-tags');
        if (tagsInput) {
            tagsInput.addEventListener('input', this.debounce(() => {
                this.filters.tags = tagsInput.value;
                this.showTagsSuggestions(tagsInput.value);
            }, 300));

            tagsInput.addEventListener('blur', () => {
                setTimeout(() => {
                    this.hideTagsSuggestions();
                }, 200);
            });
        }

        // Date filters
        ['date_from', 'date_to'].forEach(filterId => {
            const element = this.container.querySelector(`#filter-${filterId.replace('_', '-')}`);
            if (element) {
                element.addEventListener('change', () => {
                    this.filters[filterId] = element.value;
                    this.updateActiveFilters();
                });
            }
        });

        // Checkbox filters
        ['verified_only', 'has_media'].forEach(filterId => {
            const element = this.container.querySelector(`#filter-${filterId.replace('_', '-')}`);
            if (element) {
                element.addEventListener('change', () => {
                    this.filters[filterId] = element.checked;
                    this.updateActiveFilters();
                });
            }
        });

        // Date presets
        const datePresets = this.container.querySelectorAll('.date-preset');
        datePresets.forEach(btn => {
            btn.addEventListener('click', () => {
                this.applyDatePreset(btn.dataset.preset);
            });
        });

        // Clear filters
        const clearBtn = this.container.querySelector('#clear-filters');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }

        // Apply filters
        const applyBtn = this.container.querySelector('#apply-filters');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.options.onFiltersChange(this.getActiveFilters());
            });
        }
    }

    async showTagsSuggestions(query) {
        if (!query || query.length < 2) {
            this.hideTagsSuggestions();
            return;
        }

        try {
            const suggestions = await SearchService.getSearchTags(query, null, 10);
            const container = this.container.querySelector('#tags-suggestions');
            
            if (suggestions.length > 0) {
                container.innerHTML = suggestions.map(tag => `
                    <button type="button" 
                            class="btn btn-sm btn-outline-secondary me-1 mb-1 tag-suggestion"
                            data-tag="${tag.name}">
                        ${tag.name} (${tag.count})
                    </button>
                `).join('');
                
                container.style.display = 'block';
                
                // Add click handlers
                container.querySelectorAll('.tag-suggestion').forEach(btn => {
                    btn.addEventListener('click', () => {
                        this.addTag(btn.dataset.tag);
                    });
                });
            } else {
                this.hideTagsSuggestions();
            }
        } catch (error) {
            console.error('Failed to get tag suggestions:', error);
        }
    }

    hideTagsSuggestions() {
        const container = this.container.querySelector('#tags-suggestions');
        if (container) {
            container.style.display = 'none';
        }
    }

    addTag(tagName) {
        const tagsInput = this.container.querySelector('#filter-tags');
        const currentTags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t);
        
        if (!currentTags.includes(tagName)) {
            currentTags.push(tagName);
            tagsInput.value = currentTags.join(', ');
            this.filters.tags = tagsInput.value;
            this.updateActiveFilters();
        }
        
        this.hideTagsSuggestions();
    }

    applyDatePreset(preset) {
        const now = new Date();
        let fromDate, toDate;

        switch (preset) {
            case 'today':
                fromDate = toDate = now.toISOString().split('T')[0];
                break;
            case 'week':
                fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                toDate = now.toISOString().split('T')[0];
                break;
            case 'month':
                fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                toDate = now.toISOString().split('T')[0];
                break;
            case 'year':
                fromDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
                toDate = now.toISOString().split('T')[0];
                break;
        }

        if (fromDate && toDate) {
            this.container.querySelector('#filter-date-from').value = fromDate;
            this.container.querySelector('#filter-date-to').value = toDate;
            this.filters.date_from = fromDate;
            this.filters.date_to = toDate;
            this.updateActiveFilters();
        }
    }

    clearAllFilters() {
        // Reset filter values
        Object.keys(this.filters).forEach(key => {
            if (typeof this.filters[key] === 'boolean') {
                this.filters[key] = false;
            } else {
                this.filters[key] = '';
            }
        });

        // Reset form elements
        this.container.querySelectorAll('select, input[type="text"], input[type="date"]').forEach(element => {
            element.value = '';
        });

        this.container.querySelectorAll('input[type="checkbox"]').forEach(element => {
            element.checked = false;
        });

        this.updateActiveFilters();
        this.options.onFiltersChange(this.getActiveFilters());
    }

    updateActiveFilters() {
        const activeFiltersContainer = this.container.querySelector('#active-filters');
        const activeFiltersList = this.container.querySelector('#active-filters-list');
        
        const activeFilters = this.getActiveFilters();
        const hasActiveFilters = Object.values(activeFilters).some(value => 
            value !== '' && value !== false && value !== null && value !== undefined
        );

        if (hasActiveFilters) {
            activeFiltersContainer.style.display = 'block';
            activeFiltersList.innerHTML = this.getActiveFiltersHTML(activeFilters);
        } else {
            activeFiltersContainer.style.display = 'none';
        }
    }

    getActiveFiltersHTML(filters) {
        const filterLabels = {
            type: 'Type',
            category: 'Category',
            tags: 'Tags',
            date_from: 'From',
            date_to: 'To',
            sort: 'Sort',
            verified_only: 'Verified Only',
            has_media: 'Has Media'
        };

        return Object.entries(filters)
            .filter(([key, value]) => value !== '' && value !== false)
            .map(([key, value]) => {
                const label = filterLabels[key] || key;
                const displayValue = typeof value === 'boolean' ? '✓' : value;
                
                return `
                    <span class="badge bg-primary me-1">
                        ${label}: ${displayValue}
                        <button type="button" 
                                class="btn-close btn-close-white ms-1" 
                                data-filter="${key}"
                                style="font-size: 0.6em;"></button>
                    </span>
                `;
            }).join('');
    }

    getActiveFilters() {
        const active = {};
        Object.entries(this.filters).forEach(([key, value]) => {
            if (value !== '' && value !== false && value !== null && value !== undefined) {
                active[key] = value;
            }
        });
        return active;
    }

    setFilters(filters) {
        Object.assign(this.filters, filters);
        this.updateFormElements();
        this.updateActiveFilters();
    }

    updateFormElements() {
        Object.entries(this.filters).forEach(([key, value]) => {
            const element = this.container.querySelector(`#filter-${key.replace('_', '-')}`);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            }
        });
    }

    updateFiltersFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlFilters = {};

        ['type', 'category', 'tags', 'date_from', 'date_to', 'sort'].forEach(param => {
            const value = urlParams.get(param);
            if (value) {
                urlFilters[param] = value;
            }
        });

        ['verified_only', 'has_media'].forEach(param => {
            const value = urlParams.get(param);
            if (value === 'true') {
                urlFilters[param] = true;
            }
        });

        if (Object.keys(urlFilters).length > 0) {
            this.setFilters(urlFilters);
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    destroy() {
        // Clean up event listeners if needed
    }
}
