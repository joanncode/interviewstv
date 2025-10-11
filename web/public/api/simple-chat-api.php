<?php

// Simple Chat API for Interviews.tv (without Composer dependencies)

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Simple message broadcaster class
class SimpleBroadcaster {
    private $storage;

    public function __construct($storage) {
        $this->storage = $storage;
    }

    public function broadcastMessage($roomId, $messageData) {
        // Create broadcast notification for WebSocket server
        $notificationId = uniqid('broadcast_', true);
        $notification = [
            'id' => $notificationId,
            'type' => 'message',
            'room_id' => $roomId,
            'data' => $messageData,
            'created_at' => time(),
            'processed' => false
        ];

        $this->storage->save('broadcast/notifications', $notificationId, $notification);

        // Also try direct WebSocket notification via HTTP
        $this->tryDirectBroadcast($notification);

        return true;
    }

    public function broadcastUserJoin($roomId, $userData) {
        $notificationId = uniqid('join_', true);
        $notification = [
            'id' => $notificationId,
            'type' => 'user_joined',
            'room_id' => $roomId,
            'data' => $userData,
            'created_at' => time(),
            'processed' => false
        ];

        $this->storage->save('broadcast/notifications', $notificationId, $notification);
        $this->tryDirectBroadcast($notification);

        return true;
    }

    private function tryDirectBroadcast($notification) {
        // Try to send directly to WebSocket server via HTTP
        $broadcastUrl = 'http://127.0.0.1:8081/broadcast';

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => 'Content-Type: application/json',
                'content' => json_encode($notification),
                'timeout' => 2
            ]
        ]);

        @file_get_contents($broadcastUrl, false, $context);
    }
}

// Simple file storage class
class SimpleFileStorage {
    private $dataDir;
    
    public function __construct() {
        $this->dataDir = __DIR__ . '/data';
        $this->ensureDirectoryExists($this->dataDir);
    }
    
    public function save($collection, $id, $data) {
        $dir = $this->dataDir . '/' . $collection;
        $this->ensureDirectoryExists($dir);
        
        $file = $dir . '/' . $id . '.json';
        $data['updated_at'] = time();
        
        if (!isset($data['created_at'])) {
            $data['created_at'] = time();
        }
        
        return file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT)) !== false;
    }
    
    public function load($collection, $id) {
        $file = $this->dataDir . '/' . $collection . '/' . $id . '.json';
        
        if (!file_exists($file)) {
            return null;
        }
        
        $content = file_get_contents($file);
        return json_decode($content, true);
    }
    
    public function append($collection, $id, $data) {
        $file = $this->dataDir . '/' . $collection . '/' . $id . '.json';
        
        $existing = [];
        if (file_exists($file)) {
            $content = file_get_contents($file);
            $existing = json_decode($content, true) ?: [];
        }
        
        $data['id'] = uniqid();
        $data['timestamp'] = time();
        $existing[] = $data;
        
        return file_put_contents($file, json_encode($existing, JSON_PRETTY_PRINT)) !== false;
    }
    
    public function getArray($collection, $id) {
        $file = $this->dataDir . '/' . $collection . '/' . $id . '.json';
        
        if (!file_exists($file)) {
            return [];
        }
        
        $content = file_get_contents($file);
        return json_decode($content, true) ?: [];
    }
    
    private function ensureDirectoryExists($dir) {
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
    }
}

// Simple auth validation
function validateAuth() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
    if (strpos($authHeader, 'Bearer ') === 0) {
        $token = substr($authHeader, 7);
        
        // Handle mock tokens for testing
        if (strpos($token, 'test-token-') === 0) {
            $timestamp = str_replace('test-token-', '', $token);
            $userId = (int)substr($timestamp, -6);
            $userName = 'TestUser' . substr($timestamp, -3);
            
            return [
                'id' => $userId,
                'email' => "test{$userId}@example.com",
                'name' => $userName,
                'role' => 'guest'
            ];
        }
    }
    
    return null;
}

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = str_replace('/api/simple-chat-api.php', '', $path);
$path = ltrim($path, '/');
$segments = explode('/', $path);

$storage = new SimpleFileStorage();
$broadcaster = new SimpleBroadcaster($storage);

try {
    // Route the request
    switch ($method) {
        case 'GET':
            handleGetRequest($storage, $segments);
            break;
            
        case 'POST':
            handlePostRequest($storage, $broadcaster, $segments);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error: ' . $e->getMessage()]);
}

function handleGetRequest($storage, $segments) {
    if (empty($segments[0])) {
        // GET /api/simple-chat-api.php
        echo json_encode([
            'message' => 'Simple Chat API v1.0',
            'status' => 'running',
            'endpoints' => [
                'GET /rooms/{roomId}/messages' => 'Get messages for a room',
                'POST /rooms/{roomId}/messages' => 'Send a message',
                'GET /rooms/{roomId}' => 'Get room information',
                'POST /rooms' => 'Create a room'
            ]
        ]);
        return;
    }
    
    switch ($segments[0]) {
        case 'rooms':
            if (isset($segments[1])) {
                $roomId = $segments[1];
                
                if (isset($segments[2]) && $segments[2] === 'messages') {
                    // GET /rooms/{roomId}/messages
                    getMessages($storage, $roomId);
                } else {
                    // GET /rooms/{roomId}
                    getRoomInfo($storage, $roomId);
                }
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Room ID required']);
            }
            break;
            
        case 'stats':
            // GET /stats
            getStats($storage);
            break;
            
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
    }
}

function handlePostRequest($storage, $broadcaster, $segments) {
    switch ($segments[0]) {
        case 'rooms':
            if (isset($segments[1])) {
                $roomId = $segments[1];
                
                if (isset($segments[2]) && $segments[2] === 'messages') {
                    // POST /rooms/{roomId}/messages
                    sendMessage($storage, $broadcaster, $roomId);
                } else {
                    http_response_code(400);
                    echo json_encode(['error' => 'Invalid endpoint']);
                }
            } else {
                // POST /rooms
                createRoom($storage, $broadcaster);
            }
            break;
            
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
    }
}

function getMessages($storage, $roomId) {
    $user = validateAuth();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Authentication required']);
        return;
    }
    
    $limit = (int)($_GET['limit'] ?? 50);
    $offset = (int)($_GET['offset'] ?? 0);
    
    if ($limit > 100) {
        $limit = 100;
    }
    
    $messages = $storage->getArray('chat/messages', $roomId);
    
    // Filter out deleted messages
    $messages = array_filter($messages, function($msg) {
        return !($msg['is_deleted'] ?? false);
    });
    
    // Sort by timestamp (newest first)
    usort($messages, function($a, $b) {
        return ($b['timestamp'] ?? 0) - ($a['timestamp'] ?? 0);
    });
    
    // Apply offset and limit
    if ($offset > 0) {
        $messages = array_slice($messages, $offset);
    }
    
    if ($limit > 0) {
        $messages = array_slice($messages, 0, $limit);
    }
    
    // Reverse to get chronological order
    $messages = array_reverse($messages);
    
    echo json_encode([
        'success' => true,
        'data' => [
            'room_id' => $roomId,
            'messages' => $messages,
            'count' => count($messages),
            'limit' => $limit,
            'offset' => $offset
        ]
    ]);
}

function sendMessage($storage, $broadcaster, $roomId) {
    $user = validateAuth();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Authentication required']);
        return;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['message']) || empty(trim($input['message']))) {
        http_response_code(400);
        echo json_encode(['error' => 'Message content required']);
        return;
    }
    
    $messageData = [
        'room_id' => $roomId,
        'user_id' => $user['id'],
        'user_name' => $user['name'],
        'message' => trim($input['message']),
        'message_type' => $input['message_type'] ?? 'text',
        'timestamp' => time(),
        'is_deleted' => false,
        'metadata' => $input['metadata'] ?? []
    ];
    
    $storage->append('chat/messages', $roomId, $messageData);

    // Broadcast the message to WebSocket clients
    $broadcaster->broadcastMessage($roomId, [
        'id' => $messageData['id'] ?? uniqid(),
        'room_id' => $roomId,
        'user_id' => $user['id'],
        'user_name' => $user['name'],
        'message' => $messageData['message'],
        'message_type' => $messageData['message_type'],
        'timestamp' => $messageData['timestamp']
    ]);

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'data' => [
            'room_id' => $roomId,
            'user' => [
                'id' => $user['id'],
                'name' => $user['name']
            ],
            'message' => $messageData['message'],
            'message_type' => $messageData['message_type'],
            'timestamp' => $messageData['timestamp']
        ]
    ]);
}

function getRoomInfo($storage, $roomId) {
    $user = validateAuth();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Authentication required']);
        return;
    }
    
    $room = $storage->load('chat/rooms', $roomId);
    
    if (!$room) {
        http_response_code(404);
        echo json_encode(['error' => 'Room not found']);
        return;
    }
    
    $messages = $storage->getArray('chat/messages', $roomId);
    
    echo json_encode([
        'success' => true,
        'data' => [
            'room' => $room,
            'message_count' => count($messages),
            'last_activity' => !empty($messages) ? max(array_column($messages, 'timestamp')) : null
        ]
    ]);
}

function createRoom($storage, $broadcaster) {
    $user = validateAuth();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Authentication required']);
        return;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['id']) || !isset($input['name'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Room ID and name required']);
        return;
    }
    
    $roomData = [
        'id' => $input['id'],
        'name' => $input['name'],
        'description' => $input['description'] ?? '',
        'created_by' => $user['id'],
        'is_active' => true,
        'settings' => $input['settings'] ?? []
    ];
    
    $storage->save('chat/rooms', $input['id'], $roomData);
    $storage->save('chat/messages', $input['id'], []);
    
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'data' => [
            'room_id' => $input['id'],
            'message' => 'Room created successfully'
        ]
    ]);
}

function getStats($storage) {
    $user = validateAuth();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Authentication required']);
        return;
    }
    
    $roomId = $_GET['room_id'] ?? null;
    
    if ($roomId) {
        $messages = $storage->getArray('chat/messages', $roomId);
        $stats = [
            'room_id' => $roomId,
            'total_messages' => count($messages),
            'last_activity' => !empty($messages) ? max(array_column($messages, 'timestamp')) : null
        ];
    } else {
        $stats = [
            'total_rooms' => 1, // Simplified for demo
            'total_messages' => 0
        ];
    }
    
    echo json_encode([
        'success' => true,
        'data' => $stats
    ]);
}

?>
