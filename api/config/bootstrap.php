<?php

// Bootstrap the application
require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../../shared/utils/helpers.php';

use Dotenv\Dotenv;

// Load environment variables
$dotenv = Dotenv::createImmutable(base_path());
$dotenv->load();

// Set error reporting based on environment
if (config('app.debug')) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// Set timezone
date_default_timezone_set(config('app.timezone', 'UTC'));

// Initialize application
$app = new App\Application();

// Register service providers
$app->register(new App\Providers\DatabaseServiceProvider());
$app->register(new App\Providers\AuthServiceProvider());
$app->register(new App\Providers\RouteServiceProvider());

return $app;
