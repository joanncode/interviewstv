<?php

namespace App\Services;

use PDO;
use Exception;

/**
 * Analytics Service for Comprehensive Creator Analytics
 */
class AnalyticsService
{
    private PDO $pdo;
    private array $config;

    public function __construct(PDO $pdo, array $config = [])
    {
        $this->pdo = $pdo;
        $this->config = array_merge([
            'cache_duration' => 3600, // 1 hour
            'real_time_threshold' => 300, // 5 minutes
            'trending_threshold' => 24, // 24 hours
            'engagement_weights' => [
                'view' => 1,
                'like' => 3,
                'comment' => 5,
                'share' => 7,
                'follow' => 10
            ]
        ], $config);
    }

    /**
     * Get comprehensive dashboard analytics for a creator
     */
    public function getCreatorDashboard(int $userId, string $timeRange = '30d'): array
    {
        try {
            $dateFilter = $this->getDateFilter($timeRange);
            
            return [
                'overview' => $this->getOverviewMetrics($userId, $dateFilter),
                'content_performance' => $this->getContentPerformance($userId, $dateFilter),
                'audience_insights' => $this->getAudienceInsights($userId, $dateFilter),
                'engagement_trends' => $this->getEngagementTrends($userId, $dateFilter),
                'revenue_analytics' => $this->getRevenueAnalytics($userId, $dateFilter),
                'growth_metrics' => $this->getGrowthMetrics($userId, $dateFilter),
                'top_content' => $this->getTopContent($userId, $dateFilter),
                'audience_demographics' => $this->getAudienceDemographics($userId),
                'traffic_sources' => $this->getTrafficSources($userId, $dateFilter),
                'real_time_stats' => $this->getRealTimeStats($userId)
            ];

        } catch (Exception $e) {
            error_log("Failed to get creator dashboard: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get overview metrics
     */
    private function getOverviewMetrics(int $userId, array $dateFilter): array
    {
        $stmt = $this->pdo->prepare("
            SELECT 
                COUNT(DISTINCT i.id) as total_interviews,
                COUNT(DISTINCT iv.id) as total_views,
                COUNT(DISTINCT l.id) as total_likes,
                COUNT(DISTINCT c.id) as total_comments,
                COUNT(DISTINCT s.id) as total_shares,
                COUNT(DISTINCT f.follower_id) as total_followers,
                AVG(CASE WHEN i.created_at {$dateFilter['condition']} THEN iv.watch_duration ELSE NULL END) as avg_watch_time,
                SUM(CASE WHEN i.created_at {$dateFilter['condition']} THEN 1 ELSE 0 END) as period_interviews,
                SUM(CASE WHEN iv.created_at {$dateFilter['condition']} THEN 1 ELSE 0 END) as period_views
            FROM users u
            LEFT JOIN interviews i ON u.id = i.user_id
            LEFT JOIN interview_views iv ON i.id = iv.interview_id
            LEFT JOIN likes l ON i.id = l.interview_id AND l.created_at {$dateFilter['condition']}
            LEFT JOIN comments c ON i.id = c.interview_id AND c.created_at {$dateFilter['condition']}
            LEFT JOIN shares s ON i.id = s.interview_id AND s.created_at {$dateFilter['condition']}
            LEFT JOIN follows f ON u.id = f.following_id
            WHERE u.id = ?
        ");
        
        $stmt->execute(array_merge([$userId], $dateFilter['params'], $dateFilter['params'], $dateFilter['params'], $dateFilter['params']));
        $metrics = $stmt->fetch(PDO::FETCH_ASSOC);

        // Calculate engagement rate
        $totalEngagements = ($metrics['total_likes'] ?? 0) + ($metrics['total_comments'] ?? 0) + ($metrics['total_shares'] ?? 0);
        $engagementRate = ($metrics['total_views'] ?? 0) > 0 ? 
            round(($totalEngagements / $metrics['total_views']) * 100, 2) : 0;

        return [
            'total_interviews' => (int)($metrics['total_interviews'] ?? 0),
            'total_views' => (int)($metrics['total_views'] ?? 0),
            'total_likes' => (int)($metrics['total_likes'] ?? 0),
            'total_comments' => (int)($metrics['total_comments'] ?? 0),
            'total_shares' => (int)($metrics['total_shares'] ?? 0),
            'total_followers' => (int)($metrics['total_followers'] ?? 0),
            'avg_watch_time' => round($metrics['avg_watch_time'] ?? 0, 2),
            'engagement_rate' => $engagementRate,
            'period_interviews' => (int)($metrics['period_interviews'] ?? 0),
            'period_views' => (int)($metrics['period_views'] ?? 0)
        ];
    }

    /**
     * Get content performance metrics
     */
    private function getContentPerformance(int $userId, array $dateFilter): array
    {
        $stmt = $this->pdo->prepare("
            SELECT 
                i.id,
                i.title,
                i.created_at,
                COUNT(DISTINCT iv.id) as views,
                COUNT(DISTINCT l.id) as likes,
                COUNT(DISTINCT c.id) as comments,
                COUNT(DISTINCT s.id) as shares,
                AVG(iv.watch_duration) as avg_watch_time,
                MAX(iv.watch_duration) as max_watch_time,
                SUM(iv.watch_duration) as total_watch_time,
                (COUNT(DISTINCT l.id) + COUNT(DISTINCT c.id) * 2 + COUNT(DISTINCT s.id) * 3) as engagement_score
            FROM interviews i
            LEFT JOIN interview_views iv ON i.id = iv.interview_id
            LEFT JOIN likes l ON i.id = l.interview_id
            LEFT JOIN comments c ON i.id = c.interview_id
            LEFT JOIN shares s ON i.id = s.interview_id
            WHERE i.user_id = ? AND i.created_at {$dateFilter['condition']}
            GROUP BY i.id
            ORDER BY engagement_score DESC, views DESC
            LIMIT 20
        ");
        
        $stmt->execute(array_merge([$userId], $dateFilter['params']));
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get audience insights
     */
    private function getAudienceInsights(int $userId, array $dateFilter): array
    {
        // Get viewer demographics
        $stmt = $this->pdo->prepare("
            SELECT 
                u.age_range,
                u.gender,
                u.location_country,
                u.location_city,
                COUNT(DISTINCT iv.id) as view_count,
                AVG(iv.watch_duration) as avg_watch_time
            FROM interview_views iv
            JOIN interviews i ON iv.interview_id = i.id
            LEFT JOIN users u ON iv.user_id = u.id
            WHERE i.user_id = ? AND iv.created_at {$dateFilter['condition']}
            GROUP BY u.age_range, u.gender, u.location_country, u.location_city
            ORDER BY view_count DESC
        ");
        
        $stmt->execute(array_merge([$userId], $dateFilter['params']));
        $demographics = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get audience interests
        $stmt = $this->pdo->prepare("
            SELECT 
                t.name as interest,
                COUNT(DISTINCT iv.user_id) as interested_viewers,
                AVG(iv.watch_duration) as avg_engagement
            FROM interview_views iv
            JOIN interviews i ON iv.interview_id = i.id
            JOIN interview_tags it ON i.id = it.interview_id
            JOIN tags t ON it.tag_id = t.id
            WHERE i.user_id = ? AND iv.created_at {$dateFilter['condition']}
            GROUP BY t.id
            ORDER BY interested_viewers DESC
            LIMIT 15
        ");
        
        $stmt->execute(array_merge([$userId], $dateFilter['params']));
        $interests = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'demographics' => $demographics,
            'interests' => $interests,
            'total_unique_viewers' => $this->getUniqueViewers($userId, $dateFilter),
            'returning_viewers' => $this->getReturningViewers($userId, $dateFilter)
        ];
    }

    /**
     * Get engagement trends over time
     */
    private function getEngagementTrends(int $userId, array $dateFilter): array
    {
        $groupBy = $this->getTimeGrouping($dateFilter);
        
        $stmt = $this->pdo->prepare("
            SELECT 
                {$groupBy} as period,
                COUNT(DISTINCT iv.id) as views,
                COUNT(DISTINCT l.id) as likes,
                COUNT(DISTINCT c.id) as comments,
                COUNT(DISTINCT s.id) as shares,
                AVG(iv.watch_duration) as avg_watch_time
            FROM interviews i
            LEFT JOIN interview_views iv ON i.id = iv.interview_id AND iv.created_at {$dateFilter['condition']}
            LEFT JOIN likes l ON i.id = l.interview_id AND l.created_at {$dateFilter['condition']}
            LEFT JOIN comments c ON i.id = c.interview_id AND c.created_at {$dateFilter['condition']}
            LEFT JOIN shares s ON i.id = s.interview_id AND s.created_at {$dateFilter['condition']}
            WHERE i.user_id = ? AND i.created_at {$dateFilter['condition']}
            GROUP BY {$groupBy}
            ORDER BY period ASC
        ");
        
        $stmt->execute(array_merge([$userId], $dateFilter['params'], $dateFilter['params'], $dateFilter['params'], $dateFilter['params'], $dateFilter['params']));
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get revenue analytics
     */
    private function getRevenueAnalytics(int $userId, array $dateFilter): array
    {
        // Subscription revenue
        $stmt = $this->pdo->prepare("
            SELECT 
                SUM(amount) as subscription_revenue,
                COUNT(DISTINCT user_id) as subscribers,
                AVG(amount) as avg_subscription_value
            FROM subscriptions s
            WHERE creator_id = ? AND created_at {$dateFilter['condition']} AND status = 'active'
        ");
        
        $stmt->execute(array_merge([$userId], $dateFilter['params']));
        $subscriptionData = $stmt->fetch(PDO::FETCH_ASSOC);

        // Donation revenue (from live streams)
        $stmt = $this->pdo->prepare("
            SELECT 
                SUM(sd.amount) as donation_revenue,
                COUNT(sd.id) as total_donations,
                AVG(sd.amount) as avg_donation_value
            FROM stream_donations sd
            JOIN live_streams ls ON sd.stream_id = ls.id
            WHERE ls.user_id = ? AND sd.created_at {$dateFilter['condition']} AND sd.payment_status = 'completed'
        ");
        
        $stmt->execute(array_merge([$userId], $dateFilter['params']));
        $donationData = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            'total_revenue' => ($subscriptionData['subscription_revenue'] ?? 0) + ($donationData['donation_revenue'] ?? 0),
            'subscription_revenue' => $subscriptionData['subscription_revenue'] ?? 0,
            'donation_revenue' => $donationData['donation_revenue'] ?? 0,
            'subscribers' => $subscriptionData['subscribers'] ?? 0,
            'total_donations' => $donationData['total_donations'] ?? 0,
            'avg_subscription_value' => round($subscriptionData['avg_subscription_value'] ?? 0, 2),
            'avg_donation_value' => round($donationData['avg_donation_value'] ?? 0, 2)
        ];
    }

    /**
     * Get growth metrics
     */
    private function getGrowthMetrics(int $userId, array $dateFilter): array
    {
        $groupBy = $this->getTimeGrouping($dateFilter);
        
        $stmt = $this->pdo->prepare("
            SELECT 
                {$groupBy} as period,
                COUNT(DISTINCT f.follower_id) as new_followers,
                COUNT(DISTINCT s.user_id) as new_subscribers
            FROM follows f
            LEFT JOIN subscriptions s ON f.following_id = s.creator_id AND s.created_at = f.created_at
            WHERE f.following_id = ? AND f.created_at {$dateFilter['condition']}
            GROUP BY {$groupBy}
            ORDER BY period ASC
        ");
        
        $stmt->execute(array_merge([$userId], $dateFilter['params']));
        $growthData = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Calculate growth rates
        $totalFollowers = $this->getTotalFollowers($userId);
        $totalSubscribers = $this->getTotalSubscribers($userId);
        
        return [
            'growth_data' => $growthData,
            'total_followers' => $totalFollowers,
            'total_subscribers' => $totalSubscribers,
            'follower_growth_rate' => $this->calculateGrowthRate($userId, 'followers', $dateFilter),
            'subscriber_growth_rate' => $this->calculateGrowthRate($userId, 'subscribers', $dateFilter)
        ];
    }

    /**
     * Get top performing content
     */
    private function getTopContent(int $userId, array $dateFilter): array
    {
        $stmt = $this->pdo->prepare("
            SELECT 
                i.id,
                i.title,
                i.thumbnail_url,
                i.created_at,
                COUNT(DISTINCT iv.id) as views,
                COUNT(DISTINCT l.id) as likes,
                COUNT(DISTINCT c.id) as comments,
                AVG(iv.watch_duration) as avg_watch_time,
                (COUNT(DISTINCT l.id) * 3 + COUNT(DISTINCT c.id) * 5 + COUNT(DISTINCT s.id) * 7) as engagement_score
            FROM interviews i
            LEFT JOIN interview_views iv ON i.id = iv.interview_id
            LEFT JOIN likes l ON i.id = l.interview_id
            LEFT JOIN comments c ON i.id = c.interview_id
            LEFT JOIN shares s ON i.id = s.interview_id
            WHERE i.user_id = ? AND i.created_at {$dateFilter['condition']}
            GROUP BY i.id
            ORDER BY engagement_score DESC, views DESC
            LIMIT 10
        ");
        
        $stmt->execute(array_merge([$userId], $dateFilter['params']));
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get audience demographics
     */
    private function getAudienceDemographics(int $userId): array
    {
        // Age distribution
        $stmt = $this->pdo->prepare("
            SELECT 
                u.age_range,
                COUNT(DISTINCT f.follower_id) as count
            FROM follows f
            JOIN users u ON f.follower_id = u.id
            WHERE f.following_id = ?
            GROUP BY u.age_range
            ORDER BY count DESC
        ");
        $stmt->execute([$userId]);
        $ageDistribution = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Gender distribution
        $stmt = $this->pdo->prepare("
            SELECT 
                u.gender,
                COUNT(DISTINCT f.follower_id) as count
            FROM follows f
            JOIN users u ON f.follower_id = u.id
            WHERE f.following_id = ?
            GROUP BY u.gender
            ORDER BY count DESC
        ");
        $stmt->execute([$userId]);
        $genderDistribution = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Location distribution
        $stmt = $this->pdo->prepare("
            SELECT 
                u.location_country,
                COUNT(DISTINCT f.follower_id) as count
            FROM follows f
            JOIN users u ON f.follower_id = u.id
            WHERE f.following_id = ?
            GROUP BY u.location_country
            ORDER BY count DESC
            LIMIT 10
        ");
        $stmt->execute([$userId]);
        $locationDistribution = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'age_distribution' => $ageDistribution,
            'gender_distribution' => $genderDistribution,
            'location_distribution' => $locationDistribution
        ];
    }

    /**
     * Get traffic sources
     */
    private function getTrafficSources(int $userId, array $dateFilter): array
    {
        $stmt = $this->pdo->prepare("
            SELECT 
                iv.referrer_source,
                COUNT(DISTINCT iv.id) as views,
                COUNT(DISTINCT iv.user_id) as unique_visitors,
                AVG(iv.watch_duration) as avg_engagement
            FROM interview_views iv
            JOIN interviews i ON iv.interview_id = i.id
            WHERE i.user_id = ? AND iv.created_at {$dateFilter['condition']}
            GROUP BY iv.referrer_source
            ORDER BY views DESC
        ");
        
        $stmt->execute(array_merge([$userId], $dateFilter['params']));
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get real-time statistics
     */
    private function getRealTimeStats(int $userId): array
    {
        $threshold = date('Y-m-d H:i:s', time() - $this->config['real_time_threshold']);
        
        $stmt = $this->pdo->prepare("
            SELECT 
                COUNT(DISTINCT iv.id) as recent_views,
                COUNT(DISTINCT l.id) as recent_likes,
                COUNT(DISTINCT c.id) as recent_comments,
                COUNT(DISTINCT f.follower_id) as recent_followers
            FROM interviews i
            LEFT JOIN interview_views iv ON i.id = iv.interview_id AND iv.created_at >= ?
            LEFT JOIN likes l ON i.id = l.interview_id AND l.created_at >= ?
            LEFT JOIN comments c ON i.id = c.interview_id AND c.created_at >= ?
            LEFT JOIN follows f ON i.user_id = f.following_id AND f.created_at >= ?
            WHERE i.user_id = ?
        ");
        
        $stmt->execute([$threshold, $threshold, $threshold, $threshold, $userId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Helper methods
    private function getDateFilter(string $timeRange): array
    {
        switch ($timeRange) {
            case '7d':
                return [
                    'condition' => '>= DATE_SUB(NOW(), INTERVAL 7 DAY)',
                    'params' => []
                ];
            case '30d':
                return [
                    'condition' => '>= DATE_SUB(NOW(), INTERVAL 30 DAY)',
                    'params' => []
                ];
            case '90d':
                return [
                    'condition' => '>= DATE_SUB(NOW(), INTERVAL 90 DAY)',
                    'params' => []
                ];
            case '1y':
                return [
                    'condition' => '>= DATE_SUB(NOW(), INTERVAL 1 YEAR)',
                    'params' => []
                ];
            default:
                return [
                    'condition' => '>= DATE_SUB(NOW(), INTERVAL 30 DAY)',
                    'params' => []
                ];
        }
    }

    private function getTimeGrouping(array $dateFilter): string
    {
        if (strpos($dateFilter['condition'], '7 DAY') !== false) {
            return 'DATE(created_at)';
        } elseif (strpos($dateFilter['condition'], '30 DAY') !== false) {
            return 'DATE(created_at)';
        } elseif (strpos($dateFilter['condition'], '90 DAY') !== false) {
            return 'WEEK(created_at, 1)';
        } else {
            return 'MONTH(created_at)';
        }
    }

    private function getUniqueViewers(int $userId, array $dateFilter): int
    {
        $stmt = $this->pdo->prepare("
            SELECT COUNT(DISTINCT iv.user_id) 
            FROM interview_views iv
            JOIN interviews i ON iv.interview_id = i.id
            WHERE i.user_id = ? AND iv.created_at {$dateFilter['condition']}
        ");
        
        $stmt->execute(array_merge([$userId], $dateFilter['params']));
        return (int)$stmt->fetchColumn();
    }

    private function getReturningViewers(int $userId, array $dateFilter): int
    {
        $stmt = $this->pdo->prepare("
            SELECT COUNT(DISTINCT iv.user_id)
            FROM interview_views iv
            JOIN interviews i ON iv.interview_id = i.id
            WHERE i.user_id = ? AND iv.created_at {$dateFilter['condition']}
            AND iv.user_id IN (
                SELECT DISTINCT iv2.user_id
                FROM interview_views iv2
                JOIN interviews i2 ON iv2.interview_id = i2.id
                WHERE i2.user_id = ? AND iv2.created_at < (
                    SELECT MIN(created_at) FROM interview_views iv3
                    JOIN interviews i3 ON iv3.interview_id = i3.id
                    WHERE i3.user_id = ? AND iv3.created_at {$dateFilter['condition']}
                )
            )
        ");
        
        $stmt->execute(array_merge([$userId], $dateFilter['params'], [$userId], [$userId], $dateFilter['params']));
        return (int)$stmt->fetchColumn();
    }

    private function getTotalFollowers(int $userId): int
    {
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM follows WHERE following_id = ?");
        $stmt->execute([$userId]);
        return (int)$stmt->fetchColumn();
    }

    private function getTotalSubscribers(int $userId): int
    {
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM subscriptions WHERE creator_id = ? AND status = 'active'");
        $stmt->execute([$userId]);
        return (int)$stmt->fetchColumn();
    }

    private function calculateGrowthRate(int $userId, string $type, array $dateFilter): float
    {
        // Implementation for growth rate calculation
        return 0.0; // Placeholder
    }
}
