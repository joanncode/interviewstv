<?php
/**
 * YouTube Interview Curation System Configuration
 * Interviews.tv - Admin-Only Bulk Import & Curation Platform
 * Created: October 17, 2025
 */

// Prevent direct access
if (!defined('YOUTUBE_CURATION_SYSTEM')) {
    die('Direct access not permitted');
}

// Define system constants
define('YOUTUBE_CURATION_SYSTEM', true);
define('SYSTEM_VERSION', '1.0.0');
define('SYSTEM_NAME', 'YouTube Interview Curation System');

// Database Configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'interviews_tv');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// YouTube API Configuration
define('YOUTUBE_API_KEY', ''); // Add your YouTube Data API v3 key here
define('YOUTUBE_API_BASE_URL', 'https://www.googleapis.com/youtube/v3/');
define('YOUTUBE_DAILY_QUOTA', 10000); // Default quota limit
define('YOUTUBE_MAX_RESULTS', 50); // Max results per API call

// System Paths
define('ROOT_PATH', dirname(__DIR__));
define('ADMIN_PATH', ROOT_PATH . '/admin');
define('PUBLIC_PATH', ROOT_PATH . '/public');
define('INCLUDES_PATH', ROOT_PATH . '/includes');
define('UPLOADS_PATH', ROOT_PATH . '/uploads');
define('LOGS_PATH', ROOT_PATH . '/logs');

// URL Configuration
$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost:8000';
define('BASE_URL', $protocol . '://' . $host);
define('ADMIN_URL', BASE_URL . '/admin');
define('PUBLIC_URL', BASE_URL . '/public');
define('API_URL', BASE_URL . '/api');

// Session Configuration
define('SESSION_NAME', 'youtube_curation_admin');
define('SESSION_LIFETIME', 3600 * 8); // 8 hours
define('REMEMBER_ME_LIFETIME', 3600 * 24 * 30); // 30 days

// Security Configuration
define('CSRF_TOKEN_NAME', 'csrf_token');
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOGIN_LOCKOUT_TIME', 900); // 15 minutes

// Content Configuration
define('MAX_VIDEOS_PER_BATCH', 100);
define('MAX_UPLOAD_SIZE', 10 * 1024 * 1024); // 10MB for CSV files
define('ALLOWED_UPLOAD_TYPES', ['csv', 'txt']);
define('DEFAULT_THUMBNAIL_SIZE', '480x360');

// Scoring Configuration
define('MIN_QUALITY_SCORE', 0.0);
define('MAX_QUALITY_SCORE', 10.0);
define('MIN_INNOVATION_SCORE', 0.0);
define('MAX_INNOVATION_SCORE', 10.0);
define('AUTO_APPROVE_THRESHOLD', 7.0);

// Content Categories (matching database)
$CONTENT_CATEGORIES = [
    'innovation' => [
        'name' => 'Innovation & Invention',
        'keywords' => ['innovation', 'invention', 'breakthrough', 'patent', 'revolutionary', 'disruptive'],
        'color' => '#FFD700'
    ],
    'engineering' => [
        'name' => 'Engineering',
        'keywords' => ['engineering', 'technical', 'architecture', 'design', 'solution', 'system'],
        'color' => '#4CAF50'
    ],
    'microcomputing' => [
        'name' => 'Microcomputing',
        'keywords' => ['microcomputing', 'embedded', 'iot', 'hardware', 'maker', 'arduino', 'raspberry'],
        'color' => '#2196F3'
    ],
    'ai' => [
        'name' => 'Artificial Intelligence',
        'keywords' => ['ai', 'artificial intelligence', 'machine learning', 'neural', 'deep learning', 'ml'],
        'color' => '#9C27B0'
    ],
    'emerging-tech' => [
        'name' => 'Emerging Technologies',
        'keywords' => ['quantum', 'biotech', 'space', 'nanotechnology', 'fusion', 'emerging'],
        'color' => '#FF5722'
    ],
    'entrepreneurship' => [
        'name' => 'Entrepreneurship',
        'keywords' => ['startup', 'entrepreneur', 'business', 'funding', 'venture', 'founder'],
        'color' => '#795548'
    ],
    'open-source' => [
        'name' => 'Open Source',
        'keywords' => ['open source', 'github', 'community', 'collaborative', 'free software'],
        'color' => '#607D8B'
    ],
    'future-tech' => [
        'name' => 'Future Technology',
        'keywords' => ['future', 'prediction', 'trend', 'paradigm', 'next generation', 'tomorrow'],
        'color' => '#E91E63'
    ]
];

// Quality Scoring Factors
$QUALITY_FACTORS = [
    'view_count' => [
        'weight' => 0.3,
        'thresholds' => [
            1000 => 1.0,
            10000 => 2.0,
            100000 => 4.0,
            1000000 => 6.0,
            10000000 => 8.0
        ]
    ],
    'like_ratio' => [
        'weight' => 0.2,
        'calculation' => 'likes / (likes + dislikes)'
    ],
    'duration' => [
        'weight' => 0.2,
        'optimal_range' => [600, 3600], // 10 minutes to 1 hour
        'penalty_factor' => 0.5
    ],
    'channel_authority' => [
        'weight' => 0.15,
        'subscriber_thresholds' => [
            1000 => 1.0,
            10000 => 2.0,
            100000 => 3.0,
            1000000 => 4.0
        ]
    ],
    'recency' => [
        'weight' => 0.15,
        'decay_months' => 24, // Older than 2 years gets penalty
        'max_penalty' => 0.5
    ]
];

// Innovation Scoring Keywords
$INNOVATION_KEYWORDS = [
    'high_value' => [
        'breakthrough', 'revolutionary', 'disruptive', 'paradigm shift', 'game changer',
        'first time', 'never before', 'cutting edge', 'state of the art', 'pioneering'
    ],
    'medium_value' => [
        'innovative', 'advanced', 'novel', 'unique', 'creative', 'original',
        'new approach', 'improved', 'enhanced', 'optimized'
    ],
    'technical_depth' => [
        'algorithm', 'architecture', 'framework', 'methodology', 'protocol',
        'implementation', 'optimization', 'scalability', 'performance'
    ]
];

// Error Messages
$ERROR_MESSAGES = [
    'invalid_youtube_url' => 'Invalid YouTube URL format',
    'video_not_found' => 'Video not found or not accessible',
    'api_quota_exceeded' => 'YouTube API quota exceeded for today',
    'duplicate_video' => 'Video already exists in the system',
    'processing_failed' => 'Failed to process video metadata',
    'database_error' => 'Database operation failed',
    'unauthorized_access' => 'Unauthorized access attempt',
    'invalid_file_format' => 'Invalid file format for bulk import',
    'file_too_large' => 'Upload file size exceeds limit'
];

// Success Messages
$SUCCESS_MESSAGES = [
    'video_imported' => 'Video successfully imported and queued for review',
    'bulk_import_started' => 'Bulk import process started successfully',
    'video_approved' => 'Video approved and published',
    'video_rejected' => 'Video rejected and archived',
    'settings_updated' => 'Settings updated successfully',
    'category_created' => 'Category created successfully',
    'tag_created' => 'Tag created successfully'
];

// Logging Configuration
define('LOG_LEVEL', 'INFO'); // DEBUG, INFO, WARNING, ERROR
define('LOG_MAX_SIZE', 10 * 1024 * 1024); // 10MB
define('LOG_ROTATION_COUNT', 5);

// Email Configuration (for notifications)
define('SMTP_HOST', '');
define('SMTP_PORT', 587);
define('SMTP_USERNAME', '');
define('SMTP_PASSWORD', '');
define('FROM_EMAIL', 'noreply@interviews.tv');
define('FROM_NAME', 'Interviews.tv Curation System');

// Cache Configuration
define('CACHE_ENABLED', true);
define('CACHE_TTL', 3600); // 1 hour
define('CACHE_PREFIX', 'ytcuration_');

// Rate Limiting
define('API_RATE_LIMIT', 100); // requests per hour per IP
define('COMMENT_RATE_LIMIT', 10); // comments per hour per IP

// Content Moderation
define('AUTO_MODERATE_COMMENTS', false); // Set to true for automatic moderation
define('PROFANITY_FILTER_ENABLED', false); // We don't censor, but option available
define('SPAM_DETECTION_ENABLED', true);

// Backup Configuration
define('BACKUP_ENABLED', true);
define('BACKUP_FREQUENCY', 'daily'); // daily, weekly, monthly
define('BACKUP_RETENTION_DAYS', 30);

// Development/Debug Settings
define('DEBUG_MODE', true); // Set to false in production
define('SHOW_SQL_ERRORS', true); // Set to false in production
define('LOG_SQL_QUERIES', false); // Set to true for debugging

// Feature Flags
define('FEATURE_BULK_IMPORT', true);
define('FEATURE_AUTO_CATEGORIZATION', true);
define('FEATURE_COMMENT_SYSTEM', true);
define('FEATURE_RATING_SYSTEM', true);
define('FEATURE_ANALYTICS', true);
define('FEATURE_API_ACCESS', false); // For future API development

// Make global arrays available
$GLOBALS['CONTENT_CATEGORIES'] = $CONTENT_CATEGORIES;
$GLOBALS['QUALITY_FACTORS'] = $QUALITY_FACTORS;
$GLOBALS['INNOVATION_KEYWORDS'] = $INNOVATION_KEYWORDS;
$GLOBALS['ERROR_MESSAGES'] = $ERROR_MESSAGES;
$GLOBALS['SUCCESS_MESSAGES'] = $SUCCESS_MESSAGES;

// Timezone setting
date_default_timezone_set('UTC');

// Error reporting based on debug mode
if (DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// Session configuration
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', isset($_SERVER['HTTPS']));
ini_set('session.use_strict_mode', 1);
ini_set('session.gc_maxlifetime', SESSION_LIFETIME);

?>
