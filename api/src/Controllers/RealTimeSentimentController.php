<?php

namespace App\Controllers;

use App\Services\RealTimeSentimentService;
use PDO;

/**
 * Real-time Sentiment Analysis Controller
 * REST API endpoints for AI-powered emotion detection and mood tracking
 */
class RealTimeSentimentController
{
    private RealTimeSentimentService $sentimentService;
    private PDO $pdo;

    public function __construct()
    {
        // Database connection
        $dbPath = __DIR__ . '/../../interviews_tv.db';
        $this->pdo = new PDO("sqlite:$dbPath");
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Initialize service
        $this->sentimentService = new RealTimeSentimentService($this->pdo);
    }

    /**
     * Start sentiment analysis session
     * POST /api/sentiment-analysis/sessions
     */
    public function startSession()
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                return $this->jsonResponse(['success' => false, 'error' => 'Invalid JSON input'], 400);
            }
            
            $interviewId = $input['interview_id'] ?? '';
            $userId = $input['user_id'] ?? 1;
            $options = $input['options'] ?? [];
            
            if (empty($interviewId)) {
                return $this->jsonResponse(['success' => false, 'error' => 'Interview ID is required'], 400);
            }
            
            $result = $this->sentimentService->startSentimentSession($interviewId, $userId, $options);
            
            $statusCode = $result['success'] ? 200 : 400;
            return $this->jsonResponse($result, $statusCode);
            
        } catch (\Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'error' => 'Failed to start session: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Analyze sentiment in real-time
     * POST /api/sentiment-analysis/sessions/{sessionId}/analyze
     */
    public function analyzeSentiment($sessionId)
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                return $this->jsonResponse(['success' => false, 'error' => 'Invalid JSON input'], 400);
            }
            
            $contentData = $input['content_data'] ?? [];
            
            if (empty($contentData['content'])) {
                return $this->jsonResponse(['success' => false, 'error' => 'Content is required'], 400);
            }
            
            $result = $this->sentimentService->analyzeSentimentRealTime($sessionId, $contentData);
            
            $statusCode = $result['success'] ? 200 : 400;
            return $this->jsonResponse($result, $statusCode);
            
        } catch (\Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'error' => 'Failed to analyze sentiment: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get session analytics
     * GET /api/sentiment-analysis/sessions/{sessionId}/analytics
     */
    public function getSessionAnalytics($sessionId)
    {
        try {
            $result = $this->sentimentService->getSessionAnalytics($sessionId);
            
            $statusCode = $result['success'] ? 200 : 404;
            return $this->jsonResponse($result, $statusCode);
            
        } catch (\Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'error' => 'Failed to get analytics: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get sentiment timeline
     * GET /api/sentiment-analysis/sessions/{sessionId}/timeline
     */
    public function getSentimentTimeline($sessionId)
    {
        try {
            $sql = "SELECT * FROM emotion_timeline WHERE session_id = ? ORDER BY time_segment";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$sessionId]);
            $timeline = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Parse JSON fields
            foreach ($timeline as &$segment) {
                $segment['emotion_scores'] = json_decode($segment['emotion_scores'], true);
                $segment['key_moments'] = json_decode($segment['key_moments'], true);
            }
            
            return $this->jsonResponse([
                'success' => true,
                'session_id' => $sessionId,
                'timeline' => $timeline,
                'total_segments' => count($timeline)
            ]);
            
        } catch (\Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'error' => 'Failed to get timeline: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get mood tracking data
     * GET /api/sentiment-analysis/sessions/{sessionId}/mood
     */
    public function getMoodTracking($sessionId)
    {
        try {
            $sql = "SELECT * FROM mood_tracking WHERE session_id = ? ORDER BY timestamp_ms";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$sessionId]);
            $moodData = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Parse JSON fields
            foreach ($moodData as &$mood) {
                $mood['stress_indicators'] = json_decode($mood['stress_indicators'], true);
                $mood['comfort_indicators'] = json_decode($mood['comfort_indicators'], true);
                $mood['mood_factors'] = json_decode($mood['mood_factors'], true);
                $mood['recommendations'] = json_decode($mood['recommendations'], true);
            }
            
            return $this->jsonResponse([
                'success' => true,
                'session_id' => $sessionId,
                'mood_data' => $moodData,
                'total_entries' => count($moodData)
            ]);
            
        } catch (\Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'error' => 'Failed to get mood data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get sentiment alerts
     * GET /api/sentiment-analysis/sessions/{sessionId}/alerts
     */
    public function getSentimentAlerts($sessionId)
    {
        try {
            $sql = "SELECT * FROM sentiment_alerts WHERE session_id = ? ORDER BY timestamp_ms DESC";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$sessionId]);
            $alerts = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return $this->jsonResponse([
                'success' => true,
                'session_id' => $sessionId,
                'alerts' => $alerts,
                'total_alerts' => count($alerts)
            ]);
            
        } catch (\Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'error' => 'Failed to get alerts: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get sentiment analysis results
     * GET /api/sentiment-analysis/sessions/{sessionId}/results
     */
    public function getSentimentResults($sessionId)
    {
        try {
            $limit = $_GET['limit'] ?? 50;
            $offset = $_GET['offset'] ?? 0;
            
            $sql = "SELECT * FROM sentiment_analysis_results 
                    WHERE session_id = ? 
                    ORDER BY timestamp_ms DESC 
                    LIMIT ? OFFSET ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$sessionId, $limit, $offset]);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Parse JSON fields
            foreach ($results as &$result) {
                $result['emotions_data'] = json_decode($result['emotions_data'], true);
                $result['tone_analysis'] = json_decode($result['tone_analysis'], true);
                $result['key_phrases'] = json_decode($result['key_phrases'], true);
                $result['confidence_factors'] = json_decode($result['confidence_factors'], true);
            }
            
            // Get total count
            $sql = "SELECT COUNT(*) as total FROM sentiment_analysis_results WHERE session_id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$sessionId]);
            $totalCount = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
            
            return $this->jsonResponse([
                'success' => true,
                'session_id' => $sessionId,
                'results' => $results,
                'pagination' => [
                    'limit' => $limit,
                    'offset' => $offset,
                    'total' => $totalCount,
                    'has_more' => ($offset + $limit) < $totalCount
                ]
            ]);
            
        } catch (\Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'error' => 'Failed to get results: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Submit sentiment feedback
     * POST /api/sentiment-analysis/results/{analysisId}/feedback
     */
    public function submitFeedback($analysisId)
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                return $this->jsonResponse(['success' => false, 'error' => 'Invalid JSON input'], 400);
            }
            
            // Get analysis result to get session_id
            $sql = "SELECT session_id FROM sentiment_analysis_results WHERE analysis_id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$analysisId]);
            $analysis = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$analysis) {
                return $this->jsonResponse(['success' => false, 'error' => 'Analysis not found'], 404);
            }
            
            $feedbackId = 'feedback_' . uniqid() . '_' . time();
            
            $sql = "INSERT INTO sentiment_feedback (
                feedback_id, analysis_id, session_id, user_id, feedback_type,
                original_sentiment, corrected_sentiment, original_emotions, corrected_emotions,
                feedback_notes, accuracy_rating, usefulness_rating, suggestions, training_data_consent
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $feedbackId,
                $analysisId,
                $analysis['session_id'],
                $input['user_id'] ?? 1,
                $input['feedback_type'] ?? 'accuracy',
                $input['original_sentiment'] ?? null,
                $input['corrected_sentiment'] ?? null,
                json_encode($input['original_emotions'] ?? []),
                json_encode($input['corrected_emotions'] ?? []),
                $input['feedback_notes'] ?? '',
                $input['accuracy_rating'] ?? 5,
                $input['usefulness_rating'] ?? 5,
                $input['suggestions'] ?? '',
                $input['training_data_consent'] ?? false
            ]);
            
            return $this->jsonResponse([
                'success' => true,
                'feedback_id' => $feedbackId,
                'message' => 'Feedback submitted successfully'
            ]);
            
        } catch (\Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'error' => 'Failed to submit feedback: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get demo data
     * GET /api/sentiment-analysis/demo-data
     */
    public function getDemoData()
    {
        try {
            $result = $this->sentimentService->getDemoData();
            return $this->jsonResponse($result);
            
        } catch (\Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'error' => 'Failed to get demo data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Test sentiment analysis with sample content
     * POST /api/sentiment-analysis/test
     */
    public function testSentimentAnalysis()
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $content = $input['content'] ?? '';
            
            if (empty($content)) {
                return $this->jsonResponse(['success' => false, 'error' => 'Content is required'], 400);
            }
            
            // Create temporary session
            $sessionResult = $this->sentimentService->startSentimentSession(
                'test_interview_' . time(),
                1,
                ['mode' => 'demo', 'ai_models' => ['openai_gpt4_sentiment']]
            );
            
            if (!$sessionResult['success']) {
                return $this->jsonResponse($sessionResult, 400);
            }
            
            $sessionId = $sessionResult['session']['session_id'];
            
            // Analyze sentiment
            $contentData = [
                'content' => $content,
                'content_type' => 'text',
                'timestamp_ms' => time() * 1000,
                'participant_id' => 'test_participant'
            ];
            
            $result = $this->sentimentService->analyzeSentimentRealTime($sessionId, $contentData);
            
            return $this->jsonResponse($result);
            
        } catch (\Exception $e) {
            return $this->jsonResponse([
                'success' => false,
                'error' => 'Failed to test sentiment analysis: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * JSON response helper
     */
    private function jsonResponse(array $data, int $statusCode = 200): string
    {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        return json_encode($data);
    }
}
