<?php

namespace App\Providers;

use App\Application;
use PDO;

class DatabaseServiceProvider extends ServiceProvider
{
    public function register(Application $app)
    {
        $app->singleton('db', function() {
            $config = config('database.connections.mysql');
            
            $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
            
            return new PDO($dsn, $config['username'], $config['password'], $config['options']);
        });
    }
}
