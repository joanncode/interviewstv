/**
 * Calendar Integration Demo
 * Interactive demo for calendar integration with Google Calendar, Outlook, and other providers
 */
class CalendarIntegrationDemo {
    constructor() {
        this.apiBaseUrl = '/api/calendar';
        this.providers = [];
        this.connections = [];
        this.events = [];
        this.selectedProvider = null;
        this.selectedConnection = null;
        this.currentEvent = null;
        
        this.init();
    }

    /**
     * Initialize the demo
     */
    async init() {
        try {
            this.setupEventListeners();
            this.setDefaultDates();
            await this.loadProviders();
            await this.loadConnections();
            this.showAlert('Calendar Integration Demo loaded successfully!', 'success');
        } catch (error) {
            console.error('Failed to initialize calendar demo:', error);
            this.showAlert('Failed to initialize demo: ' + error.message, 'danger');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Provider selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.provider-card')) {
                this.selectProvider(e.target.closest('.provider-card'));
            }
        });

        // Connect calendar button
        document.getElementById('connectCalendarBtn').addEventListener('click', () => {
            this.startOAuthFlow();
        });

        // Refresh buttons
        document.getElementById('refreshConnectionsBtn').addEventListener('click', () => {
            this.loadConnections();
        });

        document.getElementById('refreshEventsBtn').addEventListener('click', () => {
            this.loadEvents();
        });

        document.getElementById('refreshAvailabilityBtn').addEventListener('click', () => {
            this.loadAvailability();
        });

        // Connection actions
        document.getElementById('selectedConnection').addEventListener('change', (e) => {
            this.selectedConnection = e.target.value;
            this.updateConnectionActions();
        });

        document.getElementById('syncCalendarBtn').addEventListener('click', () => {
            this.syncCalendar();
        });

        document.getElementById('disconnectCalendarBtn').addEventListener('click', () => {
            this.disconnectCalendar();
        });

        // Event actions
        document.getElementById('createEventBtn').addEventListener('click', () => {
            this.showCreateEventModal();
        });

        document.getElementById('saveEventBtn').addEventListener('click', () => {
            this.createEvent();
        });

        document.getElementById('exportEventsBtn').addEventListener('click', () => {
            this.showExportModal();
        });

        document.getElementById('downloadExportBtn').addEventListener('click', () => {
            this.exportCalendarData();
        });

        document.getElementById('testDemoDataBtn').addEventListener('click', () => {
            this.loadDemoData();
        });

        // Date filters
        document.getElementById('eventsStartDate').addEventListener('change', () => {
            this.loadEvents();
        });

        document.getElementById('eventsEndDate').addEventListener('change', () => {
            this.loadEvents();
        });

        document.getElementById('availabilityStartDate').addEventListener('change', () => {
            this.loadAvailability();
        });

        document.getElementById('availabilityEndDate').addEventListener('change', () => {
            this.loadAvailability();
        });

        // Tab switching
        document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                this.handleTabSwitch(e.target.getAttribute('data-bs-target'));
            });
        });
    }

    /**
     * Set default dates
     */
    setDefaultDates() {
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

        // Events dates
        document.getElementById('eventsStartDate').value = today.toISOString().split('T')[0];
        document.getElementById('eventsEndDate').value = nextMonth.toISOString().split('T')[0];

        // Availability dates
        document.getElementById('availabilityStartDate').value = today.toISOString().split('T')[0];
        document.getElementById('availabilityEndDate').value = nextWeek.toISOString().split('T')[0];

        // Export dates
        document.getElementById('exportStartDate').value = today.toISOString().split('T')[0];
        document.getElementById('exportEndDate').value = nextMonth.toISOString().split('T')[0];
    }

    /**
     * Load available providers
     */
    async loadProviders() {
        try {
            this.showLoading('providersContainer');
            
            const response = await fetch(`${this.apiBaseUrl}/providers`);
            const result = await response.json();
            
            if (result.success) {
                this.providers = result.data;
                this.renderProviders();
            } else {
                throw new Error(result.message || 'Failed to load providers');
            }
        } catch (error) {
            console.error('Failed to load providers:', error);
            this.showError('providersContainer', 'Failed to load providers: ' + error.message);
        }
    }

    /**
     * Render providers
     */
    renderProviders() {
        const container = document.getElementById('providersContainer');
        
        if (this.providers.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-plug fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No calendar providers available</p>
                </div>
            `;
            return;
        }

        const providersHTML = this.providers.map(provider => `
            <div class="provider-card" data-provider-id="${provider.provider_id}">
                <div class="d-flex align-items-center">
                    <div class="provider-icon me-3">
                        ${this.getProviderIcon(provider.provider_type)}
                    </div>
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${provider.provider_name}</h6>
                        <small class="text-muted">${provider.provider_type.toUpperCase()}</small>
                        <div class="mt-2">
                            <span class="badge ${provider.is_active ? 'bg-success' : 'bg-secondary'}">
                                ${provider.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                    <div class="text-end">
                        <i class="fas fa-chevron-right text-muted"></i>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = providersHTML;
    }

    /**
     * Get provider icon
     */
    getProviderIcon(providerType) {
        const icons = {
            'google': '<i class="fab fa-google text-primary"></i>',
            'outlook': '<i class="fab fa-microsoft text-info"></i>',
            'apple': '<i class="fab fa-apple text-secondary"></i>',
            'caldav': '<i class="fas fa-calendar text-warning"></i>'
        };
        return icons[providerType] || '<i class="fas fa-calendar text-muted"></i>';
    }

    /**
     * Select provider
     */
    selectProvider(providerCard) {
        // Remove previous selection
        document.querySelectorAll('.provider-card').forEach(card => {
            card.classList.remove('selected');
        });

        // Select new provider
        providerCard.classList.add('selected');
        
        const providerId = providerCard.dataset.providerId;
        this.selectedProvider = this.providers.find(p => p.provider_id === providerId);
        
        // Update UI
        document.getElementById('selectedProvider').value = this.selectedProvider.provider_name;
        document.getElementById('connectCalendarBtn').disabled = false;
    }

    /**
     * Start OAuth flow
     */
    async startOAuthFlow() {
        try {
            if (!this.selectedProvider) {
                this.showAlert('Please select a provider first', 'warning');
                return;
            }

            const redirectUri = document.getElementById('redirectUri').value;
            const isPrimary = document.getElementById('isPrimary').checked;

            const formData = new FormData();
            formData.append('provider_id', this.selectedProvider.provider_id);
            formData.append('redirect_uri', redirectUri);

            const response = await fetch(`${this.apiBaseUrl}/oauth/start`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // Store OAuth state for callback handling
                localStorage.setItem('oauth_state', result.data.state);
                localStorage.setItem('oauth_provider', this.selectedProvider.provider_id);
                localStorage.setItem('is_primary', isPrimary);

                // Redirect to OAuth URL
                window.open(result.data.auth_url, '_blank', 'width=600,height=700');
                
                this.showAlert('OAuth flow started. Please complete authorization in the popup window.', 'info');
            } else {
                throw new Error(result.message || 'Failed to start OAuth flow');
            }
        } catch (error) {
            console.error('Failed to start OAuth flow:', error);
            this.showAlert('Failed to start OAuth flow: ' + error.message, 'danger');
        }
    }

    /**
     * Load user connections
     */
    async loadConnections() {
        try {
            this.showLoading('connectionsContainer');
            
            const response = await fetch(`${this.apiBaseUrl}/connections`);
            const result = await response.json();
            
            if (result.success) {
                this.connections = result.data;
                this.renderConnections();
                this.updateConnectionSelects();
                this.updateConnectionStats();
            } else {
                throw new Error(result.message || 'Failed to load connections');
            }
        } catch (error) {
            console.error('Failed to load connections:', error);
            this.showError('connectionsContainer', 'Failed to load connections: ' + error.message);
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
                    <p class="text-muted">No calendar connections found</p>
                    <p class="text-muted">Connect a calendar provider to get started</p>
                </div>
            `;
            return;
        }

        const connectionsHTML = this.connections.map(connection => `
            <div class="connection-card">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center mb-2">
                            ${this.getProviderIcon(connection.provider_type)}
                            <h6 class="mb-0 ms-2">${connection.calendar_name}</h6>
                            ${connection.is_primary ? '<span class="badge bg-primary ms-2">Primary</span>' : ''}
                        </div>
                        <p class="text-muted mb-2">${connection.provider_name}</p>
                        <div class="d-flex align-items-center">
                            <span class="connection-status ${this.getStatusClass(connection.sync_status)}">
                                ${connection.sync_status.replace('_', ' ').toUpperCase()}
                            </span>
                            ${connection.last_sync_at ? `
                                <small class="text-muted ms-3">
                                    Last sync: ${this.formatDate(connection.last_sync_at)}
                                </small>
                            ` : ''}
                        </div>
                    </div>
                    <div class="text-end">
                        <small class="text-muted">
                            ${connection.sync_direction.replace('_', ' ')}
                        </small>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = connectionsHTML;
    }

    /**
     * Update connection selects
     */
    updateConnectionSelects() {
        const selects = ['selectedConnection', 'eventsConnectionFilter', 'eventConnection'];

        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                // Clear existing options (except first)
                while (select.children.length > 1) {
                    select.removeChild(select.lastChild);
                }

                // Add connection options
                this.connections.forEach(connection => {
                    const option = document.createElement('option');
                    option.value = connection.connection_id;
                    option.textContent = `${connection.calendar_name} (${connection.provider_name})`;
                    select.appendChild(option);
                });
            }
        });
    }

    /**
     * Update connection stats
     */
    updateConnectionStats() {
        const totalConnections = this.connections.length;
        const activeConnections = this.connections.filter(c => c.is_active && c.sync_enabled).length;
        const lastSync = this.connections
            .filter(c => c.last_sync_at)
            .sort((a, b) => new Date(b.last_sync_at) - new Date(a.last_sync_at))[0];

        document.getElementById('totalConnections').textContent = totalConnections;
        document.getElementById('activeConnections').textContent = activeConnections;
        document.getElementById('lastSyncTime').textContent = lastSync ?
            this.formatDate(lastSync.last_sync_at) : 'Never';
    }

    /**
     * Update connection actions
     */
    updateConnectionActions() {
        const hasSelection = this.selectedConnection && this.selectedConnection !== '';
        document.getElementById('syncCalendarBtn').disabled = !hasSelection;
        document.getElementById('disconnectCalendarBtn').disabled = !hasSelection;
    }

    /**
     * Sync calendar
     */
    async syncCalendar() {
        try {
            if (!this.selectedConnection) {
                this.showAlert('Please select a connection first', 'warning');
                return;
            }

            const formData = new FormData();
            formData.append('connection_id', this.selectedConnection);
            formData.append('sync_type', 'incremental');

            const response = await fetch(`${this.apiBaseUrl}/connections/sync`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('Calendar sync completed successfully!', 'success');
                await this.loadConnections();
                await this.loadEvents();
            } else {
                throw new Error(result.message || 'Failed to sync calendar');
            }
        } catch (error) {
            console.error('Failed to sync calendar:', error);
            this.showAlert('Failed to sync calendar: ' + error.message, 'danger');
        }
    }

    /**
     * Disconnect calendar
     */
    async disconnectCalendar() {
        try {
            if (!this.selectedConnection) {
                this.showAlert('Please select a connection first', 'warning');
                return;
            }

            if (!confirm('Are you sure you want to disconnect this calendar? This action cannot be undone.')) {
                return;
            }

            const formData = new FormData();
            formData.append('connection_id', this.selectedConnection);

            const response = await fetch(`${this.apiBaseUrl}/connections`, {
                method: 'DELETE',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('Calendar disconnected successfully!', 'success');
                this.selectedConnection = null;
                document.getElementById('selectedConnection').value = '';
                await this.loadConnections();
            } else {
                throw new Error(result.message || 'Failed to disconnect calendar');
            }
        } catch (error) {
            console.error('Failed to disconnect calendar:', error);
            this.showAlert('Failed to disconnect calendar: ' + error.message, 'danger');
        }
    }

    /**
     * Load events
     */
    async loadEvents() {
        try {
            this.showLoading('eventsContainer');

            const startDate = document.getElementById('eventsStartDate').value;
            const endDate = document.getElementById('eventsEndDate').value;
            const connectionFilter = document.getElementById('eventsConnectionFilter').value;

            const params = new URLSearchParams({
                start_date: startDate,
                end_date: endDate
            });

            if (connectionFilter) {
                params.append('connection_ids', connectionFilter);
            }

            const response = await fetch(`${this.apiBaseUrl}/events?${params}`);
            const result = await response.json();

            if (result.success) {
                this.events = result.data.events;
                this.renderEvents();
                this.updateEventStats();
            } else {
                throw new Error(result.message || 'Failed to load events');
            }
        } catch (error) {
            console.error('Failed to load events:', error);
            this.showError('eventsContainer', 'Failed to load events: ' + error.message);
        }
    }

    /**
     * Render events
     */
    renderEvents() {
        const container = document.getElementById('eventsContainer');

        if (this.events.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-calendar-day fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No events found for the selected period</p>
                </div>
            `;
            return;
        }

        const eventsHTML = this.events.map(event => `
            <div class="event-card" data-event-id="${event.event_id}">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${event.title}</h6>
                        <p class="text-muted mb-2">${event.description || 'No description'}</p>
                        <div class="event-time">
                            <i class="fas fa-clock me-1"></i>
                            ${this.formatEventTime(event.start_time, event.end_time)}
                        </div>
                        ${event.location ? `
                            <div class="mt-1">
                                <i class="fas fa-map-marker-alt me-1"></i>
                                <small class="text-muted">${event.location}</small>
                            </div>
                        ` : ''}
                        ${event.attendees && event.attendees.length > 0 ? `
                            <div class="mt-1">
                                <i class="fas fa-users me-1"></i>
                                <small class="text-muted">${event.attendees.length} attendee(s)</small>
                            </div>
                        ` : ''}
                    </div>
                    <div class="text-end">
                        <small class="text-muted">${event.provider_name}</small>
                        <div class="mt-2">
                            <button class="btn btn-outline-primary btn-sm" onclick="calendarDemo.viewEventDetails('${event.event_id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = eventsHTML;
    }

    /**
     * Update event stats
     */
    updateEventStats() {
        const totalEvents = this.events.length;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

        const upcomingEvents = this.events.filter(event =>
            new Date(event.start_time) > now
        ).length;

        const todayEvents = this.events.filter(event => {
            const eventDate = new Date(event.start_time);
            return eventDate >= today && eventDate < tomorrow;
        }).length;

        document.getElementById('totalEvents').textContent = totalEvents;
        document.getElementById('upcomingEvents').textContent = upcomingEvents;
        document.getElementById('todayEvents').textContent = todayEvents;
    }

    /**
     * Show create event modal
     */
    showCreateEventModal() {
        // Set default times
        const now = new Date();
        const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

        document.getElementById('eventStartTime').value = this.formatDateTimeLocal(startTime);
        document.getElementById('eventEndTime').value = this.formatDateTimeLocal(endTime);

        const modal = new bootstrap.Modal(document.getElementById('createEventModal'));
        modal.show();
    }

    /**
     * Create event
     */
    async createEvent() {
        try {
            const form = document.getElementById('createEventForm');
            const formData = new FormData(form);

            // Get form values
            const eventData = {
                connection_id: document.getElementById('eventConnection').value,
                title: document.getElementById('eventTitle').value,
                description: document.getElementById('eventDescription').value,
                start_time: document.getElementById('eventStartTime').value,
                end_time: document.getElementById('eventEndTime').value,
                timezone: document.getElementById('eventTimezone').value,
                location: document.getElementById('eventLocation').value,
                meeting_url: document.getElementById('eventMeetingUrl').value,
                attendees: JSON.stringify(
                    document.getElementById('eventAttendees').value
                        .split(',')
                        .map(email => email.trim())
                        .filter(email => email)
                )
            };

            // Validate required fields
            if (!eventData.connection_id || !eventData.title || !eventData.start_time || !eventData.end_time) {
                this.showAlert('Please fill in all required fields', 'warning');
                return;
            }

            // Create FormData for API call
            const apiFormData = new FormData();
            Object.keys(eventData).forEach(key => {
                apiFormData.append(key, eventData[key]);
            });

            const response = await fetch(`${this.apiBaseUrl}/events`, {
                method: 'POST',
                body: apiFormData
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('Event created successfully!', 'success');

                // Close modal and refresh events
                const modal = bootstrap.Modal.getInstance(document.getElementById('createEventModal'));
                modal.hide();

                // Reset form
                form.reset();

                await this.loadEvents();
            } else {
                throw new Error(result.message || 'Failed to create event');
            }
        } catch (error) {
            console.error('Failed to create event:', error);
            this.showAlert('Failed to create event: ' + error.message, 'danger');
        }
    }

    /**
     * Load availability
     */
    async loadAvailability() {
        try {
            this.showLoading('availabilityContainer');

            const startDate = document.getElementById('availabilityStartDate').value;
            const endDate = document.getElementById('availabilityEndDate').value;
            const timezone = document.getElementById('availabilityTimezone').value;

            const params = new URLSearchParams({
                start_date: startDate,
                end_date: endDate,
                timezone: timezone
            });

            const response = await fetch(`${this.apiBaseUrl}/availability?${params}`);
            const result = await response.json();

            if (result.success) {
                this.renderAvailability(result.data);
                this.updateAvailabilityStats(result.data);
            } else {
                throw new Error(result.message || 'Failed to load availability');
            }
        } catch (error) {
            console.error('Failed to load availability:', error);
            this.showError('availabilityContainer', 'Failed to load availability: ' + error.message);
        }
    }

    /**
     * Render availability
     */
    renderAvailability(availabilityData) {
        const container = document.getElementById('availabilityContainer');

        const busyPeriods = availabilityData.busy_periods || [];
        const freePeriods = availabilityData.free_periods || [];

        let availabilityHTML = '';

        if (busyPeriods.length === 0 && freePeriods.length === 0) {
            availabilityHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-clock fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No availability data found for the selected period</p>
                </div>
            `;
        } else {
            availabilityHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <h6 class="mb-3">
                            <i class="fas fa-times-circle text-danger me-2"></i>
                            Busy Periods
                        </h6>
                        ${busyPeriods.length === 0 ?
                            '<p class="text-muted">No busy periods</p>' :
                            busyPeriods.map(period => `
                                <div class="availability-slot slot-busy">
                                    <div>
                                        <strong>${this.formatTime(period.start)} - ${this.formatTime(period.end)}</strong>
                                        ${period.title ? `<br><small class="text-muted">${period.title}</small>` : ''}
                                    </div>
                                    <div>
                                        <i class="fas fa-times-circle text-danger"></i>
                                    </div>
                                </div>
                            `).join('')
                        }
                    </div>
                    <div class="col-md-6">
                        <h6 class="mb-3">
                            <i class="fas fa-check-circle text-success me-2"></i>
                            Free Periods
                        </h6>
                        ${freePeriods.length === 0 ?
                            '<p class="text-muted">No free periods</p>' :
                            freePeriods.map(period => `
                                <div class="availability-slot slot-free">
                                    <div>
                                        <strong>${this.formatTime(period.start)} - ${this.formatTime(period.end)}</strong>
                                        <br><small class="text-muted">Available for scheduling</small>
                                    </div>
                                    <div>
                                        <i class="fas fa-check-circle text-success"></i>
                                    </div>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
            `;
        }

        container.innerHTML = availabilityHTML;
    }

    /**
     * Update availability stats
     */
    updateAvailabilityStats(availabilityData) {
        const busyPeriods = availabilityData.busy_periods || [];
        const freePeriods = availabilityData.free_periods || [];

        // Calculate total hours
        const totalBusyHours = busyPeriods.reduce((total, period) => {
            return total + this.calculateHoursDifference(period.start, period.end);
        }, 0);

        const totalFreeHours = freePeriods.reduce((total, period) => {
            return total + this.calculateHoursDifference(period.start, period.end);
        }, 0);

        const totalHours = totalBusyHours + totalFreeHours;
        const availabilityPercentage = totalHours > 0 ? Math.round((totalFreeHours / totalHours) * 100) : 0;

        document.getElementById('totalFreeHours').textContent = Math.round(totalFreeHours);
        document.getElementById('totalBusyHours').textContent = Math.round(totalBusyHours);
        document.getElementById('availabilityPercentage').textContent = availabilityPercentage + '%';
    }

    /**
     * Load demo data
     */
    async loadDemoData() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/demo-data`);
            const result = await response.json();

            if (result.success) {
                this.showAlert('Demo data loaded successfully!', 'success');

                // Show demo data in a modal or alert
                const demoData = result.data;
                let demoContent = '<h6>Demo Calendar Providers:</h6><ul>';
                demoData.providers.forEach(provider => {
                    demoContent += `<li>${provider.provider_name} (${provider.provider_type})</li>`;
                });
                demoContent += '</ul>';

                demoContent += '<h6>Sample Events:</h6><ul>';
                demoData.sample_events.forEach(event => {
                    demoContent += `<li>${event.title} - ${this.formatDate(event.start_time)}</li>`;
                });
                demoContent += '</ul>';

                this.showAlert(demoContent, 'info');
            } else {
                throw new Error(result.message || 'Failed to load demo data');
            }
        } catch (error) {
            console.error('Failed to load demo data:', error);
            this.showAlert('Failed to load demo data: ' + error.message, 'danger');
        }
    }

    /**
     * Show export modal
     */
    showExportModal() {
        const modal = new bootstrap.Modal(document.getElementById('exportModal'));
        modal.show();
    }

    /**
     * Export calendar data
     */
    async exportCalendarData() {
        try {
            const format = document.getElementById('exportFormat').value;
            const startDate = document.getElementById('exportStartDate').value;
            const endDate = document.getElementById('exportEndDate').value;
            const includePrivate = document.getElementById('includePrivateEvents').checked;

            const params = new URLSearchParams({
                format: format,
                start_date: startDate,
                end_date: endDate,
                include_private: includePrivate
            });

            const response = await fetch(`${this.apiBaseUrl}/export?${params}`);

            if (response.ok) {
                // Get filename from response headers or use default
                const contentDisposition = response.headers.get('Content-Disposition');
                let filename = `calendar_export.${format}`;

                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                    if (filenameMatch) {
                        filename = filenameMatch[1];
                    }
                }

                // Download the file
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                this.showAlert('Calendar data exported successfully!', 'success');

                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('exportModal'));
                modal.hide();
            } else {
                const result = await response.json();
                throw new Error(result.message || 'Failed to export calendar data');
            }
        } catch (error) {
            console.error('Failed to export calendar data:', error);
            this.showAlert('Failed to export calendar data: ' + error.message, 'danger');
        }
    }

    /**
     * Handle tab switch
     */
    handleTabSwitch(tabId) {
        switch (tabId) {
            case '#connections':
                this.loadConnections();
                break;
            case '#events':
                this.loadEvents();
                break;
            case '#availability':
                this.loadAvailability();
                break;
            case '#analytics':
                this.loadAnalytics();
                break;
        }
    }

    /**
     * Load analytics (placeholder)
     */
    async loadAnalytics() {
        try {
            this.showLoading('analyticsContainer');

            // Simulate analytics data
            setTimeout(() => {
                document.getElementById('analyticsContainer').innerHTML = `
                    <div class="text-center py-4">
                        <i class="fas fa-chart-bar fa-3x text-muted mb-3"></i>
                        <p class="text-muted">Analytics feature coming soon!</p>
                        <p class="text-muted">This will show sync performance, usage patterns, and integration health metrics.</p>
                    </div>
                `;
            }, 1000);
        } catch (error) {
            console.error('Failed to load analytics:', error);
            this.showError('analyticsContainer', 'Failed to load analytics: ' + error.message);
        }
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Show loading spinner
     */
    showLoading(containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = `
            <div class="loading-spinner" style="display: block;">
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

    /**
     * Get status CSS class
     */
    getStatusClass(status) {
        const statusClasses = {
            'active': 'status-active',
            'completed': 'status-active',
            'syncing': 'status-syncing',
            'pending': 'status-syncing',
            'failed': 'status-error',
            'error': 'status-error'
        };
        return statusClasses[status] || 'status-error';
    }

    /**
     * Format date
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    /**
     * Format time
     */
    formatTime(timeString) {
        if (timeString.includes('T')) {
            return new Date(timeString).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
        return timeString;
    }

    /**
     * Format event time
     */
    formatEventTime(startTime, endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);

        const startStr = start.toLocaleDateString() + ' ' + start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const endStr = end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        return `${startStr} - ${endStr}`;
    }

    /**
     * Format datetime for input
     */
    formatDateTimeLocal(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    /**
     * Calculate hours difference
     */
    calculateHoursDifference(startTime, endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);
        return (end - start) / (1000 * 60 * 60); // Convert milliseconds to hours
    }

    /**
     * View event details (placeholder)
     */
    viewEventDetails(eventId) {
        const event = this.events.find(e => e.event_id === eventId);
        if (event) {
            this.currentEvent = event;

            const detailsHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <h6>Event Information</h6>
                        <p><strong>Title:</strong> ${event.title}</p>
                        <p><strong>Description:</strong> ${event.description || 'No description'}</p>
                        <p><strong>Location:</strong> ${event.location || 'No location'}</p>
                        <p><strong>Time:</strong> ${this.formatEventTime(event.start_time, event.end_time)}</p>
                    </div>
                    <div class="col-md-6">
                        <h6>Additional Details</h6>
                        <p><strong>Provider:</strong> ${event.provider_name}</p>
                        <p><strong>Status:</strong> ${event.status || 'Confirmed'}</p>
                        <p><strong>Timezone:</strong> ${event.timezone || 'UTC'}</p>
                        ${event.meeting_url ? `<p><strong>Meeting URL:</strong> <a href="${event.meeting_url}" target="_blank">${event.meeting_url}</a></p>` : ''}
                    </div>
                </div>
                ${event.attendees && event.attendees.length > 0 ? `
                    <div class="mt-3">
                        <h6>Attendees</h6>
                        <ul class="list-unstyled">
                            ${event.attendees.map(attendee => `<li><i class="fas fa-user me-2"></i>${attendee}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            `;

            document.getElementById('eventDetailsContent').innerHTML = detailsHTML;

            const modal = new bootstrap.Modal(document.getElementById('eventDetailsModal'));
            modal.show();
        }
    }
}

// Export for global access
window.CalendarIntegrationDemo = CalendarIntegrationDemo;
