<?php

/**
 * Database Setup Script
 * Creates all necessary tables for the Interviews.tv platform
 */

require_once __DIR__ . '/config/database.php';

try {
    // Get database connection
    $database = new Database();
    $pdo = $database->getConnection();

    echo "🔗 Connected to database successfully!\n";
    echo "📊 Setting up complete database schema...\n";

    // Read the schema file
    $schemaFile = __DIR__ . '/../database/schema.sql';
    
    if (!file_exists($schemaFile)) {
        throw new Exception("Schema file not found: $schemaFile");
    }
    
    $schema = file_get_contents($schemaFile);
    
    // Split into statements and filter out comments and database creation
    $statements = array_filter(
        array_map('trim', explode(';', $schema)),
        function($stmt) {
            return !empty($stmt) && 
                   !preg_match('/^\s*--/', $stmt) && 
                   !preg_match('/^\s*(CREATE DATABASE|USE)/', $stmt);
        }
    );

    $pdo->beginTransaction();
    
    try {
        $createdTables = 0;
        
        foreach ($statements as $statement) {
            $trimmedStatement = trim($statement);
            if (!empty($trimmedStatement)) {
                $pdo->exec($trimmedStatement);
                
                // Count table creations
                if (preg_match('/^\s*CREATE TABLE/i', $trimmedStatement)) {
                    $createdTables++;
                }
            }
        }
        
        $pdo->commit();
        echo "✅ Database schema created successfully!\n";
        echo "📋 Created/updated $createdTables tables.\n";
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }

    // Verify tables were created
    echo "\n🔍 Verifying database structure...\n";
    
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo "📊 Total tables: " . count($tables) . "\n";
    
    $expectedTables = [
        'users', 'user_permissions', 'businesses', 'interviews', 'comments', 
        'categories', 'content_flags', 'moderation_history', 'security_events',
        'user_sessions', 'email_verification_tokens', 'password_reset_tokens'
    ];
    
    $missingTables = array_diff($expectedTables, $tables);
    
    if (empty($missingTables)) {
        echo "✅ All required tables are present!\n";
    } else {
        echo "⚠️  Missing tables: " . implode(', ', $missingTables) . "\n";
    }
    
    echo "\n📋 Available tables:\n";
    foreach ($tables as $table) {
        echo "  - $table\n";
    }

    echo "\n🎯 Database is ready for seeding!\n";
    echo "💡 Run 'php api/seed_admin_data.php' to add sample data.\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "📍 File: " . $e->getFile() . " Line: " . $e->getLine() . "\n";
    
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
        echo "🔄 Transaction rolled back.\n";
    }
    
    exit(1);
}
