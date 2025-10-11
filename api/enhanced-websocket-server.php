<?php

// Enhanced WebSocket Server with Broadcasting Support
require_once __DIR__ . '/src/Services/FileStorageService.php';

use InterviewsTV\Services\FileStorageService;

class EnhancedWebSocketServer {
    private $host = '127.0.0.1';
    private $port = 8080;
    private $broadcastPort = 8081;
    private $socket;
    private $broadcastSocket;
    private $clients = [];
    private $rooms = [];
    private $storage;
    private $running = true;
    
    public function __construct() {
        $this->storage = new FileStorageService();
    }
    
    public function start() {
        echo "Starting Enhanced WebSocket Server...\n";
        echo "WebSocket Port: {$this->port}\n";
        echo "Broadcast Port: {$this->broadcastPort}\n";
        echo str_repeat("-", 50) . "\n";
        
        // Create WebSocket server
        $this->socket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
        socket_set_option($this->socket, SOL_SOCKET, SO_REUSEADDR, 1);
        socket_bind($this->socket, $this->host, $this->port);
        socket_listen($this->socket);
        socket_set_nonblock($this->socket);
        
        // Create broadcast HTTP server
        $this->broadcastSocket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
        socket_set_option($this->broadcastSocket, SOL_SOCKET, SO_REUSEADDR, 1);
        socket_bind($this->broadcastSocket, $this->host, $this->broadcastPort);
        socket_listen($this->broadcastSocket);
        socket_set_nonblock($this->broadcastSocket);
        
        echo "Enhanced WebSocket server started successfully!\n";
        echo "WebSocket URL: ws://{$this->host}:{$this->port}\n";
        echo "Broadcast URL: http://{$this->host}:{$this->broadcastPort}/broadcast\n";
        echo "Waiting for connections...\n\n";
        
        while ($this->running) {
            // Handle WebSocket connections
            $this->handleWebSocketConnections();
            
            // Handle broadcast HTTP requests
            $this->handleBroadcastRequests();
            
            // Process existing WebSocket clients
            $this->handleExistingConnections();
            
            // Process pending broadcast notifications
            $this->processPendingNotifications();
            
            usleep(10000); // 10ms delay
        }
    }
    
    private function handleWebSocketConnections() {
        $newSocket = @socket_accept($this->socket);
        if ($newSocket !== false) {
            echo "[" . date('H:i:s') . "] New WebSocket connection attempt...\n";
            $this->handleNewWebSocketConnection($newSocket);
        }
    }
    
    private function handleBroadcastRequests() {
        $newSocket = @socket_accept($this->broadcastSocket);
        if ($newSocket !== false) {
            echo "[" . date('H:i:s') . "] New broadcast request...\n";
            $this->handleBroadcastRequest($newSocket);
        }
    }
    
    private function handleNewWebSocketConnection($socket) {
        // Read the HTTP request
        $request = socket_read($socket, 4096);
        
        if ($request && $this->performWebSocketHandshake($socket, $request)) {
            $clientId = uniqid('client_');
            $this->clients[$clientId] = [
                'socket' => $socket,
                'id' => $clientId,
                'authenticated' => false,
                'room_id' => null,
                'user_id' => null,
                'user_name' => null,
                'connected_at' => time()
            ];
            
            echo "[" . date('H:i:s') . "] WebSocket client connected: {$clientId}\n";
            
            // Send welcome message
            $this->sendToClient($clientId, [
                'type' => 'connected',
                'client_id' => $clientId,
                'message' => 'Connected to Enhanced WebSocket Server'
            ]);
        } else {
            socket_close($socket);
        }
    }
    
    private function handleBroadcastRequest($socket) {
        // Read HTTP request
        $request = socket_read($socket, 4096);
        
        if ($request) {
            $lines = explode("\r\n", $request);
            $requestLine = $lines[0];
            
            if (strpos($requestLine, 'POST /broadcast') === 0) {
                // Find content length
                $contentLength = 0;
                foreach ($lines as $line) {
                    if (strpos($line, 'Content-Length:') === 0) {
                        $contentLength = (int)trim(substr($line, 15));
                        break;
                    }
                }
                
                // Find the body
                $body = '';
                $bodyStart = strpos($request, "\r\n\r\n");
                if ($bodyStart !== false) {
                    $body = substr($request, $bodyStart + 4);
                }
                
                // Process broadcast data
                $data = json_decode($body, true);
                if ($data) {
                    $this->processBroadcastData($data);
                    
                    // Send success response
                    $response = "HTTP/1.1 200 OK\r\n";
                    $response .= "Content-Type: application/json\r\n";
                    $response .= "Access-Control-Allow-Origin: *\r\n";
                    $response .= "Connection: close\r\n\r\n";
                    $response .= json_encode(['success' => true]);
                } else {
                    // Send error response
                    $response = "HTTP/1.1 400 Bad Request\r\n";
                    $response .= "Content-Type: application/json\r\n";
                    $response .= "Connection: close\r\n\r\n";
                    $response .= json_encode(['error' => 'Invalid JSON']);
                }
            } else {
                // Send 404 response
                $response = "HTTP/1.1 404 Not Found\r\n";
                $response .= "Connection: close\r\n\r\n";
                $response .= "Not Found";
            }
            
            socket_write($socket, $response);
        }
        
        socket_close($socket);
    }
    
    private function processBroadcastData($data) {
        $type = $data['type'] ?? '';
        $roomId = $data['room_id'] ?? '';
        $broadcastData = $data['data'] ?? [];
        
        echo "[" . date('H:i:s') . "] Processing broadcast: {$type} for room {$roomId}\n";
        
        switch ($type) {
            case 'message':
                $this->broadcastToRoom($roomId, [
                    'type' => 'message',
                    'data' => $broadcastData
                ]);
                break;
                
            case 'user_joined':
                $this->broadcastToRoom($roomId, [
                    'type' => 'user_joined',
                    'data' => $broadcastData
                ]);
                break;
                
            case 'user_left':
                $this->broadcastToRoom($roomId, [
                    'type' => 'user_left',
                    'data' => $broadcastData
                ]);
                break;
                
            case 'typing':
                $this->broadcastToRoom($roomId, [
                    'type' => 'typing',
                    'data' => $broadcastData
                ], $broadcastData['user_id'] ?? null);
                break;
        }
    }
    
    private function processPendingNotifications() {
        static $lastCheck = 0;
        
        // Check every 5 seconds
        if (time() - $lastCheck < 5) {
            return;
        }
        
        $lastCheck = time();
        
        try {
            $notifications = $this->storage->list('broadcast/notifications', 50);
            
            foreach ($notifications as $notification) {
                if (!($notification['processed'] ?? false)) {
                    $this->processBroadcastData($notification);
                    
                    // Mark as processed
                    $notification['processed'] = true;
                    $notification['processed_at'] = time();
                    $this->storage->save('broadcast/notifications', $notification['id'], $notification);
                }
            }
        } catch (Exception $e) {
            echo "[" . date('H:i:s') . "] Error processing notifications: " . $e->getMessage() . "\n";
        }
    }
    
    private function handleExistingConnections() {
        foreach ($this->clients as $clientId => $client) {
            $socket = $client['socket'];
            
            // Check if socket is still connected
            if (!is_resource($socket)) {
                $this->removeClient($clientId);
                continue;
            }
            
            // Read data from client
            $data = @socket_read($socket, 4096, PHP_NORMAL_READ);
            
            if ($data === false) {
                $error = socket_last_error($socket);
                if ($error !== SOCKET_EWOULDBLOCK && $error !== SOCKET_EAGAIN) {
                    $this->removeClient($clientId);
                }
                continue;
            }
            
            if ($data === '') {
                $this->removeClient($clientId);
                continue;
            }
            
            // Decode WebSocket frame
            $message = $this->decodeMessage($data);
            if ($message) {
                $this->handleClientMessage($clientId, $message);
            }
        }
    }
    
    private function handleClientMessage($clientId, $message) {
        $data = json_decode($message, true);
        if (!$data) return;
        
        $type = $data['type'] ?? '';
        
        switch ($type) {
            case 'auth':
                $this->handleAuth($clientId, $data);
                break;
                
            case 'join_room':
                $this->handleJoinRoom($clientId, $data);
                break;
                
            case 'leave_room':
                $this->handleLeaveRoom($clientId, $data);
                break;
                
            case 'message':
                $this->handleMessage($clientId, $data);
                break;
                
            case 'typing':
                $this->handleTyping($clientId, $data);
                break;
                
            case 'ping':
                $this->sendToClient($clientId, ['type' => 'pong']);
                break;
        }
    }
    
    private function handleAuth($clientId, $data) {
        $token = $data['token'] ?? '';
        
        // Simple mock authentication
        if (strpos($token, 'test-token-') === 0) {
            $timestamp = str_replace('test-token-', '', $token);
            $userId = (int)substr($timestamp, -6);
            $userName = 'TestUser' . substr($timestamp, -3);
            
            $this->clients[$clientId]['authenticated'] = true;
            $this->clients[$clientId]['user_id'] = $userId;
            $this->clients[$clientId]['user_name'] = $userName;
            
            $this->sendToClient($clientId, [
                'type' => 'authenticated',
                'user' => [
                    'id' => $userId,
                    'name' => $userName
                ]
            ]);
            
            echo "[" . date('H:i:s') . "] Client {$clientId} authenticated as {$userName}\n";
        } else {
            $this->sendToClient($clientId, [
                'type' => 'error',
                'message' => 'Authentication failed'
            ]);
        }
    }
    
    private function handleJoinRoom($clientId, $data) {
        if (!$this->clients[$clientId]['authenticated']) {
            $this->sendToClient($clientId, [
                'type' => 'error',
                'message' => 'Authentication required'
            ]);
            return;
        }
        
        $roomId = $data['room_id'] ?? '';
        if (!$roomId) return;
        
        $this->clients[$clientId]['room_id'] = $roomId;
        
        if (!isset($this->rooms[$roomId])) {
            $this->rooms[$roomId] = [];
        }
        
        $this->rooms[$roomId][$clientId] = $this->clients[$clientId];
        
        $this->sendToClient($clientId, [
            'type' => 'room_joined',
            'room_id' => $roomId
        ]);
        
        // Broadcast user joined
        $this->broadcastToRoom($roomId, [
            'type' => 'user_joined',
            'data' => [
                'user_id' => $this->clients[$clientId]['user_id'],
                'user_name' => $this->clients[$clientId]['user_name']
            ]
        ], $this->clients[$clientId]['user_id']);
        
        echo "[" . date('H:i:s') . "] Client {$clientId} joined room {$roomId}\n";
    }
    
    private function broadcastToRoom($roomId, $message, $excludeUserId = null) {
        if (!isset($this->rooms[$roomId])) return;
        
        foreach ($this->rooms[$roomId] as $clientId => $client) {
            if ($excludeUserId && $client['user_id'] == $excludeUserId) {
                continue;
            }
            
            $this->sendToClient($clientId, $message);
        }
    }
    
    private function sendToClient($clientId, $message) {
        if (!isset($this->clients[$clientId])) return;
        
        $socket = $this->clients[$clientId]['socket'];
        $encodedMessage = $this->encodeMessage(json_encode($message));
        
        @socket_write($socket, $encodedMessage);
    }
    
    private function removeClient($clientId) {
        if (!isset($this->clients[$clientId])) return;
        
        $client = $this->clients[$clientId];
        
        // Remove from room
        if ($client['room_id'] && isset($this->rooms[$client['room_id']])) {
            unset($this->rooms[$client['room_id']][$clientId]);
            
            // Broadcast user left
            if ($client['authenticated']) {
                $this->broadcastToRoom($client['room_id'], [
                    'type' => 'user_left',
                    'data' => [
                        'user_id' => $client['user_id'],
                        'user_name' => $client['user_name']
                    ]
                ]);
            }
        }
        
        // Close socket
        if (is_resource($client['socket'])) {
            socket_close($client['socket']);
        }
        
        unset($this->clients[$clientId]);
        
        echo "[" . date('H:i:s') . "] Client {$clientId} disconnected\n";
    }
    
    // WebSocket protocol methods (simplified)
    private function performWebSocketHandshake($socket, $request) {
        $lines = explode("\r\n", $request);
        $headers = [];
        
        foreach ($lines as $line) {
            if (strpos($line, ':') !== false) {
                list($key, $value) = explode(':', $line, 2);
                $headers[trim($key)] = trim($value);
            }
        }
        
        if (!isset($headers['Sec-WebSocket-Key'])) {
            return false;
        }
        
        $key = $headers['Sec-WebSocket-Key'];
        $acceptKey = base64_encode(sha1($key . '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', true));
        
        $response = "HTTP/1.1 101 Switching Protocols\r\n";
        $response .= "Upgrade: websocket\r\n";
        $response .= "Connection: Upgrade\r\n";
        $response .= "Sec-WebSocket-Accept: {$acceptKey}\r\n\r\n";
        
        return socket_write($socket, $response) !== false;
    }
    
    private function encodeMessage($message) {
        $length = strlen($message);
        
        if ($length < 126) {
            return chr(129) . chr($length) . $message;
        } elseif ($length < 65536) {
            return chr(129) . chr(126) . pack('n', $length) . $message;
        } else {
            return chr(129) . chr(127) . pack('J', $length) . $message;
        }
    }
    
    private function decodeMessage($data) {
        if (strlen($data) < 2) return false;
        
        $firstByte = ord($data[0]);
        $secondByte = ord($data[1]);
        
        $opcode = $firstByte & 15;
        $masked = ($secondByte >> 7) & 1;
        $payloadLength = $secondByte & 127;
        
        $offset = 2;
        
        if ($payloadLength == 126) {
            $payloadLength = unpack('n', substr($data, $offset, 2))[1];
            $offset += 2;
        } elseif ($payloadLength == 127) {
            $payloadLength = unpack('J', substr($data, $offset, 8))[1];
            $offset += 8;
        }
        
        if ($masked) {
            $maskingKey = substr($data, $offset, 4);
            $offset += 4;
        }
        
        $payload = substr($data, $offset, $payloadLength);
        
        if ($masked) {
            for ($i = 0; $i < strlen($payload); $i++) {
                $payload[$i] = chr(ord($payload[$i]) ^ ord($maskingKey[$i % 4]));
            }
        }
        
        return $payload;
    }
}

// Start the enhanced server
$server = new EnhancedWebSocketServer();
$server->start();
