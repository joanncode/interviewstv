/**
 * Recording Controls and Live Editing System
 * Advanced recording management with live editing capabilities for Interviews.tv
 */

class RecordingControlsSystem {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            enableLiveEditing: true,
            enableMultiTrack: true,
            enableRealTimeEffects: true,
            enableAutoSave: true,
            maxRecordingDuration: 7200000, // 2 hours
            autoSaveInterval: 30000, // 30 seconds
            recordingFormats: ['webm', 'mp4'],
            qualityPresets: {
                'low': { width: 1280, height: 720, videoBitrate: 1500000, audioBitrate: 96000, fps: 24 },
                'medium': { width: 1920, height: 1080, videoBitrate: 2500000, audioBitrate: 128000, fps: 30 },
                'high': { width: 1920, height: 1080, videoBitrate: 4000000, audioBitrate: 192000, fps: 30 },
                'ultra': { width: 2560, height: 1440, videoBitrate: 8000000, audioBitrate: 256000, fps: 30 }
            },
            ...options
        };
        
        // Core recording state
        this.isRecording = false;
        this.isPaused = false;
        this.recordingId = null;
        this.recordingStartTime = null;
        this.recordingDuration = 0;
        this.currentQuality = 'medium';
        this.currentFormat = 'webm';
        
        // Recording components
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.recordingStream = null;
        this.recordingTracks = new Map();
        
        // Live editing state
        this.editingMode = false;
        this.editingTimeline = [];
        this.currentEditPoint = 0;
        this.liveEffects = new Map();
        this.transitions = [];
        
        // UI components
        this.recordingControls = null;
        this.liveEditingPanel = null;
        this.timelineEditor = null;
        this.effectsPanel = null;
        
        // Performance tracking
        this.performanceStats = {
            recordingsCreated: 0,
            totalRecordingTime: 0,
            editsApplied: 0,
            effectsUsed: 0,
            autoSaves: 0
        };
        
        // Integration systems
        this.accessibilitySystem = options.accessibilitySystem;
        this.themeSystem = options.themeSystem;
        this.responsiveSystem = options.responsiveSystem;
        this.streamingInterface = options.streamingInterface;
        
        // Event handlers
        this.boundEventHandlers = {
            handleKeyDown: this.handleKeyDown.bind(this),
            handleTimelineClick: this.handleTimelineClick.bind(this),
            handleEffectChange: this.handleEffectChange.bind(this)
        };
        
        this.init();
    }
    
    /**
     * Initialize recording controls system
     */
    init() {
        console.log('🎬 Initializing Recording Controls System...');
        
        // Check browser support
        if (!this.checkBrowserSupport()) {
            console.error('Recording not supported in this browser');
            return;
        }
        
        // Create UI components
        this.createRecordingControls();
        this.createLiveEditingPanel();
        this.createTimelineEditor();
        this.createEffectsPanel();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Inject CSS
        this.injectRecordingCSS();
        
        // Setup auto-save if enabled
        if (this.options.enableAutoSave) {
            this.setupAutoSave();
        }
        
        console.log('✅ Recording Controls System initialized successfully');
    }
    
    /**
     * Check browser support
     */
    checkBrowserSupport() {
        return !!(window.MediaRecorder && navigator.mediaDevices);
    }
    
    /**
     * Create recording controls
     */
    createRecordingControls() {
        this.recordingControls = document.createElement('div');
        this.recordingControls.className = 'recording-controls-panel';
        this.recordingControls.innerHTML = `
            <div class="recording-main-controls">
                <div class="recording-status-group">
                    <div class="recording-status" id="recording-status">
                        <div class="status-indicator" id="recording-indicator"></div>
                        <span class="status-text" id="recording-status-text">Ready to Record</span>
                    </div>
                    
                    <div class="recording-info" id="recording-info" style="display: none;">
                        <div class="info-item">
                            <span class="info-label">Duration:</span>
                            <span class="info-value" id="recording-duration">00:00:00</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Quality:</span>
                            <span class="info-value" id="recording-quality">Medium</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Format:</span>
                            <span class="info-value" id="recording-format">WebM</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Size:</span>
                            <span class="info-value" id="recording-size">0 MB</span>
                        </div>
                    </div>
                </div>
                
                <div class="recording-controls-group">
                    <button class="control-btn primary" id="start-recording-btn" title="Start Recording">
                        <i class="fas fa-record-vinyl" aria-hidden="true"></i>
                        <span>Record</span>
                    </button>
                    
                    <button class="control-btn warning" id="pause-recording-btn" style="display: none;" title="Pause Recording">
                        <i class="fas fa-pause" aria-hidden="true"></i>
                        <span>Pause</span>
                    </button>
                    
                    <button class="control-btn" id="resume-recording-btn" style="display: none;" title="Resume Recording">
                        <i class="fas fa-play" aria-hidden="true"></i>
                        <span>Resume</span>
                    </button>
                    
                    <button class="control-btn danger" id="stop-recording-btn" style="display: none;" title="Stop Recording">
                        <i class="fas fa-stop" aria-hidden="true"></i>
                        <span>Stop</span>
                    </button>
                    
                    <button class="control-btn" id="recording-settings-btn" title="Recording Settings">
                        <i class="fas fa-cog" aria-hidden="true"></i>
                        <span>Settings</span>
                    </button>
                    
                    <button class="control-btn" id="live-editing-btn" title="Live Editing">
                        <i class="fas fa-cut" aria-hidden="true"></i>
                        <span>Edit</span>
                    </button>
                </div>
                
                <div class="recording-indicators">
                    <div class="indicator" id="auto-save-indicator" style="display: none;">
                        <i class="fas fa-save" aria-hidden="true"></i>
                        <span>Auto-saving</span>
                    </div>
                    
                    <div class="indicator" id="live-editing-indicator" style="display: none;">
                        <i class="fas fa-cut" aria-hidden="true"></i>
                        <span>Live Editing</span>
                    </div>
                    
                    <div class="indicator" id="effects-indicator" style="display: none;">
                        <i class="fas fa-magic" aria-hidden="true"></i>
                        <span id="effects-count">0</span>
                    </div>
                </div>
            </div>
            
            <div class="recording-progress-bar" id="recording-progress-bar" style="display: none;">
                <div class="progress-fill" id="recording-progress-fill"></div>
                <div class="progress-markers" id="recording-progress-markers"></div>
            </div>
        `;
        
        this.container.appendChild(this.recordingControls);
    }
    
    /**
     * Create live editing panel
     */
    createLiveEditingPanel() {
        this.liveEditingPanel = document.createElement('div');
        this.liveEditingPanel.className = 'live-editing-panel';
        this.liveEditingPanel.style.display = 'none';
        this.liveEditingPanel.innerHTML = `
            <div class="editing-header">
                <h4><i class="fas fa-cut" aria-hidden="true"></i>Live Editing</h4>
                <div class="editing-controls">
                    <button class="edit-btn" id="add-marker-btn" title="Add Marker">
                        <i class="fas fa-map-marker-alt" aria-hidden="true"></i>
                        <span>Marker</span>
                    </button>
                    <button class="edit-btn" id="split-clip-btn" title="Split Clip">
                        <i class="fas fa-cut" aria-hidden="true"></i>
                        <span>Split</span>
                    </button>
                    <button class="edit-btn" id="trim-clip-btn" title="Trim Clip">
                        <i class="fas fa-crop" aria-hidden="true"></i>
                        <span>Trim</span>
                    </button>
                    <button class="edit-btn" id="add-transition-btn" title="Add Transition">
                        <i class="fas fa-exchange-alt" aria-hidden="true"></i>
                        <span>Transition</span>
                    </button>
                </div>
                <button class="close-btn" id="close-editing-panel" title="Close Panel">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>
            
            <div class="editing-content">
                <div class="editing-tracks">
                    <div class="track-header">
                        <h5>Video Track</h5>
                        <div class="track-controls">
                            <button class="track-btn" title="Mute Track">
                                <i class="fas fa-volume-mute" aria-hidden="true"></i>
                            </button>
                            <button class="track-btn" title="Solo Track">
                                <i class="fas fa-headphones" aria-hidden="true"></i>
                            </button>
                            <button class="track-btn" title="Lock Track">
                                <i class="fas fa-lock" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>
                    <div class="track-content" id="video-track">
                        <!-- Video clips will be added here -->
                    </div>
                </div>
                
                <div class="editing-tracks">
                    <div class="track-header">
                        <h5>Audio Track</h5>
                        <div class="track-controls">
                            <button class="track-btn" title="Mute Track">
                                <i class="fas fa-volume-mute" aria-hidden="true"></i>
                            </button>
                            <button class="track-btn" title="Solo Track">
                                <i class="fas fa-headphones" aria-hidden="true"></i>
                            </button>
                            <button class="track-btn" title="Lock Track">
                                <i class="fas fa-lock" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>
                    <div class="track-content" id="audio-track">
                        <!-- Audio clips will be added here -->
                    </div>
                </div>
                
                <div class="editing-actions">
                    <button class="action-btn" id="undo-edit" title="Undo Last Edit">
                        <i class="fas fa-undo" aria-hidden="true"></i>
                        <span>Undo</span>
                    </button>
                    <button class="action-btn" id="redo-edit" title="Redo Edit">
                        <i class="fas fa-redo" aria-hidden="true"></i>
                        <span>Redo</span>
                    </button>
                    <button class="action-btn" id="preview-edit" title="Preview Edit">
                        <i class="fas fa-play" aria-hidden="true"></i>
                        <span>Preview</span>
                    </button>
                    <button class="action-btn primary" id="apply-edit" title="Apply Edit">
                        <i class="fas fa-check" aria-hidden="true"></i>
                        <span>Apply</span>
                    </button>
                </div>
            </div>
        `;
        
        this.container.appendChild(this.liveEditingPanel);
    }
    
    /**
     * Create timeline editor
     */
    createTimelineEditor() {
        this.timelineEditor = document.createElement('div');
        this.timelineEditor.className = 'timeline-editor';
        this.timelineEditor.style.display = 'none';
        this.timelineEditor.innerHTML = `
            <div class="timeline-header">
                <div class="timeline-controls">
                    <button class="timeline-btn" id="timeline-zoom-in" title="Zoom In">
                        <i class="fas fa-search-plus" aria-hidden="true"></i>
                    </button>
                    <button class="timeline-btn" id="timeline-zoom-out" title="Zoom Out">
                        <i class="fas fa-search-minus" aria-hidden="true"></i>
                    </button>
                    <button class="timeline-btn" id="timeline-fit" title="Fit to Window">
                        <i class="fas fa-expand-arrows-alt" aria-hidden="true"></i>
                    </button>
                </div>
                
                <div class="timeline-time-display">
                    <span id="timeline-current-time">00:00:00</span>
                    <span>/</span>
                    <span id="timeline-total-time">00:00:00</span>
                </div>
                
                <div class="timeline-playback">
                    <button class="playback-btn" id="timeline-play" title="Play/Pause">
                        <i class="fas fa-play" aria-hidden="true"></i>
                    </button>
                    <button class="playback-btn" id="timeline-stop" title="Stop">
                        <i class="fas fa-stop" aria-hidden="true"></i>
                    </button>
                </div>
            </div>
            
            <div class="timeline-content">
                <div class="timeline-ruler" id="timeline-ruler">
                    <!-- Time markers will be generated here -->
                </div>
                
                <div class="timeline-tracks" id="timeline-tracks">
                    <!-- Timeline tracks will be added here -->
                </div>
                
                <div class="timeline-playhead" id="timeline-playhead"></div>
            </div>
        `;
        
        this.container.appendChild(this.timelineEditor);
    }

    /**
     * Create effects panel
     */
    createEffectsPanel() {
        this.effectsPanel = document.createElement('div');
        this.effectsPanel.className = 'effects-panel';
        this.effectsPanel.style.display = 'none';
        this.effectsPanel.innerHTML = `
            <div class="effects-header">
                <h4><i class="fas fa-magic" aria-hidden="true"></i>Real-time Effects</h4>
                <button class="close-btn" id="close-effects-panel" title="Close Panel">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>

            <div class="effects-content">
                <div class="effects-categories">
                    <button class="category-btn active" data-category="video">
                        <i class="fas fa-video" aria-hidden="true"></i>
                        <span>Video</span>
                    </button>
                    <button class="category-btn" data-category="audio">
                        <i class="fas fa-volume-up" aria-hidden="true"></i>
                        <span>Audio</span>
                    </button>
                    <button class="category-btn" data-category="filters">
                        <i class="fas fa-filter" aria-hidden="true"></i>
                        <span>Filters</span>
                    </button>
                    <button class="category-btn" data-category="transitions">
                        <i class="fas fa-exchange-alt" aria-hidden="true"></i>
                        <span>Transitions</span>
                    </button>
                </div>

                <div class="effects-list" id="effects-list">
                    <!-- Video Effects -->
                    <div class="effect-group" data-category="video">
                        <div class="effect-item" data-effect="brightness">
                            <div class="effect-preview">
                                <i class="fas fa-sun" aria-hidden="true"></i>
                            </div>
                            <div class="effect-info">
                                <h6>Brightness</h6>
                                <p>Adjust video brightness</p>
                            </div>
                            <div class="effect-controls">
                                <input type="range" min="0" max="200" value="100" class="effect-slider" data-param="brightness">
                                <span class="effect-value">100%</span>
                            </div>
                        </div>

                        <div class="effect-item" data-effect="contrast">
                            <div class="effect-preview">
                                <i class="fas fa-adjust" aria-hidden="true"></i>
                            </div>
                            <div class="effect-info">
                                <h6>Contrast</h6>
                                <p>Adjust video contrast</p>
                            </div>
                            <div class="effect-controls">
                                <input type="range" min="0" max="200" value="100" class="effect-slider" data-param="contrast">
                                <span class="effect-value">100%</span>
                            </div>
                        </div>

                        <div class="effect-item" data-effect="saturation">
                            <div class="effect-preview">
                                <i class="fas fa-palette" aria-hidden="true"></i>
                            </div>
                            <div class="effect-info">
                                <h6>Saturation</h6>
                                <p>Adjust color saturation</p>
                            </div>
                            <div class="effect-controls">
                                <input type="range" min="0" max="200" value="100" class="effect-slider" data-param="saturation">
                                <span class="effect-value">100%</span>
                            </div>
                        </div>

                        <div class="effect-item" data-effect="hue">
                            <div class="effect-preview">
                                <i class="fas fa-tint" aria-hidden="true"></i>
                            </div>
                            <div class="effect-info">
                                <h6>Hue Rotate</h6>
                                <p>Rotate color hue</p>
                            </div>
                            <div class="effect-controls">
                                <input type="range" min="0" max="360" value="0" class="effect-slider" data-param="hue">
                                <span class="effect-value">0°</span>
                            </div>
                        </div>
                    </div>

                    <!-- Audio Effects -->
                    <div class="effect-group" data-category="audio" style="display: none;">
                        <div class="effect-item" data-effect="volume">
                            <div class="effect-preview">
                                <i class="fas fa-volume-up" aria-hidden="true"></i>
                            </div>
                            <div class="effect-info">
                                <h6>Volume</h6>
                                <p>Adjust audio volume</p>
                            </div>
                            <div class="effect-controls">
                                <input type="range" min="0" max="200" value="100" class="effect-slider" data-param="volume">
                                <span class="effect-value">100%</span>
                            </div>
                        </div>

                        <div class="effect-item" data-effect="echo">
                            <div class="effect-preview">
                                <i class="fas fa-echo" aria-hidden="true"></i>
                            </div>
                            <div class="effect-info">
                                <h6>Echo</h6>
                                <p>Add echo effect</p>
                            </div>
                            <div class="effect-controls">
                                <input type="range" min="0" max="100" value="0" class="effect-slider" data-param="echo">
                                <span class="effect-value">0%</span>
                            </div>
                        </div>

                        <div class="effect-item" data-effect="noise-reduction">
                            <div class="effect-preview">
                                <i class="fas fa-microphone-slash" aria-hidden="true"></i>
                            </div>
                            <div class="effect-info">
                                <h6>Noise Reduction</h6>
                                <p>Reduce background noise</p>
                            </div>
                            <div class="effect-controls">
                                <input type="range" min="0" max="100" value="0" class="effect-slider" data-param="noise-reduction">
                                <span class="effect-value">0%</span>
                            </div>
                        </div>
                    </div>

                    <!-- Filter Effects -->
                    <div class="effect-group" data-category="filters" style="display: none;">
                        <div class="effect-item" data-effect="blur">
                            <div class="effect-preview">
                                <i class="fas fa-eye-slash" aria-hidden="true"></i>
                            </div>
                            <div class="effect-info">
                                <h6>Blur</h6>
                                <p>Apply blur effect</p>
                            </div>
                            <div class="effect-controls">
                                <input type="range" min="0" max="20" value="0" class="effect-slider" data-param="blur">
                                <span class="effect-value">0px</span>
                            </div>
                        </div>

                        <div class="effect-item" data-effect="sepia">
                            <div class="effect-preview">
                                <i class="fas fa-image" aria-hidden="true"></i>
                            </div>
                            <div class="effect-info">
                                <h6>Sepia</h6>
                                <p>Apply sepia tone</p>
                            </div>
                            <div class="effect-controls">
                                <input type="range" min="0" max="100" value="0" class="effect-slider" data-param="sepia">
                                <span class="effect-value">0%</span>
                            </div>
                        </div>

                        <div class="effect-item" data-effect="grayscale">
                            <div class="effect-preview">
                                <i class="fas fa-adjust" aria-hidden="true"></i>
                            </div>
                            <div class="effect-info">
                                <h6>Grayscale</h6>
                                <p>Convert to grayscale</p>
                            </div>
                            <div class="effect-controls">
                                <input type="range" min="0" max="100" value="0" class="effect-slider" data-param="grayscale">
                                <span class="effect-value">0%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="effects-actions">
                    <button class="action-btn" id="reset-effects" title="Reset All Effects">
                        <i class="fas fa-undo" aria-hidden="true"></i>
                        <span>Reset</span>
                    </button>
                    <button class="action-btn" id="save-preset" title="Save Preset">
                        <i class="fas fa-save" aria-hidden="true"></i>
                        <span>Save Preset</span>
                    </button>
                    <button class="action-btn primary" id="apply-effects" title="Apply Effects">
                        <i class="fas fa-check" aria-hidden="true"></i>
                        <span>Apply</span>
                    </button>
                </div>
            </div>
        `;

        this.container.appendChild(this.effectsPanel);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Recording controls
        document.getElementById('start-recording-btn')?.addEventListener('click', () => this.startRecording());
        document.getElementById('pause-recording-btn')?.addEventListener('click', () => this.pauseRecording());
        document.getElementById('resume-recording-btn')?.addEventListener('click', () => this.resumeRecording());
        document.getElementById('stop-recording-btn')?.addEventListener('click', () => this.stopRecording());
        document.getElementById('recording-settings-btn')?.addEventListener('click', () => this.showRecordingSettings());
        document.getElementById('live-editing-btn')?.addEventListener('click', () => this.toggleLiveEditing());

        // Live editing controls
        document.getElementById('close-editing-panel')?.addEventListener('click', () => this.hideLiveEditingPanel());
        document.getElementById('add-marker-btn')?.addEventListener('click', () => this.addMarker());
        document.getElementById('split-clip-btn')?.addEventListener('click', () => this.splitClip());
        document.getElementById('trim-clip-btn')?.addEventListener('click', () => this.trimClip());
        document.getElementById('add-transition-btn')?.addEventListener('click', () => this.addTransition());
        document.getElementById('undo-edit')?.addEventListener('click', () => this.undoEdit());
        document.getElementById('redo-edit')?.addEventListener('click', () => this.redoEdit());
        document.getElementById('preview-edit')?.addEventListener('click', () => this.previewEdit());
        document.getElementById('apply-edit')?.addEventListener('click', () => this.applyEdit());

        // Timeline controls
        document.getElementById('timeline-zoom-in')?.addEventListener('click', () => this.zoomTimelineIn());
        document.getElementById('timeline-zoom-out')?.addEventListener('click', () => this.zoomTimelineOut());
        document.getElementById('timeline-fit')?.addEventListener('click', () => this.fitTimelineToWindow());
        document.getElementById('timeline-play')?.addEventListener('click', () => this.toggleTimelinePlayback());
        document.getElementById('timeline-stop')?.addEventListener('click', () => this.stopTimelinePlayback());

        // Effects controls
        document.getElementById('close-effects-panel')?.addEventListener('click', () => this.hideEffectsPanel());
        document.getElementById('reset-effects')?.addEventListener('click', () => this.resetAllEffects());
        document.getElementById('save-preset')?.addEventListener('click', () => this.saveEffectPreset());
        document.getElementById('apply-effects')?.addEventListener('click', () => this.applyEffects());

        // Effects categories
        this.effectsPanel?.addEventListener('click', (e) => {
            if (e.target.closest('.category-btn')) {
                const category = e.target.closest('.category-btn').dataset.category;
                this.switchEffectsCategory(category);
            }
        });

        // Effect sliders
        this.effectsPanel?.addEventListener('input', (e) => {
            if (e.target.classList.contains('effect-slider')) {
                this.handleEffectChange(e);
            }
        });

        // Timeline interactions
        this.timelineEditor?.addEventListener('click', this.boundEventHandlers.handleTimelineClick);

        // Keyboard shortcuts
        document.addEventListener('keydown', this.boundEventHandlers.handleKeyDown);
    }

    /**
     * Start recording
     */
    async startRecording() {
        try {
            if (this.isRecording) {
                console.warn('Recording already in progress');
                return;
            }

            // Get media stream from streaming interface
            if (this.streamingInterface && this.streamingInterface.localStream) {
                this.recordingStream = this.streamingInterface.localStream;
            } else {
                throw new Error('No media stream available for recording');
            }

            // Get quality settings
            const qualitySettings = this.options.qualityPresets[this.currentQuality];

            // Configure MediaRecorder
            const mimeType = this.getSupportedMimeType();
            const options = {
                mimeType: mimeType,
                videoBitsPerSecond: qualitySettings.videoBitrate,
                audioBitsPerSecond: qualitySettings.audioBitrate
            };

            // Create MediaRecorder
            this.mediaRecorder = new MediaRecorder(this.recordingStream, options);
            this.recordedChunks = [];

            // Setup MediaRecorder events
            this.setupMediaRecorderEvents();

            // Start recording
            this.mediaRecorder.start(1000); // 1-second chunks for live editing

            // Update state
            this.isRecording = true;
            this.isPaused = false;
            this.recordingStartTime = Date.now();
            this.recordingId = this.generateRecordingId();

            // Start duration tracking
            this.startDurationTracking();

            // Update UI
            this.updateRecordingUI();

            // Emit recording started event
            this.emitRecordingEvent('recording-started', {
                recordingId: this.recordingId,
                quality: this.currentQuality,
                format: this.currentFormat,
                timestamp: this.recordingStartTime
            });

            // Announce to accessibility system
            if (this.accessibilitySystem) {
                this.accessibilitySystem.announce('Recording started', 'polite');
            }

            // Update performance stats
            this.performanceStats.recordingsCreated++;

            console.log('✅ Recording started successfully');

        } catch (error) {
            console.error('Failed to start recording:', error);
            this.handleRecordingError(error);
        }
    }

    /**
     * Pause recording
     */
    pauseRecording() {
        try {
            if (!this.isRecording || this.isPaused) {
                console.warn('No active recording to pause');
                return;
            }

            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                this.mediaRecorder.pause();
            }

            this.isPaused = true;
            this.stopDurationTracking();
            this.updateRecordingUI();

            // Emit recording paused event
            this.emitRecordingEvent('recording-paused', {
                recordingId: this.recordingId,
                pausedAt: Date.now(),
                duration: this.recordingDuration
            });

            // Announce to accessibility system
            if (this.accessibilitySystem) {
                this.accessibilitySystem.announce('Recording paused', 'polite');
            }

            console.log('Recording paused');

        } catch (error) {
            console.error('Failed to pause recording:', error);
        }
    }

    /**
     * Resume recording
     */
    resumeRecording() {
        try {
            if (!this.isRecording || !this.isPaused) {
                console.warn('No paused recording to resume');
                return;
            }

            if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
                this.mediaRecorder.resume();
            }

            this.isPaused = false;
            this.startDurationTracking();
            this.updateRecordingUI();

            // Emit recording resumed event
            this.emitRecordingEvent('recording-resumed', {
                recordingId: this.recordingId,
                resumedAt: Date.now(),
                duration: this.recordingDuration
            });

            // Announce to accessibility system
            if (this.accessibilitySystem) {
                this.accessibilitySystem.announce('Recording resumed', 'polite');
            }

            console.log('Recording resumed');

        } catch (error) {
            console.error('Failed to resume recording:', error);
        }
    }

    /**
     * Stop recording
     */
    async stopRecording() {
        try {
            if (!this.isRecording) {
                console.warn('No active recording to stop');
                return;
            }

            // Stop MediaRecorder
            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop();
            }

            // Stop duration tracking
            this.stopDurationTracking();

            // Update state
            this.isRecording = false;
            this.isPaused = false;

            // Update performance stats
            this.performanceStats.totalRecordingTime += this.recordingDuration;

            // Update UI
            this.updateRecordingUI();

            // Process recorded data
            await this.processRecordedData();

            // Emit recording stopped event
            this.emitRecordingEvent('recording-stopped', {
                recordingId: this.recordingId,
                duration: this.recordingDuration,
                size: this.getRecordingSize(),
                timestamp: Date.now()
            });

            // Announce to accessibility system
            if (this.accessibilitySystem) {
                this.accessibilitySystem.announce('Recording stopped', 'polite');
            }

            console.log('✅ Recording stopped successfully');

        } catch (error) {
            console.error('Failed to stop recording:', error);
            this.handleRecordingError(error);
        }
    }

    /**
     * Setup MediaRecorder events
     */
    setupMediaRecorderEvents() {
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                this.recordedChunks.push(event.data);

                // Add to timeline for live editing
                if (this.options.enableLiveEditing) {
                    this.addToTimeline(event.data, event.timecode || Date.now());
                }

                // Update recording size display
                this.updateRecordingSize();
            }
        };

        this.mediaRecorder.onstart = () => {
            console.log('MediaRecorder started');
        };

        this.mediaRecorder.onstop = () => {
            console.log('MediaRecorder stopped');
        };

        this.mediaRecorder.onpause = () => {
            console.log('MediaRecorder paused');
        };

        this.mediaRecorder.onresume = () => {
            console.log('MediaRecorder resumed');
        };

        this.mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event.error);
            this.handleRecordingError(event.error);
        };
    }

    /**
     * Toggle live editing mode
     */
    toggleLiveEditing() {
        this.editingMode = !this.editingMode;

        if (this.editingMode) {
            this.showLiveEditingPanel();
            this.showTimelineEditor();
        } else {
            this.hideLiveEditingPanel();
            this.hideTimelineEditor();
        }

        this.updateLiveEditingUI();

        // Announce to accessibility system
        if (this.accessibilitySystem) {
            const status = this.editingMode ? 'enabled' : 'disabled';
            this.accessibilitySystem.announce(`Live editing ${status}`, 'polite');
        }
    }

    /**
     * Add marker to timeline
     */
    addMarker() {
        if (!this.isRecording) {
            console.warn('Cannot add marker when not recording');
            return;
        }

        const currentTime = this.recordingDuration;
        const marker = {
            id: this.generateMarkerId(),
            time: currentTime,
            type: 'marker',
            label: `Marker ${this.editingTimeline.filter(item => item.type === 'marker').length + 1}`,
            timestamp: Date.now()
        };

        this.editingTimeline.push(marker);
        this.updateTimelineDisplay();

        // Emit marker added event
        this.emitEditingEvent('marker-added', marker);

        console.log('Marker added at', this.formatDuration(currentTime));
    }

    /**
     * Split clip at current position
     */
    splitClip() {
        if (!this.isRecording) {
            console.warn('Cannot split clip when not recording');
            return;
        }

        const currentTime = this.recordingDuration;
        const split = {
            id: this.generateSplitId(),
            time: currentTime,
            type: 'split',
            timestamp: Date.now()
        };

        this.editingTimeline.push(split);
        this.updateTimelineDisplay();

        // Update performance stats
        this.performanceStats.editsApplied++;

        // Emit split added event
        this.emitEditingEvent('split-added', split);

        console.log('Clip split at', this.formatDuration(currentTime));
    }

    /**
     * Add transition effect
     */
    addTransition() {
        if (!this.isRecording) {
            console.warn('Cannot add transition when not recording');
            return;
        }

        const currentTime = this.recordingDuration;
        const transition = {
            id: this.generateTransitionId(),
            time: currentTime,
            type: 'transition',
            effect: 'fade',
            duration: 1000, // 1 second
            timestamp: Date.now()
        };

        this.transitions.push(transition);
        this.editingTimeline.push(transition);
        this.updateTimelineDisplay();

        // Update performance stats
        this.performanceStats.editsApplied++;

        // Emit transition added event
        this.emitEditingEvent('transition-added', transition);

        console.log('Transition added at', this.formatDuration(currentTime));
    }

    /**
     * Apply real-time effect
     */
    applyRealTimeEffect(effectType, value) {
        if (!this.options.enableRealTimeEffects) {
            return;
        }

        const effect = {
            type: effectType,
            value: value,
            timestamp: Date.now()
        };

        this.liveEffects.set(effectType, effect);

        // Apply effect to current stream if possible
        if (this.recordingStream && this.recordingStream.getVideoTracks().length > 0) {
            this.applyVideoEffect(effectType, value);
        }

        // Update performance stats
        this.performanceStats.effectsUsed++;

        // Emit effect applied event
        this.emitEditingEvent('effect-applied', effect);
    }

    /**
     * Apply video effect to stream
     */
    applyVideoEffect(effectType, value) {
        // This would typically involve WebGL shaders or Canvas manipulation
        // For now, we'll log the effect application
        console.log(`Applying ${effectType} effect with value ${value}`);

        // In a real implementation, you would:
        // 1. Create a canvas element
        // 2. Get the video stream
        // 3. Apply the effect using WebGL or Canvas 2D
        // 4. Create a new stream from the canvas
        // 5. Replace the track in the MediaRecorder
    }

    /**
     * Update recording UI
     */
    updateRecordingUI() {
        const statusText = document.getElementById('recording-status-text');
        const indicator = document.getElementById('recording-indicator');
        const recordingInfo = document.getElementById('recording-info');
        const startBtn = document.getElementById('start-recording-btn');
        const pauseBtn = document.getElementById('pause-recording-btn');
        const resumeBtn = document.getElementById('resume-recording-btn');
        const stopBtn = document.getElementById('stop-recording-btn');
        const progressBar = document.getElementById('recording-progress-bar');

        if (this.isRecording) {
            if (this.isPaused) {
                statusText.textContent = 'Recording Paused';
                indicator.className = 'status-indicator paused';
                pauseBtn.style.display = 'none';
                resumeBtn.style.display = 'flex';
            } else {
                statusText.textContent = 'Recording';
                indicator.className = 'status-indicator recording';
                pauseBtn.style.display = 'flex';
                resumeBtn.style.display = 'none';
            }

            recordingInfo.style.display = 'block';
            startBtn.style.display = 'none';
            stopBtn.style.display = 'flex';
            progressBar.style.display = 'block';
        } else {
            statusText.textContent = 'Ready to Record';
            indicator.className = 'status-indicator ready';
            recordingInfo.style.display = 'none';
            startBtn.style.display = 'flex';
            pauseBtn.style.display = 'none';
            resumeBtn.style.display = 'none';
            stopBtn.style.display = 'none';
            progressBar.style.display = 'none';
        }

        // Update recording info
        if (this.isRecording) {
            document.getElementById('recording-duration').textContent = this.formatDuration(this.recordingDuration);
            document.getElementById('recording-quality').textContent = this.currentQuality.charAt(0).toUpperCase() + this.currentQuality.slice(1);
            document.getElementById('recording-format').textContent = this.currentFormat.toUpperCase();
            document.getElementById('recording-size').textContent = this.formatFileSize(this.getRecordingSize());
        }
    }

    /**
     * Update live editing UI
     */
    updateLiveEditingUI() {
        const editingBtn = document.getElementById('live-editing-btn');
        const editingIndicator = document.getElementById('live-editing-indicator');

        if (this.editingMode) {
            editingBtn?.classList.add('active');
            editingIndicator.style.display = 'flex';
        } else {
            editingBtn?.classList.remove('active');
            editingIndicator.style.display = 'none';
        }
    }

    /**
     * Start duration tracking
     */
    startDurationTracking() {
        this.durationInterval = setInterval(() => {
            if (this.isRecording && !this.isPaused) {
                this.recordingDuration = Date.now() - this.recordingStartTime;
                this.updateRecordingUI();
                this.updateProgressBar();
            }
        }, 100);
    }

    /**
     * Stop duration tracking
     */
    stopDurationTracking() {
        if (this.durationInterval) {
            clearInterval(this.durationInterval);
            this.durationInterval = null;
        }
    }

    /**
     * Update progress bar
     */
    updateProgressBar() {
        const progressFill = document.getElementById('recording-progress-fill');
        const maxDuration = this.options.maxRecordingDuration;

        if (progressFill && maxDuration > 0) {
            const percentage = Math.min((this.recordingDuration / maxDuration) * 100, 100);
            progressFill.style.width = `${percentage}%`;

            // Change color based on remaining time
            if (percentage > 90) {
                progressFill.style.background = '#dc3545'; // Red
            } else if (percentage > 75) {
                progressFill.style.background = '#ffc107'; // Yellow
            } else {
                progressFill.style.background = '#28a745'; // Green
            }
        }
    }

    /**
     * Show/hide UI panels
     */
    showLiveEditingPanel() {
        this.liveEditingPanel.style.display = 'block';
    }

    hideLiveEditingPanel() {
        this.liveEditingPanel.style.display = 'none';
    }

    showTimelineEditor() {
        this.timelineEditor.style.display = 'block';
    }

    hideTimelineEditor() {
        this.timelineEditor.style.display = 'none';
    }

    showEffectsPanel() {
        this.effectsPanel.style.display = 'block';
    }

    hideEffectsPanel() {
        this.effectsPanel.style.display = 'none';
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyDown(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'r':
                    if (e.shiftKey) {
                        e.preventDefault();
                        this.stopRecording();
                    } else {
                        e.preventDefault();
                        this.startRecording();
                    }
                    break;
                case 'p':
                    e.preventDefault();
                    if (this.isRecording) {
                        if (this.isPaused) {
                            this.resumeRecording();
                        } else {
                            this.pauseRecording();
                        }
                    }
                    break;
                case 'e':
                    if (e.shiftKey) {
                        e.preventDefault();
                        this.toggleLiveEditing();
                    }
                    break;
                case 'm':
                    if (this.isRecording) {
                        e.preventDefault();
                        this.addMarker();
                    }
                    break;
                case 's':
                    if (e.shiftKey && this.isRecording) {
                        e.preventDefault();
                        this.splitClip();
                    }
                    break;
            }
        }

        // Space bar for play/pause timeline
        if (e.code === 'Space' && this.editingMode) {
            e.preventDefault();
            this.toggleTimelinePlayback();
        }
    }

    /**
     * Utility methods
     */
    getSupportedMimeType() {
        const types = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=h264,opus',
            'video/webm',
            'video/mp4'
        ];

        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }

        return 'video/webm'; // Fallback
    }

    generateRecordingId() {
        return 'recording_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateMarkerId() {
        return 'marker_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateSplitId() {
        return 'split_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateTransitionId() {
        return 'transition_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    formatDuration(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getRecordingSize() {
        return this.recordedChunks.reduce((total, chunk) => total + chunk.size, 0);
    }

    /**
     * Process recorded data
     */
    async processRecordedData() {
        if (this.recordedChunks.length === 0) {
            console.warn('No recorded data to process');
            return;
        }

        try {
            // Create blob from recorded chunks
            const blob = new Blob(this.recordedChunks, {
                type: this.getSupportedMimeType()
            });

            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `recording_${this.recordingId}_${Date.now()}.${this.currentFormat}`;

            // Auto-download if enabled
            if (this.options.enableAutoSave) {
                link.click();
                this.performanceStats.autoSaves++;
            }

            // Clean up
            URL.revokeObjectURL(url);

            console.log('Recording processed successfully');

        } catch (error) {
            console.error('Failed to process recorded data:', error);
        }
    }

    /**
     * Handle recording error
     */
    handleRecordingError(error) {
        let message = 'Recording error occurred';

        if (error.name === 'NotSupportedError') {
            message = 'Recording format not supported';
        } else if (error.name === 'SecurityError') {
            message = 'Recording permission denied';
        } else if (error.name === 'InvalidStateError') {
            message = 'Invalid recording state';
        }

        // Emit error event
        this.emitRecordingEvent('recording-error', {
            error: error.message,
            type: error.name,
            timestamp: Date.now()
        });

        // Announce to accessibility system
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce(message, 'assertive');
        }

        console.error('Recording error:', message);
    }

    /**
     * Emit recording event
     */
    emitRecordingEvent(eventType, data) {
        const event = new CustomEvent(eventType, {
            detail: {
                ...data,
                recordingSystem: this
            }
        });

        this.container.dispatchEvent(event);
    }

    /**
     * Emit editing event
     */
    emitEditingEvent(eventType, data) {
        const event = new CustomEvent(eventType, {
            detail: {
                ...data,
                editingSystem: this
            }
        });

        this.container.dispatchEvent(event);
    }

    /**
     * Inject recording CSS
     */
    injectRecordingCSS() {
        if (document.getElementById('recording-controls-css')) return;

        const style = document.createElement('style');
        style.id = 'recording-controls-css';
        style.textContent = `
            /* Recording Controls System */
            .recording-controls-panel {
                background: var(--card-dark, #2a2a2a);
                border: 1px solid var(--border-color, #444);
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 20px;
                position: relative;
            }

            .recording-main-controls {
                display: flex;
                align-items: center;
                gap: 20px;
                margin-bottom: 15px;
            }

            .recording-status-group {
                display: flex;
                align-items: center;
                gap: 15px;
                flex: 1;
            }

            .recording-status {
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

            .status-indicator.ready {
                background: #6c757d;
            }

            .status-indicator.recording {
                background: var(--primary-color, #ff0000);
                animation: pulse-recording 1s infinite;
            }

            .status-indicator.paused {
                background: #ffc107;
                animation: pulse-paused 2s infinite;
            }

            @keyframes pulse-recording {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.7; transform: scale(1.1); }
            }

            @keyframes pulse-paused {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }

            .recording-info {
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

            .recording-controls-group {
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

            .control-btn.warning {
                background: #ffc107;
                border-color: #ffc107;
                color: #000;
            }

            .control-btn.danger {
                background: #dc3545;
                border-color: #dc3545;
            }

            .control-btn.active {
                background: var(--primary-color, #ff0000);
                border-color: var(--primary-color, #ff0000);
            }

            .recording-indicators {
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

            .recording-progress-bar {
                width: 100%;
                height: 4px;
                background: var(--input-dark, #3a3a3a);
                border-radius: 2px;
                overflow: hidden;
                margin-top: 15px;
            }

            .progress-fill {
                height: 100%;
                background: #28a745;
                transition: width 0.3s ease;
                border-radius: 2px;
            }

            /* Live Editing Panel */
            .live-editing-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 400px;
                background: var(--card-dark, #2a2a2a);
                border: 1px solid var(--border-color, #444);
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                z-index: 2000;
                max-height: 80vh;
                overflow-y: auto;
            }

            .editing-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px;
                border-bottom: 1px solid var(--border-color, #444);
            }

            .editing-header h4 {
                margin: 0;
                color: var(--primary-color, #ff0000);
                font-size: 1.1rem;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .editing-controls {
                display: flex;
                gap: 8px;
            }

            .edit-btn {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 8px 12px;
                background: var(--input-dark, #3a3a3a);
                border: 1px solid var(--border-color, #444);
                color: var(--text-light, #fff);
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 0.8rem;
            }

            .edit-btn:hover {
                background: var(--primary-color, #ff0000);
                border-color: var(--primary-color, #ff0000);
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

            .editing-content {
                padding: 15px;
            }

            .editing-tracks {
                margin-bottom: 20px;
            }

            .track-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }

            .track-header h5 {
                margin: 0;
                color: var(--text-light, #fff);
                font-size: 0.9rem;
            }

            .track-controls {
                display: flex;
                gap: 5px;
            }

            .track-btn {
                background: var(--input-dark, #3a3a3a);
                border: 1px solid var(--border-color, #444);
                color: var(--text-light, #fff);
                padding: 4px 8px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 0.7rem;
            }

            .track-btn:hover {
                background: var(--primary-color, #ff0000);
                border-color: var(--primary-color, #ff0000);
            }

            .track-content {
                height: 60px;
                background: var(--input-dark, #3a3a3a);
                border: 1px solid var(--border-color, #444);
                border-radius: 6px;
                position: relative;
                overflow: hidden;
            }

            .editing-actions {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr 1fr;
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

            .action-btn.primary {
                background: var(--primary-color, #ff0000);
                border-color: var(--primary-color, #ff0000);
            }

            /* Timeline Editor */
            .timeline-editor {
                position: fixed;
                bottom: 20px;
                left: 20px;
                right: 20px;
                height: 200px;
                background: var(--card-dark, #2a2a2a);
                border: 1px solid var(--border-color, #444);
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                z-index: 1500;
            }

            .timeline-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 15px;
                border-bottom: 1px solid var(--border-color, #444);
            }

            .timeline-controls {
                display: flex;
                gap: 8px;
            }

            .timeline-btn {
                background: var(--input-dark, #3a3a3a);
                border: 1px solid var(--border-color, #444);
                color: var(--text-light, #fff);
                padding: 6px 10px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 0.8rem;
            }

            .timeline-btn:hover {
                background: var(--primary-color, #ff0000);
                border-color: var(--primary-color, #ff0000);
            }

            .timeline-time-display {
                color: var(--text-light, #fff);
                font-family: monospace;
                font-size: 0.9rem;
            }

            .timeline-playback {
                display: flex;
                gap: 8px;
            }

            .playback-btn {
                background: var(--primary-color, #ff0000);
                border: none;
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .playback-btn:hover {
                background: #cc0000;
            }

            .timeline-content {
                position: relative;
                height: calc(100% - 50px);
                overflow: hidden;
            }

            .timeline-ruler {
                height: 30px;
                background: var(--input-dark, #3a3a3a);
                border-bottom: 1px solid var(--border-color, #444);
                position: relative;
            }

            .timeline-tracks {
                height: calc(100% - 30px);
                overflow-y: auto;
            }

            .timeline-playhead {
                position: absolute;
                top: 0;
                bottom: 0;
                width: 2px;
                background: var(--primary-color, #ff0000);
                z-index: 10;
                pointer-events: none;
            }

            /* Effects Panel */
            .effects-panel {
                position: fixed;
                top: 20px;
                left: 20px;
                width: 350px;
                background: var(--card-dark, #2a2a2a);
                border: 1px solid var(--border-color, #444);
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                z-index: 2000;
                max-height: 80vh;
                overflow-y: auto;
            }

            .effects-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px;
                border-bottom: 1px solid var(--border-color, #444);
            }

            .effects-header h4 {
                margin: 0;
                color: var(--primary-color, #ff0000);
                font-size: 1.1rem;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .effects-content {
                padding: 15px;
            }

            .effects-categories {
                display: flex;
                gap: 8px;
                margin-bottom: 15px;
            }

            .category-btn {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 8px 12px;
                background: var(--input-dark, #3a3a3a);
                border: 1px solid var(--border-color, #444);
                color: var(--text-light, #fff);
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 0.8rem;
                flex: 1;
                justify-content: center;
            }

            .category-btn:hover,
            .category-btn.active {
                background: var(--primary-color, #ff0000);
                border-color: var(--primary-color, #ff0000);
            }

            .effect-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px;
                background: var(--input-dark, #3a3a3a);
                border: 1px solid var(--border-color, #444);
                border-radius: 6px;
                margin-bottom: 10px;
            }

            .effect-preview {
                width: 40px;
                height: 40px;
                background: var(--primary-color, #ff0000);
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 1.2rem;
            }

            .effect-info {
                flex: 1;
            }

            .effect-info h6 {
                margin: 0 0 2px 0;
                color: var(--text-light, #fff);
                font-size: 0.9rem;
            }

            .effect-info p {
                margin: 0;
                color: var(--text-muted, #aaa);
                font-size: 0.7rem;
            }

            .effect-controls {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .effect-slider {
                width: 80px;
            }

            .effect-value {
                color: var(--text-light, #fff);
                font-size: 0.8rem;
                min-width: 40px;
                text-align: right;
            }

            /* Responsive Design */
            @media (max-width: 768px) {
                .recording-main-controls {
                    flex-direction: column;
                    gap: 15px;
                }

                .recording-controls-group {
                    flex-wrap: wrap;
                    justify-content: center;
                }

                .live-editing-panel,
                .effects-panel {
                    position: fixed;
                    top: 10px;
                    left: 10px;
                    right: 10px;
                    width: auto;
                }

                .timeline-editor {
                    left: 10px;
                    right: 10px;
                    bottom: 10px;
                }

                .editing-actions {
                    grid-template-columns: 1fr 1fr;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // Public API Methods

    /**
     * Get recording status
     */
    getRecordingStatus() {
        return {
            isRecording: this.isRecording,
            isPaused: this.isPaused,
            recordingId: this.recordingId,
            duration: this.recordingDuration,
            quality: this.currentQuality,
            format: this.currentFormat,
            size: this.getRecordingSize()
        };
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        return { ...this.performanceStats };
    }

    /**
     * Get editing timeline
     */
    getEditingTimeline() {
        return [...this.editingTimeline];
    }

    /**
     * Get live effects
     */
    getLiveEffects() {
        return new Map(this.liveEffects);
    }

    /**
     * Set recording quality
     */
    setRecordingQuality(quality) {
        if (this.options.qualityPresets[quality]) {
            this.currentQuality = quality;
            console.log(`Recording quality set to ${quality}`);
        }
    }

    /**
     * Set recording format
     */
    setRecordingFormat(format) {
        if (this.options.recordingFormats.includes(format)) {
            this.currentFormat = format;
            console.log(`Recording format set to ${format}`);
        }
    }

    /**
     * Destroy recording system
     */
    destroy() {
        // Stop recording if active
        if (this.isRecording) {
            this.stopRecording();
        }

        // Stop duration tracking
        this.stopDurationTracking();

        // Remove event listeners
        document.removeEventListener('keydown', this.boundEventHandlers.handleKeyDown);

        // Remove UI elements
        if (this.recordingControls) {
            this.recordingControls.remove();
        }
        if (this.liveEditingPanel) {
            this.liveEditingPanel.remove();
        }
        if (this.timelineEditor) {
            this.timelineEditor.remove();
        }
        if (this.effectsPanel) {
            this.effectsPanel.remove();
        }

        // Clear data
        this.recordedChunks = [];
        this.editingTimeline = [];
        this.liveEffects.clear();
        this.transitions = [];

        // Remove CSS
        const style = document.getElementById('recording-controls-css');
        if (style) {
            style.remove();
        }
    }
}
