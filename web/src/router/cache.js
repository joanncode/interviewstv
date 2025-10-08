/**
 * Route Caching System for Performance Optimization
 */

class RouteCache {
  constructor() {
    this.cache = new Map()
    this.componentCache = new Map()
    this.dataCache = new Map()
    this.maxCacheSize = 50
    this.maxAge = 5 * 60 * 1000 // 5 minutes
    this.preloadQueue = new Set()
    
    // Cleanup expired entries periodically
    setInterval(() => this.cleanup(), 60000) // Every minute
  }

  /**
   * Cache route component
   */
  cacheComponent(routeName, component) {
    if (this.componentCache.size >= this.maxCacheSize) {
      this.evictOldest(this.componentCache)
    }
    
    this.componentCache.set(routeName, {
      component,
      timestamp: Date.now(),
      accessCount: 1
    })
  }

  /**
   * Get cached component
   */
  getCachedComponent(routeName) {
    const cached = this.componentCache.get(routeName)
    if (!cached) return null
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.maxAge) {
      this.componentCache.delete(routeName)
      return null
    }
    
    // Update access count and timestamp
    cached.accessCount++
    cached.timestamp = Date.now()
    
    return cached.component
  }

  /**
   * Cache route data
   */
  cacheRouteData(routePath, data, ttl = this.maxAge) {
    if (this.dataCache.size >= this.maxCacheSize) {
      this.evictOldest(this.dataCache)
    }
    
    this.dataCache.set(routePath, {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 1
    })
  }

  /**
   * Get cached route data
   */
  getCachedRouteData(routePath) {
    const cached = this.dataCache.get(routePath)
    if (!cached) return null
    
    // Check if expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.dataCache.delete(routePath)
      return null
    }
    
    // Update access count
    cached.accessCount++
    
    return cached.data
  }

  /**
   * Preload route component
   */
  async preloadRoute(routeName, importFunction) {
    if (this.getCachedComponent(routeName)) {
      return // Already cached
    }
    
    if (this.preloadQueue.has(routeName)) {
      return // Already preloading
    }
    
    this.preloadQueue.add(routeName)
    
    try {
      const component = await importFunction()
      this.cacheComponent(routeName, component)
      console.log(`Preloaded route: ${routeName}`)
    } catch (error) {
      console.error(`Failed to preload route ${routeName}:`, error)
    } finally {
      this.preloadQueue.delete(routeName)
    }
  }

  /**
   * Preload multiple routes
   */
  async preloadRoutes(routes) {
    const promises = routes.map(route => 
      this.preloadRoute(route.name, route.component)
    )
    
    await Promise.allSettled(promises)
  }

  /**
   * Cache route resolution
   */
  cacheRouteResolution(path, resolvedRoute) {
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldest(this.cache)
    }
    
    this.cache.set(path, {
      route: resolvedRoute,
      timestamp: Date.now(),
      accessCount: 1
    })
  }

  /**
   * Get cached route resolution
   */
  getCachedRouteResolution(path) {
    const cached = this.cache.get(path)
    if (!cached) return null
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.maxAge) {
      this.cache.delete(path)
      return null
    }
    
    // Update access count
    cached.accessCount++
    
    return cached.route
  }

  /**
   * Invalidate cache for specific route
   */
  invalidateRoute(routeName) {
    // Remove from component cache
    this.componentCache.delete(routeName)
    
    // Remove from data cache (find by route name pattern)
    for (const [path, data] of this.dataCache.entries()) {
      if (path.includes(routeName)) {
        this.dataCache.delete(path)
      }
    }
    
    // Remove from route resolution cache
    for (const [path, data] of this.cache.entries()) {
      if (data.route.name === routeName) {
        this.cache.delete(path)
      }
    }
  }

  /**
   * Clear all caches
   */
  clearAll() {
    this.cache.clear()
    this.componentCache.clear()
    this.dataCache.clear()
    this.preloadQueue.clear()
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      routeCache: {
        size: this.cache.size,
        hitRate: this.calculateHitRate(this.cache)
      },
      componentCache: {
        size: this.componentCache.size,
        hitRate: this.calculateHitRate(this.componentCache)
      },
      dataCache: {
        size: this.dataCache.size,
        hitRate: this.calculateHitRate(this.dataCache)
      },
      preloadQueue: this.preloadQueue.size
    }
  }

  /**
   * Calculate hit rate for cache
   */
  calculateHitRate(cache) {
    let totalAccess = 0
    let hits = 0
    
    for (const [key, data] of cache.entries()) {
      totalAccess += data.accessCount
      if (data.accessCount > 1) {
        hits += data.accessCount - 1
      }
    }
    
    return totalAccess > 0 ? (hits / totalAccess * 100).toFixed(2) : 0
  }

  /**
   * Evict oldest entries when cache is full
   */
  evictOldest(cache) {
    let oldestKey = null
    let oldestTime = Date.now()
    
    for (const [key, data] of cache.entries()) {
      if (data.timestamp < oldestTime) {
        oldestTime = data.timestamp
        oldestKey = key
      }
    }
    
    if (oldestKey) {
      cache.delete(oldestKey)
    }
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now()
    
    // Cleanup route cache
    for (const [key, data] of this.cache.entries()) {
      if (now - data.timestamp > this.maxAge) {
        this.cache.delete(key)
      }
    }
    
    // Cleanup component cache
    for (const [key, data] of this.componentCache.entries()) {
      if (now - data.timestamp > this.maxAge) {
        this.componentCache.delete(key)
      }
    }
    
    // Cleanup data cache
    for (const [key, data] of this.dataCache.entries()) {
      if (now - data.timestamp > data.ttl) {
        this.dataCache.delete(key)
      }
    }
  }

  /**
   * Warm up cache with critical routes
   */
  async warmUp(criticalRoutes) {
    console.log('Warming up route cache...')
    
    const warmUpPromises = criticalRoutes.map(async (route) => {
      try {
        await this.preloadRoute(route.name, route.component)
        
        // Also preload route data if available
        if (route.preloadData) {
          const data = await route.preloadData()
          this.cacheRouteData(route.path, data)
        }
      } catch (error) {
        console.error(`Failed to warm up route ${route.name}:`, error)
      }
    })
    
    await Promise.allSettled(warmUpPromises)
    console.log('Route cache warm up completed')
  }

  /**
   * Smart preloading based on user behavior
   */
  smartPreload(currentRoute, userHistory) {
    // Analyze user navigation patterns
    const likelyNextRoutes = this.predictNextRoutes(currentRoute, userHistory)
    
    // Preload likely next routes
    likelyNextRoutes.forEach(route => {
      if (route.component && !this.getCachedComponent(route.name)) {
        this.preloadRoute(route.name, route.component)
      }
    })
  }

  /**
   * Predict next routes based on user history
   */
  predictNextRoutes(currentRoute, userHistory) {
    // Simple prediction based on common navigation patterns
    const predictions = []
    
    // Common patterns for interview platform
    if (currentRoute.name === 'home') {
      predictions.push({ name: 'explore', component: () => import('@/views/Explore.vue') })
      predictions.push({ name: 'login', component: () => import('@/views/auth/Login.vue') })
    } else if (currentRoute.name === 'interview-detail') {
      predictions.push({ name: 'profile', component: () => import('@/views/Profile.vue') })
      predictions.push({ name: 'explore', component: () => import('@/views/Explore.vue') })
    } else if (currentRoute.name === 'profile') {
      predictions.push({ name: 'settings', component: () => import('@/views/Settings.vue') })
      predictions.push({ name: 'create-interview', component: () => import('@/views/CreateInterview.vue') })
    }
    
    return predictions
  }
}

// Create singleton instance
const routeCache = new RouteCache()

// Export cache instance and utilities
export default routeCache

export const useRouteCache = () => routeCache

// Vue plugin for easy integration
export const RouteCachePlugin = {
  install(app) {
    app.config.globalProperties.$routeCache = routeCache
    app.provide('routeCache', routeCache)
  }
}
