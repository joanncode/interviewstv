<?php
/**
 * Test Analytics Dashboard Endpoint
 */

// Include necessary files
require_once 'config/cors.php';
require_once 'config/database.php';

// Autoload classes
spl_autoload_register(function ($class) {
    $class = str_replace('App\\', '', $class);
    $class = str_replace('\\', '/', $class);
    $file = __DIR__ . '/src/' . $class . '.php';
    if (file_exists($file)) {
        require_once $file;
    }
});

try {
    // Create analytics controller
    $controller = new App\Controllers\AnalyticsDashboardController();
    
    // Get dashboard data
    $response = $controller->getDashboard();
    
    // Output response
    header('Content-Type: application/json');
    echo json_encode($response, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ], JSON_PRETTY_PRINT);
}
