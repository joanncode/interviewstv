import API from '../services/api.js';
import Auth from '../services/auth.js';
import { realtimeService } from '../services/realtime.js';

export default class LikeButton {
    constructor(options = {}) {
        this.entityType = options.entityType; // 'interview', 'comment', 'media'
        this.entityId = options.entityId;
        this.initialLiked = options.liked || false;
        this.initialCount = options.count || 0;
        this.size = options.size || 'normal'; // 'small', 'normal', 'large'
        this.showCount = options.showCount !== false; // Default true
        this.showText = options.showText || false;
        this.animated = options.animated !== false; // Default true
        this.onLikeChange = options.onLikeChange || (() => {});
        
        this.liked = this.initialLiked;
        this.count = this.initialCount;
        this.isLoading = false;
        this.element = null;
    }

    render(container) {
        const currentUser = Auth.getCurrentUser();
        
        if (!currentUser) {
            // Show read-only like count for non-authenticated users
            container.innerHTML = this.getReadOnlyHTML();
            return;
        }

        container.innerHTML = this.getHTML();
        this.element = container.querySelector('.like-button');
        this.setupEventListeners();
        this.setupRealtimeListeners();
    }

    getHTML() {
        const sizeClass = this.getSizeClass();
        const likedClass = this.liked ? 'liked' : '';
        const loadingClass = this.isLoading ? 'loading' : '';
        
        return `
            <button class="like-button ${sizeClass} ${likedClass} ${loadingClass}" 
                    data-entity-type="${this.entityType}" 
                    data-entity-id="${this.entityId}"
                    ${this.isLoading ? 'disabled' : ''}>
                <span class="like-icon">
                    ${this.isLoading ? this.getLoadingIcon() : this.getHeartIcon()}
                </span>
                ${this.showCount ? `<span class="like-count">${this.formatCount(this.count)}</span>` : ''}
                ${this.showText ? `<span class="like-text">${this.liked ? 'Liked' : 'Like'}</span>` : ''}
            </button>
        `;
    }

    getReadOnlyHTML() {
        const sizeClass = this.getSizeClass();
        
        return `
            <div class="like-display ${sizeClass}">
                <span class="like-icon">
                    ${this.getHeartIcon()}
                </span>
                ${this.showCount ? `<span class="like-count">${this.formatCount(this.count)}</span>` : ''}
                ${this.showText ? `<span class="like-text">Likes</span>` : ''}
            </div>
        `;
    }

    getSizeClass() {
        const sizeClasses = {
            'small': 'like-button-sm',
            'normal': 'like-button-md',
            'large': 'like-button-lg'
        };
        return sizeClasses[this.size] || sizeClasses.normal;
    }

    getHeartIcon() {
        return this.liked ? 
            '<i class="fas fa-heart"></i>' : 
            '<i class="far fa-heart"></i>';
    }

    getLoadingIcon() {
        return '<i class="fas fa-spinner fa-spin"></i>';
    }

    formatCount(count) {
        if (count < 1000) return count.toString();
        if (count < 1000000) return (count / 1000).toFixed(1) + 'K';
        return (count / 1000000).toFixed(1) + 'M';
    }

    setupEventListeners() {
        if (this.element) {
            this.element.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggle();
            });
        }
    }

    setupRealtimeListeners() {
        // Listen for optimistic updates
        this.realtimeUnsubscribe = realtimeService.on('like_updated', (data) => {
            if (data.entityType === this.entityType && data.entityId == this.entityId) {
                this.liked = data.liked;
                this.count = data.count;
                this.updateUI();
            }
        });

        // Listen for optimistic reverts
        realtimeService.on('optimistic_revert', (data) => {
            if (data.actionId.includes(`${this.entityType}_${this.entityId}`)) {
                this.liked = data.originalData.liked;
                this.count = data.originalData.count;
                this.updateUI();
            }
        });
    }

    async toggle() {
        if (this.isLoading) return;

        const currentUser = Auth.getCurrentUser();
        if (!currentUser) {
            // Redirect to login or show login modal
            window.location.href = '/login';
            return;
        }

        try {
            this.setLoading(true);

            const currentState = {
                liked: this.liked,
                count: this.count
            };

            // Use real-time service for optimistic updates and API calls
            const result = await realtimeService.toggleLike(
                this.entityType,
                this.entityId,
                currentState
            );

            // Update with server response
            this.liked = result.liked;
            this.count = result.count;
            this.updateUI();

            // Trigger callback
            this.onLikeChange({
                liked: this.liked,
                count: this.count,
                entityType: this.entityType,
                entityId: this.entityId
            });

            // Trigger animation
            if (this.animated && this.liked) {
                this.triggerLikeAnimation();
            }
                this.count = previousCount;
                this.showError(response.message || 'Failed to update like');
            }

        } catch (error) {
            console.error('Like toggle failed:', error);
            // Revert optimistic update
            this.liked = !this.liked;
            this.count = this.liked ? this.count + 1 : Math.max(0, this.count - 1);
            this.showError('Network error. Please try again.');
        } finally {
            this.setLoading(false);
            this.updateUI();
        }
    }

    async like() {
        switch (this.entityType) {
            case 'interview':
                return await API.likeInterview(this.entityId);
            case 'comment':
                return await API.likeComment(this.entityId);
            case 'media':
                return await API.likeMedia(this.entityId);
            default:
                throw new Error(`Unsupported entity type: ${this.entityType}`);
        }
    }

    async unlike() {
        switch (this.entityType) {
            case 'interview':
                return await API.unlikeInterview(this.entityId);
            case 'comment':
                return await API.unlikeComment(this.entityId);
            case 'media':
                return await API.unlikeMedia(this.entityId);
            default:
                throw new Error(`Unsupported entity type: ${this.entityType}`);
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        if (this.element) {
            this.element.disabled = loading;
            this.element.classList.toggle('loading', loading);
        }
    }

    updateUI() {
        if (!this.element) return;

        // Update classes
        this.element.classList.toggle('liked', this.liked);
        
        // Update icon
        const iconElement = this.element.querySelector('.like-icon');
        if (iconElement) {
            iconElement.innerHTML = this.isLoading ? this.getLoadingIcon() : this.getHeartIcon();
        }

        // Update count
        const countElement = this.element.querySelector('.like-count');
        if (countElement) {
            countElement.textContent = this.formatCount(this.count);
        }

        // Update text
        const textElement = this.element.querySelector('.like-text');
        if (textElement) {
            textElement.textContent = this.liked ? 'Liked' : 'Like';
        }
    }

    triggerLikeAnimation() {
        if (!this.element || !this.animated) return;

        // Add animation class
        this.element.classList.add('like-animation');
        
        // Create floating heart effect
        this.createFloatingHeart();

        // Remove animation class after animation completes
        setTimeout(() => {
            if (this.element) {
                this.element.classList.remove('like-animation');
            }
        }, 600);
    }

    createFloatingHeart() {
        const rect = this.element.getBoundingClientRect();
        const heart = document.createElement('div');
        heart.className = 'floating-heart';
        heart.innerHTML = '<i class="fas fa-heart"></i>';
        heart.style.position = 'fixed';
        heart.style.left = rect.left + rect.width / 2 + 'px';
        heart.style.top = rect.top + 'px';
        heart.style.pointerEvents = 'none';
        heart.style.zIndex = '9999';
        heart.style.color = '#ff0000';
        heart.style.fontSize = '1.2em';
        heart.style.animation = 'floatUp 1s ease-out forwards';

        document.body.appendChild(heart);

        // Remove after animation
        setTimeout(() => {
            if (heart.parentNode) {
                heart.parentNode.removeChild(heart);
            }
        }, 1000);
    }

    showError(message) {
        // Create temporary error tooltip
        if (!this.element) return;

        const tooltip = document.createElement('div');
        tooltip.className = 'like-error-tooltip';
        tooltip.textContent = message;
        tooltip.style.position = 'absolute';
        tooltip.style.background = '#dc3545';
        tooltip.style.color = 'white';
        tooltip.style.padding = '4px 8px';
        tooltip.style.borderRadius = '4px';
        tooltip.style.fontSize = '12px';
        tooltip.style.zIndex = '1000';
        tooltip.style.whiteSpace = 'nowrap';

        const rect = this.element.getBoundingClientRect();
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = (rect.bottom + 5) + 'px';

        document.body.appendChild(tooltip);

        // Remove after 3 seconds
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        }, 3000);
    }

    // Public methods for external updates
    updateCount(newCount) {
        this.count = newCount;
        this.updateUI();
    }

    updateLiked(liked) {
        this.liked = liked;
        this.updateUI();
    }

    destroy() {
        if (this.element) {
            this.element.removeEventListener('click', this.toggle);
        }

        if (this.realtimeUnsubscribe) {
            this.realtimeUnsubscribe();
        }
    }
}
