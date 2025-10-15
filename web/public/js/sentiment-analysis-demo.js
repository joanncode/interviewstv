/**
 * Real-time Sentiment Analysis Demo
 * Advanced emotion detection, mood tracking, and interview atmosphere assessment
 */

class SentimentAnalysisDemo {
    constructor() {
        this.currentSession = null;
        this.isSessionActive = false;
        this.analysisHistory = [];
        this.charts = {};
        this.demoData = null;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadDemoData();
        this.initializeCharts();
        this.updateThresholdDisplays();
    }

    bindEvents() {
        // Session control events
        document.getElementById('startSessionBtn').addEventListener('click', () => this.startSession());
        document.getElementById('stopSessionBtn').addEventListener('click', () => this.stopSession());
        document.getElementById('loadDemoDataBtn').addEventListener('click', () => this.loadDemoData());

        // Content analysis events
        document.getElementById('analyzeContentBtn').addEventListener('click', () => this.analyzeContent());
        document.getElementById('testSampleBtn').addEventListener('click', () => this.testWithSample());
        document.getElementById('clearContentBtn').addEventListener('click', () => this.clearContent());

        // Analytics events
        document.getElementById('refreshAnalyticsBtn').addEventListener('click', () => this.refreshAnalytics());
        document.getElementById('exportDataBtn').addEventListener('click', () => this.toggleExportOptions());
        document.getElementById('downloadExportBtn').addEventListener('click', () => this.downloadExport());

        // Threshold sliders
        document.getElementById('negativeThreshold').addEventListener('input', (e) => {
            document.getElementById('negativeThresholdValue').textContent = e.target.value;
        });
        
        document.getElementById('emotionThreshold').addEventListener('input', (e) => {
            document.getElementById('emotionThresholdValue').textContent = e.target.value;
        });

        // Content input events
        document.getElementById('contentInput').addEventListener('input', () => {
            const hasContent = document.getElementById('contentInput').value.trim().length > 0;
            document.getElementById('analyzeContentBtn').disabled = !hasContent || !this.isSessionActive;
        });
    }

    async loadDemoData() {
        try {
            const response = await fetch('/api/sentiment-analysis/demo-data');
            const result = await response.json();
            
            if (result.success) {
                this.demoData = result;
                this.displayDemoContent();
                this.showAlert('Demo data loaded successfully', 'success');
            } else {
                throw new Error(result.error || 'Failed to load demo data');
            }
        } catch (error) {
            console.error('Error loading demo data:', error);
            this.showAlert('Failed to load demo data: ' + error.message, 'danger');
        }
    }

    displayDemoContent() {
        if (!this.demoData || !this.demoData.demo_content) return;

        const container = document.getElementById('demoContentList');
        container.innerHTML = '';

        this.demoData.demo_content.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'demo-content-item';
            div.innerHTML = `
                <div class="small text-muted mb-1">Sample ${index + 1}</div>
                <div class="mb-2">${item.content.substring(0, 80)}...</div>
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted">Expected: ${item.expected_sentiment > 0 ? 'Positive' : item.expected_sentiment < 0 ? 'Negative' : 'Neutral'}</small>
                    <small class="text-muted">${item.content_type}</small>
                </div>
            `;
            
            div.addEventListener('click', () => {
                document.getElementById('contentInput').value = item.content;
                document.querySelectorAll('.demo-content-item').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                
                // Enable analyze button if session is active
                if (this.isSessionActive) {
                    document.getElementById('analyzeContentBtn').disabled = false;
                }
            });
            
            container.appendChild(div);
        });
    }

    async startSession() {
        try {
            const options = this.getSessionOptions();
            
            const response = await fetch('/api/sentiment-analysis/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    interview_id: document.getElementById('interviewId').value || 'demo_interview_001',
                    user_id: 1,
                    options: options
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.currentSession = result.session;
                this.isSessionActive = true;
                this.updateSessionUI(true);
                this.showAlert('Sentiment analysis session started successfully', 'success');
                
                // Show sections
                document.getElementById('resultsSection').style.display = 'block';
                document.getElementById('analyticsSection').style.display = 'block';
                document.getElementById('timelineSection').style.display = 'block';
                
            } else {
                throw new Error(result.error || 'Failed to start session');
            }
        } catch (error) {
            console.error('Error starting session:', error);
            this.showAlert('Failed to start session: ' + error.message, 'danger');
        }
    }

    async stopSession() {
        try {
            this.isSessionActive = false;
            this.currentSession = null;
            this.updateSessionUI(false);
            this.showAlert('Sentiment analysis session stopped', 'warning');
            
            // Hide sections
            document.getElementById('resultsSection').style.display = 'none';
            document.getElementById('analyticsSection').style.display = 'none';
            document.getElementById('timelineSection').style.display = 'none';
            
        } catch (error) {
            console.error('Error stopping session:', error);
            this.showAlert('Failed to stop session: ' + error.message, 'danger');
        }
    }

    getSessionOptions() {
        const aiModels = [];
        if (document.getElementById('openaiModel').checked) aiModels.push('openai_gpt4_sentiment');
        if (document.getElementById('azureModel').checked) aiModels.push('azure_text_analytics');
        if (document.getElementById('customModel').checked) aiModels.push('custom_emotion_detector');

        return {
            mode: document.getElementById('analysisMode').value,
            ai_models: aiModels,
            emotion_tracking: document.getElementById('emotionTracking').checked,
            mood_tracking: document.getElementById('moodTracking').checked,
            real_time_alerts: document.getElementById('realTimeAlerts').checked,
            sensitivity: document.getElementById('sensitivityLevel').value,
            language: document.getElementById('language').value,
            alert_thresholds: {
                negative_sentiment_threshold: parseFloat(document.getElementById('negativeThreshold').value),
                high_emotion_threshold: parseFloat(document.getElementById('emotionThreshold').value),
                low_confidence_threshold: 0.3,
                mood_change_threshold: 0.4,
                stress_threshold: 0.7
            }
        };
    }

    updateSessionUI(isActive) {
        document.getElementById('startSessionBtn').disabled = isActive;
        document.getElementById('stopSessionBtn').disabled = !isActive;
        document.getElementById('analyzeContentBtn').disabled = !isActive || !document.getElementById('contentInput').value.trim();
        
        const statusElement = document.getElementById('sessionStatus');
        const sessionInfo = document.getElementById('sessionInfo');
        
        if (isActive) {
            statusElement.textContent = 'Active';
            statusElement.className = 'session-status status-active';
            sessionInfo.style.display = 'block';
            document.getElementById('currentSessionId').textContent = this.currentSession?.session_id || 'Unknown';
        } else {
            statusElement.textContent = 'Not Started';
            statusElement.className = 'session-status status-pending';
            sessionInfo.style.display = 'none';
        }
    }

    async analyzeContent() {
        if (!this.isSessionActive || !this.currentSession) {
            this.showAlert('No active session. Please start a session first.', 'warning');
            return;
        }

        const content = document.getElementById('contentInput').value.trim();
        if (!content) {
            this.showAlert('Please enter content to analyze', 'warning');
            return;
        }

        try {
            this.showProcessing(true);
            
            const contentData = {
                content: content,
                participant_id: document.getElementById('participantId').value || 'participant_001',
                content_type: 'text',
                timestamp_ms: Date.now()
            };

            const response = await fetch(`/api/sentiment-analysis/sessions/${this.currentSession.session_id}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content_data: contentData })
            });

            const result = await response.json();
            
            if (result.success) {
                this.analysisHistory.push(result.analysis);
                this.displayAnalysisResult(result.analysis);
                this.handleAlert(result.alert);
                this.updateCharts();
                this.showAlert('Content analyzed successfully', 'success');
            } else {
                throw new Error(result.error || 'Analysis failed');
            }
        } catch (error) {
            console.error('Error analyzing content:', error);
            this.showAlert('Failed to analyze content: ' + error.message, 'danger');
        } finally {
            this.showProcessing(false);
        }
    }

    displayAnalysisResult(analysis) {
        // Update sentiment meter
        this.updateSentimentMeter(analysis.overall_sentiment);
        
        // Update scores
        document.getElementById('sentimentScore').textContent = analysis.overall_sentiment.toFixed(2);
        document.getElementById('confidenceScore').textContent = Math.round(analysis.confidence_score * 100) + '%';
        document.getElementById('emotionalIntensity').textContent = Math.round(analysis.emotional_intensity * 100) + '%';
        
        // Update dominant emotion
        document.getElementById('dominantEmotion').textContent = this.capitalizeFirst(analysis.dominant_emotion);
        this.updateEmotionIcon('dominantEmotionIcon', analysis.dominant_emotion);
        
        // Update mood classification
        document.getElementById('moodClassification').textContent = this.capitalizeFirst(analysis.mood_classification);
        this.updateMoodIcon('moodIcon', analysis.mood_classification);
        
        // Update emotion badges
        this.displayEmotionBadges(JSON.parse(analysis.emotions_data));
        
        // Update insights and recommendations
        this.updateInsights(analysis);
    }

    updateSentimentMeter(sentiment) {
        const indicator = document.getElementById('sentimentIndicator');
        // Convert sentiment (-1 to 1) to percentage (0 to 100)
        const percentage = ((sentiment + 1) / 2) * 100;
        indicator.style.left = percentage + '%';
    }

    updateEmotionIcon(elementId, emotion) {
        const element = document.getElementById(elementId);
        const emotionIcons = {
            joy: '😊', happiness: '😊', enthusiasm: '🤩', excitement: '🎉',
            sadness: '😢', frustration: '😤', anger: '😠',
            nervousness: '😰', anxiety: '😟', fear: '😨',
            surprise: '😲', determination: '💪', satisfaction: '😌',
            neutral: '😐', confidence: '😎'
        };
        
        element.textContent = emotionIcons[emotion] || '😐';
        
        // Update mood class
        element.className = element.className.replace(/mood-\w+/, '');
        if (['joy', 'happiness', 'enthusiasm', 'excitement', 'satisfaction', 'confidence'].includes(emotion)) {
            element.classList.add('mood-positive');
        } else if (['sadness', 'frustration', 'anger', 'nervousness', 'anxiety', 'fear'].includes(emotion)) {
            element.classList.add('mood-negative');
        } else {
            element.classList.add('mood-neutral');
        }
    }

    updateMoodIcon(elementId, mood) {
        const element = document.getElementById(elementId);
        const moodIcons = {
            positive: '😊',
            negative: '😞',
            neutral: '😐',
            mixed: '😕'
        };
        
        element.textContent = moodIcons[mood] || '😐';
        element.className = element.className.replace(/mood-\w+/, `mood-${mood}`);
    }

    displayEmotionBadges(emotions) {
        const container = document.getElementById('emotionBadges');
        container.innerHTML = '';
        
        Object.entries(emotions).forEach(([emotion, score]) => {
            if (score > 0.3) { // Only show significant emotions
                const badge = document.createElement('span');
                badge.className = `emotion-badge ${this.getEmotionClass(score)}`;
                badge.textContent = `${this.capitalizeFirst(emotion)} (${Math.round(score * 100)}%)`;
                container.appendChild(badge);
            }
        });
        
        if (container.children.length === 0) {
            container.innerHTML = '<span class="text-muted">No significant emotions detected</span>';
        }
    }

    getEmotionClass(score) {
        if (score > 0.7) return 'emotion-high';
        if (score > 0.4) return 'emotion-medium';
        return 'emotion-low';
    }

    handleAlert(alert) {
        if (!alert.triggered) return;
        
        const container = document.getElementById('alertsContainer');
        
        // Clear "no alerts" message
        if (container.querySelector('.text-muted')) {
            container.innerHTML = '';
        }
        
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert-item alert-${alert.severity}`;
        alertDiv.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <strong>${alert.type.replace('_', ' ').toUpperCase()}</strong>
                    <p class="mb-0">${alert.message}</p>
                </div>
                <small class="text-muted">${new Date().toLocaleTimeString()}</small>
            </div>
        `;
        
        container.insertBefore(alertDiv, container.firstChild);
        
        // Keep only last 5 alerts
        while (container.children.length > 5) {
            container.removeChild(container.lastChild);
        }
    }

    updateInsights(analysis) {
        const insights = [];
        
        if (analysis.overall_sentiment > 0.5) {
            insights.push('Strong positive sentiment detected');
        } else if (analysis.overall_sentiment < -0.3) {
            insights.push('Negative sentiment requires attention');
        }
        
        if (analysis.confidence_score > 0.8) {
            insights.push('High confidence in responses');
        } else if (analysis.confidence_score < 0.4) {
            insights.push('Low confidence detected');
        }
        
        if (analysis.emotional_intensity > 0.7) {
            insights.push('High emotional intensity observed');
        }
        
        const container = document.getElementById('keyInsights');
        container.innerHTML = insights.length > 0 
            ? insights.map(insight => `<li><i class="fas fa-info-circle me-2 text-info"></i>${insight}</li>`).join('')
            : '<li><i class="fas fa-info-circle me-2 text-info"></i>No significant insights detected</li>';
    }

    async testWithSample() {
        if (!this.demoData || !this.demoData.demo_content) {
            this.showAlert('Please load demo data first', 'warning');
            return;
        }
        
        const randomSample = this.demoData.demo_content[Math.floor(Math.random() * this.demoData.demo_content.length)];
        document.getElementById('contentInput').value = randomSample.content;
        
        if (this.isSessionActive) {
            await this.analyzeContent();
        } else {
            this.showAlert('Please start a session first to analyze content', 'warning');
        }
    }

    clearContent() {
        document.getElementById('contentInput').value = '';
        document.getElementById('analyzeContentBtn').disabled = true;
        document.querySelectorAll('.demo-content-item').forEach(el => el.classList.remove('selected'));
    }

    async refreshAnalytics() {
        if (!this.currentSession) {
            this.showAlert('No active session to analyze', 'warning');
            return;
        }

        try {
            const response = await fetch(`/api/sentiment-analysis/sessions/${this.currentSession.session_id}/analytics`);
            const result = await response.json();

            if (result.success) {
                this.updateAnalyticsDisplay(result);
                this.showAlert('Analytics refreshed successfully', 'success');
            } else {
                throw new Error(result.error || 'Failed to get analytics');
            }
        } catch (error) {
            console.error('Error refreshing analytics:', error);
            this.showAlert('Failed to refresh analytics: ' + error.message, 'danger');
        }
    }

    updateAnalyticsDisplay(analytics) {
        // Update statistics
        document.getElementById('totalAnalyses').textContent = analytics.statistics.total_analyses;
        document.getElementById('avgSentiment').textContent = analytics.statistics.avg_sentiment.toFixed(2);
        document.getElementById('avgConfidence').textContent = Math.round(analytics.statistics.avg_confidence * 100) + '%';
        document.getElementById('alertsTriggered').textContent = analytics.statistics.alerts_triggered;

        // Update charts with new data
        this.updateChartsWithData(analytics);
    }

    initializeCharts() {
        // Sentiment Timeline Chart
        const sentimentCtx = document.getElementById('sentimentChart').getContext('2d');
        this.charts.sentiment = new Chart(sentimentCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Sentiment Score',
                    data: [],
                    borderColor: '#FF0000',
                    backgroundColor: 'rgba(255, 0, 0, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#ffffff' }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#cccccc' },
                        grid: { color: '#444444' }
                    },
                    y: {
                        min: -1,
                        max: 1,
                        ticks: { color: '#cccccc' },
                        grid: { color: '#444444' }
                    }
                }
            }
        });

        // Emotion Distribution Chart
        const emotionCtx = document.getElementById('emotionChart').getContext('2d');
        this.charts.emotion = new Chart(emotionCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#FF0000', '#FF6B6B', '#4ECDC4', '#45B7D1',
                        '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#ffffff' }
                    }
                }
            }
        });
    }

    updateCharts() {
        if (this.analysisHistory.length === 0) return;

        // Update sentiment timeline
        const sentimentData = this.analysisHistory.map((analysis, index) => ({
            x: index + 1,
            y: analysis.overall_sentiment
        }));

        this.charts.sentiment.data.labels = sentimentData.map((_, index) => `Analysis ${index + 1}`);
        this.charts.sentiment.data.datasets[0].data = sentimentData.map(d => d.y);
        this.charts.sentiment.update();

        // Update emotion distribution
        const emotionCounts = {};
        this.analysisHistory.forEach(analysis => {
            const emotions = JSON.parse(analysis.emotions_data);
            Object.entries(emotions).forEach(([emotion, score]) => {
                if (score > 0.3) {
                    emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
                }
            });
        });

        this.charts.emotion.data.labels = Object.keys(emotionCounts);
        this.charts.emotion.data.datasets[0].data = Object.values(emotionCounts);
        this.charts.emotion.update();
    }

    updateChartsWithData(analytics) {
        // This would be called when refreshing analytics from server
        // For now, we'll use the local analysis history
        this.updateCharts();
    }

    toggleExportOptions() {
        const exportOptions = document.getElementById('exportOptions');
        exportOptions.classList.toggle('show');
    }

    async downloadExport() {
        if (!this.currentSession) {
            this.showAlert('No active session to export', 'warning');
            return;
        }

        try {
            const format = document.getElementById('exportFormat').value;
            const includeAnalytics = document.getElementById('exportAnalytics').checked;
            const includeTimeline = document.getElementById('exportTimeline').checked;
            const includeAlerts = document.getElementById('exportAlerts').checked;

            // For demo purposes, create export data from local history
            const exportData = {
                session_id: this.currentSession.session_id,
                export_timestamp: new Date().toISOString(),
                format: format,
                data: {}
            };

            if (includeAnalytics) {
                exportData.data.analytics = {
                    total_analyses: this.analysisHistory.length,
                    avg_sentiment: this.analysisHistory.reduce((sum, a) => sum + a.overall_sentiment, 0) / this.analysisHistory.length,
                    sentiment_range: {
                        min: Math.min(...this.analysisHistory.map(a => a.overall_sentiment)),
                        max: Math.max(...this.analysisHistory.map(a => a.overall_sentiment))
                    }
                };
            }

            if (includeTimeline) {
                exportData.data.timeline = this.analysisHistory;
            }

            if (includeAlerts) {
                exportData.data.alerts = this.analysisHistory.filter(a => a.alert_triggered);
            }

            // Download the export
            this.downloadFile(exportData, `sentiment_analysis_export_${Date.now()}.${format}`);
            this.showAlert('Export downloaded successfully', 'success');

        } catch (error) {
            console.error('Error exporting data:', error);
            this.showAlert('Failed to export data: ' + error.message, 'danger');
        }
    }

    downloadFile(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showProcessing(show) {
        const indicator = document.getElementById('processingIndicator');
        indicator.style.display = show ? 'block' : 'none';
    }

    showAlert(message, type = 'info') {
        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        // Insert at top of container
        const container = document.querySelector('.container');
        container.insertBefore(alertDiv, container.firstChild);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    updateThresholdDisplays() {
        document.getElementById('negativeThresholdValue').textContent = document.getElementById('negativeThreshold').value;
        document.getElementById('emotionThresholdValue').textContent = document.getElementById('emotionThreshold').value;
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Initialize the demo when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new SentimentAnalysisDemo();
});
