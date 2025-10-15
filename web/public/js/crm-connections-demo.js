/**
 * CRM Connections Demo
 * Manages the CRM system integrations demo interface
 */
class CRMConnectionsDemo {
    constructor() {
        this.apiBaseUrl = '/api/crm';
        this.currentTab = 'contacts';
        this.contacts = [];
        this.leads = [];
        this.deals = [];
        this.activities = [];
        this.analytics = null;
        this.connectionId = 'hubspot_demo_connection'; // Demo connection ID
    }

    /**
     * Initialize the demo
     */
    async init() {
        this.setupEventListeners();
        await this.loadInitialData();
        this.updateDashboardMetrics();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('#crmTabs button[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const tabId = e.target.getAttribute('data-bs-target').substring(1);
                this.handleTabSwitch(tabId);
            });
        });

        // Search and filter inputs
        document.getElementById('contactSearch')?.addEventListener('input', () => this.filterContacts());
        document.getElementById('contactSyncFilter')?.addEventListener('change', () => this.filterContacts());
        document.getElementById('leadStatusFilter')?.addEventListener('change', () => this.filterLeads());
        document.getElementById('leadInterviewFilter')?.addEventListener('change', () => this.filterLeads());
        document.getElementById('dealStageFilter')?.addEventListener('change', () => this.filterDeals());
        document.getElementById('dealValueFilter')?.addEventListener('change', () => this.filterDeals());
        document.getElementById('activityTypeFilter')?.addEventListener('change', () => this.filterActivities());
        document.getElementById('activityOutcomeFilter')?.addEventListener('change', () => this.filterActivities());
        document.getElementById('analyticsTimeRange')?.addEventListener('change', () => this.loadAnalytics());
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        await Promise.all([
            this.loadContacts(),
            this.loadLeads(),
            this.loadDeals(),
            this.loadActivities(),
            this.loadAnalytics()
        ]);
    }

    // ==================== CONTACTS MANAGEMENT ====================

    /**
     * Load contacts
     */
    async loadContacts() {
        try {
            this.showLoading('contactsLoading');

            // For demo purposes, use mock data
            const mockContacts = [
                {
                    mapping_id: 'mapping_1',
                    crm_contact_id: 'contact_12345',
                    contact_data: {
                        email: 'john.doe@example.com',
                        firstname: 'John',
                        lastname: 'Doe',
                        company: 'Example Corp',
                        phone: '+1-555-0123',
                        jobtitle: 'Senior Developer'
                    },
                    sync_status: 'synced',
                    last_sync_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                    crm_system: 'HubSpot'
                },
                {
                    mapping_id: 'mapping_2',
                    crm_contact_id: 'contact_67890',
                    contact_data: {
                        email: 'jane.smith@techsolutions.com',
                        firstname: 'Jane',
                        lastname: 'Smith',
                        company: 'Tech Solutions Inc',
                        phone: '+1-555-0124',
                        jobtitle: 'Product Manager'
                    },
                    sync_status: 'synced',
                    last_sync_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                    crm_system: 'Salesforce'
                },
                {
                    mapping_id: 'mapping_3',
                    crm_contact_id: 'contact_11111',
                    contact_data: {
                        email: 'mike.johnson@startup.io',
                        firstname: 'Mike',
                        lastname: 'Johnson',
                        company: 'Startup.io',
                        phone: '+1-555-0125',
                        jobtitle: 'CTO'
                    },
                    sync_status: 'pending',
                    last_sync_at: null,
                    crm_system: 'HubSpot'
                },
                {
                    mapping_id: 'mapping_4',
                    crm_contact_id: 'contact_22222',
                    contact_data: {
                        email: 'sarah.wilson@enterprise.com',
                        firstname: 'Sarah',
                        lastname: 'Wilson',
                        company: 'Enterprise Solutions',
                        phone: '+1-555-0126',
                        jobtitle: 'VP Engineering'
                    },
                    sync_status: 'failed',
                    last_sync_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                    crm_system: 'Salesforce'
                }
            ];

            this.contacts = mockContacts;
            this.renderContacts();

        } catch (error) {
            console.error('Failed to load contacts:', error);
            this.showError('contactsContainer', 'Failed to load contacts');
        }
    }

    /**
     * Render contacts
     */
    renderContacts() {
        const container = document.getElementById('contactsContainer');
        
        if (this.contacts.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-address-book fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No contacts found</p>
                </div>
            `;
            return;
        }

        const contactsHTML = this.contacts.map(contact => `
            <div class="contact-card">
                <div class="d-flex align-items-start justify-content-between">
                    <div class="d-flex align-items-start">
                        <div class="crm-icon ${this.getCRMIconClass(contact.crm_system)}">
                            <i class="fas fa-${this.getCRMIcon(contact.crm_system)}"></i>
                        </div>
                        <div>
                            <h6 class="mb-1">
                                ${contact.contact_data.firstname} ${contact.contact_data.lastname}
                                <span class="status-badge status-${contact.sync_status}">${contact.sync_status}</span>
                            </h6>
                            <p class="text-muted mb-1">${contact.contact_data.jobtitle} at ${contact.contact_data.company}</p>
                            <div class="d-flex align-items-center gap-3 text-sm">
                                <span><i class="fas fa-envelope me-1"></i>${contact.contact_data.email}</span>
                                <span><i class="fas fa-phone me-1"></i>${contact.contact_data.phone}</span>
                            </div>
                        </div>
                    </div>
                    <div class="text-end">
                        <div class="text-muted small mb-2">
                            ${contact.crm_system} • ID: ${contact.crm_contact_id}
                        </div>
                        <div class="text-muted small mb-2">
                            Last sync: ${contact.last_sync_at ? this.formatDate(contact.last_sync_at) : 'Never'}
                        </div>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="crmDemo.viewContact('${contact.mapping_id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-outline-success" onclick="crmDemo.syncContact('${contact.mapping_id}')">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="crmDemo.deleteContact('${contact.mapping_id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = contactsHTML;
    }

    /**
     * Filter contacts
     */
    filterContacts() {
        const searchTerm = document.getElementById('contactSearch').value.toLowerCase();
        const syncStatus = document.getElementById('contactSyncFilter').value;

        let filteredContacts = this.contacts;

        if (searchTerm) {
            filteredContacts = filteredContacts.filter(contact => 
                contact.contact_data.firstname.toLowerCase().includes(searchTerm) ||
                contact.contact_data.lastname.toLowerCase().includes(searchTerm) ||
                contact.contact_data.email.toLowerCase().includes(searchTerm) ||
                contact.contact_data.company.toLowerCase().includes(searchTerm)
            );
        }

        if (syncStatus) {
            filteredContacts = filteredContacts.filter(contact => contact.sync_status === syncStatus);
        }

        // Temporarily store original contacts and render filtered
        const originalContacts = this.contacts;
        this.contacts = filteredContacts;
        this.renderContacts();
        this.contacts = originalContacts;
    }

    /**
     * Sync contacts
     */
    async syncContacts() {
        try {
            this.showAlert('Syncing contacts from CRM...', 'info');

            // Simulate API call
            setTimeout(() => {
                // Update sync status for pending contacts
                this.contacts.forEach(contact => {
                    if (contact.sync_status === 'pending') {
                        contact.sync_status = 'synced';
                        contact.last_sync_at = new Date().toISOString();
                    }
                });

                this.renderContacts();
                this.updateDashboardMetrics();
                this.showAlert('Contacts synced successfully! 3 contacts updated.', 'success');
            }, 2000);

        } catch (error) {
            console.error('Failed to sync contacts:', error);
            this.showAlert('Failed to sync contacts: ' + error.message, 'danger');
        }
    }

    /**
     * View contact details
     */
    viewContact(mappingId) {
        const contact = this.contacts.find(c => c.mapping_id === mappingId);
        if (!contact) return;

        this.showAlert(`Viewing contact: ${contact.contact_data.firstname} ${contact.contact_data.lastname} (${contact.contact_data.email})`, 'info');
    }

    /**
     * Sync single contact
     */
    async syncContact(mappingId) {
        try {
            const contact = this.contacts.find(c => c.mapping_id === mappingId);
            if (!contact) return;

            this.showAlert(`Syncing contact: ${contact.contact_data.firstname} ${contact.contact_data.lastname}...`, 'info');

            // Simulate sync
            setTimeout(() => {
                contact.sync_status = 'synced';
                contact.last_sync_at = new Date().toISOString();
                this.renderContacts();
                this.showAlert('Contact synced successfully!', 'success');
            }, 1500);

        } catch (error) {
            console.error('Failed to sync contact:', error);
            this.showAlert('Failed to sync contact: ' + error.message, 'danger');
        }
    }

    /**
     * Delete contact
     */
    async deleteContact(mappingId) {
        try {
            const contact = this.contacts.find(c => c.mapping_id === mappingId);
            if (!contact) return;

            if (!confirm(`Are you sure you want to delete contact: ${contact.contact_data.firstname} ${contact.contact_data.lastname}?`)) {
                return;
            }

            this.showAlert('Deleting contact...', 'info');

            // Simulate deletion
            setTimeout(() => {
                this.contacts = this.contacts.filter(c => c.mapping_id !== mappingId);
                this.renderContacts();
                this.updateDashboardMetrics();
                this.showAlert('Contact deleted successfully!', 'success');
            }, 1000);

        } catch (error) {
            console.error('Failed to delete contact:', error);
            this.showAlert('Failed to delete contact: ' + error.message, 'danger');
        }
    }

    // ==================== LEADS MANAGEMENT ====================

    /**
     * Load leads
     */
    async loadLeads() {
        try {
            this.showLoading('leadsLoading');

            // For demo purposes, use mock data
            const mockLeads = [
                {
                    lead_id: 'lead_1',
                    crm_lead_id: 'lead_12345',
                    interview_id: 'interview_1',
                    interview_title: 'Senior Frontend Developer Interview',
                    lead_status: 'qualified',
                    lead_score: 85,
                    estimated_value: 15000,
                    probability_percentage: 70,
                    lead_source: 'interview',
                    company_name: 'Tech Innovations Inc',
                    contact_name: 'John Doe',
                    contact_email: 'john.doe@techinnovations.com',
                    notes: 'Excellent technical skills, strong communication',
                    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    crm_system: 'HubSpot'
                },
                {
                    lead_id: 'lead_2',
                    crm_lead_id: 'lead_67890',
                    interview_id: 'interview_2',
                    interview_title: 'Product Manager Interview',
                    lead_status: 'contacted',
                    lead_score: 65,
                    estimated_value: 25000,
                    probability_percentage: 40,
                    lead_source: 'interview',
                    company_name: 'Digital Solutions LLC',
                    contact_name: 'Jane Smith',
                    contact_email: 'jane.smith@digitalsolutions.com',
                    notes: 'Good product vision, needs technical validation',
                    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                    crm_system: 'Salesforce'
                },
                {
                    lead_id: 'lead_3',
                    crm_lead_id: 'lead_11111',
                    interview_id: 'interview_3',
                    interview_title: 'DevOps Engineer Interview',
                    lead_status: 'new',
                    lead_score: 45,
                    estimated_value: 8000,
                    probability_percentage: 20,
                    lead_source: 'interview',
                    company_name: 'Cloud Systems Corp',
                    contact_name: 'Mike Johnson',
                    contact_email: 'mike.johnson@cloudsystems.com',
                    notes: 'Entry level, potential for growth',
                    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                    crm_system: 'HubSpot'
                }
            ];

            this.leads = mockLeads;
            this.renderLeads();

        } catch (error) {
            console.error('Failed to load leads:', error);
            this.showError('leadsContainer', 'Failed to load leads');
        }
    }

    /**
     * Render leads
     */
    renderLeads() {
        const container = document.getElementById('leadsContainer');

        if (this.leads.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-user-plus fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No leads found</p>
                </div>
            `;
            return;
        }

        const leadsHTML = this.leads.map(lead => `
            <div class="lead-card">
                <div class="d-flex align-items-start justify-content-between">
                    <div class="d-flex align-items-start">
                        <div class="crm-icon ${this.getCRMIconClass(lead.crm_system)}">
                            <i class="fas fa-${this.getCRMIcon(lead.crm_system)}"></i>
                        </div>
                        <div>
                            <h6 class="mb-1">
                                ${lead.contact_name}
                                <span class="status-badge status-${lead.lead_status}">${lead.lead_status}</span>
                            </h6>
                            <p class="text-muted mb-1">${lead.company_name}</p>
                            <div class="d-flex align-items-center gap-3 text-sm mb-2">
                                <span><i class="fas fa-envelope me-1"></i>${lead.contact_email}</span>
                                <span><i class="fas fa-video me-1"></i>${lead.interview_title}</span>
                            </div>
                            <div class="d-flex align-items-center gap-3 text-sm">
                                <span><i class="fas fa-star me-1 text-warning"></i>Score: ${lead.lead_score}</span>
                                <span><i class="fas fa-dollar-sign me-1 text-success"></i>$${lead.estimated_value.toLocaleString()}</span>
                                <span><i class="fas fa-percentage me-1 text-info"></i>${lead.probability_percentage}%</span>
                            </div>
                        </div>
                    </div>
                    <div class="text-end">
                        <div class="text-muted small mb-2">
                            ${lead.crm_system} • ${this.formatDate(lead.created_at)}
                        </div>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="crmDemo.viewLead('${lead.lead_id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-outline-success" onclick="crmDemo.qualifyLead('${lead.lead_id}')">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn btn-outline-warning" onclick="crmDemo.createDealFromLead('${lead.lead_id}')">
                                <i class="fas fa-handshake"></i>
                            </button>
                        </div>
                    </div>
                </div>
                ${lead.notes ? `
                    <div class="mt-2 pt-2 border-top border-secondary">
                        <small class="text-muted"><i class="fas fa-sticky-note me-1"></i>${lead.notes}</small>
                    </div>
                ` : ''}
            </div>
        `).join('');

        container.innerHTML = leadsHTML;
    }

    /**
     * Filter leads
     */
    filterLeads() {
        const leadStatus = document.getElementById('leadStatusFilter').value;
        const interviewFilter = document.getElementById('leadInterviewFilter').value;

        let filteredLeads = this.leads;

        if (leadStatus) {
            filteredLeads = filteredLeads.filter(lead => lead.lead_status === leadStatus);
        }

        if (interviewFilter === 'recent') {
            const recentDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            filteredLeads = filteredLeads.filter(lead => new Date(lead.created_at) > recentDate);
        }

        // Temporarily store original leads and render filtered
        const originalLeads = this.leads;
        this.leads = filteredLeads;
        this.renderLeads();
        this.leads = originalLeads;
    }

    /**
     * Create lead from interview
     */
    async createLeadFromInterview() {
        try {
            this.showAlert('Creating lead from interview...', 'info');

            // Simulate lead creation
            setTimeout(() => {
                const newLead = {
                    lead_id: 'lead_' + Date.now(),
                    crm_lead_id: 'lead_' + Math.random().toString(36).substr(2, 9),
                    interview_id: 'interview_new',
                    interview_title: 'Full Stack Developer Interview',
                    lead_status: 'new',
                    lead_score: 60,
                    estimated_value: 12000,
                    probability_percentage: 30,
                    lead_source: 'interview',
                    company_name: 'New Tech Startup',
                    contact_name: 'Alex Thompson',
                    contact_email: 'alex.thompson@newtech.com',
                    notes: 'Recently created from interview',
                    created_at: new Date().toISOString(),
                    crm_system: 'HubSpot'
                };

                this.leads.unshift(newLead);
                this.renderLeads();
                this.updateDashboardMetrics();
                this.showAlert('Lead created successfully from interview!', 'success');
            }, 1500);

        } catch (error) {
            console.error('Failed to create lead:', error);
            this.showAlert('Failed to create lead: ' + error.message, 'danger');
        }
    }

    /**
     * View lead details
     */
    viewLead(leadId) {
        const lead = this.leads.find(l => l.lead_id === leadId);
        if (!lead) return;

        this.showAlert(`Viewing lead: ${lead.contact_name} from ${lead.company_name} (Score: ${lead.lead_score})`, 'info');
    }

    /**
     * Qualify lead
     */
    async qualifyLead(leadId) {
        try {
            const lead = this.leads.find(l => l.lead_id === leadId);
            if (!lead) return;

            this.showAlert(`Qualifying lead: ${lead.contact_name}...`, 'info');

            // Simulate qualification
            setTimeout(() => {
                lead.lead_status = 'qualified';
                lead.lead_score = Math.min(100, lead.lead_score + 20);
                lead.probability_percentage = Math.min(100, lead.probability_percentage + 30);
                this.renderLeads();
                this.showAlert('Lead qualified successfully!', 'success');
            }, 1000);

        } catch (error) {
            console.error('Failed to qualify lead:', error);
            this.showAlert('Failed to qualify lead: ' + error.message, 'danger');
        }
    }
