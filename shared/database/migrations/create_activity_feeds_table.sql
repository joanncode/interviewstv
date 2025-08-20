-- Migration: Create activity feeds table
-- Date: 2025-08-20
-- Description: Create activity tracking system for user feeds

-- Activities table: Stores all user activities for feed generation
CREATE TABLE activities (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL COMMENT 'User who performed the activity',
    activity_type ENUM('interview_published', 'interview_liked', 'comment_created', 'user_followed', 'gallery_uploaded', 'profile_updated') NOT NULL COMMENT 'Type of activity',
    entity_type ENUM('interview', 'comment', 'user', 'gallery', 'profile') NOT NULL COMMENT 'Type of entity involved',
    entity_id BIGINT UNSIGNED NOT NULL COMMENT 'ID of the entity',
    metadata JSON COMMENT 'Additional activity data (title, description, etc.)',
    is_public BOOLEAN DEFAULT TRUE COMMENT 'Whether activity should appear in public feeds',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_activity_type (activity_type),
    INDEX idx_entity_type_id (entity_type, entity_id),
    INDEX idx_created_at (created_at),
    INDEX idx_public_activities (is_public, created_at),
    INDEX idx_user_public_activities (user_id, is_public, created_at)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Feed cache table: Pre-computed feeds for better performance
CREATE TABLE feed_cache (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL COMMENT 'User whose feed this is',
    activity_id BIGINT UNSIGNED NOT NULL COMMENT 'Activity in the feed',
    score DECIMAL(10,2) DEFAULT 1.0 COMMENT 'Relevance score for feed ordering',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_activity (user_id, activity_id),
    INDEX idx_user_score (user_id, score DESC, created_at DESC),
    INDEX idx_activity_id (activity_id)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- User feed preferences table: User settings for their activity feed
CREATE TABLE feed_preferences (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL COMMENT 'User ID',
    activity_type ENUM('interview_published', 'interview_liked', 'comment_created', 'user_followed', 'gallery_uploaded', 'profile_updated') NOT NULL COMMENT 'Activity type',
    enabled BOOLEAN DEFAULT TRUE COMMENT 'Whether to show this activity type in feed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_activity_type (user_id, activity_type),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insert default feed preferences for existing users
INSERT INTO feed_preferences (user_id, activity_type, enabled)
SELECT u.id, 'interview_published', TRUE FROM users u
UNION ALL
SELECT u.id, 'interview_liked', TRUE FROM users u
UNION ALL
SELECT u.id, 'comment_created', TRUE FROM users u
UNION ALL
SELECT u.id, 'user_followed', TRUE FROM users u
UNION ALL
SELECT u.id, 'gallery_uploaded', TRUE FROM users u
UNION ALL
SELECT u.id, 'profile_updated', FALSE FROM users u;
