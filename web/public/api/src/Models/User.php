<?php

namespace App\Models;

use PDO;

class User
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

        $sql = "INSERT INTO users (name, email, password_hash, bio, avatar_url, role, email_verified,
                location, website, phone, company, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['name'] ?? $data['username'] ?? 'User',
            $data['email'],
            $data['password'],
            $data['bio'] ?? null,
            $data['avatar_url'] ?? null,
            $data['role'] ?? 'user',
            $data['verified'] ?? false,
            $data['location'] ?? null,
            $data['website'] ?? null,
            $data['phone'] ?? null,
            $data['company'] ?? null
        ]);

        $userId = $pdo->lastInsertId();
        return self::findByIdStatic($userId);
    }
    
    public static function findById($id)
    {
        $pdo = self::getConnection();
        
        $sql = "SELECT * FROM users WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public static function findByUsername($username)
    {
        $pdo = self::getConnection();
        
        $sql = "SELECT * FROM users WHERE username = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$username]);
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public static function findByEmail($email)
    {
        $pdo = self::getConnection();
        
        $sql = "SELECT * FROM users WHERE email = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$email]);
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public static function update($id, $data)
    {
        $pdo = self::getConnection();
        
        $fields = [];
        $values = [];
        
        $allowedFields = ['name', 'email', 'password_hash', 'bio', 'avatar_url', 'hero_banner_url', 'role', 'email_verified',
                         'location', 'website', 'phone', 'company', 'is_active'];
        
        foreach ($data as $key => $value) {
            if (in_array($key, $allowedFields)) {
                $fields[] = "{$key} = ?";
                $values[] = $value;
            }
        }
        
        if (empty($fields)) {
            throw new \Exception('No valid fields to update');
        }
        
        $fields[] = "updated_at = NOW()";
        $values[] = $id;
        
        $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
        
        return self::findById($id);
    }
    
    public static function delete($id)
    {
        $pdo = self::getConnection();
        
        $sql = "DELETE FROM users WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        
        return $stmt->execute([$id]);
    }
    
    public static function getAll($page = 1, $limit = 20, $search = null, $role = null)
    {
        $pdo = self::getConnection();
        $offset = ($page - 1) * $limit;

        $whereConditions = [];
        $params = [];

        if ($search) {
            $whereConditions[] = "(username LIKE ? OR email LIKE ? OR bio LIKE ?)";
            $searchTerm = "%{$search}%";
            $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm]);
        }

        if ($role) {
            $whereConditions[] = "role = ?";
            $params[] = $role;
        }

        $whereClause = '';
        if (!empty($whereConditions)) {
            $whereClause = "WHERE " . implode(' AND ', $whereConditions);
        }

        // Get total count
        $countSql = "SELECT COUNT(*) FROM users {$whereClause}";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($params);
        $total = $countStmt->fetchColumn();

        // Get users
        $sql = "SELECT * FROM users {$whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?";
        $params[] = $limit;
        $params[] = $offset;

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'users' => array_map([self::class, 'sanitize'], $users),
            'total' => $total
        ];
    }
    
    public static function getFollowers($userId, $page = 1, $limit = 20)
    {
        $pdo = self::getConnection();
        $offset = ($page - 1) * $limit;
        
        // Get total count
        $countSql = "SELECT COUNT(*) FROM followers WHERE followed_id = ?";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute([$userId]);
        $total = $countStmt->fetchColumn();
        
        // Get followers
        $sql = "SELECT u.* FROM users u 
                JOIN followers f ON u.id = f.follower_id 
                WHERE f.followed_id = ? 
                ORDER BY f.created_at DESC 
                LIMIT ? OFFSET ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId, $limit, $offset]);
        $followers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'followers' => array_map([self::class, 'sanitize'], $followers),
            'total' => $total
        ];
    }
    
    public static function getFollowing($userId, $page = 1, $limit = 20)
    {
        $pdo = self::getConnection();
        $offset = ($page - 1) * $limit;
        
        // Get total count
        $countSql = "SELECT COUNT(*) FROM followers WHERE follower_id = ?";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute([$userId]);
        $total = $countStmt->fetchColumn();
        
        // Get following
        $sql = "SELECT u.* FROM users u 
                JOIN followers f ON u.id = f.followed_id 
                WHERE f.follower_id = ? 
                ORDER BY f.created_at DESC 
                LIMIT ? OFFSET ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId, $limit, $offset]);
        $following = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'following' => array_map([self::class, 'sanitize'], $following),
            'total' => $total
        ];
    }
    
    public static function follow($followerId, $followedId)
    {
        if ($followerId == $followedId) {
            throw new \Exception('Cannot follow yourself');
        }
        
        $pdo = self::getConnection();
        
        // Check if already following
        $checkSql = "SELECT COUNT(*) FROM followers WHERE follower_id = ? AND followed_id = ?";
        $checkStmt = $pdo->prepare($checkSql);
        $checkStmt->execute([$followerId, $followedId]);
        
        if ($checkStmt->fetchColumn() > 0) {
            throw new \Exception('Already following this user');
        }
        
        $sql = "INSERT INTO followers (follower_id, followed_id, created_at) VALUES (?, ?, NOW())";
        $stmt = $pdo->prepare($sql);
        
        return $stmt->execute([$followerId, $followedId]);
    }
    
    public static function unfollow($followerId, $followedId)
    {
        $pdo = self::getConnection();
        
        $sql = "DELETE FROM followers WHERE follower_id = ? AND followed_id = ?";
        $stmt = $pdo->prepare($sql);
        
        return $stmt->execute([$followerId, $followedId]);
    }
    
    public static function isFollowing($followerId, $followedId)
    {
        $pdo = self::getConnection();
        
        $sql = "SELECT COUNT(*) FROM followers WHERE follower_id = ? AND followed_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$followerId, $followedId]);
        
        return $stmt->fetchColumn() > 0;
    }
    
    public static function sanitize($user)
    {
        if (!$user) return null;
        
        // Remove sensitive fields
        unset($user['password']);
        
        // Add computed fields
        $user['follower_count'] = self::getFollowerCount($user['id']);
        $user['following_count'] = self::getFollowingCount($user['id']);
        
        return $user;
    }
    
    public static function getFollowerCount($userId)
    {
        $pdo = self::getConnection();
        
        $sql = "SELECT COUNT(*) FROM followers WHERE followed_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId]);
        
        return (int) $stmt->fetchColumn();
    }
    
    public static function getFollowingCount($userId)
    {
        $pdo = self::getConnection();

        $sql = "SELECT COUNT(*) FROM followers WHERE follower_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId]);

        return (int) $stmt->fetchColumn();
    }

    public static function getInterviewCount($userId)
    {
        $pdo = self::getConnection();

        $sql = "SELECT COUNT(*) FROM interviews WHERE interviewer_id = ? AND status = 'published'";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId]);

        return (int) $stmt->fetchColumn();
    }

    public static function getTotalViews($userId)
    {
        $pdo = self::getConnection();

        $sql = "SELECT COALESCE(SUM(view_count), 0) FROM interviews WHERE interviewer_id = ? AND status = 'published'";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId]);

        return (int) $stmt->fetchColumn();
    }

    public static function getTotalLikes($userId)
    {
        $pdo = self::getConnection();

        $sql = "SELECT COUNT(*) FROM likes l
                JOIN interviews i ON l.likeable_id = i.id
                WHERE l.likeable_type = 'interview' AND i.interviewer_id = ? AND i.status = 'published'";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId]);

        return (int) $stmt->fetchColumn();
    }

    public static function getProfileStats($userId)
    {
        return [
            'follower_count' => self::getFollowerCount($userId),
            'following_count' => self::getFollowingCount($userId),
            'interview_count' => self::getInterviewCount($userId),
            'total_views' => self::getTotalViews($userId),
            'total_likes' => self::getTotalLikes($userId),
            'join_date' => self::getJoinDate($userId),
            'last_active' => self::getLastActive($userId)
        ];
    }

    public static function getJoinDate($userId)
    {
        $pdo = self::getConnection();

        $sql = "SELECT created_at FROM users WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId]);

        return $stmt->fetchColumn();
    }

    public static function getLastActive($userId)
    {
        $pdo = self::getConnection();

        // Get the most recent activity from interviews, comments, or likes
        $sql = "SELECT MAX(activity_date) as last_active FROM (
                    SELECT MAX(created_at) as activity_date FROM interviews WHERE interviewer_id = ?
                    UNION ALL
                    SELECT MAX(created_at) as activity_date FROM comments WHERE user_id = ?
                    UNION ALL
                    SELECT MAX(created_at) as activity_date FROM likes WHERE user_id = ?
                ) activities";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId, $userId, $userId]);

        return $stmt->fetchColumn();
    }

    public static function canViewProfile($userId, $viewerId = null)
    {
        $user = self::findById($userId);

        if (!$user) {
            return false;
        }

        // Public profiles can be viewed by anyone
        if ($user['profile_visibility'] === 'public') {
            return true;
        }

        // Private profiles require authentication
        if (!$viewerId) {
            return false;
        }

        // User can always view their own profile
        if ($userId == $viewerId) {
            return true;
        }

        // For followers-only visibility, check if viewer is following
        if ($user['profile_visibility'] === 'followers') {
            return self::isFollowing($viewerId, $userId);
        }

        // For private profiles, only the user can view
        return false;
    }

    public static function canViewInterviews($userId, $viewerId = null)
    {
        $user = self::findById($userId);

        if (!$user) {
            return false;
        }

        // Public interviews can be viewed by anyone
        if ($user['interview_visibility'] === 'public') {
            return true;
        }

        // Private interviews require authentication
        if (!$viewerId) {
            return false;
        }

        // User can always view their own interviews
        if ($userId == $viewerId) {
            return true;
        }

        // For followers-only visibility, check if viewer is following
        if ($user['interview_visibility'] === 'followers') {
            return self::isFollowing($viewerId, $userId);
        }

        // For private interviews, only the user can view
        return false;
    }

    public static function canViewActivity($userId, $viewerId = null)
    {
        $user = self::findById($userId);

        if (!$user) {
            return false;
        }

        // Public activity can be viewed by anyone
        if ($user['activity_visibility'] === 'public') {
            return true;
        }

        // Private activity requires authentication
        if (!$viewerId) {
            return false;
        }

        // User can always view their own activity
        if ($userId == $viewerId) {
            return true;
        }

        // For followers-only visibility, check if viewer is following
        if ($user['activity_visibility'] === 'followers') {
            return self::isFollowing($viewerId, $userId);
        }

        // For private activity, only the user can view
        return false;
    }

    public static function getPrivacySettings($userId)
    {
        $user = self::findById($userId);

        if (!$user) {
            return null;
        }

        return [
            'profile_visibility' => $user['profile_visibility'] ?? 'public',
            'interview_visibility' => $user['interview_visibility'] ?? 'public',
            'activity_visibility' => $user['activity_visibility'] ?? 'followers'
        ];
    }

    public static function searchUsers($conditions, $params, $page = 1, $limit = 20)
    {
        $pdo = self::getConnection();
        $offset = ($page - 1) * $limit;

        // Build WHERE clause
        $whereClause = '';
        if (!empty($conditions)) {
            $whereClause = 'WHERE ' . implode(' AND ', $conditions);
        }

        // Get total count
        $countSql = "SELECT COUNT(*) FROM users {$whereClause}";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($params);
        $total = $countStmt->fetchColumn();

        // Get users with additional stats
        $sql = "SELECT u.*,
                       COUNT(DISTINCT f.follower_id) as follower_count,
                       COUNT(DISTINCT i.id) as interview_count
                FROM users u
                LEFT JOIN followers f ON u.id = f.followed_id
                LEFT JOIN interviews i ON u.id = i.interviewer_id AND i.status = 'published'
                {$whereClause}
                GROUP BY u.id
                ORDER BY follower_count DESC, interview_count DESC, u.created_at DESC
                LIMIT ? OFFSET ?";

        $searchParams = array_merge($params, [$limit, $offset]);
        $stmt = $pdo->prepare($sql);
        $stmt->execute($searchParams);

        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Sanitize user data
        $sanitizedUsers = array_map([self::class, 'sanitize'], $users);

        return [
            'users' => $sanitizedUsers,
            'total' => (int) $total
        ];
    }
}
