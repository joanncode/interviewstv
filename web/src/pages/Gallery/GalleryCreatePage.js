import API from '../../services/api.js';
import Auth from '../../services/auth.js';

export default class GalleryCreatePage {
    constructor() {
        this.currentUser = Auth.getCurrentUser();
        this.isLoading = false;
        this.currentStep = 1;
        this.totalSteps = 3;
        this.formData = {
            title: '',
            description: '',
            type: 'personal',
            visibility: 'public',
            sort_order: 'date_desc',
            cover_image: null
        };
        this.uploadedFiles = [];
        this.uploadQueue = [];
        this.isUploading = false;
        this.uploadProgress = {};
    }

    async render(container) {
        if (!this.currentUser) {
            window.location.href = '/login';
            return;
        }

        container.innerHTML = this.getHTML();
        this.setupEventListeners(container);
    }

    getHTML() {
        return `
            <div class="gallery-create-page">
                <div class="container py-4">
                    <div class="row justify-content-center">
                        <div class="col-lg-8">
                            <div class="card shadow">
                                <div class="card-header bg-dark text-white">
                                    <h3 class="mb-0">
                                        <i class="fas fa-images me-2"></i>Create New Gallery
                                    </h3>
                                    ${this.getProgressBarHTML()}
                                </div>
                                <div class="card-body">
                                    ${this.getStepContentHTML()}
                                </div>
                                <div class="card-footer">
                                    ${this.getNavigationButtonsHTML()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getProgressBarHTML() {
        const progress = (this.currentStep / this.totalSteps) * 100;
        return `
            <div class="progress mt-3" style="height: 6px;">
                <div class="progress-bar bg-danger" role="progressbar" 
                     style="width: ${progress}%" 
                     aria-valuenow="${progress}" 
                     aria-valuemin="0" 
                     aria-valuemax="100">
                </div>
            </div>
            <div class="d-flex justify-content-between mt-2 small">
                <span class="${this.currentStep >= 1 ? 'text-white' : 'text-muted'}">Gallery Info</span>
                <span class="${this.currentStep >= 2 ? 'text-white' : 'text-muted'}">Upload Media</span>
                <span class="${this.currentStep >= 3 ? 'text-white' : 'text-muted'}">Review</span>
            </div>
        `;
    }

    getStepContentHTML() {
        switch (this.currentStep) {
            case 1:
                return this.getGalleryInfoStepHTML();
            case 2:
                return this.getUploadStepHTML();
            case 3:
                return this.getReviewStepHTML();
            default:
                return this.getGalleryInfoStepHTML();
        }
    }

    getGalleryInfoStepHTML() {
        return `
            <div class="step-content" id="step-1">
                <h5 class="mb-4">Gallery Information</h5>
                
                <div class="mb-3">
                    <label for="gallery-title" class="form-label">
                        Gallery Title <span class="text-danger">*</span>
                    </label>
                    <input type="text" class="form-control" id="gallery-title" 
                           value="${this.formData.title}" 
                           placeholder="Enter a descriptive gallery title"
                           maxlength="255" required>
                    <div class="form-text">Choose a title that describes your gallery content</div>
                </div>

                <div class="mb-3">
                    <label for="gallery-description" class="form-label">Description</label>
                    <textarea class="form-control" id="gallery-description" rows="4" 
                              placeholder="Describe what this gallery contains..."
                              maxlength="1000">${this.formData.description}</textarea>
                    <div class="form-text">
                        <span id="description-count">${this.formData.description.length}</span>/1000 characters
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-6">
                        <label for="gallery-type" class="form-label">
                            Gallery Type <span class="text-danger">*</span>
                        </label>
                        <select class="form-select" id="gallery-type" required>
                            <option value="personal" ${this.formData.type === 'personal' ? 'selected' : ''}>
                                Personal Gallery
                            </option>
                            <option value="interview" ${this.formData.type === 'interview' ? 'selected' : ''}>
                                Interview Gallery
                            </option>
                            <option value="event" ${this.formData.type === 'event' ? 'selected' : ''}>
                                Event Gallery
                            </option>
                            <option value="business" ${this.formData.type === 'business' ? 'selected' : ''}>
                                Business Gallery
                            </option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label for="gallery-visibility" class="form-label">Visibility</label>
                        <select class="form-select" id="gallery-visibility">
                            <option value="public" ${this.formData.visibility === 'public' ? 'selected' : ''}>
                                Public - Anyone can view
                            </option>
                            <option value="unlisted" ${this.formData.visibility === 'unlisted' ? 'selected' : ''}>
                                Unlisted - Only with link
                            </option>
                            <option value="private" ${this.formData.visibility === 'private' ? 'selected' : ''}>
                                Private - Only you
                            </option>
                        </select>
                    </div>
                </div>

                <div class="mt-3">
                    <label for="sort-order" class="form-label">Default Sort Order</label>
                    <select class="form-select" id="sort-order">
                        <option value="date_desc" ${this.formData.sort_order === 'date_desc' ? 'selected' : ''}>
                            Newest First
                        </option>
                        <option value="date_asc" ${this.formData.sort_order === 'date_asc' ? 'selected' : ''}>
                            Oldest First
                        </option>
                        <option value="name_asc" ${this.formData.sort_order === 'name_asc' ? 'selected' : ''}>
                            Name A-Z
                        </option>
                        <option value="name_desc" ${this.formData.sort_order === 'name_desc' ? 'selected' : ''}>
                            Name Z-A
                        </option>
                        <option value="custom" ${this.formData.sort_order === 'custom' ? 'selected' : ''}>
                            Custom Order
                        </option>
                    </select>
                </div>
            </div>
        `;
    }

    getUploadStepHTML() {
        return `
            <div class="step-content" id="step-2">
                <h5 class="mb-4">Upload Media</h5>
                
                <!-- Drag and Drop Upload Area -->
                <div class="upload-area border-2 border-dashed rounded p-5 text-center mb-4" 
                     id="upload-area">
                    <input type="file" class="d-none" id="file-input" 
                           accept="image/*,video/*,audio/*" multiple>
                    
                    <div class="upload-content" id="upload-content">
                        <i class="fas fa-cloud-upload-alt fa-4x text-muted mb-3"></i>
                        <h5>Drag & Drop Files Here</h5>
                        <p class="text-muted mb-3">
                            Or <button type="button" class="btn btn-link p-0" id="browse-files-btn">
                                click to browse
                            </button>
                        </p>
                        <small class="text-muted">
                            Supported formats: JPG, PNG, GIF, MP4, MOV, MP3, WAV<br>
                            Maximum file size: 100MB per file
                        </small>
                    </div>
                </div>

                <!-- Upload Progress -->
                <div id="upload-progress-container" style="display: none;">
                    <h6 class="mb-3">Upload Progress</h6>
                    <div id="upload-progress-list">
                        <!-- Progress items will be added here -->
                    </div>
                </div>

                <!-- Uploaded Files Preview -->
                <div id="uploaded-files-container" style="display: ${this.uploadedFiles.length > 0 ? 'block' : 'none'};">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h6 class="mb-0">Uploaded Files (${this.uploadedFiles.length})</h6>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-secondary" id="select-all-btn">
                                <i class="fas fa-check-square me-1"></i>Select All
                            </button>
                            <button class="btn btn-outline-danger" id="remove-selected-btn" disabled>
                                <i class="fas fa-trash me-1"></i>Remove Selected
                            </button>
                        </div>
                    </div>
                    
                    <div class="row g-3" id="uploaded-files-grid">
                        ${this.getUploadedFilesHTML()}
                    </div>
                </div>

                <!-- Upload Tips -->
                <div class="alert alert-info mt-4">
                    <h6 class="alert-heading">
                        <i class="fas fa-lightbulb me-2"></i>Upload Tips
                    </h6>
                    <ul class="mb-0 small">
                        <li>You can upload multiple files at once by selecting them or dragging them together</li>
                        <li>Images will be automatically optimized for web viewing</li>
                        <li>Videos will be processed to generate thumbnails</li>
                        <li>You can reorder files by dragging them in the next step</li>
                    </ul>
                </div>
            </div>
        `;
    }

    getUploadedFilesHTML() {
        return this.uploadedFiles.map((file, index) => `
            <div class="col-md-4 col-lg-3">
                <div class="card file-preview-card" data-file-index="${index}">
                    <div class="position-relative">
                        ${this.getFilePreviewHTML(file)}
                        
                        <div class="position-absolute top-0 start-0 m-2">
                            <input type="checkbox" class="form-check-input file-checkbox" 
                                   data-file-index="${index}">
                        </div>
                        
                        <div class="position-absolute top-0 end-0 m-2">
                            <button class="btn btn-sm btn-danger remove-file-btn" 
                                    data-file-index="${index}" title="Remove">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        ${file.type.startsWith('video/') && file.duration ? `
                            <div class="position-absolute bottom-0 end-0 m-2">
                                <span class="badge bg-dark">${this.formatDuration(file.duration)}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="card-body p-2">
                        <h6 class="card-title small mb-1" title="${file.name}">
                            ${file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name}
                        </h6>
                        <small class="text-muted">
                            ${this.formatFileSize(file.size)}
                            ${file.width && file.height ? ` • ${file.width}×${file.height}` : ''}
                        </small>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getFilePreviewHTML(file) {
        if (file.type.startsWith('image/')) {
            return `
                <img src="${file.preview || file.url}" 
                     alt="${file.name}" 
                     class="card-img-top" 
                     style="height: 150px; object-fit: cover;">
            `;
        } else if (file.type.startsWith('video/')) {
            return `
                <div class="video-preview position-relative" style="height: 150px; background: #000;">
                    ${file.thumbnail ? `
                        <img src="${file.thumbnail}" 
                             alt="${file.name}" 
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
                </div>
            `;
        } else if (file.type.startsWith('audio/')) {
            return `
                <div class="audio-preview d-flex align-items-center justify-content-center bg-dark text-white" 
                     style="height: 150px;">
                    <div class="text-center">
                        <i class="fas fa-music fa-3x mb-2"></i>
                        <div class="small">Audio File</div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="file-preview d-flex align-items-center justify-content-center bg-light" 
                     style="height: 150px;">
                    <div class="text-center">
                        <i class="fas fa-file fa-3x text-muted mb-2"></i>
                        <div class="small text-muted">Unknown Format</div>
                    </div>
                </div>
            `;
        }
    }

    getReviewStepHTML() {
        return `
            <div class="step-content" id="step-3">
                <h5 class="mb-4">Review & Create Gallery</h5>

                <div class="row">
                    <div class="col-md-8">
                        <div class="gallery-preview">
                            <h6 class="fw-bold">${this.formData.title || 'Untitled Gallery'}</h6>
                            <p class="text-muted">${this.formData.description || 'No description provided'}</p>

                            <div class="d-flex gap-3 mb-3">
                                <span class="badge bg-primary">${this.formData.type}</span>
                                <span class="badge bg-secondary">${this.formData.visibility}</span>
                                <span class="badge bg-info">${this.uploadedFiles.length} files</span>
                            </div>

                            ${this.uploadedFiles.length > 0 ? `
                                <div class="preview-grid">
                                    <h6 class="small fw-bold text-muted mb-2">MEDIA PREVIEW</h6>
                                    <div class="row g-2">
                                        ${this.uploadedFiles.slice(0, 6).map(file => `
                                            <div class="col-4">
                                                <div class="preview-thumbnail">
                                                    ${this.getFilePreviewHTML(file)}
                                                </div>
                                            </div>
                                        `).join('')}
                                        ${this.uploadedFiles.length > 6 ? `
                                            <div class="col-4">
                                                <div class="d-flex align-items-center justify-content-center bg-light rounded"
                                                     style="height: 80px;">
                                                    <span class="text-muted">+${this.uploadedFiles.length - 6} more</span>
                                                </div>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            ` : `
                                <div class="alert alert-warning">
                                    <i class="fas fa-exclamation-triangle me-2"></i>
                                    No media files uploaded yet. You can add files later.
                                </div>
                            `}
                        </div>
                    </div>

                    <div class="col-md-4">
                        <div class="creation-options">
                            <h6 class="fw-bold mb-3">Creation Options</h6>

                            <div class="mb-3">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="set-cover-auto" checked>
                                    <label class="form-check-label" for="set-cover-auto">
                                        Auto-select cover image
                                    </label>
                                </div>
                                <div class="form-text">
                                    Use the first image as gallery cover
                                </div>
                            </div>

                            <div class="mb-3">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="process-media" checked>
                                    <label class="form-check-label" for="process-media">
                                        Process media files
                                    </label>
                                </div>
                                <div class="form-text">
                                    Generate thumbnails and optimize files
                                </div>
                            </div>

                            <div class="alert alert-info small">
                                <i class="fas fa-info-circle me-2"></i>
                                Once created, you can add more files, reorder them, and edit gallery settings.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getNavigationButtonsHTML() {
        return `
            <div class="d-flex justify-content-between">
                <button class="btn btn-outline-secondary" id="prev-step-btn"
                        ${this.currentStep === 1 ? 'disabled' : ''}>
                    <i class="fas fa-arrow-left me-1"></i>Previous
                </button>

                <div class="step-indicator">
                    Step ${this.currentStep} of ${this.totalSteps}
                </div>

                ${this.currentStep === this.totalSteps ? `
                    <button class="btn btn-success" id="create-gallery-btn" ${this.isLoading ? 'disabled' : ''}>
                        ${this.isLoading ? `
                            <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                            Creating...
                        ` : `
                            <i class="fas fa-check me-1"></i>Create Gallery
                        `}
                    </button>
                ` : `
                    <button class="btn btn-primary" id="next-step-btn">
                        Next<i class="fas fa-arrow-right ms-1"></i>
                    </button>
                `}
            </div>
        `;
    }

    setupEventListeners(container) {
        // Step navigation
        const prevBtn = container.querySelector('#prev-step-btn');
        const nextBtn = container.querySelector('#next-step-btn');
        const createBtn = container.querySelector('#create-gallery-btn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousStep());
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextStep());
        }

        if (createBtn) {
            createBtn.addEventListener('click', () => this.createGallery());
        }

        // Form inputs
        this.setupFormInputs(container);

        // File upload
        this.setupFileUpload(container);

        // File management
        this.setupFileManagement(container);
    }

    setupFormInputs(container) {
        // Gallery title
        const titleInput = container.querySelector('#gallery-title');
        if (titleInput) {
            titleInput.addEventListener('input', (e) => {
                this.formData.title = e.target.value;
            });
        }

        // Gallery description
        const descInput = container.querySelector('#gallery-description');
        if (descInput) {
            descInput.addEventListener('input', (e) => {
                this.formData.description = e.target.value;
                const counter = container.querySelector('#description-count');
                if (counter) {
                    counter.textContent = e.target.value.length;
                }
            });
        }

        // Gallery type
        const typeSelect = container.querySelector('#gallery-type');
        if (typeSelect) {
            typeSelect.addEventListener('change', (e) => {
                this.formData.type = e.target.value;
            });
        }

        // Gallery visibility
        const visibilitySelect = container.querySelector('#gallery-visibility');
        if (visibilitySelect) {
            visibilitySelect.addEventListener('change', (e) => {
                this.formData.visibility = e.target.value;
            });
        }

        // Sort order
        const sortSelect = container.querySelector('#sort-order');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.formData.sort_order = e.target.value;
            });
        }
    }

    setupFileUpload(container) {
        const uploadArea = container.querySelector('#upload-area');
        const fileInput = container.querySelector('#file-input');
        const browseBtn = container.querySelector('#browse-files-btn');

        if (!uploadArea || !fileInput) return;

        // Browse files button
        if (browseBtn) {
            browseBtn.addEventListener('click', () => fileInput.click());
        }

        // File input change
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(Array.from(e.target.files));
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('border-primary', 'bg-light');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('border-primary', 'bg-light');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('border-primary', 'bg-light');

            const files = Array.from(e.dataTransfer.files);
            this.handleFiles(files);
        });

        // Click to upload
        uploadArea.addEventListener('click', (e) => {
            if (e.target === uploadArea || e.target.closest('#upload-content')) {
                fileInput.click();
            }
        });
    }

    setupFileManagement(container) {
        // Select all button
        const selectAllBtn = container.querySelector('#select-all-btn');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => this.toggleSelectAll());
        }

        // Remove selected button
        const removeSelectedBtn = container.querySelector('#remove-selected-btn');
        if (removeSelectedBtn) {
            removeSelectedBtn.addEventListener('click', () => this.removeSelectedFiles());
        }

        // Individual file checkboxes and remove buttons
        container.addEventListener('change', (e) => {
            if (e.target.classList.contains('file-checkbox')) {
                this.updateRemoveSelectedButton();
            }
        });

        container.addEventListener('click', (e) => {
            if (e.target.closest('.remove-file-btn')) {
                const index = parseInt(e.target.closest('.remove-file-btn').dataset.fileIndex);
                this.removeFile(index);
            }
        });
    }

    async handleFiles(files) {
        const validFiles = files.filter(file => this.validateFile(file));

        if (validFiles.length === 0) {
            this.showAlert('warning', 'No valid files selected');
            return;
        }

        // Add files to upload queue
        for (const file of validFiles) {
            const fileData = {
                file: file,
                name: file.name,
                size: file.size,
                type: file.type,
                preview: null,
                url: null,
                thumbnail: null,
                width: null,
                height: null,
                duration: null,
                uploadProgress: 0,
                uploaded: false
            };

            // Generate preview for images
            if (file.type.startsWith('image/')) {
                fileData.preview = await this.generateImagePreview(file);
                const dimensions = await this.getImageDimensions(fileData.preview);
                fileData.width = dimensions.width;
                fileData.height = dimensions.height;
            }

            this.uploadQueue.push(fileData);
        }

        // Start upload process
        await this.processUploadQueue();
    }

    validateFile(file) {
        const maxSize = 100 * 1024 * 1024; // 100MB
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/webm', 'video/mov', 'video/avi',
            'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg'
        ];

        if (file.size > maxSize) {
            this.showAlert('error', `File "${file.name}" is too large. Maximum size is 100MB.`);
            return false;
        }

        if (!allowedTypes.includes(file.type)) {
            this.showAlert('error', `File "${file.name}" has an unsupported format.`);
            return false;
        }

        return true;
    }

    async generateImagePreview(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }

    async getImageDimensions(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.width, height: img.height });
            img.src = src;
        });
    }

    async processUploadQueue() {
        if (this.isUploading || this.uploadQueue.length === 0) return;

        this.isUploading = true;
        this.showUploadProgress();

        for (const fileData of this.uploadQueue) {
            try {
                await this.uploadFile(fileData);
                this.uploadedFiles.push(fileData);
            } catch (error) {
                console.error('Upload failed:', error);
                this.showAlert('error', `Failed to upload "${fileData.name}"`);
            }
        }

        this.uploadQueue = [];
        this.isUploading = false;
        this.hideUploadProgress();
        this.updateUploadedFilesDisplay();
    }

    async uploadFile(fileData) {
        const formData = new FormData();
        formData.append('file', fileData.file);
        formData.append('type', 'gallery');

        try {
            const response = await API.uploadMedia(formData);

            if (response.success) {
                fileData.url = response.data.url;
                fileData.thumbnail = response.data.processed?.thumbnail;
                fileData.uploaded = true;

                // Update metadata from server response
                if (response.data.processed?.metadata) {
                    const metadata = response.data.processed.metadata;
                    fileData.width = metadata.width;
                    fileData.height = metadata.height;
                    fileData.duration = metadata.duration;
                }
            } else {
                throw new Error(response.message || 'Upload failed');
            }
        } catch (error) {
            throw error;
        }
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

    showUploadProgress() {
        const container = document.getElementById('upload-progress-container');
        if (container) {
            container.style.display = 'block';
        }
    }

    hideUploadProgress() {
        const container = document.getElementById('upload-progress-container');
        if (container) {
            container.style.display = 'none';
        }
    }

    updateUploadedFilesDisplay() {
        const container = document.getElementById('uploaded-files-container');
        const grid = document.getElementById('uploaded-files-grid');

        if (container && grid) {
            container.style.display = this.uploadedFiles.length > 0 ? 'block' : 'none';
            grid.innerHTML = this.getUploadedFilesHTML();

            // Update file count
            const countElement = container.querySelector('h6');
            if (countElement) {
                countElement.textContent = `Uploaded Files (${this.uploadedFiles.length})`;
            }
        }
    }

    toggleSelectAll() {
        const checkboxes = document.querySelectorAll('.file-checkbox');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);

        checkboxes.forEach(cb => {
            cb.checked = !allChecked;
        });

        this.updateRemoveSelectedButton();
    }

    updateRemoveSelectedButton() {
        const checkboxes = document.querySelectorAll('.file-checkbox');
        const selectedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        const removeBtn = document.getElementById('remove-selected-btn');

        if (removeBtn) {
            removeBtn.disabled = selectedCount === 0;
            removeBtn.innerHTML = selectedCount > 0 ?
                `<i class="fas fa-trash me-1"></i>Remove Selected (${selectedCount})` :
                '<i class="fas fa-trash me-1"></i>Remove Selected';
        }
    }

    removeSelectedFiles() {
        const checkboxes = document.querySelectorAll('.file-checkbox:checked');
        const indicesToRemove = Array.from(checkboxes)
            .map(cb => parseInt(cb.dataset.fileIndex))
            .sort((a, b) => b - a); // Remove from highest index to lowest

        indicesToRemove.forEach(index => {
            this.uploadedFiles.splice(index, 1);
        });

        this.updateUploadedFilesDisplay();
    }

    removeFile(index) {
        this.uploadedFiles.splice(index, 1);
        this.updateUploadedFilesDisplay();
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepDisplay();
        }
    }

    nextStep() {
        if (this.validateCurrentStep()) {
            this.currentStep++;
            this.updateStepDisplay();
        }
    }

    validateCurrentStep() {
        switch (this.currentStep) {
            case 1:
                if (!this.formData.title.trim()) {
                    this.showAlert('error', 'Gallery title is required');
                    return false;
                }
                return true;
            case 2:
                // Files are optional, so always valid
                return true;
            default:
                return true;
        }
    }

    updateStepDisplay() {
        const container = document.querySelector('.gallery-create-page .card-body');
        if (container) {
            container.innerHTML = this.getStepContentHTML();
            this.setupEventListeners(document.querySelector('.gallery-create-page'));
        }

        const footer = document.querySelector('.gallery-create-page .card-footer');
        if (footer) {
            footer.innerHTML = this.getNavigationButtonsHTML();
            this.setupEventListeners(document.querySelector('.gallery-create-page'));
        }

        const header = document.querySelector('.gallery-create-page .card-header');
        if (header) {
            const progressSection = header.querySelector('.progress').parentElement;
            progressSection.innerHTML = this.getProgressBarHTML();
        }
    }

    async createGallery() {
        if (!this.validateCurrentStep()) return;

        try {
            this.isLoading = true;
            this.updateStepDisplay();

            // Prepare gallery data
            const galleryData = {
                ...this.formData,
                media_files: this.uploadedFiles.map(file => ({
                    url: file.url,
                    type: file.type.split('/')[0], // image, video, audio
                    filename: file.name,
                    mime_type: file.type,
                    file_size: file.size,
                    width: file.width,
                    height: file.height,
                    duration: file.duration,
                    thumbnail_url: file.thumbnail
                }))
            };

            // Set cover image if auto-select is enabled
            const autoCover = document.getElementById('set-cover-auto');
            if (autoCover && autoCover.checked && this.uploadedFiles.length > 0) {
                const firstImage = this.uploadedFiles.find(f => f.type.startsWith('image/'));
                if (firstImage) {
                    galleryData.cover_image_url = firstImage.url;
                }
            }

            const response = await API.createGallery(galleryData);

            if (response.success) {
                this.showAlert('success', 'Gallery created successfully!');

                // Redirect to the new gallery
                setTimeout(() => {
                    window.location.href = `/galleries/${response.data.id}`;
                }, 1500);
            } else {
                throw new Error(response.message || 'Failed to create gallery');
            }

        } catch (error) {
            console.error('Gallery creation failed:', error);
            this.showAlert('error', 'Failed to create gallery. Please try again.');
        } finally {
            this.isLoading = false;
            this.updateStepDisplay();
        }
    }

    showAlert(type, message) {
        const alertHtml = `
            <div class="alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        const container = document.querySelector('.gallery-create-page .container');
        container.insertAdjacentHTML('afterbegin', alertHtml);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            const alert = container.querySelector('.alert');
            if (alert) {
                alert.remove();
            }
        }, 5000);
    }
}
