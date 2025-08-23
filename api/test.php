<?php
/**
 * Simple API Test Endpoint
 * Check if API server is running and database is connected
 */

require_once 'config/cors.php';

try {
    // Test database connection
    require_once 'config/database.php';
    require_once 'config/json_database.php';

    $dbType = 'Unknown';
    $userCount = 0;

    try {
        $database = new Database();
        $db = $database->getConnection();

        // Test query
        $stmt = $db->prepare("SELECT COUNT(*) as user_count FROM users");
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        $dbType = 'MySQL/MariaDB';
        $userCount = $result['user_count'];

    } catch (Exception $dbException) {
        // Fallback to JSON database
        $jsonDb = new JsonDatabase();
        $stats = $jsonDb->getUserStats();

        $dbType = 'JSON (Fallback)';
        $userCount = $stats['total_users'];
    }

    ApiResponse::success([
        'status' => 'API server is running',
        'database' => $dbType,
        'user_count' => $userCount,
        'timestamp' => date('Y-m-d H:i:s')
    ], 'API test successful');

} catch (Exception $e) {
    ApiResponse::error('API test failed: ' . $e->getMessage(), 500);
}
?>
