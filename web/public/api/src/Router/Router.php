<?php

namespace App\Router;

use App\Config\UrlConfig;
use App\Router\Middleware\MiddlewareInterface;
use App\Router\Guards\RouteGuardInterface;

/**
 * Advanced Router with middleware, guards, and dynamic route generation
 */
class Router
{
    private array $routes = [];
    private array $middleware = [];
    private array $guards = [];
    private array $groups = [];
    private string $currentGroup = '';
    private array $namedRoutes = [];
    private array $routeCache = [];
    private bool $cacheEnabled = true;
    private $parameterValidator;
    private $errorHandler404;
    private $securityValidator;

    public function __construct()
    {
        $this->loadConfiguredRoutes();
        $this->parameterValidator = new \App\Services\UrlParameterValidator();
        $this->securityValidator = new \App\Services\SecurityValidationService();
    }

    /**
     * Add GET route
     */
    public function get(string $path, $handler, array $options = []): Route
    {
        return $this->addRoute('GET', $path, $handler, $options);
    }

    /**
     * Add POST route
     */
    public function post(string $path, $handler, array $options = []): Route
    {
        return $this->addRoute('POST', $path, $handler, $options);
    }

    /**
     * Add PUT route
     */
    public function put(string $path, $handler, array $options = []): Route
    {
        return $this->addRoute('PUT', $path, $handler, $options);
    }

    /**
     * Add DELETE route
     */
    public function delete(string $path, $handler, array $options = []): Route
    {
        return $this->addRoute('DELETE', $path, $handler, $options);
    }

    /**
     * Add PATCH route
     */
    public function patch(string $path, $handler, array $options = []): Route
    {
        return $this->addRoute('PATCH', $path, $handler, $options);
    }

    /**
     * Add OPTIONS route
     */
    public function options(string $path, $handler, array $options = []): Route
    {
        return $this->addRoute('OPTIONS', $path, $handler, $options);
    }

    /**
     * Add route for multiple methods
     */
    public function match(array $methods, string $path, $handler, array $options = []): array
    {
        $routes = [];
        foreach ($methods as $method) {
            $routes[] = $this->addRoute(strtoupper($method), $path, $handler, $options);
        }
        return $routes;
    }

    /**
     * Add route for all HTTP methods
     */
    public function any(string $path, $handler, array $options = []): array
    {
        return $this->match(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], $path, $handler, $options);
    }

    /**
     * Create route group with shared attributes
     */
    public function group(array $attributes, callable $callback): void
    {
        $previousGroup = $this->currentGroup;
        
        // Build group key
        $groupKey = $this->buildGroupKey($attributes);
        $this->currentGroup = $groupKey;
        $this->groups[$groupKey] = $attributes;
        
        // Execute callback
        $callback($this);
        
        // Restore previous group
        $this->currentGroup = $previousGroup;
    }

    /**
     * Add middleware to router
     */
    public function middleware(string $name, MiddlewareInterface $middleware): void
    {
        $this->middleware[$name] = $middleware;
    }

    /**
     * Add route guard
     */
    public function guard(string $name, RouteGuardInterface $guard): void
    {
        $this->guards[$name] = $guard;
    }

    /**
     * Resolve route from request with enhanced security
     */
    public function resolve(string $method, string $path): ?RouteMatch
    {
        $cacheKey = $method . ':' . $path;

        // Check cache first
        if ($this->cacheEnabled && isset($this->routeCache[$cacheKey])) {
            return $this->routeCache[$cacheKey];
        }

        // Clean and validate path
        $path = $this->cleanPath($path);
        $this->validatePath($path);

        // Try to match routes
        foreach ($this->routes as $route) {
            if ($route->getMethod() !== $method) {
                continue;
            }

            $match = $this->matchRoute($route, $path);
            if ($match) {
                // Validate route parameters
                $this->validateRouteParameters($match);

                // Cache the result
                if ($this->cacheEnabled) {
                    $this->routeCache[$cacheKey] = $match;
                }

                return $match;
            }
        }

        // Try URL aliases
        $aliasedPath = $this->resolveAlias($path);
        if ($aliasedPath !== $path) {
            return $this->resolve($method, $aliasedPath);
        }

        // Handle 404 with intelligent suggestions
        $this->handle404($path);

        return null;
    }

    /**
     * Generate URL for named route
     */
    public function url(string $name, array $parameters = [], array $queryParams = []): string
    {
        if (!isset($this->namedRoutes[$name])) {
            throw new \InvalidArgumentException("Named route '{$name}' not found");
        }
        
        $route = $this->namedRoutes[$name];
        $path = $this->buildPath($route->getPath(), $parameters);
        
        if (!empty($queryParams)) {
            $path .= '?' . http_build_query($queryParams);
        }
        
        return $path;
    }

    /**
     * Check if named route exists
     */
    public function hasRoute(string $name): bool
    {
        return isset($this->namedRoutes[$name]);
    }

    /**
     * Get all routes
     */
    public function getRoutes(): array
    {
        return $this->routes;
    }

    /**
     * Get named routes
     */
    public function getNamedRoutes(): array
    {
        return $this->namedRoutes;
    }

    /**
     * Clear route cache
     */
    public function clearCache(): void
    {
        $this->routeCache = [];
    }

    /**
     * Enable/disable route caching
     */
    public function setCacheEnabled(bool $enabled): void
    {
        $this->cacheEnabled = $enabled;
    }

    /**
     * Add route to router
     */
    private function addRoute(string $method, string $path, $handler, array $options = []): Route
    {
        // Apply group attributes
        if ($this->currentGroup) {
            $groupAttributes = $this->groups[$this->currentGroup];
            $options = $this->mergeGroupAttributes($options, $groupAttributes);
            
            // Prefix path if group has prefix
            if (!empty($groupAttributes['prefix'])) {
                $path = '/' . trim($groupAttributes['prefix'], '/') . '/' . ltrim($path, '/');
            }
        }
        
        // Create route
        $route = new Route($method, $path, $handler, $options);
        
        // Add to routes array
        $this->routes[] = $route;
        
        // Add to named routes if name is provided
        if (!empty($options['name'])) {
            $this->namedRoutes[$options['name']] = $route;
        }
        
        return $route;
    }

    /**
     * Match route against path
     */
    private function matchRoute(Route $route, string $path): ?RouteMatch
    {
        $pattern = $this->buildPattern($route->getPath());
        
        if (preg_match($pattern, $path, $matches)) {
            // Extract parameters
            $parameters = [];
            foreach ($matches as $key => $value) {
                if (is_string($key)) {
                    $parameters[$key] = $value;
                }
            }
            
            return new RouteMatch($route, $parameters);
        }
        
        return null;
    }

    /**
     * Build regex pattern from route path
     */
    private function buildPattern(string $path): string
    {
        // Escape special regex characters
        $pattern = preg_quote($path, '#');
        
        // Replace parameter placeholders with regex patterns
        $pattern = preg_replace_callback('/\\\\{([^}]+)\\\\}/', function($matches) {
            $paramName = $matches[1];
            $paramPattern = UrlConfig::getParameterPattern($paramName);
            return "(?P<{$paramName}>{$paramPattern})";
        }, $pattern);
        
        return '#^' . $pattern . '$#';
    }

    /**
     * Build path with parameters
     */
    private function buildPath(string $path, array $parameters): string
    {
        foreach ($parameters as $key => $value) {
            $path = str_replace('{' . $key . '}', urlencode($value), $path);
        }
        
        // Check for unreplaced parameters
        if (preg_match('/\{[^}]+\}/', $path)) {
            throw new \InvalidArgumentException('Missing required parameters for route');
        }
        
        return $path;
    }

    /**
     * Clean path for matching
     */
    private function cleanPath(string $path): string
    {
        // Remove query string
        $path = strtok($path, '?');
        
        // Remove trailing slash (except for root)
        if ($path !== '/' && substr($path, -1) === '/') {
            $path = rtrim($path, '/');
        }
        
        // Ensure path starts with /
        if (substr($path, 0, 1) !== '/') {
            $path = '/' . $path;
        }
        
        return $path;
    }

    /**
     * Resolve URL alias
     */
    private function resolveAlias(string $path): string
    {
        $aliases = UrlConfig::getAllAliases();
        
        foreach ($aliases as $alias => $target) {
            // Exact match
            if ($path === $alias) {
                return $target;
            }
            
            // Pattern match (for parameterized aliases)
            if (strpos($alias, '{') !== false) {
                $pattern = $this->buildPattern($alias);
                if (preg_match($pattern, $path, $matches)) {
                    // Replace parameters in target
                    $resolvedTarget = $target;
                    foreach ($matches as $key => $value) {
                        if (is_string($key)) {
                            $resolvedTarget = str_replace('{' . $key . '}', $value, $resolvedTarget);
                        }
                    }
                    return $resolvedTarget;
                }
            }
        }
        
        return $path;
    }

    /**
     * Build group key from attributes
     */
    private function buildGroupKey(array $attributes): string
    {
        return md5(serialize($attributes));
    }

    /**
     * Merge group attributes with route options
     */
    private function mergeGroupAttributes(array $options, array $groupAttributes): array
    {
        // Merge middleware
        if (!empty($groupAttributes['middleware'])) {
            $options['middleware'] = array_merge(
                $options['middleware'] ?? [],
                (array) $groupAttributes['middleware']
            );
        }
        
        // Merge guards
        if (!empty($groupAttributes['guards'])) {
            $options['guards'] = array_merge(
                $options['guards'] ?? [],
                (array) $groupAttributes['guards']
            );
        }
        
        // Merge namespace
        if (!empty($groupAttributes['namespace'])) {
            $options['namespace'] = $groupAttributes['namespace'];
        }
        
        // Merge other attributes
        foreach (['domain', 'scheme'] as $attr) {
            if (!empty($groupAttributes[$attr]) && empty($options[$attr])) {
                $options[$attr] = $groupAttributes[$attr];
            }
        }
        
        return $options;
    }

    /**
     * Load routes from configuration
     */
    private function loadConfiguredRoutes(): void
    {
        $patterns = UrlConfig::getAllPatterns();
        
        foreach ($patterns as $name => $pattern) {
            // Determine HTTP method based on route name
            $method = $this->getMethodFromRouteName($name);
            
            // Create route with basic configuration
            $this->addRoute($method, $pattern, null, [
                'name' => $name,
                'config_route' => true
            ]);
        }
    }

    /**
     * Get HTTP method from route name
     */
    private function getMethodFromRouteName(string $name): string
    {
        // Routes that typically use POST
        $postRoutes = [
            'login', 'register', 'logout', 'forgot-password', 'reset-password',
            'interview-create', 'interview-upload', 'interview-analysis'
        ];
        
        // Routes that typically use PUT/PATCH
        $putRoutes = [
            'profile-edit', 'interview-edit', 'settings'
        ];
        
        // Routes that typically use DELETE
        $deleteRoutes = [
            'interview-delete', 'user-delete'
        ];
        
        if (in_array($name, $postRoutes)) {
            return 'POST';
        } elseif (in_array($name, $putRoutes)) {
            return 'PUT';
        } elseif (in_array($name, $deleteRoutes)) {
            return 'DELETE';
        }
        
        return 'GET';
    }

    /**
     * Validate path for security issues
     */
    private function validatePath($path)
    {
        // Check for path traversal attempts
        if (strpos($path, '..') !== false) {
            throw new \InvalidArgumentException('Path traversal attempt detected');
        }

        // Check for null bytes
        if (strpos($path, "\0") !== false) {
            throw new \InvalidArgumentException('Null byte in path');
        }

        // Check path length
        if (strlen($path) > 2048) {
            throw new \InvalidArgumentException('Path too long');
        }

        // Check for suspicious patterns
        $suspiciousPatterns = [
            '/\.(php|asp|jsp|cgi)$/i',
            '/\.(htaccess|htpasswd)$/i',
            '/\/\.(env|git|svn)/i',
            '/\/(admin|config|backup|test)\/.*\.(sql|bak|old)$/i'
        ];

        foreach ($suspiciousPatterns as $pattern) {
            if (preg_match($pattern, $path)) {
                $this->securityValidator->logSecurityEvent('suspicious_path_access', [
                    'path' => $path,
                    'pattern' => $pattern
                ]);
                throw new \InvalidArgumentException('Suspicious path detected');
            }
        }
    }

    /**
     * Validate route parameters
     */
    private function validateRouteParameters(RouteMatch $match)
    {
        $parameters = $match->getParameters();
        $route = $match->getRoute();

        try {
            $validatedParams = $this->parameterValidator->validateParameters($parameters, $route->getName());
            $match->setParameters($validatedParams);
        } catch (\InvalidArgumentException $e) {
            $this->securityValidator->logSecurityEvent('invalid_route_parameters', [
                'route' => $route->getName(),
                'parameters' => $parameters,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Handle 404 errors with intelligent suggestions
     */
    private function handle404($path)
    {
        if (!$this->errorHandler404) {
            $this->errorHandler404 = new \App\Services\Enhanced404Handler(
                $this->getDatabaseConnection(),
                $this->getUrlGenerator(),
                $this->getSeoService()
            );
        }

        $this->errorHandler404->handle($path);
    }

    /**
     * Get database connection (placeholder - implement based on your DI container)
     */
    private function getDatabaseConnection()
    {
        // This should be injected via dependency injection
        // For now, return null and let the 404 handler handle it gracefully
        return null;
    }

    /**
     * Get URL generator (placeholder - implement based on your setup)
     */
    private function getUrlGenerator()
    {
        // This should be injected via dependency injection
        return new \App\Services\UrlGeneratorService();
    }

    /**
     * Get SEO service (placeholder - implement based on your setup)
     */
    private function getSeoService()
    {
        // This should be injected via dependency injection
        return new \App\Services\SeoService($this->getUrlGenerator());
    }

    /**
     * Add security middleware to all routes
     */
    public function addSecurityMiddleware()
    {
        $this->middleware('security', function($request, $response, $next) {
            // Apply security headers
            header('X-Content-Type-Options: nosniff');
            header('X-Frame-Options: DENY');
            header('X-XSS-Protection: 1; mode=block');
            header('Referrer-Policy: strict-origin-when-cross-origin');

            if (isset($_SERVER['HTTPS'])) {
                header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
            }

            return $next($request, $response);
        });
    }

    /**
     * Add rate limiting middleware
     */
    public function addRateLimitingMiddleware($rateLimiter = null)
    {
        if (!$rateLimiter) {
            $rateLimiter = new \App\Services\AdvancedRateLimiter($this->getDatabaseConnection());
        }

        $this->middleware('rate_limit', function($request, $response, $next) use ($rateLimiter) {
            $identifier = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
            $action = 'api_request';

            if (!$rateLimiter->checkLimit($identifier, $action)) {
                http_response_code(429);
                header('Content-Type: application/json');
                echo json_encode([
                    'error' => 'Rate limit exceeded',
                    'code' => 'RATE_LIMITED'
                ]);
                exit;
            }

            return $next($request, $response);
        });
    }

    /**
     * Generate canonical URL for current route
     */
    public function getCanonicalUrl($routeName, $parameters = [])
    {
        if (!isset($this->namedRoutes[$routeName])) {
            return null;
        }

        $route = $this->namedRoutes[$routeName];
        $path = $route->getPath();

        // Replace parameters in path
        foreach ($parameters as $key => $value) {
            $path = str_replace('{' . $key . '}', $value, $path);
        }

        $baseUrl = $_SERVER['REQUEST_SCHEME'] ?? 'https';
        $baseUrl .= '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');

        return $baseUrl . $path;
    }
}
