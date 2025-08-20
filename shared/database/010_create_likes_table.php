<?php

function create_likes_table($pdo) {
    $sql = "CREATE TABLE likes (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL COMMENT 'User who liked',
        likeable_type VARCHAR(50) NOT NULL COMMENT 'Type of entity (interview, comment, etc.)',
        likeable_id BIGINT UNSIGNED NOT NULL COMMENT 'ID of the liked entity',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        
        UNIQUE KEY unique_like (user_id, likeable_type, likeable_id),
        INDEX idx_user_id (user_id),
        INDEX idx_likeable (likeable_type, likeable_id),
        INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
    
    $pdo->exec($sql);
}
