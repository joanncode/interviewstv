<?php
/**
 * Populate Interviews and Analytics Data
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
    
    // 1. Create Interviews
    $interviews = [
        [
            'title' => 'Building the Future of AI: A Conversation with Mike Chen',
            'description' => 'Deep dive into machine learning, neural networks, and the future of artificial intelligence with renowned AI researcher Mike Chen.',
            'slug' => 'ai-future-mike-chen-2024',
            'host_id' => $users[0]['id'], // John Smith (admin)
            'guest_id' => $users[2]['id'], // Mike Chen
            'status' => 'completed',
            'scheduled_at' => date('Y-m-d H:i:s', strtotime('-2 days')),
            'started_at' => date('Y-m-d H:i:s', strtotime('-2 days +1 hour')),
            'ended_at' => date('Y-m-d H:i:s', strtotime('-2 days +2 hours')),
            'duration_minutes' => 58,
            'recording_url' => 'https://example.com/recordings/ai-future-mike-chen.mp4',
            'thumbnail_url' => 'https://example.com/thumbnails/ai-future-mike-chen.jpg',
            'view_count' => 1247,
            'like_count' => 89,
            'is_public' => 1,
            'settings' => json_encode(['quality' => 'HD', 'chat_enabled' => true, 'recording_enabled' => true]),
            'metadata' => json_encode(['tags' => ['AI', 'Technology', 'Research'], 'category' => 'Technology'])
        ],
        [
            'title' => 'Startup Success Stories: Sarah Johnson\'s Journey',
            'description' => 'From idea to IPO - Sarah Johnson shares her entrepreneurial journey and lessons learned building a successful tech startup.',
            'slug' => 'startup-success-sarah-johnson',
            'host_id' => $users[0]['id'], // John Smith
            'guest_id' => $users[1]['id'], // Sarah Johnson
            'status' => 'completed',
            'scheduled_at' => date('Y-m-d H:i:s', strtotime('-5 days')),
            'started_at' => date('Y-m-d H:i:s', strtotime('-5 days +1 hour')),
            'ended_at' => date('Y-m-d H:i:s', strtotime('-5 days +1 hour 45 minutes')),
            'duration_minutes' => 45,
            'recording_url' => 'https://example.com/recordings/startup-success-sarah.mp4',
            'thumbnail_url' => 'https://example.com/thumbnails/startup-success-sarah.jpg',
            'view_count' => 892,
            'like_count' => 67,
            'is_public' => 1,
            'settings' => json_encode(['quality' => 'HD', 'chat_enabled' => true, 'recording_enabled' => true]),
            'metadata' => json_encode(['tags' => ['Startup', 'Entrepreneurship', 'Business'], 'category' => 'Business'])
        ],
        [
            'title' => 'The Future of FinTech with Lisa Rodriguez',
            'description' => 'Exploring innovations in financial technology and the digital transformation of banking with FinTech CEO Lisa Rodriguez.',
            'slug' => 'fintech-future-lisa-rodriguez',
            'host_id' => $users[0]['id'], // John Smith
            'guest_id' => $users[3]['id'], // Lisa Rodriguez
            'status' => 'live',
            'scheduled_at' => date('Y-m-d H:i:s'),
            'started_at' => date('Y-m-d H:i:s', strtotime('-30 minutes')),
            'ended_at' => null,
            'duration_minutes' => 0,
            'recording_url' => null,
            'thumbnail_url' => 'https://example.com/thumbnails/fintech-future-lisa.jpg',
            'view_count' => 156,
            'like_count' => 23,
            'is_public' => 1,
            'settings' => json_encode(['quality' => 'HD', 'chat_enabled' => true, 'recording_enabled' => true]),
            'metadata' => json_encode(['tags' => ['FinTech', 'Banking', 'Innovation'], 'category' => 'Finance'])
        ],
        [
            'title' => 'Writing in the Digital Age: David Williams',
            'description' => 'Bestselling author David Williams discusses the evolution of publishing, digital storytelling, and the future of literature.',
            'slug' => 'digital-writing-david-williams',
            'host_id' => $users[0]['id'], // John Smith
            'guest_id' => $users[4]['id'], // David Williams
            'status' => 'scheduled',
            'scheduled_at' => date('Y-m-d H:i:s', strtotime('+2 days')),
            'started_at' => null,
            'ended_at' => null,
            'duration_minutes' => 0,
            'recording_url' => null,
            'thumbnail_url' => 'https://example.com/thumbnails/digital-writing-david.jpg',
            'view_count' => 0,
            'like_count' => 0,
            'is_public' => 1,
            'settings' => json_encode(['quality' => 'HD', 'chat_enabled' => true, 'recording_enabled' => true]),
            'metadata' => json_encode(['tags' => ['Writing', 'Publishing', 'Literature'], 'category' => 'Literature'])
        ]
    ];
    
    $interviewIds = [];
    foreach ($interviews as $interview) {
        $stmt = $pdo->prepare("
            INSERT INTO interviews (title, description, slug, host_id, guest_id, status, scheduled_at, started_at, ended_at, duration_minutes, recording_url, thumbnail_url, view_count, like_count, is_public, settings, metadata)
            VALUES (:title, :description, :slug, :host_id, :guest_id, :status, :scheduled_at, :started_at, :ended_at, :duration_minutes, :recording_url, :thumbnail_url, :view_count, :like_count, :is_public, :settings, :metadata)
        ");
        $stmt->execute($interview);
        $interviewIds[] = $pdo->lastInsertId();
    }
    $results[] = "✅ Created " . count($interviews) . " interviews";
    
    // 2. Create Analytics Data
    $analyticsData = [];
    foreach ($interviewIds as $index => $interviewId) {
        $baseMetrics = [
            ['metric_name' => 'total_views', 'metric_value' => $interviews[$index]['view_count']],
            ['metric_name' => 'total_likes', 'metric_value' => $interviews[$index]['like_count']],
            ['metric_name' => 'engagement_rate', 'metric_value' => round(($interviews[$index]['like_count'] / max($interviews[$index]['view_count'], 1)) * 100, 2)],
            ['metric_name' => 'average_watch_time', 'metric_value' => rand(15, 45)],
            ['metric_name' => 'completion_rate', 'metric_value' => rand(60, 95)],
            ['metric_name' => 'chat_messages', 'metric_value' => rand(50, 200)],
            ['metric_name' => 'peak_concurrent_viewers', 'metric_value' => rand(20, 100)],
            ['metric_name' => 'total_shares', 'metric_value' => rand(5, 25)]
        ];
        
        foreach ($baseMetrics as $metric) {
            $analyticsData[] = [
                'interview_id' => $interviewId,
                'metric_name' => $metric['metric_name'],
                'metric_value' => $metric['metric_value'],
                'metric_data' => json_encode(['timestamp' => date('Y-m-d H:i:s'), 'source' => 'system']),
                'recorded_at' => date('Y-m-d H:i:s', strtotime('-' . rand(1, 7) . ' days'))
            ];
        }
    }
    
    foreach ($analyticsData as $data) {
        $stmt = $pdo->prepare("
            INSERT INTO interview_analytics (interview_id, metric_name, metric_value, metric_data, recorded_at)
            VALUES (:interview_id, :metric_name, :metric_value, :metric_data, :recorded_at)
        ");
        $stmt->execute($data);
    }
    $results[] = "✅ Created " . count($analyticsData) . " analytics records";
    
    // 3. Create Backup Records
    $backups = [
        [
            'backup_name' => 'Daily Backup - ' . date('Y-m-d'),
            'backup_type' => 'full',
            'file_path' => '/backups/daily_backup_' . date('Ymd') . '.sql',
            'file_size' => 15728640, // 15MB
            'status' => 'completed',
            'created_by' => $users[0]['id'],
            'metadata' => json_encode(['tables' => ['users', 'interviews', 'analytics'], 'compression' => 'gzip']),
            'completed_at' => date('Y-m-d H:i:s', strtotime('-1 hour'))
        ],
        [
            'backup_name' => 'Weekly Backup - Week ' . date('W'),
            'backup_type' => 'full',
            'file_path' => '/backups/weekly_backup_week' . date('W') . '.sql',
            'file_size' => 52428800, // 50MB
            'status' => 'completed',
            'created_by' => $users[0]['id'],
            'metadata' => json_encode(['tables' => 'all', 'compression' => 'gzip', 'encryption' => true]),
            'completed_at' => date('Y-m-d H:i:s', strtotime('-2 days'))
        ]
    ];
    
    foreach ($backups as $backup) {
        $stmt = $pdo->prepare("
            INSERT INTO backup_records (backup_name, backup_type, file_path, file_size, status, created_by, metadata, completed_at)
            VALUES (:backup_name, :backup_type, :file_path, :file_size, :status, :created_by, :metadata, :completed_at)
        ");
        $stmt->execute($backup);
    }
    $results[] = "✅ Created " . count($backups) . " backup records";
    
    echo json_encode([
        'success' => true,
        'message' => 'Comprehensive dummy data created successfully!',
        'results' => $results,
        'summary' => [
            'users' => count($users),
            'interviews' => count($interviews),
            'analytics_records' => count($analyticsData),
            'backup_records' => count($backups),
            'interview_templates' => 3
        ],
        'test_data_ready' => true
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to create interviews and analytics: ' . $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
?>
