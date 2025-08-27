<?php

/**
 * Final Setup - Add Sample Data for Admin Testing
 */

require_once __DIR__ . '/config/database.php';

try {
    $database = new Database();
    $pdo = $database->getConnection();

    echo "🔗 Connected to database successfully!\n";
    echo "📊 Adding sample data for admin testing...\n";

    echo "\n👥 Creating sample users...\n";
    
    // Clear existing test users first
    $pdo->exec("DELETE FROM interviews WHERE creator_id IN (SELECT id FROM users WHERE email LIKE '%@interviews.tv')");
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
    
    $userIds = [];
    foreach ($users as $user) {
        $stmt->execute($user);
        $userIds[$user[1]] = $pdo->lastInsertId();
        echo "✅ Created user: {$user[1]} (ID: {$userIds[$user[1]]})\n";
    }

    echo "\n🎬 Creating sample interviews...\n";
    
    $stmt = $pdo->prepare("
        INSERT INTO interviews (
            creator_id, interviewer_id, title, slug, description, category, 
            type, status, is_published, is_featured, view_count, like_count, 
            moderation_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ");
    
    $interviews = [
        [$userIds['john@interviews.tv'], $userIds['john@interviews.tv'], 'Building a Tech Startup from Scratch', 'building-tech-startup-scratch', 'An in-depth conversation about the challenges and rewards of starting a technology company.', 'technology', 'video', 'published', 1, 1, 1250, 89, 'approved'],
        [$userIds['sarah@interviews.tv'], $userIds['sarah@interviews.tv'], 'The Future of Sustainable Business', 'future-sustainable-business', 'Exploring how businesses can adapt to environmental challenges while maintaining profitability.', 'business', 'video', 'published', 1, 1, 2100, 156, 'approved'],
        [$userIds['mike@interviews.tv'], $userIds['mike@interviews.tv'], 'Mental Health in the Workplace', 'mental-health-workplace', 'A candid discussion about mental health awareness and support systems in modern workplaces.', 'health', 'audio', 'published', 1, 0, 890, 67, 'approved'],
        [$userIds['lisa@interviews.tv'], $userIds['lisa@interviews.tv'], 'Olympic Training Secrets', 'olympic-training-secrets', 'Behind the scenes look at what it takes to train for the Olympics and compete at the highest level.', 'sports', 'video', 'published', 1, 1, 3200, 245, 'approved'],
        [$userIds['david@interviews.tv'], $userIds['david@interviews.tv'], 'Digital Art Revolution', 'digital-art-revolution', 'How digital tools are transforming the art world and creating new opportunities for artists.', 'entertainment', 'video', 'draft', 0, 0, 0, 0, 'pending'],
        [$userIds['emma@interviews.tv'], $userIds['emma@interviews.tv'], 'Climate Policy and Politics', 'climate-policy-politics', 'A deep dive into environmental policy making and the political challenges of climate action.', 'politics', 'audio', 'published', 1, 0, 1500, 78, 'flagged'],
        [$userIds['tom@interviews.tv'], $userIds['tom@interviews.tv'], 'Nutrition Myths Debunked', 'nutrition-myths-debunked', 'Separating fact from fiction in the world of nutrition and healthy eating.', 'health', 'text', 'published', 1, 0, 750, 45, 'approved'],
        [$userIds['john@interviews.tv'], $userIds['john@interviews.tv'], 'AI and the Future of Work', 'ai-future-work', 'Exploring how artificial intelligence will reshape jobs and industries.', 'technology', 'audio', 'published', 1, 1, 2800, 198, 'approved'],
        [$userIds['sarah@interviews.tv'], $userIds['sarah@interviews.tv'], 'Entrepreneurship Journey', 'entrepreneurship-journey', 'From idea to IPO: A complete guide to building a successful business.', 'business', 'video', 'published', 1, 0, 1800, 134, 'approved'],
        [$userIds['mike@interviews.tv'], $userIds['mike@interviews.tv'], 'Fitness for Busy Professionals', 'fitness-busy-professionals', 'Quick and effective workout routines for people with demanding schedules.', 'health', 'video', 'draft', 0, 0, 0, 0, 'pending']
    ];
    
    $interviewIds = [];
    foreach ($interviews as $interview) {
        $stmt->execute($interview);
        $interviewIds[] = $pdo->lastInsertId();
        echo "✅ Created interview: {$interview[2]}\n";
    }

    echo "\n💬 Creating sample comments...\n";
    
    $stmt = $pdo->prepare("INSERT INTO comments (interview_id, user_id, content, status, created_at) VALUES (?, ?, ?, ?, NOW())");
    
    $comments = [
        [$interviewIds[0], $userIds['sarah@interviews.tv'], 'Great insights on startup challenges! Really helpful for aspiring entrepreneurs.', 'approved'],
        [$interviewIds[0], $userIds['mike@interviews.tv'], 'Would love to see a follow-up interview about scaling strategies.', 'approved'],
        [$interviewIds[1], $userIds['lisa@interviews.tv'], 'Sustainability is so important. Thanks for covering this topic!', 'approved'],
        [$interviewIds[1], $userIds['david@interviews.tv'], 'This changed my perspective on business responsibility.', 'approved'],
        [$interviewIds[3], $userIds['emma@interviews.tv'], 'Amazing to see what Olympic athletes go through. Incredible dedication!', 'approved'],
        [$interviewIds[7], $userIds['john@interviews.tv'], 'AI is definitely going to change everything. Great discussion!', 'approved']
    ];
    
    foreach ($comments as $comment) {
        $stmt->execute($comment);
        echo "✅ Created comment\n";
    }

    echo "\n🚩 Creating sample content flags...\n";
    
    $stmt = $pdo->prepare("INSERT INTO content_flags (content_id, content_type, reporter_id, reason, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");
    
    $flags = [
        [$interviewIds[5], 'interview', $userIds['lisa@interviews.tv'], 'inappropriate_content', 'Contains controversial political statements that may violate community guidelines.', 'pending'],
        [$interviewIds[5], 'interview', $userIds['tom@interviews.tv'], 'misinformation', 'Some claims made in this interview appear to be factually incorrect.', 'pending']
    ];
    
    foreach ($flags as $flag) {
        $stmt->execute($flag);
        echo "✅ Created content flag\n";
    }

    echo "\n🔒 Creating sample security events...\n";
    
    $stmt = $pdo->prepare("INSERT INTO security_events (event_type, severity, description, ip_address, user_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
    
    $events = [
        ['failed_login', 'medium', 'Multiple failed login attempts detected', '192.168.1.100', null],
        ['suspicious_activity', 'high', 'Unusual access pattern detected for user account', '10.0.0.50', $userIds['david@interviews.tv']],
        ['content_flag', 'low', 'Content flagged by community member', '172.16.0.25', $userIds['lisa@interviews.tv']],
        ['admin_action', 'medium', 'Admin user performed bulk content moderation', '192.168.1.10', $userIds['admin@interviews.tv']]
    ];
    
    foreach ($events as $event) {
        $stmt->execute($event);
        echo "✅ Created security event\n";
    }

    echo "\n📋 Creating sample moderation history...\n";
    
    $stmt = $pdo->prepare("INSERT INTO moderation_history (content_id, content_type, moderator_id, action, reason, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");
    
    $history = [
        [$interviewIds[0], 'interview', $userIds['admin@interviews.tv'], 'approve', 'quality_content', 'High-quality educational content that meets community standards.'],
        [$interviewIds[1], 'interview', $userIds['admin@interviews.tv'], 'approve', 'quality_content', 'Excellent discussion on important business topic.'],
        [$interviewIds[5], 'interview', $userIds['admin@interviews.tv'], 'flag', 'review_needed', 'Flagged for review due to controversial political content.']
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
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM security_events");
    $securityCount = $stmt->fetch()['count'];
    
    echo "📊 Data Summary:\n";
    echo "================\n";
    echo "👥 Users: $userCount\n";
    echo "🎬 Interviews: $interviewCount\n";
    echo "💬 Comments: $commentCount\n";
    echo "🚩 Content Flags: $flagCount\n";
    echo "🔒 Security Events: $securityCount\n";

    echo "\n🎉 Sample data created successfully!\n";
    echo "\n🔑 Login credentials:\n";
    echo "   Admin: admin@interviews.tv / password\n";
    echo "   Creator: john@interviews.tv / password\n";
    echo "   User: sarah@interviews.tv / password\n";
    echo "\n✨ You can now test all admin features!\n";
    echo "🎯 Try logging in as admin and check:\n";
    echo "   - User Management ($userCount test users)\n";
    echo "   - Interviews Management ($interviewCount test interviews)\n";
    echo "   - Content Moderation ($flagCount flagged items)\n";
    echo "   - Security Dashboard ($securityCount security events)\n";
    echo "\n🌐 Refresh your browser at http://localhost:8000 and login!\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "📍 File: " . $e->getFile() . " Line: " . $e->getLine() . "\n";
    exit(1);
}
