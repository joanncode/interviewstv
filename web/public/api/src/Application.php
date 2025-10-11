<?php

namespace App;

use App\Http\Request;
use App\Http\Response;
use App\Http\Router;
use App\Exceptions\HttpException;

class Application
{
    protected $providers = [];
    protected $bindings = [];
    protected $instances = [];
    
    public function __construct()
    {
        $this->instances['app'] = $this;
    }
    
    public function register($provider)
    {
        $this->providers[] = $provider;
        $provider->register($this);
        return $this;
    }
    
    public function bind($abstract, $concrete = null)
    {
        if (is_null($concrete)) {
            $concrete = $abstract;
        }
        
        $this->bindings[$abstract] = $concrete;
    }
    
    public function singleton($abstract, $concrete = null)
    {
        $this->bind($abstract, $concrete);
    }
    
    public function instance($abstract, $instance)
    {
        $this->instances[$abstract] = $instance;
    }
    
    public function make($abstract)
    {
        if (isset($this->instances[$abstract])) {
            return $this->instances[$abstract];
        }
        
        if (isset($this->bindings[$abstract])) {
            $concrete = $this->bindings[$abstract];
            
            if (is_callable($concrete)) {
                $instance = $concrete($this);
            } elseif (is_string($concrete)) {
                $instance = new $concrete();
            } else {
                $instance = $concrete;
            }
            
            $this->instances[$abstract] = $instance;
            return $instance;
        }
        
        // Try to instantiate the class directly
        if (class_exists($abstract)) {
            $instance = new $abstract();
            $this->instances[$abstract] = $instance;
            return $instance;
        }
        
        throw new \Exception("Unable to resolve [{$abstract}]");
    }
    
    public function handle()
    {
        try {
            // Get the request
            $request = Request::capture();
            $this->instance('request', $request);
            
            // Get the router
            $router = require base_path('api/routes/api.php');
            $this->instance('router', $router);
            
            // Dispatch the request
            $response = $router->dispatch($request);
            
            // Ensure we have a Response object
            if (!$response instanceof Response) {
                $response = new Response($response);
            }
            
            return $response;
            
        } catch (HttpException $e) {
            return new Response([
                'success' => false,
                'message' => $e->getMessage(),
                'code' => $e->getStatusCode()
            ], $e->getStatusCode());
            
        } catch (\Exception $e) {
            if (config('app.debug')) {
                return new Response([
                    'success' => false,
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'trace' => $e->getTraceAsString()
                ], 500);
            }
            
            return new Response([
                'success' => false,
                'message' => 'Internal Server Error'
            ], 500);
        }
    }
    
    public function offsetExists($key)
    {
        return isset($this->bindings[$key]) || isset($this->instances[$key]);
    }
    
    public function offsetGet($key)
    {
        return $this->make($key);
    }
    
    public function offsetSet($key, $value)
    {
        $this->bind($key, $value);
    }
    
    public function offsetUnset($key)
    {
        unset($this->bindings[$key], $this->instances[$key]);
    }
}

// Global app function
if (!function_exists('app')) {
    function app($abstract = null)
    {
        static $app = null;
        
        if (is_null($app)) {
            $app = new Application();
        }
        
        if (is_null($abstract)) {
            return $app;
        }
        
        return $app->make($abstract);
    }
}
