import API from '../services/api.js';
import Router from '../utils/router.js';

class SearchBox {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            placeholder: 'Search interviews, galleries, users...',
            showSuggestions: true,
            showFilters: false,
            autoFocus: false,
            ...options
        };
        this.suggestions = [];
        this.isLoading = false;
        this.searchTimeout = null;
    }

    render() {
        this.container.innerHTML = this.getHTML();
        this.setupEventListeners();
        
        if (this.options.autoFocus) {
            const input = this.container.querySelector('.search-input');
            if (input) input.focus();
        }
    }

    getHTML() {
        return `
            <div class="search-box">
                <div class="search-input-container position-relative">
                    <div class="input-group">
                        <span class="input-group-text bg-white border-end-0">
                            <i class="fas fa-search text-muted"></i>
                        </span>
                        <input type="text" 
                               class="form-control search-input border-start-0" 
                               placeholder="${this.options.placeholder}"
                               autocomplete="off">
                        <button class="btn btn-outline-secondary search-clear-btn" 
                                type="button" 
                                style="display: none;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    ${this.options.showSuggestions ? `
                        <div class="search-suggestions position-absolute w-100 bg-white border rounded-bottom shadow-sm" 
                             style="display: none; z-index: 1000; top: 100%;">
                            <div class="suggestions-list"></div>
                        </div>
                    ` : ''}
                </div>
                
                ${this.options.showFilters ? this.getFiltersHTML() : ''}
            </div>
        `;
    }

    getFiltersHTML() {
        return `
            <div class="search-filters mt-2">
                <div class="row g-2">
                    <div class="col-md-3">
                        <select class="form-select form-select-sm" id="search-type">
                            <option value="">All Types</option>
                            <option value="interview">Interviews</option>
                            <option value="gallery">Galleries</option>
                            <option value="user">Users</option>
                            <option value="business">Businesses</option>
                            <option value="event">Events</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <select class="form-select form-select-sm" id="search-category">
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
                    <div class="col-md-3">
                        <select class="form-select form-select-sm" id="search-sort">
                            <option value="relevance">Most Relevant</option>
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="popular">Most Popular</option>
                            <option value="most_liked">Most Liked</option>
                            <option value="most_commented">Most Commented</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <button class="btn btn-outline-primary btn-sm w-100" id="advanced-search-btn">
                            <i class="fas fa-sliders-h me-1"></i>Advanced
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const input = this.container.querySelector('.search-input');
        const clearBtn = this.container.querySelector('.search-clear-btn');
        const suggestionsContainer = this.container.querySelector('.search-suggestions');

        // Input events
        if (input) {
            input.addEventListener('input', (e) => {
                this.handleInput(e.target.value);
            });

            input.addEventListener('keydown', (e) => {
                this.handleKeydown(e);
            });

            input.addEventListener('focus', () => {
                if (this.suggestions.length > 0) {
                    this.showSuggestions();
                }
            });

            input.addEventListener('blur', () => {
                // Delay hiding to allow clicking on suggestions
                setTimeout(() => this.hideSuggestions(), 150);
            });
        }

        // Clear button
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearSearch();
            });
        }

        // Filter events
        if (this.options.showFilters) {
            const filterElements = this.container.querySelectorAll('#search-type, #search-category, #search-sort');
            filterElements.forEach(element => {
                element.addEventListener('change', () => {
                    this.handleFilterChange();
                });
            });

            const advancedBtn = this.container.querySelector('#advanced-search-btn');
            if (advancedBtn) {
                advancedBtn.addEventListener('click', () => {
                    this.showAdvancedSearch();
                });
            }
        }

        // Click outside to hide suggestions
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.hideSuggestions();
            }
        });
    }

    async handleInput(value) {
        const input = this.container.querySelector('.search-input');
        const clearBtn = this.container.querySelector('.search-clear-btn');

        // Show/hide clear button
        if (clearBtn) {
            clearBtn.style.display = value ? 'block' : 'none';
        }

        // Handle suggestions
        if (this.options.showSuggestions && value.length >= 2) {
            // Debounce suggestions
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.loadSuggestions(value);
            }, 300);
        } else {
            this.hideSuggestions();
        }

        // Trigger search on Enter or when value is cleared
        if (value === '') {
            this.triggerSearch('');
        }
    }

    handleKeydown(e) {
        const suggestionsContainer = this.container.querySelector('.search-suggestions');
        
        if (e.key === 'Enter') {
            e.preventDefault();
            const input = this.container.querySelector('.search-input');
            this.triggerSearch(input.value);
            this.hideSuggestions();
        } else if (e.key === 'Escape') {
            this.hideSuggestions();
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            this.navigateSuggestions(e.key === 'ArrowDown' ? 1 : -1);
        }
    }

    async loadSuggestions(query) {
        if (this.isLoading) return;

        try {
            this.isLoading = true;
            
            const response = await API.get('/api/search/suggestions', { q: query });
            
            if (response.success) {
                this.suggestions = response.data;
                this.renderSuggestions();
                this.showSuggestions();
            }
        } catch (error) {
            console.error('Failed to load suggestions:', error);
        } finally {
            this.isLoading = false;
        }
    }

    renderSuggestions() {
        const listContainer = this.container.querySelector('.suggestions-list');
        
        if (!listContainer || this.suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }

        listContainer.innerHTML = this.suggestions.map((suggestion, index) => `
            <div class="suggestion-item px-3 py-2 cursor-pointer" data-index="${index}">
                <i class="fas fa-search text-muted me-2"></i>
                ${this.highlightQuery(suggestion)}
            </div>
        `).join('');

        // Add click handlers
        listContainer.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                this.selectSuggestion(index);
            });

            item.addEventListener('mouseenter', (e) => {
                this.highlightSuggestion(parseInt(e.currentTarget.getAttribute('data-index')));
            });
        });
    }

    highlightQuery(suggestion) {
        const input = this.container.querySelector('.search-input');
        const query = input.value.toLowerCase();
        
        if (!query) return suggestion;
        
        const index = suggestion.toLowerCase().indexOf(query);
        if (index === -1) return suggestion;
        
        return suggestion.substring(0, index) + 
               '<strong>' + suggestion.substring(index, index + query.length) + '</strong>' + 
               suggestion.substring(index + query.length);
    }

    showSuggestions() {
        const suggestionsContainer = this.container.querySelector('.search-suggestions');
        if (suggestionsContainer && this.suggestions.length > 0) {
            suggestionsContainer.style.display = 'block';
        }
    }

    hideSuggestions() {
        const suggestionsContainer = this.container.querySelector('.search-suggestions');
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
    }

    navigateSuggestions(direction) {
        const items = this.container.querySelectorAll('.suggestion-item');
        const current = this.container.querySelector('.suggestion-item.active');
        
        let newIndex = 0;
        
        if (current) {
            const currentIndex = parseInt(current.getAttribute('data-index'));
            newIndex = currentIndex + direction;
        } else {
            newIndex = direction > 0 ? 0 : items.length - 1;
        }
        
        // Wrap around
        if (newIndex < 0) newIndex = items.length - 1;
        if (newIndex >= items.length) newIndex = 0;
        
        this.highlightSuggestion(newIndex);
    }

    highlightSuggestion(index) {
        const items = this.container.querySelectorAll('.suggestion-item');
        
        items.forEach(item => item.classList.remove('active', 'bg-light'));
        
        if (items[index]) {
            items[index].classList.add('active', 'bg-light');
        }
    }

    selectSuggestion(index) {
        if (this.suggestions[index]) {
            const input = this.container.querySelector('.search-input');
            input.value = this.suggestions[index];
            this.triggerSearch(this.suggestions[index]);
            this.hideSuggestions();
        }
    }

    clearSearch() {
        const input = this.container.querySelector('.search-input');
        const clearBtn = this.container.querySelector('.search-clear-btn');
        
        input.value = '';
        clearBtn.style.display = 'none';
        this.hideSuggestions();
        this.triggerSearch('');
        input.focus();
    }

    triggerSearch(query) {
        const filters = this.getFilters();
        
        // Navigate to search results page
        const params = new URLSearchParams();
        
        if (query) {
            params.set('q', query);
        }
        
        Object.keys(filters).forEach(key => {
            if (filters[key]) {
                params.set(key, filters[key]);
            }
        });
        
        const searchUrl = '/search' + (params.toString() ? '?' + params.toString() : '');
        Router.navigate(searchUrl);
        
        // Trigger custom event
        this.container.dispatchEvent(new CustomEvent('search', {
            detail: { query, filters }
        }));
    }

    getFilters() {
        if (!this.options.showFilters) return {};
        
        return {
            type: this.container.querySelector('#search-type')?.value || '',
            category: this.container.querySelector('#search-category')?.value || '',
            sort: this.container.querySelector('#search-sort')?.value || 'relevance'
        };
    }

    handleFilterChange() {
        const input = this.container.querySelector('.search-input');
        if (input.value) {
            this.triggerSearch(input.value);
        }
    }

    showAdvancedSearch() {
        // TODO: Implement advanced search modal
        console.log('Advanced search modal will be implemented');
    }

    setValue(value) {
        const input = this.container.querySelector('.search-input');
        if (input) {
            input.value = value;
            this.handleInput(value);
        }
    }

    getValue() {
        const input = this.container.querySelector('.search-input');
        return input ? input.value : '';
    }

    setFilters(filters) {
        if (!this.options.showFilters) return;
        
        Object.keys(filters).forEach(key => {
            const element = this.container.querySelector(`#search-${key}`);
            if (element) {
                element.value = filters[key] || '';
            }
        });
    }

    focus() {
        const input = this.container.querySelector('.search-input');
        if (input) input.focus();
    }
}

export default SearchBox;
