<?php
/**
 * Database Setup Script for Interviews.tv
 * Initializes MariaDB database with schema and sample data
 */

echo "=== Interviews.tv Database Setup ===\n\n";

// Database configuration
$host = 'localhost';
$username = 'root';
$password = '';
$database = 'interviews_tv';

try {
    // Try MySQL/MariaDB first, fallback to SQLite
    $useSQLite = false;

    try {
        // Connect to MySQL/MariaDB server (without selecting database)
        $pdo = new PDO("mysql:host=$host", $username, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        echo "✓ Connected to MariaDB server\n";

        // Create database if it doesn't exist
        $pdo->exec("CREATE DATABASE IF NOT EXISTS $database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdo->exec("USE $database");

        $schemaFile = 'database/schema.sql';
        $seedFile = 'database/seed_data.sql';

    } catch (PDOException $e) {
        echo "⚠️  MySQL/MariaDB not available: " . $e->getMessage() . "\n";
        echo "📋 Using SQLite database instead...\n";

        // Use SQLite as fallback
        $useSQLite = true;
        $dbPath = __DIR__ . '/interviews_tv.db';
        $pdo = new PDO("sqlite:$dbPath");
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        echo "✓ Connected to SQLite database\n";

        $schemaFile = 'database/schema_sqlite.sql';
        $seedFile = 'database/seed_data_sqlite.sql';
    }

    // Read and execute schema file
    echo "📋 Creating database schema...\n";
    $schema = file_get_contents($schemaFile);

    if ($schema === false) {
        throw new Exception("Could not read $schemaFile file");
    }

    // Split SQL statements and execute them
    $statements = explode(';', $schema);

    foreach ($statements as $statement) {
        $statement = trim($statement);
        if (!empty($statement)) {
            $pdo->exec($statement);
        }
    }

    echo "✓ Database schema created successfully\n";

    // Read and execute seed data file
    echo "🌱 Inserting sample data...\n";
    $seedData = file_get_contents($seedFile);

    if ($seedData === false) {
        throw new Exception("Could not read $seedFile file");
    }

    // Split SQL statements and execute them
    $statements = explode(';', $seedData);

    foreach ($statements as $statement) {
        $statement = trim($statement);
        if (!empty($statement)) {
            $pdo->exec($statement);
        }
    }

    echo "✓ Sample data inserted successfully\n";
    
    // Create uploads directory
    echo "📁 Creating uploads directory...\n";
    $uploadsDir = 'web/public/uploads';
    
    if (!file_exists($uploadsDir)) {
        mkdir($uploadsDir, 0755, true);
        mkdir($uploadsDir . '/avatars', 0755, true);
        mkdir($uploadsDir . '/hero-banners', 0755, true);
        mkdir($uploadsDir . '/business-logos', 0755, true);
        mkdir($uploadsDir . '/business-banners', 0755, true);
        mkdir($uploadsDir . '/interviews', 0755, true);
        echo "✓ Uploads directory structure created\n";
    } else {
        echo "✓ Uploads directory already exists\n";
    }
    
    // Display setup completion message
    echo "\n🎉 Setup completed successfully!\n\n";
    echo "=== Login Credentials ===\n";
    echo "Admin:    admin@interviews.tv    / admin123\n";
    echo "Creator:  creator@interviews.tv  / creator123\n";
    echo "Business: business@interviews.tv / business123\n";
    echo "User:     user@interviews.tv     / user123\n\n";
    
    echo "=== Next Steps ===\n";
    echo "1. Start your web server (Apache/Nginx)\n";
    echo "2. Ensure PHP is configured with PDO MySQL extension\n";
    echo "3. Start the API server on port 8001:\n";
    echo "   php -S localhost:8001 -t api/\n";
    echo "4. Access the application at: http://localhost:8000\n\n";
    
    echo "=== API Endpoints ===\n";
    echo "API Base URL: http://localhost:8001/api\n";
    echo "Documentation: http://localhost:8001/api\n\n";
    
} catch (PDOException $e) {
    echo "❌ Database Error: " . $e->getMessage() . "\n";
    echo "\nPlease ensure:\n";
    echo "1. MariaDB/MySQL is running\n";
    echo "2. Database credentials are correct\n";
    echo "3. User has CREATE DATABASE privileges\n";
    exit(1);
} catch (Exception $e) {
    echo "❌ Setup Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>
