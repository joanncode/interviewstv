<?php

namespace App\Controllers;

use App\Services\AnalyticsService;
use App\Services\ContentAnalyticsService;
use App\Services\PerformanceMonitor;
use App\Http\Response;

/**
 * Analytics Dashboard Controller
 * Provides comprehensive analytics dashboard endpoints
 */
class AnalyticsDashboardController
{
    private $analyticsService;
    private $contentAnalyticsService;
    private $performanceMonitor;

    public function __construct()
    {
        require_once __DIR__ . '/../../config/database.php';
        $database = new \Database();
        $pdo = $database->getConnection();
        
        $this->analyticsService = new AnalyticsService($pdo);
        $this->contentAnalyticsService = new ContentAnalyticsService();
        $this->performanceMonitor = new PerformanceMonitor();
    }

    /**
     * Get comprehensive dashboard overview
     * GET /api/analytics/dashboard
     */
    public function getDashboard()
    {
        try {
            $this->performanceMonitor->startTimer('dashboard_load');
            
            $userId = $this->getCurrentUserId();
            $timeRange = $_GET['timeRange'] ?? '30d';
            
            // Get creator dashboard data
            $creatorData = $this->analyticsService->getCreatorDashboard($userId, $timeRange);
            
            // Get content analytics
            $contentOverview = $this->contentAnalyticsService->getContentOverview($userId, $this->convertTimeRange($timeRange));
            $categoryPerformance = $this->contentAnalyticsService->getCategoryPerformance($userId, $this->convertTimeRange($timeRange));
            $contentTrends = $this->contentAnalyticsService->getContentTrends($userId, $this->convertTimeRange($timeRange));
            
            // Get platform-wide statistics (if admin)
            $platformStats = $this->isAdmin() ? $this->getPlatformStatistics($timeRange) : null;
            
            $this->performanceMonitor->endTimer('dashboard_load');
            
            return Response::success([
                'user_analytics' => $creatorData,
                'content_analytics' => [
                    'overview' => $contentOverview,
                    'category_performance' => $categoryPerformance,
                    'trends' => $contentTrends
                ],
                'platform_stats' => $platformStats,
                'performance_metrics' => $this->performanceMonitor->getMetrics(),
                'last_updated' => date('Y-m-d H:i:s'),
                'time_range' => $timeRange
            ]);
            
        } catch (\Exception $e) {
            return Response::error('Failed to load dashboard', 500, $e->getMessage());
        }
    }

    /**
     * Get real-time analytics
     * GET /api/analytics/realtime
     */
    public function getRealTimeAnalytics()
    {
        try {
            $userId = $this->getCurrentUserId();
            
            // Get real-time stats from analytics service
            $realTimeStats = $this->analyticsService->getRealTimeStats($userId);
            
            // Get current active sessions
            $activeSessions = $this->getActiveSessions($userId);
            
            // Get recent activity
            $recentActivity = $this->getRecentActivity($userId);
            
            return Response::success([
                'real_time_stats' => $realTimeStats,
                'active_sessions' => $activeSessions,
                'recent_activity' => $recentActivity,
                'timestamp' => time()
            ]);
            
        } catch (\Exception $e) {
            return Response::error('Failed to get real-time analytics', 500, $e->getMessage());
        }
    }

    /**
     * Get engagement analytics
     * GET /api/analytics/engagement
     */
    public function getEngagementAnalytics()
    {
        try {
            $userId = $this->getCurrentUserId();
            $timeRange = $_GET['timeRange'] ?? '30d';
            
            $engagementData = $this->analyticsService->getEngagementTrends($userId, $this->analyticsService->getDateFilter($timeRange));
            
            return Response::success([
                'engagement_trends' => $engagementData,
                'time_range' => $timeRange
            ]);
            
        } catch (\Exception $e) {
            return Response::error('Failed to get engagement analytics', 500, $e->getMessage());
        }
    }

    /**
     * Get audience analytics
     * GET /api/analytics/audience
     */
    public function getAudienceAnalytics()
    {
        try {
            $userId = $this->getCurrentUserId();
            $timeRange = $_GET['timeRange'] ?? '30d';
            
            $audienceData = $this->analyticsService->getAudienceInsights($userId, $this->analyticsService->getDateFilter($timeRange));
            $demographics = $this->analyticsService->getAudienceDemographics($userId);
            
            return Response::success([
                'audience_insights' => $audienceData,
                'demographics' => $demographics,
                'time_range' => $timeRange
            ]);
            
        } catch (\Exception $e) {
            return Response::error('Failed to get audience analytics', 500, $e->getMessage());
        }
    }

    /**
     * Get performance metrics
     * GET /api/analytics/performance
     */
    public function getPerformanceMetrics()
    {
        try {
            $timeRange = $_GET['timeRange'] ?? '24h';
            
            // Get system performance metrics
            $performanceData = $this->performanceMonitor->getHistoricalMetrics($timeRange);
            
            // Get current system status
            $systemStatus = $this->getSystemStatus();
            
            return Response::success([
                'performance_data' => $performanceData,
                'system_status' => $systemStatus,
                'time_range' => $timeRange
            ]);
            
        } catch (\Exception $e) {
            return Response::error('Failed to get performance metrics', 500, $e->getMessage());
        }
    }

    /**
     * Get interview room analytics
     * GET /api/analytics/rooms
     */
    public function getRoomAnalytics()
    {
        try {
            $userId = $this->getCurrentUserId();
            $timeRange = $_GET['timeRange'] ?? '30d';
            
            $roomStats = $this->getRoomStatistics($userId, $timeRange);
            
            return Response::success([
                'room_statistics' => $roomStats,
                'time_range' => $timeRange
            ]);
            
        } catch (\Exception $e) {
            return Response::error('Failed to get room analytics', 500, $e->getMessage());
        }
    }

    /**
     * Export analytics data
     * GET /api/analytics/export
     */
    public function exportAnalytics()
    {
        try {
            $userId = $this->getCurrentUserId();
            $timeRange = $_GET['timeRange'] ?? '30d';
            $format = $_GET['format'] ?? 'json';
            
            $data = $this->analyticsService->getCreatorDashboard($userId, $timeRange);
            
            if ($format === 'csv') {
                return $this->exportAsCSV($data);
            } else {
                return $this->exportAsJSON($data);
            }
            
        } catch (\Exception $e) {
            return Response::error('Failed to export analytics', 500, $e->getMessage());
        }
    }

    /**
     * Get platform-wide statistics (admin only)
     */
    private function getPlatformStatistics($timeRange)
    {
        if (!$this->isAdmin()) {
            return null;
        }

        // Get platform-wide metrics
        $platformData = $this->analyticsService->getPlatformDashboard($timeRange);
        
        return $platformData;
    }

    /**
     * Get active sessions for user
     */
    private function getActiveSessions($userId)
    {
        // Implementation would depend on session tracking system
        return [
            'total_active' => 0,
            'live_interviews' => 0,
            'concurrent_viewers' => 0
        ];
    }

    /**
     * Get recent activity for user
     */
    private function getRecentActivity($userId)
    {
        // Implementation would get recent user activities
        return [];
    }

    /**
     * Get room statistics
     */
    private function getRoomStatistics($userId, $timeRange)
    {
        // Implementation would get interview room analytics
        return [
            'total_rooms_created' => 0,
            'total_participants' => 0,
            'average_duration' => 0,
            'completion_rate' => 0
        ];
    }

    /**
     * Get system status
     */
    private function getSystemStatus()
    {
        return [
            'status' => 'healthy',
            'uptime' => '99.9%',
            'response_time' => '150ms',
            'error_rate' => '0.1%'
        ];
    }

    /**
     * Convert time range format
     */
    private function convertTimeRange($timeRange)
    {
        $mapping = [
            '24h' => '1 day',
            '7d' => '7 days',
            '30d' => '30 days',
            '90d' => '90 days',
            '1y' => '1 year'
        ];
        
        return $mapping[$timeRange] ?? '30 days';
    }

    /**
     * Get current user ID
     */
    private function getCurrentUserId()
    {
        // TODO: Implement proper authentication check
        return 1; // Demo user ID
    }

    /**
     * Check if current user is admin
     */
    private function isAdmin()
    {
        // TODO: Implement proper admin check
        return true; // For demo purposes
    }

    /**
     * Export data as CSV
     */
    private function exportAsCSV($data)
    {
        $filename = 'analytics_export_' . date('Y-m-d_H-i-s') . '.csv';
        
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        
        $output = fopen('php://output', 'w');
        
        // Add CSV headers and data
        fputcsv($output, ['Metric', 'Value']);
        
        foreach ($data['overview'] as $key => $value) {
            fputcsv($output, [$key, $value]);
        }
        
        fclose($output);
        exit;
    }

    /**
     * Export data as JSON
     */
    private function exportAsJSON($data)
    {
        $filename = 'analytics_export_' . date('Y-m-d_H-i-s') . '.json';
        
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        
        echo json_encode($data, JSON_PRETTY_PRINT);
        exit;
    }
}
