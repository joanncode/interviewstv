class AudioFallback {
    constructor() {
        this.audioContext = null;
        this.fallbackNodes = new Map(); // participantId -> fallback setup
        this.isInitialized = false;
        
        // Fallback settings
        this.fallbackSettings = {
            // Device switching
            deviceSwitching: {
                enabled: true,
                autoSwitch: true,
                switchThreshold: 3, // failures before switching
                testInterval: 5000, // ms
                fallbackDevices: []
            },
            
            // Quality degradation
            qualityDegradation: {
                enabled: true,
                steps: [
                    { quality: 'high', sampleRate: 48000, bitrate: 320000 },
                    { quality: 'medium', sampleRate: 44100, bitrate: 128000 },
                    { quality: 'low', sampleRate: 22050, bitrate: 64000 },
                    { quality: 'minimal', sampleRate: 16000, bitrate: 32000 }
                ],
                degradationThreshold: 0.3, // quality score
                recoveryThreshold: 0.7
            },
            
            // Connection fallback
            connectionFallback: {
                enabled: true,
                fallbackMethods: ['webrtc', 'websocket', 'polling'],
                retryAttempts: 3,
                retryDelay: 2000, // ms
                timeoutDuration: 10000 // ms
            },
            
            // Audio backup
            audioBackup: {
                enabled: true,
                backupSources: ['microphone', 'system', 'file'],
                silenceDetection: true,
                silenceThreshold: 0.01,
                silenceDuration: 5000 // ms
            }
        };
        
        // Device monitoring
        this.deviceStatus = new Map(); // deviceId -> status
        this.availableDevices = [];
        this.currentDevices = new Map(); // participantId -> deviceId
        
        // Quality monitoring
        this.qualityHistory = new Map(); // participantId -> quality history
        
        // Connection status
        this.connectionStatus = {
            primary: 'connected',
            fallback: 'standby',
            lastFailure: null,
            failureCount: 0
        };
        
        this.initializeAudioContext();
        this.initializeDeviceMonitoring();
        this.startQualityMonitoring();
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
            console.log('Audio fallback initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize audio fallback:', error);
        }
    }

    /**
     * Initialize device monitoring
     */
    async initializeDeviceMonitoring() {
        try {
            // Get available audio devices
            await this.updateAvailableDevices();
            
            // Monitor device changes
            navigator.mediaDevices.addEventListener('devicechange', () => {
                this.handleDeviceChange();
            });
            
            console.log('Device monitoring initialized');
            
        } catch (error) {
            console.error('Failed to initialize device monitoring:', error);
        }
    }

    /**
     * Update available audio devices
     */
    async updateAvailableDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.availableDevices = devices.filter(device => device.kind === 'audioinput');
            
            // Update device status
            this.availableDevices.forEach(device => {
                if (!this.deviceStatus.has(device.deviceId)) {
                    this.deviceStatus.set(device.deviceId, {
                        id: device.deviceId,
                        label: device.label,
                        status: 'available',
                        failureCount: 0,
                        lastTest: null,
                        quality: 1.0
                    });
                }
            });
            
            console.log(`Found ${this.availableDevices.length} audio input devices`);
            
        } catch (error) {
            console.error('Failed to update available devices:', error);
        }
    }

    /**
     * Apply fallback mechanisms to participant
     */
    applyFallback(participantId, sourceNode, deviceId = null) {
        if (!this.isInitialized || !sourceNode) return sourceNode;

        try {
            // Create fallback node chain
            const gainNode = this.audioContext.createGain();
            const analyser = this.audioContext.createAnalyser();
            analyser.fftSize = 256;
            
            // Create backup audio source
            const backupGain = this.audioContext.createGain();
            backupGain.gain.setValueAtTime(0, this.audioContext.currentTime); // Start muted
            
            // Create output mixer
            const outputNode = this.audioContext.createGain();
            
            // Connect primary path
            sourceNode.connect(gainNode);
            gainNode.connect(analyser);
            analyser.connect(outputNode);
            
            // Connect backup path
            backupGain.connect(outputNode);
            
            // Store fallback setup
            const fallbackSetup = {
                source: sourceNode,
                gainNode,
                analyser,
                backupGain,
                output: outputNode,
                currentDevice: deviceId,
                backupDevice: null,
                qualityLevel: 0, // Start with highest quality
                isUsingFallback: false,
                lastFailure: null,
                failureCount: 0
            };
            
            this.fallbackNodes.set(participantId, fallbackSetup);
            this.currentDevices.set(participantId, deviceId);
            
            // Initialize quality history
            this.qualityHistory.set(participantId, []);
            
            // Start monitoring
            this.startParticipantMonitoring(participantId);
            
            console.log(`Audio fallback applied to participant: ${participantId}`);
            return outputNode;
            
        } catch (error) {
            console.error(`Failed to apply fallback for ${participantId}:`, error);
            return sourceNode;
        }
    }

    /**
     * Start monitoring for specific participant
     */
    startParticipantMonitoring(participantId) {
        const monitor = () => {
            this.checkAudioQuality(participantId);
            this.checkDeviceStatus(participantId);
            this.checkSilence(participantId);
            
            setTimeout(monitor, 1000); // Check every second
        };
        
        monitor();
    }

    /**
     * Check audio quality and trigger fallback if needed
     */
    checkAudioQuality(participantId) {
        const fallbackSetup = this.fallbackNodes.get(participantId);
        if (!fallbackSetup) return;

        try {
            // Get audio data
            const bufferLength = fallbackSetup.analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            fallbackSetup.analyser.getByteFrequencyData(dataArray);
            
            // Calculate quality metrics
            const quality = this.calculateAudioQuality(dataArray);
            
            // Update quality history
            const history = this.qualityHistory.get(participantId);
            history.push(quality);
            if (history.length > 30) { // Keep last 30 samples
                history.shift();
            }
            
            // Check if quality degradation is needed
            const avgQuality = history.reduce((sum, q) => sum + q, 0) / history.length;
            
            if (avgQuality < this.fallbackSettings.qualityDegradation.degradationThreshold) {
                this.degradeQuality(participantId);
            } else if (avgQuality > this.fallbackSettings.qualityDegradation.recoveryThreshold) {
                this.improveQuality(participantId);
            }
            
        } catch (error) {
            console.error(`Failed to check audio quality for ${participantId}:`, error);
        }
    }

    /**
     * Calculate audio quality from frequency data
     */
    calculateAudioQuality(dataArray) {
        let totalEnergy = 0;
        let voiceEnergy = 0;
        
        for (let i = 0; i < dataArray.length; i++) {
            const frequency = i * (this.audioContext.sampleRate / 2) / dataArray.length;
            const amplitude = dataArray[i] / 255;
            
            totalEnergy += amplitude;
            
            // Voice frequency range (300-3400 Hz)
            if (frequency >= 300 && frequency <= 3400) {
                voiceEnergy += amplitude;
            }
        }
        
        // Quality based on voice energy ratio and total energy
        const voiceRatio = totalEnergy > 0 ? voiceEnergy / totalEnergy : 0;
        const energyLevel = Math.min(1, totalEnergy / dataArray.length);
        
        return Math.min(1, voiceRatio * energyLevel * 2);
    }

    /**
     * Degrade audio quality
     */
    degradeQuality(participantId) {
        const fallbackSetup = this.fallbackNodes.get(participantId);
        if (!fallbackSetup) return;

        const steps = this.fallbackSettings.qualityDegradation.steps;
        const currentLevel = fallbackSetup.qualityLevel;
        
        if (currentLevel < steps.length - 1) {
            fallbackSetup.qualityLevel++;
            const newQuality = steps[fallbackSetup.qualityLevel];
            
            console.log(`Degrading audio quality for ${participantId} to ${newQuality.quality}`);
            
            // Apply quality changes (in production, this would involve resampling)
            const qualityFactor = newQuality.bitrate / steps[0].bitrate;
            fallbackSetup.gainNode.gain.setValueAtTime(
                qualityFactor,
                this.audioContext.currentTime
            );
        }
    }

    /**
     * Improve audio quality
     */
    improveQuality(participantId) {
        const fallbackSetup = this.fallbackNodes.get(participantId);
        if (!fallbackSetup) return;

        const steps = this.fallbackSettings.qualityDegradation.steps;
        const currentLevel = fallbackSetup.qualityLevel;
        
        if (currentLevel > 0) {
            fallbackSetup.qualityLevel--;
            const newQuality = steps[fallbackSetup.qualityLevel];
            
            console.log(`Improving audio quality for ${participantId} to ${newQuality.quality}`);
            
            // Apply quality changes
            const qualityFactor = newQuality.bitrate / steps[0].bitrate;
            fallbackSetup.gainNode.gain.setValueAtTime(
                qualityFactor,
                this.audioContext.currentTime
            );
        }
    }

    /**
     * Check device status
     */
    checkDeviceStatus(participantId) {
        const currentDeviceId = this.currentDevices.get(participantId);
        if (!currentDeviceId) return;

        const deviceStatus = this.deviceStatus.get(currentDeviceId);
        if (!deviceStatus) return;

        // Test device periodically
        const now = Date.now();
        const testInterval = this.fallbackSettings.deviceSwitching.testInterval;
        
        if (!deviceStatus.lastTest || now - deviceStatus.lastTest > testInterval) {
            this.testDevice(currentDeviceId, participantId);
        }
    }

    /**
     * Test audio device
     */
    async testDevice(deviceId, participantId) {
        try {
            const deviceStatus = this.deviceStatus.get(deviceId);
            if (!deviceStatus) return;

            // Try to access the device
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { deviceId: { exact: deviceId } }
            });
            
            // Test successful
            deviceStatus.status = 'available';
            deviceStatus.failureCount = 0;
            deviceStatus.lastTest = Date.now();
            
            // Clean up test stream
            stream.getTracks().forEach(track => track.stop());
            
        } catch (error) {
            console.error(`Device test failed for ${deviceId}:`, error);
            
            const deviceStatus = this.deviceStatus.get(deviceId);
            if (deviceStatus) {
                deviceStatus.status = 'failed';
                deviceStatus.failureCount++;
                deviceStatus.lastTest = Date.now();
                
                // Switch device if threshold reached
                if (deviceStatus.failureCount >= this.fallbackSettings.deviceSwitching.switchThreshold) {
                    this.switchToFallbackDevice(participantId);
                }
            }
        }
    }

    /**
     * Switch to fallback device
     */
    async switchToFallbackDevice(participantId) {
        try {
            const fallbackSetup = this.fallbackNodes.get(participantId);
            if (!fallbackSetup) return;

            // Find best available device
            const availableDevices = this.availableDevices.filter(device => {
                const status = this.deviceStatus.get(device.deviceId);
                return status && status.status === 'available';
            });
            
            if (availableDevices.length === 0) {
                console.warn(`No fallback devices available for ${participantId}`);
                return;
            }
            
            // Select device with best quality
            const bestDevice = availableDevices.reduce((best, device) => {
                const status = this.deviceStatus.get(device.deviceId);
                const bestStatus = this.deviceStatus.get(best.deviceId);
                return status.quality > bestStatus.quality ? device : best;
            });
            
            console.log(`Switching to fallback device for ${participantId}: ${bestDevice.label}`);
            
            // Update current device
            this.currentDevices.set(participantId, bestDevice.deviceId);
            fallbackSetup.currentDevice = bestDevice.deviceId;
            fallbackSetup.isUsingFallback = true;
            
        } catch (error) {
            console.error(`Failed to switch to fallback device for ${participantId}:`, error);
        }
    }

    /**
     * Check for silence and activate backup if needed
     */
    checkSilence(participantId) {
        if (!this.fallbackSettings.audioBackup.silenceDetection) return;

        const fallbackSetup = this.fallbackNodes.get(participantId);
        if (!fallbackSetup) return;

        try {
            // Get audio level
            const bufferLength = fallbackSetup.analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            fallbackSetup.analyser.getByteTimeDomainData(dataArray);
            
            // Calculate RMS level
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                const sample = (dataArray[i] - 128) / 128;
                sum += sample * sample;
            }
            const rms = Math.sqrt(sum / bufferLength);
            
            // Check silence threshold
            const isSilent = rms < this.fallbackSettings.audioBackup.silenceThreshold;
            
            if (isSilent) {
                if (!fallbackSetup.silenceStart) {
                    fallbackSetup.silenceStart = Date.now();
                } else {
                    const silenceDuration = Date.now() - fallbackSetup.silenceStart;
                    if (silenceDuration > this.fallbackSettings.audioBackup.silenceDuration) {
                        this.activateAudioBackup(participantId);
                    }
                }
            } else {
                fallbackSetup.silenceStart = null;
                this.deactivateAudioBackup(participantId);
            }
            
        } catch (error) {
            console.error(`Failed to check silence for ${participantId}:`, error);
        }
    }

    /**
     * Activate audio backup
     */
    activateAudioBackup(participantId) {
        const fallbackSetup = this.fallbackNodes.get(participantId);
        if (!fallbackSetup || fallbackSetup.backupActive) return;

        try {
            // Fade in backup audio
            fallbackSetup.backupGain.gain.linearRampToValueAtTime(
                0.5,
                this.audioContext.currentTime + 1.0
            );
            
            fallbackSetup.backupActive = true;
            console.log(`Audio backup activated for ${participantId}`);
            
        } catch (error) {
            console.error(`Failed to activate audio backup for ${participantId}:`, error);
        }
    }

    /**
     * Deactivate audio backup
     */
    deactivateAudioBackup(participantId) {
        const fallbackSetup = this.fallbackNodes.get(participantId);
        if (!fallbackSetup || !fallbackSetup.backupActive) return;

        try {
            // Fade out backup audio
            fallbackSetup.backupGain.gain.linearRampToValueAtTime(
                0,
                this.audioContext.currentTime + 1.0
            );
            
            fallbackSetup.backupActive = false;
            console.log(`Audio backup deactivated for ${participantId}`);
            
        } catch (error) {
            console.error(`Failed to deactivate audio backup for ${participantId}:`, error);
        }
    }

    /**
     * Handle device change event
     */
    async handleDeviceChange() {
        console.log('Audio device change detected');
        await this.updateAvailableDevices();
        
        // Check if current devices are still available
        this.currentDevices.forEach((deviceId, participantId) => {
            const deviceExists = this.availableDevices.some(device => device.deviceId === deviceId);
            if (!deviceExists) {
                console.warn(`Current device ${deviceId} no longer available for ${participantId}`);
                this.switchToFallbackDevice(participantId);
            }
        });
    }

    /**
     * Get fallback status for participant
     */
    getFallbackStatus(participantId) {
        const fallbackSetup = this.fallbackNodes.get(participantId);
        const qualityHistory = this.qualityHistory.get(participantId) || [];
        
        return {
            isActive: !!fallbackSetup,
            isUsingFallback: fallbackSetup?.isUsingFallback || false,
            currentDevice: fallbackSetup?.currentDevice || null,
            qualityLevel: fallbackSetup?.qualityLevel || 0,
            backupActive: fallbackSetup?.backupActive || false,
            averageQuality: qualityHistory.length > 0 ? 
                qualityHistory.reduce((sum, q) => sum + q, 0) / qualityHistory.length : 0,
            availableDevices: this.availableDevices.length,
            settings: { ...this.fallbackSettings }
        };
    }

    /**
     * Remove fallback for participant
     */
    removeFallback(participantId) {
        const fallbackSetup = this.fallbackNodes.get(participantId);
        if (fallbackSetup) {
            // Disconnect nodes
            fallbackSetup.gainNode.disconnect();
            fallbackSetup.analyser.disconnect();
            fallbackSetup.backupGain.disconnect();
            fallbackSetup.output.disconnect();
            
            this.fallbackNodes.delete(participantId);
            this.currentDevices.delete(participantId);
            this.qualityHistory.delete(participantId);
            
            console.log(`Fallback removed for participant: ${participantId}`);
        }
    }

    /**
     * Cleanup fallback
     */
    cleanup() {
        this.fallbackNodes.forEach((_, participantId) => {
            this.removeFallback(participantId);
        });
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
    }
}

// Global instance
window.audioFallback = new AudioFallback();
