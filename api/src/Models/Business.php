<?php

namespace App\Models;

use PDO;

class Business
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
        
        $sql = "INSERT INTO businesses (name, owner_id, industry, description, location, website_url, logo_url, phone, email, hours, verified, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['name'],
            $data['owner_id'],
            $data['industry'],
            $data['description'] ?? null,
            $data['location'] ?? null,
            $data['website_url'] ?? null,
            $data['logo_url'] ?? null,
            $data['phone'] ?? null,
            $data['email'] ?? null,
            isset($data['hours']) ? json_encode($data['hours']) : null,
            $data['verified'] ?? false
        ]);
        
        $businessId = $pdo->lastInsertId();
        
        // Index for search
        self::indexForSearch($businessId);
        
        return self::findById($businessId);
    }

    public static function findById($id)
    {
        $pdo = self::getConnection();
        
        $sql = "SELECT b.*, u.username as owner_username, u.avatar_url as owner_avatar,
                       COUNT(DISTINCT i.id) as interview_count,
                       COUNT(DISTINCT c.id) as comment_count,
                       AVG(br.rating) as average_rating,
                       COUNT(DISTINCT br.id) as review_count
                FROM businesses b
                LEFT JOIN users u ON b.owner_id = u.id
                LEFT JOIN business_interviews bi ON b.id = bi.business_id
                LEFT JOIN interviews i ON bi.interview_id = i.id
                LEFT JOIN comments c ON c.entity_type = 'business' AND c.entity_id = b.id
                LEFT JOIN business_reviews br ON b.id = br.business_id
                WHERE b.id = ?
                GROUP BY b.id";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);
        
        $business = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($business) {
            $business = self::formatBusiness($business);
        }
        
        return $business;
    }

    public static function findBySlug($slug)
    {
        $pdo = self::getConnection();
        
        $sql = "SELECT b.*, u.username as owner_username, u.avatar_url as owner_avatar,
                       COUNT(DISTINCT i.id) as interview_count,
                       COUNT(DISTINCT c.id) as comment_count,
                       AVG(br.rating) as average_rating,
                       COUNT(DISTINCT br.id) as review_count
                FROM businesses b
                LEFT JOIN users u ON b.owner_id = u.id
                LEFT JOIN business_interviews bi ON b.id = bi.business_id
                LEFT JOIN interviews i ON bi.interview_id = i.id
                LEFT JOIN comments c ON c.entity_type = 'business' AND c.entity_id = b.id
                LEFT JOIN business_reviews br ON b.id = br.business_id
                WHERE b.slug = ?
                GROUP BY b.id";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$slug]);
        
        $business = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($business) {
            $business = self::formatBusiness($business);
        }
        
        return $business;
    }

    public static function update($id, $data)
    {
        $pdo = self::getConnection();
        
        $fields = [];
        $values = [];
        
        $allowedFields = ['name', 'industry', 'description', 'location', 'website_url', 'logo_url', 'phone', 'email', 'hours', 'verified'];
        
        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field = ?";
                if ($field === 'hours' && is_array($data[$field])) {
                    $values[] = json_encode($data[$field]);
                } else {
                    $values[] = $data[$field];
                }
            }
        }
        
        if (empty($fields)) {
            return false;
        }
        
        $fields[] = "updated_at = NOW()";
        $values[] = $id;
        
        $sql = "UPDATE businesses SET " . implode(', ', $fields) . " WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute($values);
        
        if ($result) {
            // Update search index
            self::indexForSearch($id);
        }
        
        return $result;
    }

    public static function delete($id)
    {
        $pdo = self::getConnection();
        
        // Delete related data first
        $pdo->prepare("DELETE FROM business_interviews WHERE business_id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM business_reviews WHERE business_id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM comments WHERE entity_type = 'business' AND entity_id = ?")->execute([$id]);
        
        // Delete the business
        $stmt = $pdo->prepare("DELETE FROM businesses WHERE id = ?");
        $result = $stmt->execute([$id]);
        
        if ($result) {
            // Remove from search index
            self::removeFromSearchIndex($id);
        }
        
        return $result;
    }

    public static function getAll($filters = [], $page = 1, $limit = 20, $sort = 'created_at')
    {
        $pdo = self::getConnection();
        $offset = ($page - 1) * $limit;
        
        $conditions = ['1=1'];
        $params = [];
        
        // Apply filters
        if (!empty($filters['industry'])) {
            $conditions[] = 'b.industry = ?';
            $params[] = $filters['industry'];
        }
        
        if (!empty($filters['location'])) {
            $conditions[] = 'b.location LIKE ?';
            $params[] = '%' . $filters['location'] . '%';
        }
        
        if (!empty($filters['verified'])) {
            $conditions[] = 'b.verified = ?';
            $params[] = $filters['verified'];
        }
        
        if (!empty($filters['search'])) {
            $conditions[] = '(b.name LIKE ? OR b.description LIKE ?)';
            $params[] = '%' . $filters['search'] . '%';
            $params[] = '%' . $filters['search'] . '%';
        }
        
        // Build sort clause
        $sortOptions = [
            'created_at' => 'b.created_at DESC',
            'name' => 'b.name ASC',
            'rating' => 'average_rating DESC',
            'popular' => 'interview_count DESC'
        ];
        
        $orderBy = $sortOptions[$sort] ?? $sortOptions['created_at'];
        
        // Count total
        $countSql = "SELECT COUNT(DISTINCT b.id) 
                     FROM businesses b 
                     WHERE " . implode(' AND ', $conditions);
        
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($params);
        $total = $countStmt->fetchColumn();
        
        // Get businesses
        $sql = "SELECT b.*, u.username as owner_username, u.avatar_url as owner_avatar,
                       COUNT(DISTINCT i.id) as interview_count,
                       COUNT(DISTINCT c.id) as comment_count,
                       AVG(br.rating) as average_rating,
                       COUNT(DISTINCT br.id) as review_count
                FROM businesses b
                LEFT JOIN users u ON b.owner_id = u.id
                LEFT JOIN business_interviews bi ON b.id = bi.business_id
                LEFT JOIN interviews i ON bi.interview_id = i.id
                LEFT JOIN comments c ON c.entity_type = 'business' AND c.entity_id = b.id
                LEFT JOIN business_reviews br ON b.id = br.business_id
                WHERE " . implode(' AND ', $conditions) . "
                GROUP BY b.id
                ORDER BY $orderBy
                LIMIT ? OFFSET ?";
        
        $params[] = $limit;
        $params[] = $offset;
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        $businesses = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($businesses as &$business) {
            $business = self::formatBusiness($business);
        }
        
        return [
            'businesses' => $businesses,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'pages' => ceil($total / $limit)
        ];
    }

    public static function getByOwner($ownerId, $page = 1, $limit = 20)
    {
        return self::getAll(['owner_id' => $ownerId], $page, $limit);
    }

    public static function search($query, $filters = [], $page = 1, $limit = 20)
    {
        $pdo = self::getConnection();
        $offset = ($page - 1) * $limit;
        
        $conditions = ['MATCH(b.name, b.description) AGAINST(? IN NATURAL LANGUAGE MODE)'];
        $params = [$query];
        
        // Apply additional filters
        if (!empty($filters['industry'])) {
            $conditions[] = 'b.industry = ?';
            $params[] = $filters['industry'];
        }
        
        if (!empty($filters['location'])) {
            $conditions[] = 'b.location LIKE ?';
            $params[] = '%' . $filters['location'] . '%';
        }
        
        // Count total
        $countSql = "SELECT COUNT(DISTINCT b.id) 
                     FROM businesses b 
                     WHERE " . implode(' AND ', $conditions);
        
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($params);
        $total = $countStmt->fetchColumn();
        
        // Get businesses with relevance score
        $sql = "SELECT b.*, u.username as owner_username, u.avatar_url as owner_avatar,
                       COUNT(DISTINCT i.id) as interview_count,
                       COUNT(DISTINCT c.id) as comment_count,
                       AVG(br.rating) as average_rating,
                       COUNT(DISTINCT br.id) as review_count,
                       MATCH(b.name, b.description) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance_score
                FROM businesses b
                LEFT JOIN users u ON b.owner_id = u.id
                LEFT JOIN business_interviews bi ON b.id = bi.business_id
                LEFT JOIN interviews i ON bi.interview_id = i.id
                LEFT JOIN comments c ON c.entity_type = 'business' AND c.entity_id = b.id
                LEFT JOIN business_reviews br ON b.id = br.business_id
                WHERE " . implode(' AND ', $conditions) . "
                GROUP BY b.id
                ORDER BY relevance_score DESC, average_rating DESC
                LIMIT ? OFFSET ?";
        
        $searchParams = [$query, ...$params, $limit, $offset];
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($searchParams);
        
        $businesses = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($businesses as &$business) {
            $business = self::formatBusiness($business);
        }
        
        return [
            'businesses' => $businesses,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'pages' => ceil($total / $limit),
            'query' => $query
        ];
    }

    public static function getInterviews($businessId, $page = 1, $limit = 10)
    {
        $pdo = self::getConnection();
        $offset = ($page - 1) * $limit;
        
        $sql = "SELECT i.*, u.username, u.avatar_url,
                       COUNT(DISTINCT l.id) as like_count,
                       COUNT(DISTINCT c.id) as comment_count
                FROM business_interviews bi
                JOIN interviews i ON bi.interview_id = i.id
                JOIN users u ON i.user_id = u.id
                LEFT JOIN likes l ON l.entity_type = 'interview' AND l.entity_id = i.id
                LEFT JOIN comments c ON c.entity_type = 'interview' AND c.entity_id = i.id
                WHERE bi.business_id = ? AND i.status = 'published'
                GROUP BY i.id
                ORDER BY i.created_at DESC
                LIMIT ? OFFSET ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$businessId, $limit, $offset]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public static function linkInterview($businessId, $interviewId)
    {
        $pdo = self::getConnection();
        
        $sql = "INSERT IGNORE INTO business_interviews (business_id, interview_id, created_at) 
                VALUES (?, ?, NOW())";
        
        $stmt = $pdo->prepare($sql);
        return $stmt->execute([$businessId, $interviewId]);
    }

    public static function unlinkInterview($businessId, $interviewId)
    {
        $pdo = self::getConnection();
        
        $sql = "DELETE FROM business_interviews WHERE business_id = ? AND interview_id = ?";
        
        $stmt = $pdo->prepare($sql);
        return $stmt->execute([$businessId, $interviewId]);
    }

    public static function getIndustries()
    {
        $pdo = self::getConnection();
        
        $sql = "SELECT industry, COUNT(*) as count 
                FROM businesses 
                GROUP BY industry 
                ORDER BY count DESC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public static function getPopular($limit = 10)
    {
        $pdo = self::getConnection();
        
        $sql = "SELECT b.*, u.username as owner_username, u.avatar_url as owner_avatar,
                       COUNT(DISTINCT i.id) as interview_count,
                       COUNT(DISTINCT c.id) as comment_count,
                       AVG(br.rating) as average_rating,
                       COUNT(DISTINCT br.id) as review_count
                FROM businesses b
                LEFT JOIN users u ON b.owner_id = u.id
                LEFT JOIN business_interviews bi ON b.id = bi.business_id
                LEFT JOIN interviews i ON bi.interview_id = i.id
                LEFT JOIN comments c ON c.entity_type = 'business' AND c.entity_id = b.id
                LEFT JOIN business_reviews br ON b.id = br.business_id
                GROUP BY b.id
                ORDER BY interview_count DESC, average_rating DESC
                LIMIT ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$limit]);
        
        $businesses = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($businesses as &$business) {
            $business = self::formatBusiness($business);
        }
        
        return $businesses;
    }

    private static function formatBusiness($business)
    {
        if (!$business) return null;
        
        // Parse JSON fields
        if ($business['hours']) {
            $business['hours'] = json_decode($business['hours'], true);
        }
        
        // Format numbers
        $business['interview_count'] = (int) $business['interview_count'];
        $business['comment_count'] = (int) $business['comment_count'];
        $business['review_count'] = (int) $business['review_count'];
        $business['average_rating'] = $business['average_rating'] ? round((float) $business['average_rating'], 1) : null;
        
        // Add computed fields
        $business['slug'] = self::generateSlug($business['name'], $business['id']);
        $business['url'] = "/business/{$business['slug']}";
        
        return $business;
    }

    private static function generateSlug($name, $id)
    {
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $name)));
        return $slug . '-' . $id;
    }

    private static function indexForSearch($businessId)
    {
        // This would integrate with the search indexing system
        // For now, we'll just ensure the business is searchable
        return true;
    }

    private static function removeFromSearchIndex($businessId)
    {
        // This would remove from the search index
        return true;
    }
}
