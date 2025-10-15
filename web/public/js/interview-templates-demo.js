/**
 * Interview Templates Demo JavaScript
 * Handles template browsing, filtering, and management
 */

class InterviewTemplatesDemo {
    constructor() {
        this.apiBase = '/api/templates';
        this.currentPage = 1;
        this.pageSize = 12;
        this.currentView = 'grid'; // grid or list
        this.selectedTemplate = null;
        this.templates = [];
        this.categories = [];
        
        this.init();
    }

    async init() {
        try {
            await this.loadInitialData();
            this.setupEventListeners();
            await this.loadPopularTemplates();
            await this.loadTemplates();
        } catch (error) {
            console.error('Failed to initialize:', error);
            this.showError('Failed to load templates');
        }
    }

    async loadInitialData() {
        try {
            // Load categories and stats
            const [categoriesResponse, statsResponse] = await Promise.all([
                fetch(`${this.apiBase}/categories`),
                fetch(`${this.apiBase}/stats`)
            ]);

            if (categoriesResponse.ok) {
                const categoriesData = await categoriesResponse.json();
                this.categories = categoriesData.data || [];
                this.populateCategoryFilter();
            }

            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                this.updateStats(statsData.data);
            }
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }

    populateCategoryFilter() {
        const categoryFilter = document.getElementById('categoryFilter');
        categoryFilter.innerHTML = '<option value="">All Categories</option>';
        
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.category;
            option.textContent = category.category_name || category.category;
            categoryFilter.appendChild(option);
        });
    }

    updateStats(stats) {
        document.getElementById('totalTemplates').textContent = stats.total_templates || 0;
        document.getElementById('totalQuestions').textContent = stats.total_questions || 0;
        document.getElementById('totalCategories').textContent = this.categories.length;
        document.getElementById('totalUsage').textContent = stats.total_usage || 0;
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('searchInput');
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => this.loadTemplates(), 500);
        });

        // Filter changes
        document.getElementById('categoryFilter').addEventListener('change', () => this.loadTemplates());
        document.getElementById('typeFilter').addEventListener('change', () => this.loadTemplates());
        document.getElementById('sortBy').addEventListener('change', () => this.loadTemplates());
    }

    async loadPopularTemplates() {
        try {
            const response = await fetch(`${this.apiBase}/popular?limit=6`);
            if (!response.ok) throw new Error('Failed to load popular templates');
            
            const data = await response.json();
            this.renderPopularTemplates(data.data || []);
        } catch (error) {
            console.error('Failed to load popular templates:', error);
            document.getElementById('popularSection').style.display = 'none';
        }
    }

    renderPopularTemplates(templates) {
        const container = document.getElementById('popularTemplates');
        container.innerHTML = '';

        templates.forEach(template => {
            const col = document.createElement('div');
            col.className = 'col-md-4 mb-3';
            col.innerHTML = this.createTemplateCard(template, true);
            container.appendChild(col);
        });
    }

    async loadTemplates() {
        this.showLoading(true);
        
        try {
            const params = new URLSearchParams({
                limit: this.pageSize,
                offset: (this.currentPage - 1) * this.pageSize,
                sort_by: document.getElementById('sortBy').value,
                sort_order: 'DESC'
            });

            // Add filters
            const search = document.getElementById('searchInput').value.trim();
            if (search) params.append('search', search);

            const category = document.getElementById('categoryFilter').value;
            if (category) params.append('category', category);

            const type = document.getElementById('typeFilter').value;
            if (type) params.append('template_type', type);

            const response = await fetch(`${this.apiBase}?${params}`);
            if (!response.ok) throw new Error('Failed to load templates');
            
            const data = await response.json();
            this.templates = data.data || [];
            this.renderTemplates();
        } catch (error) {
            console.error('Failed to load templates:', error);
            this.showError('Failed to load templates');
        } finally {
            this.showLoading(false);
        }
    }

    renderTemplates() {
        const container = document.getElementById('templatesContainer');
        container.innerHTML = '';

        if (this.templates.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-search fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">No templates found</h4>
                    <p class="text-muted">Try adjusting your search criteria</p>
                </div>
            `;
            return;
        }

        this.templates.forEach(template => {
            const col = document.createElement('div');
            col.className = this.currentView === 'grid' ? 'col-md-4 mb-4' : 'col-12 mb-3';
            col.innerHTML = this.createTemplateCard(template, false);
            container.appendChild(col);
        });
    }

    createTemplateCard(template, isPopular = false) {
        const categoryBadge = template.category ? 
            `<span class="badge category-badge">${template.category}</span>` : '';
        
        const typeBadge = template.type ? 
            `<span class="badge bg-secondary">${template.type}</span>` : '';

        const ratingStars = this.createRatingStars(template.rating || 0);
        
        const questionCount = template.question_count || 0;
        const usageCount = template.usage_count || 0;

        return `
            <div class="card template-card h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            ${categoryBadge}
                            ${typeBadge}
                        </div>
                        ${isPopular ? '<i class="fas fa-star text-warning"></i>' : ''}
                    </div>
                    
                    <h5 class="card-title">${template.name}</h5>
                    <p class="card-text text-muted">${template.description || 'No description available'}</p>
                    
                    <div class="row text-center mb-3">
                        <div class="col-4">
                            <small class="text-muted d-block">Questions</small>
                            <strong>${questionCount}</strong>
                        </div>
                        <div class="col-4">
                            <small class="text-muted d-block">Duration</small>
                            <strong>${template.duration_minutes || 60}m</strong>
                        </div>
                        <div class="col-4">
                            <small class="text-muted d-block">Used</small>
                            <strong>${usageCount}</strong>
                        </div>
                    </div>
                    
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            ${ratingStars}
                            <small class="text-muted ms-1">(${template.rating || 0})</small>
                        </div>
                        <div>
                            <button class="btn btn-outline-primary btn-sm me-1" 
                                    onclick="templatesDemo.viewTemplate('${template.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-primary btn-sm" 
                                    onclick="templatesDemo.useTemplate('${template.id}')">
                                <i class="fas fa-play"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createRatingStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        let stars = '';
        
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars += '<i class="fas fa-star text-warning"></i>';
            } else if (i === fullStars && hasHalfStar) {
                stars += '<i class="fas fa-star-half-alt text-warning"></i>';
            } else {
                stars += '<i class="far fa-star text-muted"></i>';
            }
        }
        
        return stars;
    }

    async viewTemplate(templateId) {
        try {
            const response = await fetch(`${this.apiBase}/${templateId}?include_questions=true`);
            if (!response.ok) throw new Error('Failed to load template details');
            
            const data = await response.json();
            this.selectedTemplate = data.data;
            this.showTemplateModal();
        } catch (error) {
            console.error('Failed to load template details:', error);
            this.showError('Failed to load template details');
        }
    }

    showTemplateModal() {
        const template = this.selectedTemplate;
        if (!template) return;

        document.getElementById('templateModalTitle').textContent = template.name;
        
        const modalBody = document.getElementById('templateModalBody');
        modalBody.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Template Information</h6>
                    <table class="table table-dark table-sm">
                        <tr><td>Category:</td><td>${template.category || 'General'}</td></tr>
                        <tr><td>Type:</td><td>${template.type || 'Standard'}</td></tr>
                        <tr><td>Duration:</td><td>${template.duration_minutes || 60} minutes</td></tr>
                        <tr><td>Max Guests:</td><td>${template.max_guests || 10}</td></tr>
                        <tr><td>Usage Count:</td><td>${template.usage_count || 0}</td></tr>
                        <tr><td>Rating:</td><td>${this.createRatingStars(template.rating || 0)}</td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6>Description</h6>
                    <p class="text-muted">${template.description || 'No description available'}</p>
                </div>
            </div>
            
            ${template.template_questions && template.template_questions.length > 0 ? `
                <div class="mt-4">
                    <h6>Questions (${template.template_questions.length})</h6>
                    <div class="template-questions">
                        ${template.template_questions.map((q, index) => `
                            <div class="question-item">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div class="flex-grow-1">
                                        <strong>Q${index + 1}:</strong> ${q.question_text}
                                        <div class="mt-2">
                                            <span class="badge bg-info">${q.question_type || 'open'}</span>
                                            ${q.time_limit_minutes ? `<span class="badge bg-warning">${q.time_limit_minutes}m</span>` : ''}
                                            ${q.is_required ? '<span class="badge bg-success">Required</span>' : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;

        const modal = new bootstrap.Modal(document.getElementById('templateModal'));
        modal.show();
    }

    useTemplate(templateId) {
        // Track usage
        this.trackTemplateUsage(templateId);
        
        // In a real application, this would integrate with the interview room creation
        this.showSuccess(`Template ${templateId} selected! This would normally create a new interview room with this template.`);
    }

    async trackTemplateUsage(templateId) {
        try {
            await fetch(`${this.apiBase}/${templateId}/usage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: 'demo_user',
                    interview_id: null,
                    duration_minutes: 0,
                    questions_asked: 0,
                    questions_completed: 0,
                    completion_rate: 0
                })
            });
        } catch (error) {
            console.error('Failed to track usage:', error);
        }
    }

    toggleView() {
        this.currentView = this.currentView === 'grid' ? 'list' : 'grid';
        const icon = document.getElementById('viewIcon');
        icon.className = this.currentView === 'grid' ? 'fas fa-th' : 'fas fa-list';
        this.renderTemplates();
    }

    showLoading(show) {
        document.getElementById('loadingSpinner').style.display = show ? 'block' : 'none';
    }

    showError(message) {
        // Simple error display - in production, use a proper notification system
        alert('Error: ' + message);
    }

    showSuccess(message) {
        // Simple success display - in production, use a proper notification system
        alert('Success: ' + message);
    }
}

// Global functions for onclick handlers
window.searchTemplates = function() {
    if (window.templatesDemo) {
        window.templatesDemo.currentPage = 1;
        window.templatesDemo.loadTemplates();
    }
};

window.toggleView = function() {
    if (window.templatesDemo) {
        window.templatesDemo.toggleView();
    }
};

window.useTemplate = function() {
    if (window.templatesDemo && window.templatesDemo.selectedTemplate) {
        window.templatesDemo.useTemplate(window.templatesDemo.selectedTemplate.id);
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.templatesDemo = new InterviewTemplatesDemo();
});
