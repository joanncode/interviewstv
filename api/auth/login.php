<?php
/**
 * Login Endpoint for Interviews.tv API
 * Handles user authentication and JWT token generation
 */

require_once '../config/database.php';
require_once '../config/cors.php';
require_once '../config/json_database.php';
require_once '../models/User.php';

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ApiResponse::error('Method not allowed', 405);
}

try {
    // Get posted data
    $data = json_decode(file_get_contents("php://input"), true);

    // Validate required fields
    $required_fields = ['email', 'password'];
    $validation_errors = Validator::validateRequired($required_fields, $data);

    if (!empty($validation_errors)) {
        ApiResponse::validationError($validation_errors);
    }

    // Sanitize inputs
    $email = Validator::sanitizeEmail($data['email']);
    $password = $data['password'];

    // Validate email format
    if (!Validator::validateEmail($email)) {
        ApiResponse::validationError(['email' => 'Invalid email format']);
    }

    $user_data = null;
    $db_type = 'Unknown';

    // Try database first, fallback to JSON
    try {
        $database = new Database();
        $db = $database->getConnection();

        // Create user object
        $user = new User($db);

        // Find user by email
        if ($user->findByEmail($email)) {
            // Verify password
            if ($user->verifyPassword($password)) {
                // Check if user is active
                if ($user->is_active) {
                    // Check if email is verified
                    if (!$user->email_verified) {
                        ApiResponse::error('Please verify your email address before logging in. Check your inbox for a verification link.', 403);
                    }

                    // Update last login
                    $user->updateLastLogin();

                    $user_data = $user->getPrivateProfile();
                    $db_type = 'MySQL';
                } else {
                    ApiResponse::error('Account is deactivated. Please contact support.', 403);
                }
            }
        }
    } catch (Exception $dbException) {
        // Fallback to JSON database
        $jsonDb = new JsonDatabase();
        $user = $jsonDb->findUserByEmail($email);

        if ($user && password_verify($password, $user['password_hash'])) {
            if ($user['is_active']) {
                // Check if email is verified
                if (!isset($user['email_verified']) || !$user['email_verified']) {
                    ApiResponse::error('Please verify your email address before logging in. Check your inbox for a verification link.', 403);
                }

                // Update last login
                $jsonDb->updateUser($user['id'], ['last_login' => date('c')]);

                // Remove password hash from response
                unset($user['password_hash']);
                $user_data = $user;
                $db_type = 'JSON';
            } else {
                ApiResponse::error('Account is deactivated. Please contact support.', 403);
            }
        }
    }

    if (!$user_data) {
        ApiResponse::error('Invalid email or password', 401);
    }

    // Generate JWT token
    $token_payload = [
        'user_id' => $user_data['id'],
        'email' => $user_data['email'],
        'name' => $user_data['name'],
        'role' => $user_data['role'],
        'iat' => time(),
        'exp' => time() + (24 * 60 * 60) // 24 hours
    ];

    $jwt_token = JWTHelper::encode($token_payload);

    // Prepare response data
    $response_data = [
        'token' => $jwt_token,
        'user' => $user_data,
        'expires_in' => 24 * 60 * 60, // 24 hours in seconds
        'database' => $db_type
    ];

    // Log successful login
    error_log("Successful login for user: " . $user_data['email'] . " (ID: " . $user_data['id'] . ") using " . $db_type);

    ApiResponse::success($response_data, 'Login successful');

} catch (Exception $e) {
    error_log("Login error: " . $e->getMessage());
    ApiResponse::serverError('Login failed. Please try again.');
}
?>
