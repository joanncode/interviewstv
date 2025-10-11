<?php

namespace InterviewsTV\Services;

require_once __DIR__ . '/FileStorageService.php';

/**
 * Chat Room Management Service
 * Handles comprehensive room operations, settings, and participant management
 */
class RoomManager {
    private $storage;
    private $broadcaster;
    
    public function __construct($broadcaster = null) {
        $this->storage = new FileStorageService();
        $this->broadcaster = $broadcaster;
        $this->initializeRoomStorage();
    }
    
    /**
     * Initialize room storage directories
     */
    private function initializeRoomStorage() {
        $dataDir = $this->storage->getDataDir();
        $dirs = [
            $dataDir . '/rooms',
            $dataDir . '/rooms/settings',
            $dataDir . '/rooms/participants',
            $dataDir . '/rooms/permissions',
            $dataDir . '/rooms/invitations'
        ];
        
        foreach ($dirs as $dir) {
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
        }
    }
    
    /**
     * Create a new chat room
     */
    public function createRoom($roomData, $creatorId) {
        try {
            $roomId = $roomData['id'] ?? uniqid('room_');
            
            // Validate room data
            if (empty($roomData['name'])) {
                throw new \Exception('Room name is required');
            }
            
            // Check if room already exists
            if ($this->roomExists($roomId)) {
                throw new \Exception('Room already exists');
            }
            
            $room = [
                'id' => $roomId,
                'name' => $roomData['name'],
                'description' => $roomData['description'] ?? '',
                'type' => $roomData['type'] ?? 'public', // public, private, interview
                'interview_id' => $roomData['interview_id'] ?? null,
                'created_by' => $creatorId,
                'created_at' => time(),
                'updated_at' => time(),
                'is_active' => true,
                'settings' => $this->getDefaultRoomSettings(),
                'stats' => [
                    'total_messages' => 0,
                    'total_participants' => 0,
                    'peak_concurrent_users' => 0,
                    'last_activity' => time()
                ]
            ];
            
            // Save room
            $this->storage->save('rooms', $roomId, $room);
            
            // Initialize room settings
            $this->initializeRoomSettings($roomId, $roomData['settings'] ?? []);
            
            // Add creator as admin
            $this->addParticipant($roomId, $creatorId, $roomData['creator_name'] ?? 'Admin', 'admin');
            
            // Initialize empty messages file
            $this->storage->save('chat/messages', $roomId, []);
            
            // Broadcast room creation
            if ($this->broadcaster) {
                $this->broadcaster->broadcastRoomUpdate($roomId, [
                    'action' => 'created',
                    'room' => $room
                ]);
            }
            
            return $roomId;
            
        } catch (\Exception $e) {
            throw new \Exception("Failed to create room: " . $e->getMessage());
        }
    }
    
    /**
     * Get room information
     */
    public function getRoom($roomId) {
        try {
            $room = $this->storage->load('rooms', $roomId);
            
            if (!$room || !($room['is_active'] ?? true)) {
                return null;
            }
            
            // Add real-time statistics
            $room['participants'] = $this->getParticipants($roomId);
            $room['settings'] = $this->getRoomSettings($roomId);
            $room['stats'] = $this->updateRoomStats($roomId);
            
            return $room;
            
        } catch (\Exception $e) {
            throw new \Exception("Failed to get room: " . $e->getMessage());
        }
    }
    
    /**
     * Update room information
     */
    public function updateRoom($roomId, $updateData, $userId) {
        try {
            $room = $this->storage->load('rooms', $roomId);
            
            if (!$room) {
                throw new \Exception('Room not found');
            }
            
            // Check permissions
            if (!$this->hasPermission($roomId, $userId, 'manage_room')) {
                throw new \Exception('Insufficient permissions');
            }
            
            // Update allowed fields
            $allowedFields = ['name', 'description', 'type'];
            foreach ($allowedFields as $field) {
                if (isset($updateData[$field])) {
                    $room[$field] = $updateData[$field];
                }
            }
            
            $room['updated_at'] = time();
            
            // Save updated room
            $this->storage->save('rooms', $roomId, $room);
            
            // Broadcast room update
            if ($this->broadcaster) {
                $this->broadcaster->broadcastRoomUpdate($roomId, [
                    'action' => 'updated',
                    'room' => $room,
                    'updated_by' => $userId
                ]);
            }
            
            return $room;
            
        } catch (\Exception $e) {
            throw new \Exception("Failed to update room: " . $e->getMessage());
        }
    }
    
    /**
     * Delete/deactivate room
     */
    public function deleteRoom($roomId, $userId) {
        try {
            $room = $this->storage->load('rooms', $roomId);
            
            if (!$room) {
                throw new \Exception('Room not found');
            }
            
            // Check permissions (only creator or admin can delete)
            if ($room['created_by'] !== $userId && !$this->hasPermission($roomId, $userId, 'delete_room')) {
                throw new \Exception('Insufficient permissions');
            }
            
            // Soft delete
            $room['is_active'] = false;
            $room['deleted_at'] = time();
            $room['deleted_by'] = $userId;
            
            $this->storage->save('rooms', $roomId, $room);
            
            // Remove all participants
            $participants = $this->getParticipants($roomId);
            foreach ($participants as $participant) {
                $this->removeParticipant($roomId, $participant['user_id']);
            }
            
            // Broadcast room deletion
            if ($this->broadcaster) {
                $this->broadcaster->broadcastRoomUpdate($roomId, [
                    'action' => 'deleted',
                    'room_id' => $roomId,
                    'deleted_by' => $userId
                ]);
            }
            
            return true;
            
        } catch (\Exception $e) {
            throw new \Exception("Failed to delete room: " . $e->getMessage());
        }
    }
    
    /**
     * Add participant to room
     */
    public function addParticipant($roomId, $userId, $userName, $role = 'participant') {
        try {
            // Check if room exists
            if (!$this->roomExists($roomId)) {
                throw new \Exception('Room not found');
            }
            
            $participantId = $roomId . '_' . $userId;
            
            // Check if already a participant
            $existing = $this->storage->load('rooms/participants', $participantId);
            if ($existing && ($existing['is_active'] ?? false)) {
                return $existing; // Already a participant
            }
            
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
            
            // Update room stats
            $this->updateParticipantCount($roomId);
            
            // Broadcast user joined
            if ($this->broadcaster) {
                $this->broadcaster->broadcastUserJoin($roomId, [
                    'user_id' => $userId,
                    'user_name' => $userName,
                    'role' => $role
                ]);
            }
            
            return $participant;
            
        } catch (\Exception $e) {
            throw new \Exception("Failed to add participant: " . $e->getMessage());
        }
    }
    
    /**
     * Remove participant from room
     */
    public function removeParticipant($roomId, $userId) {
        try {
            $participantId = $roomId . '_' . $userId;
            $participant = $this->storage->load('rooms/participants', $participantId);
            
            if ($participant) {
                $participant['is_active'] = false;
                $participant['left_at'] = time();
                
                $this->storage->save('rooms/participants', $participantId, $participant);
                
                // Update room stats
                $this->updateParticipantCount($roomId);
                
                // Broadcast user left
                if ($this->broadcaster) {
                    $this->broadcaster->broadcastUserLeave($roomId, [
                        'user_id' => $userId,
                        'user_name' => $participant['user_name']
                    ]);
                }
            }
            
            return true;
            
        } catch (\Exception $e) {
            throw new \Exception("Failed to remove participant: " . $e->getMessage());
        }
    }
    
    /**
     * Get room participants
     */
    public function getParticipants($roomId) {
        try {
            $participants = $this->storage->list('rooms/participants');
            
            // Filter participants for this room who are active
            $roomParticipants = array_filter($participants, function($p) use ($roomId) {
                return ($p['room_id'] ?? '') === $roomId && ($p['is_active'] ?? false);
            });
            
            // Sort by role priority and join time
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
            
        } catch (\Exception $e) {
            throw new \Exception("Failed to get participants: " . $e->getMessage());
        }
    }
    
    /**
     * Update participant role
     */
    public function updateParticipantRole($roomId, $userId, $newRole, $updatedBy) {
        try {
            // Check permissions
            if (!$this->hasPermission($roomId, $updatedBy, 'manage_participants')) {
                throw new \Exception('Insufficient permissions');
            }
            
            $participantId = $roomId . '_' . $userId;
            $participant = $this->storage->load('rooms/participants', $participantId);
            
            if (!$participant) {
                throw new \Exception('Participant not found');
            }
            
            $oldRole = $participant['role'];
            $participant['role'] = $newRole;
            $participant['permissions'] = $this->getRolePermissions($newRole);
            $participant['updated_at'] = time();
            
            $this->storage->save('rooms/participants', $participantId, $participant);
            
            // Broadcast role update
            if ($this->broadcaster) {
                $this->broadcaster->broadcastRoomUpdate($roomId, [
                    'action' => 'role_updated',
                    'user_id' => $userId,
                    'old_role' => $oldRole,
                    'new_role' => $newRole,
                    'updated_by' => $updatedBy
                ]);
            }
            
            return $participant;
            
        } catch (\Exception $e) {
            throw new \Exception("Failed to update participant role: " . $e->getMessage());
        }
    }
    
    /**
     * Get room settings
     */
    public function getRoomSettings($roomId) {
        try {
            $settings = $this->storage->load('rooms/settings', $roomId);
            return $settings ?: $this->getDefaultRoomSettings();
            
        } catch (\Exception $e) {
            return $this->getDefaultRoomSettings();
        }
    }
    
    /**
     * Update room settings
     */
    public function updateRoomSettings($roomId, $newSettings, $userId) {
        try {
            // Check permissions
            if (!$this->hasPermission($roomId, $userId, 'manage_room')) {
                throw new \Exception('Insufficient permissions');
            }
            
            $currentSettings = $this->getRoomSettings($roomId);
            $updatedSettings = array_merge($currentSettings, $newSettings);
            $updatedSettings['updated_at'] = time();
            $updatedSettings['updated_by'] = $userId;
            
            $this->storage->save('rooms/settings', $roomId, $updatedSettings);
            
            // Broadcast settings update
            if ($this->broadcaster) {
                $this->broadcaster->broadcastRoomUpdate($roomId, [
                    'action' => 'settings_updated',
                    'settings' => $updatedSettings,
                    'updated_by' => $userId
                ]);
            }
            
            return $updatedSettings;
            
        } catch (\Exception $e) {
            throw new \Exception("Failed to update room settings: " . $e->getMessage());
        }
    }
    
    /**
     * List all rooms (with filters)
     */
    public function listRooms($filters = []) {
        try {
            $rooms = $this->storage->list('rooms');
            
            // Apply filters
            $filteredRooms = array_filter($rooms, function($room) use ($filters) {
                // Active rooms only by default
                if (!($room['is_active'] ?? true)) {
                    return false;
                }
                
                // Type filter
                if (isset($filters['type']) && $room['type'] !== $filters['type']) {
                    return false;
                }
                
                // Creator filter
                if (isset($filters['created_by']) && $room['created_by'] !== $filters['created_by']) {
                    return false;
                }
                
                // Interview filter
                if (isset($filters['interview_id']) && $room['interview_id'] !== $filters['interview_id']) {
                    return false;
                }
                
                return true;
            });
            
            // Sort by creation time (newest first)
            usort($filteredRooms, function($a, $b) {
                return ($b['created_at'] ?? 0) - ($a['created_at'] ?? 0);
            });
            
            return $filteredRooms;
            
        } catch (\Exception $e) {
            throw new \Exception("Failed to list rooms: " . $e->getMessage());
        }
    }
    
    /**
     * Check if room exists
     */
    public function roomExists($roomId) {
        $room = $this->storage->load('rooms', $roomId);
        return $room && ($room['is_active'] ?? true);
    }
    
    /**
     * Check user permissions
     */
    public function hasPermission($roomId, $userId, $permission) {
        try {
            $participantId = $roomId . '_' . $userId;
            $participant = $this->storage->load('rooms/participants', $participantId);
            
            if (!$participant || !($participant['is_active'] ?? false)) {
                return false;
            }
            
            $permissions = $participant['permissions'] ?? [];
            return in_array($permission, $permissions) || in_array('all', $permissions);
            
        } catch (\Exception $e) {
            return false;
        }
    }
    
    /**
     * Get default room settings
     */
    private function getDefaultRoomSettings() {
        return [
            'max_participants' => 100,
            'allow_guest_messages' => true,
            'require_approval' => false,
            'enable_typing_indicators' => true,
            'enable_file_sharing' => false,
            'message_retention_days' => 30,
            'profanity_filter' => true,
            'rate_limit_messages' => 10, // messages per minute
            'auto_moderation' => false,
            'welcome_message' => '',
            'room_password' => null,
            'is_public' => true
        ];
    }
    
    /**
     * Initialize room settings
     */
    private function initializeRoomSettings($roomId, $customSettings = []) {
        $defaultSettings = $this->getDefaultRoomSettings();
        $settings = array_merge($defaultSettings, $customSettings);
        $settings['created_at'] = time();
        
        $this->storage->save('rooms/settings', $roomId, $settings);
    }
    
    /**
     * Get role permissions
     */
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
    
    /**
     * Update participant count
     */
    private function updateParticipantCount($roomId) {
        try {
            $participants = $this->getParticipants($roomId);
            $count = count($participants);
            
            $room = $this->storage->load('rooms', $roomId);
            if ($room) {
                $room['stats']['total_participants'] = $count;
                $room['stats']['peak_concurrent_users'] = max(
                    $room['stats']['peak_concurrent_users'] ?? 0, 
                    $count
                );
                $room['stats']['last_activity'] = time();
                
                $this->storage->save('rooms', $roomId, $room);
            }
            
        } catch (\Exception $e) {
            // Silent fail for stats update
        }
    }
    
    /**
     * Update room statistics
     */
    private function updateRoomStats($roomId) {
        try {
            $room = $this->storage->load('rooms', $roomId);
            if (!$room) return [];
            
            $messages = $this->storage->getArray('chat/messages', $roomId);
            $participants = $this->getParticipants($roomId);
            
            $stats = $room['stats'] ?? [];
            $stats['total_messages'] = count($messages);
            $stats['active_participants'] = count($participants);
            $stats['last_activity'] = !empty($messages) ? 
                max(array_column($messages, 'timestamp')) : 
                ($room['created_at'] ?? time());
            
            return $stats;
            
        } catch (\Exception $e) {
            return [];
        }
    }
}
