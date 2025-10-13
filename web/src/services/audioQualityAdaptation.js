class AudioQualityAdaptation {
    constructor() {
        this.audioContext = null;
        this.adaptationNodes = new Map(); // participantId -> adaptation setup
        this.isInitialized = false;
        
        // Adaptation settings
        this.adaptationSettings = {
            // Network-based adaptation
            networkAdaptation: {
                enabled: true,
                bandwidthThresholds: [
                    { min: 0, max: 100000, quality: 'minimal' },      // < 100 kbps
                    { min: 100000, max: 500000, quality: 'low' },     // 100-500 kbps
                    { min: 500000, max: 1000000, quality: 'medium' }, // 500k-1M bps
                    { min: 1000000, max: Infinity, quality: 'high' }  // > 1 Mbps
                ],
                latencyThresholds: [
                    { max: 50, quality: 'high' },     // < 50ms
                    { max: 150, quality: 'medium' },  // 50-150ms
                    { max: 300, quality: 'low' },     // 150-300ms
                    { max: Infinity, quality: 'minimal' } // > 300ms
                ],
                adaptationInterval: 3000 // ms
            },
            
            // Device-based adaptation
            deviceAdaptation: {
                enabled: true,
                cpuThresholds: [
                    { max: 30, quality: 'high' },     // < 30% CPU
                    { max: 60, quality: 'medium' },   // 30-60% CPU
                    { max: 85, quality: 'low' },      // 60-85% CPU
                    { max: 100, quality: 'minimal' }  // > 85% CPU
                ],
                memoryThresholds: [
                    { max: 50, quality: 'high' },     // < 50% memory
                    { max: 75, quality: 'medium' },   // 50-75% memory
                    { max: 90, quality: 'low' },      // 75-90% memory
                    { max: 100, quality: 'minimal' }  // > 90% memory
                ],
                batteryThresholds: [
                    { min: 50, quality: 'high' },     // > 50% battery
                    { min: 20, quality: 'medium' },   // 20-50% battery
                    { min: 10, quality: 'low' },      // 10-20% battery
                    { min: 0, quality: 'minimal' }    // < 10% battery
                ]
            },
            
            // Quality profiles
            qualityProfiles: {
                minimal: {
                    sampleRate: 16000,
                    bitrate: 32000,
                    channels: 1,
                    compression: 'high',
                    filters: ['highpass', 'lowpass'],
                    processingComplexity: 'low'
                },
                low: {
                    sampleRate: 22050,
                    bitrate: 64000,
                    channels: 1,
                    compression: 'medium',
                    filters: ['highpass', 'lowpass', 'compressor'],
                    processingComplexity: 'low'
                },
                medium: {
                    sampleRate: 44100,
                    bitrate: 128000,
                    channels: 2,
                    compression: 'medium',
                    filters: ['highpass', 'lowpass', 'compressor', 'equalizer'],
                    processingComplexity: 'medium'
                },
                high: {
                    sampleRate: 48000,
                    bitrate: 320000,
                    channels: 2,
                    compression: 'low',
                    filters: ['highpass', 'lowpass', 'compressor', 'equalizer', 'enhancement'],
                    processingComplexity: 'high'
                }
            },
            
            // Adaptation behavior
            adaptationBehavior: {
                smoothTransitions: true,
                transitionDuration: 2000, // ms
                hysteresis: 0.1, // Prevent rapid switching
                prioritizeStability: true,
                userPreferenceWeight: 0.3
            }
        };
        
        // Current conditions
        this.currentConditions = {
            network: {
                bandwidth: 0,
                latency: 0,
                packetLoss: 0,
                jitter: 0
            },
            device: {
                cpu: 0,
                memory: 0,
                battery: 100,
                thermalState: 'normal'
            },
            lastUpdate: Date.now()
        };
        
        // Participant states
        this.participantStates = new Map(); // participantId -> state
        
        this.initializeAudioContext();
        this.startConditionMonitoring();
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
            console.log('Audio quality adaptation initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize audio quality adaptation:', error);
        }
    }

    /**
     * Apply quality adaptation to participant
     */
    applyAdaptation(participantId, sourceNode, initialQuality = 'medium') {
        if (!this.isInitialized || !sourceNode) return sourceNode;

        try {
            // Create adaptation node chain
            const inputGain = this.audioContext.createGain();
            const outputGain = this.audioContext.createGain();
            const analyser = this.audioContext.createAnalyser();
            analyser.fftSize = 256;
            
            // Create quality processing nodes
            const qualityNodes = this.createQualityNodes();
            
            // Connect basic chain
            sourceNode.connect(inputGain);
            inputGain.connect(analyser);
            
            // Connect quality nodes
            let currentNode = analyser;
            qualityNodes.forEach(node => {
                currentNode.connect(node);
                currentNode = node;
            });
            
            currentNode.connect(outputGain);
            
            // Store adaptation setup
            const adaptationSetup = {
                source: sourceNode,
                inputGain,
                outputGain,
                analyser,
                qualityNodes,
                currentQuality: initialQuality,
                targetQuality: initialQuality,
                transitionStart: null,
                lastAdaptation: Date.now(),
                qualityHistory: []
            };
            
            this.adaptationNodes.set(participantId, adaptationSetup);
            
            // Initialize participant state
            this.initializeParticipantState(participantId, initialQuality);
            
            // Apply initial quality
            this.applyQualityProfile(participantId, initialQuality);
            
            console.log(`Quality adaptation applied to participant: ${participantId}`);
            return outputGain;
            
        } catch (error) {
            console.error(`Failed to apply adaptation for ${participantId}:`, error);
            return sourceNode;
        }
    }

    /**
     * Create quality processing nodes
     */
    createQualityNodes() {
        const nodes = [];
        
        // Sample rate converter (simulated with gain)
        const sampleRateNode = this.audioContext.createGain();
        nodes.push(sampleRateNode);
        
        // Bitrate controller (simulated with compressor)
        const bitrateNode = this.audioContext.createDynamicsCompressor();
        nodes.push(bitrateNode);
        
        // Channel mixer
        const channelNode = this.audioContext.createGain();
        nodes.push(channelNode);
        
        return nodes;
    }

    /**
     * Initialize participant state
     */
    initializeParticipantState(participantId, initialQuality) {
        this.participantStates.set(participantId, {
            currentQuality: initialQuality,
            targetQuality: initialQuality,
            adaptationScore: 1.0,
            stabilityScore: 1.0,
            userPreference: 'auto',
            adaptationHistory: [],
            lastAdaptation: Date.now(),
            transitionInProgress: false
        });
    }

    /**
     * Start condition monitoring
     */
    startConditionMonitoring() {
        const interval = this.adaptationSettings.networkAdaptation.adaptationInterval;
        
        setInterval(() => {
            this.updateConditions();
            this.evaluateAdaptations();
        }, interval);
    }

    /**
     * Update current conditions
     */
    updateConditions() {
        try {
            // Update network conditions (simulated - in production use WebRTC stats)
            this.currentConditions.network = {
                bandwidth: Math.random() * 2000000 + 500000, // 0.5-2.5 Mbps
                latency: Math.random() * 200 + 20, // 20-220ms
                packetLoss: Math.random() * 0.05, // 0-5%
                jitter: Math.random() * 30 // 0-30ms
            };
            
            // Update device conditions (simulated - in production use Performance API)
            this.currentConditions.device = {
                cpu: Math.random() * 100, // 0-100%
                memory: Math.random() * 100, // 0-100%
                battery: Math.max(0, this.currentConditions.device.battery - Math.random() * 0.1), // Slowly drain
                thermalState: Math.random() > 0.9 ? 'hot' : 'normal'
            };
            
            this.currentConditions.lastUpdate = Date.now();
            
        } catch (error) {
            console.error('Failed to update conditions:', error);
        }
    }

    /**
     * Evaluate adaptations for all participants
     */
    evaluateAdaptations() {
        this.adaptationNodes.forEach((_, participantId) => {
            this.evaluateParticipantAdaptation(participantId);
        });
    }

    /**
     * Evaluate adaptation for specific participant
     */
    evaluateParticipantAdaptation(participantId) {
        const state = this.participantStates.get(participantId);
        if (!state) return;

        try {
            // Calculate optimal quality based on conditions
            const networkQuality = this.calculateNetworkQuality();
            const deviceQuality = this.calculateDeviceQuality();
            const userPreferenceQuality = this.getUserPreferenceQuality(participantId);
            
            // Combine quality scores
            const weights = {
                network: 0.4,
                device: 0.3,
                userPreference: this.adaptationSettings.adaptationBehavior.userPreferenceWeight
            };
            
            const combinedScore = 
                networkQuality * weights.network +
                deviceQuality * weights.device +
                userPreferenceQuality * weights.userPreference;
            
            // Determine target quality
            const targetQuality = this.scoreToQuality(combinedScore);
            
            // Apply hysteresis to prevent rapid switching
            if (this.shouldAdapt(participantId, targetQuality)) {
                this.adaptToQuality(participantId, targetQuality);
            }
            
        } catch (error) {
            console.error(`Failed to evaluate adaptation for ${participantId}:`, error);
        }
    }

    /**
     * Calculate network-based quality score
     */
    calculateNetworkQuality() {
        const network = this.currentConditions.network;
        const settings = this.adaptationSettings.networkAdaptation;
        
        // Bandwidth score
        let bandwidthScore = 0;
        for (const threshold of settings.bandwidthThresholds) {
            if (network.bandwidth >= threshold.min && network.bandwidth < threshold.max) {
                bandwidthScore = this.qualityToScore(threshold.quality);
                break;
            }
        }
        
        // Latency score
        let latencyScore = 0;
        for (const threshold of settings.latencyThresholds) {
            if (network.latency <= threshold.max) {
                latencyScore = this.qualityToScore(threshold.quality);
                break;
            }
        }
        
        // Packet loss penalty
        const packetLossPenalty = Math.min(1, network.packetLoss * 10);
        
        // Combined network score
        return Math.max(0, (bandwidthScore + latencyScore) / 2 - packetLossPenalty);
    }

    /**
     * Calculate device-based quality score
     */
    calculateDeviceQuality() {
        const device = this.currentConditions.device;
        const settings = this.adaptationSettings.deviceAdaptation;
        
        // CPU score
        let cpuScore = 1;
        for (const threshold of settings.cpuThresholds) {
            if (device.cpu <= threshold.max) {
                cpuScore = this.qualityToScore(threshold.quality);
                break;
            }
        }
        
        // Memory score
        let memoryScore = 1;
        for (const threshold of settings.memoryThresholds) {
            if (device.memory <= threshold.max) {
                memoryScore = this.qualityToScore(threshold.quality);
                break;
            }
        }
        
        // Battery score
        let batteryScore = 1;
        for (const threshold of settings.batteryThresholds) {
            if (device.battery >= threshold.min) {
                batteryScore = this.qualityToScore(threshold.quality);
                break;
            }
        }
        
        // Thermal penalty
        const thermalPenalty = device.thermalState === 'hot' ? 0.3 : 0;
        
        // Combined device score
        return Math.max(0, Math.min(cpuScore, memoryScore, batteryScore) - thermalPenalty);
    }

    /**
     * Get user preference quality score
     */
    getUserPreferenceQuality(participantId) {
        const state = this.participantStates.get(participantId);
        if (!state || state.userPreference === 'auto') {
            return 0.5; // Neutral
        }
        
        return this.qualityToScore(state.userPreference);
    }

    /**
     * Convert quality name to score
     */
    qualityToScore(quality) {
        const scores = {
            'minimal': 0.25,
            'low': 0.5,
            'medium': 0.75,
            'high': 1.0
        };
        return scores[quality] || 0.5;
    }

    /**
     * Convert score to quality name
     */
    scoreToQuality(score) {
        if (score >= 0.875) return 'high';
        if (score >= 0.625) return 'medium';
        if (score >= 0.375) return 'low';
        return 'minimal';
    }

    /**
     * Check if adaptation should occur
     */
    shouldAdapt(participantId, targetQuality) {
        const state = this.participantStates.get(participantId);
        if (!state) return false;

        // Don't adapt if transition is in progress
        if (state.transitionInProgress) return false;
        
        // Don't adapt if quality is the same
        if (state.currentQuality === targetQuality) return false;
        
        // Apply hysteresis
        const currentScore = this.qualityToScore(state.currentQuality);
        const targetScore = this.qualityToScore(targetQuality);
        const hysteresis = this.adaptationSettings.adaptationBehavior.hysteresis;
        
        return Math.abs(targetScore - currentScore) > hysteresis;
    }

    /**
     * Adapt to target quality
     */
    adaptToQuality(participantId, targetQuality) {
        const adaptationSetup = this.adaptationNodes.get(participantId);
        const state = this.participantStates.get(participantId);
        
        if (!adaptationSetup || !state) return;

        try {
            console.log(`Adapting ${participantId} from ${state.currentQuality} to ${targetQuality}`);
            
            // Start transition
            state.transitionInProgress = true;
            state.targetQuality = targetQuality;
            adaptationSetup.transitionStart = Date.now();
            
            // Apply quality profile
            this.applyQualityProfile(participantId, targetQuality);
            
            // Schedule transition completion
            const transitionDuration = this.adaptationSettings.adaptationBehavior.transitionDuration;
            setTimeout(() => {
                this.completeTransition(participantId);
            }, transitionDuration);
            
        } catch (error) {
            console.error(`Failed to adapt quality for ${participantId}:`, error);
        }
    }

    /**
     * Apply quality profile to participant
     */
    applyQualityProfile(participantId, quality) {
        const adaptationSetup = this.adaptationNodes.get(participantId);
        if (!adaptationSetup) return;

        const profile = this.adaptationSettings.qualityProfiles[quality];
        if (!profile) return;

        try {
            // Apply sample rate (simulated with gain adjustment)
            const sampleRateRatio = profile.sampleRate / 48000;
            adaptationSetup.qualityNodes[0].gain.setValueAtTime(
                sampleRateRatio,
                this.audioContext.currentTime
            );
            
            // Apply bitrate (simulated with compression)
            const bitrateRatio = profile.bitrate / 320000;
            const compressor = adaptationSetup.qualityNodes[1];
            compressor.threshold.setValueAtTime(
                -24 + (1 - bitrateRatio) * 20,
                this.audioContext.currentTime
            );
            
            // Apply channel configuration
            const channelGain = profile.channels === 1 ? 0.7 : 1.0;
            adaptationSetup.qualityNodes[2].gain.setValueAtTime(
                channelGain,
                this.audioContext.currentTime
            );
            
        } catch (error) {
            console.error(`Failed to apply quality profile for ${participantId}:`, error);
        }
    }

    /**
     * Complete quality transition
     */
    completeTransition(participantId) {
        const state = this.participantStates.get(participantId);
        if (!state) return;

        state.currentQuality = state.targetQuality;
        state.transitionInProgress = false;
        state.lastAdaptation = Date.now();
        
        // Update adaptation history
        state.adaptationHistory.push({
            quality: state.currentQuality,
            timestamp: Date.now(),
            conditions: { ...this.currentConditions }
        });
        
        // Keep history size manageable
        if (state.adaptationHistory.length > 50) {
            state.adaptationHistory.shift();
        }
        
        console.log(`Quality adaptation completed for ${participantId}: ${state.currentQuality}`);
    }

    /**
     * Set user preference for participant
     */
    setUserPreference(participantId, preference) {
        const state = this.participantStates.get(participantId);
        if (state) {
            state.userPreference = preference;
            console.log(`User preference set for ${participantId}: ${preference}`);
        }
    }

    /**
     * Get adaptation status for participant
     */
    getAdaptationStatus(participantId) {
        const adaptationSetup = this.adaptationNodes.get(participantId);
        const state = this.participantStates.get(participantId);
        
        return {
            isActive: !!adaptationSetup,
            currentQuality: state?.currentQuality || 'unknown',
            targetQuality: state?.targetQuality || 'unknown',
            transitionInProgress: state?.transitionInProgress || false,
            adaptationScore: state?.adaptationScore || 0,
            userPreference: state?.userPreference || 'auto',
            currentConditions: { ...this.currentConditions },
            settings: { ...this.adaptationSettings }
        };
    }

    /**
     * Remove adaptation for participant
     */
    removeAdaptation(participantId) {
        const adaptationSetup = this.adaptationNodes.get(participantId);
        if (adaptationSetup) {
            // Disconnect nodes
            adaptationSetup.inputGain.disconnect();
            adaptationSetup.outputGain.disconnect();
            adaptationSetup.analyser.disconnect();
            adaptationSetup.qualityNodes.forEach(node => node.disconnect());
            
            this.adaptationNodes.delete(participantId);
            this.participantStates.delete(participantId);
            
            console.log(`Quality adaptation removed for participant: ${participantId}`);
        }
    }

    /**
     * Cleanup adaptation
     */
    cleanup() {
        this.adaptationNodes.forEach((_, participantId) => {
            this.removeAdaptation(participantId);
        });
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
    }
}

// Global instance
window.audioQualityAdaptation = new AudioQualityAdaptation();
