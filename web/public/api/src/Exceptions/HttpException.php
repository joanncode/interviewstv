<?php

namespace App\Exceptions;

use Exception;

class HttpException extends Exception
{
    protected $statusCode;
    protected $headers;
    
    public function __construct($statusCode, $message = '', Exception $previous = null, $headers = [])
    {
        $this->statusCode = $statusCode;
        $this->headers = $headers;
        
        parent::__construct($message, 0, $previous);
    }
    
    public function getStatusCode()
    {
        return $this->statusCode;
    }
    
    public function getHeaders()
    {
        return $this->headers;
    }
}
