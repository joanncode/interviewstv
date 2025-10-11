<?php

namespace App\Middleware;

use App\Http\Request;

class CorsMiddleware
{
    public function handle(Request $request)
    {
        $allowedOrigins = explode(',', env('CORS_ALLOWED_ORIGINS', '*'));
        $origin = $request->header('origin');
        
        if (in_array('*', $allowedOrigins) || in_array($origin, $allowedOrigins)) {
            header("Access-Control-Allow-Origin: {$origin}");
        }
        
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        header('Access-Control-Allow-Credentials: true');
        
        // Handle preflight requests
        if ($request->isMethod('OPTIONS')) {
            http_response_code(200);
            exit();
        }
        
        return true;
    }
}
