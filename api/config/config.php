<?php
/**
 * Main Configuration File for Interviews.tv
 * Central configuration management and environment setup
 */

// Error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set timezone
date_default_timezone_set('UTC');

// Define application constants
define('APP_NAME', 'Interviews.tv');
define('APP_VERSION', '1.0.0');
define('APP_ENV', $_ENV['APP_ENV'] ?? 'development');
define('APP_DEBUG', APP_ENV === 'development');

// Define paths
define('ROOT_PATH', dirname(__DIR__, 2));
define('API_PATH', ROOT_PATH . '/api');
define('CONFIG_PATH', API_PATH . '/config');
define('SRC_PATH', API_PATH . '/src');
define('PUBLIC_PATH', API_PATH . '/public');
define('STORAGE_PATH', ROOT_PATH . '/storage');
define('UPLOADS_PATH', STORAGE_PATH . '/uploads');

// Create directories if they don't exist
$directories = [STORAGE_PATH, UPLOADS_PATH, ROOT_PATH . '/data'];
foreach ($directories as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

// Database configuration
$dbConfig = [
    'development' => [
        'type' => 'json',
        'path' => ROOT_PATH . '/data',
        'mysql_fallback' => [
            'host' => 'localhost',
            'dbname' => 'interviews_tv',
            'username' => 'root',
            'password' => '',
            'charset' => 'utf8mb4'
        ]
    ],
    'production' => [
        'type' => 'mysql',
        'host' => $_ENV['DB_HOST'] ?? 'localhost',
        'dbname' => $_ENV['DB_NAME'] ?? 'interviews_tv',
        'username' => $_ENV['DB_USER'] ?? 'interviews_user',
        'password' => $_ENV['DB_PASS'] ?? '',
        'charset' => 'utf8mb4'
    ]
];

define('DB_CONFIG', $dbConfig[APP_ENV]);

// JWT Configuration
define('JWT_SECRET', $_ENV['JWT_SECRET'] ?? 'your-secret-key-change-in-production');
define('JWT_ALGORITHM', 'HS256');
define('JWT_EXPIRY', 3600 * 24 * 7); // 7 days

// Upload configuration
define('MAX_UPLOAD_SIZE', 100 * 1024 * 1024); // 100MB
define('ALLOWED_VIDEO_TYPES', ['mp4', 'mov', 'avi', 'webm']);
define('ALLOWED_AUDIO_TYPES', ['mp3', 'wav', 'm4a', 'aac']);
define('ALLOWED_IMAGE_TYPES', ['jpg', 'jpeg', 'png', 'gif', 'webp']);

// API Configuration
define('API_VERSION', 'v1');
define('API_BASE_URL', '/api/' . API_VERSION);
define('CORS_ORIGINS', ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:5173']);

// Email configuration (for development)
define('MAIL_FROM', 'noreply@interviews.tv');
define('MAIL_FROM_NAME', 'Interviews.tv');

// Security configuration
define('BCRYPT_COST', 12);
define('SESSION_LIFETIME', 3600 * 24); // 24 hours
define('RATE_LIMIT_REQUESTS', 100);
define('RATE_LIMIT_WINDOW', 3600); // 1 hour

// Feature flags
define('FEATURES', [
    'ai_enabled' => true,
    'live_streaming' => true,
    'monetization' => true,
    'analytics' => true,
    'moderation' => true,
    'internationalization' => true
]);

// Load required files
require_once CONFIG_PATH . '/database.php';
require_once CONFIG_PATH . '/cors.php';

// Autoloader for classes
spl_autoload_register(function ($className) {
    $file = SRC_PATH . '/' . str_replace('\\', '/', $className) . '.php';
    if (file_exists($file)) {
        require_once $file;
    }
});

// Helper functions
function getDatabase() {
    static $database = null;
    if ($database === null) {
        if (DB_CONFIG['type'] === 'json') {
            require_once CONFIG_PATH . '/json_database.php';
            $database = new JsonDatabase();
        } else {
            $database = new Database();
        }
    }
    return $database->getConnection();
}

function response($data, $status = 200, $headers = []) {
    http_response_code($status);
    
    // Set default headers
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    
    // Set custom headers
    foreach ($headers as $key => $value) {
        header("$key: $value");
    }
    
    echo json_encode($data);
    exit;
}

function error($message, $status = 400, $code = null) {
    response([
        'error' => true,
        'message' => $message,
        'code' => $code,
        'timestamp' => date('c')
    ], $status);
}

function success($data = null, $message = null) {
    $response = ['success' => true];
    if ($data !== null) $response['data'] = $data;
    if ($message !== null) $response['message'] = $message;
    response($response);
}

function validateRequired($data, $fields) {
    $missing = [];
    foreach ($fields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            $missing[] = $field;
        }
    }
    
    if (!empty($missing)) {
        error('Missing required fields: ' . implode(', ', $missing), 422);
    }
}

function sanitizeInput($input) {
    if (is_array($input)) {
        return array_map('sanitizeInput', $input);
    }
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

function generateUUID() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

function logError($message, $context = []) {
    $logEntry = [
        'timestamp' => date('c'),
        'message' => $message,
        'context' => $context,
        'trace' => debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 5)
    ];
    
    error_log(json_encode($logEntry));
}

// Initialize session if not CLI
if (php_sapi_name() !== 'cli') {
    session_start();
}

// Set up error handler
set_error_handler(function($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    
    logError("PHP Error: $message", [
        'severity' => $severity,
        'file' => $file,
        'line' => $line
    ]);
    
    if (APP_DEBUG) {
        throw new ErrorException($message, 0, $severity, $file, $line);
    }
    
    return true;
});

// Set up exception handler
set_exception_handler(function($exception) {
    logError("Uncaught Exception: " . $exception->getMessage(), [
        'file' => $exception->getFile(),
        'line' => $exception->getLine(),
        'trace' => $exception->getTraceAsString()
    ]);
    
    if (php_sapi_name() !== 'cli') {
        if (APP_DEBUG) {
            error($exception->getMessage() . ' in ' . $exception->getFile() . ':' . $exception->getLine(), 500);
        } else {
            error('Internal server error', 500);
        }
    }
});

// Environment-specific configuration
if (APP_ENV === 'development') {
    // Development-specific settings
    ini_set('log_errors', 1);
    ini_set('error_log', ROOT_PATH . '/error.log');
} elseif (APP_ENV === 'production') {
    // Production-specific settings
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
    ini_set('error_log', '/var/log/interviews-tv/error.log');
}

// Load environment variables if .env file exists
$envFile = ROOT_PATH . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
            list($key, $value) = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value);
        }
    }
}

// Application ready
if (APP_DEBUG) {
    error_log("Interviews.tv API initialized - Environment: " . APP_ENV);
}
?>
