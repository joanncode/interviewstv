/**
 * Waiting Room System for Interviews.tv
 * Professional waiting room with custom messages and guest management
 */
class WaitingRoomSystem {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            enableCustomMessages: true,
            enableCountdownTimer: true,
            enableGuestList: true,
            enableHostControls: true,
            enableMusicPlayer: true,
            enableDeviceCheck: true,
            enableChatPreview: false,
            enableBrandingIntegration: true,
            autoAdmitGuests: false,
            maxWaitingGuests: 50,
            defaultWaitingMessage: 'Please wait while the host prepares the interview room.',
            countdownDuration: 300, // 5 minutes default
            refreshInterval: 5000, // 5 seconds
            enableNotifications: true,
            enableSoundAlerts: true,
            themeSystem: null,
            accessibilitySystem: null,
            responsiveSystem: null,
            brandingSystem: null,
            ...options
        };
        
        // Waiting room state
        this.roomId = null;
        this.isHost = false;
        this.isActive = false;
        this.currentUser = null;
        this.waitingGuests = new Map();
        this.admittedGuests = new Map();
        this.roomSettings = null;
        this.customMessages = new Map();
        this.countdownTimer = null;
        this.refreshTimer = null;
        
        // UI components
        this.waitingRoomContainer = null;
        this.hostControlPanel = null;
        this.guestWaitingArea = null;
        this.messageDisplay = null;
        this.countdownDisplay = null;
        this.guestList = null;
        this.deviceChecker = null;
        this.musicPlayer = null;
        
        // WebSocket connection
        this.socket = null;
        this.connectionStatus = 'disconnected';
        
        // Event handlers
        this.boundEventHandlers = {
            handleGuestJoin: this.handleGuestJoin.bind(this),
            handleGuestLeave: this.handleGuestLeave.bind(this),
            handleHostAdmit: this.handleHostAdmit.bind(this),
            handleHostReject: this.handleHostReject.bind(this),
            handleMessageUpdate: this.handleMessageUpdate.bind(this),
            handleCountdownUpdate: this.handleCountdownUpdate.bind(this),
            handleDeviceCheck: this.handleDeviceCheck.bind(this),
            handleMusicToggle: this.handleMusicToggle.bind(this)
        };
        
        this.init();
    }
    
    /**
     * Initialize waiting room system
     */
    async init() {
        try {
            console.log('🏛️ Initializing Waiting Room System...');
            
            // Inject CSS
            this.injectWaitingRoomCSS();
            
            // Create UI components
            this.createWaitingRoomContainer();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize WebSocket connection
            await this.initializeWebSocket();
            
            console.log('✅ Waiting Room System initialized');
            
            // Emit initialization event
            this.emitWaitingRoomEvent('waiting-room-initialized', {
                roomId: this.roomId,
                isHost: this.isHost
            });
            
        } catch (error) {
            console.error('Failed to initialize waiting room system:', error);
            this.handleInitializationError(error);
        }
    }
    
    /**
     * Join waiting room
     */
    async joinWaitingRoom(roomId, userInfo, isHost = false) {
        try {
            this.roomId = roomId;
            this.isHost = isHost;
            this.currentUser = userInfo;
            
            // Load room settings
            await this.loadRoomSettings();
            
            // Load custom messages
            await this.loadCustomMessages();
            
            // Create appropriate UI
            if (isHost) {
                this.createHostInterface();
            } else {
                this.createGuestInterface();
            }
            
            // Connect to room
            await this.connectToRoom();
            
            // Start refresh timer
            this.startRefreshTimer();
            
            this.isActive = true;
            
            this.emitWaitingRoomEvent('waiting-room-joined', {
                roomId,
                userInfo,
                isHost
            });
            
            console.log('Joined waiting room:', roomId, isHost ? 'as host' : 'as guest');
            
        } catch (error) {
            console.error('Failed to join waiting room:', error);
            this.showError('Failed to join waiting room: ' + error.message);
        }
    }
    
    /**
     * Leave waiting room
     */
    async leaveWaitingRoom() {
        try {
            if (!this.isActive) return;
            
            // Stop timers
            this.stopRefreshTimer();
            this.stopCountdownTimer();
            
            // Disconnect from room
            await this.disconnectFromRoom();
            
            // Clear UI
            this.clearWaitingRoomUI();
            
            this.isActive = false;
            
            this.emitWaitingRoomEvent('waiting-room-left', {
                roomId: this.roomId,
                userInfo: this.currentUser
            });
            
            console.log('Left waiting room:', this.roomId);
            
        } catch (error) {
            console.error('Failed to leave waiting room:', error);
        }
    }
    
    /**
     * Load room settings
     */
    async loadRoomSettings() {
        try {
            const response = await fetch(`/api/interview-rooms/${this.roomId}/settings`);
            if (!response.ok) {
                throw new Error('Failed to load room settings');
            }
            
            this.roomSettings = await response.json();
            
            // Apply settings
            if (this.roomSettings.waiting_room_enabled) {
                this.applyRoomSettings();
            } else {
                throw new Error('Waiting room is not enabled for this interview');
            }
            
        } catch (error) {
            console.error('Failed to load room settings:', error);
            // Use default settings
            this.roomSettings = {
                waiting_room_enabled: true,
                guest_approval_required: true,
                max_guests: this.options.maxWaitingGuests,
                auto_admit: this.options.autoAdmitGuests
            };
        }
    }
    
    /**
     * Load custom messages
     */
    async loadCustomMessages() {
        try {
            const response = await fetch(`/api/interview-rooms/${this.roomId}/waiting-messages`);
            if (response.ok) {
                const messages = await response.json();
                messages.forEach(msg => {
                    this.customMessages.set(msg.type, msg);
                });
            }
            
            // Set default messages if none exist
            if (this.customMessages.size === 0) {
                this.setDefaultMessages();
            }
            
        } catch (error) {
            console.warn('Failed to load custom messages, using defaults:', error);
            this.setDefaultMessages();
        }
    }
    
    /**
     * Set default messages
     */
    setDefaultMessages() {
        const defaultMessages = [
            {
                type: 'welcome',
                title: 'Welcome to the Interview',
                message: 'Thank you for joining! Please wait while the host prepares the interview room.',
                icon: 'fas fa-handshake'
            },
            {
                type: 'waiting',
                title: 'Please Wait',
                message: 'The interview will begin shortly. Please ensure your camera and microphone are working properly.',
                icon: 'fas fa-clock'
            },
            {
                type: 'device_check',
                title: 'Device Check',
                message: 'Please test your camera and microphone to ensure the best interview experience.',
                icon: 'fas fa-video'
            },
            {
                type: 'countdown',
                title: 'Interview Starting Soon',
                message: 'The interview will begin in {countdown}. Please be ready!',
                icon: 'fas fa-stopwatch'
            },
            {
                type: 'host_message',
                title: 'Message from Host',
                message: 'The host will be with you shortly. Thank you for your patience.',
                icon: 'fas fa-user-tie'
            }
        ];
        
        defaultMessages.forEach(msg => {
            this.customMessages.set(msg.type, msg);
        });
    }
    
    /**
     * Create waiting room container
     */
    createWaitingRoomContainer() {
        this.waitingRoomContainer = document.createElement('div');
        this.waitingRoomContainer.className = 'waiting-room-system';
        this.waitingRoomContainer.innerHTML = `
            <div class="waiting-room-header">
                <div class="room-info">
                    <h2 class="room-title">Interview Waiting Room</h2>
                    <div class="room-status">
                        <span class="status-indicator"></span>
                        <span class="status-text">Connecting...</span>
                    </div>
                </div>
                <div class="room-actions">
                    <button class="btn-leave" id="leave-waiting-room">
                        <i class="fas fa-sign-out-alt"></i>
                        Leave
                    </button>
                </div>
            </div>
            <div class="waiting-room-content" id="waiting-room-content">
                <!-- Content will be dynamically generated -->
            </div>
        `;
        
        this.container.appendChild(this.waitingRoomContainer);
    }
    
    /**
     * Create host interface
     */
    createHostInterface() {
        const content = this.waitingRoomContainer.querySelector('#waiting-room-content');
        content.innerHTML = `
            <div class="host-interface">
                <div class="host-controls-panel">
                    <div class="panel-header">
                        <h3><i class="fas fa-users-cog"></i> Host Controls</h3>
                    </div>
                    <div class="panel-content">
                        <div class="control-section">
                            <h4>Waiting Guests</h4>
                            <div class="guest-count">
                                <span class="count-number" id="waiting-count">0</span>
                                <span class="count-label">guests waiting</span>
                            </div>
                            <div class="guest-list" id="host-guest-list">
                                <!-- Guest list will be populated here -->
                            </div>
                        </div>
                        
                        <div class="control-section">
                            <h4>Room Messages</h4>
                            <div class="message-controls">
                                <select id="message-type-select">
                                    <option value="welcome">Welcome Message</option>
                                    <option value="waiting">Waiting Message</option>
                                    <option value="device_check">Device Check</option>
                                    <option value="countdown">Countdown Message</option>
                                    <option value="host_message">Custom Message</option>
                                </select>
                                <button class="btn-edit-message" id="edit-message-btn">
                                    <i class="fas fa-edit"></i>
                                    Edit Message
                                </button>
                            </div>
                            <div class="current-message-preview" id="current-message-preview">
                                <!-- Current message preview -->
                            </div>
                        </div>
                        
                        <div class="control-section">
                            <h4>Room Actions</h4>
                            <div class="action-buttons">
                                <button class="btn-admit-all" id="admit-all-btn">
                                    <i class="fas fa-user-check"></i>
                                    Admit All
                                </button>
                                <button class="btn-start-countdown" id="start-countdown-btn">
                                    <i class="fas fa-stopwatch"></i>
                                    Start Countdown
                                </button>
                                <button class="btn-start-interview" id="start-interview-btn">
                                    <i class="fas fa-play"></i>
                                    Start Interview
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="guest-preview-area">
                    <div class="preview-header">
                        <h3><i class="fas fa-eye"></i> Guest View Preview</h3>
                    </div>
                    <div class="preview-content" id="guest-preview">
                        <!-- Guest view preview -->
                    </div>
                </div>
            </div>
        `;
        
        this.hostControlPanel = content.querySelector('.host-controls-panel');
        this.setupHostControls();
        this.updateGuestPreview();
    }

    /**
     * Create guest interface
     */
    createGuestInterface() {
        const content = this.waitingRoomContainer.querySelector('#waiting-room-content');
        content.innerHTML = `
            <div class="guest-interface">
                <div class="waiting-area">
                    <div class="message-display" id="message-display">
                        <div class="message-icon">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="message-content">
                            <h3 class="message-title">Please Wait</h3>
                            <p class="message-text">${this.options.defaultWaitingMessage}</p>
                        </div>
                    </div>

                    <div class="countdown-display" id="countdown-display" style="display: none;">
                        <div class="countdown-circle">
                            <div class="countdown-number" id="countdown-number">5:00</div>
                            <div class="countdown-label">until interview starts</div>
                        </div>
                    </div>

                    <div class="waiting-status">
                        <div class="status-item">
                            <i class="fas fa-users"></i>
                            <span>Position in queue: <strong id="queue-position">1</strong></span>
                        </div>
                        <div class="status-item">
                            <i class="fas fa-clock"></i>
                            <span>Waiting time: <strong id="waiting-time">0:00</strong></span>
                        </div>
                    </div>
                </div>

                <div class="device-check-area" id="device-check-area">
                    <div class="device-check-header">
                        <h3><i class="fas fa-video"></i> Device Check</h3>
                        <p>Please test your camera and microphone</p>
                    </div>
                    <div class="device-preview">
                        <div class="camera-preview">
                            <video id="camera-preview" autoplay muted playsinline></video>
                            <div class="camera-controls">
                                <button class="btn-toggle-camera" id="toggle-camera">
                                    <i class="fas fa-video"></i>
                                </button>
                                <button class="btn-toggle-mic" id="toggle-mic">
                                    <i class="fas fa-microphone"></i>
                                </button>
                            </div>
                        </div>
                        <div class="audio-level">
                            <div class="audio-meter">
                                <div class="audio-bar" id="audio-bar"></div>
                            </div>
                            <span class="audio-label">Microphone Level</span>
                        </div>
                    </div>
                    <div class="device-status">
                        <div class="status-check">
                            <i class="fas fa-check-circle status-icon" id="camera-status"></i>
                            <span>Camera: <span id="camera-status-text">Testing...</span></span>
                        </div>
                        <div class="status-check">
                            <i class="fas fa-check-circle status-icon" id="mic-status"></i>
                            <span>Microphone: <span id="mic-status-text">Testing...</span></span>
                        </div>
                    </div>
                </div>

                <div class="music-player" id="music-player" style="display: none;">
                    <div class="player-header">
                        <h4><i class="fas fa-music"></i> Background Music</h4>
                        <button class="btn-toggle-music" id="toggle-music">
                            <i class="fas fa-play"></i>
                        </button>
                    </div>
                    <div class="player-controls">
                        <div class="volume-control">
                            <i class="fas fa-volume-down"></i>
                            <input type="range" id="music-volume" min="0" max="100" value="30">
                            <i class="fas fa-volume-up"></i>
                        </div>
                    </div>
                </div>

                <div class="waiting-tips">
                    <h4><i class="fas fa-lightbulb"></i> Interview Tips</h4>
                    <ul>
                        <li>Ensure you're in a quiet, well-lit environment</li>
                        <li>Test your camera and microphone before the interview</li>
                        <li>Have a glass of water nearby</li>
                        <li>Prepare any documents or notes you might need</li>
                        <li>Check your internet connection stability</li>
                    </ul>
                </div>
            </div>
        `;

        this.guestWaitingArea = content.querySelector('.waiting-area');
        this.messageDisplay = content.querySelector('#message-display');
        this.countdownDisplay = content.querySelector('#countdown-display');
        this.deviceChecker = content.querySelector('#device-check-area');
        this.musicPlayer = content.querySelector('#music-player');

        this.setupGuestControls();
        this.startDeviceCheck();
        this.updateWaitingStatus();
    }

    /**
     * Setup host controls
     */
    setupHostControls() {
        // Message type selector
        const messageTypeSelect = this.hostControlPanel.querySelector('#message-type-select');
        messageTypeSelect.addEventListener('change', () => {
            this.updateMessagePreview();
        });

        // Edit message button
        const editMessageBtn = this.hostControlPanel.querySelector('#edit-message-btn');
        editMessageBtn.addEventListener('click', () => {
            this.openMessageEditor();
        });

        // Admit all button
        const admitAllBtn = this.hostControlPanel.querySelector('#admit-all-btn');
        admitAllBtn.addEventListener('click', () => {
            this.admitAllGuests();
        });

        // Start countdown button
        const startCountdownBtn = this.hostControlPanel.querySelector('#start-countdown-btn');
        startCountdownBtn.addEventListener('click', () => {
            this.startCountdownTimer();
        });

        // Start interview button
        const startInterviewBtn = this.hostControlPanel.querySelector('#start-interview-btn');
        startInterviewBtn.addEventListener('click', () => {
            this.startInterview();
        });

        this.updateMessagePreview();
    }

    /**
     * Setup guest controls
     */
    setupGuestControls() {
        // Camera toggle
        const toggleCameraBtn = this.deviceChecker.querySelector('#toggle-camera');
        toggleCameraBtn.addEventListener('click', () => {
            this.toggleCamera();
        });

        // Microphone toggle
        const toggleMicBtn = this.deviceChecker.querySelector('#toggle-mic');
        toggleMicBtn.addEventListener('click', () => {
            this.toggleMicrophone();
        });

        // Music player toggle
        if (this.musicPlayer) {
            const toggleMusicBtn = this.musicPlayer.querySelector('#toggle-music');
            const volumeSlider = this.musicPlayer.querySelector('#music-volume');

            toggleMusicBtn.addEventListener('click', () => {
                this.toggleMusic();
            });

            volumeSlider.addEventListener('input', (e) => {
                this.setMusicVolume(e.target.value);
            });
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Leave waiting room
        const leaveBtn = this.waitingRoomContainer.querySelector('#leave-waiting-room');
        leaveBtn.addEventListener('click', () => {
            this.leaveWaitingRoom();
        });

        // Window beforeunload
        window.addEventListener('beforeunload', () => {
            this.leaveWaitingRoom();
        });
    }

    /**
     * Initialize WebSocket connection
     */
    async initializeWebSocket() {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws/waiting-room`;

            this.socket = new WebSocket(wsUrl);

            this.socket.onopen = () => {
                console.log('WebSocket connected to waiting room');
                this.connectionStatus = 'connected';
                this.updateConnectionStatus();
            };

            this.socket.onmessage = (event) => {
                this.handleWebSocketMessage(JSON.parse(event.data));
            };

            this.socket.onclose = () => {
                console.log('WebSocket disconnected from waiting room');
                this.connectionStatus = 'disconnected';
                this.updateConnectionStatus();
                this.attemptReconnection();
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.connectionStatus = 'error';
                this.updateConnectionStatus();
            };

        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
            this.connectionStatus = 'error';
            this.updateConnectionStatus();
        }
    }

    /**
     * Handle WebSocket messages
     */
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'guest_joined':
                this.handleGuestJoin(data.guest);
                break;
            case 'guest_left':
                this.handleGuestLeave(data.guestId);
                break;
            case 'guest_admitted':
                this.handleGuestAdmitted(data.guestId);
                break;
            case 'guest_rejected':
                this.handleGuestRejected(data.guestId);
                break;
            case 'message_updated':
                this.handleMessageUpdate(data.message);
                break;
            case 'countdown_started':
                this.handleCountdownStarted(data.duration);
                break;
            case 'interview_started':
                this.handleInterviewStarted();
                break;
            case 'room_closed':
                this.handleRoomClosed();
                break;
            default:
                console.log('Unknown WebSocket message:', data);
        }
    }

    /**
     * Connect to room
     */
    async connectToRoom() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'join_waiting_room',
                roomId: this.roomId,
                userInfo: this.currentUser,
                isHost: this.isHost
            }));
        }
    }

    /**
     * Disconnect from room
     */
    async disconnectFromRoom() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'leave_waiting_room',
                roomId: this.roomId,
                userId: this.currentUser.id
            }));
        }
    }

    /**
     * Handle guest join
     */
    handleGuestJoin(guest) {
        this.waitingGuests.set(guest.id, guest);

        if (this.isHost) {
            this.updateHostGuestList();
            this.updateGuestCount();
        }

        this.emitWaitingRoomEvent('guest-joined', { guest });

        if (this.options.enableNotifications && this.isHost) {
            this.showNotification(`${guest.name} joined the waiting room`, 'info');
        }
    }

    /**
     * Handle guest leave
     */
    handleGuestLeave(guestId) {
        const guest = this.waitingGuests.get(guestId);
        this.waitingGuests.delete(guestId);

        if (this.isHost) {
            this.updateHostGuestList();
            this.updateGuestCount();
        }

        this.emitWaitingRoomEvent('guest-left', { guestId, guest });

        if (this.options.enableNotifications && this.isHost && guest) {
            this.showNotification(`${guest.name} left the waiting room`, 'warning');
        }
    }

    /**
     * Handle guest admitted
     */
    handleGuestAdmitted(guestId) {
        const guest = this.waitingGuests.get(guestId);
        if (guest) {
            this.waitingGuests.delete(guestId);
            this.admittedGuests.set(guestId, guest);

            if (this.isHost) {
                this.updateHostGuestList();
                this.updateGuestCount();
            } else if (this.currentUser.id === guestId) {
                this.handleOwnAdmission();
            }

            this.emitWaitingRoomEvent('guest-admitted', { guestId, guest });
        }
    }

    /**
     * Handle guest rejected
     */
    handleGuestRejected(guestId) {
        const guest = this.waitingGuests.get(guestId);
        if (guest) {
            this.waitingGuests.delete(guestId);

            if (this.isHost) {
                this.updateHostGuestList();
                this.updateGuestCount();
            } else if (this.currentUser.id === guestId) {
                this.handleOwnRejection();
            }

            this.emitWaitingRoomEvent('guest-rejected', { guestId, guest });
        }
    }

    /**
     * Handle own admission
     */
    handleOwnAdmission() {
        this.showNotification('You have been admitted to the interview!', 'success');

        // Redirect to interview room after a short delay
        setTimeout(() => {
            window.location.href = `/interview-room/${this.roomId}`;
        }, 2000);
    }

    /**
     * Handle own rejection
     */
    handleOwnRejection() {
        this.showNotification('Your request to join has been declined.', 'error');

        // Redirect back to join page after a short delay
        setTimeout(() => {
            window.location.href = `/join`;
        }, 3000);
    }

    /**
     * Handle message update
     */
    handleMessageUpdate(message) {
        if (!this.isHost) {
            this.updateGuestMessage(message);
        }

        this.emitWaitingRoomEvent('message-updated', { message });
    }

    /**
     * Handle countdown started
     */
    handleCountdownStarted(duration) {
        this.startCountdownDisplay(duration);
        this.emitWaitingRoomEvent('countdown-started', { duration });
    }

    /**
     * Handle interview started
     */
    handleInterviewStarted() {
        if (this.isHost) {
            window.location.href = `/interview-room/${this.roomId}?host=true`;
        } else {
            // Guests should already be admitted before interview starts
            this.showNotification('The interview is starting!', 'info');
        }

        this.emitWaitingRoomEvent('interview-started', { roomId: this.roomId });
    }

    /**
     * Handle room closed
     */
    handleRoomClosed() {
        this.showNotification('The waiting room has been closed.', 'warning');

        setTimeout(() => {
            window.location.href = '/';
        }, 3000);

        this.emitWaitingRoomEvent('room-closed', { roomId: this.roomId });
    }

    /**
     * Update host guest list
     */
    updateHostGuestList() {
        const guestList = this.hostControlPanel.querySelector('#host-guest-list');
        if (!guestList) return;

        guestList.innerHTML = '';

        this.waitingGuests.forEach((guest, guestId) => {
            const guestItem = document.createElement('div');
            guestItem.className = 'guest-item';
            guestItem.innerHTML = `
                <div class="guest-info">
                    <div class="guest-avatar">
                        <img src="${guest.avatar || '/assets/default-avatar.png'}" alt="${guest.name}">
                    </div>
                    <div class="guest-details">
                        <div class="guest-name">${guest.name}</div>
                        <div class="guest-email">${guest.email}</div>
                        <div class="guest-joined">Joined: ${this.formatTime(guest.joinedAt)}</div>
                    </div>
                </div>
                <div class="guest-actions">
                    <button class="btn-admit" onclick="waitingRoom.admitGuest('${guestId}')">
                        <i class="fas fa-check"></i>
                        Admit
                    </button>
                    <button class="btn-reject" onclick="waitingRoom.rejectGuest('${guestId}')">
                        <i class="fas fa-times"></i>
                        Reject
                    </button>
                </div>
            `;

            guestList.appendChild(guestItem);
        });

        if (this.waitingGuests.size === 0) {
            guestList.innerHTML = '<div class="no-guests">No guests waiting</div>';
        }
    }

    /**
     * Update guest count
     */
    updateGuestCount() {
        const countElement = this.hostControlPanel.querySelector('#waiting-count');
        if (countElement) {
            countElement.textContent = this.waitingGuests.size;
        }
    }

    /**
     * Update message preview
     */
    updateMessagePreview() {
        const messageTypeSelect = this.hostControlPanel.querySelector('#message-type-select');
        const previewElement = this.hostControlPanel.querySelector('#current-message-preview');

        if (!messageTypeSelect || !previewElement) return;

        const selectedType = messageTypeSelect.value;
        const message = this.customMessages.get(selectedType);

        if (message) {
            previewElement.innerHTML = `
                <div class="message-preview">
                    <div class="preview-icon">
                        <i class="${message.icon}"></i>
                    </div>
                    <div class="preview-content">
                        <h4>${message.title}</h4>
                        <p>${message.message}</p>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Update guest preview
     */
    updateGuestPreview() {
        const previewElement = this.waitingRoomContainer.querySelector('#guest-preview');
        if (!previewElement) return;

        const currentMessage = this.customMessages.get('waiting');

        previewElement.innerHTML = `
            <div class="guest-preview-content">
                <div class="preview-message">
                    <div class="message-icon">
                        <i class="${currentMessage.icon}"></i>
                    </div>
                    <div class="message-content">
                        <h3>${currentMessage.title}</h3>
                        <p>${currentMessage.message}</p>
                    </div>
                </div>
                <div class="preview-status">
                    <div class="status-item">
                        <i class="fas fa-users"></i>
                        <span>Position: 1</span>
                    </div>
                    <div class="status-item">
                        <i class="fas fa-clock"></i>
                        <span>Waiting: 2:30</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Update guest message
     */
    updateGuestMessage(message) {
        if (!this.messageDisplay) return;

        const iconElement = this.messageDisplay.querySelector('.message-icon i');
        const titleElement = this.messageDisplay.querySelector('.message-title');
        const textElement = this.messageDisplay.querySelector('.message-text');

        if (iconElement) iconElement.className = message.icon;
        if (titleElement) titleElement.textContent = message.title;
        if (textElement) textElement.textContent = message.message;
    }

    /**
     * Update waiting status
     */
    updateWaitingStatus() {
        if (this.isHost) return;

        const queuePosition = this.waitingRoomContainer.querySelector('#queue-position');
        const waitingTime = this.waitingRoomContainer.querySelector('#waiting-time');

        if (queuePosition) {
            // Calculate position based on join time
            let position = 1;
            const currentUserJoinTime = this.currentUser.joinedAt || Date.now();

            this.waitingGuests.forEach(guest => {
                if (guest.joinedAt < currentUserJoinTime) {
                    position++;
                }
            });

            queuePosition.textContent = position;
        }

        if (waitingTime) {
            const joinTime = this.currentUser.joinedAt || Date.now();
            const elapsed = Math.floor((Date.now() - joinTime) / 1000);
            waitingTime.textContent = this.formatDuration(elapsed);
        }
    }

    /**
     * Update connection status
     */
    updateConnectionStatus() {
        const statusIndicator = this.waitingRoomContainer.querySelector('.status-indicator');
        const statusText = this.waitingRoomContainer.querySelector('.status-text');

        if (!statusIndicator || !statusText) return;

        statusIndicator.className = 'status-indicator';

        switch (this.connectionStatus) {
            case 'connected':
                statusIndicator.classList.add('connected');
                statusText.textContent = 'Connected';
                break;
            case 'disconnected':
                statusIndicator.classList.add('disconnected');
                statusText.textContent = 'Disconnected';
                break;
            case 'error':
                statusIndicator.classList.add('error');
                statusText.textContent = 'Connection Error';
                break;
            default:
                statusIndicator.classList.add('connecting');
                statusText.textContent = 'Connecting...';
        }
    }

    /**
     * Admit guest
     */
    async admitGuest(guestId) {
        try {
            const response = await fetch(`/api/waiting-room/${this.roomId}/admit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ guestId })
            });

            if (!response.ok) {
                throw new Error('Failed to admit guest');
            }

            // WebSocket will handle the update
            this.showNotification('Guest admitted successfully', 'success');

        } catch (error) {
            console.error('Failed to admit guest:', error);
            this.showError('Failed to admit guest: ' + error.message);
        }
    }

    /**
     * Reject guest
     */
    async rejectGuest(guestId) {
        try {
            const response = await fetch(`/api/waiting-room/${this.roomId}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ guestId })
            });

            if (!response.ok) {
                throw new Error('Failed to reject guest');
            }

            // WebSocket will handle the update
            this.showNotification('Guest rejected', 'warning');

        } catch (error) {
            console.error('Failed to reject guest:', error);
            this.showError('Failed to reject guest: ' + error.message);
        }
    }

    /**
     * Admit all guests
     */
    async admitAllGuests() {
        try {
            const guestIds = Array.from(this.waitingGuests.keys());

            if (guestIds.length === 0) {
                this.showNotification('No guests to admit', 'info');
                return;
            }

            const response = await fetch(`/api/waiting-room/${this.roomId}/admit-all`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ guestIds })
            });

            if (!response.ok) {
                throw new Error('Failed to admit all guests');
            }

            this.showNotification(`Admitted ${guestIds.length} guests`, 'success');

        } catch (error) {
            console.error('Failed to admit all guests:', error);
            this.showError('Failed to admit all guests: ' + error.message);
        }
    }

    /**
     * Start countdown timer
     */
    startCountdownTimer(duration = this.options.countdownDuration) {
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
        }

        let remaining = duration;

        // Broadcast countdown start
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'start_countdown',
                roomId: this.roomId,
                duration: duration
            }));
        }

        this.countdownTimer = setInterval(() => {
            remaining--;

            if (remaining <= 0) {
                clearInterval(this.countdownTimer);
                this.countdownTimer = null;
                this.startInterview();
            }
        }, 1000);

        this.showNotification(`Countdown started: ${this.formatDuration(duration)}`, 'info');
    }

    /**
     * Start countdown display
     */
    startCountdownDisplay(duration) {
        if (!this.countdownDisplay) return;

        this.countdownDisplay.style.display = 'block';

        let remaining = duration;
        const countdownNumber = this.countdownDisplay.querySelector('#countdown-number');

        const updateDisplay = () => {
            if (countdownNumber) {
                countdownNumber.textContent = this.formatDuration(remaining);
            }

            remaining--;

            if (remaining < 0) {
                this.countdownDisplay.style.display = 'none';
                return;
            }

            setTimeout(updateDisplay, 1000);
        };

        updateDisplay();
    }

    /**
     * Stop countdown timer
     */
    stopCountdownTimer() {
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }
    }

    /**
     * Start interview
     */
    async startInterview() {
        try {
            const response = await fetch(`/api/interview-rooms/${this.roomId}/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to start interview');
            }

            // Broadcast interview start
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    type: 'start_interview',
                    roomId: this.roomId
                }));
            }

            this.showNotification('Interview started!', 'success');

            // Redirect to interview room
            setTimeout(() => {
                window.location.href = `/interview-room/${this.roomId}?host=true`;
            }, 1000);

        } catch (error) {
            console.error('Failed to start interview:', error);
            this.showError('Failed to start interview: ' + error.message);
        }
    }

    /**
     * Open message editor
     */
    openMessageEditor() {
        const messageTypeSelect = this.hostControlPanel.querySelector('#message-type-select');
        const selectedType = messageTypeSelect.value;
        const currentMessage = this.customMessages.get(selectedType);

        const modal = document.createElement('div');
        modal.className = 'message-editor-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit ${currentMessage.title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="message-title">Title:</label>
                        <input type="text" id="message-title" value="${currentMessage.title}">
                    </div>
                    <div class="form-group">
                        <label for="message-text">Message:</label>
                        <textarea id="message-text" rows="4">${currentMessage.message}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="message-icon">Icon:</label>
                        <select id="message-icon">
                            <option value="fas fa-clock" ${currentMessage.icon === 'fas fa-clock' ? 'selected' : ''}>Clock</option>
                            <option value="fas fa-handshake" ${currentMessage.icon === 'fas fa-handshake' ? 'selected' : ''}>Handshake</option>
                            <option value="fas fa-video" ${currentMessage.icon === 'fas fa-video' ? 'selected' : ''}>Video</option>
                            <option value="fas fa-stopwatch" ${currentMessage.icon === 'fas fa-stopwatch' ? 'selected' : ''}>Stopwatch</option>
                            <option value="fas fa-user-tie" ${currentMessage.icon === 'fas fa-user-tie' ? 'selected' : ''}>User</option>
                            <option value="fas fa-info-circle" ${currentMessage.icon === 'fas fa-info-circle' ? 'selected' : ''}>Info</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-cancel">Cancel</button>
                    <button class="btn-save">Save Message</button>
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
            this.saveCustomMessage(selectedType, {
                title: modal.querySelector('#message-title').value,
                message: modal.querySelector('#message-text').value,
                icon: modal.querySelector('#message-icon').value,
                type: selectedType
            });
            closeModal();
        });
    }

    /**
     * Save custom message
     */
    async saveCustomMessage(type, messageData) {
        try {
            const response = await fetch(`/api/waiting-room/${this.roomId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(messageData)
            });

            if (!response.ok) {
                throw new Error('Failed to save message');
            }

            // Update local message
            this.customMessages.set(type, messageData);

            // Update preview
            this.updateMessagePreview();
            this.updateGuestPreview();

            // Broadcast message update
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    type: 'update_message',
                    roomId: this.roomId,
                    message: messageData
                }));
            }

            this.showNotification('Message updated successfully', 'success');

        } catch (error) {
            console.error('Failed to save message:', error);
            this.showError('Failed to save message: ' + error.message);
        }
    }

    /**
     * Start device check
     */
    async startDeviceCheck() {
        if (!this.deviceChecker || this.isHost) return;

        try {
            // Request camera and microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            // Setup camera preview
            const cameraPreview = this.deviceChecker.querySelector('#camera-preview');
            if (cameraPreview) {
                cameraPreview.srcObject = stream;
            }

            // Setup audio level monitoring
            this.setupAudioLevelMonitoring(stream);

            // Update device status
            this.updateDeviceStatus('camera', 'working');
            this.updateDeviceStatus('microphone', 'working');

        } catch (error) {
            console.error('Device check failed:', error);
            this.updateDeviceStatus('camera', 'error');
            this.updateDeviceStatus('microphone', 'error');
        }
    }

    /**
     * Setup audio level monitoring
     */
    setupAudioLevelMonitoring(stream) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const microphone = audioContext.createMediaStreamSource(stream);
            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            microphone.connect(analyser);
            analyser.fftSize = 256;

            const audioBar = this.deviceChecker.querySelector('#audio-bar');

            const updateAudioLevel = () => {
                analyser.getByteFrequencyData(dataArray);

                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }

                const average = sum / dataArray.length;
                const percentage = (average / 255) * 100;

                if (audioBar) {
                    audioBar.style.width = percentage + '%';
                }

                requestAnimationFrame(updateAudioLevel);
            };

            updateAudioLevel();

        } catch (error) {
            console.error('Failed to setup audio monitoring:', error);
        }
    }

    /**
     * Update device status
     */
    updateDeviceStatus(device, status) {
        const statusIcon = this.deviceChecker.querySelector(`#${device}-status`);
        const statusText = this.deviceChecker.querySelector(`#${device}-status-text`);

        if (!statusIcon || !statusText) return;

        statusIcon.className = 'fas status-icon';

        switch (status) {
            case 'working':
                statusIcon.classList.add('fa-check-circle', 'status-success');
                statusText.textContent = 'Working';
                break;
            case 'error':
                statusIcon.classList.add('fa-exclamation-circle', 'status-error');
                statusText.textContent = 'Error';
                break;
            default:
                statusIcon.classList.add('fa-clock', 'status-testing');
                statusText.textContent = 'Testing...';
        }
    }

    /**
     * Toggle camera
     */
    toggleCamera() {
        // Implementation for camera toggle
        const toggleBtn = this.deviceChecker.querySelector('#toggle-camera');
        const icon = toggleBtn.querySelector('i');

        if (icon.classList.contains('fa-video')) {
            icon.className = 'fas fa-video-slash';
            toggleBtn.classList.add('disabled');
        } else {
            icon.className = 'fas fa-video';
            toggleBtn.classList.remove('disabled');
        }
    }

    /**
     * Toggle microphone
     */
    toggleMicrophone() {
        // Implementation for microphone toggle
        const toggleBtn = this.deviceChecker.querySelector('#toggle-mic');
        const icon = toggleBtn.querySelector('i');

        if (icon.classList.contains('fa-microphone')) {
            icon.className = 'fas fa-microphone-slash';
            toggleBtn.classList.add('disabled');
        } else {
            icon.className = 'fas fa-microphone';
            toggleBtn.classList.remove('disabled');
        }
    }

    /**
     * Toggle music
     */
    toggleMusic() {
        if (!this.musicPlayer) return;

        const toggleBtn = this.musicPlayer.querySelector('#toggle-music');
        const icon = toggleBtn.querySelector('i');

        if (icon.classList.contains('fa-play')) {
            icon.className = 'fas fa-pause';
            this.musicPlayer.style.display = 'block';
            // Start background music
        } else {
            icon.className = 'fas fa-play';
            // Pause background music
        }
    }

    /**
     * Set music volume
     */
    setMusicVolume(volume) {
        // Implementation for music volume control
        console.log('Setting music volume to:', volume);
    }

    /**
     * Start refresh timer
     */
    startRefreshTimer() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        this.refreshTimer = setInterval(() => {
            this.refreshWaitingRoomData();
        }, this.options.refreshInterval);
    }

    /**
     * Stop refresh timer
     */
    stopRefreshTimer() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    /**
     * Refresh waiting room data
     */
    async refreshWaitingRoomData() {
        try {
            const response = await fetch(`/api/waiting-room/${this.roomId}/status`);
            if (response.ok) {
                const data = await response.json();

                // Update waiting status for guests
                if (!this.isHost) {
                    this.updateWaitingStatus();
                }

                // Update guest list for hosts
                if (this.isHost && data.waitingGuests) {
                    // Update waiting guests from server data
                    this.waitingGuests.clear();
                    data.waitingGuests.forEach(guest => {
                        this.waitingGuests.set(guest.id, guest);
                    });
                    this.updateHostGuestList();
                    this.updateGuestCount();
                }
            }
        } catch (error) {
            console.error('Failed to refresh waiting room data:', error);
        }
    }

    /**
     * Attempt reconnection
     */
    attemptReconnection() {
        if (this.connectionStatus === 'disconnected') {
            setTimeout(() => {
                console.log('Attempting to reconnect to waiting room...');
                this.initializeWebSocket();
            }, 5000);
        }
    }

    /**
     * Clear waiting room UI
     */
    clearWaitingRoomUI() {
        if (this.waitingRoomContainer) {
            this.waitingRoomContainer.innerHTML = '';
        }
    }

    /**
     * Apply room settings
     */
    applyRoomSettings() {
        if (!this.roomSettings) return;

        // Apply auto-admit setting
        if (this.roomSettings.auto_admit && !this.isHost) {
            // Auto-admit logic would be handled by the server
        }

        // Apply max guests limit
        if (this.isHost && this.waitingGuests.size >= this.roomSettings.max_guests) {
            this.showNotification('Maximum guest limit reached', 'warning');
        }
    }

    /**
     * Handle initialization error
     */
    handleInitializationError(error) {
        this.showError('Failed to initialize waiting room: ' + error.message);

        // Show basic error UI
        if (this.container) {
            this.container.innerHTML = `
                <div class="waiting-room-error">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="error-content">
                        <h3>Waiting Room Error</h3>
                        <p>Failed to initialize the waiting room. Please refresh the page and try again.</p>
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
     * Format time
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    }

    /**
     * Format duration
     */
    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `waiting-room-notification ${type}`;
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
     * Emit waiting room event
     */
    emitWaitingRoomEvent(eventName, data) {
        const event = new CustomEvent(eventName, {
            detail: data,
            bubbles: true
        });

        this.container.dispatchEvent(event);
    }

    /**
     * Inject waiting room CSS
     */
    injectWaitingRoomCSS() {
        const style = document.createElement('style');
        style.textContent = `
            /* Waiting Room System Styles */
            .waiting-room-system {
                width: 100%;
                height: 100vh;
                background: var(--background-color, #1a1a1a);
                color: var(--text-color, #ffffff);
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            .waiting-room-header {
                background: var(--surface-color, #2a2a2a);
                border-bottom: 1px solid var(--border-color, #444444);
                padding: 1rem 2rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-shrink: 0;
            }

            .room-info h2 {
                margin: 0 0 0.5rem 0;
                color: var(--primary-color, #FF0000);
                font-size: 1.5rem;
            }

            .room-status {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.9rem;
                color: var(--text-secondary-color, #cccccc);
            }

            .status-indicator {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #666;
                animation: pulse 2s infinite;
            }

            .status-indicator.connected {
                background: var(--success-color, #28a745);
            }

            .status-indicator.disconnected {
                background: var(--warning-color, #ffc107);
            }

            .status-indicator.error {
                background: var(--danger-color, #dc3545);
            }

            .status-indicator.connecting {
                background: var(--info-color, #17a2b8);
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }

            .room-actions .btn-leave {
                background: var(--danger-color, #dc3545);
                color: white;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .room-actions .btn-leave:hover {
                background: #c82333;
                transform: translateY(-1px);
            }

            .waiting-room-content {
                flex: 1;
                overflow-y: auto;
                padding: 2rem;
            }

            /* Host Interface */
            .host-interface {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 2rem;
                height: 100%;
            }

            .host-controls-panel {
                background: var(--surface-color, #2a2a2a);
                border: 1px solid var(--border-color, #444444);
                border-radius: 8px;
                overflow: hidden;
            }

            .panel-header {
                background: var(--background-color, #1a1a1a);
                padding: 1rem;
                border-bottom: 1px solid var(--border-color, #444444);
            }

            .panel-header h3 {
                margin: 0;
                color: var(--text-color, #ffffff);
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .panel-content {
                padding: 1rem;
                max-height: calc(100vh - 200px);
                overflow-y: auto;
            }

            .control-section {
                margin-bottom: 2rem;
            }

            .control-section h4 {
                margin: 0 0 1rem 0;
                color: var(--primary-color, #FF0000);
                font-size: 1.1rem;
            }

            .guest-count {
                text-align: center;
                margin-bottom: 1rem;
            }

            .count-number {
                display: block;
                font-size: 2rem;
                font-weight: bold;
                color: var(--primary-color, #FF0000);
            }

            .count-label {
                color: var(--text-secondary-color, #cccccc);
                font-size: 0.9rem;
            }

            .guest-list {
                max-height: 300px;
                overflow-y: auto;
                border: 1px solid var(--border-color, #444444);
                border-radius: 4px;
            }

            .guest-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1rem;
                border-bottom: 1px solid var(--border-color, #444444);
                transition: background 0.2s ease;
            }

            .guest-item:hover {
                background: var(--background-color, #1a1a1a);
            }

            .guest-item:last-child {
                border-bottom: none;
            }

            .guest-info {
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .guest-avatar img {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                object-fit: cover;
            }

            .guest-details .guest-name {
                font-weight: bold;
                color: var(--text-color, #ffffff);
            }

            .guest-details .guest-email {
                color: var(--text-secondary-color, #cccccc);
                font-size: 0.9rem;
            }

            .guest-details .guest-joined {
                color: var(--text-secondary-color, #cccccc);
                font-size: 0.8rem;
            }

            .guest-actions {
                display: flex;
                gap: 0.5rem;
            }

            .btn-admit, .btn-reject {
                padding: 0.25rem 0.5rem;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.8rem;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 0.25rem;
            }

            .btn-admit {
                background: var(--success-color, #28a745);
                color: white;
            }

            .btn-admit:hover {
                background: #218838;
            }

            .btn-reject {
                background: var(--danger-color, #dc3545);
                color: white;
            }

            .btn-reject:hover {
                background: #c82333;
            }

            .no-guests {
                text-align: center;
                padding: 2rem;
                color: var(--text-secondary-color, #cccccc);
                font-style: italic;
            }

            .message-controls {
                display: flex;
                gap: 1rem;
                margin-bottom: 1rem;
            }

            .message-controls select {
                flex: 1;
                background: var(--background-color, #1a1a1a);
                color: var(--text-color, #ffffff);
                border: 1px solid var(--border-color, #444444);
                border-radius: 4px;
                padding: 0.5rem;
            }

            .btn-edit-message {
                background: var(--primary-color, #FF0000);
                color: white;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .btn-edit-message:hover {
                background: #cc0000;
            }

            .current-message-preview {
                background: var(--background-color, #1a1a1a);
                border: 1px solid var(--border-color, #444444);
                border-radius: 4px;
                padding: 1rem;
            }

            .message-preview {
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .preview-icon {
                font-size: 1.5rem;
                color: var(--primary-color, #FF0000);
            }

            .preview-content h4 {
                margin: 0 0 0.5rem 0;
                color: var(--text-color, #ffffff);
            }

            .preview-content p {
                margin: 0;
                color: var(--text-secondary-color, #cccccc);
            }

            .action-buttons {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }

            .btn-admit-all, .btn-start-countdown, .btn-start-interview {
                background: var(--primary-color, #FF0000);
                color: white;
                border: none;
                padding: 0.75rem 1rem;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
                font-weight: bold;
            }

            .btn-admit-all:hover, .btn-start-countdown:hover, .btn-start-interview:hover {
                background: #cc0000;
                transform: translateY(-1px);
            }

            .guest-preview-area {
                background: var(--surface-color, #2a2a2a);
                border: 1px solid var(--border-color, #444444);
                border-radius: 8px;
                overflow: hidden;
            }

            .preview-header {
                background: var(--background-color, #1a1a1a);
                padding: 1rem;
                border-bottom: 1px solid var(--border-color, #444444);
            }

            .preview-header h3 {
                margin: 0;
                color: var(--text-color, #ffffff);
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .preview-content {
                padding: 2rem;
            }

            .guest-preview-content {
                text-align: center;
            }

            .preview-message {
                margin-bottom: 2rem;
            }

            .preview-status {
                display: flex;
                justify-content: center;
                gap: 2rem;
            }

            .status-item {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                color: var(--text-secondary-color, #cccccc);
            }

            /* Guest Interface */
            .guest-interface {
                max-width: 800px;
                margin: 0 auto;
                display: flex;
                flex-direction: column;
                gap: 2rem;
            }

            .waiting-area {
                text-align: center;
                background: var(--surface-color, #2a2a2a);
                border: 1px solid var(--border-color, #444444);
                border-radius: 8px;
                padding: 3rem 2rem;
            }

            .message-display {
                margin-bottom: 2rem;
            }

            .message-icon {
                font-size: 4rem;
                color: var(--primary-color, #FF0000);
                margin-bottom: 1rem;
            }

            .message-content h3 {
                margin: 0 0 1rem 0;
                color: var(--text-color, #ffffff);
                font-size: 1.8rem;
            }

            .message-content p {
                margin: 0;
                color: var(--text-secondary-color, #cccccc);
                font-size: 1.1rem;
                line-height: 1.6;
            }

            .countdown-display {
                margin: 2rem 0;
            }

            .countdown-circle {
                width: 150px;
                height: 150px;
                border: 4px solid var(--primary-color, #FF0000);
                border-radius: 50%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                margin: 0 auto;
                animation: pulse 2s infinite;
            }

            .countdown-number {
                font-size: 2rem;
                font-weight: bold;
                color: var(--primary-color, #FF0000);
            }

            .countdown-label {
                font-size: 0.8rem;
                color: var(--text-secondary-color, #cccccc);
                margin-top: 0.5rem;
            }

            .waiting-status {
                display: flex;
                justify-content: center;
                gap: 2rem;
                margin-top: 2rem;
            }

            .device-check-area {
                background: var(--surface-color, #2a2a2a);
                border: 1px solid var(--border-color, #444444);
                border-radius: 8px;
                padding: 2rem;
            }

            .device-check-header {
                text-align: center;
                margin-bottom: 2rem;
            }

            .device-check-header h3 {
                margin: 0 0 0.5rem 0;
                color: var(--text-color, #ffffff);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
            }

            .device-preview {
                display: grid;
                grid-template-columns: 1fr auto;
                gap: 2rem;
                align-items: center;
                margin-bottom: 2rem;
            }

            .camera-preview {
                position: relative;
                background: #000;
                border-radius: 8px;
                overflow: hidden;
            }

            .camera-preview video {
                width: 100%;
                height: 200px;
                object-fit: cover;
            }

            .camera-controls {
                position: absolute;
                bottom: 1rem;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 1rem;
            }

            .btn-toggle-camera, .btn-toggle-mic {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                border: none;
                background: var(--surface-color, #2a2a2a);
                color: var(--text-color, #ffffff);
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .btn-toggle-camera:hover, .btn-toggle-mic:hover {
                background: var(--primary-color, #FF0000);
            }

            .btn-toggle-camera.disabled, .btn-toggle-mic.disabled {
                background: var(--danger-color, #dc3545);
            }

            .audio-level {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1rem;
            }

            .audio-meter {
                width: 20px;
                height: 150px;
                background: var(--background-color, #1a1a1a);
                border: 1px solid var(--border-color, #444444);
                border-radius: 10px;
                position: relative;
                overflow: hidden;
            }

            .audio-bar {
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                background: linear-gradient(to top, var(--success-color, #28a745), var(--warning-color, #ffc107), var(--danger-color, #dc3545));
                transition: height 0.1s ease;
                height: 0%;
            }

            .audio-label {
                font-size: 0.8rem;
                color: var(--text-secondary-color, #cccccc);
                writing-mode: vertical-rl;
                text-orientation: mixed;
            }

            .device-status {
                display: flex;
                justify-content: center;
                gap: 2rem;
            }

            .status-check {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                color: var(--text-secondary-color, #cccccc);
            }

            .status-icon.status-success {
                color: var(--success-color, #28a745);
            }

            .status-icon.status-error {
                color: var(--danger-color, #dc3545);
            }

            .status-icon.status-testing {
                color: var(--warning-color, #ffc107);
            }

            .music-player {
                background: var(--surface-color, #2a2a2a);
                border: 1px solid var(--border-color, #444444);
                border-radius: 8px;
                padding: 1.5rem;
            }

            .player-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
            }

            .player-header h4 {
                margin: 0;
                color: var(--text-color, #ffffff);
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .btn-toggle-music {
                background: var(--primary-color, #FF0000);
                color: white;
                border: none;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .btn-toggle-music:hover {
                background: #cc0000;
            }

            .volume-control {
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .volume-control input[type="range"] {
                flex: 1;
                height: 4px;
                background: var(--background-color, #1a1a1a);
                border-radius: 2px;
                outline: none;
                -webkit-appearance: none;
            }

            .volume-control input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 16px;
                height: 16px;
                background: var(--primary-color, #FF0000);
                border-radius: 50%;
                cursor: pointer;
            }

            .waiting-tips {
                background: var(--surface-color, #2a2a2a);
                border: 1px solid var(--border-color, #444444);
                border-radius: 8px;
                padding: 2rem;
            }

            .waiting-tips h4 {
                margin: 0 0 1rem 0;
                color: var(--text-color, #ffffff);
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .waiting-tips ul {
                margin: 0;
                padding-left: 1.5rem;
                color: var(--text-secondary-color, #cccccc);
                line-height: 1.6;
            }

            .waiting-tips li {
                margin-bottom: 0.5rem;
            }

            /* Message Editor Modal */
            .message-editor-modal {
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
                background: rgba(0, 0, 0, 0.7);
            }

            .modal-content {
                background: var(--surface-color, #2a2a2a);
                border: 1px solid var(--border-color, #444444);
                border-radius: 8px;
                width: 90%;
                max-width: 500px;
                position: relative;
                z-index: 1;
            }

            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1rem;
                border-bottom: 1px solid var(--border-color, #444444);
            }

            .modal-header h3 {
                margin: 0;
                color: var(--text-color, #ffffff);
            }

            .modal-close {
                background: none;
                border: none;
                color: var(--text-secondary-color, #cccccc);
                font-size: 1.5rem;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .modal-close:hover {
                color: var(--text-color, #ffffff);
            }

            .modal-body {
                padding: 1.5rem;
            }

            .form-group {
                margin-bottom: 1rem;
            }

            .form-group label {
                display: block;
                margin-bottom: 0.5rem;
                color: var(--text-color, #ffffff);
                font-weight: bold;
            }

            .form-group input, .form-group textarea, .form-group select {
                width: 100%;
                background: var(--background-color, #1a1a1a);
                color: var(--text-color, #ffffff);
                border: 1px solid var(--border-color, #444444);
                border-radius: 4px;
                padding: 0.75rem;
                font-family: inherit;
                font-size: 1rem;
            }

            .form-group textarea {
                resize: vertical;
                min-height: 100px;
            }

            .modal-footer {
                display: flex;
                justify-content: flex-end;
                gap: 1rem;
                padding: 1rem;
                border-top: 1px solid var(--border-color, #444444);
            }

            .btn-cancel, .btn-save {
                padding: 0.5rem 1rem;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .btn-cancel {
                background: var(--background-color, #1a1a1a);
                color: var(--text-secondary-color, #cccccc);
                border: 1px solid var(--border-color, #444444);
            }

            .btn-cancel:hover {
                background: var(--surface-color, #2a2a2a);
            }

            .btn-save {
                background: var(--primary-color, #FF0000);
                color: white;
            }

            .btn-save:hover {
                background: #cc0000;
            }

            /* Notifications */
            .waiting-room-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--surface-color, #2a2a2a);
                border: 1px solid var(--border-color, #444444);
                border-radius: 8px;
                padding: 1rem;
                z-index: 10001;
                transform: translateX(100%);
                transition: transform 0.3s ease;
                max-width: 300px;
            }

            .waiting-room-notification.show {
                transform: translateX(0);
            }

            .waiting-room-notification.success {
                border-left: 4px solid var(--success-color, #28a745);
            }

            .waiting-room-notification.error {
                border-left: 4px solid var(--danger-color, #dc3545);
            }

            .waiting-room-notification.warning {
                border-left: 4px solid var(--warning-color, #ffc107);
            }

            .waiting-room-notification.info {
                border-left: 4px solid var(--info-color, #17a2b8);
            }

            .notification-content {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                color: var(--text-color, #ffffff);
            }

            /* Error State */
            .waiting-room-error {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                text-align: center;
                padding: 2rem;
            }

            .error-icon {
                font-size: 4rem;
                color: var(--danger-color, #dc3545);
                margin-bottom: 1rem;
            }

            .error-content h3 {
                margin: 0 0 1rem 0;
                color: var(--text-color, #ffffff);
            }

            .error-content p {
                margin: 0 0 2rem 0;
                color: var(--text-secondary-color, #cccccc);
            }

            .btn-retry {
                background: var(--primary-color, #FF0000);
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 1rem;
            }

            .btn-retry:hover {
                background: #cc0000;
                transform: translateY(-1px);
            }

            /* Responsive Design */
            @media (max-width: 768px) {
                .waiting-room-header {
                    padding: 1rem;
                    flex-direction: column;
                    gap: 1rem;
                }

                .waiting-room-content {
                    padding: 1rem;
                }

                .host-interface {
                    grid-template-columns: 1fr;
                    gap: 1rem;
                }

                .guest-interface {
                    gap: 1rem;
                }

                .waiting-area {
                    padding: 2rem 1rem;
                }

                .device-preview {
                    grid-template-columns: 1fr;
                    gap: 1rem;
                }

                .audio-level {
                    flex-direction: row;
                }

                .audio-meter {
                    width: 150px;
                    height: 20px;
                }

                .audio-label {
                    writing-mode: initial;
                    text-orientation: initial;
                }

                .waiting-status {
                    flex-direction: column;
                    gap: 1rem;
                }

                .preview-status {
                    flex-direction: column;
                    gap: 1rem;
                }

                .device-status {
                    flex-direction: column;
                    gap: 1rem;
                }

                .modal-content {
                    width: 95%;
                    margin: 1rem;
                }

                .waiting-room-notification {
                    right: 10px;
                    left: 10px;
                    max-width: none;
                    transform: translateY(-100%);
                }

                .waiting-room-notification.show {
                    transform: translateY(0);
                }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Destroy waiting room system
     */
    destroy() {
        // Stop timers
        this.stopRefreshTimer();
        this.stopCountdownTimer();

        // Close WebSocket connection
        if (this.socket) {
            this.socket.close();
        }

        // Clear UI
        this.clearWaitingRoomUI();

        // Remove event listeners
        window.removeEventListener('beforeunload', this.leaveWaitingRoom);

        console.log('Waiting Room System destroyed');
    }
}

// Global reference for button callbacks
window.waitingRoom = null;
