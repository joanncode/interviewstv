<?php

namespace InterviewsTV\Services;

/**
 * User Moderation Service
 * Advanced user muting and banning system with appeals, escalation, and comprehensive management
 */
class UserModerationService {
    
    private $fileStorageService;
    private $chatModerationService;
    private $moderationConfig;
    
    public function __construct() {
        $this->fileStorageService = new FileStorageService();
        $this->chatModerationService = new ChatModerationService();
        $this->initializeModerationConfig();
    }
    
    /**
     * Initialize moderation configuration
     */
    private function initializeModerationConfig() {
        $this->moderationConfig = [
            'mute_durations' => [
                'warning' => 60,        // 1 minute
                'minor' => 300,         // 5 minutes
                'moderate' => 1800,     // 30 minutes
                'major' => 3600,        // 1 hour
                'severe' => 86400,      // 24 hours
                'extreme' => 604800     // 7 days
            ],
            'ban_durations' => [
                'temporary' => 86400,   // 24 hours
                'short' => 604800,      // 7 days
                'medium' => 2592000,    // 30 days
                'long' => 7776000,      // 90 days
                'permanent' => 0        // Permanent
            ],
            'escalation_enabled' => true,
            'auto_escalation_thresholds' => [
                'mute_to_ban' => 5,     // 5 mutes = auto ban
                'temp_to_perm' => 3     // 3 temp bans = permanent ban
            ],
            'appeals_enabled' => true,
            'appeal_cooldown' => 86400, // 24 hours between appeals
            'max_appeals' => 3,         // Maximum appeals per violation
            'ip_tracking_enabled' => true,
            'hardware_fingerprinting' => false
        ];
    }
    
    /**
     * Enhanced mute user with escalation and tracking
     */
    public function muteUser(array $muteData) {
        $userId = $muteData['user_id'];
        $roomId = $muteData['room_id'];
        $moderatorId = $muteData['moderator_id'];
        $reason = $muteData['reason'];
        $severity = $muteData['severity'] ?? 'moderate';
        $customDuration = $muteData['duration'] ?? null;
        
        // Get user's mute history for escalation
        $userHistory = $this->getUserModerationHistory($userId);
        $muteCount = $this->countRecentMutes($userId, 2592000); // Last 30 days
        
        // Determine duration based on severity and history
        $duration = $customDuration ?? $this->calculateMuteDuration($severity, $muteCount);
        
        // Check for auto-escalation to ban
        if ($this->moderationConfig['escalation_enabled'] && 
            $muteCount >= $this->moderationConfig['auto_escalation_thresholds']['mute_to_ban']) {
            return $this->escalateToBan($userId, $roomId, $moderatorId, 'Auto-escalated from repeated mutes');
        }
        
        $muteId = uniqid('mute_');
        $muteRecord = [
            'mute_id' => $muteId,
            'user_id' => $userId,
            'room_id' => $roomId,
            'moderator_id' => $moderatorId,
            'reason' => $reason,
            'severity' => $severity,
            'duration' => $duration,
            'muted_at' => time(),
            'unmute_at' => time() + $duration,
            'active' => true,
            'escalated' => false,
            'appeal_count' => 0,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            'metadata' => [
                'previous_mutes' => $muteCount,
                'user_reputation' => $userHistory['reputation_score'] ?? 100,
                'auto_generated' => $moderatorId === 'system'
            ]
        ];
        
        // Save mute record
        $this->fileStorageService->save("mutes/{$muteId}.json", $muteRecord);
        
        // Update user's active mutes
        $this->updateUserActiveMutes($userId, $muteId, 'add');
        
        // Log the action
        $this->logModerationAction('mute', $muteRecord);
        
        // Send notifications
        $this->sendModerationNotifications('mute', $muteRecord);
        
        return $muteRecord;
    }
    
    /**
     * Enhanced ban user with escalation and tracking
     */
    public function banUser(array $banData) {
        $userId = $banData['user_id'];
        $roomId = $banData['room_id'];
        $moderatorId = $banData['moderator_id'];
        $reason = $banData['reason'];
        $severity = $banData['severity'] ?? 'medium';
        $permanent = $banData['permanent'] ?? false;
        $customDuration = $banData['duration'] ?? null;
        
        // Get user's ban history for escalation
        $userHistory = $this->getUserModerationHistory($userId);
        $banCount = $this->countRecentBans($userId, 7776000); // Last 90 days
        
        // Determine if this should be permanent based on history
        if ($this->moderationConfig['escalation_enabled'] && 
            $banCount >= $this->moderationConfig['auto_escalation_thresholds']['temp_to_perm']) {
            $permanent = true;
            $severity = 'permanent';
        }
        
        // Determine duration
        $duration = $permanent ? 0 : ($customDuration ?? $this->calculateBanDuration($severity, $banCount));
        
        $banId = uniqid('ban_');
        $banRecord = [
            'ban_id' => $banId,
            'user_id' => $userId,
            'room_id' => $roomId,
            'moderator_id' => $moderatorId,
            'reason' => $reason,
            'severity' => $severity,
            'duration' => $duration,
            'permanent' => $permanent,
            'banned_at' => time(),
            'unban_at' => $permanent ? null : time() + $duration,
            'active' => true,
            'escalated' => $banCount > 0,
            'appeal_count' => 0,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            'metadata' => [
                'previous_bans' => $banCount,
                'user_reputation' => $userHistory['reputation_score'] ?? 100,
                'auto_generated' => $moderatorId === 'system',
                'escalated_from_mutes' => isset($banData['escalated_from_mutes']) ? $banData['escalated_from_mutes'] : false
            ]
        ];
        
        // Save ban record
        $this->fileStorageService->save("bans/{$banId}.json", $banRecord);
        
        // Update user's active bans
        $this->updateUserActiveBans($userId, $banId, 'add');
        
        // Remove any active mutes (ban supersedes mute)
        $this->clearUserMutes($userId, $roomId);
        
        // Log the action
        $this->logModerationAction('ban', $banRecord);
        
        // Send notifications
        $this->sendModerationNotifications('ban', $banRecord);
        
        return $banRecord;
    }
    
    /**
     * Unmute user with validation and logging
     */
    public function unmuteUser(string $userId, string $roomId, string $moderatorId, string $reason = 'Manual unmute') {
        $activeMutes = $this->getUserActiveMutes($userId);
        $roomMute = null;
        
        foreach ($activeMutes as $muteId) {
            $muteData = $this->fileStorageService->load("mutes/{$muteId}.json");
            if ($muteData && $muteData['room_id'] === $roomId && $muteData['active']) {
                $roomMute = $muteData;
                break;
            }
        }
        
        if (!$roomMute) {
            return ['success' => false, 'message' => 'No active mute found for this user in this room'];
        }
        
        // Update mute record
        $roomMute['active'] = false;
        $roomMute['unmuted_by'] = $moderatorId;
        $roomMute['unmuted_at'] = time();
        $roomMute['unmute_reason'] = $reason;
        
        $this->fileStorageService->save("mutes/{$roomMute['mute_id']}.json", $roomMute);
        
        // Update user's active mutes
        $this->updateUserActiveMutes($userId, $roomMute['mute_id'], 'remove');
        
        // Log the action
        $this->logModerationAction('unmute', $roomMute);
        
        return ['success' => true, 'mute_record' => $roomMute];
    }
    
    /**
     * Unban user with validation and logging
     */
    public function unbanUser(string $userId, string $roomId, string $moderatorId, string $reason = 'Manual unban') {
        $activeBans = $this->getUserActiveBans($userId);
        $roomBan = null;
        
        foreach ($activeBans as $banId) {
            $banData = $this->fileStorageService->load("bans/{$banId}.json");
            if ($banData && $banData['room_id'] === $roomId && $banData['active']) {
                $roomBan = $banData;
                break;
            }
        }
        
        if (!$roomBan) {
            return ['success' => false, 'message' => 'No active ban found for this user in this room'];
        }
        
        // Update ban record
        $roomBan['active'] = false;
        $roomBan['unbanned_by'] = $moderatorId;
        $roomBan['unbanned_at'] = time();
        $roomBan['unban_reason'] = $reason;
        
        $this->fileStorageService->save("bans/{$roomBan['ban_id']}.json", $roomBan);
        
        // Update user's active bans
        $this->updateUserActiveBans($userId, $roomBan['ban_id'], 'remove');
        
        // Log the action
        $this->logModerationAction('unban', $roomBan);
        
        return ['success' => true, 'ban_record' => $roomBan];
    }
    
    /**
     * Submit an appeal for a mute or ban
     */
    public function submitAppeal(array $appealData) {
        $userId = $appealData['user_id'];
        $violationId = $appealData['violation_id']; // mute_id or ban_id
        $violationType = $appealData['violation_type']; // 'mute' or 'ban'
        $appealReason = $appealData['reason'];
        
        if (!$this->moderationConfig['appeals_enabled']) {
            return ['success' => false, 'message' => 'Appeals are not currently enabled'];
        }
        
        // Load violation record
        $violationData = $this->fileStorageService->load("{$violationType}s/{$violationId}.json");
        if (!$violationData) {
            return ['success' => false, 'message' => 'Violation record not found'];
        }
        
        // Check appeal eligibility
        $eligibilityCheck = $this->checkAppealEligibility($userId, $violationData);
        if (!$eligibilityCheck['eligible']) {
            return ['success' => false, 'message' => $eligibilityCheck['reason']];
        }
        
        $appealId = uniqid('appeal_');
        $appealRecord = [
            'appeal_id' => $appealId,
            'user_id' => $userId,
            'violation_id' => $violationId,
            'violation_type' => $violationType,
            'reason' => $appealReason,
            'status' => 'pending',
            'submitted_at' => time(),
            'reviewed_by' => null,
            'reviewed_at' => null,
            'decision' => null,
            'decision_reason' => null,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ];
        
        // Save appeal
        $this->fileStorageService->save("appeals/{$appealId}.json", $appealRecord);
        
        // Update violation record with appeal count
        $violationData['appeal_count']++;
        $violationData['latest_appeal_id'] = $appealId;
        $this->fileStorageService->save("{$violationType}s/{$violationId}.json", $violationData);
        
        // Log the appeal
        $this->logModerationAction('appeal_submitted', $appealRecord);
        
        // Notify moderators
        $this->notifyModeratorsOfAppeal($appealRecord);
        
        return ['success' => true, 'appeal_id' => $appealId];
    }
    
    /**
     * Review an appeal
     */
    public function reviewAppeal(string $appealId, string $moderatorId, string $decision, string $reason) {
        $appealData = $this->fileStorageService->load("appeals/{$appealId}.json");
        if (!$appealData) {
            return ['success' => false, 'message' => 'Appeal not found'];
        }
        
        if ($appealData['status'] !== 'pending') {
            return ['success' => false, 'message' => 'Appeal has already been reviewed'];
        }
        
        // Update appeal record
        $appealData['status'] = $decision; // 'approved' or 'denied'
        $appealData['reviewed_by'] = $moderatorId;
        $appealData['reviewed_at'] = time();
        $appealData['decision'] = $decision;
        $appealData['decision_reason'] = $reason;
        
        $this->fileStorageService->save("appeals/{$appealId}.json", $appealData);
        
        // If approved, reverse the violation
        if ($decision === 'approved') {
            $this->reverseViolation($appealData['violation_id'], $appealData['violation_type'], $moderatorId, $reason);
        }
        
        // Log the decision
        $this->logModerationAction('appeal_reviewed', $appealData);
        
        // Notify user of decision
        $this->notifyUserOfAppealDecision($appealData);
        
        return ['success' => true, 'appeal_data' => $appealData];
    }
    
    /**
     * Get comprehensive user moderation status
     */
    public function getUserModerationStatus(string $userId, string $roomId = null) {
        $status = [
            'user_id' => $userId,
            'is_muted' => false,
            'is_banned' => false,
            'active_mutes' => [],
            'active_bans' => [],
            'mute_expires_at' => null,
            'ban_expires_at' => null,
            'total_violations' => 0,
            'reputation_score' => 100,
            'can_appeal' => false,
            'pending_appeals' => []
        ];
        
        // Check active mutes
        $activeMutes = $this->getUserActiveMutes($userId);
        foreach ($activeMutes as $muteId) {
            $muteData = $this->fileStorageService->load("mutes/{$muteId}.json");
            if ($muteData && $muteData['active']) {
                if (!$roomId || $muteData['room_id'] === $roomId) {
                    $status['active_mutes'][] = $muteData;
                    $status['is_muted'] = true;
                    if (!$status['mute_expires_at'] || $muteData['unmute_at'] > $status['mute_expires_at']) {
                        $status['mute_expires_at'] = $muteData['unmute_at'];
                    }
                }
            }
        }
        
        // Check active bans
        $activeBans = $this->getUserActiveBans($userId);
        foreach ($activeBans as $banId) {
            $banData = $this->fileStorageService->load("bans/{$banId}.json");
            if ($banData && $banData['active']) {
                if (!$roomId || $banData['room_id'] === $roomId) {
                    $status['active_bans'][] = $banData;
                    $status['is_banned'] = true;
                    if (!$banData['permanent'] && (!$status['ban_expires_at'] || $banData['unban_at'] > $status['ban_expires_at'])) {
                        $status['ban_expires_at'] = $banData['unban_at'];
                    }
                }
            }
        }
        
        // Get user history
        $userHistory = $this->getUserModerationHistory($userId);
        $status['total_violations'] = $userHistory['total_violations'] ?? 0;
        $status['reputation_score'] = $userHistory['reputation_score'] ?? 100;
        
        // Check for pending appeals
        $status['pending_appeals'] = $this->getUserPendingAppeals($userId);
        
        // Check if user can submit new appeals
        $status['can_appeal'] = $this->canUserAppeal($userId);
        
        return $status;
    }
    
    /**
     * Calculate mute duration based on severity and history
     */
    private function calculateMuteDuration(string $severity, int $muteCount) {
        $baseDuration = $this->moderationConfig['mute_durations'][$severity] ?? 300;
        
        // Escalate duration based on history
        $multiplier = 1 + ($muteCount * 0.5); // 50% increase per previous mute
        
        return min($baseDuration * $multiplier, 604800); // Max 7 days
    }
    
    /**
     * Calculate ban duration based on severity and history
     */
    private function calculateBanDuration(string $severity, int $banCount) {
        $baseDuration = $this->moderationConfig['ban_durations'][$severity] ?? 86400;
        
        if ($baseDuration === 0) { // Permanent ban
            return 0;
        }
        
        // Escalate duration based on history
        $multiplier = 1 + ($banCount * 1.0); // 100% increase per previous ban
        
        return min($baseDuration * $multiplier, 7776000); // Max 90 days for temp bans
    }
    
    /**
     * Escalate mute to ban
     */
    private function escalateToBan(string $userId, string $roomId, string $moderatorId, string $reason) {
        return $this->banUser([
            'user_id' => $userId,
            'room_id' => $roomId,
            'moderator_id' => $moderatorId,
            'reason' => $reason,
            'severity' => 'medium',
            'escalated_from_mutes' => true
        ]);
    }
    
    /**
     * Count recent mutes for a user
     */
    private function countRecentMutes(string $userId, int $timeframe) {
        $userHistory = $this->getUserModerationHistory($userId);
        $recentMutes = 0;
        $cutoff = time() - $timeframe;
        
        foreach ($userHistory['violations'] ?? [] as $violation) {
            if ($violation['type'] === 'mute' && $violation['timestamp'] > $cutoff) {
                $recentMutes++;
            }
        }
        
        return $recentMutes;
    }
    
    /**
     * Count recent bans for a user
     */
    private function countRecentBans(string $userId, int $timeframe) {
        $userHistory = $this->getUserModerationHistory($userId);
        $recentBans = 0;
        $cutoff = time() - $timeframe;
        
        foreach ($userHistory['violations'] ?? [] as $violation) {
            if ($violation['type'] === 'ban' && $violation['timestamp'] > $cutoff) {
                $recentBans++;
            }
        }
        
        return $recentBans;
    }

    /**
     * Helper methods for user tracking
     */

    private function updateUserActiveMutes(string $userId, string $muteId, string $action) {
        $activeMutes = $this->getUserActiveMutes($userId);

        if ($action === 'add') {
            $activeMutes[] = $muteId;
        } elseif ($action === 'remove') {
            $activeMutes = array_filter($activeMutes, function($id) use ($muteId) {
                return $id !== $muteId;
            });
        }

        $this->fileStorageService->save("user_active_mutes/{$userId}.json", array_values($activeMutes));
    }

    private function updateUserActiveBans(string $userId, string $banId, string $action) {
        $activeBans = $this->getUserActiveBans($userId);

        if ($action === 'add') {
            $activeBans[] = $banId;
        } elseif ($action === 'remove') {
            $activeBans = array_filter($activeBans, function($id) use ($banId) {
                return $id !== $banId;
            });
        }

        $this->fileStorageService->save("user_active_bans/{$userId}.json", array_values($activeBans));
    }

    private function getUserActiveMutes(string $userId) {
        return $this->fileStorageService->load("user_active_mutes/{$userId}.json") ?? [];
    }

    private function getUserActiveBans(string $userId) {
        return $this->fileStorageService->load("user_active_bans/{$userId}.json") ?? [];
    }

    private function clearUserMutes(string $userId, string $roomId) {
        $activeMutes = $this->getUserActiveMutes($userId);

        foreach ($activeMutes as $muteId) {
            $muteData = $this->fileStorageService->load("mutes/{$muteId}.json");
            if ($muteData && $muteData['room_id'] === $roomId && $muteData['active']) {
                $muteData['active'] = false;
                $muteData['cleared_by_ban'] = true;
                $muteData['cleared_at'] = time();
                $this->fileStorageService->save("mutes/{$muteId}.json", $muteData);
                $this->updateUserActiveMutes($userId, $muteId, 'remove');
            }
        }
    }

    private function getUserModerationHistory(string $userId) {
        return $this->chatModerationService->getUserModerationHistory($userId);
    }

    private function checkAppealEligibility(string $userId, array $violationData) {
        // Check if appeals are enabled
        if (!$this->moderationConfig['appeals_enabled']) {
            return ['eligible' => false, 'reason' => 'Appeals are not enabled'];
        }

        // Check maximum appeals
        if ($violationData['appeal_count'] >= $this->moderationConfig['max_appeals']) {
            return ['eligible' => false, 'reason' => 'Maximum appeals reached for this violation'];
        }

        // Check cooldown period
        $lastAppeal = $this->getUserLastAppeal($userId);
        if ($lastAppeal && (time() - $lastAppeal['submitted_at']) < $this->moderationConfig['appeal_cooldown']) {
            $remainingTime = $this->moderationConfig['appeal_cooldown'] - (time() - $lastAppeal['submitted_at']);
            return ['eligible' => false, 'reason' => "Must wait {$remainingTime} seconds before next appeal"];
        }

        // Check if violation is still active
        if (!$violationData['active']) {
            return ['eligible' => false, 'reason' => 'Cannot appeal inactive violations'];
        }

        return ['eligible' => true, 'reason' => 'Eligible to appeal'];
    }

    private function getUserLastAppeal(string $userId) {
        // Get user's most recent appeal
        $userAppeals = $this->fileStorageService->load("user_appeals/{$userId}.json") ?? [];

        if (empty($userAppeals)) {
            return null;
        }

        // Sort by submission time and get the latest
        usort($userAppeals, function($a, $b) {
            return $b['submitted_at'] - $a['submitted_at'];
        });

        return $userAppeals[0];
    }

    private function getUserPendingAppeals(string $userId) {
        $userAppeals = $this->fileStorageService->load("user_appeals/{$userId}.json") ?? [];

        return array_filter($userAppeals, function($appeal) {
            return $appeal['status'] === 'pending';
        });
    }

    private function canUserAppeal(string $userId) {
        $userHistory = $this->getUserModerationHistory($userId);
        $reputationScore = $userHistory['reputation_score'] ?? 100;

        // Users with very low reputation cannot appeal
        if ($reputationScore < 10) {
            return false;
        }

        // Check if user has pending appeals
        $pendingAppeals = $this->getUserPendingAppeals($userId);
        if (count($pendingAppeals) >= 2) { // Max 2 pending appeals
            return false;
        }

        return true;
    }

    private function reverseViolation(string $violationId, string $violationType, string $moderatorId, string $reason) {
        $violationData = $this->fileStorageService->load("{$violationType}s/{$violationId}.json");

        if ($violationData && $violationData['active']) {
            $violationData['active'] = false;
            $violationData['reversed'] = true;
            $violationData['reversed_by'] = $moderatorId;
            $violationData['reversed_at'] = time();
            $violationData['reversal_reason'] = $reason;

            $this->fileStorageService->save("{$violationType}s/{$violationId}.json", $violationData);

            // Update user's active violations
            if ($violationType === 'mute') {
                $this->updateUserActiveMutes($violationData['user_id'], $violationId, 'remove');
            } elseif ($violationType === 'ban') {
                $this->updateUserActiveBans($violationData['user_id'], $violationId, 'remove');
            }
        }
    }

    private function logModerationAction(string $action, array $data) {
        $logEntry = [
            'action' => $action,
            'timestamp' => time(),
            'data' => $data,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ];

        $logFile = "user_moderation_logs/" . date('Y-m-d') . ".json";
        $existingLogs = $this->fileStorageService->load($logFile) ?? [];
        $existingLogs[] = $logEntry;

        $this->fileStorageService->save($logFile, $existingLogs);
    }

    private function sendModerationNotifications(string $action, array $data) {
        // Implementation for sending notifications to users and moderators
        // This could integrate with email, push notifications, etc.

        $notification = [
            'type' => 'moderation_action',
            'action' => $action,
            'user_id' => $data['user_id'],
            'timestamp' => time(),
            'data' => $data
        ];

        // Save notification for user
        $userNotifications = $this->fileStorageService->load("user_notifications/{$data['user_id']}.json") ?? [];
        $userNotifications[] = $notification;

        // Keep only last 50 notifications
        $userNotifications = array_slice($userNotifications, -50);

        $this->fileStorageService->save("user_notifications/{$data['user_id']}.json", $userNotifications);
    }

    private function notifyModeratorsOfAppeal(array $appealData) {
        $notification = [
            'type' => 'new_appeal',
            'appeal_id' => $appealData['appeal_id'],
            'user_id' => $appealData['user_id'],
            'violation_type' => $appealData['violation_type'],
            'submitted_at' => $appealData['submitted_at'],
            'reason' => $appealData['reason']
        ];

        // Save to moderator notifications queue
        $moderatorNotifications = $this->fileStorageService->load("moderator_notifications.json") ?? [];
        $moderatorNotifications[] = $notification;

        // Keep only last 100 notifications
        $moderatorNotifications = array_slice($moderatorNotifications, -100);

        $this->fileStorageService->save("moderator_notifications.json", $moderatorNotifications);
    }

    private function notifyUserOfAppealDecision(array $appealData) {
        $notification = [
            'type' => 'appeal_decision',
            'appeal_id' => $appealData['appeal_id'],
            'decision' => $appealData['decision'],
            'decision_reason' => $appealData['decision_reason'],
            'reviewed_at' => $appealData['reviewed_at'],
            'reviewed_by' => $appealData['reviewed_by']
        ];

        // Save notification for user
        $userNotifications = $this->fileStorageService->load("user_notifications/{$appealData['user_id']}.json") ?? [];
        $userNotifications[] = $notification;

        // Keep only last 50 notifications
        $userNotifications = array_slice($userNotifications, -50);

        $this->fileStorageService->save("user_notifications/{$appealData['user_id']}.json", $userNotifications);
    }

    /**
     * Get moderation statistics for admins
     */
    public function getModerationStatistics(int $days = 7) {
        $stats = [
            'total_mutes' => 0,
            'total_bans' => 0,
            'active_mutes' => 0,
            'active_bans' => 0,
            'pending_appeals' => 0,
            'approved_appeals' => 0,
            'denied_appeals' => 0,
            'escalations' => 0,
            'auto_actions' => 0,
            'manual_actions' => 0
        ];

        $startTime = time() - ($days * 86400);

        // Count from log files
        for ($i = 0; $i < $days; $i++) {
            $date = date('Y-m-d', time() - ($i * 86400));
            $logFile = "user_moderation_logs/{$date}.json";
            $logs = $this->fileStorageService->load($logFile) ?? [];

            foreach ($logs as $log) {
                if ($log['timestamp'] < $startTime) {
                    continue;
                }

                switch ($log['action']) {
                    case 'mute':
                        $stats['total_mutes']++;
                        if ($log['data']['moderator_id'] === 'system') {
                            $stats['auto_actions']++;
                        } else {
                            $stats['manual_actions']++;
                        }
                        if ($log['data']['escalated']) {
                            $stats['escalations']++;
                        }
                        break;
                    case 'ban':
                        $stats['total_bans']++;
                        if ($log['data']['moderator_id'] === 'system') {
                            $stats['auto_actions']++;
                        } else {
                            $stats['manual_actions']++;
                        }
                        if ($log['data']['escalated']) {
                            $stats['escalations']++;
                        }
                        break;
                    case 'appeal_submitted':
                        $stats['pending_appeals']++;
                        break;
                    case 'appeal_reviewed':
                        if ($log['data']['decision'] === 'approved') {
                            $stats['approved_appeals']++;
                        } else {
                            $stats['denied_appeals']++;
                        }
                        break;
                }
            }
        }

        return $stats;
    }

    /**
     * Clean up expired violations
     */
    public function cleanupExpiredViolations() {
        $now = time();
        $cleaned = ['mutes' => 0, 'bans' => 0];

        // Clean up expired mutes
        $muteFiles = glob($this->fileStorageService->getStoragePath() . '/mutes/*.json');
        foreach ($muteFiles as $file) {
            $muteData = json_decode(file_get_contents($file), true);
            if ($muteData && $muteData['active'] && $muteData['unmute_at'] <= $now) {
                $muteData['active'] = false;
                $muteData['expired_at'] = $now;
                file_put_contents($file, json_encode($muteData));

                $this->updateUserActiveMutes($muteData['user_id'], $muteData['mute_id'], 'remove');
                $cleaned['mutes']++;
            }
        }

        // Clean up expired bans
        $banFiles = glob($this->fileStorageService->getStoragePath() . '/bans/*.json');
        foreach ($banFiles as $file) {
            $banData = json_decode(file_get_contents($file), true);
            if ($banData && $banData['active'] && !$banData['permanent'] && $banData['unban_at'] <= $now) {
                $banData['active'] = false;
                $banData['expired_at'] = $now;
                file_put_contents($file, json_encode($banData));

                $this->updateUserActiveBans($banData['user_id'], $banData['ban_id'], 'remove');
                $cleaned['bans']++;
            }
        }

        return $cleaned;
    }
}
