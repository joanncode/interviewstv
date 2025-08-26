<?php

/**
 * Security Bootstrap
 * Initialize all security measures for the Interviews.tv application
 */

use App\Middleware\SecurityHeadersMiddleware;
use App\Services\SecurityValidationService;
use App\Config\SecurityConfig;

// Initialize security headers and settings
SecurityHeadersMiddleware::initialize();

// Set error reporting for security
if ($_ENV['APP_ENV'] === 'production') {
    error_reporting(0);
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
}

// Security-related PHP settings
ini_set('expose_php', 0);
ini_set('allow_url_fopen', 0);
ini_set('allow_url_include', 0);
ini_set('enable_dl', 0);
ini_set('file_uploads', 1);
ini_set('upload_max_filesize', '10M');
ini_set('post_max_size', '10M');
ini_set('max_execution_time', 30);
ini_set('max_input_time', 30);
ini_set('memory_limit', '128M');

// Session security
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', SecurityConfig::isEnabled('sessions', 'secure_cookies') ? 1 : 0);
ini_set('session.use_strict_mode', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_samesite', 'Strict');
ini_set('session.gc_maxlifetime', SecurityConfig::get('sessions', 'session_timeout_minutes') * 60);

// Disable dangerous functions
if (function_exists('ini_set')) {
    $dangerousFunctions = [
        'exec', 'passthru', 'shell_exec', 'system', 'proc_open', 'popen',
        'curl_exec', 'curl_multi_exec', 'parse_ini_file', 'show_source'
    ];
    
    foreach ($dangerousFunctions as $function) {
        if (function_exists($function)) {
            ini_set('disable_functions', ini_get('disable_functions') . ',' . $function);
        }
    }
}

// Set up error handler for security events
set_error_handler(function($severity, $message, $file, $line) {
    // Log security-related errors
    if (strpos($message, 'SQL') !== false || 
        strpos($message, 'injection') !== false ||
        strpos($message, 'XSS') !== false) {
        
        try {
            $securityValidator = new SecurityValidationService();
            $securityValidator->logSecurityEvent('php_security_error', [
                'severity' => $severity,
                'message' => $message,
                'file' => $file,
                'line' => $line
            ]);
        } catch (Exception $e) {
            error_log("Security error logging failed: " . $e->getMessage());
        }
    }
    
    // Continue with normal error handling
    return false;
});

// Set up exception handler for security events
set_exception_handler(function($exception) {
    // Log security-related exceptions
    $securityKeywords = ['SQL', 'injection', 'XSS', 'CSRF', 'authentication', 'authorization'];
    $message = $exception->getMessage();
    
    foreach ($securityKeywords as $keyword) {
        if (stripos($message, $keyword) !== false) {
            try {
                $securityValidator = new SecurityValidationService();
                $securityValidator->logSecurityEvent('php_security_exception', [
                    'message' => $message,
                    'file' => $exception->getFile(),
                    'line' => $exception->getLine(),
                    'trace' => $exception->getTraceAsString()
                ]);
            } catch (Exception $e) {
                error_log("Security exception logging failed: " . $e->getMessage());
            }
            break;
        }
    }
    
    // Handle the exception
    if ($_ENV['APP_ENV'] === 'production') {
        http_response_code(500);
        echo json_encode(['error' => 'Internal server error']);
    } else {
        echo "Uncaught exception: " . $exception->getMessage();
    }
    exit;
});

// Input validation and sanitization
function sanitizeGlobalInputs() {
    $securityValidator = new SecurityValidationService();
    
    // Sanitize $_GET
    if (!empty($_GET)) {
        foreach ($_GET as $key => $value) {
            $_GET[$key] = $securityValidator->sanitizeInput($value);
        }
    }
    
    // Sanitize $_POST
    if (!empty($_POST)) {
        foreach ($_POST as $key => $value) {
            $_POST[$key] = $securityValidator->sanitizeInput($value);
        }
    }
    
    // Sanitize $_COOKIE
    if (!empty($_COOKIE)) {
        foreach ($_COOKIE as $key => $value) {
            $_COOKIE[$key] = $securityValidator->sanitizeInput($value);
        }
    }
}

// Apply input sanitization
try {
    sanitizeGlobalInputs();
} catch (Exception $e) {
    error_log("Input sanitization failed: " . $e->getMessage());
}

// Check for banned IPs
function checkBannedIP() {
    try {
        $securityValidator = new SecurityValidationService();
        $clientIP = getClientIP();
        
        if ($securityValidator->isIPBanned($clientIP)) {
            $securityValidator->logSecurityEvent('banned_ip_access_attempt', [
                'ip_address' => $clientIP,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
                'request_uri' => $_SERVER['REQUEST_URI'] ?? null
            ]);
            
            http_response_code(403);
            echo json_encode(['error' => 'Access denied']);
            exit;
        }
    } catch (Exception $e) {
        error_log("IP ban check failed: " . $e->getMessage());
    }
}

// Get client IP address
function getClientIP() {
    $ipKeys = ['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'];
    
    foreach ($ipKeys as $key) {
        if (!empty($_SERVER[$key])) {
            $ip = $_SERVER[$key];
            // Handle comma-separated IPs (from proxies)
            if (strpos($ip, ',') !== false) {
                $ip = trim(explode(',', $ip)[0]);
            }
            
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return $ip;
            }
        }
    }
    
    return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
}

// Apply IP ban check
checkBannedIP();

// Rate limiting check
function checkRateLimit() {
    try {
        $securityValidator = new SecurityValidationService();
        $clientIP = getClientIP();
        $endpoint = $_SERVER['REQUEST_URI'] ?? '/';
        
        // Different rate limits for different endpoints
        $rateLimits = SecurityConfig::getRateLimiting();
        
        if (strpos($endpoint, '/api/auth/login') !== false) {
            $config = $rateLimits['login_attempts'];
            if (!$securityValidator->checkRateLimit($clientIP, 'login', $config['max_attempts'], $config['window_minutes'])) {
                http_response_code(429);
                echo json_encode(['error' => 'Too many login attempts. Please try again later.']);
                exit;
            }
        } elseif (strpos($endpoint, '/api/') !== false) {
            $config = $rateLimits['api_requests'];
            if (!$securityValidator->checkRateLimit($clientIP, 'api', $config['max_attempts'], $config['window_minutes'])) {
                http_response_code(429);
                echo json_encode(['error' => 'Rate limit exceeded. Please slow down.']);
                exit;
            }
        }
    } catch (Exception $e) {
        error_log("Rate limit check failed: " . $e->getMessage());
    }
}

// Apply rate limiting
checkRateLimit();

// HTTPS enforcement
if (SecurityConfig::isEnabled('api', 'require_https') && !isHTTPS()) {
    $redirectURL = 'https://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
    header("Location: {$redirectURL}", true, 301);
    exit;
}

function isHTTPS() {
    return (
        (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
        (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ||
        (!empty($_SERVER['HTTP_X_FORWARDED_SSL']) && $_SERVER['HTTP_X_FORWARDED_SSL'] === 'on') ||
        (!empty($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443)
    );
}

// Content Security Policy violation reporting
if ($_SERVER['REQUEST_URI'] === '/api/security/csp-report' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $report = json_decode($input, true);
    
    if ($report) {
        try {
            $securityValidator = new SecurityValidationService();
            $securityValidator->logSecurityEvent('csp_violation', [
                'report' => $report,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null
            ]);
        } catch (Exception $e) {
            error_log("CSP violation logging failed: " . $e->getMessage());
        }
    }
    
    http_response_code(204);
    exit;
}

// Security monitoring
function startSecurityMonitoring() {
    // Register shutdown function to log request completion
    register_shutdown_function(function() {
        try {
            $securityValidator = new SecurityValidationService();
            
            // Log suspicious requests
            $suspiciousPatterns = [
                '/\.\./i',
                '/union.*select/i',
                '/script.*>/i',
                '/eval\s*\(/i',
                '/exec\s*\(/i'
            ];
            
            $requestUri = $_SERVER['REQUEST_URI'] ?? '';
            $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
            $queryString = $_SERVER['QUERY_STRING'] ?? '';
            
            foreach ($suspiciousPatterns as $pattern) {
                if (preg_match($pattern, $requestUri . ' ' . $userAgent . ' ' . $queryString)) {
                    $securityValidator->logSecurityEvent('suspicious_request', [
                        'pattern_matched' => $pattern,
                        'request_uri' => $requestUri,
                        'user_agent' => $userAgent,
                        'query_string' => $queryString,
                        'ip_address' => getClientIP()
                    ]);
                    break;
                }
            }
        } catch (Exception $e) {
            error_log("Security monitoring failed: " . $e->getMessage());
        }
    });
}

// Start security monitoring
startSecurityMonitoring();

// Log successful security initialization
try {
    $securityValidator = new SecurityValidationService();
    $securityValidator->logSecurityEvent('security_initialized', [
        'timestamp' => date('Y-m-d H:i:s'),
        'environment' => $_ENV['APP_ENV'] ?? 'unknown',
        'ip_address' => getClientIP()
    ]);
} catch (Exception $e) {
    error_log("Security initialization logging failed: " . $e->getMessage());
}
