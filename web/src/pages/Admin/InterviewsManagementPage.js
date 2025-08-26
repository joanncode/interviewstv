import Auth from '../../services/auth.js';
import API from '../../services/api.js';

class InterviewsManagementPage {
    constructor() {
        this.currentUser = Auth.getCurrentUser();
        this.interviews = [];
        this.statistics = {};
        this.isLoading = false;
        this.currentPage = 1;
        this.totalPages = 1;
        this.selectedInterviews = new Set();
        this.filters = {
            status: 'all',
            type: 'all',
            category: 'all',
            moderation: 'all',
            featured: 'all',
            search: '',
            dateRange: 'all',
            interviewer: 'all'
        };
        this.sortBy = 'created_at';
        this.sortOrder = 'desc';
        this.viewMode = 'table'; // table or grid
    }

    async render(container, props = {}) {
        // Check admin permissions
        if (!this.currentUser || !this.hasAdminPermissions()) {
            container.innerHTML = this.getNoPermissionHTML();
            return;
        }

        container.innerHTML = this.getHTML();
        this.setupEventListeners(container);
        
        // Load initial data
        await Promise.all([
            this.loadStatistics(),
            this.loadInterviews()
        ]);
    }

    hasAdminPermissions() {
        return this.currentUser && 
               (this.currentUser.role === 'admin' || 
                this.currentUser.permissions?.includes('manage_interviews'));
    }

    getHTML() {
        return `
            <div class="interviews-admin-page">
                <div class="container-fluid py-4">
                    <!-- Header -->
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h2 class="mb-1">
                                <i class="fas fa-video me-2 text-primary"></i>
                                Interviews Management
                            </h2>
                            <p class="text-muted mb-0">Manage all interviews, moderation, and content quality</p>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-outline-secondary" id="export-btn">
                                <i class="fas fa-download me-1"></i>Export
                            </button>
                            <button class="btn btn-outline-primary" id="bulk-actions-btn" disabled>
                                <i class="fas fa-tasks me-1"></i>Bulk Actions
                            </button>
                            <button class="btn btn-primary" id="refresh-btn">
                                <i class="fas fa-sync-alt me-1"></i>Refresh
                            </button>
                        </div>
                    </div>

                    <!-- Statistics Cards -->
                    <div class="row mb-4" id="statistics-container">
                        ${this.getStatisticsHTML()}
                    </div>

                    <!-- Filters and Search -->
                    <div class="card mb-4">
                        <div class="card-header">
                            <div class="d-flex justify-content-between align-items-center">
                                <h6 class="mb-0">
                                    <i class="fas fa-filter me-2"></i>Filters & Search
                                </h6>
                                <button class="btn btn-sm btn-outline-secondary" id="clear-filters-btn">
                                    <i class="fas fa-times me-1"></i>Clear All
                                </button>
                            </div>
                        </div>
                        <div class="card-body">
                            ${this.getFiltersHTML()}
                        </div>
                    </div>

                    <!-- Interviews Table/Grid -->
                    <div class="card">
                        <div class="card-header">
                            <div class="d-flex justify-content-between align-items-center">
                                <div class="d-flex align-items-center gap-3">
                                    <h6 class="mb-0">Interviews</h6>
                                    <span class="badge bg-secondary" id="results-count">0 interviews</span>
                                </div>
                                <div class="d-flex align-items-center gap-2">
                                    <div class="btn-group" role="group">
                                        <button class="btn btn-sm btn-outline-secondary ${this.viewMode === 'table' ? 'active' : ''}" 
                                                id="table-view-btn" data-view="table">
                                            <i class="fas fa-table"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-secondary ${this.viewMode === 'grid' ? 'active' : ''}" 
                                                id="grid-view-btn" data-view="grid">
                                            <i class="fas fa-th"></i>
                                        </button>
                                    </div>
                                    <div class="dropdown">
                                        <button class="btn btn-sm btn-outline-secondary dropdown-toggle" 
                                                type="button" data-bs-toggle="dropdown">
                                            <i class="fas fa-sort me-1"></i>Sort
                                        </button>
                                        <ul class="dropdown-menu">
                                            <li><a class="dropdown-item" href="#" data-sort="created_at" data-order="desc">
                                                <i class="fas fa-clock me-2"></i>Newest First
                                            </a></li>
                                            <li><a class="dropdown-item" href="#" data-sort="created_at" data-order="asc">
                                                <i class="fas fa-clock me-2"></i>Oldest First
                                            </a></li>
                                            <li><a class="dropdown-item" href="#" data-sort="title" data-order="asc">
                                                <i class="fas fa-sort-alpha-down me-2"></i>Title A-Z
                                            </a></li>
                                            <li><a class="dropdown-item" href="#" data-sort="views" data-order="desc">
                                                <i class="fas fa-eye me-2"></i>Most Viewed
                                            </a></li>
                                            <li><a class="dropdown-item" href="#" data-sort="rating" data-order="desc">
                                                <i class="fas fa-star me-2"></i>Highest Rated
                                            </a></li>
                                        </ul>
                                    </div>
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

                <!-- Modals -->
                ${this.getModalsHTML()}
            </div>

            <style>
                .interviews-admin-page {
                    background-color: var(--background-color);
                    min-height: 100vh;
                    color: var(--text-primary);
                }

                .card {
                    background-color: var(--card-background);
                    border-color: var(--card-border);
                    color: var(--text-primary);
                }

                .card-header {
                    background-color: var(--card-header-background);
                    border-bottom-color: var(--card-border);
                }

                .form-control, .form-select {
                    background-color: var(--input-background);
                    border-color: var(--input-border);
                    color: var(--text-primary);
                }

                .form-control:focus, .form-select:focus {
                    background-color: var(--input-background);
                    border-color: var(--primary-red);
                    color: var(--text-primary);
                    box-shadow: 0 0 0 0.2rem rgba(255, 0, 0, 0.25);
                }

                .table-dark {
                    --bs-table-bg: var(--card-background);
                    --bs-table-border-color: var(--card-border);
                }

                .btn-outline-secondary {
                    border-color: var(--card-border);
                    color: var(--text-secondary);
                }

                .btn-outline-secondary:hover {
                    background-color: var(--hover-background);
                    border-color: var(--primary-red);
                    color: var(--text-primary);
                }

                .statistics-card {
                    background: linear-gradient(135deg, var(--card-background) 0%, var(--hover-background) 100%);
                    border: 1px solid var(--card-border);
                    transition: all 0.3s ease;
                }

                .statistics-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(255, 0, 0, 0.1);
                }

                .interview-card {
                    background-color: var(--card-background);
                    border: 1px solid var(--card-border);
                    transition: all 0.3s ease;
                }

                .interview-card:hover {
                    border-color: var(--primary-red);
                    box-shadow: 0 2px 8px rgba(255, 0, 0, 0.1);
                }

                .status-badge {
                    font-size: 0.75rem;
                    padding: 0.25rem 0.5rem;
                }

                .moderation-status {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.25rem;
                }

                .featured-indicator {
                    color: var(--warning-color);
                }

                @media (max-width: 768px) {
                    .container-fluid {
                        padding-left: 1rem;
                        padding-right: 1rem;
                    }
                    
                    .d-flex.gap-2 {
                        flex-direction: column;
                        gap: 0.5rem !important;
                    }
                    
                    .btn {
                        width: 100%;
                    }
                }
            </style>
        `;
    }

    getStatisticsHTML() {
        const stats = this.statistics;
        
        return `
            <div class="col-lg-3 col-md-6 mb-3">
                <div class="card statistics-card h-100">
                    <div class="card-body text-center">
                        <div class="d-flex align-items-center justify-content-center mb-2">
                            <i class="fas fa-video fa-2x text-primary me-3"></i>
                            <div>
                                <h3 class="mb-0">${stats.total || 0}</h3>
                                <small class="text-muted">Total Interviews</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-lg-3 col-md-6 mb-3">
                <div class="card statistics-card h-100">
                    <div class="card-body text-center">
                        <div class="d-flex align-items-center justify-content-center mb-2">
                            <i class="fas fa-clock fa-2x text-warning me-3"></i>
                            <div>
                                <h3 class="mb-0">${stats.pending || 0}</h3>
                                <small class="text-muted">Pending Review</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-lg-3 col-md-6 mb-3">
                <div class="card statistics-card h-100">
                    <div class="card-body text-center">
                        <div class="d-flex align-items-center justify-content-center mb-2">
                            <i class="fas fa-star fa-2x text-success me-3"></i>
                            <div>
                                <h3 class="mb-0">${stats.featured || 0}</h3>
                                <small class="text-muted">Featured</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-lg-3 col-md-6 mb-3">
                <div class="card statistics-card h-100">
                    <div class="card-body text-center">
                        <div class="d-flex align-items-center justify-content-center mb-2">
                            <i class="fas fa-flag fa-2x text-danger me-3"></i>
                            <div>
                                <h3 class="mb-0">${stats.flagged || 0}</h3>
                                <small class="text-muted">Flagged</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getFiltersHTML() {
        return `
            <div class="row g-3">
                <div class="col-md-3">
                    <label class="form-label">Search</label>
                    <div class="input-group">
                        <input type="text" class="form-control" id="search-input"
                               placeholder="Search interviews..." value="${this.filters.search}">
                        <button class="btn btn-outline-secondary" type="button" id="search-btn">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                </div>
                <div class="col-md-2">
                    <label class="form-label">Status</label>
                    <select class="form-select" id="status-filter">
                        <option value="all" ${this.filters.status === 'all' ? 'selected' : ''}>All Status</option>
                        <option value="draft" ${this.filters.status === 'draft' ? 'selected' : ''}>Draft</option>
                        <option value="published" ${this.filters.status === 'published' ? 'selected' : ''}>Published</option>
                        <option value="private" ${this.filters.status === 'private' ? 'selected' : ''}>Private</option>
                        <option value="archived" ${this.filters.status === 'archived' ? 'selected' : ''}>Archived</option>
                    </select>
                </div>
                <div class="col-md-2">
                    <label class="form-label">Type</label>
                    <select class="form-select" id="type-filter">
                        <option value="all" ${this.filters.type === 'all' ? 'selected' : ''}>All Types</option>
                        <option value="video" ${this.filters.type === 'video' ? 'selected' : ''}>Video</option>
                        <option value="audio" ${this.filters.type === 'audio' ? 'selected' : ''}>Audio</option>
                        <option value="text" ${this.filters.type === 'text' ? 'selected' : ''}>Text</option>
                    </select>
                </div>
                <div class="col-md-2">
                    <label class="form-label">Moderation</label>
                    <select class="form-select" id="moderation-filter">
                        <option value="all" ${this.filters.moderation === 'all' ? 'selected' : ''}>All</option>
                        <option value="approved" ${this.filters.moderation === 'approved' ? 'selected' : ''}>Approved</option>
                        <option value="pending" ${this.filters.moderation === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="flagged" ${this.filters.moderation === 'flagged' ? 'selected' : ''}>Flagged</option>
                        <option value="rejected" ${this.filters.moderation === 'rejected' ? 'selected' : ''}>Rejected</option>
                    </select>
                </div>
                <div class="col-md-2">
                    <label class="form-label">Featured</label>
                    <select class="form-select" id="featured-filter">
                        <option value="all" ${this.filters.featured === 'all' ? 'selected' : ''}>All</option>
                        <option value="yes" ${this.filters.featured === 'yes' ? 'selected' : ''}>Featured</option>
                        <option value="no" ${this.filters.featured === 'no' ? 'selected' : ''}>Not Featured</option>
                    </select>
                </div>
                <div class="col-md-1">
                    <label class="form-label">&nbsp;</label>
                    <button class="btn btn-primary w-100" id="apply-filters-btn">
                        <i class="fas fa-filter"></i>
                    </button>
                </div>
            </div>
            <div class="row g-3 mt-2">
                <div class="col-md-3">
                    <label class="form-label">Category</label>
                    <select class="form-select" id="category-filter">
                        <option value="all" ${this.filters.category === 'all' ? 'selected' : ''}>All Categories</option>
                        <option value="business" ${this.filters.category === 'business' ? 'selected' : ''}>Business</option>
                        <option value="technology" ${this.filters.category === 'technology' ? 'selected' : ''}>Technology</option>
                        <option value="entertainment" ${this.filters.category === 'entertainment' ? 'selected' : ''}>Entertainment</option>
                        <option value="politics" ${this.filters.category === 'politics' ? 'selected' : ''}>Politics</option>
                        <option value="sports" ${this.filters.category === 'sports' ? 'selected' : ''}>Sports</option>
                        <option value="education" ${this.filters.category === 'education' ? 'selected' : ''}>Education</option>
                        <option value="health" ${this.filters.category === 'health' ? 'selected' : ''}>Health</option>
                        <option value="lifestyle" ${this.filters.category === 'lifestyle' ? 'selected' : ''}>Lifestyle</option>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label">Date Range</label>
                    <select class="form-select" id="date-range-filter">
                        <option value="all" ${this.filters.dateRange === 'all' ? 'selected' : ''}>All Time</option>
                        <option value="today" ${this.filters.dateRange === 'today' ? 'selected' : ''}>Today</option>
                        <option value="week" ${this.filters.dateRange === 'week' ? 'selected' : ''}>This Week</option>
                        <option value="month" ${this.filters.dateRange === 'month' ? 'selected' : ''}>This Month</option>
                        <option value="quarter" ${this.filters.dateRange === 'quarter' ? 'selected' : ''}>This Quarter</option>
                        <option value="year" ${this.filters.dateRange === 'year' ? 'selected' : ''}>This Year</option>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label">Interviewer</label>
                    <select class="form-select" id="interviewer-filter">
                        <option value="all" ${this.filters.interviewer === 'all' ? 'selected' : ''}>All Interviewers</option>
                        <!-- Populated dynamically -->
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label">Quick Filters</label>
                    <div class="d-flex gap-1">
                        <button class="btn btn-sm btn-outline-warning" id="needs-review-btn">
                            <i class="fas fa-exclamation-triangle me-1"></i>Needs Review
                        </button>
                        <button class="btn btn-sm btn-outline-danger" id="flagged-btn">
                            <i class="fas fa-flag me-1"></i>Flagged
                        </button>
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
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2 text-muted">Loading interviews...</p>
                </div>
            `;
        }

        if (this.interviews.length === 0) {
            return `
                <div class="text-center py-5">
                    <i class="fas fa-video fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">No interviews found</h5>
                    <p class="text-muted">Try adjusting your filters or search criteria.</p>
                </div>
            `;
        }

        if (this.viewMode === 'grid') {
            return this.getInterviewsGridHTML();
        } else {
            return this.getInterviewsTableHTML();
        }
    }

    getInterviewsTableHTML() {
        return `
            <div class="table-responsive">
                <table class="table table-dark table-hover mb-0">
                    <thead>
                        <tr>
                            <th width="40">
                                <input type="checkbox" class="form-check-input" id="select-all-checkbox">
                            </th>
                            <th>Interview</th>
                            <th>Interviewer</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Moderation</th>
                            <th>Views</th>
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
        const statusColors = {
            'draft': 'secondary',
            'published': 'success',
            'private': 'info',
            'archived': 'dark'
        };

        const moderationColors = {
            'approved': 'success',
            'pending': 'warning',
            'flagged': 'danger',
            'rejected': 'danger'
        };

        const typeIcons = {
            'video': 'fa-video',
            'audio': 'fa-microphone',
            'text': 'fa-file-alt'
        };

        return `
            <tr data-interview-id="${interview.id}">
                <td>
                    <input type="checkbox" class="form-check-input interview-checkbox"
                           value="${interview.id}">
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        ${interview.thumbnail_url ?
                            `<img src="${interview.thumbnail_url}" class="rounded me-2"
                                  style="width: 40px; height: 40px; object-fit: cover;">` :
                            `<div class="bg-secondary rounded me-2 d-flex align-items-center justify-content-center"
                                  style="width: 40px; height: 40px;">
                                <i class="fas ${typeIcons[interview.type]} text-white"></i>
                             </div>`
                        }
                        <div>
                            <div class="fw-bold">${interview.title}</div>
                            <small class="text-muted">${interview.category || 'Uncategorized'}</small>
                            ${interview.featured ? '<i class="fas fa-star text-warning ms-1 featured-indicator" title="Featured"></i>' : ''}
                        </div>
                    </div>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        ${interview.interviewer_avatar ?
                            `<img src="${interview.interviewer_avatar}" class="rounded-circle me-2"
                                  style="width: 24px; height: 24px;">` :
                            `<div class="bg-primary rounded-circle me-2 d-flex align-items-center justify-content-center"
                                  style="width: 24px; height: 24px;">
                                <i class="fas fa-user text-white" style="font-size: 10px;"></i>
                             </div>`
                        }
                        <span>${interview.interviewer_name}</span>
                    </div>
                </td>
                <td>
                    <span class="badge bg-secondary">
                        <i class="fas ${typeIcons[interview.type]} me-1"></i>
                        ${interview.type.charAt(0).toUpperCase() + interview.type.slice(1)}
                    </span>
                </td>
                <td>
                    <span class="badge bg-${statusColors[interview.status] || 'secondary'} status-badge">
                        ${interview.status.charAt(0).toUpperCase() + interview.status.slice(1)}
                    </span>
                </td>
                <td>
                    <div class="moderation-status">
                        <span class="badge bg-${moderationColors[interview.moderation_status] || 'secondary'} status-badge">
                            ${interview.moderation_status?.charAt(0).toUpperCase() + interview.moderation_status?.slice(1) || 'Pending'}
                        </span>
                        ${interview.flags_count > 0 ?
                            `<span class="badge bg-danger ms-1" title="${interview.flags_count} flags">
                                <i class="fas fa-flag"></i> ${interview.flags_count}
                             </span>` : ''
                        }
                    </div>
                </td>
                <td>
                    <span class="text-muted">
                        <i class="fas fa-eye me-1"></i>${interview.views || 0}
                    </span>
                </td>
                <td>
                    <small class="text-muted">${this.formatDate(interview.created_at)}</small>
                </td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary"
                                onclick="interviewsAdmin.viewInterview('${interview.id}')"
                                title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary"
                                onclick="interviewsAdmin.editInterview('${interview.id}')"
                                title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-outline-secondary dropdown-toggle"
                                    data-bs-toggle="dropdown" title="More">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#"
                                       onclick="interviewsAdmin.toggleFeatured('${interview.id}', ${!interview.featured})">
                                    <i class="fas fa-star me-2"></i>
                                    ${interview.featured ? 'Remove from Featured' : 'Add to Featured'}
                                </a></li>
                                <li><a class="dropdown-item" href="#"
                                       onclick="interviewsAdmin.moderateInterview('${interview.id}', 'approve')">
                                    <i class="fas fa-check me-2"></i>Approve
                                </a></li>
                                <li><a class="dropdown-item" href="#"
                                       onclick="interviewsAdmin.moderateInterview('${interview.id}', 'reject')">
                                    <i class="fas fa-times me-2"></i>Reject
                                </a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="#"
                                       onclick="interviewsAdmin.deleteInterview('${interview.id}')">
                                    <i class="fas fa-trash me-2"></i>Delete
                                </a></li>
                            </ul>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }

    getInterviewsGridHTML() {
        return `
            <div class="row g-3 p-3">
                ${this.interviews.map(interview => this.getInterviewCardHTML(interview)).join('')}
            </div>
        `;
    }

    getInterviewCardHTML(interview) {
        const statusColors = {
            'draft': 'secondary',
            'published': 'success',
            'private': 'info',
            'archived': 'dark'
        };

        const typeIcons = {
            'video': 'fa-video',
            'audio': 'fa-microphone',
            'text': 'fa-file-alt'
        };

        return `
            <div class="col-lg-4 col-md-6">
                <div class="card interview-card h-100" data-interview-id="${interview.id}">
                    <div class="position-relative">
                        ${interview.thumbnail_url ?
                            `<img src="${interview.thumbnail_url}" class="card-img-top"
                                  style="height: 200px; object-fit: cover;">` :
                            `<div class="card-img-top bg-secondary d-flex align-items-center justify-content-center"
                                  style="height: 200px;">
                                <i class="fas ${typeIcons[interview.type]} fa-3x text-white"></i>
                             </div>`
                        }
                        <div class="position-absolute top-0 start-0 p-2">
                            <input type="checkbox" class="form-check-input interview-checkbox"
                                   value="${interview.id}">
                        </div>
                        <div class="position-absolute top-0 end-0 p-2">
                            ${interview.featured ? '<i class="fas fa-star text-warning featured-indicator"></i>' : ''}
                        </div>
                        <div class="position-absolute bottom-0 start-0 p-2">
                            <span class="badge bg-${statusColors[interview.status] || 'secondary'}">
                                ${interview.status.charAt(0).toUpperCase() + interview.status.slice(1)}
                            </span>
                        </div>
                    </div>
                    <div class="card-body">
                        <h6 class="card-title">${interview.title}</h6>
                        <p class="card-text small text-muted">${interview.description || 'No description'}</p>
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <small class="text-muted">
                                <i class="fas fa-user me-1"></i>${interview.interviewer_name}
                            </small>
                            <small class="text-muted">
                                <i class="fas fa-eye me-1"></i>${interview.views || 0}
                            </small>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge bg-secondary">
                                <i class="fas ${typeIcons[interview.type]} me-1"></i>
                                ${interview.type.charAt(0).toUpperCase() + interview.type.slice(1)}
                            </span>
                            <small class="text-muted">${this.formatDate(interview.created_at)}</small>
                        </div>
                    </div>
                    <div class="card-footer bg-transparent">
                        <div class="btn-group w-100" role="group">
                            <button class="btn btn-sm btn-outline-primary"
                                    onclick="interviewsAdmin.viewInterview('${interview.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-secondary"
                                    onclick="interviewsAdmin.editInterview('${interview.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-secondary dropdown-toggle"
                                    data-bs-toggle="dropdown">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#"
                                       onclick="interviewsAdmin.toggleFeatured('${interview.id}', ${!interview.featured})">
                                    <i class="fas fa-star me-2"></i>
                                    ${interview.featured ? 'Remove from Featured' : 'Add to Featured'}
                                </a></li>
                                <li><a class="dropdown-item" href="#"
                                       onclick="interviewsAdmin.moderateInterview('${interview.id}', 'approve')">
                                    <i class="fas fa-check me-2"></i>Approve
                                </a></li>
                                <li><a class="dropdown-item" href="#"
                                       onclick="interviewsAdmin.moderateInterview('${interview.id}', 'reject')">
                                    <i class="fas fa-times me-2"></i>Reject
                                </a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="#"
                                       onclick="interviewsAdmin.deleteInterview('${interview.id}')">
                                    <i class="fas fa-trash me-2"></i>Delete
                                </a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getPaginationHTML() {
        if (this.totalPages <= 1) return '';

        const pages = [];
        const maxVisible = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(this.totalPages, startPage + maxVisible - 1);

        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        return `
            <nav>
                <ul class="pagination">
                    <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="interviewsAdmin.goToPage(${this.currentPage - 1})">
                            <i class="fas fa-chevron-left"></i>
                        </a>
                    </li>
                    ${Array.from({length: endPage - startPage + 1}, (_, i) => startPage + i).map(page => `
                        <li class="page-item ${page === this.currentPage ? 'active' : ''}">
                            <a class="page-link" href="#" onclick="interviewsAdmin.goToPage(${page})">${page}</a>
                        </li>
                    `).join('')}
                    <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="interviewsAdmin.goToPage(${this.currentPage + 1})">
                            <i class="fas fa-chevron-right"></i>
                        </a>
                    </li>
                </ul>
            </nav>
        `;
    }

    getModalsHTML() {
        return `
            <!-- Bulk Actions Modal -->
            <div class="modal fade" id="bulkActionsModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content bg-dark">
                        <div class="modal-header">
                            <h5 class="modal-title">Bulk Actions</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p>Select an action to apply to <span id="selected-count">0</span> selected interviews:</p>
                            <div class="d-grid gap-2">
                                <button class="btn btn-success" onclick="interviewsAdmin.bulkAction('approve')">
                                    <i class="fas fa-check me-2"></i>Approve All
                                </button>
                                <button class="btn btn-warning" onclick="interviewsAdmin.bulkAction('pending')">
                                    <i class="fas fa-clock me-2"></i>Mark as Pending
                                </button>
                                <button class="btn btn-info" onclick="interviewsAdmin.bulkAction('feature')">
                                    <i class="fas fa-star me-2"></i>Add to Featured
                                </button>
                                <button class="btn btn-secondary" onclick="interviewsAdmin.bulkAction('unfeature')">
                                    <i class="fas fa-star-o me-2"></i>Remove from Featured
                                </button>
                                <button class="btn btn-danger" onclick="interviewsAdmin.bulkAction('delete')">
                                    <i class="fas fa-trash me-2"></i>Delete All
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Interview Details Modal -->
            <div class="modal fade" id="interviewDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content bg-dark">
                        <div class="modal-header">
                            <h5 class="modal-title">Interview Details</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" id="interview-details-content">
                            <!-- Content loaded dynamically -->
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" id="edit-interview-btn">Edit Interview</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Moderation Modal -->
            <div class="modal fade" id="moderationModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content bg-dark">
                        <div class="modal-header">
                            <h5 class="modal-title">Moderate Interview</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="moderation-form">
                                <input type="hidden" id="moderation-interview-id">
                                <div class="mb-3">
                                    <label class="form-label">Action</label>
                                    <select class="form-select" id="moderation-action" required>
                                        <option value="">Select action...</option>
                                        <option value="approve">Approve</option>
                                        <option value="reject">Reject</option>
                                        <option value="flag">Flag for Review</option>
                                        <option value="hide">Hide</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Notes (Optional)</label>
                                    <textarea class="form-control" id="moderation-notes" rows="3"
                                              placeholder="Add notes about this moderation action..."></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="interviewsAdmin.submitModeration()">
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getNoPermissionHTML() {
        return `
            <div class="container py-5">
                <div class="row justify-content-center">
                    <div class="col-md-6 text-center">
                        <i class="fas fa-shield-alt fa-3x text-warning mb-3"></i>
                        <h3>Access Denied</h3>
                        <p class="text-muted">You don't have permission to access the interviews management dashboard.</p>
                        <a href="/admin" class="btn btn-primary">Back to Admin Dashboard</a>
                    </div>
                </div>
            </div>
        `;
    }

    async setupEventListeners(container) {
        // Search functionality
        const searchInput = container.querySelector('#search-input');
        const searchBtn = container.querySelector('#search-btn');

        if (searchInput && searchBtn) {
            searchBtn.addEventListener('click', () => this.handleSearch());
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleSearch();
            });
        }

        // Filter functionality
        const applyFiltersBtn = container.querySelector('#apply-filters-btn');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => this.applyFilters());
        }

        const clearFiltersBtn = container.querySelector('#clear-filters-btn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        }

        // Quick filter buttons
        const needsReviewBtn = container.querySelector('#needs-review-btn');
        if (needsReviewBtn) {
            needsReviewBtn.addEventListener('click', () => this.applyQuickFilter('needs-review'));
        }

        const flaggedBtn = container.querySelector('#flagged-btn');
        if (flaggedBtn) {
            flaggedBtn.addEventListener('click', () => this.applyQuickFilter('flagged'));
        }

        // View mode toggle
        const tableViewBtn = container.querySelector('#table-view-btn');
        const gridViewBtn = container.querySelector('#grid-view-btn');

        if (tableViewBtn) {
            tableViewBtn.addEventListener('click', () => this.setViewMode('table'));
        }
        if (gridViewBtn) {
            gridViewBtn.addEventListener('click', () => this.setViewMode('grid'));
        }

        // Bulk actions
        const bulkActionsBtn = container.querySelector('#bulk-actions-btn');
        if (bulkActionsBtn) {
            bulkActionsBtn.addEventListener('click', () => this.showBulkActionsModal());
        }

        // Select all checkbox
        const selectAllCheckbox = container.querySelector('#select-all-checkbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => this.toggleSelectAll(e.target.checked));
        }

        // Individual checkboxes
        container.addEventListener('change', (e) => {
            if (e.target.classList.contains('interview-checkbox')) {
                this.updateSelectedInterviews();
            }
        });

        // Sort dropdown
        container.addEventListener('click', (e) => {
            if (e.target.closest('[data-sort]')) {
                const sortElement = e.target.closest('[data-sort]');
                const sortBy = sortElement.dataset.sort;
                const sortOrder = sortElement.dataset.order;
                this.setSorting(sortBy, sortOrder);
            }
        });

        // Refresh button
        const refreshBtn = container.querySelector('#refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }

        // Export button
        const exportBtn = container.querySelector('#export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }

        // Global reference for modal callbacks
        window.interviewsAdmin = this;
    }

    async loadStatistics() {
        try {
            const response = await API.get('/admin/interviews/statistics');
            if (response.success) {
                this.statistics = response.data;
                this.updateStatisticsDisplay();
            }
        } catch (error) {
            console.error('Failed to load statistics:', error);
        }
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
                ...this.getActiveFilters()
            };

            const response = await API.get('/admin/interviews', params);

            if (response.success) {
                this.interviews = response.data.items || [];
                this.totalPages = Math.ceil((response.data.total || 0) / 20);
                this.updateInterviewsContainer();
                this.updateResultsCount(response.data.total || 0);
            }
        } catch (error) {
            console.error('Failed to load interviews:', error);
            this.showError('Failed to load interviews');
        } finally {
            this.isLoading = false;
        }
    }

    getActiveFilters() {
        const filters = {};

        Object.keys(this.filters).forEach(key => {
            if (this.filters[key] !== 'all' && this.filters[key] !== '') {
                filters[key] = this.filters[key];
            }
        });

        return filters;
    }

    updateStatisticsDisplay() {
        const container = document.getElementById('statistics-container');
        if (container) {
            container.innerHTML = this.getStatisticsHTML();
        }
    }

    updateInterviewsContainer() {
        const container = document.getElementById('interviews-container');
        if (container) {
            container.innerHTML = this.getInterviewsHTML();
        }
    }

    updateResultsCount(total = null) {
        const countElement = document.getElementById('results-count');
        if (countElement) {
            const count = total !== null ? total : this.interviews.length;
            countElement.textContent = `${count} interview${count !== 1 ? 's' : ''}`;
        }
    }

    handleSearch() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            this.filters.search = searchInput.value.trim();
            this.currentPage = 1;
            this.loadInterviews();
        }
    }

    applyFilters() {
        // Get all filter values
        this.filters.status = document.getElementById('status-filter')?.value || 'all';
        this.filters.type = document.getElementById('type-filter')?.value || 'all';
        this.filters.category = document.getElementById('category-filter')?.value || 'all';
        this.filters.moderation = document.getElementById('moderation-filter')?.value || 'all';
        this.filters.featured = document.getElementById('featured-filter')?.value || 'all';
        this.filters.dateRange = document.getElementById('date-range-filter')?.value || 'all';
        this.filters.interviewer = document.getElementById('interviewer-filter')?.value || 'all';

        this.currentPage = 1;
        this.loadInterviews();
    }

    clearFilters() {
        // Reset all filters
        Object.keys(this.filters).forEach(key => {
            this.filters[key] = key === 'search' ? '' : 'all';
        });

        // Reset form elements
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';

        const filterSelects = document.querySelectorAll('.form-select');
        filterSelects.forEach(select => {
            if (select.id !== 'interviewer-filter') {
                select.value = 'all';
            }
        });

        this.currentPage = 1;
        this.loadInterviews();
    }

    applyQuickFilter(type) {
        if (type === 'needs-review') {
            this.filters.moderation = 'pending';
        } else if (type === 'flagged') {
            this.filters.moderation = 'flagged';
        }

        this.currentPage = 1;
        this.loadInterviews();
    }

    setViewMode(mode) {
        this.viewMode = mode;

        // Update button states
        const tableBtn = document.getElementById('table-view-btn');
        const gridBtn = document.getElementById('grid-view-btn');

        if (tableBtn && gridBtn) {
            tableBtn.classList.toggle('active', mode === 'table');
            gridBtn.classList.toggle('active', mode === 'grid');
        }

        this.updateInterviewsContainer();
    }

    setSorting(sortBy, sortOrder) {
        this.sortBy = sortBy;
        this.sortOrder = sortOrder;
        this.currentPage = 1;
        this.loadInterviews();
    }

    goToPage(page) {
        if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
            this.currentPage = page;
            this.loadInterviews();
        }
    }

    toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.interview-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
        this.updateSelectedInterviews();
    }

    updateSelectedInterviews() {
        const checkboxes = document.querySelectorAll('.interview-checkbox:checked');
        this.selectedInterviews.clear();

        checkboxes.forEach(checkbox => {
            this.selectedInterviews.add(checkbox.value);
        });

        // Update bulk actions button
        const bulkActionsBtn = document.getElementById('bulk-actions-btn');
        if (bulkActionsBtn) {
            bulkActionsBtn.disabled = this.selectedInterviews.size === 0;
        }

        // Update select all checkbox state
        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        const allCheckboxes = document.querySelectorAll('.interview-checkbox');

        if (selectAllCheckbox && allCheckboxes.length > 0) {
            const checkedCount = document.querySelectorAll('.interview-checkbox:checked').length;
            selectAllCheckbox.checked = checkedCount === allCheckboxes.length;
            selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < allCheckboxes.length;
        }
    }

    async viewInterview(interviewId) {
        try {
            const response = await API.get(`/interviews/${interviewId}`);
            if (response.success) {
                this.showInterviewDetails(response.data);
            }
        } catch (error) {
            console.error('Failed to load interview details:', error);
            this.showError('Failed to load interview details');
        }
    }

    editInterview(interviewId) {
        window.open(`/interviews/${interviewId}/edit`, '_blank');
    }

    async toggleFeatured(interviewId, featured) {
        try {
            const response = await API.patch(`/admin/interviews/${interviewId}`, {
                featured: featured
            });

            if (response.success) {
                this.showSuccess(`Interview ${featured ? 'added to' : 'removed from'} featured`);
                this.loadInterviews();
                this.loadStatistics();
            }
        } catch (error) {
            console.error('Failed to update featured status:', error);
            this.showError('Failed to update featured status');
        }
    }

    async moderateInterview(interviewId, action) {
        // Show moderation modal for detailed actions
        const modal = new bootstrap.Modal(document.getElementById('moderationModal'));
        document.getElementById('moderation-interview-id').value = interviewId;
        document.getElementById('moderation-action').value = action;
        modal.show();
    }

    async submitModeration() {
        try {
            const interviewId = document.getElementById('moderation-interview-id').value;
            const action = document.getElementById('moderation-action').value;
            const notes = document.getElementById('moderation-notes').value;

            if (!action) {
                this.showError('Please select an action');
                return;
            }

            const response = await API.post(`/admin/interviews/${interviewId}/moderate`, {
                action: action,
                notes: notes
            });

            if (response.success) {
                this.showSuccess('Moderation action applied successfully');

                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('moderationModal'));
                modal.hide();

                // Reset form
                document.getElementById('moderation-form').reset();

                // Reload data
                this.loadInterviews();
                this.loadStatistics();
            }
        } catch (error) {
            console.error('Failed to apply moderation action:', error);
            this.showError('Failed to apply moderation action');
        }
    }

    async deleteInterview(interviewId) {
        if (!confirm('Are you sure you want to delete this interview? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await API.delete(`/interviews/${interviewId}`);

            if (response.success) {
                this.showSuccess('Interview deleted successfully');
                this.loadInterviews();
                this.loadStatistics();
            }
        } catch (error) {
            console.error('Failed to delete interview:', error);
            this.showError('Failed to delete interview');
        }
    }

    showBulkActionsModal() {
        if (this.selectedInterviews.size === 0) {
            this.showError('Please select interviews first');
            return;
        }

        const modal = new bootstrap.Modal(document.getElementById('bulkActionsModal'));
        document.getElementById('selected-count').textContent = this.selectedInterviews.size;
        modal.show();
    }

    async bulkAction(action) {
        if (this.selectedInterviews.size === 0) {
            this.showError('No interviews selected');
            return;
        }

        const interviewIds = Array.from(this.selectedInterviews);
        let confirmMessage = '';

        switch (action) {
            case 'approve':
                confirmMessage = `Approve ${interviewIds.length} interviews?`;
                break;
            case 'pending':
                confirmMessage = `Mark ${interviewIds.length} interviews as pending?`;
                break;
            case 'feature':
                confirmMessage = `Add ${interviewIds.length} interviews to featured?`;
                break;
            case 'unfeature':
                confirmMessage = `Remove ${interviewIds.length} interviews from featured?`;
                break;
            case 'delete':
                confirmMessage = `Delete ${interviewIds.length} interviews? This cannot be undone.`;
                break;
            default:
                this.showError('Invalid action');
                return;
        }

        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            const response = await API.post('/admin/interviews/bulk-action', {
                interview_ids: interviewIds,
                action: action
            });

            if (response.success) {
                this.showSuccess(`Bulk action applied to ${interviewIds.length} interviews`);

                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('bulkActionsModal'));
                modal.hide();

                // Clear selections
                this.selectedInterviews.clear();

                // Reload data
                this.loadInterviews();
                this.loadStatistics();
            }
        } catch (error) {
            console.error('Failed to apply bulk action:', error);
            this.showError('Failed to apply bulk action');
        }
    }

    showInterviewDetails(interview) {
        const content = document.getElementById('interview-details-content');
        if (content) {
            content.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <h6>Basic Information</h6>
                        <table class="table table-dark table-sm">
                            <tr><td><strong>Title:</strong></td><td>${interview.title}</td></tr>
                            <tr><td><strong>Type:</strong></td><td>${interview.type}</td></tr>
                            <tr><td><strong>Category:</strong></td><td>${interview.category || 'Uncategorized'}</td></tr>
                            <tr><td><strong>Status:</strong></td><td>${interview.status}</td></tr>
                            <tr><td><strong>Featured:</strong></td><td>${interview.featured ? 'Yes' : 'No'}</td></tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <h6>Statistics</h6>
                        <table class="table table-dark table-sm">
                            <tr><td><strong>Views:</strong></td><td>${interview.views || 0}</td></tr>
                            <tr><td><strong>Likes:</strong></td><td>${interview.likes || 0}</td></tr>
                            <tr><td><strong>Comments:</strong></td><td>${interview.comments_count || 0}</td></tr>
                            <tr><td><strong>Shares:</strong></td><td>${interview.shares || 0}</td></tr>
                            <tr><td><strong>Created:</strong></td><td>${this.formatDate(interview.created_at)}</td></tr>
                        </table>
                    </div>
                </div>
                ${interview.description ? `
                    <div class="mt-3">
                        <h6>Description</h6>
                        <p class="text-muted">${interview.description}</p>
                    </div>
                ` : ''}
                <div class="mt-3">
                    <h6>Moderation</h6>
                    <p><strong>Status:</strong> <span class="badge bg-secondary">${interview.moderation_status || 'Pending'}</span></p>
                    ${interview.flags_count > 0 ? `<p><strong>Flags:</strong> <span class="badge bg-danger">${interview.flags_count}</span></p>` : ''}
                </div>
            `;
        }

        const editBtn = document.getElementById('edit-interview-btn');
        if (editBtn) {
            editBtn.onclick = () => this.editInterview(interview.id);
        }

        const modal = new bootstrap.Modal(document.getElementById('interviewDetailsModal'));
        modal.show();
    }

    async exportData() {
        try {
            const params = {
                format: 'csv',
                ...this.getActiveFilters()
            };

            const response = await API.get('/admin/interviews/export', params);

            if (response.success) {
                // Create download link
                const blob = new Blob([response.data], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `interviews-export-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);

                this.showSuccess('Export completed successfully');
            }
        } catch (error) {
            console.error('Failed to export data:', error);
            this.showError('Failed to export data');
        }
    }

    async refresh() {
        await Promise.all([
            this.loadStatistics(),
            this.loadInterviews()
        ]);
        this.showSuccess('Data refreshed');
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';

        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    showSuccess(message) {
        // You can implement a toast notification system here
        console.log('Success:', message);
        alert(message); // Temporary implementation
    }

    showError(message) {
        // You can implement a toast notification system here
        console.error('Error:', message);
        alert('Error: ' + message); // Temporary implementation
    }
}

export default InterviewsManagementPage;
