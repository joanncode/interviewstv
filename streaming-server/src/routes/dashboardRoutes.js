/**
 * Analytics Dashboard API Routes
 * 
 * Endpoints for comprehensive analytics dashboard and reporting
 */

const express = require('express');
const { param, query, body, validationResult } = require('express-validator');

module.exports = (analyticsDashboard) => {
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
   * GET /api/dashboard - Get comprehensive dashboard data
   */
  router.get('/',
    [
      query('timeRange').optional().isIn(['1h', '6h', '24h', '7d', '30d', '90d']).withMessage('Invalid time range'),
      query('userId').optional().isInt().withMessage('User ID must be an integer'),
      query('streamId').optional().isUUID().withMessage('Invalid stream ID')
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const userId = req.query.userId || req.user?.id;
        const timeRange = req.query.timeRange || '24h';
        const filters = {
          streamId: req.query.streamId,
          category: req.query.category,
          country: req.query.country
        };

        if (!userId) {
          return res.status(400).json({
            error: 'User ID is required'
          });
        }

        const dashboardData = await analyticsDashboard.getDashboardData(userId, timeRange, filters);

        res.json({
          success: true,
          data: dashboardData
        });
      } catch (error) {
        console.error('Error getting dashboard data:', error);
        res.status(500).json({
          error: 'Failed to get dashboard data',
          message: error.message
        });
      }
    }
  );

  /**
   * GET /api/dashboard/real-time - Get real-time metrics
   */
  router.get('/real-time',
    [
      query('userId').optional().isInt().withMessage('User ID must be an integer')
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const userId = req.query.userId || req.user?.id;

        if (!userId) {
          return res.status(400).json({
            error: 'User ID is required'
          });
        }

        const realTimeMetrics = await analyticsDashboard.getRealTimeMetrics(userId);

        res.json({
          success: true,
          data: realTimeMetrics
        });
      } catch (error) {
        console.error('Error getting real-time metrics:', error);
        res.status(500).json({
          error: 'Failed to get real-time metrics',
          message: error.message
        });
      }
    }
  );

  /**
   * GET /api/dashboard/viewer-trends - Get viewer trends
   */
  router.get('/viewer-trends',
    [
      query('userId').optional().isInt().withMessage('User ID must be an integer'),
      query('timeRange').optional().isIn(['1h', '6h', '24h', '7d', '30d', '90d']).withMessage('Invalid time range')
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const userId = req.query.userId || req.user?.id;
        const timeRange = req.query.timeRange || '24h';

        if (!userId) {
          return res.status(400).json({
            error: 'User ID is required'
          });
        }

        const viewerTrends = await analyticsDashboard.getViewerTrends(userId, timeRange);

        res.json({
          success: true,
          data: viewerTrends
        });
      } catch (error) {
        console.error('Error getting viewer trends:', error);
        res.status(500).json({
          error: 'Failed to get viewer trends',
          message: error.message
        });
      }
    }
  );

  /**
   * GET /api/dashboard/engagement - Get engagement analytics
   */
  router.get('/engagement',
    [
      query('userId').optional().isInt().withMessage('User ID must be an integer'),
      query('timeRange').optional().isIn(['1h', '6h', '24h', '7d', '30d', '90d']).withMessage('Invalid time range')
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const userId = req.query.userId || req.user?.id;
        const timeRange = req.query.timeRange || '24h';

        if (!userId) {
          return res.status(400).json({
            error: 'User ID is required'
          });
        }

        const engagementAnalytics = await analyticsDashboard.getEngagementAnalytics(userId, timeRange);

        res.json({
          success: true,
          data: engagementAnalytics
        });
      } catch (error) {
        console.error('Error getting engagement analytics:', error);
        res.status(500).json({
          error: 'Failed to get engagement analytics',
          message: error.message
        });
      }
    }
  );

  /**
   * GET /api/dashboard/revenue - Get revenue analytics
   */
  router.get('/revenue',
    [
      query('userId').optional().isInt().withMessage('User ID must be an integer'),
      query('timeRange').optional().isIn(['1h', '6h', '24h', '7d', '30d', '90d']).withMessage('Invalid time range')
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const userId = req.query.userId || req.user?.id;
        const timeRange = req.query.timeRange || '24h';

        if (!userId) {
          return res.status(400).json({
            error: 'User ID is required'
          });
        }

        const revenueAnalytics = await analyticsDashboard.getRevenueAnalytics(userId, timeRange);

        res.json({
          success: true,
          data: revenueAnalytics
        });
      } catch (error) {
        console.error('Error getting revenue analytics:', error);
        res.status(500).json({
          error: 'Failed to get revenue analytics',
          message: error.message
        });
      }
    }
  );

  /**
   * GET /api/dashboard/geographic - Get geographic distribution
   */
  router.get('/geographic',
    [
      query('userId').optional().isInt().withMessage('User ID must be an integer'),
      query('timeRange').optional().isIn(['1h', '6h', '24h', '7d', '30d', '90d']).withMessage('Invalid time range')
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const userId = req.query.userId || req.user?.id;
        const timeRange = req.query.timeRange || '24h';

        if (!userId) {
          return res.status(400).json({
            error: 'User ID is required'
          });
        }

        const geographicDistribution = await analyticsDashboard.getGeographicDistribution(userId, timeRange);

        res.json({
          success: true,
          data: geographicDistribution
        });
      } catch (error) {
        console.error('Error getting geographic distribution:', error);
        res.status(500).json({
          error: 'Failed to get geographic distribution',
          message: error.message
        });
      }
    }
  );

  /**
   * GET /api/dashboard/top-streams - Get top performing streams
   */
  router.get('/top-streams',
    [
      query('userId').optional().isInt().withMessage('User ID must be an integer'),
      query('timeRange').optional().isIn(['1h', '6h', '24h', '7d', '30d', '90d']).withMessage('Invalid time range'),
      query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const userId = req.query.userId || req.user?.id;
        const timeRange = req.query.timeRange || '24h';

        if (!userId) {
          return res.status(400).json({
            error: 'User ID is required'
          });
        }

        const topStreams = await analyticsDashboard.getTopStreams(userId, timeRange);

        res.json({
          success: true,
          data: topStreams
        });
      } catch (error) {
        console.error('Error getting top streams:', error);
        res.status(500).json({
          error: 'Failed to get top streams',
          message: error.message
        });
      }
    }
  );

  /**
   * GET /api/dashboard/kpis - Get key performance indicators
   */
  router.get('/kpis',
    [
      query('userId').optional().isInt().withMessage('User ID must be an integer'),
      query('timeRange').optional().isIn(['1h', '6h', '24h', '7d', '30d', '90d']).withMessage('Invalid time range')
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const userId = req.query.userId || req.user?.id;
        const timeRange = req.query.timeRange || '24h';

        if (!userId) {
          return res.status(400).json({
            error: 'User ID is required'
          });
        }

        const kpis = await analyticsDashboard.calculateKPIs(userId, timeRange);

        res.json({
          success: true,
          data: kpis
        });
      } catch (error) {
        console.error('Error getting KPIs:', error);
        res.status(500).json({
          error: 'Failed to get KPIs',
          message: error.message
        });
      }
    }
  );

  /**
   * GET /api/dashboard/alerts - Get analytics alerts and recommendations
   */
  router.get('/alerts',
    [
      query('userId').optional().isInt().withMessage('User ID must be an integer')
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const userId = req.query.userId || req.user?.id;

        if (!userId) {
          return res.status(400).json({
            error: 'User ID is required'
          });
        }

        const alerts = await analyticsDashboard.getAnalyticsAlerts(userId);

        res.json({
          success: true,
          data: alerts
        });
      } catch (error) {
        console.error('Error getting analytics alerts:', error);
        res.status(500).json({
          error: 'Failed to get analytics alerts',
          message: error.message
        });
      }
    }
  );

  /**
   * POST /api/dashboard/export - Export analytics data
   */
  router.post('/export',
    [
      body('userId').optional().isInt().withMessage('User ID must be an integer'),
      body('timeRange').optional().isIn(['1h', '6h', '24h', '7d', '30d', '90d']).withMessage('Invalid time range'),
      body('format').optional().isIn(['csv', 'json', 'pdf']).withMessage('Invalid export format'),
      body('widgets').optional().isArray().withMessage('Widgets must be an array')
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const userId = req.body.userId || req.user?.id;
        const timeRange = req.body.timeRange || '24h';
        const format = req.body.format || 'csv';
        const widgets = req.body.widgets || ['all'];

        if (!userId) {
          return res.status(400).json({
            error: 'User ID is required'
          });
        }

        // TODO: Implement data export functionality
        // This would generate and return the requested export format

        res.json({
          success: true,
          message: 'Export functionality not implemented yet',
          data: {
            exportId: 'export_' + Date.now(),
            format,
            timeRange,
            widgets,
            downloadUrl: `/exports/analytics_${userId}_${Date.now()}.${format}`
          }
        });
      } catch (error) {
        console.error('Error exporting analytics data:', error);
        res.status(500).json({
          error: 'Failed to export analytics data',
          message: error.message
        });
      }
    }
  );

  return router;
};
