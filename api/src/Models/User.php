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
        
        $sql = "INSERT INTO users (username, email, password, bio, avatar_url, role, verified, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['username'],
            $data['email'],
            $data['password'],
            $data['bio'] ?? null,
            $data['avatar_url'] ?? null,
            $data['role'] ?? 'user',
            $data['verified'] ?? false
        ]);
        
        $userId = $pdo->lastInsertId();
        return self::findById($userId);
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
        
        $allowedFields = ['username', 'email', 'password', 'bio', 'avatar_url', 'role', 'verified'];
        
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
    
    public static function getAll($page = 1, $limit = 20, $search = null)
    {
        $pdo = self::getConnection();
        $offset = ($page - 1) * $limit;
        
        $whereClause = '';
        $params = [];
        
        if ($search) {
            $whereClause = "WHERE username LIKE ? OR email LIKE ? OR bio LIKE ?";
            $searchTerm = "%{$search}%";
            $params = [$searchTerm, $searchTerm, $searchTerm];
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
}
