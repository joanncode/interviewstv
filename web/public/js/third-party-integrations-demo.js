/**
 * Third-Party Integrations Demo
 * Manages the third-party integrations demo interface
 */
class ThirdPartyIntegrationsDemo {
    constructor() {
        this.apiBaseUrl = '/api/integrations';
        this.currentTab = 'apps';
        this.apps = [];
        this.connections = [];
        this.workflows = [];
        this.templates = [];
        this.analytics = null;
    }

    /**
     * Initialize the demo
     */
    async init() {
        console.log('Initializing Third-Party Integrations Demo...');
        
        this.setupEventListeners();
        await this.loadInitialData();
        this.updateDashboardMetrics();
        
        console.log('Third-Party Integrations Demo initialized successfully');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('#integrationTabs button[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const tabId = e.target.getAttribute('data-bs-target').substring(1);
                this.handleTabSwitch(tabId);
            });
        });

        // Search and filters
        document.getElementById('appSearch')?.addEventListener('input', (e) => {
            this.filterApps();
        });

        document.getElementById('appCategoryFilter')?.addEventListener('change', (e) => {
            this.filterApps();
        });

        document.getElementById('templateCategoryFilter')?.addEventListener('change', (e) => {
            this.filterTemplates();
        });

        document.getElementById('analyticsTimeRange')?.addEventListener('change', (e) => {
            this.loadAnalytics();
        });
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            await Promise.all([
                this.loadApps(),
                this.loadConnections(),
                this.loadWorkflows(),
                this.loadTemplates()
            ]);
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showAlert('Failed to load initial data', 'danger');
        }
    }

    // ==================== APPS MANAGEMENT ====================

    /**
     * Load available apps
     */
    async loadApps() {
        try {
            this.showLoading('appsContainer');

            // For demo purposes, use mock data
            const mockApps = [
                {
                    app_id: 'slack',
                    app_name: 'Slack',
                    app_category: 'communication',
                    app_description: 'Team communication and collaboration platform',
                    app_icon_url: null,
                    oauth_scopes: ['chat:write', 'channels:read', 'users:read'],
                    webhook_support: true,
                    status: 'active'
                },
                {
                    app_id: 'discord',
                    app_name: 'Discord',
                    app_category: 'communication',
                    app_description: 'Voice, video and text communication service',
                    app_icon_url: null,
                    oauth_scopes: ['bot', 'webhook.incoming', 'messages.read'],
                    webhook_support: true,
                    status: 'active'
                },
                {
                    app_id: 'zoom',
                    app_name: 'Zoom',
                    app_category: 'video',
                    app_description: 'Video conferencing and webinar platform',
                    app_icon_url: null,
                    oauth_scopes: ['meeting:write', 'meeting:read', 'recording:read'],
                    webhook_support: true,
                    status: 'active'
                },
                {
                    app_id: 'notion',
                    app_name: 'Notion',
                    app_category: 'productivity',
                    app_description: 'All-in-one workspace for notes, docs, and collaboration',
                    app_icon_url: null,
                    oauth_scopes: ['read', 'update', 'insert'],
                    webhook_support: false,
                    status: 'active'
                },
                {
                    app_id: 'google_drive',
                    app_name: 'Google Drive',
                    app_category: 'storage',
                    app_description: 'Cloud storage and file sharing',
                    app_icon_url: null,
                    oauth_scopes: ['https://www.googleapis.com/auth/drive'],
                    webhook_support: true,
                    status: 'active'
                },
                {
                    app_id: 'hubspot',
                    app_name: 'HubSpot',
                    app_category: 'crm',
                    app_description: 'Customer relationship management platform',
                    app_icon_url: null,
                    oauth_scopes: ['contacts', 'content', 'reports'],
                    webhook_support: true,
                    status: 'active'
                }
            ];

            this.apps = mockApps;
            this.renderApps();

        } catch (error) {
            console.error('Failed to load apps:', error);
            this.showError('appsContainer', 'Failed to load available apps');
        }
    }

    /**
     * Render apps
     */
    renderApps() {
        const container = document.getElementById('appsContainer');
        
        if (this.apps.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-store fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No apps available</p>
                </div>
            `;
            return;
        }

        const appsHTML = this.apps.map(app => `
            <div class="app-card" onclick="integrationsDemo.connectApp('${app.app_id}')">
                <div class="d-flex align-items-start">
                    <div class="app-icon me-3">
                        <i class="fas fa-${this.getAppIcon(app.app_id)}"></i>
                    </div>
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <h6 class="mb-1">${app.app_name}</h6>
                                <p class="text-muted mb-2">${app.app_description}</p>
                                <span class="badge bg-secondary">${app.app_category}</span>
                                ${app.webhook_support ? '<span class="badge bg-success ms-1">Webhooks</span>' : ''}
                            </div>
                            <button class="btn btn-outline-primary btn-sm">
                                <i class="fas fa-plug me-1"></i>
                                Connect
                            </button>
                        </div>
                        
                        <div class="mt-3">
                            <h6 class="small mb-2">Required Permissions:</h6>
                            <div class="d-flex flex-wrap gap-1">
                                ${app.oauth_scopes.map(scope => 
                                    `<span class="badge bg-dark">${scope}</span>`
                                ).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = appsHTML;
    }

    /**
     * Get app icon class
     */
    getAppIcon(appId) {
        const icons = {
            'slack': 'comments',
            'discord': 'gamepad',
            'zoom': 'video',
            'notion': 'sticky-note',
            'google_drive': 'cloud',
            'hubspot': 'chart-line',
            'microsoft_teams': 'users',
            'trello': 'tasks',
            'asana': 'project-diagram',
            'dropbox': 'box',
            'google_analytics': 'chart-bar',
            'salesforce': 'handshake'
        };
        return icons[appId] || 'plug';
    }

    /**
     * Filter apps
     */
    filterApps() {
        const search = document.getElementById('appSearch').value.toLowerCase();
        const category = document.getElementById('appCategoryFilter').value;

        let filteredApps = this.apps;

        if (search) {
            filteredApps = filteredApps.filter(app => 
                app.app_name.toLowerCase().includes(search) ||
                app.app_description.toLowerCase().includes(search)
            );
        }

        if (category) {
            filteredApps = filteredApps.filter(app => app.app_category === category);
        }

        // Temporarily store original apps and render filtered
        const originalApps = this.apps;
        this.apps = filteredApps;
        this.renderApps();
        this.apps = originalApps;
    }

    /**
     * Connect to app
     */
    async connectApp(appId) {
        try {
            const app = this.apps.find(a => a.app_id === appId);
            if (!app) return;

            // For demo purposes, simulate OAuth flow
            this.showAlert(`Initiating OAuth connection to ${app.app_name}...`, 'info');

            // Simulate delay
            setTimeout(() => {
                // Add to connections
                const newConnection = {
                    connection_id: 'conn_' + Date.now(),
                    app_id: appId,
                    app_name: app.app_name,
                    app_category: app.app_category,
                    app_icon_url: app.app_icon_url,
                    connection_name: `${app.app_name} Connection`,
                    is_active: true,
                    granted_scopes: app.oauth_scopes,
                    connection_metadata: {
                        connected_at: new Date().toISOString(),
                        user_info: { name: 'Demo User' }
                    },
                    last_used_at: new Date().toISOString(),
                    created_at: new Date().toISOString()
                };

                this.connections.push(newConnection);
                this.updateDashboardMetrics();
                this.showAlert(`Successfully connected to ${app.app_name}!`, 'success');

                // Switch to connections tab
                const connectionsTab = document.getElementById('connections-tab');
                connectionsTab.click();
            }, 2000);

        } catch (error) {
            console.error('Failed to connect app:', error);
            this.showAlert('Failed to connect to app: ' + error.message, 'danger');
        }
    }

    /**
     * Refresh apps
     */
    async refreshApps() {
        await this.loadApps();
        this.showAlert('Apps refreshed successfully', 'success');
    }

    // ==================== CONNECTIONS MANAGEMENT ====================

    /**
     * Load user connections
     */
    async loadConnections() {
        try {
            this.showLoading('connectionsContainer');

            // For demo purposes, use mock data
            const mockConnections = [
                {
                    connection_id: 'conn_slack_demo',
                    app_id: 'slack',
                    app_name: 'Slack',
                    app_category: 'communication',
                    connection_name: 'Interviews Team Workspace',
                    is_active: true,
                    granted_scopes: ['chat:write', 'channels:read'],
                    connection_metadata: {
                        workspace: 'Interviews Team',
                        user_name: 'demo_user'
                    },
                    last_used_at: '2024-01-15 10:30:00',
                    created_at: '2024-01-10 09:15:00'
                },
                {
                    connection_id: 'conn_zoom_demo',
                    app_id: 'zoom',
                    app_name: 'Zoom',
                    app_category: 'video',
                    connection_name: 'Zoom Pro Account',
                    is_active: true,
                    granted_scopes: ['meeting:write', 'meeting:read'],
                    connection_metadata: {
                        email: 'demo@interviews.tv',
                        account_type: 'Pro'
                    },
                    last_used_at: '2024-01-14 16:45:00',
                    created_at: '2024-01-08 14:20:00'
                }
            ];

            this.connections = mockConnections;
            this.renderConnections();

        } catch (error) {
            console.error('Failed to load connections:', error);
            this.showError('connectionsContainer', 'Failed to load connections');
        }
    }

    /**
     * Render connections
     */
    renderConnections() {
        const container = document.getElementById('connectionsContainer');
        
        if (this.connections.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-link fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No connections found</p>
                    <p class="text-muted">Connect to apps from the Available Apps tab</p>
                </div>
            `;
            return;
        }

        const connectionsHTML = this.connections.map(connection => `
            <div class="connection-card">
                <div class="d-flex align-items-start justify-content-between">
                    <div class="d-flex align-items-start">
                        <div class="app-icon me-3">
                            <i class="fas fa-${this.getAppIcon(connection.app_id)}"></i>
                        </div>
                        <div>
                            <h6 class="mb-1">${connection.connection_name}</h6>
                            <p class="text-muted mb-2">${connection.app_name} • ${connection.app_category}</p>
                            <span class="connection-status ${connection.is_active ? 'active' : 'inactive'}">
                                ${connection.is_active ? 'Connected' : 'Disconnected'}
                            </span>
                            <div class="mt-2">
                                <small class="text-muted">
                                    Last used: ${this.formatDate(connection.last_used_at)}
                                </small>
                            </div>
                        </div>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-primary btn-sm" onclick="integrationsDemo.testConnection('${connection.connection_id}')">
                            <i class="fas fa-vial me-1"></i>
                            Test
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="integrationsDemo.disconnectConnection('${connection.connection_id}')">
                            <i class="fas fa-unlink me-1"></i>
                            Disconnect
                        </button>
                    </div>
                </div>
                
                <div class="mt-3">
                    <h6 class="small mb-2">Granted Permissions:</h6>
                    <div class="d-flex flex-wrap gap-1">
                        ${connection.granted_scopes.map(scope => 
                            `<span class="badge bg-dark">${scope}</span>`
                        ).join('')}
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = connectionsHTML;
    }

    /**
     * Test connection
     */
    async testConnection(connectionId) {
        try {
            const connection = this.connections.find(c => c.connection_id === connectionId);
            if (!connection) return;

            this.showAlert(`Testing connection to ${connection.app_name}...`, 'info');

            // Simulate test
            setTimeout(() => {
                const success = Math.random() > 0.2; // 80% success rate
                if (success) {
                    this.showAlert(`Connection to ${connection.app_name} is working correctly!`, 'success');
                } else {
                    this.showAlert(`Connection test failed. Please reconnect ${connection.app_name}.`, 'warning');
                }
            }, 1500);

        } catch (error) {
            console.error('Failed to test connection:', error);
            this.showAlert('Failed to test connection: ' + error.message, 'danger');
        }
    }

    /**
     * Disconnect connection
     */
    async disconnectConnection(connectionId) {
        try {
            const connection = this.connections.find(c => c.connection_id === connectionId);
            if (!connection) return;

            if (!confirm(`Are you sure you want to disconnect ${connection.app_name}?`)) {
                return;
            }

            // Remove from connections
            this.connections = this.connections.filter(c => c.connection_id !== connectionId);
            this.renderConnections();
            this.updateDashboardMetrics();

            this.showAlert(`Successfully disconnected ${connection.app_name}`, 'success');

        } catch (error) {
            console.error('Failed to disconnect:', error);
            this.showAlert('Failed to disconnect: ' + error.message, 'danger');
        }
    }

    /**
     * Refresh connections
     */
    async refreshConnections() {
        await this.loadConnections();
        this.showAlert('Connections refreshed successfully', 'success');
    }

    // ==================== WORKFLOWS MANAGEMENT ====================

    /**
     * Load workflows
     */
    async loadWorkflows() {
        try {
            this.showLoading('workflowsContainer');

            // For demo purposes, use mock data
            const mockWorkflows = [
                {
                    workflow_id: 'workflow_slack_notifications',
                    workflow_name: 'Slack Interview Notifications',
                    workflow_description: 'Send notifications to Slack when interviews are created or completed',
                    trigger_type: 'event',
                    trigger_config: { event: 'interview.created' },
                    is_active: true,
                    execution_count: 45,
                    last_execution_at: '2024-01-15 14:30:00',
                    last_execution_status: 'completed',
                    created_at: '2024-01-10 09:00:00'
                },
                {
                    workflow_id: 'workflow_zoom_meetings',
                    workflow_name: 'Auto Zoom Meeting Creation',
                    workflow_description: 'Automatically create Zoom meetings when interviews are scheduled',
                    trigger_type: 'event',
                    trigger_config: { event: 'interview.scheduled' },
                    is_active: true,
                    execution_count: 23,
                    last_execution_at: '2024-01-14 11:15:00',
                    last_execution_status: 'completed',
                    created_at: '2024-01-08 16:45:00'
                }
            ];

            this.workflows = mockWorkflows;
            this.renderWorkflows();

        } catch (error) {
            console.error('Failed to load workflows:', error);
            this.showError('workflowsContainer', 'Failed to load workflows');
        }
    }

    /**
     * Render workflows
     */
    renderWorkflows() {
        const container = document.getElementById('workflowsContainer');

        if (this.workflows.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-project-diagram fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No workflows found</p>
                    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#createWorkflowModal">
                        <i class="fas fa-plus me-1"></i>
                        Create Your First Workflow
                    </button>
                </div>
            `;
            return;
        }

        const workflowsHTML = this.workflows.map(workflow => `
            <div class="workflow-card">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div>
                        <h6 class="mb-1">${workflow.workflow_name}</h6>
                        <p class="text-muted mb-2">${workflow.workflow_description}</p>
                        <div class="d-flex align-items-center gap-3">
                            <span class="badge ${workflow.is_active ? 'bg-success' : 'bg-secondary'}">
                                ${workflow.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <span class="badge bg-primary">${workflow.trigger_type}</span>
                            <small class="text-muted">
                                ${workflow.execution_count} executions
                            </small>
                        </div>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-primary btn-sm" onclick="integrationsDemo.executeWorkflow('${workflow.workflow_id}')">
                            <i class="fas fa-play me-1"></i>
                            Run
                        </button>
                        <button class="btn btn-outline-secondary btn-sm" onclick="integrationsDemo.toggleWorkflow('${workflow.workflow_id}')">
                            <i class="fas fa-${workflow.is_active ? 'pause' : 'play'} me-1"></i>
                            ${workflow.is_active ? 'Pause' : 'Resume'}
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="integrationsDemo.deleteWorkflow('${workflow.workflow_id}')">
                            <i class="fas fa-trash me-1"></i>
                            Delete
                        </button>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-6">
                        <small class="text-muted">Last Execution:</small><br>
                        <span class="text-light">${this.formatDate(workflow.last_execution_at)}</span>
                    </div>
                    <div class="col-md-6">
                        <small class="text-muted">Status:</small><br>
                        <span class="badge ${this.getExecutionStatusClass(workflow.last_execution_status)}">
                            ${workflow.last_execution_status}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = workflowsHTML;
    }

    /**
     * Get execution status CSS class
     */
    getExecutionStatusClass(status) {
        const classes = {
            'completed': 'bg-success',
            'failed': 'bg-danger',
            'partial': 'bg-warning',
            'running': 'bg-info'
        };
        return classes[status] || 'bg-secondary';
    }

    /**
     * Execute workflow
     */
    async executeWorkflow(workflowId) {
        try {
            const workflow = this.workflows.find(w => w.workflow_id === workflowId);
            if (!workflow) return;

            this.showAlert(`Executing workflow: ${workflow.workflow_name}...`, 'info');

            // Simulate execution
            setTimeout(() => {
                const success = Math.random() > 0.1; // 90% success rate
                workflow.execution_count++;
                workflow.last_execution_at = new Date().toISOString();
                workflow.last_execution_status = success ? 'completed' : 'failed';

                this.renderWorkflows();
                this.updateDashboardMetrics();

                if (success) {
                    this.showAlert(`Workflow executed successfully!`, 'success');
                } else {
                    this.showAlert(`Workflow execution failed. Check logs for details.`, 'danger');
                }
            }, 2000);

        } catch (error) {
            console.error('Failed to execute workflow:', error);
            this.showAlert('Failed to execute workflow: ' + error.message, 'danger');
        }
    }

    /**
     * Toggle workflow active status
     */
    async toggleWorkflow(workflowId) {
        try {
            const workflow = this.workflows.find(w => w.workflow_id === workflowId);
            if (!workflow) return;

            workflow.is_active = !workflow.is_active;
            this.renderWorkflows();
            this.updateDashboardMetrics();

            const status = workflow.is_active ? 'activated' : 'paused';
            this.showAlert(`Workflow ${status} successfully`, 'success');

        } catch (error) {
            console.error('Failed to toggle workflow:', error);
            this.showAlert('Failed to toggle workflow: ' + error.message, 'danger');
        }
    }

    /**
     * Delete workflow
     */
    async deleteWorkflow(workflowId) {
        try {
            const workflow = this.workflows.find(w => w.workflow_id === workflowId);
            if (!workflow) return;

            if (!confirm(`Are you sure you want to delete "${workflow.workflow_name}"?`)) {
                return;
            }

            this.workflows = this.workflows.filter(w => w.workflow_id !== workflowId);
            this.renderWorkflows();
            this.updateDashboardMetrics();

            this.showAlert('Workflow deleted successfully', 'success');

        } catch (error) {
            console.error('Failed to delete workflow:', error);
            this.showAlert('Failed to delete workflow: ' + error.message, 'danger');
        }
    }

    // ==================== TEMPLATES MANAGEMENT ====================

    /**
     * Load templates
     */
    async loadTemplates() {
        try {
            this.showLoading('templatesContainer');

            // For demo purposes, use mock data
            const mockTemplates = [
                {
                    template_id: 'slack_interview_notifications',
                    template_name: 'Slack Interview Notifications',
                    template_description: 'Send interview notifications to Slack channels',
                    template_category: 'communication',
                    app_id: 'slack',
                    app_name: 'Slack',
                    app_icon_url: null,
                    template_config: {
                        trigger: 'interview.created',
                        action: 'send_message',
                        channel: '#interviews',
                        message_template: 'New interview scheduled: {{title}} with {{guest_name}} on {{date}}'
                    },
                    required_scopes: ['chat:write', 'channels:read'],
                    usage_count: 45,
                    rating_average: 4.8,
                    rating_count: 12
                },
                {
                    template_id: 'zoom_auto_meetings',
                    template_name: 'Zoom Auto Meeting Creation',
                    template_description: 'Automatically create Zoom meetings for interviews',
                    template_category: 'automation',
                    app_id: 'zoom',
                    app_name: 'Zoom',
                    app_icon_url: null,
                    template_config: {
                        trigger: 'interview.scheduled',
                        action: 'create_meeting',
                        settings: { duration: 60, waiting_room: true, recording: 'cloud' }
                    },
                    required_scopes: ['meeting:write'],
                    usage_count: 67,
                    rating_average: 4.9,
                    rating_count: 18
                },
                {
                    template_id: 'notion_interview_docs',
                    template_name: 'Notion Interview Documentation',
                    template_description: 'Create Notion pages for interview summaries',
                    template_category: 'productivity',
                    app_id: 'notion',
                    app_name: 'Notion',
                    app_icon_url: null,
                    template_config: {
                        trigger: 'interview.completed',
                        action: 'create_page',
                        database_id: '{{database_id}}',
                        template: 'interview_summary'
                    },
                    required_scopes: ['read', 'update', 'insert'],
                    usage_count: 34,
                    rating_average: 4.6,
                    rating_count: 8
                }
            ];

            this.templates = mockTemplates;
            this.renderTemplates();

        } catch (error) {
            console.error('Failed to load templates:', error);
            this.showError('templatesContainer', 'Failed to load templates');
        }
    }

    /**
     * Render templates
     */
    renderTemplates() {
        const container = document.getElementById('templatesContainer');

        if (this.templates.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-file-code fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No templates available</p>
                </div>
            `;
            return;
        }

        const templatesHTML = this.templates.map(template => `
            <div class="template-card" onclick="integrationsDemo.useTemplate('${template.template_id}')">
                <div class="d-flex align-items-start justify-content-between mb-3">
                    <div class="d-flex align-items-start">
                        <div class="app-icon me-3">
                            <i class="fas fa-${this.getAppIcon(template.app_id)}"></i>
                        </div>
                        <div>
                            <h6 class="mb-1">${template.template_name}</h6>
                            <p class="text-muted mb-2">${template.template_description}</p>
                            <div class="d-flex align-items-center gap-2">
                                <span class="badge bg-secondary">${template.template_category}</span>
                                <span class="badge bg-primary">${template.app_name}</span>
                                <div class="d-flex align-items-center text-warning">
                                    <i class="fas fa-star me-1"></i>
                                    <span>${template.rating_average}</span>
                                    <small class="text-muted ms-1">(${template.rating_count})</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="text-end">
                        <div class="text-muted small">Used ${template.usage_count} times</div>
                        <button class="btn btn-outline-primary btn-sm mt-2">
                            <i class="fas fa-magic me-1"></i>
                            Use Template
                        </button>
                    </div>
                </div>

                <div class="mt-3">
                    <h6 class="small mb-2">Required Permissions:</h6>
                    <div class="d-flex flex-wrap gap-1">
                        ${template.required_scopes.map(scope =>
                            `<span class="badge bg-dark">${scope}</span>`
                        ).join('')}
                    </div>
                </div>

                <div class="mt-3">
                    <h6 class="small mb-2">Configuration Preview:</h6>
                    <div class="code-block">
                        <code>${JSON.stringify(template.template_config, null, 2)}</code>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = templatesHTML;
    }

    /**
     * Filter templates
     */
    filterTemplates() {
        const category = document.getElementById('templateCategoryFilter').value;

        let filteredTemplates = this.templates;

        if (category) {
            filteredTemplates = filteredTemplates.filter(template => template.template_category === category);
        }

        // Temporarily store original templates and render filtered
        const originalTemplates = this.templates;
        this.templates = filteredTemplates;
        this.renderTemplates();
        this.templates = originalTemplates;
    }

    /**
     * Use template
     */
    async useTemplate(templateId) {
        try {
            const template = this.templates.find(t => t.template_id === templateId);
            if (!template) return;

            // Check if user has the required app connected
            const hasConnection = this.connections.some(c => c.app_id === template.app_id && c.is_active);

            if (!hasConnection) {
                this.showAlert(`You need to connect ${template.app_name} first to use this template.`, 'warning');
                return;
            }

            this.showAlert(`Applying template: ${template.template_name}...`, 'info');

            // Simulate template application
            setTimeout(() => {
                // Create workflow from template
                const newWorkflow = {
                    workflow_id: 'workflow_' + Date.now(),
                    workflow_name: template.template_name,
                    workflow_description: template.template_description,
                    trigger_type: 'event',
                    trigger_config: { event: template.template_config.trigger },
                    is_active: true,
                    execution_count: 0,
                    last_execution_at: null,
                    last_execution_status: null,
                    created_at: new Date().toISOString()
                };

                this.workflows.push(newWorkflow);
                this.updateDashboardMetrics();
                this.showAlert(`Template applied successfully! Workflow "${template.template_name}" created.`, 'success');

                // Switch to workflows tab
                const workflowsTab = document.getElementById('workflows-tab');
                workflowsTab.click();
            }, 1500);

        } catch (error) {
            console.error('Failed to use template:', error);
            this.showAlert('Failed to apply template: ' + error.message, 'danger');
        }
    }

    /**
     * Refresh templates
     */
    async refreshTemplates() {
        await this.loadTemplates();
        this.showAlert('Templates refreshed successfully', 'success');
    }

    // ==================== ANALYTICS ====================

    /**
     * Load analytics
     */
    async loadAnalytics() {
        try {
            this.showLoading('analyticsContainer');

            const timeRange = document.getElementById('analyticsTimeRange')?.value || '30';

            // For demo purposes, generate mock analytics
            const mockAnalytics = this.generateMockAnalytics(parseInt(timeRange));
            this.analytics = mockAnalytics;
            this.renderAnalytics();

        } catch (error) {
            console.error('Failed to load analytics:', error);
            this.showError('analyticsContainer', 'Failed to load analytics');
        }
    }

    /**
     * Generate mock analytics
     */
    generateMockAnalytics(days) {
        const dailyStats = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);

            const apiCalls = Math.floor(Math.random() * 50) + 10;
            const successful = Math.floor(apiCalls * (0.85 + Math.random() * 0.1));
            const failed = apiCalls - successful;

            dailyStats.push({
                date: date.toISOString().split('T')[0],
                api_calls_count: apiCalls,
                successful_calls: successful,
                failed_calls: failed,
                average_response_time_ms: Math.floor(Math.random() * 300) + 100,
                workflow_executions: Math.floor(Math.random() * 10) + 2
            });
        }

        const totalCalls = dailyStats.reduce((sum, day) => sum + day.api_calls_count, 0);
        const totalSuccessful = dailyStats.reduce((sum, day) => sum + day.successful_calls, 0);
        const totalFailed = dailyStats.reduce((sum, day) => sum + day.failed_calls, 0);
        const avgResponseTime = dailyStats.reduce((sum, day) => sum + day.average_response_time_ms, 0) / dailyStats.length;
        const successRate = totalCalls > 0 ? (totalSuccessful / totalCalls) * 100 : 0;

        return {
            daily_stats: dailyStats,
            summary: {
                total_api_calls: totalCalls,
                successful_calls: totalSuccessful,
                failed_calls: totalFailed,
                success_rate: Math.round(successRate * 100) / 100,
                average_response_time_ms: Math.round(avgResponseTime),
                total_workflow_executions: dailyStats.reduce((sum, day) => sum + day.workflow_executions, 0)
            }
        };
    }

    /**
     * Render analytics
     */
    renderAnalytics() {
        const container = document.getElementById('analyticsContainer');

        if (!this.analytics) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-chart-bar fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No analytics data available</p>
                </div>
            `;
            return;
        }

        const analyticsHTML = `
            <div class="mb-4">
                <!-- Summary Stats -->
                <div class="row mb-4">
                    <div class="col-md-3 mb-3">
                        <div class="metric-card">
                            <div class="metric-value">${this.analytics.summary.total_api_calls}</div>
                            <div class="metric-label">Total API Calls</div>
                        </div>
                    </div>
                    <div class="col-md-3 mb-3">
                        <div class="metric-card">
                            <div class="metric-value">${this.analytics.summary.success_rate}%</div>
                            <div class="metric-label">Success Rate</div>
                        </div>
                    </div>
                    <div class="col-md-3 mb-3">
                        <div class="metric-card">
                            <div class="metric-value">${this.analytics.summary.average_response_time_ms}ms</div>
                            <div class="metric-label">Avg Response Time</div>
                        </div>
                    </div>
                    <div class="col-md-3 mb-3">
                        <div class="metric-card">
                            <div class="metric-value">${this.analytics.summary.total_workflow_executions}</div>
                            <div class="metric-label">Workflow Executions</div>
                        </div>
                    </div>
                </div>

                <!-- Daily Stats -->
                <div class="row">
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <h6 class="mb-0">API Call Trends</h6>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-dark table-sm">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Calls</th>
                                                <th>Success</th>
                                                <th>Failed</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${this.analytics.daily_stats.slice(-7).map(day => `
                                                <tr>
                                                    <td>${this.formatDate(day.date)}</td>
                                                    <td>${day.api_calls_count}</td>
                                                    <td class="text-success">${day.successful_calls}</td>
                                                    <td class="text-danger">${day.failed_calls}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <h6 class="mb-0">Performance Metrics</h6>
                            </div>
                            <div class="card-body">
                                <div class="mb-3">
                                    <div class="d-flex justify-content-between">
                                        <span>Total Successful Calls:</span>
                                        <span class="text-success">${this.analytics.summary.successful_calls}</span>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <div class="d-flex justify-content-between">
                                        <span>Total Failed Calls:</span>
                                        <span class="text-danger">${this.analytics.summary.failed_calls}</span>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <div class="d-flex justify-content-between">
                                        <span>Active Connections:</span>
                                        <span class="text-info">${this.connections.filter(c => c.is_active).length}</span>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <div class="d-flex justify-content-between">
                                        <span>Active Workflows:</span>
                                        <span class="text-warning">${this.workflows.filter(w => w.is_active).length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Chart Placeholder -->
                <div class="row mt-4">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                                <h6 class="mb-0">Usage Trends</h6>
                            </div>
                            <div class="card-body">
                                <div class="text-center py-4">
                                    <i class="fas fa-chart-line fa-3x text-muted mb-3"></i>
                                    <p class="text-muted">Chart visualization would be displayed here</p>
                                    <small class="text-muted">Integration with Chart.js or similar library recommended</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = analyticsHTML;
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Handle tab switching
     */
    handleTabSwitch(tabId) {
        this.currentTab = tabId;

        switch (tabId) {
            case 'apps':
                this.loadApps();
                break;
            case 'connections':
                this.loadConnections();
                break;
            case 'workflows':
                this.loadWorkflows();
                break;
            case 'templates':
                this.loadTemplates();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
        }
    }

    /**
     * Update dashboard metrics
     */
    updateDashboardMetrics() {
        const totalConnections = this.connections.length;
        const activeWorkflows = this.workflows.filter(w => w.is_active).length;
        const totalExecutions = this.workflows.reduce((sum, w) => sum + w.execution_count, 0);
        const successfulExecutions = this.workflows.filter(w => w.last_execution_status === 'completed').length;
        const successRate = this.workflows.length > 0 ? Math.round((successfulExecutions / this.workflows.length) * 100) : 0;

        document.getElementById('totalConnections').textContent = totalConnections;
        document.getElementById('activeWorkflows').textContent = activeWorkflows;
        document.getElementById('totalExecutions').textContent = totalExecutions;
        document.getElementById('successRate').textContent = successRate + '%';
    }

    /**
     * Format date for display
     */
    formatDate(dateString) {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    /**
     * Show loading spinner
     */
    showLoading(containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = `
            <div class="loading-spinner show">
                <i class="fas fa-spinner fa-spin fa-2x"></i>
                <p class="mt-2">Loading...</p>
            </div>
        `;
    }

    /**
     * Show error message
     */
    showError(containerId, message) {
        const container = document.getElementById(containerId);
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                <p class="text-danger">${message}</p>
                <button class="btn btn-outline-primary btn-sm" onclick="location.reload()">
                    <i class="fas fa-sync-alt me-1"></i>
                    Retry
                </button>
            </div>
        `;
    }

    /**
     * Show alert message
     */
    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer');
        const alertId = 'alert-' + Date.now();

        const alertHTML = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        alertContainer.insertAdjacentHTML('beforeend', alertHTML);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    }
}

// Export for global access
window.ThirdPartyIntegrationsDemo = ThirdPartyIntegrationsDemo;
