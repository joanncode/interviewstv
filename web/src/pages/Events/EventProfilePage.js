import API from '../../services/api.js';
import Auth from '../../services/auth.js';
import Comments from '../../components/Comments.js';
import LikeButton from '../../components/LikeButton.js';

export default class EventProfilePage {
    constructor(eventId) {
        this.eventId = eventId;
        this.currentUser = Auth.getCurrentUser();
        this.event = null;
        this.interviews = [];
        this.isPromoter = false;
        this.isAttending = false;
        this.attendeeStatus = null;
        this.comments = null;
        this.likeButtons = new Map();
    }

    async render(container) {
        try {
            await this.loadEvent();
            container.innerHTML = this.getHTML();
            this.setupEventListeners(container);
            this.initializeComments(container);
            
            await Promise.all([
                this.loadEventInterviews(),
                this.checkAttendanceStatus(),
                this.initializeLikeButtons()
            ]);
            
        } catch (error) {
            console.error('Failed to render event profile:', error);
            this.showErrorState(container);
        }
    }

    async loadEvent() {
        const response = await API.get(`/api/events/${this.eventId}`);
        
        if (!response.success) {
            throw new Error(response.message || 'Event not found');
        }
        
        this.event = response.data;
        this.isPromoter = this.currentUser && this.currentUser.id === this.event.promoter_id;
        
        // Update page title
        document.title = `${this.event.title} - Event - Interviews.tv`;
    }

    async loadEventInterviews() {
        try {
            const response = await API.get(`/api/events/${this.eventId}/interviews`);
            
            if (response.success) {
                this.interviews = response.data.interviews;
                this.renderInterviews();
            }
        } catch (error) {
            console.error('Failed to load event interviews:', error);
        }
    }

    async checkAttendanceStatus() {
        if (!this.currentUser) return;

        try {
            const response = await API.get(`/api/events/${this.eventId}/attendance`);
            
            if (response.success) {
                this.isAttending = response.data.is_attending;
                this.attendeeStatus = response.data.status;
                this.updateAttendanceButton();
            }
        } catch (error) {
            console.error('Failed to check attendance status:', error);
        }
    }

    getHTML() {
        if (!this.event) {
            return `
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading event...</span>
                    </div>
                </div>
            `;
        }

        return `
            <div class="event-profile-page">
                <!-- Event Header -->
                <div class="event-header position-relative">
                    ${this.event.cover_image_url ? `
                        <div class="event-cover-image" 
                             style="background-image: url('${this.event.cover_image_url}'); 
                                    background-size: cover; 
                                    background-position: center; 
                                    height: 400px;">
                            <div class="overlay bg-dark bg-opacity-50 h-100 d-flex align-items-end">
                                <div class="container">
                                    <div class="row">
                                        <div class="col-lg-8">
                                            ${this.getEventHeaderContent()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ` : `
                        <div class="bg-primary text-white py-5">
                            <div class="container">
                                <div class="row">
                                    <div class="col-lg-8">
                                        ${this.getEventHeaderContent()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `}
                </div>

                <!-- Event Content -->
                <div class="container py-4">
                    <div class="row">
                        <!-- Main Content -->
                        <div class="col-lg-8">
                            <!-- Event Details -->
                            <div class="card mb-4">
                                <div class="card-header">
                                    <h5 class="mb-0">
                                        <i class="fas fa-info-circle me-2"></i>Event Details
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <strong>Date & Time:</strong><br>
                                            <i class="fas fa-calendar text-primary me-2"></i>
                                            ${this.event.formatted_start_date}
                                            ${this.event.end_date ? `<br><small class="text-muted">to ${this.event.formatted_end_date}</small>` : ''}
                                        </div>
                                        
                                        <div class="col-md-6 mb-3">
                                            <strong>Location:</strong><br>
                                            ${this.event.is_virtual ? `
                                                <i class="fas fa-video text-info me-2"></i>
                                                Virtual Event
                                                ${this.event.event_url ? `<br><small><a href="${this.event.event_url}" target="_blank">Join Event</a></small>` : ''}
                                            ` : `
                                                <i class="fas fa-map-marker-alt text-danger me-2"></i>
                                                ${this.event.location || 'Location TBD'}
                                            `}
                                        </div>
                                        
                                        <div class="col-md-6 mb-3">
                                            <strong>Event Type:</strong><br>
                                            <span class="badge bg-${this.getEventTypeColor(this.event.event_type)}">
                                                ${this.getEventTypeLabel(this.event.event_type)}
                                            </span>
                                        </div>
                                        
                                        <div class="col-md-6 mb-3">
                                            <strong>Price:</strong><br>
                                            ${this.event.ticket_price ? `
                                                <span class="h6 text-warning">$${this.event.ticket_price}</span>
                                            ` : `
                                                <span class="h6 text-success">Free</span>
                                            `}
                                        </div>
                                    </div>
                                    
                                    ${this.event.description ? `
                                        <div class="event-description mt-3">
                                            <strong>About this event:</strong>
                                            <p class="mt-2">${this.event.description}</p>
                                        </div>
                                    ` : ''}
                                    
                                    ${this.event.tags && this.event.tags.length > 0 ? `
                                        <div class="event-tags mt-3">
                                            <strong>Tags:</strong><br>
                                            ${this.event.tags.map(tag => `
                                                <span class="badge bg-light text-dark me-1">#${tag}</span>
                                            `).join('')}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>

                            <!-- Event Interviews -->
                            <div class="card mb-4">
                                <div class="card-header d-flex justify-content-between align-items-center">
                                    <h5 class="mb-0">
                                        <i class="fas fa-video me-2"></i>Event Interviews
                                    </h5>
                                    ${this.isPromoter ? `
                                        <button class="btn btn-sm btn-outline-primary" id="add-interview-btn">
                                            <i class="fas fa-plus me-1"></i>Add Interview
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
                                        <i class="fas fa-comments me-2"></i>Comments & Discussion
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <div id="comments-container"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Sidebar -->
                        <div class="col-lg-4">
                            <!-- RSVP Card -->
                            <div class="card mb-4">
                                <div class="card-header">
                                    <h6 class="mb-0">
                                        <i class="fas fa-users me-2"></i>Event Attendance
                                    </h6>
                                </div>
                                <div class="card-body text-center">
                                    <div class="attendance-stats mb-3">
                                        <div class="h4 text-primary">${this.event.attendee_count}</div>
                                        <small class="text-muted">People Attending</small>
                                        
                                        ${this.event.max_attendees ? `
                                            <div class="progress mt-2" style="height: 6px;">
                                                <div class="progress-bar" 
                                                     style="width: ${(this.event.attendee_count / this.event.max_attendees) * 100}%">
                                                </div>
                                            </div>
                                            <small class="text-muted">${this.event.max_attendees - this.event.attendee_count} spots left</small>
                                        ` : ''}
                                    </div>
                                    
                                    ${this.currentUser ? `
                                        <div class="rsvp-actions" id="rsvp-actions">
                                            <button class="btn btn-primary w-100" id="rsvp-btn">
                                                <i class="fas fa-calendar-plus me-2"></i>
                                                <span id="rsvp-text">RSVP</span>
                                            </button>
                                        </div>
                                    ` : `
                                        <a href="/login" class="btn btn-outline-primary w-100">
                                            <i class="fas fa-sign-in-alt me-2"></i>Login to RSVP
                                        </a>
                                    `}
                                </div>
                            </div>

                            <!-- Promoter Information -->
                            <div class="card mb-4">
                                <div class="card-header">
                                    <h6 class="mb-0">
                                        <i class="fas fa-user me-2"></i>Event Promoter
                                    </h6>
                                </div>
                                <div class="card-body">
                                    <div class="d-flex align-items-center">
                                        <img src="${this.event.promoter_avatar || '/assets/default-avatar.png'}" 
                                             class="rounded-circle me-3" 
                                             width="50" height="50" 
                                             alt="Promoter">
                                        <div>
                                            <h6 class="mb-1">
                                                <a href="/profile/${this.event.promoter_username}" 
                                                   class="text-decoration-none">
                                                    @${this.event.promoter_username}
                                                </a>
                                            </h6>
                                            <small class="text-muted">Event Promoter</small>
                                        </div>
                                    </div>
                                    
                                    ${this.isPromoter ? `
                                        <div class="mt-3">
                                            <a href="/events/${this.eventId}/edit" class="btn btn-outline-primary btn-sm w-100">
                                                <i class="fas fa-edit me-2"></i>Edit Event
                                            </a>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>

                            <!-- Event Actions -->
                            <div class="card mb-4">
                                <div class="card-header">
                                    <h6 class="mb-0">
                                        <i class="fas fa-bolt me-2"></i>Quick Actions
                                    </h6>
                                </div>
                                <div class="card-body">
                                    <div class="d-grid gap-2">
                                        <button class="btn btn-outline-secondary btn-sm" id="share-event-btn">
                                            <i class="fas fa-share me-2"></i>Share Event
                                        </button>
                                        
                                        ${this.event.event_url ? `
                                            <a href="${this.event.event_url}" 
                                               target="_blank" 
                                               class="btn btn-outline-primary btn-sm">
                                                <i class="fas fa-external-link-alt me-2"></i>Event Website
                                            </a>
                                        ` : ''}
                                        
                                        <a href="/events" class="btn btn-outline-secondary btn-sm">
                                            <i class="fas fa-calendar me-2"></i>Browse Events
                                        </a>
                                        
                                        ${this.currentUser ? `
                                            <a href="/events/create" class="btn btn-outline-primary btn-sm">
                                                <i class="fas fa-plus me-2"></i>Create Event
                                            </a>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>

                            <!-- Event Stats -->
                            <div class="card">
                                <div class="card-header">
                                    <h6 class="mb-0">
                                        <i class="fas fa-chart-bar me-2"></i>Event Statistics
                                    </h6>
                                </div>
                                <div class="card-body">
                                    <div class="stat-item d-flex justify-content-between mb-2">
                                        <span>Created:</span>
                                        <span>${this.formatDate(this.event.created_at)}</span>
                                    </div>
                                    <div class="stat-item d-flex justify-content-between mb-2">
                                        <span>Attendees:</span>
                                        <span class="badge bg-primary">${this.event.attendee_count}</span>
                                    </div>
                                    <div class="stat-item d-flex justify-content-between mb-2">
                                        <span>Interviews:</span>
                                        <span class="badge bg-success">${this.event.interview_count}</span>
                                    </div>
                                    <div class="stat-item d-flex justify-content-between">
                                        <span>Comments:</span>
                                        <span class="badge bg-info">${this.event.comment_count}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getEventHeaderContent() {
        return `
            <div class="event-header-content text-white">
                <div class="event-status mb-2">
                    ${this.getEventStatusBadge(this.event)}
                </div>
                
                <h1 class="display-4 fw-bold mb-3">${this.event.title}</h1>
                
                <div class="event-meta">
                    <div class="mb-2">
                        <i class="fas fa-calendar me-2"></i>
                        ${this.event.formatted_start_date}
                    </div>
                    
                    <div class="mb-2">
                        ${this.event.is_virtual ? `
                            <i class="fas fa-video me-2"></i>Virtual Event
                        ` : `
                            <i class="fas fa-map-marker-alt me-2"></i>
                            ${this.event.location || 'Location TBD'}
                        `}
                    </div>
                    
                    <div class="mb-2">
                        <i class="fas fa-user me-2"></i>
                        Hosted by @${this.event.promoter_username}
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
                    <h6>No interviews yet</h6>
                    <p class="text-muted small">
                        ${this.isPromoter ? 
                            'Add interviews to showcase content from your event.' :
                            'Check back later for interviews from this event.'
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

    initializeComments(container) {
        const commentsContainer = container.querySelector('#comments-container');
        if (commentsContainer) {
            this.comments = new Comments(commentsContainer, {
                entityType: 'event',
                entityId: this.eventId,
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
        // RSVP button
        const rsvpBtn = container.querySelector('#rsvp-btn');
        if (rsvpBtn) {
            rsvpBtn.addEventListener('click', () => {
                this.handleRSVP();
            });
        }

        // Share event button
        const shareBtn = container.querySelector('#share-event-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                this.shareEvent();
            });
        }

        // Add interview button (promoter only)
        const addInterviewBtn = container.querySelector('#add-interview-btn');
        if (addInterviewBtn) {
            addInterviewBtn.addEventListener('click', () => {
                this.showAddInterviewModal();
            });
        }
    }

    async handleRSVP() {
        if (!this.currentUser) {
            window.location.href = '/login';
            return;
        }

        try {
            const rsvpBtn = document.getElementById('rsvp-btn');
            const rsvpText = document.getElementById('rsvp-text');
            
            rsvpBtn.disabled = true;
            rsvpText.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';

            let response;
            if (this.isAttending) {
                response = await API.delete(`/api/events/${this.eventId}/rsvp`);
            } else {
                response = await API.post(`/api/events/${this.eventId}/rsvp`);
            }

            if (response.success) {
                this.isAttending = !this.isAttending;
                this.attendeeStatus = response.data.status;
                this.event.attendee_count = response.data.attendee_count;
                
                this.updateAttendanceButton();
                this.updateAttendanceStats();
                
                this.showToast('success', response.message);
            } else {
                this.showToast('error', response.message || 'Failed to update RSVP');
            }

        } catch (error) {
            console.error('RSVP error:', error);
            this.showToast('error', 'Failed to update RSVP');
        } finally {
            const rsvpBtn = document.getElementById('rsvp-btn');
            if (rsvpBtn) {
                rsvpBtn.disabled = false;
            }
        }
    }

    updateAttendanceButton() {
        const rsvpBtn = document.getElementById('rsvp-btn');
        const rsvpText = document.getElementById('rsvp-text');
        
        if (!rsvpBtn || !rsvpText) return;

        if (this.isAttending) {
            rsvpBtn.className = 'btn btn-success w-100';
            rsvpText.innerHTML = '<i class="fas fa-check me-2"></i>Attending';
            
            if (this.attendeeStatus === 'waitlist') {
                rsvpBtn.className = 'btn btn-warning w-100';
                rsvpText.innerHTML = '<i class="fas fa-clock me-2"></i>On Waitlist';
            }
        } else {
            rsvpBtn.className = 'btn btn-primary w-100';
            rsvpText.innerHTML = '<i class="fas fa-calendar-plus me-2"></i>RSVP';
        }
    }

    updateAttendanceStats() {
        const statsElement = document.querySelector('.attendance-stats .h4');
        if (statsElement) {
            statsElement.textContent = this.event.attendee_count;
        }

        // Update progress bar if max attendees is set
        if (this.event.max_attendees) {
            const progressBar = document.querySelector('.progress-bar');
            const spotsLeft = document.querySelector('.attendance-stats small:last-child');
            
            if (progressBar) {
                const percentage = (this.event.attendee_count / this.event.max_attendees) * 100;
                progressBar.style.width = `${percentage}%`;
            }
            
            if (spotsLeft) {
                spotsLeft.textContent = `${this.event.max_attendees - this.event.attendee_count} spots left`;
            }
        }
    }

    shareEvent() {
        const url = window.location.href;
        const title = `${this.event.title} - Event`;
        const text = `Join me at ${this.event.title} on Interviews.tv`;

        if (navigator.share) {
            navigator.share({
                title: title,
                text: text,
                url: url
            }).catch(console.error);
        } else {
            // Fallback to clipboard
            navigator.clipboard.writeText(url).then(() => {
                this.showToast('success', 'Event link copied to clipboard!');
            }).catch(() => {
                this.showToast('error', 'Failed to copy link');
            });
        }
    }

    showAddInterviewModal() {
        // This would show a modal to select and link interviews
        // For now, redirect to interview creation with event pre-selected
        window.location.href = `/interviews/create?event=${this.eventId}`;
    }

    updateEntityLikeStatus(entityType, entityId, data) {
        this.interviews.forEach(interview => {
            if (interview.id == entityId) {
                interview.is_liked = data.liked;
                interview.like_count = data.count;
            }
        });
    }

    getEventTypeLabel(type) {
        const labels = {
            'conference': 'Conference',
            'workshop': 'Workshop',
            'webinar': 'Webinar',
            'meetup': 'Meetup',
            'festival': 'Festival',
            'interview': 'Interview',
            'general': 'General'
        };
        return labels[type] || type;
    }

    getEventTypeColor(type) {
        const colors = {
            'conference': 'primary',
            'workshop': 'success',
            'webinar': 'info',
            'meetup': 'warning',
            'festival': 'danger',
            'interview': 'secondary',
            'general': 'dark'
        };
        return colors[type] || 'secondary';
    }

    getEventStatusBadge(event) {
        if (event.is_upcoming) {
            return '<span class="badge bg-success">Upcoming</span>';
        } else if (event.is_ongoing) {
            return '<span class="badge bg-warning">Live Now</span>';
        } else if (event.is_past) {
            return '<span class="badge bg-secondary">Past Event</span>';
        }
        return '';
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
        toast.className = `event-toast toast-${type}`;
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
                <h5>Event Not Found</h5>
                <p class="text-muted">The event you're looking for doesn't exist or has been removed.</p>
                <a href="/events" class="btn btn-primary">
                    <i class="fas fa-calendar me-2"></i>Browse Events
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
