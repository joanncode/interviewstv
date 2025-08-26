import Router from '../../utils/router.js';
import { securityService } from '../../services/security.js';

class NotFoundPage {
    constructor() {
        this.searchSuggestions = [];
        this.relatedContent = [];
    }

    async render(container, props = {}) {
        const currentPath = window.location.pathname;
        
        // Log 404 for analytics
        this.log404Error(currentPath);
        
        // Get search suggestions
        await this.loadSearchSuggestions(currentPath);
        
        // Get related content
        await this.loadRelatedContent();
        
        container.innerHTML = this.getHTML(currentPath);
        this.setupEventListeners(container);
    }

    getHTML(path) {
        return `
            <div class="error-page-container">
                <div class="container py-5">
                    <div class="row justify-content-center">
                        <div class="col-lg-8 text-center">
                            <!-- 404 Hero Section -->
                            <div class="error-hero mb-5">
                                <div class="error-code">404</div>
                                <h1 class="error-title">Page Not Found</h1>
                                <p class="error-description">
                                    Sorry, we couldn't find the page you're looking for.
                                    <br>
                                    <code class="text-muted">${this.escapeHtml(path)}</code>
                                </p>
                            </div>

                            <!-- Search Box -->
                            <div class="error-search mb-5">
                                <div class="input-group input-group-lg">
                                    <input type="text" 
                                           class="form-control" 
                                           id="error-search-input"
                                           placeholder="Search for interviews, users, or content..."
                                           autocomplete="off">
                                    <button class="btn btn-primary" type="button" id="error-search-btn">
                                        <i class="fas fa-search"></i>
                                    </button>
                                </div>
                                <div id="search-suggestions" class="search-suggestions mt-2"></div>
                            </div>

                            <!-- Quick Actions -->
                            <div class="error-actions mb-5">
                                <h5 class="mb-3">What would you like to do?</h5>
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <a href="/" class="btn btn-outline-primary w-100">
                                            <i class="fas fa-home mb-2 d-block"></i>
                                            Go Home
                                        </a>
                                    </div>
                                    <div class="col-md-3">
                                        <a href="/explore" class="btn btn-outline-primary w-100">
                                            <i class="fas fa-compass mb-2 d-block"></i>
                                            Explore
                                        </a>
                                    </div>
                                    <div class="col-md-3">
                                        <a href="/interviews" class="btn btn-outline-primary w-100">
                                            <i class="fas fa-video mb-2 d-block"></i>
                                            Interviews
                                        </a>
                                    </div>
                                    <div class="col-md-3">
                                        <button class="btn btn-outline-secondary w-100" onclick="history.back()">
                                            <i class="fas fa-arrow-left mb-2 d-block"></i>
                                            Go Back
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Search Suggestions -->
                            ${this.searchSuggestions.length > 0 ? `
                                <div class="error-suggestions mb-5">
                                    <h5 class="mb-3">Did you mean?</h5>
                                    <div class="list-group">
                                        ${this.searchSuggestions.map(suggestion => `
                                            <a href="${suggestion.url}" class="list-group-item list-group-item-action">
                                                <div class="d-flex align-items-center">
                                                    <i class="${suggestion.icon} me-3"></i>
                                                    <div>
                                                        <h6 class="mb-1">${suggestion.title}</h6>
                                                        <small class="text-muted">${suggestion.description}</small>
                                                    </div>
                                                </div>
                                            </a>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}

                            <!-- Related Content -->
                            ${this.relatedContent.length > 0 ? `
                                <div class="error-related">
                                    <h5 class="mb-3">You might be interested in</h5>
                                    <div class="row g-3">
                                        ${this.relatedContent.map(content => `
                                            <div class="col-md-4">
                                                <div class="card h-100">
                                                    ${content.thumbnail ? `
                                                        <img src="${content.thumbnail}" class="card-img-top" alt="${content.title}">
                                                    ` : ''}
                                                    <div class="card-body">
                                                        <h6 class="card-title">${content.title}</h6>
                                                        <p class="card-text small text-muted">${content.description}</p>
                                                        <a href="${content.url}" class="btn btn-sm btn-outline-primary">
                                                            View ${content.type}
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}

                            <!-- Help Section -->
                            <div class="error-help mt-5">
                                <div class="card">
                                    <div class="card-body">
                                        <h5 class="card-title">Need Help?</h5>
                                        <p class="card-text">
                                            If you believe this is an error or you were expecting to find content here, 
                                            please let us know.
                                        </p>
                                        <div class="btn-group">
                                            <a href="/contact" class="btn btn-outline-primary">
                                                <i class="fas fa-envelope me-2"></i>Contact Support
                                            </a>
                                            <button class="btn btn-outline-secondary" id="report-error-btn">
                                                <i class="fas fa-bug me-2"></i>Report Error
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .error-page-container {
                    min-height: 80vh;
                    display: flex;
                    align-items: center;
                }

                .error-code {
                    font-size: 8rem;
                    font-weight: 900;
                    color: var(--primary-red);
                    line-height: 1;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                }

                .error-title {
                    font-size: 2.5rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 1rem;
                }

                .error-description {
                    font-size: 1.1rem;
                    color: var(--text-secondary);
                    margin-bottom: 2rem;
                }

                .error-search .form-control {
                    background-color: var(--input-background);
                    border-color: var(--input-border);
                    color: var(--text-primary);
                }

                .error-search .form-control:focus {
                    background-color: var(--input-background);
                    border-color: var(--primary-red);
                    color: var(--text-primary);
                    box-shadow: 0 0 0 0.2rem rgba(255, 0, 0, 0.25);
                }

                .search-suggestions {
                    max-height: 200px;
                    overflow-y: auto;
                }

                .search-suggestion-item {
                    padding: 0.5rem 1rem;
                    background-color: var(--card-background);
                    border: 1px solid var(--card-border);
                    color: var(--text-primary);
                    text-decoration: none;
                    display: block;
                    transition: all 0.2s ease;
                }

                .search-suggestion-item:hover {
                    background-color: var(--hover-background);
                    color: var(--text-primary);
                    text-decoration: none;
                }

                .error-actions .btn {
                    padding: 1rem;
                    border-radius: 0.5rem;
                    transition: all 0.2s ease;
                }

                .error-actions .btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(255, 0, 0, 0.2);
                }

                .list-group-item {
                    background-color: var(--card-background);
                    border-color: var(--card-border);
                    color: var(--text-primary);
                }

                .list-group-item:hover {
                    background-color: var(--hover-background);
                    color: var(--text-primary);
                }

                .card {
                    background-color: var(--card-background);
                    border-color: var(--card-border);
                    color: var(--text-primary);
                }

                @media (max-width: 768px) {
                    .error-code {
                        font-size: 5rem;
                    }
                    
                    .error-title {
                        font-size: 2rem;
                    }
                    
                    .error-actions .btn {
                        margin-bottom: 0.5rem;
                    }
                }
            </style>
        `;
    }

    async loadSearchSuggestions(path) {
        try {
            // Extract potential search terms from the path
            const pathParts = path.split('/').filter(part => part.length > 0);
            const searchTerms = pathParts.join(' ');

            if (searchTerms.length > 2) {
                // Simulate search suggestions based on path
                this.searchSuggestions = [
                    {
                        title: `Search for "${searchTerms}"`,
                        description: 'Find interviews and content related to your search',
                        url: `/search?q=${encodeURIComponent(searchTerms)}`,
                        icon: 'fas fa-search'
                    }
                ];

                // Add common suggestions based on path patterns
                if (path.includes('interview')) {
                    this.searchSuggestions.push({
                        title: 'Browse All Interviews',
                        description: 'Explore our complete interview library',
                        url: '/interviews',
                        icon: 'fas fa-video'
                    });
                }

                if (path.includes('business')) {
                    this.searchSuggestions.push({
                        title: 'Business Directory',
                        description: 'Find businesses and entrepreneurs',
                        url: '/businesses',
                        icon: 'fas fa-building'
                    });
                }

                if (path.includes('profile') || path.includes('user')) {
                    this.searchSuggestions.push({
                        title: 'Discover Users',
                        description: 'Find interesting people to follow',
                        url: '/discover',
                        icon: 'fas fa-users'
                    });
                }
            }
        } catch (error) {
            console.error('Failed to load search suggestions:', error);
        }
    }

    async loadRelatedContent() {
        try {
            // Load popular content as related content
            this.relatedContent = [
                {
                    title: 'Featured Interviews',
                    description: 'Hand-picked interviews from our community',
                    url: '/featured',
                    type: 'Collection',
                    thumbnail: null
                },
                {
                    title: 'Trending Now',
                    description: 'Most popular content this week',
                    url: '/trending',
                    type: 'Collection',
                    thumbnail: null
                },
                {
                    title: 'Latest Interviews',
                    description: 'Recently published interviews',
                    url: '/interviews?sort=latest',
                    type: 'Collection',
                    thumbnail: null
                }
            ];
        } catch (error) {
            console.error('Failed to load related content:', error);
        }
    }

    setupEventListeners(container) {
        // Search functionality
        const searchInput = container.querySelector('#error-search-input');
        const searchBtn = container.querySelector('#error-search-btn');
        const suggestionsContainer = container.querySelector('#search-suggestions');

        if (searchInput && searchBtn) {
            const performSearch = () => {
                const query = searchInput.value.trim();
                if (query) {
                    Router.navigate(`/search?q=${encodeURIComponent(query)}`);
                }
            };

            searchBtn.addEventListener('click', performSearch);
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    performSearch();
                }
            });

            // Live search suggestions
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                const query = e.target.value.trim();

                if (query.length > 2) {
                    searchTimeout = setTimeout(() => {
                        this.showLiveSearchSuggestions(query, suggestionsContainer);
                    }, 300);
                } else {
                    suggestionsContainer.innerHTML = '';
                }
            });
        }

        // Report error functionality
        const reportErrorBtn = container.querySelector('#report-error-btn');
        if (reportErrorBtn) {
            reportErrorBtn.addEventListener('click', () => {
                this.reportError();
            });
        }
    }

    async showLiveSearchSuggestions(query, container) {
        try {
            // Simulate live search suggestions
            const suggestions = [
                `Search for "${query}"`,
                `"${query}" in interviews`,
                `"${query}" in businesses`,
                `"${query}" in users`
            ];

            container.innerHTML = suggestions.map(suggestion => `
                <a href="/search?q=${encodeURIComponent(suggestion)}" class="search-suggestion-item">
                    <i class="fas fa-search me-2"></i>${suggestion}
                </a>
            `).join('');
        } catch (error) {
            console.error('Failed to load live search suggestions:', error);
        }
    }

    log404Error(path) {
        try {
            // Log 404 error for analytics
            securityService.logSecurityEvent('404_error', {
                path: path,
                referrer: document.referrer,
                user_agent: navigator.userAgent,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Failed to log 404 error:', error);
        }
    }

    reportError() {
        try {
            const errorData = {
                type: '404_error',
                path: window.location.pathname,
                referrer: document.referrer,
                user_agent: navigator.userAgent,
                timestamp: new Date().toISOString()
            };

            // Send error report
            fetch('/api/errors/report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(errorData)
            }).then(() => {
                alert('Error reported successfully. Thank you for helping us improve!');
            }).catch(() => {
                alert('Failed to report error. Please try contacting support directly.');
            });
        } catch (error) {
            console.error('Failed to report error:', error);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

export default NotFoundPage;
