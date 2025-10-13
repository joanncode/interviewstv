class AudioUIComponents {
    constructor() {
        this.volumeMeters = new Map(); // participantId -> volume meter
        this.audioControls = new Map(); // participantId -> control elements
        this.deviceIndicators = new Map(); // deviceId -> indicator
        this.isInitialized = false;
        
        // UI settings
        this.uiSettings = {
            // Volume meter settings
            volumeMeter: {
                updateInterval: 50, // ms
                peakHoldTime: 1000, // ms
                smoothingFactor: 0.8,
                segments: 20,
                colors: {
                    low: '#28a745',    // Green (0-60%)
                    medium: '#ffc107', // Yellow (60-80%)
                    high: '#fd7e14',   // Orange (80-95%)
                    peak: '#dc3545'    // Red (95-100%)
                },
                thresholds: {
                    low: 0.6,
                    medium: 0.8,
                    high: 0.95
                }
            },
            
            // Control slider settings
            controlSliders: {
                gain: { min: 0, max: 3, step: 0.1, default: 1.0 },
                volume: { min: 0, max: 1, step: 0.01, default: 0.8 },
                bass: { min: -12, max: 12, step: 1, default: 0 },
                mid: { min: -12, max: 12, step: 1, default: 0 },
                treble: { min: -12, max: 12, step: 1, default: 0 },
                compressor: { min: 0, max: 1, step: 0.1, default: 0.5 },
                noiseGate: { min: -60, max: -10, step: 1, default: -40 }
            },
            
            // Device indicator settings
            deviceIndicators: {
                updateInterval: 1000, // ms
                connectionTimeout: 5000, // ms
                qualityThresholds: {
                    excellent: 0.9,
                    good: 0.7,
                    fair: 0.5,
                    poor: 0.3
                }
            },
            
            // Animation settings
            animations: {
                enabled: true,
                duration: 300, // ms
                easing: 'ease-in-out'
            }
        };
        
        // Component templates
        this.templates = {
            volumeMeter: this.createVolumeMeterTemplate(),
            controlPanel: this.createControlPanelTemplate(),
            deviceIndicator: this.createDeviceIndicatorTemplate(),
            settingsPanel: this.createSettingsPanelTemplate()
        };
        
        this.initializeUI();
    }

    /**
     * Initialize UI components
     */
    initializeUI() {
        try {
            // Add CSS styles
            this.addUIStyles();
            
            // Initialize component containers
            this.initializeContainers();
            
            this.isInitialized = true;
            console.log('Audio UI components initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize audio UI components:', error);
        }
    }

    /**
     * Add CSS styles for audio UI components
     */
    addUIStyles() {
        const styles = `
            <style id="audio-ui-styles">
                .audio-volume-meter {
                    width: 100%;
                    height: 20px;
                    background: #2a2a2a;
                    border-radius: 10px;
                    overflow: hidden;
                    position: relative;
                    border: 1px solid #444;
                }
                
                .volume-meter-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #28a745 0%, #ffc107 60%, #fd7e14 80%, #dc3545 95%);
                    width: 0%;
                    transition: width 0.1s ease-out;
                    border-radius: 10px;
                }
                
                .volume-meter-peak {
                    position: absolute;
                    top: 0;
                    height: 100%;
                    width: 2px;
                    background: #fff;
                    transition: left 0.1s ease-out;
                }
                
                .volume-meter-segments {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    display: flex;
                }
                
                .volume-segment {
                    flex: 1;
                    margin-right: 1px;
                    background: #444;
                    transition: background-color 0.1s ease-out;
                }
                
                .volume-segment.active-low { background: #28a745; }
                .volume-segment.active-medium { background: #ffc107; }
                .volume-segment.active-high { background: #fd7e14; }
                .volume-segment.active-peak { background: #dc3545; }
                
                .audio-control-slider {
                    width: 100%;
                    height: 6px;
                    border-radius: 3px;
                    background: #444;
                    outline: none;
                    -webkit-appearance: none;
                    margin: 10px 0;
                }
                
                .audio-control-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: #FF0000;
                    cursor: pointer;
                    border: 2px solid #fff;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                }
                
                .audio-control-slider::-moz-range-thumb {
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: #FF0000;
                    cursor: pointer;
                    border: 2px solid #fff;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                }
                
                .audio-device-indicator {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 12px;
                    background: #2a2a2a;
                    border-radius: 6px;
                    border: 1px solid #444;
                    font-size: 12px;
                }
                
                .device-status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #6c757d;
                }
                
                .device-status-connected { background: #28a745; }
                .device-status-connecting { background: #ffc107; animation: pulse 1s infinite; }
                .device-status-error { background: #dc3545; }
                .device-status-warning { background: #fd7e14; }
                
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                
                .audio-control-panel {
                    background: #2a2a2a;
                    border-radius: 8px;
                    padding: 20px;
                    border: 1px solid #444;
                    margin-bottom: 15px;
                }
                
                .control-group {
                    margin-bottom: 20px;
                }
                
                .control-group h4 {
                    color: #FF0000;
                    margin-bottom: 10px;
                    font-size: 14px;
                    font-weight: 600;
                }
                
                .control-row {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    margin-bottom: 10px;
                }
                
                .control-label {
                    min-width: 80px;
                    font-size: 12px;
                    color: #ccc;
                }
                
                .control-value {
                    min-width: 50px;
                    text-align: right;
                    font-size: 12px;
                    color: #FF0000;
                    font-weight: 600;
                }
                
                .audio-settings-panel {
                    background: #1a1a1a;
                    border-radius: 8px;
                    padding: 20px;
                    border: 1px solid #444;
                    max-height: 500px;
                    overflow-y: auto;
                }
                
                .settings-section {
                    margin-bottom: 25px;
                    padding-bottom: 20px;
                    border-bottom: 1px solid #333;
                }
                
                .settings-section:last-child {
                    border-bottom: none;
                    margin-bottom: 0;
                }
                
                .settings-section h3 {
                    color: #FF0000;
                    margin-bottom: 15px;
                    font-size: 16px;
                }
                
                .audio-test-button {
                    background: #FF0000;
                    border: none;
                    color: white;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    margin-right: 10px;
                    margin-bottom: 10px;
                }
                
                .audio-test-button:hover {
                    background: #cc0000;
                }
                
                .audio-test-button:disabled {
                    background: #666;
                    cursor: not-allowed;
                }
                
                .audio-warning {
                    background: #fff3cd;
                    color: #856404;
                    padding: 10px;
                    border-radius: 4px;
                    border-left: 4px solid #ffc107;
                    margin-bottom: 10px;
                    font-size: 12px;
                }
                
                .audio-error {
                    background: #f8d7da;
                    color: #721c24;
                    padding: 10px;
                    border-radius: 4px;
                    border-left: 4px solid #dc3545;
                    margin-bottom: 10px;
                    font-size: 12px;
                }
                
                .audio-success {
                    background: #d4edda;
                    color: #155724;
                    padding: 10px;
                    border-radius: 4px;
                    border-left: 4px solid #28a745;
                    margin-bottom: 10px;
                    font-size: 12px;
                }
                
                .permission-prompt {
                    background: #2a2a2a;
                    border-radius: 8px;
                    padding: 20px;
                    text-align: center;
                    border: 1px solid #444;
                }
                
                .permission-icon {
                    font-size: 48px;
                    color: #FF0000;
                    margin-bottom: 15px;
                }
                
                .permission-title {
                    font-size: 18px;
                    font-weight: 600;
                    margin-bottom: 10px;
                    color: white;
                }
                
                .permission-description {
                    color: #ccc;
                    margin-bottom: 20px;
                    line-height: 1.5;
                }
                
                .permission-buttons {
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                }
                
                .btn-permission {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: 600;
                }
                
                .btn-permission.primary {
                    background: #FF0000;
                    color: white;
                }
                
                .btn-permission.secondary {
                    background: #6c757d;
                    color: white;
                }
                
                .troubleshooting-panel {
                    background: #2a2a2a;
                    border-radius: 8px;
                    padding: 20px;
                    border: 1px solid #444;
                }
                
                .diagnostic-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px solid #333;
                }
                
                .diagnostic-item:last-child {
                    border-bottom: none;
                }
                
                .diagnostic-status {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .status-icon {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                }
                
                .status-pass { background: #28a745; }
                .status-fail { background: #dc3545; }
                .status-warning { background: #ffc107; }
                .status-testing { background: #6c757d; animation: pulse 1s infinite; }
            </style>
        `;
        
        // Remove existing styles if any
        const existingStyles = document.getElementById('audio-ui-styles');
        if (existingStyles) {
            existingStyles.remove();
        }
        
        // Add new styles
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    /**
     * Initialize component containers
     */
    initializeContainers() {
        // Create main audio UI container if it doesn't exist
        if (!document.getElementById('audio-ui-container')) {
            const container = document.createElement('div');
            container.id = 'audio-ui-container';
            container.style.display = 'none'; // Hidden by default
            document.body.appendChild(container);
        }
    }

    /**
     * Create volume meter template
     */
    createVolumeMeterTemplate() {
        return `
            <div class="audio-volume-meter" data-participant-id="{participantId}">
                <div class="volume-meter-fill"></div>
                <div class="volume-meter-peak"></div>
                <div class="volume-meter-segments">
                    ${Array.from({length: this.uiSettings.volumeMeter.segments}, (_, i) => 
                        `<div class="volume-segment" data-segment="${i}"></div>`
                    ).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Create control panel template
     */
    createControlPanelTemplate() {
        return `
            <div class="audio-control-panel" data-participant-id="{participantId}">
                <div class="control-group">
                    <h4><i class="fas fa-volume-up"></i> Volume & Gain</h4>
                    <div class="control-row">
                        <label class="control-label">Volume</label>
                        <input type="range" class="audio-control-slider" data-control="volume" 
                               min="0" max="1" step="0.01" value="0.8">
                        <span class="control-value">80%</span>
                    </div>
                    <div class="control-row">
                        <label class="control-label">Gain</label>
                        <input type="range" class="audio-control-slider" data-control="gain" 
                               min="0" max="3" step="0.1" value="1.0">
                        <span class="control-value">1.0x</span>
                    </div>
                </div>
                
                <div class="control-group">
                    <h4><i class="fas fa-sliders-h"></i> Equalizer</h4>
                    <div class="control-row">
                        <label class="control-label">Bass</label>
                        <input type="range" class="audio-control-slider" data-control="bass" 
                               min="-12" max="12" step="1" value="0">
                        <span class="control-value">0 dB</span>
                    </div>
                    <div class="control-row">
                        <label class="control-label">Mid</label>
                        <input type="range" class="audio-control-slider" data-control="mid" 
                               min="-12" max="12" step="1" value="0">
                        <span class="control-value">0 dB</span>
                    </div>
                    <div class="control-row">
                        <label class="control-label">Treble</label>
                        <input type="range" class="audio-control-slider" data-control="treble" 
                               min="-12" max="12" step="1" value="0">
                        <span class="control-value">0 dB</span>
                    </div>
                </div>
                
                <div class="control-group">
                    <h4><i class="fas fa-compress"></i> Processing</h4>
                    <div class="control-row">
                        <label class="control-label">Compressor</label>
                        <input type="range" class="audio-control-slider" data-control="compressor" 
                               min="0" max="1" step="0.1" value="0.5">
                        <span class="control-value">50%</span>
                    </div>
                    <div class="control-row">
                        <label class="control-label">Noise Gate</label>
                        <input type="range" class="audio-control-slider" data-control="noiseGate" 
                               min="-60" max="-10" step="1" value="-40">
                        <span class="control-value">-40 dB</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create device indicator template
     */
    createDeviceIndicatorTemplate() {
        return `
            <div class="audio-device-indicator" data-device-id="{deviceId}">
                <div class="device-status-dot"></div>
                <span class="device-name">{deviceName}</span>
                <span class="device-quality">{quality}</span>
            </div>
        `;
    }

    /**
     * Create settings panel template
     */
    createSettingsPanelTemplate() {
        return `
            <div class="audio-settings-panel">
                <div class="settings-section">
                    <h3><i class="fas fa-microphone"></i> Input Devices</h3>
                    <div id="input-devices-list"></div>
                    <button class="audio-test-button" onclick="testInputDevice()">
                        <i class="fas fa-play"></i> Test Microphone
                    </button>
                </div>

                <div class="settings-section">
                    <h3><i class="fas fa-headphones"></i> Output Devices</h3>
                    <div id="output-devices-list"></div>
                    <button class="audio-test-button" onclick="testOutputDevice()">
                        <i class="fas fa-play"></i> Test Speakers
                    </button>
                </div>

                <div class="settings-section">
                    <h3><i class="fas fa-cog"></i> Audio Processing</h3>
                    <div class="control-row">
                        <label>
                            <input type="checkbox" checked> Noise Suppression
                        </label>
                    </div>
                    <div class="control-row">
                        <label>
                            <input type="checkbox" checked> Echo Cancellation
                        </label>
                    </div>
                    <div class="control-row">
                        <label>
                            <input type="checkbox" checked> Auto Gain Control
                        </label>
                    </div>
                </div>

                <div class="settings-section">
                    <h3><i class="fas fa-chart-line"></i> Quality Settings</h3>
                    <div class="control-row">
                        <label class="control-label">Quality</label>
                        <select class="form-control">
                            <option value="auto">Auto</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 3.3.1 - Create visual volume meter for participant
     */
    createVolumeMeter(participantId, container) {
        try {
            const meterHtml = this.templates.volumeMeter.replace('{participantId}', participantId);
            container.innerHTML = meterHtml;

            const meterElement = container.querySelector('.audio-volume-meter');
            const fillElement = meterElement.querySelector('.volume-meter-fill');
            const peakElement = meterElement.querySelector('.volume-meter-peak');
            const segments = meterElement.querySelectorAll('.volume-segment');

            const volumeMeter = {
                element: meterElement,
                fillElement,
                peakElement,
                segments,
                currentLevel: 0,
                peakLevel: 0,
                peakHoldTime: 0,
                lastUpdate: Date.now()
            };

            this.volumeMeters.set(participantId, volumeMeter);

            // Start volume meter updates
            this.startVolumeMeterUpdates(participantId);

            console.log(`Volume meter created for participant: ${participantId}`);
            return meterElement;

        } catch (error) {
            console.error(`Failed to create volume meter for ${participantId}:`, error);
            return null;
        }
    }

    /**
     * Start volume meter updates
     */
    startVolumeMeterUpdates(participantId) {
        const updateMeter = () => {
            this.updateVolumeMeter(participantId);
            setTimeout(updateMeter, this.uiSettings.volumeMeter.updateInterval);
        };
        updateMeter();
    }

    /**
     * Update volume meter display
     */
    updateVolumeMeter(participantId) {
        const volumeMeter = this.volumeMeters.get(participantId);
        if (!volumeMeter) return;

        try {
            // Get audio level from audio controls
            let audioLevel = 0;
            if (window.audioControls) {
                const metrics = window.audioControls.getAudioQualityMetrics(participantId);
                audioLevel = metrics ? metrics.volume : 0;
            }

            // Smooth the audio level
            const smoothingFactor = this.uiSettings.volumeMeter.smoothingFactor;
            volumeMeter.currentLevel = volumeMeter.currentLevel * smoothingFactor + audioLevel * (1 - smoothingFactor);

            // Update peak level
            if (volumeMeter.currentLevel > volumeMeter.peakLevel) {
                volumeMeter.peakLevel = volumeMeter.currentLevel;
                volumeMeter.peakHoldTime = Date.now();
            } else if (Date.now() - volumeMeter.peakHoldTime > this.uiSettings.volumeMeter.peakHoldTime) {
                volumeMeter.peakLevel = Math.max(0, volumeMeter.peakLevel - 0.01);
            }

            // Update visual elements
            this.updateVolumeMeterVisuals(volumeMeter);

        } catch (error) {
            console.error(`Failed to update volume meter for ${participantId}:`, error);
        }
    }

    /**
     * Update volume meter visual elements
     */
    updateVolumeMeterVisuals(volumeMeter) {
        const level = volumeMeter.currentLevel;
        const peak = volumeMeter.peakLevel;
        const settings = this.uiSettings.volumeMeter;

        // Update fill bar
        volumeMeter.fillElement.style.width = `${level * 100}%`;

        // Update peak indicator
        volumeMeter.peakElement.style.left = `${peak * 100}%`;

        // Update segments
        volumeMeter.segments.forEach((segment, index) => {
            const segmentThreshold = (index + 1) / settings.segments;
            segment.className = 'volume-segment';

            if (level >= segmentThreshold) {
                if (segmentThreshold <= settings.thresholds.low) {
                    segment.classList.add('active-low');
                } else if (segmentThreshold <= settings.thresholds.medium) {
                    segment.classList.add('active-medium');
                } else if (segmentThreshold <= settings.thresholds.high) {
                    segment.classList.add('active-high');
                } else {
                    segment.classList.add('active-peak');
                }
            }
        });
    }

    /**
     * 3.3.2 - Create audio control sliders and knobs
     */
    createControlPanel(participantId, container) {
        try {
            const panelHtml = this.templates.controlPanel.replace('{participantId}', participantId);
            container.innerHTML = panelHtml;

            const panelElement = container.querySelector('.audio-control-panel');
            const sliders = panelElement.querySelectorAll('.audio-control-slider');

            // Add event listeners to sliders
            sliders.forEach(slider => {
                const controlType = slider.dataset.control;
                const valueDisplay = slider.parentElement.querySelector('.control-value');

                slider.addEventListener('input', (e) => {
                    this.handleControlChange(participantId, controlType, e.target.value, valueDisplay);
                });

                slider.addEventListener('change', (e) => {
                    this.applyControlChange(participantId, controlType, e.target.value);
                });
            });

            this.audioControls.set(participantId, {
                element: panelElement,
                sliders: Array.from(sliders)
            });

            console.log(`Control panel created for participant: ${participantId}`);
            return panelElement;

        } catch (error) {
            console.error(`Failed to create control panel for ${participantId}:`, error);
            return null;
        }
    }

    /**
     * Handle control change (real-time preview)
     */
    handleControlChange(participantId, controlType, value, valueDisplay) {
        try {
            // Update display value
            let displayValue = value;
            switch (controlType) {
                case 'volume':
                    displayValue = Math.round(value * 100) + '%';
                    break;
                case 'gain':
                    displayValue = parseFloat(value).toFixed(1) + 'x';
                    break;
                case 'bass':
                case 'mid':
                case 'treble':
                case 'noiseGate':
                    displayValue = value + ' dB';
                    break;
                case 'compressor':
                    displayValue = Math.round(value * 100) + '%';
                    break;
            }

            if (valueDisplay) {
                valueDisplay.textContent = displayValue;
            }

        } catch (error) {
            console.error(`Failed to handle control change for ${participantId}:`, error);
        }
    }

    /**
     * Apply control change to audio processing
     */
    applyControlChange(participantId, controlType, value) {
        try {
            if (!window.audioControls) return;

            const numValue = parseFloat(value);

            switch (controlType) {
                case 'volume':
                    window.audioControls.setParticipantVolume(participantId, numValue);
                    break;
                case 'gain':
                    window.audioControls.setParticipantGain(participantId, numValue);
                    break;
                case 'bass':
                case 'mid':
                case 'treble':
                    if (window.audioFilters) {
                        const eqSettings = { bands: [] };
                        eqSettings.bands[controlType === 'bass' ? 0 : controlType === 'mid' ? 2 : 4] = {
                            gain: numValue
                        };
                        window.audioFilters.updateFilterSettings(participantId, 'equalizer', eqSettings);
                    }
                    break;
                case 'compressor':
                    if (window.audioFilters) {
                        window.audioFilters.updateFilterSettings(participantId, 'compressor', {
                            threshold: -24 + (numValue * 20)
                        });
                    }
                    break;
                case 'noiseGate':
                    if (window.audioFilters) {
                        window.audioFilters.updateFilterSettings(participantId, 'gate', {
                            threshold: numValue
                        });
                    }
                    break;
            }

            console.log(`Applied ${controlType} change for ${participantId}: ${value}`);

        } catch (error) {
            console.error(`Failed to apply control change for ${participantId}:`, error);
        }
    }

    /**
     * 3.3.3 - Create audio device status indicators
     */
    createDeviceIndicator(deviceId, deviceName, container) {
        try {
            const indicatorHtml = this.templates.deviceIndicator
                .replace('{deviceId}', deviceId)
                .replace('{deviceName}', deviceName)
                .replace('{quality}', 'Good');

            container.innerHTML = indicatorHtml;

            const indicatorElement = container.querySelector('.audio-device-indicator');
            const statusDot = indicatorElement.querySelector('.device-status-dot');
            const qualitySpan = indicatorElement.querySelector('.device-quality');

            const deviceIndicator = {
                element: indicatorElement,
                statusDot,
                qualitySpan,
                deviceId,
                deviceName,
                status: 'disconnected',
                quality: 0,
                lastUpdate: Date.now()
            };

            this.deviceIndicators.set(deviceId, deviceIndicator);

            // Start device monitoring
            this.startDeviceMonitoring(deviceId);

            console.log(`Device indicator created for: ${deviceName}`);
            return indicatorElement;

        } catch (error) {
            console.error(`Failed to create device indicator for ${deviceId}:`, error);
            return null;
        }
    }

    /**
     * Start device monitoring
     */
    startDeviceMonitoring(deviceId) {
        const updateIndicator = () => {
            this.updateDeviceIndicator(deviceId);
            setTimeout(updateIndicator, this.uiSettings.deviceIndicators.updateInterval);
        };
        updateIndicator();
    }

    /**
     * Update device indicator
     */
    updateDeviceIndicator(deviceId) {
        const indicator = this.deviceIndicators.get(deviceId);
        if (!indicator) return;

        try {
            // Get device status from audio controls
            let status = 'disconnected';
            let quality = 0;

            if (window.audioControls) {
                const deviceInfo = window.audioControls.getDeviceInfo(deviceId);
                if (deviceInfo) {
                    status = deviceInfo.connected ? 'connected' : 'disconnected';
                    quality = deviceInfo.quality || 0;
                }
            }

            // Update indicator
            this.updateDeviceIndicatorVisuals(indicator, status, quality);

        } catch (error) {
            console.error(`Failed to update device indicator for ${deviceId}:`, error);
        }
    }

    /**
     * Update device indicator visuals
     */
    updateDeviceIndicatorVisuals(indicator, status, quality) {
        // Update status dot
        indicator.statusDot.className = 'device-status-dot';

        switch (status) {
            case 'connected':
                indicator.statusDot.classList.add('device-status-connected');
                break;
            case 'connecting':
                indicator.statusDot.classList.add('device-status-connecting');
                break;
            case 'error':
                indicator.statusDot.classList.add('device-status-error');
                break;
            case 'warning':
                indicator.statusDot.classList.add('device-status-warning');
                break;
            default:
                // Keep default gray color
                break;
        }

        // Update quality text
        const thresholds = this.uiSettings.deviceIndicators.qualityThresholds;
        let qualityText = 'Poor';

        if (quality >= thresholds.excellent) {
            qualityText = 'Excellent';
        } else if (quality >= thresholds.good) {
            qualityText = 'Good';
        } else if (quality >= thresholds.fair) {
            qualityText = 'Fair';
        } else if (quality >= thresholds.poor) {
            qualityText = 'Poor';
        }

        indicator.qualitySpan.textContent = qualityText;
        indicator.status = status;
        indicator.quality = quality;
    }

    /**
     * 3.3.4 - Create audio settings panel
     */
    createSettingsPanel(container) {
        try {
            container.innerHTML = this.templates.settingsPanel;

            const settingsPanel = container.querySelector('.audio-settings-panel');

            // Populate device lists
            this.populateDeviceLists(settingsPanel);

            // Add event listeners
            this.addSettingsPanelListeners(settingsPanel);

            console.log('Audio settings panel created');
            return settingsPanel;

        } catch (error) {
            console.error('Failed to create settings panel:', error);
            return null;
        }
    }

    /**
     * Populate device lists in settings panel
     */
    async populateDeviceLists(settingsPanel) {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();

            const inputList = settingsPanel.querySelector('#input-devices-list');
            const outputList = settingsPanel.querySelector('#output-devices-list');

            // Clear existing lists
            inputList.innerHTML = '';
            outputList.innerHTML = '';

            devices.forEach(device => {
                const deviceElement = document.createElement('div');
                deviceElement.className = 'control-row';

                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = device.kind === 'audioinput' ? 'input-device' : 'output-device';
                radio.value = device.deviceId;
                radio.id = `device-${device.deviceId}`;

                const label = document.createElement('label');
                label.htmlFor = radio.id;
                label.textContent = device.label || `${device.kind} ${device.deviceId.slice(0, 8)}`;

                deviceElement.appendChild(radio);
                deviceElement.appendChild(label);

                if (device.kind === 'audioinput') {
                    inputList.appendChild(deviceElement);
                } else if (device.kind === 'audiooutput') {
                    outputList.appendChild(deviceElement);
                }
            });

        } catch (error) {
            console.error('Failed to populate device lists:', error);
        }
    }

    /**
     * Add event listeners to settings panel
     */
    addSettingsPanelListeners(settingsPanel) {
        // Device selection listeners
        const deviceRadios = settingsPanel.querySelectorAll('input[type="radio"]');
        deviceRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.handleDeviceSelection(e.target.name, e.target.value);
            });
        });

        // Processing option listeners
        const checkboxes = settingsPanel.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.handleProcessingOptionChange(e.target, e.target.checked);
            });
        });

        // Quality setting listener
        const qualitySelect = settingsPanel.querySelector('select');
        if (qualitySelect) {
            qualitySelect.addEventListener('change', (e) => {
                this.handleQualityChange(e.target.value);
            });
        }
    }

    /**
     * Handle device selection
     */
    handleDeviceSelection(deviceType, deviceId) {
        try {
            if (window.audioControls) {
                if (deviceType === 'input-device') {
                    window.audioControls.setSelectedMicrophone(deviceId);
                } else if (deviceType === 'output-device') {
                    window.audioControls.setSelectedSpeaker(deviceId);
                }
            }

            console.log(`Selected ${deviceType}: ${deviceId}`);

        } catch (error) {
            console.error(`Failed to handle device selection:`, error);
        }
    }

    /**
     * Handle processing option change
     */
    handleProcessingOptionChange(checkbox, enabled) {
        try {
            const option = checkbox.parentElement.textContent.trim();

            if (window.audioControls) {
                switch (option) {
                    case 'Noise Suppression':
                        window.audioControls.setNoiseSuppression(enabled);
                        break;
                    case 'Echo Cancellation':
                        window.audioControls.setEchoCancellation(enabled);
                        break;
                    case 'Auto Gain Control':
                        window.audioControls.setAutoGainControl(enabled);
                        break;
                }
            }

            console.log(`${option} ${enabled ? 'enabled' : 'disabled'}`);

        } catch (error) {
            console.error('Failed to handle processing option change:', error);
        }
    }

    /**
     * Handle quality change
     */
    handleQualityChange(quality) {
        try {
            if (window.audioQualityAdaptation) {
                window.audioQualityAdaptation.setUserPreference('global', quality);
            }

            console.log(`Quality preference set to: ${quality}`);

        } catch (error) {
            console.error('Failed to handle quality change:', error);
        }
    }

    /**
     * 3.3.5 - Create audio troubleshooting tools
     */
    createTroubleshootingPanel(container) {
        try {
            const troubleshootingHtml = `
                <div class="troubleshooting-panel">
                    <h3><i class="fas fa-tools"></i> Audio Troubleshooting</h3>

                    <div class="diagnostic-item">
                        <span>Microphone Access</span>
                        <div class="diagnostic-status">
                            <div class="status-icon status-testing" id="mic-access-status"></div>
                            <span id="mic-access-text">Testing...</span>
                        </div>
                    </div>

                    <div class="diagnostic-item">
                        <span>Audio Input Level</span>
                        <div class="diagnostic-status">
                            <div class="status-icon status-testing" id="input-level-status"></div>
                            <span id="input-level-text">Testing...</span>
                        </div>
                    </div>

                    <div class="diagnostic-item">
                        <span>Audio Output</span>
                        <div class="diagnostic-status">
                            <div class="status-icon status-testing" id="output-status"></div>
                            <span id="output-text">Testing...</span>
                        </div>
                    </div>

                    <div class="diagnostic-item">
                        <span>Network Connection</span>
                        <div class="diagnostic-status">
                            <div class="status-icon status-testing" id="network-status"></div>
                            <span id="network-text">Testing...</span>
                        </div>
                    </div>

                    <div class="diagnostic-item">
                        <span>Audio Processing</span>
                        <div class="diagnostic-status">
                            <div class="status-icon status-testing" id="processing-status"></div>
                            <span id="processing-text">Testing...</span>
                        </div>
                    </div>

                    <div style="margin-top: 20px;">
                        <button class="audio-test-button" onclick="audioUIComponents.runDiagnostics()">
                            <i class="fas fa-play"></i> Run Full Diagnostics
                        </button>
                        <button class="audio-test-button" onclick="audioUIComponents.fixCommonIssues()">
                            <i class="fas fa-wrench"></i> Auto-Fix Issues
                        </button>
                    </div>
                </div>
            `;

            container.innerHTML = troubleshootingHtml;

            // Start initial diagnostics
            setTimeout(() => this.runDiagnostics(), 1000);

            console.log('Troubleshooting panel created');
            return container.querySelector('.troubleshooting-panel');

        } catch (error) {
            console.error('Failed to create troubleshooting panel:', error);
            return null;
        }
    }

    /**
     * Run audio diagnostics
     */
    async runDiagnostics() {
        try {
            console.log('Running audio diagnostics...');

            // Test microphone access
            await this.testMicrophoneAccess();

            // Test input level
            await this.testInputLevel();

            // Test audio output
            await this.testAudioOutput();

            // Test network connection
            await this.testNetworkConnection();

            // Test audio processing
            await this.testAudioProcessing();

            console.log('Audio diagnostics completed');

        } catch (error) {
            console.error('Failed to run diagnostics:', error);
        }
    }

    /**
     * Test microphone access
     */
    async testMicrophoneAccess() {
        const statusIcon = document.getElementById('mic-access-status');
        const statusText = document.getElementById('mic-access-text');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());

            statusIcon.className = 'status-icon status-pass';
            statusText.textContent = 'Microphone access granted';

        } catch (error) {
            statusIcon.className = 'status-icon status-fail';
            statusText.textContent = 'Microphone access denied';
        }
    }

    /**
     * Test input level
     */
    async testInputLevel() {
        const statusIcon = document.getElementById('input-level-status');
        const statusText = document.getElementById('input-level-text');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const microphone = audioContext.createMediaStreamSource(stream);

            microphone.connect(analyser);
            analyser.fftSize = 256;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            // Test for 2 seconds
            let maxLevel = 0;
            const testDuration = 2000;
            const startTime = Date.now();

            const checkLevel = () => {
                analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b) / bufferLength;
                maxLevel = Math.max(maxLevel, average);

                if (Date.now() - startTime < testDuration) {
                    requestAnimationFrame(checkLevel);
                } else {
                    // Cleanup
                    stream.getTracks().forEach(track => track.stop());
                    audioContext.close();

                    // Evaluate result
                    if (maxLevel > 50) {
                        statusIcon.className = 'status-icon status-pass';
                        statusText.textContent = 'Input level good';
                    } else if (maxLevel > 20) {
                        statusIcon.className = 'status-icon status-warning';
                        statusText.textContent = 'Input level low';
                    } else {
                        statusIcon.className = 'status-icon status-fail';
                        statusText.textContent = 'No input detected';
                    }
                }
            };

            checkLevel();

        } catch (error) {
            statusIcon.className = 'status-icon status-fail';
            statusText.textContent = 'Input test failed';
        }
    }

    /**
     * Test audio output
     */
    async testAudioOutput() {
        const statusIcon = document.getElementById('output-status');
        const statusText = document.getElementById('output-text');

        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);

            statusIcon.className = 'status-icon status-pass';
            statusText.textContent = 'Audio output working';

            setTimeout(() => audioContext.close(), 1000);

        } catch (error) {
            statusIcon.className = 'status-icon status-fail';
            statusText.textContent = 'Audio output failed';
        }
    }

    /**
     * Test network connection
     */
    async testNetworkConnection() {
        const statusIcon = document.getElementById('network-status');
        const statusText = document.getElementById('network-text');

        try {
            const startTime = Date.now();
            const response = await fetch('/api/ping', { method: 'GET' });
            const latency = Date.now() - startTime;

            if (response.ok) {
                if (latency < 100) {
                    statusIcon.className = 'status-icon status-pass';
                    statusText.textContent = `Excellent (${latency}ms)`;
                } else if (latency < 300) {
                    statusIcon.className = 'status-icon status-warning';
                    statusText.textContent = `Good (${latency}ms)`;
                } else {
                    statusIcon.className = 'status-icon status-warning';
                    statusText.textContent = `Slow (${latency}ms)`;
                }
            } else {
                statusIcon.className = 'status-icon status-fail';
                statusText.textContent = 'Connection failed';
            }

        } catch (error) {
            statusIcon.className = 'status-icon status-fail';
            statusText.textContent = 'Network error';
        }
    }

    /**
     * Test audio processing
     */
    async testAudioProcessing() {
        const statusIcon = document.getElementById('processing-status');
        const statusText = document.getElementById('processing-text');

        try {
            // Check if audio processing services are available
            const services = [
                'audioFilters', 'audioCompression', 'audioSynchronization',
                'audioFallback', 'audioQualityAdaptation', 'audioRecordingOptimization'
            ];

            const availableServices = services.filter(service => window[service]);

            if (availableServices.length === services.length) {
                statusIcon.className = 'status-icon status-pass';
                statusText.textContent = 'All processing available';
            } else if (availableServices.length > 0) {
                statusIcon.className = 'status-icon status-warning';
                statusText.textContent = `${availableServices.length}/${services.length} services`;
            } else {
                statusIcon.className = 'status-icon status-fail';
                statusText.textContent = 'No processing available';
            }

        } catch (error) {
            statusIcon.className = 'status-icon status-fail';
            statusText.textContent = 'Processing test failed';
        }
    }

    /**
     * Fix common audio issues
     */
    async fixCommonIssues() {
        try {
            console.log('Attempting to fix common audio issues...');

            // Reset audio context if needed
            if (window.audioControls) {
                await window.audioControls.resetAudioContext();
            }

            // Re-request microphone permissions
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop());
            } catch (error) {
                console.log('Could not re-request microphone permissions');
            }

            // Restart diagnostics
            setTimeout(() => this.runDiagnostics(), 1000);

            this.showNotification('Attempted to fix common issues. Running diagnostics...', 'info');

        } catch (error) {
            console.error('Failed to fix common issues:', error);
            this.showNotification('Failed to fix issues automatically', 'error');
        }
    }

    /**
     * 3.3.6 - Implement audio test functionality
     */
    createAudioTestPanel(container) {
        try {
            const testPanelHtml = `
                <div class="audio-test-panel">
                    <h3><i class="fas fa-vial"></i> Audio Testing</h3>

                    <div class="test-section">
                        <h4>Microphone Test</h4>
                        <button class="audio-test-button" onclick="audioUIComponents.testMicrophone()">
                            <i class="fas fa-microphone"></i> Test Microphone
                        </button>
                        <button class="audio-test-button" onclick="audioUIComponents.testEcho()">
                            <i class="fas fa-echo"></i> Echo Test
                        </button>
                        <div id="mic-test-result" class="test-result"></div>
                    </div>

                    <div class="test-section">
                        <h4>Speaker Test</h4>
                        <button class="audio-test-button" onclick="audioUIComponents.testSpeakers()">
                            <i class="fas fa-volume-up"></i> Test Speakers
                        </button>
                        <button class="audio-test-button" onclick="audioUIComponents.testStereo()">
                            <i class="fas fa-headphones"></i> Stereo Test
                        </button>
                        <div id="speaker-test-result" class="test-result"></div>
                    </div>

                    <div class="test-section">
                        <h4>Quality Test</h4>
                        <button class="audio-test-button" onclick="audioUIComponents.testAudioQuality()">
                            <i class="fas fa-chart-line"></i> Quality Test
                        </button>
                        <button class="audio-test-button" onclick="audioUIComponents.testLatency()">
                            <i class="fas fa-clock"></i> Latency Test
                        </button>
                        <div id="quality-test-result" class="test-result"></div>
                    </div>
                </div>
            `;

            container.innerHTML = testPanelHtml;

            console.log('Audio test panel created');
            return container.querySelector('.audio-test-panel');

        } catch (error) {
            console.error('Failed to create audio test panel:', error);
            return null;
        }
    }

    /**
     * Test microphone functionality
     */
    async testMicrophone() {
        const resultDiv = document.getElementById('mic-test-result');
        resultDiv.innerHTML = '<div class="audio-warning">Testing microphone... Please speak into your microphone.</div>';

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const microphone = audioContext.createMediaStreamSource(stream);

            microphone.connect(analyser);
            analyser.fftSize = 256;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            let maxLevel = 0;
            let samples = 0;
            const testDuration = 5000; // 5 seconds
            const startTime = Date.now();

            const checkLevel = () => {
                analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b) / bufferLength;
                maxLevel = Math.max(maxLevel, average);
                samples++;

                if (Date.now() - startTime < testDuration) {
                    requestAnimationFrame(checkLevel);
                } else {
                    // Cleanup
                    stream.getTracks().forEach(track => track.stop());
                    audioContext.close();

                    // Show results
                    if (maxLevel > 80) {
                        resultDiv.innerHTML = '<div class="audio-success">Microphone test passed! Excellent audio level detected.</div>';
                    } else if (maxLevel > 40) {
                        resultDiv.innerHTML = '<div class="audio-warning">Microphone test passed with low volume. Consider adjusting microphone settings.</div>';
                    } else {
                        resultDiv.innerHTML = '<div class="audio-error">Microphone test failed. No significant audio detected.</div>';
                    }
                }
            };

            checkLevel();

        } catch (error) {
            resultDiv.innerHTML = '<div class="audio-error">Microphone test failed: ' + error.message + '</div>';
        }
    }

    /**
     * Test echo cancellation
     */
    async testEcho() {
        const resultDiv = document.getElementById('mic-test-result');
        resultDiv.innerHTML = '<div class="audio-warning">Testing echo cancellation...</div>';

        try {
            // This is a simplified echo test
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            setTimeout(() => {
                stream.getTracks().forEach(track => track.stop());
                resultDiv.innerHTML = '<div class="audio-success">Echo cancellation is enabled and working.</div>';
            }, 2000);

        } catch (error) {
            resultDiv.innerHTML = '<div class="audio-error">Echo test failed: ' + error.message + '</div>';
        }
    }

    /**
     * Test speakers
     */
    async testSpeakers() {
        const resultDiv = document.getElementById('speaker-test-result');
        resultDiv.innerHTML = '<div class="audio-warning">Testing speakers... You should hear a tone.</div>';

        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 1);

            setTimeout(() => {
                audioContext.close();
                resultDiv.innerHTML = '<div class="audio-success">Speaker test completed. Did you hear the tone?</div>';
            }, 1500);

        } catch (error) {
            resultDiv.innerHTML = '<div class="audio-error">Speaker test failed: ' + error.message + '</div>';
        }
    }

    /**
     * Test stereo audio
     */
    async testStereo() {
        const resultDiv = document.getElementById('speaker-test-result');
        resultDiv.innerHTML = '<div class="audio-warning">Testing stereo... You should hear sounds in left and right channels.</div>';

        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Test left channel
            const leftOsc = audioContext.createOscillator();
            const leftGain = audioContext.createGain();
            const leftPanner = audioContext.createStereoPanner();

            leftOsc.connect(leftGain);
            leftGain.connect(leftPanner);
            leftPanner.connect(audioContext.destination);

            leftOsc.frequency.setValueAtTime(440, audioContext.currentTime);
            leftGain.gain.setValueAtTime(0.1, audioContext.currentTime);
            leftPanner.pan.setValueAtTime(-1, audioContext.currentTime); // Full left

            leftOsc.start();
            leftOsc.stop(audioContext.currentTime + 1);

            // Test right channel
            setTimeout(() => {
                const rightOsc = audioContext.createOscillator();
                const rightGain = audioContext.createGain();
                const rightPanner = audioContext.createStereoPanner();

                rightOsc.connect(rightGain);
                rightGain.connect(rightPanner);
                rightPanner.connect(audioContext.destination);

                rightOsc.frequency.setValueAtTime(880, audioContext.currentTime);
                rightGain.gain.setValueAtTime(0.1, audioContext.currentTime);
                rightPanner.pan.setValueAtTime(1, audioContext.currentTime); // Full right

                rightOsc.start();
                rightOsc.stop(audioContext.currentTime + 1);

                setTimeout(() => {
                    audioContext.close();
                    resultDiv.innerHTML = '<div class="audio-success">Stereo test completed. Did you hear different tones in left and right channels?</div>';
                }, 1500);
            }, 1200);

        } catch (error) {
            resultDiv.innerHTML = '<div class="audio-error">Stereo test failed: ' + error.message + '</div>';
        }
    }

    /**
     * Test audio quality
     */
    async testAudioQuality() {
        const resultDiv = document.getElementById('quality-test-result');
        resultDiv.innerHTML = '<div class="audio-warning">Testing audio quality...</div>';

        try {
            if (window.audioQualityMonitor) {
                const metrics = window.audioQualityMonitor.getQualityMetrics('test-participant');

                if (metrics) {
                    const qualityScore = (metrics.snr + metrics.clarity + metrics.stability) / 3;

                    if (qualityScore > 0.8) {
                        resultDiv.innerHTML = '<div class="audio-success">Audio quality is excellent!</div>';
                    } else if (qualityScore > 0.6) {
                        resultDiv.innerHTML = '<div class="audio-warning">Audio quality is good but could be improved.</div>';
                    } else {
                        resultDiv.innerHTML = '<div class="audio-error">Audio quality is poor. Check your microphone and network connection.</div>';
                    }
                } else {
                    resultDiv.innerHTML = '<div class="audio-warning">Quality metrics not available. Start an audio session first.</div>';
                }
            } else {
                resultDiv.innerHTML = '<div class="audio-error">Audio quality monitoring not available.</div>';
            }

        } catch (error) {
            resultDiv.innerHTML = '<div class="audio-error">Quality test failed: ' + error.message + '</div>';
        }
    }

    /**
     * Test audio latency
     */
    async testLatency() {
        const resultDiv = document.getElementById('quality-test-result');
        resultDiv.innerHTML = '<div class="audio-warning">Testing audio latency...</div>';

        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const startTime = audioContext.currentTime;

            // Create a simple audio processing chain to measure latency
            const oscillator = audioContext.createOscillator();
            const analyser = audioContext.createAnalyser();
            const gainNode = audioContext.createGain();

            oscillator.connect(analyser);
            analyser.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.01, audioContext.currentTime);

            oscillator.start();

            // Measure processing delay
            const bufferSize = audioContext.sampleRate * 0.1; // 100ms buffer
            const latency = (bufferSize / audioContext.sampleRate) * 1000;

            oscillator.stop(audioContext.currentTime + 0.1);

            setTimeout(() => {
                audioContext.close();

                if (latency < 50) {
                    resultDiv.innerHTML = '<div class="audio-success">Low latency detected: ' + latency.toFixed(1) + 'ms</div>';
                } else if (latency < 150) {
                    resultDiv.innerHTML = '<div class="audio-warning">Moderate latency: ' + latency.toFixed(1) + 'ms</div>';
                } else {
                    resultDiv.innerHTML = '<div class="audio-error">High latency detected: ' + latency.toFixed(1) + 'ms</div>';
                }
            }, 200);

        } catch (error) {
            resultDiv.innerHTML = '<div class="audio-error">Latency test failed: ' + error.message + '</div>';
        }
    }

    /**
     * 3.3.7 - Create audio permission prompts
     */
    createPermissionPrompt(container, type = 'microphone') {
        try {
            const permissionHtml = `
                <div class="permission-prompt">
                    <div class="permission-icon">
                        <i class="fas fa-${type === 'microphone' ? 'microphone' : 'headphones'}"></i>
                    </div>
                    <div class="permission-title">
                        ${type === 'microphone' ? 'Microphone' : 'Audio'} Access Required
                    </div>
                    <div class="permission-description">
                        ${type === 'microphone'
                            ? 'This interview platform needs access to your microphone to enable audio communication during interviews.'
                            : 'This platform needs access to your audio devices to provide the best interview experience.'
                        }
                    </div>
                    <div class="permission-buttons">
                        <button class="btn-permission primary" onclick="audioUIComponents.requestPermission('${type}')">
                            <i class="fas fa-check"></i> Allow Access
                        </button>
                        <button class="btn-permission secondary" onclick="audioUIComponents.denyPermission('${type}')">
                            <i class="fas fa-times"></i> Not Now
                        </button>
                    </div>
                    <div class="permission-help" style="margin-top: 15px; font-size: 12px; color: #999;">
                        <i class="fas fa-info-circle"></i>
                        You can change this permission later in your browser settings.
                    </div>
                </div>
            `;

            container.innerHTML = permissionHtml;

            console.log(`Permission prompt created for: ${type}`);
            return container.querySelector('.permission-prompt');

        } catch (error) {
            console.error(`Failed to create permission prompt for ${type}:`, error);
            return null;
        }
    }

    /**
     * Request audio permission
     */
    async requestPermission(type) {
        try {
            if (type === 'microphone') {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop());

                this.showNotification('Microphone access granted successfully!', 'success');

                // Hide permission prompt
                const prompt = document.querySelector('.permission-prompt');
                if (prompt) {
                    prompt.style.display = 'none';
                }

                // Initialize audio components
                if (window.audioControls) {
                    window.audioControls.initializeAudio();
                }

            }

        } catch (error) {
            console.error(`Failed to request ${type} permission:`, error);
            this.showNotification(`Failed to access ${type}. Please check your browser settings.`, 'error');
        }
    }

    /**
     * Handle permission denial
     */
    denyPermission(type) {
        this.showNotification(`${type} access denied. Some features may not work properly.`, 'warning');

        // Hide permission prompt
        const prompt = document.querySelector('.permission-prompt');
        if (prompt) {
            prompt.style.display = 'none';
        }
    }

    /**
     * 3.3.8 - Add audio quality warnings
     */
    createQualityWarningSystem(container) {
        try {
            const warningSystemHtml = `
                <div id="audio-quality-warnings" class="quality-warning-system" style="position: fixed; top: 20px; right: 20px; z-index: 1000; max-width: 300px;">
                    <!-- Warnings will be dynamically added here -->
                </div>
            `;

            container.innerHTML = warningSystemHtml;

            // Start quality monitoring
            this.startQualityMonitoring();

            console.log('Quality warning system created');
            return container.querySelector('.quality-warning-system');

        } catch (error) {
            console.error('Failed to create quality warning system:', error);
            return null;
        }
    }

    /**
     * Start quality monitoring for warnings
     */
    startQualityMonitoring() {
        setInterval(() => {
            this.checkAudioQuality();
        }, 5000); // Check every 5 seconds
    }

    /**
     * Check audio quality and show warnings
     */
    checkAudioQuality() {
        try {
            if (!window.audioQualityMonitor) return;

            const participants = window.audioControls ? window.audioControls.getActiveParticipants() : [];

            participants.forEach(participantId => {
                const metrics = window.audioQualityMonitor.getQualityMetrics(participantId);

                if (metrics) {
                    // Check for low volume
                    if (metrics.volume < 0.1) {
                        this.showQualityWarning('low-volume', 'Low microphone volume detected. Please speak louder or adjust your microphone settings.', 'warning');
                    }

                    // Check for high noise
                    if (metrics.noiseLevel > 0.3) {
                        this.showQualityWarning('high-noise', 'High background noise detected. Consider using noise suppression or finding a quieter environment.', 'warning');
                    }

                    // Check for poor connection
                    if (metrics.packetLoss > 0.05) {
                        this.showQualityWarning('poor-connection', 'Poor network connection detected. Audio quality may be affected.', 'error');
                    }

                    // Check for audio dropouts
                    if (metrics.dropouts > 5) {
                        this.showQualityWarning('audio-dropouts', 'Audio dropouts detected. Check your microphone connection.', 'error');
                    }

                    // Check for echo
                    if (metrics.echo > 0.2) {
                        this.showQualityWarning('echo-detected', 'Echo detected. Please use headphones or enable echo cancellation.', 'warning');
                    }
                }
            });

        } catch (error) {
            console.error('Failed to check audio quality:', error);
        }
    }

    /**
     * Show quality warning
     */
    showQualityWarning(warningId, message, type = 'warning') {
        const warningContainer = document.getElementById('audio-quality-warnings');
        if (!warningContainer) return;

        // Check if warning already exists
        if (document.getElementById(`warning-${warningId}`)) return;

        const warningHtml = `
            <div id="warning-${warningId}" class="audio-${type}" style="margin-bottom: 10px; position: relative;">
                <button onclick="audioUIComponents.dismissWarning('${warningId}')"
                        style="position: absolute; top: 5px; right: 5px; background: none; border: none; color: inherit; cursor: pointer;">
                    <i class="fas fa-times"></i>
                </button>
                <strong>${type === 'error' ? 'Audio Error' : 'Audio Warning'}:</strong><br>
                ${message}
                ${type === 'warning' ? '<br><button class="audio-test-button" onclick="audioUIComponents.fixAudioIssue(\'' + warningId + '\')">Fix Issue</button>' : ''}
            </div>
        `;

        warningContainer.insertAdjacentHTML('beforeend', warningHtml);

        // Auto-dismiss after 30 seconds for warnings
        if (type === 'warning') {
            setTimeout(() => {
                this.dismissWarning(warningId);
            }, 30000);
        }
    }

    /**
     * Dismiss quality warning
     */
    dismissWarning(warningId) {
        const warning = document.getElementById(`warning-${warningId}`);
        if (warning) {
            warning.remove();
        }
    }

    /**
     * Fix audio issue
     */
    fixAudioIssue(issueType) {
        try {
            switch (issueType) {
                case 'low-volume':
                    if (window.audioControls) {
                        window.audioControls.setGlobalGain(2.0); // Increase gain
                    }
                    this.showNotification('Microphone gain increased', 'success');
                    break;

                case 'high-noise':
                    if (window.audioFilters) {
                        window.audioFilters.enableNoiseSuppression('global', true);
                    }
                    this.showNotification('Noise suppression enabled', 'success');
                    break;

                case 'echo-detected':
                    if (window.audioFilters) {
                        window.audioFilters.enableEchoCancellation('global', true);
                    }
                    this.showNotification('Echo cancellation enabled', 'success');
                    break;

                case 'audio-dropouts':
                    if (window.audioFallback) {
                        window.audioFallback.switchToFallbackDevice('global');
                    }
                    this.showNotification('Switched to backup audio device', 'success');
                    break;

                default:
                    this.showNotification('Attempted to fix audio issue', 'info');
                    break;
            }

            // Dismiss the warning
            this.dismissWarning(issueType);

        } catch (error) {
            console.error(`Failed to fix audio issue ${issueType}:`, error);
            this.showNotification('Failed to fix audio issue automatically', 'error');
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Create notification if it doesn't exist
        let notificationContainer = document.getElementById('audio-notifications');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'audio-notifications';
            notificationContainer.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 1001; max-width: 300px;';
            document.body.appendChild(notificationContainer);
        }

        const notificationId = 'notification-' + Date.now();
        const notificationHtml = `
            <div id="${notificationId}" class="audio-${type}" style="margin-bottom: 10px;">
                ${message}
            </div>
        `;

        notificationContainer.insertAdjacentHTML('beforeend', notificationHtml);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            const notification = document.getElementById(notificationId);
            if (notification) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * Get UI component status
     */
    getUIStatus() {
        return {
            isInitialized: this.isInitialized,
            volumeMeters: this.volumeMeters.size,
            audioControls: this.audioControls.size,
            deviceIndicators: this.deviceIndicators.size,
            settings: this.uiSettings
        };
    }

    /**
     * Cleanup UI components
     */
    cleanup() {
        try {
            // Clear all maps
            this.volumeMeters.clear();
            this.audioControls.clear();
            this.deviceIndicators.clear();

            // Remove styles
            const styles = document.getElementById('audio-ui-styles');
            if (styles) {
                styles.remove();
            }

            // Remove containers
            const container = document.getElementById('audio-ui-container');
            if (container) {
                container.remove();
            }

            this.isInitialized = false;
            console.log('Audio UI components cleaned up');

        } catch (error) {
            console.error('Failed to cleanup audio UI components:', error);
        }
    }
}

// Initialize global instance
window.audioUIComponents = new AudioUIComponents();
