<?php
/**
 * Setup MySQL Database for Interviews.tv
 */

header('Content-Type: application/json');

try {
    // Try to connect to MySQL without database first
    $host = 'localhost';
    $username = 'root';
    $password = '';
    
    // Try different connection methods
    $connectionMethods = [
        ['user' => 'root', 'pass' => ''],
        ['user' => 'root', 'pass' => 'root'],
        ['user' => 'jack', 'pass' => ''],
        ['user' => 'interviews_user', 'pass' => 'interviews_pass'],
    ];
    
    $connection = null;
    $usedMethod = null;
    
    foreach ($connectionMethods as $method) {
        try {
            $dsn = "mysql:host=$host";
            $connection = new PDO($dsn, $method['user'], $method['pass']);
            $connection->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $usedMethod = $method;
            break;
        } catch (PDOException $e) {
            continue;
        }
    }
    
    if (!$connection) {
        throw new Exception("Could not connect to MySQL with any method");
    }
    
    // Create database and user
    $setupQueries = [
        "CREATE DATABASE IF NOT EXISTS interviews_tv CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
        "CREATE USER IF NOT EXISTS 'interviews_user'@'localhost' IDENTIFIED BY 'interviews_pass'",
        "GRANT ALL PRIVILEGES ON interviews_tv.* TO 'interviews_user'@'localhost'",
        "FLUSH PRIVILEGES"
    ];
    
    $results = [];
    foreach ($setupQueries as $query) {
        try {
            $connection->exec($query);
            $results[] = "✅ " . substr($query, 0, 50) . "...";
        } catch (PDOException $e) {
            $results[] = "⚠️ " . substr($query, 0, 50) . "... - " . $e->getMessage();
        }
    }
    
    // Test connection to new database
    try {
        $testDsn = "mysql:host=$host;dbname=interviews_tv;charset=utf8mb4";
        $testConnection = new PDO($testDsn, 'interviews_user', 'interviews_pass');
        $testConnection->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Create a simple test table
        $testConnection->exec("CREATE TABLE IF NOT EXISTS test_table (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100))");
        $testConnection->exec("INSERT INTO test_table (name) VALUES ('Test Entry') ON DUPLICATE KEY UPDATE name=name");
        
        $stmt = $testConnection->query("SELECT COUNT(*) as count FROM test_table");
        $testCount = $stmt->fetch()['count'];
        
        echo json_encode([
            'success' => true,
            'message' => 'MySQL database setup successful',
            'connection_method' => $usedMethod,
            'setup_results' => $results,
            'test_connection' => 'Success',
            'test_table_count' => $testCount,
            'next_steps' => [
                'Database created: interviews_tv',
                'User created: interviews_user',
                'Ready to run migrations',
                'Ready to populate with dummy data'
            ]
        ], JSON_PRETTY_PRINT);
        
    } catch (PDOException $e) {
        throw new Exception("Database setup completed but test connection failed: " . $e->getMessage());
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'MySQL setup failed: ' . $e->getMessage(),
        'suggestions' => [
            'Check if MySQL/MariaDB is running: systemctl status mysql',
            'Try setting MySQL root password',
            'Check MySQL user permissions',
            'Consider using SQLite for development'
        ]
    ], JSON_PRETTY_PRINT);
}
?>
