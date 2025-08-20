<?php

namespace App\Services;

class SanitizationService
{
    private $allowedTags = [];
    private $allowedAttributes = [];
    
    public function __construct()
    {
        $this->setupDefaultConfiguration();
    }
    
    /**
     * Sanitize input data
     */
    public function sanitize($data, $rules = [])
    {
        if (is_array($data)) {
            return $this->sanitizeArray($data, $rules);
        }
        
        return $this->sanitizeValue($data, $rules);
    }
    
    /**
     * Sanitize array of data
     */
    private function sanitizeArray($data, $rules)
    {
        $sanitized = [];
        
        foreach ($data as $key => $value) {
            $fieldRules = isset($rules[$key]) ? $rules[$key] : ['string'];
            
            if (is_array($value)) {
                $sanitized[$key] = $this->sanitizeArray($value, $fieldRules);
            } else {
                $sanitized[$key] = $this->sanitizeValue($value, $fieldRules);
            }
        }
        
        return $sanitized;
    }
    
    /**
     * Sanitize a single value
     */
    private function sanitizeValue($value, $rules)
    {
        if (!is_array($rules)) {
            $rules = [$rules];
        }
        
        foreach ($rules as $rule) {
            $value = $this->applyRule($value, $rule);
        }
        
        return $value;
    }
    
    /**
     * Apply sanitization rule
     */
    private function applyRule($value, $rule)
    {
        switch ($rule) {
            case 'string':
                return $this->sanitizeString($value);
                
            case 'email':
                return $this->sanitizeEmail($value);
                
            case 'url':
                return $this->sanitizeUrl($value);
                
            case 'html':
                return $this->sanitizeHtml($value);
                
            case 'html_strict':
                return $this->sanitizeHtmlStrict($value);
                
            case 'integer':
                return $this->sanitizeInteger($value);
                
            case 'float':
                return $this->sanitizeFloat($value);
                
            case 'boolean':
                return $this->sanitizeBoolean($value);
                
            case 'alpha':
                return $this->sanitizeAlpha($value);
                
            case 'alpha_numeric':
                return $this->sanitizeAlphaNumeric($value);
                
            case 'slug':
                return $this->sanitizeSlug($value);
                
            case 'filename':
                return $this->sanitizeFilename($value);
                
            case 'phone':
                return $this->sanitizePhone($value);
                
            case 'trim':
                return trim($value);
                
            case 'lowercase':
                return strtolower($value);
                
            case 'uppercase':
                return strtoupper($value);
                
            case 'capitalize':
                return ucwords(strtolower($value));
                
            default:
                return $value;
        }
    }
    
    /**
     * Sanitize string (basic XSS protection)
     */
    public function sanitizeString($value)
    {
        if (!is_string($value)) {
            return '';
        }
        
        // Remove null bytes
        $value = str_replace("\0", '', $value);
        
        // Convert special characters to HTML entities
        $value = htmlspecialchars($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        
        // Trim whitespace
        $value = trim($value);
        
        return $value;
    }
    
    /**
     * Sanitize email address
     */
    public function sanitizeEmail($value)
    {
        $value = filter_var($value, FILTER_SANITIZE_EMAIL);
        return strtolower(trim($value));
    }
    
    /**
     * Sanitize URL
     */
    public function sanitizeUrl($value)
    {
        $value = filter_var($value, FILTER_SANITIZE_URL);
        
        // Ensure URL has a protocol
        if (!empty($value) && !preg_match('/^https?:\/\//', $value)) {
            $value = 'http://' . $value;
        }
        
        return $value;
    }
    
    /**
     * Sanitize HTML (allow safe tags)
     */
    public function sanitizeHtml($value)
    {
        if (!is_string($value)) {
            return '';
        }
        
        // Remove null bytes
        $value = str_replace("\0", '', $value);
        
        // Use HTMLPurifier for comprehensive HTML sanitization
        if (class_exists('HTMLPurifier')) {
            $config = \HTMLPurifier_Config::createDefault();
            $config->set('HTML.Allowed', implode(',', $this->allowedTags));
            $purifier = new \HTMLPurifier($config);
            return $purifier->purify($value);
        }
        
        // Fallback: strip all tags except allowed ones
        return strip_tags($value, '<' . implode('><', $this->allowedTags) . '>');
    }
    
    /**
     * Sanitize HTML (strip all tags)
     */
    public function sanitizeHtmlStrict($value)
    {
        if (!is_string($value)) {
            return '';
        }
        
        // Remove all HTML tags
        $value = strip_tags($value);
        
        // Decode HTML entities
        $value = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        
        // Re-encode special characters
        $value = htmlspecialchars($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        
        return trim($value);
    }
    
    /**
     * Sanitize integer
     */
    public function sanitizeInteger($value)
    {
        return (int) filter_var($value, FILTER_SANITIZE_NUMBER_INT);
    }
    
    /**
     * Sanitize float
     */
    public function sanitizeFloat($value)
    {
        return (float) filter_var($value, FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION);
    }
    
    /**
     * Sanitize boolean
     */
    public function sanitizeBoolean($value)
    {
        return filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) !== null;
    }
    
    /**
     * Sanitize to alphabetic characters only
     */
    public function sanitizeAlpha($value)
    {
        return preg_replace('/[^a-zA-Z]/', '', $value);
    }
    
    /**
     * Sanitize to alphanumeric characters only
     */
    public function sanitizeAlphaNumeric($value)
    {
        return preg_replace('/[^a-zA-Z0-9]/', '', $value);
    }
    
    /**
     * Sanitize to create a URL-friendly slug
     */
    public function sanitizeSlug($value)
    {
        // Convert to lowercase
        $value = strtolower($value);
        
        // Replace non-alphanumeric characters with hyphens
        $value = preg_replace('/[^a-z0-9]+/', '-', $value);
        
        // Remove leading/trailing hyphens
        $value = trim($value, '-');
        
        return $value;
    }
    
    /**
     * Sanitize filename
     */
    public function sanitizeFilename($value)
    {
        // Remove path separators and dangerous characters
        $value = preg_replace('/[\/\\\\:*?"<>|]/', '', $value);
        
        // Remove leading dots (hidden files)
        $value = ltrim($value, '.');
        
        // Limit length
        if (strlen($value) > 255) {
            $value = substr($value, 0, 255);
        }
        
        return $value;
    }
    
    /**
     * Sanitize phone number
     */
    public function sanitizePhone($value)
    {
        // Remove all non-numeric characters except + at the beginning
        $value = preg_replace('/[^0-9+]/', '', $value);
        
        // Ensure + is only at the beginning
        if (strpos($value, '+') !== false) {
            $value = '+' . str_replace('+', '', $value);
        }
        
        return $value;
    }
    
    /**
     * Remove XSS attempts
     */
    public function removeXss($value)
    {
        if (!is_string($value)) {
            return $value;
        }
        
        // List of dangerous patterns
        $xssPatterns = [
            // Script tags
            '/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/mi',
            
            // JavaScript events
            '/\bon\w+\s*=\s*["\']?[^"\'>\s]*["\']?/i',
            
            // JavaScript protocol
            '/javascript\s*:/i',
            
            // Data protocol
            '/data\s*:/i',
            
            // VBScript
            '/vbscript\s*:/i',
            
            // Style with expression
            '/style\s*=\s*["\']?[^"\']*expression\s*\([^"\']*["\']?/i',
            
            // Object and embed tags
            '/<(object|embed|applet|iframe|frame|frameset)\b[^>]*>/i',
            
            // Meta refresh
            '/<meta\s+http-equiv\s*=\s*["\']?refresh["\']?[^>]*>/i',
            
            // Link with javascript
            '/<link\s+[^>]*href\s*=\s*["\']?\s*javascript\s*:[^"\']*["\']?[^>]*>/i'
        ];
        
        foreach ($xssPatterns as $pattern) {
            $value = preg_replace($pattern, '', $value);
        }
        
        return $value;
    }
    
    /**
     * Sanitize SQL input (basic protection)
     */
    public function sanitizeSql($value)
    {
        if (!is_string($value)) {
            return $value;
        }
        
        // Remove SQL injection patterns
        $sqlPatterns = [
            '/(\s|^)(union|select|insert|update|delete|drop|create|alter|exec|execute)\s/i',
            '/(\s|^)(or|and)\s+\d+\s*=\s*\d+/i',
            '/(\s|^)(or|and)\s+["\']?\w+["\']?\s*=\s*["\']?\w+["\']?/i',
            '/--/',
            '/\/\*.*?\*\//',
            '/;/'
        ];
        
        foreach ($sqlPatterns as $pattern) {
            $value = preg_replace($pattern, '', $value);
        }
        
        return $value;
    }
    
    /**
     * Sanitize file upload
     */
    public function sanitizeFileUpload($file)
    {
        if (!isset($file['name']) || !isset($file['tmp_name'])) {
            return false;
        }
        
        $sanitized = [
            'name' => $this->sanitizeFilename($file['name']),
            'type' => $file['type'],
            'size' => (int) $file['size'],
            'tmp_name' => $file['tmp_name'],
            'error' => (int) $file['error']
        ];
        
        // Validate file type
        $allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $actualType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        if (!in_array($actualType, $allowedTypes)) {
            return false;
        }
        
        $sanitized['type'] = $actualType;
        
        return $sanitized;
    }
    
    /**
     * Setup default configuration
     */
    private function setupDefaultConfiguration()
    {
        $this->allowedTags = [
            'p', 'br', 'strong', 'em', 'u', 'i', 'b',
            'ul', 'ol', 'li', 'a', 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'blockquote', 'code', 'pre'
        ];
        
        $this->allowedAttributes = [
            'a' => ['href', 'title'],
            'img' => ['src', 'alt', 'title', 'width', 'height'],
            'blockquote' => ['cite']
        ];
    }
    
    /**
     * Set allowed HTML tags
     */
    public function setAllowedTags($tags)
    {
        $this->allowedTags = $tags;
    }
    
    /**
     * Set allowed HTML attributes
     */
    public function setAllowedAttributes($attributes)
    {
        $this->allowedAttributes = $attributes;
    }
    
    /**
     * Batch sanitize multiple values
     */
    public function sanitizeBatch($data, $rules)
    {
        $sanitized = [];
        
        foreach ($data as $key => $value) {
            $fieldRules = isset($rules[$key]) ? $rules[$key] : ['string'];
            $sanitized[$key] = $this->sanitize($value, $fieldRules);
        }
        
        return $sanitized;
    }
}
