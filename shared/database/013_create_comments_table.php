<?php

function create_comments_table($pdo) {
    $sql = "CREATE TABLE comments (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL COMMENT 'User who posted the comment',
        
        commentable_type VARCHAR(50) NOT NULL COMMENT 'Type of entity (interview, gallery, etc.)',
        commentable_id BIGINT UNSIGNED NOT NULL COMMENT 'ID of the commented entity',
        
        parent_id BIGINT UNSIGNED NULL COMMENT 'Parent comment for threading',
        
        content TEXT NOT NULL COMMENT 'Comment content',
        
        status ENUM('published', 'pending', 'approved', 'rejected', 'hidden') NOT NULL DEFAULT 'published' COMMENT 'Comment status',
        
        like_count INT UNSIGNED DEFAULT 0 COMMENT 'Number of likes',
        reply_count INT UNSIGNED DEFAULT 0 COMMENT 'Number of direct replies',
        
        is_pinned BOOLEAN DEFAULT FALSE COMMENT 'Pinned comment flag',
        is_edited BOOLEAN DEFAULT FALSE COMMENT 'Comment edited flag',
        edited_at TIMESTAMP NULL COMMENT 'Last edit timestamp',
        
        ip_address VARCHAR(45) COMMENT 'IP address for moderation',
        user_agent TEXT COMMENT 'User agent for spam detection',
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
        
        INDEX idx_user_id (user_id),
        INDEX idx_commentable (commentable_type, commentable_id),
        INDEX idx_parent_id (parent_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at),
        INDEX idx_like_count (like_count),
        INDEX idx_is_pinned (is_pinned),
        
        FULLTEXT INDEX idx_content_search (content)
    ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
    
    $pdo->exec($sql);
}
