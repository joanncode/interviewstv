<?php

function create_users_table($pdo) {
    $sql = "CREATE TABLE users (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE COMMENT 'Unique username for profile URL',
        email VARCHAR(255) NOT NULL UNIQUE COMMENT 'Email for login and notifications',
        password VARCHAR(255) NOT NULL COMMENT 'Hashed password',
        bio TEXT COMMENT 'User biography',
        avatar_url VARCHAR(255) COMMENT 'S3 URL for profile picture',
        role ENUM('user', 'interviewer', 'interviewee', 'promoter', 'admin') NOT NULL DEFAULT 'user' COMMENT 'User role',
        verified BOOLEAN DEFAULT FALSE COMMENT 'Email verification status',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_email (email),
        INDEX idx_role (role)
    ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
    
    $pdo->exec($sql);
}
