import API from '../../services/api.js';
import Auth from '../../services/auth.js';
import Router from '../../utils/router.js';
import { securityService } from '../../services/security.js';

class SecurityDashboardPage {
    constructor() {
        this.currentUser = Auth.getCurrentUser();
        this.securityData = null;
        this.isLoading = false;
        this.refreshInterval = null;
    }

    async render(container, props = {}) {
        // Check permissions
        if (!this.currentUser || this.currentUser.role !== 'admin') {
            Router.navigate('/');
            return;
        }

        container.innerHTML = this.getHTML();
        await this.loadSecurityData();
        this.setupEventListeners(container);
        this.startAutoRefresh();
    }

    getHTML() {
        return `
            <div class="container-fluid py-4">
                <div class="row">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <h1 class="h3 mb-0">
                                <i class="fas fa-shield-alt me-2"></i>Security Dashboard
                            </h1>
                            <div class="btn-group">
                                <button type="button" class="btn btn-outline-primary" id="refresh-btn">
                                    <i class="fas fa-sync-alt me-2"></i>Refresh
                                </button>
                                <button type="button" class="btn btn-outline-secondary" id="export-btn">
                                    <i class="fas fa-download me-2"></i>Export Report
                                </button>
                            </div>
                        </div>

                        <div id="alert-container"></div>

                        <!-- Security Overview -->
                        <div class="row mb-4">
                            <div class="col-md-3">
                                <div class="card bg-danger text-white">
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between">
                                            <div>
                                                <h4 class="mb-0" id="critical-events">-</h4>
                                                <p class="mb-0">Critical Events</p>
                                            </div>
                                            <div class="align-self-center">
                                                <i class="fas fa-exclamation-triangle fa-2x"></i>
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
                                                <h4 class="mb-0" id="failed-logins">-</h4>
                                                <p class="mb-0">Failed Logins</p>
                                            </div>
                                            <div class="align-self-center">
                                                <i class="fas fa-user-times fa-2x"></i>
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
                                                <h4 class="mb-0" id="blocked-ips">-</h4>
                                                <p class="mb-0">Blocked IPs</p>
                                            </div>
                                            <div class="align-self-center">
                                                <i class="fas fa-ban fa-2x"></i>
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
                                                <h4 class="mb-0" id="security-score">-</h4>
                                                <p class="mb-0">Security Score</p>
                                            </div>
                                            <div class="align-self-center">
                                                <i class="fas fa-shield-check fa-2x"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="row">
                            <!-- Recent Security Events -->
                            <div class="col-lg-8">
                                <div class="card">
                                    <div class="card-header">
                                        <h5 class="mb-0">Recent Security Events</h5>
                                    </div>
                                    <div class="card-body">
                                        <div id="security-events-container">
                                            <div class="text-center py-4">
                                                <div class="spinner-border text-primary" role="status">
                                                    <span class="visually-hidden">Loading...</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Security Actions -->
                            <div class="col-lg-4">
                                <div class="card">
                                    <div class="card-header">
                                        <h5 class="mb-0">Quick Actions</h5>
                                    </div>
                                    <div class="card-body">
                                        <div class="d-grid gap-2">
                                            <button class="btn btn-danger btn-sm" id="ban-ip-btn">
                                                <i class="fas fa-ban me-2"></i>Ban IP Address
                                            </button>
                                            <button class="btn btn-warning btn-sm" id="clear-logs-btn">
                                                <i class="fas fa-trash me-2"></i>Clear Old Logs
                                            </button>
                                            <button class="btn btn-info btn-sm" id="security-scan-btn">
                                                <i class="fas fa-search me-2"></i>Run Security Scan
                                            </button>
                                            <button class="btn btn-secondary btn-sm" id="backup-logs-btn">
                                                <i class="fas fa-archive me-2"></i>Backup Logs
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <!-- System Status -->
                                <div class="card mt-3">
                                    <div class="card-header">
                                        <h5 class="mb-0">System Status</h5>
                                    </div>
                                    <div class="card-body">
                                        <div id="system-status">
                                            <div class="d-flex justify-content-between mb-2">
                                                <span>HTTPS Enabled</span>
                                                <span class="badge bg-success" id="https-status">✓</span>
                                            </div>
                                            <div class="d-flex justify-content-between mb-2">
                                                <span>CSRF Protection</span>
                                                <span class="badge bg-success" id="csrf-status">✓</span>
                                            </div>
                                            <div class="d-flex justify-content-between mb-2">
                                                <span>Rate Limiting</span>
                                                <span class="badge bg-success" id="rate-limit-status">✓</span>
                                            </div>
                                            <div class="d-flex justify-content-between mb-2">
                                                <span>Security Headers</span>
                                                <span class="badge bg-success" id="headers-status">✓</span>
                                            </div>
                                            <div class="d-flex justify-content-between">
                                                <span>Input Validation</span>
                                                <span class="badge bg-success" id="validation-status">✓</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Detailed Analytics -->
                        <div class="row mt-4">
                            <div class="col-12">
                                <div class="card">
                                    <div class="card-header">
                                        <h5 class="mb-0">Security Analytics</h5>
                                    </div>
                                    <div class="card-body">
                                        <div id="security-analytics">
                                            <p class="text-muted">Security analytics charts would be displayed here</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Ban IP Modal -->
            <div class="modal fade" id="banIpModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Ban IP Address</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="ban-ip-form">
                                <div class="mb-3">
                                    <label for="ip-address" class="form-label">IP Address</label>
                                    <input type="text" class="form-control" id="ip-address" required>
                                </div>
                                <div class="mb-3">
                                    <label for="ban-reason" class="form-label">Reason</label>
                                    <textarea class="form-control" id="ban-reason" rows="3" required></textarea>
                                </div>
                                <div class="mb-3">
                                    <label for="ban-duration" class="form-label">Duration</label>
                                    <select class="form-select" id="ban-duration">
                                        <option value="1">1 Hour</option>
                                        <option value="24">24 Hours</option>
                                        <option value="168">1 Week</option>
                                        <option value="720">1 Month</option>
                                        <option value="0">Permanent</option>
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-danger" id="confirm-ban-btn">Ban IP</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadSecurityData() {
        try {
            this.isLoading = true;
            
            // Load security dashboard data
            const response = await API.get('/api/security/dashboard');
            if (response.success) {
                this.securityData = response.data;
                this.updateDashboard();
            }
        } catch (error) {
            console.error('Failed to load security data:', error);
            this.showAlert('error', 'Failed to load security data');
        } finally {
            this.isLoading = false;
        }
    }

    updateDashboard() {
        if (!this.securityData) return;

        // Update overview stats
        document.getElementById('critical-events').textContent = this.securityData.critical_events || 0;
        document.getElementById('failed-logins').textContent = this.securityData.failed_logins || 0;
        document.getElementById('blocked-ips').textContent = this.securityData.blocked_ips || 0;
        document.getElementById('security-score').textContent = this.securityData.security_score || 'N/A';

        // Update recent events
        this.renderSecurityEvents();
        
        // Update system status
        this.updateSystemStatus();
    }

    renderSecurityEvents() {
        const container = document.getElementById('security-events-container');
        const events = this.securityData.recent_events || [];

        if (events.length === 0) {
            container.innerHTML = '<p class="text-muted">No recent security events</p>';
            return;
        }

        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Event</th>
                            <th>Severity</th>
                            <th>IP Address</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${events.map(event => `
                            <tr>
                                <td>${this.formatDate(event.created_at)}</td>
                                <td>${event.event_type}</td>
                                <td>
                                    <span class="badge bg-${this.getSeverityColor(event.severity)}">
                                        ${event.severity}
                                    </span>
                                </td>
                                <td>${event.ip_address || 'N/A'}</td>
                                <td>
                                    <button class="btn btn-sm btn-outline-danger" 
                                            onclick="banIP('${event.ip_address}')">
                                        Ban IP
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    updateSystemStatus() {
        // Check various security features
        const isHTTPS = window.location.protocol === 'https:';
        const hasCSRF = securityService.getCsrfToken() !== null;
        
        document.getElementById('https-status').className = `badge bg-${isHTTPS ? 'success' : 'danger'}`;
        document.getElementById('https-status').textContent = isHTTPS ? '✓' : '✗';
        
        document.getElementById('csrf-status').className = `badge bg-${hasCSRF ? 'success' : 'danger'}`;
        document.getElementById('csrf-status').textContent = hasCSRF ? '✓' : '✗';
    }

    setupEventListeners(container) {
        // Refresh button
        container.querySelector('#refresh-btn').addEventListener('click', () => {
            this.loadSecurityData();
        });

        // Export button
        container.querySelector('#export-btn').addEventListener('click', () => {
            this.exportSecurityReport();
        });

        // Ban IP button
        container.querySelector('#ban-ip-btn').addEventListener('click', () => {
            const modal = new bootstrap.Modal(document.getElementById('banIpModal'));
            modal.show();
        });

        // Confirm ban button
        container.querySelector('#confirm-ban-btn').addEventListener('click', () => {
            this.handleBanIP();
        });

        // Other action buttons
        container.querySelector('#clear-logs-btn').addEventListener('click', () => {
            this.clearOldLogs();
        });

        container.querySelector('#security-scan-btn').addEventListener('click', () => {
            this.runSecurityScan();
        });

        container.querySelector('#backup-logs-btn').addEventListener('click', () => {
            this.backupLogs();
        });
    }

    async handleBanIP() {
        const ipAddress = document.getElementById('ip-address').value;
        const reason = document.getElementById('ban-reason').value;
        const duration = document.getElementById('ban-duration').value;

        if (!ipAddress || !reason) {
            this.showAlert('error', 'Please fill in all required fields');
            return;
        }

        try {
            const response = await API.post('/api/security/ban-ip', {
                ip_address: ipAddress,
                reason: reason,
                duration_hours: duration === '0' ? null : parseInt(duration)
            });

            if (response.success) {
                this.showAlert('success', 'IP address banned successfully');
                const modal = bootstrap.Modal.getInstance(document.getElementById('banIpModal'));
                modal.hide();
                this.loadSecurityData(); // Refresh data
            }
        } catch (error) {
            console.error('Failed to ban IP:', error);
            this.showAlert('error', 'Failed to ban IP address');
        }
    }

    async exportSecurityReport() {
        try {
            const response = await API.get('/api/security/export-report');
            if (response.success) {
                // Create download link
                const blob = new Blob([JSON.stringify(response.data, null, 2)], {
                    type: 'application/json'
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `security-report-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Failed to export report:', error);
            this.showAlert('error', 'Failed to export security report');
        }
    }

    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            this.loadSecurityData();
        }, 30000); // Refresh every 30 seconds
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    getSeverityColor(severity) {
        const colors = {
            low: 'success',
            medium: 'warning',
            high: 'danger',
            critical: 'dark'
        };
        return colors[severity] || 'secondary';
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleString();
    }

    showAlert(type, message) {
        const alertContainer = document.getElementById('alert-container');
        const alertClass = type === 'error' ? 'alert-danger' : 'alert-success';
        
        alertContainer.innerHTML = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    }

    destroy() {
        this.stopAutoRefresh();
    }
}

// Global function for ban IP action
window.banIP = function(ipAddress) {
    document.getElementById('ip-address').value = ipAddress || '';
    const modal = new bootstrap.Modal(document.getElementById('banIpModal'));
    modal.show();
};

export default SecurityDashboardPage;
