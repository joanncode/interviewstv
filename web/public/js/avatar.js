/**
 * Avatar.js - Circular Avatar Management for Interviews.tv
 * Ensures avatars maintain perfect circular shape and proper aspect ratio
 */

class AvatarManager {
    constructor() {
        this.init();
    }

    init() {
        // Apply circular avatar styles on page load
        this.applyCircularAvatars();
        
        // Set up observers for dynamic content
        this.setupMutationObserver();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.applyCircularAvatars();
        });
    }

    /**
     * Apply circular styling to all avatars
     */
    applyCircularAvatars() {
        // Find all avatar elements
        const avatarSelectors = [
            '#avatarPreview',
            '.rounded-circle',
            '[alt*="avatar"]',
            '[alt*="Profile Picture"]',
            '.avatar',
            '.profile-picture'
        ];

        avatarSelectors.forEach(selector => {
            const avatars = document.querySelectorAll(selector);
            avatars.forEach(avatar => {
                this.makeCircular(avatar);
            });
        });
    }

    /**
     * Make a specific image element perfectly circular
     * @param {HTMLImageElement} img - The image element to make circular
     */
    makeCircular(img) {
        if (!img || img.tagName !== 'IMG') return;

        // Apply circular styles
        const styles = {
            'border-radius': '50%',
            'object-fit': 'cover',
            'object-position': 'center',
            'aspect-ratio': '1 / 1',
            'display': 'block'
        };

        // Apply styles
        Object.assign(img.style, styles);

        // Ensure width and height are equal
        this.ensureSquareAspect(img);

        // Handle image load to maintain aspect ratio
        if (!img.complete) {
            img.addEventListener('load', () => {
                this.ensureSquareAspect(img);
            });
        }
    }

    /**
     * Ensure the image maintains a square aspect ratio
     * @param {HTMLImageElement} img - The image element
     */
    ensureSquareAspect(img) {
        const computedStyle = window.getComputedStyle(img);
        const width = parseInt(computedStyle.width);
        const height = parseInt(computedStyle.height);

        // If dimensions are different, use the smaller one for both
        if (width !== height) {
            const size = Math.min(width, height);
            img.style.width = `${size}px`;
            img.style.height = `${size}px`;
        }

        // For settings page avatar specifically
        if (img.id === 'avatarPreview') {
            img.style.width = '150px';
            img.style.height = '150px';
        }
    }

    /**
     * Handle avatar upload and maintain circular shape
     * @param {File} file - The uploaded file
     * @param {HTMLImageElement} previewElement - The preview image element
     */
    handleAvatarUpload(file, previewElement) {
        if (!file || !previewElement) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            previewElement.src = e.target.result;
            
            // Ensure circular shape after image loads
            previewElement.onload = () => {
                this.makeCircular(previewElement);
            };
        };
        reader.readAsDataURL(file);
    }

    /**
     * Set up mutation observer to handle dynamically added avatars
     */
    setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if the added node is an avatar
                            if (node.tagName === 'IMG' && this.isAvatarElement(node)) {
                                this.makeCircular(node);
                            }
                            
                            // Check for avatars within the added node
                            const avatars = node.querySelectorAll && node.querySelectorAll('img');
                            if (avatars) {
                                avatars.forEach(avatar => {
                                    if (this.isAvatarElement(avatar)) {
                                        this.makeCircular(avatar);
                                    }
                                });
                            }
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Check if an image element is an avatar
     * @param {HTMLImageElement} img - The image element to check
     * @returns {boolean} - True if the element is an avatar
     */
    isAvatarElement(img) {
        if (!img || img.tagName !== 'IMG') return false;

        const indicators = [
            img.classList.contains('rounded-circle'),
            img.alt && img.alt.toLowerCase().includes('avatar'),
            img.alt && img.alt.toLowerCase().includes('profile'),
            img.id === 'avatarPreview',
            img.classList.contains('avatar'),
            img.classList.contains('profile-picture')
        ];

        return indicators.some(indicator => indicator);
    }

    /**
     * Add CSS rules for avatar styling
     */
    addAvatarStyles() {
        const styleId = 'avatar-circular-styles';
        
        // Remove existing styles if any
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
            existingStyle.remove();
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Circular Avatar Styles */
            .rounded-circle,
            .avatar,
            .profile-picture,
            #avatarPreview {
                border-radius: 50% !important;
                object-fit: cover !important;
                object-position: center !important;
                aspect-ratio: 1 / 1 !important;
            }

            /* Settings page avatar specific */
            #avatarPreview {
                width: 150px !important;
                height: 150px !important;
                transition: transform 0.2s ease;
            }

            #avatarPreview:hover {
                transform: scale(1.05);
            }

            /* Ensure all avatars maintain circular shape */
            img.rounded-circle {
                min-width: 0 !important;
                min-height: 0 !important;
            }
        `;

        document.head.appendChild(style);
    }
}

// Initialize avatar manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.avatarManager = new AvatarManager();
    window.avatarManager.addAvatarStyles();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AvatarManager;
}
