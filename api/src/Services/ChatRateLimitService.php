<?php

namespace InterviewsTV\Services;

/**
 * Chat Rate Limiting and Spam Protection Service
 * Handles message rate limiting, spam detection, and protection mechanisms
 */
class ChatRateLimitService {
    private $storage;
    private $rateLimits;
    private $spamDetectionRules;
    
    public function __construct() {
        $this->storage = new FileStorageService();
        
        // Configure rate limits (messages per time window)
        $this->rateLimits = [
            'guest' => ['messages' => 5, 'window' => 60], // 5 messages per minute
            'participant' => ['messages' => 10, 'window' => 60], // 10 messages per minute
            'moderator' => ['messages' => 20, 'window' => 60], // 20 messages per minute
            'host' => ['messages' => 30, 'window' => 60], // 30 messages per minute
            'admin' => ['messages' => 50, 'window' => 60] // 50 messages per minute
        ];
        
        // Configure spam detection rules
        $this->spamDetectionRules = [
            'duplicate_threshold' => 3, // Max identical messages in window
            'duplicate_window' => 300, // 5 minutes
            'caps_threshold' => 0.7, // 70% uppercase characters
            'link_threshold' => 3, // Max links per message
            'mention_threshold' => 5, // Max mentions per message
            'length_threshold' => 1000, // Max message length
            'emoji_threshold' => 10, // Max emojis per message
            'repeat_char_threshold' => 10, // Max repeated characters
            'flood_threshold' => 5, // Messages in rapid succession
            'flood_window' => 10 // 10 seconds
        ];
    }
    
    /**
     * Check if user can send a message (rate limiting)
     */
    public function checkRateLimit(string $userId, string $role = 'participant') {
        try {
            $limits = $this->rateLimits[$role] ?? $this->rateLimits['participant'];
            $window = $limits['window'];
            $maxMessages = $limits['messages'];
            
            $now = time();
            $windowStart = $now - $window;
            
            // Get user's recent messages
            $userMessages = $this->getUserRecentMessages($userId, $windowStart);
            
            $result = [
                'allowed' => count($userMessages) < $maxMessages,
                'current_count' => count($userMessages),
                'limit' => $maxMessages,
                'window' => $window,
                'reset_time' => $windowStart + $window,
                'retry_after' => null
            ];
            
            if (!$result['allowed']) {
                // Calculate when user can send next message
                $oldestMessage = min(array_column($userMessages, 'timestamp'));
                $result['retry_after'] = $oldestMessage + $window - $now;
            }
            
            return $result;
            
        } catch (\Exception $e) {
            // On error, allow the message but log the issue
            error_log("Rate limit check failed: " . $e->getMessage());
            return ['allowed' => true, 'error' => $e->getMessage()];
        }
    }
    
    /**
     * Check message for spam content
     */
    public function checkSpamContent(string $message, string $userId, array $messageHistory = []) {
        $spamScore = 0;
        $flags = [];
        $rules = $this->spamDetectionRules;
        
        // Check message length
        if (strlen($message) > $rules['length_threshold']) {
            $spamScore += 20;
            $flags[] = 'message_too_long';
        }
        
        // Check for excessive caps
        $capsRatio = $this->calculateCapsRatio($message);
        if ($capsRatio > $rules['caps_threshold']) {
            $spamScore += 15;
            $flags[] = 'excessive_caps';
        }
        
        // Check for excessive links
        $linkCount = $this->countLinks($message);
        if ($linkCount > $rules['link_threshold']) {
            $spamScore += 25;
            $flags[] = 'excessive_links';
        }
        
        // Check for excessive mentions
        $mentionCount = $this->countMentions($message);
        if ($mentionCount > $rules['mention_threshold']) {
            $spamScore += 20;
            $flags[] = 'excessive_mentions';
        }
        
        // Check for excessive emojis
        $emojiCount = $this->countEmojis($message);
        if ($emojiCount > $rules['emoji_threshold']) {
            $spamScore += 10;
            $flags[] = 'excessive_emojis';
        }
        
        // Check for repeated characters
        if ($this->hasExcessiveRepeatedChars($message, $rules['repeat_char_threshold'])) {
            $spamScore += 15;
            $flags[] = 'repeated_characters';
        }
        
        // Check for duplicate messages
        $duplicateCount = $this->countDuplicateMessages($message, $userId, $rules['duplicate_window']);
        if ($duplicateCount >= $rules['duplicate_threshold']) {
            $spamScore += 30;
            $flags[] = 'duplicate_message';
        }
        
        // Check for flooding (rapid succession)
        if ($this->isFlooding($userId, $rules['flood_threshold'], $rules['flood_window'])) {
            $spamScore += 25;
            $flags[] = 'message_flooding';
        }
        
        // Check against known spam patterns
        $patternScore = $this->checkSpamPatterns($message);
        $spamScore += $patternScore;
        if ($patternScore > 0) {
            $flags[] = 'spam_pattern_detected';
        }
        
        // Determine spam level
        $spamLevel = 'clean';
        if ($spamScore >= 50) {
            $spamLevel = 'high_spam';
        } elseif ($spamScore >= 30) {
            $spamLevel = 'moderate_spam';
        } elseif ($spamScore >= 15) {
            $spamLevel = 'low_spam';
        }
        
        return [
            'is_spam' => $spamScore >= 30,
            'spam_score' => $spamScore,
            'spam_level' => $spamLevel,
            'flags' => $flags,
            'action' => $this->determineAction($spamLevel, $flags)
        ];
    }
    
    /**
     * Record message for rate limiting and spam tracking
     */
    public function recordMessage(string $userId, string $roomId, string $message, int $timestamp = null) {
        try {
            $timestamp = $timestamp ?? time();
            
            $messageRecord = [
                'user_id' => $userId,
                'room_id' => $roomId,
                'message' => $message,
                'timestamp' => $timestamp,
                'message_hash' => md5($message)
            ];
            
            // Store in user's message history
            $this->storage->append('chat/user_messages', $userId, $messageRecord);
            
            // Store in global rate limit tracking
            $this->storage->append('chat/rate_limit_tracking', date('Y-m-d-H'), $messageRecord);
            
            // Clean up old records periodically
            if (rand(1, 100) === 1) { // 1% chance
                $this->cleanupOldRecords();
            }
            
        } catch (\Exception $e) {
            error_log("Failed to record message for rate limiting: " . $e->getMessage());
        }
    }
    
    /**
     * Apply penalty for spam/rate limit violation
     */
    public function applyPenalty(string $userId, string $roomId, string $reason, int $duration = 300) {
        try {
            $penalty = [
                'user_id' => $userId,
                'room_id' => $roomId,
                'reason' => $reason,
                'applied_at' => time(),
                'expires_at' => time() + $duration,
                'is_active' => true
            ];
            
            $penaltyId = uniqid('penalty_', true);
            $this->storage->save('chat/penalties', $penaltyId, $penalty);
            
            // Add to user's penalty history
            $this->storage->append('chat/user_penalties', $userId, $penalty);
            
            return $penaltyId;
            
        } catch (\Exception $e) {
            error_log("Failed to apply penalty: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Check if user has active penalties
     */
    public function checkUserPenalties(string $userId, string $roomId = null) {
        try {
            $penalties = $this->storage->getArray('chat/user_penalties', $userId);
            $now = time();
            
            $activePenalties = array_filter($penalties, function($penalty) use ($now, $roomId) {
                $isActive = $penalty['is_active'] && $penalty['expires_at'] > $now;
                $roomMatches = !$roomId || $penalty['room_id'] === $roomId;
                return $isActive && $roomMatches;
            });
            
            return [
                'has_penalties' => !empty($activePenalties),
                'penalties' => array_values($activePenalties),
                'most_severe' => $this->getMostSeverePenalty($activePenalties)
            ];
            
        } catch (\Exception $e) {
            return ['has_penalties' => false, 'penalties' => [], 'error' => $e->getMessage()];
        }
    }
    
    /**
     * Get user's recent messages for rate limiting
     */
    private function getUserRecentMessages(string $userId, int $since) {
        try {
            $messages = $this->storage->getArray('chat/user_messages', $userId);
            
            return array_filter($messages, function($msg) use ($since) {
                return ($msg['timestamp'] ?? 0) >= $since;
            });
            
        } catch (\Exception $e) {
            return [];
        }
    }
    
    /**
     * Calculate caps ratio in message
     */
    private function calculateCapsRatio(string $message) {
        $letters = preg_replace('/[^a-zA-Z]/', '', $message);
        if (strlen($letters) === 0) return 0;
        
        $caps = preg_replace('/[^A-Z]/', '', $letters);
        return strlen($caps) / strlen($letters);
    }
    
    /**
     * Count links in message
     */
    private function countLinks(string $message) {
        return preg_match_all('/https?:\/\/[^\s]+/', $message);
    }
    
    /**
     * Count mentions in message
     */
    private function countMentions(string $message) {
        return preg_match_all('/@[a-zA-Z0-9_]+/', $message);
    }
    
    /**
     * Count emojis in message
     */
    private function countEmojis(string $message) {
        // Simple emoji detection (Unicode ranges)
        return preg_match_all('/[\x{1F600}-\x{1F64F}]|[\x{1F300}-\x{1F5FF}]|[\x{1F680}-\x{1F6FF}]|[\x{1F1E0}-\x{1F1FF}]/u', $message);
    }
    
    /**
     * Check for excessive repeated characters
     */
    private function hasExcessiveRepeatedChars(string $message, int $threshold) {
        return preg_match('/(.)\1{' . ($threshold - 1) . ',}/', $message);
    }
    
    /**
     * Count duplicate messages from user
     */
    private function countDuplicateMessages(string $message, string $userId, int $window) {
        try {
            $since = time() - $window;
            $recentMessages = $this->getUserRecentMessages($userId, $since);
            $messageHash = md5($message);
            
            return count(array_filter($recentMessages, function($msg) use ($messageHash) {
                return ($msg['message_hash'] ?? '') === $messageHash;
            }));
            
        } catch (\Exception $e) {
            return 0;
        }
    }
    
    /**
     * Check if user is flooding messages
     */
    private function isFlooding(string $userId, int $threshold, int $window) {
        try {
            $since = time() - $window;
            $recentMessages = $this->getUserRecentMessages($userId, $since);
            
            return count($recentMessages) >= $threshold;
            
        } catch (\Exception $e) {
            return false;
        }
    }
    
    /**
     * Check message against known spam patterns
     */
    private function checkSpamPatterns(string $message) {
        $spamPatterns = [
            '/\b(buy now|click here|limited time|act fast)\b/i' => 10,
            '/\b(free money|easy money|get rich)\b/i' => 15,
            '/\b(viagra|cialis|pharmacy)\b/i' => 20,
            '/\b(casino|gambling|poker)\b/i' => 10,
            '/(.)\1{20,}/' => 15, // 20+ repeated characters
            '/[A-Z]{10,}/' => 10, // 10+ consecutive caps
        ];
        
        $score = 0;
        foreach ($spamPatterns as $pattern => $points) {
            if (preg_match($pattern, $message)) {
                $score += $points;
            }
        }
        
        return $score;
    }
    
    /**
     * Determine action based on spam level
     */
    private function determineAction(string $spamLevel, array $flags) {
        switch ($spamLevel) {
            case 'high_spam':
                return 'block';
            case 'moderate_spam':
                return 'warn';
            case 'low_spam':
                return 'flag';
            default:
                return 'allow';
        }
    }
    
    /**
     * Get most severe penalty
     */
    private function getMostSeverePenalty(array $penalties) {
        if (empty($penalties)) return null;
        
        $severityOrder = ['warning' => 1, 'mute' => 2, 'temp_ban' => 3, 'ban' => 4];
        
        usort($penalties, function($a, $b) use ($severityOrder) {
            $severityA = $severityOrder[$a['reason']] ?? 0;
            $severityB = $severityOrder[$b['reason']] ?? 0;
            return $severityB - $severityA;
        });
        
        return $penalties[0];
    }
    
    /**
     * Clean up old rate limiting records
     */
    private function cleanupOldRecords() {
        try {
            $cutoff = time() - 86400; // 24 hours ago
            
            // This is a simplified cleanup - in production, you'd want more sophisticated cleanup
            error_log("Rate limit cleanup triggered (cutoff: $cutoff)");
            
        } catch (\Exception $e) {
            error_log("Cleanup failed: " . $e->getMessage());
        }
    }
    
    /**
     * Get rate limiting statistics
     */
    public function getStatistics(string $roomId = null, int $timeframe = 3600) {
        try {
            $since = time() - $timeframe;
            $stats = [
                'total_messages' => 0,
                'blocked_messages' => 0,
                'warned_messages' => 0,
                'active_penalties' => 0,
                'top_violators' => []
            ];
            
            // This would be implemented with proper data aggregation
            // For now, return basic structure
            
            return $stats;
            
        } catch (\Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }
}
