<?php

namespace App\Services;

class SecureInputValidator
{
    private $securityValidator;
    private $errors = [];
    private $rules = [];

    public function __construct(SecurityValidationService $securityValidator = null)
    {
        $this->securityValidator = $securityValidator ?: new SecurityValidationService();
        $this->initializeRules();
    }

    /**
     * Validate and sanitize input data
     */
    public function validate($data, $rules, $sanitize = true)
    {
        $this->errors = [];
        $validatedData = [];

        foreach ($rules as $field => $fieldRules) {
            $value = $this->getValue($data, $field);
            
            // Sanitize input first if enabled
            if ($sanitize && $value !== null) {
                try {
                    $value = $this->securityValidator->sanitizeInput($value, $this->getFieldType($fieldRules));
                } catch (\Exception $e) {
                    $this->addError($field, 'Invalid input: ' . $e->getMessage());
                    continue;
                }
            }

            // Apply validation rules
            $this->validateField($field, $value, $fieldRules);
            
            // Store validated value
            if (!$this->hasError($field)) {
                $validatedData[$field] = $value;
            }
        }

        return [
            'valid' => empty($this->errors),
            'data' => $validatedData,
            'errors' => $this->errors
        ];
    }

    /**
     * Validate a single field
     */
    private function validateField($field, $value, $rules)
    {
        if (!is_array($rules)) {
            $rules = explode('|', $rules);
        }

        foreach ($rules as $rule) {
            $this->applyRule($field, $value, $rule);
        }
    }

    /**
     * Apply a validation rule
     */
    private function applyRule($field, $value, $rule)
    {
        if (is_string($rule)) {
            $parts = explode(':', $rule, 2);
            $ruleName = $parts[0];
            $parameters = isset($parts[1]) ? explode(',', $parts[1]) : [];
        } else {
            $ruleName = $rule;
            $parameters = [];
        }

        if (!isset($this->rules[$ruleName])) {
            throw new \InvalidArgumentException("Validation rule '{$ruleName}' not found");
        }

        $ruleFunction = $this->rules[$ruleName];
        $result = $ruleFunction($value, $parameters, $field);

        if ($result !== true) {
            $this->addError($field, $result ?: $this->getDefaultMessage($ruleName, $field, $parameters));
        }
    }

    /**
     * Initialize validation rules
     */
    private function initializeRules()
    {
        $this->rules = [
            'required' => function($value) {
                return !empty($value) || $value === '0' || $value === 0 || $value === false;
            },

            'email' => function($value) {
                if (empty($value)) return true;
                return filter_var($value, FILTER_VALIDATE_EMAIL) !== false;
            },

            'secure_email' => function($value) {
                if (empty($value)) return true;
                try {
                    $this->securityValidator->sanitizeInput($value, 'email');
                    return true;
                } catch (\Exception $e) {
                    return $e->getMessage();
                }
            },

            'url' => function($value) {
                if (empty($value)) return true;
                try {
                    $this->securityValidator->sanitizeInput($value, 'url');
                    return true;
                } catch (\Exception $e) {
                    return $e->getMessage();
                }
            },

            'min' => function($value, $params) {
                if (empty($value)) return true;
                $min = (int) $params[0];
                return is_string($value) ? strlen($value) >= $min : $value >= $min;
            },

            'max' => function($value, $params) {
                if (empty($value)) return true;
                $max = (int) $params[0];
                return is_string($value) ? strlen($value) <= $max : $value <= $max;
            },

            'numeric' => function($value) {
                if (empty($value)) return true;
                return is_numeric($value);
            },

            'integer' => function($value) {
                if (empty($value)) return true;
                return filter_var($value, FILTER_VALIDATE_INT) !== false;
            },

            'alpha' => function($value) {
                if (empty($value)) return true;
                return ctype_alpha($value);
            },

            'alpha_num' => function($value) {
                if (empty($value)) return true;
                return ctype_alnum($value);
            },

            'alpha_dash' => function($value) {
                if (empty($value)) return true;
                return preg_match('/^[a-zA-Z0-9_-]+$/', $value);
            },

            'strong_password' => function($value) {
                if (empty($value)) return true;
                // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
                return preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/', $value);
            },

            'safe_filename' => function($value) {
                if (empty($value)) return true;
                try {
                    $this->securityValidator->sanitizeInput($value, 'filename');
                    return true;
                } catch (\Exception $e) {
                    return $e->getMessage();
                }
            },

            'no_sql_injection' => function($value) {
                if (empty($value)) return true;
                try {
                    $this->securityValidator->sanitizeInput($value, 'sql');
                    return true;
                } catch (\Exception $e) {
                    return 'Input contains potentially dangerous content';
                }
            },

            'safe_html' => function($value) {
                if (empty($value)) return true;
                try {
                    $this->securityValidator->sanitizeInput($value, 'html');
                    return true;
                } catch (\Exception $e) {
                    return $e->getMessage();
                }
            },

            'json' => function($value) {
                if (empty($value)) return true;
                json_decode($value);
                return json_last_error() === JSON_ERROR_NONE;
            },

            'secure_json' => function($value) {
                if (empty($value)) return true;
                try {
                    $this->securityValidator->sanitizeInput($value, 'json');
                    return true;
                } catch (\Exception $e) {
                    return $e->getMessage();
                }
            },

            'in' => function($value, $params) {
                if (empty($value)) return true;
                return in_array($value, $params);
            },

            'not_in' => function($value, $params) {
                if (empty($value)) return true;
                return !in_array($value, $params);
            },

            'regex' => function($value, $params) {
                if (empty($value)) return true;
                return preg_match($params[0], $value);
            },

            'date' => function($value) {
                if (empty($value)) return true;
                return strtotime($value) !== false;
            },

            'ip' => function($value) {
                if (empty($value)) return true;
                return filter_var($value, FILTER_VALIDATE_IP) !== false;
            },

            'boolean' => function($value) {
                if ($value === null || $value === '') return true;
                return in_array($value, [true, false, 1, 0, '1', '0', 'true', 'false'], true);
            }
        ];
    }

    /**
     * Get field type from rules for sanitization
     */
    private function getFieldType($rules)
    {
        if (!is_array($rules)) {
            $rules = explode('|', $rules);
        }

        foreach ($rules as $rule) {
            $ruleName = explode(':', $rule)[0];
            switch ($ruleName) {
                case 'email':
                case 'secure_email':
                    return 'email';
                case 'url':
                    return 'url';
                case 'safe_filename':
                    return 'filename';
                case 'no_sql_injection':
                    return 'sql';
                case 'safe_html':
                    return 'html';
                case 'json':
                case 'secure_json':
                    return 'json';
            }
        }

        return 'general';
    }

    /**
     * Get value from data array
     */
    private function getValue($data, $field)
    {
        if (strpos($field, '.') !== false) {
            $keys = explode('.', $field);
            $value = $data;
            
            foreach ($keys as $key) {
                if (!is_array($value) || !isset($value[$key])) {
                    return null;
                }
                $value = $value[$key];
            }
            
            return $value;
        }

        return isset($data[$field]) ? $data[$field] : null;
    }

    /**
     * Add validation error
     */
    private function addError($field, $message)
    {
        if (!isset($this->errors[$field])) {
            $this->errors[$field] = [];
        }
        $this->errors[$field][] = $message;
    }

    /**
     * Check if field has error
     */
    private function hasError($field)
    {
        return isset($this->errors[$field]);
    }

    /**
     * Get default error message
     */
    private function getDefaultMessage($rule, $field, $parameters)
    {
        $messages = [
            'required' => "The {$field} field is required.",
            'email' => "The {$field} must be a valid email address.",
            'url' => "The {$field} must be a valid URL.",
            'min' => "The {$field} must be at least {$parameters[0]} characters.",
            'max' => "The {$field} may not be greater than {$parameters[0]} characters.",
            'numeric' => "The {$field} must be a number.",
            'integer' => "The {$field} must be an integer.",
            'alpha' => "The {$field} may only contain letters.",
            'alpha_num' => "The {$field} may only contain letters and numbers.",
            'alpha_dash' => "The {$field} may only contain letters, numbers, dashes and underscores.",
            'strong_password' => "The {$field} must be at least 8 characters and contain uppercase, lowercase, number and special character.",
            'in' => "The selected {$field} is invalid.",
            'not_in' => "The selected {$field} is invalid.",
            'date' => "The {$field} is not a valid date.",
            'ip' => "The {$field} must be a valid IP address.",
            'boolean' => "The {$field} field must be true or false."
        ];

        return $messages[$rule] ?? "The {$field} field is invalid.";
    }

    /**
     * Get all errors
     */
    public function getErrors()
    {
        return $this->errors;
    }

    /**
     * Check if validation passed
     */
    public function passes()
    {
        return empty($this->errors);
    }

    /**
     * Check if validation failed
     */
    public function fails()
    {
        return !empty($this->errors);
    }
}
