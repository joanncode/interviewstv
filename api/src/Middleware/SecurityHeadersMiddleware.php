<?php

namespace App\Middleware;

use App\Config\SecurityConfig;

class SecurityHeadersMiddleware
{
    private $config;

    public function __construct()
    {
        $this->config = SecurityConfig::getConfigWithOverrides();
    }

    /**
     * Apply all security headers
     */
    public function handle($request = null, $response = null, $next = null)
    {
        // Apply basic security headers
        $this->applySecurityHeaders();
        
        // Apply Content Security Policy
        $this->applyCSP();
        
        // Apply CORS headers if enabled
        if ($this->config['api']['cors_enabled']) {
            $this->applyCORSHeaders();
        }
        
        // Apply HSTS if HTTPS
        $this->applyHSTS();
        
        if ($next) {
            return $next($request, $response);
        }
        
        return true;
    }

    /**
     * Apply basic security headers
     */
    private function applySecurityHeaders()
    {
        $headers = $this->config['headers'];
        
        foreach ($headers as $header => $value) {
            if ($header === 'Strict-Transport-Security') {
                continue; // Handled separately
            }
            header("{$header}: {$value}");
        }
        
        // Additional security headers
        header('X-Powered-By: '); // Remove server signature
        header('Server: '); // Remove server signature
    }

    /**
     * Apply Content Security Policy
     */
    private function applyCSP()
    {
        $csp = SecurityConfig::getCSP();
        header("Content-Security-Policy: {$csp}");
        
        // Also set report-only for monitoring
        header("Content-Security-Policy-Report-Only: {$csp}; report-uri /api/security/csp-report");
    }

    /**
     * Apply CORS headers
     */
    private function applyCORSHeaders()
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $allowedOrigins = $this->config['api']['cors_origins'];
        
        // Check if origin is allowed
        if (in_array('*', $allowedOrigins) || in_array($origin, $allowedOrigins)) {
            header("Access-Control-Allow-Origin: {$origin}");
        }
        
        header('Access-Control-Allow-Methods: ' . implode(', ', $this->config['api']['cors_methods']));
        header('Access-Control-Allow-Headers: ' . implode(', ', $this->config['api']['cors_headers']));
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Max-Age: 86400'); // 24 hours
        
        // Handle preflight requests
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit();
        }
    }

    /**
     * Apply HTTP Strict Transport Security
     */
    private function applyHSTS()
    {
        if ($this->isHTTPS()) {
            $hsts = $this->config['headers']['Strict-Transport-Security'];
            header("Strict-Transport-Security: {$hsts}");
        }
    }

    /**
     * Check if request is over HTTPS
     */
    private function isHTTPS()
    {
        return (
            (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
            (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ||
            (!empty($_SERVER['HTTP_X_FORWARDED_SSL']) && $_SERVER['HTTP_X_FORWARDED_SSL'] === 'on') ||
            (!empty($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443)
        );
    }

    /**
     * Set secure cookie parameters
     */
    public static function setSecureCookieParams()
    {
        $config = SecurityConfig::get('sessions');
        
        ini_set('session.cookie_secure', $config['secure_cookies'] ? '1' : '0');
        ini_set('session.cookie_httponly', $config['httponly_cookies'] ? '1' : '0');
        ini_set('session.cookie_samesite', $config['samesite_strict'] ? 'Strict' : 'Lax');
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        
        // Set session timeout
        ini_set('session.gc_maxlifetime', $config['session_timeout_minutes'] * 60);
        ini_set('session.cookie_lifetime', $config['session_timeout_minutes'] * 60);
    }

    /**
     * Enforce HTTPS redirect
     */
    public static function enforceHTTPS()
    {
        $config = SecurityConfig::get('api');
        
        if ($config['require_https'] && !self::isHTTPS()) {
            $redirectURL = 'https://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
            header("Location: {$redirectURL}", true, 301);
            exit();
        }
    }

    /**
     * Check if request is over HTTPS (static version)
     */
    private static function isHTTPS()
    {
        return (
            (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
            (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ||
            (!empty($_SERVER['HTTP_X_FORWARDED_SSL']) && $_SERVER['HTTP_X_FORWARDED_SSL'] === 'on') ||
            (!empty($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443)
        );
    }

    /**
     * Apply feature policy (Permissions Policy)
     */
    private function applyFeaturePolicy()
    {
        $permissions = [
            'geolocation' => '()',
            'microphone' => '()',
            'camera' => '()',
            'payment' => '()',
            'usb' => '()',
            'magnetometer' => '()',
            'gyroscope' => '()',
            'speaker' => '(self)',
            'vibrate' => '(self)',
            'fullscreen' => '(self)',
            'sync-xhr' => '()'
        ];
        
        $policy = [];
        foreach ($permissions as $feature => $allowlist) {
            $policy[] = "{$feature}={$allowlist}";
        }
        
        header('Permissions-Policy: ' . implode(', ', $policy));
    }

    /**
     * Set cache control headers for security
     */
    public static function setSecureCacheHeaders($type = 'no-cache')
    {
        switch ($type) {
            case 'no-cache':
                header('Cache-Control: no-cache, no-store, must-revalidate');
                header('Pragma: no-cache');
                header('Expires: 0');
                break;
                
            case 'private':
                header('Cache-Control: private, max-age=0');
                break;
                
            case 'public':
                header('Cache-Control: public, max-age=3600');
                break;
        }
    }

    /**
     * Remove sensitive headers from response
     */
    public static function removeSensitiveHeaders()
    {
        header_remove('X-Powered-By');
        header_remove('Server');
        header_remove('X-AspNet-Version');
        header_remove('X-AspNetMvc-Version');
    }

    /**
     * Add security headers for file downloads
     */
    public static function setFileDownloadHeaders($filename, $contentType = 'application/octet-stream')
    {
        // Prevent XSS in file downloads
        header('X-Content-Type-Options: nosniff');
        header('Content-Type: ' . $contentType);
        header('Content-Disposition: attachment; filename="' . addslashes($filename) . '"');
        
        // Prevent caching of sensitive files
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');
    }

    /**
     * Set headers for API responses
     */
    public static function setAPIResponseHeaders()
    {
        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
        
        // Prevent caching of API responses by default
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');
    }

    /**
     * Set headers for static assets
     */
    public static function setStaticAssetHeaders($maxAge = 3600)
    {
        header("Cache-Control: public, max-age={$maxAge}");
        header('X-Content-Type-Options: nosniff');
        
        // Add ETag for better caching
        $etag = md5_file($_SERVER['SCRIPT_FILENAME']);
        header("ETag: \"{$etag}\"");
        
        // Check if client has cached version
        if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && $_SERVER['HTTP_IF_NONE_MATCH'] === "\"{$etag}\"") {
            http_response_code(304);
            exit();
        }
    }

    /**
     * Initialize security headers for the application
     */
    public static function initialize()
    {
        // Set secure cookie parameters
        self::setSecureCookieParams();
        
        // Enforce HTTPS if required
        self::enforceHTTPS();
        
        // Remove sensitive headers
        self::removeSensitiveHeaders();
        
        // Create and apply middleware
        $middleware = new self();
        $middleware->handle();
    }
}
