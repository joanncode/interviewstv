class AudioFilters {
    constructor() {
        this.audioContext = null;
        this.filterChains = new Map(); // participantId -> filter chain
        this.isInitialized = false;
        
        // Filter settings
        this.filterSettings = {
            // High-pass filter for removing low-frequency noise
            highPass: {
                enabled: true,
                frequency: 80, // Hz
                Q: 0.7
            },
            // Low-pass filter for removing high-frequency noise
            lowPass: {
                enabled: true,
                frequency: 8000, // Hz
                Q: 0.7
            },
            // Bandpass filter for voice enhancement
            voiceEnhancement: {
                enabled: true,
                frequency: 1000, // Hz (center frequency for voice)
                Q: 2.0,
                gain: 3 // dB
            },
            // Compressor for dynamic range control
            compressor: {
                enabled: true,
                threshold: -24, // dB
                knee: 30,
                ratio: 12,
                attack: 0.003, // seconds
                release: 0.25 // seconds
            },
            // Gate for noise reduction
            gate: {
                enabled: true,
                threshold: -50, // dB
                ratio: 10,
                attack: 0.001,
                release: 0.1
            },
            // Equalizer bands
            equalizer: {
                enabled: true,
                bands: [
                    { frequency: 100, gain: 0, Q: 1 },   // Bass
                    { frequency: 300, gain: 0, Q: 1 },   // Low-mid
                    { frequency: 1000, gain: 2, Q: 1 },  // Mid (voice)
                    { frequency: 3000, gain: 1, Q: 1 },  // High-mid
                    { frequency: 8000, gain: -1, Q: 1 }  // Treble
                ]
            }
        };
        
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
            console.log('Audio filters initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize audio filters:', error);
        }
    }

    /**
     * Create filter chain for a participant
     */
    createFilterChain(participantId, sourceNode) {
        if (!this.isInitialized || !sourceNode) return null;

        try {
            const filterChain = {
                source: sourceNode,
                filters: {},
                output: this.audioContext.createGain()
            };

            // Create high-pass filter
            filterChain.filters.highPass = this.createHighPassFilter();
            
            // Create low-pass filter
            filterChain.filters.lowPass = this.createLowPassFilter();
            
            // Create voice enhancement filter
            filterChain.filters.voiceEnhancement = this.createVoiceEnhancementFilter();
            
            // Create compressor
            filterChain.filters.compressor = this.createCompressor();
            
            // Create gate
            filterChain.filters.gate = this.createGate();
            
            // Create equalizer
            filterChain.filters.equalizer = this.createEqualizer();
            
            // Connect filter chain
            this.connectFilterChain(filterChain);
            
            // Store filter chain
            this.filterChains.set(participantId, filterChain);
            
            console.log(`Filter chain created for participant: ${participantId}`);
            return filterChain;
            
        } catch (error) {
            console.error(`Failed to create filter chain for ${participantId}:`, error);
            return null;
        }
    }

    /**
     * Create high-pass filter
     */
    createHighPassFilter() {
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(
            this.filterSettings.highPass.frequency, 
            this.audioContext.currentTime
        );
        filter.Q.setValueAtTime(
            this.filterSettings.highPass.Q, 
            this.audioContext.currentTime
        );
        return filter;
    }

    /**
     * Create low-pass filter
     */
    createLowPassFilter() {
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(
            this.filterSettings.lowPass.frequency, 
            this.audioContext.currentTime
        );
        filter.Q.setValueAtTime(
            this.filterSettings.lowPass.Q, 
            this.audioContext.currentTime
        );
        return filter;
    }

    /**
     * Create voice enhancement filter
     */
    createVoiceEnhancementFilter() {
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.setValueAtTime(
            this.filterSettings.voiceEnhancement.frequency, 
            this.audioContext.currentTime
        );
        filter.Q.setValueAtTime(
            this.filterSettings.voiceEnhancement.Q, 
            this.audioContext.currentTime
        );
        filter.gain.setValueAtTime(
            this.filterSettings.voiceEnhancement.gain, 
            this.audioContext.currentTime
        );
        return filter;
    }

    /**
     * Create compressor
     */
    createCompressor() {
        const compressor = this.audioContext.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(
            this.filterSettings.compressor.threshold, 
            this.audioContext.currentTime
        );
        compressor.knee.setValueAtTime(
            this.filterSettings.compressor.knee, 
            this.audioContext.currentTime
        );
        compressor.ratio.setValueAtTime(
            this.filterSettings.compressor.ratio, 
            this.audioContext.currentTime
        );
        compressor.attack.setValueAtTime(
            this.filterSettings.compressor.attack, 
            this.audioContext.currentTime
        );
        compressor.release.setValueAtTime(
            this.filterSettings.compressor.release, 
            this.audioContext.currentTime
        );
        return compressor;
    }

    /**
     * Create gate (using compressor with high ratio)
     */
    createGate() {
        const gate = this.audioContext.createDynamicsCompressor();
        gate.threshold.setValueAtTime(
            this.filterSettings.gate.threshold, 
            this.audioContext.currentTime
        );
        gate.ratio.setValueAtTime(
            this.filterSettings.gate.ratio, 
            this.audioContext.currentTime
        );
        gate.attack.setValueAtTime(
            this.filterSettings.gate.attack, 
            this.audioContext.currentTime
        );
        gate.release.setValueAtTime(
            this.filterSettings.gate.release, 
            this.audioContext.currentTime
        );
        return gate;
    }

    /**
     * Create equalizer
     */
    createEqualizer() {
        const equalizer = {
            bands: []
        };
        
        this.filterSettings.equalizer.bands.forEach(band => {
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'peaking';
            filter.frequency.setValueAtTime(band.frequency, this.audioContext.currentTime);
            filter.Q.setValueAtTime(band.Q, this.audioContext.currentTime);
            filter.gain.setValueAtTime(band.gain, this.audioContext.currentTime);
            equalizer.bands.push(filter);
        });
        
        return equalizer;
    }

    /**
     * Connect filter chain
     */
    connectFilterChain(filterChain) {
        let currentNode = filterChain.source;
        
        // Connect filters in order
        if (this.filterSettings.highPass.enabled) {
            currentNode.connect(filterChain.filters.highPass);
            currentNode = filterChain.filters.highPass;
        }
        
        if (this.filterSettings.gate.enabled) {
            currentNode.connect(filterChain.filters.gate);
            currentNode = filterChain.filters.gate;
        }
        
        if (this.filterSettings.equalizer.enabled) {
            // Connect equalizer bands in series
            filterChain.filters.equalizer.bands.forEach(band => {
                currentNode.connect(band);
                currentNode = band;
            });
        }
        
        if (this.filterSettings.voiceEnhancement.enabled) {
            currentNode.connect(filterChain.filters.voiceEnhancement);
            currentNode = filterChain.filters.voiceEnhancement;
        }
        
        if (this.filterSettings.compressor.enabled) {
            currentNode.connect(filterChain.filters.compressor);
            currentNode = filterChain.filters.compressor;
        }
        
        if (this.filterSettings.lowPass.enabled) {
            currentNode.connect(filterChain.filters.lowPass);
            currentNode = filterChain.filters.lowPass;
        }
        
        // Connect to output
        currentNode.connect(filterChain.output);
    }

    /**
     * Apply filters to participant audio
     */
    applyFilters(participantId, sourceNode) {
        const filterChain = this.createFilterChain(participantId, sourceNode);
        return filterChain ? filterChain.output : sourceNode;
    }

    /**
     * Remove filters for participant
     */
    removeFilters(participantId) {
        const filterChain = this.filterChains.get(participantId);
        if (filterChain) {
            // Disconnect all nodes
            Object.values(filterChain.filters).forEach(filter => {
                if (filter.disconnect) {
                    filter.disconnect();
                } else if (filter.bands) {
                    // Equalizer bands
                    filter.bands.forEach(band => band.disconnect());
                }
            });
            
            filterChain.output.disconnect();
            this.filterChains.delete(participantId);
            
            console.log(`Filters removed for participant: ${participantId}`);
        }
    }

    /**
     * Update filter settings
     */
    updateFilterSettings(participantId, filterType, settings) {
        const filterChain = this.filterChains.get(participantId);
        if (!filterChain) return;

        try {
            switch (filterType) {
                case 'highPass':
                    this.updateHighPassFilter(filterChain.filters.highPass, settings);
                    break;
                case 'lowPass':
                    this.updateLowPassFilter(filterChain.filters.lowPass, settings);
                    break;
                case 'voiceEnhancement':
                    this.updateVoiceEnhancementFilter(filterChain.filters.voiceEnhancement, settings);
                    break;
                case 'compressor':
                    this.updateCompressor(filterChain.filters.compressor, settings);
                    break;
                case 'gate':
                    this.updateGate(filterChain.filters.gate, settings);
                    break;
                case 'equalizer':
                    this.updateEqualizer(filterChain.filters.equalizer, settings);
                    break;
            }
            
            console.log(`Updated ${filterType} for participant: ${participantId}`);
            
        } catch (error) {
            console.error(`Failed to update ${filterType} for ${participantId}:`, error);
        }
    }

    /**
     * Update high-pass filter
     */
    updateHighPassFilter(filter, settings) {
        if (settings.frequency !== undefined) {
            filter.frequency.setValueAtTime(settings.frequency, this.audioContext.currentTime);
        }
        if (settings.Q !== undefined) {
            filter.Q.setValueAtTime(settings.Q, this.audioContext.currentTime);
        }
    }

    /**
     * Update low-pass filter
     */
    updateLowPassFilter(filter, settings) {
        if (settings.frequency !== undefined) {
            filter.frequency.setValueAtTime(settings.frequency, this.audioContext.currentTime);
        }
        if (settings.Q !== undefined) {
            filter.Q.setValueAtTime(settings.Q, this.audioContext.currentTime);
        }
    }

    /**
     * Update voice enhancement filter
     */
    updateVoiceEnhancementFilter(filter, settings) {
        if (settings.frequency !== undefined) {
            filter.frequency.setValueAtTime(settings.frequency, this.audioContext.currentTime);
        }
        if (settings.Q !== undefined) {
            filter.Q.setValueAtTime(settings.Q, this.audioContext.currentTime);
        }
        if (settings.gain !== undefined) {
            filter.gain.setValueAtTime(settings.gain, this.audioContext.currentTime);
        }
    }

    /**
     * Update compressor
     */
    updateCompressor(compressor, settings) {
        if (settings.threshold !== undefined) {
            compressor.threshold.setValueAtTime(settings.threshold, this.audioContext.currentTime);
        }
        if (settings.knee !== undefined) {
            compressor.knee.setValueAtTime(settings.knee, this.audioContext.currentTime);
        }
        if (settings.ratio !== undefined) {
            compressor.ratio.setValueAtTime(settings.ratio, this.audioContext.currentTime);
        }
        if (settings.attack !== undefined) {
            compressor.attack.setValueAtTime(settings.attack, this.audioContext.currentTime);
        }
        if (settings.release !== undefined) {
            compressor.release.setValueAtTime(settings.release, this.audioContext.currentTime);
        }
    }

    /**
     * Update gate
     */
    updateGate(gate, settings) {
        if (settings.threshold !== undefined) {
            gate.threshold.setValueAtTime(settings.threshold, this.audioContext.currentTime);
        }
        if (settings.ratio !== undefined) {
            gate.ratio.setValueAtTime(settings.ratio, this.audioContext.currentTime);
        }
        if (settings.attack !== undefined) {
            gate.attack.setValueAtTime(settings.attack, this.audioContext.currentTime);
        }
        if (settings.release !== undefined) {
            gate.release.setValueAtTime(settings.release, this.audioContext.currentTime);
        }
    }

    /**
     * Update equalizer
     */
    updateEqualizer(equalizer, settings) {
        if (settings.bands && Array.isArray(settings.bands)) {
            settings.bands.forEach((bandSettings, index) => {
                if (equalizer.bands[index]) {
                    const band = equalizer.bands[index];
                    if (bandSettings.frequency !== undefined) {
                        band.frequency.setValueAtTime(bandSettings.frequency, this.audioContext.currentTime);
                    }
                    if (bandSettings.gain !== undefined) {
                        band.gain.setValueAtTime(bandSettings.gain, this.audioContext.currentTime);
                    }
                    if (bandSettings.Q !== undefined) {
                        band.Q.setValueAtTime(bandSettings.Q, this.audioContext.currentTime);
                    }
                }
            });
        }
    }

    /**
     * Toggle filter on/off
     */
    toggleFilter(participantId, filterType, enabled) {
        this.filterSettings[filterType].enabled = enabled;
        
        // Recreate filter chain with new settings
        const filterChain = this.filterChains.get(participantId);
        if (filterChain) {
            this.removeFilters(participantId);
            this.createFilterChain(participantId, filterChain.source);
        }
        
        console.log(`${filterType} ${enabled ? 'enabled' : 'disabled'} for ${participantId}`);
    }

    /**
     * Get filter settings
     */
    getFilterSettings() {
        return JSON.parse(JSON.stringify(this.filterSettings));
    }

    /**
     * Apply preset filter configuration
     */
    applyPreset(participantId, presetName) {
        const presets = {
            'voice-clarity': {
                highPass: { frequency: 100, Q: 0.7 },
                voiceEnhancement: { frequency: 1200, gain: 4, Q: 2.5 },
                compressor: { threshold: -20, ratio: 8 },
                equalizer: {
                    bands: [
                        { frequency: 100, gain: -2 },
                        { frequency: 300, gain: 0 },
                        { frequency: 1000, gain: 3 },
                        { frequency: 3000, gain: 2 },
                        { frequency: 8000, gain: -1 }
                    ]
                }
            },
            'noise-reduction': {
                highPass: { frequency: 120, Q: 1.0 },
                lowPass: { frequency: 6000, Q: 1.0 },
                gate: { threshold: -45, ratio: 15 },
                compressor: { threshold: -18, ratio: 6 }
            },
            'broadcast-quality': {
                highPass: { frequency: 80, Q: 0.7 },
                voiceEnhancement: { frequency: 1000, gain: 2, Q: 1.5 },
                compressor: { threshold: -16, ratio: 4, attack: 0.001, release: 0.1 },
                equalizer: {
                    bands: [
                        { frequency: 100, gain: 0 },
                        { frequency: 300, gain: 1 },
                        { frequency: 1000, gain: 2 },
                        { frequency: 3000, gain: 1 },
                        { frequency: 8000, gain: 0 }
                    ]
                }
            }
        };
        
        const preset = presets[presetName];
        if (preset) {
            Object.keys(preset).forEach(filterType => {
                this.updateFilterSettings(participantId, filterType, preset[filterType]);
            });
            
            console.log(`Applied preset "${presetName}" to ${participantId}`);
        }
    }

    /**
     * Cleanup filters
     */
    cleanup() {
        this.filterChains.forEach((filterChain, participantId) => {
            this.removeFilters(participantId);
        });
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
    }
}

// Global instance
window.audioFilters = new AudioFilters();
