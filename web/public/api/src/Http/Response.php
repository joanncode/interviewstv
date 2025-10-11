<?php

namespace App\Http;

class Response
{
    protected $content;
    protected $statusCode;
    protected $headers;
    
    public function __construct($content = '', $statusCode = 200, $headers = [])
    {
        $this->content = $content;
        $this->statusCode = $statusCode;
        $this->headers = $headers;
    }
    
    public function send()
    {
        // Set status code
        http_response_code($this->statusCode);
        
        // Set headers
        foreach ($this->headers as $name => $value) {
            header("{$name}: {$value}");
        }
        
        // Set content type if not already set
        if (!isset($this->headers['Content-Type'])) {
            header('Content-Type: application/json');
        }
        
        // Send content
        if (is_array($this->content) || is_object($this->content)) {
            echo json_encode($this->content);
        } else {
            echo $this->content;
        }
        
        return $this;
    }
    
    public function header($name, $value)
    {
        $this->headers[$name] = $value;
        return $this;
    }
    
    public function withHeaders($headers)
    {
        $this->headers = array_merge($this->headers, $headers);
        return $this;
    }
    
    public function getContent()
    {
        return $this->content;
    }
    
    public function getStatusCode()
    {
        return $this->statusCode;
    }
    
    public function getHeaders()
    {
        return $this->headers;
    }
    
    // Static factory methods
    public static function json($data, $statusCode = 200, $headers = [])
    {
        return new static($data, $statusCode, array_merge($headers, [
            'Content-Type' => 'application/json'
        ]));
    }
    
    public static function success($data = null, $message = 'Success', $statusCode = 200)
    {
        return static::json([
            'success' => true,
            'message' => $message,
            'data' => $data
        ], $statusCode);
    }
    
    public static function error($message = 'Error', $statusCode = 400, $errors = null)
    {
        $response = [
            'success' => false,
            'message' => $message
        ];
        
        if ($errors !== null) {
            $response['errors'] = $errors;
        }
        
        return static::json($response, $statusCode);
    }
    
    public static function unauthorized($message = 'Unauthorized')
    {
        return static::error($message, 401);
    }
    
    public static function forbidden($message = 'Forbidden')
    {
        return static::error($message, 403);
    }
    
    public static function notFound($message = 'Not found')
    {
        return static::error($message, 404);
    }
    
    public static function validationError($errors, $message = 'Validation failed')
    {
        return static::error($message, 422, $errors);
    }
    
    public static function paginated($data, $total, $page, $limit, $message = 'Success')
    {
        $totalPages = ceil($total / $limit);
        
        return static::success([
            'items' => $data,
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1
            ]
        ], $message);
    }
}
