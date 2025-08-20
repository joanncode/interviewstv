<?php

namespace App\Models;

use PDO;

class Notification
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

        $sql = "INSERT INTO notifications (user_id, type, title, message, data, entity_type, entity_id,
                                         action_url, priority, expires_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['user_id'],
            $data['type'],
            $data['title'],
            $data['message'],
            isset($data['data']) ? json_encode($data['data']) : null,
            $data['entity_type'] ?? null,
            $data['entity_id'] ?? null,
            $data['action_url'] ?? null,
            $data['priority'] ?? 'normal',
            $data['expires_at'] ?? null
        ]);

        $notificationId = $pdo->lastInsertId();

        // Schedule delivery based on user preferences
        self::scheduleDelivery($notificationId);

        return self::findById($notificationId);
    }

    public static function createFromTemplate($templateType, $userId, $variables = [])
    {
        $template = self::getTemplate($templateType);

        if (!$template) {
            throw new \Exception("Notification template '{$templateType}' not found");
        }

        // Replace variables in templates
        $title = self::replaceVariables($template['title_template'], $variables);
        $message = self::replaceVariables($template['message_template'], $variables);
        $actionUrl = isset($variables['action_url']) ? $variables['action_url'] : null;

        $notificationData = [
            'user_id' => $userId,
            'type' => $templateType,
            'title' => $title,
            'message' => $message,
            'data' => $variables,
            'entity_type' => $variables['entity_type'] ?? null,
            'entity_id' => $variables['entity_id'] ?? null,
            'action_url' => $actionUrl,
            'priority' => $variables['priority'] ?? 'normal'
        ];

        return self::create($notificationData);
    }
    
    public static function findById($id)
    {
        $pdo = self::getConnection();
        
        $sql = "SELECT * FROM notifications WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);
        
        $notification = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($notification && $notification['data']) {
            $notification['data'] = json_decode($notification['data'], true);
        }
        
        return $notification;
    }
    
    public static function getUserNotifications($userId, $page = 1, $limit = 20, $unreadOnly = false)
    {
        $pdo = self::getConnection();
        $offset = ($page - 1) * $limit;
        
        $whereClause = "WHERE user_id = ?";
        $params = [$userId];
        
        if ($unreadOnly) {
            $whereClause .= " AND read_at IS NULL";
        }
        
        // Get total count
        $countSql = "SELECT COUNT(*) FROM notifications {$whereClause}";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($params);
        $total = $countStmt->fetchColumn();
        
        // Get notifications
        $sql = "SELECT * FROM notifications 
                {$whereClause}
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?";
        
        $params[] = $limit;
        $params[] = $offset;
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Decode JSON data
        foreach ($notifications as &$notification) {
            if ($notification['data']) {
                $notification['data'] = json_decode($notification['data'], true);
            }
        }
        
        return [
            'notifications' => $notifications,
            'total' => (int) $total
        ];
    }
    
    public static function markAsRead($notificationId, $userId = null)
    {
        $pdo = self::getConnection();
        
        $sql = "UPDATE notifications SET read_at = NOW() WHERE id = ?";
        $params = [$notificationId];
        
        if ($userId) {
            $sql .= " AND user_id = ?";
            $params[] = $userId;
        }
        
        $stmt = $pdo->prepare($sql);
        return $stmt->execute($params);
    }
    
    public static function markAllAsRead($userId)
    {
        $pdo = self::getConnection();
        
        $sql = "UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL";
        $stmt = $pdo->prepare($sql);
        
        return $stmt->execute([$userId]);
    }
    
    public static function getUnreadCount($userId)
    {
        $pdo = self::getConnection();
        
        $sql = "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND read_at IS NULL";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId]);
        
        return (int) $stmt->fetchColumn();
    }
    
    public static function delete($id, $userId = null)
    {
        $pdo = self::getConnection();
        
        $sql = "DELETE FROM notifications WHERE id = ?";
        $params = [$id];
        
        if ($userId) {
            $sql .= " AND user_id = ?";
            $params[] = $userId;
        }
        
        $stmt = $pdo->prepare($sql);
        return $stmt->execute($params);
    }
    
    public static function createFollowNotification($followerId, $followedId)
    {
        // Check if user wants follow notifications
        if (!self::isNotificationEnabled($followedId, 'follow')) {
            return null;
        }
        
        $follower = User::findById($followerId);
        if (!$follower) {
            return null;
        }
        
        return self::create([
            'user_id' => $followedId,
            'type' => 'follow',
            'title' => 'New Follower',
            'message' => "{$follower['username']} started following you",
            'data' => [
                'actor_id' => $followerId,
                'actor_username' => $follower['username'],
                'actor_avatar' => $follower['avatar_url'],
                'action' => 'follow'
            ]
        ]);
    }
    
    public static function createUnfollowNotification($followerId, $followedId)
    {
        // Check if user wants unfollow notifications (usually disabled by default)
        if (!self::isNotificationEnabled($followedId, 'unfollow')) {
            return null;
        }
        
        $follower = User::findById($followerId);
        if (!$follower) {
            return null;
        }
        
        return self::create([
            'user_id' => $followedId,
            'type' => 'unfollow',
            'title' => 'Follower Update',
            'message' => "{$follower['username']} unfollowed you",
            'data' => [
                'actor_id' => $followerId,
                'actor_username' => $follower['username'],
                'actor_avatar' => $follower['avatar_url'],
                'action' => 'unfollow'
            ]
        ]);
    }
    
    public static function isNotificationEnabled($userId, $type)
    {
        $pdo = self::getConnection();
        
        $sql = "SELECT enabled FROM notification_preferences WHERE user_id = ? AND type = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId, $type]);
        
        $result = $stmt->fetchColumn();
        
        // Default to enabled if no preference set
        return $result !== false ? (bool) $result : true;
    }
    
    public static function getUserPreferences($userId)
    {
        $pdo = self::getConnection();
        
        $sql = "SELECT type, enabled, email_enabled, push_enabled 
                FROM notification_preferences 
                WHERE user_id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId]);
        
        $preferences = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $preferences[$row['type']] = [
                'enabled' => (bool) $row['enabled'],
                'email_enabled' => (bool) $row['email_enabled'],
                'push_enabled' => (bool) $row['push_enabled']
            ];
        }
        
        return $preferences;
    }
    
    public static function updateUserPreferences($userId, $preferences)
    {
        $pdo = self::getConnection();
        
        foreach ($preferences as $type => $settings) {
            $sql = "INSERT INTO notification_preferences (user_id, type, enabled, email_enabled, push_enabled) 
                    VALUES (?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    enabled = VALUES(enabled),
                    email_enabled = VALUES(email_enabled),
                    push_enabled = VALUES(push_enabled),
                    updated_at = NOW()";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $userId,
                $type,
                $settings['enabled'] ?? true,
                $settings['email_enabled'] ?? false,
                $settings['push_enabled'] ?? true
            ]);
        }
        
        return true;
    }

    public static function scheduleDelivery($notificationId)
    {
        $notification = self::findById($notificationId);
        if (!$notification) return false;

        $preferences = self::getUserPreferencesForType($notification['user_id'], $notification['type']);

        // Schedule in-app notification (always immediate)
        if ($preferences['in_app_enabled']) {
            self::createDelivery($notificationId, 'in_app', null, 'sent');
        }

        // Schedule email notification
        if ($preferences['email_enabled']) {
            $delay = self::getDeliveryDelay($preferences['frequency']);
            self::createDelivery($notificationId, 'email', null, 'pending', $delay);
        }

        // Schedule push notification
        if ($preferences['push_enabled']) {
            self::createDelivery($notificationId, 'push', null, 'pending');
        }

        return true;
    }

    public static function createDelivery($notificationId, $channelType, $channelAddress = null, $status = 'pending', $delay = 0)
    {
        $pdo = self::getConnection();

        $nextRetryAt = $delay > 0 ? date('Y-m-d H:i:s', time() + $delay) : null;

        $sql = "INSERT INTO notification_deliveries
                (notification_id, channel_type, channel_address, status, next_retry_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, NOW(), NOW())";

        $stmt = $pdo->prepare($sql);
        return $stmt->execute([$notificationId, $channelType, $channelAddress, $status, $nextRetryAt]);
    }

    public static function getUserPreferencesForType($userId, $notificationType)
    {
        $pdo = self::getConnection();

        $sql = "SELECT * FROM notification_preferences
                WHERE user_id = ? AND notification_type = ?";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId, $notificationType]);

        $preferences = $stmt->fetch(PDO::FETCH_ASSOC);

        // Return defaults if no preferences found
        if (!$preferences) {
            return [
                'in_app_enabled' => true,
                'email_enabled' => true,
                'push_enabled' => true,
                'frequency' => 'immediate'
            ];
        }

        return $preferences;
    }

    public static function getTemplate($type)
    {
        $pdo = self::getConnection();

        $sql = "SELECT * FROM notification_templates WHERE type = ? AND is_active = TRUE";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$type]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    private static function formatNotification($notification)
    {
        if (!$notification) return null;

        // Parse JSON fields
        if ($notification['data']) {
            $notification['data'] = json_decode($notification['data'], true);
        }

        // Add computed fields
        $notification['time_ago'] = self::timeAgo($notification['created_at']);
        $notification['is_recent'] = strtotime($notification['created_at']) > (time() - 3600); // Within last hour

        return $notification;
    }

    private static function replaceVariables($template, $variables)
    {
        foreach ($variables as $key => $value) {
            $template = str_replace("{{$key}}", $value, $template);
        }

        return $template;
    }

    private static function getDeliveryDelay($frequency)
    {
        switch ($frequency) {
            case 'immediate':
                return 0;
            case 'hourly':
                return 3600; // 1 hour
            case 'daily':
                return 86400; // 24 hours
            case 'weekly':
                return 604800; // 7 days
            default:
                return 0;
        }
    }

    private static function timeAgo($datetime)
    {
        $time = time() - strtotime($datetime);

        if ($time < 60) return 'just now';
        if ($time < 3600) return floor($time / 60) . 'm ago';
        if ($time < 86400) return floor($time / 3600) . 'h ago';
        if ($time < 2592000) return floor($time / 86400) . 'd ago';
        if ($time < 31536000) return floor($time / 2592000) . 'mo ago';

        return floor($time / 31536000) . 'y ago';
    }
}
