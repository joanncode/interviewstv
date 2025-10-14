/**
 * Branding Customization System for Interviews.tv
 * Enterprise-grade white-label branding and customization
 */
class BrandingCustomizationSystem {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            enableLogoCustomization: true,
            enableColorCustomization: true,
            enableFontCustomization: true,
            enableLayoutCustomization: true,
            enableWhiteLabel: true,
            enableBrandPresets: true,
            enableRealTimePreview: true,
            enableExportImport: true,
            maxLogoSize: 5 * 1024 * 1024, // 5MB
            supportedLogoFormats: ['png', 'jpg', 'jpeg', 'svg', 'webp'],
            defaultBrandPreset: 'interviews-tv',
            enableBrandValidation: true,
            enableBrandAnalytics: true,
            themeSystem: null,
            accessibilitySystem: null,
            responsiveSystem: null,
            ...options
        };
        
        // Branding state
        this.currentBrand = null;
        this.brandPresets = new Map();
        this.customBrands = new Map();
        this.brandHistory = [];
        this.isPreviewMode = false;
        this.originalBrand = null;
        
        // Brand elements
        this.logos = {
            primary: null,
            secondary: null,
            favicon: null,
            watermark: null
        };
        
        this.colors = {
            primary: '#FF0000',
            secondary: '#1a1a1a',
            accent: '#ffffff',
            background: '#1a1a1a',
            surface: '#2a2a2a',
            text: '#ffffff',
            textSecondary: '#cccccc',
            border: '#444444',
            success: '#28a745',
            warning: '#ffc107',
            danger: '#dc3545',
            info: '#17a2b8'
        };
        
        this.fonts = {
            primary: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
            secondary: 'Arial, sans-serif',
            monospace: 'Courier New, monospace',
            headings: 'inherit'
        };
        
        this.layout = {
            logoPosition: 'top-left',
            logoSize: 'medium',
            headerStyle: 'modern',
            navigationStyle: 'horizontal',
            cornerRadius: '8px',
            spacing: 'normal',
            shadows: true,
            animations: true
        };
        
        // UI components
        this.brandingPanel = null;
        this.logoUploader = null;
        this.colorPicker = null;
        this.fontSelector = null;
        this.layoutControls = null;
        this.previewArea = null;
        this.presetSelector = null;
        
        // File handling
        this.logoFiles = new Map();
        this.uploadQueue = [];
        this.isUploading = false;
        
        // Event handlers
        this.boundEventHandlers = {
            handleLogoUpload: this.handleLogoUpload.bind(this),
            handleColorChange: this.handleColorChange.bind(this),
            handleFontChange: this.handleFontChange.bind(this),
            handleLayoutChange: this.handleLayoutChange.bind(this),
            handlePresetChange: this.handlePresetChange.bind(this),
            handlePreviewToggle: this.handlePreviewToggle.bind(this),
            handleExport: this.handleExport.bind(this),
            handleImport: this.handleImport.bind(this),
            handleReset: this.handleReset.bind(this)
        };
        
        this.init();
    }
    
    /**
     * Initialize branding customization system
     */
    async init() {
        try {
            console.log('🎨 Initializing Branding Customization System...');
            
            // Load default brand presets
            this.loadDefaultPresets();
            
            // Load saved custom brands
            await this.loadCustomBrands();
            
            // Inject CSS
            this.injectBrandingCSS();
            
            // Create UI components
            this.createBrandingPanel();
            this.createLogoUploader();
            this.createColorPicker();
            this.createFontSelector();
            this.createLayoutControls();
            this.createPreviewArea();
            this.createPresetSelector();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load current brand or default
            await this.loadCurrentBrand();
            
            // Apply initial branding
            this.applyBranding();
            
            console.log('✅ Branding Customization System initialized');
            
            // Emit initialization event
            this.emitBrandingEvent('branding-initialized', {
                currentBrand: this.currentBrand,
                availablePresets: Array.from(this.brandPresets.keys())
            });
            
        } catch (error) {
            console.error('Failed to initialize branding system:', error);
            this.handleInitializationError(error);
        }
    }
    
    /**
     * Load default brand presets
     */
    loadDefaultPresets() {
        // Interviews.tv Default Brand
        this.brandPresets.set('interviews-tv', {
            name: 'Interviews.tv',
            description: 'Default Interviews.tv branding',
            logos: {
                primary: '/assets/logos/interviews-tv-logo.png',
                secondary: '/assets/logos/interviews-tv-logo-white.png',
                favicon: '/assets/logos/favicon.ico'
            },
            colors: {
                primary: '#FF0000',
                secondary: '#1a1a1a',
                accent: '#ffffff',
                background: '#1a1a1a',
                surface: '#2a2a2a',
                text: '#ffffff',
                textSecondary: '#cccccc',
                border: '#444444',
                success: '#28a745',
                warning: '#ffc107',
                danger: '#dc3545',
                info: '#17a2b8'
            },
            fonts: {
                primary: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
                secondary: 'Arial, sans-serif',
                monospace: 'Courier New, monospace',
                headings: 'inherit'
            },
            layout: {
                logoPosition: 'top-left',
                logoSize: 'medium',
                headerStyle: 'modern',
                navigationStyle: 'horizontal',
                cornerRadius: '8px',
                spacing: 'normal',
                shadows: true,
                animations: true
            }
        });
        
        // Professional Blue Theme
        this.brandPresets.set('professional-blue', {
            name: 'Professional Blue',
            description: 'Clean professional blue theme',
            colors: {
                primary: '#0066CC',
                secondary: '#1a1a1a',
                accent: '#ffffff',
                background: '#1a1a1a',
                surface: '#2a2a2a',
                text: '#ffffff',
                textSecondary: '#cccccc',
                border: '#444444',
                success: '#28a745',
                warning: '#ffc107',
                danger: '#dc3545',
                info: '#0066CC'
            },
            fonts: {
                primary: 'Inter, system-ui, sans-serif',
                secondary: 'Arial, sans-serif',
                monospace: 'Fira Code, monospace',
                headings: 'Inter, system-ui, sans-serif'
            },
            layout: {
                logoPosition: 'top-left',
                logoSize: 'medium',
                headerStyle: 'clean',
                navigationStyle: 'horizontal',
                cornerRadius: '6px',
                spacing: 'compact',
                shadows: false,
                animations: true
            }
        });
        
        // Corporate Green Theme
        this.brandPresets.set('corporate-green', {
            name: 'Corporate Green',
            description: 'Professional green corporate theme',
            colors: {
                primary: '#00AA44',
                secondary: '#1a1a1a',
                accent: '#ffffff',
                background: '#1a1a1a',
                surface: '#2a2a2a',
                text: '#ffffff',
                textSecondary: '#cccccc',
                border: '#444444',
                success: '#00AA44',
                warning: '#ffc107',
                danger: '#dc3545',
                info: '#17a2b8'
            },
            fonts: {
                primary: 'Roboto, sans-serif',
                secondary: 'Arial, sans-serif',
                monospace: 'Source Code Pro, monospace',
                headings: 'Roboto, sans-serif'
            },
            layout: {
                logoPosition: 'top-center',
                logoSize: 'large',
                headerStyle: 'corporate',
                navigationStyle: 'horizontal',
                cornerRadius: '4px',
                spacing: 'normal',
                shadows: true,
                animations: false
            }
        });
        
        // Modern Purple Theme
        this.brandPresets.set('modern-purple', {
            name: 'Modern Purple',
            description: 'Modern purple gradient theme',
            colors: {
                primary: '#8B5CF6',
                secondary: '#1a1a1a',
                accent: '#ffffff',
                background: '#1a1a1a',
                surface: '#2a2a2a',
                text: '#ffffff',
                textSecondary: '#cccccc',
                border: '#444444',
                success: '#10B981',
                warning: '#F59E0B',
                danger: '#EF4444',
                info: '#8B5CF6'
            },
            fonts: {
                primary: 'Poppins, sans-serif',
                secondary: 'Arial, sans-serif',
                monospace: 'JetBrains Mono, monospace',
                headings: 'Poppins, sans-serif'
            },
            layout: {
                logoPosition: 'top-left',
                logoSize: 'medium',
                headerStyle: 'modern',
                navigationStyle: 'horizontal',
                cornerRadius: '12px',
                spacing: 'relaxed',
                shadows: true,
                animations: true
            }
        });
        
        console.log(`Loaded ${this.brandPresets.size} default brand presets`);
    }
    
    /**
     * Load custom brands from storage
     */
    async loadCustomBrands() {
        try {
            // Load from localStorage
            const savedBrands = localStorage.getItem('custom_brands');
            if (savedBrands) {
                const brands = JSON.parse(savedBrands);
                Object.entries(brands).forEach(([key, brand]) => {
                    this.customBrands.set(key, brand);
                });
                
                console.log(`Loaded ${this.customBrands.size} custom brands from storage`);
            }
            
            // Load from server if available
            if (this.options.enableServerSync) {
                await this.loadCustomBrandsFromServer();
            }
            
        } catch (error) {
            console.warn('Failed to load custom brands:', error);
        }
    }
    
    /**
     * Load current brand
     */
    async loadCurrentBrand() {
        try {
            // Try to load from localStorage first
            const savedBrand = localStorage.getItem('current_brand');
            if (savedBrand) {
                const brandData = JSON.parse(savedBrand);
                this.currentBrand = brandData;
                console.log('Loaded current brand from storage:', brandData.name);
                return;
            }
            
            // Load from server if available
            if (this.options.enableServerSync) {
                const serverBrand = await this.loadCurrentBrandFromServer();
                if (serverBrand) {
                    this.currentBrand = serverBrand;
                    console.log('Loaded current brand from server:', serverBrand.name);
                    return;
                }
            }
            
            // Fall back to default preset
            const defaultPreset = this.brandPresets.get(this.options.defaultBrandPreset);
            if (defaultPreset) {
                this.currentBrand = { ...defaultPreset, id: 'default' };
                console.log('Using default brand preset:', this.options.defaultBrandPreset);
            }
            
        } catch (error) {
            console.error('Failed to load current brand:', error);
            
            // Emergency fallback
            this.currentBrand = {
                id: 'emergency',
                name: 'Emergency Fallback',
                colors: this.colors,
                fonts: this.fonts,
                layout: this.layout
            };
        }
    }

    /**
     * Set brand preset
     */
    setBrandPreset(presetKey) {
        const preset = this.brandPresets.get(presetKey);
        if (!preset) {
            console.warn(`Brand preset "${presetKey}" not found`);
            return false;
        }

        // Store original brand for preview mode
        if (!this.isPreviewMode) {
            this.originalBrand = { ...this.currentBrand };
        }

        // Apply preset
        this.currentBrand = { ...preset, id: presetKey };
        this.applyBranding();

        // Save if not in preview mode
        if (!this.isPreviewMode) {
            this.saveCurrentBrand();
        }

        // Emit event
        this.emitBrandingEvent('brand-preset-applied', {
            presetKey,
            brand: this.currentBrand
        });

        console.log('Brand preset applied:', presetKey);
        return true;
    }

    /**
     * Update brand colors
     */
    updateBrandColors(colors) {
        if (!this.currentBrand) {
            console.warn('No current brand to update');
            return false;
        }

        // Store original brand for preview mode
        if (!this.isPreviewMode) {
            this.originalBrand = { ...this.currentBrand };
        }

        // Update colors
        this.currentBrand.colors = { ...this.currentBrand.colors, ...colors };
        this.applyColors(this.currentBrand.colors);

        // Save if not in preview mode
        if (!this.isPreviewMode) {
            this.saveCurrentBrand();
        }

        // Emit event
        this.emitBrandingEvent('brand-colors-updated', {
            colors: this.currentBrand.colors
        });

        console.log('Brand colors updated:', Object.keys(colors));
        return true;
    }

    /**
     * Update brand fonts
     */
    updateBrandFonts(fonts) {
        if (!this.currentBrand) {
            console.warn('No current brand to update');
            return false;
        }

        // Store original brand for preview mode
        if (!this.isPreviewMode) {
            this.originalBrand = { ...this.currentBrand };
        }

        // Update fonts
        this.currentBrand.fonts = { ...this.currentBrand.fonts, ...fonts };
        this.applyFonts(this.currentBrand.fonts);

        // Save if not in preview mode
        if (!this.isPreviewMode) {
            this.saveCurrentBrand();
        }

        // Emit event
        this.emitBrandingEvent('brand-fonts-updated', {
            fonts: this.currentBrand.fonts
        });

        console.log('Brand fonts updated:', Object.keys(fonts));
        return true;
    }

    /**
     * Update brand layout
     */
    updateBrandLayout(layout) {
        if (!this.currentBrand) {
            console.warn('No current brand to update');
            return false;
        }

        // Store original brand for preview mode
        if (!this.isPreviewMode) {
            this.originalBrand = { ...this.currentBrand };
        }

        // Update layout
        this.currentBrand.layout = { ...this.currentBrand.layout, ...layout };
        this.applyLayout(this.currentBrand.layout);

        // Save if not in preview mode
        if (!this.isPreviewMode) {
            this.saveCurrentBrand();
        }

        // Emit event
        this.emitBrandingEvent('brand-layout-updated', {
            layout: this.currentBrand.layout
        });

        console.log('Brand layout updated:', Object.keys(layout));
        return true;
    }

    /**
     * Upload logo
     */
    async uploadLogo(file, logoType = 'primary') {
        if (!file) {
            throw new Error('No file provided for logo upload');
        }

        // Validate file
        const validation = this.validateLogoFile(file);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        try {
            this.isUploading = true;

            // Create FormData
            const formData = new FormData();
            formData.append('logo', file);
            formData.append('type', logoType);

            // Upload to server
            const response = await fetch('/api/upload/brand-logo.php', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Upload failed');
            }

            // Update current brand
            if (!this.currentBrand.logos) {
                this.currentBrand.logos = {};
            }

            this.currentBrand.logos[logoType] = result.data.url;

            // Apply logo
            this.applyLogos(this.currentBrand.logos);

            // Save if not in preview mode
            if (!this.isPreviewMode) {
                this.saveCurrentBrand();
            }

            // Emit event
            this.emitBrandingEvent('logo-uploaded', {
                logoType,
                url: result.data.url,
                file: {
                    name: file.name,
                    size: file.size,
                    type: file.type
                }
            });

            console.log('Logo uploaded successfully:', logoType, result.data.url);
            return result.data;

        } catch (error) {
            console.error('Logo upload failed:', error);
            throw error;
        } finally {
            this.isUploading = false;
        }
    }

    /**
     * Validate logo file
     */
    validateLogoFile(file) {
        // Check file size
        if (file.size > this.options.maxLogoSize) {
            return {
                valid: false,
                error: `File size too large. Maximum size is ${this.formatFileSize(this.options.maxLogoSize)}`
            };
        }

        // Check file type
        const extension = file.name.split('.').pop().toLowerCase();
        if (!this.options.supportedLogoFormats.includes(extension)) {
            return {
                valid: false,
                error: `Unsupported file format. Supported formats: ${this.options.supportedLogoFormats.join(', ')}`
            };
        }

        return { valid: true };
    }

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Enter preview mode
     */
    enterPreviewMode() {
        if (this.isPreviewMode) return;

        this.isPreviewMode = true;
        this.originalBrand = { ...this.currentBrand };

        // Add preview indicator
        this.showPreviewIndicator();

        this.emitBrandingEvent('preview-mode-entered', {
            originalBrand: this.originalBrand
        });

        console.log('Entered preview mode');
    }

    /**
     * Exit preview mode
     */
    exitPreviewMode(saveChanges = false) {
        if (!this.isPreviewMode) return;

        if (saveChanges) {
            // Save current changes
            this.saveCurrentBrand();
        } else {
            // Restore original brand
            this.currentBrand = { ...this.originalBrand };
            this.applyBranding();
        }

        this.isPreviewMode = false;
        this.originalBrand = null;

        // Remove preview indicator
        this.hidePreviewIndicator();

        this.emitBrandingEvent('preview-mode-exited', {
            saveChanges,
            currentBrand: this.currentBrand
        });

        console.log('Exited preview mode, changes saved:', saveChanges);
    }

    /**
     * Save current brand
     */
    saveCurrentBrand() {
        if (!this.currentBrand) return;

        try {
            // Save to localStorage
            localStorage.setItem('current_brand', JSON.stringify(this.currentBrand));

            // Save to server if available
            if (this.options.enableServerSync) {
                this.saveCurrentBrandToServer();
            }

            // Add to history
            this.addToHistory(this.currentBrand);

            console.log('Current brand saved:', this.currentBrand.name);

        } catch (error) {
            console.error('Failed to save current brand:', error);
        }
    }

    /**
     * Create branding panel UI
     */
    createBrandingPanel() {
        this.brandingPanel = document.createElement('div');
        this.brandingPanel.className = 'branding-customization-panel';
        this.brandingPanel.innerHTML = `
            <div class="branding-panel-header">
                <h3><i class="fas fa-palette"></i> Brand Customization</h3>
                <button class="close-panel-btn" aria-label="Close branding panel">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="branding-panel-content">
                <div class="branding-tabs">
                    <button class="tab-btn active" data-tab="presets">Presets</button>
                    <button class="tab-btn" data-tab="logos">Logos</button>
                    <button class="tab-btn" data-tab="colors">Colors</button>
                    <button class="tab-btn" data-tab="fonts">Fonts</button>
                    <button class="tab-btn" data-tab="layout">Layout</button>
                </div>
                <div class="branding-tab-content" id="branding-tab-content"></div>
            </div>
            <div class="branding-panel-footer">
                <button class="btn-preview" id="toggle-preview-btn">Preview Mode</button>
                <button class="btn-reset" id="reset-brand-btn">Reset</button>
                <button class="btn-save" id="save-brand-btn">Save</button>
            </div>
        `;

        this.container.appendChild(this.brandingPanel);
    }

    /**
     * Create logo uploader UI
     */
    createLogoUploader() {
        // Logo uploader will be created in the logos tab
        console.log('Logo uploader UI will be created in logos tab');
    }

    /**
     * Create color picker UI
     */
    createColorPicker() {
        // Color picker will be created in the colors tab
        console.log('Color picker UI will be created in colors tab');
    }

    /**
     * Create font selector UI
     */
    createFontSelector() {
        // Font selector will be created in the fonts tab
        console.log('Font selector UI will be created in fonts tab');
    }

    /**
     * Create layout controls UI
     */
    createLayoutControls() {
        // Layout controls will be created in the layout tab
        console.log('Layout controls UI will be created in layout tab');
    }

    /**
     * Create preview area UI
     */
    createPreviewArea() {
        this.previewArea = document.createElement('div');
        this.previewArea.className = 'branding-preview-area';
        this.previewArea.innerHTML = `
            <div class="preview-header">
                <h4>Live Preview</h4>
                <div class="preview-controls">
                    <button class="preview-device-btn active" data-device="desktop">
                        <i class="fas fa-desktop"></i>
                    </button>
                    <button class="preview-device-btn" data-device="tablet">
                        <i class="fas fa-tablet-alt"></i>
                    </button>
                    <button class="preview-device-btn" data-device="mobile">
                        <i class="fas fa-mobile-alt"></i>
                    </button>
                </div>
            </div>
            <div class="preview-content" id="preview-content">
                <div class="preview-mockup">
                    <div class="mockup-header">
                        <div class="mockup-logo">Logo</div>
                        <div class="mockup-nav">
                            <span>Home</span>
                            <span>About</span>
                            <span>Contact</span>
                        </div>
                    </div>
                    <div class="mockup-content">
                        <h1>Welcome to Your Brand</h1>
                        <p>This is a preview of how your branding will look.</p>
                        <button class="mockup-button">Call to Action</button>
                    </div>
                </div>
            </div>
        `;

        this.container.appendChild(this.previewArea);
    }

    /**
     * Create preset selector UI
     */
    createPresetSelector() {
        // Preset selector will be created in the presets tab
        console.log('Preset selector UI will be created in presets tab');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Panel controls
        const closeBtn = this.brandingPanel.querySelector('.close-panel-btn');
        closeBtn?.addEventListener('click', () => this.hideBrandingPanel());

        // Tab navigation
        const tabBtns = this.brandingPanel.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Footer buttons
        const previewBtn = this.brandingPanel.querySelector('#toggle-preview-btn');
        previewBtn?.addEventListener('click', () => this.togglePreviewMode());

        const resetBtn = this.brandingPanel.querySelector('#reset-brand-btn');
        resetBtn?.addEventListener('click', () => this.resetBrand());

        const saveBtn = this.brandingPanel.querySelector('#save-brand-btn');
        saveBtn?.addEventListener('click', () => this.saveCurrentBrand());

        // Preview device controls
        const deviceBtns = this.previewArea.querySelectorAll('.preview-device-btn');
        deviceBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchPreviewDevice(e.target.dataset.device);
            });
        });

        console.log('Event listeners setup complete');
    }

    /**
     * Switch tab
     */
    switchTab(tabName) {
        // Update active tab
        const tabBtns = this.brandingPanel.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Load tab content
        this.loadTabContent(tabName);

        console.log('Switched to tab:', tabName);
    }

    /**
     * Load tab content
     */
    loadTabContent(tabName) {
        const contentArea = this.brandingPanel.querySelector('#branding-tab-content');

        switch (tabName) {
            case 'presets':
                contentArea.innerHTML = this.createPresetsTabContent();
                break;
            case 'logos':
                contentArea.innerHTML = this.createLogosTabContent();
                break;
            case 'colors':
                contentArea.innerHTML = this.createColorsTabContent();
                break;
            case 'fonts':
                contentArea.innerHTML = this.createFontsTabContent();
                break;
            case 'layout':
                contentArea.innerHTML = this.createLayoutTabContent();
                break;
            default:
                contentArea.innerHTML = '<p>Tab content not found</p>';
        }

        // Setup tab-specific event listeners
        this.setupTabEventListeners(tabName);
    }

    /**
     * Create presets tab content
     */
    createPresetsTabContent() {
        const presets = Array.from(this.brandPresets.entries());

        return `
            <div class="presets-grid">
                ${presets.map(([key, preset]) => `
                    <div class="preset-card ${this.currentBrand?.id === key ? 'active' : ''}" data-preset="${key}">
                        <div class="preset-preview">
                            <div class="preset-colors">
                                <div class="color-dot" style="background: ${preset.colors.primary}"></div>
                                <div class="color-dot" style="background: ${preset.colors.secondary}"></div>
                                <div class="color-dot" style="background: ${preset.colors.accent}"></div>
                            </div>
                        </div>
                        <div class="preset-info">
                            <h4>${preset.name}</h4>
                            <p>${preset.description}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Create logos tab content
     */
    createLogosTabContent() {
        return `
            <div class="logos-section">
                <div class="logo-upload-area">
                    <h4>Primary Logo</h4>
                    <div class="logo-uploader" data-logo-type="primary">
                        <input type="file" id="primary-logo-input" accept="image/*" style="display: none;">
                        <div class="upload-zone">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>Click or drag to upload primary logo</p>
                            <small>PNG, JPG, SVG up to 5MB</small>
                        </div>
                        <div class="logo-preview" style="display: none;">
                            <img src="" alt="Primary logo preview">
                            <button class="remove-logo-btn">Remove</button>
                        </div>
                    </div>
                </div>

                <div class="logo-upload-area">
                    <h4>Secondary Logo</h4>
                    <div class="logo-uploader" data-logo-type="secondary">
                        <input type="file" id="secondary-logo-input" accept="image/*" style="display: none;">
                        <div class="upload-zone">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>Click or drag to upload secondary logo</p>
                            <small>PNG, JPG, SVG up to 5MB</small>
                        </div>
                        <div class="logo-preview" style="display: none;">
                            <img src="" alt="Secondary logo preview">
                            <button class="remove-logo-btn">Remove</button>
                        </div>
                    </div>
                </div>

                <div class="logo-upload-area">
                    <h4>Favicon</h4>
                    <div class="logo-uploader" data-logo-type="favicon">
                        <input type="file" id="favicon-input" accept="image/*" style="display: none;">
                        <div class="upload-zone">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>Click or drag to upload favicon</p>
                            <small>ICO, PNG 16x16 or 32x32</small>
                        </div>
                        <div class="logo-preview" style="display: none;">
                            <img src="" alt="Favicon preview">
                            <button class="remove-logo-btn">Remove</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create colors tab content
     */
    createColorsTabContent() {
        const colors = this.currentBrand?.colors || this.colors;

        return `
            <div class="colors-section">
                <div class="color-group">
                    <h4>Primary Colors</h4>
                    <div class="color-inputs">
                        <div class="color-input-group">
                            <label>Primary</label>
                            <input type="color" id="primary-color" value="${colors.primary}">
                            <input type="text" class="color-hex" value="${colors.primary}">
                        </div>
                        <div class="color-input-group">
                            <label>Secondary</label>
                            <input type="color" id="secondary-color" value="${colors.secondary}">
                            <input type="text" class="color-hex" value="${colors.secondary}">
                        </div>
                        <div class="color-input-group">
                            <label>Accent</label>
                            <input type="color" id="accent-color" value="${colors.accent}">
                            <input type="text" class="color-hex" value="${colors.accent}">
                        </div>
                    </div>
                </div>

                <div class="color-group">
                    <h4>Background Colors</h4>
                    <div class="color-inputs">
                        <div class="color-input-group">
                            <label>Background</label>
                            <input type="color" id="background-color" value="${colors.background}">
                            <input type="text" class="color-hex" value="${colors.background}">
                        </div>
                        <div class="color-input-group">
                            <label>Surface</label>
                            <input type="color" id="surface-color" value="${colors.surface}">
                            <input type="text" class="color-hex" value="${colors.surface}">
                        </div>
                    </div>
                </div>

                <div class="color-group">
                    <h4>Text Colors</h4>
                    <div class="color-inputs">
                        <div class="color-input-group">
                            <label>Text</label>
                            <input type="color" id="text-color" value="${colors.text}">
                            <input type="text" class="color-hex" value="${colors.text}">
                        </div>
                        <div class="color-input-group">
                            <label>Text Secondary</label>
                            <input type="color" id="text-secondary-color" value="${colors.textSecondary}">
                            <input type="text" class="color-hex" value="${colors.textSecondary}">
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create fonts tab content
     */
    createFontsTabContent() {
        const fonts = this.currentBrand?.fonts || this.fonts;

        return `
            <div class="fonts-section">
                <div class="font-group">
                    <label>Primary Font</label>
                    <select id="primary-font">
                        <option value="Segoe UI, Tahoma, Geneva, Verdana, sans-serif">Segoe UI</option>
                        <option value="Inter, system-ui, sans-serif">Inter</option>
                        <option value="Roboto, sans-serif">Roboto</option>
                        <option value="Poppins, sans-serif">Poppins</option>
                        <option value="Arial, sans-serif">Arial</option>
                        <option value="Helvetica, sans-serif">Helvetica</option>
                    </select>
                </div>

                <div class="font-group">
                    <label>Headings Font</label>
                    <select id="headings-font">
                        <option value="inherit">Same as Primary</option>
                        <option value="Segoe UI, Tahoma, Geneva, Verdana, sans-serif">Segoe UI</option>
                        <option value="Inter, system-ui, sans-serif">Inter</option>
                        <option value="Roboto, sans-serif">Roboto</option>
                        <option value="Poppins, sans-serif">Poppins</option>
                    </select>
                </div>

                <div class="font-group">
                    <label>Monospace Font</label>
                    <select id="monospace-font">
                        <option value="Courier New, monospace">Courier New</option>
                        <option value="Fira Code, monospace">Fira Code</option>
                        <option value="Source Code Pro, monospace">Source Code Pro</option>
                        <option value="JetBrains Mono, monospace">JetBrains Mono</option>
                    </select>
                </div>

                <div class="font-preview">
                    <h3>Font Preview</h3>
                    <h1>Heading 1</h1>
                    <h2>Heading 2</h2>
                    <p>This is a paragraph of text to show how the primary font looks.</p>
                    <code>This is monospace text for code examples.</code>
                </div>
            </div>
        `;
    }

    /**
     * Create layout tab content
     */
    createLayoutTabContent() {
        const layout = this.currentBrand?.layout || this.layout;

        return `
            <div class="layout-section">
                <div class="layout-group">
                    <label>Logo Position</label>
                    <select id="logo-position">
                        <option value="top-left" ${layout.logoPosition === 'top-left' ? 'selected' : ''}>Top Left</option>
                        <option value="top-center" ${layout.logoPosition === 'top-center' ? 'selected' : ''}>Top Center</option>
                        <option value="top-right" ${layout.logoPosition === 'top-right' ? 'selected' : ''}>Top Right</option>
                    </select>
                </div>

                <div class="layout-group">
                    <label>Logo Size</label>
                    <select id="logo-size">
                        <option value="small" ${layout.logoSize === 'small' ? 'selected' : ''}>Small</option>
                        <option value="medium" ${layout.logoSize === 'medium' ? 'selected' : ''}>Medium</option>
                        <option value="large" ${layout.logoSize === 'large' ? 'selected' : ''}>Large</option>
                    </select>
                </div>

                <div class="layout-group">
                    <label>Header Style</label>
                    <select id="header-style">
                        <option value="modern" ${layout.headerStyle === 'modern' ? 'selected' : ''}>Modern</option>
                        <option value="clean" ${layout.headerStyle === 'clean' ? 'selected' : ''}>Clean</option>
                        <option value="corporate" ${layout.headerStyle === 'corporate' ? 'selected' : ''}>Corporate</option>
                    </select>
                </div>

                <div class="layout-group">
                    <label>Corner Radius</label>
                    <input type="range" id="corner-radius" min="0" max="20" value="${parseInt(layout.cornerRadius)}" step="1">
                    <span class="range-value">${layout.cornerRadius}</span>
                </div>

                <div class="layout-group">
                    <label>Spacing</label>
                    <select id="spacing">
                        <option value="compact" ${layout.spacing === 'compact' ? 'selected' : ''}>Compact</option>
                        <option value="normal" ${layout.spacing === 'normal' ? 'selected' : ''}>Normal</option>
                        <option value="relaxed" ${layout.spacing === 'relaxed' ? 'selected' : ''}>Relaxed</option>
                        <option value="loose" ${layout.spacing === 'loose' ? 'selected' : ''}>Loose</option>
                    </select>
                </div>

                <div class="layout-toggles">
                    <div class="toggle-group">
                        <label>
                            <input type="checkbox" id="enable-shadows" ${layout.shadows ? 'checked' : ''}>
                            Enable Shadows
                        </label>
                    </div>
                    <div class="toggle-group">
                        <label>
                            <input type="checkbox" id="enable-animations" ${layout.animations ? 'checked' : ''}>
                            Enable Animations
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Setup tab-specific event listeners
     */
    setupTabEventListeners(tabName) {
        switch (tabName) {
            case 'presets':
                this.setupPresetsEventListeners();
                break;
            case 'logos':
                this.setupLogosEventListeners();
                break;
            case 'colors':
                this.setupColorsEventListeners();
                break;
            case 'fonts':
                this.setupFontsEventListeners();
                break;
            case 'layout':
                this.setupLayoutEventListeners();
                break;
        }
    }

    /**
     * Setup presets event listeners
     */
    setupPresetsEventListeners() {
        const presetCards = this.brandingPanel.querySelectorAll('.preset-card');
        presetCards.forEach(card => {
            card.addEventListener('click', () => {
                const presetKey = card.dataset.preset;
                this.setBrandPreset(presetKey);
                this.updatePresetSelection(presetKey);
            });
        });
    }

    /**
     * Setup logos event listeners
     */
    setupLogosEventListeners() {
        const uploaders = this.brandingPanel.querySelectorAll('.logo-uploader');
        uploaders.forEach(uploader => {
            const logoType = uploader.dataset.logoType;
            const input = uploader.querySelector('input[type="file"]');
            const uploadZone = uploader.querySelector('.upload-zone');

            uploadZone.addEventListener('click', () => input.click());

            input.addEventListener('change', (e) => {
                if (e.target.files[0]) {
                    this.handleLogoUpload(e.target.files[0], logoType);
                }
            });
        });
    }

    /**
     * Setup colors event listeners
     */
    setupColorsEventListeners() {
        const colorInputs = this.brandingPanel.querySelectorAll('input[type="color"]');
        colorInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const colorKey = e.target.id.replace('-color', '').replace('-', '');
                const colorValue = e.target.value;
                this.updateBrandColors({ [colorKey]: colorValue });
            });
        });
    }

    /**
     * Setup fonts event listeners
     */
    setupFontsEventListeners() {
        const fontSelects = this.brandingPanel.querySelectorAll('select[id$="-font"]');
        fontSelects.forEach(select => {
            select.addEventListener('change', (e) => {
                const fontKey = e.target.id.replace('-font', '');
                const fontValue = e.target.value;
                this.updateBrandFonts({ [fontKey]: fontValue });
            });
        });
    }

    /**
     * Setup layout event listeners
     */
    setupLayoutEventListeners() {
        const layoutInputs = this.brandingPanel.querySelectorAll('#layout-section input, #layout-section select');
        layoutInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const layoutKey = e.target.id.replace('-', '');
                let layoutValue = e.target.value;

                if (e.target.type === 'checkbox') {
                    layoutValue = e.target.checked;
                } else if (e.target.id === 'corner-radius') {
                    layoutValue = `${layoutValue}px`;
                }

                this.updateBrandLayout({ [layoutKey]: layoutValue });
            });
        });
    }

    /**
     * Handle logo upload
     */
    async handleLogoUpload(file, logoType) {
        try {
            const result = await this.uploadLogo(file, logoType);
            this.updateLogoPreview(logoType, result.url);
        } catch (error) {
            this.showError(`Logo upload failed: ${error.message}`);
        }
    }

    /**
     * Update logo preview
     */
    updateLogoPreview(logoType, url) {
        const uploader = this.brandingPanel.querySelector(`[data-logo-type="${logoType}"]`);
        const uploadZone = uploader.querySelector('.upload-zone');
        const preview = uploader.querySelector('.logo-preview');
        const img = preview.querySelector('img');

        uploadZone.style.display = 'none';
        preview.style.display = 'block';
        img.src = url;
    }

    /**
     * Toggle preview mode
     */
    togglePreviewMode() {
        if (this.isPreviewMode) {
            this.exitPreviewMode(false);
        } else {
            this.enterPreviewMode();
        }

        this.updatePreviewButton();
    }

    /**
     * Update preview button
     */
    updatePreviewButton() {
        const btn = this.brandingPanel.querySelector('#toggle-preview-btn');
        if (this.isPreviewMode) {
            btn.textContent = 'Exit Preview';
            btn.classList.add('active');
        } else {
            btn.textContent = 'Preview Mode';
            btn.classList.remove('active');
        }
    }

    /**
     * Show/hide branding panel
     */
    showBrandingPanel() {
        this.brandingPanel.classList.add('visible');
    }

    hideBrandingPanel() {
        this.brandingPanel.classList.remove('visible');
    }

    /**
     * Show preview indicator
     */
    showPreviewIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'preview-mode-indicator';
        indicator.innerHTML = `
            <i class="fas fa-eye"></i>
            Preview Mode
            <button class="exit-preview-btn">Exit</button>
        `;

        document.body.appendChild(indicator);

        indicator.querySelector('.exit-preview-btn').addEventListener('click', () => {
            this.exitPreviewMode(false);
        });
    }

    /**
     * Hide preview indicator
     */
    hidePreviewIndicator() {
        const indicator = document.querySelector('.preview-mode-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'branding-error';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            ${message}
        `;

        this.container.appendChild(errorDiv);

        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    /**
     * Emit branding event
     */
    emitBrandingEvent(eventName, data = {}) {
        const event = new CustomEvent(eventName, {
            detail: {
                timestamp: Date.now(),
                ...data
            }
        });

        this.container.dispatchEvent(event);
        console.log('Branding event emitted:', eventName, data);
    }

    /**
     * Add to history
     */
    addToHistory(brand) {
        this.brandHistory.push({
            ...brand,
            timestamp: Date.now()
        });

        // Keep only last 10 entries
        if (this.brandHistory.length > 10) {
            this.brandHistory.shift();
        }
    }

    /**
     * Reset brand to default
     */
    resetBrand() {
        const defaultPreset = this.brandPresets.get(this.options.defaultBrandPreset);
        if (defaultPreset) {
            this.currentBrand = { ...defaultPreset, id: 'default' };
            this.applyBranding();
            this.saveCurrentBrand();

            this.emitBrandingEvent('brand-reset', {
                brand: this.currentBrand
            });
        }
    }

    /**
     * Inject branding CSS
     */
    injectBrandingCSS() {
        const css = `
            .branding-customization-panel {
                position: fixed;
                top: 0;
                right: -400px;
                width: 400px;
                height: 100vh;
                background: var(--surface-color, #2a2a2a);
                border-left: 1px solid var(--border-color, #444444);
                z-index: 10000;
                transition: right 0.3s ease;
                display: flex;
                flex-direction: column;
            }

            .branding-customization-panel.visible {
                right: 0;
            }

            .branding-panel-header {
                padding: 1rem;
                border-bottom: 1px solid var(--border-color, #444444);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .branding-panel-header h3 {
                margin: 0;
                color: var(--text-color, #ffffff);
                font-size: 1.1rem;
            }

            .close-panel-btn {
                background: none;
                border: none;
                color: var(--text-color, #ffffff);
                cursor: pointer;
                padding: 0.5rem;
                border-radius: 4px;
            }

            .close-panel-btn:hover {
                background: var(--background-color, #1a1a1a);
            }

            .branding-tabs {
                display: flex;
                border-bottom: 1px solid var(--border-color, #444444);
            }

            .tab-btn {
                flex: 1;
                padding: 0.75rem 0.5rem;
                background: none;
                border: none;
                color: var(--text-secondary-color, #cccccc);
                cursor: pointer;
                font-size: 0.9rem;
                transition: all 0.2s ease;
            }

            .tab-btn.active {
                color: var(--primary-color, #FF0000);
                background: var(--background-color, #1a1a1a);
            }

            .branding-panel-content {
                flex: 1;
                overflow-y: auto;
                padding: 1rem;
            }

            .branding-panel-footer {
                padding: 1rem;
                border-top: 1px solid var(--border-color, #444444);
                display: flex;
                gap: 0.5rem;
            }

            .branding-panel-footer button {
                flex: 1;
                padding: 0.5rem;
                border: 1px solid var(--border-color, #444444);
                background: var(--surface-color, #2a2a2a);
                color: var(--text-color, #ffffff);
                cursor: pointer;
                border-radius: 4px;
                transition: all 0.2s ease;
            }

            .branding-panel-footer button:hover {
                background: var(--background-color, #1a1a1a);
            }

            .btn-save {
                background: var(--primary-color, #FF0000) !important;
            }

            .preview-mode-indicator {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--warning-color, #ffc107);
                color: #000;
                padding: 0.5rem 1rem;
                border-radius: 20px;
                z-index: 10001;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-weight: bold;
            }

            .exit-preview-btn {
                background: rgba(0, 0, 0, 0.2);
                border: none;
                color: #000;
                padding: 0.25rem 0.5rem;
                border-radius: 12px;
                cursor: pointer;
                font-size: 0.8rem;
            }

            .branding-error {
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--danger-color, #dc3545);
                color: white;
                padding: 1rem;
                border-radius: 8px;
                z-index: 10002;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                max-width: 300px;
            }

            .presets-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 1rem;
            }

            .preset-card {
                border: 1px solid var(--border-color, #444444);
                border-radius: 8px;
                padding: 1rem;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .preset-card:hover {
                border-color: var(--primary-color, #FF0000);
            }

            .preset-card.active {
                border-color: var(--primary-color, #FF0000);
                background: rgba(255, 0, 0, 0.1);
            }

            .preset-colors {
                display: flex;
                gap: 0.5rem;
                margin-bottom: 0.5rem;
            }

            .color-dot {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                border: 1px solid var(--border-color, #444444);
            }

            .preset-info h4 {
                margin: 0 0 0.25rem 0;
                color: var(--text-color, #ffffff);
                font-size: 1rem;
            }

            .preset-info p {
                margin: 0;
                color: var(--text-secondary-color, #cccccc);
                font-size: 0.9rem;
            }

            .logo-upload-area {
                margin-bottom: 2rem;
            }

            .logo-upload-area h4 {
                margin: 0 0 1rem 0;
                color: var(--text-color, #ffffff);
            }

            .upload-zone {
                border: 2px dashed var(--border-color, #444444);
                border-radius: 8px;
                padding: 2rem;
                text-align: center;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .upload-zone:hover {
                border-color: var(--primary-color, #FF0000);
                background: rgba(255, 0, 0, 0.05);
            }

            .upload-zone i {
                font-size: 2rem;
                color: var(--text-secondary-color, #cccccc);
                margin-bottom: 1rem;
            }

            .upload-zone p {
                margin: 0 0 0.5rem 0;
                color: var(--text-color, #ffffff);
            }

            .upload-zone small {
                color: var(--text-secondary-color, #cccccc);
            }

            .color-group {
                margin-bottom: 2rem;
            }

            .color-group h4 {
                margin: 0 0 1rem 0;
                color: var(--text-color, #ffffff);
            }

            .color-inputs {
                display: grid;
                gap: 1rem;
            }

            .color-input-group {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .color-input-group label {
                min-width: 80px;
                color: var(--text-color, #ffffff);
                font-size: 0.9rem;
            }

            .color-input-group input[type="color"] {
                width: 40px;
                height: 40px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }

            .color-hex {
                flex: 1;
                padding: 0.5rem;
                background: var(--background-color, #1a1a1a);
                border: 1px solid var(--border-color, #444444);
                color: var(--text-color, #ffffff);
                border-radius: 4px;
                font-family: monospace;
            }

            .font-group {
                margin-bottom: 1.5rem;
            }

            .font-group label {
                display: block;
                margin-bottom: 0.5rem;
                color: var(--text-color, #ffffff);
                font-weight: 500;
            }

            .font-group select {
                width: 100%;
                padding: 0.5rem;
                background: var(--background-color, #1a1a1a);
                border: 1px solid var(--border-color, #444444);
                color: var(--text-color, #ffffff);
                border-radius: 4px;
            }

            .font-preview {
                margin-top: 2rem;
                padding: 1rem;
                border: 1px solid var(--border-color, #444444);
                border-radius: 8px;
                background: var(--background-color, #1a1a1a);
            }

            .layout-group {
                margin-bottom: 1.5rem;
            }

            .layout-group label {
                display: block;
                margin-bottom: 0.5rem;
                color: var(--text-color, #ffffff);
                font-weight: 500;
            }

            .layout-group select,
            .layout-group input[type="range"] {
                width: 100%;
                padding: 0.5rem;
                background: var(--background-color, #1a1a1a);
                border: 1px solid var(--border-color, #444444);
                color: var(--text-color, #ffffff);
                border-radius: 4px;
            }

            .layout-toggles {
                margin-top: 2rem;
            }

            .toggle-group {
                margin-bottom: 1rem;
            }

            .toggle-group label {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                color: var(--text-color, #ffffff);
                cursor: pointer;
            }

            .toggle-group input[type="checkbox"] {
                width: 18px;
                height: 18px;
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = css;
        document.head.appendChild(styleSheet);
    }

    /**
     * Update theme system integration
     */
    updateThemeSystem() {
        if (!this.options.themeSystem || !this.currentBrand) return;

        // Create custom theme from current brand
        const customTheme = {
            name: this.currentBrand.name,
            type: 'custom',
            colors: this.currentBrand.colors,
            properties: {
                fontFamily: this.currentBrand.fonts?.primary,
                borderRadius: this.currentBrand.layout?.cornerRadius
            }
        };

        // Add to theme system
        this.options.themeSystem.addCustomTheme('brand-custom', customTheme);
        this.options.themeSystem.setTheme('brand-custom');
    }

    /**
     * Handle initialization error
     */
    handleInitializationError(error) {
        console.error('Branding system initialization failed:', error);
        this.showError('Failed to initialize branding system');
    }

    /**
     * Handle branding error
     */
    handleBrandingError(error) {
        console.error('Branding application failed:', error);
        this.showError('Failed to apply branding changes');
    }

    /**
     * Update preset selection
     */
    updatePresetSelection(presetKey) {
        const presetCards = this.brandingPanel.querySelectorAll('.preset-card');
        presetCards.forEach(card => {
            card.classList.toggle('active', card.dataset.preset === presetKey);
        });
    }

    /**
     * Switch preview device
     */
    switchPreviewDevice(device) {
        const deviceBtns = this.previewArea.querySelectorAll('.preview-device-btn');
        deviceBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.device === device);
        });

        const previewContent = this.previewArea.querySelector('#preview-content');
        previewContent.className = `preview-content preview-${device}`;
    }

    /**
     * Destroy branding system
     */
    destroy() {
        // Remove event listeners
        Object.values(this.boundEventHandlers).forEach(handler => {
            // Event listeners will be removed when elements are removed
        });

        // Remove UI elements
        if (this.brandingPanel) {
            this.brandingPanel.remove();
        }

        if (this.previewArea) {
            this.previewArea.remove();
        }

        // Remove preview indicator
        this.hidePreviewIndicator();

        // Clear references
        this.currentBrand = null;
        this.brandPresets.clear();
        this.customBrands.clear();
        this.brandHistory = [];

        console.log('Branding customization system destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BrandingCustomizationSystem;
} else if (typeof window !== 'undefined') {
    window.BrandingCustomizationSystem = BrandingCustomizationSystem;
}

    /**
     * Apply current branding to the interface
     */
    applyBranding() {
        if (!this.currentBrand) {
            console.warn('No current brand to apply');
            return;
        }

        try {
            // Apply colors
            this.applyColors(this.currentBrand.colors);

            // Apply fonts
            this.applyFonts(this.currentBrand.fonts);

            // Apply layout
            this.applyLayout(this.currentBrand.layout);

            // Apply logos
            this.applyLogos(this.currentBrand.logos);

            // Update theme system if available
            if (this.options.themeSystem) {
                this.updateThemeSystem();
            }

            // Emit branding applied event
            this.emitBrandingEvent('branding-applied', {
                brand: this.currentBrand,
                timestamp: Date.now()
            });

            console.log('✅ Branding applied successfully:', this.currentBrand.name);

        } catch (error) {
            console.error('Failed to apply branding:', error);
            this.handleBrandingError(error);
        }
    }

    /**
     * Apply color scheme
     */
    applyColors(colors) {
        if (!colors) return;

        const root = document.documentElement;

        // Apply CSS custom properties
        Object.entries(colors).forEach(([key, value]) => {
            const cssVar = `--brand-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
            root.style.setProperty(cssVar, value);
        });

        // Apply specific color mappings
        root.style.setProperty('--primary-color', colors.primary);
        root.style.setProperty('--secondary-color', colors.secondary);
        root.style.setProperty('--accent-color', colors.accent);
        root.style.setProperty('--background-color', colors.background);
        root.style.setProperty('--surface-color', colors.surface);
        root.style.setProperty('--text-color', colors.text);
        root.style.setProperty('--text-secondary-color', colors.textSecondary);
        root.style.setProperty('--border-color', colors.border);
        root.style.setProperty('--success-color', colors.success);
        root.style.setProperty('--warning-color', colors.warning);
        root.style.setProperty('--danger-color', colors.danger);
        root.style.setProperty('--info-color', colors.info);

        // Update body background
        document.body.style.backgroundColor = colors.background;
        document.body.style.color = colors.text;

        console.log('Colors applied:', Object.keys(colors).length, 'color variables');
    }

    /**
     * Apply font scheme
     */
    applyFonts(fonts) {
        if (!fonts) return;

        const root = document.documentElement;

        // Apply font CSS custom properties
        Object.entries(fonts).forEach(([key, value]) => {
            const cssVar = `--brand-font-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
            root.style.setProperty(cssVar, value);
        });

        // Apply specific font mappings
        root.style.setProperty('--font-family-primary', fonts.primary);
        root.style.setProperty('--font-family-secondary', fonts.secondary);
        root.style.setProperty('--font-family-monospace', fonts.monospace);
        root.style.setProperty('--font-family-headings', fonts.headings);

        // Update body font
        document.body.style.fontFamily = fonts.primary;

        // Update headings
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach(heading => {
            heading.style.fontFamily = fonts.headings;
        });

        console.log('Fonts applied:', Object.keys(fonts).length, 'font families');
    }

    /**
     * Apply layout settings
     */
    applyLayout(layout) {
        if (!layout) return;

        const root = document.documentElement;

        // Apply layout CSS custom properties
        Object.entries(layout).forEach(([key, value]) => {
            const cssVar = `--brand-layout-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
            root.style.setProperty(cssVar, value);
        });

        // Apply specific layout mappings
        root.style.setProperty('--border-radius', layout.cornerRadius);
        root.style.setProperty('--spacing-unit', this.getSpacingUnit(layout.spacing));

        // Apply layout classes
        document.body.classList.remove('logo-top-left', 'logo-top-center', 'logo-top-right');
        document.body.classList.add(`logo-${layout.logoPosition}`);

        document.body.classList.remove('logo-small', 'logo-medium', 'logo-large');
        document.body.classList.add(`logo-${layout.logoSize}`);

        document.body.classList.remove('header-modern', 'header-clean', 'header-corporate');
        document.body.classList.add(`header-${layout.headerStyle}`);

        document.body.classList.remove('nav-horizontal', 'nav-vertical');
        document.body.classList.add(`nav-${layout.navigationStyle}`);

        // Apply shadows
        if (layout.shadows) {
            document.body.classList.add('enable-shadows');
        } else {
            document.body.classList.remove('enable-shadows');
        }

        // Apply animations
        if (layout.animations) {
            document.body.classList.add('enable-animations');
        } else {
            document.body.classList.remove('enable-animations');
        }

        console.log('Layout applied:', Object.keys(layout).length, 'layout properties');
    }

    /**
     * Apply logos
     */
    applyLogos(logos) {
        if (!logos) return;

        // Apply primary logo
        if (logos.primary) {
            const primaryLogos = document.querySelectorAll('.brand-logo-primary, .navbar-brand img, .logo-primary');
            primaryLogos.forEach(logo => {
                if (logo.tagName === 'IMG') {
                    logo.src = logos.primary;
                } else {
                    logo.style.backgroundImage = `url(${logos.primary})`;
                }
            });
        }

        // Apply secondary logo
        if (logos.secondary) {
            const secondaryLogos = document.querySelectorAll('.brand-logo-secondary, .logo-secondary');
            secondaryLogos.forEach(logo => {
                if (logo.tagName === 'IMG') {
                    logo.src = logos.secondary;
                } else {
                    logo.style.backgroundImage = `url(${logos.secondary})`;
                }
            });
        }

        // Apply favicon
        if (logos.favicon) {
            const favicon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
            if (favicon) {
                favicon.href = logos.favicon;
            } else {
                const newFavicon = document.createElement('link');
                newFavicon.rel = 'icon';
                newFavicon.href = logos.favicon;
                document.head.appendChild(newFavicon);
            }
        }

        // Apply watermark
        if (logos.watermark) {
            const watermarks = document.querySelectorAll('.brand-watermark, .logo-watermark');
            watermarks.forEach(watermark => {
                if (watermark.tagName === 'IMG') {
                    watermark.src = logos.watermark;
                } else {
                    watermark.style.backgroundImage = `url(${logos.watermark})`;
                }
            });
        }

        console.log('Logos applied:', Object.keys(logos).length, 'logo types');
    }
