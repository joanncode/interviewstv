import API from '../../services/api.js';
import Auth from '../../services/auth.js';
import Router from '../../utils/router.js';

export default class EventCreatePage {
    constructor() {
        this.currentUser = Auth.getCurrentUser();
        this.isSubmitting = false;
        this.coverImageFile = null;
        this.eventTags = [];
    }

    async render(container) {
        if (!this.currentUser) {
            Router.navigate('/login');
            return;
        }

        container.innerHTML = this.getHTML();
        this.setupEventListeners(container);
        this.initializeDateTimeInputs();
    }

    getHTML() {
        return `
            <div class="event-create-page">
                <div class="container py-4">
                    <div class="row justify-content-center">
                        <div class="col-lg-8">
                            <!-- Header -->
                            <div class="text-center mb-5">
                                <h1 class="display-5 fw-bold mb-3">Create New Event</h1>
                                <p class="lead text-muted">
                                    Organize and promote your event to the Interviews.tv community
                                </p>
                            </div>

                            <!-- Event Creation Form -->
                            <div class="card">
                                <div class="card-header">
                                    <h5 class="mb-0">
                                        <i class="fas fa-calendar-plus me-2"></i>Event Information
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <form id="event-create-form">
                                        <!-- Basic Information -->
                                        <div class="row mb-4">
                                            <div class="col-12">
                                                <h6 class="text-primary mb-3">Basic Information</h6>
                                            </div>
                                            
                                            <div class="col-12 mb-3">
                                                <label for="event-title" class="form-label">
                                                    Event Title <span class="text-danger">*</span>
                                                </label>
                                                <input type="text" 
                                                       class="form-control" 
                                                       id="event-title" 
                                                       name="title"
                                                       required
                                                       placeholder="Enter your event title">
                                                <div class="invalid-feedback"></div>
                                            </div>
                                            
                                            <div class="col-md-6 mb-3">
                                                <label for="event-type" class="form-label">
                                                    Event Type <span class="text-danger">*</span>
                                                </label>
                                                <select class="form-select" id="event-type" name="event_type" required>
                                                    <option value="">Select event type</option>
                                                    <option value="conference">Conference</option>
                                                    <option value="workshop">Workshop</option>
                                                    <option value="webinar">Webinar</option>
                                                    <option value="meetup">Meetup</option>
                                                    <option value="festival">Festival</option>
                                                    <option value="interview">Interview Session</option>
                                                    <option value="general">General Event</option>
                                                </select>
                                                <div class="invalid-feedback"></div>
                                            </div>
                                            
                                            <div class="col-md-6 mb-3">
                                                <label for="event-format" class="form-label">
                                                    Event Format <span class="text-danger">*</span>
                                                </label>
                                                <select class="form-select" id="event-format" name="is_virtual" required>
                                                    <option value="">Select format</option>
                                                    <option value="false">In-Person</option>
                                                    <option value="true">Virtual</option>
                                                </select>
                                                <div class="invalid-feedback"></div>
                                            </div>
                                            
                                            <div class="col-12 mb-3">
                                                <label for="event-description" class="form-label">Description</label>
                                                <textarea class="form-control" 
                                                          id="event-description" 
                                                          name="description"
                                                          rows="4"
                                                          placeholder="Describe your event, what attendees can expect, and any special features..."></textarea>
                                                <div class="form-text">Help people understand what your event is about</div>
                                            </div>
                                        </div>

                                        <!-- Date & Time -->
                                        <div class="row mb-4">
                                            <div class="col-12">
                                                <h6 class="text-primary mb-3">Date & Time</h6>
                                            </div>
                                            
                                            <div class="col-md-6 mb-3">
                                                <label for="start-date" class="form-label">
                                                    Start Date & Time <span class="text-danger">*</span>
                                                </label>
                                                <input type="datetime-local" 
                                                       class="form-control" 
                                                       id="start-date" 
                                                       name="start_date"
                                                       required>
                                                <div class="invalid-feedback"></div>
                                            </div>
                                            
                                            <div class="col-md-6 mb-3">
                                                <label for="end-date" class="form-label">End Date & Time</label>
                                                <input type="datetime-local" 
                                                       class="form-control" 
                                                       id="end-date" 
                                                       name="end_date">
                                                <div class="form-text">Optional - leave blank for single-time events</div>
                                            </div>
                                        </div>

                                        <!-- Location -->
                                        <div class="row mb-4">
                                            <div class="col-12">
                                                <h6 class="text-primary mb-3">Location</h6>
                                            </div>
                                            
                                            <div class="col-md-6 mb-3" id="location-field">
                                                <label for="event-location" class="form-label">
                                                    <span id="location-label">Event Location</span>
                                                </label>
                                                <input type="text" 
                                                       class="form-control" 
                                                       id="event-location" 
                                                       name="location"
                                                       placeholder="Enter venue address or virtual platform">
                                                <div class="form-text" id="location-help">
                                                    Specify where your event will take place
                                                </div>
                                            </div>
                                            
                                            <div class="col-md-6 mb-3">
                                                <label for="event-url" class="form-label">Event Website/Link</label>
                                                <input type="url" 
                                                       class="form-control" 
                                                       id="event-url" 
                                                       name="event_url"
                                                       placeholder="https://your-event-website.com">
                                                <div class="form-text">Link to registration page or event details</div>
                                            </div>
                                        </div>

                                        <!-- Registration & Pricing -->
                                        <div class="row mb-4">
                                            <div class="col-12">
                                                <h6 class="text-primary mb-3">Registration & Pricing</h6>
                                            </div>
                                            
                                            <div class="col-md-4 mb-3">
                                                <label for="max-attendees" class="form-label">Max Attendees</label>
                                                <input type="number" 
                                                       class="form-control" 
                                                       id="max-attendees" 
                                                       name="max_attendees"
                                                       min="1"
                                                       placeholder="Unlimited">
                                                <div class="form-text">Leave blank for unlimited</div>
                                            </div>
                                            
                                            <div class="col-md-4 mb-3">
                                                <label for="ticket-price" class="form-label">Ticket Price ($)</label>
                                                <input type="number" 
                                                       class="form-control" 
                                                       id="ticket-price" 
                                                       name="ticket_price"
                                                       min="0"
                                                       step="0.01"
                                                       placeholder="0.00">
                                                <div class="form-text">Leave blank or 0 for free events</div>
                                            </div>
                                            
                                            <div class="col-md-4 mb-3">
                                                <label for="registration-deadline" class="form-label">Registration Deadline</label>
                                                <input type="datetime-local" 
                                                       class="form-control" 
                                                       id="registration-deadline" 
                                                       name="registration_deadline">
                                                <div class="form-text">When registration closes</div>
                                            </div>
                                            
                                            <div class="col-12 mb-3">
                                                <div class="form-check">
                                                    <input class="form-check-input" 
                                                           type="checkbox" 
                                                           id="registration-required">
                                                    <label class="form-check-label" for="registration-required">
                                                        Require registration to attend
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Cover Image -->
                                        <div class="row mb-4">
                                            <div class="col-12">
                                                <h6 class="text-primary mb-3">Event Cover Image</h6>
                                            </div>
                                            
                                            <div class="col-12 mb-3">
                                                <label for="cover-image" class="form-label">Upload Cover Image</label>
                                                <div class="cover-upload-area border rounded p-4 text-center" id="cover-upload-area">
                                                    <div class="cover-preview" id="cover-preview" style="display: none;">
                                                        <img id="cover-preview-img" class="rounded mb-3" style="max-width: 100%; max-height: 200px;">
                                                        <div>
                                                            <button type="button" class="btn btn-sm btn-outline-danger" id="remove-cover-btn">
                                                                <i class="fas fa-trash me-1"></i>Remove
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div class="cover-upload-prompt" id="cover-upload-prompt">
                                                        <i class="fas fa-cloud-upload-alt fa-3x text-muted mb-3"></i>
                                                        <p class="mb-2">Click to upload event cover image</p>
                                                        <p class="text-muted small">PNG, JPG up to 5MB. Recommended: 1200x630px</p>
                                                    </div>
                                                    <input type="file" 
                                                           id="cover-image" 
                                                           name="cover_image"
                                                           accept="image/*"
                                                           style="display: none;">
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Tags -->
                                        <div class="row mb-4">
                                            <div class="col-12">
                                                <h6 class="text-primary mb-3">Tags</h6>
                                            </div>
                                            
                                            <div class="col-12 mb-3">
                                                <label for="event-tags" class="form-label">Event Tags</label>
                                                <input type="text" 
                                                       class="form-control" 
                                                       id="event-tags" 
                                                       placeholder="Type tags and press Enter (e.g., networking, tech, startup)">
                                                <div class="form-text">Add relevant tags to help people discover your event</div>
                                                <div class="tags-container mt-2" id="tags-container">
                                                    <!-- Tags will be displayed here -->
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Submit -->
                                        <div class="row">
                                            <div class="col-12">
                                                <div class="d-flex justify-content-between">
                                                    <a href="/events" class="btn btn-outline-secondary">
                                                        <i class="fas fa-arrow-left me-2"></i>Cancel
                                                    </a>
                                                    <button type="submit" 
                                                            class="btn btn-primary" 
                                                            id="submit-btn">
                                                        <span class="submit-text">
                                                            <i class="fas fa-plus me-2"></i>Create Event
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
                                        <i class="fas fa-question-circle me-2"></i>Event Creation Tips
                                    </h6>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <h6>Creating Great Events</h6>
                                            <ul class="small text-muted">
                                                <li>Use a clear, descriptive title</li>
                                                <li>Provide detailed event description</li>
                                                <li>Set accurate date and time</li>
                                                <li>Add relevant tags for discovery</li>
                                            </ul>
                                        </div>
                                        <div class="col-md-6">
                                            <h6>After Creating</h6>
                                            <ul class="small text-muted">
                                                <li>Share your event on social media</li>
                                                <li>Link interviews to your event</li>
                                                <li>Engage with attendees in comments</li>
                                                <li>Update event details as needed</li>
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

    initializeDateTimeInputs() {
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');
        const registrationDeadlineInput = document.getElementById('registration-deadline');
        
        // Set minimum date to current date/time
        const now = new Date();
        const minDateTime = now.toISOString().slice(0, 16);
        
        startDateInput.min = minDateTime;
        endDateInput.min = minDateTime;
        registrationDeadlineInput.min = minDateTime;
        
        // Update end date minimum when start date changes
        startDateInput.addEventListener('change', (e) => {
            endDateInput.min = e.target.value;
            registrationDeadlineInput.max = e.target.value;
        });
    }

    setupEventListeners(container) {
        const form = container.querySelector('#event-create-form');
        
        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit(form);
        });

        // Event format change
        const formatSelect = container.querySelector('#event-format');
        formatSelect.addEventListener('change', (e) => {
            this.updateLocationField(e.target.value === 'true');
        });

        // Cover image upload
        const coverUploadArea = container.querySelector('#cover-upload-area');
        const coverInput = container.querySelector('#cover-image');
        const coverPreview = container.querySelector('#cover-preview');
        const coverPreviewImg = container.querySelector('#cover-preview-img');
        const coverUploadPrompt = container.querySelector('#cover-upload-prompt');
        const removeCover = container.querySelector('#remove-cover-btn');

        coverUploadArea.addEventListener('click', () => {
            coverInput.click();
        });

        coverInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleCoverImageUpload(file, coverPreview, coverPreviewImg, coverUploadPrompt);
            }
        });

        removeCover.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeCoverImage(coverInput, coverPreview, coverUploadPrompt);
        });

        // Tags input
        const tagsInput = container.querySelector('#event-tags');
        tagsInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addTag(e.target.value.trim());
                e.target.value = '';
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

    updateLocationField(isVirtual) {
        const locationLabel = document.getElementById('location-label');
        const locationInput = document.getElementById('event-location');
        const locationHelp = document.getElementById('location-help');
        
        if (isVirtual) {
            locationLabel.textContent = 'Virtual Platform';
            locationInput.placeholder = 'e.g., Zoom, Google Meet, YouTube Live';
            locationHelp.textContent = 'Specify the virtual platform or streaming service';
        } else {
            locationLabel.textContent = 'Event Location';
            locationInput.placeholder = 'Enter venue address';
            locationHelp.textContent = 'Specify where your event will take place';
        }
    }

    async handleCoverImageUpload(file, preview, previewImg, prompt) {
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

            this.coverImageFile = file;

        } catch (error) {
            console.error('Cover image upload error:', error);
            this.showError('Failed to process cover image');
        }
    }

    removeCoverImage(input, preview, prompt) {
        input.value = '';
        preview.style.display = 'none';
        prompt.style.display = 'block';
        this.coverImageFile = null;
    }

    addTag(tag) {
        if (!tag || this.eventTags.includes(tag)) return;
        
        this.eventTags.push(tag);
        this.renderTags();
    }

    removeTag(tag) {
        this.eventTags = this.eventTags.filter(t => t !== tag);
        this.renderTags();
    }

    renderTags() {
        const container = document.getElementById('tags-container');
        
        container.innerHTML = this.eventTags.map(tag => `
            <span class="badge bg-primary me-1 mb-1">
                ${tag}
                <button type="button" class="btn-close btn-close-white ms-1" 
                        onclick="this.closest('.event-create-page').__component.removeTag('${tag}')"
                        style="font-size: 0.7em;"></button>
            </span>
        `).join('');
    }

    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let message = '';

        // Reset previous validation
        field.classList.remove('is-invalid', 'is-valid');
        const feedback = field.parentNode.querySelector('.invalid-feedback');

        switch (field.name) {
            case 'title':
                if (!value) {
                    isValid = false;
                    message = 'Event title is required';
                } else if (value.length < 3) {
                    isValid = false;
                    message = 'Event title must be at least 3 characters';
                }
                break;

            case 'event_type':
                if (!value) {
                    isValid = false;
                    message = 'Please select an event type';
                }
                break;

            case 'is_virtual':
                if (!value) {
                    isValid = false;
                    message = 'Please select event format';
                }
                break;

            case 'start_date':
                if (!value) {
                    isValid = false;
                    message = 'Start date and time is required';
                } else if (new Date(value) <= new Date()) {
                    isValid = false;
                    message = 'Start date must be in the future';
                }
                break;

            case 'end_date':
                if (value) {
                    const startDate = document.getElementById('start-date').value;
                    if (startDate && new Date(value) <= new Date(startDate)) {
                        isValid = false;
                        message = 'End date must be after start date';
                    }
                }
                break;

            case 'event_url':
                if (value && !/^https?:\/\/.+\..+/.test(value)) {
                    isValid = false;
                    message = 'Please enter a valid URL (include http:// or https://)';
                }
                break;

            case 'max_attendees':
                if (value && (isNaN(value) || parseInt(value) < 1)) {
                    isValid = false;
                    message = 'Max attendees must be a positive number';
                }
                break;

            case 'ticket_price':
                if (value && (isNaN(value) || parseFloat(value) < 0)) {
                    isValid = false;
                    message = 'Ticket price must be a positive number';
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

            // Validate all required fields
            const requiredInputs = form.querySelectorAll('input[required], select[required]');
            let isValid = true;

            requiredInputs.forEach(input => {
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
            
            // Add tags
            formData.append('tags', JSON.stringify(this.eventTags));
            
            // Add registration required flag
            const registrationRequired = document.getElementById('registration-required').checked;
            formData.append('registration_required', registrationRequired);

            // Upload cover image if provided
            let coverImageUrl = null;
            if (this.coverImageFile) {
                coverImageUrl = await this.uploadCoverImage(this.coverImageFile);
                if (coverImageUrl) {
                    formData.append('cover_image_url', coverImageUrl);
                }
            }

            // Create event
            const eventData = Object.fromEntries(formData.entries());
            const response = await API.post('/api/events', eventData);

            if (response.success) {
                this.showSuccess('Event created successfully!');
                
                // Redirect to event profile
                setTimeout(() => {
                    Router.navigate(`/events/${response.data.id}`);
                }, 1500);
            } else {
                this.showError(response.message || 'Failed to create event');
            }

        } catch (error) {
            console.error('Event creation error:', error);
            this.showError('Failed to create event. Please try again.');
        } finally {
            this.isSubmitting = false;
            this.setSubmitLoading(false);
        }
    }

    async uploadCoverImage(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', 'event_cover');

            const response = await API.post('/api/upload/media', formData);
            
            if (response.success) {
                return response.data.url;
            }
            
            return null;
        } catch (error) {
            console.error('Cover image upload error:', error);
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
        toast.className = `event-toast toast-${type}`;
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

        // Store reference for component access
        container.__component = this;

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
