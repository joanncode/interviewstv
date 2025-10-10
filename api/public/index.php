<?php

// Set CORS headers early
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Load configuration
    require_once __DIR__ . '/../config/config.php';

    // Simple routing
    $requestUri = $_SERVER['REQUEST_URI'];
    $requestMethod = $_SERVER['REQUEST_METHOD'];

    // Remove query string and normalize path
    $path = parse_url($requestUri, PHP_URL_PATH);
    $path = rtrim($path, '/');

    // Handle streaming API routes first
    if (strpos($path, '/api/streams') === 0) {
        // Route to streaming API
        include __DIR__ . '/streams.php';
        exit();
    }

    // Basic API routes
    if ($path === '' || $path === '/') {
        // API status endpoint
        response([
            'name' => APP_NAME,
            'version' => APP_VERSION,
            'status' => 'running',
            'environment' => APP_ENV,
            'timestamp' => date('c')
        ]);
    } elseif ($path === '/api/status') {
        // Detailed status
        response([
            'api' => 'Interviews.tv API',
            'version' => APP_VERSION,
            'status' => 'healthy',
            'database' => 'connected',
            'features' => FEATURES,
            'timestamp' => date('c')
        ]);
    } elseif ($path === '/api/users' && $requestMethod === 'GET') {
        // Get users from JSON database
        $db = getDatabase();
        $users = $db->getAllUsers();
        response(['users' => $users]);
    } elseif ($path === '/api/interviews' && $requestMethod === 'GET') {
        // Get interviews from JSON database
        $db = getDatabase();
        $interviews = $db->getAllInterviews();
        response(['interviews' => $interviews]);
    } else {
        // 404 Not Found
        error('Endpoint not found', 404);
    }

} catch (Throwable $e) {
    // Handle uncaught exceptions
    if (APP_DEBUG) {
        error('Internal Server Error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine(), 500);
    } else {
        error('Internal Server Error', 500);
    }
}
