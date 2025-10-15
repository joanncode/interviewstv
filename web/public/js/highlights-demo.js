/**
 * AI-Powered Highlights Demo
 * Intelligent detection and management of interview highlights
 */
class HighlightsDemo {
    constructor() {
        this.highlights = [];
        this.filteredHighlights = [];
        this.currentView = 'list';
        this.analysisInProgress = false;
        
        this.initializeElements();
        this.setupEventListeners();
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.interviewIdInput = document.getElementById('interview-id');
        this.maxHighlightsSelect = document.getElementById('max-highlights');
        this.minConfidenceSelect = document.getElementById('min-confidence');
        this.analyzeBtn = document.getElementById('analyze-btn');
        this.demoDataBtn = document.getElementById('demo-data-btn');
        
        this.statsGrid = document.getElementById('stats-grid');
        this.totalHighlightsCounter = document.getElementById('total-highlights');
        this.avgConfidenceCounter = document.getElementById('avg-confidence');
        this.avgImportanceCounter = document.getElementById('avg-importance');
        this.totalDurationCounter = document.getElementById('total-duration');
        
        this.filterCard = document.getElementById('filter-card');
        this.filterTypeSelect = document.getElementById('filter-type');
        this.filterStatusSelect = document.getElementById('filter-status');
        this.sortBySelect = document.getElementById('sort-by');
        this.applyFiltersBtn = document.getElementById('apply-filters-btn');
        this.exportBtn = document.getElementById('export-btn');
        
        this.listViewBtn = document.getElementById('list-view-btn');
        this.timelineViewBtn = document.getElementById('timeline-view-btn');
        
        this.loadingSpinner = document.getElementById('loading-spinner');
        this.highlightsCard = document.getElementById('highlights-card');
        this.highlightsContainer = document.getElementById('highlights-container');
        
        this.toastContainer = document.getElementById('toast-container');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.analyzeBtn.addEventListener('click', () => this.analyzeInterview());
        this.demoDataBtn.addEventListener('click', () => this.loadDemoData());
        this.applyFiltersBtn.addEventListener('click', () => this.applyFilters());
        this.exportBtn.addEventListener('click', () => this.exportHighlights());
        
        this.listViewBtn.addEventListener('click', () => this.switchView('list'));
        this.timelineViewBtn.addEventListener('click', () => this.switchView('timeline'));
        
        // Auto-apply filters when selection changes
        this.filterTypeSelect.addEventListener('change', () => this.applyFilters());
        this.filterStatusSelect.addEventListener('change', () => this.applyFilters());
        this.sortBySelect.addEventListener('change', () => this.applyFilters());
    }

    /**
     * Analyze interview for highlights
     */
    async analyzeInterview() {
        if (this.analysisInProgress) return;
        
        const interviewId = this.interviewIdInput.value.trim();
        if (!interviewId) {
            this.showToast('Please enter an interview ID', 'warning');
            return;
        }
        
        this.analysisInProgress = true;
        this.showLoading(true);
        this.updateAnalyzeButton(true);
        
        try {
            const options = {
                max_highlights: parseInt(this.maxHighlightsSelect.value),
                min_confidence: parseFloat(this.minConfidenceSelect.value),
                auto_approve: false
            };
            
            const response = await fetch(`/interviews-tv/api/highlights/analyze/${interviewId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(options)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.highlights = data.analysis.highlights;
                this.filteredHighlights = [...this.highlights];
                this.displayResults();
                this.updateStatistics(data.analysis);
                this.showToast(`Analysis complete! Found ${this.highlights.length} highlights`, 'success');
            } else {
                throw new Error(data.error || 'Analysis failed');
            }
            
        } catch (error) {
            console.error('Analysis failed:', error);
            this.showToast('Analysis failed: ' + error.message, 'error');
        } finally {
            this.analysisInProgress = false;
            this.showLoading(false);
            this.updateAnalyzeButton(false);
        }
    }

    /**
     * Load demo data for testing
     */
    loadDemoData() {
        this.highlights = this.generateDemoHighlights();
        this.filteredHighlights = [...this.highlights];
        this.displayResults();
        this.updateStatistics({
            total_highlights: this.highlights.length,
            analysis_summary: {
                avg_confidence: 0.85,
                avg_importance: 0.78,
                total_duration: this.highlights.reduce((sum, h) => sum + h.duration, 0)
            }
        });
        this.showToast('Demo data loaded successfully', 'success');
    }

    /**
     * Generate demo highlights data
     */
    generateDemoHighlights() {
        return [
            {
                highlight_id: 'demo_1',
                title: 'Guest shares breakthrough discovery',
                description: 'A significant breakthrough that could revolutionize the industry',
                highlight_type: 'breakthrough',
                start_time: 75.0,
                end_time: 120.0,
                duration: 45.0,
                confidence: 0.94,
                importance: 0.92,
                engagement_score: 0.88,
                text: 'It was a eureka moment! I was analyzing the data when suddenly everything clicked. This innovation will revolutionize how we approach the problem.',
                speaker: 'Guest',
                keywords: ['breakthrough', 'eureka', 'innovation', 'revolutionize'],
                topics: ['technology', 'innovation'],
                emotions: { excitement: 0.9, passion: 0.8 },
                status: 'detected'
            },
            {
                highlight_id: 'demo_2',
                title: 'Important insight on future trends',
                description: 'Key perspective on where the industry is heading',
                highlight_type: 'insight',
                start_time: 180.0,
                end_time: 210.0,
                duration: 30.0,
                confidence: 0.87,
                importance: 0.85,
                engagement_score: 0.82,
                text: 'What an important insight! This could have significant implications for the future of our industry.',
                speaker: 'Host',
                keywords: ['important', 'insight', 'future', 'implications'],
                topics: ['future', 'business'],
                emotions: { surprise: 0.7, interest: 0.8 },
                status: 'detected'
            },
            {
                highlight_id: 'demo_3',
                title: 'Emotional moment about challenges',
                description: 'Guest shares personal struggles and determination',
                highlight_type: 'emotional_peak',
                start_time: 300.0,
                end_time: 330.0,
                duration: 30.0,
                confidence: 0.82,
                importance: 0.75,
                engagement_score: 0.90,
                text: 'I have to admit, there were times when I felt frustrated and wanted to give up. But my passion for this work kept me going.',
                speaker: 'Guest',
                keywords: ['frustrated', 'passionate', 'challenges'],
                topics: ['personal', 'motivation'],
                emotions: { frustration: 0.6, passion: 0.9, determination: 0.8 },
                status: 'detected'
            },
            {
                highlight_id: 'demo_4',
                title: 'Q&A: Technical implementation',
                description: 'Detailed discussion about technical aspects',
                highlight_type: 'question_answer',
                start_time: 450.0,
                end_time: 510.0,
                duration: 60.0,
                confidence: 0.89,
                importance: 0.83,
                engagement_score: 0.75,
                text: 'That\'s a great question about the technical implementation. Let me explain how we solved that particular challenge...',
                speaker: 'Guest',
                keywords: ['question', 'technical', 'implementation', 'challenge'],
                topics: ['technology', 'solution'],
                emotions: { confidence: 0.8 },
                status: 'detected'
            },
            {
                highlight_id: 'demo_5',
                title: 'Discussion shifts to market impact',
                description: 'Conversation moves to business implications',
                highlight_type: 'topic_change',
                start_time: 600.0,
                end_time: 620.0,
                duration: 20.0,
                confidence: 0.76,
                importance: 0.70,
                engagement_score: 0.65,
                text: 'Now let\'s talk about the market impact and how this will affect businesses in the sector.',
                speaker: 'Host',
                keywords: ['market', 'impact', 'business'],
                topics: ['business', 'market'],
                emotions: { interest: 0.7 },
                status: 'detected'
            }
        ];
    }

    /**
     * Apply filters to highlights
     */
    applyFilters() {
        const typeFilter = this.filterTypeSelect.value;
        const statusFilter = this.filterStatusSelect.value;
        const sortBy = this.sortBySelect.value;
        
        // Filter highlights
        this.filteredHighlights = this.highlights.filter(highlight => {
            if (typeFilter && highlight.highlight_type !== typeFilter) return false;
            if (statusFilter && highlight.status !== statusFilter) return false;
            return true;
        });
        
        // Sort highlights
        this.filteredHighlights.sort((a, b) => {
            switch (sortBy) {
                case 'importance_score':
                    return b.importance - a.importance;
                case 'confidence_score':
                    return b.confidence - a.confidence;
                case 'start_time':
                    return a.start_time - b.start_time;
                case 'duration':
                    return b.duration - a.duration;
                default:
                    return b.importance - a.importance;
            }
        });
        
        this.displayHighlights();
    }

    /**
     * Switch between list and timeline view
     */
    switchView(view) {
        this.currentView = view;
        
        // Update button states
        this.listViewBtn.classList.toggle('active', view === 'list');
        this.timelineViewBtn.classList.toggle('active', view === 'timeline');
        
        this.displayHighlights();
    }

    /**
     * Display analysis results
     */
    displayResults() {
        this.statsGrid.style.display = 'grid';
        this.filterCard.style.display = 'block';
        this.highlightsCard.style.display = 'block';
        this.displayHighlights();
    }

    /**
     * Display highlights in current view
     */
    displayHighlights() {
        if (this.currentView === 'list') {
            this.displayListView();
        } else {
            this.displayTimelineView();
        }
    }

    /**
     * Display highlights in list view
     */
    displayListView() {
        this.highlightsContainer.innerHTML = '';
        
        if (this.filteredHighlights.length === 0) {
            this.highlightsContainer.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="fas fa-search fa-3x mb-3"></i>
                    <h5>No highlights found</h5>
                    <p>Try adjusting your filters or analyzing a different interview</p>
                </div>
            `;
            return;
        }
        
        this.filteredHighlights.forEach(highlight => {
            const highlightElement = this.createHighlightElement(highlight);
            this.highlightsContainer.appendChild(highlightElement);
        });
    }

    /**
     * Display highlights in timeline view
     */
    displayTimelineView() {
        this.highlightsContainer.innerHTML = '<div class="timeline-view"></div>';
        const timelineContainer = this.highlightsContainer.querySelector('.timeline-view');
        
        if (this.filteredHighlights.length === 0) {
            timelineContainer.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="fas fa-clock fa-3x mb-3"></i>
                    <h5>No highlights in timeline</h5>
                    <p>Try adjusting your filters or analyzing a different interview</p>
                </div>
            `;
            return;
        }
        
        // Sort by start time for timeline
        const sortedHighlights = [...this.filteredHighlights].sort((a, b) => a.start_time - b.start_time);
        
        sortedHighlights.forEach(highlight => {
            const timelineItem = document.createElement('div');
            timelineItem.className = 'timeline-item';
            timelineItem.innerHTML = `
                <div class="timeline-time">${this.formatTime(highlight.start_time)}</div>
                ${this.createHighlightElement(highlight).outerHTML}
            `;
            timelineContainer.appendChild(timelineItem);
        });
    }

    /**
     * Create highlight element
     */
    createHighlightElement(highlight) {
        const element = document.createElement('div');
        element.className = 'highlight-item';
        element.innerHTML = `
            <div class="highlight-header">
                <h6 class="highlight-title">${highlight.title}</h6>
                <span class="highlight-type">${this.formatHighlightType(highlight.highlight_type)}</span>
            </div>

            <div class="highlight-meta">
                <span><i class="fas fa-clock"></i> ${this.formatTime(highlight.start_time)} - ${this.formatTime(highlight.end_time)}</span>
                <span><i class="fas fa-stopwatch"></i> ${highlight.duration}s</span>
                <span><i class="fas fa-user"></i> ${highlight.speaker}</span>
            </div>

            <div class="highlight-text">"${highlight.text}"</div>

            <div class="highlight-scores">
                <span class="score-badge ${this.getConfidenceClass(highlight.confidence)}">
                    Confidence: ${Math.round(highlight.confidence * 100)}%
                </span>
                <span class="score-badge ${this.getImportanceClass(highlight.importance)}">
                    Importance: ${Math.round(highlight.importance * 100)}%
                </span>
                <span class="score-badge" style="background: #6f42c1; color: white;">
                    Engagement: ${Math.round(highlight.engagement_score * 100)}%
                </span>
            </div>

            ${this.renderKeywords(highlight.keywords)}
            ${this.renderEmotions(highlight.emotions)}

            <div class="highlight-actions">
                <button class="btn btn-sm btn-primary" onclick="highlightsDemo.approveHighlight('${highlight.highlight_id}')">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button class="btn btn-sm btn-outline-light" onclick="highlightsDemo.editHighlight('${highlight.highlight_id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-outline-light" onclick="highlightsDemo.playHighlight('${highlight.highlight_id}')">
                    <i class="fas fa-play"></i> Play
                </button>
                <button class="btn btn-sm btn-outline-light" onclick="highlightsDemo.shareHighlight('${highlight.highlight_id}')">
                    <i class="fas fa-share"></i> Share
                </button>
            </div>
        `;

        return element;
    }

    /**
     * Render keywords
     */
    renderKeywords(keywords) {
        if (!keywords || keywords.length === 0) return '';

        const keywordTags = keywords.map(keyword =>
            `<span class="keyword-tag">${keyword}</span>`
        ).join('');

        return `
            <div class="keywords-list">
                <small class="text-muted me-2">Keywords:</small>
                ${keywordTags}
            </div>
        `;
    }

    /**
     * Render emotions
     */
    renderEmotions(emotions) {
        if (!emotions || Object.keys(emotions).length === 0) return '';

        const emotionTags = Object.entries(emotions)
            .filter(([emotion, score]) => score > 0.5)
            .map(([emotion, score]) =>
                `<span class="emotion-tag">${emotion} (${Math.round(score * 100)}%)</span>`
            ).join('');

        if (!emotionTags) return '';

        return `
            <div class="emotions-list">
                <small class="text-muted me-2">Emotions:</small>
                ${emotionTags}
            </div>
        `;
    }

    /**
     * Update statistics display
     */
    updateStatistics(analysis) {
        const summary = analysis.analysis_summary || analysis;

        this.totalHighlightsCounter.textContent = analysis.total_highlights || this.highlights.length;
        this.avgConfidenceCounter.textContent = Math.round((summary.avg_confidence || 0) * 100) + '%';
        this.avgImportanceCounter.textContent = Math.round((summary.avg_importance || 0) * 100) + '%';
        this.totalDurationCounter.textContent = Math.round(summary.total_duration || 0) + 's';
    }

    /**
     * Approve highlight
     */
    async approveHighlight(highlightId) {
        try {
            const response = await fetch(`/interviews-tv/api/highlights/${highlightId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: 'approved',
                    user_id: 1
                })
            });

            const data = await response.json();

            if (data.success) {
                // Update local data
                const highlight = this.highlights.find(h => h.highlight_id === highlightId);
                if (highlight) {
                    highlight.status = 'approved';
                    this.applyFilters(); // Refresh display
                }
                this.showToast('Highlight approved successfully', 'success');
            } else {
                throw new Error(data.error || 'Failed to approve highlight');
            }

        } catch (error) {
            console.error('Failed to approve highlight:', error);
            this.showToast('Failed to approve highlight: ' + error.message, 'error');
        }
    }

    /**
     * Edit highlight (placeholder)
     */
    editHighlight(highlightId) {
        this.showToast('Edit functionality would open a modal here', 'info');
    }

    /**
     * Play highlight (placeholder)
     */
    playHighlight(highlightId) {
        const highlight = this.highlights.find(h => h.highlight_id === highlightId);
        if (highlight) {
            this.showToast(`Playing highlight from ${this.formatTime(highlight.start_time)} to ${this.formatTime(highlight.end_time)}`, 'info');
        }
    }

    /**
     * Share highlight (placeholder)
     */
    shareHighlight(highlightId) {
        const highlight = this.highlights.find(h => h.highlight_id === highlightId);
        if (highlight) {
            // Simulate copying to clipboard
            const shareText = `Check out this highlight: "${highlight.title}" - ${highlight.description}`;
            this.showToast('Highlight link copied to clipboard', 'success');
        }
    }

    /**
     * Export highlights
     */
    async exportHighlights() {
        if (this.filteredHighlights.length === 0) {
            this.showToast('No highlights to export', 'warning');
            return;
        }

        try {
            const interviewId = this.interviewIdInput.value.trim() || 'demo_interview';
            const format = 'json'; // Could be made configurable

            // For demo, we'll create a local export
            const exportData = {
                export_info: {
                    generated_at: new Date().toISOString(),
                    total_highlights: this.filteredHighlights.length,
                    interview_id: interviewId
                },
                highlights: this.filteredHighlights
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `highlights_${interviewId}_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            this.showToast('Highlights exported successfully', 'success');

        } catch (error) {
            console.error('Export failed:', error);
            this.showToast('Export failed: ' + error.message, 'error');
        }
    }

    /**
     * Format highlight type for display
     */
    formatHighlightType(type) {
        const typeMap = {
            'breakthrough': 'Breakthrough',
            'insight': 'Insight',
            'emotional_peak': 'Emotional',
            'question_answer': 'Q&A',
            'topic_change': 'Topic Change',
            'key_moment': 'Key Moment',
            'important_quote': 'Quote',
            'conclusion': 'Conclusion'
        };

        return typeMap[type] || type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Get confidence class for styling
     */
    getConfidenceClass(confidence) {
        if (confidence >= 0.8) return 'confidence-high';
        if (confidence >= 0.6) return 'confidence-medium';
        return 'confidence-low';
    }

    /**
     * Get importance class for styling
     */
    getImportanceClass(importance) {
        if (importance >= 0.8) return 'importance-high';
        if (importance >= 0.6) return 'importance-medium';
        return 'importance-low';
    }

    /**
     * Format time in MM:SS format
     */
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    /**
     * Show/hide loading spinner
     */
    showLoading(show) {
        this.loadingSpinner.style.display = show ? 'block' : 'none';
    }

    /**
     * Update analyze button state
     */
    updateAnalyzeButton(analyzing) {
        if (analyzing) {
            this.analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
            this.analyzeBtn.disabled = true;
        } else {
            this.analyzeBtn.innerHTML = '<i class="fas fa-magic"></i> Analyze Interview';
            this.analyzeBtn.disabled = false;
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info'} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        this.toastContainer.appendChild(toast);

        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        // Remove toast element after it's hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }
}

// Initialize highlights demo when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.highlightsDemo = new HighlightsDemo();
});
