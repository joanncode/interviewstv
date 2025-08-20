<?php

if (!function_exists('env')) {
    /**
     * Get environment variable with optional default
     */
    function env($key, $default = null) {
        $value = $_ENV[$key] ?? getenv($key);
        
        if ($value === false) {
            return $default;
        }
        
        // Convert string booleans
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
    /**
     * Get configuration value using dot notation
     */
    function config($key, $default = null) {
        static $config = [];
        
        if (empty($config)) {
            // Load all config files
            $configPath = __DIR__ . '/../../config/';
            $files = glob($configPath . '*.php');
            
            foreach ($files as $file) {
                $name = basename($file, '.php');
                $config[$name] = require $file;
            }
        }
        
        $keys = explode('.', $key);
        $value = $config;
        
        foreach ($keys as $segment) {
            if (!is_array($value) || !array_key_exists($segment, $value)) {
                return $default;
            }
            $value = $value[$segment];
        }
        
        return $value;
    }
}

if (!function_exists('app_path')) {
    /**
     * Get the path to the application folder
     */
    function app_path($path = '') {
        return __DIR__ . '/../../api/src' . ($path ? DIRECTORY_SEPARATOR . $path : $path);
    }
}

if (!function_exists('base_path')) {
    /**
     * Get the path to the base of the install
     */
    function base_path($path = '') {
        return __DIR__ . '/../..' . ($path ? DIRECTORY_SEPARATOR . $path : $path);
    }
}

if (!function_exists('config_path')) {
    /**
     * Get the path to the config folder
     */
    function config_path($path = '') {
        return __DIR__ . '/../../config' . ($path ? DIRECTORY_SEPARATOR . $path : $path);
    }
}

if (!function_exists('storage_path')) {
    /**
     * Get the path to the storage folder
     */
    function storage_path($path = '') {
        return __DIR__ . '/../../api/storage' . ($path ? DIRECTORY_SEPARATOR . $path : $path);
    }
}

if (!function_exists('public_path')) {
    /**
     * Get the path to the public folder
     */
    function public_path($path = '') {
        return __DIR__ . '/../../api/public' . ($path ? DIRECTORY_SEPARATOR . $path : $path);
    }
}

if (!function_exists('web_path')) {
    /**
     * Get the path to the web folder
     */
    function web_path($path = '') {
        return __DIR__ . '/../../web' . ($path ? DIRECTORY_SEPARATOR . $path : $path);
    }
}

if (!function_exists('response')) {
    /**
     * Create a response instance
     */
    function response($data = null, $status = 200, $headers = []) {
        return new \App\Http\Response($data, $status, $headers);
    }
}

if (!function_exists('request')) {
    /**
     * Get the current request instance
     */
    function request() {
        return \App\Http\Request::getInstance();
    }
}

if (!function_exists('auth')) {
    /**
     * Get the auth instance
     */
    function auth($guard = null) {
        return \App\Services\Auth::guard($guard);
    }
}

if (!function_exists('bcrypt')) {
    /**
     * Hash the given value using bcrypt
     */
    function bcrypt($value, $options = []) {
        $cost = $options['rounds'] ?? config('auth.bcrypt_rounds', 12);
        return password_hash($value, PASSWORD_BCRYPT, ['cost' => $cost]);
    }
}

if (!function_exists('now')) {
    /**
     * Get current timestamp
     */
    function now() {
        return new DateTime();
    }
}

if (!function_exists('logger')) {
    /**
     * Log a message
     */
    function logger($message = null, $context = []) {
        if (is_null($message)) {
            return app('log');
        }
        
        return app('log')->info($message, $context);
    }
}

if (!function_exists('abort')) {
    /**
     * Throw an HTTP exception
     */
    function abort($code, $message = '', $headers = []) {
        throw new \App\Exceptions\HttpException($code, $message, null, $headers);
    }
}

if (!function_exists('abort_if')) {
    /**
     * Throw an HTTP exception if condition is true
     */
    function abort_if($boolean, $code, $message = '', $headers = []) {
        if ($boolean) {
            abort($code, $message, $headers);
        }
    }
}

if (!function_exists('abort_unless')) {
    /**
     * Throw an HTTP exception unless condition is true
     */
    function abort_unless($boolean, $code, $message = '', $headers = []) {
        if (!$boolean) {
            abort($code, $message, $headers);
        }
    }
}
