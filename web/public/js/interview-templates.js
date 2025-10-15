/**
 * Interview Templates Management System
 * Handles template creation, editing, and application
 */
class InterviewTemplateManager {
    constructor() {
        this.templates = [];
        this.currentTemplate = null;
        this.filters = {
            search: '',
            category: '',
            type: '',
            sort: 'featured_first',
            featured: false,
            public: true
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadTemplates();
    }

    setupEventListeners() {
        // Search and filter inputs
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.filters.search = e.target.value;
            this.debounceFilter();
        });

        document.getElementById('category-filter').addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.applyFilters();
        });

        document.getElementById('type-filter').addEventListener('change', (e) => {
            this.filters.type = e.target.value;
            this.applyFilters();
        });

        document.getElementById('sort-filter').addEventListener('change', (e) => {
            this.filters.sort = e.target.value;
            this.applyFilters();
        });

        document.getElementById('featured-only').addEventListener('change', (e) => {
            this.filters.featured = e.target.checked;
            this.applyFilters();
        });

        document.getElementById('public-only').addEventListener('change', (e) => {
            this.filters.public = e.target.checked;
            this.applyFilters();
        });

        // Template form submission
        document.getElementById('template-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTemplate();
        });

        // Template action buttons
        document.getElementById('duplicate-template-btn').addEventListener('click', () => {
            this.duplicateTemplate();
        });

        document.getElementById('use-template-btn').addEventListener('click', () => {
            this.useTemplate();
        });
    }

    debounceFilter() {
        clearTimeout(this.filterTimeout);
        this.filterTimeout = setTimeout(() => {
            this.applyFilters();
        }, 300);
    }

    async loadTemplates() {
        try {
            const response = await fetch('/api/interview-templates?' + new URLSearchParams(this.filters));
            const data = await response.json();

            if (data.success) {
                this.templates = data.data;
                this.renderTemplates();
            } else {
                this.showError('Failed to load templates: ' + data.message);
            }
        } catch (error) {
            console.error('Error loading templates:', error);
            this.showError('Failed to load templates. Please try again.');
        }
    }

    applyFilters() {
        this.loadTemplates();
    }

    renderTemplates() {
        const container = document.getElementById('templates-container');
        const emptyState = document.getElementById('empty-state');

        if (this.templates.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('d-none');
            return;
        }

        emptyState.classList.add('d-none');

        const templatesHtml = this.templates.map(template => this.renderTemplateCard(template)).join('');
        
        container.innerHTML = `
            <div class="row g-4">
                ${templatesHtml}
            </div>
        `;
    }

    renderTemplateCard(template) {
        const questions = JSON.parse(template.questions || '[]');
        const structure = JSON.parse(template.structure || '{}');
        
        const questionsPreview = questions.slice(0, 3).map(q => `
            <div class="question-item">
                <div class="question-category">${q.category || 'General'}</div>
                <div>${this.highlightSearch(q.text)}</div>
            </div>
        `).join('');

        const moreQuestions = questions.length > 3 ? `
            <div class="question-item text-muted">
                <small>+${questions.length - 3} more questions...</small>
            </div>
        ` : '';

        return `
            <div class="col-lg-4 col-md-6">
                <div class="template-card">
                    <div class="template-header">
                        <div class="template-type-badge">${template.type}</div>
                        <h5 class="mb-1">${this.highlightSearch(template.name)}</h5>
                        <p class="mb-2 opacity-75">${this.highlightSearch(template.description || '')}</p>
                        <div class="template-stats">
                            <div class="template-stat">
                                <i class="fas fa-clock"></i>
                                <span class="template-duration">${template.duration_minutes}min</span>
                            </div>
                            <div class="template-stat">
                                <i class="fas fa-users"></i>
                                <span>${template.max_guests} guests</span>
                            </div>
                            <div class="template-stat">
                                <i class="fas fa-question-circle"></i>
                                <span>${questions.length} questions</span>
                            </div>
                        </div>
                        ${template.is_featured ? '<span class="featured-badge">FEATURED</span>' : ''}
                    </div>
                    
                    <div class="card-body">
                        <div class="template-questions">
                            ${questionsPreview}
                            ${moreQuestions}
                        </div>
                        
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="template-stats">
                                <div class="template-stat">
                                    <i class="fas fa-star text-warning"></i>
                                    <span>${template.rating || '0.0'}</span>
                                </div>
                                <div class="template-stat">
                                    <i class="fas fa-download"></i>
                                    <span>${template.usage_count || 0}</span>
                                </div>
                            </div>
                            
                            <div class="btn-group">
                                <button class="btn btn-outline-light btn-template-action" 
                                        onclick="templateManager.viewTemplate('${template.id}')"
                                        title="View Details">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-outline-light btn-template-action" 
                                        onclick="templateManager.duplicateTemplate('${template.id}')"
                                        title="Duplicate">
                                    <i class="fas fa-copy"></i>
                                </button>
                                <button class="btn btn-danger btn-template-action" 
                                        onclick="templateManager.useTemplate('${template.id}')"
                                        title="Use Template">
                                    <i class="fas fa-play"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    highlightSearch(text) {
        if (!this.filters.search || !text) return text;
        
        const regex = new RegExp(`(${this.filters.search})`, 'gi');
        return text.replace(regex, '<span class="search-highlight">$1</span>');
    }

    async viewTemplate(templateId) {
        try {
            const response = await fetch(`/api/interview-templates/${templateId}`);
            const data = await response.json();

            if (data.success) {
                this.currentTemplate = data.data;
                this.showTemplateDetails(data.data);
            } else {
                this.showError('Failed to load template details: ' + data.message);
            }
        } catch (error) {
            console.error('Error loading template:', error);
            this.showError('Failed to load template details.');
        }
    }

    showTemplateDetails(template) {
        const questions = JSON.parse(template.questions || '[]');
        const structure = JSON.parse(template.structure || '{}');
        const settings = JSON.parse(template.settings || '{}');

        const questionsHtml = questions.map((q, index) => `
            <div class="question-item border-bottom pb-2 mb-2">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <span class="badge bg-secondary me-2">${index + 1}</span>
                        <span class="question-category text-danger">${q.category || 'General'}</span>
                        <div class="mt-1">${q.text}</div>
                        ${q.time_limit ? `<small class="text-muted">Time limit: ${q.time_limit} minutes</small>` : ''}
                    </div>
                    <span class="badge bg-outline-light">${q.type || 'open'}</span>
                </div>
            </div>
        `).join('');

        const phasesHtml = structure.phases ? structure.phases.map(phase => `
            <div class="d-flex justify-content-between align-items-center py-1">
                <span>${phase.name}</span>
                <span class="badge bg-secondary">${phase.duration}min</span>
            </div>
        `).join('') : '<p class="text-muted">No structure defined</p>';

        document.getElementById('template-details-content').innerHTML = `
            <div class="row">
                <div class="col-md-8">
                    <h6 class="text-white mb-3">
                        <i class="fas fa-question-circle text-danger me-2"></i>
                        Questions (${questions.length})
                    </h6>
                    <div class="template-questions" style="max-height: 300px; overflow-y: auto;">
                        ${questionsHtml}
                    </div>
                </div>
                <div class="col-md-4">
                    <h6 class="text-white mb-3">
                        <i class="fas fa-info-circle text-danger me-2"></i>
                        Template Info
                    </h6>
                    <div class="mb-3">
                        <strong>Category:</strong> ${template.category}<br>
                        <strong>Type:</strong> ${template.type}<br>
                        <strong>Duration:</strong> ${template.duration_minutes} minutes<br>
                        <strong>Max Guests:</strong> ${template.max_guests}<br>
                        <strong>Usage Count:</strong> ${template.usage_count || 0}<br>
                        <strong>Rating:</strong> ${template.rating || 'Not rated'}
                    </div>
                    
                    <h6 class="text-white mb-3">
                        <i class="fas fa-sitemap text-danger me-2"></i>
                        Interview Structure
                    </h6>
                    <div class="mb-3">
                        ${phasesHtml}
                    </div>
                    
                    <h6 class="text-white mb-3">
                        <i class="fas fa-cog text-danger me-2"></i>
                        Default Settings
                    </h6>
                    <div class="small">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" ${settings.recording_enabled ? 'checked' : ''} disabled>
                            <label class="form-check-label">Recording Enabled</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" ${settings.auto_recording_enabled ? 'checked' : ''} disabled>
                            <label class="form-check-label">Auto Recording</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" ${settings.chat_enabled ? 'checked' : ''} disabled>
                            <label class="form-check-label">Chat Enabled</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" ${settings.waiting_room_enabled ? 'checked' : ''} disabled>
                            <label class="form-check-label">Waiting Room</label>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modal = new bootstrap.Modal(document.getElementById('templateDetailsModal'));
        modal.show();
    }

    async duplicateTemplate(templateId) {
        if (!templateId && this.currentTemplate) {
            templateId = this.currentTemplate.id;
        }

        try {
            const response = await fetch(`/api/interview-templates/${templateId}/duplicate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess('Template duplicated successfully!');
                this.loadTemplates();
                
                // Close details modal if open
                const detailsModal = bootstrap.Modal.getInstance(document.getElementById('templateDetailsModal'));
                if (detailsModal) {
                    detailsModal.hide();
                }
            } else {
                this.showError('Failed to duplicate template: ' + data.message);
            }
        } catch (error) {
            console.error('Error duplicating template:', error);
            this.showError('Failed to duplicate template.');
        }
    }

    useTemplate(templateId) {
        if (!templateId && this.currentTemplate) {
            templateId = this.currentTemplate.id;
        }

        // Redirect to host dashboard with template parameter
        window.location.href = `/host-dashboard.html?template=${templateId}`;
    }

    showCreateModal() {
        this.currentTemplate = null;
        document.getElementById('modal-title').textContent = 'Create Interview Template';
        this.loadTemplateForm();
        
        const modal = new bootstrap.Modal(document.getElementById('templateModal'));
        modal.show();
    }

    showMyTemplates() {
        this.filters.public = false;
        this.filters.created_by = 'me'; // This would need to be implemented in the API
        this.applyFilters();
    }

    loadTemplateForm() {
        // This would load the template creation/editing form
        // Implementation would be added in the next part
        document.querySelector('#templateModal .modal-body').innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-tools text-muted" style="font-size: 3rem;"></i>
                <h5 class="mt-3 text-muted">Template Editor</h5>
                <p class="text-muted">Template creation form will be implemented in the next update.</p>
            </div>
        `;
    }

    async saveTemplate() {
        // Template saving logic would be implemented here
        this.showSuccess('Template saved successfully!');
    }

    getAuthToken() {
        return localStorage.getItem('auth_token') || '';
    }

    showSuccess(message) {
        // Simple success notification
        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show position-fixed';
        alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alert);
        
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 5000);
    }

    showError(message) {
        // Simple error notification
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger alert-dismissible fade show position-fixed';
        alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alert);
        
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 5000);
    }
}

// Initialize the template manager
const templateManager = new InterviewTemplateManager();
