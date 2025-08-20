<?php

function create_gallery_media_table($pdo) {
    $sql = "CREATE TABLE gallery_media (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        gallery_id BIGINT UNSIGNED NOT NULL COMMENT 'Associated gallery',
        
        title VARCHAR(255) COMMENT 'Media title/caption',
        description TEXT COMMENT 'Media description',
        
        type ENUM('image', 'video', 'audio') NOT NULL COMMENT 'Media type',
        url VARCHAR(500) NOT NULL COMMENT 'Media file URL',
        thumbnail_url VARCHAR(500) COMMENT 'Thumbnail URL for videos',
        
        filename VARCHAR(255) NOT NULL COMMENT 'Original filename',
        mime_type VARCHAR(100) NOT NULL COMMENT 'MIME type',
        file_size INT UNSIGNED NOT NULL COMMENT 'File size in bytes',
        
        width INT UNSIGNED COMMENT 'Width for images/videos',
        height INT UNSIGNED COMMENT 'Height for images/videos',
        duration INT UNSIGNED COMMENT 'Duration in seconds for video/audio',
        
        sort_order INT UNSIGNED DEFAULT 0 COMMENT 'Custom sort order',
        is_cover BOOLEAN DEFAULT FALSE COMMENT 'Gallery cover image',
        
        alt_text VARCHAR(255) COMMENT 'Alt text for accessibility',
        tags JSON COMMENT 'Media tags array',
        
        view_count INT UNSIGNED DEFAULT 0 COMMENT 'Individual media view count',
        like_count INT UNSIGNED DEFAULT 0 COMMENT 'Individual media like count',
        
        processing_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'completed' COMMENT 'Processing status',
        processing_data JSON COMMENT 'Processing metadata',
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE,
        
        INDEX idx_gallery_id (gallery_id),
        INDEX idx_type (type),
        INDEX idx_sort_order (sort_order),
        INDEX idx_is_cover (is_cover),
        INDEX idx_created_at (created_at),
        INDEX idx_processing_status (processing_status),
        
        FULLTEXT INDEX idx_search (title, description, alt_text)
    ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
    
    $pdo->exec($sql);
}
