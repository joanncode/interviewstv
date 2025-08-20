<?php

function create_comment_reports_table($pdo) {
    $sql = "CREATE TABLE comment_reports (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        comment_id BIGINT UNSIGNED NOT NULL COMMENT 'Reported comment',
        reporter_id BIGINT UNSIGNED NOT NULL COMMENT 'User who reported',
        
        reason ENUM('spam', 'harassment', 'inappropriate', 'misinformation', 'copyright', 'other') NOT NULL COMMENT 'Report reason',
        description TEXT COMMENT 'Additional details about the report',
        
        status ENUM('pending', 'reviewed', 'resolved', 'dismissed') NOT NULL DEFAULT 'pending' COMMENT 'Report status',
        
        reviewed_by BIGINT UNSIGNED NULL COMMENT 'Admin who reviewed',
        reviewed_at TIMESTAMP NULL COMMENT 'Review timestamp',
        resolution_notes TEXT COMMENT 'Admin notes on resolution',
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
        
        UNIQUE KEY unique_report (comment_id, reporter_id),
        INDEX idx_comment_id (comment_id),
        INDEX idx_reporter_id (reporter_id),
        INDEX idx_status (status),
        INDEX idx_reason (reason),
        INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
    
    $pdo->exec($sql);
}
