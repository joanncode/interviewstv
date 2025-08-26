<?php

namespace App\Services;

class SecurityValidationService
{
    private $suspiciousPatterns;
    private $bannedIPs;
    private $maxLoginAttempts;
    private $lockoutDuration;
    private $pdo;

    public function __construct($pdo = null)
    {
        $this->pdo = $pdo;
        $this->maxLoginAttempts = 5;
        $this->lockoutDuration = 900; // 15 minutes
        $this->initializeSuspiciousPatterns();
        $this->loadBannedIPs();
    }

    /**
     * Comprehensive input sanitization
     */
    public function sanitizeInput($input, $type = 'general')
    {
        if (is_array($input)) {
            return array_map(function($item) use ($type) {
                return $this->sanitizeInput($item, $type);
            }, $input);
        }

        if (!is_string($input)) {
            return $input;
        }

        // Remove null bytes
        $input = str_replace("\0", '', $input);

        switch ($type) {
            case 'email':
                return $this->sanitizeEmail($input);
            case 'url':
                return $this->sanitizeUrl($input);
            case 'filename':
                return $this->sanitizeFilename($input);
            case 'sql':
                return $this->sanitizeSqlInput($input);
            case 'html':
                return $this->sanitizeHtml($input);
            case 'json':
                return $this->sanitizeJson($input);
            default:
                return $this->sanitizeGeneral($input);
        }
    }

    /**
     * Validate and sanitize email
     */
    private function sanitizeEmail($email)
    {
        $email = trim(strtolower($email));
        $email = filter_var($email, FILTER_SANITIZE_EMAIL);
        
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('Invalid email format');
        }

        // Check for suspicious patterns
        if ($this->containsSuspiciousPatterns($email)) {
            throw new \InvalidArgumentException('Email contains suspicious content');
        }

        return $email;
    }

    /**
     * Validate and sanitize URL
     */
    private function sanitizeUrl($url)
    {
        $url = trim($url);
        $url = filter_var($url, FILTER_SANITIZE_URL);

        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            throw new \InvalidArgumentException('Invalid URL format');
        }

        // Check for malicious protocols
        $parsed = parse_url($url);
        $allowedSchemes = ['http', 'https', 'ftp', 'ftps'];
        
        if (!in_array(strtolower($parsed['scheme'] ?? ''), $allowedSchemes)) {
            throw new \InvalidArgumentException('URL scheme not allowed');
        }

        return $url;
    }

    /**
     * Sanitize filename
     */
    private function sanitizeFilename($filename)
    {
        // Remove path traversal attempts
        $filename = basename($filename);
        
        // Remove dangerous characters
        $filename = preg_replace('/[^a-zA-Z0-9._-]/', '', $filename);
        
        // Prevent hidden files
        if (strpos($filename, '.') === 0) {
            $filename = 'file_' . $filename;
        }

        // Limit length
        if (strlen($filename) > 255) {
            $filename = substr($filename, 0, 255);
        }

        return $filename;
    }

    /**
     * Sanitize SQL input (additional layer beyond prepared statements)
     */
    private function sanitizeSqlInput($input)
    {
        // Remove SQL injection patterns
        $sqlPatterns = [
            '/(\s|^)(union|select|insert|update|delete|drop|create|alter|exec|execute)\s/i',
            '/(\s|^)(or|and)\s+\d+\s*=\s*\d+/i',
            '/(\s|^)(or|and)\s+[\'"].*[\'"](\s*=\s*[\'"].*[\'"])?/i',
            '/[\'";]/',
            '/--/',
            '/\/\*.*\*\//',
            '/xp_/',
            '/sp_/'
        ];

        foreach ($sqlPatterns as $pattern) {
            if (preg_match($pattern, $input)) {
                throw new \InvalidArgumentException('Input contains potential SQL injection');
            }
        }

        return trim($input);
    }

    /**
     * Sanitize HTML content
     */
    private function sanitizeHtml($html)
    {
        // Allow only safe HTML tags
        $allowedTags = '<p><br><strong><em><u><ol><ul><li><a><img><h1><h2><h3><h4><h5><h6>';
        
        $html = strip_tags($html, $allowedTags);
        
        // Remove dangerous attributes
        $html = preg_replace('/on\w+\s*=\s*["\'][^"\']*["\']/i', '', $html);
        $html = preg_replace('/javascript\s*:/i', '', $html);
        $html = preg_replace('/data\s*:/i', '', $html);
        $html = preg_replace('/vbscript\s*:/i', '', $html);

        return $html;
    }

    /**
     * Sanitize JSON input
     */
    private function sanitizeJson($json)
    {
        if (!is_string($json)) {
            return $json;
        }

        $decoded = json_decode($json, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \InvalidArgumentException('Invalid JSON format');
        }

        // Recursively sanitize the decoded data
        return $this->sanitizeInput($decoded);
    }

    /**
     * General input sanitization
     */
    private function sanitizeGeneral($input)
    {
        // Remove control characters except newlines and tabs
        $input = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $input);
        
        // Remove potential XSS
        $input = htmlspecialchars($input, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        
        return trim($input);
    }

    /**
     * Check for suspicious patterns
     */
    private function containsSuspiciousPatterns($input)
    {
        foreach ($this->suspiciousPatterns as $pattern) {
            if (preg_match($pattern, $input)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Rate limiting check
     */
    public function checkRateLimit($identifier, $action = 'general', $maxAttempts = 60, $windowMinutes = 1)
    {
        if (!$this->pdo) {
            return true; // Skip if no database connection
        }

        $windowStart = date('Y-m-d H:i:s', time() - ($windowMinutes * 60));
        
        // Clean old entries
        $stmt = $this->pdo->prepare("DELETE FROM rate_limits WHERE created_at < ?");
        $stmt->execute([$windowStart]);
        
        // Count current attempts
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) FROM rate_limits 
            WHERE identifier = ? AND action = ? AND created_at >= ?
        ");
        $stmt->execute([$identifier, $action, $windowStart]);
        $attempts = $stmt->fetchColumn();
        
        if ($attempts >= $maxAttempts) {
            $this->logSecurityEvent('rate_limit_exceeded', [
                'identifier' => $identifier,
                'action' => $action,
                'attempts' => $attempts
            ]);
            return false;
        }
        
        // Record this attempt
        $stmt = $this->pdo->prepare("
            INSERT INTO rate_limits (identifier, action, created_at) 
            VALUES (?, ?, NOW())
        ");
        $stmt->execute([$identifier, $action]);
        
        return true;
    }

    /**
     * Check for brute force login attempts
     */
    public function checkLoginAttempts($identifier)
    {
        if (!$this->pdo) {
            return true;
        }

        $lockoutEnd = date('Y-m-d H:i:s', time() - $this->lockoutDuration);
        
        // Clean old failed attempts
        $stmt = $this->pdo->prepare("
            DELETE FROM failed_login_attempts 
            WHERE created_at < ? OR (is_locked = 1 AND created_at < ?)
        ");
        $stmt->execute([$lockoutEnd, $lockoutEnd]);
        
        // Check current failed attempts
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) FROM failed_login_attempts 
            WHERE identifier = ? AND created_at >= ?
        ");
        $stmt->execute([$identifier, $lockoutEnd]);
        $attempts = $stmt->fetchColumn();
        
        if ($attempts >= $this->maxLoginAttempts) {
            $this->logSecurityEvent('brute_force_detected', [
                'identifier' => $identifier,
                'attempts' => $attempts
            ]);
            return false;
        }
        
        return true;
    }

    /**
     * Record failed login attempt
     */
    public function recordFailedLogin($identifier, $userAgent = null, $ipAddress = null)
    {
        if (!$this->pdo) {
            return;
        }

        $stmt = $this->pdo->prepare("
            INSERT INTO failed_login_attempts (identifier, ip_address, user_agent, created_at) 
            VALUES (?, ?, ?, NOW())
        ");
        $stmt->execute([$identifier, $ipAddress, $userAgent]);
        
        // Check if we should lock the account
        $recentAttempts = $this->getRecentFailedAttempts($identifier);
        if ($recentAttempts >= $this->maxLoginAttempts) {
            $this->lockAccount($identifier);
        }
    }

    /**
     * Clear failed login attempts (on successful login)
     */
    public function clearFailedAttempts($identifier)
    {
        if (!$this->pdo) {
            return;
        }

        $stmt = $this->pdo->prepare("DELETE FROM failed_login_attempts WHERE identifier = ?");
        $stmt->execute([$identifier]);
    }

    /**
     * Validate file upload security
     */
    public function validateFileUpload($file, $allowedTypes = [], $maxSize = 10485760)
    {
        if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
            throw new \InvalidArgumentException('Invalid file upload');
        }

        // Check file size
        if ($file['size'] > $maxSize) {
            throw new \InvalidArgumentException('File size exceeds maximum allowed');
        }

        // Validate MIME type
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!empty($allowedTypes) && !in_array($mimeType, $allowedTypes)) {
            throw new \InvalidArgumentException('File type not allowed');
        }

        // Check for malicious content
        $content = file_get_contents($file['tmp_name'], false, null, 0, 1024);
        if ($this->containsMaliciousContent($content)) {
            throw new \InvalidArgumentException('File contains malicious content');
        }

        // Sanitize filename
        $file['name'] = $this->sanitizeFilename($file['name']);

        return true;
    }

    /**
     * Check for malicious file content
     */
    private function containsMaliciousContent($content)
    {
        $maliciousPatterns = [
            '/<\?php/i',
            '/<script/i',
            '/eval\s*\(/i',
            '/exec\s*\(/i',
            '/system\s*\(/i',
            '/shell_exec\s*\(/i',
            '/passthru\s*\(/i',
            '/base64_decode\s*\(/i'
        ];

        foreach ($maliciousPatterns as $pattern) {
            if (preg_match($pattern, $content)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Log security events
     */
    public function logSecurityEvent($event, $data = [])
    {
        if (!$this->pdo) {
            error_log("Security Event: {$event} - " . json_encode($data));
            return;
        }

        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO security_logs (event_type, event_data, ip_address, user_agent, created_at) 
                VALUES (?, ?, ?, ?, NOW())
            ");
            
            $stmt->execute([
                $event,
                json_encode($data),
                $_SERVER['REMOTE_ADDR'] ?? null,
                $_SERVER['HTTP_USER_AGENT'] ?? null
            ]);
        } catch (\Exception $e) {
            error_log("Failed to log security event: " . $e->getMessage());
        }
    }

    /**
     * Initialize suspicious patterns
     */
    private function initializeSuspiciousPatterns()
    {
        $this->suspiciousPatterns = [
            '/\b(eval|exec|system|shell_exec|passthru|file_get_contents|fopen|fwrite)\s*\(/i',
            '/<script[^>]*>.*?<\/script>/is',
            '/javascript\s*:/i',
            '/on(load|error|click|mouseover|focus|blur)\s*=/i',
            '/\b(union|select|insert|update|delete|drop|create|alter)\s+/i',
            '/(\||&|;|`|\$\(|\${)/i',
            '/(\.\.\/|\.\.\\\\)/i',
            '/\b(cmd|powershell|bash|sh)\b/i'
        ];
    }

    /**
     * Load banned IPs from database or config
     */
    private function loadBannedIPs()
    {
        $this->bannedIPs = [];
        
        if ($this->pdo) {
            try {
                $stmt = $this->pdo->prepare("SELECT ip_address FROM banned_ips WHERE is_active = 1");
                $stmt->execute();
                $this->bannedIPs = $stmt->fetchAll(\PDO::FETCH_COLUMN);
            } catch (\Exception $e) {
                // Table might not exist yet
            }
        }
    }

    /**
     * Check if IP is banned
     */
    public function isIPBanned($ipAddress)
    {
        return in_array($ipAddress, $this->bannedIPs);
    }

    /**
     * Get recent failed attempts count
     */
    private function getRecentFailedAttempts($identifier)
    {
        if (!$this->pdo) {
            return 0;
        }

        $windowStart = date('Y-m-d H:i:s', time() - $this->lockoutDuration);
        
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) FROM failed_login_attempts 
            WHERE identifier = ? AND created_at >= ?
        ");
        $stmt->execute([$identifier, $windowStart]);
        
        return $stmt->fetchColumn();
    }

    /**
     * Lock account temporarily
     */
    private function lockAccount($identifier)
    {
        if (!$this->pdo) {
            return;
        }

        $stmt = $this->pdo->prepare("
            UPDATE failed_login_attempts 
            SET is_locked = 1 
            WHERE identifier = ?
        ");
        $stmt->execute([$identifier]);
        
        $this->logSecurityEvent('account_locked', ['identifier' => $identifier]);
    }
}
