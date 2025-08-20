<?php

function create_galleries_table($pdo) {
    $sql = "CREATE TABLE galleries (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL COMMENT 'Gallery owner',
        title VARCHAR(255) NOT NULL COMMENT 'Gallery title',
        description TEXT COMMENT 'Gallery description',
        slug VARCHAR(255) NOT NULL UNIQUE COMMENT 'URL-friendly slug',
        
        type ENUM('personal', 'interview', 'event', 'business') NOT NULL DEFAULT 'personal' COMMENT 'Gallery type',
        visibility ENUM('public', 'private', 'unlisted') NOT NULL DEFAULT 'public' COMMENT 'Gallery visibility',
        
        cover_image_url VARCHAR(500) COMMENT 'Gallery cover image',
        media_count INT UNSIGNED DEFAULT 0 COMMENT 'Number of media items',
        
        sort_order ENUM('date_asc', 'date_desc', 'name_asc', 'name_desc', 'custom') DEFAULT 'date_desc' COMMENT 'Media sort order',
        
        view_count INT UNSIGNED DEFAULT 0 COMMENT 'Gallery view count',
        like_count INT UNSIGNED DEFAULT 0 COMMENT 'Gallery like count',
        
        featured BOOLEAN DEFAULT FALSE COMMENT 'Featured gallery flag',
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        
        INDEX idx_user_id (user_id),
        INDEX idx_type (type),
        INDEX idx_visibility (visibility),
        INDEX idx_featured (featured),
        INDEX idx_created_at (created_at),
        INDEX idx_view_count (view_count),
        
        FULLTEXT INDEX idx_search (title, description)
    ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
    
    $pdo->exec($sql);
}
