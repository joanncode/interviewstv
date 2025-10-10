/**
 * WebRTC Signaling Server
 * 
 * Handles:
 * - Peer connection establishment
 * - SDP offer/answer exchange
 * - ICE candidate exchange
 * - Room management for streams
 * - Connection quality monitoring
 */

class WebRTCSignaling {
  constructor(io, logger) {
    this.io = io;
    this.logger = logger;
    this.rooms = new Map(); // streamId -> Set of socketIds
    this.connections = new Map(); // socketId -> connection info
    
    // WebRTC configuration
    this.rtcConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
    };
    
    // Add TURN servers if configured
    if (process.env.TURN_SERVER) {
      this.rtcConfiguration.iceServers.push({
        urls: process.env.TURN_SERVER,
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_PASSWORD
      });
    }
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(socket) {
    this.logger.debug(`WebRTC signaling connection: ${socket.id}`);
    
    // Initialize connection info
    this.connections.set(socket.id, {
      socketId: socket.id,
      userId: null,
      streamId: null,
      role: null, // 'broadcaster' or 'viewer'
      joinedAt: new Date(),
      connectionState: 'new'
    });

    // Handle WebRTC signaling events
    this.setupSignalingHandlers(socket);
    
    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket.id);
    });
  }

  /**
   * Setup WebRTC signaling event handlers
   */
  setupSignalingHandlers(socket) {
    // Join stream room
    socket.on('webrtc:join-stream', (data) => {
      this.handleJoinStream(socket, data);
    });

    // Leave stream room
    socket.on('webrtc:leave-stream', (data) => {
      this.handleLeaveStream(socket, data);
    });

    // SDP Offer (from broadcaster)
    socket.on('webrtc:offer', (data) => {
      this.handleOffer(socket, data);
    });

    // SDP Answer (from viewer)
    socket.on('webrtc:answer', (data) => {
      this.handleAnswer(socket, data);
    });

    // ICE Candidate exchange
    socket.on('webrtc:ice-candidate', (data) => {
      this.handleIceCandidate(socket, data);
    });

    // Connection state updates
    socket.on('webrtc:connection-state', (data) => {
      this.handleConnectionState(socket, data);
    });

    // Request stream configuration
    socket.on('webrtc:get-config', () => {
      socket.emit('webrtc:config', {
        rtcConfiguration: this.rtcConfiguration,
        constraints: {
          video: {
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 360, ideal: 720, max: 1080 },
            frameRate: { min: 15, ideal: 30, max: 60 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        }
      });
    });

    // Broadcaster events
    socket.on('webrtc:start-broadcast', (data) => {
      this.handleStartBroadcast(socket, data);
    });

    socket.on('webrtc:stop-broadcast', (data) => {
      this.handleStopBroadcast(socket, data);
    });

    // Quality adjustment
    socket.on('webrtc:adjust-quality', (data) => {
      this.handleQualityAdjustment(socket, data);
    });
  }

  /**
   * Handle join stream request
   */
  handleJoinStream(socket, data) {
    try {
      const { streamId, userId, role } = data;
      
      if (!streamId || !role) {
        socket.emit('webrtc:error', { message: 'Stream ID and role are required' });
        return;
      }

      // Update connection info
      const connection = this.connections.get(socket.id);
      if (connection) {
        connection.userId = userId;
        connection.streamId = streamId;
        connection.role = role;
        connection.connectionState = 'joining';
      }

      // Add to room
      if (!this.rooms.has(streamId)) {
        this.rooms.set(streamId, new Set());
      }
      
      this.rooms.get(streamId).add(socket.id);
      socket.join(`stream:${streamId}`);

      // Notify about successful join
      socket.emit('webrtc:joined', {
        streamId,
        role,
        roomSize: this.rooms.get(streamId).size,
        rtcConfiguration: this.rtcConfiguration
      });

      // Notify others in the room
      socket.to(`stream:${streamId}`).emit('webrtc:peer-joined', {
        socketId: socket.id,
        userId,
        role
      });

      this.logger.info(`User ${userId} joined stream ${streamId} as ${role}`);
    } catch (error) {
      this.logger.error('Error handling join stream:', error);
      socket.emit('webrtc:error', { message: 'Failed to join stream' });
    }
  }

  /**
   * Handle leave stream request
   */
  handleLeaveStream(socket, data) {
    try {
      const connection = this.connections.get(socket.id);
      if (!connection || !connection.streamId) {
        return;
      }

      const streamId = connection.streamId;
      
      // Remove from room
      if (this.rooms.has(streamId)) {
        this.rooms.get(streamId).delete(socket.id);
        
        // Clean up empty rooms
        if (this.rooms.get(streamId).size === 0) {
          this.rooms.delete(streamId);
        }
      }

      socket.leave(`stream:${streamId}`);

      // Notify others in the room
      socket.to(`stream:${streamId}`).emit('webrtc:peer-left', {
        socketId: socket.id,
        userId: connection.userId
      });

      // Reset connection info
      connection.streamId = null;
      connection.role = null;
      connection.connectionState = 'disconnected';

      socket.emit('webrtc:left', { streamId });

      this.logger.info(`User ${connection.userId} left stream ${streamId}`);
    } catch (error) {
      this.logger.error('Error handling leave stream:', error);
    }
  }

  /**
   * Handle SDP offer
   */
  handleOffer(socket, data) {
    try {
      const { targetSocketId, offer, streamId } = data;
      const connection = this.connections.get(socket.id);

      if (!connection || connection.streamId !== streamId) {
        socket.emit('webrtc:error', { message: 'Not authorized for this stream' });
        return;
      }

      // Forward offer to target peer
      socket.to(targetSocketId).emit('webrtc:offer', {
        fromSocketId: socket.id,
        offer,
        streamId
      });

      this.logger.debug(`Forwarded offer from ${socket.id} to ${targetSocketId}`);
    } catch (error) {
      this.logger.error('Error handling offer:', error);
      socket.emit('webrtc:error', { message: 'Failed to send offer' });
    }
  }

  /**
   * Handle SDP answer
   */
  handleAnswer(socket, data) {
    try {
      const { targetSocketId, answer, streamId } = data;
      const connection = this.connections.get(socket.id);

      if (!connection || connection.streamId !== streamId) {
        socket.emit('webrtc:error', { message: 'Not authorized for this stream' });
        return;
      }

      // Forward answer to target peer
      socket.to(targetSocketId).emit('webrtc:answer', {
        fromSocketId: socket.id,
        answer,
        streamId
      });

      this.logger.debug(`Forwarded answer from ${socket.id} to ${targetSocketId}`);
    } catch (error) {
      this.logger.error('Error handling answer:', error);
      socket.emit('webrtc:error', { message: 'Failed to send answer' });
    }
  }

  /**
   * Handle ICE candidate
   */
  handleIceCandidate(socket, data) {
    try {
      const { targetSocketId, candidate, streamId } = data;
      const connection = this.connections.get(socket.id);

      if (!connection || connection.streamId !== streamId) {
        return;
      }

      // Forward ICE candidate to target peer
      if (targetSocketId) {
        socket.to(targetSocketId).emit('webrtc:ice-candidate', {
          fromSocketId: socket.id,
          candidate,
          streamId
        });
      } else {
        // Broadcast to all peers in the stream
        socket.to(`stream:${streamId}`).emit('webrtc:ice-candidate', {
          fromSocketId: socket.id,
          candidate,
          streamId
        });
      }

      this.logger.debug(`Forwarded ICE candidate from ${socket.id}`);
    } catch (error) {
      this.logger.error('Error handling ICE candidate:', error);
    }
  }

  /**
   * Handle connection state updates
   */
  handleConnectionState(socket, data) {
    try {
      const { state, streamId } = data;
      const connection = this.connections.get(socket.id);

      if (connection) {
        connection.connectionState = state;
      }

      // Notify stream room about connection state
      socket.to(`stream:${streamId}`).emit('webrtc:peer-connection-state', {
        socketId: socket.id,
        state
      });

      this.logger.debug(`Connection state update: ${socket.id} -> ${state}`);
    } catch (error) {
      this.logger.error('Error handling connection state:', error);
    }
  }

  /**
   * Handle start broadcast
   */
  handleStartBroadcast(socket, data) {
    try {
      const { streamId } = data;
      const connection = this.connections.get(socket.id);

      if (!connection || connection.role !== 'broadcaster') {
        socket.emit('webrtc:error', { message: 'Only broadcasters can start broadcast' });
        return;
      }

      // Notify all viewers in the stream
      socket.to(`stream:${streamId}`).emit('webrtc:broadcast-started', {
        broadcasterSocketId: socket.id,
        streamId
      });

      this.logger.info(`Broadcast started for stream ${streamId} by ${socket.id}`);
    } catch (error) {
      this.logger.error('Error handling start broadcast:', error);
    }
  }

  /**
   * Handle stop broadcast
   */
  handleStopBroadcast(socket, data) {
    try {
      const { streamId } = data;
      const connection = this.connections.get(socket.id);

      if (!connection || connection.role !== 'broadcaster') {
        return;
      }

      // Notify all viewers in the stream
      socket.to(`stream:${streamId}`).emit('webrtc:broadcast-stopped', {
        broadcasterSocketId: socket.id,
        streamId
      });

      this.logger.info(`Broadcast stopped for stream ${streamId} by ${socket.id}`);
    } catch (error) {
      this.logger.error('Error handling stop broadcast:', error);
    }
  }

  /**
   * Handle quality adjustment
   */
  handleQualityAdjustment(socket, data) {
    try {
      const { streamId, quality } = data;
      const connection = this.connections.get(socket.id);

      if (!connection || connection.streamId !== streamId) {
        return;
      }

      // Broadcast quality change to all peers
      socket.to(`stream:${streamId}`).emit('webrtc:quality-changed', {
        fromSocketId: socket.id,
        quality
      });

      this.logger.debug(`Quality adjustment: ${socket.id} -> ${quality}`);
    } catch (error) {
      this.logger.error('Error handling quality adjustment:', error);
    }
  }

  /**
   * Handle disconnection
   */
  handleDisconnection(socketId) {
    try {
      const connection = this.connections.get(socketId);
      
      if (connection && connection.streamId) {
        // Remove from room
        if (this.rooms.has(connection.streamId)) {
          this.rooms.get(connection.streamId).delete(socketId);
          
          // Clean up empty rooms
          if (this.rooms.get(connection.streamId).size === 0) {
            this.rooms.delete(connection.streamId);
          }
        }

        // Notify others in the stream
        this.io.to(`stream:${connection.streamId}`).emit('webrtc:peer-disconnected', {
          socketId,
          userId: connection.userId
        });

        this.logger.info(`User ${connection.userId} disconnected from stream ${connection.streamId}`);
      }

      // Clean up connection info
      this.connections.delete(socketId);
    } catch (error) {
      this.logger.error('Error handling disconnection:', error);
    }
  }

  /**
   * Get room statistics
   */
  getRoomStats(streamId) {
    const room = this.rooms.get(streamId);
    if (!room) {
      return null;
    }

    const connections = Array.from(room).map(socketId => {
      const conn = this.connections.get(socketId);
      return conn ? {
        socketId,
        userId: conn.userId,
        role: conn.role,
        connectionState: conn.connectionState,
        joinedAt: conn.joinedAt
      } : null;
    }).filter(Boolean);

    return {
      streamId,
      totalConnections: room.size,
      broadcasters: connections.filter(c => c.role === 'broadcaster').length,
      viewers: connections.filter(c => c.role === 'viewer').length,
      connections
    };
  }

  /**
   * Get all active rooms
   */
  getAllRooms() {
    const rooms = [];
    for (const streamId of this.rooms.keys()) {
      const stats = this.getRoomStats(streamId);
      if (stats) {
        rooms.push(stats);
      }
    }
    return rooms;
  }
}

module.exports = WebRTCSignaling;
