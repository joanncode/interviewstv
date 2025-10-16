/**
 * Analytics Dashboard JavaScript Module
 * Comprehensive analytics dashboard with real-time updates
 */
class AnalyticsDashboard {
    constructor() {
        this.currentTimeRange = '24h';
        this.charts = {};
        this.refreshInterval = null;
        this.realTimeInterval = null;
        this.isLoading = false;
        this.config = {
            refreshRate: 30000, // 30 seconds
            realTimeRate: 5000, // 5 seconds
            animationDuration: 300,
            chartColors: {
                primary: '#FF0000',
                success: '#28a745',
                warning: '#ffc107',
                info: '#17a2b8',
                secondary: '#6c757d'
            }
        };
        
        this.init();
    }

    /**
     * Initialize the dashboard
     */
    init() {
        this.setupEventListeners();
        this.initializeCharts();
        this.loadDashboardData();
        this.startAutoRefresh();
        this.startRealTimeUpdates();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Time range selector
        document.querySelectorAll('[data-range]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.changeTimeRange(e.target.dataset.range);
            });
        });

        // Refresh button
        const refreshBtn = document.querySelector('[onclick="dashboard.refreshData()"]');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshData());
        }

        // Export buttons
        document.querySelectorAll('[onclick*="exportData"]').forEach(btn => {
            const format = btn.getAttribute('onclick').match(/'([^']+)'/)[1];
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportData(format);
            });
        });

        // Window visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseAutoRefresh();
            } else {
                this.resumeAutoRefresh();
            }
        });
    }

    /**
     * Change time range
     */
    changeTimeRange(range) {
        if (this.currentTimeRange === range) return;
        
        // Update UI
        document.querySelectorAll('[data-range]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.range === range);
        });
        
        this.currentTimeRange = range;
        this.loadDashboardData();
    }

    /**
     * Load dashboard data
     */
    async loadDashboardData() {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            this.showLoading();
            
            const response = await fetch(`http://localhost:8080/dashboard-data.php?timeRange=${this.currentTimeRange}`);
            const result = await response.json();
            
            if (result.success) {
                this.updateDashboard(result.data);
                this.showSuccess('Dashboard updated successfully');
            } else {
                this.showError(result.message || 'Failed to load dashboard data');
            }
        } catch (error) {
            this.showError('Error loading dashboard: ' + error.message);
            console.error('Dashboard load error:', error);
        } finally {
            this.isLoading = false;
            this.hideLoading();
            this.updateLastUpdated();
        }
    }

    /**
     * Update dashboard with new data
     */
    updateDashboard(data) {
        this.updateMetrics(data);
        this.updateCharts(data);
        this.updateActivity(data);
        this.updateTables(data);
        this.updatePerformanceIndicators(data);
    }

    /**
     * Update key metrics
     */
    updateMetrics(data) {
        const overview = data.user_analytics?.overview || {};
        
        this.animateCounter('total-interviews', overview.total_interviews || 0);
        this.animateCounter('total-views', overview.total_views || 0);
        this.animateCounter('total-followers', overview.total_followers || 0);
        
        // Update engagement rate with percentage
        const engagementRate = overview.engagement_rate || 0;
        this.animateCounter('engagement-rate', engagementRate, '%');
        
        // Update change indicators
        this.updateChangeIndicator('interviews-change', overview.interviews_change || 0);
        this.updateChangeIndicator('views-change', overview.views_change || 0);
        this.updateChangeIndicator('engagement-change', overview.engagement_change || 0);
        this.updateChangeIndicator('followers-change', overview.followers_change || 0);
    }

    /**
     * Animate counter with number formatting
     */
    animateCounter(elementId, targetValue, suffix = '') {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const startValue = parseInt(element.textContent.replace(/[^\d]/g, '')) || 0;
        const duration = this.config.animationDuration;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentValue = Math.floor(startValue + (targetValue - startValue) * progress);
            element.textContent = this.formatNumber(currentValue) + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * Update change indicator
     */
    updateChangeIndicator(elementId, changeValue) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const isPositive = changeValue >= 0;
        element.className = `metric-change ${isPositive ? 'positive' : 'negative'}`;
        element.textContent = `${isPositive ? '+' : ''}${changeValue}%`;
    }

    /**
     * Initialize charts
     */
    initializeCharts() {
        this.initEngagementChart();
        this.initCategoriesChart();
        this.initAudienceChart();
    }

    /**
     * Initialize engagement trends chart
     */
    initEngagementChart() {
        const ctx = document.getElementById('engagement-chart');
        if (!ctx) return;
        
        this.charts.engagement = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Views',
                    data: [],
                    borderColor: this.config.chartColors.primary,
                    backgroundColor: this.config.chartColors.primary + '20',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Engagement',
                    data: [],
                    borderColor: this.config.chartColors.success,
                    backgroundColor: this.config.chartColors.success + '20',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        labels: { color: '#fff' }
                    },
                    tooltip: {
                        backgroundColor: '#2a2a2a',
                        titleColor: '#fff',
                        bodyColor: '#ccc',
                        borderColor: '#444',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#ccc' },
                        grid: { color: '#444' }
                    },
                    y: {
                        ticks: { color: '#ccc' },
                        grid: { color: '#444' }
                    }
                }
            }
        });
    }

    /**
     * Initialize categories pie chart
     */
    initCategoriesChart() {
        const ctx = document.getElementById('categories-chart');
        if (!ctx) return;
        
        this.charts.categories = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        this.config.chartColors.primary,
                        this.config.chartColors.success,
                        this.config.chartColors.warning,
                        this.config.chartColors.info,
                        this.config.chartColors.secondary
                    ],
                    borderWidth: 2,
                    borderColor: '#1a1a1a'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { 
                            color: '#fff',
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: '#2a2a2a',
                        titleColor: '#fff',
                        bodyColor: '#ccc',
                        borderColor: '#444',
                        borderWidth: 1
                    }
                }
            }
        });
    }

    /**
     * Initialize audience demographics chart
     */
    initAudienceChart() {
        const ctx = document.getElementById('audience-chart');
        if (!ctx) return;
        
        this.charts.audience = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Audience',
                    data: [],
                    backgroundColor: this.config.chartColors.primary,
                    borderColor: this.config.chartColors.primary,
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#2a2a2a',
                        titleColor: '#fff',
                        bodyColor: '#ccc',
                        borderColor: '#444',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#ccc' },
                        grid: { color: '#444' }
                    },
                    y: {
                        ticks: { color: '#ccc' },
                        grid: { color: '#444' }
                    }
                }
            }
        });
    }

    /**
     * Update charts with new data
     */
    updateCharts(data) {
        this.updateEngagementChart(data.user_analytics?.engagement_trends || []);
        this.updateCategoriesChart(data.content_analytics?.category_performance || []);
        this.updateAudienceChart(data.user_analytics?.audience_demographics || {});
    }

    /**
     * Update engagement chart
     */
    updateEngagementChart(data) {
        if (!this.charts.engagement) return;
        
        // Generate mock data based on time range
        const labels = this.generateTimeLabels();
        const views = this.generateMockData(labels.length, 100, 500);
        const engagement = this.generateMockData(labels.length, 50, 300);
        
        this.charts.engagement.data.labels = labels;
        this.charts.engagement.data.datasets[0].data = views;
        this.charts.engagement.data.datasets[1].data = engagement;
        this.charts.engagement.update('active');
    }

    /**
     * Update categories chart
     */
    updateCategoriesChart(data) {
        if (!this.charts.categories) return;
        
        const labels = ['Technical', 'Business', 'Creative', 'Educational', 'Entertainment'];
        const values = [30, 25, 20, 15, 10];
        
        this.charts.categories.data.labels = labels;
        this.charts.categories.data.datasets[0].data = values;
        this.charts.categories.update('active');
    }

    /**
     * Update audience chart
     */
    updateAudienceChart(data) {
        if (!this.charts.audience) return;
        
        const labels = ['18-24', '25-34', '35-44', '45-54', '55+'];
        const values = [25, 35, 20, 15, 5];
        
        this.charts.audience.data.labels = labels;
        this.charts.audience.data.datasets[0].data = values;
        this.charts.audience.update('active');
    }

    /**
     * Generate time labels based on current time range
     */
    generateTimeLabels() {
        const now = new Date();
        const labels = [];
        
        switch (this.currentTimeRange) {
            case '24h':
                for (let i = 23; i >= 0; i--) {
                    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
                    labels.push(time.getHours() + ':00');
                }
                break;
            case '7d':
                for (let i = 6; i >= 0; i--) {
                    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                    labels.push(date.toLocaleDateString('en', { weekday: 'short' }));
                }
                break;
            case '30d':
                for (let i = 29; i >= 0; i--) {
                    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                    labels.push(date.getDate().toString());
                }
                break;
            case '90d':
                for (let i = 11; i >= 0; i--) {
                    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    labels.push(date.toLocaleDateString('en', { month: 'short' }));
                }
                break;
        }
        
        return labels;
    }

    /**
     * Generate mock data for charts
     */
    generateMockData(length, min, max) {
        return Array.from({ length }, () => 
            Math.floor(Math.random() * (max - min + 1)) + min
        );
    }

    /**
     * Update activity feed
     */
    updateActivity(data) {
        const activities = [
            { type: 'interview', message: 'New interview "Tech Talk #5" published', time: '2 minutes ago', icon: 'fas fa-video' },
            { type: 'engagement', message: '50 new likes on "Business Insights"', time: '5 minutes ago', icon: 'fas fa-heart' },
            { type: 'user', message: '10 new followers joined', time: '15 minutes ago', icon: 'fas fa-user-plus' },
            { type: 'system', message: 'Analytics data updated', time: '30 minutes ago', icon: 'fas fa-sync-alt' },
            { type: 'performance', message: 'Server response time improved', time: '1 hour ago', icon: 'fas fa-tachometer-alt' }
        ];

        const feed = document.getElementById('activity-feed');
        if (!feed) return;
        
        feed.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="d-flex align-items-start">
                    <i class="${activity.icon} text-danger me-3 mt-1"></i>
                    <div class="flex-grow-1">
                        <div class="text-white">${activity.message}</div>
                        <div class="activity-time">${activity.time}</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Update performance indicators
     */
    updatePerformanceIndicators(data) {
        const performance = data.performance_metrics || {};
        
        document.getElementById('response-time').textContent = (performance.response_time || 150) + 'ms';
        document.getElementById('uptime').textContent = (performance.uptime || 99.9) + '%';
        document.getElementById('error-rate').textContent = (performance.error_rate || 0.1) + '%';
        document.getElementById('active-users').textContent = this.formatNumber(performance.active_users || 1234);
    }

    /**
     * Update tables
     */
    updateTables(data) {
        const mockContent = [
            { title: 'Tech Interview #5', views: 1250, engagement: '8.5%', duration: '45:30', status: 'live' },
            { title: 'Business Insights', views: 980, engagement: '6.2%', duration: '32:15', status: 'online' },
            { title: 'Creative Process', views: 750, engagement: '7.8%', duration: '28:45', status: 'online' },
            { title: 'Startup Journey', views: 650, engagement: '5.9%', duration: '41:20', status: 'offline' },
            { title: 'Design Thinking', views: 580, engagement: '6.8%', duration: '38:12', status: 'online' }
        ];

        const table = document.getElementById('top-content-table');
        if (!table) return;
        
        table.innerHTML = mockContent.map(item => `
            <tr>
                <td>
                    <div class="text-white">${item.title}</div>
                    <small class="text-muted">Interview</small>
                </td>
                <td>${this.formatNumber(item.views)}</td>
                <td>${item.engagement}</td>
                <td>${item.duration}</td>
                <td><span class="status-badge ${item.status}">${item.status.toUpperCase()}</span></td>
            </tr>
        `).join('');
    }

    /**
     * Start auto refresh
     */
    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            if (!document.hidden) {
                this.loadDashboardData();
            }
        }, this.config.refreshRate);
    }

    /**
     * Start real-time updates
     */
    startRealTimeUpdates() {
        this.realTimeInterval = setInterval(() => {
            if (!document.hidden) {
                this.updateRealTimeStats();
            }
        }, this.config.realTimeRate);
    }

    /**
     * Update real-time statistics
     */
    async updateRealTimeStats() {
        try {
            const response = await fetch('http://localhost:8080/dashboard-data.php');
            const result = await response.json();
            
            if (result.success) {
                // Update real-time indicators
                this.updateRealTimeIndicators(result.data);
            }
        } catch (error) {
            console.warn('Real-time update failed:', error);
        }
    }

    /**
     * Update real-time indicators
     */
    updateRealTimeIndicators(data) {
        // Update active users count
        const activeUsers = data.active_sessions?.total_active || Math.floor(Math.random() * 100) + 1000;
        document.getElementById('active-users').textContent = this.formatNumber(activeUsers);
        
        // Update last updated timestamp
        this.updateLastUpdated();
    }

    /**
     * Pause auto refresh
     */
    pauseAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        if (this.realTimeInterval) {
            clearInterval(this.realTimeInterval);
            this.realTimeInterval = null;
        }
    }

    /**
     * Resume auto refresh
     */
    resumeAutoRefresh() {
        if (!this.refreshInterval) {
            this.startAutoRefresh();
        }
        if (!this.realTimeInterval) {
            this.startRealTimeUpdates();
        }
    }

    /**
     * Refresh data manually
     */
    refreshData() {
        this.loadDashboardData();
    }

    /**
     * Export analytics data
     */
    exportData(format) {
        const url = `/api/analytics/export?timeRange=${this.currentTimeRange}&format=${format}`;
        
        // Create temporary link for download
        const link = document.createElement('a');
        link.href = url;
        link.download = `analytics_${this.currentTimeRange}_${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showSuccess(`Analytics data exported as ${format.toUpperCase()}`);
    }

    /**
     * Update last updated timestamp
     */
    updateLastUpdated() {
        const element = document.getElementById('last-updated');
        if (element) {
            element.textContent = 'Last updated: ' + new Date().toLocaleTimeString();
        }
    }

    /**
     * Format numbers with K/M suffixes
     */
    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    /**
     * Show loading state
     */
    showLoading() {
        // Add loading overlay to main content
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="text-center">
                <div class="spinner-border text-danger" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <div class="text-white mt-2">Updating dashboard...</div>
            </div>
        `;
        
        const container = document.querySelector('.container-fluid');
        if (container && !container.querySelector('.loading-overlay')) {
            container.style.position = 'relative';
            container.appendChild(overlay);
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        this.showToast('success', 'Success', message);
    }

    /**
     * Show error message
     */
    showError(message) {
        this.showToast('error', 'Error', message);
    }

    /**
     * Show toast notification
     */
    showToast(type, title, message) {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : 'danger'} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <strong>${title}:</strong> ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        // Add to toast container
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }
        
        container.appendChild(toast);
        
        // Show toast
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        // Remove after hiding
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    /**
     * Cleanup when dashboard is destroyed
     */
    destroy() {
        this.pauseAutoRefresh();
        
        // Destroy charts
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        
        this.charts = {};
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new AnalyticsDashboard();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.dashboard) {
        window.dashboard.destroy();
    }
});
