<?php

namespace InterviewsTV\Services;

require_once __DIR__ . '/FileStorageService.php';

class ChatService {
    private $storage;

    public function __construct() {
        $this->storage = new FileStorageService();
        $this->initializeStorage();
    }

    /**
     * Initialize storage directories
     */
    private function initializeStorage() {
        // Ensure chat directories exist
        $dataDir = $this->storage->getDataDir();
        $dirs = [
            $dataDir . '/chat',
            $dataDir . '/chat/rooms',
            $dataDir . '/chat/messages',
            $dataDir . '/chat/participants'
        ];

        foreach ($dirs as $dir) {
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
        }
    }
    

    
    /**
     * Save a chat message with enhanced persistence
     */
    public function saveMessage(array $messageData) {
        try {
            $roomId = $messageData['room_id'];
            $messageId = uniqid('msg_', true);

            $message = [
                'id' => $messageId,
                'room_id' => $roomId,
                'user_id' => $messageData['user_id'],
                'user_name' => $messageData['user_name'],
                'message' => $messageData['message'],
                'message_type' => $messageData['message_type'] ?? 'text',
                'timestamp' => $messageData['timestamp'],
                'created_at' => date('Y-m-d H:i:s'),
                'edited_at' => null,
                'is_deleted' => false,
                'is_pinned' => false,
                'reply_to' => $messageData['reply_to'] ?? null,
                'metadata' => $messageData['metadata'] ?? [],
                'reactions' => [],
                'thread_count' => 0
            ];

            // Append message to room's message file
            $this->storage->append('chat/messages', $roomId, $message);

            // Update room statistics
            $this->updateRoomStats($roomId, 'message_sent');

            // Create message index for faster searching
            $this->indexMessage($message);

            return $messageId;

        } catch (\Exception $e) {
            throw new \Exception("Failed to save message: " . $e->getMessage());
        }
    }

    /**
     * Get chat message history with advanced filtering
     */
    public function getMessageHistory(string $roomId, array $options = []) {
        try {
            $limit = $options['limit'] ?? 50;
            $offset = $options['offset'] ?? 0;
            $before = $options['before'] ?? null; // timestamp
            $after = $options['after'] ?? null; // timestamp
            $messageType = $options['message_type'] ?? null;
            $userId = $options['user_id'] ?? null;
            $search = $options['search'] ?? null;
            $includeDeleted = $options['include_deleted'] ?? false;

            $messages = $this->storage->getArray('chat/messages', $roomId);

            // Apply filters
            $messages = array_filter($messages, function($msg) use ($before, $after, $messageType, $userId, $includeDeleted) {
                // Filter deleted messages
                if (!$includeDeleted && ($msg['is_deleted'] ?? false)) {
                    return false;
                }

                // Filter by timestamp range
                if ($before && ($msg['timestamp'] ?? 0) >= $before) {
                    return false;
                }
                if ($after && ($msg['timestamp'] ?? 0) <= $after) {
                    return false;
                }

                // Filter by message type
                if ($messageType && ($msg['message_type'] ?? 'text') !== $messageType) {
                    return false;
                }

                // Filter by user
                if ($userId && ($msg['user_id'] ?? '') !== $userId) {
                    return false;
                }

                return true;
            });

            // Search in message content
            if ($search) {
                $messages = array_filter($messages, function($msg) use ($search) {
                    return stripos($msg['message'] ?? '', $search) !== false ||
                           stripos($msg['user_name'] ?? '', $search) !== false;
                });
            }

            // Sort by timestamp (newest first for pagination, then reverse)
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

            // Add additional metadata
            foreach ($messages as &$message) {
                $message['is_edited'] = !empty($message['edited_at']);
                $message['reaction_count'] = count($message['reactions'] ?? []);
                $message['has_replies'] = ($message['thread_count'] ?? 0) > 0;
            }

            return [
                'messages' => $messages,
                'total_count' => $this->getMessageCount($roomId),
                'has_more' => count($messages) === $limit
            ];

        } catch (\Exception $e) {
            throw new \Exception("Failed to get message history: " . $e->getMessage());
        }
    }

    /**
     * Get message count for a room
     */
    public function getMessageCount(string $roomId, bool $includeDeleted = false) {
        try {
            $messages = $this->storage->getArray('chat/messages', $roomId);

            if (!$includeDeleted) {
                $messages = array_filter($messages, function($msg) {
                    return !($msg['is_deleted'] ?? false);
                });
            }

            return count($messages);

        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Update room statistics
     */
    private function updateRoomStats(string $roomId, string $action) {
        try {
            $stats = $this->storage->load('chat/stats', $roomId) ?? [
                'total_messages' => 0,
                'last_message_at' => null,
                'active_users' => 0,
                'peak_users' => 0
            ];

            switch ($action) {
                case 'message_sent':
                    $stats['total_messages']++;
                    $stats['last_message_at'] = time();
                    break;
            }

            $this->storage->save('chat/stats', $roomId, $stats);

        } catch (\Exception $e) {
            // Silently fail stats update
        }
    }

    /**
     * Index message for search functionality
     */
    private function indexMessage(array $message) {
        try {
            $index = $this->storage->load('chat/search_index', 'global') ?? [];

            $indexEntry = [
                'message_id' => $message['id'],
                'room_id' => $message['room_id'],
                'user_id' => $message['user_id'],
                'content' => strtolower($message['message']),
                'timestamp' => $message['timestamp'],
                'keywords' => $this->extractKeywords($message['message'])
            ];

            $index[] = $indexEntry;

            // Keep only last 10000 messages in index
            if (count($index) > 10000) {
                $index = array_slice($index, -10000);
            }

            $this->storage->save('chat/search_index', 'global', $index);

        } catch (\Exception $e) {
            // Silently fail indexing
        }
    }

    /**
     * Extract keywords from message for search
     */
    private function extractKeywords(string $message) {
        $words = preg_split('/\s+/', strtolower($message));
        $words = array_filter($words, function($word) {
            return strlen($word) > 2; // Only words longer than 2 characters
        });
        return array_unique($words);
    }
    
    /**
     * Get chat messages for a room
     */
    public function getMessages(string $roomId, int $limit = 50, int $offset = 0) {
        try {
            $messages = $this->storage->getArray('chat/messages', $roomId);

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
            return array_reverse($messages);

        } catch (\Exception $e) {
            throw new \Exception("Failed to get messages: " . $e->getMessage());
        }
    }
    
    /**
     * Create or get a chat room
     */
    public function createRoom(array $roomData) {
        try {
            $room = [
                'id' => $roomData['id'],
                'name' => $roomData['name'],
                'description' => $roomData['description'] ?? '',
                'interview_id' => $roomData['interview_id'] ?? null,
                'created_by' => $roomData['created_by'] ?? null,
                'is_active' => true,
                'max_users' => 100,
                'settings' => $roomData['settings'] ?? []
            ];

            $this->storage->save('chat/rooms', $roomData['id'], $room);

            // Initialize empty messages file for the room
            $this->storage->save('chat/messages', $roomData['id'], []);

            return $roomData['id'];

        } catch (\Exception $e) {
            throw new \Exception("Failed to create room: " . $e->getMessage());
        }
    }
    
    /**
     * Get room information
     */
    public function getRoom(string $roomId) {
        try {
            $room = $this->storage->load('chat/rooms', $roomId);

            if ($room && ($room['is_active'] ?? true)) {
                return $room;
            }

            return null;

        } catch (\Exception $e) {
            throw new \Exception("Failed to get room: " . $e->getMessage());
        }
    }
    
    /**
     * Add participant to room
     */
    public function addParticipant(string $roomId, int $userId, string $userName, string $role = 'participant') {
        try {
            $participant = [
                'room_id' => $roomId,
                'user_id' => $userId,
                'user_name' => $userName,
                'role' => $role,
                'joined_at' => time(),
                'left_at' => null,
                'is_active' => true,
                'permissions' => []
            ];

            $this->storage->save('chat/participants', $roomId . '_' . $userId, $participant);

        } catch (\Exception $e) {
            throw new \Exception("Failed to add participant: " . $e->getMessage());
        }
    }
    
    /**
     * Remove participant from room
     */
    public function removeParticipant(string $roomId, int $userId) {
        try {
            $participantId = $roomId . '_' . $userId;
            $participant = $this->storage->load('chat/participants', $participantId);

            if ($participant) {
                $participant['is_active'] = false;
                $participant['left_at'] = time();
                $this->storage->save('chat/participants', $participantId, $participant);
            }

        } catch (\Exception $e) {
            throw new \Exception("Failed to remove participant: " . $e->getMessage());
        }
    }
    
    /**
     * Get room participants
     */
    public function getParticipants(string $roomId) {
        try {
            $participants = $this->storage->list('chat/participants');

            // Filter participants for this room who are active
            $roomParticipants = array_filter($participants, function($p) use ($roomId) {
                return ($p['room_id'] ?? '') === $roomId && ($p['is_active'] ?? false);
            });

            // Sort by joined_at
            usort($roomParticipants, function($a, $b) {
                return ($a['joined_at'] ?? 0) - ($b['joined_at'] ?? 0);
            });

            return $roomParticipants;

        } catch (\Exception $e) {
            throw new \Exception("Failed to get participants: " . $e->getMessage());
        }
    }

    /**
     * Delete a message (soft delete)
     */
    public function deleteMessage(string $messageId, int $userId) {
        try {
            // Find the message in all room message files
            $messageFiles = glob($this->storage->getDataDir() . '/chat/messages/*.json');

            foreach ($messageFiles as $file) {
                $messages = json_decode(file_get_contents($file), true) ?: [];

                for ($i = 0; $i < count($messages); $i++) {
                    if (($messages[$i]['id'] ?? '') === $messageId) {
                        // Check if user owns the message
                        if (($messages[$i]['user_id'] ?? 0) !== $userId) {
                            return false;
                        }

                        // Soft delete
                        $messages[$i]['is_deleted'] = true;
                        $messages[$i]['deleted_at'] = time();

                        // Save back to file
                        file_put_contents($file, json_encode($messages, JSON_PRETTY_PRINT));
                        return true;
                    }
                }
            }

            return false;

        } catch (\Exception $e) {
            throw new \Exception("Failed to delete message: " . $e->getMessage());
        }
    }

    /**
     * Edit a message
     */
    public function editMessage(string $messageId, int $userId, string $newMessage) {
        try {
            // Find the message in all room message files
            $messageFiles = glob($this->storage->getDataDir() . '/chat/messages/*.json');

            foreach ($messageFiles as $file) {
                $messages = json_decode(file_get_contents($file), true) ?: [];

                for ($i = 0; $i < count($messages); $i++) {
                    if (($messages[$i]['id'] ?? '') === $messageId) {
                        // Check if user owns the message
                        if (($messages[$i]['user_id'] ?? 0) !== $userId) {
                            return false;
                        }

                        // Edit message
                        $messages[$i]['message'] = $newMessage;
                        $messages[$i]['edited_at'] = time();

                        // Save back to file
                        file_put_contents($file, json_encode($messages, JSON_PRETTY_PRINT));
                        return true;
                    }
                }
            }

            return false;

        } catch (\Exception $e) {
            throw new \Exception("Failed to edit message: " . $e->getMessage());
        }
    }

    /**
     * Get chat statistics
     */
    public function getChatStats(string $roomId = null) {
        try {
            if ($roomId) {
                // Stats for specific room
                $messages = $this->storage->getArray('chat/messages', $roomId);
                $participants = $this->getParticipants($roomId);

                return [
                    'room_id' => $roomId,
                    'total_messages' => count($messages),
                    'active_participants' => count($participants),
                    'last_activity' => $this->getLastActivity($roomId)
                ];
            } else {
                // Global stats
                $rooms = $this->storage->list('chat/rooms');
                $totalMessages = 0;
                $totalParticipants = 0;

                foreach ($rooms as $room) {
                    $messages = $this->storage->getArray('chat/messages', $room['id']);
                    $participants = $this->getParticipants($room['id']);

                    $totalMessages += count($messages);
                    $totalParticipants += count($participants);
                }

                return [
                    'total_rooms' => count($rooms),
                    'total_messages' => $totalMessages,
                    'total_participants' => $totalParticipants
                ];
            }

        } catch (\Exception $e) {
            throw new \Exception("Failed to get chat stats: " . $e->getMessage());
        }
    }

    /**
     * Get last activity timestamp for a room
     */
    private function getLastActivity(string $roomId) {
        $messages = $this->storage->getArray('chat/messages', $roomId);

        if (empty($messages)) {
            return null;
        }

        $lastTimestamp = 0;
        foreach ($messages as $message) {
            $timestamp = $message['timestamp'] ?? 0;
            if ($timestamp > $lastTimestamp) {
                $lastTimestamp = $timestamp;
            }
        }

        return $lastTimestamp;
    }

}
