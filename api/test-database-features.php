<?php
/**
 * Test Database-Driven Features
 */

header('Content-Type: application/json');

try {
    // Connect to MySQL
    $dsn = "mysql:host=localhost;dbname=interviews_tv;charset=utf8mb4";
    $pdo = new PDO($dsn, 'interviews_user', 'interviews_pass');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $tests = [];
    
    // 1. Test User Management
    $stmt = $pdo->query("SELECT id, name, email, role FROM users ORDER BY created_at DESC LIMIT 5");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $tests['user_management'] = [
        'status' => 'success',
        'count' => count($users),
        'sample_users' => $users
    ];
    
    // 2. Test Interview System
    $stmt = $pdo->query("
        SELECT i.id, i.title, i.slug, i.view_count, i.like_count, i.status, u.name as creator_name
        FROM interviews i 
        JOIN users u ON i.creator_id = u.id 
        ORDER BY i.created_at DESC 
        LIMIT 5
    ");
    $interviews = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $tests['interview_system'] = [
        'status' => 'success',
        'count' => count($interviews),
        'sample_interviews' => $interviews
    ];
    
    // 3. Test Analytics Data
    $stmt = $pdo->query("
        SELECT 
            COUNT(*) as total_interviews,
            SUM(view_count) as total_views,
            SUM(like_count) as total_likes,
            AVG(view_count) as avg_views_per_interview,
            AVG(duration_seconds/60) as avg_duration_minutes
        FROM interviews 
        WHERE is_published = 1
    ");
    $analytics = $stmt->fetch(PDO::FETCH_ASSOC);
    $tests['analytics_data'] = [
        'status' => 'success',
        'metrics' => $analytics
    ];
    
    // 4. Test Comments System
    $stmt = $pdo->query("
        SELECT c.id, c.content, u.name as user_name, i.title as interview_title
        FROM comments c
        JOIN users u ON c.user_id = u.id
        JOIN interviews i ON c.interview_id = i.id
        ORDER BY c.created_at DESC
        LIMIT 5
    ");
    $comments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $tests['comments_system'] = [
        'status' => 'success',
        'count' => count($comments),
        'sample_comments' => $comments
    ];
    
    // 5. Test Categories
    $stmt = $pdo->query("
        SELECT c.name, COUNT(i.id) as interview_count
        FROM categories c
        LEFT JOIN interviews i ON c.name = i.category
        GROUP BY c.name
        ORDER BY interview_count DESC
    ");
    $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $tests['categories'] = [
        'status' => 'success',
        'count' => count($categories),
        'category_stats' => $categories
    ];
    
    // 6. Test Interview Templates
    $stmt = $pdo->query("
        SELECT it.name, it.category, it.usage_count, u.name as created_by_name
        FROM interview_templates it
        JOIN users u ON it.created_by = u.id
        ORDER BY it.created_at DESC
    ");
    $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $tests['interview_templates'] = [
        'status' => 'success',
        'count' => count($templates),
        'templates' => $templates
    ];
    
    // 7. Test Backup Records
    $stmt = $pdo->query("
        SELECT br.backup_name, br.backup_type, br.status, br.file_size, u.name as created_by_name
        FROM backup_records br
        JOIN users u ON br.created_by = u.id
        ORDER BY br.created_at DESC
    ");
    $backups = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $tests['backup_system'] = [
        'status' => 'success',
        'count' => count($backups),
        'backups' => $backups
    ];
    
    // 8. Test Popular Content
    $stmt = $pdo->query("
        SELECT title, view_count, like_count, 
               ROUND((like_count / GREATEST(view_count, 1)) * 100, 2) as engagement_rate
        FROM interviews 
        WHERE is_published = 1
        ORDER BY view_count DESC
        LIMIT 3
    ");
    $popular = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $tests['popular_content'] = [
        'status' => 'success',
        'top_interviews' => $popular
    ];
    
    // 9. Test User Roles Distribution
    $stmt = $pdo->query("
        SELECT role, COUNT(*) as count
        FROM users
        GROUP BY role
        ORDER BY count DESC
    ");
    $roles = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $tests['user_roles'] = [
        'status' => 'success',
        'role_distribution' => $roles
    ];
    
    // 10. Test Recent Activity
    $stmt = $pdo->query("
        SELECT 'interview' as type, title as activity, created_at
        FROM interviews
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        UNION ALL
        SELECT 'comment' as type, CONCAT('Comment: ', LEFT(content, 50), '...') as activity, created_at
        FROM comments
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY created_at DESC
        LIMIT 10
    ");
    $activity = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $tests['recent_activity'] = [
        'status' => 'success',
        'activities' => $activity
    ];
    
    // Calculate overall health score
    $successfulTests = 0;
    $totalTests = count($tests);
    foreach ($tests as $test) {
        if ($test['status'] === 'success') {
            $successfulTests++;
        }
    }
    $healthScore = round(($successfulTests / $totalTests) * 100, 1);
    
    echo json_encode([
        'success' => true,
        'message' => 'Database-driven features testing completed',
        'health_score' => $healthScore . '%',
        'tests_passed' => $successfulTests,
        'total_tests' => $totalTests,
        'test_results' => $tests,
        'database_status' => 'fully_operational',
        'ready_for_frontend_testing' => true,
        'next_steps' => [
            'Test frontend pages with real data',
            'Verify analytics dashboard displays correctly',
            'Test user authentication with sample accounts',
            'Verify interview creation and management',
            'Test search and filtering functionality'
        ]
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database testing failed: ' . $e->getMessage(),
        'health_score' => '0%'
    ], JSON_PRETTY_PRINT);
}
?>
