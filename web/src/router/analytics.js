/**
 * Route Analytics Tracking System
 */

class RouteAnalytics {
  constructor() {
    this.sessionId = this.generateSessionId()
    this.pageViews = []
    this.navigationTiming = new Map()
    this.userFlow = []
    this.bounceThreshold = 30000 // 30 seconds
    this.batchSize = 10
    this.sendInterval = 30000 // 30 seconds
    
    this.initializeTracking()
  }

  /**
   * Initialize tracking system
   */
  initializeTracking() {
    // Start periodic batch sending
    setInterval(() => this.sendBatch(), this.sendInterval)
    
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.trackVisibilityChange()
    })
    
    // Track before page unload
    window.addEventListener('beforeunload', () => {
      this.trackPageUnload()
    })
  }

  /**
   * Track route navigation
   */
  trackNavigation(to, from, navigationTime) {
    const pageView = {
      id: this.generateId(),
      sessionId: this.sessionId,
      timestamp: Date.now(),
      path: to.path,
      name: to.name,
      params: to.params,
      query: to.query,
      meta: to.meta,
      referrer: from ? from.path : document.referrer,
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      navigationTime,
      loadTime: null, // Will be set when page finishes loading
      timeOnPage: null, // Will be calculated when leaving page
      scrollDepth: 0,
      interactions: [],
      exitType: null
    }
    
    // Calculate time on previous page
    if (this.pageViews.length > 0) {
      const previousPage = this.pageViews[this.pageViews.length - 1]
      previousPage.timeOnPage = pageView.timestamp - previousPage.timestamp
      previousPage.exitType = 'navigation'
    }
    
    this.pageViews.push(pageView)
    this.userFlow.push({
      from: from?.path || 'direct',
      to: to.path,
      timestamp: pageView.timestamp
    })
    
    // Track navigation timing
    this.trackNavigationTiming(to.name)
    
    // Send to analytics if batch is full
    if (this.pageViews.length >= this.batchSize) {
      this.sendBatch()
    }
  }

  /**
   * Track page load completion
   */
  trackPageLoad(routeName, loadTime) {
    const currentPage = this.getCurrentPageView()
    if (currentPage) {
      currentPage.loadTime = loadTime
      
      // Track performance metrics
      this.trackPerformanceMetrics(routeName, loadTime)
    }
  }

  /**
   * Track user interactions
   */
  trackInteraction(type, element, data = {}) {
    const currentPage = this.getCurrentPageView()
    if (currentPage) {
      currentPage.interactions.push({
        type,
        element,
        timestamp: Date.now(),
        data
      })
    }
  }

  /**
   * Track scroll depth
   */
  trackScrollDepth(depth) {
    const currentPage = this.getCurrentPageView()
    if (currentPage) {
      currentPage.scrollDepth = Math.max(currentPage.scrollDepth, depth)
    }
  }

  /**
   * Track navigation timing
   */
  trackNavigationTiming(routeName) {
    const timing = performance.getEntriesByType('navigation')[0]
    if (timing) {
      this.navigationTiming.set(routeName, {
        domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
        loadComplete: timing.loadEventEnd - timing.loadEventStart,
        firstPaint: this.getFirstPaint(),
        firstContentfulPaint: this.getFirstContentfulPaint()
      })
    }
  }

  /**
   * Track performance metrics
   */
  trackPerformanceMetrics(routeName, loadTime) {
    const metrics = {
      routeName,
      loadTime,
      memoryUsage: this.getMemoryUsage(),
      connectionType: this.getConnectionType(),
      timestamp: Date.now()
    }
    
    // Send performance data
    this.sendPerformanceData(metrics)
  }

  /**
   * Track visibility changes
   */
  trackVisibilityChange() {
    const currentPage = this.getCurrentPageView()
    if (currentPage) {
      currentPage.interactions.push({
        type: 'visibility_change',
        visible: !document.hidden,
        timestamp: Date.now()
      })
    }
  }

  /**
   * Track page unload
   */
  trackPageUnload() {
    const currentPage = this.getCurrentPageView()
    if (currentPage) {
      currentPage.timeOnPage = Date.now() - currentPage.timestamp
      currentPage.exitType = 'unload'
    }
    
    // Send final batch
    this.sendBatch(true)
  }

  /**
   * Calculate bounce rate
   */
  calculateBounceRate() {
    const bounces = this.pageViews.filter(page => 
      page.timeOnPage && page.timeOnPage < this.bounceThreshold
    ).length
    
    return this.pageViews.length > 0 ? (bounces / this.pageViews.length) * 100 : 0
  }

  /**
   * Get user flow analysis
   */
  getUserFlowAnalysis() {
    const flows = {}
    
    this.userFlow.forEach(flow => {
      const key = `${flow.from} -> ${flow.to}`
      flows[key] = (flows[key] || 0) + 1
    })
    
    return Object.entries(flows)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10) // Top 10 flows
  }

  /**
   * Get page performance summary
   */
  getPagePerformanceSummary() {
    const summary = {}
    
    this.pageViews.forEach(page => {
      if (page.loadTime) {
        if (!summary[page.name]) {
          summary[page.name] = {
            views: 0,
            totalLoadTime: 0,
            avgLoadTime: 0,
            minLoadTime: Infinity,
            maxLoadTime: 0
          }
        }
        
        const stats = summary[page.name]
        stats.views++
        stats.totalLoadTime += page.loadTime
        stats.avgLoadTime = stats.totalLoadTime / stats.views
        stats.minLoadTime = Math.min(stats.minLoadTime, page.loadTime)
        stats.maxLoadTime = Math.max(stats.maxLoadTime, page.loadTime)
      }
    })
    
    return summary
  }

  /**
   * Send analytics batch
   */
  async sendBatch(force = false) {
    if (this.pageViews.length === 0) return
    
    const batch = {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      pageViews: [...this.pageViews],
      userFlow: [...this.userFlow],
      bounceRate: this.calculateBounceRate(),
      sessionDuration: this.getSessionDuration()
    }
    
    try {
      await fetch('/api/analytics/routes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(batch)
      })
      
      // Clear sent data
      this.pageViews = []
      this.userFlow = []
      
    } catch (error) {
      console.error('Failed to send analytics batch:', error)
      
      // Store in localStorage as fallback
      if (force) {
        this.storeOffline(batch)
      }
    }
  }

  /**
   * Send performance data
   */
  async sendPerformanceData(metrics) {
    try {
      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(metrics)
      })
    } catch (error) {
      console.error('Failed to send performance data:', error)
    }
  }

  /**
   * Store analytics offline
   */
  storeOffline(batch) {
    try {
      const stored = JSON.parse(localStorage.getItem('analytics_offline') || '[]')
      stored.push(batch)
      
      // Keep only last 10 batches
      if (stored.length > 10) {
        stored.splice(0, stored.length - 10)
      }
      
      localStorage.setItem('analytics_offline', JSON.stringify(stored))
    } catch (error) {
      console.error('Failed to store analytics offline:', error)
    }
  }

  /**
   * Send offline analytics
   */
  async sendOfflineAnalytics() {
    try {
      const stored = JSON.parse(localStorage.getItem('analytics_offline') || '[]')
      
      for (const batch of stored) {
        await fetch('/api/analytics/routes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify(batch)
        })
      }
      
      localStorage.removeItem('analytics_offline')
    } catch (error) {
      console.error('Failed to send offline analytics:', error)
    }
  }

  /**
   * Helper methods
   */
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  generateId() {
    return 'page_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  getCurrentPageView() {
    return this.pageViews[this.pageViews.length - 1] || null
  }

  getSessionDuration() {
    if (this.pageViews.length === 0) return 0
    const first = this.pageViews[0].timestamp
    const last = Date.now()
    return last - first
  }

  getFirstPaint() {
    const paint = performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')
    return paint ? paint.startTime : null
  }

  getFirstContentfulPaint() {
    const paint = performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')
    return paint ? paint.startTime : null
  }

  getMemoryUsage() {
    return performance.memory ? {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit
    } : null
  }

  getConnectionType() {
    return navigator.connection ? navigator.connection.effectiveType : 'unknown'
  }
}

// Create singleton instance
const routeAnalytics = new RouteAnalytics()

// Export analytics instance
export default routeAnalytics

export const useRouteAnalytics = () => routeAnalytics

// Vue plugin for easy integration
export const RouteAnalyticsPlugin = {
  install(app) {
    app.config.globalProperties.$routeAnalytics = routeAnalytics
    app.provide('routeAnalytics', routeAnalytics)
  }
}
