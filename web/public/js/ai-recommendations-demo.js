/**
 * AI Interview Recommendations Demo
 * Interactive demo for AI-powered interview recommendations system
 */

class AIRecommendationsDemo {
    constructor() {
        this.currentSessionId = null;
        this.currentRecommendationId = null;
        this.recommendations = [];
        this.categoryChart = null;
        this.apiBaseUrl = '/api/ai-recommendations';
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadDemoData();
    }

    bindEvents() {
        // Session control buttons
        document.getElementById('startSessionBtn').addEventListener('click', () => this.startSession());
        document.getElementById('generateRecommendationsBtn').addEventListener('click', () => this.generateRecommendations());
        document.getElementById('testDemoBtn').addEventListener('click', () => this.testWithDemoData());
        
        // Filter events
        document.getElementById('categoryFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('priorityFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('typeFilter').addEventListener('change', () => this.applyFilters());
        
        // Feedback events
        document.getElementById('provideFeedbackBtn').addEventListener('click', () => this.showFeedbackModal());
        document.getElementById('submitFeedbackBtn').addEventListener('click', () => this.submitFeedback());
    }

    async loadDemoData() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/demo-data`);
            const data = await response.json();
            
            if (data.success) {
                console.log('Demo data loaded:', data);
                this.showAlert('Demo data loaded successfully', 'info');
            }
        } catch (error) {
            console.error('Error loading demo data:', error);
            this.showAlert('Failed to load demo data', 'danger');
        }
    }

    async startSession() {
        const btn = document.getElementById('startSessionBtn');
        const spinner = btn.querySelector('.loading-spinner');
        
        try {
            this.setButtonLoading(btn, true);
            
            const sessionData = {
                interview_id: 'demo_interview_' + Date.now(),
                user_id: 1,
                options: {
                    type: document.getElementById('recommendationType').value,
                    analysis_depth: document.getElementById('analysisDepth').value,
                    industry: document.getElementById('industryContext').value,
                    role: document.getElementById('roleContext').value,
                    experience_level: document.getElementById('experienceLevel').value,
                    ai_models: ['openai_gpt4_interview_advisor', 'custom_interview_coach'],
                    focus_areas: ['communication', 'technical_skills', 'cultural_fit']
                }
            };

            const response = await fetch(`${this.apiBaseUrl}/sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(sessionData)
            });

            const result = await response.json();

            if (result.success) {
                this.currentSessionId = result.session.session_id;
                this.updateSessionStatus('processing', 'Session Started');
                document.getElementById('generateRecommendationsBtn').disabled = false;
                this.showAlert('AI session started successfully!', 'success');
            } else {
                throw new Error(result.error || 'Failed to start session');
            }

        } catch (error) {
            console.error('Error starting session:', error);
            this.showAlert('Failed to start session: ' + error.message, 'danger');
        } finally {
            this.setButtonLoading(btn, false);
        }
    }

    async generateRecommendations() {
        if (!this.currentSessionId) {
            this.showAlert('Please start a session first', 'warning');
            return;
        }

        const btn = document.getElementById('generateRecommendationsBtn');
        
        try {
            this.setButtonLoading(btn, true);
            this.updateSessionStatus('processing', 'Generating Recommendations');

            // Sample interview data for demo
            const interviewData = {
                transcription: "Interviewer: Tell me about your experience with React. Candidate: I've been working with React for about 3 years now. I started with class components and then transitioned to hooks. I really enjoy the component-based architecture and how it makes code reusable. I've built several applications including an e-commerce platform and a dashboard for analytics. I'm also familiar with Redux for state management and have experience with testing using Jest and React Testing Library.",
                duration_minutes: 45,
                participant_count: 2,
                questions: [
                    'Tell me about your experience with React',
                    'How do you handle state management in large applications?',
                    'Describe a challenging project you worked on',
                    'How do you approach testing in React?'
                ],
                sentiment_analysis: {
                    overall_sentiment: 0.7,
                    confidence_level: 0.8,
                    enthusiasm: 0.9,
                    nervousness: 0.3
                },
                engagement_metrics: {
                    speaking_time_ratio: 0.6,
                    response_completeness: 0.8,
                    technical_depth: 0.7
                }
            };

            const response = await fetch(`${this.apiBaseUrl}/sessions/${this.currentSessionId}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ interview_data: interviewData })
            });

            const result = await response.json();

            if (result.success) {
                this.recommendations = result.recommendations;
                this.updateSessionStatus('completed', 'Recommendations Generated');
                this.displayRecommendations(this.recommendations);
                this.updateAnalytics(result.statistics);
                this.showAlert(`Generated ${result.statistics.total_recommendations} recommendations successfully!`, 'success');
                
                // Show export options
                document.getElementById('exportOptions').style.display = 'flex';
                document.getElementById('filterOptions').style.display = 'flex';
            } else {
                throw new Error(result.error || 'Failed to generate recommendations');
            }

        } catch (error) {
            console.error('Error generating recommendations:', error);
            this.updateSessionStatus('failed', 'Generation Failed');
            this.showAlert('Failed to generate recommendations: ' + error.message, 'danger');
        } finally {
            this.setButtonLoading(btn, false);
        }
    }

    async testWithDemoData() {
        const btn = document.getElementById('testDemoBtn');
        
        try {
            this.setButtonLoading(btn, true);
            this.updateSessionStatus('processing', 'Running Demo Test');

            const response = await fetch(`${this.apiBaseUrl}/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();

            if (result.success) {
                this.currentSessionId = result.session_id;
                this.recommendations = result.recommendations.recommendations;
                this.updateSessionStatus('completed', 'Demo Test Completed');
                this.displayRecommendations(this.recommendations);
                this.updateAnalytics(result.recommendations.statistics);
                this.showAlert('Demo test completed successfully!', 'success');
                
                // Enable buttons and show options
                document.getElementById('generateRecommendationsBtn').disabled = false;
                document.getElementById('exportOptions').style.display = 'flex';
                document.getElementById('filterOptions').style.display = 'flex';
            } else {
                throw new Error(result.error || 'Demo test failed');
            }

        } catch (error) {
            console.error('Error running demo test:', error);
            this.updateSessionStatus('failed', 'Demo Test Failed');
            this.showAlert('Demo test failed: ' + error.message, 'danger');
        } finally {
            this.setButtonLoading(btn, false);
        }
    }

    displayRecommendations(recommendations) {
        const container = document.getElementById('recommendationsContainer');
        
        if (!recommendations || recommendations.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="fas fa-robot fa-3x mb-3"></i>
                    <h5>No Recommendations Found</h5>
                    <p>Try generating recommendations with different settings.</p>
                </div>
            `;
            return;
        }

        const recommendationsHtml = recommendations.map(rec => this.createRecommendationCard(rec)).join('');
        container.innerHTML = recommendationsHtml;
    }

    createRecommendationCard(recommendation) {
        const priorityClass = `priority-${recommendation.priority_level}`;
        const priorityBadge = this.getPriorityBadge(recommendation.priority_level);
        const categoryBadge = this.getCategoryBadge(recommendation.category);
        const confidencePercentage = Math.round(recommendation.confidence_score * 100);
        const impactPercentage = Math.round(recommendation.impact_score * 100);

        return `
            <div class="card recommendation-card ${priorityClass}" data-recommendation-id="${recommendation.recommendation_id}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            ${categoryBadge}
                            ${priorityBadge}
                        </div>
                        <div class="text-end">
                            <small class="text-muted">Confidence: ${confidencePercentage}%</small>
                            <div class="confidence-bar mt-1" style="width: 80px;">
                                <div class="confidence-fill" style="width: ${confidencePercentage}%"></div>
                            </div>
                        </div>
                    </div>
                    
                    <h6 class="card-title">${recommendation.title}</h6>
                    <p class="card-text">${recommendation.description}</p>
                    
                    <div class="row text-center mb-3">
                        <div class="col-4">
                            <small class="text-muted">Impact</small>
                            <div class="fw-bold">${impactPercentage}%</div>
                        </div>
                        <div class="col-4">
                            <small class="text-muted">Effort</small>
                            <div class="fw-bold">${this.capitalizeFirst(recommendation.effort_required)}</div>
                        </div>
                        <div class="col-4">
                            <small class="text-muted">Timeline</small>
                            <div class="fw-bold">${this.formatTimeline(recommendation.timeline_suggestion)}</div>
                        </div>
                    </div>
                    
                    <div class="recommendation-actions">
                        <button class="btn btn-outline-primary btn-sm" onclick="aiRecommendationsDemo.viewRecommendationDetails('${recommendation.recommendation_id}')">
                            <i class="fas fa-eye me-1"></i>View Details
                        </button>
                        <button class="btn btn-outline-success btn-sm" onclick="aiRecommendationsDemo.markAsImplemented('${recommendation.recommendation_id}')">
                            <i class="fas fa-check me-1"></i>Mark Implemented
                        </button>
                        <button class="btn btn-outline-info btn-sm" onclick="aiRecommendationsDemo.provideFeedback('${recommendation.recommendation_id}')">
                            <i class="fas fa-comment me-1"></i>Feedback
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getPriorityBadge(priority) {
        const badges = {
            critical: '<span class="badge bg-danger">Critical</span>',
            high: '<span class="badge bg-warning">High</span>',
            medium: '<span class="badge bg-info">Medium</span>',
            low: '<span class="badge bg-success">Low</span>'
        };
        return badges[priority] || '<span class="badge bg-secondary">Unknown</span>';
    }

    getCategoryBadge(category) {
        const categories = {
            interview_improvement: '<span class="recommendation-category">Interview Improvement</span>',
            candidate_assessment: '<span class="recommendation-category">Candidate Assessment</span>',
            question_optimization: '<span class="recommendation-category">Question Optimization</span>',
            hiring_decision: '<span class="recommendation-category">Hiring Decision</span>',
            follow_up_actions: '<span class="recommendation-category">Follow-up Actions</span>'
        };
        return categories[category] || '<span class="recommendation-category">General</span>';
    }

    viewRecommendationDetails(recommendationId) {
        const recommendation = this.recommendations.find(r => r.recommendation_id === recommendationId);
        if (!recommendation) return;

        this.currentRecommendationId = recommendationId;
        
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        
        modalTitle.textContent = recommendation.title;
        
        modalBody.innerHTML = `
            <div class="mb-3">
                <h6>Category & Priority</h6>
                <p>${this.getCategoryBadge(recommendation.category)} ${this.getPriorityBadge(recommendation.priority_level)}</p>
            </div>
            
            <div class="mb-3">
                <h6>Description</h6>
                <p>${recommendation.description}</p>
            </div>
            
            <div class="mb-3">
                <h6>Detailed Analysis</h6>
                <p>${recommendation.detailed_analysis || 'No detailed analysis available.'}</p>
            </div>
            
            <div class="mb-3">
                <h6>Actionable Steps</h6>
                <div class="actionable-steps">
                    ${this.formatActionableSteps(recommendation.actionable_steps)}
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <h6>Metrics</h6>
                    <ul class="list-unstyled">
                        <li><strong>Confidence:</strong> ${Math.round(recommendation.confidence_score * 100)}%</li>
                        <li><strong>Impact:</strong> ${Math.round(recommendation.impact_score * 100)}%</li>
                        <li><strong>Effort Required:</strong> ${this.capitalizeFirst(recommendation.effort_required)}</li>
                        <li><strong>Timeline:</strong> ${this.formatTimeline(recommendation.timeline_suggestion)}</li>
                    </ul>
                </div>
                <div class="col-md-6">
                    <h6>AI Model</h6>
                    <p>${recommendation.ai_model_used}</p>
                    <h6>Success Metrics</h6>
                    <ul class="list-unstyled">
                        ${this.formatSuccessMetrics(recommendation.success_metrics)}
                    </ul>
                </div>
            </div>
        `;
        
        const modal = new bootstrap.Modal(document.getElementById('recommendationModal'));
        modal.show();
    }

    provideFeedback(recommendationId) {
        this.currentRecommendationId = recommendationId;
        const modal = new bootstrap.Modal(document.getElementById('feedbackModal'));
        modal.show();
    }

    showFeedbackModal() {
        if (!this.currentRecommendationId) return;
        this.provideFeedback(this.currentRecommendationId);
    }

    async submitFeedback() {
        if (!this.currentRecommendationId) return;

        const btn = document.getElementById('submitFeedbackBtn');

        try {
            this.setButtonLoading(btn, true);

            const feedbackData = {
                user_id: 1,
                feedback: {
                    feedback_type: 'general',
                    usefulness_rating: parseInt(document.getElementById('usefulnessRating').value),
                    accuracy_rating: parseInt(document.getElementById('accuracyRating').value),
                    actionability_rating: parseInt(document.getElementById('usefulnessRating').value),
                    relevance_rating: parseInt(document.getElementById('accuracyRating').value),
                    implementation_status: document.getElementById('implementationStatus').value,
                    additional_comments: document.getElementById('additionalComments').value,
                    would_recommend_to_others: document.getElementById('wouldRecommend').checked
                }
            };

            const response = await fetch(`${this.apiBaseUrl}/recommendations/${this.currentRecommendationId}/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(feedbackData)
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('Feedback submitted successfully!', 'success');
                bootstrap.Modal.getInstance(document.getElementById('feedbackModal')).hide();

                // Reset form
                document.getElementById('feedbackForm').reset();
            } else {
                throw new Error(result.error || 'Failed to submit feedback');
            }

        } catch (error) {
            console.error('Error submitting feedback:', error);
            this.showAlert('Failed to submit feedback: ' + error.message, 'danger');
        } finally {
            this.setButtonLoading(btn, false);
        }
    }

    markAsImplemented(recommendationId) {
        // Update the recommendation visually
        const card = document.querySelector(`[data-recommendation-id="${recommendationId}"]`);
        if (card) {
            card.style.opacity = '0.7';
            card.querySelector('.card-body').insertAdjacentHTML('beforeend',
                '<div class="alert alert-success mt-2 mb-0"><i class="fas fa-check me-2"></i>Marked as implemented</div>'
            );
        }

        this.showAlert('Recommendation marked as implemented', 'success');
    }

    applyFilters() {
        const categoryFilter = document.getElementById('categoryFilter').value;
        const priorityFilter = document.getElementById('priorityFilter').value;
        const typeFilter = document.getElementById('typeFilter').value;

        let filteredRecommendations = this.recommendations;

        if (categoryFilter) {
            filteredRecommendations = filteredRecommendations.filter(r => r.category === categoryFilter);
        }

        if (priorityFilter) {
            filteredRecommendations = filteredRecommendations.filter(r => r.priority_level === priorityFilter);
        }

        if (typeFilter) {
            filteredRecommendations = filteredRecommendations.filter(r => r.recommendation_type === typeFilter);
        }

        this.displayRecommendations(filteredRecommendations);
        this.showAlert(`Showing ${filteredRecommendations.length} filtered recommendations`, 'info');
    }

    async exportRecommendations(format) {
        if (!this.currentSessionId) {
            this.showAlert('No active session to export', 'warning');
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/sessions/${this.currentSessionId}/export?format=${format}`);

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `ai_recommendations_${this.currentSessionId}.${format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                this.showAlert(`Recommendations exported as ${format.toUpperCase()}`, 'success');
            } else {
                throw new Error('Export failed');
            }

        } catch (error) {
            console.error('Error exporting recommendations:', error);
            this.showAlert('Failed to export recommendations', 'danger');
        }
    }

    updateSessionStatus(status, message) {
        const statusElement = document.getElementById('sessionStatus');
        statusElement.className = `session-status status-${status}`;
        statusElement.textContent = message;
    }

    updateAnalytics(statistics) {
        document.getElementById('totalRecommendations').textContent = statistics.total_recommendations;
        document.getElementById('avgConfidence').textContent = Math.round(statistics.avg_confidence * 100) + '%';

        // Show analytics card
        document.getElementById('analyticsCard').style.display = 'block';

        // Update category chart
        this.updateCategoryChart(statistics.recommendations_by_category);
    }

    updateCategoryChart(categoryData) {
        const ctx = document.getElementById('categoryChart').getContext('2d');

        if (this.categoryChart) {
            this.categoryChart.destroy();
        }

        const labels = Object.keys(categoryData);
        const data = Object.values(categoryData);
        const colors = [
            '#FF0000', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'
        ];

        this.categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels.map(label => this.formatCategoryLabel(label)),
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderColor: '#1a1a1a',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#f8f9fa',
                            font: {
                                size: 12
                            }
                        }
                    }
                }
            }
        });
    }

    formatCategoryLabel(category) {
        return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    formatActionableSteps(steps) {
        if (!steps || !Array.isArray(steps)) {
            return '<p class="text-muted">No specific steps provided.</p>';
        }

        const stepsList = steps.map(step => `<li>${step}</li>`).join('');
        return `<ul>${stepsList}</ul>`;
    }

    formatSuccessMetrics(metrics) {
        if (!metrics || !Array.isArray(metrics)) {
            return '<li class="text-muted">No metrics defined</li>';
        }

        return metrics.map(metric => `<li>${this.formatCategoryLabel(metric)}</li>`).join('');
    }

    formatTimeline(timeline) {
        const timelines = {
            immediate: 'Immediate',
            short_term: 'Short Term',
            long_term: 'Long Term'
        };
        return timelines[timeline] || timeline;
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    setButtonLoading(button, loading) {
        const spinner = button.querySelector('.loading-spinner');
        if (loading) {
            button.disabled = true;
            spinner.classList.add('show');
        } else {
            button.disabled = false;
            spinner.classList.remove('show');
        }
    }

    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer');
        const alertId = 'alert-' + Date.now();

        const alertHtml = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
                <i class="fas fa-${this.getAlertIcon(type)} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        alertContainer.insertAdjacentHTML('beforeend', alertHtml);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) {
                const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
                bsAlert.close();
            }
        }, 5000);
    }

    getAlertIcon(type) {
        const icons = {
            success: 'check-circle',
            danger: 'exclamation-triangle',
            warning: 'exclamation-circle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
}

// Global functions for onclick handlers
window.exportRecommendations = function(format) {
    aiRecommendationsDemo.exportRecommendations(format);
};

window.applyFilters = function() {
    aiRecommendationsDemo.applyFilters();
};

// Initialize the demo when the page loads
let aiRecommendationsDemo;
document.addEventListener('DOMContentLoaded', function() {
    aiRecommendationsDemo = new AIRecommendationsDemo();
});
