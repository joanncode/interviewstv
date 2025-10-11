<?php

namespace InterviewsTV\WebSocket;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use InterviewsTV\Services\AuthService;
use InterviewsTV\Services\ChatService;

class ChatServer implements MessageComponentInterface {
    protected $clients;
    protected $rooms;
    protected $userConnections;
    protected $authService;
    protected $chatService;
    
    public function __construct() {
        $this->clients = new \SplObjectStorage;
        $this->rooms = [];
        $this->userConnections = [];
        $this->authService = new AuthService();
        $this->chatService = new ChatService();
        
        echo "Chat server started\n";
    }

    public function onOpen(ConnectionInterface $conn) {
        // Store the new connection
        $this->clients->attach($conn);
        
        echo "New connection! ({$conn->resourceId})\n";
        
        // Send welcome message
        $this->sendToConnection($conn, [
            'type' => 'system',
            'action' => 'connected',
            'message' => 'Connected to chat server',
            'connectionId' => $conn->resourceId
        ]);
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        try {
            $data = json_decode($msg, true);
            
            if (!$data || !isset($data['type'])) {
                $this->sendError($from, 'Invalid message format');
                return;
            }
            
            switch ($data['type']) {
                case 'auth':
                    $this->handleAuth($from, $data);
                    break;
                    
                case 'join_room':
                    $this->handleJoinRoom($from, $data);
                    break;
                    
                case 'leave_room':
                    $this->handleLeaveRoom($from, $data);
                    break;
                    
                case 'message':
                    $this->handleMessage($from, $data);
                    break;
                    
                case 'typing':
                    $this->handleTyping($from, $data);
                    break;
                    
                case 'ping':
                    $this->handlePing($from, $data);
                    break;
                    
                default:
                    $this->sendError($from, 'Unknown message type');
            }
            
        } catch (\Exception $e) {
            echo "Error processing message: " . $e->getMessage() . "\n";
            $this->sendError($from, 'Server error processing message');
        }
    }

    public function onClose(ConnectionInterface $conn) {
        // Remove user from all rooms
        $this->removeUserFromAllRooms($conn);
        
        // Remove from clients
        $this->clients->detach($conn);
        
        // Remove from user connections
        foreach ($this->userConnections as $userId => $connection) {
            if ($connection === $conn) {
                unset($this->userConnections[$userId]);
                break;
            }
        }
        
        echo "Connection {$conn->resourceId} has disconnected\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "An error has occurred: {$e->getMessage()}\n";
        $conn->close();
    }
    
    /**
     * Handle user authentication
     */
    protected function handleAuth(ConnectionInterface $conn, array $data) {
        if (!isset($data['token'])) {
            $this->sendError($conn, 'Authentication token required');
            return;
        }
        
        try {
            $user = $this->authService->validateToken($data['token']);
            
            if (!$user) {
                $this->sendError($conn, 'Invalid authentication token');
                return;
            }
            
            // Store user connection
            $conn->userId = $user['id'];
            $conn->userName = $user['name'];
            $conn->userRole = $user['role'] ?? 'guest';
            $this->userConnections[$user['id']] = $conn;
            
            $this->sendToConnection($conn, [
                'type' => 'auth',
                'action' => 'success',
                'user' => [
                    'id' => $user['id'],
                    'name' => $user['name'],
                    'role' => $conn->userRole
                ]
            ]);
            
            echo "User {$user['name']} authenticated (ID: {$user['id']})\n";
            
        } catch (\Exception $e) {
            $this->sendError($conn, 'Authentication failed');
        }
    }
    
    /**
     * Handle joining a chat room
     */
    protected function handleJoinRoom(ConnectionInterface $conn, array $data) {
        if (!isset($conn->userId)) {
            $this->sendError($conn, 'Authentication required');
            return;
        }
        
        if (!isset($data['roomId'])) {
            $this->sendError($conn, 'Room ID required');
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
        $this->rooms[$roomId]['users'][$conn->userId] = [
            'id' => $conn->userId,
            'name' => $conn->userName,
            'role' => $conn->userRole,
            'connection' => $conn,
            'joinedAt' => time()
        ];
        
        $conn->currentRoom = $roomId;
        
        // Notify user they joined
        $this->sendToConnection($conn, [
            'type' => 'room',
            'action' => 'joined',
            'roomId' => $roomId,
            'users' => array_map(function($user) {
                return [
                    'id' => $user['id'],
                    'name' => $user['name'],
                    'role' => $user['role'],
                    'joinedAt' => $user['joinedAt']
                ];
            }, $this->rooms[$roomId]['users'])
        ]);
        
        // Notify other users in room
        $this->broadcastToRoom($roomId, [
            'type' => 'room',
            'action' => 'user_joined',
            'user' => [
                'id' => $conn->userId,
                'name' => $conn->userName,
                'role' => $conn->userRole
            ]
        ], $conn->userId);
        
        echo "User {$conn->userName} joined room {$roomId}\n";
    }
    
    /**
     * Handle leaving a chat room
     */
    protected function handleLeaveRoom(ConnectionInterface $conn, array $data) {
        if (!isset($conn->currentRoom)) {
            return;
        }
        
        $roomId = $conn->currentRoom;
        $this->removeUserFromRoom($conn, $roomId);
    }
    
    /**
     * Handle chat message
     */
    protected function handleMessage(ConnectionInterface $conn, array $data) {
        if (!isset($conn->userId) || !isset($conn->currentRoom)) {
            $this->sendError($conn, 'Must be authenticated and in a room');
            return;
        }
        
        if (!isset($data['message']) || empty(trim($data['message']))) {
            $this->sendError($conn, 'Message content required');
            return;
        }
        
        $message = trim($data['message']);
        $roomId = $conn->currentRoom;
        
        // Rate limiting check
        if (!$this->checkRateLimit($conn)) {
            $this->sendError($conn, 'Rate limit exceeded');
            return;
        }
        
        // Save message to database
        try {
            $messageId = $this->chatService->saveMessage([
                'room_id' => $roomId,
                'user_id' => $conn->userId,
                'user_name' => $conn->userName,
                'message' => $message,
                'message_type' => $data['messageType'] ?? 'text',
                'timestamp' => time()
            ]);
            
            // Broadcast message to room
            $messageData = [
                'type' => 'message',
                'id' => $messageId,
                'roomId' => $roomId,
                'user' => [
                    'id' => $conn->userId,
                    'name' => $conn->userName,
                    'role' => $conn->userRole
                ],
                'message' => $message,
                'messageType' => $data['messageType'] ?? 'text',
                'timestamp' => time()
            ];
            
            $this->broadcastToRoom($roomId, $messageData);
            
            echo "Message from {$conn->userName} in room {$roomId}: {$message}\n";
            
        } catch (\Exception $e) {
            $this->sendError($conn, 'Failed to send message');
        }
    }
    
    /**
     * Handle typing indicator
     */
    protected function handleTyping(ConnectionInterface $conn, array $data) {
        if (!isset($conn->userId) || !isset($conn->currentRoom)) {
            return;
        }
        
        $isTyping = $data['isTyping'] ?? false;
        
        $this->broadcastToRoom($conn->currentRoom, [
            'type' => 'typing',
            'user' => [
                'id' => $conn->userId,
                'name' => $conn->userName
            ],
            'isTyping' => $isTyping
        ], $conn->userId);
    }
    
    /**
     * Handle ping for connection health
     */
    protected function handlePing(ConnectionInterface $conn, array $data) {
        $this->sendToConnection($conn, [
            'type' => 'pong',
            'timestamp' => time()
        ]);
    }
    
    /**
     * Remove user from a specific room
     */
    protected function removeUserFromRoom(ConnectionInterface $conn, string $roomId) {
        if (!isset($this->rooms[$roomId]) || !isset($conn->userId)) {
            return;
        }
        
        // Remove user from room
        unset($this->rooms[$roomId]['users'][$conn->userId]);
        
        // Notify other users
        $this->broadcastToRoom($roomId, [
            'type' => 'room',
            'action' => 'user_left',
            'user' => [
                'id' => $conn->userId,
                'name' => $conn->userName
            ]
        ], $conn->userId);
        
        // Clean up empty rooms
        if (empty($this->rooms[$roomId]['users'])) {
            unset($this->rooms[$roomId]);
            echo "Room {$roomId} cleaned up (empty)\n";
        }
        
        unset($conn->currentRoom);
        echo "User {$conn->userName} left room {$roomId}\n";
    }
    
    /**
     * Remove user from all rooms
     */
    protected function removeUserFromAllRooms(ConnectionInterface $conn) {
        if (!isset($conn->userId)) {
            return;
        }
        
        foreach ($this->rooms as $roomId => $room) {
            if (isset($room['users'][$conn->userId])) {
                $this->removeUserFromRoom($conn, $roomId);
            }
        }
    }
    
    /**
     * Broadcast message to all users in a room
     */
    protected function broadcastToRoom(string $roomId, array $data, int $excludeUserId = null) {
        if (!isset($this->rooms[$roomId])) {
            return;
        }
        
        foreach ($this->rooms[$roomId]['users'] as $userId => $user) {
            if ($excludeUserId && $userId === $excludeUserId) {
                continue;
            }
            
            $this->sendToConnection($user['connection'], $data);
        }
    }
    
    /**
     * Send message to specific connection
     */
    protected function sendToConnection(ConnectionInterface $conn, array $data) {
        try {
            $conn->send(json_encode($data));
        } catch (\Exception $e) {
            echo "Failed to send message to connection {$conn->resourceId}: " . $e->getMessage() . "\n";
        }
    }
    
    /**
     * Send error message to connection
     */
    protected function sendError(ConnectionInterface $conn, string $message) {
        $this->sendToConnection($conn, [
            'type' => 'error',
            'message' => $message,
            'timestamp' => time()
        ]);
    }
    
    /**
     * Check rate limiting for user
     */
    protected function checkRateLimit(ConnectionInterface $conn) {
        // Simple rate limiting: max 10 messages per minute
        $now = time();
        
        if (!isset($conn->lastMessages)) {
            $conn->lastMessages = [];
        }
        
        // Remove old messages (older than 1 minute)
        $conn->lastMessages = array_filter($conn->lastMessages, function($timestamp) use ($now) {
            return ($now - $timestamp) < 60;
        });
        
        // Check if under limit
        if (count($conn->lastMessages) >= 10) {
            return false;
        }
        
        // Add current message timestamp
        $conn->lastMessages[] = $now;
        return true;
    }
    
    /**
     * Get room statistics
     */
    public function getRoomStats() {
        $stats = [];
        
        foreach ($this->rooms as $roomId => $room) {
            $stats[$roomId] = [
                'id' => $roomId,
                'userCount' => count($room['users']),
                'created' => $room['created'],
                'users' => array_map(function($user) {
                    return [
                        'id' => $user['id'],
                        'name' => $user['name'],
                        'role' => $user['role'],
                        'joinedAt' => $user['joinedAt']
                    ];
                }, $room['users'])
            ];
        }
        
        return $stats;
    }
    
    /**
     * Get server statistics
     */
    public function getServerStats() {
        return [
            'totalConnections' => count($this->clients),
            'authenticatedUsers' => count($this->userConnections),
            'activeRooms' => count($this->rooms),
            'uptime' => time() - $_SERVER['REQUEST_TIME'],
            'rooms' => $this->getRoomStats()
        ];
    }
}
