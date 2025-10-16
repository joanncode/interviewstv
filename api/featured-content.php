<?php
/**
 * Featured Content API Endpoint
 * Provides featured interviews and content for the homepage
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
    
    // 1. Get Featured Interviews
    $stmt = $pdo->query("
        SELECT 
            i.id,
            i.title,
            i.slug,
            i.description,
            i.category,
            i.thumbnail_url,
            i.duration_seconds,
            i.view_count,
            i.like_count,
            i.created_at,
            u.name as creator_name,
            u.avatar_url as creator_avatar
        FROM interviews i
        JOIN users u ON i.creator_id = u.id
        WHERE i.is_published = 1 AND i.is_featured = 1
        ORDER BY i.view_count DESC
        LIMIT 6
    ");
    $featuredInterviews = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 2. Get Recent Interviews
    $stmt = $pdo->query("
        SELECT 
            i.id,
            i.title,
            i.slug,
            i.description,
            i.category,
            i.thumbnail_url,
            i.duration_seconds,
            i.view_count,
            i.like_count,
            i.created_at,
            u.name as creator_name,
            u.avatar_url as creator_avatar
        FROM interviews i
        JOIN users u ON i.creator_id = u.id
        WHERE i.is_published = 1
        ORDER BY i.created_at DESC
        LIMIT 8
    ");
    $recentInterviews = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 3. Get Popular Interviews
    $stmt = $pdo->query("
        SELECT 
            i.id,
            i.title,
            i.slug,
            i.description,
            i.category,
            i.thumbnail_url,
            i.duration_seconds,
            i.view_count,
            i.like_count,
            i.created_at,
            u.name as creator_name,
            u.avatar_url as creator_avatar
        FROM interviews i
        JOIN users u ON i.creator_id = u.id
        WHERE i.is_published = 1
        ORDER BY i.view_count DESC
        LIMIT 8
    ");
    $popularInterviews = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 4. Get Categories with counts
    $stmt = $pdo->query("
        SELECT 
            category,
            COUNT(*) as interview_count,
            SUM(view_count) as total_views
        FROM interviews
        WHERE is_published = 1
        GROUP BY category
        ORDER BY interview_count DESC
        LIMIT 10
    ");
    $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 5. Get Platform Statistics
    $stmt = $pdo->query("
        SELECT 
            COUNT(*) as total_interviews,
            SUM(view_count) as total_views,
            SUM(like_count) as total_likes
        FROM interviews 
        WHERE is_published = 1
    ");
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $stmt = $pdo->query("SELECT COUNT(*) as total_users FROM users WHERE is_active = 1");
    $stats['total_users'] = $stmt->fetch()['total_users'];
    
    // Format all interview data
    $allInterviews = [$featuredInterviews, $recentInterviews, $popularInterviews];
    foreach ($allInterviews as &$interviewGroup) {
        foreach ($interviewGroup as &$interview) {
            // Format duration
            $minutes = floor($interview['duration_seconds'] / 60);
            $seconds = $interview['duration_seconds'] % 60;
            $interview['duration_formatted'] = sprintf('%d:%02d', $minutes, $seconds);
            
            // Format view count
            if ($interview['view_count'] >= 1000000) {
                $interview['view_count_formatted'] = round($interview['view_count'] / 1000000, 1) . 'M';
            } elseif ($interview['view_count'] >= 1000) {
                $interview['view_count_formatted'] = round($interview['view_count'] / 1000, 1) . 'K';
            } else {
                $interview['view_count_formatted'] = $interview['view_count'];
            }
            
            // Add engagement rate
            $interview['engagement_rate'] = $interview['view_count'] > 0 
                ? round(($interview['like_count'] / $interview['view_count']) * 100, 1)
                : 0;
            
            // Format dates
            $interview['created_at_formatted'] = date('M j, Y', strtotime($interview['created_at']));
            $interview['time_ago'] = timeAgo($interview['created_at']);
            
            // Add placeholder thumbnail if none exists
            if (empty($interview['thumbnail_url'])) {
                $interview['thumbnail_url'] = 'https://via.placeholder.com/400x225/2a2a2a/ffffff?text=' . urlencode($interview['title']);
            }
            
            // Add placeholder avatar if none exists
            if (empty($interview['creator_avatar'])) {
                $interview['creator_avatar'] = 'https://via.placeholder.com/40x40/FF0000/ffffff?text=' . substr($interview['creator_name'], 0, 1);
            }
        }
    }
    
    echo json_encode([
        'success' => true,
        'timestamp' => date('Y-m-d H:i:s'),
        'data' => [
            'featured_interviews' => $featuredInterviews,
            'recent_interviews' => $recentInterviews,
            'popular_interviews' => $popularInterviews,
            'categories' => $categories,
            'platform_stats' => $stats
        ],
        'meta' => [
            'featured_count' => count($featuredInterviews),
            'recent_count' => count($recentInterviews),
            'popular_count' => count($popularInterviews),
            'categories_count' => count($categories),
            'cache_status' => 'live'
        ]
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch featured content: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
}

/**
 * Helper function to calculate time ago
 */
function timeAgo($datetime) {
    $time = time() - strtotime($datetime);
    
    if ($time < 60) return 'just now';
    if ($time < 3600) return floor($time/60) . ' minutes ago';
    if ($time < 86400) return floor($time/3600) . ' hours ago';
    if ($time < 2592000) return floor($time/86400) . ' days ago';
    if ($time < 31536000) return floor($time/2592000) . ' months ago';
    return floor($time/31536000) . ' years ago';
}
?>
