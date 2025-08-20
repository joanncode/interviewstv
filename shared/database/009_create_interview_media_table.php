<?php

function create_interview_media_table($pdo) {
    $sql = "CREATE TABLE interview_media (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        interview_id BIGINT UNSIGNED NOT NULL COMMENT 'Associated interview',
        
        type ENUM('video', 'audio', 'image', 'document') NOT NULL COMMENT 'Media type',
        url VARCHAR(500) NOT NULL COMMENT 'Media file URL',
        filename VARCHAR(255) NOT NULL COMMENT 'Original filename',
        mime_type VARCHAR(100) NOT NULL COMMENT 'MIME type',
        file_size INT UNSIGNED NOT NULL COMMENT 'File size in bytes',
        
        duration INT UNSIGNED NULL COMMENT 'Duration in seconds for video/audio',
        width INT UNSIGNED NULL COMMENT 'Width for images/videos',
        height INT UNSIGNED NULL COMMENT 'Height for images/videos',
        
        is_primary BOOLEAN DEFAULT FALSE COMMENT 'Primary media file for interview',
        sort_order INT UNSIGNED DEFAULT 0 COMMENT 'Display order',
        
        processing_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending' COMMENT 'Processing status',
        processing_data JSON COMMENT 'Processing metadata',
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE,
        
        INDEX idx_interview_id (interview_id),
        INDEX idx_type (type),
        INDEX idx_is_primary (is_primary),
        INDEX idx_sort_order (sort_order),
        INDEX idx_processing_status (processing_status)
    ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
    
    $pdo->exec($sql);
}
