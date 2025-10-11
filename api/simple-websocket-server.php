<?php

// Simple WebSocket server implementation for testing
// This is a basic implementation for demonstration purposes

class SimpleWebSocketServer {
    private $host;
    private $port;
    private $socket;
    private $clients = [];
    private $rooms = [];
    
    public function __construct($host = '127.0.0.1', $port = 8080) {
        $this->host = $host;
        $this->port = $port;
    }
    
    public function start() {
        echo "Starting Simple WebSocket Server...\n";
        echo "Host: {$this->host}\n";
        echo "Port: {$this->port}\n";
        echo "WebSocket URL: ws://{$this->host}:{$this->port}\n";
        echo str_repeat("-", 50) . "\n";
        
        // Create socket
        $this->socket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
        socket_set_option($this->socket, SOL_SOCKET, SO_REUSEADDR, 1);
        socket_bind($this->socket, $this->host, $this->port);
        socket_listen($this->socket);
        
        echo "WebSocket server started successfully!\n";
        echo "Waiting for connections...\n";
        
        while (true) {
            // Accept new connections
            $newSocket = socket_accept($this->socket);
            if ($newSocket !== false) {
                $this->handleNewConnection($newSocket);
            }
            
            // Handle existing connections
            $this->handleExistingConnections();
            
            usleep(10000); // 10ms delay to prevent high CPU usage
        }
    }
    
    private function handleNewConnection($socket) {
        echo "New connection attempt...\n";
        
        // Read the HTTP request
        $request = socket_read($socket, 1024);
        
        if ($request === false) {
            socket_close($socket);
            return;
        }
        
        // Perform WebSocket handshake
        if ($this->performHandshake($socket, $request)) {
            $clientId = uniqid();
            $this->clients[$clientId] = [
                'socket' => $socket,
                'id' => $clientId,
                'authenticated' => false,
                'room' => null,
                'user' => null
            ];
            
            echo "Client {$clientId} connected\n";
            
            // Send welcome message
            $this->sendMessage($socket, json_encode([
                'type' => 'system',
                'action' => 'connected',
                'message' => 'Connected to chat server',
                'connectionId' => $clientId
            ]));
        } else {
            socket_close($socket);
        }
    }
    
    private function performHandshake($socket, $request) {
        $lines = explode("\n", $request);
        $headers = [];
        
        foreach ($lines as $line) {
            $line = trim($line);
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
        $response .= "Sec-WebSocket-Accept: {$acceptKey}\r\n";
        $response .= "\r\n";
        
        socket_write($socket, $response);
        return true;
    }
    
    private function handleExistingConnections() {
        foreach ($this->clients as $clientId => $client) {
            $socket = $client['socket'];
            
            // Check if socket is still connected
            $read = [$socket];
            $write = null;
            $except = null;
            
            if (socket_select($read, $write, $except, 0) > 0) {
                $data = socket_read($socket, 1024);
                
                if ($data === false || $data === '') {
                    // Client disconnected
                    $this->handleDisconnection($clientId);
                    continue;
                }
                
                $message = $this->decodeMessage($data);
                if ($message !== false) {
                    $this->handleMessage($clientId, $message);
                }
            }
        }
    }
    
    private function handleDisconnection($clientId) {
        echo "Client {$clientId} disconnected\n";
        
        $client = $this->clients[$clientId];
        
        // Remove from room if in one
        if ($client['room']) {
            $this->leaveRoom($clientId, $client['room']);
        }
        
        socket_close($client['socket']);
        unset($this->clients[$clientId]);
    }
    
    private function handleMessage($clientId, $message) {
        $client = $this->clients[$clientId];
        
        echo "Message from {$clientId}: {$message}\n";
        
        try {
            $data = json_decode($message, true);
            
            if (!$data || !isset($data['type'])) {
                $this->sendError($client['socket'], 'Invalid message format');
                return;
            }
            
            switch ($data['type']) {
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
                    $this->handleChatMessage($clientId, $data);
                    break;
                    
                case 'typing':
                    $this->handleTyping($clientId, $data);
                    break;
                    
                case 'ping':
                    $this->handlePing($clientId, $data);
                    break;
                    
                default:
                    $this->sendError($client['socket'], 'Unknown message type');
            }
            
        } catch (Exception $e) {
            echo "Error processing message: " . $e->getMessage() . "\n";
            $this->sendError($client['socket'], 'Server error processing message');
        }
    }
    
    private function handleAuth($clientId, $data) {
        if (!isset($data['token'])) {
            $this->sendError($this->clients[$clientId]['socket'], 'Authentication token required');
            return;
        }
        
        // Mock authentication for testing
        if (strpos($data['token'], 'test-token-') === 0) {
            $timestamp = str_replace('test-token-', '', $data['token']);
            $userId = (int)substr($timestamp, -6);
            $userName = 'TestUser' . substr($timestamp, -3);
            
            $this->clients[$clientId]['authenticated'] = true;
            $this->clients[$clientId]['user'] = [
                'id' => $userId,
                'name' => $userName,
                'role' => 'guest'
            ];
            
            $this->sendMessage($this->clients[$clientId]['socket'], json_encode([
                'type' => 'auth',
                'action' => 'success',
                'user' => $this->clients[$clientId]['user']
            ]));
            
            echo "User {$userName} authenticated (ID: {$userId})\n";
        } else {
            $this->sendError($this->clients[$clientId]['socket'], 'Invalid authentication token');
        }
    }
    
    private function handleJoinRoom($clientId, $data) {
        $client = $this->clients[$clientId];
        
        if (!$client['authenticated']) {
            $this->sendError($client['socket'], 'Authentication required');
            return;
        }
        
        if (!isset($data['roomId'])) {
            $this->sendError($client['socket'], 'Room ID required');
            return;
        }
        
        $roomId = $data['roomId'];
        
        // Initialize room if it doesn't exist
        if (!isset($this->rooms[$roomId])) {
            $this->rooms[$roomId] = [
                'id' => $roomId,
                'users' => [],
                'created' => time()
            ];
        }
        
        // Add user to room
        $this->rooms[$roomId]['users'][$clientId] = $client['user'];
        $this->clients[$clientId]['room'] = $roomId;
        
        // Get user list for response
        $users = array_map(function($user) {
            return [
                'id' => $user['id'],
                'name' => $user['name'],
                'role' => $user['role'],
                'joinedAt' => time()
            ];
        }, $this->rooms[$roomId]['users']);
        
        // Notify user they joined
        $this->sendMessage($client['socket'], json_encode([
            'type' => 'room',
            'action' => 'joined',
            'roomId' => $roomId,
            'users' => $users
        ]));
        
        // Notify other users in room
        $this->broadcastToRoom($roomId, [
            'type' => 'room',
            'action' => 'user_joined',
            'user' => $client['user']
        ], $clientId);
        
        echo "User {$client['user']['name']} joined room {$roomId}\n";
    }
    
    private function handleLeaveRoom($clientId, $data) {
        $client = $this->clients[$clientId];
        
        if ($client['room']) {
            $this->leaveRoom($clientId, $client['room']);
        }
    }
    
    private function handleChatMessage($clientId, $data) {
        $client = $this->clients[$clientId];
        
        if (!$client['authenticated'] || !$client['room']) {
            $this->sendError($client['socket'], 'Must be authenticated and in a room');
            return;
        }
        
        if (!isset($data['message']) || empty(trim($data['message']))) {
            $this->sendError($client['socket'], 'Message content required');
            return;
        }
        
        $message = trim($data['message']);
        $roomId = $client['room'];
        
        // Broadcast message to room
        $messageData = [
            'type' => 'message',
            'id' => uniqid(),
            'roomId' => $roomId,
            'user' => $client['user'],
            'message' => $message,
            'messageType' => $data['messageType'] ?? 'text',
            'timestamp' => time()
        ];
        
        $this->broadcastToRoom($roomId, $messageData);
        
        echo "Message from {$client['user']['name']} in room {$roomId}: {$message}\n";
    }
    
    private function handleTyping($clientId, $data) {
        $client = $this->clients[$clientId];
        
        if (!$client['authenticated'] || !$client['room']) {
            return;
        }
        
        $isTyping = $data['isTyping'] ?? false;
        
        $this->broadcastToRoom($client['room'], [
            'type' => 'typing',
            'user' => [
                'id' => $client['user']['id'],
                'name' => $client['user']['name']
            ],
            'isTyping' => $isTyping
        ], $clientId);
    }
    
    private function handlePing($clientId, $data) {
        $client = $this->clients[$clientId];
        
        $this->sendMessage($client['socket'], json_encode([
            'type' => 'pong',
            'timestamp' => time()
        ]));
    }
    
    private function leaveRoom($clientId, $roomId) {
        $client = $this->clients[$clientId];
        
        if (isset($this->rooms[$roomId]['users'][$clientId])) {
            unset($this->rooms[$roomId]['users'][$clientId]);
            
            // Notify other users
            $this->broadcastToRoom($roomId, [
                'type' => 'room',
                'action' => 'user_left',
                'user' => $client['user']
            ], $clientId);
            
            // Clean up empty rooms
            if (empty($this->rooms[$roomId]['users'])) {
                unset($this->rooms[$roomId]);
                echo "Room {$roomId} cleaned up (empty)\n";
            }
            
            $this->clients[$clientId]['room'] = null;
            echo "User {$client['user']['name']} left room {$roomId}\n";
        }
    }
    
    private function broadcastToRoom($roomId, $data, $excludeClientId = null) {
        if (!isset($this->rooms[$roomId])) {
            return;
        }
        
        foreach ($this->rooms[$roomId]['users'] as $clientId => $user) {
            if ($excludeClientId && $clientId === $excludeClientId) {
                continue;
            }
            
            if (isset($this->clients[$clientId])) {
                $this->sendMessage($this->clients[$clientId]['socket'], json_encode($data));
            }
        }
    }
    
    private function sendMessage($socket, $message) {
        $encodedMessage = $this->encodeMessage($message);
        socket_write($socket, $encodedMessage);
    }
    
    private function sendError($socket, $message) {
        $this->sendMessage($socket, json_encode([
            'type' => 'error',
            'message' => $message,
            'timestamp' => time()
        ]));
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
        if (strlen($data) < 2) {
            return false;
        }
        
        $firstByte = ord($data[0]);
        $secondByte = ord($data[1]);
        
        $opcode = $firstByte & 15;
        $masked = ($secondByte >> 7) & 1;
        $payloadLength = $secondByte & 127;
        
        if ($opcode == 8) {
            // Connection close
            return false;
        }
        
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
            for ($i = 0; $i < $payloadLength; $i++) {
                $payload[$i] = $payload[$i] ^ $maskingKey[$i % 4];
            }
        }
        
        return $payload;
    }
}

// Start the server
$server = new SimpleWebSocketServer('127.0.0.1', 8080);
$server->start();
