/**
 * Keyboard Shortcuts System for Power Users
 */
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

class KeyboardShortcuts {
  constructor() {
    this.shortcuts = new Map()
    this.sequences = new Map()
    this.currentSequence = []
    this.sequenceTimeout = null
    this.sequenceTimeoutDuration = 2000 // 2 seconds
    this.isEnabled = true
    this.excludedElements = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON']
    this.modifierKeys = ['ctrl', 'alt', 'shift', 'meta']
    
    this.init()
  }

  /**
   * Initialize keyboard shortcuts
   */
  init() {
    document.addEventListener('keydown', this.handleKeyDown.bind(this))
    document.addEventListener('keyup', this.handleKeyUp.bind(this))
    
    // Load user preferences
    this.loadPreferences()
    
    // Register default shortcuts
    this.registerDefaultShortcuts()
  }

  /**
   * Handle keydown events
   */
  handleKeyDown(event) {
    if (!this.isEnabled) return
    
    // Skip if user is typing in form elements
    if (this.isTypingInForm(event.target)) return
    
    // Handle modifier combinations
    if (this.hasModifiers(event)) {
      this.handleModifierShortcut(event)
      return
    }
    
    // Handle key sequences
    this.handleKeySequence(event)
  }

  /**
   * Handle keyup events
   */
  handleKeyUp(event) {
    // Clear sequence timeout on any key release
    if (this.sequenceTimeout) {
      clearTimeout(this.sequenceTimeout)
      this.sequenceTimeout = setTimeout(() => {
        this.currentSequence = []
      }, this.sequenceTimeoutDuration)
    }
  }

  /**
   * Check if user is typing in form elements
   */
  isTypingInForm(element) {
    if (!element) return false
    
    const tagName = element.tagName.toUpperCase()
    const isContentEditable = element.contentEditable === 'true'
    const isFormElement = this.excludedElements.includes(tagName)
    
    return isFormElement || isContentEditable
  }

  /**
   * Check if event has modifier keys
   */
  hasModifiers(event) {
    return event.ctrlKey || event.altKey || event.shiftKey || event.metaKey
  }

  /**
   * Handle modifier key shortcuts
   */
  handleModifierShortcut(event) {
    const key = this.getShortcutKey(event)
    const shortcut = this.shortcuts.get(key)
    
    if (shortcut) {
      event.preventDefault()
      this.executeShortcut(shortcut, event)
    }
  }

  /**
   * Handle key sequences (like vim-style commands)
   */
  handleKeySequence(event) {
    // Add key to current sequence
    this.currentSequence.push(event.key.toLowerCase())
    
    // Check for sequence matches
    const sequenceKey = this.currentSequence.join('')
    const sequence = this.sequences.get(sequenceKey)
    
    if (sequence) {
      event.preventDefault()
      this.executeShortcut(sequence, event)
      this.currentSequence = []
      return
    }
    
    // Check if current sequence could be part of a longer sequence
    const hasPartialMatch = Array.from(this.sequences.keys()).some(key => 
      key.startsWith(sequenceKey)
    )
    
    if (!hasPartialMatch) {
      this.currentSequence = []
    }
    
    // Set timeout to clear sequence
    if (this.sequenceTimeout) {
      clearTimeout(this.sequenceTimeout)
    }
    
    this.sequenceTimeout = setTimeout(() => {
      this.currentSequence = []
    }, this.sequenceTimeoutDuration)
  }

  /**
   * Get shortcut key string
   */
  getShortcutKey(event) {
    const parts = []
    
    if (event.ctrlKey) parts.push('ctrl')
    if (event.altKey) parts.push('alt')
    if (event.shiftKey) parts.push('shift')
    if (event.metaKey) parts.push('meta')
    
    parts.push(event.key.toLowerCase())
    
    return parts.join('+')
  }

  /**
   * Register a keyboard shortcut
   */
  register(key, action, description, category = 'general') {
    const shortcut = {
      key,
      action,
      description,
      category,
      enabled: true
    }
    
    if (key.includes('+')) {
      this.shortcuts.set(key, shortcut)
    } else {
      this.sequences.set(key, shortcut)
    }
    
    return this
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregister(key) {
    this.shortcuts.delete(key)
    this.sequences.delete(key)
    return this
  }

  /**
   * Execute shortcut action
   */
  executeShortcut(shortcut, event) {
    if (!shortcut.enabled) return
    
    try {
      if (typeof shortcut.action === 'function') {
        shortcut.action(event)
      } else if (typeof shortcut.action === 'string') {
        this.executeStringAction(shortcut.action)
      }
      
      // Show feedback
      this.showShortcutFeedback(shortcut)
      
    } catch (error) {
      console.error('Error executing shortcut:', error)
    }
  }

  /**
   * Execute string-based actions
   */
  executeStringAction(action) {
    const router = useRouter()
    const authStore = useAuthStore()
    
    switch (action) {
      case 'navigate:home':
        router.push('/')
        break
      case 'navigate:explore':
        router.push('/explore')
        break
      case 'navigate:profile':
        if (authStore.isAuthenticated) {
          router.push('/profile')
        }
        break
      case 'navigate:dashboard':
        if (authStore.isAuthenticated) {
          router.push('/dashboard')
        }
        break
      case 'navigate:create':
        if (authStore.isAuthenticated) {
          router.push('/create')
        }
        break
      case 'navigate:settings':
        if (authStore.isAuthenticated) {
          router.push('/settings')
        }
        break
      case 'navigate:business':
        router.push('/business')
        break
      case 'action:search':
        this.focusSearchBox()
        break
      case 'action:logout':
        if (authStore.isAuthenticated) {
          authStore.logout()
        }
        break
      case 'action:help':
        this.showHelpModal()
        break
      case 'action:shortcuts':
        this.showShortcutsModal()
        break
      default:
        console.warn('Unknown action:', action)
    }
  }

  /**
   * Focus search box
   */
  focusSearchBox() {
    const searchBox = document.querySelector('input[type="search"], input[placeholder*="search" i], .search-input')
    if (searchBox) {
      searchBox.focus()
      searchBox.select()
    }
  }

  /**
   * Show shortcut feedback
   */
  showShortcutFeedback(shortcut) {
    // Create temporary feedback element
    const feedback = document.createElement('div')
    feedback.className = 'shortcut-feedback'
    feedback.textContent = shortcut.description
    feedback.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 10000;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
    `
    
    document.body.appendChild(feedback)
    
    // Animate in
    setTimeout(() => {
      feedback.style.opacity = '1'
    }, 10)
    
    // Remove after delay
    setTimeout(() => {
      feedback.style.opacity = '0'
      setTimeout(() => {
        if (feedback.parentNode) {
          feedback.parentNode.removeChild(feedback)
        }
      }, 200)
    }, 1500)
  }

  /**
   * Show help modal
   */
  showHelpModal() {
    // Emit event for help modal
    window.dispatchEvent(new CustomEvent('show-help-modal'))
  }

  /**
   * Show shortcuts modal
   */
  showShortcutsModal() {
    // Emit event for shortcuts modal
    window.dispatchEvent(new CustomEvent('show-shortcuts-modal'))
  }

  /**
   * Register default shortcuts
   */
  registerDefaultShortcuts() {
    // Navigation shortcuts
    this.register('ctrl+h', 'navigate:home', 'Go to Home', 'navigation')
    this.register('ctrl+e', 'navigate:explore', 'Go to Explore', 'navigation')
    this.register('ctrl+p', 'navigate:profile', 'Go to Profile', 'navigation')
    this.register('ctrl+d', 'navigate:dashboard', 'Go to Dashboard', 'navigation')
    this.register('ctrl+n', 'navigate:create', 'Create New Interview', 'navigation')
    this.register('ctrl+,', 'navigate:settings', 'Go to Settings', 'navigation')
    this.register('ctrl+b', 'navigate:business', 'Go to Business Directory', 'navigation')
    
    // Action shortcuts
    this.register('ctrl+k', 'action:search', 'Focus Search', 'actions')
    this.register('ctrl+/', 'action:shortcuts', 'Show Keyboard Shortcuts', 'actions')
    this.register('ctrl+shift+h', 'action:help', 'Show Help', 'actions')
    this.register('ctrl+shift+l', 'action:logout', 'Logout', 'actions')
    
    // Vim-style sequences
    this.register('gh', 'navigate:home', 'Go to Home (vim-style)', 'vim')
    this.register('ge', 'navigate:explore', 'Go to Explore (vim-style)', 'vim')
    this.register('gp', 'navigate:profile', 'Go to Profile (vim-style)', 'vim')
    this.register('gd', 'navigate:dashboard', 'Go to Dashboard (vim-style)', 'vim')
    this.register('gc', 'navigate:create', 'Create Interview (vim-style)', 'vim')
    this.register('gs', 'navigate:settings', 'Go to Settings (vim-style)', 'vim')
    this.register('gb', 'navigate:business', 'Go to Business (vim-style)', 'vim')
    
    // Quick actions
    this.register('?', 'action:shortcuts', 'Show Shortcuts', 'quick')
    this.register('/', 'action:search', 'Search', 'quick')
  }

  /**
   * Get all shortcuts grouped by category
   */
  getShortcutsByCategory() {
    const categories = {}
    
    // Process regular shortcuts
    for (const [key, shortcut] of this.shortcuts.entries()) {
      if (!categories[shortcut.category]) {
        categories[shortcut.category] = []
      }
      categories[shortcut.category].push({ ...shortcut, key })
    }
    
    // Process sequences
    for (const [key, shortcut] of this.sequences.entries()) {
      if (!categories[shortcut.category]) {
        categories[shortcut.category] = []
      }
      categories[shortcut.category].push({ ...shortcut, key })
    }
    
    return categories
  }

  /**
   * Enable/disable shortcuts
   */
  setEnabled(enabled) {
    this.isEnabled = enabled
  }

  /**
   * Load user preferences
   */
  loadPreferences() {
    try {
      const prefs = localStorage.getItem('keyboard-shortcuts-prefs')
      if (prefs) {
        const preferences = JSON.parse(prefs)
        this.isEnabled = preferences.enabled !== false
      }
    } catch (error) {
      console.error('Failed to load keyboard shortcuts preferences:', error)
    }
  }

  /**
   * Save user preferences
   */
  savePreferences() {
    try {
      const preferences = {
        enabled: this.isEnabled
      }
      localStorage.setItem('keyboard-shortcuts-prefs', JSON.stringify(preferences))
    } catch (error) {
      console.error('Failed to save keyboard shortcuts preferences:', error)
    }
  }

  /**
   * Destroy shortcuts system
   */
  destroy() {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this))
    document.removeEventListener('keyup', this.handleKeyUp.bind(this))
    
    if (this.sequenceTimeout) {
      clearTimeout(this.sequenceTimeout)
    }
    
    this.shortcuts.clear()
    this.sequences.clear()
  }
}

// Create singleton instance
const keyboardShortcuts = new KeyboardShortcuts()

// Export shortcuts instance
export default keyboardShortcuts

export const useKeyboardShortcuts = () => keyboardShortcuts

// Vue plugin for easy integration
export const KeyboardShortcutsPlugin = {
  install(app) {
    app.config.globalProperties.$shortcuts = keyboardShortcuts
    app.provide('shortcuts', keyboardShortcuts)
  }
}
