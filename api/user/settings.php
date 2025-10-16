<?php
/**
 * User Settings Endpoint for Interviews.tv API
 * Handles user settings retrieval and updates
 */

require_once '../config/database.php';
require_once '../config/cors.php';

// Custom auth helper for demo
class DemoAuth {
    public static function requireAuth() {
        global $db;

        // For demo purposes, we'll use a simple token check
        $headers = getallheaders();
        $token = $headers['Authorization'] ?? $_GET['token'] ?? null;

        if (!$token) {
            ApiResponse::error('Authentication required', 401);
        }

        // Extract user ID from demo token (format: demo-token-{timestamp})
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
    $path = $_GET['type'] ?? 'all';

    switch ($method) {
        case 'GET':
            handleGetSettings($db, $path);
            break;
        case 'PUT':
            handleUpdateSettings($db, $path);
            break;
        default:
            ApiResponse::error('Method not allowed', 405);
    }

} catch (Exception $e) {
    error_log("Settings endpoint error: " . $e->getMessage());
    ApiResponse::error('Settings operation failed', 500);
}

/**
 * Handle GET request - Retrieve user settings
 */
function handleGetSettings($db, $type) {
    $current_user = DemoAuth::requireAuth();
    $user_id = $current_user['user_id'];
    
    $settings = [];
    
    if ($type === 'all' || $type === 'privacy') {
        $stmt = $db->prepare("SELECT * FROM user_privacy_settings WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $privacy = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$privacy) {
            // Create default privacy settings
            $stmt = $db->prepare("INSERT INTO user_privacy_settings (user_id) VALUES (?)");
            $stmt->execute([$user_id]);
            
            $stmt = $db->prepare("SELECT * FROM user_privacy_settings WHERE user_id = ?");
            $stmt->execute([$user_id]);
            $privacy = $stmt->fetch(PDO::FETCH_ASSOC);
        }
        
        $settings['privacy'] = $privacy;
    }
    
    if ($type === 'all' || $type === 'notifications') {
        $stmt = $db->prepare("SELECT * FROM user_notification_settings WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $notifications = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$notifications) {
            // Create default notification settings
            $stmt = $db->prepare("INSERT INTO user_notification_settings (user_id) VALUES (?)");
            $stmt->execute([$user_id]);
            
            $stmt = $db->prepare("SELECT * FROM user_notification_settings WHERE user_id = ?");
            $stmt->execute([$user_id]);
            $notifications = $stmt->fetch(PDO::FETCH_ASSOC);
        }
        
        $settings['notifications'] = $notifications;
    }
    
    if ($type === 'all' || $type === 'account') {
        $stmt = $db->prepare("SELECT * FROM user_account_settings WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $account = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$account) {
            // Create default account settings
            $stmt = $db->prepare("INSERT INTO user_account_settings (user_id) VALUES (?)");
            $stmt->execute([$user_id]);
            
            $stmt = $db->prepare("SELECT * FROM user_account_settings WHERE user_id = ?");
            $stmt->execute([$user_id]);
            $account = $stmt->fetch(PDO::FETCH_ASSOC);
        }
        
        $settings['account'] = $account;
    }
    
    ApiResponse::success($settings, 'Settings retrieved successfully');
}

/**
 * Handle PUT request - Update user settings
 */
function handleUpdateSettings($db, $type) {
    $current_user = DemoAuth::requireAuth();
    $user_id = $current_user['user_id'];
    
    // Get posted data
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!$data) {
        ApiResponse::error('Invalid JSON data');
    }
    
    try {
        $db->beginTransaction();
        
        if ($type === 'privacy' && isset($data['privacy'])) {
            updatePrivacySettings($db, $user_id, $data['privacy']);
        }
        
        if ($type === 'notifications' && isset($data['notifications'])) {
            updateNotificationSettings($db, $user_id, $data['notifications']);
        }
        
        if ($type === 'account' && isset($data['account'])) {
            updateAccountSettings($db, $user_id, $data['account']);
        }
        
        if ($type === 'profile' && isset($data['profile'])) {
            updateProfileSettings($db, $user_id, $data['profile']);
        }
        
        $db->commit();
        ApiResponse::success(null, 'Settings updated successfully');
        
    } catch (Exception $e) {
        $db->rollBack();
        error_log("Settings update error: " . $e->getMessage());
        ApiResponse::error('Failed to update settings');
    }
}

function updatePrivacySettings($db, $user_id, $privacy) {
    $sql = "UPDATE user_privacy_settings SET 
            profile_visibility = ?,
            allow_comments = ?,
            allow_downloads = ?,
            show_in_search = ?,
            allow_messages = ?,
            allow_interview_requests = ?,
            updated_at = NOW()
            WHERE user_id = ?";
    
    $stmt = $db->prepare($sql);
    return $stmt->execute([
        $privacy['profileVisibility'] ?? 'public',
        $privacy['allowComments'] ? 1 : 0,
        $privacy['allowDownloads'] ? 1 : 0,
        $privacy['showInSearch'] ? 1 : 0,
        $privacy['allowMessages'] ? 1 : 0,
        $privacy['allowInterviewRequests'] ? 1 : 0,
        $user_id
    ]);
}

function updateNotificationSettings($db, $user_id, $notifications) {
    $sql = "UPDATE user_notification_settings SET 
            email_new_followers = ?,
            email_new_comments = ?,
            email_interview_requests = ?,
            email_weekly_digest = ?,
            push_new_followers = ?,
            push_new_comments = ?,
            push_interview_requests = ?,
            in_app_all = ?,
            in_app_sound = ?,
            updated_at = NOW()
            WHERE user_id = ?";
    
    $stmt = $db->prepare($sql);
    return $stmt->execute([
        $notifications['emailNewFollowers'] ? 1 : 0,
        $notifications['emailNewComments'] ? 1 : 0,
        $notifications['emailInterviewRequests'] ? 1 : 0,
        $notifications['emailWeeklyDigest'] ? 1 : 0,
        $notifications['pushNewFollowers'] ? 1 : 0,
        $notifications['pushNewComments'] ? 1 : 0,
        $notifications['pushInterviewRequests'] ? 1 : 0,
        $notifications['inAppAll'] ? 1 : 0,
        $notifications['inAppSound'] ? 1 : 0,
        $user_id
    ]);
}

function updateAccountSettings($db, $user_id, $account) {
    $sql = "UPDATE user_account_settings SET 
            two_factor_enabled = ?,
            login_notifications = ?,
            session_timeout = ?,
            updated_at = NOW()
            WHERE user_id = ?";
    
    $stmt = $db->prepare($sql);
    return $stmt->execute([
        $account['twoFactorEnabled'] ? 1 : 0,
        $account['loginNotifications'] ? 1 : 0,
        $account['sessionTimeout'] ?? 30,
        $user_id
    ]);
}

function updateProfileSettings($db, $user_id, $profile) {
    $sql = "UPDATE users SET 
            name = ?,
            bio = ?,
            location = ?,
            website = ?,
            phone = ?,
            company = ?,
            avatar_url = ?,
            hero_banner_url = ?,
            updated_at = NOW()
            WHERE id = ?";
    
    $stmt = $db->prepare($sql);
    return $stmt->execute([
        $profile['name'] ?? null,
        $profile['bio'] ?? null,
        $profile['location'] ?? null,
        $profile['website'] ?? null,
        $profile['phone'] ?? null,
        $profile['company'] ?? null,
        $profile['avatar'] ?? null,
        $profile['heroBanner'] ?? null,
        $user_id
    ]);
}
?>
