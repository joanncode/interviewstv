<?php

/**
 * PHPUnit Bootstrap File
 * Sets up the testing environment for Interviews.tv
 */

// Set error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set timezone
date_default_timezone_set('UTC');

// Define constants
define('APP_ROOT', dirname(__DIR__));
define('TESTING', true);

// Load autoloader
require_once APP_ROOT . '/vendor/autoload.php';

// Load environment variables for testing
$dotenv = Dotenv\Dotenv::createImmutable(APP_ROOT, '.env.testing');
$dotenv->safeLoad();

// Set testing environment
$_ENV['APP_ENV'] = 'testing';
$_ENV['DB_DATABASE'] = 'interviews_tv_test';

// Load configuration
require_once APP_ROOT . '/src/config.php';

// Initialize test database
initializeTestDatabase();

/**
 * Initialize test database
 */
function initializeTestDatabase()
{
    try {
        $config = config('database.connections.mysql');
        
        // Create test database if it doesn't exist
        $pdo = new PDO(
            "mysql:host={$config['host']};port={$config['port']};charset={$config['charset']}",
            $config['username'],
            $config['password'],
            $config['options']
        );
        
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$config['database']}`");
        $pdo->exec("USE `{$config['database']}`");
        
        // Run migrations
        runTestMigrations($pdo);
        
        echo "Test database initialized successfully.\n";
        
    } catch (Exception $e) {
        echo "Failed to initialize test database: " . $e->getMessage() . "\n";
        exit(1);
    }
}

/**
 * Run test migrations
 */
function runTestMigrations($pdo)
{
    $migrationFiles = [
        APP_ROOT . '/database/migrations/create_users_table.sql',
        APP_ROOT . '/database/migrations/create_interviews_table.sql',
        APP_ROOT . '/database/migrations/create_comments_table.sql',
        APP_ROOT . '/database/migrations/create_likes_table.sql',
        APP_ROOT . '/database/migrations/create_follows_table.sql',
        APP_ROOT . '/database/migrations/create_notifications_tables.sql',
        APP_ROOT . '/database/migrations/create_media_table.sql',
        APP_ROOT . '/database/migrations/create_events_table.sql',
        APP_ROOT . '/database/migrations/create_businesses_table.sql'
    ];
    
    foreach ($migrationFiles as $file) {
        if (file_exists($file)) {
            $sql = file_get_contents($file);
            
            // Split by semicolon and execute each statement
            $statements = array_filter(array_map('trim', explode(';', $sql)));
            
            foreach ($statements as $statement) {
                if (!empty($statement)) {
                    try {
                        $pdo->exec($statement);
                    } catch (PDOException $e) {
                        // Ignore table already exists errors
                        if (strpos($e->getMessage(), 'already exists') === false) {
                            throw $e;
                        }
                    }
                }
            }
        }
    }
}

/**
 * Clean up test database after tests
 */
function cleanupTestDatabase()
{
    try {
        $config = config('database.connections.mysql');
        $pdo = new PDO(
            "mysql:host={$config['host']};port={$config['port']};charset={$config['charset']}",
            $config['username'],
            $config['password'],
            $config['options']
        );
        
        // Truncate all tables
        $tables = [
            'notification_analytics',
            'notification_deliveries', 
            'notification_digest',
            'notification_subscriptions',
            'notification_batches',
            'notification_channels',
            'notification_preferences',
            'notifications',
            'media',
            'event_attendees',
            'events',
            'business_verifications',
            'businesses',
            'follows',
            'likes',
            'comments',
            'interviews',
            'user_sessions',
            'users'
        ];
        
        $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
        
        foreach ($tables as $table) {
            try {
                $pdo->exec("TRUNCATE TABLE `{$table}`");
            } catch (PDOException $e) {
                // Ignore if table doesn't exist
            }
        }
        
        $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
        
    } catch (Exception $e) {
        echo "Warning: Failed to cleanup test database: " . $e->getMessage() . "\n";
    }
}

// Register shutdown function to cleanup
register_shutdown_function('cleanupTestDatabase');
