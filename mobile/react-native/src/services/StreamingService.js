/**
 * StreamingService - Mobile Live Streaming Service
 * 
 * Handles:
 * - WebRTC-based mobile streaming
 * - Camera and microphone management
 * - Stream quality adaptation for mobile
 * - Background streaming support
 * - Network condition monitoring
 * - Mobile-specific optimizations
 */

import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  MediaStream,
  MediaStreamTrack,
  mediaDevices,
  RTCView,
} from 'react-native-webrtc';
import io from 'socket.io-client';
import NetInfo from '@react-native-community/netinfo';
import BackgroundTimer from 'react-native-background-timer';
import KeepAwake from 'react-native-keep-awake';
import Orientation from 'react-native-orientation-locker';
import { Platform, Alert, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class StreamingService {
  constructor() {
    this.socket = null;
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.isStreaming = false;
    this.isConnected = false;
    this.streamKey = null;
    this.streamId = null;
    
    // Mobile-specific configurations
    this.config = {
      webrtc: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          {
            urls: 'turn:turn.interviews.tv:3478',
            username: 'interviews_tv',
            credential: 'turn_password_2024'
          }
        ],
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      },
      mobile: {
        video: {
          width: { min: 320, ideal: 1280, max: 1920 },
          height: { min: 240, ideal: 720, max: 1080 },
          frameRate: { min: 15, ideal: 30, max: 60 },
          facingMode: 'user', // 'user' for front camera, 'environment' for back
          aspectRatio: 16/9
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 2
        },
        streaming: {
          maxBitrate: 2500000, // 2.5 Mbps max for mobile
          minBitrate: 300000,  // 300 Kbps min
          adaptiveBitrate: true,
          backgroundStreaming: true,
          keepScreenOn: true
        }
      },
      quality: {
        profiles: {
          'low': { width: 480, height: 270, bitrate: 500000, fps: 15 },
          'medium': { width: 854, height: 480, bitrate: 1000000, fps: 24 },
          'high': { width: 1280, height: 720, bitrate: 2000000, fps: 30 },
          'ultra': { width: 1920, height: 1080, bitrate: 3500000, fps: 30 }
        },
        adaptive: {
          enabled: true,
          checkInterval: 5000, // 5 seconds
          thresholds: {
            excellent: { minBandwidth: 3000000, quality: 'ultra' },
            good: { minBandwidth: 1500000, quality: 'high' },
            fair: { minBandwidth: 800000, quality: 'medium' },
            poor: { minBandwidth: 400000, quality: 'low' }
          }
        }
      }
    };

    // Event listeners
    this.listeners = {
      onStreamStarted: null,
      onStreamStopped: null,
      onStreamError: null,
      onViewerCountChanged: null,
      onNetworkChanged: null,
      onQualityChanged: null
    };

    // Network monitoring
    this.networkState = {
      isConnected: true,
      connectionType: 'wifi',
      bandwidth: 0,
      latency: 0
    };

    // Initialize services
    this.initializeNetworkMonitoring();
    this.initializeAppStateHandling();
  }

  /**
   * Initialize mobile streaming
   */
  async initialize(serverUrl, authToken) {
    try {
      // Connect to signaling server
      this.socket = io(serverUrl, {
        auth: { token: authToken },
        transports: ['websocket'],
        timeout: 10000
      });

      // Set up socket event listeners
      this.setupSocketListeners();

      // Wait for connection
      await this.waitForConnection();

      this.isConnected = true;
      console.log('StreamingService initialized successfully');
      
      return { success: true };
    } catch (error) {
      console.error('Failed to initialize StreamingService:', error);
      throw error;
    }
  }

  /**
   * Start live streaming from mobile device
   */
  async startStreaming(streamConfig = {}) {
    try {
      if (this.isStreaming) {
        throw new Error('Already streaming');
      }

      // Request permissions
      await this.requestPermissions();

      // Get user media
      this.localStream = await this.getUserMedia(streamConfig);

      // Create peer connection
      this.peerConnection = await this.createPeerConnection();

      // Add local stream to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Create and send offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Send offer to server
      this.socket.emit('start-stream', {
        offer: offer,
        streamConfig: {
          title: streamConfig.title || 'Mobile Live Stream',
          description: streamConfig.description || '',
          category: streamConfig.category || 'general',
          isPrivate: streamConfig.isPrivate || false,
          quality: this.getCurrentQuality()
        }
      });

      // Enable mobile optimizations
      this.enableMobileOptimizations();

      this.isStreaming = true;
      
      if (this.listeners.onStreamStarted) {
        this.listeners.onStreamStarted(this.streamId);
      }

      console.log('Mobile streaming started successfully');
      return { success: true, streamId: this.streamId };
    } catch (error) {
      console.error('Failed to start streaming:', error);
      if (this.listeners.onStreamError) {
        this.listeners.onStreamError(error);
      }
      throw error;
    }
  }

  /**
   * Stop live streaming
   */
  async stopStreaming() {
    try {
      if (!this.isStreaming) {
        return { success: true };
      }

      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      // Close peer connection
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      // Notify server
      if (this.socket && this.streamId) {
        this.socket.emit('stop-stream', { streamId: this.streamId });
      }

      // Disable mobile optimizations
      this.disableMobileOptimizations();

      this.isStreaming = false;
      this.streamId = null;

      if (this.listeners.onStreamStopped) {
        this.listeners.onStreamStopped();
      }

      console.log('Mobile streaming stopped successfully');
      return { success: true };
    } catch (error) {
      console.error('Failed to stop streaming:', error);
      throw error;
    }
  }

  /**
   * Switch camera (front/back)
   */
  async switchCamera() {
    try {
      if (!this.localStream) {
        throw new Error('No active stream to switch camera');
      }

      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        // Toggle camera
        await videoTrack._switchCamera();
        console.log('Camera switched successfully');
      }
    } catch (error) {
      console.error('Failed to switch camera:', error);
      throw error;
    }
  }

  /**
   * Toggle microphone
   */
  toggleMicrophone() {
    try {
      if (!this.localStream) {
        throw new Error('No active stream');
      }

      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        console.log(`Microphone ${audioTrack.enabled ? 'enabled' : 'disabled'}`);
        return audioTrack.enabled;
      }
    } catch (error) {
      console.error('Failed to toggle microphone:', error);
      throw error;
    }
  }

  /**
   * Toggle camera
   */
  toggleCamera() {
    try {
      if (!this.localStream) {
        throw new Error('No active stream');
      }

      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        console.log(`Camera ${videoTrack.enabled ? 'enabled' : 'disabled'}`);
        return videoTrack.enabled;
      }
    } catch (error) {
      console.error('Failed to toggle camera:', error);
      throw error;
    }
  }

  /**
   * Get user media with mobile optimizations
   */
  async getUserMedia(config = {}) {
    try {
      const constraints = {
        video: {
          ...this.config.mobile.video,
          ...config.video
        },
        audio: {
          ...this.config.mobile.audio,
          ...config.audio
        }
      };

      // Adjust constraints based on network conditions
      if (this.networkState.connectionType === 'cellular') {
        constraints.video.width.ideal = 854;
        constraints.video.height.ideal = 480;
        constraints.video.frameRate.ideal = 24;
      }

      const stream = await mediaDevices.getUserMedia(constraints);
      console.log('User media obtained successfully');
      return stream;
    } catch (error) {
      console.error('Failed to get user media:', error);
      throw error;
    }
  }

  /**
   * Create WebRTC peer connection
   */
  async createPeerConnection() {
    try {
      const pc = new RTCPeerConnection(this.config.webrtc);

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && this.socket) {
          this.socket.emit('ice-candidate', {
            candidate: event.candidate,
            streamId: this.streamId
          });
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'failed') {
          this.handleConnectionFailure();
        }
      };

      // Handle remote stream
      pc.onaddstream = (event) => {
        this.remoteStream = event.stream;
      };

      return pc;
    } catch (error) {
      console.error('Failed to create peer connection:', error);
      throw error;
    }
  }

  /**
   * Request necessary permissions
   */
  async requestPermissions() {
    try {
      if (Platform.OS === 'android') {
        const { PermissionsAndroid } = require('react-native');
        
        const permissions = [
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        ];

        const granted = await PermissionsAndroid.requestMultiple(permissions);
        
        for (const permission of permissions) {
          if (granted[permission] !== PermissionsAndroid.RESULTS.GRANTED) {
            throw new Error(`Permission ${permission} not granted`);
          }
        }
      }
      
      console.log('Permissions granted successfully');
    } catch (error) {
      console.error('Failed to request permissions:', error);
      throw error;
    }
  }

  /**
   * Enable mobile-specific optimizations
   */
  enableMobileOptimizations() {
    try {
      // Keep screen awake during streaming
      if (this.config.mobile.streaming.keepScreenOn) {
        KeepAwake.activate();
      }

      // Lock orientation to landscape for better streaming
      Orientation.lockToLandscape();

      // Start background streaming support
      if (this.config.mobile.streaming.backgroundStreaming) {
        this.enableBackgroundStreaming();
      }

      // Start adaptive bitrate monitoring
      if (this.config.quality.adaptive.enabled) {
        this.startAdaptiveBitrateMonitoring();
      }

      console.log('Mobile optimizations enabled');
    } catch (error) {
      console.error('Failed to enable mobile optimizations:', error);
    }
  }

  /**
   * Disable mobile optimizations
   */
  disableMobileOptimizations() {
    try {
      // Allow screen to sleep
      KeepAwake.deactivate();

      // Unlock orientation
      Orientation.unlockAllOrientations();

      // Stop background streaming
      this.disableBackgroundStreaming();

      // Stop adaptive bitrate monitoring
      this.stopAdaptiveBitrateMonitoring();

      console.log('Mobile optimizations disabled');
    } catch (error) {
      console.error('Failed to disable mobile optimizations:', error);
    }
  }

  /**
   * Enable background streaming
   */
  enableBackgroundStreaming() {
    this.backgroundTimer = BackgroundTimer.setInterval(() => {
      // Keep connection alive during background
      if (this.socket && this.isStreaming) {
        this.socket.emit('ping', { streamId: this.streamId });
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Disable background streaming
   */
  disableBackgroundStreaming() {
    if (this.backgroundTimer) {
      BackgroundTimer.clearInterval(this.backgroundTimer);
      this.backgroundTimer = null;
    }
  }

  /**
   * Start adaptive bitrate monitoring
   */
  startAdaptiveBitrateMonitoring() {
    this.adaptiveTimer = setInterval(() => {
      this.checkAndAdaptQuality();
    }, this.config.quality.adaptive.checkInterval);
  }

  /**
   * Stop adaptive bitrate monitoring
   */
  stopAdaptiveBitrateMonitoring() {
    if (this.adaptiveTimer) {
      clearInterval(this.adaptiveTimer);
      this.adaptiveTimer = null;
    }
  }

  /**
   * Check network conditions and adapt quality
   */
  async checkAndAdaptQuality() {
    try {
      const networkInfo = await NetInfo.fetch();
      const bandwidth = this.estimateBandwidth(networkInfo);
      
      let newQuality = 'low';
      
      for (const [level, threshold] of Object.entries(this.config.quality.adaptive.thresholds)) {
        if (bandwidth >= threshold.minBandwidth) {
          newQuality = threshold.quality;
          break;
        }
      }

      const currentQuality = this.getCurrentQuality();
      if (newQuality !== currentQuality) {
        await this.changeStreamQuality(newQuality);
        
        if (this.listeners.onQualityChanged) {
          this.listeners.onQualityChanged(newQuality, currentQuality);
        }
      }
    } catch (error) {
      console.error('Failed to adapt quality:', error);
    }
  }

  /**
   * Change stream quality
   */
  async changeStreamQuality(quality) {
    try {
      if (!this.config.quality.profiles[quality]) {
        throw new Error(`Invalid quality profile: ${quality}`);
      }

      const profile = this.config.quality.profiles[quality];
      
      // Update video constraints
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        await videoTrack.applyConstraints({
          width: profile.width,
          height: profile.height,
          frameRate: profile.fps
        });
      }

      // Update bitrate
      if (this.peerConnection) {
        const sender = this.peerConnection.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        
        if (sender) {
          const params = sender.getParameters();
          if (params.encodings && params.encodings.length > 0) {
            params.encodings[0].maxBitrate = profile.bitrate;
            await sender.setParameters(params);
          }
        }
      }

      await AsyncStorage.setItem('stream_quality', quality);
      console.log(`Stream quality changed to: ${quality}`);
    } catch (error) {
      console.error('Failed to change stream quality:', error);
      throw error;
    }
  }

  /**
   * Get current stream quality
   */
  getCurrentQuality() {
    // Implementation would return current quality setting
    return 'medium'; // Placeholder
  }

  /**
   * Estimate bandwidth based on network info
   */
  estimateBandwidth(networkInfo) {
    // Simple bandwidth estimation based on connection type
    const bandwidthMap = {
      'wifi': 5000000,      // 5 Mbps
      '4g': 3000000,        // 3 Mbps
      '3g': 1000000,        // 1 Mbps
      '2g': 500000,         // 500 Kbps
      'cellular': 2000000,  // 2 Mbps average
      'ethernet': 10000000, // 10 Mbps
      'unknown': 1000000    // 1 Mbps default
    };

    return bandwidthMap[networkInfo.type] || bandwidthMap.unknown;
  }

  /**
   * Initialize network monitoring
   */
  initializeNetworkMonitoring() {
    NetInfo.addEventListener(state => {
      this.networkState = {
        isConnected: state.isConnected,
        connectionType: state.type,
        bandwidth: this.estimateBandwidth(state),
        latency: 0 // Would be measured in production
      };

      if (this.listeners.onNetworkChanged) {
        this.listeners.onNetworkChanged(this.networkState);
      }

      // Handle network disconnection
      if (!state.isConnected && this.isStreaming) {
        this.handleNetworkDisconnection();
      }
    });
  }

  /**
   * Initialize app state handling
   */
  initializeAppStateHandling() {
    AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' && this.isStreaming) {
        // Handle app going to background
        this.handleAppBackground();
      } else if (nextAppState === 'active' && this.isStreaming) {
        // Handle app coming to foreground
        this.handleAppForeground();
      }
    });
  }

  /**
   * Handle network disconnection
   */
  handleNetworkDisconnection() {
    console.log('Network disconnected during streaming');
    Alert.alert(
      'Network Disconnected',
      'Your stream has been interrupted due to network disconnection. Please check your connection and try again.',
      [{ text: 'OK', onPress: () => this.stopStreaming() }]
    );
  }

  /**
   * Handle app going to background
   */
  handleAppBackground() {
    console.log('App went to background during streaming');
    // Continue streaming in background if enabled
    if (!this.config.mobile.streaming.backgroundStreaming) {
      this.stopStreaming();
    }
  }

  /**
   * Handle app coming to foreground
   */
  handleAppForeground() {
    console.log('App came to foreground during streaming');
    // Resume normal streaming operations
  }

  /**
   * Handle connection failure
   */
  handleConnectionFailure() {
    console.log('WebRTC connection failed');
    if (this.listeners.onStreamError) {
      this.listeners.onStreamError(new Error('Connection failed'));
    }
  }

  /**
   * Set up socket event listeners
   */
  setupSocketListeners() {
    this.socket.on('connect', () => {
      console.log('Connected to signaling server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from signaling server');
    });

    this.socket.on('stream-started', (data) => {
      this.streamId = data.streamId;
      this.streamKey = data.streamKey;
      console.log('Stream started:', data);
    });

    this.socket.on('stream-answer', async (data) => {
      if (this.peerConnection) {
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
      }
    });

    this.socket.on('ice-candidate', async (data) => {
      if (this.peerConnection) {
        await this.peerConnection.addIceCandidate(
          new RTCIceCandidate(data.candidate)
        );
      }
    });

    this.socket.on('viewer-count', (data) => {
      if (this.listeners.onViewerCountChanged) {
        this.listeners.onViewerCountChanged(data.count);
      }
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      if (this.listeners.onStreamError) {
        this.listeners.onStreamError(error);
      }
    });
  }

  /**
   * Wait for socket connection
   */
  waitForConnection() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
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
   * Get stream statistics
   */
  async getStreamStats() {
    if (!this.peerConnection) {
      return null;
    }

    try {
      const stats = await this.peerConnection.getStats();
      const streamStats = {
        video: {},
        audio: {},
        connection: {}
      };

      stats.forEach(report => {
        if (report.type === 'outbound-rtp' && report.mediaType === 'video') {
          streamStats.video = {
            bytesSent: report.bytesSent,
            packetsSent: report.packetsSent,
            framesEncoded: report.framesEncoded,
            frameWidth: report.frameWidth,
            frameHeight: report.frameHeight,
            framesPerSecond: report.framesPerSecond
          };
        } else if (report.type === 'outbound-rtp' && report.mediaType === 'audio') {
          streamStats.audio = {
            bytesSent: report.bytesSent,
            packetsSent: report.packetsSent
          };
        } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          streamStats.connection = {
            currentRoundTripTime: report.currentRoundTripTime,
            availableOutgoingBitrate: report.availableOutgoingBitrate
          };
        }
      });

      return streamStats;
    } catch (error) {
      console.error('Failed to get stream stats:', error);
      return null;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    try {
      this.stopStreaming();
      
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }

      this.disableMobileOptimizations();
      
      console.log('StreamingService cleaned up');
    } catch (error) {
      console.error('Failed to cleanup StreamingService:', error);
    }
  }
}

export default StreamingService;
