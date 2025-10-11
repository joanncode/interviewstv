<?php

namespace App\Models;

use PDO;

class Search
{
    protected static function getConnection()
    {
        static $pdo = null;
        
        if ($pdo === null) {
            $config = config('database.connections.mysql');
            $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
            
            $pdo = new PDO($dsn, $config['username'], $config['password'], $config['options']);
        }
        
        return $pdo;
    }
    
    public static function globalSearch($query, $filters = [], $page = 1, $limit = 20, $sort = 'relevance')
    {
        $pdo = self::getConnection();
        $offset = ($page - 1) * $limit;
        
        // Build search conditions
        $conditions = ['si.status = ?'];
        $params = ['published'];
        
        // Add search query
        if (!empty($query)) {
            $conditions[] = "MATCH(si.title, si.content) AGAINST(? IN NATURAL LANGUAGE MODE)";
            $params[] = $query;
        }
        
        // Add filters
        if (!empty($filters['type'])) {
            $conditions[] = 'si.searchable_type = ?';
            $params[] = $filters['type'];
        }
        
        if (!empty($filters['category'])) {
            $conditions[] = 'si.category = ?';
            $params[] = $filters['category'];
        }
        
        if (!empty($filters['user_id'])) {
            $conditions[] = 'si.user_id = ?';
            $params[] = $filters['user_id'];
        }
        
        if (!empty($filters['tags'])) {
            $tagConditions = [];
            foreach ($filters['tags'] as $tag) {
                $tagConditions[] = "JSON_CONTAINS(si.tags, ?)";
                $params[] = json_encode($tag);
            }
            if (!empty($tagConditions)) {
                $conditions[] = '(' . implode(' OR ', $tagConditions) . ')';
            }
        }
        
        // Date range filter
        if (!empty($filters['date_from'])) {
            $conditions[] = 'si.created_at >= ?';
            $params[] = $filters['date_from'];
        }
        
        if (!empty($filters['date_to'])) {
            $conditions[] = 'si.created_at <= ?';
            $params[] = $filters['date_to'];
        }
        
        // Build WHERE clause
        $whereClause = 'WHERE ' . implode(' AND ', $conditions);
        
        // Build ORDER BY clause
        $orderBy = self::buildOrderBy($sort, !empty($query));
        
        // Get total count
        $countSql = "SELECT COUNT(*) FROM search_indexes si {$whereClause}";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($params);
        $total = $countStmt->fetchColumn();
        
        // Get results
        $sql = "SELECT si.*, 
                       " . (!empty($query) ? "MATCH(si.title, si.content) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance_score" : "0 as relevance_score") . "
                FROM search_indexes si
                {$whereClause}
                {$orderBy}
                LIMIT ? OFFSET ?";
        
        if (!empty($query)) {
            array_splice($params, count($params), 0, [$query]);
        }
        $params[] = $limit;
        $params[] = $offset;
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format results
        $formattedResults = array_map([self::class, 'formatSearchResult'], $results);
        
        return [
            'results' => $formattedResults,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'query' => $query,
            'filters' => $filters
        ];
    }
    
    public static function getPopularContent($type = null, $limit = 10, $timeframe = '7 days')
    {
        $pdo = self::getConnection();
        
        $conditions = ['si.status = ?'];
        $params = ['published'];
        
        if ($type) {
            $conditions[] = 'si.searchable_type = ?';
            $params[] = $type;
        }
        
        // Add timeframe filter
        $conditions[] = 'si.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
        $params[] = self::getTimeframeDays($timeframe);
        
        $whereClause = 'WHERE ' . implode(' AND ', $conditions);
        
        $sql = "SELECT si.* 
                FROM search_indexes si
                {$whereClause}
                ORDER BY si.popularity_score DESC, si.view_count DESC
                LIMIT ?";
        
        $params[] = $limit;
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return array_map([self::class, 'formatSearchResult'], $results);
    }
    
    public static function getTrendingContent($type = null, $limit = 10)
    {
        $pdo = self::getConnection();
        
        $conditions = ['si.status = ?'];
        $params = ['published'];
        
        if ($type) {
            $conditions[] = 'si.searchable_type = ?';
            $params[] = $type;
        }
        
        // Trending is based on recent activity (last 24 hours)
        $conditions[] = 'si.updated_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)';
        
        $whereClause = 'WHERE ' . implode(' AND ', $conditions);
        
        $sql = "SELECT si.*,
                       (si.view_count * 0.3 + si.like_count * 0.5 + si.comment_count * 0.2) as trend_score
                FROM search_indexes si
                {$whereClause}
                ORDER BY trend_score DESC, si.updated_at DESC
                LIMIT ?";
        
        $params[] = $limit;
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return array_map([self::class, 'formatSearchResult'], $results);
    }
    
    public static function getRecommendations($userId, $limit = 10)
    {
        $pdo = self::getConnection();
        
        // Get user's interaction history to build recommendations
        $userInterests = self::getUserInterests($userId);
        
        $conditions = ['si.status = ?', 'si.user_id != ?'];
        $params = ['published', $userId];
        
        // Add category-based recommendations
        if (!empty($userInterests['categories'])) {
            $categoryPlaceholders = str_repeat('?,', count($userInterests['categories']) - 1) . '?';
            $conditions[] = "si.category IN ({$categoryPlaceholders})";
            $params = array_merge($params, $userInterests['categories']);
        }
        
        $whereClause = 'WHERE ' . implode(' AND ', $conditions);
        
        $sql = "SELECT si.*,
                       (si.popularity_score * 0.4 + si.view_count * 0.3 + si.like_count * 0.3) as recommendation_score
                FROM search_indexes si
                {$whereClause}
                ORDER BY recommendation_score DESC, si.created_at DESC
                LIMIT ?";
        
        $params[] = $limit;
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return array_map([self::class, 'formatSearchResult'], $results);
    }
    
    public static function getSuggestions($query, $limit = 5)
    {
        $pdo = self::getConnection();
        
        if (strlen($query) < 2) {
            return [];
        }
        
        $sql = "SELECT DISTINCT si.title
                FROM search_indexes si
                WHERE si.status = 'published' 
                AND si.title LIKE ?
                ORDER BY si.popularity_score DESC
                LIMIT ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute(["%{$query}%", $limit]);
        
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }
    
    public static function indexContent($type, $id, $data)
    {
        $pdo = self::getConnection();
        
        // Check if already indexed
        $existingSql = "SELECT id FROM search_indexes WHERE searchable_type = ? AND searchable_id = ?";
        $existingStmt = $pdo->prepare($existingSql);
        $existingStmt->execute([$type, $id]);
        $existing = $existingStmt->fetch();
        
        $indexData = [
            'searchable_type' => $type,
            'searchable_id' => $id,
            'title' => $data['title'] ?? '',
            'content' => $data['content'] ?? '',
            'tags' => json_encode($data['tags'] ?? []),
            'metadata' => json_encode($data['metadata'] ?? []),
            'category' => $data['category'] ?? null,
            'status' => $data['status'] ?? 'published',
            'user_id' => $data['user_id'] ?? null,
            'username' => $data['username'] ?? null,
            'view_count' => $data['view_count'] ?? 0,
            'like_count' => $data['like_count'] ?? 0,
            'comment_count' => $data['comment_count'] ?? 0,
            'popularity_score' => self::calculatePopularityScore($data)
        ];
        
        if ($existing) {
            // Update existing index
            $fields = [];
            $values = [];
            
            foreach ($indexData as $key => $value) {
                if ($key !== 'searchable_type' && $key !== 'searchable_id') {
                    $fields[] = "{$key} = ?";
                    $values[] = $value;
                }
            }
            
            $fields[] = "updated_at = NOW()";
            $values[] = $existing['id'];
            
            $sql = "UPDATE search_indexes SET " . implode(', ', $fields) . " WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            
            return $stmt->execute($values);
        } else {
            // Create new index
            $fields = array_keys($indexData);
            $placeholders = str_repeat('?,', count($fields) - 1) . '?';
            
            $sql = "INSERT INTO search_indexes (" . implode(', ', $fields) . ") VALUES ({$placeholders})";
            $stmt = $pdo->prepare($sql);
            
            return $stmt->execute(array_values($indexData));
        }
    }
    
    public static function removeFromIndex($type, $id)
    {
        $pdo = self::getConnection();
        
        $sql = "DELETE FROM search_indexes WHERE searchable_type = ? AND searchable_id = ?";
        $stmt = $pdo->prepare($sql);
        
        return $stmt->execute([$type, $id]);
    }
    
    public static function logSearchQuery($query, $filters, $resultsCount, $userId = null, $sessionId = null)
    {
        $pdo = self::getConnection();
        
        $sql = "INSERT INTO search_queries (
            user_id, query_text, filters, results_count, session_id, 
            ip_address, user_agent, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())";
        
        $stmt = $pdo->prepare($sql);
        
        return $stmt->execute([
            $userId,
            $query,
            json_encode($filters),
            $resultsCount,
            $sessionId,
            $_SERVER['REMOTE_ADDR'] ?? null,
            $_SERVER['HTTP_USER_AGENT'] ?? null
        ]);
    }
    
    protected static function buildOrderBy($sort, $hasQuery)
    {
        switch ($sort) {
            case 'relevance':
                return $hasQuery ? 'ORDER BY relevance_score DESC, si.popularity_score DESC' : 'ORDER BY si.popularity_score DESC';
            case 'newest':
                return 'ORDER BY si.created_at DESC';
            case 'oldest':
                return 'ORDER BY si.created_at ASC';
            case 'popular':
                return 'ORDER BY si.popularity_score DESC, si.view_count DESC';
            case 'most_liked':
                return 'ORDER BY si.like_count DESC';
            case 'most_commented':
                return 'ORDER BY si.comment_count DESC';
            default:
                return 'ORDER BY si.created_at DESC';
        }
    }
    
    protected static function calculatePopularityScore($data)
    {
        $viewCount = $data['view_count'] ?? 0;
        $likeCount = $data['like_count'] ?? 0;
        $commentCount = $data['comment_count'] ?? 0;
        
        // Weighted popularity score
        return ($viewCount * 0.1) + ($likeCount * 0.5) + ($commentCount * 0.4);
    }
    
    protected static function getUserInterests($userId)
    {
        $pdo = self::getConnection();
        
        // Get categories from user's liked content
        $sql = "SELECT si.category, COUNT(*) as count
                FROM likes l
                JOIN search_indexes si ON l.likeable_id = si.searchable_id 
                    AND l.likeable_type = si.searchable_type
                WHERE l.user_id = ? AND si.category IS NOT NULL
                GROUP BY si.category
                ORDER BY count DESC
                LIMIT 5";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId]);
        $categories = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        return [
            'categories' => $categories
        ];
    }
    
    protected static function getTimeframeDays($timeframe)
    {
        switch ($timeframe) {
            case '24 hours':
                return 1;
            case '7 days':
                return 7;
            case '30 days':
                return 30;
            case '90 days':
                return 90;
            default:
                return 7;
        }
    }
    
    protected static function formatSearchResult($result)
    {
        if (!$result) return null;
        
        // Decode JSON fields
        $result['tags'] = json_decode($result['tags'] ?? '[]', true);
        $result['metadata'] = json_decode($result['metadata'] ?? '{}', true);
        
        // Add formatted timestamps
        $result['created_at_formatted'] = self::formatTimeAgo($result['created_at']);
        $result['updated_at_formatted'] = self::formatTimeAgo($result['updated_at']);
        
        // Add URL based on type
        $result['url'] = self::generateContentUrl($result['searchable_type'], $result['searchable_id']);
        
        return $result;
    }
    
    protected static function generateContentUrl($type, $id)
    {
        switch ($type) {
            case 'interview':
                return "/interviews/{$id}";
            case 'gallery':
                return "/gallery/{$id}";
            case 'user':
                return "/profile/{$id}";
            case 'business':
                return "/businesses/{$id}";
            case 'event':
                return "/events/{$id}";
            default:
                return "#";
        }
    }
    
    protected static function formatTimeAgo($timestamp)
    {
        $time = time() - strtotime($timestamp);
        
        if ($time < 60) return 'just now';
        if ($time < 3600) return floor($time / 60) . 'm ago';
        if ($time < 86400) return floor($time / 3600) . 'h ago';
        if ($time < 2592000) return floor($time / 86400) . 'd ago';
        if ($time < 31536000) return floor($time / 2592000) . 'mo ago';
        
        return floor($time / 31536000) . 'y ago';
    }
}
