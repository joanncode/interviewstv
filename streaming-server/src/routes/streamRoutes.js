/**
 * Stream Management API Routes
 * 
 * Endpoints:
 * POST   /api/streams           - Create new stream
 * GET    /api/streams/:id       - Get stream details
 * PUT    /api/streams/:id       - Update stream
 * DELETE /api/streams/:id       - Delete stream
 * POST   /api/streams/:id/start - Start stream
 * POST   /api/streams/:id/stop  - Stop stream
 * GET    /api/streams/live      - List active streams
 * GET    /api/streams/:id/stats - Get stream statistics
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

module.exports = (streamManager, analyticsCollector) => {
  const router = express.Router();

  // Authentication middleware
  const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
      req.user = user;
      next();
    });
  };

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
   * POST /api/streams - Create new stream
   */
  router.post('/',
    authenticateToken,
    [
      body('title').isLength({ min: 1, max: 255 }).withMessage('Title is required and must be less than 255 characters'),
      body('description').optional().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
      body('category').optional().isIn(['interview', 'business', 'technology', 'arts', 'education', 'entertainment']).withMessage('Invalid category'),
      body('quality').optional().isIn(['360p', '480p', '720p', '1080p']).withMessage('Invalid quality setting'),
      body('max_viewers').optional().isInt({ min: 1, max: 10000 }).withMessage('Max viewers must be between 1 and 10000'),
      body('recording_enabled').optional().isBoolean().withMessage('Recording enabled must be boolean'),
      body('chat_enabled').optional().isBoolean().withMessage('Chat enabled must be boolean')
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const streamData = {
          title: req.body.title,
          description: req.body.description,
          category: req.body.category || 'interview',
          quality: req.body.quality || '720p',
          max_viewers: req.body.max_viewers || 1000,
          recording_enabled: req.body.recording_enabled !== false,
          chat_enabled: req.body.chat_enabled !== false
        };

        const stream = await streamManager.createStream(req.user.id, streamData);

        res.status(201).json({
          success: true,
          data: stream,
          message: 'Stream created successfully'
        });
      } catch (error) {
        console.error('Error creating stream:', error);
        res.status(500).json({
          error: 'Failed to create stream',
          message: error.message
        });
      }
    }
  );

  /**
   * GET /api/streams/live - List active streams
   */
  router.get('/live',
    [
      query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
      query('category').optional().isIn(['interview', 'business', 'technology', 'arts', 'education', 'entertainment']).withMessage('Invalid category')
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const category = req.query.category;

        const activeStreams = streamManager.getActiveStreams();

        res.json({
          success: true,
          data: activeStreams,
          pagination: {
            page,
            limit,
            total: activeStreams.length
          }
        });
      } catch (error) {
        console.error('Error getting active streams:', error);
        res.status(500).json({
          error: 'Failed to get active streams',
          message: error.message
        });
      }
    }
  );

  /**
   * GET /api/streams/:id - Get stream details
   */
  router.get('/:id',
    [
      param('id').isUUID().withMessage('Invalid stream ID')
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const stream = await streamManager.getStreamById(req.params.id);

        if (!stream) {
          return res.status(404).json({
            error: 'Stream not found'
          });
        }

        // Get current statistics if stream is live
        let stats = null;
        if (stream.status === 'live') {
          stats = await streamManager.getStreamStats(stream.stream_key);
        }

        res.json({
          success: true,
          data: {
            ...stream,
            stats
          }
        });
      } catch (error) {
        console.error('Error getting stream:', error);
        res.status(500).json({
          error: 'Failed to get stream details',
          message: error.message
        });
      }
    }
  );

  /**
   * PUT /api/streams/:id - Update stream
   */
  router.put('/:id',
    authenticateToken,
    [
      param('id').isUUID().withMessage('Invalid stream ID'),
      body('title').optional().isLength({ min: 1, max: 255 }).withMessage('Title must be less than 255 characters'),
      body('description').optional().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
      body('category').optional().isIn(['interview', 'business', 'technology', 'arts', 'education', 'entertainment']).withMessage('Invalid category')
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const stream = await streamManager.getStreamById(req.params.id);
        
        if (!stream) {
          return res.status(404).json({
            error: 'Stream not found'
          });
        }

        // Check if user owns the stream
        if (stream.user_id !== req.user.id) {
          return res.status(403).json({
            error: 'You can only update your own streams'
          });
        }

        // Can't update live streams
        if (stream.status === 'live') {
          return res.status(400).json({
            error: 'Cannot update live streams'
          });
        }

        const updatedStream = await streamManager.updateStream(req.params.id, req.body);

        res.json({
          success: true,
          data: updatedStream,
          message: 'Stream updated successfully'
        });
      } catch (error) {
        console.error('Error updating stream:', error);
        res.status(500).json({
          error: 'Failed to update stream',
          message: error.message
        });
      }
    }
  );

  /**
   * DELETE /api/streams/:id - Delete stream
   */
  router.delete('/:id',
    authenticateToken,
    [
      param('id').isUUID().withMessage('Invalid stream ID')
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const stream = await streamManager.getStreamById(req.params.id);
        
        if (!stream) {
          return res.status(404).json({
            error: 'Stream not found'
          });
        }

        // Check if user owns the stream
        if (stream.user_id !== req.user.id) {
          return res.status(403).json({
            error: 'You can only delete your own streams'
          });
        }

        // Can't delete live streams
        if (stream.status === 'live') {
          return res.status(400).json({
            error: 'Cannot delete live streams. Stop the stream first.'
          });
        }

        await streamManager.deleteStream(req.params.id);

        res.json({
          success: true,
          message: 'Stream deleted successfully'
        });
      } catch (error) {
        console.error('Error deleting stream:', error);
        res.status(500).json({
          error: 'Failed to delete stream',
          message: error.message
        });
      }
    }
  );

  /**
   * POST /api/streams/:id/start - Start stream
   */
  router.post('/:id/start',
    authenticateToken,
    [
      param('id').isUUID().withMessage('Invalid stream ID')
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const stream = await streamManager.getStreamById(req.params.id);
        
        if (!stream) {
          return res.status(404).json({
            error: 'Stream not found'
          });
        }

        // Check if user owns the stream
        if (stream.user_id !== req.user.id) {
          return res.status(403).json({
            error: 'You can only start your own streams'
          });
        }

        // Check if stream can be started
        if (stream.status !== 'scheduled') {
          return res.status(400).json({
            error: `Cannot start stream with status: ${stream.status}`
          });
        }

        await streamManager.updateStreamStatus(stream.stream_key, 'live');

        res.json({
          success: true,
          data: {
            id: stream.id,
            status: 'live',
            rtmpUrl: `rtmp://localhost:1935/live/${stream.stream_key}`,
            hlsUrl: `http://localhost:8080/live/${stream.stream_key}/index.m3u8`
          },
          message: 'Stream started successfully'
        });
      } catch (error) {
        console.error('Error starting stream:', error);
        res.status(500).json({
          error: 'Failed to start stream',
          message: error.message
        });
      }
    }
  );

  /**
   * POST /api/streams/:id/stop - Stop stream
   */
  router.post('/:id/stop',
    authenticateToken,
    [
      param('id').isUUID().withMessage('Invalid stream ID')
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const stream = await streamManager.getStreamById(req.params.id);
        
        if (!stream) {
          return res.status(404).json({
            error: 'Stream not found'
          });
        }

        // Check if user owns the stream
        if (stream.user_id !== req.user.id) {
          return res.status(403).json({
            error: 'You can only stop your own streams'
          });
        }

        // Check if stream is live
        if (stream.status !== 'live') {
          return res.status(400).json({
            error: `Cannot stop stream with status: ${stream.status}`
          });
        }

        await streamManager.endStreamSession(stream.stream_key);

        res.json({
          success: true,
          data: {
            id: stream.id,
            status: 'ended'
          },
          message: 'Stream stopped successfully'
        });
      } catch (error) {
        console.error('Error stopping stream:', error);
        res.status(500).json({
          error: 'Failed to stop stream',
          message: error.message
        });
      }
    }
  );



  /**
   * GET /api/streams/:id/stats - Get stream statistics
   */
  router.get('/:id/stats',
    [
      param('id').isUUID().withMessage('Invalid stream ID')
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const stream = await streamManager.getStreamById(req.params.id);
        
        if (!stream) {
          return res.status(404).json({
            error: 'Stream not found'
          });
        }

        const stats = await analyticsCollector.getStreamAnalytics(req.params.id);

        res.json({
          success: true,
          data: stats
        });
      } catch (error) {
        console.error('Error getting stream stats:', error);
        res.status(500).json({
          error: 'Failed to get stream statistics',
          message: error.message
        });
      }
    }
  );

  return router;
};
