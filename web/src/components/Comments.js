import Auth from '../services/auth.js';
import API from '../services/api.js';
import LikeButton from './LikeButton.js';
import { realtimeService } from '../services/realtime.js';

class Comments {
    constructor(entityType, entityId, container) {
        this.entityType = entityType;
        this.entityId = entityId;
        this.container = container;
        this.comments = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.isLoading = false;
        this.sortBy = 'newest';
        this.currentUser = Auth.getCurrentUser();
        this.replyingTo = null;
        this.likeButtons = new Map(); // Store like button instances
        this.realtimeUnsubscribers = [];
    }

    async render() {
        this.container.innerHTML = this.getHTML();
        this.setupEventListeners();
        this.setupRealtimeListeners();
        await this.loadComments();
    }

    getHTML() {
        return `
            <div class="comments-section">
                ${this.getHeaderSection()}
                ${this.getCommentFormSection()}
                ${this.getCommentsListSection()}
            </div>
        `;
    }

    getHeaderSection() {
        return `
            <div class="comments-header d-flex justify-content-between align-items-center mb-4">
                <h5 class="mb-0">
                    <i class="fas fa-comments me-2"></i>
                    Comments <span id="comment-count" class="text-muted">(0)</span>
                </h5>
                
                <div class="comments-sort">
                    <select class="form-select form-select-sm" id="comment-sort" style="width: auto;">
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="popular">Most Popular</option>
                    </select>
                </div>
            </div>
        `;
    }

    getCommentFormSection() {
        if (!this.currentUser) {
            return `
                <div class="comment-form-section mb-4">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        <a href="/login" class="alert-link">Sign in</a> to join the conversation
                    </div>
                </div>
            `;
        }

        return `
            <div class="comment-form-section mb-4">
                <form id="comment-form" class="comment-form">
                    <div class="d-flex">
                        <img src="${this.currentUser.avatar_url || '/assets/default-avatar.png'}" 
                             class="rounded-circle me-3" 
                             width="40" height="40"
                             alt="${this.currentUser.username}">
                        <div class="flex-grow-1">
                            <textarea class="form-control" 
                                      id="comment-content" 
                                      name="content" 
                                      rows="3" 
                                      placeholder="Share your thoughts..."
                                      required></textarea>
                            <div class="d-flex justify-content-between align-items-center mt-2">
                                <small class="text-muted">
                                    <span id="char-count">0</span>/2000 characters
                                </small>
                                <div>
                                    <button type="button" class="btn btn-sm btn-outline-secondary me-2" id="cancel-reply" style="display: none;">
                                        Cancel
                                    </button>
                                    <button type="submit" class="btn btn-sm btn-primary" id="submit-comment">
                                        <i class="fas fa-paper-plane me-1"></i>
                                        Post Comment
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <input type="hidden" id="parent-id" name="parent_id" value="">
                </form>
            </div>
        `;
    }

    getCommentsListSection() {
        return `
            <div class="comments-list">
                <div id="comments-container">
                    <div class="text-center py-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading comments...</span>
                        </div>
                    </div>
                </div>
                
                <div id="comments-pagination" class="mt-4"></div>
            </div>
        `;
    }

    setupEventListeners() {
        // Sort change
        const sortSelect = this.container.querySelector('#comment-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.currentPage = 1;
                this.loadComments();
            });
        }

        // Comment form
        const commentForm = this.container.querySelector('#comment-form');
        if (commentForm) {
            commentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCommentSubmit();
            });

            // Character count
            const contentField = this.container.querySelector('#comment-content');
            const charCount = this.container.querySelector('#char-count');
            
            if (contentField && charCount) {
                contentField.addEventListener('input', () => {
                    charCount.textContent = contentField.value.length;
                });
            }

            // Cancel reply
            const cancelReplyBtn = this.container.querySelector('#cancel-reply');
            if (cancelReplyBtn) {
                cancelReplyBtn.addEventListener('click', () => {
                    this.cancelReply();
                });
            }
        }
    }

    async loadComments(page = 1) {
        if (this.isLoading) return;

        try {
            this.isLoading = true;
            this.currentPage = page;

            const params = {
                page: page,
                limit: 20,
                sort: this.sortBy
            };

            const response = await API.get(`/api/comments/${this.entityType}/${this.entityId}`, params);

            if (response.success) {
                this.comments = response.data.items;
                this.totalPages = response.data.pagination.total_pages;
                this.renderComments();
                this.renderPagination();
                this.updateCommentCount(response.data.pagination.total);
            } else {
                this.renderError('Failed to load comments');
            }

        } catch (error) {
            console.error('Failed to load comments:', error);
            this.renderError('Failed to load comments');
        } finally {
            this.isLoading = false;
        }
    }

    renderComments() {
        const container = this.container.querySelector('#comments-container');

        if (this.comments.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-comments fa-3x text-muted mb-3"></i>
                    <h6>No comments yet</h6>
                    <p class="text-muted mb-0">Be the first to share your thoughts!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.comments.map(comment => this.renderComment(comment)).join('');
        this.setupCommentEventListeners();
    }

    renderComment(comment, isReply = false) {
        const canEdit = this.currentUser && (
            this.currentUser.id === comment.user_id || 
            Auth.hasRole(this.currentUser, 'admin')
        );

        const canReply = this.currentUser && !isReply; // Only allow replies to top-level comments

        return `
            <div class="comment ${isReply ? 'comment-reply ms-5' : ''}" data-comment-id="${comment.id}">
                <div class="d-flex">
                    <img src="${comment.user.avatar_url || '/assets/default-avatar.png'}" 
                         class="rounded-circle me-3" 
                         width="${isReply ? '32' : '40'}" 
                         height="${isReply ? '32' : '40'}"
                         alt="${comment.user.username}">
                    
                    <div class="flex-grow-1">
                        <div class="comment-header d-flex align-items-center mb-2">
                            <strong class="me-2">${comment.user.username}</strong>
                            ${this.getUserBadge(comment.user.role)}
                            <small class="text-muted ms-2">${comment.created_at_formatted}</small>
                            ${comment.is_edited ? '<small class="text-muted ms-2">(edited)</small>' : ''}
                            ${comment.is_pinned ? '<span class="badge bg-warning ms-2">Pinned</span>' : ''}
                        </div>
                        
                        <div class="comment-content mb-2">
                            <p class="mb-0">${this.formatCommentContent(comment.content)}</p>
                        </div>
                        
                        <div class="comment-actions d-flex align-items-center">
                            <div class="comment-like-container me-3" data-comment-id="${comment.id}"></div>
                            
                            ${canReply ? `
                                <button class="btn btn-sm btn-link text-muted p-0 me-3 reply-btn" 
                                        data-comment-id="${comment.id}"
                                        data-username="${comment.user.username}">
                                    <i class="fas fa-reply me-1"></i>Reply
                                </button>
                            ` : ''}
                            
                            <div class="dropdown">
                                <button class="btn btn-sm btn-link text-muted p-0"
                                        data-bs-toggle="dropdown">
                                    <i class="fas fa-ellipsis-h"></i>
                                </button>
                                <ul class="dropdown-menu">
                                    ${canEdit ? `
                                        <li><a class="dropdown-item edit-comment" href="#" data-comment-id="${comment.id}">
                                            <i class="fas fa-edit me-2"></i>Edit
                                        </a></li>
                                        <li><a class="dropdown-item delete-comment text-danger" href="#" data-comment-id="${comment.id}">
                                            <i class="fas fa-trash me-2"></i>Delete
                                        </a></li>
                                        ${this.currentUser && this.currentUser.id !== comment.user_id ? '<li><hr class="dropdown-divider"></li>' : ''}
                                    ` : ''}
                                    ${this.currentUser && this.currentUser.id !== comment.user_id ? `
                                        <li><a class="dropdown-item text-warning report-comment" href="#" data-comment-id="${comment.id}">
                                            <i class="fas fa-flag me-2"></i>Report
                                        </a></li>
                                    ` : ''}
                                </ul>
                            </div>
                        </div>
                        
                        ${comment.replies && comment.replies.length > 0 ? `
                            <div class="replies mt-3">
                                ${comment.replies.map(reply => this.renderComment(reply, true)).join('')}
                            </div>
                        ` : ''}
                        
                        ${comment.reply_count > (comment.replies?.length || 0) ? `
                            <div class="mt-2">
                                <button class="btn btn-sm btn-link text-primary p-0 load-more-replies" 
                                        data-comment-id="${comment.id}">
                                    <i class="fas fa-chevron-down me-1"></i>
                                    Load ${comment.reply_count - (comment.replies?.length || 0)} more replies
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    setupCommentEventListeners() {
        const container = this.container.querySelector('#comments-container');

        // Initialize like buttons
        this.initializeLikeButtons(container);

        // Reply buttons
        container.querySelectorAll('.reply-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = e.currentTarget.getAttribute('data-comment-id');
                const username = e.currentTarget.getAttribute('data-username');
                this.handleReply(commentId, username);
            });
        });

        // Edit buttons
        container.querySelectorAll('.edit-comment').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const commentId = e.currentTarget.getAttribute('data-comment-id');
                this.handleEdit(commentId);
            });
        });

        // Delete buttons
        container.querySelectorAll('.delete-comment').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const commentId = e.currentTarget.getAttribute('data-comment-id');
                this.handleDelete(commentId);
            });
        });

        // Report buttons
        container.querySelectorAll('.report-comment').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const commentId = e.currentTarget.getAttribute('data-comment-id');
                this.handleReport(commentId);
            });
        });

        // Report buttons
        container.querySelectorAll('.report-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = e.currentTarget.getAttribute('data-comment-id');
                this.handleReport(commentId);
            });
        });

        // Load more replies
        container.querySelectorAll('.load-more-replies').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = e.currentTarget.getAttribute('data-comment-id');
                this.loadMoreReplies(commentId);
            });
        });
    }

    async handleCommentSubmit() {
        const form = this.container.querySelector('#comment-form');
        const contentField = form.querySelector('#comment-content');
        const parentIdField = form.querySelector('#parent-id');
        const submitBtn = form.querySelector('#submit-comment');

        const content = contentField.value.trim();
        if (!content) return;

        try {
            this.setLoadingState(submitBtn, true);

            // Use real-time service for optimistic updates
            const commentData = {
                content: content,
                parent_id: parentIdField.value || null
            };

            const newComment = await realtimeService.addComment(
                this.entityType,
                this.entityId,
                commentData
            );

            // Clear form
            contentField.value = '';
            this.container.querySelector('#char-count').textContent = '0';

            // Cancel reply if it was a reply
            if (this.replyingTo) {
                this.cancelReply();
            }

            this.showAlert('success', 'Comment posted successfully!');

        } catch (error) {
            console.error('Failed to post comment:', error);
            this.showAlert('error', 'Failed to post comment');
        } finally {
            this.setLoadingState(submitBtn, false);
        }
    }

    setupRealtimeListeners() {
        // Listen for new comments
        const unsubscribeCommentAdded = realtimeService.on('comment_added', (data) => {
            if (data.entityType === this.entityType && data.entityId == this.entityId) {
                // Add optimistic comment to the list
                this.comments.unshift(data.comment);
                this.renderComments();
            }
        });

        // Listen for comment confirmations
        const unsubscribeCommentConfirmed = realtimeService.on('comment_confirmed', (data) => {
            if (data.entityType === this.entityType && data.entityId == this.entityId) {
                // Replace temp comment with real one
                const index = this.comments.findIndex(c => c.id === data.tempId);
                if (index !== -1) {
                    this.comments[index] = data.comment;
                    this.renderComments();
                }
            }
        });

        // Listen for comment failures
        const unsubscribeCommentFailed = realtimeService.on('comment_failed', (data) => {
            if (data.entityType === this.entityType && data.entityId == this.entityId) {
                // Mark comment as failed
                const index = this.comments.findIndex(c => c.id === data.comment.id);
                if (index !== -1) {
                    this.comments[index] = data.comment;
                    this.renderComments();
                }
            }
        });

        // Store unsubscribe functions
        this.realtimeUnsubscribers.push(
            unsubscribeCommentAdded,
            unsubscribeCommentConfirmed,
            unsubscribeCommentFailed
        );
    }

    handleReply(commentId, username) {
        this.replyingTo = commentId;
        
        const parentIdField = this.container.querySelector('#parent-id');
        const contentField = this.container.querySelector('#comment-content');
        const submitBtn = this.container.querySelector('#submit-comment');
        const cancelBtn = this.container.querySelector('#cancel-reply');

        parentIdField.value = commentId;
        contentField.placeholder = `Reply to ${username}...`;
        contentField.focus();
        
        submitBtn.innerHTML = '<i class="fas fa-reply me-1"></i>Post Reply';
        cancelBtn.style.display = 'inline-block';

        // Scroll to form
        this.container.querySelector('.comment-form-section').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
    }

    cancelReply() {
        this.replyingTo = null;
        
        const parentIdField = this.container.querySelector('#parent-id');
        const contentField = this.container.querySelector('#comment-content');
        const submitBtn = this.container.querySelector('#submit-comment');
        const cancelBtn = this.container.querySelector('#cancel-reply');

        parentIdField.value = '';
        contentField.placeholder = 'Share your thoughts...';
        
        submitBtn.innerHTML = '<i class="fas fa-paper-plane me-1"></i>Post Comment';
        cancelBtn.style.display = 'none';
    }

    initializeLikeButtons(container) {
        // Clear existing like buttons
        this.likeButtons.clear();

        // Find all comment like containers
        const likeContainers = container.querySelectorAll('.comment-like-container');

        likeContainers.forEach(likeContainer => {
            const commentId = likeContainer.dataset.commentId;
            const comment = this.findCommentById(commentId);

            if (comment) {
                const likeButton = new LikeButton({
                    entityType: 'comment',
                    entityId: commentId,
                    liked: comment.is_liked || false,
                    count: comment.like_count || 0,
                    size: 'small',
                    showCount: true,
                    showText: false,
                    animated: true,
                    onLikeChange: (data) => {
                        // Update comment data
                        comment.is_liked = data.liked;
                        comment.like_count = data.count;

                        // Update any other displays of this comment's like count
                        this.updateCommentLikeDisplays(commentId, data);
                    }
                });

                likeButton.render(likeContainer);
                this.likeButtons.set(commentId, likeButton);
            }
        });
    }

    findCommentById(commentId) {
        // Search through comments and their replies
        for (const comment of this.comments) {
            if (comment.id == commentId) {
                return comment;
            }
            if (comment.replies) {
                for (const reply of comment.replies) {
                    if (reply.id == commentId) {
                        return reply;
                    }
                }
            }
        }
        return null;
    }

    updateCommentLikeDisplays(commentId, data) {
        // Update any other like count displays for this comment
        const likeCountElements = document.querySelectorAll(`[data-comment-id="${commentId}"] .comment-like-count`);
        likeCountElements.forEach(element => {
            element.textContent = data.count;
        });
    }

    async handleReport(commentId) {
        if (!this.currentUser) return;

        const reason = prompt('Please provide a reason for reporting this comment:');
        if (!reason || reason.trim() === '') return;

        try {
            const response = await API.post(`/api/comments/${commentId}/report`, {
                reason: reason.trim()
            });

            if (response.success) {
                this.showAlert('success', 'Comment reported successfully. Our moderators will review it.');
            } else {
                this.showAlert('error', response.message || 'Failed to report comment');
            }

        } catch (error) {
            console.error('Failed to report comment:', error);
            this.showAlert('error', 'Failed to report comment. Please try again.');
        }
    }

    async handleEdit(commentId) {
        // TODO: Implement inline editing
        console.log('Edit comment:', commentId);
    }

    async handleDelete(commentId) {
        if (!confirm('Are you sure you want to delete this comment?')) {
            return;
        }

        try {
            const response = await API.delete(`/api/comments/${commentId}`);

            if (response.success) {
                await this.loadComments(this.currentPage);
                this.showAlert('success', 'Comment deleted successfully');
            } else {
                this.showAlert('error', response.message || 'Failed to delete comment');
            }

        } catch (error) {
            console.error('Failed to delete comment:', error);
            this.showAlert('error', 'Failed to delete comment');
        }
    }

    async handleReport(commentId) {
        // TODO: Implement report modal
        console.log('Report comment:', commentId);
    }

    async loadMoreReplies(commentId) {
        // TODO: Implement load more replies
        console.log('Load more replies for:', commentId);
    }

    renderPagination() {
        const container = this.container.querySelector('#comments-pagination');

        if (this.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        const pagination = [];
        const maxVisible = 5;
        const start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        const end = Math.min(this.totalPages, start + maxVisible - 1);

        // Previous button
        pagination.push(`
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage - 1}">Previous</a>
            </li>
        `);

        // Page numbers
        for (let i = start; i <= end; i++) {
            pagination.push(`
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `);
        }

        // Next button
        pagination.push(`
            <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage + 1}">Next</a>
            </li>
        `);

        container.innerHTML = `
            <nav aria-label="Comments pagination">
                <ul class="pagination justify-content-center">
                    ${pagination.join('')}
                </ul>
            </nav>
        `;

        // Add click handlers
        container.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.target.getAttribute('data-page'));
                if (page && page !== this.currentPage) {
                    this.loadComments(page);
                }
            });
        });
    }

    renderError(message) {
        const container = this.container.querySelector('#comments-container');
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-exclamation-triangle fa-2x text-danger mb-3"></i>
                <h6>Error</h6>
                <p class="text-muted">${message}</p>
                <button class="btn btn-primary btn-sm" onclick="location.reload()">
                    <i class="fas fa-refresh me-1"></i>Try Again
                </button>
            </div>
        `;
    }

    updateCommentCount(count) {
        const countElement = this.container.querySelector('#comment-count');
        if (countElement) {
            countElement.textContent = `(${count})`;
        }
    }

    getUserBadge(role) {
        const badges = {
            'admin': '<span class="badge bg-danger">Admin</span>',
            'interviewer': '<span class="badge bg-primary">Interviewer</span>',
            'promoter': '<span class="badge bg-success">Promoter</span>'
        };
        return badges[role] || '';
    }

    formatCommentContent(content) {
        // Basic HTML escaping and link detection
        return content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>')
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    }

    setLoadingState(button, loading) {
        if (loading) {
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Posting...';
        } else {
            button.disabled = false;
            button.innerHTML = this.replyingTo ? 
                '<i class="fas fa-reply me-1"></i>Post Reply' : 
                '<i class="fas fa-paper-plane me-1"></i>Post Comment';
        }
    }

    showAlert(type, message) {
        // Create temporary alert
        const alert = document.createElement('div');
        alert.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        this.container.insertBefore(alert, this.container.firstChild);

        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 3000);
    }

    destroy() {
        // Clean up like buttons
        this.likeButtons.forEach(likeButton => {
            likeButton.destroy();
        });
        this.likeButtons.clear();

        // Clean up real-time listeners
        this.realtimeUnsubscribers.forEach(unsubscribe => unsubscribe());
        this.realtimeUnsubscribers = [];
    }
}

export default Comments;
