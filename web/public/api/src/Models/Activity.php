<?php

namespace App\Models;

use PDO;

class Activity
{
    public static function getConnection()
    {
        static $pdo = null;
        
        if ($pdo === null) {
            $config = config('database.connections.mysql');
            $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
            
            $pdo = new PDO($dsn, $config['username'], $config['password'], $config['options']);
        }
        
        return $pdo;
    }
    
    public static function create($data)
    {
        $pdo = self::getConnection();
        
        $sql = "INSERT INTO activities (user_id, activity_type, entity_type, entity_id, metadata, is_public, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['user_id'],
            $data['activity_type'],
            $data['entity_type'],
            $data['entity_id'],
            isset($data['metadata']) ? json_encode($data['metadata']) : null,
            $data['is_public'] ?? true
        ]);
        
        $activityId = $pdo->lastInsertId();
        
        // Trigger feed cache update for followers
        self::updateFollowerFeeds($data['user_id'], $activityId);
        
        return self::findById($activityId);
    }
    
    public static function findById($id)
    {
        $pdo = self::getConnection();
        
        $sql = "SELECT a.*, u.username, u.avatar_url 
                FROM activities a
                JOIN users u ON a.user_id = u.id
                WHERE a.id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);
        
        $activity = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($activity && $activity['metadata']) {
            $activity['metadata'] = json_decode($activity['metadata'], true);
        }
        
        return $activity;
    }
    
    public static function getUserFeed($userId, $page = 1, $limit = 20)
    {
        $pdo = self::getConnection();
        $offset = ($page - 1) * $limit;
        
        // Get activities from followed users plus own activities
        $sql = "SELECT DISTINCT a.*, u.username, u.avatar_url,
                       CASE 
                           WHEN a.user_id = ? THEN 2.0
                           ELSE 1.0
                       END as relevance_score
                FROM activities a
                JOIN users u ON a.user_id = u.id
                LEFT JOIN followers f ON a.user_id = f.followed_id AND f.follower_id = ?
                WHERE (a.user_id = ? OR f.follower_id IS NOT NULL)
                    AND a.is_public = 1
                    AND EXISTS (
                        SELECT 1 FROM feed_preferences fp 
                        WHERE fp.user_id = ? 
                        AND fp.activity_type = a.activity_type 
                        AND fp.enabled = 1
                    )
                ORDER BY relevance_score DESC, a.created_at DESC
                LIMIT ? OFFSET ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId, $userId, $userId, $userId, $limit, $offset]);
        
        $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Decode metadata and enrich activities
        foreach ($activities as &$activity) {
            if ($activity['metadata']) {
                $activity['metadata'] = json_decode($activity['metadata'], true);
            }
            $activity = self::enrichActivity($activity);
        }
        
        // Get total count
        $countSql = "SELECT COUNT(DISTINCT a.id)
                     FROM activities a
                     LEFT JOIN followers f ON a.user_id = f.followed_id AND f.follower_id = ?
                     WHERE (a.user_id = ? OR f.follower_id IS NOT NULL)
                         AND a.is_public = 1
                         AND EXISTS (
                             SELECT 1 FROM feed_preferences fp 
                             WHERE fp.user_id = ? 
                             AND fp.activity_type = a.activity_type 
                             AND fp.enabled = 1
                         )";
        
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute([$userId, $userId, $userId]);
        $total = $countStmt->fetchColumn();
        
        return [
            'activities' => $activities,
            'total' => (int) $total
        ];
    }
    
    public static function getPublicFeed($page = 1, $limit = 20)
    {
        $pdo = self::getConnection();
        $offset = ($page - 1) * $limit;
        
        $sql = "SELECT a.*, u.username, u.avatar_url
                FROM activities a
                JOIN users u ON a.user_id = u.id
                WHERE a.is_public = 1
                    AND a.activity_type IN ('interview_published', 'user_followed')
                ORDER BY a.created_at DESC
                LIMIT ? OFFSET ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$limit, $offset]);
        
        $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Decode metadata and enrich activities
        foreach ($activities as &$activity) {
            if ($activity['metadata']) {
                $activity['metadata'] = json_decode($activity['metadata'], true);
            }
            $activity = self::enrichActivity($activity);
        }
        
        // Get total count
        $countSql = "SELECT COUNT(*) FROM activities WHERE is_public = 1 
                     AND activity_type IN ('interview_published', 'user_followed')";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute();
        $total = $countStmt->fetchColumn();
        
        return [
            'activities' => $activities,
            'total' => (int) $total
        ];
    }
    
    public static function enrichActivity($activity)
    {
        $pdo = self::getConnection();
        
        // Add entity details based on type
        switch ($activity['entity_type']) {
            case 'interview':
                $sql = "SELECT title, description, thumbnail_url, type FROM interviews WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$activity['entity_id']]);
                $entity = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($entity) {
                    $activity['entity_details'] = $entity;
                }
                break;
                
            case 'user':
                $sql = "SELECT username, avatar_url, bio FROM users WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$activity['entity_id']]);
                $entity = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($entity) {
                    $activity['entity_details'] = $entity;
                }
                break;
                
            case 'comment':
                $sql = "SELECT content, entity_type as comment_entity_type, entity_id as comment_entity_id 
                        FROM comments WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$activity['entity_id']]);
                $entity = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($entity) {
                    $activity['entity_details'] = $entity;
                    
                    // Get the commented entity details
                    if ($entity['comment_entity_type'] === 'interview') {
                        $sql = "SELECT title FROM interviews WHERE id = ?";
                        $stmt = $pdo->prepare($sql);
                        $stmt->execute([$entity['comment_entity_id']]);
                        $commentedEntity = $stmt->fetch(PDO::FETCH_ASSOC);
                        if ($commentedEntity) {
                            $activity['entity_details']['commented_on'] = $commentedEntity;
                        }
                    }
                }
                break;
        }
        
        return $activity;
    }
    
    protected static function updateFollowerFeeds($userId, $activityId)
    {
        $pdo = self::getConnection();
        
        // Get all followers of the user
        $sql = "SELECT follower_id FROM followers WHERE followed_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId]);
        $followers = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        // Add activity to each follower's feed cache
        foreach ($followers as $followerId) {
            $insertSql = "INSERT IGNORE INTO feed_cache (user_id, activity_id, score, created_at) 
                          VALUES (?, ?, 1.0, NOW())";
            $insertStmt = $pdo->prepare($insertSql);
            $insertStmt->execute([$followerId, $activityId]);
        }
    }
    
    // Activity creation helpers
    public static function createInterviewPublishedActivity($userId, $interviewId, $interviewData)
    {
        return self::create([
            'user_id' => $userId,
            'activity_type' => 'interview_published',
            'entity_type' => 'interview',
            'entity_id' => $interviewId,
            'metadata' => [
                'title' => $interviewData['title'],
                'description' => $interviewData['description'],
                'type' => $interviewData['type'],
                'thumbnail_url' => $interviewData['thumbnail_url'] ?? null
            ],
            'is_public' => $interviewData['is_public'] ?? true
        ]);
    }
    
    public static function createInterviewLikedActivity($userId, $interviewId, $interviewData)
    {
        return self::create([
            'user_id' => $userId,
            'activity_type' => 'interview_liked',
            'entity_type' => 'interview',
            'entity_id' => $interviewId,
            'metadata' => [
                'title' => $interviewData['title'],
                'thumbnail_url' => $interviewData['thumbnail_url'] ?? null
            ],
            'is_public' => true
        ]);
    }
    
    public static function createCommentActivity($userId, $commentId, $commentData)
    {
        return self::create([
            'user_id' => $userId,
            'activity_type' => 'comment_created',
            'entity_type' => 'comment',
            'entity_id' => $commentId,
            'metadata' => [
                'content' => substr($commentData['content'], 0, 200),
                'entity_type' => $commentData['entity_type'],
                'entity_id' => $commentData['entity_id']
            ],
            'is_public' => true
        ]);
    }
    
    public static function createUserFollowedActivity($userId, $followedUserId, $followedUserData)
    {
        return self::create([
            'user_id' => $userId,
            'activity_type' => 'user_followed',
            'entity_type' => 'user',
            'entity_id' => $followedUserId,
            'metadata' => [
                'username' => $followedUserData['username'],
                'avatar_url' => $followedUserData['avatar_url'] ?? null
            ],
            'is_public' => true
        ]);
    }
}
