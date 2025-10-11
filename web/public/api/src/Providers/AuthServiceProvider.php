<?php

namespace App\Providers;

use App\Application;
use App\Services\AuthService;

class AuthServiceProvider extends ServiceProvider
{
    public function register(Application $app)
    {
        $app->singleton('auth', function() {
            return new AuthService();
        });
    }
}
