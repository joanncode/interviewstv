<?php

namespace App\Http;

class Route
{
    protected $methods;
    protected $uri;
    protected $action;
    protected $middleware = [];
    protected $parameters = [];
    protected $wheres = [];
    protected $groupAttributes = [];
    
    public function __construct($methods, $uri, $action)
    {
        $this->methods = (array) $methods;
        $this->uri = $uri;
        $this->action = $action;
    }
    
    public function middleware($middleware)
    {
        $this->middleware = array_merge($this->middleware, (array) $middleware);
        return $this;
    }
    
    public function where($name, $expression)
    {
        $this->wheres[$name] = $expression;
        return $this;
    }
    
    public function setGroupAttributes($attributes)
    {
        $this->groupAttributes = $attributes;
        
        // Apply group middleware
        if (isset($attributes['middleware'])) {
            $this->middleware = array_merge($this->middleware, (array) $attributes['middleware']);
        }
        
        return $this;
    }
    
    public function matches($method, $uri)
    {
        // Check if method matches
        if (!in_array($method, $this->methods)) {
            return false;
        }
        
        // Check if URI matches
        $pattern = $this->getCompiledRoute();
        return preg_match($pattern, $uri);
    }
    
    public function extractParameters($uri)
    {
        $pattern = $this->getCompiledRoute();
        
        if (preg_match($pattern, $uri, $matches)) {
            array_shift($matches); // Remove full match
            
            // Extract parameter names from route
            preg_match_all('/\{(\w+)\}/', $this->uri, $paramNames);
            $paramNames = $paramNames[1];
            
            $parameters = [];
            foreach ($paramNames as $index => $name) {
                if (isset($matches[$index])) {
                    $parameters[$name] = $matches[$index];
                }
            }
            
            return $parameters;
        }
        
        return [];
    }
    
    protected function getCompiledRoute()
    {
        $route = $this->uri;
        
        // Replace parameters with regex patterns
        $route = preg_replace_callback('/\{(\w+)\}/', function($matches) {
            $paramName = $matches[1];
            
            // Check if we have a specific pattern for this parameter
            if (isset($this->wheres[$paramName])) {
                return '(' . $this->wheres[$paramName] . ')';
            }
            
            // Default pattern for parameters
            return '([^/]+)';
        }, $route);
        
        // Escape forward slashes and create full pattern
        $route = str_replace('/', '\/', $route);
        return '/^' . $route . '$/';
    }
    
    public function getAction()
    {
        return $this->action;
    }
    
    public function getMiddleware()
    {
        return $this->middleware;
    }
    
    public function getMethods()
    {
        return $this->methods;
    }
    
    public function getUri()
    {
        return $this->uri;
    }
}
