<?php
/**
 * User Profile Endpoint for Interviews.tv API
 * Handles user profile retrieval and updates
 */

require_once '../config/database.php';
require_once '../config/cors.php';
require_once '../models/User.php';

try {
    // Get database connection
    $database = new Database();
    $db = $database->getConnection();

    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            handleGetProfile($db);
            break;
        case 'PUT':
            handleUpdateProfile($db);
            break;
        default:
            ApiResponse::error('Method not allowed', 405);
    }

} catch (Exception $e) {
    error_log("Profile endpoint error: " . $e->getMessage());
    ApiResponse::serverError('Profile operation failed');
}

/**
 * Handle GET request - Retrieve user profile
 */
function handleGetProfile($db) {
    // Check if requesting specific user profile
    $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;
    
    if ($user_id) {
        // Get public profile of specific user
        $user = new User($db);
        if ($user->findById($user_id)) {
            ApiResponse::success($user->getPublicProfile(), 'Profile retrieved successfully');
        } else {
            ApiResponse::notFound('User not found');
        }
    } else {
        // Get current authenticated user's profile
        $current_user = Auth::requireAuth();
        
        $user = new User($db);
        if ($user->findById($current_user['user_id'])) {
            ApiResponse::success($user->getPrivateProfile(), 'Profile retrieved successfully');
        } else {
            ApiResponse::notFound('User not found');
        }
    }
}

/**
 * Handle PUT request - Update user profile
 */
function handleUpdateProfile($db) {
    // Require authentication
    $current_user = Auth::requireAuth();
    
    // Get posted data
    $data = json_decode(file_get_contents("php://input"), true);
    
    // Create user object
    $user = new User($db);
    if (!$user->findById($current_user['user_id'])) {
        ApiResponse::notFound('User not found');
    }
    
    // Validate and update fields
    $validation_errors = [];
    
    if (isset($data['name'])) {
        $name = Validator::sanitizeString($data['name']);
        if (strlen($name) < 2) {
            $validation_errors['name'] = 'Name must be at least 2 characters long';
        } else {
            $user->name = $name;
        }
    }
    
    if (isset($data['bio'])) {
        $user->bio = Validator::sanitizeString($data['bio']);
    }
    
    if (isset($data['location'])) {
        $user->location = Validator::sanitizeString($data['location']);
    }
    
    if (isset($data['website'])) {
        $website = Validator::sanitizeString($data['website']);
        if (!empty($website) && !filter_var($website, FILTER_VALIDATE_URL)) {
            $validation_errors['website'] = 'Invalid website URL';
        } else {
            $user->website = $website;
        }
    }
    
    if (isset($data['phone'])) {
        $user->phone = Validator::sanitizeString($data['phone']);
    }
    
    if (isset($data['company'])) {
        $user->company = Validator::sanitizeString($data['company']);
    }
    
    if (isset($data['avatar_url'])) {
        $user->avatar_url = Validator::sanitizeString($data['avatar_url']);
    }
    
    if (isset($data['hero_banner_url'])) {
        $user->hero_banner_url = Validator::sanitizeString($data['hero_banner_url']);
    }
    
    if (!empty($validation_errors)) {
        ApiResponse::validationError($validation_errors);
    }
    
    // Update user
    if ($user->update()) {
        ApiResponse::success($user->getPrivateProfile(), 'Profile updated successfully');
    } else {
        ApiResponse::serverError('Failed to update profile');
    }
}
?>
