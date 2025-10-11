<?php

require_once __DIR__ . '/vendor/autoload.php';

// Simple WebSocket server using ReactPHP
use React\EventLoop\Loop;
use React\Socket\SocketServer;
use React\Stream\WritableResourceStream;
use Ratchet\RFC6455\Messaging\MessageInterface;

// Set up error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set timezone
date_default_timezone_set('UTC');

echo "Starting Interviews.tv WebSocket Chat Server...\n";
echo "Timestamp: " . date('Y-m-d H:i:s') . "\n";
echo "PHP Version: " . PHP_VERSION . "\n";
echo "Memory Limit: " . ini_get('memory_limit') . "\n";

try {
    // Create chat server instance
    $chatServer = new ChatServer();
    
    // Create WebSocket server
    $server = IoServer::factory(
        new HttpServer(
            new WsServer($chatServer)
        ),
        8080, // Port
        '0.0.0.0' // Listen on all interfaces
    );
    
    echo "WebSocket server started successfully!\n";
    echo "Listening on: ws://0.0.0.0:8080\n";
    echo "Press Ctrl+C to stop the server\n";
    echo str_repeat("-", 50) . "\n";
    
    // Set up signal handlers for graceful shutdown
    if (function_exists('pcntl_signal')) {
        pcntl_signal(SIGTERM, function() use ($server) {
            echo "\nReceived SIGTERM, shutting down gracefully...\n";
            $server->loop->stop();
        });
        
        pcntl_signal(SIGINT, function() use ($server) {
            echo "\nReceived SIGINT, shutting down gracefully...\n";
            $server->loop->stop();
        });
    }
    
    // Start the server
    $server->run();
    
} catch (Exception $e) {
    echo "Error starting WebSocket server: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
