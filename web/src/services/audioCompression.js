class AudioCompression {
    constructor() {
        this.audioContext = null;
        this.compressionNodes = new Map(); // participantId -> compression node
        this.isInitialized = false;
        
        // Compression settings
        this.compressionSettings = {
            // Adaptive bitrate settings
            adaptiveBitrate: {
                enabled: true,
                minBitrate: 32000,  // 32 kbps
                maxBitrate: 320000, // 320 kbps
                targetBitrate: 128000, // 128 kbps
                adaptationInterval: 5000, // 5 seconds
                qualityThreshold: 0.8
            },
            
            // Real-time compression
            realTimeCompression: {
                enabled: true,
                algorithm: 'opus', // 'opus', 'aac', 'mp3'
                quality: 'high', // 'low', 'medium', 'high'
                latency: 'low', // 'low', 'medium', 'high'
                complexity: 5 // 0-10 for Opus
            },
            
            // Dynamic range compression
            dynamicCompression: {
                enabled: true,
                threshold: -24, // dB
                ratio: 4,
                attack: 0.003, // seconds
                release: 0.1, // seconds
                knee: 2,
                makeupGain: 0 // dB
            },
            
            // Perceptual coding
            perceptualCoding: {
                enabled: true,
                psychoacousticModel: 'advanced',
                stereoMode: 'joint', // 'stereo', 'joint', 'mono'
                bandwidthExtension: true
            }
        };
        
        // Network monitoring
        this.networkStats = {
            bandwidth: 0,
            latency: 0,
            packetLoss: 0,
            jitter: 0,
            lastUpdate: Date.now()
        };
        
        // Quality metrics
        this.qualityMetrics = new Map(); // participantId -> metrics
        
        this.initializeAudioContext();
        this.startNetworkMonitoring();
    }

    /**
     * Initialize Web Audio API context
     */
    async initializeAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            this.isInitialized = true;
            console.log('Audio compression initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize audio compression:', error);
        }
    }

    /**
     * Apply real-time audio compression
     */
    applyRealTimeCompression(participantId, sourceNode, targetBitrate = null) {
        if (!this.isInitialized || !sourceNode) return null;

        try {
            const bitrate = targetBitrate || this.compressionSettings.adaptiveBitrate.targetBitrate;
            
            // Create compression node
            const compressionNode = this.createCompressionNode(bitrate);
            
            // Apply dynamic range compression
            const dynamicCompressor = this.createDynamicCompressor();
            
            // Create output node
            const outputNode = this.audioContext.createGain();
            
            // Connect nodes
            sourceNode.connect(dynamicCompressor);
            dynamicCompressor.connect(compressionNode);
            compressionNode.connect(outputNode);
            
            // Store compression setup
            this.compressionNodes.set(participantId, {
                source: sourceNode,
                dynamicCompressor,
                compressionNode,
                output: outputNode,
                currentBitrate: bitrate,
                lastUpdate: Date.now()
            });
            
            // Initialize quality metrics
            this.initializeQualityMetrics(participantId);
            
            console.log(`Real-time compression applied to participant: ${participantId} at ${bitrate} bps`);
            return outputNode;
            
        } catch (error) {
            console.error(`Failed to apply compression for ${participantId}:`, error);
            return sourceNode;
        }
    }

    /**
     * Create compression node (simulated using Web Audio API)
     */
    createCompressionNode(bitrate) {
        // Since Web Audio API doesn't have built-in codec compression,
        // we simulate it using filters and gain control
        const compressionNode = this.audioContext.createGain();
        
        // Simulate compression by adjusting gain based on bitrate
        const compressionRatio = Math.min(1.0, bitrate / this.compressionSettings.adaptiveBitrate.maxBitrate);
        compressionNode.gain.setValueAtTime(compressionRatio, this.audioContext.currentTime);
        
        return compressionNode;
    }

    /**
     * Create dynamic range compressor
     */
    createDynamicCompressor() {
        const compressor = this.audioContext.createDynamicsCompressor();
        const settings = this.compressionSettings.dynamicCompression;
        
        compressor.threshold.setValueAtTime(settings.threshold, this.audioContext.currentTime);
        compressor.knee.setValueAtTime(settings.knee, this.audioContext.currentTime);
        compressor.ratio.setValueAtTime(settings.ratio, this.audioContext.currentTime);
        compressor.attack.setValueAtTime(settings.attack, this.audioContext.currentTime);
        compressor.release.setValueAtTime(settings.release, this.audioContext.currentTime);
        
        return compressor;
    }

    /**
     * Adaptive bitrate adjustment based on network conditions
     */
    adaptBitrate(participantId) {
        const compressionSetup = this.compressionNodes.get(participantId);
        if (!compressionSetup) return;

        try {
            const settings = this.compressionSettings.adaptiveBitrate;
            const metrics = this.qualityMetrics.get(participantId);
            
            if (!metrics) return;
            
            let newBitrate = compressionSetup.currentBitrate;
            
            // Adjust based on network conditions
            if (this.networkStats.packetLoss > 0.05) { // 5% packet loss
                newBitrate = Math.max(settings.minBitrate, newBitrate * 0.8);
            } else if (this.networkStats.packetLoss < 0.01 && metrics.quality > settings.qualityThreshold) {
                newBitrate = Math.min(settings.maxBitrate, newBitrate * 1.2);
            }
            
            // Adjust based on bandwidth
            if (this.networkStats.bandwidth > 0) {
                const maxAllowedBitrate = this.networkStats.bandwidth * 0.7; // Use 70% of available bandwidth
                newBitrate = Math.min(newBitrate, maxAllowedBitrate);
            }
            
            // Apply new bitrate if changed significantly
            if (Math.abs(newBitrate - compressionSetup.currentBitrate) > settings.minBitrate * 0.1) {
                this.updateCompressionBitrate(participantId, newBitrate);
            }
            
        } catch (error) {
            console.error(`Failed to adapt bitrate for ${participantId}:`, error);
        }
    }

    /**
     * Update compression bitrate
     */
    updateCompressionBitrate(participantId, newBitrate) {
        const compressionSetup = this.compressionNodes.get(participantId);
        if (!compressionSetup) return;

        try {
            const compressionRatio = Math.min(1.0, newBitrate / this.compressionSettings.adaptiveBitrate.maxBitrate);
            
            // Smooth transition to new bitrate
            compressionSetup.compressionNode.gain.linearRampToValueAtTime(
                compressionRatio,
                this.audioContext.currentTime + 0.5
            );
            
            compressionSetup.currentBitrate = newBitrate;
            compressionSetup.lastUpdate = Date.now();
            
            console.log(`Bitrate updated for ${participantId}: ${newBitrate} bps`);
            
            // Update quality metrics
            this.updateQualityMetrics(participantId);
            
        } catch (error) {
            console.error(`Failed to update bitrate for ${participantId}:`, error);
        }
    }

    /**
     * Initialize quality metrics for participant
     */
    initializeQualityMetrics(participantId) {
        this.qualityMetrics.set(participantId, {
            quality: 1.0,
            compressionRatio: 1.0,
            latency: 0,
            bitrate: this.compressionSettings.adaptiveBitrate.targetBitrate,
            lastUpdate: Date.now(),
            history: {
                quality: [],
                bitrate: [],
                latency: []
            }
        });
    }

    /**
     * Update quality metrics
     */
    updateQualityMetrics(participantId) {
        const metrics = this.qualityMetrics.get(participantId);
        const compressionSetup = this.compressionNodes.get(participantId);
        
        if (!metrics || !compressionSetup) return;

        try {
            const now = Date.now();
            
            // Calculate quality based on bitrate and network conditions
            const bitrateRatio = compressionSetup.currentBitrate / this.compressionSettings.adaptiveBitrate.maxBitrate;
            const networkQuality = 1.0 - (this.networkStats.packetLoss + this.networkStats.jitter / 100);
            
            metrics.quality = Math.max(0.1, Math.min(1.0, bitrateRatio * networkQuality));
            metrics.bitrate = compressionSetup.currentBitrate;
            metrics.latency = this.networkStats.latency;
            metrics.compressionRatio = 1.0 / bitrateRatio;
            metrics.lastUpdate = now;
            
            // Update history (keep last 60 samples)
            metrics.history.quality.push(metrics.quality);
            metrics.history.bitrate.push(metrics.bitrate);
            metrics.history.latency.push(metrics.latency);
            
            ['quality', 'bitrate', 'latency'].forEach(key => {
                if (metrics.history[key].length > 60) {
                    metrics.history[key].shift();
                }
            });
            
        } catch (error) {
            console.error(`Failed to update quality metrics for ${participantId}:`, error);
        }
    }

    /**
     * Start network monitoring
     */
    startNetworkMonitoring() {
        const updateInterval = this.compressionSettings.adaptiveBitrate.adaptationInterval;
        
        setInterval(() => {
            this.updateNetworkStats();
            
            // Adapt bitrate for all participants
            this.compressionNodes.forEach((_, participantId) => {
                this.adaptBitrate(participantId);
            });
        }, updateInterval);
    }

    /**
     * Update network statistics
     */
    updateNetworkStats() {
        // In a real implementation, this would use WebRTC stats API
        // For now, we'll simulate network conditions
        
        try {
            // Simulate network monitoring
            this.networkStats = {
                bandwidth: Math.random() * 1000000 + 500000, // 0.5-1.5 Mbps
                latency: Math.random() * 100 + 20, // 20-120ms
                packetLoss: Math.random() * 0.05, // 0-5%
                jitter: Math.random() * 20, // 0-20ms
                lastUpdate: Date.now()
            };
            
            // In production, use WebRTC getStats() API:
            // if (window.webrtcConnection) {
            //     window.webrtcConnection.getStats().then(stats => {
            //         // Parse WebRTC stats and update networkStats
            //     });
            // }
            
        } catch (error) {
            console.error('Failed to update network stats:', error);
        }
    }

    /**
     * Get compression settings for participant
     */
    getCompressionSettings(participantId) {
        const compressionSetup = this.compressionNodes.get(participantId);
        const metrics = this.qualityMetrics.get(participantId);
        
        return {
            isActive: !!compressionSetup,
            currentBitrate: compressionSetup?.currentBitrate || 0,
            quality: metrics?.quality || 0,
            compressionRatio: metrics?.compressionRatio || 1,
            networkStats: { ...this.networkStats },
            settings: { ...this.compressionSettings }
        };
    }

    /**
     * Remove compression for participant
     */
    removeCompression(participantId) {
        const compressionSetup = this.compressionNodes.get(participantId);
        if (compressionSetup) {
            // Disconnect nodes
            compressionSetup.dynamicCompressor.disconnect();
            compressionSetup.compressionNode.disconnect();
            compressionSetup.output.disconnect();
            
            this.compressionNodes.delete(participantId);
            this.qualityMetrics.delete(participantId);
            
            console.log(`Compression removed for participant: ${participantId}`);
        }
    }

    /**
     * Cleanup compression
     */
    cleanup() {
        this.compressionNodes.forEach((_, participantId) => {
            this.removeCompression(participantId);
        });
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
    }
}

// Global instance
window.audioCompression = new AudioCompression();
