class QualitySelector {
    constructor(videoPlayer) {
        this.player = videoPlayer;
        this.video = videoPlayer.video;
        this.container = videoPlayer.container;
        
        // Quality state
        this.availableQualities = [];
        this.currentQuality = 'auto';
        this.autoQualityEnabled = true;
        this.bandwidthHistory = [];
        this.qualitySwitchInProgress = false;
        
        // Quality thresholds (bits per second)
        this.qualityThresholds = {
            '240p': 400000,    // 400 Kbps
            '360p': 800000,    // 800 Kbps
            '480p': 1200000,   // 1.2 Mbps
            '720p': 2500000,   // 2.5 Mbps
            '1080p': 5000000,  // 5 Mbps
            '1440p': 8000000,  // 8 Mbps
            '2160p': 16000000  // 16 Mbps
        };

        // Quality metadata
        this.qualityInfo = {
            '240p': { width: 426, height: 240, label: '240p', bitrate: 400000 },
            '360p': { width: 640, height: 360, label: '360p', bitrate: 800000 },
            '480p': { width: 854, height: 480, label: '480p', bitrate: 1200000 },
            '720p': { width: 1280, height: 720, label: '720p HD', bitrate: 2500000 },
            '1080p': { width: 1920, height: 1080, label: '1080p Full HD', bitrate: 5000000 },
            '1440p': { width: 2560, height: 1440, label: '1440p 2K', bitrate: 8000000 },
            '2160p': { width: 3840, height: 2160, label: '2160p 4K', bitrate: 16000000 }
        };

        this.initializeQualitySelector();
    }

    initializeQualitySelector() {
        // Monitor network conditions for auto quality
        this.startBandwidthMonitoring();
        
        // Listen for video events
        this.video.addEventListener('loadstart', () => this.onVideoLoadStart());
        this.video.addEventListener('canplay', () => this.onVideoCanPlay());
        this.video.addEventListener('progress', () => this.onVideoProgress());
        this.video.addEventListener('stalled', () => this.onVideoStalled());
        this.video.addEventListener('waiting', () => this.onVideoWaiting());
        
        // Enhanced quality menu
        this.enhanceQualityMenu();
        
        // Auto quality adjustment
        this.startAutoQualityMonitoring();
    }

    enhanceQualityMenu() {
        const qualityMenu = this.player.qualityMenu;
        
        // Clear existing menu
        qualityMenu.innerHTML = '';
        
        // Add auto option
        const autoOption = this.createQualityOption('auto', 'Auto', true);
        qualityMenu.appendChild(autoOption);
        
        // Add separator
        const separator = document.createElement('div');
        separator.style.cssText = `
            height: 1px;
            background: rgba(255, 255, 255, 0.2);
            margin: 4px 0;
        `;
        qualityMenu.appendChild(separator);
        
        // Add quality options (will be populated when video loads)
        this.qualityOptionsContainer = document.createElement('div');
        qualityMenu.appendChild(this.qualityOptionsContainer);
    }

    createQualityOption(quality, label, isActive = false) {
        const option = document.createElement('div');
        option.className = `quality-option ${isActive ? 'active' : ''}`;
        option.dataset.quality = quality;
        
        const qualityInfo = this.qualityInfo[quality];
        const bitrateText = qualityInfo ? this.formatBitrate(qualityInfo.bitrate) : '';
        
        option.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <span>${label}</span>
                ${bitrateText ? `<small style="color: #999; font-size: 11px;">${bitrateText}</small>` : ''}
            </div>
        `;
        
        option.addEventListener('click', () => this.selectQuality(quality));
        
        return option;
    }

    async loadAvailableQualities(recordingId) {
        try {
            // Fetch available qualities from API
            const response = await fetch(`/api/videos/${recordingId}/qualities`, {
                headers: {
                    'Authorization': `Bearer ${this.player.getAuthToken()}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.availableQualities = result.data.qualities;
                    this.updateQualityMenu();
                    return;
                }
            }
            
            // Fallback: detect qualities from video sources
            this.detectQualitiesFromSources();
            
        } catch (error) {
            console.error('Error loading qualities:', error);
            this.detectQualitiesFromSources();
        }
    }

    detectQualitiesFromSources() {
        const sources = this.video.querySelectorAll('source');
        this.availableQualities = [];
        
        sources.forEach(source => {
            const quality = source.getAttribute('data-quality');
            if (quality && this.qualityInfo[quality]) {
                this.availableQualities.push({
                    quality: quality,
                    src: source.src,
                    type: source.type,
                    ...this.qualityInfo[quality]
                });
            }
        });
        
        // Sort by bitrate (highest first)
        this.availableQualities.sort((a, b) => b.bitrate - a.bitrate);
        this.updateQualityMenu();
    }

    updateQualityMenu() {
        this.qualityOptionsContainer.innerHTML = '';
        
        this.availableQualities.forEach(quality => {
            const option = this.createQualityOption(
                quality.quality, 
                quality.label,
                quality.quality === this.currentQuality
            );
            this.qualityOptionsContainer.appendChild(option);
        });
    }

    async selectQuality(quality) {
        if (this.qualitySwitchInProgress) return;
        
        this.qualitySwitchInProgress = true;
        
        try {
            if (quality === 'auto') {
                this.enableAutoQuality();
            } else {
                this.disableAutoQuality();
                await this.switchToQuality(quality);
            }
            
            this.updateActiveQualityOption(quality);
            this.player.qualityText.textContent = quality === 'auto' ? 'Auto' : this.qualityInfo[quality]?.label || quality;
            
        } catch (error) {
            console.error('Error switching quality:', error);
            this.showQualityError('Failed to switch quality');
        } finally {
            this.qualitySwitchInProgress = false;
        }
    }

    async switchToQuality(targetQuality) {
        const qualityData = this.availableQualities.find(q => q.quality === targetQuality);
        if (!qualityData) {
            throw new Error(`Quality ${targetQuality} not available`);
        }

        // Store current playback state
        const currentTime = this.video.currentTime;
        const wasPlaying = !this.video.paused;
        
        // Show loading indicator
        this.player.showLoading();
        
        try {
            // Switch video source
            await this.changeVideoSource(qualityData.src, qualityData.type);
            
            // Restore playback state
            this.video.currentTime = currentTime;
            
            if (wasPlaying) {
                await this.video.play();
            }
            
            this.currentQuality = targetQuality;
            this.logQualitySwitch(targetQuality, 'manual');
            
        } catch (error) {
            this.player.hideLoading();
            throw error;
        }
    }

    changeVideoSource(src, type) {
        return new Promise((resolve, reject) => {
            const handleCanPlay = () => {
                this.video.removeEventListener('canplay', handleCanPlay);
                this.video.removeEventListener('error', handleError);
                this.player.hideLoading();
                resolve();
            };

            const handleError = () => {
                this.video.removeEventListener('canplay', handleCanPlay);
                this.video.removeEventListener('error', handleError);
                this.player.hideLoading();
                reject(new Error('Failed to load video source'));
            };

            this.video.addEventListener('canplay', handleCanPlay);
            this.video.addEventListener('error', handleError);

            // Clear existing sources
            this.video.innerHTML = '';
            
            // Add new source
            const source = document.createElement('source');
            source.src = src;
            source.type = type;
            this.video.appendChild(source);
            
            // Trigger load
            this.video.load();
        });
    }

    enableAutoQuality() {
        this.autoQualityEnabled = true;
        this.currentQuality = 'auto';
        this.startAutoQualityAdjustment();
    }

    disableAutoQuality() {
        this.autoQualityEnabled = false;
        this.stopAutoQualityAdjustment();
    }

    startBandwidthMonitoring() {
        // Monitor download progress to estimate bandwidth
        this.video.addEventListener('progress', () => {
            if (this.video.buffered.length > 0) {
                const bufferedEnd = this.video.buffered.end(0);
                const bufferedStart = this.video.buffered.start(0);
                const bufferedDuration = bufferedEnd - bufferedStart;
                
                if (bufferedDuration > 0) {
                    // Estimate bandwidth based on buffered data
                    this.estimateBandwidth(bufferedDuration);
                }
            }
        });
    }

    estimateBandwidth(bufferedDuration) {
        // Simple bandwidth estimation
        const currentQualityData = this.availableQualities.find(q => q.quality === this.currentQuality);
        if (!currentQualityData) return;

        const estimatedBandwidth = (currentQualityData.bitrate * bufferedDuration) / bufferedDuration;
        
        this.bandwidthHistory.push({
            timestamp: Date.now(),
            bandwidth: estimatedBandwidth
        });

        // Keep only recent measurements (last 30 seconds)
        const thirtySecondsAgo = Date.now() - 30000;
        this.bandwidthHistory = this.bandwidthHistory.filter(entry => entry.timestamp > thirtySecondsAgo);
    }

    getAverageBandwidth() {
        if (this.bandwidthHistory.length === 0) return 0;
        
        const sum = this.bandwidthHistory.reduce((total, entry) => total + entry.bandwidth, 0);
        return sum / this.bandwidthHistory.length;
    }

    startAutoQualityMonitoring() {
        this.autoQualityInterval = setInterval(() => {
            if (this.autoQualityEnabled && !this.qualitySwitchInProgress) {
                this.adjustQualityBasedOnConditions();
            }
        }, 5000); // Check every 5 seconds
    }

    stopAutoQualityAdjustment() {
        if (this.autoQualityInterval) {
            clearInterval(this.autoQualityInterval);
            this.autoQualityInterval = null;
        }
    }

    adjustQualityBasedOnConditions() {
        const avgBandwidth = this.getAverageBandwidth();
        const bufferHealth = this.getBufferHealth();
        const networkCondition = this.assessNetworkCondition();
        
        const optimalQuality = this.calculateOptimalQuality(avgBandwidth, bufferHealth, networkCondition);
        
        if (optimalQuality && optimalQuality !== this.currentQuality) {
            this.switchToQuality(optimalQuality).then(() => {
                this.logQualitySwitch(optimalQuality, 'auto', {
                    bandwidth: avgBandwidth,
                    bufferHealth: bufferHealth,
                    networkCondition: networkCondition
                });
            }).catch(error => {
                console.error('Auto quality switch failed:', error);
            });
        }
    }

    calculateOptimalQuality(bandwidth, bufferHealth, networkCondition) {
        // Conservative approach: choose quality that uses 70% of available bandwidth
        const targetBandwidth = bandwidth * 0.7;
        
        // Adjust based on buffer health
        let qualityMultiplier = 1;
        if (bufferHealth < 0.3) {
            qualityMultiplier = 0.7; // Lower quality if buffer is low
        } else if (bufferHealth > 0.8) {
            qualityMultiplier = 1.2; // Higher quality if buffer is healthy
        }
        
        const adjustedBandwidth = targetBandwidth * qualityMultiplier;
        
        // Find the highest quality that fits within bandwidth
        for (let i = 0; i < this.availableQualities.length; i++) {
            const quality = this.availableQualities[i];
            if (quality.bitrate <= adjustedBandwidth) {
                return quality.quality;
            }
        }
        
        // Fallback to lowest quality
        return this.availableQualities[this.availableQualities.length - 1]?.quality;
    }

    getBufferHealth() {
        if (this.video.buffered.length === 0) return 0;
        
        const bufferedEnd = this.video.buffered.end(0);
        const currentTime = this.video.currentTime;
        const bufferAhead = bufferedEnd - currentTime;
        
        // Normalize to 0-1 scale (10 seconds = healthy)
        return Math.min(1, bufferAhead / 10);
    }

    assessNetworkCondition() {
        // Use Network Information API if available
        if ('connection' in navigator) {
            const connection = navigator.connection;
            return {
                effectiveType: connection.effectiveType,
                downlink: connection.downlink,
                rtt: connection.rtt
            };
        }
        
        return { effectiveType: 'unknown' };
    }

    updateActiveQualityOption(quality) {
        this.player.qualityMenu.querySelectorAll('.quality-option').forEach(option => {
            option.classList.remove('active');
            if (option.dataset.quality === quality) {
                option.classList.add('active');
            }
        });
    }

    logQualitySwitch(quality, reason, metadata = {}) {
        console.log('Quality switched:', {
            quality: quality,
            reason: reason,
            timestamp: new Date().toISOString(),
            metadata: metadata
        });
        
        // Send analytics if needed
        this.sendQualityAnalytics(quality, reason, metadata);
    }

    sendQualityAnalytics(quality, reason, metadata) {
        // Implementation for sending quality switch analytics
        // This could be sent to your analytics service
    }

    showQualityError(message) {
        // Show temporary error message
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(220, 53, 69, 0.9);
            color: white;
            padding: 10px 15px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 1000;
        `;
        errorDiv.textContent = message;
        
        this.container.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 3000);
    }

    formatBitrate(bitrate) {
        if (bitrate >= 1000000) {
            return `${(bitrate / 1000000).toFixed(1)} Mbps`;
        } else {
            return `${(bitrate / 1000).toFixed(0)} Kbps`;
        }
    }

    // Event handlers
    onVideoLoadStart() {
        this.detectQualitiesFromSources();
    }

    onVideoCanPlay() {
        if (this.autoQualityEnabled) {
            this.startAutoQualityAdjustment();
        }
    }

    onVideoProgress() {
        // Bandwidth monitoring is handled in startBandwidthMonitoring
    }

    onVideoStalled() {
        if (this.autoQualityEnabled && !this.qualitySwitchInProgress) {
            // Consider lowering quality if video stalls
            this.handleVideoStall();
        }
    }

    onVideoWaiting() {
        if (this.autoQualityEnabled && !this.qualitySwitchInProgress) {
            // Consider lowering quality if video is buffering
            this.handleVideoBuffering();
        }
    }

    handleVideoStall() {
        // Lower quality to prevent further stalling
        const currentIndex = this.availableQualities.findIndex(q => q.quality === this.currentQuality);
        if (currentIndex < this.availableQualities.length - 1) {
            const lowerQuality = this.availableQualities[currentIndex + 1];
            this.switchToQuality(lowerQuality.quality).then(() => {
                this.logQualitySwitch(lowerQuality.quality, 'stall_recovery');
            });
        }
    }

    handleVideoBuffering() {
        // Similar to stall handling but less aggressive
        setTimeout(() => {
            if (this.video.readyState < 3) { // Still buffering after delay
                this.handleVideoStall();
            }
        }, 2000);
    }

    // Public API
    getCurrentQuality() {
        return this.currentQuality;
    }

    getAvailableQualities() {
        return this.availableQualities;
    }

    isAutoQualityEnabled() {
        return this.autoQualityEnabled;
    }

    destroy() {
        this.stopAutoQualityAdjustment();
        this.bandwidthHistory = [];
    }
}
