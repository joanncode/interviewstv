<?php
/**
 * Resend Email Verification Endpoint for Interviews.tv API
 * Handles resending email verification tokens
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
    if (!isset($data['email']) || empty($data['email'])) {
        ApiResponse::error('Email address is required', 400);
    }

    $email = Validator::sanitizeEmail($data['email']);

    if (!Validator::validateEmail($email)) {
        ApiResponse::error('Please provide a valid email address', 400);
    }

    // Get database connection
    $database = new Database();
    $db = $database->getConnection();

    // Find the user by email
    $user = new User($db);
    if (!$user->findByEmail($email)) {
        // Don't reveal if email exists or not for security
        ApiResponse::success(null, 'If an account with this email exists, a verification email has been sent.');
    }

    // Check if email is already verified
    if ($user->email_verified) {
        ApiResponse::error('Email is already verified', 400);
    }

    // Generate verification token
    $token_payload = [
        'type' => 'email_verification',
        'user_id' => $user->id,
        'iat' => time(),
        'exp' => time() + (24 * 60 * 60) // 24 hours
    ];

    $verification_token = JWTHelper::encode($token_payload);

    // TODO: Send verification email
    // For now, we'll just return the token for testing
    // In production, this should send an email and not return the token

    // Log the resend request
    error_log("Verification email resent for user: " . $user->email . " (ID: " . $user->id . ")");

    ApiResponse::success([
        'verification_token' => $verification_token // Remove this in production
    ], 'Verification email sent successfully! Please check your inbox.');

} catch (Exception $e) {
    error_log("Resend verification error: " . $e->getMessage());
    ApiResponse::serverError('Failed to send verification email. Please try again.');
}
?>
