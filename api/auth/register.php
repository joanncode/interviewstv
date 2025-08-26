<?php
/**
 * Registration Endpoint for Interviews.tv API
 * Handles new user registration with validation
 */

require_once '../config/database.php';
require_once '../config/cors.php';
require_once '../models/User.php';

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ApiResponse::error('Method not allowed', 405);
}

try {
    // Get database connection
    $database = new Database();
    $db = $database->getConnection();

    // Get posted data
    $data = json_decode(file_get_contents("php://input"), true);

    // Validate required fields
    $required_fields = ['name', 'email', 'password'];
    $validation_errors = Validator::validateRequired($required_fields, $data);

    if (!empty($validation_errors)) {
        ApiResponse::validationError($validation_errors);
    }

    // Sanitize inputs
    $name = Validator::sanitizeString($data['name']);
    $email = Validator::sanitizeEmail($data['email']);
    $password = $data['password'];
    $role = isset($data['role']) ? Validator::sanitizeString($data['role']) : 'user';

    // Additional validation
    if (!Validator::validateEmail($email)) {
        $validation_errors['email'] = 'Invalid email format';
    }

    if (!Validator::validatePassword($password)) {
        $validation_errors['password'] = 'Password must be at least 6 characters long';
    }

    if (strlen($name) < 2) {
        $validation_errors['name'] = 'Name must be at least 2 characters long';
    }

    // Validate role
    $allowed_roles = ['user', 'creator', 'business'];
    if (!in_array($role, $allowed_roles)) {
        $role = 'user'; // Default to user role
    }

    if (!empty($validation_errors)) {
        ApiResponse::validationError($validation_errors);
    }

    // Create user object
    $user = new User($db);

    // Check if email already exists
    if ($user->emailExists($email)) {
        ApiResponse::error('Email address is already registered', 409);
    }

    // Set user properties
    $user->name = $name;
    $user->email = $email;
    $user->password_hash = User::hashPassword($password);
    $user->role = $role;
    $user->bio = '';
    $user->location = '';
    $user->website = '';
    $user->phone = '';
    $user->company = '';
    $user->email_verified = false; // Will be true after email verification

    // Create user
    if ($user->create()) {
        // Add default permissions based on role
        $permissions = [];
        switch ($role) {
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

        // Generate email verification token
        $verification_payload = [
            'type' => 'email_verification',
            'user_id' => $user->id,
            'iat' => time(),
            'exp' => time() + (24 * 60 * 60) // 24 hours
        ];

        $verification_token = JWTHelper::encode($verification_payload);

        // TODO: Send verification email
        // For now, we'll return the token for testing
        // In production, this should send an email and not return the token

        // Prepare response data
        $response_data = [
            'user' => $user->getPublicProfile(),
            'verification_token' => $verification_token, // Remove this in production
            'message' => 'Please verify your email address to complete registration'
        ];

        // Log successful registration
        error_log("New user registered: " . $user->email . " (ID: " . $user->id . ", Role: " . $user->role . ")");

        ApiResponse::success($response_data, 'Registration successful! Please check your email to verify your account.', 201);

    } else {
        ApiResponse::serverError('Registration failed. Please try again.');
    }

} catch (Exception $e) {
    error_log("Registration error: " . $e->getMessage());
    ApiResponse::serverError('Registration failed. Please try again.');
}
?>
