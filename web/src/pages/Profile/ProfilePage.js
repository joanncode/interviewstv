import Auth from '../../services/auth.js';
import API from '../../services/api.js';
import Router from '../../utils/router.js';

class ProfilePage {
    constructor() {
        this.user = null;
        this.currentUser = Auth.getCurrentUser();
        this.isOwnProfile = false;
        this.isLoading = false;
        this.followers = [];
        this.following = [];
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
            container.innerHTML = this.getErrorHTML();
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
                            
                            <div class="profile-counts d-flex gap-4 mb-3">
                                <div class="text-center">
                                    <div class="fw-bold">${user.follower_count || 0}</div>
                                    <small class="text-muted">Followers</small>
                                </div>
                                <div class="text-center">
                                    <div class="fw-bold">${user.following_count || 0}</div>
                                    <small class="text-muted">Following</small>
                                </div>
                                <div class="text-center">
                                    <div class="fw-bold">0</div>
                                    <small class="text-muted">Interviews</small>
                                </div>
                            </div>
                            
                            ${user.bio ? `<p class="profile-bio text-muted">${user.bio}</p>` : ''}
                        </div>
                        
                        <div class="col-md-3 text-center">
                            ${this.getProfileActions(isFollowing)}
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
                    <h5 class="mb-0">Interviews</h5>
                    ${this.isOwnProfile ? '<a href="/create" class="btn btn-sm btn-primary">Create New</a>' : ''}
                </div>
                <div class="card-body">
                    <div class="alert alert-info">
                        <h6 class="alert-heading">Coming Soon</h6>
                        <p class="mb-0">Interview listings and management will be available in the next update.</p>
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
}

export default ProfilePage;
