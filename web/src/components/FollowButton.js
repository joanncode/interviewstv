import API from '../services/api.js';
import Auth from '../services/auth.js';

export default class FollowButton {
    constructor(options = {}) {
        this.username = options.username;
        this.initialFollowing = options.following || false;
        this.initialFollowerCount = options.followerCount || 0;
        this.size = options.size || 'normal'; // 'small', 'normal', 'large'
        this.showCount = options.showCount !== false; // Default true
        this.showText = options.showText !== false; // Default true
        this.style = options.style || 'primary'; // 'primary', 'outline', 'minimal'
        this.onFollowChange = options.onFollowChange || (() => {});
        
        this.following = this.initialFollowing;
        this.followerCount = this.initialFollowerCount;
        this.isLoading = false;
        this.element = null;
    }

    render(container) {
        const currentUser = Auth.getCurrentUser();
        
        if (!currentUser) {
            // Show read-only follower count for non-authenticated users
            container.innerHTML = this.getReadOnlyHTML();
            return;
        }

        // Don't show follow button for own profile
        if (currentUser.username === this.username) {
            container.innerHTML = this.getOwnProfileHTML();
            return;
        }

        container.innerHTML = this.getHTML();
        this.element = container.querySelector('.follow-button');
        this.setupEventListeners();
    }

    getHTML() {
        const sizeClass = this.getSizeClass();
        const styleClass = this.getStyleClass();
        const followingClass = this.following ? 'following' : '';
        const loadingClass = this.isLoading ? 'loading' : '';
        
        return `
            <button class="follow-button ${sizeClass} ${styleClass} ${followingClass} ${loadingClass}" 
                    data-username="${this.username}"
                    ${this.isLoading ? 'disabled' : ''}>
                <span class="follow-icon">
                    ${this.isLoading ? this.getLoadingIcon() : this.getFollowIcon()}
                </span>
                ${this.showText ? `<span class="follow-text">${this.getFollowText()}</span>` : ''}
                ${this.showCount ? `<span class="follow-count">${this.formatCount(this.followerCount)}</span>` : ''}
            </button>
        `;
    }

    getReadOnlyHTML() {
        const sizeClass = this.getSizeClass();
        
        return `
            <div class="follow-display ${sizeClass}">
                <span class="follow-icon">
                    <i class="fas fa-users"></i>
                </span>
                ${this.showCount ? `<span class="follow-count">${this.formatCount(this.followerCount)}</span>` : ''}
                ${this.showText ? `<span class="follow-text">Followers</span>` : ''}
            </div>
        `;
    }

    getOwnProfileHTML() {
        const sizeClass = this.getSizeClass();
        
        return `
            <div class="follow-display own-profile ${sizeClass}">
                <span class="follow-icon">
                    <i class="fas fa-users"></i>
                </span>
                ${this.showCount ? `<span class="follow-count">${this.formatCount(this.followerCount)}</span>` : ''}
                ${this.showText ? `<span class="follow-text">Followers</span>` : ''}
            </div>
        `;
    }

    getSizeClass() {
        const sizeClasses = {
            'small': 'follow-button-sm',
            'normal': 'follow-button-md',
            'large': 'follow-button-lg'
        };
        return sizeClasses[this.size] || sizeClasses.normal;
    }

    getStyleClass() {
        const styleClasses = {
            'primary': 'btn btn-primary',
            'outline': 'btn btn-outline-primary',
            'minimal': 'btn btn-link'
        };
        return styleClasses[this.style] || styleClasses.primary;
    }

    getFollowIcon() {
        return this.following ? 
            '<i class="fas fa-user-check"></i>' : 
            '<i class="fas fa-user-plus"></i>';
    }

    getLoadingIcon() {
        return '<i class="fas fa-spinner fa-spin"></i>';
    }

    getFollowText() {
        if (this.following) {
            return this.element && this.element.matches(':hover') ? 'Unfollow' : 'Following';
        }
        return 'Follow';
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

            // Handle hover text change for following state
            this.element.addEventListener('mouseenter', () => {
                if (this.following && this.showText) {
                    const textElement = this.element.querySelector('.follow-text');
                    if (textElement) {
                        textElement.textContent = 'Unfollow';
                        this.element.classList.add('unfollow-hover');
                    }
                }
            });

            this.element.addEventListener('mouseleave', () => {
                if (this.following && this.showText) {
                    const textElement = this.element.querySelector('.follow-text');
                    if (textElement) {
                        textElement.textContent = 'Following';
                        this.element.classList.remove('unfollow-hover');
                    }
                }
            });
        }
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
            
            const wasFollowing = this.following;
            const previousCount = this.followerCount;

            // Optimistic update
            this.following = !wasFollowing;
            this.followerCount = wasFollowing ? Math.max(0, this.followerCount - 1) : this.followerCount + 1;
            this.updateUI();

            // Make API call
            const response = wasFollowing ? 
                await this.unfollow() : 
                await this.follow();

            if (response.success) {
                // Update with server response
                this.following = response.data.following;
                this.followerCount = response.data.follower_count || this.followerCount;
                
                // Trigger callback
                this.onFollowChange({
                    following: this.following,
                    followerCount: this.followerCount,
                    username: this.username
                });

                // Trigger animation
                if (this.following) {
                    this.triggerFollowAnimation();
                }

                // Show success message
                this.showSuccess(this.following ? 
                    `You are now following @${this.username}` : 
                    `You unfollowed @${this.username}`
                );
            } else {
                // Revert optimistic update on error
                this.following = wasFollowing;
                this.followerCount = previousCount;
                this.showError(response.message || 'Failed to update follow status');
            }

        } catch (error) {
            console.error('Follow toggle failed:', error);
            // Revert optimistic update
            this.following = !this.following;
            this.followerCount = this.following ? this.followerCount + 1 : Math.max(0, this.followerCount - 1);
            this.showError('Network error. Please try again.');
        } finally {
            this.setLoading(false);
            this.updateUI();
        }
    }

    async follow() {
        return await API.followUser(this.username);
    }

    async unfollow() {
        return await API.unfollowUser(this.username);
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
        this.element.classList.toggle('following', this.following);
        
        // Update icon
        const iconElement = this.element.querySelector('.follow-icon');
        if (iconElement) {
            iconElement.innerHTML = this.isLoading ? this.getLoadingIcon() : this.getFollowIcon();
        }

        // Update count
        const countElement = this.element.querySelector('.follow-count');
        if (countElement) {
            countElement.textContent = this.formatCount(this.followerCount);
        }

        // Update text
        const textElement = this.element.querySelector('.follow-text');
        if (textElement && !this.element.matches(':hover')) {
            textElement.textContent = this.getFollowText();
        }
    }

    triggerFollowAnimation() {
        if (!this.element) return;

        // Add animation class
        this.element.classList.add('follow-animation');
        
        // Create floating icon effect
        this.createFloatingIcon();

        // Remove animation class after animation completes
        setTimeout(() => {
            if (this.element) {
                this.element.classList.remove('follow-animation');
            }
        }, 600);
    }

    createFloatingIcon() {
        const rect = this.element.getBoundingClientRect();
        const icon = document.createElement('div');
        icon.className = 'floating-follow-icon';
        icon.innerHTML = '<i class="fas fa-user-plus"></i>';
        icon.style.position = 'fixed';
        icon.style.left = rect.left + rect.width / 2 + 'px';
        icon.style.top = rect.top + 'px';
        icon.style.pointerEvents = 'none';
        icon.style.zIndex = '9999';
        icon.style.color = '#007bff';
        icon.style.fontSize = '1.2em';
        icon.style.animation = 'floatUp 1s ease-out forwards';

        document.body.appendChild(icon);

        // Remove after animation
        setTimeout(() => {
            if (icon.parentNode) {
                icon.parentNode.removeChild(icon);
            }
        }, 1000);
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
        toast.className = `follow-toast toast-${type}`;
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
        toast.style.animation = 'slideInRight 0.3s ease-out';

        document.body.appendChild(toast);

        // Remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }
        }, 3000);
    }

    // Public methods for external updates
    updateFollowerCount(newCount) {
        this.followerCount = newCount;
        this.updateUI();
    }

    updateFollowing(following) {
        this.following = following;
        this.updateUI();
    }

    destroy() {
        if (this.element) {
            this.element.removeEventListener('click', this.toggle);
            this.element.removeEventListener('mouseenter', this.handleMouseEnter);
            this.element.removeEventListener('mouseleave', this.handleMouseLeave);
        }
    }
}
