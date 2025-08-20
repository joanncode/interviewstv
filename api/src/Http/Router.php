<?php

namespace App\Http;

use App\Http\Request;
use App\Http\Response;
use App\Exceptions\HttpException;

class Router
{
    protected $routes = [];
    protected $groupStack = [];
    protected $middleware = [];
    
    public function __construct()
    {
        $this->middleware = [
            'auth' => \App\Middleware\AuthMiddleware::class,
            'cors' => \App\Middleware\CorsMiddleware::class,
            'throttle' => \App\Middleware\ThrottleMiddleware::class,
        ];
    }
    
    public function get($uri, $action)
    {
        return $this->addRoute(['GET'], $uri, $action);
    }
    
    public function post($uri, $action)
    {
        return $this->addRoute(['POST'], $uri, $action);
    }
    
    public function put($uri, $action)
    {
        return $this->addRoute(['PUT'], $uri, $action);
    }
    
    public function delete($uri, $action)
    {
        return $this->addRoute(['DELETE'], $uri, $action);
    }
    
    public function patch($uri, $action)
    {
        return $this->addRoute(['PATCH'], $uri, $action);
    }
    
    public function options($uri, $action)
    {
        return $this->addRoute(['OPTIONS'], $uri, $action);
    }
    
    public function any($uri, $action)
    {
        return $this->addRoute(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], $uri, $action);
    }
    
    public function group($attributes, $callback)
    {
        $this->groupStack[] = $attributes;
        $callback($this);
        array_pop($this->groupStack);
    }
    
    protected function addRoute($methods, $uri, $action)
    {
        $route = new Route($methods, $this->prefix($uri), $action);
        
        // Apply group attributes
        if (!empty($this->groupStack)) {
            $route->setGroupAttributes($this->mergeGroupAttributes());
        }
        
        $this->routes[] = $route;
        
        return $route;
    }
    
    protected function prefix($uri)
    {
        $prefix = $this->getLastGroupAttribute('prefix', '');
        return trim($prefix . '/' . trim($uri, '/'), '/') ?: '/';
    }
    
    protected function mergeGroupAttributes()
    {
        $attributes = [];
        
        foreach ($this->groupStack as $group) {
            $attributes = array_merge($attributes, $group);
        }
        
        return $attributes;
    }
    
    protected function getLastGroupAttribute($key, $default = null)
    {
        if (empty($this->groupStack)) {
            return $default;
        }
        
        $last = end($this->groupStack);
        return $last[$key] ?? $default;
    }
    
    public function dispatch(Request $request)
    {
        $method = $request->getMethod();
        $uri = $request->getPathInfo();
        
        // Remove leading slash and api prefix
        $uri = trim($uri, '/');
        if (strpos($uri, 'api/') === 0) {
            $uri = substr($uri, 4);
        }
        $uri = '/' . $uri;
        
        foreach ($this->routes as $route) {
            if ($route->matches($method, $uri)) {
                return $this->runRoute($route, $request);
            }
        }
        
        throw new HttpException(404, 'Route not found');
    }
    
    protected function runRoute(Route $route, Request $request)
    {
        // Extract parameters
        $parameters = $route->extractParameters($request->getPathInfo());
        $request->setRouteParameters($parameters);
        
        // Run middleware
        $middleware = $route->getMiddleware();
        foreach ($middleware as $middlewareName) {
            if (isset($this->middleware[$middlewareName])) {
                $middlewareClass = $this->middleware[$middlewareName];
                $middlewareInstance = new $middlewareClass();
                $middlewareInstance->handle($request);
            }
        }
        
        // Run the action
        $action = $route->getAction();
        
        if (is_callable($action)) {
            return call_user_func($action, $request);
        }
        
        if (is_string($action) && strpos($action, '@') !== false) {
            [$controller, $method] = explode('@', $action);
            $controllerClass = "App\\Controllers\\{$controller}";
            
            if (!class_exists($controllerClass)) {
                throw new HttpException(500, "Controller [{$controllerClass}] not found");
            }
            
            $controllerInstance = new $controllerClass();
            
            if (!method_exists($controllerInstance, $method)) {
                throw new HttpException(500, "Method [{$method}] not found on controller [{$controllerClass}]");
            }
            
            return call_user_func([$controllerInstance, $method], $request);
        }
        
        throw new HttpException(500, 'Invalid route action');
    }
}
