<?php

namespace App\Services;

use PDO;
use Exception;
use App\Services\AI\SentimentAnalysisService;

/**
 * Real-time Sentiment Analysis Service
 * Advanced emotion detection, mood tracking, and interview atmosphere assessment
 */
class RealTimeSentimentService
{
    private PDO $pdo;
    private SentimentAnalysisService $sentimentAnalysisService;
    private array $config;
    private array $activeSessions;
    private array $sentimentModels;
    private array $emotionCategories;
    
    public function __construct(PDO $pdo, array $config = [])
    {
        $this->pdo = $pdo;
        $this->sentimentAnalysisService = new SentimentAnalysisService();
        $this->config = array_merge([
            'real_time_enabled' => true,
            'emotion_tracking_enabled' => true,
            'mood_tracking_enabled' => true,
            'alert_system_enabled' => true,
            'confidence_threshold' => 0.7,
            'max_processing_time_ms' => 5000,
            'default_language' => 'en',
            'cache_results' => true,
            'analytics_enabled' => true,
            'feedback_enabled' => true
        ], $config);
        
        $this->activeSessions = [];
        $this->loadSentimentModels();
        $this->initializeEmotionCategories();
    }

    /**
     * Start real-time sentiment analysis session
     */
    public function startSentimentSession(string $interviewId, int $userId, array $options = []): array
    {
        try {
            $sessionId = 'sent_' . uniqid() . '_' . time();
            
            $sessionData = [
                'session_id' => $sessionId,
                'interview_id' => $interviewId,
                'user_id' => $userId,
                'analysis_mode' => $options['mode'] ?? 'real_time',
                'ai_models_enabled' => json_encode($options['ai_models'] ?? ['openai_gpt4_sentiment', 'custom_emotion_detector']),
                'emotion_tracking_enabled' => $options['emotion_tracking'] ?? true,
                'mood_tracking_enabled' => $options['mood_tracking'] ?? true,
                'confidence_tracking_enabled' => $options['confidence_tracking'] ?? true,
                'tone_analysis_enabled' => $options['tone_analysis'] ?? true,
                'real_time_alerts' => $options['real_time_alerts'] ?? true,
                'sensitivity_level' => $options['sensitivity'] ?? 'medium',
                'language' => $options['language'] ?? 'en',
                'custom_emotions' => json_encode($options['custom_emotions'] ?? []),
                'alert_thresholds' => json_encode($options['alert_thresholds'] ?? $this->getDefaultAlertThresholds()),
                'settings' => json_encode($options['settings'] ?? []),
                'status' => 'pending'
            ];
            
            // Insert session into database
            $sql = "INSERT INTO sentiment_sessions (
                session_id, interview_id, user_id, analysis_mode, ai_models_enabled,
                emotion_tracking_enabled, mood_tracking_enabled, confidence_tracking_enabled,
                tone_analysis_enabled, real_time_alerts, sensitivity_level, language,
                custom_emotions, alert_thresholds, settings, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $sessionData['session_id'],
                $sessionData['interview_id'],
                $sessionData['user_id'],
                $sessionData['analysis_mode'],
                $sessionData['ai_models_enabled'],
                $sessionData['emotion_tracking_enabled'],
                $sessionData['mood_tracking_enabled'],
                $sessionData['confidence_tracking_enabled'],
                $sessionData['tone_analysis_enabled'],
                $sessionData['real_time_alerts'],
                $sessionData['sensitivity_level'],
                $sessionData['language'],
                $sessionData['custom_emotions'],
                $sessionData['alert_thresholds'],
                $sessionData['settings'],
                $sessionData['status']
            ]);
            
            // Initialize session state
            $this->activeSessions[$sessionId] = [
                'session_data' => $sessionData,
                'processing_status' => 'initialized',
                'current_sentiment' => 0.0,
                'emotion_history' => [],
                'mood_state' => 'neutral',
                'alert_count' => 0,
                'start_time' => microtime(true),
                'statistics' => [
                    'total_analyses' => 0,
                    'avg_sentiment' => 0.0,
                    'emotion_changes' => 0,
                    'alerts_triggered' => 0,
                    'processing_time_total' => 0
                ]
            ];
            
            return [
                'success' => true,
                'session' => $sessionData,
                'message' => 'Sentiment analysis session started successfully'
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to start sentiment session: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Analyze sentiment in real-time
     */
    public function analyzeSentimentRealTime(string $sessionId, array $contentData): array
    {
        try {
            if (!isset($this->activeSessions[$sessionId])) {
                throw new Exception('Invalid or inactive session');
            }
            
            $startTime = microtime(true);
            $analysisId = 'analysis_' . uniqid() . '_' . time();
            
            $session = $this->activeSessions[$sessionId];
            $sessionData = $session['session_data'];
            
            // Extract content information
            $content = $contentData['content'] ?? '';
            $participantId = $contentData['participant_id'] ?? null;
            $timestampMs = $contentData['timestamp_ms'] ?? (time() * 1000);
            $contentType = $contentData['content_type'] ?? 'speech';
            
            if (empty($content)) {
                throw new Exception('Content is required for sentiment analysis');
            }
            
            // Perform sentiment analysis using existing service
            $sentimentResult = $this->sentimentAnalysisService->analyzeSentiment($content);
            
            // Enhanced analysis with additional models
            $enhancedAnalysis = $this->performEnhancedAnalysis($content, $sessionData, $sentimentResult);
            
            // Detect sentiment changes
            $sentimentChange = $this->calculateSentimentChange($sessionId, $enhancedAnalysis['overall_sentiment']);
            
            // Check for alerts
            $alertTriggered = $this->checkAlertThresholds($sessionId, $enhancedAnalysis);
            
            // Create analysis result
            $analysisResult = [
                'analysis_id' => $analysisId,
                'session_id' => $sessionId,
                'interview_id' => $sessionData['interview_id'],
                'participant_id' => $participantId,
                'content_text' => $content,
                'content_type' => $contentType,
                'timestamp_ms' => $timestampMs,
                'overall_sentiment' => $enhancedAnalysis['overall_sentiment'],
                'confidence_score' => $enhancedAnalysis['confidence_score'],
                'emotional_intensity' => $enhancedAnalysis['emotional_intensity'],
                'mood_classification' => $enhancedAnalysis['mood_classification'],
                'dominant_emotion' => $enhancedAnalysis['dominant_emotion'],
                'emotions_data' => json_encode($enhancedAnalysis['emotions']),
                'tone_analysis' => json_encode($enhancedAnalysis['tone_analysis']),
                'key_phrases' => json_encode($enhancedAnalysis['key_phrases']),
                'sentiment_change' => $sentimentChange,
                'processing_time_ms' => round((microtime(true) - $startTime) * 1000, 2),
                'ai_model_used' => $enhancedAnalysis['ai_model_used'],
                'confidence_factors' => json_encode($enhancedAnalysis['confidence_factors']),
                'alert_triggered' => $alertTriggered['triggered'],
                'alert_type' => $alertTriggered['type']
            ];
            
            // Store analysis result
            $this->storeAnalysisResult($analysisResult);
            
            // Update session state
            $this->updateSessionState($sessionId, $analysisResult);
            
            // Update emotion timeline
            $this->updateEmotionTimeline($sessionId, $analysisResult);
            
            // Update mood tracking
            $this->updateMoodTracking($sessionId, $analysisResult);
            
            // Handle alerts if triggered
            if ($alertTriggered['triggered']) {
                $this->handleAlert($sessionId, $analysisResult, $alertTriggered);
            }
            
            return [
                'success' => true,
                'analysis' => $analysisResult,
                'alert' => $alertTriggered,
                'session_state' => $this->getSessionState($sessionId),
                'processing_time_ms' => $analysisResult['processing_time_ms']
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Sentiment analysis failed: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Perform enhanced sentiment analysis
     */
    private function performEnhancedAnalysis(string $content, array $sessionData, array $baseAnalysis): array
    {
        $enabledModels = json_decode($sessionData['ai_models_enabled'], true);
        
        // Start with base analysis from existing service
        $analysis = [
            'overall_sentiment' => $baseAnalysis['overall_sentiment'] ?? 0.0,
            'confidence_score' => $baseAnalysis['confidence_score'] ?? 0.0,
            'emotions' => $baseAnalysis['emotions'] ?? [],
            'tone_analysis' => $baseAnalysis['tone_analysis'] ?? [],
            'key_phrases' => $baseAnalysis['key_phrases'] ?? [],
            'ai_model_used' => 'openai_gpt4_sentiment',
            'confidence_factors' => []
        ];
        
        // Calculate emotional intensity
        $analysis['emotional_intensity'] = $this->calculateEmotionalIntensity($analysis['emotions']);
        
        // Determine mood classification
        $analysis['mood_classification'] = $this->classifyMood($analysis['overall_sentiment'], $analysis['emotions']);
        
        // Find dominant emotion
        $analysis['dominant_emotion'] = $this->findDominantEmotion($analysis['emotions']);
        
        // Add confidence factors
        $analysis['confidence_factors'] = $this->analyzeConfidenceFactors($content, $analysis);
        
        return $analysis;
    }

    /**
     * Calculate emotional intensity
     */
    private function calculateEmotionalIntensity(array $emotions): float
    {
        if (empty($emotions)) {
            return 0.0;
        }
        
        $totalIntensity = 0.0;
        $emotionCount = 0;
        
        foreach ($emotions as $emotion => $score) {
            if (is_numeric($score)) {
                $totalIntensity += abs($score);
                $emotionCount++;
            }
        }
        
        return $emotionCount > 0 ? $totalIntensity / $emotionCount : 0.0;
    }

    /**
     * Classify overall mood
     */
    private function classifyMood(float $sentiment, array $emotions): string
    {
        if ($sentiment > 0.3) {
            return 'positive';
        } elseif ($sentiment < -0.3) {
            return 'negative';
        } else {
            // Check for mixed emotions
            $positiveEmotions = ['joy', 'enthusiasm', 'excitement', 'satisfaction'];
            $negativeEmotions = ['nervousness', 'frustration', 'anxiety'];
            
            $positiveCount = 0;
            $negativeCount = 0;
            
            foreach ($emotions as $emotion => $score) {
                if (in_array($emotion, $positiveEmotions) && $score > 0.5) {
                    $positiveCount++;
                } elseif (in_array($emotion, $negativeEmotions) && $score > 0.5) {
                    $negativeCount++;
                }
            }
            
            if ($positiveCount > 0 && $negativeCount > 0) {
                return 'mixed';
            }
            
            return 'neutral';
        }
    }

    /**
     * Find dominant emotion
     */
    private function findDominantEmotion(array $emotions): string
    {
        if (empty($emotions)) {
            return 'neutral';
        }
        
        $maxScore = 0.0;
        $dominantEmotion = 'neutral';
        
        foreach ($emotions as $emotion => $score) {
            if (is_numeric($score) && $score > $maxScore) {
                $maxScore = $score;
                $dominantEmotion = $emotion;
            }
        }
        
        return $dominantEmotion;
    }

    /**
     * Analyze confidence factors
     */
    private function analyzeConfidenceFactors(string $content, array $analysis): array
    {
        $factors = [];
        
        // Content length factor
        $wordCount = str_word_count($content);
        if ($wordCount < 10) {
            $factors[] = 'short_content';
        } elseif ($wordCount > 100) {
            $factors[] = 'comprehensive_content';
        }
        
        // Emotional clarity factor
        if ($analysis['emotional_intensity'] > 0.7) {
            $factors[] = 'clear_emotions';
        } elseif ($analysis['emotional_intensity'] < 0.3) {
            $factors[] = 'subtle_emotions';
        }
        
        // Sentiment strength factor
        if (abs($analysis['overall_sentiment']) > 0.7) {
            $factors[] = 'strong_sentiment';
        } elseif (abs($analysis['overall_sentiment']) < 0.2) {
            $factors[] = 'neutral_sentiment';
        }
        
        return $factors;
    }

    /**
     * Calculate sentiment change from previous analysis
     */
    private function calculateSentimentChange(string $sessionId, float $currentSentiment): float
    {
        if (!isset($this->activeSessions[$sessionId])) {
            return 0.0;
        }

        $previousSentiment = $this->activeSessions[$sessionId]['current_sentiment'];
        $change = $currentSentiment - $previousSentiment;

        // Update current sentiment
        $this->activeSessions[$sessionId]['current_sentiment'] = $currentSentiment;

        return $change;
    }

    /**
     * Check alert thresholds
     */
    private function checkAlertThresholds(string $sessionId, array $analysis): array
    {
        $session = $this->activeSessions[$sessionId];
        $thresholds = json_decode($session['session_data']['alert_thresholds'], true);

        $alert = ['triggered' => false, 'type' => null, 'message' => '', 'severity' => 'low'];

        // Check negative sentiment threshold
        if ($analysis['overall_sentiment'] < $thresholds['negative_sentiment_threshold']) {
            $alert = [
                'triggered' => true,
                'type' => 'negative_sentiment',
                'message' => 'Negative sentiment detected',
                'severity' => $analysis['overall_sentiment'] < -0.7 ? 'high' : 'medium'
            ];
        }

        // Check emotional intensity threshold
        if ($analysis['emotional_intensity'] > $thresholds['high_emotion_threshold']) {
            $alert = [
                'triggered' => true,
                'type' => 'emotional_spike',
                'message' => 'High emotional intensity detected',
                'severity' => $analysis['emotional_intensity'] > 0.9 ? 'critical' : 'high'
            ];
        }

        // Check confidence drop
        if ($analysis['confidence_score'] < $thresholds['low_confidence_threshold']) {
            $alert = [
                'triggered' => true,
                'type' => 'low_confidence',
                'message' => 'Low confidence detected',
                'severity' => 'medium'
            ];
        }

        return $alert;
    }

    /**
     * Handle alert
     */
    private function handleAlert(string $sessionId, array $analysisResult, array $alertData): void
    {
        $alertId = 'alert_' . uniqid() . '_' . time();

        $alertRecord = [
            'alert_id' => $alertId,
            'session_id' => $sessionId,
            'analysis_id' => $analysisResult['analysis_id'],
            'alert_type' => $alertData['type'],
            'severity_level' => $alertData['severity'],
            'alert_message' => $alertData['message'],
            'triggered_by' => $alertData['type'],
            'threshold_value' => $this->getThresholdValue($sessionId, $alertData['type']),
            'actual_value' => $this->getActualValue($analysisResult, $alertData['type']),
            'participant_id' => $analysisResult['participant_id'],
            'timestamp_ms' => $analysisResult['timestamp_ms']
        ];

        $this->storeAlert($alertRecord);

        // Update session alert count
        $this->activeSessions[$sessionId]['alert_count']++;
        $this->activeSessions[$sessionId]['statistics']['alerts_triggered']++;
    }

    /**
     * Update session state
     */
    private function updateSessionState(string $sessionId, array $analysisResult): void
    {
        if (!isset($this->activeSessions[$sessionId])) {
            return;
        }

        $session = &$this->activeSessions[$sessionId];

        // Update statistics
        $session['statistics']['total_analyses']++;
        $session['statistics']['processing_time_total'] += $analysisResult['processing_time_ms'];

        // Update average sentiment
        $totalAnalyses = $session['statistics']['total_analyses'];
        $currentAvg = $session['statistics']['avg_sentiment'];
        $newSentiment = $analysisResult['overall_sentiment'];

        $session['statistics']['avg_sentiment'] = (($currentAvg * ($totalAnalyses - 1)) + $newSentiment) / $totalAnalyses;

        // Add to emotion history
        $session['emotion_history'][] = [
            'timestamp' => $analysisResult['timestamp_ms'],
            'emotion' => $analysisResult['dominant_emotion'],
            'sentiment' => $analysisResult['overall_sentiment'],
            'intensity' => $analysisResult['emotional_intensity']
        ];

        // Keep only last 50 entries
        if (count($session['emotion_history']) > 50) {
            array_shift($session['emotion_history']);
        }

        // Update mood state
        $session['mood_state'] = $analysisResult['mood_classification'];
    }

    /**
     * Update emotion timeline
     */
    private function updateEmotionTimeline(string $sessionId, array $analysisResult): void
    {
        // For demo purposes, create timeline segments every 30 seconds
        $segmentDuration = 30000; // 30 seconds in milliseconds
        $timeSegment = intval($analysisResult['timestamp_ms'] / $segmentDuration) + 1;

        $timelineId = 'timeline_' . $sessionId . '_' . $timeSegment;

        // Check if this segment already exists
        $sql = "SELECT timeline_id FROM emotion_timeline WHERE session_id = ? AND time_segment = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$sessionId, $timeSegment]);
        $existing = $stmt->fetch();

        if (!$existing) {
            // Create new timeline segment
            $timelineData = [
                'timeline_id' => $timelineId,
                'session_id' => $sessionId,
                'participant_id' => $analysisResult['participant_id'],
                'time_segment' => $timeSegment,
                'segment_start_ms' => ($timeSegment - 1) * $segmentDuration,
                'segment_end_ms' => $timeSegment * $segmentDuration,
                'segment_duration_ms' => $segmentDuration,
                'primary_emotion' => $analysisResult['dominant_emotion'],
                'emotion_scores' => $analysisResult['emotions_data'],
                'sentiment_trend' => 'stable',
                'emotional_volatility' => 0.0,
                'key_moments' => json_encode([]),
                'segment_summary' => 'Emotional state analysis for segment ' . $timeSegment,
                'confidence_level' => $analysisResult['confidence_score']
            ];

            $this->storeEmotionTimeline($timelineData);
        }
    }

    /**
     * Update mood tracking
     */
    private function updateMoodTracking(string $sessionId, array $analysisResult): void
    {
        $moodId = 'mood_' . uniqid() . '_' . time();

        $moodData = [
            'mood_id' => $moodId,
            'session_id' => $sessionId,
            'interview_id' => $analysisResult['interview_id'],
            'overall_mood' => $analysisResult['mood_classification'],
            'mood_score' => $analysisResult['overall_sentiment'],
            'atmosphere_rating' => $this->assessAtmosphere($analysisResult),
            'energy_level' => $this->calculateEnergyLevel($analysisResult),
            'engagement_level' => $this->calculateEngagementLevel($analysisResult),
            'stress_indicators' => json_encode($this->detectStressIndicators($analysisResult)),
            'comfort_indicators' => json_encode($this->detectComfortIndicators($analysisResult)),
            'interaction_quality' => $this->assessInteractionQuality($analysisResult),
            'communication_flow' => $this->assessCommunicationFlow($analysisResult),
            'mood_factors' => json_encode($this->analyzeMoodFactors($analysisResult)),
            'recommendations' => json_encode($this->generateMoodRecommendations($analysisResult)),
            'timestamp_ms' => $analysisResult['timestamp_ms'],
            'duration_ms' => 5000 // 5 second window
        ];

        $this->storeMoodTracking($moodData);
    }

    /**
     * Get session analytics
     */
    public function getSessionAnalytics(string $sessionId): array
    {
        try {
            if (!isset($this->activeSessions[$sessionId])) {
                // Try to load from database
                $session = $this->loadSessionFromDatabase($sessionId);
                if (!$session) {
                    throw new Exception('Session not found');
                }
            }

            $session = $this->activeSessions[$sessionId] ?? [];
            $statistics = $session['statistics'] ?? [];

            // Get analysis results from database
            $sql = "SELECT COUNT(*) as total_analyses, AVG(overall_sentiment) as avg_sentiment,
                           AVG(confidence_score) as avg_confidence, AVG(emotional_intensity) as avg_intensity,
                           MIN(overall_sentiment) as min_sentiment, MAX(overall_sentiment) as max_sentiment
                    FROM sentiment_analysis_results WHERE session_id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$sessionId]);
            $dbStats = $stmt->fetch(PDO::FETCH_ASSOC);

            // Get emotion distribution
            $sql = "SELECT dominant_emotion, COUNT(*) as count
                    FROM sentiment_analysis_results WHERE session_id = ?
                    GROUP BY dominant_emotion ORDER BY count DESC";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$sessionId]);
            $emotionDistribution = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get alert statistics
            $sql = "SELECT alert_type, COUNT(*) as count, severity_level
                    FROM sentiment_alerts WHERE session_id = ?
                    GROUP BY alert_type, severity_level";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$sessionId]);
            $alertStats = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'session_id' => $sessionId,
                'statistics' => [
                    'total_analyses' => $dbStats['total_analyses'] ?? 0,
                    'avg_sentiment' => round($dbStats['avg_sentiment'] ?? 0, 3),
                    'avg_confidence' => round($dbStats['avg_confidence'] ?? 0, 3),
                    'avg_emotional_intensity' => round($dbStats['avg_intensity'] ?? 0, 3),
                    'sentiment_range' => [
                        'min' => round($dbStats['min_sentiment'] ?? 0, 3),
                        'max' => round($dbStats['max_sentiment'] ?? 0, 3)
                    ],
                    'alerts_triggered' => $session['alert_count'] ?? 0
                ],
                'emotion_distribution' => $emotionDistribution,
                'alert_statistics' => $alertStats,
                'session_state' => $this->getSessionState($sessionId)
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to get analytics: ' . $e->getMessage()
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
            'sentiment_models' => $this->sentimentModels,
            'emotion_categories' => $this->emotionCategories,
            'demo_content' => [
                [
                    'content' => "I'm really excited about this opportunity and I think I would be a great fit for the team.",
                    'expected_sentiment' => 0.8,
                    'expected_emotions' => ['excitement', 'enthusiasm', 'confidence'],
                    'content_type' => 'speech'
                ],
                [
                    'content' => "I'm not sure if I have enough experience with that particular technology, but I'm willing to learn.",
                    'expected_sentiment' => -0.2,
                    'expected_emotions' => ['uncertainty', 'nervousness', 'determination'],
                    'content_type' => 'speech'
                ],
                [
                    'content' => "That's a challenging question. Let me think about how I would approach that problem.",
                    'expected_sentiment' => 0.1,
                    'expected_emotions' => ['thoughtfulness', 'concentration'],
                    'content_type' => 'speech'
                ]
            ],
            'alert_thresholds' => $this->getDefaultAlertThresholds(),
            'sample_settings' => [
                'analysis_mode' => 'real_time',
                'ai_models' => ['openai_gpt4_sentiment', 'custom_emotion_detector'],
                'emotion_tracking' => true,
                'mood_tracking' => true,
                'real_time_alerts' => true,
                'sensitivity' => 'medium',
                'language' => 'en'
            ]
        ];
    }

    // Helper methods for mood and atmosphere analysis

    /**
     * Assess interview atmosphere
     */
    private function assessAtmosphere(array $analysisResult): string
    {
        $sentiment = $analysisResult['overall_sentiment'];
        $emotions = json_decode($analysisResult['emotions_data'], true);

        if ($sentiment > 0.5 && isset($emotions['enthusiasm']) && $emotions['enthusiasm'] > 0.6) {
            return 'energetic';
        } elseif ($sentiment > 0.2 && isset($emotions['joy']) && $emotions['joy'] > 0.5) {
            return 'positive';
        } elseif ($sentiment < -0.3 || (isset($emotions['nervousness']) && $emotions['nervousness'] > 0.7)) {
            return 'tense';
        } elseif (abs($sentiment) < 0.2) {
            return 'neutral';
        } else {
            return 'professional';
        }
    }

    /**
     * Calculate energy level
     */
    private function calculateEnergyLevel(array $analysisResult): float
    {
        $emotions = json_decode($analysisResult['emotions_data'], true);
        $energyEmotions = ['enthusiasm', 'excitement', 'joy'];

        $energyScore = 0.0;
        $count = 0;

        foreach ($energyEmotions as $emotion) {
            if (isset($emotions[$emotion])) {
                $energyScore += $emotions[$emotion];
                $count++;
            }
        }

        return $count > 0 ? $energyScore / $count : 0.5;
    }

    /**
     * Calculate engagement level
     */
    private function calculateEngagementLevel(array $analysisResult): float
    {
        $confidence = $analysisResult['confidence_score'];
        $sentiment = $analysisResult['overall_sentiment'];
        $intensity = $analysisResult['emotional_intensity'];

        // High engagement = high confidence + positive sentiment + moderate intensity
        $engagement = ($confidence * 0.4) + (max(0, $sentiment) * 0.3) + ($intensity * 0.3);

        return min(1.0, max(0.0, $engagement));
    }

    /**
     * Detect stress indicators
     */
    private function detectStressIndicators(array $analysisResult): array
    {
        $emotions = json_decode($analysisResult['emotions_data'], true);
        $indicators = [];

        if (isset($emotions['nervousness']) && $emotions['nervousness'] > 0.6) {
            $indicators[] = 'high_nervousness';
        }

        if (isset($emotions['anxiety']) && $emotions['anxiety'] > 0.6) {
            $indicators[] = 'anxiety_detected';
        }

        if ($analysisResult['overall_sentiment'] < -0.5) {
            $indicators[] = 'negative_sentiment';
        }

        if ($analysisResult['confidence_score'] < 0.4) {
            $indicators[] = 'low_confidence';
        }

        return $indicators;
    }

    /**
     * Detect comfort indicators
     */
    private function detectComfortIndicators(array $analysisResult): array
    {
        $emotions = json_decode($analysisResult['emotions_data'], true);
        $indicators = [];

        if (isset($emotions['satisfaction']) && $emotions['satisfaction'] > 0.6) {
            $indicators[] = 'high_satisfaction';
        }

        if ($analysisResult['overall_sentiment'] > 0.3) {
            $indicators[] = 'positive_sentiment';
        }

        if ($analysisResult['confidence_score'] > 0.7) {
            $indicators[] = 'high_confidence';
        }

        if (isset($emotions['joy']) && $emotions['joy'] > 0.5) {
            $indicators[] = 'positive_emotions';
        }

        return $indicators;
    }

    /**
     * Assess interaction quality
     */
    private function assessInteractionQuality(array $analysisResult): string
    {
        $confidence = $analysisResult['confidence_score'];
        $sentiment = $analysisResult['overall_sentiment'];

        if ($confidence > 0.8 && $sentiment > 0.3) {
            return 'excellent';
        } elseif ($confidence > 0.6 && $sentiment > 0.0) {
            return 'good';
        } elseif ($confidence > 0.4 || $sentiment > -0.3) {
            return 'fair';
        } else {
            return 'poor';
        }
    }

    /**
     * Assess communication flow
     */
    private function assessCommunicationFlow(array $analysisResult): string
    {
        $intensity = $analysisResult['emotional_intensity'];
        $confidence = $analysisResult['confidence_score'];

        if ($confidence > 0.7 && $intensity < 0.8) {
            return 'smooth';
        } elseif ($confidence > 0.5) {
            return 'natural';
        } elseif ($intensity > 0.8) {
            return 'choppy';
        } else {
            return 'forced';
        }
    }

    /**
     * Analyze mood factors
     */
    private function analyzeMoodFactors(array $analysisResult): array
    {
        $factors = [];

        if ($analysisResult['overall_sentiment'] > 0.5) {
            $factors[] = 'positive_content';
        }

        if ($analysisResult['confidence_score'] > 0.7) {
            $factors[] = 'high_confidence';
        }

        if ($analysisResult['emotional_intensity'] > 0.7) {
            $factors[] = 'strong_emotions';
        }

        return $factors;
    }

    /**
     * Generate mood recommendations
     */
    private function generateMoodRecommendations(array $analysisResult): array
    {
        $recommendations = [];

        if ($analysisResult['overall_sentiment'] < -0.3) {
            $recommendations[] = 'Consider addressing concerns or providing reassurance';
        }

        if ($analysisResult['confidence_score'] < 0.5) {
            $recommendations[] = 'Encourage the participant and provide positive feedback';
        }

        if ($analysisResult['emotional_intensity'] > 0.8) {
            $recommendations[] = 'Allow time for emotional regulation';
        }

        return $recommendations;
    }

    // Database operations and utility methods

    /**
     * Get default alert thresholds
     */
    private function getDefaultAlertThresholds(): array
    {
        return [
            'negative_sentiment_threshold' => -0.5,
            'high_emotion_threshold' => 0.8,
            'low_confidence_threshold' => 0.3,
            'mood_change_threshold' => 0.4,
            'stress_threshold' => 0.7
        ];
    }

    /**
     * Load sentiment models
     */
    private function loadSentimentModels(): void
    {
        try {
            $sql = "SELECT * FROM sentiment_models WHERE enabled = 1";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $this->sentimentModels = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $this->sentimentModels = [];
        }
    }

    /**
     * Initialize emotion categories
     */
    private function initializeEmotionCategories(): void
    {
        $this->emotionCategories = [
            'primary' => ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust'],
            'secondary' => ['enthusiasm', 'nervousness', 'frustration', 'excitement', 'anxiety', 'determination', 'satisfaction'],
            'professional' => ['confidence', 'competence', 'engagement', 'professionalism', 'assertiveness'],
            'social' => ['friendliness', 'warmth', 'openness', 'trust', 'respect']
        ];
    }

    /**
     * Get session state
     */
    private function getSessionState(string $sessionId): array
    {
        if (!isset($this->activeSessions[$sessionId])) {
            return [];
        }

        $session = $this->activeSessions[$sessionId];

        return [
            'current_sentiment' => $session['current_sentiment'],
            'mood_state' => $session['mood_state'],
            'alert_count' => $session['alert_count'],
            'statistics' => $session['statistics'],
            'recent_emotions' => array_slice($session['emotion_history'], -10)
        ];
    }

    /**
     * Get threshold value for alert type
     */
    private function getThresholdValue(string $sessionId, string $alertType): float
    {
        $session = $this->activeSessions[$sessionId];
        $thresholds = json_decode($session['session_data']['alert_thresholds'], true);

        switch ($alertType) {
            case 'negative_sentiment':
                return $thresholds['negative_sentiment_threshold'];
            case 'emotional_spike':
                return $thresholds['high_emotion_threshold'];
            case 'low_confidence':
                return $thresholds['low_confidence_threshold'];
            default:
                return 0.5;
        }
    }

    /**
     * Get actual value for alert type
     */
    private function getActualValue(array $analysisResult, string $alertType): float
    {
        switch ($alertType) {
            case 'negative_sentiment':
                return $analysisResult['overall_sentiment'];
            case 'emotional_spike':
                return $analysisResult['emotional_intensity'];
            case 'low_confidence':
                return $analysisResult['confidence_score'];
            default:
                return 0.0;
        }
    }

    /**
     * Store analysis result in database
     */
    private function storeAnalysisResult(array $result): void
    {
        $sql = "INSERT INTO sentiment_analysis_results (
            analysis_id, session_id, interview_id, participant_id, content_text, content_type,
            timestamp_ms, overall_sentiment, confidence_score, emotional_intensity,
            mood_classification, dominant_emotion, emotions_data, tone_analysis, key_phrases,
            sentiment_change, processing_time_ms, ai_model_used, confidence_factors,
            alert_triggered, alert_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $result['analysis_id'], $result['session_id'], $result['interview_id'],
            $result['participant_id'], $result['content_text'], $result['content_type'],
            $result['timestamp_ms'], $result['overall_sentiment'], $result['confidence_score'],
            $result['emotional_intensity'], $result['mood_classification'], $result['dominant_emotion'],
            $result['emotions_data'], $result['tone_analysis'], $result['key_phrases'],
            $result['sentiment_change'], $result['processing_time_ms'], $result['ai_model_used'],
            $result['confidence_factors'], $result['alert_triggered'], $result['alert_type']
        ]);
    }

    /**
     * Store alert in database
     */
    private function storeAlert(array $alert): void
    {
        $sql = "INSERT INTO sentiment_alerts (
            alert_id, session_id, analysis_id, alert_type, severity_level, alert_message,
            triggered_by, threshold_value, actual_value, participant_id, timestamp_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $alert['alert_id'], $alert['session_id'], $alert['analysis_id'],
            $alert['alert_type'], $alert['severity_level'], $alert['alert_message'],
            $alert['triggered_by'], $alert['threshold_value'], $alert['actual_value'],
            $alert['participant_id'], $alert['timestamp_ms']
        ]);
    }

    /**
     * Store emotion timeline
     */
    private function storeEmotionTimeline(array $timeline): void
    {
        $sql = "INSERT INTO emotion_timeline (
            timeline_id, session_id, participant_id, time_segment, segment_start_ms,
            segment_end_ms, segment_duration_ms, primary_emotion, emotion_scores,
            sentiment_trend, emotional_volatility, key_moments, segment_summary, confidence_level
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $timeline['timeline_id'], $timeline['session_id'], $timeline['participant_id'],
            $timeline['time_segment'], $timeline['segment_start_ms'], $timeline['segment_end_ms'],
            $timeline['segment_duration_ms'], $timeline['primary_emotion'], $timeline['emotion_scores'],
            $timeline['sentiment_trend'], $timeline['emotional_volatility'], $timeline['key_moments'],
            $timeline['segment_summary'], $timeline['confidence_level']
        ]);
    }

    /**
     * Store mood tracking
     */
    private function storeMoodTracking(array $mood): void
    {
        $sql = "INSERT INTO mood_tracking (
            mood_id, session_id, interview_id, overall_mood, mood_score, atmosphere_rating,
            energy_level, engagement_level, stress_indicators, comfort_indicators,
            interaction_quality, communication_flow, mood_factors, recommendations,
            timestamp_ms, duration_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $mood['mood_id'], $mood['session_id'], $mood['interview_id'],
            $mood['overall_mood'], $mood['mood_score'], $mood['atmosphere_rating'],
            $mood['energy_level'], $mood['engagement_level'], $mood['stress_indicators'],
            $mood['comfort_indicators'], $mood['interaction_quality'], $mood['communication_flow'],
            $mood['mood_factors'], $mood['recommendations'], $mood['timestamp_ms'], $mood['duration_ms']
        ]);
    }

    /**
     * Load session from database
     */
    private function loadSessionFromDatabase(string $sessionId): ?array
    {
        try {
            $sql = "SELECT * FROM sentiment_sessions WHERE session_id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$sessionId]);
            return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        } catch (Exception $e) {
            return null;
        }
    }
}
