<?php

return [
    /*
    |--------------------------------------------------------------------------
    | File Upload Configuration
    |--------------------------------------------------------------------------
    |
    | This file contains the configuration for file uploads including
    | allowed file types, size limits, and storage settings.
    |
    */

    'max_file_size' => env('MAX_FILE_SIZE', '100MB'),
    
    'allowed_types' => [
        'image' => ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        'video' => ['mp4', 'mov', 'avi', 'webm'],
        'audio' => ['mp3', 'wav', 'm4a', 'aac'],
    ],
    
    'storage' => [
        'driver' => env('STORAGE_DRIVER', 'local'), // local, s3
        'local' => [
            'path' => storage_path('uploads'),
            'url' => env('APP_URL', 'http://localhost:8000') . '/uploads',
        ],
        's3' => [
            'bucket' => env('AWS_BUCKET'),
            'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'url' => env('AWS_URL'),
        ],
    ],
    
    'image_processing' => [
        'avatar' => [
            'max_width' => 400,
            'max_height' => 400,
            'quality' => 90,
        ],
        'thumbnail' => [
            'max_width' => 300,
            'max_height' => 200,
            'quality' => 85,
        ],
    ],
    
    'security' => [
        'scan_uploads' => env('SCAN_UPLOADS', false),
        'allowed_mime_types' => [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'video/mp4',
            'video/quicktime',
            'video/x-msvideo',
            'video/webm',
            'audio/mpeg',
            'audio/wav',
            'audio/mp4',
            'audio/aac',
        ],
    ],
];
