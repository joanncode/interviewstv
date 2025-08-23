<?php
/**
 * MariaDB Setup Script for Interviews.tv
 * Attempts to connect to MariaDB using various methods and set up the database
 */

echo "=== MariaDB Setup for Interviews.tv ===\n\n";

// Database configuration
$dbName = 'interviews_tv';
$dbUser = 'interviews_user';
$dbPass = 'interviews_pass';

// Try different connection methods
$connectionMethods = [
    [
        'name' => 'Socket connection as current user',
        'dsn' => 'mysql:unix_socket=/var/run/mysqld/mysqld.sock',
        'user' => get_current_user(),
        'pass' => ''
    ],
    [
        'name' => 'Socket connection as root',
        'dsn' => 'mysql:unix_socket=/var/run/mysqld/mysqld.sock',
        'user' => 'root',
        'pass' => ''
    ],
    [
        'name' => 'TCP connection as root (no password)',
        'dsn' => 'mysql:host=localhost',
        'user' => 'root',
        'pass' => ''
    ],
    [
        'name' => 'TCP connection as current user',
        'dsn' => 'mysql:host=localhost',
        'user' => get_current_user(),
        'pass' => ''
    ],
    [
        'name' => 'TCP connection with existing app user',
        'dsn' => 'mysql:host=localhost',
        'user' => $dbUser,
        'pass' => $dbPass
    ]
];

$pdo = null;
$connectedMethod = null;

echo "Attempting to connect to MariaDB...\n";

foreach ($connectionMethods as $method) {
    try {
        echo "Trying: " . $method['name'] . "\n";
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
    echo "❌ Could not connect to MariaDB using any method.\n";
    echo "\n🔧 Troubleshooting steps:\n";
    echo "1. Make sure MariaDB is running: sudo systemctl status mariadb\n";
    echo "2. Try running: sudo mysql_secure_installation\n";
    echo "3. Check if you can connect manually: mysql -u root -p\n";
    echo "4. If MariaDB uses socket authentication, you may need to run this script with sudo\n";
    echo "\n💡 Alternative: Use the JSON database fallback (already working)\n";
    exit(1);
}

try {
    echo "📋 Setting up database and user...\n";
    
    // Create database
    $pdo->exec("CREATE DATABASE IF NOT EXISTS $dbName CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    echo "✓ Database '$dbName' created\n";

    // Try to create user (may fail if user already exists)
    try {
        $pdo->exec("CREATE USER IF NOT EXISTS '$dbUser'@'localhost' IDENTIFIED BY '$dbPass'");
        echo "✓ User '$dbUser' created\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'already exists') !== false) {
            echo "✓ User '$dbUser' already exists\n";
        } else {
            echo "⚠ User creation warning: " . $e->getMessage() . "\n";
        }
    }

    // Grant privileges
    $pdo->exec("GRANT ALL PRIVILEGES ON $dbName.* TO '$dbUser'@'localhost'");
    $pdo->exec("FLUSH PRIVILEGES");
    echo "✓ Privileges granted to '$dbUser'\n";

    // Use the database
    $pdo->exec("USE $dbName");

    echo "\n📋 Creating tables...\n";

    // Create users table
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

    // Create other essential tables
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS businesses (
            id INT PRIMARY KEY AUTO_INCREMENT,
            owner_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(255) UNIQUE NOT NULL,
            description TEXT NOT NULL,
            industry VARCHAR(100) NOT NULL,
            location VARCHAR(255) NOT NULL,
            website VARCHAR(255) NULL,
            email VARCHAR(255) NOT NULL,
            phone VARCHAR(50) NULL,
            founded_year INT NULL,
            employee_count ENUM('1-10', '11-50', '51-200', '201-500', '500+') NULL,
            logo_url VARCHAR(500) NULL,
            banner_url VARCHAR(500) NULL,
            rating DECIMAL(3,2) DEFAULT 0.00,
            total_reviews INT DEFAULT 0,
            is_verified BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ");
    echo "✓ Businesses table created\n";

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS interviews (
            id INT PRIMARY KEY AUTO_INCREMENT,
            creator_id INT NOT NULL,
            business_id INT NULL,
            title VARCHAR(255) NOT NULL,
            slug VARCHAR(255) UNIQUE NOT NULL,
            description TEXT NOT NULL,
            category VARCHAR(100) NOT NULL,
            video_url VARCHAR(500) NULL,
            audio_url VARCHAR(500) NULL,
            thumbnail_url VARCHAR(500) NULL,
            duration_seconds INT NULL,
            view_count INT DEFAULT 0,
            like_count INT DEFAULT 0,
            comment_count INT DEFAULT 0,
            is_featured BOOLEAN DEFAULT FALSE,
            is_published BOOLEAN DEFAULT FALSE,
            published_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL
        )
    ");
    echo "✓ Interviews table created\n";

    echo "\n📊 Creating indexes...\n";
    
    // Create indexes
    $indexes = [
        "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
        "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
        "CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)",
        "CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug)",
        "CREATE INDEX IF NOT EXISTS idx_businesses_industry ON businesses(industry)",
        "CREATE INDEX IF NOT EXISTS idx_interviews_slug ON interviews(slug)",
        "CREATE INDEX IF NOT EXISTS idx_interviews_category ON interviews(category)",
        "CREATE INDEX IF NOT EXISTS idx_interviews_published ON interviews(is_published, published_at)",
        "CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id)"
    ];

    foreach ($indexes as $index) {
        $pdo->exec($index);
    }
    echo "✓ Indexes created\n";

    echo "\n🌱 Inserting dummy users...\n";
    
    // Insert dummy users
    $users = [
        [1, 'admin@interviews.tv', 'password123', 'Admin User', 'admin', 'Platform Administrator with full system access', 'San Francisco, CA', 'https://interviews.tv', 1],
        [2, 'creator@interviews.tv', 'password123', 'Content Creator', 'creator', 'Professional content creator specializing in business interviews', 'Los Angeles, CA', 'https://contentcreator.com', 1],
        [3, 'business@interviews.tv', 'password123', 'Business Owner', 'business', 'Business profile manager and entrepreneur', 'New York, NY', 'https://mybusiness.com', 1],
        [4, 'user@interviews.tv', 'password123', 'Regular User', 'user', 'Platform user interested in business content', 'Chicago, IL', NULL, 1],
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

    echo "\n🔐 Setting up user permissions...\n";
    
    // Insert permissions
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

    // Show summary
    echo "\n🎉 MariaDB setup completed successfully!\n\n";
    
    $result = $pdo->query("SELECT COUNT(*) as total FROM users")->fetch();
    echo "📊 Total users: " . $result['total'] . "\n";
    
    $result = $pdo->query("SELECT role, COUNT(*) as count FROM users GROUP BY role")->fetchAll();
    echo "📊 Users by role:\n";
    foreach ($result as $row) {
        echo "   - " . ucfirst($row['role']) . ": " . $row['count'] . "\n";
    }

    echo "\n📋 Database Information:\n";
    echo "   Database: $dbName\n";
    echo "   User: $dbUser\n";
    echo "   Password: $dbPass\n";

    echo "\n🔐 Login Credentials:\n";
    echo "   Admin: admin@interviews.tv / password123\n";
    echo "   Creator: creator@interviews.tv / password123\n";
    echo "   Business: business@interviews.tv / password123\n";
    echo "   User: user@interviews.tv / password123\n";
    echo "   Others: All use password123\n";

    echo "\n🚀 Next Steps:\n";
    echo "   1. Test the connection: curl http://localhost:8001/test.php\n";
    echo "   2. Access admin panel: http://localhost:8000/admin\n";
    echo "   3. The system will now use MariaDB instead of JSON fallback\n";

} catch (PDOException $e) {
    echo "❌ Database setup failed: " . $e->getMessage() . "\n";
    exit(1);
}
?>
