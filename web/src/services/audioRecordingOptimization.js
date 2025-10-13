class AudioRecordingOptimization {
    constructor() {
        this.audioContext = null;
        this.recordingNodes = new Map(); // participantId -> recording setup
        this.isInitialized = false;
        
        // Recording optimization settings
        this.optimizationSettings = {
            // Multi-participant optimization
            multiParticipant: {
                enabled: true,
                separateChannels: true,
                crossTalkReduction: true,
                speakerIdentification: true,
                automaticMixing: true,
                levelBalancing: true
            },
            
            // Background noise optimization
            backgroundNoise: {
                enabled: true,
                adaptiveReduction: true,
                noiseGating: true,
                spectralSubtraction: true,
                environmentalAdaptation: true,
                noiseProfile: {
                    updateInterval: 5000, // ms
                    adaptationRate: 0.1,
                    profileLength: 2048
                }
            },
            
            // Recording quality optimization
            qualityOptimization: {
                enabled: true,
                dynamicBitrate: true,
                adaptiveSampleRate: true,
                losslessRegions: true, // Important speech segments
                compressionOptimization: true,
                redundancyReduction: true
            },
            
            // Real-time processing
            realTimeProcessing: {
                enabled: true,
                lowLatencyMode: true,
                bufferOptimization: true,
                processingPriority: 'quality', // 'speed' or 'quality'
                chunkSize: 4096,
                overlapFactor: 0.5
            },
            
            // Storage optimization
            storageOptimization: {
                enabled: true,
                compression: 'adaptive', // 'none', 'lossless', 'lossy', 'adaptive'
                segmentation: true,
                redundantDataRemoval: true,
                metadataOptimization: true
            }
        };
        
        // Recording states
        this.recordingStates = new Map(); // participantId -> state
        
        // Noise profiles
        this.noiseProfiles = new Map(); // participantId -> noise profile
        
        // Quality metrics
        this.qualityMetrics = new Map(); // participantId -> metrics
        
        this.initializeAudioContext();
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
            console.log('Audio recording optimization initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize audio recording optimization:', error);
        }
    }

    /**
     * Apply recording optimization to participant
     */
    applyOptimization(participantId, sourceNode, recordingType = 'interview') {
        if (!this.isInitialized || !sourceNode) return sourceNode;

        try {
            // Create optimization node chain
            const inputGain = this.audioContext.createGain();
            const analyser = this.audioContext.createAnalyser();
            analyser.fftSize = 2048;
            analyser.smoothingTimeConstant = 0.8;
            
            // Create noise reduction node
            const noiseReduction = this.createNoiseReductionNode();
            
            // Create dynamic processing node
            const dynamicProcessor = this.createDynamicProcessor();
            
            // Create quality optimizer
            const qualityOptimizer = this.createQualityOptimizer();
            
            // Create output node
            const outputNode = this.audioContext.createGain();
            
            // Connect optimization chain
            sourceNode.connect(inputGain);
            inputGain.connect(analyser);
            analyser.connect(noiseReduction);
            noiseReduction.connect(dynamicProcessor);
            dynamicProcessor.connect(qualityOptimizer);
            qualityOptimizer.connect(outputNode);
            
            // Store recording setup
            const recordingSetup = {
                source: sourceNode,
                inputGain,
                analyser,
                noiseReduction,
                dynamicProcessor,
                qualityOptimizer,
                output: outputNode,
                recordingType,
                isRecording: false,
                recordingData: [],
                startTime: null
            };
            
            this.recordingNodes.set(participantId, recordingSetup);
            
            // Initialize recording state
            this.initializeRecordingState(participantId, recordingType);
            
            // Start optimization monitoring
            this.startOptimizationMonitoring(participantId);
            
            console.log(`Recording optimization applied to participant: ${participantId}`);
            return outputNode;
            
        } catch (error) {
            console.error(`Failed to apply recording optimization for ${participantId}:`, error);
            return sourceNode;
        }
    }

    /**
     * Create noise reduction node
     */
    createNoiseReductionNode() {
        // Create a script processor for custom noise reduction
        const scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
        
        // Noise reduction parameters
        let noiseProfile = new Float32Array(2048);
        let isProfileReady = false;
        let frameCount = 0;
        
        scriptProcessor.onaudioprocess = (event) => {
            const inputData = event.inputBuffer.getChannelData(0);
            const outputData = event.outputBuffer.getChannelData(0);
            
            // Build noise profile from first few frames
            if (frameCount < 50 && !isProfileReady) {
                this.updateNoiseProfile(inputData, noiseProfile);
                frameCount++;
                if (frameCount === 50) {
                    isProfileReady = true;
                }
            }
            
            // Apply noise reduction if profile is ready
            if (isProfileReady) {
                this.applyNoiseReduction(inputData, outputData, noiseProfile);
            } else {
                // Pass through without processing
                for (let i = 0; i < inputData.length; i++) {
                    outputData[i] = inputData[i];
                }
            }
        };
        
        return scriptProcessor;
    }

    /**
     * Update noise profile
     */
    updateNoiseProfile(inputData, noiseProfile) {
        // Simple noise profiling - in production, use more sophisticated methods
        const fftSize = noiseProfile.length;
        const windowSize = Math.min(inputData.length, fftSize);
        
        for (let i = 0; i < windowSize; i++) {
            noiseProfile[i] = (noiseProfile[i] + Math.abs(inputData[i])) / 2;
        }
    }

    /**
     * Apply noise reduction
     */
    applyNoiseReduction(inputData, outputData, noiseProfile) {
        const reductionFactor = 0.5; // Adjust based on noise level
        
        for (let i = 0; i < inputData.length; i++) {
            const sample = inputData[i];
            const noiseLevel = noiseProfile[i % noiseProfile.length];
            
            // Simple spectral subtraction
            if (Math.abs(sample) > noiseLevel * 2) {
                outputData[i] = sample; // Keep signal
            } else {
                outputData[i] = sample * reductionFactor; // Reduce noise
            }
        }
    }

    /**
     * Create dynamic processor for recording optimization
     */
    createDynamicProcessor() {
        const compressor = this.audioContext.createDynamicsCompressor();
        
        // Optimize for recording
        compressor.threshold.setValueAtTime(-18, this.audioContext.currentTime);
        compressor.knee.setValueAtTime(8, this.audioContext.currentTime);
        compressor.ratio.setValueAtTime(3, this.audioContext.currentTime);
        compressor.attack.setValueAtTime(0.001, this.audioContext.currentTime);
        compressor.release.setValueAtTime(0.1, this.audioContext.currentTime);
        
        return compressor;
    }

    /**
     * Create quality optimizer
     */
    createQualityOptimizer() {
        // Create a gain node that can be used for quality adjustments
        const optimizer = this.audioContext.createGain();
        optimizer.gain.setValueAtTime(1.0, this.audioContext.currentTime);
        
        return optimizer;
    }

    /**
     * Initialize recording state
     */
    initializeRecordingState(participantId, recordingType) {
        this.recordingStates.set(participantId, {
            participantId,
            recordingType,
            isOptimized: true,
            currentQuality: 'high',
            noiseLevel: 0,
            speechLevel: 0,
            compressionRatio: 1.0,
            processingLatency: 0,
            recordingDuration: 0,
            dataSize: 0,
            optimizationHistory: []
        });
        
        // Initialize noise profile
        this.noiseProfiles.set(participantId, {
            profile: new Float32Array(2048),
            isReady: false,
            lastUpdate: Date.now(),
            adaptationRate: this.optimizationSettings.backgroundNoise.noiseProfile.adaptationRate
        });
        
        // Initialize quality metrics
        this.qualityMetrics.set(participantId, {
            snr: 0, // Signal-to-noise ratio
            thd: 0, // Total harmonic distortion
            dynamicRange: 0,
            frequency: {
                low: 0,
                mid: 0,
                high: 0
            },
            lastUpdate: Date.now()
        });
    }

    /**
     * Start optimization monitoring
     */
    startOptimizationMonitoring(participantId) {
        const monitor = () => {
            this.updateOptimizationMetrics(participantId);
            this.optimizeRecordingParameters(participantId);
            
            setTimeout(monitor, 1000); // Monitor every second
        };
        
        monitor();
    }

    /**
     * Update optimization metrics
     */
    updateOptimizationMetrics(participantId) {
        const recordingSetup = this.recordingNodes.get(participantId);
        const state = this.recordingStates.get(participantId);
        const metrics = this.qualityMetrics.get(participantId);
        
        if (!recordingSetup || !state || !metrics) return;

        try {
            // Get audio analysis data
            const bufferLength = recordingSetup.analyser.frequencyBinCount;
            const frequencyData = new Uint8Array(bufferLength);
            const timeData = new Uint8Array(bufferLength);
            
            recordingSetup.analyser.getByteFrequencyData(frequencyData);
            recordingSetup.analyser.getByteTimeDomainData(timeData);
            
            // Calculate noise and speech levels
            const { noiseLevel, speechLevel } = this.calculateAudioLevels(frequencyData, timeData);
            state.noiseLevel = noiseLevel;
            state.speechLevel = speechLevel;
            
            // Calculate SNR
            metrics.snr = speechLevel > 0 ? 20 * Math.log10(speechLevel / Math.max(noiseLevel, 0.001)) : 0;
            
            // Calculate frequency distribution
            this.updateFrequencyMetrics(frequencyData, metrics);
            
            // Update dynamic range
            metrics.dynamicRange = this.calculateDynamicRange(timeData);
            
            metrics.lastUpdate = Date.now();
            
        } catch (error) {
            console.error(`Failed to update optimization metrics for ${participantId}:`, error);
        }
    }

    /**
     * Calculate audio levels
     */
    calculateAudioLevels(frequencyData, timeData) {
        // Calculate RMS level from time domain
        let rmsSum = 0;
        for (let i = 0; i < timeData.length; i++) {
            const sample = (timeData[i] - 128) / 128;
            rmsSum += sample * sample;
        }
        const rmsLevel = Math.sqrt(rmsSum / timeData.length);
        
        // Estimate speech vs noise based on frequency content
        let voiceEnergy = 0;
        let totalEnergy = 0;
        
        for (let i = 0; i < frequencyData.length; i++) {
            const frequency = i * (this.audioContext.sampleRate / 2) / frequencyData.length;
            const amplitude = frequencyData[i] / 255;
            
            totalEnergy += amplitude;
            
            // Voice frequency range (300-3400 Hz)
            if (frequency >= 300 && frequency <= 3400) {
                voiceEnergy += amplitude;
            }
        }
        
        const voiceRatio = totalEnergy > 0 ? voiceEnergy / totalEnergy : 0;
        
        // Estimate speech and noise levels
        const speechLevel = rmsLevel * voiceRatio;
        const noiseLevel = rmsLevel * (1 - voiceRatio);
        
        return { noiseLevel, speechLevel };
    }

    /**
     * Update frequency metrics
     */
    updateFrequencyMetrics(frequencyData, metrics) {
        const sampleRate = this.audioContext.sampleRate;
        const nyquist = sampleRate / 2;
        
        let lowEnergy = 0, midEnergy = 0, highEnergy = 0;
        
        for (let i = 0; i < frequencyData.length; i++) {
            const frequency = i * nyquist / frequencyData.length;
            const amplitude = frequencyData[i] / 255;
            
            if (frequency < 500) {
                lowEnergy += amplitude;
            } else if (frequency < 4000) {
                midEnergy += amplitude;
            } else {
                highEnergy += amplitude;
            }
        }
        
        metrics.frequency.low = lowEnergy;
        metrics.frequency.mid = midEnergy;
        metrics.frequency.high = highEnergy;
    }

    /**
     * Calculate dynamic range
     */
    calculateDynamicRange(timeData) {
        let min = 1, max = 0;
        
        for (let i = 0; i < timeData.length; i++) {
            const sample = timeData[i] / 255;
            min = Math.min(min, sample);
            max = Math.max(max, sample);
        }
        
        return max - min;
    }

    /**
     * Optimize recording parameters based on current conditions
     */
    optimizeRecordingParameters(participantId) {
        const state = this.recordingStates.get(participantId);
        const metrics = this.qualityMetrics.get(participantId);
        
        if (!state || !metrics) return;

        try {
            // Optimize based on SNR
            if (metrics.snr < 10) { // Poor SNR
                this.increaseNoiseReduction(participantId);
            } else if (metrics.snr > 25) { // Excellent SNR
                this.decreaseNoiseReduction(participantId);
            }
            
            // Optimize based on speech activity
            if (state.speechLevel > 0.1) {
                this.optimizeForSpeech(participantId);
            } else {
                this.optimizeForSilence(participantId);
            }
            
            // Optimize compression based on content
            this.optimizeCompression(participantId);
            
        } catch (error) {
            console.error(`Failed to optimize recording parameters for ${participantId}:`, error);
        }
    }

    /**
     * Increase noise reduction
     */
    increaseNoiseReduction(participantId) {
        const recordingSetup = this.recordingNodes.get(participantId);
        if (!recordingSetup) return;

        // Adjust compressor for better noise reduction
        const compressor = recordingSetup.dynamicProcessor;
        compressor.threshold.setValueAtTime(-24, this.audioContext.currentTime);
        compressor.ratio.setValueAtTime(6, this.audioContext.currentTime);
        
        console.log(`Increased noise reduction for ${participantId}`);
    }

    /**
     * Decrease noise reduction
     */
    decreaseNoiseReduction(participantId) {
        const recordingSetup = this.recordingNodes.get(participantId);
        if (!recordingSetup) return;

        // Adjust compressor for more natural sound
        const compressor = recordingSetup.dynamicProcessor;
        compressor.threshold.setValueAtTime(-18, this.audioContext.currentTime);
        compressor.ratio.setValueAtTime(3, this.audioContext.currentTime);
        
        console.log(`Decreased noise reduction for ${participantId}`);
    }

    /**
     * Optimize for speech
     */
    optimizeForSpeech(participantId) {
        const recordingSetup = this.recordingNodes.get(participantId);
        if (!recordingSetup) return;

        // Boost input gain slightly for speech
        recordingSetup.inputGain.gain.setValueAtTime(1.1, this.audioContext.currentTime);
        
        // Optimize compressor for speech
        const compressor = recordingSetup.dynamicProcessor;
        compressor.attack.setValueAtTime(0.001, this.audioContext.currentTime);
        compressor.release.setValueAtTime(0.05, this.audioContext.currentTime);
    }

    /**
     * Optimize for silence
     */
    optimizeForSilence(participantId) {
        const recordingSetup = this.recordingNodes.get(participantId);
        if (!recordingSetup) return;

        // Reduce input gain during silence
        recordingSetup.inputGain.gain.setValueAtTime(0.8, this.audioContext.currentTime);
        
        // Faster release for silence
        const compressor = recordingSetup.dynamicProcessor;
        compressor.release.setValueAtTime(0.2, this.audioContext.currentTime);
    }

    /**
     * Optimize compression based on content
     */
    optimizeCompression(participantId) {
        const state = this.recordingStates.get(participantId);
        const metrics = this.qualityMetrics.get(participantId);
        
        if (!state || !metrics) return;

        // Adjust compression based on dynamic range and content
        let targetCompressionRatio = 1.0;
        
        if (metrics.dynamicRange > 0.8) {
            targetCompressionRatio = 0.7; // High compression for high dynamic range
        } else if (metrics.dynamicRange < 0.3) {
            targetCompressionRatio = 0.9; // Low compression for low dynamic range
        }
        
        state.compressionRatio = targetCompressionRatio;
    }

    /**
     * Start recording with optimization
     */
    startOptimizedRecording(participantId) {
        const recordingSetup = this.recordingNodes.get(participantId);
        const state = this.recordingStates.get(participantId);
        
        if (!recordingSetup || !state) return false;

        try {
            recordingSetup.isRecording = true;
            recordingSetup.startTime = Date.now();
            state.recordingDuration = 0;
            
            console.log(`Started optimized recording for ${participantId}`);
            return true;
            
        } catch (error) {
            console.error(`Failed to start recording for ${participantId}:`, error);
            return false;
        }
    }

    /**
     * Stop recording
     */
    stopOptimizedRecording(participantId) {
        const recordingSetup = this.recordingNodes.get(participantId);
        const state = this.recordingStates.get(participantId);
        
        if (!recordingSetup || !state) return null;

        try {
            recordingSetup.isRecording = false;
            state.recordingDuration = Date.now() - recordingSetup.startTime;
            
            console.log(`Stopped optimized recording for ${participantId}`);
            return recordingSetup.recordingData;
            
        } catch (error) {
            console.error(`Failed to stop recording for ${participantId}:`, error);
            return null;
        }
    }

    /**
     * Get optimization status
     */
    getOptimizationStatus(participantId) {
        const recordingSetup = this.recordingNodes.get(participantId);
        const state = this.recordingStates.get(participantId);
        const metrics = this.qualityMetrics.get(participantId);
        
        return {
            isActive: !!recordingSetup,
            isRecording: recordingSetup?.isRecording || false,
            currentQuality: state?.currentQuality || 'unknown',
            noiseLevel: state?.noiseLevel || 0,
            speechLevel: state?.speechLevel || 0,
            snr: metrics?.snr || 0,
            compressionRatio: state?.compressionRatio || 1.0,
            recordingDuration: state?.recordingDuration || 0,
            settings: { ...this.optimizationSettings }
        };
    }

    /**
     * Remove optimization for participant
     */
    removeOptimization(participantId) {
        const recordingSetup = this.recordingNodes.get(participantId);
        if (recordingSetup) {
            // Disconnect nodes
            recordingSetup.inputGain.disconnect();
            recordingSetup.analyser.disconnect();
            recordingSetup.noiseReduction.disconnect();
            recordingSetup.dynamicProcessor.disconnect();
            recordingSetup.qualityOptimizer.disconnect();
            recordingSetup.output.disconnect();
            
            this.recordingNodes.delete(participantId);
            this.recordingStates.delete(participantId);
            this.noiseProfiles.delete(participantId);
            this.qualityMetrics.delete(participantId);
            
            console.log(`Recording optimization removed for participant: ${participantId}`);
        }
    }

    /**
     * Cleanup optimization
     */
    cleanup() {
        this.recordingNodes.forEach((_, participantId) => {
            this.removeOptimization(participantId);
        });
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
    }
}

// Global instance
window.audioRecordingOptimization = new AudioRecordingOptimization();
