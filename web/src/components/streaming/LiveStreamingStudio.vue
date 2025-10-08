<template>
  <div class="live-streaming-studio">
    <!-- Studio Header -->
    <div class="studio-header">
      <h1 class="studio-title">
        <i class="fas fa-broadcast-tower"></i>
        Live Streaming Studio
      </h1>
      <div class="stream-status" :class="streamStatus">
        <div class="status-indicator"></div>
        <span>{{ streamStatusText }}</span>
      </div>
    </div>

    <!-- Main Studio Area -->
    <div class="studio-main">
      <!-- Video Preview -->
      <div class="video-section">
        <div class="video-container">
          <video
            ref="localVideo"
            class="local-video"
            autoplay
            muted
            playsinline
          ></video>
          
          <div class="video-overlay">
            <!-- Recording Indicator -->
            <div v-if="isRecording" class="recording-indicator">
              <div class="recording-dot"></div>
              <span>REC {{ recordingDuration }}</span>
            </div>

            <!-- Viewer Count -->
            <div class="viewer-count">
              <i class="fas fa-eye"></i>
              <span>{{ viewerCount }} viewers</span>
            </div>

            <!-- Stream Quality -->
            <div class="stream-quality">
              <span>{{ currentQuality }}</span>
              <div class="quality-indicator" :class="qualityStatus"></div>
            </div>
          </div>

          <!-- Video Controls -->
          <div class="video-controls">
            <button
              @click="toggleCamera"
              class="control-btn"
              :class="{ active: cameraEnabled }"
            >
              <i :class="cameraEnabled ? 'fas fa-video' : 'fas fa-video-slash'"></i>
            </button>
            
            <button
              @click="toggleMicrophone"
              class="control-btn"
              :class="{ active: microphoneEnabled }"
            >
              <i :class="microphoneEnabled ? 'fas fa-microphone' : 'fas fa-microphone-slash'"></i>
            </button>

            <button
              @click="toggleScreenShare"
              class="control-btn"
              :class="{ active: screenShareEnabled }"
            >
              <i class="fas fa-desktop"></i>
            </button>

            <div class="quality-selector">
              <select v-model="selectedQuality" @change="changeQuality">
                <option value="360p">360p</option>
                <option value="720p">720p</option>
                <option value="1080p">1080p</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Stream Configuration -->
      <div class="config-section">
        <div class="config-panel">
          <h3>Stream Settings</h3>
          
          <div class="form-group">
            <label>Stream Title</label>
            <input
              v-model="streamConfig.title"
              type="text"
              placeholder="Enter stream title..."
              :disabled="isStreaming"
            />
          </div>

          <div class="form-group">
            <label>Description</label>
            <textarea
              v-model="streamConfig.description"
              placeholder="Describe your stream..."
              :disabled="isStreaming"
            ></textarea>
          </div>

          <div class="form-group">
            <label>Category</label>
            <select v-model="streamConfig.category" :disabled="isStreaming">
              <option value="interview">Interview</option>
              <option value="business">Business</option>
              <option value="education">Education</option>
              <option value="entertainment">Entertainment</option>
              <option value="technology">Technology</option>
            </select>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                v-model="streamConfig.recordingEnabled"
                type="checkbox"
                :disabled="isStreaming"
              />
              <span>Enable Recording</span>
            </label>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                v-model="streamConfig.chatEnabled"
                type="checkbox"
                :disabled="isStreaming"
              />
              <span>Enable Chat</span>
            </label>
          </div>

          <div class="form-group">
            <label>Max Viewers</label>
            <input
              v-model.number="streamConfig.maxViewers"
              type="number"
              min="1"
              max="10000"
              :disabled="isStreaming"
            />
          </div>
        </div>

        <!-- Stream Actions -->
        <div class="action-panel">
          <button
            v-if="!isStreaming"
            @click="startStream"
            class="btn btn-primary btn-large"
            :disabled="!canStartStream"
          >
            <i class="fas fa-play"></i>
            Start Stream
          </button>

          <button
            v-else
            @click="stopStream"
            class="btn btn-danger btn-large"
          >
            <i class="fas fa-stop"></i>
            Stop Stream
          </button>

          <button
            @click="testConnection"
            class="btn btn-secondary"
            :disabled="isStreaming"
          >
            <i class="fas fa-wifi"></i>
            Test Connection
          </button>
        </div>

        <!-- Stream Statistics -->
        <div v-if="isStreaming" class="stats-panel">
          <h4>Stream Statistics</h4>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">Duration</span>
              <span class="stat-value">{{ streamDuration }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Bitrate</span>
              <span class="stat-value">{{ currentBitrate }} kbps</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">FPS</span>
              <span class="stat-value">{{ currentFPS }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Packet Loss</span>
              <span class="stat-value">{{ packetLoss }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Chat Section -->
    <div v-if="streamConfig.chatEnabled && isStreaming" class="chat-section">
      <LiveStreamChat
        :stream-id="currentStreamId"
        :is-streamer="true"
        @message-sent="handleChatMessage"
      />
    </div>

    <!-- Connection Test Modal -->
    <div v-if="showConnectionTest" class="modal-overlay" @click="closeConnectionTest">
      <div class="modal-content" @click.stop>
        <h3>Connection Test</h3>
        <div class="test-results">
          <div class="test-item">
            <span>Upload Speed:</span>
            <span :class="uploadSpeedClass">{{ uploadSpeed }} Mbps</span>
          </div>
          <div class="test-item">
            <span>Latency:</span>
            <span :class="latencyClass">{{ latency }} ms</span>
          </div>
          <div class="test-item">
            <span>Connection Quality:</span>
            <span :class="connectionQualityClass">{{ connectionQuality }}</span>
          </div>
        </div>
        <div class="modal-actions">
          <button @click="closeConnectionTest" class="btn btn-secondary">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import WebRTCStreamingService from '@/services/webrtc.js'
import LiveStreamChat from './LiveStreamChat.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'

export default {
  name: 'LiveStreamingStudio',
  components: {
    LiveStreamChat
  },
  setup() {
    const authStore = useAuthStore()
    const notificationStore = useNotificationStore()

    // Reactive state
    const localVideo = ref(null)
    const streamingService = ref(null)
    const isStreaming = ref(false)
    const isRecording = ref(false)
    const cameraEnabled = ref(true)
    const microphoneEnabled = ref(true)
    const screenShareEnabled = ref(false)
    const viewerCount = ref(0)
    const currentStreamId = ref(null)
    const selectedQuality = ref('720p')
    const showConnectionTest = ref(false)

    // Stream configuration
    const streamConfig = reactive({
      title: '',
      description: '',
      category: 'interview',
      recordingEnabled: true,
      chatEnabled: true,
      maxViewers: 1000
    })

    // Stream statistics
    const streamStats = reactive({
      startTime: null,
      duration: 0,
      bitrate: 0,
      fps: 0,
      packetLoss: 0
    })

    // Connection test results
    const connectionTest = reactive({
      uploadSpeed: 0,
      latency: 0,
      quality: 'unknown'
    })

    // Computed properties
    const streamStatus = computed(() => {
      if (isStreaming.value) return 'live'
      return 'offline'
    })

    const streamStatusText = computed(() => {
      if (isStreaming.value) return 'LIVE'
      return 'OFFLINE'
    })

    const canStartStream = computed(() => {
      return streamConfig.title.trim().length > 0 && !isStreaming.value
    })

    const currentQuality = computed(() => selectedQuality.value)
    
    const qualityStatus = computed(() => {
      if (streamStats.packetLoss > 5) return 'poor'
      if (streamStats.packetLoss > 2) return 'fair'
      return 'good'
    })

    const recordingDuration = computed(() => {
      return formatDuration(streamStats.duration)
    })

    const streamDuration = computed(() => {
      return formatDuration(streamStats.duration)
    })

    const currentBitrate = computed(() => {
      return Math.round(streamStats.bitrate / 1000)
    })

    const currentFPS = computed(() => {
      return streamStats.fps
    })

    const packetLoss = computed(() => {
      return streamStats.packetLoss.toFixed(2)
    })

    // Connection test computed properties
    const uploadSpeedClass = computed(() => {
      if (connectionTest.uploadSpeed >= 5) return 'good'
      if (connectionTest.uploadSpeed >= 2) return 'fair'
      return 'poor'
    })

    const latencyClass = computed(() => {
      if (connectionTest.latency <= 50) return 'good'
      if (connectionTest.latency <= 100) return 'fair'
      return 'poor'
    })

    const connectionQualityClass = computed(() => {
      return connectionTest.quality
    })

    const connectionQuality = computed(() => {
      return connectionTest.quality.charAt(0).toUpperCase() + connectionTest.quality.slice(1)
    })

    const uploadSpeed = computed(() => {
      return connectionTest.uploadSpeed.toFixed(1)
    })

    const latency = computed(() => {
      return connectionTest.latency
    })

    // Methods
    const initializeStreaming = async () => {
      try {
        streamingService.value = new WebRTCStreamingService({
          signalingServer: 'wss://signaling.interviews.tv',
          maxBitrate: getMaxBitrateForQuality(selectedQuality.value)
        })

        // Set up event listeners
        streamingService.value.on('streaming-started', handleStreamingStarted)
        streamingService.value.on('streaming-stopped', handleStreamingStopped)
        streamingService.value.on('stats-update', handleStatsUpdate)
        streamingService.value.on('viewer-joined', handleViewerJoined)
        streamingService.value.on('viewer-left', handleViewerLeft)
        streamingService.value.on('streaming-error', handleStreamingError)

      } catch (error) {
        console.error('Failed to initialize streaming:', error)
        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to initialize streaming service'
        })
      }
    }

    const startStream = async () => {
      try {
        if (!streamingService.value) {
          await initializeStreaming()
        }

        // Create stream on server
        const response = await fetch('/api/streams', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`
          },
          body: JSON.stringify(streamConfig)
        })

        const streamData = await response.json()
        currentStreamId.value = streamData.stream_id

        // Start WebRTC streaming
        const result = await streamingService.value.startStreaming(
          currentStreamId.value,
          {
            video: getVideoConstraintsForQuality(selectedQuality.value),
            audio: { echoCancellation: true, noiseSuppression: true }
          }
        )

        // Display local video
        if (localVideo.value && result.localStream) {
          localVideo.value.srcObject = result.localStream
        }

        isStreaming.value = true
        streamStats.startTime = Date.now()
        
        notificationStore.addNotification({
          type: 'success',
          message: 'Stream started successfully!'
        })

      } catch (error) {
        console.error('Failed to start stream:', error)
        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to start stream: ' + error.message
        })
      }
    }

    const stopStream = async () => {
      try {
        if (streamingService.value) {
          await streamingService.value.stopStreaming()
        }

        // Stop stream on server
        if (currentStreamId.value) {
          await fetch(`/api/streams/${currentStreamId.value}/stop`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authStore.token}`
            }
          })
        }

        isStreaming.value = false
        isRecording.value = false
        currentStreamId.value = null
        viewerCount.value = 0
        
        // Clear video
        if (localVideo.value) {
          localVideo.value.srcObject = null
        }

        notificationStore.addNotification({
          type: 'success',
          message: 'Stream stopped successfully!'
        })

      } catch (error) {
        console.error('Failed to stop stream:', error)
        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to stop stream: ' + error.message
        })
      }
    }

    const toggleCamera = async () => {
      if (streamingService.value && streamingService.value.localStream) {
        const videoTracks = streamingService.value.localStream.getVideoTracks()
        videoTracks.forEach(track => {
          track.enabled = !track.enabled
        })
        cameraEnabled.value = !cameraEnabled.value
      }
    }

    const toggleMicrophone = async () => {
      if (streamingService.value && streamingService.value.localStream) {
        const audioTracks = streamingService.value.localStream.getAudioTracks()
        audioTracks.forEach(track => {
          track.enabled = !track.enabled
        })
        microphoneEnabled.value = !microphoneEnabled.value
      }
    }

    const toggleScreenShare = async () => {
      // Implement screen sharing logic
      screenShareEnabled.value = !screenShareEnabled.value
    }

    const changeQuality = async () => {
      if (isStreaming.value && streamingService.value) {
        // Update streaming quality
        streamingService.value.config.maxBitrate = getMaxBitrateForQuality(selectedQuality.value)
        await streamingService.value.configureBitrate()
      }
    }

    const testConnection = async () => {
      showConnectionTest.value = true
      
      try {
        // Simulate connection test
        connectionTest.uploadSpeed = Math.random() * 10 + 1
        connectionTest.latency = Math.floor(Math.random() * 100 + 20)
        
        if (connectionTest.uploadSpeed >= 5 && connectionTest.latency <= 50) {
          connectionTest.quality = 'excellent'
        } else if (connectionTest.uploadSpeed >= 2 && connectionTest.latency <= 100) {
          connectionTest.quality = 'good'
        } else {
          connectionTest.quality = 'poor'
        }
      } catch (error) {
        console.error('Connection test failed:', error)
      }
    }

    const closeConnectionTest = () => {
      showConnectionTest.value = false
    }

    // Event handlers
    const handleStreamingStarted = (data) => {
      console.log('Streaming started:', data)
      isRecording.value = streamConfig.recordingEnabled
    }

    const handleStreamingStopped = (data) => {
      console.log('Streaming stopped:', data)
    }

    const handleStatsUpdate = (stats) => {
      streamStats.duration = stats.duration
      streamStats.bitrate = stats.avgBitrate
      streamStats.packetLoss = stats.packetLossRate
    }

    const handleViewerJoined = (data) => {
      viewerCount.value++
    }

    const handleViewerLeft = (data) => {
      viewerCount.value = Math.max(0, viewerCount.value - 1)
    }

    const handleStreamingError = (error) => {
      console.error('Streaming error:', error)
      notificationStore.addNotification({
        type: 'error',
        message: 'Streaming error: ' + error.message
      })
    }

    const handleChatMessage = (message) => {
      console.log('Chat message:', message)
    }

    // Utility functions
    const formatDuration = (milliseconds) => {
      const seconds = Math.floor(milliseconds / 1000)
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)
      
      if (hours > 0) {
        return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
      }
      return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`
    }

    const getMaxBitrateForQuality = (quality) => {
      const bitrates = {
        '360p': 1000000,  // 1 Mbps
        '720p': 2500000,  // 2.5 Mbps
        '1080p': 5000000  // 5 Mbps
      }
      return bitrates[quality] || bitrates['720p']
    }

    const getVideoConstraintsForQuality = (quality) => {
      const constraints = {
        '360p': { width: 640, height: 360, frameRate: 30 },
        '720p': { width: 1280, height: 720, frameRate: 30 },
        '1080p': { width: 1920, height: 1080, frameRate: 30 }
      }
      return constraints[quality] || constraints['720p']
    }

    // Lifecycle
    onMounted(() => {
      initializeStreaming()
    })

    onUnmounted(() => {
      if (streamingService.value) {
        streamingService.value.destroy()
      }
    })

    return {
      // Refs
      localVideo,
      isStreaming,
      isRecording,
      cameraEnabled,
      microphoneEnabled,
      screenShareEnabled,
      viewerCount,
      currentStreamId,
      selectedQuality,
      showConnectionTest,
      
      // Reactive objects
      streamConfig,
      streamStats,
      connectionTest,
      
      // Computed
      streamStatus,
      streamStatusText,
      canStartStream,
      currentQuality,
      qualityStatus,
      recordingDuration,
      streamDuration,
      currentBitrate,
      currentFPS,
      packetLoss,
      uploadSpeedClass,
      latencyClass,
      connectionQualityClass,
      connectionQuality,
      uploadSpeed,
      latency,
      
      // Methods
      startStream,
      stopStream,
      toggleCamera,
      toggleMicrophone,
      toggleScreenShare,
      changeQuality,
      testConnection,
      closeConnectionTest,
      handleChatMessage
    }
  }
}
</script>

<style scoped>
.live-streaming-studio {
  background: #1a1a1a;
  color: white;
  min-height: 100vh;
  padding: 20px;
}

.studio-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #333;
}

.studio-title {
  font-size: 2rem;
  font-weight: bold;
  color: #FF0000;
  margin: 0;
}

.studio-title i {
  margin-right: 10px;
}

.stream-status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: bold;
  text-transform: uppercase;
}

.stream-status.live {
  background: rgba(255, 0, 0, 0.2);
  border: 1px solid #FF0000;
  color: #FF0000;
}

.stream-status.offline {
  background: rgba(128, 128, 128, 0.2);
  border: 1px solid #666;
  color: #666;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.stream-status.live .status-indicator {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.studio-main {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 30px;
  margin-bottom: 30px;
}

.video-section {
  background: #2a2a2a;
  border-radius: 12px;
  overflow: hidden;
}

.video-container {
  position: relative;
  aspect-ratio: 16/9;
  background: #000;
}

.local-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: linear-gradient(to bottom, rgba(0,0,0,0.5), transparent);
}

.recording-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 0, 0, 0.9);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: bold;
}

.recording-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: white;
  animation: pulse 1s infinite;
}

.viewer-count {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.7);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
}

.stream-quality {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.7);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
}

.quality-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.quality-indicator.good { background: #00ff00; }
.quality-indicator.fair { background: #ffff00; }
.quality-indicator.poor { background: #ff0000; }

.video-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
}

.control-btn {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 2px solid #666;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.control-btn:hover {
  border-color: #FF0000;
  background: rgba(255, 0, 0, 0.2);
}

.control-btn.active {
  border-color: #FF0000;
  background: #FF0000;
}

.quality-selector {
  margin-left: auto;
}

.quality-selector select {
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid #666;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
}

.config-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.config-panel,
.action-panel,
.stats-panel {
  background: #2a2a2a;
  border-radius: 12px;
  padding: 20px;
}

.config-panel h3,
.stats-panel h4 {
  margin: 0 0 20px 0;
  color: #FF0000;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #444;
  border-radius: 6px;
  background: #3a3a3a;
  color: white;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: auto !important;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.btn-primary {
  background: #FF0000;
  color: white;
}

.btn-primary:hover {
  background: #cc0000;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-large {
  padding: 16px 32px;
  font-size: 1.1rem;
  width: 100%;
  margin-bottom: 15px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #3a3a3a;
  border-radius: 6px;
}

.stat-label {
  font-size: 0.9rem;
  color: #ccc;
}

.stat-value {
  font-weight: bold;
  color: #FF0000;
}

.chat-section {
  background: #2a2a2a;
  border-radius: 12px;
  height: 400px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #2a2a2a;
  border-radius: 12px;
  padding: 30px;
  max-width: 500px;
  width: 90%;
}

.modal-content h3 {
  margin: 0 0 20px 0;
  color: #FF0000;
}

.test-results {
  margin-bottom: 20px;
}

.test-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #444;
}

.test-item:last-child {
  border-bottom: none;
}

.test-item span:last-child {
  font-weight: bold;
}

.test-item .good { color: #28a745; }
.test-item .fair { color: #ffc107; }
.test-item .poor { color: #dc3545; }

.modal-actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .studio-main {
    grid-template-columns: 1fr;
  }
  
  .studio-header {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
  }
  
  .video-controls {
    flex-wrap: wrap;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
