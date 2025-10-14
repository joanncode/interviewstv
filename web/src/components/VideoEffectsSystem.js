/**
 * Video Effects and Filters System
 * Comprehensive video processing system with real-time effects, filters, and transformations
 */
class VideoEffectsSystem {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            enableWebGL: true,
            enableRealTimeProcessing: true,
            enableEffectChaining: true,
            enableCustomShaders: true,
            maxEffectsChain: 10,
            targetFPS: 30,
            processingQuality: 'high', // 'low', 'medium', 'high', 'ultra'
            enablePerformanceMonitoring: true,
            enableEffectPresets: true,
            enableColorCorrection: true,
            enableDistortionEffects: true,
            enableArtisticEffects: true,
            ...options
        };
        
        // Core video processing
        this.sourceVideo = null;
        this.outputCanvas = null;
        this.outputContext = null;
        this.webglCanvas = null;
        this.webglContext = null;
        this.isProcessing = false;
        this.animationFrameId = null;
        
        // Effects management
        this.availableEffects = new Map();
        this.activeEffects = new Map();
        this.effectsChain = [];
        this.effectPresets = new Map();
        this.customShaders = new Map();
        
        // WebGL resources
        this.shaderPrograms = new Map();
        this.textures = new Map();
        this.framebuffers = new Map();
        this.vertexBuffer = null;
        this.textureCoordBuffer = null;
        
        // Performance monitoring
        this.performanceStats = {
            frameProcessingTime: 0,
            averageFrameTime: 0,
            droppedFrames: 0,
            effectsApplied: 0,
            memoryUsage: 0,
            gpuUtilization: 0
        };
        
        // UI elements
        this.effectsPanel = null;
        this.effectsControls = null;
        this.previewCanvas = null;
        
        // System integration
        this.accessibilitySystem = options.accessibilitySystem || null;
        this.themeSystem = options.themeSystem || null;
        this.responsiveSystem = options.responsiveSystem || null;
        
        // Bound event handlers
        this.boundEventHandlers = {
            handleEffectChange: this.handleEffectChange.bind(this),
            handlePresetChange: this.handlePresetChange.bind(this),
            handleKeyDown: this.handleKeyDown.bind(this)
        };
        
        this.init();
    }
    
    /**
     * Initialize video effects system
     */
    init() {
        console.log('🎨 Initializing Video Effects System...');
        
        try {
            // Check browser support
            if (!this.checkBrowserSupport()) {
                throw new Error('Browser does not support required video processing features');
            }
            
            // Setup WebGL context
            this.setupWebGLContext();
            
            // Initialize effects library
            this.initializeEffectsLibrary();
            
            // Setup effect presets
            this.setupEffectPresets();
            
            // Create UI components
            this.createEffectsPanel();
            this.createEffectsControls();
            this.createPreviewCanvas();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Inject CSS
            this.injectVideoEffectsCSS();
            
            console.log('✅ Video Effects System initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Video Effects System:', error);
            this.handleInitializationError(error);
        }
    }
    
    /**
     * Check browser support for video effects
     */
    checkBrowserSupport() {
        // Check for Canvas support
        const canvas = document.createElement('canvas');
        if (!canvas.getContext) {
            console.warn('Canvas not supported');
            return false;
        }
        
        // Check for WebGL support
        if (this.options.enableWebGL) {
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) {
                console.warn('WebGL not supported, falling back to Canvas 2D');
                this.options.enableWebGL = false;
            }
        }
        
        // Check for getUserMedia support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn('getUserMedia not supported');
            return false;
        }
        
        // Check for requestAnimationFrame support
        if (!window.requestAnimationFrame) {
            console.warn('requestAnimationFrame not supported');
            return false;
        }
        
        return true;
    }
    
    /**
     * Setup WebGL context and resources
     */
    setupWebGLContext() {
        if (!this.options.enableWebGL) {
            return;
        }
        
        // Create WebGL canvas
        this.webglCanvas = document.createElement('canvas');
        this.webglCanvas.width = 1920;
        this.webglCanvas.height = 1080;
        
        // Get WebGL context
        this.webglContext = this.webglCanvas.getContext('webgl') || this.webglCanvas.getContext('experimental-webgl');
        
        if (!this.webglContext) {
            console.warn('Failed to create WebGL context');
            this.options.enableWebGL = false;
            return;
        }
        
        const gl = this.webglContext;
        
        // Setup viewport
        gl.viewport(0, 0, this.webglCanvas.width, this.webglCanvas.height);
        
        // Create vertex buffer for quad
        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,  1, -1,  -1, 1,
            -1,  1,  1, -1,   1, 1
        ]), gl.STATIC_DRAW);
        
        // Create texture coordinate buffer
        this.textureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            0, 0,  1, 0,  0, 1,
            0, 1,  1, 0,  1, 1
        ]), gl.STATIC_DRAW);
        
        // Setup basic shaders
        this.setupBasicShaders();
        
        console.log('✅ WebGL context initialized');
    }
    
    /**
     * Setup basic WebGL shaders
     */
    setupBasicShaders() {
        const gl = this.webglContext;
        
        // Vertex shader
        const vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            varying vec2 v_texCoord;
            
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }
        `;
        
        // Basic fragment shader
        const fragmentShaderSource = `
            precision mediump float;
            uniform sampler2D u_texture;
            varying vec2 v_texCoord;
            
            void main() {
                gl_FragColor = texture2D(u_texture, v_texCoord);
            }
        `;
        
        // Create and compile shaders
        const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
        
        // Create program
        const program = this.createProgram(gl, vertexShader, fragmentShader);
        this.shaderPrograms.set('basic', program);
        
        // Get attribute and uniform locations
        program.attribLocations = {
            position: gl.getAttribLocation(program, 'a_position'),
            texCoord: gl.getAttribLocation(program, 'a_texCoord')
        };
        
        program.uniformLocations = {
            texture: gl.getUniformLocation(program, 'u_texture')
        };
    }
    
    /**
     * Create WebGL shader
     */
    createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    /**
     * Create WebGL program
     */
    createProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program linking error:', gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            return null;
        }
        
        return program;
    }
    
    /**
     * Initialize effects library
     */
    initializeEffectsLibrary() {
        // Color correction effects
        this.setupColorCorrectionEffects();
        
        // Artistic effects
        this.setupArtisticEffects();
        
        // Distortion effects
        this.setupDistortionEffects();
        
        // Filter effects
        this.setupFilterEffects();
        
        // Lighting effects
        this.setupLightingEffects();
        
        // Motion effects
        this.setupMotionEffects();
        
        console.log(`✅ Initialized ${this.availableEffects.size} video effects`);
    }
    
    /**
     * Setup color correction effects
     */
    setupColorCorrectionEffects() {
        // Brightness effect
        this.availableEffects.set('brightness', {
            name: 'Brightness',
            category: 'color',
            icon: 'fas fa-sun',
            description: 'Adjust video brightness',
            parameters: {
                intensity: { min: -100, max: 100, default: 0, step: 1 }
            },
            shader: this.createBrightnessShader(),
            process: (imageData, params) => this.applyBrightnessEffect(imageData, params)
        });
        
        // Contrast effect
        this.availableEffects.set('contrast', {
            name: 'Contrast',
            category: 'color',
            icon: 'fas fa-adjust',
            description: 'Adjust video contrast',
            parameters: {
                intensity: { min: -100, max: 100, default: 0, step: 1 }
            },
            shader: this.createContrastShader(),
            process: (imageData, params) => this.applyContrastEffect(imageData, params)
        });
        
        // Saturation effect
        this.availableEffects.set('saturation', {
            name: 'Saturation',
            category: 'color',
            icon: 'fas fa-palette',
            description: 'Adjust color saturation',
            parameters: {
                intensity: { min: -100, max: 100, default: 0, step: 1 }
            },
            shader: this.createSaturationShader(),
            process: (imageData, params) => this.applySaturationEffect(imageData, params)
        });
        
        // Hue rotation effect
        this.availableEffects.set('hue', {
            name: 'Hue Rotation',
            category: 'color',
            icon: 'fas fa-tint',
            description: 'Rotate color hue',
            parameters: {
                rotation: { min: 0, max: 360, default: 0, step: 1 }
            },
            shader: this.createHueRotationShader(),
            process: (imageData, params) => this.applyHueRotationEffect(imageData, params)
        });
        
        // Gamma correction effect
        this.availableEffects.set('gamma', {
            name: 'Gamma Correction',
            category: 'color',
            icon: 'fas fa-circle-half-stroke',
            description: 'Adjust gamma correction',
            parameters: {
                gamma: { min: 0.1, max: 3.0, default: 1.0, step: 0.1 }
            },
            shader: this.createGammaCorrectionShader(),
            process: (imageData, params) => this.applyGammaCorrectionEffect(imageData, params)
        });
    }

    /**
     * Setup artistic effects
     */
    setupArtisticEffects() {
        // Sepia effect
        this.availableEffects.set('sepia', {
            name: 'Sepia',
            category: 'artistic',
            icon: 'fas fa-image',
            description: 'Apply sepia tone effect',
            parameters: {
                intensity: { min: 0, max: 100, default: 50, step: 1 }
            },
            shader: this.createSepiaShader(),
            process: (imageData, params) => this.applySepiaEffect(imageData, params)
        });

        // Grayscale effect
        this.availableEffects.set('grayscale', {
            name: 'Grayscale',
            category: 'artistic',
            icon: 'fas fa-adjust',
            description: 'Convert to grayscale',
            parameters: {
                intensity: { min: 0, max: 100, default: 100, step: 1 }
            },
            shader: this.createGrayscaleShader(),
            process: (imageData, params) => this.applyGrayscaleEffect(imageData, params)
        });

        // Vintage effect
        this.availableEffects.set('vintage', {
            name: 'Vintage',
            category: 'artistic',
            icon: 'fas fa-camera-retro',
            description: 'Apply vintage film effect',
            parameters: {
                intensity: { min: 0, max: 100, default: 50, step: 1 },
                vignette: { min: 0, max: 100, default: 30, step: 1 }
            },
            shader: this.createVintageShader(),
            process: (imageData, params) => this.applyVintageEffect(imageData, params)
        });

        // Posterize effect
        this.availableEffects.set('posterize', {
            name: 'Posterize',
            category: 'artistic',
            icon: 'fas fa-layer-group',
            description: 'Reduce color levels for poster effect',
            parameters: {
                levels: { min: 2, max: 16, default: 8, step: 1 }
            },
            shader: this.createPosterizeShader(),
            process: (imageData, params) => this.applyPosterizeEffect(imageData, params)
        });

        // Edge detection effect
        this.availableEffects.set('edges', {
            name: 'Edge Detection',
            category: 'artistic',
            icon: 'fas fa-border-style',
            description: 'Highlight edges in the image',
            parameters: {
                threshold: { min: 0, max: 100, default: 50, step: 1 },
                invert: { type: 'boolean', default: false }
            },
            shader: this.createEdgeDetectionShader(),
            process: (imageData, params) => this.applyEdgeDetectionEffect(imageData, params)
        });
    }

    /**
     * Setup distortion effects
     */
    setupDistortionEffects() {
        // Blur effect
        this.availableEffects.set('blur', {
            name: 'Blur',
            category: 'distortion',
            icon: 'fas fa-eye-slash',
            description: 'Apply blur effect',
            parameters: {
                radius: { min: 0, max: 20, default: 5, step: 0.5 }
            },
            shader: this.createBlurShader(),
            process: (imageData, params) => this.applyBlurEffect(imageData, params)
        });

        // Sharpen effect
        this.availableEffects.set('sharpen', {
            name: 'Sharpen',
            category: 'distortion',
            icon: 'fas fa-search-plus',
            description: 'Sharpen image details',
            parameters: {
                intensity: { min: 0, max: 100, default: 50, step: 1 }
            },
            shader: this.createSharpenShader(),
            process: (imageData, params) => this.applySharpenEffect(imageData, params)
        });

        // Pixelate effect
        this.availableEffects.set('pixelate', {
            name: 'Pixelate',
            category: 'distortion',
            icon: 'fas fa-th',
            description: 'Create pixelated effect',
            parameters: {
                pixelSize: { min: 1, max: 50, default: 10, step: 1 }
            },
            shader: this.createPixelateShader(),
            process: (imageData, params) => this.applyPixelateEffect(imageData, params)
        });

        // Fisheye effect
        this.availableEffects.set('fisheye', {
            name: 'Fisheye',
            category: 'distortion',
            icon: 'fas fa-circle',
            description: 'Apply fisheye lens distortion',
            parameters: {
                strength: { min: 0, max: 100, default: 50, step: 1 }
            },
            shader: this.createFisheyeShader(),
            process: (imageData, params) => this.applyFisheyeEffect(imageData, params)
        });

        // Barrel distortion effect
        this.availableEffects.set('barrel', {
            name: 'Barrel Distortion',
            category: 'distortion',
            icon: 'fas fa-expand-arrows-alt',
            description: 'Apply barrel distortion',
            parameters: {
                strength: { min: -100, max: 100, default: 0, step: 1 }
            },
            shader: this.createBarrelDistortionShader(),
            process: (imageData, params) => this.applyBarrelDistortionEffect(imageData, params)
        });
    }

    /**
     * Setup filter effects
     */
    setupFilterEffects() {
        // Noise effect
        this.availableEffects.set('noise', {
            name: 'Noise',
            category: 'filter',
            icon: 'fas fa-random',
            description: 'Add noise to the image',
            parameters: {
                intensity: { min: 0, max: 100, default: 25, step: 1 },
                type: { type: 'select', options: ['white', 'colored'], default: 'white' }
            },
            shader: this.createNoiseShader(),
            process: (imageData, params) => this.applyNoiseEffect(imageData, params)
        });

        // Emboss effect
        this.availableEffects.set('emboss', {
            name: 'Emboss',
            category: 'filter',
            icon: 'fas fa-mountain',
            description: 'Create embossed effect',
            parameters: {
                strength: { min: 0, max: 100, default: 50, step: 1 }
            },
            shader: this.createEmbossShader(),
            process: (imageData, params) => this.applyEmbossEffect(imageData, params)
        });

        // Invert effect
        this.availableEffects.set('invert', {
            name: 'Invert',
            category: 'filter',
            icon: 'fas fa-exchange-alt',
            description: 'Invert colors',
            parameters: {
                intensity: { min: 0, max: 100, default: 100, step: 1 }
            },
            shader: this.createInvertShader(),
            process: (imageData, params) => this.applyInvertEffect(imageData, params)
        });

        // Threshold effect
        this.availableEffects.set('threshold', {
            name: 'Threshold',
            category: 'filter',
            icon: 'fas fa-sliders-h',
            description: 'Apply threshold filter',
            parameters: {
                threshold: { min: 0, max: 255, default: 128, step: 1 }
            },
            shader: this.createThresholdShader(),
            process: (imageData, params) => this.applyThresholdEffect(imageData, params)
        });
    }

    /**
     * Setup lighting effects
     */
    setupLightingEffects() {
        // Vignette effect
        this.availableEffects.set('vignette', {
            name: 'Vignette',
            category: 'lighting',
            icon: 'fas fa-circle-notch',
            description: 'Add vignette effect',
            parameters: {
                intensity: { min: 0, max: 100, default: 50, step: 1 },
                size: { min: 0, max: 100, default: 50, step: 1 }
            },
            shader: this.createVignetteShader(),
            process: (imageData, params) => this.applyVignetteEffect(imageData, params)
        });

        // Glow effect
        this.availableEffects.set('glow', {
            name: 'Glow',
            category: 'lighting',
            icon: 'fas fa-lightbulb',
            description: 'Add glow effect',
            parameters: {
                intensity: { min: 0, max: 100, default: 30, step: 1 },
                radius: { min: 1, max: 20, default: 5, step: 1 }
            },
            shader: this.createGlowShader(),
            process: (imageData, params) => this.applyGlowEffect(imageData, params)
        });

        // Shadow effect
        this.availableEffects.set('shadow', {
            name: 'Drop Shadow',
            category: 'lighting',
            icon: 'fas fa-clone',
            description: 'Add drop shadow effect',
            parameters: {
                offsetX: { min: -20, max: 20, default: 5, step: 1 },
                offsetY: { min: -20, max: 20, default: 5, step: 1 },
                blur: { min: 0, max: 20, default: 5, step: 1 },
                opacity: { min: 0, max: 100, default: 50, step: 1 }
            },
            shader: this.createShadowShader(),
            process: (imageData, params) => this.applyShadowEffect(imageData, params)
        });
    }

    /**
     * Setup motion effects
     */
    setupMotionEffects() {
        // Motion blur effect
        this.availableEffects.set('motionBlur', {
            name: 'Motion Blur',
            category: 'motion',
            icon: 'fas fa-running',
            description: 'Apply motion blur effect',
            parameters: {
                angle: { min: 0, max: 360, default: 0, step: 1 },
                distance: { min: 0, max: 50, default: 10, step: 1 }
            },
            shader: this.createMotionBlurShader(),
            process: (imageData, params) => this.applyMotionBlurEffect(imageData, params)
        });

        // Zoom blur effect
        this.availableEffects.set('zoomBlur', {
            name: 'Zoom Blur',
            category: 'motion',
            icon: 'fas fa-search',
            description: 'Apply radial zoom blur',
            parameters: {
                strength: { min: 0, max: 100, default: 25, step: 1 },
                centerX: { min: 0, max: 100, default: 50, step: 1 },
                centerY: { min: 0, max: 100, default: 50, step: 1 }
            },
            shader: this.createZoomBlurShader(),
            process: (imageData, params) => this.applyZoomBlurEffect(imageData, params)
        });
    }

    /**
     * Setup effect presets
     */
    setupEffectPresets() {
        // Cinematic preset
        this.effectPresets.set('cinematic', {
            name: 'Cinematic',
            description: 'Professional cinematic look',
            effects: [
                { name: 'contrast', params: { intensity: 15 } },
                { name: 'saturation', params: { intensity: -10 } },
                { name: 'vignette', params: { intensity: 30, size: 70 } },
                { name: 'gamma', params: { gamma: 1.2 } }
            ]
        });

        // Vintage preset
        this.effectPresets.set('vintage', {
            name: 'Vintage Film',
            description: 'Classic vintage film look',
            effects: [
                { name: 'sepia', params: { intensity: 40 } },
                { name: 'noise', params: { intensity: 15, type: 'white' } },
                { name: 'vignette', params: { intensity: 50, size: 60 } },
                { name: 'contrast', params: { intensity: 20 } }
            ]
        });

        // Dramatic preset
        this.effectPresets.set('dramatic', {
            name: 'Dramatic',
            description: 'High contrast dramatic effect',
            effects: [
                { name: 'contrast', params: { intensity: 40 } },
                { name: 'brightness', params: { intensity: -10 } },
                { name: 'saturation', params: { intensity: 25 } },
                { name: 'shadow', params: { offsetX: 3, offsetY: 3, blur: 8, opacity: 30 } }
            ]
        });

        // Soft preset
        this.effectPresets.set('soft', {
            name: 'Soft & Dreamy',
            description: 'Soft, dreamy appearance',
            effects: [
                { name: 'blur', params: { radius: 1.5 } },
                { name: 'brightness', params: { intensity: 10 } },
                { name: 'contrast', params: { intensity: -15 } },
                { name: 'glow', params: { intensity: 20, radius: 3 } }
            ]
        });

        // Black and white preset
        this.effectPresets.set('blackwhite', {
            name: 'Black & White',
            description: 'Classic black and white',
            effects: [
                { name: 'grayscale', params: { intensity: 100 } },
                { name: 'contrast', params: { intensity: 25 } },
                { name: 'brightness', params: { intensity: 5 } }
            ]
        });

        // Cyberpunk preset
        this.effectPresets.set('cyberpunk', {
            name: 'Cyberpunk',
            description: 'Futuristic cyberpunk style',
            effects: [
                { name: 'hue', params: { rotation: 180 } },
                { name: 'saturation', params: { intensity: 50 } },
                { name: 'contrast', params: { intensity: 30 } },
                { name: 'glow', params: { intensity: 40, radius: 5 } }
            ]
        });
    }

    /**
     * Create effects panel UI
     */
    createEffectsPanel() {
        this.effectsPanel = document.createElement('div');
        this.effectsPanel.className = 'video-effects-panel';
        this.effectsPanel.style.display = 'none';
        this.effectsPanel.innerHTML = `
            <div class="effects-header">
                <h4><i class="fas fa-magic" aria-hidden="true"></i>Video Effects & Filters</h4>
                <div class="effects-header-controls">
                    <button class="effects-btn" id="reset-all-effects" title="Reset All Effects">
                        <i class="fas fa-undo" aria-hidden="true"></i>
                    </button>
                    <button class="effects-btn" id="save-preset" title="Save Preset">
                        <i class="fas fa-save" aria-hidden="true"></i>
                    </button>
                    <button class="close-btn" id="close-effects-panel" title="Close Panel">
                        <i class="fas fa-times" aria-hidden="true"></i>
                    </button>
                </div>
            </div>

            <div class="effects-content">
                <!-- Presets Section -->
                <div class="effects-section">
                    <h5><i class="fas fa-star" aria-hidden="true"></i>Presets</h5>
                    <div class="presets-grid" id="presets-grid">
                        ${this.generatePresetsHTML()}
                    </div>
                </div>

                <!-- Effects Categories -->
                <div class="effects-section">
                    <h5><i class="fas fa-layer-group" aria-hidden="true"></i>Effects</h5>
                    <div class="effects-categories">
                        <button class="category-btn active" data-category="all">
                            <i class="fas fa-th" aria-hidden="true"></i>
                            <span>All</span>
                        </button>
                        <button class="category-btn" data-category="color">
                            <i class="fas fa-palette" aria-hidden="true"></i>
                            <span>Color</span>
                        </button>
                        <button class="category-btn" data-category="artistic">
                            <i class="fas fa-paint-brush" aria-hidden="true"></i>
                            <span>Artistic</span>
                        </button>
                        <button class="category-btn" data-category="distortion">
                            <i class="fas fa-expand" aria-hidden="true"></i>
                            <span>Distortion</span>
                        </button>
                        <button class="category-btn" data-category="filter">
                            <i class="fas fa-filter" aria-hidden="true"></i>
                            <span>Filter</span>
                        </button>
                        <button class="category-btn" data-category="lighting">
                            <i class="fas fa-lightbulb" aria-hidden="true"></i>
                            <span>Lighting</span>
                        </button>
                        <button class="category-btn" data-category="motion">
                            <i class="fas fa-running" aria-hidden="true"></i>
                            <span>Motion</span>
                        </button>
                    </div>
                </div>

                <!-- Effects List -->
                <div class="effects-section">
                    <div class="effects-list" id="effects-list">
                        ${this.generateEffectsHTML()}
                    </div>
                </div>

                <!-- Active Effects Chain -->
                <div class="effects-section" id="active-effects-section" style="display: none;">
                    <h5><i class="fas fa-link" aria-hidden="true"></i>Active Effects Chain</h5>
                    <div class="effects-chain" id="effects-chain">
                        <!-- Active effects will be populated here -->
                    </div>
                </div>
            </div>
        `;

        this.container.appendChild(this.effectsPanel);
    }

    /**
     * Generate presets HTML
     */
    generatePresetsHTML() {
        let html = '';

        this.effectPresets.forEach((preset, key) => {
            html += `
                <div class="preset-item" data-preset="${key}">
                    <div class="preset-preview">
                        <i class="fas fa-star" aria-hidden="true"></i>
                    </div>
                    <div class="preset-info">
                        <h6>${preset.name}</h6>
                        <p>${preset.description}</p>
                    </div>
                    <button class="preset-apply-btn" data-preset="${key}" title="Apply Preset">
                        <i class="fas fa-play" aria-hidden="true"></i>
                    </button>
                </div>
            `;
        });

        return html;
    }

    /**
     * Generate effects HTML
     */
    generateEffectsHTML() {
        let html = '';

        this.availableEffects.forEach((effect, key) => {
            html += `
                <div class="effect-item" data-effect="${key}" data-category="${effect.category}">
                    <div class="effect-header">
                        <div class="effect-info">
                            <div class="effect-icon">
                                <i class="${effect.icon}" aria-hidden="true"></i>
                            </div>
                            <div class="effect-details">
                                <h6>${effect.name}</h6>
                                <p>${effect.description}</p>
                            </div>
                        </div>
                        <div class="effect-toggle">
                            <label class="toggle-switch">
                                <input type="checkbox" class="effect-checkbox" data-effect="${key}">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                    <div class="effect-controls" id="controls-${key}" style="display: none;">
                        ${this.generateEffectControlsHTML(effect)}
                    </div>
                </div>
            `;
        });

        return html;
    }

    /**
     * Generate effect controls HTML
     */
    generateEffectControlsHTML(effect) {
        let html = '';

        Object.entries(effect.parameters).forEach(([paramName, paramConfig]) => {
            if (paramConfig.type === 'boolean') {
                html += `
                    <div class="control-group">
                        <label class="control-label">${this.formatParameterName(paramName)}</label>
                        <label class="toggle-switch small">
                            <input type="checkbox" class="param-checkbox" data-param="${paramName}" ${paramConfig.default ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                `;
            } else if (paramConfig.type === 'select') {
                html += `
                    <div class="control-group">
                        <label class="control-label">${this.formatParameterName(paramName)}</label>
                        <select class="param-select" data-param="${paramName}">
                            ${paramConfig.options.map(option =>
                                `<option value="${option}" ${option === paramConfig.default ? 'selected' : ''}>${option}</option>`
                            ).join('')}
                        </select>
                    </div>
                `;
            } else {
                html += `
                    <div class="control-group">
                        <label class="control-label">
                            ${this.formatParameterName(paramName)}
                            <span class="param-value" id="value-${paramName}">${paramConfig.default}</span>
                        </label>
                        <input type="range"
                               class="param-slider"
                               data-param="${paramName}"
                               min="${paramConfig.min}"
                               max="${paramConfig.max}"
                               value="${paramConfig.default}"
                               step="${paramConfig.step}">
                    </div>
                `;
            }
        });

        return html;
    }

    /**
     * Format parameter name for display
     */
    formatParameterName(paramName) {
        return paramName.charAt(0).toUpperCase() + paramName.slice(1).replace(/([A-Z])/g, ' $1');
    }

    /**
     * Create effects controls panel
     */
    createEffectsControls() {
        this.effectsControls = document.createElement('div');
        this.effectsControls.className = 'effects-controls-panel';
        this.effectsControls.innerHTML = `
            <div class="controls-header">
                <h5><i class="fas fa-sliders-h" aria-hidden="true"></i>Effect Controls</h5>
                <button class="toggle-btn" id="toggle-effects-panel" title="Toggle Effects Panel">
                    <i class="fas fa-magic" aria-hidden="true"></i>
                </button>
            </div>
            <div class="controls-content">
                <div class="quick-controls">
                    <button class="quick-btn" id="quick-reset" title="Reset All">
                        <i class="fas fa-undo" aria-hidden="true"></i>
                        <span>Reset</span>
                    </button>
                    <button class="quick-btn" id="quick-preview" title="Toggle Preview">
                        <i class="fas fa-eye" aria-hidden="true"></i>
                        <span>Preview</span>
                    </button>
                    <button class="quick-btn" id="quick-apply" title="Apply Effects">
                        <i class="fas fa-check" aria-hidden="true"></i>
                        <span>Apply</span>
                    </button>
                </div>
                <div class="performance-info" id="performance-info">
                    <div class="perf-item">
                        <span class="perf-label">Frame Time:</span>
                        <span class="perf-value" id="frame-time">0ms</span>
                    </div>
                    <div class="perf-item">
                        <span class="perf-label">Effects:</span>
                        <span class="perf-value" id="active-effects-count">0</span>
                    </div>
                </div>
            </div>
        `;

        this.container.appendChild(this.effectsControls);
    }

    /**
     * Create preview canvas
     */
    createPreviewCanvas() {
        this.previewCanvas = document.createElement('canvas');
        this.previewCanvas.className = 'effects-preview-canvas';
        this.previewCanvas.width = 320;
        this.previewCanvas.height = 180;
        this.previewCanvas.style.display = 'none';

        this.container.appendChild(this.previewCanvas);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Panel controls
        document.getElementById('toggle-effects-panel')?.addEventListener('click', () => this.toggleEffectsPanel());
        document.getElementById('close-effects-panel')?.addEventListener('click', () => this.hideEffectsPanel());
        document.getElementById('reset-all-effects')?.addEventListener('click', () => this.resetAllEffects());
        document.getElementById('save-preset')?.addEventListener('click', () => this.saveCustomPreset());

        // Quick controls
        document.getElementById('quick-reset')?.addEventListener('click', () => this.resetAllEffects());
        document.getElementById('quick-preview')?.addEventListener('click', () => this.togglePreview());
        document.getElementById('quick-apply')?.addEventListener('click', () => this.applyAllEffects());

        // Category buttons
        this.effectsPanel?.addEventListener('click', (e) => {
            if (e.target.closest('.category-btn')) {
                const category = e.target.closest('.category-btn').dataset.category;
                this.filterEffectsByCategory(category);
            }
        });

        // Preset buttons
        this.effectsPanel?.addEventListener('click', (e) => {
            if (e.target.closest('.preset-apply-btn')) {
                const preset = e.target.closest('.preset-apply-btn').dataset.preset;
                this.applyPreset(preset);
            }
        });

        // Effect toggles
        this.effectsPanel?.addEventListener('change', (e) => {
            if (e.target.classList.contains('effect-checkbox')) {
                const effectName = e.target.dataset.effect;
                this.toggleEffect(effectName, e.target.checked);
            }
        });

        // Parameter controls
        this.effectsPanel?.addEventListener('input', this.boundEventHandlers.handleEffectChange);
        this.effectsPanel?.addEventListener('change', this.boundEventHandlers.handleEffectChange);

        // Keyboard shortcuts
        document.addEventListener('keydown', this.boundEventHandlers.handleKeyDown);
    }

    /**
     * Handle effect parameter changes
     */
    handleEffectChange(e) {
        if (e.target.classList.contains('param-slider')) {
            const paramName = e.target.dataset.param;
            const value = parseFloat(e.target.value);
            const valueDisplay = document.getElementById(`value-${paramName}`);
            if (valueDisplay) {
                valueDisplay.textContent = value;
            }
            this.updateEffectParameter(paramName, value);
        } else if (e.target.classList.contains('param-checkbox')) {
            const paramName = e.target.dataset.param;
            const value = e.target.checked;
            this.updateEffectParameter(paramName, value);
        } else if (e.target.classList.contains('param-select')) {
            const paramName = e.target.dataset.param;
            const value = e.target.value;
            this.updateEffectParameter(paramName, value);
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyDown(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'e':
                    if (e.shiftKey) {
                        e.preventDefault();
                        this.toggleEffectsPanel();
                    }
                    break;
                case 'r':
                    if (e.shiftKey && e.altKey) {
                        e.preventDefault();
                        this.resetAllEffects();
                    }
                    break;
                case 'p':
                    if (e.shiftKey) {
                        e.preventDefault();
                        this.togglePreview();
                    }
                    break;
            }
        }

        // Number keys for quick presets
        if (e.key >= '1' && e.key <= '6' && e.altKey) {
            e.preventDefault();
            const presetKeys = Array.from(this.effectPresets.keys());
            const presetIndex = parseInt(e.key) - 1;
            if (presetIndex < presetKeys.length) {
                this.applyPreset(presetKeys[presetIndex]);
            }
        }
    }

    /**
     * Start video processing
     */
    startProcessing(videoElement) {
        if (this.isProcessing) {
            console.warn('Video effects processing already active');
            return;
        }

        this.sourceVideo = videoElement;

        // Create output canvas
        this.outputCanvas = document.createElement('canvas');
        this.outputCanvas.width = videoElement.videoWidth || 1920;
        this.outputCanvas.height = videoElement.videoHeight || 1080;
        this.outputContext = this.outputCanvas.getContext('2d');

        // Start processing loop
        this.isProcessing = true;
        this.processFrame();

        console.log('✅ Video effects processing started');

        // Emit processing started event
        this.emitEffectsEvent('processing-started', {
            videoWidth: this.outputCanvas.width,
            videoHeight: this.outputCanvas.height
        });
    }

    /**
     * Stop video processing
     */
    stopProcessing() {
        if (!this.isProcessing) {
            return;
        }

        this.isProcessing = false;

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        console.log('Video effects processing stopped');

        // Emit processing stopped event
        this.emitEffectsEvent('processing-stopped', {});
    }

    /**
     * Process video frame
     */
    processFrame() {
        if (!this.isProcessing || !this.sourceVideo) {
            return;
        }

        const startTime = performance.now();

        try {
            // Draw source video to canvas
            this.outputContext.drawImage(
                this.sourceVideo,
                0, 0,
                this.outputCanvas.width,
                this.outputCanvas.height
            );

            // Apply active effects
            if (this.activeEffects.size > 0) {
                this.applyEffectsChain();
            }

            // Update performance stats
            const processingTime = performance.now() - startTime;
            this.updatePerformanceStats(processingTime);

        } catch (error) {
            console.error('Frame processing error:', error);
        }

        // Schedule next frame
        this.animationFrameId = requestAnimationFrame(() => this.processFrame());
    }

    /**
     * Apply effects chain to current frame
     */
    applyEffectsChain() {
        if (this.options.enableWebGL && this.webglContext) {
            this.applyEffectsWebGL();
        } else {
            this.applyEffectsCanvas2D();
        }
    }

    /**
     * Apply effects using WebGL
     */
    applyEffectsWebGL() {
        const gl = this.webglContext;

        // Create texture from canvas
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.outputCanvas);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // Apply each effect in the chain
        this.effectsChain.forEach((effectName, index) => {
            const effect = this.availableEffects.get(effectName);
            const params = this.activeEffects.get(effectName);

            if (effect && effect.shader && params) {
                this.applyWebGLEffect(effect, params, texture);
            }
        });

        // Read back to canvas
        gl.readPixels(0, 0, this.outputCanvas.width, this.outputCanvas.height, gl.RGBA, gl.UNSIGNED_BYTE,
                     new Uint8Array(this.outputCanvas.width * this.outputCanvas.height * 4));

        // Cleanup
        gl.deleteTexture(texture);
    }

    /**
     * Apply effects using Canvas 2D
     */
    applyEffectsCanvas2D() {
        const imageData = this.outputContext.getImageData(0, 0, this.outputCanvas.width, this.outputCanvas.height);
        let processedImageData = imageData;

        // Apply each effect in the chain
        this.effectsChain.forEach(effectName => {
            const effect = this.availableEffects.get(effectName);
            const params = this.activeEffects.get(effectName);

            if (effect && effect.process && params) {
                processedImageData = effect.process(processedImageData, params);
            }
        });

        // Put processed image data back to canvas
        this.outputContext.putImageData(processedImageData, 0, 0);
    }

    /**
     * Toggle effect on/off
     */
    toggleEffect(effectName, enabled) {
        if (enabled) {
            const effect = this.availableEffects.get(effectName);
            if (effect) {
                // Initialize with default parameters
                const defaultParams = {};
                Object.entries(effect.parameters).forEach(([paramName, paramConfig]) => {
                    defaultParams[paramName] = paramConfig.default;
                });

                this.activeEffects.set(effectName, defaultParams);
                this.effectsChain.push(effectName);

                // Show effect controls
                const controlsElement = document.getElementById(`controls-${effectName}`);
                if (controlsElement) {
                    controlsElement.style.display = 'block';
                }

                console.log(`Effect '${effectName}' enabled`);
            }
        } else {
            this.activeEffects.delete(effectName);
            const index = this.effectsChain.indexOf(effectName);
            if (index > -1) {
                this.effectsChain.splice(index, 1);
            }

            // Hide effect controls
            const controlsElement = document.getElementById(`controls-${effectName}`);
            if (controlsElement) {
                controlsElement.style.display = 'none';
            }

            console.log(`Effect '${effectName}' disabled`);
        }

        this.updateActiveEffectsDisplay();
        this.updatePerformanceDisplay();

        // Emit effect toggled event
        this.emitEffectsEvent('effect-toggled', {
            effectName,
            enabled,
            activeEffectsCount: this.activeEffects.size
        });
    }

    /**
     * Update effect parameter
     */
    updateEffectParameter(paramName, value) {
        // Find which effect this parameter belongs to
        let targetEffect = null;

        this.activeEffects.forEach((params, effectName) => {
            if (params.hasOwnProperty(paramName)) {
                targetEffect = effectName;
            }
        });

        if (targetEffect) {
            const params = this.activeEffects.get(targetEffect);
            params[paramName] = value;
            this.activeEffects.set(targetEffect, params);

            console.log(`Updated ${targetEffect}.${paramName} = ${value}`);

            // Emit parameter changed event
            this.emitEffectsEvent('parameter-changed', {
                effectName: targetEffect,
                paramName,
                value
            });
        }
    }

    /**
     * Apply preset
     */
    applyPreset(presetName) {
        const preset = this.effectPresets.get(presetName);
        if (!preset) {
            console.warn(`Preset '${presetName}' not found`);
            return;
        }

        // Reset all effects first
        this.resetAllEffects();

        // Apply preset effects
        preset.effects.forEach(({ name, params }) => {
            const effectCheckbox = document.querySelector(`input[data-effect="${name}"]`);
            if (effectCheckbox) {
                effectCheckbox.checked = true;
                this.toggleEffect(name, true);

                // Set parameters
                Object.entries(params).forEach(([paramName, value]) => {
                    const paramControl = document.querySelector(`[data-param="${paramName}"]`);
                    if (paramControl) {
                        if (paramControl.type === 'range') {
                            paramControl.value = value;
                            const valueDisplay = document.getElementById(`value-${paramName}`);
                            if (valueDisplay) {
                                valueDisplay.textContent = value;
                            }
                        } else if (paramControl.type === 'checkbox') {
                            paramControl.checked = value;
                        } else if (paramControl.tagName === 'SELECT') {
                            paramControl.value = value;
                        }

                        this.updateEffectParameter(paramName, value);
                    }
                });
            }
        });

        console.log(`Applied preset: ${preset.name}`);

        // Announce to accessibility system
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce(`Applied ${preset.name} preset`, 'polite');
        }

        // Emit preset applied event
        this.emitEffectsEvent('preset-applied', {
            presetName,
            preset
        });
    }

    /**
     * Reset all effects
     */
    resetAllEffects() {
        // Clear active effects
        this.activeEffects.clear();
        this.effectsChain.length = 0;

        // Reset UI
        const checkboxes = this.effectsPanel?.querySelectorAll('.effect-checkbox');
        checkboxes?.forEach(checkbox => {
            checkbox.checked = false;
        });

        const controlsElements = this.effectsPanel?.querySelectorAll('.effect-controls');
        controlsElements?.forEach(controls => {
            controls.style.display = 'none';
        });

        // Reset parameter controls to defaults
        this.availableEffects.forEach((effect, effectName) => {
            Object.entries(effect.parameters).forEach(([paramName, paramConfig]) => {
                const paramControl = document.querySelector(`[data-param="${paramName}"]`);
                if (paramControl) {
                    if (paramControl.type === 'range') {
                        paramControl.value = paramConfig.default;
                        const valueDisplay = document.getElementById(`value-${paramName}`);
                        if (valueDisplay) {
                            valueDisplay.textContent = paramConfig.default;
                        }
                    } else if (paramControl.type === 'checkbox') {
                        paramControl.checked = paramConfig.default;
                    } else if (paramControl.tagName === 'SELECT') {
                        paramControl.value = paramConfig.default;
                    }
                }
            });
        });

        this.updateActiveEffectsDisplay();
        this.updatePerformanceDisplay();

        console.log('All effects reset');

        // Announce to accessibility system
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce('All effects reset', 'polite');
        }

        // Emit effects reset event
        this.emitEffectsEvent('effects-reset', {});
    }

    /**
     * Filter effects by category
     */
    filterEffectsByCategory(category) {
        const effectItems = this.effectsPanel?.querySelectorAll('.effect-item');
        const categoryButtons = this.effectsPanel?.querySelectorAll('.category-btn');

        // Update category button states
        categoryButtons?.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });

        // Show/hide effects based on category
        effectItems?.forEach(item => {
            const effectCategory = item.dataset.category;
            const shouldShow = category === 'all' || effectCategory === category;
            item.style.display = shouldShow ? 'block' : 'none';
        });

        console.log(`Filtered effects by category: ${category}`);
    }

    /**
     * Toggle effects panel visibility
     */
    toggleEffectsPanel() {
        const isVisible = this.effectsPanel.style.display !== 'none';

        if (isVisible) {
            this.hideEffectsPanel();
        } else {
            this.showEffectsPanel();
        }
    }

    /**
     * Show effects panel
     */
    showEffectsPanel() {
        this.effectsPanel.style.display = 'block';

        // Announce to accessibility system
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce('Effects panel opened', 'polite');
        }
    }

    /**
     * Hide effects panel
     */
    hideEffectsPanel() {
        this.effectsPanel.style.display = 'none';

        // Announce to accessibility system
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce('Effects panel closed', 'polite');
        }
    }

    /**
     * Toggle preview mode
     */
    togglePreview() {
        const isVisible = this.previewCanvas.style.display !== 'none';

        if (isVisible) {
            this.previewCanvas.style.display = 'none';
        } else {
            this.previewCanvas.style.display = 'block';
            this.updatePreview();
        }
    }

    /**
     * Update preview canvas
     */
    updatePreview() {
        if (this.previewCanvas.style.display === 'none' || !this.outputCanvas) {
            return;
        }

        const previewContext = this.previewCanvas.getContext('2d');
        previewContext.drawImage(
            this.outputCanvas,
            0, 0,
            this.outputCanvas.width,
            this.outputCanvas.height,
            0, 0,
            this.previewCanvas.width,
            this.previewCanvas.height
        );
    }

    /**
     * Create brightness shader
     */
    createBrightnessShader() {
        return `
            precision mediump float;
            uniform sampler2D u_texture;
            uniform float u_brightness;
            varying vec2 v_texCoord;

            void main() {
                vec4 color = texture2D(u_texture, v_texCoord);
                color.rgb += u_brightness / 100.0;
                gl_FragColor = color;
            }
        `;
    }

    /**
     * Create contrast shader
     */
    createContrastShader() {
        return `
            precision mediump float;
            uniform sampler2D u_texture;
            uniform float u_contrast;
            varying vec2 v_texCoord;

            void main() {
                vec4 color = texture2D(u_texture, v_texCoord);
                float factor = (259.0 * (u_contrast + 255.0)) / (255.0 * (259.0 - u_contrast));
                color.rgb = factor * (color.rgb - 0.5) + 0.5;
                gl_FragColor = color;
            }
        `;
    }

    /**
     * Create saturation shader
     */
    createSaturationShader() {
        return `
            precision mediump float;
            uniform sampler2D u_texture;
            uniform float u_saturation;
            varying vec2 v_texCoord;

            void main() {
                vec4 color = texture2D(u_texture, v_texCoord);
                float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
                color.rgb = mix(vec3(gray), color.rgb, 1.0 + u_saturation / 100.0);
                gl_FragColor = color;
            }
        `;
    }

    /**
     * Create hue rotation shader
     */
    createHueRotationShader() {
        return `
            precision mediump float;
            uniform sampler2D u_texture;
            uniform float u_hue;
            varying vec2 v_texCoord;

            vec3 rgb2hsv(vec3 c) {
                vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
                vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
                vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
                float d = q.x - min(q.w, q.y);
                float e = 1.0e-10;
                return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
            }

            vec3 hsv2rgb(vec3 c) {
                vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
                vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
                return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
            }

            void main() {
                vec4 color = texture2D(u_texture, v_texCoord);
                vec3 hsv = rgb2hsv(color.rgb);
                hsv.x += u_hue / 360.0;
                hsv.x = fract(hsv.x);
                color.rgb = hsv2rgb(hsv);
                gl_FragColor = color;
            }
        `;
    }

    /**
     * Create gamma correction shader
     */
    createGammaCorrectionShader() {
        return `
            precision mediump float;
            uniform sampler2D u_texture;
            uniform float u_gamma;
            varying vec2 v_texCoord;

            void main() {
                vec4 color = texture2D(u_texture, v_texCoord);
                color.rgb = pow(color.rgb, vec3(1.0 / u_gamma));
                gl_FragColor = color;
            }
        `;
    }

    /**
     * Create sepia shader
     */
    createSepiaShader() {
        return `
            precision mediump float;
            uniform sampler2D u_texture;
            uniform float u_intensity;
            varying vec2 v_texCoord;

            void main() {
                vec4 color = texture2D(u_texture, v_texCoord);
                vec3 sepia = vec3(
                    dot(color.rgb, vec3(0.393, 0.769, 0.189)),
                    dot(color.rgb, vec3(0.349, 0.686, 0.168)),
                    dot(color.rgb, vec3(0.272, 0.534, 0.131))
                );
                color.rgb = mix(color.rgb, sepia, u_intensity / 100.0);
                gl_FragColor = color;
            }
        `;
    }

    /**
     * Create grayscale shader
     */
    createGrayscaleShader() {
        return `
            precision mediump float;
            uniform sampler2D u_texture;
            uniform float u_intensity;
            varying vec2 v_texCoord;

            void main() {
                vec4 color = texture2D(u_texture, v_texCoord);
                float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
                color.rgb = mix(color.rgb, vec3(gray), u_intensity / 100.0);
                gl_FragColor = color;
            }
        `;
    }

    /**
     * Create blur shader
     */
    createBlurShader() {
        return `
            precision mediump float;
            uniform sampler2D u_texture;
            uniform float u_radius;
            uniform vec2 u_resolution;
            varying vec2 v_texCoord;

            void main() {
                vec2 texelSize = 1.0 / u_resolution;
                vec4 color = vec4(0.0);
                float total = 0.0;

                for (float x = -4.0; x <= 4.0; x++) {
                    for (float y = -4.0; y <= 4.0; y++) {
                        vec2 offset = vec2(x, y) * texelSize * u_radius;
                        float weight = exp(-(x*x + y*y) / (2.0 * u_radius * u_radius));
                        color += texture2D(u_texture, v_texCoord + offset) * weight;
                        total += weight;
                    }
                }

                gl_FragColor = color / total;
            }
        `;
    }

    /**
     * Create vignette shader
     */
    createVignetteShader() {
        return `
            precision mediump float;
            uniform sampler2D u_texture;
            uniform float u_intensity;
            uniform float u_size;
            varying vec2 v_texCoord;

            void main() {
                vec4 color = texture2D(u_texture, v_texCoord);
                vec2 center = vec2(0.5, 0.5);
                float dist = distance(v_texCoord, center);
                float vignette = smoothstep(u_size / 100.0, u_size / 100.0 * 0.5, dist);
                vignette = mix(1.0, vignette, u_intensity / 100.0);
                color.rgb *= vignette;
                gl_FragColor = color;
            }
        `;
    }

    /**
     * Apply brightness effect (Canvas 2D)
     */
    applyBrightnessEffect(imageData, params) {
        const data = imageData.data;
        const brightness = params.intensity * 2.55; // Convert to 0-255 range

        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.max(0, Math.min(255, data[i] + brightness));     // Red
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + brightness)); // Green
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + brightness)); // Blue
        }

        return imageData;
    }

    /**
     * Apply contrast effect (Canvas 2D)
     */
    applyContrastEffect(imageData, params) {
        const data = imageData.data;
        const contrast = params.intensity;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));     // Red
            data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128)); // Green
            data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128)); // Blue
        }

        return imageData;
    }

    /**
     * Apply saturation effect (Canvas 2D)
     */
    applySaturationEffect(imageData, params) {
        const data = imageData.data;
        const saturation = 1 + params.intensity / 100;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const gray = 0.299 * r + 0.587 * g + 0.114 * b;

            data[i] = Math.max(0, Math.min(255, gray + saturation * (r - gray)));
            data[i + 1] = Math.max(0, Math.min(255, gray + saturation * (g - gray)));
            data[i + 2] = Math.max(0, Math.min(255, gray + saturation * (b - gray)));
        }

        return imageData;
    }

    /**
     * Update active effects display
     */
    updateActiveEffectsDisplay() {
        const activeEffectsSection = document.getElementById('active-effects-section');
        const effectsChain = document.getElementById('effects-chain');

        if (this.activeEffects.size > 0) {
            activeEffectsSection.style.display = 'block';

            let chainHTML = '';
            this.effectsChain.forEach((effectName, index) => {
                const effect = this.availableEffects.get(effectName);
                chainHTML += `
                    <div class="chain-effect" data-effect="${effectName}">
                        <div class="chain-effect-info">
                            <i class="${effect.icon}" aria-hidden="true"></i>
                            <span>${effect.name}</span>
                        </div>
                        <div class="chain-effect-controls">
                            <button class="chain-btn" onclick="this.moveEffectUp('${effectName}')" title="Move Up">
                                <i class="fas fa-arrow-up" aria-hidden="true"></i>
                            </button>
                            <button class="chain-btn" onclick="this.moveEffectDown('${effectName}')" title="Move Down">
                                <i class="fas fa-arrow-down" aria-hidden="true"></i>
                            </button>
                            <button class="chain-btn" onclick="this.removeEffectFromChain('${effectName}')" title="Remove">
                                <i class="fas fa-times" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>
                `;
            });

            effectsChain.innerHTML = chainHTML;
        } else {
            activeEffectsSection.style.display = 'none';
        }
    }

    /**
     * Update performance display
     */
    updatePerformanceDisplay() {
        const frameTimeElement = document.getElementById('frame-time');
        const activeEffectsCountElement = document.getElementById('active-effects-count');

        if (frameTimeElement) {
            frameTimeElement.textContent = `${this.performanceStats.averageFrameTime.toFixed(1)}ms`;
        }

        if (activeEffectsCountElement) {
            activeEffectsCountElement.textContent = this.activeEffects.size;
        }
    }

    /**
     * Update performance statistics
     */
    updatePerformanceStats(processingTime) {
        this.performanceStats.frameProcessingTime = processingTime;
        this.performanceStats.averageFrameTime =
            (this.performanceStats.averageFrameTime * 0.9) + (processingTime * 0.1);
        this.performanceStats.effectsApplied = this.activeEffects.size;

        // Update display
        this.updatePerformanceDisplay();
    }

    /**
     * Save custom preset
     */
    saveCustomPreset() {
        if (this.activeEffects.size === 0) {
            console.warn('No active effects to save as preset');
            return;
        }

        const presetName = prompt('Enter preset name:');
        if (!presetName) return;

        const effects = [];
        this.effectsChain.forEach(effectName => {
            const params = this.activeEffects.get(effectName);
            effects.push({ name: effectName, params: { ...params } });
        });

        const preset = {
            name: presetName,
            description: `Custom preset with ${effects.length} effects`,
            effects: effects
        };

        this.effectPresets.set(presetName.toLowerCase().replace(/\s+/g, '_'), preset);

        // Update presets display
        this.updatePresetsDisplay();

        console.log(`Saved custom preset: ${presetName}`);

        // Announce to accessibility system
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce(`Saved preset ${presetName}`, 'polite');
        }
    }

    /**
     * Update presets display
     */
    updatePresetsDisplay() {
        const presetsGrid = document.getElementById('presets-grid');
        if (presetsGrid) {
            presetsGrid.innerHTML = this.generatePresetsHTML();
        }
    }

    /**
     * Get current output stream
     */
    getOutputStream() {
        if (this.outputCanvas) {
            return this.outputCanvas.captureStream(this.options.targetFPS);
        }
        return null;
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        return { ...this.performanceStats };
    }

    /**
     * Get active effects
     */
    getActiveEffects() {
        return new Map(this.activeEffects);
    }

    /**
     * Get available effects
     */
    getAvailableEffects() {
        return new Map(this.availableEffects);
    }

    /**
     * Emit effects event
     */
    emitEffectsEvent(eventType, data) {
        const event = new CustomEvent(eventType, {
            detail: {
                ...data,
                effectsSystem: this
            }
        });

        this.container.dispatchEvent(event);
    }

    /**
     * Handle initialization error
     */
    handleInitializationError(error) {
        console.error('Video Effects System initialization error:', error);

        // Emit error event
        this.emitEffectsEvent('initialization-error', {
            error: error.message,
            timestamp: Date.now()
        });

        // Announce to accessibility system
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce('Video effects system failed to initialize', 'assertive');
        }
    }

    /**
     * Inject video effects CSS
     */
    injectVideoEffectsCSS() {
        if (document.getElementById('video-effects-css')) return;

        const style = document.createElement('style');
        style.id = 'video-effects-css';
        style.textContent = `
            /* Video Effects System Styles */
            .video-effects-panel {
                position: fixed;
                top: 20px;
                left: 20px;
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

            .effects-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px;
                border-bottom: 1px solid var(--border-color, #444);
                background: var(--input-dark, #3a3a3a);
            }

            .effects-header h4 {
                margin: 0;
                color: var(--primary-color, #ff0000);
                font-size: 1.1rem;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .effects-header-controls {
                display: flex;
                gap: 8px;
            }

            .effects-btn {
                background: var(--input-dark, #3a3a3a);
                border: 1px solid var(--border-color, #444);
                color: var(--text-light, #fff);
                padding: 6px 8px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 0.8rem;
            }

            .effects-btn:hover {
                background: var(--primary-color, #ff0000);
                border-color: var(--primary-color, #ff0000);
            }

            .effects-content {
                flex: 1;
                overflow-y: auto;
                padding: 15px;
            }

            .effects-section {
                margin-bottom: 20px;
            }

            .effects-section h5 {
                margin: 0 0 10px 0;
                color: var(--text-light, #fff);
                font-size: 0.9rem;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .presets-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 8px;
                margin-bottom: 15px;
            }

            .preset-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px;
                background: var(--input-dark, #3a3a3a);
                border: 1px solid var(--border-color, #444);
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .preset-item:hover {
                background: var(--primary-color, #ff0000);
                border-color: var(--primary-color, #ff0000);
            }

            .preset-preview {
                width: 30px;
                height: 30px;
                background: var(--primary-color, #ff0000);
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
            }

            .preset-info {
                flex: 1;
            }

            .preset-info h6 {
                margin: 0 0 2px 0;
                color: var(--text-light, #fff);
                font-size: 0.8rem;
            }

            .preset-info p {
                margin: 0;
                color: var(--text-muted, #aaa);
                font-size: 0.7rem;
            }

            .preset-apply-btn {
                background: var(--primary-color, #ff0000);
                border: none;
                color: white;
                padding: 6px 8px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .preset-apply-btn:hover {
                background: #cc0000;
            }

            .effects-categories {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
                gap: 6px;
                margin-bottom: 15px;
            }

            .category-btn {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                padding: 8px 6px;
                background: var(--input-dark, #3a3a3a);
                border: 1px solid var(--border-color, #444);
                color: var(--text-light, #fff);
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 0.7rem;
            }

            .category-btn:hover,
            .category-btn.active {
                background: var(--primary-color, #ff0000);
                border-color: var(--primary-color, #ff0000);
            }

            .category-btn i {
                font-size: 1rem;
            }

            .effects-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .effect-item {
                background: var(--input-dark, #3a3a3a);
                border: 1px solid var(--border-color, #444);
                border-radius: 6px;
                overflow: hidden;
            }

            .effect-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px;
            }

            .effect-info {
                display: flex;
                align-items: center;
                gap: 10px;
                flex: 1;
            }

            .effect-icon {
                width: 30px;
                height: 30px;
                background: var(--primary-color, #ff0000);
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 0.9rem;
            }

            .effect-details h6 {
                margin: 0 0 2px 0;
                color: var(--text-light, #fff);
                font-size: 0.8rem;
            }

            .effect-details p {
                margin: 0;
                color: var(--text-muted, #aaa);
                font-size: 0.7rem;
            }

            .toggle-switch {
                position: relative;
                display: inline-block;
                width: 40px;
                height: 20px;
            }

            .toggle-switch.small {
                width: 30px;
                height: 16px;
            }

            .toggle-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }

            .toggle-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: var(--border-color, #444);
                transition: 0.2s;
                border-radius: 20px;
            }

            .toggle-slider:before {
                position: absolute;
                content: "";
                height: 16px;
                width: 16px;
                left: 2px;
                bottom: 2px;
                background-color: white;
                transition: 0.2s;
                border-radius: 50%;
            }

            .toggle-switch.small .toggle-slider:before {
                height: 12px;
                width: 12px;
            }

            input:checked + .toggle-slider {
                background-color: var(--primary-color, #ff0000);
            }

            input:checked + .toggle-slider:before {
                transform: translateX(20px);
            }

            .toggle-switch.small input:checked + .toggle-slider:before {
                transform: translateX(14px);
            }

            .effect-controls {
                padding: 10px;
                border-top: 1px solid var(--border-color, #444);
                background: var(--card-dark, #2a2a2a);
            }

            .control-group {
                margin-bottom: 10px;
            }

            .control-group:last-child {
                margin-bottom: 0;
            }

            .control-label {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 5px;
                color: var(--text-light, #fff);
                font-size: 0.8rem;
            }

            .param-value {
                color: var(--primary-color, #ff0000);
                font-weight: 500;
            }

            .param-slider {
                width: 100%;
                height: 4px;
                border-radius: 2px;
                background: var(--border-color, #444);
                outline: none;
                -webkit-appearance: none;
            }

            .param-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: var(--primary-color, #ff0000);
                cursor: pointer;
            }

            .param-slider::-moz-range-thumb {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: var(--primary-color, #ff0000);
                cursor: pointer;
                border: none;
            }

            .param-select {
                width: 100%;
                background: var(--input-dark, #3a3a3a);
                border: 1px solid var(--border-color, #444);
                color: var(--text-light, #fff);
                padding: 6px 8px;
                border-radius: 4px;
                font-size: 0.8rem;
            }

            .effects-controls-panel {
                position: fixed;
                bottom: 20px;
                left: 20px;
                background: var(--card-dark, #2a2a2a);
                border: 1px solid var(--border-color, #444);
                border-radius: 8px;
                padding: 15px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                z-index: 1500;
            }

            .controls-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }

            .controls-header h5 {
                margin: 0;
                color: var(--primary-color, #ff0000);
                font-size: 0.9rem;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .toggle-btn {
                background: var(--primary-color, #ff0000);
                border: none;
                color: white;
                padding: 6px 8px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .toggle-btn:hover {
                background: #cc0000;
            }

            .quick-controls {
                display: flex;
                gap: 8px;
                margin-bottom: 10px;
            }

            .quick-btn {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 6px 10px;
                background: var(--input-dark, #3a3a3a);
                border: 1px solid var(--border-color, #444);
                color: var(--text-light, #fff);
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 0.8rem;
            }

            .quick-btn:hover {
                background: var(--primary-color, #ff0000);
                border-color: var(--primary-color, #ff0000);
            }

            .performance-info {
                display: flex;
                gap: 15px;
                font-size: 0.8rem;
            }

            .perf-item {
                display: flex;
                gap: 5px;
            }

            .perf-label {
                color: var(--text-muted, #aaa);
            }

            .perf-value {
                color: var(--text-light, #fff);
                font-weight: 500;
            }

            .effects-preview-canvas {
                position: fixed;
                top: 20px;
                right: 20px;
                border: 2px solid var(--primary-color, #ff0000);
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                z-index: 1500;
            }

            /* Responsive Design */
            @media (max-width: 768px) {
                .video-effects-panel {
                    left: 10px;
                    right: 10px;
                    width: auto;
                    max-height: 70vh;
                }

                .effects-controls-panel {
                    left: 10px;
                    right: 10px;
                    bottom: 10px;
                }

                .effects-preview-canvas {
                    top: 10px;
                    right: 10px;
                    width: 160px;
                    height: 90px;
                }

                .effects-categories {
                    grid-template-columns: repeat(3, 1fr);
                }

                .quick-controls {
                    flex-wrap: wrap;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Destroy video effects system
     */
    destroy() {
        // Stop processing
        this.stopProcessing();

        // Remove event listeners
        document.removeEventListener('keydown', this.boundEventHandlers.handleKeyDown);

        // Clean up WebGL resources
        if (this.webglContext) {
            const gl = this.webglContext;

            // Delete buffers
            if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer);
            if (this.textureCoordBuffer) gl.deleteBuffer(this.textureCoordBuffer);

            // Delete shaders and programs
            this.shaderPrograms.forEach(program => gl.deleteProgram(program));

            // Delete textures and framebuffers
            this.textures.forEach(texture => gl.deleteTexture(texture));
            this.framebuffers.forEach(framebuffer => gl.deleteFramebuffer(framebuffer));
        }

        // Remove UI elements
        if (this.effectsPanel) this.effectsPanel.remove();
        if (this.effectsControls) this.effectsControls.remove();
        if (this.previewCanvas) this.previewCanvas.remove();

        // Clear data
        this.availableEffects.clear();
        this.activeEffects.clear();
        this.effectPresets.clear();
        this.effectsChain.length = 0;

        // Remove CSS
        const style = document.getElementById('video-effects-css');
        if (style) style.remove();

        console.log('Video Effects System destroyed');
    }
}
