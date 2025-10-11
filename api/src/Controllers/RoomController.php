<?php

namespace InterviewsTV\Controllers;

use InterviewsTV\Services\RoomManager;
use App\Services\AuthService;

class RoomController {
    private $roomManager;
    private $authService;
    
    public function __construct() {
        $this->roomManager = new RoomManager();
        $this->authService = new AuthService();
    }
    
    /**
     * Create a new room
     * POST /api/rooms
     */
    public function createRoom() {
        try {
            $user = $this->validateAuth();
            if (!$user) {
                return $this->jsonResponse(['error' => 'Authentication required'], 401);
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['name']) || empty(trim($input['name']))) {
                return $this->jsonResponse(['error' => 'Room name is required'], 400);
            }
            
            $roomData = [
                'id' => $input['id'] ?? null,
                'name' => trim($input['name']),
                'description' => $input['description'] ?? '',
                'type' => $input['type'] ?? 'public',
                'interview_id' => $input['interview_id'] ?? null,
                'settings' => $input['settings'] ?? [],
                'creator_name' => $user['name']
            ];
            
            $roomId = $this->roomManager->createRoom($roomData, $user['id']);
            
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
     * Get room information
     * GET /api/rooms/{roomId}
     */
    public function getRoom($roomId) {
        try {
            $user = $this->validateAuth();
            if (!$user) {
                return $this->jsonResponse(['error' => 'Authentication required'], 401);
            }
            
            $room = $this->roomManager->getRoom($roomId);
            
            if (!$room) {
                return $this->jsonResponse(['error' => 'Room not found'], 404);
            }
            
            return $this->jsonResponse([
                'success' => true,
                'data' => $room
            ]);
            
        } catch (\Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }
    
    /**
     * Update room information
     * PUT /api/rooms/{roomId}
     */
    public function updateRoom($roomId) {
        try {
            $user = $this->validateAuth();
            if (!$user) {
                return $this->jsonResponse(['error' => 'Authentication required'], 401);
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            $room = $this->roomManager->updateRoom($roomId, $input, $user['id']);
            
            return $this->jsonResponse([
                'success' => true,
                'data' => $room,
                'message' => 'Room updated successfully'
            ]);
            
        } catch (\Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }
    
    /**
     * Delete room
     * DELETE /api/rooms/{roomId}
     */
    public function deleteRoom($roomId) {
        try {
            $user = $this->validateAuth();
            if (!$user) {
                return $this->jsonResponse(['error' => 'Authentication required'], 401);
            }
            
            $this->roomManager->deleteRoom($roomId, $user['id']);
            
            return $this->jsonResponse([
                'success' => true,
                'message' => 'Room deleted successfully'
            ]);
            
        } catch (\Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }
    
    /**
     * List rooms
     * GET /api/rooms
     */
    public function listRooms() {
        try {
            $user = $this->validateAuth();
            if (!$user) {
                return $this->jsonResponse(['error' => 'Authentication required'], 401);
            }
            
            $filters = [
                'type' => $_GET['type'] ?? null,
                'created_by' => $_GET['created_by'] ?? null,
                'interview_id' => $_GET['interview_id'] ?? null
            ];
            
            // Remove null filters
            $filters = array_filter($filters, function($value) {
                return $value !== null;
            });
            
            $rooms = $this->roomManager->listRooms($filters);
            
            return $this->jsonResponse([
                'success' => true,
                'data' => [
                    'rooms' => $rooms,
                    'count' => count($rooms),
                    'filters' => $filters
                ]
            ]);
            
        } catch (\Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }
    
    /**
     * Join room
     * POST /api/rooms/{roomId}/join
     */
    public function joinRoom($roomId) {
        try {
            $user = $this->validateAuth();
            if (!$user) {
                return $this->jsonResponse(['error' => 'Authentication required'], 401);
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            $role = $input['role'] ?? 'participant';
            
            $participant = $this->roomManager->addParticipant($roomId, $user['id'], $user['name'], $role);
            
            return $this->jsonResponse([
                'success' => true,
                'data' => $participant,
                'message' => 'Joined room successfully'
            ]);
            
        } catch (\Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }
    
    /**
     * Leave room
     * POST /api/rooms/{roomId}/leave
     */
    public function leaveRoom($roomId) {
        try {
            $user = $this->validateAuth();
            if (!$user) {
                return $this->jsonResponse(['error' => 'Authentication required'], 401);
            }
            
            $this->roomManager->removeParticipant($roomId, $user['id']);
            
            return $this->jsonResponse([
                'success' => true,
                'message' => 'Left room successfully'
            ]);
            
        } catch (\Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }
    
    /**
     * Get room participants
     * GET /api/rooms/{roomId}/participants
     */
    public function getParticipants($roomId) {
        try {
            $user = $this->validateAuth();
            if (!$user) {
                return $this->jsonResponse(['error' => 'Authentication required'], 401);
            }
            
            $participants = $this->roomManager->getParticipants($roomId);
            
            return $this->jsonResponse([
                'success' => true,
                'data' => [
                    'room_id' => $roomId,
                    'participants' => $participants,
                    'count' => count($participants)
                ]
            ]);
            
        } catch (\Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }
    
    /**
     * Update participant role
     * PUT /api/rooms/{roomId}/participants/{userId}
     */
    public function updateParticipantRole($roomId, $userId) {
        try {
            $user = $this->validateAuth();
            if (!$user) {
                return $this->jsonResponse(['error' => 'Authentication required'], 401);
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['role'])) {
                return $this->jsonResponse(['error' => 'Role is required'], 400);
            }
            
            $participant = $this->roomManager->updateParticipantRole(
                $roomId, 
                (int)$userId, 
                $input['role'], 
                $user['id']
            );
            
            return $this->jsonResponse([
                'success' => true,
                'data' => $participant,
                'message' => 'Participant role updated successfully'
            ]);
            
        } catch (\Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }
    
    /**
     * Get room settings
     * GET /api/rooms/{roomId}/settings
     */
    public function getRoomSettings($roomId) {
        try {
            $user = $this->validateAuth();
            if (!$user) {
                return $this->jsonResponse(['error' => 'Authentication required'], 401);
            }
            
            $settings = $this->roomManager->getRoomSettings($roomId);
            
            return $this->jsonResponse([
                'success' => true,
                'data' => [
                    'room_id' => $roomId,
                    'settings' => $settings
                ]
            ]);
            
        } catch (\Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }
    
    /**
     * Update room settings
     * PUT /api/rooms/{roomId}/settings
     */
    public function updateRoomSettings($roomId) {
        try {
            $user = $this->validateAuth();
            if (!$user) {
                return $this->jsonResponse(['error' => 'Authentication required'], 401);
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            $settings = $this->roomManager->updateRoomSettings($roomId, $input, $user['id']);
            
            return $this->jsonResponse([
                'success' => true,
                'data' => [
                    'room_id' => $roomId,
                    'settings' => $settings
                ],
                'message' => 'Room settings updated successfully'
            ]);
            
        } catch (\Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }
    
    /**
     * Check room permissions
     * GET /api/rooms/{roomId}/permissions
     */
    public function checkPermissions($roomId) {
        try {
            $user = $this->validateAuth();
            if (!$user) {
                return $this->jsonResponse(['error' => 'Authentication required'], 401);
            }
            
            $permissions = [
                'manage_room' => $this->roomManager->hasPermission($roomId, $user['id'], 'manage_room'),
                'manage_participants' => $this->roomManager->hasPermission($roomId, $user['id'], 'manage_participants'),
                'delete_messages' => $this->roomManager->hasPermission($roomId, $user['id'], 'delete_messages'),
                'mute_users' => $this->roomManager->hasPermission($roomId, $user['id'], 'mute_users'),
                'kick_users' => $this->roomManager->hasPermission($roomId, $user['id'], 'kick_users'),
                'send_messages' => $this->roomManager->hasPermission($roomId, $user['id'], 'send_messages'),
                'view_messages' => $this->roomManager->hasPermission($roomId, $user['id'], 'view_messages')
            ];
            
            return $this->jsonResponse([
                'success' => true,
                'data' => [
                    'room_id' => $roomId,
                    'user_id' => $user['id'],
                    'permissions' => $permissions
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
