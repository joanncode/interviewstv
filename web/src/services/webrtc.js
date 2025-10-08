/**
 * WebRTC Live Streaming Service
 * Handles real-time video/audio streaming for interviews
 */

class WebRTCStreamingService {
    constructor(config = {}) {
        this.config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { 
                    urls: 'turn:turn.interviews.tv:3478',
                    username: 'interviews',
                    credential: 'streaming123'
                }
            ],
            signalingServer: 'wss://signaling.interviews.tv',
            streamingServer: 'wss://webrtc.interviews.tv',
            maxBitrate: 5000000, // 5 Mbps
            videoConstraints: {
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 480, ideal: 720, max: 1080 },
                frameRate: { min: 15, ideal: 30, max: 60 }
            },
            audioConstraints: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 48000
            },
            ...config
        };

        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.signalingSocket = null;
        this.streamingSocket = null;
        this.isStreaming = false;
        this.isViewing = false;
        this.streamId = null;
        this.viewerId = null;
        this.eventHandlers = {};
        this.stats = {
            startTime: null,
            bytesReceived: 0,
            bytesSent: 0,
            packetsLost: 0,
            jitter: 0,
            rtt: 0
        };

        this.initializeSignaling();
    }

    /**
     * Initialize signaling connection
     */
    initializeSignaling() {
        this.signalingSocket = new WebSocket(this.config.signalingServer);
        
        this.signalingSocket.onopen = () => {
            console.log('Signaling connection established');
            this.emit('signaling-connected');
        };

        this.signalingSocket.onmessage = (event) => {
            this.handleSignalingMessage(JSON.parse(event.data));
        };

        this.signalingSocket.onclose = () => {
            console.log('Signaling connection closed');
            this.emit('signaling-disconnected');
            // Attempt reconnection
            setTimeout(() => this.initializeSignaling(), 3000);
        };

        this.signalingSocket.onerror = (error) => {
            console.error('Signaling error:', error);
            this.emit('signaling-error', error);
        };
    }

    /**
     * Start streaming (broadcaster)
     */
    async startStreaming(streamId, constraints = {}) {
        try {
            this.streamId = streamId;
            
            // Get user media
            const mediaConstraints = {
                video: { ...this.config.videoConstraints, ...constraints.video },
                audio: { ...this.config.audioConstraints, ...constraints.audio }
            };

            this.localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
            
            // Create peer connection
            this.createPeerConnection();
            
            // Add local stream to peer connection
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });

            // Configure bitrate
            await this.configureBitrate();

            // Start streaming
            this.isStreaming = true;
            this.stats.startTime = Date.now();
            
            // Send streaming start signal
            this.sendSignalingMessage({
                type: 'start-streaming',
                streamId: this.streamId,
                constraints: mediaConstraints
            });

            this.emit('streaming-started', {
                streamId: this.streamId,
                localStream: this.localStream
            });

            // Start stats monitoring
            this.startStatsMonitoring();

            return {
                success: true,
                streamId: this.streamId,
                localStream: this.localStream
            };

        } catch (error) {
            console.error('Failed to start streaming:', error);
            this.emit('streaming-error', error);
            throw error;
        }
    }

    /**
     * Stop streaming
     */
    async stopStreaming() {
        try {
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
                this.localStream = null;
            }

            if (this.peerConnection) {
                this.peerConnection.close();
                this.peerConnection = null;
            }

            this.isStreaming = false;

            // Send stop signal
            this.sendSignalingMessage({
                type: 'stop-streaming',
                streamId: this.streamId
            });

            this.emit('streaming-stopped', {
                streamId: this.streamId,
                stats: this.getStreamingStats()
            });

            this.streamId = null;

        } catch (error) {
            console.error('Failed to stop streaming:', error);
            this.emit('streaming-error', error);
        }
    }

    /**
     * Join stream as viewer
     */
    async joinStream(streamId) {
        try {
            this.streamId = streamId;
            this.viewerId = 'viewer_' + Math.random().toString(36).substr(2, 9);
            
            // Create peer connection for viewing
            this.createPeerConnection();
            
            this.isViewing = true;

            // Send join signal
            this.sendSignalingMessage({
                type: 'join-stream',
                streamId: this.streamId,
                viewerId: this.viewerId
            });

            this.emit('stream-joined', {
                streamId: this.streamId,
                viewerId: this.viewerId
            });

            return {
                success: true,
                streamId: this.streamId,
                viewerId: this.viewerId
            };

        } catch (error) {
            console.error('Failed to join stream:', error);
            this.emit('streaming-error', error);
            throw error;
        }
    }

    /**
     * Leave stream
     */
    async leaveStream() {
        try {
            if (this.peerConnection) {
                this.peerConnection.close();
                this.peerConnection = null;
            }

            this.isViewing = false;

            // Send leave signal
            this.sendSignalingMessage({
                type: 'leave-stream',
                streamId: this.streamId,
                viewerId: this.viewerId
            });

            this.emit('stream-left', {
                streamId: this.streamId,
                viewerId: this.viewerId
            });

            this.streamId = null;
            this.viewerId = null;

        } catch (error) {
            console.error('Failed to leave stream:', error);
            this.emit('streaming-error', error);
        }
    }

    /**
     * Create WebRTC peer connection
     */
    createPeerConnection() {
        this.peerConnection = new RTCPeerConnection({
            iceServers: this.config.iceServers
        });

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignalingMessage({
                    type: 'ice-candidate',
                    candidate: event.candidate,
                    streamId: this.streamId
                });
            }
        };

        // Handle remote stream
        this.peerConnection.ontrack = (event) => {
            this.remoteStream = event.streams[0];
            this.emit('remote-stream', this.remoteStream);
        };

        // Handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            console.log('Connection state:', state);
            this.emit('connection-state-change', state);

            if (state === 'failed') {
                this.handleConnectionFailure();
            }
        };

        // Handle ICE connection state changes
        this.peerConnection.oniceconnectionstatechange = () => {
            const state = this.peerConnection.iceConnectionState;
            console.log('ICE connection state:', state);
            this.emit('ice-connection-state-change', state);
        };
    }

    /**
     * Handle signaling messages
     */
    async handleSignalingMessage(message) {
        try {
            switch (message.type) {
                case 'offer':
                    await this.handleOffer(message);
                    break;
                case 'answer':
                    await this.handleAnswer(message);
                    break;
                case 'ice-candidate':
                    await this.handleIceCandidate(message);
                    break;
                case 'stream-started':
                    this.emit('stream-available', message);
                    break;
                case 'stream-ended':
                    this.emit('stream-ended', message);
                    break;
                case 'viewer-joined':
                    this.emit('viewer-joined', message);
                    break;
                case 'viewer-left':
                    this.emit('viewer-left', message);
                    break;
                case 'error':
                    this.emit('signaling-error', message.error);
                    break;
            }
        } catch (error) {
            console.error('Error handling signaling message:', error);
            this.emit('signaling-error', error);
        }
    }

    /**
     * Handle WebRTC offer
     */
    async handleOffer(message) {
        await this.peerConnection.setRemoteDescription(message.offer);
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        this.sendSignalingMessage({
            type: 'answer',
            answer: answer,
            streamId: this.streamId
        });
    }

    /**
     * Handle WebRTC answer
     */
    async handleAnswer(message) {
        await this.peerConnection.setRemoteDescription(message.answer);
    }

    /**
     * Handle ICE candidate
     */
    async handleIceCandidate(message) {
        await this.peerConnection.addIceCandidate(message.candidate);
    }

    /**
     * Configure streaming bitrate
     */
    async configureBitrate() {
        const senders = this.peerConnection.getSenders();
        
        for (const sender of senders) {
            if (sender.track && sender.track.kind === 'video') {
                const params = sender.getParameters();
                
                if (params.encodings && params.encodings.length > 0) {
                    params.encodings[0].maxBitrate = this.config.maxBitrate;
                    await sender.setParameters(params);
                }
            }
        }
    }

    /**
     * Start monitoring streaming statistics
     */
    startStatsMonitoring() {
        if (!this.peerConnection) return;

        const interval = setInterval(async () => {
            if (!this.peerConnection || this.peerConnection.connectionState === 'closed') {
                clearInterval(interval);
                return;
            }

            try {
                const stats = await this.peerConnection.getStats();
                this.updateStreamingStats(stats);
                this.emit('stats-update', this.stats);
            } catch (error) {
                console.error('Error getting stats:', error);
            }
        }, 1000);
    }

    /**
     * Update streaming statistics
     */
    updateStreamingStats(rtcStats) {
        rtcStats.forEach(report => {
            if (report.type === 'outbound-rtp' && report.kind === 'video') {
                this.stats.bytesSent = report.bytesSent || 0;
                this.stats.packetsLost = report.packetsLost || 0;
            } else if (report.type === 'inbound-rtp' && report.kind === 'video') {
                this.stats.bytesReceived = report.bytesReceived || 0;
                this.stats.jitter = report.jitter || 0;
            } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                this.stats.rtt = report.currentRoundTripTime || 0;
            }
        });
    }

    /**
     * Get streaming statistics
     */
    getStreamingStats() {
        const duration = this.stats.startTime ? Date.now() - this.stats.startTime : 0;
        
        return {
            ...this.stats,
            duration: duration,
            avgBitrate: duration > 0 ? (this.stats.bytesSent * 8) / (duration / 1000) : 0,
            packetLossRate: this.stats.packetsLost > 0 ? 
                (this.stats.packetsLost / (this.stats.packetsLost + this.stats.bytesSent)) * 100 : 0
        };
    }

    /**
     * Handle connection failure
     */
    handleConnectionFailure() {
        console.log('Connection failed, attempting to reconnect...');
        
        // Attempt to restart ICE
        if (this.peerConnection) {
            this.peerConnection.restartIce();
        }

        this.emit('connection-failed');
    }

    /**
     * Send signaling message
     */
    sendSignalingMessage(message) {
        if (this.signalingSocket && this.signalingSocket.readyState === WebSocket.OPEN) {
            this.signalingSocket.send(JSON.stringify(message));
        } else {
            console.warn('Signaling socket not ready, message not sent:', message);
        }
    }

    /**
     * Event handling
     */
    on(event, handler) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        this.eventHandlers[event].push(handler);
    }

    off(event, handler) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
        }
    }

    emit(event, data) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error('Error in event handler:', error);
                }
            });
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.isStreaming) {
            this.stopStreaming();
        }
        
        if (this.isViewing) {
            this.leaveStream();
        }

        if (this.signalingSocket) {
            this.signalingSocket.close();
            this.signalingSocket = null;
        }

        this.eventHandlers = {};
    }
}

export default WebRTCStreamingService;
