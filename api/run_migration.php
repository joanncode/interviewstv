<?php
/**
 * Run Interview Templates Migration
 */

require_once __DIR__ . '/config/database.php';

try {
    $database = new Database();
    $pdo = $database->getConnection();
    
    echo "Connected to database successfully.\n";
    
    // Read the migration file
    $migrationFile = __DIR__ . '/database/migrations/009_create_interview_system_tables_sqlite.sql';
    $sql = file_get_contents($migrationFile);
    
    if (!$sql) {
        throw new Exception("Could not read migration file");
    }
    
    // Split SQL into individual statements
    $statements = array_filter(array_map('trim', explode(';', $sql)));
    
    $pdo->beginTransaction();
    
    foreach ($statements as $statement) {
        if (empty($statement) || strpos($statement, '--') === 0) {
            continue;
        }
        
        try {
            $pdo->exec($statement);
            echo "Executed: " . substr($statement, 0, 50) . "...\n";
        } catch (PDOException $e) {
            echo "Warning: " . $e->getMessage() . "\n";
            echo "Statement: " . substr($statement, 0, 100) . "...\n";
        }
    }
    
    $pdo->commit();
    echo "\nMigration completed successfully!\n";
    
    // Verify templates were inserted
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM interview_templates");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Templates in database: " . $result['count'] . "\n";
    
} catch (Exception $e) {
    if (isset($pdo)) {
        $pdo->rollback();
    }
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
