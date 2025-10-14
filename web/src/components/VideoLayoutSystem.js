/**
 * Video Layout System
 * Advanced video layout management with grid, spotlight, and custom arrangements
 */
class VideoLayoutSystem {
    constructor(options = {}) {
        this.container = options.container || document.body;
        this.streamingInterface = options.streamingInterface || null;
        this.accessibilitySystem = options.accessibilitySystem || null;
        this.themeSystem = options.themeSystem || null;
        this.responsiveSystem = options.responsiveSystem || null;
        
        // Video layout settings
        this.settings = {
            enabled: true,
            defaultLayout: 'spotlight',
            enableGridLayouts: true,
            enableSpotlightLayouts: true,
            enableCustomLayouts: true,
            maxParticipants: 25,
            gridColumns: 'auto', // 'auto', 1, 2, 3, 4, 5, 6
            gridRows: 'auto', // 'auto', 1, 2, 3, 4, 5
            spotlightSize: 'large', // 'small', 'medium', 'large', 'fullscreen'
            thumbnailSize: 'medium', // 'small', 'medium', 'large'
            enableVideoLabels: true,
            enableVideoControls: true,
            enableDragAndDrop: true,
            enablePinning: true,
            enableFullscreen: true,
            autoLayoutSwitching: true,
            layoutTransitionDuration: 300,
            enableLayoutAnimations: true,
            enableResponsiveLayouts: true,
            enableLayoutPersistence: true,
            ...options.settings
        };
        
        // Layout definitions
        this.layouts = new Map();
        this.currentLayout = null;
        this.currentLayoutId = this.settings.defaultLayout;
        
        // Participant management
        this.participants = new Map();
        this.pinnedParticipant = null;
        this.spotlightParticipant = null;
        
        // Video elements
        this.videoElements = new Map();
        this.videoContainers = new Map();
        
        // Layout state
        this.isTransitioning = false;
        this.layoutHistory = [];
        this.maxHistorySize = 10;
        
        // Drag and drop state
        this.dragState = {
            isDragging: false,
            draggedElement: null,
            dropZones: [],
            originalPosition: null
        };
        
        // Performance monitoring
        this.performanceStats = {
            layoutChanges: 0,
            averageTransitionTime: 0,
            lastLayoutChange: 0,
            renderTime: 0
        };
        
        this.init();
    }
    
    /**
     * Initialize video layout system
     */
    init() {
        this.setupBuiltInLayouts();
        this.createLayoutUI();
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.injectVideoLayoutCSS();
        
        // Set initial layout
        this.setLayout(this.currentLayoutId);
    }
    
    /**
     * Setup built-in layouts
     */
    setupBuiltInLayouts() {
        // Spotlight layouts
        this.layouts.set('spotlight', {
            id: 'spotlight',
            name: 'Spotlight',
            description: 'Focus on main speaker with thumbnail participants',
            type: 'spotlight',
            icon: 'fas fa-user-circle',
            category: 'spotlight',
            builtin: true,
            config: {
                mainVideoSize: 'large',
                thumbnailPosition: 'bottom-right',
                thumbnailSize: 'medium',
                maxThumbnails: 6,
                enablePinning: true,
                enableSpeakerDetection: true
            }
        });
        
        this.layouts.set('spotlight-sidebar', {
            id: 'spotlight-sidebar',
            name: 'Spotlight with Sidebar',
            description: 'Main speaker with vertical thumbnail sidebar',
            type: 'spotlight',
            icon: 'fas fa-columns',
            category: 'spotlight',
            builtin: true,
            config: {
                mainVideoSize: 'large',
                thumbnailPosition: 'right-sidebar',
                thumbnailSize: 'medium',
                maxThumbnails: 8,
                enablePinning: true,
                enableSpeakerDetection: true
            }
        });
        
        this.layouts.set('spotlight-filmstrip', {
            id: 'spotlight-filmstrip',
            name: 'Spotlight with Filmstrip',
            description: 'Main speaker with horizontal filmstrip',
            type: 'spotlight',
            icon: 'fas fa-film',
            category: 'spotlight',
            builtin: true,
            config: {
                mainVideoSize: 'large',
                thumbnailPosition: 'bottom-filmstrip',
                thumbnailSize: 'small',
                maxThumbnails: 10,
                enablePinning: true,
                enableSpeakerDetection: true
            }
        });
        
        // Grid layouts
        this.layouts.set('grid-2x2', {
            id: 'grid-2x2',
            name: '2x2 Grid',
            description: 'Equal-sized 2x2 video grid',
            type: 'grid',
            icon: 'fas fa-th',
            category: 'grid',
            builtin: true,
            config: {
                columns: 2,
                rows: 2,
                maxParticipants: 4,
                aspectRatio: '16:9',
                enableReordering: true,
                enableFullscreen: true
            }
        });
        
        this.layouts.set('grid-3x3', {
            id: 'grid-3x3',
            name: '3x3 Grid',
            description: 'Equal-sized 3x3 video grid',
            type: 'grid',
            icon: 'fas fa-th',
            category: 'grid',
            builtin: true,
            config: {
                columns: 3,
                rows: 3,
                maxParticipants: 9,
                aspectRatio: '16:9',
                enableReordering: true,
                enableFullscreen: true
            }
        });
        
        this.layouts.set('grid-4x4', {
            id: 'grid-4x4',
            name: '4x4 Grid',
            description: 'Equal-sized 4x4 video grid',
            type: 'grid',
            icon: 'fas fa-th',
            category: 'grid',
            builtin: true,
            config: {
                columns: 4,
                rows: 4,
                maxParticipants: 16,
                aspectRatio: '16:9',
                enableReordering: true,
                enableFullscreen: true
            }
        });
        
        this.layouts.set('grid-auto', {
            id: 'grid-auto',
            name: 'Auto Grid',
            description: 'Automatically sized grid based on participant count',
            type: 'grid',
            icon: 'fas fa-th-large',
            category: 'grid',
            builtin: true,
            config: {
                columns: 'auto',
                rows: 'auto',
                maxParticipants: 25,
                aspectRatio: '16:9',
                enableReordering: true,
                enableFullscreen: true,
                autoResize: true
            }
        });
        
        // Presentation layouts
        this.layouts.set('presentation', {
            id: 'presentation',
            name: 'Presentation Mode',
            description: 'Large content area with small participant thumbnails',
            type: 'presentation',
            icon: 'fas fa-desktop',
            category: 'presentation',
            builtin: true,
            config: {
                contentSize: 'large',
                thumbnailPosition: 'top-right',
                thumbnailSize: 'small',
                maxThumbnails: 4,
                enableContentSharing: true,
                enablePresenterSpotlight: true
            }
        });
        
        this.layouts.set('presentation-sidebar', {
            id: 'presentation-sidebar',
            name: 'Presentation with Sidebar',
            description: 'Content sharing with participant sidebar',
            type: 'presentation',
            icon: 'fas fa-chalkboard-teacher',
            category: 'presentation',
            builtin: true,
            config: {
                contentSize: 'large',
                thumbnailPosition: 'right-sidebar',
                thumbnailSize: 'medium',
                maxThumbnails: 6,
                enableContentSharing: true,
                enablePresenterSpotlight: true
            }
        });
        
        // Picture-in-picture layouts
        this.layouts.set('pip-corner', {
            id: 'pip-corner',
            name: 'Picture-in-Picture Corner',
            description: 'Small floating video in corner',
            type: 'pip',
            icon: 'fas fa-external-link-alt',
            category: 'pip',
            builtin: true,
            config: {
                position: 'bottom-right',
                size: 'small',
                draggable: true,
                resizable: true,
                enableMinimize: true
            }
        });
        
        this.layouts.set('pip-overlay', {
            id: 'pip-overlay',
            name: 'Picture-in-Picture Overlay',
            description: 'Floating video overlay with transparency',
            type: 'pip',
            icon: 'fas fa-layer-group',
            category: 'pip',
            builtin: true,
            config: {
                position: 'center',
                size: 'medium',
                draggable: true,
                resizable: true,
                opacity: 0.9,
                enableMinimize: true
            }
        });
    }
    
    /**
     * Create layout UI
     */
    createLayoutUI() {
        // Create layout selector
        this.createLayoutSelector();
        
        // Create layout controls
        this.createLayoutControls();
        
        // Create video containers
        this.createVideoContainers();
    }
    
    /**
     * Create layout selector
     */
    createLayoutSelector() {
        const existingSelector = this.container.querySelector('.video-layout-selector');
        if (existingSelector) {
            existingSelector.remove();
        }
        
        this.layoutSelector = document.createElement('div');
        this.layoutSelector.className = 'video-layout-selector';
        this.layoutSelector.innerHTML = `
            <div class="layout-selector-header">
                <h3><i class="fas fa-th-large"></i> Video Layouts</h3>
                <button class="btn-close" id="layout-selector-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="layout-selector-body">
                <div class="layout-categories">
                    <button class="category-tab active" data-category="all">All</button>
                    <button class="category-tab" data-category="spotlight">Spotlight</button>
                    <button class="category-tab" data-category="grid">Grid</button>
                    <button class="category-tab" data-category="presentation">Presentation</button>
                    <button class="category-tab" data-category="pip">PiP</button>
                </div>
                
                <div class="layouts-grid" id="layouts-grid">
                    <!-- Layout options will be populated here -->
                </div>
                
                <div class="layout-settings">
                    <h4>Layout Settings</h4>
                    
                    <div class="setting-group">
                        <label for="grid-columns">Grid Columns:</label>
                        <select id="grid-columns">
                            <option value="auto">Auto</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5</option>
                            <option value="6">6</option>
                        </select>
                    </div>
                    
                    <div class="setting-group">
                        <label for="thumbnail-size">Thumbnail Size:</label>
                        <select id="thumbnail-size">
                            <option value="small">Small</option>
                            <option value="medium">Medium</option>
                            <option value="large">Large</option>
                        </select>
                    </div>
                    
                    <div class="setting-group">
                        <label>
                            <input type="checkbox" id="enable-animations" checked>
                            Enable Animations
                        </label>
                    </div>
                    
                    <div class="setting-group">
                        <label>
                            <input type="checkbox" id="auto-layout-switching" checked>
                            Auto Layout Switching
                        </label>
                    </div>
                </div>
            </div>
        `;
        
        this.layoutSelector.style.display = 'none';
        document.body.appendChild(this.layoutSelector);
        
        this.setupLayoutSelectorEvents();
        this.populateLayoutsGrid();
    }

    /**
     * Create layout controls
     */
    createLayoutControls() {
        const existingControls = this.container.querySelector('.video-layout-controls');
        if (existingControls) {
            existingControls.remove();
        }

        this.layoutControls = document.createElement('div');
        this.layoutControls.className = 'video-layout-controls';
        this.layoutControls.innerHTML = `
            <div class="layout-quick-controls">
                <button class="layout-btn active" data-layout="spotlight" title="Spotlight View">
                    <i class="fas fa-user-circle"></i>
                    <span>Spotlight</span>
                </button>
                <button class="layout-btn" data-layout="grid-auto" title="Auto Grid">
                    <i class="fas fa-th"></i>
                    <span>Grid</span>
                </button>
                <button class="layout-btn" data-layout="presentation" title="Presentation">
                    <i class="fas fa-desktop"></i>
                    <span>Present</span>
                </button>
                <button class="layout-btn" data-layout="pip-corner" title="Picture-in-Picture">
                    <i class="fas fa-external-link-alt"></i>
                    <span>PiP</span>
                </button>
            </div>

            <div class="layout-actions">
                <button class="action-btn" id="layout-selector-btn" title="More Layouts">
                    <i class="fas fa-th-large"></i>
                </button>
                <button class="action-btn" id="layout-fullscreen-btn" title="Fullscreen">
                    <i class="fas fa-expand"></i>
                </button>
                <button class="action-btn" id="layout-settings-btn" title="Layout Settings">
                    <i class="fas fa-cog"></i>
                </button>
            </div>
        `;

        // Insert into streaming interface
        const controlBar = this.container.querySelector('.control-bar, .additional-controls');
        if (controlBar) {
            controlBar.appendChild(this.layoutControls);
        } else {
            this.container.appendChild(this.layoutControls);
        }

        this.setupLayoutControlsEvents();
    }

    /**
     * Create video containers
     */
    createVideoContainers() {
        const videoArea = this.container.querySelector('.video-area, .main-video-container');
        if (!videoArea) {
            console.warn('Video area not found, creating default container');
            this.createDefaultVideoArea();
            return;
        }

        // Create main video container
        this.mainVideoContainer = videoArea.querySelector('.main-video-container') ||
                                  this.createMainVideoContainer(videoArea);

        // Create secondary videos container
        this.secondaryVideosContainer = videoArea.querySelector('.secondary-videos') ||
                                       this.createSecondaryVideosContainer(videoArea);

        // Create grid container
        this.gridContainer = this.createGridContainer(videoArea);

        // Create pip container
        this.pipContainer = this.createPipContainer();
    }

    /**
     * Create default video area
     */
    createDefaultVideoArea() {
        this.videoArea = document.createElement('div');
        this.videoArea.className = 'video-area';
        this.videoArea.innerHTML = `
            <div class="main-video-container">
                <video class="main-video" autoplay muted playsinline></video>
                <div class="video-overlay">
                    <div class="video-controls">
                        <!-- Video controls will be added here -->
                    </div>
                </div>
            </div>
            <div class="secondary-videos">
                <!-- Secondary videos will be added here -->
            </div>
        `;

        this.container.appendChild(this.videoArea);
        this.createVideoContainers();
    }

    /**
     * Create main video container
     */
    createMainVideoContainer(parent) {
        const container = document.createElement('div');
        container.className = 'main-video-container';
        container.innerHTML = `
            <video class="main-video" autoplay muted playsinline></video>
            <div class="video-overlay">
                <div class="participant-info">
                    <span class="participant-name">You</span>
                    <div class="participant-controls">
                        <button class="participant-control-btn" data-action="pin" title="Pin Video">
                            <i class="fas fa-thumbtack"></i>
                        </button>
                        <button class="participant-control-btn" data-action="fullscreen" title="Fullscreen">
                            <i class="fas fa-expand"></i>
                        </button>
                    </div>
                </div>
                <div class="video-stats" style="display: none;">
                    <div class="stat-item">
                        <span class="stat-label">Resolution:</span>
                        <span class="stat-value" id="main-video-resolution">--</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Bitrate:</span>
                        <span class="stat-value" id="main-video-bitrate">--</span>
                    </div>
                </div>
            </div>
        `;

        parent.appendChild(container);
        return container;
    }

    /**
     * Create secondary videos container
     */
    createSecondaryVideosContainer(parent) {
        const container = document.createElement('div');
        container.className = 'secondary-videos';
        parent.appendChild(container);
        return container;
    }

    /**
     * Create grid container
     */
    createGridContainer(parent) {
        const container = document.createElement('div');
        container.className = 'video-grid-container';
        container.style.display = 'none';
        parent.appendChild(container);
        return container;
    }

    /**
     * Create pip container
     */
    createPipContainer() {
        const container = document.createElement('div');
        container.className = 'pip-container';
        container.style.display = 'none';
        document.body.appendChild(container);
        return container;
    }

    /**
     * Setup layout selector events
     */
    setupLayoutSelectorEvents() {
        // Close button
        this.layoutSelector.querySelector('#layout-selector-close').addEventListener('click', () => {
            this.hideLayoutSelector();
        });

        // Category tabs
        this.layoutSelector.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                this.switchLayoutCategory(category);
            });
        });

        // Settings
        this.layoutSelector.querySelector('#grid-columns').addEventListener('change', (e) => {
            this.settings.gridColumns = e.target.value;
            this.updateCurrentLayout();
        });

        this.layoutSelector.querySelector('#thumbnail-size').addEventListener('change', (e) => {
            this.settings.thumbnailSize = e.target.value;
            this.updateCurrentLayout();
        });

        this.layoutSelector.querySelector('#enable-animations').addEventListener('change', (e) => {
            this.settings.enableLayoutAnimations = e.target.checked;
        });

        this.layoutSelector.querySelector('#auto-layout-switching').addEventListener('change', (e) => {
            this.settings.autoLayoutSwitching = e.target.checked;
        });
    }

    /**
     * Setup layout controls events
     */
    setupLayoutControlsEvents() {
        // Quick layout buttons
        this.layoutControls.querySelectorAll('.layout-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const layoutId = e.currentTarget.dataset.layout;
                this.setLayout(layoutId);
            });
        });

        // Action buttons
        this.layoutControls.querySelector('#layout-selector-btn').addEventListener('click', () => {
            this.showLayoutSelector();
        });

        this.layoutControls.querySelector('#layout-fullscreen-btn').addEventListener('click', () => {
            this.toggleFullscreen();
        });

        this.layoutControls.querySelector('#layout-settings-btn').addEventListener('click', () => {
            this.showLayoutSettings();
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Theme change events
        if (this.themeSystem) {
            this.container.addEventListener('theme-changed', (e) => {
                this.handleThemeChange(e.detail);
            });
        }

        // Responsive events
        if (this.responsiveSystem) {
            this.container.addEventListener('responsive-change', (e) => {
                this.handleResponsiveChange(e.detail);
            });
        }

        // Participant events
        this.container.addEventListener('participant-joined', (e) => {
            this.handleParticipantJoined(e.detail);
        });

        this.container.addEventListener('participant-left', (e) => {
            this.handleParticipantLeft(e.detail);
        });

        this.container.addEventListener('participant-video-changed', (e) => {
            this.handleParticipantVideoChanged(e.detail);
        });
    }

    /**
     * Set layout
     */
    setLayout(layoutId, options = {}) {
        const layout = this.layouts.get(layoutId);
        if (!layout) {
            console.error(`Layout not found: ${layoutId}`);
            return false;
        }

        // Check if already in this layout
        if (this.currentLayoutId === layoutId && !options.force) {
            return true;
        }

        // Store previous layout in history
        if (this.currentLayoutId) {
            this.addToHistory(this.currentLayoutId);
        }

        const previousLayoutId = this.currentLayoutId;
        this.currentLayoutId = layoutId;
        this.currentLayout = layout;

        // Start transition
        this.isTransitioning = true;
        const startTime = performance.now();

        try {
            // Apply layout
            this.applyLayout(layout, options);

            // Update UI
            this.updateLayoutUI();

            // Update performance stats
            const transitionTime = performance.now() - startTime;
            this.updatePerformanceStats(transitionTime);

            // Emit layout change event
            this.emitLayoutChangeEvent(previousLayoutId, layoutId, layout);

            // Announce to accessibility system
            if (this.accessibilitySystem) {
                this.accessibilitySystem.announce(`Layout changed to ${layout.name}`, 'polite');
            }

            return true;

        } catch (error) {
            console.error('Failed to set layout:', error);
            this.currentLayoutId = previousLayoutId;
            this.currentLayout = this.layouts.get(previousLayoutId);
            return false;
        } finally {
            this.isTransitioning = false;
        }
    }

    /**
     * Apply layout
     */
    applyLayout(layout, options = {}) {
        // Hide all containers first
        this.hideAllContainers();

        // Apply layout based on type
        switch (layout.type) {
            case 'spotlight':
                this.applySpotlightLayout(layout, options);
                break;
            case 'grid':
                this.applyGridLayout(layout, options);
                break;
            case 'presentation':
                this.applyPresentationLayout(layout, options);
                break;
            case 'pip':
                this.applyPipLayout(layout, options);
                break;
            default:
                console.warn(`Unknown layout type: ${layout.type}`);
                this.applySpotlightLayout(layout, options);
                break;
        }

        // Apply common layout settings
        this.applyLayoutSettings(layout, options);

        // Update participant positions
        this.updateParticipantPositions();

        // Apply animations if enabled
        if (this.settings.enableLayoutAnimations && !options.skipAnimation) {
            this.animateLayoutTransition(layout);
        }
    }

    /**
     * Apply spotlight layout
     */
    applySpotlightLayout(layout, options = {}) {
        const config = layout.config || {};

        // Show main video container
        this.mainVideoContainer.style.display = 'block';
        this.mainVideoContainer.className = `main-video-container spotlight-main ${config.mainVideoSize || 'large'}`;

        // Show secondary videos container
        this.secondaryVideosContainer.style.display = 'block';
        this.secondaryVideosContainer.className = `secondary-videos spotlight-thumbnails ${config.thumbnailPosition || 'bottom-right'}`;

        // Configure thumbnail size
        this.secondaryVideosContainer.setAttribute('data-thumbnail-size', config.thumbnailSize || 'medium');

        // Set maximum thumbnails
        this.secondaryVideosContainer.setAttribute('data-max-thumbnails', config.maxThumbnails || 6);

        // Configure spotlight participant
        if (this.spotlightParticipant || this.pinnedParticipant) {
            this.setSpotlightParticipant(this.spotlightParticipant || this.pinnedParticipant);
        }

        // Arrange thumbnail participants
        this.arrangeSpotlightThumbnails(config);
    }

    /**
     * Apply grid layout
     */
    applyGridLayout(layout, options = {}) {
        const config = layout.config || {};

        // Hide other containers
        this.mainVideoContainer.style.display = 'none';
        this.secondaryVideosContainer.style.display = 'none';

        // Show grid container
        this.gridContainer.style.display = 'block';
        this.gridContainer.className = 'video-grid-container';

        // Calculate grid dimensions
        const participants = Array.from(this.participants.values());
        const participantCount = Math.min(participants.length, config.maxParticipants || 25);

        let columns, rows;

        if (config.columns === 'auto' || config.rows === 'auto') {
            // Auto-calculate grid dimensions
            const gridDimensions = this.calculateOptimalGridDimensions(participantCount);
            columns = gridDimensions.columns;
            rows = gridDimensions.rows;
        } else {
            columns = config.columns || 3;
            rows = config.rows || 3;
        }

        // Apply grid layout
        this.gridContainer.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
        this.gridContainer.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
        this.gridContainer.setAttribute('data-columns', columns);
        this.gridContainer.setAttribute('data-rows', rows);

        // Clear existing grid items
        this.gridContainer.innerHTML = '';

        // Create grid items for participants
        this.createGridItems(participants.slice(0, participantCount), config);
    }

    /**
     * Apply presentation layout
     */
    applyPresentationLayout(layout, options = {}) {
        const config = layout.config || {};

        // Show main video container for content
        this.mainVideoContainer.style.display = 'block';
        this.mainVideoContainer.className = `main-video-container presentation-content ${config.contentSize || 'large'}`;

        // Show secondary videos for participants
        this.secondaryVideosContainer.style.display = 'block';
        this.secondaryVideosContainer.className = `secondary-videos presentation-participants ${config.thumbnailPosition || 'top-right'}`;

        // Configure thumbnail size
        this.secondaryVideosContainer.setAttribute('data-thumbnail-size', config.thumbnailSize || 'small');
        this.secondaryVideosContainer.setAttribute('data-max-thumbnails', config.maxThumbnails || 4);

        // Setup presentation content
        this.setupPresentationContent(config);

        // Arrange participant thumbnails
        this.arrangePresentationThumbnails(config);
    }

    /**
     * Apply pip layout
     */
    applyPipLayout(layout, options = {}) {
        const config = layout.config || {};

        // Hide main containers
        this.mainVideoContainer.style.display = 'none';
        this.secondaryVideosContainer.style.display = 'none';
        this.gridContainer.style.display = 'none';

        // Show pip container
        this.pipContainer.style.display = 'block';
        this.pipContainer.className = `pip-container ${config.position || 'bottom-right'} ${config.size || 'small'}`;

        // Configure pip properties
        if (config.draggable) {
            this.pipContainer.classList.add('draggable');
        }

        if (config.resizable) {
            this.pipContainer.classList.add('resizable');
        }

        if (config.opacity) {
            this.pipContainer.style.opacity = config.opacity;
        }

        // Setup pip content
        this.setupPipContent(config);
    }

    /**
     * Hide all containers
     */
    hideAllContainers() {
        if (this.mainVideoContainer) {
            this.mainVideoContainer.style.display = 'none';
        }

        if (this.secondaryVideosContainer) {
            this.secondaryVideosContainer.style.display = 'none';
        }

        if (this.gridContainer) {
            this.gridContainer.style.display = 'none';
        }

        if (this.pipContainer) {
            this.pipContainer.style.display = 'none';
        }
    }

    /**
     * Calculate optimal grid dimensions
     */
    calculateOptimalGridDimensions(participantCount) {
        if (participantCount <= 1) return { columns: 1, rows: 1 };
        if (participantCount <= 2) return { columns: 2, rows: 1 };
        if (participantCount <= 4) return { columns: 2, rows: 2 };
        if (participantCount <= 6) return { columns: 3, rows: 2 };
        if (participantCount <= 9) return { columns: 3, rows: 3 };
        if (participantCount <= 12) return { columns: 4, rows: 3 };
        if (participantCount <= 16) return { columns: 4, rows: 4 };
        if (participantCount <= 20) return { columns: 5, rows: 4 };

        // For larger groups, calculate square-ish grid
        const sqrt = Math.sqrt(participantCount);
        const columns = Math.ceil(sqrt);
        const rows = Math.ceil(participantCount / columns);

        return { columns, rows };
    }

    /**
     * Create grid items
     */
    createGridItems(participants, config) {
        participants.forEach((participant, index) => {
            const gridItem = document.createElement('div');
            gridItem.className = 'grid-video-item';
            gridItem.dataset.participantId = participant.id;

            gridItem.innerHTML = `
                <video class="grid-video" autoplay muted playsinline></video>
                <div class="grid-video-overlay">
                    <div class="participant-info">
                        <span class="participant-name">${participant.name || `Participant ${index + 1}`}</span>
                        <div class="participant-controls">
                            <button class="participant-control-btn" data-action="pin" title="Pin Video">
                                <i class="fas fa-thumbtack"></i>
                            </button>
                            <button class="participant-control-btn" data-action="fullscreen" title="Fullscreen">
                                <i class="fas fa-expand"></i>
                            </button>
                            <button class="participant-control-btn" data-action="mute" title="Mute">
                                <i class="fas fa-microphone"></i>
                            </button>
                        </div>
                    </div>
                    <div class="video-quality-indicator">
                        <i class="fas fa-signal"></i>
                    </div>
                </div>
            `;

            // Add event listeners
            this.setupGridItemEvents(gridItem, participant);

            // Add video stream if available
            if (participant.videoElement) {
                const video = gridItem.querySelector('.grid-video');
                video.srcObject = participant.videoElement.srcObject;
            }

            this.gridContainer.appendChild(gridItem);
        });
    }

    /**
     * Setup grid item events
     */
    setupGridItemEvents(gridItem, participant) {
        const controls = gridItem.querySelectorAll('.participant-control-btn');

        controls.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = e.currentTarget.dataset.action;
                this.handleParticipantAction(participant.id, action);
            });
        });

        // Double-click to fullscreen
        gridItem.addEventListener('dblclick', () => {
            this.toggleParticipantFullscreen(participant.id);
        });

        // Right-click context menu
        gridItem.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showParticipantContextMenu(participant.id, e.clientX, e.clientY);
        });
    }

    /**
     * Arrange spotlight thumbnails
     */
    arrangeSpotlightThumbnails(config) {
        const participants = Array.from(this.participants.values());
        const maxThumbnails = config.maxThumbnails || 6;
        const thumbnailParticipants = participants
            .filter(p => p.id !== (this.spotlightParticipant?.id || this.pinnedParticipant?.id))
            .slice(0, maxThumbnails);

        // Clear existing thumbnails
        this.secondaryVideosContainer.innerHTML = '';

        thumbnailParticipants.forEach((participant, index) => {
            const thumbnail = this.createThumbnailVideo(participant, config);
            this.secondaryVideosContainer.appendChild(thumbnail);
        });
    }

    /**
     * Create thumbnail video
     */
    createThumbnailVideo(participant, config) {
        const thumbnail = document.createElement('div');
        thumbnail.className = `secondary-video thumbnail-video ${config.thumbnailSize || 'medium'}`;
        thumbnail.dataset.participantId = participant.id;

        thumbnail.innerHTML = `
            <video class="thumbnail-video-element" autoplay muted playsinline></video>
            <div class="thumbnail-overlay">
                <span class="participant-name">${participant.name || 'Participant'}</span>
                <div class="thumbnail-controls">
                    <button class="thumbnail-control-btn" data-action="spotlight" title="Set as Spotlight">
                        <i class="fas fa-star"></i>
                    </button>
                    <button class="thumbnail-control-btn" data-action="pin" title="Pin Video">
                        <i class="fas fa-thumbtack"></i>
                    </button>
                </div>
                <div class="video-quality-indicator">
                    <i class="fas fa-signal"></i>
                </div>
            </div>
        `;

        // Add event listeners
        this.setupThumbnailEvents(thumbnail, participant);

        // Add video stream if available
        if (participant.videoElement) {
            const video = thumbnail.querySelector('.thumbnail-video-element');
            video.srcObject = participant.videoElement.srcObject;
        }

        return thumbnail;
    }

    /**
     * Setup thumbnail events
     */
    setupThumbnailEvents(thumbnail, participant) {
        const controls = thumbnail.querySelectorAll('.thumbnail-control-btn');

        controls.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = e.currentTarget.dataset.action;
                this.handleParticipantAction(participant.id, action);
            });
        });

        // Click to set as spotlight
        thumbnail.addEventListener('click', () => {
            this.setSpotlightParticipant(participant.id);
        });

        // Double-click to fullscreen
        thumbnail.addEventListener('dblclick', () => {
            this.toggleParticipantFullscreen(participant.id);
        });
    }

    /**
     * Add participant
     */
    addParticipant(participantData) {
        const participant = {
            id: participantData.id,
            name: participantData.name || `Participant ${this.participants.size + 1}`,
            videoElement: participantData.videoElement || null,
            audioElement: participantData.audioElement || null,
            isLocal: participantData.isLocal || false,
            isMuted: participantData.isMuted || false,
            isVideoEnabled: participantData.isVideoEnabled !== false,
            quality: participantData.quality || 'medium',
            joinedAt: Date.now(),
            ...participantData
        };

        this.participants.set(participant.id, participant);

        // Update layout if auto-switching is enabled
        if (this.settings.autoLayoutSwitching) {
            this.autoSwitchLayout();
        } else {
            // Just update current layout
            this.updateCurrentLayout();
        }

        // Emit participant added event
        this.emitParticipantEvent('participant-added', participant);

        // Announce to accessibility system
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce(`${participant.name} joined the call`, 'polite');
        }

        return participant;
    }

    /**
     * Remove participant
     */
    removeParticipant(participantId) {
        const participant = this.participants.get(participantId);
        if (!participant) return false;

        // Remove from participants
        this.participants.delete(participantId);

        // Clear spotlight/pin if this participant was selected
        if (this.spotlightParticipant?.id === participantId) {
            this.spotlightParticipant = null;
        }

        if (this.pinnedParticipant?.id === participantId) {
            this.pinnedParticipant = null;
        }

        // Remove video elements
        this.removeParticipantVideoElements(participantId);

        // Update layout if auto-switching is enabled
        if (this.settings.autoLayoutSwitching) {
            this.autoSwitchLayout();
        } else {
            // Just update current layout
            this.updateCurrentLayout();
        }

        // Emit participant removed event
        this.emitParticipantEvent('participant-removed', participant);

        // Announce to accessibility system
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce(`${participant.name} left the call`, 'polite');
        }

        return true;
    }

    /**
     * Auto switch layout based on participant count
     */
    autoSwitchLayout() {
        const participantCount = this.participants.size;

        let recommendedLayout;

        if (participantCount <= 1) {
            recommendedLayout = 'spotlight';
        } else if (participantCount <= 2) {
            recommendedLayout = 'spotlight-sidebar';
        } else if (participantCount <= 4) {
            recommendedLayout = 'grid-2x2';
        } else if (participantCount <= 9) {
            recommendedLayout = 'grid-3x3';
        } else if (participantCount <= 16) {
            recommendedLayout = 'grid-4x4';
        } else {
            recommendedLayout = 'grid-auto';
        }

        // Only switch if different from current layout
        if (recommendedLayout !== this.currentLayoutId) {
            this.setLayout(recommendedLayout);
        }
    }

    /**
     * Set spotlight participant
     */
    setSpotlightParticipant(participantId) {
        const participant = this.participants.get(participantId);
        if (!participant) return false;

        const previousSpotlight = this.spotlightParticipant;
        this.spotlightParticipant = participant;

        // Update layout if in spotlight mode
        if (this.currentLayout?.type === 'spotlight') {
            this.updateCurrentLayout();
        }

        // Emit spotlight change event
        this.emitSpotlightChangeEvent(previousSpotlight, participant);

        // Announce to accessibility system
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce(`${participant.name} is now in spotlight`, 'polite');
        }

        return true;
    }

    /**
     * Pin participant
     */
    pinParticipant(participantId) {
        const participant = this.participants.get(participantId);
        if (!participant) return false;

        const previousPinned = this.pinnedParticipant;
        this.pinnedParticipant = participant;

        // Update layout
        this.updateCurrentLayout();

        // Emit pin change event
        this.emitPinChangeEvent(previousPinned, participant);

        // Announce to accessibility system
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce(`${participant.name} video pinned`, 'polite');
        }

        return true;
    }

    /**
     * Unpin participant
     */
    unpinParticipant() {
        const previousPinned = this.pinnedParticipant;
        this.pinnedParticipant = null;

        // Update layout
        this.updateCurrentLayout();

        // Emit pin change event
        this.emitPinChangeEvent(previousPinned, null);

        // Announce to accessibility system
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce('Video unpinned', 'polite');
        }

        return true;
    }

    /**
     * Inject video layout CSS
     */
    injectVideoLayoutCSS() {
        if (document.getElementById('video-layout-css')) return;

        const style = document.createElement('style');
        style.id = 'video-layout-css';
        style.textContent = `
            /* Video Layout System */
            .video-layout-controls {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px;
                background: var(--card-dark, #2a2a2a);
                border-radius: 8px;
                border: 1px solid var(--border-color, #444);
            }

            .layout-quick-controls {
                display: flex;
                gap: 5px;
            }

            .layout-btn {
                background: var(--input-dark, #3a3a3a);
                border: 1px solid var(--border-color, #444);
                color: var(--text-light, #fff);
                padding: 8px 12px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 0.9rem;
            }

            .layout-btn:hover,
            .layout-btn.active {
                background: var(--primary-color, #ff0000);
                border-color: var(--primary-color, #ff0000);
            }

            .layout-actions {
                display: flex;
                gap: 5px;
                margin-left: auto;
            }

            .action-btn {
                background: var(--input-dark, #3a3a3a);
                border: 1px solid var(--border-color, #444);
                color: var(--text-light, #fff);
                padding: 8px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .action-btn:hover {
                background: var(--primary-color, #ff0000);
                border-color: var(--primary-color, #ff0000);
            }

            /* Video Grid Container */
            .video-grid-container {
                display: grid;
                gap: 8px;
                padding: 16px;
                height: 100%;
                width: 100%;
            }

            .grid-video-item {
                position: relative;
                background: #000;
                border-radius: 8px;
                overflow: hidden;
                border: 2px solid transparent;
                transition: all 0.2s ease;
                cursor: pointer;
            }

            .grid-video-item:hover {
                border-color: var(--primary-color, #ff0000);
                transform: scale(1.02);
            }

            .grid-video {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .grid-video-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(transparent 60%, rgba(0,0,0,0.8));
                opacity: 0;
                transition: opacity 0.2s ease;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                padding: 8px;
            }

            .grid-video-item:hover .grid-video-overlay {
                opacity: 1;
            }

            .participant-info {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
            }

            .participant-name {
                color: white;
                font-size: 0.8rem;
                font-weight: 500;
                background: rgba(0,0,0,0.8);
                padding: 4px 8px;
                border-radius: 4px;
            }

            .participant-controls {
                display: flex;
                gap: 4px;
            }

            .participant-control-btn {
                background: rgba(0,0,0,0.8);
                border: none;
                color: white;
                padding: 4px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.7rem;
            }

            .participant-control-btn:hover {
                background: var(--primary-color, #ff0000);
            }

            .video-quality-indicator {
                align-self: flex-end;
                color: white;
                font-size: 0.8rem;
            }

            /* Thumbnail Videos */
            .thumbnail-video {
                position: relative;
                background: #000;
                border-radius: 6px;
                overflow: hidden;
                cursor: pointer;
                transition: all 0.2s ease;
                border: 2px solid transparent;
            }

            .thumbnail-video:hover {
                border-color: var(--primary-color, #ff0000);
                transform: scale(1.05);
            }

            .thumbnail-video.small {
                width: 80px;
                height: 60px;
            }

            .thumbnail-video.medium {
                width: 120px;
                height: 90px;
            }

            .thumbnail-video.large {
                width: 160px;
                height: 120px;
            }

            .thumbnail-video-element {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .thumbnail-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(transparent 50%, rgba(0,0,0,0.8));
                opacity: 0;
                transition: opacity 0.2s ease;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                padding: 4px;
            }

            .thumbnail-video:hover .thumbnail-overlay {
                opacity: 1;
            }

            .thumbnail-controls {
                display: flex;
                gap: 2px;
                align-self: flex-end;
            }

            .thumbnail-control-btn {
                background: rgba(0,0,0,0.8);
                border: none;
                color: white;
                padding: 2px;
                border-radius: 2px;
                cursor: pointer;
                transition: all 0.2s ease;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.6rem;
            }

            .thumbnail-control-btn:hover {
                background: var(--primary-color, #ff0000);
            }

            /* Spotlight Layouts */
            .spotlight-thumbnails.bottom-right {
                position: absolute;
                bottom: 16px;
                right: 16px;
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                max-width: 400px;
            }

            .spotlight-thumbnails.right-sidebar {
                position: absolute;
                right: 16px;
                top: 16px;
                bottom: 16px;
                width: 200px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                overflow-y: auto;
            }

            .spotlight-thumbnails.bottom-filmstrip {
                position: absolute;
                bottom: 16px;
                left: 16px;
                right: 16px;
                height: 80px;
                display: flex;
                gap: 8px;
                overflow-x: auto;
            }

            /* PiP Container */
            .pip-container {
                position: fixed;
                z-index: 9999;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                border: 2px solid var(--primary-color, #ff0000);
                cursor: move;
            }

            .pip-container.small {
                width: 200px;
                height: 150px;
            }

            .pip-container.medium {
                width: 300px;
                height: 225px;
            }

            .pip-container.large {
                width: 400px;
                height: 300px;
            }

            .pip-container.bottom-right {
                bottom: 20px;
                right: 20px;
            }

            .pip-container.bottom-left {
                bottom: 20px;
                left: 20px;
            }

            .pip-container.top-right {
                top: 20px;
                right: 20px;
            }

            .pip-container.top-left {
                top: 20px;
                left: 20px;
            }

            .pip-container.center {
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            }

            /* Layout Selector */
            .video-layout-selector {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 600px;
                max-width: 90vw;
                height: 500px;
                max-height: 90vh;
                background: var(--card-dark, #2a2a2a);
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                z-index: 10000;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            .layout-selector-header {
                padding: 20px;
                border-bottom: 1px solid var(--border-color, #444);
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: var(--input-dark, #3a3a3a);
            }

            .layout-selector-header h3 {
                margin: 0;
                color: var(--primary-color, #ff0000);
                font-size: 1.2rem;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .layout-selector-body {
                flex: 1;
                padding: 20px;
                overflow-y: auto;
            }

            .layout-categories {
                display: flex;
                gap: 5px;
                margin-bottom: 20px;
            }

            .category-tab {
                background: transparent;
                border: none;
                color: var(--text-muted, #aaa);
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 0.9rem;
            }

            .category-tab:hover,
            .category-tab.active {
                background: var(--primary-color, #ff0000);
                color: white;
            }

            .layouts-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 15px;
                margin-bottom: 20px;
            }

            .layout-item {
                background: var(--input-dark, #3a3a3a);
                border: 2px solid var(--border-color, #444);
                border-radius: 8px;
                padding: 15px;
                cursor: pointer;
                transition: all 0.2s ease;
                text-align: center;
            }

            .layout-item:hover,
            .layout-item.active {
                border-color: var(--primary-color, #ff0000);
                background: var(--card-dark, #2a2a2a);
            }

            .layout-preview {
                font-size: 2rem;
                color: var(--primary-color, #ff0000);
                margin-bottom: 10px;
            }

            .layout-name {
                font-weight: 600;
                color: var(--text-light, #fff);
                margin-bottom: 5px;
            }

            .layout-description {
                font-size: 0.8rem;
                color: var(--text-muted, #aaa);
                line-height: 1.3;
            }

            .layout-settings {
                border-top: 1px solid var(--border-color, #444);
                padding-top: 15px;
            }

            .layout-settings h4 {
                color: var(--primary-color, #ff0000);
                margin-bottom: 15px;
                font-size: 1rem;
            }

            .setting-group {
                margin-bottom: 15px;
            }

            .setting-group label {
                display: block;
                color: var(--text-light, #fff);
                margin-bottom: 5px;
                font-size: 0.9rem;
            }

            .setting-group select {
                width: 100%;
                background: var(--input-dark, #3a3a3a);
                border: 1px solid var(--border-color, #444);
                color: var(--text-light, #fff);
                padding: 8px;
                border-radius: 4px;
            }

            .setting-group input[type="checkbox"] {
                margin-right: 8px;
            }

            /* Responsive Design */
            @media (max-width: 768px) {
                .video-layout-controls {
                    flex-wrap: wrap;
                    gap: 5px;
                }

                .layout-quick-controls {
                    flex-wrap: wrap;
                }

                .layout-btn span {
                    display: none;
                }

                .video-layout-selector {
                    width: 95vw;
                    height: 80vh;
                }

                .layouts-grid {
                    grid-template-columns: 1fr;
                }

                .spotlight-thumbnails.right-sidebar {
                    display: none;
                }

                .spotlight-thumbnails.bottom-filmstrip {
                    height: 60px;
                }

                .thumbnail-video.medium {
                    width: 100px;
                    height: 75px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // Public API methods

    /**
     * Get current layout
     */
    getCurrentLayout() {
        return {
            id: this.currentLayoutId,
            layout: this.currentLayout,
            participants: Array.from(this.participants.values()),
            spotlightParticipant: this.spotlightParticipant,
            pinnedParticipant: this.pinnedParticipant
        };
    }

    /**
     * Get all layouts
     */
    getAllLayouts() {
        return this.layouts;
    }

    /**
     * Get participants
     */
    getParticipants() {
        return this.participants;
    }

    /**
     * Get performance stats
     */
    getPerformanceStats() {
        return { ...this.performanceStats };
    }

    /**
     * Update settings
     */
    updateSettings(newSettings) {
        Object.assign(this.settings, newSettings);
        this.updateCurrentLayout();
    }

    /**
     * Get settings
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * Destroy video layout system
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('keydown', this.handleKeyboardShortcuts);

        // Remove UI elements
        if (this.layoutControls) {
            this.layoutControls.remove();
        }

        if (this.layoutSelector) {
            this.layoutSelector.remove();
        }

        if (this.pipContainer) {
            this.pipContainer.remove();
        }

        // Clear participants
        this.participants.clear();
        this.videoElements.clear();
        this.videoContainers.clear();

        // Remove CSS
        const style = document.getElementById('video-layout-css');
        if (style) {
            style.remove();
        }
    }

    /**
     * Handle participant action
     */
    handleParticipantAction(participantId, action) {
        switch (action) {
            case 'pin':
                if (this.pinnedParticipant?.id === participantId) {
                    this.unpinParticipant();
                } else {
                    this.pinParticipant(participantId);
                }
                break;
            case 'spotlight':
                this.setSpotlightParticipant(participantId);
                break;
            case 'fullscreen':
                this.toggleParticipantFullscreen(participantId);
                break;
            case 'mute':
                this.toggleParticipantMute(participantId);
                break;
            default:
                console.warn(`Unknown participant action: ${action}`);
                break;
        }
    }

    /**
     * Toggle participant fullscreen
     */
    toggleParticipantFullscreen(participantId) {
        const participant = this.participants.get(participantId);
        if (!participant) return false;

        // Find participant video element
        const videoElement = this.findParticipantVideoElement(participantId);
        if (!videoElement) return false;

        // Toggle fullscreen
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            videoElement.requestFullscreen().catch(err => {
                console.error('Failed to enter fullscreen:', err);
            });
        }

        return true;
    }

    /**
     * Update current layout
     */
    updateCurrentLayout() {
        if (this.currentLayout) {
            this.applyLayout(this.currentLayout, { skipAnimation: true });
        }
    }

    /**
     * Update layout UI
     */
    updateLayoutUI() {
        // Update quick controls
        this.layoutControls?.querySelectorAll('.layout-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.layout === this.currentLayoutId) {
                btn.classList.add('active');
            }
        });

        // Update layout selector
        this.layoutSelector?.querySelectorAll('.layout-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.layoutId === this.currentLayoutId) {
                item.classList.add('active');
            }
        });
    }

    /**
     * Show layout selector
     */
    showLayoutSelector() {
        if (!this.layoutSelector) {
            this.createLayoutSelector();
        }

        this.layoutSelector.style.display = 'block';

        // Focus first layout option
        const firstLayout = this.layoutSelector.querySelector('.layout-item');
        if (firstLayout) {
            firstLayout.focus();
        }

        // Announce to accessibility system
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce('Layout selector opened', 'polite');
        }
    }

    /**
     * Hide layout selector
     */
    hideLayoutSelector() {
        if (this.layoutSelector) {
            this.layoutSelector.style.display = 'none';
        }

        // Announce to accessibility system
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce('Layout selector closed', 'polite');
        }
    }

    /**
     * Populate layouts grid
     */
    populateLayoutsGrid() {
        const grid = this.layoutSelector.querySelector('#layouts-grid');
        if (!grid) return;

        grid.innerHTML = '';

        this.layouts.forEach((layout, id) => {
            const layoutItem = this.createLayoutItem(layout, id);
            grid.appendChild(layoutItem);
        });
    }

    /**
     * Create layout item
     */
    createLayoutItem(layout, id) {
        const item = document.createElement('div');
        item.className = 'layout-item';
        item.dataset.layoutId = id;
        item.dataset.category = layout.category;

        if (id === this.currentLayoutId) {
            item.classList.add('active');
        }

        item.innerHTML = `
            <div class="layout-preview">
                <i class="${layout.icon}"></i>
            </div>
            <div class="layout-info">
                <div class="layout-name">${layout.name}</div>
                <div class="layout-description">${layout.description}</div>
            </div>
        `;

        item.addEventListener('click', () => {
            this.setLayout(id);
            this.hideLayoutSelector();
        });

        return item;
    }

    /**
     * Switch layout category
     */
    switchLayoutCategory(category) {
        // Update active tab
        this.layoutSelector.querySelectorAll('.category-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        this.layoutSelector.querySelector(`[data-category="${category}"]`).classList.add('active');

        // Filter layout items
        this.layoutSelector.querySelectorAll('.layout-item').forEach(item => {
            const itemCategory = item.dataset.category;
            const show = category === 'all' || itemCategory === category;
            item.style.display = show ? 'block' : 'none';
        });
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case '1':
                    e.preventDefault();
                    this.setLayout('spotlight');
                    break;
                case '2':
                    e.preventDefault();
                    this.setLayout('grid-auto');
                    break;
                case '3':
                    e.preventDefault();
                    this.setLayout('presentation');
                    break;
                case '4':
                    e.preventDefault();
                    this.setLayout('pip-corner');
                    break;
                case 'l':
                    e.preventDefault();
                    this.showLayoutSelector();
                    break;
                case 'f':
                    e.preventDefault();
                    this.toggleFullscreen();
                    break;
            }
        }

        // Escape to close layout selector
        if (e.key === 'Escape' && this.layoutSelector?.style.display === 'block') {
            e.preventDefault();
            this.hideLayoutSelector();
        }
    }

    /**
     * Toggle fullscreen
     */
    toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            const videoArea = this.container.querySelector('.video-area');
            if (videoArea) {
                videoArea.requestFullscreen().catch(err => {
                    console.error('Failed to enter fullscreen:', err);
                });
            }
        }
    }

    /**
     * Handle resize
     */
    handleResize() {
        // Update layout for new dimensions
        this.updateCurrentLayout();

        // Update responsive layout if needed
        if (this.settings.enableResponsiveLayouts) {
            this.updateResponsiveLayout();
        }
    }

    /**
     * Update responsive layout
     */
    updateResponsiveLayout() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Switch to mobile-friendly layouts on small screens
        if (width < 768 && this.currentLayout?.type === 'grid') {
            // Switch to spotlight on mobile for better usability
            this.setLayout('spotlight');
        }
    }

    /**
     * Emit layout change event
     */
    emitLayoutChangeEvent(previousLayoutId, newLayoutId, layout) {
        const event = new CustomEvent('video-layout-changed', {
            detail: {
                previousLayoutId,
                newLayoutId,
                layout,
                timestamp: Date.now()
            }
        });

        this.container.dispatchEvent(event);
    }

    /**
     * Emit participant event
     */
    emitParticipantEvent(eventType, participant) {
        const event = new CustomEvent(eventType, {
            detail: {
                participant,
                participantCount: this.participants.size,
                timestamp: Date.now()
            }
        });

        this.container.dispatchEvent(event);
    }

    /**
     * Update performance stats
     */
    updatePerformanceStats(transitionTime) {
        this.performanceStats.layoutChanges++;
        this.performanceStats.averageTransitionTime =
            (this.performanceStats.averageTransitionTime + transitionTime) / 2;
        this.performanceStats.lastLayoutChange = Date.now();
    }

    /**
     * Add to history
     */
    addToHistory(layoutId) {
        this.layoutHistory.unshift(layoutId);

        // Limit history size
        if (this.layoutHistory.length > this.maxHistorySize) {
            this.layoutHistory = this.layoutHistory.slice(0, this.maxHistorySize);
        }
    }

    /**
     * Handle participant joined
     */
    handleParticipantJoined(detail) {
        this.addParticipant(detail.participant || detail);
    }

    /**
     * Handle participant left
     */
    handleParticipantLeft(detail) {
        this.removeParticipant(detail.participantId || detail.id);
    }

    /**
     * Handle participant video changed
     */
    handleParticipantVideoChanged(detail) {
        const participant = this.participants.get(detail.participantId);
        if (participant) {
            participant.videoElement = detail.videoElement;
            participant.isVideoEnabled = detail.isVideoEnabled;
            this.updateCurrentLayout();
        }
    }

    /**
     * Handle theme change
     */
    handleThemeChange(detail) {
        // Update layout UI theme
        if (this.layoutControls) {
            this.layoutControls.setAttribute('data-theme', detail.theme);
        }

        if (this.layoutSelector) {
            this.layoutSelector.setAttribute('data-theme', detail.theme);
        }
    }

    /**
     * Handle responsive change
     */
    handleResponsiveChange(detail) {
        if (detail.device.type === 'mobile' && this.settings.enableResponsiveLayouts) {
            this.updateResponsiveLayout();
        }
    }

    /**
     * Setup drag and drop
     */
    setupDragAndDrop() {
        if (!this.settings.enableDragAndDrop) return;

        // Drag and drop implementation would go here
        // This is a placeholder for future enhancement
    }

    /**
     * Apply layout settings
     */
    applyLayoutSettings(layout, options) {
        // Apply common settings like transitions, animations, etc.
        // This is a placeholder for future enhancement
    }

    /**
     * Update participant positions
     */
    updateParticipantPositions() {
        // Update positions based on current layout
        // This is a placeholder for future enhancement
    }

    /**
     * Animate layout transition
     */
    animateLayoutTransition(layout) {
        if (!this.settings.enableLayoutAnimations) return;

        // Animation implementation would go here
        // This is a placeholder for future enhancement
    }

    /**
     * Setup presentation content
     */
    setupPresentationContent(config) {
        // Setup presentation content area
        // This is a placeholder for future enhancement
    }

    /**
     * Arrange presentation thumbnails
     */
    arrangePresentationThumbnails(config) {
        // Arrange thumbnails for presentation mode
        // This is a placeholder for future enhancement
    }

    /**
     * Setup pip content
     */
    setupPipContent(config) {
        // Setup picture-in-picture content
        // This is a placeholder for future enhancement
    }

    /**
     * Remove participant video elements
     */
    removeParticipantVideoElements(participantId) {
        // Remove video elements for participant
        const elements = document.querySelectorAll(`[data-participant-id="${participantId}"]`);
        elements.forEach(element => element.remove());
    }

    /**
     * Find participant video element
     */
    findParticipantVideoElement(participantId) {
        return document.querySelector(`[data-participant-id="${participantId}"] video`);
    }

    /**
     * Toggle participant mute
     */
    toggleParticipantMute(participantId) {
        const participant = this.participants.get(participantId);
        if (!participant) return false;

        participant.isMuted = !participant.isMuted;

        // Update UI
        const muteBtn = document.querySelector(`[data-participant-id="${participantId}"] [data-action="mute"]`);
        if (muteBtn) {
            const icon = muteBtn.querySelector('i');
            icon.className = participant.isMuted ? 'fas fa-microphone-slash' : 'fas fa-microphone';
        }

        return true;
    }

    /**
     * Show participant context menu
     */
    showParticipantContextMenu(participantId, x, y) {
        // Context menu implementation would go here
        // This is a placeholder for future enhancement
    }

    /**
     * Emit spotlight change event
     */
    emitSpotlightChangeEvent(previousSpotlight, newSpotlight) {
        const event = new CustomEvent('spotlight-changed', {
            detail: {
                previousSpotlight,
                newSpotlight,
                timestamp: Date.now()
            }
        });

        this.container.dispatchEvent(event);
    }

    /**
     * Emit pin change event
     */
    emitPinChangeEvent(previousPinned, newPinned) {
        const event = new CustomEvent('pin-changed', {
            detail: {
                previousPinned,
                newPinned,
                timestamp: Date.now()
            }
        });

        this.container.dispatchEvent(event);
    }

    /**
     * Show layout settings
     */
    showLayoutSettings() {
        // Layout settings implementation would go here
        // This is a placeholder for future enhancement
        this.showLayoutSelector();
    }
}
