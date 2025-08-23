<?php
/**
 * Create MySQL Database and Users for Interviews.tv
 * This script attempts to create the database using various connection methods
 */

echo "=== Creating MySQL Database for Interviews.tv ===\n\n";

// Try different connection methods
$connectionMethods = [
    [
        'name' => 'Root with socket',
        'dsn' => 'mysql:unix_socket=/var/run/mysqld/mysqld.sock',
        'user' => 'root',
        'pass' => ''
    ],
    [
        'name' => 'Root with localhost',
        'dsn' => 'mysql:host=localhost',
        'user' => 'root',
        'pass' => ''
    ],
    [
        'name' => 'Current user',
        'dsn' => 'mysql:host=localhost',
        'user' => get_current_user(),
        'pass' => ''
    ]
];

$pdo = null;
$connectedMethod = null;

foreach ($connectionMethods as $method) {
    try {
        echo "Trying connection method: " . $method['name'] . "\n";
        $pdo = new PDO($method['dsn'], $method['user'], $method['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]);
        $connectedMethod = $method;
        echo "✓ Connected successfully using: " . $method['name'] . "\n\n";
        break;
    } catch (PDOException $e) {
        echo "✗ Failed: " . $e->getMessage() . "\n";
    }
}

if (!$pdo) {
    echo "❌ Could not connect to MySQL using any method.\n";
    echo "Please ensure MySQL/MariaDB is running and accessible.\n";
    exit(1);
}

try {
    // Create database
    echo "📋 Creating database...\n";
    $pdo->exec("CREATE DATABASE IF NOT EXISTS interviews_tv CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    echo "✓ Database 'interviews_tv' created\n";

    // Use the database
    $pdo->exec("USE interviews_tv");

    // Create users table
    echo "📋 Creating users table...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            role ENUM('admin', 'creator', 'business', 'user') DEFAULT 'user',
            avatar_url VARCHAR(500) NULL,
            hero_banner_url VARCHAR(500) NULL,
            bio TEXT NULL,
            location VARCHAR(255) NULL,
            website VARCHAR(255) NULL,
            phone VARCHAR(50) NULL,
            company VARCHAR(255) NULL,
            email_verified BOOLEAN DEFAULT FALSE,
            email_verification_token VARCHAR(255) NULL,
            password_reset_token VARCHAR(255) NULL,
            password_reset_expires TIMESTAMP NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            last_login TIMESTAMP NULL
        )
    ");
    echo "✓ Users table created\n";

    // Create user permissions table
    echo "📋 Creating user_permissions table...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS user_permissions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            permission VARCHAR(100) NOT NULL,
            granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            granted_by INT NULL,
            
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
            UNIQUE KEY unique_user_permission (user_id, permission)
        )
    ");
    echo "✓ User permissions table created\n";

    // Insert dummy users
    echo "🌱 Inserting dummy users...\n";
    
    $users = [
        [1, 'admin@interviews.tv', 'admin123', 'Admin User', 'admin', 'Platform Administrator with full system access', 'San Francisco, CA', 'https://interviews.tv', 1],
        [2, 'creator@interviews.tv', 'creator123', 'Content Creator', 'creator', 'Professional content creator specializing in business interviews', 'Los Angeles, CA', 'https://contentcreator.com', 1],
        [3, 'business@interviews.tv', 'business123', 'Business Owner', 'business', 'Business profile manager and entrepreneur', 'New York, NY', 'https://mybusiness.com', 1],
        [4, 'user@interviews.tv', 'user123', 'Regular User', 'user', 'Platform user interested in business content', 'Chicago, IL', NULL, 1],
        [5, 'john.doe@example.com', 'password123', 'John Doe', 'user', 'Software developer and tech enthusiast', 'Seattle, WA', 'https://johndoe.dev', 1],
        [6, 'jane.smith@company.com', 'password123', 'Jane Smith', 'creator', 'Marketing specialist and content strategist', 'Austin, TX', 'https://janesmith.com', 1],
        [7, 'mike.wilson@startup.io', 'password123', 'Mike Wilson', 'business', 'Startup founder and entrepreneur', 'Boston, MA', 'https://startup.io', 1],
        [8, 'sarah.johnson@agency.com', 'password123', 'Sarah Johnson', 'creator', 'Digital marketing agency owner', 'Miami, FL', 'https://agency.com', 1],
        [9, 'david.brown@tech.com', 'password123', 'David Brown', 'user', 'Product manager at tech company', 'San Diego, CA', NULL, 0],
        [10, 'lisa.davis@consulting.com', 'password123', 'Lisa Davis', 'business', 'Business consultant and advisor', 'Denver, CO', 'https://consulting.com', 1],
        [11, 'alex.garcia@freelance.com', 'password123', 'Alex Garcia', 'creator', 'Freelance video producer', 'Portland, OR', 'https://freelance.com', 1],
        [12, 'emma.taylor@nonprofit.org', 'password123', 'Emma Taylor', 'user', 'Nonprofit organization coordinator', 'Nashville, TN', 'https://nonprofit.org', 1],
        [13, 'ryan.martinez@ecommerce.com', 'password123', 'Ryan Martinez', 'business', 'E-commerce platform founder', 'Phoenix, AZ', 'https://ecommerce.com', 1],
        [14, 'olivia.anderson@media.com', 'password123', 'Olivia Anderson', 'creator', 'Media production specialist', 'Atlanta, GA', 'https://media.com', 1],
        [15, 'chris.thomas@finance.com', 'password123', 'Chris Thomas', 'user', 'Financial analyst and investor', 'Charlotte, NC', NULL, 1]
    ];

    $stmt = $pdo->prepare("
        INSERT INTO users (id, email, password_hash, name, role, bio, location, website, email_verified) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            bio = VALUES(bio),
            location = VALUES(location),
            website = VALUES(website)
    ");

    foreach ($users as $user) {
        $password_hash = password_hash($user[2], PASSWORD_DEFAULT);
        $stmt->execute([
            $user[0], // id
            $user[1], // email
            $password_hash, // password_hash
            $user[3], // name
            $user[4], // role
            $user[5], // bio
            $user[6], // location
            $user[7], // website
            $user[8]  // email_verified
        ]);
    }
    echo "✓ " . count($users) . " users inserted\n";

    // Insert permissions
    echo "🔐 Setting up user permissions...\n";
    $permissions = [
        [1, 'all'], // Admin
        [2, 'create_content'], [2, 'manage_profile'], [2, 'conduct_interviews'], // Creator
        [3, 'manage_business'], [3, 'manage_profile'], [3, 'respond_interviews'], // Business
        [4, 'view_content'], [4, 'manage_profile'], // User
        [6, 'create_content'], [6, 'manage_profile'], [6, 'conduct_interviews'], // Jane (Creator)
        [7, 'manage_business'], [7, 'manage_profile'], [7, 'respond_interviews'], // Mike (Business)
        [8, 'create_content'], [8, 'manage_profile'], [8, 'conduct_interviews'], // Sarah (Creator)
        [10, 'manage_business'], [10, 'manage_profile'], [10, 'respond_interviews'], // Lisa (Business)
        [11, 'create_content'], [11, 'manage_profile'], [11, 'conduct_interviews'], // Alex (Creator)
        [13, 'manage_business'], [13, 'manage_profile'], [13, 'respond_interviews'], // Ryan (Business)
        [14, 'create_content'], [14, 'manage_profile'], [14, 'conduct_interviews'], // Olivia (Creator)
    ];

    $stmt = $pdo->prepare("
        INSERT INTO user_permissions (user_id, permission) 
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE permission = VALUES(permission)
    ");

    foreach ($permissions as $perm) {
        $stmt->execute($perm);
    }

    // Add basic permissions for remaining users
    $basicUsers = [5, 9, 12, 15];
    foreach ($basicUsers as $userId) {
        $stmt->execute([$userId, 'view_content']);
        $stmt->execute([$userId, 'manage_profile']);
    }

    echo "✓ User permissions set up\n";

    // Create indexes
    echo "📊 Creating indexes...\n";
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id)");
    echo "✓ Indexes created\n";

    // Show summary
    echo "\n🎉 Database setup completed successfully!\n\n";
    
    $result = $pdo->query("SELECT COUNT(*) as total FROM users")->fetch();
    echo "📊 Total users: " . $result['total'] . "\n";
    
    $result = $pdo->query("SELECT role, COUNT(*) as count FROM users GROUP BY role")->fetchAll();
    echo "📊 Users by role:\n";
    foreach ($result as $row) {
        echo "   - " . ucfirst($row['role']) . ": " . $row['count'] . "\n";
    }

    echo "\n🔐 Login Credentials (all passwords are the role name + '123'):\n";
    echo "   - Admin: admin@interviews.tv / admin123\n";
    echo "   - Creator: creator@interviews.tv / creator123\n";
    echo "   - Business: business@interviews.tv / business123\n";
    echo "   - User: user@interviews.tv / user123\n";
    echo "   - Others: password123\n";

} catch (PDOException $e) {
    echo "❌ Database setup failed: " . $e->getMessage() . "\n";
    exit(1);
}
?>
