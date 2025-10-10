/**
 * StreamManager - Core stream management service
 * 
 * Handles:
 * - Stream creation and validation
 * - Stream key management
 * - Stream session tracking
 * - Stream status updates
 * - Stream analytics
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class StreamManager {
  constructor(dbPool, redisClient, logger) {
    this.db = dbPool;
    this.redis = redisClient;
    this.logger = logger;
    this.activeStreams = new Map();
  }

  /**
   * Create a new stream
   */
  async createStream(userId, streamData) {
    try {
      const streamId = uuidv4();
      const streamKey = this.generateStreamKey();
      
      const query = `
        INSERT INTO live_streams (
          id, user_id, title, description, stream_key, 
          category, quality, max_viewers, recording_enabled, 
          chat_enabled, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', NOW(), NOW())
      `;
      
      const values = [
        streamId,
        userId,
        streamData.title,
        streamData.description || '',
        streamKey,
        streamData.category || 'interview',
        streamData.quality || '720p',
        streamData.max_viewers || 1000,
        streamData.recording_enabled || true,
        streamData.chat_enabled || true
      ];
      
      await this.db.execute(query, values);
      
      // Cache stream data in Redis
      await this.redis.setEx(`stream:${streamKey}`, 3600, JSON.stringify({
        id: streamId,
        userId,
        title: streamData.title,
        status: 'scheduled',
        createdAt: new Date().toISOString()
      }));
      
      this.logger.info(`Stream created: ${streamId} with key: ${streamKey}`);
      
      return {
        id: streamId,
        streamKey,
        rtmpUrl: `rtmp://localhost:1935/live/${streamKey}`,
        hlsUrl: `http://localhost:8080/live/${streamKey}/index.m3u8`,
        status: 'scheduled'
      };
    } catch (error) {
      this.logger.error('Error creating stream:', error);
      throw error;
    }
  }

  /**
   * Validate stream key
   */
  async validateStreamKey(streamKey) {
    try {
      // Check Redis cache first
      const cachedStream = await this.redis.get(`stream:${streamKey}`);
      if (cachedStream) {
        const streamData = JSON.parse(cachedStream);
        return streamData.status === 'scheduled' || streamData.status === 'live';
      }
      
      // Check database
      const query = `
        SELECT id, user_id, status, title 
        FROM live_streams 
        WHERE stream_key = ? AND status IN ('scheduled', 'live')
      `;
      
      const [rows] = await this.db.execute(query, [streamKey]);
      
      if (rows.length === 0) {
        return false;
      }
      
      // Cache the result
      await this.redis.setEx(`stream:${streamKey}`, 3600, JSON.stringify({
        id: rows[0].id,
        userId: rows[0].user_id,
        title: rows[0].title,
        status: rows[0].status
      }));
      
      return true;
    } catch (error) {
      this.logger.error('Error validating stream key:', error);
      return false;
    }
  }

  /**
   * Start stream session
   */
  async startStreamSession(streamKey, sessionId) {
    try {
      const streamData = await this.getStreamByKey(streamKey);
      if (!streamData) {
        throw new Error('Stream not found');
      }
      
      // Update stream status to live
      await this.updateStreamStatus(streamKey, 'live');
      
      // Create stream session record
      const sessionQuery = `
        INSERT INTO stream_sessions (
          id, stream_id, session_id, started_at, status
        ) VALUES (?, ?, ?, NOW(), 'active')
      `;
      
      const sessionUuid = uuidv4();
      await this.db.execute(sessionQuery, [sessionUuid, streamData.id, sessionId]);
      
      // Track active stream
      this.activeStreams.set(streamKey, {
        id: streamData.id,
        sessionId,
        startedAt: new Date(),
        viewers: new Set(),
        stats: {
          totalViewers: 0,
          peakViewers: 0,
          chatMessages: 0
        }
      });
      
      this.logger.info(`Stream session started: ${streamKey} (${sessionId})`);
      
      return sessionUuid;
    } catch (error) {
      this.logger.error('Error starting stream session:', error);
      throw error;
    }
  }

  /**
   * End stream session
   */
  async endStreamSession(streamKey) {
    try {
      const streamData = await this.getStreamByKey(streamKey);
      if (!streamData) {
        return;
      }
      
      // Update stream status
      await this.updateStreamStatus(streamKey, 'ended');
      
      // Update session record
      const sessionQuery = `
        UPDATE stream_sessions 
        SET ended_at = NOW(), status = 'completed'
        WHERE stream_id = ? AND status = 'active'
      `;
      
      await this.db.execute(sessionQuery, [streamData.id]);
      
      // Save final statistics
      const activeStream = this.activeStreams.get(streamKey);
      if (activeStream) {
        await this.saveStreamStatistics(streamData.id, activeStream.stats);
        this.activeStreams.delete(streamKey);
      }
      
      this.logger.info(`Stream session ended: ${streamKey}`);
    } catch (error) {
      this.logger.error('Error ending stream session:', error);
    }
  }

  /**
   * Update stream status
   */
  async updateStreamStatus(streamKey, status) {
    try {
      const query = `
        UPDATE live_streams 
        SET status = ?, updated_at = NOW()
        WHERE stream_key = ?
      `;
      
      await this.db.execute(query, [status, streamKey]);
      
      // Update Redis cache
      const cachedStream = await this.redis.get(`stream:${streamKey}`);
      if (cachedStream) {
        const streamData = JSON.parse(cachedStream);
        streamData.status = status;
        await this.redis.setEx(`stream:${streamKey}`, 3600, JSON.stringify(streamData));
      }
      
      this.logger.debug(`Stream status updated: ${streamKey} -> ${status}`);
    } catch (error) {
      this.logger.error('Error updating stream status:', error);
      throw error;
    }
  }

  /**
   * Get stream by key
   */
  async getStreamByKey(streamKey) {
    try {
      // Check Redis cache first
      const cachedStream = await this.redis.get(`stream:${streamKey}`);
      if (cachedStream) {
        return JSON.parse(cachedStream);
      }
      
      // Query database
      const query = `
        SELECT id, user_id, title, description, status, created_at
        FROM live_streams 
        WHERE stream_key = ?
      `;
      
      const [rows] = await this.db.execute(query, [streamKey]);
      
      if (rows.length === 0) {
        return null;
      }
      
      const streamData = {
        id: rows[0].id,
        userId: rows[0].user_id,
        title: rows[0].title,
        description: rows[0].description,
        status: rows[0].status,
        createdAt: rows[0].created_at
      };
      
      // Cache the result
      await this.redis.setEx(`stream:${streamKey}`, 3600, JSON.stringify(streamData));
      
      return streamData;
    } catch (error) {
      this.logger.error('Error getting stream by key:', error);
      return null;
    }
  }

  /**
   * Add viewer to stream
   */
  async addViewer(streamKey, viewerId) {
    try {
      const activeStream = this.activeStreams.get(streamKey);
      if (!activeStream) {
        return false;
      }
      
      activeStream.viewers.add(viewerId);
      activeStream.stats.totalViewers++;
      
      if (activeStream.viewers.size > activeStream.stats.peakViewers) {
        activeStream.stats.peakViewers = activeStream.viewers.size;
      }
      
      // Update viewer count in Redis
      await this.redis.setEx(`stream:${streamKey}:viewers`, 300, activeStream.viewers.size);
      
      this.logger.debug(`Viewer added to stream: ${streamKey} (${viewerId})`);
      return true;
    } catch (error) {
      this.logger.error('Error adding viewer:', error);
      return false;
    }
  }

  /**
   * Remove viewer from stream
   */
  async removeViewer(streamKey, viewerId) {
    try {
      const activeStream = this.activeStreams.get(streamKey);
      if (!activeStream) {
        return false;
      }
      
      activeStream.viewers.delete(viewerId);
      
      // Update viewer count in Redis
      await this.redis.setEx(`stream:${streamKey}:viewers`, 300, activeStream.viewers.size);
      
      this.logger.debug(`Viewer removed from stream: ${streamKey} (${viewerId})`);
      return true;
    } catch (error) {
      this.logger.error('Error removing viewer:', error);
      return false;
    }
  }

  /**
   * Get stream statistics
   */
  async getStreamStats(streamKey) {
    try {
      const activeStream = this.activeStreams.get(streamKey);
      if (!activeStream) {
        return null;
      }
      
      return {
        currentViewers: activeStream.viewers.size,
        totalViewers: activeStream.stats.totalViewers,
        peakViewers: activeStream.stats.peakViewers,
        chatMessages: activeStream.stats.chatMessages,
        duration: Date.now() - activeStream.startedAt.getTime()
      };
    } catch (error) {
      this.logger.error('Error getting stream stats:', error);
      return null;
    }
  }

  /**
   * Generate secure stream key
   */
  generateStreamKey() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Save stream statistics to database
   */
  async saveStreamStatistics(streamId, stats) {
    try {
      const query = `
        INSERT INTO stream_analytics (
          stream_id, total_viewers, peak_viewers, chat_messages, created_at
        ) VALUES (?, ?, ?, ?, NOW())
      `;
      
      await this.db.execute(query, [
        streamId,
        stats.totalViewers,
        stats.peakViewers,
        stats.chatMessages
      ]);
      
      this.logger.debug(`Stream statistics saved for stream: ${streamId}`);
    } catch (error) {
      this.logger.error('Error saving stream statistics:', error);
    }
  }

  /**
   * Get active streams
   */
  getActiveStreams() {
    const streams = [];
    for (const [streamKey, streamData] of this.activeStreams) {
      streams.push({
        streamKey,
        id: streamData.id,
        currentViewers: streamData.viewers.size,
        stats: streamData.stats,
        startedAt: streamData.startedAt
      });
    }
    return streams;
  }
}

module.exports = StreamManager;
