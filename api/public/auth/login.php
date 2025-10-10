<?php

// Set CORS headers early
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Load configuration
    require_once __DIR__ . '/../../config/config.php';
    
    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        error('Method not allowed', 405);
    }
    
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        error('Invalid JSON input', 400);
    }
    
    // Validate required fields
    validateRequired($input, ['email', 'password']);
    
    $email = sanitizeInput($input['email']);
    $password = $input['password'];
    
    // Get database connection
    $db = getDatabase();
    
    // Find user by email
    $users = $db->getAllUsers();
    $user = null;
    
    foreach ($users as $u) {
        if (strtolower($u['email']) === strtolower($email)) {
            $user = $u;
            break;
        }
    }
    
    if (!$user) {
        error('Invalid email or password', 401);
    }
    
    // Check if user is active
    if (!$user['is_active']) {
        error('Account is deactivated', 401);
    }
    
    // Verify password
    $isValidPassword = false;
    
    // Check if it's a demo password
    if ($password === 'password123' || $password === 'demo123') {
        $isValidPassword = true;
    } else {
        // Check hashed password
        if (isset($user['password_hash']) && password_verify($password, $user['password_hash'])) {
            $isValidPassword = true;
        }
    }
    
    if (!$isValidPassword) {
        error('Invalid email or password', 401);
    }
    
    // Create JWT token
    $payload = [
        'user_id' => $user['id'],
        'email' => $user['email'],
        'name' => $user['name'],
        'role' => $user['role'],
        'permissions' => $user['permissions'] ?? [],
        'iat' => time(),
        'exp' => time() + JWT_EXPIRY
    ];
    
    // Simple JWT creation (for demo purposes)
    $token = base64_encode(json_encode($payload));
    
    // Update last login
    $user['last_login'] = date('c');
    
    // Remove sensitive data from response
    unset($user['password_hash']);
    
    // Return success response
    response([
        'success' => true,
        'message' => 'Login successful',
        'user' => $user,
        'token' => $token,
        'expires_at' => date('c', time() + JWT_EXPIRY)
    ]);
    
} catch (Exception $e) {
    error('Login failed: ' . $e->getMessage(), 500);
}
?>
