<?php

namespace App\Middleware;

use App\Http\Request;
use App\Http\Response;
use App\Services\AuthService;
use App\Exceptions\HttpException;

class AuthMiddleware
{
    public function handle(Request $request)
    {
        $token = $request->bearerToken();
        
        if (!$token) {
            throw new HttpException(401, 'Authentication token required');
        }
        
        $authService = new AuthService();
        $user = $authService->validateToken($token);
        
        if (!$user) {
            throw new HttpException(401, 'Invalid or expired token');
        }
        
        // Store user in request for controllers to access
        $request->setUser($user);
        
        return true;
    }
}
