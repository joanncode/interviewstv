<?php

/**
 * Quick Database Setup for Admin Features
 */

require_once __DIR__ . '/config/database.php';

try {
    $database = new Database();
    $pdo = $database->getConnection();

    echo "🔗 Connected to database successfully!\n";
    echo "📊 Creating missing tables...\n";

    // Create tables one by one
    $tables = [
        'comments' => "
            CREATE TABLE IF NOT EXISTS comments (
                id INT PRIMARY KEY AUTO_INCREMENT,
                interview_id INT NOT NULL,
                user_id INT NOT NULL,
                content TEXT NOT NULL,
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ",
        
        'security_events' => "
            CREATE TABLE IF NOT EXISTS security_events (
                id INT PRIMARY KEY AUTO_INCREMENT,
                event_type ENUM('login_attempt', 'failed_login', 'suspicious_activity', 'admin_action', 'content_flag', 'data_export', 'password_change') NOT NULL,
                severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
                description TEXT NOT NULL,
                ip_address VARCHAR(45) NULL,
                user_id INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        "
    ];

    foreach ($tables as $tableName => $sql) {
        try {
            echo "📋 Creating table: $tableName... ";
            $pdo->exec($sql);
            echo "✅\n";
        } catch (Exception $e) {
            echo "❌ Error: " . $e->getMessage() . "\n";
        }
    }

    // Add missing columns to existing tables
    echo "\n🔧 Adding missing columns...\n";
    
    $alterStatements = [
        "ALTER TABLE interviews ADD COLUMN moderation_status ENUM('pending', 'approved', 'rejected', 'flagged') DEFAULT 'pending'",
        "ALTER TABLE interviews ADD COLUMN featured BOOLEAN DEFAULT FALSE",
        "ALTER TABLE interviews ADD COLUMN views INT DEFAULT 0",
        "ALTER TABLE interviews ADD COLUMN likes INT DEFAULT 0",
        "ALTER TABLE users ADD COLUMN password VARCHAR(255) NULL",
        "ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE"
    ];
    
    foreach ($alterStatements as $sql) {
        try {
            echo "🔧 Adding column... ";
            $pdo->exec($sql);
            echo "✅\n";
        } catch (Exception $e) {
            echo "ℹ️  (already exists)\n";
        }
    }

    echo "\n🎉 Database setup complete!\n";
    echo "💡 Now adding sample data...\n\n";

    // Now add sample data directly
    echo "👥 Creating sample users...\n";
    
    // Insert admin user
    $stmt = $pdo->prepare("INSERT IGNORE INTO users (name, email, password_hash, role, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())");
    
    $users = [
        ['Admin User', 'admin@interviews.tv', password_hash('password', PASSWORD_DEFAULT), 'admin', 1],
        ['John Creator', 'john@interviews.tv', password_hash('password', PASSWORD_DEFAULT), 'creator', 1],
        ['Sarah Interviewer', 'sarah@interviews.tv', password_hash('password', PASSWORD_DEFAULT), 'user', 1],
        ['Mike Business', 'mike@interviews.tv', password_hash('password', PASSWORD_DEFAULT), 'user', 1],
        ['Lisa Tech', 'lisa@interviews.tv', password_hash('password', PASSWORD_DEFAULT), 'user', 1]
    ];
    
    foreach ($users as $user) {
        try {
            $stmt->execute($user);
            echo "✅ Created user: {$user[1]}\n";
        } catch (Exception $e) {
            echo "ℹ️  User {$user[1]} already exists\n";
        }
    }

    echo "\n🎬 Creating sample interviews...\n";
    
    $stmt = $pdo->prepare("INSERT IGNORE INTO interviews (title, description, type, status, category, interviewer_id, featured, moderation_status, views, likes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())");
    
    $interviews = [
        ['Building a Tech Startup from Scratch', 'An in-depth conversation about the challenges and rewards of starting a technology company.', 'video', 'published', 'technology', 2, 1, 'approved', 1250, 89],
        ['The Future of Sustainable Business', 'Exploring how businesses can adapt to environmental challenges while maintaining profitability.', 'video', 'published', 'business', 3, 1, 'approved', 2100, 156],
        ['Mental Health in the Workplace', 'A candid discussion about mental health awareness and support systems in modern workplaces.', 'audio', 'published', 'health', 4, 0, 'approved', 890, 67],
        ['Digital Art Revolution', 'How digital tools are transforming the art world and creating new opportunities for artists.', 'video', 'draft', 'entertainment', 2, 0, 'pending', 0, 0],
        ['Climate Policy and Politics', 'A deep dive into environmental policy making and the political challenges of climate action.', 'audio', 'published', 'politics', 3, 0, 'flagged', 1500, 78]
    ];
    
    foreach ($interviews as $interview) {
        try {
            $stmt->execute($interview);
            echo "✅ Created interview: {$interview[0]}\n";
        } catch (Exception $e) {
            echo "ℹ️  Interview already exists or error: " . $e->getMessage() . "\n";
        }
    }

    echo "\n🚩 Creating sample content flags...\n";
    
    $stmt = $pdo->prepare("INSERT IGNORE INTO content_flags (content_id, content_type, reporter_id, reason, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");
    
    $flags = [
        [5, 'interview', 4, 'inappropriate_content', 'Contains controversial political statements that may violate community guidelines.', 'pending'],
        [5, 'interview', 5, 'misinformation', 'Some claims made in this interview appear to be factually incorrect.', 'pending']
    ];
    
    foreach ($flags as $flag) {
        try {
            $stmt->execute($flag);
            echo "✅ Created content flag\n";
        } catch (Exception $e) {
            echo "ℹ️  Flag already exists\n";
        }
    }

    echo "\n🔒 Creating sample security events...\n";
    
    $stmt = $pdo->prepare("INSERT IGNORE INTO security_events (event_type, severity, description, ip_address, user_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
    
    $events = [
        ['failed_login', 'medium', 'Multiple failed login attempts detected', '192.168.1.100', null],
        ['admin_action', 'medium', 'Admin user performed bulk content moderation', '192.168.1.10', 1],
        ['content_flag', 'low', 'Content flagged by community member', '172.16.0.25', 4]
    ];
    
    foreach ($events as $event) {
        try {
            $stmt->execute($event);
            echo "✅ Created security event\n";
        } catch (Exception $e) {
            echo "ℹ️  Event already exists\n";
        }
    }

    // Final verification
    echo "\n🔍 Final verification...\n";
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
    $userCount = $stmt->fetch()['count'];
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM interviews");
    $interviewCount = $stmt->fetch()['count'];
    
    echo "👥 Users: $userCount\n";
    echo "🎬 Interviews: $interviewCount\n";

    echo "\n🎉 Setup complete!\n";
    echo "🔑 Login credentials:\n";
    echo "   Admin: admin@interviews.tv / password\n";
    echo "   User: john@interviews.tv / password\n";
    echo "\n✨ You can now test the admin features!\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
