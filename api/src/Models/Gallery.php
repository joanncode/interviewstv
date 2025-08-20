<?php

namespace App\Models;

use PDO;

class Gallery
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
        
        $sql = "INSERT INTO galleries (
            user_id, title, description, slug, type, visibility, 
            cover_image_url, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['user_id'],
            $data['title'],
            $data['description'] ?? null,
            $slug,
            $data['type'] ?? 'personal',
            $data['visibility'] ?? 'public',
            $data['cover_image_url'] ?? null,
            $data['sort_order'] ?? 'date_desc'
        ]);
        
        $galleryId = $pdo->lastInsertId();
        return self::findById($galleryId);
    }
    
    public static function findById($id)
    {
        $pdo = self::getConnection();
        
        $sql = "SELECT g.*, 
                       u.username as owner_username,
                       u.avatar_url as owner_avatar
                FROM galleries g
                LEFT JOIN users u ON g.user_id = u.id
                WHERE g.id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);
        
        $gallery = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($gallery) {
            return self::formatGallery($gallery);
        }
        
        return null;
    }
    
    public static function findBySlug($slug)
    {
        $pdo = self::getConnection();
        
        $sql = "SELECT g.*, 
                       u.username as owner_username,
                       u.avatar_url as owner_avatar
                FROM galleries g
                LEFT JOIN users u ON g.user_id = u.id
                WHERE g.slug = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$slug]);
        
        $gallery = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($gallery) {
            return self::formatGallery($gallery);
        }
        
        return null;
    }
    
    public static function getAll($page = 1, $limit = 20, $filters = [])
    {
        $pdo = self::getConnection();
        $offset = ($page - 1) * $limit;
        
        $whereConditions = ['g.visibility = ?'];
        $params = ['public'];
        
        // Apply filters
        if (!empty($filters['type'])) {
            $whereConditions[] = 'g.type = ?';
            $params[] = $filters['type'];
        }
        
        if (!empty($filters['user_id'])) {
            $whereConditions[] = 'g.user_id = ?';
            $params[] = $filters['user_id'];
            // Allow private galleries for owner
            $whereConditions[0] = 'g.visibility IN (?, ?, ?)';
            $params[0] = 'public';
            array_splice($params, 1, 0, ['private', 'unlisted']);
        }
        
        if (!empty($filters['search'])) {
            $whereConditions[] = 'MATCH(g.title, g.description) AGAINST(? IN NATURAL LANGUAGE MODE)';
            $params[] = $filters['search'];
        }
        
        if (!empty($filters['featured'])) {
            $whereConditions[] = 'g.featured = ?';
            $params[] = $filters['featured'];
        }
        
        $whereClause = 'WHERE ' . implode(' AND ', $whereConditions);
        
        // Determine ordering
        $orderBy = 'ORDER BY g.created_at DESC';
        if (!empty($filters['sort'])) {
            switch ($filters['sort']) {
                case 'popular':
                    $orderBy = 'ORDER BY g.view_count DESC, g.like_count DESC';
                    break;
                case 'recent':
                    $orderBy = 'ORDER BY g.created_at DESC';
                    break;
                case 'alphabetical':
                    $orderBy = 'ORDER BY g.title ASC';
                    break;
            }
        }
        
        // Get total count
        $countSql = "SELECT COUNT(*) FROM galleries g {$whereClause}";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($params);
        $total = $countStmt->fetchColumn();
        
        // Get galleries
        $sql = "SELECT g.*, 
                       u.username as owner_username,
                       u.avatar_url as owner_avatar
                FROM galleries g
                LEFT JOIN users u ON g.user_id = u.id
                {$whereClause}
                {$orderBy}
                LIMIT ? OFFSET ?";
        
        $params[] = $limit;
        $params[] = $offset;
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $galleries = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'galleries' => array_map([self::class, 'formatGallery'], $galleries),
            'total' => $total
        ];
    }
    
    public static function update($id, $data)
    {
        $pdo = self::getConnection();
        
        $fields = [];
        $values = [];
        
        $allowedFields = [
            'title', 'description', 'type', 'visibility', 'cover_image_url', 
            'sort_order', 'featured'
        ];
        
        foreach ($data as $key => $value) {
            if (in_array($key, $allowedFields)) {
                $fields[] = "{$key} = ?";
                $values[] = $value;
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
        
        $fields[] = "updated_at = NOW()";
        $values[] = $id;
        
        $sql = "UPDATE galleries SET " . implode(', ', $fields) . " WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
        
        return self::findById($id);
    }
    
    public static function delete($id)
    {
        $pdo = self::getConnection();
        
        $sql = "DELETE FROM galleries WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        
        return $stmt->execute([$id]);
    }
    
    public static function incrementViewCount($id)
    {
        $pdo = self::getConnection();
        
        $sql = "UPDATE galleries SET view_count = view_count + 1 WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        
        return $stmt->execute([$id]);
    }
    
    public static function updateMediaCount($id)
    {
        $pdo = self::getConnection();
        
        // Count media for this gallery
        $countSql = "SELECT COUNT(*) FROM gallery_media WHERE gallery_id = ?";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute([$id]);
        $mediaCount = $countStmt->fetchColumn();
        
        // Update gallery media count
        $updateSql = "UPDATE galleries SET media_count = ? WHERE id = ?";
        $updateStmt = $pdo->prepare($updateSql);
        
        return $updateStmt->execute([$mediaCount, $id]);
    }
    
    public static function getMedia($galleryId, $sortOrder = null)
    {
        $pdo = self::getConnection();
        
        // Determine sort order
        $orderBy = 'ORDER BY sort_order ASC, created_at DESC';
        if ($sortOrder) {
            switch ($sortOrder) {
                case 'date_asc':
                    $orderBy = 'ORDER BY created_at ASC';
                    break;
                case 'date_desc':
                    $orderBy = 'ORDER BY created_at DESC';
                    break;
                case 'name_asc':
                    $orderBy = 'ORDER BY title ASC, filename ASC';
                    break;
                case 'name_desc':
                    $orderBy = 'ORDER BY title DESC, filename DESC';
                    break;
                case 'custom':
                    $orderBy = 'ORDER BY sort_order ASC, created_at DESC';
                    break;
            }
        }
        
        $sql = "SELECT * FROM gallery_media WHERE gallery_id = ? {$orderBy}";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$galleryId]);
        
        $media = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Parse JSON fields
        foreach ($media as &$item) {
            if ($item['tags']) {
                $item['tags'] = json_decode($item['tags'], true);
            }
            if ($item['processing_data']) {
                $item['processing_data'] = json_decode($item['processing_data'], true);
            }
        }
        
        return $media;
    }
    
    public static function addMedia($galleryId, $mediaData)
    {
        $pdo = self::getConnection();
        
        $sql = "INSERT INTO gallery_media (
            gallery_id, title, description, type, url, thumbnail_url, filename, 
            mime_type, file_size, width, height, duration, sort_order, is_cover, 
            alt_text, tags, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $galleryId,
            $mediaData['title'] ?? null,
            $mediaData['description'] ?? null,
            $mediaData['type'],
            $mediaData['url'],
            $mediaData['thumbnail_url'] ?? null,
            $mediaData['filename'],
            $mediaData['mime_type'],
            $mediaData['file_size'],
            $mediaData['width'] ?? null,
            $mediaData['height'] ?? null,
            $mediaData['duration'] ?? null,
            $mediaData['sort_order'] ?? 0,
            $mediaData['is_cover'] ?? false,
            $mediaData['alt_text'] ?? null,
            isset($mediaData['tags']) ? json_encode($mediaData['tags']) : null
        ]);
        
        $mediaId = $pdo->lastInsertId();
        
        // Update gallery media count
        self::updateMediaCount($galleryId);
        
        return $mediaId;
    }
    
    public static function updateMediaOrder($galleryId, $mediaOrder)
    {
        $pdo = self::getConnection();
        
        $pdo->beginTransaction();
        
        try {
            foreach ($mediaOrder as $index => $mediaId) {
                $sql = "UPDATE gallery_media SET sort_order = ? WHERE id = ? AND gallery_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$index, $mediaId, $galleryId]);
            }
            
            $pdo->commit();
            return true;
            
        } catch (\Exception $e) {
            $pdo->rollback();
            throw $e;
        }
    }
    
    protected static function formatGallery($gallery)
    {
        if (!$gallery) return null;
        
        // Format owner
        $gallery['owner'] = [
            'id' => $gallery['user_id'],
            'username' => $gallery['owner_username'],
            'avatar_url' => $gallery['owner_avatar']
        ];
        
        // Remove redundant fields
        unset($gallery['owner_username'], $gallery['owner_avatar']);
        
        return $gallery;
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
            $sql = "SELECT COUNT(*) FROM galleries WHERE slug = ?";
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
