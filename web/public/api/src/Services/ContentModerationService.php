<?php

namespace App\Services;

class ContentModerationService
{
    use \App\Models\DatabaseConnection;

    private $bannedWords = [
        'spam', 'scam', 'fake', 'inappropriate', 'offensive'
        // Add more banned words as needed
    ];

    private $suspiciousPatterns = [
        '/\b(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\b/', // URLs
        '/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/', // Phone numbers
        '/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/', // Email addresses
    ];

    public function moderateContent($content, $type = 'interview')
    {
        $issues = [];
        $score = 0;
        $autoAction = 'approve';

        // Check for banned words
        $bannedWordIssues = $this->checkBannedWords($content);
        if (!empty($bannedWordIssues)) {
            $issues = array_merge($issues, $bannedWordIssues);
            $score += count($bannedWordIssues) * 10;
        }

        // Check for suspicious patterns
        $patternIssues = $this->checkSuspiciousPatterns($content);
        if (!empty($patternIssues)) {
            $issues = array_merge($issues, $patternIssues);
            $score += count($patternIssues) * 5;
        }

        // Check content length and quality
        $qualityIssues = $this->checkContentQuality($content, $type);
        if (!empty($qualityIssues)) {
            $issues = array_merge($issues, $qualityIssues);
            $score += count($qualityIssues) * 3;
        }

        // Determine auto action based on score
        if ($score >= 20) {
            $autoAction = 'reject';
        } elseif ($score >= 10) {
            $autoAction = 'review';
        }

        return [
            'score' => $score,
            'issues' => $issues,
            'auto_action' => $autoAction,
            'requires_review' => $score >= 10
        ];
    }

    public function flagContent($contentId, $contentType, $reason, $reportedBy, $description = null)
    {
        $pdo = self::getConnection();

        $sql = "INSERT INTO content_flags (
            content_id, content_type, reason, reported_by, description, 
            status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'pending', NOW(), NOW())";

        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute([
            $contentId, $contentType, $reason, $reportedBy, $description
        ]);

        if ($result) {
            // Update content moderation status
            $this->updateModerationStatus($contentId, $contentType, 'flagged');
            
            // Notify moderators if multiple flags
            $this->checkFlagThreshold($contentId, $contentType);
        }

        return $result;
    }

    public function reviewContent($contentId, $contentType, $moderatorId, $action, $notes = null)
    {
        $pdo = self::getConnection();

        // Record moderation action
        $sql = "INSERT INTO moderation_actions (
            content_id, content_type, moderator_id, action, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, NOW())";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$contentId, $contentType, $moderatorId, $action, $notes]);

        // Update content status
        $newStatus = match($action) {
            'approve' => 'approved',
            'reject' => 'rejected',
            'hide' => 'hidden',
            'delete' => 'deleted',
            default => 'pending'
        };

        $this->updateModerationStatus($contentId, $contentType, $newStatus);

        // Update flags status
        $sql = "UPDATE content_flags 
                SET status = 'resolved', resolved_by = ?, resolved_at = NOW() 
                WHERE content_id = ? AND content_type = ? AND status = 'pending'";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$moderatorId, $contentId, $contentType]);

        return true;
    }

    public function getPendingReviews($limit = 50, $contentType = null)
    {
        $pdo = self::getConnection();

        $whereClause = "WHERE cf.status = 'pending'";
        $params = [];

        if ($contentType) {
            $whereClause .= " AND cf.content_type = ?";
            $params[] = $contentType;
        }

        $sql = "SELECT 
                    cf.id as flag_id,
                    cf.content_id,
                    cf.content_type,
                    cf.reason,
                    cf.description,
                    cf.created_at as flagged_at,
                    u.name as reported_by_name,
                    COUNT(*) as flag_count,
                    CASE 
                        WHEN cf.content_type = 'interview' THEN i.title
                        WHEN cf.content_type = 'comment' THEN c.content
                        ELSE 'Unknown'
                    END as content_title
                FROM content_flags cf
                LEFT JOIN users u ON cf.reported_by = u.id
                LEFT JOIN interviews i ON cf.content_type = 'interview' AND cf.content_id = i.id
                LEFT JOIN comments c ON cf.content_type = 'comment' AND cf.content_id = c.id
                {$whereClause}
                GROUP BY cf.content_id, cf.content_type
                ORDER BY flag_count DESC, cf.created_at ASC
                LIMIT ?";

        $params[] = $limit;

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getModerationStats($dateRange = '30 days')
    {
        $pdo = self::getConnection();

        $sql = "SELECT 
                    COUNT(*) as total_flags,
                    COUNT(CASE WHEN cf.status = 'pending' THEN 1 END) as pending_flags,
                    COUNT(CASE WHEN cf.status = 'resolved' THEN 1 END) as resolved_flags,
                    COUNT(DISTINCT cf.content_id, cf.content_type) as unique_flagged_content,
                    AVG(TIMESTAMPDIFF(HOUR, cf.created_at, cf.resolved_at)) as avg_resolution_time_hours
                FROM content_flags cf
                WHERE cf.created_at >= DATE_SUB(NOW(), INTERVAL {$dateRange})";

        $stmt = $pdo->prepare($sql);
        $stmt->execute();

        $flagStats = $stmt->fetch(\PDO::FETCH_ASSOC);

        // Get moderation actions stats
        $sql = "SELECT 
                    action,
                    COUNT(*) as count
                FROM moderation_actions ma
                WHERE ma.created_at >= DATE_SUB(NOW(), INTERVAL {$dateRange})
                GROUP BY action";

        $stmt = $pdo->prepare($sql);
        $stmt->execute();

        $actionStats = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return [
            'flags' => $flagStats,
            'actions' => $actionStats
        ];
    }

    private function checkBannedWords($content)
    {
        $issues = [];
        $contentLower = strtolower($content);

        foreach ($this->bannedWords as $word) {
            if (strpos($contentLower, strtolower($word)) !== false) {
                $issues[] = [
                    'type' => 'banned_word',
                    'severity' => 'high',
                    'message' => "Contains banned word: {$word}"
                ];
            }
        }

        return $issues;
    }

    private function checkSuspiciousPatterns($content)
    {
        $issues = [];

        foreach ($this->suspiciousPatterns as $pattern) {
            if (preg_match($pattern, $content)) {
                $issues[] = [
                    'type' => 'suspicious_pattern',
                    'severity' => 'medium',
                    'message' => 'Contains suspicious pattern (URL, email, or phone number)'
                ];
            }
        }

        return $issues;
    }

    private function checkContentQuality($content, $type)
    {
        $issues = [];

        // Check minimum length
        $minLength = match($type) {
            'interview' => 50,
            'comment' => 10,
            'description' => 20,
            default => 10
        };

        if (strlen(trim($content)) < $minLength) {
            $issues[] = [
                'type' => 'content_quality',
                'severity' => 'low',
                'message' => "Content too short (minimum {$minLength} characters)"
            ];
        }

        // Check for excessive capitalization
        $upperCaseRatio = strlen(preg_replace('/[^A-Z]/', '', $content)) / strlen($content);
        if ($upperCaseRatio > 0.5) {
            $issues[] = [
                'type' => 'content_quality',
                'severity' => 'medium',
                'message' => 'Excessive use of capital letters'
            ];
        }

        // Check for repeated characters
        if (preg_match('/(.)\1{4,}/', $content)) {
            $issues[] = [
                'type' => 'content_quality',
                'severity' => 'low',
                'message' => 'Contains repeated characters'
            ];
        }

        return $issues;
    }

    private function updateModerationStatus($contentId, $contentType, $status)
    {
        $pdo = self::getConnection();

        $table = match($contentType) {
            'interview' => 'interviews',
            'comment' => 'comments',
            'gallery' => 'galleries',
            default => null
        };

        if (!$table) {
            return false;
        }

        $sql = "UPDATE {$table} SET moderation_status = ?, updated_at = NOW() WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        return $stmt->execute([$status, $contentId]);
    }

    private function checkFlagThreshold($contentId, $contentType)
    {
        $pdo = self::getConnection();

        $sql = "SELECT COUNT(*) FROM content_flags 
                WHERE content_id = ? AND content_type = ? AND status = 'pending'";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$contentId, $contentType]);
        
        $flagCount = $stmt->fetchColumn();

        // Auto-hide content if it has 3+ flags
        if ($flagCount >= 3) {
            $this->updateModerationStatus($contentId, $contentType, 'auto_hidden');
            
            // TODO: Send notification to moderators
            // $this->notifyModerators($contentId, $contentType, $flagCount);
        }

        return $flagCount;
    }

    public function bulkModerate($contentIds, $contentType, $action, $moderatorId, $notes = null)
    {
        $results = [];

        foreach ($contentIds as $contentId) {
            try {
                $this->reviewContent($contentId, $contentType, $moderatorId, $action, $notes);
                $results[] = [
                    'content_id' => $contentId,
                    'success' => true
                ];
            } catch (\Exception $e) {
                $results[] = [
                    'content_id' => $contentId,
                    'success' => false,
                    'error' => $e->getMessage()
                ];
            }
        }

        return $results;
    }
}
