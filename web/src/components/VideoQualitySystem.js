/**
 * VideoQualitySystem - Advanced Video Quality Controls and Adaptive Streaming
 * 
 * Features:
 * - Real-time quality monitoring and adjustment
 * - Adaptive bitrate streaming (ABR)
 * - Network condition detection
 * - Manual quality controls
 * - Performance optimization
 * - Quality analytics and reporting
 * - Bandwidth monitoring
 * - Device capability detection
 * - User preference management
 * - Quality indicators and warnings
 */

export default class VideoQualitySystem {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            enableAdaptiveStreaming: true,
            enableManualControls: true,
            enableQualityIndicators: true,
            enableBandwidthMonitoring: true,
            enablePerformanceOptimization: true,
            defaultQuality: 'auto',
            qualityCheckInterval: 5000,
            bandwidthCheckInterval: 10000,
            maxQualityChangesPerMinute: 6,
            bufferHealthThreshold: 3,
            ...options
        };
        
        // Quality profiles
        this.qualityProfiles = new Map([
            ['240p', {
                name: '240p',
                label: '240p (Low)',
                width: 426,
                height: 240,
                bitrate: 400000,
                fps: 15,
                audioBitrate: 64000,
                description: 'Low quality for slow connections'
            }],
            ['360p', {
                name: '360p',
                label: '360p (Medium)',
                width: 640,
                height: 360,
                bitrate: 800000,
                fps: 30,
                audioBitrate: 96000,
                description: 'Medium quality for standard connections'
            }],
            ['480p', {
                name: '480p',
                label: '480p (Good)',
                width: 854,
                height: 480,
                bitrate: 1200000,
                fps: 30,
                audioBitrate: 128000,
                description: 'Good quality for most connections'
            }],
            ['720p', {
                name: '720p',
                label: '720p HD',
                width: 1280,
                height: 720,
                bitrate: 2500000,
                fps: 30,
                audioBitrate: 128000,
                description: 'High definition quality'
            }],
            ['1080p', {
                name: '1080p',
                label: '1080p Full HD',
                width: 1920,
                height: 1080,
                bitrate: 4500000,
                fps: 30,
                audioBitrate: 192000,
                description: 'Full high definition quality'
            }]
        ]);
        
        // Current state
        this.currentQuality = this.options.defaultQuality;
        this.targetQuality = null;
        this.isAdaptiveEnabled = this.options.enableAdaptiveStreaming;
        this.isQualityChanging = false;
        this.qualityChangeCount = 0;
        this.lastQualityChange = 0;
        
        // Network monitoring
        this.networkStats = {
            bandwidth: 0,
            latency: 0,
            packetLoss: 0,
            jitter: 0,
            connectionType: 'unknown',
            effectiveType: 'unknown'
        };
        
        // Performance monitoring
        this.performanceStats = {
            droppedFrames: 0,
            totalFrames: 0,
            bufferHealth: 0,
            playbackStalls: 0,
            qualityChanges: 0,
            averageQuality: 0,
            adaptationEfficiency: 0
        };
        
        // Video elements tracking
        this.videoElements = new Map();
        this.qualityIndicators = new Map();
        
        // Monitoring intervals
        this.qualityMonitorInterval = null;
        this.bandwidthMonitorInterval = null;
        this.performanceMonitorInterval = null;
        
        // Event handlers
        this.eventHandlers = new Map();
        
        // Quality change history
        this.qualityHistory = [];
        this.maxHistorySize = 100;
        
        // Bandwidth estimation
        this.bandwidthHistory = [];
        this.maxBandwidthSamples = 20;
        
        // Device capabilities
        this.deviceCapabilities = {
            maxResolution: { width: 1920, height: 1080 },
            maxBitrate: 5000000,
            hardwareAcceleration: false,
            codecSupport: []
        };
        
        // User preferences
        this.userPreferences = {
            preferredQuality: 'auto',
            dataSaverMode: false,
            qualityPriority: 'balanced', // 'quality', 'performance', 'bandwidth'
            autoQualityEnabled: true
        };
        
        // Integration systems
        this.accessibilitySystem = options.accessibilitySystem || null;
        this.themeSystem = options.themeSystem || null;
        this.responsiveSystem = options.responsiveSystem || null;
        this.videoLayoutSystem = options.videoLayoutSystem || null;
        
        this.init();
    }
    
    /**
     * Initialize video quality system
     */
    init() {
        console.log('🎥 Initializing Video Quality System...');
        
        // Inject CSS
        this.injectVideoQualityCSS();
        
        // Create quality controls UI
        this.createQualityControls();
        
        // Detect device capabilities
        this.detectDeviceCapabilities();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start monitoring
        this.startMonitoring();
        
        // Load user preferences
        this.loadUserPreferences();
        
        console.log('✅ Video Quality System initialized successfully');
    }
    
    /**
     * Create quality controls UI
     */
    createQualityControls() {
        const existingControls = this.container.querySelector('.video-quality-controls');
        if (existingControls) {
            existingControls.remove();
        }
        
        this.qualityControls = document.createElement('div');
        this.qualityControls.className = 'video-quality-controls';
        this.qualityControls.innerHTML = `
            <div class="quality-main-controls">
                <div class="quality-selector-group">
                    <button class="quality-btn" id="quality-selector-btn" title="Video Quality">
                        <i class="fas fa-cog"></i>
                        <span class="quality-label">Auto</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    
                    <div class="quality-dropdown" id="quality-dropdown" style="display: none;">
                        <div class="quality-dropdown-header">
                            <h4>Video Quality</h4>
                            <button class="close-btn" id="quality-dropdown-close">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div class="quality-options">
                            <div class="quality-option active" data-quality="auto">
                                <div class="quality-option-main">
                                    <span class="quality-name">Auto</span>
                                    <span class="quality-description">Automatically adjust based on connection</span>
                                </div>
                                <div class="quality-indicator">
                                    <i class="fas fa-magic"></i>
                                </div>
                            </div>
                        </div>
                        
                        <div class="quality-settings">
                            <div class="setting-group">
                                <label>
                                    <input type="checkbox" id="adaptive-streaming-toggle" checked>
                                    Enable Adaptive Streaming
                                </label>
                            </div>
                            
                            <div class="setting-group">
                                <label>
                                    <input type="checkbox" id="data-saver-toggle">
                                    Data Saver Mode
                                </label>
                            </div>
                            
                            <div class="setting-group">
                                <label for="quality-priority">Quality Priority:</label>
                                <select id="quality-priority">
                                    <option value="quality">Best Quality</option>
                                    <option value="balanced" selected>Balanced</option>
                                    <option value="performance">Best Performance</option>
                                    <option value="bandwidth">Save Bandwidth</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="quality-stats">
                            <div class="stat-row">
                                <span class="stat-label">Current:</span>
                                <span class="stat-value" id="current-quality-stat">Auto</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">Bandwidth:</span>
                                <span class="stat-value" id="bandwidth-stat">Detecting...</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">Buffer:</span>
                                <span class="stat-value" id="buffer-stat">Good</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="quality-indicators">
                    <div class="network-indicator" id="network-indicator" title="Network Status">
                        <i class="fas fa-wifi"></i>
                        <span class="indicator-text">Good</span>
                    </div>
                    
                    <div class="quality-indicator" id="quality-indicator" title="Video Quality">
                        <i class="fas fa-video"></i>
                        <span class="indicator-text">Auto</span>
                    </div>
                    
                    <div class="performance-indicator" id="performance-indicator" title="Performance">
                        <i class="fas fa-tachometer-alt"></i>
                        <span class="indicator-text">Good</span>
                    </div>
                </div>
            </div>
            
            <div class="quality-advanced-controls" style="display: none;">
                <div class="bandwidth-monitor">
                    <div class="monitor-header">
                        <h5>Bandwidth Monitor</h5>
                        <div class="monitor-value" id="bandwidth-monitor">0 Mbps</div>
                    </div>
                    <div class="bandwidth-chart" id="bandwidth-chart">
                        <!-- Chart will be rendered here -->
                    </div>
                </div>
                
                <div class="quality-analytics">
                    <div class="analytics-header">
                        <h5>Quality Analytics</h5>
                        <button class="toggle-btn" id="analytics-toggle">
                            <i class="fas fa-chart-line"></i>
                        </button>
                    </div>
                    <div class="analytics-content" id="analytics-content">
                        <!-- Analytics will be rendered here -->
                    </div>
                </div>
            </div>
        `;
        
        // Insert into streaming interface
        const controlBar = this.container.querySelector('.control-bar, .additional-controls');
        if (controlBar) {
            controlBar.appendChild(this.qualityControls);
        } else {
            this.container.appendChild(this.qualityControls);
        }
        
        // Populate quality options
        this.populateQualityOptions();
        
        // Setup quality controls events
        this.setupQualityControlsEvents();
    }
    
    /**
     * Populate quality options
     */
    populateQualityOptions() {
        const optionsContainer = this.qualityControls.querySelector('.quality-options');
        
        // Add manual quality options
        this.qualityProfiles.forEach((profile, quality) => {
            const option = document.createElement('div');
            option.className = 'quality-option';
            option.dataset.quality = quality;
            
            option.innerHTML = `
                <div class="quality-option-main">
                    <span class="quality-name">${profile.label}</span>
                    <span class="quality-description">${profile.description}</span>
                    <span class="quality-specs">${profile.width}x${profile.height} • ${Math.round(profile.bitrate / 1000)}k</span>
                </div>
                <div class="quality-indicator">
                    <div class="quality-bars">
                        ${this.generateQualityBars(quality)}
                    </div>
                </div>
            `;
            
            optionsContainer.appendChild(option);
        });
    }
    
    /**
     * Generate quality bars visualization
     */
    generateQualityBars(quality) {
        const qualityLevels = ['240p', '360p', '480p', '720p', '1080p'];
        const currentIndex = qualityLevels.indexOf(quality);

        return qualityLevels.map((level, index) => {
            const isActive = index <= currentIndex;
            return `<div class="quality-bar ${isActive ? 'active' : ''}"></div>`;
        }).join('');
    }

    /**
     * Setup quality controls events
     */
    setupQualityControlsEvents() {
        // Quality selector button
        this.qualityControls.querySelector('#quality-selector-btn').addEventListener('click', () => {
            this.toggleQualityDropdown();
        });

        // Close dropdown
        this.qualityControls.querySelector('#quality-dropdown-close').addEventListener('click', () => {
            this.hideQualityDropdown();
        });

        // Quality options
        this.qualityControls.querySelectorAll('.quality-option').forEach(option => {
            option.addEventListener('click', () => {
                const quality = option.dataset.quality;
                this.setQuality(quality);
                this.hideQualityDropdown();
            });
        });

        // Settings toggles
        this.qualityControls.querySelector('#adaptive-streaming-toggle').addEventListener('change', (e) => {
            this.setAdaptiveStreaming(e.target.checked);
        });

        this.qualityControls.querySelector('#data-saver-toggle').addEventListener('change', (e) => {
            this.setDataSaverMode(e.target.checked);
        });

        this.qualityControls.querySelector('#quality-priority').addEventListener('change', (e) => {
            this.setQualityPriority(e.target.value);
        });

        // Analytics toggle
        this.qualityControls.querySelector('#analytics-toggle').addEventListener('click', () => {
            this.toggleAdvancedControls();
        });

        // Click outside to close dropdown
        document.addEventListener('click', (e) => {
            if (!this.qualityControls.contains(e.target)) {
                this.hideQualityDropdown();
            }
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Video element events
        this.container.addEventListener('video-element-added', (e) => {
            this.handleVideoElementAdded(e.detail);
        });

        this.container.addEventListener('video-element-removed', (e) => {
            this.handleVideoElementRemoved(e.detail);
        });

        // Network events
        if ('connection' in navigator) {
            navigator.connection.addEventListener('change', () => {
                this.handleNetworkChange();
            });
        }

        // Visibility change
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }

    /**
     * Start monitoring
     */
    startMonitoring() {
        // Quality monitoring
        this.qualityMonitorInterval = setInterval(() => {
            this.monitorQuality();
        }, this.options.qualityCheckInterval);

        // Bandwidth monitoring
        this.bandwidthMonitorInterval = setInterval(() => {
            this.monitorBandwidth();
        }, this.options.bandwidthCheckInterval);

        // Performance monitoring
        this.performanceMonitorInterval = setInterval(() => {
            this.monitorPerformance();
        }, 2000);

        console.log('📊 Quality monitoring started');
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (this.qualityMonitorInterval) {
            clearInterval(this.qualityMonitorInterval);
            this.qualityMonitorInterval = null;
        }

        if (this.bandwidthMonitorInterval) {
            clearInterval(this.bandwidthMonitorInterval);
            this.bandwidthMonitorInterval = null;
        }

        if (this.performanceMonitorInterval) {
            clearInterval(this.performanceMonitorInterval);
            this.performanceMonitorInterval = null;
        }

        console.log('📊 Quality monitoring stopped');
    }

    /**
     * Monitor quality
     */
    monitorQuality() {
        if (!this.isAdaptiveEnabled || this.isQualityChanging) {
            return;
        }

        // Check if we can make quality changes
        if (!this.canChangeQuality()) {
            return;
        }

        // Analyze current conditions
        const networkCondition = this.analyzeNetworkCondition();
        const deviceCondition = this.analyzeDeviceCondition();
        const bufferCondition = this.analyzeBufferCondition();

        // Calculate optimal quality
        const optimalQuality = this.calculateOptimalQuality(
            networkCondition,
            deviceCondition,
            bufferCondition
        );

        // Change quality if needed
        if (optimalQuality && optimalQuality !== this.currentQuality) {
            this.setQuality(optimalQuality, { reason: 'adaptive' });
        }
    }

    /**
     * Monitor bandwidth
     */
    async monitorBandwidth() {
        try {
            const bandwidth = await this.measureBandwidth();
            this.updateBandwidthStats(bandwidth);
            this.updateBandwidthDisplay();
        } catch (error) {
            console.error('Bandwidth monitoring error:', error);
        }
    }

    /**
     * Monitor performance
     */
    monitorPerformance() {
        this.videoElements.forEach((videoData, videoElement) => {
            this.updateVideoPerformanceStats(videoElement);
        });

        this.updatePerformanceDisplay();
    }

    /**
     * Measure bandwidth
     */
    async measureBandwidth() {
        return new Promise((resolve) => {
            const startTime = performance.now();
            const testSize = 100000; // 100KB test

            // Create a test image download
            const img = new Image();
            img.onload = () => {
                const endTime = performance.now();
                const duration = (endTime - startTime) / 1000; // seconds
                const bandwidth = (testSize * 8) / duration; // bits per second
                resolve(bandwidth);
            };

            img.onerror = () => {
                // Fallback to connection API if available
                if ('connection' in navigator && navigator.connection.downlink) {
                    resolve(navigator.connection.downlink * 1000000); // Convert Mbps to bps
                } else {
                    resolve(1000000); // 1 Mbps fallback
                }
            };

            // Add cache buster
            img.src = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>')}?t=${Date.now()}`;
        });
    }

    /**
     * Update bandwidth stats
     */
    updateBandwidthStats(bandwidth) {
        this.networkStats.bandwidth = bandwidth;

        // Add to history
        this.bandwidthHistory.push({
            bandwidth,
            timestamp: Date.now()
        });

        // Limit history size
        if (this.bandwidthHistory.length > this.maxBandwidthSamples) {
            this.bandwidthHistory.shift();
        }

        // Update network condition
        this.updateNetworkCondition();
    }

    /**
     * Update network condition
     */
    updateNetworkCondition() {
        const avgBandwidth = this.getAverageBandwidth();

        let condition = 'poor';
        let effectiveType = 'slow-2g';

        if (avgBandwidth >= 5000000) { // 5 Mbps
            condition = 'excellent';
            effectiveType = '4g';
        } else if (avgBandwidth >= 2000000) { // 2 Mbps
            condition = 'good';
            effectiveType = '3g';
        } else if (avgBandwidth >= 1000000) { // 1 Mbps
            condition = 'fair';
            effectiveType = '2g';
        }

        this.networkStats.effectiveType = effectiveType;
        this.updateNetworkIndicator(condition);
    }

    /**
     * Get average bandwidth
     */
    getAverageBandwidth() {
        if (this.bandwidthHistory.length === 0) {
            return this.networkStats.bandwidth;
        }

        const sum = this.bandwidthHistory.reduce((acc, sample) => acc + sample.bandwidth, 0);
        return sum / this.bandwidthHistory.length;
    }

    /**
     * Analyze network condition
     */
    analyzeNetworkCondition() {
        const bandwidth = this.getAverageBandwidth();
        const latency = this.networkStats.latency;
        const packetLoss = this.networkStats.packetLoss;

        // Calculate network score (0-1)
        let score = 0;

        // Bandwidth score (40% weight)
        if (bandwidth >= 5000000) score += 0.4;
        else if (bandwidth >= 2000000) score += 0.3;
        else if (bandwidth >= 1000000) score += 0.2;
        else if (bandwidth >= 500000) score += 0.1;

        // Latency score (30% weight)
        if (latency <= 50) score += 0.3;
        else if (latency <= 100) score += 0.2;
        else if (latency <= 200) score += 0.1;

        // Packet loss score (30% weight)
        if (packetLoss <= 0.01) score += 0.3;
        else if (packetLoss <= 0.05) score += 0.2;
        else if (packetLoss <= 0.1) score += 0.1;

        return {
            score,
            bandwidth,
            latency,
            packetLoss,
            condition: this.scoreToCondition(score)
        };
    }

    /**
     * Analyze device condition
     */
    analyzeDeviceCondition() {
        const deviceMemory = navigator.deviceMemory || 4;
        const hardwareConcurrency = navigator.hardwareConcurrency || 4;

        let score = 0;

        // Memory score (50% weight)
        if (deviceMemory >= 8) score += 0.5;
        else if (deviceMemory >= 4) score += 0.3;
        else if (deviceMemory >= 2) score += 0.2;
        else score += 0.1;

        // CPU score (50% weight)
        if (hardwareConcurrency >= 8) score += 0.5;
        else if (hardwareConcurrency >= 4) score += 0.3;
        else if (hardwareConcurrency >= 2) score += 0.2;
        else score += 0.1;

        return {
            score,
            memory: deviceMemory,
            cores: hardwareConcurrency,
            condition: this.scoreToCondition(score)
        };
    }

    /**
     * Analyze buffer condition
     */
    analyzeBufferCondition() {
        let totalBufferHealth = 0;
        let videoCount = 0;

        this.videoElements.forEach((videoData, videoElement) => {
            if (videoElement.buffered && videoElement.buffered.length > 0) {
                const buffered = videoElement.buffered.end(videoElement.buffered.length - 1);
                const currentTime = videoElement.currentTime;
                const bufferHealth = buffered - currentTime;

                totalBufferHealth += bufferHealth;
                videoCount++;
            }
        });

        const averageBufferHealth = videoCount > 0 ? totalBufferHealth / videoCount : 0;

        let score = 0;
        if (averageBufferHealth >= 10) score = 1;
        else if (averageBufferHealth >= 5) score = 0.8;
        else if (averageBufferHealth >= 3) score = 0.6;
        else if (averageBufferHealth >= 1) score = 0.4;
        else score = 0.2;

        return {
            score,
            bufferHealth: averageBufferHealth,
            condition: this.scoreToCondition(score)
        };
    }

    /**
     * Calculate optimal quality
     */
    calculateOptimalQuality(networkCondition, deviceCondition, bufferCondition) {
        const weights = {
            network: 0.5,
            device: 0.3,
            buffer: 0.2
        };

        // Apply user preference adjustments
        if (this.userPreferences.qualityPriority === 'bandwidth') {
            weights.network = 0.7;
            weights.device = 0.2;
            weights.buffer = 0.1;
        } else if (this.userPreferences.qualityPriority === 'performance') {
            weights.network = 0.3;
            weights.device = 0.5;
            weights.buffer = 0.2;
        } else if (this.userPreferences.qualityPriority === 'quality') {
            weights.network = 0.4;
            weights.device = 0.4;
            weights.buffer = 0.2;
        }

        // Calculate combined score
        const combinedScore =
            networkCondition.score * weights.network +
            deviceCondition.score * weights.device +
            bufferCondition.score * weights.buffer;

        // Apply data saver mode
        let adjustedScore = combinedScore;
        if (this.userPreferences.dataSaverMode) {
            adjustedScore *= 0.7; // Reduce quality for data saving
        }

        // Map score to quality
        if (adjustedScore >= 0.8) return '1080p';
        if (adjustedScore >= 0.6) return '720p';
        if (adjustedScore >= 0.4) return '480p';
        if (adjustedScore >= 0.2) return '360p';
        return '240p';
    }

    /**
     * Set quality
     */
    async setQuality(quality, options = {}) {
        if (this.isQualityChanging || quality === this.currentQuality) {
            return false;
        }

        // Check rate limiting
        if (!this.canChangeQuality()) {
            console.warn('Quality change rate limited');
            return false;
        }

        this.isQualityChanging = true;
        const previousQuality = this.currentQuality;

        try {
            // Validate quality
            if (quality !== 'auto' && !this.qualityProfiles.has(quality)) {
                throw new Error(`Invalid quality: ${quality}`);
            }

            // Update state
            this.currentQuality = quality;
            this.targetQuality = quality;

            // Apply quality to video elements
            await this.applyQualityToVideos(quality);

            // Update UI
            this.updateQualityUI(quality);

            // Update statistics
            this.updateQualityStats(previousQuality, quality, options.reason || 'manual');

            // Emit quality change event
            this.emitQualityChangeEvent(previousQuality, quality, options);

            // Announce to accessibility system
            if (this.accessibilitySystem) {
                const qualityLabel = quality === 'auto' ? 'Auto' : this.qualityProfiles.get(quality)?.label || quality;
                this.accessibilitySystem.announce(`Video quality changed to ${qualityLabel}`, 'polite');
            }

            console.log(`Quality changed: ${previousQuality} → ${quality}`);
            return true;

        } catch (error) {
            console.error('Failed to set quality:', error);
            this.currentQuality = previousQuality;
            return false;
        } finally {
            this.isQualityChanging = false;
        }
    }

    /**
     * Apply quality to video elements
     */
    async applyQualityToVideos(quality) {
        const promises = [];

        this.videoElements.forEach((videoData, videoElement) => {
            promises.push(this.applyQualityToVideo(videoElement, quality));
        });

        await Promise.all(promises);
    }

    /**
     * Apply quality to single video
     */
    async applyQualityToVideo(videoElement, quality) {
        try {
            if (quality === 'auto') {
                // Enable adaptive streaming
                this.enableAdaptiveStreamingForVideo(videoElement);
            } else {
                // Set specific quality
                await this.setVideoQuality(videoElement, quality);
            }
        } catch (error) {
            console.error('Failed to apply quality to video:', error);
        }
    }

    /**
     * Set video quality
     */
    async setVideoQuality(videoElement, quality) {
        const profile = this.qualityProfiles.get(quality);
        if (!profile) return;

        // Store current time to resume playback
        const currentTime = videoElement.currentTime;
        const wasPlaying = !videoElement.paused;

        // Update video constraints if this is a live stream
        if (videoElement.srcObject && videoElement.srcObject.getVideoTracks) {
            const videoTrack = videoElement.srcObject.getVideoTracks()[0];
            if (videoTrack) {
                await videoTrack.applyConstraints({
                    width: { ideal: profile.width },
                    height: { ideal: profile.height },
                    frameRate: { ideal: profile.fps }
                });
            }
        }

        // Update video element attributes
        videoElement.setAttribute('data-quality', quality);

        // Resume playback if it was playing
        if (wasPlaying) {
            videoElement.currentTime = currentTime;
            await videoElement.play();
        }
    }

    /**
     * Update quality UI
     */
    updateQualityUI(quality) {
        // Update quality selector button
        const qualityLabel = this.qualityControls.querySelector('.quality-label');
        if (qualityLabel) {
            const label = quality === 'auto' ? 'Auto' : this.qualityProfiles.get(quality)?.label || quality;
            qualityLabel.textContent = label;
        }

        // Update active quality option
        this.qualityControls.querySelectorAll('.quality-option').forEach(option => {
            option.classList.remove('active');
            if (option.dataset.quality === quality) {
                option.classList.add('active');
            }
        });

        // Update quality indicator
        this.updateQualityIndicator(quality);

        // Update stats display
        this.updateStatsDisplay();
    }

    /**
     * Update quality indicator
     */
    updateQualityIndicator(quality) {
        const indicator = this.qualityControls.querySelector('#quality-indicator');
        if (!indicator) return;

        const indicatorText = indicator.querySelector('.indicator-text');
        const indicatorIcon = indicator.querySelector('i');

        if (quality === 'auto') {
            indicatorText.textContent = 'Auto';
            indicatorIcon.className = 'fas fa-magic';
            indicator.className = 'quality-indicator auto';
        } else {
            const profile = this.qualityProfiles.get(quality);
            indicatorText.textContent = profile?.name || quality;
            indicatorIcon.className = 'fas fa-video';

            // Set indicator class based on quality level
            const qualityLevels = ['240p', '360p', '480p', '720p', '1080p'];
            const qualityIndex = qualityLevels.indexOf(quality);

            if (qualityIndex >= 3) indicator.className = 'quality-indicator high';
            else if (qualityIndex >= 1) indicator.className = 'quality-indicator medium';
            else indicator.className = 'quality-indicator low';
        }
    }

    /**
     * Update network indicator
     */
    updateNetworkIndicator(condition) {
        const indicator = this.qualityControls.querySelector('#network-indicator');
        if (!indicator) return;

        const indicatorText = indicator.querySelector('.indicator-text');
        const indicatorIcon = indicator.querySelector('i');

        indicatorText.textContent = condition.charAt(0).toUpperCase() + condition.slice(1);

        // Update icon and class based on condition
        switch (condition) {
            case 'excellent':
                indicatorIcon.className = 'fas fa-wifi';
                indicator.className = 'network-indicator excellent';
                break;
            case 'good':
                indicatorIcon.className = 'fas fa-wifi';
                indicator.className = 'network-indicator good';
                break;
            case 'fair':
                indicatorIcon.className = 'fas fa-wifi';
                indicator.className = 'network-indicator fair';
                break;
            case 'poor':
                indicatorIcon.className = 'fas fa-exclamation-triangle';
                indicator.className = 'network-indicator poor';
                break;
        }
    }

    /**
     * Update performance indicator
     */
    updatePerformanceIndicator() {
        const indicator = this.qualityControls.querySelector('#performance-indicator');
        if (!indicator) return;

        const indicatorText = indicator.querySelector('.indicator-text');
        const indicatorIcon = indicator.querySelector('i');

        // Calculate performance score
        const droppedFrameRatio = this.performanceStats.totalFrames > 0 ?
            this.performanceStats.droppedFrames / this.performanceStats.totalFrames : 0;

        let condition = 'good';
        if (droppedFrameRatio > 0.1) condition = 'poor';
        else if (droppedFrameRatio > 0.05) condition = 'fair';
        else if (droppedFrameRatio > 0.02) condition = 'good';
        else condition = 'excellent';

        indicatorText.textContent = condition.charAt(0).toUpperCase() + condition.slice(1);

        // Update icon and class
        switch (condition) {
            case 'excellent':
                indicatorIcon.className = 'fas fa-tachometer-alt';
                indicator.className = 'performance-indicator excellent';
                break;
            case 'good':
                indicatorIcon.className = 'fas fa-tachometer-alt';
                indicator.className = 'performance-indicator good';
                break;
            case 'fair':
                indicatorIcon.className = 'fas fa-exclamation-circle';
                indicator.className = 'performance-indicator fair';
                break;
            case 'poor':
                indicatorIcon.className = 'fas fa-exclamation-triangle';
                indicator.className = 'performance-indicator poor';
                break;
        }
    }

    /**
     * Update stats display
     */
    updateStatsDisplay() {
        // Current quality
        const currentQualityStat = this.qualityControls.querySelector('#current-quality-stat');
        if (currentQualityStat) {
            const label = this.currentQuality === 'auto' ? 'Auto' :
                this.qualityProfiles.get(this.currentQuality)?.label || this.currentQuality;
            currentQualityStat.textContent = label;
        }

        // Bandwidth
        const bandwidthStat = this.qualityControls.querySelector('#bandwidth-stat');
        if (bandwidthStat) {
            const bandwidth = this.getAverageBandwidth();
            const mbps = (bandwidth / 1000000).toFixed(1);
            bandwidthStat.textContent = `${mbps} Mbps`;
        }

        // Buffer
        const bufferStat = this.qualityControls.querySelector('#buffer-stat');
        if (bufferStat) {
            const bufferCondition = this.analyzeBufferCondition();
            bufferStat.textContent = bufferCondition.condition.charAt(0).toUpperCase() +
                bufferCondition.condition.slice(1);
        }
    }

    /**
     * Update bandwidth display
     */
    updateBandwidthDisplay() {
        const bandwidthMonitor = this.qualityControls.querySelector('#bandwidth-monitor');
        if (bandwidthMonitor) {
            const bandwidth = this.getAverageBandwidth();
            const mbps = (bandwidth / 1000000).toFixed(1);
            bandwidthMonitor.textContent = `${mbps} Mbps`;
        }

        // Update bandwidth chart if visible
        this.updateBandwidthChart();
    }

    /**
     * Update bandwidth chart
     */
    updateBandwidthChart() {
        const chartContainer = this.qualityControls.querySelector('#bandwidth-chart');
        if (!chartContainer || chartContainer.style.display === 'none') return;

        // Simple ASCII-style chart
        const maxSamples = 20;
        const samples = this.bandwidthHistory.slice(-maxSamples);

        if (samples.length === 0) return;

        const maxBandwidth = Math.max(...samples.map(s => s.bandwidth));
        const minBandwidth = Math.min(...samples.map(s => s.bandwidth));
        const range = maxBandwidth - minBandwidth || 1;

        const chartHTML = samples.map(sample => {
            const height = ((sample.bandwidth - minBandwidth) / range) * 100;
            return `<div class="chart-bar" style="height: ${height}%" title="${(sample.bandwidth / 1000000).toFixed(1)} Mbps"></div>`;
        }).join('');

        chartContainer.innerHTML = chartHTML;
    }

    /**
     * Update performance display
     */
    updatePerformanceDisplay() {
        this.updatePerformanceIndicator();

        // Update analytics if visible
        const analyticsContent = this.qualityControls.querySelector('#analytics-content');
        if (analyticsContent && analyticsContent.style.display !== 'none') {
            this.updateAnalyticsDisplay();
        }
    }

    /**
     * Update analytics display
     */
    updateAnalyticsDisplay() {
        const analyticsContent = this.qualityControls.querySelector('#analytics-content');
        if (!analyticsContent) return;

        const droppedFrameRatio = this.performanceStats.totalFrames > 0 ?
            (this.performanceStats.droppedFrames / this.performanceStats.totalFrames * 100).toFixed(2) : '0.00';

        analyticsContent.innerHTML = `
            <div class="analytics-grid">
                <div class="analytics-item">
                    <span class="analytics-label">Quality Changes:</span>
                    <span class="analytics-value">${this.performanceStats.qualityChanges}</span>
                </div>
                <div class="analytics-item">
                    <span class="analytics-label">Dropped Frames:</span>
                    <span class="analytics-value">${droppedFrameRatio}%</span>
                </div>
                <div class="analytics-item">
                    <span class="analytics-label">Playback Stalls:</span>
                    <span class="analytics-value">${this.performanceStats.playbackStalls}</span>
                </div>
                <div class="analytics-item">
                    <span class="analytics-label">Buffer Health:</span>
                    <span class="analytics-value">${this.performanceStats.bufferHealth.toFixed(1)}s</span>
                </div>
                <div class="analytics-item">
                    <span class="analytics-label">Adaptation Efficiency:</span>
                    <span class="analytics-value">${(this.performanceStats.adaptationEfficiency * 100).toFixed(1)}%</span>
                </div>
                <div class="analytics-item">
                    <span class="analytics-label">Average Quality:</span>
                    <span class="analytics-value">${this.getAverageQualityLabel()}</span>
                </div>
            </div>
        `;
    }

    /**
     * Utility methods
     */
    scoreToCondition(score) {
        if (score >= 0.8) return 'excellent';
        if (score >= 0.6) return 'good';
        if (score >= 0.4) return 'fair';
        return 'poor';
    }

    canChangeQuality() {
        const now = Date.now();
        const timeSinceLastChange = now - this.lastQualityChange;
        const minInterval = 60000 / this.options.maxQualityChangesPerMinute;

        return timeSinceLastChange >= minInterval;
    }

    getAverageQualityLabel() {
        const qualityLevels = ['240p', '360p', '480p', '720p', '1080p'];
        const avgIndex = Math.round(this.performanceStats.averageQuality);
        return qualityLevels[avgIndex] || '480p';
    }

    /**
     * Event handlers
     */
    toggleQualityDropdown() {
        const dropdown = this.qualityControls.querySelector('#quality-dropdown');
        const isVisible = dropdown.style.display !== 'none';

        if (isVisible) {
            this.hideQualityDropdown();
        } else {
            this.showQualityDropdown();
        }
    }

    showQualityDropdown() {
        const dropdown = this.qualityControls.querySelector('#quality-dropdown');
        dropdown.style.display = 'block';

        // Update stats
        this.updateStatsDisplay();

        // Announce to accessibility system
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce('Quality settings opened', 'polite');
        }
    }

    hideQualityDropdown() {
        const dropdown = this.qualityControls.querySelector('#quality-dropdown');
        dropdown.style.display = 'none';
    }

    toggleAdvancedControls() {
        const advancedControls = this.qualityControls.querySelector('.quality-advanced-controls');
        const isVisible = advancedControls.style.display !== 'none';

        if (isVisible) {
            advancedControls.style.display = 'none';
        } else {
            advancedControls.style.display = 'block';
            this.updateAnalyticsDisplay();
            this.updateBandwidthChart();
        }
    }

    setAdaptiveStreaming(enabled) {
        this.isAdaptiveEnabled = enabled;
        this.userPreferences.autoQualityEnabled = enabled;
        this.saveUserPreferences();

        if (enabled && this.currentQuality !== 'auto') {
            this.setQuality('auto');
        }
    }

    setDataSaverMode(enabled) {
        this.userPreferences.dataSaverMode = enabled;
        this.saveUserPreferences();

        // Trigger quality re-evaluation
        if (this.isAdaptiveEnabled) {
            this.monitorQuality();
        }
    }

    setQualityPriority(priority) {
        this.userPreferences.qualityPriority = priority;
        this.saveUserPreferences();

        // Trigger quality re-evaluation
        if (this.isAdaptiveEnabled) {
            this.monitorQuality();
        }
    }

    /**
     * Event handling methods
     */
    handleVideoElementAdded(detail) {
        const { videoElement, participantId } = detail;

        this.videoElements.set(videoElement, {
            participantId,
            addedAt: Date.now(),
            quality: this.currentQuality
        });

        // Apply current quality to new video
        this.applyQualityToVideo(videoElement, this.currentQuality);

        // Add quality indicator
        this.addQualityIndicatorToVideo(videoElement);
    }

    handleVideoElementRemoved(detail) {
        const { videoElement } = detail;

        this.videoElements.delete(videoElement);
        this.qualityIndicators.delete(videoElement);
    }

    handleNetworkChange() {
        // Update network stats from connection API
        if ('connection' in navigator) {
            const connection = navigator.connection;
            this.networkStats.effectiveType = connection.effectiveType;
            this.networkStats.downlink = connection.downlink;
        }

        // Trigger quality re-evaluation
        if (this.isAdaptiveEnabled) {
            setTimeout(() => this.monitorQuality(), 1000);
        }
    }

    handleVisibilityChange() {
        if (document.hidden) {
            // Reduce quality when tab is hidden to save bandwidth
            if (this.isAdaptiveEnabled && this.currentQuality !== '240p') {
                this.setQuality('240p', { reason: 'background' });
            }
        } else {
            // Resume normal quality when tab becomes visible
            if (this.isAdaptiveEnabled) {
                setTimeout(() => this.monitorQuality(), 2000);
            }
        }
    }

    handleWindowResize() {
        // Adjust quality based on viewport size
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Update device capabilities
        this.deviceCapabilities.maxResolution = {
            width: Math.min(width, 1920),
            height: Math.min(height, 1080)
        };

        // Trigger quality re-evaluation
        if (this.isAdaptiveEnabled) {
            setTimeout(() => this.monitorQuality(), 500);
        }
    }

    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'q':
                    e.preventDefault();
                    this.toggleQualityDropdown();
                    break;
                case '1':
                    if (e.shiftKey) {
                        e.preventDefault();
                        this.setQuality('240p');
                    }
                    break;
                case '2':
                    if (e.shiftKey) {
                        e.preventDefault();
                        this.setQuality('360p');
                    }
                    break;
                case '3':
                    if (e.shiftKey) {
                        e.preventDefault();
                        this.setQuality('480p');
                    }
                    break;
                case '4':
                    if (e.shiftKey) {
                        e.preventDefault();
                        this.setQuality('720p');
                    }
                    break;
                case '5':
                    if (e.shiftKey) {
                        e.preventDefault();
                        this.setQuality('1080p');
                    }
                    break;
                case '0':
                    if (e.shiftKey) {
                        e.preventDefault();
                        this.setQuality('auto');
                    }
                    break;
            }
        }
    }

    /**
     * User preferences
     */
    loadUserPreferences() {
        try {
            const saved = localStorage.getItem('videoQualityPreferences');
            if (saved) {
                const preferences = JSON.parse(saved);
                Object.assign(this.userPreferences, preferences);
            }
        } catch (error) {
            console.error('Failed to load user preferences:', error);
        }
    }

    saveUserPreferences() {
        try {
            localStorage.setItem('videoQualityPreferences', JSON.stringify(this.userPreferences));
        } catch (error) {
            console.error('Failed to save user preferences:', error);
        }
    }

    /**
     * Device capability detection
     */
    detectDeviceCapabilities() {
        // Detect hardware acceleration
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        this.deviceCapabilities.hardwareAcceleration = !!gl;

        // Detect codec support
        const video = document.createElement('video');
        const codecs = [
            'video/mp4; codecs="avc1.42E01E"', // H.264 Baseline
            'video/mp4; codecs="avc1.4D401E"', // H.264 Main
            'video/mp4; codecs="avc1.64001E"', // H.264 High
            'video/webm; codecs="vp8"',        // VP8
            'video/webm; codecs="vp9"',        // VP9
            'video/mp4; codecs="hev1.1.6.L93.B0"' // H.265
        ];

        this.deviceCapabilities.codecSupport = codecs.filter(codec =>
            video.canPlayType(codec) === 'probably'
        );

        console.log('Device capabilities detected:', this.deviceCapabilities);
    }

    /**
     * Performance monitoring
     */
    updateVideoPerformanceStats(videoElement) {
        try {
            // Get video quality metrics
            if (videoElement.getVideoPlaybackQuality) {
                const quality = videoElement.getVideoPlaybackQuality();
                this.performanceStats.droppedFrames = quality.droppedVideoFrames;
                this.performanceStats.totalFrames = quality.totalVideoFrames;
            }

            // Get buffer health
            if (videoElement.buffered && videoElement.buffered.length > 0) {
                const buffered = videoElement.buffered.end(videoElement.buffered.length - 1);
                const currentTime = videoElement.currentTime;
                this.performanceStats.bufferHealth = buffered - currentTime;
            }

        } catch (error) {
            console.error('Error updating performance stats:', error);
        }
    }

    updateQualityStats(previousQuality, newQuality, reason) {
        this.performanceStats.qualityChanges++;
        this.lastQualityChange = Date.now();
        this.qualityChangeCount++;

        // Add to history
        this.qualityHistory.push({
            from: previousQuality,
            to: newQuality,
            reason,
            timestamp: Date.now()
        });

        // Limit history size
        if (this.qualityHistory.length > this.maxHistorySize) {
            this.qualityHistory.shift();
        }

        // Update average quality
        const qualityLevels = ['240p', '360p', '480p', '720p', '1080p'];
        const qualityIndex = qualityLevels.indexOf(newQuality);
        if (qualityIndex !== -1) {
            this.performanceStats.averageQuality =
                (this.performanceStats.averageQuality + qualityIndex) / 2;
        }

        // Calculate adaptation efficiency
        const recentChanges = this.qualityHistory.slice(-10);
        const unnecessaryChanges = recentChanges.filter((change, index) => {
            if (index === 0) return false;
            const prevChange = recentChanges[index - 1];
            return change.to === prevChange.from &&
                   change.timestamp - prevChange.timestamp < 30000; // 30 seconds
        }).length;

        this.performanceStats.adaptationEfficiency =
            Math.max(0, 1 - (unnecessaryChanges / Math.max(1, recentChanges.length)));
    }

    /**
     * Video quality indicator
     */
    addQualityIndicatorToVideo(videoElement) {
        const indicator = document.createElement('div');
        indicator.className = 'video-quality-indicator';
        indicator.innerHTML = `
            <div class="quality-badge">
                <span class="quality-text">Auto</span>
            </div>
        `;

        // Position indicator
        const container = videoElement.parentElement;
        if (container) {
            container.style.position = 'relative';
            container.appendChild(indicator);
            this.qualityIndicators.set(videoElement, indicator);
        }
    }

    /**
     * Adaptive streaming methods
     */
    enableAdaptiveStreamingForVideo(videoElement) {
        // Mark video for adaptive streaming
        videoElement.setAttribute('data-adaptive', 'true');

        // Update quality indicator
        const indicator = this.qualityIndicators.get(videoElement);
        if (indicator) {
            const qualityText = indicator.querySelector('.quality-text');
            if (qualityText) {
                qualityText.textContent = 'Auto';
            }
        }
    }

    /**
     * Event emission
     */
    emitQualityChangeEvent(previousQuality, newQuality, options) {
        const event = new CustomEvent('video-quality-changed', {
            detail: {
                previousQuality,
                newQuality,
                reason: options.reason || 'manual',
                timestamp: Date.now(),
                networkStats: { ...this.networkStats },
                performanceStats: { ...this.performanceStats }
            }
        });

        this.container.dispatchEvent(event);
    }

    /**
     * Inject video quality CSS
     */
    injectVideoQualityCSS() {
        if (document.getElementById('video-quality-css')) return;

        const style = document.createElement('style');
        style.id = 'video-quality-css';
        style.textContent = `
            /* Video Quality System */
            .video-quality-controls {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px;
                background: var(--card-dark, #2a2a2a);
                border-radius: 8px;
                border: 1px solid var(--border-color, #444);
                position: relative;
            }

            .quality-main-controls {
                display: flex;
                align-items: center;
                gap: 15px;
            }

            .quality-selector-group {
                position: relative;
            }

            .quality-btn {
                background: var(--input-dark, #3a3a3a);
                border: 1px solid var(--border-color, #444);
                color: var(--text-light, #fff);
                padding: 8px 12px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 0.9rem;
                min-width: 120px;
            }

            .quality-btn:hover {
                background: var(--primary-color, #ff0000);
                border-color: var(--primary-color, #ff0000);
            }

            .quality-dropdown {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: var(--card-dark, #2a2a2a);
                border: 1px solid var(--border-color, #444);
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                z-index: 1000;
                min-width: 350px;
                margin-top: 5px;
            }

            .quality-dropdown-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px;
                border-bottom: 1px solid var(--border-color, #444);
            }

            .quality-dropdown-header h4 {
                margin: 0;
                color: var(--primary-color, #ff0000);
                font-size: 1.1rem;
            }

            .close-btn {
                background: none;
                border: none;
                color: var(--text-muted, #aaa);
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: all 0.2s ease;
            }

            .close-btn:hover {
                background: var(--primary-color, #ff0000);
                color: white;
            }

            .quality-options {
                padding: 10px;
                max-height: 300px;
                overflow-y: auto;
            }

            .quality-option {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
                margin-bottom: 5px;
            }

            .quality-option:hover,
            .quality-option.active {
                background: var(--input-dark, #3a3a3a);
                border: 1px solid var(--primary-color, #ff0000);
            }

            .quality-option-main {
                flex: 1;
            }

            .quality-name {
                display: block;
                color: var(--text-light, #fff);
                font-weight: 500;
                margin-bottom: 2px;
            }

            .quality-description {
                display: block;
                color: var(--text-muted, #aaa);
                font-size: 0.8rem;
                margin-bottom: 2px;
            }

            .quality-specs {
                display: block;
                color: var(--text-muted, #aaa);
                font-size: 0.7rem;
            }

            .quality-bars {
                display: flex;
                gap: 2px;
                align-items: end;
            }

            .quality-bar {
                width: 3px;
                height: 8px;
                background: var(--border-color, #444);
                border-radius: 1px;
                transition: all 0.2s ease;
            }

            .quality-bar.active {
                background: var(--primary-color, #ff0000);
            }

            .quality-bar:nth-child(1) { height: 4px; }
            .quality-bar:nth-child(2) { height: 6px; }
            .quality-bar:nth-child(3) { height: 8px; }
            .quality-bar:nth-child(4) { height: 10px; }
            .quality-bar:nth-child(5) { height: 12px; }

            .quality-settings {
                padding: 15px;
                border-top: 1px solid var(--border-color, #444);
                border-bottom: 1px solid var(--border-color, #444);
            }

            .setting-group {
                margin-bottom: 12px;
            }

            .setting-group label {
                display: flex;
                align-items: center;
                color: var(--text-light, #fff);
                font-size: 0.9rem;
                cursor: pointer;
            }

            .setting-group input[type="checkbox"] {
                margin-right: 8px;
            }

            .setting-group select {
                width: 100%;
                background: var(--input-dark, #3a3a3a);
                border: 1px solid var(--border-color, #444);
                color: var(--text-light, #fff);
                padding: 6px;
                border-radius: 4px;
                margin-top: 5px;
            }

            .quality-stats {
                padding: 15px;
            }

            .stat-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                font-size: 0.9rem;
            }

            .stat-label {
                color: var(--text-muted, #aaa);
            }

            .stat-value {
                color: var(--text-light, #fff);
                font-weight: 500;
            }

            .quality-indicators {
                display: flex;
                gap: 10px;
            }

            .network-indicator,
            .quality-indicator,
            .performance-indicator {
                display: flex;
                align-items: center;
                gap: 5px;
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 0.8rem;
                transition: all 0.2s ease;
            }

            .network-indicator.excellent,
            .quality-indicator.high,
            .performance-indicator.excellent {
                background: rgba(40, 167, 69, 0.2);
                color: #28a745;
                border: 1px solid #28a745;
            }

            .network-indicator.good,
            .quality-indicator.medium,
            .performance-indicator.good {
                background: rgba(255, 193, 7, 0.2);
                color: #ffc107;
                border: 1px solid #ffc107;
            }

            .network-indicator.fair,
            .quality-indicator.low,
            .performance-indicator.fair {
                background: rgba(255, 152, 0, 0.2);
                color: #ff9800;
                border: 1px solid #ff9800;
            }

            .network-indicator.poor,
            .performance-indicator.poor {
                background: rgba(220, 53, 69, 0.2);
                color: #dc3545;
                border: 1px solid #dc3545;
            }

            .quality-indicator.auto {
                background: rgba(255, 0, 0, 0.2);
                color: var(--primary-color, #ff0000);
                border: 1px solid var(--primary-color, #ff0000);
            }

            .quality-advanced-controls {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: var(--card-dark, #2a2a2a);
                border: 1px solid var(--border-color, #444);
                border-radius: 8px;
                padding: 15px;
                margin-top: 5px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                z-index: 999;
            }

            .bandwidth-monitor,
            .quality-analytics {
                margin-bottom: 20px;
            }

            .monitor-header,
            .analytics-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }

            .monitor-header h5,
            .analytics-header h5 {
                margin: 0;
                color: var(--primary-color, #ff0000);
                font-size: 1rem;
            }

            .monitor-value {
                color: var(--text-light, #fff);
                font-weight: bold;
            }

            .bandwidth-chart {
                display: flex;
                align-items: end;
                gap: 2px;
                height: 40px;
                margin-top: 10px;
            }

            .chart-bar {
                flex: 1;
                background: var(--primary-color, #ff0000);
                border-radius: 1px;
                min-height: 2px;
                transition: all 0.2s ease;
            }

            .analytics-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 10px;
            }

            .analytics-item {
                display: flex;
                justify-content: space-between;
                padding: 8px;
                background: var(--input-dark, #3a3a3a);
                border-radius: 4px;
                font-size: 0.8rem;
            }

            .analytics-label {
                color: var(--text-muted, #aaa);
            }

            .analytics-value {
                color: var(--text-light, #fff);
                font-weight: 500;
            }

            .video-quality-indicator {
                position: absolute;
                top: 10px;
                right: 10px;
                z-index: 10;
            }

            .quality-badge {
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 0.7rem;
                font-weight: 500;
            }

            /* Responsive Design */
            @media (max-width: 768px) {
                .video-quality-controls {
                    flex-wrap: wrap;
                    gap: 5px;
                }

                .quality-indicators {
                    flex-wrap: wrap;
                    gap: 5px;
                }

                .quality-dropdown {
                    min-width: 300px;
                    left: -50px;
                }

                .analytics-grid {
                    grid-template-columns: 1fr;
                }

                .indicator-text {
                    display: none;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // Public API methods

    /**
     * Get current quality
     */
    getCurrentQuality() {
        return this.currentQuality;
    }

    /**
     * Get available qualities
     */
    getAvailableQualities() {
        return Array.from(this.qualityProfiles.keys());
    }

    /**
     * Get quality profiles
     */
    getQualityProfiles() {
        return this.qualityProfiles;
    }

    /**
     * Get network stats
     */
    getNetworkStats() {
        return { ...this.networkStats };
    }

    /**
     * Get performance stats
     */
    getPerformanceStats() {
        return { ...this.performanceStats };
    }

    /**
     * Get quality history
     */
    getQualityHistory() {
        return [...this.qualityHistory];
    }

    /**
     * Add video element
     */
    addVideoElement(videoElement, participantId) {
        this.handleVideoElementAdded({ videoElement, participantId });
    }

    /**
     * Remove video element
     */
    removeVideoElement(videoElement) {
        this.handleVideoElementRemoved({ videoElement });
    }

    /**
     * Force quality check
     */
    forceQualityCheck() {
        this.monitorQuality();
    }

    /**
     * Reset statistics
     */
    resetStatistics() {
        this.performanceStats = {
            droppedFrames: 0,
            totalFrames: 0,
            bufferHealth: 0,
            playbackStalls: 0,
            qualityChanges: 0,
            averageQuality: 0,
            adaptationEfficiency: 0
        };

        this.qualityHistory = [];
        this.bandwidthHistory = [];
        this.qualityChangeCount = 0;
    }

    /**
     * Destroy video quality system
     */
    destroy() {
        // Stop monitoring
        this.stopMonitoring();

        // Remove event listeners
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('resize', this.handleWindowResize);
        document.removeEventListener('keydown', this.handleKeyboardShortcuts);

        // Remove UI elements
        if (this.qualityControls) {
            this.qualityControls.remove();
        }

        // Remove quality indicators
        this.qualityIndicators.forEach(indicator => indicator.remove());

        // Clear data
        this.videoElements.clear();
        this.qualityIndicators.clear();
        this.qualityHistory = [];
        this.bandwidthHistory = [];

        // Remove CSS
        const style = document.getElementById('video-quality-css');
        if (style) {
            style.remove();
        }
    }
}
