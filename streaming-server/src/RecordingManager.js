/**
 * RecordingManager - Video Recording and VOD System
 * 
 * Handles:
 * - Automatic stream recording with FFmpeg
 * - Video processing and transcoding pipeline
 * - Thumbnail and preview generation
 * - Cloud storage integration (S3, GCS)
 * - VOD playback and delivery
 * - Recording analytics and metrics
 */

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

class RecordingManager {
  constructor(dbPool, redisClient, logger) {
    this.db = dbPool;
    this.redis = redisClient;
    this.logger = logger;
    
    // Active recording sessions
    this.activeRecordings = new Map();
    
    // Recording configuration
    this.config = {
      recordingPath: process.env.RECORDING_PATH || './recordings',
      maxRecordingSize: parseInt(process.env.MAX_RECORDING_SIZE_GB || '10') * 1024 * 1024 * 1024,
      enableAutoRecording: process.env.ENABLE_RECORDING === 'true',
      storageProvider: process.env.STORAGE_PROVIDER || 'local',
      thumbnailInterval: 30, // Generate thumbnail every 30 seconds
      previewDuration: 30, // 30-second preview clips
      transcodingFormats: ['mp4', 'webm'],
      qualityLevels: ['360p', '480p', '720p', '1080p']
    };

    // Storage providers
    this.storageProviders = {
      local: this.uploadToLocal.bind(this),
      s3: this.uploadToS3.bind(this),
      gcs: this.uploadToGCS.bind(this)
    };

    // Initialize storage directories
    this.initializeStorage();
  }

  /**
   * Initialize storage directories
   */
  async initializeStorage() {
    try {
      const dirs = [
        this.config.recordingPath,
        path.join(this.config.recordingPath, 'raw'),
        path.join(this.config.recordingPath, 'processed'),
        path.join(this.config.recordingPath, 'thumbnails'),
        path.join(this.config.recordingPath, 'previews')
      ];

      for (const dir of dirs) {
        await fs.mkdir(dir, { recursive: true });
      }

      this.logger.info('Recording storage directories initialized');
    } catch (error) {
      this.logger.error('Error initializing storage directories:', error);
    }
  }

  /**
   * Start recording a stream
   */
  async startRecording(streamId, streamKey, inputSource) {
    try {
      if (!this.config.enableAutoRecording) {
        this.logger.debug('Auto recording is disabled');
        return null;
      }

      const recordingId = uuidv4();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${streamKey}_${timestamp}`;
      const rawPath = path.join(this.config.recordingPath, 'raw', `${filename}.mp4`);

      // Create recording session
      const recordingSession = {
        id: recordingId,
        streamId,
        streamKey,
        filename,
        rawPath,
        startedAt: new Date(),
        status: 'recording',
        fileSize: 0,
        duration: 0,
        ffmpegProcess: null
      };

      // Start FFmpeg recording
      const ffmpegProcess = ffmpeg(inputSource)
        .inputOptions([
          '-re', // Read input at native frame rate
          '-fflags', '+genpts'
        ])
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-preset', 'medium',
          '-crf', '23', // Constant Rate Factor for good quality
          '-movflags', '+faststart', // Optimize for web playback
          '-f', 'mp4'
        ])
        .output(rawPath)
        .on('start', (commandLine) => {
          this.logger.info(`Recording started for stream ${streamKey}: ${commandLine}`);
        })
        .on('progress', (progress) => {
          this.updateRecordingProgress(recordingId, progress);
        })
        .on('error', (err) => {
          this.logger.error(`Recording error for stream ${streamKey}:`, err);
          this.handleRecordingError(recordingId, err);
        })
        .on('end', () => {
          this.logger.info(`Recording finished for stream ${streamKey}`);
          this.handleRecordingComplete(recordingId);
        });

      recordingSession.ffmpegProcess = ffmpegProcess;
      this.activeRecordings.set(recordingId, recordingSession);

      // Save recording info to database
      await this.saveRecordingInfo(recordingSession);

      // Start the recording
      ffmpegProcess.run();

      this.logger.info(`Recording started for stream ${streamKey} (ID: ${recordingId})`);
      
      return {
        recordingId,
        filename,
        status: 'recording'
      };
    } catch (error) {
      this.logger.error('Error starting recording:', error);
      throw error;
    }
  }

  /**
   * Stop recording a stream
   */
  async stopRecording(streamId) {
    try {
      // Find active recording for this stream
      let recordingSession = null;
      for (const [recordingId, session] of this.activeRecordings) {
        if (session.streamId === streamId) {
          recordingSession = session;
          break;
        }
      }

      if (!recordingSession) {
        this.logger.warn(`No active recording found for stream ${streamId}`);
        return null;
      }

      // Stop FFmpeg process gracefully
      if (recordingSession.ffmpegProcess) {
        recordingSession.ffmpegProcess.kill('SIGTERM');
      }

      recordingSession.status = 'processing';
      recordingSession.endedAt = new Date();

      // Update database
      await this.updateRecordingStatus(recordingSession.id, 'processing');

      this.logger.info(`Recording stopped for stream ${streamId} (ID: ${recordingSession.id})`);
      
      return {
        recordingId: recordingSession.id,
        status: 'processing'
      };
    } catch (error) {
      this.logger.error('Error stopping recording:', error);
      throw error;
    }
  }

  /**
   * Process recorded video (transcoding, thumbnails, etc.)
   */
  async processRecording(recordingId) {
    try {
      const session = this.activeRecordings.get(recordingId);
      if (!session) {
        throw new Error('Recording session not found');
      }

      this.logger.info(`Starting post-processing for recording ${recordingId}`);

      // Get file info
      const fileStats = await fs.stat(session.rawPath);
      session.fileSize = fileStats.size;

      // Generate video metadata
      const metadata = await this.getVideoMetadata(session.rawPath);
      session.duration = metadata.duration;
      session.resolution = `${metadata.width}x${metadata.height}`;
      session.fps = metadata.fps;
      session.bitrate = metadata.bitrate;

      // Generate thumbnails
      const thumbnails = await this.generateThumbnails(recordingId, session.rawPath);
      
      // Generate preview clip
      const previewPath = await this.generatePreview(recordingId, session.rawPath);
      
      // Transcode to different formats and qualities
      const transcodedFiles = await this.transcodeVideo(recordingId, session.rawPath);
      
      // Upload to cloud storage
      const uploadResults = await this.uploadRecording(recordingId, session, {
        thumbnails,
        previewPath,
        transcodedFiles
      });

      // Update database with final info
      await this.finalizeRecording(recordingId, {
        ...session,
        thumbnails,
        previewPath,
        transcodedFiles,
        uploadResults,
        status: 'completed'
      });

      // Clean up local files if using cloud storage
      if (this.config.storageProvider !== 'local') {
        await this.cleanupLocalFiles(recordingId);
      }

      // Remove from active recordings
      this.activeRecordings.delete(recordingId);

      this.logger.info(`Recording processing completed for ${recordingId}`);
      
      return {
        recordingId,
        status: 'completed',
        duration: session.duration,
        fileSize: session.fileSize,
        thumbnails,
        previewPath,
        transcodedFiles
      };
    } catch (error) {
      this.logger.error('Error processing recording:', error);
      await this.updateRecordingStatus(recordingId, 'failed');
      throw error;
    }
  }

  /**
   * Generate video thumbnails
   */
  async generateThumbnails(recordingId, videoPath) {
    try {
      const thumbnailDir = path.join(this.config.recordingPath, 'thumbnails', recordingId);
      await fs.mkdir(thumbnailDir, { recursive: true });

      const thumbnails = [];
      const metadata = await this.getVideoMetadata(videoPath);
      const duration = metadata.duration;
      const interval = this.config.thumbnailInterval;
      const count = Math.min(Math.floor(duration / interval), 20); // Max 20 thumbnails

      for (let i = 0; i < count; i++) {
        const timestamp = i * interval;
        const thumbnailPath = path.join(thumbnailDir, `thumb_${i.toString().padStart(3, '0')}.jpg`);
        
        await new Promise((resolve, reject) => {
          ffmpeg(videoPath)
            .seekInput(timestamp)
            .frames(1)
            .size('320x180')
            .output(thumbnailPath)
            .on('end', resolve)
            .on('error', reject)
            .run();
        });

        thumbnails.push({
          timestamp,
          path: thumbnailPath,
          url: `/thumbnails/${recordingId}/thumb_${i.toString().padStart(3, '0')}.jpg`
        });
      }

      this.logger.debug(`Generated ${thumbnails.length} thumbnails for recording ${recordingId}`);
      return thumbnails;
    } catch (error) {
      this.logger.error('Error generating thumbnails:', error);
      return [];
    }
  }

  /**
   * Generate preview clip
   */
  async generatePreview(recordingId, videoPath) {
    try {
      const previewDir = path.join(this.config.recordingPath, 'previews');
      const previewPath = path.join(previewDir, `${recordingId}_preview.mp4`);

      await new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .seekInput(30) // Start 30 seconds in
          .duration(this.config.previewDuration)
          .videoCodec('libx264')
          .audioCodec('aac')
          .size('640x360')
          .outputOptions([
            '-preset', 'fast',
            '-crf', '28',
            '-movflags', '+faststart'
          ])
          .output(previewPath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });

      this.logger.debug(`Generated preview clip for recording ${recordingId}`);
      return previewPath;
    } catch (error) {
      this.logger.error('Error generating preview:', error);
      return null;
    }
  }

  /**
   * Transcode video to different formats and qualities
   */
  async transcodeVideo(recordingId, videoPath) {
    try {
      const processedDir = path.join(this.config.recordingPath, 'processed', recordingId);
      await fs.mkdir(processedDir, { recursive: true });

      const transcodedFiles = [];
      const metadata = await this.getVideoMetadata(videoPath);

      // Quality presets
      const qualityPresets = {
        '360p': { resolution: '640x360', bitrate: '800k' },
        '480p': { resolution: '854x480', bitrate: '1200k' },
        '720p': { resolution: '1280x720', bitrate: '2500k' },
        '1080p': { resolution: '1920x1080', bitrate: '4500k' }
      };

      // Only transcode to qualities that make sense for the source
      const sourceHeight = metadata.height;
      const availableQualities = this.config.qualityLevels.filter(quality => {
        const targetHeight = parseInt(quality);
        return targetHeight <= sourceHeight;
      });

      for (const quality of availableQualities) {
        for (const format of this.config.transcodingFormats) {
          const preset = qualityPresets[quality];
          const outputPath = path.join(processedDir, `${quality}.${format}`);

          await new Promise((resolve, reject) => {
            ffmpeg(videoPath)
              .videoCodec(format === 'webm' ? 'libvpx-vp9' : 'libx264')
              .audioCodec(format === 'webm' ? 'libvorbis' : 'aac')
              .size(preset.resolution)
              .videoBitrate(preset.bitrate)
              .outputOptions([
                '-preset', 'medium',
                '-movflags', '+faststart'
              ])
              .output(outputPath)
              .on('end', resolve)
              .on('error', reject)
              .run();
          });

          transcodedFiles.push({
            quality,
            format,
            path: outputPath,
            url: `/recordings/${recordingId}/${quality}.${format}`
          });
        }
      }

      this.logger.debug(`Transcoded recording ${recordingId} to ${transcodedFiles.length} variants`);
      return transcodedFiles;
    } catch (error) {
      this.logger.error('Error transcoding video:', error);
      return [];
    }
  }

  /**
   * Get video metadata using FFprobe
   */
  async getVideoMetadata(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        
        resolve({
          duration: metadata.format.duration,
          width: videoStream.width,
          height: videoStream.height,
          fps: eval(videoStream.r_frame_rate), // Convert fraction to decimal
          bitrate: metadata.format.bit_rate,
          size: metadata.format.size
        });
      });
    });
  }

  /**
   * Upload recording to storage provider
   */
  async uploadRecording(recordingId, session, files) {
    try {
      const uploadProvider = this.storageProviders[this.config.storageProvider];
      if (!uploadProvider) {
        throw new Error(`Unknown storage provider: ${this.config.storageProvider}`);
      }

      const uploadResults = await uploadProvider(recordingId, session, files);
      
      this.logger.info(`Recording ${recordingId} uploaded to ${this.config.storageProvider}`);
      return uploadResults;
    } catch (error) {
      this.logger.error('Error uploading recording:', error);
      throw error;
    }
  }

  /**
   * Upload to local storage (no-op, files already local)
   */
  async uploadToLocal(recordingId, session, files) {
    return {
      provider: 'local',
      baseUrl: '/recordings',
      files: {
        raw: session.rawPath,
        thumbnails: files.thumbnails,
        preview: files.previewPath,
        transcoded: files.transcodedFiles
      }
    };
  }

  /**
   * Upload to AWS S3 (placeholder implementation)
   */
  async uploadToS3(recordingId, session, files) {
    // TODO: Implement S3 upload
    this.logger.warn('S3 upload not implemented yet');
    return this.uploadToLocal(recordingId, session, files);
  }

  /**
   * Upload to Google Cloud Storage (placeholder implementation)
   */
  async uploadToGCS(recordingId, session, files) {
    // TODO: Implement GCS upload
    this.logger.warn('GCS upload not implemented yet');
    return this.uploadToLocal(recordingId, session, files);
  }

  /**
   * Save recording info to database
   */
  async saveRecordingInfo(session) {
    try {
      const query = `
        INSERT INTO stream_recordings (
          id, stream_id, filename, file_path, status, 
          processing_started_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, NOW(), NOW(), NOW())
      `;

      await this.db.execute(query, [
        session.id,
        session.streamId,
        session.filename,
        session.rawPath,
        session.status
      ]);

      this.logger.debug(`Recording info saved for ${session.id}`);
    } catch (error) {
      this.logger.error('Error saving recording info:', error);
    }
  }

  /**
   * Update recording status
   */
  async updateRecordingStatus(recordingId, status) {
    try {
      const query = `
        UPDATE stream_recordings 
        SET status = ?, updated_at = NOW()
        WHERE id = ?
      `;

      await this.db.execute(query, [status, recordingId]);
    } catch (error) {
      this.logger.error('Error updating recording status:', error);
    }
  }

  /**
   * Update recording progress
   */
  updateRecordingProgress(recordingId, progress) {
    const session = this.activeRecordings.get(recordingId);
    if (session) {
      session.duration = progress.timemark || 0;
      session.fileSize = progress.targetSize || 0;
      
      // Store progress in Redis for real-time monitoring
      this.redis.setEx(`recording:${recordingId}:progress`, 300, JSON.stringify({
        duration: session.duration,
        fileSize: session.fileSize,
        fps: progress.currentFps,
        timestamp: Date.now()
      }));
    }
  }

  /**
   * Handle recording completion
   */
  async handleRecordingComplete(recordingId) {
    try {
      // Start post-processing
      await this.processRecording(recordingId);
    } catch (error) {
      this.logger.error('Error in recording completion handler:', error);
    }
  }

  /**
   * Handle recording error
   */
  async handleRecordingError(recordingId, error) {
    try {
      await this.updateRecordingStatus(recordingId, 'failed');
      this.activeRecordings.delete(recordingId);
      
      this.logger.error(`Recording ${recordingId} failed:`, error);
    } catch (err) {
      this.logger.error('Error handling recording error:', err);
    }
  }

  /**
   * Get recording by ID
   */
  async getRecording(recordingId) {
    try {
      const query = `
        SELECT * FROM stream_recordings 
        WHERE id = ?
      `;

      const [rows] = await this.db.execute(query, [recordingId]);
      return rows[0] || null;
    } catch (error) {
      this.logger.error('Error getting recording:', error);
      return null;
    }
  }

  /**
   * Get recordings for a stream
   */
  async getStreamRecordings(streamId) {
    try {
      const query = `
        SELECT * FROM stream_recordings 
        WHERE stream_id = ?
        ORDER BY created_at DESC
      `;

      const [rows] = await this.db.execute(query, [streamId]);
      return rows;
    } catch (error) {
      this.logger.error('Error getting stream recordings:', error);
      return [];
    }
  }

  /**
   * Get active recording sessions
   */
  getActiveRecordings() {
    const recordings = [];
    for (const [recordingId, session] of this.activeRecordings) {
      recordings.push({
        recordingId,
        streamId: session.streamId,
        streamKey: session.streamKey,
        startedAt: session.startedAt,
        status: session.status,
        duration: session.duration,
        fileSize: session.fileSize
      });
    }
    return recordings;
  }
}

module.exports = RecordingManager;
