import Auth from '../../services/auth.js';
import API from '../../services/api.js';
import Router from '../../utils/router.js';

class InterviewCreatePage {
    constructor() {
        this.currentUser = Auth.getCurrentUser();
        this.isLoading = false;
        this.hasChanges = false;
        this.uploadedMedia = [];
        this.currentStep = 1;
        this.totalSteps = 3;
    }

    async render(container, props = {}) {
        // Check authentication and permissions
        if (!this.currentUser) {
            Router.navigate('/login?redirect=' + encodeURIComponent('/interviews/create'));
            return;
        }

        if (!Auth.canCreateInterview()) {
            container.innerHTML = this.getPermissionErrorHTML();
            return;
        }

        container.innerHTML = this.getHTML();
        this.setupEventListeners(container);
    }

    getPermissionErrorHTML() {
        return `
            <div class="container py-5">
                <div class="row justify-content-center">
                    <div class="col-md-6 text-center">
                        <h1 class="display-4 text-warning">Permission Required</h1>
                        <p class="lead">You need interviewer role to create interviews.</p>
                        <p class="text-muted">Please contact an administrator to upgrade your account.</p>
                        <a href="/interviews" class="btn btn-primary">Browse Interviews</a>
                    </div>
                </div>
            </div>
        `;
    }

    getHTML() {
        return `
            <div class="interview-create-page">
                ${this.getHeaderSection()}
                ${this.getProgressSection()}
                ${this.getFormSection()}
            </div>
        `;
    }

    getHeaderSection() {
        return `
            <div class="container py-4">
                <div class="row">
                    <div class="col-md-8">
                        <nav aria-label="breadcrumb">
                            <ol class="breadcrumb">
                                <li class="breadcrumb-item"><a href="/interviews">Interviews</a></li>
                                <li class="breadcrumb-item active">Create Interview</li>
                            </ol>
                        </nav>
                        
                        <h1 class="mb-2">Create New Interview</h1>
                        <p class="text-muted">Share your conversation with the world</p>
                    </div>
                    <div class="col-md-4 text-md-end">
                        <button class="btn btn-outline-secondary me-2" id="save-draft-btn">
                            <i class="fas fa-save me-2"></i>Save Draft
                        </button>
                        <button class="btn btn-success" id="publish-btn" disabled>
                            <i class="fas fa-globe me-2"></i>Publish
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getProgressSection() {
        return `
            <div class="bg-light py-3 mb-4">
                <div class="container">
                    <div class="progress-steps">
                        <div class="row">
                            <div class="col-md-4">
                                <div class="step ${this.currentStep >= 1 ? 'active' : ''} ${this.currentStep > 1 ? 'completed' : ''}">
                                    <div class="step-number">1</div>
                                    <div class="step-title">Basic Information</div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="step ${this.currentStep >= 2 ? 'active' : ''} ${this.currentStep > 2 ? 'completed' : ''}">
                                    <div class="step-number">2</div>
                                    <div class="step-title">Media & Content</div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="step ${this.currentStep >= 3 ? 'active' : ''}">
                                    <div class="step-number">3</div>
                                    <div class="step-title">Review & Publish</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getFormSection() {
        return `
            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-lg-8">
                        <div id="alert-container"></div>
                        
                        <form id="interview-form">
                            <div class="step-content" id="step-1" style="display: ${this.currentStep === 1 ? 'block' : 'none'}">
                                ${this.getStep1Content()}
                            </div>
                            
                            <div class="step-content" id="step-2" style="display: ${this.currentStep === 2 ? 'block' : 'none'}">
                                ${this.getStep2Content()}
                            </div>
                            
                            <div class="step-content" id="step-3" style="display: ${this.currentStep === 3 ? 'block' : 'none'}">
                                ${this.getStep3Content()}
                            </div>
                            
                            ${this.getNavigationButtons()}
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    getStep1Content() {
        return `
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0">Basic Information</h5>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <label for="title" class="form-label">Interview Title *</label>
                        <input type="text" 
                               class="form-control" 
                               id="title" 
                               name="title" 
                               required 
                               placeholder="Enter a compelling title for your interview">
                        <div class="form-text">A clear, descriptive title helps people find your interview</div>
                        <div class="invalid-feedback"></div>
                    </div>

                    <div class="mb-3">
                        <label for="description" class="form-label">Description</label>
                        <textarea class="form-control" 
                                  id="description" 
                                  name="description" 
                                  rows="4" 
                                  placeholder="Describe what this interview is about..."></textarea>
                        <div class="form-text">
                            <span id="description-count">0</span>/2000 characters
                        </div>
                        <div class="invalid-feedback"></div>
                    </div>

                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="type" class="form-label">Interview Type *</label>
                                <select class="form-select" id="type" name="type" required>
                                    <option value="">Select type</option>
                                    <option value="video">Video Interview</option>
                                    <option value="audio">Audio Interview</option>
                                    <option value="text">Text Interview</option>
                                </select>
                                <div class="invalid-feedback"></div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="category" class="form-label">Category</label>
                                <select class="form-select" id="category" name="category">
                                    <option value="">Select category</option>
                                    <option value="music">Music</option>
                                    <option value="business">Business</option>
                                    <option value="politics">Politics</option>
                                    <option value="sports">Sports</option>
                                    <option value="technology">Technology</option>
                                    <option value="entertainment">Entertainment</option>
                                    <option value="lifestyle">Lifestyle</option>
                                    <option value="education">Education</option>
                                    <option value="health">Health</option>
                                    <option value="other">Other</option>
                                </select>
                                <div class="invalid-feedback"></div>
                            </div>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">Interviewee Information</label>
                        <div class="row">
                            <div class="col-md-6">
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="interviewee_type" id="registered_user" value="registered">
                                    <label class="form-check-label" for="registered_user">
                                        Registered User
                                    </label>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="interviewee_type" id="guest_user" value="guest" checked>
                                    <label class="form-check-label" for="guest_user">
                                        Guest (Non-registered)
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="registered-interviewee" style="display: none;">
                        <div class="mb-3">
                            <label for="interviewee_search" class="form-label">Search User</label>
                            <input type="text" 
                                   class="form-control" 
                                   id="interviewee_search" 
                                   placeholder="Type username to search...">
                            <div id="user-search-results" class="mt-2"></div>
                            <input type="hidden" id="interviewee_id" name="interviewee_id">
                        </div>
                    </div>

                    <div id="guest-interviewee">
                        <div class="mb-3">
                            <label for="interviewee_name" class="form-label">Interviewee Name *</label>
                            <input type="text" 
                                   class="form-control" 
                                   id="interviewee_name" 
                                   name="interviewee_name" 
                                   placeholder="Full name of the person being interviewed">
                            <div class="invalid-feedback"></div>
                        </div>

                        <div class="mb-3">
                            <label for="interviewee_bio" class="form-label">Interviewee Bio</label>
                            <textarea class="form-control" 
                                      id="interviewee_bio" 
                                      name="interviewee_bio" 
                                      rows="3" 
                                      placeholder="Brief bio or description of the interviewee..."></textarea>
                            <div class="invalid-feedback"></div>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label for="tags" class="form-label">Tags</label>
                        <input type="text" 
                               class="form-control" 
                               id="tags" 
                               name="tags" 
                               placeholder="Enter tags separated by commas">
                        <div class="form-text">Add relevant tags to help people discover your interview</div>
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
            </div>
        `;
    }

    getStep2Content() {
        return `
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0">Media & Content</h5>
                </div>
                <div class="card-body">
                    <div class="mb-4">
                        <label class="form-label">Upload Media Files</label>
                        <div class="upload-area border-2 border-dashed rounded p-4 text-center" id="upload-area">
                            <i class="fas fa-cloud-upload-alt fa-3x text-muted mb-3"></i>
                            <h5>Drag & Drop Files Here</h5>
                            <p class="text-muted mb-3">or click to browse files</p>
                            <input type="file" 
                                   id="media-upload" 
                                   multiple 
                                   accept="video/*,audio/*,image/*" 
                                   style="display: none;">
                            <button type="button" class="btn btn-primary" id="browse-files-btn">
                                <i class="fas fa-folder-open me-2"></i>Browse Files
                            </button>
                        </div>
                        <div class="form-text">
                            Supported formats: MP4, MOV, AVI, WebM (video), MP3, WAV, M4A (audio), JPG, PNG, GIF (images)
                        </div>
                    </div>

                    <div id="uploaded-media-list" class="mb-4"></div>

                    <div class="mb-3">
                        <label for="thumbnail_upload" class="form-label">Custom Thumbnail (Optional)</label>
                        <input type="file" 
                               class="form-control" 
                               id="thumbnail_upload" 
                               accept="image/*">
                        <div class="form-text">Upload a custom thumbnail image for your interview</div>
                        <div id="thumbnail-preview" class="mt-2"></div>
                    </div>

                    <div class="mb-3">
                        <label for="duration" class="form-label">Duration (Optional)</label>
                        <div class="row">
                            <div class="col-4">
                                <input type="number" 
                                       class="form-control" 
                                       id="duration_hours" 
                                       min="0" 
                                       max="23" 
                                       placeholder="Hours">
                            </div>
                            <div class="col-4">
                                <input type="number" 
                                       class="form-control" 
                                       id="duration_minutes" 
                                       min="0" 
                                       max="59" 
                                       placeholder="Minutes">
                            </div>
                            <div class="col-4">
                                <input type="number" 
                                       class="form-control" 
                                       id="duration_seconds" 
                                       min="0" 
                                       max="59" 
                                       placeholder="Seconds">
                            </div>
                        </div>
                        <div class="form-text">Specify the total duration of your interview</div>
                    </div>
                </div>
            </div>
        `;
    }

    getStep3Content() {
        return `
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0">Review & Publish</h5>
                </div>
                <div class="card-body">
                    <div id="interview-preview">
                        <!-- Preview will be populated by JavaScript -->
                    </div>

                    <div class="mb-4">
                        <label for="status" class="form-label">Publication Status</label>
                        <div class="row">
                            <div class="col-md-4">
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="status" id="status_draft" value="draft" checked>
                                    <label class="form-check-label" for="status_draft">
                                        <strong>Draft</strong><br>
                                        <small class="text-muted">Save for later editing</small>
                                    </label>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="status" id="status_published" value="published">
                                    <label class="form-check-label" for="status_published">
                                        <strong>Published</strong><br>
                                        <small class="text-muted">Make public immediately</small>
                                    </label>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="status" id="status_private" value="private">
                                    <label class="form-check-label" for="status_private">
                                        <strong>Private</strong><br>
                                        <small class="text-muted">Only you can view</small>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="alert alert-info">
                        <h6 class="alert-heading">
                            <i class="fas fa-info-circle me-2"></i>Ready to Share?
                        </h6>
                        <p class="mb-0">
                            Review your interview details above. You can always edit or change the status later.
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    getNavigationButtons() {
        return `
            <div class="d-flex justify-content-between mt-4">
                <button type="button" 
                        class="btn btn-outline-secondary" 
                        id="prev-btn" 
                        ${this.currentStep === 1 ? 'style="visibility: hidden;"' : ''}>
                    <i class="fas fa-arrow-left me-2"></i>Previous
                </button>
                
                <button type="button" 
                        class="btn btn-primary" 
                        id="next-btn" 
                        ${this.currentStep === this.totalSteps ? 'style="display: none;"' : ''}>
                    Next<i class="fas fa-arrow-right ms-2"></i>
                </button>
                
                <button type="submit" 
                        class="btn btn-success" 
                        id="create-btn" 
                        ${this.currentStep !== this.totalSteps ? 'style="display: none;"' : ''}>
                    <i class="fas fa-check me-2"></i>Create Interview
                </button>
            </div>
        `;
    }

    setupEventListeners(container) {
        // Step navigation
        const prevBtn = container.querySelector('#prev-btn');
        const nextBtn = container.querySelector('#next-btn');
        const createBtn = container.querySelector('#create-btn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousStep());
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextStep());
        }

        if (createBtn) {
            createBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });
        }

        // Form validation and change tracking
        const form = container.querySelector('#interview-form');
        const inputs = form.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.hasChanges = true;
                this.clearFieldError(input);
                this.updatePublishButton();
            });
        });

        // Interviewee type toggle
        const intervieweeTypeRadios = container.querySelectorAll('input[name="interviewee_type"]');
        intervieweeTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => this.toggleIntervieweeType());
        });

        // Description character count
        const descriptionField = container.querySelector('#description');
        const descriptionCount = container.querySelector('#description-count');
        
        if (descriptionField && descriptionCount) {
            const updateCount = () => {
                descriptionCount.textContent = descriptionField.value.length;
            };
            descriptionField.addEventListener('input', updateCount);
            updateCount();
        }

        // Media upload
        this.setupMediaUpload(container);

        // Save draft and publish buttons
        const saveDraftBtn = container.querySelector('#save-draft-btn');
        const publishBtn = container.querySelector('#publish-btn');

        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', () => this.saveDraft());
        }

        if (publishBtn) {
            publishBtn.addEventListener('click', () => this.publishInterview());
        }

        // Warn about unsaved changes
        window.addEventListener('beforeunload', (e) => {
            if (this.hasChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    setupMediaUpload(container) {
        const uploadArea = container.querySelector('#upload-area');
        const mediaUpload = container.querySelector('#media-upload');
        const browseBtn = container.querySelector('#browse-files-btn');

        // Click to browse
        browseBtn.addEventListener('click', () => mediaUpload.click());
        uploadArea.addEventListener('click', () => mediaUpload.click());

        // File selection
        mediaUpload.addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('border-primary');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('border-primary');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('border-primary');
            this.handleFileUpload(e.dataTransfer.files);
        });

        // Thumbnail upload
        const thumbnailUpload = container.querySelector('#thumbnail_upload');
        thumbnailUpload.addEventListener('change', (e) => {
            this.handleThumbnailUpload(e.target.files[0]);
        });
    }

    async handleFileUpload(files) {
        const fileArray = Array.from(files);
        const uploadList = document.getElementById('uploaded-media-list');

        for (const file of fileArray) {
            try {
                // Validate file
                if (!this.validateMediaFile(file)) {
                    continue;
                }

                // Create upload item
                const uploadItem = this.createUploadItem(file);
                uploadList.appendChild(uploadItem);

                // Upload file
                const formData = new FormData();
                formData.append('media', file);

                const response = await API.uploadMedia(formData);

                if (response.success) {
                    this.uploadedMedia.push({
                        file: file,
                        url: response.data.url,
                        type: response.data.type,
                        size: response.data.size,
                        duration: response.data.duration
                    });

                    this.updateUploadItem(uploadItem, 'success', response.data);
                } else {
                    this.updateUploadItem(uploadItem, 'error', { message: response.message });
                }

            } catch (error) {
                console.error('Upload error:', error);
                this.updateUploadItem(uploadItem, 'error', { message: 'Upload failed' });
            }
        }

        this.hasChanges = true;
        this.updatePublishButton();
    }

    async handleThumbnailUpload(file) {
        if (!file) return;

        try {
            const formData = new FormData();
            formData.append('thumbnail', file);

            const response = await API.uploadThumbnail(formData);

            if (response.success) {
                const preview = document.getElementById('thumbnail-preview');
                preview.innerHTML = `
                    <img src="${response.data.url}"
                         class="img-thumbnail"
                         style="max-width: 200px; max-height: 150px;"
                         alt="Thumbnail preview">
                `;

                this.thumbnailUrl = response.data.url;
                this.hasChanges = true;
            }

        } catch (error) {
            console.error('Thumbnail upload error:', error);
            this.showAlert('error', 'Failed to upload thumbnail');
        }
    }

    toggleIntervieweeType() {
        const registeredDiv = document.getElementById('registered-interviewee');
        const guestDiv = document.getElementById('guest-interviewee');
        const selectedType = document.querySelector('input[name="interviewee_type"]:checked').value;

        if (selectedType === 'registered') {
            registeredDiv.style.display = 'block';
            guestDiv.style.display = 'none';
        } else {
            registeredDiv.style.display = 'none';
            guestDiv.style.display = 'block';
        }
    }

    nextStep() {
        if (this.validateCurrentStep()) {
            this.currentStep++;
            this.updateStepDisplay();
            
            if (this.currentStep === 3) {
                this.generatePreview();
            }
        }
    }

    previousStep() {
        this.currentStep--;
        this.updateStepDisplay();
    }

    updateStepDisplay() {
        // Hide all steps
        document.querySelectorAll('.step-content').forEach(step => {
            step.style.display = 'none';
        });

        // Show current step
        document.getElementById(`step-${this.currentStep}`).style.display = 'block';

        // Update progress indicators
        document.querySelectorAll('.step').forEach((step, index) => {
            step.classList.remove('active', 'completed');
            if (index + 1 < this.currentStep) {
                step.classList.add('completed');
            } else if (index + 1 === this.currentStep) {
                step.classList.add('active');
            }
        });

        // Update navigation buttons
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const createBtn = document.getElementById('create-btn');

        if (prevBtn) {
            prevBtn.style.visibility = this.currentStep === 1 ? 'hidden' : 'visible';
        }

        if (nextBtn) {
            nextBtn.style.display = this.currentStep === this.totalSteps ? 'none' : 'inline-block';
        }

        if (createBtn) {
            createBtn.style.display = this.currentStep === this.totalSteps ? 'inline-block' : 'none';
        }
    }

    validateCurrentStep() {
        const form = document.getElementById('interview-form');
        let isValid = true;

        if (this.currentStep === 1) {
            // Validate basic information
            const title = form.querySelector('#title');
            const type = form.querySelector('#type');
            const intervieweeType = form.querySelector('input[name="interviewee_type"]:checked');

            if (!title.value.trim()) {
                this.showFieldError('title', 'Title is required');
                isValid = false;
            }

            if (!type.value) {
                this.showFieldError('type', 'Interview type is required');
                isValid = false;
            }

            if (intervieweeType.value === 'guest') {
                const intervieweeName = form.querySelector('#interviewee_name');
                if (!intervieweeName.value.trim()) {
                    this.showFieldError('interviewee_name', 'Interviewee name is required');
                    isValid = false;
                }
            } else {
                const intervieweeId = form.querySelector('#interviewee_id');
                if (!intervieweeId.value) {
                    this.showAlert('error', 'Please select a registered user as interviewee');
                    isValid = false;
                }
            }
        }

        return isValid;
    }

    generatePreview() {
        const form = document.getElementById('interview-form');
        const formData = new FormData(form);
        const preview = document.getElementById('interview-preview');

        const title = formData.get('title') || 'Untitled Interview';
        const description = formData.get('description') || 'No description provided';
        const type = formData.get('type') || 'video';
        const category = formData.get('category') || 'Uncategorized';
        const intervieweeType = formData.get('interviewee_type');
        const intervieweeName = intervieweeType === 'guest' ?
            formData.get('interviewee_name') :
            'Selected User';

        preview.innerHTML = `
            <div class="interview-preview-card">
                <h4>${title}</h4>
                <p class="text-muted">${description}</p>

                <div class="row mb-3">
                    <div class="col-md-6">
                        <strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)}
                    </div>
                    <div class="col-md-6">
                        <strong>Category:</strong> ${category || 'None'}
                    </div>
                </div>

                <div class="row mb-3">
                    <div class="col-md-6">
                        <strong>Interviewer:</strong> ${this.currentUser.username}
                    </div>
                    <div class="col-md-6">
                        <strong>Interviewee:</strong> ${intervieweeName || 'Not specified'}
                    </div>
                </div>

                ${this.uploadedMedia.length > 0 ? `
                    <div class="mb-3">
                        <strong>Media Files:</strong> ${this.uploadedMedia.length} file(s) uploaded
                    </div>
                ` : ''}

                ${this.thumbnailUrl ? `
                    <div class="mb-3">
                        <strong>Thumbnail:</strong>
                        <img src="${this.thumbnailUrl}" class="img-thumbnail ms-2" style="max-width: 100px;">
                    </div>
                ` : ''}
            </div>
        `;
    }

    updatePublishButton() {
        const publishBtn = document.getElementById('publish-btn');
        const form = document.getElementById('interview-form');

        if (!publishBtn || !form) return;

        const title = form.querySelector('#title')?.value?.trim();
        const type = form.querySelector('#type')?.value;
        const hasBasicInfo = title && type;

        publishBtn.disabled = !hasBasicInfo;
    }

    async saveDraft() {
        if (this.isLoading) return;

        try {
            this.isLoading = true;
            const saveDraftBtn = document.getElementById('save-draft-btn');

            if (saveDraftBtn) {
                saveDraftBtn.disabled = true;
                saveDraftBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
            }

            const interviewData = this.collectFormData();
            interviewData.status = 'draft';

            const response = await API.createInterview(interviewData);

            if (response.success) {
                this.hasChanges = false;
                this.showAlert('success', 'Draft saved successfully!');

                // Redirect to edit page
                setTimeout(() => {
                    Router.navigate(`/interviews/${response.data.id}/edit`);
                }, 1500);
            } else {
                this.showAlert('error', response.message || 'Failed to save draft');
            }

        } catch (error) {
            console.error('Save draft error:', error);
            this.showAlert('error', 'Failed to save draft');
        } finally {
            this.isLoading = false;
            const saveDraftBtn = document.getElementById('save-draft-btn');
            if (saveDraftBtn) {
                saveDraftBtn.disabled = false;
                saveDraftBtn.innerHTML = '<i class="fas fa-save me-2"></i>Save Draft';
            }
        }
    }

    async publishInterview() {
        if (this.isLoading) return;

        try {
            this.isLoading = true;
            const publishBtn = document.getElementById('publish-btn');

            if (publishBtn) {
                publishBtn.disabled = true;
                publishBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Publishing...';
            }

            const interviewData = this.collectFormData();
            interviewData.status = 'published';

            const response = await API.createInterview(interviewData);

            if (response.success) {
                this.hasChanges = false;
                this.showAlert('success', 'Interview published successfully!');

                // Redirect to interview page
                setTimeout(() => {
                    Router.navigate(`/interviews/${response.data.id}`);
                }, 1500);
            } else {
                this.showAlert('error', response.message || 'Failed to publish interview');
            }

        } catch (error) {
            console.error('Publish error:', error);
            this.showAlert('error', 'Failed to publish interview');
        } finally {
            this.isLoading = false;
            const publishBtn = document.getElementById('publish-btn');
            if (publishBtn) {
                publishBtn.disabled = false;
                publishBtn.innerHTML = '<i class="fas fa-globe me-2"></i>Publish';
            }
        }
    }

    async handleSubmit() {
        if (this.isLoading) return;

        try {
            this.isLoading = true;
            const createBtn = document.getElementById('create-btn');

            if (createBtn) {
                createBtn.disabled = true;
                createBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating...';
            }

            const interviewData = this.collectFormData();
            const selectedStatus = document.querySelector('input[name="status"]:checked')?.value || 'draft';
            interviewData.status = selectedStatus;

            const response = await API.createInterview(interviewData);

            if (response.success) {
                this.hasChanges = false;
                const message = selectedStatus === 'published' ?
                    'Interview published successfully!' :
                    'Interview created successfully!';

                this.showAlert('success', message);

                // Redirect to interview page
                setTimeout(() => {
                    Router.navigate(`/interviews/${response.data.id}`);
                }, 1500);
            } else {
                this.handleCreateError(response);
            }

        } catch (error) {
            console.error('Create error:', error);
            this.showAlert('error', 'Failed to create interview');
        } finally {
            this.isLoading = false;
            const createBtn = document.getElementById('create-btn');
            if (createBtn) {
                createBtn.disabled = false;
                createBtn.innerHTML = '<i class="fas fa-check me-2"></i>Create Interview';
            }
        }
    }

    showAlert(type, message) {
        const container = document.getElementById('alert-container');
        const alertClass = type === 'error' ? 'alert-danger' : `alert-${type}`;
        
        container.innerHTML = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        // Auto-dismiss success alerts
        if (type === 'success') {
            setTimeout(() => {
                const alert = container.querySelector('.alert');
                if (alert) {
                    alert.remove();
                }
            }, 3000);
        }
    }

    showFieldError(fieldName, message) {
        const field = document.getElementById(fieldName);
        if (field) {
            field.classList.add('is-invalid');
            const feedback = field.parentNode.querySelector('.invalid-feedback');
            if (feedback) {
                feedback.textContent = message;
            }
        }
    }

    clearFieldError(field) {
        field.classList.remove('is-invalid');
        const feedback = field.parentNode.querySelector('.invalid-feedback');
        if (feedback) {
            feedback.textContent = '';
        }
    }

    collectFormData() {
        const form = document.getElementById('interview-form');
        const formData = new FormData(form);

        const data = {
            title: formData.get('title'),
            description: formData.get('description'),
            type: formData.get('type'),
            category: formData.get('category'),
            tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()) : []
        };

        // Handle interviewee data
        const intervieweeType = formData.get('interviewee_type');
        if (intervieweeType === 'registered') {
            data.interviewee_id = formData.get('interviewee_id');
        } else {
            data.interviewee_name = formData.get('interviewee_name');
            data.interviewee_bio = formData.get('interviewee_bio');
        }

        // Handle duration
        const hours = parseInt(document.getElementById('duration_hours')?.value) || 0;
        const minutes = parseInt(document.getElementById('duration_minutes')?.value) || 0;
        const seconds = parseInt(document.getElementById('duration_seconds')?.value) || 0;

        if (hours || minutes || seconds) {
            data.duration = (hours * 3600) + (minutes * 60) + seconds;
        }

        // Handle thumbnail
        if (this.thumbnailUrl) {
            data.thumbnail_url = this.thumbnailUrl;
        }

        return data;
    }

    validateMediaFile(file) {
        const maxSize = 100 * 1024 * 1024; // 100MB
        const allowedTypes = [
            'video/mp4', 'video/mov', 'video/avi', 'video/webm',
            'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac',
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif'
        ];

        if (file.size > maxSize) {
            this.showAlert('error', `File "${file.name}" is too large. Maximum size is 100MB.`);
            return false;
        }

        if (!allowedTypes.includes(file.type)) {
            this.showAlert('error', `File type "${file.type}" is not supported.`);
            return false;
        }

        return true;
    }

    createUploadItem(file) {
        const item = document.createElement('div');
        item.className = 'upload-item border rounded p-3 mb-2';
        item.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="upload-icon me-3">
                    <i class="fas fa-file fa-2x text-muted"></i>
                </div>
                <div class="upload-info flex-grow-1">
                    <div class="fw-medium">${file.name}</div>
                    <div class="text-muted small">${this.formatFileSize(file.size)}</div>
                    <div class="upload-status">
                        <div class="progress mt-2">
                            <div class="progress-bar progress-bar-striped progress-bar-animated"
                                 style="width: 0%"></div>
                        </div>
                    </div>
                </div>
                <div class="upload-actions">
                    <button type="button" class="btn btn-sm btn-outline-danger remove-upload">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;

        // Add remove functionality
        const removeBtn = item.querySelector('.remove-upload');
        removeBtn.addEventListener('click', () => {
            item.remove();
            this.removeUploadedMedia(file);
        });

        return item;
    }

    updateUploadItem(item, status, data) {
        const progressBar = item.querySelector('.progress-bar');
        const statusDiv = item.querySelector('.upload-status');
        const icon = item.querySelector('.upload-icon i');

        if (status === 'success') {
            progressBar.style.width = '100%';
            progressBar.classList.remove('progress-bar-animated', 'progress-bar-striped');
            progressBar.classList.add('bg-success');

            statusDiv.innerHTML = '<small class="text-success"><i class="fas fa-check me-1"></i>Upload complete</small>';

            // Update icon based on file type
            if (data.type === 'video') {
                icon.className = 'fas fa-video fa-2x text-primary';
            } else if (data.type === 'audio') {
                icon.className = 'fas fa-music fa-2x text-info';
            } else if (data.type === 'image') {
                icon.className = 'fas fa-image fa-2x text-success';
            }

        } else if (status === 'error') {
            progressBar.classList.remove('progress-bar-animated', 'progress-bar-striped');
            progressBar.classList.add('bg-danger');
            progressBar.style.width = '100%';

            statusDiv.innerHTML = `<small class="text-danger"><i class="fas fa-exclamation-triangle me-1"></i>${data.message}</small>`;
            icon.className = 'fas fa-exclamation-triangle fa-2x text-danger';
        }
    }

    removeUploadedMedia(file) {
        this.uploadedMedia = this.uploadedMedia.filter(media => media.file !== file);
        this.hasChanges = true;
        this.updatePublishButton();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    handleCreateError(response) {
        if (response.errors) {
            // Show field-specific errors
            Object.keys(response.errors).forEach(field => {
                this.showFieldError(field, response.errors[field]);
            });

            // Go back to first step if there are validation errors
            this.currentStep = 1;
            this.updateStepDisplay();
        } else {
            // Show general error
            this.showAlert('error', response.message || 'Failed to create interview');
        }
    }
}

export default InterviewCreatePage;
