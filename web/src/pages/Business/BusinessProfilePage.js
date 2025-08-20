import API from '../../services/api.js';
import Auth from '../../services/auth.js';
import Comments from '../../components/Comments.js';
import LikeButton from '../../components/LikeButton.js';

export default class BusinessProfilePage {
    constructor(businessId) {
        this.businessId = businessId;
        this.currentUser = Auth.getCurrentUser();
        this.business = null;
        this.interviews = [];
        this.isOwner = false;
        this.comments = null;
        this.likeButtons = new Map();
    }

    async render(container) {
        try {
            await this.loadBusiness();
            container.innerHTML = this.getHTML();
            this.setupEventListeners(container);
            this.initializeComments(container);
            
            await Promise.all([
                this.loadInterviews(),
                this.initializeLikeButtons()
            ]);
            
        } catch (error) {
            console.error('Failed to render business profile:', error);
            this.showErrorState(container);
        }
    }

    async loadBusiness() {
        const response = await API.get(`/api/businesses/${this.businessId}`);
        
        if (!response.success) {
            throw new Error(response.message || 'Business not found');
        }
        
        this.business = response.data;
        this.isOwner = this.currentUser && this.currentUser.id === this.business.owner_id;
        
        // Update page title
        document.title = `${this.business.name} - Business Profile - Interviews.tv`;
    }

    async loadInterviews() {
        try {
            const response = await API.get(`/api/businesses/${this.businessId}/interviews`);
            
            if (response.success) {
                this.interviews = response.data.interviews;
                this.renderInterviews();
            }
        } catch (error) {
            console.error('Failed to load business interviews:', error);
        }
    }

    getHTML() {
        if (!this.business) {
            return `
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading business...</span>
                    </div>
                </div>
            `;
        }

        return `
            <div class="business-profile-page">
                <!-- Business Header -->
                <div class="business-header bg-light py-5">
                    <div class="container">
                        <div class="row align-items-center">
                            <div class="col-md-3 text-center">
                                ${this.business.logo_url ? `
                                    <img src="${this.business.logo_url}" 
                                         class="business-logo rounded-circle mb-3" 
                                         width="150" height="150" 
                                         style="object-fit: cover;"
                                         alt="${this.business.name}">
                                ` : `
                                    <div class="business-logo-placeholder bg-white rounded-circle d-flex align-items-center justify-content-center mb-3 mx-auto" 
                                         style="width: 150px; height: 150px; border: 3px solid #dee2e6;">
                                        <i class="fas fa-building fa-3x text-muted"></i>
                                    </div>
                                `}
                            </div>
                            
                            <div class="col-md-6">
                                <h1 class="display-5 fw-bold mb-2">
                                    ${this.business.name}
                                    ${this.business.verified ? `
                                        <i class="fas fa-check-circle text-primary ms-2" 
                                           title="Verified Business"></i>
                                    ` : ''}
                                </h1>
                                
                                <div class="business-meta mb-3">
                                    <span class="badge bg-${this.getIndustryColor(this.business.industry)} me-2">
                                        ${this.getIndustryLabel(this.business.industry)}
                                    </span>
                                    
                                    ${this.business.location ? `
                                        <span class="text-muted">
                                            <i class="fas fa-map-marker-alt me-1"></i>
                                            ${this.business.location}
                                        </span>
                                    ` : ''}
                                </div>
                                
                                <p class="lead text-muted">
                                    ${this.business.description || 'No description available'}
                                </p>
                                
                                <!-- Business Stats -->
                                <div class="business-stats row text-center">
                                    <div class="col-4">
                                        <div class="stat-item">
                                            <div class="h4 mb-1 text-primary">${this.business.interview_count}</div>
                                            <small class="text-muted">Interviews</small>
                                        </div>
                                    </div>
                                    <div class="col-4">
                                        <div class="stat-item">
                                            <div class="h4 mb-1 text-success">${this.business.comment_count}</div>
                                            <small class="text-muted">Comments</small>
                                        </div>
                                    </div>
                                    <div class="col-4">
                                        <div class="stat-item">
                                            <div class="h4 mb-1 text-warning">
                                                ${this.business.average_rating ? this.business.average_rating + '★' : 'N/A'}
                                            </div>
                                            <small class="text-muted">Rating</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="col-md-3 text-center">
                                ${this.isOwner ? `
                                    <div class="owner-actions">
                                        <a href="/business/${this.businessId}/edit" class="btn btn-primary mb-2 w-100">
                                            <i class="fas fa-edit me-2"></i>Edit Business
                                        </a>
                                        <a href="/business/${this.businessId}/dashboard" class="btn btn-outline-primary mb-2 w-100">
                                            <i class="fas fa-chart-line me-2"></i>Dashboard
                                        </a>
                                        <button class="btn btn-outline-secondary w-100" id="share-business-btn">
                                            <i class="fas fa-share me-2"></i>Share
                                        </button>
                                    </div>
                                ` : `
                                    <div class="visitor-actions">
                                        ${this.business.website_url ? `
                                            <a href="${this.business.website_url}" 
                                               target="_blank" 
                                               class="btn btn-primary mb-2 w-100">
                                                <i class="fas fa-globe me-2"></i>Visit Website
                                            </a>
                                        ` : ''}
                                        
                                        ${this.business.phone ? `
                                            <a href="tel:${this.business.phone}" class="btn btn-outline-primary mb-2 w-100">
                                                <i class="fas fa-phone me-2"></i>Call
                                            </a>
                                        ` : ''}
                                        
                                        <button class="btn btn-outline-secondary w-100" id="share-business-btn">
                                            <i class="fas fa-share me-2"></i>Share
                                        </button>
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Business Content -->
                <div class="container py-4">
                    <div class="row">
                        <!-- Main Content -->
                        <div class="col-lg-8">
                            <!-- Business Information -->
                            <div class="card mb-4">
                                <div class="card-header">
                                    <h5 class="mb-0">
                                        <i class="fas fa-info-circle me-2"></i>Business Information
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        ${this.business.website_url ? `
                                            <div class="col-md-6 mb-3">
                                                <strong>Website:</strong><br>
                                                <a href="${this.business.website_url}" 
                                                   target="_blank" 
                                                   class="text-decoration-none">
                                                    ${this.business.website_url}
                                                    <i class="fas fa-external-link-alt ms-1"></i>
                                                </a>
                                            </div>
                                        ` : ''}
                                        
                                        ${this.business.phone ? `
                                            <div class="col-md-6 mb-3">
                                                <strong>Phone:</strong><br>
                                                <a href="tel:${this.business.phone}" class="text-decoration-none">
                                                    ${this.business.phone}
                                                </a>
                                            </div>
                                        ` : ''}
                                        
                                        ${this.business.email ? `
                                            <div class="col-md-6 mb-3">
                                                <strong>Email:</strong><br>
                                                <a href="mailto:${this.business.email}" class="text-decoration-none">
                                                    ${this.business.email}
                                                </a>
                                            </div>
                                        ` : ''}
                                        
                                        <div class="col-md-6 mb-3">
                                            <strong>Industry:</strong><br>
                                            <span class="badge bg-${this.getIndustryColor(this.business.industry)}">
                                                ${this.getIndustryLabel(this.business.industry)}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    ${this.business.hours ? `
                                        <div class="business-hours mt-3">
                                            <strong>Business Hours:</strong>
                                            <div class="mt-2">
                                                ${this.renderBusinessHours(this.business.hours)}
                                            </div>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>

                            <!-- Related Interviews -->
                            <div class="card mb-4">
                                <div class="card-header d-flex justify-content-between align-items-center">
                                    <h5 class="mb-0">
                                        <i class="fas fa-video me-2"></i>Related Interviews
                                    </h5>
                                    ${this.isOwner ? `
                                        <button class="btn btn-sm btn-outline-primary" id="link-interview-btn">
                                            <i class="fas fa-plus me-1"></i>Link Interview
                                        </button>
                                    ` : ''}
                                </div>
                                <div class="card-body" id="interviews-container">
                                    <div class="text-center py-3">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">Loading interviews...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Comments Section -->
                            <div class="card">
                                <div class="card-header">
                                    <h5 class="mb-0">
                                        <i class="fas fa-comments me-2"></i>Comments & Reviews
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <div id="comments-container"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Sidebar -->
                        <div class="col-lg-4">
                            <!-- Owner Information -->
                            <div class="card mb-4">
                                <div class="card-header">
                                    <h6 class="mb-0">
                                        <i class="fas fa-user me-2"></i>Business Owner
                                    </h6>
                                </div>
                                <div class="card-body">
                                    <div class="d-flex align-items-center">
                                        <img src="${this.business.owner_avatar || '/assets/default-avatar.png'}" 
                                             class="rounded-circle me-3" 
                                             width="50" height="50" 
                                             alt="Owner">
                                        <div>
                                            <h6 class="mb-1">
                                                <a href="/profile/${this.business.owner_username}" 
                                                   class="text-decoration-none">
                                                    @${this.business.owner_username}

// Continue with BusinessCreatePage in next file...
                                                </a>
                                            </h6>
                                            <small class="text-muted">Business Owner</small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Quick Actions -->
                            <div class="card mb-4">
                                <div class="card-header">
                                    <h6 class="mb-0">
                                        <i class="fas fa-bolt me-2"></i>Quick Actions
                                    </h6>
                                </div>
                                <div class="card-body">
                                    <div class="d-grid gap-2">
                                        ${this.currentUser ? `
                                            <button class="btn btn-primary btn-sm" id="request-interview-btn">
                                                <i class="fas fa-video me-2"></i>Request Interview
                                            </button>
                                        ` : ''}
                                        
                                        <a href="/business" class="btn btn-outline-secondary btn-sm">
                                            <i class="fas fa-building me-2"></i>Browse Businesses
                                        </a>
                                        
                                        <a href="/interviews" class="btn btn-outline-secondary btn-sm">
                                            <i class="fas fa-video me-2"></i>Browse Interviews
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <!-- Business Stats -->
                            <div class="card">
                                <div class="card-header">
                                    <h6 class="mb-0">
                                        <i class="fas fa-chart-bar me-2"></i>Statistics
                                    </h6>
                                </div>
                                <div class="card-body">
                                    <div class="stat-item d-flex justify-content-between mb-2">
                                        <span>Created:</span>
                                        <span>${this.formatDate(this.business.created_at)}</span>
                                    </div>
                                    <div class="stat-item d-flex justify-content-between mb-2">
                                        <span>Last Updated:</span>
                                        <span>${this.formatDate(this.business.updated_at)}</span>
                                    </div>
                                    <div class="stat-item d-flex justify-content-between mb-2">
                                        <span>Total Interviews:</span>
                                        <span class="badge bg-primary">${this.business.interview_count}</span>
                                    </div>
                                    <div class="stat-item d-flex justify-content-between">
                                        <span>Total Comments:</span>
                                        <span class="badge bg-success">${this.business.comment_count}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderInterviews() {
        const container = document.getElementById('interviews-container');
        
        if (this.interviews.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-video fa-3x text-muted mb-3"></i>
                    <h6>No interviews linked yet</h6>
                    <p class="text-muted small">
                        ${this.isOwner ? 
                            'Link your first interview to showcase your business story.' :
                            'This business hasn\'t been featured in any interviews yet.'
                        }
                    </p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="row g-3">
                ${this.interviews.map(interview => `
                    <div class="col-md-6">
                        <div class="interview-card card h-100">
                            ${interview.thumbnail_url ? `
                                <img src="${interview.thumbnail_url}" 
                                     class="card-img-top" 
                                     style="height: 150px; object-fit: cover;"
                                     alt="${interview.title}">
                            ` : `
                                <div class="card-img-top bg-light d-flex align-items-center justify-content-center" 
                                     style="height: 150px;">
                                    <i class="fas fa-video fa-2x text-muted"></i>
                                </div>
                            `}
                            
                            <div class="card-body">
                                <h6 class="card-title">
                                    <a href="/interviews/${interview.id}" class="text-decoration-none">
                                        ${interview.title}
                                    </a>
                                </h6>
                                
                                <p class="card-text small text-muted">
                                    ${interview.description ? interview.description.substring(0, 80) + '...' : ''}
                                </p>
                                
                                <div class="d-flex justify-content-between align-items-center">
                                    <div class="like-button-container" 
                                         data-entity-type="interview" 
                                         data-entity-id="${interview.id}"></div>
                                    <small class="text-muted">
                                        ${interview.view_count || 0} views
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderBusinessHours(hours) {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        return days.map((day, index) => {
            const dayHours = hours[day];
            return `
                <div class="d-flex justify-content-between">
                    <span>${dayLabels[index]}:</span>
                    <span>${dayHours ? `${dayHours.open} - ${dayHours.close}` : 'Closed'}</span>
                </div>
            `;
        }).join('');
    }

    initializeComments(container) {
        const commentsContainer = container.querySelector('#comments-container');
        if (commentsContainer) {
            this.comments = new Comments(commentsContainer, {
                entityType: 'business',
                entityId: this.businessId,
                allowComments: true,
                showReplies: true,
                maxDepth: 3
            });
            this.comments.render();
        }
    }

    async initializeLikeButtons() {
        const likeContainers = document.querySelectorAll('.like-button-container');
        
        likeContainers.forEach(container => {
            const entityType = container.dataset.entityType;
            const entityId = container.dataset.entityId;
            
            if (entityType && entityId) {
                const entity = this.interviews.find(i => i.id == entityId);
                if (entity) {
                    const likeButton = new LikeButton({
                        entityType: entityType,
                        entityId: entityId,
                        liked: entity.is_liked || false,
                        count: entity.like_count || 0,
                        size: 'small',
                        showText: false,
                        onLikeChange: (data) => {
                            this.updateEntityLikeStatus(entityType, entityId, data);
                        }
                    });
                    likeButton.render(container);
                    this.likeButtons.set(`${entityType}_${entityId}`, likeButton);
                }
            }
        });
    }

    setupEventListeners(container) {
        // Share business button
        const shareBtn = container.querySelector('#share-business-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                this.shareBusiness();
            });
        }

        // Request interview button
        const requestBtn = container.querySelector('#request-interview-btn');
        if (requestBtn) {
            requestBtn.addEventListener('click', () => {
                this.requestInterview();
            });
        }

        // Link interview button (owner only)
        const linkBtn = container.querySelector('#link-interview-btn');
        if (linkBtn) {
            linkBtn.addEventListener('click', () => {
                this.showLinkInterviewModal();
            });
        }
    }

    shareBusiness() {
        const url = window.location.href;
        const title = `${this.business.name} - Business Profile`;
        const text = `Check out ${this.business.name} on Interviews.tv`;

        if (navigator.share) {
            navigator.share({
                title: title,
                text: text,
                url: url
            }).catch(console.error);
        } else {
            // Fallback to clipboard
            navigator.clipboard.writeText(url).then(() => {
                this.showToast('success', 'Business link copied to clipboard!');
            }).catch(() => {
                this.showToast('error', 'Failed to copy link');
            });
        }
    }

    requestInterview() {
        // This would open a modal or redirect to interview request form
        window.location.href = `/interviews/create?business=${this.businessId}`;
    }

    showLinkInterviewModal() {
        // This would show a modal to select and link interviews
        // For now, redirect to a management page
        window.location.href = `/business/${this.businessId}/manage`;
    }

    updateEntityLikeStatus(entityType, entityId, data) {
        this.interviews.forEach(interview => {
            if (interview.id == entityId) {
                interview.is_liked = data.liked;
                interview.like_count = data.count;
            }
        });
    }

    getIndustryLabel(industry) {
        const labels = {
            'retail': 'Retail',
            'hospitality': 'Hospitality',
            'tech': 'Technology',
            'healthcare': 'Healthcare',
            'education': 'Education',
            'entertainment': 'Entertainment',
            'other': 'Other'
        };
        return labels[industry] || industry;
    }

    getIndustryColor(industry) {
        const colors = {
            'retail': 'primary',
            'hospitality': 'success',
            'tech': 'info',
            'healthcare': 'danger',
            'education': 'warning',
            'entertainment': 'secondary',
            'other': 'dark'
        };
        return colors[industry] || 'secondary';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    showToast(type, message) {
        // Create temporary toast notification
        const toast = document.createElement('div');
        toast.className = `business-toast toast-${type}`;
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

        document.body.appendChild(toast);

        // Remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }

    showErrorState(container) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-exclamation-triangle fa-3x text-muted mb-3"></i>
                <h5>Business Not Found</h5>
                <p class="text-muted">The business you're looking for doesn't exist or has been removed.</p>
                <a href="/business" class="btn btn-primary">
                    <i class="fas fa-building me-2"></i>Browse Businesses
                </a>
            </div>
        `;
    }

    destroy() {
        // Clean up like buttons
        this.likeButtons.forEach(button => button.destroy());
        this.likeButtons.clear();

        // Clean up comments
        if (this.comments) {
            this.comments.destroy();
        }
    }
}
