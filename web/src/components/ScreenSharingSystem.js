/**
 * Screen Sharing System with Annotation Tools
 * Comprehensive screen sharing and collaborative annotation system for Interviews.tv
 */

class ScreenSharingSystem {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            enableAnnotations: true,
            enableCollaboration: true,
            enableRecording: true,
            enableQualityControls: true,
            maxAnnotations: 100,
            annotationTimeout: 300000, // 5 minutes
            defaultTool: 'pointer',
            allowedSources: ['screen', 'window', 'tab'],
            qualityPresets: {
                'low': { width: 1280, height: 720, frameRate: 15 },
                'medium': { width: 1920, height: 1080, frameRate: 24 },
                'high': { width: 1920, height: 1080, frameRate: 30 },
                'ultra': { width: 2560, height: 1440, frameRate: 30 }
            },
            ...options
        };
        
        // Core properties
        this.isSharing = false;
        this.isAnnotating = false;
        this.currentStream = null;
        this.currentSource = null;
        this.currentQuality = 'medium';
        this.currentTool = this.options.defaultTool;
        
        // Annotation system
        this.annotations = new Map();
        this.annotationHistory = [];
        this.collaborators = new Map();
        this.annotationCanvas = null;
        this.annotationContext = null;
        this.isDrawing = false;
        this.lastPoint = null;
        
        // UI elements
        this.screenSharingControls = null;
        this.annotationToolbar = null;
        this.sourceSelector = null;
        this.qualitySelector = null;
        
        // Event handlers
        this.boundEventHandlers = {
            handleMouseDown: this.handleMouseDown.bind(this),
            handleMouseMove: this.handleMouseMove.bind(this),
            handleMouseUp: this.handleMouseUp.bind(this),
            handleKeyDown: this.handleKeyDown.bind(this),
            handleResize: this.handleResize.bind(this)
        };
        
        // Integration systems
        this.accessibilitySystem = options.accessibilitySystem;
        this.themeSystem = options.themeSystem;
        this.responsiveSystem = options.responsiveSystem;
        this.videoQualitySystem = options.videoQualitySystem;
        
        // Performance tracking
        this.performanceStats = {
            annotationsCreated: 0,
            annotationsDeleted: 0,
            collaborativeActions: 0,
            sharingDuration: 0,
            qualityChanges: 0
        };
        
        this.init();
    }
    
    /**
     * Initialize screen sharing system
     */
    init() {
        console.log('🖥️ Initializing Screen Sharing System...');
        
        // Check browser support
        if (!this.checkBrowserSupport()) {
            console.error('Screen sharing not supported in this browser');
            return;
        }
        
        // Create UI components
        this.createScreenSharingControls();
        this.createAnnotationToolbar();
        this.createSourceSelector();
        this.createQualitySelector();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Inject CSS
        this.injectScreenSharingCSS();
        
        // Initialize annotation canvas
        this.initializeAnnotationCanvas();
        
        console.log('✅ Screen Sharing System initialized successfully');
    }
    
    /**
     * Check browser support
     */
    checkBrowserSupport() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
    }
    
    /**
     * Create screen sharing controls
     */
    createScreenSharingControls() {
        this.screenSharingControls = document.createElement('div');
        this.screenSharingControls.className = 'screen-sharing-controls';
        this.screenSharingControls.innerHTML = `
            <div class="screen-sharing-main-controls">
                <div class="sharing-status-group">
                    <div class="sharing-status" id="sharing-status">
                        <i class="fas fa-desktop" aria-hidden="true"></i>
                        <span class="status-text">Ready to Share</span>
                        <div class="status-indicator offline"></div>
                    </div>
                    
                    <div class="sharing-info" id="sharing-info" style="display: none;">
                        <div class="info-item">
                            <span class="info-label">Source:</span>
                            <span class="info-value" id="current-source">None</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Quality:</span>
                            <span class="info-value" id="current-quality">Medium</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Duration:</span>
                            <span class="info-value" id="sharing-duration">00:00</span>
                        </div>
                    </div>
                </div>
                
                <div class="sharing-controls-group">
                    <button class="control-btn primary" id="start-sharing-btn" title="Start Screen Sharing">
                        <i class="fas fa-play" aria-hidden="true"></i>
                        <span>Start Sharing</span>
                    </button>
                    
                    <button class="control-btn danger" id="stop-sharing-btn" style="display: none;" title="Stop Screen Sharing">
                        <i class="fas fa-stop" aria-hidden="true"></i>
                        <span>Stop Sharing</span>
                    </button>
                    
                    <button class="control-btn" id="source-selector-btn" title="Select Source">
                        <i class="fas fa-window-maximize" aria-hidden="true"></i>
                        <span>Source</span>
                    </button>
                    
                    <button class="control-btn" id="quality-selector-btn" title="Quality Settings">
                        <i class="fas fa-cog" aria-hidden="true"></i>
                        <span>Quality</span>
                    </button>
                    
                    <button class="control-btn" id="annotation-toggle-btn" title="Toggle Annotations">
                        <i class="fas fa-pencil-alt" aria-hidden="true"></i>
                        <span>Annotate</span>
                    </button>
                </div>
                
                <div class="sharing-indicators">
                    <div class="indicator" id="recording-indicator" style="display: none;">
                        <i class="fas fa-circle" aria-hidden="true"></i>
                        <span>Recording</span>
                    </div>
                    
                    <div class="indicator" id="annotation-indicator" style="display: none;">
                        <i class="fas fa-pencil-alt" aria-hidden="true"></i>
                        <span>Annotations Active</span>
                    </div>
                    
                    <div class="indicator" id="collaboration-indicator" style="display: none;">
                        <i class="fas fa-users" aria-hidden="true"></i>
                        <span id="collaborator-count">0</span>
                    </div>
                </div>
            </div>
        `;
        
        this.container.appendChild(this.screenSharingControls);
    }
    
    /**
     * Create annotation toolbar
     */
    createAnnotationToolbar() {
        this.annotationToolbar = document.createElement('div');
        this.annotationToolbar.className = 'annotation-toolbar';
        this.annotationToolbar.style.display = 'none';
        this.annotationToolbar.innerHTML = `
            <div class="toolbar-header">
                <h4><i class="fas fa-pencil-alt" aria-hidden="true"></i>Annotation Tools</h4>
                <button class="close-btn" id="close-annotation-toolbar" title="Close Toolbar">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>
            
            <div class="toolbar-content">
                <div class="tool-group">
                    <h5>Drawing Tools</h5>
                    <div class="tool-buttons">
                        <button class="tool-btn active" data-tool="pointer" title="Pointer Tool">
                            <i class="fas fa-mouse-pointer" aria-hidden="true"></i>
                            <span>Pointer</span>
                        </button>
                        <button class="tool-btn" data-tool="pen" title="Pen Tool">
                            <i class="fas fa-pen" aria-hidden="true"></i>
                            <span>Pen</span>
                        </button>
                        <button class="tool-btn" data-tool="highlighter" title="Highlighter">
                            <i class="fas fa-highlighter" aria-hidden="true"></i>
                            <span>Highlight</span>
                        </button>
                        <button class="tool-btn" data-tool="eraser" title="Eraser">
                            <i class="fas fa-eraser" aria-hidden="true"></i>
                            <span>Eraser</span>
                        </button>
                    </div>
                </div>
                
                <div class="tool-group">
                    <h5>Shapes</h5>
                    <div class="tool-buttons">
                        <button class="tool-btn" data-tool="rectangle" title="Rectangle">
                            <i class="fas fa-square" aria-hidden="true"></i>
                            <span>Rectangle</span>
                        </button>
                        <button class="tool-btn" data-tool="circle" title="Circle">
                            <i class="fas fa-circle" aria-hidden="true"></i>
                            <span>Circle</span>
                        </button>
                        <button class="tool-btn" data-tool="arrow" title="Arrow">
                            <i class="fas fa-arrow-right" aria-hidden="true"></i>
                            <span>Arrow</span>
                        </button>
                        <button class="tool-btn" data-tool="line" title="Line">
                            <i class="fas fa-minus" aria-hidden="true"></i>
                            <span>Line</span>
                        </button>
                    </div>
                </div>
                
                <div class="tool-group">
                    <h5>Text & Callouts</h5>
                    <div class="tool-buttons">
                        <button class="tool-btn" data-tool="text" title="Text Tool">
                            <i class="fas fa-font" aria-hidden="true"></i>
                            <span>Text</span>
                        </button>
                        <button class="tool-btn" data-tool="callout" title="Callout">
                            <i class="fas fa-comment" aria-hidden="true"></i>
                            <span>Callout</span>
                        </button>
                        <button class="tool-btn" data-tool="spotlight" title="Spotlight">
                            <i class="fas fa-search" aria-hidden="true"></i>
                            <span>Spotlight</span>
                        </button>
                    </div>
                </div>
                
                <div class="tool-settings">
                    <div class="setting-group">
                        <label for="stroke-color">Color:</label>
                        <div class="color-picker">
                            <input type="color" id="stroke-color" value="#ff0000">
                            <div class="color-presets">
                                <div class="color-preset" data-color="#ff0000" style="background: #ff0000;"></div>
                                <div class="color-preset" data-color="#00ff00" style="background: #00ff00;"></div>
                                <div class="color-preset" data-color="#0000ff" style="background: #0000ff;"></div>
                                <div class="color-preset" data-color="#ffff00" style="background: #ffff00;"></div>
                                <div class="color-preset" data-color="#ff00ff" style="background: #ff00ff;"></div>
                                <div class="color-preset" data-color="#00ffff" style="background: #00ffff;"></div>
                                <div class="color-preset" data-color="#ffffff" style="background: #ffffff;"></div>
                                <div class="color-preset" data-color="#000000" style="background: #000000;"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="setting-group">
                        <label for="stroke-width">Width:</label>
                        <input type="range" id="stroke-width" min="1" max="20" value="3">
                        <span class="width-value">3px</span>
                    </div>
                    
                    <div class="setting-group">
                        <label for="opacity">Opacity:</label>
                        <input type="range" id="opacity" min="0.1" max="1" step="0.1" value="1">
                        <span class="opacity-value">100%</span>
                    </div>
                </div>
                
                <div class="toolbar-actions">
                    <button class="action-btn" id="undo-annotation" title="Undo Last Annotation">
                        <i class="fas fa-undo" aria-hidden="true"></i>
                        <span>Undo</span>
                    </button>
                    <button class="action-btn" id="redo-annotation" title="Redo Annotation">
                        <i class="fas fa-redo" aria-hidden="true"></i>
                        <span>Redo</span>
                    </button>
                    <button class="action-btn danger" id="clear-annotations" title="Clear All Annotations">
                        <i class="fas fa-trash" aria-hidden="true"></i>
                        <span>Clear All</span>
                    </button>
                    <button class="action-btn" id="save-annotations" title="Save Annotations">
                        <i class="fas fa-save" aria-hidden="true"></i>
                        <span>Save</span>
                    </button>
                </div>
            </div>
        `;
        
        this.container.appendChild(this.annotationToolbar);
    }
    
    /**
     * Create source selector
     */
    createSourceSelector() {
        this.sourceSelector = document.createElement('div');
        this.sourceSelector.className = 'source-selector';
        this.sourceSelector.style.display = 'none';
        this.sourceSelector.innerHTML = `
            <div class="selector-header">
                <h4><i class="fas fa-window-maximize" aria-hidden="true"></i>Select Source</h4>
                <button class="close-btn" id="close-source-selector" title="Close Selector">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>
            
            <div class="selector-content">
                <div class="source-options">
                    <div class="source-option" data-source="screen">
                        <div class="source-icon">
                            <i class="fas fa-desktop" aria-hidden="true"></i>
                        </div>
                        <div class="source-info">
                            <h5>Entire Screen</h5>
                            <p>Share your entire desktop screen</p>
                        </div>
                        <div class="source-quality">Best for presentations</div>
                    </div>
                    
                    <div class="source-option" data-source="window">
                        <div class="source-icon">
                            <i class="fas fa-window-maximize" aria-hidden="true"></i>
                        </div>
                        <div class="source-info">
                            <h5>Application Window</h5>
                            <p>Share a specific application window</p>
                        </div>
                        <div class="source-quality">Best for focused content</div>
                    </div>
                    
                    <div class="source-option" data-source="tab">
                        <div class="source-icon">
                            <i class="fas fa-globe" aria-hidden="true"></i>
                        </div>
                        <div class="source-info">
                            <h5>Browser Tab</h5>
                            <p>Share a specific browser tab</p>
                        </div>
                        <div class="source-quality">Best for web content</div>
                    </div>
                </div>
                
                <div class="selector-actions">
                    <button class="action-btn primary" id="confirm-source-selection">
                        <i class="fas fa-check" aria-hidden="true"></i>
                        <span>Start Sharing</span>
                    </button>
                    <button class="action-btn" id="cancel-source-selection">
                        <i class="fas fa-times" aria-hidden="true"></i>
                        <span>Cancel</span>
                    </button>
                </div>
            </div>
        `;
        
        this.container.appendChild(this.sourceSelector);
    }

    /**
     * Create quality selector
     */
    createQualitySelector() {
        this.qualitySelector = document.createElement('div');
        this.qualitySelector.className = 'quality-selector';
        this.qualitySelector.style.display = 'none';
        this.qualitySelector.innerHTML = `
            <div class="selector-header">
                <h4><i class="fas fa-cog" aria-hidden="true"></i>Quality Settings</h4>
                <button class="close-btn" id="close-quality-selector" title="Close Selector">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>

            <div class="selector-content">
                <div class="quality-options">
                    <div class="quality-option" data-quality="low">
                        <div class="quality-info">
                            <h5>Low Quality</h5>
                            <div class="quality-specs">1280×720 • 15 FPS</div>
                            <div class="quality-description">Best for slow connections</div>
                        </div>
                        <div class="quality-bars">
                            <div class="quality-bar active"></div>
                            <div class="quality-bar"></div>
                            <div class="quality-bar"></div>
                            <div class="quality-bar"></div>
                        </div>
                    </div>

                    <div class="quality-option active" data-quality="medium">
                        <div class="quality-info">
                            <h5>Medium Quality</h5>
                            <div class="quality-specs">1920×1080 • 24 FPS</div>
                            <div class="quality-description">Balanced quality and performance</div>
                        </div>
                        <div class="quality-bars">
                            <div class="quality-bar active"></div>
                            <div class="quality-bar active"></div>
                            <div class="quality-bar"></div>
                            <div class="quality-bar"></div>
                        </div>
                    </div>

                    <div class="quality-option" data-quality="high">
                        <div class="quality-info">
                            <h5>High Quality</h5>
                            <div class="quality-specs">1920×1080 • 30 FPS</div>
                            <div class="quality-description">Best for detailed content</div>
                        </div>
                        <div class="quality-bars">
                            <div class="quality-bar active"></div>
                            <div class="quality-bar active"></div>
                            <div class="quality-bar active"></div>
                            <div class="quality-bar"></div>
                        </div>
                    </div>

                    <div class="quality-option" data-quality="ultra">
                        <div class="quality-info">
                            <h5>Ultra Quality</h5>
                            <div class="quality-specs">2560×1440 • 30 FPS</div>
                            <div class="quality-description">Maximum quality (requires fast connection)</div>
                        </div>
                        <div class="quality-bars">
                            <div class="quality-bar active"></div>
                            <div class="quality-bar active"></div>
                            <div class="quality-bar active"></div>
                            <div class="quality-bar active"></div>
                        </div>
                    </div>
                </div>

                <div class="quality-settings">
                    <div class="setting-group">
                        <label for="include-audio">
                            <input type="checkbox" id="include-audio" checked>
                            Include System Audio
                        </label>
                    </div>

                    <div class="setting-group">
                        <label for="optimize-text">
                            <input type="checkbox" id="optimize-text" checked>
                            Optimize for Text
                        </label>
                    </div>

                    <div class="setting-group">
                        <label for="auto-quality">
                            <input type="checkbox" id="auto-quality">
                            Auto-adjust Quality
                        </label>
                    </div>
                </div>

                <div class="selector-actions">
                    <button class="action-btn primary" id="apply-quality-settings">
                        <i class="fas fa-check" aria-hidden="true"></i>
                        <span>Apply Settings</span>
                    </button>
                    <button class="action-btn" id="cancel-quality-settings">
                        <i class="fas fa-times" aria-hidden="true"></i>
                        <span>Cancel</span>
                    </button>
                </div>
            </div>
        `;

        this.container.appendChild(this.qualitySelector);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Screen sharing controls
        document.getElementById('start-sharing-btn')?.addEventListener('click', () => this.startScreenSharing());
        document.getElementById('stop-sharing-btn')?.addEventListener('click', () => this.stopScreenSharing());
        document.getElementById('source-selector-btn')?.addEventListener('click', () => this.toggleSourceSelector());
        document.getElementById('quality-selector-btn')?.addEventListener('click', () => this.toggleQualitySelector());
        document.getElementById('annotation-toggle-btn')?.addEventListener('click', () => this.toggleAnnotations());

        // Source selector
        document.getElementById('close-source-selector')?.addEventListener('click', () => this.hideSourceSelector());
        document.getElementById('confirm-source-selection')?.addEventListener('click', () => this.confirmSourceSelection());
        document.getElementById('cancel-source-selection')?.addEventListener('click', () => this.hideSourceSelector());

        // Quality selector
        document.getElementById('close-quality-selector')?.addEventListener('click', () => this.hideQualitySelector());
        document.getElementById('apply-quality-settings')?.addEventListener('click', () => this.applyQualitySettings());
        document.getElementById('cancel-quality-settings')?.addEventListener('click', () => this.hideQualitySelector());

        // Annotation toolbar
        document.getElementById('close-annotation-toolbar')?.addEventListener('click', () => this.hideAnnotationToolbar());
        document.getElementById('undo-annotation')?.addEventListener('click', () => this.undoAnnotation());
        document.getElementById('redo-annotation')?.addEventListener('click', () => this.redoAnnotation());
        document.getElementById('clear-annotations')?.addEventListener('click', () => this.clearAllAnnotations());
        document.getElementById('save-annotations')?.addEventListener('click', () => this.saveAnnotations());

        // Tool selection
        this.annotationToolbar.addEventListener('click', (e) => {
            if (e.target.closest('.tool-btn')) {
                const tool = e.target.closest('.tool-btn').dataset.tool;
                if (tool) this.selectTool(tool);
            }
        });

        // Source selection
        this.sourceSelector.addEventListener('click', (e) => {
            if (e.target.closest('.source-option')) {
                this.selectSource(e.target.closest('.source-option').dataset.source);
            }
        });

        // Quality selection
        this.qualitySelector.addEventListener('click', (e) => {
            if (e.target.closest('.quality-option')) {
                this.selectQuality(e.target.closest('.quality-option').dataset.quality);
            }
        });

        // Color presets
        this.annotationToolbar.addEventListener('click', (e) => {
            if (e.target.closest('.color-preset')) {
                const color = e.target.closest('.color-preset').dataset.color;
                document.getElementById('stroke-color').value = color;
            }
        });

        // Setting sliders
        document.getElementById('stroke-width')?.addEventListener('input', (e) => {
            document.querySelector('.width-value').textContent = `${e.target.value}px`;
        });

        document.getElementById('opacity')?.addEventListener('input', (e) => {
            const percentage = Math.round(e.target.value * 100);
            document.querySelector('.opacity-value').textContent = `${percentage}%`;
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', this.boundEventHandlers.handleKeyDown);

        // Window resize
        window.addEventListener('resize', this.boundEventHandlers.handleResize);
    }

    /**
     * Initialize annotation canvas
     */
    initializeAnnotationCanvas() {
        this.annotationCanvas = document.createElement('canvas');
        this.annotationCanvas.className = 'annotation-canvas';
        this.annotationCanvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1000;
            display: none;
        `;

        this.container.appendChild(this.annotationCanvas);
        this.annotationContext = this.annotationCanvas.getContext('2d');

        // Setup canvas event listeners
        this.annotationCanvas.addEventListener('mousedown', this.boundEventHandlers.handleMouseDown);
        this.annotationCanvas.addEventListener('mousemove', this.boundEventHandlers.handleMouseMove);
        this.annotationCanvas.addEventListener('mouseup', this.boundEventHandlers.handleMouseUp);
    }

    /**
     * Start screen sharing
     */
    async startScreenSharing(sourceType = null) {
        try {
            if (this.isSharing) {
                console.warn('Screen sharing already active');
                return;
            }

            // Show source selector if no source specified
            if (!sourceType) {
                this.showSourceSelector();
                return;
            }

            // Get quality settings
            const qualitySettings = this.options.qualityPresets[this.currentQuality];
            const includeAudio = document.getElementById('include-audio')?.checked ?? true;

            // Configure constraints based on source type
            const constraints = {
                video: {
                    ...qualitySettings,
                    cursor: 'always',
                    displaySurface: sourceType
                },
                audio: includeAudio
            };

            // Request screen sharing
            this.currentStream = await navigator.mediaDevices.getDisplayMedia(constraints);
            this.currentSource = sourceType;
            this.isSharing = true;

            // Update UI
            this.updateSharingUI();

            // Setup stream event handlers
            this.setupStreamEventHandlers();

            // Start duration tracking
            this.startDurationTracking();

            // Emit sharing started event
            this.emitSharingEvent('screen-sharing-started', {
                source: sourceType,
                quality: this.currentQuality,
                includeAudio,
                timestamp: Date.now()
            });

            // Announce to accessibility system
            if (this.accessibilitySystem) {
                this.accessibilitySystem.announce('Screen sharing started', 'polite');
            }

            console.log('✅ Screen sharing started successfully');

        } catch (error) {
            console.error('Failed to start screen sharing:', error);
            this.handleSharingError(error);
        }
    }

    /**
     * Stop screen sharing
     */
    async stopScreenSharing() {
        try {
            if (!this.isSharing) {
                console.warn('No active screen sharing to stop');
                return;
            }

            // Stop all tracks
            if (this.currentStream) {
                this.currentStream.getTracks().forEach(track => track.stop());
                this.currentStream = null;
            }

            // Update state
            this.isSharing = false;
            this.currentSource = null;

            // Stop duration tracking
            this.stopDurationTracking();

            // Hide annotations if active
            if (this.isAnnotating) {
                this.toggleAnnotations();
            }

            // Update UI
            this.updateSharingUI();

            // Emit sharing stopped event
            this.emitSharingEvent('screen-sharing-stopped', {
                duration: this.performanceStats.sharingDuration,
                timestamp: Date.now()
            });

            // Announce to accessibility system
            if (this.accessibilitySystem) {
                this.accessibilitySystem.announce('Screen sharing stopped', 'polite');
            }

            console.log('✅ Screen sharing stopped successfully');

        } catch (error) {
            console.error('Failed to stop screen sharing:', error);
        }
    }

    /**
     * Toggle annotations
     */
    toggleAnnotations() {
        this.isAnnotating = !this.isAnnotating;

        if (this.isAnnotating) {
            this.showAnnotationToolbar();
            this.enableAnnotationCanvas();
        } else {
            this.hideAnnotationToolbar();
            this.disableAnnotationCanvas();
        }

        this.updateAnnotationUI();

        // Announce to accessibility system
        if (this.accessibilitySystem) {
            const status = this.isAnnotating ? 'enabled' : 'disabled';
            this.accessibilitySystem.announce(`Annotations ${status}`, 'polite');
        }
    }

    /**
     * Enable annotation canvas
     */
    enableAnnotationCanvas() {
        if (!this.annotationCanvas) return;

        this.annotationCanvas.style.display = 'block';
        this.annotationCanvas.style.pointerEvents = 'auto';

        // Resize canvas to match container
        this.resizeAnnotationCanvas();
    }

    /**
     * Disable annotation canvas
     */
    disableAnnotationCanvas() {
        if (!this.annotationCanvas) return;

        this.annotationCanvas.style.display = 'none';
        this.annotationCanvas.style.pointerEvents = 'none';
    }

    /**
     * Resize annotation canvas
     */
    resizeAnnotationCanvas() {
        if (!this.annotationCanvas) return;

        const rect = this.container.getBoundingClientRect();
        this.annotationCanvas.width = rect.width;
        this.annotationCanvas.height = rect.height;

        // Redraw existing annotations
        this.redrawAnnotations();
    }

    /**
     * Handle mouse down for annotations
     */
    handleMouseDown(e) {
        if (!this.isAnnotating || this.currentTool === 'pointer') return;

        this.isDrawing = true;
        const rect = this.annotationCanvas.getBoundingClientRect();
        this.lastPoint = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        // Start new annotation
        this.startNewAnnotation(this.lastPoint);
    }

    /**
     * Handle mouse move for annotations
     */
    handleMouseMove(e) {
        if (!this.isAnnotating || !this.isDrawing || this.currentTool === 'pointer') return;

        const rect = this.annotationCanvas.getBoundingClientRect();
        const currentPoint = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        // Continue annotation
        this.continueAnnotation(currentPoint);
        this.lastPoint = currentPoint;
    }

    /**
     * Handle mouse up for annotations
     */
    handleMouseUp(e) {
        if (!this.isAnnotating || this.currentTool === 'pointer') return;

        this.isDrawing = false;

        // Finish annotation
        this.finishAnnotation();
        this.lastPoint = null;
    }

    /**
     * Start new annotation
     */
    startNewAnnotation(point) {
        const annotationId = this.generateAnnotationId();
        const strokeColor = document.getElementById('stroke-color')?.value || '#ff0000';
        const strokeWidth = parseInt(document.getElementById('stroke-width')?.value || '3');
        const opacity = parseFloat(document.getElementById('opacity')?.value || '1');

        const annotation = {
            id: annotationId,
            type: this.currentTool,
            points: [point],
            strokeColor,
            strokeWidth,
            opacity,
            timestamp: Date.now(),
            author: 'local-user' // TODO: Get actual user ID
        };

        this.annotations.set(annotationId, annotation);
        this.currentAnnotationId = annotationId;

        // Start drawing
        this.drawAnnotationPoint(annotation, point);
    }

    /**
     * Continue annotation
     */
    continueAnnotation(point) {
        if (!this.currentAnnotationId) return;

        const annotation = this.annotations.get(this.currentAnnotationId);
        if (!annotation) return;

        annotation.points.push(point);

        // Draw line from last point to current point
        this.drawAnnotationLine(annotation, this.lastPoint, point);
    }

    /**
     * Finish annotation
     */
    finishAnnotation() {
        if (!this.currentAnnotationId) return;

        const annotation = this.annotations.get(this.currentAnnotationId);
        if (!annotation) return;

        // Add to history for undo/redo
        this.annotationHistory.push({
            action: 'add',
            annotation: { ...annotation }
        });

        // Update performance stats
        this.performanceStats.annotationsCreated++;

        // Emit annotation event
        this.emitAnnotationEvent('annotation-created', annotation);

        this.currentAnnotationId = null;
    }

    /**
     * Draw annotation point
     */
    drawAnnotationPoint(annotation, point) {
        if (!this.annotationContext) return;

        this.annotationContext.save();
        this.annotationContext.globalAlpha = annotation.opacity;
        this.annotationContext.strokeStyle = annotation.strokeColor;
        this.annotationContext.lineWidth = annotation.strokeWidth;
        this.annotationContext.lineCap = 'round';
        this.annotationContext.lineJoin = 'round';

        this.annotationContext.beginPath();
        this.annotationContext.arc(point.x, point.y, annotation.strokeWidth / 2, 0, 2 * Math.PI);
        this.annotationContext.fill();

        this.annotationContext.restore();
    }

    /**
     * Draw annotation line
     */
    drawAnnotationLine(annotation, fromPoint, toPoint) {
        if (!this.annotationContext) return;

        this.annotationContext.save();
        this.annotationContext.globalAlpha = annotation.opacity;
        this.annotationContext.strokeStyle = annotation.strokeColor;
        this.annotationContext.lineWidth = annotation.strokeWidth;
        this.annotationContext.lineCap = 'round';
        this.annotationContext.lineJoin = 'round';

        this.annotationContext.beginPath();
        this.annotationContext.moveTo(fromPoint.x, fromPoint.y);
        this.annotationContext.lineTo(toPoint.x, toPoint.y);
        this.annotationContext.stroke();

        this.annotationContext.restore();
    }

    /**
     * Redraw all annotations
     */
    redrawAnnotations() {
        if (!this.annotationContext) return;

        // Clear canvas
        this.annotationContext.clearRect(0, 0, this.annotationCanvas.width, this.annotationCanvas.height);

        // Redraw all annotations
        this.annotations.forEach(annotation => {
            this.drawFullAnnotation(annotation);
        });
    }

    /**
     * Draw full annotation
     */
    drawFullAnnotation(annotation) {
        if (!annotation.points || annotation.points.length === 0) return;

        this.annotationContext.save();
        this.annotationContext.globalAlpha = annotation.opacity;
        this.annotationContext.strokeStyle = annotation.strokeColor;
        this.annotationContext.lineWidth = annotation.strokeWidth;
        this.annotationContext.lineCap = 'round';
        this.annotationContext.lineJoin = 'round';

        if (annotation.points.length === 1) {
            // Single point
            const point = annotation.points[0];
            this.annotationContext.beginPath();
            this.annotationContext.arc(point.x, point.y, annotation.strokeWidth / 2, 0, 2 * Math.PI);
            this.annotationContext.fill();
        } else {
            // Multiple points - draw path
            this.annotationContext.beginPath();
            this.annotationContext.moveTo(annotation.points[0].x, annotation.points[0].y);

            for (let i = 1; i < annotation.points.length; i++) {
                this.annotationContext.lineTo(annotation.points[i].x, annotation.points[i].y);
            }

            this.annotationContext.stroke();
        }

        this.annotationContext.restore();
    }

    /**
     * Select annotation tool
     */
    selectTool(tool) {
        this.currentTool = tool;

        // Update UI
        this.annotationToolbar.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const selectedBtn = this.annotationToolbar.querySelector(`[data-tool="${tool}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('active');
        }

        // Update cursor
        this.updateAnnotationCursor();

        // Announce to accessibility system
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce(`${tool} tool selected`, 'polite');
        }
    }

    /**
     * Update annotation cursor
     */
    updateAnnotationCursor() {
        if (!this.annotationCanvas) return;

        const cursors = {
            pointer: 'default',
            pen: 'crosshair',
            highlighter: 'crosshair',
            eraser: 'crosshair',
            rectangle: 'crosshair',
            circle: 'crosshair',
            arrow: 'crosshair',
            line: 'crosshair',
            text: 'text',
            callout: 'crosshair',
            spotlight: 'crosshair'
        };

        this.annotationCanvas.style.cursor = cursors[this.currentTool] || 'default';
    }

    /**
     * Undo last annotation
     */
    undoAnnotation() {
        if (this.annotationHistory.length === 0) return;

        const lastAction = this.annotationHistory.pop();

        if (lastAction.action === 'add') {
            // Remove annotation
            this.annotations.delete(lastAction.annotation.id);
            this.redrawAnnotations();

            // Update stats
            this.performanceStats.annotationsDeleted++;

            // Emit event
            this.emitAnnotationEvent('annotation-deleted', lastAction.annotation);
        }

        // Announce to accessibility system
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce('Annotation undone', 'polite');
        }
    }

    /**
     * Redo annotation (placeholder for future implementation)
     */
    redoAnnotation() {
        // TODO: Implement redo functionality with redo stack
        console.log('Redo functionality not yet implemented');
    }

    /**
     * Clear all annotations
     */
    clearAllAnnotations() {
        if (this.annotations.size === 0) return;

        // Confirm with user
        if (!confirm('Are you sure you want to clear all annotations?')) {
            return;
        }

        // Clear annotations
        this.annotations.clear();
        this.annotationHistory = [];
        this.redrawAnnotations();

        // Update stats
        this.performanceStats.annotationsDeleted += this.annotations.size;

        // Emit event
        this.emitAnnotationEvent('annotations-cleared', {
            timestamp: Date.now()
        });

        // Announce to accessibility system
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce('All annotations cleared', 'polite');
        }
    }

    /**
     * Save annotations
     */
    saveAnnotations() {
        const annotationsData = {
            annotations: Array.from(this.annotations.values()),
            metadata: {
                timestamp: Date.now(),
                source: this.currentSource,
                quality: this.currentQuality,
                totalAnnotations: this.annotations.size
            }
        };

        // Create download link
        const blob = new Blob([JSON.stringify(annotationsData, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `screen-annotations-${Date.now()}.json`;
        link.click();

        URL.revokeObjectURL(url);

        // Announce to accessibility system
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce('Annotations saved', 'polite');
        }
    }

    /**
     * Update sharing UI
     */
    updateSharingUI() {
        const statusElement = document.getElementById('sharing-status');
        const statusText = statusElement?.querySelector('.status-text');
        const statusIndicator = statusElement?.querySelector('.status-indicator');
        const sharingInfo = document.getElementById('sharing-info');
        const startBtn = document.getElementById('start-sharing-btn');
        const stopBtn = document.getElementById('stop-sharing-btn');

        if (this.isSharing) {
            statusText.textContent = 'Sharing Active';
            statusIndicator.className = 'status-indicator live';
            sharingInfo.style.display = 'block';
            startBtn.style.display = 'none';
            stopBtn.style.display = 'flex';

            // Update sharing info
            document.getElementById('current-source').textContent =
                this.currentSource?.charAt(0).toUpperCase() + this.currentSource?.slice(1) || 'Unknown';
            document.getElementById('current-quality').textContent =
                this.currentQuality?.charAt(0).toUpperCase() + this.currentQuality?.slice(1) || 'Medium';
        } else {
            statusText.textContent = 'Ready to Share';
            statusIndicator.className = 'status-indicator offline';
            sharingInfo.style.display = 'none';
            startBtn.style.display = 'flex';
            stopBtn.style.display = 'none';
        }
    }

    /**
     * Update annotation UI
     */
    updateAnnotationUI() {
        const annotationBtn = document.getElementById('annotation-toggle-btn');
        const annotationIndicator = document.getElementById('annotation-indicator');

        if (this.isAnnotating) {
            annotationBtn?.classList.add('active');
            annotationIndicator.style.display = 'flex';
        } else {
            annotationBtn?.classList.remove('active');
            annotationIndicator.style.display = 'none';
        }
    }

    /**
     * Show/hide UI elements
     */
    showSourceSelector() {
        this.sourceSelector.style.display = 'block';
        this.hideQualitySelector();
    }

    hideSourceSelector() {
        this.sourceSelector.style.display = 'none';
    }

    toggleSourceSelector() {
        if (this.sourceSelector.style.display === 'none') {
            this.showSourceSelector();
        } else {
            this.hideSourceSelector();
        }
    }

    showQualitySelector() {
        this.qualitySelector.style.display = 'block';
        this.hideSourceSelector();
    }

    hideQualitySelector() {
        this.qualitySelector.style.display = 'none';
    }

    toggleQualitySelector() {
        if (this.qualitySelector.style.display === 'none') {
            this.showQualitySelector();
        } else {
            this.hideQualitySelector();
        }
    }

    showAnnotationToolbar() {
        this.annotationToolbar.style.display = 'block';
    }

    hideAnnotationToolbar() {
        this.annotationToolbar.style.display = 'none';
    }

    /**
     * Select source
     */
    selectSource(source) {
        // Update UI
        this.sourceSelector.querySelectorAll('.source-option').forEach(option => {
            option.classList.remove('active');
        });

        const selectedOption = this.sourceSelector.querySelector(`[data-source="${source}"]`);
        if (selectedOption) {
            selectedOption.classList.add('active');
        }

        this.selectedSource = source;
    }

    /**
     * Confirm source selection
     */
    confirmSourceSelection() {
        if (!this.selectedSource) {
            alert('Please select a source to share');
            return;
        }

        this.hideSourceSelector();
        this.startScreenSharing(this.selectedSource);
    }

    /**
     * Select quality
     */
    selectQuality(quality) {
        // Update UI
        this.qualitySelector.querySelectorAll('.quality-option').forEach(option => {
            option.classList.remove('active');
        });

        const selectedOption = this.qualitySelector.querySelector(`[data-quality="${quality}"]`);
        if (selectedOption) {
            selectedOption.classList.add('active');
        }

        this.currentQuality = quality;
        this.performanceStats.qualityChanges++;
    }

    /**
     * Apply quality settings
     */
    applyQualitySettings() {
        this.hideQualitySelector();

        // If sharing is active, restart with new quality
        if (this.isSharing) {
            const wasAnnotating = this.isAnnotating;
            this.stopScreenSharing().then(() => {
                this.startScreenSharing(this.currentSource).then(() => {
                    if (wasAnnotating) {
                        this.toggleAnnotations();
                    }
                });
            });
        }
    }

    /**
     * Setup stream event handlers
     */
    setupStreamEventHandlers() {
        if (!this.currentStream) return;

        // Handle stream end
        this.currentStream.getTracks().forEach(track => {
            track.addEventListener('ended', () => {
                console.log('Screen sharing track ended');
                this.stopScreenSharing();
            });
        });
    }

    /**
     * Start duration tracking
     */
    startDurationTracking() {
        this.sharingStartTime = Date.now();
        this.durationInterval = setInterval(() => {
            this.updateSharingDuration();
        }, 1000);
    }

    /**
     * Stop duration tracking
     */
    stopDurationTracking() {
        if (this.durationInterval) {
            clearInterval(this.durationInterval);
            this.durationInterval = null;
        }

        if (this.sharingStartTime) {
            this.performanceStats.sharingDuration = Date.now() - this.sharingStartTime;
            this.sharingStartTime = null;
        }
    }

    /**
     * Update sharing duration display
     */
    updateSharingDuration() {
        if (!this.sharingStartTime) return;

        const duration = Date.now() - this.sharingStartTime;
        const minutes = Math.floor(duration / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);

        const durationElement = document.getElementById('sharing-duration');
        if (durationElement) {
            durationElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyDown(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 's':
                    if (e.shiftKey && this.isSharing) {
                        e.preventDefault();
                        this.startScreenSharing();
                    }
                    break;
                case 'a':
                    if (e.shiftKey && this.isSharing) {
                        e.preventDefault();
                        this.toggleAnnotations();
                    }
                    break;
                case 'z':
                    if (this.isAnnotating) {
                        e.preventDefault();
                        this.undoAnnotation();
                    }
                    break;
                case 'y':
                    if (this.isAnnotating) {
                        e.preventDefault();
                        this.redoAnnotation();
                    }
                    break;
            }
        }

        // Tool shortcuts
        if (this.isAnnotating) {
            switch (e.key) {
                case '1': this.selectTool('pointer'); break;
                case '2': this.selectTool('pen'); break;
                case '3': this.selectTool('highlighter'); break;
                case '4': this.selectTool('eraser'); break;
                case '5': this.selectTool('rectangle'); break;
                case '6': this.selectTool('circle'); break;
                case '7': this.selectTool('arrow'); break;
                case '8': this.selectTool('line'); break;
                case '9': this.selectTool('text'); break;
                case '0': this.selectTool('callout'); break;
            }
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        if (this.isAnnotating) {
            this.resizeAnnotationCanvas();
        }
    }

    /**
     * Handle sharing error
     */
    handleSharingError(error) {
        let message = 'Screen sharing failed';

        if (error.name === 'NotAllowedError') {
            message = 'Screen sharing permission denied';
        } else if (error.name === 'NotSupportedError') {
            message = 'Screen sharing not supported';
        } else if (error.name === 'NotFoundError') {
            message = 'No screen source available';
        }

        // Show error notification
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce(message, 'assertive');
        }

        // Emit error event
        this.emitSharingEvent('screen-sharing-error', {
            error: error.message,
            type: error.name,
            timestamp: Date.now()
        });
    }

    /**
     * Generate annotation ID
     */
    generateAnnotationId() {
        return 'annotation_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Emit sharing event
     */
    emitSharingEvent(eventType, data) {
        const event = new CustomEvent(eventType, {
            detail: {
                ...data,
                sharingSystem: this
            }
        });

        this.container.dispatchEvent(event);
    }

    /**
     * Emit annotation event
     */
    emitAnnotationEvent(eventType, data) {
        const event = new CustomEvent(eventType, {
            detail: {
                ...data,
                annotationSystem: this
            }
        });

        this.container.dispatchEvent(event);
    }

    /**
     * Inject screen sharing CSS
     */
    injectScreenSharingCSS() {
        if (document.getElementById('screen-sharing-css')) return;

        const style = document.createElement('style');
        style.id = 'screen-sharing-css';
        style.textContent = `
            /* Screen Sharing System */
            .screen-sharing-controls {
                display: flex;
                align-items: center;
                gap: 20px;
                padding: 15px;
                background: var(--card-dark, #2a2a2a);
                border-radius: 12px;
                border: 1px solid var(--border-color, #444);
                position: relative;
                margin-bottom: 20px;
            }

            .screen-sharing-main-controls {
                display: flex;
                align-items: center;
                gap: 20px;
                width: 100%;
            }

            .sharing-status-group {
                display: flex;
                align-items: center;
                gap: 15px;
                flex: 1;
            }

            .sharing-status {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 12px;
                background: var(--input-dark, #3a3a3a);
                border-radius: 8px;
                font-weight: 500;
            }

            .status-indicator {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                position: relative;
            }

            .status-indicator.offline {
                background: #6c757d;
            }

            .status-indicator.live {
                background: var(--primary-color, #ff0000);
                animation: pulse-live 2s infinite;
            }

            @keyframes pulse-live {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.7; transform: scale(1.1); }
            }

            .sharing-info {
                display: flex;
                gap: 15px;
                font-size: 0.9rem;
            }

            .info-item {
                display: flex;
                gap: 5px;
            }

            .info-label {
                color: var(--text-muted, #aaa);
            }

            .info-value {
                color: var(--text-light, #fff);
                font-weight: 500;
            }

            .sharing-controls-group {
                display: flex;
                gap: 10px;
            }

            .control-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 16px;
                background: var(--input-dark, #3a3a3a);
                border: 1px solid var(--border-color, #444);
                color: var(--text-light, #fff);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 0.9rem;
                font-weight: 500;
            }

            .control-btn:hover {
                background: var(--primary-color, #ff0000);
                border-color: var(--primary-color, #ff0000);
                transform: translateY(-1px);
            }

            .control-btn.primary {
                background: var(--primary-color, #ff0000);
                border-color: var(--primary-color, #ff0000);
            }

            .control-btn.primary:hover {
                background: #cc0000;
                border-color: #cc0000;
            }

            .control-btn.danger {
                background: #dc3545;
                border-color: #dc3545;
            }

            .control-btn.danger:hover {
                background: #c82333;
                border-color: #c82333;
            }

            .control-btn.active {
                background: var(--primary-color, #ff0000);
                border-color: var(--primary-color, #ff0000);
            }

            .sharing-indicators {
                display: flex;
                gap: 10px;
            }

            .indicator {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 10px;
                background: var(--primary-color, #ff0000);
                border-radius: 6px;
                font-size: 0.8rem;
                font-weight: 500;
                color: white;
            }

            /* Annotation Toolbar */
            .annotation-toolbar {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 320px;
                background: var(--card-dark, #2a2a2a);
                border: 1px solid var(--border-color, #444);
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                z-index: 2000;
                max-height: 80vh;
                overflow-y: auto;
            }

            .toolbar-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px;
                border-bottom: 1px solid var(--border-color, #444);
            }

            .toolbar-header h4 {
                margin: 0;
                color: var(--primary-color, #ff0000);
                font-size: 1.1rem;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .close-btn {
                background: none;
                border: none;
                color: var(--text-muted, #aaa);
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: all 0.2s ease;
            }

            .close-btn:hover {
                background: var(--primary-color, #ff0000);
                color: white;
            }

            .toolbar-content {
                padding: 15px;
            }

            .tool-group {
                margin-bottom: 20px;
            }

            .tool-group h5 {
                margin: 0 0 10px 0;
                color: var(--text-light, #fff);
                font-size: 0.9rem;
                font-weight: 600;
            }

            .tool-buttons {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
            }

            .tool-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px;
                background: var(--input-dark, #3a3a3a);
                border: 1px solid var(--border-color, #444);
                color: var(--text-light, #fff);
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 0.8rem;
            }

            .tool-btn:hover,
            .tool-btn.active {
                background: var(--primary-color, #ff0000);
                border-color: var(--primary-color, #ff0000);
            }

            .tool-settings {
                margin-bottom: 20px;
            }

            .setting-group {
                margin-bottom: 15px;
            }

            .setting-group label {
                display: block;
                color: var(--text-light, #fff);
                font-size: 0.9rem;
                margin-bottom: 5px;
            }

            .color-picker {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .color-picker input[type="color"] {
                width: 40px;
                height: 30px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }

            .color-presets {
                display: flex;
                gap: 4px;
            }

            .color-preset {
                width: 20px;
                height: 20px;
                border-radius: 3px;
                cursor: pointer;
                border: 2px solid transparent;
                transition: all 0.2s ease;
            }

            .color-preset:hover {
                border-color: var(--primary-color, #ff0000);
                transform: scale(1.1);
            }

            .setting-group input[type="range"] {
                width: 100%;
                margin-bottom: 5px;
            }

            .width-value,
            .opacity-value {
                color: var(--text-muted, #aaa);
                font-size: 0.8rem;
            }

            .toolbar-actions {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
            }

            .action-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                padding: 8px;
                background: var(--input-dark, #3a3a3a);
                border: 1px solid var(--border-color, #444);
                color: var(--text-light, #fff);
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 0.8rem;
            }

            .action-btn:hover {
                background: var(--primary-color, #ff0000);
                border-color: var(--primary-color, #ff0000);
            }

            .action-btn.danger {
                background: #dc3545;
                border-color: #dc3545;
            }

            .action-btn.danger:hover {
                background: #c82333;
                border-color: #c82333;
            }

            /* Source and Quality Selectors */
            .source-selector,
            .quality-selector {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: var(--card-dark, #2a2a2a);
                border: 1px solid var(--border-color, #444);
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                z-index: 1500;
                margin-top: 10px;
                min-width: 400px;
            }

            .selector-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px;
                border-bottom: 1px solid var(--border-color, #444);
            }

            .selector-header h4 {
                margin: 0;
                color: var(--primary-color, #ff0000);
                font-size: 1.1rem;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .selector-content {
                padding: 15px;
            }

            .source-options,
            .quality-options {
                margin-bottom: 20px;
            }

            .source-option,
            .quality-option {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 15px;
                background: var(--input-dark, #3a3a3a);
                border: 1px solid var(--border-color, #444);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                margin-bottom: 10px;
            }

            .source-option:hover,
            .quality-option:hover,
            .source-option.active,
            .quality-option.active {
                background: var(--primary-color, #ff0000);
                border-color: var(--primary-color, #ff0000);
            }

            .source-icon {
                font-size: 1.5rem;
                color: var(--primary-color, #ff0000);
                width: 40px;
                text-align: center;
            }

            .source-info,
            .quality-info {
                flex: 1;
            }

            .source-info h5,
            .quality-info h5 {
                margin: 0 0 5px 0;
                color: var(--text-light, #fff);
                font-size: 1rem;
            }

            .source-info p {
                margin: 0;
                color: var(--text-muted, #aaa);
                font-size: 0.9rem;
            }

            .quality-specs,
            .quality-description {
                color: var(--text-muted, #aaa);
                font-size: 0.8rem;
                margin-bottom: 3px;
            }

            .source-quality {
                color: var(--primary-color, #ff0000);
                font-size: 0.8rem;
                font-weight: 500;
            }

            .quality-bars {
                display: flex;
                gap: 3px;
                align-items: end;
            }

            .quality-bar {
                width: 4px;
                height: 8px;
                background: var(--border-color, #444);
                border-radius: 1px;
                transition: all 0.2s ease;
            }

            .quality-bar.active {
                background: var(--primary-color, #ff0000);
            }

            .quality-bar:nth-child(1) { height: 6px; }
            .quality-bar:nth-child(2) { height: 8px; }
            .quality-bar:nth-child(3) { height: 10px; }
            .quality-bar:nth-child(4) { height: 12px; }

            .quality-settings {
                margin-bottom: 20px;
            }

            .quality-settings .setting-group {
                margin-bottom: 10px;
            }

            .quality-settings label {
                display: flex;
                align-items: center;
                color: var(--text-light, #fff);
                font-size: 0.9rem;
                cursor: pointer;
            }

            .quality-settings input[type="checkbox"] {
                margin-right: 8px;
            }

            .selector-actions {
                display: flex;
                gap: 10px;
            }

            .selector-actions .action-btn {
                flex: 1;
                justify-content: center;
                padding: 12px;
            }

            /* Annotation Canvas */
            .annotation-canvas {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 1000;
            }

            /* Responsive Design */
            @media (max-width: 768px) {
                .screen-sharing-controls {
                    flex-direction: column;
                    gap: 15px;
                }

                .screen-sharing-main-controls {
                    flex-direction: column;
                    gap: 15px;
                }

                .sharing-controls-group {
                    flex-wrap: wrap;
                    justify-content: center;
                }

                .annotation-toolbar {
                    position: fixed;
                    top: 10px;
                    left: 10px;
                    right: 10px;
                    width: auto;
                }

                .source-selector,
                .quality-selector {
                    position: fixed;
                    top: 50%;
                    left: 10px;
                    right: 10px;
                    transform: translateY(-50%);
                    min-width: auto;
                }

                .tool-buttons {
                    grid-template-columns: 1fr;
                }

                .toolbar-actions {
                    grid-template-columns: 1fr;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // Public API Methods

    /**
     * Get current sharing status
     */
    getSharingStatus() {
        return {
            isSharing: this.isSharing,
            isAnnotating: this.isAnnotating,
            currentSource: this.currentSource,
            currentQuality: this.currentQuality,
            currentTool: this.currentTool
        };
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        return { ...this.performanceStats };
    }

    /**
     * Get annotations
     */
    getAnnotations() {
        return Array.from(this.annotations.values());
    }

    /**
     * Load annotations
     */
    loadAnnotations(annotationsData) {
        try {
            this.annotations.clear();

            if (Array.isArray(annotationsData)) {
                annotationsData.forEach(annotation => {
                    this.annotations.set(annotation.id, annotation);
                });
            } else if (annotationsData.annotations) {
                annotationsData.annotations.forEach(annotation => {
                    this.annotations.set(annotation.id, annotation);
                });
            }

            this.redrawAnnotations();
            return true;
        } catch (error) {
            console.error('Failed to load annotations:', error);
            return false;
        }
    }

    /**
     * Get current stream
     */
    getCurrentStream() {
        return this.currentStream;
    }

    /**
     * Destroy screen sharing system
     */
    destroy() {
        // Stop sharing if active
        if (this.isSharing) {
            this.stopScreenSharing();
        }

        // Remove event listeners
        document.removeEventListener('keydown', this.boundEventHandlers.handleKeyDown);
        window.removeEventListener('resize', this.boundEventHandlers.handleResize);

        // Remove UI elements
        if (this.screenSharingControls) {
            this.screenSharingControls.remove();
        }
        if (this.annotationToolbar) {
            this.annotationToolbar.remove();
        }
        if (this.sourceSelector) {
            this.sourceSelector.remove();
        }
        if (this.qualitySelector) {
            this.qualitySelector.remove();
        }
        if (this.annotationCanvas) {
            this.annotationCanvas.remove();
        }

        // Clear data
        this.annotations.clear();
        this.annotationHistory = [];
        this.collaborators.clear();

        // Remove CSS
        const style = document.getElementById('screen-sharing-css');
        if (style) {
            style.remove();
        }
    }
}
