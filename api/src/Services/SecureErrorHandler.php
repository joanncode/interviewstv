<?php

namespace App\Services;

use App\Config\SecurityConfig;

/**
 * Secure Error Handler that prevents information leakage
 */
class SecureErrorHandler
{
    private $config;
    private $logService;
    private $isDevelopment;
    private $securityValidator;

    public function __construct($logService = null)
    {
        $this->config = SecurityConfig::getConfigWithOverrides();
        $this->logService = $logService;
        $this->isDevelopment = ($_ENV['APP_ENV'] ?? 'production') === 'development';
        $this->securityValidator = new SecurityValidationService();
    }

    /**
     * Handle exceptions securely
     */
    public function handleException(\Throwable $exception, $request = null)
    {
        // Log the full exception details
        $this->logException($exception, $request);

        // Determine response based on exception type and environment
        $response = $this->createSecureResponse($exception);

        // Send appropriate headers
        $this->sendSecurityHeaders();

        // Return sanitized response
        return $response;
    }

    /**
     * Handle PHP errors securely
     */
    public function handleError($severity, $message, $file, $line)
    {
        // Convert to exception for consistent handling
        $exception = new \ErrorException($message, 0, $severity, $file, $line);
        return $this->handleException($exception);
    }

    /**
     * Create secure response that doesn't leak sensitive information
     */
    private function createSecureResponse(\Throwable $exception)
    {
        $statusCode = $this->getStatusCode($exception);
        $errorCode = $this->getErrorCode($exception);
        $message = $this->getSafeMessage($exception);

        $response = [
            'success' => false,
            'error' => [
                'code' => $errorCode,
                'message' => $message,
                'timestamp' => time()
            ]
        ];

        // Add debug info only in development
        if ($this->isDevelopment) {
            $response['debug'] = [
                'exception' => get_class($exception),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
                'trace' => $this->sanitizeStackTrace($exception->getTrace())
            ];
        }

        http_response_code($statusCode);
        header('Content-Type: application/json');

        return json_encode($response, JSON_UNESCAPED_SLASHES);
    }

    /**
     * Get appropriate HTTP status code
     */
    private function getStatusCode(\Throwable $exception)
    {
        if (method_exists($exception, 'getStatusCode')) {
            return $exception->getStatusCode();
        }

        switch (get_class($exception)) {
            case 'InvalidArgumentException':
                return 400;
            case 'UnauthorizedException':
                return 401;
            case 'ForbiddenException':
                return 403;
            case 'NotFoundException':
                return 404;
            case 'MethodNotAllowedException':
                return 405;
            case 'ValidationException':
                return 422;
            case 'RateLimitException':
                return 429;
            default:
                return 500;
        }
    }

    /**
     * Get safe error code
     */
    private function getErrorCode(\Throwable $exception)
    {
        $className = get_class($exception);
        $code = $exception->getCode();

        // Map exception types to safe error codes
        $errorCodes = [
            'InvalidArgumentException' => 'INVALID_INPUT',
            'UnauthorizedException' => 'UNAUTHORIZED',
            'ForbiddenException' => 'FORBIDDEN',
            'NotFoundException' => 'NOT_FOUND',
            'ValidationException' => 'VALIDATION_ERROR',
            'RateLimitException' => 'RATE_LIMITED',
            'DatabaseException' => 'DATABASE_ERROR',
            'FileUploadException' => 'UPLOAD_ERROR'
        ];

        return $errorCodes[$className] ?? 'INTERNAL_ERROR';
    }

    /**
     * Get safe error message
     */
    private function getSafeMessage(\Throwable $exception)
    {
        // In production, use generic messages for security
        if (!$this->isDevelopment) {
            $safeMessages = [
                400 => 'Bad Request',
                401 => 'Authentication required',
                403 => 'Access denied',
                404 => 'Resource not found',
                405 => 'Method not allowed',
                422 => 'Validation failed',
                429 => 'Too many requests',
                500 => 'Internal server error'
            ];

            $statusCode = $this->getStatusCode($exception);
            return $safeMessages[$statusCode] ?? 'An error occurred';
        }

        // In development, return actual message but sanitized
        return $this->sanitizeMessage($exception->getMessage());
    }

    /**
     * Sanitize error message to prevent information leakage
     */
    private function sanitizeMessage($message)
    {
        // Remove file paths
        $message = preg_replace('/\/[^\s]+\.php/', '[FILE]', $message);
        
        // Remove database connection strings
        $message = preg_replace('/mysql:host=[^;]+;/', 'mysql:host=[HOST];', $message);
        
        // Remove sensitive data patterns
        $sensitivePatterns = [
            '/password[=:]\s*[^\s]+/i' => 'password=[HIDDEN]',
            '/token[=:]\s*[^\s]+/i' => 'token=[HIDDEN]',
            '/key[=:]\s*[^\s]+/i' => 'key=[HIDDEN]',
            '/secret[=:]\s*[^\s]+/i' => 'secret=[HIDDEN]'
        ];

        foreach ($sensitivePatterns as $pattern => $replacement) {
            $message = preg_replace($pattern, $replacement, $message);
        }

        return $message;
    }

    /**
     * Sanitize stack trace
     */
    private function sanitizeStackTrace(array $trace)
    {
        $sanitized = [];
        
        foreach ($trace as $frame) {
            $sanitizedFrame = [
                'file' => isset($frame['file']) ? basename($frame['file']) : 'unknown',
                'line' => $frame['line'] ?? 0,
                'function' => $frame['function'] ?? 'unknown',
                'class' => $frame['class'] ?? null
            ];
            
            // Remove sensitive arguments
            if (isset($frame['args'])) {
                $sanitizedFrame['args'] = array_map(function($arg) {
                    if (is_string($arg) && strlen($arg) > 100) {
                        return '[LARGE_STRING]';
                    }
                    if (is_array($arg)) {
                        return '[ARRAY]';
                    }
                    if (is_object($arg)) {
                        return '[OBJECT:' . get_class($arg) . ']';
                    }
                    return $arg;
                }, $frame['args']);
            }
            
            $sanitized[] = $sanitizedFrame;
        }

        return array_slice($sanitized, 0, 10); // Limit trace depth
    }

    /**
     * Log exception with full details
     */
    private function logException(\Throwable $exception, $request = null)
    {
        $logData = [
            'exception' => get_class($exception),
            'message' => $exception->getMessage(),
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'code' => $exception->getCode(),
            'trace' => $exception->getTraceAsString(),
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            'request_uri' => $_SERVER['REQUEST_URI'] ?? 'unknown',
            'request_method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
            'timestamp' => date('Y-m-d H:i:s')
        ];

        // Add request data if available
        if ($request) {
            $logData['request_data'] = $this->sanitizeRequestData($request);
        }

        // Log to security service
        if ($this->securityValidator) {
            $this->securityValidator->logSecurityEvent('exception', $logData);
        }

        // Also log to error log
        error_log('Exception: ' . json_encode($logData));
    }

    /**
     * Sanitize request data for logging
     */
    private function sanitizeRequestData($request)
    {
        $data = [];
        
        if (is_array($request)) {
            $data = $request;
        } elseif (is_object($request) && method_exists($request, 'all')) {
            $data = $request->all();
        }

        // Remove sensitive fields
        $sensitiveFields = ['password', 'token', 'secret', 'key', 'csrf_token'];
        
        foreach ($sensitiveFields as $field) {
            if (isset($data[$field])) {
                $data[$field] = '[HIDDEN]';
            }
        }

        return $data;
    }

    /**
     * Send security headers
     */
    private function sendSecurityHeaders()
    {
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('X-XSS-Protection: 1; mode=block');
        header('Referrer-Policy: strict-origin-when-cross-origin');
        
        if (isset($_SERVER['HTTPS'])) {
            header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
        }
    }

    /**
     * Register error handlers
     */
    public function register()
    {
        set_exception_handler([$this, 'handleException']);
        set_error_handler([$this, 'handleError']);
        
        // Handle fatal errors
        register_shutdown_function(function() {
            $error = error_get_last();
            if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
                $this->handleError($error['type'], $error['message'], $error['file'], $error['line']);
            }
        });
    }
}
