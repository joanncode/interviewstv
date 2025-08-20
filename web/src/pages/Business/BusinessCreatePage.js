import API from '../../services/api.js';
import Auth from '../../services/auth.js';
import Router from '../../utils/router.js';

export default class BusinessCreatePage {
    constructor() {
        this.currentUser = Auth.getCurrentUser();
        this.isSubmitting = false;
        this.logoFile = null;
        this.businessHours = {
            monday: { open: '09:00', close: '17:00', closed: false },
            tuesday: { open: '09:00', close: '17:00', closed: false },
            wednesday: { open: '09:00', close: '17:00', closed: false },
            thursday: { open: '09:00', close: '17:00', closed: false },
            friday: { open: '09:00', close: '17:00', closed: false },
            saturday: { open: '10:00', close: '16:00', closed: false },
            sunday: { open: '', close: '', closed: true }
        };
    }

    async render(container) {
        if (!this.currentUser) {
            Router.navigate('/login');
            return;
        }

        container.innerHTML = this.getHTML();
        this.setupEventListeners(container);
        this.renderBusinessHours();
    }

    getHTML() {
        return `
            <div class="business-create-page">
                <div class="container py-4">
                    <div class="row justify-content-center">
                        <div class="col-lg-8">
                            <!-- Header -->
                            <div class="text-center mb-5">
                                <h1 class="display-5 fw-bold mb-3">Add Your Business</h1>
                                <p class="lead text-muted">
                                    Join our business directory and connect with potential customers through interviews
                                </p>
                            </div>

                            <!-- Business Registration Form -->
                            <div class="card">
                                <div class="card-header">
                                    <h5 class="mb-0">
                                        <i class="fas fa-building me-2"></i>Business Information
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <form id="business-create-form">
                                        <!-- Basic Information -->
                                        <div class="row mb-4">
                                            <div class="col-12">
                                                <h6 class="text-primary mb-3">Basic Information</h6>
                                            </div>
                                            
                                            <div class="col-md-6 mb-3">
                                                <label for="business-name" class="form-label">
                                                    Business Name <span class="text-danger">*</span>
                                                </label>
                                                <input type="text" 
                                                       class="form-control" 
                                                       id="business-name" 
                                                       name="name"
                                                       required
                                                       placeholder="Enter your business name">
                                                <div class="invalid-feedback"></div>
                                            </div>
                                            
                                            <div class="col-md-6 mb-3">
                                                <label for="business-industry" class="form-label">
                                                    Industry <span class="text-danger">*</span>
                                                </label>
                                                <select class="form-select" id="business-industry" name="industry" required>
                                                    <option value="">Select an industry</option>
                                                    <option value="retail">Retail</option>
                                                    <option value="hospitality">Hospitality</option>
                                                    <option value="tech">Technology</option>
                                                    <option value="healthcare">Healthcare</option>
                                                    <option value="education">Education</option>
                                                    <option value="entertainment">Entertainment</option>
                                                    <option value="other">Other</option>
                                                </select>
                                                <div class="invalid-feedback"></div>
                                            </div>
                                            
                                            <div class="col-12 mb-3">
                                                <label for="business-description" class="form-label">Description</label>
                                                <textarea class="form-control" 
                                                          id="business-description" 
                                                          name="description"
                                                          rows="4"
                                                          placeholder="Describe your business, what you do, and what makes you unique..."></textarea>
                                                <div class="form-text">Help customers understand what your business is about</div>
                                            </div>
                                        </div>

                                        <!-- Contact Information -->
                                        <div class="row mb-4">
                                            <div class="col-12">
                                                <h6 class="text-primary mb-3">Contact Information</h6>
                                            </div>
                                            
                                            <div class="col-md-6 mb-3">
                                                <label for="business-location" class="form-label">Location</label>
                                                <input type="text" 
                                                       class="form-control" 
                                                       id="business-location" 
                                                       name="location"
                                                       placeholder="City, State or Full Address">
                                                <div class="form-text">Where is your business located?</div>
                                            </div>
                                            
                                            <div class="col-md-6 mb-3">
                                                <label for="business-phone" class="form-label">Phone Number</label>
                                                <input type="tel" 
                                                       class="form-control" 
                                                       id="business-phone" 
                                                       name="phone"
                                                       placeholder="(555) 123-4567">
                                            </div>
                                            
                                            <div class="col-md-6 mb-3">
                                                <label for="business-email" class="form-label">Business Email</label>
                                                <input type="email" 
                                                       class="form-control" 
                                                       id="business-email" 
                                                       name="email"
                                                       placeholder="contact@yourbusiness.com">
                                            </div>
                                            
                                            <div class="col-md-6 mb-3">
                                                <label for="business-website" class="form-label">Website</label>
                                                <input type="url" 
                                                       class="form-control" 
                                                       id="business-website" 
                                                       name="website_url"
                                                       placeholder="https://www.yourbusiness.com">
                                            </div>
                                        </div>

                                        <!-- Business Logo -->
                                        <div class="row mb-4">
                                            <div class="col-12">
                                                <h6 class="text-primary mb-3">Business Logo</h6>
                                            </div>
                                            
                                            <div class="col-12 mb-3">
                                                <label for="business-logo" class="form-label">Upload Logo</label>
                                                <div class="logo-upload-area border rounded p-4 text-center" id="logo-upload-area">
                                                    <div class="logo-preview" id="logo-preview" style="display: none;">
                                                        <img id="logo-preview-img" class="rounded mb-3" style="max-width: 150px; max-height: 150px;">
                                                        <div>
                                                            <button type="button" class="btn btn-sm btn-outline-danger" id="remove-logo-btn">
                                                                <i class="fas fa-trash me-1"></i>Remove
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div class="logo-upload-prompt" id="logo-upload-prompt">
                                                        <i class="fas fa-cloud-upload-alt fa-3x text-muted mb-3"></i>
                                                        <p class="mb-2">Click to upload your business logo</p>
                                                        <p class="text-muted small">PNG, JPG up to 5MB. Recommended: 300x300px</p>
                                                    </div>
                                                    <input type="file" 
                                                           id="business-logo" 
                                                           name="logo"
                                                           accept="image/*"
                                                           style="display: none;">
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Business Hours -->
                                        <div class="row mb-4">
                                            <div class="col-12">
                                                <h6 class="text-primary mb-3">Business Hours</h6>
                                            </div>
                                            
                                            <div class="col-12">
                                                <div class="business-hours-container" id="business-hours-container">
                                                    <!-- Business hours will be rendered here -->
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Terms and Submit -->
                                        <div class="row">
                                            <div class="col-12 mb-3">
                                                <div class="form-check">
                                                    <input class="form-check-input" 
                                                           type="checkbox" 
                                                           id="terms-agreement" 
                                                           required>
                                                    <label class="form-check-label" for="terms-agreement">
                                                        I agree to the <a href="/terms" target="_blank">Terms of Service</a> 
                                                        and confirm that I have the authority to list this business
                                                    </label>
                                                </div>
                                            </div>
                                            
                                            <div class="col-12">
                                                <div class="d-flex justify-content-between">
                                                    <a href="/business" class="btn btn-outline-secondary">
                                                        <i class="fas fa-arrow-left me-2"></i>Cancel
                                                    </a>
                                                    <button type="submit" 
                                                            class="btn btn-primary" 
                                                            id="submit-btn">
                                                        <span class="submit-text">
                                                            <i class="fas fa-plus me-2"></i>Create Business
                                                        </span>
                                                        <span class="submit-loading" style="display: none;">
                                                            <i class="fas fa-spinner fa-spin me-2"></i>Creating...
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </div>

                            <!-- Help Section -->
                            <div class="card mt-4">
                                <div class="card-header">
                                    <h6 class="mb-0">
                                        <i class="fas fa-question-circle me-2"></i>Need Help?
                                    </h6>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <h6>Why list your business?</h6>
                                            <ul class="small text-muted">
                                                <li>Connect with potential customers</li>
                                                <li>Share your story through interviews</li>
                                                <li>Build trust and credibility</li>
                                                <li>Increase online visibility</li>
                                            </ul>
                                        </div>
                                        <div class="col-md-6">
                                            <h6>What happens next?</h6>
                                            <ul class="small text-muted">
                                                <li>Your business will be listed immediately</li>
                                                <li>You can manage your profile anytime</li>
                                                <li>Link interviews to showcase your business</li>
                                                <li>Respond to customer comments</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderBusinessHours() {
        const container = document.getElementById('business-hours-container');
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        container.innerHTML = days.map((day, index) => {
            const hours = this.businessHours[day];
            return `
                <div class="row align-items-center mb-2">
                    <div class="col-md-2">
                        <label class="form-label small mb-0">${dayLabels[index]}</label>
                    </div>
                    <div class="col-md-3">
                        <input type="time" 
                               class="form-control form-control-sm" 
                               data-day="${day}" 
                               data-field="open"
                               value="${hours.open}"
                               ${hours.closed ? 'disabled' : ''}>
                    </div>
                    <div class="col-md-1 text-center">
                        <span class="small text-muted">to</span>
                    </div>
                    <div class="col-md-3">
                        <input type="time" 
                               class="form-control form-control-sm" 
                               data-day="${day}" 
                               data-field="close"
                               value="${hours.close}"
                               ${hours.closed ? 'disabled' : ''}>
                    </div>
                    <div class="col-md-3">
                        <div class="form-check">
                            <input class="form-check-input" 
                                   type="checkbox" 
                                   data-day="${day}" 
                                   data-field="closed"
                                   ${hours.closed ? 'checked' : ''}>
                            <label class="form-check-label small">Closed</label>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    setupEventListeners(container) {
        const form = container.querySelector('#business-create-form');
        
        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit(form);
        });

        // Logo upload
        const logoUploadArea = container.querySelector('#logo-upload-area');
        const logoInput = container.querySelector('#business-logo');
        const logoPreview = container.querySelector('#logo-preview');
        const logoPreviewImg = container.querySelector('#logo-preview-img');
        const logoUploadPrompt = container.querySelector('#logo-upload-prompt');
        const removeLogo = container.querySelector('#remove-logo-btn');

        logoUploadArea.addEventListener('click', () => {
            logoInput.click();
        });

        logoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleLogoUpload(file, logoPreview, logoPreviewImg, logoUploadPrompt);
            }
        });

        removeLogo.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeLogo(logoInput, logoPreview, logoUploadPrompt);
        });

        // Business hours
        container.addEventListener('change', (e) => {
            if (e.target.dataset.day) {
                this.updateBusinessHours(e.target);
            }
        });

        // Real-time validation
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });
        });
    }

    async handleLogoUpload(file, preview, previewImg, prompt) {
        // Validate file
        if (!file.type.startsWith('image/')) {
            this.showError('Please select a valid image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            this.showError('Image file must be less than 5MB');
            return;
        }

        try {
            // Show preview
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                preview.style.display = 'block';
                prompt.style.display = 'none';
            };
            reader.readAsDataURL(file);

            this.logoFile = file;

        } catch (error) {
            console.error('Logo upload error:', error);
            this.showError('Failed to process logo image');
        }
    }

    removeLogo(input, preview, prompt) {
        input.value = '';
        preview.style.display = 'none';
        prompt.style.display = 'block';
        this.logoFile = null;
    }

    updateBusinessHours(target) {
        const day = target.dataset.day;
        const field = target.dataset.field;
        
        if (field === 'closed') {
            this.businessHours[day].closed = target.checked;
            
            // Enable/disable time inputs
            const dayInputs = document.querySelectorAll(`[data-day="${day}"][data-field="open"], [data-day="${day}"][data-field="close"]`);
            dayInputs.forEach(input => {
                input.disabled = target.checked;
                if (target.checked) {
                    input.value = '';
                    this.businessHours[day][input.dataset.field] = '';
                }
            });
        } else {
            this.businessHours[day][field] = target.value;
        }
    }

    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let message = '';

        // Reset previous validation
        field.classList.remove('is-invalid', 'is-valid');
        const feedback = field.parentNode.querySelector('.invalid-feedback');

        switch (field.name) {
            case 'name':
                if (!value) {
                    isValid = false;
                    message = 'Business name is required';
                } else if (value.length < 2) {
                    isValid = false;
                    message = 'Business name must be at least 2 characters';
                }
                break;

            case 'industry':
                if (!value) {
                    isValid = false;
                    message = 'Please select an industry';
                }
                break;

            case 'email':
                if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    isValid = false;
                    message = 'Please enter a valid email address';
                }
                break;

            case 'website_url':
                if (value && !/^https?:\/\/.+\..+/.test(value)) {
                    isValid = false;
                    message = 'Please enter a valid website URL (include http:// or https://)';
                }
                break;

            case 'phone':
                if (value && !/^[\d\s\-\(\)\+]+$/.test(value)) {
                    isValid = false;
                    message = 'Please enter a valid phone number';
                }
                break;
        }

        if (isValid) {
            field.classList.add('is-valid');
        } else {
            field.classList.add('is-invalid');
            if (feedback) {
                feedback.textContent = message;
            }
        }

        return isValid;
    }

    async handleSubmit(form) {
        if (this.isSubmitting) return;

        try {
            this.isSubmitting = true;
            this.setSubmitLoading(true);

            // Validate all fields
            const inputs = form.querySelectorAll('input[required], select[required]');
            let isValid = true;

            inputs.forEach(input => {
                if (!this.validateField(input)) {
                    isValid = false;
                }
            });

            if (!isValid) {
                this.showError('Please fix the errors above');
                return;
            }

            // Prepare form data
            const formData = new FormData(form);
            
            // Add business hours
            formData.append('hours', JSON.stringify(this.businessHours));

            // Upload logo if provided
            let logoUrl = null;
            if (this.logoFile) {
                logoUrl = await this.uploadLogo(this.logoFile);
                if (logoUrl) {
                    formData.append('logo_url', logoUrl);
                }
            }

            // Create business
            const businessData = Object.fromEntries(formData.entries());
            const response = await API.post('/api/businesses', businessData);

            if (response.success) {
                this.showSuccess('Business created successfully!');
                
                // Redirect to business profile
                setTimeout(() => {
                    Router.navigate(`/business/${response.data.id}`);
                }, 1500);
            } else {
                this.showError(response.message || 'Failed to create business');
            }

        } catch (error) {
            console.error('Business creation error:', error);
            this.showError('Failed to create business. Please try again.');
        } finally {
            this.isSubmitting = false;
            this.setSubmitLoading(false);
        }
    }

    async uploadLogo(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', 'business_logo');

            const response = await API.post('/api/upload/media', formData);
            
            if (response.success) {
                return response.data.url;
            }
            
            return null;
        } catch (error) {
            console.error('Logo upload error:', error);
            return null;
        }
    }

    setSubmitLoading(loading) {
        const submitBtn = document.getElementById('submit-btn');
        const submitText = submitBtn.querySelector('.submit-text');
        const submitLoading = submitBtn.querySelector('.submit-loading');

        if (loading) {
            submitBtn.disabled = true;
            submitText.style.display = 'none';
            submitLoading.style.display = 'inline';
        } else {
            submitBtn.disabled = false;
            submitText.style.display = 'inline';
            submitLoading.style.display = 'none';
        }
    }

    showSuccess(message) {
        this.showToast('success', message);
    }

    showError(message) {
        this.showToast('error', message);
    }

    showToast(type, message) {
        // Create temporary toast notification
        const toast = document.createElement('div');
        toast.className = `business-toast toast-${type}`;
        toast.textContent = message;
        toast.style.position = 'fixed';
        toast.style.top = '20px';
        toast.style.right = '20px';
        toast.style.background = type === 'error' ? '#dc3545' : '#28a745';
        toast.style.color = 'white';
        toast.style.padding = '12px 16px';
        toast.style.borderRadius = '6px';
        toast.style.fontSize = '14px';
        toast.style.zIndex = '10000';
        toast.style.maxWidth = '300px';
        toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';

        document.body.appendChild(toast);

        // Remove after 4 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 4000);
    }

    destroy() {
        // Clean up any resources
    }
}
