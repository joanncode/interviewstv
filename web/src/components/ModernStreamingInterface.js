/**
 * Modern Streaming Interface
 * Professional-grade streaming interface with modern UI/UX design
 */
class ModernStreamingInterface {
    constructor(options = {}) {
        this.websocket = options.websocket || null;
        this.currentUserId = options.currentUserId || null;
        this.currentUserRole = options.currentUserRole || 'guest';
        this.roomId = options.roomId || 'default';
        this.container = options.container || null;
        this.onStreamStateChange = options.onStreamStateChange || (() => {});
        this.onViewerCountChange = options.onViewerCountChange || (() => {});
        this.onQualityChange = options.onQualityChange || (() => {});
        
        // Streaming state
        this.isStreaming = false;
        this.isRecording = false;
        this.isPaused = false;
        this.streamId = null;
        this.streamKey = null;
        this.viewerCount = 0;
        this.streamDuration = 0;
        this.recordingDuration = 0;
        
        // Media state
        this.localStream = null;
        this.remoteStreams = new Map();
        this.cameraEnabled = true;
        this.microphoneEnabled = true;
        this.screenShareEnabled = false;
        this.virtualBackgroundEnabled = false;
        
        // UI state
        this.isFullscreen = false;
        this.layoutMode = 'spotlight'; // 'spotlight', 'grid', 'sidebar'
        this.sidebarVisible = true;
        this.controlsVisible = true;
        this.chatVisible = true;
        
        // Stream configuration
        this.streamConfig = {
            title: '',
            description: '',
            category: 'interview',
            quality: '720p',
            bitrate: 2500,
            frameRate: 30,
            recordingEnabled: true,
            chatEnabled: true,
            moderationEnabled: true,
            maxViewers: 1000,
            isPrivate: false,
            requireApproval: false
        };
        
        // Quality options
        this.qualityOptions = [
            { value: '360p', label: '360p (1 Mbps)', bitrate: 1000, resolution: '640x360' },
            { value: '480p', label: '480p (1.5 Mbps)', bitrate: 1500, resolution: '854x480' },
            { value: '720p', label: '720p HD (2.5 Mbps)', bitrate: 2500, resolution: '1280x720' },
            { value: '1080p', label: '1080p FHD (5 Mbps)', bitrate: 5000, resolution: '1920x1080' }
        ];
        
        // Layout options
        this.layoutOptions = [
            { value: 'spotlight', label: 'Spotlight', icon: 'fas fa-user-circle' },
            { value: 'grid', label: 'Grid View', icon: 'fas fa-th' },
            { value: 'sidebar', label: 'Sidebar', icon: 'fas fa-columns' },
            { value: 'presentation', label: 'Presentation', icon: 'fas fa-desktop' }
        ];
        
        // Theme options
        this.themes = {
            dark: {
                name: 'Dark Professional',
                primary: '#FF0000',
                background: '#0a0a0a',
                surface: '#1a1a1a',
                card: '#2a2a2a',
                input: '#3a3a3a',
                text: '#ffffff',
                textMuted: '#cccccc',
                border: '#444444',
                success: '#28a745',
                warning: '#ffc107',
                danger: '#dc3545',
                info: '#17a2b8'
            },
            light: {
                name: 'Light Professional',
                primary: '#FF0000',
                background: '#f8f9fa',
                surface: '#ffffff',
                card: '#ffffff',
                input: '#ffffff',
                text: '#212529',
                textMuted: '#6c757d',
                border: '#dee2e6',
                success: '#28a745',
                warning: '#ffc107',
                danger: '#dc3545',
                info: '#17a2b8'
            }
        };
        
        // Current theme
        this.currentTheme = 'dark';
        
        // Settings
        this.settings = {
            theme: 'dark',
            autoStartRecording: false,
            showViewerCount: true,
            showStreamStats: true,
            enableNotifications: true,
            enableSoundEffects: true,
            autoHideControls: true,
            controlsTimeout: 3000,
            defaultLayout: 'spotlight',
            defaultQuality: '720p',
            enableKeyboardShortcuts: true,
            enableGestures: true,
            ...options.settings
        };
        
        // Timers
        this.streamTimer = null;
        this.recordingTimer = null;
        this.controlsTimer = null;
        this.statsUpdateTimer = null;
        
        // Statistics
        this.streamStats = {
            bitrate: 0,
            frameRate: 0,
            resolution: '',
            packetLoss: 0,
            latency: 0,
            uploadSpeed: 0,
            connectionQuality: 'good'
        };
        
        this.init();
    }
    
    /**
     * Initialize the streaming interface
     */
    init() {
        if (this.container) {
            this.createInterface();
            this.attachEventListeners();
            this.applyTheme();
            this.loadSettings();
        }
        
        if (this.websocket) {
            this.attachWebSocketListeners();
        }
        
        this.startStatsUpdates();
    }
    
    /**
     * Create the main interface
     */
    createInterface() {
        this.container.innerHTML = `
            <div class="modern-streaming-interface" id="streaming-interface">
                <!-- Header Bar -->
                <div class="streaming-header" id="streaming-header">
                    <div class="header-left">
                        <div class="stream-title" id="stream-title">
                            <input type="text" placeholder="Stream Title" id="title-input" value="${this.streamConfig.title}">
                        </div>
                        <div class="stream-status" id="stream-status">
                            <div class="status-indicator offline" id="status-indicator"></div>
                            <span id="status-text">Offline</span>
                        </div>
                    </div>
                    
                    <div class="header-center">
                        <div class="recording-info" id="recording-info" style="display: none;">
                            <div class="recording-dot"></div>
                            <span id="recording-duration">00:00:00</span>
                        </div>
                        <div class="stream-duration" id="stream-duration" style="display: none;">
                            <i class="fas fa-clock"></i>
                            <span id="stream-time">00:00:00</span>
                        </div>
                    </div>
                    
                    <div class="header-right">
                        <div class="viewer-count" id="viewer-count">
                            <i class="fas fa-eye"></i>
                            <span id="viewer-number">0</span>
                        </div>
                        <div class="stream-quality" id="stream-quality">
                            <span id="quality-text">${this.streamConfig.quality}</span>
                            <div class="quality-indicator good" id="quality-indicator"></div>
                        </div>
                        <button class="header-btn" id="settings-btn" title="Settings">
                            <i class="fas fa-cog"></i>
                        </button>
                        <button class="header-btn" id="fullscreen-btn" title="Fullscreen">
                            <i class="fas fa-expand"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Main Content Area -->
                <div class="streaming-content" id="streaming-content">
                    <!-- Video Area -->
                    <div class="video-area" id="video-area">
                        <!-- Main Video Container -->
                        <div class="main-video-container" id="main-video-container">
                            <video id="main-video" class="main-video" autoplay muted playsinline></video>
                            
                            <!-- Video Overlay -->
                            <div class="video-overlay" id="video-overlay">
                                <!-- Stream Stats -->
                                <div class="stream-stats" id="stream-stats" style="display: none;">
                                    <div class="stat-item">
                                        <span class="stat-label">Bitrate:</span>
                                        <span class="stat-value" id="stat-bitrate">0 kbps</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">FPS:</span>
                                        <span class="stat-value" id="stat-fps">0</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Resolution:</span>
                                        <span class="stat-value" id="stat-resolution">0x0</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Latency:</span>
                                        <span class="stat-value" id="stat-latency">0ms</span>
                                    </div>
                                </div>
                                
                                <!-- Connection Quality -->
                                <div class="connection-quality" id="connection-quality">
                                    <div class="quality-bars">
                                        <div class="bar active"></div>
                                        <div class="bar active"></div>
                                        <div class="bar active"></div>
                                        <div class="bar"></div>
                                        <div class="bar"></div>
                                    </div>
                                    <span class="quality-text">Good</span>
                                </div>
                                
                                <!-- Layout Controls -->
                                <div class="layout-controls" id="layout-controls">
                                    <button class="layout-btn active" data-layout="spotlight" title="Spotlight View">
                                        <i class="fas fa-user-circle"></i>
                                    </button>
                                    <button class="layout-btn" data-layout="grid" title="Grid View">
                                        <i class="fas fa-th"></i>
                                    </button>
                                    <button class="layout-btn" data-layout="sidebar" title="Sidebar View">
                                        <i class="fas fa-columns"></i>
                                    </button>
                                    <button class="layout-btn" data-layout="presentation" title="Presentation Mode">
                                        <i class="fas fa-desktop"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Secondary Videos (Grid/Sidebar) -->
                        <div class="secondary-videos" id="secondary-videos">
                            <!-- Participant videos will be added here dynamically -->
                        </div>
                    </div>
                    
                    <!-- Sidebar -->
                    <div class="streaming-sidebar ${this.sidebarVisible ? 'visible' : ''}" id="streaming-sidebar">
                        <!-- Sidebar Tabs -->
                        <div class="sidebar-tabs">
                            <button class="sidebar-tab active" data-tab="chat">
                                <i class="fas fa-comments"></i>
                                <span>Chat</span>
                                <div class="tab-badge" id="chat-badge" style="display: none;">0</div>
                            </button>
                            <button class="sidebar-tab" data-tab="participants">
                                <i class="fas fa-users"></i>
                                <span>Participants</span>
                                <div class="tab-badge" id="participants-badge">0</div>
                            </button>
                            <button class="sidebar-tab" data-tab="settings">
                                <i class="fas fa-cog"></i>
                                <span>Settings</span>
                            </button>
                        </div>
                        
                        <!-- Sidebar Content -->
                        <div class="sidebar-content">
                            <!-- Chat Tab -->
                            <div class="sidebar-panel active" id="chat-panel">
                                <div id="chat-container"></div>
                            </div>
                            
                            <!-- Participants Tab -->
                            <div class="sidebar-panel" id="participants-panel">
                                <div class="participants-header">
                                    <h4>Participants (<span id="participant-count">0</span>)</h4>
                                    <button class="btn-icon" id="invite-btn" title="Invite Participants">
                                        <i class="fas fa-user-plus"></i>
                                    </button>
                                </div>
                                <div class="participants-list" id="participants-list">
                                    <!-- Participants will be added here -->
                                </div>
                            </div>
                            
                            <!-- Settings Tab -->
                            <div class="sidebar-panel" id="settings-panel">
                                <div class="settings-content" id="settings-content">
                                    <!-- Settings will be added here -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Control Bar -->
                <div class="control-bar ${this.controlsVisible ? 'visible' : ''}" id="control-bar">
                    <!-- Media Controls -->
                    <div class="media-controls">
                        <button class="control-btn ${this.microphoneEnabled ? 'active' : ''}" id="microphone-btn" title="Toggle Microphone">
                            <i class="fas ${this.microphoneEnabled ? 'fa-microphone' : 'fa-microphone-slash'}"></i>
                        </button>
                        <button class="control-btn ${this.cameraEnabled ? 'active' : ''}" id="camera-btn" title="Toggle Camera">
                            <i class="fas ${this.cameraEnabled ? 'fa-video' : 'fa-video-slash'}"></i>
                        </button>
                        <button class="control-btn" id="screen-share-btn" title="Share Screen">
                            <i class="fas fa-desktop"></i>
                        </button>
                        <button class="control-btn" id="virtual-bg-btn" title="Virtual Background">
                            <i class="fas fa-image"></i>
                        </button>
                    </div>
                    
                    <!-- Stream Controls -->
                    <div class="stream-controls">
                        <button class="control-btn primary" id="start-stream-btn" title="Start Stream">
                            <i class="fas fa-play"></i>
                            <span>Start Stream</span>
                        </button>
                        <button class="control-btn danger" id="stop-stream-btn" title="Stop Stream" style="display: none;">
                            <i class="fas fa-stop"></i>
                            <span>Stop Stream</span>
                        </button>
                        <button class="control-btn" id="record-btn" title="Start Recording">
                            <i class="fas fa-record-vinyl"></i>
                        </button>
                        <button class="control-btn" id="pause-btn" title="Pause Stream" style="display: none;">
                            <i class="fas fa-pause"></i>
                        </button>
                    </div>
                    
                    <!-- Additional Controls -->
                    <div class="additional-controls">
                        <div class="quality-selector">
                            <select id="quality-select" class="control-select">
                                ${this.qualityOptions.map(option => 
                                    `<option value="${option.value}" ${option.value === this.streamConfig.quality ? 'selected' : ''}>${option.label}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <button class="control-btn" id="chat-toggle-btn" title="Toggle Chat">
                            <i class="fas fa-comments"></i>
                        </button>
                        <button class="control-btn" id="participants-btn" title="Participants">
                            <i class="fas fa-users"></i>
                        </button>
                        <button class="control-btn" id="more-options-btn" title="More Options">
                            <i class="fas fa-ellipsis-h"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Loading Overlay -->
                <div class="loading-overlay" id="loading-overlay" style="display: none;">
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                        <div class="loading-text">Initializing stream...</div>
                    </div>
                </div>
                
                <!-- Notification Container -->
                <div class="notification-container" id="notification-container"></div>
            </div>
        `;
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Header controls
        document.getElementById('settings-btn')?.addEventListener('click', () => this.toggleSettings());
        document.getElementById('fullscreen-btn')?.addEventListener('click', () => this.toggleFullscreen());
        document.getElementById('title-input')?.addEventListener('change', (e) => this.updateStreamTitle(e.target.value));
        
        // Layout controls
        document.querySelectorAll('.layout-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const layout = e.currentTarget.dataset.layout;
                this.changeLayout(layout);
            });
        });
        
        // Media controls
        document.getElementById('microphone-btn')?.addEventListener('click', () => this.toggleMicrophone());
        document.getElementById('camera-btn')?.addEventListener('click', () => this.toggleCamera());
        document.getElementById('screen-share-btn')?.addEventListener('click', () => this.toggleScreenShare());
        document.getElementById('virtual-bg-btn')?.addEventListener('click', () => this.toggleVirtualBackground());
        
        // Stream controls
        document.getElementById('start-stream-btn')?.addEventListener('click', () => this.startStream());
        document.getElementById('stop-stream-btn')?.addEventListener('click', () => this.stopStream());
        document.getElementById('record-btn')?.addEventListener('click', () => this.toggleRecording());
        document.getElementById('pause-btn')?.addEventListener('click', () => this.pauseStream());
        
        // Additional controls
        document.getElementById('quality-select')?.addEventListener('change', (e) => this.changeQuality(e.target.value));
        document.getElementById('chat-toggle-btn')?.addEventListener('click', () => this.toggleChat());
        document.getElementById('participants-btn')?.addEventListener('click', () => this.showParticipants());
        document.getElementById('more-options-btn')?.addEventListener('click', () => this.showMoreOptions());
        
        // Sidebar tabs
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchSidebarTab(tabName);
            });
        });
        
        // Auto-hide controls
        if (this.settings.autoHideControls) {
            this.setupAutoHideControls();
        }
        
        // Keyboard shortcuts
        if (this.settings.enableKeyboardShortcuts) {
            this.setupKeyboardShortcuts();
        }
        
        // Mouse/touch events for controls
        this.container.addEventListener('mousemove', () => this.showControls());
        this.container.addEventListener('touchstart', () => this.showControls());
    }
    
    /**
     * Apply current theme
     */
    applyTheme() {
        const theme = this.themes[this.currentTheme];
        const root = document.documentElement;
        
        Object.entries(theme).forEach(([key, value]) => {
            if (key !== 'name') {
                root.style.setProperty(`--streaming-${key}`, value);
            }
        });
        
        this.container.classList.remove('theme-dark', 'theme-light');
        this.container.classList.add(`theme-${this.currentTheme}`);
    }
    
    /**
     * Load settings from localStorage
     */
    loadSettings() {
        const saved = localStorage.getItem('modernStreamingSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
        
        // Apply loaded settings
        this.currentTheme = this.settings.theme;
        this.streamConfig.quality = this.settings.defaultQuality;
        this.layoutMode = this.settings.defaultLayout;
        
        this.applyTheme();
        this.changeLayout(this.layoutMode);
    }
    
    /**
     * Save settings to localStorage
     */
    saveSettings() {
        localStorage.setItem('modernStreamingSettings', JSON.stringify(this.settings));
    }
    
    /**
     * Start statistics updates
     */
    startStatsUpdates() {
        this.statsUpdateTimer = setInterval(() => {
            this.updateStreamStats();
        }, 1000);
    }
    
    /**
     * Update stream statistics
     */
    updateStreamStats() {
        if (!this.isStreaming) return;
        
        // Update duration
        this.streamDuration++;
        this.updateStreamDuration();
        
        if (this.isRecording) {
            this.recordingDuration++;
            this.updateRecordingDuration();
        }
        
        // Update stats display
        if (this.settings.showStreamStats) {
            this.updateStatsDisplay();
        }
    }
    
    /**
     * Update stream duration display
     */
    updateStreamDuration() {
        const duration = this.formatDuration(this.streamDuration);
        const element = document.getElementById('stream-time');
        if (element) {
            element.textContent = duration;
        }
    }
    
    /**
     * Update recording duration display
     */
    updateRecordingDuration() {
        const duration = this.formatDuration(this.recordingDuration);
        const element = document.getElementById('recording-duration');
        if (element) {
            element.textContent = duration;
        }
    }
    
    /**
     * Format duration in HH:MM:SS
     */
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    /**
     * Update stats display
     */
    updateStatsDisplay() {
        document.getElementById('stat-bitrate').textContent = `${this.streamStats.bitrate} kbps`;
        document.getElementById('stat-fps').textContent = this.streamStats.frameRate;
        document.getElementById('stat-resolution').textContent = this.streamStats.resolution;
        document.getElementById('stat-latency').textContent = `${this.streamStats.latency}ms`;
        
        // Update connection quality
        this.updateConnectionQuality();
    }
    
    /**
     * Update connection quality indicator
     */
    updateConnectionQuality() {
        const qualityElement = document.getElementById('connection-quality');
        const bars = qualityElement.querySelectorAll('.bar');
        const qualityText = qualityElement.querySelector('.quality-text');
        
        let activeBarCount = 0;
        let qualityLabel = '';
        
        if (this.streamStats.connectionQuality === 'excellent') {
            activeBarCount = 5;
            qualityLabel = 'Excellent';
        } else if (this.streamStats.connectionQuality === 'good') {
            activeBarCount = 4;
            qualityLabel = 'Good';
        } else if (this.streamStats.connectionQuality === 'fair') {
            activeBarCount = 3;
            qualityLabel = 'Fair';
        } else if (this.streamStats.connectionQuality === 'poor') {
            activeBarCount = 2;
            qualityLabel = 'Poor';
        } else {
            activeBarCount = 1;
            qualityLabel = 'Very Poor';
        }
        
        bars.forEach((bar, index) => {
            if (index < activeBarCount) {
                bar.classList.add('active');
            } else {
                bar.classList.remove('active');
            }
        });
        
        qualityText.textContent = qualityLabel;
    }
    
    /**
     * Show controls
     */
    showControls() {
        const controlBar = document.getElementById('control-bar');
        const header = document.getElementById('streaming-header');
        
        controlBar.classList.add('visible');
        header.classList.add('visible');
        
        if (this.settings.autoHideControls) {
            clearTimeout(this.controlsTimer);
            this.controlsTimer = setTimeout(() => {
                if (!this.isStreaming || this.container.matches(':hover')) return;
                controlBar.classList.remove('visible');
                header.classList.remove('visible');
            }, this.settings.controlsTimeout);
        }
    }
    
    /**
     * Setup auto-hide controls
     */
    setupAutoHideControls() {
        this.container.addEventListener('mouseenter', () => this.showControls());
        this.container.addEventListener('mouseleave', () => {
            if (this.settings.autoHideControls && this.isStreaming) {
                setTimeout(() => {
                    const controlBar = document.getElementById('control-bar');
                    const header = document.getElementById('streaming-header');
                    controlBar.classList.remove('visible');
                    header.classList.remove('visible');
                }, 1000);
            }
        });
    }
    
    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when streaming interface is focused
            if (!this.container.contains(document.activeElement) && document.activeElement !== document.body) {
                return;
            }
            
            // Prevent shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    if (this.isStreaming) {
                        this.pauseStream();
                    } else {
                        this.startStream();
                    }
                    break;
                case 'KeyM':
                    e.preventDefault();
                    this.toggleMicrophone();
                    break;
                case 'KeyV':
                    e.preventDefault();
                    this.toggleCamera();
                    break;
                case 'KeyS':
                    e.preventDefault();
                    this.toggleScreenShare();
                    break;
                case 'KeyR':
                    e.preventDefault();
                    this.toggleRecording();
                    break;
                case 'KeyC':
                    e.preventDefault();
                    this.toggleChat();
                    break;
                case 'KeyF':
                    e.preventDefault();
                    this.toggleFullscreen();
                    break;
                case 'Digit1':
                    e.preventDefault();
                    this.changeLayout('spotlight');
                    break;
                case 'Digit2':
                    e.preventDefault();
                    this.changeLayout('grid');
                    break;
                case 'Digit3':
                    e.preventDefault();
                    this.changeLayout('sidebar');
                    break;
                case 'Digit4':
                    e.preventDefault();
                    this.changeLayout('presentation');
                    break;
            }
        });
    }
    
    /**
     * Start streaming
     */
    async startStream() {
        try {
            this.showLoading('Starting stream...');
            
            // Validate stream configuration
            if (!this.streamConfig.title.trim()) {
                throw new Error('Stream title is required');
            }
            
            // Initialize media
            await this.initializeMedia();
            
            // Create stream on server
            const streamData = await this.createStreamOnServer();
            this.streamId = streamData.stream_id;
            this.streamKey = streamData.stream_key;
            
            // Start WebRTC streaming
            await this.startWebRTCStreaming();
            
            // Update UI state
            this.isStreaming = true;
            this.streamDuration = 0;
            this.updateStreamingUI();
            
            // Auto-start recording if enabled
            if (this.settings.autoStartRecording) {
                setTimeout(() => this.startRecording(), 1000);
            }
            
            this.hideLoading();
            this.showNotification('Stream started successfully!', 'success');
            this.onStreamStateChange('started', this.streamId);
            
        } catch (error) {
            console.error('Failed to start stream:', error);
            this.hideLoading();
            this.showNotification(`Failed to start stream: ${error.message}`, 'error');
        }
    }
    
    /**
     * Stop streaming
     */
    async stopStream() {
        try {
            this.showLoading('Stopping stream...');
            
            // Stop recording if active
            if (this.isRecording) {
                await this.stopRecording();
            }
            
            // Stop WebRTC streaming
            await this.stopWebRTCStreaming();
            
            // End stream on server
            await this.endStreamOnServer();
            
            // Clean up media
            this.cleanupMedia();
            
            // Update UI state
            this.isStreaming = false;
            this.isPaused = false;
            this.streamId = null;
            this.streamKey = null;
            this.updateStreamingUI();
            
            this.hideLoading();
            this.showNotification('Stream stopped successfully!', 'success');
            this.onStreamStateChange('stopped');
            
        } catch (error) {
            console.error('Failed to stop stream:', error);
            this.hideLoading();
            this.showNotification(`Failed to stop stream: ${error.message}`, 'error');
        }
    }
    
    /**
     * Toggle recording
     */
    async toggleRecording() {
        if (this.isRecording) {
            await this.stopRecording();
        } else {
            await this.startRecording();
        }
    }
    
    /**
     * Start recording
     */
    async startRecording() {
        try {
            if (!this.isStreaming) {
                throw new Error('Cannot record without active stream');
            }
            
            // Start recording on server
            await this.startRecordingOnServer();
            
            this.isRecording = true;
            this.recordingDuration = 0;
            this.updateRecordingUI();
            
            this.showNotification('Recording started', 'success');
            
        } catch (error) {
            console.error('Failed to start recording:', error);
            this.showNotification(`Failed to start recording: ${error.message}`, 'error');
        }
    }
    
    /**
     * Stop recording
     */
    async stopRecording() {
        try {
            // Stop recording on server
            await this.stopRecordingOnServer();
            
            this.isRecording = false;
            this.updateRecordingUI();
            
            this.showNotification('Recording stopped', 'success');
            
        } catch (error) {
            console.error('Failed to stop recording:', error);
            this.showNotification(`Failed to stop recording: ${error.message}`, 'error');
        }
    }
    
    /**
     * Toggle microphone
     */
    toggleMicrophone() {
        this.microphoneEnabled = !this.microphoneEnabled;
        
        if (this.localStream) {
            const audioTracks = this.localStream.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = this.microphoneEnabled;
            });
        }
        
        this.updateMicrophoneUI();
        this.showNotification(`Microphone ${this.microphoneEnabled ? 'enabled' : 'disabled'}`, 'info');
    }
    
    /**
     * Toggle camera
     */
    toggleCamera() {
        this.cameraEnabled = !this.cameraEnabled;
        
        if (this.localStream) {
            const videoTracks = this.localStream.getVideoTracks();
            videoTracks.forEach(track => {
                track.enabled = this.cameraEnabled;
            });
        }
        
        this.updateCameraUI();
        this.showNotification(`Camera ${this.cameraEnabled ? 'enabled' : 'disabled'}`, 'info');
    }
    
    /**
     * Toggle screen share
     */
    async toggleScreenShare() {
        try {
            if (this.screenShareEnabled) {
                await this.stopScreenShare();
            } else {
                await this.startScreenShare();
            }
        } catch (error) {
            console.error('Screen share error:', error);
            this.showNotification(`Screen share error: ${error.message}`, 'error');
        }
    }
    
    /**
     * Start screen share
     */
    async startScreenShare() {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });
            
            // Replace video track in peer connection
            if (this.peerConnection && this.localStream) {
                const videoTrack = screenStream.getVideoTracks()[0];
                const sender = this.peerConnection.getSenders().find(s => 
                    s.track && s.track.kind === 'video'
                );
                
                if (sender) {
                    await sender.replaceTrack(videoTrack);
                }
            }
            
            this.screenShareEnabled = true;
            this.updateScreenShareUI();
            this.showNotification('Screen sharing started', 'success');
            
            // Handle screen share end
            screenStream.getVideoTracks()[0].addEventListener('ended', () => {
                this.stopScreenShare();
            });
            
        } catch (error) {
            throw new Error('Failed to start screen sharing');
        }
    }
    
    /**
     * Stop screen share
     */
    async stopScreenShare() {
        try {
            // Switch back to camera
            if (this.peerConnection && this.localStream) {
                const videoTrack = this.localStream.getVideoTracks()[0];
                const sender = this.peerConnection.getSenders().find(s => 
                    s.track && s.track.kind === 'video'
                );
                
                if (sender && videoTrack) {
                    await sender.replaceTrack(videoTrack);
                }
            }
            
            this.screenShareEnabled = false;
            this.updateScreenShareUI();
            this.showNotification('Screen sharing stopped', 'info');
            
        } catch (error) {
            throw new Error('Failed to stop screen sharing');
        }
    }
    
    /**
     * Toggle virtual background
     */
    toggleVirtualBackground() {
        this.virtualBackgroundEnabled = !this.virtualBackgroundEnabled;
        this.updateVirtualBackgroundUI();
        
        // Virtual background implementation would go here
        this.showNotification(`Virtual background ${this.virtualBackgroundEnabled ? 'enabled' : 'disabled'}`, 'info');
    }
    
    /**
     * Change stream quality
     */
    async changeQuality(quality) {
        try {
            const qualityOption = this.qualityOptions.find(q => q.value === quality);
            if (!qualityOption) return;
            
            this.streamConfig.quality = quality;
            this.streamConfig.bitrate = qualityOption.bitrate;
            
            // Update stream if active
            if (this.isStreaming) {
                await this.updateStreamQuality(qualityOption);
            }
            
            this.updateQualityUI();
            this.onQualityChange(quality, qualityOption);
            this.showNotification(`Quality changed to ${qualityOption.label}`, 'info');
            
        } catch (error) {
            console.error('Failed to change quality:', error);
            this.showNotification(`Failed to change quality: ${error.message}`, 'error');
        }
    }
    
    /**
     * Change layout
     */
    changeLayout(layout) {
        if (!this.layoutOptions.find(l => l.value === layout)) return;
        
        this.layoutMode = layout;
        this.updateLayoutUI();
        this.applyLayout();
        
        this.showNotification(`Layout changed to ${layout}`, 'info');
    }
    
    /**
     * Apply current layout
     */
    applyLayout() {
        const videoArea = document.getElementById('video-area');
        const secondaryVideos = document.getElementById('secondary-videos');
        
        // Remove existing layout classes
        videoArea.classList.remove('layout-spotlight', 'layout-grid', 'layout-sidebar', 'layout-presentation');
        
        // Apply new layout
        videoArea.classList.add(`layout-${this.layoutMode}`);
        
        // Show/hide secondary videos based on layout
        if (this.layoutMode === 'grid' || this.layoutMode === 'sidebar') {
            secondaryVideos.style.display = 'block';
        } else {
            secondaryVideos.style.display = 'none';
        }
    }
    
    /**
     * Toggle chat visibility
     */
    toggleChat() {
        this.chatVisible = !this.chatVisible;
        this.updateChatUI();
        
        if (this.chatVisible) {
            this.switchSidebarTab('chat');
        }
    }
    
    /**
     * Toggle fullscreen
     */
    async toggleFullscreen() {
        try {
            if (!document.fullscreenElement) {
                await this.container.requestFullscreen();
                this.isFullscreen = true;
            } else {
                await document.exitFullscreen();
                this.isFullscreen = false;
            }
            
            this.updateFullscreenUI();
            
        } catch (error) {
            console.error('Fullscreen error:', error);
        }
    }
    
    /**
     * Switch sidebar tab
     */
    switchSidebarTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update panels
        document.querySelectorAll('.sidebar-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${tabName}-panel`).classList.add('active');
        
        // Show sidebar if hidden
        if (!this.sidebarVisible) {
            this.sidebarVisible = true;
            document.getElementById('streaming-sidebar').classList.add('visible');
        }
    }
    
    /**
     * Show participants
     */
    showParticipants() {
        this.switchSidebarTab('participants');
    }
    
    /**
     * Show more options
     */
    showMoreOptions() {
        // Implementation for more options menu
        this.showNotification('More options coming soon!', 'info');
    }
    
    /**
     * Toggle settings
     */
    toggleSettings() {
        this.switchSidebarTab('settings');
    }
    
    /**
     * Update stream title
     */
    updateStreamTitle(title) {
        this.streamConfig.title = title;
        
        // Update on server if streaming
        if (this.isStreaming && this.streamId) {
            this.updateStreamOnServer({ title });
        }
    }
    
    /**
     * Show loading overlay
     */
    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        const text = overlay.querySelector('.loading-text');
        
        text.textContent = message;
        overlay.style.display = 'flex';
    }
    
    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        overlay.style.display = 'none';
    }
    
    /**
     * Show notification
     */
    showNotification(message, type = 'info', duration = 3000) {
        const container = document.getElementById('notification-container');
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add close functionality
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        container.appendChild(notification);
        
        // Auto-remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
    }
    
    /**
     * Get notification icon
     */
    getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'fa-check-circle';
            case 'error': return 'fa-exclamation-circle';
            case 'warning': return 'fa-exclamation-triangle';
            default: return 'fa-info-circle';
        }
    }
    
    /**
     * Update UI states
     */
    updateStreamingUI() {
        const startBtn = document.getElementById('start-stream-btn');
        const stopBtn = document.getElementById('stop-stream-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const statusIndicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        const streamDuration = document.getElementById('stream-duration');
        
        if (this.isStreaming) {
            startBtn.style.display = 'none';
            stopBtn.style.display = 'inline-flex';
            pauseBtn.style.display = 'inline-flex';
            statusIndicator.className = 'status-indicator live';
            statusText.textContent = 'Live';
            streamDuration.style.display = 'block';
        } else {
            startBtn.style.display = 'inline-flex';
            stopBtn.style.display = 'none';
            pauseBtn.style.display = 'none';
            statusIndicator.className = 'status-indicator offline';
            statusText.textContent = 'Offline';
            streamDuration.style.display = 'none';
        }
    }
    
    updateRecordingUI() {
        const recordBtn = document.getElementById('record-btn');
        const recordingInfo = document.getElementById('recording-info');
        
        if (this.isRecording) {
            recordBtn.classList.add('active');
            recordBtn.innerHTML = '<i class="fas fa-stop"></i>';
            recordBtn.title = 'Stop Recording';
            recordingInfo.style.display = 'block';
        } else {
            recordBtn.classList.remove('active');
            recordBtn.innerHTML = '<i class="fas fa-record-vinyl"></i>';
            recordBtn.title = 'Start Recording';
            recordingInfo.style.display = 'none';
        }
    }
    
    updateMicrophoneUI() {
        const btn = document.getElementById('microphone-btn');
        const icon = btn.querySelector('i');
        
        if (this.microphoneEnabled) {
            btn.classList.add('active');
            icon.className = 'fas fa-microphone';
            btn.title = 'Mute Microphone';
        } else {
            btn.classList.remove('active');
            icon.className = 'fas fa-microphone-slash';
            btn.title = 'Unmute Microphone';
        }
    }
    
    updateCameraUI() {
        const btn = document.getElementById('camera-btn');
        const icon = btn.querySelector('i');
        
        if (this.cameraEnabled) {
            btn.classList.add('active');
            icon.className = 'fas fa-video';
            btn.title = 'Turn Off Camera';
        } else {
            btn.classList.remove('active');
            icon.className = 'fas fa-video-slash';
            btn.title = 'Turn On Camera';
        }
    }
    
    updateScreenShareUI() {
        const btn = document.getElementById('screen-share-btn');
        
        if (this.screenShareEnabled) {
            btn.classList.add('active');
            btn.title = 'Stop Screen Share';
        } else {
            btn.classList.remove('active');
            btn.title = 'Share Screen';
        }
    }
    
    updateVirtualBackgroundUI() {
        const btn = document.getElementById('virtual-bg-btn');
        
        if (this.virtualBackgroundEnabled) {
            btn.classList.add('active');
            btn.title = 'Disable Virtual Background';
        } else {
            btn.classList.remove('active');
            btn.title = 'Enable Virtual Background';
        }
    }
    
    updateQualityUI() {
        const qualityText = document.getElementById('quality-text');
        const qualitySelect = document.getElementById('quality-select');
        
        qualityText.textContent = this.streamConfig.quality;
        qualitySelect.value = this.streamConfig.quality;
    }
    
    updateLayoutUI() {
        // Update layout buttons
        document.querySelectorAll('.layout-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-layout="${this.layoutMode}"]`).classList.add('active');
    }
    
    updateChatUI() {
        const sidebar = document.getElementById('streaming-sidebar');
        const chatBtn = document.getElementById('chat-toggle-btn');
        
        if (this.chatVisible) {
            sidebar.classList.add('visible');
            chatBtn.classList.add('active');
        } else {
            if (document.querySelector('.sidebar-tab.active').dataset.tab === 'chat') {
                sidebar.classList.remove('visible');
            }
            chatBtn.classList.remove('active');
        }
    }
    
    updateFullscreenUI() {
        const btn = document.getElementById('fullscreen-btn');
        const icon = btn.querySelector('i');
        
        if (this.isFullscreen) {
            icon.className = 'fas fa-compress';
            btn.title = 'Exit Fullscreen';
        } else {
            icon.className = 'fas fa-expand';
            btn.title = 'Enter Fullscreen';
        }
    }
    
    /**
     * Server communication methods (to be implemented)
     */
    async createStreamOnServer() {
        // Implementation for creating stream on server
        return {
            stream_id: 'stream_' + Date.now(),
            stream_key: 'key_' + Math.random().toString(36).substr(2, 9)
        };
    }
    
    async endStreamOnServer() {
        // Implementation for ending stream on server
    }
    
    async startRecordingOnServer() {
        // Implementation for starting recording on server
    }
    
    async stopRecordingOnServer() {
        // Implementation for stopping recording on server
    }
    
    async updateStreamOnServer(data) {
        // Implementation for updating stream on server
    }
    
    async updateStreamQuality(qualityOption) {
        // Implementation for updating stream quality
    }
    
    /**
     * WebRTC methods (to be implemented)
     */
    async initializeMedia() {
        // Implementation for initializing media
    }
    
    async startWebRTCStreaming() {
        // Implementation for starting WebRTC streaming
    }
    
    async stopWebRTCStreaming() {
        // Implementation for stopping WebRTC streaming
    }
    
    cleanupMedia() {
        // Implementation for cleaning up media
    }
    
    /**
     * WebSocket listeners
     */
    attachWebSocketListeners() {
        if (!this.websocket) return;
        
        this.websocket.addEventListener('message', (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        });
    }
    
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'viewer_joined':
                this.viewerCount++;
                this.updateViewerCount();
                break;
            case 'viewer_left':
                this.viewerCount = Math.max(0, this.viewerCount - 1);
                this.updateViewerCount();
                break;
            case 'stream_stats':
                this.streamStats = { ...this.streamStats, ...data.stats };
                break;
        }
    }
    
    updateViewerCount() {
        const element = document.getElementById('viewer-number');
        if (element) {
            element.textContent = this.viewerCount;
        }
        
        this.onViewerCountChange(this.viewerCount);
    }
    
    /**
     * Public API methods
     */
    setWebSocket(websocket) {
        this.websocket = websocket;
        if (websocket) {
            this.attachWebSocketListeners();
        }
    }
    
    setUserInfo(userId, userRole) {
        this.currentUserId = userId;
        this.currentUserRole = userRole;
    }
    
    setRoomId(roomId) {
        this.roomId = roomId;
    }
    
    getStreamState() {
        return {
            isStreaming: this.isStreaming,
            isRecording: this.isRecording,
            isPaused: this.isPaused,
            streamId: this.streamId,
            viewerCount: this.viewerCount,
            streamDuration: this.streamDuration,
            recordingDuration: this.recordingDuration,
            layoutMode: this.layoutMode,
            streamConfig: this.streamConfig,
            streamStats: this.streamStats
        };
    }
    
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
        
        // Apply relevant settings
        if (newSettings.theme) {
            this.currentTheme = newSettings.theme;
            this.applyTheme();
        }
        
        if (newSettings.defaultLayout) {
            this.changeLayout(newSettings.defaultLayout);
        }
        
        if (newSettings.defaultQuality) {
            this.changeQuality(newSettings.defaultQuality);
        }
    }
    
    /**
     * Destroy the interface
     */
    destroy() {
        // Clear timers
        if (this.streamTimer) clearInterval(this.streamTimer);
        if (this.recordingTimer) clearInterval(this.recordingTimer);
        if (this.controlsTimer) clearTimeout(this.controlsTimer);
        if (this.statsUpdateTimer) clearInterval(this.statsUpdateTimer);
        
        // Stop streaming if active
        if (this.isStreaming) {
            this.stopStream();
        }
        
        // Clean up media
        this.cleanupMedia();
        
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyboardShortcuts);
        
        // Clear container
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Add comprehensive modern streaming CSS
const modernStreamingCSS = `
/* Modern Streaming Interface Styles */
.modern-streaming-interface {
    --streaming-primary: #FF0000;
    --streaming-background: #0a0a0a;
    --streaming-surface: #1a1a1a;
    --streaming-card: #2a2a2a;
    --streaming-input: #3a3a3a;
    --streaming-text: #ffffff;
    --streaming-textMuted: #cccccc;
    --streaming-border: #444444;
    --streaming-success: #28a745;
    --streaming-warning: #ffc107;
    --streaming-danger: #dc3545;
    --streaming-info: #17a2b8;

    position: relative;
    width: 100%;
    height: 100vh;
    background: var(--streaming-background);
    color: var(--streaming-text);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

/* Header Bar */
.streaming-header {
    position: relative;
    z-index: 100;
    background: linear-gradient(135deg, var(--streaming-surface) 0%, rgba(26, 26, 26, 0.95) 100%);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--streaming-border);
    padding: 12px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 60px;
    transition: all 0.3s ease;
}

.streaming-header.visible {
    transform: translateY(0);
}

.streaming-header:not(.visible) {
    transform: translateY(-100%);
}

.header-left {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;
}

.stream-title input {
    background: transparent;
    border: none;
    color: var(--streaming-text);
    font-size: 1.2rem;
    font-weight: 600;
    padding: 8px 12px;
    border-radius: 8px;
    transition: all 0.2s ease;
    min-width: 200px;
}

.stream-title input:focus {
    outline: none;
    background: var(--streaming-input);
    box-shadow: 0 0 0 2px var(--streaming-primary);
}

.stream-title input::placeholder {
    color: var(--streaming-textMuted);
}

.stream-status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 20px;
    background: var(--streaming-card);
    font-size: 0.9rem;
    font-weight: 500;
}

.status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    position: relative;
}

.status-indicator.offline {
    background: #6c757d;
}

.status-indicator.live {
    background: var(--streaming-danger);
    animation: pulse-live 2s infinite;
}

.status-indicator.paused {
    background: var(--streaming-warning);
}

@keyframes pulse-live {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.1); }
}

.header-center {
    display: flex;
    align-items: center;
    gap: 24px;
}

.recording-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: var(--streaming-danger);
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 600;
}

.recording-dot {
    width: 8px;
    height: 8px;
    background: white;
    border-radius: 50%;
    animation: pulse 1s infinite;
}

.stream-duration {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: var(--streaming-card);
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 500;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;
    justify-content: flex-end;
}

.viewer-count {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: var(--streaming-card);
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 500;
}

.stream-quality {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: var(--streaming-card);
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 500;
}

.quality-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
}

.quality-indicator.excellent { background: #28a745; }
.quality-indicator.good { background: #28a745; }
.quality-indicator.fair { background: #ffc107; }
.quality-indicator.poor { background: #fd7e14; }
.quality-indicator.very-poor { background: #dc3545; }

.header-btn {
    background: var(--streaming-card);
    border: none;
    color: var(--streaming-text);
    width: 40px;
    height: 40px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 1rem;
}

.header-btn:hover {
    background: var(--streaming-primary);
    transform: scale(1.05);
}

/* Main Content Area */
.streaming-content {
    flex: 1;
    display: flex;
    position: relative;
    overflow: hidden;
}

/* Video Area */
.video-area {
    flex: 1;
    position: relative;
    background: var(--streaming-background);
    display: flex;
    flex-direction: column;
}

.main-video-container {
    flex: 1;
    position: relative;
    background: #000;
    border-radius: 12px;
    margin: 16px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.main-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    background: #000;
}

/* Video Overlay */
.video-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 10;
}

.video-overlay > * {
    pointer-events: auto;
}

.stream-stats {
    position: absolute;
    top: 16px;
    left: 16px;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    padding: 12px;
    font-size: 0.8rem;
    min-width: 200px;
}

.stat-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
}

.stat-item:last-child {
    margin-bottom: 0;
}

.stat-label {
    color: var(--streaming-textMuted);
}

.stat-value {
    color: var(--streaming-text);
    font-weight: 600;
}

.connection-quality {
    position: absolute;
    top: 16px;
    right: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 0.8rem;
}

.quality-bars {
    display: flex;
    gap: 2px;
    align-items: end;
}

.quality-bars .bar {
    width: 3px;
    background: var(--streaming-textMuted);
    border-radius: 2px;
    transition: all 0.2s ease;
}

.quality-bars .bar:nth-child(1) { height: 8px; }
.quality-bars .bar:nth-child(2) { height: 12px; }
.quality-bars .bar:nth-child(3) { height: 16px; }
.quality-bars .bar:nth-child(4) { height: 20px; }
.quality-bars .bar:nth-child(5) { height: 24px; }

.quality-bars .bar.active {
    background: var(--streaming-success);
}

.layout-controls {
    position: absolute;
    bottom: 16px;
    left: 16px;
    display: flex;
    gap: 8px;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    padding: 8px;
}

.layout-btn {
    background: transparent;
    border: none;
    color: var(--streaming-textMuted);
    width: 36px;
    height: 36px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9rem;
}

.layout-btn:hover,
.layout-btn.active {
    background: var(--streaming-primary);
    color: white;
}

/* Secondary Videos */
.secondary-videos {
    display: none;
    flex-wrap: wrap;
    gap: 8px;
    padding: 16px;
    max-height: 200px;
    overflow-y: auto;
}

.secondary-video {
    width: 160px;
    height: 90px;
    background: #000;
    border-radius: 8px;
    overflow: hidden;
    position: relative;
    cursor: pointer;
    transition: all 0.2s ease;
}

.secondary-video:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 16px rgba(255, 0, 0, 0.3);
}

.secondary-video video {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.secondary-video .participant-name {
    position: absolute;
    bottom: 4px;
    left: 4px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.7rem;
}

/* Layout Variations */
.video-area.layout-grid .main-video-container {
    flex: none;
    height: 60%;
}

.video-area.layout-grid .secondary-videos {
    display: flex;
    height: 40%;
    max-height: none;
}

.video-area.layout-sidebar .main-video-container {
    margin-right: 200px;
}

.video-area.layout-sidebar .secondary-videos {
    display: flex;
    position: absolute;
    right: 16px;
    top: 16px;
    bottom: 16px;
    width: 180px;
    flex-direction: column;
    max-height: none;
}

.video-area.layout-presentation .main-video-container {
    margin: 8px;
    border-radius: 8px;
}

/* Sidebar */
.streaming-sidebar {
    width: 350px;
    background: var(--streaming-surface);
    border-left: 1px solid var(--streaming-border);
    display: flex;
    flex-direction: column;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    position: relative;
    z-index: 50;
}

.streaming-sidebar.visible {
    transform: translateX(0);
}

.sidebar-tabs {
    display: flex;
    background: var(--streaming-card);
    border-bottom: 1px solid var(--streaming-border);
}

.sidebar-tab {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--streaming-textMuted);
    padding: 12px 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    position: relative;
}

.sidebar-tab:hover,
.sidebar-tab.active {
    color: var(--streaming-primary);
    background: var(--streaming-surface);
}

.sidebar-tab i {
    font-size: 1.1rem;
}

.tab-badge {
    position: absolute;
    top: 4px;
    right: 8px;
    background: var(--streaming-primary);
    color: white;
    border-radius: 10px;
    padding: 2px 6px;
    font-size: 0.7rem;
    min-width: 16px;
    text-align: center;
}

.sidebar-content {
    flex: 1;
    overflow: hidden;
    position: relative;
}

.sidebar-panel {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 16px;
    overflow-y: auto;
    opacity: 0;
    transform: translateX(20px);
    transition: all 0.3s ease;
    pointer-events: none;
}

.sidebar-panel.active {
    opacity: 1;
    transform: translateX(0);
    pointer-events: auto;
}

/* Participants Panel */
.participants-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--streaming-border);
}

.participants-header h4 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--streaming-text);
}

.btn-icon {
    background: var(--streaming-card);
    border: none;
    color: var(--streaming-text);
    width: 32px;
    height: 32px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-icon:hover {
    background: var(--streaming-primary);
}

.participants-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.participant-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: var(--streaming-card);
    border-radius: 8px;
    transition: all 0.2s ease;
}

.participant-item:hover {
    background: var(--streaming-input);
}

.participant-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--streaming-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 1.1rem;
}

.participant-info {
    flex: 1;
}

.participant-name {
    font-weight: 600;
    color: var(--streaming-text);
    margin-bottom: 2px;
}

.participant-status {
    font-size: 0.8rem;
    color: var(--streaming-textMuted);
}

.participant-controls {
    display: flex;
    gap: 4px;
}

.participant-controls .btn-icon {
    width: 28px;
    height: 28px;
    font-size: 0.8rem;
}

/* Control Bar */
.control-bar {
    position: relative;
    z-index: 100;
    background: linear-gradient(135deg, var(--streaming-surface) 0%, rgba(26, 26, 26, 0.95) 100%);
    backdrop-filter: blur(10px);
    border-top: 1px solid var(--streaming-border);
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 80px;
    transition: all 0.3s ease;
}

.control-bar.visible {
    transform: translateY(0);
}

.control-bar:not(.visible) {
    transform: translateY(100%);
}

.media-controls,
.stream-controls,
.additional-controls {
    display: flex;
    align-items: center;
    gap: 12px;
}

.control-btn {
    background: var(--streaming-card);
    border: none;
    color: var(--streaming-text);
    padding: 12px 16px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    min-height: 44px;
}

.control-btn:hover {
    background: var(--streaming-input);
    transform: translateY(-2px);
}

.control-btn.active {
    background: var(--streaming-primary);
    color: white;
}

.control-btn.primary {
    background: var(--streaming-primary);
    color: white;
}

.control-btn.primary:hover {
    background: #cc0000;
}

.control-btn.danger {
    background: var(--streaming-danger);
    color: white;
}

.control-btn.danger:hover {
    background: #c82333;
}

.control-btn i {
    font-size: 1rem;
}

.control-select {
    background: var(--streaming-card);
    border: 1px solid var(--streaming-border);
    color: var(--streaming-text);
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9rem;
}

.control-select:focus {
    outline: none;
    border-color: var(--streaming-primary);
    box-shadow: 0 0 0 2px rgba(255, 0, 0, 0.2);
}

.control-select option {
    background: var(--streaming-card);
    color: var(--streaming-text);
}

/* Loading Overlay */
.loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.loading-spinner {
    text-align: center;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--streaming-border);
    border-top: 3px solid var(--streaming-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 16px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.loading-text {
    color: var(--streaming-text);
    font-size: 1rem;
    font-weight: 500;
}

/* Notifications */
.notification-container {
    position: fixed;
    top: 80px;
    right: 24px;
    z-index: 1001;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 400px;
}

.notification {
    background: var(--streaming-card);
    border: 1px solid var(--streaming-border);
    border-radius: 8px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    animation: slideInRight 0.3s ease;
}

.notification-success {
    border-left: 4px solid var(--streaming-success);
}

.notification-error {
    border-left: 4px solid var(--streaming-danger);
}

.notification-warning {
    border-left: 4px solid var(--streaming-warning);
}

.notification-info {
    border-left: 4px solid var(--streaming-info);
}

.notification-content {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
}

.notification-content i {
    font-size: 1.1rem;
}

.notification-success .notification-content i {
    color: var(--streaming-success);
}

.notification-error .notification-content i {
    color: var(--streaming-danger);
}

.notification-warning .notification-content i {
    color: var(--streaming-warning);
}

.notification-info .notification-content i {
    color: var(--streaming-info);
}

.notification-close {
    background: none;
    border: none;
    color: var(--streaming-textMuted);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s ease;
}

.notification-close:hover {
    background: var(--streaming-input);
    color: var(--streaming-text);
}

@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

/* Theme Variations */
.modern-streaming-interface.theme-light {
    --streaming-background: #f8f9fa;
    --streaming-surface: #ffffff;
    --streaming-card: #ffffff;
    --streaming-input: #ffffff;
    --streaming-text: #212529;
    --streaming-textMuted: #6c757d;
    --streaming-border: #dee2e6;
}

/* Responsive Design */
@media (max-width: 1200px) {
    .streaming-sidebar {
        width: 300px;
    }

    .main-video-container {
        margin: 12px;
    }
}

@media (max-width: 768px) {
    .streaming-header {
        padding: 8px 16px;
        min-height: 50px;
    }

    .header-left,
    .header-right {
        flex: none;
    }

    .stream-title input {
        min-width: 150px;
        font-size: 1rem;
    }

    .streaming-sidebar {
        width: 100%;
        position: absolute;
        top: 0;
        bottom: 0;
        z-index: 200;
    }

    .control-bar {
        padding: 12px 16px;
        min-height: 60px;
        flex-wrap: wrap;
        gap: 8px;
    }

    .media-controls,
    .stream-controls,
    .additional-controls {
        gap: 8px;
    }

    .control-btn {
        padding: 8px 12px;
        font-size: 0.8rem;
        min-height: 36px;
    }

    .control-btn span {
        display: none;
    }

    .main-video-container {
        margin: 8px;
        border-radius: 8px;
    }

    .video-area.layout-sidebar .main-video-container {
        margin-right: 8px;
    }

    .video-area.layout-sidebar .secondary-videos {
        display: none;
    }
}

@media (max-width: 480px) {
    .streaming-header {
        padding: 6px 12px;
        min-height: 44px;
    }

    .header-center {
        display: none;
    }

    .stream-title input {
        min-width: 120px;
        font-size: 0.9rem;
    }

    .control-bar {
        padding: 8px 12px;
        min-height: 50px;
    }

    .control-btn {
        padding: 6px 8px;
        min-height: 32px;
    }

    .main-video-container {
        margin: 4px;
        border-radius: 6px;
    }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}

@media (prefers-contrast: high) {
    .modern-streaming-interface {
        --streaming-border: #ffffff;
        --streaming-textMuted: #ffffff;
    }
}

/* Print Styles */
@media print {
    .streaming-header,
    .control-bar,
    .streaming-sidebar,
    .loading-overlay,
    .notification-container {
        display: none !important;
    }

    .streaming-content {
        height: 100vh;
    }

    .main-video-container {
        margin: 0;
        border-radius: 0;
    }
}

/* Fullscreen Styles */
.modern-streaming-interface:fullscreen {
    background: #000;
}

.modern-streaming-interface:fullscreen .main-video-container {
    margin: 0;
    border-radius: 0;
}

.modern-streaming-interface:fullscreen .streaming-sidebar {
    width: 300px;
}

/* Animation Keyframes */
@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}

@keyframes slideDown {
    from { transform: translateY(-20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}

/* Custom Scrollbars */
.sidebar-panel::-webkit-scrollbar,
.secondary-videos::-webkit-scrollbar {
    width: 6px;
}

.sidebar-panel::-webkit-scrollbar-track,
.secondary-videos::-webkit-scrollbar-track {
    background: var(--streaming-card);
}

.sidebar-panel::-webkit-scrollbar-thumb,
.secondary-videos::-webkit-scrollbar-thumb {
    background: var(--streaming-border);
    border-radius: 3px;
}

.sidebar-panel::-webkit-scrollbar-thumb:hover,
.secondary-videos::-webkit-scrollbar-thumb:hover {
    background: var(--streaming-textMuted);
}
`;

// Inject CSS into document
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = modernStreamingCSS;
    document.head.appendChild(styleSheet);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModernStreamingInterface;
} else if (typeof window !== 'undefined') {
    window.ModernStreamingInterface = ModernStreamingInterface;
}
