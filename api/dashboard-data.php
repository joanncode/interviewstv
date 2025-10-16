<?php
/**
 * Dashboard Data API Endpoint
 * Provides real data for the analytics dashboard
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

try {
    // Connect to MySQL
    $dsn = "mysql:host=localhost;dbname=interviews_tv;charset=utf8mb4";
    $pdo = new PDO($dsn, 'interviews_user', 'interviews_pass');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // 1. Get Overview Statistics
    $stmt = $pdo->query("
        SELECT 
            COUNT(*) as total_interviews,
            SUM(view_count) as total_views,
            SUM(like_count) as total_likes,
            SUM(comment_count) as total_comments
        FROM interviews 
        WHERE is_published = 1
    ");
    $overview = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Get user count
    $stmt = $pdo->query("SELECT COUNT(*) as total_users FROM users WHERE is_active = 1");
    $overview['total_users'] = $stmt->fetch()['total_users'];
    
    // 2. Get Recent Interviews
    $stmt = $pdo->query("
        SELECT i.title, i.slug, i.view_count, i.like_count, i.created_at, u.name as creator_name
        FROM interviews i
        JOIN users u ON i.creator_id = u.id
        WHERE i.is_published = 1
        ORDER BY i.created_at DESC
        LIMIT 5
    ");
    $recentInterviews = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 3. Get Popular Interviews
    $stmt = $pdo->query("
        SELECT i.title, i.slug, i.view_count, i.like_count, u.name as creator_name
        FROM interviews i
        JOIN users u ON i.creator_id = u.id
        WHERE i.is_published = 1
        ORDER BY i.view_count DESC
        LIMIT 5
    ");
    $popularInterviews = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 4. Get Category Statistics
    $stmt = $pdo->query("
        SELECT 
            i.category,
            COUNT(*) as interview_count,
            SUM(i.view_count) as total_views,
            AVG(i.view_count) as avg_views
        FROM interviews i
        WHERE i.is_published = 1
        GROUP BY i.category
        ORDER BY interview_count DESC
    ");
    $categoryStats = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 5. Get User Activity
    $stmt = $pdo->query("
        SELECT u.name, u.role, COUNT(i.id) as interview_count
        FROM users u
        LEFT JOIN interviews i ON u.id = i.creator_id AND i.is_published = 1
        WHERE u.is_active = 1
        GROUP BY u.id, u.name, u.role
        ORDER BY interview_count DESC
        LIMIT 10
    ");
    $userActivity = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 6. Get Engagement Metrics
    $stmt = $pdo->query("
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as interviews_created,
            SUM(view_count) as daily_views,
            SUM(like_count) as daily_likes
        FROM interviews
        WHERE is_published = 1 AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
    ");
    $engagementData = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 7. Get Top Performers
    $stmt = $pdo->query("
        SELECT 
            i.title,
            i.view_count,
            i.like_count,
            ROUND((i.like_count / GREATEST(i.view_count, 1)) * 100, 2) as engagement_rate,
            u.name as creator_name
        FROM interviews i
        JOIN users u ON i.creator_id = u.id
        WHERE i.is_published = 1 AND i.view_count > 0
        ORDER BY engagement_rate DESC
        LIMIT 5
    ");
    $topPerformers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 8. Get Recent Comments
    $stmt = $pdo->query("
        SELECT 
            c.content,
            c.created_at,
            u.name as user_name,
            i.title as interview_title
        FROM comments c
        JOIN users u ON c.user_id = u.id
        JOIN interviews i ON c.interview_id = i.id
        ORDER BY c.created_at DESC
        LIMIT 10
    ");
    $recentComments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Calculate growth metrics (mock data for demo)
    $growth = [
        'views_growth' => '+23.5%',
        'users_growth' => '+12.8%',
        'interviews_growth' => '+8.3%',
        'engagement_growth' => '+15.2%'
    ];
    
    // Format data to match dashboard expectations
    $dashboardData = [
        'user_analytics' => [
            'overview' => [
                'total_interviews' => (int)$overview['total_interviews'],
                'total_views' => (int)$overview['total_views'],
                'total_followers' => (int)$overview['total_users'], // Using users as followers
                'total_likes' => (int)$overview['total_likes']
            ]
        ],
        'interviews' => [
            'recent' => $recentInterviews,
            'popular' => $popularInterviews,
            'top_performers' => $topPerformers
        ],
        'engagement' => [
            'daily_data' => $engagementData,
            'category_stats' => $categoryStats
        ],
        'activity' => [
            'recent_comments' => $recentComments,
            'user_activity' => $userActivity
        ],
        'growth_metrics' => $growth
    ];

    echo json_encode([
        'success' => true,
        'timestamp' => date('Y-m-d H:i:s'),
        'data' => $dashboardData,
        'meta' => [
            'total_records' => [
                'interviews' => count($recentInterviews),
                'categories' => count($categoryStats),
                'users' => count($userActivity),
                'comments' => count($recentComments)
            ],
            'data_freshness' => 'real-time',
            'cache_status' => 'live'
        ]
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch dashboard data: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
}
?>
