class RecordingsGallery {
    constructor() {
        this.recordings = [];
        this.filteredRecordings = [];
        this.currentPage = 1;
        this.recordingsPerPage = 12;
        this.currentView = 'grid';
        this.currentFilters = {
            search: '',
            sortBy: 'newest',
            quality: '',
            dateRange: ''
        };

        // DOM elements
        this.container = document.getElementById('recordingsContainer');
        this.searchInput = document.getElementById('searchInput');
        this.sortBy = document.getElementById('sortBy');
        this.qualityFilter = document.getElementById('qualityFilter');
        this.dateFilter = document.getElementById('dateFilter');
        this.clearFiltersBtn = document.getElementById('clearFilters');
        this.applyFiltersBtn = document.getElementById('applyFilters');
        this.gridViewBtn = document.getElementById('gridViewBtn');
        this.listViewBtn = document.getElementById('listViewBtn');
        this.resultsInfo = document.getElementById('resultsInfo');
        this.paginationContainer = document.getElementById('paginationContainer');
        this.pagination = document.getElementById('pagination');

        // Stats elements
        this.totalRecordings = document.getElementById('totalRecordings');
        this.totalDuration = document.getElementById('totalDuration');
        this.totalSize = document.getElementById('totalSize');
        this.totalViews = document.getElementById('totalViews');
    }

    async initialize() {
        this.setupEventListeners();
        await this.loadRecordings();
        this.updateStats();
        this.applyFiltersAndSort();
    }

    setupEventListeners() {
        // Search input with debounce
        let searchTimeout;
        this.searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.currentFilters.search = this.searchInput.value;
                this.applyFiltersAndSort();
            }, 300);
        });

        // Filter controls
        this.sortBy.addEventListener('change', () => {
            this.currentFilters.sortBy = this.sortBy.value;
            this.applyFiltersAndSort();
        });

        this.qualityFilter.addEventListener('change', () => {
            this.currentFilters.quality = this.qualityFilter.value;
            this.applyFiltersAndSort();
        });

        this.dateFilter.addEventListener('change', () => {
            this.currentFilters.dateRange = this.dateFilter.value;
            this.applyFiltersAndSort();
        });

        // Filter buttons
        this.clearFiltersBtn.addEventListener('click', () => {
            this.clearFilters();
        });

        this.applyFiltersBtn.addEventListener('click', () => {
            this.applyFiltersAndSort();
        });

        // View toggle
        this.gridViewBtn.addEventListener('click', () => {
            this.setView('grid');
        });

        this.listViewBtn.addEventListener('click', () => {
            this.setView('list');
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'f':
                        e.preventDefault();
                        this.searchInput.focus();
                        break;
                    case 'g':
                        e.preventDefault();
                        this.setView('grid');
                        break;
                    case 'l':
                        e.preventDefault();
                        this.setView('list');
                        break;
                }
            }
        });
    }

    async loadRecordings() {
        try {
            this.showLoading();

            const response = await fetch('/api/videos', {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load recordings');
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message);
            }

            this.recordings = result.data.videos || [];
            
            // Load thumbnails for each recording
            await this.loadThumbnails();

        } catch (error) {
            console.error('Error loading recordings:', error);
            this.showError('Failed to load recordings. Please try again.');
        }
    }

    async loadThumbnails() {
        // Load thumbnails for all recordings
        const thumbnailPromises = this.recordings.map(async (recording) => {
            try {
                const response = await fetch(`/api/thumbnails/${recording.recording_id}`, {
                    headers: {
                        'Authorization': `Bearer ${this.getAuthToken()}`
                    }
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data.thumbnails.length > 0) {
                        // Use the first poster thumbnail
                        const posterThumbnail = result.data.thumbnails.find(t => t.type === 'poster') || result.data.thumbnails[0];
                        recording.thumbnail_url = posterThumbnail.url;
                    }
                }
            } catch (error) {
                console.error(`Error loading thumbnail for ${recording.recording_id}:`, error);
            }
        });

        await Promise.all(thumbnailPromises);
    }

    applyFiltersAndSort() {
        this.filteredRecordings = this.recordings.filter(recording => {
            // Search filter
            if (this.currentFilters.search) {
                const searchTerm = this.currentFilters.search.toLowerCase();
                const title = (recording.original_filename || '').toLowerCase();
                const date = new Date(recording.created_at).toLocaleDateString().toLowerCase();
                
                if (!title.includes(searchTerm) && !date.includes(searchTerm)) {
                    return false;
                }
            }

            // Quality filter
            if (this.currentFilters.quality) {
                const recordingQuality = this.getQualityFromResolution(recording.width, recording.height);
                if (recordingQuality !== this.currentFilters.quality) {
                    return false;
                }
            }

            // Date range filter
            if (this.currentFilters.dateRange) {
                const recordingDate = new Date(recording.created_at);
                const now = new Date();
                
                switch (this.currentFilters.dateRange) {
                    case 'today':
                        if (recordingDate.toDateString() !== now.toDateString()) {
                            return false;
                        }
                        break;
                    case 'week':
                        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        if (recordingDate < weekAgo) {
                            return false;
                        }
                        break;
                    case 'month':
                        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                        if (recordingDate < monthAgo) {
                            return false;
                        }
                        break;
                    case 'year':
                        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                        if (recordingDate < yearAgo) {
                            return false;
                        }
                        break;
                }
            }

            return true;
        });

        // Sort recordings
        this.sortRecordings();

        // Reset to first page
        this.currentPage = 1;

        // Update display
        this.updateResultsInfo();
        this.renderRecordings();
        this.renderPagination();
    }

    sortRecordings() {
        this.filteredRecordings.sort((a, b) => {
            switch (this.currentFilters.sortBy) {
                case 'newest':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'oldest':
                    return new Date(a.created_at) - new Date(b.created_at);
                case 'duration_desc':
                    return (b.duration || 0) - (a.duration || 0);
                case 'duration_asc':
                    return (a.duration || 0) - (b.duration || 0);
                case 'size_desc':
                    return (b.file_size || 0) - (a.file_size || 0);
                case 'size_asc':
                    return (a.file_size || 0) - (b.file_size || 0);
                case 'title':
                    return (a.original_filename || '').localeCompare(b.original_filename || '');
                default:
                    return 0;
            }
        });
    }

    renderRecordings() {
        const startIndex = (this.currentPage - 1) * this.recordingsPerPage;
        const endIndex = startIndex + this.recordingsPerPage;
        const pageRecordings = this.filteredRecordings.slice(startIndex, endIndex);

        if (pageRecordings.length === 0) {
            this.showEmptyState();
            return;
        }

        const recordingsHTML = pageRecordings.map(recording => this.createRecordingCard(recording)).join('');
        
        this.container.innerHTML = `
            <div class="recordings-grid ${this.currentView === 'list' ? 'list-view' : ''}">
                ${recordingsHTML}
            </div>
        `;

        // Add click event listeners
        this.container.querySelectorAll('.recording-card').forEach((card, index) => {
            const recording = pageRecordings[index];
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.action-btn')) {
                    this.openRecording(recording);
                }
            });
        });
    }

    createRecordingCard(recording) {
        const quality = this.getQualityFromResolution(recording.width, recording.height);
        const duration = this.formatDuration(recording.duration);
        const date = new Date(recording.created_at).toLocaleDateString();
        const size = this.formatFileSize(recording.file_size);
        const title = this.getRecordingTitle(recording);
        const thumbnailUrl = recording.thumbnail_url || '/web/assets/images/video-placeholder.jpg';

        return `
            <div class="recording-card" data-recording-id="${recording.recording_id}">
                <div class="recording-thumbnail">
                    <img src="${thumbnailUrl}" alt="${title}" onerror="this.src='/web/assets/images/video-placeholder.jpg'">
                    <div class="recording-duration">${duration}</div>
                    <div class="recording-quality">${quality}</div>
                    <div class="play-overlay">
                        <i class="fas fa-play"></i>
                    </div>
                </div>
                <div class="recording-info">
                    <div class="recording-title">${title}</div>
                    <div class="recording-meta">
                        <div class="meta-item">
                            <i class="fas fa-calendar"></i>
                            <span>${date}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-eye"></i>
                            <span>${recording.views || 0} views</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-download"></i>
                            <span>${size}</span>
                        </div>
                    </div>
                    <div class="recording-actions">
                        <button class="action-btn primary" onclick="recordingsGallery.openRecording('${recording.recording_id}')">
                            <i class="fas fa-play"></i> Watch
                        </button>
                        <button class="action-btn" onclick="recordingsGallery.shareRecording('${recording.recording_id}')">
                            <i class="fas fa-share"></i> Share
                        </button>
                        <button class="action-btn" onclick="recordingsGallery.downloadRecording('${recording.recording_id}')">
                            <i class="fas fa-download"></i> Download
                        </button>
                        <button class="action-btn" onclick="recordingsGallery.deleteRecording('${recording.recording_id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderPagination() {
        const totalPages = Math.ceil(this.filteredRecordings.length / this.recordingsPerPage);
        
        if (totalPages <= 1) {
            this.paginationContainer.style.display = 'none';
            return;
        }

        this.paginationContainer.style.display = 'block';

        let paginationHTML = '';

        // Previous button
        paginationHTML += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage - 1}">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;

        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        if (startPage > 1) {
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
            if (startPage > 2) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
        }

        // Next button
        paginationHTML += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage + 1}">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;

        this.pagination.innerHTML = paginationHTML;

        // Add click event listeners
        this.pagination.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.target.closest('.page-link').dataset.page);
                if (page && page !== this.currentPage) {
                    this.currentPage = page;
                    this.renderRecordings();
                    this.renderPagination();
                    this.scrollToTop();
                }
            });
        });
    }

    updateStats() {
        const totalRecordings = this.recordings.length;
        const totalDuration = this.recordings.reduce((sum, r) => sum + (r.duration || 0), 0);
        const totalSize = this.recordings.reduce((sum, r) => sum + (r.file_size || 0), 0);
        const totalViews = this.recordings.reduce((sum, r) => sum + (r.views || 0), 0);

        this.totalRecordings.textContent = totalRecordings.toLocaleString();
        this.totalDuration.textContent = this.formatDuration(totalDuration);
        this.totalSize.textContent = this.formatFileSize(totalSize);
        this.totalViews.textContent = totalViews.toLocaleString();
    }

    updateResultsInfo() {
        const total = this.filteredRecordings.length;
        const start = (this.currentPage - 1) * this.recordingsPerPage + 1;
        const end = Math.min(start + this.recordingsPerPage - 1, total);

        if (total === 0) {
            this.resultsInfo.textContent = 'No recordings found';
        } else {
            this.resultsInfo.textContent = `Showing ${start}-${end} of ${total} recordings`;
        }
    }

    setView(view) {
        this.currentView = view;
        
        // Update button states
        this.gridViewBtn.classList.toggle('active', view === 'grid');
        this.listViewBtn.classList.toggle('active', view === 'list');
        
        // Re-render recordings
        this.renderRecordings();
        
        // Save preference
        localStorage.setItem('recordingsView', view);
    }

    clearFilters() {
        this.searchInput.value = '';
        this.sortBy.value = 'newest';
        this.qualityFilter.value = '';
        this.dateFilter.value = '';
        
        this.currentFilters = {
            search: '',
            sortBy: 'newest',
            quality: '',
            dateRange: ''
        };
        
        this.applyFiltersAndSort();
    }

    // Recording actions
    openRecording(recordingId) {
        window.open(`/web/public/video-player.html?recording=${recordingId}`, '_blank');
    }

    shareRecording(recordingId) {
        const recording = this.recordings.find(r => r.recording_id === recordingId);
        const title = recording ? this.getRecordingTitle(recording) : 'Video Recording';

        if (window.videoSharing) {
            window.videoSharing.showSharingModal(recordingId, title);
        } else {
            console.error('Video sharing service not loaded');
            alert('Sharing feature is not available. Please refresh the page.');
        }
    }

    downloadRecording(recordingId) {
        const recording = this.recordings.find(r => r.recording_id === recordingId);
        if (recording) {
            const downloadUrl = `/api/videos/stream/${btoa(recording.storage_path)}?download=1`;
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = recording.original_filename;
            link.click();
        }
    }

    async deleteRecording(recordingId) {
        if (!confirm('Are you sure you want to delete this recording? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/videos/${recordingId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (response.ok) {
                // Remove from local array
                this.recordings = this.recordings.filter(r => r.recording_id !== recordingId);
                this.updateStats();
                this.applyFiltersAndSort();
                
                // Show success message
                this.showSuccessMessage('Recording deleted successfully');
            } else {
                throw new Error('Failed to delete recording');
            }
        } catch (error) {
            console.error('Error deleting recording:', error);
            alert('Failed to delete recording. Please try again.');
        }
    }

    // Utility methods
    getQualityFromResolution(width, height) {
        if (height >= 2160) return '2160p';
        if (height >= 1440) return '1440p';
        if (height >= 1080) return '1080p';
        if (height >= 720) return '720p';
        if (height >= 480) return '480p';
        if (height >= 360) return '360p';
        return '240p';
    }

    formatDuration(seconds) {
        if (!seconds) return '0:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    formatFileSize(bytes) {
        if (!bytes) return '0 B';
        
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    getRecordingTitle(recording) {
        if (recording.title) return recording.title;
        if (recording.original_filename) {
            return recording.original_filename.replace(/\.[^/.]+$/, ''); // Remove extension
        }
        return `Recording ${recording.recording_id.substring(0, 8)}`;
    }

    getAuthToken() {
        return localStorage.getItem('auth_token') || 'demo_token';
    }

    showLoading() {
        this.container.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
            </div>
        `;
    }

    showError(message) {
        this.container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    <i class="fas fa-refresh"></i> Retry
                </button>
            </div>
        `;
    }

    showEmptyState() {
        const hasFilters = this.currentFilters.search || this.currentFilters.quality || this.currentFilters.dateRange;
        
        this.container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-video"></i>
                <h3>${hasFilters ? 'No recordings match your filters' : 'No recordings found'}</h3>
                <p>${hasFilters ? 'Try adjusting your search criteria or clearing filters.' : 'Start creating interview recordings to see them here.'}</p>
                ${hasFilters ? `
                    <button class="btn btn-primary" onclick="recordingsGallery.clearFilters()">
                        <i class="fas fa-times"></i> Clear Filters
                    </button>
                ` : `
                    <a href="/web/public/host-dashboard.html" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Create New Interview
                    </a>
                `}
            </div>
        `;
    }

    showSuccessMessage(message) {
        // Create temporary success message
        const successDiv = document.createElement('div');
        successDiv.className = 'alert alert-success position-fixed';
        successDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999;';
        successDiv.innerHTML = `
            <i class="fas fa-check-circle"></i> ${message}
        `;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }

    scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Global instance for onclick handlers
let recordingsGallery;
