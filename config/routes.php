<?php

return [
    'api' => [
        'prefix' => 'api',
        'middleware' => ['api'],
        'namespace' => 'App\\Controllers\\Api',
    ],
    
    'web' => [
        'prefix' => '',
        'middleware' => ['web'],
        'namespace' => 'App\\Controllers\\Web',
    ],
    
    'patterns' => [
        'id' => '[0-9]+',
        'username' => '[a-zA-Z0-9_-]+',
        'slug' => '[a-zA-Z0-9_-]+',
    ],
    
    'rate_limiting' => [
        'api' => [
            'requests' => env('API_RATE_LIMIT', 60),
            'per_minute' => 1,
        ],
        'auth' => [
            'requests' => env('AUTH_RATE_LIMIT', 5),
            'per_minute' => 1,
        ],
    ],
    
    'cache' => [
        'enabled' => env('ROUTE_CACHE_ENABLED', false),
        'ttl' => env('ROUTE_CACHE_TTL', 3600),
    ],
];
