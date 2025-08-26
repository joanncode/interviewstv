class RouteAnalyticsService {
    constructor() {
        this.analytics = new Map();
        this.sessionData = {
            sessionId: this.generateSessionId(),
            startTime: Date.now(),
            pageViews: 0,
            totalTime: 0,
            bounceRate: 0,
            exitPage: null
        };
        this.currentPageStart = Date.now();
        this.setupEventListeners();
    }

    /**
     * Track page view
     */
    trackPageView(path, title, loadTime = 0) {
        const pageView = {
            path,
            title,
            timestamp: Date.now(),
            loadTime,
            sessionId: this.sessionData.sessionId,
            referrer: document.referrer,
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            timeOnPage: 0,
            scrollDepth: 0,
            interactions: 0
        };

        // Update session data
        this.sessionData.pageViews++;
        this.sessionData.exitPage = path;

        // Store page view
        if (!this.analytics.has(path)) {
            this.analytics.set(path, []);
        }
        this.analytics.get(path).push(pageView);

        // Track time on previous page
        if (this.currentPageView) {
            this.currentPageView.timeOnPage = Date.now() - this.currentPageStart;
        }

        this.currentPageView = pageView;
        this.currentPageStart = Date.now();

        // Send to external analytics
        this.sendToExternalAnalytics('page_view', pageView);

        return pageView;
    }

    /**
     * Track user interaction
     */
    trackInteraction(type, element, data = {}) {
        if (this.currentPageView) {
            this.currentPageView.interactions++;
        }

        const interaction = {
            type,
            element,
            data,
            timestamp: Date.now(),
            path: window.location.pathname,
            sessionId: this.sessionData.sessionId
        };

        this.sendToExternalAnalytics('interaction', interaction);
    }

    /**
     * Track scroll depth
     */
    trackScrollDepth() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        const scrollDepth = Math.round((scrollTop + windowHeight) / documentHeight * 100);
        
        if (this.currentPageView && scrollDepth > this.currentPageView.scrollDepth) {
            this.currentPageView.scrollDepth = scrollDepth;
        }
    }

    /**
     * Track error
     */
    trackError(error, path = null) {
        const errorData = {
            message: error.message,
            stack: error.stack,
            path: path || window.location.pathname,
            timestamp: Date.now(),
            sessionId: this.sessionData.sessionId,
            userAgent: navigator.userAgent
        };

        this.sendToExternalAnalytics('error', errorData);
    }

    /**
     * Track performance metrics
     */
    trackPerformance(path, metrics) {
        const performanceData = {
            path,
            metrics,
            timestamp: Date.now(),
            sessionId: this.sessionData.sessionId
        };

        this.sendToExternalAnalytics('performance', performanceData);
    }

    /**
     * Get analytics data
     */
    getAnalytics(path = null, dateRange = null) {
        if (path) {
            let data = this.analytics.get(path) || [];
            
            if (dateRange) {
                const { start, end } = dateRange;
                data = data.filter(item => 
                    item.timestamp >= start && item.timestamp <= end
                );
            }
            
            return data;
        }

        // Return all analytics
        const allData = {};
        for (const [key, value] of this.analytics) {
            allData[key] = dateRange ? 
                value.filter(item => 
                    item.timestamp >= dateRange.start && 
                    item.timestamp <= dateRange.end
                ) : value;
        }

        return allData;
    }

    /**
     * Get popular pages
     */
    getPopularPages(limit = 10, dateRange = null) {
        const pageViews = {};
        
        for (const [path, views] of this.analytics) {
            let filteredViews = views;
            
            if (dateRange) {
                filteredViews = views.filter(view => 
                    view.timestamp >= dateRange.start && 
                    view.timestamp <= dateRange.end
                );
            }
            
            pageViews[path] = filteredViews.length;
        }

        return Object.entries(pageViews)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([path, views]) => ({ path, views }));
    }

    /**
     * Get bounce rate
     */
    getBounceRate(path = null, dateRange = null) {
        if (path) {
            const views = this.getAnalytics(path, dateRange);
            const bounces = views.filter(view => view.timeOnPage < 30000); // Less than 30 seconds
            return views.length > 0 ? (bounces.length / views.length) * 100 : 0;
        }

        // Overall bounce rate
        let totalViews = 0;
        let totalBounces = 0;

        for (const [, views] of this.analytics) {
            let filteredViews = views;
            
            if (dateRange) {
                filteredViews = views.filter(view => 
                    view.timestamp >= dateRange.start && 
                    view.timestamp <= dateRange.end
                );
            }

            totalViews += filteredViews.length;
            totalBounces += filteredViews.filter(view => view.timeOnPage < 30000).length;
        }

        return totalViews > 0 ? (totalBounces / totalViews) * 100 : 0;
    }

    /**
     * Get average time on page
     */
    getAverageTimeOnPage(path = null, dateRange = null) {
        if (path) {
            const views = this.getAnalytics(path, dateRange);
            const totalTime = views.reduce((sum, view) => sum + view.timeOnPage, 0);
            return views.length > 0 ? totalTime / views.length : 0;
        }

        // Overall average
        let totalTime = 0;
        let totalViews = 0;

        for (const [, views] of this.analytics) {
            let filteredViews = views;
            
            if (dateRange) {
                filteredViews = views.filter(view => 
                    view.timestamp >= dateRange.start && 
                    view.timestamp <= dateRange.end
                );
            }

            totalTime += filteredViews.reduce((sum, view) => sum + view.timeOnPage, 0);
            totalViews += filteredViews.length;
        }

        return totalViews > 0 ? totalTime / totalViews : 0;
    }

    /**
     * Get session data
     */
    getSessionData() {
        return {
            ...this.sessionData,
            currentTime: Date.now(),
            sessionDuration: Date.now() - this.sessionData.startTime
        };
    }

    /**
     * Export analytics data
     */
    exportData(format = 'json') {
        const data = {
            analytics: Object.fromEntries(this.analytics),
            session: this.getSessionData(),
            exportTime: Date.now()
        };

        if (format === 'csv') {
            return this.convertToCSV(data);
        }

        return JSON.stringify(data, null, 2);
    }

    /**
     * Clear analytics data
     */
    clearData(path = null) {
        if (path) {
            this.analytics.delete(path);
        } else {
            this.analytics.clear();
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Track scroll depth
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.trackScrollDepth();
            }, 100);
        });

        // Track clicks
        document.addEventListener('click', (event) => {
            this.trackInteraction('click', event.target.tagName, {
                text: event.target.textContent?.slice(0, 100),
                href: event.target.href,
                id: event.target.id,
                className: event.target.className
            });
        });

        // Track form submissions
        document.addEventListener('submit', (event) => {
            this.trackInteraction('form_submit', event.target.tagName, {
                action: event.target.action,
                method: event.target.method,
                id: event.target.id
            });
        });

        // Track page unload
        window.addEventListener('beforeunload', () => {
            if (this.currentPageView) {
                this.currentPageView.timeOnPage = Date.now() - this.currentPageStart;
            }
            
            // Send final analytics data
            this.sendToExternalAnalytics('session_end', this.getSessionData());
        });

        // Track visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.trackInteraction('page_hidden', 'document');
            } else {
                this.trackInteraction('page_visible', 'document');
            }
        });
    }

    /**
     * Send to external analytics services
     */
    sendToExternalAnalytics(event, data) {
        // Google Analytics
        if (window.gtag) {
            window.gtag('event', event, data);
        }

        // Custom analytics endpoint
        if (window.location.hostname !== 'localhost') {
            fetch('/api/analytics/track', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ event, data })
            }).catch(() => {
                // Silently fail - analytics shouldn't break the app
            });
        }
    }

    /**
     * Generate session ID
     */
    generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Convert data to CSV format
     */
    convertToCSV(data) {
        const rows = [];
        
        // Headers
        rows.push(['Path', 'Timestamp', 'Load Time', 'Time on Page', 'Scroll Depth', 'Interactions']);
        
        // Data rows
        for (const [path, views] of Object.entries(data.analytics)) {
            for (const view of views) {
                rows.push([
                    path,
                    new Date(view.timestamp).toISOString(),
                    view.loadTime,
                    view.timeOnPage,
                    view.scrollDepth,
                    view.interactions
                ]);
            }
        }
        
        return rows.map(row => row.join(',')).join('\n');
    }
}

export default new RouteAnalyticsService();
