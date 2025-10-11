class AudioQualityMonitor {
    constructor() {
        this.isInitialized = false;
        this.monitoringInterval = null;
        this.participantMetrics = new Map(); // participantId -> metrics
        this.qualityListeners = new Set();
        this.alertListeners = new Set();
        
        // Quality thresholds
        this.qualityThresholds = {
            excellent: {
                volume: { min: 0.1, max: 0.8 },
                speechQuality: { min: 0.8 },
                backgroundNoise: { max: 0.05 },
                signalToNoise: { min: 20 }, // dB
                dynamicRange: { min: 10 }, // dB
                clipping: { max: 0.01 }, // percentage
                dropouts: { max: 0 }, // count per minute
                latency: { max: 50 } // ms
            },
            good: {
                volume: { min: 0.05, max: 0.9 },
                speechQuality: { min: 0.6 },
                backgroundNoise: { max: 0.1 },
                signalToNoise: { min: 15 },
                dynamicRange: { min: 6 },
                clipping: { max: 0.05 },
                dropouts: { max: 2 },
                latency: { max: 100 }
            },
            fair: {
                volume: { min: 0.02, max: 0.95 },
                speechQuality: { min: 0.4 },
                backgroundNoise: { max: 0.2 },
                signalToNoise: { min: 10 },
                dynamicRange: { min: 3 },
                clipping: { max: 0.1 },
                dropouts: { max: 5 },
                latency: { max: 200 }
            }
        };
        
        // Monitoring settings
        this.settings = {
            updateInterval: 100, // ms
            historyLength: 300, // samples (30 seconds at 100ms intervals)
            alertCooldown: 5000, // ms
            qualityCalculationWindow: 50 // samples for quality calculation
        };
        
        this.init();
    }

    /**
     * Initialize audio quality monitor
     */
    init() {
        this.isInitialized = true;
        console.log('Audio Quality Monitor initialized');
    }

    /**
     * Start monitoring a participant
     */
    startMonitoring(participantId, audioControls) {
        if (!this.isInitialized) return;

        const metrics = {
            participantId,
            audioControls,
            isMonitoring: true,
            lastUpdate: Date.now(),
            
            // Current values
            current: {
                volume: 0,
                peakVolume: 0,
                speechQuality: 0,
                backgroundNoise: 0,
                signalToNoise: 0,
                dynamicRange: 0,
                clipping: 0,
                dropouts: 0,
                latency: 0,
                isSpeaking: false,
                audioProcessingActive: true
            },
            
            // Historical data
            history: {
                volume: [],
                speechQuality: [],
                backgroundNoise: [],
                signalToNoise: [],
                dynamicRange: [],
                clipping: [],
                dropouts: [],
                latency: []
            },
            
            // Quality scores
            quality: {
                overall: 'unknown',
                volume: 'unknown',
                clarity: 'unknown',
                noise: 'unknown',
                stability: 'unknown'
            },
            
            // Alerts
            alerts: [],
            lastAlertTime: 0,
            
            // Statistics
            stats: {
                totalSamples: 0,
                speakingTime: 0,
                silenceTime: 0,
                qualityDrops: 0,
                reconnections: 0,
                avgVolume: 0,
                avgSpeechQuality: 0,
                avgBackgroundNoise: 0
            }
        };
        
        this.participantMetrics.set(participantId, metrics);
        
        // Start monitoring if not already running
        if (!this.monitoringInterval) {
            this.startMonitoringLoop();
        }
        
        console.log(`Started quality monitoring for participant: ${participantId}`);
    }

    /**
     * Stop monitoring a participant
     */
    stopMonitoring(participantId) {
        const metrics = this.participantMetrics.get(participantId);
        if (metrics) {
            metrics.isMonitoring = false;
            this.participantMetrics.delete(participantId);
            
            console.log(`Stopped quality monitoring for participant: ${participantId}`);
        }
        
        // Stop monitoring loop if no participants
        if (this.participantMetrics.size === 0 && this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }

    /**
     * Start monitoring loop
     */
    startMonitoringLoop() {
        this.monitoringInterval = setInterval(() => {
            this.updateAllMetrics();
        }, this.settings.updateInterval);
    }

    /**
     * Update metrics for all participants
     */
    updateAllMetrics() {
        this.participantMetrics.forEach((metrics, participantId) => {
            if (metrics.isMonitoring) {
                this.updateParticipantMetrics(participantId, metrics);
            }
        });
    }

    /**
     * Update metrics for a specific participant
     */
    updateParticipantMetrics(participantId, metrics) {
        try {
            const audioMetrics = metrics.audioControls.getAudioQualityMetrics(participantId);
            if (!audioMetrics) return;

            const now = Date.now();
            const deltaTime = now - metrics.lastUpdate;
            metrics.lastUpdate = now;

            // Update current values
            this.updateCurrentMetrics(metrics, audioMetrics, deltaTime);
            
            // Update historical data
            this.updateHistoricalData(metrics);
            
            // Calculate quality scores
            this.calculateQualityScores(metrics);
            
            // Update statistics
            this.updateStatistics(metrics, deltaTime);
            
            // Check for alerts
            this.checkForAlerts(participantId, metrics);
            
            // Notify listeners
            this.notifyQualityListeners(participantId, metrics);
            
        } catch (error) {
            console.error(`Failed to update metrics for ${participantId}:`, error);
        }
    }

    /**
     * Update current metrics
     */
    updateCurrentMetrics(metrics, audioMetrics, deltaTime) {
        const current = metrics.current;
        
        // Basic audio metrics
        current.volume = audioMetrics.volume || 0;
        current.peakVolume = Math.max(current.peakVolume, current.volume);
        current.speechQuality = audioMetrics.speechQuality || 0;
        current.backgroundNoise = audioMetrics.backgroundNoise || 0;
        current.isSpeaking = audioMetrics.isSpeaking || false;
        current.audioProcessingActive = audioMetrics.audioProcessingActive !== false;
        
        // Calculate signal-to-noise ratio
        if (current.backgroundNoise > 0) {
            current.signalToNoise = 20 * Math.log10(current.volume / current.backgroundNoise);
        } else {
            current.signalToNoise = current.volume > 0 ? 60 : 0; // Assume very good SNR if no noise
        }
        
        // Calculate dynamic range (simplified)
        const volumeHistory = metrics.history.volume.slice(-10); // Last 10 samples
        if (volumeHistory.length > 5) {
            const maxVol = Math.max(...volumeHistory);
            const minVol = Math.min(...volumeHistory.filter(v => v > 0.01)); // Exclude silence
            current.dynamicRange = minVol > 0 ? 20 * Math.log10(maxVol / minVol) : 0;
        }
        
        // Detect clipping (simplified)
        current.clipping = current.volume > 0.95 ? 1 : 0;
        
        // Estimate latency (simplified - would need WebRTC stats in real implementation)
        current.latency = Math.random() * 50 + 20; // Simulated 20-70ms
        
        // Detect dropouts (simplified)
        const wasActive = metrics.history.volume.slice(-1)[0] > 0.01;
        const isActive = current.volume > 0.01;
        if (wasActive && !isActive && current.isSpeaking) {
            current.dropouts++;
        }
    }

    /**
     * Update historical data
     */
    updateHistoricalData(metrics) {
        const current = metrics.current;
        const history = metrics.history;
        const maxLength = this.settings.historyLength;
        
        // Add current values to history
        Object.keys(history).forEach(key => {
            if (current[key] !== undefined) {
                history[key].push(current[key]);
                
                // Trim history to max length
                if (history[key].length > maxLength) {
                    history[key] = history[key].slice(-maxLength);
                }
            }
        });
    }

    /**
     * Calculate quality scores
     */
    calculateQualityScores(metrics) {
        const current = metrics.current;
        const quality = metrics.quality;
        
        // Volume quality
        quality.volume = this.assessMetricQuality('volume', current.volume);
        
        // Clarity quality (based on speech quality and SNR)
        const clarityScore = (current.speechQuality + Math.min(current.signalToNoise / 30, 1)) / 2;
        quality.clarity = this.assessMetricQuality('speechQuality', clarityScore);
        
        // Noise quality
        quality.noise = this.assessMetricQuality('backgroundNoise', current.backgroundNoise);
        
        // Stability quality (based on dropouts and clipping)
        const stabilityScore = 1 - (current.clipping + Math.min(current.dropouts / 10, 1)) / 2;
        quality.stability = this.assessMetricQuality('speechQuality', stabilityScore);
        
        // Overall quality (weighted average)
        const scores = {
            excellent: 4,
            good: 3,
            fair: 2,
            poor: 1,
            unknown: 0
        };
        
        const weights = { volume: 0.2, clarity: 0.4, noise: 0.3, stability: 0.1 };
        const weightedScore = Object.keys(weights).reduce((sum, key) => {
            return sum + (scores[quality[key]] || 0) * weights[key];
        }, 0);
        
        if (weightedScore >= 3.5) quality.overall = 'excellent';
        else if (weightedScore >= 2.5) quality.overall = 'good';
        else if (weightedScore >= 1.5) quality.overall = 'fair';
        else if (weightedScore >= 0.5) quality.overall = 'poor';
        else quality.overall = 'unknown';
    }

    /**
     * Assess quality of a specific metric
     */
    assessMetricQuality(metricType, value) {
        const thresholds = this.qualityThresholds;
        
        // Check excellent
        if (this.meetsThreshold(metricType, value, thresholds.excellent)) {
            return 'excellent';
        }
        
        // Check good
        if (this.meetsThreshold(metricType, value, thresholds.good)) {
            return 'good';
        }
        
        // Check fair
        if (this.meetsThreshold(metricType, value, thresholds.fair)) {
            return 'fair';
        }
        
        return 'poor';
    }

    /**
     * Check if metric meets threshold
     */
    meetsThreshold(metricType, value, threshold) {
        const limits = threshold[metricType];
        if (!limits) return true;
        
        if (limits.min !== undefined && value < limits.min) return false;
        if (limits.max !== undefined && value > limits.max) return false;
        
        return true;
    }

    /**
     * Update statistics
     */
    updateStatistics(metrics, deltaTime) {
        const stats = metrics.stats;
        const current = metrics.current;
        
        stats.totalSamples++;
        
        if (current.isSpeaking) {
            stats.speakingTime += deltaTime;
        } else {
            stats.silenceTime += deltaTime;
        }
        
        // Update averages
        const alpha = 0.1; // Smoothing factor
        stats.avgVolume = stats.avgVolume * (1 - alpha) + current.volume * alpha;
        stats.avgSpeechQuality = stats.avgSpeechQuality * (1 - alpha) + current.speechQuality * alpha;
        stats.avgBackgroundNoise = stats.avgBackgroundNoise * (1 - alpha) + current.backgroundNoise * alpha;
        
        // Count quality drops
        if (metrics.quality.overall === 'poor' && stats.totalSamples > 10) {
            stats.qualityDrops++;
        }
    }

    /**
     * Check for alerts
     */
    checkForAlerts(participantId, metrics) {
        const now = Date.now();
        if (now - metrics.lastAlertTime < this.settings.alertCooldown) return;
        
        const current = metrics.current;
        const alerts = [];
        
        // Volume alerts
        if (current.volume < 0.02) {
            alerts.push({ type: 'volume_low', message: 'Volume too low', severity: 'warning' });
        } else if (current.volume > 0.9) {
            alerts.push({ type: 'volume_high', message: 'Volume too high', severity: 'warning' });
        }
        
        // Clipping alert
        if (current.clipping > 0) {
            alerts.push({ type: 'clipping', message: 'Audio clipping detected', severity: 'error' });
        }
        
        // Background noise alert
        if (current.backgroundNoise > 0.15) {
            alerts.push({ type: 'noise_high', message: 'High background noise', severity: 'warning' });
        }
        
        // Speech quality alert
        if (current.speechQuality < 0.3) {
            alerts.push({ type: 'quality_low', message: 'Poor speech quality', severity: 'warning' });
        }
        
        // Dropout alert
        if (current.dropouts > 3) {
            alerts.push({ type: 'dropouts', message: 'Audio dropouts detected', severity: 'error' });
        }
        
        // Add alerts and notify
        if (alerts.length > 0) {
            metrics.alerts.push(...alerts.map(alert => ({
                ...alert,
                timestamp: now,
                participantId
            })));
            
            metrics.lastAlertTime = now;
            this.notifyAlertListeners(participantId, alerts);
        }
    }

    /**
     * Get metrics for a participant
     */
    getParticipantMetrics(participantId) {
        return this.participantMetrics.get(participantId);
    }

    /**
     * Get metrics for all participants
     */
    getAllMetrics() {
        const result = {};
        this.participantMetrics.forEach((metrics, participantId) => {
            result[participantId] = this.getMetricsSummary(metrics);
        });
        return result;
    }

    /**
     * Get metrics summary
     */
    getMetricsSummary(metrics) {
        return {
            participantId: metrics.participantId,
            quality: { ...metrics.quality },
            current: { ...metrics.current },
            stats: { ...metrics.stats },
            alerts: metrics.alerts.slice(-10), // Last 10 alerts
            isMonitoring: metrics.isMonitoring
        };
    }

    /**
     * Add quality change listener
     */
    addQualityListener(callback) {
        this.qualityListeners.add(callback);
    }

    /**
     * Remove quality change listener
     */
    removeQualityListener(callback) {
        this.qualityListeners.delete(callback);
    }

    /**
     * Add alert listener
     */
    addAlertListener(callback) {
        this.alertListeners.add(callback);
    }

    /**
     * Remove alert listener
     */
    removeAlertListener(callback) {
        this.alertListeners.delete(callback);
    }

    /**
     * Notify quality listeners
     */
    notifyQualityListeners(participantId, metrics) {
        const summary = this.getMetricsSummary(metrics);
        this.qualityListeners.forEach(callback => {
            try {
                callback(participantId, summary);
            } catch (error) {
                console.error('Quality listener error:', error);
            }
        });
    }

    /**
     * Notify alert listeners
     */
    notifyAlertListeners(participantId, alerts) {
        this.alertListeners.forEach(callback => {
            try {
                callback(participantId, alerts);
            } catch (error) {
                console.error('Alert listener error:', error);
            }
        });
    }

    /**
     * Reset metrics for a participant
     */
    resetMetrics(participantId) {
        const metrics = this.participantMetrics.get(participantId);
        if (metrics) {
            // Reset peak values
            metrics.current.peakVolume = 0;
            metrics.current.dropouts = 0;
            
            // Clear history
            Object.keys(metrics.history).forEach(key => {
                metrics.history[key] = [];
            });
            
            // Reset statistics
            metrics.stats = {
                totalSamples: 0,
                speakingTime: 0,
                silenceTime: 0,
                qualityDrops: 0,
                reconnections: 0,
                avgVolume: 0,
                avgSpeechQuality: 0,
                avgBackgroundNoise: 0
            };
            
            // Clear alerts
            metrics.alerts = [];
            
            console.log(`Reset metrics for participant: ${participantId}`);
        }
    }

    /**
     * Export metrics data
     */
    exportMetrics(participantId) {
        const metrics = this.participantMetrics.get(participantId);
        if (!metrics) return null;
        
        return {
            participantId,
            exportTime: new Date().toISOString(),
            quality: metrics.quality,
            current: metrics.current,
            history: metrics.history,
            stats: metrics.stats,
            alerts: metrics.alerts,
            settings: this.settings,
            thresholds: this.qualityThresholds
        };
    }

    /**
     * Cleanup monitor
     */
    cleanup() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        this.participantMetrics.clear();
        this.qualityListeners.clear();
        this.alertListeners.clear();
        
        console.log('Audio Quality Monitor cleaned up');
    }
}

// Global instance
window.audioQualityMonitor = new AudioQualityMonitor();
