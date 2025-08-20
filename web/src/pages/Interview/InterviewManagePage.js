import API from '../../services/api.js';
import Auth from '../../services/auth.js';

export default class InterviewManagePage {
    constructor() {
        this.currentUser = Auth.getCurrentUser();
        this.interviews = [];
        this.isLoading = false;
        this.currentPage = 1;
        this.totalPages = 1;
        this.filters = {
            status: 'all',
            type: 'all',
            search: ''
        };
        this.selectedInterviews = new Set();
        this.sortBy = 'created_at';
        this.sortOrder = 'desc';
    }

    async render(container) {
        if (!this.currentUser) {
            window.location.href = '/login';
            return;
        }

        // Check if user has interviewer role
        if (!this.hasInterviewerRole()) {
            container.innerHTML = this.getNoPermissionHTML();
            return;
        }

        container.innerHTML = this.getHTML();
        this.setupEventListeners(container);
        await this.loadInterviews();
    }

    hasInterviewerRole() {
        return this.currentUser && 
               (this.currentUser.role === 'interviewer' || 
                this.currentUser.role === 'admin' || 
                this.currentUser.role === 'promoter');
    }

    getHTML() {
        return `
            <div class="interview-manage-page">
                <div class="container-fluid py-4">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h2>
                            <i class="fas fa-video me-2"></i>Manage Interviews
                        </h2>
                        <div class="d-flex gap-2">
                            <button class="btn btn-outline-secondary" id="bulk-actions-btn" disabled>
                                <i class="fas fa-tasks me-1"></i>Bulk Actions
                            </button>
                            <a href="/interviews/create" class="btn btn-primary">
                                <i class="fas fa-plus me-1"></i>New Interview
                            </a>
                        </div>
                    </div>

                    <!-- Filters and Search -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label for="status-filter" class="form-label small">Status</label>
                                    <select class="form-select form-select-sm" id="status-filter">
                                        <option value="all">All Status</option>
                                        <option value="draft">Draft</option>
                                        <option value="published">Published</option>
                                        <option value="archived">Archived</option>
                                        <option value="scheduled">Scheduled</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label for="type-filter" class="form-label small">Type</label>
                                    <select class="form-select form-select-sm" id="type-filter">
                                        <option value="all">All Types</option>
                                        <option value="video">Video</option>
                                        <option value="audio">Audio</option>
                                        <option value="text">Text</option>
                                        <option value="live">Live</option>
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <label for="search-input" class="form-label small">Search</label>
                                    <div class="input-group input-group-sm">
                                        <input type="text" class="form-control" id="search-input" 
                                               placeholder="Search interviews...">
                                        <button class="btn btn-outline-secondary" id="search-btn">
                                            <i class="fas fa-search"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="col-md-2">
                                    <label for="sort-select" class="form-label small">Sort By</label>
                                    <select class="form-select form-select-sm" id="sort-select">
                                        <option value="created_at">Date Created</option>
                                        <option value="updated_at">Last Modified</option>
                                        <option value="title">Title</option>
                                        <option value="view_count">Views</option>
                                        <option value="like_count">Likes</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Statistics Cards -->
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="card bg-primary text-white">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between">
                                        <div>
                                            <h6 class="card-title">Total Interviews</h6>
                                            <h3 class="mb-0" id="total-count">0</h3>
                                        </div>
                                        <i class="fas fa-video fa-2x opacity-75"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-success text-white">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between">
                                        <div>
                                            <h6 class="card-title">Published</h6>
                                            <h3 class="mb-0" id="published-count">0</h3>
                                        </div>
                                        <i class="fas fa-check-circle fa-2x opacity-75"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-warning text-white">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between">
                                        <div>
                                            <h6 class="card-title">Drafts</h6>
                                            <h3 class="mb-0" id="draft-count">0</h3>
                                        </div>
                                        <i class="fas fa-edit fa-2x opacity-75"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-info text-white">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between">
                                        <div>
                                            <h6 class="card-title">Total Views</h6>
                                            <h3 class="mb-0" id="total-views">0</h3>
                                        </div>
                                        <i class="fas fa-eye fa-2x opacity-75"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Interviews Table -->
                    <div class="card">
                        <div class="card-header">
                            <div class="d-flex justify-content-between align-items-center">
                                <h6 class="mb-0">Your Interviews</h6>
                                <div class="d-flex align-items-center gap-2">
                                    <button class="btn btn-sm btn-outline-secondary" id="toggle-view-btn">
                                        <i class="fas fa-th-list"></i>
                                    </button>
                                    <span class="text-muted small" id="results-count">0 interviews</span>
                                </div>
                            </div>
                        </div>
                        <div class="card-body p-0">
                            <div id="interviews-container">
                                ${this.getInterviewsHTML()}
                            </div>
                        </div>
                    </div>

                    <!-- Pagination -->
                    <div class="d-flex justify-content-center mt-4">
                        ${this.getPaginationHTML()}
                    </div>
                </div>

                <!-- Bulk Actions Modal -->
                <div class="modal fade" id="bulkActionsModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Bulk Actions</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <p>Select an action for <span id="selected-count">0</span> selected interviews:</p>
                                <div class="d-grid gap-2">
                                    <button class="btn btn-outline-success" id="bulk-publish-btn">
                                        <i class="fas fa-check-circle me-2"></i>Publish Selected
                                    </button>
                                    <button class="btn btn-outline-warning" id="bulk-draft-btn">
                                        <i class="fas fa-edit me-2"></i>Move to Draft
                                    </button>
                                    <button class="btn btn-outline-secondary" id="bulk-archive-btn">
                                        <i class="fas fa-archive me-2"></i>Archive Selected
                                    </button>
                                    <button class="btn btn-outline-danger" id="bulk-delete-btn">
                                        <i class="fas fa-trash me-2"></i>Delete Selected
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getInterviewsHTML() {
        if (this.isLoading) {
            return `
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading interviews...</span>
                    </div>
                </div>
            `;
        }

        if (this.interviews.length === 0) {
            return this.getEmptyStateHTML();
        }

        return `
            <div class="table-responsive">
                <table class="table table-hover mb-0">
                    <thead class="table-light">
                        <tr>
                            <th width="40">
                                <input type="checkbox" class="form-check-input" id="select-all">
                            </th>
                            <th>Interview</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Views</th>
                            <th>Likes</th>
                            <th>Created</th>
                            <th width="120">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.interviews.map(interview => this.getInterviewRowHTML(interview)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    getInterviewRowHTML(interview) {
        const createdDate = new Date(interview.created_at).toLocaleDateString();
        const statusBadge = this.getStatusBadge(interview.status);
        const typeBadge = this.getTypeBadge(interview.type);

        return `
            <tr data-interview-id="${interview.id}">
                <td>
                    <input type="checkbox" class="form-check-input interview-checkbox" 
                           value="${interview.id}">
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${interview.thumbnail_url || '/assets/default-thumbnail.jpg'}" 
                             alt="Thumbnail" 
                             class="rounded me-3" 
                             width="60" height="40"
                             style="object-fit: cover;"
                             onerror="this.src='/assets/default-thumbnail.jpg'">
                        <div>
                            <h6 class="mb-1">
                                <a href="/interviews/${interview.id}" class="text-decoration-none">
                                    ${interview.title}
                                </a>
                            </h6>
                            <small class="text-muted">
                                ${interview.interviewee_name || 'Unknown Interviewee'}
                            </small>
                        </div>
                    </div>
                </td>
                <td>${typeBadge}</td>
                <td>${statusBadge}</td>
                <td>
                    <span class="badge bg-light text-dark">
                        <i class="fas fa-eye me-1"></i>${interview.view_count || 0}
                    </span>
                </td>
                <td>
                    <span class="badge bg-light text-dark">
                        <i class="fas fa-heart me-1"></i>${interview.like_count || 0}
                    </span>
                </td>
                <td>
                    <small class="text-muted">${createdDate}</small>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <a href="/interviews/${interview.id}/edit" class="btn btn-outline-primary" title="Edit">
                            <i class="fas fa-edit"></i>
                        </a>
                        <button class="btn btn-outline-secondary duplicate-btn" 
                                data-interview-id="${interview.id}" title="Duplicate">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="btn btn-outline-danger delete-btn" 
                                data-interview-id="${interview.id}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    getStatusBadge(status) {
        const badges = {
            'draft': '<span class="badge bg-warning">Draft</span>',
            'published': '<span class="badge bg-success">Published</span>',
            'archived': '<span class="badge bg-secondary">Archived</span>',
            'scheduled': '<span class="badge bg-info">Scheduled</span>'
        };
        return badges[status] || '<span class="badge bg-light text-dark">Unknown</span>';
    }

    getTypeBadge(type) {
        const badges = {
            'video': '<span class="badge bg-primary"><i class="fas fa-video me-1"></i>Video</span>',
            'audio': '<span class="badge bg-info"><i class="fas fa-microphone me-1"></i>Audio</span>',
            'text': '<span class="badge bg-secondary"><i class="fas fa-file-text me-1"></i>Text</span>',
            'live': '<span class="badge bg-danger"><i class="fas fa-broadcast-tower me-1"></i>Live</span>'
        };
        return badges[type] || '<span class="badge bg-light text-dark">Unknown</span>';
    }

    getEmptyStateHTML() {
        return `
            <div class="text-center py-5">
                <i class="fas fa-video fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">No interviews found</h5>
                <p class="text-muted">
                    ${this.filters.search || this.filters.status !== 'all' || this.filters.type !== 'all'
                        ? 'Try adjusting your filters or search terms'
                        : 'Create your first interview to get started'}
                </p>
                <a href="/interviews/create" class="btn btn-primary">
                    <i class="fas fa-plus me-1"></i>Create Interview
                </a>
            </div>
        `;
    }

    getNoPermissionHTML() {
        return `
            <div class="container py-5">
                <div class="text-center">
                    <i class="fas fa-lock fa-3x text-muted mb-3"></i>
                    <h3 class="text-muted">Access Denied</h3>
                    <p class="text-muted">You need interviewer permissions to manage interviews.</p>
                    <a href="/" class="btn btn-primary">Go Home</a>
                </div>
            </div>
        `;
    }

    getPaginationHTML() {
        if (this.totalPages <= 1) {
            return '';
        }

        return `
            <nav aria-label="Interview pagination">
                <ul class="pagination">
                    <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                        <button class="page-link" data-page="${this.currentPage - 1}" ${this.currentPage === 1 ? 'disabled' : ''}>
                            Previous
                        </button>
                    </li>
                    ${this.getPaginationNumbers()}
                    <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                        <button class="page-link" data-page="${this.currentPage + 1}" ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                            Next
                        </button>
                    </li>
                </ul>
            </nav>
        `;
    }

    getPaginationNumbers() {
        let html = '';
        const start = Math.max(1, this.currentPage - 2);
        const end = Math.min(this.totalPages, this.currentPage + 2);

        for (let i = start; i <= end; i++) {
            html += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <button class="page-link" data-page="${i}">${i}</button>
                </li>
            `;
        }

        return html;
    }

    setupEventListeners(container) {
        // Filter changes
        const statusFilter = container.querySelector('#status-filter');
        const typeFilter = container.querySelector('#type-filter');
        const searchInput = container.querySelector('#search-input');
        const searchBtn = container.querySelector('#search-btn');
        const sortSelect = container.querySelector('#sort-select');

        statusFilter.addEventListener('change', () => this.handleFilterChange());
        typeFilter.addEventListener('change', () => this.handleFilterChange());
        searchBtn.addEventListener('click', () => this.handleSearch());
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });
        sortSelect.addEventListener('change', () => this.handleSortChange());

        // Select all checkbox
        const selectAllCheckbox = container.querySelector('#select-all');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', () => this.handleSelectAll());
        }

        // Individual checkboxes
        container.addEventListener('change', (e) => {
            if (e.target.classList.contains('interview-checkbox')) {
                this.handleCheckboxChange();
            }
        });

        // Action buttons
        container.addEventListener('click', (e) => {
            if (e.target.closest('.delete-btn')) {
                const interviewId = e.target.closest('.delete-btn').dataset.interviewId;
                this.handleDelete(interviewId);
            }

            if (e.target.closest('.duplicate-btn')) {
                const interviewId = e.target.closest('.duplicate-btn').dataset.interviewId;
                this.handleDuplicate(interviewId);
            }
        });

        // Bulk actions
        const bulkActionsBtn = container.querySelector('#bulk-actions-btn');
        bulkActionsBtn.addEventListener('click', () => this.showBulkActionsModal());

        // Bulk action buttons
        container.querySelector('#bulk-publish-btn').addEventListener('click', () => this.handleBulkAction('publish'));
        container.querySelector('#bulk-draft-btn').addEventListener('click', () => this.handleBulkAction('draft'));
        container.querySelector('#bulk-archive-btn').addEventListener('click', () => this.handleBulkAction('archive'));
        container.querySelector('#bulk-delete-btn').addEventListener('click', () => this.handleBulkAction('delete'));

        // Pagination
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('page-link') && e.target.dataset.page) {
                const page = parseInt(e.target.dataset.page);
                if (page !== this.currentPage) {
                    this.currentPage = page;
                    this.loadInterviews();
                }
            }
        });
    }

    async loadInterviews() {
        try {
            this.isLoading = true;
            this.updateInterviewsContainer();

            const params = {
                page: this.currentPage,
                limit: 20,
                sort: this.sortBy,
                order: this.sortOrder,
                interviewer_id: this.currentUser.id
            };

            // Add filters
            if (this.filters.status !== 'all') {
                params.status = this.filters.status;
            }
            if (this.filters.type !== 'all') {
                params.type = this.filters.type;
            }
            if (this.filters.search) {
                params.search = this.filters.search;
            }

            const response = await API.getInterviews(params);

            if (response.success) {
                this.interviews = response.data.items || [];
                this.totalPages = Math.ceil((response.data.total || 0) / 20);
                this.updateInterviewsContainer();
                this.updateStatistics();
                this.updateResultsCount();
            }
        } catch (error) {
            console.error('Failed to load interviews:', error);
        } finally {
            this.isLoading = false;
        }
    }

    handleFilterChange() {
        this.filters.status = document.getElementById('status-filter').value;
        this.filters.type = document.getElementById('type-filter').value;
        this.currentPage = 1;
        this.loadInterviews();
    }

    handleSearch() {
        this.filters.search = document.getElementById('search-input').value.trim();
        this.currentPage = 1;
        this.loadInterviews();
    }

    handleSortChange() {
        const sortValue = document.getElementById('sort-select').value;
        this.sortBy = sortValue;
        this.loadInterviews();
    }

    handleSelectAll() {
        const selectAll = document.getElementById('select-all');
        const checkboxes = document.querySelectorAll('.interview-checkbox');

        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAll.checked;
            if (selectAll.checked) {
                this.selectedInterviews.add(checkbox.value);
            } else {
                this.selectedInterviews.delete(checkbox.value);
            }
        });

        this.updateBulkActionsButton();
    }

    handleCheckboxChange() {
        const checkboxes = document.querySelectorAll('.interview-checkbox');
        const selectAll = document.getElementById('select-all');

        // Update selected interviews set
        this.selectedInterviews.clear();
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                this.selectedInterviews.add(checkbox.value);
            }
        });

        // Update select all checkbox
        const checkedCount = this.selectedInterviews.size;
        const totalCount = checkboxes.length;

        selectAll.checked = checkedCount === totalCount;
        selectAll.indeterminate = checkedCount > 0 && checkedCount < totalCount;

        this.updateBulkActionsButton();
    }

    updateBulkActionsButton() {
        const bulkActionsBtn = document.getElementById('bulk-actions-btn');
        bulkActionsBtn.disabled = this.selectedInterviews.size === 0;

        if (this.selectedInterviews.size > 0) {
            bulkActionsBtn.innerHTML = `<i class="fas fa-tasks me-1"></i>Bulk Actions (${this.selectedInterviews.size})`;
        } else {
            bulkActionsBtn.innerHTML = '<i class="fas fa-tasks me-1"></i>Bulk Actions';
        }
    }

    showBulkActionsModal() {
        const selectedCount = document.getElementById('selected-count');
        selectedCount.textContent = this.selectedInterviews.size;

        const modal = new bootstrap.Modal(document.getElementById('bulkActionsModal'));
        modal.show();
    }

    async handleBulkAction(action) {
        if (this.selectedInterviews.size === 0) return;

        const interviewIds = Array.from(this.selectedInterviews);

        try {
            let response;
            switch (action) {
                case 'publish':
                    response = await this.bulkUpdateStatus(interviewIds, 'published');
                    break;
                case 'draft':
                    response = await this.bulkUpdateStatus(interviewIds, 'draft');
                    break;
                case 'archive':
                    response = await this.bulkUpdateStatus(interviewIds, 'archived');
                    break;
                case 'delete':
                    if (confirm(`Are you sure you want to delete ${interviewIds.length} interviews? This action cannot be undone.`)) {
                        response = await this.bulkDelete(interviewIds);
                    }
                    break;
            }

            if (response && response.success) {
                this.showAlert('success', `Bulk ${action} completed successfully`);
                this.selectedInterviews.clear();
                this.loadInterviews();

                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('bulkActionsModal'));
                modal.hide();
            }
        } catch (error) {
            console.error(`Bulk ${action} failed:`, error);
            this.showAlert('error', `Failed to ${action} interviews`);
        }
    }

    async bulkUpdateStatus(interviewIds, status) {
        // This would need to be implemented in the API
        return { success: true };
    }

    async bulkDelete(interviewIds) {
        // This would need to be implemented in the API
        return { success: true };
    }

    async handleDelete(interviewId) {
        if (!confirm('Are you sure you want to delete this interview? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await API.deleteInterview(interviewId);

            if (response.success) {
                this.showAlert('success', 'Interview deleted successfully');
                this.loadInterviews();
            }
        } catch (error) {
            console.error('Delete failed:', error);
            this.showAlert('error', 'Failed to delete interview');
        }
    }

    async handleDuplicate(interviewId) {
        try {
            // Find the interview to duplicate
            const interview = this.interviews.find(i => i.id == interviewId);
            if (!interview) return;

            // Create a copy with modified title
            const duplicateData = {
                ...interview,
                title: `${interview.title} (Copy)`,
                status: 'draft'
            };

            delete duplicateData.id;
            delete duplicateData.created_at;
            delete duplicateData.updated_at;

            const response = await API.createInterview(duplicateData);

            if (response.success) {
                this.showAlert('success', 'Interview duplicated successfully');
                this.loadInterviews();
            }
        } catch (error) {
            console.error('Duplicate failed:', error);
            this.showAlert('error', 'Failed to duplicate interview');
        }
    }

    updateInterviewsContainer() {
        const container = document.getElementById('interviews-container');
        if (container) {
            container.innerHTML = this.getInterviewsHTML();
        }
    }

    updateStatistics() {
        // Calculate statistics from current interviews
        const stats = this.interviews.reduce((acc, interview) => {
            acc.total++;
            acc.totalViews += interview.view_count || 0;

            switch (interview.status) {
                case 'published':
                    acc.published++;
                    break;
                case 'draft':
                    acc.draft++;
                    break;
            }

            return acc;
        }, { total: 0, published: 0, draft: 0, totalViews: 0 });

        document.getElementById('total-count').textContent = stats.total;
        document.getElementById('published-count').textContent = stats.published;
        document.getElementById('draft-count').textContent = stats.draft;
        document.getElementById('total-views').textContent = stats.totalViews.toLocaleString();
    }

    updateResultsCount() {
        const count = this.interviews.length;
        const total = this.totalPages * 20; // Approximate
        document.getElementById('results-count').textContent =
            `${count} of ${total} interviews`;
    }

    showAlert(type, message) {
        const alertHtml = `
            <div class="alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        const container = document.querySelector('.interview-manage-page .container-fluid');
        container.insertAdjacentHTML('afterbegin', alertHtml);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            const alert = container.querySelector('.alert');
            if (alert) {
                alert.remove();
            }
        }, 5000);
    }
}
