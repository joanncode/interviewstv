/**
 * Social Media Streaming Demo
 * 
 * Handles the frontend interface for social media streaming integration
 * including platform connections, multi-platform streaming, and analytics.
 */
class SocialMediaStreamingDemo {
    constructor() {
        this.apiBaseUrl = '/api/social-streaming';
        this.platforms = [];
        this.connections = [];
        this.activeStreams = [];
        this.currentSession = null;
        this.selectedPlatforms = [];
        this.chatMessages = [];
        this.analytics = {};
    }

    /**
     * Initialize the demo
     */
    async init() {
        console.log('Initializing Social Media Streaming Demo...');
        
        this.setupEventListeners();
        await this.loadPlatforms();
        await this.loadConnections();
        this.updateDashboardMetrics();
        
        // Set default scheduled time (30 minutes from now)
        const defaultTime = new Date();
        defaultTime.setMinutes(defaultTime.getMinutes() + 30);
        document.getElementById('scheduledStartTime').value = this.formatDateTimeLocal(defaultTime);
        
        console.log('Social Media Streaming Demo initialized successfully');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                this.handleTabSwitch(e.target.getAttribute('data-bs-target'));
            });
        });

        // Create stream form
        document.getElementById('createStreamForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createMultiPlatformStream();
        });

        // OAuth modal proceed button
        document.getElementById('proceedOAuthBtn').addEventListener('click', () => {
            this.proceedWithOAuth();
        });

        // Platform selection checkboxes (will be set up after platforms load)
        // Stream control buttons (will be set up dynamically)
    }

    /**
     * Load available platforms
     */
    async loadPlatforms() {
        try {
            this.showLoading('platformsContainer');
            
            const response = await fetch(`${this.apiBaseUrl}/platforms`);
            const result = await response.json();
            
            if (result.success) {
                this.platforms = result.data.platforms;
                this.renderPlatforms();
                this.updatePlatformSelection();
                this.updateDashboardMetrics();
            } else {
                throw new Error(result.message || 'Failed to load platforms');
            }
        } catch (error) {
            console.error('Failed to load platforms:', error);
            this.showError('platformsContainer', 'Failed to load platforms: ' + error.message);
        }
    }

    /**
     * Render platforms
     */
    renderPlatforms() {
        const container = document.getElementById('platformsContainer');
        
        if (this.platforms.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-4">
                        <i class="fas fa-plug fa-3x text-muted mb-3"></i>
                        <p class="text-muted">No platforms available</p>
                    </div>
                </div>
            `;
            return;
        }

        const platformsHTML = this.platforms.map(platform => {
            const iconClass = this.getPlatformIconClass(platform.platform_type);
            const isConnected = this.connections.some(c => c.platform_id === platform.platform_id && c.is_active);
            
            return `
                <div class="col-md-4 col-lg-3 mb-3">
                    <div class="card platform-card h-100" data-platform-id="${platform.platform_id}">
                        <div class="card-body text-center">
                            <i class="fas ${iconClass} platform-icon ${platform.platform_type}"></i>
                            <h5 class="card-title">${platform.platform_name}</h5>
                            <p class="card-text text-muted">
                                ${platform.supports_live_streaming ? '<i class="fas fa-video text-success me-1"></i>Live Streaming' : ''}
                                ${platform.supports_chat ? '<i class="fas fa-comments text-info me-1"></i>Chat' : ''}
                                ${platform.supports_analytics ? '<i class="fas fa-chart-line text-warning me-1"></i>Analytics' : ''}
                            </p>
                            <div class="mb-2">
                                <small class="text-muted">
                                    Max Duration: ${platform.max_stream_duration_hours}h<br>
                                    Max Bitrate: ${platform.max_bitrate} kbps
                                </small>
                            </div>
                            <div class="mb-2">
                                <span class="badge ${isConnected ? 'bg-success' : 'bg-secondary'}">
                                    ${isConnected ? 'Connected' : 'Not Connected'}
                                </span>
                            </div>
                            <button class="btn ${isConnected ? 'btn-outline-danger' : 'btn-primary'} btn-sm w-100" 
                                    onclick="socialStreamingDemo.${isConnected ? 'disconnect' : 'connect'}Platform('${platform.platform_id}')">
                                <i class="fas ${isConnected ? 'fa-unlink' : 'fa-link'} me-1"></i>
                                ${isConnected ? 'Disconnect' : 'Connect'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = platformsHTML;
    }

    /**
     * Connect to platform
     */
    async connectPlatform(platformId) {
        try {
            const platform = this.platforms.find(p => p.platform_id === platformId);
            if (!platform) {
                throw new Error('Platform not found');
            }

            // Show OAuth modal
            document.getElementById('oauthPlatformName').textContent = platform.platform_name;
            document.getElementById('oauthPlatformName2').textContent = platform.platform_name;
            
            // Store platform ID for OAuth flow
            this.currentOAuthPlatform = platformId;
            
            const modal = new bootstrap.Modal(document.getElementById('oauthModal'));
            modal.show();
        } catch (error) {
            console.error('Failed to connect platform:', error);
            this.showAlert('Failed to connect platform: ' + error.message, 'danger');
        }
    }

    /**
     * Proceed with OAuth authorization
     */
    async proceedWithOAuth() {
        try {
            if (!this.currentOAuthPlatform) {
                throw new Error('No platform selected');
            }

            const response = await fetch(`${this.apiBaseUrl}/oauth/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    platform_id: this.currentOAuthPlatform,
                    redirect_uri: window.location.origin + '/oauth/callback'
                })
            });

            const result = await response.json();

            if (result.success) {
                // Close modal and redirect to OAuth URL
                const modal = bootstrap.Modal.getInstance(document.getElementById('oauthModal'));
                modal.hide();
                
                // In a real implementation, this would open a popup or redirect
                this.showAlert('OAuth flow would redirect to: ' + result.data.auth_url, 'info');
                
                // For demo purposes, simulate successful connection
                setTimeout(() => {
                    this.simulateSuccessfulConnection(this.currentOAuthPlatform);
                }, 2000);
            } else {
                throw new Error(result.message || 'Failed to start OAuth flow');
            }
        } catch (error) {
            console.error('Failed to start OAuth:', error);
            this.showAlert('Failed to start OAuth: ' + error.message, 'danger');
        }
    }

    /**
     * Simulate successful connection (for demo)
     */
    simulateSuccessfulConnection(platformId) {
        const platform = this.platforms.find(p => p.platform_id === platformId);
        if (!platform) return;

        // Add simulated connection
        const connection = {
            connection_id: 'conn_' + platformId + '_demo',
            platform_id: platformId,
            platform_name: platform.platform_name,
            username: 'interviews_tv_demo',
            display_name: 'Interviews.tv Demo',
            channel_name: 'Interviews.tv Channel',
            is_active: true,
            streaming_enabled: true,
            total_streams: Math.floor(Math.random() * 50),
            total_views: Math.floor(Math.random() * 10000),
            subscriber_count: Math.floor(Math.random() * 5000),
            created_at: new Date().toISOString()
        };

        this.connections.push(connection);
        this.renderPlatforms();
        this.renderConnections();
        this.updateDashboardMetrics();
        
        this.showAlert(`Successfully connected to ${platform.platform_name}!`, 'success');
    }

    /**
     * Disconnect platform
     */
    async disconnectPlatform(platformId) {
        try {
            const connection = this.connections.find(c => c.platform_id === platformId);
            if (!connection) {
                throw new Error('Connection not found');
            }

            if (!confirm(`Are you sure you want to disconnect from ${connection.platform_name}?`)) {
                return;
            }

            // For demo purposes, simulate disconnection
            this.connections = this.connections.filter(c => c.platform_id !== platformId);
            this.renderPlatforms();
            this.renderConnections();
            this.updateDashboardMetrics();
            
            this.showAlert(`Disconnected from ${connection.platform_name}`, 'success');
        } catch (error) {
            console.error('Failed to disconnect platform:', error);
            this.showAlert('Failed to disconnect platform: ' + error.message, 'danger');
        }
    }

    /**
     * Load user connections
     */
    async loadConnections() {
        try {
            // For demo purposes, load demo data
            const response = await fetch(`${this.apiBaseUrl}/demo-data`);
            const result = await response.json();
            
            if (result.success) {
                this.connections = result.data.sample_connections || [];
                this.renderConnections();
                this.updateDashboardMetrics();
            } else {
                throw new Error(result.message || 'Failed to load connections');
            }
        } catch (error) {
            console.error('Failed to load connections:', error);
            // Continue with empty connections for demo
            this.connections = [];
            this.renderConnections();
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
                    <p class="text-muted">No connected platforms</p>
                    <p class="text-muted">Go to the Platforms tab to connect your social media accounts</p>
                </div>
            `;
            return;
        }

        const connectionsHTML = this.connections.map(connection => {
            const iconClass = this.getPlatformIconClass(connection.platform_id);
            const statusClass = connection.is_active ? 'status-active' : 'status-inactive';
            
            return `
                <div class="col-md-6 col-lg-4 mb-3">
                    <div class="card connection-card h-100">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <div>
                                    <h6 class="card-title">
                                        <i class="fas ${iconClass} ${connection.platform_id} me-2"></i>
                                        ${connection.platform_name}
                                    </h6>
                                    <p class="card-text text-muted mb-1">@${connection.username}</p>
                                    <p class="card-text text-muted">${connection.display_name}</p>
                                </div>
                                <span class="status-indicator ${statusClass}"></span>
                            </div>
                            
                            <div class="row text-center mb-3">
                                <div class="col-4">
                                    <div class="metric-value" style="font-size: 1.2rem;">${connection.total_streams}</div>
                                    <div class="metric-label" style="font-size: 0.8rem;">Streams</div>
                                </div>
                                <div class="col-4">
                                    <div class="metric-value" style="font-size: 1.2rem;">${this.formatNumber(connection.total_views)}</div>
                                    <div class="metric-label" style="font-size: 0.8rem;">Views</div>
                                </div>
                                <div class="col-4">
                                    <div class="metric-value" style="font-size: 1.2rem;">${this.formatNumber(connection.subscriber_count)}</div>
                                    <div class="metric-label" style="font-size: 0.8rem;">Followers</div>
                                </div>
                            </div>
                            
                            <div class="d-flex gap-2">
                                <button class="btn btn-outline-primary btn-sm flex-fill" 
                                        onclick="socialStreamingDemo.viewConnectionDetails('${connection.connection_id}')">
                                    <i class="fas fa-eye me-1"></i>
                                    Details
                                </button>
                                <button class="btn btn-outline-danger btn-sm" 
                                        onclick="socialStreamingDemo.disconnectPlatform('${connection.platform_id}')">
                                    <i class="fas fa-unlink me-1"></i>
                                    Disconnect
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = connectionsHTML;
    }

    /**
     * Update platform selection checkboxes
     */
    updatePlatformSelection() {
        const container = document.getElementById('platformSelection');

        const connectedPlatforms = this.connections.filter(c => c.is_active && c.streaming_enabled);

        if (connectedPlatforms.length === 0) {
            container.innerHTML = `
                <div class="text-center py-3">
                    <i class="fas fa-info-circle text-muted me-2"></i>
                    <span class="text-muted">Connect platforms first to enable streaming</span>
                </div>
            `;
            return;
        }

        const checkboxesHTML = connectedPlatforms.map(connection => {
            const iconClass = this.getPlatformIconClass(connection.platform_id);
            return `
                <div class="form-check">
                    <input class="form-check-input platform-checkbox" type="checkbox"
                           value="${connection.platform_id}" id="platform_${connection.platform_id}" checked>
                    <label class="form-check-label" for="platform_${connection.platform_id}">
                        <i class="fas ${iconClass} ${connection.platform_id} me-2"></i>
                        ${connection.platform_name} (@${connection.username})
                    </label>
                </div>
            `;
        }).join('');

        container.innerHTML = checkboxesHTML;
    }

    /**
     * Create multi-platform stream
     */
    async createMultiPlatformStream() {
        try {
            const form = document.getElementById('createStreamForm');
            const formData = new FormData(form);

            // Get selected platforms
            const selectedPlatforms = Array.from(document.querySelectorAll('.platform-checkbox:checked'))
                .map(cb => cb.value);

            if (selectedPlatforms.length === 0) {
                this.showAlert('Please select at least one platform', 'warning');
                return;
            }

            // Get tags
            const tagsInput = document.getElementById('streamTags').value;
            const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

            const streamData = {
                title: document.getElementById('streamTitle').value,
                description: document.getElementById('streamDescription').value,
                category: document.getElementById('streamCategory').value,
                tags: tags,
                scheduled_start_time: document.getElementById('scheduledStartTime').value,
                selected_platforms: selectedPlatforms,
                chat_enabled: document.getElementById('chatEnabled').checked,
                recording_enabled: document.getElementById('recordingEnabled').checked
            };

            // For demo purposes, simulate stream creation
            const sessionId = 'session_' + Date.now();
            this.currentSession = {
                session_id: sessionId,
                title: streamData.title,
                description: streamData.description,
                status: 'scheduled',
                platforms: selectedPlatforms.map(platformId => {
                    const connection = this.connections.find(c => c.platform_id === platformId);
                    return {
                        platform_id: platformId,
                        platform_name: connection.platform_name,
                        status: 'scheduled'
                    };
                }),
                created_at: new Date().toISOString()
            };

            this.showAlert('Multi-platform stream created successfully!', 'success');
            this.renderStreamControl();
            form.reset();
            this.updatePlatformSelection(); // Reset checkboxes

        } catch (error) {
            console.error('Failed to create stream:', error);
            this.showAlert('Failed to create stream: ' + error.message, 'danger');
        }
    }

    /**
     * Render stream control interface
     */
    renderStreamControl() {
        const container = document.getElementById('streamControlContainer');

        if (!this.currentSession) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-info-circle fa-3x text-muted mb-3"></i>
                    <p class="text-muted">Create a stream session to access controls</p>
                </div>
            `;
            return;
        }

        const session = this.currentSession;
        const isLive = session.status === 'live';
        const isScheduled = session.status === 'scheduled';

        const controlHTML = `
            <div class="stream-session-info mb-4">
                <h6 class="mb-2">${session.title}</h6>
                <p class="text-muted mb-2">${session.description}</p>
                <div class="d-flex align-items-center mb-3">
                    <span class="status-indicator ${this.getStatusClass(session.status)}"></span>
                    <span class="text-capitalize">${session.status}</span>
                </div>

                <div class="platforms-status mb-3">
                    <h6 class="mb-2">Platform Status:</h6>
                    ${session.platforms.map(platform => `
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span>
                                <i class="fas ${this.getPlatformIconClass(platform.platform_id)} ${platform.platform_id} me-2"></i>
                                ${platform.platform_name}
                            </span>
                            <span class="badge ${platform.status === 'live' ? 'bg-success' : platform.status === 'scheduled' ? 'bg-warning' : 'bg-secondary'}">
                                ${platform.status}
                            </span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="stream-controls">
                ${isScheduled ? `
                    <button class="btn btn-success w-100 mb-2" onclick="socialStreamingDemo.startStream()">
                        <i class="fas fa-play me-2"></i>
                        Start Multi-Platform Stream
                    </button>
                ` : ''}

                ${isLive ? `
                    <button class="btn btn-danger w-100 mb-2" onclick="socialStreamingDemo.stopStream()">
                        <i class="fas fa-stop me-2"></i>
                        Stop All Streams
                    </button>
                ` : ''}

                <button class="btn btn-outline-primary w-100 mb-2" onclick="socialStreamingDemo.viewStreamDetails()">
                    <i class="fas fa-info-circle me-2"></i>
                    View Details
                </button>

                <button class="btn btn-outline-secondary w-100" onclick="socialStreamingDemo.resetSession()">
                    <i class="fas fa-times me-2"></i>
                    Cancel Session
                </button>
            </div>
        `;

        container.innerHTML = controlHTML;
    }

    /**
     * Start streaming session
     */
    async startStream() {
        try {
            if (!this.currentSession) {
                throw new Error('No active session');
            }

            // Simulate starting streams
            this.currentSession.status = 'live';
            this.currentSession.platforms.forEach(platform => {
                platform.status = 'live';
                platform.viewer_count = Math.floor(Math.random() * 100) + 10;
            });

            this.renderStreamControl();
            this.renderActiveStreams();
            this.updateDashboardMetrics();

            this.showAlert('Multi-platform stream started successfully!', 'success');

            // Simulate viewer updates
            this.startViewerSimulation();

        } catch (error) {
            console.error('Failed to start stream:', error);
            this.showAlert('Failed to start stream: ' + error.message, 'danger');
        }
    }

    /**
     * Stop streaming session
     */
    async stopStream() {
        try {
            if (!this.currentSession) {
                throw new Error('No active session');
            }

            this.currentSession.status = 'ended';
            this.currentSession.platforms.forEach(platform => {
                platform.status = 'ended';
            });

            this.renderStreamControl();
            this.renderActiveStreams();
            this.updateDashboardMetrics();

            this.showAlert('Multi-platform stream stopped', 'success');

            // Stop viewer simulation
            if (this.viewerSimulationInterval) {
                clearInterval(this.viewerSimulationInterval);
            }

        } catch (error) {
            console.error('Failed to stop stream:', error);
            this.showAlert('Failed to stop stream: ' + error.message, 'danger');
        }
    }

    /**
     * Reset session
     */
    resetSession() {
        if (this.currentSession && this.currentSession.status === 'live') {
            if (!confirm('This will stop the live stream. Are you sure?')) {
                return;
            }
        }

        this.currentSession = null;
        this.renderStreamControl();
        this.renderActiveStreams();

        if (this.viewerSimulationInterval) {
            clearInterval(this.viewerSimulationInterval);
        }

        this.showAlert('Session reset', 'info');
    }

    /**
     * Render active streams
     */
    renderActiveStreams() {
        const container = document.getElementById('activeStreamsContainer');

        if (!this.currentSession || this.currentSession.status !== 'live') {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-stream fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No active streams</p>
                </div>
            `;
            return;
        }

        const session = this.currentSession;
        const streamHTML = `
            <div class="stream-card card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h6 class="card-title">${session.title}</h6>
                            <p class="text-muted mb-1">${session.description}</p>
                            <small class="text-muted">Started: ${this.formatDate(session.created_at)}</small>
                        </div>
                        <span class="badge bg-danger">
                            <i class="fas fa-circle me-1"></i>
                            LIVE
                        </span>
                    </div>

                    <div class="row">
                        ${session.platforms.map(platform => `
                            <div class="col-md-6 mb-2">
                                <div class="d-flex justify-content-between align-items-center">
                                    <span>
                                        <i class="fas ${this.getPlatformIconClass(platform.platform_id)} ${platform.platform_id} me-2"></i>
                                        ${platform.platform_name}
                                    </span>
                                    <span class="text-primary">${platform.viewer_count || 0} viewers</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = streamHTML;
    }

    /**
     * Start viewer count simulation
     */
    startViewerSimulation() {
        this.viewerSimulationInterval = setInterval(() => {
            if (this.currentSession && this.currentSession.status === 'live') {
                this.currentSession.platforms.forEach(platform => {
                    // Simulate viewer count changes
                    const change = Math.floor(Math.random() * 10) - 5; // -5 to +5
                    platform.viewer_count = Math.max(1, (platform.viewer_count || 10) + change);
                });

                this.renderActiveStreams();
                this.updateDashboardMetrics();
            }
        }, 5000); // Update every 5 seconds
    }

    /**
     * Update dashboard metrics
     */
    updateDashboardMetrics() {
        document.getElementById('totalPlatforms').textContent = this.platforms.length;
        document.getElementById('connectedPlatforms').textContent = this.connections.filter(c => c.is_active).length;
        document.getElementById('activeStreams').textContent = this.currentSession && this.currentSession.status === 'live' ? 1 : 0;

        const totalViewers = this.currentSession && this.currentSession.status === 'live'
            ? this.currentSession.platforms.reduce((sum, p) => sum + (p.viewer_count || 0), 0)
            : 0;
        document.getElementById('totalViewers').textContent = totalViewers;
    }

    /**
     * Handle tab switching
     */
    handleTabSwitch(tabId) {
        switch (tabId) {
            case '#connections':
                this.loadConnections();
                break;
            case '#streaming':
                this.updatePlatformSelection();
                this.renderActiveStreams();
                break;
            case '#analytics':
                this.loadAnalytics();
                break;
            case '#chat':
                this.loadChatMessages();
                break;
        }
    }

    /**
     * Load analytics (demo data)
     */
    async loadAnalytics() {
        try {
            // Simulate analytics data
            const analytics = {
                total_streams: 45,
                total_views: 12847,
                total_watch_time: 156.7,
                total_engagement: 892,
                platform_breakdown: {
                    'YouTube': { views: 7654, engagement: 523 },
                    'Facebook': { views: 3421, engagement: 234 },
                    'Twitch': { views: 1772, engagement: 135 }
                }
            };

            document.getElementById('totalStreams').textContent = analytics.total_streams;
            document.getElementById('totalViews').textContent = this.formatNumber(analytics.total_views);
            document.getElementById('totalWatchTime').textContent = analytics.total_watch_time + 'h';
            document.getElementById('totalEngagement').textContent = analytics.total_engagement;

            // Render platform breakdown
            this.renderPlatformBreakdown(analytics.platform_breakdown);
            this.renderRecentActivity();
        } catch (error) {
            console.error('Failed to load analytics:', error);
        }
    }

    /**
     * Render platform breakdown
     */
    renderPlatformBreakdown(breakdown) {
        const container = document.getElementById('platformBreakdown');

        const breakdownHTML = Object.entries(breakdown).map(([platform, data]) => {
            const iconClass = this.getPlatformIconClass(platform.toLowerCase());
            return `
                <div class="d-flex justify-content-between align-items-center mb-3 p-3 border rounded">
                    <div>
                        <i class="fas ${iconClass} ${platform.toLowerCase()} me-2"></i>
                        <strong>${platform}</strong>
                    </div>
                    <div class="text-end">
                        <div class="text-primary">${this.formatNumber(data.views)} views</div>
                        <div class="text-muted">${data.engagement} engagements</div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = breakdownHTML;
    }

    /**
     * Render recent activity
     */
    renderRecentActivity() {
        const container = document.getElementById('recentActivity');

        const activities = [
            { action: 'Stream started', platform: 'YouTube', time: '2 hours ago' },
            { action: 'New follower', platform: 'Facebook', time: '3 hours ago' },
            { action: 'Stream ended', platform: 'Twitch', time: '5 hours ago' },
            { action: 'Chat message', platform: 'YouTube', time: '6 hours ago' }
        ];

        const activityHTML = activities.map(activity => `
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 border-bottom">
                <div>
                    <div class="fw-bold">${activity.action}</div>
                    <small class="text-muted">${activity.platform}</small>
                </div>
                <small class="text-muted">${activity.time}</small>
            </div>
        `).join('');

        container.innerHTML = activityHTML;
    }

    /**
     * Load chat messages (demo)
     */
    loadChatMessages() {
        const container = document.getElementById('chatMessagesContainer');

        const messages = [
            { username: 'TechEnthusiast', message: 'Great interview questions!', platform: 'YouTube', time: '2 min ago' },
            { username: 'CareerSeeker', message: 'Very helpful tips', platform: 'Facebook', time: '3 min ago' },
            { username: 'DevMaster', message: 'Can you share the resources?', platform: 'Twitch', time: '5 min ago' },
            { username: 'StudentLife', message: 'Thanks for the insights!', platform: 'YouTube', time: '7 min ago' }
        ];

        const messagesHTML = messages.map(msg => `
            <div class="chat-message">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <span class="chat-username">${msg.username}</span>
                        <small class="text-muted ms-2">${msg.platform}</small>
                    </div>
                    <small class="text-muted">${msg.time}</small>
                </div>
                <div class="mt-1">${msg.message}</div>
            </div>
        `).join('');

        container.innerHTML = messagesHTML;

        // Update chat statistics
        document.getElementById('totalChatMessages').textContent = messages.length;
        document.getElementById('activeChatters').textContent = new Set(messages.map(m => m.username)).size;
        document.getElementById('messagesPerMinute').textContent = Math.floor(messages.length / 10);
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Get platform icon class
     */
    getPlatformIconClass(platformType) {
        const iconMap = {
            'youtube': 'fa-youtube',
            'facebook': 'fa-facebook',
            'twitch': 'fa-twitch',
            'linkedin': 'fa-linkedin',
            'twitter': 'fa-twitter',
            'x': 'fa-x-twitter'
        };
        return iconMap[platformType] || 'fa-share-alt';
    }

    /**
     * Get status CSS class
     */
    getStatusClass(status) {
        const statusClasses = {
            'live': 'status-streaming',
            'scheduled': 'status-active',
            'ended': 'status-inactive',
            'failed': 'status-error'
        };
        return statusClasses[status] || 'status-inactive';
    }

    /**
     * Format number with K/M suffixes
     */
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    /**
     * Format date for display
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
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

    /**
     * View connection details (placeholder)
     */
    viewConnectionDetails(connectionId) {
        const connection = this.connections.find(c => c.connection_id === connectionId);
        if (connection) {
            this.showAlert(`Connection details for ${connection.platform_name}: @${connection.username}`, 'info');
        }
    }

    /**
     * View stream details (placeholder)
     */
    viewStreamDetails() {
        if (this.currentSession) {
            const modal = new bootstrap.Modal(document.getElementById('streamDetailsModal'));
            document.getElementById('streamDetailsContent').innerHTML = `
                <h6>Session: ${this.currentSession.title}</h6>
                <p><strong>Status:</strong> ${this.currentSession.status}</p>
                <p><strong>Platforms:</strong> ${this.currentSession.platforms.length}</p>
                <p><strong>Created:</strong> ${this.formatDate(this.currentSession.created_at)}</p>
            `;
            modal.show();
        }
    }
}

// Export for global access
window.SocialMediaStreamingDemo = SocialMediaStreamingDemo;
