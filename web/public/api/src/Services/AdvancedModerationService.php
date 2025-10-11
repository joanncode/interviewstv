<?php

namespace App\Services;

use PDO;
use Exception;

/**
 * Advanced Moderation Service for Content Safety and Community Management
 */
class AdvancedModerationService
{
    private PDO $pdo;
    private array $config;
    private AIService $aiService;

    public function __construct(PDO $pdo, AIService $aiService, array $config = [])
    {
        $this->pdo = $pdo;
        $this->aiService = $aiService;
        $this->config = array_merge([
            'auto_moderation_enabled' => true,
            'ai_moderation_enabled' => true,
            'toxicity_threshold' => 0.7,
            'spam_threshold' => 0.8,
            'hate_speech_threshold' => 0.6,
            'auto_action_threshold' => 0.9,
            'quarantine_threshold' => 0.7,
            'review_queue_enabled' => true,
            'escalation_enabled' => true,
            'community_reporting_enabled' => true
        ], $config);
    }

    /**
     * Moderate content using multiple detection methods
     */
    public function moderateContent(array $contentData): array
    {
        $contentId = $contentData['id'];
        $contentType = $contentData['type']; // 'interview', 'comment', 'business', 'message'
        $content = $contentData['content'];
        $userId = $contentData['user_id'];

        try {
            // Initialize moderation result
            $moderationResult = [
                'content_id' => $contentId,
                'content_type' => $contentType,
                'user_id' => $userId,
                'status' => 'approved',
                'confidence' => 0.0,
                'flags' => [],
                'actions' => [],
                'requires_review' => false,
                'auto_actioned' => false
            ];

            // Run multiple moderation checks
            $checks = [
                'ai_moderation' => $this->runAIModerationCheck($content),
                'keyword_filter' => $this->runKeywordFilter($content),
                'spam_detection' => $this->runSpamDetection($content, $userId),
                'user_reputation' => $this->checkUserReputation($userId),
                'content_similarity' => $this->checkContentSimilarity($content, $contentType),
                'rate_limiting' => $this->checkRateLimiting($userId, $contentType),
                'image_moderation' => $this->moderateImages($contentData),
                'link_analysis' => $this->analyzeLinksSafety($content)
            ];

            // Aggregate results
            $moderationResult = $this->aggregateModerationResults($moderationResult, $checks);

            // Determine final action
            $moderationResult = $this->determineFinalAction($moderationResult);

            // Log moderation result
            $this->logModerationResult($moderationResult);

            // Execute actions if needed
            if ($moderationResult['auto_actioned']) {
                $this->executeAutoActions($moderationResult);
            }

            // Add to review queue if needed
            if ($moderationResult['requires_review']) {
                $this->addToReviewQueue($moderationResult);
            }

            return $moderationResult;

        } catch (Exception $e) {
            error_log("Moderation error: " . $e->getMessage());
            
            // Fail safe - require manual review
            return [
                'content_id' => $contentId,
                'content_type' => $contentType,
                'status' => 'pending_review',
                'requires_review' => true,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Run AI-powered content moderation
     */
    private function runAIModerationCheck(string $content): array
    {
        if (!$this->config['ai_moderation_enabled']) {
            return ['enabled' => false];
        }

        try {
            $result = $this->aiService->moderateContent($content);
            
            return [
                'enabled' => true,
                'toxicity' => $result['toxicity'] ?? 0,
                'severe_toxicity' => $result['severe_toxicity'] ?? 0,
                'identity_attack' => $result['identity_attack'] ?? 0,
                'insult' => $result['insult'] ?? 0,
                'profanity' => $result['profanity'] ?? 0,
                'threat' => $result['threat'] ?? 0,
                'sexually_explicit' => $result['sexually_explicit'] ?? 0,
                'flirtation' => $result['flirtation'] ?? 0,
                'spam' => $result['spam'] ?? 0,
                'overall_score' => max($result['toxicity'] ?? 0, $result['severe_toxicity'] ?? 0)
            ];
        } catch (Exception $e) {
            error_log("AI moderation error: " . $e->getMessage());
            return ['enabled' => true, 'error' => $e->getMessage()];
        }
    }

    /**
     * Run keyword-based content filtering
     */
    private function runKeywordFilter(string $content): array
    {
        $stmt = $this->pdo->prepare("
            SELECT category, severity, keywords 
            FROM moderation_keywords 
            WHERE is_active = TRUE
        ");
        $stmt->execute();
        $keywordSets = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $matches = [];
        $maxSeverity = 0;

        foreach ($keywordSets as $set) {
            $keywords = json_decode($set['keywords'], true);
            foreach ($keywords as $keyword) {
                if (stripos($content, $keyword) !== false) {
                    $matches[] = [
                        'keyword' => $keyword,
                        'category' => $set['category'],
                        'severity' => $set['severity']
                    ];
                    $maxSeverity = max($maxSeverity, $set['severity']);
                }
            }
        }

        return [
            'matches' => $matches,
            'max_severity' => $maxSeverity,
            'score' => min($maxSeverity / 10, 1.0)
        ];
    }

    /**
     * Detect spam content
     */
    private function runSpamDetection(string $content, int $userId): array
    {
        $spamScore = 0;
        $indicators = [];

        // Check for excessive repetition
        $words = str_word_count($content, 1);
        $uniqueWords = array_unique($words);
        if (count($words) > 10 && (count($uniqueWords) / count($words)) < 0.3) {
            $spamScore += 0.3;
            $indicators[] = 'excessive_repetition';
        }

        // Check for excessive capitalization
        $upperCount = preg_match_all('/[A-Z]/', $content);
        $totalChars = strlen(preg_replace('/[^A-Za-z]/', '', $content));
        if ($totalChars > 20 && ($upperCount / $totalChars) > 0.7) {
            $spamScore += 0.2;
            $indicators[] = 'excessive_caps';
        }

        // Check for excessive links
        $linkCount = preg_match_all('/https?:\/\/[^\s]+/', $content);
        if ($linkCount > 3) {
            $spamScore += 0.4;
            $indicators[] = 'excessive_links';
        }

        // Check user posting frequency
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) as recent_posts 
            FROM moderation_logs 
            WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        ");
        $stmt->execute([$userId]);
        $recentPosts = $stmt->fetchColumn();

        if ($recentPosts > 20) {
            $spamScore += 0.5;
            $indicators[] = 'high_frequency_posting';
        }

        return [
            'score' => min($spamScore, 1.0),
            'indicators' => $indicators
        ];
    }

    /**
     * Check user reputation and history
     */
    private function checkUserReputation(int $userId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT 
                reputation_score,
                total_violations,
                recent_violations,
                account_age_days,
                is_verified,
                is_trusted
            FROM user_moderation_profiles 
            WHERE user_id = ?
        ");
        $stmt->execute([$userId]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$profile) {
            // Create profile for new user
            $this->createUserModerationProfile($userId);
            return ['score' => 0.5, 'new_user' => true];
        }

        $riskScore = 0;

        // Factor in reputation
        if ($profile['reputation_score'] < 20) {
            $riskScore += 0.3;
        }

        // Factor in violations
        if ($profile['recent_violations'] > 3) {
            $riskScore += 0.4;
        }

        // Factor in account age
        if ($profile['account_age_days'] < 7) {
            $riskScore += 0.2;
        }

        // Reduce risk for verified/trusted users
        if ($profile['is_verified']) {
            $riskScore -= 0.2;
        }
        if ($profile['is_trusted']) {
            $riskScore -= 0.3;
        }

        return [
            'score' => max(0, min($riskScore, 1.0)),
            'profile' => $profile
        ];
    }

    /**
     * Check for content similarity (duplicate detection)
     */
    private function checkContentSimilarity(string $content, string $contentType): array
    {
        $contentHash = hash('sha256', strtolower(trim($content)));
        
        $stmt = $this->pdo->prepare("
            SELECT content_id, similarity_score 
            FROM content_fingerprints 
            WHERE content_type = ? AND content_hash = ?
            LIMIT 1
        ");
        $stmt->execute([$contentType, $contentHash]);
        $duplicate = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($duplicate) {
            return [
                'is_duplicate' => true,
                'original_content_id' => $duplicate['content_id'],
                'score' => 1.0
            ];
        }

        // Check for near-duplicates using fuzzy matching
        $words = str_word_count(strtolower($content), 1);
        $wordHash = hash('sha256', implode('', array_slice($words, 0, 10)));

        $stmt = $this->pdo->prepare("
            SELECT content_id, content_hash 
            FROM content_fingerprints 
            WHERE content_type = ? AND word_hash = ?
            LIMIT 5
        ");
        $stmt->execute([$contentType, $wordHash]);
        $similar = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $maxSimilarity = 0;
        foreach ($similar as $item) {
            $similarity = $this->calculateTextSimilarity($content, $item['content_hash']);
            $maxSimilarity = max($maxSimilarity, $similarity);
        }

        return [
            'is_duplicate' => false,
            'max_similarity' => $maxSimilarity,
            'score' => $maxSimilarity > 0.8 ? 0.7 : 0
        ];
    }

    /**
     * Check rate limiting violations
     */
    private function checkRateLimiting(int $userId, string $contentType): array
    {
        $limits = [
            'interview' => ['count' => 5, 'period' => 3600], // 5 per hour
            'comment' => ['count' => 30, 'period' => 3600],  // 30 per hour
            'message' => ['count' => 100, 'period' => 3600], // 100 per hour
            'business' => ['count' => 2, 'period' => 86400]  // 2 per day
        ];

        $limit = $limits[$contentType] ?? $limits['comment'];

        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) as count 
            FROM moderation_logs 
            WHERE user_id = ? AND content_type = ? 
            AND created_at > DATE_SUB(NOW(), INTERVAL ? SECOND)
        ");
        $stmt->execute([$userId, $contentType, $limit['period']]);
        $count = $stmt->fetchColumn();

        $violation = $count >= $limit['count'];
        $score = $violation ? 1.0 : ($count / $limit['count']);

        return [
            'violation' => $violation,
            'count' => $count,
            'limit' => $limit['count'],
            'score' => $score
        ];
    }

    /**
     * Moderate images using AI
     */
    private function moderateImages(array $contentData): array
    {
        if (empty($contentData['images'])) {
            return ['enabled' => false];
        }

        $results = [];
        foreach ($contentData['images'] as $imageUrl) {
            try {
                // Use AI service for image moderation
                $result = $this->aiService->moderateImage($imageUrl);
                $results[] = $result;
            } catch (Exception $e) {
                error_log("Image moderation error: " . $e->getMessage());
                $results[] = ['error' => $e->getMessage()];
            }
        }

        $maxScore = 0;
        foreach ($results as $result) {
            if (isset($result['adult_content'])) {
                $maxScore = max($maxScore, $result['adult_content']);
            }
            if (isset($result['violence'])) {
                $maxScore = max($maxScore, $result['violence']);
            }
        }

        return [
            'enabled' => true,
            'results' => $results,
            'max_score' => $maxScore,
            'score' => $maxScore
        ];
    }

    /**
     * Process user reports
     */
    public function processUserReport(array $reportData): array
    {
        $reportId = $this->createUserReport($reportData);

        // Auto-escalate if multiple reports for same content
        $reportCount = $this->getReportCount($reportData['content_id'], $reportData['content_type']);

        if ($reportCount >= 3) {
            $this->escalateToReview($reportData['content_id'], $reportData['content_type'], 'multiple_reports');
        }

        return ['report_id' => $reportId, 'status' => 'submitted'];
    }

    /**
     * Get moderation queue items
     */
    public function getModerationQueue(array $filters = []): array
    {
        $whereClause = "WHERE 1=1";
        $params = [];

        if (!empty($filters['priority'])) {
            $whereClause .= " AND priority = ?";
            $params[] = $filters['priority'];
        }

        if (!empty($filters['content_type'])) {
            $whereClause .= " AND content_type = ?";
            $params[] = $filters['content_type'];
        }

        if (!empty($filters['status'])) {
            $whereClause .= " AND status = ?";
            $params[] = $filters['status'];
        }

        $stmt = $this->pdo->prepare("
            SELECT * FROM moderation_queue
            {$whereClause}
            ORDER BY priority ASC, created_at ASC
            LIMIT 50
        ");

        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Review and action moderation queue item
     */
    public function reviewQueueItem(string $queueId, string $action, string $reason, int $moderatorId): array
    {
        try {
            $this->pdo->beginTransaction();

            // Get queue item
            $stmt = $this->pdo->prepare("SELECT * FROM moderation_queue WHERE id = ?");
            $stmt->execute([$queueId]);
            $item = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$item) {
                throw new Exception("Queue item not found");
            }

            // Execute action
            switch ($action) {
                case 'approve':
                    $this->approveContent($item['content_id'], $item['content_type']);
                    break;
                case 'reject':
                    $this->rejectContent($item['content_id'], $item['content_type']);
                    break;
                case 'quarantine':
                    $this->quarantineContent($item['content_id'], $item['content_type']);
                    break;
                case 'escalate':
                    $this->escalateToSeniorModerator($item);
                    break;
            }

            // Update queue item
            $stmt = $this->pdo->prepare("
                UPDATE moderation_queue
                SET status = 'reviewed', action_taken = ?, reason = ?,
                    reviewed_by = ?, reviewed_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([$action, $reason, $moderatorId, $queueId]);

            // Log moderation action
            $this->logModeratorAction($moderatorId, $action, $item, $reason);

            $this->pdo->commit();

            return ['status' => 'success', 'action' => $action];

        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Analyze links for safety
     */
    private function analyzeLinksSafety(string $content): array
    {
        preg_match_all('/https?:\/\/[^\s]+/', $content, $matches);
        $links = $matches[0];

        if (empty($links)) {
            return ['enabled' => false];
        }

        $results = [];
        $maxRisk = 0;

        foreach ($links as $link) {
            $domain = parse_url($link, PHP_URL_HOST);
            
            // Check against known malicious domains
            $stmt = $this->pdo->prepare("
                SELECT risk_level 
                FROM malicious_domains 
                WHERE domain = ? OR domain = ?
            ");
            $stmt->execute([$domain, '*.' . $domain]);
            $riskLevel = $stmt->fetchColumn();

            if ($riskLevel) {
                $maxRisk = max($maxRisk, $riskLevel / 10);
                $results[] = [
                    'url' => $link,
                    'domain' => $domain,
                    'risk_level' => $riskLevel,
                    'status' => 'malicious'
                ];
            } else {
                $results[] = [
                    'url' => $link,
                    'domain' => $domain,
                    'risk_level' => 0,
                    'status' => 'safe'
                ];
            }
        }

        return [
            'enabled' => true,
            'links' => $results,
            'max_risk' => $maxRisk,
            'score' => $maxRisk
        ];
    }

    /**
     * Aggregate all moderation results
     */
    private function aggregateModerationResults(array $result, array $checks): array
    {
        $totalScore = 0;
        $weights = [
            'ai_moderation' => 0.3,
            'keyword_filter' => 0.2,
            'spam_detection' => 0.2,
            'user_reputation' => 0.1,
            'content_similarity' => 0.1,
            'rate_limiting' => 0.05,
            'image_moderation' => 0.03,
            'link_analysis' => 0.02
        ];

        foreach ($checks as $checkType => $checkResult) {
            if (isset($checkResult['score']) && isset($weights[$checkType])) {
                $totalScore += $checkResult['score'] * $weights[$checkType];
            }

            // Collect flags
            if ($checkResult['score'] > 0.5) {
                $result['flags'][] = $checkType;
            }
        }

        $result['confidence'] = min($totalScore, 1.0);
        $result['checks'] = $checks;

        return $result;
    }

    /**
     * Determine final moderation action
     */
    private function determineFinalAction(array $result): array
    {
        $confidence = $result['confidence'];

        if ($confidence >= $this->config['auto_action_threshold']) {
            $result['status'] = 'rejected';
            $result['actions'][] = 'auto_reject';
            $result['auto_actioned'] = true;
        } elseif ($confidence >= $this->config['quarantine_threshold']) {
            $result['status'] = 'quarantined';
            $result['actions'][] = 'quarantine';
            $result['requires_review'] = true;
        } elseif ($confidence >= 0.3) {
            $result['status'] = 'flagged';
            $result['requires_review'] = true;
        } else {
            $result['status'] = 'approved';
        }

        return $result;
    }

    /**
     * Execute automatic actions
     */
    private function executeAutoActions(array $result): void
    {
        foreach ($result['actions'] as $action) {
            switch ($action) {
                case 'auto_reject':
                    $this->rejectContent($result['content_id'], $result['content_type']);
                    $this->notifyUser($result['user_id'], 'content_rejected', $result);
                    break;
                    
                case 'quarantine':
                    $this->quarantineContent($result['content_id'], $result['content_type']);
                    break;
            }
        }
    }

    /**
     * Add content to review queue
     */
    private function addToReviewQueue(array $result): void
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO moderation_queue (
                content_id, content_type, user_id, priority, confidence_score,
                flags, moderation_data, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ");

        $priority = $this->calculateReviewPriority($result);
        
        $stmt->execute([
            $result['content_id'],
            $result['content_type'],
            $result['user_id'],
            $priority,
            $result['confidence'],
            json_encode($result['flags']),
            json_encode($result)
        ]);
    }

    /**
     * Log moderation result
     */
    private function logModerationResult(array $result): void
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO moderation_logs (
                content_id, content_type, user_id, status, confidence_score,
                flags, actions, moderation_data, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");

        $stmt->execute([
            $result['content_id'],
            $result['content_type'],
            $result['user_id'],
            $result['status'],
            $result['confidence'],
            json_encode($result['flags']),
            json_encode($result['actions']),
            json_encode($result)
        ]);
    }

    // Helper methods
    private function createUserModerationProfile(int $userId): void
    {
        $stmt = $this->pdo->prepare("
            INSERT IGNORE INTO user_moderation_profiles (
                user_id, reputation_score, account_age_days, created_at
            ) VALUES (?, 50, DATEDIFF(NOW(), (SELECT created_at FROM users WHERE id = ?)), NOW())
        ");
        $stmt->execute([$userId, $userId]);
    }

    private function calculateTextSimilarity(string $text1, string $text2): float
    {
        // Simple similarity calculation (can be enhanced with more sophisticated algorithms)
        $words1 = str_word_count(strtolower($text1), 1);
        $words2 = str_word_count(strtolower($text2), 1);
        
        $intersection = array_intersect($words1, $words2);
        $union = array_unique(array_merge($words1, $words2));
        
        return count($union) > 0 ? count($intersection) / count($union) : 0;
    }

    private function calculateReviewPriority(array $result): int
    {
        $priority = 3; // Normal priority
        
        if ($result['confidence'] > 0.8) {
            $priority = 1; // High priority
        } elseif ($result['confidence'] > 0.6) {
            $priority = 2; // Medium priority
        }
        
        // Increase priority for certain flags
        $highPriorityFlags = ['hate_speech', 'threat', 'severe_toxicity'];
        foreach ($result['flags'] as $flag) {
            if (in_array($flag, $highPriorityFlags)) {
                $priority = min($priority, 1);
                break;
            }
        }
        
        return $priority;
    }

    private function rejectContent(string $contentId, string $contentType): void
    {
        $table = $this->getContentTable($contentType);
        $stmt = $this->pdo->prepare("UPDATE {$table} SET status = 'rejected' WHERE id = ?");
        $stmt->execute([$contentId]);
    }

    private function quarantineContent(string $contentId, string $contentType): void
    {
        $table = $this->getContentTable($contentType);
        $stmt = $this->pdo->prepare("UPDATE {$table} SET status = 'quarantined' WHERE id = ?");
        $stmt->execute([$contentId]);
    }

    private function getContentTable(string $contentType): string
    {
        $tables = [
            'interview' => 'interviews',
            'comment' => 'comments',
            'business' => 'businesses',
            'message' => 'messages'
        ];
        
        return $tables[$contentType] ?? 'content';
    }

    private function notifyUser(int $userId, string $type, array $data): void
    {
        // Implementation would depend on notification system
        // This is a placeholder for user notification
    }
}
