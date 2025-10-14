/**
 * Video Recording Indicators System for Interviews.tv
 * Provides comprehensive visual feedback for recording status
 */
class VideoRecordingIndicators {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            enableFloatingIndicator: true,
            enableCornerIndicator: true,
            enableStatusBar: true,
            enableTimerDisplay: true,
            enableQualityIndicator: true,
            enableStorageIndicator: true,
            enableBandwidthIndicator: true,
            enableErrorIndicator: true,
            enablePulseAnimation: true,
            enableSoundIndicator: false,
            indicatorPosition: 'top-right', // top-left, top-right, bottom-left, bottom-right
            timerFormat: 'hh:mm:ss',
            updateInterval: 1000,
            autoHideDelay: 5000,
            enableAccessibility: true,
            enableMobileOptimization: true,
            themeSystem: null,
            accessibilitySystem: null,
            responsiveSystem: null,
            ...options
        };
        
        // Recording state
        this.isRecording = false;
        this.isPaused = false;
        this.recordingStartTime = null;
        this.recordingDuration = 0;
        this.recordingQuality = 'high';
        this.recordingFormat = 'webm';
        this.recordingSize = 0;
        this.availableStorage = 0;
        this.bandwidthUsage = 0;
        this.errorState = null;
        
        // UI elements
        this.floatingIndicator = null;
        this.cornerIndicator = null;
        this.statusBar = null;
        this.timerDisplay = null;
        this.qualityIndicator = null;
        this.storageIndicator = null;
        this.bandwidthIndicator = null;
        this.errorIndicator = null;
        
        // Update intervals
        this.timerInterval = null;
        this.statsInterval = null;
        this.autoHideTimeout = null;
        
        // Animation states
        this.pulseAnimation = null;
        this.blinkAnimation = null;
        
        // Event handlers
        this.boundEventHandlers = {
            handleVisibilityChange: this.handleVisibilityChange.bind(this),
            handleResize: this.handleResize.bind(this),
            handleKeyDown: this.handleKeyDown.bind(this),
            handleClick: this.handleClick.bind(this)
        };
        
        this.init();
    }
    
    /**
     * Initialize recording indicators system
     */
    init() {
        console.log('🎬 Initializing Video Recording Indicators...');
        
        try {
            // Inject CSS
            this.injectRecordingIndicatorsCSS();
            
            // Create indicator components
            this.createFloatingIndicator();
            this.createCornerIndicator();
            this.createStatusBar();
            this.createTimerDisplay();
            this.createQualityIndicator();
            this.createStorageIndicator();
            this.createBandwidthIndicator();
            this.createErrorIndicator();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize state
            this.updateAllIndicators();
            
            console.log('✅ Video Recording Indicators initialized');
            
            // Emit initialization event
            this.emitIndicatorEvent('indicators-initialized', {
                enabledIndicators: this.getEnabledIndicators()
            });
            
        } catch (error) {
            console.error('Failed to initialize recording indicators:', error);
            this.handleInitializationError(error);
        }
    }
    
    /**
     * Start recording indicators
     */
    startRecording(recordingData = {}) {
        console.log('Starting recording indicators...');
        
        this.isRecording = true;
        this.isPaused = false;
        this.recordingStartTime = Date.now();
        this.recordingDuration = 0;
        this.recordingQuality = recordingData.quality || 'high';
        this.recordingFormat = recordingData.format || 'webm';
        this.recordingSize = 0;
        this.errorState = null;
        
        // Start timer
        this.startTimer();
        
        // Start stats monitoring
        this.startStatsMonitoring();
        
        // Update all indicators
        this.updateAllIndicators();
        
        // Show indicators
        this.showIndicators();
        
        // Start pulse animation
        if (this.options.enablePulseAnimation) {
            this.startPulseAnimation();
        }
        
        // Announce to accessibility system
        if (this.options.accessibilitySystem) {
            this.options.accessibilitySystem.announce('Recording started', 'polite');
        }
        
        // Emit recording started event
        this.emitIndicatorEvent('recording-started', {
            startTime: this.recordingStartTime,
            quality: this.recordingQuality,
            format: this.recordingFormat
        });
        
        console.log('Recording indicators started');
    }
    
    /**
     * Pause recording indicators
     */
    pauseRecording() {
        console.log('Pausing recording indicators...');
        
        this.isPaused = true;
        
        // Stop timer
        this.stopTimer();
        
        // Update indicators
        this.updateAllIndicators();
        
        // Start blink animation for paused state
        this.startBlinkAnimation();
        
        // Announce to accessibility system
        if (this.options.accessibilitySystem) {
            this.options.accessibilitySystem.announce('Recording paused', 'polite');
        }
        
        // Emit recording paused event
        this.emitIndicatorEvent('recording-paused', {
            duration: this.recordingDuration
        });
        
        console.log('Recording indicators paused');
    }
    
    /**
     * Resume recording indicators
     */
    resumeRecording() {
        console.log('Resuming recording indicators...');
        
        this.isPaused = false;
        
        // Restart timer
        this.startTimer();
        
        // Update indicators
        this.updateAllIndicators();
        
        // Stop blink animation and restart pulse
        this.stopBlinkAnimation();
        if (this.options.enablePulseAnimation) {
            this.startPulseAnimation();
        }
        
        // Announce to accessibility system
        if (this.options.accessibilitySystem) {
            this.options.accessibilitySystem.announce('Recording resumed', 'polite');
        }
        
        // Emit recording resumed event
        this.emitIndicatorEvent('recording-resumed', {
            duration: this.recordingDuration
        });
        
        console.log('Recording indicators resumed');
    }
    
    /**
     * Stop recording indicators
     */
    stopRecording() {
        console.log('Stopping recording indicators...');
        
        this.isRecording = false;
        this.isPaused = false;
        
        // Stop timer and stats monitoring
        this.stopTimer();
        this.stopStatsMonitoring();
        
        // Stop animations
        this.stopPulseAnimation();
        this.stopBlinkAnimation();
        
        // Update indicators
        this.updateAllIndicators();
        
        // Hide indicators after delay
        this.scheduleAutoHide();
        
        // Announce to accessibility system
        if (this.options.accessibilitySystem) {
            this.options.accessibilitySystem.announce('Recording stopped', 'polite');
        }
        
        // Emit recording stopped event
        this.emitIndicatorEvent('recording-stopped', {
            duration: this.recordingDuration,
            size: this.recordingSize,
            quality: this.recordingQuality,
            format: this.recordingFormat
        });
        
        console.log('Recording indicators stopped');
    }
    
    /**
     * Update recording statistics
     */
    updateRecordingStats(stats = {}) {
        this.recordingSize = stats.size || this.recordingSize;
        this.availableStorage = stats.availableStorage || this.availableStorage;
        this.bandwidthUsage = stats.bandwidthUsage || this.bandwidthUsage;
        
        // Update relevant indicators
        this.updateStorageIndicator();
        this.updateBandwidthIndicator();
        
        // Emit stats updated event
        this.emitIndicatorEvent('stats-updated', stats);
    }
    
    /**
     * Set error state
     */
    setErrorState(error) {
        console.error('Recording error:', error);
        
        this.errorState = error;
        
        // Update error indicator
        this.updateErrorIndicator();
        
        // Show error indicator
        this.showErrorIndicator();
        
        // Announce to accessibility system
        if (this.options.accessibilitySystem) {
            this.options.accessibilitySystem.announce(`Recording error: ${error.message}`, 'assertive');
        }
        
        // Emit error event
        this.emitIndicatorEvent('recording-error', {
            error: error.message,
            timestamp: Date.now()
        });
    }
    
    /**
     * Clear error state
     */
    clearErrorState() {
        this.errorState = null;
        this.updateErrorIndicator();
        this.hideErrorIndicator();
        
        // Emit error cleared event
        this.emitIndicatorEvent('error-cleared', {
            timestamp: Date.now()
        });
    }
    
    /**
     * Get enabled indicators
     */
    getEnabledIndicators() {
        const indicators = [];
        
        if (this.options.enableFloatingIndicator) indicators.push('floating');
        if (this.options.enableCornerIndicator) indicators.push('corner');
        if (this.options.enableStatusBar) indicators.push('statusBar');
        if (this.options.enableTimerDisplay) indicators.push('timer');
        if (this.options.enableQualityIndicator) indicators.push('quality');
        if (this.options.enableStorageIndicator) indicators.push('storage');
        if (this.options.enableBandwidthIndicator) indicators.push('bandwidth');
        if (this.options.enableErrorIndicator) indicators.push('error');
        
        return indicators;
    }
    
    /**
     * Get recording status
     */
    getRecordingStatus() {
        return {
            isRecording: this.isRecording,
            isPaused: this.isPaused,
            duration: this.recordingDuration,
            startTime: this.recordingStartTime,
            quality: this.recordingQuality,
            format: this.recordingFormat,
            size: this.recordingSize,
            availableStorage: this.availableStorage,
            bandwidthUsage: this.bandwidthUsage,
            errorState: this.errorState,
            enabledIndicators: this.getEnabledIndicators()
        };
    }

    /**
     * Create floating indicator
     */
    createFloatingIndicator() {
        if (!this.options.enableFloatingIndicator) return;

        this.floatingIndicator = document.createElement('div');
        this.floatingIndicator.className = `recording-floating-indicator ${this.options.indicatorPosition}`;
        this.floatingIndicator.innerHTML = `
            <div class="floating-indicator-content">
                <div class="recording-dot" id="floating-recording-dot"></div>
                <span class="recording-text" id="floating-recording-text">REC</span>
                <span class="recording-timer" id="floating-recording-timer">00:00:00</span>
            </div>
        `;

        this.floatingIndicator.style.display = 'none';
        this.container.appendChild(this.floatingIndicator);
    }

    /**
     * Create corner indicator
     */
    createCornerIndicator() {
        if (!this.options.enableCornerIndicator) return;

        this.cornerIndicator = document.createElement('div');
        this.cornerIndicator.className = 'recording-corner-indicator';
        this.cornerIndicator.innerHTML = `
            <div class="corner-indicator-dot" id="corner-recording-dot"></div>
        `;

        this.cornerIndicator.style.display = 'none';
        this.container.appendChild(this.cornerIndicator);
    }

    /**
     * Create status bar
     */
    createStatusBar() {
        if (!this.options.enableStatusBar) return;

        this.statusBar = document.createElement('div');
        this.statusBar.className = 'recording-status-bar';
        this.statusBar.innerHTML = `
            <div class="status-bar-content">
                <div class="status-section">
                    <div class="status-indicator" id="status-recording-dot"></div>
                    <span class="status-text" id="status-recording-text">Ready</span>
                </div>
                <div class="timer-section" id="timer-section">
                    <i class="fas fa-clock" aria-hidden="true"></i>
                    <span class="timer-text" id="status-timer-text">00:00:00</span>
                </div>
                <div class="info-section" id="info-section">
                    <div class="info-item" id="quality-info">
                        <i class="fas fa-video" aria-hidden="true"></i>
                        <span id="quality-text">High</span>
                    </div>
                    <div class="info-item" id="size-info">
                        <i class="fas fa-hdd" aria-hidden="true"></i>
                        <span id="size-text">0 MB</span>
                    </div>
                </div>
            </div>
        `;

        this.statusBar.style.display = 'none';
        this.container.appendChild(this.statusBar);
    }

    /**
     * Create timer display
     */
    createTimerDisplay() {
        if (!this.options.enableTimerDisplay) return;

        this.timerDisplay = document.createElement('div');
        this.timerDisplay.className = 'recording-timer-display';
        this.timerDisplay.innerHTML = `
            <div class="timer-display-content">
                <div class="timer-icon">
                    <i class="fas fa-record-vinyl" aria-hidden="true"></i>
                </div>
                <div class="timer-time" id="timer-display-time">00:00:00</div>
                <div class="timer-status" id="timer-display-status">Recording</div>
            </div>
        `;

        this.timerDisplay.style.display = 'none';
        this.container.appendChild(this.timerDisplay);
    }

    /**
     * Create quality indicator
     */
    createQualityIndicator() {
        if (!this.options.enableQualityIndicator) return;

        this.qualityIndicator = document.createElement('div');
        this.qualityIndicator.className = 'recording-quality-indicator';
        this.qualityIndicator.innerHTML = `
            <div class="quality-indicator-content">
                <div class="quality-badge" id="quality-badge">
                    <i class="fas fa-video" aria-hidden="true"></i>
                    <span id="quality-badge-text">HD</span>
                </div>
                <div class="quality-details" id="quality-details">
                    <div class="quality-resolution" id="quality-resolution">1920×1080</div>
                    <div class="quality-format" id="quality-format">WebM</div>
                </div>
            </div>
        `;

        this.qualityIndicator.style.display = 'none';
        this.container.appendChild(this.qualityIndicator);
    }

    /**
     * Create storage indicator
     */
    createStorageIndicator() {
        if (!this.options.enableStorageIndicator) return;

        this.storageIndicator = document.createElement('div');
        this.storageIndicator.className = 'recording-storage-indicator';
        this.storageIndicator.innerHTML = `
            <div class="storage-indicator-content">
                <div class="storage-icon">
                    <i class="fas fa-hdd" aria-hidden="true"></i>
                </div>
                <div class="storage-info">
                    <div class="storage-used" id="storage-used">0 MB</div>
                    <div class="storage-available" id="storage-available">∞ GB</div>
                </div>
                <div class="storage-progress">
                    <div class="storage-progress-bar" id="storage-progress-bar"></div>
                </div>
            </div>
        `;

        this.storageIndicator.style.display = 'none';
        this.container.appendChild(this.storageIndicator);
    }

    /**
     * Create bandwidth indicator
     */
    createBandwidthIndicator() {
        if (!this.options.enableBandwidthIndicator) return;

        this.bandwidthIndicator = document.createElement('div');
        this.bandwidthIndicator.className = 'recording-bandwidth-indicator';
        this.bandwidthIndicator.innerHTML = `
            <div class="bandwidth-indicator-content">
                <div class="bandwidth-icon">
                    <i class="fas fa-wifi" aria-hidden="true"></i>
                </div>
                <div class="bandwidth-info">
                    <div class="bandwidth-usage" id="bandwidth-usage">0 Mbps</div>
                    <div class="bandwidth-status" id="bandwidth-status">Good</div>
                </div>
                <div class="bandwidth-bars" id="bandwidth-bars">
                    <div class="bandwidth-bar"></div>
                    <div class="bandwidth-bar"></div>
                    <div class="bandwidth-bar"></div>
                    <div class="bandwidth-bar"></div>
                    <div class="bandwidth-bar"></div>
                </div>
            </div>
        `;

        this.bandwidthIndicator.style.display = 'none';
        this.container.appendChild(this.bandwidthIndicator);
    }

    /**
     * Create error indicator
     */
    createErrorIndicator() {
        if (!this.options.enableErrorIndicator) return;

        this.errorIndicator = document.createElement('div');
        this.errorIndicator.className = 'recording-error-indicator';
        this.errorIndicator.innerHTML = `
            <div class="error-indicator-content">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
                </div>
                <div class="error-message" id="error-message">Recording Error</div>
                <button class="error-dismiss" id="error-dismiss" title="Dismiss">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>
        `;

        this.errorIndicator.style.display = 'none';
        this.container.appendChild(this.errorIndicator);

        // Setup error dismiss handler
        const dismissBtn = this.errorIndicator.querySelector('#error-dismiss');
        dismissBtn?.addEventListener('click', () => this.clearErrorState());
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Visibility change for pause/resume timer
        document.addEventListener('visibilitychange', this.boundEventHandlers.handleVisibilityChange);

        // Window resize for responsive positioning
        window.addEventListener('resize', this.boundEventHandlers.handleResize);

        // Keyboard shortcuts
        document.addEventListener('keydown', this.boundEventHandlers.handleKeyDown);

        // Click handlers for indicators
        this.floatingIndicator?.addEventListener('click', this.boundEventHandlers.handleClick);
        this.cornerIndicator?.addEventListener('click', this.boundEventHandlers.handleClick);
        this.statusBar?.addEventListener('click', this.boundEventHandlers.handleClick);
    }

    /**
     * Start timer
     */
    startTimer() {
        this.stopTimer(); // Clear any existing timer

        this.timerInterval = setInterval(() => {
            if (this.isRecording && !this.isPaused) {
                this.recordingDuration = Date.now() - this.recordingStartTime;
                this.updateTimerDisplays();
            }
        }, this.options.updateInterval);
    }

    /**
     * Stop timer
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    /**
     * Start stats monitoring
     */
    startStatsMonitoring() {
        this.stopStatsMonitoring(); // Clear any existing monitoring

        this.statsInterval = setInterval(() => {
            if (this.isRecording) {
                // This would typically get stats from the recording system
                this.updateStorageIndicator();
                this.updateBandwidthIndicator();
            }
        }, this.options.updateInterval * 2); // Update stats less frequently
    }

    /**
     * Stop stats monitoring
     */
    stopStatsMonitoring() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = null;
        }
    }

    /**
     * Update all indicators
     */
    updateAllIndicators() {
        this.updateFloatingIndicator();
        this.updateCornerIndicator();
        this.updateStatusBar();
        this.updateTimerDisplay();
        this.updateQualityIndicator();
        this.updateStorageIndicator();
        this.updateBandwidthIndicator();
        this.updateErrorIndicator();
        this.updateTimerDisplays();
    }

    /**
     * Update floating indicator
     */
    updateFloatingIndicator() {
        if (!this.floatingIndicator) return;

        const dot = this.floatingIndicator.querySelector('#floating-recording-dot');
        const text = this.floatingIndicator.querySelector('#floating-recording-text');
        const timer = this.floatingIndicator.querySelector('#floating-recording-timer');

        if (this.isRecording) {
            dot.className = this.isPaused ? 'recording-dot paused' : 'recording-dot recording';
            text.textContent = this.isPaused ? 'PAUSED' : 'REC';
            timer.textContent = this.formatDuration(this.recordingDuration);
        } else {
            dot.className = 'recording-dot ready';
            text.textContent = 'READY';
            timer.textContent = '00:00:00';
        }
    }

    /**
     * Update corner indicator
     */
    updateCornerIndicator() {
        if (!this.cornerIndicator) return;

        const dot = this.cornerIndicator.querySelector('#corner-recording-dot');

        if (this.isRecording) {
            dot.className = this.isPaused ? 'corner-dot paused' : 'corner-dot recording';
        } else {
            dot.className = 'corner-dot ready';
        }
    }

    /**
     * Update status bar
     */
    updateStatusBar() {
        if (!this.statusBar) return;

        const dot = this.statusBar.querySelector('#status-recording-dot');
        const text = this.statusBar.querySelector('#status-recording-text');
        const timer = this.statusBar.querySelector('#status-timer-text');

        if (this.isRecording) {
            dot.className = this.isPaused ? 'status-indicator paused' : 'status-indicator recording';
            text.textContent = this.isPaused ? 'Paused' : 'Recording';
            timer.textContent = this.formatDuration(this.recordingDuration);
        } else {
            dot.className = 'status-indicator ready';
            text.textContent = 'Ready';
            timer.textContent = '00:00:00';
        }
    }

    /**
     * Update timer display
     */
    updateTimerDisplay() {
        if (!this.timerDisplay) return;

        const time = this.timerDisplay.querySelector('#timer-display-time');
        const status = this.timerDisplay.querySelector('#timer-display-status');

        time.textContent = this.formatDuration(this.recordingDuration);

        if (this.isRecording) {
            status.textContent = this.isPaused ? 'Paused' : 'Recording';
            this.timerDisplay.className = this.isPaused ? 'recording-timer-display paused' : 'recording-timer-display recording';
        } else {
            status.textContent = 'Ready';
            this.timerDisplay.className = 'recording-timer-display ready';
        }
    }

    /**
     * Update quality indicator
     */
    updateQualityIndicator() {
        if (!this.qualityIndicator) return;

        const badge = this.qualityIndicator.querySelector('#quality-badge-text');
        const resolution = this.qualityIndicator.querySelector('#quality-resolution');
        const format = this.qualityIndicator.querySelector('#quality-format');

        const qualityMap = {
            'low': { badge: 'SD', resolution: '640×480' },
            'medium': { badge: 'HD', resolution: '1280×720' },
            'high': { badge: 'FHD', resolution: '1920×1080' },
            'ultra': { badge: '4K', resolution: '2560×1440' }
        };

        const quality = qualityMap[this.recordingQuality] || qualityMap['medium'];

        badge.textContent = quality.badge;
        resolution.textContent = quality.resolution;
        format.textContent = this.recordingFormat.toUpperCase();
    }

    /**
     * Update storage indicator
     */
    updateStorageIndicator() {
        if (!this.storageIndicator) return;

        const used = this.storageIndicator.querySelector('#storage-used');
        const available = this.storageIndicator.querySelector('#storage-available');
        const progressBar = this.storageIndicator.querySelector('#storage-progress-bar');

        used.textContent = this.formatFileSize(this.recordingSize);

        if (this.availableStorage > 0) {
            available.textContent = this.formatFileSize(this.availableStorage);
            const usagePercent = (this.recordingSize / this.availableStorage) * 100;
            progressBar.style.width = `${Math.min(usagePercent, 100)}%`;

            // Change color based on usage
            if (usagePercent > 90) {
                progressBar.className = 'storage-progress-bar critical';
            } else if (usagePercent > 75) {
                progressBar.className = 'storage-progress-bar warning';
            } else {
                progressBar.className = 'storage-progress-bar normal';
            }
        } else {
            available.textContent = '∞ GB';
            progressBar.style.width = '0%';
        }
    }

    /**
     * Update bandwidth indicator
     */
    updateBandwidthIndicator() {
        if (!this.bandwidthIndicator) return;

        const usage = this.bandwidthIndicator.querySelector('#bandwidth-usage');
        const status = this.bandwidthIndicator.querySelector('#bandwidth-status');
        const bars = this.bandwidthIndicator.querySelectorAll('.bandwidth-bar');

        usage.textContent = `${this.bandwidthUsage.toFixed(1)} Mbps`;

        // Determine status and bar count
        let statusText = 'Good';
        let activeBars = 5;

        if (this.bandwidthUsage < 1) {
            statusText = 'Poor';
            activeBars = 1;
        } else if (this.bandwidthUsage < 3) {
            statusText = 'Fair';
            activeBars = 2;
        } else if (this.bandwidthUsage < 5) {
            statusText = 'Good';
            activeBars = 3;
        } else if (this.bandwidthUsage < 10) {
            statusText = 'Very Good';
            activeBars = 4;
        } else {
            statusText = 'Excellent';
            activeBars = 5;
        }

        status.textContent = statusText;

        // Update bars
        bars.forEach((bar, index) => {
            if (index < activeBars) {
                bar.classList.add('active');

                if (activeBars <= 2) {
                    bar.classList.add('poor');
                } else if (activeBars <= 3) {
                    bar.classList.add('fair');
                } else {
                    bar.classList.add('good');
                }
            } else {
                bar.classList.remove('active', 'poor', 'fair', 'good');
            }
        });
    }

    /**
     * Update error indicator
     */
    updateErrorIndicator() {
        if (!this.errorIndicator) return;

        const message = this.errorIndicator.querySelector('#error-message');

        if (this.errorState) {
            message.textContent = this.errorState.message || 'Recording Error';
        }
    }

    /**
     * Update timer displays
     */
    updateTimerDisplays() {
        const formattedTime = this.formatDuration(this.recordingDuration);

        // Update all timer elements
        document.getElementById('floating-recording-timer')?.textContent = formattedTime;
        document.getElementById('status-timer-text')?.textContent = formattedTime;
        document.getElementById('timer-display-time')?.textContent = formattedTime;
    }

    /**
     * Show indicators
     */
    showIndicators() {
        if (this.floatingIndicator) this.floatingIndicator.style.display = 'block';
        if (this.cornerIndicator) this.cornerIndicator.style.display = 'block';
        if (this.statusBar) this.statusBar.style.display = 'block';
        if (this.timerDisplay) this.timerDisplay.style.display = 'block';
        if (this.qualityIndicator) this.qualityIndicator.style.display = 'block';
        if (this.storageIndicator) this.storageIndicator.style.display = 'block';
        if (this.bandwidthIndicator) this.bandwidthIndicator.style.display = 'block';

        // Clear auto-hide timeout
        if (this.autoHideTimeout) {
            clearTimeout(this.autoHideTimeout);
            this.autoHideTimeout = null;
        }
    }

    /**
     * Hide indicators
     */
    hideIndicators() {
        if (this.floatingIndicator) this.floatingIndicator.style.display = 'none';
        if (this.cornerIndicator) this.cornerIndicator.style.display = 'none';
        if (this.statusBar) this.statusBar.style.display = 'none';
        if (this.timerDisplay) this.timerDisplay.style.display = 'none';
        if (this.qualityIndicator) this.qualityIndicator.style.display = 'none';
        if (this.storageIndicator) this.storageIndicator.style.display = 'none';
        if (this.bandwidthIndicator) this.bandwidthIndicator.style.display = 'none';
    }

    /**
     * Show error indicator
     */
    showErrorIndicator() {
        if (this.errorIndicator) {
            this.errorIndicator.style.display = 'block';
        }
    }

    /**
     * Hide error indicator
     */
    hideErrorIndicator() {
        if (this.errorIndicator) {
            this.errorIndicator.style.display = 'none';
        }
    }

    /**
     * Schedule auto-hide
     */
    scheduleAutoHide() {
        if (this.options.autoHideDelay > 0) {
            this.autoHideTimeout = setTimeout(() => {
                this.hideIndicators();
            }, this.options.autoHideDelay);
        }
    }

    /**
     * Start pulse animation
     */
    startPulseAnimation() {
        this.stopPulseAnimation();

        const elements = [
            this.floatingIndicator?.querySelector('.recording-dot'),
            this.cornerIndicator?.querySelector('.corner-dot'),
            this.statusBar?.querySelector('.status-indicator')
        ].filter(Boolean);

        elements.forEach(element => {
            element.classList.add('pulse-animation');
        });
    }

    /**
     * Stop pulse animation
     */
    stopPulseAnimation() {
        const elements = document.querySelectorAll('.pulse-animation');
        elements.forEach(element => {
            element.classList.remove('pulse-animation');
        });
    }

    /**
     * Start blink animation
     */
    startBlinkAnimation() {
        this.stopBlinkAnimation();

        const elements = [
            this.floatingIndicator?.querySelector('.recording-dot'),
            this.cornerIndicator?.querySelector('.corner-dot'),
            this.statusBar?.querySelector('.status-indicator')
        ].filter(Boolean);

        elements.forEach(element => {
            element.classList.add('blink-animation');
        });
    }

    /**
     * Stop blink animation
     */
    stopBlinkAnimation() {
        const elements = document.querySelectorAll('.blink-animation');
        elements.forEach(element => {
            element.classList.remove('blink-animation');
        });
    }

    /**
     * Format duration in HH:MM:SS format
     */
    formatDuration(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (this.options.timerFormat === 'mm:ss' && hours === 0) {
            return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * Handle visibility change
     */
    handleVisibilityChange() {
        // Pause/resume timer based on page visibility
        if (document.hidden) {
            if (this.isRecording && !this.isPaused) {
                // Page is hidden, but keep recording
                console.log('Page hidden, continuing recording in background');
            }
        } else {
            // Page is visible again
            if (this.isRecording) {
                this.updateAllIndicators();
            }
        }
    }

    /**
     * Handle resize
     */
    handleResize() {
        // Adjust indicator positions for mobile
        if (this.options.enableMobileOptimization) {
            this.adjustForMobile();
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyDown(event) {
        // Allow external systems to handle recording shortcuts
        // This is just for indicator-specific shortcuts

        if (event.ctrlKey && event.shiftKey) {
            switch (event.key) {
                case 'I':
                    event.preventDefault();
                    this.toggleIndicatorsVisibility();
                    break;
                case 'T':
                    event.preventDefault();
                    this.toggleTimerFormat();
                    break;
            }
        }
    }

    /**
     * Handle click events
     */
    handleClick(event) {
        // Emit click event for external handling
        this.emitIndicatorEvent('indicator-clicked', {
            indicator: event.currentTarget.className,
            timestamp: Date.now()
        });
    }

    /**
     * Toggle indicators visibility
     */
    toggleIndicatorsVisibility() {
        const isVisible = this.floatingIndicator?.style.display !== 'none';

        if (isVisible) {
            this.hideIndicators();
        } else {
            this.showIndicators();
        }

        // Emit visibility toggle event
        this.emitIndicatorEvent('visibility-toggled', {
            visible: !isVisible
        });
    }

    /**
     * Toggle timer format
     */
    toggleTimerFormat() {
        this.options.timerFormat = this.options.timerFormat === 'hh:mm:ss' ? 'mm:ss' : 'hh:mm:ss';
        this.updateTimerDisplays();

        // Emit format change event
        this.emitIndicatorEvent('timer-format-changed', {
            format: this.options.timerFormat
        });
    }

    /**
     * Adjust for mobile
     */
    adjustForMobile() {
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            // Adjust indicator sizes and positions for mobile
            this.container.classList.add('mobile-indicators');
        } else {
            this.container.classList.remove('mobile-indicators');
        }
    }

    /**
     * Emit indicator event
     */
    emitIndicatorEvent(eventType, data) {
        const event = new CustomEvent(eventType, {
            detail: {
                ...data,
                indicatorSystem: this
            }
        });

        this.container.dispatchEvent(event);
    }

    /**
     * Handle initialization error
     */
    handleInitializationError(error) {
        console.error('Video Recording Indicators initialization error:', error);

        // Emit error event
        this.emitIndicatorEvent('initialization-error', {
            error: error.message,
            timestamp: Date.now()
        });

        // Announce to accessibility system
        if (this.options.accessibilitySystem) {
            this.options.accessibilitySystem.announce('Recording indicators failed to initialize', 'assertive');
        }
    }

    /**
     * Inject recording indicators CSS
     */
    injectRecordingIndicatorsCSS() {
        if (document.getElementById('recording-indicators-css')) return;

        const style = document.createElement('style');
        style.id = 'recording-indicators-css';
        style.textContent = `
            /* Video Recording Indicators Styles */
            .recording-floating-indicator {
                position: fixed;
                z-index: 9999;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 8px 12px;
                border-radius: 20px;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 0.9rem;
                font-weight: 600;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                user-select: none;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .recording-floating-indicator:hover {
                background: rgba(0, 0, 0, 0.9);
                transform: scale(1.05);
            }

            .recording-floating-indicator.top-left {
                top: 20px;
                left: 20px;
            }

            .recording-floating-indicator.top-right {
                top: 20px;
                right: 20px;
            }

            .recording-floating-indicator.bottom-left {
                bottom: 20px;
                left: 20px;
            }

            .recording-floating-indicator.bottom-right {
                bottom: 20px;
                right: 20px;
            }

            .floating-indicator-content {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .recording-dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                transition: all 0.3s ease;
            }

            .recording-dot.ready {
                background: #6c757d;
            }

            .recording-dot.recording {
                background: var(--primary-color, #ff0000);
            }

            .recording-dot.paused {
                background: #ffc107;
            }

            .recording-corner-indicator {
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 9998;
                width: 20px;
                height: 20px;
                cursor: pointer;
            }

            .corner-dot {
                width: 100%;
                height: 100%;
                border-radius: 50%;
                transition: all 0.3s ease;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            }

            .corner-dot.ready {
                background: #6c757d;
            }

            .corner-dot.recording {
                background: var(--primary-color, #ff0000);
            }

            .corner-dot.paused {
                background: #ffc107;
            }

            .recording-status-bar {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 10px 20px;
                z-index: 9997;
                backdrop-filter: blur(10px);
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }

            .status-bar-content {
                display: flex;
                align-items: center;
                justify-content: space-between;
                max-width: 1200px;
                margin: 0 auto;
                font-size: 0.9rem;
            }

            .status-section {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .status-indicator {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                transition: all 0.3s ease;
            }

            .status-indicator.ready {
                background: #6c757d;
            }

            .status-indicator.recording {
                background: var(--primary-color, #ff0000);
            }

            .status-indicator.paused {
                background: #ffc107;
            }

            .timer-section {
                display: flex;
                align-items: center;
                gap: 6px;
                font-family: 'Courier New', monospace;
                font-weight: bold;
            }

            .info-section {
                display: flex;
                align-items: center;
                gap: 15px;
            }

            .info-item {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 0.8rem;
                color: #aaa;
            }

            .recording-timer-display {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 20px 30px;
                border-radius: 12px;
                text-align: center;
                z-index: 9996;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                user-select: none;
                pointer-events: none;
            }

            .timer-display-content {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
            }

            .timer-icon {
                font-size: 2rem;
                color: var(--primary-color, #ff0000);
            }

            .timer-time {
                font-family: 'Courier New', monospace;
                font-size: 2.5rem;
                font-weight: bold;
                color: white;
            }

            .timer-status {
                font-size: 1rem;
                color: #aaa;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .recording-quality-indicator {
                position: fixed;
                top: 60px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 10px 15px;
                border-radius: 8px;
                z-index: 9995;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                font-size: 0.8rem;
            }

            .quality-indicator-content {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .quality-badge {
                display: flex;
                align-items: center;
                gap: 6px;
                font-weight: bold;
                color: var(--primary-color, #ff0000);
            }

            .quality-details {
                display: flex;
                flex-direction: column;
                gap: 2px;
                color: #aaa;
                font-size: 0.7rem;
            }

            .recording-storage-indicator {
                position: fixed;
                bottom: 60px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 10px 15px;
                border-radius: 8px;
                z-index: 9994;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                font-size: 0.8rem;
                min-width: 150px;
            }

            .storage-indicator-content {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .storage-icon {
                color: var(--primary-color, #ff0000);
                font-size: 1.2rem;
            }

            .storage-info {
                display: flex;
                justify-content: space-between;
                font-size: 0.7rem;
            }

            .storage-used {
                font-weight: bold;
            }

            .storage-available {
                color: #aaa;
            }

            .storage-progress {
                height: 4px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 2px;
                overflow: hidden;
            }

            .storage-progress-bar {
                height: 100%;
                transition: width 0.3s ease;
                border-radius: 2px;
            }

            .storage-progress-bar.normal {
                background: #28a745;
            }

            .storage-progress-bar.warning {
                background: #ffc107;
            }

            .storage-progress-bar.critical {
                background: #dc3545;
            }

            .recording-bandwidth-indicator {
                position: fixed;
                bottom: 120px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 10px 15px;
                border-radius: 8px;
                z-index: 9993;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                font-size: 0.8rem;
                min-width: 120px;
            }

            .bandwidth-indicator-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .bandwidth-icon {
                color: var(--primary-color, #ff0000);
                font-size: 1.2rem;
            }

            .bandwidth-info {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 2px;
            }

            .bandwidth-usage {
                font-weight: bold;
                font-size: 0.7rem;
            }

            .bandwidth-status {
                color: #aaa;
                font-size: 0.6rem;
            }

            .bandwidth-bars {
                display: flex;
                gap: 2px;
                align-items: end;
            }

            .bandwidth-bar {
                width: 3px;
                height: 8px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 1px;
                transition: all 0.3s ease;
            }

            .bandwidth-bar:nth-child(2) { height: 10px; }
            .bandwidth-bar:nth-child(3) { height: 12px; }
            .bandwidth-bar:nth-child(4) { height: 14px; }
            .bandwidth-bar:nth-child(5) { height: 16px; }

            .bandwidth-bar.active.poor {
                background: #dc3545;
            }

            .bandwidth-bar.active.fair {
                background: #ffc107;
            }

            .bandwidth-bar.active.good {
                background: #28a745;
            }

            .recording-error-indicator {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #dc3545;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                z-index: 10000;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                max-width: 400px;
                animation: errorSlideIn 0.3s ease;
            }

            .error-indicator-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .error-icon {
                font-size: 1.5rem;
                color: white;
            }

            .error-message {
                flex: 1;
                font-weight: 500;
            }

            .error-dismiss {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                padding: 4px;
                border-radius: 3px;
                transition: background 0.2s ease;
            }

            .error-dismiss:hover {
                background: rgba(255, 255, 255, 0.2);
            }

            /* Animations */
            .pulse-animation {
                animation: recordingPulse 1s infinite;
            }

            .blink-animation {
                animation: recordingBlink 1s infinite;
            }

            @keyframes recordingPulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.7; transform: scale(1.1); }
            }

            @keyframes recordingBlink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.3; }
            }

            @keyframes errorSlideIn {
                from {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
            }

            /* Mobile Optimizations */
            .mobile-indicators .recording-floating-indicator {
                font-size: 0.8rem;
                padding: 6px 10px;
            }

            .mobile-indicators .recording-status-bar {
                padding: 8px 15px;
            }

            .mobile-indicators .status-bar-content {
                font-size: 0.8rem;
            }

            .mobile-indicators .recording-timer-display {
                padding: 15px 20px;
            }

            .mobile-indicators .timer-time {
                font-size: 2rem;
            }

            .mobile-indicators .recording-quality-indicator,
            .mobile-indicators .recording-storage-indicator,
            .mobile-indicators .recording-bandwidth-indicator {
                position: relative;
                margin: 10px;
                display: inline-block;
            }

            /* High Contrast Mode */
            @media (prefers-contrast: high) {
                .recording-dot,
                .corner-dot,
                .status-indicator {
                    border: 2px solid white;
                }

                .recording-floating-indicator,
                .recording-status-bar,
                .recording-timer-display,
                .recording-quality-indicator,
                .recording-storage-indicator,
                .recording-bandwidth-indicator {
                    border: 2px solid white;
                }
            }

            /* Reduced Motion */
            @media (prefers-reduced-motion: reduce) {
                .pulse-animation,
                .blink-animation {
                    animation: none;
                }

                .recording-dot.recording,
                .corner-dot.recording,
                .status-indicator.recording {
                    background: var(--primary-color, #ff0000) !important;
                }

                .recording-dot.paused,
                .corner-dot.paused,
                .status-indicator.paused {
                    background: #ffc107 !important;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Destroy recording indicators system
     */
    destroy() {
        // Stop timers and intervals
        this.stopTimer();
        this.stopStatsMonitoring();
        this.stopPulseAnimation();
        this.stopBlinkAnimation();

        // Clear timeouts
        if (this.autoHideTimeout) {
            clearTimeout(this.autoHideTimeout);
        }

        // Remove event listeners
        document.removeEventListener('visibilitychange', this.boundEventHandlers.handleVisibilityChange);
        window.removeEventListener('resize', this.boundEventHandlers.handleResize);
        document.removeEventListener('keydown', this.boundEventHandlers.handleKeyDown);

        // Remove UI elements
        if (this.floatingIndicator) this.floatingIndicator.remove();
        if (this.cornerIndicator) this.cornerIndicator.remove();
        if (this.statusBar) this.statusBar.remove();
        if (this.timerDisplay) this.timerDisplay.remove();
        if (this.qualityIndicator) this.qualityIndicator.remove();
        if (this.storageIndicator) this.storageIndicator.remove();
        if (this.bandwidthIndicator) this.bandwidthIndicator.remove();
        if (this.errorIndicator) this.errorIndicator.remove();

        // Remove CSS
        const style = document.getElementById('recording-indicators-css');
        if (style) style.remove();

        console.log('Video Recording Indicators destroyed');
    }
}
