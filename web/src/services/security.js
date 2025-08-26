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
     * Enhanced input validation
     */
    validateInput(input, type = 'general', options = {}) {
        if (typeof input !== 'string') {
            return { valid: false, error: 'Input must be a string' };
        }

        // Check length limits
        const maxLength = options.maxLength || 10000;
        if (input.length > maxLength) {
            return { valid: false, error: `Input exceeds maximum length of ${maxLength}` };
        }

        // Type-specific validation
        switch (type) {
            case 'email':
                return this.validateEmail(input);
            case 'password':
                return this.validatePassword(input, options);
            case 'url':
                return this.validateURL(input);
            case 'filename':
                return this.validateFilename(input);
            case 'json':
                return this.validateJSON(input);
            default:
                return this.validateGeneral(input);
        }
    }

    /**
     * Validate email address
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return { valid: false, error: 'Invalid email format' };
        }

        // Check for suspicious patterns
        if (this.containsSuspiciousPatterns(email)) {
            return { valid: false, error: 'Email contains suspicious content' };
        }

        return { valid: true };
    }

    /**
     * Validate password strength
     */
    validatePassword(password, options = {}) {
        const requirements = {
            minLength: options.minLength || 8,
            requireUppercase: options.requireUppercase !== false,
            requireLowercase: options.requireLowercase !== false,
            requireNumbers: options.requireNumbers !== false,
            requireSpecialChars: options.requireSpecialChars !== false
        };

        const errors = [];

        if (password.length < requirements.minLength) {
            errors.push(`Password must be at least ${requirements.minLength} characters long`);
        }

        if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }

        if (requirements.requireLowercase && !/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }

        if (requirements.requireNumbers && !/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }

        if (requirements.requireSpecialChars && !/[@$!%*?&]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }

        // Check for common weak patterns
        if (this.isWeakPassword(password)) {
            errors.push('Password is too common or weak');
        }

        return {
            valid: errors.length === 0,
            errors: errors,
            strength: this.calculatePasswordStrength(password)
        };
    }

    /**
     * Validate URL
     */
    validateURL(url) {
        try {
            const urlObj = new URL(url);

            // Check for allowed protocols
            const allowedProtocols = ['http:', 'https:', 'ftp:', 'ftps:'];
            if (!allowedProtocols.includes(urlObj.protocol)) {
                return { valid: false, error: 'URL protocol not allowed' };
            }

            // Check for suspicious patterns
            if (this.containsSuspiciousPatterns(url)) {
                return { valid: false, error: 'URL contains suspicious content' };
            }

            return { valid: true };
        } catch (error) {
            return { valid: false, error: 'Invalid URL format' };
        }
    }

    /**
     * Validate filename
     */
    validateFilename(filename) {
        // Remove path traversal attempts
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return { valid: false, error: 'Filename contains invalid characters' };
        }

        // Check for dangerous extensions
        const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar', '.php'];
        const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));

        if (dangerousExtensions.includes(extension)) {
            return { valid: false, error: 'File type not allowed' };
        }

        return { valid: true };
    }

    /**
     * Validate JSON
     */
    validateJSON(jsonString) {
        try {
            JSON.parse(jsonString);
            return { valid: true };
        } catch (error) {
            return { valid: false, error: 'Invalid JSON format' };
        }
    }

    /**
     * General input validation
     */
    validateGeneral(input) {
        // Check for suspicious patterns
        if (this.containsSuspiciousPatterns(input)) {
            return { valid: false, error: 'Input contains suspicious content' };
        }

        return { valid: true };
    }

    /**
     * Check for suspicious patterns
     */
    containsSuspiciousPatterns(input) {
        const suspiciousPatterns = [
            /<script[^>]*>.*?<\/script>/gi,
            /javascript\s*:/gi,
            /on\w+\s*=/gi,
            /eval\s*\(/gi,
            /exec\s*\(/gi,
            /union\s+select/gi,
            /drop\s+table/gi,
            /insert\s+into/gi,
            /delete\s+from/gi
        ];

        return suspiciousPatterns.some(pattern => pattern.test(input));
    }

    /**
     * Check if password is weak
     */
    isWeakPassword(password) {
        const weakPasswords = [
            'password', '123456', 'password123', 'admin', 'qwerty',
            'letmein', 'welcome', 'monkey', '1234567890', 'abc123'
        ];

        const lowerPassword = password.toLowerCase();
        return weakPasswords.some(weak => lowerPassword.includes(weak));
    }

    /**
     * Calculate password strength score
     */
    calculatePasswordStrength(password) {
        let score = 0;

        // Length bonus
        score += Math.min(password.length * 2, 20);

        // Character variety bonus
        if (/[a-z]/.test(password)) score += 5;
        if (/[A-Z]/.test(password)) score += 5;
        if (/\d/.test(password)) score += 5;
        if (/[@$!%*?&]/.test(password)) score += 10;

        // Penalty for common patterns
        if (this.isWeakPassword(password)) score -= 20;
        if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters
        if (/123|abc|qwe/i.test(password)) score -= 10; // Sequential characters

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Validate file upload security
     */
    validateFileUpload(file, options = {}) {
        const maxSize = options.maxSize || 10485760; // 10MB default
        const allowedTypes = options.allowedTypes || [];
        const allowedExtensions = options.allowedExtensions || [];

        // Check file size
        if (file.size > maxSize) {
            return {
                valid: false,
                error: `File size exceeds maximum allowed size of ${this.formatFileSize(maxSize)}`
            };
        }

        // Check MIME type
        if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
            return {
                valid: false,
                error: 'File type not allowed'
            };
        }

        // Check file extension
        if (allowedExtensions.length > 0) {
            const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
            if (!allowedExtensions.includes(extension)) {
                return {
                    valid: false,
                    error: 'File extension not allowed'
                };
            }
        }

        // Validate filename
        const filenameValidation = this.validateFilename(file.name);
        if (!filenameValidation.valid) {
            return filenameValidation;
        }

        return { valid: true };
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
