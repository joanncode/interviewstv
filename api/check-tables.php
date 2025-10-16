<?php
/**
 * Check Database Table Structure
 */

header('Content-Type: application/json');

try {
    // Connect to MySQL
    $dsn = "mysql:host=localhost;dbname=interviews_tv;charset=utf8mb4";
    $pdo = new PDO($dsn, 'interviews_user', 'interviews_pass');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Get all tables
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    $tableStructures = [];
    foreach ($tables as $table) {
        $stmt = $pdo->query("DESCRIBE $table");
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $tableStructures[$table] = $columns;
    }
    
    // Get sample data from users table if it exists
    $sampleData = [];
    if (in_array('users', $tables)) {
        $stmt = $pdo->query("SELECT * FROM users LIMIT 3");
        $sampleData['users'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Database structure retrieved',
        'tables' => $tables,
        'table_structures' => $tableStructures,
        'sample_data' => $sampleData,
        'total_tables' => count($tables)
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to check tables: ' . $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
?>
