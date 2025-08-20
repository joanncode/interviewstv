<?php

return [
    'name' => env('APP_NAME', 'Interviews.tv'),
    'env' => env('APP_ENV', 'production'),
    'debug' => env('APP_DEBUG', false),
    'url' => env('APP_URL', 'http://localhost'),
    'api_url' => env('API_URL', 'http://localhost/api'),
    
    'timezone' => 'UTC',
    
    'key' => env('APP_KEY'),
    
    'cipher' => 'AES-256-CBC',
    
    'providers' => [
        // Service providers
    ],
    
    'aliases' => [
        // Class aliases
    ],
    
    'cors' => [
        'allowed_origins' => explode(',', env('CORS_ALLOWED_ORIGINS', '*')),
        'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With'],
        'exposed_headers' => [],
        'max_age' => 0,
        'supports_credentials' => true,
    ],
];
