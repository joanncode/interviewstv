import API from '../../services/api.js';
import Auth from '../../services/auth.js';
import Router from '../../utils/router.js';

export default class GalleryEditPage {
    constructor() {
        this.currentUser = Auth.getCurrentUser();
        this.gallery = null;
        this.galleryMedia = [];
        this.isLoading = false;
        this.hasChanges = false;
        this.draggedItem = null;
    }

    async render(container, params) {
        if (!this.currentUser) {
            window.location.href = '/login';
            return;
        }

        const galleryId = params.id;
        
        try {
            await this.loadGallery(galleryId);
            
            // Check if user owns this gallery
            if (this.gallery.user_id !== this.currentUser.id) {
                container.innerHTML = this.getNoPermissionHTML();
                return;
            }
            
            container.innerHTML = this.getHTML();
            this.setupEventListeners(container);
            await this.loadGalleryMedia();
        } catch (error) {
            console.error('Failed to load gallery:', error);
            container.innerHTML = this.getErrorHTML();
        }
    }

    async loadGallery(id) {
        const response = await API.get(`/api/galleries/${id}`);
        
        if (!response.success) {
            throw new Error(response.message || 'Gallery not found');
        }
        
        this.gallery = response.data;
    }

    async loadGalleryMedia() {
        try {
            const response = await API.get(`/api/galleries/${this.gallery.id}/media`);
            
            if (response.success) {
                this.galleryMedia = response.data;
                this.updateMediaGrid();
            }
        } catch (error) {
            console.error('Failed to load gallery media:', error);
        }
    }

    getHTML() {
        return `
            <div class="gallery-edit-page">
                <div class="container py-4">
                    <!-- Header -->
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h2>
                                <i class="fas fa-edit me-2"></i>Edit Gallery
                            </h2>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="/gallery">Galleries</a></li>
                                    <li class="breadcrumb-item"><a href="/gallery/${this.gallery.id}">${this.gallery.title}</a></li>
                                    <li class="breadcrumb-item active">Edit</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-outline-secondary" id="preview-btn">
                                <i class="fas fa-eye me-1"></i>Preview
                            </button>
                            <button class="btn btn-success" id="save-btn" ${this.isLoading ? 'disabled' : ''}>
                                ${this.isLoading ? `
                                    <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                                    Saving...
                                ` : `
                                    <i class="fas fa-save me-1"></i>Save Changes
                                `}
                            </button>
                        </div>
                    </div>

                    <div class="row">
                        <!-- Gallery Settings -->
                        <div class="col-lg-4">
                            <div class="card mb-4">
                                <div class="card-header">
                                    <h6 class="mb-0">Gallery Settings</h6>
                                </div>
                                <div class="card-body">
                                    <div class="mb-3">
                                        <label for="gallery-title" class="form-label">Title</label>
                                        <input type="text" class="form-control" id="gallery-title" 
                                               value="${this.gallery.title}" maxlength="255" required>
                                    </div>

                                    <div class="mb-3">
                                        <label for="gallery-description" class="form-label">Description</label>
                                        <textarea class="form-control" id="gallery-description" rows="4" 
                                                  maxlength="1000">${this.gallery.description || ''}</textarea>
                                        <div class="form-text">
                                            <span id="description-count">${(this.gallery.description || '').length}</span>/1000 characters
                                        </div>
                                    </div>

                                    <div class="mb-3">
                                        <label for="gallery-type" class="form-label">Type</label>
                                        <select class="form-select" id="gallery-type">
                                            <option value="personal" ${this.gallery.type === 'personal' ? 'selected' : ''}>Personal</option>
                                            <option value="interview" ${this.gallery.type === 'interview' ? 'selected' : ''}>Interview</option>
                                            <option value="event" ${this.gallery.type === 'event' ? 'selected' : ''}>Event</option>
                                            <option value="business" ${this.gallery.type === 'business' ? 'selected' : ''}>Business</option>
                                        </select>
                                    </div>

                                    <div class="mb-3">
                                        <label for="gallery-visibility" class="form-label">Visibility</label>
                                        <select class="form-select" id="gallery-visibility">
                                            <option value="public" ${this.gallery.visibility === 'public' ? 'selected' : ''}>Public</option>
                                            <option value="unlisted" ${this.gallery.visibility === 'unlisted' ? 'selected' : ''}>Unlisted</option>
                                            <option value="private" ${this.gallery.visibility === 'private' ? 'selected' : ''}>Private</option>
                                        </select>
                                    </div>

                                    <div class="mb-3">
                                        <label for="sort-order" class="form-label">Sort Order</label>
                                        <select class="form-select" id="sort-order">
                                            <option value="date_desc" ${this.gallery.sort_order === 'date_desc' ? 'selected' : ''}>Newest First</option>
                                            <option value="date_asc" ${this.gallery.sort_order === 'date_asc' ? 'selected' : ''}>Oldest First</option>
                                            <option value="name_asc" ${this.gallery.sort_order === 'name_asc' ? 'selected' : ''}>Name A-Z</option>
                                            <option value="name_desc" ${this.gallery.sort_order === 'name_desc' ? 'selected' : ''}>Name Z-A</option>
                                            <option value="custom" ${this.gallery.sort_order === 'custom' ? 'selected' : ''}>Custom Order</option>
                                        </select>
                                    </div>

                                    <div class="mb-3">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="featured-gallery" 
                                                   ${this.gallery.featured ? 'checked' : ''}>
                                            <label class="form-check-label" for="featured-gallery">
                                                Featured Gallery
                                            </label>
                                        </div>
                                        <div class="form-text">Featured galleries appear prominently</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Gallery Statistics -->
                            <div class="card mb-4">
                                <div class="card-header">
                                    <h6 class="mb-0">Statistics</h6>
                                </div>
                                <div class="card-body">
                                    <div class="row text-center">
                                        <div class="col-6">
                                            <div class="stat-item">
                                                <div class="h5 mb-1 text-primary">${this.gallery.media_count || 0}</div>
                                                <small class="text-muted">Media Files</small>
                                            </div>
                                        </div>
                                        <div class="col-6">
                                            <div class="stat-item">
                                                <div class="h5 mb-1 text-success">${this.gallery.view_count || 0}</div>
                                                <small class="text-muted">Views</small>
                                            </div>
                                        </div>
                                    </div>
                                    <hr>
                                    <div class="row text-center">
                                        <div class="col-6">
                                            <div class="stat-item">
                                                <div class="h5 mb-1 text-warning">${this.gallery.like_count || 0}</div>
                                                <small class="text-muted">Likes</small>
                                            </div>
                                        </div>
                                        <div class="col-6">
                                            <div class="stat-item">
                                                <div class="h5 mb-1 text-info">${new Date(this.gallery.created_at).toLocaleDateString()}</div>
                                                <small class="text-muted">Created</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Danger Zone -->
                            <div class="card border-danger">
                                <div class="card-header bg-danger text-white">
                                    <h6 class="mb-0">Danger Zone</h6>
                                </div>
                                <div class="card-body">
                                    <p class="text-muted small mb-3">
                                        These actions cannot be undone. Please be careful.
                                    </p>
                                    <button class="btn btn-outline-danger btn-sm w-100" id="delete-gallery-btn">
                                        <i class="fas fa-trash me-1"></i>Delete Gallery
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Media Management -->
                        <div class="col-lg-8">
                            <div class="card">
                                <div class="card-header">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <h6 class="mb-0">Media Files</h6>
                                        <div class="d-flex gap-2">
                                            <button class="btn btn-sm btn-outline-primary" id="add-media-btn">
                                                <i class="fas fa-plus me-1"></i>Add Media
                                            </button>
                                            <button class="btn btn-sm btn-outline-secondary" id="bulk-actions-btn" disabled>
                                                <i class="fas fa-tasks me-1"></i>Bulk Actions
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div class="card-body">
                                    <div id="media-grid-container">
                                        ${this.getMediaGridHTML()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Add Media Modal -->
                <div class="modal fade" id="addMediaModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Add Media to Gallery</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="upload-area border-2 border-dashed rounded p-4 text-center" id="modal-upload-area">
                                    <input type="file" class="d-none" id="modal-file-input" 
                                           accept="image/*,video/*,audio/*" multiple>
                                    <i class="fas fa-cloud-upload-alt fa-3x text-muted mb-3"></i>
                                    <h6>Drag & Drop Files Here</h6>
                                    <p class="text-muted mb-3">
                                        Or <button type="button" class="btn btn-link p-0" id="modal-browse-btn">
                                            click to browse
                                        </button>
                                    </p>
                                    <small class="text-muted">
                                        Supported formats: JPG, PNG, GIF, MP4, MOV, MP3, WAV
                                    </small>
                                </div>
                                
                                <div id="modal-upload-progress" style="display: none;" class="mt-3">
                                    <div class="progress">
                                        <div class="progress-bar" role="progressbar" style="width: 0%"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Bulk Actions Modal -->
                <div class="modal fade" id="bulkActionsModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Bulk Actions</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <p>Select an action for <span id="selected-count">0</span> selected items:</p>
                                <div class="d-grid gap-2">
                                    <button class="btn btn-outline-primary" id="bulk-set-cover-btn">
                                        <i class="fas fa-image me-2"></i>Set as Cover
                                    </button>
                                    <button class="btn btn-outline-secondary" id="bulk-download-btn">
                                        <i class="fas fa-download me-2"></i>Download Selected
                                    </button>
                                    <button class="btn btn-outline-danger" id="bulk-delete-btn">
                                        <i class="fas fa-trash me-2"></i>Delete Selected
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getMediaGridHTML() {
        if (this.galleryMedia.length === 0) {
            return `
                <div class="text-center py-5">
                    <i class="fas fa-images fa-3x text-muted mb-3"></i>
                    <h6 class="text-muted">No media files yet</h6>
                    <p class="text-muted">Add some photos, videos, or audio files to get started</p>
                    <button class="btn btn-primary" id="add-first-media-btn">
                        <i class="fas fa-plus me-1"></i>Add Media
                    </button>
                </div>
            `;
        }

        return `
            <div class="media-grid" id="media-grid">
                ${this.galleryMedia.map((media, index) => this.getMediaItemHTML(media, index)).join('')}
            </div>
        `;
    }

    getMediaItemHTML(media, index) {
        return `
            <div class="media-item" data-media-id="${media.id}" data-index="${index}" draggable="true">
                <div class="media-item-card">
                    <div class="position-relative">
                        ${this.getMediaPreviewHTML(media)}

                        <div class="position-absolute top-0 start-0 m-2">
                            <input type="checkbox" class="form-check-input media-checkbox"
                                   data-media-id="${media.id}">
                        </div>

                        <div class="position-absolute top-0 end-0 m-2">
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-sm btn-light edit-media-btn"
                                        data-media-id="${media.id}" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-danger delete-media-btn"
                                        data-media-id="${media.id}" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>

                        ${media.is_cover ? `
                            <div class="position-absolute bottom-0 start-0 m-2">
                                <span class="badge bg-primary">Cover</span>
                            </div>
                        ` : ''}

                        <div class="position-absolute bottom-0 end-0 m-2">
                            <span class="badge bg-dark">${this.getMediaTypeIcon(media.type)}</span>
                        </div>
                    </div>

                    <div class="media-item-info p-2">
                        <h6 class="small mb-1" title="${media.title || media.filename}">
                            ${(media.title || media.filename).length > 25 ?
                                (media.title || media.filename).substring(0, 25) + '...' :
                                (media.title || media.filename)}
                        </h6>
                        <small class="text-muted">
                            ${this.formatFileSize(media.file_size)}
                            ${media.width && media.height ? ` • ${media.width}×${media.height}` : ''}
                        </small>
                    </div>
                </div>
            </div>
        `;
    }

    getMediaPreviewHTML(media) {
        if (media.type === 'image') {
            return `
                <img src="${media.thumbnail_url || media.url}"
                     alt="${media.title || media.filename}"
                     class="media-preview"
                     style="width: 100%; height: 150px; object-fit: cover;">
            `;
        } else if (media.type === 'video') {
            return `
                <div class="video-preview position-relative" style="height: 150px; background: #000;">
                    ${media.thumbnail_url ? `
                        <img src="${media.thumbnail_url}"
                             alt="${media.title || media.filename}"
                             class="w-100 h-100"
                             style="object-fit: cover;">
                    ` : `
                        <div class="d-flex align-items-center justify-content-center h-100">
                            <i class="fas fa-video fa-2x text-white"></i>
                        </div>
                    `}
                    <div class="position-absolute top-50 start-50 translate-middle">
                        <i class="fas fa-play-circle fa-2x text-white opacity-75"></i>
                    </div>
                    ${media.duration ? `
                        <div class="position-absolute bottom-0 end-0 m-2">
                            <span class="badge bg-dark">${this.formatDuration(media.duration)}</span>
                        </div>
                    ` : ''}
                </div>
            `;
        } else if (media.type === 'audio') {
            return `
                <div class="audio-preview d-flex align-items-center justify-content-center bg-dark text-white"
                     style="height: 150px;">
                    <div class="text-center">
                        <i class="fas fa-music fa-3x mb-2"></i>
                        <div class="small">Audio File</div>
                        ${media.duration ? `
                            <div class="small">${this.formatDuration(media.duration)}</div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
    }

    getMediaTypeIcon(type) {
        const icons = {
            'image': '<i class="fas fa-image"></i>',
            'video': '<i class="fas fa-video"></i>',
            'audio': '<i class="fas fa-music"></i>'
        };
        return icons[type] || '<i class="fas fa-file"></i>';
    }

    getNoPermissionHTML() {
        return `
            <div class="container py-5">
                <div class="text-center">
                    <i class="fas fa-lock fa-3x text-muted mb-3"></i>
                    <h3 class="text-muted">Access Denied</h3>
                    <p class="text-muted">You don't have permission to edit this gallery.</p>
                    <a href="/gallery" class="btn btn-primary">Back to Galleries</a>
                </div>
            </div>
        `;
    }

    getErrorHTML() {
        return `
            <div class="container py-5">
                <div class="text-center">
                    <i class="fas fa-exclamation-triangle fa-3x text-muted mb-3"></i>
                    <h3 class="text-muted">Gallery Not Found</h3>
                    <p class="text-muted">The gallery you're looking for doesn't exist or has been deleted.</p>
                    <a href="/gallery" class="btn btn-primary">Back to Galleries</a>
                </div>
            </div>
        `;
    }

    setupEventListeners(container) {
        // Form inputs
        this.setupFormInputs(container);

        // Action buttons
        this.setupActionButtons(container);

        // Media management
        this.setupMediaManagement(container);

        // Drag and drop
        this.setupDragAndDrop(container);
    }

    setupFormInputs(container) {
        // Track changes
        const inputs = container.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                this.hasChanges = true;
                this.updateSaveButton();
            });
        });

        // Description character counter
        const descInput = container.querySelector('#gallery-description');
        if (descInput) {
            descInput.addEventListener('input', (e) => {
                const counter = container.querySelector('#description-count');
                if (counter) {
                    counter.textContent = e.target.value.length;
                }
            });
        }
    }

    setupActionButtons(container) {
        // Save button
        const saveBtn = container.querySelector('#save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveChanges());
        }

        // Preview button
        const previewBtn = container.querySelector('#preview-btn');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                window.open(`/gallery/${this.gallery.id}`, '_blank');
            });
        }

        // Delete gallery button
        const deleteBtn = container.querySelector('#delete-gallery-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteGallery());
        }

        // Add media buttons
        const addMediaBtn = container.querySelector('#add-media-btn');
        const addFirstMediaBtn = container.querySelector('#add-first-media-btn');

        if (addMediaBtn) {
            addMediaBtn.addEventListener('click', () => this.showAddMediaModal());
        }

        if (addFirstMediaBtn) {
            addFirstMediaBtn.addEventListener('click', () => this.showAddMediaModal());
        }

        // Bulk actions button
        const bulkActionsBtn = container.querySelector('#bulk-actions-btn');
        if (bulkActionsBtn) {
            bulkActionsBtn.addEventListener('click', () => this.showBulkActionsModal());
        }
    }

    setupMediaManagement(container) {
        // Media checkboxes
        container.addEventListener('change', (e) => {
            if (e.target.classList.contains('media-checkbox')) {
                this.updateBulkActionsButton();
            }
        });

        // Media action buttons
        container.addEventListener('click', (e) => {
            if (e.target.closest('.edit-media-btn')) {
                const mediaId = e.target.closest('.edit-media-btn').dataset.mediaId;
                this.editMedia(mediaId);
            }

            if (e.target.closest('.delete-media-btn')) {
                const mediaId = e.target.closest('.delete-media-btn').dataset.mediaId;
                this.deleteMedia(mediaId);
            }
        });

        // Modal upload functionality
        this.setupModalUpload(container);
    }

    setupModalUpload(container) {
        const modalUploadArea = container.querySelector('#modal-upload-area');
        const modalFileInput = container.querySelector('#modal-file-input');
        const modalBrowseBtn = container.querySelector('#modal-browse-btn');

        if (!modalUploadArea || !modalFileInput) return;

        // Browse button
        if (modalBrowseBtn) {
            modalBrowseBtn.addEventListener('click', () => modalFileInput.click());
        }

        // File input change
        modalFileInput.addEventListener('change', (e) => {
            this.handleModalUpload(Array.from(e.target.files));
        });

        // Drag and drop
        modalUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            modalUploadArea.classList.add('border-primary', 'bg-light');
        });

        modalUploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            modalUploadArea.classList.remove('border-primary', 'bg-light');
        });

        modalUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            modalUploadArea.classList.remove('border-primary', 'bg-light');

            const files = Array.from(e.dataTransfer.files);
            this.handleModalUpload(files);
        });
    }

    setupDragAndDrop(container) {
        const mediaGrid = container.querySelector('#media-grid');
        if (!mediaGrid) return;

        mediaGrid.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('media-item')) {
                this.draggedItem = e.target;
                e.target.style.opacity = '0.5';
            }
        });

        mediaGrid.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('media-item')) {
                e.target.style.opacity = '1';
                this.draggedItem = null;
            }
        });

        mediaGrid.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        mediaGrid.addEventListener('drop', (e) => {
            e.preventDefault();

            if (this.draggedItem && e.target.closest('.media-item')) {
                const targetItem = e.target.closest('.media-item');
                if (targetItem !== this.draggedItem) {
                    this.reorderMedia(this.draggedItem, targetItem);
                }
            }
        });
    }

    async handleModalUpload(files) {
        // Implementation similar to GalleryCreatePage
        // Upload files and add them to the gallery
        console.log('Uploading files:', files);

        // Close modal after upload
        const modal = bootstrap.Modal.getInstance(document.getElementById('addMediaModal'));
        if (modal) {
            modal.hide();
        }

        // Reload media grid
        await this.loadGalleryMedia();
    }

    async saveChanges() {
        if (!this.hasChanges) return;

        try {
            this.isLoading = true;
            this.updateSaveButton();

            const formData = {
                title: document.getElementById('gallery-title').value,
                description: document.getElementById('gallery-description').value,
                type: document.getElementById('gallery-type').value,
                visibility: document.getElementById('gallery-visibility').value,
                sort_order: document.getElementById('sort-order').value,
                featured: document.getElementById('featured-gallery').checked
            };

            const response = await API.updateGallery(this.gallery.id, formData);

            if (response.success) {
                this.gallery = { ...this.gallery, ...formData };
                this.hasChanges = false;
                this.showAlert('success', 'Gallery updated successfully!');
            } else {
                throw new Error(response.message || 'Failed to update gallery');
            }

        } catch (error) {
            console.error('Save failed:', error);
            this.showAlert('error', 'Failed to save changes. Please try again.');
        } finally {
            this.isLoading = false;
            this.updateSaveButton();
        }
    }

    async deleteGallery() {
        if (!confirm('Are you sure you want to delete this gallery? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await API.deleteGallery(this.gallery.id);

            if (response.success) {
                this.showAlert('success', 'Gallery deleted successfully!');
                setTimeout(() => {
                    window.location.href = '/gallery';
                }, 1500);
            } else {
                throw new Error(response.message || 'Failed to delete gallery');
            }

        } catch (error) {
            console.error('Delete failed:', error);
            this.showAlert('error', 'Failed to delete gallery. Please try again.');
        }
    }

    updateSaveButton() {
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.disabled = this.isLoading || !this.hasChanges;

            if (this.isLoading) {
                saveBtn.innerHTML = `
                    <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                    Saving...
                `;
            } else {
                saveBtn.innerHTML = `
                    <i class="fas fa-save me-1"></i>Save Changes
                `;
            }
        }
    }

    updateBulkActionsButton() {
        const checkboxes = document.querySelectorAll('.media-checkbox:checked');
        const bulkBtn = document.getElementById('bulk-actions-btn');

        if (bulkBtn) {
            bulkBtn.disabled = checkboxes.length === 0;
            bulkBtn.innerHTML = checkboxes.length > 0 ?
                `<i class="fas fa-tasks me-1"></i>Bulk Actions (${checkboxes.length})` :
                '<i class="fas fa-tasks me-1"></i>Bulk Actions';
        }
    }

    updateMediaGrid() {
        const container = document.getElementById('media-grid-container');
        if (container) {
            container.innerHTML = this.getMediaGridHTML();
        }
    }

    showAddMediaModal() {
        const modal = new bootstrap.Modal(document.getElementById('addMediaModal'));
        modal.show();
    }

    showBulkActionsModal() {
        const checkboxes = document.querySelectorAll('.media-checkbox:checked');
        const selectedCount = document.getElementById('selected-count');

        if (selectedCount) {
            selectedCount.textContent = checkboxes.length;
        }

        const modal = new bootstrap.Modal(document.getElementById('bulkActionsModal'));
        modal.show();
    }

    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    formatFileSize(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';

        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    showAlert(type, message) {
        const alertHtml = `
            <div class="alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        const container = document.querySelector('.gallery-edit-page .container');
        container.insertAdjacentHTML('afterbegin', alertHtml);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            const alert = container.querySelector('.alert');
            if (alert) {
                alert.remove();
            }
        }, 5000);
    }

    // Placeholder methods for media management
    editMedia(mediaId) {
        console.log('Edit media:', mediaId);
    }

    deleteMedia(mediaId) {
        console.log('Delete media:', mediaId);
    }

    reorderMedia(draggedItem, targetItem) {
        console.log('Reorder media:', draggedItem, targetItem);
    }
}
