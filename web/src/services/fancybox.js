/**
 * Fancybox Gallery Service
 * Provides a clean interface for initializing Fancybox galleries with no top tools
 */

export default class FancyboxService {
    static defaultOptions = {
        // No top toolbar as requested
        Toolbar: {
            display: {
                left: [],
                middle: [],
                right: []
            }
        },
        
        // Custom UI configuration
        UI: {
            parentEl: null,
            closeButton: false, // No close button in top area
        },
        
        // Navigation arrows
        Navigation: {
            prevTpl: '<button class="fancybox__button fancybox__button--prev" title="Previous"><svg><path d="M15 4l-8 8 8 8"/></svg></button>',
            nextTpl: '<button class="fancybox__button fancybox__button--next" title="Next"><svg><path d="M9 4l8 8-8 8"/></svg></button>'
        },
        
        // Thumbs configuration
        Thumbs: {
            type: 'classic',
            showOnStart: false,
            hideOnClose: true
        },
        
        // Counter
        Counter: {
            position: 'bottom'
        },
        
        // Animation settings
        animated: true,
        hideScrollbar: true,
        
        // Touch/drag settings
        touch: {
            vertical: false,
            momentum: true
        },
        
        // Wheel settings
        wheel: 'slide',
        
        // Keyboard navigation
        keyboard: {
            Escape: 'close',
            Delete: 'close',
            Backspace: 'close',
            PageUp: 'next',
            PageDown: 'prev',
            ArrowUp: 'prev',
            ArrowDown: 'next',
            ArrowRight: 'next',
            ArrowLeft: 'prev'
        },
        
        // Image settings
        Images: {
            zoom: true,
            protected: true
        },
        
        // Video settings
        Video: {
            autoplay: false,
            ratio: 16/9
        }
    };

    /**
     * Initialize Fancybox for a gallery
     * @param {string} selector - CSS selector for gallery items
     * @param {Object} options - Additional Fancybox options
     * @param {Object} galleryData - Gallery metadata
     */
    static initGallery(selector, options = {}, galleryData = {}) {
        if (typeof Fancybox === 'undefined') {
            console.error('Fancybox is not loaded');
            return;
        }

        const mergedOptions = {
            ...this.defaultOptions,
            ...options,
            
            // Custom event handlers
            on: {
                init: (fancybox) => {
                    this.onGalleryInit(fancybox, galleryData);
                },
                
                reveal: (fancybox, slide) => {
                    this.onSlideReveal(fancybox, slide, galleryData);
                },
                
                close: (fancybox) => {
                    this.onGalleryClose(fancybox, galleryData);
                },
                
                ...options.on
            }
        };

        // Bind Fancybox to the selector
        Fancybox.bind(selector, mergedOptions);
        
        // Add custom keyboard shortcuts
        this.addCustomKeyboardShortcuts();
        
        return mergedOptions;
    }

    /**
     * Initialize Fancybox for a single media item
     * @param {HTMLElement} element - The media element
     * @param {Object} options - Fancybox options
     */
    static initSingle(element, options = {}) {
        if (typeof Fancybox === 'undefined') {
            console.error('Fancybox is not loaded');
            return;
        }

        const mergedOptions = {
            ...this.defaultOptions,
            ...options
        };

        element.addEventListener('click', (e) => {
            e.preventDefault();
            
            const items = [{
                src: element.href || element.dataset.src,
                type: this.detectMediaType(element.href || element.dataset.src),
                caption: element.dataset.caption || element.title || '',
                thumb: element.dataset.thumb || element.src
            }];

            new Fancybox(items, mergedOptions);
        });
    }

    /**
     * Create gallery from data array
     * @param {Array} mediaItems - Array of media objects
     * @param {Object} options - Fancybox options
     * @param {number} startIndex - Starting slide index
     */
    static openGallery(mediaItems, options = {}, startIndex = 0) {
        if (typeof Fancybox === 'undefined') {
            console.error('Fancybox is not loaded');
            return;
        }

        const items = mediaItems.map(item => ({
            src: item.url,
            type: item.type || this.detectMediaType(item.url),
            caption: this.buildCaption(item),
            thumb: item.thumbnail_url || item.url,
            width: item.width,
            height: item.height,
            duration: item.duration
        }));

        const mergedOptions = {
            ...this.defaultOptions,
            ...options,
            startIndex: startIndex
        };

        new Fancybox(items, mergedOptions);
    }

    /**
     * Detect media type from URL
     * @param {string} url - Media URL
     * @returns {string} - Media type
     */
    static detectMediaType(url) {
        if (!url) return 'image';
        
        const extension = url.split('.').pop().toLowerCase();
        
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
            return 'image';
        } else if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(extension)) {
            return 'video';
        } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) {
            return 'audio';
        } else if (url.includes('youtube.com') || url.includes('vimeo.com')) {
            return 'video';
        }
        
        return 'image'; // Default fallback
    }

    /**
     * Build caption HTML for media item
     * @param {Object} item - Media item object
     * @returns {string} - Caption HTML
     */
    static buildCaption(item) {
        let caption = '';
        
        if (item.title) {
            caption += `<h6 class="mb-2">${item.title}</h6>`;
        }
        
        if (item.description) {
            caption += `<p class="mb-2">${item.description}</p>`;
        }
        
        // Add metadata
        const metadata = [];
        
        if (item.width && item.height) {
            metadata.push(`${item.width} × ${item.height}`);
        }
        
        if (item.duration) {
            metadata.push(this.formatDuration(item.duration));
        }
        
        if (item.file_size) {
            metadata.push(this.formatFileSize(item.file_size));
        }
        
        if (metadata.length > 0) {
            caption += `<small class="text-muted">${metadata.join(' • ')}</small>`;
        }
        
        return caption;
    }

    /**
     * Format duration in seconds to readable format
     * @param {number} seconds - Duration in seconds
     * @returns {string} - Formatted duration
     */
    static formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    /**
     * Format file size to readable format
     * @param {number} bytes - File size in bytes
     * @returns {string} - Formatted file size
     */
    static formatFileSize(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Event handler for gallery initialization
     * @param {Object} fancybox - Fancybox instance
     * @param {Object} galleryData - Gallery metadata
     */
    static onGalleryInit(fancybox, galleryData) {
        // Track gallery view
        if (galleryData.id) {
            this.trackGalleryView(galleryData.id);
        }
        
        // Add custom controls if needed
        this.addCustomControls(fancybox, galleryData);
    }

    /**
     * Event handler for slide reveal
     * @param {Object} fancybox - Fancybox instance
     * @param {Object} slide - Current slide
     * @param {Object} galleryData - Gallery metadata
     */
    static onSlideReveal(fancybox, slide, galleryData) {
        // Track individual media view
        if (slide.src) {
            this.trackMediaView(slide.src, galleryData.id);
        }
        
        // Update page title
        if (slide.caption) {
            document.title = `${slide.caption} - ${galleryData.title || 'Gallery'} - Interviews.tv`;
        }
    }

    /**
     * Event handler for gallery close
     * @param {Object} fancybox - Fancybox instance
     * @param {Object} galleryData - Gallery metadata
     */
    static onGalleryClose(fancybox, galleryData) {
        // Restore original page title
        document.title = galleryData.originalTitle || 'Interviews.tv';
    }

    /**
     * Add custom keyboard shortcuts
     */
    static addCustomKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (!document.querySelector('.fancybox__container')) return;
            
            switch (e.key) {
                case 'i':
                case 'I':
                    // Toggle info/caption
                    this.toggleCaption();
                    break;
                case 't':
                case 'T':
                    // Toggle thumbnails
                    this.toggleThumbnails();
                    break;
                case 'f':
                case 'F':
                    // Toggle fullscreen
                    this.toggleFullscreen();
                    break;
            }
        });
    }

    /**
     * Add custom controls to Fancybox
     * @param {Object} fancybox - Fancybox instance
     * @param {Object} galleryData - Gallery metadata
     */
    static addCustomControls(fancybox, galleryData) {
        // Add download button if enabled
        if (galleryData.allowDownload) {
            this.addDownloadButton(fancybox);
        }
        
        // Add share button
        this.addShareButton(fancybox, galleryData);
        
        // Add like button if user is logged in
        if (galleryData.allowLikes) {
            this.addLikeButton(fancybox, galleryData);
        }
    }

    /**
     * Toggle caption visibility
     */
    static toggleCaption() {
        const caption = document.querySelector('.fancybox__caption');
        if (caption) {
            caption.style.display = caption.style.display === 'none' ? 'block' : 'none';
        }
    }

    /**
     * Toggle thumbnails
     */
    static toggleThumbnails() {
        const thumbs = document.querySelector('.fancybox__thumbs');
        if (thumbs) {
            thumbs.style.display = thumbs.style.display === 'none' ? 'block' : 'none';
        }
    }

    /**
     * Toggle fullscreen
     */
    static toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            const container = document.querySelector('.fancybox__container');
            if (container) {
                container.requestFullscreen();
            }
        }
    }

    /**
     * Track gallery view (placeholder for analytics)
     * @param {number} galleryId - Gallery ID
     */
    static trackGalleryView(galleryId) {
        // Implement analytics tracking
        console.log(`Gallery ${galleryId} viewed`);
    }

    /**
     * Track media view (placeholder for analytics)
     * @param {string} mediaUrl - Media URL
     * @param {number} galleryId - Gallery ID
     */
    static trackMediaView(mediaUrl, galleryId) {
        // Implement analytics tracking
        console.log(`Media ${mediaUrl} in gallery ${galleryId} viewed`);
    }

    /**
     * Add download button
     * @param {Object} fancybox - Fancybox instance
     */
    static addDownloadButton(fancybox) {
        // Implementation for download functionality
    }

    /**
     * Add share button
     * @param {Object} fancybox - Fancybox instance
     * @param {Object} galleryData - Gallery metadata
     */
    static addShareButton(fancybox, galleryData) {
        // Implementation for share functionality
    }

    /**
     * Add like button
     * @param {Object} fancybox - Fancybox instance
     * @param {Object} galleryData - Gallery metadata
     */
    static addLikeButton(fancybox, galleryData) {
        // Implementation for like functionality
    }

    /**
     * Destroy all Fancybox instances
     */
    static destroyAll() {
        if (typeof Fancybox !== 'undefined') {
            Fancybox.destroy();
        }
    }

    /**
     * Check if Fancybox is available
     * @returns {boolean}
     */
    static isAvailable() {
        return typeof Fancybox !== 'undefined';
    }
}
