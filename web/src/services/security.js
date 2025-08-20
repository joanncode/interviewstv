/**
 * Frontend Security Service
 * Handles client-side security measures and monitoring
 */

export default class SecurityService {
    constructor() {
        this.csrfToken = null;
        this.securityHeaders = new Map();
        this.securityEvents = [];
        this.isMonitoring = false;
        this.rateLimits = new Map();
    }

    /**
     * Initialize security service
     */
    init() {
        this.loadCsrfToken();
        this.setupSecurityHeaders();
        this.setupContentSecurityPolicy();
        this.setupSecurityMonitoring();
        this.setupInputSanitization();
        this.isMonitoring = true;
        
        console.log('Security service initialized');
    }

    /**
     * Load CSRF token from meta tag
     */
    loadCsrfToken() {
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        if (metaTag) {
            this.csrfToken = metaTag.getAttribute('content');
        }
    }

    /**
     * Get CSRF token
     */
    getCsrfToken() {
        return this.csrfToken;
    }

    /**
     * Set CSRF token for requests
     */
    setCsrfToken(token) {
        this.csrfToken = token;
        
        // Update meta tag
        let metaTag = document.querySelector('meta[name="csrf-token"]');
        if (!metaTag) {
            metaTag = document.createElement('meta');
            metaTag.name = 'csrf-token';
            document.head.appendChild(metaTag);
        }
        metaTag.content = token;
    }

    /**
     * Setup security headers for requests
     */
    setupSecurityHeaders() {
        this.securityHeaders.set('X-Requested-With', 'XMLHttpRequest');
        this.securityHeaders.set('X-Content-Type-Options', 'nosniff');
        
        if (this.csrfToken) {
            this.securityHeaders.set('X-CSRF-Token', this.csrfToken);
        }
    }

    /**
     * Get security headers for requests
     */
    getSecurityHeaders() {
        const headers = {};
        for (const [key, value] of this.securityHeaders) {
            headers[key] = value;
        }
        return headers;
    }

    /**
     * Setup Content Security Policy
     */
    setupContentSecurityPolicy() {
        // Monitor CSP violations
        document.addEventListener('securitypolicyviolation', (event) => {
            this.logSecurityEvent('csp_violation', 'high', {
                violatedDirective: event.violatedDirective,
                blockedURI: event.blockedURI,
                documentURI: event.documentURI,
                lineNumber: event.lineNumber,
                sourceFile: event.sourceFile
            });
        });
    }

    /**
     * Setup security monitoring
     */
    setupSecurityMonitoring() {
        // Monitor for XSS attempts
        this.setupXssMonitoring();
        
        // Monitor for suspicious DOM manipulation
        this.setupDomMonitoring();
        
        // Monitor for suspicious network requests
        this.setupNetworkMonitoring();
        
        // Monitor for console access attempts
        this.setupConsoleMonitoring();
    }

    /**
     * Setup XSS monitoring
     */
    setupXssMonitoring() {
        // Override dangerous functions
        const originalEval = window.eval;
        window.eval = function(code) {
            securityService.logSecurityEvent('eval_usage', 'high', {
                code: code.substring(0, 100),
                stack: new Error().stack
            });
            return originalEval.call(this, code);
        };

        // Monitor for script injection
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName === 'SCRIPT') {
                            this.logSecurityEvent('script_injection', 'critical', {
                                src: node.src,
                                innerHTML: node.innerHTML.substring(0, 100)
                            });
                        }
                        
                        // Check for suspicious attributes
                        if (node.attributes) {
                            for (const attr of node.attributes) {
                                if (attr.name.startsWith('on') || 
                                    attr.value.includes('javascript:') ||
                                    attr.value.includes('data:')) {
                                    this.logSecurityEvent('suspicious_attribute', 'high', {
                                        tagName: node.tagName,
                                        attribute: attr.name,
                                        value: attr.value.substring(0, 100)
                                    });
                                }
                            }
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true
        });
    }

    /**
     * Setup DOM monitoring
     */
    setupDomMonitoring() {
        // Monitor for suspicious iframe injections
        const iframeObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'IFRAME') {
                        const src = node.src || node.getAttribute('src');
                        if (src && !this.isAllowedDomain(src)) {
                            this.logSecurityEvent('suspicious_iframe', 'high', {
                                src: src,
                                parentElement: node.parentElement?.tagName
                            });
                        }
                    }
                });
            });
        });

        iframeObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Setup network monitoring
     */
    setupNetworkMonitoring() {
        // Override fetch to monitor requests
        const originalFetch = window.fetch;
        window.fetch = async function(url, options = {}) {
            // Check for suspicious requests
            if (typeof url === 'string') {
                if (!securityService.isAllowedDomain(url)) {
                    securityService.logSecurityEvent('suspicious_request', 'medium', {
                        url: url,
                        method: options.method || 'GET'
                    });
                }
                
                // Check rate limiting
                if (!securityService.checkRateLimit(url)) {
                    throw new Error('Rate limit exceeded');
                }
            }

            // Add security headers
            if (!options.headers) {
                options.headers = {};
            }
            
            Object.assign(options.headers, securityService.getSecurityHeaders());

            return originalFetch.call(this, url, options);
        };

        // Override XMLHttpRequest
        const originalXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
            if (!securityService.isAllowedDomain(url)) {
                securityService.logSecurityEvent('suspicious_xhr', 'medium', {
                    url: url,
                    method: method
                });
            }
            
            return originalXHROpen.call(this, method, url, async, user, password);
        };
    }

    /**
     * Setup console monitoring
     */
    setupConsoleMonitoring() {
        // Detect developer tools usage
        let devtools = {
            open: false,
            orientation: null
        };

        const threshold = 160;

        setInterval(() => {
            if (window.outerHeight - window.innerHeight > threshold || 
                window.outerWidth - window.innerWidth > threshold) {
                if (!devtools.open) {
                    devtools.open = true;
                    this.logSecurityEvent('devtools_opened', 'low', {
                        timestamp: Date.now()
                    });
                }
            } else {
                devtools.open = false;
            }
        }, 500);
    }

    /**
     * Setup input sanitization
     */
    setupInputSanitization() {
        // Auto-sanitize form inputs
        document.addEventListener('input', (event) => {
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                const sanitized = this.sanitizeInput(event.target.value);
                if (sanitized !== event.target.value) {
                    this.logSecurityEvent('input_sanitized', 'low', {
                        original: event.target.value.substring(0, 100),
                        sanitized: sanitized.substring(0, 100),
                        field: event.target.name || event.target.id
                    });
                    event.target.value = sanitized;
                }
            }
        });
    }

    /**
     * Sanitize user input
     */
    sanitizeInput(input) {
        if (typeof input !== 'string') {
            return input;
        }

        return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/data:/gi, '')
            .replace(/vbscript:/gi, '');
    }

    /**
     * Validate URL for security
     */
    isAllowedDomain(url) {
        try {
            const urlObj = new URL(url, window.location.origin);
            const allowedDomains = [
                window.location.hostname,
                'api.' + window.location.hostname,
                'cdn.' + window.location.hostname
            ];
            
            return allowedDomains.includes(urlObj.hostname);
        } catch (error) {
            return false;
        }
    }

    /**
     * Check rate limiting
     */
    checkRateLimit(url) {
        const now = Date.now();
        const key = new URL(url, window.location.origin).pathname;
        
        if (!this.rateLimits.has(key)) {
            this.rateLimits.set(key, []);
        }
        
        const requests = this.rateLimits.get(key);
        
        // Remove requests older than 1 minute
        const filtered = requests.filter(time => now - time < 60000);
        
        if (filtered.length >= 60) { // 60 requests per minute
            return false;
        }
        
        filtered.push(now);
        this.rateLimits.set(key, filtered);
        
        return true;
    }

    /**
     * Log security event
     */
    logSecurityEvent(type, severity, data = {}) {
        const event = {
            type,
            severity,
            data,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        this.securityEvents.push(event);

        // Keep only last 100 events
        if (this.securityEvents.length > 100) {
            this.securityEvents.shift();
        }

        // Send critical events to server immediately
        if (severity === 'critical') {
            this.sendSecurityEventToServer(event);
        }

        console.warn(`Security Event [${severity.toUpperCase()}]: ${type}`, data);
    }

    /**
     * Send security event to server
     */
    async sendSecurityEventToServer(event) {
        try {
            await fetch('/api/security/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getSecurityHeaders()
                },
                body: JSON.stringify(event)
            });
        } catch (error) {
            console.error('Failed to send security event to server:', error);
        }
    }

    /**
     * Get security events
     */
    getSecurityEvents(severity = null) {
        if (severity) {
            return this.securityEvents.filter(event => event.severity === severity);
        }
        return this.securityEvents;
    }

    /**
     * Clear security events
     */
    clearSecurityEvents() {
        this.securityEvents = [];
    }

    /**
     * Generate security report
     */
    generateSecurityReport() {
        const report = {
            totalEvents: this.securityEvents.length,
            eventsBySeverity: {},
            eventsByType: {},
            recentEvents: this.securityEvents.slice(-10),
            timestamp: Date.now()
        };

        // Count events by severity
        this.securityEvents.forEach(event => {
            report.eventsBySeverity[event.severity] = 
                (report.eventsBySeverity[event.severity] || 0) + 1;
            
            report.eventsByType[event.type] = 
                (report.eventsByType[event.type] || 0) + 1;
        });

        return report;
    }

    /**
     * Encrypt sensitive data before sending
     */
    encryptData(data, key = null) {
        // Simple XOR encryption for demonstration
        // In production, use proper encryption libraries
        if (!key) {
            key = this.csrfToken || 'default-key';
        }

        const encrypted = [];
        for (let i = 0; i < data.length; i++) {
            encrypted.push(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        
        return btoa(String.fromCharCode.apply(null, encrypted));
    }

    /**
     * Decrypt data
     */
    decryptData(encryptedData, key = null) {
        if (!key) {
            key = this.csrfToken || 'default-key';
        }

        try {
            const data = atob(encryptedData);
            const decrypted = [];
            
            for (let i = 0; i < data.length; i++) {
                decrypted.push(String.fromCharCode(
                    data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
                ));
            }
            
            return decrypted.join('');
        } catch (error) {
            console.error('Decryption failed:', error);
            return null;
        }
    }

    /**
     * Secure local storage
     */
    secureSetItem(key, value) {
        const encrypted = this.encryptData(JSON.stringify(value));
        localStorage.setItem(key, encrypted);
    }

    /**
     * Secure get from local storage
     */
    secureGetItem(key) {
        const encrypted = localStorage.getItem(key);
        if (!encrypted) return null;
        
        const decrypted = this.decryptData(encrypted);
        if (!decrypted) return null;
        
        try {
            return JSON.parse(decrypted);
        } catch (error) {
            return null;
        }
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        this.isMonitoring = false;
        this.securityEvents = [];
        this.rateLimits.clear();
        this.securityHeaders.clear();
    }
}

// Create singleton instance
const securityService = new SecurityService();
export { securityService };
