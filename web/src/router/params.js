/**
 * Route Parameter Extraction and Validation Utilities
 */

/**
 * Parameter validation rules
 */
export const paramValidators = {
  // Numeric validators
  id: (value) => /^\d+$/.test(value) && parseInt(value) > 0,
  number: (value) => /^\d+$/.test(value),
  float: (value) => /^\d+(\.\d+)?$/.test(value),
  
  // String validators
  slug: (value) => /^[a-z0-9-]+$/.test(value) && value.length <= 100,
  username: (value) => /^[a-zA-Z0-9._-]+$/.test(value) && value.length >= 3 && value.length <= 30,
  email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  
  // Date validators
  date: (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value)),
  year: (value) => /^\d{4}$/.test(value) && parseInt(value) >= 1900 && parseInt(value) <= new Date().getFullYear() + 10,
  
  // Category validators
  category: (value) => /^[a-z0-9-]+$/.test(value) && value.length <= 50,
  tag: (value) => /^[a-zA-Z0-9-_]+$/.test(value) && value.length <= 30,
  
  // UUID validator
  uuid: (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  
  // Custom validators
  interviewSlug: (value) => /^[a-z0-9-]+$/.test(value) && value.length >= 5 && value.length <= 100,
  businessSlug: (value) => /^[a-z0-9-]+$/.test(value) && value.length >= 3 && value.length <= 80,
  profileSlug: (value) => /^[a-zA-Z0-9._-]+$/.test(value) && value.length >= 3 && value.length <= 30
}

/**
 * Parameter type converters
 */
export const paramConverters = {
  int: (value) => parseInt(value, 10),
  float: (value) => parseFloat(value),
  bool: (value) => value === 'true' || value === '1',
  array: (value) => value.split(',').filter(Boolean),
  json: (value) => {
    try {
      return JSON.parse(decodeURIComponent(value))
    } catch {
      return null
    }
  },
  date: (value) => new Date(value),
  string: (value) => String(value),
  slug: (value) => String(value).toLowerCase()
}

/**
 * Extract and validate route parameters
 */
export class RouteParamExtractor {
  constructor(route) {
    this.route = route
    this.params = { ...route.params }
    this.query = { ...route.query }
    this.errors = []
  }

  /**
   * Validate parameter with custom validator
   */
  validate(paramName, validator, required = true) {
    const value = this.params[paramName]
    
    if (!value && required) {
      this.errors.push(`Parameter '${paramName}' is required`)
      return this
    }
    
    if (value && !validator(value)) {
      this.errors.push(`Parameter '${paramName}' is invalid`)
    }
    
    return this
  }

  /**
   * Validate parameter with predefined validator
   */
  validateWith(paramName, validatorName, required = true) {
    const validator = paramValidators[validatorName]
    if (!validator) {
      throw new Error(`Unknown validator: ${validatorName}`)
    }
    
    return this.validate(paramName, validator, required)
  }

  /**
   * Convert parameter to specific type
   */
  convert(paramName, converterName) {
    const converter = paramConverters[converterName]
    if (!converter) {
      throw new Error(`Unknown converter: ${converterName}`)
    }
    
    const value = this.params[paramName]
    if (value !== undefined) {
      this.params[paramName] = converter(value)
    }
    
    return this
  }

  /**
   * Extract and validate ID parameter
   */
  id(paramName = 'id', required = true) {
    return this.validateWith(paramName, 'id', required).convert(paramName, 'int')
  }

  /**
   * Extract and validate slug parameter
   */
  slug(paramName = 'slug', required = true) {
    return this.validateWith(paramName, 'slug', required).convert(paramName, 'slug')
  }

  /**
   * Extract and validate username parameter
   */
  username(paramName = 'username', required = true) {
    return this.validateWith(paramName, 'username', required)
  }

  /**
   * Extract and validate interview slug
   */
  interviewSlug(paramName = 'slug', required = true) {
    return this.validateWith(paramName, 'interviewSlug', required)
  }

  /**
   * Extract and validate business slug
   */
  businessSlug(paramName = 'slug', required = true) {
    return this.validateWith(paramName, 'businessSlug', required)
  }

  /**
   * Extract and validate profile slug
   */
  profileSlug(paramName = 'username', required = true) {
    return this.validateWith(paramName, 'profileSlug', required)
  }

  /**
   * Extract and validate category
   */
  category(paramName = 'category', required = true) {
    return this.validateWith(paramName, 'category', required)
  }

  /**
   * Extract and validate date
   */
  date(paramName = 'date', required = true) {
    return this.validateWith(paramName, 'date', required).convert(paramName, 'date')
  }

  /**
   * Extract and validate year
   */
  year(paramName = 'year', required = true) {
    return this.validateWith(paramName, 'year', required).convert(paramName, 'int')
  }

  /**
   * Extract query parameters with validation
   */
  queryParam(paramName, validator, converter, defaultValue = null) {
    const value = this.query[paramName]
    
    if (!value) {
      this.query[paramName] = defaultValue
      return this
    }
    
    if (validator && !validator(value)) {
      this.errors.push(`Query parameter '${paramName}' is invalid`)
      this.query[paramName] = defaultValue
      return this
    }
    
    if (converter) {
      this.query[paramName] = converter(value)
    }
    
    return this
  }

  /**
   * Extract pagination parameters
   */
  pagination() {
    this.queryParam('page', (v) => /^\d+$/.test(v) && parseInt(v) > 0, paramConverters.int, 1)
    this.queryParam('limit', (v) => /^\d+$/.test(v) && parseInt(v) <= 100, paramConverters.int, 20)
    this.queryParam('offset', (v) => /^\d+$/.test(v), paramConverters.int, 0)
    
    return this
  }

  /**
   * Extract sorting parameters
   */
  sorting() {
    this.queryParam('sort', (v) => /^[a-zA-Z_]+$/.test(v), paramConverters.string, 'created_at')
    this.queryParam('order', (v) => ['asc', 'desc'].includes(v.toLowerCase()), (v) => v.toLowerCase(), 'desc')
    
    return this
  }

  /**
   * Extract filtering parameters
   */
  filtering() {
    this.queryParam('search', (v) => v.length <= 100, paramConverters.string, '')
    this.queryParam('category', paramValidators.category, paramConverters.string, null)
    this.queryParam('tags', (v) => v.split(',').every(tag => paramValidators.tag(tag)), paramConverters.array, [])
    this.queryParam('status', (v) => ['active', 'inactive', 'pending'].includes(v), paramConverters.string, null)
    
    return this
  }

  /**
   * Extract date range parameters
   */
  dateRange() {
    this.queryParam('from', paramValidators.date, paramConverters.date, null)
    this.queryParam('to', paramValidators.date, paramConverters.date, null)
    
    return this
  }

  /**
   * Get validation results
   */
  getResult() {
    return {
      params: this.params,
      query: this.query,
      errors: this.errors,
      isValid: this.errors.length === 0
    }
  }

  /**
   * Throw error if validation failed
   */
  validate() {
    if (this.errors.length > 0) {
      throw new Error(`Parameter validation failed: ${this.errors.join(', ')}`)
    }
    
    return {
      params: this.params,
      query: this.query
    }
  }
}

/**
 * Create parameter extractor for route
 */
export function extractParams(route) {
  return new RouteParamExtractor(route)
}

/**
 * Common parameter extraction patterns
 */
export const paramPatterns = {
  // Interview detail page
  interviewDetail: (route) => {
    return extractParams(route)
      .interviewSlug()
      .getResult()
  },

  // User profile page
  userProfile: (route) => {
    return extractParams(route)
      .profileSlug()
      .getResult()
  },

  // Business profile page
  businessProfile: (route) => {
    return extractParams(route)
      .businessSlug()
      .getResult()
  },

  // Category page
  categoryPage: (route) => {
    return extractParams(route)
      .category()
      .pagination()
      .sorting()
      .filtering()
      .getResult()
  },

  // Search results
  searchResults: (route) => {
    return extractParams(route)
      .pagination()
      .sorting()
      .filtering()
      .getResult()
  },

  // Admin pages
  adminList: (route) => {
    return extractParams(route)
      .pagination()
      .sorting()
      .filtering()
      .dateRange()
      .getResult()
  },

  // Edit pages
  editPage: (route) => {
    return extractParams(route)
      .id()
      .getResult()
  }
}

/**
 * Route parameter middleware
 */
export function createParamMiddleware(pattern) {
  return (to, from, next) => {
    try {
      const result = pattern(to)
      
      if (!result.isValid) {
        console.error('Parameter validation failed:', result.errors)
        next({ name: 'not-found' })
        return
      }
      
      // Attach validated parameters to route
      to.validatedParams = result.params
      to.validatedQuery = result.query
      
      next()
    } catch (error) {
      console.error('Parameter extraction failed:', error)
      next({ name: 'not-found' })
    }
  }
}

/**
 * Export utilities
 */
export default {
  extractParams,
  paramPatterns,
  paramValidators,
  paramConverters,
  createParamMiddleware,
  RouteParamExtractor
}
