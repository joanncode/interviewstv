/**
 * Camera Switching System for Interviews.tv
 * Handles multiple camera devices, switching, and management
 */
class CameraSwitchingSystem {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            enableAutoDetection: true,
            enableHotSwapping: true,
            enableDeviceLabeling: true,
            enableQualityPresets: true,
            enableDevicePreview: true,
            enableDeviceStatus: true,
            maxCameras: 8,
            defaultQuality: 'high',
            autoSwitchOnDisconnect: true,
            enableDeviceMemory: true,
            enablePermissionHandling: true,
            enableErrorRecovery: true,
            accessibilitySystem: null,
            themeSystem: null,
            responsiveSystem: null,
            ...options
        };
        
        // Camera management
        this.availableCameras = new Map();
        this.activeCameras = new Map();
        this.currentCamera = null;
        this.currentStream = null;
        this.previewStreams = new Map();
        
        // Device monitoring
        this.deviceChangeListener = null;
        this.permissionStatus = new Map();
        this.deviceStatus = new Map();
        this.deviceLabels = new Map();
        
        // Quality presets
        this.qualityPresets = new Map([
            ['low', { width: 640, height: 480, frameRate: 15, bitrate: 500000 }],
            ['medium', { width: 1280, height: 720, frameRate: 24, bitrate: 1500000 }],
            ['high', { width: 1920, height: 1080, frameRate: 30, bitrate: 3000000 }],
            ['ultra', { width: 2560, height: 1440, frameRate: 30, bitrate: 6000000 }]
        ]);
        
        // UI elements
        this.cameraPanel = null;
        this.deviceSelector = null;
        this.previewContainer = null;
        this.statusIndicator = null;
        
        // State management
        this.isInitialized = false;
        this.isScanning = false;
        this.currentQuality = this.options.defaultQuality;
        this.deviceMemory = new Map();
        
        // Performance monitoring
        this.performanceStats = {
            switchTime: 0,
            averageSwitchTime: 0,
            switchCount: 0,
            failureCount: 0,
            deviceCount: 0,
            lastSwitchTime: null
        };
        
        // Event handlers
        this.boundEventHandlers = {
            handleDeviceChange: this.handleDeviceChange.bind(this),
            handlePermissionChange: this.handlePermissionChange.bind(this),
            handleCameraSwitch: this.handleCameraSwitch.bind(this),
            handleQualityChange: this.handleQualityChange.bind(this),
            handleDeviceError: this.handleDeviceError.bind(this),
            handleKeyDown: this.handleKeyDown.bind(this)
        };
        
        this.init();
    }
    
    /**
     * Initialize camera switching system
     */
    async init() {
        try {
            console.log('🎥 Initializing Camera Switching System...');
            
            // Check browser support
            if (!this.checkBrowserSupport()) {
                throw new Error('Browser does not support required camera APIs');
            }
            
            // Inject CSS
            this.injectCameraSwitchingCSS();
            
            // Create UI
            this.createCameraPanel();
            this.createDeviceSelector();
            this.createPreviewContainer();
            this.createStatusIndicator();
            
            // Setup device monitoring
            await this.setupDeviceMonitoring();
            
            // Enumerate cameras
            await this.enumerateCameras();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load device memory
            this.loadDeviceMemory();
            
            // Initialize default camera
            if (this.options.enableAutoDetection) {
                await this.initializeDefaultCamera();
            }
            
            this.isInitialized = true;
            
            console.log('✅ Camera Switching System initialized');
            
            // Emit initialization event
            this.emitCameraEvent('system-initialized', {
                cameraCount: this.availableCameras.size,
                currentCamera: this.currentCamera
            });
            
        } catch (error) {
            console.error('Failed to initialize camera switching system:', error);
            this.handleInitializationError(error);
        }
    }
    
    /**
     * Check browser support
     */
    checkBrowserSupport() {
        const requiredAPIs = [
            'navigator.mediaDevices',
            'navigator.mediaDevices.getUserMedia',
            'navigator.mediaDevices.enumerateDevices'
        ];
        
        return requiredAPIs.every(api => {
            const parts = api.split('.');
            let obj = window;
            
            for (const part of parts) {
                if (!obj || typeof obj[part] === 'undefined') {
                    console.warn(`Missing API: ${api}`);
                    return false;
                }
                obj = obj[part];
            }
            
            return true;
        });
    }
    
    /**
     * Setup device monitoring
     */
    async setupDeviceMonitoring() {
        if (!navigator.mediaDevices.addEventListener) {
            console.warn('Device change monitoring not supported');
            return;
        }
        
        // Listen for device changes
        navigator.mediaDevices.addEventListener('devicechange', this.boundEventHandlers.handleDeviceChange);
        
        // Setup permission monitoring
        if (navigator.permissions) {
            try {
                const permission = await navigator.permissions.query({ name: 'camera' });
                permission.addEventListener('change', this.boundEventHandlers.handlePermissionChange);
                this.permissionStatus.set('camera', permission.state);
            } catch (error) {
                console.warn('Permission monitoring not available:', error);
            }
        }
        
        console.log('Device monitoring setup complete');
    }
    
    /**
     * Enumerate available cameras
     */
    async enumerateCameras() {
        try {
            this.isScanning = true;
            this.updateScanningStatus(true);
            
            console.log('Enumerating camera devices...');
            
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            // Clear existing cameras
            this.availableCameras.clear();
            
            // Process each video device
            for (const device of videoDevices) {
                const cameraInfo = {
                    deviceId: device.deviceId,
                    label: device.label || `Camera ${this.availableCameras.size + 1}`,
                    groupId: device.groupId,
                    kind: device.kind,
                    capabilities: null,
                    status: 'available',
                    lastUsed: null,
                    quality: this.currentQuality,
                    isActive: false,
                    stream: null,
                    constraints: this.getQualityConstraints(this.currentQuality)
                };
                
                // Get device capabilities if available
                if (device.getCapabilities) {
                    try {
                        cameraInfo.capabilities = device.getCapabilities();
                    } catch (error) {
                        console.warn(`Failed to get capabilities for ${device.deviceId}:`, error);
                    }
                }
                
                // Check device status
                await this.checkDeviceStatus(cameraInfo);
                
                this.availableCameras.set(device.deviceId, cameraInfo);
                
                // Load device memory
                const memory = this.deviceMemory.get(device.deviceId);
                if (memory) {
                    cameraInfo.label = memory.label || cameraInfo.label;
                    cameraInfo.quality = memory.quality || cameraInfo.quality;
                    cameraInfo.lastUsed = memory.lastUsed;
                }
            }
            
            this.performanceStats.deviceCount = this.availableCameras.size;
            
            console.log(`Found ${this.availableCameras.size} camera devices`);
            
            // Update UI
            this.updateDeviceSelector();
            this.updateStatusIndicator();
            
            // Emit enumeration event
            this.emitCameraEvent('devices-enumerated', {
                deviceCount: this.availableCameras.size,
                devices: Array.from(this.availableCameras.values())
            });
            
        } catch (error) {
            console.error('Failed to enumerate cameras:', error);
            this.handleDeviceError(error);
        } finally {
            this.isScanning = false;
            this.updateScanningStatus(false);
        }
    }
    
    /**
     * Check device status
     */
    async checkDeviceStatus(cameraInfo) {
        try {
            // Try to get a test stream to verify device availability
            const testConstraints = {
                video: {
                    deviceId: { exact: cameraInfo.deviceId },
                    width: 320,
                    height: 240
                }
            };
            
            const testStream = await navigator.mediaDevices.getUserMedia(testConstraints);
            
            // Device is working
            cameraInfo.status = 'available';
            
            // Stop test stream
            testStream.getTracks().forEach(track => track.stop());
            
        } catch (error) {
            console.warn(`Device ${cameraInfo.deviceId} status check failed:`, error);
            
            if (error.name === 'NotAllowedError') {
                cameraInfo.status = 'permission-denied';
            } else if (error.name === 'NotFoundError') {
                cameraInfo.status = 'not-found';
            } else if (error.name === 'NotReadableError') {
                cameraInfo.status = 'in-use';
            } else {
                cameraInfo.status = 'error';
            }
        }
        
        this.deviceStatus.set(cameraInfo.deviceId, cameraInfo.status);
    }
    
    /**
     * Get quality constraints
     */
    getQualityConstraints(quality) {
        const preset = this.qualityPresets.get(quality);
        if (!preset) {
            console.warn(`Unknown quality preset: ${quality}`);
            return this.qualityPresets.get('medium');
        }
        
        return {
            video: {
                width: { ideal: preset.width },
                height: { ideal: preset.height },
                frameRate: { ideal: preset.frameRate }
            },
            audio: false // Camera switching typically handles video only
        };
    }
    
    /**
     * Initialize default camera
     */
    async initializeDefaultCamera() {
        if (this.availableCameras.size === 0) {
            console.warn('No cameras available for initialization');
            return;
        }
        
        // Try to use the last used camera from memory
        let defaultCamera = null;
        
        // Check device memory for last used camera
        for (const [deviceId, memory] of this.deviceMemory) {
            if (this.availableCameras.has(deviceId) && memory.lastUsed) {
                if (!defaultCamera || memory.lastUsed > defaultCamera.lastUsed) {
                    defaultCamera = this.availableCameras.get(deviceId);
                }
            }
        }
        
        // If no memory, use first available camera
        if (!defaultCamera) {
            defaultCamera = Array.from(this.availableCameras.values())[0];
        }
        
        if (defaultCamera && defaultCamera.status === 'available') {
            await this.switchToCamera(defaultCamera.deviceId);
        }
    }

    /**
     * Switch to specific camera
     */
    async switchToCamera(deviceId, quality = null) {
        try {
            const startTime = performance.now();

            console.log(`Switching to camera: ${deviceId}`);

            const camera = this.availableCameras.get(deviceId);
            if (!camera) {
                throw new Error(`Camera not found: ${deviceId}`);
            }

            if (camera.status !== 'available') {
                throw new Error(`Camera not available: ${camera.status}`);
            }

            // Use specified quality or camera's current quality
            const targetQuality = quality || camera.quality;
            const constraints = this.getQualityConstraints(targetQuality);
            constraints.video.deviceId = { exact: deviceId };

            // Stop current stream if exists
            if (this.currentStream) {
                this.currentStream.getTracks().forEach(track => track.stop());
            }

            // Get new stream
            const newStream = await navigator.mediaDevices.getUserMedia(constraints);

            // Update state
            const previousCamera = this.currentCamera;
            this.currentStream = newStream;
            this.currentCamera = deviceId;
            this.currentQuality = targetQuality;

            // Update camera info
            camera.isActive = true;
            camera.stream = newStream;
            camera.quality = targetQuality;
            camera.lastUsed = new Date();

            // Deactivate previous camera
            if (previousCamera && this.availableCameras.has(previousCamera)) {
                const prevCamera = this.availableCameras.get(previousCamera);
                prevCamera.isActive = false;
                prevCamera.stream = null;
            }

            // Update performance stats
            const switchTime = performance.now() - startTime;
            this.performanceStats.switchTime = switchTime;
            this.performanceStats.switchCount++;
            this.performanceStats.averageSwitchTime =
                (this.performanceStats.averageSwitchTime * (this.performanceStats.switchCount - 1) + switchTime) /
                this.performanceStats.switchCount;
            this.performanceStats.lastSwitchTime = new Date();

            // Update UI
            this.updateDeviceSelector();
            this.updateStatusIndicator();
            this.updatePreviewContainer();

            // Save to device memory
            this.saveDeviceMemory(deviceId, {
                label: camera.label,
                quality: targetQuality,
                lastUsed: camera.lastUsed
            });

            console.log(`Camera switched successfully in ${switchTime.toFixed(1)}ms`);

            // Announce to accessibility system
            if (this.options.accessibilitySystem) {
                this.options.accessibilitySystem.announce(
                    `Switched to ${camera.label}`,
                    'polite'
                );
            }

            // Emit switch event
            this.emitCameraEvent('camera-switched', {
                deviceId,
                camera,
                previousCamera,
                switchTime,
                quality: targetQuality
            });

            return newStream;

        } catch (error) {
            console.error('Failed to switch camera:', error);
            this.performanceStats.failureCount++;
            this.handleCameraError(deviceId, error);
            throw error;
        }
    }

    /**
     * Switch to next available camera
     */
    async switchToNextCamera() {
        const availableDevices = Array.from(this.availableCameras.values())
            .filter(camera => camera.status === 'available');

        if (availableDevices.length <= 1) {
            console.warn('No other cameras available to switch to');
            return;
        }

        const currentIndex = availableDevices.findIndex(camera => camera.deviceId === this.currentCamera);
        const nextIndex = (currentIndex + 1) % availableDevices.length;
        const nextCamera = availableDevices[nextIndex];

        await this.switchToCamera(nextCamera.deviceId);
    }

    /**
     * Switch to previous available camera
     */
    async switchToPreviousCamera() {
        const availableDevices = Array.from(this.availableCameras.values())
            .filter(camera => camera.status === 'available');

        if (availableDevices.length <= 1) {
            console.warn('No other cameras available to switch to');
            return;
        }

        const currentIndex = availableDevices.findIndex(camera => camera.deviceId === this.currentCamera);
        const prevIndex = currentIndex === 0 ? availableDevices.length - 1 : currentIndex - 1;
        const prevCamera = availableDevices[prevIndex];

        await this.switchToPreviousCamera(prevCamera.deviceId);
    }

    /**
     * Change camera quality
     */
    async changeCameraQuality(quality) {
        if (!this.qualityPresets.has(quality)) {
            throw new Error(`Unknown quality preset: ${quality}`);
        }

        if (!this.currentCamera) {
            console.warn('No active camera to change quality');
            return;
        }

        console.log(`Changing camera quality to: ${quality}`);

        // Switch to same camera with new quality
        await this.switchToCamera(this.currentCamera, quality);
    }

    /**
     * Get current camera stream
     */
    getCurrentStream() {
        return this.currentStream;
    }

    /**
     * Get current camera info
     */
    getCurrentCamera() {
        if (!this.currentCamera) {
            return null;
        }

        return this.availableCameras.get(this.currentCamera);
    }

    /**
     * Get available cameras
     */
    getAvailableCameras() {
        return Array.from(this.availableCameras.values())
            .filter(camera => camera.status === 'available');
    }

    /**
     * Get all cameras (including unavailable)
     */
    getAllCameras() {
        return Array.from(this.availableCameras.values());
    }

    /**
     * Set camera label
     */
    setCameraLabel(deviceId, label) {
        const camera = this.availableCameras.get(deviceId);
        if (camera) {
            camera.label = label;
            this.deviceLabels.set(deviceId, label);

            // Update device memory
            this.saveDeviceMemory(deviceId, {
                label,
                quality: camera.quality,
                lastUsed: camera.lastUsed
            });

            // Update UI
            this.updateDeviceSelector();

            console.log(`Camera label updated: ${deviceId} -> ${label}`);

            // Emit label change event
            this.emitCameraEvent('camera-labeled', {
                deviceId,
                label
            });
        }
    }

    /**
     * Create camera panel
     */
    createCameraPanel() {
        this.cameraPanel = document.createElement('div');
        this.cameraPanel.className = 'camera-switching-panel';
        this.cameraPanel.innerHTML = `
            <div class="camera-panel-header">
                <h4><i class="fas fa-video" aria-hidden="true"></i>Camera Switching</h4>
                <div class="camera-panel-controls">
                    <button class="camera-btn" id="refresh-cameras-btn" title="Refresh Cameras">
                        <i class="fas fa-sync" aria-hidden="true"></i>
                    </button>
                    <button class="camera-btn" id="camera-settings-btn" title="Camera Settings">
                        <i class="fas fa-cog" aria-hidden="true"></i>
                    </button>
                    <button class="camera-btn" id="close-camera-panel-btn" title="Close Panel">
                        <i class="fas fa-times" aria-hidden="true"></i>
                    </button>
                </div>
            </div>
            <div class="camera-panel-content">
                <div class="camera-selector-section">
                    <h5><i class="fas fa-list" aria-hidden="true"></i>Available Cameras</h5>
                    <div id="camera-device-selector"></div>
                </div>
                <div class="camera-quality-section">
                    <h5><i class="fas fa-sliders-h" aria-hidden="true"></i>Quality Settings</h5>
                    <div class="quality-controls">
                        <select id="camera-quality-select" class="quality-select">
                            <option value="low">Low (640×480)</option>
                            <option value="medium">Medium (1280×720)</option>
                            <option value="high" selected>High (1920×1080)</option>
                            <option value="ultra">Ultra (2560×1440)</option>
                        </select>
                    </div>
                </div>
                <div class="camera-preview-section" id="camera-preview-section">
                    <h5><i class="fas fa-eye" aria-hidden="true"></i>Camera Preview</h5>
                    <div id="camera-preview-container"></div>
                </div>
                <div class="camera-status-section">
                    <h5><i class="fas fa-info-circle" aria-hidden="true"></i>Status</h5>
                    <div id="camera-status-indicator"></div>
                </div>
            </div>
        `;

        this.cameraPanel.style.display = 'none';
        this.container.appendChild(this.cameraPanel);
    }

    /**
     * Create device selector
     */
    createDeviceSelector() {
        this.deviceSelector = document.getElementById('camera-device-selector');
        if (!this.deviceSelector) {
            console.warn('Camera device selector container not found');
            return;
        }

        this.updateDeviceSelector();
    }

    /**
     * Update device selector
     */
    updateDeviceSelector() {
        if (!this.deviceSelector) return;

        this.deviceSelector.innerHTML = '';

        if (this.availableCameras.size === 0) {
            this.deviceSelector.innerHTML = `
                <div class="no-cameras-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>No cameras detected</span>
                    <button class="refresh-btn" onclick="this.enumerateCameras()">
                        <i class="fas fa-sync"></i> Refresh
                    </button>
                </div>
            `;
            return;
        }

        const cameraList = document.createElement('div');
        cameraList.className = 'camera-device-list';

        this.availableCameras.forEach((camera, deviceId) => {
            const deviceItem = document.createElement('div');
            deviceItem.className = `camera-device-item ${camera.isActive ? 'active' : ''} ${camera.status}`;
            deviceItem.dataset.deviceId = deviceId;

            deviceItem.innerHTML = `
                <div class="device-info">
                    <div class="device-icon">
                        <i class="fas fa-video" aria-hidden="true"></i>
                        ${camera.isActive ? '<i class="fas fa-check active-indicator"></i>' : ''}
                    </div>
                    <div class="device-details">
                        <div class="device-label" contenteditable="${this.options.enableDeviceLabeling}"
                             data-device-id="${deviceId}">${camera.label}</div>
                        <div class="device-meta">
                            <span class="device-quality">${camera.quality}</span>
                            <span class="device-status status-${camera.status}">${this.getStatusText(camera.status)}</span>
                        </div>
                    </div>
                </div>
                <div class="device-controls">
                    ${camera.status === 'available' ? `
                        <button class="device-btn switch-btn" data-device-id="${deviceId}" title="Switch to this camera">
                            <i class="fas fa-play" aria-hidden="true"></i>
                        </button>
                        <button class="device-btn preview-btn" data-device-id="${deviceId}" title="Preview camera">
                            <i class="fas fa-eye" aria-hidden="true"></i>
                        </button>
                    ` : `
                        <button class="device-btn disabled" disabled title="Camera not available">
                            <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
                        </button>
                    `}
                </div>
            `;

            cameraList.appendChild(deviceItem);
        });

        this.deviceSelector.appendChild(cameraList);
    }

    /**
     * Get status text
     */
    getStatusText(status) {
        const statusMap = {
            'available': 'Available',
            'in-use': 'In Use',
            'permission-denied': 'Permission Denied',
            'not-found': 'Not Found',
            'error': 'Error'
        };

        return statusMap[status] || 'Unknown';
    }

    /**
     * Create preview container
     */
    createPreviewContainer() {
        this.previewContainer = document.getElementById('camera-preview-container');
        if (!this.previewContainer) {
            console.warn('Camera preview container not found');
            return;
        }

        this.updatePreviewContainer();
    }

    /**
     * Update preview container
     */
    updatePreviewContainer() {
        if (!this.previewContainer) return;

        this.previewContainer.innerHTML = '';

        if (!this.currentCamera || !this.currentStream) {
            this.previewContainer.innerHTML = `
                <div class="no-preview-message">
                    <i class="fas fa-video-slash"></i>
                    <span>No camera active</span>
                </div>
            `;
            return;
        }

        const previewVideo = document.createElement('video');
        previewVideo.className = 'camera-preview-video';
        previewVideo.autoplay = true;
        previewVideo.muted = true;
        previewVideo.playsInline = true;
        previewVideo.srcObject = this.currentStream;

        const previewInfo = document.createElement('div');
        previewInfo.className = 'preview-info';

        const currentCamera = this.availableCameras.get(this.currentCamera);
        if (currentCamera) {
            previewInfo.innerHTML = `
                <div class="preview-label">${currentCamera.label}</div>
                <div class="preview-quality">${currentCamera.quality}</div>
            `;
        }

        this.previewContainer.appendChild(previewVideo);
        this.previewContainer.appendChild(previewInfo);
    }

    /**
     * Create status indicator
     */
    createStatusIndicator() {
        this.statusIndicator = document.getElementById('camera-status-indicator');
        if (!this.statusIndicator) {
            console.warn('Camera status indicator not found');
            return;
        }

        this.updateStatusIndicator();
    }

    /**
     * Update status indicator
     */
    updateStatusIndicator() {
        if (!this.statusIndicator) return;

        const stats = this.getPerformanceStats();

        this.statusIndicator.innerHTML = `
            <div class="status-grid">
                <div class="status-item">
                    <span class="status-label">Active Camera:</span>
                    <span class="status-value">${this.currentCamera ?
                        this.availableCameras.get(this.currentCamera)?.label || 'Unknown' : 'None'}</span>
                </div>
                <div class="status-item">
                    <span class="status-label">Available Cameras:</span>
                    <span class="status-value">${this.getAvailableCameras().length}</span>
                </div>
                <div class="status-item">
                    <span class="status-label">Current Quality:</span>
                    <span class="status-value">${this.currentQuality}</span>
                </div>
                <div class="status-item">
                    <span class="status-label">Switch Count:</span>
                    <span class="status-value">${stats.switchCount}</span>
                </div>
                <div class="status-item">
                    <span class="status-label">Avg Switch Time:</span>
                    <span class="status-value">${stats.averageSwitchTime.toFixed(1)}ms</span>
                </div>
                <div class="status-item">
                    <span class="status-label">Failure Count:</span>
                    <span class="status-value">${stats.failureCount}</span>
                </div>
            </div>
        `;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Panel controls
        document.getElementById('refresh-cameras-btn')?.addEventListener('click', () => this.enumerateCameras());
        document.getElementById('camera-settings-btn')?.addEventListener('click', () => this.toggleCameraPanel());
        document.getElementById('close-camera-panel-btn')?.addEventListener('click', () => this.hideCameraPanel());

        // Quality selector
        document.getElementById('camera-quality-select')?.addEventListener('change', this.boundEventHandlers.handleQualityChange);

        // Device selector events (delegated)
        this.deviceSelector?.addEventListener('click', this.boundEventHandlers.handleCameraSwitch);
        this.deviceSelector?.addEventListener('blur', this.handleLabelEdit.bind(this), true);

        // Keyboard shortcuts
        document.addEventListener('keydown', this.boundEventHandlers.handleKeyDown);
    }

    /**
     * Handle device change
     */
    async handleDeviceChange() {
        console.log('Camera devices changed, re-enumerating...');

        // Re-enumerate devices
        await this.enumerateCameras();

        // Check if current camera is still available
        if (this.currentCamera && !this.availableCameras.has(this.currentCamera)) {
            console.warn('Current camera disconnected');

            if (this.options.autoSwitchOnDisconnect) {
                const availableCameras = this.getAvailableCameras();
                if (availableCameras.length > 0) {
                    console.log('Auto-switching to available camera');
                    await this.switchToCamera(availableCameras[0].deviceId);
                } else {
                    console.warn('No cameras available for auto-switch');
                    this.currentCamera = null;
                    this.currentStream = null;
                    this.updatePreviewContainer();
                    this.updateStatusIndicator();
                }
            }
        }

        // Emit device change event
        this.emitCameraEvent('devices-changed', {
            deviceCount: this.availableCameras.size,
            currentCamera: this.currentCamera
        });
    }

    /**
     * Handle permission change
     */
    handlePermissionChange(event) {
        console.log('Camera permission changed:', event.target.state);
        this.permissionStatus.set('camera', event.target.state);

        // Re-enumerate devices if permission granted
        if (event.target.state === 'granted') {
            this.enumerateCameras();
        }

        // Emit permission change event
        this.emitCameraEvent('permission-changed', {
            permission: event.target.state
        });
    }

    /**
     * Handle camera switch clicks
     */
    async handleCameraSwitch(event) {
        const switchBtn = event.target.closest('.switch-btn');
        const previewBtn = event.target.closest('.preview-btn');

        if (switchBtn) {
            const deviceId = switchBtn.dataset.deviceId;
            if (deviceId) {
                try {
                    await this.switchToCamera(deviceId);
                } catch (error) {
                    console.error('Failed to switch camera:', error);
                    this.showError(`Failed to switch camera: ${error.message}`);
                }
            }
        } else if (previewBtn) {
            const deviceId = previewBtn.dataset.deviceId;
            if (deviceId) {
                this.showCameraPreview(deviceId);
            }
        }
    }

    /**
     * Handle quality change
     */
    async handleQualityChange(event) {
        const quality = event.target.value;

        try {
            await this.changeCameraQuality(quality);
        } catch (error) {
            console.error('Failed to change quality:', error);
            this.showError(`Failed to change quality: ${error.message}`);
        }
    }

    /**
     * Handle label editing
     */
    handleLabelEdit(event) {
        if (event.target.classList.contains('device-label') && event.target.contentEditable === 'true') {
            const deviceId = event.target.dataset.deviceId;
            const newLabel = event.target.textContent.trim();

            if (deviceId && newLabel) {
                this.setCameraLabel(deviceId, newLabel);
            }
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyDown(event) {
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 'c':
                    if (event.shiftKey) {
                        event.preventDefault();
                        this.toggleCameraPanel();
                    }
                    break;
                case 'n':
                    if (event.shiftKey) {
                        event.preventDefault();
                        this.switchToNextCamera();
                    }
                    break;
                case 'p':
                    if (event.shiftKey && event.altKey) {
                        event.preventDefault();
                        this.switchToPreviousCamera();
                    }
                    break;
            }
        }

        // Number keys for quick camera switching
        if (event.key >= '1' && event.key <= '8' && event.altKey && event.shiftKey) {
            event.preventDefault();
            const cameraIndex = parseInt(event.key) - 1;
            const availableCameras = this.getAvailableCameras();

            if (cameraIndex < availableCameras.length) {
                this.switchToCamera(availableCameras[cameraIndex].deviceId);
            }
        }
    }

    /**
     * Handle device error
     */
    handleDeviceError(error) {
        console.error('Camera device error:', error);

        // Update device status
        this.updateStatusIndicator();

        // Emit error event
        this.emitCameraEvent('device-error', {
            error: error.message,
            timestamp: Date.now()
        });
    }

    /**
     * Handle camera error
     */
    handleCameraError(deviceId, error) {
        console.error(`Camera error for device ${deviceId}:`, error);

        // Update camera status
        const camera = this.availableCameras.get(deviceId);
        if (camera) {
            if (error.name === 'NotAllowedError') {
                camera.status = 'permission-denied';
            } else if (error.name === 'NotFoundError') {
                camera.status = 'not-found';
            } else if (error.name === 'NotReadableError') {
                camera.status = 'in-use';
            } else {
                camera.status = 'error';
            }

            this.deviceStatus.set(deviceId, camera.status);
        }

        // Update UI
        this.updateDeviceSelector();
        this.updateStatusIndicator();

        // Emit camera error event
        this.emitCameraEvent('camera-error', {
            deviceId,
            error: error.message,
            errorType: error.name,
            timestamp: Date.now()
        });
    }

    /**
     * Show camera preview
     */
    showCameraPreview(deviceId) {
        // Implementation for showing camera preview in modal/popup
        console.log(`Showing preview for camera: ${deviceId}`);

        // This could open a modal with camera preview
        // For now, just emit an event
        this.emitCameraEvent('preview-requested', {
            deviceId
        });
    }

    /**
     * Show error message
     */
    showError(message) {
        // Create error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'camera-error-notification';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
            <button class="close-btn" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        this.container.appendChild(errorDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 5000);

        // Announce to accessibility system
        if (this.options.accessibilitySystem) {
            this.options.accessibilitySystem.announce(message, 'assertive');
        }
    }

    /**
     * Toggle camera panel visibility
     */
    toggleCameraPanel() {
        const isVisible = this.cameraPanel.style.display !== 'none';

        if (isVisible) {
            this.hideCameraPanel();
        } else {
            this.showCameraPanel();
        }
    }

    /**
     * Show camera panel
     */
    showCameraPanel() {
        this.cameraPanel.style.display = 'block';

        // Update device list
        this.updateDeviceSelector();
        this.updateStatusIndicator();

        // Announce to accessibility system
        if (this.options.accessibilitySystem) {
            this.options.accessibilitySystem.announce('Camera panel opened', 'polite');
        }
    }

    /**
     * Hide camera panel
     */
    hideCameraPanel() {
        this.cameraPanel.style.display = 'none';

        // Announce to accessibility system
        if (this.options.accessibilitySystem) {
            this.options.accessibilitySystem.announce('Camera panel closed', 'polite');
        }
    }

    /**
     * Update scanning status
     */
    updateScanningStatus(isScanning) {
        const refreshBtn = document.getElementById('refresh-cameras-btn');
        if (refreshBtn) {
            if (isScanning) {
                refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                refreshBtn.disabled = true;
            } else {
                refreshBtn.innerHTML = '<i class="fas fa-sync"></i>';
                refreshBtn.disabled = false;
            }
        }
    }

    /**
     * Save device memory
     */
    saveDeviceMemory(deviceId, data) {
        if (!this.options.enableDeviceMemory) return;

        this.deviceMemory.set(deviceId, data);

        // Save to localStorage
        try {
            const memoryData = Object.fromEntries(this.deviceMemory);
            localStorage.setItem('camera_device_memory', JSON.stringify(memoryData));
        } catch (error) {
            console.warn('Failed to save device memory:', error);
        }
    }

    /**
     * Load device memory
     */
    loadDeviceMemory() {
        if (!this.options.enableDeviceMemory) return;

        try {
            const memoryData = localStorage.getItem('camera_device_memory');
            if (memoryData) {
                const parsed = JSON.parse(memoryData);
                this.deviceMemory = new Map(Object.entries(parsed));
                console.log(`Loaded device memory for ${this.deviceMemory.size} devices`);
            }
        } catch (error) {
            console.warn('Failed to load device memory:', error);
        }
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        return { ...this.performanceStats };
    }

    /**
     * Get system status
     */
    getSystemStatus() {
        return {
            isInitialized: this.isInitialized,
            isScanning: this.isScanning,
            currentCamera: this.currentCamera,
            currentQuality: this.currentQuality,
            availableCameras: this.availableCameras.size,
            activeCameras: Array.from(this.availableCameras.values()).filter(c => c.isActive).length,
            permissionStatus: Object.fromEntries(this.permissionStatus),
            deviceStatus: Object.fromEntries(this.deviceStatus),
            performanceStats: this.getPerformanceStats()
        };
    }

    /**
     * Emit camera event
     */
    emitCameraEvent(eventType, data) {
        const event = new CustomEvent(eventType, {
            detail: {
                ...data,
                cameraSystem: this
            }
        });

        this.container.dispatchEvent(event);
    }

    /**
     * Handle initialization error
     */
    handleInitializationError(error) {
        console.error('Camera Switching System initialization error:', error);

        // Emit error event
        this.emitCameraEvent('initialization-error', {
            error: error.message,
            timestamp: Date.now()
        });

        // Announce to accessibility system
        if (this.options.accessibilitySystem) {
            this.options.accessibilitySystem.announce('Camera system failed to initialize', 'assertive');
        }
    }

    /**
     * Inject camera switching CSS
     */
    injectCameraSwitchingCSS() {
        if (document.getElementById('camera-switching-css')) return;

        const style = document.createElement('style');
        style.id = 'camera-switching-css';
        style.textContent = `
            /* Camera Switching System Styles */
            .camera-switching-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 400px;
                max-height: 80vh;
                background: var(--card-dark, #2a2a2a);
                border: 1px solid var(--border-color, #444);
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                z-index: 2000;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }

            .camera-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px;
                border-bottom: 1px solid var(--border-color, #444);
                background: var(--input-dark, #3a3a3a);
            }

            .camera-panel-header h4 {
                margin: 0;
                color: var(--primary-color, #ff0000);
                font-size: 1.1rem;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .camera-panel-controls {
                display: flex;
                gap: 8px;
            }

            .camera-btn {
                background: var(--input-dark, #3a3a3a);
                border: 1px solid var(--border-color, #444);
                color: var(--text-light, #fff);
                padding: 6px 8px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 0.8rem;
            }

            .camera-btn:hover:not(:disabled) {
                background: var(--primary-color, #ff0000);
                border-color: var(--primary-color, #ff0000);
            }

            .camera-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .camera-panel-content {
                flex: 1;
                overflow-y: auto;
                padding: 15px;
            }

            .camera-panel-content h5 {
                margin: 0 0 10px 0;
                color: var(--text-light, #fff);
                font-size: 0.9rem;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .camera-selector-section,
            .camera-quality-section,
            .camera-preview-section,
            .camera-status-section {
                margin-bottom: 20px;
                padding: 15px;
                background: var(--input-dark, #3a3a3a);
                border-radius: 8px;
                border: 1px solid var(--border-color, #444);
            }

            .camera-device-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .camera-device-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px;
                background: var(--card-dark, #2a2a2a);
                border: 1px solid var(--border-color, #444);
                border-radius: 6px;
                transition: all 0.2s ease;
            }

            .camera-device-item.active {
                border-color: var(--primary-color, #ff0000);
                background: rgba(255, 0, 0, 0.1);
            }

            .camera-device-item.error {
                border-color: var(--danger-color, #dc3545);
                background: rgba(220, 53, 69, 0.1);
            }

            .device-info {
                display: flex;
                align-items: center;
                gap: 12px;
                flex: 1;
            }

            .device-icon {
                position: relative;
                width: 40px;
                height: 40px;
                background: var(--primary-color, #ff0000);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 1.2rem;
            }

            .active-indicator {
                position: absolute;
                top: -2px;
                right: -2px;
                width: 16px;
                height: 16px;
                background: var(--success-color, #28a745);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.6rem;
                border: 2px solid var(--card-dark, #2a2a2a);
            }

            .device-details {
                flex: 1;
            }

            .device-label {
                color: var(--text-light, #fff);
                font-weight: 500;
                margin-bottom: 4px;
                cursor: text;
                padding: 2px 4px;
                border-radius: 3px;
                transition: background 0.2s ease;
            }

            .device-label:focus {
                background: var(--input-dark, #3a3a3a);
                outline: 1px solid var(--primary-color, #ff0000);
            }

            .device-meta {
                display: flex;
                gap: 8px;
                font-size: 0.8rem;
            }

            .device-quality {
                color: var(--primary-color, #ff0000);
                font-weight: 500;
                text-transform: uppercase;
            }

            .device-status {
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 0.7rem;
                font-weight: 500;
            }

            .status-available {
                background: var(--success-color, #28a745);
                color: white;
            }

            .status-in-use {
                background: var(--warning-color, #ffc107);
                color: black;
            }

            .status-permission-denied,
            .status-not-found,
            .status-error {
                background: var(--danger-color, #dc3545);
                color: white;
            }

            .device-controls {
                display: flex;
                gap: 6px;
            }

            .device-btn {
                width: 32px;
                height: 32px;
                background: var(--input-dark, #3a3a3a);
                border: 1px solid var(--border-color, #444);
                color: var(--text-light, #fff);
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.8rem;
            }

            .device-btn:hover:not(:disabled) {
                background: var(--primary-color, #ff0000);
                border-color: var(--primary-color, #ff0000);
            }

            .device-btn.disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .quality-select {
                width: 100%;
                background: var(--input-dark, #3a3a3a);
                border: 1px solid var(--border-color, #444);
                color: var(--text-light, #fff);
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 0.9rem;
            }

            .camera-preview-video {
                width: 100%;
                height: 150px;
                background: #000;
                border-radius: 6px;
                object-fit: cover;
            }

            .preview-info {
                margin-top: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 0.8rem;
            }

            .preview-label {
                color: var(--text-light, #fff);
                font-weight: 500;
            }

            .preview-quality {
                color: var(--primary-color, #ff0000);
                text-transform: uppercase;
                font-weight: 500;
            }

            .status-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                font-size: 0.8rem;
            }

            .status-item {
                display: flex;
                justify-content: space-between;
                padding: 6px 8px;
                background: var(--card-dark, #2a2a2a);
                border-radius: 4px;
            }

            .status-label {
                color: var(--text-muted, #aaa);
            }

            .status-value {
                color: var(--text-light, #fff);
                font-weight: 500;
            }

            .no-cameras-message,
            .no-preview-message {
                text-align: center;
                padding: 20px;
                color: var(--text-muted, #aaa);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
            }

            .no-cameras-message i,
            .no-preview-message i {
                font-size: 2rem;
                color: var(--text-muted, #aaa);
            }

            .refresh-btn {
                background: var(--primary-color, #ff0000);
                border: none;
                color: white;
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 0.8rem;
            }

            .refresh-btn:hover {
                background: #cc0000;
            }

            .camera-error-notification {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--danger-color, #dc3545);
                color: white;
                padding: 12px 16px;
                border-radius: 6px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: 10px;
                max-width: 400px;
            }

            .camera-error-notification .close-btn {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                padding: 4px;
                border-radius: 3px;
                transition: background 0.2s ease;
            }

            .camera-error-notification .close-btn:hover {
                background: rgba(255, 255, 255, 0.2);
            }

            /* Responsive Design */
            @media (max-width: 768px) {
                .camera-switching-panel {
                    left: 10px;
                    right: 10px;
                    width: auto;
                    max-height: 70vh;
                }

                .status-grid {
                    grid-template-columns: 1fr;
                }

                .device-info {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 8px;
                }

                .device-controls {
                    margin-top: 8px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Destroy camera switching system
     */
    destroy() {
        // Stop all streams
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
        }

        this.previewStreams.forEach(stream => {
            stream.getTracks().forEach(track => track.stop());
        });

        // Remove event listeners
        if (navigator.mediaDevices.removeEventListener) {
            navigator.mediaDevices.removeEventListener('devicechange', this.boundEventHandlers.handleDeviceChange);
        }

        document.removeEventListener('keydown', this.boundEventHandlers.handleKeyDown);

        // Remove UI elements
        if (this.cameraPanel) this.cameraPanel.remove();

        // Clear data
        this.availableCameras.clear();
        this.activeCameras.clear();
        this.previewStreams.clear();
        this.permissionStatus.clear();
        this.deviceStatus.clear();
        this.deviceLabels.clear();
        this.deviceMemory.clear();

        // Remove CSS
        const style = document.getElementById('camera-switching-css');
        if (style) style.remove();

        console.log('Camera Switching System destroyed');
    }
}
