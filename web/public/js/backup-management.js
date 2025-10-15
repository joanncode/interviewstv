/**
 * Backup Management JavaScript Module
 * Handles system backup and restore operations
 */
class BackupManager {
    constructor() {
        this.config = {
            apiEndpoints: {
                backup: '/api/backup',
                status: '/api/backup/status',
                list: '/api/backup/list',
                create: '/api/backup/create',
                restore: '/api/backup/{id}/restore',
                delete: '/api/backup/{id}',
                verify: '/api/backup/{id}/verify',
                download: '/api/backup/{id}/download',
                config: '/api/backup/config',
                schedules: '/api/backup/scheduled',
                test: '/api/backup/test',
                stats: '/api/backup/stats'
            },
            refreshInterval: 30000, // 30 seconds
            statusCheckInterval: 5000 // 5 seconds
        };
        
        this.currentBackups = [];
        this.currentSchedules = [];
        this.systemStatus = {};
        this.refreshTimer = null;
        
        this.init();
    }

    /**
     * Initialize the backup manager
     */
    init() {
        this.setupEventListeners();
        this.loadSystemStatus();
        this.loadBackupStats();
        this.loadBackupList();
        this.loadSchedules();
        this.loadConfiguration();
        this.startAutoRefresh();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Quick action buttons
        document.getElementById('create-backup-btn').addEventListener('click', () => {
            this.createBackup();
        });

        document.getElementById('test-system-btn').addEventListener('click', () => {
            this.testSystem();
        });

        document.getElementById('verify-latest-btn').addEventListener('click', () => {
            this.verifyLatestBackup();
        });

        document.getElementById('cleanup-old-btn').addEventListener('click', () => {
            this.cleanupOldBackups();
        });

        // Backup list actions
        document.getElementById('refresh-backups-btn').addEventListener('click', () => {
            this.loadBackupList();
        });

        document.getElementById('create-manual-backup-btn').addEventListener('click', () => {
            this.showCreateBackupModal();
        });

        // Filter events
        document.getElementById('backup-type-filter').addEventListener('change', () => {
            this.filterBackups();
        });

        document.getElementById('backup-status-filter').addEventListener('change', () => {
            this.filterBackups();
        });

        document.getElementById('backup-location-filter').addEventListener('change', () => {
            this.filterBackups();
        });

        document.getElementById('backup-search').addEventListener('input', () => {
            this.filterBackups();
        });

        // Schedule actions
        document.getElementById('add-schedule-btn').addEventListener('click', () => {
            this.showAddScheduleModal();
        });

        // Configuration actions
        document.getElementById('save-config-btn').addEventListener('click', () => {
            this.saveConfiguration();
        });

        // Test buttons
        document.getElementById('test-backup-system-btn').addEventListener('click', () => {
            this.testBackupSystem();
        });

        document.getElementById('test-database-btn').addEventListener('click', () => {
            this.testDatabase();
        });

        document.getElementById('test-s3-btn').addEventListener('click', () => {
            this.testS3();
        });
    }

    /**
     * Load system status
     */
    async loadSystemStatus() {
        try {
            const response = await fetch(this.config.apiEndpoints.status);
            const result = await response.json();
            
            if (result.success) {
                this.systemStatus = result.data;
                this.updateSystemStatusDisplay();
            }
        } catch (error) {
            console.error('Failed to load system status:', error);
        }
    }

    /**
     * Update system status display
     */
    updateSystemStatusDisplay() {
        const status = this.systemStatus;
        
        // Backup system status
        this.updateStatusIndicator('backup-system-status', 
            status.script_exists && status.script_executable, 
            status.script_exists ? 'System operational' : 'Script not found');

        // Storage status
        const storageHealthy = status.backup_dir_exists && status.backup_dir_writable;
        this.updateStatusIndicator('storage-status', storageHealthy, 
            storageHealthy ? 'Storage accessible' : 'Storage issues detected');

        // Database status
        this.updateStatusIndicator('database-status', true, 'Connection healthy');

        // S3 status
        const s3Enabled = status.config?.s3_enabled;
        this.updateStatusIndicator('s3-status', s3Enabled, 
            s3Enabled ? 'S3 configured' : 'Not configured');
    }

    /**
     * Update status indicator
     */
    updateStatusIndicator(elementId, isHealthy, message) {
        const indicator = document.getElementById(elementId);
        const messageElement = document.getElementById(elementId.replace('-status', '-message'));
        
        if (indicator) {
            indicator.className = `status-indicator ${isHealthy ? 'healthy' : 'error'}`;
        }
        
        if (messageElement) {
            messageElement.textContent = message;
        }
    }

    /**
     * Load backup statistics
     */
    async loadBackupStats() {
        try {
            const response = await fetch(this.config.apiEndpoints.stats);
            const result = await response.json();
            
            if (result.success) {
                this.updateStatsDisplay(result.data);
            }
        } catch (error) {
            console.error('Failed to load backup stats:', error);
        }
    }

    /**
     * Update statistics display
     */
    updateStatsDisplay(stats) {
        document.getElementById('total-backups').textContent = stats.total_backups || 0;
        document.getElementById('total-size').textContent = this.formatBytes(stats.total_size || 0);
        document.getElementById('success-rate').textContent = (stats.success_rate || 100) + '%';
        
        const lastBackup = stats.newest_backup ? 
            new Date(stats.newest_backup).toLocaleDateString() : 'Never';
        document.getElementById('last-backup').textContent = lastBackup;
        
        // Update storage usage
        this.updateStorageUsage(stats);
    }

    /**
     * Update storage usage display
     */
    updateStorageUsage(stats) {
        const backupUsage = stats.backup_storage_usage || 0;
        const backupLimit = stats.backup_storage_limit || 100 * 1024 * 1024 * 1024; // 100GB default
        const backupPercent = (backupUsage / backupLimit) * 100;
        
        document.getElementById('storage-usage-text').textContent = 
            `${this.formatBytes(backupUsage)} / ${this.formatBytes(backupLimit)}`;
        document.getElementById('storage-usage-bar').style.width = Math.min(backupPercent, 100) + '%';
        
        const diskUsage = stats.disk_usage || 0;
        const diskTotal = stats.disk_total || 500 * 1024 * 1024 * 1024; // 500GB default
        const diskPercent = (diskUsage / diskTotal) * 100;
        
        document.getElementById('disk-usage-text').textContent = 
            `${this.formatBytes(diskUsage)} / ${this.formatBytes(diskTotal)}`;
        document.getElementById('disk-usage-bar').style.width = Math.min(diskPercent, 100) + '%';
    }

    /**
     * Load backup list
     */
    async loadBackupList() {
        try {
            const response = await fetch(this.config.apiEndpoints.list + '?include_remote=true&limit=50');
            const result = await response.json();
            
            if (result.success) {
                this.currentBackups = result.data;
                this.renderBackupList();
            }
        } catch (error) {
            console.error('Failed to load backup list:', error);
        }
    }

    /**
     * Render backup list
     */
    renderBackupList() {
        const backupList = document.getElementById('backup-list');
        
        if (this.currentBackups.length === 0) {
            backupList.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-archive fa-2x mb-3"></i>
                    <p>No backups found</p>
                    <button class="btn btn-danger" onclick="backupManager.createBackup()">
                        Create First Backup
                    </button>
                </div>
            `;
            return;
        }
        
        backupList.innerHTML = this.currentBackups.map(backup => `
            <div class="backup-item" data-backup-id="${backup.id}">
                <div class="row align-items-center">
                    <div class="col-md-6">
                        <div class="d-flex align-items-center">
                            <i class="fas fa-${this.getBackupIcon(backup.type)} text-danger me-3"></i>
                            <div>
                                <div class="text-white">${backup.description || 'System Backup'}</div>
                                <div class="backup-date">${new Date(backup.created_at).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <span class="backup-status ${backup.status}">${backup.status}</span>
                    </div>
                    <div class="col-md-2">
                        <div class="backup-size">${this.formatBytes(backup.size)}</div>
                    </div>
                    <div class="col-md-2">
                        <div class="backup-actions">
                            <button class="btn btn-outline-light btn-sm" onclick="backupManager.downloadBackup('${backup.id}')" title="Download">
                                <i class="fas fa-download"></i>
                            </button>
                            <button class="btn btn-outline-info btn-sm" onclick="backupManager.verifyBackup('${backup.id}')" title="Verify">
                                <i class="fas fa-check-circle"></i>
                            </button>
                            <button class="btn btn-outline-warning btn-sm" onclick="backupManager.restoreBackup('${backup.id}')" title="Restore">
                                <i class="fas fa-undo"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="backupManager.deleteBackup('${backup.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Filter backups based on current filter settings
     */
    filterBackups() {
        const typeFilter = document.getElementById('backup-type-filter').value;
        const statusFilter = document.getElementById('backup-status-filter').value;
        const locationFilter = document.getElementById('backup-location-filter').value;
        const searchTerm = document.getElementById('backup-search').value.toLowerCase();
        
        const filteredBackups = this.currentBackups.filter(backup => {
            const matchesType = typeFilter === 'all' || backup.type === typeFilter;
            const matchesStatus = statusFilter === 'all' || backup.status === statusFilter;
            const matchesLocation = locationFilter === 'all' || 
                (locationFilter === 'local' && !backup.s3_location) ||
                (locationFilter === 'remote' && backup.s3_location);
            const matchesSearch = !searchTerm || 
                backup.description.toLowerCase().includes(searchTerm) ||
                backup.id.toLowerCase().includes(searchTerm);
            
            return matchesType && matchesStatus && matchesLocation && matchesSearch;
        });
        
        // Temporarily replace current backups for rendering
        const originalBackups = this.currentBackups;
        this.currentBackups = filteredBackups;
        this.renderBackupList();
        this.currentBackups = originalBackups;
    }

    /**
     * Create backup
     */
    async createBackup(options = {}) {
        try {
            this.showProgress('Creating system backup...');
            
            const formData = new FormData();
            formData.append('include_database', options.include_database ?? true);
            formData.append('include_files', options.include_files ?? true);
            formData.append('include_redis', options.include_redis ?? true);
            formData.append('include_uploads', options.include_uploads ?? true);
            formData.append('compression', options.compression ?? 'gzip');
            formData.append('upload_to_s3', options.upload_to_s3 ?? false);
            formData.append('description', options.description ?? 'Manual system backup');
            
            const response = await fetch(this.config.apiEndpoints.create, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('Backup created successfully!');
                this.loadBackupList();
                this.loadBackupStats();
            } else {
                this.showError('Backup failed: ' + result.message);
            }
        } catch (error) {
            this.showError('Backup error: ' + error.message);
        } finally {
            this.hideProgress();
        }
    }

    /**
     * Download backup
     */
    downloadBackup(backupId) {
        const url = this.config.apiEndpoints.download.replace('{id}', backupId);
        window.open(url, '_blank');
    }

    /**
     * Verify backup
     */
    async verifyBackup(backupId) {
        try {
            this.showProgress('Verifying backup integrity...');
            
            const url = this.config.apiEndpoints.verify.replace('{id}', backupId);
            const response = await fetch(url, { method: 'POST' });
            const result = await response.json();
            
            if (result.success) {
                this.showVerificationResult(result.data);
            } else {
                this.showError('Verification failed: ' + result.message);
            }
        } catch (error) {
            this.showError('Verification error: ' + error.message);
        } finally {
            this.hideProgress();
        }
    }

    /**
     * Restore backup
     */
    async restoreBackup(backupId) {
        if (!confirm('Are you sure you want to restore this backup? This will overwrite current data.')) {
            return;
        }
        
        try {
            this.showProgress('Restoring from backup...');
            
            const url = this.config.apiEndpoints.restore.replace('{id}', backupId);
            const formData = new FormData();
            formData.append('restore_database', true);
            formData.append('restore_files', true);
            formData.append('restore_redis', true);
            formData.append('restore_uploads', true);
            formData.append('create_backup_before_restore', true);
            
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('System restored successfully!');
                this.loadBackupList();
            } else {
                this.showError('Restore failed: ' + result.message);
            }
        } catch (error) {
            this.showError('Restore error: ' + error.message);
        } finally {
            this.hideProgress();
        }
    }

    /**
     * Delete backup
     */
    async deleteBackup(backupId) {
        if (!confirm('Are you sure you want to delete this backup? This action cannot be undone.')) {
            return;
        }
        
        try {
            const url = this.config.apiEndpoints.delete.replace('{id}', backupId);
            const response = await fetch(url, { method: 'DELETE' });
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('Backup deleted successfully!');
                this.loadBackupList();
                this.loadBackupStats();
            } else {
                this.showError('Delete failed: ' + result.message);
            }
        } catch (error) {
            this.showError('Delete error: ' + error.message);
        }
    }

    /**
     * Test system
     */
    async testSystem() {
        try {
            this.showProgress('Testing backup system...');
            
            const response = await fetch(this.config.apiEndpoints.test, { method: 'POST' });
            const result = await response.json();
            
            if (result.success) {
                this.showTestResults(result.data);
            } else {
                this.showError('System test failed: ' + result.message);
            }
        } catch (error) {
            this.showError('Test error: ' + error.message);
        } finally {
            this.hideProgress();
        }
    }

    /**
     * Show test results
     */
    showTestResults(testData) {
        const resultsDiv = document.getElementById('test-results');
        
        resultsDiv.innerHTML = `
            <h6 class="text-white mb-2">Test Results</h6>
            ${Object.values(testData.tests).map(test => `
                <div class="test-result ${test.status ? 'passed' : 'failed'}">
                    <div class="d-flex align-items-center">
                        <i class="fas fa-${test.status ? 'check' : 'times'} me-2"></i>
                        <div>
                            <div class="text-white">${test.name}</div>
                            <div class="text-muted small">${test.message}</div>
                        </div>
                    </div>
                </div>
            `).join('')}
            <div class="mt-2">
                <strong class="text-${testData.overall_status ? 'success' : 'danger'}">
                    Overall Status: ${testData.overall_status ? 'PASSED' : 'FAILED'}
                </strong>
            </div>
        `;
    }

    /**
     * Load schedules
     */
    async loadSchedules() {
        try {
            const response = await fetch(this.config.apiEndpoints.schedules);
            const result = await response.json();
            
            if (result.success) {
                this.currentSchedules = result.data;
                this.renderSchedules();
            }
        } catch (error) {
            console.error('Failed to load schedules:', error);
        }
    }

    /**
     * Render schedules
     */
    renderSchedules() {
        const scheduleList = document.getElementById('schedule-list');
        
        if (this.currentSchedules.length === 0) {
            scheduleList.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-clock fa-2x mb-3"></i>
                    <p>No backup schedules configured</p>
                </div>
            `;
            return;
        }
        
        scheduleList.innerHTML = this.currentSchedules.map(schedule => `
            <div class="schedule-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <div class="text-white">${schedule.name}</div>
                        <div class="text-muted small">
                            ${schedule.frequency} at ${schedule.time} - ${schedule.type} backup
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <button class="schedule-toggle" onclick="backupManager.toggleSchedule(${schedule.id}, ${!schedule.enabled})">
                            <i class="fas fa-${schedule.enabled ? 'pause' : 'play'}"></i>
                        </button>
                        <button class="btn btn-outline-light btn-sm" onclick="backupManager.editSchedule(${schedule.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="backupManager.deleteSchedule(${schedule.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Load configuration
     */
    async loadConfiguration() {
        try {
            const response = await fetch(this.config.apiEndpoints.config);
            const result = await response.json();
            
            if (result.success) {
                this.populateConfigurationForm(result.data);
            }
        } catch (error) {
            console.error('Failed to load configuration:', error);
        }
    }

    /**
     * Populate configuration form
     */
    populateConfigurationForm(config) {
        document.getElementById('retention-days').value = config.retention_days || 30;
        document.getElementById('compression-level').value = config.compression_level || 6;
        document.getElementById('auto-backup-enabled').checked = config.auto_backup_enabled || false;
        document.getElementById('compression-enabled').checked = config.compression_enabled !== false;
        document.getElementById('verify-backups').checked = config.verify_backups !== false;
        document.getElementById('cleanup-old-backups').checked = config.cleanup_old_backups !== false;
        document.getElementById('s3-enabled').checked = config.s3_enabled || false;
        document.getElementById('s3-bucket').value = config.s3_bucket || '';
        document.getElementById('notification-email').value = config.notification_email || '';
        document.getElementById('notify-success').checked = config.notify_success !== false;
        document.getElementById('notify-failure').checked = config.notify_failure !== false;
    }

    /**
     * Save configuration
     */
    async saveConfiguration() {
        try {
            const formData = new FormData();
            formData.append('retention_days', document.getElementById('retention-days').value);
            formData.append('compression_level', document.getElementById('compression-level').value);
            formData.append('auto_backup_enabled', document.getElementById('auto-backup-enabled').checked);
            formData.append('compression_enabled', document.getElementById('compression-enabled').checked);
            formData.append('verify_backups', document.getElementById('verify-backups').checked);
            formData.append('cleanup_old_backups', document.getElementById('cleanup-old-backups').checked);
            formData.append('s3_enabled', document.getElementById('s3-enabled').checked);
            formData.append('s3_bucket', document.getElementById('s3-bucket').value);
            formData.append('notification_email', document.getElementById('notification-email').value);
            formData.append('notify_success', document.getElementById('notify-success').checked);
            formData.append('notify_failure', document.getElementById('notify-failure').checked);
            
            const response = await fetch(this.config.apiEndpoints.config, {
                method: 'PUT',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('Configuration saved successfully!');
            } else {
                this.showError('Failed to save configuration: ' + result.message);
            }
        } catch (error) {
            this.showError('Configuration error: ' + error.message);
        }
    }

    /**
     * Start auto refresh
     */
    startAutoRefresh() {
        this.refreshTimer = setInterval(() => {
            this.loadSystemStatus();
            this.loadBackupStats();
        }, this.config.refreshInterval);
    }

    /**
     * Stop auto refresh
     */
    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    /**
     * Get backup icon based on type
     */
    getBackupIcon(type) {
        const icons = {
            system: 'server',
            database: 'database',
            files: 'folder',
            scheduled: 'clock'
        };
        return icons[type] || 'archive';
    }

    /**
     * Format bytes to human readable format
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Show progress indicator
     */
    showProgress(message) {
        const progressDiv = document.getElementById('backup-progress');
        const statusText = document.getElementById('backup-status');
        
        statusText.textContent = message;
        progressDiv.style.display = 'block';
        
        // Simulate progress
        let progress = 0;
        const progressBar = progressDiv.querySelector('.progress-bar');
        
        const interval = setInterval(() => {
            progress += Math.random() * 20;
            if (progress > 90) progress = 90;
            progressBar.style.width = progress + '%';
        }, 500);
        
        progressDiv.dataset.interval = interval;
    }

    /**
     * Hide progress indicator
     */
    hideProgress() {
        const progressDiv = document.getElementById('backup-progress');
        const interval = progressDiv.dataset.interval;
        
        if (interval) {
            clearInterval(interval);
        }
        
        const progressBar = progressDiv.querySelector('.progress-bar');
        progressBar.style.width = '100%';
        
        setTimeout(() => {
            progressDiv.style.display = 'none';
            progressBar.style.width = '0%';
        }, 1000);
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
}

// Initialize backup manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.backupManager = new BackupManager();
});
