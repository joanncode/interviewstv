<?php
/**
 * CORS Configuration for Interviews.tv API
 * Handles Cross-Origin Resource Sharing for frontend-backend communication
 */

// Set CORS headers
header("Access-Control-Allow-Origin: http://localhost:8000");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/**
 * API Response Helper Class
 */
class ApiResponse {
    
    public static function success($data = null, $message = 'Success', $code = 200) {
        http_response_code($code);
        echo json_encode([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('c')
        ]);
        exit();
    }
    
    public static function error($message = 'An error occurred', $code = 400, $errors = null) {
        http_response_code($code);
        echo json_encode([
            'success' => false,
            'message' => $message,
            'errors' => $errors,
            'timestamp' => date('c')
        ]);
        exit();
    }
    
    public static function unauthorized($message = 'Unauthorized access') {
        self::error($message, 401);
    }
    
    public static function forbidden($message = 'Access forbidden') {
        self::error($message, 403);
    }
    
    public static function notFound($message = 'Resource not found') {
        self::error($message, 404);
    }
    
    public static function validationError($errors, $message = 'Validation failed') {
        self::error($message, 422, $errors);
    }
    
    public static function serverError($message = 'Internal server error') {
        self::error($message, 500);
    }
}

/**
 * Input Validation Helper
 */
class Validator {
    
    public static function validateEmail($email) {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
    
    public static function validatePassword($password) {
        return strlen($password) >= 6;
    }
    
    public static function validateRequired($fields, $data) {
        $errors = [];
        
        foreach ($fields as $field) {
            if (!isset($data[$field]) || empty(trim($data[$field]))) {
                $errors[$field] = ucfirst($field) . ' is required';
            }
        }
        
        return $errors;
    }
    
    public static function sanitizeString($string) {
        return htmlspecialchars(strip_tags(trim($string)));
    }
    
    public static function sanitizeEmail($email) {
        return filter_var(trim($email), FILTER_SANITIZE_EMAIL);
    }
}

/**
 * JWT Token Helper (Simple implementation)
 */
class JWTHelper {
    private static $secret_key = "interviews_tv_secret_key_2024";
    
    public static function encode($payload) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode($payload);
        
        $base64Header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
        
        $signature = hash_hmac('sha256', $base64Header . "." . $base64Payload, self::$secret_key, true);
        $base64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        
        return $base64Header . "." . $base64Payload . "." . $base64Signature;
    }
    
    public static function decode($jwt) {
        $parts = explode('.', $jwt);
        
        if (count($parts) !== 3) {
            return false;
        }
        
        $header = base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[0]));
        $payload = base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1]));
        $signature = base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[2]));
        
        $expectedSignature = hash_hmac('sha256', $parts[0] . "." . $parts[1], self::$secret_key, true);
        
        if (!hash_equals($signature, $expectedSignature)) {
            return false;
        }
        
        return json_decode($payload, true);
    }
    
    public static function validateToken($token) {
        $decoded = self::decode($token);
        
        if (!$decoded) {
            return false;
        }
        
        // Check if token is expired
        if (isset($decoded['exp']) && $decoded['exp'] < time()) {
            return false;
        }
        
        return $decoded;
    }
}

/**
 * Authentication Helper
 */
class Auth {
    
    public static function getAuthToken() {
        $headers = getallheaders();
        
        if (isset($headers['Authorization'])) {
            $authHeader = $headers['Authorization'];
            if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                return $matches[1];
            }
        }
        
        return null;
    }
    
    public static function getCurrentUser() {
        $token = self::getAuthToken();
        
        if (!$token) {
            return null;
        }
        
        $decoded = JWTHelper::validateToken($token);
        
        if (!$decoded) {
            return null;
        }
        
        return $decoded;
    }
    
    public static function requireAuth() {
        $user = self::getCurrentUser();
        
        if (!$user) {
            ApiResponse::unauthorized('Authentication required');
        }
        
        return $user;
    }
    
    public static function requireRole($requiredRole) {
        $user = self::requireAuth();
        
        if ($user['role'] !== $requiredRole && $user['role'] !== 'admin') {
            ApiResponse::forbidden('Insufficient permissions');
        }
        
        return $user;
    }
}
?>
