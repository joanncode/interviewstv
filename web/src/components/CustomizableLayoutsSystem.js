/**
 * Customizable Layouts System
 * Advanced layout management and customization for streaming interface
 */
class CustomizableLayoutsSystem {
    constructor(options = {}) {
        this.container = options.container || document.body;
        this.streamingInterface = options.streamingInterface || null;
        this.accessibilitySystem = options.accessibilitySystem || null;
        this.themeSystem = options.themeSystem || null;
        this.responsiveSystem = options.responsiveSystem || null;
        this.keyboardShortcuts = options.keyboardShortcuts || null;
        
        // Layout system settings
        this.settings = {
            enableCustomLayouts: true,
            enableLayoutAnimations: true,
            enableLayoutPersistence: true,
            enableResponsiveLayouts: true,
            enableLayoutSharing: true,
            defaultTransitionDuration: 300,
            maxCustomLayouts: 20,
            enableLayoutPreview: true,
            enableLayoutTemplates: true,
            enableLayoutValidation: true,
            ...options.settings
        };
        
        // Built-in layouts
        this.builtInLayouts = new Map();
        
        // Custom layouts
        this.customLayouts = new Map();
        
        // Layout templates
        this.layoutTemplates = new Map();
        
        // Current layout state
        this.currentLayout = null;
        this.currentLayoutId = 'spotlight';
        this.layoutHistory = [];
        this.maxHistorySize = 10;
        
        // Layout editor state
        this.isEditing = false;
        this.editingLayout = null;
        this.previewMode = false;
        
        // Layout components
        this.layoutComponents = new Map();
        this.componentConstraints = new Map();
        
        // Animation and transition state
        this.isTransitioning = false;
        this.transitionQueue = [];
        
        // Layout validation
        this.validationRules = new Map();
        
        this.init();
    }
    
    /**
     * Initialize customizable layouts system
     */
    init() {
        this.setupBuiltInLayouts();
        this.setupLayoutTemplates();
        this.setupLayoutComponents();
        this.setupValidationRules();
        this.setupEventListeners();
        this.loadCustomLayouts();
        this.createLayoutEditor();
        this.createLayoutManager();
        this.injectLayoutCSS();
        
        // Set initial layout
        this.setLayout(this.currentLayoutId);
    }
    
    /**
     * Setup built-in layouts
     */
    setupBuiltInLayouts() {
        // Spotlight layout
        this.builtInLayouts.set('spotlight', {
            id: 'spotlight',
            name: 'Spotlight',
            description: 'Focus on main speaker with small participant thumbnails',
            icon: 'fas fa-user-circle',
            type: 'built-in',
            responsive: true,
            components: {
                mainVideo: {
                    position: { x: 0, y: 0, width: 100, height: 100 },
                    zIndex: 1,
                    visible: true,
                    resizable: false,
                    movable: false
                },
                participantGrid: {
                    position: { x: 85, y: 5, width: 12, height: 25 },
                    zIndex: 2,
                    visible: true,
                    resizable: true,
                    movable: true,
                    maxParticipants: 6
                },
                chat: {
                    position: { x: 75, y: 0, width: 25, height: 100 },
                    zIndex: 3,
                    visible: false,
                    resizable: true,
                    movable: true,
                    collapsible: true
                },
                controls: {
                    position: { x: 0, y: 90, width: 100, height: 10 },
                    zIndex: 4,
                    visible: true,
                    resizable: false,
                    movable: false,
                    autoHide: true
                }
            },
            breakpoints: {
                mobile: { maxWidth: 768 },
                tablet: { maxWidth: 1024 },
                desktop: { minWidth: 1025 }
            },
            responsiveOverrides: {
                mobile: {
                    participantGrid: { visible: false },
                    chat: { position: { x: 0, y: 70, width: 100, height: 30 } }
                },
                tablet: {
                    participantGrid: { position: { x: 80, y: 5, width: 18, height: 30 } }
                }
            }
        });
        
        // Grid layout
        this.builtInLayouts.set('grid', {
            id: 'grid',
            name: 'Grid View',
            description: 'Equal-sized video tiles for all participants',
            icon: 'fas fa-th',
            type: 'built-in',
            responsive: true,
            components: {
                participantGrid: {
                    position: { x: 0, y: 0, width: 75, height: 100 },
                    zIndex: 1,
                    visible: true,
                    resizable: true,
                    movable: false,
                    gridMode: 'auto',
                    maxParticipants: 25
                },
                chat: {
                    position: { x: 75, y: 0, width: 25, height: 100 },
                    zIndex: 2,
                    visible: true,
                    resizable: true,
                    movable: true,
                    collapsible: true
                },
                controls: {
                    position: { x: 0, y: 90, width: 75, height: 10 },
                    zIndex: 3,
                    visible: true,
                    resizable: false,
                    movable: false,
                    autoHide: true
                }
            },
            responsiveOverrides: {
                mobile: {
                    participantGrid: { position: { x: 0, y: 0, width: 100, height: 70 } },
                    chat: { position: { x: 0, y: 70, width: 100, height: 30 } }
                }
            }
        });
        
        // Sidebar layout
        this.builtInLayouts.set('sidebar', {
            id: 'sidebar',
            name: 'Sidebar',
            description: 'Main video with vertical participant sidebar',
            icon: 'fas fa-columns',
            type: 'built-in',
            responsive: true,
            components: {
                mainVideo: {
                    position: { x: 0, y: 0, width: 70, height: 100 },
                    zIndex: 1,
                    visible: true,
                    resizable: true,
                    movable: false
                },
                participantSidebar: {
                    position: { x: 70, y: 0, width: 15, height: 100 },
                    zIndex: 2,
                    visible: true,
                    resizable: true,
                    movable: true,
                    orientation: 'vertical'
                },
                chat: {
                    position: { x: 85, y: 0, width: 15, height: 100 },
                    zIndex: 3,
                    visible: true,
                    resizable: true,
                    movable: true,
                    collapsible: true
                },
                controls: {
                    position: { x: 0, y: 90, width: 70, height: 10 },
                    zIndex: 4,
                    visible: true,
                    resizable: false,
                    movable: false,
                    autoHide: true
                }
            },
            responsiveOverrides: {
                mobile: {
                    mainVideo: { position: { x: 0, y: 0, width: 100, height: 60 } },
                    participantSidebar: { position: { x: 0, y: 60, width: 100, height: 15 }, orientation: 'horizontal' },
                    chat: { position: { x: 0, y: 75, width: 100, height: 25 } }
                }
            }
        });
        
        // Presentation layout
        this.builtInLayouts.set('presentation', {
            id: 'presentation',
            name: 'Presentation',
            description: 'Large content area with minimal participant view',
            icon: 'fas fa-desktop',
            type: 'built-in',
            responsive: true,
            components: {
                presentationArea: {
                    position: { x: 0, y: 0, width: 85, height: 100 },
                    zIndex: 1,
                    visible: true,
                    resizable: true,
                    movable: false
                },
                presenterVideo: {
                    position: { x: 85, y: 0, width: 15, height: 25 },
                    zIndex: 2,
                    visible: true,
                    resizable: true,
                    movable: true
                },
                participantStrip: {
                    position: { x: 85, y: 25, width: 15, height: 50 },
                    zIndex: 2,
                    visible: true,
                    resizable: true,
                    movable: true,
                    orientation: 'vertical'
                },
                chat: {
                    position: { x: 85, y: 75, width: 15, height: 25 },
                    zIndex: 3,
                    visible: false,
                    resizable: true,
                    movable: true,
                    collapsible: true
                },
                controls: {
                    position: { x: 0, y: 90, width: 85, height: 10 },
                    zIndex: 4,
                    visible: true,
                    resizable: false,
                    movable: false,
                    autoHide: true
                }
            },
            responsiveOverrides: {
                mobile: {
                    presentationArea: { position: { x: 0, y: 0, width: 100, height: 70 } },
                    presenterVideo: { position: { x: 75, y: 5, width: 20, height: 15 } },
                    participantStrip: { position: { x: 0, y: 70, width: 100, height: 15 }, orientation: 'horizontal' },
                    chat: { position: { x: 0, y: 85, width: 100, height: 15 } }
                }
            }
        });
    }

    /**
     * Setup layout components
     */
    setupLayoutComponents() {
        // Main video component
        this.layoutComponents.set('mainVideo', {
            type: 'video',
            name: 'Main Video',
            description: 'Primary video stream display',
            defaultSize: { width: 100, height: 100 },
            minSize: { width: 30, height: 30 },
            maxSize: { width: 100, height: 100 },
            aspectRatio: '16:9',
            resizable: true,
            movable: true,
            properties: ['volume', 'mute', 'fullscreen', 'pip']
        });

        // Participant grid component
        this.layoutComponents.set('participantGrid', {
            type: 'grid',
            name: 'Participant Grid',
            description: 'Grid of participant video streams',
            defaultSize: { width: 50, height: 50 },
            minSize: { width: 20, height: 20 },
            maxSize: { width: 100, height: 100 },
            aspectRatio: 'auto',
            resizable: true,
            movable: true,
            properties: ['gridSize', 'maxParticipants', 'autoLayout', 'spacing']
        });

        // Chat component
        this.layoutComponents.set('chat', {
            type: 'panel',
            name: 'Chat Panel',
            description: 'Text chat interface',
            defaultSize: { width: 25, height: 100 },
            minSize: { width: 15, height: 30 },
            maxSize: { width: 50, height: 100 },
            aspectRatio: 'flexible',
            resizable: true,
            movable: true,
            collapsible: true,
            properties: ['fontSize', 'autoScroll', 'notifications', 'emojis']
        });

        // Controls component
        this.layoutComponents.set('controls', {
            type: 'toolbar',
            name: 'Control Bar',
            description: 'Media and interface controls',
            defaultSize: { width: 100, height: 10 },
            minSize: { width: 50, height: 8 },
            maxSize: { width: 100, height: 15 },
            aspectRatio: 'flexible',
            resizable: true,
            movable: true,
            properties: ['autoHide', 'position', 'transparency', 'compactMode']
        });

        // Presentation area component
        this.layoutComponents.set('presentationArea', {
            type: 'content',
            name: 'Presentation Area',
            description: 'Screen sharing and presentation content',
            defaultSize: { width: 80, height: 80 },
            minSize: { width: 40, height: 40 },
            maxSize: { width: 100, height: 100 },
            aspectRatio: '16:9',
            resizable: true,
            movable: true,
            properties: ['zoom', 'pan', 'annotations', 'laser']
        });

        // Participant sidebar component
        this.layoutComponents.set('participantSidebar', {
            type: 'sidebar',
            name: 'Participant Sidebar',
            description: 'Vertical list of participant videos',
            defaultSize: { width: 15, height: 100 },
            minSize: { width: 10, height: 50 },
            maxSize: { width: 30, height: 100 },
            aspectRatio: 'flexible',
            resizable: true,
            movable: true,
            properties: ['orientation', 'maxParticipants', 'scrollable', 'spacing']
        });

        // Whiteboard component
        this.layoutComponents.set('whiteboard', {
            type: 'interactive',
            name: 'Whiteboard',
            description: 'Collaborative drawing and annotation tool',
            defaultSize: { width: 60, height: 60 },
            minSize: { width: 30, height: 30 },
            maxSize: { width: 100, height: 100 },
            aspectRatio: '4:3',
            resizable: true,
            movable: true,
            properties: ['tools', 'colors', 'layers', 'collaboration']
        });

        // Notes component
        this.layoutComponents.set('notes', {
            type: 'panel',
            name: 'Notes Panel',
            description: 'Text notes and documentation',
            defaultSize: { width: 25, height: 50 },
            minSize: { width: 15, height: 30 },
            maxSize: { width: 50, height: 100 },
            aspectRatio: 'flexible',
            resizable: true,
            movable: true,
            collapsible: true,
            properties: ['fontSize', 'autoSave', 'sharing', 'formatting']
        });
    }

    /**
     * Setup validation rules
     */
    setupValidationRules() {
        // Component overlap validation
        this.validationRules.set('noOverlap', {
            name: 'No Component Overlap',
            description: 'Components should not overlap significantly',
            severity: 'warning',
            validate: (layout) => {
                const components = Object.values(layout.components);
                const overlaps = [];

                for (let i = 0; i < components.length; i++) {
                    for (let j = i + 1; j < components.length; j++) {
                        const comp1 = components[i];
                        const comp2 = components[j];

                        if (comp1.visible && comp2.visible) {
                            const overlap = this.calculateOverlap(comp1.position, comp2.position);
                            if (overlap > 0.1) { // 10% overlap threshold
                                overlaps.push({
                                    components: [i, j],
                                    overlap: overlap
                                });
                            }
                        }
                    }
                }

                return {
                    valid: overlaps.length === 0,
                    issues: overlaps.map(o => `Components overlap by ${Math.round(o.overlap * 100)}%`)
                };
            }
        });

        // Minimum size validation
        this.validationRules.set('minSize', {
            name: 'Minimum Component Size',
            description: 'Components must meet minimum size requirements',
            severity: 'error',
            validate: (layout) => {
                const issues = [];

                Object.entries(layout.components).forEach(([key, component]) => {
                    const componentDef = this.layoutComponents.get(key);
                    if (componentDef && component.visible) {
                        const { width, height } = component.position;
                        const { minSize } = componentDef;

                        if (width < minSize.width || height < minSize.height) {
                            issues.push(`${componentDef.name} is too small (${width}x${height}, min: ${minSize.width}x${minSize.height})`);
                        }
                    }
                });

                return {
                    valid: issues.length === 0,
                    issues: issues
                };
            }
        });

        // Accessibility validation
        this.validationRules.set('accessibility', {
            name: 'Accessibility Requirements',
            description: 'Layout must be accessible and keyboard navigable',
            severity: 'warning',
            validate: (layout) => {
                const issues = [];

                // Check for essential components
                const hasControls = layout.components.controls && layout.components.controls.visible;
                if (!hasControls) {
                    issues.push('Layout should include visible controls for accessibility');
                }

                // Check component sizes for touch targets
                Object.entries(layout.components).forEach(([key, component]) => {
                    if (component.visible && component.type === 'button') {
                        const { width, height } = component.position;
                        if (width < 5 || height < 5) { // 5% minimum for touch targets
                            issues.push(`${key} may be too small for touch interaction`);
                        }
                    }
                });

                return {
                    valid: issues.length === 0,
                    issues: issues
                };
            }
        });

        // Responsive validation
        this.validationRules.set('responsive', {
            name: 'Responsive Design',
            description: 'Layout should work across different screen sizes',
            severity: 'warning',
            validate: (layout) => {
                const issues = [];

                // Check if layout has responsive overrides
                if (!layout.responsiveOverrides || Object.keys(layout.responsiveOverrides).length === 0) {
                    issues.push('Layout should include responsive overrides for mobile devices');
                }

                // Check component positions for mobile compatibility
                Object.entries(layout.components).forEach(([key, component]) => {
                    if (component.visible) {
                        const { x, y, width, height } = component.position;

                        // Check if component extends beyond viewport
                        if (x + width > 100 || y + height > 100) {
                            issues.push(`${key} extends beyond viewport boundaries`);
                        }

                        // Check for very small components on mobile
                        if (width < 10 && height < 10) {
                            issues.push(`${key} may be too small for mobile devices`);
                        }
                    }
                });

                return {
                    valid: issues.length === 0,
                    issues: issues
                };
            }
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Window resize for responsive layouts
        window.addEventListener('resize', this.handleResize.bind(this));

        // Keyboard shortcuts for layout management
        if (this.keyboardShortcuts) {
            this.registerLayoutShortcuts();
        }

        // Custom events
        this.container.addEventListener('layout-change-request', this.handleLayoutChangeRequest.bind(this));
        this.container.addEventListener('layout-component-update', this.handleComponentUpdate.bind(this));
        this.container.addEventListener('layout-validation-request', this.handleValidationRequest.bind(this));

        // Accessibility events
        document.addEventListener('keydown', this.handleKeyboardNavigation.bind(this));

        // Theme change events
        if (this.themeSystem) {
            this.container.addEventListener('theme-changed', this.handleThemeChange.bind(this));
        }
    }

    /**
     * Register layout-specific keyboard shortcuts
     */
    registerLayoutShortcuts() {
        // Layout switching shortcuts
        this.keyboardShortcuts.addShortcut('Ctrl+l', () => this.showLayoutManager(), 'Show layout manager', 'layout', 'global', 1);
        this.keyboardShortcuts.addShortcut('Ctrl+Shift+l', () => this.toggleLayoutEditor(), 'Toggle layout editor', 'layout', 'global', 1);
        this.keyboardShortcuts.addShortcut('Ctrl+Alt+l', () => this.createNewLayout(), 'Create new layout', 'layout', 'global', 1);

        // Quick layout switching
        this.keyboardShortcuts.addShortcut('Alt+1', () => this.setLayout('spotlight'), 'Switch to spotlight layout', 'layout', 'global', 2);
        this.keyboardShortcuts.addShortcut('Alt+2', () => this.setLayout('grid'), 'Switch to grid layout', 'layout', 'global', 2);
        this.keyboardShortcuts.addShortcut('Alt+3', () => this.setLayout('sidebar'), 'Switch to sidebar layout', 'layout', 'global', 2);
        this.keyboardShortcuts.addShortcut('Alt+4', () => this.setLayout('presentation'), 'Switch to presentation layout', 'layout', 'global', 2);

        // Layout history navigation
        this.keyboardShortcuts.addShortcut('Ctrl+Alt+Left', () => this.previousLayout(), 'Previous layout', 'layout', 'global', 2);
        this.keyboardShortcuts.addShortcut('Ctrl+Alt+Right', () => this.nextLayout(), 'Next layout', 'layout', 'global', 2);

        // Component manipulation (when in edit mode)
        this.keyboardShortcuts.addShortcut('Delete', () => this.deleteSelectedComponent(), 'Delete selected component', 'layout-editor', 'global', 1);
        this.keyboardShortcuts.addShortcut('Ctrl+d', () => this.duplicateSelectedComponent(), 'Duplicate selected component', 'layout-editor', 'global', 1);
        this.keyboardShortcuts.addShortcut('Ctrl+z', () => this.undoLayoutChange(), 'Undo layout change', 'layout-editor', 'global', 1);
        this.keyboardShortcuts.addShortcut('Ctrl+y', () => this.redoLayoutChange(), 'Redo layout change', 'layout-editor', 'global', 1);
    }

    /**
     * Load custom layouts from storage
     */
    loadCustomLayouts() {
        try {
            const saved = localStorage.getItem('customizable-layouts');
            if (saved) {
                const data = JSON.parse(saved);

                if (data.customLayouts) {
                    data.customLayouts.forEach(layout => {
                        this.customLayouts.set(layout.id, layout);
                    });
                }

                if (data.settings) {
                    Object.assign(this.settings, data.settings);
                }

                if (data.currentLayoutId) {
                    this.currentLayoutId = data.currentLayoutId;
                }
            }
        } catch (error) {
            console.error('Failed to load custom layouts:', error);
        }
    }

    /**
     * Save custom layouts to storage
     */
    saveCustomLayouts() {
        try {
            const data = {
                customLayouts: Array.from(this.customLayouts.values()),
                settings: this.settings,
                currentLayoutId: this.currentLayoutId,
                timestamp: Date.now()
            };

            localStorage.setItem('customizable-layouts', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save custom layouts:', error);
        }
    }

    /**
     * Set current layout
     */
    setLayout(layoutId, options = {}) {
        const layout = this.getLayout(layoutId);
        if (!layout) {
            console.error(`Layout not found: ${layoutId}`);
            return false;
        }

        // Validate layout before applying
        if (this.settings.enableLayoutValidation) {
            const validation = this.validateLayout(layout);
            if (!validation.valid && validation.hasErrors) {
                console.error('Layout validation failed:', validation.issues);
                return false;
            }
        }

        // Add current layout to history
        if (this.currentLayout && this.currentLayoutId !== layoutId) {
            this.addToHistory(this.currentLayoutId);
        }

        const previousLayout = this.currentLayout;
        this.currentLayout = layout;
        this.currentLayoutId = layoutId;

        // Apply layout with animation if enabled
        if (this.settings.enableLayoutAnimations && !options.skipAnimation) {
            this.animateLayoutTransition(previousLayout, layout, options);
        } else {
            this.applyLayoutImmediate(layout);
        }

        // Save current layout
        if (this.settings.enableLayoutPersistence) {
            this.saveCustomLayouts();
        }

        // Notify systems about layout change
        this.notifyLayoutChange(previousLayout, layout);

        return true;
    }

    /**
     * Get layout by ID
     */
    getLayout(layoutId) {
        // Check built-in layouts first
        if (this.builtInLayouts.has(layoutId)) {
            return this.builtInLayouts.get(layoutId);
        }

        // Check custom layouts
        if (this.customLayouts.has(layoutId)) {
            return this.customLayouts.get(layoutId);
        }

        return null;
    }

    /**
     * Create new custom layout
     */
    createNewLayout(template = null) {
        const layoutId = `custom_${Date.now()}`;
        const baseLayout = template ? this.getLayoutTemplate(template) : this.getDefaultLayoutStructure();

        const newLayout = {
            id: layoutId,
            name: `Custom Layout ${this.customLayouts.size + 1}`,
            description: 'User-created custom layout',
            type: 'custom',
            created: Date.now(),
            modified: Date.now(),
            author: 'user',
            version: '1.0.0',
            responsive: true,
            ...baseLayout
        };

        this.customLayouts.set(layoutId, newLayout);
        this.saveCustomLayouts();

        // Open layout editor
        if (this.settings.enableLayoutEditor) {
            this.editLayout(layoutId);
        }

        return layoutId;
    }

    /**
     * Edit existing layout
     */
    editLayout(layoutId) {
        const layout = this.getLayout(layoutId);
        if (!layout) {
            console.error(`Layout not found for editing: ${layoutId}`);
            return false;
        }

        // Only allow editing of custom layouts
        if (layout.type !== 'custom') {
            // Create a copy for editing
            const copyId = this.duplicateLayout(layoutId);
            return this.editLayout(copyId);
        }

        this.isEditing = true;
        this.editingLayout = { ...layout };

        // Switch to layout editor context
        if (this.keyboardShortcuts) {
            this.keyboardShortcuts.setContext('layout-editor');
        }

        // Show layout editor UI
        this.showLayoutEditor(layout);

        return true;
    }

    /**
     * Duplicate layout
     */
    duplicateLayout(layoutId) {
        const originalLayout = this.getLayout(layoutId);
        if (!originalLayout) {
            console.error(`Layout not found for duplication: ${layoutId}`);
            return null;
        }

        const newLayoutId = `custom_${Date.now()}`;
        const duplicatedLayout = {
            ...JSON.parse(JSON.stringify(originalLayout)), // Deep copy
            id: newLayoutId,
            name: `${originalLayout.name} (Copy)`,
            type: 'custom',
            created: Date.now(),
            modified: Date.now(),
            author: 'user',
            version: '1.0.0'
        };

        this.customLayouts.set(newLayoutId, duplicatedLayout);
        this.saveCustomLayouts();

        return newLayoutId;
    }

    /**
     * Delete custom layout
     */
    deleteLayout(layoutId) {
        const layout = this.getLayout(layoutId);
        if (!layout) {
            console.error(`Layout not found for deletion: ${layoutId}`);
            return false;
        }

        // Only allow deletion of custom layouts
        if (layout.type !== 'custom') {
            console.error('Cannot delete built-in layout');
            return false;
        }

        // Switch to different layout if currently active
        if (this.currentLayoutId === layoutId) {
            this.setLayout('spotlight'); // Default fallback
        }

        this.customLayouts.delete(layoutId);
        this.saveCustomLayouts();

        return true;
    }

    /**
     * Validate layout
     */
    validateLayout(layout) {
        const results = {
            valid: true,
            hasErrors: false,
            hasWarnings: false,
            issues: [],
            details: new Map()
        };

        // Run all validation rules
        this.validationRules.forEach((rule, ruleId) => {
            const ruleResult = rule.validate(layout);
            results.details.set(ruleId, ruleResult);

            if (!ruleResult.valid) {
                results.valid = false;

                if (rule.severity === 'error') {
                    results.hasErrors = true;
                } else if (rule.severity === 'warning') {
                    results.hasWarnings = true;
                }

                results.issues.push(...ruleResult.issues.map(issue => ({
                    rule: ruleId,
                    severity: rule.severity,
                    message: issue
                })));
            }
        });

        return results;
    }

    /**
     * Apply layout immediately without animation
     */
    applyLayoutImmediate(layout) {
        if (!layout) return;

        // Get current device type for responsive overrides
        const deviceType = this.getCurrentDeviceType();
        const effectiveLayout = this.applyResponsiveOverrides(layout, deviceType);

        // Apply component positions and properties
        Object.entries(effectiveLayout.components).forEach(([componentId, component]) => {
            this.applyComponentLayout(componentId, component);
        });

        // Update container classes
        this.updateLayoutClasses(layout);

        // Notify accessibility system
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce(`Layout changed to ${layout.name}`, 'polite');
        }
    }

    /**
     * Apply component layout
     */
    applyComponentLayout(componentId, component) {
        const element = this.getComponentElement(componentId);
        if (!element) return;

        const { position, zIndex, visible } = component;

        // Apply position
        element.style.position = 'absolute';
        element.style.left = `${position.x}%`;
        element.style.top = `${position.y}%`;
        element.style.width = `${position.width}%`;
        element.style.height = `${position.height}%`;
        element.style.zIndex = zIndex || 1;

        // Apply visibility
        element.style.display = visible ? '' : 'none';

        // Apply component-specific properties
        this.applyComponentProperties(componentId, component);

        // Update accessibility attributes
        this.updateComponentAccessibility(element, component);
    }

    /**
     * Get component element
     */
    getComponentElement(componentId) {
        // Map component IDs to actual DOM elements
        const elementMap = {
            mainVideo: this.container.querySelector('.main-video-container, #main-video'),
            participantGrid: this.container.querySelector('.secondary-videos, #participant-grid'),
            chat: this.container.querySelector('.chat-container, #chat-panel'),
            controls: this.container.querySelector('.control-bar, #controls'),
            presentationArea: this.container.querySelector('.presentation-area, #presentation'),
            participantSidebar: this.container.querySelector('.participant-sidebar, #participants'),
            whiteboard: this.container.querySelector('.whiteboard-container, #whiteboard'),
            notes: this.container.querySelector('.notes-panel, #notes')
        };

        return elementMap[componentId] || this.container.querySelector(`#${componentId}, .${componentId}`);
    }

    /**
     * Apply component properties
     */
    applyComponentProperties(componentId, component) {
        const element = this.getComponentElement(componentId);
        if (!element) return;

        const componentDef = this.layoutComponents.get(componentId);
        if (!componentDef || !component.properties) return;

        // Apply component-specific properties
        Object.entries(component.properties || {}).forEach(([property, value]) => {
            switch (property) {
                case 'autoHide':
                    if (value && componentId === 'controls') {
                        element.classList.add('auto-hide');
                    } else {
                        element.classList.remove('auto-hide');
                    }
                    break;

                case 'collapsible':
                    if (value) {
                        element.classList.add('collapsible');
                        this.addCollapseButton(element);
                    }
                    break;

                case 'orientation':
                    element.classList.remove('horizontal', 'vertical');
                    element.classList.add(value);
                    break;

                case 'gridMode':
                    if (componentId === 'participantGrid') {
                        element.setAttribute('data-grid-mode', value);
                    }
                    break;

                case 'maxParticipants':
                    element.setAttribute('data-max-participants', value);
                    break;

                case 'fontSize':
                    element.style.fontSize = `${value}px`;
                    break;

                case 'transparency':
                    element.style.opacity = value;
                    break;
            }
        });
    }

    /**
     * Update component accessibility
     */
    updateComponentAccessibility(element, component) {
        // Add ARIA labels and roles
        const componentDef = this.layoutComponents.get(component.type);
        if (componentDef) {
            element.setAttribute('aria-label', componentDef.name);

            // Set appropriate ARIA role
            switch (componentDef.type) {
                case 'video':
                    element.setAttribute('role', 'img');
                    element.setAttribute('aria-label', 'Video stream');
                    break;
                case 'panel':
                    element.setAttribute('role', 'complementary');
                    break;
                case 'toolbar':
                    element.setAttribute('role', 'toolbar');
                    break;
                case 'grid':
                    element.setAttribute('role', 'grid');
                    break;
            }
        }

        // Update tabindex for keyboard navigation
        if (component.visible) {
            element.setAttribute('tabindex', '0');
        } else {
            element.removeAttribute('tabindex');
        }
    }

    /**
     * Animate layout transition
     */
    animateLayoutTransition(fromLayout, toLayout, options = {}) {
        if (this.isTransitioning) {
            this.transitionQueue.push({ fromLayout, toLayout, options });
            return;
        }

        this.isTransitioning = true;
        const duration = options.duration || this.settings.defaultTransitionDuration;

        // Create transition plan
        const transitionPlan = this.createTransitionPlan(fromLayout, toLayout);

        // Execute transition
        this.executeTransition(transitionPlan, duration).then(() => {
            this.isTransitioning = false;

            // Process queued transitions
            if (this.transitionQueue.length > 0) {
                const next = this.transitionQueue.shift();
                this.animateLayoutTransition(next.fromLayout, next.toLayout, next.options);
            }
        });
    }

    /**
     * Create transition plan
     */
    createTransitionPlan(fromLayout, toLayout) {
        const plan = {
            fadeOut: [],
            move: [],
            resize: [],
            fadeIn: []
        };

        if (!fromLayout || !toLayout) {
            return plan;
        }

        const fromComponents = fromLayout.components || {};
        const toComponents = toLayout.components || {};

        // Analyze component changes
        Object.keys({ ...fromComponents, ...toComponents }).forEach(componentId => {
            const fromComp = fromComponents[componentId];
            const toComp = toComponents[componentId];

            if (!fromComp && toComp && toComp.visible) {
                // Component appears
                plan.fadeIn.push({ componentId, component: toComp });
            } else if (fromComp && fromComp.visible && (!toComp || !toComp.visible)) {
                // Component disappears
                plan.fadeOut.push({ componentId, component: fromComp });
            } else if (fromComp && toComp && fromComp.visible && toComp.visible) {
                // Component moves/resizes
                const positionChanged = this.hasPositionChanged(fromComp.position, toComp.position);
                if (positionChanged) {
                    plan.move.push({
                        componentId,
                        from: fromComp.position,
                        to: toComp.position
                    });
                }
            }
        });

        return plan;
    }

    /**
     * Execute transition
     */
    async executeTransition(plan, duration) {
        const promises = [];

        // Fade out components
        plan.fadeOut.forEach(({ componentId }) => {
            const element = this.getComponentElement(componentId);
            if (element) {
                promises.push(this.animateElement(element, { opacity: 0 }, duration / 2));
            }
        });

        // Wait for fade out to complete
        await Promise.all(promises);
        promises.length = 0;

        // Move and resize components
        plan.move.forEach(({ componentId, from, to }) => {
            const element = this.getComponentElement(componentId);
            if (element) {
                promises.push(this.animateElement(element, {
                    left: `${to.x}%`,
                    top: `${to.y}%`,
                    width: `${to.width}%`,
                    height: `${to.height}%`
                }, duration));
            }
        });

        // Fade in new components
        plan.fadeIn.forEach(({ componentId, component }) => {
            const element = this.getComponentElement(componentId);
            if (element) {
                // Set initial position
                this.applyComponentLayout(componentId, component);
                element.style.opacity = '0';

                promises.push(this.animateElement(element, { opacity: 1 }, duration / 2));
            }
        });

        // Wait for all animations to complete
        await Promise.all(promises);

        // Apply final layout state
        this.applyLayoutImmediate(this.currentLayout);
    }

    /**
     * Animate element
     */
    animateElement(element, properties, duration) {
        return new Promise((resolve) => {
            const startTime = performance.now();
            const startValues = {};

            // Get initial values
            Object.keys(properties).forEach(prop => {
                const computedStyle = window.getComputedStyle(element);
                startValues[prop] = this.parseStyleValue(computedStyle[prop], prop);
            });

            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easeProgress = this.easeInOutCubic(progress);

                // Apply interpolated values
                Object.entries(properties).forEach(([prop, endValue]) => {
                    const startValue = startValues[prop];
                    const currentValue = this.interpolateValue(startValue, endValue, easeProgress, prop);
                    element.style[prop] = currentValue;
                });

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }

    /**
     * Parse style value
     */
    parseStyleValue(value, property) {
        if (property === 'opacity') {
            return parseFloat(value) || 0;
        }

        if (value.includes('%')) {
            return parseFloat(value);
        }

        if (value.includes('px')) {
            return parseFloat(value);
        }

        return parseFloat(value) || 0;
    }

    /**
     * Interpolate value
     */
    interpolateValue(start, end, progress, property) {
        if (property === 'opacity') {
            return start + (end - start) * progress;
        }

        if (typeof end === 'string' && end.includes('%')) {
            const endNum = parseFloat(end);
            const result = start + (endNum - start) * progress;
            return `${result}%`;
        }

        if (typeof end === 'string' && end.includes('px')) {
            const endNum = parseFloat(end);
            const result = start + (endNum - start) * progress;
            return `${result}px`;
        }

        return start + (end - start) * progress;
    }

    /**
     * Easing function
     */
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }

    /**
     * Check if position changed
     */
    hasPositionChanged(pos1, pos2) {
        if (!pos1 || !pos2) return true;

        return pos1.x !== pos2.x ||
               pos1.y !== pos2.y ||
               pos1.width !== pos2.width ||
               pos1.height !== pos2.height;
    }

    /**
     * Create layout editor UI
     */
    createLayoutEditor() {
        this.layoutEditor = document.createElement('div');
        this.layoutEditor.className = 'layout-editor-modal';
        this.layoutEditor.style.display = 'none';
        this.layoutEditor.innerHTML = `
            <div class="layout-editor-overlay">
                <div class="layout-editor-content">
                    <div class="layout-editor-header">
                        <h2>Layout Editor</h2>
                        <div class="layout-editor-controls">
                            <button class="btn-secondary" id="layout-preview-btn">
                                <i class="fas fa-eye"></i> Preview
                            </button>
                            <button class="btn-secondary" id="layout-validate-btn">
                                <i class="fas fa-check-circle"></i> Validate
                            </button>
                            <button class="btn-primary" id="layout-save-btn">
                                <i class="fas fa-save"></i> Save
                            </button>
                            <button class="btn-close" id="layout-editor-close">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>

                    <div class="layout-editor-body">
                        <div class="layout-editor-sidebar">
                            <div class="layout-properties">
                                <h3>Layout Properties</h3>
                                <div class="form-group">
                                    <label for="layout-name">Name:</label>
                                    <input type="text" id="layout-name" class="form-control">
                                </div>
                                <div class="form-group">
                                    <label for="layout-description">Description:</label>
                                    <textarea id="layout-description" class="form-control" rows="3"></textarea>
                                </div>
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" id="layout-responsive"> Responsive
                                    </label>
                                </div>
                            </div>

                            <div class="component-palette">
                                <h3>Components</h3>
                                <div class="component-list" id="component-palette">
                                    <!-- Components will be populated here -->
                                </div>
                            </div>

                            <div class="component-properties">
                                <h3>Component Properties</h3>
                                <div id="component-properties-panel">
                                    <p class="text-muted">Select a component to edit properties</p>
                                </div>
                            </div>
                        </div>

                        <div class="layout-editor-canvas">
                            <div class="canvas-toolbar">
                                <div class="canvas-tools">
                                    <button class="tool-btn active" data-tool="select" title="Select">
                                        <i class="fas fa-mouse-pointer"></i>
                                    </button>
                                    <button class="tool-btn" data-tool="move" title="Move">
                                        <i class="fas fa-arrows-alt"></i>
                                    </button>
                                    <button class="tool-btn" data-tool="resize" title="Resize">
                                        <i class="fas fa-expand-arrows-alt"></i>
                                    </button>
                                </div>
                                <div class="canvas-options">
                                    <label>
                                        <input type="checkbox" id="show-grid" checked> Grid
                                    </label>
                                    <label>
                                        <input type="checkbox" id="snap-to-grid" checked> Snap
                                    </label>
                                    <select id="canvas-zoom" class="form-control">
                                        <option value="0.5">50%</option>
                                        <option value="0.75">75%</option>
                                        <option value="1" selected>100%</option>
                                        <option value="1.25">125%</option>
                                        <option value="1.5">150%</option>
                                    </select>
                                </div>
                            </div>

                            <div class="canvas-container">
                                <div class="layout-canvas" id="layout-canvas">
                                    <div class="canvas-grid"></div>
                                    <div class="canvas-components" id="canvas-components">
                                        <!-- Layout components will be rendered here -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="layout-editor-footer">
                        <div class="validation-results" id="validation-results"></div>
                        <div class="editor-actions">
                            <button class="btn-secondary" id="layout-cancel-btn">Cancel</button>
                            <button class="btn-primary" id="layout-apply-btn">Apply Layout</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.layoutEditor);
        this.setupLayoutEditorEvents();
    }

    /**
     * Create layout manager UI
     */
    createLayoutManager() {
        this.layoutManager = document.createElement('div');
        this.layoutManager.className = 'layout-manager-modal';
        this.layoutManager.style.display = 'none';
        this.layoutManager.innerHTML = `
            <div class="layout-manager-overlay">
                <div class="layout-manager-content">
                    <div class="layout-manager-header">
                        <h2>Layout Manager</h2>
                        <div class="layout-manager-controls">
                            <button class="btn-primary" id="create-layout-btn">
                                <i class="fas fa-plus"></i> New Layout
                            </button>
                            <button class="btn-secondary" id="import-layout-btn">
                                <i class="fas fa-upload"></i> Import
                            </button>
                            <button class="btn-close" id="layout-manager-close">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>

                    <div class="layout-manager-body">
                        <div class="layout-categories">
                            <div class="category-tabs">
                                <button class="category-tab active" data-category="all">All Layouts</button>
                                <button class="category-tab" data-category="built-in">Built-in</button>
                                <button class="category-tab" data-category="custom">Custom</button>
                                <button class="category-tab" data-category="templates">Templates</button>
                            </div>
                        </div>

                        <div class="layout-grid" id="layout-grid">
                            <!-- Layout cards will be populated here -->
                        </div>
                    </div>

                    <div class="layout-manager-footer">
                        <div class="layout-stats">
                            <span id="layout-count">0 layouts</span>
                        </div>
                        <div class="manager-actions">
                            <button class="btn-secondary" id="layout-manager-cancel">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.layoutManager);
        this.setupLayoutManagerEvents();
    }

    /**
     * Show layout editor
     */
    showLayoutEditor(layout) {
        if (!this.layoutEditor) {
            this.createLayoutEditor();
        }

        this.populateLayoutEditor(layout);
        this.layoutEditor.style.display = 'block';

        // Focus management
        const nameInput = this.layoutEditor.querySelector('#layout-name');
        if (nameInput) {
            nameInput.focus();
        }

        // Announce to screen reader
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce('Layout editor opened', 'polite');
        }
    }

    /**
     * Show layout manager
     */
    showLayoutManager() {
        if (!this.layoutManager) {
            this.createLayoutManager();
        }

        this.populateLayoutManager();
        this.layoutManager.style.display = 'block';

        // Announce to screen reader
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce('Layout manager opened', 'polite');
        }
    }

    /**
     * Apply responsive overrides
     */
    applyResponsiveOverrides(layout, deviceType) {
        if (!layout.responsiveOverrides || !layout.responsiveOverrides[deviceType]) {
            return layout;
        }

        const responsiveLayout = JSON.parse(JSON.stringify(layout)); // Deep copy
        const overrides = layout.responsiveOverrides[deviceType];

        // Apply overrides to components
        Object.entries(overrides).forEach(([componentId, overrideProps]) => {
            if (responsiveLayout.components[componentId]) {
                Object.assign(responsiveLayout.components[componentId], overrideProps);
            }
        });

        return responsiveLayout;
    }

    /**
     * Get current device type
     */
    getCurrentDeviceType() {
        if (this.responsiveSystem) {
            const deviceInfo = this.responsiveSystem.getCurrentDevice();
            return deviceInfo.type;
        }

        // Fallback device detection
        const width = window.innerWidth;
        if (width <= 768) return 'mobile';
        if (width <= 1024) return 'tablet';
        return 'desktop';
    }

    /**
     * Handle window resize
     */
    handleResize() {
        if (this.currentLayout && this.settings.enableResponsiveLayouts) {
            const deviceType = this.getCurrentDeviceType();
            const responsiveLayout = this.applyResponsiveOverrides(this.currentLayout, deviceType);
            this.applyLayoutImmediate(responsiveLayout);
        }
    }

    /**
     * Calculate overlap between two components
     */
    calculateOverlap(pos1, pos2) {
        const left1 = pos1.x;
        const right1 = pos1.x + pos1.width;
        const top1 = pos1.y;
        const bottom1 = pos1.y + pos1.height;

        const left2 = pos2.x;
        const right2 = pos2.x + pos2.width;
        const top2 = pos2.y;
        const bottom2 = pos2.y + pos2.height;

        const overlapWidth = Math.max(0, Math.min(right1, right2) - Math.max(left1, left2));
        const overlapHeight = Math.max(0, Math.min(bottom1, bottom2) - Math.max(top1, top2));
        const overlapArea = overlapWidth * overlapHeight;

        const area1 = pos1.width * pos1.height;
        const area2 = pos2.width * pos2.height;
        const minArea = Math.min(area1, area2);

        return minArea > 0 ? overlapArea / minArea : 0;
    }

    /**
     * Add layout to history
     */
    addToHistory(layoutId) {
        this.layoutHistory.push(layoutId);

        // Limit history size
        if (this.layoutHistory.length > this.maxHistorySize) {
            this.layoutHistory.shift();
        }
    }

    /**
     * Navigate to previous layout
     */
    previousLayout() {
        if (this.layoutHistory.length > 0) {
            const previousLayoutId = this.layoutHistory.pop();
            this.setLayout(previousLayoutId, { skipHistory: true });
            return previousLayoutId;
        }
        return null;
    }

    /**
     * Navigate to next layout (if available)
     */
    nextLayout() {
        // This would require a more complex history system with forward/back
        // For now, cycle through available layouts
        const allLayouts = [...this.builtInLayouts.keys(), ...this.customLayouts.keys()];
        const currentIndex = allLayouts.indexOf(this.currentLayoutId);
        const nextIndex = (currentIndex + 1) % allLayouts.length;

        this.setLayout(allLayouts[nextIndex]);
        return allLayouts[nextIndex];
    }

    /**
     * Get all available layouts
     */
    getAllLayouts() {
        const layouts = new Map();

        // Add built-in layouts
        this.builtInLayouts.forEach((layout, id) => {
            layouts.set(id, layout);
        });

        // Add custom layouts
        this.customLayouts.forEach((layout, id) => {
            layouts.set(id, layout);
        });

        return layouts;
    }

    /**
     * Get layouts by category
     */
    getLayoutsByCategory(category) {
        const layouts = new Map();

        this.getAllLayouts().forEach((layout, id) => {
            if (layout.category === category || layout.type === category) {
                layouts.set(id, layout);
            }
        });

        return layouts;
    }

    /**
     * Export layout
     */
    exportLayout(layoutId) {
        const layout = this.getLayout(layoutId);
        if (!layout) {
            console.error(`Layout not found for export: ${layoutId}`);
            return null;
        }

        return {
            layout: JSON.parse(JSON.stringify(layout)), // Deep copy
            version: '1.0.0',
            exported: Date.now(),
            exportedBy: 'CustomizableLayoutsSystem'
        };
    }

    /**
     * Import layout
     */
    importLayout(data) {
        try {
            if (!data.layout || !data.layout.id) {
                throw new Error('Invalid layout data');
            }

            const layout = data.layout;
            const layoutId = `imported_${Date.now()}`;

            // Update layout metadata
            layout.id = layoutId;
            layout.type = 'custom';
            layout.imported = Date.now();
            layout.name = `${layout.name} (Imported)`;

            // Validate imported layout
            const validation = this.validateLayout(layout);
            if (validation.hasErrors) {
                throw new Error(`Layout validation failed: ${validation.issues.join(', ')}`);
            }

            this.customLayouts.set(layoutId, layout);
            this.saveCustomLayouts();

            return layoutId;
        } catch (error) {
            console.error('Failed to import layout:', error);
            return null;
        }
    }

    /**
     * Get default layout structure
     */
    getDefaultLayoutStructure() {
        return {
            components: {
                mainVideo: {
                    position: { x: 0, y: 0, width: 75, height: 100 },
                    zIndex: 1,
                    visible: true,
                    resizable: true,
                    movable: true
                },
                chat: {
                    position: { x: 75, y: 0, width: 25, height: 100 },
                    zIndex: 2,
                    visible: true,
                    resizable: true,
                    movable: true,
                    collapsible: true
                },
                controls: {
                    position: { x: 0, y: 90, width: 75, height: 10 },
                    zIndex: 3,
                    visible: true,
                    resizable: false,
                    movable: false,
                    properties: { autoHide: true }
                }
            },
            responsive: true,
            responsiveOverrides: {
                mobile: {
                    mainVideo: { position: { x: 0, y: 0, width: 100, height: 70 } },
                    chat: { position: { x: 0, y: 70, width: 100, height: 30 } },
                    controls: { position: { x: 0, y: 90, width: 100, height: 10 } }
                }
            }
        };
    }

    /**
     * Update layout classes
     */
    updateLayoutClasses(layout) {
        // Remove existing layout classes
        this.container.classList.remove(
            'layout-spotlight', 'layout-grid', 'layout-sidebar', 'layout-presentation',
            'layout-custom', 'layout-interview', 'layout-webinar', 'layout-panel'
        );

        // Add current layout class
        this.container.classList.add(`layout-${layout.id}`);

        // Add layout type class
        if (layout.type) {
            this.container.classList.add(`layout-type-${layout.type}`);
        }
    }

    /**
     * Notify layout change
     */
    notifyLayoutChange(previousLayout, newLayout) {
        // Emit custom event
        const event = new CustomEvent('layout-changed', {
            detail: {
                previousLayout,
                newLayout,
                layoutId: newLayout.id,
                timestamp: Date.now()
            }
        });

        this.container.dispatchEvent(event);

        // Notify streaming interface
        if (this.streamingInterface && typeof this.streamingInterface.onLayoutChange === 'function') {
            this.streamingInterface.onLayoutChange(previousLayout, newLayout);
        }

        // Update keyboard shortcuts context
        if (this.keyboardShortcuts) {
            this.keyboardShortcuts.updateContext('layout', newLayout.id);
        }
    }

    /**
     * Handle keyboard navigation
     */
    handleKeyboardNavigation(e) {
        if (!this.isEditing) return;

        // Handle layout editor keyboard shortcuts
        switch (e.key) {
            case 'Escape':
                if (this.layoutEditor && this.layoutEditor.style.display !== 'none') {
                    this.hideLayoutEditor();
                    e.preventDefault();
                }
                break;

            case 'Delete':
                if (this.selectedComponent) {
                    this.deleteSelectedComponent();
                    e.preventDefault();
                }
                break;

            case 'ArrowUp':
            case 'ArrowDown':
            case 'ArrowLeft':
            case 'ArrowRight':
                if (this.selectedComponent && e.ctrlKey) {
                    this.moveSelectedComponent(e.key, e.shiftKey ? 10 : 1);
                    e.preventDefault();
                }
                break;
        }
    }

    /**
     * Handle theme change
     */
    handleThemeChange(e) {
        const { theme } = e.detail;

        // Update layout editor theme
        if (this.layoutEditor) {
            this.layoutEditor.setAttribute('data-theme', theme);
        }

        if (this.layoutManager) {
            this.layoutManager.setAttribute('data-theme', theme);
        }
    }

    /**
     * Inject layout CSS
     */
    injectLayoutCSS() {
        if (document.getElementById('customizable-layouts-css')) return;

        const style = document.createElement('style');
        style.id = 'customizable-layouts-css';
        style.textContent = `
            /* Layout Editor Styles */
            .layout-editor-modal,
            .layout-manager-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .layout-editor-content,
            .layout-manager-content {
                background: var(--bg-dark, #2a2a2a);
                border-radius: 12px;
                width: 90%;
                height: 90%;
                max-width: 1400px;
                max-height: 900px;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            }

            .layout-editor-header,
            .layout-manager-header {
                padding: 20px;
                border-bottom: 1px solid var(--border-color, #444);
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: var(--card-dark, #333);
            }

            .layout-editor-body {
                flex: 1;
                display: flex;
                overflow: hidden;
            }

            .layout-editor-sidebar {
                width: 300px;
                background: var(--bg-dark, #2a2a2a);
                border-right: 1px solid var(--border-color, #444);
                overflow-y: auto;
                padding: 20px;
            }

            .layout-editor-canvas {
                flex: 1;
                display: flex;
                flex-direction: column;
                background: var(--input-dark, #3a3a3a);
            }

            .canvas-toolbar {
                padding: 15px 20px;
                border-bottom: 1px solid var(--border-color, #444);
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: var(--card-dark, #333);
            }

            .canvas-container {
                flex: 1;
                overflow: auto;
                position: relative;
            }

            .layout-canvas {
                position: relative;
                width: 100%;
                height: 100%;
                min-height: 600px;
                background: #1a1a1a;
                background-image:
                    linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
                background-size: 20px 20px;
            }

            .canvas-components {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
            }

            .layout-component {
                position: absolute;
                border: 2px solid transparent;
                background: rgba(255, 0, 0, 0.1);
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 14px;
                font-weight: 500;
            }

            .layout-component:hover {
                border-color: var(--primary-color, #ff0000);
                background: rgba(255, 0, 0, 0.2);
            }

            .layout-component.selected {
                border-color: var(--primary-color, #ff0000);
                box-shadow: 0 0 0 2px rgba(255, 0, 0, 0.3);
            }

            .layout-component .resize-handle {
                position: absolute;
                width: 8px;
                height: 8px;
                background: var(--primary-color, #ff0000);
                border: 1px solid white;
                border-radius: 50%;
            }

            .resize-handle.nw { top: -4px; left: -4px; cursor: nw-resize; }
            .resize-handle.ne { top: -4px; right: -4px; cursor: ne-resize; }
            .resize-handle.sw { bottom: -4px; left: -4px; cursor: sw-resize; }
            .resize-handle.se { bottom: -4px; right: -4px; cursor: se-resize; }

            /* Layout Manager Styles */
            .layout-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 20px;
                padding: 20px;
                overflow-y: auto;
                flex: 1;
            }

            .layout-card {
                background: var(--card-dark, #333);
                border-radius: 8px;
                padding: 20px;
                cursor: pointer;
                transition: all 0.2s ease;
                border: 2px solid transparent;
            }

            .layout-card:hover {
                border-color: var(--primary-color, #ff0000);
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
            }

            .layout-card.active {
                border-color: var(--primary-color, #ff0000);
                background: rgba(255, 0, 0, 0.1);
            }

            .layout-card-header {
                display: flex;
                align-items: center;
                margin-bottom: 10px;
            }

            .layout-card-icon {
                font-size: 24px;
                margin-right: 12px;
                color: var(--primary-color, #ff0000);
            }

            .layout-card-title {
                font-size: 16px;
                font-weight: 600;
                color: white;
            }

            .layout-card-description {
                color: var(--text-muted, #aaa);
                font-size: 14px;
                margin-bottom: 15px;
            }

            .layout-card-actions {
                display: flex;
                gap: 8px;
            }

            .layout-card-actions button {
                padding: 6px 12px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s ease;
            }

            /* Responsive Design */
            @media (max-width: 768px) {
                .layout-editor-content,
                .layout-manager-content {
                    width: 95%;
                    height: 95%;
                }

                .layout-editor-body {
                    flex-direction: column;
                }

                .layout-editor-sidebar {
                    width: 100%;
                    height: 200px;
                    border-right: none;
                    border-bottom: 1px solid var(--border-color, #444);
                }

                .layout-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // Public API methods

    /**
     * Enable customizable layouts
     */
    enable() {
        this.settings.enableCustomLayouts = true;
        this.saveCustomLayouts();
    }

    /**
     * Disable customizable layouts
     */
    disable() {
        this.settings.enableCustomLayouts = false;
        this.saveCustomLayouts();
    }

    /**
     * Check if customizable layouts are enabled
     */
    isEnabled() {
        return this.settings.enableCustomLayouts;
    }

    /**
     * Get current layout
     */
    getCurrentLayout() {
        return this.currentLayout;
    }

    /**
     * Get current layout ID
     */
    getCurrentLayoutId() {
        return this.currentLayoutId;
    }

    /**
     * Get layout statistics
     */
    getLayoutStats() {
        return {
            totalLayouts: this.builtInLayouts.size + this.customLayouts.size,
            builtInLayouts: this.builtInLayouts.size,
            customLayouts: this.customLayouts.size,
            currentLayout: this.currentLayoutId,
            layoutHistory: this.layoutHistory.length,
            isEditing: this.isEditing,
            isTransitioning: this.isTransitioning
        };
    }

    /**
     * Update settings
     */
    updateSettings(newSettings) {
        Object.assign(this.settings, newSettings);
        this.saveCustomLayouts();
    }

    /**
     * Get settings
     */
    getSettings() {
        return { ...this.settings };
    }
}
    
    /**
     * Setup layout templates
     */
    setupLayoutTemplates() {
        // Interview template
        this.layoutTemplates.set('interview', {
            id: 'interview',
            name: 'Interview Template',
            description: 'Optimized for one-on-one interviews',
            category: 'interview',
            components: {
                interviewer: {
                    position: { x: 0, y: 0, width: 50, height: 100 },
                    zIndex: 1,
                    visible: true,
                    label: 'Interviewer'
                },
                interviewee: {
                    position: { x: 50, y: 0, width: 50, height: 100 },
                    zIndex: 1,
                    visible: true,
                    label: 'Interviewee'
                },
                controls: {
                    position: { x: 0, y: 90, width: 100, height: 10 },
                    zIndex: 2,
                    visible: true,
                    autoHide: true
                }
            }
        });
        
        // Webinar template
        this.layoutTemplates.set('webinar', {
            id: 'webinar',
            name: 'Webinar Template',
            description: 'Large presenter view with audience grid',
            category: 'webinar',
            components: {
                presenter: {
                    position: { x: 0, y: 0, width: 70, height: 70 },
                    zIndex: 1,
                    visible: true,
                    label: 'Presenter'
                },
                presentation: {
                    position: { x: 0, y: 70, width: 70, height: 30 },
                    zIndex: 1,
                    visible: false,
                    label: 'Presentation'
                },
                audienceGrid: {
                    position: { x: 70, y: 0, width: 30, height: 100 },
                    zIndex: 1,
                    visible: true,
                    label: 'Audience',
                    maxParticipants: 12
                }
            }
        });
        
        // Panel discussion template
        this.layoutTemplates.set('panel', {
            id: 'panel',
            name: 'Panel Discussion',
            description: 'Equal space for panel participants',
            category: 'discussion',
            components: {
                panelGrid: {
                    position: { x: 0, y: 0, width: 100, height: 80 },
                    zIndex: 1,
                    visible: true,
                    label: 'Panel',
                    gridMode: 'fixed',
                    maxParticipants: 6
                },
                moderator: {
                    position: { x: 35, y: 80, width: 30, height: 20 },
                    zIndex: 2,
                    visible: true,
                    label: 'Moderator'
                }
            }
        });
    }
