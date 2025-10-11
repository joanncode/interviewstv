<?php

namespace App\Router\Middleware;

use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;

/**
 * Middleware interface for route processing
 */
interface MiddlewareInterface
{
    /**
     * Process the request and return a response
     */
    public function process(ServerRequestInterface $request, callable $next): ResponseInterface;
}

/**
 * Authentication middleware
 */
class AuthMiddleware implements MiddlewareInterface
{
    public function process(ServerRequestInterface $request, callable $next): ResponseInterface
    {
        // Check for authentication token
        $authHeader = $request->getHeaderLine('Authorization');
        $token = null;
        
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            $token = $matches[1];
        }
        
        // Validate token (simplified)
        if (!$this->validateToken($token)) {
            return $this->unauthorizedResponse();
        }
        
        // Add user to request
        $user = $this->getUserFromToken($token);
        $request = $request->withAttribute('user', $user);
        
        return $next($request);
    }
    
    private function validateToken(?string $token): bool
    {
        // Implement token validation logic
        return !empty($token) && strlen($token) > 10;
    }
    
    private function getUserFromToken(string $token): array
    {
        // Implement user retrieval from token
        return ['id' => 1, 'name' => 'Test User'];
    }
    
    private function unauthorizedResponse(): ResponseInterface
    {
        $response = new \GuzzleHttp\Psr7\Response(401);
        $response->getBody()->write(json_encode(['error' => 'Unauthorized']));
        return $response->withHeader('Content-Type', 'application/json');
    }
}

/**
 * Guest middleware (redirect authenticated users)
 */
class GuestMiddleware implements MiddlewareInterface
{
    public function process(ServerRequestInterface $request, callable $next): ResponseInterface
    {
        // Check if user is authenticated
        if ($this->isAuthenticated($request)) {
            return $this->redirectResponse('/dashboard');
        }
        
        return $next($request);
    }
    
    private function isAuthenticated(ServerRequestInterface $request): bool
    {
        $authHeader = $request->getHeaderLine('Authorization');
        return !empty($authHeader) && strpos($authHeader, 'Bearer') === 0;
    }
    
    private function redirectResponse(string $location): ResponseInterface
    {
        return new \GuzzleHttp\Psr7\Response(302, ['Location' => $location]);
    }
}

/**
 * Admin middleware
 */
class AdminMiddleware implements MiddlewareInterface
{
    public function process(ServerRequestInterface $request, callable $next): ResponseInterface
    {
        $user = $request->getAttribute('user');
        
        if (!$user || !$this->isAdmin($user)) {
            return $this->forbiddenResponse();
        }
        
        return $next($request);
    }
    
    private function isAdmin(array $user): bool
    {
        return isset($user['role']) && $user['role'] === 'admin';
    }
    
    private function forbiddenResponse(): ResponseInterface
    {
        $response = new \GuzzleHttp\Psr7\Response(403);
        $response->getBody()->write(json_encode(['error' => 'Forbidden']));
        return $response->withHeader('Content-Type', 'application/json');
    }
}

/**
 * Rate limiting middleware
 */
class ThrottleMiddleware implements MiddlewareInterface
{
    private array $config;
    private array $requests = [];
    
    public function __construct(array $config = [])
    {
        $this->config = array_merge([
            'requests' => 60,
            'per_minute' => 1,
            'key_generator' => null
        ], $config);
    }
    
    public function process(ServerRequestInterface $request, callable $next): ResponseInterface
    {
        $key = $this->generateKey($request);
        $now = time();
        $window = $this->config['per_minute'] * 60;
        
        // Clean old requests
        $this->cleanOldRequests($key, $now - $window);
        
        // Check rate limit
        if ($this->isRateLimited($key, $now)) {
            return $this->rateLimitResponse();
        }
        
        // Record request
        $this->recordRequest($key, $now);
        
        return $next($request);
    }
    
    private function generateKey(ServerRequestInterface $request): string
    {
        if ($this->config['key_generator']) {
            return call_user_func($this->config['key_generator'], $request);
        }
        
        // Default: use IP address
        $serverParams = $request->getServerParams();
        return $serverParams['REMOTE_ADDR'] ?? 'unknown';
    }
    
    private function cleanOldRequests(string $key, int $cutoff): void
    {
        if (!isset($this->requests[$key])) {
            return;
        }
        
        $this->requests[$key] = array_filter($this->requests[$key], function($timestamp) use ($cutoff) {
            return $timestamp > $cutoff;
        });
    }
    
    private function isRateLimited(string $key, int $now): bool
    {
        if (!isset($this->requests[$key])) {
            return false;
        }
        
        return count($this->requests[$key]) >= $this->config['requests'];
    }
    
    private function recordRequest(string $key, int $now): void
    {
        if (!isset($this->requests[$key])) {
            $this->requests[$key] = [];
        }
        
        $this->requests[$key][] = $now;
    }
    
    private function rateLimitResponse(): ResponseInterface
    {
        $response = new \GuzzleHttp\Psr7\Response(429);
        $response->getBody()->write(json_encode(['error' => 'Too Many Requests']));
        return $response->withHeader('Content-Type', 'application/json')
                        ->withHeader('Retry-After', '60');
    }
}

/**
 * CORS middleware
 */
class CorsMiddleware implements MiddlewareInterface
{
    private array $config;
    
    public function __construct(array $config = [])
    {
        $this->config = array_merge([
            'allowed_origins' => ['*'],
            'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With'],
            'exposed_headers' => [],
            'max_age' => 86400,
            'credentials' => false
        ], $config);
    }
    
    public function process(ServerRequestInterface $request, callable $next): ResponseInterface
    {
        $origin = $request->getHeaderLine('Origin');
        
        // Handle preflight request
        if ($request->getMethod() === 'OPTIONS') {
            return $this->preflightResponse($origin);
        }
        
        $response = $next($request);
        
        // Add CORS headers
        return $this->addCorsHeaders($response, $origin);
    }
    
    private function preflightResponse(string $origin): ResponseInterface
    {
        $response = new \GuzzleHttp\Psr7\Response(200);
        return $this->addCorsHeaders($response, $origin);
    }
    
    private function addCorsHeaders(ResponseInterface $response, string $origin): ResponseInterface
    {
        // Check if origin is allowed
        if (!$this->isOriginAllowed($origin)) {
            return $response;
        }
        
        $response = $response->withHeader('Access-Control-Allow-Origin', $origin);
        $response = $response->withHeader('Access-Control-Allow-Methods', implode(', ', $this->config['allowed_methods']));
        $response = $response->withHeader('Access-Control-Allow-Headers', implode(', ', $this->config['allowed_headers']));
        
        if (!empty($this->config['exposed_headers'])) {
            $response = $response->withHeader('Access-Control-Expose-Headers', implode(', ', $this->config['exposed_headers']));
        }
        
        if ($this->config['credentials']) {
            $response = $response->withHeader('Access-Control-Allow-Credentials', 'true');
        }
        
        $response = $response->withHeader('Access-Control-Max-Age', (string) $this->config['max_age']);
        
        return $response;
    }
    
    private function isOriginAllowed(string $origin): bool
    {
        if (in_array('*', $this->config['allowed_origins'])) {
            return true;
        }
        
        return in_array($origin, $this->config['allowed_origins']);
    }
}

/**
 * Cache middleware
 */
class CacheMiddleware implements MiddlewareInterface
{
    private array $config;
    private array $cache = [];
    
    public function __construct(array $config = [])
    {
        $this->config = array_merge([
            'ttl' => 3600,
            'key_generator' => null,
            'cache_control' => 'public, max-age=3600'
        ], $config);
    }
    
    public function process(ServerRequestInterface $request, callable $next): ResponseInterface
    {
        // Only cache GET requests
        if ($request->getMethod() !== 'GET') {
            return $next($request);
        }
        
        $key = $this->generateCacheKey($request);
        
        // Check cache
        if ($this->hasValidCache($key)) {
            return $this->getCachedResponse($key);
        }
        
        // Process request
        $response = $next($request);
        
        // Cache successful responses
        if ($response->getStatusCode() === 200) {
            $this->cacheResponse($key, $response);
            $response = $response->withHeader('Cache-Control', $this->config['cache_control']);
        }
        
        return $response;
    }
    
    private function generateCacheKey(ServerRequestInterface $request): string
    {
        if ($this->config['key_generator']) {
            return call_user_func($this->config['key_generator'], $request);
        }
        
        $uri = $request->getUri();
        return md5($uri->getPath() . '?' . $uri->getQuery());
    }
    
    private function hasValidCache(string $key): bool
    {
        if (!isset($this->cache[$key])) {
            return false;
        }
        
        return $this->cache[$key]['expires'] > time();
    }
    
    private function getCachedResponse(string $key): ResponseInterface
    {
        $cached = $this->cache[$key];
        $response = new \GuzzleHttp\Psr7\Response($cached['status'], $cached['headers']);
        $response->getBody()->write($cached['body']);
        
        return $response->withHeader('X-Cache', 'HIT');
    }
    
    private function cacheResponse(string $key, ResponseInterface $response): void
    {
        $this->cache[$key] = [
            'status' => $response->getStatusCode(),
            'headers' => $response->getHeaders(),
            'body' => (string) $response->getBody(),
            'expires' => time() + $this->config['ttl']
        ];
    }
}
