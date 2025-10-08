import { ref, reactive, computed, watch } from 'vue'

// Global state for i18n
const currentLocale = ref('en')
const fallbackLocale = ref('en')
const translations = reactive({})
const loadedLocales = new Set()
const missingKeys = new Set()

// Supported locales configuration
const supportedLocales = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', rtl: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', rtl: false },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', rtl: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', rtl: false },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', rtl: false },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', rtl: false },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', rtl: false },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', rtl: false },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', rtl: false },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', rtl: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', rtl: true }
]

// Number and currency formatters
const numberFormatters = {}
const currencyFormatters = {}
const dateFormatters = {}

/**
 * Main i18n composable
 */
export function useI18n() {
  
  /**
   * Load translations for a locale
   */
  const loadTranslations = async (locale) => {
    if (loadedLocales.has(locale)) {
      return
    }

    try {
      // Try to load from API first
      const response = await fetch(`/api/i18n/translations/${locale}`)
      if (response.ok) {
        const data = await response.json()
        translations[locale] = data
      } else {
        // Fallback to static files
        const module = await import(`../locales/${locale}.json`)
        translations[locale] = module.default
      }
      
      loadedLocales.add(locale)
    } catch (error) {
      console.warn(`Failed to load translations for locale: ${locale}`, error)
      
      // If it's not the fallback locale, try loading that
      if (locale !== fallbackLocale.value) {
        await loadTranslations(fallbackLocale.value)
      }
    }
  }

  /**
   * Set current locale
   */
  const setLocale = async (locale) => {
    if (!isLocaleSupported(locale)) {
      console.warn(`Locale ${locale} is not supported`)
      return false
    }

    await loadTranslations(locale)
    currentLocale.value = locale
    
    // Update document attributes
    document.documentElement.lang = locale
    document.documentElement.dir = isRTL(locale) ? 'rtl' : 'ltr'
    
    // Store in localStorage
    localStorage.setItem('preferred-locale', locale)
    
    return true
  }

  /**
   * Translate a key
   */
  const t = (key, params = {}, locale = null) => {
    const targetLocale = locale || currentLocale.value
    
    // Get translation value
    let translation = getTranslationValue(key, targetLocale)
    
    // Fallback to default locale if not found
    if (translation === null && targetLocale !== fallbackLocale.value) {
      translation = getTranslationValue(key, fallbackLocale.value)
    }
    
    // If still not found, log missing key and return key
    if (translation === null) {
      logMissingTranslation(key, targetLocale)
      return key
    }
    
    // Replace parameters
    return replaceParameters(translation, params)
  }

  /**
   * Translate with pluralization
   */
  const tc = (key, count, params = {}, locale = null) => {
    const targetLocale = locale || currentLocale.value
    
    // Get plural form
    const pluralKey = getPluralKey(key, count, targetLocale)
    
    // Add count to parameters
    const allParams = { count, ...params }
    
    return t(pluralKey, allParams, locale)
  }

  /**
   * Check if translation exists
   */
  const te = (key, locale = null) => {
    const targetLocale = locale || currentLocale.value
    return getTranslationValue(key, targetLocale) !== null
  }

  /**
   * Get all translations for a locale
   */
  const getTranslations = (locale = null) => {
    const targetLocale = locale || currentLocale.value
    return translations[targetLocale] || {}
  }

  /**
   * Format number according to current locale
   */
  const n = (number, options = {}, locale = null) => {
    const targetLocale = locale || currentLocale.value
    
    if (!numberFormatters[targetLocale]) {
      numberFormatters[targetLocale] = new Intl.NumberFormat(getIntlLocale(targetLocale), {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
        ...options
      })
    }
    
    return numberFormatters[targetLocale].format(number)
  }

  /**
   * Format currency according to current locale
   */
  const c = (amount, currency = 'USD', locale = null) => {
    const targetLocale = locale || currentLocale.value
    const key = `${targetLocale}-${currency}`
    
    if (!currencyFormatters[key]) {
      currencyFormatters[key] = new Intl.NumberFormat(getIntlLocale(targetLocale), {
        style: 'currency',
        currency: currency
      })
    }
    
    return currencyFormatters[key].format(amount)
  }

  /**
   * Format date according to current locale
   */
  const d = (date, options = {}, locale = null) => {
    const targetLocale = locale || currentLocale.value
    const key = `${targetLocale}-${JSON.stringify(options)}`
    
    if (!dateFormatters[key]) {
      dateFormatters[key] = new Intl.DateTimeFormat(getIntlLocale(targetLocale), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...options
      })
    }
    
    return dateFormatters[key].format(new Date(date))
  }

  /**
   * Get relative time (e.g., "2 hours ago")
   */
  const rt = (date, locale = null) => {
    const targetLocale = locale || currentLocale.value
    
    if (Intl.RelativeTimeFormat) {
      const rtf = new Intl.RelativeTimeFormat(getIntlLocale(targetLocale), { numeric: 'auto' })
      const now = new Date()
      const target = new Date(date)
      const diffInSeconds = (target - now) / 1000
      
      const units = [
        { unit: 'year', seconds: 31536000 },
        { unit: 'month', seconds: 2592000 },
        { unit: 'day', seconds: 86400 },
        { unit: 'hour', seconds: 3600 },
        { unit: 'minute', seconds: 60 },
        { unit: 'second', seconds: 1 }
      ]
      
      for (const { unit, seconds } of units) {
        const interval = Math.floor(Math.abs(diffInSeconds) / seconds)
        if (interval >= 1) {
          return rtf.format(diffInSeconds < 0 ? -interval : interval, unit)
        }
      }
      
      return rtf.format(0, 'second')
    }
    
    // Fallback for browsers without RelativeTimeFormat
    return d(date, { dateStyle: 'medium', timeStyle: 'short' }, locale)
  }

  /**
   * Auto-detect locale from browser
   */
  const detectLocale = () => {
    // Check localStorage first
    const stored = localStorage.getItem('preferred-locale')
    if (stored && isLocaleSupported(stored)) {
      return stored
    }
    
    // Check browser languages
    const browserLanguages = navigator.languages || [navigator.language]
    
    for (const lang of browserLanguages) {
      const locale = lang.split('-')[0].toLowerCase()
      if (isLocaleSupported(locale)) {
        return locale
      }
    }
    
    return fallbackLocale.value
  }

  /**
   * Initialize i18n
   */
  const init = async () => {
    const detectedLocale = detectLocale()
    await setLocale(detectedLocale)
  }

  // Helper functions
  const isLocaleSupported = (locale) => {
    return supportedLocales.some(l => l.code === locale)
  }

  const isRTL = (locale = null) => {
    const targetLocale = locale || currentLocale.value
    const localeInfo = supportedLocales.find(l => l.code === targetLocale)
    return localeInfo?.rtl || false
  }

  const getLocaleInfo = (locale = null) => {
    const targetLocale = locale || currentLocale.value
    return supportedLocales.find(l => l.code === targetLocale) || supportedLocales[0]
  }

  const getIntlLocale = (locale) => {
    const localeMap = {
      'en': 'en-US',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'it': 'it-IT',
      'pt': 'pt-PT',
      'ru': 'ru-RU',
      'zh': 'zh-CN',
      'ja': 'ja-JP',
      'ko': 'ko-KR',
      'ar': 'ar-SA',
      'he': 'he-IL'
    }
    return localeMap[locale] || 'en-US'
  }

  const getTranslationValue = (key, locale) => {
    if (!translations[locale]) {
      return null
    }
    
    // Support nested keys (e.g., 'common.buttons.save')
    const keys = key.split('.')
    let value = translations[locale]
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        return null
      }
    }
    
    return typeof value === 'string' ? value : null
  }

  const replaceParameters = (translation, params) => {
    return translation.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match
    })
  }

  const getPluralKey = (key, count, locale) => {
    // Simple pluralization rules (can be extended for complex languages)
    const pluralRules = {
      'en': (n) => n === 1 ? 'one' : 'other',
      'es': (n) => n === 1 ? 'one' : 'other',
      'fr': (n) => n <= 1 ? 'one' : 'other',
      'de': (n) => n === 1 ? 'one' : 'other',
      'it': (n) => n === 1 ? 'one' : 'other',
      'pt': (n) => n === 1 ? 'one' : 'other',
      'ru': (n) => {
        if (n % 10 === 1 && n % 100 !== 11) return 'one'
        if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'few'
        return 'many'
      },
      'zh': () => 'other',
      'ja': () => 'other',
      'ko': () => 'other',
      'ar': (n) => {
        if (n === 0) return 'zero'
        if (n === 1) return 'one'
        if (n === 2) return 'two'
        if (n % 100 >= 3 && n % 100 <= 10) return 'few'
        if (n % 100 >= 11) return 'many'
        return 'other'
      },
      'he': (n) => n === 1 ? 'one' : 'other'
    }
    
    const rule = pluralRules[locale] || pluralRules['en']
    const form = rule(count)
    
    return `${key}.${form}`
  }

  const logMissingTranslation = (key, locale) => {
    if (missingKeys.has(`${locale}:${key}`)) {
      return
    }
    
    missingKeys.add(`${locale}:${key}`)
    console.warn(`Missing translation: ${key} for locale: ${locale}`)
    
    // Report to server in development
    if (process.env.NODE_ENV === 'development') {
      fetch('/api/i18n/missing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, locale })
      }).catch(() => {}) // Ignore errors
    }
  }

  // Computed properties
  const locale = computed(() => currentLocale.value)
  const availableLocales = computed(() => supportedLocales)
  const isRTLMode = computed(() => isRTL())
  const localeInfo = computed(() => getLocaleInfo())

  // Watch for locale changes to update formatters
  watch(currentLocale, () => {
    // Clear formatters cache when locale changes
    Object.keys(numberFormatters).forEach(key => {
      if (key.startsWith(currentLocale.value)) {
        delete numberFormatters[key]
      }
    })
    Object.keys(currencyFormatters).forEach(key => {
      if (key.startsWith(currentLocale.value)) {
        delete currencyFormatters[key]
      }
    })
    Object.keys(dateFormatters).forEach(key => {
      if (key.startsWith(currentLocale.value)) {
        delete dateFormatters[key]
      }
    })
  })

  return {
    // State
    locale,
    availableLocales,
    isRTLMode,
    localeInfo,
    
    // Methods
    t,
    tc,
    te,
    n,
    c,
    d,
    rt,
    setLocale,
    loadTranslations,
    getTranslations,
    detectLocale,
    init,
    isLocaleSupported,
    isRTL,
    getLocaleInfo
  }
}

// Global instance for app-wide usage
let globalI18n = null

export function createI18n() {
  if (!globalI18n) {
    globalI18n = useI18n()
  }
  return globalI18n
}

export function getGlobalI18n() {
  return globalI18n || createI18n()
}
