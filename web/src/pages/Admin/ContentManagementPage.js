import API from '../../services/api.js';
import Auth from '../../services/auth.js';
import Router from '../../utils/router.js';

class ContentManagementPage {
    constructor() {
        this.currentUser = Auth.getCurrentUser();
        this.dashboardData = null;
        this.selectedContent = new Set();
        this.currentView = 'dashboard'; // dashboard, analytics, moderation
        this.isLoading = false;
    }

    async render(container, props = {}) {
        // Check permissions
        if (!this.currentUser || !['admin', 'moderator'].includes(this.currentUser.role)) {
            Router.navigate('/');
            return;
        }

        container.innerHTML = this.getHTML();
        await this.loadDashboardData();
        this.setupEventListeners(container);
    }

    getHTML() {
        return `
            <div class="container-fluid py-4">
                <div class="row">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <h1 class="h3 mb-0">Content Management</h1>
                            <div class="btn-group" role="group">
                                <button type="button" class="btn btn-outline-primary ${this.currentView === 'dashboard' ? 'active' : ''}" 
                                        data-view="dashboard">
                                    <i class="fas fa-tachometer-alt me-2"></i>Dashboard
                                </button>
                                <button type="button" class="btn btn-outline-primary ${this.currentView === 'analytics' ? 'active' : ''}" 
                                        data-view="analytics">
                                    <i class="fas fa-chart-line me-2"></i>Analytics
                                </button>
                                ${this.currentUser.role === 'admin' ? `
                                    <button type="button" class="btn btn-outline-primary ${this.currentView === 'moderation' ? 'active' : ''}" 
                                            data-view="moderation">
                                        <i class="fas fa-shield-alt me-2"></i>Moderation
                                    </button>
                                ` : ''}
                            </div>
                        </div>

                        <div id="alert-container"></div>

                        <!-- Dashboard View -->
                        <div id="dashboard-view" style="display: ${this.currentView === 'dashboard' ? 'block' : 'none'}">
                            ${this.getDashboardHTML()}
                        </div>

                        <!-- Analytics View -->
                        <div id="analytics-view" style="display: ${this.currentView === 'analytics' ? 'block' : 'none'}">
                            ${this.getAnalyticsHTML()}
                        </div>

                        <!-- Moderation View -->
                        <div id="moderation-view" style="display: ${this.currentView === 'moderation' ? 'block' : 'none'}">
                            ${this.getModerationHTML()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getDashboardHTML() {
        if (!this.dashboardData) {
            return `
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-3">Loading dashboard data...</p>
                </div>
            `;
        }

        const { overview, top_content, category_performance, content_health, moderation_stats } = this.dashboardData;

        return `
            <!-- Overview Stats -->
            <div class="row mb-4">
                <div class="col-md-3">
                    <div class="card bg-primary text-white">
                        <div class="card-body">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <h4 class="mb-0">${overview.total_interviews || 0}</h4>
                                    <p class="mb-0">Total Interviews</p>
                                </div>
                                <div class="align-self-center">
                                    <i class="fas fa-video fa-2x"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-success text-white">
                        <div class="card-body">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <h4 class="mb-0">${overview.published_interviews || 0}</h4>
                                    <p class="mb-0">Published</p>
                                </div>
                                <div class="align-self-center">
                                    <i class="fas fa-check-circle fa-2x"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-info text-white">
                        <div class="card-body">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <h4 class="mb-0">${this.formatNumber(overview.total_views || 0)}</h4>
                                    <p class="mb-0">Total Views</p>
                                </div>
                                <div class="align-self-center">
                                    <i class="fas fa-eye fa-2x"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-warning text-white">
                        <div class="card-body">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <h4 class="mb-0">${overview.draft_interviews || 0}</h4>
                                    <p class="mb-0">Drafts</p>
                                </div>
                                <div class="align-self-center">
                                    <i class="fas fa-edit fa-2x"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row">
                <!-- Top Performing Content -->
                <div class="col-lg-8">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">Top Performing Content</h5>
                        </div>
                        <div class="card-body">
                            ${this.getTopContentTable(top_content)}
                        </div>
                    </div>
                </div>

                <!-- Content Health -->
                <div class="col-lg-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">Content Health Score</h5>
                        </div>
                        <div class="card-body">
                            <div class="text-center mb-3">
                                <div class="progress-circle" data-percentage="${Math.round(content_health.overall_health_score || 0)}">
                                    <span class="progress-value">${Math.round(content_health.overall_health_score || 0)}%</span>
                                </div>
                            </div>
                            <div class="health-metrics">
                                <div class="d-flex justify-content-between mb-2">
                                    <span>Thumbnails</span>
                                    <span>${Math.round(content_health.thumbnail_completion || 0)}%</span>
                                </div>
                                <div class="d-flex justify-content-between mb-2">
                                    <span>Descriptions</span>
                                    <span>${Math.round(content_health.description_completion || 0)}%</span>
                                </div>
                                <div class="d-flex justify-content-between mb-2">
                                    <span>Tags</span>
                                    <span>${Math.round(content_health.tag_completion || 0)}%</span>
                                </div>
                                <div class="d-flex justify-content-between">
                                    <span>Categories</span>
                                    <span>${Math.round(content_health.category_completion || 0)}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            ${moderation_stats ? `
                <div class="row mt-4">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">Moderation Overview</h5>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-3">
                                        <div class="text-center">
                                            <h4 class="text-warning">${moderation_stats.flags.pending_flags || 0}</h4>
                                            <p class="mb-0">Pending Flags</p>
                                        </div>
                                    </div>
                                    <div class="col-md-3">
                                        <div class="text-center">
                                            <h4 class="text-success">${moderation_stats.flags.resolved_flags || 0}</h4>
                                            <p class="mb-0">Resolved Flags</p>
                                        </div>
                                    </div>
                                    <div class="col-md-3">
                                        <div class="text-center">
                                            <h4 class="text-info">${moderation_stats.flags.unique_flagged_content || 0}</h4>
                                            <p class="mb-0">Flagged Content</p>
                                        </div>
                                    </div>
                                    <div class="col-md-3">
                                        <div class="text-center">
                                            <h4 class="text-primary">${Math.round(moderation_stats.flags.avg_resolution_time_hours || 0)}h</h4>
                                            <p class="mb-0">Avg Resolution Time</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}
        `;
    }

    getAnalyticsHTML() {
        return `
            <div class="card">
                <div class="card-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Content Analytics</h5>
                        <div class="btn-group">
                            <select class="form-select" id="analytics-date-range">
                                <option value="7 days">Last 7 days</option>
                                <option value="30 days" selected>Last 30 days</option>
                                <option value="90 days">Last 90 days</option>
                                <option value="1 year">Last year</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div id="analytics-content">
                        <div class="text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading analytics...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getModerationHTML() {
        return `
            <div class="card">
                <div class="card-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Moderation Queue</h5>
                        <button type="button" class="btn btn-primary btn-sm" id="refresh-moderation">
                            <i class="fas fa-sync-alt me-2"></i>Refresh
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div id="moderation-content">
                        <div class="text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading moderation queue...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getTopContentTable(topContent) {
        if (!topContent || topContent.length === 0) {
            return '<p class="text-muted">No content data available</p>';
        }

        return `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Views</th>
                            <th>Likes</th>
                            <th>Comments</th>
                            <th>Published</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${topContent.map(content => `
                            <tr>
                                <td>
                                    <a href="/interviews/${content.id}" class="text-decoration-none">
                                        ${content.title}
                                    </a>
                                </td>
                                <td><span class="badge bg-secondary">${content.category || 'Uncategorized'}</span></td>
                                <td>${this.formatNumber(content.view_count)}</td>
                                <td>${this.formatNumber(content.like_count)}</td>
                                <td>${this.formatNumber(content.comment_count)}</td>
                                <td>${this.formatDate(content.published_at)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async loadDashboardData() {
        try {
            const response = await API.get('/api/content-management/dashboard');
            if (response.success) {
                this.dashboardData = response.data;
                this.updateDashboardView();
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showAlert('error', 'Failed to load dashboard data');
        }
    }

    updateDashboardView() {
        const dashboardView = document.getElementById('dashboard-view');
        if (dashboardView && this.currentView === 'dashboard') {
            dashboardView.innerHTML = this.getDashboardHTML();
        }
    }

    setupEventListeners(container) {
        // View switching
        const viewButtons = container.querySelectorAll('[data-view]');
        viewButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const view = e.target.closest('[data-view]').dataset.view;
                this.switchView(view);
            });
        });

        // Analytics date range change
        const dateRangeSelect = container.querySelector('#analytics-date-range');
        if (dateRangeSelect) {
            dateRangeSelect.addEventListener('change', () => {
                this.loadAnalytics();
            });
        }

        // Refresh moderation queue
        const refreshBtn = container.querySelector('#refresh-moderation');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadModerationQueue();
            });
        }
    }

    switchView(view) {
        this.currentView = view;
        
        // Update button states
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Show/hide views
        document.getElementById('dashboard-view').style.display = view === 'dashboard' ? 'block' : 'none';
        document.getElementById('analytics-view').style.display = view === 'analytics' ? 'block' : 'none';
        document.getElementById('moderation-view').style.display = view === 'moderation' ? 'block' : 'none';

        // Load data for the view
        if (view === 'analytics') {
            this.loadAnalytics();
        } else if (view === 'moderation') {
            this.loadModerationQueue();
        }
    }

    async loadAnalytics() {
        const dateRange = document.getElementById('analytics-date-range')?.value || '30 days';
        const analyticsContent = document.getElementById('analytics-content');
        
        if (!analyticsContent) return;

        analyticsContent.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading analytics...</span>
                </div>
            </div>
        `;

        try {
            const response = await API.get(`/api/content-management/analytics?date_range=${encodeURIComponent(dateRange)}`);
            if (response.success) {
                analyticsContent.innerHTML = this.renderAnalytics(response.data);
            }
        } catch (error) {
            console.error('Failed to load analytics:', error);
            analyticsContent.innerHTML = '<p class="text-danger">Failed to load analytics data</p>';
        }
    }

    async loadModerationQueue() {
        const moderationContent = document.getElementById('moderation-content');
        
        if (!moderationContent) return;

        moderationContent.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading moderation queue...</span>
                </div>
            </div>
        `;

        try {
            const response = await API.get('/api/content-management/moderation-queue');
            if (response.success) {
                moderationContent.innerHTML = this.renderModerationQueue(response.data);
            }
        } catch (error) {
            console.error('Failed to load moderation queue:', error);
            moderationContent.innerHTML = '<p class="text-danger">Failed to load moderation queue</p>';
        }
    }

    renderAnalytics(data) {
        // This would render charts and analytics data
        // For now, return a placeholder
        return `
            <div class="row">
                <div class="col-12">
                    <h6>Content Trends</h6>
                    <p class="text-muted">Analytics charts would be rendered here using Chart.js or similar library</p>
                    <pre>${JSON.stringify(data, null, 2)}</pre>
                </div>
            </div>
        `;
    }

    renderModerationQueue(data) {
        if (!data || data.length === 0) {
            return '<p class="text-muted">No pending moderation items</p>';
        }

        return `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Content</th>
                            <th>Type</th>
                            <th>Reason</th>
                            <th>Flags</th>
                            <th>Reported</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(item => `
                            <tr>
                                <td>${item.content_title || 'Unknown'}</td>
                                <td><span class="badge bg-info">${item.content_type}</span></td>
                                <td><span class="badge bg-warning">${item.reason}</span></td>
                                <td>${item.flag_count}</td>
                                <td>${this.formatDate(item.flagged_at)}</td>
                                <td>
                                    <div class="btn-group btn-group-sm">
                                        <button class="btn btn-success" onclick="moderateContent(${item.content_id}, '${item.content_type}', 'approve')">
                                            Approve
                                        </button>
                                        <button class="btn btn-danger" onclick="moderateContent(${item.content_id}, '${item.content_type}', 'reject')">
                                            Reject
                                        </button>
                                        <button class="btn btn-warning" onclick="moderateContent(${item.content_id}, '${item.content_type}', 'hide')">
                                            Hide
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    }

    showAlert(type, message) {
        const alertContainer = document.getElementById('alert-container');
        if (!alertContainer) return;

        const alertClass = type === 'error' ? 'alert-danger' : 'alert-success';
        alertContainer.innerHTML = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    }
}

// Global function for moderation actions
window.moderateContent = async function(contentId, contentType, action) {
    try {
        const response = await API.post('/api/content-management/moderate', {
            content_id: contentId,
            content_type: contentType,
            action: action
        });

        if (response.success) {
            // Reload moderation queue
            const page = document.querySelector('.content-management-page');
            if (page) {
                page.loadModerationQueue();
            }
        }
    } catch (error) {
        console.error('Moderation action failed:', error);
        alert('Failed to moderate content');
    }
};

export default ContentManagementPage;
