import Auth from '../../services/auth.js';
import API from '../../services/api.js';
import Router from '../../utils/router.js';

class InterviewViewPage {
    constructor() {
        this.interview = null;
        this.currentUser = Auth.getCurrentUser();
        this.isLoading = false;
    }

    async render(container, props = {}) {
        const interviewId = props.params?.id;
        
        if (!interviewId) {
            Router.navigate('/interviews');
            return;
        }

        container.innerHTML = this.getLoadingHTML();
        
        try {
            await this.loadInterview(interviewId);
            container.innerHTML = this.getHTML();
            this.setupEventListeners(container);
        } catch (error) {
            console.error('Failed to load interview:', error);
            container.innerHTML = this.getErrorHTML();
        }
    }

    async loadInterview(id) {
        const response = await API.get(`/api/interviews/${id}`);
        
        if (!response.success) {
            throw new Error(response.message || 'Interview not found');
        }
        
        this.interview = response.data;
    }

    getLoadingHTML() {
        return `
            <div class="container py-5">
                <div class="row justify-content-center">
                    <div class="col-12 text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading interview...</span>
                        </div>
                        <p class="mt-3">Loading interview...</p>
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
                        <h1 class="display-4 text-danger">Interview Not Found</h1>
                        <p class="lead">The interview you're looking for doesn't exist or has been removed.</p>
                        <a href="/interviews" class="btn btn-primary">Browse Interviews</a>
                    </div>
                </div>
            </div>
        `;
    }

    getHTML() {
        return `
            <div class="interview-view-page">
                ${this.getInterviewHeader()}
                ${this.getInterviewContent()}
                ${this.getInterviewSidebar()}
            </div>
        `;
    }

    getInterviewHeader() {
        const interview = this.interview;
        const canEdit = this.currentUser && this.currentUser.id === interview.interviewer_id;
        
        return `
            <div class="container py-4">
                <div class="row">
                    <div class="col-md-8">
                        <nav aria-label="breadcrumb">
                            <ol class="breadcrumb">
                                <li class="breadcrumb-item"><a href="/interviews">Interviews</a></li>
                                ${interview.category ? `<li class="breadcrumb-item"><a href="/interviews?category=${interview.category}">${interview.category}</a></li>` : ''}
                                <li class="breadcrumb-item active">${interview.title}</li>
                            </ol>
                        </nav>
                        
                        <h1 class="mb-3">${interview.title}</h1>
                        
                        <div class="d-flex align-items-center mb-3">
                            <img src="${interview.interviewer.avatar_url || '/assets/default-avatar.png'}" 
                                 class="rounded-circle me-3" 
                                 width="48" height="48"
                                 alt="${interview.interviewer.username}">
                            <div>
                                <div class="fw-medium">
                                    <a href="/profile/${interview.interviewer.username}" class="text-decoration-none">
                                        ${interview.interviewer.username}
                                    </a>
                                </div>
                                <small class="text-muted">
                                    Published ${new Date(interview.published_at || interview.created_at).toLocaleDateString()}
                                </small>
                            </div>
                        </div>
                        
                        <div class="d-flex align-items-center gap-4 mb-4">
                            <div class="d-flex align-items-center gap-3">
                                <span class="badge bg-primary">
                                    <i class="fas ${this.getTypeIcon(interview.type)} me-1"></i>
                                    ${interview.type.charAt(0).toUpperCase() + interview.type.slice(1)}
                                </span>
                                ${interview.category ? `<span class="badge bg-secondary">${interview.category}</span>` : ''}
                            </div>
                            
                            <div class="d-flex align-items-center gap-3 text-muted">
                                <span><i class="fas fa-eye me-1"></i>${interview.view_count || 0}</span>
                                <span><i class="fas fa-heart me-1"></i>${interview.like_count || 0}</span>
                                ${interview.duration ? `<span><i class="fas fa-clock me-1"></i>${this.formatDuration(interview.duration)}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-4 text-md-end">
                        ${this.getActionButtons(canEdit)}
                    </div>
                </div>
            </div>
        `;
    }

    getActionButtons(canEdit) {
        const interview = this.interview;
        const isLiked = interview.is_liked;
        
        return `
            <div class="d-flex flex-column gap-2">
                ${this.currentUser ? `
                    <button class="btn ${isLiked ? 'btn-danger' : 'btn-outline-danger'}" 
                            id="like-btn"
                            data-liked="${isLiked}">
                        <i class="fas fa-heart me-2"></i>
                        ${isLiked ? 'Unlike' : 'Like'}
                    </button>
                ` : ''}
                
                <button class="btn btn-outline-primary" id="share-btn">
                    <i class="fas fa-share me-2"></i>Share
                </button>
                
                ${canEdit ? `
                    <a href="/interviews/${interview.id}/edit" class="btn btn-outline-secondary">
                        <i class="fas fa-edit me-2"></i>Edit
                    </a>
                ` : ''}
            </div>
        `;
    }

    getInterviewContent() {
        const interview = this.interview;
        
        return `
            <div class="container">
                <div class="row">
                    <div class="col-md-8">
                        <div class="interview-media mb-4">
                            ${this.getMediaPlayer()}
                        </div>
                        
                        <div class="interview-details">
                            <h3>About this Interview</h3>
                            
                            <div class="row mb-4">
                                <div class="col-md-6">
                                    <h5>Interviewer</h5>
                                    <div class="d-flex align-items-center">
                                        <img src="${interview.interviewer.avatar_url || '/assets/default-avatar.png'}" 
                                             class="rounded-circle me-2" 
                                             width="32" height="32">
                                        <a href="/profile/${interview.interviewer.username}" class="text-decoration-none">
                                            ${interview.interviewer.username}
                                        </a>
                                    </div>
                                </div>
                                
                                <div class="col-md-6">
                                    <h5>Interviewee</h5>
                                    <div class="d-flex align-items-center">
                                        ${interview.interviewee.id ? `
                                            <img src="${interview.interviewee.avatar_url || '/assets/default-avatar.png'}" 
                                                 class="rounded-circle me-2" 
                                                 width="32" height="32">
                                            <a href="/profile/${interview.interviewee.username}" class="text-decoration-none">
                                                ${interview.interviewee.name}
                                            </a>
                                        ` : `
                                            <div class="d-flex align-items-center">
                                                <div class="bg-light rounded-circle me-2 d-flex align-items-center justify-content-center" 
                                                     style="width: 32px; height: 32px;">
                                                    <i class="fas fa-user text-muted"></i>
                                                </div>
                                                <span>${interview.interviewee.name}</span>
                                            </div>
                                        `}
                                    </div>
                                    ${interview.interviewee.bio ? `
                                        <p class="text-muted small mt-2">${interview.interviewee.bio}</p>
                                    ` : ''}
                                </div>
                            </div>
                            
                            ${interview.description ? `
                                <div class="mb-4">
                                    <h5>Description</h5>
                                    <p>${interview.description}</p>
                                </div>
                            ` : ''}
                            
                            ${interview.tags && interview.tags.length > 0 ? `
                                <div class="mb-4">
                                    <h5>Tags</h5>
                                    <div class="d-flex flex-wrap gap-2">
                                        ${interview.tags.map(tag => `
                                            <span class="badge bg-light text-dark">#${tag}</span>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="comments-section mt-5">
                            <h4>Comments</h4>
                            <div class="alert alert-info">
                                <h6 class="alert-heading">Coming Soon</h6>
                                <p class="mb-0">Comments and discussion features will be available in the next update.</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-4">
                        ${this.getRelatedInterviews()}
                    </div>
                </div>
            </div>
        `;
    }

    getMediaPlayer() {
        const interview = this.interview;
        const primaryMedia = interview.media?.find(m => m.is_primary) || interview.media?.[0];
        
        if (!primaryMedia) {
            return `
                <div class="bg-light rounded d-flex align-items-center justify-content-center" style="height: 400px;">
                    <div class="text-center">
                        <i class="fas fa-video fa-3x text-muted mb-3"></i>
                        <p class="text-muted">No media available</p>
                    </div>
                </div>
            `;
        }
        
        switch (primaryMedia.type) {
            case 'video':
                return `
                    <video controls class="w-100 rounded" style="max-height: 500px;">
                        <source src="${primaryMedia.url}" type="${primaryMedia.mime_type}">
                        Your browser does not support the video tag.
                    </video>
                `;
                
            case 'audio':
                return `
                    <div class="bg-dark rounded p-4 text-center">
                        <i class="fas fa-microphone fa-3x text-white mb-3"></i>
                        <audio controls class="w-100">
                            <source src="${primaryMedia.url}" type="${primaryMedia.mime_type}">
                            Your browser does not support the audio tag.
                        </audio>
                    </div>
                `;
                
            default:
                return `
                    <div class="bg-light rounded p-4 text-center">
                        <i class="fas fa-file fa-3x text-muted mb-3"></i>
                        <p class="text-muted">Media file available for download</p>
                        <a href="${primaryMedia.url}" class="btn btn-primary" download>
                            <i class="fas fa-download me-2"></i>Download
                        </a>
                    </div>
                `;
        }
    }

    getRelatedInterviews() {
        return `
            <div class="card">
                <div class="card-header">
                    <h6 class="mb-0">Related Interviews</h6>
                </div>
                <div class="card-body">
                    <div class="alert alert-info">
                        <h6 class="alert-heading">Coming Soon</h6>
                        <p class="mb-0">Related interviews and recommendations will be available soon.</p>
                    </div>
                </div>
            </div>
        `;
    }

    getInterviewSidebar() {
        return ''; // Content is included in the main content area
    }

    setupEventListeners(container) {
        // Like button
        const likeBtn = container.querySelector('#like-btn');
        if (likeBtn) {
            likeBtn.addEventListener('click', () => this.handleLikeToggle(likeBtn));
        }

        // Share button
        const shareBtn = container.querySelector('#share-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => this.handleShare());
        }
    }

    async handleLikeToggle(button) {
        if (this.isLoading) return;

        try {
            this.isLoading = true;
            const isLiked = button.getAttribute('data-liked') === 'true';
            
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';

            let response;
            if (isLiked) {
                response = await API.delete(`/api/interviews/${this.interview.id}/like`);
            } else {
                response = await API.post(`/api/interviews/${this.interview.id}/like`);
            }

            if (response.success) {
                // Update button state
                const newLiked = !isLiked;
                button.setAttribute('data-liked', newLiked);
                button.className = `btn ${newLiked ? 'btn-danger' : 'btn-outline-danger'}`;
                button.innerHTML = `
                    <i class="fas fa-heart me-2"></i>
                    ${newLiked ? 'Unlike' : 'Like'}
                `;

                // Update like count in the header
                this.interview.like_count = response.data.like_count;
                this.updateLikeCount();
            }

        } catch (error) {
            console.error('Like toggle error:', error);
            // TODO: Show error message
        } finally {
            this.isLoading = false;
            button.disabled = false;
        }
    }

    handleShare() {
        const url = window.location.href;
        const title = this.interview.title;
        
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

    updateLikeCount() {
        const likeCountElement = document.querySelector('.fa-heart').parentNode;
        if (likeCountElement) {
            likeCountElement.innerHTML = `<i class="fas fa-heart me-1"></i>${this.interview.like_count || 0}`;
        }
    }

    getTypeIcon(type) {
        const icons = {
            'video': 'fa-video',
            'audio': 'fa-microphone',
            'text': 'fa-file-text'
        };
        return icons[type] || 'fa-file';
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
}

export default InterviewViewPage;
