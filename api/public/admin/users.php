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
    
    // Get database connection
    $db = getDatabase();
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            handleGetUsers($db);
            break;
        case 'POST':
            handleCreateUser($db);
            break;
        case 'PUT':
            handleUpdateUser($db);
            break;
        case 'DELETE':
            handleDeleteUser($db);
            break;
        default:
            error('Method not allowed', 405);
    }
    
} catch (Exception $e) {
    error('Admin users API error: ' . $e->getMessage(), 500);
}

function handleGetUsers($db) {
    // Get query parameters
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
    $search = isset($_GET['search']) ? sanitizeInput($_GET['search']) : '';
    $role = isset($_GET['role']) ? sanitizeInput($_GET['role']) : '';
    $status = isset($_GET['status']) ? sanitizeInput($_GET['status']) : '';
    $sort = isset($_GET['sort']) ? sanitizeInput($_GET['sort']) : 'created_at';
    $order = isset($_GET['order']) ? sanitizeInput($_GET['order']) : 'desc';
    $userId = isset($_GET['id']) ? (int)$_GET['id'] : null;
    
    // Get all users
    $users = $db->getAllUsers();
    
    // If requesting specific user
    if ($userId) {
        foreach ($users as $user) {
            if ($user['id'] == $userId) {
                response([
                    'success' => true,
                    'data' => ['user' => $user]
                ]);
                return;
            }
        }
        error('User not found', 404);
        return;
    }
    
    // Filter users
    $filteredUsers = $users;
    
    if ($search) {
        $filteredUsers = array_filter($filteredUsers, function($user) use ($search) {
            return stripos($user['name'], $search) !== false || 
                   stripos($user['email'], $search) !== false;
        });
    }
    
    if ($role) {
        $filteredUsers = array_filter($filteredUsers, function($user) use ($role) {
            return $user['role'] === $role;
        });
    }
    
    if ($status) {
        $isActive = $status === 'active';
        $filteredUsers = array_filter($filteredUsers, function($user) use ($isActive) {
            return $user['is_active'] == $isActive;
        });
    }
    
    // Sort users
    usort($filteredUsers, function($a, $b) use ($sort, $order) {
        $aVal = $a[$sort] ?? '';
        $bVal = $b[$sort] ?? '';
        
        if ($order === 'desc') {
            return $bVal <=> $aVal;
        } else {
            return $aVal <=> $bVal;
        }
    });
    
    // Calculate pagination
    $total = count($filteredUsers);
    $totalPages = ceil($total / $limit);
    $offset = ($page - 1) * $limit;
    $paginatedUsers = array_slice($filteredUsers, $offset, $limit);
    
    // Calculate statistics
    $statistics = [
        'total_users' => count($users),
        'active_users' => count(array_filter($users, function($u) { return $u['is_active']; })),
        'inactive_users' => count(array_filter($users, function($u) { return !$u['is_active']; })),
        'verified_users' => count(array_filter($users, function($u) { return $u['email_verified']; })),
        'admin_users' => count(array_filter($users, function($u) { return $u['role'] === 'admin'; })),
        'creator_users' => count(array_filter($users, function($u) { return $u['role'] === 'creator'; })),
        'business_users' => count(array_filter($users, function($u) { return $u['role'] === 'business'; })),
        'regular_users' => count(array_filter($users, function($u) { return $u['role'] === 'user'; }))
    ];
    
    response([
        'success' => true,
        'data' => [
            'users' => $paginatedUsers,
            'pagination' => [
                'current_page' => $page,
                'total_pages' => $totalPages,
                'total_items' => $total,
                'items_per_page' => $limit,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1
            ],
            'statistics' => $statistics
        ]
    ]);
}

function handleCreateUser($db) {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        error('Invalid JSON input', 400);
    }
    
    // Validate required fields
    validateRequired($input, ['name', 'email', 'role']);
    
    $name = sanitizeInput($input['name']);
    $email = sanitizeInput($input['email']);
    $role = sanitizeInput($input['role']);
    $password = $input['password'] ?? 'password123';
    $isActive = $input['is_active'] ?? true;
    
    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        error('Invalid email format', 400);
    }
    
    // Check if user already exists
    $users = $db->getAllUsers();
    foreach ($users as $user) {
        if (strtolower($user['email']) === strtolower($email)) {
            error('Email already exists', 409);
        }
    }
    
    // Create new user
    $newUser = [
        'id' => count($users) + 1,
        'name' => $name,
        'email' => $email,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
        'role' => $role,
        'permissions' => getRolePermissions($role),
        'is_active' => $isActive,
        'email_verified' => false,
        'avatar_url' => null,
        'bio' => '',
        'location' => '',
        'website' => '',
        'phone' => '',
        'company' => '',
        'hero_banner_url' => null,
        'followers_count' => 0,
        'following_count' => 0,
        'interviews_count' => 0,
        'created_at' => date('c'),
        'updated_at' => date('c'),
        'last_login' => null
    ];
    
    // For demo purposes, just return success
    response([
        'success' => true,
        'message' => 'User created successfully',
        'data' => ['user' => $newUser]
    ]);
}

function handleUpdateUser($db) {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        error('Invalid JSON input', 400);
    }
    
    $userId = $input['id'] ?? null;
    if (!$userId) {
        error('User ID is required', 400);
    }
    
    // For demo purposes, just return success
    response([
        'success' => true,
        'message' => 'User updated successfully'
    ]);
}

function handleDeleteUser($db) {
    // Get user ID from query string
    $userId = $_GET['id'] ?? null;
    if (!$userId) {
        error('User ID is required', 400);
    }
    
    // For demo purposes, just return success
    response([
        'success' => true,
        'message' => 'User deleted successfully'
    ]);
}

function getRolePermissions($role) {
    switch ($role) {
        case 'admin':
            return ['all'];
        case 'creator':
            return ['create_content', 'manage_profile', 'conduct_interviews'];
        case 'business':
            return ['create_content', 'manage_profile', 'business_features'];
        case 'user':
        default:
            return ['view_content', 'manage_profile'];
    }
}
?>
