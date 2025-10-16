<?php
/**
 * Test Database Connection and Create Sample Data
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    // Try to connect using SQLite3 class (different from PDO)
    $dbPath = __DIR__ . '/../interviews_tv.db';
    
    if (!file_exists($dbPath)) {
        throw new Exception("Database file not found: $dbPath");
    }
    
    // Test SQLite3 connection
    if (class_exists('SQLite3')) {
        $db = new SQLite3($dbPath);
        
        // Test query
        $result = $db->query("SELECT name FROM sqlite_master WHERE type='table' LIMIT 5");
        $tables = [];
        while ($row = $result->fetchArray()) {
            $tables[] = $row['name'];
        }
        
        // Get some sample data
        $userCount = 0;
        $interviewCount = 0;
        
        if (in_array('users', $tables)) {
            $result = $db->query("SELECT COUNT(*) as count FROM users");
            $row = $result->fetchArray();
            $userCount = $row['count'];
        }
        
        if (in_array('interviews', $tables)) {
            $result = $db->query("SELECT COUNT(*) as count FROM interviews");
            $row = $result->fetchArray();
            $interviewCount = $row['count'];
        }
        
        $db->close();
        
        echo json_encode([
            'success' => true,
            'message' => 'Database connection successful using SQLite3',
            'database' => [
                'path' => $dbPath,
                'size' => filesize($dbPath) . ' bytes',
                'tables_found' => count($tables),
                'sample_tables' => $tables,
                'data_counts' => [
                    'users' => $userCount,
                    'interviews' => $interviewCount
                ]
            ],
            'connection_method' => 'SQLite3 class'
        ], JSON_PRETTY_PRINT);
        
    } else {
        throw new Exception("SQLite3 class not available");
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed: ' . $e->getMessage(),
        'available_classes' => [
            'SQLite3' => class_exists('SQLite3'),
            'PDO' => class_exists('PDO'),
        ],
        'file_info' => [
            'exists' => file_exists($dbPath ?? ''),
            'readable' => is_readable($dbPath ?? ''),
            'size' => file_exists($dbPath ?? '') ? filesize($dbPath) : 0
        ]
    ], JSON_PRETTY_PRINT);
}
?>
