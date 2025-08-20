<?php

namespace App\Models;

use PDO;

class Interview
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
    
    public static function create($data)
    {
        $pdo = self::getConnection();
        
        // Generate slug from title
        $slug = self::generateSlug($data['title']);
        
        $sql = "INSERT INTO interviews (
            title, description, slug, interviewer_id, interviewee_id, interviewee_name, 
            interviewee_bio, type, status, thumbnail_url, duration, category, tags, 
            published_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
        
        $stmt = $pdo->prepare($sql);
        $publishedAt = null;
        if (isset($data['status']) && $data['status'] === 'published') {
            $publishedAt = date('Y-m-d H:i:s');
        }

        $stmt->execute([
            $data['title'],
            $data['description'] ?? null,
            $slug,
            $data['interviewer_id'],
            $data['interviewee_id'] ?? null,
            $data['interviewee_name'] ?? null,
            $data['interviewee_bio'] ?? null,
            $data['type'] ?? 'video',
            $data['status'] ?? 'draft',
            $data['thumbnail_url'] ?? null,
            $data['duration'] ?? null,
            $data['category'] ?? null,
            isset($data['tags']) ? json_encode($data['tags']) : null,
            $publishedAt
        ]);
        
        $interviewId = $pdo->lastInsertId();
        return self::findById($interviewId);
    }
    
    public static function findById($id)
    {
        $pdo = self::getConnection();
        
        $sql = "SELECT i.*, 
                       interviewer.username as interviewer_username,
                       interviewer.avatar_url as interviewer_avatar,
                       interviewee.username as interviewee_username,
                       interviewee.avatar_url as interviewee_avatar
                FROM interviews i
                LEFT JOIN users interviewer ON i.interviewer_id = interviewer.id
                LEFT JOIN users interviewee ON i.interviewee_id = interviewee.id
                WHERE i.id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);
        
        $interview = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($interview) {
            return self::formatInterview($interview);
        }
        
        return null;
    }
    
    public static function findBySlug($slug)
    {
        $pdo = self::getConnection();
        
        $sql = "SELECT i.*, 
                       interviewer.username as interviewer_username,
                       interviewer.avatar_url as interviewer_avatar,
                       interviewee.username as interviewee_username,
                       interviewee.avatar_url as interviewee_avatar
                FROM interviews i
                LEFT JOIN users interviewer ON i.interviewer_id = interviewer.id
                LEFT JOIN users interviewee ON i.interviewee_id = interviewee.id
                WHERE i.slug = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$slug]);
        
        $interview = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($interview) {
            return self::formatInterview($interview);
        }
        
        return null;
    }
    
    public static function getAll($page = 1, $limit = 20, $filters = [])
    {
        $pdo = self::getConnection();
        $offset = ($page - 1) * $limit;
        
        $whereConditions = ['i.status = ?'];
        $params = ['published'];
        
        // Apply filters
        if (!empty($filters['category'])) {
            $whereConditions[] = 'i.category = ?';
            $params[] = $filters['category'];
        }
        
        if (!empty($filters['type'])) {
            $whereConditions[] = 'i.type = ?';
            $params[] = $filters['type'];
        }
        
        if (!empty($filters['interviewer_id'])) {
            $whereConditions[] = 'i.interviewer_id = ?';
            $params[] = $filters['interviewer_id'];
        }
        
        if (!empty($filters['search'])) {
            $whereConditions[] = 'MATCH(i.title, i.description, i.interviewee_name) AGAINST(? IN NATURAL LANGUAGE MODE)';
            $params[] = $filters['search'];
        }
        
        if (!empty($filters['featured'])) {
            $whereConditions[] = 'i.featured = ?';
            $params[] = $filters['featured'];
        }
        
        $whereClause = 'WHERE ' . implode(' AND ', $whereConditions);
        
        // Determine ordering
        $orderBy = 'ORDER BY i.created_at DESC';
        if (!empty($filters['sort'])) {
            switch ($filters['sort']) {
                case 'trending':
                    $orderBy = 'ORDER BY i.trending_score DESC, i.view_count DESC';
                    break;
                case 'popular':
                    $orderBy = 'ORDER BY i.view_count DESC, i.like_count DESC';
                    break;
                case 'recent':
                    $orderBy = 'ORDER BY i.published_at DESC';
                    break;
            }
        }
        
        // Get total count
        $countSql = "SELECT COUNT(*) FROM interviews i {$whereClause}";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($params);
        $total = $countStmt->fetchColumn();
        
        // Get interviews
        $sql = "SELECT i.*, 
                       interviewer.username as interviewer_username,
                       interviewer.avatar_url as interviewer_avatar,
                       interviewee.username as interviewee_username,
                       interviewee.avatar_url as interviewee_avatar
                FROM interviews i
                LEFT JOIN users interviewer ON i.interviewer_id = interviewer.id
                LEFT JOIN users interviewee ON i.interviewee_id = interviewee.id
                {$whereClause}
                {$orderBy}
                LIMIT ? OFFSET ?";
        
        $params[] = $limit;
        $params[] = $offset;
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $interviews = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'interviews' => array_map([self::class, 'formatInterview'], $interviews),
            'total' => $total
        ];
    }
    
    public static function update($id, $data)
    {
        $pdo = self::getConnection();
        
        $fields = [];
        $values = [];
        
        $allowedFields = [
            'title', 'description', 'interviewee_id', 'interviewee_name', 
            'interviewee_bio', 'type', 'status', 'thumbnail_url', 'duration', 
            'category', 'tags', 'featured'
        ];
        
        foreach ($data as $key => $value) {
            if (in_array($key, $allowedFields)) {
                $fields[] = "{$key} = ?";
                
                if ($key === 'tags' && is_array($value)) {
                    $values[] = json_encode($value);
                } else {
                    $values[] = $value;
                }
            }
        }
        
        if (empty($fields)) {
            throw new \Exception('No valid fields to update');
        }
        
        // Update slug if title changed
        if (isset($data['title'])) {
            $fields[] = "slug = ?";
            $values[] = self::generateSlug($data['title'], $id);
        }
        
        // Update published_at if status changed to published
        if (isset($data['status']) && $data['status'] === 'published') {
            $fields[] = "published_at = NOW()";
        }
        
        $fields[] = "updated_at = NOW()";
        $values[] = $id;
        
        $sql = "UPDATE interviews SET " . implode(', ', $fields) . " WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
        
        return self::findById($id);
    }
    
    public static function delete($id)
    {
        $pdo = self::getConnection();
        
        $sql = "DELETE FROM interviews WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        
        return $stmt->execute([$id]);
    }
    
    public static function incrementViewCount($id)
    {
        $pdo = self::getConnection();
        
        $sql = "UPDATE interviews SET view_count = view_count + 1 WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        
        return $stmt->execute([$id]);
    }
    
    public static function updateLikeCount($id)
    {
        $pdo = self::getConnection();
        
        // Count likes for this interview
        $countSql = "SELECT COUNT(*) FROM likes WHERE likeable_type = 'interview' AND likeable_id = ?";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute([$id]);
        $likeCount = $countStmt->fetchColumn();
        
        // Update interview like count
        $updateSql = "UPDATE interviews SET like_count = ? WHERE id = ?";
        $updateStmt = $pdo->prepare($updateSql);
        
        return $updateStmt->execute([$likeCount, $id]);
    }
    
    public static function getMedia($interviewId)
    {
        $pdo = self::getConnection();
        
        $sql = "SELECT * FROM interview_media WHERE interview_id = ? ORDER BY is_primary DESC, sort_order ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$interviewId]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public static function addMedia($interviewId, $mediaData)
    {
        $pdo = self::getConnection();
        
        $sql = "INSERT INTO interview_media (
            interview_id, type, url, filename, mime_type, file_size, 
            duration, width, height, is_primary, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $interviewId,
            $mediaData['type'],
            $mediaData['url'],
            $mediaData['filename'],
            $mediaData['mime_type'],
            $mediaData['file_size'],
            $mediaData['duration'] ?? null,
            $mediaData['width'] ?? null,
            $mediaData['height'] ?? null,
            $mediaData['is_primary'] ?? false,
            $mediaData['sort_order'] ?? 0
        ]);
        
        return $pdo->lastInsertId();
    }
    
    protected static function formatInterview($interview)
    {
        if (!$interview) return null;
        
        // Parse JSON fields
        if ($interview['tags']) {
            $interview['tags'] = json_decode($interview['tags'], true);
        }
        
        // Format interviewer
        $interview['interviewer'] = [
            'id' => $interview['interviewer_id'],
            'username' => $interview['interviewer_username'],
            'avatar_url' => $interview['interviewer_avatar']
        ];
        
        // Format interviewee
        if ($interview['interviewee_id']) {
            $interview['interviewee'] = [
                'id' => $interview['interviewee_id'],
                'username' => $interview['interviewee_username'],
                'avatar_url' => $interview['interviewee_avatar'],
                'name' => $interview['interviewee_username'],
                'bio' => null
            ];
        } else {
            $interview['interviewee'] = [
                'id' => null,
                'username' => null,
                'avatar_url' => null,
                'name' => $interview['interviewee_name'],
                'bio' => $interview['interviewee_bio']
            ];
        }
        
        // Remove redundant fields
        unset($interview['interviewer_username'], $interview['interviewer_avatar']);
        unset($interview['interviewee_username'], $interview['interviewee_avatar']);
        
        return $interview;
    }
    
    protected static function generateSlug($title, $excludeId = null)
    {
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $title)));
        $slug = trim($slug, '-');
        
        // Ensure uniqueness
        $pdo = self::getConnection();
        $originalSlug = $slug;
        $counter = 1;
        
        while (true) {
            $sql = "SELECT COUNT(*) FROM interviews WHERE slug = ?";
            $params = [$slug];
            
            if ($excludeId) {
                $sql .= " AND id != ?";
                $params[] = $excludeId;
            }
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            if ($stmt->fetchColumn() == 0) {
                break;
            }
            
            $slug = $originalSlug . '-' . $counter;
            $counter++;
        }
        
        return $slug;
    }
}
