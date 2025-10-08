/**
 * Route Guards for Authentication and Authorization
 */
import { useAuthStore } from '@/stores/auth'
import { useMetaStore } from '@/stores/meta'

/**
 * Authentication guard - requires user to be logged in
 */
export const authGuard = async (to, from, next) => {
  const authStore = useAuthStore()
  
  // Check if user is authenticated
  if (!authStore.isAuthenticated) {
    // Store the intended destination
    const redirectPath = to.fullPath
    
    // Redirect to login with return URL
    next({
      name: 'login',
      query: { redirect: redirectPath }
    })
    return
  }
  
  // Check if email verification is required
  if (to.meta.requiresVerified && !authStore.user?.email_verified_at) {
    next({ name: 'verify-email' })
    return
  }
  
  next()
}

/**
 * Guest guard - only allows unauthenticated users
 */
export const guestGuard = async (to, from, next) => {
  const authStore = useAuthStore()
  
  if (authStore.isAuthenticated) {
    // Redirect authenticated users to dashboard
    next({ name: 'dashboard' })
    return
  }
  
  next()
}

/**
 * Admin guard - requires admin role
 */
export const adminGuard = async (to, from, next) => {
  const authStore = useAuthStore()
  
  // First check authentication
  if (!authStore.isAuthenticated) {
    next({
      name: 'login',
      query: { redirect: to.fullPath }
    })
    return
  }
  
  // Check admin role
  if (!authStore.isAdmin) {
    next({ name: 'forbidden' })
    return
  }
  
  next()
}

/**
 * Creator guard - requires creator role or higher
 */
export const creatorGuard = async (to, from, next) => {
  const authStore = useAuthStore()
  
  if (!authStore.isAuthenticated) {
    next({
      name: 'login',
      query: { redirect: to.fullPath }
    })
    return
  }
  
  if (!authStore.isCreator && !authStore.isAdmin) {
    next({ name: 'upgrade-account' })
    return
  }
  
  next()
}

/**
 * Email verification guard
 */
export const emailVerificationGuard = async (to, from, next) => {
  const authStore = useAuthStore()
  
  if (!authStore.isAuthenticated) {
    next({ name: 'login' })
    return
  }
  
  if (authStore.user?.email_verified_at) {
    // Already verified, redirect to dashboard
    next({ name: 'dashboard' })
    return
  }
  
  next()
}

/**
 * Subscription guard - requires active subscription
 */
export const subscriptionGuard = async (to, from, next) => {
  const authStore = useAuthStore()
  
  if (!authStore.isAuthenticated) {
    next({
      name: 'login',
      query: { redirect: to.fullPath }
    })
    return
  }
  
  if (!authStore.hasActiveSubscription) {
    next({ name: 'pricing' })
    return
  }
  
  next()
}

/**
 * Rate limiting guard - prevents too many rapid navigation attempts
 */
export const rateLimitGuard = (() => {
  const attempts = new Map()
  const maxAttempts = 10
  const windowMs = 60000 // 1 minute
  
  return async (to, from, next) => {
    const clientId = getClientId()
    const now = Date.now()
    
    // Clean old attempts
    for (const [id, data] of attempts.entries()) {
      if (now - data.firstAttempt > windowMs) {
        attempts.delete(id)
      }
    }
    
    // Check current attempts
    const userAttempts = attempts.get(clientId)
    if (userAttempts) {
      if (userAttempts.count >= maxAttempts) {
        console.warn('Rate limit exceeded for navigation')
        next(false) // Block navigation
        return
      }
      userAttempts.count++
    } else {
      attempts.set(clientId, {
        count: 1,
        firstAttempt: now
      })
    }
    
    next()
  }
})()

/**
 * Meta data guard - sets page meta information
 */
export const metaGuard = async (to, from, next) => {
  const metaStore = useMetaStore()
  
  // Set page title
  if (to.meta.title) {
    document.title = to.meta.title
    metaStore.setTitle(to.meta.title)
  }
  
  // Set meta description
  if (to.meta.description) {
    metaStore.setDescription(to.meta.description)
  }
  
  // Set canonical URL
  const canonicalUrl = `${window.location.origin}${to.path}`
  metaStore.setCanonical(canonicalUrl)
  
  // Set robots meta
  if (to.meta.robots) {
    metaStore.setRobots(to.meta.robots)
  }
  
  next()
}

/**
 * Analytics guard - tracks page views
 */
export const analyticsGuard = async (to, from, next) => {
  // Track page view
  if (window.gtag) {
    window.gtag('config', 'GA_MEASUREMENT_ID', {
      page_title: to.meta.title || to.name,
      page_location: window.location.href
    })
  }
  
  // Track custom events
  if (window.analytics) {
    window.analytics.track('Page View', {
      path: to.path,
      name: to.name,
      title: to.meta.title
    })
  }
  
  next()
}

/**
 * Feature flag guard - checks if feature is enabled
 */
export const featureFlagGuard = (featureName) => {
  return async (to, from, next) => {
    // Check if feature is enabled (implement your feature flag logic)
    const isEnabled = await checkFeatureFlag(featureName)
    
    if (!isEnabled) {
      next({ name: 'not-found' })
      return
    }
    
    next()
  }
}

/**
 * Maintenance mode guard
 */
export const maintenanceGuard = async (to, from, next) => {
  // Check if site is in maintenance mode
  const isMaintenanceMode = await checkMaintenanceMode()
  
  if (isMaintenanceMode && to.name !== 'maintenance') {
    next({ name: 'maintenance' })
    return
  }
  
  next()
}

/**
 * Helper functions
 */
function getClientId() {
  // Generate or retrieve client ID for rate limiting
  let clientId = localStorage.getItem('client_id')
  if (!clientId) {
    clientId = 'client_' + Math.random().toString(36).substr(2, 9)
    localStorage.setItem('client_id', clientId)
  }
  return clientId
}

async function checkFeatureFlag(featureName) {
  try {
    const response = await fetch(`/api/feature-flags/${featureName}`)
    const data = await response.json()
    return data.enabled === true
  } catch (error) {
    console.error('Failed to check feature flag:', error)
    return false
  }
}

async function checkMaintenanceMode() {
  try {
    const response = await fetch('/api/status')
    const data = await response.json()
    return data.maintenance === true
  } catch (error) {
    console.error('Failed to check maintenance mode:', error)
    return false
  }
}

/**
 * Combine multiple guards
 */
export const combineGuards = (...guards) => {
  return async (to, from, next) => {
    let index = 0
    
    const runNextGuard = () => {
      if (index >= guards.length) {
        next()
        return
      }
      
      const guard = guards[index++]
      guard(to, from, (result) => {
        if (result === false || (typeof result === 'object' && result !== null)) {
          next(result)
        } else {
          runNextGuard()
        }
      })
    }
    
    runNextGuard()
  }
}

/**
 * Export all guards
 */
export default {
  auth: authGuard,
  guest: guestGuard,
  admin: adminGuard,
  creator: creatorGuard,
  emailVerification: emailVerificationGuard,
  subscription: subscriptionGuard,
  rateLimit: rateLimitGuard,
  meta: metaGuard,
  analytics: analyticsGuard,
  featureFlag: featureFlagGuard,
  maintenance: maintenanceGuard,
  combine: combineGuards
}
