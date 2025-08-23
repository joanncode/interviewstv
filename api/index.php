<?php
/**
 * Main API Router for Interviews.tv
 * Routes requests to appropriate endpoints
 */

require_once 'config/cors.php';

// Get the request URI and method
$request_uri = $_SERVER['REQUEST_URI'];
$request_method = $_SERVER['REQUEST_METHOD'];

// Remove query string and API prefix
$path = parse_url($request_uri, PHP_URL_PATH);
$path = str_replace('/api', '', $path);
$path = trim($path, '/');

// Split path into segments
$segments = explode('/', $path);

// Route the request
try {
    switch ($segments[0]) {
        case 'auth':
            handleAuthRoutes($segments, $request_method);
            break;
        case 'user':
            handleUserRoutes($segments, $request_method);
            break;
        case 'business':
            handleBusinessRoutes($segments, $request_method);
            break;
        case 'interview':
            handleInterviewRoutes($segments, $request_method);
            break;
        case 'upload':
            handleUploadRoutes($segments, $request_method);
            break;
        case 'admin':
            handleAdminRoutes($segments, $request_method);
            break;
        case '':
            // API root - show available endpoints
            showApiInfo();
            break;
        default:
            ApiResponse::notFound('Endpoint not found');
    }
} catch (Exception $e) {
    error_log("API Router error: " . $e->getMessage());
    ApiResponse::serverError('Internal server error');
}

/**
 * Handle authentication routes
 */
function handleAuthRoutes($segments, $method) {
    if (!isset($segments[1])) {
        ApiResponse::notFound('Auth endpoint not specified');
    }

    switch ($segments[1]) {
        case 'login':
            require_once 'auth/login.php';
            break;
        case 'register':
            require_once 'auth/register.php';
            break;
        case 'logout':
            require_once 'auth/logout.php';
            break;
        case 'verify':
            require_once 'auth/verify.php';
            break;
        default:
            ApiResponse::notFound('Auth endpoint not found');
    }
}

/**
 * Handle user routes
 */
function handleUserRoutes($segments, $method) {
    if (!isset($segments[1])) {
        ApiResponse::notFound('User endpoint not specified');
    }

    switch ($segments[1]) {
        case 'profile':
            require_once 'user/profile.php';
            break;
        case 'settings':
            require_once 'user/settings.php';
            break;
        case 'follow':
            require_once 'user/follow.php';
            break;
        default:
            ApiResponse::notFound('User endpoint not found');
    }
}

/**
 * Handle business routes
 */
function handleBusinessRoutes($segments, $method) {
    if (!isset($segments[1])) {
        ApiResponse::notFound('Business endpoint not specified');
    }

    switch ($segments[1]) {
        case 'list':
            require_once 'business/list.php';
            break;
        case 'create':
            require_once 'business/create.php';
            break;
        case 'profile':
            require_once 'business/profile.php';
            break;
        case 'reviews':
            require_once 'business/reviews.php';
            break;
        default:
            ApiResponse::notFound('Business endpoint not found');
    }
}

/**
 * Handle interview routes
 */
function handleInterviewRoutes($segments, $method) {
    if (!isset($segments[1])) {
        ApiResponse::notFound('Interview endpoint not specified');
    }

    switch ($segments[1]) {
        case 'list':
            require_once 'interview/list.php';
            break;
        case 'create':
            require_once 'interview/create.php';
            break;
        case 'view':
            require_once 'interview/view.php';
            break;
        case 'comments':
            require_once 'interview/comments.php';
            break;
        default:
            ApiResponse::notFound('Interview endpoint not found');
    }
}

/**
 * Handle file upload routes
 */
function handleUploadRoutes($segments, $method) {
    if (!isset($segments[1])) {
        ApiResponse::notFound('Upload endpoint not specified');
    }

    switch ($segments[1]) {
        case 'avatar':
            require_once 'upload/avatar.php';
            break;
        case 'hero-banner':
            require_once 'upload/hero-banner.php';
            break;
        case 'business-logo':
            require_once 'upload/business-logo.php';
            break;
        default:
            ApiResponse::notFound('Upload endpoint not found');
    }
}

/**
 * Handle admin routes
 */
function handleAdminRoutes($segments, $method) {
    if (!isset($segments[1])) {
        ApiResponse::notFound('Admin endpoint not specified');
    }

    switch ($segments[1]) {
        case 'users':
            require_once 'admin/users.php';
            break;
        case 'dashboard':
            require_once 'admin/dashboard.php';
            break;
        case 'analytics':
            require_once 'admin/analytics.php';
            break;
        default:
            ApiResponse::notFound('Admin endpoint not found');
    }
}

/**
 * Show API information
 */
function showApiInfo() {
    $api_info = [
        'name' => 'Interviews.tv API',
        'version' => '1.0.0',
        'description' => 'RESTful API for the Interviews.tv platform',
        'endpoints' => [
            'auth' => [
                'POST /api/auth/login' => 'User login',
                'POST /api/auth/register' => 'User registration',
                'POST /api/auth/logout' => 'User logout',
                'POST /api/auth/verify' => 'Email verification'
            ],
            'user' => [
                'GET /api/user/profile' => 'Get user profile',
                'PUT /api/user/profile' => 'Update user profile',
                'GET /api/user/settings' => 'Get user settings',
                'PUT /api/user/settings' => 'Update user settings'
            ],
            'business' => [
                'GET /api/business/list' => 'Get business directory',
                'POST /api/business/create' => 'Create business profile',
                'GET /api/business/profile/{slug}' => 'Get business profile',
                'GET /api/business/reviews/{id}' => 'Get business reviews'
            ],
            'interview' => [
                'GET /api/interview/list' => 'Get interviews',
                'POST /api/interview/create' => 'Create interview',
                'GET /api/interview/view/{slug}' => 'Get interview details',
                'GET /api/interview/comments/{id}' => 'Get interview comments'
            ],
            'upload' => [
                'POST /api/upload/avatar' => 'Upload user avatar',
                'POST /api/upload/hero-banner' => 'Upload hero banner',
                'POST /api/upload/business-logo' => 'Upload business logo'
            ],
            'admin' => [
                'GET /api/admin/users' => 'Get users list (admin only)',
                'POST /api/admin/users' => 'Create new user (admin only)',
                'PUT /api/admin/users' => 'Update user (admin only)',
                'DELETE /api/admin/users' => 'Deactivate user (admin only)',
                'GET /api/admin/dashboard' => 'Get admin dashboard data',
                'GET /api/admin/analytics' => 'Get platform analytics'
            ]
        ],
        'authentication' => 'Bearer token (JWT)',
        'content_type' => 'application/json'
    ];

    ApiResponse::success($api_info, 'Interviews.tv API v1.0.0');
}
?>
