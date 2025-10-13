<?php

namespace InterviewsTV\Services;

/**
 * Private Message Service
 * Handles direct messaging between participants with encryption and moderation
 */
class PrivateMessageService {
    
    private $fileStorageService;
    private $moderationService;
    private $encryptionKey;
    private $messageConfig;
    
    public function __construct() {
        $this->fileStorageService = new FileStorageService();
        $this->moderationService = new ChatModerationService();
        $this->initializeEncryption();
        $this->initializeMessageConfig();
    }
    
    /**
     * Initialize encryption for private messages
     */
    private function initializeEncryption() {
        // In production, this should be loaded from secure environment variables
        $this->encryptionKey = 'interviews_tv_private_messages_key_2024';
    }
    
    /**
     * Initialize message configuration
     */
    private function initializeMessageConfig() {
        $this->messageConfig = [
            'enabled' => true,
            'max_message_length' => 2000,
            'rate_limit' => [
                'enabled' => true,
                'max_messages' => 20,
                'time_window' => 60 // seconds
            ],
            'encryption_enabled' => true,
            'moderation_enabled' => true,
            'file_attachments' => [
                'enabled' => true,
                'max_size' => 5242880, // 5MB
                'allowed_types' => ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx']
            ],
            'message_history' => [
                'enabled' => true,
                'max_messages_per_conversation' => 1000,
                'retention_days' => 30
            ],
            'notifications' => [
                'enabled' => true,
                'sound_enabled' => true,
                'desktop_enabled' => true
            ],
            'blocked_users' => [
                'enabled' => true,
                'mutual_block' => true
            ]
        ];
    }
    
    /**
     * Send a private message
     */
    public function sendPrivateMessage(array $messageData) {
        if (!$this->messageConfig['enabled']) {
            return [
                'success' => false,
                'error' => 'Private messaging is currently disabled',
                'error_code' => 'PM_DISABLED'
            ];
        }
        
        // Validate required fields
        $requiredFields = ['sender_id', 'recipient_id', 'message', 'room_id'];
        foreach ($requiredFields as $field) {
            if (empty($messageData[$field])) {
                return [
                    'success' => false,
                    'error' => "Missing required field: {$field}",
                    'error_code' => 'MISSING_FIELD'
                ];
            }
        }
        
        $senderId = $messageData['sender_id'];
        $recipientId = $messageData['recipient_id'];
        $message = trim($messageData['message']);
        $roomId = $messageData['room_id'];
        
        // Validate message length
        if (strlen($message) > $this->messageConfig['max_message_length']) {
            return [
                'success' => false,
                'error' => 'Message too long. Maximum length: ' . $this->messageConfig['max_message_length'] . ' characters',
                'error_code' => 'MESSAGE_TOO_LONG'
            ];
        }
        
        // Check if users can message each other
        $permissionCheck = $this->checkMessagingPermissions($senderId, $recipientId, $roomId);
        if (!$permissionCheck['allowed']) {
            return [
                'success' => false,
                'error' => $permissionCheck['reason'],
                'error_code' => $permissionCheck['error_code']
            ];
        }
        
        // Check rate limiting
        if (!$this->checkRateLimit($senderId)) {
            return [
                'success' => false,
                'error' => 'Rate limit exceeded. Please wait before sending another message.',
                'error_code' => 'RATE_LIMIT'
            ];
        }
        
        // Moderate message if enabled
        if ($this->messageConfig['moderation_enabled']) {
            $moderationResult = $this->moderationService->moderateMessage([
                'message' => $message,
                'user_id' => $senderId,
                'room_id' => $roomId,
                'user_role' => $messageData['sender_role'] ?? 'participant'
            ]);
            
            if (!$moderationResult['allowed']) {
                return [
                    'success' => false,
                    'error' => 'Message blocked by moderation: ' . implode(', ', $moderationResult['warnings']),
                    'error_code' => 'MODERATION_BLOCKED'
                ];
            }
            
            // Use moderated message
            $message = $moderationResult['modified_message'] ?? $message;
        }
        
        // Create message object
        $messageId = $this->generateMessageId();
        $timestamp = time();
        
        $privateMessage = [
            'message_id' => $messageId,
            'conversation_id' => $this->getConversationId($senderId, $recipientId),
            'sender_id' => $senderId,
            'recipient_id' => $recipientId,
            'room_id' => $roomId,
            'message' => $this->messageConfig['encryption_enabled'] ? $this->encryptMessage($message) : $message,
            'message_type' => $messageData['message_type'] ?? 'text',
            'timestamp' => $timestamp,
            'read' => false,
            'edited' => false,
            'deleted' => false,
            'metadata' => [
                'sender_name' => $messageData['sender_name'] ?? 'Unknown',
                'recipient_name' => $messageData['recipient_name'] ?? 'Unknown',
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
            ]
        ];
        
        // Handle file attachments
        if (isset($messageData['attachment']) && $this->messageConfig['file_attachments']['enabled']) {
            $attachmentResult = $this->handleAttachment($messageData['attachment'], $messageId);
            if ($attachmentResult['success']) {
                $privateMessage['attachment'] = $attachmentResult['attachment'];
            } else {
                return [
                    'success' => false,
                    'error' => $attachmentResult['error'],
                    'error_code' => 'ATTACHMENT_ERROR'
                ];
            }
        }
        
        // Save message
        $saveResult = $this->savePrivateMessage($privateMessage);
        if (!$saveResult) {
            return [
                'success' => false,
                'error' => 'Failed to save message',
                'error_code' => 'SAVE_FAILED'
            ];
        }
        
        // Update conversation metadata
        $this->updateConversationMetadata($privateMessage['conversation_id'], $privateMessage);
        
        // Update rate limiting
        $this->updateRateLimit($senderId);
        
        // Prepare response (decrypt message for response)
        $responseMessage = $privateMessage;
        if ($this->messageConfig['encryption_enabled']) {
            $responseMessage['message'] = $this->decryptMessage($privateMessage['message']);
        }
        
        return [
            'success' => true,
            'message' => $responseMessage,
            'conversation_id' => $privateMessage['conversation_id']
        ];
    }
    
    /**
     * Get conversation history between two users
     */
    public function getConversationHistory(string $userId1, string $userId2, array $options = []) {
        $conversationId = $this->getConversationId($userId1, $userId2);
        $limit = $options['limit'] ?? 50;
        $offset = $options['offset'] ?? 0;
        $before = $options['before'] ?? null;
        $after = $options['after'] ?? null;
        
        // Check if user can access this conversation
        if (!$this->canAccessConversation($userId1, $conversationId) && 
            !$this->canAccessConversation($userId2, $conversationId)) {
            return [
                'success' => false,
                'error' => 'Access denied to conversation',
                'error_code' => 'ACCESS_DENIED'
            ];
        }
        
        $messages = $this->loadConversationMessages($conversationId, [
            'limit' => $limit,
            'offset' => $offset,
            'before' => $before,
            'after' => $after
        ]);
        
        // Decrypt messages if encryption is enabled
        if ($this->messageConfig['encryption_enabled']) {
            foreach ($messages as &$message) {
                if (!$message['deleted']) {
                    $message['message'] = $this->decryptMessage($message['message']);
                }
            }
        }
        
        return [
            'success' => true,
            'messages' => $messages,
            'conversation_id' => $conversationId,
            'total_count' => $this->getConversationMessageCount($conversationId)
        ];
    }
    
    /**
     * Mark messages as read
     */
    public function markMessagesAsRead(string $userId, string $conversationId, array $messageIds = []) {
        if (!$this->canAccessConversation($userId, $conversationId)) {
            return [
                'success' => false,
                'error' => 'Access denied to conversation',
                'error_code' => 'ACCESS_DENIED'
            ];
        }
        
        $messages = $this->loadConversationMessages($conversationId);
        $updatedCount = 0;
        
        foreach ($messages as &$message) {
            // Mark as read if user is recipient and message is unread
            if ($message['recipient_id'] === $userId && !$message['read']) {
                if (empty($messageIds) || in_array($message['message_id'], $messageIds)) {
                    $message['read'] = true;
                    $message['read_at'] = time();
                    $updatedCount++;
                }
            }
        }
        
        if ($updatedCount > 0) {
            $this->saveConversationMessages($conversationId, $messages);
        }
        
        return [
            'success' => true,
            'updated_count' => $updatedCount
        ];
    }
    
    /**
     * Get user's conversations list
     */
    public function getUserConversations(string $userId, array $options = []) {
        $limit = $options['limit'] ?? 20;
        $offset = $options['offset'] ?? 0;
        
        $userConversations = $this->loadUserConversations($userId);
        $conversations = [];
        
        foreach ($userConversations as $conversationId => $metadata) {
            $lastMessage = $this->getLastMessage($conversationId);
            $unreadCount = $this->getUnreadCount($userId, $conversationId);
            
            $conversations[] = [
                'conversation_id' => $conversationId,
                'participant_id' => $metadata['other_user_id'],
                'participant_name' => $metadata['other_user_name'],
                'last_message' => $lastMessage,
                'unread_count' => $unreadCount,
                'last_activity' => $metadata['last_activity'],
                'created_at' => $metadata['created_at']
            ];
        }
        
        // Sort by last activity
        usort($conversations, function($a, $b) {
            return $b['last_activity'] - $a['last_activity'];
        });
        
        // Apply pagination
        $totalCount = count($conversations);
        $conversations = array_slice($conversations, $offset, $limit);
        
        return [
            'success' => true,
            'conversations' => $conversations,
            'total_count' => $totalCount
        ];
    }
    
    /**
     * Delete a message
     */
    public function deleteMessage(string $userId, string $messageId, string $reason = '') {
        $message = $this->findMessageById($messageId);
        
        if (!$message) {
            return [
                'success' => false,
                'error' => 'Message not found',
                'error_code' => 'MESSAGE_NOT_FOUND'
            ];
        }
        
        // Check if user can delete this message
        if ($message['sender_id'] !== $userId && !$this->isUserModerator($userId)) {
            return [
                'success' => false,
                'error' => 'Permission denied',
                'error_code' => 'PERMISSION_DENIED'
            ];
        }
        
        // Mark message as deleted
        $message['deleted'] = true;
        $message['deleted_at'] = time();
        $message['deleted_by'] = $userId;
        $message['deletion_reason'] = $reason;
        
        // Save updated message
        $this->updateMessage($message);
        
        return [
            'success' => true,
            'message_id' => $messageId
        ];
    }
    
    /**
     * Block/unblock a user
     */
    public function blockUser(string $userId, string $targetUserId, bool $block = true) {
        if (!$this->messageConfig['blocked_users']['enabled']) {
            return [
                'success' => false,
                'error' => 'User blocking is not enabled',
                'error_code' => 'BLOCKING_DISABLED'
            ];
        }
        
        $blockedUsers = $this->loadBlockedUsers($userId);
        
        if ($block) {
            if (!in_array($targetUserId, $blockedUsers)) {
                $blockedUsers[] = $targetUserId;
            }
        } else {
            $blockedUsers = array_filter($blockedUsers, function($id) use ($targetUserId) {
                return $id !== $targetUserId;
            });
        }
        
        $this->saveBlockedUsers($userId, $blockedUsers);
        
        // Handle mutual blocking
        if ($block && $this->messageConfig['blocked_users']['mutual_block']) {
            $targetBlockedUsers = $this->loadBlockedUsers($targetUserId);
            if (!in_array($userId, $targetBlockedUsers)) {
                $targetBlockedUsers[] = $userId;
                $this->saveBlockedUsers($targetUserId, $targetBlockedUsers);
            }
        }
        
        return [
            'success' => true,
            'action' => $block ? 'blocked' : 'unblocked',
            'target_user_id' => $targetUserId
        ];
    }
    
    /**
     * Check messaging permissions between users
     */
    private function checkMessagingPermissions(string $senderId, string $recipientId, string $roomId) {
        // Check if sender is blocked by recipient
        $recipientBlockedUsers = $this->loadBlockedUsers($recipientId);
        if (in_array($senderId, $recipientBlockedUsers)) {
            return [
                'allowed' => false,
                'reason' => 'You are blocked by this user',
                'error_code' => 'BLOCKED_BY_RECIPIENT'
            ];
        }
        
        // Check if recipient is blocked by sender
        $senderBlockedUsers = $this->loadBlockedUsers($senderId);
        if (in_array($recipientId, $senderBlockedUsers)) {
            return [
                'allowed' => false,
                'reason' => 'You have blocked this user',
                'error_code' => 'BLOCKED_BY_SENDER'
            ];
        }
        
        // Check if both users are in the same room (optional validation)
        // This would typically check active room participants
        
        return [
            'allowed' => true,
            'reason' => 'Messaging allowed'
        ];
    }
    
    /**
     * Check rate limiting for user
     */
    private function checkRateLimit(string $userId) {
        if (!$this->messageConfig['rate_limit']['enabled']) {
            return true;
        }
        
        $rateLimitData = $this->fileStorageService->load("pm_rate_limits/{$userId}.json") ?? [
            'messages' => [],
            'last_reset' => time()
        ];
        
        $currentTime = time();
        $timeWindow = $this->messageConfig['rate_limit']['time_window'];
        
        // Reset if time window has passed
        if ($currentTime - $rateLimitData['last_reset'] >= $timeWindow) {
            $rateLimitData = [
                'messages' => [],
                'last_reset' => $currentTime
            ];
        }
        
        // Count messages in current window
        $messageCount = count($rateLimitData['messages']);
        
        return $messageCount < $this->messageConfig['rate_limit']['max_messages'];
    }
    
    /**
     * Update rate limiting data
     */
    private function updateRateLimit(string $userId) {
        if (!$this->messageConfig['rate_limit']['enabled']) {
            return;
        }
        
        $rateLimitData = $this->fileStorageService->load("pm_rate_limits/{$userId}.json") ?? [
            'messages' => [],
            'last_reset' => time()
        ];
        
        $rateLimitData['messages'][] = time();
        
        $this->fileStorageService->save("pm_rate_limits/{$userId}.json", $rateLimitData);
    }
    
    /**
     * Generate unique message ID
     */
    private function generateMessageId() {
        return 'pm_' . time() . '_' . uniqid();
    }
    
    /**
     * Get conversation ID for two users
     */
    private function getConversationId(string $userId1, string $userId2) {
        // Create consistent conversation ID regardless of user order
        $users = [$userId1, $userId2];
        sort($users);
        return 'conv_' . md5(implode('_', $users));
    }
    
    /**
     * Encrypt message content
     */
    private function encryptMessage(string $message) {
        if (!$this->messageConfig['encryption_enabled']) {
            return $message;
        }
        
        $iv = openssl_random_pseudo_bytes(16);
        $encrypted = openssl_encrypt($message, 'AES-256-CBC', $this->encryptionKey, 0, $iv);
        return base64_encode($iv . $encrypted);
    }
    
    /**
     * Decrypt message content
     */
    private function decryptMessage(string $encryptedMessage) {
        if (!$this->messageConfig['encryption_enabled']) {
            return $encryptedMessage;
        }
        
        $data = base64_decode($encryptedMessage);
        $iv = substr($data, 0, 16);
        $encrypted = substr($data, 16);
        return openssl_decrypt($encrypted, 'AES-256-CBC', $this->encryptionKey, 0, $iv);
    }
    
    /**
     * Save private message
     */
    private function savePrivateMessage(array $message) {
        $conversationId = $message['conversation_id'];
        
        // Load existing messages
        $messages = $this->loadConversationMessages($conversationId);
        
        // Add new message
        $messages[] = $message;
        
        // Enforce message limit
        if (count($messages) > $this->messageConfig['message_history']['max_messages_per_conversation']) {
            $messages = array_slice($messages, -$this->messageConfig['message_history']['max_messages_per_conversation']);
        }
        
        // Save messages
        return $this->saveConversationMessages($conversationId, $messages);
    }
    
    /**
     * Load conversation messages
     */
    private function loadConversationMessages(string $conversationId, array $options = []) {
        $messages = $this->fileStorageService->load("private_messages/{$conversationId}.json") ?? [];
        
        // Apply filters
        if (isset($options['before'])) {
            $messages = array_filter($messages, function($msg) use ($options) {
                return $msg['timestamp'] < $options['before'];
            });
        }
        
        if (isset($options['after'])) {
            $messages = array_filter($messages, function($msg) use ($options) {
                return $msg['timestamp'] > $options['after'];
            });
        }
        
        // Sort by timestamp
        usort($messages, function($a, $b) {
            return $a['timestamp'] - $b['timestamp'];
        });
        
        // Apply pagination
        if (isset($options['offset']) || isset($options['limit'])) {
            $offset = $options['offset'] ?? 0;
            $limit = $options['limit'] ?? count($messages);
            $messages = array_slice($messages, $offset, $limit);
        }
        
        return $messages;
    }
    
    /**
     * Save conversation messages
     */
    private function saveConversationMessages(string $conversationId, array $messages) {
        return $this->fileStorageService->save("private_messages/{$conversationId}.json", $messages);
    }
    
    /**
     * Update conversation metadata
     */
    private function updateConversationMetadata(string $conversationId, array $message) {
        // Update metadata for both users
        $this->updateUserConversationMetadata($message['sender_id'], $conversationId, $message);
        $this->updateUserConversationMetadata($message['recipient_id'], $conversationId, $message);
    }
    
    /**
     * Update user conversation metadata
     */
    private function updateUserConversationMetadata(string $userId, string $conversationId, array $message) {
        $userConversations = $this->loadUserConversations($userId);
        
        $otherUserId = $message['sender_id'] === $userId ? $message['recipient_id'] : $message['sender_id'];
        $otherUserName = $message['sender_id'] === $userId ? $message['metadata']['recipient_name'] : $message['metadata']['sender_name'];
        
        $userConversations[$conversationId] = [
            'other_user_id' => $otherUserId,
            'other_user_name' => $otherUserName,
            'last_activity' => $message['timestamp'],
            'created_at' => $userConversations[$conversationId]['created_at'] ?? $message['timestamp']
        ];
        
        $this->saveUserConversations($userId, $userConversations);
    }
    
    /**
     * Load user conversations
     */
    private function loadUserConversations(string $userId) {
        return $this->fileStorageService->load("user_conversations/{$userId}.json") ?? [];
    }
    
    /**
     * Save user conversations
     */
    private function saveUserConversations(string $userId, array $conversations) {
        return $this->fileStorageService->save("user_conversations/{$userId}.json", $conversations);
    }
    
    /**
     * Load blocked users for a user
     */
    private function loadBlockedUsers(string $userId) {
        return $this->fileStorageService->load("blocked_users/{$userId}.json") ?? [];
    }
    
    /**
     * Save blocked users for a user
     */
    private function saveBlockedUsers(string $userId, array $blockedUsers) {
        return $this->fileStorageService->save("blocked_users/{$userId}.json", array_values($blockedUsers));
    }
    
    /**
     * Check if user can access conversation
     */
    private function canAccessConversation(string $userId, string $conversationId) {
        $userConversations = $this->loadUserConversations($userId);
        return isset($userConversations[$conversationId]);
    }
    
    /**
     * Get last message in conversation
     */
    private function getLastMessage(string $conversationId) {
        $messages = $this->loadConversationMessages($conversationId, ['limit' => 1, 'offset' => -1]);
        
        if (empty($messages)) {
            return null;
        }
        
        $lastMessage = end($messages);
        
        // Decrypt if needed
        if ($this->messageConfig['encryption_enabled'] && !$lastMessage['deleted']) {
            $lastMessage['message'] = $this->decryptMessage($lastMessage['message']);
        }
        
        return $lastMessage;
    }
    
    /**
     * Get unread message count for user in conversation
     */
    private function getUnreadCount(string $userId, string $conversationId) {
        $messages = $this->loadConversationMessages($conversationId);
        
        $unreadCount = 0;
        foreach ($messages as $message) {
            if ($message['recipient_id'] === $userId && !$message['read'] && !$message['deleted']) {
                $unreadCount++;
            }
        }
        
        return $unreadCount;
    }
    
    /**
     * Get conversation message count
     */
    private function getConversationMessageCount(string $conversationId) {
        $messages = $this->loadConversationMessages($conversationId);
        return count(array_filter($messages, function($msg) {
            return !$msg['deleted'];
        }));
    }
    
    /**
     * Find message by ID
     */
    private function findMessageById(string $messageId) {
        // This would typically search across all conversations
        // For now, we'll implement a simple search
        $conversationFiles = glob($this->fileStorageService->getStoragePath() . '/private_messages/*.json');
        
        foreach ($conversationFiles as $file) {
            $messages = json_decode(file_get_contents($file), true) ?? [];
            foreach ($messages as $message) {
                if ($message['message_id'] === $messageId) {
                    return $message;
                }
            }
        }
        
        return null;
    }
    
    /**
     * Update a message
     */
    private function updateMessage(array $updatedMessage) {
        $conversationId = $updatedMessage['conversation_id'];
        $messages = $this->loadConversationMessages($conversationId);
        
        foreach ($messages as &$message) {
            if ($message['message_id'] === $updatedMessage['message_id']) {
                $message = $updatedMessage;
                break;
            }
        }
        
        return $this->saveConversationMessages($conversationId, $messages);
    }
    
    /**
     * Check if user is moderator
     */
    private function isUserModerator(string $userId) {
        // This would typically check user roles from a database
        // For now, return false (only message sender can delete)
        return false;
    }
    
    /**
     * Handle file attachment
     */
    private function handleAttachment(array $attachmentData, string $messageId) {
        // This would handle file upload, validation, and storage
        // For now, return a mock implementation
        return [
            'success' => true,
            'attachment' => [
                'id' => 'att_' . $messageId,
                'filename' => $attachmentData['filename'] ?? 'file.txt',
                'size' => $attachmentData['size'] ?? 1024,
                'type' => $attachmentData['type'] ?? 'text/plain',
                'url' => '/uploads/private_messages/' . $messageId . '_' . ($attachmentData['filename'] ?? 'file.txt')
            ]
        ];
    }
    
    /**
     * Get private messaging statistics
     */
    public function getPrivateMessageStatistics(int $days = 7) {
        $stats = [
            'total_messages' => 0,
            'total_conversations' => 0,
            'active_users' => 0,
            'daily_messages' => [],
            'popular_times' => array_fill(0, 24, 0),
            'message_types' => [
                'text' => 0,
                'attachment' => 0
            ]
        ];
        
        $startTime = time() - ($days * 86400);
        $conversationFiles = glob($this->fileStorageService->getStoragePath() . '/private_messages/*.json');
        $activeUsers = [];
        
        foreach ($conversationFiles as $file) {
            $messages = json_decode(file_get_contents($file), true) ?? [];
            $stats['total_conversations']++;
            
            foreach ($messages as $message) {
                if ($message['timestamp'] < $startTime) {
                    continue;
                }
                
                $stats['total_messages']++;
                $activeUsers[$message['sender_id']] = true;
                
                // Daily breakdown
                $date = date('Y-m-d', $message['timestamp']);
                if (!isset($stats['daily_messages'][$date])) {
                    $stats['daily_messages'][$date] = 0;
                }
                $stats['daily_messages'][$date]++;
                
                // Hourly breakdown
                $hour = (int)date('H', $message['timestamp']);
                $stats['popular_times'][$hour]++;
                
                // Message type breakdown
                $type = $message['message_type'] ?? 'text';
                if (isset($stats['message_types'][$type])) {
                    $stats['message_types'][$type]++;
                }
            }
        }
        
        $stats['active_users'] = count($activeUsers);
        
        return $stats;
    }
    
    /**
     * Clean up old messages
     */
    public function cleanupOldMessages(int $daysToKeep = null) {
        $daysToKeep = $daysToKeep ?? $this->messageConfig['message_history']['retention_days'];
        $cutoffTime = time() - ($daysToKeep * 86400);
        $cleanedCount = 0;
        
        $conversationFiles = glob($this->fileStorageService->getStoragePath() . '/private_messages/*.json');
        
        foreach ($conversationFiles as $file) {
            $messages = json_decode(file_get_contents($file), true) ?? [];
            $originalCount = count($messages);
            
            // Filter out old messages
            $messages = array_filter($messages, function($message) use ($cutoffTime) {
                return $message['timestamp'] >= $cutoffTime;
            });
            
            $cleanedCount += $originalCount - count($messages);
            
            // Save updated messages or delete file if empty
            if (empty($messages)) {
                unlink($file);
            } else {
                file_put_contents($file, json_encode(array_values($messages), JSON_PRETTY_PRINT));
            }
        }
        
        return $cleanedCount;
    }
}
