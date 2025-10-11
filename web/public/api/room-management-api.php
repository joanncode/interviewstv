<?php

// Room Management API
// Comprehensive room management with creation, settings, and participant controls

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Simple file storage class
class SimpleFileStorage {
    private $dataDir;
    
    public function __construct($dataDir = null) {
        $this->dataDir = $dataDir ?: __DIR__ . '/data';
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
    
    public function list($collection, $limit = 100) {
        $dir = $this->dataDir . '/' . $collection;
        
        if (!is_dir($dir)) {
            return [];
        }
        
        $files = glob($dir . '/*.json');
        $items = [];
        
        foreach ($files as $file) {
            $content = file_get_contents($file);
            $item = json_decode($content, true);
            if ($item) {
                $items[] = $item;
            }
        }
        
        return array_slice($items, 0, $limit);
    }
    
    public function delete($collection, $id) {
        $file = $this->dataDir . '/' . $collection . '/' . $id . '.json';
        
        if (file_exists($file)) {
            return unlink($file);
        }
        
        return false;
    }
    
    private function ensureDirectoryExists($dir) {
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
    }

    public function getDataDir() {
        return $this->dataDir;
    }
}

// Simple Room Manager
class SimpleRoomManager {
    private $storage;
    
    public function __construct() {
        $this->storage = new SimpleFileStorage();
        $this->initializeDirectories();
    }
    
    private function initializeDirectories() {
        $dataDir = $this->storage->getDataDir();
        $dirs = ['rooms', 'rooms/settings', 'rooms/participants', 'rooms/permissions'];
        foreach ($dirs as $dir) {
            $fullPath = $dataDir . '/' . $dir;
            if (!is_dir($fullPath)) {
                mkdir($fullPath, 0755, true);
            }
        }
    }
    
    public function createRoom($roomData, $creatorId) {
        $roomId = $roomData['id'] ?? uniqid('room_');
        
        if (empty($roomData['name'])) {
            throw new Exception('Room name is required');
        }
        
        if ($this->roomExists($roomId)) {
            throw new Exception('Room already exists');
        }
        
        $room = [
            'id' => $roomId,
            'name' => $roomData['name'],
            'description' => $roomData['description'] ?? '',
            'type' => $roomData['type'] ?? 'public',
            'interview_id' => $roomData['interview_id'] ?? null,
            'created_by' => $creatorId,
            'created_at' => time(),
            'updated_at' => time(),
            'is_active' => true,
            'settings' => $this->getDefaultSettings(),
            'stats' => [
                'total_messages' => 0,
                'total_participants' => 0,
                'peak_concurrent_users' => 0,
                'last_activity' => time()
            ]
        ];
        
        $this->storage->save('rooms', $roomId, $room);
        
        // Add creator as admin
        $this->addParticipant($roomId, $creatorId, $roomData['creator_name'] ?? 'Admin', 'admin');
        
        return $roomId;
    }
    
    public function getRoom($roomId) {
        $room = $this->storage->load('rooms', $roomId);
        
        if (!$room || !($room['is_active'] ?? true)) {
            return null;
        }
        
        $room['participants'] = $this->getParticipants($roomId);
        $room['settings'] = $this->getRoomSettings($roomId);
        
        return $room;
    }
    
    public function updateRoom($roomId, $updateData, $userId) {
        $room = $this->storage->load('rooms', $roomId);
        
        if (!$room) {
            throw new Exception('Room not found');
        }
        
        if (!$this->hasPermission($roomId, $userId, 'manage_room')) {
            throw new Exception('Insufficient permissions');
        }
        
        $allowedFields = ['name', 'description', 'type'];
        foreach ($allowedFields as $field) {
            if (isset($updateData[$field])) {
                $room[$field] = $updateData[$field];
            }
        }
        
        $room['updated_at'] = time();
        $this->storage->save('rooms', $roomId, $room);
        
        return $room;
    }
    
    public function deleteRoom($roomId, $userId) {
        $room = $this->storage->load('rooms', $roomId);
        
        if (!$room) {
            throw new Exception('Room not found');
        }
        
        if ($room['created_by'] !== $userId && !$this->hasPermission($roomId, $userId, 'delete_room')) {
            throw new Exception('Insufficient permissions');
        }
        
        $room['is_active'] = false;
        $room['deleted_at'] = time();
        $room['deleted_by'] = $userId;
        
        $this->storage->save('rooms', $roomId, $room);
        
        return true;
    }
    
    public function listRooms($filters = []) {
        $rooms = $this->storage->list('rooms');
        
        $filteredRooms = array_filter($rooms, function($room) use ($filters) {
            if (!($room['is_active'] ?? true)) {
                return false;
            }
            
            if (isset($filters['type']) && $room['type'] !== $filters['type']) {
                return false;
            }
            
            if (isset($filters['created_by']) && $room['created_by'] !== $filters['created_by']) {
                return false;
            }
            
            return true;
        });
        
        usort($filteredRooms, function($a, $b) {
            return ($b['created_at'] ?? 0) - ($a['created_at'] ?? 0);
        });
        
        return $filteredRooms;
    }
    
    public function addParticipant($roomId, $userId, $userName, $role = 'participant') {
        if (!$this->roomExists($roomId)) {
            throw new Exception('Room not found');
        }
        
        $participantId = $roomId . '_' . $userId;
        
        $participant = [
            'id' => $participantId,
            'room_id' => $roomId,
            'user_id' => $userId,
            'user_name' => $userName,
            'role' => $role,
            'joined_at' => time(),
            'last_seen' => time(),
            'is_active' => true,
            'permissions' => $this->getRolePermissions($role),
            'status' => 'online'
        ];
        
        $this->storage->save('rooms/participants', $participantId, $participant);
        
        return $participant;
    }
    
    public function removeParticipant($roomId, $userId) {
        $participantId = $roomId . '_' . $userId;
        $participant = $this->storage->load('rooms/participants', $participantId);
        
        if ($participant) {
            $participant['is_active'] = false;
            $participant['left_at'] = time();
            $this->storage->save('rooms/participants', $participantId, $participant);
        }
        
        return true;
    }
    
    public function getParticipants($roomId) {
        $participants = $this->storage->list('rooms/participants');
        
        $roomParticipants = array_filter($participants, function($p) use ($roomId) {
            return ($p['room_id'] ?? '') === $roomId && ($p['is_active'] ?? false);
        });
        
        usort($roomParticipants, function($a, $b) {
            $rolePriority = ['admin' => 1, 'moderator' => 2, 'participant' => 3, 'guest' => 4];
            $aPriority = $rolePriority[$a['role']] ?? 5;
            $bPriority = $rolePriority[$b['role']] ?? 5;
            
            if ($aPriority === $bPriority) {
                return ($a['joined_at'] ?? 0) - ($b['joined_at'] ?? 0);
            }
            
            return $aPriority - $bPriority;
        });
        
        return $roomParticipants;
    }
    
    public function updateParticipantRole($roomId, $userId, $newRole, $updatedBy) {
        if (!$this->hasPermission($roomId, $updatedBy, 'manage_participants')) {
            throw new Exception('Insufficient permissions');
        }
        
        $participantId = $roomId . '_' . $userId;
        $participant = $this->storage->load('rooms/participants', $participantId);
        
        if (!$participant) {
            throw new Exception('Participant not found');
        }
        
        $participant['role'] = $newRole;
        $participant['permissions'] = $this->getRolePermissions($newRole);
        $participant['updated_at'] = time();
        
        $this->storage->save('rooms/participants', $participantId, $participant);
        
        return $participant;
    }
    
    public function getRoomSettings($roomId) {
        $settings = $this->storage->load('rooms/settings', $roomId);
        return $settings ?: $this->getDefaultSettings();
    }
    
    public function updateRoomSettings($roomId, $newSettings, $userId) {
        if (!$this->hasPermission($roomId, $userId, 'manage_room')) {
            throw new Exception('Insufficient permissions');
        }
        
        $currentSettings = $this->getRoomSettings($roomId);
        $updatedSettings = array_merge($currentSettings, $newSettings);
        $updatedSettings['updated_at'] = time();
        $updatedSettings['updated_by'] = $userId;
        
        $this->storage->save('rooms/settings', $roomId, $updatedSettings);
        
        return $updatedSettings;
    }
    
    public function hasPermission($roomId, $userId, $permission) {
        $participantId = $roomId . '_' . $userId;
        $participant = $this->storage->load('rooms/participants', $participantId);
        
        if (!$participant || !($participant['is_active'] ?? false)) {
            return false;
        }
        
        $permissions = $participant['permissions'] ?? [];
        return in_array($permission, $permissions) || in_array('all', $permissions);
    }
    
    public function roomExists($roomId) {
        $room = $this->storage->load('rooms', $roomId);
        return $room && ($room['is_active'] ?? true);
    }
    
    private function getDefaultSettings() {
        return [
            'max_participants' => 100,
            'allow_guest_messages' => true,
            'require_approval' => false,
            'enable_typing_indicators' => true,
            'enable_file_sharing' => false,
            'message_retention_days' => 30,
            'profanity_filter' => true,
            'rate_limit_messages' => 10,
            'auto_moderation' => false,
            'welcome_message' => '',
            'room_password' => null,
            'is_public' => true
        ];
    }
    
    private function getRolePermissions($role) {
        $permissions = [
            'admin' => ['all'],
            'moderator' => [
                'manage_participants', 'delete_messages', 'mute_users', 
                'kick_users', 'manage_room_settings'
            ],
            'participant' => ['send_messages', 'view_messages', 'join_room'],
            'guest' => ['view_messages']
        ];
        
        return $permissions[$role] ?? $permissions['guest'];
    }
}

// Authentication helper
function validateAuth() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
    if (strpos($authHeader, 'Bearer ') === 0) {
        $token = substr($authHeader, 7);
        
        // Mock authentication for testing
        if (strpos($token, 'test-token-') === 0) {
            $timestamp = str_replace('test-token-', '', $token);
            $userId = (int)substr($timestamp, -6);
            $userName = 'TestUser' . substr($timestamp, -3);
            
            return [
                'id' => $userId,
                'username' => 'testuser' . substr($timestamp, -3),
                'name' => $userName,
                'email' => 'test' . substr($timestamp, -3) . '@interviews.tv',
                'role' => 'user'
            ];
        }
    }
    
    return null;
}

// Route handling
$requestUri = $_SERVER['REQUEST_URI'];
$requestMethod = $_SERVER['REQUEST_METHOD'];

// Remove query string and API prefix
$path = parse_url($requestUri, PHP_URL_PATH);
$path = str_replace('/api/room-management-api.php', '', $path);
$pathParts = array_filter(explode('/', $path));

$roomManager = new SimpleRoomManager();

try {
    // Route: GET /
    if (empty($pathParts) && $requestMethod === 'GET') {
        echo json_encode([
            'success' => true,
            'message' => 'Room Management API',
            'version' => '1.0.0',
            'endpoints' => [
                'GET /' => 'API information',
                'GET /rooms' => 'List rooms',
                'POST /rooms' => 'Create room',
                'GET /rooms/{id}' => 'Get room details',
                'PUT /rooms/{id}' => 'Update room',
                'DELETE /rooms/{id}' => 'Delete room',
                'POST /rooms/{id}/join' => 'Join room',
                'POST /rooms/{id}/leave' => 'Leave room',
                'GET /rooms/{id}/participants' => 'Get participants',
                'PUT /rooms/{id}/participants/{userId}' => 'Update participant role',
                'GET /rooms/{id}/settings' => 'Get room settings',
                'PUT /rooms/{id}/settings' => 'Update room settings'
            ]
        ]);
        exit;
    }
    
    // Route: GET /rooms - List rooms
    if ($pathParts[0] === 'rooms' && count($pathParts) === 1 && $requestMethod === 'GET') {
        $user = validateAuth();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Authentication required']);
            exit;
        }
        
        $filters = [
            'type' => $_GET['type'] ?? null,
            'created_by' => $_GET['created_by'] ?? null
        ];
        
        $filters = array_filter($filters, function($value) {
            return $value !== null;
        });
        
        $rooms = $roomManager->listRooms($filters);
        
        echo json_encode([
            'success' => true,
            'data' => [
                'rooms' => $rooms,
                'count' => count($rooms),
                'filters' => $filters
            ]
        ]);
        exit;
    }
    
    // Route: POST /rooms - Create room
    if ($pathParts[0] === 'rooms' && count($pathParts) === 1 && $requestMethod === 'POST') {
        $user = validateAuth();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Authentication required']);
            exit;
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['name']) || empty(trim($input['name']))) {
            http_response_code(400);
            echo json_encode(['error' => 'Room name is required']);
            exit;
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
        
        $roomId = $roomManager->createRoom($roomData, $user['id']);
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'data' => [
                'room_id' => $roomId,
                'message' => 'Room created successfully'
            ]
        ]);
        exit;
    }
    
    // Route: GET /rooms/{id} - Get room details
    if ($pathParts[0] === 'rooms' && count($pathParts) === 2 && $requestMethod === 'GET') {
        $user = validateAuth();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Authentication required']);
            exit;
        }
        
        $roomId = $pathParts[1];
        $room = $roomManager->getRoom($roomId);
        
        if (!$room) {
            http_response_code(404);
            echo json_encode(['error' => 'Room not found']);
            exit;
        }
        
        echo json_encode([
            'success' => true,
            'data' => $room
        ]);
        exit;
    }
    
    // Route: PUT /rooms/{id} - Update room
    if ($pathParts[0] === 'rooms' && count($pathParts) === 2 && $requestMethod === 'PUT') {
        $user = validateAuth();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Authentication required']);
            exit;
        }
        
        $roomId = $pathParts[1];
        $input = json_decode(file_get_contents('php://input'), true);
        
        $room = $roomManager->updateRoom($roomId, $input, $user['id']);
        
        echo json_encode([
            'success' => true,
            'data' => $room,
            'message' => 'Room updated successfully'
        ]);
        exit;
    }
    
    // Route: DELETE /rooms/{id} - Delete room
    if ($pathParts[0] === 'rooms' && count($pathParts) === 2 && $requestMethod === 'DELETE') {
        $user = validateAuth();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Authentication required']);
            exit;
        }
        
        $roomId = $pathParts[1];
        $roomManager->deleteRoom($roomId, $user['id']);
        
        echo json_encode([
            'success' => true,
            'message' => 'Room deleted successfully'
        ]);
        exit;
    }
    
    // Route: POST /rooms/{id}/join - Join room
    if ($pathParts[0] === 'rooms' && $pathParts[2] === 'join' && count($pathParts) === 3 && $requestMethod === 'POST') {
        $user = validateAuth();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Authentication required']);
            exit;
        }
        
        $roomId = $pathParts[1];
        $input = json_decode(file_get_contents('php://input'), true);
        $role = $input['role'] ?? 'participant';
        
        $participant = $roomManager->addParticipant($roomId, $user['id'], $user['name'], $role);
        
        echo json_encode([
            'success' => true,
            'data' => $participant,
            'message' => 'Joined room successfully'
        ]);
        exit;
    }
    
    // Route: POST /rooms/{id}/leave - Leave room
    if ($pathParts[0] === 'rooms' && $pathParts[2] === 'leave' && count($pathParts) === 3 && $requestMethod === 'POST') {
        $user = validateAuth();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Authentication required']);
            exit;
        }
        
        $roomId = $pathParts[1];
        $roomManager->removeParticipant($roomId, $user['id']);
        
        echo json_encode([
            'success' => true,
            'message' => 'Left room successfully'
        ]);
        exit;
    }
    
    // Route: GET /rooms/{id}/participants - Get participants
    if ($pathParts[0] === 'rooms' && $pathParts[2] === 'participants' && count($pathParts) === 3 && $requestMethod === 'GET') {
        $user = validateAuth();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Authentication required']);
            exit;
        }
        
        $roomId = $pathParts[1];
        $participants = $roomManager->getParticipants($roomId);
        
        echo json_encode([
            'success' => true,
            'data' => [
                'room_id' => $roomId,
                'participants' => $participants,
                'count' => count($participants)
            ]
        ]);
        exit;
    }
    
    // Route: PUT /rooms/{id}/participants/{userId} - Update participant role
    if ($pathParts[0] === 'rooms' && $pathParts[2] === 'participants' && count($pathParts) === 4 && $requestMethod === 'PUT') {
        $user = validateAuth();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Authentication required']);
            exit;
        }
        
        $roomId = $pathParts[1];
        $userId = (int)$pathParts[3];
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['role'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Role is required']);
            exit;
        }
        
        $participant = $roomManager->updateParticipantRole($roomId, $userId, $input['role'], $user['id']);
        
        echo json_encode([
            'success' => true,
            'data' => $participant,
            'message' => 'Participant role updated successfully'
        ]);
        exit;
    }
    
    // Route: GET /rooms/{id}/settings - Get room settings
    if ($pathParts[0] === 'rooms' && $pathParts[2] === 'settings' && count($pathParts) === 3 && $requestMethod === 'GET') {
        $user = validateAuth();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Authentication required']);
            exit;
        }
        
        $roomId = $pathParts[1];
        $settings = $roomManager->getRoomSettings($roomId);
        
        echo json_encode([
            'success' => true,
            'data' => [
                'room_id' => $roomId,
                'settings' => $settings
            ]
        ]);
        exit;
    }
    
    // Route: PUT /rooms/{id}/settings - Update room settings
    if ($pathParts[0] === 'rooms' && $pathParts[2] === 'settings' && count($pathParts) === 3 && $requestMethod === 'PUT') {
        $user = validateAuth();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Authentication required']);
            exit;
        }
        
        $roomId = $pathParts[1];
        $input = json_decode(file_get_contents('php://input'), true);
        
        $settings = $roomManager->updateRoomSettings($roomId, $input, $user['id']);
        
        echo json_encode([
            'success' => true,
            'data' => [
                'room_id' => $roomId,
                'settings' => $settings
            ],
            'message' => 'Room settings updated successfully'
        ]);
        exit;
    }
    
    // 404 - Route not found
    http_response_code(404);
    echo json_encode([
        'error' => 'Endpoint not found',
        'path' => $path,
        'method' => $requestMethod
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'path' => $path ?? '',
        'method' => $requestMethod
    ]);
}
