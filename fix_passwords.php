<?php
/**
 * Fix password hashes in MariaDB
 * Generate proper password hashes for all users
 */

echo "=== Fixing Password Hashes in MariaDB ===\n\n";

try {
    // Connect to MariaDB
    $pdo = new PDO(
        'mysql:host=localhost;dbname=interviews_tv;charset=utf8mb4',
        'interviews_user',
        'interviews_pass',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    
    echo "✓ Connected to MariaDB\n";

    // Users with their passwords
    $users = [
        ['admin@interviews.tv', 'password123'],
        ['creator@interviews.tv', 'password123'],
        ['business@interviews.tv', 'password123'],
        ['user@interviews.tv', 'password123'],
        ['john.doe@example.com', 'password123'],
        ['jane.smith@company.com', 'password123'],
        ['mike.wilson@startup.io', 'password123'],
        ['sarah.johnson@agency.com', 'password123'],
        ['david.brown@tech.com', 'password123'],
        ['lisa.davis@consulting.com', 'password123'],
        ['alex.garcia@freelance.com', 'password123'],
        ['emma.taylor@nonprofit.org', 'password123'],
        ['ryan.martinez@ecommerce.com', 'password123'],
        ['olivia.anderson@media.com', 'password123'],
        ['chris.thomas@finance.com', 'password123']
    ];

    $stmt = $pdo->prepare("UPDATE users SET password_hash = ? WHERE email = ?");

    echo "🔐 Updating password hashes...\n";
    
    foreach ($users as $user) {
        $email = $user[0];
        $password = $user[1];
        $hash = password_hash($password, PASSWORD_DEFAULT);
        
        $stmt->execute([$hash, $email]);
        echo "✓ Updated password for: $email\n";
    }

    echo "\n🎉 Password hashes updated successfully!\n";
    echo "\n🔐 All users now have password: password123\n";
    echo "   - Admin: admin@interviews.tv / password123\n";
    echo "   - Creator: creator@interviews.tv / password123\n";
    echo "   - Business: business@interviews.tv / password123\n";
    echo "   - User: user@interviews.tv / password123\n";
    echo "   - Others: All use password123\n";

} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>
