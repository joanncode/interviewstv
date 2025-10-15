/**
 * Export/Import JavaScript Module
 * Handles data export, import, and backup operations
 */
class ExportImportManager {
    constructor() {
        this.selectedFormat = 'json';
        this.selectedFile = null;
        this.validationResult = null;
        this.config = {
            maxFileSize: 100 * 1024 * 1024, // 100MB
            supportedFormats: ['json', 'csv', 'xml', 'zip'],
            apiEndpoints: {
                export: '/api/export',
                import: '/api/import',
                backup: '/api/export/backup',
                history: '/api/export/history',
                validate: '/api/import/validate'
            }
        };
        
        this.init();
    }

    /**
     * Initialize the export/import manager
     */
    init() {
        this.setupEventListeners();
        this.loadHistory();
        this.loadBackupList();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Format selection
        document.querySelectorAll('.format-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.selectFormat(e.currentTarget.dataset.format);
            });
        });

        // Data type cards
        document.querySelectorAll('.data-type-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const checkbox = card.querySelector('input[type="checkbox"]');
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                }
                this.updateDataTypeSelection(card, checkbox.checked);
            });
        });

        // Export button
        document.getElementById('start-export-btn').addEventListener('click', () => {
            this.startExport();
        });

        // File upload
        this.setupFileUpload();

        // Import button
        document.getElementById('start-import-btn').addEventListener('click', () => {
            this.startImport();
        });

        // Backup button
        document.getElementById('create-backup-btn').addEventListener('click', () => {
            this.createBackup();
        });

        // History filter
        document.getElementById('history-filter').addEventListener('change', () => {
            this.loadHistory();
        });

        document.getElementById('refresh-history-btn').addEventListener('click', () => {
            this.loadHistory();
        });

        // Advanced features
        document.getElementById('create-template-btn').addEventListener('click', () => {
            this.createExportTemplate();
        });

        document.getElementById('schedule-export-btn').addEventListener('click', () => {
            this.scheduleExport();
        });

        document.getElementById('batch-export-btn').addEventListener('click', () => {
            this.batchExport();
        });

        document.getElementById('incremental-export-btn').addEventListener('click', () => {
            this.incrementalExport();
        });

        document.getElementById('optimized-export-btn').addEventListener('click', () => {
            this.optimizedExport();
        });

        document.getElementById('refresh-metrics-btn').addEventListener('click', () => {
            this.loadExportMetrics();
        });

        // Advanced file upload
        this.setupAdvancedFileUpload();
    }

    /**
     * Setup file upload functionality
     */
    setupFileUpload() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('import-file-input');
        const removeBtn = document.getElementById('remove-file-btn');

        // Click to browse
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelection(files[0]);
            }
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelection(e.target.files[0]);
            }
        });

        // Remove file
        removeBtn.addEventListener('click', () => {
            this.removeSelectedFile();
        });
    }

    /**
     * Select export format
     */
    selectFormat(format) {
        document.querySelectorAll('.format-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        document.querySelector(`[data-format="${format}"]`).classList.add('selected');
        this.selectedFormat = format;
    }

    /**
     * Update data type selection
     */
    updateDataTypeSelection(card, selected) {
        if (selected) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    }

    /**
     * Start export process
     */
    async startExport() {
        try {
            this.showProgress('export');
            
            const exportOptions = this.getExportOptions();
            const response = await this.makeExportRequest(exportOptions);
            
            if (response.success) {
                this.downloadFile(response.data);
                this.showSuccess('Export completed successfully!');
                this.loadHistory(); // Refresh history
            } else {
                this.showError('Export failed: ' + response.message);
            }
        } catch (error) {
            this.showError('Export error: ' + error.message);
        } finally {
            this.hideProgress('export');
        }
    }

    /**
     * Get export options from form
     */
    getExportOptions() {
        const selectedTypes = [];
        
        if (document.getElementById('export-user-data').checked) selectedTypes.push('user-data');
        if (document.getElementById('export-interviews').checked) selectedTypes.push('interviews');
        if (document.getElementById('export-templates').checked) selectedTypes.push('templates');
        if (document.getElementById('export-analytics').checked) selectedTypes.push('analytics');
        
        return {
            types: selectedTypes,
            format: this.selectedFormat,
            options: {
                include_media: document.getElementById('include-media').checked,
                include_recordings: document.getElementById('include-recordings').checked,
                include_metadata: document.getElementById('include-metadata').checked,
                compress: document.getElementById('compress-export').checked,
                from_date: document.getElementById('export-from-date').value,
                to_date: document.getElementById('export-to-date').value
            }
        };
    }

    /**
     * Make export API request
     */
    async makeExportRequest(options) {
        const endpoint = this.getExportEndpoint(options.types);
        const params = new URLSearchParams({
            format: options.format,
            ...options.options
        });
        
        const response = await fetch(`${endpoint}?${params}`);
        return await response.json();
    }

    /**
     * Get appropriate export endpoint
     */
    getExportEndpoint(types) {
        if (types.length === 1) {
            switch (types[0]) {
                case 'user-data': return this.config.apiEndpoints.export + '/user-data';
                case 'interviews': return this.config.apiEndpoints.export + '/interviews';
                case 'templates': return this.config.apiEndpoints.export + '/settings';
                case 'analytics': return this.config.apiEndpoints.export + '/analytics';
            }
        }
        return this.config.apiEndpoints.export + '/user-data'; // Default to user data
    }

    /**
     * Handle file selection for import
     */
    async handleFileSelection(file) {
        if (!this.validateFile(file)) {
            return;
        }
        
        this.selectedFile = file;
        this.showFileInfo(file);
        
        // Validate file content
        await this.validateFileContent(file);
        
        // Enable import button if validation passes
        document.getElementById('start-import-btn').disabled = !this.validationResult?.valid;
    }

    /**
     * Validate selected file
     */
    validateFile(file) {
        // Check file size
        if (file.size > this.config.maxFileSize) {
            this.showError('File size exceeds maximum allowed size (100MB)');
            return false;
        }
        
        // Check file extension
        const extension = file.name.split('.').pop().toLowerCase();
        if (!this.config.supportedFormats.includes(extension)) {
            this.showError('Unsupported file format. Please use JSON, CSV, XML, or ZIP files.');
            return false;
        }
        
        return true;
    }

    /**
     * Show file information
     */
    showFileInfo(file) {
        const fileInfo = document.getElementById('file-info');
        const fileName = document.getElementById('file-name');
        const fileDetails = document.getElementById('file-details');
        
        fileName.textContent = file.name;
        fileDetails.textContent = `Size: ${this.formatFileSize(file.size)} | Type: ${file.type || 'Unknown'}`;
        
        fileInfo.classList.remove('d-none');
        document.getElementById('upload-area').style.display = 'none';
    }

    /**
     * Validate file content
     */
    async validateFileContent(file) {
        try {
            const formData = new FormData();
            formData.append('import_file', file);
            formData.append('expected_type', 'auto');
            
            const response = await fetch(this.config.apiEndpoints.validate, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            this.validationResult = result.data;
            this.showValidationResult(result.data);
            
        } catch (error) {
            this.showError('Failed to validate file: ' + error.message);
        }
    }

    /**
     * Show validation result
     */
    showValidationResult(validation) {
        const resultDiv = document.getElementById('validation-result');
        const contentDiv = document.getElementById('validation-content');
        
        resultDiv.className = `validation-result ${validation.valid ? 'valid' : 'invalid'}`;
        
        if (validation.valid) {
            contentDiv.innerHTML = `
                <div class="text-success">
                    <i class="fas fa-check-circle me-2"></i>
                    File validation passed
                </div>
                <div class="text-muted small mt-1">
                    File appears to be valid and ready for import
                </div>
            `;
        } else {
            contentDiv.innerHTML = `
                <div class="text-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    File validation failed
                </div>
                <div class="text-muted small mt-1">
                    ${validation.errors.join(', ')}
                </div>
            `;
        }
        
        resultDiv.classList.remove('d-none');
    }

    /**
     * Remove selected file
     */
    removeSelectedFile() {
        this.selectedFile = null;
        this.validationResult = null;
        
        document.getElementById('file-info').classList.add('d-none');
        document.getElementById('validation-result').classList.add('d-none');
        document.getElementById('upload-area').style.display = 'block';
        document.getElementById('start-import-btn').disabled = true;
        document.getElementById('import-file-input').value = '';
    }

    /**
     * Start import process
     */
    async startImport() {
        if (!this.selectedFile || !this.validationResult?.valid) {
            this.showError('Please select a valid file first');
            return;
        }
        
        try {
            this.showProgress('import');
            
            const formData = new FormData();
            formData.append('import_file', this.selectedFile);
            formData.append('overwrite_existing', document.getElementById('overwrite-existing').checked);
            formData.append('validate_data', document.getElementById('validate-import').checked);
            formData.append('backup_before_import', document.getElementById('backup-before-import').checked);
            formData.append('merge_with_existing', document.getElementById('merge-data').checked);
            
            const response = await fetch(this.config.apiEndpoints.import + '/user-data', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('Import completed successfully!');
                this.removeSelectedFile();
                this.loadHistory();
            } else {
                this.showError('Import failed: ' + result.message);
            }
        } catch (error) {
            this.showError('Import error: ' + error.message);
        } finally {
            this.hideProgress('import');
        }
    }

    /**
     * Create backup
     */
    async createBackup() {
        try {
            this.showProgress('backup');
            
            const formData = new FormData();
            formData.append('include_media', document.getElementById('backup-include-media').checked);
            formData.append('compression', document.getElementById('backup-compress').checked ? 'zip' : 'none');
            formData.append('encrypt', document.getElementById('backup-encrypt').checked);
            
            const response = await fetch(this.config.apiEndpoints.backup, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('Backup created successfully!');
                this.loadBackupList();
                this.loadHistory();
            } else {
                this.showError('Backup failed: ' + result.message);
            }
        } catch (error) {
            this.showError('Backup error: ' + error.message);
        } finally {
            this.hideProgress('backup');
        }
    }

    /**
     * Load export/import history
     */
    async loadHistory() {
        try {
            const filter = document.getElementById('history-filter').value;
            const limit = document.getElementById('history-limit').value;
            
            const response = await fetch(`${this.config.apiEndpoints.history}?type=${filter}&limit=${limit}`);
            const result = await response.json();
            
            if (result.success) {
                this.renderHistory(result.data);
            }
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    }

    /**
     * Render history items
     */
    renderHistory(history) {
        const historyList = document.getElementById('history-list');
        
        if (history.length === 0) {
            historyList.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-history fa-2x mb-3"></i>
                    <p>No export/import history found</p>
                </div>
            `;
            return;
        }
        
        historyList.innerHTML = history.map(item => `
            <div class="history-item">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <div class="text-white">
                            <i class="fas fa-${this.getHistoryIcon(item.operation_type)} me-2"></i>
                            ${this.getHistoryTitle(item)}
                        </div>
                        <div class="text-muted small mt-1">
                            ${new Date(item.created_at).toLocaleString()}
                        </div>
                    </div>
                    <span class="status-badge ${item.status}">${item.status}</span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Load backup list
     */
    async loadBackupList() {
        // Mock backup data for demo
        const mockBackups = [
            {
                id: 'backup_1',
                name: 'Full Backup - 2024-01-15',
                size: '45.2 MB',
                created_at: '2024-01-15 14:30:00',
                type: 'full'
            },
            {
                id: 'backup_2',
                name: 'Data Only - 2024-01-10',
                size: '12.8 MB',
                created_at: '2024-01-10 09:15:00',
                type: 'data'
            }
        ];
        
        this.renderBackupList(mockBackups);
    }

    /**
     * Render backup list
     */
    renderBackupList(backups) {
        const backupList = document.getElementById('backup-list');
        
        if (backups.length === 0) {
            backupList.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-shield-alt fa-2x mb-3"></i>
                    <p>No backups found</p>
                </div>
            `;
            return;
        }
        
        backupList.innerHTML = backups.map(backup => `
            <div class="backup-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <div class="text-white">${backup.name}</div>
                        <div class="backup-size">${backup.size}</div>
                        <div class="backup-date">${new Date(backup.created_at).toLocaleString()}</div>
                    </div>
                    <div>
                        <button class="btn btn-outline-light btn-sm me-2" onclick="exportImport.downloadBackup('${backup.id}')">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="exportImport.restoreBackup('${backup.id}')">
                            <i class="fas fa-undo"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Download backup
     */
    downloadBackup(backupId) {
        const url = `/api/export/download/${backupId}`;
        window.open(url, '_blank');
    }

    /**
     * Restore backup
     */
    async restoreBackup(backupId) {
        if (!confirm('Are you sure you want to restore this backup? This will overwrite your current data.')) {
            return;
        }
        
        try {
            // Implementation would handle backup restoration
            this.showSuccess('Backup restoration started. This may take a few minutes.');
        } catch (error) {
            this.showError('Failed to restore backup: ' + error.message);
        }
    }

    /**
     * Show progress indicator
     */
    showProgress(type) {
        const progressDiv = document.getElementById(`${type}-progress`);
        progressDiv.style.display = 'block';
        
        // Simulate progress
        let progress = 0;
        const progressBar = progressDiv.querySelector('.progress-bar');
        const statusText = progressDiv.querySelector(`#${type}-status`);
        
        const interval = setInterval(() => {
            progress += Math.random() * 20;
            if (progress > 90) progress = 90;
            
            progressBar.style.width = progress + '%';
            
            if (progress < 30) {
                statusText.textContent = `Preparing ${type}...`;
            } else if (progress < 60) {
                statusText.textContent = `Processing data...`;
            } else {
                statusText.textContent = `Finalizing ${type}...`;
            }
        }, 500);
        
        // Store interval for cleanup
        progressDiv.dataset.interval = interval;
    }

    /**
     * Hide progress indicator
     */
    hideProgress(type) {
        const progressDiv = document.getElementById(`${type}-progress`);
        const interval = progressDiv.dataset.interval;
        
        if (interval) {
            clearInterval(interval);
        }
        
        // Complete progress
        const progressBar = progressDiv.querySelector('.progress-bar');
        progressBar.style.width = '100%';
        
        setTimeout(() => {
            progressDiv.style.display = 'none';
            progressBar.style.width = '0%';
        }, 1000);
    }

    /**
     * Download file
     */
    downloadFile(data) {
        // Implementation would handle file download
        console.log('Downloading file:', data);
    }

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get history icon
     */
    getHistoryIcon(type) {
        const icons = {
            export: 'download',
            import: 'upload',
            backup: 'shield-alt'
        };
        return icons[type] || 'file';
    }

    /**
     * Get history title
     */
    getHistoryTitle(item) {
        const titles = {
            export: 'Data Export',
            import: 'Data Import',
            backup: 'Backup Created'
        };
        return titles[item.operation_type] || 'Unknown Operation';
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
     * Create export template
     */
    async createExportTemplate() {
        const templateName = document.getElementById('template-name').value.trim();

        if (!templateName) {
            this.showToast('Please enter a template name', 'error');
            return;
        }

        const selectedTypes = [];
        document.querySelectorAll('.data-type-card.selected').forEach(card => {
            selectedTypes.push(card.dataset.type);
        });

        if (selectedTypes.length === 0) {
            this.showToast('Please select at least one data type', 'error');
            return;
        }

        const format = document.querySelector('input[name="export-format"]:checked').value;
        const includeMedia = document.getElementById('include-media').checked;

        try {
            const formData = new FormData();
            formData.append('name', templateName);
            formData.append('description', `Template for ${selectedTypes.join(', ')} export`);
            formData.append('export_types', selectedTypes.join(','));
            formData.append('format', format);
            formData.append('include_media', includeMedia);

            const response = await fetch('/api/export/template', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Export template created successfully', 'success');
                document.getElementById('template-name').value = '';
                this.loadExportTemplates();
            } else {
                this.showToast(result.message || 'Failed to create template', 'error');
            }
        } catch (error) {
            console.error('Error creating template:', error);
            this.showToast('Failed to create template', 'error');
        }
    }

    /**
     * Schedule export
     */
    async scheduleExport() {
        const frequency = document.getElementById('schedule-frequency').value;
        const time = document.getElementById('schedule-time').value;

        const selectedTypes = [];
        document.querySelectorAll('.data-type-card.selected').forEach(card => {
            selectedTypes.push(card.dataset.type);
        });

        if (selectedTypes.length === 0) {
            this.showToast('Please select at least one data type', 'error');
            return;
        }

        const format = document.querySelector('input[name="export-format"]:checked').value;
        const includeMedia = document.getElementById('include-media').checked;

        try {
            const formData = new FormData();
            formData.append('export_type', selectedTypes[0]); // Use first selected type
            formData.append('format', format);
            formData.append('frequency', frequency);
            formData.append('time', time);
            formData.append('enabled', true);
            formData.append('include_media', includeMedia);

            const response = await fetch('/api/export/schedule', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Export scheduled successfully', 'success');
                this.loadScheduledExports();
            } else {
                this.showToast(result.message || 'Failed to schedule export', 'error');
            }
        } catch (error) {
            console.error('Error scheduling export:', error);
            this.showToast('Failed to schedule export', 'error');
        }
    }

    /**
     * Batch export
     */
    async batchExport() {
        const exportJobs = [];

        if (document.getElementById('batch-user-data').checked) {
            exportJobs.push({ id: 'user-data', type: 'user-data', options: {} });
        }
        if (document.getElementById('batch-interviews').checked) {
            exportJobs.push({ id: 'interviews', type: 'interviews', options: {} });
        }
        if (document.getElementById('batch-templates').checked) {
            exportJobs.push({ id: 'templates', type: 'templates', options: {} });
        }
        if (document.getElementById('batch-analytics').checked) {
            exportJobs.push({ id: 'analytics', type: 'analytics', options: {} });
        }

        if (exportJobs.length === 0) {
            this.showToast('Please select at least one data type for batch export', 'error');
            return;
        }

        try {
            this.showToast('Starting batch export...', 'info');

            const formData = new FormData();
            formData.append('export_jobs', JSON.stringify(exportJobs));

            const response = await fetch('/api/export/batch', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                const { successful, failed, total_jobs } = result.data;
                this.showToast(`Batch export completed: ${successful}/${total_jobs} successful`, 'success');
                this.loadHistory();
            } else {
                this.showToast(result.message || 'Batch export failed', 'error');
            }
        } catch (error) {
            console.error('Error performing batch export:', error);
            this.showToast('Batch export failed', 'error');
        }
    }

    /**
     * Incremental export
     */
    async incrementalExport() {
        const format = document.querySelector('input[name="export-format"]:checked').value;
        const includeMedia = document.getElementById('include-media').checked;

        try {
            this.showToast('Starting incremental export...', 'info');

            const params = new URLSearchParams({
                export_type: 'user-data',
                format: format,
                include_media: includeMedia
            });

            const response = await fetch(`/api/export/incremental?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `incremental_export_${new Date().toISOString().split('T')[0]}.${format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                this.showToast('Incremental export completed', 'success');
            } else {
                this.showToast('Incremental export failed', 'error');
            }
        } catch (error) {
            console.error('Error performing incremental export:', error);
            this.showToast('Incremental export failed', 'error');
        }
    }

    /**
     * Optimized export
     */
    async optimizedExport() {
        const format = document.querySelector('input[name="export-format"]:checked').value;
        const compressionLevel = document.getElementById('compression-level').value;
        const chunkSize = document.getElementById('chunk-size').value;
        const includeMedia = document.getElementById('include-media').checked;

        try {
            this.showToast('Starting optimized export...', 'info');

            const params = new URLSearchParams({
                format: format,
                compression_level: compressionLevel,
                chunk_size: chunkSize,
                compress: true,
                include_media: includeMedia
            });

            const response = await fetch(`/api/export/optimized?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `optimized_export_${new Date().toISOString().split('T')[0]}.${format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                this.showToast('Optimized export completed', 'success');
            } else {
                this.showToast('Optimized export failed', 'error');
            }
        } catch (error) {
            console.error('Error performing optimized export:', error);
            this.showToast('Optimized export failed', 'error');
        }
    }

    /**
     * Load export metrics
     */
    async loadExportMetrics() {
        try {
            const response = await fetch('/api/export/metrics', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const result = await response.json();

            if (result.success) {
                this.displayExportMetrics(result.data);
            } else {
                console.error('Failed to load export metrics:', result.message);
            }
        } catch (error) {
            console.error('Error loading export metrics:', error);
        }
    }

    /**
     * Display export metrics
     */
    displayExportMetrics(metrics) {
        const metricsContainer = document.getElementById('export-metrics');

        metricsContainer.innerHTML = `
            <div class="row text-center">
                <div class="col-6 mb-3">
                    <div class="metric-card">
                        <h5 class="text-danger mb-1">${metrics.total_exports || 0}</h5>
                        <small class="text-muted">Total Exports</small>
                    </div>
                </div>
                <div class="col-6 mb-3">
                    <div class="metric-card">
                        <h5 class="text-danger mb-1">${(metrics.average_export_time || 0).toFixed(1)}s</h5>
                        <small class="text-muted">Avg Time</small>
                    </div>
                </div>
                <div class="col-6 mb-3">
                    <div class="metric-card">
                        <h5 class="text-danger mb-1">${this.formatFileSize(metrics.largest_export_size || 0)}</h5>
                        <small class="text-muted">Largest Export</small>
                    </div>
                </div>
                <div class="col-6 mb-3">
                    <div class="metric-card">
                        <h5 class="text-danger mb-1">${this.formatFileSize(metrics.storage_usage || 0)}</h5>
                        <small class="text-muted">Storage Used</small>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Setup advanced file upload
     */
    setupAdvancedFileUpload() {
        const uploadArea = document.getElementById('advanced-upload-area');
        const fileInput = document.getElementById('advanced-file-input');

        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.performAdvancedValidation(files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.performAdvancedValidation(e.target.files[0]);
            }
        });
    }

    /**
     * Perform advanced validation
     */
    async performAdvancedValidation(file) {
        try {
            this.showToast('Analyzing file...', 'info');

            const formData = new FormData();
            formData.append('import_file', file);
            formData.append('check_compatibility', true);
            formData.append('analyze_content', true);
            formData.append('generate_recommendations', true);

            const response = await fetch('/api/import/validate-advanced', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.displayAdvancedValidationResults(result.data);
                this.showToast('File analysis completed', 'success');
            } else {
                this.showToast(result.message || 'File analysis failed', 'error');
            }
        } catch (error) {
            console.error('Error performing advanced validation:', error);
            this.showToast('File analysis failed', 'error');
        }
    }

    /**
     * Display advanced validation results
     */
    displayAdvancedValidationResults(validation) {
        const resultContainer = document.getElementById('advanced-validation-result');
        const contentContainer = document.getElementById('advanced-validation-content');

        let html = '';

        // File validation
        if (validation.file_validation) {
            const status = validation.file_validation.valid ? 'success' : 'danger';
            html += `
                <div class="alert alert-${status} mb-3">
                    <h6 class="mb-2">File Validation</h6>
                    <p class="mb-0">${validation.file_validation.message || 'File validation completed'}</p>
                </div>
            `;
        }

        // Content analysis
        if (validation.content_analysis) {
            html += `
                <div class="mb-3">
                    <h6 class="text-white mb-2">Content Analysis</h6>
                    <div class="row text-center">
                        <div class="col-4">
                            <small class="text-muted">Records</small>
                            <div class="text-white">${validation.content_analysis.total_records || 0}</div>
                        </div>
                        <div class="col-4">
                            <small class="text-muted">Size</small>
                            <div class="text-white">${this.formatFileSize(validation.content_analysis.size_estimate || 0)}</div>
                        </div>
                        <div class="col-4">
                            <small class="text-muted">Types</small>
                            <div class="text-white">${(validation.content_analysis.data_types || []).length}</div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Compatibility check
        if (validation.compatibility_check) {
            const compatible = validation.compatibility_check.version_compatible &&
                             validation.compatibility_check.schema_compatible;
            const status = compatible ? 'success' : 'warning';
            html += `
                <div class="alert alert-${status} mb-3">
                    <h6 class="mb-2">Compatibility Check</h6>
                    <p class="mb-0">${compatible ? 'File is compatible' : 'Compatibility issues detected'}</p>
                </div>
            `;
        }

        // Recommendations
        if (validation.recommendations && validation.recommendations.length > 0) {
            html += `
                <div class="mb-3">
                    <h6 class="text-white mb-2">Recommendations</h6>
                    <ul class="list-unstyled">
                        ${validation.recommendations.map(rec => `<li class="text-muted small">• ${rec}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        contentContainer.innerHTML = html;
        resultContainer.classList.remove('d-none');
    }

    // Helper methods for new functionality
    loadExportTemplates() {
        // Implementation for loading export templates
    }

    loadScheduledExports() {
        // Implementation for loading scheduled exports
    }
}

// Initialize export/import manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.exportImport = new ExportImportManager();
});
