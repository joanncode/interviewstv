/**
 * AJAX Service for Dynamic Content Loading
 * Provides utilities for infinite scroll, lazy loading, and dynamic pagination
 */

export default class AjaxService {
    constructor() {
        this.loadingStates = new Map();
        this.observers = new Map();
        this.debounceTimers = new Map();
    }

    /**
     * Infinite Scroll Implementation
     */
    initInfiniteScroll(container, options = {}) {
        const config = {
            threshold: 0.1,
            rootMargin: '100px',
            loadMore: null,
            hasMore: true,
            loading: false,
            ...options
        };

        const loadingIndicator = this.createLoadingIndicator();
        container.appendChild(loadingIndicator);

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && config.hasMore && !config.loading && config.loadMore) {
                    config.loading = true;
                    this.showLoadingIndicator(loadingIndicator);
                    
                    config.loadMore().then((result) => {
                        config.loading = false;
                        config.hasMore = result.hasMore;
                        
                        if (!result.hasMore) {
                            this.hideLoadingIndicator(loadingIndicator);
                            observer.disconnect();
                        } else {
                            this.hideLoadingIndicator(loadingIndicator);
                        }
                    }).catch((error) => {
                        config.loading = false;
                        this.showErrorIndicator(loadingIndicator, error.message);
                        console.error('Infinite scroll error:', error);
                    });
                }
            });
        }, {
            threshold: config.threshold,
            rootMargin: config.rootMargin
        });

        observer.observe(loadingIndicator);
        this.observers.set(container, observer);

        return {
            destroy: () => {
                observer.disconnect();
                this.observers.delete(container);
                if (loadingIndicator.parentNode) {
                    loadingIndicator.parentNode.removeChild(loadingIndicator);
                }
            },
            updateConfig: (newConfig) => {
                Object.assign(config, newConfig);
            }
        };
    }

    /**
     * Lazy Loading for Images and Media
     */
    initLazyLoading(selector = '[data-lazy]', options = {}) {
        const config = {
            threshold: 0.1,
            rootMargin: '50px',
            fadeIn: true,
            placeholder: '/assets/placeholder.svg',
            ...options
        };

        const elements = document.querySelectorAll(selector);
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadLazyElement(entry.target, config);
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: config.threshold,
            rootMargin: config.rootMargin
        });

        elements.forEach(element => {
            // Set placeholder if not already set
            if (!element.src && config.placeholder) {
                element.src = config.placeholder;
                element.classList.add('lazy-loading');
            }
            observer.observe(element);
        });

        return {
            destroy: () => observer.disconnect(),
            observe: (element) => observer.observe(element)
        };
    }

    /**
     * Dynamic Pagination
     */
    initDynamicPagination(container, options = {}) {
        const config = {
            loadPage: null,
            currentPage: 1,
            totalPages: 1,
            showNumbers: true,
            showPrevNext: true,
            maxVisible: 5,
            ...options
        };

        const paginationContainer = this.createPaginationContainer();
        container.appendChild(paginationContainer);

        const updatePagination = () => {
            this.renderPagination(paginationContainer, config);
        };

        // Initial render
        updatePagination();

        // Handle pagination clicks
        paginationContainer.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const pageLink = e.target.closest('[data-page]');
            if (!pageLink) return;

            const page = parseInt(pageLink.dataset.page);
            if (page === config.currentPage || isNaN(page)) return;

            try {
                this.showPaginationLoading(paginationContainer);
                
                const result = await config.loadPage(page);
                config.currentPage = page;
                config.totalPages = result.totalPages || config.totalPages;
                
                updatePagination();
                
                // Scroll to top of content
                container.scrollIntoView({ behavior: 'smooth', block: 'start' });
                
            } catch (error) {
                console.error('Pagination error:', error);
                this.showPaginationError(paginationContainer, error.message);
            }
        });

        return {
            destroy: () => {
                if (paginationContainer.parentNode) {
                    paginationContainer.parentNode.removeChild(paginationContainer);
                }
            },
            updateConfig: (newConfig) => {
                Object.assign(config, newConfig);
                updatePagination();
            },
            goToPage: (page) => {
                if (page >= 1 && page <= config.totalPages && page !== config.currentPage) {
                    config.loadPage(page).then((result) => {
                        config.currentPage = page;
                        config.totalPages = result.totalPages || config.totalPages;
                        updatePagination();
                    });
                }
            }
        };
    }

    /**
     * Content Preloading
     */
    preloadContent(urls, options = {}) {
        const config = {
            priority: 'low',
            timeout: 10000,
            ...options
        };

        const promises = urls.map(url => {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.timeout = config.timeout;
                
                xhr.onload = () => {
                    if (xhr.status === 200) {
                        resolve({ url, data: xhr.responseText });
                    } else {
                        reject(new Error(`Failed to preload ${url}: ${xhr.status}`));
                    }
                };
                
                xhr.onerror = () => reject(new Error(`Network error preloading ${url}`));
                xhr.ontimeout = () => reject(new Error(`Timeout preloading ${url}`));
                
                xhr.send();
            });
        });

        return Promise.allSettled(promises);
    }

    /**
     * Debounced Search
     */
    initDebouncedSearch(input, callback, delay = 300) {
        const timerId = `search_${Date.now()}`;
        
        const handleInput = (e) => {
            const query = e.target.value.trim();
            
            // Clear previous timer
            if (this.debounceTimers.has(timerId)) {
                clearTimeout(this.debounceTimers.get(timerId));
            }
            
            // Set new timer
            const timer = setTimeout(() => {
                callback(query);
                this.debounceTimers.delete(timerId);
            }, delay);
            
            this.debounceTimers.set(timerId, timer);
        };

        input.addEventListener('input', handleInput);

        return {
            destroy: () => {
                input.removeEventListener('input', handleInput);
                if (this.debounceTimers.has(timerId)) {
                    clearTimeout(this.debounceTimers.get(timerId));
                    this.debounceTimers.delete(timerId);
                }
            }
        };
    }

    /**
     * Progressive Loading
     */
    initProgressiveLoading(container, options = {}) {
        const config = {
            batchSize: 10,
            delay: 100,
            items: [],
            renderItem: null,
            ...options
        };

        let currentIndex = 0;
        let isLoading = false;

        const loadBatch = () => {
            if (isLoading || currentIndex >= config.items.length) return;
            
            isLoading = true;
            const batch = config.items.slice(currentIndex, currentIndex + config.batchSize);
            
            batch.forEach((item, index) => {
                setTimeout(() => {
                    if (config.renderItem) {
                        const element = config.renderItem(item);
                        if (element) {
                            container.appendChild(element);
                            this.animateIn(element);
                        }
                    }
                    
                    if (index === batch.length - 1) {
                        currentIndex += config.batchSize;
                        isLoading = false;
                        
                        // Continue loading if there are more items
                        if (currentIndex < config.items.length) {
                            setTimeout(loadBatch, config.delay);
                        }
                    }
                }, index * 50); // Stagger the animations
            });
        };

        // Start loading
        loadBatch();

        return {
            destroy: () => {
                isLoading = false;
            },
            addItems: (newItems) => {
                config.items.push(...newItems);
                if (!isLoading) {
                    loadBatch();
                }
            }
        };
    }

    /**
     * Helper Methods
     */
    createLoadingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'ajax-loading-indicator text-center py-4';
        indicator.innerHTML = `
            <div class="loading-content">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <div class="loading-text mt-2 text-muted">Loading more content...</div>
            </div>
            <div class="error-content" style="display: none;">
                <i class="fas fa-exclamation-triangle text-warning fa-2x mb-2"></i>
                <div class="error-text text-muted">Failed to load content</div>
                <button class="btn btn-sm btn-outline-primary mt-2 retry-btn">Try Again</button>
            </div>
        `;
        return indicator;
    }

    createPaginationContainer() {
        const container = document.createElement('nav');
        container.className = 'ajax-pagination mt-4';
        container.setAttribute('aria-label', 'Dynamic pagination');
        return container;
    }

    showLoadingIndicator(indicator) {
        const loading = indicator.querySelector('.loading-content');
        const error = indicator.querySelector('.error-content');
        
        loading.style.display = 'block';
        error.style.display = 'none';
        indicator.style.display = 'block';
    }

    hideLoadingIndicator(indicator) {
        indicator.style.display = 'none';
    }

    showErrorIndicator(indicator, message) {
        const loading = indicator.querySelector('.loading-content');
        const error = indicator.querySelector('.error-content');
        const errorText = error.querySelector('.error-text');
        
        loading.style.display = 'none';
        error.style.display = 'block';
        errorText.textContent = message;
        indicator.style.display = 'block';
    }

    async loadLazyElement(element, config) {
        const src = element.dataset.lazy;
        if (!src) return;

        try {
            // For images
            if (element.tagName === 'IMG') {
                await this.loadImage(src);
                element.src = src;
                element.classList.remove('lazy-loading');
                element.classList.add('lazy-loaded');
                
                if (config.fadeIn) {
                    this.fadeIn(element);
                }
            }
            // For other elements with background images
            else if (element.dataset.lazyBg) {
                element.style.backgroundImage = `url(${src})`;
                element.classList.remove('lazy-loading');
                element.classList.add('lazy-loaded');
            }
            
        } catch (error) {
            console.error('Failed to load lazy element:', error);
            element.classList.add('lazy-error');
        }
    }

    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = reject;
            img.src = src;
        });
    }

    renderPagination(container, config) {
        const { currentPage, totalPages, maxVisible, showNumbers, showPrevNext } = config;
        
        let html = '<ul class="pagination justify-content-center">';
        
        // Previous button
        if (showPrevNext) {
            const disabled = currentPage === 1 ? 'disabled' : '';
            html += `
                <li class="page-item ${disabled}">
                    <a class="page-link" href="#" data-page="${currentPage - 1}">
                        <i class="fas fa-chevron-left"></i>
                    </a>
                </li>
            `;
        }
        
        // Page numbers
        if (showNumbers) {
            const startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
            const endPage = Math.min(totalPages, startPage + maxVisible - 1);
            
            for (let i = startPage; i <= endPage; i++) {
                const active = i === currentPage ? 'active' : '';
                html += `
                    <li class="page-item ${active}">
                        <a class="page-link" href="#" data-page="${i}">${i}</a>
                    </li>
                `;
            }
        }
        
        // Next button
        if (showPrevNext) {
            const disabled = currentPage === totalPages ? 'disabled' : '';
            html += `
                <li class="page-item ${disabled}">
                    <a class="page-link" href="#" data-page="${currentPage + 1}">
                        <i class="fas fa-chevron-right"></i>
                    </a>
                </li>
            `;
        }
        
        html += '</ul>';
        container.innerHTML = html;
    }

    showPaginationLoading(container) {
        const pagination = container.querySelector('.pagination');
        if (pagination) {
            pagination.style.opacity = '0.5';
            pagination.style.pointerEvents = 'none';
        }
    }

    showPaginationError(container, message) {
        // Reset pagination state
        const pagination = container.querySelector('.pagination');
        if (pagination) {
            pagination.style.opacity = '1';
            pagination.style.pointerEvents = 'auto';
        }
        
        // Show error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-warning mt-2';
        errorDiv.textContent = `Pagination error: ${message}`;
        container.appendChild(errorDiv);
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    fadeIn(element) {
        element.style.opacity = '0';
        element.style.transition = 'opacity 0.3s ease-in-out';
        
        requestAnimationFrame(() => {
            element.style.opacity = '1';
        });
    }

    animateIn(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
        
        requestAnimationFrame(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        });
    }

    /**
     * Cleanup method
     */
    destroy() {
        // Clear all observers
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
        
        // Clear all timers
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
        
        // Clear loading states
        this.loadingStates.clear();
    }
}

// Create singleton instance
const ajaxService = new AjaxService();
export { ajaxService };
