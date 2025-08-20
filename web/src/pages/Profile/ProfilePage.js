import Auth from '../../services/auth.js';
import API from '../../services/api.js';
import Router from '../../utils/router.js';
import ProfileSharing from '../../components/ProfileSharing.js';

class ProfilePage {
    constructor() {
        this.user = null;
        this.currentUser = Auth.getCurrentUser();
        this.isOwnProfile = false;
        this.isLoading = false;
        this.followers = [];
        this.following = [];
        this.interviews = [];
        this.interviewsLoading = false;
        this.interviewsTotal = 0;
        this.profileSharing = null;
    }

    async render(container, props = {}) {
        const username = props.params?.username;
        
        if (!username) {
            Router.navigate('/404');
            return;
        }

        container.innerHTML = this.getLoadingHTML();
        
        try {
            await this.loadUserData(username);
            container.innerHTML = this.getHTML();
            this.setupEventListeners(container);
        } catch (error) {
            console.error('Failed to load profile:', error);

            // Handle privacy-related errors
            if (error.message && error.message.includes('private')) {
                container.innerHTML = this.getPrivateProfileHTML();
            } else {
                container.innerHTML = this.getErrorHTML();
            }
        }
    }

    async loadUserData(username) {
        const response = await API.getUser(username);
        
        if (!response.success) {
            throw new Error(response.message || 'User not found');
        }
        
        this.user = response.data;
        this.isOwnProfile = this.currentUser && this.currentUser.username === username;
    }

    getLoadingHTML() {
        return `
            <div class="container py-5">
                <div class="row justify-content-center">
                    <div class="col-12 text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading profile...</span>
                        </div>
                        <p class="mt-3">Loading profile...</p>
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
                        <h1 class="display-4 text-danger">Profile Not Found</h1>
                        <p class="lead">The user profile you're looking for doesn't exist.</p>
                        <a href="/explore" class="btn btn-primary">Explore Users</a>
                    </div>
                </div>
            </div>
        `;
    }

    getPrivateProfileHTML() {
        return `
            <div class="container py-5">
                <div class="row justify-content-center">
                    <div class="col-md-6 text-center">
                        <i class="fas fa-lock fa-3x text-muted mb-3"></i>
                        <h3>Private Profile</h3>
                        <p class="text-muted">This user's profile is private. You need to follow them to view their content.</p>
                        ${this.currentUser ? `
                            <div class="mt-4">
                                <p class="small text-muted">Want to connect? Try following them first!</p>
                                <a href="/discover" class="btn btn-primary">Discover Users</a>
                            </div>
                        ` : `
                            <div class="mt-4">
                                <p class="small text-muted">Sign in to follow users and view their content</p>
                                <a href="/login" class="btn btn-primary">Sign In</a>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    getHTML() {
        return `
            <div class="profile-page">
                ${this.getProfileHeader()}
                ${this.getProfileContent()}
            </div>
        `;
    }

    getProfileHeader() {
        const user = this.user;
        const isFollowing = user.is_following;
        
        return `
            <div class="profile-header bg-light">
                <div class="container py-5">
                    <div class="row align-items-center">
                        <div class="col-md-3 text-center">
                            <div class="profile-avatar-container position-relative">
                                <img src="${user.avatar_url || '/assets/default-avatar.png'}" 
                                     alt="${user.username}" 
                                     class="profile-avatar rounded-circle shadow"
                                     width="150" height="150"
                                     onerror="this.src='/assets/default-avatar.png'">
                                ${this.isOwnProfile ? `
                                    <button class="btn btn-sm btn-primary position-absolute bottom-0 end-0 rounded-circle" 
                                            id="change-avatar-btn"
                                            title="Change Avatar">
                                        <i class="fas fa-camera"></i>
                                    </button>
                                    <input type="file" id="avatar-upload" class="d-none" accept="image/*">
                                ` : ''}
                            </div>
                        </div>
                        
                        <div class="col-md-6">
                            <h1 class="profile-username mb-2">@${user.username}</h1>
                            <div class="profile-stats mb-3">
                                <span class="badge bg-secondary me-2">${user.role}</span>
                                ${user.verified ? '<span class="badge bg-success me-2"><i class="fas fa-check-circle"></i> Verified</span>' : ''}
                            </div>
                            
                            <div class="profile-counts d-flex gap-3 mb-3 flex-wrap">
                                <div class="text-center">
                                    <div class="fw-bold">${user.follower_count || 0}</div>
                                    <small class="text-muted">Followers</small>
                                </div>
                                <div class="text-center">
                                    <div class="fw-bold">${user.following_count || 0}</div>
                                    <small class="text-muted">Following</small>
                                </div>
                                <div class="text-center">
                                    <div class="fw-bold" id="interview-count">${user.interview_count || 0}</div>
                                    <small class="text-muted">Interviews</small>
                                </div>
                                <div class="text-center">
                                    <div class="fw-bold">${this.formatNumber(user.total_views || 0)}</div>
                                    <small class="text-muted">Total Views</small>
                                </div>
                                <div class="text-center">
                                    <div class="fw-bold">${this.formatNumber(user.total_likes || 0)}</div>
                                    <small class="text-muted">Total Likes</small>
                                </div>
                            </div>
                            
                            ${user.bio ? `<p class="profile-bio text-muted">${user.bio}</p>` : ''}
                        </div>
                        
                        <div class="col-md-3 text-center">
                            ${this.getProfileActions(isFollowing)}
                            <div id="profile-sharing-container" class="mt-2"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getProfileActions(isFollowing) {
        if (this.isOwnProfile) {
            return `
                <div class="d-grid gap-2">
                    <a href="/profile/${this.user.username}/edit" class="btn btn-outline-primary">
                        <i class="fas fa-cog me-2"></i>Edit Profile
                    </a>
                    <a href="/create" class="btn btn-primary">
                        <i class="fas fa-plus me-2"></i>Create Interview
                    </a>
                </div>
            `;
        }
        
        if (!this.currentUser) {
            return `
                <div class="d-grid gap-2">
                    <a href="/login" class="btn btn-primary">Login to Follow</a>
                </div>
            `;
        }
        
        return `
            <div class="d-grid gap-2">
                <button class="btn ${isFollowing ? 'btn-outline-danger' : 'btn-primary'}" 
                        id="follow-btn"
                        data-following="${isFollowing}">
                    <i class="fas ${isFollowing ? 'fa-user-minus' : 'fa-user-plus'} me-2"></i>
                    ${isFollowing ? 'Unfollow' : 'Follow'}
                </button>
                <button class="btn btn-outline-secondary">
                    <i class="fas fa-envelope me-2"></i>Message
                </button>
            </div>
        `;
    }

    getProfileContent() {
        return `
            <div class="container py-4">
                <div class="row">
                    <div class="col-md-8">
                        ${this.getInterviewsSection()}
                    </div>
                    <div class="col-md-4">
                        ${this.getStatsSection()}
                        ${this.getFollowersSection()}
                        ${this.getFollowingSection()}
                    </div>
                </div>
            </div>
        `;
    }

    getInterviewsSection() {
        return `
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Interviews (${this.interviewsTotal || 0})</h5>
                    <div class="d-flex gap-2">
                        ${this.isOwnProfile ? `
                            <select class="form-select form-select-sm" id="interview-status-filter" style="width: auto;">
                                <option value="published">Published</option>
                                <option value="draft">Drafts</option>
                                <option value="archived">Archived</option>
                            </select>
                        ` : ''}
                        ${this.isOwnProfile ? '<a href="/create" class="btn btn-sm btn-primary">Create New</a>' : ''}
                    </div>
                </div>
                <div class="card-body">
                    <div id="interviews-list">
                        ${this.interviewsLoading ? this.getInterviewsLoadingHTML() : this.getInterviewsListHTML()}
                    </div>
                    ${this.interviews.length > 0 && this.interviews.length < this.interviewsTotal ? `
                        <div class="text-center mt-3">
                            <button class="btn btn-outline-primary" id="load-more-interviews">
                                Load More Interviews
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    getStatsSection() {
        const user = this.user;
        const joinDate = new Date(user.join_date || user.created_at);
        const lastActive = user.last_active ? new Date(user.last_active) : null;

        return `
            <div class="card mb-4">
                <div class="card-header">
                    <h6 class="mb-0">Profile Statistics</h6>
                </div>
                <div class="card-body">
                    <div class="row g-3">
                        <div class="col-6">
                            <div class="text-center p-2 bg-light rounded">
                                <div class="fw-bold text-primary">${this.formatNumber(user.total_views || 0)}</div>
                                <small class="text-muted">Total Views</small>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="text-center p-2 bg-light rounded">
                                <div class="fw-bold text-danger">${this.formatNumber(user.total_likes || 0)}</div>
                                <small class="text-muted">Total Likes</small>
                            </div>
                        </div>
                        ${user.interview_count > 0 ? `
                            <div class="col-6">
                                <div class="text-center p-2 bg-light rounded">
                                    <div class="fw-bold text-success">${this.formatNumber(user.avg_views_per_interview || 0)}</div>
                                    <small class="text-muted">Avg Views</small>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="text-center p-2 bg-light rounded">
                                    <div class="fw-bold text-warning">${user.engagement_rate || 0}%</div>
                                    <small class="text-muted">Engagement</small>
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <hr class="my-3">

                    <div class="small text-muted">
                        <div class="d-flex justify-content-between mb-1">
                            <span>Member since:</span>
                            <span>${joinDate.toLocaleDateString()}</span>
                        </div>
                        ${lastActive ? `
                            <div class="d-flex justify-content-between">
                                <span>Last active:</span>
                                <span>${this.getRelativeTime(lastActive)}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    getFollowersSection() {
        return `
            <div class="card mb-4">
                <div class="card-header">
                    <h6 class="mb-0">Followers (${this.user.follower_count || 0})</h6>
                </div>
                <div class="card-body">
                    <div id="followers-list">
                        <p class="text-muted text-center">Loading followers...</p>
                    </div>
                    ${this.user.follower_count > 3 ? `
                        <div class="text-center mt-3">
                            <button class="btn btn-sm btn-outline-primary" id="view-all-followers">
                                View All Followers
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    getFollowingSection() {
        return `
            <div class="card">
                <div class="card-header">
                    <h6 class="mb-0">Following (${this.user.following_count || 0})</h6>
                </div>
                <div class="card-body">
                    <div id="following-list">
                        <p class="text-muted text-center">Loading following...</p>
                    </div>
                    ${this.user.following_count > 3 ? `
                        <div class="text-center mt-3">
                            <button class="btn btn-sm btn-outline-primary" id="view-all-following">
                                View All Following
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    setupEventListeners(container) {
        // Follow/Unfollow button
        const followBtn = container.querySelector('#follow-btn');
        if (followBtn) {
            followBtn.addEventListener('click', () => this.handleFollowToggle(followBtn));
        }

        // Avatar upload
        const changeAvatarBtn = container.querySelector('#change-avatar-btn');
        const avatarUpload = container.querySelector('#avatar-upload');
        
        if (changeAvatarBtn && avatarUpload) {
            changeAvatarBtn.addEventListener('click', () => avatarUpload.click());
            avatarUpload.addEventListener('change', (e) => this.handleAvatarUpload(e));
        }

        // Load followers and following
        this.loadFollowers();
        this.loadFollowing();

        // Load interviews
        this.loadInterviews();

        // Interview status filter (for own profile)
        const statusFilter = container.querySelector('#interview-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.handleStatusFilterChange());
        }

        // Load more interviews button
        const loadMoreBtn = container.querySelector('#load-more-interviews');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.loadMoreInterviews());
        }

        // Initialize profile sharing
        this.initializeProfileSharing(container);
    }

    async handleFollowToggle(button) {
        if (this.isLoading) return;

        try {
            this.isLoading = true;
            const isFollowing = button.getAttribute('data-following') === 'true';
            
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';

            let response;
            if (isFollowing) {
                response = await Auth.unfollowUser(this.user.username);
            } else {
                response = await Auth.followUser(this.user.username);
            }

            if (response.success) {
                // Update button state
                const newFollowing = !isFollowing;
                button.setAttribute('data-following', newFollowing);
                button.className = `btn ${newFollowing ? 'btn-outline-danger' : 'btn-primary'}`;
                button.innerHTML = `
                    <i class="fas ${newFollowing ? 'fa-user-minus' : 'fa-user-plus'} me-2"></i>
                    ${newFollowing ? 'Unfollow' : 'Follow'}
                `;

                // Update follower count
                this.user.follower_count = response.data.follower_count;
                this.updateFollowerCount();
            }

        } catch (error) {
            console.error('Follow toggle error:', error);
            // TODO: Show error message
        } finally {
            this.isLoading = false;
            button.disabled = false;
        }
    }

    async handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const response = await Auth.uploadAvatar(file);

            if (response.success) {
                // Update avatar image
                const avatarImg = document.querySelector('.profile-avatar');
                if (avatarImg) {
                    avatarImg.src = response.data.url;
                }
                this.user.avatar_url = response.data.url;
            }

        } catch (error) {
            console.error('Avatar upload error:', error);
            // TODO: Show error message
        }
    }

    async loadFollowers() {
        try {
            const response = await API.getUserFollowers(this.user.username, { limit: 3 });
            
            if (response.success) {
                this.renderFollowersList(response.data.items);
            }
        } catch (error) {
            console.error('Failed to load followers:', error);
        }
    }

    async loadFollowing() {
        try {
            const response = await API.getUserFollowing(this.user.username, { limit: 3 });
            
            if (response.success) {
                this.renderFollowingList(response.data.items);
            }
        } catch (error) {
            console.error('Failed to load following:', error);
        }
    }

    renderFollowersList(followers) {
        const container = document.getElementById('followers-list');
        
        if (followers.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">No followers yet</p>';
            return;
        }

        container.innerHTML = followers.map(user => `
            <div class="d-flex align-items-center mb-2">
                <img src="${user.avatar_url || '/assets/default-avatar.png'}" 
                     alt="${user.username}" 
                     class="rounded-circle me-2" 
                     width="32" height="32">
                <a href="/profile/${user.username}" class="text-decoration-none">
                    <small class="fw-medium">${user.username}</small>
                </a>
            </div>
        `).join('');
    }

    renderFollowingList(following) {
        const container = document.getElementById('following-list');
        
        if (following.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">Not following anyone yet</p>';
            return;
        }

        container.innerHTML = following.map(user => `
            <div class="d-flex align-items-center mb-2">
                <img src="${user.avatar_url || '/assets/default-avatar.png'}" 
                     alt="${user.username}" 
                     class="rounded-circle me-2" 
                     width="32" height="32">
                <a href="/profile/${user.username}" class="text-decoration-none">
                    <small class="fw-medium">${user.username}</small>
                </a>
            </div>
        `).join('');
    }

    updateFollowerCount() {
        const countElement = document.querySelector('.profile-counts .fw-bold');
        if (countElement) {
            countElement.textContent = this.user.follower_count || 0;
        }
    }

    async loadInterviews(status = 'published', page = 1) {
        try {
            this.interviewsLoading = true;
            this.updateInterviewsList();

            const params = { page, limit: 6 };
            if (this.isOwnProfile && status) {
                params.status = status;
            }

            const response = await API.getUserInterviews(this.user.username, params);

            if (response.success) {
                if (page === 1) {
                    this.interviews = response.data.items || [];
                } else {
                    this.interviews = [...this.interviews, ...(response.data.items || [])];
                }
                this.interviewsTotal = response.data.total || 0;
                this.updateInterviewCount();
                this.updateInterviewsList();
            }
        } catch (error) {
            console.error('Failed to load interviews:', error);

            // Handle privacy errors
            if (error.message && error.message.includes('private')) {
                this.interviews = [];
                this.interviewsTotal = 0;
                this.updateInterviewsList();
            }
        } finally {
            this.interviewsLoading = false;
        }
    }

    getInterviewsLoadingHTML() {
        return `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading interviews...</span>
                </div>
                <p class="mt-2 text-muted">Loading interviews...</p>
            </div>
        `;
    }

    getInterviewsListHTML() {
        if (this.interviews.length === 0) {
            // Check if this might be due to privacy settings
            const isPrivacyRestricted = !this.isOwnProfile && this.user &&
                                      (this.user.interview_visibility === 'private' ||
                                       this.user.interview_visibility === 'followers');

            if (isPrivacyRestricted) {
                return `
                    <div class="text-center py-4">
                        <i class="fas fa-lock fa-3x text-muted mb-3"></i>
                        <h6 class="text-muted">Private Interviews</h6>
                        <p class="text-muted mb-0">
                            This user's interviews are ${this.user.interview_visibility === 'private' ? 'private' : 'only visible to followers'}.
                        </p>
                        ${this.user.interview_visibility === 'followers' && this.currentUser ? `
                            <p class="text-muted small mt-2">Follow this user to see their interviews!</p>
                        ` : ''}
                    </div>
                `;
            }

            return `
                <div class="text-center py-4">
                    <i class="fas fa-microphone-alt fa-3x text-muted mb-3"></i>
                    <h6 class="text-muted">No interviews yet</h6>
                    <p class="text-muted mb-0">
                        ${this.isOwnProfile ? 'Create your first interview to get started!' : 'This user hasn\'t published any interviews yet.'}
                    </p>
                    ${this.isOwnProfile ? '<a href="/create" class="btn btn-primary mt-3">Create Interview</a>' : ''}
                </div>
            `;
        }

        return `
            <div class="row">
                ${this.interviews.map(interview => this.getInterviewCardHTML(interview)).join('')}
            </div>
        `;
    }

    getInterviewCardHTML(interview) {
        const statusBadge = interview.status !== 'published' ? `
            <span class="badge bg-${interview.status === 'draft' ? 'warning' : 'secondary'} position-absolute top-0 end-0 m-2">
                ${interview.status}
            </span>
        ` : '';

        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 interview-card position-relative">
                    ${statusBadge}
                    <div class="card-img-top position-relative" style="height: 200px; background: #f8f9fa;">
                        ${interview.thumbnail_url ? `
                            <img src="${interview.thumbnail_url}"
                                 alt="${interview.title}"
                                 class="w-100 h-100 object-fit-cover">
                        ` : `
                            <div class="d-flex align-items-center justify-content-center h-100">
                                <i class="fas fa-${interview.type === 'video' ? 'video' : interview.type === 'audio' ? 'microphone' : 'file-text'} fa-3x text-muted"></i>
                            </div>
                        `}
                        <div class="position-absolute bottom-0 start-0 m-2">
                            <span class="badge bg-dark bg-opacity-75">
                                <i class="fas fa-${interview.type === 'video' ? 'video' : interview.type === 'audio' ? 'microphone' : 'file-text'} me-1"></i>
                                ${interview.type}
                            </span>
                        </div>
                        ${interview.duration ? `
                            <div class="position-absolute bottom-0 end-0 m-2">
                                <span class="badge bg-dark bg-opacity-75">
                                    ${this.formatDuration(interview.duration)}
                                </span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="card-body">
                        <h6 class="card-title">${interview.title}</h6>
                        <p class="card-text text-muted small">
                            ${interview.description ? interview.description.substring(0, 100) + (interview.description.length > 100 ? '...' : '') : 'No description'}
                        </p>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                ${new Date(interview.created_at).toLocaleDateString()}
                            </small>
                            <div class="d-flex gap-2">
                                ${interview.like_count ? `
                                    <small class="text-muted">
                                        <i class="fas fa-heart me-1"></i>${interview.like_count}
                                    </small>
                                ` : ''}
                                ${interview.view_count ? `
                                    <small class="text-muted">
                                        <i class="fas fa-eye me-1"></i>${interview.view_count}
                                    </small>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="card-footer bg-transparent">
                        <div class="d-flex gap-2">
                            <a href="/interview/${interview.id}" class="btn btn-sm btn-outline-primary flex-fill">
                                <i class="fas fa-play me-1"></i>View
                            </a>
                            ${this.isOwnProfile ? `
                                <a href="/interview/${interview.id}/edit" class="btn btn-sm btn-outline-secondary">
                                    <i class="fas fa-edit"></i>
                                </a>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    updateInterviewsList() {
        const container = document.getElementById('interviews-list');
        if (container) {
            container.innerHTML = this.interviewsLoading ? this.getInterviewsLoadingHTML() : this.getInterviewsListHTML();
        }
    }

    updateInterviewCount() {
        const countElement = document.getElementById('interview-count');
        if (countElement) {
            countElement.textContent = this.interviewsTotal || this.user.interview_count || 0;
        }
    }

    async handleStatusFilterChange() {
        const statusFilter = document.getElementById('interview-status-filter');
        if (statusFilter) {
            await this.loadInterviews(statusFilter.value, 1);
        }
    }

    async loadMoreInterviews() {
        const statusFilter = document.getElementById('interview-status-filter');
        const status = statusFilter ? statusFilter.value : 'published';
        const nextPage = Math.floor(this.interviews.length / 6) + 1;

        await this.loadInterviews(status, nextPage);
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    getRelativeTime(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) {
            return 'Just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 2592000) {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    initializeProfileSharing(container) {
        const sharingContainer = container.querySelector('#profile-sharing-container');
        if (sharingContainer && this.user) {
            this.profileSharing = new ProfileSharing(this.user);
            this.profileSharing.render(sharingContainer);
        }
    }
}

export default ProfilePage;
