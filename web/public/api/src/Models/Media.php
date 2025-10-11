<?php

namespace App\Models;

class Media
{
    public static function findById($id)
    {
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new \PDO($dsn, $config['username'], $config['password'], $config['options']);
        
        $sql = "SELECT gm.*, g.title as gallery_title, g.user_id as gallery_owner_id,
                       (SELECT COUNT(*) FROM likes WHERE likeable_type = 'media' AND likeable_id = gm.id) as like_count
                FROM gallery_media gm
                LEFT JOIN galleries g ON gm.gallery_id = g.id
                WHERE gm.id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);
        
        return $stmt->fetch(\PDO::FETCH_ASSOC);
    }
    
    public static function findByGalleryId($galleryId, $options = [])
    {
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new \PDO($dsn, $config['username'], $config['password'], $config['options']);
        
        $limit = $options['limit'] ?? 50;
        $offset = $options['offset'] ?? 0;
        $orderBy = $options['order_by'] ?? 'order_index ASC, created_at ASC';
        
        $sql = "SELECT gm.*,
                       (SELECT COUNT(*) FROM likes WHERE likeable_type = 'media' AND likeable_id = gm.id) as like_count
                FROM gallery_media gm
                WHERE gm.gallery_id = ?
                ORDER BY {$orderBy}
                LIMIT ? OFFSET ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$galleryId, $limit, $offset]);
        
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
    
    public static function create($data)
    {
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new \PDO($dsn, $config['username'], $config['password'], $config['options']);
        
        $sql = "INSERT INTO gallery_media (
                    gallery_id, type, url, thumbnail_url, filename, 
                    mime_type, file_size, width, height, duration, 
                    title, description, caption, order_index, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
        
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute([
            $data['gallery_id'],
            $data['type'],
            $data['url'],
            $data['thumbnail_url'] ?? null,
            $data['filename'],
            $data['mime_type'],
            $data['file_size'],
            $data['width'] ?? null,
            $data['height'] ?? null,
            $data['duration'] ?? null,
            $data['title'] ?? null,
            $data['description'] ?? null,
            $data['caption'] ?? null,
            $data['order_index'] ?? 0
        ]);
        
        if ($result) {
            return $pdo->lastInsertId();
        }
        
        return false;
    }
    
    public static function update($id, $data)
    {
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new \PDO($dsn, $config['username'], $config['password'], $config['options']);
        
        $fields = [];
        $values = [];
        
        $allowedFields = ['title', 'description', 'caption', 'order_index'];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $fields[] = "{$field} = ?";
                $values[] = $data[$field];
            }
        }
        
        if (empty($fields)) {
            return false;
        }
        
        $fields[] = "updated_at = NOW()";
        $values[] = $id;
        
        $sql = "UPDATE gallery_media SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        
        return $stmt->execute($values);
    }
    
    public static function delete($id)
    {
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new \PDO($dsn, $config['username'], $config['password'], $config['options']);
        
        // Start transaction
        $pdo->beginTransaction();
        
        try {
            // Delete associated likes first
            $sql = "DELETE FROM likes WHERE likeable_type = 'media' AND likeable_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id]);
            
            // Delete the media record
            $sql = "DELETE FROM gallery_media WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $result = $stmt->execute([$id]);
            
            $pdo->commit();
            return $result;
            
        } catch (\Exception $e) {
            $pdo->rollback();
            throw $e;
        }
    }
    
    public static function updateLikeCount($id)
    {
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new \PDO($dsn, $config['username'], $config['password'], $config['options']);
        
        $sql = "UPDATE gallery_media SET 
                like_count = (SELECT COUNT(*) FROM likes WHERE likeable_type = 'media' AND likeable_id = ?)
                WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        return $stmt->execute([$id, $id]);
    }
    
    public static function reorderMedia($galleryId, $mediaOrder)
    {
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new \PDO($dsn, $config['username'], $config['password'], $config['options']);
        
        $pdo->beginTransaction();
        
        try {
            foreach ($mediaOrder as $index => $mediaId) {
                $sql = "UPDATE gallery_media SET order_index = ? WHERE id = ? AND gallery_id = ?";
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
    
    public static function getPopularMedia($limit = 10)
    {
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new \PDO($dsn, $config['username'], $config['password'], $config['options']);
        
        $sql = "SELECT gm.*, g.title as gallery_title, g.user_id as gallery_owner_id,
                       (SELECT COUNT(*) FROM likes WHERE likeable_type = 'media' AND likeable_id = gm.id) as like_count
                FROM gallery_media gm
                LEFT JOIN galleries g ON gm.gallery_id = g.id
                WHERE g.visibility = 'public'
                ORDER BY like_count DESC, gm.created_at DESC
                LIMIT ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$limit]);
        
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
    
    public static function getRecentMedia($limit = 10)
    {
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new \PDO($dsn, $config['username'], $config['password'], $config['options']);
        
        $sql = "SELECT gm.*, g.title as gallery_title, g.user_id as gallery_owner_id,
                       (SELECT COUNT(*) FROM likes WHERE likeable_type = 'media' AND likeable_id = gm.id) as like_count
                FROM gallery_media gm
                LEFT JOIN galleries g ON gm.gallery_id = g.id
                WHERE g.visibility = 'public'
                ORDER BY gm.created_at DESC
                LIMIT ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$limit]);
        
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
    
    public static function searchMedia($query, $options = [])
    {
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new \PDO($dsn, $config['username'], $config['password'], $config['options']);
        
        $limit = $options['limit'] ?? 20;
        $offset = $options['offset'] ?? 0;
        $type = $options['type'] ?? null;
        
        $whereClause = "WHERE g.visibility = 'public'";
        $params = [];
        
        if (!empty($query)) {
            $whereClause .= " AND (gm.title LIKE ? OR gm.description LIKE ? OR gm.caption LIKE ?)";
            $searchTerm = "%{$query}%";
            $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm]);
        }
        
        if ($type) {
            $whereClause .= " AND gm.type = ?";
            $params[] = $type;
        }
        
        $sql = "SELECT gm.*, g.title as gallery_title, g.user_id as gallery_owner_id,
                       (SELECT COUNT(*) FROM likes WHERE likeable_type = 'media' AND likeable_id = gm.id) as like_count
                FROM gallery_media gm
                LEFT JOIN galleries g ON gm.gallery_id = g.id
                {$whereClause}
                ORDER BY like_count DESC, gm.created_at DESC
                LIMIT ? OFFSET ?";
        
        $params = array_merge($params, [$limit, $offset]);
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
}
