<?php
/**
 * Create MySQL Schema for Interviews.tv
 */

header('Content-Type: application/json');

try {
    // Connect to MySQL
    $dsn = "mysql:host=localhost;dbname=interviews_tv;charset=utf8mb4";
    $pdo = new PDO($dsn, 'interviews_user', 'interviews_pass');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Core tables schema
    $tables = [
        'users' => "
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                first_name VARCHAR(50),
                last_name VARCHAR(50),
                avatar_url VARCHAR(255),
                bio TEXT,
                location VARCHAR(100),
                website VARCHAR(255),
                social_links JSON,
                privacy_settings JSON,
                email_verified BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                is_admin BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_username (username),
                INDEX idx_email (email),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ",
        
        'interviews' => "
            CREATE TABLE IF NOT EXISTS interviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                slug VARCHAR(255) UNIQUE NOT NULL,
                host_id INT NOT NULL,
                guest_id INT,
                status ENUM('scheduled', 'live', 'completed', 'cancelled') DEFAULT 'scheduled',
                scheduled_at TIMESTAMP NULL,
                started_at TIMESTAMP NULL,
                ended_at TIMESTAMP NULL,
                duration_minutes INT DEFAULT 0,
                recording_url VARCHAR(255),
                thumbnail_url VARCHAR(255),
                view_count INT DEFAULT 0,
                like_count INT DEFAULT 0,
                is_public BOOLEAN DEFAULT TRUE,
                settings JSON,
                metadata JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (guest_id) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_host_id (host_id),
                INDEX idx_guest_id (guest_id),
                INDEX idx_status (status),
                INDEX idx_scheduled_at (scheduled_at),
                INDEX idx_slug (slug)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ",
        
        'interview_analytics' => "
            CREATE TABLE IF NOT EXISTS interview_analytics (
                id INT AUTO_INCREMENT PRIMARY KEY,
                interview_id INT NOT NULL,
                metric_name VARCHAR(100) NOT NULL,
                metric_value DECIMAL(10,2) NOT NULL,
                metric_data JSON,
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE,
                INDEX idx_interview_id (interview_id),
                INDEX idx_metric_name (metric_name),
                INDEX idx_recorded_at (recorded_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ",
        
        'interview_templates' => "
            CREATE TABLE IF NOT EXISTS interview_templates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100),
                questions JSON NOT NULL,
                settings JSON,
                is_public BOOLEAN DEFAULT FALSE,
                created_by INT NOT NULL,
                usage_count INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_category (category),
                INDEX idx_created_by (created_by),
                INDEX idx_is_public (is_public)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ",
        
        'backup_records' => "
            CREATE TABLE IF NOT EXISTS backup_records (
                id INT AUTO_INCREMENT PRIMARY KEY,
                backup_name VARCHAR(255) NOT NULL,
                backup_type ENUM('full', 'incremental', 'differential') DEFAULT 'full',
                file_path VARCHAR(500),
                file_size BIGINT DEFAULT 0,
                status ENUM('pending', 'in_progress', 'completed', 'failed') DEFAULT 'pending',
                created_by INT,
                metadata JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP NULL,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_status (status),
                INDEX idx_created_at (created_at),
                INDEX idx_backup_type (backup_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        "
    ];
    
    $results = [];
    foreach ($tables as $tableName => $sql) {
        try {
            $pdo->exec($sql);
            $results[] = "✅ Created table: $tableName";
        } catch (PDOException $e) {
            $results[] = "⚠️ Table $tableName: " . $e->getMessage();
        }
    }
    
    // Verify tables were created
    $stmt = $pdo->query("SHOW TABLES");
    $createdTables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo json_encode([
        'success' => true,
        'message' => 'MySQL schema creation completed',
        'results' => $results,
        'tables_created' => $createdTables,
        'total_tables' => count($createdTables),
        'next_step' => 'Ready to populate with dummy data'
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Schema creation failed: ' . $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
?>
