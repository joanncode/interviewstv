import API from '../../services/api.js';
import Auth from '../../services/auth.js';

export default class ActivityFeedPage {
    constructor() {
        this.currentUser = Auth.getCurrentUser();
        this.activities = [];
        this.isLoading = false;
        this.currentPage = 1;
        this.totalPages = 1;
        this.feedType = 'personal'; // personal, public
        this.preferences = {};
    }

    async render(container) {
        container.innerHTML = this.getHTML();
        this.setupEventListeners(container);
        
        await this.loadFeed();
        if (this.currentUser) {
            await this.loadPreferences();
        }
    }

    getHTML() {
        return `
            <div class="activity-feed-page">
                <div class="container py-4">
                    <div class="row">
                        <div class="col-md-8">
                            <div class="d-flex justify-content-between align-items-center mb-4">
                                <h2>Activity Feed</h2>
                                <div class="d-flex gap-2">
                                    <div class="btn-group" role="group">
                                        <input type="radio" class="btn-check" name="feedType" id="personal-feed" value="personal" ${this.feedType === 'personal' ? 'checked' : ''} ${!this.currentUser ? 'disabled' : ''}>
                                        <label class="btn btn-outline-primary" for="personal-feed">
                                            <i class="fas fa-user me-1"></i>Personal
                                        </label>
                                        
                                        <input type="radio" class="btn-check" name="feedType" id="public-feed" value="public" ${this.feedType === 'public' ? 'checked' : ''}>
                                        <label class="btn btn-outline-primary" for="public-feed">
                                            <i class="fas fa-globe me-1"></i>Public
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            <div id="activities-container">
                                ${this.getActivitiesHTML()}
                            </div>
                            
                            ${this.getPaginationHTML()}
                        </div>
                        
                        <div class="col-md-4">
                            ${this.getSidebarHTML()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getActivitiesHTML() {
        if (this.isLoading) {
            return `
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading activities...</span>
                    </div>
                </div>
            `;
        }

        if (this.activities.length === 0) {
            return this.getEmptyStateHTML();
        }

        return `
            <div class="activity-list">
                ${this.activities.map(activity => this.getActivityHTML(activity)).join('')}
            </div>
        `;
    }

    getActivityHTML(activity) {
        const timeAgo = this.getTimeAgo(new Date(activity.created_at));
        
        return `
            <div class="card mb-3 activity-card" data-activity-id="${activity.id}">
                <div class="card-body">
                    <div class="d-flex">
                        <div class="flex-shrink-0 me-3">
                            <img src="${activity.avatar_url || '/assets/default-avatar.png'}" 
                                 alt="${activity.username}" 
                                 class="rounded-circle" 
                                 width="50" height="50"
                                 onerror="this.src='/assets/default-avatar.png'">
                        </div>
                        <div class="flex-grow-1">
                            <div class="activity-content">
                                ${this.getActivityContentHTML(activity)}
                            </div>
                            <div class="activity-meta mt-2">
                                <small class="text-muted">
                                    <i class="fas fa-clock me-1"></i>${timeAgo}
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getActivityContentHTML(activity) {
        const username = activity.username;
        const metadata = activity.metadata || {};
        const entityDetails = activity.entity_details || {};

        switch (activity.activity_type) {
            case 'interview_published':
                return `
                    <div class="activity-header mb-2">
                        <strong>${username}</strong> published a new interview
                        <i class="fas fa-video text-primary ms-1"></i>
                    </div>
                    <div class="activity-details">
                        <div class="interview-preview">
                            <div class="d-flex">
                                ${entityDetails.thumbnail_url ? `
                                    <div class="flex-shrink-0 me-3">
                                        <img src="${entityDetails.thumbnail_url}" 
                                             alt="Interview thumbnail" 
                                             class="rounded" 
                                             width="80" height="60"
                                             style="object-fit: cover;">
                                    </div>
                                ` : ''}
                                <div class="flex-grow-1">
                                    <h6 class="mb-1">
                                        <a href="/interviews/${activity.entity_id}" class="text-decoration-none">
                                            ${entityDetails.title || metadata.title}
                                        </a>
                                    </h6>
                                    ${entityDetails.description ? `
                                        <p class="text-muted small mb-0">
                                            ${entityDetails.description.length > 100 ? 
                                                entityDetails.description.substring(0, 100) + '...' : 
                                                entityDetails.description}
                                        </p>
                                    ` : ''}
                                    <span class="badge bg-secondary">${entityDetails.type || metadata.type}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

            case 'interview_liked':
                return `
                    <div class="activity-header mb-2">
                        <strong>${username}</strong> liked an interview
                        <i class="fas fa-heart text-danger ms-1"></i>
                    </div>
                    <div class="activity-details">
                        <div class="interview-preview">
                            <div class="d-flex align-items-center">
                                ${entityDetails.thumbnail_url || metadata.thumbnail_url ? `
                                    <div class="flex-shrink-0 me-3">
                                        <img src="${entityDetails.thumbnail_url || metadata.thumbnail_url}" 
                                             alt="Interview thumbnail" 
                                             class="rounded" 
                                             width="60" height="45"
                                             style="object-fit: cover;">
                                    </div>
                                ` : ''}
                                <div class="flex-grow-1">
                                    <h6 class="mb-0">
                                        <a href="/interviews/${activity.entity_id}" class="text-decoration-none">
                                            ${entityDetails.title || metadata.title}
                                        </a>
                                    </h6>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

            case 'user_followed':
                return `
                    <div class="activity-header mb-2">
                        <strong>${username}</strong> started following
                        <i class="fas fa-user-plus text-success ms-1"></i>
                    </div>
                    <div class="activity-details">
                        <div class="user-preview">
                            <div class="d-flex align-items-center">
                                <div class="flex-shrink-0 me-3">
                                    <img src="${entityDetails.avatar_url || metadata.avatar_url || '/assets/default-avatar.png'}" 
                                         alt="User avatar" 
                                         class="rounded-circle" 
                                         width="40" height="40"
                                         onerror="this.src='/assets/default-avatar.png'">
                                </div>
                                <div class="flex-grow-1">
                                    <h6 class="mb-0">
                                        <a href="/profile/${entityDetails.username || metadata.username}" class="text-decoration-none">
                                            ${entityDetails.username || metadata.username}
                                        </a>
                                    </h6>
                                    ${entityDetails.bio ? `
                                        <p class="text-muted small mb-0">
                                            ${entityDetails.bio.length > 80 ? 
                                                entityDetails.bio.substring(0, 80) + '...' : 
                                                entityDetails.bio}
                                        </p>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                `;

            case 'comment_created':
                return `
                    <div class="activity-header mb-2">
                        <strong>${username}</strong> commented on an interview
                        <i class="fas fa-comment text-info ms-1"></i>
                    </div>
                    <div class="activity-details">
                        <div class="comment-preview">
                            <blockquote class="blockquote-footer mb-2">
                                "${metadata.content || entityDetails.content}"
                            </blockquote>
                            ${entityDetails.commented_on ? `
                                <div class="commented-on">
                                    <small class="text-muted">on</small>
                                    <a href="/interviews/${metadata.entity_id}" class="text-decoration-none">
                                        ${entityDetails.commented_on.title}
                                    </a>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;

            default:
                return `
                    <div class="activity-header">
                        <strong>${username}</strong> performed an activity
                        <i class="fas fa-bell text-secondary ms-1"></i>
                    </div>
                `;
        }
    }

    getEmptyStateHTML() {
        if (this.feedType === 'personal' && !this.currentUser) {
            return `
                <div class="text-center py-5">
                    <i class="fas fa-user-slash fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">Sign in to see your personal feed</h5>
                    <p class="text-muted">Follow users to see their activities in your personal feed</p>
                    <a href="/login" class="btn btn-primary">Sign In</a>
                </div>
            `;
        }

        if (this.feedType === 'personal') {
            return `
                <div class="text-center py-5">
                    <i class="fas fa-rss fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">Your feed is empty</h5>
                    <p class="text-muted">Follow users to see their activities here</p>
                    <a href="/discover" class="btn btn-outline-primary">Discover Users</a>
                </div>
            `;
        }

        return `
            <div class="text-center py-5">
                <i class="fas fa-globe fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">No public activities yet</h5>
                <p class="text-muted">Check back later for new activities</p>
            </div>
        `;
    }

    getPaginationHTML() {
        if (this.totalPages <= 1) {
            return '';
        }

        return `
            <nav aria-label="Activity feed pagination" class="mt-4">
                <ul class="pagination justify-content-center">
                    <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                        <button class="page-link" data-page="${this.currentPage - 1}" ${this.currentPage === 1 ? 'disabled' : ''}>
                            Previous
                        </button>
                    </li>
                    ${this.getPaginationNumbers()}
                    <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                        <button class="page-link" data-page="${this.currentPage + 1}" ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                            Next
                        </button>
                    </li>
                </ul>
            </nav>
        `;
    }

    getPaginationNumbers() {
        let html = '';
        const start = Math.max(1, this.currentPage - 2);
        const end = Math.min(this.totalPages, this.currentPage + 2);

        for (let i = start; i <= end; i++) {
            html += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <button class="page-link" data-page="${i}">${i}</button>
                </li>
            `;
        }

        return html;
    }

    getSidebarHTML() {
        return `
            <div class="feed-sidebar">
                ${this.currentUser ? this.getFeedPreferencesHTML() : ''}
                ${this.getFeedInfoHTML()}
            </div>
        `;
    }

    getFeedPreferencesHTML() {
        return `
            <div class="card mb-4">
                <div class="card-header">
                    <h6 class="mb-0">Feed Preferences</h6>
                </div>
                <div class="card-body">
                    <div id="feed-preferences-container">
                        ${this.getFeedPreferencesFormHTML()}
                    </div>
                </div>
            </div>
        `;
    }

    getFeedPreferencesFormHTML() {
        const types = [
            { key: 'interview_published', label: 'New Interviews', icon: 'video' },
            { key: 'interview_liked', label: 'Interview Likes', icon: 'heart' },
            { key: 'comment_created', label: 'Comments', icon: 'comment' },
            { key: 'user_followed', label: 'New Follows', icon: 'user-plus' },
            { key: 'gallery_uploaded', label: 'Gallery Uploads', icon: 'images' },
            { key: 'profile_updated', label: 'Profile Updates', icon: 'user-edit' }
        ];

        return `
            <form id="feed-preferences-form">
                ${types.map(type => {
                    const enabled = this.preferences[type.key] !== false;
                    return `
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox"
                                   id="${type.key}_enabled"
                                   name="${type.key}"
                                   ${enabled ? 'checked' : ''}>
                            <label class="form-check-label small" for="${type.key}_enabled">
                                <i class="fas fa-${type.icon} me-2 text-muted"></i>
                                ${type.label}
                            </label>
                        </div>
                    `;
                }).join('')}

                <button type="submit" class="btn btn-primary btn-sm w-100 mt-3">
                    Save Preferences
                </button>
            </form>
        `;
    }

    getFeedInfoHTML() {
        return `
            <div class="card">
                <div class="card-header">
                    <h6 class="mb-0">About Activity Feeds</h6>
                </div>
                <div class="card-body">
                    <div class="feed-info">
                        <div class="mb-3">
                            <h6 class="small fw-bold">
                                <i class="fas fa-user text-primary me-2"></i>Personal Feed
                            </h6>
                            <p class="small text-muted mb-0">
                                See activities from users you follow, including new interviews, likes, and follows.
                            </p>
                        </div>

                        <div class="mb-3">
                            <h6 class="small fw-bold">
                                <i class="fas fa-globe text-success me-2"></i>Public Feed
                            </h6>
                            <p class="small text-muted mb-0">
                                Discover new content and users through public activities from the community.
                            </p>
                        </div>

                        ${!this.currentUser ? `
                            <div class="text-center mt-3">
                                <a href="/register" class="btn btn-outline-primary btn-sm">
                                    Join to Follow Users
                                </a>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners(container) {
        // Feed type toggle
        const feedTypeInputs = container.querySelectorAll('input[name="feedType"]');
        feedTypeInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.feedType = e.target.value;
                    this.currentPage = 1;
                    this.loadFeed();
                }
            });
        });

        // Pagination
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('page-link') && e.target.dataset.page) {
                const page = parseInt(e.target.dataset.page);
                if (page !== this.currentPage) {
                    this.currentPage = page;
                    this.loadFeed();
                }
            }
        });

        // Feed preferences form
        const preferencesForm = container.querySelector('#feed-preferences-form');
        if (preferencesForm) {
            preferencesForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveFeedPreferences(e.target);
            });
        }
    }

    async loadFeed() {
        try {
            this.isLoading = true;
            this.updateActivitiesContainer();

            const params = {
                page: this.currentPage,
                limit: 20
            };

            let response;
            if (this.feedType === 'personal' && this.currentUser) {
                response = await API.getPersonalFeed(params);
            } else {
                response = await API.getPublicFeed(params);
            }

            if (response.success) {
                this.activities = response.data.items || [];
                this.totalPages = Math.ceil((response.data.total || 0) / 20);
                this.updateActivitiesContainer();
            }
        } catch (error) {
            console.error('Failed to load feed:', error);
        } finally {
            this.isLoading = false;
        }
    }

    async loadPreferences() {
        try {
            const response = await API.getFeedPreferences();

            if (response.success) {
                this.preferences = response.data || {};
                this.updatePreferencesForm();
            }
        } catch (error) {
            console.error('Failed to load feed preferences:', error);
        }
    }

    async saveFeedPreferences(form) {
        try {
            const formData = new FormData(form);
            const preferences = {};

            // Get all checkboxes
            const checkboxes = form.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                preferences[checkbox.name] = checkbox.checked;
            });

            const response = await API.updateFeedPreferences(preferences);

            if (response.success) {
                this.preferences = response.data || {};
                this.showAlert('success', 'Feed preferences saved successfully!');

                // Reload feed if on personal feed
                if (this.feedType === 'personal') {
                    this.currentPage = 1;
                    this.loadFeed();
                }
            }
        } catch (error) {
            console.error('Failed to save feed preferences:', error);
            this.showAlert('error', 'Failed to save preferences');
        }
    }

    updateActivitiesContainer() {
        const container = document.getElementById('activities-container');
        if (container) {
            container.innerHTML = this.getActivitiesHTML();
        }

        // Update pagination
        const paginationContainer = container?.parentNode.querySelector('nav[aria-label="Activity feed pagination"]');
        if (paginationContainer) {
            paginationContainer.outerHTML = this.getPaginationHTML();
        }
    }

    updatePreferencesForm() {
        const container = document.getElementById('feed-preferences-container');
        if (container) {
            container.innerHTML = this.getFeedPreferencesFormHTML();
        }
    }

    showAlert(type, message) {
        const alertHtml = `
            <div class="alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        const container = document.querySelector('.activity-feed-page .container');
        container.insertAdjacentHTML('afterbegin', alertHtml);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            const alert = container.querySelector('.alert');
            if (alert) {
                alert.remove();
            }
        }, 5000);
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) {
            return 'Just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes}m ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours}h ago`;
        } else if (diffInSeconds < 2592000) {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days}d ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
}
