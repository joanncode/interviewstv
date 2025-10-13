<?php

namespace InterviewsTV\Services;

/**
 * Chat Moderation Service
 * Comprehensive chat moderation system with real-time monitoring, automated actions, and manual controls
 */
class ChatModerationService {
    
    private $fileStorageService;
    private $moderationConfig;
    private $profanityWords;
    private $spamPatterns;
    private $moderationActions;
    private $userWarnings;
    
    public function __construct() {
        $this->fileStorageService = new FileStorageService();
        $this->initializeModerationConfig();
        $this->loadProfanityFilter();
        $this->loadSpamPatterns();
        $this->moderationActions = [];
        $this->userWarnings = [];
    }
    
    /**
     * Initialize moderation configuration
     */
    private function initializeModerationConfig() {
        $this->moderationConfig = [
            'enabled' => true,
            'auto_moderation' => true,
            'profanity_filter' => true,
            'spam_detection' => true,
            'link_filtering' => true,
            'caps_limit' => 0.7, // 70% caps threshold
            'repeated_chars_limit' => 5,
            'message_length_limit' => 2000,
            'rate_limit_messages' => 10, // messages per minute
            'warning_threshold' => 3,
            'auto_mute_threshold' => 5,
            'auto_ban_threshold' => 10,
            'quarantine_enabled' => true,
            'escalation_enabled' => true,
            'log_all_actions' => true
        ];
    }
    
    /**
     * Load profanity word list
     */
    private function loadProfanityFilter() {
        $this->profanityWords = [
            // Basic inappropriate words (keeping it clean for demo)
            'spam', 'scam', 'fake', 'bot', 'cheat', 'hack',
            'stupid', 'idiot', 'moron', 'dumb', 'loser',
            // Add more words as needed
        ];
    }
    
    /**
     * Load spam detection patterns
     */
    private function loadSpamPatterns() {
        $this->spamPatterns = [
            '/(.)\1{4,}/', // Repeated characters (5+ times)
            '/[A-Z]{10,}/', // Excessive caps (10+ consecutive)
            '/\b(buy|sell|cheap|free|click|visit|www\.|http)/i', // Common spam words
            '/(.{1,10})\1{3,}/', // Repeated phrases
            '/[!@#$%^&*]{5,}/', // Excessive special characters
            '/\b\d{10,}\b/', // Long number sequences (phone numbers, etc.)
        ];
    }
    
    /**
     * Moderate a chat message
     */
    public function moderateMessage(array $messageData) {
        $message = $messageData['message'] ?? '';
        $userId = $messageData['user_id'] ?? '';
        $userName = $messageData['user_name'] ?? '';
        $roomId = $messageData['room_id'] ?? '';
        $userRole = $messageData['user_role'] ?? 'guest';
        
        $moderationResult = [
            'allowed' => true,
            'action' => 'approve',
            'reason' => '',
            'modified_message' => $message,
            'warnings' => [],
            'score' => 0,
            'flags' => [],
            'auto_action' => null
        ];
        
        // Skip moderation for admins and moderators
        if (in_array($userRole, ['admin', 'moderator', 'host'])) {
            return $moderationResult;
        }
        
        // Run moderation checks
        $checks = [
            'profanity' => $this->checkProfanity($message),
            'spam' => $this->checkSpam($message, $userId),
            'caps' => $this->checkExcessiveCaps($message),
            'length' => $this->checkMessageLength($message),
            'links' => $this->checkLinks($message),
            'rate_limit' => $this->checkRateLimit($userId),
            'user_history' => $this->checkUserHistory($userId),
            'repeated_content' => $this->checkRepeatedContent($message, $userId)
        ];
        
        // Calculate moderation score and determine action
        $totalScore = 0;
        $flags = [];
        $warnings = [];
        
        foreach ($checks as $checkType => $result) {
            if ($result['flagged']) {
                $totalScore += $result['score'];
                $flags[] = $checkType;
                $warnings[] = $result['reason'];
                
                if ($result['modified_message']) {
                    $moderationResult['modified_message'] = $result['modified_message'];
                }
            }
        }
        
        $moderationResult['score'] = $totalScore;
        $moderationResult['flags'] = $flags;
        $moderationResult['warnings'] = $warnings;
        
        // Determine action based on score
        if ($totalScore >= 100) {
            $moderationResult['allowed'] = false;
            $moderationResult['action'] = 'ban';
            $moderationResult['auto_action'] = 'auto_ban';
        } elseif ($totalScore >= 75) {
            $moderationResult['allowed'] = false;
            $moderationResult['action'] = 'mute';
            $moderationResult['auto_action'] = 'auto_mute';
        } elseif ($totalScore >= 50) {
            $moderationResult['action'] = 'quarantine';
            $moderationResult['auto_action'] = 'quarantine';
        } elseif ($totalScore >= 25) {
            $moderationResult['action'] = 'warn';
            $moderationResult['auto_action'] = 'warn';
        }
        
        // Log moderation action
        $this->logModerationAction($userId, $userName, $roomId, $message, $moderationResult);
        
        // Update user warning count
        if ($totalScore > 0) {
            $this->updateUserWarnings($userId, $totalScore);
        }
        
        return $moderationResult;
    }
    
    /**
     * Check for profanity
     */
    private function checkProfanity(string $message) {
        $result = ['flagged' => false, 'score' => 0, 'reason' => '', 'modified_message' => null];
        
        if (!$this->moderationConfig['profanity_filter']) {
            return $result;
        }
        
        $lowerMessage = strtolower($message);
        $foundWords = [];
        
        foreach ($this->profanityWords as $word) {
            if (strpos($lowerMessage, strtolower($word)) !== false) {
                $foundWords[] = $word;
            }
        }
        
        if (!empty($foundWords)) {
            $result['flagged'] = true;
            $result['score'] = count($foundWords) * 15;
            $result['reason'] = 'Contains inappropriate language: ' . implode(', ', $foundWords);
            
            // Replace profanity with asterisks
            $cleanMessage = $message;
            foreach ($foundWords as $word) {
                $replacement = str_repeat('*', strlen($word));
                $cleanMessage = str_ireplace($word, $replacement, $cleanMessage);
            }
            $result['modified_message'] = $cleanMessage;
        }
        
        return $result;
    }
    
    /**
     * Check for spam patterns
     */
    private function checkSpam(string $message, string $userId) {
        $result = ['flagged' => false, 'score' => 0, 'reason' => '', 'modified_message' => null];
        
        if (!$this->moderationConfig['spam_detection']) {
            return $result;
        }
        
        $spamFlags = [];
        
        foreach ($this->spamPatterns as $pattern) {
            if (preg_match($pattern, $message)) {
                $spamFlags[] = 'Pattern match';
            }
        }
        
        if (!empty($spamFlags)) {
            $result['flagged'] = true;
            $result['score'] = count($spamFlags) * 20;
            $result['reason'] = 'Spam detected: ' . implode(', ', $spamFlags);
        }
        
        return $result;
    }
    
    /**
     * Check for excessive caps
     */
    private function checkExcessiveCaps(string $message) {
        $result = ['flagged' => false, 'score' => 0, 'reason' => '', 'modified_message' => null];
        
        if (strlen($message) < 10) {
            return $result; // Skip short messages
        }
        
        $capsCount = preg_match_all('/[A-Z]/', $message);
        $capsRatio = $capsCount / strlen($message);
        
        if ($capsRatio > $this->moderationConfig['caps_limit']) {
            $result['flagged'] = true;
            $result['score'] = 10;
            $result['reason'] = 'Excessive use of capital letters';
            $result['modified_message'] = strtolower($message);
        }
        
        return $result;
    }
    
    /**
     * Check message length
     */
    private function checkMessageLength(string $message) {
        $result = ['flagged' => false, 'score' => 0, 'reason' => '', 'modified_message' => null];
        
        if (strlen($message) > $this->moderationConfig['message_length_limit']) {
            $result['flagged'] = true;
            $result['score'] = 5;
            $result['reason'] = 'Message too long';
        }
        
        return $result;
    }
    
    /**
     * Check for suspicious links
     */
    private function checkLinks(string $message) {
        $result = ['flagged' => false, 'score' => 0, 'reason' => '', 'modified_message' => null];
        
        if (!$this->moderationConfig['link_filtering']) {
            return $result;
        }
        
        // Check for URLs
        if (preg_match('/https?:\/\/[^\s<>"\']+/i', $message)) {
            $result['flagged'] = true;
            $result['score'] = 15;
            $result['reason'] = 'Contains external links';
        }
        
        return $result;
    }
    
    /**
     * Check rate limiting
     */
    private function checkRateLimit(string $userId) {
        $result = ['flagged' => false, 'score' => 0, 'reason' => '', 'modified_message' => null];
        
        $rateLimitData = $this->fileStorageService->load("rate_limits/{$userId}.json");
        if (!$rateLimitData) {
            $rateLimitData = ['messages' => [], 'last_reset' => time()];
        }
        
        $now = time();
        $oneMinuteAgo = $now - 60;
        
        // Remove old messages
        $rateLimitData['messages'] = array_filter($rateLimitData['messages'], function($timestamp) use ($oneMinuteAgo) {
            return $timestamp > $oneMinuteAgo;
        });
        
        // Add current message
        $rateLimitData['messages'][] = $now;
        
        // Check if over limit
        if (count($rateLimitData['messages']) > $this->moderationConfig['rate_limit_messages']) {
            $result['flagged'] = true;
            $result['score'] = 25;
            $result['reason'] = 'Rate limit exceeded';
        }
        
        // Save updated rate limit data
        $this->fileStorageService->save("rate_limits/{$userId}.json", $rateLimitData);
        
        return $result;
    }
    
    /**
     * Check user moderation history
     */
    private function checkUserHistory(string $userId) {
        $result = ['flagged' => false, 'score' => 0, 'reason' => '', 'modified_message' => null];
        
        $userHistory = $this->fileStorageService->load("user_history/{$userId}.json");
        if (!$userHistory) {
            return $result;
        }
        
        $recentViolations = 0;
        $now = time();
        $oneDayAgo = $now - 86400;
        
        foreach ($userHistory['violations'] ?? [] as $violation) {
            if ($violation['timestamp'] > $oneDayAgo) {
                $recentViolations++;
            }
        }
        
        if ($recentViolations >= 3) {
            $result['flagged'] = true;
            $result['score'] = $recentViolations * 5;
            $result['reason'] = 'User has recent violations';
        }
        
        return $result;
    }
    
    /**
     * Check for repeated content
     */
    private function checkRepeatedContent(string $message, string $userId) {
        $result = ['flagged' => false, 'score' => 0, 'reason' => '', 'modified_message' => null];
        
        $userMessages = $this->fileStorageService->load("user_messages/{$userId}.json");
        if (!$userMessages) {
            $userMessages = ['recent_messages' => []];
        }
        
        // Check if message is repeated
        $messageHash = md5(strtolower(trim($message)));
        $now = time();
        $fiveMinutesAgo = $now - 300;
        
        // Clean old messages
        $userMessages['recent_messages'] = array_filter($userMessages['recent_messages'], function($msg) use ($fiveMinutesAgo) {
            return $msg['timestamp'] > $fiveMinutesAgo;
        });
        
        // Check for duplicates
        $duplicateCount = 0;
        foreach ($userMessages['recent_messages'] as $recentMsg) {
            if ($recentMsg['hash'] === $messageHash) {
                $duplicateCount++;
            }
        }
        
        if ($duplicateCount >= 2) {
            $result['flagged'] = true;
            $result['score'] = 20;
            $result['reason'] = 'Repeated message detected';
        }
        
        // Add current message
        $userMessages['recent_messages'][] = [
            'hash' => $messageHash,
            'timestamp' => $now,
            'message' => substr($message, 0, 100) // Store first 100 chars for reference
        ];
        
        // Keep only last 10 messages
        $userMessages['recent_messages'] = array_slice($userMessages['recent_messages'], -10);
        
        $this->fileStorageService->save("user_messages/{$userId}.json", $userMessages);
        
        return $result;
    }
    
    /**
     * Log moderation action
     */
    private function logModerationAction(string $userId, string $userName, string $roomId, string $message, array $result) {
        if (!$this->moderationConfig['log_all_actions']) {
            return;
        }
        
        $logEntry = [
            'timestamp' => time(),
            'user_id' => $userId,
            'user_name' => $userName,
            'room_id' => $roomId,
            'original_message' => $message,
            'moderation_result' => $result,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ];
        
        $logFile = "moderation_logs/" . date('Y-m-d') . ".json";
        $existingLogs = $this->fileStorageService->load($logFile) ?? [];
        $existingLogs[] = $logEntry;
        
        $this->fileStorageService->save($logFile, $existingLogs);
    }
    
    /**
     * Update user warning count
     */
    private function updateUserWarnings(string $userId, int $score) {
        $userHistory = $this->fileStorageService->load("user_history/{$userId}.json");
        if (!$userHistory) {
            $userHistory = [
                'user_id' => $userId,
                'warning_count' => 0,
                'total_violations' => 0,
                'violations' => [],
                'created_at' => time()
            ];
        }
        
        $userHistory['total_violations']++;
        $userHistory['violations'][] = [
            'timestamp' => time(),
            'score' => $score,
            'type' => 'auto_moderation'
        ];
        
        if ($score >= 25) {
            $userHistory['warning_count']++;
        }
        
        // Keep only last 50 violations
        $userHistory['violations'] = array_slice($userHistory['violations'], -50);
        
        $this->fileStorageService->save("user_history/{$userId}.json", $userHistory);
    }

    /**
     * Manual moderation actions
     */

    /**
     * Mute a user
     */
    public function muteUser(string $userId, string $roomId, int $duration, string $reason, string $moderatorId) {
        $muteData = [
            'user_id' => $userId,
            'room_id' => $roomId,
            'muted_by' => $moderatorId,
            'reason' => $reason,
            'duration' => $duration,
            'muted_at' => time(),
            'unmute_at' => time() + $duration,
            'active' => true
        ];

        $muteFile = "mutes/{$roomId}_{$userId}.json";
        $this->fileStorageService->save($muteFile, $muteData);

        // Log action
        $this->logModerationAction($userId, '', $roomId, '', [
            'action' => 'mute',
            'moderator' => $moderatorId,
            'reason' => $reason,
            'duration' => $duration
        ]);

        return $muteData;
    }

    /**
     * Unmute a user
     */
    public function unmuteUser(string $userId, string $roomId, string $moderatorId) {
        $muteFile = "mutes/{$roomId}_{$userId}.json";
        $muteData = $this->fileStorageService->load($muteFile);

        if ($muteData) {
            $muteData['active'] = false;
            $muteData['unmuted_by'] = $moderatorId;
            $muteData['unmuted_at'] = time();

            $this->fileStorageService->save($muteFile, $muteData);

            // Log action
            $this->logModerationAction($userId, '', $roomId, '', [
                'action' => 'unmute',
                'moderator' => $moderatorId
            ]);

            return true;
        }

        return false;
    }

    /**
     * Ban a user
     */
    public function banUser(string $userId, string $roomId, string $reason, string $moderatorId, bool $permanent = false) {
        $banData = [
            'user_id' => $userId,
            'room_id' => $roomId,
            'banned_by' => $moderatorId,
            'reason' => $reason,
            'banned_at' => time(),
            'permanent' => $permanent,
            'active' => true
        ];

        if (!$permanent) {
            $banData['unban_at'] = time() + (24 * 3600); // 24 hours default
        }

        $banFile = "bans/{$roomId}_{$userId}.json";
        $this->fileStorageService->save($banFile, $banData);

        // Log action
        $this->logModerationAction($userId, '', $roomId, '', [
            'action' => 'ban',
            'moderator' => $moderatorId,
            'reason' => $reason,
            'permanent' => $permanent
        ]);

        return $banData;
    }

    /**
     * Unban a user
     */
    public function unbanUser(string $userId, string $roomId, string $moderatorId) {
        $banFile = "bans/{$roomId}_{$userId}.json";
        $banData = $this->fileStorageService->load($banFile);

        if ($banData) {
            $banData['active'] = false;
            $banData['unbanned_by'] = $moderatorId;
            $banData['unbanned_at'] = time();

            $this->fileStorageService->save($banFile, $banData);

            // Log action
            $this->logModerationAction($userId, '', $roomId, '', [
                'action' => 'unban',
                'moderator' => $moderatorId
            ]);

            return true;
        }

        return false;
    }

    /**
     * Delete a message
     */
    public function deleteMessage(string $messageId, string $roomId, string $reason, string $moderatorId) {
        $deletionData = [
            'message_id' => $messageId,
            'room_id' => $roomId,
            'deleted_by' => $moderatorId,
            'reason' => $reason,
            'deleted_at' => time()
        ];

        $deletionFile = "deleted_messages/{$messageId}.json";
        $this->fileStorageService->save($deletionFile, $deletionData);

        // Log action
        $this->logModerationAction('', '', $roomId, '', [
            'action' => 'delete_message',
            'message_id' => $messageId,
            'moderator' => $moderatorId,
            'reason' => $reason
        ]);

        return $deletionData;
    }

    /**
     * Issue a warning to a user
     */
    public function warnUser(string $userId, string $roomId, string $reason, string $moderatorId) {
        $warningData = [
            'user_id' => $userId,
            'room_id' => $roomId,
            'warned_by' => $moderatorId,
            'reason' => $reason,
            'warned_at' => time()
        ];

        $warningFile = "warnings/{$userId}_" . time() . ".json";
        $this->fileStorageService->save($warningFile, $warningData);

        // Update user warning count
        $this->updateUserWarnings($userId, 10);

        // Log action
        $this->logModerationAction($userId, '', $roomId, '', [
            'action' => 'warn',
            'moderator' => $moderatorId,
            'reason' => $reason
        ]);

        return $warningData;
    }

    /**
     * Check if user is muted
     */
    public function isUserMuted(string $userId, string $roomId) {
        $muteFile = "mutes/{$roomId}_{$userId}.json";
        $muteData = $this->fileStorageService->load($muteFile);

        if (!$muteData || !$muteData['active']) {
            return false;
        }

        // Check if mute has expired
        if (isset($muteData['unmute_at']) && time() > $muteData['unmute_at']) {
            $muteData['active'] = false;
            $muteData['expired_at'] = time();
            $this->fileStorageService->save($muteFile, $muteData);
            return false;
        }

        return $muteData;
    }

    /**
     * Check if user is banned
     */
    public function isUserBanned(string $userId, string $roomId) {
        $banFile = "bans/{$roomId}_{$userId}.json";
        $banData = $this->fileStorageService->load($banFile);

        if (!$banData || !$banData['active']) {
            return false;
        }

        // Check if ban has expired (for non-permanent bans)
        if (!$banData['permanent'] && isset($banData['unban_at']) && time() > $banData['unban_at']) {
            $banData['active'] = false;
            $banData['expired_at'] = time();
            $this->fileStorageService->save($banFile, $banData);
            return false;
        }

        return $banData;
    }

    /**
     * Get moderation statistics
     */
    public function getModerationStats(string $roomId = null, int $days = 7) {
        $stats = [
            'total_actions' => 0,
            'mutes' => 0,
            'bans' => 0,
            'warnings' => 0,
            'deleted_messages' => 0,
            'auto_actions' => 0,
            'manual_actions' => 0,
            'top_violations' => [],
            'active_mutes' => 0,
            'active_bans' => 0
        ];

        $startTime = time() - ($days * 86400);

        // Count from log files
        for ($i = 0; $i < $days; $i++) {
            $date = date('Y-m-d', time() - ($i * 86400));
            $logFile = "moderation_logs/{$date}.json";
            $logs = $this->fileStorageService->load($logFile) ?? [];

            foreach ($logs as $log) {
                if ($roomId && $log['room_id'] !== $roomId) {
                    continue;
                }

                if ($log['timestamp'] < $startTime) {
                    continue;
                }

                $stats['total_actions']++;

                $action = $log['moderation_result']['action'] ?? 'unknown';
                switch ($action) {
                    case 'mute':
                        $stats['mutes']++;
                        break;
                    case 'ban':
                        $stats['bans']++;
                        break;
                    case 'warn':
                        $stats['warnings']++;
                        break;
                    case 'delete_message':
                        $stats['deleted_messages']++;
                        break;
                }

                if (isset($log['moderation_result']['auto_action'])) {
                    $stats['auto_actions']++;
                } else {
                    $stats['manual_actions']++;
                }
            }
        }

        return $stats;
    }

    /**
     * Get user moderation history
     */
    public function getUserModerationHistory(string $userId) {
        $userHistory = $this->fileStorageService->load("user_history/{$userId}.json");

        if (!$userHistory) {
            return [
                'user_id' => $userId,
                'warning_count' => 0,
                'total_violations' => 0,
                'violations' => [],
                'reputation_score' => 100
            ];
        }

        // Calculate reputation score
        $reputationScore = 100;
        foreach ($userHistory['violations'] ?? [] as $violation) {
            $reputationScore -= ($violation['score'] / 10);
        }
        $userHistory['reputation_score'] = max(0, $reputationScore);

        return $userHistory;
    }

    /**
     * Update moderation configuration
     */
    public function updateModerationConfig(array $newConfig) {
        $this->moderationConfig = array_merge($this->moderationConfig, $newConfig);
        $this->fileStorageService->save('moderation_config.json', $this->moderationConfig);
        return $this->moderationConfig;
    }

    /**
     * Get current moderation configuration
     */
    public function getModerationConfig() {
        return $this->moderationConfig;
    }
}
