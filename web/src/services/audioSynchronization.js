class AudioSynchronization {
    constructor() {
        this.audioContext = null;
        this.syncNodes = new Map(); // participantId -> sync node
        this.isInitialized = false;
        
        // Synchronization settings
        this.syncSettings = {
            // Latency compensation
            latencyCompensation: {
                enabled: true,
                maxCompensation: 500, // ms
                adaptiveAdjustment: true,
                measurementInterval: 1000, // ms
                smoothingFactor: 0.1
            },
            
            // Lip-sync correction
            lipSyncCorrection: {
                enabled: true,
                videoAudioOffset: 0, // ms (positive = audio ahead)
                maxCorrection: 200, // ms
                correctionThreshold: 40, // ms
                adaptiveCorrection: true
            },
            
            // Buffer management
            bufferManagement: {
                targetBufferSize: 100, // ms
                minBufferSize: 50, // ms
                maxBufferSize: 300, // ms
                adaptiveBuffering: true,
                dropThreshold: 500 // ms
            },
            
            // Clock synchronization
            clockSync: {
                enabled: true,
                syncInterval: 5000, // ms
                maxClockDrift: 100, // ms
                ntpServers: ['pool.ntp.org'],
                localClockCorrection: true
            }
        };
        
        // Timing measurements
        this.timingData = new Map(); // participantId -> timing data
        
        // Reference clock
        this.referenceClock = {
            offset: 0,
            drift: 0,
            lastSync: Date.now(),
            accuracy: 0
        };
        
        // Audio buffers for synchronization
        this.audioBuffers = new Map(); // participantId -> buffer
        
        this.initializeAudioContext();
        this.startClockSynchronization();
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
            console.log('Audio synchronization initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize audio synchronization:', error);
        }
    }

    /**
     * Apply audio synchronization to participant
     */
    applySynchronization(participantId, sourceNode, videoElement = null) {
        if (!this.isInitialized || !sourceNode) return sourceNode;

        try {
            // Create delay node for latency compensation
            const delayNode = this.audioContext.createDelay(1.0); // Max 1 second delay
            
            // Create buffer source for advanced buffering
            const bufferSource = this.audioContext.createBufferSource();
            
            // Create gain node for volume control during sync
            const gainNode = this.audioContext.createGain();
            
            // Create analyser for timing measurements
            const analyser = this.audioContext.createAnalyser();
            analyser.fftSize = 256;
            
            // Connect nodes
            sourceNode.connect(delayNode);
            delayNode.connect(gainNode);
            gainNode.connect(analyser);
            
            // Create output node
            const outputNode = this.audioContext.createGain();
            analyser.connect(outputNode);
            
            // Store sync setup
            const syncSetup = {
                source: sourceNode,
                delayNode,
                gainNode,
                analyser,
                output: outputNode,
                videoElement,
                currentDelay: 0,
                targetDelay: 0,
                lastMeasurement: Date.now(),
                buffer: []
            };
            
            this.syncNodes.set(participantId, syncSetup);
            
            // Initialize timing data
            this.initializeTimingData(participantId);
            
            // Start synchronization monitoring
            this.startSyncMonitoring(participantId);
            
            console.log(`Audio synchronization applied to participant: ${participantId}`);
            return outputNode;
            
        } catch (error) {
            console.error(`Failed to apply synchronization for ${participantId}:`, error);
            return sourceNode;
        }
    }

    /**
     * Initialize timing data for participant
     */
    initializeTimingData(participantId) {
        this.timingData.set(participantId, {
            latency: 0,
            jitter: 0,
            clockOffset: 0,
            lipSyncOffset: 0,
            bufferLevel: 0,
            dropCount: 0,
            correctionCount: 0,
            lastUpdate: Date.now(),
            history: {
                latency: [],
                jitter: [],
                lipSync: []
            }
        });
    }

    /**
     * Start synchronization monitoring for participant
     */
    startSyncMonitoring(participantId) {
        const interval = this.syncSettings.latencyCompensation.measurementInterval;
        
        const monitor = () => {
            this.measureLatency(participantId);
            this.measureLipSync(participantId);
            this.adjustSynchronization(participantId);
            
            setTimeout(monitor, interval);
        };
        
        monitor();
    }

    /**
     * Measure audio latency
     */
    measureLatency(participantId) {
        const syncSetup = this.syncNodes.get(participantId);
        const timingData = this.timingData.get(participantId);
        
        if (!syncSetup || !timingData) return;

        try {
            // Simulate latency measurement (in production, use WebRTC stats)
            const currentTime = this.audioContext.currentTime * 1000;
            const networkLatency = Math.random() * 100 + 20; // 20-120ms
            
            // Calculate jitter
            const previousLatency = timingData.latency;
            const jitter = Math.abs(networkLatency - previousLatency);
            
            // Update timing data
            timingData.latency = networkLatency;
            timingData.jitter = jitter;
            timingData.lastUpdate = Date.now();
            
            // Update history
            timingData.history.latency.push(networkLatency);
            timingData.history.jitter.push(jitter);
            
            // Keep history size manageable
            if (timingData.history.latency.length > 60) {
                timingData.history.latency.shift();
                timingData.history.jitter.shift();
            }
            
        } catch (error) {
            console.error(`Failed to measure latency for ${participantId}:`, error);
        }
    }

    /**
     * Measure lip-sync offset
     */
    measureLipSync(participantId) {
        const syncSetup = this.syncNodes.get(participantId);
        const timingData = this.timingData.get(participantId);
        
        if (!syncSetup || !timingData || !syncSetup.videoElement) return;

        try {
            const videoElement = syncSetup.videoElement;
            const audioTime = this.audioContext.currentTime;
            const videoTime = videoElement.currentTime;
            
            // Calculate lip-sync offset
            const lipSyncOffset = (audioTime - videoTime) * 1000; // Convert to ms
            
            timingData.lipSyncOffset = lipSyncOffset;
            timingData.history.lipSync.push(lipSyncOffset);
            
            // Keep history size manageable
            if (timingData.history.lipSync.length > 60) {
                timingData.history.lipSync.shift();
            }
            
        } catch (error) {
            console.error(`Failed to measure lip-sync for ${participantId}:`, error);
        }
    }

    /**
     * Adjust synchronization based on measurements
     */
    adjustSynchronization(participantId) {
        const syncSetup = this.syncNodes.get(participantId);
        const timingData = this.timingData.get(participantId);
        
        if (!syncSetup || !timingData) return;

        try {
            let targetDelay = 0;
            
            // Latency compensation
            if (this.syncSettings.latencyCompensation.enabled) {
                const latencyCompensation = Math.min(
                    timingData.latency,
                    this.syncSettings.latencyCompensation.maxCompensation
                );
                targetDelay += latencyCompensation;
            }
            
            // Lip-sync correction
            if (this.syncSettings.lipSyncCorrection.enabled && syncSetup.videoElement) {
                const lipSyncCorrection = this.calculateLipSyncCorrection(timingData.lipSyncOffset);
                targetDelay += lipSyncCorrection;
            }
            
            // Apply clock synchronization offset
            targetDelay += this.referenceClock.offset;
            
            // Smooth adjustment
            const smoothingFactor = this.syncSettings.latencyCompensation.smoothingFactor;
            const smoothedDelay = syncSetup.currentDelay * (1 - smoothingFactor) + targetDelay * smoothingFactor;
            
            // Apply delay if change is significant
            if (Math.abs(smoothedDelay - syncSetup.currentDelay) > 5) { // 5ms threshold
                this.applyDelay(participantId, smoothedDelay);
                timingData.correctionCount++;
            }
            
        } catch (error) {
            console.error(`Failed to adjust synchronization for ${participantId}:`, error);
        }
    }

    /**
     * Calculate lip-sync correction
     */
    calculateLipSyncCorrection(lipSyncOffset) {
        const settings = this.syncSettings.lipSyncCorrection;
        
        if (Math.abs(lipSyncOffset) < settings.correctionThreshold) {
            return 0; // No correction needed
        }
        
        // Apply correction with limits
        let correction = -lipSyncOffset; // Negative to compensate
        correction = Math.max(-settings.maxCorrection, Math.min(settings.maxCorrection, correction));
        
        return correction;
    }

    /**
     * Apply delay to audio
     */
    applyDelay(participantId, delayMs) {
        const syncSetup = this.syncNodes.get(participantId);
        if (!syncSetup) return;

        try {
            const delaySeconds = Math.max(0, delayMs / 1000);
            
            // Smooth transition to new delay
            syncSetup.delayNode.delayTime.linearRampToValueAtTime(
                delaySeconds,
                this.audioContext.currentTime + 0.1
            );
            
            syncSetup.currentDelay = delayMs;
            syncSetup.targetDelay = delayMs;
            
            console.log(`Applied ${delayMs}ms delay to participant: ${participantId}`);
            
        } catch (error) {
            console.error(`Failed to apply delay for ${participantId}:`, error);
        }
    }

    /**
     * Start clock synchronization
     */
    startClockSynchronization() {
        if (!this.syncSettings.clockSync.enabled) return;
        
        const syncInterval = this.syncSettings.clockSync.syncInterval;
        
        const syncClock = () => {
            this.synchronizeWithReference();
            setTimeout(syncClock, syncInterval);
        };
        
        syncClock();
    }

    /**
     * Synchronize with reference clock
     */
    async synchronizeWithReference() {
        try {
            // In production, this would sync with NTP servers
            // For now, we'll simulate clock synchronization
            
            const localTime = Date.now();
            const networkDelay = Math.random() * 50 + 10; // 10-60ms
            
            // Simulate reference time
            const referenceTime = localTime + networkDelay;
            
            // Calculate offset and drift
            const offset = referenceTime - localTime;
            const timeSinceLastSync = localTime - this.referenceClock.lastSync;
            const drift = timeSinceLastSync > 0 ? offset / timeSinceLastSync : 0;
            
            // Update reference clock
            this.referenceClock.offset = offset;
            this.referenceClock.drift = drift;
            this.referenceClock.lastSync = localTime;
            this.referenceClock.accuracy = networkDelay;
            
            console.log(`Clock synchronized: offset=${offset}ms, drift=${drift}ms/ms`);
            
        } catch (error) {
            console.error('Failed to synchronize clock:', error);
        }
    }

    /**
     * Get synchronization status for participant
     */
    getSyncStatus(participantId) {
        const syncSetup = this.syncNodes.get(participantId);
        const timingData = this.timingData.get(participantId);
        
        return {
            isActive: !!syncSetup,
            currentDelay: syncSetup?.currentDelay || 0,
            latency: timingData?.latency || 0,
            jitter: timingData?.jitter || 0,
            lipSyncOffset: timingData?.lipSyncOffset || 0,
            correctionCount: timingData?.correctionCount || 0,
            clockOffset: this.referenceClock.offset,
            settings: { ...this.syncSettings }
        };
    }

    /**
     * Remove synchronization for participant
     */
    removeSynchronization(participantId) {
        const syncSetup = this.syncNodes.get(participantId);
        if (syncSetup) {
            // Disconnect nodes
            syncSetup.delayNode.disconnect();
            syncSetup.gainNode.disconnect();
            syncSetup.analyser.disconnect();
            syncSetup.output.disconnect();
            
            this.syncNodes.delete(participantId);
            this.timingData.delete(participantId);
            
            console.log(`Synchronization removed for participant: ${participantId}`);
        }
    }

    /**
     * Cleanup synchronization
     */
    cleanup() {
        this.syncNodes.forEach((_, participantId) => {
            this.removeSynchronization(participantId);
        });
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
    }
}

// Global instance
window.audioSynchronization = new AudioSynchronization();
