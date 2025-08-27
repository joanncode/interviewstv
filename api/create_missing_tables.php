<?php

/**
 * Create Missing Tables for Admin Features
 */

require_once __DIR__ . '/config/database.php';

try {
    $database = new Database();
    $pdo = $database->getConnection();

    echo "🔗 Connected to database successfully!\n";
    echo "📊 Creating missing tables for admin features...\n";

    $tables = [
        'comments' => "
            CREATE TABLE IF NOT EXISTS comments (
                id INT PRIMARY KEY AUTO_INCREMENT,
                interview_id INT NOT NULL,
                user_id INT NOT NULL,
                content TEXT NOT NULL,
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_interview_id (interview_id),
                INDEX idx_user_id (user_id),
                INDEX idx_status (status)
            )
        ",
        
        'categories' => "
            CREATE TABLE IF NOT EXISTS categories (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL UNIQUE,
                slug VARCHAR(100) NOT NULL UNIQUE,
                description TEXT NULL,
                parent_id INT NULL,
                sort_order INT DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
                INDEX idx_slug (slug),
                INDEX idx_parent_id (parent_id),
                INDEX idx_active (is_active)
            )
        ",
        
        'content_flags' => "
            CREATE TABLE IF NOT EXISTS content_flags (
                id INT PRIMARY KEY AUTO_INCREMENT,
                content_id INT NOT NULL,
                content_type ENUM('interview', 'comment', 'business') NOT NULL,
                reporter_id INT NOT NULL,
                reason ENUM('spam', 'inappropriate_content', 'harassment', 'misinformation', 'copyright', 'other') NOT NULL,
                description TEXT NULL,
                status ENUM('pending', 'resolved', 'dismissed') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP NULL,
                resolved_by INT NULL,
                
                FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_content (content_id, content_type),
                INDEX idx_status (status),
                INDEX idx_reporter (reporter_id)
            )
        ",
        
        'moderation_history' => "
            CREATE TABLE IF NOT EXISTS moderation_history (
                id INT PRIMARY KEY AUTO_INCREMENT,
                content_id INT NOT NULL,
                content_type ENUM('interview', 'comment', 'business', 'user') NOT NULL,
                moderator_id INT NOT NULL,
                action ENUM('approve', 'reject', 'flag', 'hide', 'delete', 'warn', 'ban') NOT NULL,
                reason VARCHAR(255) NULL,
                notes TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_content (content_id, content_type),
                INDEX idx_moderator (moderator_id),
                INDEX idx_action (action),
                INDEX idx_created_at (created_at)
            )
        ",
        
        'security_events' => "
            CREATE TABLE IF NOT EXISTS security_events (
                id INT PRIMARY KEY AUTO_INCREMENT,
                event_type ENUM('login_attempt', 'failed_login', 'suspicious_activity', 'admin_action', 'content_flag', 'data_export', 'password_change') NOT NULL,
                severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
                description TEXT NOT NULL,
                ip_address VARCHAR(45) NULL,
                user_agent TEXT NULL,
                user_id INT NULL,
                metadata JSON NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_event_type (event_type),
                INDEX idx_severity (severity),
                INDEX idx_user_id (user_id),
                INDEX idx_created_at (created_at),
                INDEX idx_ip_address (ip_address)
            )
        ",
        
        'user_sessions' => "
            CREATE TABLE IF NOT EXISTS user_sessions (
                id VARCHAR(128) PRIMARY KEY,
                user_id INT NOT NULL,
                ip_address VARCHAR(45) NOT NULL,
                user_agent TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_expires_at (expires_at),
                INDEX idx_last_activity (last_activity)
            )
        ",
        
        'email_verification_tokens' => "
            CREATE TABLE IF NOT EXISTS email_verification_tokens (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                token VARCHAR(255) NOT NULL UNIQUE,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_token (token),
                INDEX idx_user_id (user_id),
                INDEX idx_expires_at (expires_at)
            )
        ",
        
        'password_reset_tokens' => "
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                token VARCHAR(255) NOT NULL UNIQUE,
                expires_at TIMESTAMP NOT NULL,
                used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_token (token),
                INDEX idx_user_id (user_id),
                INDEX idx_expires_at (expires_at)
            )
        "
    ];

    $pdo->beginTransaction();
    
    try {
        $createdCount = 0;
        
        foreach ($tables as $tableName => $sql) {
            echo "📋 Creating table: $tableName\n";
            $pdo->exec($sql);
            $createdCount++;
        }
        
        $pdo->commit();
        echo "✅ Successfully created $createdCount tables!\n";
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }

    // Add missing columns to existing tables if needed
    echo "\n🔧 Updating existing tables...\n";
    
    $alterStatements = [
        "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS moderation_status ENUM('pending', 'approved', 'rejected', 'flagged') DEFAULT 'pending'",
        "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE",
        "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS views INT DEFAULT 0",
        "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS likes INT DEFAULT 0",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255) NULL AFTER password_hash",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE",
    ];
    
    foreach ($alterStatements as $sql) {
        try {
            $pdo->exec($sql);
            echo "✅ Updated table structure\n";
        } catch (Exception $e) {
            // Column might already exist, continue
            echo "ℹ️  Skipped update (column may already exist)\n";
        }
    }

    // Verify final table structure
    echo "\n🔍 Final verification...\n";
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo "📊 Total tables: " . count($tables) . "\n";
    foreach ($tables as $table) {
        echo "  ✅ $table\n";
    }

    echo "\n🎉 Database is now ready for admin features!\n";
    echo "💡 You can now run 'php api/seed_admin_data.php' to add sample data.\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
        echo "🔄 Transaction rolled back.\n";
    }
    
    exit(1);
}
