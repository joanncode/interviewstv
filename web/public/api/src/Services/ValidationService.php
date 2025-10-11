<?php

namespace App\Services;

class ValidationService
{
    private $errors = [];
    private $rules = [];
    private $customMessages = [];
    
    public function __construct()
    {
        $this->setupDefaultRules();
    }
    
    /**
     * Validate data against rules
     */
    public function validate($data, $rules, $messages = [])
    {
        $this->errors = [];
        $this->customMessages = $messages;
        
        foreach ($rules as $field => $fieldRules) {
            $value = $this->getValue($data, $field);
            $this->validateField($field, $value, $fieldRules);
        }
        
        return empty($this->errors);
    }
    
    /**
     * Get validation errors
     */
    public function getErrors()
    {
        return $this->errors;
    }
    
    /**
     * Get first error for a field
     */
    public function getFirstError($field = null)
    {
        if ($field) {
            return isset($this->errors[$field]) ? $this->errors[$field][0] : null;
        }
        
        foreach ($this->errors as $fieldErrors) {
            return $fieldErrors[0];
        }
        
        return null;
    }
    
    /**
     * Validate a single field
     */
    private function validateField($field, $value, $rules)
    {
        $ruleList = is_string($rules) ? explode('|', $rules) : $rules;
        
        foreach ($ruleList as $rule) {
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
     * Get value from data array using dot notation
     */
    private function getValue($data, $key)
    {
        if (strpos($key, '.') === false) {
            return isset($data[$key]) ? $data[$key] : null;
        }
        
        $keys = explode('.', $key);
        $value = $data;
        
        foreach ($keys as $k) {
            if (!is_array($value) || !isset($value[$k])) {
                return null;
            }
            $value = $value[$k];
        }
        
        return $value;
    }
    
    /**
     * Get default error message
     */
    private function getDefaultMessage($rule, $field, $parameters)
    {
        $customKey = "{$field}.{$rule}";
        if (isset($this->customMessages[$customKey])) {
            return $this->customMessages[$customKey];
        }
        
        if (isset($this->customMessages[$rule])) {
            return str_replace(':field', $field, $this->customMessages[$rule]);
        }
        
        $messages = [
            'required' => "The {$field} field is required",
            'email' => "The {$field} must be a valid email address",
            'min' => "The {$field} must be at least {$parameters[0]} characters",
            'max' => "The {$field} may not be greater than {$parameters[0]} characters",
            'numeric' => "The {$field} must be a number",
            'integer' => "The {$field} must be an integer",
            'alpha' => "The {$field} may only contain letters",
            'alpha_num' => "The {$field} may only contain letters and numbers",
            'url' => "The {$field} must be a valid URL",
            'confirmed' => "The {$field} confirmation does not match",
            'unique' => "The {$field} has already been taken",
            'exists' => "The selected {$field} is invalid",
            'in' => "The selected {$field} is invalid",
            'not_in' => "The selected {$field} is invalid",
            'regex' => "The {$field} format is invalid",
            'date' => "The {$field} is not a valid date",
            'before' => "The {$field} must be a date before {$parameters[0]}",
            'after' => "The {$field} must be a date after {$parameters[0]}",
            'file' => "The {$field} must be a file",
            'image' => "The {$field} must be an image",
            'mimes' => "The {$field} must be a file of type: " . implode(', ', $parameters),
            'max_file_size' => "The {$field} may not be greater than {$parameters[0]} kilobytes"
        ];
        
        return isset($messages[$rule]) ? $messages[$rule] : "The {$field} is invalid";
    }
    
    /**
     * Setup default validation rules
     */
    private function setupDefaultRules()
    {
        $this->rules = [
            'required' => function($value) {
                return !empty($value) || $value === '0' || $value === 0;
            },
            
            'email' => function($value) {
                if (empty($value)) return true;
                return filter_var($value, FILTER_VALIDATE_EMAIL) !== false;
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
            
            'url' => function($value) {
                if (empty($value)) return true;
                return filter_var($value, FILTER_VALIDATE_URL) !== false;
            },
            
            'confirmed' => function($value, $params, $field, $data = null) {
                if (empty($value)) return true;
                $confirmField = $field . '_confirmation';
                return isset($data[$confirmField]) && $value === $data[$confirmField];
            },
            
            'unique' => function($value, $params, $field) {
                if (empty($value)) return true;
                $table = $params[0];
                $column = isset($params[1]) ? $params[1] : $field;
                $except = isset($params[2]) ? $params[2] : null;
                
                return $this->checkUnique($table, $column, $value, $except);
            },
            
            'exists' => function($value, $params, $field) {
                if (empty($value)) return true;
                $table = $params[0];
                $column = isset($params[1]) ? $params[1] : $field;
                
                return $this->checkExists($table, $column, $value);
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
            
            'before' => function($value, $params) {
                if (empty($value)) return true;
                $beforeDate = strtotime($params[0]);
                $valueDate = strtotime($value);
                return $valueDate !== false && $beforeDate !== false && $valueDate < $beforeDate;
            },
            
            'after' => function($value, $params) {
                if (empty($value)) return true;
                $afterDate = strtotime($params[0]);
                $valueDate = strtotime($value);
                return $valueDate !== false && $afterDate !== false && $valueDate > $afterDate;
            },
            
            'file' => function($value) {
                return isset($value['tmp_name']) && is_uploaded_file($value['tmp_name']);
            },
            
            'image' => function($value) {
                if (!isset($value['tmp_name']) || !is_uploaded_file($value['tmp_name'])) {
                    return false;
                }
                
                $imageInfo = getimagesize($value['tmp_name']);
                return $imageInfo !== false;
            },
            
            'mimes' => function($value, $params) {
                if (!isset($value['tmp_name']) || !is_uploaded_file($value['tmp_name'])) {
                    return false;
                }
                
                $finfo = finfo_open(FILEINFO_MIME_TYPE);
                $mimeType = finfo_file($finfo, $value['tmp_name']);
                finfo_close($finfo);
                
                $allowedMimes = [
                    'jpg' => 'image/jpeg',
                    'jpeg' => 'image/jpeg',
                    'png' => 'image/png',
                    'gif' => 'image/gif',
                    'pdf' => 'application/pdf',
                    'doc' => 'application/msword',
                    'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                ];
                
                foreach ($params as $extension) {
                    if (isset($allowedMimes[$extension]) && $allowedMimes[$extension] === $mimeType) {
                        return true;
                    }
                }
                
                return false;
            },
            
            'max_file_size' => function($value, $params) {
                if (!isset($value['size'])) return false;
                $maxSize = (int) $params[0] * 1024; // Convert KB to bytes
                return $value['size'] <= $maxSize;
            }
        ];
    }
    
    /**
     * Check if value is unique in database
     */
    private function checkUnique($table, $column, $value, $except = null)
    {
        try {
            $pdo = $this->getDatabase();
            
            $sql = "SELECT COUNT(*) FROM `{$table}` WHERE `{$column}` = ?";
            $params = [$value];
            
            if ($except) {
                $sql .= " AND id != ?";
                $params[] = $except;
            }
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            return $stmt->fetchColumn() == 0;
            
        } catch (\Exception $e) {
            return false;
        }
    }
    
    /**
     * Check if value exists in database
     */
    private function checkExists($table, $column, $value)
    {
        try {
            $pdo = $this->getDatabase();
            
            $sql = "SELECT COUNT(*) FROM `{$table}` WHERE `{$column}` = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$value]);
            
            return $stmt->fetchColumn() > 0;
            
        } catch (\Exception $e) {
            return false;
        }
    }
    
    /**
     * Get database connection
     */
    private function getDatabase()
    {
        // This would typically be injected or retrieved from a container
        $config = config('database.connections.mysql');
        
        return new \PDO(
            "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}",
            $config['username'],
            $config['password'],
            $config['options']
        );
    }
    
    /**
     * Add custom validation rule
     */
    public function addRule($name, $callback)
    {
        $this->rules[$name] = $callback;
    }
    
    /**
     * Quick validation methods
     */
    public static function email($email)
    {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
    
    public static function url($url)
    {
        return filter_var($url, FILTER_VALIDATE_URL) !== false;
    }
    
    public static function alphaNumeric($value)
    {
        return ctype_alnum($value);
    }
    
    public static function strongPassword($password)
    {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
        return preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/', $password);
    }
}
