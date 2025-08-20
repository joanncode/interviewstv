<?php

namespace App\Providers;

use App\Application;

abstract class ServiceProvider
{
    protected $app;
    
    public function __construct(Application $app = null)
    {
        $this->app = $app;
    }
    
    abstract public function register(Application $app);
    
    public function boot(Application $app)
    {
        // Override in child classes if needed
    }
}
