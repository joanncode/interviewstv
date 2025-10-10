/**
 * PlatformAdapter - Cross-Platform Compatibility Layer
 * 
 * Handles:
 * - Platform detection and feature adaptation
 * - Unified API across web, mobile, desktop, and TV
 * - Device-specific optimizations
 * - Input method adaptation (touch, mouse, keyboard, remote)
 * - Screen size and orientation handling
 * - Performance optimization per platform
 * - Feature availability detection
 * - Platform-specific UI/UX adaptations
 */

class PlatformAdapter {
  constructor() {
    this.platform = this.detectPlatform();
    this.capabilities = this.detectCapabilities();
    this.inputMethods = this.detectInputMethods();
    this.screenInfo = this.getScreenInfo();
    
    // Platform-specific configurations
    this.config = {
      web: {
        streaming: {
          preferredCodec: 'h264',
          maxBitrate: 5000000,
          adaptiveBitrate: true,
          webrtcSupport: true
        },
        ui: {
          navigation: 'mouse',
          layout: 'desktop',
          gestures: false,
          contextMenu: true
        },
        features: {
          fullscreen: true,
          pictureInPicture: true,
          notifications: true,
          offline: true,
          fileUpload: true
        }
      },
      mobile: {
        streaming: {
          preferredCodec: 'h264',
          maxBitrate: 2500000,
          adaptiveBitrate: true,
          webrtcSupport: true
        },
        ui: {
          navigation: 'touch',
          layout: 'mobile',
          gestures: true,
          contextMenu: false
        },
        features: {
          fullscreen: true,
          pictureInPicture: true,
          notifications: true,
          offline: true,
          camera: true,
          microphone: true,
          orientation: true
        }
      },
      desktop: {
        streaming: {
          preferredCodec: 'h264',
          maxBitrate: 8000000,
          adaptiveBitrate: true,
          webrtcSupport: true
        },
        ui: {
          navigation: 'mouse',
          layout: 'desktop',
          gestures: false,
          contextMenu: true,
          multiWindow: true
        },
        features: {
          fullscreen: true,
          pictureInPicture: true,
          notifications: true,
          offline: true,
          fileUpload: true,
          systemIntegration: true
        }
      },
      tv: {
        streaming: {
          preferredCodec: 'h264',
          maxBitrate: 10000000,
          adaptiveBitrate: true,
          webrtcSupport: false
        },
        ui: {
          navigation: 'remote',
          layout: 'tv',
          gestures: false,
          contextMenu: false,
          focusManagement: true
        },
        features: {
          fullscreen: true,
          pictureInPicture: false,
          notifications: false,
          offline: false,
          voice: true
        }
      }
    };

    // Initialize platform-specific features
    this.initializePlatform();
  }

  /**
   * Detect current platform
   */
  detectPlatform() {
    // Check for React Native
    if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
      return 'mobile';
    }

    // Check for Electron (desktop app)
    if (typeof window !== 'undefined' && window.process && window.process.type) {
      return 'desktop';
    }

    // Check for TV platforms
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      
      if (userAgent.includes('smart-tv') || 
          userAgent.includes('tizen') || 
          userAgent.includes('webos') || 
          userAgent.includes('roku') ||
          userAgent.includes('appletv')) {
        return 'tv';
      }

      // Check for mobile browsers
      if (/android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
        return 'mobile';
      }
    }

    // Default to web
    return 'web';
  }

  /**
   * Detect platform capabilities
   */
  detectCapabilities() {
    const capabilities = {
      webrtc: false,
      mediaDevices: false,
      fullscreen: false,
      pictureInPicture: false,
      notifications: false,
      serviceWorker: false,
      webgl: false,
      touch: false,
      orientation: false,
      vibration: false,
      geolocation: false,
      camera: false,
      microphone: false,
      speakers: false
    };

    if (typeof window === 'undefined') {
      return capabilities;
    }

    // WebRTC support
    capabilities.webrtc = !!(window.RTCPeerConnection || 
                            window.mozRTCPeerConnection || 
                            window.webkitRTCPeerConnection);

    // Media devices
    capabilities.mediaDevices = !!(navigator.mediaDevices && 
                                  navigator.mediaDevices.getUserMedia);

    // Fullscreen API
    capabilities.fullscreen = !!(document.fullscreenEnabled || 
                                document.webkitFullscreenEnabled || 
                                document.mozFullScreenEnabled);

    // Picture-in-Picture
    capabilities.pictureInPicture = !!document.pictureInPictureEnabled;

    // Notifications
    capabilities.notifications = !!window.Notification;

    // Service Worker
    capabilities.serviceWorker = !!navigator.serviceWorker;

    // WebGL
    try {
      const canvas = document.createElement('canvas');
      capabilities.webgl = !!(canvas.getContext('webgl') || 
                             canvas.getContext('experimental-webgl'));
    } catch (e) {
      capabilities.webgl = false;
    }

    // Touch support
    capabilities.touch = !!(window.ontouchstart !== undefined || 
                           navigator.maxTouchPoints > 0);

    // Orientation
    capabilities.orientation = !!window.orientation !== undefined;

    // Vibration
    capabilities.vibration = !!navigator.vibrate;

    // Geolocation
    capabilities.geolocation = !!navigator.geolocation;

    // Camera/Microphone (requires permission check)
    capabilities.camera = capabilities.mediaDevices;
    capabilities.microphone = capabilities.mediaDevices;
    capabilities.speakers = !!window.AudioContext || !!window.webkitAudioContext;

    return capabilities;
  }

  /**
   * Detect available input methods
   */
  detectInputMethods() {
    const methods = {
      mouse: false,
      touch: false,
      keyboard: true, // Assume keyboard is always available
      gamepad: false,
      voice: false
    };

    if (typeof window === 'undefined') {
      return methods;
    }

    // Mouse support
    methods.mouse = !this.capabilities.touch || this.platform === 'desktop';

    // Touch support
    methods.touch = this.capabilities.touch;

    // Gamepad support
    methods.gamepad = !!navigator.getGamepads;

    // Voice support (basic check)
    methods.voice = !!(window.SpeechRecognition || 
                      window.webkitSpeechRecognition);

    return methods;
  }

  /**
   * Get screen information
   */
  getScreenInfo() {
    const info = {
      width: 1920,
      height: 1080,
      pixelRatio: 1,
      orientation: 'landscape',
      type: 'desktop'
    };

    if (typeof window === 'undefined') {
      return info;
    }

    info.width = window.screen.width;
    info.height = window.screen.height;
    info.pixelRatio = window.devicePixelRatio || 1;

    // Determine orientation
    if (info.width > info.height) {
      info.orientation = 'landscape';
    } else {
      info.orientation = 'portrait';
    }

    // Determine screen type
    if (info.width <= 768) {
      info.type = 'mobile';
    } else if (info.width <= 1024) {
      info.type = 'tablet';
    } else if (info.width >= 1920) {
      info.type = 'tv';
    } else {
      info.type = 'desktop';
    }

    return info;
  }

  /**
   * Get platform-specific configuration
   */
  getConfig() {
    return this.config[this.platform] || this.config.web;
  }

  /**
   * Get optimal streaming configuration for current platform
   */
  getStreamingConfig() {
    const config = this.getConfig().streaming;
    const networkType = this.getNetworkType();
    
    // Adjust based on network conditions
    if (networkType === 'cellular' || networkType === '3g') {
      config.maxBitrate = Math.min(config.maxBitrate, 1000000); // 1 Mbps max on cellular
    }

    // Adjust based on screen size
    if (this.screenInfo.type === 'mobile') {
      config.maxBitrate = Math.min(config.maxBitrate, 2000000); // 2 Mbps max on mobile
    }

    return config;
  }

  /**
   * Get UI configuration for current platform
   */
  getUIConfig() {
    const config = this.getConfig().ui;
    
    // Add responsive breakpoints
    config.breakpoints = {
      mobile: 768,
      tablet: 1024,
      desktop: 1440,
      tv: 1920
    };

    // Add current screen classification
    config.currentScreen = this.screenInfo.type;
    config.isTouch = this.inputMethods.touch;
    config.isMobile = this.platform === 'mobile';
    config.isTV = this.platform === 'tv';

    return config;
  }

  /**
   * Check if feature is available on current platform
   */
  isFeatureAvailable(feature) {
    const platformConfig = this.getConfig();
    return platformConfig.features[feature] && this.capabilities[feature];
  }

  /**
   * Get optimal video player configuration
   */
  getVideoPlayerConfig() {
    const config = {
      controls: true,
      autoplay: false,
      muted: false,
      loop: false,
      preload: 'metadata',
      crossOrigin: 'anonymous'
    };

    switch (this.platform) {
      case 'mobile':
        config.controls = true;
        config.playsinline = true;
        config.preload = 'none'; // Save bandwidth on mobile
        break;
        
      case 'tv':
        config.controls = false; // Use custom TV-friendly controls
        config.autoplay = true;
        config.muted = true; // Start muted for autoplay
        break;
        
      case 'desktop':
        config.controls = true;
        config.preload = 'metadata';
        break;
        
      default:
        // Web defaults
        break;
    }

    return config;
  }

  /**
   * Get input handling configuration
   */
  getInputConfig() {
    const config = {
      primaryInput: 'mouse',
      gestures: false,
      shortcuts: true,
      contextMenu: true,
      focusManagement: false
    };

    switch (this.platform) {
      case 'mobile':
        config.primaryInput = 'touch';
        config.gestures = true;
        config.shortcuts = false;
        config.contextMenu = false;
        break;
        
      case 'tv':
        config.primaryInput = 'remote';
        config.gestures = false;
        config.shortcuts = true;
        config.contextMenu = false;
        config.focusManagement = true;
        break;
        
      case 'desktop':
        config.primaryInput = 'mouse';
        config.shortcuts = true;
        break;
        
      default:
        // Web defaults
        break;
    }

    return config;
  }

  /**
   * Get network type (if available)
   */
  getNetworkType() {
    if (typeof navigator !== 'undefined' && navigator.connection) {
      return navigator.connection.effectiveType || navigator.connection.type;
    }
    return 'unknown';
  }

  /**
   * Initialize platform-specific features
   */
  initializePlatform() {
    switch (this.platform) {
      case 'mobile':
        this.initializeMobile();
        break;
      case 'desktop':
        this.initializeDesktop();
        break;
      case 'tv':
        this.initializeTV();
        break;
      default:
        this.initializeWeb();
        break;
    }
  }

  /**
   * Initialize mobile-specific features
   */
  initializeMobile() {
    // Prevent zoom on double tap
    if (typeof document !== 'undefined') {
      document.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) {
          e.preventDefault();
        }
      });

      // Handle orientation changes
      window.addEventListener('orientationchange', () => {
        setTimeout(() => {
          this.screenInfo = this.getScreenInfo();
          this.onOrientationChange && this.onOrientationChange(this.screenInfo);
        }, 100);
      });
    }
  }

  /**
   * Initialize desktop-specific features
   */
  initializeDesktop() {
    // Handle window resize
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        this.screenInfo = this.getScreenInfo();
        this.onScreenResize && this.onScreenResize(this.screenInfo);
      });
    }
  }

  /**
   * Initialize TV-specific features
   */
  initializeTV() {
    // Set up remote control navigation
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', (e) => {
        this.handleTVRemoteInput(e);
      });
    }
  }

  /**
   * Initialize web-specific features
   */
  initializeWeb() {
    // Standard web initialization
    if (typeof window !== 'undefined') {
      // Handle visibility changes
      document.addEventListener('visibilitychange', () => {
        this.onVisibilityChange && this.onVisibilityChange(!document.hidden);
      });
    }
  }

  /**
   * Handle TV remote control input
   */
  handleTVRemoteInput(event) {
    const keyMap = {
      37: 'left',    // Left arrow
      38: 'up',      // Up arrow
      39: 'right',   // Right arrow
      40: 'down',    // Down arrow
      13: 'select',  // Enter
      27: 'back',    // Escape
      32: 'play',    // Space
      77: 'menu'     // M key
    };

    const action = keyMap[event.keyCode];
    if (action && this.onTVRemoteInput) {
      event.preventDefault();
      this.onTVRemoteInput(action, event);
    }
  }

  /**
   * Adapt content for current platform
   */
  adaptContent(content) {
    const adapted = { ...content };
    
    switch (this.platform) {
      case 'mobile':
        // Optimize for mobile
        adapted.images = this.optimizeImagesForMobile(content.images);
        adapted.videos = this.optimizeVideosForMobile(content.videos);
        break;
        
      case 'tv':
        // Optimize for TV
        adapted.layout = 'tv-grid';
        adapted.fontSize = 'large';
        adapted.navigation = 'focus-based';
        break;
        
      case 'desktop':
        // Optimize for desktop
        adapted.layout = 'multi-column';
        adapted.interactions = 'hover-enabled';
        break;
    }

    return adapted;
  }

  /**
   * Optimize images for mobile
   */
  optimizeImagesForMobile(images) {
    if (!images) return images;
    
    return images.map(img => ({
      ...img,
      src: img.src.replace(/\.(jpg|jpeg|png)$/, '_mobile.$1'),
      loading: 'lazy',
      sizes: '(max-width: 768px) 100vw, 50vw'
    }));
  }

  /**
   * Optimize videos for mobile
   */
  optimizeVideosForMobile(videos) {
    if (!videos) return videos;
    
    return videos.map(video => ({
      ...video,
      preload: 'none',
      controls: true,
      playsinline: true,
      muted: true
    }));
  }

  /**
   * Get platform-specific CSS classes
   */
  getPlatformClasses() {
    const classes = [
      `platform-${this.platform}`,
      `screen-${this.screenInfo.type}`,
      `orientation-${this.screenInfo.orientation}`
    ];

    if (this.inputMethods.touch) {
      classes.push('touch-enabled');
    }

    if (this.capabilities.webrtc) {
      classes.push('webrtc-supported');
    }

    return classes.join(' ');
  }

  /**
   * Set event listeners for platform changes
   */
  setEventListeners(listeners) {
    this.onOrientationChange = listeners.onOrientationChange;
    this.onScreenResize = listeners.onScreenResize;
    this.onVisibilityChange = listeners.onVisibilityChange;
    this.onTVRemoteInput = listeners.onTVRemoteInput;
  }

  /**
   * Get platform information summary
   */
  getPlatformInfo() {
    return {
      platform: this.platform,
      capabilities: this.capabilities,
      inputMethods: this.inputMethods,
      screenInfo: this.screenInfo,
      config: this.getConfig(),
      networkType: this.getNetworkType()
    };
  }
}

export default PlatformAdapter;
