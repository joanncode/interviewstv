/**
 * AnalyticsCollector - Comprehensive Streaming Analytics
 * 
 * Handles:
 * - Real-time viewer analytics and metrics
 * - Stream performance monitoring
 * - Audience engagement tracking
 * - Geographic and device analytics
 * - Revenue and monetization metrics
 * - Historical data aggregation
 */

class AnalyticsCollector {
  constructor(dbPool, redisClient, logger) {
    this.db = dbPool;
    this.redis = redisClient;
    this.logger = logger;
    
    // Active analytics sessions
    this.analyticsSessions = new Map();
    
    // Analytics configuration
    this.config = {
      updateInterval: parseInt(process.env.ANALYTICS_UPDATE_INTERVAL || '30') * 1000, // 30 seconds
      retentionDays: parseInt(process.env.ANALYTICS_RETENTION_DAYS || '90'),
      enableRealTimeAnalytics: process.env.ENABLE_ANALYTICS !== 'false',
      batchSize: 100,
      aggregationIntervals: ['1m', '5m', '15m', '1h', '1d']
    };

    // Start analytics processing
    if (this.config.enableRealTimeAnalytics) {
      this.startAnalyticsProcessor();
    }
  }

  /**
   * Handle new WebSocket connection for analytics
   */
  handleConnection(socket) {
    // Track viewer join
    socket.on('analytics:viewer-join', (data) => {
      this.trackViewerJoin(socket, data);
    });

    // Track viewer leave
    socket.on('analytics:viewer-leave', (data) => {
      this.trackViewerLeave(socket, data);
    });

    // Track engagement events
    socket.on('analytics:engagement', (data) => {
      this.trackEngagement(socket, data);
    });

    // Track quality changes
    socket.on('analytics:quality-change', (data) => {
      this.trackQualityChange(socket, data);
    });

    // Track errors
    socket.on('analytics:error', (data) => {
      this.trackError(socket, data);
    });

    // Send real-time analytics
    socket.on('analytics:subscribe', (data) => {
      this.subscribeToAnalytics(socket, data);
    });

    socket.on('analytics:unsubscribe', (data) => {
      this.unsubscribeFromAnalytics(socket, data);
    });
  }

  /**
   * Track viewer joining a stream
   */
  async trackViewerJoin(socket, data) {
    try {
      const { streamId, userId, sessionId, userAgent, ipAddress, location } = data;
      
      const viewerData = {
        streamId,
        userId: userId || null,
        sessionId: sessionId || socket.id,
        socketId: socket.id,
        joinedAt: new Date(),
        userAgent,
        ipAddress,
        location: location || {},
        device: this.parseUserAgent(userAgent),
        events: []
      };

      // Store in active sessions
      this.analyticsSessions.set(socket.id, viewerData);

      // Update real-time viewer count
      await this.updateViewerCount(streamId, 1);

      // Track in database
      await this.saveViewerSession(viewerData);

      // Update stream analytics
      await this.updateStreamAnalytics(streamId, 'viewer_join', viewerData);

      this.logger.debug(`Viewer joined stream ${streamId}: ${socket.id}`);
    } catch (error) {
      this.logger.error('Error tracking viewer join:', error);
    }
  }

  /**
   * Track viewer leaving a stream
   */
  async trackViewerLeave(socket, data) {
    try {
      const viewerData = this.analyticsSessions.get(socket.id);
      if (!viewerData) {
        return;
      }

      const { streamId } = data || { streamId: viewerData.streamId };
      
      // Calculate watch time
      const watchTime = Date.now() - viewerData.joinedAt.getTime();
      viewerData.leftAt = new Date();
      viewerData.watchTime = watchTime;

      // Update real-time viewer count
      await this.updateViewerCount(streamId, -1);

      // Update viewer session in database
      await this.updateViewerSession(viewerData);

      // Update stream analytics
      await this.updateStreamAnalytics(streamId, 'viewer_leave', viewerData);

      // Remove from active sessions
      this.analyticsSessions.delete(socket.id);

      this.logger.debug(`Viewer left stream ${streamId}: ${socket.id} (watch time: ${watchTime}ms)`);
    } catch (error) {
      this.logger.error('Error tracking viewer leave:', error);
    }
  }

  /**
   * Track engagement events (chat, reactions, etc.)
   */
  async trackEngagement(socket, data) {
    try {
      const viewerData = this.analyticsSessions.get(socket.id);
      if (!viewerData) {
        return;
      }

      const { eventType, eventData } = data;
      
      const engagementEvent = {
        type: eventType,
        data: eventData,
        timestamp: new Date()
      };

      // Add to viewer events
      viewerData.events.push(engagementEvent);

      // Update stream engagement metrics
      await this.updateEngagementMetrics(viewerData.streamId, eventType);

      // Store in Redis for real-time analytics
      await this.redis.lpush(
        `analytics:${viewerData.streamId}:engagement`,
        JSON.stringify(engagementEvent)
      );
      await this.redis.ltrim(`analytics:${viewerData.streamId}:engagement`, 0, 999);
      await this.redis.expire(`analytics:${viewerData.streamId}:engagement`, 3600);

      this.logger.debug(`Engagement tracked: ${eventType} for stream ${viewerData.streamId}`);
    } catch (error) {
      this.logger.error('Error tracking engagement:', error);
    }
  }

  /**
   * Track quality changes
   */
  async trackQualityChange(socket, data) {
    try {
      const viewerData = this.analyticsSessions.get(socket.id);
      if (!viewerData) {
        return;
      }

      const { fromQuality, toQuality, reason } = data;
      
      const qualityEvent = {
        type: 'quality_change',
        fromQuality,
        toQuality,
        reason,
        timestamp: new Date()
      };

      viewerData.events.push(qualityEvent);

      // Update quality analytics
      await this.updateQualityAnalytics(viewerData.streamId, qualityEvent);

      this.logger.debug(`Quality change tracked: ${fromQuality} -> ${toQuality} for stream ${viewerData.streamId}`);
    } catch (error) {
      this.logger.error('Error tracking quality change:', error);
    }
  }

  /**
   * Track errors
   */
  async trackError(socket, data) {
    try {
      const viewerData = this.analyticsSessions.get(socket.id);
      const streamId = viewerData ? viewerData.streamId : data.streamId;

      const errorEvent = {
        type: 'error',
        error: data.error,
        context: data.context,
        timestamp: new Date(),
        socketId: socket.id,
        streamId
      };

      // Store error in Redis
      await this.redis.lpush(
        `analytics:${streamId}:errors`,
        JSON.stringify(errorEvent)
      );
      await this.redis.ltrim(`analytics:${streamId}:errors`, 0, 99);
      await this.redis.expire(`analytics:${streamId}:errors`, 3600);

      this.logger.warn(`Error tracked for stream ${streamId}:`, data.error);
    } catch (error) {
      this.logger.error('Error tracking error event:', error);
    }
  }

  /**
   * Update real-time viewer count
   */
  async updateViewerCount(streamId, delta) {
    try {
      const key = `analytics:${streamId}:viewers`;
      const currentCount = await this.redis.get(key) || '0';
      const newCount = Math.max(0, parseInt(currentCount) + delta);
      
      await this.redis.setEx(key, 3600, newCount.toString());

      // Update peak viewers if necessary
      const peakKey = `analytics:${streamId}:peak_viewers`;
      const peakCount = await this.redis.get(peakKey) || '0';
      
      if (newCount > parseInt(peakCount)) {
        await this.redis.setEx(peakKey, 86400, newCount.toString());
      }

      // Broadcast viewer count update
      this.io?.to(`analytics:${streamId}`).emit('analytics:viewer-count', {
        streamId,
        currentViewers: newCount,
        peakViewers: Math.max(newCount, parseInt(peakCount))
      });
    } catch (error) {
      this.logger.error('Error updating viewer count:', error);
    }
  }

  /**
   * Update engagement metrics
   */
  async updateEngagementMetrics(streamId, eventType) {
    try {
      const key = `analytics:${streamId}:engagement:${eventType}`;
      await this.redis.incr(key);
      await this.redis.expire(key, 86400);

      // Update total engagement
      const totalKey = `analytics:${streamId}:engagement:total`;
      await this.redis.incr(totalKey);
      await this.redis.expire(totalKey, 86400);
    } catch (error) {
      this.logger.error('Error updating engagement metrics:', error);
    }
  }

  /**
   * Update quality analytics
   */
  async updateQualityAnalytics(streamId, qualityEvent) {
    try {
      const key = `analytics:${streamId}:quality_changes`;
      await this.redis.lpush(key, JSON.stringify(qualityEvent));
      await this.redis.ltrim(key, 0, 499);
      await this.redis.expire(key, 86400);
    } catch (error) {
      this.logger.error('Error updating quality analytics:', error);
    }
  }

  /**
   * Get real-time analytics for a stream
   */
  async getStreamAnalytics(streamId) {
    try {
      const analytics = {
        streamId,
        timestamp: new Date(),
        realTime: {},
        engagement: {},
        quality: {},
        errors: []
      };

      // Get real-time metrics from Redis
      const [
        currentViewers,
        peakViewers,
        totalEngagement,
        chatMessages,
        reactions,
        qualityChanges,
        errors
      ] = await Promise.all([
        this.redis.get(`analytics:${streamId}:viewers`),
        this.redis.get(`analytics:${streamId}:peak_viewers`),
        this.redis.get(`analytics:${streamId}:engagement:total`),
        this.redis.get(`analytics:${streamId}:engagement:chat_message`),
        this.redis.get(`analytics:${streamId}:engagement:reaction`),
        this.redis.lrange(`analytics:${streamId}:quality_changes`, 0, 9),
        this.redis.lrange(`analytics:${streamId}:errors`, 0, 9)
      ]);

      analytics.realTime = {
        currentViewers: parseInt(currentViewers || '0'),
        peakViewers: parseInt(peakViewers || '0')
      };

      analytics.engagement = {
        total: parseInt(totalEngagement || '0'),
        chatMessages: parseInt(chatMessages || '0'),
        reactions: parseInt(reactions || '0')
      };

      analytics.quality = {
        recentChanges: qualityChanges.map(change => JSON.parse(change))
      };

      analytics.errors = errors.map(error => JSON.parse(error));

      return analytics;
    } catch (error) {
      this.logger.error('Error getting stream analytics:', error);
      return null;
    }
  }

  /**
   * Get historical analytics
   */
  async getHistoricalAnalytics(streamId, timeRange = '24h') {
    try {
      const query = `
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') as hour,
          COUNT(DISTINCT user_id) as unique_viewers,
          COUNT(*) as total_views,
          AVG(duration_seconds) as avg_watch_time,
          SUM(chat_messages_sent) as chat_messages,
          SUM(reactions_sent) as reactions
        FROM stream_viewers 
        WHERE stream_id = ? 
          AND created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
        GROUP BY hour
        ORDER BY hour
      `;

      const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 24;
      const [rows] = await this.db.execute(query, [streamId, hours]);

      return {
        streamId,
        timeRange,
        data: rows
      };
    } catch (error) {
      this.logger.error('Error getting historical analytics:', error);
      return null;
    }
  }

  /**
   * Save viewer session to database
   */
  async saveViewerSession(viewerData) {
    try {
      const query = `
        INSERT INTO stream_viewers (
          stream_id, user_id, session_id, ip_address, user_agent,
          country_code, city, device_type, browser, joined_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.db.execute(query, [
        viewerData.streamId,
        viewerData.userId,
        viewerData.sessionId,
        viewerData.ipAddress,
        viewerData.userAgent,
        viewerData.location.countryCode || null,
        viewerData.location.city || null,
        viewerData.device.type || null,
        viewerData.device.browser || null,
        viewerData.joinedAt
      ]);
    } catch (error) {
      this.logger.error('Error saving viewer session:', error);
    }
  }

  /**
   * Update viewer session in database
   */
  async updateViewerSession(viewerData) {
    try {
      const query = `
        UPDATE stream_viewers 
        SET left_at = ?, duration_seconds = ?, 
            chat_messages_sent = ?, reactions_sent = ?
        WHERE session_id = ? AND stream_id = ?
      `;

      const chatMessages = viewerData.events.filter(e => e.type === 'chat_message').length;
      const reactions = viewerData.events.filter(e => e.type === 'reaction').length;

      await this.db.execute(query, [
        viewerData.leftAt,
        Math.floor(viewerData.watchTime / 1000),
        chatMessages,
        reactions,
        viewerData.sessionId,
        viewerData.streamId
      ]);
    } catch (error) {
      this.logger.error('Error updating viewer session:', error);
    }
  }

  /**
   * Update stream analytics in database
   */
  async updateStreamAnalytics(streamId, eventType, data) {
    try {
      // This would update aggregated analytics in the database
      // Implementation depends on specific analytics requirements
      this.logger.debug(`Stream analytics updated: ${eventType} for stream ${streamId}`);
    } catch (error) {
      this.logger.error('Error updating stream analytics:', error);
    }
  }

  /**
   * Parse user agent for device information
   */
  parseUserAgent(userAgent) {
    if (!userAgent) {
      return { type: 'unknown', browser: 'unknown', os: 'unknown' };
    }

    // Basic user agent parsing (in production, use a proper library)
    const device = {
      type: 'desktop',
      browser: 'unknown',
      os: 'unknown'
    };

    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      device.type = 'mobile';
    } else if (/Tablet|iPad/.test(userAgent)) {
      device.type = 'tablet';
    }

    if (/Chrome/.test(userAgent)) {
      device.browser = 'Chrome';
    } else if (/Firefox/.test(userAgent)) {
      device.browser = 'Firefox';
    } else if (/Safari/.test(userAgent)) {
      device.browser = 'Safari';
    } else if (/Edge/.test(userAgent)) {
      device.browser = 'Edge';
    }

    if (/Windows/.test(userAgent)) {
      device.os = 'Windows';
    } else if (/Mac/.test(userAgent)) {
      device.os = 'macOS';
    } else if (/Linux/.test(userAgent)) {
      device.os = 'Linux';
    } else if (/Android/.test(userAgent)) {
      device.os = 'Android';
    } else if (/iOS/.test(userAgent)) {
      device.os = 'iOS';
    }

    return device;
  }

  /**
   * Subscribe to real-time analytics
   */
  subscribeToAnalytics(socket, data) {
    const { streamId } = data;
    socket.join(`analytics:${streamId}`);
    this.logger.debug(`Socket ${socket.id} subscribed to analytics for stream ${streamId}`);
  }

  /**
   * Unsubscribe from real-time analytics
   */
  unsubscribeFromAnalytics(socket, data) {
    const { streamId } = data;
    socket.leave(`analytics:${streamId}`);
    this.logger.debug(`Socket ${socket.id} unsubscribed from analytics for stream ${streamId}`);
  }

  /**
   * Start analytics processor for aggregation
   */
  startAnalyticsProcessor() {
    setInterval(() => {
      this.processAnalytics();
    }, this.config.updateInterval);

    this.logger.info('Analytics processor started');
  }

  /**
   * Process and aggregate analytics data
   */
  async processAnalytics() {
    try {
      // This would run periodic analytics aggregation
      // Implementation depends on specific requirements
      this.logger.debug('Processing analytics data...');
    } catch (error) {
      this.logger.error('Error processing analytics:', error);
    }
  }

  /**
   * Get analytics summary for admin dashboard
   */
  async getAnalyticsSummary() {
    try {
      const summary = {
        totalStreams: 0,
        activeStreams: 0,
        totalViewers: 0,
        totalWatchTime: 0,
        topStreams: []
      };

      // Get data from Redis and database
      const activeStreams = await this.redis.keys('analytics:*:viewers');
      summary.activeStreams = activeStreams.length;

      for (const key of activeStreams) {
        const viewers = await this.redis.get(key);
        summary.totalViewers += parseInt(viewers || '0');
      }

      // Get additional data from database
      const query = `
        SELECT COUNT(*) as total_streams,
               SUM(duration_seconds) as total_watch_time
        FROM stream_viewers 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `;

      const [rows] = await this.db.execute(query);
      if (rows[0]) {
        summary.totalStreams = rows[0].total_streams;
        summary.totalWatchTime = rows[0].total_watch_time;
      }

      return summary;
    } catch (error) {
      this.logger.error('Error getting analytics summary:', error);
      return null;
    }
  }
}

module.exports = AnalyticsCollector;
