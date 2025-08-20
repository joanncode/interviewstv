<?php

function create_interviews_table($pdo) {
    $sql = "CREATE TABLE interviews (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL COMMENT 'Interview title',
        description TEXT COMMENT 'Interview description',
        slug VARCHAR(255) NOT NULL UNIQUE COMMENT 'URL-friendly slug',
        
        interviewer_id BIGINT UNSIGNED NOT NULL COMMENT 'User who conducts the interview',
        interviewee_id BIGINT UNSIGNED NULL COMMENT 'User being interviewed (if registered)',
        interviewee_name VARCHAR(255) NULL COMMENT 'Name if interviewee is not registered',
        interviewee_bio TEXT NULL COMMENT 'Bio if interviewee is not registered',
        
        type ENUM('video', 'audio', 'text') NOT NULL DEFAULT 'video' COMMENT 'Interview format',
        status ENUM('draft', 'published', 'private', 'archived') NOT NULL DEFAULT 'draft' COMMENT 'Interview status',
        
        thumbnail_url VARCHAR(500) COMMENT 'Thumbnail image URL',
        duration INT UNSIGNED COMMENT 'Duration in seconds for video/audio',
        
        category VARCHAR(100) COMMENT 'Interview category',
        tags JSON COMMENT 'Interview tags array',
        
        view_count INT UNSIGNED DEFAULT 0 COMMENT 'Number of views',
        like_count INT UNSIGNED DEFAULT 0 COMMENT 'Number of likes',
        comment_count INT UNSIGNED DEFAULT 0 COMMENT 'Number of comments',
        
        featured BOOLEAN DEFAULT FALSE COMMENT 'Featured interview flag',
        trending_score DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Trending algorithm score',
        
        published_at TIMESTAMP NULL COMMENT 'When interview was published',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (interviewer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (interviewee_id) REFERENCES users(id) ON DELETE SET NULL,
        
        INDEX idx_interviewer_id (interviewer_id),
        INDEX idx_interviewee_id (interviewee_id),
        INDEX idx_status (status),
        INDEX idx_type (type),
        INDEX idx_category (category),
        INDEX idx_featured (featured),
        INDEX idx_published_at (published_at),
        INDEX idx_trending_score (trending_score),
        INDEX idx_view_count (view_count),
        INDEX idx_created_at (created_at),
        
        FULLTEXT INDEX idx_search (title, description, interviewee_name)
    ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
    
    $pdo->exec($sql);
}
