<?php

namespace App\Services;

/**
 * URL Parameter Validator with security and type checking
 */
class UrlParameterValidator
{
    private $securityValidator;
    private $patterns;
    private $maxLengths;

    public function __construct()
    {
        $this->securityValidator = new SecurityValidationService();
        $this->initializePatterns();
        $this->initializeMaxLengths();
    }

    /**
     * Validate URL parameters against defined rules
     */
    public function validateParameters($parameters, $route)
    {
        $validated = [];
        $errors = [];

        foreach ($parameters as $name => $value) {
            try {
                $validated[$name] = $this->validateParameter($name, $value, $route);
            } catch (\InvalidArgumentException $e) {
                $errors[$name] = $e->getMessage();
            }
        }

        if (!empty($errors)) {
            throw new \InvalidArgumentException('Parameter validation failed: ' . json_encode($errors));
        }

        return $validated;
    }

    /**
     * Validate a single parameter
     */
    public function validateParameter($name, $value, $route = null)
    {
        // Check for null or empty values
        if ($value === null || $value === '') {
            if ($this->isRequired($name, $route)) {
                throw new \InvalidArgumentException("Parameter '{$name}' is required");
            }
            return $value;
        }

        // Check maximum length
        if (isset($this->maxLengths[$name]) && strlen($value) > $this->maxLengths[$name]) {
            throw new \InvalidArgumentException("Parameter '{$name}' exceeds maximum length");
        }

        // Apply security validation
        $value = $this->securityValidator->sanitizeInput($value, $this->getParameterType($name));

        // Apply pattern validation
        if (isset($this->patterns[$name])) {
            if (!preg_match($this->patterns[$name], $value)) {
                throw new \InvalidArgumentException("Parameter '{$name}' has invalid format");
            }
        }

        // Apply type-specific validation
        return $this->validateByType($name, $value);
    }

    /**
     * Initialize validation patterns
     */
    private function initializePatterns()
    {
        $this->patterns = [
            'id' => '/^[1-9]\d*$/',
            'slug' => '/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
            'username' => '/^[a-zA-Z0-9._-]{3,30}$/',
            'email' => '/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/',
            'category' => '/^[a-z0-9-]+$/',
            'tag' => '/^[a-z0-9-]+$/',
            'sort' => '/^(asc|desc)$/',
            'order_by' => '/^[a-z_]+$/',
            'page' => '/^[1-9]\d*$/',
            'limit' => '/^[1-9]\d*$/',
            'status' => '/^(active|inactive|pending|published|draft|archived)$/',
            'type' => '/^[a-z_]+$/',
            'format' => '/^(json|xml|csv|html)$/',
            'lang' => '/^[a-z]{2}(-[A-Z]{2})?$/',
            'timezone' => '/^[A-Za-z_\/]+$/',
            'date' => '/^\d{4}-\d{2}-\d{2}$/',
            'datetime' => '/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/',
            'uuid' => '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i',
            'token' => '/^[a-zA-Z0-9_-]+$/',
            'hash' => '/^[a-f0-9]{32,128}$/',
            'url' => '/^https?:\/\/[^\s\/$.?#].[^\s]*$/i',
            'phone' => '/^[\+]?[0-9\s\-\(\)]{7,20}$/',
            'postal_code' => '/^[a-zA-Z0-9\s-]{3,10}$/',
            'color' => '/^#[0-9a-f]{6}$/i',
            'version' => '/^\d+\.\d+(\.\d+)?$/',
            'ip' => '/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/',
            'search' => '/^[^<>"\'\x00-\x1f\x7f]+$/',
            'filename' => '/^[a-zA-Z0-9._-]+\.[a-zA-Z0-9]{1,10}$/'
        ];
    }

    /**
     * Initialize maximum lengths
     */
    private function initializeMaxLengths()
    {
        $this->maxLengths = [
            'id' => 20,
            'slug' => 100,
            'username' => 30,
            'email' => 255,
            'category' => 50,
            'tag' => 50,
            'sort' => 4,
            'order_by' => 50,
            'page' => 10,
            'limit' => 3,
            'status' => 20,
            'type' => 50,
            'format' => 10,
            'lang' => 5,
            'timezone' => 50,
            'date' => 10,
            'datetime' => 19,
            'uuid' => 36,
            'token' => 255,
            'hash' => 128,
            'url' => 2048,
            'phone' => 20,
            'postal_code' => 10,
            'color' => 7,
            'version' => 20,
            'ip' => 15,
            'search' => 200,
            'filename' => 255,
            'title' => 255,
            'description' => 1000,
            'content' => 10000
        ];
    }

    /**
     * Get parameter type for sanitization
     */
    private function getParameterType($name)
    {
        $typeMap = [
            'id' => 'integer',
            'page' => 'integer',
            'limit' => 'integer',
            'email' => 'email',
            'url' => 'url',
            'slug' => 'slug',
            'username' => 'username',
            'phone' => 'phone',
            'search' => 'search',
            'filename' => 'filename'
        ];

        return $typeMap[$name] ?? 'string';
    }

    /**
     * Check if parameter is required
     */
    private function isRequired($name, $route)
    {
        $requiredParams = [
            'id' => ['show', 'edit', 'update', 'delete'],
            'slug' => ['show'],
            'username' => ['profile']
        ];

        if (!isset($requiredParams[$name])) {
            return false;
        }

        return in_array($route, $requiredParams[$name]);
    }

    /**
     * Validate by specific type
     */
    private function validateByType($name, $value)
    {
        switch ($name) {
            case 'id':
            case 'page':
            case 'limit':
                $intValue = (int) $value;
                if ($intValue <= 0) {
                    throw new \InvalidArgumentException("Parameter '{$name}' must be a positive integer");
                }
                if ($name === 'limit' && $intValue > 100) {
                    throw new \InvalidArgumentException("Parameter 'limit' cannot exceed 100");
                }
                return $intValue;

            case 'email':
                if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
                    throw new \InvalidArgumentException("Parameter 'email' is not a valid email address");
                }
                return strtolower($value);

            case 'url':
                if (!filter_var($value, FILTER_VALIDATE_URL)) {
                    throw new \InvalidArgumentException("Parameter 'url' is not a valid URL");
                }
                return $value;

            case 'date':
                $date = \DateTime::createFromFormat('Y-m-d', $value);
                if (!$date || $date->format('Y-m-d') !== $value) {
                    throw new \InvalidArgumentException("Parameter 'date' is not a valid date");
                }
                return $value;

            case 'datetime':
                $datetime = \DateTime::createFromFormat('Y-m-d H:i:s', $value);
                if (!$datetime || $datetime->format('Y-m-d H:i:s') !== $value) {
                    throw new \InvalidArgumentException("Parameter 'datetime' is not a valid datetime");
                }
                return $value;

            case 'uuid':
                if (!$this->isValidUuid($value)) {
                    throw new \InvalidArgumentException("Parameter 'uuid' is not a valid UUID");
                }
                return strtolower($value);

            case 'ip':
                if (!filter_var($value, FILTER_VALIDATE_IP)) {
                    throw new \InvalidArgumentException("Parameter 'ip' is not a valid IP address");
                }
                return $value;

            case 'slug':
                return strtolower($value);

            case 'category':
            case 'tag':
            case 'status':
            case 'type':
            case 'format':
                return strtolower($value);

            case 'sort':
                return strtolower($value);

            case 'search':
                // Additional search query validation
                if (strlen(trim($value)) < 2) {
                    throw new \InvalidArgumentException("Search query must be at least 2 characters");
                }
                return trim($value);

            default:
                return $value;
        }
    }

    /**
     * Validate UUID format
     */
    private function isValidUuid($uuid)
    {
        return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $uuid);
    }

    /**
     * Validate query string parameters
     */
    public function validateQueryString($queryString)
    {
        if (empty($queryString)) {
            return [];
        }

        parse_str($queryString, $params);
        $validated = [];

        foreach ($params as $name => $value) {
            // Skip empty values
            if ($value === '' || $value === null) {
                continue;
            }

            try {
                $validated[$name] = $this->validateParameter($name, $value);
            } catch (\InvalidArgumentException $e) {
                // Log invalid parameter but don't fail the request
                error_log("Invalid query parameter '{$name}': " . $e->getMessage());
            }
        }

        return $validated;
    }

    /**
     * Sanitize and validate path segments
     */
    public function validatePathSegments($segments)
    {
        $validated = [];

        foreach ($segments as $index => $segment) {
            if (empty($segment)) {
                continue;
            }

            // Basic security check
            if (strpos($segment, '..') !== false || strpos($segment, '/') !== false) {
                throw new \InvalidArgumentException("Invalid path segment at position {$index}");
            }

            // Length check
            if (strlen($segment) > 100) {
                throw new \InvalidArgumentException("Path segment too long at position {$index}");
            }

            // Character validation
            if (!preg_match('/^[a-zA-Z0-9._-]+$/', $segment)) {
                throw new \InvalidArgumentException("Invalid characters in path segment at position {$index}");
            }

            $validated[] = $segment;
        }

        return $validated;
    }

    /**
     * Get validation rules for a parameter
     */
    public function getValidationRules($parameterName)
    {
        return [
            'pattern' => $this->patterns[$parameterName] ?? null,
            'max_length' => $this->maxLengths[$parameterName] ?? null,
            'type' => $this->getParameterType($parameterName),
            'required' => false // This would need route context to determine
        ];
    }
}
