<?php
/**
 * Email Verification Endpoint for Interviews.tv API
 * Handles email verification using JWT tokens
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
    if (!isset($data['token']) || empty($data['token'])) {
        ApiResponse::error('Verification token is required', 400);
    }

    $token = $data['token'];

    // Decode and validate the JWT token
    $decoded = JWTHelper::decode($token);
    
    if (!$decoded) {
        ApiResponse::error('Invalid verification token', 400);
    }

    // Check if token is expired
    if (isset($decoded['exp']) && $decoded['exp'] < time()) {
        ApiResponse::error('Verification token has expired', 400);
    }

    // Check if this is an email verification token
    if (!isset($decoded['type']) || $decoded['type'] !== 'email_verification') {
        ApiResponse::error('Invalid token type', 400);
    }

    if (!isset($decoded['user_id'])) {
        ApiResponse::error('Invalid token format', 400);
    }

    $userId = $decoded['user_id'];

    // Get database connection
    $database = new Database();
    $db = $database->getConnection();

    // Find the user
    $user = new User($db);
    if (!$user->findById($userId)) {
        ApiResponse::error('User not found', 404);
    }

    // Check if email is already verified
    if ($user->email_verified) {
        ApiResponse::error('Email is already verified', 400);
    }

    // Update user's email verification status
    $query = "UPDATE users SET email_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = :id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':id', $userId);
    
    if ($stmt->execute()) {
        // Log successful verification
        error_log("Email verified for user: " . $user->email . " (ID: " . $userId . ")");
        
        ApiResponse::success(null, 'Email verified successfully! You can now log in to your account.');
    } else {
        ApiResponse::serverError('Failed to verify email. Please try again.');
    }

} catch (Exception $e) {
    error_log("Email verification error: " . $e->getMessage());
    ApiResponse::serverError('Email verification failed. Please try again.');
}
?>
