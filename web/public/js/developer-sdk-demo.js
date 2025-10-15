/**
 * Developer SDK Demo JavaScript Module
 * Handles SDK browsing, downloads, code examples, and documentation
 */

class DeveloperSDKDemo {
    constructor() {
        this.apiBaseUrl = '/api/sdk';
        this.currentLanguage = '';
        this.languages = {};
        this.versions = {};
        this.examples = [];
        this.integrations = [];
        this.documentation = [];
        
        this.init();
    }

    async init() {
        try {
            await this.loadLanguages();
            await this.loadVersions();
            await this.loadDemoData();
            this.renderLanguages();
            this.renderQuickStart();
            this.setupEventListeners();
            this.setupTabHandlers();
            console.log('Developer SDK Demo initialized');
        } catch (error) {
            console.error('Failed to initialize SDK demo:', error);
            this.showError('Failed to load SDK data');
        }
    }

    async loadLanguages() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/languages`);
            const result = await response.json();
            
            if (result.success) {
                this.languages = result.data;
            } else {
                throw new Error(result.error || 'Failed to load languages');
            }
        } catch (error) {
            console.error('Error loading languages:', error);
            // Fallback data
            this.languages = {
                javascript: { name: 'JavaScript/Node.js', icon: 'fab fa-js-square', color: '#f7df1e' },
                python: { name: 'Python', icon: 'fab fa-python', color: '#3776ab' },
                php: { name: 'PHP', icon: 'fab fa-php', color: '#777bb4' },
                java: { name: 'Java', icon: 'fab fa-java', color: '#ed8b00' },
                csharp: { name: 'C#/.NET', icon: 'fab fa-microsoft', color: '#239120' },
                ruby: { name: 'Ruby', icon: 'fas fa-gem', color: '#cc342d' },
                go: { name: 'Go', icon: 'fab fa-golang', color: '#00add8' }
            };
        }
    }

    async loadVersions() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/versions`);
            const result = await response.json();
            
            if (result.success) {
                this.versions = result.data.reduce((acc, version) => {
                    if (!acc[version.language]) {
                        acc[version.language] = [];
                    }
                    acc[version.language].push(version);
                    return acc;
                }, {});
            } else {
                throw new Error(result.error || 'Failed to load versions');
            }
        } catch (error) {
            console.error('Error loading versions:', error);
            // Fallback data
            this.versions = {
                javascript: [{ version_number: '1.1.0', release_type: 'stable' }],
                python: [{ version_number: '1.0.0', release_type: 'stable' }],
                php: [{ version_number: '1.0.0', release_type: 'stable' }]
            };
        }
    }

    async loadDemoData() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/demo-data`);
            const result = await response.json();
            
            if (result.success) {
                this.updateStats(result.data);
            }
        } catch (error) {
            console.error('Error loading demo data:', error);
        }
    }

    async loadCodeExamples(filters = {}) {
        try {
            const params = new URLSearchParams(filters);
            const response = await fetch(`${this.apiBaseUrl}/examples?${params}`);
            const result = await response.json();
            
            if (result.success) {
                this.examples = result.data;
                this.renderCodeExamples();
            } else {
                throw new Error(result.error || 'Failed to load code examples');
            }
        } catch (error) {
            console.error('Error loading code examples:', error);
            this.showError('Failed to load code examples');
        }
    }

    async loadIntegrations(filters = {}) {
        try {
            const params = new URLSearchParams(filters);
            const response = await fetch(`${this.apiBaseUrl}/integrations?${params}`);
            const result = await response.json();
            
            if (result.success) {
                this.integrations = result.data;
                this.renderIntegrations();
            } else {
                throw new Error(result.error || 'Failed to load integrations');
            }
        } catch (error) {
            console.error('Error loading integrations:', error);
            this.showError('Failed to load integrations');
        }
    }

    async loadDocumentation(filters = {}) {
        try {
            const params = new URLSearchParams(filters);
            const response = await fetch(`${this.apiBaseUrl}/documentation?${params}`);
            const result = await response.json();
            
            if (result.success) {
                this.documentation = result.data;
                this.renderDocumentation();
            } else {
                throw new Error(result.error || 'Failed to load documentation');
            }
        } catch (error) {
            console.error('Error loading documentation:', error);
            this.showError('Failed to load documentation');
        }
    }

    renderLanguages() {
        const container = document.getElementById('languages-grid');
        if (!container) return;

        const languagesHtml = Object.entries(this.languages).map(([key, lang]) => {
            const latestVersion = this.versions[key] ? this.versions[key][0]?.version_number : '1.0.0';
            
            return `
                <div class="col-lg-3 col-md-4 col-sm-6 mb-3">
                    <div class="card language-card h-100" data-language="${key}">
                        <div class="card-body text-center">
                            <i class="${lang.icon} language-icon" style="color: ${lang.color};"></i>
                            <h5 class="card-title">${lang.name}</h5>
                            <span class="version-badge">v${latestVersion}</span>
                            <div class="mt-3">
                                <button class="btn btn-primary btn-sm me-2" onclick="sdkDemo.downloadSDK('${key}')">
                                    <i class="fas fa-download me-1"></i>Download
                                </button>
                                <button class="btn btn-outline-light btn-sm" onclick="sdkDemo.viewDocs('${key}')">
                                    <i class="fas fa-book me-1"></i>Docs
                                </button>
                            </div>
                            <div class="mt-2">
                                <small class="text-muted">${lang.install_command || `Install via ${lang.package_manager || 'package manager'}`}</small>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = languagesHtml;
    }

    renderQuickStart() {
        const container = document.getElementById('quickstart-content');
        if (!container) return;

        const quickStartHtml = `
            <div class="row">
                <div class="col-md-6">
                    <h4><i class="fas fa-rocket text-primary me-2"></i>Get Started in Minutes</h4>
                    <p class="mb-4">Choose your preferred programming language and start integrating Interviews.tv into your application.</p>
                    
                    <div class="mb-4">
                        <h6>1. Install the SDK</h6>
                        <div class="code-block">
                            <button class="copy-btn" onclick="sdkDemo.copyToClipboard(this)">Copy</button>
                            <pre><code class="language-bash">npm install @interviews-tv/sdk</code></pre>
                        </div>
                    </div>

                    <div class="mb-4">
                        <h6>2. Initialize the Client</h6>
                        <div class="code-block">
                            <button class="copy-btn" onclick="sdkDemo.copyToClipboard(this)">Copy</button>
                            <pre><code class="language-javascript">const InterviewsTV = require('@interviews-tv/sdk');

const client = new InterviewsTV({
  apiKey: 'your-api-key',
  environment: 'production'
});</code></pre>
                        </div>
                    </div>

                    <div class="mb-4">
                        <h6>3. Start Using the API</h6>
                        <div class="code-block">
                            <button class="copy-btn" onclick="sdkDemo.copyToClipboard(this)">Copy</button>
                            <pre><code class="language-javascript">// Create an interview room
const room = await client.rooms.create({
  title: 'Technical Interview',
  duration: 3600,
  participants: ['interviewer@company.com']
});

console.log('Room created:', room.id);</code></pre>
                        </div>
                    </div>
                </div>

                <div class="col-md-6">
                    <h4><i class="fas fa-features text-primary me-2"></i>Key Features</h4>
                    <div class="list-group list-group-flush">
                        <div class="list-group-item bg-transparent border-0 px-0">
                            <i class="fas fa-video text-success me-2"></i>
                            <strong>Video Interviews</strong><br>
                            <small class="text-muted">Create and manage video interview rooms</small>
                        </div>
                        <div class="list-group-item bg-transparent border-0 px-0">
                            <i class="fas fa-calendar text-info me-2"></i>
                            <strong>Calendar Integration</strong><br>
                            <small class="text-muted">Sync with Google Calendar and Outlook</small>
                        </div>
                        <div class="list-group-item bg-transparent border-0 px-0">
                            <i class="fas fa-share-alt text-warning me-2"></i>
                            <strong>Social Streaming</strong><br>
                            <small class="text-muted">Stream to YouTube, Facebook, LinkedIn</small>
                        </div>
                        <div class="list-group-item bg-transparent border-0 px-0">
                            <i class="fas fa-bell text-primary me-2"></i>
                            <strong>Webhooks</strong><br>
                            <small class="text-muted">Real-time event notifications</small>
                        </div>
                        <div class="list-group-item bg-transparent border-0 px-0">
                            <i class="fas fa-handshake text-success me-2"></i>
                            <strong>CRM Integration</strong><br>
                            <small class="text-muted">Connect with Salesforce, HubSpot, and more</small>
                        </div>
                        <div class="list-group-item bg-transparent border-0 px-0">
                            <i class="fas fa-credit-card text-danger me-2"></i>
                            <strong>Payment Processing</strong><br>
                            <small class="text-muted">Handle payments and subscriptions</small>
                        </div>
                    </div>

                    <div class="mt-4">
                        <h6>Need Help?</h6>
                        <div class="d-flex gap-2">
                            <a href="api-documentation.html" class="btn btn-outline-light btn-sm">
                                <i class="fas fa-book me-1"></i>API Docs
                            </a>
                            <button class="btn btn-outline-light btn-sm" onclick="sdkDemo.showSupport()">
                                <i class="fas fa-life-ring me-1"></i>Support
                            </button>
                            <a href="https://github.com/interviews-tv/sdk" class="btn btn-outline-light btn-sm" target="_blank">
                                <i class="fab fa-github me-1"></i>GitHub
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = quickStartHtml;
        
        // Initialize syntax highlighting
        if (typeof Prism !== 'undefined') {
            Prism.highlightAll();
        }
    }

    renderCodeExamples() {
        const container = document.getElementById('examples-content');
        if (!container) return;

        if (this.examples.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-code fa-3x text-muted mb-3"></i>
                    <h5>No code examples found</h5>
                    <p class="text-muted">Try adjusting your filters or check back later.</p>
                </div>
            `;
            return;
        }

        const examplesHtml = this.examples.map(example => {
            const complexityClass = `complexity-${example.complexity_level}`;
            
            return `
                <div class="example-card">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            <h6 class="mb-1">${example.title}</h6>
                            <small class="text-muted">${example.language} • ${example.category}</small>
                        </div>
                        <span class="complexity-badge ${complexityClass}">${example.complexity_level}</span>
                    </div>
                    <p class="text-muted mb-3">${example.description}</p>
                    <div class="code-block">
                        <button class="copy-btn" onclick="sdkDemo.copyToClipboard(this)">Copy</button>
                        <pre><code class="language-${example.language}">${example.code_snippet}</code></pre>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-2">
                        <div>
                            <i class="fas fa-eye text-muted me-1"></i>
                            <small class="text-muted">${example.view_count || 0} views</small>
                            <i class="fas fa-heart text-muted me-1 ms-3"></i>
                            <small class="text-muted">${example.like_count || 0} likes</small>
                        </div>
                        <button class="btn btn-outline-light btn-sm" onclick="sdkDemo.likeExample('${example.example_id}')">
                            <i class="fas fa-heart me-1"></i>Like
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = examplesHtml;
        
        // Initialize syntax highlighting
        if (typeof Prism !== 'undefined') {
            Prism.highlightAll();
        }
    }

    renderIntegrations() {
        const container = document.getElementById('integrations-content');
        if (!container) return;

        // Demo integrations data
        const demoIntegrations = [
            {
                name: 'React Interview App',
                description: 'Complete React application with interview scheduling and video calls',
                language: 'javascript',
                framework: 'react',
                github_url: 'https://github.com/interviews-tv/react-example',
                demo_url: 'https://react-demo.interviews.tv',
                complexity_level: 'intermediate',
                features: ['Video calls', 'Scheduling', 'Recording'],
                star_count: 245,
                fork_count: 67
            },
            {
                name: 'Django HR Platform',
                description: 'Django-based HR platform with integrated interview management',
                language: 'python',
                framework: 'django',
                github_url: 'https://github.com/interviews-tv/django-example',
                complexity_level: 'advanced',
                features: ['User management', 'Interview tracking', 'Analytics'],
                star_count: 189,
                fork_count: 43
            },
            {
                name: 'Laravel Recruitment System',
                description: 'Full-featured recruitment system built with Laravel',
                language: 'php',
                framework: 'laravel',
                github_url: 'https://github.com/interviews-tv/laravel-example',
                complexity_level: 'intermediate',
                features: ['Job posting', 'Candidate management', 'Interview scheduling'],
                star_count: 156,
                fork_count: 34
            }
        ];

        const integrationsHtml = demoIntegrations.map(integration => {
            const complexityClass = `complexity-${integration.complexity_level}`;
            
            return `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card h-100">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h6 class="card-title mb-1">${integration.name}</h6>
                                <span class="complexity-badge ${complexityClass}">${integration.complexity_level}</span>
                            </div>
                            <p class="card-text text-muted mb-3">${integration.description}</p>
                            <div class="mb-3">
                                <small class="text-muted">
                                    <i class="fas fa-code me-1"></i>${integration.language} • ${integration.framework}
                                </small>
                            </div>
                            <div class="mb-3">
                                ${integration.features.map(feature => 
                                    `<span class="badge bg-secondary me-1 mb-1">${feature}</span>`
                                ).join('')}
                            </div>
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <small class="text-muted">
                                        <i class="fas fa-star text-warning me-1"></i>${integration.star_count}
                                        <i class="fas fa-code-branch text-info me-1 ms-2"></i>${integration.fork_count}
                                    </small>
                                </div>
                                <div>
                                    <a href="${integration.github_url}" class="btn btn-outline-light btn-sm me-1" target="_blank">
                                        <i class="fab fa-github"></i>
                                    </a>
                                    ${integration.demo_url ? 
                                        `<a href="${integration.demo_url}" class="btn btn-primary btn-sm" target="_blank">
                                            <i class="fas fa-external-link-alt"></i>
                                        </a>` : ''
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `<div class="row">${integrationsHtml}</div>`;
    }

    renderDocumentation() {
        const container = document.getElementById('documentation-content');
        if (!container) return;

        const docsHtml = `
            <div class="row">
                <div class="col-md-8">
                    <h4>SDK Documentation</h4>
                    <p class="text-muted mb-4">Comprehensive guides and API references for all supported languages.</p>
                    
                    <div class="list-group">
                        <a href="api-documentation.html" class="list-group-item list-group-item-action bg-transparent border-secondary">
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1">API Reference</h6>
                                <small class="text-primary">View</small>
                            </div>
                            <p class="mb-1">Complete API documentation with endpoints, parameters, and examples.</p>
                        </a>
                        <a href="#" class="list-group-item list-group-item-action bg-transparent border-secondary">
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1">Getting Started Guide</h6>
                                <small class="text-primary">View</small>
                            </div>
                            <p class="mb-1">Step-by-step guide to integrate Interviews.tv into your application.</p>
                        </a>
                        <a href="#" class="list-group-item list-group-item-action bg-transparent border-secondary">
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1">Authentication Guide</h6>
                                <small class="text-primary">View</small>
                            </div>
                            <p class="mb-1">Learn how to authenticate and secure your API requests.</p>
                        </a>
                        <a href="#" class="list-group-item list-group-item-action bg-transparent border-secondary">
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1">Webhooks Guide</h6>
                                <small class="text-primary">View</small>
                            </div>
                            <p class="mb-1">Set up real-time notifications for interview events.</p>
                        </a>
                    </div>
                </div>
                
                <div class="col-md-4">
                    <h5>Quick Links</h5>
                    <div class="list-group">
                        <a href="https://github.com/interviews-tv" class="list-group-item list-group-item-action bg-transparent border-secondary" target="_blank">
                            <i class="fab fa-github me-2"></i>GitHub Repository
                        </a>
                        <a href="#" class="list-group-item list-group-item-action bg-transparent border-secondary">
                            <i class="fas fa-comments me-2"></i>Community Forum
                        </a>
                        <a href="#" class="list-group-item list-group-item-action bg-transparent border-secondary">
                            <i class="fas fa-life-ring me-2"></i>Support Center
                        </a>
                        <a href="#" class="list-group-item list-group-item-action bg-transparent border-secondary">
                            <i class="fas fa-bug me-2"></i>Report Issues
                        </a>
                    </div>
                    
                    <div class="mt-4">
                        <h6>SDK Status</h6>
                        <div class="bg-dark p-3 rounded">
                            <div class="d-flex justify-content-between mb-2">
                                <span>API Status</span>
                                <span class="text-success">Operational</span>
                            </div>
                            <div class="d-flex justify-content-between mb-2">
                                <span>Uptime</span>
                                <span>99.9%</span>
                            </div>
                            <div class="d-flex justify-content-between">
                                <span>Response Time</span>
                                <span>145ms</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = docsHtml;
    }

    setupEventListeners() {
        // Language filter for examples
        const examplesLanguageFilter = document.getElementById('examples-language-filter');
        const examplesCategoryFilter = document.getElementById('examples-category-filter');
        const examplesComplexityFilter = document.getElementById('examples-complexity-filter');

        if (examplesLanguageFilter) {
            // Populate language filter
            const languageOptions = Object.entries(this.languages).map(([key, lang]) => 
                `<option value="${key}">${lang.name}</option>`
            ).join('');
            examplesLanguageFilter.innerHTML += languageOptions;

            // Add event listeners
            [examplesLanguageFilter, examplesCategoryFilter, examplesComplexityFilter].forEach(filter => {
                if (filter) {
                    filter.addEventListener('change', () => this.filterExamples());
                }
            });
        }
    }

    setupTabHandlers() {
        const tabButtons = document.querySelectorAll('#sdk-tabs button[data-bs-toggle="tab"]');
        
        tabButtons.forEach(button => {
            button.addEventListener('shown.bs.tab', (event) => {
                const targetId = event.target.getAttribute('data-bs-target');
                
                switch (targetId) {
                    case '#examples':
                        this.loadCodeExamples();
                        break;
                    case '#integrations':
                        this.loadIntegrations();
                        break;
                    case '#documentation':
                        this.loadDocumentation();
                        break;
                }
            });
        });
    }

    filterExamples() {
        const filters = {
            language: document.getElementById('examples-language-filter')?.value || '',
            category: document.getElementById('examples-category-filter')?.value || '',
            complexity: document.getElementById('examples-complexity-filter')?.value || ''
        };

        // Remove empty filters
        Object.keys(filters).forEach(key => {
            if (!filters[key]) delete filters[key];
        });

        this.loadCodeExamples(filters);
    }

    updateStats(data) {
        const statsContainer = document.getElementById('sdk-stats');
        if (!statsContainer || !data) return;

        const stats = [
            { label: 'Languages', value: data.supported_languages ? Object.keys(data.supported_languages).length : 7 },
            { label: 'Downloads', value: this.formatNumber(data.total_downloads || 45230) },
            { label: 'Developers', value: this.formatNumber(data.active_developers || 1250) },
            { label: 'GitHub Stars', value: data.github_stars || 890 },
            { label: 'Examples', value: data.code_examples || 45 },
            { label: 'Integrations', value: data.integrations || 12 }
        ];

        const statsHtml = stats.map(stat => `
            <div class="col-md-2 col-6">
                <div class="stat-item">
                    <div class="stat-number">${stat.value}</div>
                    <div class="stat-label">${stat.label}</div>
                </div>
            </div>
        `).join('');

        statsContainer.innerHTML = statsHtml;
    }

    async downloadSDK(language) {
        try {
            const versions = this.versions[language];
            if (!versions || versions.length === 0) {
                this.showError(`No versions available for ${language}`);
                return;
            }

            const latestVersion = versions[0];
            const response = await fetch(`${this.apiBaseUrl}/download?version_id=${latestVersion.version_id}&type=direct`);
            const result = await response.json();

            if (result.success) {
                this.showSuccess(`Download started for ${language} SDK v${latestVersion.version_number}`);
                // In a real implementation, this would trigger the actual download
                console.log('Download URL:', result.data.download_url);
            } else {
                throw new Error(result.error || 'Download failed');
            }
        } catch (error) {
            console.error('Download error:', error);
            this.showError('Failed to download SDK');
        }
    }

    viewDocs(language) {
        // Switch to documentation tab and filter by language
        const docTab = document.getElementById('documentation-tab');
        if (docTab) {
            docTab.click();
            this.currentLanguage = language;
            setTimeout(() => this.loadDocumentation({ language }), 100);
        }
    }

    likeExample(exampleId) {
        // In a real implementation, this would make an API call
        this.showSuccess('Thanks for your feedback!');
    }

    showSupport() {
        this.showInfo('Support: Contact us at support@interviews.tv or visit our community forum.');
    }

    copyToClipboard(button) {
        const codeBlock = button.parentElement;
        const code = codeBlock.querySelector('code');
        
        if (code) {
            navigator.clipboard.writeText(code.textContent).then(() => {
                const originalText = button.textContent;
                button.textContent = 'Copied!';
                button.style.background = '#28a745';
                
                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.background = '';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy:', err);
                this.showError('Failed to copy to clipboard');
            });
        }
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showError(message) {
        this.showAlert(message, 'danger');
    }

    showInfo(message) {
        this.showAlert(message, 'info');
    }

    showAlert(message, type) {
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());

        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(alert);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.sdkDemo = new DeveloperSDKDemo();
});
