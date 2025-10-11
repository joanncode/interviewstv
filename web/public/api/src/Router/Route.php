<?php

namespace App\Router;

/**
 * Route class representing a single route definition
 */
class Route
{
    private string $method;
    private string $path;
    private $handler;
    private array $options;
    private array $middleware = [];
    private array $guards = [];
    private array $parameters = [];
    private ?string $name = null;
    private ?string $domain = null;
    private ?string $scheme = null;

    public function __construct(string $method, string $path, $handler, array $options = [])
    {
        $this->method = strtoupper($method);
        $this->path = $path;
        $this->handler = $handler;
        $this->options = $options;
        
        $this->parseOptions($options);
    }

    /**
     * Get route method
     */
    public function getMethod(): string
    {
        return $this->method;
    }

    /**
     * Get route path
     */
    public function getPath(): string
    {
        return $this->path;
    }

    /**
     * Get route handler
     */
    public function getHandler()
    {
        return $this->handler;
    }

    /**
     * Get route options
     */
    public function getOptions(): array
    {
        return $this->options;
    }

    /**
     * Get route name
     */
    public function getName(): ?string
    {
        return $this->name;
    }

    /**
     * Set route name
     */
    public function name(string $name): self
    {
        $this->name = $name;
        $this->options['name'] = $name;
        return $this;
    }

    /**
     * Get route middleware
     */
    public function getMiddleware(): array
    {
        return $this->middleware;
    }

    /**
     * Add middleware to route
     */
    public function middleware($middleware): self
    {
        if (is_string($middleware)) {
            $this->middleware[] = $middleware;
        } elseif (is_array($middleware)) {
            $this->middleware = array_merge($this->middleware, $middleware);
        }
        
        $this->options['middleware'] = $this->middleware;
        return $this;
    }

    /**
     * Get route guards
     */
    public function getGuards(): array
    {
        return $this->guards;
    }

    /**
     * Add guards to route
     */
    public function guard($guards): self
    {
        if (is_string($guards)) {
            $this->guards[] = $guards;
        } elseif (is_array($guards)) {
            $this->guards = array_merge($this->guards, $guards);
        }
        
        $this->options['guards'] = $this->guards;
        return $this;
    }

    /**
     * Get route parameters
     */
    public function getParameters(): array
    {
        return $this->parameters;
    }

    /**
     * Set route parameters
     */
    public function setParameters(array $parameters): self
    {
        $this->parameters = $parameters;
        return $this;
    }

    /**
     * Get route domain
     */
    public function getDomain(): ?string
    {
        return $this->domain;
    }

    /**
     * Set route domain
     */
    public function domain(string $domain): self
    {
        $this->domain = $domain;
        $this->options['domain'] = $domain;
        return $this;
    }

    /**
     * Get route scheme
     */
    public function getScheme(): ?string
    {
        return $this->scheme;
    }

    /**
     * Set route scheme
     */
    public function scheme(string $scheme): self
    {
        $this->scheme = $scheme;
        $this->options['scheme'] = $scheme;
        return $this;
    }

    /**
     * Check if route requires HTTPS
     */
    public function requiresHttps(): bool
    {
        return $this->scheme === 'https' || $this->getOption('https', false);
    }

    /**
     * Check if route requires authentication
     */
    public function requiresAuth(): bool
    {
        return in_array('auth', $this->middleware) || 
               in_array('auth', $this->guards) ||
               $this->getOption('auth', false);
    }

    /**
     * Check if route is for guests only
     */
    public function isGuestOnly(): bool
    {
        return in_array('guest', $this->middleware) || 
               in_array('guest', $this->guards) ||
               $this->getOption('guest', false);
    }

    /**
     * Check if route requires admin access
     */
    public function requiresAdmin(): bool
    {
        return in_array('admin', $this->middleware) || 
               in_array('admin', $this->guards) ||
               $this->getOption('admin', false);
    }

    /**
     * Check if route has caching enabled
     */
    public function hasCaching(): bool
    {
        return $this->getOption('cache', false);
    }

    /**
     * Get cache TTL
     */
    public function getCacheTtl(): int
    {
        return $this->getOption('cache_ttl', 3600);
    }

    /**
     * Check if route is rate limited
     */
    public function isRateLimited(): bool
    {
        return $this->getOption('rate_limit', false) || 
               in_array('throttle', $this->middleware);
    }

    /**
     * Get rate limit configuration
     */
    public function getRateLimit(): array
    {
        return $this->getOption('rate_limit_config', [
            'requests' => 60,
            'per_minute' => 1
        ]);
    }

    /**
     * Get option value
     */
    public function getOption(string $key, $default = null)
    {
        return $this->options[$key] ?? $default;
    }

    /**
     * Set option value
     */
    public function setOption(string $key, $value): self
    {
        $this->options[$key] = $value;
        return $this;
    }

    /**
     * Check if route matches method and domain
     */
    public function matches(string $method, ?string $domain = null): bool
    {
        // Check method
        if ($this->method !== strtoupper($method)) {
            return false;
        }
        
        // Check domain if specified
        if ($this->domain && $domain && $this->domain !== $domain) {
            return false;
        }
        
        return true;
    }

    /**
     * Get route signature for caching
     */
    public function getSignature(): string
    {
        return md5($this->method . ':' . $this->path . ':' . serialize($this->options));
    }

    /**
     * Convert route to array
     */
    public function toArray(): array
    {
        return [
            'method' => $this->method,
            'path' => $this->path,
            'handler' => $this->handler,
            'name' => $this->name,
            'middleware' => $this->middleware,
            'guards' => $this->guards,
            'domain' => $this->domain,
            'scheme' => $this->scheme,
            'options' => $this->options
        ];
    }

    /**
     * Parse options and set properties
     */
    private function parseOptions(array $options): void
    {
        // Set name
        if (!empty($options['name'])) {
            $this->name = $options['name'];
        }
        
        // Set middleware
        if (!empty($options['middleware'])) {
            $this->middleware = (array) $options['middleware'];
        }
        
        // Set guards
        if (!empty($options['guards'])) {
            $this->guards = (array) $options['guards'];
        }
        
        // Set domain
        if (!empty($options['domain'])) {
            $this->domain = $options['domain'];
        }
        
        // Set scheme
        if (!empty($options['scheme'])) {
            $this->scheme = $options['scheme'];
        }
        
        // Auto-detect middleware from path patterns
        $this->autoDetectMiddleware();
    }

    /**
     * Auto-detect middleware based on path patterns
     */
    private function autoDetectMiddleware(): void
    {
        // Admin routes
        if (strpos($this->path, '/admin') === 0) {
            if (!in_array('admin', $this->middleware)) {
                $this->middleware[] = 'admin';
            }
            if (!in_array('auth', $this->middleware)) {
                $this->middleware[] = 'auth';
            }
        }
        
        // API routes
        if (strpos($this->path, '/api') === 0) {
            if (!in_array('api', $this->middleware)) {
                $this->middleware[] = 'api';
            }
            if (!in_array('throttle', $this->middleware)) {
                $this->middleware[] = 'throttle';
            }
        }
        
        // Auth required routes
        $authPaths = ['/dashboard', '/profile', '/settings', '/create-interview'];
        foreach ($authPaths as $authPath) {
            if (strpos($this->path, $authPath) === 0) {
                if (!in_array('auth', $this->middleware)) {
                    $this->middleware[] = 'auth';
                }
                break;
            }
        }
        
        // Guest only routes
        $guestPaths = ['/login', '/register', '/forgot-password'];
        foreach ($guestPaths as $guestPath) {
            if (strpos($this->path, $guestPath) === 0) {
                if (!in_array('guest', $this->middleware)) {
                    $this->middleware[] = 'guest';
                }
                break;
            }
        }
        
        // HTTPS required routes
        $httpsPaths = ['/login', '/register', '/admin', '/api'];
        foreach ($httpsPaths as $httpsPath) {
            if (strpos($this->path, $httpsPath) === 0) {
                $this->scheme = 'https';
                break;
            }
        }
    }
}

/**
 * RouteMatch class representing a matched route with parameters
 */
class RouteMatch
{
    private Route $route;
    private array $parameters;

    public function __construct(Route $route, array $parameters = [])
    {
        $this->route = $route;
        $this->parameters = $parameters;
    }

    /**
     * Get matched route
     */
    public function getRoute(): Route
    {
        return $this->route;
    }

    /**
     * Get route parameters
     */
    public function getParameters(): array
    {
        return $this->parameters;
    }

    /**
     * Get specific parameter
     */
    public function getParameter(string $name, $default = null)
    {
        return $this->parameters[$name] ?? $default;
    }

    /**
     * Check if parameter exists
     */
    public function hasParameter(string $name): bool
    {
        return isset($this->parameters[$name]);
    }

    /**
     * Get route handler
     */
    public function getHandler()
    {
        return $this->route->getHandler();
    }

    /**
     * Get route name
     */
    public function getName(): ?string
    {
        return $this->route->getName();
    }

    /**
     * Get route middleware
     */
    public function getMiddleware(): array
    {
        return $this->route->getMiddleware();
    }

    /**
     * Get route guards
     */
    public function getGuards(): array
    {
        return $this->route->getGuards();
    }

    /**
     * Convert to array
     */
    public function toArray(): array
    {
        return [
            'route' => $this->route->toArray(),
            'parameters' => $this->parameters
        ];
    }
}
