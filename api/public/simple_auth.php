<?php
// Simple Authentication API for Interviews.tv
// This is a temporary solution that works without Composer/database

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get the request path
$requestUri = $_SERVER['REQUEST_URI'];
$path = parse_url($requestUri, PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Simple routing
if ($path === '/api/auth/login' && $method === 'POST') {
    handleLogin();
} elseif ($path === '/api/auth/register' && $method === 'POST') {
    handleRegister();
} elseif ($path === '/api/auth/me' && $method === 'GET') {
    handleMe();
} elseif ($path === '/api/health' && $method === 'GET') {
    handleHealth();
} else {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Endpoint not found']);
}

function handleLogin() {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['email']) || !isset($input['password'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Email and password are required']);
        return;
    }
    
    $email = $input['email'];
    $password = $input['password'];
    
    // Predefined users (in a real app, this would be from database)
    $users = [
        'admin@interviews.tv' => [
            'id' => 1,
            'name' => 'Admin User',
            'email' => 'admin@interviews.tv',
            'password' => 'admin123',
            'role' => 'admin',
            'verified' => true,
            'created_at' => '2025-01-01 00:00:00'
        ],
        'user@interviews.tv' => [
            'id' => 2,
            'name' => 'Regular User',
            'email' => 'user@interviews.tv',
            'password' => 'user123',
            'role' => 'user',
            'verified' => true,
            'created_at' => '2025-01-01 00:00:00'
        ],
        'creator@interviews.tv' => [
            'id' => 3,
            'name' => 'Content Creator',
            'email' => 'creator@interviews.tv',
            'password' => 'creator123',
            'role' => 'creator',
            'verified' => true,
            'created_at' => '2025-01-01 00:00:00'
        ],
        'test@test.com' => [
            'id' => 4,
            'name' => 'Test User',
            'email' => 'test@test.com',
            'password' => 'test123',
            'role' => 'user',
            'verified' => true,
            'created_at' => '2025-01-01 00:00:00'
        ]
    ];
    
    if (!isset($users[$email]) || $users[$email]['password'] !== $password) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
        return;
    }
    
    $user = $users[$email];
    unset($user['password']); // Don't send password back
    
    // Generate a simple JWT-like token (in production, use proper JWT)
    $token = base64_encode(json_encode([
        'user_id' => $user['id'],
        'email' => $user['email'],
        'role' => $user['role'],
        'exp' => time() + (24 * 60 * 60) // 24 hours
    ]));
    
    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'token' => $token,
        'user' => $user
    ]);
}

function handleRegister() {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['name']) || !isset($input['email']) || !isset($input['password'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Name, email and password are required']);
        return;
    }
    
    $name = $input['name'];
    $email = $input['email'];
    $password = $input['password'];
    
    // Basic validation
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid email format']);
        return;
    }
    
    if (strlen($password) < 6) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters']);
        return;
    }
    
    // Check if user already exists (simplified check)
    $existingUsers = ['admin@interviews.tv', 'user@interviews.tv', 'creator@interviews.tv', 'test@test.com'];
    if (in_array($email, $existingUsers)) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'User with this email already exists']);
        return;
    }
    
    // In a real app, save to database and send verification email
    echo json_encode([
        'success' => true,
        'message' => 'Registration successful! Please check your email for verification.',
        'user' => [
            'id' => rand(1000, 9999),
            'name' => $name,
            'email' => $email,
            'role' => 'user',
            'verified' => false,
            'created_at' => date('Y-m-d H:i:s')
        ]
    ]);
}

function handleMe() {
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    
    if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authorization token required']);
        return;
    }
    
    $token = substr($authHeader, 7);
    
    try {
        $payload = json_decode(base64_decode($token), true);
        
        if (!$payload || $payload['exp'] < time()) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Token expired']);
            return;
        }
        
        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $payload['user_id'],
                'email' => $payload['email'],
                'role' => $payload['role']
            ]
        ]);
    } catch (Exception $e) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid token']);
    }
}

function handleHealth() {
    echo json_encode([
        'success' => true,
        'message' => 'API is running',
        'timestamp' => date('Y-m-d H:i:s'),
        'version' => '1.0.0'
    ]);
}
?>
