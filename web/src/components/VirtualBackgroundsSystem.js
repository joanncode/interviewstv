/**
 * Virtual Backgrounds System
 * AI-powered background removal, custom backgrounds, and blur effects for video streaming
 */
class VirtualBackgroundsSystem {
    constructor(options = {}) {
        this.container = options.container || document.body;
        this.streamingInterface = options.streamingInterface || null;
        this.accessibilitySystem = options.accessibilitySystem || null;
        this.themeSystem = options.themeSystem || null;
        this.responsiveSystem = options.responsiveSystem || null;
        
        // Virtual backgrounds settings
        this.settings = {
            enabled: true,
            enableAIBackgroundRemoval: true,
            enableCustomBackgrounds: true,
            enableBlurEffects: true,
            enableGreenScreen: true,
            defaultBlurStrength: 5,
            backgroundQuality: 'high', // 'low', 'medium', 'high'
            enablePerformanceOptimization: true,
            enableEdgeSmoothing: true,
            enableLightingAdjustment: true,
            maxBackgroundSize: 5 * 1024 * 1024, // 5MB
            supportedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
            enableBackgroundPreview: true,
            enableAutoDetection: true,
            ...options.settings
        };
        
        // AI/ML models for background segmentation
        this.segmentationModel = null;
        this.modelLoaded = false;
        this.modelLoading = false;
        
        // Video processing elements
        this.sourceVideo = null;
        this.outputCanvas = null;
        this.outputContext = null;
        this.backgroundCanvas = null;
        this.backgroundContext = null;
        this.maskCanvas = null;
        this.maskContext = null;
        
        // Background management
        this.backgrounds = new Map();
        this.currentBackground = null;
        this.currentBackgroundType = 'none'; // 'none', 'blur', 'image', 'video', 'greenscreen'
        
        // Processing state
        this.isProcessing = false;
        this.processingFrame = false;
        this.animationFrameId = null;
        this.lastFrameTime = 0;
        this.targetFPS = 30;
        this.frameInterval = 1000 / this.targetFPS;
        
        // Performance monitoring
        this.performanceStats = {
            averageProcessingTime: 0,
            frameRate: 0,
            droppedFrames: 0,
            totalFrames: 0,
            lastStatsUpdate: 0
        };
        
        // Background effects
        this.effects = new Map();
        
        // WebGL support
        this.webglSupported = false;
        this.webglContext = null;
        this.shaderProgram = null;
        
        this.init();
    }
    
    /**
     * Initialize virtual backgrounds system
     */
    async init() {
        this.checkWebGLSupport();
        this.setupBackgroundEffects();
        this.setupBuiltInBackgrounds();
        this.createBackgroundUI();
        this.setupEventListeners();
        
        // Load AI model if enabled
        if (this.settings.enableAIBackgroundRemoval) {
            await this.loadSegmentationModel();
        }
        
        this.injectVirtualBackgroundsCSS();
    }
    
    /**
     * Check WebGL support for hardware acceleration
     */
    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            this.webglSupported = !!gl;
            
            if (this.webglSupported) {
                this.webglContext = gl;
                this.setupWebGLShaders();
            }
        } catch (error) {
            console.warn('WebGL not supported, falling back to Canvas 2D:', error);
            this.webglSupported = false;
        }
    }
    
    /**
     * Setup WebGL shaders for hardware-accelerated processing
     */
    setupWebGLShaders() {
        if (!this.webglContext) return;
        
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
        
        // Fragment shader for background removal
        const fragmentShaderSource = `
            precision mediump float;
            uniform sampler2D u_image;
            uniform sampler2D u_mask;
            uniform sampler2D u_background;
            uniform float u_blurStrength;
            uniform int u_effectType;
            varying vec2 v_texCoord;
            
            void main() {
                vec4 originalColor = texture2D(u_image, v_texCoord);
                vec4 maskColor = texture2D(u_mask, v_texCoord);
                vec4 backgroundColor = texture2D(u_background, v_texCoord);
                
                float alpha = maskColor.r; // Use red channel as alpha
                
                if (u_effectType == 1) {
                    // Blur background
                    vec4 blurredColor = originalColor; // Simplified - would implement proper blur
                    gl_FragColor = mix(blurredColor, originalColor, alpha);
                } else if (u_effectType == 2) {
                    // Replace background
                    gl_FragColor = mix(backgroundColor, originalColor, alpha);
                } else {
                    // No effect
                    gl_FragColor = originalColor;
                }
            }
        `;
        
        // Create and compile shaders
        const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
        
        // Create shader program
        this.shaderProgram = gl.createProgram();
        gl.attachShader(this.shaderProgram, vertexShader);
        gl.attachShader(this.shaderProgram, fragmentShader);
        gl.linkProgram(this.shaderProgram);
        
        if (!gl.getProgramParameter(this.shaderProgram, gl.LINK_STATUS)) {
            console.error('WebGL shader program failed to link:', gl.getProgramInfoLog(this.shaderProgram));
            this.webglSupported = false;
        }
    }
    
    /**
     * Create WebGL shader
     */
    createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('WebGL shader compilation error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    /**
     * Load AI segmentation model
     */
    async loadSegmentationModel() {
        if (this.modelLoaded || this.modelLoading) return;
        
        this.modelLoading = true;
        
        try {
            // Check if TensorFlow.js is available
            if (typeof tf !== 'undefined') {
                // Load BodyPix model for person segmentation
                this.segmentationModel = await bodyPix.load({
                    architecture: 'MobileNetV1',
                    outputStride: 16,
                    multiplier: 0.75,
                    quantBytes: 2
                });
                
                this.modelLoaded = true;
                console.log('AI segmentation model loaded successfully');
                
                // Announce to accessibility system
                if (this.accessibilitySystem) {
                    this.accessibilitySystem.announce('AI background removal ready', 'polite');
                }
            } else {
                console.warn('TensorFlow.js not available, AI background removal disabled');
                this.settings.enableAIBackgroundRemoval = false;
            }
        } catch (error) {
            console.error('Failed to load segmentation model:', error);
            this.settings.enableAIBackgroundRemoval = false;
        } finally {
            this.modelLoading = false;
        }
    }
    
    /**
     * Setup background effects
     */
    setupBackgroundEffects() {
        // Blur effect
        this.effects.set('blur', {
            name: 'Blur Background',
            type: 'blur',
            icon: 'fas fa-circle',
            description: 'Blur the background while keeping you in focus',
            settings: {
                strength: this.settings.defaultBlurStrength,
                edgeSmoothing: true
            },
            process: (imageData, maskData, settings) => {
                return this.applyBlurEffect(imageData, maskData, settings);
            }
        });
        
        // Color effects
        this.effects.set('sepia', {
            name: 'Sepia Background',
            type: 'color',
            icon: 'fas fa-palette',
            description: 'Apply sepia tone to background',
            process: (imageData, maskData) => {
                return this.applySepiaEffect(imageData, maskData);
            }
        });
        
        this.effects.set('grayscale', {
            name: 'Grayscale Background',
            type: 'color',
            icon: 'fas fa-adjust',
            description: 'Convert background to grayscale',
            process: (imageData, maskData) => {
                return this.applyGrayscaleEffect(imageData, maskData);
            }
        });
        
        // Lighting effects
        this.effects.set('darken', {
            name: 'Darken Background',
            type: 'lighting',
            icon: 'fas fa-moon',
            description: 'Darken the background for better focus',
            process: (imageData, maskData) => {
                return this.applyDarkenEffect(imageData, maskData);
            }
        });
        
        this.effects.set('brighten', {
            name: 'Brighten Background',
            type: 'lighting',
            icon: 'fas fa-sun',
            description: 'Brighten the background',
            process: (imageData, maskData) => {
                return this.applyBrightenEffect(imageData, maskData);
            }
        });
    }

    /**
     * Start virtual background processing
     */
    async startProcessing(videoElement) {
        if (this.isProcessing) return;

        this.sourceVideo = videoElement;
        this.isProcessing = true;

        // Create processing canvases
        this.createProcessingCanvases();

        // Start processing loop
        this.processFrame();

        // Announce to accessibility system
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce('Virtual background processing started', 'polite');
        }
    }

    /**
     * Stop virtual background processing
     */
    stopProcessing() {
        this.isProcessing = false;

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Clean up canvases
        this.cleanupCanvases();

        // Announce to accessibility system
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce('Virtual background processing stopped', 'polite');
        }
    }

    /**
     * Create processing canvases
     */
    createProcessingCanvases() {
        if (!this.sourceVideo) return;

        const width = this.sourceVideo.videoWidth || 640;
        const height = this.sourceVideo.videoHeight || 480;

        // Output canvas (what users see)
        this.outputCanvas = document.createElement('canvas');
        this.outputCanvas.width = width;
        this.outputCanvas.height = height;
        this.outputContext = this.outputCanvas.getContext('2d');

        // Background canvas
        this.backgroundCanvas = document.createElement('canvas');
        this.backgroundCanvas.width = width;
        this.backgroundCanvas.height = height;
        this.backgroundContext = this.backgroundCanvas.getContext('2d');

        // Mask canvas for segmentation
        this.maskCanvas = document.createElement('canvas');
        this.maskCanvas.width = width;
        this.maskCanvas.height = height;
        this.maskContext = this.maskCanvas.getContext('2d');

        // Replace video element with canvas
        this.replaceVideoWithCanvas();
    }

    /**
     * Replace video element with processed canvas
     */
    replaceVideoWithCanvas() {
        if (!this.sourceVideo || !this.outputCanvas) return;

        // Copy video element properties
        this.outputCanvas.style.width = this.sourceVideo.style.width || '100%';
        this.outputCanvas.style.height = this.sourceVideo.style.height || '100%';
        this.outputCanvas.style.objectFit = this.sourceVideo.style.objectFit || 'cover';
        this.outputCanvas.className = this.sourceVideo.className;

        // Replace in DOM
        if (this.sourceVideo.parentNode) {
            this.sourceVideo.parentNode.replaceChild(this.outputCanvas, this.sourceVideo);
        }
    }

    /**
     * Main frame processing loop
     */
    async processFrame() {
        if (!this.isProcessing || this.processingFrame) {
            this.animationFrameId = requestAnimationFrame(() => this.processFrame());
            return;
        }

        const now = performance.now();

        // Throttle frame rate
        if (now - this.lastFrameTime < this.frameInterval) {
            this.animationFrameId = requestAnimationFrame(() => this.processFrame());
            return;
        }

        this.processingFrame = true;
        const startTime = performance.now();

        try {
            // Draw current video frame
            this.outputContext.drawImage(this.sourceVideo, 0, 0, this.outputCanvas.width, this.outputCanvas.height);

            // Apply background effect based on current type
            switch (this.currentBackgroundType) {
                case 'blur':
                    await this.processBlurBackground();
                    break;
                case 'image':
                    await this.processImageBackground();
                    break;
                case 'video':
                    await this.processVideoBackground();
                    break;
                case 'greenscreen':
                    await this.processGreenScreenBackground();
                    break;
                case 'none':
                default:
                    // No processing needed
                    break;
            }

            // Update performance stats
            this.updatePerformanceStats(performance.now() - startTime);

        } catch (error) {
            console.error('Frame processing error:', error);
        } finally {
            this.processingFrame = false;
            this.lastFrameTime = now;

            // Schedule next frame
            this.animationFrameId = requestAnimationFrame(() => this.processFrame());
        }
    }

    /**
     * Process blur background effect
     */
    async processBlurBackground() {
        if (!this.settings.enableAIBackgroundRemoval || !this.modelLoaded) {
            // Fallback to simple blur
            this.applySimpleBlur();
            return;
        }

        try {
            // Get person segmentation
            const segmentation = await this.segmentationModel.segmentPerson(this.sourceVideo, {
                flipHorizontal: false,
                internalResolution: 'medium',
                segmentationThreshold: 0.7
            });

            // Create mask from segmentation
            this.createMaskFromSegmentation(segmentation);

            // Apply blur effect
            const imageData = this.outputContext.getImageData(0, 0, this.outputCanvas.width, this.outputCanvas.height);
            const maskData = this.maskContext.getImageData(0, 0, this.maskCanvas.width, this.maskCanvas.height);

            const blurredImageData = this.applyBlurEffect(imageData, maskData, {
                strength: this.settings.defaultBlurStrength,
                edgeSmoothing: this.settings.enableEdgeSmoothing
            });

            this.outputContext.putImageData(blurredImageData, 0, 0);

        } catch (error) {
            console.error('Blur processing error:', error);
            this.applySimpleBlur();
        }
    }

    /**
     * Process image background replacement
     */
    async processImageBackground() {
        if (!this.currentBackground || !this.settings.enableAIBackgroundRemoval || !this.modelLoaded) {
            return;
        }

        try {
            // Get person segmentation
            const segmentation = await this.segmentationModel.segmentPerson(this.sourceVideo, {
                flipHorizontal: false,
                internalResolution: 'medium',
                segmentationThreshold: 0.7
            });

            // Draw background
            this.drawBackground();

            // Create mask and composite
            this.createMaskFromSegmentation(segmentation);
            this.compositeWithMask();

        } catch (error) {
            console.error('Image background processing error:', error);
        }
    }

    /**
     * Apply simple blur without AI segmentation
     */
    applySimpleBlur() {
        this.outputContext.filter = `blur(${this.settings.defaultBlurStrength}px)`;
        this.outputContext.drawImage(this.sourceVideo, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
        this.outputContext.filter = 'none';
    }

    /**
     * Create mask from AI segmentation
     */
    createMaskFromSegmentation(segmentation) {
        const { width, height, data } = segmentation;
        const imageData = this.maskContext.createImageData(width, height);

        for (let i = 0; i < data.length; i++) {
            const pixelIndex = i * 4;
            const segmentValue = data[i];

            // Person pixels = white (255), background = black (0)
            const maskValue = segmentValue === 1 ? 255 : 0;

            imageData.data[pixelIndex] = maskValue;     // R
            imageData.data[pixelIndex + 1] = maskValue; // G
            imageData.data[pixelIndex + 2] = maskValue; // B
            imageData.data[pixelIndex + 3] = 255;       // A
        }

        this.maskContext.putImageData(imageData, 0, 0);
    }

    /**
     * Draw background on background canvas
     */
    drawBackground() {
        if (!this.currentBackground) return;

        const { width, height } = this.backgroundCanvas;

        switch (this.currentBackground.type) {
            case 'solid':
                this.backgroundContext.fillStyle = this.currentBackground.color;
                this.backgroundContext.fillRect(0, 0, width, height);
                break;

            case 'gradient':
                const gradient = this.createGradientFromString(this.currentBackground.gradient);
                this.backgroundContext.fillStyle = gradient;
                this.backgroundContext.fillRect(0, 0, width, height);
                break;

            case 'image':
                if (this.currentBackground.imageElement) {
                    this.backgroundContext.drawImage(this.currentBackground.imageElement, 0, 0, width, height);
                }
                break;

            case 'video':
                if (this.currentBackground.videoElement) {
                    this.backgroundContext.drawImage(this.currentBackground.videoElement, 0, 0, width, height);
                }
                break;
        }
    }

    /**
     * Composite foreground with background using mask
     */
    compositeWithMask() {
        const width = this.outputCanvas.width;
        const height = this.outputCanvas.height;

        const foregroundData = this.outputContext.getImageData(0, 0, width, height);
        const backgroundData = this.backgroundContext.getImageData(0, 0, width, height);
        const maskData = this.maskContext.getImageData(0, 0, width, height);

        const outputData = this.outputContext.createImageData(width, height);

        for (let i = 0; i < foregroundData.data.length; i += 4) {
            const maskAlpha = maskData.data[i] / 255; // Use red channel as alpha

            // Blend foreground and background based on mask
            outputData.data[i] = foregroundData.data[i] * maskAlpha + backgroundData.data[i] * (1 - maskAlpha);         // R
            outputData.data[i + 1] = foregroundData.data[i + 1] * maskAlpha + backgroundData.data[i + 1] * (1 - maskAlpha); // G
            outputData.data[i + 2] = foregroundData.data[i + 2] * maskAlpha + backgroundData.data[i + 2] * (1 - maskAlpha); // B
            outputData.data[i + 3] = 255; // A
        }

        this.outputContext.putImageData(outputData, 0, 0);
    }

    /**
     * Apply blur effect to image data
     */
    applyBlurEffect(imageData, maskData, settings) {
        const { width, height } = imageData;
        const blurRadius = settings.strength || 5;
        const outputData = new ImageData(width, height);

        // Simple box blur implementation
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const pixelIndex = (y * width + x) * 4;
                const maskAlpha = maskData.data[pixelIndex] / 255;

                if (maskAlpha > 0.5) {
                    // Person pixel - keep original
                    outputData.data[pixelIndex] = imageData.data[pixelIndex];
                    outputData.data[pixelIndex + 1] = imageData.data[pixelIndex + 1];
                    outputData.data[pixelIndex + 2] = imageData.data[pixelIndex + 2];
                    outputData.data[pixelIndex + 3] = imageData.data[pixelIndex + 3];
                } else {
                    // Background pixel - apply blur
                    const blurredPixel = this.getBlurredPixel(imageData, x, y, blurRadius);
                    outputData.data[pixelIndex] = blurredPixel.r;
                    outputData.data[pixelIndex + 1] = blurredPixel.g;
                    outputData.data[pixelIndex + 2] = blurredPixel.b;
                    outputData.data[pixelIndex + 3] = blurredPixel.a;
                }
            }
        }

        return outputData;
    }

    /**
     * Get blurred pixel value
     */
    getBlurredPixel(imageData, centerX, centerY, radius) {
        const { width, height } = imageData;
        let r = 0, g = 0, b = 0, a = 0;
        let count = 0;

        for (let y = Math.max(0, centerY - radius); y <= Math.min(height - 1, centerY + radius); y++) {
            for (let x = Math.max(0, centerX - radius); x <= Math.min(width - 1, centerX + radius); x++) {
                const pixelIndex = (y * width + x) * 4;
                r += imageData.data[pixelIndex];
                g += imageData.data[pixelIndex + 1];
                b += imageData.data[pixelIndex + 2];
                a += imageData.data[pixelIndex + 3];
                count++;
            }
        }

        return {
            r: Math.round(r / count),
            g: Math.round(g / count),
            b: Math.round(b / count),
            a: Math.round(a / count)
        };
    }

    /**
     * Apply sepia effect
     */
    applySepiaEffect(imageData, maskData) {
        const outputData = new ImageData(imageData.width, imageData.height);

        for (let i = 0; i < imageData.data.length; i += 4) {
            const maskAlpha = maskData.data[i] / 255;

            if (maskAlpha > 0.5) {
                // Person pixel - keep original
                outputData.data[i] = imageData.data[i];
                outputData.data[i + 1] = imageData.data[i + 1];
                outputData.data[i + 2] = imageData.data[i + 2];
                outputData.data[i + 3] = imageData.data[i + 3];
            } else {
                // Background pixel - apply sepia
                const r = imageData.data[i];
                const g = imageData.data[i + 1];
                const b = imageData.data[i + 2];

                outputData.data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
                outputData.data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
                outputData.data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
                outputData.data[i + 3] = imageData.data[i + 3];
            }
        }

        return outputData;
    }

    /**
     * Apply grayscale effect
     */
    applyGrayscaleEffect(imageData, maskData) {
        const outputData = new ImageData(imageData.width, imageData.height);

        for (let i = 0; i < imageData.data.length; i += 4) {
            const maskAlpha = maskData.data[i] / 255;

            if (maskAlpha > 0.5) {
                // Person pixel - keep original
                outputData.data[i] = imageData.data[i];
                outputData.data[i + 1] = imageData.data[i + 1];
                outputData.data[i + 2] = imageData.data[i + 2];
                outputData.data[i + 3] = imageData.data[i + 3];
            } else {
                // Background pixel - apply grayscale
                const gray = imageData.data[i] * 0.299 + imageData.data[i + 1] * 0.587 + imageData.data[i + 2] * 0.114;
                outputData.data[i] = gray;
                outputData.data[i + 1] = gray;
                outputData.data[i + 2] = gray;
                outputData.data[i + 3] = imageData.data[i + 3];
            }
        }

        return outputData;
    }

    /**
     * Apply darken effect
     */
    applyDarkenEffect(imageData, maskData) {
        const outputData = new ImageData(imageData.width, imageData.height);
        const darkenFactor = 0.5;

        for (let i = 0; i < imageData.data.length; i += 4) {
            const maskAlpha = maskData.data[i] / 255;

            if (maskAlpha > 0.5) {
                // Person pixel - keep original
                outputData.data[i] = imageData.data[i];
                outputData.data[i + 1] = imageData.data[i + 1];
                outputData.data[i + 2] = imageData.data[i + 2];
                outputData.data[i + 3] = imageData.data[i + 3];
            } else {
                // Background pixel - darken
                outputData.data[i] = imageData.data[i] * darkenFactor;
                outputData.data[i + 1] = imageData.data[i + 1] * darkenFactor;
                outputData.data[i + 2] = imageData.data[i + 2] * darkenFactor;
                outputData.data[i + 3] = imageData.data[i + 3];
            }
        }

        return outputData;
    }

    /**
     * Apply brighten effect
     */
    applyBrightenEffect(imageData, maskData) {
        const outputData = new ImageData(imageData.width, imageData.height);
        const brightenFactor = 1.3;

        for (let i = 0; i < imageData.data.length; i += 4) {
            const maskAlpha = maskData.data[i] / 255;

            if (maskAlpha > 0.5) {
                // Person pixel - keep original
                outputData.data[i] = imageData.data[i];
                outputData.data[i + 1] = imageData.data[i + 1];
                outputData.data[i + 2] = imageData.data[i + 2];
                outputData.data[i + 3] = imageData.data[i + 3];
            } else {
                // Background pixel - brighten
                outputData.data[i] = Math.min(255, imageData.data[i] * brightenFactor);
                outputData.data[i + 1] = Math.min(255, imageData.data[i + 1] * brightenFactor);
                outputData.data[i + 2] = Math.min(255, imageData.data[i + 2] * brightenFactor);
                outputData.data[i + 3] = imageData.data[i + 3];
            }
        }

        return outputData;
    }

    /**
     * Set background
     */
    setBackground(backgroundId) {
        const background = this.backgrounds.get(backgroundId);
        if (!background) {
            console.error(`Background not found: ${backgroundId}`);
            return false;
        }

        this.currentBackground = background;
        this.currentBackgroundType = background.type === 'solid' || background.type === 'gradient' ? 'image' : background.type;

        // Load background asset if needed
        if (background.type === 'image' && !background.imageElement) {
            this.loadBackgroundImage(background);
        } else if (background.type === 'video' && !background.videoElement) {
            this.loadBackgroundVideo(background);
        }

        // Update UI
        this.updateBackgroundUI();

        // Announce to accessibility system
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce(`Background changed to ${background.name}`, 'polite');
        }

        return true;
    }

    /**
     * Set background effect
     */
    setBackgroundEffect(effectId) {
        const effect = this.effects.get(effectId);
        if (!effect) {
            console.error(`Effect not found: ${effectId}`);
            return false;
        }

        this.currentBackgroundType = effect.type;

        // Update UI
        this.updateEffectUI();

        // Announce to accessibility system
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce(`Background effect changed to ${effect.name}`, 'polite');
        }

        return true;
    }

    /**
     * Disable virtual background
     */
    disableBackground() {
        this.currentBackground = null;
        this.currentBackgroundType = 'none';

        // Update UI
        this.updateBackgroundUI();

        // Announce to accessibility system
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce('Virtual background disabled', 'polite');
        }
    }

    /**
     * Load background image
     */
    loadBackgroundImage(background) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            background.imageElement = img;
        };
        img.onerror = () => {
            console.error(`Failed to load background image: ${background.url}`);
        };
        img.src = background.url;
    }

    /**
     * Load background video
     */
    loadBackgroundVideo(background) {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.loop = true;
        video.muted = true;
        video.autoplay = true;
        video.onloadeddata = () => {
            background.videoElement = video;
        };
        video.onerror = () => {
            console.error(`Failed to load background video: ${background.url}`);
        };
        video.src = background.url;
    }

    /**
     * Add custom background
     */
    async addCustomBackground(file) {
        if (!file) return null;

        // Validate file
        if (!this.validateBackgroundFile(file)) {
            throw new Error('Invalid background file');
        }

        const backgroundId = `custom_${Date.now()}`;
        const fileType = file.type.startsWith('image/') ? 'image' : 'video';

        // Create object URL
        const url = URL.createObjectURL(file);

        const background = {
            id: backgroundId,
            name: file.name,
            type: fileType,
            url: url,
            file: file,
            category: 'custom',
            builtin: false,
            created: Date.now()
        };

        this.backgrounds.set(backgroundId, background);

        // Load the background
        if (fileType === 'image') {
            this.loadBackgroundImage(background);
        } else {
            this.loadBackgroundVideo(background);
        }

        // Update UI
        this.updateBackgroundsUI();

        return backgroundId;
    }

    /**
     * Remove custom background
     */
    removeCustomBackground(backgroundId) {
        const background = this.backgrounds.get(backgroundId);
        if (!background || background.builtin) {
            return false;
        }

        // Revoke object URL
        if (background.url) {
            URL.revokeObjectURL(background.url);
        }

        // Remove from collection
        this.backgrounds.delete(backgroundId);

        // Switch to no background if this was active
        if (this.currentBackground && this.currentBackground.id === backgroundId) {
            this.disableBackground();
        }

        // Update UI
        this.updateBackgroundsUI();

        return true;
    }

    /**
     * Validate background file
     */
    validateBackgroundFile(file) {
        // Check file size
        if (file.size > this.settings.maxBackgroundSize) {
            console.error(`File too large: ${file.size} bytes (max: ${this.settings.maxBackgroundSize})`);
            return false;
        }

        // Check file type
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (!this.settings.supportedFormats.includes(fileExtension)) {
            console.error(`Unsupported file format: ${fileExtension}`);
            return false;
        }

        return true;
    }

    /**
     * Create background UI
     */
    createBackgroundUI() {
        this.backgroundUI = document.createElement('div');
        this.backgroundUI.className = 'virtual-backgrounds-panel';
        this.backgroundUI.style.display = 'none';
        this.backgroundUI.innerHTML = `
            <div class="backgrounds-panel-header">
                <h3><i class="fas fa-image"></i> Virtual Backgrounds</h3>
                <button class="btn-close" id="backgrounds-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="backgrounds-panel-body">
                <div class="background-controls">
                    <button class="background-btn active" data-type="none">
                        <i class="fas fa-ban"></i>
                        <span>None</span>
                    </button>
                    <button class="background-btn" data-type="blur">
                        <i class="fas fa-circle"></i>
                        <span>Blur</span>
                    </button>
                </div>

                <div class="background-categories">
                    <div class="category-tabs">
                        <button class="category-tab active" data-category="effects">Effects</button>
                        <button class="category-tab" data-category="solid">Colors</button>
                        <button class="category-tab" data-category="gradient">Gradients</button>
                        <button class="category-tab" data-category="custom">Custom</button>
                    </div>
                </div>

                <div class="backgrounds-grid" id="backgrounds-grid">
                    <!-- Background options will be populated here -->
                </div>

                <div class="background-upload">
                    <input type="file" id="background-file-input" accept="image/*,video/*" style="display: none;">
                    <button class="btn-upload" id="upload-background-btn">
                        <i class="fas fa-upload"></i>
                        Upload Background
                    </button>
                </div>

                <div class="background-settings" id="background-settings">
                    <div class="setting-group">
                        <label for="blur-strength">Blur Strength:</label>
                        <input type="range" id="blur-strength" min="1" max="20" value="${this.settings.defaultBlurStrength}">
                        <span id="blur-strength-value">${this.settings.defaultBlurStrength}</span>
                    </div>

                    <div class="setting-group">
                        <label>
                            <input type="checkbox" id="edge-smoothing" ${this.settings.enableEdgeSmoothing ? 'checked' : ''}>
                            Edge Smoothing
                        </label>
                    </div>

                    <div class="setting-group">
                        <label>
                            <input type="checkbox" id="lighting-adjustment" ${this.settings.enableLightingAdjustment ? 'checked' : ''}>
                            Lighting Adjustment
                        </label>
                    </div>
                </div>
            </div>

            <div class="backgrounds-panel-footer">
                <div class="performance-info">
                    <span id="processing-fps">FPS: --</span>
                    <span id="processing-time">Time: --ms</span>
                </div>
            </div>
        `;

        document.body.appendChild(this.backgroundUI);
        this.setupBackgroundUIEvents();
        this.populateBackgroundsGrid();
    }

    /**
     * Setup background UI event listeners
     */
    setupBackgroundUIEvents() {
        // Close button
        this.backgroundUI.querySelector('#backgrounds-close').addEventListener('click', () => {
            this.hideBackgroundUI();
        });

        // Background controls
        this.backgroundUI.querySelectorAll('.background-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                this.handleBackgroundControlClick(type);
            });
        });

        // Category tabs
        this.backgroundUI.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category;
                this.switchBackgroundCategory(category);
            });
        });

        // Upload button
        this.backgroundUI.querySelector('#upload-background-btn').addEventListener('click', () => {
            this.backgroundUI.querySelector('#background-file-input').click();
        });

        // File input
        this.backgroundUI.querySelector('#background-file-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleBackgroundUpload(file);
            }
        });

        // Settings
        this.backgroundUI.querySelector('#blur-strength').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.settings.defaultBlurStrength = value;
            this.backgroundUI.querySelector('#blur-strength-value').textContent = value;
        });

        this.backgroundUI.querySelector('#edge-smoothing').addEventListener('change', (e) => {
            this.settings.enableEdgeSmoothing = e.target.checked;
        });

        this.backgroundUI.querySelector('#lighting-adjustment').addEventListener('change', (e) => {
            this.settings.enableLightingAdjustment = e.target.checked;
        });
    }

    /**
     * Populate backgrounds grid
     */
    populateBackgroundsGrid() {
        const grid = this.backgroundUI.querySelector('#backgrounds-grid');
        grid.innerHTML = '';

        // Add effects
        this.effects.forEach((effect, id) => {
            const effectElement = this.createEffectElement(effect, id);
            grid.appendChild(effectElement);
        });

        // Add backgrounds
        this.backgrounds.forEach((background, id) => {
            const backgroundElement = this.createBackgroundElement(background, id);
            grid.appendChild(backgroundElement);
        });
    }

    /**
     * Create effect element
     */
    createEffectElement(effect, id) {
        const element = document.createElement('div');
        element.className = 'background-item effect-item';
        element.dataset.effectId = id;
        element.innerHTML = `
            <div class="background-preview">
                <i class="${effect.icon}"></i>
            </div>
            <div class="background-name">${effect.name}</div>
        `;

        element.addEventListener('click', () => {
            this.setBackgroundEffect(id);
        });

        return element;
    }

    /**
     * Create background element
     */
    createBackgroundElement(background, id) {
        const element = document.createElement('div');
        element.className = 'background-item';
        element.dataset.backgroundId = id;

        let previewContent = '';

        switch (background.type) {
            case 'solid':
                previewContent = `<div class="color-preview" style="background-color: ${background.color}"></div>`;
                break;
            case 'gradient':
                previewContent = `<div class="gradient-preview" style="background: ${background.gradient}"></div>`;
                break;
            case 'image':
                previewContent = `<img src="${background.url}" alt="${background.name}" loading="lazy">`;
                break;
            case 'video':
                previewContent = `<video src="${background.url}" muted loop autoplay></video>`;
                break;
        }

        element.innerHTML = `
            <div class="background-preview">
                ${previewContent}
            </div>
            <div class="background-name">${background.name}</div>
            ${!background.builtin ? '<button class="btn-remove" title="Remove"><i class="fas fa-trash"></i></button>' : ''}
        `;

        element.addEventListener('click', (e) => {
            if (!e.target.closest('.btn-remove')) {
                this.setBackground(id);
            }
        });

        // Remove button for custom backgrounds
        const removeBtn = element.querySelector('.btn-remove');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeCustomBackground(id);
            });
        }

        return element;
    }

    /**
     * Show background UI
     */
    showBackgroundUI() {
        if (!this.backgroundUI) {
            this.createBackgroundUI();
        }

        this.backgroundUI.style.display = 'block';

        // Focus management
        const firstButton = this.backgroundUI.querySelector('.background-btn');
        if (firstButton) {
            firstButton.focus();
        }

        // Announce to screen reader
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce('Virtual backgrounds panel opened', 'polite');
        }
    }

    /**
     * Hide background UI
     */
    hideBackgroundUI() {
        if (this.backgroundUI) {
            this.backgroundUI.style.display = 'none';
        }

        // Announce to screen reader
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce('Virtual backgrounds panel closed', 'polite');
        }
    }

    /**
     * Handle background control click
     */
    handleBackgroundControlClick(type) {
        // Update active button
        this.backgroundUI.querySelectorAll('.background-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        this.backgroundUI.querySelector(`[data-type="${type}"]`).classList.add('active');

        switch (type) {
            case 'none':
                this.disableBackground();
                break;
            case 'blur':
                this.setBackgroundEffect('blur');
                break;
        }
    }

    /**
     * Switch background category
     */
    switchBackgroundCategory(category) {
        // Update active tab
        this.backgroundUI.querySelectorAll('.category-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        this.backgroundUI.querySelector(`[data-category="${category}"]`).classList.add('active');

        // Filter backgrounds grid
        this.filterBackgroundsGrid(category);
    }

    /**
     * Filter backgrounds grid by category
     */
    filterBackgroundsGrid(category) {
        const grid = this.backgroundUI.querySelector('#backgrounds-grid');
        const items = grid.querySelectorAll('.background-item');

        items.forEach(item => {
            const backgroundId = item.dataset.backgroundId;
            const effectId = item.dataset.effectId;

            let show = false;

            if (category === 'effects' && effectId) {
                show = true;
            } else if (backgroundId) {
                const background = this.backgrounds.get(backgroundId);
                if (background && (background.category === category || category === 'all')) {
                    show = true;
                }
            }

            item.style.display = show ? 'block' : 'none';
        });
    }

    /**
     * Handle background upload
     */
    async handleBackgroundUpload(file) {
        try {
            const backgroundId = await this.addCustomBackground(file);

            // Switch to custom category
            this.switchBackgroundCategory('custom');

            // Set as active background
            this.setBackground(backgroundId);

            // Show success feedback
            this.showUploadSuccess(file.name);

        } catch (error) {
            console.error('Background upload failed:', error);
            this.showUploadError(error.message);
        }
    }

    /**
     * Show upload success feedback
     */
    showUploadSuccess(filename) {
        // Create temporary success message
        const message = document.createElement('div');
        message.className = 'upload-feedback success';
        message.innerHTML = `<i class="fas fa-check"></i> ${filename} uploaded successfully`;

        this.backgroundUI.querySelector('.backgrounds-panel-body').appendChild(message);

        setTimeout(() => {
            message.remove();
        }, 3000);

        // Announce to screen reader
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce(`Background ${filename} uploaded successfully`, 'polite');
        }
    }

    /**
     * Show upload error feedback
     */
    showUploadError(errorMessage) {
        // Create temporary error message
        const message = document.createElement('div');
        message.className = 'upload-feedback error';
        message.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${errorMessage}`;

        this.backgroundUI.querySelector('.backgrounds-panel-body').appendChild(message);

        setTimeout(() => {
            message.remove();
        }, 5000);

        // Announce to screen reader
        if (this.accessibilitySystem) {
            this.accessibilitySystem.announce(`Upload failed: ${errorMessage}`, 'assertive');
        }
    }

    /**
     * Update performance stats
     */
    updatePerformanceStats(processingTime) {
        this.performanceStats.totalFrames++;

        // Update average processing time
        this.performanceStats.averageProcessingTime =
            (this.performanceStats.averageProcessingTime + processingTime) / 2;

        // Calculate frame rate
        const now = performance.now();
        if (now - this.performanceStats.lastStatsUpdate > 1000) {
            this.performanceStats.frameRate = this.performanceStats.totalFrames;
            this.performanceStats.totalFrames = 0;
            this.performanceStats.lastStatsUpdate = now;

            // Update UI
            this.updatePerformanceUI();
        }
    }

    /**
     * Update performance UI
     */
    updatePerformanceUI() {
        if (!this.backgroundUI) return;

        const fpsElement = this.backgroundUI.querySelector('#processing-fps');
        const timeElement = this.backgroundUI.querySelector('#processing-time');

        if (fpsElement) {
            fpsElement.textContent = `FPS: ${this.performanceStats.frameRate}`;
        }

        if (timeElement) {
            timeElement.textContent = `Time: ${Math.round(this.performanceStats.averageProcessingTime)}ms`;
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => {
            if (this.isProcessing) {
                this.handleResize();
            }
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
    }

    /**
     * Handle window resize
     */
    handleResize() {
        if (this.sourceVideo && this.outputCanvas) {
            const newWidth = this.sourceVideo.videoWidth || 640;
            const newHeight = this.sourceVideo.videoHeight || 480;

            if (this.outputCanvas.width !== newWidth || this.outputCanvas.height !== newHeight) {
                this.outputCanvas.width = newWidth;
                this.outputCanvas.height = newHeight;
                this.backgroundCanvas.width = newWidth;
                this.backgroundCanvas.height = newHeight;
                this.maskCanvas.width = newWidth;
                this.maskCanvas.height = newHeight;
            }
        }
    }

    /**
     * Handle theme change
     */
    handleThemeChange(detail) {
        const { theme } = detail;

        // Update background UI theme
        if (this.backgroundUI) {
            this.backgroundUI.setAttribute('data-theme', theme);
        }
    }

    /**
     * Handle responsive change
     */
    handleResponsiveChange(detail) {
        const { device } = detail;

        // Adjust processing quality for mobile devices
        if (device.type === 'mobile') {
            this.targetFPS = 15; // Reduce FPS for mobile
            this.frameInterval = 1000 / this.targetFPS;
        } else {
            this.targetFPS = 30; // Full FPS for desktop
            this.frameInterval = 1000 / this.targetFPS;
        }
    }

    /**
     * Clean up canvases and resources
     */
    cleanupCanvases() {
        if (this.outputCanvas) {
            this.outputCanvas.remove();
            this.outputCanvas = null;
            this.outputContext = null;
        }

        if (this.backgroundCanvas) {
            this.backgroundCanvas.remove();
            this.backgroundCanvas = null;
            this.backgroundContext = null;
        }

        if (this.maskCanvas) {
            this.maskCanvas.remove();
            this.maskCanvas = null;
            this.maskContext = null;
        }
    }

    /**
     * Create gradient from CSS string
     */
    createGradientFromString(gradientString) {
        // Simple implementation - would need more robust parsing for production
        const canvas = document.createElement('canvas');
        canvas.width = this.backgroundCanvas.width;
        canvas.height = this.backgroundCanvas.height;
        const ctx = canvas.getContext('2d');

        // Create linear gradient (simplified)
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');

        return gradient;
    }

    /**
     * Update background UI
     */
    updateBackgroundUI() {
        if (!this.backgroundUI) return;

        // Update active background
        this.backgroundUI.querySelectorAll('.background-item').forEach(item => {
            item.classList.remove('active');
        });

        if (this.currentBackground) {
            const activeItem = this.backgroundUI.querySelector(`[data-background-id="${this.currentBackground.id}"]`);
            if (activeItem) {
                activeItem.classList.add('active');
            }
        }
    }

    /**
     * Update effect UI
     */
    updateEffectUI() {
        if (!this.backgroundUI) return;

        // Update active effect
        this.backgroundUI.querySelectorAll('.effect-item').forEach(item => {
            item.classList.remove('active');
        });

        if (this.currentBackgroundType !== 'none' && this.currentBackgroundType !== 'image') {
            const activeItem = this.backgroundUI.querySelector(`[data-effect-id="${this.currentBackgroundType}"]`);
            if (activeItem) {
                activeItem.classList.add('active');
            }
        }
    }

    /**
     * Update backgrounds UI
     */
    updateBackgroundsUI() {
        if (this.backgroundUI) {
            this.populateBackgroundsGrid();
        }
    }

    /**
     * Inject virtual backgrounds CSS
     */
    injectVirtualBackgroundsCSS() {
        if (document.getElementById('virtual-backgrounds-css')) return;

        const style = document.createElement('style');
        style.id = 'virtual-backgrounds-css';
        style.textContent = `
            /* Virtual Backgrounds Panel */
            .virtual-backgrounds-panel {
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

            .backgrounds-panel-header {
                padding: 20px;
                border-bottom: 1px solid var(--border-color, #444);
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: var(--input-dark, #3a3a3a);
            }

            .backgrounds-panel-header h3 {
                margin: 0;
                color: var(--primary-color, #ff0000);
                font-size: 1.2rem;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .backgrounds-panel-body {
                flex: 1;
                padding: 20px;
                overflow-y: auto;
            }

            .background-controls {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
            }

            .background-btn {
                background: var(--input-dark, #3a3a3a);
                border: 1px solid var(--border-color, #444);
                color: var(--text-light, #fff);
                padding: 10px 15px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 0.9rem;
            }

            .background-btn:hover,
            .background-btn.active {
                background: var(--primary-color, #ff0000);
                border-color: var(--primary-color, #ff0000);
            }

            .category-tabs {
                display: flex;
                gap: 5px;
                margin-bottom: 15px;
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

            .backgrounds-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
                gap: 10px;
                margin-bottom: 20px;
            }

            .background-item {
                position: relative;
                aspect-ratio: 16/9;
                border-radius: 6px;
                overflow: hidden;
                cursor: pointer;
                transition: all 0.2s ease;
                border: 2px solid transparent;
            }

            .background-item:hover {
                border-color: var(--primary-color, #ff0000);
                transform: scale(1.05);
            }

            .background-item.active {
                border-color: var(--primary-color, #ff0000);
                box-shadow: 0 0 0 2px rgba(255, 0, 0, 0.3);
            }

            .background-preview {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--input-dark, #3a3a3a);
                position: relative;
            }

            .background-preview img,
            .background-preview video {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .color-preview,
            .gradient-preview {
                width: 100%;
                height: 100%;
            }

            .background-preview i {
                font-size: 24px;
                color: var(--text-light, #fff);
            }

            .background-name {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 4px 6px;
                font-size: 0.7rem;
                text-align: center;
            }

            .btn-remove {
                position: absolute;
                top: 4px;
                right: 4px;
                background: rgba(220, 53, 69, 0.9);
                border: none;
                color: white;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.7rem;
                opacity: 0;
                transition: opacity 0.2s ease;
            }

            .background-item:hover .btn-remove {
                opacity: 1;
            }

            .background-upload {
                margin-bottom: 20px;
            }

            .btn-upload {
                background: var(--primary-color, #ff0000);
                border: none;
                color: white;
                padding: 10px 15px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 0.9rem;
                width: 100%;
                justify-content: center;
            }

            .btn-upload:hover {
                background: var(--primary-color-dark, #cc0000);
            }

            .background-settings {
                border-top: 1px solid var(--border-color, #444);
                padding-top: 15px;
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

            .setting-group input[type="range"] {
                width: 100%;
                margin-right: 10px;
            }

            .setting-group input[type="checkbox"] {
                margin-right: 8px;
            }

            .backgrounds-panel-footer {
                padding: 15px 20px;
                border-top: 1px solid var(--border-color, #444);
                background: var(--input-dark, #3a3a3a);
            }

            .performance-info {
                display: flex;
                gap: 20px;
                font-size: 0.8rem;
                color: var(--text-muted, #aaa);
            }

            .upload-feedback {
                position: absolute;
                top: 10px;
                right: 10px;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 0.8rem;
                display: flex;
                align-items: center;
                gap: 6px;
                z-index: 1000;
            }

            .upload-feedback.success {
                background: var(--success-color, #28a745);
                color: white;
            }

            .upload-feedback.error {
                background: var(--danger-color, #dc3545);
                color: white;
            }

            /* Responsive Design */
            @media (max-width: 768px) {
                .virtual-backgrounds-panel {
                    width: 95vw;
                    height: 80vh;
                }

                .backgrounds-grid {
                    grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
                    gap: 8px;
                }

                .background-controls {
                    flex-wrap: wrap;
                }

                .category-tabs {
                    flex-wrap: wrap;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // Public API methods

    /**
     * Enable virtual backgrounds
     */
    enable() {
        this.settings.enabled = true;
    }

    /**
     * Disable virtual backgrounds
     */
    disable() {
        this.settings.enabled = false;
        this.stopProcessing();
    }

    /**
     * Check if virtual backgrounds are enabled
     */
    isEnabled() {
        return this.settings.enabled;
    }

    /**
     * Get current background
     */
    getCurrentBackground() {
        return this.currentBackground;
    }

    /**
     * Get current background type
     */
    getCurrentBackgroundType() {
        return this.currentBackgroundType;
    }

    /**
     * Get all backgrounds
     */
    getAllBackgrounds() {
        return this.backgrounds;
    }

    /**
     * Get all effects
     */
    getAllEffects() {
        return this.effects;
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        return { ...this.performanceStats };
    }

    /**
     * Update settings
     */
    updateSettings(newSettings) {
        Object.assign(this.settings, newSettings);
    }

    /**
     * Get settings
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * Check if AI background removal is available
     */
    isAIBackgroundRemovalAvailable() {
        return this.modelLoaded;
    }

    /**
     * Check if WebGL acceleration is available
     */
    isWebGLAccelerationAvailable() {
        return this.webglSupported;
    }

    /**
     * Get processing canvas (for integration)
     */
    getProcessingCanvas() {
        return this.outputCanvas;
    }

    /**
     * Destroy virtual backgrounds system
     */
    destroy() {
        this.stopProcessing();
        this.cleanupCanvases();

        if (this.backgroundUI) {
            this.backgroundUI.remove();
        }

        // Clean up object URLs
        this.backgrounds.forEach(background => {
            if (background.url && !background.builtin) {
                URL.revokeObjectURL(background.url);
            }
        });

        // Remove CSS
        const style = document.getElementById('virtual-backgrounds-css');
        if (style) {
            style.remove();
        }
    }
}
    
    /**
     * Setup built-in backgrounds
     */
    setupBuiltInBackgrounds() {
        // Solid color backgrounds
        this.backgrounds.set('solid-blue', {
            id: 'solid-blue',
            name: 'Blue Background',
            type: 'solid',
            color: '#0066cc',
            category: 'solid',
            builtin: true
        });
        
        this.backgrounds.set('solid-green', {
            id: 'solid-green',
            name: 'Green Background',
            type: 'solid',
            color: '#00cc66',
            category: 'solid',
            builtin: true
        });
        
        this.backgrounds.set('solid-red', {
            id: 'solid-red',
            name: 'Red Background',
            type: 'solid',
            color: '#cc0000',
            category: 'solid',
            builtin: true
        });
        
        this.backgrounds.set('solid-black', {
            id: 'solid-black',
            name: 'Black Background',
            type: 'solid',
            color: '#000000',
            category: 'solid',
            builtin: true
        });
        
        this.backgrounds.set('solid-white', {
            id: 'solid-white',
            name: 'White Background',
            type: 'solid',
            color: '#ffffff',
            category: 'solid',
            builtin: true
        });
        
        // Gradient backgrounds
        this.backgrounds.set('gradient-blue', {
            id: 'gradient-blue',
            name: 'Blue Gradient',
            type: 'gradient',
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            category: 'gradient',
            builtin: true
        });
        
        this.backgrounds.set('gradient-sunset', {
            id: 'gradient-sunset',
            name: 'Sunset Gradient',
            type: 'gradient',
            gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)',
            category: 'gradient',
            builtin: true
        });
        
        this.backgrounds.set('gradient-ocean', {
            id: 'gradient-ocean',
            name: 'Ocean Gradient',
            type: 'gradient',
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            category: 'gradient',
            builtin: true
        });
    }
