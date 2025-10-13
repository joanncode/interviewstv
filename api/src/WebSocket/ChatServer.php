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
    protected $chatAuthService;
    protected $rateLimitService;
    protected $connectionManager;
    protected $emojiService;
    protected $formattingService;
    protected $moderationService;
    protected $userModerationService;
    protected $profanityFilterService;
    protected $chatCommandService;
    protected $privateMessageService;
    protected $chatExportService;
    
    public function __construct() {
        $this->clients = new \SplObjectStorage;
        $this->rooms = [];
        $this->userConnections = [];
        $this->authService = new AuthService();
        $this->chatService = new ChatService();
        $this->chatAuthService = new \InterviewsTV\Services\ChatAuthService();
        $this->rateLimitService = new \InterviewsTV\Services\ChatRateLimitService();
        $this->connectionManager = new \InterviewsTV\Services\ChatConnectionManager();
        $this->emojiService = new \InterviewsTV\Services\EmojiService();
        $this->formattingService = new \InterviewsTV\Services\MessageFormattingService();
        $this->moderationService = new \InterviewsTV\Services\ChatModerationService();
        $this->userModerationService = new \InterviewsTV\Services\UserModerationService();
        $this->profanityFilterService = new \InterviewsTV\Services\ProfanityFilterService();
        $this->chatCommandService = new \InterviewsTV\Services\ChatCommandService();
        $this->privateMessageService = new \InterviewsTV\Services\PrivateMessageService();
        $this->chatExportService = new \InterviewsTV\Services\ChatExportService();

        echo "Chat server started with enhanced features\n";
    }

    public function onOpen(ConnectionInterface $conn) {
        // Store the new connection
        $this->clients->attach($conn);

        echo "New connection! ({$conn->resourceId})\n";

        // Initialize connection properties
        $conn->userId = null;
        $conn->userName = null;
        $conn->roomId = null;
        $conn->userRole = 'guest';
        $conn->isAuthenticated = false;
        $conn->connectionId = null;
        $conn->sessionId = null;
        $conn->lastHeartbeat = time();
        $conn->rateLimitViolations = 0;

        // Send welcome message
        $this->sendToConnection($conn, [
            'type' => 'system',
            'action' => 'connected',
            'message' => 'Connected to chat server - please authenticate',
            'connectionId' => $conn->resourceId,
            'server_time' => time(),
            'features' => [
                'authentication' => true,
                'rate_limiting' => true,
                'heartbeat' => true,
                'reconnection' => true
            ]
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

                case 'reaction':
                    $this->handleReaction($from, $data);
                    break;

                case 'get_emojis':
                    $this->handleGetEmojis($from, $data);
                    break;

                case 'get_formatting_help':
                    $this->handleGetFormattingHelp($from, $data);
                    break;

                case 'moderate_user':
                    $this->handleModerateUser($from, $data);
                    break;

                case 'delete_message':
                    $this->handleDeleteMessage($from, $data);
                    break;

                case 'get_moderation_stats':
                    $this->handleGetModerationStats($from, $data);
                    break;

                case 'get_user_history':
                    $this->handleGetUserHistory($from, $data);
                    break;
                case 'user_moderation_action':
                    $this->handleUserModerationAction($from, $data);
                    break;
                case 'review_appeal':
                    $this->handleReviewAppeal($from, $data);
                    break;
                case 'bulk_action':
                    $this->handleBulkAction($from, $data);
                    break;
                case 'get_user_status':
                    $this->handleGetUserStatus($from, $data);
                    break;
                case 'submit_appeal':
                    $this->handleSubmitAppeal($from, $data);
                    break;
                case 'profanity_filter_update':
                    $this->handleProfanityFilterUpdate($from, $data);
                    break;
                case 'profanity_filter_config':
                    $this->handleProfanityFilterConfig($from, $data);
                    break;
                case 'profanity_filter_test':
                    $this->handleProfanityFilterTest($from, $data);
                    break;
                case 'profanity_filter_import':
                    $this->handleProfanityFilterImport($from, $data);
                    break;
                case 'profanity_filter_cleanup':
                    $this->handleProfanityFilterCleanup($from, $data);
                    break;
                case 'get_available_commands':
                    $this->handleGetAvailableCommands($from, $data);
                    break;
                case 'get_command_statistics':
                    $this->handleGetCommandStatistics($from, $data);
                    break;
                case 'send_private_message':
                    $this->handleSendPrivateMessage($from, $data);
                    break;
                case 'get_private_conversations':
                    $this->handleGetPrivateConversations($from, $data);
                    break;
                case 'get_conversation_history':
                    $this->handleGetConversationHistory($from, $data);
                    break;
                case 'mark_messages_read':
                    $this->handleMarkMessagesRead($from, $data);
                    break;
                case 'delete_private_message':
                    $this->handleDeletePrivateMessage($from, $data);
                    break;
                case 'block_user':
                    $this->handleBlockUser($from, $data);
                    break;
                case 'get_private_message_stats':
                    $this->handleGetPrivateMessageStats($from, $data);
                    break;
                case 'export_room_chat':
                    $this->handleExportRoomChat($from, $data);
                    break;
                case 'export_private_messages':
                    $this->handleExportPrivateMessages($from, $data);
                    break;
                case 'export_moderation_logs':
                    $this->handleExportModerationLogs($from, $data);
                    break;
                case 'get_export_statistics':
                    $this->handleGetExportStatistics($from, $data);
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
        // Handle disconnection with connection manager
        if (isset($conn->connectionId)) {
            $this->connectionManager->handleDisconnection($conn, 'client_disconnect');
        }

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

        // Check if user is banned or muted
        if ($this->moderationService->isUserBanned($conn->userId, $roomId)) {
            $this->sendError($conn, 'You are banned from this chat');
            return;
        }

        $muteStatus = $this->moderationService->isUserMuted($conn->userId, $roomId);
        if ($muteStatus) {
            $this->sendError($conn, 'You are muted until ' . date('Y-m-d H:i:s', $muteStatus['unmute_at']));
            return;
        }

        // Check if message is a command
        if (strpos(trim($message), '/') === 0) {
            $commandResult = $this->chatCommandService->executeCommand($message, [
                'user_id' => $conn->userId,
                'user_name' => $conn->userName ?? 'Unknown',
                'user_role' => $conn->userRole ?? 'guest',
                'room_id' => $roomId
            ]);

            if ($commandResult['success']) {
                // Send command result to user
                $this->sendToConnection($conn, [
                    'type' => 'command_result',
                    'success' => true,
                    'message' => $commandResult['message'],
                    'command_type' => $commandResult['type'],
                    'data' => $commandResult
                ]);

                // Broadcast if needed
                if ($commandResult['broadcast'] ?? false) {
                    $this->broadcastToRoom($roomId, [
                        'type' => 'moderation_action',
                        'action' => $commandResult['action'] ?? 'command',
                        'message' => $commandResult['message'],
                        'moderator' => $conn->userName ?? 'Moderator',
                        'timestamp' => time()
                    ], $conn);
                }

                return;
            } else {
                // Send error to user
                $this->sendError($conn, $commandResult['error']);
                return;
            }
        }

        // Apply profanity filtering first
        $profanityResult = $this->profanityFilterService->filterContent($message, [
            'user_id' => $conn->userId,
            'room_id' => $roomId,
            'user_role' => $conn->userRole ?? 'guest'
        ]);

        // Handle profanity filter result
        if ($profanityResult['action'] === 'block') {
            $this->sendError($conn, 'Message blocked: Inappropriate content detected');

            // Apply auto-moderation for severe profanity
            if ($profanityResult['severity_score'] >= 75) {
                $this->moderationService->warnUser($conn->userId, $roomId, 'Inappropriate language', 'system');
            }
            return;
        }

        // Use filtered content for further processing
        $filteredMessage = $profanityResult['filtered_content'];

        // Moderate the message
        $moderationResult = $this->moderationService->moderateMessage([
            'message' => $filteredMessage,
            'user_id' => $conn->userId,
            'user_name' => $conn->userName ?? 'Unknown',
            'room_id' => $roomId,
            'user_role' => $conn->userRole ?? 'guest'
        ]);

        // Handle moderation result
        if (!$moderationResult['allowed']) {
            $this->sendError($conn, 'Message blocked: ' . implode(', ', $moderationResult['warnings']));

            // Apply auto-moderation actions
            if ($moderationResult['auto_action'] === 'auto_mute') {
                $this->moderationService->muteUser($conn->userId, $roomId, 300, 'Auto-muted for violations', 'system');
                $this->sendToConnection($conn, [
                    'type' => 'moderation_action',
                    'action' => 'muted',
                    'duration' => 300,
                    'reason' => 'Auto-muted for violations'
                ]);
            } elseif ($moderationResult['auto_action'] === 'auto_ban') {
                $this->moderationService->banUser($conn->userId, $roomId, 'Auto-banned for severe violations', 'system');
                $this->sendToConnection($conn, [
                    'type' => 'moderation_action',
                    'action' => 'banned',
                    'reason' => 'Auto-banned for severe violations'
                ]);
            }

            return;
        }

        // Use filtered and moderated message
        $finalMessage = $moderationResult['modified_message'] ?? $filteredMessage;

        // Validate formatting syntax
        $formattingValidation = $this->formattingService->validateFormatting($finalMessage);
        if (!$formattingValidation['valid']) {
            $this->sendError($conn, 'Invalid formatting: ' . implode(', ', $formattingValidation['errors']));
            return;
        }

        // Apply message formatting
        $formattingResult = $this->formattingService->formatMessage($finalMessage, [
            'parse_mentions' => true,
            'parse_links' => true
        ]);

        // Parse emojis in formatted message
        $parsedMessage = $this->emojiService->parseEmojisInMessage($formattingResult['formatted_message']);
        
        // Enhanced rate limiting check
        $rateLimitResult = $this->rateLimitService->checkRateLimit($conn->userId, $conn->userRole);
        if (!$rateLimitResult['allowed']) {
            $this->sendError($conn, 'Rate limit exceeded. Try again in ' . $rateLimitResult['retry_after'] . ' seconds');
            return;
        }

        // Spam content check
        $spamResult = $this->rateLimitService->checkSpamContent($message, $conn->userId);
        if ($spamResult['is_spam']) {
            $this->handleSpamMessage($conn, $message, $spamResult);
            return;
        }

        // Check user penalties
        $penaltyCheck = $this->rateLimitService->checkUserPenalties($conn->userId, $roomId);
        if ($penaltyCheck['has_penalties']) {
            $this->sendError($conn, 'You are currently restricted from sending messages');
            return;
        }
        
        // Save message to database
        try {
            $messageId = $this->chatService->saveMessage([
                'room_id' => $roomId,
                'user_id' => $conn->userId,
                'user_name' => $conn->userName,
                'message' => $parsedMessage,
                'original_message' => $message,
                'raw_message' => $formattingResult['original_message'],
                'message_type' => $data['messageType'] ?? 'text',
                'timestamp' => time(),
                'metadata' => [
                    'has_emojis' => $parsedMessage !== $formattingResult['formatted_message'],
                    'emoji_count' => $this->countEmojisInMessage($parsedMessage),
                    'has_formatting' => $formattingResult['has_formatting'],
                    'formatting_types' => $formattingResult['formatting_types'],
                    'word_count' => $formattingResult['word_count'],
                    'character_count' => $formattingResult['character_count']
                ]
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
                'message' => $parsedMessage,
                'original_message' => $message,
                'raw_message' => $formattingResult['original_message'],
                'messageType' => $data['messageType'] ?? 'text',
                'timestamp' => time(),
                'has_emojis' => $parsedMessage !== $formattingResult['formatted_message'],
                'emoji_count' => $this->countEmojisInMessage($parsedMessage),
                'has_formatting' => $formattingResult['has_formatting'],
                'formatting_types' => $formattingResult['formatting_types'],
                'word_count' => $formattingResult['word_count'],
                'character_count' => $formattingResult['character_count']
            ];
            
            $this->broadcastToRoom($roomId, $messageData);

            // Record message for rate limiting
            $this->recordMessageForRateLimit($conn, $message);

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
     * Handle ping for connection health with enhanced features
     */
    protected function handlePing(ConnectionInterface $conn, array $data) {
        try {
            // Update connection activity and handle heartbeat
            if (isset($conn->connectionId)) {
                $this->connectionManager->handleHeartbeat($conn, $data);
                $this->connectionManager->updateActivity($conn, 'heartbeat');
            }

            // Send pong response
            $this->sendToConnection($conn, [
                'type' => 'pong',
                'timestamp' => time() * 1000,
                'client_timestamp' => $data['timestamp'] ?? null
            ]);

        } catch (\Exception $e) {
            echo "Error handling ping: " . $e->getMessage() . "\n";
            // Fallback to simple pong
            $this->sendToConnection($conn, [
                'type' => 'pong',
                'timestamp' => time()
            ]);
        }
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
        try {
            $connectionStats = $this->connectionManager->getConnectionStats();
            $rateLimitStats = $this->rateLimitService->getStatistics();

            return [
                'totalConnections' => count($this->clients),
                'authenticatedUsers' => count($this->userConnections),
                'activeRooms' => count($this->rooms),
                'uptime' => time() - $_SERVER['REQUEST_TIME'],
                'rooms' => $this->getRoomStats(),
                'connection_stats' => $connectionStats,
                'rate_limit_stats' => $rateLimitStats,
                'memory_usage' => memory_get_usage(true),
                'peak_memory' => memory_get_peak_usage(true)
            ];
        } catch (\Exception $e) {
            return [
                'totalConnections' => count($this->clients),
                'authenticatedUsers' => count($this->userConnections),
                'activeRooms' => count($this->rooms),
                'uptime' => time() - $_SERVER['REQUEST_TIME'],
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Handle spam message detection
     */
    private function handleSpamMessage(ConnectionInterface $conn, string $message, array $spamResult) {
        try {
            $action = $spamResult['action'];
            $spamLevel = $spamResult['spam_level'];
            $flags = $spamResult['flags'];

            switch ($action) {
                case 'block':
                    // Block the message and apply penalty
                    $this->rateLimitService->applyPenalty($conn->userId, $conn->roomId ?? '', 'spam_detected', 600); // 10 minutes
                    $this->sendError($conn, 'Message blocked due to spam detection');
                    echo "Blocked spam message from user {$conn->userId}: " . implode(', ', $flags) . "\n";
                    break;

                case 'warn':
                    // Send warning but allow message
                    $this->sendToConnection($conn, [
                        'type' => 'warning',
                        'message' => 'Your message may contain spam content. Please review our guidelines.',
                        'flags' => $flags
                    ]);
                    break;

                case 'flag':
                    // Flag for review but allow message
                    echo "Flagged message from user {$conn->userId}: " . implode(', ', $flags) . "\n";
                    break;
            }

        } catch (\Exception $e) {
            echo "Error handling spam message: " . $e->getMessage() . "\n";
        }
    }



    /**
     * Enhanced message recording with rate limiting
     */
    private function recordMessageForRateLimit(ConnectionInterface $conn, string $message) {
        try {
            $this->rateLimitService->recordMessage(
                $conn->userId,
                $conn->roomId ?? '',
                $message
            );

            // Update connection activity
            if (isset($conn->connectionId)) {
                $this->connectionManager->updateActivity($conn, 'message_sent');
            }

        } catch (\Exception $e) {
            echo "Error recording message for rate limiting: " . $e->getMessage() . "\n";
        }
    }

    /**
     * Handle emoji reaction to message
     */
    protected function handleReaction(ConnectionInterface $conn, array $data) {
        if (!isset($conn->userId) || !isset($conn->currentRoom)) {
            $this->sendError($conn, 'Must be authenticated and in a room');
            return;
        }

        $messageId = $data['messageId'] ?? '';
        $emoji = $data['emoji'] ?? '';

        if (empty($messageId) || empty($emoji)) {
            $this->sendError($conn, 'Message ID and emoji are required');
            return;
        }

        try {
            // Add reaction using emoji service
            $result = $this->emojiService->addReaction(
                $messageId,
                $conn->userId,
                $conn->userName,
                $emoji,
                $conn->currentRoom
            );

            if ($result['success']) {
                // Broadcast reaction update to room
                $reactionData = [
                    'type' => 'reaction_update',
                    'messageId' => $messageId,
                    'action' => $result['action'], // 'added' or 'removed'
                    'user' => [
                        'id' => $conn->userId,
                        'name' => $conn->userName
                    ],
                    'emoji' => $emoji,
                    'reactions' => $result['reactions'],
                    'reaction_summary' => $result['reaction_summary'],
                    'total_reactions' => $result['total_reactions'],
                    'timestamp' => time()
                ];

                $this->broadcastToRoom($conn->currentRoom, $reactionData);

                echo "Reaction {$result['action']}: {$emoji} by {$conn->userName} on message {$messageId}\n";
            } else {
                $this->sendError($conn, $result['error']);
            }

        } catch (\Exception $e) {
            $this->sendError($conn, 'Failed to process reaction');
            echo "Reaction error: " . $e->getMessage() . "\n";
        }
    }

    /**
     * Handle emoji data requests
     */
    protected function handleGetEmojis(ConnectionInterface $conn, array $data) {
        try {
            $requestType = $data['requestType'] ?? 'categories';

            switch ($requestType) {
                case 'categories':
                    $emojiData = $this->emojiService->getEmojiCategories();
                    break;

                case 'popular':
                    $roomId = $conn->currentRoom ?? null;
                    $limit = $data['limit'] ?? 20;
                    $emojiData = $this->emojiService->getPopularEmojis($roomId, $limit);
                    break;

                case 'search':
                    $query = $data['query'] ?? '';
                    $limit = $data['limit'] ?? 50;
                    $emojiData = $this->emojiService->searchEmojis($query, $limit);
                    break;

                case 'statistics':
                    $roomId = $conn->currentRoom ?? null;
                    $timeframe = $data['timeframe'] ?? 86400; // 24 hours
                    $emojiData = $this->emojiService->getReactionStatistics($roomId, $timeframe);
                    break;

                default:
                    $this->sendError($conn, 'Invalid emoji request type');
                    return;
            }

            $this->sendToConnection($conn, [
                'type' => 'emoji_data',
                'requestType' => $requestType,
                'data' => $emojiData,
                'timestamp' => time()
            ]);

        } catch (\Exception $e) {
            $this->sendError($conn, 'Failed to get emoji data');
            echo "Emoji data error: " . $e->getMessage() . "\n";
        }
    }

    /**
     * Handle formatting help requests
     */
    protected function handleGetFormattingHelp(ConnectionInterface $conn, array $data) {
        try {
            $helpData = $this->formattingService->getFormattingHelp();

            $this->sendToConnection($conn, [
                'type' => 'formatting_help',
                'data' => $helpData,
                'examples' => [
                    'bold' => '**This is bold text**',
                    'italic' => '*This is italic text*',
                    'underline' => '__This is underlined text__',
                    'strikethrough' => '~~This is strikethrough text~~',
                    'code' => '`This is inline code`',
                    'code_block' => "```\nThis is a code block\n```",
                    'quote' => '> This is a quote',
                    'mention' => '@username',
                    'link' => 'https://example.com'
                ],
                'timestamp' => time()
            ]);

        } catch (\Exception $e) {
            $this->sendError($conn, 'Failed to get formatting help');
            echo "Formatting help error: " . $e->getMessage() . "\n";
        }
    }

    /**
     * Handle moderation actions
     */
    protected function handleModerateUser(ConnectionInterface $conn, array $data) {
        if (!isset($conn->userId) || !in_array($conn->userRole, ['admin', 'moderator', 'host'])) {
            $this->sendError($conn, 'Insufficient permissions');
            return;
        }

        $action = $data['action'] ?? '';
        $targetUserId = $data['target_user_id'] ?? '';
        $reason = $data['reason'] ?? 'No reason provided';
        $duration = $data['duration'] ?? 300; // 5 minutes default
        $roomId = $conn->currentRoom;

        if (empty($targetUserId) || empty($action)) {
            $this->sendError($conn, 'Target user ID and action are required');
            return;
        }

        try {
            $result = null;

            switch ($action) {
                case 'mute':
                    $result = $this->moderationService->muteUser($targetUserId, $roomId, $duration, $reason, $conn->userId);
                    break;

                case 'unmute':
                    $result = $this->moderationService->unmuteUser($targetUserId, $roomId, $conn->userId);
                    break;

                case 'ban':
                    $permanent = $data['permanent'] ?? false;
                    $result = $this->moderationService->banUser($targetUserId, $roomId, $reason, $conn->userId, $permanent);
                    break;

                case 'unban':
                    $result = $this->moderationService->unbanUser($targetUserId, $roomId, $conn->userId);
                    break;

                case 'warn':
                    $result = $this->moderationService->warnUser($targetUserId, $roomId, $reason, $conn->userId);
                    break;

                default:
                    $this->sendError($conn, 'Unknown moderation action');
                    return;
            }

            if ($result) {
                // Notify the moderator
                $this->sendToConnection($conn, [
                    'type' => 'moderation_success',
                    'action' => $action,
                    'target_user_id' => $targetUserId,
                    'result' => $result
                ]);

                // Notify the target user if they're connected
                $this->notifyUserOfModerationAction($targetUserId, $action, $reason, $duration);

                // Broadcast to other moderators
                $this->broadcastToModerators($roomId, [
                    'type' => 'moderation_action',
                    'action' => $action,
                    'target_user_id' => $targetUserId,
                    'moderator_id' => $conn->userId,
                    'reason' => $reason,
                    'timestamp' => time()
                ], $conn->userId);

            } else {
                $this->sendError($conn, 'Failed to execute moderation action');
            }

        } catch (\Exception $e) {
            $this->sendError($conn, 'Error executing moderation action: ' . $e->getMessage());
        }
    }

    /**
     * Handle message deletion
     */
    protected function handleDeleteMessage(ConnectionInterface $conn, array $data) {
        if (!isset($conn->userId) || !in_array($conn->userRole, ['admin', 'moderator', 'host'])) {
            $this->sendError($conn, 'Insufficient permissions');
            return;
        }

        $messageId = $data['message_id'] ?? '';
        $reason = $data['reason'] ?? 'No reason provided';
        $roomId = $conn->currentRoom;

        if (empty($messageId)) {
            $this->sendError($conn, 'Message ID is required');
            return;
        }

        try {
            $result = $this->moderationService->deleteMessage($messageId, $roomId, $reason, $conn->userId);

            if ($result) {
                // Notify the moderator
                $this->sendToConnection($conn, [
                    'type' => 'message_deleted',
                    'message_id' => $messageId,
                    'reason' => $reason
                ]);

                // Broadcast message deletion to all users in room
                $this->broadcastToRoom($roomId, [
                    'type' => 'message_deleted',
                    'message_id' => $messageId,
                    'deleted_by' => $conn->userId,
                    'reason' => $reason,
                    'timestamp' => time()
                ]);

            } else {
                $this->sendError($conn, 'Failed to delete message');
            }

        } catch (\Exception $e) {
            $this->sendError($conn, 'Error deleting message: ' . $e->getMessage());
        }
    }

    /**
     * Handle moderation statistics request
     */
    protected function handleGetModerationStats(ConnectionInterface $conn, array $data) {
        if (!isset($conn->userId) || !in_array($conn->userRole, ['admin', 'moderator', 'host'])) {
            $this->sendError($conn, 'Insufficient permissions');
            return;
        }

        try {
            $roomId = $data['room_id'] ?? $conn->currentRoom;
            $days = $data['days'] ?? 7;

            $stats = $this->moderationService->getModerationStats($roomId, $days);

            $this->sendToConnection($conn, [
                'type' => 'moderation_stats',
                'data' => $stats,
                'room_id' => $roomId,
                'days' => $days,
                'timestamp' => time()
            ]);

        } catch (\Exception $e) {
            $this->sendError($conn, 'Error getting moderation stats: ' . $e->getMessage());
        }
    }

    /**
     * Handle user history request
     */
    protected function handleGetUserHistory(ConnectionInterface $conn, array $data) {
        if (!isset($conn->userId) || !in_array($conn->userRole, ['admin', 'moderator', 'host'])) {
            $this->sendError($conn, 'Insufficient permissions');
            return;
        }

        $targetUserId = $data['user_id'] ?? '';

        if (empty($targetUserId)) {
            $this->sendError($conn, 'User ID is required');
            return;
        }

        try {
            $history = $this->moderationService->getUserModerationHistory($targetUserId);

            $this->sendToConnection($conn, [
                'type' => 'user_history',
                'user_id' => $targetUserId,
                'data' => $history,
                'timestamp' => time()
            ]);

        } catch (\Exception $e) {
            $this->sendError($conn, 'Error getting user history: ' . $e->getMessage());
        }
    }

    /**
     * Notify user of moderation action
     */
    private function notifyUserOfModerationAction(string $userId, string $action, string $reason, int $duration = null) {
        if (isset($this->userConnections[$userId])) {
            $conn = $this->userConnections[$userId];

            $notification = [
                'type' => 'moderation_action',
                'action' => $action,
                'reason' => $reason,
                'timestamp' => time()
            ];

            if ($duration) {
                $notification['duration'] = $duration;
                $notification['expires_at'] = time() + $duration;
            }

            $this->sendToConnection($conn, $notification);
        }
    }

    /**
     * Broadcast to moderators
     */
    private function broadcastToModerators(string $roomId, array $message, string $excludeUserId = null) {
        foreach ($this->userConnections as $userId => $conn) {
            if ($userId === $excludeUserId) {
                continue;
            }

            if (isset($conn->currentRoom) && $conn->currentRoom === $roomId &&
                in_array($conn->userRole ?? 'guest', ['admin', 'moderator', 'host'])) {
                $this->sendToConnection($conn, $message);
            }
        }
    }

    /**
     * Count emojis in a message
     */
    private function countEmojisInMessage(string $message) {
        // Count Unicode emojis
        $count = preg_match_all('/[\x{1F600}-\x{1F64F}]|[\x{1F300}-\x{1F5FF}]|[\x{1F680}-\x{1F6FF}]|[\x{1F1E0}-\x{1F1FF}]|[\x{2600}-\x{26FF}]|[\x{2700}-\x{27BF}]/u', $message);

        // Count shortcode emojis
        $shortcodeCount = preg_match_all('/:([\w\+\-]+):/', $message);

        return $count + $shortcodeCount;
    }

    /**
     * Periodic cleanup of stale connections and expired sessions
     */
    public function performPeriodicCleanup() {
        try {
            // Clean up stale connections
            $staleCount = $this->connectionManager->cleanupStaleConnections();

            // Clean up expired sessions
            $expiredCount = $this->chatAuthService->cleanupExpiredSessions();

            if ($staleCount > 0 || $expiredCount > 0) {
                echo "Cleanup completed: $staleCount stale connections, $expiredCount expired sessions\n";
            }

        } catch (\Exception $e) {
            echo "Error during periodic cleanup: " . $e->getMessage() . "\n";
        }
    }

    /**
     * Handle advanced user moderation actions
     */
    protected function handleUserModerationAction(ConnectionInterface $conn, array $data) {
        // Check permissions
        if (!in_array($conn->userRole ?? 'guest', ['admin', 'moderator', 'host'])) {
            $this->sendError($conn, 'Insufficient permissions for user moderation');
            return;
        }

        $action = $data['action'] ?? '';
        $targetUserId = $data['target_user_id'] ?? '';
        $severity = $data['severity'] ?? 'moderate';
        $duration = $data['duration'] ?? null;
        $reason = $data['reason'] ?? '';
        $roomId = $data['room_id'] ?? $conn->roomId;

        if (empty($targetUserId) || empty($reason)) {
            $this->sendError($conn, 'Missing required fields for moderation action');
            return;
        }

        try {
            $result = null;

            switch ($action) {
                case 'mute':
                    $result = $this->userModerationService->muteUser([
                        'user_id' => $targetUserId,
                        'room_id' => $roomId,
                        'moderator_id' => $conn->userId,
                        'reason' => $reason,
                        'severity' => $severity,
                        'duration' => $duration
                    ]);
                    break;

                case 'ban':
                    $result = $this->userModerationService->banUser([
                        'user_id' => $targetUserId,
                        'room_id' => $roomId,
                        'moderator_id' => $conn->userId,
                        'reason' => $reason,
                        'severity' => $severity,
                        'duration' => $duration,
                        'permanent' => $duration === 0
                    ]);
                    break;

                case 'unmute':
                    $result = $this->userModerationService->unmuteUser($targetUserId, $roomId, $conn->userId, $reason);
                    break;

                case 'unban':
                    $result = $this->userModerationService->unbanUser($targetUserId, $roomId, $conn->userId, $reason);
                    break;

                case 'warn':
                    $result = $this->moderationService->warnUser($targetUserId, $roomId, $reason, $conn->userId);
                    break;

                default:
                    $this->sendError($conn, 'Unknown moderation action: ' . $action);
                    return;
            }

            if ($result && (isset($result['success']) ? $result['success'] : true)) {
                // Send success response
                $conn->send(json_encode([
                    'type' => 'user_moderation_success',
                    'action' => $action,
                    'target_user_id' => $targetUserId,
                    'result' => $result
                ]));

                // Notify target user if they're connected
                $this->notifyUserOfModerationAction($targetUserId, $action, $reason, $duration);

                // Broadcast to other moderators
                $this->broadcastToModerators($roomId, [
                    'type' => 'moderation_action_broadcast',
                    'action' => $action,
                    'target_user_id' => $targetUserId,
                    'moderator_id' => $conn->userId,
                    'reason' => $reason,
                    'timestamp' => time()
                ], $conn->userId);

            } else {
                $this->sendError($conn, $result['message'] ?? 'Moderation action failed');
            }

        } catch (Exception $e) {
            error_log("User moderation action error: " . $e->getMessage());
            $this->sendError($conn, 'Failed to execute moderation action');
        }
    }

    /**
     * Handle appeal review
     */
    protected function handleReviewAppeal(ConnectionInterface $conn, array $data) {
        // Check permissions
        if (!in_array($conn->userRole ?? 'guest', ['admin', 'moderator'])) {
            $this->sendError($conn, 'Insufficient permissions to review appeals');
            return;
        }

        $appealId = $data['appeal_id'] ?? '';
        $decision = $data['decision'] ?? '';
        $reason = $data['reason'] ?? '';

        if (empty($appealId) || empty($decision) || empty($reason)) {
            $this->sendError($conn, 'Missing required fields for appeal review');
            return;
        }

        try {
            $result = $this->userModerationService->reviewAppeal($appealId, $conn->userId, $decision, $reason);

            if ($result['success']) {
                $conn->send(json_encode([
                    'type' => 'appeal_review_success',
                    'appeal_id' => $appealId,
                    'decision' => $decision,
                    'result' => $result
                ]));

                // Broadcast to other moderators
                $this->broadcastToModerators($conn->roomId ?? 'global', [
                    'type' => 'appeal_reviewed',
                    'appeal_id' => $appealId,
                    'decision' => $decision,
                    'reviewed_by' => $conn->userId,
                    'timestamp' => time()
                ], $conn->userId);

            } else {
                $this->sendError($conn, $result['message']);
            }

        } catch (Exception $e) {
            error_log("Appeal review error: " . $e->getMessage());
            $this->sendError($conn, 'Failed to review appeal');
        }
    }

    /**
     * Handle bulk moderation actions
     */
    protected function handleBulkAction(ConnectionInterface $conn, array $data) {
        // Check permissions
        if (!in_array($conn->userRole ?? 'guest', ['admin', 'moderator'])) {
            $this->sendError($conn, 'Insufficient permissions for bulk actions');
            return;
        }

        $action = $data['action'] ?? '';
        $roomId = $data['room_id'] ?? $conn->roomId;

        try {
            $result = null;

            switch ($action) {
                case 'clear_all_mutes':
                    // Clear all mutes in the room
                    $result = $this->clearAllMutesInRoom($roomId, $conn->userId);
                    break;

                case 'cleanup_expired':
                    // Clean up expired violations
                    $result = $this->userModerationService->cleanupExpiredViolations();
                    break;

                default:
                    $this->sendError($conn, 'Unknown bulk action: ' . $action);
                    return;
            }

            $conn->send(json_encode([
                'type' => 'bulk_action_success',
                'action' => $action,
                'result' => $result
            ]));

            // Broadcast to other moderators
            $this->broadcastToModerators($roomId, [
                'type' => 'bulk_action_broadcast',
                'action' => $action,
                'moderator_id' => $conn->userId,
                'result' => $result,
                'timestamp' => time()
            ], $conn->userId);

        } catch (Exception $e) {
            error_log("Bulk action error: " . $e->getMessage());
            $this->sendError($conn, 'Failed to execute bulk action');
        }
    }

    /**
     * Handle get user moderation status
     */
    protected function handleGetUserStatus(ConnectionInterface $conn, array $data) {
        $userId = $data['user_id'] ?? '';
        $roomId = $data['room_id'] ?? $conn->roomId;

        if (empty($userId)) {
            $this->sendError($conn, 'User ID is required');
            return;
        }

        try {
            $status = $this->userModerationService->getUserModerationStatus($userId, $roomId);

            $conn->send(json_encode([
                'type' => 'user_status',
                'user_id' => $userId,
                'status' => $status
            ]));

        } catch (Exception $e) {
            error_log("Get user status error: " . $e->getMessage());
            $this->sendError($conn, 'Failed to get user status');
        }
    }

    /**
     * Handle user appeal submission
     */
    protected function handleSubmitAppeal(ConnectionInterface $conn, array $data) {
        $violationId = $data['violation_id'] ?? '';
        $violationType = $data['violation_type'] ?? '';
        $reason = $data['reason'] ?? '';

        if (empty($violationId) || empty($violationType) || empty($reason)) {
            $this->sendError($conn, 'Missing required fields for appeal submission');
            return;
        }

        try {
            $result = $this->userModerationService->submitAppeal([
                'user_id' => $conn->userId,
                'violation_id' => $violationId,
                'violation_type' => $violationType,
                'reason' => $reason
            ]);

            if ($result['success']) {
                $conn->send(json_encode([
                    'type' => 'appeal_submitted',
                    'appeal_id' => $result['appeal_id']
                ]));

                // Notify moderators of new appeal
                $this->broadcastToModerators($conn->roomId ?? 'global', [
                    'type' => 'new_appeal',
                    'appeal_id' => $result['appeal_id'],
                    'user_id' => $conn->userId,
                    'violation_type' => $violationType,
                    'timestamp' => time()
                ], $conn->userId);

            } else {
                $this->sendError($conn, $result['message']);
            }

        } catch (Exception $e) {
            error_log("Submit appeal error: " . $e->getMessage());
            $this->sendError($conn, 'Failed to submit appeal');
        }
    }

    /**
     * Clear all mutes in a room
     */
    private function clearAllMutesInRoom(string $roomId, string $moderatorId) {
        $cleared = 0;

        // This would iterate through all active mutes for the room
        // For now, return a mock result
        return [
            'cleared_count' => $cleared,
            'room_id' => $roomId,
            'moderator_id' => $moderatorId,
            'timestamp' => time()
        ];
    }

    /**
     * Handle profanity filter word list updates
     */
    private function handleProfanityFilterUpdate(ConnectionInterface $conn, array $data) {
        if (!$this->hasModeratorPermissions($conn)) {
            $this->sendError($conn, 'Insufficient permissions for profanity filter management');
            return;
        }

        $action = $data['action'] ?? '';
        $wordData = $data['data'] ?? [];

        try {
            switch ($action) {
                case 'add_profanity':
                    $result = $this->profanityFilterService->addCustomProfanityWord(
                        $wordData['word'],
                        $wordData['severity'] ?? 'moderate'
                    );
                    break;

                case 'remove_profanity':
                    $result = $this->profanityFilterService->removeCustomProfanityWord(
                        $wordData['word'],
                        $wordData['severity'] ?? null
                    );
                    break;

                case 'add_whitelist':
                    $result = $this->profanityFilterService->addWhitelistWord($wordData['word']);
                    break;

                case 'remove_whitelist':
                    $result = $this->profanityFilterService->removeWhitelistWord($wordData['word']);
                    break;

                default:
                    $this->sendError($conn, 'Invalid profanity filter action');
                    return;
            }

            if ($result) {
                $this->sendToConnection($conn, [
                    'type' => 'profanity_filter_success',
                    'message' => 'Word list updated successfully',
                    'action' => $action
                ]);
            } else {
                $this->sendError($conn, 'Failed to update word list');
            }

        } catch (Exception $e) {
            $this->sendError($conn, 'Error updating profanity filter: ' . $e->getMessage());
        }
    }

    /**
     * Handle profanity filter configuration updates
     */
    private function handleProfanityFilterConfig(ConnectionInterface $conn, array $data) {
        if (!$this->hasModeratorPermissions($conn)) {
            $this->sendError($conn, 'Insufficient permissions for profanity filter configuration');
            return;
        }

        $config = $data['config'] ?? [];

        try {
            $result = $this->profanityFilterService->updateFilterConfig($config);

            if ($result) {
                $this->sendToConnection($conn, [
                    'type' => 'profanity_filter_success',
                    'message' => 'Configuration updated successfully'
                ]);
            } else {
                $this->sendError($conn, 'Failed to update configuration');
            }

        } catch (Exception $e) {
            $this->sendError($conn, 'Error updating configuration: ' . $e->getMessage());
        }
    }

    /**
     * Handle profanity filter testing
     */
    private function handleProfanityFilterTest(ConnectionInterface $conn, array $data) {
        if (!$this->hasModeratorPermissions($conn)) {
            $this->sendError($conn, 'Insufficient permissions for profanity filter testing');
            return;
        }

        $content = $data['content'] ?? '';

        if (empty($content)) {
            $this->sendError($conn, 'No content provided for testing');
            return;
        }

        try {
            $result = $this->profanityFilterService->testFilter($content);

            $this->sendToConnection($conn, [
                'type' => 'profanity_filter_test_result',
                'result' => $result
            ]);

        } catch (Exception $e) {
            $this->sendError($conn, 'Error testing filter: ' . $e->getMessage());
        }
    }

    /**
     * Handle profanity filter configuration import
     */
    private function handleProfanityFilterImport(ConnectionInterface $conn, array $data) {
        if (!$this->hasModeratorPermissions($conn)) {
            $this->sendError($conn, 'Insufficient permissions for profanity filter import');
            return;
        }

        $importData = $data['data'] ?? [];

        try {
            $result = $this->profanityFilterService->importFilterData($importData);

            if ($result) {
                $this->sendToConnection($conn, [
                    'type' => 'profanity_filter_success',
                    'message' => 'Configuration imported successfully'
                ]);
            } else {
                $this->sendError($conn, 'Failed to import configuration');
            }

        } catch (Exception $e) {
            $this->sendError($conn, 'Error importing configuration: ' . $e->getMessage());
        }
    }

    /**
     * Handle profanity filter log cleanup
     */
    private function handleProfanityFilterCleanup(ConnectionInterface $conn, array $data) {
        if (!$this->hasModeratorPermissions($conn)) {
            $this->sendError($conn, 'Insufficient permissions for profanity filter cleanup');
            return;
        }

        try {
            $cleanedCount = $this->profanityFilterService->cleanupOldLogs(30);

            $this->sendToConnection($conn, [
                'type' => 'profanity_filter_success',
                'message' => "Cleaned up {$cleanedCount} old log files"
            ]);

        } catch (Exception $e) {
            $this->sendError($conn, 'Error cleaning up logs: ' . $e->getMessage());
        }
    }

    /**
     * Handle get available commands request
     */
    private function handleGetAvailableCommands(ConnectionInterface $conn, array $data) {
        try {
            $userRole = $conn->userRole ?? 'guest';
            $commands = $this->chatCommandService->getAvailableCommands($userRole);

            $this->sendToConnection($conn, [
                'type' => 'available_commands',
                'commands' => $commands,
                'user_role' => $userRole
            ]);

        } catch (Exception $e) {
            $this->sendError($conn, 'Error getting available commands: ' . $e->getMessage());
        }
    }

    /**
     * Handle get command statistics request
     */
    private function handleGetCommandStatistics(ConnectionInterface $conn, array $data) {
        if (!$this->hasModeratorPermissions($conn)) {
            $this->sendError($conn, 'Insufficient permissions for command statistics');
            return;
        }

        try {
            $days = $data['days'] ?? 7;
            $statistics = $this->chatCommandService->getCommandStatistics($days);

            $this->sendToConnection($conn, [
                'type' => 'command_statistics',
                'statistics' => $statistics,
                'days' => $days
            ]);

        } catch (Exception $e) {
            $this->sendError($conn, 'Error getting command statistics: ' . $e->getMessage());
        }
    }

    /**
     * Handle send private message request
     */
    private function handleSendPrivateMessage(ConnectionInterface $conn, array $data) {
        try {
            // Validate required fields
            if (empty($data['recipient_id']) || empty($data['message'])) {
                $this->sendError($conn, 'Missing required fields: recipient_id, message');
                return;
            }

            // Prepare message data
            $messageData = [
                'sender_id' => $conn->userId,
                'sender_name' => $conn->userName ?? 'Unknown',
                'sender_role' => $conn->userRole ?? 'participant',
                'recipient_id' => $data['recipient_id'],
                'recipient_name' => $data['recipient_name'] ?? 'Unknown',
                'message' => $data['message'],
                'message_type' => $data['message_type'] ?? 'text',
                'room_id' => $data['room_id'] ?? 'default',
                'attachment' => $data['attachment'] ?? null
            ];

            // Send private message
            $result = $this->privateMessageService->sendPrivateMessage($messageData);

            if ($result['success']) {
                // Send confirmation to sender
                $this->sendToConnection($conn, [
                    'type' => 'private_message_sent',
                    'success' => true,
                    'message' => $result['message'],
                    'conversation_id' => $result['conversation_id']
                ]);

                // Send message to recipient if online
                $recipientConn = $this->findConnectionByUserId($data['recipient_id']);
                if ($recipientConn) {
                    $this->sendToConnection($recipientConn, [
                        'type' => 'private_message_received',
                        'message' => $result['message'],
                        'conversation_id' => $result['conversation_id']
                    ]);
                }

            } else {
                $this->sendError($conn, $result['error'], $result['error_code'] ?? 'PM_ERROR');
            }

        } catch (Exception $e) {
            $this->sendError($conn, 'Error sending private message: ' . $e->getMessage());
        }
    }

    /**
     * Handle get private conversations request
     */
    private function handleGetPrivateConversations(ConnectionInterface $conn, array $data) {
        try {
            $options = [
                'limit' => $data['limit'] ?? 20,
                'offset' => $data['offset'] ?? 0
            ];

            $result = $this->privateMessageService->getUserConversations($conn->userId, $options);

            if ($result['success']) {
                $this->sendToConnection($conn, [
                    'type' => 'private_conversations',
                    'conversations' => $result['conversations'],
                    'total_count' => $result['total_count']
                ]);
            } else {
                $this->sendError($conn, $result['error']);
            }

        } catch (Exception $e) {
            $this->sendError($conn, 'Error getting conversations: ' . $e->getMessage());
        }
    }

    /**
     * Handle get conversation history request
     */
    private function handleGetConversationHistory(ConnectionInterface $conn, array $data) {
        try {
            if (empty($data['other_user_id'])) {
                $this->sendError($conn, 'Missing required field: other_user_id');
                return;
            }

            $options = [
                'limit' => $data['limit'] ?? 50,
                'offset' => $data['offset'] ?? 0,
                'before' => $data['before'] ?? null,
                'after' => $data['after'] ?? null
            ];

            $result = $this->privateMessageService->getConversationHistory(
                $conn->userId,
                $data['other_user_id'],
                $options
            );

            if ($result['success']) {
                $this->sendToConnection($conn, [
                    'type' => 'conversation_history',
                    'messages' => $result['messages'],
                    'conversation_id' => $result['conversation_id'],
                    'total_count' => $result['total_count']
                ]);
            } else {
                $this->sendError($conn, $result['error']);
            }

        } catch (Exception $e) {
            $this->sendError($conn, 'Error getting conversation history: ' . $e->getMessage());
        }
    }

    /**
     * Handle mark messages as read request
     */
    private function handleMarkMessagesRead(ConnectionInterface $conn, array $data) {
        try {
            if (empty($data['conversation_id'])) {
                $this->sendError($conn, 'Missing required field: conversation_id');
                return;
            }

            $messageIds = $data['message_ids'] ?? [];

            $result = $this->privateMessageService->markMessagesAsRead(
                $conn->userId,
                $data['conversation_id'],
                $messageIds
            );

            if ($result['success']) {
                $this->sendToConnection($conn, [
                    'type' => 'messages_marked_read',
                    'success' => true,
                    'updated_count' => $result['updated_count'],
                    'conversation_id' => $data['conversation_id']
                ]);
            } else {
                $this->sendError($conn, $result['error']);
            }

        } catch (Exception $e) {
            $this->sendError($conn, 'Error marking messages as read: ' . $e->getMessage());
        }
    }

    /**
     * Handle delete private message request
     */
    private function handleDeletePrivateMessage(ConnectionInterface $conn, array $data) {
        try {
            if (empty($data['message_id'])) {
                $this->sendError($conn, 'Missing required field: message_id');
                return;
            }

            $reason = $data['reason'] ?? 'User deleted message';

            $result = $this->privateMessageService->deleteMessage(
                $conn->userId,
                $data['message_id'],
                $reason
            );

            if ($result['success']) {
                $this->sendToConnection($conn, [
                    'type' => 'private_message_deleted',
                    'success' => true,
                    'message_id' => $result['message_id']
                ]);
            } else {
                $this->sendError($conn, $result['error']);
            }

        } catch (Exception $e) {
            $this->sendError($conn, 'Error deleting private message: ' . $e->getMessage());
        }
    }

    /**
     * Handle block/unblock user request
     */
    private function handleBlockUser(ConnectionInterface $conn, array $data) {
        try {
            if (empty($data['target_user_id'])) {
                $this->sendError($conn, 'Missing required field: target_user_id');
                return;
            }

            $block = $data['block'] ?? true;

            $result = $this->privateMessageService->blockUser(
                $conn->userId,
                $data['target_user_id'],
                $block
            );

            if ($result['success']) {
                $this->sendToConnection($conn, [
                    'type' => 'user_block_updated',
                    'success' => true,
                    'action' => $result['action'],
                    'target_user_id' => $result['target_user_id']
                ]);
            } else {
                $this->sendError($conn, $result['error']);
            }

        } catch (Exception $e) {
            $this->sendError($conn, 'Error updating user block status: ' . $e->getMessage());
        }
    }

    /**
     * Handle get private message statistics request
     */
    private function handleGetPrivateMessageStats(ConnectionInterface $conn, array $data) {
        try {
            // Check if user has permission to view stats
            if (!in_array($conn->userRole ?? 'guest', ['admin', 'moderator'])) {
                $this->sendError($conn, 'Permission denied');
                return;
            }

            $days = $data['days'] ?? 7;
            $statistics = $this->privateMessageService->getPrivateMessageStatistics($days);

            $this->sendToConnection($conn, [
                'type' => 'private_message_statistics',
                'statistics' => $statistics,
                'days' => $days
            ]);

        } catch (Exception $e) {
            $this->sendError($conn, 'Error getting private message statistics: ' . $e->getMessage());
        }
    }

    /**
     * Find connection by user ID
     */
    private function findConnectionByUserId(string $userId) {
        foreach ($this->clients as $client) {
            if (isset($client->userId) && $client->userId === $userId) {
                return $client;
            }
        }
        return null;
    }

    /**
     * Handle export room chat request
     */
    private function handleExportRoomChat(ConnectionInterface $conn, array $data) {
        try {
            if (empty($data['room_id'])) {
                $this->sendError($conn, 'Missing required field: room_id');
                return;
            }

            $options = [
                'user_id' => $conn->userId,
                'user_role' => $conn->userRole ?? 'guest',
                'format' => $data['format'] ?? 'json',
                'limit' => $data['limit'] ?? 1000,
                'start_date' => $data['start_date'] ?? null,
                'end_date' => $data['end_date'] ?? null,
                'include_deleted' => $data['include_deleted'] ?? false,
                'include_moderated' => $data['include_moderated'] ?? true
            ];

            $result = $this->chatExportService->exportRoomChat($data['room_id'], $options);

            if ($result['success']) {
                $this->sendToConnection($conn, [
                    'type' => 'chat_export_ready',
                    'success' => true,
                    'export_id' => $result['export_id'],
                    'filename' => $result['filename'],
                    'file_size' => $result['file_size'],
                    'record_count' => $result['record_count'],
                    'format' => $result['format'],
                    'download_url' => $result['download_url'],
                    'expires_at' => $result['expires_at']
                ]);
            } else {
                $this->sendError($conn, $result['error'], $result['error_code'] ?? 'EXPORT_ERROR');
            }

        } catch (Exception $e) {
            $this->sendError($conn, 'Error exporting room chat: ' . $e->getMessage());
        }
    }

    /**
     * Handle export private messages request
     */
    private function handleExportPrivateMessages(ConnectionInterface $conn, array $data) {
        try {
            $targetUserId = $data['user_id'] ?? $conn->userId;

            $options = [
                'requesting_user_id' => $conn->userId,
                'requesting_user_role' => $conn->userRole ?? 'guest',
                'format' => $data['format'] ?? 'json',
                'limit' => $data['limit'] ?? 1000,
                'start_date' => $data['start_date'] ?? null,
                'end_date' => $data['end_date'] ?? null
            ];

            $result = $this->chatExportService->exportPrivateMessages($targetUserId, $options);

            if ($result['success']) {
                $this->sendToConnection($conn, [
                    'type' => 'private_messages_export_ready',
                    'success' => true,
                    'export_id' => $result['export_id'],
                    'filename' => $result['filename'],
                    'file_size' => $result['file_size'],
                    'record_count' => $result['record_count'],
                    'format' => $result['format'],
                    'download_url' => $result['download_url'],
                    'expires_at' => $result['expires_at']
                ]);
            } else {
                $this->sendError($conn, $result['error'], $result['error_code'] ?? 'EXPORT_ERROR');
            }

        } catch (Exception $e) {
            $this->sendError($conn, 'Error exporting private messages: ' . $e->getMessage());
        }
    }

    /**
     * Handle export moderation logs request
     */
    private function handleExportModerationLogs(ConnectionInterface $conn, array $data) {
        try {
            $options = [
                'user_id' => $conn->userId,
                'user_role' => $conn->userRole ?? 'guest',
                'format' => $data['format'] ?? 'json',
                'limit' => $data['limit'] ?? 1000,
                'start_date' => $data['start_date'] ?? null,
                'end_date' => $data['end_date'] ?? null,
                'action_type' => $data['action_type'] ?? null,
                'moderator_id' => $data['moderator_id'] ?? null
            ];

            $result = $this->chatExportService->exportModerationLogs($options);

            if ($result['success']) {
                $this->sendToConnection($conn, [
                    'type' => 'moderation_logs_export_ready',
                    'success' => true,
                    'export_id' => $result['export_id'],
                    'filename' => $result['filename'],
                    'file_size' => $result['file_size'],
                    'record_count' => $result['record_count'],
                    'format' => $result['format'],
                    'download_url' => $result['download_url'],
                    'expires_at' => $result['expires_at']
                ]);
            } else {
                $this->sendError($conn, $result['error'], $result['error_code'] ?? 'EXPORT_ERROR');
            }

        } catch (Exception $e) {
            $this->sendError($conn, 'Error exporting moderation logs: ' . $e->getMessage());
        }
    }

    /**
     * Handle get export statistics request
     */
    private function handleGetExportStatistics(ConnectionInterface $conn, array $data) {
        try {
            // Check if user has permission to view export stats
            if (!in_array($conn->userRole ?? 'guest', ['admin', 'moderator'])) {
                $this->sendError($conn, 'Permission denied');
                return;
            }

            $days = $data['days'] ?? 30;
            $statistics = $this->chatExportService->getExportStatistics($days);

            $this->sendToConnection($conn, [
                'type' => 'export_statistics',
                'statistics' => $statistics,
                'days' => $days
            ]);

        } catch (Exception $e) {
            $this->sendError($conn, 'Error getting export statistics: ' . $e->getMessage());
        }
    }
}
