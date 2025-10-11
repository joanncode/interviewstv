<?php

namespace App\Services;

use App\Models\User;

class Validator
{
    protected $data;
    protected $errors = [];
    
    public function __construct($data)
    {
        $this->data = $data;
    }
    
    public static function make($data)
    {
        return new static($data);
    }
    
    public function required($field, $message = null)
    {
        if (!isset($this->data[$field]) || empty(trim($this->data[$field]))) {
            $this->errors[$field] = $message ?? "The {$field} field is required.";
        }
        return $this;
    }
    
    public function email($field, $message = null)
    {
        if (isset($this->data[$field]) && !filter_var($this->data[$field], FILTER_VALIDATE_EMAIL)) {
            $this->errors[$field] = $message ?? "The {$field} field must be a valid email address.";
        }
        return $this;
    }
    
    public function min($field, $length, $message = null)
    {
        if (isset($this->data[$field]) && strlen($this->data[$field]) < $length) {
            $this->errors[$field] = $message ?? "The {$field} field must be at least {$length} characters.";
        }
        return $this;
    }
    
    public function max($field, $length, $message = null)
    {
        if (isset($this->data[$field]) && strlen($this->data[$field]) > $length) {
            $this->errors[$field] = $message ?? "The {$field} field must not exceed {$length} characters.";
        }
        return $this;
    }
    
    public function unique($field, $table, $column = null, $excludeId = null, $message = null)
    {
        if (!isset($this->data[$field])) {
            return $this;
        }
        
        $column = $column ?? $field;
        
        // For now, we'll handle specific cases
        if ($table === 'users') {
            if ($column === 'email') {
                $existingUser = User::findByEmail($this->data[$field]);
                if ($existingUser && (!$excludeId || $existingUser['id'] != $excludeId)) {
                    $this->errors[$field] = $message ?? "The {$field} has already been taken.";
                }
            } elseif ($column === 'username') {
                $existingUser = User::findByUsername($this->data[$field]);
                if ($existingUser && (!$excludeId || $existingUser['id'] != $excludeId)) {
                    $this->errors[$field] = $message ?? "The {$field} has already been taken.";
                }
            }
        }
        
        return $this;
    }
    
    public function in($field, $values, $message = null)
    {
        if (isset($this->data[$field]) && !in_array($this->data[$field], $values)) {
            $valuesList = implode(', ', $values);
            $this->errors[$field] = $message ?? "The {$field} field must be one of: {$valuesList}.";
        }
        return $this;
    }
    
    public function numeric($field, $message = null)
    {
        if (isset($this->data[$field]) && !is_numeric($this->data[$field])) {
            $this->errors[$field] = $message ?? "The {$field} field must be numeric.";
        }
        return $this;
    }
    
    public function url($field, $message = null)
    {
        if (isset($this->data[$field]) && !filter_var($this->data[$field], FILTER_VALIDATE_URL)) {
            $this->errors[$field] = $message ?? "The {$field} field must be a valid URL.";
        }
        return $this;
    }
    
    public function regex($field, $pattern, $message = null)
    {
        if (isset($this->data[$field]) && !preg_match($pattern, $this->data[$field])) {
            $this->errors[$field] = $message ?? "The {$field} field format is invalid.";
        }
        return $this;
    }
    
    public function username($field, $message = null)
    {
        return $this->regex($field, '/^[a-zA-Z0-9_-]{3,30}$/', 
            $message ?? "The {$field} field must be 3-30 characters and contain only letters, numbers, underscores, and hyphens.");
    }
    
    public function password($field, $message = null)
    {
        if (!isset($this->data[$field])) {
            return $this;
        }
        
        $password = $this->data[$field];
        $errors = [];
        
        if (strlen($password) < 8) {
            $errors[] = 'at least 8 characters';
        }
        
        if (!preg_match('/[A-Z]/', $password)) {
            $errors[] = 'one uppercase letter';
        }
        
        if (!preg_match('/[a-z]/', $password)) {
            $errors[] = 'one lowercase letter';
        }
        
        if (!preg_match('/[0-9]/', $password)) {
            $errors[] = 'one number';
        }
        
        if (!empty($errors)) {
            $this->errors[$field] = $message ?? "The {$field} field must contain " . implode(', ', $errors) . ".";
        }
        
        return $this;
    }
    
    public function confirmed($field, $message = null)
    {
        $confirmField = $field . '_confirmation';
        if (isset($this->data[$field]) && isset($this->data[$confirmField])) {
            if ($this->data[$field] !== $this->data[$confirmField]) {
                $this->errors[$field] = $message ?? "The {$field} confirmation does not match.";
            }
        }
        return $this;
    }
    
    public function fails()
    {
        return !empty($this->errors);
    }
    
    public function passes()
    {
        return empty($this->errors);
    }
    
    public function errors()
    {
        return $this->errors;
    }
    
    public function validate()
    {
        if ($this->fails()) {
            throw new \App\Exceptions\ValidationException($this->errors());
        }
        return true;
    }
}
