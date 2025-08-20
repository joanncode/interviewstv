<?php

function create_followers_table($pdo) {
    $sql = "CREATE TABLE followers (
        follower_id BIGINT UNSIGNED NOT NULL COMMENT 'User who follows',
        followed_id BIGINT UNSIGNED NOT NULL COMMENT 'User being followed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (follower_id, followed_id),
        FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (followed_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_followed_id (followed_id),
        INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
    
    $pdo->exec($sql);
}
