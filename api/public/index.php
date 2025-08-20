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
    // Bootstrap the application
    $app = require_once __DIR__ . '/../config/bootstrap.php';
    
    // Handle the request
    $response = $app->handle();
    
    // Send the response
    $response->send();
    
} catch (Throwable $e) {
    // Handle uncaught exceptions
    http_response_code(500);
    
    if (config('app.debug')) {
        echo json_encode([
            'success' => false,
            'message' => 'Internal Server Error',
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Internal Server Error'
        ]);
    }
}
