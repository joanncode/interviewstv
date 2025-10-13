class AudioControls {
    constructor() {
        this.audioContext = null;
        this.analyserNodes = new Map(); // participantId -> analyser
        this.volumeMeters = new Map(); // participantId -> meter element
        this.audioStreams = new Map(); // participantId -> stream
        this.gainNodes = new Map(); // participantId -> gain node
        this.isInitialized = false;
        
        // Audio settings
        this.settings = {
            noiseSuppressionEnabled: true,
            echoCancellationEnabled: true,
            autoGainControlEnabled: true,
            volumeThreshold: 0.01,
            updateInterval: 50, // ms
            smoothingTimeConstant: 0.8,
            defaultGain: 1.0,
            maxGain: 3.0,
            minGain: 0.0,
            gainStep: 0.1,
            // Advanced noise suppression settings
            noiseSuppressionLevel: 'high', // 'low', 'medium', 'high'
            echoCancellationLevel: 'high', // 'low', 'medium', 'high'
            adaptiveNoiseReduction: true,
            backgroundNoiseThreshold: 0.05
        };

        // Participant audio settings
        this.participantSettings = new Map(); // participantId -> settings

        // Audio devices
        this.audioDevices = {
            microphones: [],
            speakers: [],
            selectedMicrophone: null,
            selectedSpeaker: null
        };

        // Device monitoring
        this.deviceChangeListeners = new Set();

        // Audio filters integration
        this.audioFilters = null;

        // Audio quality monitor integration
        this.qualityMonitor = null;

        // Advanced audio processing integrations
        this.audioCompression = null;
        this.audioSynchronization = null;
        this.audioFallback = null;
        this.audioQualityAdaptation = null;
        this.audioRecordingOptimization = null;

        // Volume level animation frame
        this.animationFrame = null;
        
        this.initializeAudioContext();
        this.initializeDeviceMonitoring();
        this.initializeAudioFilters();
        this.initializeQualityMonitor();
        this.initializeAdvancedProcessing();
    }

    /**
     * Initialize Web Audio API context
     */
    async initializeAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Resume context if suspended (required by some browsers)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            this.isInitialized = true;
            console.log('Audio context initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize audio context:', error);
        }
    }

    /**
     * Initialize audio filters
     */
    initializeAudioFilters() {
        // Audio filters will be initialized when window.audioFilters is available
        if (window.audioFilters) {
            this.audioFilters = window.audioFilters;
            console.log('Audio filters integrated with audio controls');
        } else {
            // Retry after a short delay
            setTimeout(() => {
                this.initializeAudioFilters();
            }, 100);
        }
    }

    /**
     * Initialize quality monitor
     */
    initializeQualityMonitor() {
        // Quality monitor will be initialized when window.audioQualityMonitor is available
        if (window.audioQualityMonitor) {
            this.qualityMonitor = window.audioQualityMonitor;
            console.log('Audio quality monitor integrated with audio controls');
        } else {
            // Retry after a short delay
            setTimeout(() => {
                this.initializeQualityMonitor();
            }, 100);
        }
    }

    /**
     * Initialize advanced audio processing services
     */
    initializeAdvancedProcessing() {
        // Initialize audio compression
        if (window.audioCompression) {
            this.audioCompression = window.audioCompression;
            console.log('Audio compression integrated with audio controls');
        }

        // Initialize audio synchronization
        if (window.audioSynchronization) {
            this.audioSynchronization = window.audioSynchronization;
            console.log('Audio synchronization integrated with audio controls');
        }

        // Initialize audio fallback
        if (window.audioFallback) {
            this.audioFallback = window.audioFallback;
            console.log('Audio fallback integrated with audio controls');
        }

        // Initialize audio quality adaptation
        if (window.audioQualityAdaptation) {
            this.audioQualityAdaptation = window.audioQualityAdaptation;
            console.log('Audio quality adaptation integrated with audio controls');
        }

        // Initialize audio recording optimization
        if (window.audioRecordingOptimization) {
            this.audioRecordingOptimization = window.audioRecordingOptimization;
            console.log('Audio recording optimization integrated with audio controls');
        }

        // Retry initialization if services aren't ready yet
        const missingServices = [
            !this.audioCompression && 'audioCompression',
            !this.audioSynchronization && 'audioSynchronization',
            !this.audioFallback && 'audioFallback',
            !this.audioQualityAdaptation && 'audioQualityAdaptation',
            !this.audioRecordingOptimization && 'audioRecordingOptimization'
        ].filter(Boolean);

        if (missingServices.length > 0) {
            setTimeout(() => {
                this.initializeAdvancedProcessing();
            }, 100);
        }
    }

    /**
     * Initialize device monitoring
     */
    async initializeDeviceMonitoring() {
        try {
            // Request initial permissions to enumerate devices
            await navigator.mediaDevices.getUserMedia({ audio: true });

            // Enumerate devices
            await this.enumerateAudioDevices();

            // Monitor device changes
            navigator.mediaDevices.addEventListener('devicechange', () => {
                this.handleDeviceChange();
            });

            console.log('Device monitoring initialized');

        } catch (error) {
            console.warn('Could not initialize device monitoring:', error);
        }
    }

    /**
     * Enumerate available audio devices
     */
    async enumerateAudioDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();

            this.audioDevices.microphones = devices.filter(device =>
                device.kind === 'audioinput' && device.deviceId !== 'default'
            );

            this.audioDevices.speakers = devices.filter(device =>
                device.kind === 'audiooutput' && device.deviceId !== 'default'
            );

            // Set default devices if none selected
            if (!this.audioDevices.selectedMicrophone && this.audioDevices.microphones.length > 0) {
                this.audioDevices.selectedMicrophone = this.audioDevices.microphones[0].deviceId;
            }

            if (!this.audioDevices.selectedSpeaker && this.audioDevices.speakers.length > 0) {
                this.audioDevices.selectedSpeaker = this.audioDevices.speakers[0].deviceId;
            }

            console.log('Audio devices enumerated:', {
                microphones: this.audioDevices.microphones.length,
                speakers: this.audioDevices.speakers.length
            });

            // Notify listeners
            this.notifyDeviceChange();

        } catch (error) {
            console.error('Failed to enumerate audio devices:', error);
        }
    }

    /**
     * Handle device change events
     */
    async handleDeviceChange() {
        console.log('Audio devices changed, re-enumerating...');
        await this.enumerateAudioDevices();
    }

    /**
     * Get available microphones
     */
    getMicrophones() {
        return this.audioDevices.microphones.map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
            groupId: device.groupId
        }));
    }

    /**
     * Get available speakers
     */
    getSpeakers() {
        return this.audioDevices.speakers.map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Speaker ${device.deviceId.slice(0, 8)}`,
            groupId: device.groupId
        }));
    }

    /**
     * Select microphone device
     */
    async selectMicrophone(deviceId, participantId = 'local') {
        try {
            this.audioDevices.selectedMicrophone = deviceId;

            // If participant is already using audio, restart with new device
            if (this.audioStreams.has(participantId)) {
                await this.restartAudioWithDevice(participantId, deviceId, 'microphone');
            }

            console.log(`Selected microphone: ${deviceId} for ${participantId}`);
            this.notifyDeviceChange();

        } catch (error) {
            console.error('Failed to select microphone:', error);
            throw error;
        }
    }

    /**
     * Select speaker device
     */
    async selectSpeaker(deviceId) {
        try {
            this.audioDevices.selectedSpeaker = deviceId;

            // Update all audio elements to use new speaker
            await this.updateAudioOutputDevice(deviceId);

            console.log(`Selected speaker: ${deviceId}`);
            this.notifyDeviceChange();

        } catch (error) {
            console.error('Failed to select speaker:', error);
            throw error;
        }
    }

    /**
     * Restart audio stream with new device
     */
    async restartAudioWithDevice(participantId, deviceId, deviceType) {
        const settings = this.participantSettings.get(participantId);
        if (!settings) return;

        try {
            // Stop current stream
            const currentStream = this.audioStreams.get(participantId);
            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
            }

            // Remove current audio controls
            this.removeParticipantAudio(participantId);

            // Create new stream with selected device
            const constraints = {
                audio: {
                    deviceId: deviceType === 'microphone' ? { exact: deviceId } : undefined,
                    noiseSuppression: settings.noiseSuppression,
                    echoCancellation: settings.echoCancellation,
                    autoGainControl: settings.autoGainControl
                }
            };

            const newStream = await navigator.mediaDevices.getUserMedia(constraints);

            // Re-add audio controls with new stream
            this.addParticipantAudio(participantId, newStream, participantId === 'local');

            // Restore previous settings
            this.setParticipantVolume(participantId, settings.volume);
            this.setParticipantGain(participantId, settings.gain);
            this.setParticipantMute(participantId, settings.muted);

            console.log(`Restarted audio for ${participantId} with new ${deviceType}: ${deviceId}`);

        } catch (error) {
            console.error(`Failed to restart audio with new ${deviceType}:`, error);
            throw error;
        }
    }

    /**
     * Update audio output device for all audio elements
     */
    async updateAudioOutputDevice(deviceId) {
        const audioElements = document.querySelectorAll('audio, video');

        for (const element of audioElements) {
            if (element.setSinkId) {
                try {
                    await element.setSinkId(deviceId);
                } catch (error) {
                    console.warn(`Failed to set sink ID for audio element:`, error);
                }
            }
        }
    }

    /**
     * Test microphone device
     */
    async testMicrophone(deviceId, duration = 3000) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { deviceId: { exact: deviceId } }
            });

            // Create temporary audio context for testing
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();

            source.connect(analyser);
            analyser.fftSize = 256;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            let maxVolume = 0;
            let avgVolume = 0;
            let samples = 0;

            const testInterval = setInterval(() => {
                analyser.getByteFrequencyData(dataArray);

                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }

                const volume = sum / dataArray.length / 255;
                maxVolume = Math.max(maxVolume, volume);
                avgVolume = (avgVolume * samples + volume) / (samples + 1);
                samples++;

            }, 100);

            // Stop test after duration
            setTimeout(() => {
                clearInterval(testInterval);
                stream.getTracks().forEach(track => track.stop());
                audioContext.close();
            }, duration);

            return new Promise(resolve => {
                setTimeout(() => {
                    resolve({
                        deviceId,
                        maxVolume,
                        avgVolume,
                        samples,
                        quality: maxVolume > 0.1 ? 'good' : maxVolume > 0.05 ? 'fair' : 'poor'
                    });
                }, duration);
            });

        } catch (error) {
            console.error('Microphone test failed:', error);
            return {
                deviceId,
                error: error.message,
                quality: 'error'
            };
        }
    }

    /**
     * Test speaker device
     */
    async testSpeaker(deviceId) {
        try {
            // Create test audio element
            const audio = document.createElement('audio');
            audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';

            if (audio.setSinkId) {
                await audio.setSinkId(deviceId);

                return new Promise((resolve) => {
                    audio.addEventListener('ended', () => {
                        resolve({
                            deviceId,
                            success: true,
                            quality: 'good'
                        });
                    });

                    audio.addEventListener('error', (error) => {
                        resolve({
                            deviceId,
                            success: false,
                            error: error.message,
                            quality: 'error'
                        });
                    });

                    audio.play().catch(error => {
                        resolve({
                            deviceId,
                            success: false,
                            error: error.message,
                            quality: 'error'
                        });
                    });
                });
            } else {
                return {
                    deviceId,
                    success: false,
                    error: 'setSinkId not supported',
                    quality: 'unsupported'
                };
            }

        } catch (error) {
            return {
                deviceId,
                success: false,
                error: error.message,
                quality: 'error'
            };
        }
    }

    /**
     * Add device change listener
     */
    addDeviceChangeListener(callback) {
        this.deviceChangeListeners.add(callback);
    }

    /**
     * Remove device change listener
     */
    removeDeviceChangeListener(callback) {
        this.deviceChangeListeners.delete(callback);
    }

    /**
     * Notify device change listeners
     */
    notifyDeviceChange() {
        this.deviceChangeListeners.forEach(callback => {
            try {
                callback({
                    microphones: this.getMicrophones(),
                    speakers: this.getSpeakers(),
                    selectedMicrophone: this.audioDevices.selectedMicrophone,
                    selectedSpeaker: this.audioDevices.selectedSpeaker
                });
            } catch (error) {
                console.error('Device change listener error:', error);
            }
        });
    }

    /**
     * Add audio stream for a participant
     */
    addParticipantAudio(participantId, stream, isLocal = false) {
        if (!this.isInitialized || !stream) return;

        try {
            // Create audio source from stream
            const source = this.audioContext.createMediaStreamSource(stream);

            // Apply audio filters if available
            let processedSource = source;
            if (this.audioFilters) {
                processedSource = this.audioFilters.applyFilters(participantId, source);
            }

            // Create analyser for volume detection
            const analyser = this.audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = this.settings.smoothingTimeConstant;

            // Create gain node for volume control
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = 1.0;

            // Connect audio nodes (use processed source for analyser and gain)
            processedSource.connect(analyser);
            processedSource.connect(gainNode);
            
            // For remote participants, connect to destination
            if (!isLocal) {
                gainNode.connect(this.audioContext.destination);
            }
            
            // Store references
            this.analyserNodes.set(participantId, analyser);
            this.gainNodes.set(participantId, gainNode);
            this.audioStreams.set(participantId, stream);

            // Initialize participant settings
            this.participantSettings.set(participantId, {
                volume: 1.0,
                gain: 1.0,
                muted: false,
                noiseSuppression: this.settings.noiseSuppressionEnabled,
                echoCancellation: this.settings.echoCancellationEnabled,
                autoGainControl: this.settings.autoGainControlEnabled,
                noiseSuppressionLevel: this.settings.noiseSuppressionLevel,
                echoCancellationLevel: this.settings.echoCancellationLevel,
                adaptiveNoiseReduction: this.settings.adaptiveNoiseReduction,
                backgroundNoiseLevel: 0,
                speechQuality: 1.0
            });

            // Create volume meter UI
            this.createVolumeMeter(participantId, isLocal);
            
            // Start volume monitoring if this is the first participant
            if (this.analyserNodes.size === 1) {
                this.startVolumeMonitoring();
            }

            // Start quality monitoring
            if (this.qualityMonitor) {
                this.qualityMonitor.startMonitoring(participantId, this);
            }

            console.log(`Audio controls added for participant: ${participantId}`);
            
        } catch (error) {
            console.error(`Failed to add audio controls for ${participantId}:`, error);
        }
    }

    /**
     * Remove audio controls for a participant
     */
    removeParticipantAudio(participantId) {
        // Clean up analyser
        if (this.analyserNodes.has(participantId)) {
            this.analyserNodes.delete(participantId);
        }
        
        // Clean up gain node
        if (this.gainNodes.has(participantId)) {
            const gainNode = this.gainNodes.get(participantId);
            gainNode.disconnect();
            this.gainNodes.delete(participantId);
        }
        
        // Clean up stream reference
        this.audioStreams.delete(participantId);

        // Clean up audio filters
        if (this.audioFilters) {
            this.audioFilters.removeFilters(participantId);
        }

        // Stop quality monitoring
        if (this.qualityMonitor) {
            this.qualityMonitor.stopMonitoring(participantId);
        }

        // Clean up participant settings
        this.participantSettings.delete(participantId);

        // Remove volume meter UI
        this.removeVolumeMeter(participantId);
        
        // Stop monitoring if no participants left
        if (this.analyserNodes.size === 0) {
            this.stopVolumeMonitoring();
        }
        
        console.log(`Audio controls removed for participant: ${participantId}`);
    }

    /**
     * Create volume meter UI for a participant
     */
    createVolumeMeter(participantId, isLocal = false) {
        const videoContainer = document.querySelector(`[data-participant-id="${participantId}"]`);
        if (!videoContainer) {
            console.warn(`Video container not found for participant: ${participantId}`);
            return;
        }

        // Create volume meter container
        const meterContainer = document.createElement('div');
        meterContainer.className = 'volume-meter-container';
        meterContainer.innerHTML = `
            <div class="volume-meter" id="volume-meter-${participantId}">
                <div class="volume-bar">
                    <div class="volume-fill" id="volume-fill-${participantId}"></div>
                </div>
                <div class="volume-indicator ${isLocal ? 'local' : 'remote'}" id="volume-indicator-${participantId}">
                    <i class="fas fa-microphone"></i>
                </div>
            </div>
            ${isLocal ? `
                <div class="audio-controls-panel" id="audio-controls-${participantId}">
                    <div class="volume-control">
                        <label for="volume-slider-${participantId}">
                            <i class="fas fa-volume-up"></i>
                        </label>
                        <input type="range"
                               id="volume-slider-${participantId}"
                               class="volume-slider"
                               min="0" max="200" value="100"
                               data-participant-id="${participantId}">
                        <span class="volume-value" id="volume-value-${participantId}">100%</span>
                    </div>
                    <div class="gain-control">
                        <label for="gain-slider-${participantId}">
                            <i class="fas fa-microphone"></i>
                        </label>
                        <input type="range"
                               id="gain-slider-${participantId}"
                               class="gain-slider"
                               min="0" max="300" value="100"
                               data-participant-id="${participantId}">
                        <span class="gain-value" id="gain-value-${participantId}">100%</span>
                    </div>
                    <div class="audio-settings">
                        <button class="audio-setting-btn active"
                                id="noise-suppression-${participantId}"
                                title="Noise Suppression"
                                data-setting="noiseSuppression">
                            <i class="fas fa-volume-off"></i>
                        </button>
                        <button class="audio-setting-btn active"
                                id="echo-cancellation-${participantId}"
                                title="Echo Cancellation"
                                data-setting="echoCancellation">
                            <i class="fas fa-echo"></i>
                        </button>
                        <button class="audio-setting-btn active"
                                id="auto-gain-${participantId}"
                                title="Auto Gain Control"
                                data-setting="autoGainControl">
                            <i class="fas fa-adjust"></i>
                        </button>
                        <button class="audio-setting-btn"
                                id="mute-${participantId}"
                                title="Mute Microphone"
                                data-setting="mute">
                            <i class="fas fa-microphone"></i>
                        </button>
                    </div>
                </div>
            ` : `
                <div class="remote-audio-controls" id="remote-controls-${participantId}">
                    <div class="volume-control">
                        <label for="remote-volume-${participantId}">
                            <i class="fas fa-volume-up"></i>
                        </label>
                        <input type="range"
                               id="remote-volume-${participantId}"
                               class="volume-slider"
                               min="0" max="200" value="100"
                               data-participant-id="${participantId}">
                        <span class="volume-value" id="remote-volume-value-${participantId}">100%</span>
                    </div>
                    <button class="audio-setting-btn"
                            id="remote-mute-${participantId}"
                            title="Mute Participant"
                            data-setting="remoteMute">
                        <i class="fas fa-volume-up"></i>
                    </button>
                </div>
            `}
        `;

        // Add CSS styles if not already added
        this.addVolumeMetersCSS();

        // Append to video container
        videoContainer.appendChild(meterContainer);
        
        // Store meter reference
        const volumeFill = document.getElementById(`volume-fill-${participantId}`);
        const volumeIndicator = document.getElementById(`volume-indicator-${participantId}`);
        
        this.volumeMeters.set(participantId, {
            fill: volumeFill,
            indicator: volumeIndicator,
            container: meterContainer
        });

        // Add event listeners for local controls
        if (isLocal) {
            this.setupLocalAudioControls(participantId);
        }
    }

    /**
     * Remove volume meter UI
     */
    removeVolumeMeter(participantId) {
        const meter = this.volumeMeters.get(participantId);
        if (meter && meter.container) {
            meter.container.remove();
        }
        this.volumeMeters.delete(participantId);
    }

    /**
     * Setup local audio controls event listeners
     */
    setupLocalAudioControls(participantId) {
        // Volume slider
        const volumeSlider = document.getElementById(`volume-slider-${participantId}`);
        const volumeValue = document.getElementById(`volume-value-${participantId}`);

        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                const volume = e.target.value / 100;
                this.setParticipantVolume(participantId, volume);
                volumeValue.textContent = `${e.target.value}%`;
            });
        }

        // Gain slider
        const gainSlider = document.getElementById(`gain-slider-${participantId}`);
        const gainValue = document.getElementById(`gain-value-${participantId}`);

        if (gainSlider) {
            gainSlider.addEventListener('input', (e) => {
                const gain = e.target.value / 100;
                this.setParticipantGain(participantId, gain);
                gainValue.textContent = `${e.target.value}%`;
            });
        }

        // Remote volume controls
        const remoteVolumeSlider = document.getElementById(`remote-volume-${participantId}`);
        const remoteVolumeValue = document.getElementById(`remote-volume-value-${participantId}`);

        if (remoteVolumeSlider) {
            remoteVolumeSlider.addEventListener('input', (e) => {
                const volume = e.target.value / 100;
                this.setParticipantVolume(participantId, volume);
                remoteVolumeValue.textContent = `${e.target.value}%`;
            });
        }

        // Audio setting buttons (local controls)
        const settingButtons = document.querySelectorAll(`#audio-controls-${participantId} .audio-setting-btn`);
        settingButtons.forEach(button => {
            button.addEventListener('click', () => {
                const setting = button.dataset.setting;
                this.toggleAudioSetting(participantId, setting, button);
            });
        });

        // Remote control buttons
        const remoteButtons = document.querySelectorAll(`#remote-controls-${participantId} .audio-setting-btn`);
        remoteButtons.forEach(button => {
            button.addEventListener('click', () => {
                const setting = button.dataset.setting;
                this.toggleAudioSetting(participantId, setting, button);
            });
        });
    }

    /**
     * Start volume level monitoring
     */
    startVolumeMonitoring() {
        if (this.animationFrame) return; // Already running

        const updateVolumeLevels = () => {
            this.analyserNodes.forEach((analyser, participantId) => {
                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(dataArray);

                // Calculate RMS (Root Mean Square) for volume level
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i] * dataArray[i];
                }
                const rms = Math.sqrt(sum / dataArray.length);
                const volume = rms / 255; // Normalize to 0-1

                this.updateVolumeMeter(participantId, volume);

                // Monitor background noise and speech quality
                this.monitorBackgroundNoise(participantId);
                this.calculateSpeechQuality(participantId);
            });

            this.animationFrame = requestAnimationFrame(updateVolumeLevels);
        };
        
        updateVolumeLevels();
    }

    /**
     * Stop volume level monitoring
     */
    stopVolumeMonitoring() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    /**
     * Update volume meter display
     */
    updateVolumeMeter(participantId, volume) {
        const meter = this.volumeMeters.get(participantId);
        if (!meter) return;

        // Update volume bar
        const percentage = Math.min(100, volume * 100);
        meter.fill.style.width = `${percentage}%`;
        
        // Update volume bar color based on level
        if (volume > 0.8) {
            meter.fill.style.backgroundColor = '#ff4444'; // Red for high volume
        } else if (volume > 0.5) {
            meter.fill.style.backgroundColor = '#ffaa00'; // Orange for medium volume
        } else if (volume > this.settings.volumeThreshold) {
            meter.fill.style.backgroundColor = '#00ff44'; // Green for normal volume
        } else {
            meter.fill.style.backgroundColor = '#333333'; // Dark for silence
        }
        
        // Update speaking indicator
        const isSpeaking = volume > this.settings.volumeThreshold;
        meter.indicator.classList.toggle('speaking', isSpeaking);
        
        // Update microphone icon
        const icon = meter.indicator.querySelector('i');
        if (icon) {
            if (isSpeaking) {
                icon.className = 'fas fa-microphone';
                meter.indicator.style.color = '#00ff44';
            } else {
                icon.className = 'fas fa-microphone';
                meter.indicator.style.color = '#666';
            }
        }
    }

    /**
     * Set volume for a participant
     */
    setParticipantVolume(participantId, volume) {
        const gainNode = this.gainNodes.get(participantId);
        const settings = this.participantSettings.get(participantId);

        if (gainNode && settings) {
            const clampedVolume = Math.max(0, Math.min(2, volume));
            settings.volume = clampedVolume;

            // Apply both volume and gain
            const finalGain = settings.muted ? 0 : clampedVolume * settings.gain;
            gainNode.gain.value = finalGain;
        }
    }

    /**
     * Set microphone gain for a participant
     */
    setParticipantGain(participantId, gain) {
        const settings = this.participantSettings.get(participantId);
        const gainNode = this.gainNodes.get(participantId);

        if (settings && gainNode) {
            const clampedGain = Math.max(this.settings.minGain, Math.min(this.settings.maxGain, gain));
            settings.gain = clampedGain;

            // Apply both volume and gain
            const finalGain = settings.muted ? 0 : settings.volume * clampedGain;
            gainNode.gain.value = finalGain;

            // Update UI if needed
            this.updateGainDisplay(participantId, clampedGain);
        }
    }

    /**
     * Mute/unmute a participant
     */
    setParticipantMute(participantId, muted) {
        const settings = this.participantSettings.get(participantId);
        const gainNode = this.gainNodes.get(participantId);

        if (settings && gainNode) {
            settings.muted = muted;

            // Apply mute state
            const finalGain = muted ? 0 : settings.volume * settings.gain;
            gainNode.gain.value = finalGain;

            // Update UI
            this.updateMuteDisplay(participantId, muted);
        }
    }

    /**
     * Get participant audio settings
     */
    getParticipantSettings(participantId) {
        return this.participantSettings.get(participantId) || null;
    }

    /**
     * Update gain display in UI
     */
    updateGainDisplay(participantId, gain) {
        const gainValue = document.getElementById(`gain-value-${participantId}`);
        const gainSlider = document.getElementById(`gain-slider-${participantId}`);

        if (gainValue) {
            gainValue.textContent = `${Math.round(gain * 100)}%`;
        }

        if (gainSlider) {
            gainSlider.value = gain * 100;
        }
    }

    /**
     * Update mute display in UI
     */
    updateMuteDisplay(participantId, muted) {
        const muteButton = document.getElementById(`mute-${participantId}`);
        const remoteMuteButton = document.getElementById(`remote-mute-${participantId}`);

        if (muteButton) {
            const icon = muteButton.querySelector('i');
            muteButton.classList.toggle('active', muted);
            muteButton.style.color = muted ? '#ff4444' : '#666';
            if (icon) {
                icon.className = muted ? 'fas fa-microphone-slash' : 'fas fa-microphone';
            }
        }

        if (remoteMuteButton) {
            const icon = remoteMuteButton.querySelector('i');
            remoteMuteButton.classList.toggle('active', muted);
            remoteMuteButton.style.color = muted ? '#ff4444' : '#666';
            if (icon) {
                icon.className = muted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
            }
        }
    }

    /**
     * Toggle audio setting
     */
    toggleAudioSetting(participantId, setting, button) {
        const settings = this.participantSettings.get(participantId);
        if (!settings) return;

        let isEnabled;

        switch (setting) {
            case 'noiseSuppression':
                isEnabled = !settings.noiseSuppression;
                settings.noiseSuppression = isEnabled;
                button.classList.toggle('active', isEnabled);
                this.applyAudioConstraints(participantId);
                break;

            case 'echoCancellation':
                isEnabled = !settings.echoCancellation;
                settings.echoCancellation = isEnabled;
                button.classList.toggle('active', isEnabled);
                this.applyAudioConstraints(participantId);
                break;

            case 'autoGainControl':
                isEnabled = !settings.autoGainControl;
                settings.autoGainControl = isEnabled;
                button.classList.toggle('active', isEnabled);
                this.applyAudioConstraints(participantId);
                break;

            case 'mute':
                isEnabled = !settings.muted;
                this.setParticipantMute(participantId, isEnabled);
                return; // setParticipantMute handles UI updates

            case 'remoteMute':
                isEnabled = !settings.muted;
                this.setParticipantMute(participantId, isEnabled);
                return; // setParticipantMute handles UI updates
        }

        // Update button appearance
        button.style.color = isEnabled ? '#00ff44' : '#666';
    }

    /**
     * Apply audio constraints to stream
     */
    async applyAudioConstraints(participantId) {
        const stream = this.audioStreams.get(participantId);
        const settings = this.participantSettings.get(participantId);
        if (!stream || !settings) return;

        try {
            // Get current audio track
            const audioTrack = stream.getAudioTracks()[0];
            if (!audioTrack) return;

            // Apply participant-specific constraints with advanced settings
            const constraints = {
                noiseSuppression: settings.noiseSuppression,
                echoCancellation: settings.echoCancellation,
                autoGainControl: settings.autoGainControl
            };

            // Add advanced constraints if supported
            if (settings.noiseSuppression && typeof settings.noiseSuppression === 'object') {
                constraints.noiseSuppression = {
                    exact: settings.noiseSuppressionLevel || 'high'
                };
            }

            if (settings.echoCancellation && typeof settings.echoCancellation === 'object') {
                constraints.echoCancellation = {
                    exact: settings.echoCancellationLevel || 'high'
                };
            }

            await audioTrack.applyConstraints(constraints);

            console.log(`Advanced audio constraints applied for ${participantId}:`, constraints);

        } catch (error) {
            console.error(`Failed to apply audio constraints for ${participantId}:`, error);
            // Fallback to basic constraints
            try {
                const audioTrack = stream.getAudioTracks()[0];
                await audioTrack.applyConstraints({
                    noiseSuppression: settings.noiseSuppression,
                    echoCancellation: settings.echoCancellation,
                    autoGainControl: settings.autoGainControl
                });
                console.log(`Fallback constraints applied for ${participantId}`);
            } catch (fallbackError) {
                console.error(`Fallback constraints also failed for ${participantId}:`, fallbackError);
            }
        }
    }

    /**
     * Set noise suppression level
     */
    async setNoiseSuppressionLevel(participantId, level) {
        const settings = this.participantSettings.get(participantId);
        if (!settings) return;

        settings.noiseSuppressionLevel = level;
        settings.noiseSuppression = level !== 'off';

        await this.applyAudioConstraints(participantId);
        this.updateNoiseSuppressionDisplay(participantId, level);

        console.log(`Noise suppression level set to "${level}" for ${participantId}`);
    }

    /**
     * Set echo cancellation level
     */
    async setEchoCancellationLevel(participantId, level) {
        const settings = this.participantSettings.get(participantId);
        if (!settings) return;

        settings.echoCancellationLevel = level;
        settings.echoCancellation = level !== 'off';

        await this.applyAudioConstraints(participantId);
        this.updateEchoCancellationDisplay(participantId, level);

        console.log(`Echo cancellation level set to "${level}" for ${participantId}`);
    }

    /**
     * Monitor background noise levels
     */
    monitorBackgroundNoise(participantId) {
        const analyser = this.analyserNodes.get(participantId);
        const settings = this.participantSettings.get(participantId);

        if (!analyser || !settings) return null;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        // Calculate background noise level (lower frequencies)
        let backgroundNoise = 0;
        const backgroundRange = Math.floor(dataArray.length * 0.3); // Lower 30% of frequencies

        for (let i = 0; i < backgroundRange; i++) {
            backgroundNoise += dataArray[i];
        }

        backgroundNoise = (backgroundNoise / backgroundRange) / 255;
        settings.backgroundNoiseLevel = backgroundNoise;

        // Adaptive noise reduction
        if (settings.adaptiveNoiseReduction && backgroundNoise > this.settings.backgroundNoiseThreshold) {
            this.adaptNoiseReduction(participantId, backgroundNoise);
        }

        return backgroundNoise;
    }

    /**
     * Adaptive noise reduction based on background noise
     */
    async adaptNoiseReduction(participantId, noiseLevel) {
        const settings = this.participantSettings.get(participantId);
        if (!settings) return;

        let newLevel = 'medium';

        if (noiseLevel > 0.3) {
            newLevel = 'high';
        } else if (noiseLevel > 0.15) {
            newLevel = 'medium';
        } else {
            newLevel = 'low';
        }

        // Only update if level changed significantly
        if (newLevel !== settings.noiseSuppressionLevel) {
            await this.setNoiseSuppressionLevel(participantId, newLevel);
            console.log(`Adaptive noise reduction: ${settings.noiseSuppressionLevel} -> ${newLevel} for ${participantId}`);
        }
    }

    /**
     * Calculate speech quality metrics
     */
    calculateSpeechQuality(participantId) {
        const analyser = this.analyserNodes.get(participantId);
        const settings = this.participantSettings.get(participantId);

        if (!analyser || !settings) return null;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        // Calculate speech frequency range energy (300Hz - 3400Hz roughly)
        const speechStart = Math.floor(dataArray.length * 0.1);
        const speechEnd = Math.floor(dataArray.length * 0.6);

        let speechEnergy = 0;
        let totalEnergy = 0;

        for (let i = 0; i < dataArray.length; i++) {
            totalEnergy += dataArray[i];
            if (i >= speechStart && i <= speechEnd) {
                speechEnergy += dataArray[i];
            }
        }

        const speechQuality = totalEnergy > 0 ? speechEnergy / totalEnergy : 0;
        settings.speechQuality = speechQuality;

        return {
            speechQuality: speechQuality,
            speechEnergy: speechEnergy / 255,
            totalEnergy: totalEnergy / 255,
            backgroundNoise: settings.backgroundNoiseLevel,
            clarity: speechQuality > 0.6 ? 'high' : speechQuality > 0.3 ? 'medium' : 'low'
        };
    }

    /**
     * Update noise suppression display
     */
    updateNoiseSuppressionDisplay(participantId, level) {
        const button = document.getElementById(`noise-suppression-${participantId}`);
        if (button) {
            const icon = button.querySelector('i');
            button.title = `Noise Suppression: ${level}`;

            // Update icon based on level
            if (icon) {
                switch (level) {
                    case 'high':
                        icon.className = 'fas fa-volume-off';
                        button.style.color = '#00ff44';
                        break;
                    case 'medium':
                        icon.className = 'fas fa-volume-down';
                        button.style.color = '#ffaa00';
                        break;
                    case 'low':
                        icon.className = 'fas fa-volume-up';
                        button.style.color = '#ff4444';
                        break;
                    default:
                        icon.className = 'fas fa-volume-up';
                        button.style.color = '#666';
                }
            }
        }
    }

    /**
     * Update echo cancellation display
     */
    updateEchoCancellationDisplay(participantId, level) {
        const button = document.getElementById(`echo-cancellation-${participantId}`);
        if (button) {
            button.title = `Echo Cancellation: ${level}`;

            // Update color based on level
            switch (level) {
                case 'high':
                    button.style.color = '#00ff44';
                    break;
                case 'medium':
                    button.style.color = '#ffaa00';
                    break;
                case 'low':
                    button.style.color = '#ff4444';
                    break;
                default:
                    button.style.color = '#666';
            }
        }
    }

    /**
     * Get audio quality metrics
     */
    getAudioQualityMetrics(participantId) {
        const analyser = this.analyserNodes.get(participantId);
        const settings = this.participantSettings.get(participantId);
        if (!analyser || !settings) return null;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        // Calculate various metrics
        let sum = 0;
        let max = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
            max = Math.max(max, dataArray[i]);
        }

        const average = sum / dataArray.length;
        const volume = Math.sqrt(sum / dataArray.length) / 255;
        const speechQuality = this.calculateSpeechQuality(participantId);

        return {
            volume: volume,
            averageLevel: average / 255,
            peakLevel: max / 255,
            isSpeaking: volume > this.settings.volumeThreshold,
            backgroundNoise: settings.backgroundNoiseLevel || 0,
            speechQuality: speechQuality ? speechQuality.speechQuality : 0,
            speechClarity: speechQuality ? speechQuality.clarity : 'unknown',
            noiseSuppressionLevel: settings.noiseSuppressionLevel || 'medium',
            echoCancellationLevel: settings.echoCancellationLevel || 'medium',
            audioProcessingActive: settings.noiseSuppression || settings.echoCancellation,
            gain: settings.gain || 1.0,
            muted: settings.muted || false,
            timestamp: Date.now()
        };
    }

    /**
     * Add CSS styles for volume meters
     */
    addVolumeMetersCSS() {
        if (document.getElementById('volume-meters-css')) return;

        const style = document.createElement('style');
        style.id = 'volume-meters-css';
        style.textContent = `
            .volume-meter-container {
                position: absolute;
                bottom: 10px;
                left: 10px;
                right: 10px;
                z-index: 10;
            }

            .volume-meter {
                display: flex;
                align-items: center;
                gap: 8px;
                background: rgba(0, 0, 0, 0.7);
                padding: 6px 10px;
                border-radius: 20px;
                backdrop-filter: blur(10px);
            }

            .volume-bar {
                flex: 1;
                height: 4px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 2px;
                overflow: hidden;
            }

            .volume-fill {
                height: 100%;
                background: #333333;
                transition: width 0.1s ease, background-color 0.3s ease;
                border-radius: 2px;
            }

            .volume-indicator {
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #666;
                transition: color 0.3s ease;
            }

            .volume-indicator.speaking {
                animation: pulse 1s infinite;
            }

            .volume-indicator.local {
                border: 1px solid #FF0000;
                border-radius: 50%;
            }

            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.2); }
            }

            .audio-controls-panel {
                margin-top: 8px;
                background: rgba(0, 0, 0, 0.8);
                padding: 10px;
                border-radius: 8px;
                backdrop-filter: blur(10px);
            }

            .volume-control, .gain-control {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
            }

            .volume-control label, .gain-control label {
                color: #ccc;
                min-width: 20px;
            }

            .volume-slider, .gain-slider {
                flex: 1;
                height: 4px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 2px;
                outline: none;
                cursor: pointer;
            }

            .volume-slider::-webkit-slider-thumb, .gain-slider::-webkit-slider-thumb {
                appearance: none;
                width: 16px;
                height: 16px;
                background: #FF0000;
                border-radius: 50%;
                cursor: pointer;
            }

            .gain-slider::-webkit-slider-thumb {
                background: #00ff44;
            }

            .volume-value, .gain-value {
                color: #ccc;
                font-size: 12px;
                min-width: 35px;
                text-align: right;
            }

            .gain-value {
                color: #00ff44;
            }

            .remote-audio-controls {
                background: rgba(0, 0, 0, 0.8);
                padding: 8px;
                border-radius: 6px;
                backdrop-filter: blur(10px);
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .remote-audio-controls .volume-control {
                margin-bottom: 0;
                flex: 1;
            }

            .audio-settings {
                display: flex;
                gap: 8px;
                justify-content: center;
            }

            .audio-setting-btn {
                background: none;
                border: 1px solid #555;
                color: #666;
                padding: 6px 8px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 12px;
            }

            .audio-setting-btn:hover {
                border-color: #FF0000;
                color: #FF0000;
            }

            .audio-setting-btn.active {
                background: rgba(255, 0, 0, 0.2);
                border-color: #FF0000;
                color: #00ff44;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Apply gain preset
     */
    applyGainPreset(participantId, preset) {
        const presets = {
            'quiet': 0.5,
            'normal': 1.0,
            'loud': 1.5,
            'boost': 2.0,
            'max': 3.0
        };

        const gain = presets[preset] || 1.0;
        this.setParticipantGain(participantId, gain);

        console.log(`Applied gain preset "${preset}" (${gain}x) to ${participantId}`);
    }

    /**
     * Auto-adjust gain based on volume levels
     */
    autoAdjustGain(participantId) {
        const metrics = this.getAudioQualityMetrics(participantId);
        const settings = this.participantSettings.get(participantId);

        if (!metrics || !settings) return;

        // Auto-adjust based on average volume over time
        const targetVolume = 0.3; // Target 30% volume level
        const currentVolume = metrics.volume;

        if (currentVolume > 0.01) { // Only adjust if there's audio
            const adjustment = targetVolume / currentVolume;
            const newGain = Math.max(0.1, Math.min(2.0, settings.gain * adjustment));

            // Only apply significant changes (>10% difference)
            if (Math.abs(newGain - settings.gain) > 0.1) {
                this.setParticipantGain(participantId, newGain);
                console.log(`Auto-adjusted gain for ${participantId}: ${settings.gain.toFixed(2)} -> ${newGain.toFixed(2)}`);
            }
        }
    }

    /**
     * Get all participants' audio status
     */
    getAllParticipantsStatus() {
        const status = {};

        this.participantSettings.forEach((settings, participantId) => {
            const metrics = this.getAudioQualityMetrics(participantId);
            status[participantId] = {
                settings: { ...settings },
                metrics: metrics,
                isConnected: this.audioStreams.has(participantId)
            };
        });

        return status;
    }

    /**
     * Bulk update settings for all participants
     */
    bulkUpdateSettings(updates) {
        this.participantSettings.forEach((settings, participantId) => {
            Object.keys(updates).forEach(key => {
                if (key in settings) {
                    settings[key] = updates[key];
                }
            });

            // Apply changes
            if ('volume' in updates) {
                this.setParticipantVolume(participantId, settings.volume);
            }
            if ('gain' in updates) {
                this.setParticipantGain(participantId, settings.gain);
            }
            if ('muted' in updates) {
                this.setParticipantMute(participantId, settings.muted);
            }
            if ('noiseSuppression' in updates || 'echoCancellation' in updates || 'autoGainControl' in updates) {
                this.applyAudioConstraints(participantId);
            }
        });

        console.log('Bulk updated audio settings:', updates);
    }

    /**
     * Export audio settings
     */
    exportSettings() {
        const settings = {};
        this.participantSettings.forEach((participantSettings, participantId) => {
            settings[participantId] = { ...participantSettings };
        });
        return {
            globalSettings: { ...this.settings },
            participantSettings: settings,
            timestamp: Date.now()
        };
    }

    /**
     * Import audio settings
     */
    importSettings(settingsData) {
        if (settingsData.globalSettings) {
            Object.assign(this.settings, settingsData.globalSettings);
        }

        if (settingsData.participantSettings) {
            Object.keys(settingsData.participantSettings).forEach(participantId => {
                if (this.participantSettings.has(participantId)) {
                    const settings = settingsData.participantSettings[participantId];
                    this.participantSettings.set(participantId, { ...settings });

                    // Apply imported settings
                    this.setParticipantVolume(participantId, settings.volume);
                    this.setParticipantGain(participantId, settings.gain);
                    this.setParticipantMute(participantId, settings.muted);
                    this.applyAudioConstraints(participantId);
                }
            });
        }

        console.log('Imported audio settings:', settingsData);
    }

    /**
     * Apply audio filter preset
     */
    applyFilterPreset(participantId, presetName) {
        if (this.audioFilters) {
            this.audioFilters.applyPreset(participantId, presetName);
        }
    }

    /**
     * Update filter settings
     */
    updateFilterSettings(participantId, filterType, settings) {
        if (this.audioFilters) {
            this.audioFilters.updateFilterSettings(participantId, filterType, settings);
        }
    }

    /**
     * Toggle filter on/off
     */
    toggleFilter(participantId, filterType, enabled) {
        if (this.audioFilters) {
            this.audioFilters.toggleFilter(participantId, filterType, enabled);
        }
    }

    /**
     * Get filter settings
     */
    getFilterSettings() {
        return this.audioFilters ? this.audioFilters.getFilterSettings() : null;
    }

    /**
     * Get quality metrics for a participant
     */
    getQualityMetrics(participantId) {
        return this.qualityMonitor ? this.qualityMonitor.getParticipantMetrics(participantId) : null;
    }

    /**
     * Get quality metrics for all participants
     */
    getAllQualityMetrics() {
        return this.qualityMonitor ? this.qualityMonitor.getAllMetrics() : {};
    }

    /**
     * Reset quality metrics for a participant
     */
    resetQualityMetrics(participantId) {
        if (this.qualityMonitor) {
            this.qualityMonitor.resetMetrics(participantId);
        }
    }

    /**
     * Export quality metrics
     */
    exportQualityMetrics(participantId) {
        return this.qualityMonitor ? this.qualityMonitor.exportMetrics(participantId) : null;
    }

    /**
     * Add quality change listener
     */
    addQualityListener(callback) {
        if (this.qualityMonitor) {
            this.qualityMonitor.addQualityListener(callback);
        }
    }

    /**
     * Apply comprehensive audio processing to participant
     */
    applyComprehensiveProcessing(participantId, sourceNode, options = {}) {
        const {
            enableFilters = true,
            enableCompression = true,
            enableSynchronization = true,
            enableFallback = true,
            enableQualityAdaptation = true,
            enableRecordingOptimization = true,
            videoElement = null,
            recordingType = 'interview'
        } = options;

        if (!this.isInitialized || !sourceNode) {
            console.warn('Audio controls not initialized or invalid source node');
            return sourceNode;
        }

        try {
            let processedNode = sourceNode;

            // Apply audio filters first
            if (enableFilters && this.audioFilters) {
                processedNode = this.audioFilters.applyFilters(participantId, processedNode);
                console.log(`Audio filters applied to ${participantId}`);
            }

            // Apply compression
            if (enableCompression && this.audioCompression) {
                processedNode = this.audioCompression.applyRealTimeCompression(participantId, processedNode);
                console.log(`Audio compression applied to ${participantId}`);
            }

            // Apply synchronization
            if (enableSynchronization && this.audioSynchronization) {
                processedNode = this.audioSynchronization.applySynchronization(participantId, processedNode, videoElement);
                console.log(`Audio synchronization applied to ${participantId}`);
            }

            // Apply fallback mechanisms
            if (enableFallback && this.audioFallback) {
                processedNode = this.audioFallback.applyFallback(participantId, processedNode);
                console.log(`Audio fallback applied to ${participantId}`);
            }

            // Apply quality adaptation
            if (enableQualityAdaptation && this.audioQualityAdaptation) {
                processedNode = this.audioQualityAdaptation.applyAdaptation(participantId, processedNode);
                console.log(`Audio quality adaptation applied to ${participantId}`);
            }

            // Apply recording optimization
            if (enableRecordingOptimization && this.audioRecordingOptimization) {
                processedNode = this.audioRecordingOptimization.applyOptimization(participantId, processedNode, recordingType);
                console.log(`Audio recording optimization applied to ${participantId}`);
            }

            console.log(`Comprehensive audio processing applied to participant: ${participantId}`);
            return processedNode;

        } catch (error) {
            console.error(`Failed to apply comprehensive processing for ${participantId}:`, error);
            return sourceNode;
        }
    }

    /**
     * Get comprehensive audio processing status
     */
    getComprehensiveProcessingStatus(participantId) {
        return {
            filters: this.audioFilters ? this.audioFilters.getFilterSettings() : null,
            compression: this.audioCompression ? this.audioCompression.getCompressionSettings(participantId) : null,
            synchronization: this.audioSynchronization ? this.audioSynchronization.getSyncStatus(participantId) : null,
            fallback: this.audioFallback ? this.audioFallback.getFallbackStatus(participantId) : null,
            qualityAdaptation: this.audioQualityAdaptation ? this.audioQualityAdaptation.getAdaptationStatus(participantId) : null,
            recordingOptimization: this.audioRecordingOptimization ? this.audioRecordingOptimization.getOptimizationStatus(participantId) : null,
            qualityMetrics: this.qualityMonitor ? this.qualityMonitor.getQualityMetrics(participantId) : null
        };
    }

    /**
     * Remove comprehensive audio processing for participant
     */
    removeComprehensiveProcessing(participantId) {
        try {
            // Remove from all processing services
            if (this.audioFilters) {
                this.audioFilters.removeFilters(participantId);
            }

            if (this.audioCompression) {
                this.audioCompression.removeCompression(participantId);
            }

            if (this.audioSynchronization) {
                this.audioSynchronization.removeSynchronization(participantId);
            }

            if (this.audioFallback) {
                this.audioFallback.removeFallback(participantId);
            }

            if (this.audioQualityAdaptation) {
                this.audioQualityAdaptation.removeAdaptation(participantId);
            }

            if (this.audioRecordingOptimization) {
                this.audioRecordingOptimization.removeOptimization(participantId);
            }

            if (this.qualityMonitor) {
                this.qualityMonitor.removeParticipant(participantId);
            }

            console.log(`Comprehensive audio processing removed for participant: ${participantId}`);

        } catch (error) {
            console.error(`Failed to remove comprehensive processing for ${participantId}:`, error);
        }
    }

    /**
     * Remove quality change listener
     */
    removeQualityListener(callback) {
        if (this.qualityMonitor) {
            this.qualityMonitor.removeQualityListener(callback);
        }
    }

    /**
     * Add alert listener
     */
    addAlertListener(callback) {
        if (this.qualityMonitor) {
            this.qualityMonitor.addAlertListener(callback);
        }
    }

    /**
     * Remove alert listener
     */
    removeAlertListener(callback) {
        if (this.qualityMonitor) {
            this.qualityMonitor.removeAlertListener(callback);
        }
    }

    /**
     * Cleanup audio controls
     */
    cleanup() {
        this.stopVolumeMonitoring();

        // Disconnect all audio nodes
        this.gainNodes.forEach(gainNode => gainNode.disconnect());
        this.analyserNodes.clear();
        this.gainNodes.clear();
        this.audioStreams.clear();
        this.volumeMeters.clear();
        this.participantSettings.clear();

        // Close audio context
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
    }
}

// Global instance
window.audioControls = new AudioControls();
