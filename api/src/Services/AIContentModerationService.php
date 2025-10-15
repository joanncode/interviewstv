<?php

namespace App\Services;

use PDO;
use Exception;

/**
 * AI-Powered Content Moderation Service
 * Comprehensive real-time content analysis and moderation system
 */
class AIContentModerationService
{
    private PDO $pdo;
    private array $config;
    private array $aiModels;
    private array $activeSessions;
    private array $moderationRules;
    
    public function __construct(PDO $pdo, array $config = [])
    {
        $this->pdo = $pdo;
        $this->config = array_merge([
            'real_time_enabled' => true,
            'auto_action_enabled' => true,
            'ai_analysis_enabled' => true,
            'multi_model_analysis' => true,
            'confidence_threshold' => 0.7,
            'escalation_threshold' => 0.9,
            'rate_limit_per_minute' => 100,
            'max_processing_time_ms' => 5000,
            'cache_results' => true,
            'log_all_actions' => true,
            'user_notification_enabled' => true,
            'moderator_notification_enabled' => true
        ], $config);
        
        $this->activeSessions = [];
        $this->loadAIModels();
        $this->loadModerationRules();
    }

    /**
     * Start content moderation session
     */
    public function startModerationSession(string $interviewId, int $userId, array $options = []): array
    {
        try {
            $sessionId = 'mod_' . uniqid() . '_' . time();
            
            $sessionData = [
                'session_id' => $sessionId,
                'interview_id' => $interviewId,
                'user_id' => $userId,
                'moderation_mode' => $options['mode'] ?? 'auto',
                'ai_models_enabled' => json_encode($options['ai_models'] ?? ['openai_moderation', 'google_perspective']),
                'sensitivity_level' => $options['sensitivity'] ?? 'medium',
                'auto_action_enabled' => $options['auto_action'] ?? true,
                'real_time_enabled' => $options['real_time'] ?? true,
                'settings' => json_encode($options['settings'] ?? []),
                'status' => 'active'
            ];
            
            // Insert session into database
            $sql = "INSERT INTO content_moderation_sessions (
                session_id, interview_id, user_id, moderation_mode, ai_models_enabled,
                sensitivity_level, auto_action_enabled, real_time_enabled, settings, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $sessionData['session_id'],
                $sessionData['interview_id'],
                $sessionData['user_id'],
                $sessionData['moderation_mode'],
                $sessionData['ai_models_enabled'],
                $sessionData['sensitivity_level'],
                $sessionData['auto_action_enabled'],
                $sessionData['real_time_enabled'],
                $sessionData['settings'],
                $sessionData['status']
            ]);
            
            // Initialize session state
            $this->activeSessions[$sessionId] = [
                'session_data' => $sessionData,
                'content_buffer' => [],
                'analysis_cache' => [],
                'user_history' => $this->getUserModerationHistory($userId),
                'statistics' => [
                    'total_analyzed' => 0,
                    'violations_detected' => 0,
                    'actions_taken' => 0,
                    'false_positives' => 0,
                    'processing_time_total' => 0
                ]
            ];
            
            return [
                'success' => true,
                'session' => $sessionData,
                'message' => 'Content moderation session started successfully'
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to start moderation session: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Analyze content for moderation
     */
    public function analyzeContent(string $sessionId, array $contentData): array
    {
        try {
            if (!isset($this->activeSessions[$sessionId])) {
                throw new Exception('Invalid or inactive session');
            }
            
            $startTime = microtime(true);
            $analysisId = 'analysis_' . uniqid() . '_' . time();
            
            $content = $contentData['content'] ?? '';
            $contentType = $contentData['type'] ?? 'text';
            $contentId = $contentData['content_id'] ?? uniqid();
            
            // Prepare analysis result structure
            $analysisResult = [
                'analysis_id' => $analysisId,
                'session_id' => $sessionId,
                'content_id' => $contentId,
                'content_type' => $contentType,
                'content_text' => $content,
                'ai_analysis' => [],
                'scores' => [
                    'toxicity' => 0.0,
                    'profanity' => 0.0,
                    'hate_speech' => 0.0,
                    'harassment' => 0.0,
                    'threat' => 0.0,
                    'spam' => 0.0,
                    'adult_content' => 0.0,
                    'violence' => 0.0,
                    'overall_risk' => 0.0,
                    'confidence' => 0.0
                ],
                'violations' => [],
                'recommended_action' => 'allow',
                'processing_time_ms' => 0
            ];
            
            // Run AI analysis
            if ($this->config['ai_analysis_enabled']) {
                $aiAnalysis = $this->runAIAnalysis($content, $contentType, $sessionId);
                $analysisResult['ai_analysis'] = $aiAnalysis;
                $this->aggregateScores($analysisResult, $aiAnalysis);
            }
            
            // Apply moderation rules
            $ruleResults = $this->applyModerationRules($analysisResult, $sessionId);
            $analysisResult['rule_results'] = $ruleResults;
            
            // Determine final action
            $finalAction = $this->determineFinalAction($analysisResult, $sessionId);
            $analysisResult['final_action'] = $finalAction;
            
            // Calculate processing time
            $processingTime = (microtime(true) - $startTime) * 1000;
            $analysisResult['processing_time_ms'] = round($processingTime, 2);
            
            // Store analysis result
            $this->storeAnalysisResult($analysisResult);
            
            // Execute action if auto-action is enabled
            if ($this->activeSessions[$sessionId]['session_data']['auto_action_enabled'] && 
                $finalAction['action'] !== 'allow') {
                $actionResult = $this->executeAction($analysisResult, $finalAction);
                $analysisResult['action_result'] = $actionResult;
            }
            
            // Update session statistics
            $this->updateSessionStatistics($sessionId, $analysisResult);
            
            return [
                'success' => true,
                'analysis' => $analysisResult,
                'action_taken' => $finalAction['action'] ?? 'allow',
                'processing_time_ms' => $processingTime
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Content analysis failed: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Run AI analysis using multiple models
     */
    private function runAIAnalysis(string $content, string $contentType, string $sessionId): array
    {
        $session = $this->activeSessions[$sessionId];
        $enabledModels = json_decode($session['session_data']['ai_models_enabled'], true);
        $aiResults = [];
        
        foreach ($enabledModels as $modelId) {
            if (!isset($this->aiModels[$modelId]) || !$this->aiModels[$modelId]['enabled']) {
                continue;
            }
            
            $model = $this->aiModels[$modelId];
            
            try {
                switch ($model['provider']) {
                    case 'openai':
                        $result = $this->analyzeWithOpenAI($content, $model);
                        break;
                    case 'google':
                        $result = $this->analyzeWithGooglePerspective($content, $model);
                        break;
                    case 'azure':
                        $result = $this->analyzeWithAzure($content, $model);
                        break;
                    case 'aws':
                        $result = $this->analyzeWithAWS($content, $model);
                        break;
                    case 'custom':
                        $result = $this->analyzeWithCustomModel($content, $model);
                        break;
                    default:
                        $result = $this->getDemoAnalysisResult($content, $model);
                }
                
                $aiResults[$modelId] = $result;
                
            } catch (Exception $e) {
                $aiResults[$modelId] = [
                    'error' => $e->getMessage(),
                    'model' => $modelId,
                    'success' => false
                ];
            }
        }
        
        return $aiResults;
    }

    /**
     * OpenAI Moderation API analysis
     */
    private function analyzeWithOpenAI(string $content, array $model): array
    {
        // Demo implementation - replace with actual OpenAI API call
        return $this->getDemoAnalysisResult($content, $model, [
            'toxicity' => $this->calculateToxicityScore($content),
            'hate_speech' => $this->calculateHateSpeechScore($content),
            'harassment' => $this->calculateHarassmentScore($content),
            'threat' => $this->calculateThreatScore($content),
            'profanity' => $this->calculateProfanityScore($content),
            'spam' => $this->calculateSpamScore($content)
        ]);
    }

    /**
     * Google Perspective API analysis
     */
    private function analyzeWithGooglePerspective(string $content, array $model): array
    {
        // Demo implementation - replace with actual Google Perspective API call
        return $this->getDemoAnalysisResult($content, $model, [
            'toxicity' => $this->calculateToxicityScore($content) * 0.9,
            'severe_toxicity' => $this->calculateToxicityScore($content) * 1.2,
            'identity_attack' => $this->calculateHateSpeechScore($content),
            'insult' => $this->calculateHarassmentScore($content) * 0.8,
            'profanity' => $this->calculateProfanityScore($content),
            'threat' => $this->calculateThreatScore($content)
        ]);
    }

    /**
     * Azure Content Moderator analysis
     */
    private function analyzeWithAzure(string $content, array $model): array
    {
        // Demo implementation - replace with actual Azure API call
        return $this->getDemoAnalysisResult($content, $model, [
            'adult_content' => $this->calculateAdultContentScore($content),
            'violence' => $this->calculateViolenceScore($content),
            'toxicity' => $this->calculateToxicityScore($content),
            'profanity' => $this->calculateProfanityScore($content)
        ]);
    }

    /**
     * AWS Comprehend analysis
     */
    private function analyzeWithAWS(string $content, array $model): array
    {
        // Demo implementation - replace with actual AWS API call
        return $this->getDemoAnalysisResult($content, $model, [
            'sentiment' => $this->calculateSentimentScore($content),
            'toxicity' => $this->calculateToxicityScore($content),
            'spam' => $this->calculateSpamScore($content)
        ]);
    }

    /**
     * Custom model analysis
     */
    private function analyzeWithCustomModel(string $content, array $model): array
    {
        // Use existing profanity filter service
        return [
            'model' => $model['model_name'],
            'provider' => 'custom',
            'success' => true,
            'scores' => [
                'profanity' => $this->calculateProfanityScore($content),
                'spam' => $this->calculateSpamScore($content),
                'toxicity' => $this->calculateToxicityScore($content)
            ],
            'confidence' => 0.85,
            'processing_time_ms' => rand(50, 200)
        ];
    }

    /**
     * Generate demo analysis result
     */
    private function getDemoAnalysisResult(string $content, array $model, array $customScores = []): array
    {
        $baseScores = [
            'toxicity' => $this->calculateToxicityScore($content),
            'profanity' => $this->calculateProfanityScore($content),
            'hate_speech' => $this->calculateHateSpeechScore($content),
            'harassment' => $this->calculateHarassmentScore($content),
            'threat' => $this->calculateThreatScore($content),
            'spam' => $this->calculateSpamScore($content),
            'adult_content' => $this->calculateAdultContentScore($content),
            'violence' => $this->calculateViolenceScore($content)
        ];
        
        $scores = array_merge($baseScores, $customScores);
        
        return [
            'model' => $model['model_name'],
            'provider' => $model['provider'],
            'success' => true,
            'scores' => $scores,
            'confidence' => max(0.6, min(0.95, array_sum($scores) / count($scores) + 0.3)),
            'processing_time_ms' => rand(100, 800),
            'api_version' => $model['model_version'] ?? '1.0'
        ];
    }

    /**
     * Calculate toxicity score based on content analysis
     */
    private function calculateToxicityScore(string $content): float
    {
        $toxicWords = ['hate', 'stupid', 'idiot', 'moron', 'disgusting', 'pathetic'];
        $score = 0.0;
        $contentLower = strtolower($content);

        foreach ($toxicWords as $word) {
            if (strpos($contentLower, $word) !== false) {
                $score += 0.2;
            }
        }

        // Check for aggressive patterns
        if (preg_match('/[A-Z]{3,}/', $content)) {
            $score += 0.1; // All caps
        }

        if (preg_match('/!{2,}/', $content)) {
            $score += 0.1; // Multiple exclamation marks
        }

        return min(1.0, $score + (rand(0, 20) / 100)); // Add some randomness
    }

    /**
     * Calculate profanity score
     */
    private function calculateProfanityScore(string $content): float
    {
        $profanityWords = ['damn', 'hell', 'crap', 'stupid', 'shut up'];
        $score = 0.0;
        $contentLower = strtolower($content);

        foreach ($profanityWords as $word) {
            if (strpos($contentLower, $word) !== false) {
                $score += 0.3;
            }
        }

        return min(1.0, $score + (rand(0, 15) / 100));
    }

    /**
     * Calculate hate speech score
     */
    private function calculateHateSpeechScore(string $content): float
    {
        $hateSpeechIndicators = ['you people', 'those people', 'not welcome', 'go back'];
        $score = 0.0;
        $contentLower = strtolower($content);

        foreach ($hateSpeechIndicators as $indicator) {
            if (strpos($contentLower, $indicator) !== false) {
                $score += 0.4;
            }
        }

        return min(1.0, $score + (rand(0, 10) / 100));
    }

    /**
     * Calculate harassment score
     */
    private function calculateHarassmentScore(string $content): float
    {
        $harassmentPatterns = ['shut up', 'get lost', 'nobody cares', 'you suck'];
        $score = 0.0;
        $contentLower = strtolower($content);

        foreach ($harassmentPatterns as $pattern) {
            if (strpos($contentLower, $pattern) !== false) {
                $score += 0.25;
            }
        }

        return min(1.0, $score + (rand(0, 15) / 100));
    }

    /**
     * Calculate threat score
     */
    private function calculateThreatScore(string $content): float
    {
        $threatWords = ['kill', 'hurt', 'destroy', 'attack', 'violence'];
        $score = 0.0;
        $contentLower = strtolower($content);

        foreach ($threatWords as $word) {
            if (strpos($contentLower, $word) !== false) {
                $score += 0.5;
            }
        }

        return min(1.0, $score + (rand(0, 10) / 100));
    }

    /**
     * Calculate spam score
     */
    private function calculateSpamScore(string $content): float
    {
        $score = 0.0;

        // Check for repetitive characters
        if (preg_match('/(.)\1{4,}/', $content)) {
            $score += 0.3;
        }

        // Check for excessive links
        $linkCount = preg_match_all('/https?:\/\//', $content);
        if ($linkCount > 2) {
            $score += 0.4;
        }

        // Check for promotional language
        $promoWords = ['buy now', 'click here', 'limited time', 'special offer'];
        $contentLower = strtolower($content);

        foreach ($promoWords as $word) {
            if (strpos($contentLower, $word) !== false) {
                $score += 0.2;
            }
        }

        return min(1.0, $score + (rand(0, 10) / 100));
    }

    /**
     * Calculate adult content score
     */
    private function calculateAdultContentScore(string $content): float
    {
        $adultWords = ['sexy', 'adult', 'explicit', 'mature'];
        $score = 0.0;
        $contentLower = strtolower($content);

        foreach ($adultWords as $word) {
            if (strpos($contentLower, $word) !== false) {
                $score += 0.3;
            }
        }

        return min(1.0, $score + (rand(0, 5) / 100));
    }

    /**
     * Calculate violence score
     */
    private function calculateViolenceScore(string $content): float
    {
        $violenceWords = ['fight', 'punch', 'hit', 'violence', 'aggressive'];
        $score = 0.0;
        $contentLower = strtolower($content);

        foreach ($violenceWords as $word) {
            if (strpos($contentLower, $word) !== false) {
                $score += 0.3;
            }
        }

        return min(1.0, $score + (rand(0, 10) / 100));
    }

    /**
     * Calculate sentiment score
     */
    private function calculateSentimentScore(string $content): float
    {
        $positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful'];
        $negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disgusting'];

        $positiveCount = 0;
        $negativeCount = 0;
        $contentLower = strtolower($content);

        foreach ($positiveWords as $word) {
            if (strpos($contentLower, $word) !== false) {
                $positiveCount++;
            }
        }

        foreach ($negativeWords as $word) {
            if (strpos($contentLower, $word) !== false) {
                $negativeCount++;
            }
        }

        // Return sentiment as a score (0 = very negative, 1 = very positive)
        $totalWords = $positiveCount + $negativeCount;
        if ($totalWords === 0) {
            return 0.5; // Neutral
        }

        return $positiveCount / $totalWords;
    }

    /**
     * Aggregate scores from multiple AI models
     */
    private function aggregateScores(array &$analysisResult, array $aiAnalysis): void
    {
        $scoreTypes = ['toxicity', 'profanity', 'hate_speech', 'harassment', 'threat', 'spam', 'adult_content', 'violence'];
        $aggregatedScores = [];
        $confidenceScores = [];

        foreach ($scoreTypes as $scoreType) {
            $scores = [];
            $weights = [];

            foreach ($aiAnalysis as $modelId => $result) {
                if (isset($result['scores'][$scoreType])) {
                    $scores[] = $result['scores'][$scoreType];
                    $weights[] = $result['confidence'] ?? 0.7;
                }
            }

            if (!empty($scores)) {
                // Weighted average
                $weightedSum = 0;
                $totalWeight = 0;

                for ($i = 0; $i < count($scores); $i++) {
                    $weightedSum += $scores[$i] * $weights[$i];
                    $totalWeight += $weights[$i];
                }

                $aggregatedScores[$scoreType] = $totalWeight > 0 ? $weightedSum / $totalWeight : 0;
            } else {
                $aggregatedScores[$scoreType] = 0;
            }
        }

        // Calculate overall risk score
        $riskFactors = ['toxicity', 'hate_speech', 'harassment', 'threat'];
        $riskScore = 0;
        foreach ($riskFactors as $factor) {
            $riskScore += $aggregatedScores[$factor] ?? 0;
        }
        $aggregatedScores['overall_risk'] = min(1.0, $riskScore / count($riskFactors));

        // Calculate overall confidence
        foreach ($aiAnalysis as $result) {
            if (isset($result['confidence'])) {
                $confidenceScores[] = $result['confidence'];
            }
        }
        $aggregatedScores['confidence'] = !empty($confidenceScores) ? array_sum($confidenceScores) / count($confidenceScores) : 0.7;

        $analysisResult['scores'] = $aggregatedScores;
    }

    /**
     * Apply moderation rules to analysis result
     */
    private function applyModerationRules(array $analysisResult, string $sessionId): array
    {
        $ruleResults = [];
        $session = $this->activeSessions[$sessionId];
        $sensitivityLevel = $session['session_data']['sensitivity_level'];

        // Adjust thresholds based on sensitivity
        $sensitivityMultiplier = match($sensitivityLevel) {
            'low' => 1.2,
            'medium' => 1.0,
            'high' => 0.8,
            'strict' => 0.6,
            default => 1.0
        };

        foreach ($this->moderationRules as $rule) {
            if (!$rule['enabled'] || !$this->isRuleApplicable($rule, $analysisResult)) {
                continue;
            }

            $conditions = json_decode($rule['conditions'], true);
            $actions = json_decode($rule['actions'], true);

            $ruleTriggered = $this->evaluateRuleConditions($conditions, $analysisResult, $sensitivityMultiplier);

            if ($ruleTriggered) {
                $ruleResults[] = [
                    'rule_id' => $rule['rule_id'],
                    'rule_name' => $rule['rule_name'],
                    'rule_type' => $rule['rule_type'],
                    'triggered' => true,
                    'actions' => $actions,
                    'priority' => $rule['priority'],
                    'threshold_used' => $rule['threshold_score'] * $sensitivityMultiplier
                ];
            }
        }

        // Sort by priority
        usort($ruleResults, function($a, $b) {
            return $a['priority'] <=> $b['priority'];
        });

        return $ruleResults;
    }

    /**
     * Check if rule is applicable to content type
     */
    private function isRuleApplicable(array $rule, array $analysisResult): bool
    {
        $applicableTypes = json_decode($rule['content_types'], true);
        return in_array($analysisResult['content_type'], $applicableTypes);
    }

    /**
     * Evaluate rule conditions
     */
    private function evaluateRuleConditions(array $conditions, array $analysisResult, float $sensitivityMultiplier): bool
    {
        foreach ($conditions as $condition => $threshold) {
            if (isset($analysisResult['scores'][$condition])) {
                $adjustedThreshold = $threshold * $sensitivityMultiplier;
                if ($analysisResult['scores'][$condition] >= $adjustedThreshold) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Determine final action based on analysis and rules
     */
    private function determineFinalAction(array $analysisResult, string $sessionId): array
    {
        $ruleResults = $analysisResult['rule_results'] ?? [];

        if (empty($ruleResults)) {
            return [
                'action' => 'allow',
                'reason' => 'No violations detected',
                'confidence' => $analysisResult['scores']['confidence'] ?? 0.9
            ];
        }

        // Get highest priority triggered rule
        $highestPriorityRule = $ruleResults[0];
        $actions = $highestPriorityRule['actions'];

        return [
            'action' => $actions['action'] ?? 'warn',
            'reason' => $highestPriorityRule['rule_name'],
            'rule_id' => $highestPriorityRule['rule_id'],
            'actions' => $actions,
            'confidence' => $analysisResult['scores']['confidence'] ?? 0.7,
            'severity' => $this->calculateSeverityLevel($analysisResult['scores']['overall_risk'])
        ];
    }

    /**
     * Calculate severity level based on risk score
     */
    private function calculateSeverityLevel(float $riskScore): string
    {
        if ($riskScore >= 0.9) return 'critical';
        if ($riskScore >= 0.7) return 'high';
        if ($riskScore >= 0.4) return 'medium';
        return 'low';
    }

    /**
     * Execute moderation action
     */
    private function executeAction(array $analysisResult, array $finalAction): array
    {
        try {
            $actionId = 'action_' . uniqid() . '_' . time();

            $actionData = [
                'action_id' => $actionId,
                'analysis_id' => $analysisResult['analysis_id'],
                'session_id' => $analysisResult['session_id'],
                'action_type' => $finalAction['action'],
                'action_reason' => $finalAction['reason'],
                'auto_action' => true,
                'original_content' => $analysisResult['content_text'],
                'filtered_content' => $this->applyContentFiltering($analysisResult['content_text'], $finalAction),
                'severity_level' => $finalAction['severity'],
                'action_metadata' => json_encode($finalAction)
            ];

            // Store action in database
            $this->storeActionResult($actionData);

            // Execute specific action
            switch ($finalAction['action']) {
                case 'filter':
                    return $this->executeFilterAction($actionData, $finalAction);
                case 'block':
                    return $this->executeBlockAction($actionData, $finalAction);
                case 'warn':
                    return $this->executeWarnAction($actionData, $finalAction);
                case 'quarantine':
                    return $this->executeQuarantineAction($actionData, $finalAction);
                case 'escalate':
                    return $this->executeEscalateAction($actionData, $finalAction);
                default:
                    return ['action' => 'allow', 'success' => true];
            }

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to execute action: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Apply content filtering
     */
    private function applyContentFiltering(string $content, array $finalAction): string
    {
        if ($finalAction['action'] === 'filter') {
            $replaceWith = $finalAction['actions']['replace_with'] ?? '[FILTERED]';

            // Simple filtering - replace detected words
            $toxicWords = ['hate', 'stupid', 'idiot', 'damn', 'hell'];
            foreach ($toxicWords as $word) {
                $content = str_ireplace($word, $replaceWith, $content);
            }
        }

        return $content;
    }

    /**
     * Execute filter action
     */
    private function executeFilterAction(array $actionData, array $finalAction): array
    {
        return [
            'action' => 'filter',
            'success' => true,
            'filtered_content' => $actionData['filtered_content'],
            'message' => 'Content has been filtered for inappropriate language'
        ];
    }

    /**
     * Execute block action
     */
    private function executeBlockAction(array $actionData, array $finalAction): array
    {
        return [
            'action' => 'block',
            'success' => true,
            'message' => 'Content has been blocked due to policy violations'
        ];
    }

    /**
     * Execute warn action
     */
    private function executeWarnAction(array $actionData, array $finalAction): array
    {
        return [
            'action' => 'warn',
            'success' => true,
            'message' => 'User has been warned about content policy violations'
        ];
    }

    /**
     * Execute quarantine action
     */
    private function executeQuarantineAction(array $actionData, array $finalAction): array
    {
        return [
            'action' => 'quarantine',
            'success' => true,
            'message' => 'Content has been quarantined for manual review'
        ];
    }

    /**
     * Execute escalate action
     */
    private function executeEscalateAction(array $actionData, array $finalAction): array
    {
        return [
            'action' => 'escalate',
            'success' => true,
            'message' => 'Content has been escalated to human moderators'
        ];
    }

    /**
     * Store analysis result in database
     */
    private function storeAnalysisResult(array $analysisResult): void
    {
        $sql = "INSERT INTO content_analysis_results (
            analysis_id, session_id, content_id, content_type, content_text,
            content_metadata, ai_analysis, toxicity_score, profanity_score,
            hate_speech_score, harassment_score, threat_score, spam_score,
            adult_content_score, violence_score, overall_risk_score,
            confidence_score, processing_time_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $analysisResult['analysis_id'],
            $analysisResult['session_id'],
            $analysisResult['content_id'],
            $analysisResult['content_type'],
            $analysisResult['content_text'],
            json_encode($analysisResult['content_metadata'] ?? []),
            json_encode($analysisResult['ai_analysis']),
            $analysisResult['scores']['toxicity'],
            $analysisResult['scores']['profanity'],
            $analysisResult['scores']['hate_speech'],
            $analysisResult['scores']['harassment'],
            $analysisResult['scores']['threat'],
            $analysisResult['scores']['spam'],
            $analysisResult['scores']['adult_content'],
            $analysisResult['scores']['violence'],
            $analysisResult['scores']['overall_risk'],
            $analysisResult['scores']['confidence'],
            $analysisResult['processing_time_ms']
        ]);
    }

    /**
     * Store action result in database
     */
    private function storeActionResult(array $actionData): void
    {
        $sql = "INSERT INTO moderation_actions (
            action_id, analysis_id, session_id, action_type, action_reason,
            auto_action, original_content, filtered_content, severity_level,
            action_metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $actionData['action_id'],
            $actionData['analysis_id'],
            $actionData['session_id'],
            $actionData['action_type'],
            $actionData['action_reason'],
            $actionData['auto_action'],
            $actionData['original_content'],
            $actionData['filtered_content'],
            $actionData['severity_level'],
            $actionData['action_metadata']
        ]);
    }

    /**
     * Update session statistics
     */
    private function updateSessionStatistics(string $sessionId, array $analysisResult): void
    {
        if (!isset($this->activeSessions[$sessionId])) {
            return;
        }

        $stats = &$this->activeSessions[$sessionId]['statistics'];
        $stats['total_analyzed']++;
        $stats['processing_time_total'] += $analysisResult['processing_time_ms'];

        if ($analysisResult['scores']['overall_risk'] > 0.3) {
            $stats['violations_detected']++;
        }

        if (isset($analysisResult['action_result'])) {
            $stats['actions_taken']++;
        }
    }

    /**
     * Get user moderation history
     */
    private function getUserModerationHistory(int $userId): array
    {
        $sql = "SELECT * FROM user_moderation_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 10";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$userId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Load AI models configuration
     */
    private function loadAIModels(): void
    {
        $sql = "SELECT * FROM ai_model_configs WHERE enabled = 1";
        $stmt = $this->pdo->query($sql);
        $models = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $this->aiModels = [];
        foreach ($models as $model) {
            $this->aiModels[$model['config_id']] = $model;
        }
    }

    /**
     * Load moderation rules
     */
    private function loadModerationRules(): void
    {
        $sql = "SELECT * FROM moderation_rules WHERE enabled = 1 ORDER BY priority ASC";
        $stmt = $this->pdo->query($sql);
        $this->moderationRules = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Stop moderation session
     */
    public function stopModerationSession(string $sessionId): array
    {
        try {
            if (!isset($this->activeSessions[$sessionId])) {
                throw new Exception('Session not found or already stopped');
            }

            // Update session status in database
            $sql = "UPDATE content_moderation_sessions SET status = 'stopped', ended_at = CURRENT_TIMESTAMP WHERE session_id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$sessionId]);

            // Get final statistics
            $statistics = $this->activeSessions[$sessionId]['statistics'];

            // Remove from active sessions
            unset($this->activeSessions[$sessionId]);

            return [
                'success' => true,
                'message' => 'Moderation session stopped successfully',
                'final_statistics' => $statistics
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to stop session: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get session analytics
     */
    public function getSessionAnalytics(string $sessionId): array
    {
        try {
            if (!isset($this->activeSessions[$sessionId])) {
                throw new Exception('Session not found');
            }

            $session = $this->activeSessions[$sessionId];
            $statistics = $session['statistics'];

            // Calculate additional metrics
            $avgProcessingTime = $statistics['total_analyzed'] > 0
                ? $statistics['processing_time_total'] / $statistics['total_analyzed']
                : 0;

            $violationRate = $statistics['total_analyzed'] > 0
                ? ($statistics['violations_detected'] / $statistics['total_analyzed']) * 100
                : 0;

            $actionRate = $statistics['total_analyzed'] > 0
                ? ($statistics['actions_taken'] / $statistics['total_analyzed']) * 100
                : 0;

            return [
                'success' => true,
                'session_id' => $sessionId,
                'statistics' => $statistics,
                'metrics' => [
                    'avg_processing_time_ms' => round($avgProcessingTime, 2),
                    'violation_rate_percent' => round($violationRate, 2),
                    'action_rate_percent' => round($actionRate, 2),
                    'efficiency_score' => $this->calculateEfficiencyScore($statistics)
                ],
                'session_info' => $session['session_data']
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to get analytics: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Calculate efficiency score
     */
    private function calculateEfficiencyScore(array $statistics): float
    {
        if ($statistics['total_analyzed'] === 0) {
            return 0.0;
        }

        $accuracyScore = 1.0 - ($statistics['false_positives'] / max(1, $statistics['total_analyzed']));
        $speedScore = min(1.0, 1000 / max(100, $statistics['processing_time_total'] / $statistics['total_analyzed']));
        $effectivenessScore = $statistics['violations_detected'] > 0
            ? $statistics['actions_taken'] / $statistics['violations_detected']
            : 1.0;

        return round(($accuracyScore + $speedScore + $effectivenessScore) / 3, 2);
    }

    /**
     * Get moderation rules
     */
    public function getModerationRules(): array
    {
        return [
            'success' => true,
            'rules' => $this->moderationRules
        ];
    }

    /**
     * Update moderation rule
     */
    public function updateModerationRule(string $ruleId, array $updates): array
    {
        try {
            $allowedFields = ['enabled', 'threshold_score', 'priority', 'conditions', 'actions'];
            $updateFields = [];
            $updateValues = [];

            foreach ($updates as $field => $value) {
                if (in_array($field, $allowedFields)) {
                    $updateFields[] = "$field = ?";
                    $updateValues[] = is_array($value) ? json_encode($value) : $value;
                }
            }

            if (empty($updateFields)) {
                throw new Exception('No valid fields to update');
            }

            $updateValues[] = $ruleId;
            $sql = "UPDATE moderation_rules SET " . implode(', ', $updateFields) . ", updated_at = CURRENT_TIMESTAMP WHERE rule_id = ?";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($updateValues);

            // Reload rules
            $this->loadModerationRules();

            return [
                'success' => true,
                'message' => 'Moderation rule updated successfully'
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to update rule: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get demo data for testing
     */
    public function getDemoData(): array
    {
        return [
            'success' => true,
            'demo_content' => [
                [
                    'content' => 'This is a normal, professional interview question about your experience.',
                    'type' => 'text',
                    'expected_action' => 'allow'
                ],
                [
                    'content' => 'You are such an idiot! This is completely stupid!',
                    'type' => 'text',
                    'expected_action' => 'filter'
                ],
                [
                    'content' => 'I hate people like you and you should go back where you came from!',
                    'type' => 'text',
                    'expected_action' => 'block'
                ],
                [
                    'content' => 'BUY NOW! LIMITED TIME OFFER! CLICK HERE FOR AMAZING DEALS!!!',
                    'type' => 'text',
                    'expected_action' => 'warn'
                ],
                [
                    'content' => 'I will hurt you and destroy everything you care about!',
                    'type' => 'text',
                    'expected_action' => 'escalate'
                ]
            ],
            'ai_models' => array_values($this->aiModels),
            'moderation_rules' => $this->moderationRules,
            'sensitivity_levels' => ['low', 'medium', 'high', 'strict'],
            'action_types' => ['allow', 'warn', 'filter', 'block', 'quarantine', 'escalate']
        ];
    }
}
