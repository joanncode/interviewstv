/**
 * CastingManager - Native Platform Integrations
 * 
 * Handles:
 * - Google Chromecast integration
 * - Apple AirPlay support
 * - Smart TV platform integration (Samsung Tizen, LG webOS, Roku)
 * - Amazon Fire TV integration
 * - Android TV and Apple TV apps
 * - Cross-platform casting protocols
 * - Remote control handling
 * - Multi-screen experiences
 */

class CastingManager {
  constructor() {
    this.isInitialized = false;
    this.currentSession = null;
    this.availableDevices = new Map();
    this.castingState = 'disconnected'; // disconnected, connecting, connected
    
    // Platform detection
    this.platforms = {
      chromecast: false,
      airplay: false,
      dlna: false,
      miracast: false,
      smartTV: false
    };

    // Configuration for different platforms
    this.config = {
      chromecast: {
        applicationId: 'CC1AD845', // Default Media Receiver
        customApplicationId: 'A1B2C3D4', // Custom Interviews.tv receiver
        namespace: 'urn:x-cast:tv.interviews.cast',
        autoJoinPolicy: 'TAB_AND_ORIGIN_SCOPED',
        language: 'en-US',
        receiverApplicationId: 'A1B2C3D4'
      },
      airplay: {
        serviceName: 'Interviews.tv',
        serviceType: '_airplay._tcp',
        features: ['video', 'audio', 'photo'],
        requiresAuth: false
      },
      smartTV: {
        samsung: {
          appId: 'tv.interviews.tizen',
          channelId: 'interviews-tv-channel'
        },
        lg: {
          appId: 'tv.interviews.webos',
          channelId: 'interviews-tv-webos'
        },
        roku: {
          appId: 'interviews-tv-roku',
          channelId: '123456'
        },
        androidTV: {
          packageName: 'tv.interviews.android',
          activityName: 'MainActivity'
        },
        appleTV: {
          bundleId: 'tv.interviews.tvos',
          scheme: 'interviews-tv'
        }
      }
    };

    // Event listeners
    this.listeners = {
      onDeviceFound: null,
      onDeviceLost: null,
      onSessionStarted: null,
      onSessionEnded: null,
      onCastStateChanged: null,
      onMediaStatusChanged: null,
      onError: null
    };

    // Initialize platform support detection
    this.detectPlatformSupport();
  }

  /**
   * Initialize casting manager
   */
  async initialize() {
    try {
      console.log('Initializing CastingManager...');
      
      // Initialize supported platforms
      if (this.platforms.chromecast) {
        await this.initializeChromecast();
      }
      
      if (this.platforms.airplay) {
        await this.initializeAirPlay();
      }
      
      if (this.platforms.smartTV) {
        await this.initializeSmartTV();
      }

      // Start device discovery
      await this.startDeviceDiscovery();
      
      this.isInitialized = true;
      console.log('CastingManager initialized successfully');
      
      return { success: true, platforms: this.platforms };
    } catch (error) {
      console.error('Failed to initialize CastingManager:', error);
      throw error;
    }
  }

  /**
   * Detect platform support
   */
  detectPlatformSupport() {
    // Chromecast support
    this.platforms.chromecast = !!(
      window.chrome && 
      window.chrome.cast && 
      window.chrome.cast.isAvailable
    );

    // AirPlay support (Safari on iOS/macOS)
    this.platforms.airplay = !!(
      window.WebKitPlaybackTargetAvailabilityEvent ||
      (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome'))
    );

    // Smart TV detection
    this.platforms.smartTV = this.detectSmartTVPlatform();

    // DLNA support (basic detection)
    this.platforms.dlna = !!(window.navigator && window.navigator.getDisplayMedia);

    console.log('Platform support detected:', this.platforms);
  }

  /**
   * Detect Smart TV platform
   */
  detectSmartTVPlatform() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Samsung Tizen
    if (userAgent.includes('tizen') || window.tizen) {
      return 'samsung';
    }
    
    // LG webOS
    if (userAgent.includes('webos') || window.webOS) {
      return 'lg';
    }
    
    // Roku
    if (userAgent.includes('roku') || window.roku) {
      return 'roku';
    }
    
    // Android TV
    if (userAgent.includes('android') && userAgent.includes('tv')) {
      return 'androidtv';
    }
    
    // Apple TV
    if (userAgent.includes('appletv') || window.tvjs) {
      return 'appletv';
    }
    
    return false;
  }

  /**
   * Initialize Chromecast
   */
  async initializeChromecast() {
    return new Promise((resolve, reject) => {
      if (!window.chrome || !window.chrome.cast) {
        reject(new Error('Chromecast API not available'));
        return;
      }

      const initializeCastApi = () => {
        const sessionRequest = new chrome.cast.SessionRequest(
          this.config.chromecast.customApplicationId
        );
        
        const apiConfig = new chrome.cast.ApiConfig(
          sessionRequest,
          this.onChromecastSessionListener.bind(this),
          this.onChromecastReceiverListener.bind(this),
          this.config.chromecast.autoJoinPolicy
        );

        chrome.cast.initialize(
          apiConfig,
          () => {
            console.log('Chromecast initialized successfully');
            resolve();
          },
          (error) => {
            console.error('Chromecast initialization failed:', error);
            reject(error);
          }
        );
      };

      if (chrome.cast.isAvailable) {
        initializeCastApi();
      } else {
        window['__onGCastApiAvailable'] = (isAvailable) => {
          if (isAvailable) {
            initializeCastApi();
          } else {
            reject(new Error('Chromecast API not available'));
          }
        };
      }
    });
  }

  /**
   * Initialize AirPlay
   */
  async initializeAirPlay() {
    try {
      console.log('Initializing AirPlay...');
      
      // AirPlay is handled through HTML5 video element
      // We'll set up event listeners for AirPlay availability
      
      if (window.WebKitPlaybackTargetAvailabilityEvent) {
        document.addEventListener('webkitplaybacktargetavailabilitychanged', (event) => {
          this.handleAirPlayAvailabilityChange(event);
        });
      }
      
      console.log('AirPlay initialized successfully');
    } catch (error) {
      console.error('AirPlay initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize Smart TV platforms
   */
  async initializeSmartTV() {
    const platform = this.platforms.smartTV;
    
    try {
      switch (platform) {
        case 'samsung':
          await this.initializeSamsungTizen();
          break;
        case 'lg':
          await this.initializeLGWebOS();
          break;
        case 'roku':
          await this.initializeRoku();
          break;
        case 'androidtv':
          await this.initializeAndroidTV();
          break;
        case 'appletv':
          await this.initializeAppleTV();
          break;
        default:
          console.log('Smart TV platform not specifically supported');
      }
    } catch (error) {
      console.error('Smart TV initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize Samsung Tizen
   */
  async initializeSamsungTizen() {
    if (window.tizen) {
      console.log('Initializing Samsung Tizen...');
      
      // Register for remote control events
      tizen.tvinputdevice.registerKey('MediaPlay');
      tizen.tvinputdevice.registerKey('MediaPause');
      tizen.tvinputdevice.registerKey('MediaStop');
      tizen.tvinputdevice.registerKey('MediaRewind');
      tizen.tvinputdevice.registerKey('MediaFastForward');
      
      // Set up key event listeners
      document.addEventListener('keydown', this.handleTizenKeyEvent.bind(this));
      
      console.log('Samsung Tizen initialized successfully');
    }
  }

  /**
   * Initialize LG webOS
   */
  async initializeLGWebOS() {
    if (window.webOS) {
      console.log('Initializing LG webOS...');
      
      // Initialize webOS services
      webOS.service.request('luna://com.webos.service.tv.systemproperty', {
        method: 'getSystemInfo',
        parameters: {},
        onSuccess: (result) => {
          console.log('webOS system info:', result);
        },
        onFailure: (error) => {
          console.error('webOS system info failed:', error);
        }
      });
      
      console.log('LG webOS initialized successfully');
    }
  }

  /**
   * Initialize Roku
   */
  async initializeRoku() {
    console.log('Initializing Roku...');
    // Roku initialization would be handled in the Roku app itself
    // This is for web-based Roku channel
  }

  /**
   * Initialize Android TV
   */
  async initializeAndroidTV() {
    console.log('Initializing Android TV...');
    
    // Set up D-pad navigation
    document.addEventListener('keydown', this.handleAndroidTVKeyEvent.bind(this));
    
    // Enable focus management for TV navigation
    this.enableTVFocusManagement();
  }

  /**
   * Initialize Apple TV
   */
  async initializeAppleTV() {
    if (window.tvjs) {
      console.log('Initializing Apple TV...');
      
      // Set up Apple TV remote events
      document.addEventListener('keydown', this.handleAppleTVKeyEvent.bind(this));
      
      console.log('Apple TV initialized successfully');
    }
  }

  /**
   * Start device discovery
   */
  async startDeviceDiscovery() {
    try {
      console.log('Starting device discovery...');
      
      // Chromecast device discovery
      if (this.platforms.chromecast) {
        this.startChromecastDiscovery();
      }
      
      // AirPlay device discovery
      if (this.platforms.airplay) {
        this.startAirPlayDiscovery();
      }
      
      // DLNA device discovery
      if (this.platforms.dlna) {
        this.startDLNADiscovery();
      }
      
      console.log('Device discovery started');
    } catch (error) {
      console.error('Device discovery failed:', error);
      throw error;
    }
  }

  /**
   * Cast media to selected device
   */
  async castMedia(mediaInfo, deviceId) {
    try {
      console.log('Casting media to device:', deviceId);
      
      const device = this.availableDevices.get(deviceId);
      if (!device) {
        throw new Error('Device not found');
      }

      switch (device.type) {
        case 'chromecast':
          return await this.castToChromecast(mediaInfo, device);
        case 'airplay':
          return await this.castToAirPlay(mediaInfo, device);
        case 'dlna':
          return await this.castToDLNA(mediaInfo, device);
        default:
          throw new Error(`Unsupported device type: ${device.type}`);
      }
    } catch (error) {
      console.error('Casting failed:', error);
      if (this.listeners.onError) {
        this.listeners.onError(error);
      }
      throw error;
    }
  }

  /**
   * Cast to Chromecast
   */
  async castToChromecast(mediaInfo, device) {
    return new Promise((resolve, reject) => {
      chrome.cast.requestSession(
        (session) => {
          this.currentSession = session;
          this.castingState = 'connected';
          
          const mediaRequest = new chrome.cast.media.LoadRequest(mediaInfo);
          
          session.loadMedia(
            mediaRequest,
            (media) => {
              console.log('Media loaded on Chromecast');
              if (this.listeners.onSessionStarted) {
                this.listeners.onSessionStarted(session, media);
              }
              resolve({ session, media });
            },
            (error) => {
              console.error('Failed to load media on Chromecast:', error);
              reject(error);
            }
          );
        },
        (error) => {
          console.error('Failed to create Chromecast session:', error);
          reject(error);
        }
      );
    });
  }

  /**
   * Cast to AirPlay
   */
  async castToAirPlay(mediaInfo, device) {
    try {
      // AirPlay casting is handled through HTML5 video element
      const video = document.createElement('video');
      video.src = mediaInfo.contentId;
      video.controls = true;
      
      if (video.webkitShowPlaybackTargetPicker) {
        video.webkitShowPlaybackTargetPicker();
      }
      
      console.log('AirPlay casting initiated');
      return { success: true };
    } catch (error) {
      console.error('AirPlay casting failed:', error);
      throw error;
    }
  }

  /**
   * Cast to DLNA device
   */
  async castToDLNA(mediaInfo, device) {
    try {
      // DLNA casting implementation
      console.log('DLNA casting not fully implemented');
      return { success: false, message: 'DLNA casting not implemented' };
    } catch (error) {
      console.error('DLNA casting failed:', error);
      throw error;
    }
  }

  /**
   * Stop casting
   */
  async stopCasting() {
    try {
      if (this.currentSession) {
        if (this.currentSession.stop) {
          this.currentSession.stop(
            () => {
              console.log('Casting session stopped');
              this.handleSessionEnded();
            },
            (error) => {
              console.error('Failed to stop casting session:', error);
            }
          );
        } else {
          this.handleSessionEnded();
        }
      }
    } catch (error) {
      console.error('Failed to stop casting:', error);
      throw error;
    }
  }

  /**
   * Control media playback
   */
  async controlPlayback(action, params = {}) {
    try {
      if (!this.currentSession) {
        throw new Error('No active casting session');
      }

      const media = this.currentSession.media && this.currentSession.media[0];
      if (!media) {
        throw new Error('No active media');
      }

      switch (action) {
        case 'play':
          media.play(null, this.onMediaCommandSuccess, this.onMediaCommandError);
          break;
        case 'pause':
          media.pause(null, this.onMediaCommandSuccess, this.onMediaCommandError);
          break;
        case 'stop':
          media.stop(null, this.onMediaCommandSuccess, this.onMediaCommandError);
          break;
        case 'seek':
          const seekRequest = new chrome.cast.media.SeekRequest();
          seekRequest.currentTime = params.time;
          media.seek(seekRequest, this.onMediaCommandSuccess, this.onMediaCommandError);
          break;
        case 'volume':
          const volumeRequest = new chrome.cast.Volume(params.level, params.muted);
          const setVolumeRequest = new chrome.cast.media.VolumeRequest(volumeRequest);
          media.setVolume(setVolumeRequest, this.onMediaCommandSuccess, this.onMediaCommandError);
          break;
        default:
          throw new Error(`Unsupported action: ${action}`);
      }
    } catch (error) {
      console.error('Playback control failed:', error);
      throw error;
    }
  }

  /**
   * Get available casting devices
   */
  getAvailableDevices() {
    return Array.from(this.availableDevices.values());
  }

  /**
   * Get current casting state
   */
  getCastingState() {
    return {
      state: this.castingState,
      session: this.currentSession,
      devices: this.getAvailableDevices()
    };
  }

  /**
   * Event handlers
   */
  onChromecastSessionListener(session) {
    console.log('Chromecast session listener:', session);
    this.currentSession = session;
    this.castingState = 'connected';
    
    session.addUpdateListener(this.onChromecastSessionUpdate.bind(this));
    session.addMessageListener(
      this.config.chromecast.namespace,
      this.onChromecastMessage.bind(this)
    );
  }

  onChromecastReceiverListener(availability) {
    console.log('Chromecast receiver availability:', availability);
    
    if (availability === chrome.cast.ReceiverAvailability.AVAILABLE) {
      // Chromecast devices are available
      if (this.listeners.onDeviceFound) {
        this.listeners.onDeviceFound({
          id: 'chromecast',
          name: 'Chromecast',
          type: 'chromecast',
          available: true
        });
      }
    } else {
      // No Chromecast devices available
      if (this.listeners.onDeviceLost) {
        this.listeners.onDeviceLost('chromecast');
      }
    }
  }

  onChromecastSessionUpdate(isAlive) {
    if (!isAlive) {
      this.handleSessionEnded();
    }
  }

  onChromecastMessage(namespace, message) {
    console.log('Chromecast message received:', namespace, message);
  }

  handleAirPlayAvailabilityChange(event) {
    console.log('AirPlay availability changed:', event.availability);
    
    if (event.availability === 'available') {
      if (this.listeners.onDeviceFound) {
        this.listeners.onDeviceFound({
          id: 'airplay',
          name: 'AirPlay',
          type: 'airplay',
          available: true
        });
      }
    } else {
      if (this.listeners.onDeviceLost) {
        this.listeners.onDeviceLost('airplay');
      }
    }
  }

  handleSessionEnded() {
    console.log('Casting session ended');
    this.currentSession = null;
    this.castingState = 'disconnected';
    
    if (this.listeners.onSessionEnded) {
      this.listeners.onSessionEnded();
    }
  }

  onMediaCommandSuccess() {
    console.log('Media command successful');
  }

  onMediaCommandError(error) {
    console.error('Media command failed:', error);
  }

  /**
   * TV remote control handlers
   */
  handleTizenKeyEvent(event) {
    const keyMap = {
      'MediaPlay': 'play',
      'MediaPause': 'pause',
      'MediaStop': 'stop',
      'MediaRewind': 'rewind',
      'MediaFastForward': 'fastforward'
    };

    const action = keyMap[event.keyName];
    if (action && this.onTVRemoteAction) {
      event.preventDefault();
      this.onTVRemoteAction(action);
    }
  }

  handleAndroidTVKeyEvent(event) {
    const keyMap = {
      37: 'left',
      38: 'up', 
      39: 'right',
      40: 'down',
      13: 'select',
      27: 'back'
    };

    const action = keyMap[event.keyCode];
    if (action && this.onTVRemoteAction) {
      event.preventDefault();
      this.onTVRemoteAction(action);
    }
  }

  handleAppleTVKeyEvent(event) {
    // Apple TV remote handling
    if (this.onTVRemoteAction) {
      this.onTVRemoteAction('select');
    }
  }

  enableTVFocusManagement() {
    // Enable focus management for TV navigation
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    focusableElements.forEach((element, index) => {
      element.setAttribute('data-focus-index', index);
    });
  }

  /**
   * Device discovery methods
   */
  startChromecastDiscovery() {
    // Chromecast discovery is handled by the Cast API
    console.log('Chromecast discovery started');
  }

  startAirPlayDiscovery() {
    // AirPlay discovery is handled by the browser
    console.log('AirPlay discovery started');
  }

  startDLNADiscovery() {
    // DLNA discovery would require additional implementation
    console.log('DLNA discovery not implemented');
  }

  /**
   * Set event listeners
   */
  setEventListener(event, callback) {
    if (this.listeners.hasOwnProperty(event)) {
      this.listeners[event] = callback;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    try {
      this.stopCasting();
      this.availableDevices.clear();
      this.currentSession = null;
      this.castingState = 'disconnected';
      
      console.log('CastingManager cleaned up');
    } catch (error) {
      console.error('Failed to cleanup CastingManager:', error);
    }
  }
}

export default CastingManager;
