<?php

/**
 * Database Seeder for Admin Test Data
 * This script populates the database with sample data for testing admin features
 */

require_once __DIR__ . '/config/database.php';

try {
    // Get database connection using the Database class
    $database = new Database();
    $pdo = $database->getConnection();

    echo "🔗 Connected to database successfully!\n";

    // Check if we already have data
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM users WHERE email = 'admin@interviews.tv'");
    $result = $stmt->fetch();
    
    if ($result['count'] > 0) {
        echo "⚠️  Admin test data already exists. Do you want to reset it? (y/N): ";
        $handle = fopen("php://stdin", "r");
        $line = fgets($handle);
        fclose($handle);
        
        if (trim(strtolower($line)) !== 'y') {
            echo "❌ Seeding cancelled.\n";
            exit(0);
        }
        
        // Clear existing test data
        echo "🧹 Clearing existing test data...\n";
        
        $pdo->exec("DELETE FROM moderation_history WHERE moderator_id = 1");
        $pdo->exec("DELETE FROM security_events WHERE user_id IN (1,2,3,4,5,6,7,8,9,10) OR user_id IS NULL");
        $pdo->exec("DELETE FROM content_flags WHERE reporter_id IN (1,2,3,4,5,6,7,8,9,10)");
        $pdo->exec("DELETE FROM comments WHERE user_id IN (1,2,3,4,5,6,7,8,9,10)");
        $pdo->exec("DELETE FROM businesses WHERE owner_id IN (1,2,3,4,5,6,7,8,9,10)");
        $pdo->exec("DELETE FROM interviews WHERE interviewer_id IN (1,2,3,4,5,6,7,8,9,10)");
        $pdo->exec("DELETE FROM users WHERE email LIKE '%@interviews.tv'");
        
        echo "✅ Existing test data cleared.\n";
    }

    // Read and execute the seed file
    echo "📊 Loading sample data...\n";
    
    $seedFile = __DIR__ . '/../database/seed_admin_test_data.sql';
    
    if (!file_exists($seedFile)) {
        throw new Exception("Seed file not found: $seedFile");
    }
    
    $sql = file_get_contents($seedFile);
    
    // Split the SQL into individual statements
    $statements = array_filter(
        array_map('trim', explode(';', $sql)),
        function($stmt) {
            return !empty($stmt) && !preg_match('/^\s*--/', $stmt);
        }
    );
    
    $pdo->beginTransaction();
    
    try {
        foreach ($statements as $statement) {
            if (!empty(trim($statement))) {
                $pdo->exec($statement);
            }
        }
        
        $pdo->commit();
        echo "✅ Sample data loaded successfully!\n";
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }

    // Display summary of created data
    echo "\n📈 Data Summary:\n";
    echo "================\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
    $userCount = $stmt->fetch()['count'];
    echo "👥 Users: $userCount\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM interviews");
    $interviewCount = $stmt->fetch()['count'];
    echo "🎬 Interviews: $interviewCount\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM businesses");
    $businessCount = $stmt->fetch()['count'];
    echo "🏢 Businesses: $businessCount\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM comments");
    $commentCount = $stmt->fetch()['count'];
    echo "💬 Comments: $commentCount\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM content_flags");
    $flagCount = $stmt->fetch()['count'];
    echo "🚩 Content Flags: $flagCount\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM security_events");
    $securityCount = $stmt->fetch()['count'];
    echo "🔒 Security Events: $securityCount\n";

    echo "\n🎯 Test Accounts:\n";
    echo "=================\n";
    echo "Admin: admin@interviews.tv / password\n";
    echo "Creator: john@interviews.tv / password\n";
    echo "User: sarah@interviews.tv / password\n";
    echo "\n💡 All passwords are 'password' (hashed in database)\n";

    echo "\n🚀 Admin Features to Test:\n";
    echo "==========================\n";
    echo "1. 👥 User Management - View and manage all users\n";
    echo "2. 🎬 Interviews Management - Filter, moderate, and manage interviews\n";
    echo "3. 📝 Content Management - Review flagged content and moderation queue\n";
    echo "4. 🔒 Security Dashboard - Monitor security events and threats\n";
    echo "5. 📊 Analytics - View platform statistics and performance metrics\n";

    echo "\n✨ Ready to test! Login as admin and explore the management features.\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "📍 File: " . $e->getFile() . " Line: " . $e->getLine() . "\n";
    
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
        echo "🔄 Transaction rolled back.\n";
    }
    
    exit(1);
}
