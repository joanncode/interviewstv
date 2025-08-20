import API from '../../services/api.js';
import Auth from '../../services/auth.js';
import SearchBox from '../../components/SearchBox.js';

export default class EventsDirectoryPage {
    constructor() {
        this.currentUser = Auth.getCurrentUser();
        this.events = [];
        this.eventTypes = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.isLoading = false;
        this.currentFilters = {
            search: '',
            event_type: '',
            is_virtual: '',
            date_from: '',
            date_to: '',
            sort: 'start_date'
        };
        this.searchBox = null;
    }

    async render(container) {
        container.innerHTML = this.getHTML();
        this.setupEventListeners(container);
        this.initializeSearchBox(container);
        
        await Promise.all([
            this.loadEventTypes(),
            this.loadEvents()
        ]);
    }

    getHTML() {
        return `
            <div class="events-directory-page">
                <div class="container py-4">
                    <!-- Header Section -->
                    <div class="row mb-4">
                        <div class="col-lg-8">
                            <h1 class="display-5 fw-bold mb-3">Events Directory</h1>
                            <p class="lead text-muted">
                                Discover upcoming events, workshops, and live interviews
                            </p>
                        </div>
                        <div class="col-lg-4 text-lg-end">
                            ${this.currentUser ? `
                                <a href="/events/create" class="btn btn-primary">
                                    <i class="fas fa-plus me-2"></i>Create Event
                                </a>
                            ` : `
                                <a href="/login" class="btn btn-outline-primary">
                                    <i class="fas fa-sign-in-alt me-2"></i>Login to Create Events
                                </a>
                            `}
                        </div>
                    </div>

                    <!-- Search and Filters -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <!-- Search Box -->
                            <div class="row mb-3">
                                <div class="col-lg-8">
                                    <div id="events-search-box"></div>
                                </div>
                                <div class="col-lg-4">
                                    <select class="form-select" id="sort-select">
                                        <option value="start_date">Upcoming First</option>
                                        <option value="created_at">Newest First</option>
                                        <option value="title">Name A-Z</option>
                                        <option value="attendees">Most Popular</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Filters -->
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <select class="form-select" id="event-type-filter">
                                        <option value="">All Event Types</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <select class="form-select" id="virtual-filter">
                                        <option value="">All Events</option>
                                        <option value="true">Virtual Only</option>
                                        <option value="false">In-Person Only</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <input type="date" 
                                           class="form-control" 
                                           id="date-from-filter"
                                           placeholder="From date">
                                </div>
                                <div class="col-md-3">
                                    <input type="date" 
                                           class="form-control" 
                                           id="date-to-filter"
                                           placeholder="To date">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Results Section -->
                    <div class="row">
                        <!-- Main Content -->
                        <div class="col-lg-9">
                            <!-- Results Header -->
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <div id="results-info">
                                    <span class="text-muted">Loading events...</span>
                                </div>
                                <div class="view-toggle btn-group btn-group-sm" role="group">
                                    <button type="button" class="btn btn-outline-secondary active" data-view="grid">
                                        <i class="fas fa-th"></i>
                                    </button>
                                    <button type="button" class="btn btn-outline-secondary" data-view="list">
                                        <i class="fas fa-list"></i>
                                    </button>
                                </div>
                            </div>

                            <!-- Events Grid -->
                            <div id="events-grid" class="events-grid">
                                <div class="text-center py-5">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Loading events...</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Pagination -->
                            <nav aria-label="Events pagination" id="pagination-container" style="display: none;">
                                <ul class="pagination justify-content-center" id="pagination">
                                </ul>
                            </nav>
                        </div>

                        <!-- Sidebar -->
                        <div class="col-lg-3">
                            <!-- Upcoming Events -->
                            <div class="card mb-4">
                                <div class="card-header">
                                    <h6 class="mb-0">
                                        <i class="fas fa-calendar-alt text-primary me-2"></i>Coming Soon
                                    </h6>
                                </div>
                                <div class="card-body" id="upcoming-events">
                                    <div class="text-center py-3">
                                        <div class="spinner-border spinner-border-sm text-primary" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Event Types Stats -->
                            <div class="card mb-4">
                                <div class="card-header">
                                    <h6 class="mb-0">
                                        <i class="fas fa-chart-pie text-info me-2"></i>Event Types
                                    </h6>
                                </div>
                                <div class="card-body" id="event-types-stats">
                                    <div class="text-center py-3">
                                        <div class="spinner-border spinner-border-sm text-primary" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Quick Actions -->
                            <div class="card">
                                <div class="card-header">
                                    <h6 class="mb-0">
                                        <i class="fas fa-bolt text-primary me-2"></i>Quick Actions
                                    </h6>
                                </div>
                                <div class="card-body">
                                    <div class="d-grid gap-2">
                                        ${this.currentUser ? `
                                            <a href="/events/create" class="btn btn-primary btn-sm">
                                                <i class="fas fa-plus me-2"></i>Create Event
                                            </a>
                                            <a href="/events/my" class="btn btn-outline-primary btn-sm">
                                                <i class="fas fa-calendar me-2"></i>My Events
                                            </a>
                                        ` : `
                                            <a href="/login" class="btn btn-primary btn-sm">
                                                <i class="fas fa-sign-in-alt me-2"></i>Login
                                            </a>
                                            <a href="/register" class="btn btn-outline-primary btn-sm">
                                                <i class="fas fa-user-plus me-2"></i>Sign Up
                                            </a>
                                        `}
                                        <a href="/interviews" class="btn btn-outline-secondary btn-sm">
                                            <i class="fas fa-video me-2"></i>Browse Interviews
                                        </a>
                                        <a href="/business" class="btn btn-outline-secondary btn-sm">
                                            <i class="fas fa-building me-2"></i>Browse Businesses
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadEvents(page = 1) {
        if (this.isLoading) return;

        try {
            this.isLoading = true;
            this.showLoadingState();

            const params = {
                page,
                limit: 12,
                ...this.currentFilters
            };

            // Remove empty filters
            Object.keys(params).forEach(key => {
                if (params[key] === '') {
                    delete params[key];
                }
            });

            const response = await API.get('/api/events', params);

            if (response.success) {
                this.events = response.data.events;
                this.currentPage = response.data.page;
                this.totalPages = response.data.pages;
                
                this.renderEvents();
                this.renderPagination();
                this.updateResultsInfo(response.data.total);
            } else {
                this.showErrorState('Failed to load events');
            }

        } catch (error) {
            console.error('Failed to load events:', error);
            this.showErrorState('Failed to load events');
        } finally {
            this.isLoading = false;
        }
    }

    async loadEventTypes() {
        try {
            const response = await API.get('/api/events/types');
            
            if (response.success) {
                this.eventTypes = response.data;
                this.renderEventTypeFilter();
                this.renderEventTypesStats();
            }
        } catch (error) {
            console.error('Failed to load event types:', error);
        }
    }

    async loadUpcomingEvents() {
        try {
            const response = await API.get('/api/events/upcoming', { limit: 5 });
            
            if (response.success) {
                this.renderUpcomingEvents(response.data);
            }
        } catch (error) {
            console.error('Failed to load upcoming events:', error);
        }
    }

    renderEvents() {
        const container = document.getElementById('events-grid');
        const viewMode = document.querySelector('.view-toggle .active').dataset.view;
        
        if (this.events.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                    <h5>No events found</h5>
                    <p class="text-muted">Try adjusting your search criteria</p>
                    ${this.currentUser ? `
                        <a href="/events/create" class="btn btn-primary">
                            <i class="fas fa-plus me-2"></i>Create the First Event
                        </a>
                    ` : ''}
                </div>
            `;
            return;
        }

        if (viewMode === 'grid') {
            container.className = 'events-grid row g-4';
            container.innerHTML = this.events.map(event => `
                <div class="col-md-6 col-lg-4">
                    ${this.getEventCardHTML(event)}
                </div>
            `).join('');
        } else {
            container.className = 'events-list';
            container.innerHTML = this.events.map(event => 
                this.getEventListItemHTML(event)
            ).join('');
        }
    }

    getEventCardHTML(event) {
        return `
            <div class="event-card card h-100">
                <div class="position-relative">
                    ${event.cover_image_url ? `
                        <img src="${event.cover_image_url}" 
                             class="card-img-top" 
                             style="height: 200px; object-fit: cover;"
                             alt="${event.title}">
                    ` : `
                        <div class="card-img-top d-flex align-items-center justify-content-center bg-light" 
                             style="height: 200px;">
                            <i class="fas fa-calendar-alt fa-3x text-muted"></i>
                        </div>
                    `}
                    
                    <div class="position-absolute top-0 end-0 m-2">
                        <span class="badge bg-${this.getEventTypeColor(event.event_type)}">
                            ${this.getEventTypeLabel(event.event_type)}
                        </span>
                    </div>
                    
                    ${event.is_virtual ? `
                        <div class="position-absolute top-0 start-0 m-2">
                            <span class="badge bg-info">
                                <i class="fas fa-video me-1"></i>Virtual
                            </span>
                        </div>
                    ` : ''}
                    
                    <div class="position-absolute bottom-0 start-0 end-0 p-3 bg-gradient-dark text-white">
                        <div class="event-status">
                            ${this.getEventStatusBadge(event)}
                        </div>
                    </div>
                </div>
                
                <div class="card-body">
                    <h6 class="card-title">
                        <a href="/events/${event.id}" class="text-decoration-none">
                            ${event.title}
                        </a>
                    </h6>
                    
                    <p class="card-text small text-muted">
                        ${event.description ? event.description.substring(0, 100) + '...' : 'No description available'}
                    </p>
                    
                    <div class="event-details small">
                        <div class="mb-1">
                            <i class="fas fa-clock text-muted me-1"></i>
                            ${event.formatted_start_date}
                        </div>
                        
                        ${event.location && !event.is_virtual ? `
                            <div class="mb-1">
                                <i class="fas fa-map-marker-alt text-muted me-1"></i>
                                ${event.location}
                            </div>
                        ` : ''}
                        
                        ${event.ticket_price ? `
                            <div class="mb-1">
                                <i class="fas fa-ticket-alt text-muted me-1"></i>
                                $${event.ticket_price}
                            </div>
                        ` : `
                            <div class="mb-1">
                                <i class="fas fa-gift text-success me-1"></i>
                                Free
                            </div>
                        `}
                    </div>
                    
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <div class="event-stats">
                            <small class="text-muted">
                                ${event.attendee_count} attending
                            </small>
                        </div>
                        <a href="/events/${event.id}" class="btn btn-sm btn-outline-primary">
                            View Details
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    getEventListItemHTML(event) {
        return `
            <div class="event-list-item card mb-3">
                <div class="row g-0">
                    <div class="col-md-3">
                        ${event.cover_image_url ? `
                            <img src="${event.cover_image_url}" 
                                 class="img-fluid rounded-start h-100" 
                                 style="object-fit: cover; min-height: 150px;"
                                 alt="${event.title}">
                        ` : `
                            <div class="d-flex align-items-center justify-content-center bg-light rounded-start h-100" 
                                 style="min-height: 150px;">
                                <i class="fas fa-calendar-alt fa-2x text-muted"></i>
                            </div>
                        `}
                    </div>
                    <div class="col-md-9">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h5 class="card-title">
                                    <a href="/events/${event.id}" class="text-decoration-none">
                                        ${event.title}
                                    </a>
                                </h5>
                                <div class="event-badges">
                                    <span class="badge bg-${this.getEventTypeColor(event.event_type)} me-1">
                                        ${this.getEventTypeLabel(event.event_type)}
                                    </span>
                                    ${event.is_virtual ? `
                                        <span class="badge bg-info">Virtual</span>
                                    ` : ''}
                                </div>
                            </div>
                            
                            <p class="card-text">
                                ${event.description || 'No description available'}
                            </p>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="event-details small">
                                        <div class="mb-1">
                                            <i class="fas fa-clock text-muted me-1"></i>
                                            ${event.formatted_start_date}
                                        </div>
                                        
                                        ${event.location && !event.is_virtual ? `
                                            <div class="mb-1">
                                                <i class="fas fa-map-marker-alt text-muted me-1"></i>
                                                ${event.location}
                                            </div>
                                        ` : ''}
                                        
                                        <div class="mb-1">
                                            <i class="fas fa-user text-muted me-1"></i>
                                            By @${event.promoter_username}
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="event-stats">
                                        <div class="mb-1">
                                            <small class="text-muted">
                                                ${event.attendee_count} attending
                                            </small>
                                        </div>
                                        <div class="mb-1">
                                            <small class="text-muted">
                                                ${event.interview_count} interviews
                                            </small>
                                        </div>
                                        ${event.ticket_price ? `
                                            <div class="mb-1">
                                                <span class="badge bg-warning text-dark">$${event.ticket_price}</span>
                                            </div>
                                        ` : `
                                            <div class="mb-1">
                                                <span class="badge bg-success">Free</span>
                                            </div>
                                        `}
                                    </div>
                                </div>
                            </div>
                            
                            <div class="mt-3">
                                <a href="/events/${event.id}" class="btn btn-primary btn-sm">
                                    View Details
                                </a>
                                ${event.event_url ? `
                                    <a href="${event.event_url}" target="_blank" class="btn btn-outline-secondary btn-sm ms-2">
                                        <i class="fas fa-external-link-alt me-1"></i>Event Page
                                    </a>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderEventTypeFilter() {
        const select = document.getElementById('event-type-filter');
        
        select.innerHTML = '<option value="">All Event Types</option>' +
            this.eventTypes.map(type => `
                <option value="${type.event_type}">
                    ${this.getEventTypeLabel(type.event_type)} (${type.count})
                </option>
            `).join('');
    }

    renderEventTypesStats() {
        const container = document.getElementById('event-types-stats');
        
        if (this.eventTypes.length === 0) {
            container.innerHTML = `
                <div class="text-center py-3">
                    <i class="fas fa-chart-pie fa-2x text-muted mb-2"></i>
                    <p class="text-muted small mb-0">No event data</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.eventTypes.slice(0, 5).map(type => `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="small">
                    <i class="fas fa-circle text-${this.getEventTypeColor(type.event_type)} me-1"></i>
                    ${this.getEventTypeLabel(type.event_type)}
                </span>
                <span class="badge bg-light text-dark">${type.count}</span>
            </div>
        `).join('');
    }

    renderUpcomingEvents(events) {
        const container = document.getElementById('upcoming-events');
        
        if (events.length === 0) {
            container.innerHTML = `
                <div class="text-center py-3">
                    <i class="fas fa-calendar fa-2x text-muted mb-2"></i>
                    <p class="text-muted small mb-0">No upcoming events</p>
                </div>
            `;
            return;
        }

        container.innerHTML = events.map(event => `
            <div class="upcoming-event-item d-flex align-items-center mb-3">
                <div class="flex-shrink-0 me-3">
                    <div class="event-date-badge bg-primary text-white rounded text-center p-2" style="min-width: 50px;">
                        <div class="small fw-bold">${this.formatEventDate(event.start_date).day}</div>
                        <div class="small">${this.formatEventDate(event.start_date).month}</div>
                    </div>
                </div>
                
                <div class="flex-grow-1">
                    <h6 class="mb-1 small">
                        <a href="/events/${event.id}" class="text-decoration-none">
                            ${event.title}
                        </a>
                    </h6>
                    <small class="text-muted">
                        ${event.attendee_count} attending
                        ${event.is_virtual ? ' • Virtual' : ''}
                    </small>
                </div>
            </div>
        `).join('');
    }

    renderPagination() {
        const container = document.getElementById('pagination-container');
        const pagination = document.getElementById('pagination');
        
        if (this.totalPages <= 1) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        
        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage - 1}">Previous</a>
            </li>
        `;
        
        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }
        
        // Next button
        paginationHTML += `
            <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage + 1}">Next</a>
            </li>
        `;
        
        pagination.innerHTML = paginationHTML;
    }

    updateResultsInfo(total) {
        const container = document.getElementById('results-info');
        const start = (this.currentPage - 1) * 12 + 1;
        const end = Math.min(this.currentPage * 12, total);
        
        container.innerHTML = `
            <span class="text-muted">
                Showing ${start}-${end} of ${total} events
            </span>
        `;
    }

    initializeSearchBox(container) {
        const searchContainer = container.querySelector('#events-search-box');
        if (searchContainer) {
            this.searchBox = new SearchBox(searchContainer, {
                placeholder: 'Search events by title, description, or location...',
                showSuggestions: true,
                showFilters: false,
                onSearch: (query) => {
                    this.currentFilters.search = query;
                    this.currentPage = 1;
                    this.loadEvents();
                }
            });
            this.searchBox.render();
        }
    }

    setupEventListeners(container) {
        // Sort change
        const sortSelect = container.querySelector('#sort-select');
        sortSelect.addEventListener('change', (e) => {
            this.currentFilters.sort = e.target.value;
            this.currentPage = 1;
            this.loadEvents();
        });

        // Event type filter
        const eventTypeFilter = container.querySelector('#event-type-filter');
        eventTypeFilter.addEventListener('change', (e) => {
            this.currentFilters.event_type = e.target.value;
            this.currentPage = 1;
            this.loadEvents();
        });

        // Virtual filter
        const virtualFilter = container.querySelector('#virtual-filter');
        virtualFilter.addEventListener('change', (e) => {
            this.currentFilters.is_virtual = e.target.value;
            this.currentPage = 1;
            this.loadEvents();
        });

        // Date filters
        const dateFromFilter = container.querySelector('#date-from-filter');
        const dateToFilter = container.querySelector('#date-to-filter');
        
        [dateFromFilter, dateToFilter].forEach((filter, index) => {
            filter.addEventListener('change', (e) => {
                const filterKey = index === 0 ? 'date_from' : 'date_to';
                this.currentFilters[filterKey] = e.target.value;
                this.currentPage = 1;
                this.loadEvents();
            });
        });

        // View toggle
        const viewToggle = container.querySelectorAll('.view-toggle button');
        viewToggle.forEach(button => {
            button.addEventListener('click', (e) => {
                viewToggle.forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                this.renderEvents();
            });
        });

        // Pagination
        container.addEventListener('click', (e) => {
            if (e.target.matches('.page-link')) {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                if (page && page !== this.currentPage) {
                    this.currentPage = page;
                    this.loadEvents(page);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }
        });

        // Load upcoming events
        this.loadUpcomingEvents();
    }

    getEventTypeLabel(type) {
        const labels = {
            'conference': 'Conference',
            'workshop': 'Workshop',
            'webinar': 'Webinar',
            'meetup': 'Meetup',
            'festival': 'Festival',
            'interview': 'Interview',
            'general': 'General'
        };
        return labels[type] || type;
    }

    getEventTypeColor(type) {
        const colors = {
            'conference': 'primary',
            'workshop': 'success',
            'webinar': 'info',
            'meetup': 'warning',
            'festival': 'danger',
            'interview': 'secondary',
            'general': 'dark'
        };
        return colors[type] || 'secondary';
    }

    getEventStatusBadge(event) {
        if (event.is_upcoming) {
            return '<span class="badge bg-success">Upcoming</span>';
        } else if (event.is_ongoing) {
            return '<span class="badge bg-warning">Live Now</span>';
        } else if (event.is_past) {
            return '<span class="badge bg-secondary">Past Event</span>';
        }
        return '';
    }

    formatEventDate(dateString) {
        const date = new Date(dateString);
        return {
            day: date.getDate(),
            month: date.toLocaleDateString('en-US', { month: 'short' })
        };
    }

    showLoadingState() {
        const container = document.getElementById('events-grid');
        container.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading events...</span>
                </div>
            </div>
        `;
    }

    showErrorState(message) {
        const container = document.getElementById('events-grid');
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-exclamation-triangle fa-3x text-muted mb-3"></i>
                <h5>Error Loading Events</h5>
                <p class="text-muted">${message}</p>
                <button class="btn btn-outline-primary" onclick="location.reload()">
                    <i class="fas fa-refresh me-2"></i>Try Again
                </button>
            </div>
        `;
    }

    destroy() {
        if (this.searchBox) {
            this.searchBox.destroy();
        }
    }
}

// Continue with EventProfilePage in next file...
