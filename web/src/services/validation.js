/**
 * Frontend Validation and Sanitization Service
 * Provides client-side input validation and sanitization
 */

export default class ValidationService {
    constructor() {
        this.rules = this.setupDefaultRules();
        this.errors = new Map();
    }

    /**
     * Validate data against rules
     */
    validate(data, rules, messages = {}) {
        this.errors.clear();

        for (const [field, fieldRules] of Object.entries(rules)) {
            const value = this.getValue(data, field);
            this.validateField(field, value, fieldRules, data, messages);
        }

        return this.errors.size === 0;
    }

    /**
     * Get validation errors
     */
    getErrors() {
        const errorObj = {};
        for (const [field, errors] of this.errors) {
            errorObj[field] = errors;
        }
        return errorObj;
    }

    /**
     * Get first error for a field
     */
    getFirstError(field = null) {
        if (field) {
            const fieldErrors = this.errors.get(field);
            return fieldErrors ? fieldErrors[0] : null;
        }

        for (const errors of this.errors.values()) {
            return errors[0];
        }

        return null;
    }

    /**
     * Validate a single field
     */
    validateField(field, value, rules, allData = {}, messages = {}) {
        const ruleList = Array.isArray(rules) ? rules : rules.split('|');

        for (const rule of ruleList) {
            const result = this.applyRule(field, value, rule, allData, messages);
            if (result !== true) {
                this.addError(field, result);
            }
        }
    }

    /**
     * Apply a validation rule
     */
    applyRule(field, value, rule, allData, messages) {
        let ruleName, parameters = [];

        if (typeof rule === 'string') {
            const parts = rule.split(':');
            ruleName = parts[0];
            parameters = parts[1] ? parts[1].split(',') : [];
        } else {
            ruleName = rule;
        }

        if (!this.rules[ruleName]) {
            throw new Error(`Validation rule '${ruleName}' not found`);
        }

        const result = this.rules[ruleName](value, parameters, field, allData);

        if (result !== true) {
            const customMessage = messages[`${field}.${ruleName}`] || messages[ruleName];
            return customMessage || this.getDefaultMessage(ruleName, field, parameters);
        }

        return true;
    }

    /**
     * Add validation error
     */
    addError(field, message) {
        if (!this.errors.has(field)) {
            this.errors.set(field, []);
        }
        this.errors.get(field).push(message);
    }

    /**
     * Get value from data using dot notation
     */
    getValue(data, key) {
        if (key.indexOf('.') === -1) {
            return data[key];
        }

        const keys = key.split('.');
        let value = data;

        for (const k of keys) {
            if (typeof value !== 'object' || value === null || !(k in value)) {
                return undefined;
            }
            value = value[k];
        }

        return value;
    }

    /**
     * Setup default validation rules
     */
    setupDefaultRules() {
        return {
            required: (value) => {
                if (value === null || value === undefined) return false;
                if (typeof value === 'string') return value.trim().length > 0;
                if (Array.isArray(value)) return value.length > 0;
                return true;
            },

            email: (value) => {
                if (!value) return true;
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(value);
            },

            min: (value, params) => {
                if (!value) return true;
                const min = parseInt(params[0]);
                return typeof value === 'string' ? value.length >= min : value >= min;
            },

            max: (value, params) => {
                if (!value) return true;
                const max = parseInt(params[0]);
                return typeof value === 'string' ? value.length <= max : value <= max;
            },

            numeric: (value) => {
                if (!value) return true;
                return !isNaN(value) && !isNaN(parseFloat(value));
            },

            integer: (value) => {
                if (!value) return true;
                return Number.isInteger(Number(value));
            },

            alpha: (value) => {
                if (!value) return true;
                return /^[a-zA-Z]+$/.test(value);
            },

            alpha_num: (value) => {
                if (!value) return true;
                return /^[a-zA-Z0-9]+$/.test(value);
            },

            url: (value) => {
                if (!value) return true;
                try {
                    new URL(value);
                    return true;
                } catch {
                    return false;
                }
            },

            confirmed: (value, params, field, allData) => {
                if (!value) return true;
                const confirmField = field + '_confirmation';
                return allData[confirmField] === value;
            },

            in: (value, params) => {
                if (!value) return true;
                return params.includes(value);
            },

            not_in: (value, params) => {
                if (!value) return true;
                return !params.includes(value);
            },

            regex: (value, params) => {
                if (!value) return true;
                const pattern = new RegExp(params[0]);
                return pattern.test(value);
            },

            date: (value) => {
                if (!value) return true;
                const date = new Date(value);
                return !isNaN(date.getTime());
            },

            before: (value, params) => {
                if (!value) return true;
                const date = new Date(value);
                const beforeDate = new Date(params[0]);
                return date < beforeDate;
            },

            after: (value, params) => {
                if (!value) return true;
                const date = new Date(value);
                const afterDate = new Date(params[0]);
                return date > afterDate;
            },

            file: (value) => {
                return value instanceof File;
            },

            image: (value) => {
                if (!(value instanceof File)) return false;
                return value.type.startsWith('image/');
            },

            mimes: (value, params) => {
                if (!(value instanceof File)) return false;
                const allowedTypes = params.map(ext => {
                    const mimeTypes = {
                        jpg: 'image/jpeg',
                        jpeg: 'image/jpeg',
                        png: 'image/png',
                        gif: 'image/gif',
                        pdf: 'application/pdf',
                        doc: 'application/msword',
                        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    };
                    return mimeTypes[ext];
                }).filter(Boolean);

                return allowedTypes.includes(value.type);
            },

            max_file_size: (value, params) => {
                if (!(value instanceof File)) return false;
                const maxSize = parseInt(params[0]) * 1024; // Convert KB to bytes
                return value.size <= maxSize;
            },

            strong_password: (value) => {
                if (!value) return true;
                // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
                return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(value);
            },

            phone: (value) => {
                if (!value) return true;
                // Basic phone number validation
                return /^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/[\s\-\(\)]/g, ''));
            }
        };
    }

    /**
     * Get default error message
     */
    getDefaultMessage(rule, field, parameters) {
        const messages = {
            required: `The ${field} field is required`,
            email: `The ${field} must be a valid email address`,
            min: `The ${field} must be at least ${parameters[0]} characters`,
            max: `The ${field} may not be greater than ${parameters[0]} characters`,
            numeric: `The ${field} must be a number`,
            integer: `The ${field} must be an integer`,
            alpha: `The ${field} may only contain letters`,
            alpha_num: `The ${field} may only contain letters and numbers`,
            url: `The ${field} must be a valid URL`,
            confirmed: `The ${field} confirmation does not match`,
            in: `The selected ${field} is invalid`,
            not_in: `The selected ${field} is invalid`,
            regex: `The ${field} format is invalid`,
            date: `The ${field} is not a valid date`,
            before: `The ${field} must be a date before ${parameters[0]}`,
            after: `The ${field} must be a date after ${parameters[0]}`,
            file: `The ${field} must be a file`,
            image: `The ${field} must be an image`,
            mimes: `The ${field} must be a file of type: ${parameters.join(', ')}`,
            max_file_size: `The ${field} may not be greater than ${parameters[0]} kilobytes`,
            strong_password: `The ${field} must contain at least 8 characters with uppercase, lowercase, number and special character`,
            phone: `The ${field} must be a valid phone number`
        };

        return messages[rule] || `The ${field} is invalid`;
    }

    /**
     * Add custom validation rule
     */
    addRule(name, callback) {
        this.rules[name] = callback;
    }

    /**
     * Sanitize input data
     */
    sanitize(data, rules = {}) {
        if (typeof data !== 'object' || data === null) {
            return this.sanitizeValue(data, rules);
        }

        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            const fieldRules = rules[key] || ['string'];
            sanitized[key] = this.sanitizeValue(value, fieldRules);
        }

        return sanitized;
    }

    /**
     * Sanitize a single value
     */
    sanitizeValue(value, rules) {
        if (!Array.isArray(rules)) {
            rules = [rules];
        }

        let sanitized = value;
        for (const rule of rules) {
            sanitized = this.applySanitizationRule(sanitized, rule);
        }

        return sanitized;
    }

    /**
     * Apply sanitization rule
     */
    applySanitizationRule(value, rule) {
        switch (rule) {
            case 'string':
                return this.sanitizeString(value);
            case 'email':
                return this.sanitizeEmail(value);
            case 'url':
                return this.sanitizeUrl(value);
            case 'html':
                return this.sanitizeHtml(value);
            case 'integer':
                return parseInt(value) || 0;
            case 'float':
                return parseFloat(value) || 0;
            case 'boolean':
                return Boolean(value);
            case 'alpha':
                return String(value).replace(/[^a-zA-Z]/g, '');
            case 'alpha_numeric':
                return String(value).replace(/[^a-zA-Z0-9]/g, '');
            case 'slug':
                return this.sanitizeSlug(value);
            case 'trim':
                return String(value).trim();
            case 'lowercase':
                return String(value).toLowerCase();
            case 'uppercase':
                return String(value).toUpperCase();
            default:
                return value;
        }
    }

    /**
     * Sanitize string (XSS protection)
     */
    sanitizeString(value) {
        if (typeof value !== 'string') {
            return String(value);
        }

        return value
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    /**
     * Sanitize email
     */
    sanitizeEmail(value) {
        return String(value).toLowerCase().trim();
    }

    /**
     * Sanitize URL
     */
    sanitizeUrl(value) {
        const url = String(value).trim();
        if (url && !url.match(/^https?:\/\//)) {
            return 'http://' + url;
        }
        return url;
    }

    /**
     * Sanitize HTML (basic)
     */
    sanitizeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value;
        return div.innerHTML;
    }

    /**
     * Sanitize slug
     */
    sanitizeSlug(value) {
        return String(value)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    /**
     * Real-time validation for forms
     */
    setupRealTimeValidation(form, rules, options = {}) {
        const {
            validateOnBlur = true,
            validateOnInput = false,
            showErrors = true,
            errorClass = 'is-invalid',
            errorContainer = '.invalid-feedback'
        } = options;

        const validateField = (field) => {
            const fieldName = field.name;
            const fieldRules = rules[fieldName];
            
            if (!fieldRules) return;

            const formData = new FormData(form);
            const data = Object.fromEntries(formData);
            
            this.errors.delete(fieldName);
            this.validateField(fieldName, data[fieldName], fieldRules, data);

            if (showErrors) {
                this.displayFieldErrors(field, fieldName, errorClass, errorContainer);
            }
        };

        // Add event listeners
        for (const field of form.elements) {
            if (field.name && rules[field.name]) {
                if (validateOnBlur) {
                    field.addEventListener('blur', () => validateField(field));
                }
                
                if (validateOnInput) {
                    field.addEventListener('input', () => validateField(field));
                }
            }
        }

        // Form submit validation
        form.addEventListener('submit', (e) => {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);
            
            if (!this.validate(data, rules)) {
                e.preventDefault();
                
                if (showErrors) {
                    this.displayAllErrors(form, errorClass, errorContainer);
                }
            }
        });
    }

    /**
     * Display field errors
     */
    displayFieldErrors(field, fieldName, errorClass, errorContainer) {
        const errors = this.errors.get(fieldName);
        
        // Remove existing error classes and messages
        field.classList.remove(errorClass);
        const existingError = field.parentNode.querySelector(errorContainer);
        if (existingError) {
            existingError.remove();
        }

        if (errors && errors.length > 0) {
            field.classList.add(errorClass);
            
            const errorDiv = document.createElement('div');
            errorDiv.className = errorContainer.replace('.', '');
            errorDiv.textContent = errors[0];
            
            field.parentNode.appendChild(errorDiv);
        }
    }

    /**
     * Display all form errors
     */
    displayAllErrors(form, errorClass, errorContainer) {
        for (const [fieldName, errors] of this.errors) {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (field) {
                this.displayFieldErrors(field, fieldName, errorClass, errorContainer);
            }
        }
    }
}

// Create singleton instance
const validationService = new ValidationService();
export { validationService };
