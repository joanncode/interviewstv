<?php

return [
    'defaults' => [
        'guard' => 'api',
        'passwords' => 'users',
    ],
    
    'guards' => [
        'api' => [
            'driver' => 'jwt',
            'provider' => 'users',
        ],
        'web' => [
            'driver' => 'session',
            'provider' => 'users',
        ],
    ],
    
    'providers' => [
        'users' => [
            'driver' => 'eloquent',
            'model' => App\Models\User::class,
        ],
    ],
    
    'passwords' => [
        'users' => [
            'provider' => 'users',
            'table' => 'password_resets',
            'expire' => 60,
            'throttle' => 60,
        ],
    ],
    
    'password_timeout' => 10800,
    
    'jwt' => [
        'secret' => env('JWT_SECRET'),
        'ttl' => env('JWT_TTL', 60), // minutes
        'refresh_ttl' => env('JWT_REFRESH_TTL', 20160), // minutes
        'algo' => env('JWT_ALGO', 'HS256'),
        'required_claims' => [
            'iss',
            'iat',
            'exp',
            'nbf',
            'sub',
            'jti',
        ],
        'persistent_claims' => [
            // 'foo',
            // 'bar',
        ],
        'lock_subject' => true,
        'leeway' => env('JWT_LEEWAY', 0),
        'blacklist_enabled' => env('JWT_BLACKLIST_ENABLED', true),
        'blacklist_grace_period' => env('JWT_BLACKLIST_GRACE_PERIOD', 0),
        'decrypt_cookies' => false,
        'providers' => [
            'jwt' => Tymon\JWTAuth\Providers\JWT\Lcobucci::class,
            'auth' => Tymon\JWTAuth\Providers\Auth\Illuminate::class,
            'storage' => Tymon\JWTAuth\Providers\Storage\Illuminate::class,
        ],
    ],
];
