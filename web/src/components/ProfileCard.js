export default class ProfileCard {
    constructor(user, options = {}) {
        this.user = user;
        this.options = {
            showStats: true,
            showBio: true,
            showFollowButton: true,
            compact: false,
            ...options
        };
    }

    render(container) {
        container.innerHTML = this.getHTML();
        this.setupEventListeners(container);
    }

    getHTML() {
        const { user, options } = this;
        
        return `
            <div class="profile-card ${options.compact ? 'profile-card-compact' : ''} card">
                <div class="card-body text-center">
                    <div class="profile-card-avatar mb-3">
                        <img src="${user.avatar_url || '/assets/default-avatar.png'}" 
                             alt="${user.username}" 
                             class="rounded-circle shadow-sm" 
                             width="${options.compact ? '80' : '120'}" 
                             height="${options.compact ? '80' : '120'}"
                             onerror="this.src='/assets/default-avatar.png'">
                        ${user.verified ? `
                            <div class="verified-badge position-absolute">
                                <i class="fas fa-check-circle text-primary"></i>
                            </div>
                        ` : ''}
                    </div>
                    
                    <h5 class="profile-card-username mb-1">
                        <a href="/profile/${user.username}" class="text-decoration-none">
                            @${user.username}
                        </a>
                    </h5>
                    
                    <div class="profile-card-role mb-3">
                        <span class="badge bg-secondary">${user.role || 'User'}</span>
                        ${user.verified ? '<span class="badge bg-success ms-1"><i class="fas fa-check-circle"></i> Verified</span>' : ''}
                    </div>
                    
                    ${options.showBio && user.bio ? `
                        <p class="profile-card-bio text-muted small mb-3">
                            ${options.compact && user.bio.length > 100 ? 
                                user.bio.substring(0, 100) + '...' : 
                                user.bio}
                        </p>
                    ` : ''}
                    
                    ${options.showStats ? `
                        <div class="profile-card-stats row text-center mb-3">
                            <div class="col">
                                <div class="fw-bold">${user.follower_count || 0}</div>
                                <small class="text-muted">Followers</small>
                            </div>
                            <div class="col">
                                <div class="fw-bold">${user.following_count || 0}</div>
                                <small class="text-muted">Following</small>
                            </div>
                            <div class="col">
                                <div class="fw-bold">${user.interview_count || 0}</div>
                                <small class="text-muted">Interviews</small>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${options.showFollowButton ? this.getFollowButtonHTML() : ''}
                    
                    <div class="profile-card-actions mt-3">
                        <a href="/profile/${user.username}" class="btn btn-outline-primary btn-sm">
                            View Profile
                        </a>
                        <button class="btn btn-outline-secondary btn-sm ms-2 share-profile-btn" 
                                data-username="${user.username}">
                            <i class="fas fa-share-alt"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getFollowButtonHTML() {
        // This would need to be implemented based on current user and follow status
        // For now, just return a placeholder
        return `
            <button class="btn btn-primary btn-sm follow-btn" data-username="${this.user.username}">
                <i class="fas fa-user-plus me-1"></i>Follow
            </button>
        `;
    }

    setupEventListeners(container) {
        // Follow button
        const followBtn = container.querySelector('.follow-btn');
        if (followBtn) {
            followBtn.addEventListener('click', () => this.handleFollow());
        }

        // Share button
        const shareBtn = container.querySelector('.share-profile-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => this.handleShare());
        }
    }

    handleFollow() {
        // Implement follow functionality
        console.log('Follow user:', this.user.username);
    }

    handleShare() {
        // Trigger profile sharing
        const event = new CustomEvent('shareProfile', {
            detail: { user: this.user }
        });
        document.dispatchEvent(event);
    }

    // Static method to create embeddable profile cards
    static createEmbeddableCard(user, options = {}) {
        const cardOptions = {
            showFollowButton: false,
            compact: true,
            ...options
        };

        return `
            <div class="embeddable-profile-card" style="max-width: 300px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <div style="border: 1px solid #dee2e6; border-radius: 0.375rem; padding: 1rem; text-align: center; background: white;">
                    <div style="margin-bottom: 1rem;">
                        <img src="${user.avatar_url || '/assets/default-avatar.png'}" 
                             alt="${user.username}" 
                             style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid #e9ecef;"
                             onerror="this.src='/assets/default-avatar.png'">
                    </div>
                    
                    <h5 style="margin: 0 0 0.5rem 0; font-size: 1.1rem; font-weight: 600;">
                        @${user.username}
                    </h5>
                    
                    <div style="margin-bottom: 1rem;">
                        <span style="background: #6c757d; color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem;">
                            ${user.role || 'User'}
                        </span>
                        ${user.verified ? '<span style="color: #198754; margin-left: 0.25rem;">✓ Verified</span>' : ''}
                    </div>
                    
                    ${user.bio ? `
                        <p style="color: #6c757d; font-size: 0.875rem; margin-bottom: 1rem; line-height: 1.4;">
                            ${user.bio.length > 100 ? user.bio.substring(0, 100) + '...' : user.bio}
                        </p>
                    ` : ''}
                    
                    <div style="display: flex; justify-content: space-around; margin-bottom: 1rem; font-size: 0.875rem;">
                        <div>
                            <div style="font-weight: 600;">${user.follower_count || 0}</div>
                            <div style="color: #6c757d;">Followers</div>
                        </div>
                        <div>
                            <div style="font-weight: 600;">${user.following_count || 0}</div>
                            <div style="color: #6c757d;">Following</div>
                        </div>
                        <div>
                            <div style="font-weight: 600;">${user.interview_count || 0}</div>
                            <div style="color: #6c757d;">Interviews</div>
                        </div>
                    </div>
                    
                    <a href="${window.location.origin}/profile/${user.username}" 
                       style="display: inline-block; background: #0d6efd; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 0.25rem; font-size: 0.875rem;"
                       target="_blank">
                        View on Interviews.tv
                    </a>
                </div>
                
                <div style="text-align: center; margin-top: 0.5rem; font-size: 0.75rem; color: #6c757d;">
                    Powered by <a href="${window.location.origin}" style="color: #0d6efd; text-decoration: none;">Interviews.tv</a>
                </div>
            </div>
        `;
    }

    // Generate meta tags for social media sharing
    static generateMetaTags(user) {
        const profileUrl = `${window.location.origin}/profile/${user.username}`;
        const title = `${user.username} on Interviews.tv`;
        const description = user.bio || `Check out ${user.username}'s profile on Interviews.tv - ${user.role || 'User'} with ${user.follower_count || 0} followers`;
        const imageUrl = user.avatar_url || `${window.location.origin}/assets/default-avatar.png`;

        return {
            // Open Graph (Facebook, LinkedIn)
            'og:title': title,
            'og:description': description,
            'og:image': imageUrl,
            'og:url': profileUrl,
            'og:type': 'profile',
            'og:site_name': 'Interviews.tv',
            
            // Twitter Card
            'twitter:card': 'summary',
            'twitter:title': title,
            'twitter:description': description,
            'twitter:image': imageUrl,
            'twitter:url': profileUrl,
            
            // General
            'description': description,
            'keywords': `${user.username}, interviews, ${user.role || 'user'}, video interviews, professional networking`
        };
    }
}
