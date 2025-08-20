<?php

require_once __DIR__ . '/../../api/config/bootstrap.php';

class Migration {
    private $pdo;
    
    public function __construct() {
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        
        $this->pdo = new PDO($dsn, $config['username'], $config['password'], $config['options']);
    }
    
    public function run() {
        echo "Starting database migrations...\n";
        
        try {
            $this->pdo->beginTransaction();
            
            // Create migrations table to track applied migrations
            $this->createMigrationsTable();
            
            // Run all migrations in order
            $migrations = [
                '001_create_users_table',
                '002_create_events_table',
                '003_create_businesses_table',
                '004_create_communities_table',
                '005_create_interviews_table',
                '006_create_comments_table',
                '007_create_followers_table',
                '008_create_community_members_table',
                '009_create_interview_media_table',
                '010_create_likes_table'
            ];
            
            foreach ($migrations as $migration) {
                if (!$this->isMigrationApplied($migration)) {
                    echo "Running migration: {$migration}\n";
                    $this->runMigration($migration);
                    $this->markMigrationAsApplied($migration);
                } else {
                    echo "Skipping migration: {$migration} (already applied)\n";
                }
            }
            
            $this->pdo->commit();
            echo "All migrations completed successfully!\n";
            
        } catch (Exception $e) {
            $this->pdo->rollback();
            echo "Migration failed: " . $e->getMessage() . "\n";
            exit(1);
        }
    }
    
    private function createMigrationsTable() {
        $sql = "CREATE TABLE IF NOT EXISTS migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            migration VARCHAR(255) NOT NULL UNIQUE,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB";
        
        $this->pdo->exec($sql);
    }
    
    private function isMigrationApplied($migration) {
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM migrations WHERE migration = ?");
        $stmt->execute([$migration]);
        return $stmt->fetchColumn() > 0;
    }
    
    private function markMigrationAsApplied($migration) {
        $stmt = $this->pdo->prepare("INSERT INTO migrations (migration) VALUES (?)");
        $stmt->execute([$migration]);
    }
    
    private function runMigration($migration) {
        $filename = __DIR__ . "/{$migration}.php";
        if (!file_exists($filename)) {
            throw new Exception("Migration file not found: {$filename}");
        }
        
        require $filename;
        
        // Execute the migration function
        $functionName = str_replace('-', '_', $migration);
        if (function_exists($functionName)) {
            $functionName($this->pdo);
        } else {
            throw new Exception("Migration function not found: {$functionName}");
        }
    }
}

// Run migrations if called directly
if (php_sapi_name() === 'cli') {
    $migration = new Migration();
    $migration->run();
}
