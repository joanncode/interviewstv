/**
 * AI Content Moderation Demo
 * Real-time content analysis and moderation demonstration
 */
class ContentModerationDemo {
    constructor() {
        this.sessionId = null;
        this.sessionActive = false;
        this.demoData = null;
        this.metrics = {
            totalAnalyzed: 0,
            violationsDetected: 0,
            actionsTaken: 0,
            avgProcessingTime: 0,
            avgConfidence: 0,
            violationRate: 0
        };
        
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
        this.moderationModeSelect = document.getElementById('moderation-mode');
        this.sensitivityLevelSelect = document.getElementById('sensitivity-level');
        this.autoActionCheckbox = document.getElementById('auto-action');
        this.realTimeCheckbox = document.getElementById('real-time');
        this.startSessionBtn = document.getElementById('start-session-btn');
        this.stopSessionBtn = document.getElementById('stop-session-btn');
        
        // Status indicators
        this.sessionStatus = document.getElementById('session-status');
        this.sessionStatusText = document.getElementById('session-status-text');
        
        // Content analysis
        this.contentInput = document.getElementById('content-input');
        this.contentTypeSelect = document.getElementById('content-type');
        this.contentIdInput = document.getElementById('content-id');
        this.analyzeContentBtn = document.getElementById('analyze-content-btn');
        this.batchAnalyzeBtn = document.getElementById('batch-analyze-btn');
        
        // AI models and options
        this.aiModelsList = document.getElementById('ai-models-list');
        this.multiModelCheckbox = document.getElementById('multi-model');
        this.cacheResultsCheckbox = document.getElementById('cache-results');
        this.userNotificationsCheckbox = document.getElementById('user-notifications');
        this.loadDemoDataBtn = document.getElementById('load-demo-data-btn');
        
        // Results
        this.resultsCard = document.getElementById('results-card');
        this.processingTime = document.getElementById('processing-time');
        this.scoreGrid = document.getElementById('score-grid');
        this.actionResult = document.getElementById('action-result');
        this.aiModelResults = document.getElementById('ai-model-results');
        
        // Test samples
        this.testSamples = document.getElementById('test-samples');
        
        // Metrics
        this.totalAnalyzedCounter = document.getElementById('total-analyzed');
        this.violationsDetectedCounter = document.getElementById('violations-detected');
        this.actionsTakenCounter = document.getElementById('actions-taken');
        this.avgProcessingTimeCounter = document.getElementById('avg-processing-time');
        this.avgConfidenceCounter = document.getElementById('avg-confidence');
        this.violationRateCounter = document.getElementById('violation-rate');
        
        // Rules and log
        this.rulesList = document.getElementById('rules-list');
        this.moderationLog = document.getElementById('moderation-log');
        this.clearLogBtn = document.getElementById('clear-log-btn');
        
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
        this.stopSessionBtn.addEventListener('click', () => this.stopSession());
        this.analyzeContentBtn.addEventListener('click', () => this.analyzeContent());
        this.batchAnalyzeBtn.addEventListener('click', () => this.batchAnalyzeContent());
        this.loadDemoDataBtn.addEventListener('click', () => this.loadDemoData());
        this.clearLogBtn.addEventListener('click', () => this.clearLog());
        
        // Auto-generate content ID when content changes
        this.contentInput.addEventListener('input', () => {
            if (!this.contentIdInput.value) {
                this.contentIdInput.value = 'content_' + Date.now();
            }
        });
    }

    /**
     * Load demo data from API
     */
    async loadDemoData() {
        try {
            this.showLoading(true);
            
            const response = await fetch('/interviews-tv/api/content-moderation/demo-data');
            const data = await response.json();
            
            if (data.success) {
                this.demoData = data;
                this.populateAIModels(data.ai_models);
                this.populateTestSamples(data.demo_content);
                this.populateModerationRules(data.moderation_rules);
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
            badge.dataset.modelId = model.config_id;
            
            badge.addEventListener('click', () => {
                badge.classList.toggle('enabled');
            });
            
            this.aiModelsList.appendChild(badge);
        });
    }

    /**
     * Populate test samples
     */
    populateTestSamples(demoContent) {
        this.testSamples.innerHTML = '';
        
        demoContent.forEach((sample, index) => {
            const button = document.createElement('button');
            button.className = 'sample-button';
            button.innerHTML = `
                <div>${sample.content}</div>
                <div class="sample-expected">Expected: ${sample.expected_action}</div>
            `;
            
            button.addEventListener('click', () => {
                this.contentInput.value = sample.content;
                this.contentTypeSelect.value = sample.type;
                this.contentIdInput.value = `sample_${index}_${Date.now()}`;
                
                if (this.sessionActive) {
                    this.analyzeContent();
                }
            });
            
            this.testSamples.appendChild(button);
        });
    }

    /**
     * Populate moderation rules
     */
    populateModerationRules(rules) {
        this.rulesList.innerHTML = '';
        
        rules.forEach(rule => {
            const ruleItem = document.createElement('div');
            ruleItem.className = 'rule-item';
            ruleItem.innerHTML = `
                <div class="rule-name">${rule.rule_name}</div>
                <div class="rule-description">${rule.description || 'No description available'}</div>
                <div class="rule-details">
                    Type: ${rule.rule_type} | Priority: ${rule.priority} | 
                    Threshold: ${rule.threshold_score} | 
                    Status: ${rule.enabled ? 'Enabled' : 'Disabled'}
                </div>
            `;
            
            this.rulesList.appendChild(ruleItem);
        });
    }

    /**
     * Start moderation session
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
                interview_id: this.interviewIdInput.value.trim() || 'demo_interview_moderation',
                user_id: 1, // Demo user
                options: {
                    mode: this.moderationModeSelect.value,
                    sensitivity: this.sensitivityLevelSelect.value,
                    auto_action: this.autoActionCheckbox.checked,
                    real_time: this.realTimeCheckbox.checked,
                    ai_models: enabledModels,
                    settings: {
                        multi_model_analysis: this.multiModelCheckbox.checked,
                        cache_results: this.cacheResultsCheckbox.checked,
                        user_notifications: this.userNotificationsCheckbox.checked
                    }
                }
            };
            
            const response = await fetch('/interviews-tv/api/content-moderation/sessions', {
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
                this.addLogEntry('Moderation session started successfully', 'success');
                this.showToast('Content moderation session started', 'success');
                
            } else {
                throw new Error(data.error || 'Failed to start session');
            }
            
        } catch (error) {
            console.error('Failed to start session:', error);
            this.addLogEntry(`Failed to start session: ${error.message}`, 'error');
            this.showToast('Failed to start session: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Stop moderation session
     */
    async stopSession() {
        try {
            if (!this.sessionId) return;
            
            const response = await fetch(`/interviews-tv/api/content-moderation/sessions/${this.sessionId}/stop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.sessionActive = false;
                this.sessionId = null;
                
                // Update UI
                this.updateSessionStatus(false);
                this.addLogEntry('Moderation session stopped', 'info');
                this.showToast('Content moderation session stopped', 'info');
                
                // Display final statistics
                if (data.final_statistics) {
                    this.updateMetrics(data.final_statistics);
                }
                
            } else {
                throw new Error(data.error || 'Failed to stop session');
            }
            
        } catch (error) {
            console.error('Failed to stop session:', error);
            this.addLogEntry(`Failed to stop session: ${error.message}`, 'error');
            this.showToast('Failed to stop session: ' + error.message, 'error');
        }
    }

    /**
     * Analyze content
     */
    async analyzeContent() {
        try {
            if (!this.sessionActive || !this.sessionId) {
                this.showToast('Please start a session first', 'warning');
                return;
            }
            
            const content = this.contentInput.value.trim();
            if (!content) {
                this.showToast('Please enter content to analyze', 'warning');
                return;
            }
            
            this.showLoading(true);
            this.sessionStatus.className = 'status-indicator status-processing';
            
            const contentData = {
                content_data: {
                    content: content,
                    type: this.contentTypeSelect.value,
                    content_id: this.contentIdInput.value || `content_${Date.now()}`,
                    metadata: {
                        timestamp: new Date().toISOString(),
                        source: 'demo_interface'
                    }
                }
            };
            
            const response = await fetch(`/interviews-tv/api/content-moderation/sessions/${this.sessionId}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(contentData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.displayAnalysisResults(data.analysis);
                this.updateSessionMetrics();
                this.addLogEntry(`Content analyzed: "${content.substring(0, 50)}..."`, 'analysis', data.analysis);
                this.showToast('Content analysis completed', 'success');
            } else {
                throw new Error(data.error || 'Analysis failed');
            }
            
        } catch (error) {
            console.error('Content analysis failed:', error);
            this.addLogEntry(`Analysis failed: ${error.message}`, 'error');
            this.showToast('Content analysis failed: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
            this.sessionStatus.className = 'status-indicator status-active';
        }
    }

    /**
     * Batch analyze multiple content items
     */
    async batchAnalyzeContent() {
        try {
            if (!this.sessionActive || !this.sessionId) {
                this.showToast('Please start a session first', 'warning');
                return;
            }

            if (!this.demoData || !this.demoData.demo_content) {
                this.showToast('Please load demo data first', 'warning');
                return;
            }

            this.showLoading(true);

            const contentItems = this.demoData.demo_content.map((sample, index) => ({
                content: sample.content,
                type: sample.type,
                content_id: `batch_${index}_${Date.now()}`,
                metadata: {
                    expected_action: sample.expected_action,
                    batch_index: index
                }
            }));

            const response = await fetch(`/interviews-tv/api/content-moderation/sessions/${this.sessionId}/batch-analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content_items: contentItems })
            });

            const data = await response.json();

            if (data.success) {
                this.displayBatchResults(data.batch_results);
                this.updateSessionMetrics();
                this.addLogEntry(`Batch analysis completed: ${data.total_processed} items`, 'batch');
                this.showToast(`Batch analysis completed: ${data.total_processed} items`, 'success');
            } else {
                throw new Error(data.error || 'Batch analysis failed');
            }

        } catch (error) {
            console.error('Batch analysis failed:', error);
            this.addLogEntry(`Batch analysis failed: ${error.message}`, 'error');
            this.showToast('Batch analysis failed: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Display analysis results
     */
    displayAnalysisResults(analysis) {
        // Show results card
        this.resultsCard.style.display = 'block';

        // Display processing time
        this.processingTime.textContent = `${analysis.processing_time_ms}ms`;

        // Display scores
        this.displayScores(analysis.scores);

        // Display action result
        this.displayActionResult(analysis.final_action);

        // Display AI model results
        this.displayAIModelResults(analysis.ai_analysis);

        // Scroll to results
        this.resultsCard.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Display AI analysis scores
     */
    displayScores(scores) {
        this.scoreGrid.innerHTML = '';

        const scoreTypes = [
            { key: 'toxicity', label: 'Toxicity', icon: 'fas fa-exclamation-triangle' },
            { key: 'profanity', label: 'Profanity', icon: 'fas fa-comment-slash' },
            { key: 'hate_speech', label: 'Hate Speech', icon: 'fas fa-ban' },
            { key: 'harassment', label: 'Harassment', icon: 'fas fa-user-slash' },
            { key: 'threat', label: 'Threats', icon: 'fas fa-fist-raised' },
            { key: 'spam', label: 'Spam', icon: 'fas fa-envelope-open-text' },
            { key: 'adult_content', label: 'Adult Content', icon: 'fas fa-eye-slash' },
            { key: 'violence', label: 'Violence', icon: 'fas fa-hand-rock' },
            { key: 'overall_risk', label: 'Overall Risk', icon: 'fas fa-shield-alt' },
            { key: 'confidence', label: 'Confidence', icon: 'fas fa-check-circle' }
        ];

        scoreTypes.forEach(scoreType => {
            const score = scores[scoreType.key] || 0;
            const percentage = Math.round(score * 100);
            const severity = this.getScoreSeverity(score);

            const scoreCard = document.createElement('div');
            scoreCard.className = `score-card score-${severity}`;
            scoreCard.innerHTML = `
                <i class="${scoreType.icon}"></i>
                <div class="score-value">${percentage}%</div>
                <div class="score-label">${scoreType.label}</div>
                <div class="score-bar">
                    <div class="score-fill" style="width: ${percentage}%"></div>
                </div>
            `;

            this.scoreGrid.appendChild(scoreCard);
        });
    }

    /**
     * Get score severity level
     */
    getScoreSeverity(score) {
        if (score >= 0.8) return 'critical';
        if (score >= 0.6) return 'high';
        if (score >= 0.3) return 'medium';
        return 'low';
    }

    /**
     * Display action result
     */
    displayActionResult(finalAction) {
        const actionIcons = {
            'allow': 'fas fa-check-circle',
            'warn': 'fas fa-exclamation-triangle',
            'filter': 'fas fa-filter',
            'block': 'fas fa-ban',
            'quarantine': 'fas fa-pause-circle',
            'escalate': 'fas fa-arrow-up'
        };

        const action = finalAction.action || 'allow';
        const icon = actionIcons[action] || 'fas fa-question-circle';

        this.actionResult.className = `action-result action-${action}`;
        this.actionResult.innerHTML = `
            <div>
                <i class="${icon} action-icon"></i>
                <strong>Action: ${action.toUpperCase()}</strong>
            </div>
            <div>Reason: ${finalAction.reason || 'No specific reason'}</div>
            <div>Confidence: ${Math.round((finalAction.confidence || 0) * 100)}%</div>
            <div>Severity: ${finalAction.severity || 'low'}</div>
        `;
    }

    /**
     * Display AI model results
     */
    displayAIModelResults(aiAnalysis) {
        this.aiModelResults.innerHTML = '';

        Object.entries(aiAnalysis).forEach(([modelId, result]) => {
            const modelCard = document.createElement('div');
            modelCard.className = 'card mb-2';
            modelCard.style.background = '#444';
            modelCard.style.border = '1px solid #666';

            const success = result.success ? 'text-success' : 'text-danger';
            const processingTime = result.processing_time_ms || 0;

            modelCard.innerHTML = `
                <div class="card-body p-3">
                    <h6 class="card-title">
                        <i class="fas fa-brain"></i> ${result.model || modelId}
                        <span class="badge bg-secondary ms-2">${result.provider || 'unknown'}</span>
                        <span class="badge ${success} ms-2">${result.success ? 'Success' : 'Failed'}</span>
                    </h6>
                    ${result.success ? `
                        <div class="row">
                            <div class="col-md-8">
                                <small>Top Scores:</small>
                                <div class="d-flex flex-wrap gap-2">
                                    ${this.getTopScores(result.scores || {}).map(score =>
                                        `<span class="badge bg-warning">${score.label}: ${score.value}%</span>`
                                    ).join('')}
                                </div>
                            </div>
                            <div class="col-md-4 text-end">
                                <small>Confidence: ${Math.round((result.confidence || 0) * 100)}%</small><br>
                                <small>Time: ${processingTime}ms</small>
                            </div>
                        </div>
                    ` : `
                        <div class="text-danger">
                            <small>Error: ${result.error || 'Unknown error'}</small>
                        </div>
                    `}
                </div>
            `;

            this.aiModelResults.appendChild(modelCard);
        });
    }

    /**
     * Get top scores from AI model result
     */
    getTopScores(scores) {
        const scoreEntries = Object.entries(scores)
            .map(([key, value]) => ({
                key,
                label: key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                value: Math.round(value * 100)
            }))
            .filter(score => score.value > 10)
            .sort((a, b) => b.value - a.value)
            .slice(0, 3);

        return scoreEntries;
    }

    /**
     * Display batch analysis results
     */
    displayBatchResults(batchResults) {
        this.resultsCard.style.display = 'block';

        // Create batch results summary
        const summary = document.createElement('div');
        summary.className = 'alert alert-info';
        summary.innerHTML = `
            <h6><i class="fas fa-layer-group"></i> Batch Analysis Summary</h6>
            <p>Processed ${batchResults.length} content items</p>
        `;

        // Clear previous results and add summary
        this.scoreGrid.innerHTML = '';
        this.scoreGrid.appendChild(summary);

        // Calculate aggregate scores
        const aggregateScores = this.calculateAggregateScores(batchResults);
        this.displayScores(aggregateScores);

        // Display individual results
        const resultsContainer = document.createElement('div');
        resultsContainer.innerHTML = '<h6><i class="fas fa-list"></i> Individual Results</h6>';

        batchResults.forEach((item, index) => {
            if (item.result.success) {
                const analysis = item.result.analysis;
                const action = analysis.final_action?.action || 'allow';
                const riskScore = Math.round((analysis.scores?.overall_risk || 0) * 100);

                const itemResult = document.createElement('div');
                itemResult.className = `action-result action-${action} mb-2`;
                itemResult.innerHTML = `
                    <div><strong>Item ${index + 1}:</strong> ${item.content_id}</div>
                    <div>Action: ${action.toUpperCase()} | Risk: ${riskScore}%</div>
                `;

                resultsContainer.appendChild(itemResult);
            }
        });

        this.actionResult.innerHTML = '';
        this.actionResult.appendChild(resultsContainer);

        // Scroll to results
        this.resultsCard.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Calculate aggregate scores from batch results
     */
    calculateAggregateScores(batchResults) {
        const validResults = batchResults.filter(item => item.result.success);
        if (validResults.length === 0) {
            return {};
        }

        const scoreTypes = ['toxicity', 'profanity', 'hate_speech', 'harassment', 'threat', 'spam', 'adult_content', 'violence', 'overall_risk', 'confidence'];
        const aggregateScores = {};

        scoreTypes.forEach(scoreType => {
            const scores = validResults
                .map(item => item.result.analysis.scores?.[scoreType] || 0)
                .filter(score => score !== undefined);

            if (scores.length > 0) {
                aggregateScores[scoreType] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
            } else {
                aggregateScores[scoreType] = 0;
            }
        });

        return aggregateScores;
    }

    /**
     * Update session metrics
     */
    async updateSessionMetrics() {
        try {
            if (!this.sessionId) return;

            const response = await fetch(`/interviews-tv/api/content-moderation/sessions/${this.sessionId}/analytics`);
            const data = await response.json();

            if (data.success) {
                const stats = data.statistics;
                const metrics = data.metrics;

                this.metrics = {
                    totalAnalyzed: stats.total_analyzed || 0,
                    violationsDetected: stats.violations_detected || 0,
                    actionsTaken: stats.actions_taken || 0,
                    avgProcessingTime: metrics.avg_processing_time_ms || 0,
                    avgConfidence: metrics.avg_confidence || 0,
                    violationRate: metrics.violation_rate_percent || 0
                };

                this.updateMetricsDisplay();
            }

        } catch (error) {
            console.error('Failed to update metrics:', error);
        }
    }

    /**
     * Update metrics display
     */
    updateMetricsDisplay() {
        this.totalAnalyzedCounter.textContent = this.metrics.totalAnalyzed;
        this.violationsDetectedCounter.textContent = this.metrics.violationsDetected;
        this.actionsTakenCounter.textContent = this.metrics.actionsTaken;
        this.avgProcessingTimeCounter.textContent = Math.round(this.metrics.avgProcessingTime) + 'ms';
        this.avgConfidenceCounter.textContent = Math.round(this.metrics.avgConfidence) + '%';
        this.violationRateCounter.textContent = Math.round(this.metrics.violationRate) + '%';
    }

    /**
     * Update session status
     */
    updateSessionStatus(active) {
        if (active) {
            this.sessionStatus.className = 'status-indicator status-active';
            this.sessionStatusText.textContent = 'Active';
            this.startSessionBtn.disabled = true;
            this.stopSessionBtn.disabled = false;
            this.analyzeContentBtn.disabled = false;
            this.batchAnalyzeBtn.disabled = false;
        } else {
            this.sessionStatus.className = 'status-indicator status-inactive';
            this.sessionStatusText.textContent = 'Not Active';
            this.startSessionBtn.disabled = false;
            this.stopSessionBtn.disabled = true;
            this.analyzeContentBtn.disabled = true;
            this.batchAnalyzeBtn.disabled = true;
        }
    }

    /**
     * Add log entry
     */
    addLogEntry(message, type = 'info', analysisData = null) {
        const timestamp = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = 'log-entry';

        let content = `
            <div class="log-timestamp">${timestamp}</div>
            <div class="log-action">${message}</div>
        `;

        if (analysisData) {
            const action = analysisData.final_action?.action || 'allow';
            const riskScore = Math.round((analysisData.scores?.overall_risk || 0) * 100);
            const confidence = Math.round((analysisData.scores?.confidence || 0) * 100);

            content += `
                <div class="log-content">"${analysisData.content_text?.substring(0, 100)}..."</div>
                <div class="log-action">Action: ${action.toUpperCase()}</div>
                <div class="log-scores">Risk: ${riskScore}% | Confidence: ${confidence}% | Time: ${analysisData.processing_time_ms}ms</div>
            `;
        }

        entry.innerHTML = content;
        this.moderationLog.insertBefore(entry, this.moderationLog.firstChild);

        // Keep only last 50 entries
        const entries = this.moderationLog.querySelectorAll('.log-entry');
        if (entries.length > 50) {
            entries[entries.length - 1].remove();
        }
    }

    /**
     * Clear log
     */
    clearLog() {
        this.moderationLog.innerHTML = '<div class="log-entry"><div class="log-timestamp">Log cleared</div></div>';
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

// Initialize content moderation demo when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.contentModerationDemo = new ContentModerationDemo();
});
