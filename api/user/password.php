<?php
/**
 * User Password Change Endpoint for Interviews.tv API
 * Handles password updates with validation
 */

require_once '../config/database.php';
require_once '../config/cors.php';

// Custom auth helper for demo
class DemoAuth {
    public static function requireAuth() {
        global $db;

        $headers = getallheaders();
        $token = $headers['Authorization'] ?? $_GET['token'] ?? null;

        if (!$token) {
            ApiResponse::error('Authentication required', 401);
        }

        if (strpos($token, 'Bearer ') === 0) {
            $token = substr($token, 7);
        }

        // For demo, find the admin user
        try {
            $stmt = $db->prepare("SELECT id FROM users WHERE email = 'admin@interviews.tv'");
            $stmt->execute();
            $user = $stmt->fetch();

            if ($user) {
                return ['user_id' => $user['id']];
            }
        } catch (Exception $e) {
            // Fallback to first admin user
        }

        // Fallback: find any admin user
        try {
            $stmt = $db->prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
            $stmt->execute();
            $user = $stmt->fetch();

            if ($user) {
                return ['user_id' => $user['id']];
            }
        } catch (Exception $e) {
            // Final fallback
        }

        ApiResponse::error('User not found', 404);
    }
}

try {
    // Get database connection
    $database = new Database();
    $db = $database->getConnection();

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method !== 'PUT') {
        ApiResponse::error('Method not allowed', 405);
    }

    handlePasswordChange($db);

} catch (Exception $e) {
    error_log("Password change error: " . $e->getMessage());
    ApiResponse::error('Password change failed', 500);
}

/**
 * Handle password change request
 */
function handlePasswordChange($db) {
    $current_user = DemoAuth::requireAuth();
    $user_id = $current_user['user_id'];
    
    // Get posted data
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!$data) {
        ApiResponse::error('Invalid JSON data');
    }
    
    $currentPassword = $data['currentPassword'] ?? '';
    $newPassword = $data['newPassword'] ?? '';
    $confirmPassword = $data['confirmPassword'] ?? '';
    
    // Validation
    if (empty($currentPassword)) {
        ApiResponse::error('Current password is required');
    }
    
    if (empty($newPassword)) {
        ApiResponse::error('New password is required');
    }
    
    if (strlen($newPassword) < 6) {
        ApiResponse::error('New password must be at least 6 characters long');
    }
    
    if ($newPassword !== $confirmPassword) {
        ApiResponse::error('New password and confirmation do not match');
    }
    
    // Get current user data
    $stmt = $db->prepare("SELECT password, password_hash FROM users WHERE id = ?");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        ApiResponse::error('User not found', 404);
    }
    
    // For demo users, check against the plain text password
    $currentPasswordValid = false;
    if (!empty($user['password']) && $user['password'] === $currentPassword) {
        $currentPasswordValid = true;
    } elseif (!empty($user['password_hash']) && password_verify($currentPassword, $user['password_hash'])) {
        $currentPasswordValid = true;
    }
    
    if (!$currentPasswordValid) {
        ApiResponse::error('Current password is incorrect');
    }
    
    // Hash the new password
    $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);
    
    // Update password
    $stmt = $db->prepare("UPDATE users SET password_hash = ?, password = ?, updated_at = NOW() WHERE id = ?");
    $success = $stmt->execute([$newPasswordHash, $newPassword, $user_id]);
    
    if ($success) {
        // Log security event
        try {
            $stmt = $db->prepare("INSERT INTO security_events (user_id, event_type, description, ip_address, created_at) VALUES (?, ?, ?, ?, NOW())");
            $stmt->execute([
                $user_id,
                'password_change',
                'User changed their password',
                $_SERVER['REMOTE_ADDR'] ?? 'unknown'
            ]);
        } catch (Exception $e) {
            // Log error but don't fail the password change
            error_log("Failed to log security event: " . $e->getMessage());
        }
        
        ApiResponse::success(null, 'Password changed successfully');
    } else {
        ApiResponse::error('Failed to update password');
    }
}
?>
