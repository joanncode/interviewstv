<?php

namespace App\Models;

class Category
{
    use DatabaseConnection;

    public static function getAll($type = null)
    {
        $pdo = self::getConnection();
        
        $sql = "SELECT * FROM categories";
        $params = [];
        
        if ($type) {
            $sql .= " WHERE type = ?";
            $params[] = $type;
        }
        
        $sql .= " ORDER BY sort_order ASC, name ASC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public static function findById($id)
    {
        $pdo = self::getConnection();
        
        $sql = "SELECT * FROM categories WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);
        
        return $stmt->fetch(\PDO::FETCH_ASSOC);
    }

    public static function findBySlug($slug)
    {
        $pdo = self::getConnection();
        
        $sql = "SELECT * FROM categories WHERE slug = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$slug]);
        
        return $stmt->fetch(\PDO::FETCH_ASSOC);
    }

    public static function create($data)
    {
        $pdo = self::getConnection();
        
        // Generate slug from name
        $slug = self::generateSlug($data['name']);
        
        $sql = "INSERT INTO categories (
            name, slug, description, type, color, icon, 
            parent_id, sort_order, is_active, meta_title, 
            meta_description, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['name'],
            $slug,
            $data['description'] ?? null,
            $data['type'] ?? 'interview',
            $data['color'] ?? '#007bff',
            $data['icon'] ?? 'fas fa-folder',
            $data['parent_id'] ?? null,
            $data['sort_order'] ?? 0,
            $data['is_active'] ?? true,
            $data['meta_title'] ?? $data['name'],
            $data['meta_description'] ?? $data['description']
        ]);
        
        $categoryId = $pdo->lastInsertId();
        return self::findById($categoryId);
    }

    public static function update($id, $data)
    {
        $pdo = self::getConnection();
        
        $fields = [];
        $values = [];
        
        $allowedFields = [
            'name', 'description', 'type', 'color', 'icon', 
            'parent_id', 'sort_order', 'is_active', 'meta_title', 'meta_description'
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
        
        // Update slug if name changed
        if (isset($data['name'])) {
            $fields[] = "slug = ?";
            $values[] = self::generateSlug($data['name'], $id);
        }
        
        $fields[] = "updated_at = NOW()";
        $values[] = $id;
        
        $sql = "UPDATE categories SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
        
        return self::findById($id);
    }

    public static function delete($id)
    {
        $pdo = self::getConnection();
        
        // Check if category has content
        $sql = "SELECT COUNT(*) FROM interviews WHERE category = (SELECT slug FROM categories WHERE id = ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);
        $contentCount = $stmt->fetchColumn();
        
        if ($contentCount > 0) {
            throw new \Exception('Cannot delete category with existing content');
        }
        
        // Check if category has subcategories
        $sql = "SELECT COUNT(*) FROM categories WHERE parent_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);
        $subcategoryCount = $stmt->fetchColumn();
        
        if ($subcategoryCount > 0) {
            throw new \Exception('Cannot delete category with subcategories');
        }
        
        $sql = "DELETE FROM categories WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        return $stmt->execute([$id]);
    }

    public static function getHierarchy($type = null)
    {
        $categories = self::getAll($type);
        return self::buildHierarchy($categories);
    }

    public static function getContentCount($categoryId)
    {
        $pdo = self::getConnection();
        
        $category = self::findById($categoryId);
        if (!$category) {
            return 0;
        }
        
        $sql = "SELECT COUNT(*) FROM interviews WHERE category = ? AND status = 'published'";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$category['slug']]);
        
        return $stmt->fetchColumn();
    }

    private static function buildHierarchy($categories, $parentId = null)
    {
        $hierarchy = [];
        
        foreach ($categories as $category) {
            if ($category['parent_id'] == $parentId) {
                $category['children'] = self::buildHierarchy($categories, $category['id']);
                $category['content_count'] = self::getContentCount($category['id']);
                $hierarchy[] = $category;
            }
        }
        
        return $hierarchy;
    }

    private static function generateSlug($name, $excludeId = null)
    {
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $name)));
        $originalSlug = $slug;
        $counter = 1;
        
        $pdo = self::getConnection();
        
        while (true) {
            $sql = "SELECT id FROM categories WHERE slug = ?";
            $params = [$slug];
            
            if ($excludeId) {
                $sql .= " AND id != ?";
                $params[] = $excludeId;
            }
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            if (!$stmt->fetch()) {
                break;
            }
            
            $slug = $originalSlug . '-' . $counter;
            $counter++;
        }
        
        return $slug;
    }

    public static function getPopular($limit = 10, $type = null)
    {
        $pdo = self::getConnection();
        
        $sql = "SELECT c.*, COUNT(i.id) as content_count 
                FROM categories c 
                LEFT JOIN interviews i ON c.slug = i.category AND i.status = 'published'
                WHERE c.is_active = 1";
        
        $params = [];
        
        if ($type) {
            $sql .= " AND c.type = ?";
            $params[] = $type;
        }
        
        $sql .= " GROUP BY c.id 
                  ORDER BY content_count DESC, c.name ASC 
                  LIMIT ?";
        $params[] = $limit;
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public static function search($query, $type = null)
    {
        $pdo = self::getConnection();
        
        $sql = "SELECT * FROM categories 
                WHERE (name LIKE ? OR description LIKE ?) 
                AND is_active = 1";
        
        $params = ["%{$query}%", "%{$query}%"];
        
        if ($type) {
            $sql .= " AND type = ?";
            $params[] = $type;
        }
        
        $sql .= " ORDER BY name ASC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
}
