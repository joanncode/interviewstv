/**
 * Webhook Notifications Demo JavaScript Module
 * Handles webhook endpoint management, event subscriptions, delivery monitoring, and analytics
 */
class WebhookNotificationsDemo {
    constructor() {
        this.apiBaseUrl = '/api/webhooks';
        this.endpoints = [];
        this.eventTypes = [];
        this.templates = [];
        this.selectedEndpoint = null;
        this.currentTab = 'endpoints';
    }

    /**
     * Initialize the demo
     */
    async init() {
        console.log('Initializing Webhook Notifications Demo...');
        
        this.setupEventListeners();
        await this.loadInitialData();
        this.updateDashboardMetrics();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('#mainTabs button[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const tabId = e.target.getAttribute('data-bs-target').substring(1);
                this.handleTabSwitch(tabId);
            });
        });

        // Test event form
        const testEventForm = document.getElementById('testEventForm');
        if (testEventForm) {
            testEventForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.dispatchTestEvent();
            });
        }

        // Delivery endpoint filter
        const deliveryFilter = document.getElementById('deliveryEndpointFilter');
        if (deliveryFilter) {
            deliveryFilter.addEventListener('change', (e) => {
                this.loadDeliveryHistory(e.target.value);
            });
        }
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            await Promise.all([
                this.loadEndpoints(),
                this.loadEventTypes(),
                this.loadTemplates()
            ]);
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showAlert('Failed to load initial data', 'danger');
        }
    }

    // ==================== ENDPOINT MANAGEMENT ====================

    /**
     * Load webhook endpoints
     */
    async loadEndpoints() {
        try {
            this.showLoading('endpointsContainer');
            
            // For demo purposes, use mock data
            const mockEndpoints = [
                {
                    endpoint_id: 'webhook_demo_1',
                    name: 'Slack Notifications',
                    url: 'https://example.com/webhook/slack-demo',
                    description: 'Send interview notifications to Slack',
                    is_active: true,
                    total_deliveries: 156,
                    successful_deliveries: 152,
                    failed_deliveries: 4,
                    success_rate: 97.44,
                    subscription_count: 5,
                    last_success_at: '2024-01-15 14:30:00',
                    created_at: '2024-01-10 09:00:00'
                },
                {
                    endpoint_id: 'webhook_demo_2',
                    name: 'Discord Notifications',
                    url: 'https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz',
                    description: 'Send notifications to Discord channel',
                    is_active: true,
                    total_deliveries: 89,
                    successful_deliveries: 87,
                    failed_deliveries: 2,
                    success_rate: 97.75,
                    subscription_count: 3,
                    last_success_at: '2024-01-15 13:45:00',
                    created_at: '2024-01-12 11:30:00'
                },
                {
                    endpoint_id: 'webhook_demo_3',
                    name: 'Custom Analytics',
                    url: 'https://analytics.example.com/webhook',
                    description: 'Send events to custom analytics platform',
                    is_active: false,
                    total_deliveries: 23,
                    successful_deliveries: 18,
                    failed_deliveries: 5,
                    success_rate: 78.26,
                    subscription_count: 8,
                    last_success_at: '2024-01-14 16:20:00',
                    created_at: '2024-01-08 15:15:00'
                }
            ];

            this.endpoints = mockEndpoints;
            this.renderEndpoints();
            this.updateDeliveryEndpointFilter();

        } catch (error) {
            console.error('Failed to load endpoints:', error);
            this.showError('endpointsContainer', 'Failed to load webhook endpoints');
        }
    }

    /**
     * Render endpoints
     */
    renderEndpoints() {
        const container = document.getElementById('endpointsContainer');
        
        if (this.endpoints.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-link fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No webhook endpoints configured</p>
                    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#createEndpointModal">
                        <i class="fas fa-plus me-1"></i>
                        Create Your First Endpoint
                    </button>
                </div>
            `;
            return;
        }

        const endpointsHTML = this.endpoints.map(endpoint => {
            const statusClass = endpoint.is_active ? 'status-active' : 'status-inactive';
            const statusText = endpoint.is_active ? 'Active' : 'Inactive';
            
            return `
                <div class="endpoint-card card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <h6 class="card-title mb-1">
                                    <span class="status-indicator ${statusClass}"></span>
                                    ${endpoint.name}
                                </h6>
                                <p class="text-muted mb-1">${endpoint.description || 'No description'}</p>
                                <small class="text-muted">${endpoint.url}</small>
                            </div>
                            <div class="dropdown">
                                <button class="btn btn-outline-secondary btn-sm" type="button" data-bs-toggle="dropdown">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <ul class="dropdown-menu dropdown-menu-dark">
                                    <li><a class="dropdown-item" href="#" onclick="webhookDemo.viewEndpointDetails('${endpoint.endpoint_id}')">
                                        <i class="fas fa-eye me-2"></i>View Details
                                    </a></li>
                                    <li><a class="dropdown-item" href="#" onclick="webhookDemo.manageSubscriptions('${endpoint.endpoint_id}')">
                                        <i class="fas fa-cog me-2"></i>Manage Subscriptions
                                    </a></li>
                                    <li><a class="dropdown-item" href="#" onclick="webhookDemo.viewAnalytics('${endpoint.endpoint_id}')">
                                        <i class="fas fa-chart-line me-2"></i>View Analytics
                                    </a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item" href="#" onclick="webhookDemo.toggleEndpoint('${endpoint.endpoint_id}')">
                                        <i class="fas fa-power-off me-2"></i>${endpoint.is_active ? 'Disable' : 'Enable'}
                                    </a></li>
                                    <li><a class="dropdown-item text-danger" href="#" onclick="webhookDemo.deleteEndpoint('${endpoint.endpoint_id}')">
                                        <i class="fas fa-trash me-2"></i>Delete
                                    </a></li>
                                </ul>
                            </div>
                        </div>
                        
                        <div class="row text-center">
                            <div class="col-3">
                                <div class="small text-muted">Deliveries</div>
                                <div class="fw-bold">${endpoint.total_deliveries}</div>
                            </div>
                            <div class="col-3">
                                <div class="small text-muted">Success Rate</div>
                                <div class="fw-bold text-success">${endpoint.success_rate}%</div>
                            </div>
                            <div class="col-3">
                                <div class="small text-muted">Subscriptions</div>
                                <div class="fw-bold">${endpoint.subscription_count}</div>
                            </div>
                            <div class="col-3">
                                <div class="small text-muted">Status</div>
                                <div class="fw-bold">${statusText}</div>
                            </div>
                        </div>
                        
                        ${endpoint.last_success_at ? `
                            <div class="mt-2">
                                <small class="text-muted">
                                    <i class="fas fa-clock me-1"></i>
                                    Last success: ${this.formatDate(endpoint.last_success_at)}
                                </small>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = endpointsHTML;
    }

    /**
     * Create new endpoint
     */
    async createEndpoint() {
        try {
            const form = document.getElementById('createEndpointForm');
            const formData = new FormData(form);

            const endpointData = {
                name: document.getElementById('endpointName').value,
                url: document.getElementById('endpointUrl').value,
                description: document.getElementById('endpointDescription').value,
                timeout_seconds: parseInt(document.getElementById('endpointTimeout').value),
                retry_attempts: parseInt(document.getElementById('endpointRetries').value),
                failure_threshold: parseInt(document.getElementById('endpointFailureThreshold').value),
                secret_key: document.getElementById('endpointSecretKey').value
            };

            // Parse custom headers if provided
            const headersText = document.getElementById('endpointHeaders').value.trim();
            if (headersText) {
                try {
                    endpointData.headers = JSON.parse(headersText);
                } catch (e) {
                    throw new Error('Invalid JSON format for custom headers');
                }
            }

            // For demo purposes, simulate endpoint creation
            const newEndpoint = {
                endpoint_id: 'webhook_demo_' + Date.now(),
                ...endpointData,
                is_active: true,
                total_deliveries: 0,
                successful_deliveries: 0,
                failed_deliveries: 0,
                success_rate: 0,
                subscription_count: 0,
                created_at: new Date().toISOString()
            };

            this.endpoints.push(newEndpoint);
            this.renderEndpoints();
            this.updateDashboardMetrics();
            this.updateDeliveryEndpointFilter();

            // Close modal and reset form
            const modal = bootstrap.Modal.getInstance(document.getElementById('createEndpointModal'));
            modal.hide();
            form.reset();

            this.showAlert('Webhook endpoint created successfully!', 'success');

        } catch (error) {
            console.error('Failed to create endpoint:', error);
            this.showAlert('Failed to create endpoint: ' + error.message, 'danger');
        }
    }

    /**
     * Delete endpoint
     */
    async deleteEndpoint(endpointId) {
        if (!confirm('Are you sure you want to delete this webhook endpoint? This action cannot be undone.')) {
            return;
        }

        try {
            // For demo purposes, remove from local array
            this.endpoints = this.endpoints.filter(e => e.endpoint_id !== endpointId);
            this.renderEndpoints();
            this.updateDashboardMetrics();
            this.updateDeliveryEndpointFilter();

            this.showAlert('Webhook endpoint deleted successfully', 'success');

        } catch (error) {
            console.error('Failed to delete endpoint:', error);
            this.showAlert('Failed to delete endpoint: ' + error.message, 'danger');
        }
    }

    /**
     * Toggle endpoint active status
     */
    async toggleEndpoint(endpointId) {
        try {
            const endpoint = this.endpoints.find(e => e.endpoint_id === endpointId);
            if (!endpoint) return;

            endpoint.is_active = !endpoint.is_active;
            this.renderEndpoints();

            const status = endpoint.is_active ? 'enabled' : 'disabled';
            this.showAlert(`Webhook endpoint ${status} successfully`, 'success');

        } catch (error) {
            console.error('Failed to toggle endpoint:', error);
            this.showAlert('Failed to update endpoint status', 'danger');
        }
    }

    // ==================== EVENT TYPES MANAGEMENT ====================

    /**
     * Load available event types
     */
    async loadEventTypes() {
        try {
            this.showLoading('eventTypesContainer');

            // For demo purposes, use mock data
            const mockEventTypes = {
                'interview': [
                    {
                        event_type_id: 'interview.created',
                        event_name: 'Interview Created',
                        description: 'Triggered when a new interview is created',
                        payload_schema: {
                            type: 'object',
                            properties: {
                                interview_id: { type: 'string' },
                                title: { type: 'string' },
                                host_id: { type: 'integer' },
                                guest_id: { type: 'integer' },
                                scheduled_at: { type: 'string', format: 'date-time' }
                            }
                        }
                    },
                    {
                        event_type_id: 'interview.started',
                        event_name: 'Interview Started',
                        description: 'Triggered when an interview begins',
                        payload_schema: {
                            type: 'object',
                            properties: {
                                interview_id: { type: 'string' },
                                started_at: { type: 'string', format: 'date-time' },
                                participants: { type: 'array' }
                            }
                        }
                    },
                    {
                        event_type_id: 'interview.ended',
                        event_name: 'Interview Ended',
                        description: 'Triggered when an interview ends',
                        payload_schema: {
                            type: 'object',
                            properties: {
                                interview_id: { type: 'string' },
                                ended_at: { type: 'string', format: 'date-time' },
                                duration_minutes: { type: 'integer' }
                            }
                        }
                    }
                ],
                'streaming': [
                    {
                        event_type_id: 'stream.started',
                        event_name: 'Stream Started',
                        description: 'Triggered when a live stream begins',
                        payload_schema: {
                            type: 'object',
                            properties: {
                                stream_id: { type: 'string' },
                                platform: { type: 'string' },
                                started_at: { type: 'string', format: 'date-time' },
                                viewer_count: { type: 'integer' }
                            }
                        }
                    },
                    {
                        event_type_id: 'stream.ended',
                        event_name: 'Stream Ended',
                        description: 'Triggered when a live stream ends',
                        payload_schema: {
                            type: 'object',
                            properties: {
                                stream_id: { type: 'string' },
                                platform: { type: 'string' },
                                ended_at: { type: 'string', format: 'date-time' },
                                total_viewers: { type: 'integer' }
                            }
                        }
                    }
                ],
                'user': [
                    {
                        event_type_id: 'user.registered',
                        event_name: 'User Registered',
                        description: 'Triggered when a new user registers',
                        payload_schema: {
                            type: 'object',
                            properties: {
                                user_id: { type: 'integer' },
                                email: { type: 'string' },
                                username: { type: 'string' },
                                registered_at: { type: 'string', format: 'date-time' }
                            }
                        }
                    }
                ],
                'ai': [
                    {
                        event_type_id: 'ai.transcription_complete',
                        event_name: 'AI Transcription Complete',
                        description: 'Triggered when AI transcription is completed',
                        payload_schema: {
                            type: 'object',
                            properties: {
                                interview_id: { type: 'string' },
                                transcription_id: { type: 'string' },
                                language: { type: 'string' },
                                confidence_score: { type: 'number' }
                            }
                        }
                    }
                ]
            };

            this.eventTypes = mockEventTypes;
            this.renderEventTypes();
            this.populateTestEventTypes();

        } catch (error) {
            console.error('Failed to load event types:', error);
            this.showError('eventTypesContainer', 'Failed to load event types');
        }
    }

    /**
     * Render event types
     */
    renderEventTypes() {
        const container = document.getElementById('eventTypesContainer');

        const categoriesHTML = Object.entries(this.eventTypes).map(([category, events]) => {
            const eventsHTML = events.map(event => `
                <div class="event-type-card card mb-2" data-event-id="${event.event_type_id}">
                    <div class="card-body py-2">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1">${event.event_name}</h6>
                                <p class="text-muted mb-0 small">${event.description}</p>
                            </div>
                            <div>
                                <button class="btn btn-outline-primary btn-sm" onclick="webhookDemo.viewEventSchema('${event.event_type_id}')">
                                    <i class="fas fa-code me-1"></i>
                                    Schema
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');

            return `
                <div class="mb-4">
                    <h5 class="text-capitalize mb-3">
                        <i class="fas fa-folder me-2"></i>
                        ${category} Events
                    </h5>
                    ${eventsHTML}
                </div>
            `;
        }).join('');

        container.innerHTML = categoriesHTML;
    }

    /**
     * View event schema
     */
    viewEventSchema(eventTypeId) {
        const event = this.findEventType(eventTypeId);
        if (!event) return;

        const schemaJson = JSON.stringify(event.payload_schema, null, 2);

        this.showAlert(`
            <strong>${event.event_name} Schema:</strong><br>
            <pre class="mt-2 p-2 bg-dark border rounded"><code>${schemaJson}</code></pre>
        `, 'info');
    }

    /**
     * Find event type by ID
     */
    findEventType(eventTypeId) {
        for (const category of Object.values(this.eventTypes)) {
            const event = category.find(e => e.event_type_id === eventTypeId);
            if (event) return event;
        }
        return null;
    }

    /**
     * Populate test event types dropdown
     */
    populateTestEventTypes() {
        const select = document.getElementById('testEventType');
        if (!select) return;

        let optionsHTML = '<option value="">Select event type...</option>';

        Object.entries(this.eventTypes).forEach(([category, events]) => {
            optionsHTML += `<optgroup label="${category.charAt(0).toUpperCase() + category.slice(1)} Events">`;
            events.forEach(event => {
                optionsHTML += `<option value="${event.event_type_id}">${event.event_name}</option>`;
            });
            optionsHTML += '</optgroup>';
        });

        select.innerHTML = optionsHTML;
    }

    // ==================== DELIVERY MANAGEMENT ====================

    /**
     * Update delivery endpoint filter
     */
    updateDeliveryEndpointFilter() {
        const select = document.getElementById('deliveryEndpointFilter');
        if (!select) return;

        let optionsHTML = '<option value="">All Endpoints</option>';
        this.endpoints.forEach(endpoint => {
            optionsHTML += `<option value="${endpoint.endpoint_id}">${endpoint.name}</option>`;
        });

        select.innerHTML = optionsHTML;
    }

    /**
     * Load delivery history
     */
    async loadDeliveryHistory(endpointId = '') {
        try {
            const container = document.getElementById('deliveriesContainer');

            if (!endpointId) {
                container.innerHTML = `
                    <div class="text-center py-4">
                        <i class="fas fa-info-circle fa-3x text-muted mb-3"></i>
                        <p class="text-muted">Select an endpoint to view delivery history</p>
                    </div>
                `;
                return;
            }

            this.showLoading('deliveriesContainer');

            // For demo purposes, generate mock delivery data
            const mockDeliveries = this.generateMockDeliveries(endpointId);
            this.renderDeliveryHistory(mockDeliveries);

        } catch (error) {
            console.error('Failed to load delivery history:', error);
            this.showError('deliveriesContainer', 'Failed to load delivery history');
        }
    }

    /**
     * Generate mock delivery data
     */
    generateMockDeliveries(endpointId) {
        const endpoint = this.endpoints.find(e => e.endpoint_id === endpointId);
        if (!endpoint) return [];

        const deliveries = [];
        const statuses = ['delivered', 'failed', 'pending'];
        const eventTypes = ['interview.created', 'interview.started', 'stream.started', 'user.registered'];

        for (let i = 0; i < 20; i++) {
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
            const date = new Date(Date.now() - (i * 3600000)); // Hours ago

            deliveries.push({
                delivery_id: `delivery_${endpointId}_${i}`,
                event_type_id: eventType,
                event_name: this.getEventName(eventType),
                status: status,
                http_status_code: status === 'delivered' ? 200 : (status === 'failed' ? 500 : null),
                attempt_count: status === 'failed' ? Math.floor(Math.random() * 3) + 1 : 1,
                scheduled_at: date.toISOString(),
                delivered_at: status === 'delivered' ? date.toISOString() : null,
                failed_at: status === 'failed' ? date.toISOString() : null,
                processing_time_ms: status === 'delivered' ? Math.floor(Math.random() * 1000) + 100 : null,
                error_message: status === 'failed' ? 'Connection timeout' : null
            });
        }

        return deliveries;
    }

    /**
     * Get event name by type ID
     */
    getEventName(eventTypeId) {
        const event = this.findEventType(eventTypeId);
        return event ? event.event_name : eventTypeId;
    }

    /**
     * Render delivery history
     */
    renderDeliveryHistory(deliveries) {
        const container = document.getElementById('deliveriesContainer');

        if (deliveries.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-paper-plane fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No deliveries found for this endpoint</p>
                </div>
            `;
            return;
        }

        const tableHTML = `
            <div class="table-responsive">
                <table class="table table-dark table-hover">
                    <thead>
                        <tr>
                            <th>Event</th>
                            <th>Status</th>
                            <th>HTTP Status</th>
                            <th>Attempts</th>
                            <th>Processing Time</th>
                            <th>Timestamp</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${deliveries.map(delivery => `
                            <tr>
                                <td>
                                    <div class="fw-bold">${delivery.event_name}</div>
                                    <small class="text-muted">${delivery.event_type_id}</small>
                                </td>
                                <td>
                                    <span class="badge ${this.getStatusBadgeClass(delivery.status)}">
                                        ${delivery.status.charAt(0).toUpperCase() + delivery.status.slice(1)}
                                    </span>
                                </td>
                                <td>
                                    ${delivery.http_status_code ? `
                                        <span class="delivery-status-${delivery.status}">${delivery.http_status_code}</span>
                                    ` : '-'}
                                </td>
                                <td>${delivery.attempt_count}</td>
                                <td>
                                    ${delivery.processing_time_ms ? `${delivery.processing_time_ms}ms` : '-'}
                                </td>
                                <td>
                                    <div>${this.formatDate(delivery.scheduled_at)}</div>
                                    ${delivery.delivered_at ? `<small class="text-success">Delivered: ${this.formatTime(delivery.delivered_at)}</small>` : ''}
                                    ${delivery.failed_at ? `<small class="text-danger">Failed: ${this.formatTime(delivery.failed_at)}</small>` : ''}
                                </td>
                                <td>
                                    <div class="btn-group btn-group-sm">
                                        <button class="btn btn-outline-primary" onclick="webhookDemo.viewDeliveryDetails('${delivery.delivery_id}')" title="View Details">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        ${delivery.status === 'failed' ? `
                                            <button class="btn btn-outline-warning" onclick="webhookDemo.retryDelivery('${delivery.delivery_id}')" title="Retry">
                                                <i class="fas fa-redo"></i>
                                            </button>
                                        ` : ''}
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = tableHTML;
    }

    /**
     * Get status badge class
     */
    getStatusBadgeClass(status) {
        const classes = {
            'delivered': 'bg-success',
            'failed': 'bg-danger',
            'pending': 'bg-warning'
        };
        return classes[status] || 'bg-secondary';
    }

    /**
     * Retry delivery
     */
    async retryDelivery(deliveryId) {
        try {
            // For demo purposes, simulate retry
            this.showAlert('Delivery retry initiated successfully', 'success');

            // Reload delivery history for current endpoint
            const currentEndpoint = document.getElementById('deliveryEndpointFilter').value;
            if (currentEndpoint) {
                setTimeout(() => this.loadDeliveryHistory(currentEndpoint), 1000);
            }

        } catch (error) {
            console.error('Failed to retry delivery:', error);
            this.showAlert('Failed to retry delivery: ' + error.message, 'danger');
        }
    }

    /**
     * View delivery details
     */
    viewDeliveryDetails(deliveryId) {
        this.showAlert(`Delivery details for ${deliveryId} would be displayed in a modal`, 'info');
    }

    // ==================== ANALYTICS ====================

    /**
     * View analytics for endpoint
     */
    async viewAnalytics(endpointId) {
        try {
            // Switch to analytics tab
            const analyticsTab = document.getElementById('analytics-tab');
            analyticsTab.click();

            this.selectedEndpoint = endpointId;
            await this.loadAnalytics(endpointId);

        } catch (error) {
            console.error('Failed to view analytics:', error);
            this.showAlert('Failed to load analytics', 'danger');
        }
    }

    /**
     * Load analytics data
     */
    async loadAnalytics(endpointId) {
        try {
            const container = document.getElementById('analyticsContainer');

            if (!endpointId) {
                container.innerHTML = `
                    <div class="text-center py-4">
                        <i class="fas fa-chart-bar fa-3x text-muted mb-3"></i>
                        <p class="text-muted">Select an endpoint to view analytics</p>
                    </div>
                `;
                return;
            }

            this.showLoading('analyticsContainer');

            const endpoint = this.endpoints.find(e => e.endpoint_id === endpointId);
            if (!endpoint) return;

            // Generate mock analytics data
            const analytics = this.generateMockAnalytics(endpoint);
            this.renderAnalytics(analytics, endpoint);

        } catch (error) {
            console.error('Failed to load analytics:', error);
            this.showError('analyticsContainer', 'Failed to load analytics');
        }
    }

    /**
     * Generate mock analytics data
     */
    generateMockAnalytics(endpoint) {
        const days = 30;
        const dailyStats = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);

            const events = Math.floor(Math.random() * 20) + 5;
            const successful = Math.floor(events * (0.85 + Math.random() * 0.1));
            const failed = events - successful;

            dailyStats.push({
                date: date.toISOString().split('T')[0],
                total_events: events,
                successful_deliveries: successful,
                failed_deliveries: failed,
                avg_response_time: Math.floor(Math.random() * 500) + 200,
                uptime_percentage: 95 + Math.random() * 5
            });
        }

        const eventTypeBreakdown = [
            { event_name: 'Interview Created', delivery_count: 45, successful_count: 43 },
            { event_name: 'Interview Started', delivery_count: 38, successful_count: 37 },
            { event_name: 'Stream Started', delivery_count: 32, successful_count: 31 },
            { event_name: 'User Registered', delivery_count: 28, successful_count: 26 }
        ];

        return {
            daily_stats: dailyStats,
            overall_stats: {
                total_deliveries: endpoint.total_deliveries,
                successful_deliveries: endpoint.successful_deliveries,
                failed_deliveries: endpoint.failed_deliveries,
                success_rate: endpoint.success_rate,
                avg_response_time: Math.floor(Math.random() * 300) + 150,
                min_response_time: 89,
                max_response_time: 1247
            },
            event_type_breakdown: eventTypeBreakdown
        };
    }

    /**
     * Render analytics
     */
    renderAnalytics(analytics, endpoint) {
        const container = document.getElementById('analyticsContainer');

        const analyticsHTML = `
            <div class="mb-4">
                <h6 class="mb-3">Analytics for: ${endpoint.name}</h6>

                <!-- Overall Stats -->
                <div class="row mb-4">
                    <div class="col-md-3 mb-3">
                        <div class="metric-card">
                            <div class="metric-value">${analytics.overall_stats.total_deliveries}</div>
                            <div class="metric-label">Total Deliveries</div>
                        </div>
                    </div>
                    <div class="col-md-3 mb-3">
                        <div class="metric-card">
                            <div class="metric-value">${analytics.overall_stats.success_rate}%</div>
                            <div class="metric-label">Success Rate</div>
                        </div>
                    </div>
                    <div class="col-md-3 mb-3">
                        <div class="metric-card">
                            <div class="metric-value">${analytics.overall_stats.avg_response_time}ms</div>
                            <div class="metric-label">Avg Response Time</div>
                        </div>
                    </div>
                    <div class="col-md-3 mb-3">
                        <div class="metric-card">
                            <div class="metric-value">${analytics.overall_stats.successful_deliveries}</div>
                            <div class="metric-label">Successful Deliveries</div>
                        </div>
                    </div>
                </div>

                <!-- Event Type Breakdown -->
                <div class="row">
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <h6 class="mb-0">Event Type Breakdown</h6>
                            </div>
                            <div class="card-body">
                                ${analytics.event_type_breakdown.map(event => {
                                    const successRate = event.delivery_count > 0
                                        ? Math.round((event.successful_count / event.delivery_count) * 100)
                                        : 0;
                                    return `
                                        <div class="d-flex justify-content-between align-items-center mb-3">
                                            <div>
                                                <div class="fw-bold">${event.event_name}</div>
                                                <small class="text-muted">${event.delivery_count} deliveries</small>
                                            </div>
                                            <div class="text-end">
                                                <div class="text-success">${successRate}% success</div>
                                                <small class="text-muted">${event.successful_count}/${event.delivery_count}</small>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
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
                                        <span>Min Response Time:</span>
                                        <span class="text-success">${analytics.overall_stats.min_response_time}ms</span>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <div class="d-flex justify-content-between">
                                        <span>Max Response Time:</span>
                                        <span class="text-warning">${analytics.overall_stats.max_response_time}ms</span>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <div class="d-flex justify-content-between">
                                        <span>Failed Deliveries:</span>
                                        <span class="text-danger">${analytics.overall_stats.failed_deliveries}</span>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <div class="d-flex justify-content-between">
                                        <span>Endpoint Status:</span>
                                        <span class="${endpoint.is_active ? 'text-success' : 'text-danger'}">
                                            ${endpoint.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Daily Stats Chart Placeholder -->
                <div class="row mt-4">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                                <h6 class="mb-0">Daily Delivery Trends (Last 30 Days)</h6>
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

    // ==================== TEMPLATES ====================

    /**
     * Load webhook templates
     */
    async loadTemplates() {
        try {
            this.showLoading('templatesContainer');

            // For demo purposes, use mock templates
            const mockTemplates = [
                {
                    template_id: 'slack_notifications',
                    name: 'Slack Notifications',
                    description: 'Send interview notifications to Slack channels',
                    category: 'integration',
                    endpoint_template: {
                        url: 'https://example.com/webhook/slack-notifications',
                        timeout_seconds: 30,
                        retry_attempts: 3
                    },
                    event_subscriptions: ['interview.created', 'interview.started', 'interview.ended'],
                    payload_template: {
                        text: '{{event_name}}: {{interview.title}}',
                        channel: '#interviews',
                        username: 'Interviews.tv'
                    },
                    usage_count: 156
                },
                {
                    template_id: 'discord_notifications',
                    name: 'Discord Notifications',
                    description: 'Send interview notifications to Discord channels',
                    category: 'integration',
                    endpoint_template: {
                        url: 'https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK',
                        timeout_seconds: 30,
                        retry_attempts: 3
                    },
                    event_subscriptions: ['interview.created', 'interview.started', 'stream.started'],
                    payload_template: {
                        content: '**{{event_name}}**: {{interview.title}}',
                        username: 'Interviews.tv'
                    },
                    usage_count: 89
                },
                {
                    template_id: 'zapier_integration',
                    name: 'Zapier Integration',
                    description: 'Connect with Zapier for workflow automation',
                    category: 'integration',
                    endpoint_template: {
                        url: 'https://hooks.zapier.com/hooks/catch/YOUR/ZAPIER/HOOK',
                        timeout_seconds: 45,
                        retry_attempts: 5
                    },
                    event_subscriptions: ['interview.created', 'interview.ended', 'user.registered'],
                    payload_template: {
                        event: '{{event_name}}',
                        data: '{{event_data}}',
                        timestamp: '{{timestamp}}'
                    },
                    usage_count: 234
                }
            ];

            this.templates = mockTemplates;
            this.renderTemplates();

        } catch (error) {
            console.error('Failed to load templates:', error);
            this.showError('templatesContainer', 'Failed to load webhook templates');
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
                    <p class="text-muted">No webhook templates available</p>
                </div>
            `;
            return;
        }

        const templatesHTML = this.templates.map(template => `
            <div class="template-card card mb-3" onclick="webhookDemo.useTemplate('${template.template_id}')">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            <h6 class="card-title mb-1">${template.name}</h6>
                            <p class="text-muted mb-2">${template.description}</p>
                            <span class="badge bg-secondary">${template.category}</span>
                        </div>
                        <div class="text-end">
                            <div class="text-muted small">Used ${template.usage_count} times</div>
                        </div>
                    </div>

                    <div class="mt-3">
                        <h6 class="small mb-2">Event Subscriptions:</h6>
                        <div class="d-flex flex-wrap gap-1">
                            ${template.event_subscriptions.map(event =>
                                `<span class="badge bg-primary">${event}</span>`
                            ).join('')}
                        </div>
                    </div>

                    <div class="mt-3">
                        <h6 class="small mb-2">Payload Template:</h6>
                        <div class="code-block">
                            <code>${JSON.stringify(template.payload_template, null, 2)}</code>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = templatesHTML;
    }

    /**
     * Use template to create endpoint
     */
    useTemplate(templateId) {
        const template = this.templates.find(t => t.template_id === templateId);
        if (!template) return;

        // Pre-fill the create endpoint form
        document.getElementById('endpointName').value = template.name;
        document.getElementById('endpointUrl').value = template.endpoint_template.url;
        document.getElementById('endpointDescription').value = template.description;
        document.getElementById('endpointTimeout').value = template.endpoint_template.timeout_seconds || 30;
        document.getElementById('endpointRetries').value = template.endpoint_template.retry_attempts || 3;

        if (template.endpoint_template.headers) {
            document.getElementById('endpointHeaders').value = JSON.stringify(template.endpoint_template.headers, null, 2);
        }

        // Show the create endpoint modal
        const modal = new bootstrap.Modal(document.getElementById('createEndpointModal'));
        modal.show();

        this.showAlert(`Template "${template.name}" loaded into form`, 'success');
    }

    // ==================== TESTING ====================

    /**
     * Dispatch test event
     */
    async dispatchTestEvent() {
        try {
            const eventTypeId = document.getElementById('testEventType').value;
            const eventDataText = document.getElementById('testEventData').value.trim();

            if (!eventTypeId) {
                this.showAlert('Please select an event type', 'warning');
                return;
            }

            let eventData = {};
            if (eventDataText) {
                try {
                    eventData = JSON.parse(eventDataText);
                } catch (e) {
                    this.showAlert('Invalid JSON format for event data', 'danger');
                    return;
                }
            } else {
                // Use default test data
                eventData = {
                    test: true,
                    timestamp: new Date().toISOString(),
                    message: 'Test event from webhook demo'
                };
            }

            // For demo purposes, simulate test event dispatch
            const result = {
                success: true,
                queue_id: 'queue_test_' + Date.now(),
                message: 'Test event dispatched successfully',
                endpoints_notified: this.endpoints.filter(e => e.is_active).length
            };

            this.renderTestResults(result, eventTypeId, eventData);
            this.showAlert('Test event dispatched successfully!', 'success');

        } catch (error) {
            console.error('Failed to dispatch test event:', error);
            this.showAlert('Failed to dispatch test event: ' + error.message, 'danger');
        }
    }

    /**
     * Render test results
     */
    renderTestResults(result, eventTypeId, eventData) {
        const container = document.getElementById('testResultsContainer');

        const resultsHTML = `
            <div class="alert alert-success">
                <h6 class="alert-heading">
                    <i class="fas fa-check-circle me-2"></i>
                    Test Event Dispatched
                </h6>
                <p class="mb-2">${result.message}</p>
                <hr>
                <div class="mb-0">
                    <strong>Queue ID:</strong> ${result.queue_id}<br>
                    <strong>Event Type:</strong> ${eventTypeId}<br>
                    <strong>Endpoints Notified:</strong> ${result.endpoints_notified}
                </div>
            </div>

            <div class="card mt-3">
                <div class="card-header">
                    <h6 class="mb-0">Event Data Sent</h6>
                </div>
                <div class="card-body">
                    <div class="code-block">
                        <code>${JSON.stringify(eventData, null, 2)}</code>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = resultsHTML;
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Handle tab switching
     */
    handleTabSwitch(tabId) {
        this.currentTab = tabId;

        switch (tabId) {
            case 'endpoints':
                this.loadEndpoints();
                break;
            case 'events':
                this.loadEventTypes();
                break;
            case 'deliveries':
                // Deliveries are loaded when endpoint is selected
                break;
            case 'analytics':
                if (this.selectedEndpoint) {
                    this.loadAnalytics(this.selectedEndpoint);
                }
                break;
            case 'templates':
                this.loadTemplates();
                break;
            case 'testing':
                // Testing tab doesn't need additional loading
                break;
        }
    }

    /**
     * View endpoint details
     */
    viewEndpointDetails(endpointId) {
        const endpoint = this.endpoints.find(e => e.endpoint_id === endpointId);
        if (!endpoint) return;

        // For demo purposes, show basic details in alert
        this.showAlert(`
            <strong>Endpoint Details:</strong><br>
            <strong>Name:</strong> ${endpoint.name}<br>
            <strong>URL:</strong> ${endpoint.url}<br>
            <strong>Status:</strong> ${endpoint.is_active ? 'Active' : 'Inactive'}<br>
            <strong>Success Rate:</strong> ${endpoint.success_rate}%<br>
            <strong>Total Deliveries:</strong> ${endpoint.total_deliveries}
        `, 'info');
    }

    /**
     * Manage subscriptions
     */
    manageSubscriptions(endpointId) {
        this.showAlert('Subscription management interface would be displayed here', 'info');
    }

    /**
     * Update dashboard metrics
     */
    updateDashboardMetrics() {
        const totalEndpoints = this.endpoints.length;
        const activeEndpoints = this.endpoints.filter(e => e.is_active).length;
        const totalDeliveries = this.endpoints.reduce((sum, e) => sum + e.total_deliveries, 0);
        const successfulDeliveries = this.endpoints.reduce((sum, e) => sum + e.successful_deliveries, 0);
        const successRate = totalDeliveries > 0 ? Math.round((successfulDeliveries / totalDeliveries) * 100) : 0;

        document.getElementById('totalEndpoints').textContent = totalEndpoints;
        document.getElementById('activeEndpoints').textContent = activeEndpoints;
        document.getElementById('totalDeliveries').textContent = totalDeliveries;
        document.getElementById('successRate').textContent = successRate + '%';
    }

    /**
     * Format date for display
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    /**
     * Format time only
     */
    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
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
window.WebhookNotificationsDemo = WebhookNotificationsDemo;
