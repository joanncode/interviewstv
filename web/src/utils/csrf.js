/**
 * CSRF Protection Utility for Frontend
 */
class CSRFProtection {
    constructor() {
        this.token = null;
        this.tokenExpiry = null;
        this.refreshInterval = null;
        this.config = {
            tokenRefreshInterval: 30 * 60 * 1000, // 30 minutes
            tokenExpiryBuffer: 5 * 60 * 1000, // 5 minutes buffer
            maxRetries: 3,
            retryDelay: 1000
        };
        
        this.init();
    }

    /**
     * Initialize CSRF protection
     */
    init() {
        this.loadTokenFromMeta();
        this.setupTokenRefresh();
        this.setupAjaxInterceptors();
        this.setupFormInterceptors();
    }

    /**
     * Load CSRF token from meta tag
     */
    loadTokenFromMeta() {
        const metaToken = document.querySelector('meta[name="csrf-token"]');
        if (metaToken) {
            this.token = metaToken.getAttribute('content');
            this.tokenExpiry = Date.now() + this.config.tokenRefreshInterval;
        }
    }

    /**
     * Get current CSRF token
     */
    async getToken() {
        if (!this.token || this.isTokenExpiring()) {
            await this.refreshToken();
        }
        return this.token;
    }

    /**
     * Check if token is expiring soon
     */
    isTokenExpiring() {
        if (!this.tokenExpiry) return true;
        return Date.now() > (this.tokenExpiry - this.config.tokenExpiryBuffer);
    }

    /**
     * Refresh CSRF token
     */
    async refreshToken(retryCount = 0) {
        try {
            const response = await fetch('/api/csrf/token', {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.success && data.token) {
                this.token = data.token;
                this.tokenExpiry = Date.now() + this.config.tokenRefreshInterval;
                this.updateMetaTag();
                console.log('CSRF token refreshed successfully');
                return this.token;
            } else {
                throw new Error('Invalid token response');
            }
        } catch (error) {
            console.error('Failed to refresh CSRF token:', error);
            
            if (retryCount < this.config.maxRetries) {
                console.log(`Retrying token refresh (${retryCount + 1}/${this.config.maxRetries})`);
                await this.delay(this.config.retryDelay * (retryCount + 1));
                return this.refreshToken(retryCount + 1);
            }
            
            throw error;
        }
    }

    /**
     * Update meta tag with new token
     */
    updateMetaTag() {
        let metaToken = document.querySelector('meta[name="csrf-token"]');
        if (!metaToken) {
            metaToken = document.createElement('meta');
            metaToken.setAttribute('name', 'csrf-token');
            document.head.appendChild(metaToken);
        }
        metaToken.setAttribute('content', this.token);
    }

    /**
     * Setup automatic token refresh
     */
    setupTokenRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(async () => {
            try {
                await this.refreshToken();
            } catch (error) {
                console.error('Automatic token refresh failed:', error);
            }
        }, this.config.tokenRefreshInterval);
    }

    /**
     * Setup AJAX request interceptors
     */
    setupAjaxInterceptors() {
        // Intercept fetch requests
        const originalFetch = window.fetch;
        window.fetch = async (url, options = {}) => {
            if (this.shouldAddToken(url, options.method)) {
                const token = await this.getToken();
                options.headers = options.headers || {};
                options.headers['X-CSRF-Token'] = token;
            }
            return originalFetch(url, options);
        };

        // Intercept XMLHttpRequest
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function(method, url, ...args) {
            this._method = method;
            this._url = url;
            return originalOpen.call(this, method, url, ...args);
        };

        XMLHttpRequest.prototype.send = async function(data) {
            if (window.csrfProtection && window.csrfProtection.shouldAddToken(this._url, this._method)) {
                const token = await window.csrfProtection.getToken();
                this.setRequestHeader('X-CSRF-Token', token);
            }
            return originalSend.call(this, data);
        };
    }

    /**
     * Setup form interceptors
     */
    setupFormInterceptors() {
        document.addEventListener('submit', async (event) => {
            const form = event.target;
            if (form.tagName !== 'FORM') return;

            const method = (form.method || 'GET').toUpperCase();
            if (!this.shouldAddToken(form.action, method)) return;

            // Check if form already has CSRF token
            const existingToken = form.querySelector('input[name="csrf_token"]');
            if (existingToken) {
                existingToken.value = await this.getToken();
            } else {
                // Add CSRF token to form
                const tokenInput = document.createElement('input');
                tokenInput.type = 'hidden';
                tokenInput.name = 'csrf_token';
                tokenInput.value = await this.getToken();
                form.appendChild(tokenInput);
            }
        });
    }

    /**
     * Check if CSRF token should be added to request
     */
    shouldAddToken(url, method) {
        if (!url || !method) return false;

        method = method.toUpperCase();
        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            return false;
        }

        // Don't add token to external URLs
        if (url.startsWith('http') && !url.startsWith(window.location.origin)) {
            return false;
        }

        return true;
    }

    /**
     * Handle CSRF token validation failure
     */
    handleTokenFailure(response) {
        if (response.status === 403) {
            console.warn('CSRF token validation failed, refreshing token...');
            this.refreshToken().then(() => {
                console.log('Token refreshed, please retry your request');
            }).catch((error) => {
                console.error('Failed to refresh token after validation failure:', error);
                this.showTokenError();
            });
        }
    }

    /**
     * Show token error to user
     */
    showTokenError() {
        // This should integrate with your notification system
        if (window.showNotification) {
            window.showNotification('Security token expired. Please refresh the page.', 'error');
        } else {
            alert('Security token expired. Please refresh the page.');
        }
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Get token for manual use
     */
    async getTokenForForm(action = 'default') {
        try {
            const response = await fetch('/api/csrf/token', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ action })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data.token;
        } catch (error) {
            console.error('Failed to get CSRF token for form:', error);
            throw error;
        }
    }

    /**
     * Validate token without consuming it
     */
    async validateToken(token, action = 'default') {
        try {
            const response = await fetch('/api/csrf/validate', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ token, action })
            });

            if (!response.ok) {
                return false;
            }

            const data = await response.json();
            return data.valid === true;
        } catch (error) {
            console.error('Failed to validate CSRF token:', error);
            return false;
        }
    }
}

// Initialize global CSRF protection
window.csrfProtection = new CSRFProtection();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CSRFProtection;
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.csrfProtection) {
        window.csrfProtection.destroy();
    }
});

// Handle CSRF failures in global error handler
window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.status === 403) {
        window.csrfProtection.handleTokenFailure(event.reason);
    }
});

export default CSRFProtection;
