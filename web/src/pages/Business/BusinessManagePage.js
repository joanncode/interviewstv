import API from '../../services/api.js';
import Auth from '../../services/auth.js';
import Router from '../../utils/router.js';

export default class BusinessManagePage {
    constructor(businessId) {
        this.businessId = businessId;
        this.currentUser = Auth.getCurrentUser();
        this.business = null;
        this.linkedInterviews = [];
        this.availableInterviews = [];
        this.isLoading = false;
    }

    async render(container) {
        if (!this.currentUser) {
            Router.navigate('/login');
            return;
        }

        try {
            await this.loadBusiness();
            
            // Check if user owns this business
            if (this.business.owner_id !== this.currentUser.id && this.currentUser.role !== 'admin') {
                Router.navigate('/business');
                return;
            }

            container.innerHTML = this.getHTML();
            this.setupEventListeners(container);
            
            await Promise.all([
                this.loadLinkedInterviews(),
                this.loadAvailableInterviews()
            ]);
            
        } catch (error) {
            console.error('Failed to render business management:', error);
            this.showErrorState(container);
        }
    }

    async loadBusiness() {
        const response = await API.getBusiness(this.businessId);
        
        if (!response.success) {
            throw new Error(response.message || 'Business not found');
        }
        
        this.business = response.data;
        document.title = `Manage ${this.business.name} - Interviews.tv`;
    }

    async loadLinkedInterviews() {
        try {
            const response = await API.getBusinessInterviews(this.businessId);
            
            if (response.success) {
                this.linkedInterviews = response.data.interviews;
                this.renderLinkedInterviews();
            }
        } catch (error) {
            console.error('Failed to load linked interviews:', error);
        }
    }

    async loadAvailableInterviews() {
        try {
            // Get user's interviews that aren't linked to this business
            const response = await API.getUserInterviews(this.currentUser.username);
            
            if (response.success) {
                const linkedIds = this.linkedInterviews.map(i => i.id);
                this.availableInterviews = response.data.interviews.filter(
                    interview => !linkedIds.includes(interview.id)
                );
                this.renderAvailableInterviews();
            }
        } catch (error) {
            console.error('Failed to load available interviews:', error);
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
            <div class="business-manage-page">
                <div class="container py-4">
                    <!-- Header -->
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h1 class="h3 mb-1">Manage ${this.business.name}</h1>
                            <p class="text-muted mb-0">
                                <a href="/business/${this.businessId}" class="text-decoration-none">
                                    <i class="fas fa-external-link-alt me-1"></i>View Public Profile
                                </a>
                            </p>
                        </div>
                        <div>
                            <a href="/business/${this.businessId}/edit" class="btn btn-outline-primary me-2">
                                <i class="fas fa-edit me-2"></i>Edit Business
                            </a>
                            <a href="/business" class="btn btn-secondary">
                                <i class="fas fa-arrow-left me-2"></i>Back to Directory
                            </a>
                        </div>
                    </div>

                    <div class="row">
                        <!-- Main Content -->
                        <div class="col-lg-8">
                            <!-- Business Overview -->
                            <div class="card mb-4">
                                <div class="card-header">
                                    <h5 class="mb-0">
                                        <i class="fas fa-chart-line me-2"></i>Business Overview
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <div class="row text-center">
                                        <div class="col-md-3">
                                            <div class="stat-item">
                                                <div class="h4 mb-1 text-primary">${this.business.interview_count}</div>
                                                <small class="text-muted">Linked Interviews</small>
                                            </div>
                                        </div>
                                        <div class="col-md-3">
                                            <div class="stat-item">
                                                <div class="h4 mb-1 text-success">${this.business.comment_count}</div>
                                                <small class="text-muted">Comments</small>
                                            </div>
                                        </div>
                                        <div class="col-md-3">
                                            <div class="stat-item">
                                                <div class="h4 mb-1 text-warning">
                                                    ${this.business.average_rating ? this.business.average_rating + '★' : 'N/A'}
                                                </div>
                                                <small class="text-muted">Average Rating</small>
                                            </div>
                                        </div>
                                        <div class="col-md-3">
                                            <div class="stat-item">
                                                <div class="h4 mb-1 text-info">
                                                    ${this.business.verified ? 'Yes' : 'No'}
                                                </div>
                                                <small class="text-muted">Verified</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Linked Interviews -->
                            <div class="card mb-4">
                                <div class="card-header d-flex justify-content-between align-items-center">
                                    <h5 class="mb-0">
                                        <i class="fas fa-video me-2"></i>Linked Interviews
                                    </h5>
                                    <button class="btn btn-sm btn-primary" id="link-interview-btn">
                                        <i class="fas fa-plus me-1"></i>Link Interview
                                    </button>
                                </div>
                                <div class="card-body" id="linked-interviews-container">
                                    <div class="text-center py-3">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">Loading interviews...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Available Interviews -->
                            <div class="card" id="available-interviews-card" style="display: none;">
                                <div class="card-header d-flex justify-content-between align-items-center">
                                    <h5 class="mb-0">
                                        <i class="fas fa-link me-2"></i>Available Interviews to Link
                                    </h5>
                                    <button class="btn btn-sm btn-outline-secondary" id="hide-available-btn">
                                        <i class="fas fa-times me-1"></i>Hide
                                    </button>
                                </div>
                                <div class="card-body" id="available-interviews-container">
                                    <!-- Available interviews will be rendered here -->
                                </div>
                            </div>
                        </div>

                        <!-- Sidebar -->
                        <div class="col-lg-4">
                            <!-- Quick Actions -->
                            <div class="card mb-4">
                                <div class="card-header">
                                    <h6 class="mb-0">
                                        <i class="fas fa-bolt me-2"></i>Quick Actions
                                    </h6>
                                </div>
                                <div class="card-body">
                                    <div class="d-grid gap-2">
                                        <a href="/business/${this.businessId}/edit" class="btn btn-primary btn-sm">
                                            <i class="fas fa-edit me-2"></i>Edit Business Info
                                        </a>
                                        <a href="/interviews/create" class="btn btn-outline-primary btn-sm">
                                            <i class="fas fa-video me-2"></i>Create Interview
                                        </a>
                                        <button class="btn btn-outline-secondary btn-sm" id="share-business-btn">
                                            <i class="fas fa-share me-2"></i>Share Business
                                        </button>
                                        <button class="btn btn-outline-info btn-sm" id="request-verification-btn">
                                            <i class="fas fa-check-circle me-2"></i>Request Verification
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Business Information -->
                            <div class="card mb-4">
                                <div class="card-header">
                                    <h6 class="mb-0">
                                        <i class="fas fa-info-circle me-2"></i>Business Information
                                    </h6>
                                </div>
                                <div class="card-body">
                                    <div class="business-info">
                                        <div class="info-item mb-2">
                                            <strong>Industry:</strong>
                                            <span class="badge bg-primary ms-2">
                                                ${this.getIndustryLabel(this.business.industry)}
                                            </span>
                                        </div>
                                        
                                        ${this.business.location ? `
                                            <div class="info-item mb-2">
                                                <strong>Location:</strong><br>
                                                <small class="text-muted">${this.business.location}</small>
                                            </div>
                                        ` : ''}
                                        
                                        ${this.business.website_url ? `
                                            <div class="info-item mb-2">
                                                <strong>Website:</strong><br>
                                                <small>
                                                    <a href="${this.business.website_url}" target="_blank" class="text-decoration-none">
                                                        ${this.business.website_url}
                                                    </a>
                                                </small>
                                            </div>
                                        ` : ''}
                                        
                                        <div class="info-item mb-2">
                                            <strong>Created:</strong><br>
                                            <small class="text-muted">${this.formatDate(this.business.created_at)}</small>
                                        </div>
                                        
                                        <div class="info-item">
                                            <strong>Last Updated:</strong><br>
                                            <small class="text-muted">${this.formatDate(this.business.updated_at)}</small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Tips -->
                            <div class="card">
                                <div class="card-header">
                                    <h6 class="mb-0">
                                        <i class="fas fa-lightbulb me-2"></i>Tips for Success
                                    </h6>
                                </div>
                                <div class="card-body">
                                    <ul class="small text-muted mb-0">
                                        <li class="mb-2">Link relevant interviews to showcase your business story</li>
                                        <li class="mb-2">Keep your business information up to date</li>
                                        <li class="mb-2">Respond to customer comments promptly</li>
                                        <li class="mb-2">Request verification to build trust</li>
                                        <li>Share your business profile on social media</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Link Interview Modal -->
                <div class="modal fade" id="linkInterviewModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Link Interview to Business</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <p class="text-muted">Select interviews to link with your business profile:</p>
                                <div id="modal-available-interviews">
                                    <!-- Available interviews for modal -->
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderLinkedInterviews() {
        const container = document.getElementById('linked-interviews-container');
        
        if (this.linkedInterviews.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-video fa-3x text-muted mb-3"></i>
                    <h6>No interviews linked yet</h6>
                    <p class="text-muted small">Link your interviews to showcase your business story</p>
                    <button class="btn btn-primary" id="link-first-interview-btn">
                        <i class="fas fa-plus me-2"></i>Link Your First Interview
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="linked-interviews-list">
                ${this.linkedInterviews.map(interview => `
                    <div class="interview-item d-flex align-items-center p-3 border rounded mb-3">
                        <div class="interview-thumbnail me-3">
                            ${interview.thumbnail_url ? `
                                <img src="${interview.thumbnail_url}" 
                                     class="rounded" 
                                     width="80" height="60" 
                                     style="object-fit: cover;"
                                     alt="${interview.title}">
                            ` : `
                                <div class="bg-light rounded d-flex align-items-center justify-content-center" 
                                     style="width: 80px; height: 60px;">
                                    <i class="fas fa-video text-muted"></i>
                                </div>
                            `}
                        </div>
                        
                        <div class="interview-info flex-grow-1">
                            <h6 class="mb-1">
                                <a href="/interviews/${interview.id}" class="text-decoration-none">
                                    ${interview.title}
                                </a>
                            </h6>
                            <p class="text-muted small mb-1">
                                ${interview.description ? interview.description.substring(0, 100) + '...' : 'No description'}
                            </p>
                            <small class="text-muted">
                                ${interview.view_count || 0} views • 
                                ${interview.like_count || 0} likes • 
                                Created ${this.formatDate(interview.created_at)}
                            </small>
                        </div>
                        
                        <div class="interview-actions">
                            <a href="/interviews/${interview.id}" class="btn btn-sm btn-outline-primary me-2">
                                <i class="fas fa-eye me-1"></i>View
                            </a>
                            <button class="btn btn-sm btn-outline-danger unlink-interview-btn" 
                                    data-interview-id="${interview.id}">
                                <i class="fas fa-unlink me-1"></i>Unlink
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderAvailableInterviews() {
        const container = document.getElementById('available-interviews-container');
        const modalContainer = document.getElementById('modal-available-interviews');
        
        if (this.availableInterviews.length === 0) {
            const content = `
                <div class="text-center py-4">
                    <i class="fas fa-video fa-2x text-muted mb-3"></i>
                    <h6>No available interviews</h6>
                    <p class="text-muted small">Create interviews to link them with your business</p>
                    <a href="/interviews/create" class="btn btn-primary btn-sm">
                        <i class="fas fa-plus me-2"></i>Create Interview
                    </a>
                </div>
            `;
            container.innerHTML = content;
            modalContainer.innerHTML = content;
            return;
        }

        const content = `
            <div class="available-interviews-list">
                ${this.availableInterviews.map(interview => `
                    <div class="interview-item d-flex align-items-center p-3 border rounded mb-3">
                        <div class="interview-thumbnail me-3">
                            ${interview.thumbnail_url ? `
                                <img src="${interview.thumbnail_url}" 
                                     class="rounded" 
                                     width="60" height="45" 
                                     style="object-fit: cover;"
                                     alt="${interview.title}">
                            ` : `
                                <div class="bg-light rounded d-flex align-items-center justify-content-center" 
                                     style="width: 60px; height: 45px;">
                                    <i class="fas fa-video text-muted"></i>
                                </div>
                            `}
                        </div>
                        
                        <div class="interview-info flex-grow-1">
                            <h6 class="mb-1">${interview.title}</h6>
                            <p class="text-muted small mb-1">
                                ${interview.description ? interview.description.substring(0, 80) + '...' : 'No description'}
                            </p>
                            <small class="text-muted">
                                ${interview.view_count || 0} views • Created ${this.formatDate(interview.created_at)}
                            </small>
                        </div>
                        
                        <div class="interview-actions">
                            <button class="btn btn-sm btn-primary link-interview-btn" 
                                    data-interview-id="${interview.id}">
                                <i class="fas fa-link me-1"></i>Link
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        container.innerHTML = content;
        modalContainer.innerHTML = content;
    }

    setupEventListeners(container) {
        // Link interview button
        const linkBtn = container.querySelector('#link-interview-btn');
        const linkFirstBtn = container.querySelector('#link-first-interview-btn');
        
        [linkBtn, linkFirstBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    this.showAvailableInterviews();
                });
            }
        });

        // Hide available interviews
        const hideBtn = container.querySelector('#hide-available-btn');
        if (hideBtn) {
            hideBtn.addEventListener('click', () => {
                this.hideAvailableInterviews();
            });
        }

        // Link interview buttons
        container.addEventListener('click', (e) => {
            if (e.target.matches('.link-interview-btn') || e.target.closest('.link-interview-btn')) {
                const btn = e.target.matches('.link-interview-btn') ? e.target : e.target.closest('.link-interview-btn');
                const interviewId = btn.dataset.interviewId;
                this.linkInterview(interviewId);
            }
        });

        // Unlink interview buttons
        container.addEventListener('click', (e) => {
            if (e.target.matches('.unlink-interview-btn') || e.target.closest('.unlink-interview-btn')) {
                const btn = e.target.matches('.unlink-interview-btn') ? e.target : e.target.closest('.unlink-interview-btn');
                const interviewId = btn.dataset.interviewId;
                this.unlinkInterview(interviewId);
            }
        });

        // Share business
        const shareBtn = container.querySelector('#share-business-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                this.shareBusiness();
            });
        }

        // Request verification
        const verifyBtn = container.querySelector('#request-verification-btn');
        if (verifyBtn) {
            verifyBtn.addEventListener('click', () => {
                this.requestVerification();
            });
        }
    }

    showAvailableInterviews() {
        const card = document.getElementById('available-interviews-card');
        card.style.display = 'block';
        card.scrollIntoView({ behavior: 'smooth' });
    }

    hideAvailableInterviews() {
        const card = document.getElementById('available-interviews-card');
        card.style.display = 'none';
    }

    async linkInterview(interviewId) {
        if (this.isLoading) return;

        try {
            this.isLoading = true;
            
            const response = await API.linkBusinessInterview(this.businessId, interviewId);
            
            if (response.success) {
                this.showSuccess('Interview linked successfully!');
                
                // Refresh the lists
                await Promise.all([
                    this.loadLinkedInterviews(),
                    this.loadAvailableInterviews()
                ]);
                
                // Update business stats
                this.business.interview_count++;
                this.updateBusinessStats();
                
            } else {
                this.showError(response.message || 'Failed to link interview');
            }
            
        } catch (error) {
            console.error('Failed to link interview:', error);
            this.showError('Failed to link interview');
        } finally {
            this.isLoading = false;
        }
    }

    async unlinkInterview(interviewId) {
        if (this.isLoading) return;

        if (!confirm('Are you sure you want to unlink this interview from your business?')) {
            return;
        }

        try {
            this.isLoading = true;
            
            const response = await API.unlinkBusinessInterview(this.businessId, interviewId);
            
            if (response.success) {
                this.showSuccess('Interview unlinked successfully!');
                
                // Refresh the lists
                await Promise.all([
                    this.loadLinkedInterviews(),
                    this.loadAvailableInterviews()
                ]);
                
                // Update business stats
                this.business.interview_count = Math.max(0, this.business.interview_count - 1);
                this.updateBusinessStats();
                
            } else {
                this.showError(response.message || 'Failed to unlink interview');
            }
            
        } catch (error) {
            console.error('Failed to unlink interview:', error);
            this.showError('Failed to unlink interview');
        } finally {
            this.isLoading = false;
        }
    }

    updateBusinessStats() {
        // Update the stats display
        const statsContainer = document.querySelector('.card-body .row.text-center');
        if (statsContainer) {
            const interviewCountElement = statsContainer.querySelector('.text-primary');
            if (interviewCountElement) {
                interviewCountElement.textContent = this.business.interview_count;
            }
        }
    }

    shareBusiness() {
        const url = `${window.location.origin}/business/${this.businessId}`;
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
                this.showSuccess('Business link copied to clipboard!');
            }).catch(() => {
                this.showError('Failed to copy link');
            });
        }
    }

    requestVerification() {
        // This would typically open a modal or redirect to a verification request form
        this.showInfo('Verification request feature coming soon!');
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

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    showSuccess(message) {
        this.showToast('success', message);
    }

    showError(message) {
        this.showToast('error', message);
    }

    showInfo(message) {
        this.showToast('info', message);
    }

    showToast(type, message) {
        const colors = {
            'success': '#28a745',
            'error': '#dc3545',
            'info': '#17a2b8'
        };

        const toast = document.createElement('div');
        toast.className = `business-toast toast-${type}`;
        toast.textContent = message;
        toast.style.position = 'fixed';
        toast.style.top = '20px';
        toast.style.right = '20px';
        toast.style.background = colors[type];
        toast.style.color = 'white';
        toast.style.padding = '12px 16px';
        toast.style.borderRadius = '6px';
        toast.style.fontSize = '14px';
        toast.style.zIndex = '10000';
        toast.style.maxWidth = '300px';
        toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';

        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 4000);
    }

    showErrorState(container) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-exclamation-triangle fa-3x text-muted mb-3"></i>
                <h5>Failed to Load Business</h5>
                <p class="text-muted">Unable to load business management page.</p>
                <a href="/business" class="btn btn-primary">
                    <i class="fas fa-building me-2"></i>Back to Directory
                </a>
            </div>
        `;
    }

    destroy() {
        // Clean up any resources
    }
}
