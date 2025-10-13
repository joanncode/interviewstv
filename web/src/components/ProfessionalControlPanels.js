/**
 * Professional Control Panels
 * Comprehensive control panel system for streaming management
 */
class ProfessionalControlPanels {
    constructor(options = {}) {
        this.container = options.container || null;
        this.streamingInterface = options.streamingInterface || null;
        this.websocket = options.websocket || null;
        this.currentUserId = options.currentUserId || null;
        this.currentUserRole = options.currentUserRole || 'guest';
        this.roomId = options.roomId || 'default';
        this.onSettingsChange = options.onSettingsChange || (() => {});
        this.onControlAction = options.onControlAction || (() => {});
        
        // Panel state
        this.activePanels = new Set();
        this.panelData = new Map();
        this.isInitialized = false;
        
        // Control panels configuration
        this.panels = {
            streamSettings: {
                id: 'stream-settings',
                title: 'Stream Settings',
                icon: 'fas fa-cog',
                category: 'streaming',
                roles: ['host', 'moderator', 'admin'],
                priority: 1
            },
            audioVideo: {
                id: 'audio-video',
                title: 'Audio & Video',
                icon: 'fas fa-video',
                category: 'media',
                roles: ['host', 'moderator', 'admin'],
                priority: 2
            },
            recordingControls: {
                id: 'recording-controls',
                title: 'Recording Controls',
                icon: 'fas fa-record-vinyl',
                category: 'recording',
                roles: ['host', 'moderator', 'admin'],
                priority: 3
            },
            participantManagement: {
                id: 'participant-management',
                title: 'Participant Management',
                icon: 'fas fa-users-cog',
                category: 'participants',
                roles: ['host', 'moderator', 'admin'],
                priority: 4
            },
            moderationControls: {
                id: 'moderation-controls',
                title: 'Moderation Controls',
                icon: 'fas fa-shield-alt',
                category: 'moderation',
                roles: ['moderator', 'admin'],
                priority: 5
            },
            analyticsPanel: {
                id: 'analytics-panel',
                title: 'Analytics & Stats',
                icon: 'fas fa-chart-line',
                category: 'analytics',
                roles: ['host', 'moderator', 'admin'],
                priority: 6
            },
            securityPanel: {
                id: 'security-panel',
                title: 'Security & Privacy',
                icon: 'fas fa-lock',
                category: 'security',
                roles: ['admin'],
                priority: 7
            },
            advancedSettings: {
                id: 'advanced-settings',
                title: 'Advanced Settings',
                icon: 'fas fa-sliders-h',
                category: 'advanced',
                roles: ['admin'],
                priority: 8
            }
        };
        
        // Settings structure
        this.settings = {
            // Stream settings
            streamTitle: '',
            streamDescription: '',
            streamCategory: 'interview',
            streamTags: [],
            isPrivate: false,
            requireApproval: false,
            maxViewers: 1000,
            allowRecording: true,
            allowChat: true,
            
            // Audio/Video settings
            videoQuality: '720p',
            videoBitrate: 2500,
            videoFrameRate: 30,
            audioQuality: 'high',
            audioBitrate: 128,
            audioSampleRate: 48000,
            enableNoiseSuppression: true,
            enableEchoCancellation: true,
            enableAutoGainControl: true,
            
            // Recording settings
            recordingQuality: '1080p',
            recordingFormat: 'mp4',
            autoStartRecording: false,
            recordingLocation: 'cloud',
            enableHighlights: true,
            enableTranscription: true,
            
            // Participant settings
            allowParticipantVideo: true,
            allowParticipantAudio: true,
            allowParticipantScreenShare: false,
            requireParticipantApproval: true,
            maxParticipants: 10,
            participantTimeLimit: 0,
            
            // Moderation settings
            enableAutoModeration: true,
            profanityFilter: true,
            spamDetection: true,
            enableWordFilter: true,
            bannedWords: [],
            moderationLevel: 'medium',
            requireModerationApproval: false,
            
            // Security settings
            enableWaitingRoom: true,
            requirePassword: false,
            streamPassword: '',
            enableEndToEndEncryption: true,
            allowRecordingDownload: false,
            dataRetentionDays: 30,
            
            // Advanced settings
            enableLowLatencyMode: false,
            enableAdaptiveBitrate: true,
            enableRedundantStreaming: false,
            customRTMPEndpoint: '',
            enableWebhooks: false,
            webhookURL: '',
            enableAPIAccess: false,
            
            ...options.settings
        };
        
        // Categories for organization
        this.categories = {
            streaming: { name: 'Streaming', icon: 'fas fa-broadcast-tower', color: '#FF0000' },
            media: { name: 'Media', icon: 'fas fa-video', color: '#17a2b8' },
            recording: { name: 'Recording', icon: 'fas fa-record-vinyl', color: '#28a745' },
            participants: { name: 'Participants', icon: 'fas fa-users', color: '#ffc107' },
            moderation: { name: 'Moderation', icon: 'fas fa-shield-alt', color: '#fd7e14' },
            analytics: { name: 'Analytics', icon: 'fas fa-chart-bar', color: '#6f42c1' },
            security: { name: 'Security', icon: 'fas fa-lock', color: '#dc3545' },
            advanced: { name: 'Advanced', icon: 'fas fa-cogs', color: '#6c757d' }
        };
        
        this.init();
    }
    
    /**
     * Initialize control panels
     */
    init() {
        if (this.container) {
            this.createControlPanelsInterface();
            this.attachEventListeners();
            this.loadSettings();
            this.isInitialized = true;
        }
        
        if (this.websocket) {
            this.attachWebSocketListeners();
        }
    }
    
    /**
     * Create the main control panels interface
     */
    createControlPanelsInterface() {
        this.container.innerHTML = `
            <div class="professional-control-panels" id="control-panels">
                <!-- Control Panel Header -->
                <div class="control-panel-header">
                    <div class="header-left">
                        <h3><i class="fas fa-sliders-h me-2"></i>Control Panels</h3>
                        <div class="panel-breadcrumb" id="panel-breadcrumb">
                            <span class="breadcrumb-item active">Dashboard</span>
                        </div>
                    </div>
                    <div class="header-right">
                        <div class="panel-search">
                            <input type="text" id="panel-search" placeholder="Search panels..." class="form-control">
                            <i class="fas fa-search search-icon"></i>
                        </div>
                        <button class="btn-icon" id="panel-minimize" title="Minimize Panels">
                            <i class="fas fa-minus"></i>
                        </button>
                        <button class="btn-icon" id="panel-close" title="Close Panels">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Control Panel Navigation -->
                <div class="control-panel-nav">
                    <div class="nav-categories" id="nav-categories">
                        ${this.createCategoryNavigation()}
                    </div>
                    <div class="nav-panels" id="nav-panels">
                        ${this.createPanelNavigation()}
                    </div>
                </div>
                
                <!-- Control Panel Content -->
                <div class="control-panel-content">
                    <!-- Dashboard View -->
                    <div class="panel-view active" id="dashboard-view">
                        <div class="dashboard-grid">
                            ${this.createDashboardCards()}
                        </div>
                    </div>
                    
                    <!-- Individual Panel Views -->
                    ${this.createPanelViews()}
                </div>
                
                <!-- Control Panel Footer -->
                <div class="control-panel-footer">
                    <div class="footer-left">
                        <div class="connection-status">
                            <div class="status-indicator connected" id="connection-status"></div>
                            <span id="connection-text">Connected</span>
                        </div>
                        <div class="last-saved" id="last-saved">
                            <i class="fas fa-save me-1"></i>
                            <span>Auto-saved</span>
                        </div>
                    </div>
                    <div class="footer-right">
                        <button class="btn btn-outline-secondary" id="reset-settings">
                            <i class="fas fa-undo me-1"></i>Reset
                        </button>
                        <button class="btn btn-outline-primary" id="export-settings">
                            <i class="fas fa-download me-1"></i>Export
                        </button>
                        <button class="btn btn-primary" id="save-settings">
                            <i class="fas fa-save me-1"></i>Save Changes
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Create category navigation
     */
    createCategoryNavigation() {
        return Object.entries(this.categories).map(([key, category]) => {
            const panelCount = Object.values(this.panels).filter(p => 
                p.category === key && this.hasPermission(p.roles)
            ).length;
            
            if (panelCount === 0) return '';
            
            return `
                <div class="nav-category" data-category="${key}">
                    <div class="category-header">
                        <i class="${category.icon}" style="color: ${category.color}"></i>
                        <span>${category.name}</span>
                        <div class="category-badge">${panelCount}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Create panel navigation
     */
    createPanelNavigation() {
        return Object.entries(this.panels)
            .filter(([key, panel]) => this.hasPermission(panel.roles))
            .sort((a, b) => a[1].priority - b[1].priority)
            .map(([key, panel]) => {
                const category = this.categories[panel.category];
                return `
                    <div class="nav-panel" data-panel="${panel.id}" data-category="${panel.category}">
                        <div class="panel-icon">
                            <i class="${panel.icon}" style="color: ${category.color}"></i>
                        </div>
                        <div class="panel-info">
                            <div class="panel-title">${panel.title}</div>
                            <div class="panel-category">${category.name}</div>
                        </div>
                        <div class="panel-arrow">
                            <i class="fas fa-chevron-right"></i>
                        </div>
                    </div>
                `;
            }).join('');
    }
    
    /**
     * Create dashboard cards
     */
    createDashboardCards() {
        const availablePanels = Object.entries(this.panels)
            .filter(([key, panel]) => this.hasPermission(panel.roles))
            .sort((a, b) => a[1].priority - b[1].priority);
        
        return availablePanels.map(([key, panel]) => {
            const category = this.categories[panel.category];
            return `
                <div class="dashboard-card" data-panel="${panel.id}">
                    <div class="card-header">
                        <div class="card-icon">
                            <i class="${panel.icon}" style="color: ${category.color}"></i>
                        </div>
                        <div class="card-title">${panel.title}</div>
                    </div>
                    <div class="card-content">
                        <div class="card-description">
                            ${this.getPanelDescription(panel.id)}
                        </div>
                        <div class="card-stats">
                            ${this.getPanelStats(panel.id)}
                        </div>
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-sm btn-outline-primary">
                            <i class="fas fa-cog me-1"></i>Configure
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Create individual panel views
     */
    createPanelViews() {
        return Object.entries(this.panels)
            .filter(([key, panel]) => this.hasPermission(panel.roles))
            .map(([key, panel]) => {
                return `
                    <div class="panel-view" id="${panel.id}-view">
                        <div class="panel-header">
                            <div class="panel-title">
                                <i class="${panel.icon} me-2"></i>
                                ${panel.title}
                            </div>
                            <div class="panel-actions">
                                <button class="btn-icon" title="Help">
                                    <i class="fas fa-question-circle"></i>
                                </button>
                                <button class="btn-icon" title="Reset to Defaults">
                                    <i class="fas fa-undo"></i>
                                </button>
                            </div>
                        </div>
                        <div class="panel-body">
                            ${this.createPanelContent(panel.id)}
                        </div>
                    </div>
                `;
            }).join('');
    }
    
    /**
     * Get panel description
     */
    getPanelDescription(panelId) {
        const descriptions = {
            'stream-settings': 'Configure basic stream properties, privacy settings, and viewer limits',
            'audio-video': 'Adjust video quality, audio settings, and media enhancement options',
            'recording-controls': 'Manage recording settings, formats, and automatic recording features',
            'participant-management': 'Control participant permissions, limits, and interaction settings',
            'moderation-controls': 'Configure content moderation, filters, and automated moderation tools',
            'analytics-panel': 'View detailed analytics, performance metrics, and audience insights',
            'security-panel': 'Manage security settings, encryption, and privacy controls',
            'advanced-settings': 'Configure advanced streaming options, APIs, and technical settings'
        };
        
        return descriptions[panelId] || 'Configure panel settings';
    }
    
    /**
     * Get panel stats
     */
    getPanelStats(panelId) {
        // This would be populated with real-time stats
        const stats = {
            'stream-settings': '<span class="stat-item">Status: <strong>Ready</strong></span>',
            'audio-video': '<span class="stat-item">Quality: <strong>720p HD</strong></span>',
            'recording-controls': '<span class="stat-item">Storage: <strong>Available</strong></span>',
            'participant-management': '<span class="stat-item">Participants: <strong>0/10</strong></span>',
            'moderation-controls': '<span class="stat-item">Auto-mod: <strong>Enabled</strong></span>',
            'analytics-panel': '<span class="stat-item">Viewers: <strong>0</strong></span>',
            'security-panel': '<span class="stat-item">Security: <strong>High</strong></span>',
            'advanced-settings': '<span class="stat-item">API: <strong>Disabled</strong></span>'
        };
        
        return stats[panelId] || '';
    }
    
    /**
     * Create panel content
     */
    createPanelContent(panelId) {
        switch (panelId) {
            case 'stream-settings':
                return this.createStreamSettingsPanel();
            case 'audio-video':
                return this.createAudioVideoPanel();
            case 'recording-controls':
                return this.createRecordingControlsPanel();
            case 'participant-management':
                return this.createParticipantManagementPanel();
            case 'moderation-controls':
                return this.createModerationControlsPanel();
            case 'analytics-panel':
                return this.createAnalyticsPanel();
            case 'security-panel':
                return this.createSecurityPanel();
            case 'advanced-settings':
                return this.createAdvancedSettingsPanel();
            default:
                return '<div class="panel-placeholder">Panel content will be loaded here</div>';
        }
    }
    
    /**
     * Create stream settings panel
     */
    createStreamSettingsPanel() {
        return `
            <div class="settings-section">
                <h5><i class="fas fa-info-circle me-2"></i>Basic Information</h5>
                <div class="row">
                    <div class="col-md-8">
                        <div class="form-group">
                            <label for="stream-title">Stream Title</label>
                            <input type="text" id="stream-title" class="form-control"
                                   value="${this.settings.streamTitle}"
                                   placeholder="Enter stream title">
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="stream-category">Category</label>
                            <select id="stream-category" class="form-control">
                                <option value="interview">Interview</option>
                                <option value="presentation">Presentation</option>
                                <option value="meeting">Meeting</option>
                                <option value="webinar">Webinar</option>
                                <option value="education">Education</option>
                                <option value="entertainment">Entertainment</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label for="stream-description">Description</label>
                    <textarea id="stream-description" class="form-control" rows="3"
                              placeholder="Describe your stream...">${this.settings.streamDescription}</textarea>
                </div>

                <div class="form-group">
                    <label for="stream-tags">Tags</label>
                    <input type="text" id="stream-tags" class="form-control"
                           placeholder="Add tags separated by commas">
                    <small class="form-text text-muted">Tags help viewers find your stream</small>
                </div>
            </div>

            <div class="settings-section">
                <h5><i class="fas fa-users me-2"></i>Audience Settings</h5>
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="max-viewers">Maximum Viewers</label>
                            <input type="number" id="max-viewers" class="form-control"
                                   value="${this.settings.maxViewers}" min="1" max="10000">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <div class="form-check-group">
                                <div class="form-check">
                                    <input type="checkbox" id="is-private" class="form-check-input"
                                           ${this.settings.isPrivate ? 'checked' : ''}>
                                    <label for="is-private" class="form-check-label">Private Stream</label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="require-approval" class="form-check-input"
                                           ${this.settings.requireApproval ? 'checked' : ''}>
                                    <label for="require-approval" class="form-check-label">Require Approval</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h5><i class="fas fa-toggle-on me-2"></i>Feature Controls</h5>
                <div class="feature-toggles">
                    <div class="toggle-item">
                        <div class="toggle-info">
                            <div class="toggle-title">Enable Chat</div>
                            <div class="toggle-description">Allow viewers to chat during the stream</div>
                        </div>
                        <div class="toggle-switch">
                            <input type="checkbox" id="allow-chat" class="toggle-input"
                                   ${this.settings.allowChat ? 'checked' : ''}>
                            <label for="allow-chat" class="toggle-label"></label>
                        </div>
                    </div>

                    <div class="toggle-item">
                        <div class="toggle-info">
                            <div class="toggle-title">Enable Recording</div>
                            <div class="toggle-description">Allow this stream to be recorded</div>
                        </div>
                        <div class="toggle-switch">
                            <input type="checkbox" id="allow-recording" class="toggle-input"
                                   ${this.settings.allowRecording ? 'checked' : ''}>
                            <label for="allow-recording" class="toggle-label"></label>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create audio/video panel
     */
    createAudioVideoPanel() {
        return `
            <div class="settings-section">
                <h5><i class="fas fa-video me-2"></i>Video Settings</h5>
                <div class="row">
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="video-quality">Video Quality</label>
                            <select id="video-quality" class="form-control">
                                <option value="360p">360p (640x360)</option>
                                <option value="480p">480p (854x480)</option>
                                <option value="720p" selected>720p HD (1280x720)</option>
                                <option value="1080p">1080p FHD (1920x1080)</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="video-bitrate">Video Bitrate (kbps)</label>
                            <input type="range" id="video-bitrate" class="form-range"
                                   min="500" max="8000" value="${this.settings.videoBitrate}">
                            <div class="range-value">${this.settings.videoBitrate} kbps</div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="video-framerate">Frame Rate</label>
                            <select id="video-framerate" class="form-control">
                                <option value="15">15 FPS</option>
                                <option value="24">24 FPS</option>
                                <option value="30" selected>30 FPS</option>
                                <option value="60">60 FPS</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h5><i class="fas fa-microphone me-2"></i>Audio Settings</h5>
                <div class="row">
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="audio-quality">Audio Quality</label>
                            <select id="audio-quality" class="form-control">
                                <option value="low">Low (64 kbps)</option>
                                <option value="medium">Medium (96 kbps)</option>
                                <option value="high" selected>High (128 kbps)</option>
                                <option value="ultra">Ultra (192 kbps)</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="audio-sample-rate">Sample Rate</label>
                            <select id="audio-sample-rate" class="form-control">
                                <option value="44100">44.1 kHz</option>
                                <option value="48000" selected>48 kHz</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <div class="audio-enhancements">
                                <div class="form-check">
                                    <input type="checkbox" id="noise-suppression" class="form-check-input" checked>
                                    <label for="noise-suppression" class="form-check-label">Noise Suppression</label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="echo-cancellation" class="form-check-input" checked>
                                    <label for="echo-cancellation" class="form-check-label">Echo Cancellation</label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="auto-gain-control" class="form-check-input" checked>
                                    <label for="auto-gain-control" class="form-check-label">Auto Gain Control</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h5><i class="fas fa-sliders-h me-2"></i>Advanced Media Settings</h5>
                <div class="feature-toggles">
                    <div class="toggle-item">
                        <div class="toggle-info">
                            <div class="toggle-title">Adaptive Bitrate</div>
                            <div class="toggle-description">Automatically adjust quality based on connection</div>
                        </div>
                        <div class="toggle-switch">
                            <input type="checkbox" id="adaptive-bitrate" class="toggle-input" checked>
                            <label for="adaptive-bitrate" class="toggle-label"></label>
                        </div>
                    </div>

                    <div class="toggle-item">
                        <div class="toggle-info">
                            <div class="toggle-title">Low Latency Mode</div>
                            <div class="toggle-description">Reduce stream delay for real-time interaction</div>
                        </div>
                        <div class="toggle-switch">
                            <input type="checkbox" id="low-latency" class="toggle-input">
                            <label for="low-latency" class="toggle-label"></label>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create recording controls panel
     */
    createRecordingControlsPanel() {
        return `
            <div class="settings-section">
                <h5><i class="fas fa-record-vinyl me-2"></i>Recording Settings</h5>
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="recording-quality">Recording Quality</label>
                            <select id="recording-quality" class="form-control">
                                <option value="720p">720p HD</option>
                                <option value="1080p" selected>1080p FHD</option>
                                <option value="4k">4K Ultra HD</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="recording-format">Recording Format</label>
                            <select id="recording-format" class="form-control">
                                <option value="mp4" selected>MP4 (H.264)</option>
                                <option value="webm">WebM (VP9)</option>
                                <option value="mov">MOV (ProRes)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="recording-location">Storage Location</label>
                            <select id="recording-location" class="form-control">
                                <option value="cloud" selected>Cloud Storage</option>
                                <option value="local">Local Storage</option>
                                <option value="both">Both Cloud & Local</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <div class="recording-options">
                                <div class="form-check">
                                    <input type="checkbox" id="auto-start-recording" class="form-check-input">
                                    <label for="auto-start-recording" class="form-check-label">Auto-start Recording</label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="enable-highlights" class="form-check-input" checked>
                                    <label for="enable-highlights" class="form-check-label">Enable Highlights</label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="enable-transcription" class="form-check-input" checked>
                                    <label for="enable-transcription" class="form-check-label">Enable Transcription</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h5><i class="fas fa-cloud me-2"></i>Storage & Backup</h5>
                <div class="storage-info">
                    <div class="storage-item">
                        <div class="storage-label">Cloud Storage Used</div>
                        <div class="storage-bar">
                            <div class="storage-progress" style="width: 35%"></div>
                        </div>
                        <div class="storage-text">3.5 GB / 10 GB</div>
                    </div>

                    <div class="storage-item">
                        <div class="storage-label">Local Storage Available</div>
                        <div class="storage-bar">
                            <div class="storage-progress" style="width: 80%"></div>
                        </div>
                        <div class="storage-text">800 GB / 1 TB</div>
                    </div>
                </div>

                <div class="backup-settings">
                    <div class="toggle-item">
                        <div class="toggle-info">
                            <div class="toggle-title">Automatic Backup</div>
                            <div class="toggle-description">Automatically backup recordings to secondary location</div>
                        </div>
                        <div class="toggle-switch">
                            <input type="checkbox" id="auto-backup" class="toggle-input" checked>
                            <label for="auto-backup" class="toggle-label"></label>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create participant management panel
     */
    createParticipantManagementPanel() {
        return `
            <div class="settings-section">
                <h5><i class="fas fa-users me-2"></i>Participant Settings</h5>
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="max-participants">Maximum Participants</label>
                            <input type="number" id="max-participants" class="form-control"
                                   value="${this.settings.maxParticipants}" min="1" max="100">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="participant-time-limit">Time Limit (minutes)</label>
                            <input type="number" id="participant-time-limit" class="form-control"
                                   value="${this.settings.participantTimeLimit}" min="0" max="480">
                            <small class="form-text text-muted">0 = No limit</small>
                        </div>
                    </div>
                </div>

                <div class="participant-permissions">
                    <h6>Participant Permissions</h6>
                    <div class="permission-grid">
                        <div class="permission-item">
                            <div class="permission-info">
                                <div class="permission-title">Video</div>
                                <div class="permission-desc">Allow participants to share video</div>
                            </div>
                            <div class="toggle-switch">
                                <input type="checkbox" id="allow-participant-video" class="toggle-input" checked>
                                <label for="allow-participant-video" class="toggle-label"></label>
                            </div>
                        </div>

                        <div class="permission-item">
                            <div class="permission-info">
                                <div class="permission-title">Audio</div>
                                <div class="permission-desc">Allow participants to share audio</div>
                            </div>
                            <div class="toggle-switch">
                                <input type="checkbox" id="allow-participant-audio" class="toggle-input" checked>
                                <label for="allow-participant-audio" class="toggle-label"></label>
                            </div>
                        </div>

                        <div class="permission-item">
                            <div class="permission-info">
                                <div class="permission-title">Screen Share</div>
                                <div class="permission-desc">Allow participants to share screen</div>
                            </div>
                            <div class="toggle-switch">
                                <input type="checkbox" id="allow-participant-screen-share" class="toggle-input">
                                <label for="allow-participant-screen-share" class="toggle-label"></label>
                            </div>
                        </div>

                        <div class="permission-item">
                            <div class="permission-info">
                                <div class="permission-title">Require Approval</div>
                                <div class="permission-desc">Manually approve participant requests</div>
                            </div>
                            <div class="toggle-switch">
                                <input type="checkbox" id="require-participant-approval" class="toggle-input" checked>
                                <label for="require-participant-approval" class="toggle-label"></label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h5><i class="fas fa-door-open me-2"></i>Waiting Room</h5>
                <div class="waiting-room-settings">
                    <div class="toggle-item">
                        <div class="toggle-info">
                            <div class="toggle-title">Enable Waiting Room</div>
                            <div class="toggle-description">Hold participants in waiting room before admission</div>
                        </div>
                        <div class="toggle-switch">
                            <input type="checkbox" id="enable-waiting-room" class="toggle-input" checked>
                            <label for="enable-waiting-room" class="toggle-label"></label>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="waiting-room-message">Waiting Room Message</label>
                        <textarea id="waiting-room-message" class="form-control" rows="2"
                                  placeholder="Please wait to be admitted to the stream...">Please wait to be admitted to the stream...</textarea>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create moderation controls panel
     */
    createModerationControlsPanel() {
        return `
            <div class="settings-section">
                <h5><i class="fas fa-shield-alt me-2"></i>Auto Moderation</h5>
                <div class="moderation-level">
                    <label for="moderation-level">Moderation Level</label>
                    <select id="moderation-level" class="form-control">
                        <option value="low">Low - Basic filtering</option>
                        <option value="medium" selected>Medium - Standard protection</option>
                        <option value="high">High - Strict filtering</option>
                        <option value="custom">Custom - Manual configuration</option>
                    </select>
                </div>

                <div class="moderation-features">
                    <div class="feature-grid">
                        <div class="feature-item">
                            <div class="feature-info">
                                <div class="feature-title">Profanity Filter</div>
                                <div class="feature-desc">Automatically filter inappropriate language</div>
                            </div>
                            <div class="toggle-switch">
                                <input type="checkbox" id="profanity-filter" class="toggle-input" checked>
                                <label for="profanity-filter" class="toggle-label"></label>
                            </div>
                        </div>

                        <div class="feature-item">
                            <div class="feature-info">
                                <div class="feature-title">Spam Detection</div>
                                <div class="feature-desc">Detect and prevent spam messages</div>
                            </div>
                            <div class="toggle-switch">
                                <input type="checkbox" id="spam-detection" class="toggle-input" checked>
                                <label for="spam-detection" class="toggle-label"></label>
                            </div>
                        </div>

                        <div class="feature-item">
                            <div class="feature-info">
                                <div class="feature-title">Word Filter</div>
                                <div class="feature-desc">Block specific words and phrases</div>
                            </div>
                            <div class="toggle-switch">
                                <input type="checkbox" id="word-filter" class="toggle-input" checked>
                                <label for="word-filter" class="toggle-label"></label>
                            </div>
                        </div>

                        <div class="feature-item">
                            <div class="feature-info">
                                <div class="feature-title">Manual Review</div>
                                <div class="feature-desc">Require manual approval for flagged content</div>
                            </div>
                            <div class="toggle-switch">
                                <input type="checkbox" id="manual-review" class="toggle-input">
                                <label for="manual-review" class="toggle-label"></label>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label for="banned-words">Banned Words/Phrases</label>
                    <textarea id="banned-words" class="form-control" rows="3"
                              placeholder="Enter words or phrases to block, separated by commas"></textarea>
                    <small class="form-text text-muted">These words will be automatically filtered from chat</small>
                </div>
            </div>

            <div class="settings-section">
                <h5><i class="fas fa-user-shield me-2"></i>Moderator Tools</h5>
                <div class="moderator-actions">
                    <div class="action-buttons">
                        <button class="btn btn-outline-warning">
                            <i class="fas fa-volume-mute me-1"></i>Mute All
                        </button>
                        <button class="btn btn-outline-danger">
                            <i class="fas fa-ban me-1"></i>Clear Chat
                        </button>
                        <button class="btn btn-outline-info">
                            <i class="fas fa-download me-1"></i>Export Logs
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create analytics panel
     */
    createAnalyticsPanel() {
        return `
            <div class="settings-section">
                <h5><i class="fas fa-chart-line me-2"></i>Real-time Analytics</h5>
                <div class="analytics-grid">
                    <div class="analytics-card">
                        <div class="card-header">
                            <div class="card-icon">
                                <i class="fas fa-eye" style="color: #17a2b8;"></i>
                            </div>
                            <div class="card-title">Current Viewers</div>
                        </div>
                        <div class="card-value">0</div>
                        <div class="card-change positive">+0% from last stream</div>
                    </div>

                    <div class="analytics-card">
                        <div class="card-header">
                            <div class="card-icon">
                                <i class="fas fa-clock" style="color: #28a745;"></i>
                            </div>
                            <div class="card-title">Stream Duration</div>
                        </div>
                        <div class="card-value">00:00:00</div>
                        <div class="card-change">Live streaming</div>
                    </div>

                    <div class="analytics-card">
                        <div class="card-header">
                            <div class="card-icon">
                                <i class="fas fa-comments" style="color: #ffc107;"></i>
                            </div>
                            <div class="card-title">Chat Messages</div>
                        </div>
                        <div class="card-value">0</div>
                        <div class="card-change">0 messages/min</div>
                    </div>

                    <div class="analytics-card">
                        <div class="card-header">
                            <div class="card-icon">
                                <i class="fas fa-signal" style="color: #fd7e14;"></i>
                            </div>
                            <div class="card-title">Stream Quality</div>
                        </div>
                        <div class="card-value">Good</div>
                        <div class="card-change">720p @ 30fps</div>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h5><i class="fas fa-chart-bar me-2"></i>Performance Metrics</h5>
                <div class="metrics-chart">
                    <canvas id="performance-chart" width="400" height="200"></canvas>
                </div>

                <div class="metrics-summary">
                    <div class="metric-item">
                        <span class="metric-label">Average Bitrate:</span>
                        <span class="metric-value">2.5 Mbps</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Packet Loss:</span>
                        <span class="metric-value">0.1%</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Latency:</span>
                        <span class="metric-value">45ms</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">CPU Usage:</span>
                        <span class="metric-value">25%</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create security panel
     */
    createSecurityPanel() {
        return `
            <div class="settings-section">
                <h5><i class="fas fa-lock me-2"></i>Access Control</h5>
                <div class="security-options">
                    <div class="toggle-item">
                        <div class="toggle-info">
                            <div class="toggle-title">Password Protection</div>
                            <div class="toggle-description">Require password to join stream</div>
                        </div>
                        <div class="toggle-switch">
                            <input type="checkbox" id="require-password" class="toggle-input">
                            <label for="require-password" class="toggle-label"></label>
                        </div>
                    </div>

                    <div class="form-group password-field" style="display: none;">
                        <label for="stream-password">Stream Password</label>
                        <input type="password" id="stream-password" class="form-control"
                               placeholder="Enter stream password">
                    </div>

                    <div class="toggle-item">
                        <div class="toggle-info">
                            <div class="toggle-title">End-to-End Encryption</div>
                            <div class="toggle-description">Encrypt all stream data</div>
                        </div>
                        <div class="toggle-switch">
                            <input type="checkbox" id="e2e-encryption" class="toggle-input" checked>
                            <label for="e2e-encryption" class="toggle-label"></label>
                        </div>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h5><i class="fas fa-database me-2"></i>Data & Privacy</h5>
                <div class="privacy-settings">
                    <div class="form-group">
                        <label for="data-retention">Data Retention (days)</label>
                        <select id="data-retention" class="form-control">
                            <option value="7">7 days</option>
                            <option value="30" selected>30 days</option>
                            <option value="90">90 days</option>
                            <option value="365">1 year</option>
                            <option value="0">Indefinite</option>
                        </select>
                    </div>

                    <div class="toggle-item">
                        <div class="toggle-info">
                            <div class="toggle-title">Allow Recording Download</div>
                            <div class="toggle-description">Allow participants to download recordings</div>
                        </div>
                        <div class="toggle-switch">
                            <input type="checkbox" id="allow-download" class="toggle-input">
                            <label for="allow-download" class="toggle-label"></label>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create advanced settings panel
     */
    createAdvancedSettingsPanel() {
        return `
            <div class="settings-section">
                <h5><i class="fas fa-server me-2"></i>Streaming Configuration</h5>
                <div class="form-group">
                    <label for="custom-rtmp">Custom RTMP Endpoint</label>
                    <input type="url" id="custom-rtmp" class="form-control"
                           placeholder="rtmp://your-server.com/live">
                    <small class="form-text text-muted">Leave empty to use default servers</small>
                </div>

                <div class="toggle-item">
                    <div class="toggle-info">
                        <div class="toggle-title">Redundant Streaming</div>
                        <div class="toggle-description">Stream to multiple servers for reliability</div>
                    </div>
                    <div class="toggle-switch">
                        <input type="checkbox" id="redundant-streaming" class="toggle-input">
                        <label for="redundant-streaming" class="toggle-label"></label>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h5><i class="fas fa-plug me-2"></i>API & Webhooks</h5>
                <div class="api-settings">
                    <div class="toggle-item">
                        <div class="toggle-info">
                            <div class="toggle-title">Enable API Access</div>
                            <div class="toggle-description">Allow external applications to control stream</div>
                        </div>
                        <div class="toggle-switch">
                            <input type="checkbox" id="enable-api" class="toggle-input">
                            <label for="enable-api" class="toggle-label"></label>
                        </div>
                    </div>

                    <div class="toggle-item">
                        <div class="toggle-info">
                            <div class="toggle-title">Enable Webhooks</div>
                            <div class="toggle-description">Send stream events to external URL</div>
                        </div>
                        <div class="toggle-switch">
                            <input type="checkbox" id="enable-webhooks" class="toggle-input">
                            <label for="enable-webhooks" class="toggle-label"></label>
                        </div>
                    </div>

                    <div class="form-group webhook-field" style="display: none;">
                        <label for="webhook-url">Webhook URL</label>
                        <input type="url" id="webhook-url" class="form-control"
                               placeholder="https://your-server.com/webhook">
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Check if user has permission for panel
     */
    hasPermission(requiredRoles) {
        return requiredRoles.includes(this.currentUserRole);
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Panel navigation
        document.querySelectorAll('.nav-panel').forEach(panel => {
            panel.addEventListener('click', (e) => {
                const panelId = e.currentTarget.dataset.panel;
                this.showPanel(panelId);
            });
        });
        
        // Dashboard cards
        document.querySelectorAll('.dashboard-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const panelId = e.currentTarget.dataset.panel;
                this.showPanel(panelId);
            });
        });
        
        // Category navigation
        document.querySelectorAll('.nav-category').forEach(category => {
            category.addEventListener('click', (e) => {
                const categoryId = e.currentTarget.dataset.category;
                this.filterPanelsByCategory(categoryId);
            });
        });
        
        // Header controls
        document.getElementById('panel-search')?.addEventListener('input', (e) => {
            this.searchPanels(e.target.value);
        });
        
        document.getElementById('panel-minimize')?.addEventListener('click', () => {
            this.minimizePanels();
        });
        
        document.getElementById('panel-close')?.addEventListener('click', () => {
            this.closePanels();
        });
        
        // Footer controls
        document.getElementById('reset-settings')?.addEventListener('click', () => {
            this.resetSettings();
        });
        
        document.getElementById('export-settings')?.addEventListener('click', () => {
            this.exportSettings();
        });
        
        document.getElementById('save-settings')?.addEventListener('click', () => {
            this.saveSettings();
        });
    }
    
    /**
     * Show specific panel
     */
    showPanel(panelId) {
        // Hide all panels
        document.querySelectorAll('.panel-view').forEach(panel => {
            panel.classList.remove('active');
        });
        
        // Show selected panel
        const targetPanel = document.getElementById(`${panelId}-view`);
        if (targetPanel) {
            targetPanel.classList.add('active');
            
            // Update navigation
            document.querySelectorAll('.nav-panel').forEach(nav => {
                nav.classList.remove('active');
            });
            
            const navPanel = document.querySelector(`[data-panel="${panelId}"]`);
            if (navPanel) {
                navPanel.classList.add('active');
            }
            
            // Update breadcrumb
            this.updateBreadcrumb(panelId);
            
            // Track active panel
            this.activePanels.add(panelId);
        }
    }
    
    /**
     * Update breadcrumb navigation
     */
    updateBreadcrumb(panelId) {
        const panel = Object.values(this.panels).find(p => p.id === panelId);
        if (panel) {
            const breadcrumb = document.getElementById('panel-breadcrumb');
            if (breadcrumb) {
                breadcrumb.innerHTML = `
                    <span class="breadcrumb-item">
                        <a href="#" onclick="controlPanels.showDashboard()">Dashboard</a>
                    </span>
                    <span class="breadcrumb-separator">/</span>
                    <span class="breadcrumb-item active">${panel.title}</span>
                `;
            }
        }
    }
    
    /**
     * Show dashboard
     */
    showDashboard() {
        document.querySelectorAll('.panel-view').forEach(panel => {
            panel.classList.remove('active');
        });
        
        document.getElementById('dashboard-view').classList.add('active');
        
        document.querySelectorAll('.nav-panel').forEach(nav => {
            nav.classList.remove('active');
        });
        
        const breadcrumb = document.getElementById('panel-breadcrumb');
        if (breadcrumb) {
            breadcrumb.innerHTML = '<span class="breadcrumb-item active">Dashboard</span>';
        }
    }
    
    /**
     * Filter panels by category
     */
    filterPanelsByCategory(categoryId) {
        document.querySelectorAll('.nav-panel').forEach(panel => {
            const panelCategory = panel.dataset.category;
            if (panelCategory === categoryId) {
                panel.style.display = 'flex';
            } else {
                panel.style.display = 'none';
            }
        });
        
        // Update category selection
        document.querySelectorAll('.nav-category').forEach(cat => {
            cat.classList.remove('active');
        });
        
        const activeCategory = document.querySelector(`[data-category="${categoryId}"]`);
        if (activeCategory) {
            activeCategory.classList.add('active');
        }
    }
    
    /**
     * Search panels
     */
    searchPanels(query) {
        const searchTerm = query.toLowerCase();
        
        document.querySelectorAll('.nav-panel').forEach(panel => {
            const title = panel.querySelector('.panel-title').textContent.toLowerCase();
            const category = panel.querySelector('.panel-category').textContent.toLowerCase();
            
            if (title.includes(searchTerm) || category.includes(searchTerm)) {
                panel.style.display = 'flex';
            } else {
                panel.style.display = 'none';
            }
        });
        
        // Also filter dashboard cards
        document.querySelectorAll('.dashboard-card').forEach(card => {
            const title = card.querySelector('.card-title').textContent.toLowerCase();
            
            if (title.includes(searchTerm)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }
    
    /**
     * Load settings from storage
     */
    loadSettings() {
        const saved = localStorage.getItem('professionalControlPanelSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
        
        // Apply loaded settings to interface
        this.applySettingsToInterface();
    }
    
    /**
     * Save settings to storage
     */
    saveSettings() {
        // Collect current settings from interface
        this.collectSettingsFromInterface();
        
        // Save to localStorage
        localStorage.setItem('professionalControlPanelSettings', JSON.stringify(this.settings));
        
        // Notify streaming interface
        if (this.streamingInterface) {
            this.streamingInterface.updateSettings(this.settings);
        }
        
        // Trigger callback
        this.onSettingsChange(this.settings);
        
        // Show save confirmation
        this.showSaveConfirmation();
    }
    
    /**
     * Apply settings to interface
     */
    applySettingsToInterface() {
        // Stream settings
        const titleInput = document.getElementById('stream-title');
        if (titleInput) titleInput.value = this.settings.streamTitle;
        
        const descInput = document.getElementById('stream-description');
        if (descInput) descInput.value = this.settings.streamDescription;
        
        const categorySelect = document.getElementById('stream-category');
        if (categorySelect) categorySelect.value = this.settings.streamCategory;
        
        // Apply other settings...
    }
    
    /**
     * Collect settings from interface
     */
    collectSettingsFromInterface() {
        // Stream settings
        const titleInput = document.getElementById('stream-title');
        if (titleInput) this.settings.streamTitle = titleInput.value;
        
        const descInput = document.getElementById('stream-description');
        if (descInput) this.settings.streamDescription = descInput.value;
        
        const categorySelect = document.getElementById('stream-category');
        if (categorySelect) this.settings.streamCategory = categorySelect.value;
        
        // Collect other settings...
    }
    
    /**
     * Show save confirmation
     */
    showSaveConfirmation() {
        const lastSaved = document.getElementById('last-saved');
        if (lastSaved) {
            lastSaved.innerHTML = `
                <i class="fas fa-check me-1 text-success"></i>
                <span>Saved ${new Date().toLocaleTimeString()}</span>
            `;
            
            setTimeout(() => {
                lastSaved.innerHTML = `
                    <i class="fas fa-save me-1"></i>
                    <span>Auto-saved</span>
                `;
            }, 3000);
        }
    }
    
    /**
     * Reset settings to defaults
     */
    resetSettings() {
        if (confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
            // Reset to default settings
            this.settings = {
                streamTitle: '',
                streamDescription: '',
                streamCategory: 'interview',
                // ... other defaults
            };
            
            this.applySettingsToInterface();
            this.saveSettings();
        }
    }
    
    /**
     * Export settings
     */
    exportSettings() {
        const settingsData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            settings: this.settings
        };
        
        const blob = new Blob([JSON.stringify(settingsData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `streaming-settings-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    /**
     * Minimize panels
     */
    minimizePanels() {
        this.container.classList.toggle('minimized');
    }
    
    /**
     * Close panels
     */
    closePanels() {
        this.container.style.display = 'none';
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
            case 'settings_updated':
                this.settings = { ...this.settings, ...data.settings };
                this.applySettingsToInterface();
                break;
            case 'panel_action':
                this.handlePanelAction(data.action, data.payload);
                break;
        }
    }
    
    /**
     * Handle panel actions
     */
    handlePanelAction(action, payload) {
        this.onControlAction(action, payload);
    }
    
    /**
     * Public API methods
     */
    setStreamingInterface(streamingInterface) {
        this.streamingInterface = streamingInterface;
    }
    
    setWebSocket(websocket) {
        this.websocket = websocket;
        if (websocket) {
            this.attachWebSocketListeners();
        }
    }
    
    setUserInfo(userId, userRole) {
        this.currentUserId = userId;
        this.currentUserRole = userRole;
        
        // Refresh interface based on new role
        if (this.isInitialized) {
            this.createControlPanelsInterface();
            this.attachEventListeners();
        }
    }
    
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.applySettingsToInterface();
    }
    
    getSettings() {
        this.collectSettingsFromInterface();
        return { ...this.settings };
    }
    
    /**
     * Destroy the control panels
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        this.activePanels.clear();
        this.panelData.clear();
    }
}

// Add comprehensive professional control panels CSS
const professionalControlPanelsCSS = `
/* Professional Control Panels Styles */
.professional-control-panels {
    --panel-primary: #FF0000;
    --panel-background: #0a0a0a;
    --panel-surface: #1a1a1a;
    --panel-card: #2a2a2a;
    --panel-input: #3a3a3a;
    --panel-text: #ffffff;
    --panel-text-muted: #cccccc;
    --panel-border: #444444;
    --panel-success: #28a745;
    --panel-warning: #ffc107;
    --panel-danger: #dc3545;
    --panel-info: #17a2b8;

    position: relative;
    width: 100%;
    height: 100%;
    background: var(--panel-background);
    color: var(--panel-text);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    display: flex;
    flex-direction: column;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

/* Control Panel Header */
.control-panel-header {
    background: linear-gradient(135deg, var(--panel-surface) 0%, rgba(26, 26, 26, 0.95) 100%);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--panel-border);
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 70px;
}

.header-left h3 {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 600;
    color: var(--panel-text);
}

.panel-breadcrumb {
    margin-top: 4px;
    font-size: 0.85rem;
    color: var(--panel-text-muted);
}

.breadcrumb-item {
    display: inline;
}

.breadcrumb-item a {
    color: var(--panel-primary);
    text-decoration: none;
}

.breadcrumb-item a:hover {
    text-decoration: underline;
}

.breadcrumb-item.active {
    color: var(--panel-text);
}

.breadcrumb-separator {
    margin: 0 8px;
    color: var(--panel-text-muted);
}

.header-right {
    display: flex;
    align-items: center;
    gap: 12px;
}

.panel-search {
    position: relative;
}

.panel-search input {
    background: var(--panel-input);
    border: 1px solid var(--panel-border);
    color: var(--panel-text);
    padding: 8px 12px 8px 36px;
    border-radius: 8px;
    width: 250px;
    font-size: 0.9rem;
}

.panel-search input:focus {
    outline: none;
    border-color: var(--panel-primary);
    box-shadow: 0 0 0 2px rgba(255, 0, 0, 0.2);
}

.search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--panel-text-muted);
    font-size: 0.9rem;
}

.btn-icon {
    background: var(--panel-card);
    border: none;
    color: var(--panel-text);
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-icon:hover {
    background: var(--panel-primary);
    transform: scale(1.05);
}

/* Control Panel Navigation */
.control-panel-nav {
    background: var(--panel-surface);
    border-bottom: 1px solid var(--panel-border);
    padding: 16px 24px;
    display: flex;
    gap: 24px;
}

.nav-categories {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.nav-category {
    background: var(--panel-card);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    padding: 8px 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
}

.nav-category:hover,
.nav-category.active {
    background: var(--panel-primary);
    border-color: var(--panel-primary);
    color: white;
}

.category-badge {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 2px 6px;
    font-size: 0.7rem;
    min-width: 18px;
    text-align: center;
}

.nav-panels {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 200px;
    overflow-y: auto;
}

.nav-panel {
    background: var(--panel-card);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    padding: 12px 16px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 12px;
}

.nav-panel:hover,
.nav-panel.active {
    background: var(--panel-input);
    border-color: var(--panel-primary);
    transform: translateX(4px);
}

.panel-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
}

.panel-info {
    flex: 1;
}

.panel-title {
    font-weight: 600;
    color: var(--panel-text);
    margin-bottom: 2px;
}

.panel-category {
    font-size: 0.8rem;
    color: var(--panel-text-muted);
}

.panel-arrow {
    color: var(--panel-text-muted);
    transition: transform 0.2s ease;
}

.nav-panel:hover .panel-arrow {
    transform: translateX(4px);
}

/* Control Panel Content */
.control-panel-content {
    flex: 1;
    overflow: hidden;
    position: relative;
}

.panel-view {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 24px;
    overflow-y: auto;
    opacity: 0;
    transform: translateX(20px);
    transition: all 0.3s ease;
    pointer-events: none;
}

.panel-view.active {
    opacity: 1;
    transform: translateX(0);
    pointer-events: auto;
}

/* Dashboard View */
.dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
}

.dashboard-card {
    background: var(--panel-card);
    border: 1px solid var(--panel-border);
    border-radius: 12px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.dashboard-card:hover {
    background: var(--panel-input);
    border-color: var(--panel-primary);
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(255, 0, 0, 0.1);
}

.card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
}

.card-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.3rem;
}

.card-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--panel-text);
}

.card-content {
    margin-bottom: 16px;
}

.card-description {
    color: var(--panel-text-muted);
    font-size: 0.9rem;
    line-height: 1.4;
    margin-bottom: 12px;
}

.card-stats {
    font-size: 0.85rem;
    color: var(--panel-text-muted);
}

.stat-item {
    display: inline-block;
    margin-right: 16px;
}

.card-footer {
    display: flex;
    justify-content: flex-end;
}

/* Panel Header */
.panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--panel-border);
}

.panel-title {
    font-size: 1.3rem;
    font-weight: 600;
    color: var(--panel-text);
}

.panel-actions {
    display: flex;
    gap: 8px;
}

/* Panel Body */
.panel-body {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

/* Settings Sections */
.settings-section {
    background: var(--panel-card);
    border: 1px solid var(--panel-border);
    border-radius: 12px;
    padding: 20px;
}

.settings-section h5 {
    margin: 0 0 16px 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--panel-text);
    display: flex;
    align-items: center;
}

.settings-section h6 {
    margin: 16px 0 12px 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--panel-text);
}

/* Form Controls */
.form-group {
    margin-bottom: 16px;
}

.form-group label {
    display: block;
    margin-bottom: 6px;
    font-weight: 500;
    color: var(--panel-text);
    font-size: 0.9rem;
}

.form-control {
    background: var(--panel-input);
    border: 1px solid var(--panel-border);
    color: var(--panel-text);
    padding: 10px 12px;
    border-radius: 8px;
    width: 100%;
    font-size: 0.9rem;
    transition: all 0.2s ease;
}

.form-control:focus {
    outline: none;
    border-color: var(--panel-primary);
    box-shadow: 0 0 0 2px rgba(255, 0, 0, 0.2);
}

.form-control::placeholder {
    color: var(--panel-text-muted);
}

.form-text {
    font-size: 0.8rem;
    color: var(--panel-text-muted);
    margin-top: 4px;
}

/* Range Inputs */
.form-range {
    width: 100%;
    height: 6px;
    background: var(--panel-border);
    border-radius: 3px;
    outline: none;
    -webkit-appearance: none;
}

.form-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    background: var(--panel-primary);
    border-radius: 50%;
    cursor: pointer;
}

.form-range::-moz-range-thumb {
    width: 18px;
    height: 18px;
    background: var(--panel-primary);
    border-radius: 50%;
    cursor: pointer;
    border: none;
}

.range-value {
    text-align: center;
    margin-top: 8px;
    font-size: 0.85rem;
    color: var(--panel-text-muted);
}

/* Checkboxes */
.form-check {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.form-check-input {
    width: 16px;
    height: 16px;
    background: var(--panel-input);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    cursor: pointer;
}

.form-check-input:checked {
    background: var(--panel-primary);
    border-color: var(--panel-primary);
}

.form-check-label {
    font-size: 0.9rem;
    color: var(--panel-text);
    cursor: pointer;
}

/* Toggle Switches */
.toggle-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid var(--panel-border);
}

.toggle-item:last-child {
    border-bottom: none;
}

.toggle-info {
    flex: 1;
}

.toggle-title {
    font-weight: 500;
    color: var(--panel-text);
    margin-bottom: 2px;
}

.toggle-description {
    font-size: 0.85rem;
    color: var(--panel-text-muted);
}

.toggle-switch {
    position: relative;
    width: 44px;
    height: 24px;
}

.toggle-input {
    opacity: 0;
    width: 0;
    height: 0;
}

.toggle-label {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--panel-border);
    border-radius: 24px;
    transition: all 0.2s ease;
}

.toggle-label:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background: white;
    border-radius: 50%;
    transition: all 0.2s ease;
}

.toggle-input:checked + .toggle-label {
    background: var(--panel-primary);
}

.toggle-input:checked + .toggle-label:before {
    transform: translateX(20px);
}

/* Feature Grids */
.feature-toggles,
.feature-grid,
.permission-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.feature-item,
.permission-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: var(--panel-input);
    border-radius: 8px;
    border: 1px solid var(--panel-border);
}

.feature-info,
.permission-info {
    flex: 1;
}

.feature-title,
.permission-title {
    font-weight: 500;
    color: var(--panel-text);
    margin-bottom: 2px;
}

.feature-desc,
.permission-desc {
    font-size: 0.85rem;
    color: var(--panel-text-muted);
}

/* Storage Info */
.storage-info {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.storage-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.storage-label {
    font-weight: 500;
    color: var(--panel-text);
    font-size: 0.9rem;
}

.storage-bar {
    width: 100%;
    height: 8px;
    background: var(--panel-border);
    border-radius: 4px;
    overflow: hidden;
}

.storage-progress {
    height: 100%;
    background: linear-gradient(90deg, var(--panel-success) 0%, var(--panel-warning) 70%, var(--panel-danger) 100%);
    border-radius: 4px;
    transition: width 0.3s ease;
}

.storage-text {
    font-size: 0.85rem;
    color: var(--panel-text-muted);
}

/* Analytics */
.analytics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
}

.analytics-card {
    background: var(--panel-input);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    padding: 16px;
}

.analytics-card .card-header {
    margin-bottom: 12px;
}

.analytics-card .card-icon {
    width: 32px;
    height: 32px;
    font-size: 1.1rem;
}

.analytics-card .card-title {
    font-size: 0.9rem;
    font-weight: 500;
}

.card-value {
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--panel-text);
    margin-bottom: 4px;
}

.card-change {
    font-size: 0.8rem;
    color: var(--panel-text-muted);
}

.card-change.positive {
    color: var(--panel-success);
}

.card-change.negative {
    color: var(--panel-danger);
}

/* Metrics */
.metrics-chart {
    background: var(--panel-input);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
}

.metrics-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
}

.metric-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--panel-input);
    border-radius: 6px;
    font-size: 0.85rem;
}

.metric-label {
    color: var(--panel-text-muted);
}

.metric-value {
    color: var(--panel-text);
    font-weight: 600;
}

/* Buttons */
.btn {
    background: var(--panel-card);
    border: 1px solid var(--panel-border);
    color: var(--panel-text);
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9rem;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    text-decoration: none;
}

.btn:hover {
    background: var(--panel-input);
    transform: translateY(-1px);
}

.btn-primary {
    background: var(--panel-primary);
    border-color: var(--panel-primary);
    color: white;
}

.btn-primary:hover {
    background: #cc0000;
    border-color: #cc0000;
}

.btn-outline-primary {
    background: transparent;
    border-color: var(--panel-primary);
    color: var(--panel-primary);
}

.btn-outline-primary:hover {
    background: var(--panel-primary);
    color: white;
}

.btn-outline-secondary {
    background: transparent;
    border-color: var(--panel-border);
    color: var(--panel-text-muted);
}

.btn-outline-secondary:hover {
    background: var(--panel-card);
    color: var(--panel-text);
}

.btn-outline-warning {
    background: transparent;
    border-color: var(--panel-warning);
    color: var(--panel-warning);
}

.btn-outline-warning:hover {
    background: var(--panel-warning);
    color: #000;
}

.btn-outline-danger {
    background: transparent;
    border-color: var(--panel-danger);
    color: var(--panel-danger);
}

.btn-outline-danger:hover {
    background: var(--panel-danger);
    color: white;
}

.btn-outline-info {
    background: transparent;
    border-color: var(--panel-info);
    color: var(--panel-info);
}

.btn-outline-info:hover {
    background: var(--panel-info);
    color: white;
}

.btn-sm {
    padding: 6px 12px;
    font-size: 0.8rem;
}

/* Action Buttons */
.action-buttons {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}

/* Control Panel Footer */
.control-panel-footer {
    background: var(--panel-surface);
    border-top: 1px solid var(--panel-border);
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.footer-left {
    display: flex;
    align-items: center;
    gap: 24px;
}

.connection-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
}

.status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
}

.status-indicator.connected {
    background: var(--panel-success);
    animation: pulse 2s infinite;
}

.status-indicator.disconnected {
    background: var(--panel-danger);
}

.last-saved {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.85rem;
    color: var(--panel-text-muted);
}

.footer-right {
    display: flex;
    gap: 12px;
}

/* Responsive Design */
@media (max-width: 1200px) {
    .control-panel-nav {
        flex-direction: column;
        gap: 16px;
    }

    .nav-panels {
        max-height: 150px;
    }

    .dashboard-grid {
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    }
}

@media (max-width: 768px) {
    .control-panel-header {
        padding: 12px 16px;
        flex-direction: column;
        gap: 12px;
        align-items: stretch;
    }

    .header-right {
        justify-content: space-between;
    }

    .panel-search input {
        width: 200px;
    }

    .control-panel-nav {
        padding: 12px 16px;
    }

    .nav-categories {
        justify-content: center;
    }

    .panel-view {
        padding: 16px;
    }

    .dashboard-grid {
        grid-template-columns: 1fr;
    }

    .analytics-grid {
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    }

    .metrics-summary {
        grid-template-columns: 1fr;
    }

    .control-panel-footer {
        padding: 12px 16px;
        flex-direction: column;
        gap: 12px;
        align-items: stretch;
    }

    .footer-left,
    .footer-right {
        justify-content: center;
    }
}

@media (max-width: 480px) {
    .control-panel-header h3 {
        font-size: 1.1rem;
    }

    .panel-search input {
        width: 150px;
    }

    .nav-category {
        font-size: 0.8rem;
        padding: 6px 10px;
    }

    .nav-panel {
        padding: 10px 12px;
    }

    .panel-title {
        font-size: 1.1rem;
    }

    .settings-section {
        padding: 16px;
    }

    .analytics-grid {
        grid-template-columns: 1fr;
    }

    .action-buttons {
        flex-direction: column;
    }
}

/* Minimized State */
.professional-control-panels.minimized {
    height: 60px;
    overflow: hidden;
}

.professional-control-panels.minimized .control-panel-nav,
.professional-control-panels.minimized .control-panel-content,
.professional-control-panels.minimized .control-panel-footer {
    display: none;
}

/* Animation Keyframes */
@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

/* Custom Scrollbars */
.nav-panels::-webkit-scrollbar,
.panel-view::-webkit-scrollbar {
    width: 6px;
}

.nav-panels::-webkit-scrollbar-track,
.panel-view::-webkit-scrollbar-track {
    background: var(--panel-card);
}

.nav-panels::-webkit-scrollbar-thumb,
.panel-view::-webkit-scrollbar-thumb {
    background: var(--panel-border);
    border-radius: 3px;
}

.nav-panels::-webkit-scrollbar-thumb:hover,
.panel-view::-webkit-scrollbar-thumb:hover {
    background: var(--panel-text-muted);
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
    .professional-control-panels {
        --panel-border: #ffffff;
        --panel-text-muted: #ffffff;
    }
}
`;

// Inject CSS into document
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = professionalControlPanelsCSS;
    document.head.appendChild(styleSheet);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProfessionalControlPanels;
} else if (typeof window !== 'undefined') {
    window.ProfessionalControlPanels = ProfessionalControlPanels;
}
