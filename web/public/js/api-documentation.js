/**
 * API Documentation JavaScript Module
 * 
 * Generates comprehensive API documentation for all Interviews.tv integration endpoints
 * including Calendar Integration, Social Media Streaming, Webhooks, Third-party Apps,
 * CRM Connections, and Payment Gateway APIs.
 */

class APIDocumentation {
    constructor() {
        this.apiSections = this.getAPIDefinitions();
        this.init();
    }

    init() {
        this.renderSidebar();
        this.renderContent();
        this.setupSearch();
        this.setupScrollSpy();
        console.log('API Documentation initialized');
    }

    getAPIDefinitions() {
        return [
            {
                id: 'calendar',
                title: 'Calendar Integration',
                description: 'Manage calendar connections and synchronize interview schedules with Google Calendar and Outlook.',
                icon: 'fas fa-calendar-alt',
                endpoints: [
                    {
                        method: 'GET',
                        path: '/api/calendar/providers',
                        title: 'Get Calendar Providers',
                        description: 'Retrieve available calendar providers (Google, Outlook, etc.)',
                        parameters: [
                            { name: 'search', type: 'string', required: false, description: 'Search provider names' },
                            { name: 'active_only', type: 'boolean', required: false, description: 'Filter active providers only' }
                        ],
                        responses: [
                            {
                                status: 200,
                                description: 'Success',
                                example: {
                                    success: true,
                                    data: [
                                        {
                                            provider_id: 'google',
                                            provider_name: 'Google Calendar',
                                            description: 'Sync with Google Calendar',
                                            oauth_url: 'https://accounts.google.com/oauth/authorize',
                                            scopes: ['calendar.readonly', 'calendar.events']
                                        }
                                    ]
                                }
                            }
                        ]
                    },
                    {
                        method: 'POST',
                        path: '/api/calendar/connect',
                        title: 'Connect Calendar Provider',
                        description: 'Create OAuth authorization URL for calendar provider connection',
                        parameters: [
                            { name: 'provider_id', type: 'string', required: true, description: 'Calendar provider ID (google, outlook)' },
                            { name: 'scopes', type: 'array', required: false, description: 'OAuth scopes to request' },
                            { name: 'redirect_uri', type: 'string', required: false, description: 'OAuth redirect URI' }
                        ],
                        responses: [
                            {
                                status: 201,
                                description: 'Authorization URL created',
                                example: {
                                    success: true,
                                    data: {
                                        authorization_url: 'https://accounts.google.com/oauth/authorize?client_id=...',
                                        state: 'random_state_string'
                                    }
                                }
                            }
                        ]
                    },
                    {
                        method: 'GET',
                        path: '/api/calendar/connections',
                        title: 'Get Calendar Connections',
                        description: 'Retrieve user\'s connected calendar accounts',
                        parameters: [
                            { name: 'provider_id', type: 'string', required: false, description: 'Filter by provider' },
                            { name: 'status', type: 'string', required: false, description: 'Filter by connection status' }
                        ],
                        responses: [
                            {
                                status: 200,
                                description: 'Success',
                                example: {
                                    success: true,
                                    data: [
                                        {
                                            connection_id: 'conn_123',
                                            provider_name: 'Google Calendar',
                                            account_email: 'user@example.com',
                                            status: 'active',
                                            connected_at: '2024-01-15T10:30:00Z'
                                        }
                                    ]
                                }
                            }
                        ]
                    },
                    {
                        method: 'POST',
                        path: '/api/calendar/events/sync',
                        title: 'Sync Calendar Events',
                        description: 'Synchronize interview events with connected calendar',
                        parameters: [
                            { name: 'connection_id', type: 'string', required: true, description: 'Calendar connection ID' },
                            { name: 'interview_id', type: 'string', required: true, description: 'Interview session ID' },
                            { name: 'sync_direction', type: 'string', required: false, description: 'Sync direction (import, export, bidirectional)' }
                        ],
                        responses: [
                            {
                                status: 200,
                                description: 'Events synchronized',
                                example: {
                                    success: true,
                                    data: {
                                        synced_events: 5,
                                        created_events: 2,
                                        updated_events: 3,
                                        sync_timestamp: '2024-01-20T14:30:00Z'
                                    }
                                }
                            }
                        ]
                    }
                ]
            },
            {
                id: 'social-media',
                title: 'Social Media Streaming',
                description: 'Stream interviews to social media platforms like YouTube, Facebook, and LinkedIn.',
                icon: 'fas fa-share-alt',
                endpoints: [
                    {
                        method: 'GET',
                        path: '/api/social/platforms',
                        title: 'Get Social Platforms',
                        description: 'Retrieve available social media streaming platforms',
                        parameters: [
                            { name: 'category', type: 'string', required: false, description: 'Platform category (video, professional, social)' },
                            { name: 'live_streaming', type: 'boolean', required: false, description: 'Filter platforms with live streaming support' }
                        ],
                        responses: [
                            {
                                status: 200,
                                description: 'Success',
                                example: {
                                    success: true,
                                    data: [
                                        {
                                            platform_id: 'youtube',
                                            platform_name: 'YouTube',
                                            category: 'video',
                                            supports_live_streaming: true,
                                            max_duration_hours: 12,
                                            supported_formats: ['1080p', '720p', '480p']
                                        }
                                    ]
                                }
                            }
                        ]
                    },
                    {
                        method: 'POST',
                        path: '/api/social/connect',
                        title: 'Connect Social Platform',
                        description: 'Connect to a social media platform for streaming',
                        parameters: [
                            { name: 'platform_id', type: 'string', required: true, description: 'Social platform ID' },
                            { name: 'account_type', type: 'string', required: false, description: 'Account type (personal, business, creator)' },
                            { name: 'streaming_settings', type: 'object', required: false, description: 'Default streaming configuration' }
                        ],
                        responses: [
                            {
                                status: 201,
                                description: 'Platform connected',
                                example: {
                                    success: true,
                                    data: {
                                        connection_id: 'social_conn_456',
                                        platform_name: 'YouTube',
                                        channel_name: 'My Interview Channel',
                                        authorization_url: 'https://accounts.google.com/oauth/authorize?...'
                                    }
                                }
                            }
                        ]
                    },
                    {
                        method: 'POST',
                        path: '/api/social/stream/start',
                        title: 'Start Live Stream',
                        description: 'Start streaming interview to social media platform',
                        parameters: [
                            { name: 'connection_id', type: 'string', required: true, description: 'Social media connection ID' },
                            { name: 'interview_id', type: 'string', required: true, description: 'Interview session ID' },
                            { name: 'stream_title', type: 'string', required: true, description: 'Stream title' },
                            { name: 'stream_description', type: 'string', required: false, description: 'Stream description' },
                            { name: 'privacy_level', type: 'string', required: false, description: 'Privacy level (public, unlisted, private)' }
                        ],
                        responses: [
                            {
                                status: 200,
                                description: 'Stream started',
                                example: {
                                    success: true,
                                    data: {
                                        stream_id: 'stream_789',
                                        stream_url: 'https://youtube.com/watch?v=abc123',
                                        rtmp_url: 'rtmp://a.rtmp.youtube.com/live2',
                                        stream_key: 'xxxx-xxxx-xxxx-xxxx',
                                        status: 'live'
                                    }
                                }
                            }
                        ]
                    }
                ]
            },
            {
                id: 'webhooks',
                title: 'Webhook Notifications',
                description: 'Configure and manage webhook notifications for interview events and system updates.',
                icon: 'fas fa-bell',
                endpoints: [
                    {
                        method: 'GET',
                        path: '/api/webhooks',
                        title: 'Get Webhooks',
                        description: 'Retrieve configured webhook endpoints',
                        parameters: [
                            { name: 'event_type', type: 'string', required: false, description: 'Filter by event type' },
                            { name: 'status', type: 'string', required: false, description: 'Filter by webhook status' }
                        ],
                        responses: [
                            {
                                status: 200,
                                description: 'Success',
                                example: {
                                    success: true,
                                    data: [
                                        {
                                            webhook_id: 'wh_123',
                                            url: 'https://example.com/webhook',
                                            event_types: ['interview.started', 'interview.ended'],
                                            status: 'active',
                                            created_at: '2024-01-15T10:30:00Z'
                                        }
                                    ]
                                }
                            }
                        ]
                    },
                    {
                        method: 'POST',
                        path: '/api/webhooks',
                        title: 'Create Webhook',
                        description: 'Create a new webhook endpoint',
                        parameters: [
                            { name: 'url', type: 'string', required: true, description: 'Webhook endpoint URL' },
                            { name: 'event_types', type: 'array', required: true, description: 'Array of event types to subscribe to' },
                            { name: 'secret', type: 'string', required: false, description: 'Webhook secret for signature verification' },
                            { name: 'description', type: 'string', required: false, description: 'Webhook description' }
                        ],
                        responses: [
                            {
                                status: 201,
                                description: 'Webhook created',
                                example: {
                                    success: true,
                                    data: {
                                        webhook_id: 'wh_456',
                                        url: 'https://example.com/webhook',
                                        secret: 'whsec_...',
                                        status: 'active'
                                    }
                                }
                            }
                        ]
                    }
                ]
            },
            {
                id: 'third-party',
                title: 'Third-Party Integrations',
                description: 'Connect with business tools like Slack, Discord, Zoom, Notion, and more.',
                icon: 'fas fa-plug',
                endpoints: [
                    {
                        method: 'GET',
                        path: '/api/integrations/apps',
                        title: 'Get Available Apps',
                        description: 'Retrieve available third-party applications for integration',
                        parameters: [
                            { name: 'category', type: 'string', required: false, description: 'App category (communication, productivity, storage)' },
                            { name: 'search', type: 'string', required: false, description: 'Search app names' }
                        ],
                        responses: [
                            {
                                status: 200,
                                description: 'Success',
                                example: {
                                    success: true,
                                    data: [
                                        {
                                            app_id: 'slack',
                                            app_name: 'Slack',
                                            category: 'communication',
                                            description: 'Team communication platform',
                                            oauth_required: true,
                                            webhook_support: true
                                        }
                                    ]
                                }
                            }
                        ]
                    },
                    {
                        method: 'POST',
                        path: '/api/integrations/connect',
                        title: 'Connect Third-Party App',
                        description: 'Connect to a third-party application',
                        parameters: [
                            { name: 'app_id', type: 'string', required: true, description: 'Application ID' },
                            { name: 'workspace_id', type: 'string', required: false, description: 'Workspace or team ID' },
                            { name: 'permissions', type: 'array', required: false, description: 'Requested permissions' }
                        ],
                        responses: [
                            {
                                status: 201,
                                description: 'App connected',
                                example: {
                                    success: true,
                                    data: {
                                        connection_id: 'app_conn_789',
                                        app_name: 'Slack',
                                        workspace_name: 'My Team Workspace',
                                        authorization_url: 'https://slack.com/oauth/authorize?...'
                                    }
                                }
                            }
                        ]
                    }
                ]
            },
            {
                id: 'crm',
                title: 'CRM Connections',
                description: 'Integrate with CRM systems like Salesforce, HubSpot, Pipedrive, and more.',
                icon: 'fas fa-handshake',
                endpoints: [
                    {
                        method: 'GET',
                        path: '/api/crm/providers',
                        title: 'Get CRM Providers',
                        description: 'Retrieve available CRM providers',
                        parameters: [
                            { name: 'search', type: 'string', required: false, description: 'Search provider names' },
                            { name: 'features', type: 'array', required: false, description: 'Required features' }
                        ],
                        responses: [
                            {
                                status: 200,
                                description: 'Success',
                                example: {
                                    success: true,
                                    data: [
                                        {
                                            provider_id: 'salesforce',
                                            provider_name: 'Salesforce',
                                            description: 'World\'s #1 CRM platform',
                                            features: ['contacts', 'deals', 'activities', 'reports'],
                                            oauth_url: 'https://login.salesforce.com/services/oauth2/authorize'
                                        }
                                    ]
                                }
                            }
                        ]
                    },
                    {
                        method: 'POST',
                        path: '/api/crm/sync/contacts',
                        title: 'Sync CRM Contacts',
                        description: 'Synchronize contacts with CRM system',
                        parameters: [
                            { name: 'connection_id', type: 'string', required: true, description: 'CRM connection ID' },
                            { name: 'sync_direction', type: 'string', required: false, description: 'Sync direction (import, export, bidirectional)' },
                            { name: 'field_mapping', type: 'object', required: false, description: 'Custom field mapping configuration' }
                        ],
                        responses: [
                            {
                                status: 200,
                                description: 'Contacts synchronized',
                                example: {
                                    success: true,
                                    data: {
                                        synced_contacts: 150,
                                        created_contacts: 25,
                                        updated_contacts: 125,
                                        sync_timestamp: '2024-01-20T14:30:00Z'
                                    }
                                }
                            }
                        ]
                    }
                ]
            },
            {
                id: 'payment',
                title: 'Payment Gateway',
                description: 'Process payments, manage subscriptions, and handle financial transactions.',
                icon: 'fas fa-credit-card',
                endpoints: [
                    {
                        method: 'GET',
                        path: '/api/payment/providers',
                        title: 'Get Payment Providers',
                        description: 'Retrieve available payment providers',
                        parameters: [
                            { name: 'provider_type', type: 'string', required: false, description: 'Provider type (credit_card, digital_wallet)' },
                            { name: 'currency', type: 'string', required: false, description: 'Supported currency' },
                            { name: 'country', type: 'string', required: false, description: 'Supported country' }
                        ],
                        responses: [
                            {
                                status: 200,
                                description: 'Success',
                                example: {
                                    success: true,
                                    data: [
                                        {
                                            provider_id: 'stripe',
                                            provider_name: 'Stripe',
                                            provider_type: 'credit_card',
                                            transaction_fee_percentage: 2.9,
                                            transaction_fee_fixed: 0.30,
                                            supported_currencies: ['USD', 'EUR', 'GBP']
                                        }
                                    ]
                                }
                            }
                        ]
                    },
                    {
                        method: 'POST',
                        path: '/api/payment/process',
                        title: 'Process Payment',
                        description: 'Process a payment transaction',
                        parameters: [
                            { name: 'connection_id', type: 'string', required: true, description: 'Payment connection ID' },
                            { name: 'amount', type: 'number', required: true, description: 'Payment amount' },
                            { name: 'currency', type: 'string', required: true, description: 'Payment currency' },
                            { name: 'method_id', type: 'string', required: false, description: 'Payment method ID' },
                            { name: 'description', type: 'string', required: false, description: 'Payment description' }
                        ],
                        responses: [
                            {
                                status: 200,
                                description: 'Payment processed',
                                example: {
                                    success: true,
                                    data: {
                                        transaction_id: 'txn_123',
                                        status: 'succeeded',
                                        amount: 99.00,
                                        currency: 'USD',
                                        fee_amount: 3.17,
                                        net_amount: 95.83
                                    }
                                }
                            }
                        ]
                    },
                    {
                        method: 'POST',
                        path: '/api/payment/subscriptions',
                        title: 'Create Subscription',
                        description: 'Create a customer subscription',
                        parameters: [
                            { name: 'plan_id', type: 'string', required: true, description: 'Subscription plan ID' },
                            { name: 'method_id', type: 'string', required: true, description: 'Payment method ID' },
                            { name: 'customer_id', type: 'string', required: false, description: 'Customer ID' },
                            { name: 'trial_period_days', type: 'number', required: false, description: 'Trial period in days' }
                        ],
                        responses: [
                            {
                                status: 201,
                                description: 'Subscription created',
                                example: {
                                    success: true,
                                    data: {
                                        subscription_id: 'sub_456',
                                        status: 'active',
                                        current_period_start: '2024-01-20T00:00:00Z',
                                        current_period_end: '2024-02-20T00:00:00Z',
                                        next_billing_date: '2024-02-20T00:00:00Z'
                                    }
                                }
                            }
                        ]
                    }
                ]
            }
        ];
    }

    renderSidebar() {
        const sidebarNav = document.getElementById('sidebarNav');
        if (!sidebarNav) return;

        let sidebarHtml = '';

        this.apiSections.forEach(section => {
            // Section header
            sidebarHtml += `
                <a href="#${section.id}" class="nav-link section-header">
                    <i class="${section.icon} me-2"></i>${section.title}
                </a>
            `;

            // Section endpoints
            section.endpoints.forEach((endpoint, index) => {
                const endpointId = `${section.id}-${index}`;
                sidebarHtml += `
                    <a href="#${endpointId}" class="nav-link ps-4">
                        <span class="method-badge method-${endpoint.method.toLowerCase()}">${endpoint.method}</span>
                        <span class="ms-2">${endpoint.title}</span>
                    </a>
                `;
            });
        });

        sidebarNav.innerHTML = sidebarHtml;
    }

    renderContent() {
        const apiContent = document.getElementById('apiContent');
        if (!apiContent) return;

        let contentHtml = '';

        this.apiSections.forEach(section => {
            contentHtml += `
                <div class="section-divider endpoint-section" id="${section.id}">
                    <h2 class="mb-3">
                        <i class="${section.icon} text-danger me-3"></i>
                        ${section.title}
                    </h2>
                    <p class="text-muted mb-4">${section.description}</p>
                </div>
            `;

            section.endpoints.forEach((endpoint, index) => {
                const endpointId = `${section.id}-${index}`;
                contentHtml += this.renderEndpoint(endpoint, endpointId);
            });
        });

        apiContent.innerHTML = contentHtml;

        // Highlight code blocks
        if (typeof Prism !== 'undefined') {
            Prism.highlightAll();
        }
    }

    renderEndpoint(endpoint, endpointId) {
        const parametersHtml = endpoint.parameters && endpoint.parameters.length > 0 ? `
            <h6 class="mt-4 mb-3">Parameters</h6>
            <div class="table-responsive">
                <table class="table table-dark parameter-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Required</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${endpoint.parameters.map(param => `
                            <tr>
                                <td><code>${param.name}</code></td>
                                <td><span class="badge bg-secondary">${param.type}</span></td>
                                <td>
                                    <span class="${param.required ? 'required-param' : 'optional-param'}">
                                        ${param.required ? 'Required' : 'Optional'}
                                    </span>
                                </td>
                                <td>${param.description}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        ` : '';

        const responsesHtml = endpoint.responses.map(response => `
            <div class="mb-4">
                <h6>
                    <span class="status-code status-${response.status}">${response.status}</span>
                    <span class="ms-2">${response.description}</span>
                </h6>
                <div class="response-example">
                    <pre><code class="language-json">${JSON.stringify(response.example, null, 2)}</code></pre>
                </div>
            </div>
        `).join('');

        return `
            <div class="card endpoint-card endpoint-section" id="${endpointId}">
                <div class="card-header">
                    <div class="d-flex align-items-center">
                        <span class="method-badge method-${endpoint.method.toLowerCase()} me-3">${endpoint.method}</span>
                        <div>
                            <h5 class="mb-1">${endpoint.title}</h5>
                            <div class="endpoint-url">${endpoint.path}</div>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <p class="text-muted">${endpoint.description}</p>

                    ${parametersHtml}

                    <h6 class="mt-4 mb-3">Responses</h6>
                    ${responsesHtml}

                    <div class="mt-4">
                        <h6 class="mb-3">Example Request</h6>
                        <div class="code-block">
                            <pre><code class="language-bash">curl -X ${endpoint.method} "https://api.interviews.tv${endpoint.path}" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"${endpoint.method !== 'GET' ? ' \\\n  -d \'{"key": "value"}\'' : ''}</code></pre>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupSearch() {
        const searchBox = document.getElementById('searchBox');
        if (!searchBox) return;

        searchBox.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            this.filterEndpoints(searchTerm);
        });
    }

    filterEndpoints(searchTerm) {
        const navLinks = document.querySelectorAll('#sidebarNav .nav-link:not(.section-header)');
        const endpointCards = document.querySelectorAll('.endpoint-card');

        navLinks.forEach((link, index) => {
            const text = link.textContent.toLowerCase();
            const shouldShow = text.includes(searchTerm);
            link.style.display = shouldShow ? 'block' : 'none';
        });

        endpointCards.forEach(card => {
            const title = card.querySelector('h5').textContent.toLowerCase();
            const path = card.querySelector('.endpoint-url').textContent.toLowerCase();
            const description = card.querySelector('.text-muted').textContent.toLowerCase();

            const shouldShow = title.includes(searchTerm) ||
                             path.includes(searchTerm) ||
                             description.includes(searchTerm);

            card.style.display = shouldShow ? 'block' : 'none';
        });
    }

    setupScrollSpy() {
        // Simple scroll spy implementation
        const sections = document.querySelectorAll('.endpoint-section');
        const navLinks = document.querySelectorAll('#sidebarNav .nav-link');

        window.addEventListener('scroll', () => {
            let current = '';

            sections.forEach(section => {
                const sectionTop = section.offsetTop - 100;
                if (window.pageYOffset >= sectionTop) {
                    current = section.getAttribute('id');
                }
            });

            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${current}`) {
                    link.classList.add('active');
                }
            });
        });

        // Smooth scrolling for navigation links
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);

                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new APIDocumentation();
});
