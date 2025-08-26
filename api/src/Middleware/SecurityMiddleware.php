<?php

namespace App\Middleware;

use App\Services\SecureAuthService;
use App\Services\RoleBasedAccessControl;
use App\Services\CsrfProtection;
use App\Services\SecurityValidationService;

class SecurityMiddleware
{
    private $authService;
    private $rbac;
    private $csrf;
    private $securityValidator;
    private $pdo;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
        $this->authService = new SecureAuthService($pdo);
        $this->rbac = new RoleBasedAccessControl($pdo);
        $this->csrf = new CsrfProtection();
        $this->securityValidator = new SecurityValidationService($pdo);
    }
    
    /**
     * Authenticate user middleware
     */
    public function authenticate($request = null, $response = null, $next = null)
    {
        $user = $this->authService->validateSession();
        
        if (!$user) {
            $this->handleUnauthorized('Authentication required');
            return false;
        }
        
        // Store user in request context
        $_SESSION['current_user'] = $user;
        
        if ($next) {
            return $next($request, $response);
        }
        
        return true;
    }
    
    /**
     * Check if user has required permission
     */
    public function requirePermission($permission, $resourceId = null)
    {
        return function($request = null, $response = null, $next = null) use ($permission, $resourceId) {
            $user = $this->getCurrentUser();
            
            if (!$user) {
                $this->handleUnauthorized('Authentication required');
                return false;
            }
            
            if (!$this->rbac->hasPermission($user['user_id'], $permission, $resourceId)) {
                $this->handleForbidden("Permission '{$permission}' required");
                return false;
            }
            
            if ($next) {
                return $next($request, $response);
            }
            
            return true;
        };
    }
    
    /**
     * Check if user has any of the required permissions
     */
    public function requireAnyPermission($permissions, $resourceId = null)
    {
        return function($request = null, $response = null, $next = null) use ($permissions, $resourceId) {
            $user = $this->getCurrentUser();
            
            if (!$user) {
                $this->handleUnauthorized('Authentication required');
                return false;
            }
            
            if (!$this->rbac->hasAnyPermission($user['user_id'], $permissions, $resourceId)) {
                $this->handleForbidden('Insufficient permissions');
                return false;
            }
            
            if ($next) {
                return $next($request, $response);
            }
            
            return true;
        };
    }
    
    /**
     * Check if user has required role
     */
    public function requireRole($role)
    {
        return function($request = null, $response = null, $next = null) use ($role) {
            $user = $this->getCurrentUser();
            
            if (!$user) {
                $this->handleUnauthorized('Authentication required');
                return false;
            }
            
            if (!$this->rbac->hasRole($user['user_id'], $role)) {
                $this->handleForbidden("Role '{$role}' required");
                return false;
            }
            
            if ($next) {
                return $next($request, $response);
            }
            
            return true;
        };
    }
    
    /**
     * Check if user has any of the required roles
     */
    public function requireAnyRole($roles)
    {
        return function($request = null, $response = null, $next = null) use ($roles) {
            $user = $this->getCurrentUser();
            
            if (!$user) {
                $this->handleUnauthorized('Authentication required');
                return false;
            }
            
            if (!$this->rbac->hasAnyRole($user['user_id'], $roles)) {
                $this->handleForbidden('Insufficient role privileges');
                return false;
            }
            
            if ($next) {
                return $next($request, $response);
            }
            
            return true;
        };
    }
    
    /**
     * CSRF protection middleware
     */
    public function csrfProtection($action = 'default')
    {
        return function($request = null, $response = null, $next = null) use ($action) {
            if ($_SERVER['REQUEST_METHOD'] === 'POST' || 
                $_SERVER['REQUEST_METHOD'] === 'PUT' || 
                $_SERVER['REQUEST_METHOD'] === 'DELETE') {
                
                if (!$this->csrf->validateRequest(null, $action)) {
                    $this->handleCsrfFailure();
                    return false;
                }
            }
            
            if ($next) {
                return $next($request, $response);
            }
            
            return true;
        };
    }
    
    /**
     * Rate limiting middleware
     */
    public function rateLimit($maxRequests = 60, $windowMinutes = 1)
    {
        return function($request = null, $response = null, $next = null) use ($maxRequests, $windowMinutes) {
            $clientId = $this->getClientIdentifier();
            $windowStart = time() - ($windowMinutes * 60);
            
            // Clean old entries
            $this->cleanOldRateLimitEntries($windowStart);
            
            // Count requests in current window
            $requestCount = $this->getRateLimitCount($clientId, $windowStart);
            
            if ($requestCount >= $maxRequests) {
                $this->handleRateLimitExceeded($maxRequests, $windowMinutes);
                return false;
            }
            
            // Record this request
            $this->recordRateLimitRequest($clientId);
            
            if ($next) {
                return $next($request, $response);
            }
            
            return true;
        };
    }
    
    /**
     * IP whitelist middleware
     */
    public function ipWhitelist($allowedIps)
    {
        return function($request = null, $response = null, $next = null) use ($allowedIps) {
            $clientIp = $this->getClientIp();
            
            if (!in_array($clientIp, $allowedIps)) {
                $this->handleForbidden('IP address not allowed');
                return false;
            }
            
            if ($next) {
                return $next($request, $response);
            }
            
            return true;
        };
    }
    
    /**
     * Security headers middleware
     */
    public function securityHeaders()
    {
        return function($request = null, $response = null, $next = null) {
            // Set security headers
            header('X-Content-Type-Options: nosniff');
            header('X-Frame-Options: DENY');
            header('X-XSS-Protection: 1; mode=block');
            header('Referrer-Policy: strict-origin-when-cross-origin');
            header('Content-Security-Policy: default-src \'self\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\';');
            
            if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
                header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
            }
            
            if ($next) {
                return $next($request, $response);
            }
            
            return true;
        };
    }
    
    /**
     * Input validation middleware
     */
    public function validateInput($rules)
    {
        return function($request = null, $response = null, $next = null) use ($rules) {
            $data = $this->getRequestData();
            $validator = new \App\Services\ValidationService();
            
            if (!$validator->validate($data, $rules)) {
                $this->handleValidationErrors($validator->getErrors());
                return false;
            }
            
            if ($next) {
                return $next($request, $response);
            }
            
            return true;
        };
    }
    
    /**
     * Comprehensive security validation middleware
     */
    public function securityValidation()
    {
        return function($request = null, $response = null, $next = null) {
            $clientIP = $this->getClientIP();

            // Check if IP is banned
            if ($this->securityValidator->isIPBanned($clientIP)) {
                $this->handleBannedIP($clientIP);
                return false;
            }

            // Check rate limiting
            $identifier = $clientIP . '_' . ($_SESSION['user_id'] ?? 'anonymous');
            if (!$this->securityValidator->checkRateLimit($identifier, 'api_request', 100, 1)) {
                $this->handleRateLimitExceeded(100, 1);
                return false;
            }

            // Validate and sanitize input data
            $this->validateAndSanitizeInput();

            // Log security event
            $this->securityValidator->logSecurityEvent('api_request', [
                'endpoint' => $_SERVER['REQUEST_URI'] ?? '',
                'method' => $_SERVER['REQUEST_METHOD'] ?? '',
                'user_id' => $_SESSION['user_id'] ?? null
            ]);

            if ($next) {
                return $next($request, $response);
            }

            return true;
        };
    }

    /**
     * Login security validation
     */
    public function loginSecurity()
    {
        return function($request = null, $response = null, $next = null) {
            $clientIP = $this->getClientIP();
            $identifier = $clientIP;

            // Check for brute force attempts
            if (!$this->securityValidator->checkLoginAttempts($identifier)) {
                $this->handleBruteForceDetected($identifier);
                return false;
            }

            // Additional rate limiting for login attempts
            if (!$this->securityValidator->checkRateLimit($identifier, 'login_attempt', 5, 15)) {
                $this->handleLoginRateLimitExceeded();
                return false;
            }

            if ($next) {
                return $next($request, $response);
            }

            return true;
        };
    }

    /**
     * File upload security validation
     */
    public function fileUploadSecurity($allowedTypes = [], $maxSize = 10485760)
    {
        return function($request = null, $response = null, $next = null) use ($allowedTypes, $maxSize) {
            if (!empty($_FILES)) {
                foreach ($_FILES as $file) {
                    try {
                        $this->securityValidator->validateFileUpload($file, $allowedTypes, $maxSize);
                    } catch (\Exception $e) {
                        $this->handleFileUploadError($e->getMessage());
                        return false;
                    }
                }
            }

            if ($next) {
                return $next($request, $response);
            }

            return true;
        };
    }

    /**
     * API key validation middleware
     */
    public function apiKeyValidation()
    {
        return function($request = null, $response = null, $next = null) {
            $apiKey = $this->getApiKeyFromRequest();

            if (!$apiKey) {
                $this->handleMissingApiKey();
                return false;
            }

            if (!$this->validateApiKey($apiKey)) {
                $this->handleInvalidApiKey();
                return false;
            }

            if ($next) {
                return $next($request, $response);
            }

            return true;
        };
    }

    /**
     * Validate and sanitize all input data
     */
    private function validateAndSanitizeInput()
    {
        // Sanitize GET parameters
        if (!empty($_GET)) {
            foreach ($_GET as $key => $value) {
                $_GET[$key] = $this->securityValidator->sanitizeInput($value);
            }
        }

        // Sanitize POST parameters
        if (!empty($_POST)) {
            foreach ($_POST as $key => $value) {
                $_POST[$key] = $this->securityValidator->sanitizeInput($value);
            }
        }

        // Sanitize JSON input
        $input = file_get_contents('php://input');
        if (!empty($input)) {
            try {
                $data = json_decode($input, true);
                if ($data) {
                    $sanitized = $this->securityValidator->sanitizeInput($data);
                    // Store sanitized data for later use
                    $_REQUEST['sanitized_json'] = $sanitized;
                }
            } catch (\Exception $e) {
                $this->securityValidator->logSecurityEvent('invalid_json_input', [
                    'error' => $e->getMessage(),
                    'input_length' => strlen($input)
                ]);
            }
        }
    }

    /**
     * Get client IP address
     */
    private function getClientIP()
    {
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

    /**
     * Get API key from request
     */
    private function getApiKeyFromRequest()
    {
        // Check Authorization header
        $headers = getallheaders();
        if (isset($headers['Authorization'])) {
            if (preg_match('/Bearer\s+(.*)$/i', $headers['Authorization'], $matches)) {
                return $matches[1];
            }
        }

        // Check X-API-Key header
        if (isset($headers['X-API-Key'])) {
            return $headers['X-API-Key'];
        }

        // Check query parameter
        return $_GET['api_key'] ?? null;
    }

    /**
     * Validate API key
     */
    private function validateApiKey($apiKey)
    {
        try {
            $keyHash = hash('sha256', $apiKey);

            $stmt = $this->pdo->prepare("
                SELECT ak.*, u.id as user_id, u.name as user_name
                FROM api_keys ak
                JOIN users u ON ak.user_id = u.id
                WHERE ak.key_hash = ? AND ak.is_active = 1
                AND (ak.expires_at IS NULL OR ak.expires_at > NOW())
            ");

            $stmt->execute([$keyHash]);
            $keyData = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$keyData) {
                return false;
            }

            // Update last used timestamp
            $stmt = $this->pdo->prepare("UPDATE api_keys SET last_used_at = NOW() WHERE id = ?");
            $stmt->execute([$keyData['id']]);

            // Store key data in session for later use
            $_SESSION['api_key_data'] = $keyData;

            return true;

        } catch (\Exception $e) {
            $this->securityValidator->logSecurityEvent('api_key_validation_error', [
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Handle banned IP
     */
    private function handleBannedIP($ip)
    {
        $this->securityValidator->logSecurityEvent('banned_ip_access', ['ip' => $ip]);
        http_response_code(403);
        echo json_encode(['error' => 'Access denied']);
        exit;
    }

    /**
     * Handle brute force detection
     */
    private function handleBruteForceDetected($identifier)
    {
        $this->securityValidator->logSecurityEvent('brute_force_detected', ['identifier' => $identifier]);
        http_response_code(429);
        echo json_encode(['error' => 'Too many failed login attempts. Please try again later.']);
        exit;
    }

    /**
     * Handle login rate limit exceeded
     */
    private function handleLoginRateLimitExceeded()
    {
        http_response_code(429);
        echo json_encode(['error' => 'Too many login attempts. Please wait before trying again.']);
        exit;
    }

    /**
     * Handle file upload error
     */
    private function handleFileUploadError($message)
    {
        $this->securityValidator->logSecurityEvent('file_upload_error', ['error' => $message]);
        http_response_code(400);
        echo json_encode(['error' => 'File upload error: ' . $message]);
        exit;
    }

    /**
     * Handle missing API key
     */
    private function handleMissingApiKey()
    {
        $this->securityValidator->logSecurityEvent('missing_api_key');
        http_response_code(401);
        echo json_encode(['error' => 'API key required']);
        exit;
    }

    /**
     * Handle invalid API key
     */
    private function handleInvalidApiKey()
    {
        $this->securityValidator->logSecurityEvent('invalid_api_key');
        http_response_code(401);
        echo json_encode(['error' => 'Invalid API key']);
        exit;
    }

    /**
     * Get current authenticated user
     */
    private function getCurrentUser()
    {
        return isset($_SESSION['current_user']) ? $_SESSION['current_user'] : null;
    }
    
    /**
     * Get client identifier for rate limiting
     */
    private function getClientIdentifier()
    {
        $user = $this->getCurrentUser();
        if ($user) {
            return 'user_' . $user['user_id'];
        }
        
        return 'ip_' . $this->getClientIp();
    }
    

    
    /**
     * Get request data
     */
    private function getRequestData()
    {
        $data = [];
        
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $data = $_GET;
        } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $data = $_POST;
        } else {
            $input = file_get_contents('php://input');
            $data = json_decode($input, true) ?: [];
        }
        
        return $data;
    }
    
    /**
     * Rate limiting helper methods
     */
    private function cleanOldRateLimitEntries($windowStart)
    {
        if (!isset($_SESSION['rate_limit_requests'])) {
            $_SESSION['rate_limit_requests'] = [];
        }
        
        $_SESSION['rate_limit_requests'] = array_filter(
            $_SESSION['rate_limit_requests'],
            function($entry) use ($windowStart) {
                return $entry['timestamp'] >= $windowStart;
            }
        );
    }
    
    private function getRateLimitCount($clientId, $windowStart)
    {
        if (!isset($_SESSION['rate_limit_requests'])) {
            return 0;
        }
        
        $count = 0;
        foreach ($_SESSION['rate_limit_requests'] as $entry) {
            if ($entry['client_id'] === $clientId && $entry['timestamp'] >= $windowStart) {
                $count++;
            }
        }
        
        return $count;
    }
    
    private function recordRateLimitRequest($clientId)
    {
        if (!isset($_SESSION['rate_limit_requests'])) {
            $_SESSION['rate_limit_requests'] = [];
        }
        
        $_SESSION['rate_limit_requests'][] = [
            'client_id' => $clientId,
            'timestamp' => time()
        ];
    }
    
    /**
     * Error handlers
     */
    private function handleUnauthorized($message)
    {
        http_response_code(401);
        
        if ($this->isAjaxRequest()) {
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => $message,
                'error_code' => 'UNAUTHORIZED'
            ]);
        } else {
            header('Location: /login');
        }
        
        exit;
    }
    
    private function handleForbidden($message)
    {
        http_response_code(403);
        
        if ($this->isAjaxRequest()) {
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => $message,
                'error_code' => 'FORBIDDEN'
            ]);
        } else {
            echo '<!DOCTYPE html><html><head><title>403 Forbidden</title></head><body><h1>403 Forbidden</h1><p>' . htmlspecialchars($message) . '</p></body></html>';
        }
        
        exit;
    }
    
    private function handleCsrfFailure()
    {
        http_response_code(403);
        
        if ($this->isAjaxRequest()) {
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'CSRF token validation failed',
                'error_code' => 'CSRF_INVALID'
            ]);
        } else {
            echo '<!DOCTYPE html><html><head><title>403 Forbidden</title></head><body><h1>403 Forbidden</h1><p>CSRF token validation failed. Please refresh the page and try again.</p></body></html>';
        }
        
        exit;
    }
    
    private function handleRateLimitExceeded($maxRequests, $windowMinutes)
    {
        http_response_code(429);
        header('Retry-After: ' . ($windowMinutes * 60));
        
        if ($this->isAjaxRequest()) {
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => "Rate limit exceeded. Maximum {$maxRequests} requests per {$windowMinutes} minute(s)",
                'error_code' => 'RATE_LIMIT_EXCEEDED'
            ]);
        } else {
            echo '<!DOCTYPE html><html><head><title>429 Too Many Requests</title></head><body><h1>429 Too Many Requests</h1><p>Rate limit exceeded. Please try again later.</p></body></html>';
        }
        
        exit;
    }
    
    private function handleValidationErrors($errors)
    {
        http_response_code(422);
        
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => 'Validation failed',
            'errors' => $errors,
            'error_code' => 'VALIDATION_FAILED'
        ]);
        
        exit;
    }
    
    private function isAjaxRequest()
    {
        return isset($_SERVER['HTTP_X_REQUESTED_WITH']) && 
               strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
    }
}
