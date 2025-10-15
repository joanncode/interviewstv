/**
 * Smart Camera Switching Demo
 * AI-powered automatic camera switching demonstration
 */
class SmartCameraDemo {
    constructor() {
        this.sessionId = null;
        this.sessionActive = false;
        this.currentCamera = 'main-camera';
        this.metrics = {
            totalSwitches: 0,
            autoSwitches: 0,
            avgSwitchTime: 0,
            successRate: 100,
            confidenceScore: 0
        };
        this.audioData = {
            level: 0,
            frequency: 0,
            speaker: null,
            confidence: 0
        };
        this.engagementData = {
            host: 0.6,
            guest: 0.75
        };
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeAudioVisualizer();
        this.startSimulation();
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        // Session controls
        this.interviewIdInput = document.getElementById('interview-id');
        this.switchingModeSelect = document.getElementById('switching-mode');
        this.sensitivitySelect = document.getElementById('sensitivity');
        this.startSessionBtn = document.getElementById('start-session-btn');
        this.stopSessionBtn = document.getElementById('stop-session-btn');
        
        // Status indicators
        this.sessionStatus = document.getElementById('session-status');
        this.sessionStatusText = document.getElementById('session-status-text');
        
        // Camera elements
        this.mainCamera = document.getElementById('main-camera');
        this.hostCamera = document.getElementById('host-camera');
        this.guestCamera = document.getElementById('guest-camera');
        
        // Audio elements
        this.audioBars = document.getElementById('audio-bars');
        this.speakerDetection = document.getElementById('speaker-detection');
        this.speakerConfidence = document.getElementById('speaker-confidence');
        this.simulateAudioBtn = document.getElementById('simulate-audio-btn');
        
        // Engagement elements
        this.hostEngagement = document.getElementById('host-engagement');
        this.hostEngagementText = document.getElementById('host-engagement-text');
        this.guestEngagement = document.getElementById('guest-engagement');
        this.guestEngagementText = document.getElementById('guest-engagement-text');
        this.simulateEngagementBtn = document.getElementById('simulate-engagement-btn');
        
        // Metrics elements
        this.totalSwitchesCounter = document.getElementById('total-switches');
        this.autoSwitchesCounter = document.getElementById('auto-switches');
        this.avgSwitchTimeCounter = document.getElementById('avg-switch-time');
        this.successRateCounter = document.getElementById('success-rate');
        this.confidenceScoreCounter = document.getElementById('confidence-score');
        
        // Log elements
        this.switchingLog = document.getElementById('switching-log');
        this.clearLogBtn = document.getElementById('clear-log-btn');
        
        // Loading spinner
        this.loadingSpinner = document.getElementById('loading-spinner');
        
        // Toast container
        this.toastContainer = document.getElementById('toast-container');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.startSessionBtn.addEventListener('click', () => this.startSession());
        this.stopSessionBtn.addEventListener('click', () => this.stopSession());
        this.simulateAudioBtn.addEventListener('click', () => this.simulateAudioData());
        this.simulateEngagementBtn.addEventListener('click', () => this.simulateEngagementData());
        this.clearLogBtn.addEventListener('click', () => this.clearLog());
        
        // Scenario buttons
        document.querySelectorAll('.scenario-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const scenario = e.target.closest('.scenario-btn').dataset.scenario;
                this.runTestScenario(scenario);
            });
        });
        
        // Camera click handlers for manual switching
        this.hostCamera.addEventListener('click', () => this.manualSwitch('host-camera'));
        this.guestCamera.addEventListener('click', () => this.manualSwitch('guest-camera'));
    }

    /**
     * Initialize audio visualizer
     */
    initializeAudioVisualizer() {
        // Create audio bars
        for (let i = 0; i < 20; i++) {
            const bar = document.createElement('div');
            bar.className = 'audio-bar';
            bar.style.height = '2px';
            this.audioBars.appendChild(bar);
        }
    }

    /**
     * Start smart camera switching session
     */
    async startSession() {
        try {
            this.showLoading(true);
            
            const sessionData = {
                interview_id: this.interviewIdInput.value.trim() || 'demo_interview_001',
                mode: this.switchingModeSelect.value,
                sensitivity: this.sensitivitySelect.value,
                switch_delay: this.getSwitchDelay(),
                audio_threshold: this.getAudioThreshold(),
                engagement_threshold: 0.7,
                speaker_detection_enabled: true,
                audio_level_switching: true,
                engagement_switching: true,
                fallback_enabled: true,
                transition_effects: true
            };
            
            const response = await fetch('/interviews-tv/api/smart-camera/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(sessionData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.sessionId = data.session.session_id;
                this.sessionActive = true;
                
                // Configure cameras
                await this.configureCameras();
                
                // Update UI
                this.updateSessionStatus(true);
                this.addLogEntry('Session started successfully', 'success');
                this.showToast('Smart camera switching session started', 'success');
                
                // Start real-time processing
                this.startRealTimeProcessing();
                
            } else {
                throw new Error(data.error || 'Failed to start session');
            }
            
        } catch (error) {
            console.error('Failed to start session:', error);
            this.addLogEntry(`Failed to start session: ${error.message}`, 'error');
            this.showToast('Failed to start session: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Configure cameras for the session
     */
    async configureCameras() {
        try {
            const cameras = [
                {
                    camera_id: 'host_cam',
                    device_id: 'device_1',
                    name: 'Host Camera',
                    position: 'host',
                    priority: 1,
                    auto_switch_enabled: true,
                    audio_threshold: 0.1,
                    engagement_threshold: 0.5
                },
                {
                    camera_id: 'guest_cam',
                    device_id: 'device_2',
                    name: 'Guest Camera',
                    position: 'guest',
                    priority: 2,
                    auto_switch_enabled: true,
                    audio_threshold: 0.1,
                    engagement_threshold: 0.5
                },
                {
                    camera_id: 'wide_cam',
                    device_id: 'device_3',
                    name: 'Wide Shot',
                    position: 'wide',
                    priority: 3,
                    auto_switch_enabled: true,
                    audio_threshold: 0.05,
                    engagement_threshold: 0.3
                }
            ];
            
            const response = await fetch(`/interviews-tv/api/smart-camera/sessions/${this.sessionId}/cameras`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ cameras })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.addLogEntry('Cameras configured successfully', 'info');
            } else {
                throw new Error(data.error || 'Failed to configure cameras');
            }
            
        } catch (error) {
            console.error('Failed to configure cameras:', error);
            this.addLogEntry(`Failed to configure cameras: ${error.message}`, 'error');
        }
    }

    /**
     * Stop smart camera switching session
     */
    async stopSession() {
        try {
            if (!this.sessionId) return;
            
            const response = await fetch(`/interviews-tv/api/smart-camera/sessions/${this.sessionId}/stop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.sessionActive = false;
                this.sessionId = null;
                
                // Update UI
                this.updateSessionStatus(false);
                this.addLogEntry('Session stopped successfully', 'info');
                this.showToast('Smart camera switching session stopped', 'info');
                
                // Stop real-time processing
                this.stopRealTimeProcessing();
                
            } else {
                throw new Error(data.error || 'Failed to stop session');
            }
            
        } catch (error) {
            console.error('Failed to stop session:', error);
            this.addLogEntry(`Failed to stop session: ${error.message}`, 'error');
            this.showToast('Failed to stop session: ' + error.message, 'error');
        }
    }

    /**
     * Start real-time processing simulation
     */
    startRealTimeProcessing() {
        // Simulate audio data processing
        this.audioInterval = setInterval(() => {
            if (this.sessionActive) {
                this.generateAudioData();
                this.processAudioData();
            }
        }, 500);
        
        // Simulate engagement data processing
        this.engagementInterval = setInterval(() => {
            if (this.sessionActive) {
                this.generateEngagementData();
                this.processEngagementData();
            }
        }, 2000);
        
        // Update audio visualizer
        this.visualizerInterval = setInterval(() => {
            this.updateAudioVisualizer();
        }, 100);
    }

    /**
     * Stop real-time processing
     */
    stopRealTimeProcessing() {
        if (this.audioInterval) clearInterval(this.audioInterval);
        if (this.engagementInterval) clearInterval(this.engagementInterval);
        if (this.visualizerInterval) clearInterval(this.visualizerInterval);
    }

    /**
     * Generate simulated audio data
     */
    generateAudioData() {
        // Simulate realistic audio patterns
        const speakers = ['host', 'guest', null];
        const speakerWeights = [0.4, 0.4, 0.2]; // 40% host, 40% guest, 20% silence
        
        const randomSpeaker = this.weightedRandom(speakers, speakerWeights);
        
        this.audioData = {
            level: randomSpeaker ? Math.random() * 0.8 + 0.2 : Math.random() * 0.1,
            frequency: randomSpeaker ? Math.random() * 200 + 150 : 0,
            clarity: randomSpeaker ? Math.random() * 0.4 + 0.6 : 0.1,
            background_noise: Math.random() * 0.2,
            speech_pattern: randomSpeaker !== null,
            speaker_detected: randomSpeaker,
            confidence: randomSpeaker ? Math.random() * 0.3 + 0.7 : 0
        };
    }

    /**
     * Generate simulated engagement data
     */
    generateEngagementData() {
        // Simulate engagement fluctuations
        this.engagementData.host += (Math.random() - 0.5) * 0.2;
        this.engagementData.guest += (Math.random() - 0.5) * 0.2;
        
        // Keep within bounds
        this.engagementData.host = Math.max(0, Math.min(1, this.engagementData.host));
        this.engagementData.guest = Math.max(0, Math.min(1, this.engagementData.guest));
        
        // Update UI
        this.updateEngagementDisplay();
    }

    /**
     * Process audio data for smart switching
     */
    async processAudioData() {
        if (!this.sessionActive || !this.sessionId) return;

        try {
            const response = await fetch(`/interviews-tv/api/smart-camera/sessions/${this.sessionId}/audio`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ audio_data: this.audioData })
            });

            const data = await response.json();

            if (data.success && data.analysis.switching_decision?.should_switch) {
                const decision = data.analysis.switching_decision;
                await this.executeAutoSwitch(decision);
            }

            // Update audio display
            this.updateAudioDisplay();

        } catch (error) {
            console.error('Failed to process audio data:', error);
        }
    }

    /**
     * Process engagement data for smart switching
     */
    async processEngagementData() {
        if (!this.sessionActive || !this.sessionId) return;

        try {
            const engagementData = {
                participant_id: this.engagementData.host > this.engagementData.guest ? 'host' : 'guest',
                attention: Math.max(this.engagementData.host, this.engagementData.guest),
                interaction: Math.random() * 0.5 + 0.5,
                speech_activity: this.audioData.level,
                gesture_activity: Math.random() * 0.8,
                facial_expression: 'focused',
                emotion: 'engaged'
            };

            const response = await fetch(`/interviews-tv/api/smart-camera/sessions/${this.sessionId}/engagement`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ engagement_data: engagementData })
            });

            const data = await response.json();

            if (data.success) {
                // Engagement data processed successfully
            }

        } catch (error) {
            console.error('Failed to process engagement data:', error);
        }
    }

    /**
     * Execute automatic camera switch
     */
    async executeAutoSwitch(decision) {
        try {
            const switchData = {
                target_camera: this.mapCameraPosition(decision.target_camera),
                switch_type: 'auto',
                trigger_reason: decision.trigger_reason,
                confidence_score: decision.confidence_score,
                audio_level: this.audioData.level,
                speaker_detected: this.audioData.speaker_detected,
                engagement_score: Math.max(this.engagementData.host, this.engagementData.guest),
                transition_type: decision.transition_type || 'smooth'
            };

            const response = await fetch(`/interviews-tv/api/smart-camera/sessions/${this.sessionId}/switch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(switchData)
            });

            const data = await response.json();

            if (data.success) {
                this.performCameraSwitch(switchData.target_camera, 'auto', decision.trigger_reason);
                this.updateMetrics(data.switch_result);
            }

        } catch (error) {
            console.error('Failed to execute auto switch:', error);
        }
    }

    /**
     * Perform manual camera switch
     */
    async manualSwitch(targetCamera) {
        if (!this.sessionActive || !this.sessionId) {
            this.showToast('Please start a session first', 'warning');
            return;
        }

        try {
            const switchData = {
                target_camera: targetCamera,
                switch_type: 'manual',
                trigger_reason: 'manual',
                confidence_score: 1.0,
                audio_level: this.audioData.level,
                speaker_detected: this.audioData.speaker_detected,
                engagement_score: Math.max(this.engagementData.host, this.engagementData.guest),
                transition_type: 'smooth'
            };

            const response = await fetch(`/interviews-tv/api/smart-camera/sessions/${this.sessionId}/switch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(switchData)
            });

            const data = await response.json();

            if (data.success) {
                this.performCameraSwitch(targetCamera, 'manual', 'manual');
                this.updateMetrics(data.switch_result);
                this.showToast('Manual camera switch executed', 'success');
            }

        } catch (error) {
            console.error('Failed to execute manual switch:', error);
            this.showToast('Failed to execute manual switch', 'error');
        }
    }

    /**
     * Perform visual camera switch
     */
    performCameraSwitch(targetCamera, switchType, reason) {
        // Remove active class from all cameras
        document.querySelectorAll('.camera-preview').forEach(camera => {
            camera.classList.remove('active');
        });

        // Add active class to target camera
        const targetElement = document.getElementById(targetCamera);
        if (targetElement) {
            targetElement.classList.add('active');
            this.currentCamera = targetCamera;
        }

        // Add switching animation
        this.sessionStatus.className = 'status-indicator status-switching';
        setTimeout(() => {
            this.sessionStatus.className = 'status-indicator status-active';
        }, 1000);

        // Log the switch
        const cameraName = this.getCameraName(targetCamera);
        this.addLogEntry(`Switched to ${cameraName}`, switchType, reason);
    }

    /**
     * Run test scenario
     */
    async runTestScenario(scenario) {
        if (!this.sessionActive) {
            this.showToast('Please start a session first', 'warning');
            return;
        }

        this.addLogEntry(`Running test scenario: ${scenario}`, 'test');

        switch (scenario) {
            case 'speaker-change':
                this.simulateSpeakerChange();
                break;
            case 'high-engagement':
                this.simulateHighEngagement();
                break;
            case 'silence-fallback':
                this.simulateSilenceFallback();
                break;
            case 'audio-peak':
                this.simulateAudioPeak();
                break;
            case 'random-switch':
                this.simulateRandomSwitch();
                break;
        }
    }

    /**
     * Simulate speaker change scenario
     */
    simulateSpeakerChange() {
        const newSpeaker = this.audioData.speaker_detected === 'host' ? 'guest' : 'host';
        this.audioData.speaker_detected = newSpeaker;
        this.audioData.level = 0.8;
        this.audioData.confidence = 0.9;

        this.addLogEntry(`Speaker changed to ${newSpeaker}`, 'scenario');

        // Trigger immediate processing
        this.processAudioData();
    }

    /**
     * Simulate high engagement scenario
     */
    simulateHighEngagement() {
        const participant = Math.random() > 0.5 ? 'host' : 'guest';
        this.engagementData[participant] = 0.95;

        this.updateEngagementDisplay();
        this.addLogEntry(`High engagement detected: ${participant}`, 'scenario');

        // Trigger immediate processing
        this.processEngagementData();
    }

    /**
     * Simulate silence fallback scenario
     */
    simulateSilenceFallback() {
        this.audioData.level = 0.02;
        this.audioData.speaker_detected = null;
        this.audioData.confidence = 0;

        this.addLogEntry('Silence detected, fallback to wide shot', 'scenario');

        // Simulate fallback to wide camera
        setTimeout(() => {
            this.performCameraSwitch('main-camera', 'auto', 'silence_fallback');
        }, 1000);
    }

    /**
     * Simulate audio peak scenario
     */
    simulateAudioPeak() {
        this.audioData.level = 0.95;
        this.audioData.speaker_detected = Math.random() > 0.5 ? 'host' : 'guest';
        this.audioData.confidence = 0.85;

        this.addLogEntry('Audio peak detected', 'scenario');
        this.processAudioData();
    }

    /**
     * Simulate random switch scenario
     */
    simulateRandomSwitch() {
        const cameras = ['host-camera', 'guest-camera', 'main-camera'];
        const randomCamera = cameras[Math.floor(Math.random() * cameras.length)];

        this.performCameraSwitch(randomCamera, 'test', 'random_test');
        this.addLogEntry(`Random switch to ${this.getCameraName(randomCamera)}`, 'scenario');
    }

    /**
     * Update audio display
     */
    updateAudioDisplay() {
        this.speakerDetection.textContent = this.audioData.speaker_detected || 'No speaker detected';
        this.speakerConfidence.textContent = Math.round(this.audioData.confidence * 100) + '%';
    }

    /**
     * Update engagement display
     */
    updateEngagementDisplay() {
        const hostPercent = Math.round(this.engagementData.host * 100);
        const guestPercent = Math.round(this.engagementData.guest * 100);

        this.hostEngagement.style.width = hostPercent + '%';
        this.hostEngagementText.textContent = hostPercent + '%';

        this.guestEngagement.style.width = guestPercent + '%';
        this.guestEngagementText.textContent = guestPercent + '%';
    }

    /**
     * Update audio visualizer
     */
    updateAudioVisualizer() {
        const bars = this.audioBars.querySelectorAll('.audio-bar');
        const audioLevel = this.audioData.level;

        bars.forEach((bar, index) => {
            const height = Math.random() * audioLevel * 100;
            bar.style.height = Math.max(2, height) + '%';
        });
    }

    /**
     * Update session status
     */
    updateSessionStatus(active) {
        if (active) {
            this.sessionStatus.className = 'status-indicator status-active';
            this.sessionStatusText.textContent = 'Connected';
            this.startSessionBtn.disabled = true;
            this.stopSessionBtn.disabled = false;
        } else {
            this.sessionStatus.className = 'status-indicator status-inactive';
            this.sessionStatusText.textContent = 'Not Connected';
            this.startSessionBtn.disabled = false;
            this.stopSessionBtn.disabled = true;
        }
    }

    /**
     * Update metrics display
     */
    updateMetrics(switchResult) {
        this.metrics.totalSwitches++;
        if (switchResult.switch_type === 'auto') {
            this.metrics.autoSwitches++;
        }

        // Update average switch time
        const switchTime = switchResult.switch_duration_ms || 800;
        this.metrics.avgSwitchTime = Math.round(
            (this.metrics.avgSwitchTime * (this.metrics.totalSwitches - 1) + switchTime) / this.metrics.totalSwitches
        );

        // Update confidence score
        const confidence = switchResult.confidence_score || 0.8;
        this.metrics.confidenceScore = Math.round(
            (this.metrics.confidenceScore * (this.metrics.totalSwitches - 1) + confidence * 100) / this.metrics.totalSwitches
        );

        // Update display
        this.totalSwitchesCounter.textContent = this.metrics.totalSwitches;
        this.autoSwitchesCounter.textContent = this.metrics.autoSwitches;
        this.avgSwitchTimeCounter.textContent = this.metrics.avgSwitchTime + 'ms';
        this.successRateCounter.textContent = this.metrics.successRate + '%';
        this.confidenceScoreCounter.textContent = this.metrics.confidenceScore + '%';
    }

    /**
     * Add log entry
     */
    addLogEntry(message, type = 'info', reason = '') {
        const timestamp = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = 'log-entry';

        const reasonText = reason ? ` (${reason})` : '';
        entry.innerHTML = `
            <div class="log-timestamp">${timestamp}</div>
            <div class="log-action">${message}${reasonText}</div>
        `;

        this.switchingLog.insertBefore(entry, this.switchingLog.firstChild);

        // Keep only last 50 entries
        const entries = this.switchingLog.querySelectorAll('.log-entry');
        if (entries.length > 50) {
            entries[entries.length - 1].remove();
        }
    }

    /**
     * Clear log
     */
    clearLog() {
        this.switchingLog.innerHTML = '<div class="log-entry"><div class="log-timestamp">Log cleared</div></div>';
    }

    /**
     * Simulate audio data manually
     */
    simulateAudioData() {
        this.generateAudioData();
        this.updateAudioDisplay();
        this.processAudioData();
        this.showToast('Audio data simulated', 'info');
    }

    /**
     * Simulate engagement data manually
     */
    simulateEngagementData() {
        this.generateEngagementData();
        this.processEngagementData();
        this.showToast('Engagement data simulated', 'info');
    }

    /**
     * Start simulation mode
     */
    startSimulation() {
        // Start with some initial data
        this.generateAudioData();
        this.generateEngagementData();
        this.updateAudioDisplay();
        this.updateEngagementDisplay();

        // Start audio visualizer
        this.visualizerInterval = setInterval(() => {
            this.updateAudioVisualizer();
        }, 100);
    }

    /**
     * Helper methods
     */
    getSwitchDelay() {
        const sensitivity = this.sensitivitySelect.value;
        return sensitivity === 'high' ? 0.5 : sensitivity === 'low' ? 2.0 : 1.0;
    }

    getAudioThreshold() {
        const sensitivity = this.sensitivitySelect.value;
        return sensitivity === 'high' ? 0.05 : sensitivity === 'low' ? 0.2 : 0.1;
    }

    mapCameraPosition(position) {
        const mapping = {
            'host': 'host-camera',
            'guest': 'guest-camera',
            'wide': 'main-camera'
        };
        return mapping[position] || 'main-camera';
    }

    getCameraName(cameraId) {
        const names = {
            'host-camera': 'Host Camera',
            'guest-camera': 'Guest Camera',
            'main-camera': 'Wide Shot'
        };
        return names[cameraId] || 'Unknown Camera';
    }

    weightedRandom(items, weights) {
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;

        for (let i = 0; i < items.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return items[i];
            }
        }

        return items[items.length - 1];
    }

    showLoading(show) {
        this.loadingSpinner.style.display = show ? 'block' : 'none';
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info'} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        this.toastContainer.appendChild(toast);

        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }
}

// Initialize smart camera demo when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.smartCameraDemo = new SmartCameraDemo();
});
