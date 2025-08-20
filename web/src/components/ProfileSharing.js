import API from '../services/api.js';

export default class ProfileSharing {
    constructor(user) {
        this.user = user;
        this.profileUrl = `${window.location.origin}/profile/${user.username}`;
        this.isOpen = false;
        this.shareStats = {
            shares_today: 0,
            total_shares: 0,
            profile_views: 0
        };
    }

    async render(container) {
        container.innerHTML = this.getHTML();
        this.setupEventListeners(container);
        await this.loadShareStats();
    }

    getHTML() {
        return `
            <div class="profile-sharing">
                <button class="btn btn-outline-primary btn-sm" id="share-profile-btn">
                    <i class="fas fa-share-alt me-1"></i>Share Profile
                </button>
                
                <!-- Share Modal -->
                <div class="modal fade" id="shareProfileModal" tabindex="-1" aria-labelledby="shareProfileModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="shareProfileModalLabel">
                                    <i class="fas fa-share-alt me-2"></i>Share Profile
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                ${this.getShareContentHTML()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getShareContentHTML() {
        return `
            <div class="share-content">
                <!-- Profile Preview -->
                <div class="profile-preview mb-4">
                    <div class="d-flex align-items-center">
                        <img src="${this.user.avatar_url || '/assets/default-avatar.png'}" 
                             alt="${this.user.username}" 
                             class="rounded-circle me-3" 
                             width="60" height="60"
                             onerror="this.src='/assets/default-avatar.png'">
                        <div>
                            <h6 class="mb-1">${this.user.username}</h6>
                            ${this.user.bio ? `<p class="text-muted small mb-0">${this.user.bio.length > 100 ? this.user.bio.substring(0, 100) + '...' : this.user.bio}</p>` : ''}
                            <small class="text-muted">${this.user.role || 'User'}</small>
                        </div>
                    </div>
                </div>

                <!-- Direct Link Sharing -->
                <div class="share-section mb-4">
                    <h6 class="mb-3">
                        <i class="fas fa-link me-2 text-primary"></i>Direct Link
                    </h6>
                    <div class="input-group">
                        <input type="text" class="form-control" id="profile-url-input" 
                               value="${this.profileUrl}" readonly>
                        <button class="btn btn-outline-secondary" type="button" id="copy-url-btn">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    <small class="text-muted">Copy this link to share the profile directly</small>
                </div>

                <!-- Social Media Sharing -->
                <div class="share-section mb-4">
                    <h6 class="mb-3">
                        <i class="fas fa-share-nodes me-2 text-success"></i>Social Media
                    </h6>
                    <div class="social-share-buttons">
                        <div class="row g-2">
                            <div class="col-6">
                                <button class="btn btn-primary w-100 social-share-btn" 
                                        data-platform="facebook">
                                    <i class="fab fa-facebook-f me-2"></i>Facebook
                                </button>
                            </div>
                            <div class="col-6">
                                <button class="btn btn-info w-100 social-share-btn" 
                                        data-platform="twitter">
                                    <i class="fab fa-twitter me-2"></i>Twitter
                                </button>
                            </div>
                            <div class="col-6">
                                <button class="btn btn-primary w-100 social-share-btn" 
                                        data-platform="linkedin">
                                    <i class="fab fa-linkedin-in me-2"></i>LinkedIn
                                </button>
                            </div>
                            <div class="col-6">
                                <button class="btn btn-success w-100 social-share-btn" 
                                        data-platform="whatsapp">
                                    <i class="fab fa-whatsapp me-2"></i>WhatsApp
                                </button>
                            </div>
                            <div class="col-6">
                                <button class="btn btn-danger w-100 social-share-btn" 
                                        data-platform="reddit">
                                    <i class="fab fa-reddit-alien me-2"></i>Reddit
                                </button>
                            </div>
                            <div class="col-6">
                                <button class="btn btn-dark w-100 social-share-btn" 
                                        data-platform="email">
                                    <i class="fas fa-envelope me-2"></i>Email
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Embed Code -->
                <div class="share-section mb-4">
                    <h6 class="mb-3">
                        <i class="fas fa-code me-2 text-info"></i>Embed Profile
                    </h6>
                    <div class="embed-section">
                        <div class="mb-3">
                            <label for="embed-code" class="form-label small">Embed Code</label>
                            <textarea class="form-control" id="embed-code" rows="4" readonly>${this.getEmbedCode()}</textarea>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-outline-primary btn-sm" id="copy-embed-btn">
                                <i class="fas fa-copy me-1"></i>Copy Code
                            </button>
                            <button class="btn btn-outline-secondary btn-sm" id="preview-embed-btn">
                                <i class="fas fa-eye me-1"></i>Preview
                            </button>
                        </div>
                    </div>
                    <small class="text-muted d-block mt-2">
                        Embed this profile card on your website or blog
                    </small>
                </div>

                <!-- QR Code -->
                <div class="share-section mb-4">
                    <h6 class="mb-3">
                        <i class="fas fa-qrcode me-2 text-warning"></i>QR Code
                    </h6>
                    <div class="text-center">
                        <div id="qr-code-container" class="mb-3">
                            <div class="qr-placeholder bg-light border rounded d-flex align-items-center justify-content-center" 
                                 style="width: 200px; height: 200px; margin: 0 auto;">
                                <div class="text-center">
                                    <i class="fas fa-qrcode fa-3x text-muted mb-2"></i>
                                    <p class="text-muted small mb-0">Click to generate QR code</p>
                                </div>
                            </div>
                        </div>
                        <button class="btn btn-outline-primary btn-sm" id="generate-qr-btn">
                            <i class="fas fa-qrcode me-1"></i>Generate QR Code
                        </button>
                        <button class="btn btn-outline-secondary btn-sm ms-2" id="download-qr-btn" style="display: none;">
                            <i class="fas fa-download me-1"></i>Download
                        </button>
                    </div>
                    <small class="text-muted d-block text-center mt-2">
                        Scan with a phone camera to open the profile
                    </small>
                </div>

                <!-- Share Statistics -->
                <div class="share-section">
                    <h6 class="mb-3">
                        <i class="fas fa-chart-line me-2 text-info"></i>Share Analytics
                    </h6>
                    <div class="row text-center" id="share-stats-container">
                        <div class="col-4">
                            <div class="stat-item">
                                <div class="stat-number h5 mb-1 text-primary" id="shares-today">${this.shareStats.shares_today}</div>
                                <div class="stat-label small text-muted">Shares Today</div>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="stat-item">
                                <div class="stat-number h5 mb-1 text-success" id="total-shares">${this.shareStats.total_shares}</div>
                                <div class="stat-label small text-muted">Total Shares</div>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="stat-item">
                                <div class="stat-number h5 mb-1 text-warning" id="profile-views">${this.shareStats.profile_views}</div>
                                <div class="stat-label small text-muted">Profile Views</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners(container) {
        // Share button to open modal
        const shareBtn = container.querySelector('#share-profile-btn');
        shareBtn.addEventListener('click', () => {
            const modal = new bootstrap.Modal(container.querySelector('#shareProfileModal'));
            modal.show();
        });

        // Copy URL button
        const copyBtn = container.querySelector('#copy-url-btn');
        copyBtn.addEventListener('click', () => this.copyProfileUrl());

        // Social media share buttons
        const socialBtns = container.querySelectorAll('.social-share-btn');
        socialBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const platform = btn.dataset.platform;
                this.shareToSocialMedia(platform);
            });
        });

        // QR Code generation
        const generateQrBtn = container.querySelector('#generate-qr-btn');
        generateQrBtn.addEventListener('click', () => this.generateQRCode());

        // QR Code download
        const downloadQrBtn = container.querySelector('#download-qr-btn');
        downloadQrBtn.addEventListener('click', () => this.downloadQRCode());

        // Embed code functionality
        const copyEmbedBtn = container.querySelector('#copy-embed-btn');
        copyEmbedBtn.addEventListener('click', () => this.copyEmbedCode());

        const previewEmbedBtn = container.querySelector('#preview-embed-btn');
        previewEmbedBtn.addEventListener('click', () => this.previewEmbed());
    }

    async copyProfileUrl() {
        try {
            await navigator.clipboard.writeText(this.profileUrl);
            this.showToast('success', 'Profile link copied to clipboard!');
            
            // Update copy button temporarily
            const copyBtn = document.querySelector('#copy-url-btn');
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check text-success"></i>';
            copyBtn.disabled = true;
            
            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
                copyBtn.disabled = false;
            }, 2000);
            
        } catch (error) {
            // Fallback for older browsers
            const input = document.querySelector('#profile-url-input');
            input.select();
            document.execCommand('copy');
            this.showToast('success', 'Profile link copied to clipboard!');
        }
    }

    shareToSocialMedia(platform) {
        const shareText = `Check out ${this.user.username}'s profile on Interviews.tv`;
        const shareUrl = this.profileUrl;
        
        let url = '';
        
        switch (platform) {
            case 'facebook':
                url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
                break;
            case 'twitter':
                url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
                break;
            case 'linkedin':
                url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
                break;
            case 'whatsapp':
                url = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
                break;
            case 'reddit':
                url = `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`;
                break;
            case 'email':
                url = `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`;
                break;
        }
        
        if (url) {
            window.open(url, '_blank', 'width=600,height=400');
            this.trackShare(platform);
        }
    }

    generateQRCode() {
        const container = document.querySelector('#qr-code-container');
        const generateBtn = document.querySelector('#generate-qr-btn');
        const downloadBtn = document.querySelector('#download-qr-btn');
        
        // Show loading state
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Generating...';
        
        // Use QR.js library or API service
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(this.profileUrl)}`;
        
        container.innerHTML = `
            <img src="${qrCodeUrl}" 
                 alt="QR Code for ${this.user.username}'s profile" 
                 class="border rounded"
                 style="width: 200px; height: 200px;"
                 onload="this.style.opacity='1'"
                 style="opacity: 0; transition: opacity 0.3s;">
        `;
        
        // Reset button and show download option
        setTimeout(() => {
            generateBtn.innerHTML = '<i class="fas fa-sync me-1"></i>Regenerate';
            generateBtn.disabled = false;
            downloadBtn.style.display = 'inline-block';
        }, 1000);
    }

    downloadQRCode() {
        const qrImage = document.querySelector('#qr-code-container img');
        if (qrImage) {
            const link = document.createElement('a');
            link.download = `${this.user.username}-profile-qr.png`;
            link.href = qrImage.src;
            link.click();
            
            this.showToast('success', 'QR code downloaded successfully!');
        }
    }

    async trackShare(platform) {
        try {
            // Track sharing analytics via API
            await API.trackProfileShare(this.user.username, platform);

            // Update local stats
            this.shareStats.shares_today++;
            this.shareStats.total_shares++;
            this.updateShareStats();

            this.showToast('success', `Profile shared via ${platform}!`);
        } catch (error) {
            console.error('Failed to track share:', error);
            this.showToast('success', `Profile shared via ${platform}!`); // Still show success to user
        }
    }

    showToast(type, message) {
        // Create toast notification
        const toastHtml = `
            <div class="toast align-items-center text-white bg-${type === 'success' ? 'success' : 'danger'} border-0" 
                 role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="fas fa-${type === 'success' ? 'check' : 'exclamation-triangle'} me-2"></i>
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                            data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;
        
        // Add to toast container or create one
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }
        
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        
        // Show toast
        const toastElement = toastContainer.lastElementChild;
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
        
        // Remove toast element after it's hidden
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    async loadShareStats() {
        try {
            const response = await API.getProfileShareStats(this.user.username);

            if (response.success) {
                this.shareStats = response.data;
                this.updateShareStats();
            }
        } catch (error) {
            // Silently fail for share stats - not critical functionality
            console.log('Could not load share stats (user may not own this profile)');
        }
    }

    updateShareStats() {
        const sharesToday = document.getElementById('shares-today');
        const totalShares = document.getElementById('total-shares');
        const profileViews = document.getElementById('profile-views');

        if (sharesToday) sharesToday.textContent = this.shareStats.shares_today;
        if (totalShares) totalShares.textContent = this.shareStats.total_shares;
        if (profileViews) profileViews.textContent = this.shareStats.profile_views;
    }

    getEmbedCode() {
        // Import ProfileCard for embed generation
        const embedHtml = `<!-- Interviews.tv Profile Card -->
<div id="interviewstv-profile-${this.user.username}"></div>
<script>
(function() {
    var profileData = ${JSON.stringify({
        username: this.user.username,
        avatar_url: this.user.avatar_url,
        bio: this.user.bio,
        role: this.user.role,
        verified: this.user.verified,
        follower_count: this.user.follower_count,
        following_count: this.user.following_count,
        interview_count: this.user.interview_count
    })};

    var container = document.getElementById('interviewstv-profile-${this.user.username}');
    if (container) {
        container.innerHTML = \`${this.getEmbeddableCardHTML().replace(/`/g, '\\`')}\`;
    }
})();
</script>`;

        return embedHtml;
    }

    getEmbeddableCardHTML() {
        const user = this.user;
        return `<div style="max-width: 300px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0 auto;">
    <div style="border: 1px solid #dee2e6; border-radius: 0.375rem; padding: 1rem; text-align: center; background: white; box-shadow: 0 0.125rem 0.25rem rgba(0,0,0,0.075);">
        <div style="margin-bottom: 1rem;">
            <img src="${user.avatar_url || '/assets/default-avatar.png'}"
                 alt="${user.username}"
                 style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid #e9ecef;"
                 onerror="this.src='/assets/default-avatar.png'">
        </div>

        <h5 style="margin: 0 0 0.5rem 0; font-size: 1.1rem; font-weight: 600; color: #212529;">
            @${user.username}
        </h5>

        <div style="margin-bottom: 1rem;">
            <span style="background: #6c757d; color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem;">
                ${user.role || 'User'}
            </span>
            ${user.verified ? '<span style="color: #198754; margin-left: 0.25rem; font-size: 0.75rem;">✓ Verified</span>' : ''}
        </div>

        ${user.bio ? `<p style="color: #6c757d; font-size: 0.875rem; margin-bottom: 1rem; line-height: 1.4;">
            ${user.bio.length > 100 ? user.bio.substring(0, 100) + '...' : user.bio}
        </p>` : ''}

        <div style="display: flex; justify-content: space-around; margin-bottom: 1rem; font-size: 0.875rem;">
            <div>
                <div style="font-weight: 600; color: #212529;">${user.follower_count || 0}</div>
                <div style="color: #6c757d; font-size: 0.75rem;">Followers</div>
            </div>
            <div>
                <div style="font-weight: 600; color: #212529;">${user.following_count || 0}</div>
                <div style="color: #6c757d; font-size: 0.75rem;">Following</div>
            </div>
            <div>
                <div style="font-weight: 600; color: #212529;">${user.interview_count || 0}</div>
                <div style="color: #6c757d; font-size: 0.75rem;">Interviews</div>
            </div>
        </div>

        <a href="${this.profileUrl}"
           style="display: inline-block; background: #0d6efd; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 0.25rem; font-size: 0.875rem; font-weight: 500;"
           target="_blank">
            View on Interviews.tv
        </a>
    </div>

    <div style="text-align: center; margin-top: 0.5rem; font-size: 0.75rem; color: #6c757d;">
        Powered by <a href="${window.location.origin}" style="color: #0d6efd; text-decoration: none;" target="_blank">Interviews.tv</a>
    </div>
</div>`;
    }

    async copyEmbedCode() {
        try {
            const embedCode = document.getElementById('embed-code').value;
            await navigator.clipboard.writeText(embedCode);
            this.showToast('success', 'Embed code copied to clipboard!');

            // Update copy button temporarily
            const copyBtn = document.querySelector('#copy-embed-btn');
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check text-success me-1"></i>Copied!';
            copyBtn.disabled = true;

            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
                copyBtn.disabled = false;
            }, 2000);

        } catch (error) {
            // Fallback for older browsers
            const textarea = document.getElementById('embed-code');
            textarea.select();
            document.execCommand('copy');
            this.showToast('success', 'Embed code copied to clipboard!');
        }
    }

    previewEmbed() {
        // Create a new window with the embed preview
        const previewWindow = window.open('', '_blank', 'width=400,height=600,scrollbars=yes');

        const previewHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Profile Embed Preview - ${this.user.username}</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        margin: 20px;
                        background: #f8f9fa;
                    }
                    .preview-header {
                        text-align: center;
                        margin-bottom: 20px;
                        padding: 10px;
                        background: white;
                        border-radius: 5px;
                        border: 1px solid #dee2e6;
                    }
                </style>
            </head>
            <body>
                <div class="preview-header">
                    <h3>Profile Embed Preview</h3>
                    <p>This is how the profile card will appear on external websites</p>
                </div>

                ${this.getEmbeddableCardHTML()}
            </body>
            </html>
        `;

        previewWindow.document.write(previewHtml);
        previewWindow.document.close();
    }
}
