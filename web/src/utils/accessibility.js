/**
 * Accessibility Features for AJAX Content and Dynamic Updates
 */

class AccessibilityManager {
  constructor() {
    this.announcer = null
    this.focusManager = null
    this.skipLinks = []
    this.landmarkManager = null
    this.isHighContrast = false
    this.isReducedMotion = false
    this.fontSize = 'normal'
    
    this.init()
  }

  /**
   * Initialize accessibility features
   */
  init() {
    this.createLiveRegion()
    this.createFocusManager()
    this.createSkipLinks()
    this.createLandmarkManager()
    this.detectUserPreferences()
    this.setupEventListeners()
    this.loadUserSettings()
  }

  /**
   * Create ARIA live region for announcements
   */
  createLiveRegion() {
    // Create polite announcer
    this.announcer = document.createElement('div')
    this.announcer.setAttribute('aria-live', 'polite')
    this.announcer.setAttribute('aria-atomic', 'true')
    this.announcer.setAttribute('aria-relevant', 'additions text')
    this.announcer.className = 'sr-only'
    this.announcer.id = 'accessibility-announcer'
    
    // Create assertive announcer for urgent messages
    this.assertiveAnnouncer = document.createElement('div')
    this.assertiveAnnouncer.setAttribute('aria-live', 'assertive')
    this.assertiveAnnouncer.setAttribute('aria-atomic', 'true')
    this.assertiveAnnouncer.className = 'sr-only'
    this.assertiveAnnouncer.id = 'accessibility-announcer-assertive'
    
    document.body.appendChild(this.announcer)
    document.body.appendChild(this.assertiveAnnouncer)
  }

  /**
   * Announce content changes to screen readers
   */
  announce(message, priority = 'polite') {
    const announcer = priority === 'assertive' ? this.assertiveAnnouncer : this.announcer
    
    // Clear previous message
    announcer.textContent = ''
    
    // Add new message after a brief delay to ensure it's announced
    setTimeout(() => {
      announcer.textContent = message
    }, 100)
    
    // Clear message after announcement
    setTimeout(() => {
      announcer.textContent = ''
    }, 1000)
  }

  /**
   * Create focus management system
   */
  createFocusManager() {
    this.focusManager = {
      previousFocus: null,
      focusStack: [],
      
      // Save current focus
      saveFocus() {
        this.previousFocus = document.activeElement
      },
      
      // Restore previous focus
      restoreFocus() {
        if (this.previousFocus && this.previousFocus.focus) {
          this.previousFocus.focus()
          this.previousFocus = null
        }
      },
      
      // Push focus context
      pushFocus(element) {
        this.focusStack.push(document.activeElement)
        if (element && element.focus) {
          element.focus()
        }
      },
      
      // Pop focus context
      popFocus() {
        const previousElement = this.focusStack.pop()
        if (previousElement && previousElement.focus) {
          previousElement.focus()
        }
      },
      
      // Focus first focusable element in container
      focusFirst(container) {
        const focusable = this.getFocusableElements(container)
        if (focusable.length > 0) {
          focusable[0].focus()
        }
      },
      
      // Get all focusable elements
      getFocusableElements(container = document) {
        const selector = [
          'a[href]',
          'button:not([disabled])',
          'input:not([disabled])',
          'select:not([disabled])',
          'textarea:not([disabled])',
          '[tabindex]:not([tabindex="-1"])',
          '[contenteditable="true"]'
        ].join(', ')
        
        return Array.from(container.querySelectorAll(selector))
          .filter(el => this.isVisible(el))
      },
      
      // Check if element is visible
      isVisible(element) {
        const style = window.getComputedStyle(element)
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0'
      }
    }
  }

  /**
   * Create skip links for keyboard navigation
   */
  createSkipLinks() {
    const skipLinksContainer = document.createElement('div')
    skipLinksContainer.className = 'skip-links'
    skipLinksContainer.setAttribute('aria-label', 'Skip navigation links')
    
    const skipLinks = [
      { href: '#main-content', text: 'Skip to main content' },
      { href: '#navigation', text: 'Skip to navigation' },
      { href: '#search', text: 'Skip to search' },
      { href: '#footer', text: 'Skip to footer' }
    ]
    
    skipLinks.forEach(link => {
      const skipLink = document.createElement('a')
      skipLink.href = link.href
      skipLink.textContent = link.text
      skipLink.className = 'skip-link'
      skipLink.addEventListener('click', this.handleSkipLinkClick.bind(this))
      skipLinksContainer.appendChild(skipLink)
    })
    
    document.body.insertBefore(skipLinksContainer, document.body.firstChild)
  }

  /**
   * Handle skip link clicks
   */
  handleSkipLinkClick(event) {
    event.preventDefault()
    const targetId = event.target.getAttribute('href').substring(1)
    const target = document.getElementById(targetId)
    
    if (target) {
      target.focus()
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      this.announce(`Skipped to ${event.target.textContent.toLowerCase()}`)
    }
  }

  /**
   * Create landmark management
   */
  createLandmarkManager() {
    this.landmarkManager = {
      // Ensure proper landmark structure
      ensureLandmarks() {
        this.ensureMain()
        this.ensureNavigation()
        this.ensureHeader()
        this.ensureFooter()
      },
      
      ensureMain() {
        if (!document.querySelector('main, [role="main"]')) {
          const main = document.createElement('main')
          main.id = 'main-content'
          const content = document.querySelector('.app-content, .main-content, #app > div')
          if (content) {
            content.parentNode.insertBefore(main, content)
            main.appendChild(content)
          }
        }
      },
      
      ensureNavigation() {
        const nav = document.querySelector('nav, [role="navigation"]')
        if (nav && !nav.id) {
          nav.id = 'navigation'
        }
      },
      
      ensureHeader() {
        const header = document.querySelector('header, [role="banner"]')
        if (header && !header.id) {
          header.id = 'header'
        }
      },
      
      ensureFooter() {
        const footer = document.querySelector('footer, [role="contentinfo"]')
        if (footer && !footer.id) {
          footer.id = 'footer'
        }
      }
    }
  }

  /**
   * Detect user accessibility preferences
   */
  detectUserPreferences() {
    // Detect reduced motion preference
    if (window.matchMedia) {
      const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      this.isReducedMotion = reducedMotionQuery.matches
      
      reducedMotionQuery.addEventListener('change', (e) => {
        this.isReducedMotion = e.matches
        this.applyMotionPreferences()
      })
      
      // Detect high contrast preference
      const highContrastQuery = window.matchMedia('(prefers-contrast: high)')
      this.isHighContrast = highContrastQuery.matches
      
      highContrastQuery.addEventListener('change', (e) => {
        this.isHighContrast = e.matches
        this.applyContrastPreferences()
      })
    }
  }

  /**
   * Apply motion preferences
   */
  applyMotionPreferences() {
    document.documentElement.classList.toggle('reduce-motion', this.isReducedMotion)
    
    if (this.isReducedMotion) {
      // Disable animations and transitions
      const style = document.createElement('style')
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      `
      style.id = 'reduced-motion-styles'
      document.head.appendChild(style)
    } else {
      const existingStyle = document.getElementById('reduced-motion-styles')
      if (existingStyle) {
        existingStyle.remove()
      }
    }
  }

  /**
   * Apply contrast preferences
   */
  applyContrastPreferences() {
    document.documentElement.classList.toggle('high-contrast', this.isHighContrast)
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Handle route changes
    window.addEventListener('popstate', () => {
      this.handleRouteChange()
    })
    
    // Handle dynamic content updates
    this.observeContentChanges()
    
    // Handle focus trapping for modals
    document.addEventListener('keydown', this.handleKeyDown.bind(this))
  }

  /**
   * Handle route changes
   */
  handleRouteChange() {
    // Announce page change
    const pageTitle = document.title
    this.announce(`Navigated to ${pageTitle}`)
    
    // Focus main content
    setTimeout(() => {
      const main = document.querySelector('main, [role="main"], #main-content')
      if (main) {
        main.focus()
        main.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
    
    // Update landmarks
    this.landmarkManager.ensureLandmarks()
  }

  /**
   * Observe content changes for AJAX updates
   */
  observeContentChanges() {
    if (window.MutationObserver) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            this.handleContentUpdate(mutation.addedNodes)
          }
        })
      })
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      })
    }
  }

  /**
   * Handle dynamic content updates
   */
  handleContentUpdate(addedNodes) {
    addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // Add ARIA labels to unlabeled elements
        this.addMissingLabels(node)
        
        // Ensure proper heading hierarchy
        this.checkHeadingHierarchy(node)
        
        // Add focus management to interactive elements
        this.enhanceInteractiveElements(node)
      }
    })
  }

  /**
   * Add missing ARIA labels
   */
  addMissingLabels(container) {
    // Label buttons without accessible names
    const unlabeledButtons = container.querySelectorAll('button:not([aria-label]):not([aria-labelledby])')
    unlabeledButtons.forEach((button) => {
      if (!button.textContent.trim()) {
        const icon = button.querySelector('i, svg')
        if (icon) {
          button.setAttribute('aria-label', this.getIconLabel(icon))
        }
      }
    })
    
    // Label form inputs without labels
    const unlabeledInputs = container.querySelectorAll('input:not([aria-label]):not([aria-labelledby])')
    unlabeledInputs.forEach((input) => {
      const placeholder = input.getAttribute('placeholder')
      if (placeholder) {
        input.setAttribute('aria-label', placeholder)
      }
    })
  }

  /**
   * Get appropriate label for icons
   */
  getIconLabel(icon) {
    const iconMap = {
      'fa-search': 'Search',
      'fa-user': 'User profile',
      'fa-home': 'Home',
      'fa-menu': 'Menu',
      'fa-close': 'Close',
      'fa-times': 'Close',
      'fa-edit': 'Edit',
      'fa-delete': 'Delete',
      'fa-save': 'Save',
      'fa-play': 'Play',
      'fa-pause': 'Pause',
      'fa-heart': 'Like',
      'fa-share': 'Share'
    }
    
    const className = icon.className
    for (const [iconClass, label] of Object.entries(iconMap)) {
      if (className.includes(iconClass)) {
        return label
      }
    }
    
    return 'Button'
  }

  /**
   * Check heading hierarchy
   */
  checkHeadingHierarchy(container) {
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6')
    let lastLevel = 0
    
    headings.forEach((heading) => {
      const level = parseInt(heading.tagName.charAt(1))
      
      if (level > lastLevel + 1) {
        console.warn(`Heading hierarchy skip detected: ${heading.tagName} after h${lastLevel}`, heading)
      }
      
      lastLevel = level
    })
  }

  /**
   * Enhance interactive elements
   */
  enhanceInteractiveElements(container) {
    // Add keyboard support to clickable elements
    const clickableElements = container.querySelectorAll('[onclick], .clickable')
    clickableElements.forEach((element) => {
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '0')
      }
      
      if (!element.hasAttribute('role')) {
        element.setAttribute('role', 'button')
      }
      
      element.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          element.click()
        }
      })
    })
  }

  /**
   * Handle keyboard navigation
   */
  handleKeyDown(event) {
    // Handle Escape key for modals
    if (event.key === 'Escape') {
      const modal = document.querySelector('.modal:not(.hidden), .overlay:not(.hidden)')
      if (modal) {
        const closeButton = modal.querySelector('.close, [aria-label*="close" i]')
        if (closeButton) {
          closeButton.click()
        }
      }
    }
  }

  /**
   * Load user accessibility settings
   */
  loadUserSettings() {
    try {
      const settings = localStorage.getItem('accessibility-settings')
      if (settings) {
        const parsed = JSON.parse(settings)
        this.fontSize = parsed.fontSize || 'normal'
        this.applyFontSize()
      }
    } catch (error) {
      console.error('Failed to load accessibility settings:', error)
    }
  }

  /**
   * Save user accessibility settings
   */
  saveUserSettings() {
    try {
      const settings = {
        fontSize: this.fontSize
      }
      localStorage.setItem('accessibility-settings', JSON.stringify(settings))
    } catch (error) {
      console.error('Failed to save accessibility settings:', error)
    }
  }

  /**
   * Apply font size preference
   */
  applyFontSize() {
    document.documentElement.classList.remove('font-small', 'font-large', 'font-extra-large')
    
    if (this.fontSize !== 'normal') {
      document.documentElement.classList.add(`font-${this.fontSize}`)
    }
  }

  /**
   * Set font size
   */
  setFontSize(size) {
    this.fontSize = size
    this.applyFontSize()
    this.saveUserSettings()
    this.announce(`Font size changed to ${size}`)
  }

  /**
   * Public API methods
   */
  
  // Announce AJAX content updates
  announceUpdate(message) {
    this.announce(message)
  }
  
  // Focus management for modals
  trapFocus(container) {
    const focusableElements = this.focusManager.getFocusableElements(container)
    if (focusableElements.length === 0) return
    
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    
    container.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    })
    
    firstElement.focus()
  }
  
  // Remove focus trap
  removeFocusTrap(container) {
    container.removeEventListener('keydown', this.trapFocus)
  }
}

// Create singleton instance
const accessibilityManager = new AccessibilityManager()

// Export accessibility manager
export default accessibilityManager

export const useAccessibility = () => accessibilityManager

// Vue plugin for easy integration
export const AccessibilityPlugin = {
  install(app) {
    app.config.globalProperties.$accessibility = accessibilityManager
    app.provide('accessibility', accessibilityManager)
  }
}
