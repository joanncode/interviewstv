/**
 * Recording Management API Routes
 * 
 * Endpoints for video recording and VOD management
 */

const express = require('express');
const { param, query, validationResult } = require('express-validator');

module.exports = (recordingManager) => {
  const router = express.Router();

  // Validation middleware
  const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  };

  /**
   * GET /api/recordings/:recordingId - Get recording details
   */
  router.get('/:recordingId',
    [
      param('recordingId').isUUID().withMessage('Invalid recording ID')
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const { recordingId } = req.params;
        
        const recording = await recordingManager.getRecording(recordingId);
        
        if (!recording) {
          return res.status(404).json({
            error: 'Recording not found'
          });
        }

        res.json({
          success: true,
          data: recording
        });
      } catch (error) {
        console.error('Error getting recording:', error);
        res.status(500).json({
          error: 'Failed to get recording details',
          message: error.message
        });
      }
    }
  );

  /**
   * GET /api/recordings/stream/:streamId - Get recordings for a stream
   */
  router.get('/stream/:streamId',
    [
      param('streamId').isUUID().withMessage('Invalid stream ID'),
      query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const { streamId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        
        const recordings = await recordingManager.getStreamRecordings(streamId);
        
        // Simple pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedRecordings = recordings.slice(startIndex, endIndex);

        res.json({
          success: true,
          data: paginatedRecordings,
          pagination: {
            page,
            limit,
            total: recordings.length,
            totalPages: Math.ceil(recordings.length / limit)
          }
        });
      } catch (error) {
        console.error('Error getting stream recordings:', error);
        res.status(500).json({
          error: 'Failed to get stream recordings',
          message: error.message
        });
      }
    }
  );

  /**
   * GET /api/recordings/active - Get active recording sessions
   */
  router.get('/active', (req, res) => {
    try {
      const activeRecordings = recordingManager.getActiveRecordings();
      
      res.json({
        success: true,
        data: activeRecordings
      });
    } catch (error) {
      console.error('Error getting active recordings:', error);
      res.status(500).json({
        error: 'Failed to get active recordings',
        message: error.message
      });
    }
  });

  /**
   * POST /api/recordings/:recordingId/process - Manually trigger recording processing
   */
  router.post('/:recordingId/process',
    [
      param('recordingId').isUUID().withMessage('Invalid recording ID')
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const { recordingId } = req.params;
        
        const result = await recordingManager.processRecording(recordingId);
        
        res.json({
          success: true,
          data: result,
          message: 'Recording processing started'
        });
      } catch (error) {
        console.error('Error processing recording:', error);
        res.status(500).json({
          error: 'Failed to process recording',
          message: error.message
        });
      }
    }
  );

  /**
   * DELETE /api/recordings/:recordingId - Delete recording
   */
  router.delete('/:recordingId',
    [
      param('recordingId').isUUID().withMessage('Invalid recording ID')
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const { recordingId } = req.params;
        
        // TODO: Implement recording deletion
        // This would involve:
        // 1. Checking permissions
        // 2. Deleting files from storage
        // 3. Updating database
        
        res.json({
          success: true,
          message: 'Recording deletion not implemented yet'
        });
      } catch (error) {
        console.error('Error deleting recording:', error);
        res.status(500).json({
          error: 'Failed to delete recording',
          message: error.message
        });
      }
    }
  );

  /**
   * GET /api/recordings/:recordingId/download - Download recording
   */
  router.get('/:recordingId/download',
    [
      param('recordingId').isUUID().withMessage('Invalid recording ID'),
      query('quality').optional().isIn(['240p', '360p', '480p', '720p', '1080p']).withMessage('Invalid quality'),
      query('format').optional().isIn(['mp4', 'webm']).withMessage('Invalid format')
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const { recordingId } = req.params;
        const quality = req.query.quality || '720p';
        const format = req.query.format || 'mp4';
        
        const recording = await recordingManager.getRecording(recordingId);
        
        if (!recording) {
          return res.status(404).json({
            error: 'Recording not found'
          });
        }

        // TODO: Implement file serving
        // This would involve:
        // 1. Checking permissions
        // 2. Finding the correct file
        // 3. Streaming the file to the client
        
        res.json({
          success: true,
          message: 'Recording download not implemented yet',
          data: {
            recordingId,
            quality,
            format,
            downloadUrl: `/recordings/${recordingId}/${quality}.${format}`
          }
        });
      } catch (error) {
        console.error('Error downloading recording:', error);
        res.status(500).json({
          error: 'Failed to download recording',
          message: error.message
        });
      }
    }
  );

  /**
   * GET /api/recordings/:recordingId/thumbnails - Get recording thumbnails
   */
  router.get('/:recordingId/thumbnails',
    [
      param('recordingId').isUUID().withMessage('Invalid recording ID')
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const { recordingId } = req.params;
        
        const recording = await recordingManager.getRecording(recordingId);
        
        if (!recording) {
          return res.status(404).json({
            error: 'Recording not found'
          });
        }

        // TODO: Get thumbnails from storage
        const thumbnails = [
          {
            timestamp: 0,
            url: `/thumbnails/${recordingId}/thumb_000.jpg`
          },
          {
            timestamp: 30,
            url: `/thumbnails/${recordingId}/thumb_001.jpg`
          }
          // ... more thumbnails
        ];

        res.json({
          success: true,
          data: thumbnails
        });
      } catch (error) {
        console.error('Error getting recording thumbnails:', error);
        res.status(500).json({
          error: 'Failed to get recording thumbnails',
          message: error.message
        });
      }
    }
  );

  /**
   * GET /api/recordings/:recordingId/preview - Get recording preview
   */
  router.get('/:recordingId/preview',
    [
      param('recordingId').isUUID().withMessage('Invalid recording ID')
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const { recordingId } = req.params;
        
        const recording = await recordingManager.getRecording(recordingId);
        
        if (!recording) {
          return res.status(404).json({
            error: 'Recording not found'
          });
        }

        res.json({
          success: true,
          data: {
            recordingId,
            previewUrl: `/previews/${recordingId}_preview.mp4`,
            duration: 30
          }
        });
      } catch (error) {
        console.error('Error getting recording preview:', error);
        res.status(500).json({
          error: 'Failed to get recording preview',
          message: error.message
        });
      }
    }
  );

  return router;
};
