<?php
/**
 * Admin User Management Endpoint for Interviews.tv API
 * Handles user CRUD operations for administrators
 */

require_once '../config/database.php';
require_once '../config/cors.php';
require_once '../config/json_database.php';
require_once '../models/User.php';

try {
    // Require admin authentication
    $current_user = Auth::requireRole('admin');

    // Try to get database connection, fallback to JSON database
    $db = null;
    $jsonDb = null;

    try {
        $database = new Database();
        $db = $database->getConnection();
    } catch (Exception $dbException) {
        error_log("Database connection failed, using JSON fallback: " . $dbException->getMessage());
        $jsonDb = new JsonDatabase();
    }

    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            if ($db) {
                handleGetUsers($db);
            } else {
                handleGetUsersJson($jsonDb);
            }
            break;
        case 'POST':
            if ($db) {
                handleCreateUser($db);
            } else {
                handleCreateUserJson($jsonDb);
            }
            break;
        case 'PUT':
            if ($db) {
                handleUpdateUser($db);
            } else {
                handleUpdateUserJson($jsonDb);
            }
            break;
        case 'DELETE':
            if ($db) {
                handleDeleteUser($db);
            } else {
                handleDeleteUserJson($jsonDb);
            }
            break;
        default:
            ApiResponse::error('Method not allowed', 405);
    }

} catch (Exception $e) {
    error_log("Admin users endpoint error: " . $e->getMessage());
    ApiResponse::serverError('User management operation failed');
}

/**
 * Handle GET request - List users with pagination and filtering
 */
function handleGetUsers($db) {
    // Check if requesting a single user
    if (isset($_GET['id'])) {
        $userId = intval($_GET['id']);
        $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            // Remove sensitive data
            unset($user['password_hash']);
            ApiResponse::success(['user' => $user], 'User retrieved successfully');
        } else {
            ApiResponse::notFound('User not found');
        }
        return;
    }

    // Get query parameters for list view
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? min(100, max(1, intval($_GET['limit']))) : 20;
    $search = isset($_GET['search']) ? Validator::sanitizeString($_GET['search']) : null;
    $role = isset($_GET['role']) ? Validator::sanitizeString($_GET['role']) : null;
    $status = isset($_GET['status']) ? Validator::sanitizeString($_GET['status']) : null;
    $sort = isset($_GET['sort']) ? Validator::sanitizeString($_GET['sort']) : 'created_at';
    $order = isset($_GET['order']) && $_GET['order'] === 'asc' ? 'ASC' : 'DESC';

    $offset = ($page - 1) * $limit;
    
    // Build WHERE conditions
    $where_conditions = [];
    $params = [];
    
    if ($search) {
        $where_conditions[] = "(name LIKE :search OR email LIKE :search)";
        $params[':search'] = '%' . $search . '%';
    }
    
    if ($role) {
        $where_conditions[] = "role = :role";
        $params[':role'] = $role;
    }
    
    if ($status === 'active') {
        $where_conditions[] = "is_active = 1";
    } elseif ($status === 'inactive') {
        $where_conditions[] = "is_active = 0";
    }
    
    $where_clause = !empty($where_conditions) ? 'WHERE ' . implode(' AND ', $where_conditions) : '';
    
    // Validate sort column
    $allowed_sorts = ['id', 'name', 'email', 'role', 'created_at', 'last_login', 'is_active'];
    if (!in_array($sort, $allowed_sorts)) {
        $sort = 'created_at';
    }
    
    // Get users
    $query = "SELECT id, email, name, role, avatar_url, bio, location, website, 
                     email_verified, is_active, created_at, updated_at, last_login
              FROM users 
              $where_clause 
              ORDER BY $sort $order 
              LIMIT :limit OFFSET :offset";
    
    $stmt = $db->prepare($query);
    
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get total count
    $count_query = "SELECT COUNT(*) as total FROM users $where_clause";
    $count_stmt = $db->prepare($count_query);
    
    foreach ($params as $key => $value) {
        $count_stmt->bindValue($key, $value);
    }
    
    $count_stmt->execute();
    $total_count = $count_stmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Get user statistics
    $stats_query = "SELECT 
                        COUNT(*) as total_users,
                        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
                        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_count,
                        SUM(CASE WHEN role = 'creator' THEN 1 ELSE 0 END) as creator_count,
                        SUM(CASE WHEN role = 'business' THEN 1 ELSE 0 END) as business_count,
                        SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as user_count,
                        SUM(CASE WHEN email_verified = 1 THEN 1 ELSE 0 END) as verified_users,
                        SUM(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as active_30_days
                    FROM users";
    
    $stats_stmt = $db->prepare($stats_query);
    $stats_stmt->execute();
    $stats = $stats_stmt->fetch(PDO::FETCH_ASSOC);
    
    // Calculate pagination info
    $total_pages = ceil($total_count / $limit);
    
    $response_data = [
        'users' => $users,
        'pagination' => [
            'current_page' => $page,
            'total_pages' => $total_pages,
            'total_count' => $total_count,
            'limit' => $limit,
            'has_next' => $page < $total_pages,
            'has_prev' => $page > 1
        ],
        'filters' => [
            'search' => $search,
            'role' => $role,
            'status' => $status,
            'sort' => $sort,
            'order' => $order
        ],
        'statistics' => $stats
    ];

    ApiResponse::success($response_data, 'Users retrieved successfully');
}

/**
 * Handle POST request - Create new user
 */
function handleCreateUser($db) {
    $data = json_decode(file_get_contents("php://input"), true);
    
    // Validate required fields
    $required_fields = ['name', 'email', 'password', 'role'];
    $validation_errors = Validator::validateRequired($required_fields, $data);
    
    if (!empty($validation_errors)) {
        ApiResponse::validationError($validation_errors);
    }
    
    // Additional validation
    if (!Validator::validateEmail($data['email'])) {
        $validation_errors['email'] = 'Invalid email format';
    }
    
    if (!Validator::validatePassword($data['password'])) {
        $validation_errors['password'] = 'Password must be at least 6 characters long';
    }
    
    $allowed_roles = ['admin', 'creator', 'business', 'user'];
    if (!in_array($data['role'], $allowed_roles)) {
        $validation_errors['role'] = 'Invalid role specified';
    }
    
    if (!empty($validation_errors)) {
        ApiResponse::validationError($validation_errors);
    }
    
    // Create user
    $user = new User($db);
    
    if ($user->emailExists($data['email'])) {
        ApiResponse::error('Email address is already registered', 409);
    }
    
    $user->name = Validator::sanitizeString($data['name']);
    $user->email = Validator::sanitizeEmail($data['email']);
    $user->password_hash = User::hashPassword($data['password']);
    $user->role = $data['role'];
    $user->bio = isset($data['bio']) ? Validator::sanitizeString($data['bio']) : '';
    $user->location = isset($data['location']) ? Validator::sanitizeString($data['location']) : '';
    $user->website = isset($data['website']) ? Validator::sanitizeString($data['website']) : '';
    $user->phone = isset($data['phone']) ? Validator::sanitizeString($data['phone']) : '';
    $user->company = isset($data['company']) ? Validator::sanitizeString($data['company']) : '';
    $user->email_verified = isset($data['email_verified']) ? (bool)$data['email_verified'] : true; // Default to verified for admin-created users
    
    if ($user->create()) {
        // Add default permissions based on role
        $permissions = [];
        switch ($data['role']) {
            case 'admin':
                $permissions = ['all'];
                break;
            case 'creator':
                $permissions = ['create_content', 'manage_profile', 'conduct_interviews'];
                break;
            case 'business':
                $permissions = ['manage_business', 'manage_profile', 'respond_interviews'];
                break;
            case 'user':
            default:
                $permissions = ['view_content', 'manage_profile'];
                break;
        }
        
        // Insert permissions
        foreach ($permissions as $permission) {
            $perm_query = "INSERT INTO user_permissions (user_id, permission) VALUES (:user_id, :permission)";
            $perm_stmt = $db->prepare($perm_query);
            $perm_stmt->bindParam(':user_id', $user->id);
            $perm_stmt->bindParam(':permission', $permission);
            $perm_stmt->execute();
        }
        
        ApiResponse::success($user->getPublicProfile(), 'User created successfully', 201);
    } else {
        ApiResponse::serverError('Failed to create user');
    }
}

/**
 * Handle PUT request - Update user
 */
function handleUpdateUser($db) {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['id'])) {
        ApiResponse::error('User ID is required', 400);
    }
    
    $user = new User($db);
    if (!$user->findById($data['id'])) {
        ApiResponse::notFound('User not found');
    }
    
    // Update allowed fields
    if (isset($data['name'])) {
        $user->name = Validator::sanitizeString($data['name']);
    }
    
    if (isset($data['bio'])) {
        $user->bio = Validator::sanitizeString($data['bio']);
    }
    
    if (isset($data['location'])) {
        $user->location = Validator::sanitizeString($data['location']);
    }
    
    if (isset($data['website'])) {
        $user->website = Validator::sanitizeString($data['website']);
    }
    
    if (isset($data['phone'])) {
        $user->phone = Validator::sanitizeString($data['phone']);
    }
    
    if (isset($data['company'])) {
        $user->company = Validator::sanitizeString($data['company']);
    }
    
    if (isset($data['is_active'])) {
        $query = "UPDATE users SET is_active = :is_active WHERE id = :id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':is_active', $data['is_active'], PDO::PARAM_BOOL);
        $stmt->bindParam(':id', $user->id);
        $stmt->execute();
    }
    
    if (isset($data['email_verified'])) {
        $query = "UPDATE users SET email_verified = :email_verified WHERE id = :id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':email_verified', $data['email_verified'], PDO::PARAM_BOOL);
        $stmt->bindParam(':id', $user->id);
        $stmt->execute();
    }
    
    if ($user->update()) {
        ApiResponse::success($user->getPublicProfile(), 'User updated successfully');
    } else {
        ApiResponse::serverError('Failed to update user');
    }
}

/**
 * Handle DELETE request - Deactivate user (soft delete)
 */
function handleDeleteUser($db) {
    $user_id = isset($_GET['id']) ? intval($_GET['id']) : null;
    
    if (!$user_id) {
        ApiResponse::error('User ID is required', 400);
    }
    
    $user = new User($db);
    if (!$user->findById($user_id)) {
        ApiResponse::notFound('User not found');
    }
    
    // Soft delete - deactivate user instead of hard delete
    $query = "UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = :id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':id', $user_id);
    
    if ($stmt->execute()) {
        ApiResponse::success(null, 'User deactivated successfully');
    } else {
        ApiResponse::serverError('Failed to deactivate user');
    }
}

/**
 * JSON Database Handlers (Fallback when MySQL is not available)
 */

function handleGetUsersJson($jsonDb) {
    // Check if requesting a single user
    if (isset($_GET['id'])) {
        $userId = intval($_GET['id']);
        $user = $jsonDb->findUserById($userId);

        if ($user) {
            // Remove sensitive data
            unset($user['password_hash']);
            ApiResponse::success(['user' => $user], 'User retrieved successfully (JSON database)');
        } else {
            ApiResponse::notFound('User not found');
        }
        return;
    }

    // Get query parameters for list view
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? min(100, max(1, intval($_GET['limit']))) : 20;
    $search = isset($_GET['search']) ? Validator::sanitizeString($_GET['search']) : null;
    $role = isset($_GET['role']) ? Validator::sanitizeString($_GET['role']) : null;
    $status = isset($_GET['status']) ? Validator::sanitizeString($_GET['status']) : null;

    // Get users from JSON database
    $result = $jsonDb->getUsers($page, $limit, $search, $role, $status);
    $stats = $jsonDb->getUserStats();

    // Calculate pagination info
    $total_pages = ceil($result['total'] / $limit);

    $response_data = [
        'users' => $result['users'],
        'pagination' => [
            'current_page' => $page,
            'total_pages' => $total_pages,
            'total_count' => $result['total'],
            'limit' => $limit,
            'has_next' => $page < $total_pages,
            'has_prev' => $page > 1
        ],
        'filters' => [
            'search' => $search,
            'role' => $role,
            'status' => $status,
            'sort' => 'id',
            'order' => 'desc'
        ],
        'statistics' => $stats
    ];

    ApiResponse::success($response_data, 'Users retrieved successfully (JSON database)');
}

function handleCreateUserJson($jsonDb) {
    $data = json_decode(file_get_contents("php://input"), true);

    // Validate required fields
    $required_fields = ['name', 'email', 'password', 'role'];
    $validation_errors = Validator::validateRequired($required_fields, $data);

    if (!empty($validation_errors)) {
        ApiResponse::validationError($validation_errors);
    }

    // Additional validation
    if (!Validator::validateEmail($data['email'])) {
        $validation_errors['email'] = 'Invalid email format';
    }

    if (!Validator::validatePassword($data['password'])) {
        $validation_errors['password'] = 'Password must be at least 6 characters long';
    }

    $allowed_roles = ['admin', 'creator', 'business', 'user'];
    if (!in_array($data['role'], $allowed_roles)) {
        $validation_errors['role'] = 'Invalid role specified';
    }

    if (!empty($validation_errors)) {
        ApiResponse::validationError($validation_errors);
    }

    // Check if email exists
    if ($jsonDb->emailExists($data['email'])) {
        ApiResponse::error('Email address is already registered', 409);
    }

    // Create user data
    $userData = [
        'name' => Validator::sanitizeString($data['name']),
        'email' => Validator::sanitizeEmail($data['email']),
        'password_hash' => password_hash($data['password'], PASSWORD_DEFAULT),
        'role' => $data['role'],
        'bio' => isset($data['bio']) ? Validator::sanitizeString($data['bio']) : '',
        'location' => isset($data['location']) ? Validator::sanitizeString($data['location']) : '',
        'website' => isset($data['website']) ? Validator::sanitizeString($data['website']) : '',
        'phone' => isset($data['phone']) ? Validator::sanitizeString($data['phone']) : '',
        'company' => isset($data['company']) ? Validator::sanitizeString($data['company']) : '',
        'avatar_url' => null,
        'hero_banner_url' => null,
        'email_verified' => isset($data['email_verified']) ? (bool)$data['email_verified'] : true, // Default to verified for admin-created users
        'is_active' => isset($data['is_active']) ? (bool)$data['is_active'] : true,
        'last_login' => null,
        'permissions' => []
    ];

    // Add default permissions based on role
    switch ($data['role']) {
        case 'admin':
            $userData['permissions'] = ['all'];
            break;
        case 'creator':
            $userData['permissions'] = ['create_content', 'manage_profile', 'conduct_interviews'];
            break;
        case 'business':
            $userData['permissions'] = ['manage_business', 'manage_profile', 'respond_interviews'];
            break;
        case 'user':
        default:
            $userData['permissions'] = ['view_content', 'manage_profile'];
            break;
    }

    $newUser = $jsonDb->createUser($userData);

    if ($newUser) {
        // Remove sensitive data from response
        unset($newUser['password_hash']);
        ApiResponse::success($newUser, 'User created successfully (JSON database)', 201);
    } else {
        ApiResponse::serverError('Failed to create user');
    }
}

function handleUpdateUserJson($jsonDb) {
    $data = json_decode(file_get_contents("php://input"), true);

    if (!isset($data['id'])) {
        ApiResponse::error('User ID is required', 400);
    }

    $user = $jsonDb->findUserById($data['id']);
    if (!$user) {
        ApiResponse::notFound('User not found');
    }

    // Update allowed fields
    $updateData = [];

    if (isset($data['name'])) {
        $updateData['name'] = Validator::sanitizeString($data['name']);
    }

    if (isset($data['bio'])) {
        $updateData['bio'] = Validator::sanitizeString($data['bio']);
    }

    if (isset($data['location'])) {
        $updateData['location'] = Validator::sanitizeString($data['location']);
    }

    if (isset($data['website'])) {
        $updateData['website'] = Validator::sanitizeString($data['website']);
    }

    if (isset($data['phone'])) {
        $updateData['phone'] = Validator::sanitizeString($data['phone']);
    }

    if (isset($data['company'])) {
        $updateData['company'] = Validator::sanitizeString($data['company']);
    }

    if (isset($data['is_active'])) {
        $updateData['is_active'] = (bool)$data['is_active'];
    }

    if (isset($data['email_verified'])) {
        $updateData['email_verified'] = (bool)$data['email_verified'];
    }

    $updatedUser = $jsonDb->updateUser($data['id'], $updateData);

    if ($updatedUser) {
        // Remove sensitive data from response
        unset($updatedUser['password_hash']);
        ApiResponse::success($updatedUser, 'User updated successfully (JSON database)');
    } else {
        ApiResponse::serverError('Failed to update user');
    }
}

function handleDeleteUserJson($jsonDb) {
    $user_id = isset($_GET['id']) ? intval($_GET['id']) : null;

    if (!$user_id) {
        ApiResponse::error('User ID is required', 400);
    }

    $user = $jsonDb->findUserById($user_id);
    if (!$user) {
        ApiResponse::notFound('User not found');
    }

    // Soft delete - deactivate user
    $updatedUser = $jsonDb->updateUser($user_id, ['is_active' => false]);

    if ($updatedUser) {
        ApiResponse::success(null, 'User deactivated successfully (JSON database)');
    } else {
        ApiResponse::serverError('Failed to deactivate user');
    }
}
?>
