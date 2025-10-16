<?php
/**
 * Interviews List API Endpoint
 * Provides interview data for the main page
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
    
    // Get query parameters
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 12;
    $category = isset($_GET['category']) ? $_GET['category'] : null;
    $search = isset($_GET['search']) ? $_GET['search'] : null;
    $sort = isset($_GET['sort']) ? $_GET['sort'] : 'recent';
    
    // Build WHERE clause
    $whereConditions = ["i.is_published = 1"];
    $params = [];
    
    if ($category) {
        $whereConditions[] = "i.category = :category";
        $params['category'] = $category;
    }
    
    if ($search) {
        $whereConditions[] = "(i.title LIKE :search OR i.description LIKE :search)";
        $params['search'] = "%$search%";
    }
    
    $whereClause = implode(' AND ', $whereConditions);
    
    // Build ORDER BY clause
    $orderBy = "i.created_at DESC";
    switch ($sort) {
        case 'popular':
            $orderBy = "i.view_count DESC";
            break;
        case 'liked':
            $orderBy = "i.like_count DESC";
            break;
        case 'commented':
            $orderBy = "i.comment_count DESC";
            break;
        case 'recent':
        default:
            $orderBy = "i.created_at DESC";
            break;
    }
    
    // Get interviews
    $sql = "
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
            i.comment_count,
            i.created_at,
            i.published_at,
            u.name as creator_name,
            u.avatar_url as creator_avatar
        FROM interviews i
        JOIN users u ON i.creator_id = u.id
        WHERE $whereClause
        ORDER BY $orderBy
        LIMIT :limit
    ";
    
    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue(":$key", $value);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    
    $interviews = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format the data
    foreach ($interviews as &$interview) {
        // Format duration
        $minutes = floor($interview['duration_seconds'] / 60);
        $seconds = $interview['duration_seconds'] % 60;
        $interview['duration_formatted'] = sprintf('%d:%02d', $minutes, $seconds);
        
        // Format view count
        if ($interview['view_count'] >= 1000) {
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
        $interview['published_at_formatted'] = $interview['published_at'] 
            ? date('M j, Y', strtotime($interview['published_at']))
            : null;
    }
    
    // Get total count for pagination
    $countSql = "
        SELECT COUNT(*) as total
        FROM interviews i
        WHERE $whereClause
    ";
    $countStmt = $pdo->prepare($countSql);
    foreach ($params as $key => $value) {
        $countStmt->bindValue(":$key", $value);
    }
    $countStmt->execute();
    $totalCount = $countStmt->fetch()['total'];
    
    // Get categories for filter
    $categoriesStmt = $pdo->query("
        SELECT category, COUNT(*) as count
        FROM interviews
        WHERE is_published = 1
        GROUP BY category
        ORDER BY count DESC
    ");
    $categories = $categoriesStmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => [
            'interviews' => $interviews,
            'pagination' => [
                'total' => (int)$totalCount,
                'limit' => $limit,
                'has_more' => $totalCount > $limit
            ],
            'filters' => [
                'categories' => $categories,
                'current_category' => $category,
                'current_search' => $search,
                'current_sort' => $sort
            ]
        ],
        'meta' => [
            'count' => count($interviews),
            'timestamp' => date('Y-m-d H:i:s'),
            'query_params' => $_GET
        ]
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch interviews: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
}
?>
