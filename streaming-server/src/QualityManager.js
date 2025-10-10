/**
 * QualityManager - Adaptive Bitrate Streaming and Quality Control
 * 
 * Handles:
 * - Multi-bitrate encoding (ABR)
 * - Automatic quality adjustment based on network conditions
 * - Quality metrics collection and analysis
 * - Bandwidth optimization
 * - CDN integration for global delivery
 */

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;

class QualityManager {
  constructor(logger, redisClient) {
    this.logger = logger;
    this.redis = redisClient;
    
    // Quality presets for adaptive bitrate streaming
    this.qualityPresets = {
      '240p': {
        resolution: '426x240',
        videoBitrate: '400k',
        audioBitrate: '64k',
        fps: 15,
        profile: 'baseline',
        level: '3.0'
      },
      '360p': {
        resolution: '640x360',
        videoBitrate: '800k',
        audioBitrate: '96k',
        fps: 30,
        profile: 'baseline',
        level: '3.1'
      },
      '480p': {
        resolution: '854x480',
        videoBitrate: '1200k',
        audioBitrate: '128k',
        fps: 30,
        profile: 'main',
        level: '3.1'
      },
      '720p': {
        resolution: '1280x720',
        videoBitrate: '2500k',
        audioBitrate: '128k',
        fps: 30,
        profile: 'high',
        level: '3.1'
      },
      '1080p': {
        resolution: '1920x1080',
        videoBitrate: '4500k',
        audioBitrate: '192k',
        fps: 30,
        profile: 'high',
        level: '4.0'
      }
    };

    // Network condition thresholds for quality adjustment
    this.networkThresholds = {
      excellent: { minBandwidth: 5000, maxLatency: 50, maxPacketLoss: 0.1 },
      good: { minBandwidth: 2500, maxLatency: 100, maxPacketLoss: 0.5 },
      fair: { minBandwidth: 1200, maxLatency: 200, maxPacketLoss: 1.0 },
      poor: { minBandwidth: 800, maxLatency: 500, maxPacketLoss: 2.0 }
    };

    // Active quality sessions
    this.qualitySessions = new Map();
  }

  /**
   * Initialize multi-bitrate encoding for a stream
   */
  async initializeABR(streamKey, inputSource) {
    try {
      const sessionId = `abr_${streamKey}_${Date.now()}`;
      const outputDir = path.join('./media/live', streamKey);
      
      // Create output directory
      await fs.mkdir(outputDir, { recursive: true });

      // Generate HLS playlists for each quality
      const qualities = ['240p', '360p', '480p', '720p', '1080p'];
      const encodingPromises = qualities.map(quality => 
        this.createQualityVariant(sessionId, inputSource, quality, outputDir)
      );

      // Start all encoding processes
      const encodingProcesses = await Promise.all(encodingPromises);

      // Create master playlist
      await this.createMasterPlaylist(streamKey, qualities, outputDir);

      // Store session info
      this.qualitySessions.set(streamKey, {
        sessionId,
        outputDir,
        qualities,
        encodingProcesses,
        startedAt: new Date(),
        currentQuality: '720p',
        networkCondition: 'good'
      });

      this.logger.info(`ABR initialized for stream ${streamKey} with ${qualities.length} quality variants`);
      
      return {
        sessionId,
        masterPlaylist: `${outputDir}/master.m3u8`,
        qualities: qualities.map(q => ({
          quality: q,
          playlist: `${outputDir}/${q}/index.m3u8`,
          ...this.qualityPresets[q]
        }))
      };
    } catch (error) {
      this.logger.error('Error initializing ABR:', error);
      throw error;
    }
  }

  /**
   * Create a quality variant for ABR
   */
  async createQualityVariant(sessionId, inputSource, quality, outputDir) {
    return new Promise((resolve, reject) => {
      const preset = this.qualityPresets[quality];
      const qualityDir = path.join(outputDir, quality);
      
      const command = ffmpeg(inputSource)
        .inputOptions([
          '-re', // Read input at native frame rate
          '-fflags', '+genpts'
        ])
        .videoCodec('libx264')
        .audioCodec('aac')
        .size(preset.resolution)
        .videoBitrate(preset.videoBitrate)
        .audioBitrate(preset.audioBitrate)
        .fps(preset.fps)
        .outputOptions([
          '-preset', 'veryfast',
          '-tune', 'zerolatency',
          '-profile:v', preset.profile,
          '-level', preset.level,
          '-g', '60', // GOP size (2 seconds at 30fps)
          '-keyint_min', '60',
          '-sc_threshold', '0',
          '-hls_time', '2',
          '-hls_list_size', '10',
          '-hls_flags', 'delete_segments+append_list',
          '-hls_segment_filename', `${qualityDir}/segment_%03d.ts`,
          '-f', 'hls'
        ])
        .output(`${qualityDir}/index.m3u8`)
        .on('start', (commandLine) => {
          this.logger.debug(`FFmpeg started for ${quality}: ${commandLine}`);
        })
        .on('progress', (progress) => {
          this.updateQualityMetrics(sessionId, quality, progress);
        })
        .on('error', (err) => {
          this.logger.error(`FFmpeg error for ${quality}:`, err);
          reject(err);
        })
        .on('end', () => {
          this.logger.info(`FFmpeg finished for ${quality}`);
          resolve();
        });

      // Create quality directory
      fs.mkdir(qualityDir, { recursive: true }).then(() => {
        command.run();
      }).catch(reject);

      return command;
    });
  }

  /**
   * Create HLS master playlist for ABR
   */
  async createMasterPlaylist(streamKey, qualities, outputDir) {
    try {
      let masterContent = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

      for (const quality of qualities) {
        const preset = this.qualityPresets[quality];
        const bandwidth = parseInt(preset.videoBitrate) * 1000 + parseInt(preset.audioBitrate) * 1000;
        
        masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${preset.resolution},FRAME-RATE=${preset.fps}\n`;
        masterContent += `${quality}/index.m3u8\n\n`;
      }

      const masterPath = path.join(outputDir, 'master.m3u8');
      await fs.writeFile(masterPath, masterContent);

      this.logger.debug(`Master playlist created for stream ${streamKey}`);
    } catch (error) {
      this.logger.error('Error creating master playlist:', error);
      throw error;
    }
  }

  /**
   * Monitor network conditions and adjust quality
   */
  async monitorNetworkConditions(streamKey, viewerId, networkStats) {
    try {
      const session = this.qualitySessions.get(streamKey);
      if (!session) {
        return null;
      }

      // Analyze network conditions
      const condition = this.analyzeNetworkCondition(networkStats);
      const recommendedQuality = this.getRecommendedQuality(condition);

      // Store network stats in Redis
      await this.redis.setEx(
        `network:${streamKey}:${viewerId}`,
        300, // 5 minutes TTL
        JSON.stringify({
          ...networkStats,
          condition,
          recommendedQuality,
          timestamp: Date.now()
        })
      );

      // Update session if network condition changed significantly
      if (condition !== session.networkCondition) {
        session.networkCondition = condition;
        this.logger.info(`Network condition changed for stream ${streamKey}: ${condition}`);
      }

      return {
        currentQuality: session.currentQuality,
        recommendedQuality,
        networkCondition: condition,
        availableQualities: session.qualities
      };
    } catch (error) {
      this.logger.error('Error monitoring network conditions:', error);
      return null;
    }
  }

  /**
   * Analyze network condition based on stats
   */
  analyzeNetworkCondition(stats) {
    const { bandwidth, latency, packetLoss } = stats;

    if (bandwidth >= this.networkThresholds.excellent.minBandwidth &&
        latency <= this.networkThresholds.excellent.maxLatency &&
        packetLoss <= this.networkThresholds.excellent.maxPacketLoss) {
      return 'excellent';
    } else if (bandwidth >= this.networkThresholds.good.minBandwidth &&
               latency <= this.networkThresholds.good.maxLatency &&
               packetLoss <= this.networkThresholds.good.maxPacketLoss) {
      return 'good';
    } else if (bandwidth >= this.networkThresholds.fair.minBandwidth &&
               latency <= this.networkThresholds.fair.maxLatency &&
               packetLoss <= this.networkThresholds.fair.maxPacketLoss) {
      return 'fair';
    } else {
      return 'poor';
    }
  }

  /**
   * Get recommended quality based on network condition
   */
  getRecommendedQuality(condition) {
    const qualityMap = {
      excellent: '1080p',
      good: '720p',
      fair: '480p',
      poor: '360p'
    };

    return qualityMap[condition] || '360p';
  }

  /**
   * Update quality metrics for monitoring
   */
  async updateQualityMetrics(sessionId, quality, progress) {
    try {
      const metrics = {
        quality,
        fps: progress.currentFps || 0,
        bitrate: progress.currentKbps || 0,
        frames: progress.frames || 0,
        timestamp: Date.now()
      };

      // Store in Redis for real-time monitoring
      await this.redis.setEx(
        `metrics:${sessionId}:${quality}`,
        60, // 1 minute TTL
        JSON.stringify(metrics)
      );

      // Log significant changes
      if (progress.currentFps && progress.currentFps < 15) {
        this.logger.warn(`Low FPS detected for ${quality}: ${progress.currentFps}`);
      }
    } catch (error) {
      this.logger.error('Error updating quality metrics:', error);
    }
  }

  /**
   * Get quality analytics for a stream
   */
  async getQualityAnalytics(streamKey) {
    try {
      const session = this.qualitySessions.get(streamKey);
      if (!session) {
        return null;
      }

      const analytics = {
        sessionId: session.sessionId,
        startedAt: session.startedAt,
        currentQuality: session.currentQuality,
        networkCondition: session.networkCondition,
        availableQualities: session.qualities,
        qualityMetrics: {}
      };

      // Get metrics for each quality
      for (const quality of session.qualities) {
        const metricsKey = `metrics:${session.sessionId}:${quality}`;
        const metrics = await this.redis.get(metricsKey);
        
        if (metrics) {
          analytics.qualityMetrics[quality] = JSON.parse(metrics);
        }
      }

      return analytics;
    } catch (error) {
      this.logger.error('Error getting quality analytics:', error);
      return null;
    }
  }

  /**
   * Stop ABR session and cleanup
   */
  async stopABR(streamKey) {
    try {
      const session = this.qualitySessions.get(streamKey);
      if (!session) {
        return;
      }

      // Stop all encoding processes
      if (session.encodingProcesses) {
        session.encodingProcesses.forEach(process => {
          if (process && process.kill) {
            process.kill('SIGTERM');
          }
        });
      }

      // Cleanup Redis keys
      const keys = await this.redis.keys(`metrics:${session.sessionId}:*`);
      if (keys.length > 0) {
        await this.redis.del(keys);
      }

      // Remove session
      this.qualitySessions.delete(streamKey);

      this.logger.info(`ABR session stopped for stream ${streamKey}`);
    } catch (error) {
      this.logger.error('Error stopping ABR session:', error);
    }
  }

  /**
   * Get all active quality sessions
   */
  getActiveSessions() {
    const sessions = [];
    for (const [streamKey, session] of this.qualitySessions) {
      sessions.push({
        streamKey,
        sessionId: session.sessionId,
        startedAt: session.startedAt,
        currentQuality: session.currentQuality,
        networkCondition: session.networkCondition,
        qualityCount: session.qualities.length
      });
    }
    return sessions;
  }

  /**
   * Get quality presets configuration
   */
  getQualityPresets() {
    return this.qualityPresets;
  }

  /**
   * Update quality preset
   */
  updateQualityPreset(quality, preset) {
    if (this.qualityPresets[quality]) {
      this.qualityPresets[quality] = { ...this.qualityPresets[quality], ...preset };
      this.logger.info(`Quality preset updated for ${quality}`);
      return true;
    }
    return false;
  }
}

module.exports = QualityManager;
