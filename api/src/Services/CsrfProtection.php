<?php

namespace App\Services;

class CsrfProtection
{
    private $tokenName = 'csrf_token';
    private $sessionKey = 'csrf_tokens';
    private $tokenLifetime = 3600; // 1 hour
    private $maxTokens = 10; // Maximum tokens per session
    
    public function __construct($tokenName = null, $tokenLifetime = null)
    {
        if ($tokenName) {
            $this->tokenName = $tokenName;
        }
        
        if ($tokenLifetime) {
            $this->tokenLifetime = $tokenLifetime;
        }
        
        $this->startSession();
    }
    
    /**
     * Generate a new CSRF token
     */
    public function generateToken($action = 'default')
    {
        $token = bin2hex(random_bytes(32));
        $tokenData = [
            'token' => $token,
            'action' => $action,
            'created_at' => time(),
            'expires_at' => time() + $this->tokenLifetime
        ];
        
        $this->storeToken($tokenData);
        $this->cleanupExpiredTokens();
        
        return $token;
    }
    
    /**
     * Validate CSRF token
     */
    public function validateToken($token, $action = 'default')
    {
        if (empty($token)) {
            return false;
        }
        
        $tokens = $this->getStoredTokens();
        
        foreach ($tokens as $index => $tokenData) {
            if ($tokenData['token'] === $token && $tokenData['action'] === $action) {
                // Check if token is expired
                if (time() > $tokenData['expires_at']) {
                    $this->removeToken($index);
                    return false;
                }
                
                // Token is valid, remove it (one-time use)
                $this->removeToken($index);
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Get CSRF token for forms
     */
    public function getToken($action = 'default')
    {
        // Check if we have a valid token for this action
        $tokens = $this->getStoredTokens();
        
        foreach ($tokens as $tokenData) {
            if ($tokenData['action'] === $action && time() <= $tokenData['expires_at']) {
                return $tokenData['token'];
            }
        }
        
        // Generate new token if none found
        return $this->generateToken($action);
    }
    
    /**
     * Generate HTML input field for CSRF token
     */
    public function getTokenField($action = 'default')
    {
        $token = $this->getToken($action);
        return '<input type="hidden" name="' . $this->tokenName . '" value="' . htmlspecialchars($token) . '">';
    }
    
    /**
     * Generate meta tag for CSRF token (for AJAX requests)
     */
    public function getTokenMeta($action = 'default')
    {
        $token = $this->getToken($action);
        return '<meta name="csrf-token" content="' . htmlspecialchars($token) . '">';
    }
    
    /**
     * Validate request CSRF token
     */
    public function validateRequest($request = null, $action = 'default')
    {
        $token = $this->getTokenFromRequest($request);
        return $this->validateToken($token, $action);
    }
    
    /**
     * Middleware function to protect routes
     */
    public function protect($action = 'default')
    {
        if (!$this->validateRequest(null, $action)) {
            $this->handleCsrfFailure();
        }
    }
    
    /**
     * Get token from request
     */
    private function getTokenFromRequest($request = null)
    {
        // Check POST data
        if (isset($_POST[$this->tokenName])) {
            return $_POST[$this->tokenName];
        }
        
        // Check headers (for AJAX requests)
        $headers = getallheaders();
        if (isset($headers['X-CSRF-Token'])) {
            return $headers['X-CSRF-Token'];
        }
        
        if (isset($headers['X-Requested-With']) && $headers['X-Requested-With'] === 'XMLHttpRequest') {
            // Check for token in Authorization header
            if (isset($headers['Authorization'])) {
                $auth = $headers['Authorization'];
                if (strpos($auth, 'CSRF ') === 0) {
                    return substr($auth, 5);
                }
            }
        }
        
        return null;
    }
    
    /**
     * Store token in session
     */
    private function storeToken($tokenData)
    {
        if (!isset($_SESSION[$this->sessionKey])) {
            $_SESSION[$this->sessionKey] = [];
        }
        
        $_SESSION[$this->sessionKey][] = $tokenData;
        
        // Limit number of tokens
        if (count($_SESSION[$this->sessionKey]) > $this->maxTokens) {
            array_shift($_SESSION[$this->sessionKey]);
        }
    }
    
    /**
     * Get stored tokens from session
     */
    private function getStoredTokens()
    {
        return isset($_SESSION[$this->sessionKey]) ? $_SESSION[$this->sessionKey] : [];
    }
    
    /**
     * Remove token by index
     */
    private function removeToken($index)
    {
        if (isset($_SESSION[$this->sessionKey][$index])) {
            unset($_SESSION[$this->sessionKey][$index]);
            $_SESSION[$this->sessionKey] = array_values($_SESSION[$this->sessionKey]);
        }
    }
    
    /**
     * Clean up expired tokens
     */
    private function cleanupExpiredTokens()
    {
        if (!isset($_SESSION[$this->sessionKey])) {
            return;
        }
        
        $currentTime = time();
        $_SESSION[$this->sessionKey] = array_filter($_SESSION[$this->sessionKey], function($tokenData) use ($currentTime) {
            return $currentTime <= $tokenData['expires_at'];
        });
        
        $_SESSION[$this->sessionKey] = array_values($_SESSION[$this->sessionKey]);
    }
    
    /**
     * Handle CSRF validation failure
     */
    private function handleCsrfFailure()
    {
        // Log the attempt
        error_log('CSRF token validation failed for IP: ' . $this->getClientIp());
        
        // Return 403 Forbidden
        http_response_code(403);
        
        if ($this->isAjaxRequest()) {
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'CSRF token validation failed',
                'error_code' => 'CSRF_INVALID'
            ]);
        } else {
            echo '<!DOCTYPE html>
<html>
<head>
    <title>403 Forbidden</title>
</head>
<body>
    <h1>403 Forbidden</h1>
    <p>CSRF token validation failed. Please refresh the page and try again.</p>
</body>
</html>';
        }
        
        exit;
    }
    
    /**
     * Check if request is AJAX
     */
    private function isAjaxRequest()
    {
        return isset($_SERVER['HTTP_X_REQUESTED_WITH']) && 
               strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
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
     * Start session if not already started
     */
    private function startSession()
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }
    
    /**
     * Regenerate all tokens (useful after login)
     */
    public function regenerateTokens()
    {
        $_SESSION[$this->sessionKey] = [];
    }
    
    /**
     * Set token lifetime
     */
    public function setTokenLifetime($seconds)
    {
        $this->tokenLifetime = $seconds;
    }
    
    /**
     * Set maximum tokens per session
     */
    public function setMaxTokens($max)
    {
        $this->maxTokens = $max;
    }
    
    /**
     * Get token statistics
     */
    public function getTokenStats()
    {
        $tokens = $this->getStoredTokens();
        $currentTime = time();
        
        $stats = [
            'total_tokens' => count($tokens),
            'valid_tokens' => 0,
            'expired_tokens' => 0,
            'actions' => []
        ];
        
        foreach ($tokens as $tokenData) {
            if ($currentTime <= $tokenData['expires_at']) {
                $stats['valid_tokens']++;
            } else {
                $stats['expired_tokens']++;
            }
            
            $action = $tokenData['action'];
            if (!isset($stats['actions'][$action])) {
                $stats['actions'][$action] = 0;
            }
            $stats['actions'][$action]++;
        }
        
        return $stats;
    }
    
    /**
     * Validate token without consuming it (for debugging)
     */
    public function validateTokenNonDestructive($token, $action = 'default')
    {
        if (empty($token)) {
            return false;
        }
        
        $tokens = $this->getStoredTokens();
        
        foreach ($tokens as $tokenData) {
            if ($tokenData['token'] === $token && $tokenData['action'] === $action) {
                return time() <= $tokenData['expires_at'];
            }
        }
        
        return false;
    }
}
