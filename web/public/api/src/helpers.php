<?php

if (!function_exists('env')) {
    function env($key, $default = null) {
        $value = $_ENV[$key] ?? getenv($key);
        
        if ($value === false) {
            return $default;
        }
        
        // Convert string representations to actual types
        switch (strtolower($value)) {
            case 'true':
            case '(true)':
                return true;
            case 'false':
            case '(false)':
                return false;
            case 'empty':
            case '(empty)':
                return '';
            case 'null':
            case '(null)':
                return null;
        }
        
        // Handle quoted strings
        if (strlen($value) > 1 && $value[0] === '"' && $value[-1] === '"') {
            return substr($value, 1, -1);
        }
        
        return $value;
    }
}

if (!function_exists('config')) {
    function config($key, $default = null) {
        static $config = null;
        
        if ($config === null) {
            $config = [];
            
            // Load configuration files
            $configFiles = [
                'app' => __DIR__ . '/../config/app.php',
                'database' => __DIR__ . '/../config/database.php',
                'auth' => __DIR__ . '/../config/auth.php',
                'cors' => __DIR__ . '/../config/cors.php',
                'upload' => __DIR__ . '/../config/upload.php'
            ];
            
            foreach ($configFiles as $name => $file) {
                if (file_exists($file)) {
                    $config[$name] = require $file;
                }
            }
        }
        
        // Parse dot notation
        $keys = explode('.', $key);
        $value = $config;
        
        foreach ($keys as $segment) {
            if (is_array($value) && array_key_exists($segment, $value)) {
                $value = $value[$segment];
            } else {
                return $default;
            }
        }
        
        return $value;
    }
}

if (!function_exists('storage_path')) {
    function storage_path($path = '') {
        $basePath = __DIR__ . '/../storage';
        return $path ? $basePath . '/' . ltrim($path, '/') : $basePath;
    }
}

if (!function_exists('public_path')) {
    function public_path($path = '') {
        $basePath = __DIR__ . '/../public';
        return $path ? $basePath . '/' . ltrim($path, '/') : $basePath;
    }
}

if (!function_exists('response')) {
    function response($data = null, $status = 200, $headers = []) {
        return new \App\Http\Response($data, $status, $headers);
    }
}

if (!function_exists('request')) {
    function request() {
        return \App\Http\Request::getInstance();
    }
}

if (!function_exists('auth')) {
    function auth() {
        return app('auth');
    }
}

if (!function_exists('app')) {
    function app($abstract = null) {
        static $app = null;
        
        if ($app === null) {
            $app = \App\Application::getInstance();
        }
        
        if ($abstract === null) {
            return $app;
        }
        
        return $app->make($abstract);
    }
}

if (!function_exists('dd')) {
    function dd(...$vars) {
        foreach ($vars as $var) {
            var_dump($var);
        }
        die(1);
    }
}

if (!function_exists('dump')) {
    function dump(...$vars) {
        foreach ($vars as $var) {
            var_dump($var);
        }
    }
}
