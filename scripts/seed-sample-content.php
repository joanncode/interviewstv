#!/usr/bin/env php
<?php

/**
 * Sample Content Seeding Script
 * 
 * Populates the database with high-quality sample data for demonstration
 * and user onboarding purposes.
 */

require_once __DIR__ . '/../api/config/config.php';
require_once __DIR__ . '/../api/database/seeders/SampleContentSeeder.php';

// Database connection
try {
    $pdo = getDatabase();
    if (!$pdo) {
        throw new Exception("Failed to get database connection");
    }
} catch (Exception $e) {
    die("Database connection failed: " . $e->getMessage() . "\n");
}

echo "🚀 Interviews.tv Sample Content Seeder\n";
echo "=====================================\n\n";

// Check if sample data already exists
$stmt = $pdo->query("SELECT COUNT(*) as count FROM users WHERE email LIKE '%@example.com'");
$existingCount = $stmt->fetch()['count'];

if ($existingCount > 0) {
    echo "⚠️  Sample data already exists ($existingCount users found).\n";
    echo "Do you want to:\n";
    echo "1. Skip seeding (recommended)\n";
    echo "2. Clear existing sample data and reseed\n";
    echo "3. Add additional sample data\n";
    echo "\nChoice (1-3): ";
    
    $choice = trim(fgets(STDIN));
    
    switch ($choice) {
        case '2':
            echo "\n🗑️  Clearing existing sample data...\n";
            clearSampleData($pdo);
            break;
        case '3':
            echo "\n➕ Adding additional sample data...\n";
            break;
        case '1':
        default:
            echo "\n✅ Skipping seeding. Sample data already exists.\n";
            exit(0);
    }
}

// Run the seeder
$seeder = new SampleContentSeeder($pdo);
$seeder->run();

echo "\n🎉 Sample content seeding completed successfully!\n";
echo "\n📋 Next Steps:\n";
echo "   1. Visit the platform to see the sample content\n";
echo "   2. Test user onboarding with the demo accounts\n";
echo "   3. Use the sample data for screenshots and marketing\n";
echo "   4. Customize the content for your specific needs\n";

/**
 * Clear existing sample data
 */
function clearSampleData($pdo)
{
    $tables = [
        'likes' => 'user_id IN (SELECT id FROM users WHERE email LIKE "%@example.com")',
        'comments' => 'user_id IN (SELECT id FROM users WHERE email LIKE "%@example.com")',
        'followers' => 'follower_id IN (SELECT id FROM users WHERE email LIKE "%@example.com") OR following_id IN (SELECT id FROM users WHERE email LIKE "%@example.com")',
        'interviews' => 'creator_id IN (SELECT id FROM users WHERE email LIKE "%@example.com")',
        'events' => 'organizer_id IN (SELECT id FROM users WHERE email LIKE "%@example.com")',
        'businesses' => 'owner_id IN (SELECT id FROM users WHERE email LIKE "%@example.com")',
        'users' => 'email LIKE "%@example.com"'
    ];

    foreach ($tables as $table => $condition) {
        $stmt = $pdo->prepare("DELETE FROM $table WHERE $condition");
        $stmt->execute();
        echo "   ✓ Cleared $table\n";
    }
    
    echo "   ✅ Sample data cleared\n\n";
}
