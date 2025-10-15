<?php

namespace App\Services;

use PDO;
use Exception;

/**
 * Smart Camera Switching Service
 * AI-powered automatic camera switching based on speaker detection, audio levels, and engagement metrics
 */
class SmartCameraSwitchingService
{
    private $pdo;
    private $activeSessions = [];
    private $switchingRules = [];
    private $audioAnalyzer;
    private $engagementAnalyzer;
    
    public function __construct($pdo)
    {
        $this->pdo = $pdo;
        $this->loadSwitchingRules();
        $this->initializeAnalyzers();
    }

    /**
     * Start smart camera switching session
     */
    public function startSession(string $interviewId, int $userId, array $options = []): array
    {
        try {
            $sessionId = 'session_' . time() . '_' . uniqid();
            
            $settings = [
                'mode' => $options['mode'] ?? 'auto', // manual, auto, hybrid
                'sensitivity' => $options['sensitivity'] ?? 'medium', // low, medium, high
                'switch_delay' => $options['switch_delay'] ?? 1.0, // seconds
                'audio_threshold' => $options['audio_threshold'] ?? 0.1,
                'engagement_threshold' => $options['engagement_threshold'] ?? 0.5,
                'speaker_detection_enabled' => $options['speaker_detection_enabled'] ?? true,
                'audio_level_switching' => $options['audio_level_switching'] ?? true,
                'engagement_switching' => $options['engagement_switching'] ?? true,
                'fallback_enabled' => $options['fallback_enabled'] ?? true,
                'transition_effects' => $options['transition_effects'] ?? true
            ];
            
            $stmt = $this->pdo->prepare("
                INSERT INTO camera_switching_sessions 
                (session_id, interview_id, user_id, mode, settings, created_at) 
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $sessionId,
                $interviewId,
                $userId,
                $settings['mode'],
                json_encode($settings),
                date('Y-m-d H:i:s')
            ]);
            
            // Initialize session in memory
            $this->activeSessions[$sessionId] = [
                'session_id' => $sessionId,
                'interview_id' => $interviewId,
                'user_id' => $userId,
                'settings' => $settings,
                'cameras' => [],
                'current_camera' => null,
                'last_switch' => 0,
                'audio_buffer' => [],
                'engagement_buffer' => [],
                'speaker_history' => [],
                'switch_count' => 0,
                'started_at' => time()
            ];
            
            return [
                'success' => true,
                'session_id' => $sessionId,
                'settings' => $settings,
                'message' => 'Smart camera switching session started'
            ];
            
        } catch (Exception $e) {
            throw new Exception('Failed to start switching session: ' . $e->getMessage());
        }
    }

    /**
     * Configure cameras for session
     */
    public function configureCameras(string $sessionId, array $cameras): array
    {
        try {
            $configuredCameras = [];
            
            foreach ($cameras as $camera) {
                $configId = 'config_' . time() . '_' . uniqid();
                
                $stmt = $this->pdo->prepare("
                    INSERT INTO camera_configurations 
                    (config_id, session_id, camera_id, device_id, camera_name, position, 
                     priority, auto_switch_enabled, audio_threshold, engagement_threshold, 
                     quality_settings, constraints, created_at) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                
                $stmt->execute([
                    $configId,
                    $sessionId,
                    $camera['camera_id'],
                    $camera['device_id'],
                    $camera['name'] ?? 'Camera',
                    $camera['position'] ?? 'general',
                    $camera['priority'] ?? 5,
                    $camera['auto_switch_enabled'] ?? true,
                    $camera['audio_threshold'] ?? 0.1,
                    $camera['engagement_threshold'] ?? 0.5,
                    json_encode($camera['quality_settings'] ?? []),
                    json_encode($camera['constraints'] ?? []),
                    date('Y-m-d H:i:s')
                ]);
                
                $configuredCameras[] = [
                    'config_id' => $configId,
                    'camera_id' => $camera['camera_id'],
                    'device_id' => $camera['device_id'],
                    'position' => $camera['position'] ?? 'general',
                    'priority' => $camera['priority'] ?? 5
                ];
            }
            
            // Update session cameras in memory
            if (isset($this->activeSessions[$sessionId])) {
                $this->activeSessions[$sessionId]['cameras'] = $configuredCameras;
            }
            
            return [
                'success' => true,
                'configured_cameras' => $configuredCameras,
                'total_cameras' => count($configuredCameras)
            ];
            
        } catch (Exception $e) {
            throw new Exception('Failed to configure cameras: ' . $e->getMessage());
        }
    }

    /**
     * Process audio data for smart switching decisions
     */
    public function processAudioData(string $sessionId, array $audioData): array
    {
        try {
            $analysisId = 'analysis_' . time() . '_' . uniqid();
            $timestamp = date('Y-m-d H:i:s');
            
            // Analyze audio for speaker detection and quality
            $analysis = $this->analyzeAudioForSwitching($audioData);
            
            // Store audio analysis
            $stmt = $this->pdo->prepare("
                INSERT INTO audio_analysis_data 
                (analysis_id, session_id, timestamp, speaker_detected, speaker_confidence, 
                 audio_level, background_noise, speech_quality, voice_activity, 
                 dominant_frequency, audio_features, processing_time_ms) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $analysisId,
                $sessionId,
                $timestamp,
                $analysis['speaker_detected'],
                $analysis['speaker_confidence'],
                $analysis['audio_level'],
                $analysis['background_noise'],
                $analysis['speech_quality'],
                $analysis['voice_activity'] ? 1 : 0,
                $analysis['dominant_frequency'],
                json_encode($analysis['audio_features']),
                $analysis['processing_time_ms']
            ]);
            
            // Update session audio buffer
            if (isset($this->activeSessions[$sessionId])) {
                $this->activeSessions[$sessionId]['audio_buffer'][] = $analysis;
                
                // Keep only last 10 seconds of data
                $cutoff = time() - 10;
                $this->activeSessions[$sessionId]['audio_buffer'] = array_filter(
                    $this->activeSessions[$sessionId]['audio_buffer'],
                    function($item) use ($cutoff) {
                        return $item['timestamp'] > $cutoff;
                    }
                );
            }
            
            // Check if switching decision should be made
            $switchingDecision = $this->evaluateSwitchingDecision($sessionId, $analysis);
            
            return [
                'success' => true,
                'analysis_id' => $analysisId,
                'audio_analysis' => $analysis,
                'switching_decision' => $switchingDecision
            ];
            
        } catch (Exception $e) {
            throw new Exception('Failed to process audio data: ' . $e->getMessage());
        }
    }

    /**
     * Process engagement metrics for smart switching
     */
    public function processEngagementData(string $sessionId, array $engagementData): array
    {
        try {
            $metricId = 'metric_' . time() . '_' . uniqid();
            $timestamp = date('Y-m-d H:i:s');
            
            // Analyze engagement for switching decisions
            $analysis = $this->analyzeEngagementForSwitching($engagementData);
            
            // Store engagement metrics
            $stmt = $this->pdo->prepare("
                INSERT INTO engagement_metrics 
                (metric_id, session_id, timestamp, participant_id, engagement_score, 
                 attention_level, interaction_count, speech_activity, gesture_activity, 
                 facial_expression, emotion_detected, confidence_level, calculated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $metricId,
                $sessionId,
                $timestamp,
                $analysis['participant_id'],
                $analysis['engagement_score'],
                $analysis['attention_level'],
                $analysis['interaction_count'],
                $analysis['speech_activity'],
                $analysis['gesture_activity'],
                $analysis['facial_expression'],
                $analysis['emotion_detected'],
                $analysis['confidence_level'],
                $timestamp
            ]);
            
            // Update session engagement buffer
            if (isset($this->activeSessions[$sessionId])) {
                $this->activeSessions[$sessionId]['engagement_buffer'][] = $analysis;
                
                // Keep only last 30 seconds of data
                $cutoff = time() - 30;
                $this->activeSessions[$sessionId]['engagement_buffer'] = array_filter(
                    $this->activeSessions[$sessionId]['engagement_buffer'],
                    function($item) use ($cutoff) {
                        return $item['timestamp'] > $cutoff;
                    }
                );
            }
            
            return [
                'success' => true,
                'metric_id' => $metricId,
                'engagement_analysis' => $analysis
            ];
            
        } catch (Exception $e) {
            throw new Exception('Failed to process engagement data: ' . $e->getMessage());
        }
    }

    /**
     * Execute camera switch based on AI decision
     */
    public function executeSmartSwitch(string $sessionId, array $switchData): array
    {
        try {
            $eventId = 'event_' . time() . '_' . uniqid();
            $startTime = microtime(true);
            
            // Validate switch decision
            $validation = $this->validateSwitchDecision($sessionId, $switchData);
            if (!$validation['valid']) {
                return [
                    'success' => false,
                    'error' => $validation['reason'],
                    'event_id' => $eventId
                ];
            }
            
            // Execute the camera switch
            $switchResult = $this->performCameraSwitch($sessionId, $switchData);
            
            $endTime = microtime(true);
            $duration = ($endTime - $startTime) * 1000; // Convert to milliseconds
            
            // Log the switching event
            $stmt = $this->pdo->prepare("
                INSERT INTO camera_switching_events 
                (event_id, session_id, camera_id, switch_type, trigger_reason, 
                 confidence_score, audio_level, speaker_detected, engagement_score, 
                 switch_duration_ms, success, error_message, metadata, timestamp) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $eventId,
                $sessionId,
                $switchData['target_camera'],
                $switchData['switch_type'] ?? 'auto',
                $switchData['trigger_reason'] ?? 'unknown',
                $switchData['confidence_score'] ?? 0.0,
                $switchData['audio_level'] ?? 0.0,
                $switchData['speaker_detected'] ?? null,
                $switchData['engagement_score'] ?? 0.0,
                $duration,
                $switchResult['success'] ? 1 : 0,
                $switchResult['error'] ?? null,
                json_encode($switchData),
                date('Y-m-d H:i:s')
            ]);
            
            // Update session state
            if (isset($this->activeSessions[$sessionId]) && $switchResult['success']) {
                $this->activeSessions[$sessionId]['current_camera'] = $switchData['target_camera'];
                $this->activeSessions[$sessionId]['last_switch'] = time();
                $this->activeSessions[$sessionId]['switch_count']++;
            }
            
            return [
                'success' => $switchResult['success'],
                'event_id' => $eventId,
                'switch_duration_ms' => $duration,
                'target_camera' => $switchData['target_camera'],
                'trigger_reason' => $switchData['trigger_reason'],
                'confidence_score' => $switchData['confidence_score'],
                'error' => $switchResult['error'] ?? null
            ];
            
        } catch (Exception $e) {
            throw new Exception('Failed to execute smart switch: ' . $e->getMessage());
        }
    }

    /**
     * Load switching rules from database
     */
    private function loadSwitchingRules(): void
    {
        $stmt = $this->pdo->prepare("SELECT * FROM switching_rules WHERE enabled = 1 ORDER BY priority ASC");
        $stmt->execute();
        $rules = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rules as $rule) {
            $rule['conditions'] = json_decode($rule['conditions'], true);
            $rule['actions'] = json_decode($rule['actions'], true);
            $this->switchingRules[] = $rule;
        }
    }

    /**
     * Initialize audio and engagement analyzers
     */
    private function initializeAnalyzers(): void
    {
        $this->audioAnalyzer = new AudioAnalyzer();
        $this->engagementAnalyzer = new EngagementAnalyzer();
    }

    /**
     * Analyze audio data for switching decisions
     */
    private function analyzeAudioForSwitching(array $audioData): array
    {
        $startTime = microtime(true);

        // Simulate audio analysis (in production, this would use real audio processing)
        $analysis = [
            'speaker_detected' => $this->detectSpeaker($audioData),
            'speaker_confidence' => $this->calculateSpeakerConfidence($audioData),
            'audio_level' => $this->calculateAudioLevel($audioData),
            'background_noise' => $this->detectBackgroundNoise($audioData),
            'speech_quality' => $this->assessSpeechQuality($audioData),
            'voice_activity' => $this->detectVoiceActivity($audioData),
            'dominant_frequency' => $this->findDominantFrequency($audioData),
            'audio_features' => $this->extractAudioFeatures($audioData),
            'timestamp' => time()
        ];

        $endTime = microtime(true);
        $analysis['processing_time_ms'] = ($endTime - $startTime) * 1000;

        return $analysis;
    }

    /**
     * Analyze engagement data for switching decisions
     */
    private function analyzeEngagementForSwitching(array $engagementData): array
    {
        return [
            'participant_id' => $engagementData['participant_id'] ?? 'unknown',
            'engagement_score' => $this->calculateEngagementScore($engagementData),
            'attention_level' => $this->calculateAttentionLevel($engagementData),
            'interaction_count' => $engagementData['interaction_count'] ?? 0,
            'speech_activity' => $engagementData['speech_activity'] ?? 0.0,
            'gesture_activity' => $this->detectGestureActivity($engagementData),
            'facial_expression' => $this->analyzeFacialExpression($engagementData),
            'emotion_detected' => $this->detectEmotion($engagementData),
            'confidence_level' => $this->calculateConfidenceLevel($engagementData),
            'timestamp' => time()
        ];
    }

    /**
     * Evaluate switching decision based on current data
     */
    private function evaluateSwitchingDecision(string $sessionId, array $audioAnalysis): array
    {
        if (!isset($this->activeSessions[$sessionId])) {
            return ['should_switch' => false, 'reason' => 'Session not found'];
        }

        $session = $this->activeSessions[$sessionId];
        $settings = $session['settings'];

        // Check cooldown period
        $timeSinceLastSwitch = time() - $session['last_switch'];
        if ($timeSinceLastSwitch < $settings['switch_delay']) {
            return ['should_switch' => false, 'reason' => 'Cooldown period active'];
        }

        // Evaluate each switching rule
        foreach ($this->switchingRules as $rule) {
            $evaluation = $this->evaluateRule($rule, $audioAnalysis, $session);
            if ($evaluation['triggered']) {
                return [
                    'should_switch' => true,
                    'rule_triggered' => $rule['rule_name'],
                    'target_camera' => $evaluation['target_camera'],
                    'confidence_score' => $evaluation['confidence'],
                    'trigger_reason' => $rule['rule_type'],
                    'transition_type' => $evaluation['transition_type']
                ];
            }
        }

        return ['should_switch' => false, 'reason' => 'No rules triggered'];
    }

    /**
     * Evaluate individual switching rule
     */
    private function evaluateRule(array $rule, array $audioAnalysis, array $session): array
    {
        $conditions = $rule['conditions'];
        $triggered = false;
        $confidence = 0.0;
        $targetCamera = null;

        switch ($rule['rule_type']) {
            case 'speaker_based':
                $triggered = $this->evaluateSpeakerRule($conditions, $audioAnalysis, $session);
                $confidence = $audioAnalysis['speaker_confidence'];
                $targetCamera = $this->findSpeakerCamera($audioAnalysis['speaker_detected'], $session);
                break;

            case 'audio_level':
                $triggered = $this->evaluateAudioLevelRule($conditions, $audioAnalysis, $session);
                $confidence = min(1.0, $audioAnalysis['audio_level'] * 2);
                $targetCamera = $this->findHighestAudioCamera($session);
                break;

            case 'engagement':
                $triggered = $this->evaluateEngagementRule($conditions, $session);
                $confidence = $this->getAverageEngagement($session);
                $targetCamera = $this->findMostEngagedCamera($session);
                break;

            case 'time_based':
                $triggered = $this->evaluateTimeBasedRule($conditions, $audioAnalysis, $session);
                $confidence = 0.8; // Time-based rules have high confidence
                $targetCamera = $this->findFallbackCamera($session);
                break;

            case 'hybrid':
                $evaluation = $this->evaluateHybridRule($conditions, $audioAnalysis, $session);
                $triggered = $evaluation['triggered'];
                $confidence = $evaluation['confidence'];
                $targetCamera = $evaluation['target_camera'];
                break;
        }

        return [
            'triggered' => $triggered && $confidence >= $rule['min_confidence'],
            'confidence' => $confidence,
            'target_camera' => $targetCamera,
            'transition_type' => $rule['actions']['transition_type'] ?? 'smooth'
        ];
    }

    /**
     * Validate switching decision
     */
    private function validateSwitchDecision(string $sessionId, array $switchData): array
    {
        if (!isset($this->activeSessions[$sessionId])) {
            return ['valid' => false, 'reason' => 'Session not active'];
        }

        $session = $this->activeSessions[$sessionId];

        // Check if target camera exists and is available
        $targetCamera = $switchData['target_camera'];
        $cameraExists = false;

        foreach ($session['cameras'] as $camera) {
            if ($camera['camera_id'] === $targetCamera) {
                $cameraExists = true;
                break;
            }
        }

        if (!$cameraExists) {
            return ['valid' => false, 'reason' => 'Target camera not found'];
        }

        // Check if already on target camera
        if ($session['current_camera'] === $targetCamera) {
            return ['valid' => false, 'reason' => 'Already on target camera'];
        }

        // Check confidence threshold
        $confidence = $switchData['confidence_score'] ?? 0.0;
        if ($confidence < 0.6) {
            return ['valid' => false, 'reason' => 'Confidence too low'];
        }

        return ['valid' => true];
    }

    /**
     * Perform actual camera switch
     */
    private function performCameraSwitch(string $sessionId, array $switchData): array
    {
        try {
            // In a real implementation, this would interface with the camera switching hardware/software
            // For now, we'll simulate the switch

            $targetCamera = $switchData['target_camera'];
            $transitionType = $switchData['transition_type'] ?? 'smooth';

            // Simulate switch delay based on transition type
            $switchDelay = match($transitionType) {
                'instant' => 0,
                'fade' => 500,
                'smooth' => 800,
                'zoom' => 1200,
                'smart' => 1000,
                default => 800
            };

            // Simulate processing time
            usleep($switchDelay * 100); // Convert to microseconds and reduce for simulation

            return [
                'success' => true,
                'target_camera' => $targetCamera,
                'transition_type' => $transitionType,
                'switch_delay_ms' => $switchDelay
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Detect speaker from audio data
     */
    private function detectSpeaker(array $audioData): ?string
    {
        // Simulate speaker detection based on audio characteristics
        $audioLevel = $audioData['level'] ?? 0.0;
        $frequency = $audioData['frequency'] ?? 0.0;

        if ($audioLevel > 0.3) {
            // Simple heuristic based on frequency range
            if ($frequency > 200 && $frequency < 300) {
                return 'host';
            } elseif ($frequency > 150 && $frequency < 250) {
                return 'guest';
            }
        }

        return null;
    }

    /**
     * Calculate speaker confidence
     */
    private function calculateSpeakerConfidence(array $audioData): float
    {
        $audioLevel = $audioData['level'] ?? 0.0;
        $clarity = $audioData['clarity'] ?? 0.0;
        $backgroundNoise = $audioData['background_noise'] ?? 0.5;

        // Simple confidence calculation
        $confidence = ($audioLevel * 0.4) + ($clarity * 0.4) + ((1 - $backgroundNoise) * 0.2);

        return min(1.0, max(0.0, $confidence));
    }

    /**
     * Calculate audio level
     */
    private function calculateAudioLevel(array $audioData): float
    {
        return $audioData['level'] ?? 0.0;
    }

    /**
     * Detect background noise
     */
    private function detectBackgroundNoise(array $audioData): float
    {
        return $audioData['background_noise'] ?? 0.1;
    }

    /**
     * Assess speech quality
     */
    private function assessSpeechQuality(array $audioData): float
    {
        $clarity = $audioData['clarity'] ?? 0.7;
        $distortion = $audioData['distortion'] ?? 0.1;

        return max(0.0, $clarity - $distortion);
    }

    /**
     * Detect voice activity
     */
    private function detectVoiceActivity(array $audioData): bool
    {
        $audioLevel = $audioData['level'] ?? 0.0;
        $speechPattern = $audioData['speech_pattern'] ?? false;

        return $audioLevel > 0.05 && $speechPattern;
    }

    /**
     * Find dominant frequency
     */
    private function findDominantFrequency(array $audioData): float
    {
        return $audioData['frequency'] ?? 0.0;
    }

    /**
     * Extract audio features
     */
    private function extractAudioFeatures(array $audioData): array
    {
        return [
            'spectral_centroid' => $audioData['spectral_centroid'] ?? 0.0,
            'zero_crossing_rate' => $audioData['zero_crossing_rate'] ?? 0.0,
            'mfcc' => $audioData['mfcc'] ?? [],
            'pitch' => $audioData['pitch'] ?? 0.0,
            'tempo' => $audioData['tempo'] ?? 0.0
        ];
    }

    /**
     * Calculate engagement score
     */
    private function calculateEngagementScore(array $engagementData): float
    {
        $factors = [
            'attention' => $engagementData['attention'] ?? 0.5,
            'interaction' => $engagementData['interaction'] ?? 0.5,
            'speech_activity' => $engagementData['speech_activity'] ?? 0.5,
            'gesture_activity' => $engagementData['gesture_activity'] ?? 0.5
        ];

        // Weighted average
        $score = ($factors['attention'] * 0.3) +
                ($factors['interaction'] * 0.3) +
                ($factors['speech_activity'] * 0.2) +
                ($factors['gesture_activity'] * 0.2);

        return min(1.0, max(0.0, $score));
    }

    /**
     * Calculate attention level
     */
    private function calculateAttentionLevel(array $engagementData): float
    {
        return $engagementData['attention'] ?? 0.5;
    }

    /**
     * Detect gesture activity
     */
    private function detectGestureActivity(array $engagementData): float
    {
        return $engagementData['gesture_activity'] ?? 0.0;
    }

    /**
     * Analyze facial expression
     */
    private function analyzeFacialExpression(array $engagementData): string
    {
        $expressions = ['neutral', 'happy', 'surprised', 'focused', 'confused'];
        return $engagementData['facial_expression'] ?? $expressions[array_rand($expressions)];
    }

    /**
     * Detect emotion
     */
    private function detectEmotion(array $engagementData): string
    {
        $emotions = ['neutral', 'positive', 'excited', 'engaged', 'thoughtful'];
        return $engagementData['emotion'] ?? $emotions[array_rand($emotions)];
    }

    /**
     * Calculate confidence level
     */
    private function calculateConfidenceLevel(array $engagementData): float
    {
        return $engagementData['confidence'] ?? 0.7;
    }

    /**
     * Evaluate speaker-based rule
     */
    private function evaluateSpeakerRule(array $conditions, array $audioAnalysis, array $session): bool
    {
        $minConfidence = $conditions['min_confidence'] ?? 0.8;
        $minAudioLevel = $conditions['min_audio_level'] ?? 0.1;

        return $audioAnalysis['speaker_confidence'] >= $minConfidence &&
               $audioAnalysis['audio_level'] >= $minAudioLevel &&
               $audioAnalysis['speaker_detected'] !== null;
    }

    /**
     * Evaluate audio level rule
     */
    private function evaluateAudioLevelRule(array $conditions, array $audioAnalysis, array $session): bool
    {
        $minAudioLevel = $conditions['min_audio_level'] ?? 0.3;
        $backgroundThreshold = $conditions['background_noise_threshold'] ?? 0.2;

        return $audioAnalysis['audio_level'] >= $minAudioLevel &&
               $audioAnalysis['background_noise'] <= $backgroundThreshold;
    }

    /**
     * Evaluate engagement rule
     */
    private function evaluateEngagementRule(array $conditions, array $session): bool
    {
        $minEngagement = $conditions['min_engagement'] ?? 0.7;
        $avgEngagement = $this->getAverageEngagement($session);

        return $avgEngagement >= $minEngagement;
    }

    /**
     * Evaluate time-based rule
     */
    private function evaluateTimeBasedRule(array $conditions, array $audioAnalysis, array $session): bool
    {
        $silenceDuration = $conditions['silence_duration'] ?? 5.0;
        $minAudioLevel = $conditions['min_audio_level'] ?? 0.05;

        // Check if we've had low audio for the specified duration
        $timeSinceLastSwitch = time() - $session['last_switch'];

        return $timeSinceLastSwitch >= $silenceDuration &&
               $audioAnalysis['audio_level'] <= $minAudioLevel;
    }

    /**
     * Evaluate hybrid rule
     */
    private function evaluateHybridRule(array $conditions, array $audioAnalysis, array $session): array
    {
        $speakerWeight = $conditions['speaker_weight'] ?? 0.4;
        $audioWeight = $conditions['audio_weight'] ?? 0.3;
        $engagementWeight = $conditions['engagement_weight'] ?? 0.3;
        $minCombinedScore = $conditions['min_combined_score'] ?? 0.6;

        // Calculate weighted score
        $speakerScore = $audioAnalysis['speaker_confidence'] * $speakerWeight;
        $audioScore = $audioAnalysis['audio_level'] * $audioWeight;
        $engagementScore = $this->getAverageEngagement($session) * $engagementWeight;

        $combinedScore = $speakerScore + $audioScore + $engagementScore;

        return [
            'triggered' => $combinedScore >= $minCombinedScore,
            'confidence' => $combinedScore,
            'target_camera' => $this->findBestCameraByScore($session, $audioAnalysis)
        ];
    }

    /**
     * Find speaker camera
     */
    private function findSpeakerCamera(string $speaker, array $session): ?string
    {
        foreach ($session['cameras'] as $camera) {
            if ($camera['position'] === $speaker) {
                return $camera['camera_id'];
            }
        }

        // Fallback to first available camera
        return $session['cameras'][0]['camera_id'] ?? null;
    }

    /**
     * Find camera with highest audio
     */
    private function findHighestAudioCamera(array $session): ?string
    {
        // In a real implementation, this would analyze audio from each camera
        // For now, return the first available camera
        return $session['cameras'][0]['camera_id'] ?? null;
    }

    /**
     * Find most engaged camera
     */
    private function findMostEngagedCamera(array $session): ?string
    {
        // In a real implementation, this would analyze engagement metrics per camera
        // For now, return the first available camera
        return $session['cameras'][0]['camera_id'] ?? null;
    }

    /**
     * Find fallback camera (usually wide shot)
     */
    private function findFallbackCamera(array $session): ?string
    {
        foreach ($session['cameras'] as $camera) {
            if ($camera['position'] === 'wide') {
                return $camera['camera_id'];
            }
        }

        // Fallback to first available camera
        return $session['cameras'][0]['camera_id'] ?? null;
    }

    /**
     * Find best camera by combined score
     */
    private function findBestCameraByScore(array $session, array $audioAnalysis): ?string
    {
        // In a real implementation, this would calculate scores for each camera
        // For now, prioritize based on speaker detection
        if ($audioAnalysis['speaker_detected']) {
            return $this->findSpeakerCamera($audioAnalysis['speaker_detected'], $session);
        }

        return $session['cameras'][0]['camera_id'] ?? null;
    }

    /**
     * Get average engagement from session buffer
     */
    private function getAverageEngagement(array $session): float
    {
        if (empty($session['engagement_buffer'])) {
            return 0.5; // Default neutral engagement
        }

        $total = 0;
        $count = count($session['engagement_buffer']);

        foreach ($session['engagement_buffer'] as $engagement) {
            $total += $engagement['engagement_score'];
        }

        return $total / $count;
    }

    /**
     * Get session analytics
     */
    public function getSessionAnalytics(string $sessionId): array
    {
        try {
            // Get session info
            $stmt = $this->pdo->prepare("SELECT * FROM camera_switching_sessions WHERE session_id = ?");
            $stmt->execute([$sessionId]);
            $session = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$session) {
                throw new Exception('Session not found');
            }

            // Get switching events
            $stmt = $this->pdo->prepare("
                SELECT COUNT(*) as total_switches,
                       SUM(CASE WHEN switch_type = 'auto' THEN 1 ELSE 0 END) as auto_switches,
                       SUM(CASE WHEN switch_type = 'manual' THEN 1 ELSE 0 END) as manual_switches,
                       SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_switches,
                       AVG(switch_duration_ms) as avg_switch_time,
                       AVG(confidence_score) as avg_confidence
                FROM camera_switching_events
                WHERE session_id = ?
            ");
            $stmt->execute([$sessionId]);
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);

            // Get recent events
            $stmt = $this->pdo->prepare("
                SELECT * FROM camera_switching_events
                WHERE session_id = ?
                ORDER BY timestamp DESC
                LIMIT 10
            ");
            $stmt->execute([$sessionId]);
            $recentEvents = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'session' => $session,
                'statistics' => $stats,
                'recent_events' => $recentEvents,
                'performance_score' => $this->calculatePerformanceScore($stats)
            ];

        } catch (Exception $e) {
            throw new Exception('Failed to get session analytics: ' . $e->getMessage());
        }
    }

    /**
     * Calculate performance score
     */
    private function calculatePerformanceScore(array $stats): float
    {
        $successRate = $stats['total_switches'] > 0 ?
            $stats['successful_switches'] / $stats['total_switches'] : 1.0;

        $avgConfidence = $stats['avg_confidence'] ?? 0.7;
        $avgSwitchTime = $stats['avg_switch_time'] ?? 1000;

        // Normalize switch time (lower is better, max 2000ms)
        $timeScore = max(0, 1 - ($avgSwitchTime / 2000));

        // Weighted performance score
        $score = ($successRate * 0.4) + ($avgConfidence * 0.4) + ($timeScore * 0.2);

        return min(1.0, max(0.0, $score));
    }

    /**
     * Stop switching session
     */
    public function stopSession(string $sessionId): array
    {
        try {
            $stmt = $this->pdo->prepare("
                UPDATE camera_switching_sessions
                SET status = 'stopped', ended_at = ?, updated_at = ?
                WHERE session_id = ?
            ");

            $stmt->execute([
                date('Y-m-d H:i:s'),
                date('Y-m-d H:i:s'),
                $sessionId
            ]);

            // Remove from active sessions
            unset($this->activeSessions[$sessionId]);

            return [
                'success' => true,
                'session_id' => $sessionId,
                'message' => 'Smart camera switching session stopped'
            ];

        } catch (Exception $e) {
            throw new Exception('Failed to stop session: ' . $e->getMessage());
        }
    }
}

/**
 * Audio Analyzer Helper Class
 */
class AudioAnalyzer
{
    public function analyzeAudio(array $audioData): array
    {
        // Placeholder for real audio analysis
        return [
            'level' => $audioData['level'] ?? 0.0,
            'frequency' => $audioData['frequency'] ?? 0.0,
            'clarity' => $audioData['clarity'] ?? 0.7
        ];
    }
}

/**
 * Engagement Analyzer Helper Class
 */
class EngagementAnalyzer
{
    public function analyzeEngagement(array $data): array
    {
        // Placeholder for real engagement analysis
        return [
            'score' => $data['engagement'] ?? 0.5,
            'attention' => $data['attention'] ?? 0.5
        ];
    }
}
