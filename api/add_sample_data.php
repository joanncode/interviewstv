<?php

/**
 * Add Sample Data for Admin Testing
 */

require_once __DIR__ . '/config/database.php';

try {
    $database = new Database();
    $pdo = $database->getConnection();

    echo "🔗 Connected to database successfully!\n";
    echo "📊 Adding sample data for admin testing...\n";

    // First, add the missing 'type' column to interviews table
    echo "🔧 Adding missing columns...\n";
    try {
        $pdo->exec("ALTER TABLE interviews ADD COLUMN type ENUM('video', 'audio', 'text') DEFAULT 'video'");
        echo "✅ Added 'type' column to interviews\n";
    } catch (Exception $e) {
        echo "ℹ️  Type column already exists or error: " . $e->getMessage() . "\n";
    }

    try {
        $pdo->exec("ALTER TABLE interviews ADD COLUMN interviewer_id INT NULL");
        echo "✅ Added 'interviewer_id' column to interviews\n";
    } catch (Exception $e) {
        echo "ℹ️  Interviewer_id column already exists\n";
    }

    try {
        $pdo->exec("ALTER TABLE interviews ADD COLUMN status ENUM('draft', 'published', 'private', 'archived') DEFAULT 'draft'");
        echo "✅ Added 'status' column to interviews\n";
    } catch (Exception $e) {
        echo "ℹ️  Status column already exists\n";
    }

    echo "\n👥 Creating sample users...\n";
    
    // Clear existing test users first
    $pdo->exec("DELETE FROM users WHERE email LIKE '%@interviews.tv'");
    
    $stmt = $pdo->prepare("INSERT INTO users (name, email, password_hash, role, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())");
    
    $users = [
        ['Admin User', 'admin@interviews.tv', password_hash('password', PASSWORD_DEFAULT), 'admin', 1],
        ['John Creator', 'john@interviews.tv', password_hash('password', PASSWORD_DEFAULT), 'creator', 1],
        ['Sarah Interviewer', 'sarah@interviews.tv', password_hash('password', PASSWORD_DEFAULT), 'user', 1],
        ['Mike Business', 'mike@interviews.tv', password_hash('password', PASSWORD_DEFAULT), 'user', 1],
        ['Lisa Tech', 'lisa@interviews.tv', password_hash('password', PASSWORD_DEFAULT), 'user', 1],
        ['David Sports', 'david@interviews.tv', password_hash('password', PASSWORD_DEFAULT), 'user', 0],
        ['Emma Artist', 'emma@interviews.tv', password_hash('password', PASSWORD_DEFAULT), 'user', 1],
        ['Tom Politician', 'tom@interviews.tv', password_hash('password', PASSWORD_DEFAULT), 'user', 1]
    ];
    
    foreach ($users as $user) {
        $stmt->execute($user);
        echo "✅ Created user: {$user[1]}\n";
    }

    echo "\n🎬 Creating sample interviews...\n";
    
    // Clear existing test interviews
    $pdo->exec("DELETE FROM interviews WHERE creator_id IN (SELECT id FROM users WHERE email LIKE '%@interviews.tv')");
    
    $stmt = $pdo->prepare("
        INSERT INTO interviews (
            creator_id, interviewer_id, title, slug, description, category, 
            type, status, is_published, is_featured, view_count, like_count, 
            moderation_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ");
    
    $interviews = [
        [2, 2, 'Building a Tech Startup from Scratch', 'building-tech-startup-scratch', 'An in-depth conversation about the challenges and rewards of starting a technology company.', 'technology', 'video', 'published', 1, 1, 1250, 89, 'approved'],
        [3, 3, 'The Future of Sustainable Business', 'future-sustainable-business', 'Exploring how businesses can adapt to environmental challenges while maintaining profitability.', 'business', 'video', 'published', 1, 1, 2100, 156, 'approved'],
        [4, 4, 'Mental Health in the Workplace', 'mental-health-workplace', 'A candid discussion about mental health awareness and support systems in modern workplaces.', 'health', 'audio', 'published', 1, 0, 890, 67, 'approved'],
        [5, 5, 'Olympic Training Secrets', 'olympic-training-secrets', 'Behind the scenes look at what it takes to train for the Olympics and compete at the highest level.', 'sports', 'video', 'published', 1, 1, 3200, 245, 'approved'],
        [6, 6, 'Digital Art Revolution', 'digital-art-revolution', 'How digital tools are transforming the art world and creating new opportunities for artists.', 'entertainment', 'video', 'draft', 0, 0, 0, 0, 'pending'],
        [7, 7, 'Climate Policy and Politics', 'climate-policy-politics', 'A deep dive into environmental policy making and the political challenges of climate action.', 'politics', 'audio', 'published', 1, 0, 1500, 78, 'flagged'],
        [8, 8, 'Nutrition Myths Debunked', 'nutrition-myths-debunked', 'Separating fact from fiction in the world of nutrition and healthy eating.', 'health', 'text', 'published', 1, 0, 750, 45, 'approved'],
        [2, 2, 'AI and the Future of Work', 'ai-future-work', 'Exploring how artificial intelligence will reshape jobs and industries.', 'technology', 'audio', 'published', 1, 1, 2800, 198, 'approved'],
        [3, 3, 'Entrepreneurship Journey', 'entrepreneurship-journey', 'From idea to IPO: A complete guide to building a successful business.', 'business', 'video', 'published', 1, 0, 1800, 134, 'approved'],
        [4, 4, 'Fitness for Busy Professionals', 'fitness-busy-professionals', 'Quick and effective workout routines for people with demanding schedules.', 'health', 'video', 'draft', 0, 0, 0, 0, 'pending']
    ];
    
    foreach ($interviews as $interview) {
        $stmt->execute($interview);
        echo "✅ Created interview: {$interview[2]}\n";
    }

    echo "\n💬 Creating sample comments...\n";
    
    $stmt = $pdo->prepare("INSERT INTO comments (interview_id, user_id, content, status, created_at) VALUES (?, ?, ?, ?, NOW())");
    
    $comments = [
        [1, 3, 'Great insights on startup challenges! Really helpful for aspiring entrepreneurs.', 'approved'],
        [1, 4, 'Would love to see a follow-up interview about scaling strategies.', 'approved'],
        [2, 5, 'Sustainability is so important. Thanks for covering this topic!', 'approved'],
        [2, 6, 'This changed my perspective on business responsibility.', 'approved'],
        [4, 7, 'Amazing to see what Olympic athletes go through. Incredible dedication!', 'approved'],
        [8, 2, 'AI is definitely going to change everything. Great discussion!', 'approved']
    ];
    
    foreach ($comments as $comment) {
        $stmt->execute($comment);
        echo "✅ Created comment\n";
    }

    echo "\n🚩 Creating sample content flags...\n";
    
    $stmt = $pdo->prepare("INSERT INTO content_flags (content_id, content_type, reporter_id, reason, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");
    
    $flags = [
        [6, 'interview', 5, 'inappropriate_content', 'Contains controversial political statements that may violate community guidelines.', 'pending'],
        [6, 'interview', 8, 'misinformation', 'Some claims made in this interview appear to be factually incorrect.', 'pending']
    ];
    
    foreach ($flags as $flag) {
        $stmt->execute($flag);
        echo "✅ Created content flag\n";
    }

    echo "\n🔒 Creating sample security events...\n";
    
    $stmt = $pdo->prepare("INSERT INTO security_events (event_type, severity, description, ip_address, user_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
    
    $events = [
        ['failed_login', 'medium', 'Multiple failed login attempts detected', '192.168.1.100', null],
        ['suspicious_activity', 'high', 'Unusual access pattern detected for user account', '10.0.0.50', 6],
        ['content_flag', 'low', 'Content flagged by community member', '172.16.0.25', 5],
        ['admin_action', 'medium', 'Admin user performed bulk content moderation', '192.168.1.10', 1]
    ];
    
    foreach ($events as $event) {
        $stmt->execute($event);
        echo "✅ Created security event\n";
    }

    echo "\n📋 Creating sample moderation history...\n";
    
    $stmt = $pdo->prepare("INSERT INTO moderation_history (content_id, content_type, moderator_id, action, reason, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");
    
    $history = [
        [1, 'interview', 1, 'approve', 'quality_content', 'High-quality educational content that meets community standards.'],
        [2, 'interview', 1, 'approve', 'quality_content', 'Excellent discussion on important business topic.'],
        [6, 'interview', 1, 'flag', 'review_needed', 'Flagged for review due to controversial political content.']
    ];
    
    foreach ($history as $record) {
        $stmt->execute($record);
        echo "✅ Created moderation record\n";
    }

    // Final verification
    echo "\n🔍 Final verification...\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM users WHERE email LIKE '%@interviews.tv'");
    $userCount = $stmt->fetch()['count'];
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM interviews WHERE creator_id IN (SELECT id FROM users WHERE email LIKE '%@interviews.tv')");
    $interviewCount = $stmt->fetch()['count'];
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM comments");
    $commentCount = $stmt->fetch()['count'];
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM content_flags");
    $flagCount = $stmt->fetch()['count'];
    
    echo "📊 Data Summary:\n";
    echo "================\n";
    echo "👥 Users: $userCount\n";
    echo "🎬 Interviews: $interviewCount\n";
    echo "💬 Comments: $commentCount\n";
    echo "🚩 Content Flags: $flagCount\n";

    echo "\n🎉 Sample data created successfully!\n";
    echo "\n🔑 Login credentials:\n";
    echo "   Admin: admin@interviews.tv / password\n";
    echo "   Creator: john@interviews.tv / password\n";
    echo "   User: sarah@interviews.tv / password\n";
    echo "\n✨ You can now test all admin features!\n";
    echo "🎯 Try logging in as admin and check:\n";
    echo "   - User Management (8 test users)\n";
    echo "   - Interviews Management (10 test interviews)\n";
    echo "   - Content Moderation (flagged content)\n";
    echo "   - Security Dashboard (security events)\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "📍 File: " . $e->getFile() . " Line: " . $e->getLine() . "\n";
    exit(1);
}
