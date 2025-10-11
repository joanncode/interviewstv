<?php

namespace InterviewsTV\Controllers;

use InterviewsTV\Services\ChatService;
use InterviewsTV\Services\AuthService;

class ChatController {
    private $chatService;
    private $authService;
    
    public function __construct() {
        $this->chatService = new ChatService();
        $this->authService = new AuthService();
    }
    
    /**
     * Get chat messages for a room
     * GET /api/chat/rooms/{roomId}/messages
     */
    public function getMessages($roomId) {
        try {
            // Validate authentication
            $user = $this->validateAuth();
            if (!$user) {
                return $this->jsonResponse(['error' => 'Authentication required'], 401);
            }
            
            $limit = (int)($_GET['limit'] ?? 50);
            $offset = (int)($_GET['offset'] ?? 0);
            
            // Validate limit
            if ($limit > 100) {
                $limit = 100;
            }
            
            $messages = $this->chatService->getMessages($roomId, $limit, $offset);
            
            return $this->jsonResponse([
                'success' => true,
                'data' => [
                    'room_id' => $roomId,
                    'messages' => $messages,
                    'count' => count($messages),
                    'limit' => $limit,
                    'offset' => $offset
                ]
            ]);
            
        } catch (\Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }
    
    /**
     * Send a chat message
     * POST /api/chat/rooms/{roomId}/messages
     */
    public function sendMessage($roomId) {
        try {
            // Validate authentication
            $user = $this->validateAuth();
            if (!$user) {
                return $this->jsonResponse(['error' => 'Authentication required'], 401);
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['message']) || empty(trim($input['message']))) {
                return $this->jsonResponse(['error' => 'Message content required'], 400);
            }
            
            $messageData = [
                'room_id' => $roomId,
                'user_id' => $user['id'],
                'user_name' => $user['name'],
                'message' => trim($input['message']),
                'message_type' => $input['message_type'] ?? 'text',
                'timestamp' => time(),
                'metadata' => $input['metadata'] ?? []
            ];
            
            $messageId = $this->chatService->saveMessage($messageData);
            
            return $this->jsonResponse([
                'success' => true,
                'data' => [
                    'message_id' => $messageId,
                    'room_id' => $roomId,
                    'user' => [
                        'id' => $user['id'],
                        'name' => $user['name']
                    ],
                    'message' => $messageData['message'],
                    'message_type' => $messageData['message_type'],
                    'timestamp' => $messageData['timestamp']
                ]
            ], 201);
            
        } catch (\Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }
    
    /**
     * Get chat room information
     * GET /api/chat/rooms/{roomId}
     */
    public function getRoom($roomId) {
        try {
            // Validate authentication
            $user = $this->validateAuth();
            if (!$user) {
                return $this->jsonResponse(['error' => 'Authentication required'], 401);
            }
            
            $room = $this->chatService->getRoom($roomId);
            
            if (!$room) {
                return $this->jsonResponse(['error' => 'Room not found'], 404);
            }
            
            $participants = $this->chatService->getParticipants($roomId);
            $stats = $this->chatService->getChatStats($roomId);
            
            return $this->jsonResponse([
                'success' => true,
                'data' => [
                    'room' => $room,
                    'participants' => $participants,
                    'stats' => $stats
                ]
            ]);
            
        } catch (\Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }
    
    /**
     * Create a new chat room
     * POST /api/chat/rooms
     */
    public function createRoom() {
        try {
            // Validate authentication
            $user = $this->validateAuth();
            if (!$user) {
                return $this->jsonResponse(['error' => 'Authentication required'], 401);
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['id']) || !isset($input['name'])) {
                return $this->jsonResponse(['error' => 'Room ID and name required'], 400);
            }
            
            $roomData = [
                'id' => $input['id'],
                'name' => $input['name'],
                'description' => $input['description'] ?? '',
                'interview_id' => $input['interview_id'] ?? null,
                'created_by' => $user['id'],
                'settings' => $input['settings'] ?? []
            ];
            
            $roomId = $this->chatService->createRoom($roomData);
            
            return $this->jsonResponse([
                'success' => true,
                'data' => [
                    'room_id' => $roomId,
                    'message' => 'Room created successfully'
                ]
            ], 201);
            
        } catch (\Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }
    
    /**
     * Join a chat room
     * POST /api/chat/rooms/{roomId}/join
     */
    public function joinRoom($roomId) {
        try {
            // Validate authentication
            $user = $this->validateAuth();
            if (!$user) {
                return $this->jsonResponse(['error' => 'Authentication required'], 401);
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            $role = $input['role'] ?? 'participant';
            
            $this->chatService->addParticipant($roomId, $user['id'], $user['name'], $role);
            
            return $this->jsonResponse([
                'success' => true,
                'data' => [
                    'room_id' => $roomId,
                    'user_id' => $user['id'],
                    'role' => $role,
                    'message' => 'Joined room successfully'
                ]
            ]);
            
        } catch (\Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }
    
    /**
     * Leave a chat room
     * POST /api/chat/rooms/{roomId}/leave
     */
    public function leaveRoom($roomId) {
        try {
            // Validate authentication
            $user = $this->validateAuth();
            if (!$user) {
                return $this->jsonResponse(['error' => 'Authentication required'], 401);
            }
            
            $this->chatService->removeParticipant($roomId, $user['id']);
            
            return $this->jsonResponse([
                'success' => true,
                'data' => [
                    'room_id' => $roomId,
                    'user_id' => $user['id'],
                    'message' => 'Left room successfully'
                ]
            ]);
            
        } catch (\Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }
    
    /**
     * Get chat statistics
     * GET /api/chat/stats
     */
    public function getStats() {
        try {
            // Validate authentication
            $user = $this->validateAuth();
            if (!$user) {
                return $this->jsonResponse(['error' => 'Authentication required'], 401);
            }
            
            $roomId = $_GET['room_id'] ?? null;
            $stats = $this->chatService->getChatStats($roomId);
            
            return $this->jsonResponse([
                'success' => true,
                'data' => $stats
            ]);
            
        } catch (\Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }
    
    /**
     * Delete a message
     * DELETE /api/chat/messages/{messageId}
     */
    public function deleteMessage($messageId) {
        try {
            // Validate authentication
            $user = $this->validateAuth();
            if (!$user) {
                return $this->jsonResponse(['error' => 'Authentication required'], 401);
            }
            
            $success = $this->chatService->deleteMessage($messageId, $user['id']);
            
            if (!$success) {
                return $this->jsonResponse(['error' => 'Message not found or permission denied'], 404);
            }
            
            return $this->jsonResponse([
                'success' => true,
                'data' => [
                    'message_id' => $messageId,
                    'message' => 'Message deleted successfully'
                ]
            ]);
            
        } catch (\Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }
    
    /**
     * Edit a message
     * PUT /api/chat/messages/{messageId}
     */
    public function editMessage($messageId) {
        try {
            // Validate authentication
            $user = $this->validateAuth();
            if (!$user) {
                return $this->jsonResponse(['error' => 'Authentication required'], 401);
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['message']) || empty(trim($input['message']))) {
                return $this->jsonResponse(['error' => 'Message content required'], 400);
            }
            
            $success = $this->chatService->editMessage($messageId, $user['id'], trim($input['message']));
            
            if (!$success) {
                return $this->jsonResponse(['error' => 'Message not found or permission denied'], 404);
            }
            
            return $this->jsonResponse([
                'success' => true,
                'data' => [
                    'message_id' => $messageId,
                    'message' => 'Message updated successfully'
                ]
            ]);
            
        } catch (\Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }
    
    /**
     * Validate authentication
     */
    private function validateAuth() {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        if (strpos($authHeader, 'Bearer ') === 0) {
            $token = substr($authHeader, 7);
            return $this->authService->validateToken($token);
        }
        
        return null;
    }
    
    /**
     * Return JSON response
     */
    private function jsonResponse($data, $statusCode = 200) {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        
        return json_encode($data);
    }
}
