<?php

namespace InterviewsTV\Services;

/**
 * Chat Authentication Service
 * Handles user authentication and authorization for chat system
 */
class ChatAuthService {
    private $storage;
    private $jwtSecret;
    private $sessionTimeout;
    
    public function __construct() {
        $this->storage = new FileStorageService();
        $this->jwtSecret = $_ENV['JWT_SECRET'] ?? 'interviews_tv_chat_secret_key_2024';
        $this->sessionTimeout = 3600; // 1 hour
    }
    
    /**
     * Authenticate user for chat access
     */
    public function authenticateUser(array $credentials) {
        try {
            $userId = $credentials['user_id'] ?? null;
            $userName = $credentials['user_name'] ?? null;
            $roomId = $credentials['room_id'] ?? null;
            $token = $credentials['token'] ?? null;
            $interviewId = $credentials['interview_id'] ?? null;
            
            // Validate required fields
            if (!$userId || !$userName || !$roomId) {
                throw new \Exception('Missing required authentication fields');
            }
            
            // Verify user permissions for the room
            if (!$this->verifyRoomAccess($userId, $roomId, $interviewId)) {
                throw new \Exception('User does not have access to this chat room');
            }
            
            // Create chat session
            $sessionData = $this->createChatSession($userId, $userName, $roomId, $credentials);
            
            // Generate JWT token for WebSocket authentication
            $jwtToken = $this->generateJWTToken($sessionData);
            
            return [
                'success' => true,
                'session_id' => $sessionData['session_id'],
                'jwt_token' => $jwtToken,
                'user' => [
                    'id' => $userId,
                    'name' => $userName,
                    'role' => $sessionData['role'],
                    'permissions' => $sessionData['permissions']
                ],
                'room' => [
                    'id' => $roomId,
                    'access_level' => $sessionData['access_level']
                ],
                'expires_at' => $sessionData['expires_at']
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Verify JWT token for WebSocket connections
     */
    public function verifyJWTToken(string $token) {
        try {
            $parts = explode('.', $token);
            if (count($parts) !== 3) {
                throw new \Exception('Invalid token format');
            }
            
            [$header, $payload, $signature] = $parts;
            
            // Verify signature
            $expectedSignature = hash_hmac('sha256', $header . '.' . $payload, $this->jwtSecret, true);
            $expectedSignature = $this->base64UrlEncode($expectedSignature);
            
            if (!hash_equals($expectedSignature, $signature)) {
                throw new \Exception('Invalid token signature');
            }
            
            // Decode payload
            $payloadData = json_decode($this->base64UrlDecode($payload), true);
            
            // Check expiration
            if ($payloadData['exp'] < time()) {
                throw new \Exception('Token has expired');
            }
            
            // Verify session still exists
            $sessionId = $payloadData['session_id'];
            $session = $this->storage->load('chat/sessions', $sessionId);
            
            if (!$session || !$session['is_active']) {
                throw new \Exception('Session is no longer active');
            }
            
            // Update last activity
            $this->updateSessionActivity($sessionId);
            
            return [
                'valid' => true,
                'user_id' => $payloadData['user_id'],
                'user_name' => $payloadData['user_name'],
                'room_id' => $payloadData['room_id'],
                'role' => $payloadData['role'],
                'permissions' => $payloadData['permissions'],
                'session_id' => $sessionId
            ];
            
        } catch (\Exception $e) {
            return [
                'valid' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Verify user has access to a specific room
     */
    private function verifyRoomAccess(string $userId, string $roomId, ?string $interviewId = null) {
        try {
            // Check if room exists
            $room = $this->storage->load('chat/rooms', $roomId);
            if (!$room) {
                return false;
            }
            
            // If it's an interview room, verify interview access
            if ($interviewId) {
                $interview = $this->storage->load('interviews', $interviewId);
                if (!$interview) {
                    return false;
                }
                
                // Check if user is participant in the interview
                $participants = $interview['participants'] ?? [];
                $isParticipant = false;
                
                foreach ($participants as $participant) {
                    if ($participant['user_id'] === $userId) {
                        $isParticipant = true;
                        break;
                    }
                }
                
                if (!$isParticipant) {
                    return false;
                }
            }
            
            // Check room-specific access rules
            $roomSettings = $room['settings'] ?? [];
            
            // If room is private, check whitelist
            if (($room['type'] ?? 'public') === 'private') {
                $allowedUsers = $roomSettings['allowed_users'] ?? [];
                if (!in_array($userId, $allowedUsers)) {
                    return false;
                }
            }
            
            // Check if user is banned
            $bannedUsers = $roomSettings['banned_users'] ?? [];
            if (in_array($userId, $bannedUsers)) {
                return false;
            }
            
            return true;
            
        } catch (\Exception $e) {
            return false;
        }
    }
    
    /**
     * Create chat session for authenticated user
     */
    private function createChatSession(string $userId, string $userName, string $roomId, array $credentials) {
        $sessionId = uniqid('chat_session_', true);
        $now = time();
        
        // Determine user role and permissions
        $role = $this->determineUserRole($userId, $roomId, $credentials);
        $permissions = $this->getRolePermissions($role);
        $accessLevel = $this->getAccessLevel($userId, $roomId, $credentials);
        
        $sessionData = [
            'session_id' => $sessionId,
            'user_id' => $userId,
            'user_name' => $userName,
            'room_id' => $roomId,
            'role' => $role,
            'permissions' => $permissions,
            'access_level' => $accessLevel,
            'created_at' => $now,
            'last_activity' => $now,
            'expires_at' => $now + $this->sessionTimeout,
            'is_active' => true,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            'metadata' => $credentials['metadata'] ?? []
        ];
        
        // Save session
        $this->storage->save('chat/sessions', $sessionId, $sessionData);
        
        // Add to active sessions index
        $this->addToActiveSessionsIndex($sessionId, $userId, $roomId);
        
        return $sessionData;
    }
    
    /**
     * Determine user role in the chat room
     */
    private function determineUserRole(string $userId, string $roomId, array $credentials) {
        // Check if user is room creator/admin
        $room = $this->storage->load('chat/rooms', $roomId);
        if ($room && ($room['created_by'] ?? '') === $userId) {
            return 'admin';
        }
        
        // Check if user is interview host
        if (isset($credentials['interview_id'])) {
            $interview = $this->storage->load('interviews', $credentials['interview_id']);
            if ($interview && ($interview['host_id'] ?? '') === $userId) {
                return 'host';
            }
        }
        
        // Check for moderator role
        $roomSettings = $room['settings'] ?? [];
        $moderators = $roomSettings['moderators'] ?? [];
        if (in_array($userId, $moderators)) {
            return 'moderator';
        }
        
        // Default role
        return 'participant';
    }
    
    /**
     * Get permissions for a role
     */
    private function getRolePermissions(string $role) {
        $permissions = [
            'admin' => [
                'send_message', 'delete_any_message', 'edit_any_message', 'pin_message',
                'mute_user', 'ban_user', 'manage_room', 'view_history', 'moderate_chat'
            ],
            'host' => [
                'send_message', 'delete_own_message', 'edit_own_message', 'pin_message',
                'mute_user', 'view_history', 'moderate_chat'
            ],
            'moderator' => [
                'send_message', 'delete_own_message', 'edit_own_message',
                'mute_user', 'view_history', 'moderate_chat'
            ],
            'participant' => [
                'send_message', 'delete_own_message', 'edit_own_message', 'view_history'
            ],
            'guest' => [
                'send_message', 'view_history'
            ]
        ];
        
        return $permissions[$role] ?? $permissions['guest'];
    }
    
    /**
     * Get access level for user
     */
    private function getAccessLevel(string $userId, string $roomId, array $credentials) {
        $role = $this->determineUserRole($userId, $roomId, $credentials);
        
        $accessLevels = [
            'admin' => 'full',
            'host' => 'elevated',
            'moderator' => 'elevated',
            'participant' => 'standard',
            'guest' => 'limited'
        ];
        
        return $accessLevels[$role] ?? 'limited';
    }
    
    /**
     * Generate JWT token
     */
    private function generateJWTToken(array $sessionData) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode([
            'user_id' => $sessionData['user_id'],
            'user_name' => $sessionData['user_name'],
            'room_id' => $sessionData['room_id'],
            'role' => $sessionData['role'],
            'permissions' => $sessionData['permissions'],
            'session_id' => $sessionData['session_id'],
            'iat' => $sessionData['created_at'],
            'exp' => $sessionData['expires_at']
        ]);
        
        $headerEncoded = $this->base64UrlEncode($header);
        $payloadEncoded = $this->base64UrlEncode($payload);
        
        $signature = hash_hmac('sha256', $headerEncoded . '.' . $payloadEncoded, $this->jwtSecret, true);
        $signatureEncoded = $this->base64UrlEncode($signature);
        
        return $headerEncoded . '.' . $payloadEncoded . '.' . $signatureEncoded;
    }
    
    /**
     * Base64 URL encode
     */
    private function base64UrlEncode(string $data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
    
    /**
     * Base64 URL decode
     */
    private function base64UrlDecode(string $data) {
        return base64_decode(str_pad(strtr($data, '-_', '+/'), strlen($data) % 4, '=', STR_PAD_RIGHT));
    }
    
    /**
     * Update session activity
     */
    private function updateSessionActivity(string $sessionId) {
        try {
            $session = $this->storage->load('chat/sessions', $sessionId);
            if ($session) {
                $session['last_activity'] = time();
                $this->storage->save('chat/sessions', $sessionId, $session);
            }
        } catch (\Exception $e) {
            // Silently fail
        }
    }
    
    /**
     * Add session to active sessions index
     */
    private function addToActiveSessionsIndex(string $sessionId, string $userId, string $roomId) {
        try {
            $index = $this->storage->load('chat/active_sessions', 'index') ?? [];
            
            $index[$sessionId] = [
                'user_id' => $userId,
                'room_id' => $roomId,
                'created_at' => time()
            ];
            
            $this->storage->save('chat/active_sessions', 'index', $index);
        } catch (\Exception $e) {
            // Silently fail
        }
    }
    
    /**
     * Invalidate session
     */
    public function invalidateSession(string $sessionId) {
        try {
            $session = $this->storage->load('chat/sessions', $sessionId);
            if ($session) {
                $session['is_active'] = false;
                $session['invalidated_at'] = time();
                $this->storage->save('chat/sessions', $sessionId, $session);
            }
            
            // Remove from active sessions index
            $index = $this->storage->load('chat/active_sessions', 'index') ?? [];
            unset($index[$sessionId]);
            $this->storage->save('chat/active_sessions', 'index', $index);
            
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }
    
    /**
     * Clean up expired sessions
     */
    public function cleanupExpiredSessions() {
        try {
            $index = $this->storage->load('chat/active_sessions', 'index') ?? [];
            $now = time();
            $cleaned = 0;
            
            foreach ($index as $sessionId => $sessionInfo) {
                $session = $this->storage->load('chat/sessions', $sessionId);
                
                if (!$session || $session['expires_at'] < $now || !$session['is_active']) {
                    $this->invalidateSession($sessionId);
                    $cleaned++;
                }
            }
            
            return $cleaned;
        } catch (\Exception $e) {
            return 0;
        }
    }
}
