<?php

namespace App\Middleware;

use App\Services\SecureAuthService;
use App\Services\RoleBasedAccessControl;
use App\Services\CsrfProtection;

class SecurityMiddleware
{
    private $authService;
    private $rbac;
    private $csrf;
    
    public function __construct($pdo)
    {
        $this->authService = new SecureAuthService($pdo);
        $this->rbac = new RoleBasedAccessControl($pdo);
        $this->csrf = new CsrfProtection();
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
     * Get client IP address
     */
    private function getClientIp()
    {
        $ipKeys = ['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'];
        
        foreach ($ipKeys as $key) {
            if (isset($_SERVER[$key]) && !empty($_SERVER[$key])) {
                $ips = explode(',', $_SERVER[$key]);
                return trim($ips[0]);
            }
        }
        
        return 'unknown';
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
