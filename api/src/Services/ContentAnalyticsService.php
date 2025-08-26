<?php

namespace App\Services;

class ContentAnalyticsService
{
    use \App\Models\DatabaseConnection;

    public function getContentOverview($userId = null, $dateRange = '30 days')
    {
        $pdo = self::getConnection();
        
        $whereClause = '';
        $params = [];
        
        if ($userId) {
            $whereClause = 'WHERE i.interviewer_id = ?';
            $params[] = $userId;
        }
        
        $sql = "SELECT 
                    COUNT(*) as total_interviews,
                    COUNT(CASE WHEN i.status = 'published' THEN 1 END) as published_interviews,
                    COUNT(CASE WHEN i.status = 'draft' THEN 1 END) as draft_interviews,
                    COUNT(CASE WHEN i.status = 'private' THEN 1 END) as private_interviews,
                    SUM(i.view_count) as total_views,
                    SUM(i.like_count) as total_likes,
                    SUM(i.comment_count) as total_comments,
                    AVG(i.view_count) as avg_views_per_interview,
                    COUNT(CASE WHEN i.featured = 1 THEN 1 END) as featured_interviews
                FROM interviews i 
                {$whereClause}
                AND i.created_at >= DATE_SUB(NOW(), INTERVAL {$dateRange})";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetch(\PDO::FETCH_ASSOC);
    }

    public function getTopPerformingContent($limit = 10, $metric = 'views', $userId = null, $dateRange = '30 days')
    {
        $pdo = self::getConnection();
        
        $orderBy = match($metric) {
            'views' => 'i.view_count DESC',
            'likes' => 'i.like_count DESC',
            'comments' => 'i.comment_count DESC',
            'engagement' => '(i.like_count + i.comment_count) DESC',
            default => 'i.view_count DESC'
        };
        
        $whereClause = "WHERE i.status = 'published'";
        $params = [];
        
        if ($userId) {
            $whereClause .= ' AND i.interviewer_id = ?';
            $params[] = $userId;
        }
        
        $sql = "SELECT 
                    i.id, i.title, i.slug, i.category, i.type, i.thumbnail_url,
                    i.view_count, i.like_count, i.comment_count, i.published_at,
                    u.name as interviewer_name, u.avatar_url as interviewer_avatar,
                    (i.like_count + i.comment_count) as engagement_score
                FROM interviews i
                LEFT JOIN users u ON i.interviewer_id = u.id
                {$whereClause}
                AND i.published_at >= DATE_SUB(NOW(), INTERVAL {$dateRange})
                ORDER BY {$orderBy}
                LIMIT ?";
        
        $params[] = $limit;
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getCategoryPerformance($userId = null, $dateRange = '30 days')
    {
        $pdo = self::getConnection();
        
        $whereClause = "WHERE i.status = 'published'";
        $params = [];
        
        if ($userId) {
            $whereClause .= ' AND i.interviewer_id = ?';
            $params[] = $userId;
        }
        
        $sql = "SELECT 
                    i.category,
                    COUNT(*) as interview_count,
                    SUM(i.view_count) as total_views,
                    SUM(i.like_count) as total_likes,
                    SUM(i.comment_count) as total_comments,
                    AVG(i.view_count) as avg_views,
                    AVG(i.like_count) as avg_likes,
                    AVG(i.comment_count) as avg_comments,
                    (SUM(i.like_count) + SUM(i.comment_count)) as total_engagement
                FROM interviews i
                {$whereClause}
                AND i.published_at >= DATE_SUB(NOW(), INTERVAL {$dateRange})
                GROUP BY i.category
                ORDER BY total_engagement DESC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getContentTrends($userId = null, $dateRange = '30 days', $groupBy = 'day')
    {
        $pdo = self::getConnection();
        
        $dateFormat = match($groupBy) {
            'hour' => '%Y-%m-%d %H:00:00',
            'day' => '%Y-%m-%d',
            'week' => '%Y-%u',
            'month' => '%Y-%m',
            default => '%Y-%m-%d'
        };
        
        $whereClause = "WHERE i.status = 'published'";
        $params = [];
        
        if ($userId) {
            $whereClause .= ' AND i.interviewer_id = ?';
            $params[] = $userId;
        }
        
        $sql = "SELECT 
                    DATE_FORMAT(i.published_at, '{$dateFormat}') as period,
                    COUNT(*) as interviews_published,
                    SUM(i.view_count) as total_views,
                    SUM(i.like_count) as total_likes,
                    SUM(i.comment_count) as total_comments
                FROM interviews i
                {$whereClause}
                AND i.published_at >= DATE_SUB(NOW(), INTERVAL {$dateRange})
                GROUP BY period
                ORDER BY period ASC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getAudienceInsights($userId = null, $dateRange = '30 days')
    {
        $pdo = self::getConnection();
        
        $whereClause = '';
        $params = [];
        
        if ($userId) {
            $whereClause = 'AND i.interviewer_id = ?';
            $params[] = $userId;
        }
        
        // Get engagement by content type
        $sql = "SELECT 
                    i.type,
                    COUNT(*) as content_count,
                    AVG(i.view_count) as avg_views,
                    AVG(i.like_count) as avg_likes,
                    AVG(i.comment_count) as avg_comments,
                    AVG(i.duration) as avg_duration
                FROM interviews i
                WHERE i.status = 'published'
                {$whereClause}
                AND i.published_at >= DATE_SUB(NOW(), INTERVAL {$dateRange})
                GROUP BY i.type
                ORDER BY avg_views DESC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        return [
            'content_type_performance' => $stmt->fetchAll(\PDO::FETCH_ASSOC)
        ];
    }

    public function getSearchTerms($limit = 20, $dateRange = '30 days')
    {
        $pdo = self::getConnection();
        
        // This would require a search_logs table to track search queries
        // For now, return popular tags as a proxy
        $sql = "SELECT 
                    tag,
                    COUNT(*) as frequency
                FROM (
                    SELECT JSON_UNQUOTE(JSON_EXTRACT(tags, CONCAT('$[', numbers.n, ']'))) as tag
                    FROM interviews i
                    CROSS JOIN (
                        SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
                        UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
                    ) numbers
                    WHERE i.status = 'published'
                    AND i.published_at >= DATE_SUB(NOW(), INTERVAL {$dateRange})
                    AND JSON_LENGTH(i.tags) > numbers.n
                    AND JSON_UNQUOTE(JSON_EXTRACT(i.tags, CONCAT('$[', numbers.n, ']'))) IS NOT NULL
                ) tag_list
                WHERE tag IS NOT NULL AND tag != ''
                GROUP BY tag
                ORDER BY frequency DESC
                LIMIT ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$limit]);
        
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getContentHealth($userId = null)
    {
        $pdo = self::getConnection();
        
        $whereClause = '';
        $params = [];
        
        if ($userId) {
            $whereClause = 'WHERE i.interviewer_id = ?';
            $params[] = $userId;
        }
        
        $sql = "SELECT 
                    COUNT(*) as total_content,
                    COUNT(CASE WHEN i.thumbnail_url IS NOT NULL THEN 1 END) as content_with_thumbnails,
                    COUNT(CASE WHEN i.description IS NOT NULL AND LENGTH(i.description) > 50 THEN 1 END) as content_with_good_descriptions,
                    COUNT(CASE WHEN JSON_LENGTH(i.tags) > 0 THEN 1 END) as content_with_tags,
                    COUNT(CASE WHEN i.category IS NOT NULL AND i.category != '' THEN 1 END) as content_with_categories,
                    COUNT(CASE WHEN i.duration IS NOT NULL THEN 1 END) as content_with_duration,
                    AVG(CASE WHEN i.status = 'published' THEN i.view_count ELSE NULL END) as avg_views_published,
                    COUNT(CASE WHEN i.status = 'draft' AND i.created_at < DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as old_drafts
                FROM interviews i
                {$whereClause}";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        $result = $stmt->fetch(\PDO::FETCH_ASSOC);
        
        // Calculate health scores
        if ($result['total_content'] > 0) {
            $result['thumbnail_completion'] = ($result['content_with_thumbnails'] / $result['total_content']) * 100;
            $result['description_completion'] = ($result['content_with_good_descriptions'] / $result['total_content']) * 100;
            $result['tag_completion'] = ($result['content_with_tags'] / $result['total_content']) * 100;
            $result['category_completion'] = ($result['content_with_categories'] / $result['total_content']) * 100;
            $result['duration_completion'] = ($result['content_with_duration'] / $result['total_content']) * 100;
            
            $result['overall_health_score'] = (
                $result['thumbnail_completion'] +
                $result['description_completion'] +
                $result['tag_completion'] +
                $result['category_completion'] +
                $result['duration_completion']
            ) / 5;
        } else {
            $result['thumbnail_completion'] = 0;
            $result['description_completion'] = 0;
            $result['tag_completion'] = 0;
            $result['category_completion'] = 0;
            $result['duration_completion'] = 0;
            $result['overall_health_score'] = 0;
        }
        
        return $result;
    }

    public function recordView($interviewId, $userId = null, $ipAddress = null)
    {
        $pdo = self::getConnection();
        
        // Check if this view should be counted (prevent duplicate views)
        $sql = "SELECT id FROM interview_views 
                WHERE interview_id = ? 
                AND (user_id = ? OR ip_address = ?)
                AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$interviewId, $userId, $ipAddress]);
        
        if ($stmt->fetch()) {
            return false; // View already recorded recently
        }
        
        // Record the view
        $sql = "INSERT INTO interview_views (interview_id, user_id, ip_address, created_at) 
                VALUES (?, ?, ?, NOW())";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$interviewId, $userId, $ipAddress]);
        
        // Update view count
        $sql = "UPDATE interviews SET view_count = view_count + 1 WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$interviewId]);
        
        return true;
    }
}
