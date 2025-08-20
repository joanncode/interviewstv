<?php

namespace App\Http;

class Request
{
    protected $method;
    protected $uri;
    protected $headers;
    protected $input;
    protected $files;
    protected $routeParameters = [];
    protected $user;
    protected static $instance;
    
    public function __construct()
    {
        $this->method = $_SERVER['REQUEST_METHOD'];
        $this->uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $this->headers = $this->getAllHeaders();
        $this->input = $this->parseInput();
        $this->files = $_FILES;
    }
    
    public static function capture()
    {
        if (!self::$instance) {
            self::$instance = new static();
        }
        return self::$instance;
    }
    
    public static function getInstance()
    {
        return self::$instance ?: self::capture();
    }
    
    public function getMethod()
    {
        return $this->method;
    }
    
    public function getPathInfo()
    {
        return $this->uri;
    }
    
    public function getUri()
    {
        return $this->uri;
    }
    
    public function header($key, $default = null)
    {
        $key = strtolower($key);
        return $this->headers[$key] ?? $default;
    }
    
    public function bearerToken()
    {
        $authHeader = $this->header('authorization');
        if ($authHeader && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return $matches[1];
        }
        return null;
    }
    
    public function input($key = null, $default = null)
    {
        if ($key === null) {
            return $this->input;
        }
        return $this->input[$key] ?? $default;
    }
    
    public function all()
    {
        return $this->input;
    }
    
    public function only($keys)
    {
        $result = [];
        foreach ($keys as $key) {
            if (isset($this->input[$key])) {
                $result[$key] = $this->input[$key];
            }
        }
        return $result;
    }
    
    public function except($keys)
    {
        $result = $this->input;
        foreach ($keys as $key) {
            unset($result[$key]);
        }
        return $result;
    }
    
    public function has($key)
    {
        return isset($this->input[$key]);
    }
    
    public function file($key)
    {
        return $this->files[$key] ?? null;
    }
    
    public function hasFile($key)
    {
        return isset($this->files[$key]) && $this->files[$key]['error'] === UPLOAD_ERR_OK;
    }
    
    public function isMethod($method)
    {
        return strtoupper($this->method) === strtoupper($method);
    }
    
    public function isJson()
    {
        return strpos($this->header('content-type', ''), 'application/json') !== false;
    }
    
    public function wantsJson()
    {
        return $this->isJson() || strpos($this->header('accept', ''), 'application/json') !== false;
    }
    
    public function ip()
    {
        return $_SERVER['HTTP_X_FORWARDED_FOR'] ?? 
               $_SERVER['HTTP_X_REAL_IP'] ?? 
               $_SERVER['REMOTE_ADDR'] ?? 
               '0.0.0.0';
    }
    
    public function userAgent()
    {
        return $this->header('user-agent', '');
    }
    
    public function setRouteParameters($parameters)
    {
        $this->routeParameters = $parameters;
    }
    
    public function route($key = null, $default = null)
    {
        if ($key === null) {
            return $this->routeParameters;
        }
        return $this->routeParameters[$key] ?? $default;
    }

    public function setUser($user)
    {
        $this->user = $user;
    }

    public function user()
    {
        return $this->user;
    }
    
    protected function parseInput()
    {
        $input = [];
        
        // Start with query parameters
        $input = $_GET;
        
        if ($this->isMethod('GET')) {
            return $input;
        }
        
        if ($this->isJson()) {
            $json = file_get_contents('php://input');
            $decoded = json_decode($json, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $input = array_merge($input, $decoded);
            }
        } else {
            // Handle form data
            if ($this->isMethod('POST')) {
                $input = array_merge($input, $_POST);
            } else {
                // For PUT, DELETE, PATCH
                parse_str(file_get_contents('php://input'), $parsed);
                $input = array_merge($input, $parsed);
            }
        }
        
        return $input;
    }
    
    protected function getAllHeaders()
    {
        $headers = [];
        
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
        } else {
            // Fallback for servers that don't have getallheaders
            foreach ($_SERVER as $key => $value) {
                if (strpos($key, 'HTTP_') === 0) {
                    $header = str_replace('_', '-', substr($key, 5));
                    $headers[$header] = $value;
                }
            }
        }
        
        // Normalize header keys to lowercase
        return array_change_key_case($headers, CASE_LOWER);
    }
}
