<?php

namespace App\Models;

use PDO;

class Comment
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
        
        $sql = "INSERT INTO comments (
            user_id, commentable_type, commentable_id, parent_id, content, 
            status, ip_address, user_agent, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['user_id'],
            $data['commentable_type'],
            $data['commentable_id'],
            $data['parent_id'] ?? null,
            $data['content'],
            $data['status'] ?? 'published',
            $data['ip_address'] ?? null,
            $data['user_agent'] ?? null
        ]);
        
        $commentId = $pdo->lastInsertId();
        
        // Update reply count for parent comment
        if (!empty($data['parent_id'])) {
            self::updateReplyCount($data['parent_id']);
        }
        
        // Update comment count for the commentable entity
        self::updateCommentableCount($data['commentable_type'], $data['commentable_id']);
        
        return self::findById($commentId);
    }
    
    public static function findById($id)
    {
        $pdo = self::getConnection();
        
        $sql = "SELECT c.*, 
                       u.username, u.avatar_url, u.role as user_role
                FROM comments c
                LEFT JOIN users u ON c.user_id = u.id
                WHERE c.id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);
        
        $comment = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($comment) {
            return self::formatComment($comment);
        }
        
        return null;
    }
    
    public static function getForEntity($commentableType, $commentableId, $page = 1, $limit = 20, $sort = 'newest')
    {
        $pdo = self::getConnection();
        $offset = ($page - 1) * $limit;
        
        // Determine sort order
        $orderBy = 'ORDER BY c.created_at DESC';
        switch ($sort) {
            case 'oldest':
                $orderBy = 'ORDER BY c.created_at ASC';
                break;
            case 'popular':
                $orderBy = 'ORDER BY c.like_count DESC, c.created_at DESC';
                break;
            case 'newest':
            default:
                $orderBy = 'ORDER BY c.is_pinned DESC, c.created_at DESC';
                break;
        }
        
        // Get total count (only top-level comments)
        $countSql = "SELECT COUNT(*) FROM comments c 
                     WHERE c.commentable_type = ? AND c.commentable_id = ? 
                     AND c.parent_id IS NULL AND c.status = 'published'";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute([$commentableType, $commentableId]);
        $total = $countStmt->fetchColumn();
        
        // Get top-level comments
        $sql = "SELECT c.*, 
                       u.username, u.avatar_url, u.role as user_role
                FROM comments c
                LEFT JOIN users u ON c.user_id = u.id
                WHERE c.commentable_type = ? AND c.commentable_id = ? 
                AND c.parent_id IS NULL AND c.status = 'published'
                {$orderBy}
                LIMIT ? OFFSET ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$commentableType, $commentableId, $limit, $offset]);
        $comments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format comments and load replies
        $formattedComments = [];
        foreach ($comments as $comment) {
            $formattedComment = self::formatComment($comment);
            $formattedComment['replies'] = self::getReplies($comment['id']);
            $formattedComments[] = $formattedComment;
        }
        
        return [
            'comments' => $formattedComments,
            'total' => $total
        ];
    }
    
    public static function getReplies($parentId, $limit = 10)
    {
        $pdo = self::getConnection();
        
        $sql = "SELECT c.*, 
                       u.username, u.avatar_url, u.role as user_role
                FROM comments c
                LEFT JOIN users u ON c.user_id = u.id
                WHERE c.parent_id = ? AND c.status = 'published'
                ORDER BY c.created_at ASC
                LIMIT ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$parentId, $limit]);
        $replies = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return array_map([self::class, 'formatComment'], $replies);
    }
    
    public static function update($id, $data)
    {
        $pdo = self::getConnection();
        
        $fields = [];
        $values = [];
        
        $allowedFields = ['content', 'status', 'is_pinned'];
        
        foreach ($data as $key => $value) {
            if (in_array($key, $allowedFields)) {
                $fields[] = "{$key} = ?";
                $values[] = $value;
            }
        }
        
        if (empty($fields)) {
            throw new \Exception('No valid fields to update');
        }
        
        // Mark as edited if content changed
        if (isset($data['content'])) {
            $fields[] = "is_edited = TRUE";
            $fields[] = "edited_at = NOW()";
        }
        
        $fields[] = "updated_at = NOW()";
        $values[] = $id;
        
        $sql = "UPDATE comments SET " . implode(', ', $fields) . " WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
        
        return self::findById($id);
    }
    
    public static function delete($id)
    {
        $pdo = self::getConnection();
        
        // Get comment info before deletion
        $comment = self::findById($id);
        if (!$comment) {
            return false;
        }
        
        $sql = "DELETE FROM comments WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute([$id]);
        
        if ($result) {
            // Update reply count for parent if this was a reply
            if ($comment['parent_id']) {
                self::updateReplyCount($comment['parent_id']);
            }
            
            // Update comment count for the commentable entity
            self::updateCommentableCount($comment['commentable_type'], $comment['commentable_id']);
        }
        
        return $result;
    }
    
    public static function updateLikeCount($id)
    {
        $pdo = self::getConnection();
        
        // Count likes for this comment
        $countSql = "SELECT COUNT(*) FROM likes WHERE likeable_type = 'comment' AND likeable_id = ?";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute([$id]);
        $likeCount = $countStmt->fetchColumn();
        
        // Update comment like count
        $updateSql = "UPDATE comments SET like_count = ? WHERE id = ?";
        $updateStmt = $pdo->prepare($updateSql);
        
        return $updateStmt->execute([$likeCount, $id]);
    }
    
    public static function updateReplyCount($parentId)
    {
        $pdo = self::getConnection();
        
        // Count replies for this comment
        $countSql = "SELECT COUNT(*) FROM comments WHERE parent_id = ? AND status = 'published'";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute([$parentId]);
        $replyCount = $countStmt->fetchColumn();
        
        // Update parent comment reply count
        $updateSql = "UPDATE comments SET reply_count = ? WHERE id = ?";
        $updateStmt = $pdo->prepare($updateSql);
        
        return $updateStmt->execute([$replyCount, $parentId]);
    }
    
    public static function updateCommentableCount($type, $id)
    {
        $pdo = self::getConnection();
        
        // Count comments for this entity
        $countSql = "SELECT COUNT(*) FROM comments WHERE commentable_type = ? AND commentable_id = ? AND status = 'published'";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute([$type, $id]);
        $commentCount = $countStmt->fetchColumn();
        
        // Update the commentable entity's comment count
        $table = $type === 'interview' ? 'interviews' : ($type === 'gallery' ? 'galleries' : null);
        
        if ($table) {
            $updateSql = "UPDATE {$table} SET comment_count = ? WHERE id = ?";
            $updateStmt = $pdo->prepare($updateSql);
            return $updateStmt->execute([$commentCount, $id]);
        }
        
        return false;
    }
    
    public static function reportComment($commentId, $reporterId, $reason, $description = null)
    {
        $pdo = self::getConnection();
        
        $sql = "INSERT INTO comment_reports (
            comment_id, reporter_id, reason, description, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NOW(), NOW())";
        
        $stmt = $pdo->prepare($sql);
        
        try {
            $stmt->execute([$commentId, $reporterId, $reason, $description]);
            return $pdo->lastInsertId();
        } catch (\PDOException $e) {
            // Handle duplicate report (user already reported this comment)
            if ($e->getCode() == 23000) {
                throw new \Exception('You have already reported this comment');
            }
            throw $e;
        }
    }
    
    public static function getReports($page = 1, $limit = 20, $status = null)
    {
        $pdo = self::getConnection();
        $offset = ($page - 1) * $limit;
        
        $whereClause = '';
        $params = [];
        
        if ($status) {
            $whereClause = 'WHERE cr.status = ?';
            $params[] = $status;
        }
        
        // Get total count
        $countSql = "SELECT COUNT(*) FROM comment_reports cr {$whereClause}";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($params);
        $total = $countStmt->fetchColumn();
        
        // Get reports
        $sql = "SELECT cr.*, 
                       c.content as comment_content,
                       reporter.username as reporter_username,
                       reviewer.username as reviewer_username
                FROM comment_reports cr
                LEFT JOIN comments c ON cr.comment_id = c.id
                LEFT JOIN users reporter ON cr.reporter_id = reporter.id
                LEFT JOIN users reviewer ON cr.reviewed_by = reviewer.id
                {$whereClause}
                ORDER BY cr.created_at DESC
                LIMIT ? OFFSET ?";
        
        $params[] = $limit;
        $params[] = $offset;
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'reports' => $reports,
            'total' => $total
        ];
    }
    
    protected static function formatComment($comment)
    {
        if (!$comment) return null;
        
        // Format user info
        $comment['user'] = [
            'id' => $comment['user_id'],
            'username' => $comment['username'],
            'avatar_url' => $comment['avatar_url'],
            'role' => $comment['user_role']
        ];
        
        // Remove redundant fields
        unset($comment['username'], $comment['avatar_url'], $comment['user_role']);
        
        // Format timestamps
        $comment['created_at_formatted'] = self::formatTimeAgo($comment['created_at']);
        if ($comment['edited_at']) {
            $comment['edited_at_formatted'] = self::formatTimeAgo($comment['edited_at']);
        }
        
        return $comment;
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
