import Auth from '../../services/auth.js';
import API from '../../services/api.js';
import Router from '../../utils/router.js';
import Comments from '../../components/Comments.js';

class GalleryViewPage {
    constructor() {
        this.gallery = null;
        this.currentUser = Auth.getCurrentUser();
        this.isLoading = false;
        this.fancyboxInitialized = false;
        this.commentsComponent = null;
    }

    async render(container, props = {}) {
        const galleryId = props.params?.id;
        
        if (!galleryId) {
            Router.navigate('/gallery');
            return;
        }

        container.innerHTML = this.getLoadingHTML();
        
        try {
            await this.loadGallery(galleryId);
            container.innerHTML = this.getHTML();
            this.setupEventListeners(container);
            await this.initializeFancybox();
            this.initializeComments(container);
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

    async initializeFancybox() {
        if (this.fancyboxInitialized) return;

        try {
            // Load Fancybox CSS and JS dynamically
            await this.loadFancyboxAssets();
            
            // Initialize Fancybox with custom options (no top tools as requested)
            if (window.Fancybox) {
                window.Fancybox.bind('[data-fancybox="gallery"]', {
                    // Disable top toolbar as requested
                    Toolbar: {
                        display: {
                            left: [],
                            middle: [],
                            right: []
                        }
                    },
                    // Custom UI configuration
                    UI: {
                        closeButton: "inside",
                        parentEl: "body"
                    },
                    // Image settings
                    Images: {
                        zoom: true,
                        protected: false
                    },
                    // Thumbs configuration
                    Thumbs: {
                        showOnStart: false,
                        hideOnClose: true
                    },
                    // Animation settings
                    animated: true,
                    hideScrollbar: true,
                    // Custom buttons (minimal set)
                    buttons: [
                        "zoom",
                        "slideShow",
                        "thumbs",
                        "close"
                    ],
                    // Prevent right-click context menu
                    protect: true
                });
                
                this.fancyboxInitialized = true;
            }
        } catch (error) {
            console.error('Failed to initialize Fancybox:', error);
        }
    }

    async loadFancyboxAssets() {
        // Load Fancybox CSS
        if (!document.querySelector('link[href*="fancybox"]')) {
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = 'https://cdn.jsdelivr.net/npm/@fancyapps/ui@5.0/dist/fancybox/fancybox.css';
            document.head.appendChild(cssLink);
        }

        // Load Fancybox JS
        if (!window.Fancybox) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@fancyapps/ui@5.0/dist/fancybox/fancybox.umd.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
    }

    getLoadingHTML() {
        return `
            <div class="container py-5">
                <div class="row justify-content-center">
                    <div class="col-12 text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading gallery...</span>
                        </div>
                        <p class="mt-3">Loading gallery...</p>
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
                        <h1 class="display-4 text-danger">Gallery Not Found</h1>
                        <p class="lead">The gallery you're looking for doesn't exist or has been removed.</p>
                        <a href="/gallery" class="btn btn-primary">Browse Galleries</a>
                    </div>
                </div>
            </div>
        `;
    }

    getHTML() {
        return `
            <div class="gallery-view-page">
                ${this.getGalleryHeader()}
                ${this.getGalleryContent()}
                ${this.getCommentsSection()}
            </div>
        `;
    }

    getGalleryHeader() {
        const gallery = this.gallery;
        const canEdit = this.currentUser && this.currentUser.id === gallery.user_id;
        
        return `
            <div class="container py-4">
                <div class="row">
                    <div class="col-md-8">
                        <nav aria-label="breadcrumb">
                            <ol class="breadcrumb">
                                <li class="breadcrumb-item"><a href="/gallery">Galleries</a></li>
                                ${gallery.type ? `<li class="breadcrumb-item"><a href="/gallery?type=${gallery.type}">${gallery.type}</a></li>` : ''}
                                <li class="breadcrumb-item active">${gallery.title}</li>
                            </ol>
                        </nav>
                        
                        <h1 class="mb-3">${gallery.title}</h1>
                        
                        <div class="d-flex align-items-center mb-3">
                            <img src="${gallery.owner.avatar_url || '/assets/default-avatar.png'}" 
                                 class="rounded-circle me-3" 
                                 width="48" height="48"
                                 alt="${gallery.owner.username}">
                            <div>
                                <div class="fw-medium">
                                    <a href="/profile/${gallery.owner.username}" class="text-decoration-none">
                                        ${gallery.owner.username}
                                    </a>
                                </div>
                                <small class="text-muted">
                                    Created ${new Date(gallery.created_at).toLocaleDateString()}
                                </small>
                            </div>
                        </div>
                        
                        <div class="d-flex align-items-center gap-4 mb-4">
                            <div class="d-flex align-items-center gap-3">
                                <span class="badge bg-primary">
                                    <i class="fas ${this.getTypeIcon(gallery.type)} me-1"></i>
                                    ${gallery.type.charAt(0).toUpperCase() + gallery.type.slice(1)}
                                </span>
                                <span class="badge bg-secondary">
                                    <i class="fas fa-images me-1"></i>
                                    ${gallery.media_count || 0} items
                                </span>
                            </div>
                            
                            <div class="d-flex align-items-center gap-3 text-muted">
                                <span><i class="fas fa-eye me-1"></i>${gallery.view_count || 0}</span>
                                <span><i class="fas fa-heart me-1"></i>${gallery.like_count || 0}</span>
                            </div>
                        </div>
                        
                        ${gallery.description ? `
                            <p class="text-muted">${gallery.description}</p>
                        ` : ''}
                    </div>
                    
                    <div class="col-md-4 text-md-end">
                        ${this.getActionButtons(canEdit)}
                    </div>
                </div>
            </div>
        `;
    }

    getActionButtons(canEdit) {
        return `
            <div class="d-flex flex-column gap-2">
                <button class="btn btn-outline-primary" id="share-btn">
                    <i class="fas fa-share me-2"></i>Share Gallery
                </button>
                
                ${canEdit ? `
                    <a href="/gallery/${this.gallery.id}/edit" class="btn btn-outline-secondary">
                        <i class="fas fa-edit me-2"></i>Edit Gallery
                    </a>
                    <button class="btn btn-outline-success" id="add-media-btn">
                        <i class="fas fa-plus me-2"></i>Add Media
                    </button>
                ` : ''}
            </div>
        `;
    }

    getGalleryContent() {
        const gallery = this.gallery;
        
        return `
            <div class="container">
                <div class="row">
                    <div class="col-12">
                        ${gallery.media && gallery.media.length > 0 ? 
                            this.getMediaGrid() : 
                            this.getEmptyGallery()
                        }
                    </div>
                </div>
            </div>
        `;
    }

    getMediaGrid() {
        const media = this.gallery.media;
        
        return `
            <div class="gallery-grid">
                <div class="row g-3">
                    ${media.map((item, index) => this.getMediaItem(item, index)).join('')}
                </div>
            </div>
        `;
    }

    getMediaItem(item, index) {
        const isImage = item.type === 'image';
        const isVideo = item.type === 'video';
        
        return `
            <div class="col-md-4 col-lg-3">
                <div class="gallery-item position-relative">
                    ${isImage ? `
                        <a href="${item.url}" 
                           data-fancybox="gallery" 
                           data-caption="${item.title || item.filename}"
                           data-thumb="${item.thumbnail_url || item.url}">
                            <img src="${item.thumbnail_url || item.url}" 
                                 class="img-fluid rounded gallery-thumbnail" 
                                 alt="${item.alt_text || item.title || item.filename}"
                                 loading="lazy">
                        </a>
                    ` : isVideo ? `
                        <a href="${item.url}" 
                           data-fancybox="gallery" 
                           data-type="video"
                           data-caption="${item.title || item.filename}"
                           data-thumb="${item.thumbnail_url}">
                            <div class="video-thumbnail position-relative">
                                <img src="${item.thumbnail_url || '/assets/default-video.jpg'}" 
                                     class="img-fluid rounded gallery-thumbnail" 
                                     alt="${item.alt_text || item.title || item.filename}"
                                     loading="lazy">
                                <div class="video-overlay position-absolute top-50 start-50 translate-middle">
                                    <i class="fas fa-play-circle fa-3x text-white"></i>
                                </div>
                                ${item.duration ? `
                                    <div class="video-duration position-absolute bottom-0 end-0 m-2">
                                        <span class="badge bg-dark">${this.formatDuration(item.duration)}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </a>
                    ` : `
                        <div class="audio-item text-center p-3 bg-light rounded">
                            <i class="fas fa-music fa-2x text-muted mb-2"></i>
                            <p class="mb-1 fw-medium">${item.title || item.filename}</p>
                            <audio controls class="w-100">
                                <source src="${item.url}" type="${item.mime_type}">
                                Your browser does not support the audio tag.
                            </audio>
                        </div>
                    `}
                    
                    ${item.title ? `
                        <div class="media-info mt-2">
                            <p class="mb-0 small fw-medium">${item.title}</p>
                            ${item.description ? `
                                <p class="mb-0 small text-muted">${item.description.substring(0, 50)}...</p>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    getEmptyGallery() {
        const canEdit = this.currentUser && this.currentUser.id === this.gallery.user_id;
        
        return `
            <div class="text-center py-5">
                <i class="fas fa-images fa-3x text-muted mb-3"></i>
                <h4>No media in this gallery</h4>
                <p class="text-muted">This gallery doesn't have any photos or videos yet.</p>
                ${canEdit ? `
                    <button class="btn btn-primary mt-3" id="add-first-media-btn">
                        <i class="fas fa-plus me-2"></i>Add First Media
                    </button>
                ` : ''}
            </div>
        `;
    }

    setupEventListeners(container) {
        // Share button
        const shareBtn = container.querySelector('#share-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => this.handleShare());
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
    }

    handleShare() {
        const url = window.location.href;
        const title = this.gallery.title;
        
        if (navigator.share) {
            navigator.share({
                title: title,
                url: url
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(url).then(() => {
                // TODO: Show success message
                console.log('URL copied to clipboard');
            });
        }
    }

    showAddMediaModal() {
        // TODO: Implement add media modal
        console.log('Add media modal will be implemented');
    }

    getTypeIcon(type) {
        const icons = {
            'personal': 'fa-user',
            'interview': 'fa-microphone',
            'event': 'fa-calendar',
            'business': 'fa-building'
        };
        return icons[type] || 'fa-images';
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

    getCommentsSection() {
        return `
            <div class="container mt-5">
                <div class="row justify-content-center">
                    <div class="col-lg-8">
                        <div id="comments-section">
                            <!-- Comments will be loaded here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    initializeComments(container) {
        const commentsContainer = container.querySelector('#comments-section');
        if (commentsContainer && this.gallery) {
            this.commentsComponent = new Comments('gallery', this.gallery.id, commentsContainer);
            this.commentsComponent.render();
        }
    }
}

export default GalleryViewPage;
