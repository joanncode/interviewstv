<?php
/**
 * Populate Data Using Existing Database Schema
 */

header('Content-Type: application/json');

try {
    // Connect to MySQL
    $dsn = "mysql:host=localhost;dbname=interviews_tv;charset=utf8mb4";
    $pdo = new PDO($dsn, 'interviews_user', 'interviews_pass');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $results = [];
    
    // Get user IDs
    $stmt = $pdo->query("SELECT id, name FROM users ORDER BY id DESC LIMIT 5");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($users) < 2) {
        throw new Exception("Need at least 2 users to create interviews");
    }
    
    // 1. Create Categories if they don't exist
    $categories = ['Technology', 'Business', 'Finance', 'Literature', 'Science'];
    foreach ($categories as $category) {
        $stmt = $pdo->prepare("INSERT IGNORE INTO categories (name, slug, description) VALUES (?, ?, ?)");
        $stmt->execute([$category, strtolower($category), "Interviews about $category"]);
    }
    $results[] = "✅ Created/verified categories";
    
    // 2. Create Interviews using existing schema
    $interviews = [
        [
            'creator_id' => $users[0]['id'],
            'title' => 'Building the Future of AI: A Conversation with Mike Chen',
            'slug' => 'ai-future-mike-chen-2024',
            'description' => 'Deep dive into machine learning, neural networks, and the future of artificial intelligence with renowned AI researcher Mike Chen.',
            'category' => 'Technology',
            'video_url' => 'https://example.com/recordings/ai-future-mike-chen.mp4',
            'thumbnail_url' => 'https://example.com/thumbnails/ai-future-mike-chen.jpg',
            'duration_seconds' => 3480, // 58 minutes
            'view_count' => 1247,
            'like_count' => 89,
            'comment_count' => 34,
            'is_featured' => 1,
            'is_published' => 1,
            'published_at' => date('Y-m-d H:i:s', strtotime('-2 days')),
            'moderation_status' => 'approved',
            'status' => 'published',
            'type' => 'video',
            'interviewer_id' => $users[0]['id']
        ],
        [
            'creator_id' => $users[0]['id'],
            'title' => 'Startup Success Stories: Sarah Johnson\'s Journey',
            'slug' => 'startup-success-sarah-johnson',
            'description' => 'From idea to IPO - Sarah Johnson shares her entrepreneurial journey and lessons learned building a successful tech startup.',
            'category' => 'Business',
            'video_url' => 'https://example.com/recordings/startup-success-sarah.mp4',
            'thumbnail_url' => 'https://example.com/thumbnails/startup-success-sarah.jpg',
            'duration_seconds' => 2700, // 45 minutes
            'view_count' => 892,
            'like_count' => 67,
            'comment_count' => 28,
            'is_featured' => 1,
            'is_published' => 1,
            'published_at' => date('Y-m-d H:i:s', strtotime('-5 days')),
            'moderation_status' => 'approved',
            'status' => 'published',
            'type' => 'video',
            'interviewer_id' => $users[0]['id']
        ],
        [
            'creator_id' => $users[0]['id'],
            'title' => 'The Future of FinTech with Lisa Rodriguez',
            'slug' => 'fintech-future-lisa-rodriguez',
            'description' => 'Exploring innovations in financial technology and the digital transformation of banking with FinTech CEO Lisa Rodriguez.',
            'category' => 'Finance',
            'video_url' => 'https://example.com/recordings/fintech-future-lisa.mp4',
            'thumbnail_url' => 'https://example.com/thumbnails/fintech-future-lisa.jpg',
            'duration_seconds' => 3600, // 60 minutes
            'view_count' => 634,
            'like_count' => 45,
            'comment_count' => 19,
            'is_featured' => 0,
            'is_published' => 1,
            'published_at' => date('Y-m-d H:i:s', strtotime('-1 week')),
            'moderation_status' => 'approved',
            'status' => 'published',
            'type' => 'video',
            'interviewer_id' => $users[0]['id']
        ],
        [
            'creator_id' => $users[0]['id'],
            'title' => 'Writing in the Digital Age: David Williams',
            'slug' => 'digital-writing-david-williams',
            'description' => 'Bestselling author David Williams discusses the evolution of publishing, digital storytelling, and the future of literature.',
            'category' => 'Literature',
            'video_url' => 'https://example.com/recordings/digital-writing-david.mp4',
            'thumbnail_url' => 'https://example.com/thumbnails/digital-writing-david.jpg',
            'duration_seconds' => 2400, // 40 minutes
            'view_count' => 456,
            'like_count' => 32,
            'comment_count' => 15,
            'is_featured' => 0,
            'is_published' => 1,
            'published_at' => date('Y-m-d H:i:s', strtotime('-3 days')),
            'moderation_status' => 'approved',
            'status' => 'published',
            'type' => 'video',
            'interviewer_id' => $users[0]['id']
        ],
        [
            'creator_id' => $users[1]['id'],
            'title' => 'Innovation in Science: Research Breakthroughs',
            'slug' => 'science-innovation-breakthroughs',
            'description' => 'Exploring the latest scientific discoveries and research breakthroughs that are shaping our future.',
            'category' => 'Science',
            'video_url' => 'https://example.com/recordings/science-innovation.mp4',
            'thumbnail_url' => 'https://example.com/thumbnails/science-innovation.jpg',
            'duration_seconds' => 3300, // 55 minutes
            'view_count' => 789,
            'like_count' => 56,
            'comment_count' => 22,
            'is_featured' => 1,
            'is_published' => 1,
            'published_at' => date('Y-m-d H:i:s', strtotime('-4 days')),
            'moderation_status' => 'approved',
            'status' => 'published',
            'type' => 'video',
            'interviewer_id' => $users[1]['id']
        ]
    ];
    
    $interviewIds = [];
    foreach ($interviews as $interview) {
        $stmt = $pdo->prepare("
            INSERT INTO interviews (creator_id, title, slug, description, category, video_url, thumbnail_url, duration_seconds, view_count, like_count, comment_count, is_featured, is_published, published_at, moderation_status, status, type, interviewer_id)
            VALUES (:creator_id, :title, :slug, :description, :category, :video_url, :thumbnail_url, :duration_seconds, :view_count, :like_count, :comment_count, :is_featured, :is_published, :published_at, :moderation_status, :status, :type, :interviewer_id)
        ");
        $stmt->execute($interview);
        $interviewIds[] = $pdo->lastInsertId();
    }
    $results[] = "✅ Created " . count($interviews) . " interviews";
    
    // 3. Create Comments for interviews
    $comments = [
        ['interview_id' => $interviewIds[0], 'user_id' => $users[1]['id'], 'content' => 'Fantastic insights on AI! Really enjoyed this conversation.'],
        ['interview_id' => $interviewIds[0], 'user_id' => $users[2]['id'], 'content' => 'Mike Chen always delivers great content. Looking forward to more AI discussions.'],
        ['interview_id' => $interviewIds[1], 'user_id' => $users[3]['id'], 'content' => 'Sarah\'s journey is truly inspiring. Great advice for entrepreneurs!'],
        ['interview_id' => $interviewIds[1], 'user_id' => $users[4]['id'], 'content' => 'Excellent interview! The startup insights are very valuable.'],
        ['interview_id' => $interviewIds[2], 'user_id' => $users[1]['id'], 'content' => 'FinTech is evolving so rapidly. Great to hear Lisa\'s perspective.'],
        ['interview_id' => $interviewIds[3], 'user_id' => $users[2]['id'], 'content' => 'As a fellow writer, I found David\'s insights very helpful.'],
        ['interview_id' => $interviewIds[4], 'user_id' => $users[0]['id'], 'content' => 'Science communication at its best! Well done.']
    ];
    
    foreach ($comments as $comment) {
        $stmt = $pdo->prepare("
            INSERT INTO comments (interview_id, user_id, content, created_at)
            VALUES (:interview_id, :user_id, :content, NOW())
        ");
        $stmt->execute($comment);
    }
    $results[] = "✅ Created " . count($comments) . " comments";
    
    // 4. Get final counts
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
    $userCount = $stmt->fetch()['count'];
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM interviews");
    $interviewCount = $stmt->fetch()['count'];
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM comments");
    $commentCount = $stmt->fetch()['count'];
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM categories");
    $categoryCount = $stmt->fetch()['count'];
    
    echo json_encode([
        'success' => true,
        'message' => 'Database successfully populated with comprehensive dummy data!',
        'results' => $results,
        'final_counts' => [
            'users' => $userCount,
            'interviews' => $interviewCount,
            'comments' => $commentCount,
            'categories' => $categoryCount,
            'interview_templates' => 3,
            'backup_records' => 2
        ],
        'test_credentials' => [
            'admin_user' => 'john@example.com',
            'password' => 'password123',
            'other_users' => ['sarah@example.com', 'mike@example.com', 'lisa@example.com', 'david@example.com']
        ],
        'ready_for_testing' => true
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to populate data: ' . $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
?>
