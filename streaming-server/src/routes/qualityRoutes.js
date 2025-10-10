/**
 * Quality Management API Routes
 * 
 * Endpoints for adaptive bitrate streaming and quality control
 */

const express = require('express');
const { param, body, query, validationResult } = require('express-validator');

module.exports = (qualityManager) => {
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
   * GET /api/quality/presets - Get quality presets
   */
  router.get('/presets', (req, res) => {
    try {
      const presets = qualityManager.getQualityPresets();
      
      res.json({
        success: true,
        data: presets
      });
    } catch (error) {
      console.error('Error getting quality presets:', error);
      res.status(500).json({
        error: 'Failed to get quality presets',
        message: error.message
      });
    }
  });

  /**
   * PUT /api/quality/presets/:quality - Update quality preset
   */
  router.put('/presets/:quality',
    [
      param('quality').isIn(['240p', '360p', '480p', '720p', '1080p']).withMessage('Invalid quality level'),
      body('resolution').optional().matches(/^\d+x\d+$/).withMessage('Invalid resolution format'),
      body('videoBitrate').optional().matches(/^\d+k$/).withMessage('Invalid video bitrate format'),
      body('audioBitrate').optional().matches(/^\d+k$/).withMessage('Invalid audio bitrate format'),
      body('fps').optional().isInt({ min: 15, max: 60 }).withMessage('FPS must be between 15 and 60')
    ],
    handleValidationErrors,
    (req, res) => {
      try {
        const { quality } = req.params;
        const preset = req.body;
        
        const updated = qualityManager.updateQualityPreset(quality, preset);
        
        if (!updated) {
          return res.status(404).json({
            error: 'Quality preset not found'
          });
        }

        res.json({
          success: true,
          message: 'Quality preset updated successfully'
        });
      } catch (error) {
        console.error('Error updating quality preset:', error);
        res.status(500).json({
          error: 'Failed to update quality preset',
          message: error.message
        });
      }
    }
  );

  /**
   * GET /api/quality/:streamKey/analytics - Get quality analytics
   */
  router.get('/:streamKey/analytics',
    [
      param('streamKey').isLength({ min: 1 }).withMessage('Stream key is required')
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const { streamKey } = req.params;
        
        const analytics = await qualityManager.getQualityAnalytics(streamKey);
        
        if (!analytics) {
          return res.status(404).json({
            error: 'Quality analytics not found for this stream'
          });
        }

        res.json({
          success: true,
          data: analytics
        });
      } catch (error) {
        console.error('Error getting quality analytics:', error);
        res.status(500).json({
          error: 'Failed to get quality analytics',
          message: error.message
        });
      }
    }
  );

  /**
   * POST /api/quality/:streamKey/network-stats - Submit network statistics
   */
  router.post('/:streamKey/network-stats',
    [
      param('streamKey').isLength({ min: 1 }).withMessage('Stream key is required'),
      body('viewerId').isLength({ min: 1 }).withMessage('Viewer ID is required'),
      body('bandwidth').isNumeric().withMessage('Bandwidth must be numeric'),
      body('latency').isNumeric().withMessage('Latency must be numeric'),
      body('packetLoss').isFloat({ min: 0, max: 100 }).withMessage('Packet loss must be between 0 and 100')
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const { streamKey } = req.params;
        const { viewerId, bandwidth, latency, packetLoss } = req.body;
        
        const networkStats = { bandwidth, latency, packetLoss };
        const recommendation = await qualityManager.monitorNetworkConditions(
          streamKey, 
          viewerId, 
          networkStats
        );
        
        if (!recommendation) {
          return res.status(404).json({
            error: 'Stream not found or not active'
          });
        }

        res.json({
          success: true,
          data: recommendation
        });
      } catch (error) {
        console.error('Error processing network stats:', error);
        res.status(500).json({
          error: 'Failed to process network statistics',
          message: error.message
        });
      }
    }
  );

  /**
   * GET /api/quality/sessions - Get active quality sessions
   */
  router.get('/sessions', (req, res) => {
    try {
      const sessions = qualityManager.getActiveSessions();
      
      res.json({
        success: true,
        data: sessions
      });
    } catch (error) {
      console.error('Error getting active sessions:', error);
      res.status(500).json({
        error: 'Failed to get active sessions',
        message: error.message
      });
    }
  });

  /**
   * DELETE /api/quality/:streamKey - Stop ABR session
   */
  router.delete('/:streamKey',
    [
      param('streamKey').isLength({ min: 1 }).withMessage('Stream key is required')
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const { streamKey } = req.params;
        
        await qualityManager.stopABR(streamKey);
        
        res.json({
          success: true,
          message: 'ABR session stopped successfully'
        });
      } catch (error) {
        console.error('Error stopping ABR session:', error);
        res.status(500).json({
          error: 'Failed to stop ABR session',
          message: error.message
        });
      }
    }
  );

  return router;
};
