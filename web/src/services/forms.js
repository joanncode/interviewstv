/**
 * Seamless Form Handling Service
 * Provides AJAX form submissions, inline editing, auto-save, and validation
 */

import API from './api.js';
import { realtimeService } from './realtime.js';

export default class FormsService {
    constructor() {
        this.forms = new Map();
        this.autoSaveTimers = new Map();
        this.validationRules = new Map();
        this.submitHandlers = new Map();
    }

    /**
     * Initialize AJAX form handling
     */
    initAjaxForm(formElement, options = {}) {
        const config = {
            // Submission
            endpoint: null,
            method: 'POST',
            
            // Validation
            validateOnBlur: true,
            validateOnInput: false,
            showValidationErrors: true,
            
            // Auto-save
            autoSave: false,
            autoSaveDelay: 2000,
            autoSaveEndpoint: null,
            
            // UI feedback
            showLoadingState: true,
            disableOnSubmit: true,
            resetOnSuccess: false,
            
            // Callbacks
            onSubmit: null,
            onSuccess: null,
            onError: null,
            onValidation: null,
            onAutoSave: null,
            
            // File uploads
            handleFileUploads: false,
            uploadEndpoint: '/api/upload',
            maxFileSize: 5 * 1024 * 1024, // 5MB
            allowedFileTypes: ['image/*', 'video/*', 'audio/*'],
            
            ...options
        };

        const formId = this.generateFormId(formElement);
        this.forms.set(formId, { element: formElement, config });

        this.setupFormEventListeners(formElement, config);
        
        if (config.autoSave) {
            this.initAutoSave(formElement, config);
        }

        return {
            formId,
            submit: () => this.submitForm(formElement, config),
            validate: () => this.validateForm(formElement, config),
            reset: () => this.resetForm(formElement),
            destroy: () => this.destroyForm(formId)
        };
    }

    /**
     * Inline editing functionality
     */
    initInlineEdit(element, options = {}) {
        const config = {
            // Data
            entityType: null,
            entityId: null,
            field: null,
            
            // UI
            inputType: 'text',
            placeholder: 'Click to edit...',
            saveOnEnter: true,
            cancelOnEscape: true,
            
            // Validation
            required: false,
            minLength: null,
            maxLength: null,
            pattern: null,
            
            // API
            endpoint: null,
            
            // Callbacks
            onEdit: null,
            onSave: null,
            onCancel: null,
            onError: null,
            
            ...options
        };

        element.classList.add('inline-editable');
        element.setAttribute('title', 'Click to edit');
        
        const originalValue = element.textContent.trim();
        
        element.addEventListener('click', () => {
            this.startInlineEdit(element, originalValue, config);
        });

        return {
            getValue: () => element.textContent.trim(),
            setValue: (value) => this.setInlineValue(element, value),
            startEdit: () => this.startInlineEdit(element, originalValue, config),
            destroy: () => this.destroyInlineEdit(element)
        };
    }

    /**
     * Auto-save functionality
     */
    initAutoSave(formElement, config) {
        const formId = this.generateFormId(formElement);
        
        const inputs = formElement.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.scheduleAutoSave(formId, formElement, config);
            });
            
            input.addEventListener('change', () => {
                this.scheduleAutoSave(formId, formElement, config);
            });
        });
    }

    /**
     * Form validation
     */
    addValidationRule(formElement, fieldName, rule) {
        const formId = this.generateFormId(formElement);
        
        if (!this.validationRules.has(formId)) {
            this.validationRules.set(formId, new Map());
        }
        
        const formRules = this.validationRules.get(formId);
        
        if (!formRules.has(fieldName)) {
            formRules.set(fieldName, []);
        }
        
        formRules.get(fieldName).push(rule);
    }

    /**
     * File upload handling
     */
    async handleFileUpload(fileInput, config) {
        const files = Array.from(fileInput.files);
        const uploadPromises = files.map(file => this.uploadFile(file, config));
        
        try {
            const results = await Promise.all(uploadPromises);
            return results.filter(result => result.success);
        } catch (error) {
            console.error('File upload error:', error);
            throw error;
        }
    }

    async uploadFile(file, config) {
        // Validate file
        if (file.size > config.maxFileSize) {
            throw new Error(`File size exceeds ${config.maxFileSize / (1024 * 1024)}MB limit`);
        }

        const isAllowedType = config.allowedFileTypes.some(type => {
            if (type.endsWith('/*')) {
                return file.type.startsWith(type.slice(0, -1));
            }
            return file.type === type;
        });

        if (!isAllowedType) {
            throw new Error('File type not allowed');
        }

        // Create form data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', this.getFileCategory(file.type));

        // Upload with progress tracking
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const progress = (e.loaded / e.total) * 100;
                    this.updateUploadProgress(file.name, progress);
                }
            });
            
            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (error) {
                        reject(new Error('Invalid response format'));
                    }
                } else {
                    reject(new Error(`Upload failed: ${xhr.status}`));
                }
            });
            
            xhr.addEventListener('error', () => {
                reject(new Error('Upload failed'));
            });
            
            xhr.open('POST', config.uploadEndpoint);
            xhr.send(formData);
        });
    }

    /**
     * Form submission handling
     */
    async submitForm(formElement, config) {
        try {
            // Validate form
            const isValid = await this.validateForm(formElement, config);
            if (!isValid) {
                throw new Error('Form validation failed');
            }

            // Show loading state
            if (config.showLoadingState) {
                this.setFormLoadingState(formElement, true);
            }

            // Prepare form data
            const formData = this.prepareFormData(formElement, config);

            // Handle file uploads
            if (config.handleFileUploads) {
                const fileInputs = formElement.querySelectorAll('input[type="file"]');
                for (const input of fileInputs) {
                    if (input.files.length > 0) {
                        const uploadResults = await this.handleFileUpload(input, config);
                        uploadResults.forEach((result, index) => {
                            formData.append(`${input.name}_urls[]`, result.data.url);
                        });
                    }
                }
            }

            // Submit form
            const response = await this.makeRequest(config.endpoint, config.method, formData);

            if (response.success) {
                if (config.onSuccess) {
                    config.onSuccess(response.data, formElement);
                }
                
                if (config.resetOnSuccess) {
                    this.resetForm(formElement);
                }
                
                this.showFormMessage(formElement, 'Form submitted successfully!', 'success');
                
                return response.data;
            } else {
                throw new Error(response.message || 'Form submission failed');
            }

        } catch (error) {
            if (config.onError) {
                config.onError(error, formElement);
            }
            
            this.showFormMessage(formElement, error.message, 'error');
            throw error;
            
        } finally {
            if (config.showLoadingState) {
                this.setFormLoadingState(formElement, false);
            }
        }
    }

    /**
     * Form validation
     */
    async validateForm(formElement, config) {
        const formId = this.generateFormId(formElement);
        const rules = this.validationRules.get(formId);
        
        let isValid = true;
        const errors = {};

        // Built-in HTML5 validation
        const inputs = formElement.querySelectorAll('input, textarea, select');
        
        for (const input of inputs) {
            const fieldErrors = [];
            
            // HTML5 validation
            if (!input.checkValidity()) {
                fieldErrors.push(input.validationMessage);
                isValid = false;
            }
            
            // Custom validation rules
            if (rules && rules.has(input.name)) {
                const fieldRules = rules.get(input.name);
                
                for (const rule of fieldRules) {
                    const result = await this.validateField(input.value, rule);
                    if (!result.valid) {
                        fieldErrors.push(result.message);
                        isValid = false;
                    }
                }
            }
            
            // Update UI
            if (config.showValidationErrors) {
                this.showFieldErrors(input, fieldErrors);
            }
            
            if (fieldErrors.length > 0) {
                errors[input.name] = fieldErrors;
            }
        }

        if (config.onValidation) {
            config.onValidation(isValid, errors, formElement);
        }

        return isValid;
    }

    async validateField(value, rule) {
        if (typeof rule === 'function') {
            return await rule(value);
        }
        
        if (typeof rule === 'object') {
            const { validator, message } = rule;
            const isValid = await validator(value);
            return {
                valid: isValid,
                message: message || 'Validation failed'
            };
        }
        
        return { valid: true };
    }

    /**
     * Inline editing implementation
     */
    startInlineEdit(element, originalValue, config) {
        if (element.classList.contains('editing')) return;
        
        element.classList.add('editing');
        
        const input = this.createInlineInput(originalValue, config);
        element.innerHTML = '';
        element.appendChild(input);
        
        input.focus();
        if (config.inputType === 'text') {
            input.select();
        }
        
        const save = async () => {
            const newValue = input.value.trim();
            
            if (newValue === originalValue) {
                cancel();
                return;
            }
            
            try {
                // Validate
                if (config.required && !newValue) {
                    throw new Error('This field is required');
                }
                
                if (config.minLength && newValue.length < config.minLength) {
                    throw new Error(`Minimum length is ${config.minLength} characters`);
                }
                
                if (config.maxLength && newValue.length > config.maxLength) {
                    throw new Error(`Maximum length is ${config.maxLength} characters`);
                }
                
                if (config.pattern && !new RegExp(config.pattern).test(newValue)) {
                    throw new Error('Invalid format');
                }
                
                // Save to server
                if (config.endpoint) {
                    const response = await API.put(config.endpoint, {
                        [config.field]: newValue
                    });
                    
                    if (!response.success) {
                        throw new Error(response.message || 'Save failed');
                    }
                }
                
                // Update UI
                element.textContent = newValue;
                element.classList.remove('editing');
                
                if (config.onSave) {
                    config.onSave(newValue, originalValue, element);
                }
                
            } catch (error) {
                this.showInlineError(element, error.message);
                
                if (config.onError) {
                    config.onError(error, element);
                }
            }
        };
        
        const cancel = () => {
            element.textContent = originalValue;
            element.classList.remove('editing');
            
            if (config.onCancel) {
                config.onCancel(element);
            }
        };
        
        // Event listeners
        input.addEventListener('blur', save);
        
        if (config.saveOnEnter) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    save();
                }
            });
        }
        
        if (config.cancelOnEscape) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    cancel();
                }
            });
        }
    }

    createInlineInput(value, config) {
        let input;
        
        if (config.inputType === 'textarea') {
            input = document.createElement('textarea');
            input.rows = 3;
        } else {
            input = document.createElement('input');
            input.type = config.inputType;
        }
        
        input.value = value;
        input.className = 'form-control form-control-sm';
        input.placeholder = config.placeholder;
        
        if (config.maxLength) {
            input.maxLength = config.maxLength;
        }
        
        return input;
    }

    /**
     * Auto-save implementation
     */
    scheduleAutoSave(formId, formElement, config) {
        // Clear existing timer
        if (this.autoSaveTimers.has(formId)) {
            clearTimeout(this.autoSaveTimers.get(formId));
        }
        
        // Schedule new auto-save
        const timer = setTimeout(() => {
            this.performAutoSave(formElement, config);
        }, config.autoSaveDelay);
        
        this.autoSaveTimers.set(formId, timer);
    }

    async performAutoSave(formElement, config) {
        try {
            const formData = this.prepareFormData(formElement, config);
            const endpoint = config.autoSaveEndpoint || config.endpoint;
            
            const response = await this.makeRequest(endpoint, 'PUT', formData);
            
            if (response.success) {
                this.showAutoSaveIndicator(formElement, 'saved');
                
                if (config.onAutoSave) {
                    config.onAutoSave(response.data, formElement);
                }
            } else {
                this.showAutoSaveIndicator(formElement, 'error');
            }
            
        } catch (error) {
            console.error('Auto-save error:', error);
            this.showAutoSaveIndicator(formElement, 'error');
        }
    }

    /**
     * Helper methods
     */
    setupFormEventListeners(formElement, config) {
        formElement.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitForm(formElement, config);
        });

        if (config.validateOnBlur || config.validateOnInput) {
            const inputs = formElement.querySelectorAll('input, textarea, select');
            
            inputs.forEach(input => {
                if (config.validateOnBlur) {
                    input.addEventListener('blur', () => {
                        this.validateField(input.value, input.name);
                    });
                }
                
                if (config.validateOnInput) {
                    input.addEventListener('input', () => {
                        this.validateField(input.value, input.name);
                    });
                }
            });
        }
    }

    prepareFormData(formElement, config) {
        const formData = new FormData(formElement);
        
        // Convert to object if not handling file uploads
        if (!config.handleFileUploads) {
            const data = {};
            for (const [key, value] of formData.entries()) {
                data[key] = value;
            }
            return data;
        }
        
        return formData;
    }

    async makeRequest(endpoint, method, data) {
        const options = {
            method,
            headers: {},
            body: null
        };

        if (data instanceof FormData) {
            options.body = data;
        } else {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        }

        const response = await fetch(endpoint, options);
        return await response.json();
    }

    setFormLoadingState(formElement, loading) {
        const submitBtn = formElement.querySelector('[type="submit"]');
        const inputs = formElement.querySelectorAll('input, textarea, select, button');
        
        if (loading) {
            formElement.classList.add('form-loading');
            inputs.forEach(input => input.disabled = true);
            
            if (submitBtn) {
                submitBtn.dataset.originalText = submitBtn.textContent;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Submitting...';
            }
        } else {
            formElement.classList.remove('form-loading');
            inputs.forEach(input => input.disabled = false);
            
            if (submitBtn && submitBtn.dataset.originalText) {
                submitBtn.textContent = submitBtn.dataset.originalText;
            }
        }
    }

    showFieldErrors(input, errors) {
        // Remove existing error display
        const existingError = input.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        
        input.classList.remove('is-invalid', 'is-valid');
        
        if (errors.length > 0) {
            input.classList.add('is-invalid');
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-error invalid-feedback';
            errorDiv.textContent = errors[0]; // Show first error
            
            input.parentNode.appendChild(errorDiv);
        } else {
            input.classList.add('is-valid');
        }
    }

    showFormMessage(formElement, message, type) {
        // Remove existing message
        const existingMessage = formElement.querySelector('.form-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `form-message alert alert-${type === 'error' ? 'danger' : 'success'} mt-3`;
        messageDiv.textContent = message;
        
        formElement.appendChild(messageDiv);
        
        // Auto-remove success messages
        if (type === 'success') {
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 5000);
        }
    }

    showAutoSaveIndicator(formElement, status) {
        let indicator = formElement.querySelector('.auto-save-indicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'auto-save-indicator';
            formElement.appendChild(indicator);
        }
        
        const messages = {
            'saving': '<i class="fas fa-spinner fa-spin me-1"></i>Saving...',
            'saved': '<i class="fas fa-check text-success me-1"></i>Saved',
            'error': '<i class="fas fa-exclamation-triangle text-danger me-1"></i>Save failed'
        };
        
        indicator.innerHTML = messages[status] || '';
        indicator.className = `auto-save-indicator text-muted small ${status}`;
        
        // Hide after delay
        setTimeout(() => {
            indicator.style.opacity = '0';
        }, 2000);
    }

    showInlineError(element, message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'inline-error text-danger small mt-1';
        errorDiv.textContent = message;
        
        element.parentNode.appendChild(errorDiv);
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 3000);
    }

    generateFormId(formElement) {
        return formElement.id || `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getFileCategory(mimeType) {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        return 'document';
    }

    updateUploadProgress(fileName, progress) {
        // This could be enhanced to show progress bars
        console.log(`Upload progress for ${fileName}: ${progress.toFixed(1)}%`);
    }

    resetForm(formElement) {
        formElement.reset();
        
        // Clear validation states
        const inputs = formElement.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.classList.remove('is-invalid', 'is-valid');
        });
        
        // Clear error messages
        const errors = formElement.querySelectorAll('.field-error, .form-message');
        errors.forEach(error => error.remove());
    }

    setInlineValue(element, value) {
        element.textContent = value;
    }

    destroyInlineEdit(element) {
        element.classList.remove('inline-editable', 'editing');
        element.removeAttribute('title');
    }

    destroyForm(formId) {
        // Clear auto-save timer
        if (this.autoSaveTimers.has(formId)) {
            clearTimeout(this.autoSaveTimers.get(formId));
            this.autoSaveTimers.delete(formId);
        }
        
        // Remove form data
        this.forms.delete(formId);
        this.validationRules.delete(formId);
        this.submitHandlers.delete(formId);
    }

    destroy() {
        // Clear all timers
        this.autoSaveTimers.forEach(timer => clearTimeout(timer));
        
        // Clear all data
        this.forms.clear();
        this.autoSaveTimers.clear();
        this.validationRules.clear();
        this.submitHandlers.clear();
    }
}

// Create singleton instance
const formsService = new FormsService();
export { formsService };
