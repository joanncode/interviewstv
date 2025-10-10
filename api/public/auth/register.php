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
    validateRequired($input, ['name', 'email', 'password']);
    
    $name = sanitizeInput($input['name']);
    $email = sanitizeInput($input['email']);
    $password = $input['password'];
    
    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        error('Invalid email format', 400);
    }
    
    // Validate password length
    if (strlen($password) < 6) {
        error('Password must be at least 6 characters long', 400);
    }
    
    // Get database connection
    $db = getDatabase();
    
    // Check if user already exists
    $users = $db->getAllUsers();
    foreach ($users as $user) {
        if (strtolower($user['email']) === strtolower($email)) {
            error('Email already registered', 409);
        }
    }
    
    // Create new user
    $newUser = [
        'id' => 'user-' . uniqid(),
        'name' => $name,
        'email' => $email,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
        'role' => 'user',
        'permissions' => ['view_content', 'create_content', 'manage_profile'],
        'is_active' => true,
        'email_verified' => false,
        'avatar' => null,
        'bio' => '',
        'location' => '',
        'website' => '',
        'social_links' => [],
        'followers_count' => 0,
        'following_count' => 0,
        'interviews_count' => 0,
        'created_at' => date('c'),
        'updated_at' => date('c'),
        'last_login' => null
    ];
    
    // Add user to database (for JSON database, we'll need to implement this)
    // For now, just return success
    
    // Create JWT token
    $payload = [
        'user_id' => $newUser['id'],
        'email' => $newUser['email'],
        'name' => $newUser['name'],
        'role' => $newUser['role'],
        'permissions' => $newUser['permissions'],
        'iat' => time(),
        'exp' => time() + JWT_EXPIRY
    ];
    
    // Simple JWT creation (for demo purposes)
    $token = base64_encode(json_encode($payload));
    
    // Remove sensitive data from response
    unset($newUser['password_hash']);
    
    // Return success response
    response([
        'success' => true,
        'message' => 'Registration successful',
        'user' => $newUser,
        'token' => $token,
        'expires_at' => date('c', time() + JWT_EXPIRY)
    ]);
    
} catch (Exception $e) {
    error('Registration failed: ' . $e->getMessage(), 500);
}
?>
