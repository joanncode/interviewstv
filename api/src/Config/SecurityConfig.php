<?php

namespace App\Config;

class SecurityConfig
{
    /**
     * Security configuration settings
     */
    public static function getConfig()
    {
        return [
            // Rate limiting settings
            'rate_limiting' => [
                'api_requests' => [
                    'max_attempts' => 100,
                    'window_minutes' => 1
                ],
                'login_attempts' => [
                    'max_attempts' => 5,
                    'window_minutes' => 15
                ],
                'password_reset' => [
                    'max_attempts' => 3,
                    'window_minutes' => 60
                ],
                'file_uploads' => [
                    'max_attempts' => 10,
                    'window_minutes' => 5
                ]
            ],

            // Brute force protection
            'brute_force' => [
                'max_login_attempts' => 5,
                'lockout_duration_minutes' => 15,
                'progressive_delays' => true,
                'notify_admin_threshold' => 10
            ],

            // File upload security
            'file_uploads' => [
                'max_file_size' => 10485760, // 10MB
                'allowed_image_types' => [
                    'image/jpeg',
                    'image/png',
                    'image/gif',
                    'image/webp'
                ],
                'allowed_video_types' => [
                    'video/mp4',
                    'video/webm',
                    'video/ogg',
                    'video/quicktime'
                ],
                'allowed_audio_types' => [
                    'audio/mpeg',
                    'audio/wav',
                    'audio/ogg',
                    'audio/mp4'
                ],
                'allowed_document_types' => [
                    'application/pdf',
                    'text/plain',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                ],
                'scan_for_malware' => true,
                'quarantine_suspicious_files' => true
            ],

            // Password security
            'passwords' => [
                'min_length' => 8,
                'require_uppercase' => true,
                'require_lowercase' => true,
                'require_numbers' => true,
                'require_special_chars' => true,
                'prevent_common_passwords' => true,
                'prevent_personal_info' => true,
                'history_check_count' => 5,
                'expiry_days' => 90
            ],

            // Session security
            'sessions' => [
                'secure_cookies' => true,
                'httponly_cookies' => true,
                'samesite_strict' => true,
                'session_timeout_minutes' => 120,
                'regenerate_id_interval' => 30,
                'concurrent_sessions_limit' => 3
            ],

            // CSRF protection
            'csrf' => [
                'token_lifetime_minutes' => 60,
                'require_for_all_posts' => true,
                'require_for_ajax' => true,
                'validate_referer' => true
            ],

            // Content Security Policy
            'csp' => [
                'default_src' => "'self'",
                'script_src' => "'self' 'unsafe-inline' https://cdn.jsdelivr.net",
                'style_src' => "'self' 'unsafe-inline' https://fonts.googleapis.com",
                'img_src' => "'self' data: https:",
                'font_src' => "'self' https://fonts.gstatic.com",
                'connect_src' => "'self'",
                'media_src' => "'self'",
                'object_src' => "'none'",
                'frame_src' => "'none'",
                'base_uri' => "'self'",
                'form_action' => "'self'"
            ],

            // Security headers
            'headers' => [
                'X-Content-Type-Options' => 'nosniff',
                'X-Frame-Options' => 'DENY',
                'X-XSS-Protection' => '1; mode=block',
                'Referrer-Policy' => 'strict-origin-when-cross-origin',
                'Permissions-Policy' => 'geolocation=(), microphone=(), camera=()',
                'Strict-Transport-Security' => 'max-age=31536000; includeSubDomains'
            ],

            // Input validation
            'input_validation' => [
                'max_input_length' => 10000,
                'max_array_depth' => 5,
                'max_array_items' => 100,
                'strip_tags_by_default' => true,
                'encode_html_entities' => true,
                'remove_null_bytes' => true
            ],

            // API security
            'api' => [
                'require_api_key' => false,
                'api_key_header' => 'X-API-Key',
                'rate_limit_by_key' => true,
                'log_all_requests' => true,
                'require_https' => true,
                'cors_enabled' => true,
                'cors_origins' => ['http://localhost:8000', 'https://interviews.tv'],
                'cors_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                'cors_headers' => ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key']
            ],

            // Logging and monitoring
            'logging' => [
                'log_security_events' => true,
                'log_failed_logins' => true,
                'log_suspicious_activity' => true,
                'log_file_uploads' => true,
                'log_api_requests' => true,
                'retention_days' => 90,
                'alert_on_critical_events' => true
            ],

            // IP filtering
            'ip_filtering' => [
                'enable_whitelist' => false,
                'whitelist' => [],
                'enable_blacklist' => true,
                'blacklist' => [],
                'auto_ban_threshold' => 50,
                'auto_ban_duration_hours' => 24,
                'check_proxy_headers' => true
            ],

            // Database security
            'database' => [
                'use_prepared_statements' => true,
                'escape_output' => true,
                'log_slow_queries' => true,
                'encrypt_sensitive_data' => true,
                'backup_encryption' => true
            ],

            // Encryption settings
            'encryption' => [
                'algorithm' => 'AES-256-GCM',
                'key_rotation_days' => 30,
                'hash_algorithm' => 'sha256',
                'salt_rounds' => 12
            ]
        ];
    }

    /**
     * Get specific configuration section
     */
    public static function get($section, $key = null)
    {
        $config = self::getConfig();
        
        if (!isset($config[$section])) {
            return null;
        }
        
        if ($key === null) {
            return $config[$section];
        }
        
        return isset($config[$section][$key]) ? $config[$section][$key] : null;
    }

    /**
     * Get rate limiting configuration
     */
    public static function getRateLimiting($type = null)
    {
        $rateLimiting = self::get('rate_limiting');
        
        if ($type === null) {
            return $rateLimiting;
        }
        
        return isset($rateLimiting[$type]) ? $rateLimiting[$type] : null;
    }

    /**
     * Get file upload configuration
     */
    public static function getFileUploadConfig()
    {
        return self::get('file_uploads');
    }

    /**
     * Get allowed file types for specific category
     */
    public static function getAllowedFileTypes($category = 'image')
    {
        $config = self::getFileUploadConfig();
        $key = "allowed_{$category}_types";
        
        return isset($config[$key]) ? $config[$key] : [];
    }

    /**
     * Get password requirements
     */
    public static function getPasswordRequirements()
    {
        return self::get('passwords');
    }

    /**
     * Get security headers
     */
    public static function getSecurityHeaders()
    {
        return self::get('headers');
    }

    /**
     * Get Content Security Policy
     */
    public static function getCSP()
    {
        $csp = self::get('csp');
        $policy = [];
        
        foreach ($csp as $directive => $value) {
            $policy[] = str_replace('_', '-', $directive) . ' ' . $value;
        }
        
        return implode('; ', $policy);
    }

    /**
     * Check if feature is enabled
     */
    public static function isEnabled($section, $feature)
    {
        $config = self::get($section);
        
        if (!$config || !isset($config[$feature])) {
            return false;
        }
        
        return (bool) $config[$feature];
    }

    /**
     * Get environment-specific overrides
     */
    public static function getEnvironmentOverrides()
    {
        $env = $_ENV['APP_ENV'] ?? 'production';
        
        $overrides = [
            'development' => [
                'api' => [
                    'require_https' => false,
                    'cors_origins' => ['*']
                ],
                'logging' => [
                    'log_all_requests' => false
                ]
            ],
            'testing' => [
                'rate_limiting' => [
                    'api_requests' => [
                        'max_attempts' => 1000
                    ]
                ],
                'brute_force' => [
                    'max_login_attempts' => 100
                ]
            ]
        ];
        
        return isset($overrides[$env]) ? $overrides[$env] : [];
    }

    /**
     * Merge environment overrides with base config
     */
    public static function getConfigWithOverrides()
    {
        $config = self::getConfig();
        $overrides = self::getEnvironmentOverrides();
        
        return array_merge_recursive($config, $overrides);
    }
}
