/**
 * Automated Summaries Demo
 * AI-powered interview summary generation demonstration
 */
class AutomatedSummariesDemo {
    constructor() {
        this.sessionId = null;
        this.sessionActive = false;
        this.demoData = null;
        this.selectedTemplate = null;
        this.selectedInterview = null;
        this.currentSummary = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadDemoData();
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        // Session controls
        this.interviewIdInput = document.getElementById('interview-id');
        this.summaryTypeSelect = document.getElementById('summary-type');
        this.processingModeSelect = document.getElementById('processing-mode');
        this.languageSelect = document.getElementById('language');
        this.includeInsightsCheckbox = document.getElementById('include-insights');
        this.includeRecommendationsCheckbox = document.getElementById('include-recommendations');
        this.autoExportCheckbox = document.getElementById('auto-export');
        this.saveFeedbackCheckbox = document.getElementById('save-feedback');
        
        // Buttons
        this.startSessionBtn = document.getElementById('start-session-btn');
        this.generateSummaryBtn = document.getElementById('generate-summary-btn');
        this.loadDemoDataBtn = document.getElementById('load-demo-data-btn');
        
        // Status indicators
        this.sessionStatus = document.getElementById('session-status');
        this.sessionStatusText = document.getElementById('session-status-text');
        
        // AI models and templates
        this.aiModelsList = document.getElementById('ai-models-list');
        this.templatesList = document.getElementById('templates-list');
        this.demoInterviewsList = document.getElementById('demo-interviews-list');
        
        // Metrics
        this.sectionsGeneratedCounter = document.getElementById('sections-generated');
        this.insightsExtractedCounter = document.getElementById('insights-extracted');
        this.processingTimeCounter = document.getElementById('processing-time');
        this.wordCountCounter = document.getElementById('word-count');
        this.confidenceFill = document.getElementById('confidence-fill');
        this.confidencePercentage = document.getElementById('confidence-percentage');
        
        // Progress
        this.progressCard = document.getElementById('progress-card');
        this.progressBar = document.getElementById('progress-bar');
        this.progressStep = document.getElementById('progress-step');
        this.progressDetails = document.getElementById('progress-details');
        
        // Results
        this.resultsCard = document.getElementById('results-card');
        this.summaryTitle = document.getElementById('summary-title');
        this.overallRating = document.getElementById('overall-rating');
        this.summaryConfidence = document.getElementById('summary-confidence');
        this.readingTime = document.getElementById('reading-time');
        this.summaryWordCount = document.getElementById('summary-word-count');
        this.summaryContent = document.getElementById('summary-content');
        this.insightsList = document.getElementById('insights-list');
        
        // Export buttons
        this.exportButtons = document.querySelectorAll('.export-button');
        
        // Loading spinner
        this.loadingSpinner = document.getElementById('loading-spinner');
        
        // Toast container
        this.toastContainer = document.getElementById('toast-container');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.startSessionBtn.addEventListener('click', () => this.startSession());
        this.generateSummaryBtn.addEventListener('click', () => this.generateSummary());
        this.loadDemoDataBtn.addEventListener('click', () => this.loadDemoData());
        
        // Export buttons
        this.exportButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const format = e.target.closest('button').dataset.format;
                this.exportSummary(format);
            });
        });
        
        // Summary type change
        this.summaryTypeSelect.addEventListener('change', () => {
            this.updateTemplateSelection();
        });
    }

    /**
     * Load demo data from API
     */
    async loadDemoData() {
        try {
            this.showLoading(true);
            
            const response = await fetch('/interviews-tv/api/automated-summaries/demo-data');
            const data = await response.json();
            
            if (data.success) {
                this.demoData = data;
                this.populateAIModels(data.ai_models);
                this.populateTemplates(data.summary_templates);
                this.populateDemoInterviews(data.demo_interviews);
                this.showToast('Demo data loaded successfully', 'success');
            } else {
                throw new Error(data.error || 'Failed to load demo data');
            }
            
        } catch (error) {
            console.error('Failed to load demo data:', error);
            this.showToast('Failed to load demo data: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Populate AI models list
     */
    populateAIModels(aiModels) {
        this.aiModelsList.innerHTML = '';
        
        aiModels.forEach(model => {
            const badge = document.createElement('div');
            badge.className = `ai-model-badge ${model.enabled ? 'enabled' : ''}`;
            badge.textContent = model.model_name;
            badge.title = `${model.provider} - Confidence: ${model.confidence_threshold}`;
            badge.dataset.modelId = model.model_id;
            
            badge.addEventListener('click', () => {
                badge.classList.toggle('enabled');
            });
            
            this.aiModelsList.appendChild(badge);
        });
    }

    /**
     * Populate summary templates
     */
    populateTemplates(templates) {
        this.templatesList.innerHTML = '';
        
        templates.forEach(template => {
            const col = document.createElement('div');
            col.className = 'col-md-3 mb-3';
            
            const card = document.createElement('div');
            card.className = 'card template-card h-100';
            card.dataset.templateId = template.template_id;
            card.dataset.templateType = template.template_type;
            
            if (template.is_default) {
                card.classList.add('selected');
                this.selectedTemplate = template;
            }
            
            card.innerHTML = `
                <div class="card-body">
                    <h6 class="card-title">${template.template_name}</h6>
                    <p class="card-text small">${template.description}</p>
                    <div class="mt-2">
                        <small class="text-muted">
                            <i class="fas fa-clock"></i> ~${template.target_reading_time} min read
                        </small>
                    </div>
                </div>
            `;
            
            card.addEventListener('click', () => {
                // Remove selection from other templates
                document.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedTemplate = template;
                this.summaryTypeSelect.value = template.template_type;
            });
            
            col.appendChild(card);
            this.templatesList.appendChild(col);
        });
    }

    /**
     * Populate demo interviews
     */
    populateDemoInterviews(interviews) {
        this.demoInterviewsList.innerHTML = '';
        
        interviews.forEach((interview, index) => {
            const col = document.createElement('div');
            col.className = 'col-md-6 mb-3';
            
            const card = document.createElement('div');
            card.className = 'card demo-interview-card h-100';
            card.dataset.interviewId = interview.interview_id;
            
            if (index === 0) {
                card.classList.add('selected');
                this.selectedInterview = interview;
                this.interviewIdInput.value = interview.interview_id;
            }
            
            const participantNames = interview.participants.map(p => p.name).join(', ');
            const durationMinutes = Math.round(interview.duration / 60);
            
            card.innerHTML = `
                <div class="card-body">
                    <h6 class="card-title">${interview.title}</h6>
                    <p class="card-text small">
                        <i class="fas fa-users"></i> ${participantNames}<br>
                        <i class="fas fa-clock"></i> ${durationMinutes} minutes<br>
                        <i class="fas fa-tag"></i> ${interview.expected_summary_type}
                    </p>
                    <div class="mt-2">
                        <span class="badge bg-secondary">${interview.interview_id}</span>
                    </div>
                </div>
            `;
            
            card.addEventListener('click', () => {
                // Remove selection from other interviews
                document.querySelectorAll('.demo-interview-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedInterview = interview;
                this.interviewIdInput.value = interview.interview_id;
                this.summaryTypeSelect.value = interview.expected_summary_type;
                this.updateTemplateSelection();
            });
            
            col.appendChild(card);
            this.demoInterviewsList.appendChild(col);
        });
    }

    /**
     * Update template selection based on summary type
     */
    updateTemplateSelection() {
        const summaryType = this.summaryTypeSelect.value;
        
        document.querySelectorAll('.template-card').forEach(card => {
            card.classList.remove('selected');
            if (card.dataset.templateType === summaryType) {
                card.classList.add('selected');
                // Find template data
                if (this.demoData && this.demoData.summary_templates) {
                    this.selectedTemplate = this.demoData.summary_templates.find(t => t.template_type === summaryType);
                }
            }
        });
    }

    /**
     * Start summary session
     */
    async startSession() {
        try {
            this.showLoading(true);
            
            // Get enabled AI models
            const enabledModels = Array.from(this.aiModelsList.querySelectorAll('.ai-model-badge.enabled'))
                .map(badge => badge.dataset.modelId);
            
            if (enabledModels.length === 0) {
                throw new Error('Please select at least one AI model');
            }
            
            const sessionData = {
                interview_id: this.interviewIdInput.value.trim() || 'demo_interview_001',
                user_id: 1, // Demo user
                options: {
                    type: this.summaryTypeSelect.value,
                    mode: this.processingModeSelect.value,
                    language: this.languageSelect.value,
                    ai_models: enabledModels,
                    settings: {
                        include_insights: this.includeInsightsCheckbox.checked,
                        include_recommendations: this.includeRecommendationsCheckbox.checked,
                        auto_export: this.autoExportCheckbox.checked,
                        save_feedback: this.saveFeedbackCheckbox.checked
                    }
                }
            };
            
            const response = await fetch('/interviews-tv/api/automated-summaries/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(sessionData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.sessionId = data.session.session_id;
                this.sessionActive = true;
                
                // Update UI
                this.updateSessionStatus(true);
                this.showToast('Summary session started successfully', 'success');
                
            } else {
                throw new Error(data.error || 'Failed to start session');
            }
            
        } catch (error) {
            console.error('Failed to start session:', error);
            this.showToast('Failed to start session: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Generate summary
     */
    async generateSummary() {
        try {
            if (!this.sessionActive || !this.sessionId) {
                this.showToast('Please start a session first', 'warning');
                return;
            }
            
            if (!this.selectedInterview) {
                this.showToast('Please select an interview to summarize', 'warning');
                return;
            }
            
            this.showProgress(true);
            this.updateProgress(10, 'Preparing interview data', 'Loading interview content and metadata');
            
            const interviewData = {
                interview_data: this.selectedInterview
            };
            
            this.updateProgress(30, 'Generating summary', 'AI models are analyzing the interview content');
            
            const response = await fetch(`/interviews-tv/api/automated-summaries/sessions/${this.sessionId}/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(interviewData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.updateProgress(90, 'Finalizing summary', 'Preparing results for display');
                
                this.currentSummary = data.summary;
                this.displaySummaryResults(data.summary);
                this.updateSessionMetrics();
                
                this.updateProgress(100, 'Summary completed', 'Ready for review and export');
                this.showToast('Summary generated successfully', 'success');
                
                setTimeout(() => {
                    this.showProgress(false);
                }, 2000);
                
            } else {
                throw new Error(data.error || 'Summary generation failed');
            }
            
        } catch (error) {
            console.error('Summary generation failed:', error);
            this.showToast('Summary generation failed: ' + error.message, 'error');
            this.showProgress(false);
        }
    }

    /**
     * Display summary results
     */
    displaySummaryResults(summary) {
        // Show results card
        this.resultsCard.style.display = 'block';

        // Update summary header
        this.summaryTitle.textContent = summary.title;
        this.overallRating.textContent = summary.overall_rating;
        this.summaryConfidence.textContent = Math.round(summary.confidence_score * 100) + '%';
        this.readingTime.textContent = summary.reading_time_minutes + ' min';
        this.summaryWordCount.textContent = summary.word_count;

        // Display summary content
        this.displaySummaryContent(summary);

        // Display insights
        this.displayInsights(summary);

        // Scroll to results
        this.resultsCard.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Display summary content sections
     */
    displaySummaryContent(summary) {
        this.summaryContent.innerHTML = '';

        // Executive Summary
        if (summary.executive_summary) {
            const section = this.createSummarySection('Executive Summary', summary.executive_summary);
            this.summaryContent.appendChild(section);
        }

        // Key Points
        if (summary.key_points) {
            const keyPoints = JSON.parse(summary.key_points);
            if (keyPoints && keyPoints.length > 0) {
                const content = '• ' + keyPoints.join('\n• ');
                const section = this.createSummarySection('Key Points', content);
                this.summaryContent.appendChild(section);
            }
        }

        // Technical Assessment
        if (summary.technical_assessment) {
            const section = this.createSummarySection('Technical Assessment', summary.technical_assessment);
            this.summaryContent.appendChild(section);
        }

        // Behavioral Assessment
        if (summary.behavioral_assessment) {
            const section = this.createSummarySection('Behavioral Assessment', summary.behavioral_assessment);
            this.summaryContent.appendChild(section);
        }

        // Strengths
        if (summary.strengths) {
            const strengths = JSON.parse(summary.strengths);
            if (strengths && strengths.length > 0) {
                const content = '• ' + strengths.join('\n• ');
                const section = this.createSummarySection('Strengths', content);
                this.summaryContent.appendChild(section);
            }
        }

        // Areas for Improvement
        if (summary.areas_for_improvement) {
            const improvements = JSON.parse(summary.areas_for_improvement);
            if (improvements && improvements.length > 0) {
                const content = '• ' + improvements.join('\n• ');
                const section = this.createSummarySection('Areas for Improvement', content);
                this.summaryContent.appendChild(section);
            }
        }

        // Recommendations
        if (summary.recommendations) {
            const recommendations = JSON.parse(summary.recommendations);
            if (recommendations && recommendations.length > 0) {
                const content = recommendations.join('\n\n');
                const section = this.createSummarySection('Recommendations', content);
                this.summaryContent.appendChild(section);
            }
        }

        // Decision Factors
        if (summary.decision_factors) {
            const factors = JSON.parse(summary.decision_factors);
            if (factors && factors.length > 0) {
                const content = '• ' + factors.join('\n• ');
                const section = this.createSummarySection('Decision Factors', content);
                this.summaryContent.appendChild(section);
            }
        }
    }

    /**
     * Create summary section element
     */
    createSummarySection(title, content) {
        const section = document.createElement('div');
        section.className = 'summary-section';
        section.innerHTML = `
            <h6><i class="fas fa-file-text"></i> ${title}</h6>
            <div>${content.replace(/\n/g, '<br>')}</div>
        `;
        return section;
    }

    /**
     * Display insights
     */
    displayInsights(summary) {
        this.insightsList.innerHTML = '';

        // Parse AI analysis data to get insights
        if (summary.ai_analysis_data) {
            try {
                const analysisData = JSON.parse(summary.ai_analysis_data);
                const insights = analysisData.insights || [];

                insights.forEach(insight => {
                    const insightElement = document.createElement('div');
                    insightElement.className = `insight-item insight-${insight.insight_type}`;

                    const confidence = Math.round(insight.confidence_score * 100);
                    const importance = Math.round(insight.importance_score * 100);

                    insightElement.innerHTML = `
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <strong>${insight.insight_category}:</strong> ${insight.insight_text}
                                <div class="mt-1">
                                    <small class="text-muted">
                                        Confidence: ${confidence}% | Importance: ${importance}%
                                    </small>
                                </div>
                            </div>
                            <span class="badge bg-secondary">${insight.insight_type}</span>
                        </div>
                    `;

                    this.insightsList.appendChild(insightElement);
                });

                if (insights.length === 0) {
                    this.insightsList.innerHTML = '<p class="text-muted">No specific insights extracted for this summary.</p>';
                }

            } catch (error) {
                console.error('Failed to parse insights:', error);
                this.insightsList.innerHTML = '<p class="text-muted">Unable to display insights.</p>';
            }
        } else {
            this.insightsList.innerHTML = '<p class="text-muted">No insights data available.</p>';
        }
    }

    /**
     * Update session metrics
     */
    async updateSessionMetrics() {
        try {
            if (!this.sessionId) return;

            const response = await fetch(`/interviews-tv/api/automated-summaries/sessions/${this.sessionId}/analytics`);
            const data = await response.json();

            if (data.success) {
                const stats = data.statistics;

                this.sectionsGeneratedCounter.textContent = stats.sections_generated || 0;
                this.insightsExtractedCounter.textContent = stats.insights_extracted || 0;
                this.processingTimeCounter.textContent = (stats.total_processing_time_ms || 0) + 'ms';
                this.wordCountCounter.textContent = stats.word_count || 0;

                const confidence = Math.round((stats.confidence_score || 0) * 100);
                this.confidenceFill.style.width = confidence + '%';
                this.confidencePercentage.textContent = confidence + '%';
            }

        } catch (error) {
            console.error('Failed to update metrics:', error);
        }
    }

    /**
     * Export summary
     */
    async exportSummary(format) {
        try {
            if (!this.currentSummary) {
                this.showToast('No summary available to export', 'warning');
                return;
            }

            const summaryId = this.currentSummary.summary_id;
            const url = `/interviews-tv/api/automated-summaries/summaries/${summaryId}/export?format=${format}`;

            // Create temporary link to download file
            const link = document.createElement('a');
            link.href = url;
            link.download = `summary_${summaryId}.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showToast(`Summary exported as ${format.toUpperCase()}`, 'success');

        } catch (error) {
            console.error('Export failed:', error);
            this.showToast('Export failed: ' + error.message, 'error');
        }
    }

    /**
     * Update session status
     */
    updateSessionStatus(active) {
        if (active) {
            this.sessionStatus.className = 'status-indicator status-active';
            this.sessionStatusText.textContent = 'Active';
            this.startSessionBtn.disabled = true;
            this.generateSummaryBtn.disabled = false;
        } else {
            this.sessionStatus.className = 'status-indicator status-inactive';
            this.sessionStatusText.textContent = 'Not Active';
            this.startSessionBtn.disabled = false;
            this.generateSummaryBtn.disabled = true;
        }
    }

    /**
     * Show/hide progress
     */
    showProgress(show) {
        if (show) {
            this.progressCard.classList.add('active');
        } else {
            this.progressCard.classList.remove('active');
        }
    }

    /**
     * Update progress
     */
    updateProgress(percentage, step, details) {
        this.progressBar.style.width = percentage + '%';
        this.progressStep.textContent = step;
        this.progressDetails.textContent = details;
    }

    /**
     * Show loading spinner
     */
    showLoading(show) {
        this.loadingSpinner.style.display = show ? 'block' : 'none';
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

        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }
}

// Initialize automated summaries demo when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.automatedSummariesDemo = new AutomatedSummariesDemo();
});
