import Auth from '../../services/auth.js';
import API from '../../services/api.js';
import Router from '../../utils/router.js';

class InterviewEditPage {
    constructor() {
        this.interview = null;
        this.currentUser = Auth.getCurrentUser();
        this.isLoading = false;
        this.hasChanges = false;
        this.uploadedMedia = [];
    }

    async render(container, props = {}) {
        const interviewId = props.params?.id;
        
        if (!interviewId) {
            Router.navigate('/interviews');
            return;
        }

        // Check authentication
        if (!this.currentUser) {
            Router.navigate('/login?redirect=' + encodeURIComponent(`/interviews/${interviewId}/edit`));
            return;
        }

        container.innerHTML = this.getLoadingHTML();
        
        try {
            await this.loadInterview(interviewId);
            
            // Check permissions
            if (!this.canEditInterview()) {
                container.innerHTML = this.getPermissionErrorHTML();
                return;
            }
            
            container.innerHTML = this.getHTML();
            this.setupEventListeners(container);
            this.populateForm();
        } catch (error) {
            console.error('Failed to load interview for editing:', error);
            container.innerHTML = this.getErrorHTML();
        }
    }

    async loadInterview(id) {
        const response = await API.getInterview(id);
        
        if (!response.success) {
            throw new Error(response.message || 'Interview not found');
        }
        
        this.interview = response.data;
    }

    canEditInterview() {
        if (!this.interview || !this.currentUser) return false;
        
        return this.currentUser.id === this.interview.interviewer_id || 
               Auth.hasRole(this.currentUser, 'admin');
    }

    getLoadingHTML() {
        return `
            <div class="container py-5">
                <div class="row justify-content-center">
                    <div class="col-12 text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading interview...</span>
                        </div>
                        <p class="mt-3">Loading interview for editing...</p>
                    </div>
                </div>
            </div>
        `;
    }

    getPermissionErrorHTML() {
        return `
            <div class="container py-5">
                <div class="row justify-content-center">
                    <div class="col-md-6 text-center">
                        <h1 class="display-4 text-danger">Access Denied</h1>
                        <p class="lead">You can only edit your own interviews.</p>
                        <a href="/interviews/${this.interview.id}" class="btn btn-primary">View Interview</a>
                    </div>
                </div>
            </div>
        `;
    }

    getErrorHTML() {
        return `
            <div class="container py-5">
                <div class="row justify-content-center">
                    <div class="col-md-6 text-center">
                        <h1 class="display-4 text-danger">Error</h1>
                        <p class="lead">Failed to load interview for editing.</p>
                        <a href="/interviews" class="btn btn-primary">Back to Interviews</a>
                    </div>
                </div>
            </div>
        `;
    }

    getHTML() {
        return `
            <div class="interview-edit-page">
                ${this.getHeaderSection()}
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
                                <li class="breadcrumb-item"><a href="/interviews/${this.interview.id}">${this.interview.title}</a></li>
                                <li class="breadcrumb-item active">Edit</li>
                            </ol>
                        </nav>
                        
                        <h1 class="mb-2">Edit Interview</h1>
                        <p class="text-muted">Update your interview details</p>
                    </div>
                    <div class="col-md-4 text-md-end">
                        <a href="/interviews/${this.interview.id}" class="btn btn-outline-secondary me-2">
                            <i class="fas fa-eye me-2"></i>View Interview
                        </a>
                        <button class="btn btn-danger" id="delete-btn">
                            <i class="fas fa-trash me-2"></i>Delete
                        </button>
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
                        
                        <form id="interview-edit-form">
                            <div class="card mb-4">
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
                                               required>
                                        <div class="invalid-feedback"></div>
                                    </div>

                                    <div class="mb-3">
                                        <label for="description" class="form-label">Description</label>
                                        <textarea class="form-control" 
                                                  id="description" 
                                                  name="description" 
                                                  rows="4"></textarea>
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
                                        <label for="tags" class="form-label">Tags</label>
                                        <input type="text" 
                                               class="form-control" 
                                               id="tags" 
                                               name="tags">
                                        <div class="form-text">Enter tags separated by commas</div>
                                        <div class="invalid-feedback"></div>
                                    </div>

                                    <div class="mb-3">
                                        <label for="status" class="form-label">Status</label>
                                        <select class="form-select" id="status" name="status">
                                            <option value="draft">Draft</option>
                                            <option value="published">Published</option>
                                            <option value="private">Private</option>
                                            <option value="archived">Archived</option>
                                        </select>
                                        <div class="invalid-feedback"></div>
                                    </div>
                                </div>
                            </div>

                            <div class="card mb-4">
                                <div class="card-header">
                                    <h5 class="mb-0">Interviewee Information</h5>
                                </div>
                                <div class="card-body">
                                    ${this.getIntervieweeSection()}
                                </div>
                            </div>

                            <div class="card mb-4">
                                <div class="card-header d-flex justify-content-between align-items-center">
                                    <h5 class="mb-0">Media Files</h5>
                                    <button type="button" class="btn btn-sm btn-primary" id="add-media-btn">
                                        <i class="fas fa-plus me-2"></i>Add Media
                                    </button>
                                </div>
                                <div class="card-body">
                                    <div id="media-list">
                                        <!-- Media files will be populated here -->
                                    </div>
                                    
                                    <div id="upload-area" class="upload-area border-2 border-dashed rounded p-4 text-center" style="display: none;">
                                        <i class="fas fa-cloud-upload-alt fa-3x text-muted mb-3"></i>
                                        <h5>Upload New Media</h5>
                                        <input type="file" 
                                               id="media-upload" 
                                               multiple 
                                               accept="video/*,audio/*,image/*" 
                                               style="display: none;">
                                        <button type="button" class="btn btn-primary" id="browse-files-btn">
                                            <i class="fas fa-folder-open me-2"></i>Browse Files
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div class="d-flex justify-content-between">
                                <a href="/interviews/${this.interview.id}" class="btn btn-secondary">
                                    <i class="fas fa-times me-2"></i>Cancel
                                </a>
                                <button type="submit" class="btn btn-success" id="save-btn">
                                    <i class="fas fa-save me-2"></i>Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    getIntervieweeSection() {
        const interview = this.interview;
        
        if (interview.interviewee && interview.interviewee.id) {
            // Registered user
            return `
                <div class="d-flex align-items-center">
                    <img src="${interview.interviewee.avatar_url || '/assets/default-avatar.png'}" 
                         class="rounded-circle me-3" 
                         width="48" height="48">
                    <div>
                        <div class="fw-medium">${interview.interviewee.name}</div>
                        <small class="text-muted">Registered User</small>
                    </div>
                </div>
                <p class="text-muted mt-2 mb-0">
                    <small>Registered users cannot be changed after interview creation.</small>
                </p>
            `;
        } else {
            // Guest user - can be edited
            return `
                <div class="mb-3">
                    <label for="interviewee_name" class="form-label">Interviewee Name</label>
                    <input type="text" 
                           class="form-control" 
                           id="interviewee_name" 
                           name="interviewee_name" 
                           value="${interview.interviewee.name || ''}">
                    <div class="invalid-feedback"></div>
                </div>

                <div class="mb-3">
                    <label for="interviewee_bio" class="form-label">Interviewee Bio</label>
                    <textarea class="form-control" 
                              id="interviewee_bio" 
                              name="interviewee_bio" 
                              rows="3">${interview.interviewee.bio || ''}</textarea>
                    <div class="invalid-feedback"></div>
                </div>
            `;
        }
    }

    setupEventListeners(container) {
        const form = container.querySelector('#interview-edit-form');
        const saveBtn = container.querySelector('#save-btn');
        const deleteBtn = container.querySelector('#delete-btn');
        
        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSave(form, saveBtn);
        });

        // Delete button
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.handleDelete());
        }

        // Track changes
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.hasChanges = true;
                this.clearFieldError(input);
            });
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

        // Media management
        this.setupMediaManagement(container);

        // Warn about unsaved changes
        window.addEventListener('beforeunload', (e) => {
            if (this.hasChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    setupMediaManagement(container) {
        const addMediaBtn = container.querySelector('#add-media-btn');
        const uploadArea = container.querySelector('#upload-area');
        const mediaUpload = container.querySelector('#media-upload');
        const browseBtn = container.querySelector('#browse-files-btn');

        // Show/hide upload area
        addMediaBtn.addEventListener('click', () => {
            uploadArea.style.display = uploadArea.style.display === 'none' ? 'block' : 'none';
        });

        // File upload
        browseBtn.addEventListener('click', () => mediaUpload.click());
        mediaUpload.addEventListener('change', (e) => {
            this.handleMediaUpload(e.target.files);
        });

        // Load existing media
        this.loadExistingMedia();
    }

    populateForm() {
        const interview = this.interview;
        
        // Basic fields
        document.getElementById('title').value = interview.title || '';
        document.getElementById('description').value = interview.description || '';
        document.getElementById('type').value = interview.type || 'video';
        document.getElementById('category').value = interview.category || '';
        document.getElementById('status').value = interview.status || 'draft';
        
        // Tags
        if (interview.tags && interview.tags.length > 0) {
            document.getElementById('tags').value = interview.tags.join(', ');
        }
        
        // Interviewee (only for guest users)
        if (!interview.interviewee.id) {
            const nameField = document.getElementById('interviewee_name');
            const bioField = document.getElementById('interviewee_bio');
            
            if (nameField) nameField.value = interview.interviewee.name || '';
            if (bioField) bioField.value = interview.interviewee.bio || '';
        }
        
        // Update character count
        const descriptionCount = document.getElementById('description-count');
        if (descriptionCount) {
            descriptionCount.textContent = (interview.description || '').length;
        }
    }

    async loadExistingMedia() {
        try {
            const response = await API.getInterviewMedia(this.interview.id);
            
            if (response.success && response.data.length > 0) {
                this.renderMediaList(response.data);
            } else {
                this.renderEmptyMediaList();
            }
            
        } catch (error) {
            console.error('Failed to load media:', error);
            this.renderEmptyMediaList();
        }
    }

    renderMediaList(mediaFiles) {
        const container = document.getElementById('media-list');
        
        if (mediaFiles.length === 0) {
            this.renderEmptyMediaList();
            return;
        }
        
        container.innerHTML = mediaFiles.map(media => `
            <div class="media-item border rounded p-3 mb-2" data-media-id="${media.id}">
                <div class="d-flex align-items-center">
                    <div class="media-icon me-3">
                        <i class="fas ${this.getMediaIcon(media.type)} fa-2x text-primary"></i>
                    </div>
                    <div class="media-info flex-grow-1">
                        <div class="fw-medium">${media.filename}</div>
                        <div class="text-muted small">
                            ${media.type.charAt(0).toUpperCase() + media.type.slice(1)} • 
                            ${this.formatFileSize(media.file_size)}
                            ${media.duration ? ` • ${this.formatDuration(media.duration)}` : ''}
                        </div>
                        ${media.is_primary ? '<span class="badge bg-success">Primary</span>' : ''}
                    </div>
                    <div class="media-actions">
                        <button type="button" class="btn btn-sm btn-outline-danger remove-media" data-media-id="${media.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add remove handlers
        container.querySelectorAll('.remove-media').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mediaId = e.target.closest('.remove-media').getAttribute('data-media-id');
                this.removeMedia(mediaId);
            });
        });
    }

    renderEmptyMediaList() {
        const container = document.getElementById('media-list');
        container.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="fas fa-file fa-2x mb-2"></i>
                <p class="mb-0">No media files uploaded yet</p>
            </div>
        `;
    }

    async handleMediaUpload(files) {
        // Similar to create page implementation
        console.log('Uploading media files:', files);
        // Implementation would be similar to InterviewCreatePage
    }

    async removeMedia(mediaId) {
        if (!confirm('Are you sure you want to remove this media file?')) {
            return;
        }
        
        try {
            // TODO: Implement media removal API
            console.log('Removing media:', mediaId);
            this.hasChanges = true;
            
        } catch (error) {
            console.error('Failed to remove media:', error);
            this.showAlert('error', 'Failed to remove media file');
        }
    }

    async handleSave(form, saveBtn) {
        if (this.isLoading) return;

        try {
            this.isLoading = true;
            this.setLoadingState(saveBtn, true);
            this.clearErrors();

            const formData = new FormData(form);
            const updateData = {
                title: formData.get('title'),
                description: formData.get('description'),
                type: formData.get('type'),
                category: formData.get('category'),
                status: formData.get('status'),
                tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()) : []
            };

            // Add interviewee data for guest users
            if (!this.interview.interviewee.id) {
                updateData.interviewee_name = formData.get('interviewee_name');
                updateData.interviewee_bio = formData.get('interviewee_bio');
            }

            const response = await API.updateInterview(this.interview.id, updateData);

            if (response.success) {
                this.hasChanges = false;
                this.showAlert('success', 'Interview updated successfully!');
                
                // Update local data
                this.interview = { ...this.interview, ...response.data };
                
                // Redirect after a delay
                setTimeout(() => {
                    Router.navigate(`/interviews/${this.interview.id}`);
                }, 1500);
            } else {
                this.handleSaveError(response);
            }

        } catch (error) {
            console.error('Save error:', error);
            this.showAlert('error', error.message || 'Failed to save changes');
        } finally {
            this.isLoading = false;
            this.setLoadingState(saveBtn, false);
        }
    }

    async handleDelete() {
        if (!confirm('Are you sure you want to delete this interview? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await API.deleteInterview(this.interview.id);

            if (response.success) {
                this.showAlert('success', 'Interview deleted successfully!');
                
                setTimeout(() => {
                    Router.navigate('/interviews');
                }, 1500);
            } else {
                this.showAlert('error', response.message || 'Failed to delete interview');
            }

        } catch (error) {
            console.error('Delete error:', error);
            this.showAlert('error', 'Failed to delete interview');
        }
    }

    // Utility methods (similar to create page)
    setLoadingState(button, loading) {
        if (loading) {
            button.disabled = true;
            button.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                Saving...
            `;
        } else {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-save me-2"></i>Save Changes';
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

        if (type === 'success') {
            setTimeout(() => {
                const alert = container.querySelector('.alert');
                if (alert) alert.remove();
            }, 3000);
        }
    }

    handleSaveError(response) {
        if (response.errors) {
            Object.keys(response.errors).forEach(field => {
                this.showFieldError(field, response.errors[field]);
            });
        } else {
            this.showAlert('error', response.message || 'Failed to save changes');
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

    clearErrors() {
        const alertContainer = document.getElementById('alert-container');
        alertContainer.innerHTML = '';

        const invalidFields = document.querySelectorAll('.is-invalid');
        invalidFields.forEach(field => {
            this.clearFieldError(field);
        });
    }

    getMediaIcon(type) {
        const icons = {
            'video': 'fa-video',
            'audio': 'fa-music',
            'image': 'fa-image'
        };
        return icons[type] || 'fa-file';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }
}

export default InterviewEditPage;
