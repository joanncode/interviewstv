<?php
/**
 * Simple Authentication API
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    // Connect to MySQL
    $dsn = "mysql:host=localhost;dbname=interviews_tv;charset=utf8mb4";
    $pdo = new PDO($dsn, 'interviews_user', 'interviews_pass');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $method = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true);
    
    if ($method === 'POST') {
        // Login
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';
        
        if (empty($email) || empty($password)) {
            throw new Exception('Email and password are required');
        }
        
        // Find user
        $stmt = $pdo->prepare("SELECT id, name, email, password_hash, role FROM users WHERE email = ? AND is_active = 1");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            throw new Exception('Invalid email or password');
        }
        
        // Verify password
        if (!password_verify($password, $user['password_hash'])) {
            throw new Exception('Invalid email or password');
        }
        
        // Update last login
        $stmt = $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
        $stmt->execute([$user['id']]);
        
        // Create session token (simple implementation)
        $token = bin2hex(random_bytes(32));
        
        // Remove sensitive data
        unset($user['password_hash']);
        
        echo json_encode([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'user' => $user,
                'token' => $token,
                'expires_at' => date('Y-m-d H:i:s', strtotime('+24 hours'))
            ]
        ]);
        
    } elseif ($method === 'GET') {
        // Get user info (if token provided)
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        
        if (empty($authHeader)) {
            // Return sample users for testing
            $stmt = $pdo->query("SELECT id, name, email, role FROM users WHERE is_active = 1 ORDER BY created_at DESC LIMIT 5");
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'message' => 'Available test users',
                'data' => [
                    'test_users' => $users,
                    'test_credentials' => [
                        'email' => 'john@example.com',
                        'password' => 'password123',
                        'note' => 'Use these credentials to test login'
                    ]
                ]
            ]);
        } else {
            // Validate token (simplified)
            echo json_encode([
                'success' => true,
                'message' => 'Token validation not implemented in this demo',
                'data' => ['authenticated' => false]
            ]);
        }
        
    } else {
        throw new Exception('Method not allowed');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
