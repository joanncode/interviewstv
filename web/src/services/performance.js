/**
 * Frontend Performance Optimization Service
 * Handles client-side performance monitoring and optimization
 */

export default class PerformanceService {
    constructor() {
        this.metrics = new Map();
        this.observers = new Map();
        this.thresholds = {
            fcp: 1800, // First Contentful Paint (ms)
            lcp: 2500, // Largest Contentful Paint (ms)
            fid: 100,  // First Input Delay (ms)
            cls: 0.1,  // Cumulative Layout Shift
            ttfb: 600  // Time to First Byte (ms)
        };
        this.isMonitoring = false;
    }

    /**
     * Initialize performance monitoring
     */
    init() {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        this.setupWebVitalsMonitoring();
        this.setupResourceMonitoring();
        this.setupNavigationMonitoring();
        this.setupMemoryMonitoring();
        this.setupErrorMonitoring();
        
        console.log('Performance monitoring initialized');
    }

    /**
     * Setup Web Vitals monitoring
     */
    setupWebVitalsMonitoring() {
        // First Contentful Paint
        this.observePerformanceEntry('paint', (entries) => {
            entries.forEach(entry => {
                if (entry.name === 'first-contentful-paint') {
                    this.recordMetric('fcp', entry.startTime);
                }
            });
        });

        // Largest Contentful Paint
        this.observePerformanceEntry('largest-contentful-paint', (entries) => {
            entries.forEach(entry => {
                this.recordMetric('lcp', entry.startTime);
            });
        });

        // First Input Delay
        this.observePerformanceEntry('first-input', (entries) => {
            entries.forEach(entry => {
                this.recordMetric('fid', entry.processingStart - entry.startTime);
            });
        });

        // Cumulative Layout Shift
        this.observePerformanceEntry('layout-shift', (entries) => {
            let clsValue = 0;
            entries.forEach(entry => {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            });
            this.recordMetric('cls', clsValue);
        });
    }

    /**
     * Setup resource monitoring
     */
    setupResourceMonitoring() {
        this.observePerformanceEntry('resource', (entries) => {
            entries.forEach(entry => {
                const resourceData = {
                    name: entry.name,
                    type: entry.initiatorType,
                    size: entry.transferSize || 0,
                    duration: entry.duration,
                    startTime: entry.startTime,
                    cached: entry.transferSize === 0 && entry.decodedBodySize > 0
                };

                this.recordResourceMetric(resourceData);
            });
        });
    }

    /**
     * Setup navigation monitoring
     */
    setupNavigationMonitoring() {
        this.observePerformanceEntry('navigation', (entries) => {
            entries.forEach(entry => {
                const navigationData = {
                    ttfb: entry.responseStart - entry.requestStart,
                    domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
                    loadComplete: entry.loadEventEnd - entry.loadEventStart,
                    totalTime: entry.loadEventEnd - entry.fetchStart,
                    redirectTime: entry.redirectEnd - entry.redirectStart,
                    dnsTime: entry.domainLookupEnd - entry.domainLookupStart,
                    connectTime: entry.connectEnd - entry.connectStart,
                    requestTime: entry.responseEnd - entry.requestStart
                };

                this.recordMetric('navigation', navigationData);
            });
        });
    }

    /**
     * Setup memory monitoring
     */
    setupMemoryMonitoring() {
        if ('memory' in performance) {
            setInterval(() => {
                const memoryInfo = {
                    usedJSHeapSize: performance.memory.usedJSHeapSize,
                    totalJSHeapSize: performance.memory.totalJSHeapSize,
                    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
                };

                this.recordMetric('memory', memoryInfo);
            }, 30000); // Every 30 seconds
        }
    }

    /**
     * Setup error monitoring
     */
    setupErrorMonitoring() {
        window.addEventListener('error', (event) => {
            this.recordError({
                type: 'javascript',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack,
                timestamp: Date.now()
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.recordError({
                type: 'promise',
                message: event.reason?.message || 'Unhandled promise rejection',
                stack: event.reason?.stack,
                timestamp: Date.now()
            });
        });
    }

    /**
     * Observe performance entries
     */
    observePerformanceEntry(type, callback) {
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    callback(list.getEntries());
                });

                observer.observe({ type, buffered: true });
                this.observers.set(type, observer);
            } catch (error) {
                console.warn(`Failed to observe ${type} entries:`, error);
            }
        }
    }

    /**
     * Record a performance metric
     */
    recordMetric(name, value) {
        const timestamp = Date.now();
        
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }

        this.metrics.get(name).push({
            value,
            timestamp
        });

        // Check thresholds
        this.checkThreshold(name, value);

        // Limit stored metrics to prevent memory leaks
        const metrics = this.metrics.get(name);
        if (metrics.length > 100) {
            metrics.splice(0, metrics.length - 100);
        }
    }

    /**
     * Record resource metric
     */
    recordResourceMetric(resourceData) {
        if (!this.metrics.has('resources')) {
            this.metrics.set('resources', []);
        }

        this.metrics.get('resources').push({
            ...resourceData,
            timestamp: Date.now()
        });

        // Analyze resource performance
        this.analyzeResourcePerformance(resourceData);
    }

    /**
     * Record error
     */
    recordError(errorData) {
        if (!this.metrics.has('errors')) {
            this.metrics.set('errors', []);
        }

        this.metrics.get('errors').push(errorData);

        // Send error to monitoring service
        this.sendErrorToMonitoring(errorData);
    }

    /**
     * Check performance thresholds
     */
    checkThreshold(name, value) {
        if (this.thresholds[name] && value > this.thresholds[name]) {
            console.warn(`Performance threshold exceeded for ${name}: ${value} > ${this.thresholds[name]}`);
            
            this.recordMetric('threshold_violations', {
                metric: name,
                value,
                threshold: this.thresholds[name]
            });
        }
    }

    /**
     * Analyze resource performance
     */
    analyzeResourcePerformance(resource) {
        // Check for slow resources
        if (resource.duration > 1000) {
            console.warn(`Slow resource detected: ${resource.name} took ${resource.duration}ms`);
        }

        // Check for large resources
        if (resource.size > 1024 * 1024) { // 1MB
            console.warn(`Large resource detected: ${resource.name} is ${this.formatBytes(resource.size)}`);
        }

        // Check for uncached resources
        if (!resource.cached && resource.type !== 'xmlhttprequest') {
            console.info(`Uncached resource: ${resource.name}`);
        }
    }

    /**
     * Get current metrics
     */
    getMetrics() {
        const result = {};
        
        for (const [name, values] of this.metrics) {
            if (values.length > 0) {
                const latest = values[values.length - 1];
                result[name] = {
                    current: latest.value,
                    history: values,
                    average: this.calculateAverage(values),
                    count: values.length
                };
            }
        }

        return result;
    }

    /**
     * Get Web Vitals summary
     */
    getWebVitals() {
        const vitals = {};
        
        ['fcp', 'lcp', 'fid', 'cls', 'ttfb'].forEach(metric => {
            if (this.metrics.has(metric)) {
                const values = this.metrics.get(metric);
                if (values.length > 0) {
                    const latest = values[values.length - 1].value;
                    vitals[metric] = {
                        value: latest,
                        rating: this.getRating(metric, latest),
                        threshold: this.thresholds[metric]
                    };
                }
            }
        });

        return vitals;
    }

    /**
     * Get resource summary
     */
    getResourceSummary() {
        if (!this.metrics.has('resources')) {
            return {};
        }

        const resources = this.metrics.get('resources');
        const summary = {
            total: resources.length,
            totalSize: 0,
            totalDuration: 0,
            cached: 0,
            byType: {}
        };

        resources.forEach(resource => {
            summary.totalSize += resource.size;
            summary.totalDuration += resource.duration;
            
            if (resource.cached) {
                summary.cached++;
            }

            if (!summary.byType[resource.type]) {
                summary.byType[resource.type] = {
                    count: 0,
                    size: 0,
                    duration: 0
                };
            }

            summary.byType[resource.type].count++;
            summary.byType[resource.type].size += resource.size;
            summary.byType[resource.type].duration += resource.duration;
        });

        summary.cacheHitRate = summary.total > 0 ? (summary.cached / summary.total) * 100 : 0;
        summary.averageDuration = summary.total > 0 ? summary.totalDuration / summary.total : 0;

        return summary;
    }

    /**
     * Get performance score
     */
    getPerformanceScore() {
        const vitals = this.getWebVitals();
        let score = 100;
        let factors = 0;

        Object.entries(vitals).forEach(([metric, data]) => {
            factors++;
            if (data.rating === 'poor') {
                score -= 30;
            } else if (data.rating === 'needs-improvement') {
                score -= 15;
            }
        });

        return Math.max(0, Math.round(score));
    }

    /**
     * Optimize images
     */
    optimizeImages() {
        const images = document.querySelectorAll('img[data-src]');
        
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                });
            });

            images.forEach(img => imageObserver.observe(img));
        } else {
            // Fallback for browsers without IntersectionObserver
            images.forEach(img => {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
            });
        }
    }

    /**
     * Preload critical resources
     */
    preloadCriticalResources(resources) {
        resources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = resource.url;
            link.as = resource.type;
            
            if (resource.type === 'font') {
                link.crossOrigin = 'anonymous';
            }
            
            document.head.appendChild(link);
        });
    }

    /**
     * Defer non-critical JavaScript
     */
    deferNonCriticalJS() {
        const scripts = document.querySelectorAll('script[data-defer]');
        
        const loadScript = (script) => {
            const newScript = document.createElement('script');
            newScript.src = script.dataset.defer;
            newScript.async = true;
            document.head.appendChild(newScript);
        };

        if (document.readyState === 'complete') {
            scripts.forEach(loadScript);
        } else {
            window.addEventListener('load', () => {
                scripts.forEach(loadScript);
            });
        }
    }

    /**
     * Send metrics to server
     */
    async sendMetricsToServer() {
        try {
            const metrics = this.getMetrics();
            const vitals = this.getWebVitals();
            const resourceSummary = this.getResourceSummary();

            const data = {
                metrics,
                vitals,
                resourceSummary,
                score: this.getPerformanceScore(),
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: Date.now()
            };

            await fetch('/api/performance/metrics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

        } catch (error) {
            console.error('Failed to send metrics to server:', error);
        }
    }

    /**
     * Helper methods
     */
    calculateAverage(values) {
        if (values.length === 0) return 0;
        
        const sum = values.reduce((acc, item) => {
            return acc + (typeof item.value === 'number' ? item.value : 0);
        }, 0);
        
        return sum / values.length;
    }

    getRating(metric, value) {
        const thresholds = {
            fcp: { good: 1800, poor: 3000 },
            lcp: { good: 2500, poor: 4000 },
            fid: { good: 100, poor: 300 },
            cls: { good: 0.1, poor: 0.25 },
            ttfb: { good: 600, poor: 1500 }
        };

        const threshold = thresholds[metric];
        if (!threshold) return 'unknown';

        if (value <= threshold.good) return 'good';
        if (value <= threshold.poor) return 'needs-improvement';
        return 'poor';
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    sendErrorToMonitoring(error) {
        // Send error to external monitoring service
        if (window.gtag) {
            window.gtag('event', 'exception', {
                description: error.message,
                fatal: false
            });
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
        this.metrics.clear();
        this.isMonitoring = false;
    }
}

// Create singleton instance
const performanceService = new PerformanceService();
export { performanceService };
