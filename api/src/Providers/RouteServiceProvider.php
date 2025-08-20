<?php

namespace App\Providers;

use App\Application;
use App\Http\Router;

class RouteServiceProvider extends ServiceProvider
{
    public function register(Application $app)
    {
        $app->singleton('router', function() {
            return new Router();
        });
    }
}
