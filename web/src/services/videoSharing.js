class VideoSharing {
    constructor() {
        this.baseUrl = window.location.origin;
        this.apiUrl = '/api/videos';
    }

    /**
     * Create a share link for a video
     */
    async createShareLink(recordingId, options = {}) {
        try {
            const response = await fetch(`${this.apiUrl}/${recordingId}/share`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({
                    privacy: options.privacy || 'unlisted',
                    expiry_days: options.expiryDays || 30,
                    password: options.password || null,
                    allow_download: options.allowDownload || false,
                    allow_embedding: options.allowEmbedding || true
                })
            });

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message);
            }

            return result.data;

        } catch (error) {
            console.error('Error creating share link:', error);
            throw error;
        }
    }

    /**
     * Get user's share links
     */
    async getUserShares(page = 1, limit = 20) {
        try {
            const response = await fetch(`${this.apiUrl}/shares?page=${page}&limit=${limit}`, {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message);
            }

            return result.data;

        } catch (error) {
            console.error('Error getting user shares:', error);
            throw error;
        }
    }

    /**
     * Update share settings
     */
    async updateShare(shareId, updates) {
        try {
            const response = await fetch(`${this.apiUrl}/shares/${shareId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify(updates)
            });

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message);
            }

            return result;

        } catch (error) {
            console.error('Error updating share:', error);
            throw error;
        }
    }

    /**
     * Revoke a share link
     */
    async revokeShare(shareId) {
        try {
            const response = await fetch(`${this.apiUrl}/shares/${shareId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message);
            }

            return result;

        } catch (error) {
            console.error('Error revoking share:', error);
            throw error;
        }
    }

    /**
     * Get embed code for a video
     */
    async getEmbedCode(recordingId, options = {}) {
        try {
            const params = new URLSearchParams({
                width: options.width || 640,
                height: options.height || 360,
                autoplay: options.autoplay || false,
                controls: options.controls !== false
            });

            const response = await fetch(`${this.apiUrl}/${recordingId}/embed?${params}`, {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message);
            }

            return result.data;

        } catch (error) {
            console.error('Error getting embed code:', error);
            throw error;
        }
    }

    /**
     * Get social sharing URLs
     */
    async getSocialSharingUrls(shareId) {
        try {
            const response = await fetch(`${this.apiUrl}/shares/${shareId}/social-urls`);
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message);
            }

            return result.data;

        } catch (error) {
            console.error('Error getting social URLs:', error);
            throw error;
        }
    }

    /**
     * Track social media share
     */
    async trackSocialShare(shareId, platform) {
        try {
            await fetch(`${this.apiUrl}/shares/${shareId}/social`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ platform })
            });
        } catch (error) {
            console.error('Error tracking social share:', error);
        }
    }

    /**
     * Show sharing modal
     */
    showSharingModal(recordingId, recordingTitle = 'Video Recording') {
        // Create modal HTML
        const modalHtml = `
            <div class="modal fade" id="sharingModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content" style="background: #2a2a2a; color: white;">
                        <div class="modal-header" style="border-bottom: 1px solid #555;">
                            <h5 class="modal-title">
                                <i class="fas fa-share"></i> Share Video
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div id="sharingContent">
                                <div class="text-center">
                                    <div class="spinner-border text-danger" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                    <p class="mt-2">Creating share link...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('sharingModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('sharingModal'));
        modal.show();

        // Load sharing content
        this.loadSharingContent(recordingId, recordingTitle);

        return modal;
    }

    /**
     * Load sharing content
     */
    async loadSharingContent(recordingId, recordingTitle) {
        try {
            // Create share link with default settings
            const shareData = await this.createShareLink(recordingId, {
                privacy: 'unlisted',
                expiryDays: 30,
                allowDownload: false,
                allowEmbedding: true
            });

            // Get social URLs
            const socialData = await this.getSocialSharingUrls(shareData.share_id);

            // Render sharing interface
            this.renderSharingInterface(shareData, socialData, recordingTitle);

        } catch (error) {
            console.error('Error loading sharing content:', error);
            this.renderSharingError(error.message);
        }
    }

    /**
     * Render sharing interface
     */
    renderSharingInterface(shareData, socialData, recordingTitle) {
        const content = document.getElementById('sharingContent');
        
        content.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6 class="text-danger mb-3">
                        <i class="fas fa-link"></i> Share Link
                    </h6>
                    
                    <div class="input-group mb-3">
                        <input type="text" class="form-control" id="shareUrl" 
                               value="${shareData.share_url}" readonly 
                               style="background: #3a3a3a; border: 1px solid #555; color: white;">
                        <button class="btn btn-outline-danger" type="button" onclick="videoSharing.copyToClipboard('shareUrl')">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">Privacy Level</label>
                        <select class="form-select" id="privacyLevel" 
                                style="background: #3a3a3a; border: 1px solid #555; color: white;"
                                onchange="videoSharing.updateShareSettings('${shareData.share_id}')">
                            <option value="public" ${shareData.privacy_level === 'public' ? 'selected' : ''}>Public</option>
                            <option value="unlisted" ${shareData.privacy_level === 'unlisted' ? 'selected' : ''}>Unlisted</option>
                            <option value="private" ${shareData.privacy_level === 'private' ? 'selected' : ''}>Private</option>
                        </select>
                    </div>

                    <div class="row mb-3">
                        <div class="col-6">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="allowDownload" 
                                       ${shareData.allow_download ? 'checked' : ''}
                                       onchange="videoSharing.updateShareSettings('${shareData.share_id}')">
                                <label class="form-check-label" for="allowDownload">
                                    Allow Download
                                </label>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="allowEmbedding" 
                                       ${shareData.allow_embedding ? 'checked' : ''}
                                       onchange="videoSharing.updateShareSettings('${shareData.share_id}')">
                                <label class="form-check-label" for="allowEmbedding">
                                    Allow Embedding
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">Expires</label>
                        <input type="datetime-local" class="form-control" id="expiresAt" 
                               value="${shareData.expires_at ? shareData.expires_at.replace(' ', 'T').slice(0, 16) : ''}"
                               style="background: #3a3a3a; border: 1px solid #555; color: white;"
                               onchange="videoSharing.updateShareSettings('${shareData.share_id}')">
                    </div>
                </div>

                <div class="col-md-6">
                    <h6 class="text-danger mb-3">
                        <i class="fas fa-share-alt"></i> Social Media
                    </h6>
                    
                    <div class="d-grid gap-2">
                        <button class="btn btn-primary" onclick="videoSharing.shareToSocial('${shareData.share_id}', 'facebook', '${socialData.social_urls.facebook}')">
                            <i class="fab fa-facebook"></i> Share on Facebook
                        </button>
                        <button class="btn btn-info" onclick="videoSharing.shareToSocial('${shareData.share_id}', 'twitter', '${socialData.social_urls.twitter}')">
                            <i class="fab fa-twitter"></i> Share on Twitter
                        </button>
                        <button class="btn btn-primary" onclick="videoSharing.shareToSocial('${shareData.share_id}', 'linkedin', '${socialData.social_urls.linkedin}')">
                            <i class="fab fa-linkedin"></i> Share on LinkedIn
                        </button>
                        <button class="btn btn-warning" onclick="videoSharing.shareToSocial('${shareData.share_id}', 'reddit', '${socialData.social_urls.reddit}')">
                            <i class="fab fa-reddit"></i> Share on Reddit
                        </button>
                        <button class="btn btn-secondary" onclick="videoSharing.shareToSocial('${shareData.share_id}', 'email', '${socialData.social_urls.email}')">
                            <i class="fas fa-envelope"></i> Share via Email
                        </button>
                    </div>

                    ${shareData.allow_embedding ? `
                        <h6 class="text-danger mb-3 mt-4">
                            <i class="fas fa-code"></i> Embed Code
                        </h6>
                        <div class="input-group">
                            <textarea class="form-control" id="embedCode" rows="3" readonly 
                                      style="background: #3a3a3a; border: 1px solid #555; color: white; font-family: monospace; font-size: 12px;">${shareData.embed_code}</textarea>
                            <button class="btn btn-outline-danger" type="button" onclick="videoSharing.copyToClipboard('embedCode')">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>

            <div class="mt-4 pt-3" style="border-top: 1px solid #555;">
                <div class="row text-center">
                    <div class="col-4">
                        <div class="text-danger fw-bold">${shareData.views || 0}</div>
                        <small class="text-muted">Views</small>
                    </div>
                    <div class="col-4">
                        <div class="text-danger fw-bold">${shareData.privacy_level}</div>
                        <small class="text-muted">Privacy</small>
                    </div>
                    <div class="col-4">
                        <div class="text-danger fw-bold">${shareData.expires_at ? new Date(shareData.expires_at).toLocaleDateString() : 'Never'}</div>
                        <small class="text-muted">Expires</small>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render sharing error
     */
    renderSharingError(message) {
        const content = document.getElementById('sharingContent');
        content.innerHTML = `
            <div class="text-center">
                <i class="fas fa-exclamation-triangle text-warning" style="font-size: 3rem;"></i>
                <h5 class="mt-3">Error Creating Share Link</h5>
                <p class="text-muted">${message}</p>
                <button class="btn btn-danger" onclick="location.reload()">
                    <i class="fas fa-refresh"></i> Try Again
                </button>
            </div>
        `;
    }

    /**
     * Update share settings
     */
    async updateShareSettings(shareId) {
        try {
            const updates = {
                privacy_level: document.getElementById('privacyLevel').value,
                allow_download: document.getElementById('allowDownload').checked,
                allow_embedding: document.getElementById('allowEmbedding').checked,
                expires_at: document.getElementById('expiresAt').value || null
            };

            await this.updateShare(shareId, updates);
            
            // Show success feedback
            this.showToast('Share settings updated successfully', 'success');

        } catch (error) {
            console.error('Error updating share settings:', error);
            this.showToast('Failed to update share settings', 'error');
        }
    }

    /**
     * Share to social media
     */
    async shareToSocial(shareId, platform, url) {
        try {
            // Track the share
            await this.trackSocialShare(shareId, platform);

            // Open sharing URL
            if (platform === 'email') {
                window.location.href = url;
            } else if (platform === 'copy_link') {
                await this.copyToClipboard('shareUrl');
                this.showToast('Link copied to clipboard!', 'success');
            } else {
                window.open(url, '_blank', 'width=600,height=400');
            }

        } catch (error) {
            console.error('Error sharing to social media:', error);
        }
    }

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(elementId) {
        try {
            const element = document.getElementById(elementId);
            await navigator.clipboard.writeText(element.value);
            this.showToast('Copied to clipboard!', 'success');
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            this.showToast('Failed to copy to clipboard', 'error');
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toastHtml = `
            <div class="toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} border-0" 
                 role="alert" style="position: fixed; top: 20px; right: 20px; z-index: 9999;">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', toastHtml);
        
        const toastElement = document.querySelector('.toast:last-child');
        const toast = new bootstrap.Toast(toastElement);
        toast.show();

        // Remove toast element after it's hidden
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    /**
     * Get auth token
     */
    getAuthToken() {
        return localStorage.getItem('auth_token') || 'demo_token';
    }
}

// Global instance
const videoSharing = new VideoSharing();
