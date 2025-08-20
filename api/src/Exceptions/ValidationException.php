<?php

namespace App\Exceptions;

use Exception;

class ValidationException extends Exception
{
    protected $errors;
    
    public function __construct($errors, $message = 'Validation failed')
    {
        $this->errors = $errors;
        parent::__construct($message);
    }
    
    public function getErrors()
    {
        return $this->errors;
    }
}
