/**
 * Interview Scheduling System for Interviews.tv
 * Professional scheduling with calendar integration and automated workflows
 */
class InterviewSchedulingSystem {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            enableCalendarIntegration: true,
            enableRecurringSchedules: true,
            enableTimeZoneSupport: true,
            enableAutomatedReminders: true,
            enableAvailabilityManagement: true,
            enableBookingConfirmation: true,
            enableRescheduling: true,
            enableCancellation: true,
            enableWaitingList: true,
            enableCustomFields: true,
            defaultDuration: 60, // minutes
            bufferTime: 15, // minutes between interviews
            maxAdvanceBooking: 90, // days
            minAdvanceBooking: 1, // hours
            workingHours: {
                start: '09:00',
                end: '17:00'
            },
            workingDays: [1, 2, 3, 4, 5], // Monday to Friday
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            reminderTimes: [24, 2, 0.5], // hours before interview
            enableGoogleCalendar: true,
            enableOutlookCalendar: true,
            enableAppleCalendar: true,
            themeSystem: null,
            accessibilitySystem: null,
            responsiveSystem: null,
            brandingSystem: null,
            ...options
        };
        
        // Scheduling state
        this.currentUser = null;
        this.userRole = 'guest'; // 'host' or 'guest'
        this.selectedDate = null;
        this.selectedTime = null;
        this.selectedDuration = this.options.defaultDuration;
        this.availableSlots = new Map();
        this.bookedSlots = new Map();
        this.recurringSchedules = new Map();
        this.customFields = new Map();
        
        // UI components
        this.schedulingContainer = null;
        this.calendarView = null;
        this.timeSlotSelector = null;
        this.bookingForm = null;
        this.confirmationModal = null;
        this.rescheduleModal = null;
        this.availabilityManager = null;
        
        // Calendar integration
        this.googleCalendar = null;
        this.outlookCalendar = null;
        this.appleCalendar = null;
        
        // Event handlers
        this.boundEventHandlers = {
            handleDateSelect: this.handleDateSelect.bind(this),
            handleTimeSelect: this.handleTimeSelect.bind(this),
            handleBookingSubmit: this.handleBookingSubmit.bind(this),
            handleReschedule: this.handleReschedule.bind(this),
            handleCancellation: this.handleCancellation.bind(this),
            handleAvailabilityUpdate: this.handleAvailabilityUpdate.bind(this),
            handleRecurringSchedule: this.handleRecurringSchedule.bind(this)
        };
        
        this.init();
    }
    
    /**
     * Initialize scheduling system
     */
    async init() {
        try {
            console.log('📅 Initializing Interview Scheduling System...');
            
            // Inject CSS
            this.injectSchedulingCSS();
            
            // Create UI components
            this.createSchedulingContainer();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize calendar integrations
            await this.initializeCalendarIntegrations();
            
            // Load user data and availability
            await this.loadUserData();
            await this.loadAvailability();
            
            console.log('✅ Interview Scheduling System initialized');
            
            // Emit initialization event
            this.emitSchedulingEvent('scheduling-initialized', {
                userRole: this.userRole,
                timeZone: this.options.timeZone
            });
            
        } catch (error) {
            console.error('Failed to initialize scheduling system:', error);
            this.handleInitializationError(error);
        }
    }
    
    /**
     * Set user role and initialize appropriate interface
     */
    setUserRole(role, userData) {
        this.userRole = role;
        this.currentUser = userData;
        
        if (role === 'host') {
            this.createHostInterface();
        } else {
            this.createGuestInterface();
        }
        
        this.emitSchedulingEvent('user-role-set', { role, userData });
    }
    
    /**
     * Create scheduling container
     */
    createSchedulingContainer() {
        this.schedulingContainer = document.createElement('div');
        this.schedulingContainer.className = 'interview-scheduling-system';
        this.schedulingContainer.innerHTML = `
            <div class="scheduling-header">
                <div class="header-content">
                    <h2 class="scheduling-title">
                        <i class="fas fa-calendar-alt"></i>
                        Interview Scheduling
                    </h2>
                    <div class="scheduling-actions">
                        <button class="btn-view-toggle" id="view-toggle" data-view="calendar">
                            <i class="fas fa-calendar"></i>
                            Calendar View
                        </button>
                        <button class="btn-timezone" id="timezone-btn">
                            <i class="fas fa-globe"></i>
                            <span id="current-timezone">${this.options.timeZone}</span>
                        </button>
                    </div>
                </div>
            </div>
            <div class="scheduling-content" id="scheduling-content">
                <!-- Content will be dynamically generated based on user role -->
            </div>
        `;
        
        this.container.appendChild(this.schedulingContainer);
    }
    
    /**
     * Create host interface
     */
    createHostInterface() {
        const content = this.schedulingContainer.querySelector('#scheduling-content');
        content.innerHTML = `
            <div class="host-scheduling-interface">
                <div class="scheduling-sidebar">
                    <div class="availability-manager" id="availability-manager">
                        <div class="section-header">
                            <h3><i class="fas fa-clock"></i> Availability Management</h3>
                        </div>
                        <div class="availability-controls">
                            <div class="working-hours">
                                <h4>Working Hours</h4>
                                <div class="time-range">
                                    <label>Start Time:</label>
                                    <input type="time" id="work-start" value="${this.options.workingHours.start}">
                                </div>
                                <div class="time-range">
                                    <label>End Time:</label>
                                    <input type="time" id="work-end" value="${this.options.workingHours.end}">
                                </div>
                            </div>
                            
                            <div class="working-days">
                                <h4>Working Days</h4>
                                <div class="day-checkboxes">
                                    ${this.generateDayCheckboxes()}
                                </div>
                            </div>
                            
                            <div class="interview-settings">
                                <h4>Interview Settings</h4>
                                <div class="setting-group">
                                    <label>Default Duration (minutes):</label>
                                    <select id="default-duration">
                                        <option value="30">30 minutes</option>
                                        <option value="45">45 minutes</option>
                                        <option value="60" selected>60 minutes</option>
                                        <option value="90">90 minutes</option>
                                        <option value="120">120 minutes</option>
                                    </select>
                                </div>
                                <div class="setting-group">
                                    <label>Buffer Time (minutes):</label>
                                    <select id="buffer-time">
                                        <option value="0">No buffer</option>
                                        <option value="5">5 minutes</option>
                                        <option value="10">10 minutes</option>
                                        <option value="15" selected>15 minutes</option>
                                        <option value="30">30 minutes</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="recurring-schedules">
                                <h4>Recurring Availability</h4>
                                <button class="btn-add-recurring" id="add-recurring-btn">
                                    <i class="fas fa-plus"></i>
                                    Add Recurring Schedule
                                </button>
                                <div class="recurring-list" id="recurring-list">
                                    <!-- Recurring schedules will be listed here -->
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="upcoming-interviews" id="upcoming-interviews">
                        <div class="section-header">
                            <h3><i class="fas fa-calendar-check"></i> Upcoming Interviews</h3>
                        </div>
                        <div class="interview-list" id="interview-list">
                            <!-- Upcoming interviews will be listed here -->
                        </div>
                    </div>
                </div>
                
                <div class="scheduling-main">
                    <div class="calendar-container" id="calendar-container">
                        <!-- Calendar will be rendered here -->
                    </div>
                </div>
            </div>
        `;
        
        this.availabilityManager = content.querySelector('#availability-manager');
        this.setupHostControls();
        this.renderCalendar();
        this.loadUpcomingInterviews();
    }
    
    /**
     * Create guest interface
     */
    createGuestInterface() {
        const content = this.schedulingContainer.querySelector('#scheduling-content');
        content.innerHTML = `
            <div class="guest-scheduling-interface">
                <div class="booking-steps">
                    <div class="step-indicator">
                        <div class="step active" data-step="1">
                            <span class="step-number">1</span>
                            <span class="step-label">Select Date</span>
                        </div>
                        <div class="step" data-step="2">
                            <span class="step-number">2</span>
                            <span class="step-label">Choose Time</span>
                        </div>
                        <div class="step" data-step="3">
                            <span class="step-number">3</span>
                            <span class="step-label">Interview Details</span>
                        </div>
                        <div class="step" data-step="4">
                            <span class="step-number">4</span>
                            <span class="step-label">Confirmation</span>
                        </div>
                    </div>
                </div>
                
                <div class="booking-content">
                    <div class="booking-step" id="step-1" data-step="1">
                        <div class="step-header">
                            <h3>Select Interview Date</h3>
                            <p>Choose your preferred date for the interview</p>
                        </div>
                        <div class="calendar-container" id="guest-calendar">
                            <!-- Calendar will be rendered here -->
                        </div>
                    </div>
                    
                    <div class="booking-step" id="step-2" data-step="2" style="display: none;">
                        <div class="step-header">
                            <h3>Choose Time Slot</h3>
                            <p>Select an available time slot for <span id="selected-date-display"></span></p>
                        </div>
                        <div class="time-slots-container" id="time-slots">
                            <!-- Available time slots will be displayed here -->
                        </div>
                        <div class="step-navigation">
                            <button class="btn-back" onclick="schedulingSystem.previousStep()">
                                <i class="fas fa-arrow-left"></i>
                                Back
                            </button>
                        </div>
                    </div>
                    
                    <div class="booking-step" id="step-3" data-step="3" style="display: none;">
                        <div class="step-header">
                            <h3>Interview Details</h3>
                            <p>Provide information about your interview</p>
                        </div>
                        <div class="booking-form" id="booking-form">
                            <div class="form-group">
                                <label for="interview-title">Interview Title *</label>
                                <input type="text" id="interview-title" required placeholder="e.g., Software Engineer Position">
                            </div>
                            
                            <div class="form-group">
                                <label for="interview-description">Description</label>
                                <textarea id="interview-description" rows="3" placeholder="Brief description of the interview purpose"></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label for="interview-duration">Duration</label>
                                <select id="interview-duration">
                                    <option value="30">30 minutes</option>
                                    <option value="45">45 minutes</option>
                                    <option value="60" selected>60 minutes</option>
                                    <option value="90">90 minutes</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="guest-name">Your Name *</label>
                                <input type="text" id="guest-name" required placeholder="Full name">
                            </div>
                            
                            <div class="form-group">
                                <label for="guest-email">Email Address *</label>
                                <input type="email" id="guest-email" required placeholder="your.email@example.com">
                            </div>
                            
                            <div class="form-group">
                                <label for="guest-phone">Phone Number</label>
                                <input type="tel" id="guest-phone" placeholder="+1 (555) 123-4567">
                            </div>
                            
                            <div class="custom-fields" id="custom-fields">
                                <!-- Custom fields will be added here -->
                            </div>
                        </div>
                        <div class="step-navigation">
                            <button class="btn-back" onclick="schedulingSystem.previousStep()">
                                <i class="fas fa-arrow-left"></i>
                                Back
                            </button>
                            <button class="btn-next" onclick="schedulingSystem.nextStep()">
                                Next
                                <i class="fas fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="booking-step" id="step-4" data-step="4" style="display: none;">
                        <div class="step-header">
                            <h3>Confirm Your Interview</h3>
                            <p>Please review your interview details</p>
                        </div>
                        <div class="booking-summary" id="booking-summary">
                            <!-- Booking summary will be displayed here -->
                        </div>
                        <div class="step-navigation">
                            <button class="btn-back" onclick="schedulingSystem.previousStep()">
                                <i class="fas fa-arrow-left"></i>
                                Back
                            </button>
                            <button class="btn-confirm" onclick="schedulingSystem.confirmBooking()">
                                <i class="fas fa-check"></i>
                                Confirm Interview
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.bookingForm = content.querySelector('#booking-form');
        this.setupGuestControls();
        this.renderGuestCalendar();
        this.loadCustomFields();
    }

    /**
     * Generate day checkboxes for working days
     */
    generateDayCheckboxes() {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days.map((day, index) => {
            const checked = this.options.workingDays.includes(index) ? 'checked' : '';
            return `
                <label class="day-checkbox">
                    <input type="checkbox" value="${index}" ${checked}>
                    <span>${day}</span>
                </label>
            `;
        }).join('');
    }

    /**
     * Setup host controls
     */
    setupHostControls() {
        // Working hours controls
        const workStartInput = this.availabilityManager.querySelector('#work-start');
        const workEndInput = this.availabilityManager.querySelector('#work-end');

        workStartInput.addEventListener('change', () => {
            this.options.workingHours.start = workStartInput.value;
            this.updateAvailability();
        });

        workEndInput.addEventListener('change', () => {
            this.options.workingHours.end = workEndInput.value;
            this.updateAvailability();
        });

        // Working days checkboxes
        const dayCheckboxes = this.availabilityManager.querySelectorAll('.day-checkbox input');
        dayCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateWorkingDays();
            });
        });

        // Duration and buffer time
        const durationSelect = this.availabilityManager.querySelector('#default-duration');
        const bufferSelect = this.availabilityManager.querySelector('#buffer-time');

        durationSelect.addEventListener('change', () => {
            this.options.defaultDuration = parseInt(durationSelect.value);
            this.updateAvailability();
        });

        bufferSelect.addEventListener('change', () => {
            this.options.bufferTime = parseInt(bufferSelect.value);
            this.updateAvailability();
        });

        // Add recurring schedule button
        const addRecurringBtn = this.availabilityManager.querySelector('#add-recurring-btn');
        addRecurringBtn.addEventListener('click', () => {
            this.openRecurringScheduleModal();
        });
    }

    /**
     * Setup guest controls
     */
    setupGuestControls() {
        // Form validation
        const requiredFields = this.bookingForm.querySelectorAll('input[required]');
        requiredFields.forEach(field => {
            field.addEventListener('blur', () => {
                this.validateField(field);
            });
        });

        // Duration change
        const durationSelect = this.bookingForm.querySelector('#interview-duration');
        durationSelect.addEventListener('change', () => {
            this.selectedDuration = parseInt(durationSelect.value);
            this.updateBookingSummary();
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // View toggle
        const viewToggle = this.schedulingContainer.querySelector('#view-toggle');
        viewToggle.addEventListener('click', () => {
            this.toggleCalendarView();
        });

        // Timezone button
        const timezoneBtn = this.schedulingContainer.querySelector('#timezone-btn');
        timezoneBtn.addEventListener('click', () => {
            this.openTimezoneSelector();
        });
    }

    /**
     * Initialize calendar integrations
     */
    async initializeCalendarIntegrations() {
        try {
            if (this.options.enableGoogleCalendar) {
                await this.initializeGoogleCalendar();
            }

            if (this.options.enableOutlookCalendar) {
                await this.initializeOutlookCalendar();
            }

            if (this.options.enableAppleCalendar) {
                await this.initializeAppleCalendar();
            }

            console.log('Calendar integrations initialized');

        } catch (error) {
            console.warn('Some calendar integrations failed to initialize:', error);
        }
    }

    /**
     * Initialize Google Calendar integration
     */
    async initializeGoogleCalendar() {
        // Google Calendar API integration would go here
        console.log('Google Calendar integration initialized');
    }

    /**
     * Initialize Outlook Calendar integration
     */
    async initializeOutlookCalendar() {
        // Microsoft Graph API integration would go here
        console.log('Outlook Calendar integration initialized');
    }

    /**
     * Initialize Apple Calendar integration
     */
    async initializeAppleCalendar() {
        // Apple Calendar integration would go here
        console.log('Apple Calendar integration initialized');
    }

    /**
     * Load user data
     */
    async loadUserData() {
        try {
            // Load current user data from API
            const response = await fetch('/api/user/profile');
            if (response.ok) {
                this.currentUser = await response.json();
            }
        } catch (error) {
            console.warn('Failed to load user data:', error);
        }
    }

    /**
     * Load availability data
     */
    async loadAvailability() {
        try {
            const response = await fetch('/api/scheduling/availability');
            if (response.ok) {
                const data = await response.json();
                this.availableSlots = new Map(Object.entries(data.availableSlots || {}));
                this.bookedSlots = new Map(Object.entries(data.bookedSlots || {}));
                this.recurringSchedules = new Map(Object.entries(data.recurringSchedules || {}));
            }
        } catch (error) {
            console.warn('Failed to load availability:', error);
        }
    }

    /**
     * Load custom fields
     */
    async loadCustomFields() {
        try {
            const response = await fetch('/api/scheduling/custom-fields');
            if (response.ok) {
                const fields = await response.json();
                this.renderCustomFields(fields);
            }
        } catch (error) {
            console.warn('Failed to load custom fields:', error);
        }
    }

    /**
     * Render custom fields
     */
    renderCustomFields(fields) {
        const customFieldsContainer = this.bookingForm.querySelector('#custom-fields');
        if (!customFieldsContainer || !fields.length) return;

        fields.forEach(field => {
            const fieldElement = this.createCustomField(field);
            customFieldsContainer.appendChild(fieldElement);
        });
    }

    /**
     * Create custom field element
     */
    createCustomField(field) {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'form-group';

        let inputElement = '';
        switch (field.type) {
            case 'text':
                inputElement = `<input type="text" id="${field.id}" ${field.required ? 'required' : ''} placeholder="${field.placeholder || ''}">`;
                break;
            case 'textarea':
                inputElement = `<textarea id="${field.id}" rows="3" ${field.required ? 'required' : ''} placeholder="${field.placeholder || ''}"></textarea>`;
                break;
            case 'select':
                const options = field.options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('');
                inputElement = `<select id="${field.id}" ${field.required ? 'required' : ''}>${options}</select>`;
                break;
            case 'checkbox':
                inputElement = `<input type="checkbox" id="${field.id}" ${field.required ? 'required' : ''}> <span>${field.label}</span>`;
                break;
        }

        fieldDiv.innerHTML = `
            <label for="${field.id}">${field.label} ${field.required ? '*' : ''}</label>
            ${inputElement}
        `;

        return fieldDiv;
    }

    /**
     * Render calendar
     */
    renderCalendar() {
        const calendarContainer = this.schedulingContainer.querySelector('#calendar-container');
        if (!calendarContainer) return;

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        calendarContainer.innerHTML = this.generateCalendarHTML(currentYear, currentMonth);
        this.setupCalendarEvents();
    }

    /**
     * Render guest calendar
     */
    renderGuestCalendar() {
        const calendarContainer = this.schedulingContainer.querySelector('#guest-calendar');
        if (!calendarContainer) return;

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        calendarContainer.innerHTML = this.generateCalendarHTML(currentYear, currentMonth, true);
        this.setupGuestCalendarEvents();
    }

    /**
     * Generate calendar HTML
     */
    generateCalendarHTML(year, month, isGuestView = false) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        let calendarHTML = `
            <div class="calendar-header">
                <button class="btn-prev-month" onclick="schedulingSystem.previousMonth()">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <h3 class="calendar-title">${monthNames[month]} ${year}</h3>
                <button class="btn-next-month" onclick="schedulingSystem.nextMonth()">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
            <div class="calendar-grid">
                <div class="calendar-weekdays">
                    <div class="weekday">Sun</div>
                    <div class="weekday">Mon</div>
                    <div class="weekday">Tue</div>
                    <div class="weekday">Wed</div>
                    <div class="weekday">Thu</div>
                    <div class="weekday">Fri</div>
                    <div class="weekday">Sat</div>
                </div>
                <div class="calendar-days">
        `;

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            calendarHTML += '<div class="calendar-day empty"></div>';
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateString = this.formatDate(date);
            const isToday = this.isToday(date);
            const isAvailable = this.isDateAvailable(date);
            const hasBookings = this.hasBookingsOnDate(date);

            let dayClasses = 'calendar-day';
            if (isToday) dayClasses += ' today';
            if (isAvailable) dayClasses += ' available';
            if (hasBookings) dayClasses += ' has-bookings';
            if (date < new Date()) dayClasses += ' past';

            const clickHandler = isGuestView ? `onclick="schedulingSystem.selectDate('${dateString}')"` :
                                              `onclick="schedulingSystem.viewDaySchedule('${dateString}')"`;

            calendarHTML += `
                <div class="${dayClasses}" data-date="${dateString}" ${isAvailable || !isGuestView ? clickHandler : ''}>
                    <span class="day-number">${day}</span>
                    ${hasBookings ? '<div class="booking-indicator"></div>' : ''}
                    ${isAvailable && isGuestView ? '<div class="available-indicator"></div>' : ''}
                </div>
            `;
        }

        calendarHTML += `
                </div>
            </div>
        `;

        return calendarHTML;
    }

    /**
     * Setup calendar events
     */
    setupCalendarEvents() {
        // Calendar events are handled via onclick attributes in the HTML
        // Additional event listeners can be added here if needed
    }

    /**
     * Setup guest calendar events
     */
    setupGuestCalendarEvents() {
        // Guest calendar events are handled via onclick attributes in the HTML
        // Additional event listeners can be added here if needed
    }

    /**
     * Handle date selection (guest)
     */
    selectDate(dateString) {
        this.selectedDate = dateString;

        // Update step indicator
        this.updateStepIndicator(2);

        // Show selected date
        const selectedDateDisplay = this.schedulingContainer.querySelector('#selected-date-display');
        if (selectedDateDisplay) {
            selectedDateDisplay.textContent = this.formatDateForDisplay(new Date(dateString));
        }

        // Load and display available time slots
        this.loadTimeSlots(dateString);

        // Show step 2
        this.showStep(2);

        this.emitSchedulingEvent('date-selected', { date: dateString });
    }

    /**
     * View day schedule (host)
     */
    viewDaySchedule(dateString) {
        // Show detailed day view for hosts
        this.showDayScheduleModal(dateString);

        this.emitSchedulingEvent('day-schedule-viewed', { date: dateString });
    }

    /**
     * Load time slots for selected date
     */
    async loadTimeSlots(dateString) {
        try {
            const response = await fetch(`/api/scheduling/time-slots?date=${dateString}`);
            if (response.ok) {
                const timeSlots = await response.json();
                this.renderTimeSlots(timeSlots);
            } else {
                this.showError('Failed to load available time slots');
            }
        } catch (error) {
            console.error('Failed to load time slots:', error);
            this.showError('Failed to load available time slots');
        }
    }

    /**
     * Render time slots
     */
    renderTimeSlots(timeSlots) {
        const timeSlotsContainer = this.schedulingContainer.querySelector('#time-slots');
        if (!timeSlotsContainer) return;

        if (timeSlots.length === 0) {
            timeSlotsContainer.innerHTML = `
                <div class="no-slots-message">
                    <i class="fas fa-calendar-times"></i>
                    <h4>No Available Time Slots</h4>
                    <p>There are no available time slots for this date. Please select a different date.</p>
                </div>
            `;
            return;
        }

        timeSlotsContainer.innerHTML = `
            <div class="time-slots-grid">
                ${timeSlots.map(slot => `
                    <button class="time-slot ${slot.available ? 'available' : 'unavailable'}"
                            data-time="${slot.time}"
                            ${slot.available ? `onclick="schedulingSystem.selectTime('${slot.time}')"` : 'disabled'}>
                        <span class="slot-time">${this.formatTimeForDisplay(slot.time)}</span>
                        <span class="slot-status">${slot.available ? 'Available' : 'Booked'}</span>
                    </button>
                `).join('')}
            </div>
        `;
    }

    /**
     * Handle time selection
     */
    selectTime(time) {
        this.selectedTime = time;

        // Update selected time slot appearance
        const timeSlots = this.schedulingContainer.querySelectorAll('.time-slot');
        timeSlots.forEach(slot => {
            slot.classList.remove('selected');
            if (slot.dataset.time === time) {
                slot.classList.add('selected');
            }
        });

        // Enable next step
        setTimeout(() => {
            this.nextStep();
        }, 500);

        this.emitSchedulingEvent('time-selected', { time });
    }

    /**
     * Navigate to next step
     */
    nextStep() {
        const currentStep = this.getCurrentStep();
        if (currentStep < 4) {
            this.showStep(currentStep + 1);
            this.updateStepIndicator(currentStep + 1);

            if (currentStep + 1 === 4) {
                this.updateBookingSummary();
            }
        }
    }

    /**
     * Navigate to previous step
     */
    previousStep() {
        const currentStep = this.getCurrentStep();
        if (currentStep > 1) {
            this.showStep(currentStep - 1);
            this.updateStepIndicator(currentStep - 1);
        }
    }

    /**
     * Get current step
     */
    getCurrentStep() {
        const visibleStep = this.schedulingContainer.querySelector('.booking-step:not([style*="display: none"])');
        return visibleStep ? parseInt(visibleStep.dataset.step) : 1;
    }

    /**
     * Show specific step
     */
    showStep(stepNumber) {
        const steps = this.schedulingContainer.querySelectorAll('.booking-step');
        steps.forEach(step => {
            step.style.display = parseInt(step.dataset.step) === stepNumber ? 'block' : 'none';
        });
    }

    /**
     * Update step indicator
     */
    updateStepIndicator(activeStep) {
        const steps = this.schedulingContainer.querySelectorAll('.step');
        steps.forEach(step => {
            const stepNumber = parseInt(step.dataset.step);
            step.classList.remove('active', 'completed');

            if (stepNumber === activeStep) {
                step.classList.add('active');
            } else if (stepNumber < activeStep) {
                step.classList.add('completed');
            }
        });
    }

    /**
     * Update booking summary
     */
    updateBookingSummary() {
        const summaryContainer = this.schedulingContainer.querySelector('#booking-summary');
        if (!summaryContainer) return;

        const formData = this.getFormData();
        const selectedDateTime = new Date(`${this.selectedDate}T${this.selectedTime}`);

        summaryContainer.innerHTML = `
            <div class="summary-card">
                <div class="summary-header">
                    <h4>${formData.title || 'Interview'}</h4>
                </div>
                <div class="summary-details">
                    <div class="detail-item">
                        <i class="fas fa-calendar"></i>
                        <span>Date: ${this.formatDateForDisplay(new Date(this.selectedDate))}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-clock"></i>
                        <span>Time: ${this.formatTimeForDisplay(this.selectedTime)}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-hourglass-half"></i>
                        <span>Duration: ${this.selectedDuration} minutes</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-user"></i>
                        <span>Guest: ${formData.name}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-envelope"></i>
                        <span>Email: ${formData.email}</span>
                    </div>
                    ${formData.phone ? `
                        <div class="detail-item">
                            <i class="fas fa-phone"></i>
                            <span>Phone: ${formData.phone}</span>
                        </div>
                    ` : ''}
                    ${formData.description ? `
                        <div class="detail-item">
                            <i class="fas fa-comment"></i>
                            <span>Description: ${formData.description}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="summary-actions">
                    <div class="calendar-integration">
                        <h5>Add to Calendar</h5>
                        <div class="calendar-buttons">
                            <button class="btn-calendar" onclick="schedulingSystem.addToGoogleCalendar()">
                                <i class="fab fa-google"></i>
                                Google
                            </button>
                            <button class="btn-calendar" onclick="schedulingSystem.addToOutlookCalendar()">
                                <i class="fab fa-microsoft"></i>
                                Outlook
                            </button>
                            <button class="btn-calendar" onclick="schedulingSystem.downloadICS()">
                                <i class="fas fa-download"></i>
                                Download ICS
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get form data
     */
    getFormData() {
        const form = this.bookingForm;
        if (!form) return {};

        return {
            title: form.querySelector('#interview-title')?.value || '',
            description: form.querySelector('#interview-description')?.value || '',
            duration: parseInt(form.querySelector('#interview-duration')?.value || this.selectedDuration),
            name: form.querySelector('#guest-name')?.value || '',
            email: form.querySelector('#guest-email')?.value || '',
            phone: form.querySelector('#guest-phone')?.value || ''
        };
    }

    /**
     * Confirm booking
     */
    async confirmBooking() {
        try {
            const formData = this.getFormData();

            // Validate required fields
            if (!this.validateBookingData(formData)) {
                return;
            }

            const bookingData = {
                date: this.selectedDate,
                time: this.selectedTime,
                duration: this.selectedDuration,
                title: formData.title,
                description: formData.description,
                guestName: formData.name,
                guestEmail: formData.email,
                guestPhone: formData.phone,
                timeZone: this.options.timeZone
            };

            const response = await fetch('/api/scheduling/book-interview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bookingData)
            });

            if (response.ok) {
                const result = await response.json();
                this.showBookingConfirmation(result);
                this.emitSchedulingEvent('booking-confirmed', result);
            } else {
                const error = await response.json();
                this.showError(error.message || 'Failed to book interview');
            }

        } catch (error) {
            console.error('Failed to confirm booking:', error);
            this.showError('Failed to book interview. Please try again.');
        }
    }

    /**
     * Validate booking data
     */
    validateBookingData(formData) {
        const requiredFields = ['title', 'name', 'email'];
        const missingFields = requiredFields.filter(field => !formData[field]);

        if (missingFields.length > 0) {
            this.showError(`Please fill in all required fields: ${missingFields.join(', ')}`);
            return false;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            this.showError('Please enter a valid email address');
            return false;
        }

        return true;
    }

    /**
     * Show booking confirmation
     */
    showBookingConfirmation(bookingResult) {
        const modal = document.createElement('div');
        modal.className = 'booking-confirmation-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="confirmation-header">
                    <div class="success-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h3>Interview Booked Successfully!</h3>
                </div>
                <div class="confirmation-details">
                    <p>Your interview has been scheduled and confirmation details have been sent to your email.</p>
                    <div class="booking-info">
                        <div class="info-item">
                            <strong>Booking ID:</strong> ${bookingResult.bookingId}
                        </div>
                        <div class="info-item">
                            <strong>Interview Link:</strong>
                            <a href="${bookingResult.interviewUrl}" target="_blank">${bookingResult.interviewUrl}</a>
                        </div>
                    </div>
                </div>
                <div class="confirmation-actions">
                    <button class="btn-primary" onclick="window.location.href='${bookingResult.interviewUrl}'">
                        <i class="fas fa-video"></i>
                        Go to Interview Room
                    </button>
                    <button class="btn-secondary" onclick="this.closest('.booking-confirmation-modal').remove()">
                        <i class="fas fa-times"></i>
                        Close
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Auto-remove modal after 30 seconds
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 30000);
    }

    /**
     * Calendar integration methods
     */
    addToGoogleCalendar() {
        const formData = this.getFormData();
        const startDate = new Date(`${this.selectedDate}T${this.selectedTime}`);
        const endDate = new Date(startDate.getTime() + this.selectedDuration * 60000);

        const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(formData.title)}&dates=${this.formatDateForGoogle(startDate)}/${this.formatDateForGoogle(endDate)}&details=${encodeURIComponent(formData.description || 'Interview scheduled via Interviews.tv')}&location=Online`;

        window.open(googleUrl, '_blank');
    }

    addToOutlookCalendar() {
        const formData = this.getFormData();
        const startDate = new Date(`${this.selectedDate}T${this.selectedTime}`);
        const endDate = new Date(startDate.getTime() + this.selectedDuration * 60000);

        const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(formData.title)}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&body=${encodeURIComponent(formData.description || 'Interview scheduled via Interviews.tv')}&location=Online`;

        window.open(outlookUrl, '_blank');
    }

    downloadICS() {
        const formData = this.getFormData();
        const startDate = new Date(`${this.selectedDate}T${this.selectedTime}`);
        const endDate = new Date(startDate.getTime() + this.selectedDuration * 60000);

        const icsContent = this.generateICSContent(formData, startDate, endDate);
        const blob = new Blob([icsContent], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = 'interview.ics';
        link.click();

        URL.revokeObjectURL(url);
    }

    /**
     * Generate ICS content
     */
    generateICSContent(formData, startDate, endDate) {
        const formatICSDate = (date) => {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Interviews.tv//Interview Scheduler//EN
BEGIN:VEVENT
UID:${Date.now()}@interviews.tv
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:${formData.title}
DESCRIPTION:${formData.description || 'Interview scheduled via Interviews.tv'}
LOCATION:Online
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
    }

    /**
     * Utility methods
     */
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    formatDateForDisplay(date) {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatTimeForDisplay(time) {
        const [hours, minutes] = time.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));

        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    formatDateForGoogle(date) {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    }

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    isDateAvailable(date) {
        const dayOfWeek = date.getDay();
        return this.options.workingDays.includes(dayOfWeek) && date >= new Date();
    }

    hasBookingsOnDate(date) {
        const dateString = this.formatDate(date);
        return this.bookedSlots.has(dateString);
    }

    /**
     * Host-specific methods
     */
    updateWorkingDays() {
        const checkboxes = this.availabilityManager.querySelectorAll('.day-checkbox input:checked');
        this.options.workingDays = Array.from(checkboxes).map(cb => parseInt(cb.value));
        this.updateAvailability();
    }

    updateAvailability() {
        // Update availability and refresh calendar
        this.saveAvailabilitySettings();
        this.renderCalendar();

        this.emitSchedulingEvent('availability-updated', {
            workingHours: this.options.workingHours,
            workingDays: this.options.workingDays,
            defaultDuration: this.options.defaultDuration,
            bufferTime: this.options.bufferTime
        });
    }

    async saveAvailabilitySettings() {
        try {
            const settings = {
                workingHours: this.options.workingHours,
                workingDays: this.options.workingDays,
                defaultDuration: this.options.defaultDuration,
                bufferTime: this.options.bufferTime
            };

            await fetch('/api/scheduling/availability', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });

        } catch (error) {
            console.error('Failed to save availability settings:', error);
        }
    }

    openRecurringScheduleModal() {
        const modal = document.createElement('div');
        modal.className = 'recurring-schedule-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add Recurring Schedule</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Schedule Type:</label>
                        <select id="recurring-type">
                            <option value="weekly">Weekly</option>
                            <option value="biweekly">Bi-weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Day of Week:</label>
                        <select id="recurring-day">
                            <option value="1">Monday</option>
                            <option value="2">Tuesday</option>
                            <option value="3">Wednesday</option>
                            <option value="4">Thursday</option>
                            <option value="5">Friday</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Time:</label>
                        <input type="time" id="recurring-time" value="10:00">
                    </div>
                    <div class="form-group">
                        <label>Duration (minutes):</label>
                        <select id="recurring-duration">
                            <option value="30">30 minutes</option>
                            <option value="60" selected>60 minutes</option>
                            <option value="90">90 minutes</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-cancel">Cancel</button>
                    <button class="btn-save">Add Schedule</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup modal events
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('.btn-cancel');
        const saveBtn = modal.querySelector('.btn-save');
        const overlay = modal.querySelector('.modal-overlay');

        const closeModal = () => {
            document.body.removeChild(modal);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);

        saveBtn.addEventListener('click', () => {
            this.saveRecurringSchedule(modal);
            closeModal();
        });
    }

    saveRecurringSchedule(modal) {
        const type = modal.querySelector('#recurring-type').value;
        const day = parseInt(modal.querySelector('#recurring-day').value);
        const time = modal.querySelector('#recurring-time').value;
        const duration = parseInt(modal.querySelector('#recurring-duration').value);

        const scheduleId = Date.now().toString();
        const schedule = {
            id: scheduleId,
            type,
            day,
            time,
            duration,
            createdAt: new Date()
        };

        this.recurringSchedules.set(scheduleId, schedule);
        this.updateRecurringSchedulesList();

        this.emitSchedulingEvent('recurring-schedule-added', schedule);
    }

    updateRecurringSchedulesList() {
        const recurringList = this.availabilityManager.querySelector('#recurring-list');
        if (!recurringList) return;

        recurringList.innerHTML = '';

        this.recurringSchedules.forEach((schedule, id) => {
            const scheduleItem = document.createElement('div');
            scheduleItem.className = 'recurring-item';
            scheduleItem.innerHTML = `
                <div class="schedule-info">
                    <span class="schedule-type">${schedule.type}</span>
                    <span class="schedule-details">${this.getDayName(schedule.day)} at ${this.formatTimeForDisplay(schedule.time)}</span>
                    <span class="schedule-duration">${schedule.duration} minutes</span>
                </div>
                <button class="btn-remove" onclick="schedulingSystem.removeRecurringSchedule('${id}')">
                    <i class="fas fa-trash"></i>
                </button>
            `;

            recurringList.appendChild(scheduleItem);
        });
    }

    removeRecurringSchedule(scheduleId) {
        this.recurringSchedules.delete(scheduleId);
        this.updateRecurringSchedulesList();

        this.emitSchedulingEvent('recurring-schedule-removed', { scheduleId });
    }

    getDayName(dayNumber) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[dayNumber];
    }

    /**
     * Load upcoming interviews for host
     */
    async loadUpcomingInterviews() {
        try {
            const response = await fetch('/api/scheduling/upcoming-interviews');
            if (response.ok) {
                const interviews = await response.json();
                this.renderUpcomingInterviews(interviews);
            }
        } catch (error) {
            console.error('Failed to load upcoming interviews:', error);
        }
    }

    /**
     * Render upcoming interviews
     */
    renderUpcomingInterviews(interviews) {
        const interviewList = this.schedulingContainer.querySelector('#interview-list');
        if (!interviewList) return;

        if (interviews.length === 0) {
            interviewList.innerHTML = `
                <div class="no-interviews">
                    <i class="fas fa-calendar-times"></i>
                    <p>No upcoming interviews scheduled</p>
                </div>
            `;
            return;
        }

        interviewList.innerHTML = interviews.map(interview => `
            <div class="interview-item">
                <div class="interview-info">
                    <h4>${interview.title}</h4>
                    <div class="interview-details">
                        <span class="interview-date">
                            <i class="fas fa-calendar"></i>
                            ${this.formatDateForDisplay(new Date(interview.scheduledDate))}
                        </span>
                        <span class="interview-time">
                            <i class="fas fa-clock"></i>
                            ${this.formatTimeForDisplay(interview.scheduledTime)}
                        </span>
                        <span class="interview-guest">
                            <i class="fas fa-user"></i>
                            ${interview.guestName}
                        </span>
                    </div>
                </div>
                <div class="interview-actions">
                    <button class="btn-join" onclick="window.open('${interview.interviewUrl}', '_blank')">
                        <i class="fas fa-video"></i>
                        Join
                    </button>
                    <button class="btn-reschedule" onclick="schedulingSystem.rescheduleInterview('${interview.id}')">
                        <i class="fas fa-calendar-alt"></i>
                        Reschedule
                    </button>
                    <button class="btn-cancel" onclick="schedulingSystem.cancelInterview('${interview.id}')">
                        <i class="fas fa-times"></i>
                        Cancel
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Calendar navigation
     */
    previousMonth() {
        // Implementation for previous month navigation
        this.emitSchedulingEvent('month-changed', { direction: 'previous' });
    }

    nextMonth() {
        // Implementation for next month navigation
        this.emitSchedulingEvent('month-changed', { direction: 'next' });
    }

    /**
     * Toggle calendar view
     */
    toggleCalendarView() {
        const viewToggle = this.schedulingContainer.querySelector('#view-toggle');
        const currentView = viewToggle.dataset.view;

        if (currentView === 'calendar') {
            viewToggle.dataset.view = 'list';
            viewToggle.innerHTML = '<i class="fas fa-list"></i> List View';
            this.showListView();
        } else {
            viewToggle.dataset.view = 'calendar';
            viewToggle.innerHTML = '<i class="fas fa-calendar"></i> Calendar View';
            this.showCalendarView();
        }

        this.emitSchedulingEvent('view-changed', { view: viewToggle.dataset.view });
    }

    showCalendarView() {
        // Show calendar view
        const calendarContainer = this.schedulingContainer.querySelector('#calendar-container, #guest-calendar');
        if (calendarContainer) {
            calendarContainer.style.display = 'block';
        }
    }

    showListView() {
        // Show list view
        const calendarContainer = this.schedulingContainer.querySelector('#calendar-container, #guest-calendar');
        if (calendarContainer) {
            calendarContainer.style.display = 'none';
        }
    }

    /**
     * Open timezone selector
     */
    openTimezoneSelector() {
        const modal = document.createElement('div');
        modal.className = 'timezone-selector-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Select Timezone</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="timezone-search">
                        <input type="text" id="timezone-search" placeholder="Search timezones...">
                    </div>
                    <div class="timezone-list" id="timezone-list">
                        ${this.generateTimezoneOptions()}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup modal events
        const closeBtn = modal.querySelector('.modal-close');
        const overlay = modal.querySelector('.modal-overlay');
        const searchInput = modal.querySelector('#timezone-search');

        const closeModal = () => {
            document.body.removeChild(modal);
        };

        closeBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);

        searchInput.addEventListener('input', (e) => {
            this.filterTimezones(e.target.value);
        });

        // Setup timezone selection
        const timezoneOptions = modal.querySelectorAll('.timezone-option');
        timezoneOptions.forEach(option => {
            option.addEventListener('click', () => {
                this.selectTimezone(option.dataset.timezone);
                closeModal();
            });
        });
    }

    generateTimezoneOptions() {
        const timezones = [
            'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
            'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome',
            'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Dubai',
            'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland'
        ];

        return timezones.map(tz => `
            <div class="timezone-option" data-timezone="${tz}">
                <span class="timezone-name">${tz.replace('_', ' ')}</span>
                <span class="timezone-offset">${this.getTimezoneOffset(tz)}</span>
            </div>
        `).join('');
    }

    getTimezoneOffset(timezone) {
        try {
            const date = new Date();
            const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
            const targetTime = new Date(utc + (this.getTimezoneOffsetMinutes(timezone) * 60000));
            const offset = targetTime.getTimezoneOffset();
            const hours = Math.floor(Math.abs(offset) / 60);
            const minutes = Math.abs(offset) % 60;
            const sign = offset <= 0 ? '+' : '-';
            return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        } catch (error) {
            return 'UTC';
        }
    }

    getTimezoneOffsetMinutes(timezone) {
        // This is a simplified implementation
        // In a real application, you would use a proper timezone library
        const offsets = {
            'America/New_York': -300,
            'America/Chicago': -360,
            'America/Denver': -420,
            'America/Los_Angeles': -480,
            'Europe/London': 0,
            'Europe/Paris': 60,
            'Europe/Berlin': 60,
            'Europe/Rome': 60,
            'Asia/Tokyo': 540,
            'Asia/Shanghai': 480,
            'Asia/Kolkata': 330,
            'Asia/Dubai': 240,
            'Australia/Sydney': 600,
            'Australia/Melbourne': 600,
            'Pacific/Auckland': 720
        };

        return offsets[timezone] || 0;
    }

    selectTimezone(timezone) {
        this.options.timeZone = timezone;

        // Update timezone display
        const timezoneDisplay = this.schedulingContainer.querySelector('#current-timezone');
        if (timezoneDisplay) {
            timezoneDisplay.textContent = timezone;
        }

        // Refresh calendar and time slots
        this.renderCalendar();
        if (this.userRole === 'guest') {
            this.renderGuestCalendar();
        }

        this.emitSchedulingEvent('timezone-changed', { timezone });
    }

    /**
     * Validation methods
     */
    validateField(field) {
        const value = field.value.trim();
        const fieldName = field.getAttribute('name') || field.id;

        // Remove existing error styling
        field.classList.remove('error');

        // Check if required field is empty
        if (field.hasAttribute('required') && !value) {
            this.showFieldError(field, `${fieldName} is required`);
            return false;
        }

        // Email validation
        if (field.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                this.showFieldError(field, 'Please enter a valid email address');
                return false;
            }
        }

        return true;
    }

    showFieldError(field, message) {
        field.classList.add('error');

        // Remove existing error message
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }

        // Add error message
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.textContent = message;
        field.parentNode.appendChild(errorElement);
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `scheduling-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation' : type === 'warning' ? 'exclamation-triangle' : 'info'}-circle"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Show error
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    /**
     * Handle initialization error
     */
    handleInitializationError(error) {
        this.showError('Failed to initialize scheduling system: ' + error.message);

        // Show basic error UI
        if (this.container) {
            this.container.innerHTML = `
                <div class="scheduling-error">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="error-content">
                        <h3>Scheduling System Error</h3>
                        <p>Failed to initialize the scheduling system. Please refresh the page and try again.</p>
                        <button class="btn-retry" onclick="location.reload()">
                            <i class="fas fa-redo"></i>
                            Retry
                        </button>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Emit scheduling event
     */
    emitSchedulingEvent(eventName, data) {
        const event = new CustomEvent(eventName, {
            detail: data,
            bubbles: true
        });

        this.container.dispatchEvent(event);
    }

    /**
     * Inject scheduling CSS
     */
    injectSchedulingCSS() {
        if (document.getElementById('interview-scheduling-styles')) return;

        const style = document.createElement('style');
        style.id = 'interview-scheduling-styles';
        style.textContent = `
            /* Interview Scheduling System Styles */
            .interview-scheduling-system {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #1a1a1a;
                color: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                max-width: 1200px;
                margin: 0 auto;
            }

            /* Header Styles */
            .scheduling-header {
                background: linear-gradient(135deg, #FF0000 0%, #cc0000 100%);
                padding: 24px;
                border-bottom: 1px solid #333;
            }

            .header-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 16px;
            }

            .scheduling-title {
                margin: 0;
                font-size: 28px;
                font-weight: 700;
                color: #ffffff;
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .scheduling-title i {
                font-size: 32px;
            }

            .scheduling-actions {
                display: flex;
                gap: 12px;
                align-items: center;
            }

            .btn-view-toggle,
            .btn-timezone {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: #ffffff;
                padding: 10px 16px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                font-weight: 500;
            }

            .btn-view-toggle:hover,
            .btn-timezone:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: translateY(-2px);
            }

            /* Content Styles */
            .scheduling-content {
                padding: 24px;
                min-height: 600px;
            }

            /* Host Interface */
            .host-scheduling-interface {
                display: grid;
                grid-template-columns: 350px 1fr;
                gap: 24px;
                height: 100%;
            }

            .scheduling-sidebar {
                background: #2a2a2a;
                border-radius: 12px;
                padding: 20px;
                height: fit-content;
                max-height: 800px;
                overflow-y: auto;
            }

            .section-header {
                margin-bottom: 20px;
                padding-bottom: 12px;
                border-bottom: 1px solid #444;
            }

            .section-header h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: #ffffff;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .availability-controls {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }

            .working-hours h4,
            .working-days h4,
            .interview-settings h4,
            .recurring-schedules h4 {
                margin: 0 0 12px 0;
                font-size: 14px;
                font-weight: 600;
                color: #cccccc;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .time-range {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 8px;
            }

            .time-range label {
                font-size: 14px;
                color: #cccccc;
                min-width: 80px;
            }

            .time-range input[type="time"] {
                background: #3a3a3a;
                border: 1px solid #555;
                color: #ffffff;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 14px;
            }

            .day-checkboxes {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .day-checkbox {
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                padding: 4px 0;
            }

            .day-checkbox input[type="checkbox"] {
                width: 16px;
                height: 16px;
                accent-color: #FF0000;
            }

            .day-checkbox span {
                font-size: 14px;
                color: #cccccc;
            }

            .setting-group {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-bottom: 12px;
            }

            .setting-group label {
                font-size: 14px;
                color: #cccccc;
            }

            .setting-group select {
                background: #3a3a3a;
                border: 1px solid #555;
                color: #ffffff;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 14px;
            }

            .btn-add-recurring {
                background: #FF0000;
                border: none;
                color: #ffffff;
                padding: 10px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.3s ease;
            }

            .btn-add-recurring:hover {
                background: #cc0000;
                transform: translateY(-2px);
            }

            .recurring-list {
                margin-top: 12px;
            }

            .recurring-item {
                background: #3a3a3a;
                border: 1px solid #555;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .schedule-info {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .schedule-type {
                font-size: 12px;
                color: #FF0000;
                font-weight: 600;
                text-transform: uppercase;
            }

            .schedule-details {
                font-size: 14px;
                color: #ffffff;
            }

            .schedule-duration {
                font-size: 12px;
                color: #cccccc;
            }

            .btn-remove {
                background: transparent;
                border: none;
                color: #ff4444;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: all 0.3s ease;
            }

            .btn-remove:hover {
                background: rgba(255, 68, 68, 0.1);
            }

            /* Calendar Styles */
            .calendar-container {
                background: #2a2a2a;
                border-radius: 12px;
                padding: 20px;
                height: fit-content;
            }

            .calendar-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 16px;
                border-bottom: 1px solid #444;
            }

            .btn-prev-month,
            .btn-next-month {
                background: #3a3a3a;
                border: 1px solid #555;
                color: #ffffff;
                width: 40px;
                height: 40px;
                border-radius: 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
            }

            .btn-prev-month:hover,
            .btn-next-month:hover {
                background: #FF0000;
                border-color: #FF0000;
            }

            .calendar-title {
                margin: 0;
                font-size: 20px;
                font-weight: 600;
                color: #ffffff;
            }

            .calendar-grid {
                width: 100%;
            }

            .calendar-weekdays {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: 1px;
                margin-bottom: 8px;
            }

            .weekday {
                padding: 12px;
                text-align: center;
                font-size: 14px;
                font-weight: 600;
                color: #cccccc;
                background: #3a3a3a;
            }

            .calendar-days {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: 1px;
            }

            .calendar-day {
                aspect-ratio: 1;
                background: #3a3a3a;
                border: 1px solid #555;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
                min-height: 60px;
            }

            .calendar-day:hover {
                background: #4a4a4a;
            }

            .calendar-day.today {
                background: #FF0000;
                color: #ffffff;
            }

            .calendar-day.available {
                border-color: #00ff88;
            }

            .calendar-day.has-bookings {
                background: #2a4a2a;
            }

            .calendar-day.past {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .calendar-day.empty {
                background: transparent;
                border: none;
                cursor: default;
            }

            .day-number {
                font-size: 16px;
                font-weight: 500;
                color: #ffffff;
            }

            .booking-indicator {
                width: 6px;
                height: 6px;
                background: #00ff88;
                border-radius: 50%;
                position: absolute;
                bottom: 4px;
                right: 4px;
            }

            .available-indicator {
                width: 6px;
                height: 6px;
                background: #00ff88;
                border-radius: 50%;
                position: absolute;
                top: 4px;
                right: 4px;
            }

            /* Guest Interface */
            .guest-scheduling-interface {
                max-width: 800px;
                margin: 0 auto;
            }

            .booking-steps {
                margin-bottom: 32px;
            }

            .step-indicator {
                display: flex;
                justify-content: center;
                gap: 24px;
                margin-bottom: 32px;
            }

            .step {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                opacity: 0.5;
                transition: all 0.3s ease;
            }

            .step.active,
            .step.completed {
                opacity: 1;
            }

            .step-number {
                width: 40px;
                height: 40px;
                background: #3a3a3a;
                border: 2px solid #555;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                color: #ffffff;
                transition: all 0.3s ease;
            }

            .step.active .step-number {
                background: #FF0000;
                border-color: #FF0000;
            }

            .step.completed .step-number {
                background: #00ff88;
                border-color: #00ff88;
            }

            .step-label {
                font-size: 14px;
                color: #cccccc;
                text-align: center;
            }

            .booking-content {
                background: #2a2a2a;
                border-radius: 12px;
                padding: 32px;
            }

            .booking-step {
                animation: fadeIn 0.3s ease;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .step-header {
                text-align: center;
                margin-bottom: 32px;
            }

            .step-header h3 {
                margin: 0 0 8px 0;
                font-size: 24px;
                font-weight: 600;
                color: #ffffff;
            }

            .step-header p {
                margin: 0;
                font-size: 16px;
                color: #cccccc;
            }

            /* Time Slots */
            .time-slots-container {
                margin-bottom: 32px;
            }

            .time-slots-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 12px;
            }

            .time-slot {
                background: #3a3a3a;
                border: 2px solid #555;
                border-radius: 8px;
                padding: 16px;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
            }

            .time-slot:hover {
                border-color: #FF0000;
                background: #4a4a4a;
            }

            .time-slot.selected {
                border-color: #FF0000;
                background: #FF0000;
            }

            .time-slot.unavailable {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .slot-time {
                font-size: 16px;
                font-weight: 600;
                color: #ffffff;
            }

            .slot-status {
                font-size: 12px;
                color: #cccccc;
            }

            .no-slots-message {
                text-align: center;
                padding: 48px 24px;
                color: #cccccc;
            }

            .no-slots-message i {
                font-size: 48px;
                margin-bottom: 16px;
                color: #666;
            }

            .no-slots-message h4 {
                margin: 0 0 8px 0;
                font-size: 20px;
                color: #ffffff;
            }

            /* Form Styles */
            .booking-form {
                display: flex;
                flex-direction: column;
                gap: 20px;
                margin-bottom: 32px;
            }

            .form-group {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .form-group label {
                font-size: 14px;
                font-weight: 500;
                color: #cccccc;
            }

            .form-group input,
            .form-group textarea,
            .form-group select {
                background: #3a3a3a;
                border: 1px solid #555;
                color: #ffffff;
                padding: 12px 16px;
                border-radius: 8px;
                font-size: 16px;
                transition: all 0.3s ease;
            }

            .form-group input:focus,
            .form-group textarea:focus,
            .form-group select:focus {
                outline: none;
                border-color: #FF0000;
                box-shadow: 0 0 0 3px rgba(255, 0, 0, 0.1);
            }

            .form-group input.error,
            .form-group textarea.error,
            .form-group select.error {
                border-color: #ff4444;
            }

            .field-error {
                font-size: 12px;
                color: #ff4444;
                margin-top: 4px;
            }

            /* Step Navigation */
            .step-navigation {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 32px;
            }

            .btn-back,
            .btn-next,
            .btn-confirm {
                background: #FF0000;
                border: none;
                color: #ffffff;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.3s ease;
            }

            .btn-back {
                background: #666;
            }

            .btn-back:hover {
                background: #777;
                transform: translateY(-2px);
            }

            .btn-next:hover,
            .btn-confirm:hover {
                background: #cc0000;
                transform: translateY(-2px);
            }

            /* Booking Summary */
            .summary-card {
                background: #3a3a3a;
                border-radius: 12px;
                padding: 24px;
                margin-bottom: 24px;
            }

            .summary-header {
                margin-bottom: 20px;
                padding-bottom: 16px;
                border-bottom: 1px solid #555;
            }

            .summary-header h4 {
                margin: 0;
                font-size: 20px;
                font-weight: 600;
                color: #ffffff;
            }

            .summary-details {
                display: flex;
                flex-direction: column;
                gap: 12px;
                margin-bottom: 24px;
            }

            .detail-item {
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 14px;
                color: #cccccc;
            }

            .detail-item i {
                width: 16px;
                color: #FF0000;
            }

            .summary-actions {
                border-top: 1px solid #555;
                padding-top: 20px;
            }

            .calendar-integration h5 {
                margin: 0 0 12px 0;
                font-size: 16px;
                font-weight: 600;
                color: #ffffff;
            }

            .calendar-buttons {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }

            .btn-calendar {
                background: #3a3a3a;
                border: 1px solid #555;
                color: #ffffff;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.3s ease;
            }

            .btn-calendar:hover {
                background: #4a4a4a;
                border-color: #FF0000;
            }

            /* Modal Styles */
            .booking-confirmation-modal,
            .recurring-schedule-modal,
            .timezone-selector-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(4px);
            }

            .modal-content {
                background: #2a2a2a;
                border-radius: 12px;
                padding: 32px;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                position: relative;
                z-index: 1;
                animation: modalSlideIn 0.3s ease;
            }

            @keyframes modalSlideIn {
                from { opacity: 0; transform: scale(0.9) translateY(-20px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
            }

            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 24px;
                padding-bottom: 16px;
                border-bottom: 1px solid #444;
            }

            .modal-header h3 {
                margin: 0;
                font-size: 20px;
                font-weight: 600;
                color: #ffffff;
            }

            .modal-close {
                background: none;
                border: none;
                color: #cccccc;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.3s ease;
            }

            .modal-close:hover {
                background: #444;
                color: #ffffff;
            }

            .modal-body {
                margin-bottom: 24px;
            }

            .modal-footer {
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                padding-top: 16px;
                border-top: 1px solid #444;
            }

            .btn-cancel,
            .btn-save {
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.3s ease;
            }

            .btn-cancel {
                background: #666;
                border: none;
                color: #ffffff;
            }

            .btn-cancel:hover {
                background: #777;
            }

            .btn-save {
                background: #FF0000;
                border: none;
                color: #ffffff;
            }

            .btn-save:hover {
                background: #cc0000;
            }

            /* Confirmation Modal */
            .confirmation-header {
                text-align: center;
                margin-bottom: 24px;
            }

            .success-icon {
                width: 64px;
                height: 64px;
                background: #00ff88;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 16px;
            }

            .success-icon i {
                font-size: 32px;
                color: #ffffff;
            }

            .confirmation-header h3 {
                margin: 0;
                font-size: 24px;
                font-weight: 600;
                color: #ffffff;
            }

            .confirmation-details {
                margin-bottom: 24px;
            }

            .confirmation-details p {
                margin: 0 0 16px 0;
                color: #cccccc;
                text-align: center;
            }

            .booking-info {
                background: #3a3a3a;
                border-radius: 8px;
                padding: 16px;
            }

            .info-item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                font-size: 14px;
            }

            .info-item:last-child {
                margin-bottom: 0;
            }

            .info-item strong {
                color: #ffffff;
            }

            .info-item a {
                color: #FF0000;
                text-decoration: none;
            }

            .info-item a:hover {
                text-decoration: underline;
            }

            .confirmation-actions {
                display: flex;
                gap: 12px;
                justify-content: center;
            }

            .btn-primary,
            .btn-secondary {
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.3s ease;
                text-decoration: none;
            }

            .btn-primary {
                background: #FF0000;
                border: none;
                color: #ffffff;
            }

            .btn-primary:hover {
                background: #cc0000;
                transform: translateY(-2px);
            }

            .btn-secondary {
                background: #666;
                border: none;
                color: #ffffff;
            }

            .btn-secondary:hover {
                background: #777;
                transform: translateY(-2px);
            }

            /* Timezone Selector */
            .timezone-search {
                margin-bottom: 16px;
            }

            .timezone-search input {
                width: 100%;
                background: #3a3a3a;
                border: 1px solid #555;
                color: #ffffff;
                padding: 12px 16px;
                border-radius: 8px;
                font-size: 16px;
            }

            .timezone-list {
                max-height: 300px;
                overflow-y: auto;
                border: 1px solid #555;
                border-radius: 8px;
            }

            .timezone-option {
                padding: 12px 16px;
                cursor: pointer;
                border-bottom: 1px solid #444;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: all 0.3s ease;
            }

            .timezone-option:last-child {
                border-bottom: none;
            }

            .timezone-option:hover {
                background: #3a3a3a;
            }

            .timezone-name {
                color: #ffffff;
                font-weight: 500;
            }

            .timezone-offset {
                color: #cccccc;
                font-size: 14px;
            }

            /* Notifications */
            .scheduling-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #2a2a2a;
                border: 1px solid #555;
                border-radius: 8px;
                padding: 16px;
                max-width: 400px;
                z-index: 10001;
                transform: translateX(100%);
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }

            .scheduling-notification.show {
                transform: translateX(0);
            }

            .scheduling-notification.success {
                border-color: #00ff88;
            }

            .scheduling-notification.error {
                border-color: #ff4444;
            }

            .scheduling-notification.warning {
                border-color: #ffaa00;
            }

            .notification-content {
                display: flex;
                align-items: center;
                gap: 12px;
                color: #ffffff;
            }

            .notification-content i {
                font-size: 20px;
            }

            .scheduling-notification.success .notification-content i {
                color: #00ff88;
            }

            .scheduling-notification.error .notification-content i {
                color: #ff4444;
            }

            .scheduling-notification.warning .notification-content i {
                color: #ffaa00;
            }

            /* Error States */
            .scheduling-error {
                text-align: center;
                padding: 48px 24px;
                background: #2a2a2a;
                border-radius: 12px;
                margin: 24px;
            }

            .error-icon {
                width: 64px;
                height: 64px;
                background: #ff4444;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 16px;
            }

            .error-icon i {
                font-size: 32px;
                color: #ffffff;
            }

            .error-content h3 {
                margin: 0 0 8px 0;
                font-size: 20px;
                font-weight: 600;
                color: #ffffff;
            }

            .error-content p {
                margin: 0 0 24px 0;
                color: #cccccc;
            }

            .btn-retry {
                background: #FF0000;
                border: none;
                color: #ffffff;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                font-weight: 500;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                transition: all 0.3s ease;
            }

            .btn-retry:hover {
                background: #cc0000;
                transform: translateY(-2px);
            }

            /* Responsive Design */
            @media (max-width: 768px) {
                .host-scheduling-interface {
                    grid-template-columns: 1fr;
                    gap: 16px;
                }

                .scheduling-sidebar {
                    order: 2;
                }

                .header-content {
                    flex-direction: column;
                    align-items: flex-start;
                }

                .scheduling-actions {
                    width: 100%;
                    justify-content: space-between;
                }

                .step-indicator {
                    gap: 12px;
                }

                .step {
                    flex: 1;
                }

                .step-label {
                    font-size: 12px;
                }

                .time-slots-grid {
                    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                }

                .modal-content {
                    width: 95%;
                    padding: 24px;
                }

                .calendar-days {
                    gap: 2px;
                }

                .calendar-day {
                    min-height: 50px;
                }
            }

            @media (max-width: 480px) {
                .scheduling-content {
                    padding: 16px;
                }

                .booking-content {
                    padding: 20px;
                }

                .step-navigation {
                    flex-direction: column;
                    gap: 12px;
                }

                .btn-back,
                .btn-next,
                .btn-confirm {
                    width: 100%;
                    justify-content: center;
                }

                .confirmation-actions {
                    flex-direction: column;
                }

                .btn-primary,
                .btn-secondary {
                    width: 100%;
                    justify-content: center;
                }
            }
        `;

        document.head.appendChild(style);
    }
}

// Global reference for demo purposes
window.InterviewSchedulingSystem = InterviewSchedulingSystem;
