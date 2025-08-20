-- Migration: Create notifications table
-- Date: 2025-08-20
-- Description: Create comprehensive notification system for user activities

-- Notifications table: Stores all user notifications
CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL COMMENT 'User receiving the notification',
    type ENUM('follow', 'unfollow', 'like', 'comment', 'interview_published', 'mention', 'system') NOT NULL COMMENT 'Type of notification',
    title VARCHAR(255) NOT NULL COMMENT 'Notification title',
    message TEXT NOT NULL COMMENT 'Notification message',
    data JSON COMMENT 'Additional notification data (actor_id, entity_id, etc.)',
    read_at TIMESTAMP NULL COMMENT 'When notification was read',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_read_at (read_at),
    INDEX idx_created_at (created_at),
    INDEX idx_user_unread (user_id, read_at) -- Optimized for unread notifications query
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Notification preferences table: User notification settings
CREATE TABLE notification_preferences (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL COMMENT 'User ID',
    type ENUM('follow', 'unfollow', 'like', 'comment', 'interview_published', 'mention', 'system') NOT NULL COMMENT 'Notification type',
    enabled BOOLEAN DEFAULT TRUE COMMENT 'Whether this notification type is enabled',
    email_enabled BOOLEAN DEFAULT FALSE COMMENT 'Whether to send email notifications',
    push_enabled BOOLEAN DEFAULT TRUE COMMENT 'Whether to send push notifications',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_type (user_id, type),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insert default notification preferences for existing users
INSERT INTO notification_preferences (user_id, type, enabled, email_enabled, push_enabled)
SELECT u.id, 'follow', TRUE, FALSE, TRUE FROM users u
UNION ALL
SELECT u.id, 'unfollow', FALSE, FALSE, FALSE FROM users u
UNION ALL
SELECT u.id, 'like', TRUE, FALSE, TRUE FROM users u
UNION ALL
SELECT u.id, 'comment', TRUE, TRUE, TRUE FROM users u
UNION ALL
SELECT u.id, 'interview_published', TRUE, TRUE, TRUE FROM users u
UNION ALL
SELECT u.id, 'mention', TRUE, TRUE, TRUE FROM users u
UNION ALL
SELECT u.id, 'system', TRUE, TRUE, TRUE FROM users u;
